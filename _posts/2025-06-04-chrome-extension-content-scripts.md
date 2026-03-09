---
layout: post
title: "Content Scripts in Chrome Extensions"
description: "Learn how content scripts interact with web pages, modify page content, and communicate with other extension components"
date: 2025-06-04
categories: [tutorial]
tags: [content-scripts, injection, dom, manifest, javascript, web-page, dom-manipulation]
---

Content scripts are a powerful feature of Chrome extensions that run in the context of web pages. They allow your extension to read and modify page content, enabling a wide range of functionality from ad blocking to page enhancement. In this comprehensive guide, we'll explore content scripts in depth, covering injection methods, communication patterns, and best practices.

## How Content Scripts Work

Content scripts are JavaScript files that Chrome injects into web pages that match patterns you specify. Unlike regular JavaScript on a webpage, content scripts can access and manipulate the DOM directly, giving you powerful control over page behavior.

### Key Characteristics

Content scripts have several unique properties:
- They run in the context of the web page (can access DOM)
- They run in an isolated JavaScript world
- They can communicate with other extension components
- They can be injected automatically or programmatically

### Declaration in Manifest V3

```json
{
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*", "<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

The "matches" array defines which pages will have your script injected. You can use specific URLs, wildcards, or the special "<all_urls>" pattern.

### Match Patterns

Understanding match patterns is crucial:

| Pattern | Matches |
|---------|---------|
| `https://example.com/*` | All HTTPS pages on example.com |
| `https://*.google.com/*` | All Google subdomains |
| `https://example.com/page.html` | Specific page only |
| `<all_urls>` | Every webpage |
| `file:///C:/path/*` | Local files |

## Types of Content Script Injection

### Declarative Injection

As shown above, you declare content scripts in the manifest. Chrome automatically injects them based on URL patterns. This is the simplest approach for static content modification.

```json
{
  "content_scripts": [
    {
      "matches": ["https://*.github.com/*"],
      "js": ["github-enhancer.js"],
      "css": ["github-styles.css"],
      "run_at": "document_end"
    }
  ]
}
```

### Programmatic Injection

You can also inject content scripts programmatically from background scripts or when users interact with your extension:

```javascript
// Inject from background script (service worker)
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
}, (results) => {
  console.log('Script injected successfully');
});

// Or inject a function directly
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => {
    console.log('Running in page context');
    return document.title;
  }
}, (results) => {
  console.log('Page title:', results[0]);
});
```

Programmatic injection requires the "scripting" permission:

```json
{
  "permissions": ["scripting", "activeTab"]
}
```

## Accessing Page Content

Content scripts have access to the page's DOM but run in an isolated world. This means:

- They can read and modify the DOM freely
- They cannot access variables defined by the page's JavaScript
- The page's JavaScript cannot access variables in your content script
- CSS styles are automatically isolated

### Reading Page Content

```javascript
// Reading page content
const heading = document.querySelector('h1');
console.log('Page title:', heading.textContent);

// Finding multiple elements
const links = document.querySelectorAll('a');
links.forEach(link => {
  console.log('Link:', link.href);
});

// Using modern DOM APIs
const container = document.querySelector('.main-content');
const children = container.querySelectorAll(':scope > *');
```

### Modifying the Page

```javascript
// Adding new elements
const newElement = document.createElement('div');
newElement.textContent = 'Added by my extension!';
newElement.className = 'my-extension-element';
document.body.appendChild(newElement);

// Modifying existing elements
document.querySelectorAll('h1').forEach(h1 => {
  h1.style.color = 'blue';
  h1.dataset.modifiedBy = 'my-extension';
});

// Removing elements
document.querySelectorAll('.advertisement').forEach(ad => ad.remove());

// Adding styles
const style = document.createElement('style');
style.textContent = `
  .my-extension-element {
    background: #f0f0f0;
    padding: 10px;
    border-radius: 5px;
  }
`;
document.head.appendChild(style);
```

## Communication with Extension

Content scripts can communicate with other parts of your extension using message passing:

### Sending Messages from Content Script

```javascript
// Send message to background script
chrome.runtime.sendMessage({
  type: 'PAGE_DATA',
  data: { 
    url: window.location.href,
    title: document.title,
    timestamp: Date.now()
  }
});

// Send to a specific tab's content script
chrome.tabs.sendMessage(tabId, {
  action: 'updateUI',
  data: { theme: 'dark' }
}, (response) => {
  console.log('Response:', response);
});
```

### Receiving Messages in Content Script

```javascript
// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateContent') {
    document.body.style.backgroundColor = message.color;
    sendResponse({ success: true });
  }
  
  if (message.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      scrollY: window.scrollY
    });
  }
  
  // Return true to indicate async response
  return true;
});
```

### Long-Lived Connections

For continuous communication, use message channels:

```javascript
// In content script
const port = chrome.runtime.connect({ name: 'content-script' });

port.postMessage({ type: 'INIT', tabId: chrome.runtime.id });

port.onMessage.addListener((message) => {
  console.log('Received:', message);
});

port.onDisconnect.addListener(() => {
  console.log('Disconnected from background');
});
```

## Timing of Injection

Control when your content script runs using the "run_at" option:

