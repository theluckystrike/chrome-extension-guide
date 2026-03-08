---
layout: default
title: "Chrome Extension Extension Updates — Developer Guide"
description: "Learn Chrome extension extension updates with this developer guide covering implementation, best practices, and code examples."
---
# Handling Extension Updates

## chrome.runtime.onInstalled

The `chrome.runtime.onInstalled` event fires when your extension is first installed, updated to a new version, or when Chrome itself is updated. This is the central hook for handling both initial setup and updates.

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  switch (details.reason) {
    case "install":
      onFirstInstall();
      break;
    case "update":
      onUpdate(details.previousVersion);
      break;
    case "chrome_update":
      onChromeUpdate();
      break;
  }
});
```

The `details` object contains:
- `reason`: One of `"install"`, `"update"`, or `"chrome_update"`
- `previousVersion`: The version the extension was before the update (only for `"update"`)
- `id`: The extension ID (always available)

---

## First Install — Set Defaults

When your extension is installed for the first time, you need to initialize default settings, create alarms, and optionally show a welcome page.

Using `@theluckystrike/webext-storage` for storage:

```javascript
import { Storage } from '@theluckystrike/webext-storage';

const storage = new Storage({
  defaults: {
    schemaVersion: 1,
    theme: 'light',
    notifications: true,
    lastSync: null,
  }
});

async function onFirstInstall() {
  // Initialize storage with defaults
  await storage.init();
  
  // Create alarms for scheduled tasks
  await chrome.alarms.create('dailySync', {
    delayInMinutes: 5,
    periodInMinutes: 1440 // 24 hours
  });
  
  // Open welcome page
  chrome.tabs.create({
    url: 'welcome.html'
  });
  
  console.log('Extension installed for the first time');
}
```

---

## Update Handler — Run Migrations

When your extension is updated to a new version, you need to handle migrations, recreate alarms, and optionally show a "What's New" page.

```javascript
async function onUpdate(previousVersion) {
  const currentVersion = chrome.runtime.getManifest().version;
  
  console.log(`Updating from ${previousVersion} to ${currentVersion}`);
  
  // Run version-based migrations
  await runMigrations(previousVersion, currentVersion);
  
  // Recreate alarms (they may have been cleared)
  await recreateAlarms();
  
  // Show "What's New" page for significant updates
  if (isMajorUpdate(previousVersion, currentVersion)) {
    chrome.tabs.create({
      url: 'whats-new.html'
    });
  }
}

async function runMigrations(fromVersion, toVersion) {
  const migrations = [
    { from: '1.0.0', to: '1.1.0', fn: migrateV1toV11 },
    { from: '1.1.0', to: '1.2.0', fn: migrateV11toV12 },
    { from: '1.2.0', to: '2.0.0', fn: migrateV12toV20 },
  ];
  
  for (const migration of migrations) {
    if (needsMigration(fromVersion, toVersion, migration.from, migration.to)) {
      await migration.fn();
    }
  }
}
```

---

## Storage Migration Pattern

When updating your extension, you may need to change your storage schema. Always use version-based migrations to safely transform user data.

### Version-Based Migrations

```javascript
const STORAGE_KEYS = {
  SCHEMA_VERSION: 'schemaVersion',
  USER_SETTINGS: 'userSettings',
  CACHE_DATA: 'cacheData'
};

async function migrateV11toV12() {
  // Read old data using raw chrome.storage
  const oldData = await chrome.storage.local.get(['settings', 'cache']);
  
  // Transform and store using new structure with @theluckystrike/webext-storage
  const storage = new Storage({
    defaults: {
      schemaVersion: 2,
      userPreferences: oldData.settings || {},
      cacheTimestamp: Date.now()
    }
  });
  
  await storage.init();
  
  // Clear old keys
  await chrome.storage.local.remove(['settings', 'cache']);
  
  console.log('Migration from v1.1.0 to v1.2.0 complete');
}
```

### Rename Keys Pattern

```javascript
async function migrateKeyNames() {
  const oldKeys = await chrome.storage.local.get(['oldTheme', 'oldNotification']);
  
  const updates = {};
  if (oldKeys.oldTheme !== undefined) {
    updates.theme = oldKeys.oldTheme;
  }
  if (oldKeys.oldNotification !== undefined) {
    updates.notifications = oldKeys.oldNotification;
  }
  
  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
    await chrome.storage.local.remove(['oldTheme', 'oldNotification']);
  }
}
```

### Add New Defaults

```javascript
async function addNewDefaults(currentVersion) {
  const storage = new Storage({
    defaults: {
      schemaVersion: currentVersion,
      // New settings that didn't exist before
      newFeatureEnabled: false,
      advancedMode: false,
    }
  });
  
  // This merges new defaults with existing data
  await storage.init();
}
```

---

## chrome.runtime.onStartup

The `chrome.runtime.onStartup` event fires when the browser profile starts, but NOT when the extension is installed or updated. Use this for initializing features on browser launch.

```javascript
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser started, initializing extension...');
  
  // Check if extension needs attention
  const storage = new Storage({ defaults: { schemaVersion: 1 }});
  await storage.init();
  
  // Restore alarm-based tasks
  await ensureAlarmsExist();
  
  // Resume any paused operations
  await resumeBackgroundTasks();
});
```

**Important**: This does NOT run on first install or update. It's purely for browser launch events.

---

## chrome.runtime.onUpdateAvailable

When a new version of your extension is available (published to the Chrome Web Store), this event fires. By default, the update will be applied when the browser restarts, but you can force an immediate reload.

```javascript
chrome.runtime.onUpdateAvailable.addListener((details) => {
  console.log(`New version available: ${details.version}`);
  
  // Optionally show a notification to the user
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Extension Updated',
    message: `Version ${details.version} is ready. Refresh to update.`
  });
  
  // Apply the update immediately (recommended for critical fixes)
  chrome.runtime.reload();
});
```

Without calling `chrome.runtime.reload()`, the update will be applied the next time the browser restarts.

---

## Version Comparison Utility Function

A reliable version comparison function is essential for determining when migrations are needed.

```javascript
/**
 * Compare two version strings
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 < p2) return -1;
    if (p1 > p2) return 2;
  }
  
  return 0;
}

/**
 * Check if version1 needs migration to version2
 */
