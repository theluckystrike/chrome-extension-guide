---
layout: default
title: "Chrome Extension Web Request Patterns — Developer Guide"
description: "Learn Chrome extension web request patterns with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/web-request-patterns/"
---
# WebRequest API Patterns

## Overview {#overview}
- `chrome.webRequest` — observe and optionally modify network requests
- Requires `"webRequest"` permission (cross-ref `docs/permissions/webRequest.md`)
- MV3: blocking/modification requires `"declarativeNetRequest"` (cross-ref `docs/mv3/declarative-net-request.md`)
- MV3 `webRequest` is observe-only (no blocking without `declarativeNetRequest`)

## Request Lifecycle Events {#request-lifecycle-events}
```javascript
// Events fire in this order for each request:
// 1. onBeforeRequest       — request about to be made (can cancel/redirect)
// 2. onBeforeSendHeaders   — headers about to be sent (can modify headers)
// 3. onSendHeaders         — headers sent (informational)
// 4. onHeadersReceived     — response headers received (can modify)
// 5. onAuthRequired        — HTTP auth needed (can provide credentials)
// 6. onResponseStarted     — first byte received (informational)
// 7. onCompleted           — request complete (informational)
// or onErrorOccurred       — request failed
```

## Observing Requests (MV3 Compatible) {#observing-requests-mv3-compatible}
```javascript
// Monitor all requests (no blocking)
chrome.webRequest.onCompleted.addListener(
  (details) => {
    console.log(`${details.method} ${details.url} -> ${details.statusCode}`);
    console.log('Type:', details.type); // "main_frame", "sub_frame", "script", "image", etc.
    console.log('Tab:', details.tabId);
    console.log('Time:', details.timeStamp);
  },
  { urls: ["<all_urls>"] }  // URL filter (required)
);

// Filter to specific URLs
chrome.webRequest.onCompleted.addListener(
  (details) => { /* only fires for matching URLs */ },
  { urls: ["*://*.example.com/*", "https://api.github.com/*"] }
);

// Filter by resource type
chrome.webRequest.onCompleted.addListener(
  (details) => { /* only XHR/fetch requests */ },
  { urls: ["<all_urls>"], types: ["xmlhttprequest"] }
);
```

## Request Types {#request-types}
- `"main_frame"` — top-level page navigation
- `"sub_frame"` — iframe navigation
- `"stylesheet"` — CSS files
- `"script"` — JavaScript files
- `"image"` — images
- `"font"` — web fonts
- `"object"` — plugins (Flash, etc.)
- `"xmlhttprequest"` — XHR and fetch requests
- `"ping"` — sendBeacon, CSP reports
- `"csp_report"` — CSP violation reports
- `"media"` — audio/video
- `"websocket"` — WebSocket connections
- `"webbundle"` — web bundles
- `"other"` — anything else

## Reading Headers {#reading-headers}
```javascript
// Read request headers
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    const cookies = details.requestHeaders?.find(h => h.name === 'Cookie');
    const auth = details.requestHeaders?.find(h => h.name === 'Authorization');
    console.log('Cookies:', cookies?.value);
    console.log('Auth:', auth?.value);
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]  // Extra info spec — needed to access headers
);

// Read response headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const contentType = details.responseHeaders?.find(
      h => h.name.toLowerCase() === 'content-type'
    );
    console.log('Content-Type:', contentType?.value);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
```

## Blocking Requests (MV2 / Enterprise MV3) {#blocking-requests-mv2-enterprise-mv3}
```javascript
// NOTE: In MV3, use declarativeNetRequest instead for public extensions
// webRequestBlocking only works in MV2 or MV3 with enterprise policy

// Cancel requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('tracking.js')) {
      return { cancel: true };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Redirect requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    return { redirectUrl: details.url.replace('http://', 'https://') };
  },
  { urls: ["http://*/*"] },
  ["blocking"]
);

// Modify request headers
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    details.requestHeaders.push({ name: 'X-Custom', value: 'my-extension' });
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);
```

## Network Request Logger {#network-request-logger}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { createMessenger } from '@theluckystrike/webext-messaging';

const storage = createStorage(defineSchema({
  requestLog: 'string',    // JSON: Array<{ url, method, status, type, time }>
  logEnabled: 'boolean'
}), 'local');

// Log completed requests
chrome.webRequest.onCompleted.addListener(async (details) => {
  const enabled = await storage.get('logEnabled');
  if (!enabled) return;

  const raw = await storage.get('requestLog');
  const log = raw ? JSON.parse(raw) : [];
  log.unshift({
    url: details.url,
    method: details.method,
    status: details.statusCode,
    type: details.type,
    time: details.timeStamp
  });
  await storage.set('requestLog', JSON.stringify(log.slice(0, 1000)));
});
```

## MV3 Migration: webRequest to declarativeNetRequest {#mv3-migration-webrequest-to-declarativenetrequest}
| Feature | webRequest (MV2) | declarativeNetRequest (MV3) |
|---------|-----------------|---------------------------|
| Block requests | `onBeforeRequest` + `blocking` | Static/dynamic rules |
| Modify headers | `onBeforeSendHeaders` + `blocking` | `modifyHeaders` action |
| Redirect | Return `{ redirectUrl }` | `redirect` action |
| Observe only | All events | N/A (use `webRequest`) |
| Performance | Extension code runs per request | Browser-native rule matching |
| Cross-ref | This guide | `docs/mv3/declarative-net-request.md` |

## Common Mistakes {#common-mistakes}
- Missing `extraInfoSpec` (`["requestHeaders"]`, `["responseHeaders"]`) — headers won't be available
- Using `webRequest` for blocking in MV3 — won't work for public extensions
- Heavy processing in event handlers — blocks network requests (MV2 blocking mode)
- Not filtering URLs — processing every request is expensive
- Forgetting that `webRequest` requires host permissions for the URLs being observed

## Related Articles {#related-articles}

## Related Articles

- [Network Interception](../patterns/network-interception.md)
- [WebRequest Permission](../permissions/webRequest.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
