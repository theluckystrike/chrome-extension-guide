---
layout: default
title: "Chrome Extension Management API — Developer Guide"
description: "Learn how to use the Chrome Extension Management API with this developer guide covering methods, permissions, and implementation examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/management-api/"
---
# Chrome Extension Management API

## Introduction {#introduction}

The `chrome.management` API provides powerful capabilities for managing installed extensions and apps within Chrome. This API enables you to query extension information, control their enabled/disabled state, uninstall extensions programmatically, and listen for installation/uninstallation events. It's essential for building extension manager dashboards, enterprise policy tools, and productivity applications that help users organize their browser environment.

## Permissions and Setup {#permissions-and-setup}

### Required Permissions {#required-permissions}

To use the `chrome.management` API, you need to declare the `"management"` permission in your extension's `manifest.json`:

```json
{
  "name": "My Extension Manager",
  "version": "1.0",
  "permissions": [
    "management"
  ]
}
```

### Permission Scope {#permission-scope}

The `"management"` permission is considered a "strong" permission and requires review during Chrome Web Store submission. However, it cannot be used with `activeTab` or on Chrome Web Store listing pages. The permission grants access to:

- Get information about all installed extensions/apps
- Enable or disable any extension
- Uninstall any extension (with user confirmation)
- Listen to installation and state change events

## Getting Extension Information {#getting-extension-information}

### Listing All Installed Extensions {#listing-all-installed-extensions}

The `chrome.management.getAll()` method returns an array of all installed extensions and apps:

```javascript
// Get all installed extensions and apps
async function getAllExtensions() {
  const extensions = await chrome.management.getAll();
  
  // Filter to show only extensions (not apps)
  const exts = extensions.filter(ext => ext.type === 'extension');
  
  // Filter to show only enabled extensions
  const enabled = extensions.filter(ext => ext.enabled);
  
  return { all: extensions, extensionsOnly: exts, enabled };
}

// Log extension details
getAllExtensions().then(({ all }) => {
  all.forEach(ext => {
    console.log(`${ext.name} (${ext.id})`);
    console.log(`  Version: ${ext.version}`);
    console.log(`  Enabled: ${ext.enabled}`);
    console.log(`  Permissions: ${ext.permissions.join(', ')}`);
  });
});
```

### Getting a Specific Extension {#getting-a-specific-extension}

Use `chrome.management.get()` with an extension ID to get details about a specific extension:

```javascript
// Get info for a specific extension by ID
async function getExtensionInfo(extensionId) {
  try {
    const ext = await chrome.management.get(extensionId);
    return ext;
  } catch (error) {
    console.error('Extension not found:', error);
    return null;
  }
}

// Example: Get info about the current extension
const myInfo = await chrome.management.get(chrome.runtime.id);
```

### Extension Info Object Structure {#extension-info-object-structure}

The `ExtensionInfo` object returned by the API contains comprehensive information:

```javascript
{
  id: "abcdefghijklmnopqrstuvwxyz123456",  // Unique identifier
  name: "Extension Name",                   // Display name
  version: "1.0.0",                         // Version string
  description: "What this extension does", // Description
  permissions: ["tabs", "storage"],         // Granted permissions
  hostPermissions: ["https://*/*"],        // Host permissions
  icons: [                                   // Available icons
    { size: 16, url: "icon16.png" },
    { size: 48, url: "icon48.png" },
    { size: 128, url: "icon128.png" }
  ],
  enabled: true,                            // Current enabled state
  disabledReason: null,                    // Reason if disabled (permissions, etc.)
  type: "extension",                        // "extension", "theme", "app"
  installType: "normal",                    // "normal", "development", "sideload"
  mayDisable: true,                         // Whether user can disable
  appLaunchUrl: null,                       // For apps: launch URL
  homepageUrl: "https://example.com",       // Homepage if set
  updateUrl: "https://example.com/update",  // Update URL
  offlineEnabled: false,                    // Works offline
  optionsUrl: "options.html",               // Options page URL
}
```

## Working with Extension Icons {#working-with-extension-icons}

### Displaying Extension Icons {#displaying-extension-icons}

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

## Enabling and Disabling Extensions {#enabling-and-disabling-extensions}