function needsMigration(currentVersion, targetVersion, fromVersion, toVersion) {
  return compareVersions(currentVersion, fromVersion) >= 0 &&
         compareVersions(currentVersion, toVersion) < 0;
}

/**
 * Check if update is a major version change
 */
function isMajorUpdate(oldVersion, newVersion) {
  const oldMajor = parseInt(oldVersion.split('.')[0], 10);
  const newMajor = parseInt(newVersion.split('.')[0], 10);
  return newMajor > oldMajor;
}
```

---

## Best Practices

### 1. Handle All onInstalled Reasons

Always handle all three cases in your `onInstalled` listener:

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  switch (details.reason) {
    case 'install':
      // Initialize defaults, create resources
      break;
    case 'update':
      // Run migrations, update resources
      break;
    case 'chrome_update':
      // Handle Chrome version changes that may affect extension
      break;
  }
});
```

### 2. Store Schema Version

Always store and increment a schema version in your storage:

```javascript
const CURRENT_SCHEMA_VERSION = 3;

// On init
await chrome.storage.local.set({ schemaVersion: CURRENT_SCHEMA_VERSION });

// When checking for migrations
const { schemaVersion = 0 } = await chrome.storage.local.get('schemaVersion');
if (schemaVersion < CURRENT_SCHEMA_VERSION) {
  await runMigrations(schemaVersion, CURRENT_SCHEMA_VERSION);
}
```

### 3. Recreate Alarms

Alarms are cleared when an extension is updated. Always recreate them:

```javascript
async function recreateAlarms() {
  // Remove existing alarms first to avoid duplicates
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    await chrome.alarms.clear(alarm.name);
  }
  
  // Recreate with same configuration
  await chrome.alarms.create('dailySync', {
    delayInMinutes: 5,
    periodInMinutes: 1440
  });
  
  await chrome.alarms.create('hourlyCleanup', {
    periodInMinutes: 60
  });
}
```

### 4. Test Update Flow

To test your update handlers:

1. Load your extension in development mode
2. Make code changes
3. Click "Update" in `chrome://extensions` or use the Reload button
4. Check console logs for migration output
5. Verify storage contains correct schema version

---

## Common Mistakes

### Not Handling onInstalled

```javascript
// ❌ WRONG: Only handling install
chrome.runtime.onInstalled.addListener(() => {
  initializeDefaults();
});
```

```javascript
// ✅ CORRECT: Handle all cases
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    initializeDefaults();
  } else if (details.reason === 'update') {
    runMigrations(details.previousVersion);
  }
});
```

### Confusing onInstalled with onStartup

- **`onInstalled`**: Fires on first install, extension update, or Chrome update
- **`onStartup`**: Fires only when the browser profile starts

```javascript
// ❌ WRONG: Using onStartup for setup
chrome.runtime.onStartup.addListener(() => {
  initializeDefaults(); // This runs every browser start!
});

// ✅ CORRECT: Use appropriate handlers
chrome.runtime.onInstalled.addListener(() => {
  initializeDefaults(); // Run once on install/update
});

chrome.runtime.onStartup.addListener(() => {
  resumeTasks(); // Run on browser start
});
```

### Breaking Storage Without Migration

```javascript
// ❌ WRONG: Changing storage keys without migration
const storage = new Storage({
  defaults: {
    // Changed from 'enabled' to 'featureEnabled'
    featureEnabled: false
  }
});
// Users lose their 'enabled' setting!
```

```javascript
// ✅ CORRECT: Migrate old keys
async function migrateV1toV2() {
  const oldData = await chrome.storage.local.get('enabled');
  if (oldData.enabled !== undefined) {
    await chrome.storage.local.set({ featureEnabled: oldData.enabled });
    await chrome.storage.local.remove('enabled');
  }
}
```

---

## Summary

| Event | When It Fires | Use For |
|-------|--------------|---------|
| `chrome.runtime.onInstalled` | Install, update, Chrome update | Setting defaults, migrations |
| `chrome.runtime.onStartup` | Browser profile starts | Resuming tasks, initializing |
| `chrome.runtime.onUpdateAvailable` | New version from Web Store | Notifying user, forcing reload |

Always:
- Store a schema version in storage
- Implement version-based migrations
- Handle all `onInstalled` reasons
- Recreate alarms after updates
- Test your update flow thoroughly

## Related Articles

- [Update Handling](../patterns/extension-update-handling.md)
- [Extension Packaging](../guides/extension-packaging.md)
