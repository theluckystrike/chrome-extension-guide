---
layout: default
title: "Chrome Extension Permissions Model — Developer Guide"
description: "Manage Chrome extension permissions with this guide covering manifest declarations, optional permissions, and security best practices."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/permissions-model/"
---
# Chrome Extension Permissions Model

The permissions system is one of the most critical security mechanisms in Chrome extensions. Understanding how to properly request, manage, and respect permissions is essential for building trustworthy extensions that users feel confident installing. This guide covers the complete permissions model in Manifest V3, from basic concepts to advanced patterns for minimum-privilege design.

## Understanding Permission Types

Chrome extensions support two primary categories of permissions: required permissions declared in the manifest at install time, and optional permissions that can be requested at runtime. Each category serves different use cases and has distinct implications for user trust and extension capabilities.

### Required Permissions

Required permissions are declared in the `manifest.json` file under the `permissions` key. These permissions are requested when the user installs the extension and cannot be granted later without user interaction. Users see all required permissions in the installation dialog, and any concerning permissions generate warnings that may deter installation.

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ]
}
```

Common required permissions include `storage` for persistent data, `tabs` for tab information and management, `activeTab` for the currently active tab, and `scripting` for programmatic script injection. Host permissions like `https://*.example.com/*` are also considered required in that they must be declared upfront, though they appear in a separate `host_permissions` field in MV3.

The key principle is that required permissions should only include those absolutely necessary for the extension's core functionality. If a permission is only needed for specific features or user-triggered actions, it should be declared as optional instead.

### Optional Permissions

Optional permissions provide a more granular approach to permission management. These are declared in the `optional_permissions` field and must be explicitly requested at runtime using the Permissions API. This approach significantly improves the user experience by deferring permission requests until the user actually needs them.

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "optional_permissions": [
    "bookmarks",
    "notifications",
    "geolocation"
  ]
}
```

Optional permissions offer several advantages. First, users can install the extension with greater confidence since the initial permission request is smaller. Second, users can understand why a permission is needed at the moment they trigger the feature that requires it. Third, extensions can gracefully degrade functionality when permissions are denied rather than failing completely.

The decision between required and optional permissions should be based on the extension's default behavior. If the core functionality absolutely requires a permission, it should be required. If the permission enables enhanced features that users explicitly invoke, it should be optional.

## Host Permissions and Match Patterns

Host permissions control an extension's access to websites and web resources. They are one of the most sensitive permission categories because they determine what data the extension can read and modify on web pages. Understanding match patterns is essential for implementing the principle of least privilege.

### Match Pattern Syntax

Match patterns use a specialized syntax that allows precise specification of URLs. The basic format is `<scheme>://<host><path>`, with wildcards providing flexibility:

- `*://*/*` - Matches all URLs (use sparingly)
- `https://*/*` - Matches all HTTPS URLs
- `https://*.example.com/*` - Matches all HTTPS pages on example.com and subdomains
- `https://example.com/*` - Matches only example.com (not subdomains)
- `https://example.com/api/*` - Matches only API endpoints
- `<all_urls>` - Matches all URLs including `file://` and `ftp://` schemes (broader than `*://*/*` which only covers `http`/`https`)

```json
{
  "host_permissions": [
    "https://*.google.com/*",
    "https://api.myservice.com/v1/*"
  ]
}
```

### Best Practices for Host Permissions

Always request the minimum host access necessary for your extension's functionality. If your extension only needs to read data from a specific domain, do not request access to all domains. This reduces the potential impact of a security compromise and increases user trust.

```typescript
// Bad: Too broad - grants access to all websites
"host_permissions": ["<all_urls>"]

// Good: Specific to actual needs
"host_permissions": ["https://*.tasktracker.com/*"]
```

When working with user-configurable host access, consider using optional host permissions. This allows users to grant access to specific sites they choose rather than having the extension access everything by default.

## Runtime Permission Requests

