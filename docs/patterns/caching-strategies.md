---
layout: default
title: "Chrome Extension Caching Strategies — Best Practices"
description: "Implement effective caching strategies for Chrome extensions using storage and cache APIs."
---

# Caching Strategies for Chrome Extensions

Chrome extensions operate under unique constraints: service workers can terminate at
any moment, content scripts run in isolated worlds, and storage APIs have specific
quota limits. Effective caching bridges these gaps, keeping your extension fast and
responsive without redundant network requests or expensive recomputation.

**Related guides:**
- [Memory Management Patterns](memory-management.md)
- [IndexedDB for Extensions](indexeddb-extensions.md)

---

## 1. In-Memory Cache with TTL in the Service Worker

The simplest cache is a JavaScript `Map` with time-to-live expiration. This works
well for short-lived data that does not need to survive a service worker restart.

```javascript
// memory-cache.js
class MemoryCache {
  #store = new Map();

  set(key, value, ttlMs = 60_000) {
    const expiresAt = Date.now() + ttlMs;
    this.#store.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.#store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.#store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    this.#store.delete(key);
  }

  clear() {
    this.#store.clear();
  }

  get size() {
    this.#evictExpired();
    return this.#store.size;
  }

  #evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this.#store) {
      if (now > entry.expiresAt) {
        this.#store.delete(key);
      }
    }
  }
}

// Usage
const cache = new MemoryCache();
cache.set('user-profile', { name: 'Alice' }, 300_000); // 5 min TTL

const profile = cache.get('user-profile');
```

**Limitation:** In Manifest V3, the service worker can be terminated after 30 seconds
of inactivity. Everything in this cache disappears when that happens. Use this pattern
only for data you can cheaply re-fetch, or combine it with a persistent layer
(Pattern 2).

---

## 2. chrome.storage as a Persistent Cache Layer

Use `chrome.storage.local` as a durable cache that survives service worker restarts.
Wrap it with TTL logic so entries auto-expire.

```javascript
// storage-cache.js
class StorageCache {
  #namespace;

  constructor(namespace = 'cache') {
    this.#namespace = namespace;
  }

  #key(name) {
    return `${this.#namespace}:${name}`;
  }

  async set(key, value, ttlMs = 300_000) {
    const entry = {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    };
    await chrome.storage.local.set({ [this.#key(key)]: entry });
  }

  async get(key) {
    const storageKey = this.#key(key);
    const result = await chrome.storage.local.get(storageKey);
    const entry = result[storageKey];

    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      await chrome.storage.local.remove(storageKey);
      return undefined;
    }

    return entry.value;
  }

  async delete(key) {
    await chrome.storage.local.remove(this.#key(key));
  }

  async clear() {
    const all = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(all).filter((k) =>
      k.startsWith(this.#namespace + ':')
    );
    await chrome.storage.local.remove(keysToRemove);
  }
}

// Usage
const cache = new StorageCache('api');
await cache.set('feed-data', feedItems, 600_000); // 10 min TTL

const feed = await cache.get('feed-data');
```

**Performance note:** `chrome.storage.local` operations are asynchronous and involve
serialization overhead. For data accessed on every page load, consider combining this
with an in-memory cache (Pattern 1) -- read from memory first, fall back to storage,
and populate memory on cache miss.

---

## 3. Cache Invalidation Strategies

Stale data causes bugs. Define explicit invalidation strategies instead of relying
solely on TTL.

### Event-driven invalidation

Invalidate cache entries when relevant events occur:

```javascript
// invalidation.js
class CacheInvalidator {
  #cache;
  #rules = new Map();

  constructor(cache) {
    this.#cache = cache;
  }

  addRule(eventName, cacheKeys) {
    this.#rules.set(eventName, cacheKeys);
  }

  async onEvent(eventName) {
    const keys = this.#rules.get(eventName);
    if (!keys) return;

    for (const key of keys) {
      await this.#cache.delete(key);
    }
  }
}

// Setup
const invalidator = new CacheInvalidator(storageCache);
invalidator.addRule('user-logged-out', ['user-profile', 'user-settings', 'feed-data']);
invalidator.addRule('settings-changed', ['user-settings']);

// Trigger on relevant actions
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'USER_LOGOUT') {
    await invalidator.onEvent('user-logged-out');
  }
});
```

### Version-based invalidation

Invalidate all caches when your extension updates:

```javascript
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    const cache = new StorageCache('api');
    await cache.clear();
    console.info('Cache cleared after extension update');
  }
});
```

### Tag-based invalidation

Group cache entries by tags so you can invalidate related entries at once:

```javascript
async function setWithTags(cache, key, value, ttlMs, tags = []) {
  await cache.set(key, value, ttlMs);

  const { cacheTags = {} } = await chrome.storage.local.get('cacheTags');
  for (const tag of tags) {
    if (!cacheTags[tag]) cacheTags[tag] = [];
    if (!cacheTags[tag].includes(key)) cacheTags[tag].push(key);
  }
  await chrome.storage.local.set({ cacheTags });
}

