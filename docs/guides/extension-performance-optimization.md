# Chrome Extension Performance Optimization Guide

## Overview

Chrome extensions share browser resources with web pages, making performance optimization critical for user experience. A poorly optimized extension can significantly degrade browser responsiveness, increase memory consumption, and slow down page loads. This guide covers comprehensive strategies for optimizing Chrome extension performance across multiple dimensions, from service worker startup to content script injection and memory management.

## 1. Service Worker Startup Time Optimization

### Understanding the Service Worker Lifecycle

In Manifest V3, the service worker replaces the background page from MV2. The service worker is event-driven and can be terminated when idle, meaning it must reinitialize on each wake-up. This creates cold start latency that directly impacts user experience.

### Optimizing Service Worker Initialization

The key principle is to minimize work done at service worker startup. Only register event listeners synchronously (as required by Chrome), and defer all other initialization:

```javascript
// background.js - Service Worker

// Only synchronous work at top level: event listener registration
chrome.runtime.onMessage.addListener(handleMessage);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.tabs.onUpdated.addListener(handleTabUpdate);

// All other initialization is deferred
let initializationPromise = null;

async function initializeExtension() {
  if (initializationPromise) return initializationPromise;
  
  initializationPromise = (async () => {
    // Defer heavy operations until actually needed
    const config = await loadConfig();
    const userData = await loadUserData();
    initializeEventHandlers(config, userData);
  })();
  
  return initializationPromise;
}

// Lazy load dependencies
async function loadConfig() {
  const result = await chrome.storage.local.get(['config']);
  return result.config || DEFAULT_CONFIG;
}

async function loadUserData() {
  const result = await chrome.storage.local.get(['userData']);
  return result.userData;
}

function handleMessage(message, sender, sendResponse) {
  // Initialize on first message if not yet initialized
  initializeExtension().then(() => {
    processMessage(message, sender, sendResponse);
  });
  return true; // Indicates async response
}
```

### Pre-loading Data on Service Worker Wake

Use the `onStartup` event to pre-load data when the extension first loads after browser startup:

```javascript
// background.js

chrome.runtime.onStartup.addListener(async () => {
  // This runs once when the extension service worker starts
  // after browser launch
  console.log('Extension starting up');
  
  // Pre-warm caches and load essential data
  await Promise.all([
    warmUpCache(),
    loadUserPreferences(),
    establishConnectionPools()
  ]);
});

async function warmUpCache() {
  const cached = await chrome.storage.local.get('cache');
  // Initialize in-memory cache
  globalThis.cache = cached.cache || {};
}
```

## 2. Lazy Loading Modules and Code Splitting

### Dynamic Imports for Feature Modules

Code splitting allows you to split your extension into multiple chunks that are loaded on-demand rather than all at startup. This significantly reduces initial load time:

```javascript
// background.js - Main entry point

// Static imports load immediately (bad for startup time)
// import { heavyUtility } from './utils/heavy.js'; // DON'T

// Dynamic imports load on-demand (good for startup time)
async function getHeavyUtility() {
  const { heavyUtility } = await import('./utils/heavy.js');
  return heavyUtility;
}

// Feature flag-based lazy loading
const FEATURES = {
  ADVANCED_ANALYTICS: 'analytics',
  FILE_MANAGEMENT: 'files',
  EXPORT_FEATURES: 'export'
};

async function loadFeature(featureName) {
  const featureMap = {
    [FEATURES.ADVANCED_ANALYTICS]: () => import('./features/analytics.js'),
    [FEATURES.FILE_MANAGEMENT]: () => import('./features/fileManager.js'),
    [FEATURES.EXPORT_FEATURES]: () => import('./features/export.js')
  };
  
  const loader = featureMap[featureName];
  if (!loader) {
    throw new Error(`Unknown feature: ${featureName}`);
  }
  
  return loader();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FEATURE_REQUEST') {
    loadFeature(message.feature).then(module => {
      module.execute(message.payload).then(sendResponse);
    });
    return true; // Keep channel open for async response
  }
});
```

### Conditional Feature Loading

Load features only when specific conditions are met:

