---
layout: default
title: "Chrome Cookies API Complete Reference"
description: "The Chrome Cookies API provides complete CRUD operations for querying, setting, and modifying browser cookies with domain and path filtering."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/cookies-api/"
---

# chrome.cookies API Reference

The `chrome.cookies` API provides full CRUD operations for querying and modifying browser cookies. Requires `"cookies"` permission plus host permissions.

## Manifest Declaration {#manifest-declaration}

```json
{
  "permissions": ["cookies"],
  "host_permissions": ["https://*.example.com/*"]
}
```

## API Methods {#api-methods}

### chrome.cookies.get {#chromecookiesget}

Retrieves a single cookie by name and URL.

```typescript
chrome.cookies.get({ url: string, name: string, storeId?: string }, callback): void;
```

### chrome.cookies.getAll {#chromecookiesgetall}

Retrieves all cookies matching filters.

```typescript
chrome.cookies.getAll({ url?: string, domain?: string, name?: string, path?: string, secure?: boolean, session?: boolean, storeId?: string }, callback): void;
```

```javascript
chrome.cookies.getAll({ domain: ".example.com" }, (cookies) => {
  cookies.forEach((c) => console.log(`${c.name} = ${c.value}`));
});
```

### chrome.cookies.set {#chromecookiesset}

Sets or updates a cookie. Parameters: url (required), name, value, domain, path, secure, httpOnly, sameSite ("no_restriction" | "lax" | "strict" | "unspecified"), expirationDate, storeId.

```typescript
chrome.cookies.set({ url: string, name?: string, value?: string, domain?: string, path?: string, secure?: boolean, httpOnly?: boolean, sameSite?: string, expirationDate?: number, storeId?: string }, callback): void;
```

```javascript
chrome.cookies.set({
  url: "https://example.com",
  name: "user_token",
  value: "abc123",
  domain: ".example.com",
  secure: true,
  httpOnly: true,
  sameSite: "lax"
});
```

### chrome.cookies.remove {#chromecookiesremove}

Removes a cookie by name and URL.

```typescript
chrome.cookies.remove({ url: string, name: string, storeId?: string }, callback): void;
```

### chrome.cookies.getAllCookieStores {#chromecookiesgetallcookiestores}

Returns all available cookie stores. IDs: "0" (default), "1" (incognito).

```typescript
chrome.cookies.getAllCookieStores(callback): void;
```

## Cookie Object {#cookie-object}

Properties: name, value, domain, hostOnly, path, secure, httpOnly, sameSite, session, expirationDate, storeId.

## Events {#events}

### chrome.cookies.onChanged {#chromecookiesonchanged}

Fires when a cookie is set or removed. Cause values: "evicted" | "expired" | "explicit" | "expired_overwrite" | "overwrite".

```typescript
chrome.cookies.onChanged.addListener((changeInfo: { removed: boolean; cookie: Cookie; cause: string }) => void): void;
```

```javascript
chrome.cookies.onChanged.addListener((changeInfo) => {
  console.log(`Cookie ${changeInfo.cookie.name} was ${changeInfo.removed ? "removed" : "set"}`);
});
```

## Code Examples {#code-examples}

### Get All Cookies for a Domain {#get-all-cookies-for-a-domain}

```javascript
chrome.cookies.getAll({ domain: "example.com" }, (cookies) => {
  cookies.forEach((c) => console.log(c.name, c.value));
});
```

### Set a Cookie {#set-a-cookie}

```javascript
const expiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
chrome.cookies.set({
  url: "https://example.com",
  name: "auth_token",
  value: token,
  domain: ".example.com",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
  expirationDate: expiry
});
```

### Delete All Cookies for a Site {#delete-all-cookies-for-a-site}

```javascript
chrome.cookies.getAll({ domain: domain }, (cookies) => {
  cookies.forEach((c) => {
    chrome.cookies.remove({ url: `https://${c.domain}${c.path}`, name: c.name });
  });
});
```

### Monitor Cookie Changes {#monitor-cookie-changes}

```javascript
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.name === "auth_token") {
    console.log(changeInfo.removed ? "Logged out" : "Logged in");
  }
});
```

## Cross-references {#cross-references}

- [Cookie Permissions](../permissions/cookies.md)
- [Cookies API Guide](../guides/cookies-api.md)
- [Session Management Patterns](../patterns/cookies-sessions.md)

## Frequently Asked Questions

### How do I read cookies for a specific domain?
Use chrome.cookies.getAll() with a "domain" parameter to filter cookies by domain.

### Can I set cookies from my extension?
Yes, use chrome.cookies.set() to create or update cookies. Note that HttpOnly cookies cannot be set.
