---
layout: default
title: "Chrome Extension Cors Extension Patterns — Best Practices"
description: "Handle CORS issues in Chrome extensions with background scripts and proxy patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/cors-extension-patterns/"
---

# CORS Handling Patterns in Chrome Extensions

Understanding CORS (Cross-Origin Resource Sharing) in Chrome extensions requires recognizing that different extension contexts have different CORS behaviors.

## Context Overview

### Background Service Worker
- **No CORS restrictions** when `host_permissions` are declared in `manifest.json`
- Can fetch any URL granted by permissions
- Example: Background can directly call external APIs

```javascript
// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchData') {
    fetch(request.url)
      .then(response => response.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});
```

### Popup and Options Pages
- Same behavior as background service worker
- No CORS issues when proper permissions are granted
- Execute within extension's own origin

### Content Scripts (Key Gotcha!)
- **Subject to the host page's CORS policy**
- Running in the context of the web page, not the extension
- Cannot make cross-origin requests directly

```javascript
// content.js - This will FAIL for cross-origin URLs
fetch('https://api.example.com/data') // CORS error!
  .then(res => res.json())
  .catch(err => console.error(err));
```

## Content Script Workaround: Message Background

Relay cross-origin requests through the background script:

```javascript
// content.js
function fetchViaBackground(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'fetchProxy', url },
      response => {
        if (response.success) resolve(response.data);
        else reject(new Error(response.error));
      }
    );
  });
}

// Usage
fetchViaBackground('https://api.example.com/data')
  .then(data => console.log(data));
```

## Extension Origin

The extension has its own origin: `chrome-extension://[EXTENSION_ID]`

- This origin is separate from web pages
- Can access other extension's resources only if exposed
- Has its own storage and cookie contexts

## Cookies and Credentials

For cross-origin requests requiring cookies:

```javascript
// background.js - Using credentials
fetch('https://api.example.com/data', {
  method: 'GET',
  credentials: 'include' // Send cookies with request
});
```

Requires in `manifest.json`:
```json
{
  "host_permissions": [
    "https://api.example.com/*"
  ],
  "permissions": [
    "cookies"
  ]
}
```

## CORS Preflight

- Extensions **skip preflight** for simple requests when `host_permissions` are granted
- No preflight OPTIONS request for GET, POST with simple headers
- Custom headers may still trigger preflight in some cases

## Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `CORS blocked` in content script | Content scripts follow page's CORS | Relay through background |
| `No permission` | Missing host_permissions | Add required domains to manifest |
| Opaque response | Using `no-cors` mode | Cannot read response body |

## Restricted Headers

Cannot set these headers programmatically:
- `Host`
- `Content-Length`
- `Cookie` (auto-handled by browser)
- `Origin` (set automatically)

## Opaque Responses

When using `mode: 'no-cors'`:
- Response type becomes "opaque"
- Cannot read status code, headers, or body
- Only useful for analytics/pings that don't need response

## Testing CORS in Extensions

1. **DevTools Network Tab**: Look for CORS errors in console
2. **Background script test**: Direct fetch should work
3. **Content script test**: Should fail without relay
4. Check extension permissions in `chrome://extensions`

## Host Permissions Best Practices

```json
{
  "host_permissions": [
    "https://api.example.com/*",  // Specific domain
    "https://*.trusted-site.com/*"  // Wildcard for subdomains
  ]
}
```

- Specify minimum necessary origins
- Avoid `<all_urls>` unless required
- Consider dynamic permissions for user-initiated requests

## Cross-Origin Request Patterns

### Background Fetch Proxy
```javascript
// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'proxyFetch') {
    fetch(message.url, message.options)
      .then(r => r.text())
      .then(text => sendResponse({ success: true, data: text }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
```

### Cookie-Aware Fetcher
```javascript
// background.js
async function fetchWithCookies(url, cookieDomain) {
  // Get cookies for domain
  const cookies = await chrome.cookies.get({ url, name: '' });
  
  return fetch(url, {
    credentials: 'include'
  });
}
```

## Related Patterns

- [Cross-Origin Requests](./cross-origin-requests.md)
- [Security Best Practices](../guides/security-best-practices.md)
- [Network Interception](./network-interception.md)
