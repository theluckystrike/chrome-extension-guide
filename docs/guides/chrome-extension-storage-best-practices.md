---
layout: default
title: "Chrome Extension Storage Best Practices — Complete Developer Guide"
description: "A comprehensive developer guide covering Chrome extension storage best practices including chrome.storage API areas, quota management, structured storage patterns, batch operations, encryption, and performance optimization."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-storage-best-practices/"
---

# Chrome Extension Storage Best Practices

Building production-ready Chrome extensions requires careful consideration of how you manage persistent data. The Chrome Storage API offers powerful capabilities, but using it effectively requires understanding its nuances, limitations, and best practices. This comprehensive guide covers essential strategies for implementing robust storage solutions that scale across millions of users.

## Understanding Storage Areas {#storage-areas}

Chrome extensions have access to four distinct storage APIs, each designed for specific use cases. Understanding when to use each area is fundamental to building extensions that perform well and provide excellent user experience across all scenarios.

### chrome.storage.local

The `chrome.storage.local` API provides persistent storage that remains on the user's device until explicitly cleared. This is the most versatile storage area, ideal for application state, cached data, and user preferences that don't need synchronization.

```javascript
// Storing complex data structures
await chrome.storage.local.set({
  userProfile: {
    name: 'John Doe',
    preferences: {
      theme: 'dark',
      notifications: true,
      language: 'en-US'
    }
  },
  lastSyncTimestamp: Date.now()
});

// Retrieving with default fallback
const { userProfile } = await chrome.storage.local.get('userProfile');
const theme = userProfile?.preferences?.theme || 'light';
```

The default quota for local storage is 10MB, but you can request unlimited storage by adding `"unlimitedStorage"` to your manifest's permissions array. Local storage persists across browser restarts and extension updates, making it ideal for data that must survive application restarts.

### chrome.storage.sync

The `chrome.storage.sync` API automatically synchronizes data across all devices where the user is signed into Chrome with the same profile. This makes it perfect for user preferences and settings that should follow the user across devices.

```javascript
// Sync storage for cross-device preferences
await chrome.storage.sync.set({
  syncPreferences: {
    enabledFeatures: ['bookmarks', 'readingList'],
    autoSync: true,
    syncFrequency: 'immediate'
  },
  // Note: Individual keys are limited to 8KB in sync storage
  compactData: { userId: 'user-123', setting: true }
});
```

Sync storage has stricter quota limits than local storage: 100KB total with a maximum of 8KB per key. Chrome automatically queues changes and syncs when connectivity is available, handling conflict resolution using a last-write-wins strategy by default.

### chrome.storage.session

The `chrome.storage.session` API provides ephemeral storage that persists only for the duration of the browser session. Data stored here is cleared when the last browser window closes, making it useful for temporary state and sensitive data that shouldn't persist.

```javascript
// Session storage for temporary sensitive data
await chrome.storage.session.set({
  authToken: 'temporary-token-12345',
  currentPage: '/dashboard',
  modalState: { isOpen: true, step: 2 }
});

// Session storage is accessible immediately without async
const { authToken } = await chrome.storage.session.get('authToken');
```

Session storage has a quota of approximately 1MB and is ideal for caching authentication tokens, UI state, or any data that should be cleared when the browser closes for security reasons.

### chrome.storage.managed

The `chrome.storage.managed` API allows enterprise administrators to configure extension settings through group policy. This storage area is read-only for extensions and is configured by IT administrators through Chrome's enterprise policies.

```javascript
// Reading managed storage (read-only for extension)
const { allowedDomains, featureFlags } = await chrome.storage.managed.get(
  ['allowedDomains', 'featureFlags']
);

if (allowedDomains?.includes(window.location.hostname)) {
  // Enable domain-specific features
}
```

Managed storage is particularly valuable for enterprise extensions where administrators need to enforce specific configurations across their organization's Chrome installations.

## Quota Limits and Size Constraints {#quota-limits}

Understanding and respecting storage quotas is critical for building reliable extensions. Exceeding quotas leads to runtime errors that can break functionality or cause data loss.

### Storage Area Quotas

| Storage Area | Default Quota | Per-Key Limit | Persistence |
|--------------|---------------|---------------|-------------|
| local | 10MB | No limit | Until cleared |
| sync | 100KB | 8KB | Until cleared |
| session | ~1MB | No limit | Session only |
| managed | No limit | No limit | Enterprise policy |

### Monitoring Storage Usage

Implement proactive quota monitoring to prevent storage failures:

