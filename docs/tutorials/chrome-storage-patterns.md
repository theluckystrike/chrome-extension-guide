---
layout: default
title: "Chrome Storage Patterns for Extensions — Developer Guide"
description: "Master chrome.storage API with patterns for local, sync, and session storage, quota management, structured data, migrations, and change listeners."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/chrome-storage-patterns/"
---

# Chrome Storage Patterns for Extensions

Chrome's storage API provides three distinct storage areas, each optimized for different use cases. Understanding when and how to use each type, along with patterns for handling large data and reactive updates, is essential for building robust extensions.

## Overview of Storage Types {#overview}

Chrome Extensions provide three storage areas through the `chrome.storage` API:

| Storage Area | Capacity | Sync Support | Persistence |
|-------------|----------|--------------|-------------|
| `local` | 10 MB (5 MB in Manifest V3) | No | Until cleared |
| `sync` | 100 KB total (~8 KB per item) | Yes | Until cleared |
| `session` | 1 MB per context | No | Until tab/extension closes |

All storage areas are **asynchronous** and accessed through the `chrome.storage` API. Each operates independently, meaning you can use multiple storage types in the same extension.

## Storage Types in Detail {#storage-types}

### chrome.storage.local

Best for data that should stay on the current device and doesn't need to sync across the user's Chrome instances.

```javascript
// Writing to local storage
await chrome.storage.local.set({
  userPreferences: { theme: 'dark', fontSize: 16 },
  cachedData: JSON.stringify(largeDataset),
  lastUpdated: Date.now()
});

// Reading from local storage
const result = await chrome.storage.local.get(['userPreferences', 'cachedData']);
console.log(result.userPreferences);
```

Use cases:
- Large cached data (images, API responses)
- Device-specific settings
- Data that shouldn't leave the device for privacy

### chrome.storage.sync

Best for user preferences that should follow the user across devices when signed into Chrome.

```javascript
const syncStorage = chrome.storage.sync;

// Writing - automatically syncs across signed-in Chrome instances
await syncStorage.set({
  theme: 'dark',
  fontSize: 16,
  enabledFeatures: ['featureA', 'featureB']
});

// Reading with defaults
const result = await syncStorage.get({
  theme: 'light',
  fontSize: 14,
  enabledFeatures: []
});
```

Key limitations:
- **100 KB total quota** across all keys
- **8 KB per individual key** limit
- Items larger than 8 KB are silently truncated
- Sync can be slow on slow connections

### chrome.storage.session

Best for temporary data that should not persist across browser sessions. Data is cleared when the tab or extension context is closed.

```javascript
// Writing to session storage
await chrome.storage.session.set({
  currentTabData: { url: 'https://example.com', scrollPos: 500 },
  temporaryToken: 'abc123'
});

// Reading - data is cleared when tab closes
const result = await chrome.storage.session.get('currentTabData');
```

Important: In Manifest V3, session storage is **not accessible** from service workers. Use it only in popup, options, or content script contexts.

## Quota Limits and Management {#quota-limits}

Understanding and managing storage quotas is critical to prevent data loss.

### Checking Available Quota

```javascript
async function checkStorageQuota() {
  // Check local storage usage
  const { bytesInUse, quota } = await chrome.storage.local.getBytesInUse();
  const percentUsed = (bytesInUse / quota) * 100;
  
  console.log(`Local storage: ${bytesInUse.toLocaleString()} / ${quota.toLocaleString()} bytes (${percentUsed.toFixed(1)}%)`);
  
  // Check sync storage usage
  const syncUsage = await chrome.storage.sync.getBytesInUse();
  const syncQuota = 100 * 1024; // 100 KB for sync
  console.log(`Sync storage: ${syncUsage.toLocaleString()} / ${syncQuota.toLocaleString()} bytes`);
}

// Check specific keys
const specificKeysUsage = await chrome.storage.local.getBytesInUse(['largeData', 'cache']);
```

### Handling Quota Errors

```javascript
async function safeSetWithQuotaCheck(key, data, storageArea = chrome.storage.local) {
  const serialized = JSON.stringify(data);
  const estimatedSize = new Blob([serialized]).size;
  
  const { quota } = storageArea === chrome.storage.sync 
    ? { quota: 8 * 1024 }  // 8KB per-item for sync
    : await storageArea.getBytesInUse();
  
  if (estimatedSize > quota) {
    throw new Error(`Data too large: ${estimatedSize} bytes exceeds ${quota} byte limit`);
  }
  
  await storageArea.set({ [key]: data });
}

// Retry with exponential backoff for sync storage
async function setWithRetry(key, value, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.storage.sync.set({ [key]: value });
      return true;
    } catch (error) {
      if (error.message.includes('QUOTA_BYTES') && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
  return false;
}
```

