# WebRequest API Guide

## Overview
- Requires `"webRequest"` permission plus host permissions for URLs you want to intercept
- Provides hooks into the HTTP request lifecycle — observe, block, or modify requests
- Events fire at different stages: before request, send headers, headers received, completion, errors
- In Manifest V2, blocking listeners could modify requests; in MV3, most blocking is deprecated

## Lifecycle Events

The WebRequest API fires events in this order:

```
onBeforeRequest → onBeforeSendHeaders → onSendHeaders → 
onHeadersReceived → onAuthRequired → onResponseStarted → 
onCompleted / onErrorOccurred
```

### onBeforeRequest — Intercepting Requests
Fired when a request is about to occur. Use to:
- Cancel requests (`blocking: true`)
- Redirect requests
- Read POST body data

```javascript
// manifest.json
{
  "permissions": ["webRequest", "webRequestBlocking"],
  "host_permissions": ["<all_urls>"]
}

// background.js
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Cancel requests to specific domains
    if (details.url.includes('ads.example.com')) {
      return { cancel: true };
    }

    // Redirect requests
    if (details.url === 'https://old-site.com/page') {
      return { redirectUrl: 'https://new-site.com/page' };
    }

    // Read POST data (if formType is "formData")
    if (details.requestBody) {
      const formData = details.requestBody.formData;
      console.log('POST data:', formData);
    }
  },
  {
    urls: ['<all_urls>'],
    types: ['main_frame', 'sub_frame', 'xmlhttprequest']
  },
  ['blocking', 'requestBody']
);
```

### onBeforeSendHeaders — Modifying Request Headers
Fired before request headers are sent. Use to:
- Add custom headers
- Modify existing headers (User-Agent, Referer, etc.)
- Remove headers

```javascript
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const requestHeaders = details.requestHeaders || {};

    // Add custom header
    requestHeaders.push({ name: 'X-Custom-Header', value: 'my-value' });

    // Modify existing header
    const uaIndex = requestHeaders.findIndex(h => h.name === 'User-Agent');
    if (uaIndex !== -1) {
      requestHeaders[uaIndex].value = 'MyCustomAgent/1.0';
    }

    // Remove a header
    const filtered = requestHeaders.filter(h => h.name !== 'Cookie');

    return { requestHeaders: filtered };
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders']
);
```

### onSendHeaders — Observing Sent Headers
Fired after request headers have been sent. Read-only — cannot modify. Useful for:
- Logging/monitoring
- Analytics
- Debugging

```javascript
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    console.log('Request sent:', details.url);
    console.log('Headers:', details.requestHeaders);
  },
  { urls: ['<all_urls>'] }
);
```

### onHeadersReceived — Response Headers
Fired when response headers are received. Use to:
- Modify response headers
- Set cookies
- Change caching headers

```javascript
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const headers = details.responseHeaders || {};

    // Add CORS headers
    headers.push(
      { name: 'Access-Control-Allow-Origin', value: '*' },
      { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' }
    );

    // Modify caching
    const cacheIdx = headers.findIndex(h => h.name === 'Cache-Control');
    if (cacheIdx !== -1) {
      headers[cacheIdx].value = 'no-store, no-cache';
    }

    return { responseHeaders: headers };
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'responseHeaders']
);
```

### onAuthRequired — Handling Authentication
Fired when the server requests authentication (401/407). Use to:
- Provide credentials automatically
- Cancel authentication

```javascript
chrome.webRequest.onAuthRequired.addListener(
  (details) => {
    // Auto-provide credentials
    return {
      authCredentials: {
        username: 'myuser',
        password: 'mypassword'
      }
    };
  },
  { urls: ['https://internal.corp/*'] },
  ['blocking']
);
```

### onResponseStarted — Response Body Starts
Fired when first byte of response is received. Read-only observer.

```javascript
chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    console.log('Response started for:', details.url, 'Status:', details.statusCode);
  },
  { urls: ['<all_urls>'] }
);
```

### onCompleted — Request Completed
Fired when request completes successfully. Read-only.

```javascript
chrome.webRequest.onCompleted.addListener(
  (details) => {
    console.log('Request completed:', details.url, details.statusCode);
  },
  { urls: ['<all_urls>'] }
);
```

