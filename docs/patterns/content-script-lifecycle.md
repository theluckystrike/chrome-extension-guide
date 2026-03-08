---
layout: default
title: "Chrome Extension Content Script Lifecycle — Best Practices"
description: "Manage content script lifecycle effectively."
---

# Content Script Lifecycle Management

Content scripts in Chrome extensions have a distinct lifecycle that differs from regular web page scripts. Understanding this lifecycle is crucial for building robust, memory-efficient extensions.

## Injection Timing

Content scripts can be injected at different points in the page loading process:

| Run At | Description |
|--------|-------------|
| `document_start` | Before any DOM is constructed |
| `document_idle` | After DOMContentLoaded (default) |
| `document_end` | After DOM is fully parsed |

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "run_at": "document_idle"
  }]
}
```

## Static vs Dynamic Injection

### Static Injection (Manifest)
```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

### Dynamic Injection (Scripting API)
```javascript
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => { console.log('Injected!'); }
});
```

## Multiple Injections & Navigation

Content scripts inject **once per page navigation**, not on hash changes. For SPAs, you need additional handling:

```javascript
// SPA-aware content script with MutationObserver
const observer = new MutationObserver((mutations) => {
  // Detect route changes in SPA
  if (mutations.some(m => m.addedNodes.length > 0)) {
    initializeSPAComponents();
  }
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});
```

## Cleanup on Navigation

Content script globals are garbage collected when the page unloads. Always clean up:

```javascript
window.addEventListener('unload', () => {
  observer?.disconnect();
  // Remove event listeners
  document.removeEventListener('click', handleClick);
});
```

## Extension Updates

When an extension updates, existing content scripts keep running but lose their connection to the background script:

```javascript
// Detect stale context
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === 'ping') sendResponse('pong');
});

// Reconnection logic in background
async function reconnectContentScripts() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, 'reconnect');
  }
}
```

## Cross-Frame Injection

Use `all_frames` to inject into iframes:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "all_frames": true,
    "js": ["content.js"]
  }]
}
```

## Memory Leak Prevention

Always clean up to avoid memory leaks:

```javascript
let observer = null;
let clickHandler = null;

function cleanup() {
  observer?.disconnect();
  document.removeEventListener('click', clickHandler);
  observer = null;
  clickHandler = null;
}

window.addEventListener('unload', cleanup);
```

## Related Resources

- [Content Script Patterns](../guides/content-script-patterns.md)
- [Content Script API Reference](../reference/content-script-api.md)
- [Content Script Isolation](./content-script-isolation.md)