```javascript
class StorageQuotaMonitor {
  constructor(storageArea = chrome.storage.local) {
    this.storage = storageArea;
    this.quotaWarningThreshold = 0.8; // Warn at 80%
    this.quotaCriticalThreshold = 0.95; // Critical at 95%
  }

  async getUsageInfo() {
    const bytesInUse = await this.storage.getBytesInUse();
    const quota = this.storage === chrome.storage.sync ? 102400 : 10485760;
    return {
      bytesInUse,
      quota,
      usagePercent: (bytesInUse / quota) * 100,
      available: quota - bytesInUse
    };
  }

  async checkAndNotify() {
    const usage = await this.getUsageInfo();
    
    if (usage.usagePercent >= this.quotaCriticalThreshold) {
      this.notifyUser('critical', usage);
    } else if (usage.usagePercent >= this.quotaWarningThreshold) {
      this.notifyUser('warning', usage);
    }
    
    return usage;
  }

  notifyUser(level, usage) {
    console.warn(`Storage ${level}: ${usage.usagePercent.toFixed(1)}% used`);
    // Trigger user notification or cleanup
  }
}
```

### Handling Quota Errors

Always implement error handling for storage operations:

```javascript
async function safeSetStorage(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
    return { success: true };
  } catch (error) {
    if (error.message.includes('QUOTA_BYTES')) {
      // Handle quota exceeded
      await handleQuotaExceeded(key, value);
      return { success: false, error: 'quota_exceeded' };
    }
    throw error;
  }
}

async function handleQuotaExceeded(key, value) {
  // Implement cleanup strategy
  const monitor = new StorageQuotaMonitor();
  const usage = await monitor.getUsageInfo();
  
  // Clear old cached data or prompt user
  console.error(`Storage quota exceeded. Using ${usage.usagePercent}%`);
}
```

## Structured vs Flat Storage Patterns {#storage-patterns}

Choosing between structured (nested) and flat storage patterns significantly impacts performance, maintainability, and quota efficiency.

### Flat Storage Pattern

Flat storage stores each piece of data as a separate key, enabling granular access and modification:

```javascript
// Flat storage structure
const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_prefs',
  THEME: 'pref_theme',
  LANGUAGE: 'pref_language',
  NOTIFICATIONS: 'pref_notifications',
  LAST_SYNC: 'last_sync_timestamp'
};

// Advantages: Can update individual items without reading/writing entire objects
await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: 'dark' });

// Easy to query specific values
const { [STORAGE_KEYS.THEME]: theme } = await chrome.storage.sync.get(STORAGE_KEYS.THEME);
```

### Structured Storage Pattern

Structured storage groups related data into objects:

```javascript
// Structured storage - grouped data
await chrome.storage.local.set({
  preferences: {
    theme: 'dark',
    language: 'en-US',
    notifications: {
      email: true,
      push: false,
      frequency: 'daily'
    }
  },
  cache: {
    lastUpdated: Date.now(),
    data: largeDataset
  }
});
```

### Hybrid Approach

Most production extensions benefit from a hybrid approach:

```javascript
class HybridStorageManager {
  constructor() {
    // Frequently accessed, small data - flat storage
    this.flatKeys = {
      theme: 'pref_theme',
      language: 'pref_language',
      lastSync: 'sync_timestamp'
    };
    
    // Large, infrequently accessed data - structured storage
    this.structuredKeys = {
      cachedContent: 'cache_content',
      userHistory: 'data_history'
    };
  }

  async updatePreference(key, value) {
    // Direct update without reading full object
    await chrome.storage.local.set({ [this.flatKeys[key]]: value });
  }

  async getPreference(key) {
    const result = await chrome.storage.local.get(this.flatKeys[key]);
    return result[this.flatKeys[key]];
  }

  async updateCachedData(data) {
    // Batch large data updates
    await chrome.storage.local.set({
      [this.structuredKeys.cachedContent]: data,
      [`${this.structuredKeys.cachedData}_timestamp`]: Date.now()
    });
  }
}
```

## Batch Operations and Transactions {#batch-operations}

Chrome Storage supports batch operations that can significantly improve performance when dealing with multiple items.

### Batch Set Operations

```javascript
// Group related writes into single operation
async function saveUserSession(userData, preferences, state) {
  await chrome.storage.local.set({
    session: {
      user: userData,
      preferences: preferences,
      state: state,
      timestamp: Date.now()
    }
  });
}

// Batch multiple independent writes
async function batchUpdateSettings(updates) {
  const storageSet = {};
  
  for (const [key, value] of Object.entries(updates)) {
    storageSet[`settings_${key}`] = value;
  }
  
  await chrome.storage.sync.set(storageSet);
}
```

