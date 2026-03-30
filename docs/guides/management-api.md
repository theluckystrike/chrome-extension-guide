---
layout: default
title: "Chrome Extension Management API. Developer Guide"
description: "Learn how to use the Chrome Extension Management API with this developer guide covering methods, permissions, and implementation examples."
canonical_url: "https://bestchromeextensions.com/guides/management-api/"
last_modified_at: 2026-01-15
---
Chrome Extension Management API

Introduction {#introduction}

The `chrome.management` API provides powerful capabilities for managing installed extensions and apps within Chrome. This API enables you to query extension information, control their enabled/disabled state, uninstall extensions programmatically, and listen for installation/uninstallation events. It's essential for building extension manager dashboards, enterprise policy tools, and productivity applications that help users organize their browser environment.

Permissions and Setup {#permissions-and-setup}

Required Permissions {#required-permissions}

To use the `chrome.management` API, you need to declare the `"management"` permission in your extension's `manifest.json`:
Chrome Management API

Overview
The `chrome.management` API provides powerful capabilities for managing installed extensions and apps within Chrome. It enables querying extension information, controlling enabled/disabled state, uninstalling extensions, and listening for installation events. Essential for building extension managers, enterprise policy tools, and productivity applications.

Required Permission
```json
{
  "permissions": ["management"]
}
```
The "management" permission is considered a "strong" permission requiring review during Chrome Web Store submission.

Permission Scope {#permission-scope}

The `"management"` permission is considered a "strong" permission and requires review during Chrome Web Store submission. However, it cannot be used with `activeTab` or on Chrome Web Store listing pages. The permission grants access to:

- Get information about all installed extensions/apps
- Enable or disable any extension
- Uninstall any extension (with user confirmation)
- Listen to installation and state change events

Getting Extension Information {#getting-extension-information}

Listing All Installed Extensions {#listing-all-installed-extensions}

The `chrome.management.getAll()` method returns an array of all installed extensions and apps:
Core Methods

chrome.management.getAll()
Returns all installed extensions and apps:
```javascript
async function getAllExtensions() {
  const extensions = await chrome.management.getAll();
  const exts = extensions.filter(ext => ext.type === 'extension');
  const enabled = extensions.filter(ext => ext.enabled);
  return { all: extensions, extensionsOnly: exts, enabled };
}
```

Getting a Specific Extension {#getting-a-specific-extension}

Use `chrome.management.get()` with an extension ID to get details about a specific extension:

chrome.management.get(id)
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

Extension Info Object Structure {#extension-info-object-structure}

The `ExtensionInfo` object returned by the API contains comprehensive information:

chrome.management.getSelf()
Get info about your own extension:
```javascript
async function getSelfInfo() {
  return await chrome.management.getSelf();
}
// Returns: { id, version, name, enabled, mayDisable, installType, ... }
```

Working with Extension Icons {#working-with-extension-icons}

Displaying Extension Icons {#displaying-extension-icons}

Icons are stored in the `icons` array with different sizes. Here's how to properly display them:

```javascript
async function displayExtensionIcon(extensionId, imgElement) {
  const ext = await chrome.management.get(extensionId);
  
  if (ext.icons && ext.icons.length > 0) {
    // Get the largest available icon
    const largestIcon = ext.icons.reduce((prev, current) => {
      return (prev.size > current.size) ? prev : current;
    });
    
    imgElement.src = largestIcon.url;
    imgElement.alt = ext.name;
  } else {
    // Fallback to a default icon
    imgElement.src = '/images/default-icon.png';
  }
}

// Alternative: Get icon as data URL for background processing
async function getIconAsDataUrl(extensionId, size = 128) {
  const ext = await chrome.management.get(extensionId);
  
  if (!ext.icons || ext.icons.length === 0) {
    return null;
  }
  
  // Find closest size
  const icon = ext.icons.reduce((prev, curr) => {
    return (Math.abs(curr.size - size) < Math.abs(prev.size - size) ? curr : prev);
  });
  
  return icon.url;
}
```

Enabling and Disabling Extensions {#enabling-and-disabling-extensions}

Programmatic Control {#programmatic-control}

The API allows you to enable or disable extensions programmatically:

```javascript
// Enable an extension
async function enableExtension(extensionId) {
  try {
    await chrome.management.setEnabled(extensionId, true);
    console.log(`Extension ${extensionId} enabled successfully`);
  } catch (error) {
    console.error('Failed to enable extension:', error);
  }
}

// Disable an extension
async function disableExtension(extensionId) {
  try {
    await chrome.management.setEnabled(extensionId, false);
    console.log(`Extension ${extensionId} disabled successfully`);
  } catch (error) {
    console.error('Failed to disable extension:', error);
  }
}

// Toggle extension state
chrome.management.setEnabled(id, enabled)
Enable or disable an extension:
```javascript
async function toggleExtension(extensionId) {
  const ext = await chrome.management.get(extensionId);
  await chrome.management.setEnabled(extensionId, !ext.enabled);
}

Checking Can Enable/Disable {#checking-can-enabledisable}

Not all extensions can be enabled or disabled. Check before attempting:

```javascript
async function canToggleExtension(extensionId) {
  const ext = await chrome.management.get(extensionId);
  
  return {
    canEnable: !ext.enabled,
    canDisable: ext.mayDisable && ext.enabled,
    reason: ext.disabledReason
  };
}

// Example usage
const { canEnable, canDisable } = await canToggleExtension('abcdefghijklmnop');
if (!canDisable) {
  console.log('Extension cannot be disabled - may be required by policy');
}
```

Disabling with Reason {#disabling-with-reason}

Some extensions can be disabled programmatically with a reason:

async function disableExtension(extensionId) {
  await chrome.management.setEnabled(extensionId, false);
}
```

chrome.management.uninstall() and uninstallSelf()
Uninstall extensions programmatically:
```javascript
// Uninstall another extension (shows confirmation dialog)
await chrome.management.uninstall(extensionId, { showConfirmDialog: true });

Uninstalling Extensions {#uninstalling-extensions}

Programmatic Uninstall {#programmatic-uninstall}

Uninstall extensions with user confirmation:

```javascript
// Uninstall an extension
async function uninstallExtension(extensionId) {
  try {
    await chrome.management.uninstall(extensionId);
    console.log('Extension uninstalled successfully');
  } catch (error) {
    console.error('Failed to uninstall:', error);
  }
}

// Uninstall with showConfirmDialog option
async function uninstallWithConfirmation(extensionId) {
  try {
    await chrome.management.uninstall(extensionId, { showConfirmDialog: true });
  } catch (error) {
    // User cancelled or error occurred
    console.error('Uninstall cancelled or failed:', error);
  }
}
```

Silent Uninstall {#silent-uninstall}

For enterprise or internal use, you can silently uninstall without confirmation:

```javascript
// Silent uninstall (may require special permissions)
async function silentUninstall(extensionId) {
  try {
    await chrome.management.uninstall(extensionId, { showConfirmDialog: false });
  } catch (error) {
    console.error('Silent uninstall failed:', error);
  }
}
```

Self-Uninstall {#self-uninstall}

Extensions can uninstall themselves:

```javascript
// Silent uninstall (enterprise scenarios)
await chrome.management.uninstall(extensionId, { showConfirmDialog: false });

// Extension uninstalls itself
chrome.management.uninstallSelf({ showConfirmDialog: true });
```

chrome.management.getPermissionWarningsById(id)
Get permission warnings before installation:
```javascript
async function checkPermissionWarnings(extensionId) {
  const warnings = await chrome.management.getPermissionWarningsById(extensionId);
  console.log('Permission warnings:', warnings);
}
```

Listening to Events {#listening-to-events}

The Management API provides several events for monitoring extension state changes:

onInstalled Event {#oninstalled-event}
Events

onInstalled
Listen for new extension installations:
```javascript
chrome.management.onInstalled.addListener((extensionInfo) => {
  console.log('Installed:', extensionInfo.name, extensionInfo.id);
});
```

onUninstalled Event {#onuninstalled-event}

Listen for extension uninstallations:

onUninstalled
Listen for uninstallations:
```javascript
chrome.management.onUninstalled.addListener((extensionId) => {
  console.log('Uninstalled:', extensionId);
});
```

onEnabled Event {#onenabled-event}

Listen for extensions being enabled:

onEnabled / onDisabled
Listen for state changes:
```javascript
chrome.management.onEnabled.addListener((extensionInfo) => {
  console.log('Enabled:', extensionInfo.name);
});

onDisabled Event {#ondisabled-event}

Listen for extensions being disabled:

```javascript
chrome.management.onDisabled.addListener((extensionInfo) => {
  console.log('Disabled:', extensionInfo.name, extensionInfo.disabledReason);
});
```

Complete Event Listener Setup {#complete-event-listener-setup}

Here's a comprehensive example combining all events:
Use Cases

Extension Manager Dashboard
```javascript
class ExtensionEventMonitor {
  constructor() {
    this.installedExtensions = new Set();
    this.initializeListeners();
    this.loadInitialState();
  }
  
  async loadInitialState() {
    const extensions = await chrome.management.getAll();
    extensions.forEach(ext => this.installedExtensions.add(ext.id));
  }
  
  initializeListeners() {
    chrome.management.onInstalled.addListener((ext) => {
      console.log('[MANAGEMENT] Installed:', ext.name);
      this.installedExtensions.add(ext.id);
      this.handleInstallation(ext);
    });
    
    chrome.management.onUninstalled.addListener((extId) => {
      console.log('[MANAGEMENT] Uninstalled:', extId);
      this.installedExtensions.delete(extId);
      this.handleUninstallation(extId);
    });
    
    chrome.management.onEnabled.addListener((ext) => {
      console.log('[MANAGEMENT] Enabled:', ext.name);
      this.handleEnable(ext);
    });
    
    chrome.management.onDisabled.addListener((ext) => {
      console.log('[MANAGEMENT] Disabled:', ext.name);
      this.handleDisable(ext);
    });
  }
  
  handleInstallation(ext) {
    // Custom logic when extension is installed
  }
  
  handleUninstallation(extId) {
    // Custom logic when extension is uninstalled
  }
  
  handleEnable(ext) {
    // Custom logic when extension is enabled
  }
  
  handleDisable(ext) {
    // Custom logic when extension is disabled
  }
}
```

Building an Extension Manager Dashboard {#building-an-extension-manager-dashboard}

Complete Dashboard Example {#complete-dashboard-example}

Here's a full example of building an extension manager dashboard:

```javascript
// Dashboard state management
class ExtensionDashboard {
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

Conflict Detection
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

Advanced Dashboard Features {#advanced-dashboard-features}

Search and Filter

Dependency Checking
Check if required extensions are installed:
```javascript
async function checkDependencies(requiredIds) {
  const extensions = await chrome.management.getAll();
  const installed = new Set(extensions.map(e => e.id));

  const missing = requiredIds.filter(id => !installed.has(id));
  return { installed: requiredIds.filter(id => installed.has(id)), missing };
}
```

ExtensionInfo Properties
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

Important Limitations
1. Cannot manage extensions installed by enterprise policy in some cases
2. Built-in Chrome extensions cannot be disabled
3. Self-uninstall always requires user confirmation
4. Management permission requires Chrome Web Store review

Extension Usage Statistics

```javascript
// Track extension launch frequency
class ExtensionUsageTracker {
  constructor() {
    this.usageKey = 'extension_usage_stats';
  }
  
  async trackLaunch(extensionId) {
    const stats = await this.getStats();
    stats[extensionId] = (stats[extensionId] || 0) + 1;
    await chrome.storage.local.set({ [this.usageKey]: stats });
  }
  
  async getStats() {
    const result = await chrome.storage.local.get(this.usageKey);
    return result[this.usageKey] || {};
  }
  
  async getMostUsed(limit = 10) {
    const stats = await this.getStats();
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
}
```

Common Patterns and Best Practices {#common-patterns-and-best-practices}

Extension Self-Detection {#extension-self-detection}

```javascript
// Check if running within an extension context
function isExtensionContext() {
  return typeof chrome !== 'undefined' && chrome.management !== undefined;
}

// Get current extension's own info
async function getSelfInfo() {
  return await chrome.management.get(chrome.runtime.id);
}
```

Error Handling {#error-handling}

```javascript
// Solid error handling for management API
async function safeManagementOperation(operation, ...args) {
  try {
    const result = await operation(...args);
    return { success: true, data: result };
  } catch (error) {
    console.error('Management API error:', error);
    
    // Handle specific error types
    if (error.message?.includes('Extension not found')) {
      return { success: false, error: 'EXTENSION_NOT_FOUND' };
    }
    if (error.message?.includes('cannot disable')) {
      return { success: false, error: 'CANNOT_DISABLE' };
    }
    if (error.message?.includes('Permission')) {
      return { success: false, error: 'PERMISSION_DENIED' };
    }
    
    return { success: false, error: 'UNKNOWN_ERROR' };
  }
}
```

Permission Checking {#permission-checking}

```javascript
// Check if your extension has management permission
function hasManagementPermission() {
  return chrome.runtime.getManifest().permissions.includes('management');
}

// Check if you can manage a specific extension
async function canManageExtension(extensionId) {
  const ext = await chrome.management.get(extensionId);
  const self = await chrome.management.get(chrome.runtime.id);
  
  return {
    canDisable: ext.mayDisable && ext.enabled,
    canEnable: !ext.enabled,
    canUninstall: ext.mayDisable, // Generally same requirement
    isSelf: ext.id === chrome.runtime.id,
    isPolicyInstalled: ext.installType === 'policy'
  };
}
```

Limitations and Considerations {#limitations-and-considerations}

Important Limitations {#important-limitations}

1. Cannot manage itself: Extensions cannot disable or uninstall themselves without user confirmation
2. Policy-installed extensions: Extensions installed by enterprise policy may have restricted management capabilities
3. Built-in extensions: Some Chrome built-in extensions cannot be disabled
4. Permission requirements: Managing other extensions requires the broad `"management"` permission
5. User gesture requirement: Some operations may require user interaction

Privacy Considerations {#privacy-considerations}

When building extension managers, be mindful of:

- Only request management permission if truly necessary
- Don't collect or store extension data without user consent
- Be transparent about what extension information you're accessing
- Consider the security implications of enabling/disabling extensions

Conclusion {#conclusion}

The `chrome.management` API is a powerful tool for building extension management solutions. From simple enable/disable toggles to comprehensive dashboards with security analysis, this API provides the foundation for managing Chrome's extension ecosystem. Remember to handle edge cases like policy-installed extensions and always provide good UX with proper error handling and user feedback.

For more information, see the official [Chrome Management API documentation](https://developer.chrome.com/docs/extensions/reference/management/).

Related Articles {#related-articles}

Related Articles

- [Management API Reference](../api-reference/management-api.md)
- [Extension Configuration](../patterns/extension-configuration.md)
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
Reference
Official documentation: https://developer.chrome.com/docs/extensions/reference/api/management
