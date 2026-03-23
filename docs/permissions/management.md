---
layout: default
title: "management Permission"
description: "Access to API. manage other installed extensions, apps, and themes. 'Manage your apps, extensions, and themes'"
permalink: /permissions/management/
category: permissions
order: 24
canonical_url: "https://bestchromeextensions.com/permissions/management/"
---

# management Permission

What It Grants {#what-it-grants}
Access to `chrome.management` API. manage other installed extensions, apps, and themes.

Manifest {#manifest}
```json
{ "permissions": ["management"] }
```

User Warning {#user-warning}
"Manage your apps, extensions, and themes"

API Access {#api-access}

Querying Extensions {#querying-extensions}
```javascript
// Get all installed extensions
const extensions = await chrome.management.getAll();
extensions.forEach(ext => {
  console.log(ext.name, ext.version, ext.enabled, ext.type);
});

// Get specific extension
const ext = await chrome.management.get('extension-id');

// Get self
const self = await chrome.management.getSelf();
console.log(self.name, self.installType); // "normal" | "development" | "sideload"

// Get permission warnings
const warnings = await chrome.management.getPermissionWarningsById('ext-id');
```

Managing Extensions {#managing-extensions}
```javascript
// Enable/disable
await chrome.management.setEnabled('ext-id', false); // Disable
await chrome.management.setEnabled('ext-id', true);  // Enable

// Uninstall (shows confirmation dialog)
chrome.management.uninstall('ext-id', { showConfirmDialog: true });

// Launch app
chrome.management.launchApp('app-id');
```

Events {#events}
```javascript
chrome.management.onInstalled.addListener((info) => {
  console.log('Installed:', info.name, info.id);
});
chrome.management.onUninstalled.addListener((id) => {
  console.log('Removed:', id);
});
chrome.management.onEnabled.addListener((info) => {
  console.log('Enabled:', info.name);
});
chrome.management.onDisabled.addListener((info) => {
  console.log('Disabled:', info.name, 'reason:', info.disabledReason);
});
```

ExtensionInfo Properties {#extensioninfo-properties}
- `id`, `name`, `shortName`, `description`, `version`, `versionName`
- `enabled`, `disabledReason` ("unknown" | "permissions_increase")
- `type` ("extension" | "hosted_app" | "packaged_app" | "legacy_packaged_app" | "theme")
- `installType` ("admin" | "development" | "normal" | "sideload" | "other")
- `permissions`, `hostPermissions`
- `icons` array with `size` and `url`
- `homepageUrl`, `updateUrl`, `optionsUrl`

Common Use Cases

Extension Manager Tools
Build comprehensive extension management dashboards that allow users to view, organize, and control all their installed extensions in one place. This is particularly useful for enterprise environments where IT administrators need to manage multiple extensions across many users.

Enterprise Extension Management
In corporate environments, administrators can use the management API to automatically deploy required extensions, disable conflicting software, and ensure compliance with organization policies. The `installType` property helps identify whether extensions were installed by administrators (admin), by users (normal), or through other means.

Conflict Detection
Extensions can interfere with each other. A management tool can scan for known conflicts and automatically disable problematic extensions. The `getPermissionWarningsById()` method is particularly useful for proactively identifying extensions that may cause issues.

Extension Analytics and Inventory
Build reporting tools that analyze the extensions in a user's browser. This helps IT teams understand what extensions are being used organization-wide and identify potential security risks or unused software that can be removed.

Auto-Disable Conflicting Extensions
When a user installs your extension, you can check for known conflicting extensions and prompt the user to disable them. This ensures a smoother user experience and prevents unexpected behavior.

Best Practices

Always Use getSelf() for Self-Management
Don't hardcode your extension's ID. Use `chrome.management.getSelf()` to get information about your own extension. This makes your code more maintainable and works across different installation contexts (development, normal, sideload).

Never Disable User Extensions Without Consent
Automatically disabling other extensions without explicit user permission is a poor user experience and may violate Chrome Web Store policies. Always ask the user first and explain why an extension should be disabled.

Cache Extension Lists
The `getAll()` method can be slow if called frequently. Consider caching the results and updating only when the `onInstalled`, `onUninstalled`, `onEnabled`, or `onDisabled` events fire.

Handle Permission Warnings Proactively
Before prompting users to enable or disable extensions, use `getPermissionWarningsById()` to understand what changes will occur. This helps you provide accurate information to users.

Respect User Privacy
When building analytics tools, always be transparent about what data you collect and never transmit extension information to external servers without explicit user consent.

When to Use

When to Use {#when-to-use}
- Extension manager tools
- Enterprise extension management
- Conflict detection between extensions
- Extension analytics/inventory
- Auto-disable conflicting extensions

When NOT to Use {#when-not-to-use}
- Don't use for self-management. use `chrome.management.getSelf()` only
- Don't disable user's extensions without clear consent

Runtime Check {#runtime-check}
```typescript
import { checkPermission, describePermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('management');
const desc = describePermission('management');
// "Manage your apps, extensions, and themes"
```

Cross-References {#cross-references}
- Related: `docs/reference/lifecycle-events.md` (management events)

Frequently Asked Questions

What can I do with the management API?
The chrome.management API allows extensions to get info about other installed extensions, enable/disable them, and manage apps.

Can my extension uninstall itself?
Yes, use chrome.management.uninstallSelf() to allow users to uninstall your extension from within the extension UI.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
