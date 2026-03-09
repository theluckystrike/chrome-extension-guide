---
layout: post
title: "Content Scripts in Chrome Extensions"
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
description: "Learn how content scripts interact with web pages, modify DOM, and enhance browser functionality"
=======
description: "Master content script injection in Chrome extensions. Learn declarative and programmatic injection, DOM manipulation, isolated worlds, and message passing."
>>>>>>> quality/fix-frontmatter-a9-r2
=======
description: "Learn how content scripts interact with web pages, modify page content, and communicate with other extension components"
>>>>>>> quality/expand-thin-a5-r4
=======
description: "Master Chrome extension content scripts. Learn to inject JavaScript into web pages, manipulate the DOM, communicate with background scripts, and build page modification features."
>>>>>>> quality/fix-frontmatter-a8-r5
date: 2025-06-04
categories: [tutorial]
tags: [content-scripts, injection, dom, manifest, javascript, web-page, dom-manipulation]
---

<<<<<<< HEAD
Content scripts are a powerful feature of Chrome extensions that run in the context of web pages. They allow your extension to read and modify page content, enabling a wide range of functionality from ad blocking to page enhancement. This guide covers everything you need to master content scripts.

## How Content Scripts Work

Content scripts are JavaScript files that Chrome injects into web pages that match patterns you specify. Unlike regular JavaScript on a webpage, content scripts can access and manipulate the DOM directly. They run in an isolated world, which provides security benefits but also means they cannot directly access page variables.

### Key Concepts

- **Injected JavaScript**: Content scripts run in the context of the page
- **DOM Access**: Full access to read and modify page content
- **Isolated World**: Separate JavaScript execution environment from the page
- **Match Patterns**: URL patterns that determine when to inject
=======
Content scripts are a powerful feature of Chrome extensions that run in the context of web pages. They allow your extension to read and modify page content, enabling a wide range of functionality from ad blocking to page enhancement. In this comprehensive guide, we'll explore content scripts in depth, covering injection methods, communication patterns, and best practices.

## How Content Scripts Work

Content scripts are JavaScript files that Chrome injects into web pages that match patterns you specify. Unlike regular JavaScript on a webpage, content scripts can access and manipulate the DOM directly, giving you powerful control over page behavior.

### Key Characteristics

Content scripts have several unique properties:
- They run in the context of the web page (can access DOM)
- They run in an isolated JavaScript world
- They can communicate with other extension components
- They can be injected automatically or programmatically
>>>>>>> quality/expand-thin-a5-r4

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

<<<<<<< HEAD
As shown above, you declare content scripts in the manifest. Chrome automatically injects them based on URL patterns. This is the most common approach and works well for extensions that need to run on specific sites.
=======
As shown above, you declare content scripts in the manifest. Chrome automatically injects them based on URL patterns. This is the simplest approach for static content modification.
>>>>>>> quality/expand-thin-a5-r4

```json
{
  "content_scripts": [
    {
<<<<<<< HEAD
      "matches": ["https://*.google.com/*"],
      "js": ["google-content.js"],
      "css": ["google-styles.css"],
      "run_at": "document_end"
    },
    {
      "matches": ["https://*.github.com/*"],
      "js": ["github-content.js"],
      "run_at": "document_idle"
=======
      "matches": ["https://*.github.com/*"],
      "js": ["github-enhancer.js"],
      "css": ["github-styles.css"],
      "run_at": "document_end"
>>>>>>> quality/expand-thin-a5-r4
    }
  ]
}
```

### Programmatic Injection

<<<<<<< HEAD
You can also inject content scripts programmatically from background scripts or other extension contexts:

```javascript
// Inject a content script when needed
=======
You can also inject content scripts programmatically from background scripts or when users interact with your extension:

```javascript
// Inject from background script (service worker)
>>>>>>> quality/expand-thin-a5-r4
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
<<<<<<< HEAD
  console.log('Page title:', results[0].result);
});
```

Programmatic injection requires the "scripting" permission and is triggered by user action or extension events.

## Accessing Page Content

Content scripts have access to the page's DOM but run in an isolated world. This creates a unique environment with specific characteristics:
=======
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
>>>>>>> quality/expand-thin-a5-r4

```javascript
// Reading page content
const heading = document.querySelector('h1');
console.log('Page title:', heading.textContent);

