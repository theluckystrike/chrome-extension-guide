# Tab Manager with Persistent Settings

Shows how `chrome-storage-typed`, `mv3-messaging`, `chrome-tabs-manager`, and `chrome-permissions-guard` work together in a tab management extension.

## What it does

- Saves tab groups and layouts to storage with type safety
- Uses messaging to coordinate between popup and background
- Checks/requests `tabs` permission at runtime before accessing tab URLs

## Packages used

- `@theluckystrike/chrome-storage-typed` — persist saved tab groups
- `@theluckystrike/mv3-messaging` — popup <-> background communication
- `@theluckystrike/chrome-tabs-manager` — query and create tabs
- `@theluckystrike/chrome-permissions-guard` — runtime `tabs` permission check

## Files

- `manifest.json` — MV3 manifest
- `background.ts` — service worker handling tab operations
- `popup.ts` — popup UI logic