### Strategies for Staying Under Quota

```javascript
// 1. Store references instead of full data
const cacheWithReferences = {
  items: [
    { id: 1, name: 'Item A', thumbnailUrl: 'https://...' },
    // Don't embed large images - store URLs
  ],
  metadata: { lastFetch: Date.now() }
};

// 2. Compress data before storing
import { gzipSync } from 'fflate'; // or use CompressionStream API

async function compressForStorage(data) {
  const json = JSON.stringify(data);
  const blob = new Blob([json]);
  const arrayBuffer = await blob.arrayBuffer();
  // Use compression - implementation depends on your build setup
  return arrayBuffer; // Store compressed
}

// 3. Pagination for large lists
async function storeLargeList(data, storage = chrome.storage.local, pageSize = 100) {
  const pages = [];
  for (let i = 0; i < data.length; i += pageSize) {
    pages.push(data.slice(i, i + pageSize));
  }
  
  await storage.set({
    listPages: pages,
    listMeta: { total: data.length, pageSize, lastUpdated: Date.now() }
  });
}
```

## Structured Data Patterns {#structured-data}

### JSON Serialization Pattern

Chrome storage only stores strings, numbers, booleans, and arrays/objects of these types. Use JSON for complex structures.

```javascript
// Storing structured data
const userData = {
  profile: { name: 'John', email: 'john@example.com' },
  settings: { notifications: true, theme: 'dark' },
  history: [
    { url: 'https://a.com', timestamp: 1700000000000 },
    { url: 'https://b.com', timestamp: 1700000001000 }
  ]
};

// Store as object - Chrome storage handles this natively
await chrome.storage.local.set({ userData });

// Retrieve - data is automatically parsed
const { userData: retrieved } = await chrome.storage.local.get('userData');
console.log(retrieved.profile.name); // 'John'

// For explicit control, use JSON.stringify/parse
await chrome.storage.local.set({ 
  complexData: JSON.stringify(userData)
});

const { complexData } = await chrome.storage.local.get('complexData');
const parsed = JSON.parse(complexData);
```

### Nested Key Pattern

Use namespaced keys to organize related data:

```javascript
const STORAGE_KEYS = {
  USER: 'user.',
  SETTINGS: 'settings.',
  CACHE: 'cache.',
};

// Helper for namespaced keys
const ns = (prefix) => ({
  get: (key) => `${prefix}${key}`,
  set: (key, value) => ({ [`${prefix}${key}`]: value })
});

const userStorage = ns(STORAGE_KEYS.USER);
const settingsStorage = ns(STORAGE_KEYS.SETTINGS);

// Usage
await chrome.storage.local.set(
  userStorage.set('profile', { name: 'John' })
);
await chrome.storage.local.set(
  settingsStorage.set('theme', 'dark')
);

const [user, settings] = await chrome.storage.local.get([
  userStorage.get('profile'),
  settingsStorage.get('theme')
]);
```

### Type-Safe Storage Wrapper Pattern

```typescript
// types/storage.ts
interface UserSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: boolean;
}

interface AppState {
  lastSync: number;
  cachedItems: CachedItem[];
}

// storage.ts
class TypedStorage<T extends Record<string, unknown>> {
  constructor(private area: chrome.storage.StorageArea) {}
  
  async get<K extends keyof T>(key: K): Promise<T[K] | undefined> {
    const result = await this.area.get(key as string);
    return result[key as string] as T[K];
  }
  
  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await this.area.set({ [key as string]: value });
  }
  
  async remove<K extends keyof T>(key: K): Promise<void> {
    await this.area.remove(key as string);
  }
  
  async getAll(): Promise<Partial<T>> {
    return await this.area.get() as Partial<T>;
  }
}

// Usage
const settingsStorage = new TypedStorage<UserSettings>(chrome.storage.sync);
const theme = await settingsStorage.get('theme');
await settingsStorage.set('theme', 'dark');
```

## Migration Between Storage Types {#migration}

Migrating data between storage areas or updating schema is a common requirement.

