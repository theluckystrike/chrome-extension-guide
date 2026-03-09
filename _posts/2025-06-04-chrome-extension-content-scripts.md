---
layout: post
title: "Content Scripts in Chrome Extensions"
<<<<<<< HEAD
description: "Learn how content scripts interact with web pages, modify DOM, and enhance browser functionality"
=======
description: "Master content script injection in Chrome extensions. Learn declarative and programmatic injection, DOM manipulation, isolated worlds, and message passing."
>>>>>>> quality/fix-frontmatter-a9-r2
date: 2025-06-04
categories: [tutorial]
tags: [content-scripts, injection, dom, manifest, javascript]
---

Content scripts are a powerful feature of Chrome extensions that run in the context of web pages. They allow your extension to read and modify page content, enabling a wide range of functionality from ad blocking to page enhancement. This guide covers everything you need to master content scripts.

## How Content Scripts Work

Content scripts are JavaScript files that Chrome injects into web pages that match patterns you specify. Unlike regular JavaScript on a webpage, content scripts can access and manipulate the DOM directly. They run in an isolated world, which provides security benefits but also means they cannot directly access page variables.

### Key Concepts

- **Injected JavaScript**: Content scripts run in the context of the page
- **DOM Access**: Full access to read and modify page content
- **Isolated World**: Separate JavaScript execution environment from the page
- **Match Patterns**: URL patterns that determine when to inject

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

## Types of Content Script Injection

### Declarative Injection

As shown above, you declare content scripts in the manifest. Chrome automatically injects them based on URL patterns. This is the most common approach and works well for extensions that need to run on specific sites.

```json
{
  "content_scripts": [
    {
      "matches": ["https://*.google.com/*"],
      "js": ["google-content.js"],
      "css": ["google-styles.css"],
      "run_at": "document_end"
    },
    {
      "matches": ["https://*.github.com/*"],
      "js": ["github-content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

### Programmatic Injection

You can also inject content scripts programmatically from background scripts or other extension contexts:

```javascript
// Inject a content script when needed
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
  console.log('Page title:', results[0].result);
});
```

Programmatic injection requires the "scripting" permission and is triggered by user action or extension events.

## Accessing Page Content

Content scripts have access to the page's DOM but run in an isolated world. This creates a unique environment with specific characteristics:

```javascript
// Reading page content
const heading = document.querySelector('h1');
console.log('Page title:', heading.textContent);

// Finding multiple elements
const links = document.querySelectorAll('a');
links.forEach(link => console.log(link.href));

// Modifying the page
const newElement = document.createElement('div');
newElement.textContent = 'Added by my extension!';
newElement.className = 'my-extension-element';
document.body.appendChild(newElement);

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
```

## Communication with Extension

Content scripts can communicate with other parts of your extension using message passing:

### Sending Messages

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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateContent') {
    document.body.style.backgroundColor = message.color;
    sendResponse({ success: true });
  }
  
  if (message.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      ready: document.readyState
    });
  }
  
  return true; // Keep channel open for async response
});
```

## Timing of Injection

Control when your content script runs using the "run_at" option:

- **"document_start"** - Before any DOM is created, CSSOM is available
- **"document_end"** - After DOM is complete but before resources load
- **"document_idle"** - After DOM and resources (default)

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_end"
  }]
}
```

### When to Use Each Timing

- **document_start**: For injecting CSS, modifying meta tags, or pre-loading scripts
- **document_end**: For most DOM manipulations, when you need the DOM but not images
- **document_idle**: Default, safest choice for most use cases

## Isolated Worlds

Each content script runs in its own isolated JavaScript world. This provides significant security benefits:

- Page JavaScript cannot access your content script's variables
- Your content script cannot access page JavaScript's variables
- CSS is automatically isolated

However, you can still interact with page scripts through shared DOM elements:

```javascript
// Create a custom event that page scripts can listen to
const event = new CustomEvent('myExtensionReady', { 
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
```

## Common Use Cases

Content scripts are perfect for:

1. **Page modification** - Adding UI elements, hiding content, changing styles
2. **Data extraction** - Scraping information from pages
3. **Form enhancement** - Auto-filling forms, adding validation
4. **Ad blocking** - Removing or hiding advertisement elements
5. **Page analytics** - Tracking user interactions
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
```

## Best Practices

### Match Specific URLs

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
```

### Clean Up After Yourself

If you add elements or modify styles, consider cleaning them up when appropriate:

```javascript
// Remove added elements on page unload
window.addEventListener('unload', () => {
  document.querySelectorAll('.my-extension-element').forEach(el => el.remove());
});

// Restore modified styles
const originalStyles = new Map();
function cleanupStyles() {
  originalStyles.forEach((original, element) => {
    element.style.cssText = original;
  });
  originalStyles.clear();
}
```

### Handle Dynamic Content

Use MutationObserver for pages with dynamic content:

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Process new elements
        if (node.matches('.dynamic-content')) {
          processDynamicElement(node);
        }
        
        // Check children too
        node.querySelectorAll('.dynamic-content').forEach(processDynamicElement);
      }
    });
  });
});

function processDynamicElement(element) {
  if (element.dataset.processed) return;
  element.dataset.processed = 'true';
  
  // Your processing logic here
  element.classList.add('extension-processed');
}

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});
```

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
```

## Conclusion

Content scripts are fundamental to building powerful Chrome extensions that enhance web pages. Understanding their isolated nature, communication methods, and best practices will help you create extensions that work reliably across different websites while maintaining security and performance.

Remember these key points:
- Always use specific URL match patterns
- Clean up after yourself
- Handle dynamic content properly
- Communicate effectively with other extension parts
- Test across multiple websites