The Chrome Permissions API enables extensions to request optional permissions at runtime. This is a critical mechanism for implementing the principle of least privilege, as it allows extensions to function with minimal permissions until the user specifically needs additional capabilities.

### Requesting Optional Permissions

The `chrome.permissions.request()` method initiates a runtime permission request. The user will see a prompt asking them to grant the specific permission. The method returns a Promise that resolves to `true` if the permission was granted and `false` if it was denied.

```typescript
async function requestNotificationPermission(): Promise<boolean> {
  // Check if we already have the permission
  const hasPermission = await chrome.permissions.contains({
    permissions: ['notifications']
  });
  
  if (hasPermission) {
    return true;
  }
  
  // Request the permission
  const granted = await chrome.permissions.request({
    permissions: ['notifications']
  });
  
  if (granted) {
    console.log('Notification permission granted');
  } else {
    console.log('Notification permission denied');
  }
  
  return granted;
}
```

The `chrome.permissions.contains()` method is essential for checking whether a permission is already granted before attempting to request it. This prevents unnecessary prompts and provides a clean user experience.

### Checking Current Permissions

Before performing any operation that requires a specific permission, always verify that the permission is granted. The `contains()` method provides this capability:

```typescript
async function canAccessBookmarks(): Promise<boolean> {
  return await chrome.permissions.contains({
    permissions: ['bookmarks']
  });
}

async function getBookmarks(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  if (!await canAccessBookmarks()) {
    throw new Error('Bookmarks permission not granted');
  }
  return await chrome.bookmarks.getTree();
}
```

### Removing Permissions

Users can revoke permissions at any time through the extensions management page. Your extension should handle this gracefully by checking permissions before using related features and providing appropriate feedback:

```typescript
// Listen for permission removals
chrome.permissions.onRemoved.addListener((permissions) => {
  if (permissions.permissions.includes('bookmarks')) {
    console.log('Bookmarks permission was removed');
    // Update UI to reflect lost functionality
    updateExtensionState();
  }
});

// Listen for permission grants
chrome.permissions.onAdded.addListener((permissions) => {
  if (permissions.permissions.includes('notifications')) {
    console.log('Notifications permission was granted');
    enableNotificationFeatures();
  }
});
```

## Understanding Permission Warnings

Permission warnings are displayed to users during installation and serve as the primary mechanism for informed consent. Understanding what triggers warnings and how to minimize them is crucial for user trust.

### Common Permission Warnings

Certain permissions trigger prominent warnings because they provide broad access to user data or browser behavior:

| Permission | Warning Message |
|------------|-----------------|
| `history` | "Read and change your browsing history on all signed-in devices" |
| `tabs` | "Read your browsing history" |
| `<all_urls>` | "Read and change all your data on all websites" |

Note: Some permissions like `cookies` and `webRequest` do not trigger their own install-time warnings. Warnings depend on the combination of permissions and host access requested.

When multiple sensitive permissions are combined, the warning becomes more severe, which can significantly reduce installation rates.

### Minimizing Warning Impact

The most effective strategy is to minimize the permissions that trigger warnings. Consider these approaches:

```typescript
// Instead of requesting broad tab access
"permissions": ["tabs"]

// Use activeTab for extensions that work on the current page
"permissions": ["activeTab"]

// Or request specific host permissions only where needed
"host_permissions": ["https://specific-site.com/*"]
```

The `activeTab` permission is particularly valuable because it provides access to the currently active tab only when the user explicitly invokes the extension, and it does not trigger a warning at installation time.

## The activeTab Permission

The `activeTab` permission is a security-focused feature that grants an extension temporary access to the active tab when the user activates it. This permission was specifically designed to balance user security with developer needs.

### How activeTab Works

When `activeTab` is declared, the extension does not have access to any tabs by default. Access is granted only in the following scenarios:

1. The user clicks the extension's action button
2. The user invokes a keyboard shortcut assigned to the extension
3. The user selects a context menu item from the extension
4. The user accepts an omnibox suggestion from the extension