### Local to Sync Migration

```javascript
// Migration utility
async function migrateLocalToSync(keyMapping) {
  // Get all data from local
  const keysToMigrate = Object.keys(keyMapping);
  const localData = await chrome.storage.local.get(keysToMigrate);
  
  const syncData = {};
  for (const [localKey, syncKey] of Object.entries(keyMapping)) {
    if (localData[localKey] !== undefined) {
      syncData[syncKey] = localData[localKey];
    }
  }
  
  // Check sync quota before migrating
  const totalSize = JSON.stringify(syncData).length;
  if (totalSize > 100 * 1024) {
    throw new Error('Data exceeds sync quota');
  }
  
  await chrome.storage.sync.set(syncData);
  await chrome.storage.local.remove(keysToMigrate);
  
  console.log(`Migrated ${keysToMigrate.length} keys to sync storage`);
}

// Usage
await migrateLocalToSync({
  theme: 'theme',
  fontSize: 'fontSize',
  enabledFeatures: 'enabledFeatures'
});
```

### Schema Migration Pattern

```javascript
// manifest.json version handling
const CURRENT_VERSION = 2;

// On extension update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    const { schemaVersion } = await chrome.storage.local.get('schemaVersion');
    
    if (!schemaVersion || schemaVersion < 1) {
      await migrateV0toV1();
    }
    if (schemaVersion < 2) {
      await migrateV1toV2();
    }
    
    await chrome.storage.local.set({ schemaVersion: CURRENT_VERSION });
  }
});

async function migrateV0toV1() {
  // V0 stored user as string, V1 uses object
  const { user } = await chrome.storage.local.get('user');
  if (typeof user === 'string') {
    await chrome.storage.local.set({ 
      user: { name: user, id: null }
    });
  }
}

async function migrateV1toV2() {
  // V1 used 'enabled' boolean, V2 uses 'features' array
  const { enabled } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({
    features: enabled ? ['featureA', 'featureB'] : [],
    enabled: undefined // remove old key
  });
}
```

## Watching for Changes (onChanged) {#onchanged}

The `chrome.storage.onChanged` event fires when any storage area changes, enabling reactive patterns.

### Basic Change Listening

```javascript
// Listen to any storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log(`Storage changed in ${areaName}:`);
  
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`  ${key}:`, oldValue, '→', newValue);
  }
});

// Listen to specific area
chrome.storage.sync.onChanged.addListener((changes) => {
  if (changes.theme) {
    console.log(`Theme changed from ${changes.theme.oldValue} to ${changes.theme.newValue}`);
    applyTheme(changes.theme.newValue);
  }
});

// Listen to specific key in specific area
function watchKey(area, key, callback) {
  const listener = (changes) => {
    if (changes[key]) {
      callback(changes[key].newValue, changes[key].oldValue);
    }
  };
  area.onChanged.addListener(listener);
  return () => area.onChanged.removeListener(listener);
}

// Usage - returns unwatch function
const unwatch = watchKey(chrome.storage.sync, 'theme', (newVal, oldVal) => {
  console.log('Theme changed:', oldVal, '→', newVal);
});

// Later, stop watching
unwatch();
```

### Cross-Context Reactivity

Use `onChanged` to sync state across extension contexts:

```javascript
// In background service worker
chrome.storage.onChanged.addListener((changes, areaName) => {
  // Broadcast to all tabs
  if (areaName === 'sync') {
    chrome.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'STORAGE_CHANGE', 
          changes 
        }).catch(() => {}); // Ignore errors for tabs without content script
      });
    });
  }
});

// In content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STORAGE_CHANGE') {
    Object.entries(message.changes).forEach(([key, { newValue }]) => {
      applyChange(key, newValue);
    });
  }
});
```

### Debounced Watcher Pattern

For frequently changing data, debounce watchers:

```javascript
function createDebouncedWatcher(storageArea, key, delay = 500) {
  let timeoutId = null;
  let lastCallback = null;
  
  const handler = (changes) => {
    if (changes[key]) {
      const newValue = changes[key].newValue;
      lastCallback = () => callback(newValue);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCallback();
        lastCallback = null;
      }, delay);
    }
  };
  
  storageArea.onChanged.addListener(handler);
  
  return () => {
    storageArea.onChanged.removeListener(handler);
    if (timeoutId) clearTimeout(timeoutId);
  };
}

// Usage - only fires after 500ms of no changes
const unwatch = createDebouncedWatcher(chrome.storage.local, 'scrollPosition', 500)((value) => {
  console.log('Scroll position stabilized:', value);
});
```