```javascript
// background.js

// Check conditions before loading expensive features
async function handleUserAction(action, tabId) {
  const { settings } = await chrome.storage.local.get('settings');
  
  // Only load analytics if enabled in settings
  if (settings.enableAnalytics && action === 'pageview') {
    const { trackEvent } = await import('./analytics/tracker.js');
    await trackEvent(action, { tabId });
  }
  
  // Only load export module when export is requested
  if (action.startsWith('export_')) {
    const exportModule = await import('./features/export.js');
    return exportModule.handleExport(action, tabId);
  }
}
```

## 3. Chrome Storage Read/Write Batching

### The Cost of Multiple Storage Calls

Each `chrome.storage` call involves inter-process communication (IPC) between the service worker and the browser's storage subsystem. Multiple individual calls are significantly slower than batched operations:

```javascript
// BAD: Multiple individual storage calls (slow)
// This makes 5 separate IPC calls
async function badPractice() {
  const user = await chrome.storage.local.get('user');
  const settings = await chrome.storage.local.get('settings');
  const cache = await chrome.storage.local.get('cache');
  const tokens = await chrome.storage.local.get('tokens');
  const preferences = await chrome.storage.local.get('preferences');
  return { ...user, ...settings, ...cache, ...tokens, ...preferences };
}

// GOOD: Single batched storage call (fast)
// This makes 1 IPC call
async function goodPractice() {
  const result = await chrome.storage.local.get([
    'user',
    'settings',
    'cache',
    'tokens',
    'preferences'
  ]);
  return result;
}

// BETTER: Get all at once if you need most data
async function bestPractice() {
  const result = await chrome.storage.local.get(null); // null gets all
  return result;
}
```

### Batched Write Operations

Similarly, batch multiple writes to reduce IPC overhead:

```javascript
// BAD: Multiple individual set calls
async function badWrite(data) {
  await chrome.storage.local.set({ user: data.user });
  await chrome.storage.local.set({ settings: data.settings });
  await chrome.storage.local.set({ cache: data.cache });
}

// GOOD: Single batched set call
async function goodWrite(data) {
  await chrome.storage.local.set({
    user: data.user,
    settings: data.settings,
    cache: data.cache
  });
}
```

### Creating a Storage Utility Class

Create a reusable utility for optimized storage operations:

```javascript
// utils/storage.js

class OptimizedStorage {
  constructor(namespace = 'default') {
    this.namespace = namespace;
    this.memoryCache = new Map();
    this.writeBuffer = [];
    this.flushTimeout = null;
  }

  async get(keys) {
    // For single key, use direct get
    if (typeof keys === 'string') {
      // Check memory cache first
      if (this.memoryCache.has(keys)) {
        return { [keys]: this.memoryCache.get(keys) };
      }
      const result = await chrome.storage.local.get(keys);
      if (result[keys] !== undefined) {
        this.memoryCache.set(keys, result[keys]);
      }
      return result;
    }
    
    // For array of keys, batch them
    if (Array.isArray(keys)) {
      const uncached = keys.filter(k => !this.memoryCache.has(k));
      if (uncached.length > 0) {
        const result = await chrome.storage.local.get(uncached);
        Object.entries(result).forEach(([k, v]) => {
          this.memoryCache.set(k, v);
        });
      }
      // Merge cached and retrieved
      const merged = {};
      keys.forEach(k => {
        if (this.memoryCache.has(k)) {
          merged[k] = this.memoryCache.get(k);
        }
      });
      return merged;
    }
    
    // Get everything
    const result = await chrome.storage.local.get(null);
    Object.entries(result).forEach(([k, v]) => {
      this.memoryCache.set(k, v);
    });
    return result;
  }

  async set(items) {
    // Update memory cache immediately
    Object.entries(items).forEach(([k, v]) => {
      this.memoryCache.set(k, v);
    });
    
    // Batch writes with debounce
    this.writeBuffer.push(items);
    
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    
    this.flushTimeout = setTimeout(() => {
      this.flushWrites();
    }, 100); // Batch writes within 100ms window
  }

  async flushWrites() {
    if (this.writeBuffer.length === 0) return;
    
    // Merge all buffered writes into single object
    const merged = this.writeBuffer.reduce((acc, item) => ({
      ...acc,
      ...item
    }), {});
    
    this.writeBuffer = [];
    await chrome.storage.local.set(merged);
  }

  // Watch for external changes
  watch(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        // Update memory cache
        Object.entries(changes).forEach(([key, { newValue }]) => {
          this.memoryCache.set(key, newValue);
        });
        callback(changes);
      }
    });
  }
}

// Usage
const storage = new OptimizedStorage('myExtension');
const settings = await storage.get(['theme', 'language', 'notifications']);
await storage.set({ theme: 'dark', lastUpdated: Date.now() });
```

