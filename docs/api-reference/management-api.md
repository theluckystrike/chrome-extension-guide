---
layout: default
title: "Chrome Management API Complete Reference"
description: "The Chrome Management API queries and controls installed extensions and apps, enabling features like extension enabling, disabling, and uninstallation management."
canonical_url: "https://bestchromeextensions.com/api-reference/management-api/"
---

# chrome.management API Reference

Overview {#overview}

The `chrome.management` API manages installed extensions and apps.

- Permission: `"management"`
- Availability: Chrome, Edge, Opera

API Methods {#api-methods}

Query Extensions {#query-extensions}

`chrome.management.getAll(callback)` - List all extensions/apps. Returns ExtensionInfo[].

```javascript
chrome.management.getAll(e => e.forEach(x => console.log(x.name)));
```

`chrome.management.get(id, callback)` - Get specific extension info.

`chrome.management.getSelf(callback)` - Get calling extension (no permission needed).

`chrome.management.getPermissionWarningsById(id, callback)` - Get permission warnings.

`chrome.management.getPermissionWarningsByManifest(manifestStr, callback)` - Get warnings from manifest.

---

Control Extensions {#control-extensions}

`chrome.management.setEnabled(id, enabled, callback)` - Enable/disable extension.

```javascript
chrome.management.setEnabled('ext-id', false, () => {});
```

`chrome.management.uninstall(id, options, callback)` - Uninstall extension.

```javascript
chrome.management.uninstall('ext-id', { showConfirmDialog: true }, () => {});
```

`chrome.management.uninstallSelf(options, callback)` - Uninstall calling extension.

---

ExtensionInfo Type {#extensioninfo-type}

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Display name |
| `shortName` | string | Short name |
| `description` | string | Description |
| `version` | string | Version number |
| `versionName` | string | Version name |
| `type` | string | "extension", "hosted_app", "packaged_app", "theme" |
| `enabled` | boolean | Currently enabled |
| `disabledReason` | string | "unknown", "permissions_increase", "corporate_policy" |
| `isApp` | boolean | Whether it's an app |
| `homepageUrl` | string | Homepage URL |
| `updateUrl` | string | Update URL |
| `permissions` | array | Permission strings |
| `hostPermissions` | array | Host permission strings |
| `installType` | string | "admin", "development", "normal", "sideload" |
| `icons` | array | Array of { size, url } |

---

Events {#events}

`chrome.management.onInstalled` - Extension installed.

```javascript
chrome.management.onInstalled.addListener(info => console.log(info.name));
```

`chrome.management.onUninstalled` - Extension uninstalled.

```javascript
chrome.management.onUninstalled.addListener(id => console.log(id));
```

`chrome.management.onEnabled` - Extension enabled.

`chrome.management.onDisabled` - Extension disabled.

---

Code Examples {#code-examples}

List Extensions {#list-extensions}

```javascript
chrome.management.getAll(e => e.filter(x => x.type === 'extension')
  .forEach(x => console.log(x.name, x.enabled)));
```

Disable Extension {#disable-extension}

```javascript
chrome.management.setEnabled('ext-id', false, () => 
  console.log(chrome.runtime.lastError ? 'Error' : 'Disabled'));
```

Self-Uninstall {#self-uninstall}

```javascript
chrome.management.uninstallSelf({ showConfirmDialog: true }, () => {});
```

Monitor Events {#monitor-events}

```javascript
chrome.management.onInstalled.addListener(console.log);
chrome.management.onUninstalled.addListener(console.log);
chrome.management.onEnabled.addListener(console.log);
chrome.management.onDisabled.addListener(console.log);
```

---

Cross-references {#cross-references}

- [Management Permission](../permissions/management.md)
- [Management API Guide](../guides/management-api.md)
Frequently Asked Questions

How do I get info about installed extensions?
Use chrome.management.getAll() to get information about all installed apps and extensions.

Can I disable other extensions programmatically?
Yes, with sufficient permissions, you can use chrome.management.setEnabled() to enable or disable extensions.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
