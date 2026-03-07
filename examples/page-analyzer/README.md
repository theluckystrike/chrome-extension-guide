# Page Analyzer

Shows how `mv3-messaging`, `chrome-storage-typed`, and a context menu work together to analyze web pages.

## What it does

- Adds a context menu item "Analyze this page"
- Content script extracts page metadata (title, headings, word count, links)
- Background stores analysis results in typed storage
- Popup displays analysis history

## Packages used

- `@theluckystrike/chrome-storage-typed` — persist analysis results
- `@theluckystrike/mv3-messaging` — background <-> content script communication

## Files

- `manifest.json` — MV3 manifest with contextMenus permission
- `background.ts` — service worker with context menu + storage
- `content.ts` — content script that extracts page data
