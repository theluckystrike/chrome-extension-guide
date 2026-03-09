---
layout: post
title: "Content Scripts in Chrome Extensions"
description: "Learn how content scripts interact with web pages and modify page content"
date: 2025-06-04
categories: [tutorial]
tags: [content-scripts, injection, dom, manifest, javascript]
---

Content scripts are a powerful feature of Chrome extensions that run in the context of web pages. They allow your extension to read and modify page content, enabling a wide range of functionality from ad blocking to page enhancement.

## How Content Scripts Work

Content scripts are JavaScript files that Chrome injects into web pages that match patterns you specify. Unlike regular JavaScript on a webpage, content scripts can access and manipulate the DOM directly.

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
As shown above, you declare content scripts in the manifest. Chrome automatically injects them based on URL patterns.

### Programmatic Injection
You can also inject content scripts programmatically from background scripts:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
}, (results) => {
  console.log('Script injected successfully');
});
```

Programmatic injection requires the "scripting" permission.

## Accessing Page Content

Content scripts have access to the page's DOM but run in an isolated world. This means:

- They can read and modify the DOM
- They cannot access variables defined by the page's JavaScript
- The page's JavaScript cannot access variables in your content script

```javascript
// Reading page content
const heading = document.querySelector('h1');
console.log('Page title:', heading.textContent);

// Modifying the page
const newElement = document.createElement('div');
newElement.textContent = 'Added by my extension!';
newElement.className = 'my-extension-element';
document.body.appendChild(newElement);
```

## Communication with Extension

Content scripts can communicate with other parts of your extension using message passing:

```javascript
// Send message to background script
chrome.runtime.sendMessage({
  type: 'PAGE_DATA',
  data: { url: window.location.href }
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateContent') {
    document.body.style.backgroundColor = message.color;
  }
});
```

## Timing of Injection

Control when your content script runs using the "run_at" option:

- **"document_start"** - Before any DOM is created
- **"document_end"** - After DOM is complete but before resources
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

## Isolated Worlds

Each content script runs in its own isolated JavaScript world. This provides security benefits:

- Page JavaScript cannot access your content script's variables
- Your content script cannot access page JavaScript's variables
- CSS is automatically isolated

However, you can still interact with page scripts through shared DOM elements:

```javascript
// Create a custom event that page scripts can listen to
const event = new CustomEvent('myExtensionReady', { detail: { data: 'hello' } });
document.dispatchEvent(event);
```

## Common Use Cases

Content scripts are perfect for:

1. **Page modification** - Adding UI elements, hiding content, changing styles
2. **Data extraction** - Scraping information from pages
3. **Form enhancement** - Auto-filling forms, adding validation
4. **Ad blocking** - Removing or hiding advertisement elements
5. **Page analytics** - Tracking user interactions

## Best Practices

### Match Specific URLs
Avoid using "<all_urls>" unless necessary. Specific URL patterns reduce performance impact and increase user trust.

### Clean Up After Yourself
If you add elements or modify styles, consider cleaning them up when appropriate:

```javascript
// Remove added elements on page unload
window.addEventListener('unload', () => {
  document.querySelectorAll('.my-extension-element').forEach(el => el.remove());
});
```

### Handle Dynamic Content
Use MutationObserver for pages with dynamic content:

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Process new elements
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
```

## Conclusion

Content scripts are fundamental to building powerful Chrome extensions that enhance web pages. Understanding their isolated nature, communication methods, and best practices will help you create extensions that work reliably across different websites while maintaining security and performance.
