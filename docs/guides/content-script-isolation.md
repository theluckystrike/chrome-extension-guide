# Content Script Isolation Deep Dive

## Introduction
- Content scripts run in an "isolated world" — they share the DOM but NOT the JavaScript scope
- This is Chrome's security model for extensions interacting with web pages

## The Isolated World Model
- Content script's `window` !== page's `window`
- Content script can read/modify DOM elements, but can't access page's JS variables or functions
- Page can't access content script's variables or Chrome APIs
- Both worlds see the same DOM tree

## What Content Scripts CAN Access
- Full DOM (document.querySelector, createElement, etc.)
- `chrome.runtime` (for messaging)
- `chrome.storage` (direct access)
- `chrome.i18n`
- `fetch()` with extension's permissions (not page's CORS)
- `XMLHttpRequest`

## What Content Scripts CANNOT Access
- Page's JavaScript variables (`window.myApp` etc.)
- Page's event listeners
- Other Chrome APIs (no `chrome.tabs`, `chrome.bookmarks`, etc.)
- Variables from other content scripts (other extensions)

## Accessing Page JavaScript

### Method 1: window.postMessage
```javascript
// content.js — send to page
window.postMessage({ type: "FROM_EXTENSION", data: "hello" }, "*");

// content.js — receive from page
window.addEventListener("message", (event) => {
  if (event.data.type === "FROM_PAGE") {
    console.log("Page says:", event.data.data);
  }
});

// inject.js (injected into page context)
window.addEventListener("message", (event) => {
  if (event.data.type === "FROM_EXTENSION") {
    const result = window.myApp.getData(); // Access page JS!
    window.postMessage({ type: "FROM_PAGE", data: result }, "*");
  }
});
```

### Method 2: Main World Injection (MV3)
```javascript
// background.js — inject script into main world
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: "MAIN",  // Runs in page's JS context!
  func: () => {
    return window.myApp.getState();
  }
});
```
- `world: "MAIN"` gives full access to page JavaScript
- Security risk: code runs with page's permissions, not extension's

### Method 3: Script Tag Injection
```javascript
// content.js — inject a script tag into the page
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js"); // Must be web_accessible_resource
document.head.appendChild(script);
```

## Communication Architecture
```
Page JS <-- window.postMessage --> Content Script <-- chrome.runtime --> Background SW
```
- Use `@theluckystrike/webext-messaging` for content <-> background:
  ```typescript
  // content.js
  const messenger = createMessenger<Messages>();
  const data = await messenger.sendMessage('processData', { html: document.body.innerHTML });
  ```
- Use `window.postMessage` for content <-> page JS

## CSP and Content Scripts
- Content scripts are NOT subject to the page's CSP
- Content scripts ARE subject to the extension's CSP
- Injected `<script>` tags ARE subject to the page's CSP (may be blocked)
- `chrome.scripting.executeScript` with `world: "MAIN"` bypasses page CSP

## Debugging Isolation
- DevTools Console: switch context dropdown from "top" to your extension name
- "top" = page context, extension name = content script context
- `console.log` in content script appears in page's DevTools (but in extension context)
- Use Sources panel -> Content scripts section to set breakpoints

## Security Best Practices
- Never trust data from the page — sanitize everything
- Validate `window.postMessage` events — check `event.origin` or use `event.data.type` filtering
- Don't expose sensitive extension data to the page via DOM
- Use `@theluckystrike/webext-messaging` for secure extension-internal communication
- Minimize main world injection — only when absolutely needed

## Common Patterns
- **Page data extraction**: Read DOM, send to background for processing
- **UI injection**: Create extension UI elements in page DOM
- **Page function hooking**: Main world injection to intercept/modify page behavior
- **Form autofill**: Content script fills form fields from stored data (`@theluckystrike/webext-storage`)

## Common Mistakes
- Trying to access `window.myVar` from content script — it's a different `window`
- Forgetting that injected `<script>` tags run in page context, not extension context
- Not filtering `window.postMessage` events — any page script can send messages
- Expecting content script to have access to `chrome.tabs` — it doesn't