async function invalidateByTag(cache, tag) {
  const { cacheTags = {} } = await chrome.storage.local.get('cacheTags');
  const keys = cacheTags[tag] ?? [];

  for (const key of keys) {
    await cache.delete(key);
  }

  delete cacheTags[tag];
  await chrome.storage.local.set({ cacheTags });
}
```

---

## 4. Stale-While-Revalidate Pattern

Return cached data immediately for a responsive UI, then fetch fresh data in the
background and update the cache. This pattern prioritizes perceived performance.

```javascript
// swr-cache.js
class SWRCache {
  #memoryCache;
  #storageCache;

  constructor() {
    this.#memoryCache = new MemoryCache();
    this.#storageCache = new StorageCache('swr');
  }

  async get(key, fetchFn, options = {}) {
    const { ttlMs = 300_000, staleTtlMs = 600_000 } = options;

    // Check memory first
    const memoryHit = this.#memoryCache.get(key);
    if (memoryHit) return { data: memoryHit, source: 'memory' };

    // Check storage
    const storageKey = `swr:${key}`;
    const result = await chrome.storage.local.get(storageKey);
    const entry = result[storageKey];

    if (entry) {
      const age = Date.now() - entry.createdAt;

      // Fresh: return directly
      if (age < ttlMs) {
        this.#memoryCache.set(key, entry.value, ttlMs - age);
        return { data: entry.value, source: 'storage' };
      }

      // Stale but within grace period: return stale, revalidate in background
      if (age < staleTtlMs) {
        this.#revalidate(key, fetchFn, ttlMs);
        return { data: entry.value, source: 'stale' };
      }
    }

    // Cache miss: fetch synchronously
    const freshData = await fetchFn();
    await this.#update(key, freshData, ttlMs);
    return { data: freshData, source: 'network' };
  }

  async #revalidate(key, fetchFn, ttlMs) {
    try {
      const freshData = await fetchFn();
      await this.#update(key, freshData, ttlMs);
    } catch (err) {
      console.warn(`SWR revalidation failed for "${key}":`, err.message);
    }
  }

  async #update(key, value, ttlMs) {
    this.#memoryCache.set(key, value, ttlMs);
    await this.#storageCache.set(key, value, ttlMs * 2);
  }
}

// Usage
const swr = new SWRCache();

const { data, source } = await swr.get(
  'github-notifications',
  () => fetch('https://api.github.com/notifications').then((r) => r.json()),
  { ttlMs: 60_000, staleTtlMs: 300_000 }
);

console.log(`Data from ${source}:`, data);
```

The SWR pattern works especially well for extension popups. The popup opens
instantly with cached data, and the background revalidation ensures the next
open shows fresh data.

---

## 5. IndexedDB for Large Cached Datasets

`chrome.storage.local` serializes everything to JSON and has a 10 MB default limit.
For large datasets -- images, API response collections, offline data -- use IndexedDB.

```javascript
// idb-cache.js
class IDBCache {
  #dbName;
  #storeName;
  #dbPromise;

  constructor(dbName = 'extension-cache', storeName = 'entries') {
    this.#dbName = dbName;
    this.#storeName = storeName;
    this.#dbPromise = this.#open();
  }