## Batch Operations {#batch-operations}

### Multiple Read/Write

```javascript
// Batch read - single API call
async function loadUserDashboard() {
  const [user, settings, cache, stats] = await Promise.all([
    chrome.storage.local.get('user'),
    chrome.storage.sync.get('settings'),
    chrome.storage.local.get('cache'),
    chrome.storage.local.get('stats')
  ]);
  
  return { user, settings, cache, stats };
}

// Batch write - single API call
async function saveUserDashboard(data) {
  await chrome.storage.local.set({
    user: data.user,
    cache: data.cache,
    stats: data.stats
  });
  
  await chrome.storage.sync.set({
    settings: data.settings
  });
}

// Atomic multi-area transaction pattern
async function atomicMultiAreaWrite(localData, syncData) {
  try {
    // Write to local first
    await chrome.storage.local.set(localData);
    
    // Then sync - if this fails, local still has data
    // Implement retry logic for sync
    await setWithRetry(syncData);
  } catch (error) {
    // Handle error - potentially queue for later
    await chrome.storage.local.set({ pendingSync: syncData });
    throw error;
  }
}
```

### Queue-Based Batch Operations

```javascript
class StorageQueue {
  constructor(private area, private maxBatchSize = 10) {
    this.queue = [];
    this.processing = false;
  }
  
  async add(key, value) {
    this.queue.push({ key, value, timestamp: Date.now() });
    
    if (this.queue.length >= this.maxBatchSize) {
      await this.flush();
    } else if (!this.processing) {
      // Process queue after delay
      this.processing = true;
      setTimeout(() => this.flush(), 1000);
    }
  }
  
  async flush() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    const batch = {};
    const keys = this.queue.map(item => item.key);
    const existing = await this.area.get(keys);
    
    // Merge: new values override existing
    for (const item of this.queue) {
      batch[item.key] = item.value;
    }
    
    await this.area.set(batch);
    this.queue = [];
    this.processing = false;
  }
}

// Usage
const syncQueue = new StorageQueue(chrome.storage.sync);

// Every call is debounced and batched
syncQueue.add('viewCount', 1); // Won't write immediately
syncQueue.add('lastActive', Date.now()); // Will flush after 1s or 10 items
```

## IndexedDB for Large Data {#indexeddb}

When `chrome.storage.local` quota (5 MB in MV3) is insufficient, use IndexedDB.

### IndexedDB Wrapper

```javascript
class IndexedDBStorage {
  constructor(dbName, storeName, version = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
    this.db = null;
  }
  
  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }
  
  async get(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  
  async getAll() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  
  async put(data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  
  async delete(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

// Usage
const largeDataStore = new IndexedDBStorage('ExtensionDB', 'largeData');
await largeDataStore.open();

await largeDataStore.put({ id: 'user1', data: largeObject });
const item = await largeDataStore.get('user1');
```

### Hybrid Storage Pattern

Combine Chrome storage for small, frequently-accessed data with IndexedDB for large datasets:

```javascript
class HybridStorage {
  constructor(idbStoreName) {
    this.idb = new IndexedDBStorage('ExtensionDB', idbStoreName);
    this.initialized = false;
  }
  
  async init() {
    if (!this.initialized) {
      await this.idb.open();
      this.initialized = true;
    }
  }
  
  // Get small metadata from chrome.storage, large data from IndexedDB
  async getWithCache(id) {
    await this.init();
    
    // Check cache first
    const cacheKey = `cache_${id}`;
    const { [cacheKey]: cached } = await chrome.storage.local.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Fetch from IndexedDB
    const item = await this.idb.get(id);
    
    if (item) {
      // Cache in chrome.storage for faster access next time
      await chrome.storage.local.set({ [cacheKey]: item });
    }
    
    return item;
  }
  
  // Store large data in IndexedDB, update cache
  async setWithCache(id, data) {
    await this.init();
    
    await this.idb.put({ id, ...data, updatedAt: Date.now() });
    
    // Update cache
    await chrome.storage.local.set({ [`cache_${id}`]: data });
  }
  
  // Clear cache for specific item
  async invalidateCache(id) {
    await chrome.storage.local.remove(`cache_${id}`);
  }
}
```

## Caching Strategies {#caching}