```json
{
  "permissions": ["activeTab"],
  "action": {
    "default_title": "Analyze Page"
  }
}
```

This approach means that at any given time, the extension has zero tab access unless the user explicitly triggers it. This is dramatically more secure than the `tabs` permission, which provides access to all tabs at all times.

### When to Use activeTab

The `activeTab` permission is ideal for:

- Page analyzers and inspectors
- Note-taking extensions that capture page content
- Highlighters and annotation tools
- Page-specific tools (format converters, calculators)
- Any extension that operates on-demand rather than continuously

```typescript
// This function only works when activeTab is granted via user gesture
async function getActiveTabContent(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.id || !tab.url) {
    return null;
  }
  
  // With activeTab, this script injection is only allowed when 
  // the extension was activated by user gesture
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText
  });
  
  return results[0]?.result || null;
}
```

### activeTab Limitations

The `activeTab` permission has specific constraints that make it unsuitable for some use cases:

- Cannot be used with background service workers that need continuous tab access
- Cannot monitor tab updates or changes automatically
- Cannot access tabs without user interaction
- Does not provide access to tab URLs until the user triggers the extension

For background monitoring or automation scenarios, you will need to use standard permissions like `tabs` or `scripting` with host permissions, accepting the associated warning.

## Minimum-Privilege Extension Design

The principle of minimum privilege dictates that an extension should request only the permissions it absolutely needs to function, and nothing more. This principle should guide every permission-related decision in extension development.

### Design Patterns

**Feature-Based Permission Gating**

Structure your extension to use optional permissions for feature-specific capabilities:

```typescript
// manifest.json
{
  "permissions": [
    "storage"
  ],
  "optional_permissions": [
    "bookmarks",
    "history",
    "notifications",
    "geolocation"
  ]
}

// Feature manager
class FeatureManager {
  private async ensurePermission(permission: string): Promise<boolean> {
    const granted = await chrome.permissions.request({ permissions: [permission] });
    return granted;
  }
  
  async enableBookmarksFeature(): Promise<void> {
    if (await this.ensurePermission('bookmarks')) {
      this.bookmarksEnabled = true;
      await this.showBookmarksUI();
    }
  }
  
  async enableHistoryFeature(): Promise<void> {
    if (await this.ensurePermission('history')) {
      this.historyEnabled = true;
      await this.showHistoryUI();
    }
  }
}
```

**Runtime Permission Checks**

Always verify permissions before performing sensitive operations:

```typescript
class SecureDataHandler {
  async readSensitiveData(url: string): Promise<any> {
    // Verify we have the necessary host permission
    const hasPermission = await chrome.permissions.contains({
      origins: [url]
    });

    if (!hasPermission) {
      throw new Error(`No permission to access ${url}`);
    }
    
    // Proceed with data fetching
    const response = await fetch(url);
    return response.json();
  }
}
```

**Permission-Efficient Content Script Injection**

Inject content scripts only when needed rather than declaratively in the manifest:

```typescript
// Instead of manifest.json content_scripts declaration
// "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"] }]

// Use programmatic injection with specific host permissions
async function injectContentScript(tabId: number, url: string): Promise<void> {
  // Verify we have permission for this specific URL
  const hasPermission = await chrome.permissions.contains({
    origins: [url]
  });

  if (!hasPermission) {
    console.error('No permission to inject script into this page');
    return;
  }
  
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });
}
```

### Progressive Enhancement

Design your extension to work with minimal permissions and enhance functionality when additional permissions are granted:

```typescript
class ExtensionCore {
  private baseFeatures = ['storage', 'activeTab'];
  private advancedFeatures: string[] = [];
  
  async initialize(): Promise<void> {
    // Check what permissions we have
    const allPermissions = await chrome.permissions.getAll();
    
    // Enable base features (always available)
    this.enableBaseFeatures();
    
    // Enable advanced features based on granted permissions
    if (allPermissions.permissions.includes('bookmarks')) {
      this.advancedFeatures.push('bookmarks');
    }
    if (allPermissions.permissions.includes('history')) {
      this.advancedFeatures.push('history');
    }
    if (allPermissions.permissions.includes('notifications')) {
      this.advancedFeatures.push('notifications');
    }
    
    this.updateUIBasedOnPermissions();
  }
  
  private updateUIBasedOnPermissions(): void {
    const badge = document.getElementById('feature-badge');
    if (this.advancedFeatures.length > 0) {
      badge.textContent = `${this.advancedFeatures.length} premium features`;
      badge.classList.add('active');
    }
  }
}
```

### User Control and Transparency

Always provide users with clear information about what permissions are needed and why:

```typescript
class PermissionUI {
  static getPermissionExplanation(): Record<string, string> {
    return {
      storage: 'Stores your preferences and extension data locally',
      bookmarks: 'Allows reading and managing your bookmarks',
      notifications: 'Sends you important alerts and updates',
      geolocation: 'Provides location-based features',
      activeTab: 'Accesses the current page when you click the extension'
    };
  }
  
  static async showPermissionDialog(
    permission: string, 
    rationale: string
  ): Promise<boolean> {
    // Create a user-friendly explanation
    const explanation = `
      This feature requires the "${permission}" permission.
      
      Why: ${rationale}
      
      Would you like to grant this permission?
    `;
    
    // Show your custom UI or use Chrome's native dialog
    return await this.confirmUser(explanation);
  }
}
```

## Security Considerations

Proper permission management is essential for extension security. Follow these additional security practices:

### Validate Permission Scope

```typescript
// Always validate that you have permission before accessing data
async function secureFetch(url: string): Promise<string> {
  const urlObj = new URL(url);
  
  // Check if we have host permission for this specific URL
  const hasPermission = await chrome.permissions.contains({
    origins: [`${urlObj.protocol}//${urlObj.host}/*`]
  });
  
  if (!hasPermission) {
    throw new Error(`Security violation: No permission to fetch from ${url}`);
  }
  
  return fetch(url).then(r => r.text());
}
```

### Handle Permission Revocation

```typescript
// Gracefully handle when users revoke permissions
chrome.permissions.onRemoved.addListener(async (removed) => {
  for (const permission of removed.permissions) {
    switch (permission) {
      case 'storage':
        // Clear any cached data that required storage
        this.clearCachedData();
        break;
      case 'notifications':
        // Disable notification-related features
        this.disableNotifications();
        break;
    }
  }
  
  // Update UI to reflect reduced capabilities
  this.updateCapabilityUI();
});
```

### Avoid Overprivileged Background Scripts

In Manifest V3, background scripts run as service workers with a limited lifecycle. Avoid patterns that require persistent background access to sensitive APIs:

```typescript
// Instead of background script monitoring all tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // This runs constantly for all tabs - consider if it's necessary
});

// Use event pages or direct user invocation when possible
// Or use declarative APIs like chrome.declarativeContent
chrome.declarativeContent.onPageChanged.addRules([{
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: 'example.com' }
    })
  ],
  actions: [
    new chrome.declarativeContent.ShowAction()
  ]
}]);
```

## Summary

The Chrome extension permissions model provides a robust framework for building secure extensions. Key principles to remember:

1. **Prefer optional permissions** over required ones whenever possible
2. **Use activeTab** for on-demand page access instead of broad tab permissions
3. **Request specific host permissions** rather than universal access
4. **Check permissions before use** rather than assuming they exist
5. **Handle permission changes** gracefully when users revoke access
6. **Explain permissions to users** with clear rationale for each request

By following these patterns, you can build extensions that respect user privacy, maintain security, and provide excellent user experience while still delivering powerful functionality.

## Related Articles

- [Permission Gating](../patterns/permission-gating.md)
- [Permissions Strategy](../guides/extension-permissions-strategy.md)