## 4. Content Script Injection Performance

### Understanding run_at Timing

The `run_at` manifest property controls when content scripts execute relative to page load:

| Timing | Description | Use Case |
|--------|-------------|----------|
| `document_start` | Before any DOM content | Modifying HTML structure |
| `document_end` | After DOM is complete | Running after page renders |
| `document_idle` (default) | After DOM and subresources | Most common use case |

```javascript
// manifest.json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle", // Default, best for most cases
      "css": ["styles.css"]
    },
    {
      "matches": ["https://specific-site.com/*"],
      "js": ["early-script.js"],
      "run_at": "document_start", // Only when truly needed
      "run_at": "document_end" // Alternative for DOM-dependent scripts
    }
  ]
}
```

### Programmatic Injection for Better Control

For more control, use programmatic injection with `chrome.scripting.executeScript`:

```javascript
// background.js

// Inject with precise timing based on page state
async function injectContentScript(tabId, injectionType) {
  const injectionOptions = {
    target: { tabId },
    world: 'MAIN', // or 'USER' for isolated world
    func: () => {
      // This runs in page context
      return document.readyState;
    }
  };

  // Check document state before injecting
  const readyState = await chrome.scripting.executeScript(injectionOptions);
  
  if (readyState === 'complete') {
    // Page fully loaded, safe to inject heavy script
    await chrome.scripting.executeScript({
      ...injectionOptions,
      files: ['content/heavy-script.js']
    });
  } else if (readyState === 'interactive') {
    // DOM ready but resources still loading
    await chrome.scripting.executeScript({
      ...injectionOptions,
      files: ['content/light-script.js']
    });
  } else {
    // Still loading, wait for DOMContentLoaded
    await chrome.scripting.executeScript({
      ...injectionOptions,
      files: ['content/minimal-script.js']
    });
  }
}

// Event-based injection
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) { // Main frame only
    await injectContentScript(details.tabId, 'full');
  }
});
```

### Lazy Content Script Loading

Load content scripts only when needed rather than on every page:

```javascript
// content.js - Lazy injection pattern

class LazyContentLoader {
  constructor() {
    this.loaded = false;
    this.pendingRequests = [];
  }

  async ensureLoaded() {
    if (this.loaded) return;
    
    // Load additional functionality
    const { initMainFeatures } = await import('./content/features.js');
    await initMainFeatures();
    this.loaded = true;
    
    // Process any pending requests
    this.pendingRequests.forEach(req => req.resolve());
    this.pendingRequests = [];
  }

  async whenLoaded() {
    if (this.loaded) return Promise.resolve();
    
    return new Promise(resolve => {
      this.pendingRequests.push({ resolve });
    });
  }
}

const loader = new LazyContentLoader();

// Intercept extension messages and lazy-load features
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  
  const { type } = event.data;
  
  if (type === 'EXT_FEATURE_REQUEST') {
    await loader.ensureLoaded();
    // Feature now available
    window.postMessage({ type: 'EXT_FEATURE_READY' }, '*');
  }
});
```

## 5. Memory Management

### Cleaning Up Event Listeners

Content scripts persist with the page, making proper cleanup essential:

```javascript
// content.js - Proper cleanup pattern

class MemorySafeContentScript {
  constructor() {
    this.listeners = new Map();
    this.observers = [];
    this.intervals = [];
    this.init();
  }

  init() {
    // Store listener references for cleanup
    this.listeners.set('click', this.handleClick.bind(this));
    this.listeners.set('scroll', this.handleScroll.bind(this));
    this.listeners.set('keydown', this.handleKeydown.bind(this));

    // Add listeners
    document.addEventListener('click', this.listeners.get('click'));
    document.addEventListener('scroll', this.listeners.get('scroll'));
    document.addEventListener('keydown', this.listeners.get('keydown'));

    // Setup MutationObserver
    this.setupObserver();

    // Setup interval (store ID for cleanup)
    this.intervals.push(setInterval(() => this.periodicTask(), 5000));

    // Cleanup on page unload
    window.addEventListener('unload', this.cleanup.bind(this));
  }

  setupObserver() {
    const observer = new MutationObserver((mutations) => {
      // Process mutations
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(observer);
  }

  cleanup() {
    // Remove event listeners
    this.listeners.forEach((listener, event) => {
      document.removeEventListener(event, listener);
    });
    this.listeners.clear();

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Clear intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
  }

  handleClick(e) { /* ... */ }
  handleScroll(e) { /* ... */ }
  handleKeydown(e) { /* ... */ }
  periodicTask() { /* ... */ }
}

// Initialize
const script = new MemorySafeContentScript();
```

### Avoiding Memory Leaks in Service Workers

Service workers can accumulate memory if not properly managed:

```javascript
// background.js - Service worker memory management

// Use WeakRef for caches that should be garbage collected
class WeakCache {
  #cache = new Map();
  #weakRefs = new WeakMap();

  set(key, value) {
    this.#cache.set(key, value);
    this.#weakRefs.set(key, new WeakRef(value));
  }

  get(key) {
    const ref = this.#weakRefs.get(key);
    if (!ref) return undefined;
    
    const value = ref.deref();
    if (!value) {
      // Value was garbage collected
      this.#cache.delete(key);
      this.#weakRefs.delete(key);
      return undefined;
    }
    return value;
  }
}

// Limit cache size
class LRUCache {
  #maxSize;
  #cache = new Map();

  constructor(maxSize = 100) {
    this.#maxSize = maxSize;
  }

  set(key, value) {
    if (this.#cache.size >= this.#maxSize) {
      const firstKey = this.#cache.keys().next().value;
      this.#cache.delete(firstKey);
    }
    this.#cache.set(key, value);
  }

  get(key) {
    if (!this.#cache.has(key)) return undefined;
    
    // Move to end (most recently used)
    const value = this.#cache.get(key);
    this.#cache.delete(key);
    this.#cache.set(key, value);
    return value;
  }
}

// Global cache instance
const dataCache = new LRUCache(50);
const weakCache = new WeakCache();

// Cleanup on service worker termination
self.addEventListener('terminate', () => {
  // Release large objects
  dataCache.clear();
  // WeakRefs will be GC'd naturally
});
```

### Detecting and Fixing Memory Leaks

Use these patterns to detect memory issues:

```javascript
// background.js - Memory monitoring

let memorySnapshots = [];

async function logMemoryUsage() {
  if (!performance.memory) {
    console.warn('Performance memory API not available');
    return;
  }
  
  const memory = {
    used: Math.round(performance.memory.usedJSHeapSize / 1048576),
    total: Math.round(performance.memory.totalJSHeapSize / 1048576),
    limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
    timestamp: Date.now()
  };
  
  console.log(`Memory: ${memory.used}MB / ${memory.total}MB (limit: ${memory.limit}MB)`);
  
  memorySnapshots.push(memory);
  
  // Alert if memory growing
  if (memorySnapshots.length > 5) {
    const recent = memorySnapshots.slice(-5);
    const avgGrowth = (recent[4].used - recent[0].used) / 4;
    
    if (avgGrowth > 10) { // Growing >10MB per snapshot
      console.error('Memory leak detected! Average growth:', avgGrowth.toFixed(2), 'MB');
      // Trigger cleanup
      forceCleanup();
    }
  }
}

function forceCleanup() {
  // Clear caches
  dataCache.clear();
  
  // Reset accumulated data
  memorySnapshots = [];
  
  console.log('Cleanup performed');
}

// Monitor periodically
setInterval(logMemoryUsage, 30000);
```

## 6. Bundle Size Reduction

### Tree Shaking Configuration