// Finding multiple elements
const links = document.querySelectorAll('a');
<<<<<<< HEAD
links.forEach(link => console.log(link.href));

// Modifying the page
=======
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
>>>>>>> quality/expand-thin-a5-r4
const newElement = document.createElement('div');
newElement.textContent = 'Added by my extension!';
newElement.className = 'my-extension-element';
document.body.appendChild(newElement);

<<<<<<< HEAD
// Changing styles
const header = document.querySelector('header');
if (header) {
  header.style.backgroundColor = '#f0f0f0';
  header.style.padding = '10px';
}

// Removing elements
document.querySelectorAll('.advertisement').forEach(el => el.remove());
```

### Isolation Characteristics

Content scripts in their isolated world can:
- Read and modify the DOM freely
- Add their own JavaScript functions
- Use Chrome extension APIs (storage, runtime, etc.)
- Not access variables defined by page scripts
- Not be accessed by page scripts directly

```javascript
// This variable is private to the content script
const myPrivateData = 'secret';

// Page scripts cannot access this
// window.myPrivateData === undefined
=======
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
>>>>>>> quality/expand-thin-a5-r4
```

## Communication with Extension

Content scripts can communicate with other parts of your extension using message passing:

<<<<<<< HEAD
### Sending Messages
=======
### Sending Messages from Content Script
>>>>>>> quality/expand-thin-a5-r4

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

<<<<<<< HEAD
// Listen for response
chrome.runtime.sendMessage(
  { type: 'GET_SETTINGS' },
  (response) => {
    console.log('Settings:', response);
  }
);
```

### Receiving Messages

```javascript
// Listen for messages from background or popup
=======
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
>>>>>>> quality/expand-thin-a5-r4
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateContent') {
    document.body.style.backgroundColor = message.color;
    sendResponse({ success: true });
  }
  
  if (message.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
<<<<<<< HEAD
      ready: document.readyState
    });
  }
  
  return true; // Keep channel open for async response
=======
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
>>>>>>> quality/expand-thin-a5-r4
});
```

## Timing of Injection

Control when your content script runs using the "run_at" option:

<<<<<<< HEAD
- **"document_start"** - Before any DOM is created, CSSOM is available
- **"document_end"** - After DOM is complete but before resources load
- **"document_idle"** - After DOM and resources (default)
=======
- **"document_start"** - Before any DOM is created, good for early CSS injection
- **"document_end"** - After DOM is complete but before resources loaded
- **"document_idle"** - After DOM and resources (default, most common)
>>>>>>> quality/expand-thin-a5-r4

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

<<<<<<< HEAD
### When to Use Each Timing

- **document_start**: For injecting CSS, modifying meta tags, or pre-loading scripts
- **document_end**: For most DOM manipulations, when you need the DOM but not images
- **document_idle**: Default, safest choice for most use cases

## Isolated Worlds

Each content script runs in its own isolated JavaScript world. This provides significant security benefits:
=======
### When to Use Each

| Timing | Use Case |
|--------|----------|
| document_start | Inject critical CSS, prevent flash of unstyled content |
| document_end | Read DOM, add event listeners |
| document_idle | Most common, safe for most operations |

## Isolated Worlds

Each content script runs in its own isolated JavaScript world. This provides important security benefits:
>>>>>>> quality/expand-thin-a5-r4

- Page JavaScript cannot access your content script's variables
- Your content script cannot access page JavaScript's variables
- CSS is automatically isolated

This isolation protects your code from conflicts with page scripts, but also means you can't directly share data through JavaScript variables.

### Communicating Through DOM

You can still interact with page scripts through shared DOM elements:

```javascript
// Create a custom event that page scripts can listen to
const event = new CustomEvent('myExtensionReady', { 
<<<<<<< HEAD
  detail: { data: 'hello' } 
});
document.dispatchEvent(event);

// Or listen for page events
window.addEventListener('pageReady', (e) => {
  console.log('Page ready:', e.detail);
});
```

### Communicating Through DOM

```javascript
// Set a property on the window that page scripts can access
window.myExtensionAPI = {
  getData: () => ({ url: location.href }),
  onAction: (callback) => {
    document.addEventListener('extensionAction', callback);
  }
};

// The page can then use:
const data = window.myExtensionAPI.getData();
=======
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
>>>>>>> quality/expand-thin-a5-r4
```

