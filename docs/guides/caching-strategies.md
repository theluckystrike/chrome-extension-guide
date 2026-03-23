---
layout: default
title: "Chrome Extension Caching Strategies — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/caching-strategies/"
---
# Caching Strategies for Extensions

Caching is essential for building responsive Chrome extensions that work efficiently and gracefully handle offline scenarios. This guide covers caching strategies, storage options, and implementation patterns specific to extension development.

## Overview {#overview}

Caching in Chrome extensions serves several critical purposes:

- **Reduce API calls**: Store API responses locally to minimize network requests and rate limiting
- **Improve responsiveness**: Serve cached data instantly without waiting for network responses
- **Handle offline scenarios**: Ensure core functionality works when the user is offline
- **Save bandwidth**: Reduce data transfer by reusing previously fetched content

Effective caching strategies balance data freshness with performance, choosing the right approach based on how often data changes and how critical it is to have the latest version.

## Storage Options for Caching {#storage-options-for-caching}

Chrome extensions provide multiple storage APIs, each with different characteristics suited for specific caching scenarios.

### chrome.storage.local {#chromestoragelocal}

Persistent storage that survives browser restarts. Default quota is 10MB, but you can request unlimited storage with the `"unlimitedStorage"` permission in your manifest. Data is stored as JSON-serializable objects and accessed asynchronously.

```javascript
// Storing cached API response
await chrome.storage.local.set({
  users: { data: userData, timestamp: Date.now() }
});

// Retrieving cached data
const result = await chrome.storage.local.get('users');
```

This storage is ideal for data that should persist across sessions, such as user preferences, cached API responses, and computed results that take significant time to generate.

### chrome.storage.session {#chromestoragesession}

Fast, ephemeral storage cleared when the browser restarts. Provides 10MB quota and is ideal for data that doesn't need to persist across sessions. Access is also asynchronous.

```javascript
// Session-scoped cache for current browser session
await chrome.storage.session.set({
  currentTabData: tabData
});
```

Use this for temporary caching during a single browsing session, such as data that will be refreshed when the user next opens the browser.

### In-Memory Caching {#in-memory-caching}

JavaScript variables within the service worker provide the fastest access but are lost when the service worker terminates or is updated. This happens more frequently than you might expect.

```javascript
// Simple in-memory cache
const memoryCache = new Map();

function getCached(key) {
  return memoryCache.get(key);
}

function setCached(key, value) {
  memoryCache.set(key, value);
}
```

In-memory caching is best for data that can be easily re-fetched or recomputed, where the performance gain outweighs the risk of data loss.

### Cache API {#cache-api}

The standard Cache API, typically associated with service workers, can also be used in extension context for HTTP response caching. This is useful when you need to cache network requests with full request/response pairs.

```javascript
const cacheName = 'api-cache-v1';
const cache = await caches.open(cacheName);
await cache.put(request, response);
```

## Cache Patterns {#cache-patterns}

### Cache-First {#cache-first}

The cache-first pattern checks storage before making network requests. If cached data exists and is fresh, return it immediately. Otherwise, fetch from the network, cache the result, and return it.

```javascript
async function cacheFirst(key, fetchFn, ttl = 3600000) {
  const cached = await chrome.storage.local.get(key);
  
  if (cached[key] && Date.now() - cached[key].timestamp < ttl) {
    return cached[key].data;
  }
  
  const data = await fetchFn();
  await chrome.storage.local.set({
    [key]: { data, timestamp: Date.now() }
  });
  
  return data;
}
```

This pattern works best for data that changes infrequently, such as configuration data, static lists, or user preferences. The TTL (time-to-live) parameter controls how long cached data is considered fresh.

### Network-First {#network-first}

The network-first pattern attempts to fetch fresh data from the network first. If the request succeeds, cache the response. If it fails (offline or error), fall back to cached data.

```javascript
async function networkFirst(key, fetchFn) {
  try {
    const data = await fetchFn();
    await chrome.storage.local.set({
      [key]: { data, timestamp: Date.now() }
    });
    return data;
  } catch (error) {
    const cached = await chrome.storage.local.get(key);
    if (cached[key]) {
      return cached[key].data;
    }
    throw error;
  }
}
```

This approach ensures users get fresh data when online while maintaining functionality offline. Best for data that should be as current as possible, such as news feeds or notifications.