### Programmatic Control {#programmatic-control}

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
async function toggleExtension(extensionId) {
  const ext = await chrome.management.get(extensionId);
  await chrome.management.setEnabled(extensionId, !ext.enabled);
}
```

### Checking Can Enable/Disable {#checking-can-enabledisable}

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

### Disabling with Reason {#disabling-with-reason}

Some extensions can be disabled programmatically with a reason:

```javascript
// Disable with a specific reason (Manifest V3)
async function disableWithReason(extensionId, reason) {
  await chrome.management.setEnabled(extensionId, false, { enabled: false, reason });
}
```

## Uninstalling Extensions {#uninstalling-extensions}

### Programmatic Uninstall {#programmatic-uninstall}

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

### Silent Uninstall {#silent-uninstall}

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

### Self-Uninstall {#self-uninstall}

Extensions can uninstall themselves:

```javascript
// Extension uninstalls itself
function uninstallSelf() {
  chrome.management.uninstallSelf((result) => {
    if (chrome.runtime.lastError) {
      console.error('Uninstall failed:', chrome.runtime.lastError);
    } else {
      console.log('Self-uninstall successful');
    }
  });
}

// With confirmation dialog
function uninstallSelfWithConfirm() {
  chrome.management.uninstallSelf({ showConfirmDialog: true });
}
```

## Listening to Events {#listening-to-events}

The Management API provides several events for monitoring extension state changes:

### onInstalled Event {#oninstalled-event}

Listen for new extension installations:

```javascript
chrome.management.onInstalled.addListener((extensionInfo) => {
  console.log('Extension installed:', extensionInfo.name);
  console.log('ID:', extensionInfo.id);
  console.log('Version:', extensionInfo.version);
  
  // Send notification to user
  showNotification(`New extension installed: ${extensionInfo.name}`);
});
```

### onUninstalled Event {#onuninstalled-event}

Listen for extension uninstallations:

```javascript
chrome.management.onUninstalled.addListener((extensionId) => {
  console.log('Extension uninstalled:', extensionId);
  
  // Clean up any stored data related to this extension
  cleanupExtensionData(extensionId);
});
```

### onEnabled Event {#onenabled-event}

Listen for extensions being enabled:

```javascript
chrome.management.onEnabled.addListener((extensionInfo) => {
  console.log('Extension enabled:', extensionInfo.name);
  
  // Update your extension's internal state
  updateEnabledExtensionsList();
});
```

### onDisabled Event {#ondisabled-event}

Listen for extensions being disabled:

```javascript
chrome.management.onDisabled.addListener((extensionInfo) => {
  console.log('Extension disabled:', extensionInfo.name);
  console.log('Reason:', extensionInfo.disabledReason);
  
  // Notify user if extension was disabled unexpectedly
  if (extensionInfo.disabledReason === 'permissions_increase') {
    showWarning('Extension disabled due to new permissions required');
  }
});
```

### Complete Event Listener Setup {#complete-event-listener-setup}

Here's a comprehensive example combining all events:

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

## Building an Extension Manager Dashboard {#building-an-extension-manager-dashboard}

### Complete Dashboard Example {#complete-dashboard-example}

Here's a full example of building an extension manager dashboard:

```javascript
// Dashboard state management
class ExtensionDashboard {
  constructor() {
    this.extensions = [];
    this.filter = 'all'; // all, enabled, disabled
    this.sortBy = 'name';
  }
  
  async loadExtensions() {
    this.extensions = await chrome.management.getAll();
    this.render();
  }
  
  filterExtensions() {
    let filtered = [...this.extensions];
    
    // Apply filter
    if (this.filter === 'enabled') {
      filtered = filtered.filter(ext => ext.enabled);
    } else if (this.filter === 'disabled') {
      filtered = filtered.filter(ext => !ext.enabled);
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      if (this.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (this.sortBy === 'version') {
        return a.version.localeCompare(b.version);
      }
      return 0;
    });
    
    return filtered;
  }
  
  render() {
    const container = document.getElementById('extensions-list');
    const filtered = this.filterExtensions();
    
    container.innerHTML = filtered.map(ext => this.renderExtensionCard(ext)).join('');
  }
  