### onErrorOccurred — Request Failed
Fired when request fails (network error, timeout, etc.).

```javascript
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    console.error('Request failed:', details.url, details.error);
  },
  { urls: ['<all_urls>'] }
);
```

## RequestFilter

Filter which requests your listeners handle:

```javascript
{
  urls: [
    '<all_urls>',
    'https://*.example.com/*',
    '*://localhost/*'
  ],
  types: [
    'main_frame',      // Top-level frame
    'sub_frame',       // Iframe
    'stylesheet',      // CSS
    'script',          // JavaScript
    'image',           // Images
    'object',          // Plugins (Flash)
    'xmlhttprequest',  // XHR/Fetch
    'ping',            // Beacon/ping
    'csp_report',      // CSP reports
    'media',           // Audio/video
    'websocket',       // WebSocket
    'other'            // Other
  ],
  tabId: 123,           // Specific tab
  windowId: 456         // Specific window
}
```

## Blocking vs Non-Blocking Listeners

### Blocking (MV2 only, deprecated in MV3)
- Return an object to modify request
- Use `'blocking'` in `extraInfoSpec` array
- In MV3 service workers, this throws an error

```javascript
// MV2 - blocking works
chrome.webRequest.onBeforeRequest.addListener(
  callback,
  { urls: ['<all_urls>'] },
  ['blocking']
);

// MV3 in service worker - blocking NOT allowed
// This will cause an error!
```

### Non-Blocking (Always Works)
- Don't return anything or use `'asyncBlocking'`
- Use for observation/monitoring
- Cannot modify requests

```javascript
// Non-blocking - safe for MV3 service workers
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log('Observed:', details.url);
  },
  { urls: ['<all_urls>'] }
  // No 'blocking' in extraInfoSpec
);
```

## Modifying Headers and Redirecting

### Adding/Modifying Headers
```javascript
// Add header to all requests
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    return {
      requestHeaders: [
        ...details.requestHeaders,
        { name: 'X-Extension-Token', value: 'abc123' }
      ]
    };
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders']
);
```

### Redirecting Requests
```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('legacy-api.com')) {
      return {
        redirectUrl: details.url.replace('legacy-api.com', 'api.example.com')
      };
    }
  },
  { urls: ['https://legacy-api.com/*'] },
  ['blocking']
);
```

### Blocking Requests Entirely
```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => ({ cancel: true }),
  { urls: ['https://tracker.example.com/*'] },
  ['blocking']
);
```

## MV3 Limitations: No Blocking in Service Workers

Manifest V3 runs extension logic in service workers, which are:
- Event-driven, can be terminated at any time
- Cannot use synchronous blocking APIs

### What's Changed
| Feature | MV2 | MV3 |
|---------|-----|-----|
| Blocking listeners | ✅ | ❌ (in service worker) |
| `webRequestBlocking` permission | ✅ | ❌ (removed) |
| Access to request body | ✅ | Limited |

### The Workaround: Declarative Net Request
MV3 introduces `declarativeNetRequest` for declarative rules:

```javascript
// manifest.json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

```json
// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": "ads.example.com", "resourceTypes": ["main_frame"] }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "redirect", "redirect": { "url": "https://example.com" } },
    "condition": { "urlFilter": "old-site.com", "resourceTypes": ["main_frame"] }
  },
  {
    "id": 3,
    "priority": 1,
    "action": { "type": "modifyHeaders", "requestHeaders": [{ "header": "X-Custom", "operation": "set", "value": "value" }] },
    "condition": { "urlFilter": "*", "resourceTypes": ["xmlhttprequest"] }
  }
]
```

## Migrating to declarativeNetRequest

### When to Use Declarative Net Request
- Blocking ads, trackers
- Redirecting URLs
- Modifying headers (request/response)
- Setting cookies

### When webRequest Is Still Needed
- Reading request/response body content
- Complex logic that depends on runtime state
- Authentication handling
- Observing requests for analytics (non-blocking)

```javascript
// MV3: Use webRequest for observation only
chrome.webRequest.onCompleted.addListener(
  (details) => {
    // Log for analytics
    sendAnalytics(details.url, details.statusCode);
  },
  { urls: ['<all_urls>'] }
);