### Stale-While-Revalidate {#stale-while-revalidate}

This pattern returns cached data immediately for fast responses while simultaneously fetching fresh data in the background. The cached data is updated for subsequent requests.

```javascript
async function staleWhileRevalidate(key, fetchFn, ttl = 3600000) {
  const cached = await chrome.storage.local.get(key);
  const now = Date.now();
  
  // Return cached data immediately if available and not too stale
  if (cached[key] && now - cached[key].timestamp < ttl) {
    // Fetch in background to update cache
    fetchFn().then(freshData => {
      chrome.storage.local.set({
        [key]: { data: freshData, timestamp: now }
      });
    }).catch(() => {}); // Silent failure for background refresh
    
    return cached[key].data;
  }
  
  // No valid cache, fetch and return
  const data = await fetchFn();
  await chrome.storage.local.set({
    [key]: { data, timestamp: now }
  });
  
  return data;
}
```

This pattern provides the best of both worlds: instant response times with cached data, plus eventual consistency with fresh data. Ideal for frequently accessed data where slight staleness is acceptable.

## TTL (Time-To-Live) Implementation {#ttl-time-to-live-implementation}

Proper TTL implementation ensures cached data remains fresh while avoiding unnecessary network requests.

### Basic TTL Wrapper {#basic-ttl-wrapper}

```javascript
class TTLCache {
  constructor(storage, defaultTTL = 3600000) {
    this.storage = storage;
    this.defaultTTL = defaultTTL;
  }

  async get(key) {
    const result = await this.storage.get(key);
    const item = result[key];
    
    if (!item) return null;
    if (Date.now() - item.timestamp > item.ttl) {
      await this.storage.remove(key);
      return null;
    }
    
    return item.data;
  }

  async set(key, data, ttl = this.defaultTTL) {
    await this.storage.set({
      [key]: { data, timestamp: Date.now(), ttl }
    });
  }

  async remove(key) {
    await this.storage.remove(key);
  }
}

const cache = new TTLCache(chrome.storage.local);
```

### Periodic Cache Cleanup {#periodic-cache-cleanup}

Use chrome.alarms to periodically clean up expired cache entries:

```javascript
chrome.alarms.create('cacheCleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cacheCleanup') {
    const all = await chrome.storage.local.get(null);
    
    for (const [key, value] of Object.entries(all)) {
      if (value.timestamp && Date.now() - value.timestamp > value.ttl) {
        await chrome.storage.local.remove(key);
      }
    }
  }
});
```

## Cache Invalidation {#cache-invalidation}

Invalidating cache entries at the right time ensures users see fresh data when needed.

### Manual Invalidation {#manual-invalidation}

```javascript
async function invalidateCache(key) {
  await chrome.storage.local.remove(key);
}

// Invalidate on user action
document.getElementById('refreshBtn').addEventListener('click', () => {
  invalidateCache('users');
  loadUsers();
});
```

### Write-Through Invalidation {#write-through-invalidation}

Update or invalidate cache when data is mutated:

```javascript
async function updateUser(userId, updates) {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  
  // Invalidate related caches
  await chrome.storage.local.remove('users');
}
```

### Event-Based Invalidation {#event-based-invalidation}

Listen for storage changes across extension contexts:

```javascript
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    for (const key of Object.keys(changes)) {
      if (key.startsWith('cache:')) {
        console.log(`Cache invalidated: ${key}`);
      }
    }
  }
});
```

## SW-Aware Caching {#sw-aware-caching}

Service workers in extensions can be terminated and restarted frequently, causing in-memory caches to be lost.

### Hydration Pattern {#hydration-pattern}

Reconstruct in-memory cache from persistent storage when the service worker starts:

```javascript
// In service worker
let memoryCache = {};

async function hydrateFromStorage() {
  const cached = await chrome.storage.session.get(null);
  memoryCache = cached;
}

// Call on service worker startup
hydrateFromStorage();

// Use memory cache for fast access
function getFromCache(key) {
  return memoryCache[key];
}
```

### Tiered Caching Strategy {#tiered-caching-strategy}

Combine storage types for optimal performance:

