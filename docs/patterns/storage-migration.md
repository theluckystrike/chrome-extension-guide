---
layout: default
title: "Chrome Extension Storage Migration. Best Practices"
description: "Migrate between storage APIs safely."
canonical_url: "https://bestchromeextensions.com/patterns/storage-migration/"
last_modified_at: 2026-01-15
---

Storage Area Migration Pattern

Overview {#overview}

The Storage Area Migration Pattern provides a structured approach for moving data between different `chrome.storage` areas, handling quota limitations, and migrating from deprecated storage mechanisms in Manifest V2 to the more secure chrome.storage APIs in Manifest V3.

This pattern addresses three primary scenarios:
- Moving data between storage areas (local, sync, session)
- Handling sync storage quota limits by splitting large data
- Migrating from localStorage to chrome.storage when upgrading from MV2 to MV3

When to Migrate {#when-to-migrate}

There are several scenarios where storage migration becomes necessary:

1. Cross-device synchronization: Moving from `storage.local` to `storage.sync` enables users to access their data across multiple devices signed into the same Chrome profile.

2. Data segmentation: Splitting data so that small configuration items live in `storage.sync` while larger data sets remain in `storage.local`.

3. Manifest V2 to V3 migration: Service workers in MV3 cannot access `localStorage`, requiring a bridge to transfer data to `chrome.storage`.

4. Schema version upgrades: When changing the data schema between extension versions, migration ensures existing user data is preserved in the new format.

Local to Sync Migration {#local-to-sync-migration}

The simplest migration moves data from `storage.local` to `storage.sync`. This process must account for sync's strict quota limits:

```js
async function migrateLocalToSync() {
  const data = await chrome.storage.local.get(null);
  
  // Check total size (sync limit: 100KB total)
  const totalSize = JSON.stringify(data).length;
  if (totalSize > 102400) {
    throw new Error('Data exceeds sync quota of 100KB');
  }
  
  // Check individual item sizes (8KB per item limit)
  for (const [key, value] of Object.entries(data)) {
    const itemSize = JSON.stringify(value).length;
    if (itemSize > 8192) {
      throw new Error(`Item "${key}" exceeds 8KB limit`);
    }
  }
  
  // Write to sync
  await chrome.storage.sync.set(data);
  
  // Verify write succeeded
  const verification = await chrome.storage.sync.get(null);
  if (JSON.stringify(verification) !== JSON.stringify(data)) {
    throw new Error('Migration verification failed');
  }
  
  // Clear local after successful migration
  await chrome.storage.local.clear();
}
```

Sync Quota Handling {#sync-quota-handling}

The `storage.sync` API imposes strict quota limits that require careful handling:

| Limit Type | Value | Description |
|------------|-------|-------------|
| QUOTA_BYTES | 102400 | Maximum total storage (100KB) |
| QUOTA_BYTES_PER_ITEM | 8192 | Maximum per item (8KB) |

To stay within these limits, adopt a tiered storage strategy:

```js
async function getStorageStrategy() {
  return {
    // Small config settings go to sync
    sync: ['theme', 'language', 'autoUpdate', 'notificationsEnabled'],
    // Large data sets stay in local
    local: ['cachedData', 'userHistory', 'largePreferences']
  };
}
```

Chunking Large Values {#chunking-large-values}

When you need to store values larger than 8KB in sync, chunking provides a solution:

```js
const CHUNK_SIZE = 8000; // Leave buffer under 8KB limit

function chunkString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.substring(i, i + size));
  }
  return chunks;
}

async function saveLargeValue(key, value) {
  const str = JSON.stringify(value);
  const chunks = chunkString(str, CHUNK_SIZE);
  
  // Store chunk count in metadata
  await chrome.storage.sync.set({
    [`${key}_meta`]: { chunks: chunks.length, originalKey: key }
  });
  
  // Store each chunk
  for (let i = 0; i < chunks.length; i++) {
    await chrome.storage.sync.set({ [`${key}_${i}`]: chunks[i] });
  }
}

async function readLargeValue(key) {
  const meta = await chrome.storage.sync.get(`${key}_meta`);
  if (!meta[`${key}_meta`]) return null;
  
  const { chunks } = meta[`${key}_meta`];
  const parts = [];
  
  for (let i = 0; i < chunks; i++) {
    const chunk = await chrome.storage.sync.get(`${key}_${i}`);
    parts.push(chunk[`${key}_${i}`]);
  }
  
  return JSON.parse(parts.join(''));
}
```

localStorage to chrome.storage (MV3) {#localstorage-to-chromestorage-mv3}

Service workers cannot access `localStorage` in Manifest V3. Use a content script or popup as a bridge:

```js
// In content script or popup (runs in context with localStorage)
async function migrateFromLocalStorage() {
  const data = {};
  
  // Read all localStorage data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    try {
      data[key] = JSON.parse(localStorage.getItem(key));
    } catch {
      data[key] = localStorage.getItem(key);
    }
  }
  
  // Send to service worker
  await chrome.runtime.sendMessage({
    type: 'MIGRATE_STORAGE',
    data: data
  });
  
  // Clear localStorage after successful transfer
  localStorage.clear();
}

// In service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MIGRATE_STORAGE') {
    chrome.storage.local.set(message.data)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});
```

Atomic Migration {#atomic-migration}

For reliable migrations, follow an atomic pattern that prevents data loss:

```js
async function atomicMigrate(sourceArea, targetArea, data) {
  // Step 1: Read old data
  const oldData = await chrome.storage[sourceArea].get(null);
  
  // Step 2: Write to new location
  await chrome.storage[targetArea].set(data);
  
  // Step 3: Verify new data matches
  const verification = await chrome.storage[targetArea].get(null);
  if (JSON.stringify(verification) !== JSON.stringify(data)) {
    // Rollback: clear target if verification fails
    await chrome.storage[targetArea].clear();
    throw new Error('Migration failed - rolled back');
  }
  
  // Step 4: Only delete old data after verification
  await chrome.storage[sourceArea].clear();
  
  // Step 5: Store migration flag
  await chrome.storage.local.set({ 
    migration_complete: { from: sourceArea, to: targetArea, date: Date.now() } 
  });
}

// Check migration status before running
async function needsMigration() {
  const { migration_complete } = await chrome.storage.local.get('migration_complete');
  return !migration_complete;
}
```

Code Examples {#code-examples}

Complete Migration Runner {#complete-migration-runner}

```js
class StorageMigration {
  constructor(options = {}) {
    this.sourceArea = options.sourceArea || 'local';
    this.targetArea = options.targetArea || 'sync';
    this.chunkThreshold = options.chunkThreshold || 8192;
  }
  
  async run() {
    if (!await this.needsMigration()) {
      console.log('Migration already completed');
      return;
    }
    
    const data = await chrome.storage[this.sourceArea].get(null);
    await this.migrateWithChunking(data);
    await this.markComplete();
  }
  
  async migrateWithChunking(data) {
    const prepared = {};
    
    for (const [key, value] of Object.entries(data)) {
      const size = JSON.stringify(value).length;
      
      if (size > this.chunkThreshold) {
        await this.saveChunked(key, value);
      } else {
        prepared[key] = value;
      }
    }
    
    await chrome.storage[this.targetArea].set(prepared);
  }
  
  async saveChunked(key, value) {
    // Implementation from chunking section
  }
  
  async needsMigration() {
    const { migration_done } = await chrome.storage.local.get('migration_done');
    return !migration_done;
  }
  
  async markComplete() {
    await chrome.storage.local.set({ migration_done: true });
  }
}
```

Migration Verification {#migration-verification}

```js
async function verifyMigration(sourceArea, targetArea, originalData) {
  const migratedData = await chrome.storage[targetArea].get(null);
  
  const sourceSize = JSON.stringify(originalData).length;
  const targetSize = JSON.stringify(migratedData).length;
  
  return {
    success: sourceSize === targetSize,
    sourceSize,
    targetSize,
    itemCount: Object.keys(migratedData).length
  };
}
```

Rollback Strategy {#rollback-strategy}

If migration fails, implement a rollback mechanism:

```js
async function migrateWithRollback() {
  // Backup current state
  const backup = await chrome.storage.local.get(null);
  await chrome.storage.local.set({ rollback_backup: backup });
  
  try {
    await atomicMigrate('local', 'sync', await getMigratableData());
  } catch (error) {
    // Restore from backup
    const { rollback_backup } = await chrome.storage.local.get('rollback_backup');
    await chrome.storage.local.set(rollback_backup);
    await chrome.storage.local.remove('rollback_backup');
    throw error;
  }
}
```

Cross-References {#cross-references}

- [Migration Wizard Pattern](./migration-wizard.md) - UI-driven migration workflows
- [Storage Patterns Reference](../reference/storage-patterns.md) - Complete storage API reference
- [Size Limits Reference](../reference/size-limits.md) - Detailed quota and limit specifications

See Also {#see-also}

- [Chrome Storage API Documentation](https://developer.chrome.com/docs/extensions/storage)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
