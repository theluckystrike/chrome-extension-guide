---
layout: default
title: "Mastering Content Scripts in Chrome Extensions — Developer Guide"
description: "A comprehensive guide to mastering content scripts in Chrome extensions: injection methods, isolated worlds, DOM access patterns, CSS injection, run_at timing, matching patterns, dynamic registration, page context communication, and shadow DOM interaction."
canonical_url: "https://bestchromeextensions.com/tutorials/content-scripts-guide/"
---

# Mastering Content Scripts in Chrome Extensions

Content scripts are the bridge between your Chrome extension and web pages. They run in the context of web pages, allowing you to read and modify the DOM, respond to user interactions, and inject custom styles. This guide covers everything you need to become proficient with content scripts in Chrome extensions.

## Overview {#overview}

Content scripts are JavaScript files that execute within the context of web pages. They can access the DOM, modify page content, and respond to user actions, but they run in an isolated environment separate from the page's JavaScript and other extensions.

## Injection Methods {#injection-methods}

### Manifest-Based (Static) Injection {#manifest-injection}

The simplest approach declares scripts in `manifest.json` under the `content_scripts` key. These scripts automatically execute on matching pages.

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "css": ["styles/content.css"],
      "run_at": "document_idle"
    }
  ]
}
```

**Key properties:**
- `matches`: URL patterns that determine which pages receive the script
- `js`: Array of JavaScript files to inject
- `css`: Array of CSS files to inject
- `run_at`: When to inject the script

### Programmatic Injection {#programmatic-injection}

For dynamic control, use the `chrome.scripting` API. This requires the `scripting` permission.

```json
{
  "permissions": ["scripting", "activeTab"]
}
```

```javascript
// Inject when user clicks the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });

  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['styles/content.css']
  });
});
```

You can also inject inline code:

```javascript
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    document.body.classList.add('extension-active');
  }
});
```

## Isolated Worlds {#isolated-worlds}

Chrome extensions operate in two distinct JavaScript worlds:

### Isolated World (Default) {#isolated-world}

Content scripts run in an isolated environment by default. They cannot access page variables, and the page cannot access extension variables.

```javascript
// Content script - isolated world
const pageTitle = document.title;  // Works - can read DOM
// const pageVariable = window.pageVariable;  // Would fail - can't access page JS
```

### Main World {#main-world}

The `world` property allows scripts to run in the same context as the page:

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "world": "MAIN"
  }]
}
```

```javascript
// With world: "MAIN", you can access page variables
const pageVariable = window.somePageFunction();
```

**Warning:** Running in the main world exposes your extension code to the page and vice versa. Use this only when necessary and sanitize all inputs.

## DOM Access Patterns {#dom-access-patterns}

### Basic DOM Manipulation {#basic-dom}

```javascript
// Reading DOM content
const heading = document.querySelector('h1');
const text = heading.textContent;

// Modifying the DOM
const newElement = document.createElement('div');
newElement.textContent = 'Hello, World!';
newElement.className = 'extension-element';
document.body.appendChild(newElement);

// Listening for events
document.addEventListener('click', (event) => {
  console.log('Clicked:', event.target);
});
```

### Waiting for Elements {#waiting-for-elements}

```javascript
// MutationObserver for dynamic content
const observer = new MutationObserver((mutations) => {
  const element = document.querySelector('.dynamic-element');
  if (element && !element.dataset.processed) {
    element.dataset.processed = 'true';
    processElement(element);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Simple waiting function
async function waitForSelector(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, timeout);
  });
}

// Usage
const element = await waitForSelector('.lazy-loaded-content');
```

### Handling Shadow DOM {#handling-shadow-dom}

Content scripts can access elements inside open shadow DOM:

```javascript
// Access shadow DOM
const hostElement = document.querySelector('#shadow-host');
if (hostElement && hostElement.shadowRoot) {
  const shadowContent = hostElement.shadowRoot.querySelector('.inner');
  shadowContent.textContent = 'Modified from extension!';
}

// Inject into shadow DOM
const style = document.createElement('style');
style.textContent = `
  .highlight {
    background: yellow;
    color: black;
  }
`;

// Inject into open shadow root
const newElement = document.createElement('div');
newElement.textContent = 'Inside shadow DOM';
newElement.className = 'highlight';

const shadowRoot = hostElement.shadowRoot;
shadowRoot.appendChild(style);
shadowRoot.appendChild(newElement);
```

## CSS Injection {#css-injection}

