---
layout: default
title: "browsingData Permission"
description: "Remove browsing data (cache, cookies, history, downloads, passwords, localStorage, etc.) programmat..."
permalink: /permissions/browsingData/
category: permissions
order: 4
canonical_url: "https://bestchromeextensions.com/permissions/browsingData/"
last_modified_at: 2026-01-15
---

browsingData Permission

Overview {#overview}

- Permission string: `"browsingData"`
- API exposed: `chrome.browsingData`
- Purpose: Remove browsing data (cache, cookies, history, downloads, passwords, localStorage, etc.) programmatically

This permission allows extensions to clear user browsing data without requiring the user to manually navigate to Chrome's Clear Browsing Data dialog. It only provides removal capabilities. reading data requires separate permissions like `history`, `cookies`, or `downloads`.

Manifest Declaration {#manifest-declaration}

```json
{
  "permissions": ["browsingData"]
}
```

User Warning: None. this permission does not trigger an install-time warning.

API Methods {#api-methods}

General Removal {#general-removal}

```typescript
chrome.browsingData.remove(
  options: RemovalOptions,
  dataToRemove: DataToRemove
): Promise<void>
```

- `options.since`. Timestamp in ms since epoch. Only clears data created after this time.
- `dataToRemove`. Object with boolean flags for each data type.

```typescript
// Clear all data from the last hour
await chrome.browsingData.remove(
  { since: Date.now() - 3600000 },
  { cache: true, cookies: true, history: true }
);
```

Specific Removal Methods {#specific-removal-methods}

```typescript
chrome.browsingData.removeCache(options)
chrome.browsingData.removeCookies(options)
chrome.browsingData.removeDownloads(options)
chrome.browsingData.removeFormData(options)
chrome.browsingData.removeHistory(options)
chrome.browsingData.removeLocalStorage(options)
chrome.browsingData.removePasswords(options)
```

Settings {#settings}

```typescript
chrome.browsingData.settings(): Promise<Settings>
```

Returns `{ options, dataToRemove, dataRemovalPermitted }`. the user's Clear Browsing Data preferences and what the extension is permitted to clear.

Data Types {#data-types}

| Property | Description |
|----------|-------------|
| `appcache` | Application caches |
| `cache` | HTTP cache |
| `cacheStorage` | Service Worker caches |
| `cookies` | Cookies |
| `downloads` | Download history |
| `fileSystems` | File system API data |
| `formData` | Autofill form data |
| `history` | Browsing history |
| `indexedDB` | IndexedDB data |
| `localStorage` | localStorage data |
| `passwords` | Saved passwords |
| `serviceWorkers` | Service worker registrations |
| `webSQL` | WebSQL data |

Options Object {#options-object}

```typescript
interface RemovalOptions {
  since?: number;
  originTypes?: {
    unprotectedWeb?: boolean;  // default: true
    protectedWeb?: boolean;
    extension?: boolean;       // default: false
  };
}
```

Use Cases {#use-cases}

- Privacy/cleanup tools: One-click "clear all" functionality
- Selective clearing: Clear only cookies and cache for a specific time range
- Privacy mode toggle: Automatically clear data when extension is disabled
- Development tools: Clear site data during testing
- "Panic button" features: Quickly erase browsing data with a shortcut

Code Examples {#code-examples}

Clear All Data from Last Hour {#clear-all-data-from-last-hour}

```typescript
async function clearLastHour() {
  await chrome.browsingData.remove(
    { since: Date.now() - 3600000 },
    {
      cache: true, cookies: true, history: true,
      localStorage: true, formData: true, downloads: true,
      passwords: true, indexedDB: true, webSQL: true,
      fileSystems: true, serviceWorkers: true,
      cacheStorage: true, appcache: true
    }
  );
}
```

Clear Only Cookies and Cache {#clear-only-cookies-and-cache}

```typescript
async function clearCookiesAndCache() {
  await chrome.browsingData.remove(
    { since: 0 },
    { cookies: true, cache: true }
  );
}
```

Check What User Permits to Clear {#check-what-user-permits-to-clear}

```typescript
async function checkPermissions() {
  const settings = await chrome.browsingData.settings();
  console.log('Allowed to remove:', settings.dataRemovalPermitted);
  return settings.dataRemovalPermitted;
}
```

Cross-References {#cross-references}

- [cookies.md](./cookies.md). Read/write cookies (browsingData only removes them)
- [history.md](./history.md). Read browsing history
- [downloads.md](./downloads.md). Manage download history
- [patterns/privacy-api.md](../patterns/privacy-api.md). Privacy-focused API patterns

Frequently Asked Questions

How do I clear browsing data from a Chrome extension?
Use the chrome.browsingData API to clear various types of browsing data including cookies, cache, history, downloads, and local storage. Users must grant permission via the browsingData settings.

Can I selectively clear only cookies?
Yes, specify the dataTypes parameter with { "cookies": true } to clear only cookies while preserving other data.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