  renderExtensionCard(ext) {
    const icon = ext.icons?.[0]?.url || '/default-icon.png';
    const status = ext.enabled ? 'Enabled' : 'Disabled';
    
    return `
      <div class="extension-card" data-id="${ext.id}">
        <img src="${icon}" alt="${ext.name}" class="extension-icon">
        <div class="extension-info">
          <h3>${ext.name}</h3>
          <p>${ext.description || 'No description'}</p>
          <span class="version">v${ext.version}</span>
        </div>
        <div class="extension-actions">
          <span class="status ${ext.enabled ? 'enabled' : 'disabled'}">${status}</span>
          <button onclick="dashboard.toggleExtension('${ext.id}')">
            ${ext.enabled ? 'Disable' : 'Enable'}
          </button>
          <button onclick="dashboard.uninstallExtension('${ext.id}')" class="danger">
            Uninstall
          </button>
        </div>
      </div>
    `;
  }
  
  async toggleExtension(extensionId) {
    const ext = await chrome.management.get(extensionId);
    await chrome.management.setEnabled(extensionId, !ext.enabled);
    await this.loadExtensions();
  }
  
  async uninstallExtension(extensionId) {
    if (confirm('Are you sure you want to uninstall this extension?')) {
      await chrome.management.uninstall(extensionId);
      await this.loadExtensions();
    }
  }
  
  setFilter(filter) {
    this.filter = filter;
    this.render();
  }
  
  setSort(sortBy) {
    this.sortBy = sortBy;
    this.render();
  }
}

const dashboard = new ExtensionDashboard();
```

### Advanced Dashboard Features {#advanced-dashboard-features}

#### Search and Filter

```javascript
// Add search functionality
function searchExtensions(query) {
  const lowerQuery = query.toLowerCase();
  
  return this.extensions.filter(ext => {
    return ext.name.toLowerCase().includes(lowerQuery) ||
           ext.description?.toLowerCase().includes(lowerQuery) ||
           ext.permissions.some(p => p.toLowerCase().includes(lowerQuery));
  });
}

// Filter by permissions
function filterByPermission(permission) {
  return this.extensions.filter(ext => 
    ext.permissions.includes(permission) ||
    ext.hostPermissions.includes(permission)
  );
}

// Filter by type
function filterByType(type) {
  return this.extensions.filter(ext => ext.type === type);
}
```

#### Permission Analysis

```javascript
// Analyze extension permissions for security review
async function analyzePermissions(extensionId) {
  const ext = await chrome.management.get(extensionId);
  
  const allPermissions = [...ext.permissions, ...ext.hostPermissions];
  
  return {
    name: ext.name,
    totalPermissions: allPermissions.length,
    dangerousPermissions: allPermissions.filter(p => 
      ['tabs', 'history', 'cookies', 'webRequest', 'debugger', 'pageCapture', 
       'proxy', 'clipboardRead', 'clipboardWrite', 'geolocation', 'desktopCapture']
       .includes(p)
    ),
    hostAccess: allPermissions.filter(p => p.includes('://')).length,
    canReadData: allPermissions.some(p => 
      ['tabs', 'history', 'cookies', 'bookmarks'].includes(p)
    )
  };
}
```

#### Extension Usage Statistics

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

## Common Patterns and Best Practices {#common-patterns-and-best-practices}

### Extension Self-Detection {#extension-self-detection}

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

### Error Handling {#error-handling}

```javascript
// Robust error handling for management API
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

### Permission Checking {#permission-checking}

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

## Limitations and Considerations {#limitations-and-considerations}

### Important Limitations {#important-limitations}

1. **Cannot manage itself**: Extensions cannot disable or uninstall themselves without user confirmation
2. **Policy-installed extensions**: Extensions installed by enterprise policy may have restricted management capabilities
3. **Built-in extensions**: Some Chrome built-in extensions cannot be disabled
4. **Permission requirements**: Managing other extensions requires the broad `"management"` permission
5. **User gesture requirement**: Some operations may require user interaction

### Privacy Considerations {#privacy-considerations}

When building extension managers, be mindful of:

- Only request management permission if truly necessary
- Don't collect or store extension data without user consent
- Be transparent about what extension information you're accessing
- Consider the security implications of enabling/disabling extensions

## Conclusion {#conclusion}

The `chrome.management` API is a powerful tool for building extension management solutions. From simple enable/disable toggles to comprehensive dashboards with security analysis, this API provides the foundation for managing Chrome's extension ecosystem. Remember to handle edge cases like policy-installed extensions and always provide good UX with proper error handling and user feedback.

For more information, see the official [Chrome Management API documentation](https://developer.chrome.com/docs/extensions/reference/management/).

## Related Articles {#related-articles}

- [Management API Reference](../api-reference/management-api.md)
- [Extension Configuration](../patterns/extension-configuration.md)
