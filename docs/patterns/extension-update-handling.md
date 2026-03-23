---
layout: default
title: "Chrome Extension Extension Update Handling. Best Practices"
description: "Handle extension updates and notify users."
canonical_url: "https://bestchromeextensions.com/patterns/extension-update-handling/"
---

# Extension Update Handling

Graceful handling of extension updates is critical for maintaining user data integrity and a smooth experience. This pattern covers the complete update lifecycle.

The `onInstalled` Event {#the-oninstalled-event}

Chrome provides `chrome.runtime.onInstalled` to detect extension lifecycle events:

```typescript
chrome.runtime.onInstalled.addListener((details) => {
  switch (details.reason) {
    case 'install':
      // First-time installation
      initializeDefaultSettings();
      break;
    case 'update':
      // Extension was updated
      handleUpdate(details.previousVersion);
      break;
    case 'chrome_update':
      // Chrome itself was updated
      handleChromeUpdate();
      break;
  }
});
```

Detecting Version Changes {#detecting-version-changes}

Compare the current manifest version with the stored previous version:

```typescript
async function handleUpdate(previousVersion: string): Promise<void> {
  const currentVersion = chrome.runtime.getManifest().version;
  
  if (previousVersion === currentVersion) {
    return; // No meaningful version change
  }
  
  console.log(`Updating from ${previousVersion} to ${currentVersion}`);
  
  // Run sequential migrations
  await runMigrations(previousVersion, currentVersion);
  
  // Update stored version
  await chrome.storage.local.set({ extensionVersion: currentVersion });
}
```

Sequential Version Migrations {#sequential-version-migrations}

Run migrations in order to handle incremental changes:

```typescript
interface Migration {
  version: string;
  migrate: () => Promise<void>;
}

const migrations: Migration[] = [
  { version: '2.1.0', migrate: migrateV210 },
  { version: '2.2.0', migrate: migrateV220 },
  { version: '3.0.0', migrate: migrateV300 },
];

async function runMigrations(fromVersion: string, toVersion: string): Promise<void> {
  for (const migration of migrations) {
    if (isVersionNewer(migration.version, fromVersion) && 
        !isVersionNewer(migration.version, toVersion)) {
      await migration.migrate();
    }
  }
}
```

Storage Schema Upgrades {#storage-schema-upgrades}

Handle storage schema changes safely:

```typescript
async function migrateV210(): Promise<void> {
  const data = await chrome.storage.local.get(['settings', 'userPrefs']);
  
  // Add new fields with defaults
  const upgradedSettings = {
    ...data.settings,
    theme: data.settings?.theme || 'system',
    notifications: true,
    lastUpdated: Date.now(),
  };
  
  // Rename keys if needed
  if ('userprefs' in data) {
    upgradedSettings.preferences = data.userprefs;
  }
  
  // Keep backup before migrating
  await chrome.storage.local.set({ 
    settings_backup_v210: data.settings 
  });
  
  await chrome.storage.local.set({ settings: upgradedSettings });
}
```

Content Script Reconnection {#content-script-reconnection}

After updates, existing content scripts may fail with "Receiving end does not exist":

```typescript
async function reconnectContentScripts(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, status: 'complete' });
  
  for (const tab of tabs) {
    if (tab.id && isExtensionPage(tab.url)) {
      // Re-inject content scripts
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
    }
  }
}
```

Preserving User State {#preserving-user-state}

Always backup user data before migrations:

```typescript
async function withRollback(
  operation: () => Promise<void>
): Promise<void> {
  const storage = await chrome.storage.local.get(null);
  const backupKey = `backup_${Date.now()}`;
  
  try {
    // Create backup
    await chrome.storage.local.set({ [backupKey]: storage });
    
    // Perform operation
    await operation();
    
    // Clear old backups (keep last 3)
    await cleanupOldBackups();
  } catch (error) {
    // Rollback on failure
    const backup = await chrome.storage.local.get(backupKey);
    await chrome.storage.local.set(backup[backupKey]);
    throw error;
  } finally {
    // Remove immediate backup after success or manual rollback
    await chrome.storage.local.remove(backupKey);
  }
}
```

Testing Updates Locally {#testing-updates-locally}

Use `chrome.management.setEnabled` or reload the extension in developer mode:

```typescript
// Reload extension after making changes
async function reloadExtension(): Promise<void> {
  const extInfo = await chrome.management.get(chrome.runtime.id);
  await chrome.management.setEnabled(extInfo.id, false);
  await chrome.management.setEnabled(extInfo.id, true);
}
```

Summary {#summary}

- Use `chrome.runtime.onInstalled` to detect update reason
- Compare manifest version with stored version
- Run sequential migrations in version order
- Always backup data before schema changes
- Re-inject content scripts after updates
- Implement rollback strategies for critical migrations

Related Patterns {#related-patterns}

- [Update Migration](./update-migration.md) - Detailed migration patterns
- [Storage Migration](./storage-migration.md) - Storage schema upgrades
- [Extension Updates Guide](../guides/extension-updates.md) - Complete update handling guide
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
