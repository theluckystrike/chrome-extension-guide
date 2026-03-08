---
title: "management Permission"
description: "Access to `chrome.management` API — manage other installed extensions, apps, and themes. { "permissions": ["management"] } "Manage your apps, extensions, and themes""
permalink: /permissions/management/
category: permissions
order: 24
---

# management Permission

## What It Grants
Access to `chrome.management` API — manage other installed extensions, apps, and themes.

## Manifest
```json
{ "permissions": ["management"] }
```

## User Warning
"Manage your apps, extensions, and themes"

## API Access

### Querying Extensions
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

### Managing Extensions
```javascript
// Enable/disable
await chrome.management.setEnabled('ext-id', false); // Disable
await chrome.management.setEnabled('ext-id', true);  // Enable

// Uninstall (shows confirmation dialog)
chrome.management.uninstall('ext-id', { showConfirmDialog: true });

// Launch app
chrome.management.launchApp('app-id');
```

### Events
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

### ExtensionInfo Properties
- `id`, `name`, `shortName`, `description`, `version`, `versionName`
- `enabled`, `disabledReason` ("unknown" | "permissions_increase")
- `type` ("extension" | "hosted_app" | "packaged_app" | "legacy_packaged_app" | "theme")
- `installType` ("admin" | "development" | "normal" | "sideload" | "other")
- `permissions`, `hostPermissions`
- `icons` array with `size` and `url`
- `homepageUrl`, `updateUrl`, `optionsUrl`

## When to Use
- Extension manager tools
- Enterprise extension management
- Conflict detection between extensions
- Extension analytics/inventory
- Auto-disable conflicting extensions

## When NOT to Use
- Don't use for self-management — use `chrome.management.getSelf()` only
- Don't disable user's extensions without clear consent

## Runtime Check
```typescript
import { checkPermission, describePermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('management');
const desc = describePermission('management');
// "Manage your apps, extensions, and themes"
```

## Cross-References
- Related: `docs/reference/lifecycle-events.md` (management events)
