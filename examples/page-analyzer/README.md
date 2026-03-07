# Page Analyzer

Shows how `webext-messaging`, `webext-storage`, and a context menu work together to analyze web pages.

## What it does

- Adds a context menu item "Analyze this page"
- Content script extracts page metadata (title, headings, word count, links)
- Background stores analysis results in typed storage
- Popup displays analysis history

## Packages used

- `@theluckystrike/webext-storage` — persist analysis results
- `@theluckystrike/webext-messaging` — background <-> content script communication

## Files

- `manifest.json` — MV3 manifest with contextMenus permission
- `background.ts` — service worker with context menu + storage
- `content.ts` — content script that extracts page data
