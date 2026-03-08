---
layout: default
title: "Chrome Extension Cookies API — How to Read, Set, and Delete Browser Cookies"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/cookies-api/"
---
# Chrome Extension Cookies API — How to Read, Set, and Delete Browser Cookies

## Overview {#overview}

The Chrome Extensions Cookies API (`chrome.cookies`) provides powerful capabilities for reading, creating, modifying, and deleting browser cookies from your extension. This API is essential for building authentication managers, session handlers, privacy tools, and cross-site tracking utilities. However, working with cookies in extensions requires understanding several important concepts including permissions, cookie attributes, and modern browser privacy features like partitioned cookies.

To use the Cookies API, your extension manifest must declare the `"cookies"` permission alongside host permissions for the specific domains you want to access. Without proper host permissions, the API will fail silently or return empty results.

## Required Permissions {#required-permissions}

```json
{
  "permissions": ["cookies"],
  "host_permissions": [
    "https://*.example.com/*",
    "https://google.com/*"
  ]
}
```

The `"cookies"` permission alone is insufficient—you must also include host permissions for each domain whose cookies you intend to read or modify. This is a security measure to prevent extensions from accessing cookies without explicit user consent through host permissions. For debugging purposes, you can use `"<all_urls>"` to grant access to all websites, though this triggers additional review during Chrome Web Store submission.

## Reading Cookies {#reading-cookies}

The `chrome.cookies.get()` method retrieves a single cookie by name and URL, while `chrome.cookies.getAll()` allows retrieving multiple cookies based on filter criteria. Understanding the difference between these methods is crucial for building efficient cookie management features.

```javascript
// Get a specific cookie by name and URL
chrome.cookies.get({
  url: 'https://example.com',
  name: 'session_id'
}, (cookie) => {
  if (cookie) {
    console.log('Cookie Value:', cookie.value);
    console.log('Domain:', cookie.domain);
    console.log('Path:', cookie.path);
    console.log('Expires:', cookie.expirationDate 
      ? new Date(cookie.expirationDate * 1000) 
      : 'Session cookie');
    console.log('Secure:', cookie.secure);
    console.log('HttpOnly:', cookie.httpOnly);
    console.log('SameSite:', cookie.sameSite);
    console.log('Partitioned:', cookie.partitioned);
  }
});
```

When retrieving cookies, remember that the URL must match the cookie's domain and path. For cookies set on subdomains, you may need to adjust the URL accordingly. The `getAll()` method provides more flexibility for bulk operations:

```javascript
// Get all cookies for a specific domain (includes subdomains)
chrome.cookies.getAll({ domain: '.example.com' }, (cookies) => {
  console.log(`Found ${cookies.length} cookies`);
  cookies.forEach(c => console.log(`${c.name}=${c.value}`));
});

// Filter by specific properties
chrome.cookies.getAll({
  secure: true,
  session: false  // Only persistent cookies
}, (cookies) => {
  console.log(`Persistent secure cookies: ${cookies.length}`);
});

// Get cookies from a specific cookie store (including incognito)
chrome.cookies.getAll({
  storeId: '0'  // Default store
}, (cookies) => {
  console.log('Default profile cookies:', cookies.length);
});
```

## Setting Cookies {#setting-cookies}

Creating and updating cookies uses the `chrome.cookies.set()` method with an options object containing the cookie's attributes. Modern cookies support several important attributes that control their behavior and security.

```javascript
// Set a cookie with full options
chrome.cookies.set({
  url: 'https://example.com',
  name: 'user_preference',
  value: 'dark_mode',
  domain: '.example.com',     // Leading dot for domain-wide cookies
  path: '/',                   // Defaults to '/'
  secure: true,                // Only sent over HTTPS connections
  httpOnly: false,             // If true, not accessible via document.cookie
  sameSite: 'lax',            // "no_restriction" | "lax" | "strict" | "unspecified"
  expirationDate: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
  partitioned: false          // Enable partitioned cookies for cross-site isolation
}, (cookie) => {
  if (cookie) {
    console.log('Cookie created:', cookie.name);
  } else {
    console.error('Failed to set cookie:', chrome.runtime.lastError?.message);
  }
});

// Set a session cookie (expires when browser closes)
chrome.cookies.set({
  url: 'https://example.com',
  name: 'session_token',
  value: 'abc123xyz'
});
```

The `sameSite` attribute is particularly important for modern web development. The `no_restriction` value (equivalent to "none" in JavaScript) requires the `secure` flag to be true. The `lax` value provides reasonable security while allowing cookies on normal navigation, while `strict` blocks cookies in all cross-site contexts.

## Removing Cookies {#removing-cookies}

Deleting cookies requires matching the exact URL, name, and store ID used when the cookie was set. The `chrome.cookies.remove()` method accepts these parameters and returns details about the removed cookie.