Modern bundlers can eliminate unused code through tree shaking:

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true, // Enable tree shaking
    sideEffects: true, // Respect package.json sideEffects
    minimize: true,
    moduleIds: 'deterministic',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
};
```

### Package.json Side Effects Declaration

```json
{
  "name": "my-extension",
  "sideEffects": [
    "/*.css",
    "/*.scss",
    "./src/initialization.js"
  ]
}
```

### Minification Without Obfuscation

Chrome Web Store rejects obfuscated code. Use standard minification:

```javascript
// webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console logs
            drop_debugger: true
          },
          format: {
            comments: false // Remove comments
          }
        },
        extractComments: false, // Don't extract to separate file
        mangle: true // Shorten variable names (not obfuscation)
      })
    ]
  }
};
```

### Analyzing Bundle Size

```javascript
// analyze-bundle.js
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false
    })
  ]
};
```

Run analysis:
```bash
npx webpack --config webpack.config.js --profile --json > stats.json
npx webpack-bundle-analyzer stats.json
```

### Target Bundle Sizes

| Component | Target Size | Maximum |
|-----------|-------------|---------|
| Background Service Worker | < 100KB | 200KB |
| Content Scripts (each) | < 50KB | 100KB |
| Popup | < 30KB | 50KB |
| Options Page | < 50KB | 100KB |
| Total Extension | < 2MB | 10MB |

## 7. Using IndexedDB for Large Datasets

### When to Use IndexedDB Instead of chrome.storage

Use IndexedDB for:
- Large datasets (> 1MB)
- Complex queries and filtering
- Indexed lookups
- Transaction support
- Binary data storage

Use chrome.storage for:
- Small configuration data
- Simple key-value pairs
- Settings and preferences

### IndexedDB Utility Implementation

```javascript
// utils/indexeddb.js