### Static CSS via Manifest {#static-css}

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "css": ["styles/base.css"]
  }]
}
```

### Programmatic CSS Injection {#programmatic-css}

```javascript
await chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: `
    .extension-highlight {
      background-color: yellow;
      border: 2px solid orange;
    }
  `
});
```

### Dynamic Style Management {#dynamic-styles}

```javascript
// Inject styles dynamically
function injectStyles(css) {
  const style = document.createElement('style');
  style.id = 'extension-dynamic-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

// Remove injected styles
function removeStyles() {
  const style = document.getElementById('extension-dynamic-styles');
  if (style) {
    style.remove();
  }
}
```

## Run_at Timing {#run-at-timing}

The `run_at` property controls when content scripts execute:

| Value | Timing |
|-------|--------|
| `document_start` | Before any DOM is constructed |
| `document_end` | After DOM is complete, before subresources |
| `document_idle` | After page fully loads (default) |

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["early-inject.js"],
    "run_at": "document_start"
  }]
}
```

```javascript
// document_start - inject CSS immediately
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.style.setProperty('--extension-color', 'blue');
});
```

## Matching Patterns {#matching-patterns}

### Basic Patterns {#basic-patterns}

```json
{
  "content_scripts": [{
    "matches": [
      "<all_urls>",                    // All URLs
      "https://*.example.com/*",       // Any subdomain of example.com
      "https://example.com/path/*",    // Specific path
      "https://example.com/*",         // Exact domain
      "file:///path/to/file.html"     // Local files
    ]
  }]
}
```

### Exclude Patterns {#exclude-patterns}

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "exclude_matches": ["https://admin.example.com/*"]
  }]
}
```

### Match Origin and Paths {#match-origin-and-paths}

```json
{
  "content_scripts": [{
    "match_about_blank": true,
    "matches": ["https://example.com/*"]
  }]
}
```

## Dynamic Content Script Registration {#dynamic-registration}

Register content scripts dynamically at runtime:

```javascript
// Register a dynamic content script
async function registerDynamicScript() {
  await chrome.scripting.registerContentScripts([{
    id: 'dynamic-script',
    matches: ['https://*.example.com/*'],
    js: ['content.js'],
    css: ['styles.css'],
    run_at: 'document_idle'
  }]);
}

// Unregister
async function unregisterDynamicScript() {
  await chrome.scripting.unregisterContentScripts(['dynamic-script']);
}

// Get registered scripts
async function getRegisteredScripts() {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  console.log(scripts);
}
```

## Communicating with the Page Context {#communicating-page-context}

### Using window.postMessage {#using-postmessage}

**From content script to page:**

```javascript
// Content script - send message to page
window.postMessage({
  type: 'EXTENSION_MESSAGE',
  payload: { action: 'highlight', color: 'yellow' }
}, '*');

// Content script - receive from page
window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'PAGE_MESSAGE') {
    console.log('Received from page:', event.data.payload);
  }
});
```

**In page script (injected):**

```javascript
// Page script - receive from extension
window.addEventListener('message', (event) => {
  if (event.data.type === 'EXTENSION_MESSAGE') {
    // Handle extension message
  }
});

// Page script - send to extension
window.postMessage({
  type: 'PAGE_MESSAGE',
  payload: { data: 'hello' }
}, '*');
```

### Using Custom Events {#using-custom-events}

```javascript
// Content script - dispatch custom event
const event = new CustomEvent('extension-action', {
  detail: { action: 'process', data: {...} }
});
document.dispatchEvent(event);

// Page script listens
document.addEventListener('extension-action', (e) => {
  console.log('Extension action:', e.detail);
});
```

### Injecting a Script for Communication {#injecting-for-communication}

```javascript
// Inject a bridge script into the main world
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'MAIN',
  func: () => {
    // This runs in the page's context
    window.extensionBridge = {
      sendToExtension: (data) => {
        window.postMessage({
          type: 'FROM_PAGE',
          payload: data
        }, '*');
      }
    };

    window.addEventListener('message', (event) => {
      if (event.data.type === 'TO_PAGE') {
        // Handle message from extension
      }
    });
  }
});
```

## Best Practices {#best-practices}

1. **Use isolated worlds by default** - Only use `world: "MAIN"` when necessary
2. **Minimize manifest permissions** - Request only what's needed
3. **Handle page dynamics** - Use MutationObserver for SPAs and dynamic content
4. **Clean up properly** - Remove injected styles, event listeners, and observers when no longer needed
5. **Avoid conflicts** - Use unique class names and IDs with prefixes

## Common Pitfalls {#common-pitfalls}

- **Assuming page is static** - Use observers for SPAs
- **Memory leaks** - Always disconnect observers and clean up
- **Security issues** - Sanitize inputs, especially with `world: "MAIN"`
- **Timing issues** - Use appropriate `run_at` values

---

## Related Articles {#related-articles}

- [Content Script Injection](/guides/content-script-injection/) — Deep dive into static vs programmatic injection
- [Content Script Isolation](/guides/content-script-isolation/) — Understanding isolated vs main worlds
- [Content Script Patterns](/guides/content-script-patterns/) — Common patterns and best practices

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
