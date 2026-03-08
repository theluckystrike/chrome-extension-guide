---
layout: default
title: "Chrome Extension Cross Origin Requests — Best Practices"
description: "Handle cross-origin requests in Chrome extensions with CORS workarounds and background fetch patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/cross-origin-requests/"
---

# Cross-Origin Request Patterns for Chrome Extensions

This guide covers making cross-origin HTTP requests from Chrome extensions, including permission configuration, content script limitations, and robust request handling patterns.

## Extension Privileges vs Content Scripts

Chrome extensions have different CORS capabilities depending on where the code runs:

- **Background service worker, popup, and options pages**: Can use `fetch()` or `XMLHttpRequest` to request any URL that matches declared `host_permissions` in manifest.json—no CORS restrictions apply
- **Content scripts**: Are subject to the parent page's CORS policy and cannot make direct cross-origin requests; must relay through the background service worker

## Host Permissions Configuration

Declare required host permissions in your manifest:

```json
{
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": [
    "https://api.example.com/*",
    "https://*.external-service.com/*"
  ]
}
```

Use `<all_urls>` sparingly—it grants access to all websites:

```json
"host_permissions": ["<all_urls>"]
```

### Optional Host Permissions

Request permissions on-demand for extensions in the Chrome Web Store:

```javascript
async function requestHostPermission(host) {
  const granted = await chrome.permissions.request({
    origins: [host]
  });
  return granted;
}
```

## Fetch from Service Worker

The background service worker uses the standard Fetch API with no CORS restrictions when proper host permissions are declared:

```javascript
async function fetchFromBackground(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include' // For cookies
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}
```

## Cookie Handling

Access cookies in cross-origin requests using the `credentials` option:

```javascript
async function fetchWithCookies(url) {
  return fetch(url, {
    credentials: 'include' // Sends cookies for the target origin
  });
}
```

For explicit cookie control, use the Cookies API:

```javascript
async function setCookie(url, name, value) {
  const { origin, pathname } = new URL(url);
  await chrome.cookies.set({
    url: origin,
    name: name,
    value: value,
    path: pathname
  });
}
```

## Error Handling Patterns

Implement robust error handling for network failures, HTTP errors, and timeouts:

```javascript
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    if (!response.ok) {
      throw new HttpError(response.status, await response.text());
    }
    
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

class HttpError extends Error {
  constructor(status, body) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}
```

## Caching Responses

Cache API responses using the Cache API or chrome.storage for offline support:

```javascript
const CACHE_NAME = 'api-cache-v1';

async function fetchWithCache(url, options = {}) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  
  if (cached && isFresh(cached)) {
    return cached.json();
  }
  
  const response = await fetch(url, options);
  
  if (response.ok) {
    cache.put(url, response.clone());
  }
  
  return response.json();
}

function isFresh(response) {
  const date = new Date(response.headers.get('date'));
  return (Date.now() - date.getTime()) < 3600000; // 1 hour
}
```

## Rate Limiting

Implement rate limiting to avoid API bans:

```javascript
const rateLimiter = {
  requests: [],
  maxRequests: 10,
  windowMs: 60000,
  
  async canProceed() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.windowMs - (now - this.requests[0]);
      await new Promise(r => setTimeout(r, waitTime));
      return this.canProceed();
    }
    
    this.requests.push(now);
    return true;
  }
};
```

## Request Queuing

Queue sequential API calls to maintain order:

```javascript
class RequestQueue {
  constructor() {
    this.queue = Promise.resolve();
  }
  
  async enqueue(fn) {
    return this.queue = this.queue.then(fn);
  }
}

const apiQueue = new RequestQueue();

async function queuedFetch(url) {
  return apiQueue.enqueue(() => fetch(url).then(r => r.json()));
}
```

## Authentication Headers

Add Bearer tokens or API keys to requests:

```javascript
async function fetchWithAuth(url, token, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'X-API-Key': API_KEY
    }
  });
}
```

## Content Script Proxy Pattern

Content scripts must relay requests through the background:

```javascript
// Content script
async function fetchFromContentScript(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'FETCH', url }, response => {
      if (response.error) reject(new Error(response.error));
      else resolve(response.data);
    });
  });
}

// Background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH') {
    fetch(message.url)
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Async response
  }
});
```

## See Also

- [Web Request Patterns](/guides/web-request-patterns.md)
- [Network Interception](/patterns/network-interception.md)
- [Security Best Practices](/guides/security-best-practices.md)
