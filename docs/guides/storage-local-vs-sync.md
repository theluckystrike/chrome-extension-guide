---
layout: default
title: "chrome.storage.local vs sync — Which Should You Use?"
description: "Complete comparison of chrome.storage.local vs chrome.storage.sync for Chrome extensions. Learn when to use each storage type, quota limits, synchronization behavior, and best practices."
canonical_url: "https://bestchromeextensions.com/guides/storage-local-vs-sync/"
---

# chrome.storage.local vs sync — Which Should You Use?

## Introduction

Choosing the right storage API is crucial for Chrome extension performance and user experience. The `chrome.storage` API offers two distinct options: `local` and `sync`. Each serves different use cases and has unique characteristics around storage limits, sync behavior, and performance. This guide helps you decide which storage type is right for your extension.

## Overview

The `chrome.storage` API was designed specifically for extensions, providing better capabilities than `localStorage` or cookies. It offers automatic JSON serialization, event-driven change listeners, and native integration with Chrome's sync infrastructure.

```javascript
// Local storage
chrome.storage.local.set({ key: 'value' });
chrome.storage.local.get(['key'], (result) => {});

// Sync storage
chrome.storage.sync.set({ key: 'value' });
chrome.storage.sync.get(['key'], (result) => {});
```

## Storage Quotas Comparison

| Aspect | chrome.storage.local | chrome.storage.sync |
|--------|---------------------|---------------------|
| **Storage Limit** | 10 MB (unlimited for unpacked) | 100 KB (sync'd), more with quota |
| **Per-Key Limit** | No strict limit | ~8 KB per key recommended |
| **Items Limit** | ~ millions | ~512 items recommended |
| **User Sync** | No | Yes, across devices |

## Local Storage

### Characteristics

`chrome.storage.local` stores data exclusively on the current device. Data remains available regardless of whether the user is signed into Chrome or has sync enabled.

```javascript
// Store user preferences
chrome.storage.local.set({
  theme: 'dark',
  fontSize: 14,
  recentProjects: ['project1', 'project2', 'project3']
});

// Retrieve with defaults
chrome.storage.local.get({
  theme: 'light',
  fontSize: 12
}, (result) => {
  console.log(result.theme, result.fontSize);
});
```

### Best Use Cases

Local storage is ideal for:
- **Large data caches**: Store significant amounts of data without worrying about quota limits
- **Device-specific settings**: Preferences that should not sync across devices
- **Offline-first data**: Information that must work without network connectivity
- **Temporary data**: Cached API responses, session data, or computed results

### Pros and Cons

| Pros | Cons |
|------|------|
| Large storage capacity (10 MB+) | Data stays on single device |
| No sync-related delays | Users lose data on profile switch |
| Faster for large datasets | No cross-device continuity |
| Works fully offline | Cannot share preferences |

## Sync Storage

### Characteristics

`chrome.storage.sync` automatically synchronizes data across all Chrome instances where the user is signed in. Changes propagate to all devices when online.

```javascript
// Sync user preferences across devices
chrome.storage.sync.set({
  preferredLanguage: 'en',
  notificationsEnabled: true,
  bookmarkFolders: ['work', 'personal']
});

// Listen for changes from other devices
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.preferredLanguage) {
    console.log('Language changed:', changes.preferredLanguage.newValue);
  }
});
```

### Best Use Cases

Sync storage is ideal for:
- **User preferences**: Settings users expect to have on any device
- **Cross-device state**: Data that should persist across installations
- **Lightweight settings**: Small amounts of frequently-changed data
- **Account-related data**: User configurations tied to their account

### Pros and Cons

| Pros | Cons |
|------|------|
| Automatic cross-device sync | Limited storage capacity (100 KB) |
| Seamless user experience | Potential sync delays |
| Preserves data on device switch | Requires Chrome sign-in |
| Real-time change notifications | Slower than local for large data |

## Performance Comparison

### Write Performance

```javascript
// Benchmark local storage
console.time('local');
chrome.storage.local.set({ data: largeObject }, () => {
  console.timeEnd('local');
});

// Benchmark sync storage
console.time('sync');
chrome.storage.sync.set({ data: smallObject }, () => {
  console.timeEnd('sync');
});
```

Local storage is typically faster for writes because:
- No network synchronization overhead
- Direct write to local database
- No conflict resolution processing

### Read Performance

Both storage types have similar read speeds when data is cached. First reads may be slightly slower for sync storage due to potential network fetching.

## Data Conflict Resolution

### Sync Conflicts

When the same key is modified on multiple devices while offline, Chrome uses a last-write-wins strategy:

```javascript
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    // Handle potential conflicts
    Object.keys(changes).forEach((key) => {
      const change = changes[key];
      console.log(`${key} changed from ${change.oldValue} to ${change.newValue}`);
    });
  }
});
```

For critical data, implement your own conflict resolution:

```javascript
async function setWithConflictCheck(key, newValue) {
  const { [key]: currentValue } = await chrome.storage.sync.get(key);
  
  if (currentValue && currentValue.lastModified > newValue.lastModified) {
    // Keep current value, don't overwrite
    return;
  }
  
  await chrome.storage.sync.set({
    [key]: { ...newValue, lastModified: Date.now() }
  });
}
```

## Storage Encryption

### Sensitive Data

For sensitive information, both local and sync storage are encrypted at rest by Chrome OS and Windows (when using DPAPI). For additional security:

```javascript
// For highly sensitive data, consider encrypting before storage
import { encrypt, decrypt } from './crypto-utils.js';

async function secureStore(key, value) {
  const encrypted = await encrypt(JSON.stringify(value));
  await chrome.storage.local.set({ [key]: encrypted });
}

async function secureRetrieve(key) {
  const { [key]: encrypted } = await chrome.storage.local.get(key);
  if (!encrypted) return null;
  return JSON.parse(await decrypt(encrypted));
}
```

## Migration Between Storage Types

### Moving Data

If your requirements change, you can migrate data between storage types:

```javascript
async function migrateToSync() {
  const data = await chrome.storage.local.get('userPreferences');
  
  if (data.userPreferences) {
    await chrome.storage.sync.set({ userPreferences: data.userPreferences });
    await chrome.storage.local.remove('userPreferences');
  }
}
```

### Bulk Operations

Both storage types support bulk operations:

```javascript
// Set multiple values
chrome.storage.local.set({
  cache: largeCache,
  timestamp: Date.now()
});

// Get multiple values
chrome.storage.local.get(['cache', 'timestamp'], (result) => {});
```

## Decision Guide

Use this flowchart to decide:

1. **Need cross-device sync?** → Use `chrome.storage.sync`
2. **Data > 100 KB?** → Use `chrome.storage.local`
3. **Device-specific data?** → Use `chrome.storage.local`
4. **Offline-critical data?** → Use `chrome.storage.local`
5. **User preferences/settings?** → Use `chrome.storage.sync`

## Conclusion

Choose `chrome.storage.local` for large datasets, device-specific data, and performance-critical operations. Choose `chrome.storage.sync` for user preferences, cross-device continuity, and small configuration data. For many extensions, using both types together provides the optimal balance of capacity, sync capabilities, and performance.