class IndexedDBManager {
  constructor(databaseName, version) {
    this.dbName = databaseName;
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
        this.db = event.target.result;
        this.createObjectStores();
      };
    });
  }

  createObjectStores() {
    // Users store with index
    if (!this.db.objectStoreNames.contains('users')) {
      const userStore = this.db.createObjectStore('users', { keyPath: 'id' });
      userStore.createIndex('email', 'email', { unique: true });
      userStore.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // Cache store for API responses
    if (!this.db.objectStoreNames.contains('cache')) {
      this.db.createObjectStore('cache', { keyPath: 'key' });
    }
  }

  // CRUD operations
  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async put(storeName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Query with index
  async queryByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Batch operations
  async bulkPut(storeName, values) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      values.forEach(value => store.put(value));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Usage
const db = new IndexedDBManager('MyExtensionDB', 1);
await db.open();

// Store large dataset
await db.bulkPut('users', largeUserArray);

// Query efficiently
const userByEmail = await db.queryByIndex('users', 'email', 'user@example.com');
```

### Syncing chrome.storage with IndexedDB

For compatibility, use chrome.storage for settings but IndexedDB for large data:

```javascript
// utils/storage-hybrid.js

class HybridStorage {
  constructor() {
    this.idb = new IndexedDBManager('ExtensionData', 1);
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await this.idb.open();
    this.initialized = true;
  }

  // Settings - use chrome.storage (fast for small data)
  async getSettings() {
    const result = await chrome.storage.local.get(['settings', 'preferences']);
    return result;
  }

  async saveSettings(settings) {
    await chrome.storage.local.set({ settings });
  }

  // Large data - use IndexedDB
  async getLargeData(key) {
    await this.init();
    return this.idb.get('largeData', key);
  }

  async saveLargeData(key, data) {
    await this.init();
    return this.idb.put('largeData', { key, data, timestamp: Date.now() });
  }
}
```

## 8. Profiling Extensions with Chrome DevTools

### Profiling Service Worker Performance

```javascript
// background.js - Performance markers

function measurePerformance(label, fn) {
  return async (...args) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[PERF] ${label} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  };
}

// Wrap expensive operations
const optimizedFetch = measurePerformance('fetchConfig', fetchConfig);
const optimizedParse = measurePerformance('parseData', parseData);
```

### Using Chrome DevTools for Extension Profiling

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Find your extension and click "Service Worker" link
4. Open DevTools (click "background page" or use keyboard shortcut)
5. Use the Performance tab to record and analyze

### Memory Profiling Tips

```javascript
// Take heap snapshots programmatically
async function takeHeapSnapshot(label) {
  if (!performance.memory) {
    console.warn('Memory API not available');
    return;
  }
  
  console.log(`[MEMORY] ${label}:`, {
    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
  });
}

// Usage
takeHeapSnapshot('Before processing');
await processLargeData();
takeHeapSnapshot('After processing');
```

### Performance Panel Analysis

Steps to profile your extension:

1. Open your extension's background page via `chrome://extensions`
2. Click "Service Worker" link to open DevTools
3. Go to Performance tab
4. Click Record and perform actions
5. Analyze the timeline for:
   - Long tasks (yellow bars > 50ms)
   - Forced reflows (purple bars)
   - Script execution time (green bars)
   - Memory allocation spikes

## 9. chrome.runtime.getBackgroundPage Alternatives in MV3

### Why getBackgroundPage Doesn't Work in MV3

In MV3, service workers can be terminated, making `getBackgroundPage()` unreliable. It may return null or a disconnected page.

### Alternative: Message-Based Communication

```javascript
// background.js - Message-based communication

const messageHandlers = new Map();

function registerHandler(type, handler) {
  messageHandlers.set(type, handler);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers.get(message.type);
  
  if (handler) {
    Promise.resolve(handler(message.payload, sender))
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

registerHandler('getData', async () => {
  return { users: [], settings: {} };
});

registerHandler('processData', async (data) => {
  return processData(data);
});
```

### Using chrome.runtime.getBackgroundClient()

The recommended approach for inspecting service worker state:

```javascript
// popup.js or options.js - Communication with service worker

async function getBackgroundState() {
  try {
    const client = await chrome.runtime.getBackgroundClient();
    // Request current state from service worker
    const response = await client.getState();
    return response;
  } catch (error) {
    console.error('Failed to get background client:', error);
    // Fallback: try message passing
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'GET_STATE' },
        (response) => resolve(response || {})
      );
    });
  }
}
```

### Using Long-Lived Connections

```javascript
// Create persistent connection
const port = chrome.runtime.connect({ name: 'popup-connection' });

port.onMessage.addListener((message) => {
  console.log('Received:', message);
});

port.postMessage({ type: 'GET_STATUS' });

// Cleanup on disconnect
port.onDisconnect.addListener(() => {
  console.log('Disconnected from background');
});
```

### Service Worker Client API

```javascript
// background.js - Using Clients API for tab communication

async function broadcastToAllClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Notify all extension views
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BROADCAST') {
    broadcastToAllClients(message.payload);
  }
});
```

## 10. Measuring Extension Impact on Page Load Time

### Measuring Content Script Injection Delay

```javascript
// content.js - Measure injection timing

const metrics = {
  scriptStart: performance.now(),
  domContentLoaded: 0,
  firstContentfulPaint: 0,
  pageLoad: 0
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    metrics.domContentLoaded = performance.now();
  });
} else {
  metrics.domContentLoaded = performance.now();
}

// Measure LCP if available
if ('PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      metrics.firstContentfulPaint = lastEntry.startTime;
    });
    observer.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // Not supported
  }
}

window.addEventListener('load', () => {
  metrics.pageLoad = performance.now();
  
  // Calculate delays
  const injectionDelay = metrics.scriptStart;
  const domDelay = metrics.domContentLoaded - metrics.scriptStart;
  
  console.log('Extension metrics:', {
    injectionDelay: injectionDelay.toFixed(2) + 'ms',
    domDelay: domDelay.toFixed(2) + 'ms',
    totalDelay: metrics.pageLoad.toFixed(2) + 'ms'
  });
  
  // Send metrics back to background
  chrome.runtime.sendMessage({
    type: 'PERFORMANCE_METRICS',
    payload: metrics
  });
});
```

### Measuring Extension Overhead

```javascript
// content.js - Measure specific extension operations

class PerformanceMeasurer {
  constructor() {
    this.measurements = [];
  }

  measure(label, fn) {
    return async (...args) => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const duration = performance.now() - start;
        this.record(label, duration, 'success');
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        this.record(label, duration, 'error');
        throw error;
      }
    };
  }

  record(label, duration, status) {
    this.measurements.push({ label, duration, status, timestamp: Date.now() });
    
    if (duration > 100) {
      console.warn(`[PERF] Slow operation: ${label} took ${duration.toFixed(2)}ms`);
    }
  }

  getReport() {
    const summary = {};
    this.measurements.forEach(m => {
      if (!summary[m.label]) {
        summary[m.label] = { count: 0, total: 0, errors: 0 };
      }
      summary[m.label].count++;
      summary[m.label].total += m.duration;
      if (m.status === 'error') summary[m.label].errors++;
    });
    
    return Object.entries(summary).map(([label, stats]) => ({
      label,
      avgDuration: (stats.total / stats.count).toFixed(2) + 'ms',
      count: stats.count,
      errors: stats.errors
    }));
  }
}

const measurer = new PerformanceMeasurer();
```

### Minimizing Page Load Impact

```javascript
// manifest.json - Optimize content script loading

{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/lightweight-loader.js"],
      "run_at": "document_idle",
      "css": [] // Avoid loading CSS at startup
    }
  ],
  
  // Use web_accessible_resources for lazy-loaded scripts
  "web_accessible_resources": [
    {
      "resources": ["heavy-feature.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

```javascript
// content/lightweight-loader.js - Load features on demand

class FeatureLoader {
  constructor() {
    this.loadedFeatures = new Set();
  }

  async loadFeature(featureName) {
    if (this.loadedFeatures.has(featureName)) return;
    
    const features = {
      analytics: () => import('./features/analytics.js'),
      ui: () => import('./features/ui.js'),
      dataProcessor: () => import('./features/data-processor.js')
    };
    
    const loader = features[featureName];
    if (loader) {
      await loader();
      this.loadedFeatures.add(featureName);
    }
  }
}

// Only load when needed (e.g., user interaction)
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('ext-feature-trigger')) {
    const loader = new FeatureLoader();
    await loader.loadFeature('ui');
  }
}, { once: true }); // One-time listener
```

## Performance Optimization Checklist

Use this checklist to verify your extension is optimized:

### Service Worker Optimization
- [ ] Event listeners registered synchronously
- [ ] Heavy initialization deferred until needed
- [ ] No blocking operations at startup
- [ ] `onStartup` used for initialization

### Code Splitting and Lazy Loading
- [ ] Dynamic imports for non-critical features
- [ ] Feature flags to load only needed code
- [ ] Content scripts injected on-demand when possible

### Storage Optimization
- [ ] Batched storage reads (`getMany`, `getAll`)
- [ ] Batched storage writes (`setMany`)
- [ ] In-memory caching for frequently accessed data
- [ ] IndexedDB for large datasets (>1MB)

### Content Script Performance
- [ ] `run_at: "document_idle"` used by default
- [ ] Programmatic injection for timing control
- [ ] Lazy loading of features not needed immediately
- [ ] Minimal DOM manipulation

### Memory Management
- [ ] Event listeners properly cleaned up
- [ ] MutationObservers disconnected
- [ ] Intervals and timeouts cleared
- [ ] WeakRef used for caches where appropriate

### Bundle Size
- [ ] Tree shaking enabled
- [ ] Production minification applied
- [ ] Code splitting configured
- [ ] Bundle analysis performed
- [ ] Target sizes met (SW <100KB, content <50KB)

### Profiling
- [ ] Performance markers in critical paths
- [ ] Regular memory profiling done
- [ ] DevTools Performance panel analyzed
- [ ] Extension impact on page load measured

### Best Practices
- [ ] No `chrome.runtime.getBackgroundPage()` usage
- [ ] Message-based communication preferred
- [ ] Long-lived connections for persistent communication
- [ ] Error handling for all async operations

## Conclusion

Performance optimization is an ongoing process. Start by measuring your extension's baseline performance, then apply these optimizations systematically. Focus first on the areas with the biggest impact: service worker startup time, storage batching, and content script injection timing.

Regular profiling should be part of your development workflow. Use Chrome DevTools to identify bottlenecks, measure the impact of changes, and ensure your extension remains fast as you add new features.

Remember that every millisecond counts, users notice slow extensions, and browser resource competition means your extension directly impacts their browsing experience. Following these patterns will help you build a performant, responsive Chrome extension.
