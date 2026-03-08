---
layout: default
title: "Chrome Extension Content Script Communication Bridge — Best Practices"
description: "Bridge communication between content scripts."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/content-script-communication-bridge/"
---

# Content Script Communication Bridge

## Overview

Content scripts run in Chrome's [isolated world](../guides/content-script-isolation.md), separate from the page's JavaScript context. Both can access the DOM, but cannot directly share variables or call each other's functions. This guide covers practical patterns for bridging these worlds.

See also: [Content Script Isolation](./content-script-isolation.md), [Iframe Communication](./iframe-communication.md), [Dynamic Content Scripts](../mv3/dynamic-content-scripts.md).

---

## The Communication Problem

Both worlds see the same DOM, but have separate JavaScript contexts. Communication must go through the DOM — the only shared resource.

---

## Pattern 1: window.postMessage Bridge

### Extension → Page

```ts
// content.ts — Send FROM extension TO page
const bridge = document.createElement('div');
bridge.id = 'extension-bridge';
bridge.style.display = 'none';
document.body.appendChild(bridge);

bridge.dispatchEvent(new CustomEvent('extension-message', {
  detail: { action: 'show-notification', data: { message: 'Hello!' } }
}));
```

```js
// Page script — Receive from extension
document.getElementById('extension-bridge')?.addEventListener('extension-message', (e) => {
  console.log(e.detail);
});
```

### Page → Extension

```js
// Page script — Send TO extension
window.postMessage({ source: 'my-extension', action: 'get-settings' }, '*');
```

```ts
// content.ts — Listen for page messages
window.addEventListener('message', (event) => {
  if (event.data?.source !== 'my-extension') return;
  const { action } = event.data;
  
  if (action === 'get-settings') {
    chrome.runtime.sendMessage({ type: 'settings-response', data: { theme: 'dark' } });
  }
});
```

---

## Pattern 2: CustomEvent Dispatching

```ts
// content.ts — Notify page of extension state
document.dispatchEvent(new CustomEvent('extension-state-changed', {
  detail: { isLoggedIn: true, userId: '12345' }
}));
```

```js
// Page script — Listen anywhere
document.addEventListener('extension-state-changed', (e) => {
  console.log('State:', e.detail);
});
```

---

## Pattern 3: DOM Attribute Signaling

```ts
// content.ts — Write state to DOM
const indicator = document.createElement('div');
indicator.id = 'ext-state';
indicator.dataset.extensionReady = 'true';
document.body.appendChild(indicator);
```

```js
// Page script — Observe for changes
const observer = new MutationObserver(() => {
  const ready = document.getElementById('ext-state')?.dataset.extensionReady;
  if (ready === 'true') console.log('Extension ready!');
});
observer.observe(document.body, { attributes: true, subtree: true });
```

---

## Security Considerations

Always validate origin and message shape:

```ts
window.addEventListener('message', (event) => {
  if (event.source !== window) return;  // Reject iframe messages
  
  const msg = event.data as { source: string; action: string };
  
  if (msg.source !== 'trusted-page-script') return;  // Whitelist
  
  const allowedActions = ['get-data', 'ping'];
  if (!allowedActions.includes(msg.action)) return;  // Validate action
  
  handleMessage(msg);
});
```

### Best Practices

1. **Whitelist sources** — Don't accept from any origin
2. **Validate structure** — Check expected properties and types
3. **Sanitize data** — Never eval() incoming data
4. **Use TypeScript** — Define message schemas for type safety

---

## Use Cases

### Intercepting Page API Calls

```ts
// content.ts — Inject fetch interceptor
const script = document.createElement('script');
script.textContent = `
  (function() {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      document.dispatchEvent(new CustomEvent('ext-fetch', {
        detail: { url: args[0] }
      }));
      return originalFetch.apply(this, args);
    };
  })();
`;
document.documentElement.appendChild(script);
```

### Injecting Data into Page Context

```ts
// content.ts — Expose data to page
function exposeToPage(key: string, value: unknown) {
  const el = document.createElement('script');
  el.textContent = \`window['__ext_${key}'] = \${JSON.stringify(value)};\`;
  document.documentElement.appendChild(el);
}
exposeToPage('settings', { theme: 'dark' });
```

### Reading Page Variables

```ts
// content.ts — Read page state (if exposed)
function getPageVar<T>(name: string): T | null {
  return (window as any)[name] ?? null;
}
const pageState = getPageVar<{ user: string }>('__pageState');
```

---

## Summary

| Method | Direction | Best For |
|--------|-----------|----------|
| `postMessage` | Bidirectional | Complex messages, request/response |
| `CustomEvent` | One-way | State notifications |
| DOM attributes | One-way | Simple flags, polling |
| Script injection | Page ← Extension | Running code in page context |

Choose based on direction and complexity needs.
