---
layout: default
title: "Chrome Extension Cookies API — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Cookies API Guide

## Overview
- `chrome.cookies` API for reading and modifying browser cookies
- Requires `"cookies"` permission + host permissions for target domains
- Cross-ref: `docs/permissions/cookies.md`

## Reading Cookies
```javascript
// Get a specific cookie
chrome.cookies.get({
  url: 'https://example.com',
  name: 'session_id'
}, (cookie) => {
  if (cookie) {
    console.log('Value:', cookie.value);
    console.log('Domain:', cookie.domain);
    console.log('Expires:', cookie.expirationDate ? new Date(cookie.expirationDate * 1000) : 'Session');
    console.log('Secure:', cookie.secure);
    console.log('HttpOnly:', cookie.httpOnly);
    console.log('SameSite:', cookie.sameSite); // "no_restriction", "lax", "strict", "unspecified"
  }
});

// Get all cookies for a URL
chrome.cookies.getAll({ url: 'https://example.com' }, (cookies) => {
  cookies.forEach(c => console.log(`${c.name}=${c.value}`));
});

// Get all cookies for a domain (including subdomains)
chrome.cookies.getAll({ domain: '.example.com' }, (cookies) => {
  console.log(`Found ${cookies.length} cookies for example.com`);
});

// Filter by specific properties
chrome.cookies.getAll({
  secure: true,
  session: false  // Only persistent cookies
}, (cookies) => {
  console.log('Persistent secure cookies:', cookies.length);
});
```

## Setting Cookies
```javascript
// Set/update a cookie
chrome.cookies.set({
  url: 'https://example.com',
  name: 'my_cookie',
  value: 'hello_world',
  domain: '.example.com',     // Optional: defaults to URL's host
  path: '/',                   // Optional: defaults to '/'
  secure: true,                // Only sent over HTTPS
  httpOnly: false,             // Accessible to JavaScript
  sameSite: 'lax',            // "no_restriction" | "lax" | "strict" | "unspecified"
  expirationDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
}, (cookie) => {
  if (cookie) {
    console.log('Cookie set:', cookie.name);
  } else {
    console.log('Failed to set cookie:', chrome.runtime.lastError);
  }
});

// Set a session cookie (no expirationDate)
chrome.cookies.set({
  url: 'https://example.com',
  name: 'session_flag',
  value: 'active'
});
```

## Removing Cookies
```javascript
// Remove a specific cookie
chrome.cookies.remove({
  url: 'https://example.com',
  name: 'my_cookie'
}, (details) => {
  if (details) {
    console.log('Removed cookie:', details.name, 'from', details.url);
  }
});

// Remove all cookies for a domain
chrome.cookies.getAll({ domain: '.example.com' }, (cookies) => {
  cookies.forEach(cookie => {
    const protocol = cookie.secure ? 'https' : 'http';
    const url = `${protocol}://${cookie.domain}${cookie.path}`;
    chrome.cookies.remove({ url, name: cookie.name });
  });
});
```

## Cookie Events
```javascript
// Monitor cookie changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  const { removed, cookie, cause } = changeInfo;
  console.log(
    removed ? 'Removed:' : 'Set:',
    `${cookie.name} (${cookie.domain})`,
    'Cause:', cause
  );
  // cause: "evicted" | "expired" | "explicit" | "expired_overwrite" | "overwrite"
});
```

## Cookie Stores (Incognito)
```javascript
// List all cookie stores (normal + incognito)
chrome.cookies.getAllCookieStores((stores) => {
  stores.forEach(store => {
    console.log('Store ID:', store.id, 'Tab IDs:', store.tabIds);
  });
});

// Get cookies from specific store
chrome.cookies.getAll({
  storeId: '1'  // Incognito store
}, (cookies) => {
  console.log('Incognito cookies:', cookies.length);
});
```

## Manifest Configuration
```json
{
  "permissions": ["cookies"],
  "host_permissions": [
    "https://*.example.com/*",
    "https://*.google.com/*"
  ]
}
```
- `"cookies"` permission alone is not enough
- Must also have host permissions for the domains you want to access
- `"<all_urls>"` grants access to all domains' cookies

## Tracking Cookie Changes
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  cookieLog: 'string',        // JSON: Array<{ domain, name, action, time }>
  monitoredDomains: 'string'  // JSON: string[]
}), 'local');

chrome.cookies.onChanged.addListener(async (changeInfo) => {
  const raw = await storage.get('monitoredDomains');
  const domains = raw ? JSON.parse(raw) : [];

  if (domains.some(d => changeInfo.cookie.domain.includes(d))) {
    const logRaw = await storage.get('cookieLog');
    const log = logRaw ? JSON.parse(logRaw) : [];
    log.unshift({
      domain: changeInfo.cookie.domain,
      name: changeInfo.cookie.name,
      action: changeInfo.removed ? 'removed' : 'set',
      cause: changeInfo.cause,
      time: Date.now()
    });
    await storage.set('cookieLog', JSON.stringify(log.slice(0, 500)));
  }
});
```

## Common Patterns
- **Session manager**: save/restore cookies for quick account switching
- **Privacy tool**: auto-delete cookies for specific sites on tab close
- **Auth detector**: check if user is logged into a site before showing UI
- **Cookie editor**: DevTools panel for viewing/editing all cookies

## Common Mistakes
- Missing host permissions — `cookies` permission alone won't work
- Not URL-encoding cookie values with special characters
- Forgetting that `domain` starts with `.` for domain cookies
- Assuming cookies persist in incognito (separate store, cleared on close)
- Setting `httpOnly: true` then trying to read the cookie with `document.cookie` in content scripts