### TTL-Based Cache

```javascript
class TTLCache {
  constructor(private storageArea = chrome.storage.local) {}
  
  async get(key) {
    const { [key]: cached } = await this.storageArea.get(key);
    
    if (!cached) return null;
    
    if (cached.expiry && cached.expiry < Date.now()) {
      await this.storageArea.remove(key);
      return null;
    }
    
    return cached.value;
  }
  
  async set(key, value, ttlSeconds = 3600) {
    const data = {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
      createdAt: Date.now()
    };
    
    await this.storageArea.set({ [key]: data });
  }
  
  async invalidate(key) {
    await this.storageArea.remove(key);
  }
}

// Usage
const apiCache = new TTLCache(chrome.storage.local);

async function fetchWithCache(url, ttl = 300) {
  const cacheKey = `api_${url}`;
  
  const cached = await apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  await apiCache.set(cacheKey, data, ttl);
  return data;
}
```

### LRU Cache with Storage

```javascript
class LRUStorageCache {
  constructor(private maxSize = 50, private storageArea = chrome.storage.local) {}
  
  async get(key) {
    const { lruCache: cache = {} } = await this.storageArea.get('lruCache');
    
    if (!cache[key]) return null;
    
    // Move to most recently used
    const value = cache[key];
    delete cache[key];
    cache[key] = value;
    
    await this.storageArea.set({ lruCache: cache });
    return value;
  }
  
  async set(key, value) {
    const { lruCache: cache = {} } = await this.storageArea.get('lruCache');
    
    // Remove oldest if at capacity
    if (Object.keys(cache).length >= this.maxSize) {
      const oldestKey = Object.keys(cache)[0];
      delete cache[oldestKey];
    }
    
    cache[key] = { value, timestamp: Date.now() };
    await this.storageArea.set({ lruCache: cache });
  }
  
  async clear() {
    await this.storageArea.remove('lruCache');
  }
}
```

### Background Refresh Pattern

```javascript
class BackgroundRefreshCache {
  constructor(private storageArea = chrome.storage.local) {}
  
  async getOrFetch(key, fetchFn, ttlMs = 60000) {
    const { [key]: cached } = await this.storageArea.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      // Return cached, refresh in background
      this.refreshInBackground(key, fetchFn, ttlMs);
      return cached.data;
    }
    
    // Cache miss or expired - fetch synchronously
    const data = await fetchFn();
    await this.storageArea.set({
      [key]: { data, expiry: Date.now() + ttlMs }
    });
    
    return data;
  }
  
  async refreshInBackground(key, fetchFn, ttlMs) {
    try {
      const data = await fetchFn();
      await this.storageArea.set({
        [key]: { data, expiry: Date.now() + ttlMs }
      });
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }
}
```

## Common Mistakes and Best Practices {#best-practices}

### Common Mistakes

1. **Ignoring quota limits**: Always check data size before storing in sync
2. **Not handling undefined**: Storage returns `undefined` for unset keys
3. **Forgetting async/await**: Storage operations are asynchronous
4. **Using session storage in service workers**: Not supported in MV3
5. **Storing sensitive data in sync**: Sync data may be stored on Google's servers

### Best Practices

```javascript
// Always provide defaults
const { theme = 'light' } = await chrome.storage.sync.get('theme');

// Use meaningful key names with consistent prefixes
const KEYS = {
  USER_PREFIX: 'user.',
  CACHE_PREFIX: 'cache.',
  SYNC_PREFIX: 'sync.'
};

// Handle errors gracefully
try {
  await chrome.storage.sync.set({ largeKey: largeData });
} catch (error) {
  if (error.message.includes('QUOTA')) {
    // Fall back to local storage
    await chrome.storage.local.set({ largeKey: largeData });
  }
}

// Use transactions for related operations
async function updateUserProfile(updates) {
  // Get existing to preserve unchanged fields
  const { user } = await chrome.storage.local.get('user');
  await chrome.storage.local.set({
    user: { ...user, ...updates, updatedAt: Date.now() }
  });
}
```

---

## Related Articles {#related-articles}

- [Storage Quickstart](storage-quickstart.md) — Get started with chrome.storage API fundamentals
- [Advanced Storage](advanced-storage.md) — Deep dive into @theluckystrike/webext-storage library
- [Performance Optimization](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/tutorials/build-dev-dashboard.md) — Learn about optimizing extension performance including storage

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
