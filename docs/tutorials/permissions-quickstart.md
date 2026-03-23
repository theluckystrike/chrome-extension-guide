---
layout: default
title: "Chrome Extension Permissions Quickstart. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/permissions-quickstart/"
---
Permissions Quickstart

Overview {#overview}
`@theluckystrike/webext-permissions` simplifies Chrome's runtime permissions API with human-readable descriptions, batch operations, and proper error handling.

Install {#install}
npm install @theluckystrike/webext-permissions

Background: Manifest V3 Permissions {#background-manifest-v3-permissions}
Brief explainer on required vs optional permissions in manifest.json. This library helps with optional runtime permissions.

```json
{
  "permissions": ["storage"],
  "optional_permissions": ["tabs", "bookmarks", "history"]
}
```

Step 1: Check If a Permission Is Granted {#step-1-check-if-a-permission-is-granted}

Single. `checkPermission(permission)` {#single-checkpermissionpermission}
```ts
import { checkPermission } from "@theluckystrike/webext-permissions";

const result = await checkPermission("tabs");
// { permission: "tabs", granted: boolean, description: "Read information about open tabs" }
```

Returns `PermissionResult`: `{ permission: string; granted: boolean; description: string }`

Batch. `checkPermissions(permissions)` {#batch-checkpermissionspermissions}
```ts
import { checkPermissions } from "@theluckystrike/webext-permissions";

const results = await checkPermissions(["tabs", "bookmarks", "history"]);
```

Step 2: Request Permissions {#step-2-request-permissions}

Single. `requestPermission(permission)` {#single-requestpermissionpermission}
```ts
import { requestPermission } from "@theluckystrike/webext-permissions";

// MUST be called from a user gesture
document.getElementById("grant-tabs")?.addEventListener("click", async () => {
  const result = await requestPermission("tabs");
  // { granted: boolean; error?: string }
});
```

Returns `RequestResult`: `{ granted: boolean; error?: string }`

Batch. `requestPermissions(permissions)` {#batch-requestpermissionspermissions}
```ts
import { requestPermissions } from "@theluckystrike/webext-permissions";

const result = await requestPermissions(["tabs", "bookmarks"]);
```

Chrome shows ONE prompt for all. User declines = `granted: false`.

Step 3: Remove Permissions {#step-3-remove-permissions}

```ts
import { removePermission } from "@theluckystrike/webext-permissions";

const removed = await removePermission("tabs"); // boolean
```

Step 4: List Granted Permissions {#step-4-list-granted-permissions}

```ts
import { getGrantedPermissions } from "@theluckystrike/webext-permissions";

const granted = await getGrantedPermissions();
// PermissionResult[] with granted: true
```

Uses `chrome.permissions.getAll()` under the hood.

Step 5: Human-Readable Descriptions {#step-5-human-readable-descriptions}

`describePermission(permission)` {#describepermissionpermission}
```ts
import { describePermission } from "@theluckystrike/webext-permissions";

describePermission("tabs");       // "Read information about open tabs"
describePermission("bookmarks");  // "Read and modify bookmarks"
describePermission("unknown");    // 'Use the "unknown" API' (fallback)
```

`listPermissions()` {#listpermissions}
```ts
import { listPermissions } from "@theluckystrike/webext-permissions";

const all = listPermissions();
// PermissionResult[] for all 50+ known Chrome permissions
```

`PERMISSION_DESCRIPTIONS` {#permission-descriptions}
```ts
import { PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

// Record<string, string> with 50+ entries
PERMISSION_DESCRIPTIONS.tabs      // "Read information about open tabs"
PERMISSION_DESCRIPTIONS.cookies   // "Read and modify cookies"
PERMISSION_DESCRIPTIONS.history   // "Read and modify browsing history"
```

Step 6: Complete Example. Permission Manager UI {#step-6-complete-example-permission-manager-ui}

Full example: render a list of optional permissions with Grant/Revoke buttons using `checkPermissions`, `requestPermission`, `removePermission`, and `describePermission`.

API Reference Summary {#api-reference-summary}

| Function | Returns |
|----------|---------|
| `checkPermission(perm)` | `Promise<PermissionResult>` |
| `checkPermissions(perms)` | `Promise<PermissionResult[]>` |
| `requestPermission(perm)` | `Promise<RequestResult>` |
| `requestPermissions(perms)` | `Promise<RequestResult>` |
| `removePermission(perm)` | `Promise<boolean>` |
| `getGrantedPermissions()` | `Promise<PermissionResult[]>` |
| `describePermission(perm)` | `string` |
| `listPermissions()` | `PermissionResult[]` |
| `PERMISSION_DESCRIPTIONS` | `Record<string, string>` |

Next Steps {#next-steps}
- [Storage Quickstart](storage-quickstart.md)
- [Messaging Quickstart](messaging-quickstart.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
