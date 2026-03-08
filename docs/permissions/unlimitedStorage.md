---
title: "unlimitedStorage Permission"
description: "Removes the quota limits on `chrome.storage.local`, IndexedDB, Cache API, and other client-side storage used by the extension. Without it, `chrome.storage.local` is limited to ~10 MB."
permalink: /permissions/unlimitedStorage/
category: permissions
order: 47
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/unlimitedStorage/"
---

# unlimitedStorage Permission

## What It Grants {#what-it-grants}
Removes the quota limits on `chrome.storage.local`, IndexedDB, Cache API, and other client-side storage used by the extension. Without it, `chrome.storage.local` is limited to ~10 MB.

## Manifest {#manifest}
```json
{
  "permissions": ["unlimitedStorage"]
}
```

## User Warning {#user-warning}
None — this permission does not trigger a warning at install time.

## What It Affects {#what-it-affects}
| Storage Type | Without Permission | With Permission |
|---|---|---|
| `chrome.storage.local` | ~10 MB | Unlimited |
| `chrome.storage.sync` | 100 KB (always) | 100 KB (unchanged) |
| `chrome.storage.session` | ~10 MB | Unlimited |
| IndexedDB | ~limited | Unlimited |
| Cache API (Service Worker) | ~limited | Unlimited |
| Web SQL (deprecated) | ~limited | Unlimited |

**Note:** `chrome.storage.sync` is always limited to 100 KB total / 8 KB per item regardless of this permission.

## When You Need It {#when-you-need-it}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  cachedArticles: 'string',     // Could be many MB of cached content
  imageData: 'string',          // Base64 encoded images
  activityLog: 'string',        // Growing log data
  offlineData: 'string'         // Offline-first app data
});
const storage = createStorage(schema, 'local');

// Without unlimitedStorage, writing >10 MB would fail
await storage.set('cachedArticles', largeJsonString);
```

## Checking Storage Usage {#checking-storage-usage}

## How to Check unlimitedStorage Usage
```typescript
// Check how much storage is in use
const bytesInUse = await chrome.storage.local.getBytesInUse(null);
console.log(`Using ${(bytesInUse / 1024 / 1024).toFixed(2)} MB`);

// Check specific keys
const keyBytes = await chrome.storage.local.getBytesInUse(['cachedArticles']);
console.log(`cachedArticles: ${(keyBytes / 1024).toFixed(0)} KB`);
```

## Storage Management Pattern {#storage-management-pattern}
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  GET_STORAGE_INFO: { request: {}; response: { totalMB: number; keys: Record<string, number> } };
  CLEANUP_STORAGE: { request: { maxMB: number }; response: { freedMB: number } };
};
const m = createMessenger<Messages>();

m.onMessage('GET_STORAGE_INFO', async () => {
  const total = await chrome.storage.local.getBytesInUse(null);
  const all = await chrome.storage.local.get(null);
  const keys: Record<string, number> = {};
  for (const key of Object.keys(all)) {
    keys[key] = await chrome.storage.local.getBytesInUse(key);
  }
  return { totalMB: total / (1024 * 1024), keys };
});

m.onMessage('CLEANUP_STORAGE', async ({ maxMB }) => {
  const before = await chrome.storage.local.getBytesInUse(null);
  // Remove old cached data, logs, etc.
  const all = await chrome.storage.local.get(null);
  const staleKeys = Object.keys(all).filter(k => k.startsWith('cache_'));
  if (staleKeys.length > 0) {
    await chrome.storage.local.remove(staleKeys);
  }
  const after = await chrome.storage.local.getBytesInUse(null);
  return { freedMB: (before - after) / (1024 * 1024) };
});
```

## IndexedDB with Unlimited Storage {#indexeddb-with-unlimited-storage}
```typescript
// IndexedDB also benefits from unlimitedStorage
const db = await new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('myExtensionDB', 1);
  request.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    db.createObjectStore('files', { keyPath: 'id' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// Store large files without quota errors
const tx = db.transaction('files', 'readwrite');
tx.objectStore('files').put({ id: 'large-file', data: largeBlob });
```

## Common Use Cases {#common-use-cases}
- Offline-first extensions (cache large datasets)
- Image/media storage extensions
- Activity/history logging
- Data export/import tools
- Local database extensions
- Cache-heavy extensions (web scrapers, archivers)

## When NOT to Use {#when-not-to-use}
- If your data fits in 10 MB — don't request unnecessary permissions
- For synced data — `chrome.storage.sync` is always 100 KB regardless
- Consider cleanup strategies even with unlimited storage

## Best Practices {#best-practices}
- Implement storage cleanup/pruning routines
- Show users how much storage is in use
- Provide "clear data" option in settings
- Don't store what can be re-fetched

## Permission Check {#permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('unlimitedStorage');
```

## Cross-References {#cross-references}
- Guide: `docs/guides/memory-management.md`
- Reference: `docs/reference/storage-patterns.md`
- Related: `docs/permissions/storage.md`

## Frequently Asked Questions

### What does unlimitedStorage permission do?
The unlimitedStorage permission removes the 10MB quota for chrome.storage.local, allowing extensions to store more data.

### Is unlimitedStorage required for all storage?
No, it's optional. Without it, local storage is limited to 10MB. Most extensions don't need unlimited storage.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
