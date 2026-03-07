# Chrome Management API

## Overview
The `chrome.management` API provides powerful capabilities for managing installed extensions and apps within Chrome. It enables querying extension information, controlling enabled/disabled state, uninstalling extensions, and listening for installation events. Essential for building extension managers, enterprise policy tools, and productivity applications.

## Required Permission
```json
{
  "permissions": ["management"]
}
```
Note: The "management" permission is considered a "strong" permission requiring review during Chrome Web Store submission.

## Core Methods

### chrome.management.getAll()
Returns all installed extensions and apps:
```javascript
async function getAllExtensions() {
  const extensions = await chrome.management.getAll();
  const exts = extensions.filter(ext => ext.type === 'extension');
  const enabled = extensions.filter(ext => ext.enabled);
  return { all: extensions, extensionsOnly: exts, enabled };
}
```

### chrome.management.get(id)
Get info about a specific extension:
```javascript
async function getExtensionInfo(extensionId) {
  try {
    return await chrome.management.get(extensionId);
  } catch (error) {
    console.error('Extension not found:', error);
    return null;
  }
}
```

### chrome.management.getSelf()
Get info about your own extension:
```javascript
async function getSelfInfo() {
  return await chrome.management.getSelf();
}
// Returns: { id, version, name, enabled, mayDisable, installType, ... }
```

### chrome.management.setEnabled(id, enabled)
Enable or disable an extension:
```javascript
async function toggleExtension(extensionId) {
  const ext = await chrome.management.get(extensionId);
  await chrome.management.setEnabled(extensionId, !ext.enabled);
}

async function disableExtension(extensionId) {
  await chrome.management.setEnabled(extensionId, false);
}
```

### chrome.management.uninstall() and uninstallSelf()
Uninstall extensions programmatically:
```javascript
// Uninstall another extension (shows confirmation dialog)
await chrome.management.uninstall(extensionId, { showConfirmDialog: true });

// Silent uninstall (enterprise scenarios)
await chrome.management.uninstall(extensionId, { showConfirmDialog: false });

// Extension uninstalls itself
chrome.management.uninstallSelf({ showConfirmDialog: true });
```

### chrome.management.getPermissionWarningsById(id)
Get permission warnings before installation:
```javascript
async function checkPermissionWarnings(extensionId) {
  const warnings = await chrome.management.getPermissionWarningsById(extensionId);
  console.log('Permission warnings:', warnings);
}
```

## Events

### onInstalled
Listen for new extension installations:
```javascript
chrome.management.onInstalled.addListener((extensionInfo) => {
  console.log('Installed:', extensionInfo.name, extensionInfo.id);
});
```

### onUninstalled
Listen for uninstallations:
```javascript
chrome.management.onUninstalled.addListener((extensionId) => {
  console.log('Uninstalled:', extensionId);
});
```

### onEnabled / onDisabled
Listen for state changes:
```javascript
chrome.management.onEnabled.addListener((extensionInfo) => {
  console.log('Enabled:', extensionInfo.name);
});

chrome.management.onDisabled.addListener((extensionInfo) => {
  console.log('Disabled:', extensionInfo.name, extensionInfo.disabledReason);
});
```

## Use Cases

### Extension Manager Dashboard
```javascript
class ExtensionManager {
  constructor() {
    this.extensions = [];
    this.load();
    this.setupListeners();
  }

  async load() {
    this.extensions = await chrome.management.getAll();
    this.render();
  }

  setupListeners() {
    chrome.management.onInstalled.addListener(() => this.load());
    chrome.management.onUninstalled.addListener(() => this.load());
    chrome.management.onEnabled.addListener(() => this.load());
    chrome.management.onDisabled.addListener(() => this.load());
  }

  render() {
    // Render extension list with enable/disable/uninstall controls
  }
}
```

### Conflict Detection
Detect extensions with conflicting permissions:
```javascript
async function detectConflicts() {
  const extensions = await chrome.management.getAll();
  const conflicts = [];

  for (const ext of extensions) {
    const allPerms = [...ext.permissions, ...ext.hostPermissions];
    if (allPerms.includes('webRequest') && allPerms.includes('declarativeNetRequest')) {
      conflicts.push({ ext, issue: 'Multiple blocking APIs detected' });
    }
  }
  return conflicts;
}
```

### Dependency Checking
Check if required extensions are installed:
```javascript
async function checkDependencies(requiredIds) {
  const extensions = await chrome.management.getAll();
  const installed = new Set(extensions.map(e => e.id));

  const missing = requiredIds.filter(id => !installed.has(id));
  return { installed: requiredIds.filter(id => installed.has(id)), missing };
}
```

## ExtensionInfo Properties
Key properties returned by the API:
- `id`: Unique extension identifier
- `name`, `version`, `description`: Basic info
- `enabled`: Current enabled state
- `permissions`, `hostPermissions`: Granted permissions
- `icons`: Array of available icon sizes
- `type`: "extension", "theme", or "app"
- `installType`: "normal", "development", or "policy"
- `mayDisable`: Whether user can disable this extension
- `disabledReason`: Reason if disabled (e.g., "permissions_increase")

## Important Limitations
1. Cannot manage extensions installed by enterprise policy in some cases
2. Built-in Chrome extensions cannot be disabled
3. Self-uninstall always requires user confirmation
4. Management permission requires Chrome Web Store review

## Reference
Official documentation: https://developer.chrome.com/docs/extensions/reference/api/management