  #open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.#storeName)) {
          const store = db.createObjectStore(this.#storeName, { keyPath: 'key' });
          store.createIndex('expiresAt', 'expiresAt');
          store.createIndex('tag', 'tag');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async set(key, value, ttlMs = 300_000, tag = null) {
    const db = await this.#dbPromise;
    const entry = {
      key,
      value,
      tag,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
      sizeEstimate: JSON.stringify(value).length,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.#storeName, 'readwrite');
      tx.objectStore(this.#storeName).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(key) {
    const db = await this.#dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.#storeName, 'readonly');
      const request = tx.objectStore(this.#storeName).get(key);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry || Date.now() > entry.expiresAt) {
          resolve(undefined);
        } else {
          resolve(entry.value);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteByTag(tag) {
    const db = await this.#dbPromise;
    const tx = db.transaction(this.#storeName, 'readwrite');
    const store = tx.objectStore(this.#storeName);
    const index = store.index('tag');
    const request = index.openCursor(IDBKeyRange.only(tag));

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
```

IndexedDB is available in service workers, content scripts, and extension pages.
It supports structured cloning (not just JSON), so you can store `Blob`, `ArrayBuffer`,
and `File` objects directly -- useful for caching images or binary API responses.

---

## 6. Cache Warming on Extension Install

Pre-populate caches when the extension is installed or updated so the user gets a
fast experience from the very first interaction.

```javascript
// cache-warming.js
const WARM_CACHE_CONFIG = [
  {
    key: 'default-settings',
    fetcher: () => fetch('/defaults.json').then((r) => r.json()),
    ttlMs: 86_400_000, // 24 hours
  },
  {
    key: 'supported-sites',
    fetcher: () => fetch('https://api.example.com/sites').then((r) => r.json()),
    ttlMs: 3_600_000, // 1 hour
  },
  {
    key: 'user-profile',
    fetcher: async () => {
      const { authToken } = await chrome.storage.local.get('authToken');
      if (!authToken) return null;
      return fetch('https://api.example.com/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((r) => r.json());
    },
    ttlMs: 600_000, // 10 min
  },
];

async function warmCaches(cache) {
  const results = await Promise.allSettled(
    WARM_CACHE_CONFIG.map(async ({ key, fetcher, ttlMs }) => {
      const value = await fetcher();
      if (value !== null) {
        await cache.set(key, value, ttlMs);
      }
      return { key, status: 'ok' };
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn('Some caches failed to warm:', failed);
  }
}

// Trigger on install and update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    const cache = new StorageCache('api');
    await warmCaches(cache);
  }
});
```

Use `Promise.allSettled` instead of `Promise.all` so a single failing fetch does not
prevent other caches from warming. Log failures for visibility but do not block the
install event.

---

## 7. Per-Tab Caching in Content Scripts

Content scripts often need to cache data specific to the current page. Since content
scripts run in an isolated world, their in-memory caches are naturally scoped to the
tab.

```javascript
// content-cache.js
class TabCache {
  #cache = new Map();
  #maxSize;

  constructor(maxSize = 100) {
    this.#maxSize = maxSize;
  }

  set(key, value) {
    if (this.#cache.size >= this.#maxSize) {
      // Evict oldest entry (first inserted)
      const firstKey = this.#cache.keys().next().value;
      this.#cache.delete(firstKey);
    }
    this.#cache.set(key, value);
  }

  get(key) {
    return this.#cache.get(key);
  }

  has(key) {
    return this.#cache.has(key);
  }
}

// Usage: cache parsed DOM data to avoid repeated traversals
const parsedCache = new TabCache(50);

function getPostMetadata(postElement) {
  const id = postElement.dataset.postId;
  if (parsedCache.has(id)) {
    return parsedCache.get(id);
  }

  const metadata = {
    author: postElement.querySelector('.author')?.textContent,
    timestamp: postElement.querySelector('time')?.dateTime,
    score: parseInt(postElement.querySelector('.score')?.textContent, 10),
  };

  parsedCache.set(id, metadata);
  return metadata;
}
```

For data that needs to be shared across tabs, route it through the service worker:

```javascript
// content-script.js -- request shared data from service worker
async function getSharedData(key) {
  return chrome.runtime.sendMessage({ type: 'CACHE_GET', key });
}

// service-worker.js -- handle cache requests from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CACHE_GET') {
    storageCache.get(message.key).then(sendResponse);
    return true; // keep message channel open for async response
  }
});
```

---

## 8. Cache Size Management and Eviction Policies

Without size limits, caches grow unbounded and eventually hit storage quotas or degrade
performance. Implement eviction policies to keep caches under control.

### LRU (Least Recently Used) eviction

```javascript
// lru-cache.js
class LRUCache {
  #maxSize;
  #cache = new Map();

  constructor(maxSize = 100) {
    this.#maxSize = maxSize;
  }

  get(key) {
    if (!this.#cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.#cache.get(key);
    this.#cache.delete(key);
    this.#cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.#cache.has(key)) {
      this.#cache.delete(key);
    } else if (this.#cache.size >= this.#maxSize) {
      // Evict least recently used (first entry)
      const lruKey = this.#cache.keys().next().value;
      this.#cache.delete(lruKey);
    }
    this.#cache.set(key, value);
  }
}
```

### Size-based eviction for storage caches

Track the approximate byte size of cached entries and evict when a threshold is
reached:

```javascript
// size-manager.js
class CacheSizeManager {
  #cache;
  #maxBytes;

  constructor(cache, maxBytes = 5 * 1024 * 1024) { // 5 MB default
    this.#cache = cache;
    this.#maxBytes = maxBytes;
  }

  async enforceLimit() {
    const all = await chrome.storage.local.get(null);
    const cacheEntries = Object.entries(all)
      .filter(([key]) => key.startsWith('cache:'))
      .map(([key, entry]) => ({
        key,
        size: JSON.stringify(entry).length,
        createdAt: entry.createdAt ?? 0,
      }))
      .sort((a, b) => a.createdAt - b.createdAt); // oldest first

    let totalSize = cacheEntries.reduce((sum, e) => sum + e.size, 0);
    const keysToRemove = [];

    for (const entry of cacheEntries) {
      if (totalSize <= this.#maxBytes) break;
      keysToRemove.push(entry.key);
      totalSize -= entry.size;
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.info(`Evicted ${keysToRemove.length} cache entries to stay under ${this.#maxBytes} bytes`);
    }
  }
}

// Run periodically or after cache writes
const sizeManager = new CacheSizeManager(storageCache);

async function cacheWithSizeCheck(cache, key, value, ttlMs) {
  await cache.set(key, value, ttlMs);
  await sizeManager.enforceLimit();
}
```

### Storage quota monitoring

Check how much quota your extension is using and warn when it gets high:

```javascript
async function checkStorageUsage() {
  const bytesInUse = await chrome.storage.local.getBytesInUse(null);
  const quotaBytes = chrome.storage.local.QUOTA_BYTES; // 10,485,760 (10 MB)
  const usagePercent = (bytesInUse / quotaBytes) * 100;

  if (usagePercent > 80) {
    console.warn(`Storage usage at ${usagePercent.toFixed(1)}% (${bytesInUse} / ${quotaBytes} bytes)`);
  }

  return { bytesInUse, quotaBytes, usagePercent };
}
```

---

## Choosing the Right Caching Strategy

| Scenario | Recommended Pattern |
|---|---|
| Frequently accessed, small data | In-memory cache (Pattern 1) |
| Data that must survive SW restarts | chrome.storage cache (Pattern 2) |
| API responses with known freshness | Stale-while-revalidate (Pattern 4) |
| Large datasets (>1 MB) | IndexedDB cache (Pattern 5) |
| First-run experience | Cache warming (Pattern 6) |
| DOM parsing results | Per-tab cache (Pattern 7) |

Layer these patterns for best results. A typical architecture uses an in-memory cache
as the hot layer, chrome.storage as the warm layer, and IndexedDB for cold storage of
large objects. Always pair caching with explicit invalidation (Pattern 3) and size
management (Pattern 8) to prevent stale data and quota exhaustion.
