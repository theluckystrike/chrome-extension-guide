---
layout: default
title: "Chrome Permissions API Complete Reference"
description: "The Chrome Permissions API requests and manages optional permissions at runtime, enabling least-privilege extensions that request access only when needed by users."
canonical_url: "https://bestchromeextensions.com/api-reference/permissions-api/"
last_modified_at: 2026-01-15
---

chrome.permissions API Reference

Overview {#overview}

The `chrome.permissions` API allows extensions to request and manage optional permissions at runtime, rather than declaring them all upfront in the manifest. This enables a principle of least privilege, your extension starts with minimal access and requests more only when the user needs specific features.

Key points:
- No special permission needed to use this API
- Only works with permissions declared as `optional_permissions` or `optional_host_permissions` in the manifest
- Requests must be triggered by a user gesture (e.g., button click)
- Users can revoke permissions at any time via Chrome's extension settings

Manifest Setup {#manifest-setup}

To use the Permissions API, declare your optional permissions in `manifest.json`:

```json
{
  "name": "My Extension",
  "version": "1.0",
  "permissions": [
    "storage",
    "alarms"
  ],
  "optional_permissions": [
    "tabs",
    "bookmarks",
    "activeTab"
  ],
  "optional_host_permissions": [
    "https://*.example.com/*",
    "https://*.google.com/*"
  ]
}
```

- `permissions`: Required permissions granted at install time
- `optional_permissions`: Permissions that can be requested at runtime
- `optional_host_permissions`: Host permissions that can be requested at runtime

API Methods {#api-methods}

contains(permissions, callback) {#containspermissions-callback}

Checks whether the extension has the specified permissions granted.

```typescript
chrome.permissions.contains(
  { permissions: ['tabs'], origins: ['https://*.example.com/*'] },
  (result) => {
    if (result) {
      console.log('Permission granted!');
    }
  }
);
```

Parameters:
- `permissions` (object): Permissions to check
  - `permissions` (string[]): Array of permission names
  - `origins` (string[]): Array of host patterns
- `callback` (function): Called with boolean result

Returns: `boolean` - `true` if all specified permissions are granted

---

request(permissions, callback) {#requestpermissions-callback}

Requests access to the specified optional permissions. Must be called from a user gesture handler (e.g., click event).

```typescript
document.getElementById('requestBtn').addEventListener('click', () => {
  chrome.permissions.request(
    { permissions: ['bookmarks'] },
    (granted) => {
      if (granted) {
        console.log('Permission granted');
      } else {
        console.log('Permission denied');
      }
    }
  );
});
```

Parameters:
- `permissions` (object): Permissions to request
  - `permissions` (string[]): Array of permission names
  - `origins` (string[]): Array of host patterns
- `callback` (function): Called with boolean result

Returns: `boolean` - `true` if the user granted the permission

This method must be called synchronously within a user gesture handler. Chrome will display a prompt asking the user to grant or deny the permission.

---

remove(permissions, callback) {#removepermissions-callback}

Removes access to the specified permissions. Cannot remove required (non-optional) permissions.

```typescript
chrome.permissions.remove(
  { permissions: ['bookmarks'] },
  (removed) => {
    if (removed) {
      console.log('Permission removed successfully');
    }
  }
);
```

Parameters:
- `permissions` (object): Permissions to remove
  - `permissions` (string[]): Array of permission names
  - `origins` (string[]): Array of host patterns
- `callback` (function): Called with boolean result

Returns: `boolean` - `true` if the permission was removed

---

getAll(callback) {#getallcallback}

Retrieves all permissions granted to the extension.

```typescript
chrome.permissions.getAll((permissions) => {
  console.log('Granted permissions:', permissions.permissions);
  console.log('Granted origins:', permissions.origins);
});
```

Parameters:
- `callback` (function): Called with permissions object

Returns: `{ permissions: string[], origins: string[] }`

Events {#events}

onAdded {#onadded}

Fired when permissions are added to the extension.

```typescript
chrome.permissions.onAdded.addListener((permissions) => {
  console.log('Permissions added:', permissions.permissions);
  // Update UI to reflect new capabilities
});
```

---

onRemoved {#onremoved}

Fired when permissions are removed from the extension.

```typescript
chrome.permissions.onRemoved.addListener((permissions) => {
  console.log('Permissions removed:', permissions.permissions);
  // Disable features that require the removed permissions
});
```

Best Practices {#best-practices}

1. Start Minimal {#1-start-minimal}
Declare only essential permissions in your manifest. Request additional permissions only when the user attempts to use a feature that requires them.

2. Explain Before Requesting {#2-explain-before-requesting}
Always show a clear explanation of why you need the permission before calling `request()`. Use your extension's UI to inform users:

```javascript
document.getElementById('enableFeature').addEventListener('click', () => {
  // Show explanation first
  if (confirm('This feature needs access to your bookmarks. Grant access?')) {
    chrome.permissions.request({ permissions: ['bookmarks'] }, granted => {
      if (granted) enableFeature();
    });
  }
});
```

3. Handle Denial Gracefully {#3-handle-denial-gracefully}
Users may deny permission requests. Design your UI to provide alternative functionality or clear messaging when permissions are denied.

```javascript
chrome.permissions.request({ permissions: ['tabs'] }, granted => {
  if (granted) {
    // Full functionality
  } else {
    // Limited functionality - show message
    showMessage('Feature unavailable without tab access');
  }
});
```

4. Remove Unused Permissions {#4-remove-unused-permissions}
If a feature is disabled or no longer needed, consider removing the permission to reduce your extension's attack surface:

```javascript
function cleanupPermissions() {
  chrome.permissions.remove({ permissions: ['bookmarks'] });
}
```

Code Examples {#code-examples}

Request Optional Permission on Button Click {#request-optional-permission-on-button-click}

```javascript
document.getElementById('enableBookmarks').addEventListener('click', () => {
  chrome.permissions.request(
    { permissions: ['bookmarks'] },
    (granted) => {
      if (granted) {
        document.getElementById('enableBookmarks').textContent = 'Enabled!';
      }
    }
  );
});
```

Progressive Host Permission Request {#progressive-host-permission-request}

```javascript
document.getElementById('connectBtn').addEventListener('click', () => {
  chrome.permissions.request(
    { origins: ['https://api.example.com/*'] },
    (granted) => {
      if (granted) {
        initializeApiConnection();
      }
    }
  );
});
```

Permission-Gated UI {#permission-gated-ui}

```javascript
function updateUI() {
  chrome.permissions.contains({ permissions: ['bookmarks'] }, (hasPermission) => {
    document.getElementById('bookmarkFeatures').style.display = hasPermission ? 'block' : 'none';
  });
}

// Check on load and when permissions change
updateUI();
chrome.permissions.onAdded.addListener(updateUI);
chrome.permissions.onRemoved.addListener(updateUI);
```

Cross-References {#cross-references}

- [Permissions Model](../guides/permissions-model.md) - Understanding Chrome's permission system
- [Advanced Permissions Tutorial](../tutorials/advanced-permissions.md) - Detailed look into permission strategies
- [Permissions detailed look](../permissions/permissions-deep detailed look.md) - Comprehensive permission guide
Frequently Asked Questions

How do I check if I have a permission?
Use chrome.permissions.contains() to check if your extension has a specific permission granted.

Can I request permissions after installation?
Yes, use chrome.permissions.request() to request optional permissions at runtime after installation.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
