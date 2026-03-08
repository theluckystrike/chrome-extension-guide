---
layout: default
title: "Chrome Extension Advanced Permissions — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/advanced-permissions/"
---
# Advanced Permission Patterns with @theluckystrike/webext-permissions

## Prerequisites
- Read `docs/tutorials/permissions-quickstart.md` first
- `npm install @theluckystrike/webext-permissions`

## 1. The Full API Surface

### Checking Permissions
```typescript
import { checkPermission, checkPermissions } from '@theluckystrike/webext-permissions';
const result = await checkPermission('tabs'); // { granted: boolean }
const results = await checkPermissions(['tabs', 'bookmarks']); // true only if ALL granted
```

### Requesting Permissions
```typescript
import { requestPermission, requestPermissions } from '@theluckystrike/webext-permissions';
const result = await requestPermission('tabs'); // { granted: boolean; error?: Error }
```
- Must be called from user gesture (click handler)

### Removing Permissions
```typescript
import { removePermission } from '@theluckystrike/webext-permissions';
await removePermission('tabs');
```

### Getting All Granted
```typescript
import { getGrantedPermissions } from '@theluckystrike/webext-permissions';
const granted = await getGrantedPermissions();
// granted.permissions: string[], granted.origins: string[]
```

### Describing Permissions
```typescript
import { describePermission, listPermissions, PERMISSION_DESCRIPTIONS } from '@theluckystrike/webext-permissions';
describePermission('tabs'); // Human-readable string
listPermissions(); // All 50+ permissions with descriptions
PERMISSION_DESCRIPTIONS['storage']; // Direct map access
```

## 2. Progressive Permission Pattern
- Start minimal, request as user accesses features
- manifest.json: `optional_permissions` for on-demand features
- Higher install rate, more user trust

## 3. Permission Gate Pattern
- Generic wrapper: check -> request -> execute or fallback
- Full code example with TypeScript generics

## 4. Permission Status UI
- Render toggles for each permission showing granted status + description
- Use `describePermission()` for user-friendly labels
- Toggle calls `requestPermission` or `removePermission`

## 5. Storing Permission Preferences with @theluckystrike/webext-storage
- Track which features user enabled
- On startup: check if permission still granted (user may have revoked in chrome://extensions)
- Sync preference state with actual permission state

## 6. PERMISSION_DESCRIPTIONS Reference
- Complete list of 50+ permissions covered in `PERMISSION_DESCRIPTIONS`
- All standard Chrome permissions with human-readable descriptions

## Common Mistakes
- Calling `requestPermission` outside user gesture — Chrome silently denies
- Not listing in `optional_permissions` — can't request undeclared permissions
- `removePermission` actually revokes access — guard subsequent API calls
- Over-checking: cache results, re-check periodically not on every call