### Batch Get Operations

```javascript
// Retrieve multiple related values efficiently
async function loadUserProfile() {
  const keys = [
    'profile_name',
    'profile_email',
    'profile_avatar',
    'profile_settings',
    'profile_preferences'
  ];
  
  const result = await chrome.storage.local.get(keys);
  return {
    name: result.profile_name,
    email: result.profile_email,
    avatar: result.profile_avatar,
    settings: result.profile_settings,
    preferences: result.profile_preferences
  };
}

// Use null to get all items from a storage area
async function getAllStorageData() {
  const result = await chrome.storage.local.get(null);
  return result;
}
```

### Transaction-Like Patterns

While Chrome Storage doesn't support true transactions, you can implement atomic patterns:

```javascript
class AtomicStorageManager {
  async updateWithBackup(key, newValue) {
    // Read current value first
    const { [key]: currentValue } = await chrome.storage.local.get(key);
    
    // Store backup
    await chrome.storage.local.set({
      [`${key}_backup`]: currentValue,
      [`${key}_timestamp`]: Date.now()
    });
    
    try {
      // Attempt update
      await chrome.storage.local.set({ [key]: newValue });
      return { success: true };
    } catch (error) {
      // Rollback on failure
      await chrome.storage.local.set({ [key]: currentValue });
      throw error;
    }
  }

  async conditionalUpdate(key, newValue, condition) {
    const { [key]: currentValue } = await chrome.storage.local.get(key);
    
    if (condition(currentValue)) {
      await chrome.storage.local.set({ [key]: newValue });
      return true;
    }
    
    return false;
  }
}
```

## Storage Migration Between Versions {#storage-migration}

When updating extensions, you often need to migrate stored data between versions. Proper migration prevents data loss and ensures backward compatibility.

### Version-Based Migration Pattern

```javascript
const CURRENT_SCHEMA_VERSION = 3;

class StorageMigrationManager {
  constructor() {
    this.migrations = {
      1: this.migrateV1ToV2.bind(this),
      2: this.migrateV2ToV3.bind(this)
    };
  }

  async initialize() {
    const { schemaVersion } = await chrome.storage.local.get('schemaVersion');
    
    if (!schemaVersion) {
      // Fresh install - initialize with defaults
      await this.initializeDefaults();
      return;
    }

    if (schemaVersion < CURRENT_SCHEMA_VERSION) {
      await this.runMigrations(schemaVersion);
    }
  }

  async initializeDefaults() {
    await chrome.storage.local.set({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: { theme: 'light', notifications: true },
      cache: { data: null, timestamp: null }
    });
  }

  async runMigrations(fromVersion) {
    for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
      console.log(`Running migration from v${v} to v${v + 1}`);
      await this.migrations[v]();
    }
  }

  async migrateV1ToV2() {
    // Migrate flat structure to nested structure
    const oldData = await chrome.storage.local.get(null);
    
    const newData = {
      schemaVersion: 2,
      settings: {
        theme: oldData.theme || 'light',
        language: oldData.language || 'en-US'
      },
      user: {
        name: oldData.username || '',
        email: oldData.useremail || ''
      }
    };
    
    // Clear old keys
    await chrome.storage.local.clear();
    await chrome.storage.local.set(newData);
  }

  async migrateV2ToV3() {
    // Add new fields and restructure
    const { settings, user } = await chrome.storage.local.get(['settings', 'user']);
    
    await chrome.storage.local.set({
      schemaVersion: 3,
      settings: {
        ...settings,
        notifications: {
          email: settings.notifications ?? true,
          push: false
        }
      },
      user: {
        ...user,
        profile: {
          avatar: null,
          bio: ''
        }
      },
      metadata: {
        lastMigration: Date.now(),
        previousVersions: [1, 2]
      }
    });
  }
}
```

### Migration Verification

```javascript
async function verifyMigration() {
  const { schemaVersion, settings, user } = await chrome.storage.local.get(
    ['schemaVersion', 'settings', 'user']
  );

  const validations = [
    { check: schemaVersion === CURRENT_SCHEMA_VERSION, message: 'Schema version correct' },
    { check: settings !== undefined, message: 'Settings exist' },
    { check: user?.profile !== undefined, message: 'User profile migrated' }
  ];

  const allValid = validations.every(v => v.check);
  
  if (!allValid) {
    const failed = validations.filter(v => !v.check);
    console.error('Migration validation failed:', failed);
    // Attempt recovery or notify user
  }

  return allValid;
}
```

