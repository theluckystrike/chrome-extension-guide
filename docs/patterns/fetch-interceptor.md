---
layout: default
title: "Chrome Extension Fetch Interceptor. Best Practices"
description: "Intercept and modify fetch requests in extensions."
canonical_url: "https://bestchromeextensions.com/patterns/fetch-interceptor/"
---

Fetch/XHR Interception Patterns

This document covers patterns for intercepting and modifying network requests in Chrome extensions using MV3.

Overview {#overview}

Chrome extensions can intercept, modify, block, or redirect network requests through several mechanisms:

- declarativeNetRequest: Declarative rules for blocking/redirecting (recommended for MV3)
- chrome.webRequest: Read-only observation (limited in MV3)
- Content script injection: Programmatic interception via monkey-patching

declarativeNetRequest (MV3) {#declarativenetrequest-mv3}

The `declarativeNetRequest` API is the MV3 approach for modifying network requests without requiring host permissions.

Static Rules {#static-rules}

Static rules are defined in the manifest and loaded at extension startup:

```json
{
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules/block-ads.json"
    }]
  }
}
```

Dynamic Rules {#dynamic-rules}

Dynamic rules can be added at runtime:

```javascript
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "*.ads.example.com", resourceTypes: ["script"] }
  }]
});
```

Blocking Patterns {#blocking-patterns}

Block specific requests using URL filters:

```javascript
{
  "id": 1,
  "priority": 1,
  "action": { type: "block" },
  "condition": {
    "urlFilter": "tracking-pixel",
    "resourceTypes": ["image", "script"]
  }
}
```

Redirect Patterns {#redirect-patterns}

Redirect requests to alternative URLs:

```javascript
{
  "id": 2,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": { "url": "https://cdn.example.com/image.png" }
  },
  "condition": {
    "urlFilter": "old-cdn.example.com",
    "resourceTypes": ["image"]
  }
}
```

CDN Switching {#cdn-switching}

Rewrite URLs to use different CDNs:

```javascript
{
  "id": 3,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": { "transform": { "host": "fast-cdn.com" } }
  },
  "condition": {
    "urlFilter": "slow-cdn.com",
    "resourceTypes": ["script"]
  }
}
```

Modifying Headers {#modifying-headers}

Use `modifyHeaders` to add, remove, or set request/response headers:

```javascript
{
  "id": 4,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [
      { "header": "User-Agent", "operation": "set", "value": "MyExtension/1.0" }
    ]
  },
  "condition": {
    "urlFilter": "api.example.com",
    "resourceTypes": ["xmlhttprequest"]
  }
}
```

Programmatic Interception (Content Scripts) {#programmatic-interception-content-scripts}

For intercepting requests within page context, monkey-patch `fetch` and `XMLHttpRequest`:

```javascript
// Inject via content script with world: "MAIN"
const script = document.createElement('script');
script.textContent = `
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [resource, options = {}] = args;
    
    // Add custom headers
    options.headers = {
      ...options.headers,
      'X-Custom-Header': 'value'
    };
    
    // Log request
    console.log('Intercepted fetch:', resource);
    
    return originalFetch(resource, options);
  };
`;
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: "MAIN",
  func: () => document.documentElement.appendChild(script)
});
```

Observing Requests (webRequest) {#observing-requests-webrequest}

Use `chrome.webRequest` for read-only observation (non-blocking):

```javascript
chrome.webRequest.onCompleted.addListener(
  (details) => {
    console.log('Request completed:', details.url, details.statusCode);
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log('Request started:', details.url);
  },
  { urls: ["<all_urls>"] }
);
```

In MV3, blocking via `webRequest` (`webRequestBlocking`) is no longer available for most extensions. Only policy-installed extensions retain access. Use `declarativeNetRequest` instead for request blocking and modification.

Security Considerations {#security-considerations}

- Don't intercept sensitive requests: Avoid modifying requests to authentication endpoints or payment processors
- Handle credentials carefully: Ensure user credentials aren't inadvertently exposed
- Validate URLs: Always validate redirect URLs to prevent open redirect vulnerabilities
- Limit scope: Only intercept requests necessary for your extension's functionality
- Use HTTPS: When redirecting, prefer HTTPS URLs

Reading Response Data {#reading-response-data}

The `declarativeNetRequest` API cannot read response bodies. For content inspection:

1. Use content script injection with monkey-patching
2. Intercept `fetch` or `XMLHttpRequest` to access response data
3. Consider using `chrome.debugger` for deeper inspection (requires user consent)

Cross-References {#cross-references}

- [declarativeNetRequest API Reference](../api-reference/declarative-net-request-api.md)
- [Network Interception Patterns](./network-interception.md)
- [Web Request Patterns Guide](../guides/web-request-patterns.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