```javascript
// Remove a specific cookie
chrome.cookies.remove({
  url: 'https://example.com',
  name: 'user_preference'
}, (details) => {
  if (details) {
    console.log('Removed:', details.name, 'from', details.url);
  }
});

// Batch remove all cookies for a domain
function clearDomainCookies(domain) {
  chrome.cookies.getAll({ domain: domain }, (cookies) => {
    cookies.forEach(cookie => {
      const protocol = cookie.secure ? 'https' : 'http';
      const url = `${protocol}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
      chrome.cookies.remove({ url: url, name: cookie.name });
    });
  });
}
```

## Cookie Change Events {#cookie-change-events}

The `chrome.cookies.onChanged` event listener allows your extension to monitor all cookie modifications in real-time. This is invaluable for building session monitors, privacy dashboards, and debugging tools.

```javascript
chrome.cookies.onChanged.addListener((changeInfo) => {
  const { removed, cookie, cause } = changeInfo;
  
  console.log(removed ? 'Cookie Removed:' : 'Cookie Set:');
  console.log(`  Name: ${cookie.name}`);
  console.log(`  Domain: ${cookie.domain}`);
  console.log(`  Cause: ${cause}`);
  console.log(`  Partitioned: ${cookie.partitioned}`);
  
  // cause values: "evicted", "expired", "explicit", 
  //                "expired_overwrite", "overwrite", "chrome_extension"
});
```

The event fires for both explicit user actions and automatic browser operations. The `cause` property helps distinguish between user-initiated changes and automatic cookie management.

## Partitioned Cookies {#partitioned-cookies}

Chrome's Privacy Sandbox introduces partitioned cookies, which isolate cookies based on the top-level site to prevent cross-site tracking while preserving legitimate use cases. Extensions must handle partitioned cookies correctly to work with modern browser behavior.

```javascript
// Set a partitioned cookie
chrome.cookies.set({
  url: 'https://subdomain.example.com',
  name: 'partitioned_session',
  value: 'xyz789',
  partitioned: true  // Enable partitioning
}, (cookie) => {
  if (cookie?.partitioned) {
    console.log('Partitioned cookie created');
    // This cookie is tied to the top-level site
  }
});

// Reading partitioned cookies
chrome.cookies.getAll({ partitioned: true }, (cookies) => {
  console.log('Partitioned cookies:', cookies.length);
  cookies.forEach(c => {
    console.log(`${c.name}: ${c.value} (partitioned: ${c.partitioned})`);
  });
});
```

When `partitioned: true` is set, the cookie is stored with a partition key based on the top-level site URL. This means the same cookie name can exist multiple times for the same domain, each associated with different top-level sites. Extensions must account for this when managing cookies across different contexts.

## Cookie Stores and Incognito Mode {#cookie-stores-incognito}

Chrome manages cookies in separate stores for regular and incognito profiles. Extensions can access both but must explicitly handle each store.

```javascript
// List all cookie stores
chrome.cookies.getAllCookieStores((stores) => {
  stores.forEach(store => {
    console.log(`Store ID: ${store.id}`);
    console.log(`  Tab IDs: ${store.tabIds?.join(', ') || 'none'}`);
  });
});

// Access incognito cookies (requires permission)
chrome.cookies.getAll({
  storeId: '1'  // Typically '1' is incognito store
}, (cookies) => {
  console.log('Incognito cookies:', cookies.length);
});
```

Note that incognito cookies are cleared when the incognito window closes, and extensions cannot create persistent cookies in the incognito store unless explicitly authorized.

## Privacy Considerations {#privacy-considerations}

When building extension cookie functionality, you must consider user privacy implications. Extensions have elevated access to cookies compared to regular web pages, which brings responsibilities:

- **Minimize cookie access**: Only request host permissions for domains truly necessary for your extension's functionality
- **Handle sensitive data carefully**: Authentication cookies, session tokens, and personal data require secure handling
- **Respect user preferences**: Many users enable privacy protections that limit cookie functionality
- **Consider CHIPS (Cookies Having Independent Partitioned State)**: Newer cookie attributes may affect your extension's behavior

```javascript
// Check cookie security properties
chrome.cookies.get({ url: 'https://example.com', name: 'auth' }, (cookie) => {
  if (cookie) {
    const securityReport = {
      isSecure: cookie.secure,
      isHttpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      isPartitioned: cookie.partitioned,
      expiration: cookie.expirationDate 
        ? new Date(cookie.expirationDate * 1000).toISOString() 
        : 'session'
    };
    console.log('Security assessment:', securityReport);
  }
});
```

## Common Mistakes to Avoid {#common-mistakes}

Several pitfalls trip up developers working with the Cookies API:

- **Missing host permissions**: The `"cookies"` permission alone doesn't grant access to any cookies
- **URL mismatch**: Cookie URLs must exactly match the domain and path
- **Forgetting the leading dot**: Domain cookies require a leading dot (`.example.com`)
- **Ignoring SameSite requirements**: `SameSite=none` requires `Secure=true`
- **Assuming incognito persistence**: Incognito cookies don't persist across sessions
- **Setting HttpOnly then reading via content scripts**: HttpOnly cookies are inaccessible to JavaScript

## Related Articles {#related-articles}

- [Cookies API Reference](../api-reference/cookies-api.md)
- [Chrome Permissions Guide](../guides/permissions.md)
- [Privacy Best Practices for Extensions](../guides/privacy-extensions.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