## IndexedDB for Large Data {#indexeddb}

When Chrome Storage quotas are insufficient, IndexedDB provides a powerful alternative for storing large structured datasets.

### IndexedDB Wrapper

```javascript
class IndexedDBManager {
  constructor(dbName, version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'id' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
```

### Hybrid Storage Strategy

Combine Chrome Storage for small, frequently accessed data with IndexedDB for large datasets:

```javascript
class HybridStorage {
  constructor() {
    this.idb = new IndexedDBManager('extension_data', 1);
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await this.idb.initialize();
      this.initialized = true;
    }
  }

  // Store small, frequently accessed data in Chrome Storage
  async setPreference(key, value) {
    await chrome.storage.local.set({ [`pref_${key}`]: value });
  }

  async getPreference(key) {
    const result = await chrome.storage.local.get(`pref_${key}`);
    return result[`pref_${key}`];
  }

  // Store large datasets in IndexedDB
  async cacheDocuments(documents) {
    await this.init();
    for (const doc of documents) {
      await this.idb.put('documents', {
        ...doc,
        cached: Date.now()
      });
    }
  }

  async getCachedDocuments(type) {
    await this.init();
    return this.idb.getAll('documents', 'type', type);
  }
}
```

## Encryption at Rest {#encryption}

For sensitive data, implement encryption before storing in Chrome Storage or IndexedDB.

### Using the Web Crypto API

```javascript
class EncryptedStorage {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  async generateKey() {
    return crypto.subtle.generateKey(
      { name: this.algorithm, length: this.keyLength },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async exportKey(key) {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  async importKey(keyData) {
    const keyBuffer = this.base64ToArrayBuffer(keyData);
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: this.algorithm, length: this.keyLength },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(data, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      key,
      encoder.encode(JSON.stringify(data))
    );

    return {
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(encrypted)
    };
  }

  async decrypt(encryptedData, key) {
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    const data = this.base64ToArrayBuffer(encryptedData.data);

    const decrypted = await crypto.subtle.decrypt(
      { name: this.algorithm, iv: new Uint8Array(iv) },
      key,
      data
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Usage
const encryptedStorage = new EncryptedStorage();

async function storeSensitiveData() {
  const key = await encryptedStorage.generateKey();
  
  // Store key in session storage (temporary)
  await chrome.storage.session.set({
    encryptionKey: await encryptedStorage.exportKey(key)
  });

  const sensitiveData = { ssn: '123-45-6789', password: 'secret' };
  const encrypted = await encryptedStorage.encrypt(sensitiveData, key);
  
  await chrome.storage.local.set({ sensitive: encrypted });
}

async function retrieveSensitiveData() {
  const { encryptionKey } = await chrome.storage.session.get('encryptionKey');
  const { sensitive } = await chrome.storage.local.get('sensitive');
  
  const key = await encryptedStorage.importKey(encryptionKey);
  return encryptedStorage.decrypt(sensitive, key);
}
```

## Watching for Changes {#watching-changes}

Chrome Storage provides a listener for monitoring changes across all contexts.

### Change Listeners

```javascript
// Monitor storage changes from any extension context
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log(`Storage changed in ${areaName}:`, changes);
  
  // Handle specific key changes
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    switch (key) {
      case 'settings':
        handleSettingsChange(newValue);
        break;
      case 'userProfile':
        handleProfileUpdate(newValue);
        break;
      case 'cache':
        handleCacheInvalidation(newValue);
        break;
    }
  }
});

function handleSettingsChange(newSettings) {
  // Apply theme changes
  if (newSettings?.theme) {
    document.documentElement.setAttribute('data-theme', newSettings.theme);
  }
  
  // Update UI based on new settings
  console.log('Settings updated:', newSettings);
}

function handleProfileUpdate(profile) {
  // Update user interface
  updateUserDisplay(profile);
}

function handleCacheInvalidation(cache) {
  // Clear local caches when storage cache is invalidated
  console.log('Cache invalidated at', cache?.timestamp);
}
```

### Cross-Context Communication

Use storage changes to coordinate between extension contexts:

```javascript
// In background script
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.syncToken?.newValue) {
    // Notify all tabs of new authentication
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'AUTH_TOKEN_UPDATED',
          token: changes.syncToken.newValue
        }).catch(() => {
          // Tab might not have content script
        });
      });
    });
  }
});

// Content script listens for background messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_TOKEN_UPDATED') {
    updateAuthState(message.token);
  }
});
```