## Common Use Cases

Content scripts are perfect for:

1. **Page modification** - Adding UI elements, hiding content, changing styles
2. **Data extraction** - Scraping information from pages
3. **Form enhancement** - Auto-filling forms, adding validation
4. **Ad blocking** - Removing or hiding advertisement elements
5. **Page analytics** - Tracking user interactions
<<<<<<< HEAD
6. **Accessibility improvements** - Adding keyboard navigation, ARIA labels
7. **Reading tools** - Changing fonts, colors, layout for readability

### Practical Example: Page Highlighter

```javascript
// content.js - Highlight specific elements on a page
function highlightElements(selector, color = 'yellow') {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.style.backgroundColor = color;
    el.dataset.extensionHighlighted = 'true';
  });
  return elements.length;
}

// Listen for highlight requests from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlight') {
    const count = highlightElements(message.selector, message.color);
    sendResponse({ highlighted: count });
  }
});
=======
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
>>>>>>> quality/expand-thin-a5-r4
```

## Best Practices

### Match Specific URLs

<<<<<<< HEAD
Avoid using "<all_urls>" unless necessary. Specific URL patterns reduce performance impact and increase user trust:

```json
{
  "content_scripts": [{
    "matches": [
      "https://*.github.com/*",
      "https://github.com/*"
    ],
    "js": ["github-content.js"]
  }]
}
=======
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
>>>>>>> quality/expand-thin-a5-r4
```

### Clean Up After Yourself

<<<<<<< HEAD
If you add elements or modify styles, consider cleaning them up when appropriate:
=======
If you add elements or modify styles, clean them up when appropriate:
>>>>>>> quality/expand-thin-a5-r4

```javascript
// Remove added elements on page unload
window.addEventListener('unload', () => {
  document.querySelectorAll('.my-extension-element').forEach(el => el.remove());
});

// Restore modified styles
const originalStyles = new Map();
<<<<<<< HEAD
function cleanupStyles() {
  originalStyles.forEach((original, element) => {
    element.style.cssText = original;
  });
  originalStyles.clear();
=======
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
>>>>>>> quality/expand-thin-a5-r4
}
```

### Handle Dynamic Content

Use MutationObserver for pages with dynamic content:

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
<<<<<<< HEAD
        // Process new elements
        if (node.matches('.dynamic-content')) {
          processDynamicElement(node);
        }
        
        // Check children too
        node.querySelectorAll('.dynamic-content').forEach(processDynamicElement);
=======
        // Check if this new node matches our target
        if (node.matches && node.matches('.dynamic-content')) {
          processNewElement(node);
        }
        
        // Also check children
        node.querySelectorAll('.dynamic-content').forEach(processNewElement);
>>>>>>> quality/expand-thin-a5-r4
      }
    });
  });
});

<<<<<<< HEAD
function processDynamicElement(element) {
  if (element.dataset.processed) return;
  element.dataset.processed = 'true';
  
  // Your processing logic here
  element.classList.add('extension-processed');
=======
function processNewElement(element) {
  // Process the new element
  element.classList.add('processed');
  // Add your logic here
>>>>>>> quality/expand-thin-a5-r4
}

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});
```

<<<<<<< HEAD
### Avoid Conflicts with Page Scripts

```javascript
// Use unique class names to avoid conflicts
const EXTENSION_PREFIX = 'myext-';

// Wrap your code in an IIFE
(function() {
  // Your code here
})();

// Use explicit scoping
{
  const privateVariable = 'safe';
}
=======
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
>>>>>>> quality/expand-thin-a5-r4
```

## Conclusion

Content scripts are fundamental to building powerful Chrome extensions that enhance web pages. Understanding their isolated nature, communication methods, and best practices will help you create extensions that work reliably across different websites while maintaining security and performance.

<<<<<<< HEAD
Remember these key points:
- Always use specific URL match patterns
- Clean up after yourself
- Handle dynamic content properly
- Communicate effectively with other extension parts
- Test across multiple websites
=======
Remember these key takeaways:
- Use specific URL matching to minimize impact
- Clean up after yourself
- Handle dynamic content with MutationObserver
- Communicate via message passing
- Consider Shadow DOM for style isolation

Master these concepts, and you'll be building sophisticated page-modifying extensions in no time!
>>>>>>> quality/expand-thin-a5-r4