```javascript
// Hot cache: memory (fastest, lost on SW restart)
// Warm cache: chrome.storage.session (persists across SW restarts)
// Cold cache: chrome.storage.local (persistent, slowest)

async function getWithTieredCache(key) {
  // Try memory first
  if (memoryCache[key]) return memoryCache[key];
  
  // Try session storage
  const session = await chrome.storage.session.get(key);
  if (session[key]) {
    memoryCache[key] = session[key];
    return session[key];
  }
  
  // Fall back to local storage
  const local = await chrome.storage.local.get(key);
  if (local[key]) {
    await chrome.storage.session.set({ [key]: local[key] });
    memoryCache[key] = local[key];
    return local[key];
  }
  
  return null;
}
```

## Cache Size Management {#cache-size-management}

Monitor and manage storage quota to prevent hitting limits.

### Monitor Storage Usage {#monitor-storage-usage}

```javascript
async function checkStorageUsage() {
  const bytesInUse = await chrome.storage.local.getBytesInUse(null);
  const quota = 10 * 1024 * 1024; // 10MB default
  
  console.log(`Using ${bytesInUse / 1024}KB of ${quota / 1024}KB`);
  
  if (bytesInUse > quota * 0.9) {
    console.warn('Storage quota nearly exceeded');
  }
}
```

### LRU Eviction {#lru-eviction}

Implement least-recently-used eviction to manage cache size:

```javascript
class LRUCache {
  constructor(storage, maxSize = 50) {
    this.storage = storage;
    this.maxSize = maxSize;
  }

  async get(key) {
    const item = await this.storage.get(key);
    if (!item[key]) return null;
    
    // Update access order
    const order = await this.storage.get('cacheOrder');
    const cacheOrder = order.cacheOrder || [];
    const newOrder = [key, ...cacheOrder.filter(k => k !== key)].slice(0, this.maxSize);
    
    await this.storage.set({ cacheOrder: newOrder });
    return item[key].data;
  }

  async set(key, value) {
    const order = await this.storage.get('cacheOrder');
    const cacheOrder = order.cacheOrder || [];
    
    // Evict oldest if at capacity
    if (cacheOrder.length >= this.maxSize && !cacheOrder.includes(key)) {
      const oldest = cacheOrder.pop();
      await this.storage.remove(oldest);
    }
    
    // Update order
    const newOrder = [key, ...cacheOrder.filter(k => k !== key)];
    await this.storage.set({
      [key]: { data: value, timestamp: Date.now() },
      cacheOrder: newOrder
    });
  }
}
```

### Compression {#compression}

For large cached values, consider compression:

```javascript
import { gzip, ungzip } from 'fflate';

async function compressAndStore(key, data) {
  const compressed = gzip(JSON.stringify(data));
  await chrome.storage.local.set({ [key]: { data: compressed, compressed: true } });
}

async function getAndDecompress(key) {
  const result = await chrome.storage.local.get(key);
  if (!result[key]) return null;
  
  if (result[key].compressed) {
    return JSON.parse(ungzip(result[key].data));
  }
  return result[key].data;
}
```

## Code Examples {#code-examples}

### Offline-First Data Access {#offline-first-data-access}

Complete pattern for resilient data fetching:

```javascript
class OfflineFirstCache {
  constructor(storage) {
    this.storage = storage;
  }

  async fetch(key, fetcher, ttl = 3600000) {
    // Check cache first
    const cached = await this.storage.get(key);
    if (cached[key] && Date.now() - cached[key].timestamp < ttl) {
      return { data: cached[key].data, fromCache: true };
    }

    // Try network
    try {
      const data = await fetcher();
      await this.storage.set({
        [key]: { data, timestamp: Date.now() }
      });
      return { data, fromCache: false };
    } catch (error) {
      // Fall back to stale cache
      if (cached[key]) {
        return { data: cached[key].data, fromCache: true, stale: true };
      }
      throw error;
    }
  }
}

const offlineCache = new OfflineFirstCache(chrome.storage.local);

// Usage
const { data, fromCache, stale } = await offlineCache.fetch(
  'userProfile',
  () => fetch('/api/user').then(r => r.json()),
  300000 // 5 minute TTL
);
```

## Cross-References {#cross-references}

- [State Management](../patterns/state-management.md) - Managing application state across contexts
- [Performance](../guides/performance.md) - General performance optimization techniques
- [Memory Management](../guides/memory-management.md) - Managing memory in service workers

## Related Articles {#related-articles}

## Related Articles

- [Caching Patterns](../patterns/caching-strategies.md)
- [Bundle Analysis](../guides/extension-bundle-analysis.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