## Cross-Context Storage Access {#cross-context}

Chrome extensions run in multiple contexts that must share data efficiently.

### Data Sharing Patterns

```javascript
// Background script - manages master data
async function initializeSharedData() {
  await chrome.storage.local.set({
    appState: {
      initialized: true,
      version: '1.0.0',
      lastUpdate: Date.now()
    }
  });
}

// Popup - reads shared data
async function loadPopupData() {
  const { appState } = await chrome.storage.local.get('appState');
  renderUI(appState);
}

// Content script - synchronized state
async function syncWithStorage() {
  // Read initial state
  const { appState } = await chrome.storage.local.get('appState');
  
  // Listen for updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.appState) {
      handleStateChange(changes.appState.newValue);
    }
  });
}
```

### Service Worker Considerations

With Manifest V3, service workers are ephemeral. Use storage for persistence:

```javascript
// Service worker - cache data locally for runtime access
let cachedData = null;

chrome.runtime.onInstalled.addListener(async () => {
  // Load data into memory on install
  const result = await chrome.storage.local.get('criticalData');
  cachedData = result.criticalData;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    // Return cached data immediately
    sendResponse({ data: cachedData });
  }
  
  if (message.type === 'UPDATE_DATA') {
    // Update both storage and cache
    (async () => {
      await chrome.storage.local.set({ criticalData: message.data });
      cachedData = message.data;
      sendResponse({ success: true });
    })();
    
    return true; // Keep message channel open for async response
  }
});

// Periodic refresh from storage
setInterval(async () => {
  const result = await chrome.storage.local.get('criticalData');
  cachedData = result.criticalData;
}, 60000); // Refresh every minute
```

## Performance Benchmarks {#performance}

Understanding storage performance helps optimize your extension's responsiveness.

### Operation Timing

```javascript
class StorageBenchmark {
  async benchmarkWrite(storageArea, iterations = 100) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await storageArea.set({ [`bench_${i}`]: { data: 'x'.repeat(1000) } });
      const end = performance.now();
      times.push(end - start);
    }
    
    return this.calculateStats(times);
  }

  async benchmarkRead(storageArea, keys, iterations = 100) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await storageArea.get(keys);
      const end = performance.now();
      times.push(end - start);
    }
    
    return this.calculateStats(times);
  }

  calculateStats(times) {
    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    
    return {
      mean: sum / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }

  async runFullBenchmark() {
    console.log('Benchmarking chrome.storage.local...');
    const localWrite = await this.benchmarkWrite(chrome.storage.local);
    const localRead = await this.benchmarkRead(chrome.storage.local, Array(10).fill(0).map((_, i) => `bench_${i}`));
    
    console.log('Benchmarking chrome.storage.sync...');
    const syncWrite = await this.benchmarkWrite(chrome.storage.sync);
    const syncRead = await this.benchmarkRead(chrome.storage.sync, Array(10).fill(0).map((_, i) => `bench_${i}`));
    
    return { local: { write: localWrite, read: localRead }, sync: { write: syncWrite, read: syncRead } };
  }
}
```

### Optimization Recommendations

Based on typical performance characteristics:

1. **Batch related operations**: Combine multiple writes into single `set()` calls
2. **Use appropriate storage type**: Local storage is faster than sync for non-critical data
3. **Minimize data size**: Store references or IDs instead of full objects when possible
4. **Cache frequently accessed data**: Keep hot data in memory, sync periodically
5. **Use session storage for ephemeral data**: Faster access for temporary data

---

## Cross-References {#cross-references}

- [Storage API](../guides/storage-api.md) - Core storage API documentation
- [Storage Sync Strategies](../guides/chrome-storage-sync-strategies.md) - Deep dive into sync vs local storage
- [IndexedDB Storage](../guides/chrome-extension-indexeddb-storage.md) - Using IndexedDB for large datasets
- [chrome.storage TypeScript Guide](../guides/typescript-extensions.md) - Type-safe storage with TypeScript

## Related Articles

- [State Management](../patterns/state-management.md) - Managing application state across contexts
- [Performance Optimization](../guides/performance.md) - General performance techniques for extensions
- [Security Best Practices](../guides/security-best-practices.md) - Secure data handling patterns
- [Extension Updates](../guides/extension-updates.md) - Handling data during extension updates
- [Enterprise Deployment](../guides/enterprise-deployment.md) - Managed storage for enterprise environments

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
