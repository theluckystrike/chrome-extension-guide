---
layout: default
title: "Chrome Extension Managed Storage. Best Practices"
description: "Use Chrome Managed Storage for enterprise-deployed extensions with admin-controlled settings."
canonical_url: "https://bestchromeextensions.com/patterns/managed-storage/"
---

# Managed Storage Patterns for Enterprise Extensions

This document covers `chrome.storage.managed` for enterprise-managed extension settings in Chrome extensions.

Overview {#overview}

Managed storage (`chrome.storage.managed`) provides a read-only storage area controlled by enterprise policies. IT administrators deploy settings organization-wide, and extensions receive pre-configured values they cannot modify.

Schema Definition {#schema-definition}

Define the managed storage schema in your extension's `manifest.json`:

```json
{
  "name": "My Extension",
  "manifest_version": 3,
  "storage": {
    "managed_schema": "managed-schema.json"
  }
}
```

The JSON schema file (`managed-schema.json`) defines acceptable values:

```json
{
  "type": "object",
  "properties": {
    "apiEndpoint": {
      "type": "string",
      "description": "Pre-configured API endpoint for organization"
    },
    "enableFeatureX": {
      "type": "boolean",
      "description": "Enable Feature X for all users",
      "default": false
    },
    "maxRetries": {
      "type": "integer",
      "description": "Maximum retry attempts",
      "default": 3
    }
  }
}
```

Reading Managed Settings {#reading-managed-settings}

Retrieve managed settings using `chrome.storage.managed.get()`:

```javascript
async function getManagedSettings() {
  const result = await chrome.storage.managed.get();
  return result;
}

// Usage
const settings = await getManagedSettings();
console.log(settings.apiEndpoint);
```

Detecting Managed vs Unmanaged Values {#detecting-managed-vs-unmanaged-values}

Check whether specific values are managed by verifying they exist in managed storage:

```javascript
async function isValueManaged(key) {
  const managed = await chrome.storage.managed.get(key);
  return key in managed;
}
```

Layered Configuration Pattern {#layered-configuration-pattern}

Implement layered configuration with priority: managed > sync > local:

```javascript
async function getConfig() {
  const [managed, sync, local] = await Promise.all([
    chrome.storage.managed.get(),
    chrome.storage.sync.get(),
    chrome.storage.local.get()
  ]);

  return {
    apiEndpoint: managed.apiEndpoint || sync.apiEndpoint || 'https://default.example.com',
    enableFeatureX: managed.enableFeatureX ?? sync.enableFeatureX ?? false,
    maxRetries: managed.maxRetries ?? sync.maxRetries ?? 3,
    userPreferences: { ...local.userPreferences }
  };
}
```

Enterprise Policy Deployment {#enterprise-policy-deployment}

Admins deploy policies through Chrome Enterprise policies:

- Windows: Registry at `HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionSettings\extension-id`
- macOS: `com.google.Chrome` plist
- Linux: JSON in `/etc/opt/chrome/policies/managed/`

Example policy JSON:

```json
{
  "apiEndpoint": "https://api.enterprise.example.com",
  "enableFeatureX": true,
  "maxRetries": 5
}
```

Managed-Aware Options Page {#managed-aware-options-page}

Display managed settings as locked/read-only:

```javascript
async function renderOptionsPage() {
  const managed = await chrome.storage.managed.get();
  const userPrefs = await chrome.storage.sync.get();

  document.getElementById('apiEndpoint').value = managed.apiEndpoint || userPrefs.apiEndpoint || '';
  document.getElementById('apiEndpoint').disabled = 'apiEndpoint' in managed;

  document.getElementById('enableFeatureX').checked = managed.enableFeatureX ?? userPrefs.enableFeatureX ?? false;
  document.getElementById('enableFeatureX').disabled = 'enableFeatureX' in managed;
}
```

Listening for Admin Updates {#listening-for-admin-updates}

Use `onChanged` to detect when administrators update policies:

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'managed') {
    console.log('Admin updated managed settings:', changes);
    // Refresh configuration, notify user, etc.
  }
});
```

Testing Managed Storage {#testing-managed-storage}

Enable managed storage testing in Chrome:

1. Navigate to `chrome://flags/#managed-storage`
2. Enable the flag
3. Use `--managed-storage-override-dir` flag to load test policies

Documentation for Admins {#documentation-for-admins}

Provide admins with a policy template explaining available settings, types, and descriptions.

See Also {#see-also}

- [Enterprise Policies](./enterprise-policies.md)
- [Enterprise Extensions Guide](../guides/enterprise-extensions.md)
- [Storage API Deep Dive](../api-reference/storage-api-deep detailed look.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
