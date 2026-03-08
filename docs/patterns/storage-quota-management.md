---
layout: default
title: "Chrome Extension Storage Quota Management — Best Practices"
description: "Manage storage quotas effectively."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/storage-quota-management/"
---

# Storage Quota Management

Chrome extension storage has strict quota limits that require careful management. This guide covers patterns for effectively managing storage quotas in your extension.

## Quota Overview {#quota-overview}

| Storage Type | Quota Limit | Notes |
|--------------|--------------|-------|
| `local` | 10 MB | Per extension, not synced |
| `sync` | 100 KB total, 8 KB/item | Synced across user's devices |
| `session` | 10 MB | Cleared on browser restart |

## Monitoring Usage {#monitoring-usage}

```javascript
// Monitor storage usage
async function getStorageUsage() {
  const usage = await chrome.storage.local.getBytesInUse();
  const quota = 10 * 1024 * 1024; // 10 MB
  return { used: usage, available: quota - usage, percent: (usage / quota) * 100 };
}
```

## Data Compression {#data-compression}

Use LZ-string to compress JSON data before storing:

```javascript
import LZString from 'lz-string';

const compress = (data) => LZString.compressToUTF16(JSON.stringify(data));
const decompress = (compressed) => JSON.parse(LZString.decompressFromUTF16(compressed));
```

## Data Eviction Strategies {#data-eviction-strategies}

### LRU Cache Implementation {#lru-cache-implementation}

```javascript
class LRUStorage {
  constructor(maxItems = 100) {
    this.maxItems = maxItems;
    this.key = 'lru_cache';
  }

  async get(key) {
    const cache = await chrome.storage.local.get(this.key);
    const items = cache[this.key] || {};
    if (items[key]) {
      items[key].lastAccess = Date.now();
      await chrome.storage.local.set({ [this.key]: items });
      return items[key].data;
    }
    return null;
  }

  async set(key, value) {
    let cache = (await chrome.storage.local.get(this.key))[this.key] || {};
    if (Object.keys(cache).length >= this.maxItems) {
      const oldest = Object.entries(cache)
        .sort(([, a], [, b]) => a.lastAccess - b.lastAccess)[0][0];
      delete cache[oldest];
    }
    cache[key] = { data: value, lastAccess: Date.now() };
    await chrome.storage.local.set({ [this.key]: cache });
  }
}
```

### TTL-Based Expiry {#ttl-based-expiry}

```javascript
async function setWithTTL(key, value, ttlMs) {
  await chrome.storage.local.set({
    [key]: { data: value, expires: Date.now() + ttlMs }
  });
}
```

## Splitting Large Data {#splitting-large-data}

For data exceeding single-key limits, chunk across multiple keys:

```javascript
const CHUNK_SIZE = 100 * 1024; // 100 KB

async function storeLargeData(key, data) {
  const json = JSON.stringify(data);
  const chunks = [];
  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.slice(i, i + CHUNK_SIZE));
  }
  const storage = {};
  chunks.forEach((chunk, i) => storage[`${key}_chunk_${i}`] = chunk);
  storage[`${key}_meta`] = { chunks: chunks.length };
  await chrome.storage.local.set(storage);
}
```

## IndexedDB as Overflow {#indexeddb-as-overflow}

For data exceeding `local` storage, use IndexedDB:

```javascript
const DB_NAME = 'ExtensionDB';
const STORE_NAME = 'LargeData';

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

## Permission Considerations {#permission-considerations}

Request `unlimitedStorage` in manifest to bypass quotas:

```json
{
  "permissions": ["unlimitedStorage"]
}
```

Note: This still doesn't guarantee infinite storage; browsers may still enforce limits.

## Sync Storage Optimization {#sync-storage-optimization}

Minimize sync storage usage:

```javascript
// Only sync critical small data
async function syncSettings(settings) {
  const critical = { theme: settings.theme, language: settings.language };
  await chrome.storage.sync.set(critical);
}
```

## Batch Operations {#batch-operations}

Group writes to avoid write limits:

```javascript
async function batchSet(items) {
  const storage = {};
  items.forEach(({ key, value }) => storage[key] = value);
  await chrome.storage.local.set(storage);
}
```

## Cleaning Orphaned Data {#cleaning-orphaned-data}

```javascript
async function cleanup() {
  const all = await chrome.storage.local.get();
  const now = Date.now();
  for (const [key, value] of Object.entries(all)) {
    if (value?.expires && value.expires < now) {
      await chrome.storage.local.remove(key);
    }
  }
}
```

## User-Facing Storage UI {#user-facing-storage-ui}

Display usage to users for transparency:

```javascript
function renderStorageUI(container) {
  getStorageUsage().then(({ used, percent }) => {
    container.innerHTML = `
      <div class="storage-bar">
        <div style="width: ${percent}%"></div>
      </div>
      <p>${(used / 1024 / 1024).toFixed(2)} MB used</p>
    `;
  });
}
```

## Related Resources {#related-resources}

- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)
- [IndexedDB for Extensions](../patterns/indexeddb-extensions.md)
- [Size Limits Reference](../reference/size-limits.md)