// MV3: Use declarativeNetRequest for blocking
// rules.json handles blocking/redirecting
```

## Debugging Network Requests

### Using chrome.webRequest API
```javascript
// Log all requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log({
      url: details.url,
      method: details.method,
      type: details.type,
      tabId: details.tabId,
      frameId: details.frameId,
      timeStamp: details.timeStamp
    });
  },
  { urls: ['<all_urls>'] }
);
```

### Using chrome.debugger API (More Powerful)
```javascript
// More detailed network debugging
chrome.debugger.attach({ tabId: tabId }, '1.3', () => {
  chrome.debugger.sendCommand({ tabId: tabId }, 'Network.enable');
  
  chrome.debugger.onEvent.addListener((source, method, params) => {
    if (method === 'Network.requestWillBeSent') {
      console.log('Request:', params.request.url);
    }
    if (method === 'Network.responseReceived') {
      console.log('Response:', params.response.status);
    }
  });
});
```

### Extension DevTools Panel
```javascript
// In your DevTools extension
chrome.devtools.network.onRequestFinished.addListener((request) => {
  request.getContent((content) => {
    console.log('Response body:', content);
  });
});
```

## Code Examples

### Complete MV2 Blocking Extension
```javascript
// background.js - MV2 with blocking
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('ads')) return { cancel: true };
    if (details.url.includes('old.com')) {
      return { redirectUrl: details.url.replace('old.com', 'new.com') };
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const headers = details.requestHeaders || [];
    headers.push({ name: 'X-Extension-ID', value: 'my-extension' });
    return { requestHeaders: headers };
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders']
);
```

### Complete MV3 Non-Blocking Extension
```javascript
// background.js - MV3 service worker (non-blocking)
// Note: Use declarativeNetRequest for blocking features

// Monitor all requests
chrome.webRequest.onCompleted.addListener(
  (details) => {
    // Store for popup display
    chrome.storage.local.get(['requests'], (result) => {
      const requests = result.requests || [];
      requests.push({ url: details.url, status: details.statusCode });
      // Keep last 100
      if (requests.length > 100) requests.shift();
      chrome.storage.local.set({ requests });
    });
  },
  { urls: ['<all_urls>'], types: ['main_frame', 'xmlhttprequest'] }
);

// Handle authentication (blocking still works in MV3 for auth)
chrome.webRequest.onAuthRequired.addListener(
  (details, async () => {
    const credentials = await getCredentials(details.url);
    return { authCredentials: credentials };
  }),
  { urls: ['https://internal.corp/*'] },
  ['blocking']
);
```

### Declarative Net Request Rules
```json
// rules.json
[
  {
    "id": 1,
    "priority": 1000,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||ads.doubleclick.net^",
      "resourceTypes": ["main_frame", "sub_frame", "script", "image"]
    }
  },
  {
    "id": 2,
    "priority": 900,
    "action": {
      "type": "redirect",
      "redirect": { "url": "https://example.com/placeholder.png" }
    },
    "condition": {
      "urlFilter": "||broken-image.com",
      "resourceTypes": ["image"]
    }
  },
  {
    "id": 3,
    "priority": 500,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "Referer", "operation": "set", "value": "https://mysite.com" }
      ]
    },
    "condition": {
      "urlFilter": "https://api.example.com/*",
      "resourceTypes": ["xmlhttprequest"]
    }
  },
  {
    "id": 4,
    "priority": 500,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "Access-Control-Allow-Origin", "operation": "set", "value": "*" }
      ]
    },
    "condition": {
      "urlFilter": "https://api.example.com/*",
      "resourceTypes": ["xmlhttprequest"]
    }
  }
]
```

## Reference
- Official Docs: https://developer.chrome.com/docs/extensions/reference/api/webRequest
- Declarative Net Request: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- MV3 Migration Guide: https://developer.chrome.com/docs/extensions/mv3/intro/

## Common Mistakes
- Using blocking in MV3 service workers — use `declarativeNetRequest` instead
- Missing host permissions — need permissions for URLs you're intercepting
- Confusing `onSendHeaders` (observer) with `onBeforeSendHeaders` (can modify)
- Not handling async operations in non-blocking listeners
- Too broad URL filters — can impact performance significantly
