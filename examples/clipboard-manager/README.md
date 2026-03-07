# Clipboard Manager

Shows how offscreen documents, storage, and messaging work together for clipboard operations in MV3.

## What it does

- Uses an offscreen document to access the Clipboard API (not available in service workers)
- Stores clipboard history in typed storage
- Popup lets users browse and re-copy previous items

## Packages used

- `@theluckystrike/chrome-storage-typed` — persist clipboard history
- `@theluckystrike/mv3-messaging` — coordinate background, popup, and offscreen document

## Key pattern: Offscreen for DOM APIs

Service workers can't access `document`, `navigator.clipboard`, or `DOMParser`. The offscreen API bridges this gap by creating an invisible HTML page with full DOM access.

## Files

- `manifest.json` — MV3 manifest
- `background.ts` — service worker managing offscreen lifecycle
- `offscreen.ts` — offscreen document handling clipboard operations
- `offscreen.html` — minimal HTML for the offscreen document