- **"document_start"** - Before any DOM is created, good for early CSS injection
- **"document_end"** - After DOM is complete but before resources loaded
- **"document_idle"** - After DOM and resources (default, most common)

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["early-styles.css"],
    "run_at": "document_start"
  },
  {
    "matches": ["<all_urls>"],
    "js": ["content-late.js"],
    "run_at": "document_idle"
  }]
}
```

### When to Use Each

| Timing | Use Case |
|--------|----------|
| document_start | Inject critical CSS, prevent flash of unstyled content |
| document_end | Read DOM, add event listeners |
| document_idle | Most common, safe for most operations |

## Isolated Worlds

Each content script runs in its own isolated JavaScript world. This provides important security benefits:

- Page JavaScript cannot access your content script's variables
- Your content script cannot access page JavaScript's variables
- CSS is automatically isolated

This isolation protects your code from conflicts with page scripts, but also means you can't directly share data through JavaScript variables.

### Communicating Through DOM

You can still interact with page scripts through shared DOM elements:

```javascript
// Create a custom event that page scripts can listen to
const event = new CustomEvent('myExtensionReady', { 
  detail: { 
    data: 'hello from extension',
    timestamp: Date.now()
  } 
});
document.dispatchEvent(event);

// Or use data attributes
const element = document.createElement('div');
element.dataset.extensionData = JSON.stringify({ key: 'value' });
document.body.appendChild(element);

// Page script can then read this
// const data = JSON.parse(document.querySelector('[data-extension-data]').dataset.extensionData);
```

## Common Use Cases

Content scripts are perfect for:

1. **Page modification** - Adding UI elements, hiding content, changing styles
2. **Data extraction** - Scraping information from pages
3. **Form enhancement** - Auto-filling forms, adding validation
4. **Ad blocking** - Removing or hiding advertisement elements
5. **Page analytics** - Tracking user interactions
6. **Accessibility improvements** - Adding keyboard navigation, high contrast modes
7. **Reading aids** - Text-to-speech, text highlighting, font resizing

### Real-World Example: Page Enhancer

```javascript
// content.js - A page enhancer example
(function() {
  'use strict';
  
  // Only run once
  if (window.pageEnhancerRan) return;
  window.pageEnhancerRan = true;
  
  // Add highlight button to page
  const button = document.createElement('button');
  button.textContent = '🔍 Find Text';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 10px 20px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  button.addEventListener('click', () => {
    const selection = window.getSelection().toString();
    if (selection) {
      alert(`You selected: "${selection}"`);
    }
  });
  
  document.body.appendChild(button);
})();
```

## Best Practices

### Match Specific URLs

Avoid using "<all_urls>" unless necessary. Specific URL patterns:
- Reduce performance impact on unrelated pages
- Increase user trust
- Prevent conflicts with other extensions
- Make permission warnings less scary

```json
// Instead of <all_urls>
"matches": [
  "https://*.github.com/*",
  "https://*.gitlab.com/*",
  "https://bitbucket.org/*"
]
```

### Clean Up After Yourself

If you add elements or modify styles, clean them up when appropriate:

```javascript
// Remove added elements on page unload
window.addEventListener('unload', () => {
  document.querySelectorAll('.my-extension-element').forEach(el => el.remove());
});

// Restore modified styles
const originalStyles = new Map();
function modifyStyle(selector, property, value) {
  const element = document.querySelector(selector);
  if (element) {
    originalStyles.set(selector, element.style[property]);
    element.style[property] = value;
  }
}

// Cleanup function to call on unload
function cleanup() {
  originalStyles.forEach((value, selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.style = value || '';
    }
  });
}
```

### Handle Dynamic Content

Use MutationObserver for pages with dynamic content:

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check if this new node matches our target
        if (node.matches && node.matches('.dynamic-content')) {
          processNewElement(node);
        }
        
        // Also check children
        node.querySelectorAll('.dynamic-content').forEach(processNewElement);
      }
    });
  });
});

function processNewElement(element) {
  // Process the new element
  element.classList.add('processed');
  // Add your logic here
}

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});
```

### Avoid Performance Issues

Content scripts can impact page performance. Follow these guidelines:

```javascript
// BAD: Heavy operations on every mutation
observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});

function onMutation(mutations) {
  mutations.forEach(() => {
    // Heavy operation - BAD!
    document.querySelectorAll('*').forEach(el => processElement(el));
  });
}

// GOOD: Debounced operations
let debounceTimer;
function onMutation(mutations) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    // Only process after mutations stop - GOOD!
    processVisibleElements();
  }, 300);
}
```

### Use Shadow DOM

Isolate your extension's UI from page styles:

```javascript
const shadowHost = document.createElement('div');
document.body.appendChild(shadowHost);

const shadow = shadowHost.attachShadow({ mode: 'closed' });

const style = document.createElement('style');
style.textContent = `
  .my-button {
    background: blue;
    color: white;
    padding: 10px;
  }
`;

const button = document.createElement('button');
button.className = 'my-button';
button.textContent = 'Click me';

shadow.appendChild(style);
shadow.appendChild(button);
```

## Conclusion

Content scripts are fundamental to building powerful Chrome extensions that enhance web pages. Understanding their isolated nature, communication methods, and best practices will help you create extensions that work reliably across different websites while maintaining security and performance.

Remember these key takeaways:
- Use specific URL matching to minimize impact
- Clean up after yourself
- Handle dynamic content with MutationObserver
- Communicate via message passing
- Consider Shadow DOM for style isolation

Master these concepts, and you'll be building sophisticated page-modifying extensions in no time!
