# chrome.management API Reference

## Overview

The `chrome.management` API provides functions and events to manage installed extensions and apps. It allows you to query information about extensions, enable or disable them, and uninstall them programmatically.

- **Permission:** `"management"`
- **Availability:** Chrome, Edge, Opera

## API Methods

### Query Extensions

#### `chrome.management.getAll(callback)`

Retrieves a list of information about all installed extensions and apps.

```javascript
chrome.management.getAll((extensions) => {
  extensions.forEach(ext => {
    console.log(`${ext.name}: ${ext.enabled}`);
  });
});
```

**Returns:** Array of [ExtensionInfo](#extensioninfo-type) objects

---

#### `chrome.management.get(id, callback)`

Gets information about a specific extension or app by its ID.

```javascript
chrome.management.get(' extensão-id-here', (extensionInfo) => {
  console.log(extensionInfo.name);
});
```

**Parameters:**
- `id` (string): The ID of the extension/app

**Returns:** [ExtensionInfo](#extensioninfo-type) object

---

#### `chrome.management.getSelf(callback)`

Gets information about the calling extension. Does not require the management permission.

```javascript
chrome.management.getSelf((selfInfo) => {
  console.log(`Running: ${selfInfo.name} v${selfInfo.version}`);
});
```

**Returns:** [ExtensionInfo](#extensioninfo-type) object

---

#### `chrome.management.getPermissionWarningsById(id, callback)`

Gets the permission warnings for a specific extension by its ID.

```javascript
chrome.management.getPermissionWarningsById(' extension-id', (warnings) => {
  warnings.forEach(warning => console.log(warning));
});
```

---

#### `chrome.management.getPermissionWarningsByManifest(manifestStr, callback)`

Gets permission warnings for a manifest string without installing the extension.

```javascript
const manifest = JSON.stringify({
  "name": "Test",
  "version": "1.0",
  "permissions": ["tabs", "storage"]
});
chrome.management.getPermissionWarningsByManifest(manifest, (warnings) => {
  console.log(warnings);
});
```

---

### Control Extensions

#### `chrome.management.setEnabled(id, enabled, callback)`

Enables or disables an extension or app.

```javascript
// Disable an extension
chrome.management.setEnabled('extension-id', false, () => {
  console.log('Extension disabled');
});

// Enable an extension
chrome.management.setEnabled('extension-id', true, () => {
  console.log('Extension enabled');
});
```

**Parameters:**
- `id` (string): The ID of the extension/app
- `enabled` (boolean): True to enable, false to disable

---

#### `chrome.management.uninstall(id, options, callback)`

Uninstalls an extension or app.

```javascript
chrome.management.uninstall('extension-id', {
  showConfirmDialog: true
}, () => {
  console.log('Uninstalled');
});
```

**Parameters:**
- `id` (string): The ID of the extension/app
- `options` (object): Optional
  - `showConfirmDialog` (boolean): Whether to show confirmation dialog

---

#### `chrome.management.uninstallSelf(options, callback)`

Uninstalls the calling extension.

```javascript
chrome.management.uninstallSelf({
  showConfirmDialog: true
}, () => {
  console.log('Self-uninstalled');
});
```

---

## ExtensionInfo Type

The `ExtensionInfo` object contains detailed information about an extension or app:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Display name |
| `shortName` | string | Short name |
| `description` | string | Extension description |
| `version` | string | Version number |
| `versionName` | string | Version name (if available) |
| `type` | string | "extension", "hosted_app", "packaged_app", "legacy_packaged_app", or "theme" |
| `enabled` | boolean | Whether currently enabled |
| `disabledReason` | string | Reason if disabled: "unknown", "permissions_increase", "corporate_policy" |
| `isApp` | boolean | Whether it's an app |
| `homepageUrl` | string | Homepage URL |
| `updateUrl` | string | Update URL |
| `permissions` | array | Array of permission strings |
| `hostPermissions` | array | Array of host permission strings |
| `installType` | string | "admin", "development", "normal", "sideload", or "other" |
| `icons` | array | Array of icon objects `{ size, url }` |

---

## Events

### `chrome.management.onInstalled.addListener(callback)`

Fired when an extension or app is installed.

```javascript
chrome.management.onInstalled.addListener((extensionInfo) => {
  console.log(`Installed: ${extensionInfo.name}`);
});
```

---

### `chrome.management.onUninstalled.addListener(callback)`

Fired when an extension or app is uninstalled.

```javascript
chrome.management.onUninstalled.addListener((id) => {
  console.log(`Uninstalled: ${id}`);
});
```

---

### `chrome.management.onEnabled.addListener(callback)`

Fired when an extension or app is enabled.

```javascript
chrome.management.onEnabled.addListener((extensionInfo) => {
  console.log(`Enabled: ${extensionInfo.name}`);
});
```

---

### `chrome.management.onDisabled.addListener(callback)`

Fired when an extension or app is disabled.

```javascript
chrome.management.onDisabled.addListener((extensionInfo) => {
  console.log(`Disabled: ${extensionInfo.name}`);
});
```

---

## Code Examples

### List All Installed Extensions

```javascript
function listExtensions() {
  chrome.management.getAll((extensions) => {
    const exts = extensions.filter(e => e.type === 'extension');
    exts.forEach(ext => {
      console.log(`${ext.name} (${ext.id})`);
      console.log(`  Enabled: ${ext.enabled}`);
      console.log(`  Version: ${ext.version}`);
    });
  });
}
```

### Disable Conflicting Extension

```javascript
function disableExtension(extensionId) {
  chrome.management.setEnabled(extensionId, false, () => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
    } else {
      console.log('Extension disabled successfully');
    }
  });
}
```

### Self-Uninstall with Confirmation

```javascript
function uninstallSelf() {
  chrome.management.uninstallSelf({
    showConfirmDialog: true
  }, () => {
    console.log('Uninstall initiated');
  });
}
```

### Monitor Extension Changes

```javascript
// Listen for all management events
chrome.management.onInstalled.addListener(info => {
  console.log(`Installed: ${info.name}`);
});

chrome.management.onUninstalled.addListener(id => {
  console.log(`Uninstalled: ${id}`);
});

chrome.management.onEnabled.addListener(info => {
  console.log(`Enabled: ${info.name}`);
});

chrome.management.onDisabled.addListener(info => {
  console.log(`Disabled: ${info.name}`);
});
```

---

## Cross-references

- [Management Permission](../permissions/management.md) - Permission requirements and manifest configuration
- [Management API Guide](../guides/management-api.md) - Practical guide for building extension managers
