# Tab Manager with Persistent Settings

Shows how `webext-storage`, `webext-messaging`, and `webext-permissions` work together in a tab management extension.

## What it does

- Saves tab groups and layouts to storage with type safety
- Uses messaging to coordinate between popup and background
- Checks/requests `tabs` permission at runtime before accessing tab URLs

## Packages used

- `@theluckystrike/webext-storage` — persist saved tab groups
- `@theluckystrike/webext-messaging` — popup <-> background communication
- `@theluckystrike/webext-permissions` — runtime `tabs` permission check

## Files

- `manifest.json` — MV3 manifest
- `background.ts` — service worker handling tab operations
- `popup.ts` — popup UI logic
