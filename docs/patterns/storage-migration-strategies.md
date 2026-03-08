---
layout: default
title: "Chrome Extension Storage Migration Strategies — Best Practices"
description: "Migrate data between storage APIs when updating extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/storage-migration-strategies/"
---

# Storage Migration Strategies

Strategies for migrating extension storage data between versions.

## Overview

When your extension evolves, the data schema stored in chrome.storage often needs to change. A robust migration system ensures user data is preserved and transformed correctly during updates.

## Schema Versioning

Store a version number in storage and check it on startup:

```javascript
const CURRENT_VERSION = 3;

async function initializeStorage() {
  const { schemaVersion = 0 } = await chrome.storage.local.get('schemaVersion');
  
  if (schemaVersion < CURRENT_VERSION) {
    await runMigrations(schemaVersion, CURRENT_VERSION);
  }
}
```

## Sequential Migrations

Run migration functions in order (v1→v2, v2→v3, etc.):

```javascript
const migrations = {
  1: migrateV1toV2,
  2: migrateV2toV3,
};

async function runMigrations(fromVersion, toVersion) {
  for (let v = fromVersion; v < toVersion; v++) {
    await migrations[v]();
    await chrome.storage.local.set({ schemaVersion: v + 1 });
  }
}
```

## Idempotent Migrations

Design migrations to be safe if interrupted or re-run:

```javascript
async function migrateV1toV2() {
  const data = await chrome.storage.local.get(null);
  
  // Check if already migrated
  if (data.settings?.theme) return;
  
  // Safe to run again even if partially complete
  const newSettings = { theme: data.theme || 'light' };
  await chrome.storage.local.set({ settings: newSettings });
}
```

## Backup Before Migration

Copy data to a backup key before transforming:

```javascript
async function backupBeforeMigration() {
  const allData = await chrome.storage.local.get(null);
  const backup = {
    data: allData,
    timestamp: Date.now(),
    version: allData.schemaVersion
  };
  await chrome.storage.local.set({ _backup: backup });
}
```

## Lazy Migration

Transform data on read rather than all at once:

```javascript
async function getSettings() {
  const { settings, _needsMigration } = await chrome.storage.local.get(['settings', '_needsMigration']);
  
  if (_needsMigration === 'v2') {
    return await migrateSettingsOnRead(settings);
  }
  return settings;
}
```

## Common Migration Patterns

### Field Additions
Merge new defaults with existing data:

```javascript
async function addField() {
  const data = await chrome.storage.local.get('userPrefs');
  const defaults = { theme: 'light', notifications: true };
  await chrome.storage.local.set({ 
    userPrefs: { ...defaults, ...data.userPrefs } 
  });
}
```

### Field Renames
Copy old key to new key, delete old:

```javascript
async function renameField() {
  const { oldName } = await chrome.storage.local.get('oldName');
  if (oldName !== undefined) {
    await chrome.storage.local.set({ displayName: oldName });
    await chrome.storage.local.remove('oldName');
  }
}
```

### Type Changes
Transform stored values to new format:

```javascript
async function changeType() {
  const { count } = await chrome.storage.local.get('count');
  // String to number
  if (typeof count === 'string') {
    await chrome.storage.local.set({ count: parseInt(count, 10) });
  }
}
```

### Collection Restructuring
Array to map, nested to flat:

```javascript
async function restructureArray() {
  const { items } = await chrome.storage.local.get('items');
  const map = {};
  items.forEach((item, index) => {
    map[item.id] = item;
  });
  await chrome.storage.local.set({ items: map, _arrayMigrated: true });
}
```

## Handling Missing Data

Don't crash on unexpected schema:

```javascript
function safeGet(data, path, defaultValue = null) {
  try {
    return path.split('.').reduce((obj, key) => obj?.[key], data) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}
```

## Migration Testing

Test with real user data samples:

```javascript
// Test migration on sample data
const testCases = [
  { input: v1Data, expected: v2Data },
  { input: partialData, expected: mergedData },
];

testCases.forEach(({ input, expected }) => {
  const result = applyMigration(input);
  assert.deepEqual(result, expected);
});
```

## Rollback Support

Store pre-migration backup for N versions:

```javascript
async function createRollbackPoint() {
  const data = await chrome.storage.local.get(null);
  const backups = await chrome.storage.local.get('_backups') || {};
  
  backups._backups = [
    { data, timestamp: Date.now() },
    ...backups._backups?.slice(0, 2) // Keep last 3
  ];
  await chrome.storage.local.set(backups);
}
```

## Logging

Record migration steps for debugging:

```javascript
async function logMigration(from, to, status) {
  console.log(`[Migration] v${from} → v${to}: ${status}`);
  await chrome.storage.local.set({ 
    _migrationLog: `[${new Date().toISOString()}] v${from}→v${to}: ${status}` 
  });
}
```

## Async Migrations

Handle large data sets without blocking:

```javascript
async function migrateLargeDataset() {
  const { items } = await chrome.storage.local.get('items');
  const batchSize = 100;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processBatch(batch);
    await new Promise(r => setTimeout(r, 0)); // Yield to main thread
  }
}
```

## See Also

- [Storage Migration](./storage-migration.md)
- [Update Migration](./update-migration.md)
- [Extension Update Handling](./extension-update-handling.md)
