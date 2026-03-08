---
layout: default
title: "Chrome Extension Download Management — Developer Guide"
description: "Learn Chrome extension download management with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/download-management/"
---
# Download Management in Chrome Extensions

## chrome.downloads API Overview
- Requires `"downloads"` permission (cross-ref `docs/permissions/downloads.md`)
- Full control over browser downloads: create, pause, resume, cancel, search, erase

## Starting Downloads
```javascript
chrome.downloads.download({
  url: 'https://example.com/file.pdf',
  filename: 'custom-name.pdf',      // relative to Downloads folder
  saveAs: false,                      // true = show Save As dialog
  conflictAction: 'uniquify',        // 'overwrite' | 'uniquify' | 'prompt'
  headers: [{ name: 'Authorization', value: 'Bearer ...' }]
}, (downloadId) => {
  console.log('Started download:', downloadId);
});
```
- `url`: HTTP/HTTPS/data/blob URLs supported
- `filename`: path relative to default download dir, can include subdirs
- `conflictAction`: what happens if file exists

## Monitoring Download Progress
```javascript
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state) {
    console.log(`Download ${delta.id}: ${delta.state.previous} -> ${delta.state.current}`);
    // States: "in_progress" | "interrupted" | "complete"
  }
  if (delta.filename) {
    console.log(`Saving to: ${delta.filename.current}`);
  }
});

chrome.downloads.onCreated.addListener((downloadItem) => {
  // New download started (by extension or user)
});

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  // Override filename before download begins
  suggest({ filename: 'custom/' + downloadItem.filename });
});
```

## Searching & Querying Downloads
```javascript
// Find downloads by query
chrome.downloads.search({
  query: ['report'],
  state: 'complete',
  limit: 10,
  orderBy: ['-startTime']
}, (results) => {
  results.forEach(item => {
    console.log(item.filename, item.fileSize, item.url);
  });
});

// Get specific download
chrome.downloads.search({ id: downloadId }, ([item]) => {
  console.log(item.state, item.bytesReceived, item.totalBytes);
});
```

## Controlling Downloads
```javascript
// Pause, resume, cancel
chrome.downloads.pause(downloadId);
chrome.downloads.resume(downloadId);
chrome.downloads.cancel(downloadId);

// Open completed download
chrome.downloads.open(downloadId);         // Opens file
chrome.downloads.show(downloadId);         // Shows in folder
chrome.downloads.showDefaultFolder();      // Opens download dir

// Remove from history (not disk)
chrome.downloads.erase({ id: downloadId });
// Delete from disk
chrome.downloads.removeFile(downloadId);
```

## Download Progress Badge
```javascript
// Show download progress on extension icon
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state?.current === 'in_progress') {
    updateBadge();
  }
});

async function updateBadge() {
  const active = await chrome.downloads.search({ state: 'in_progress' });
  chrome.action.setBadgeText({ text: active.length > 0 ? String(active.length) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
}
```

## Storing Download History
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  recentDownloads: 'string' // JSON array of {url, filename, date}
}), 'local');

// Save last 50 downloads
async function trackDownload(item) {
  const raw = await storage.get('recentDownloads');
  const list = raw ? JSON.parse(raw) : [];
  list.unshift({ url: item.url, filename: item.filename, date: Date.now() });
  await storage.set('recentDownloads', JSON.stringify(list.slice(0, 50)));
}
```

## Common Patterns
- Batch download (queue multiple URLs with rate limiting)
- Download with authentication headers
- Export extension data as JSON file using `URL.createObjectURL(blob)`
- Content script triggering downloads via `@theluckystrike/webext-messaging`

## Common Mistakes
- Not handling `interrupted` state (network failures, disk full)
- Missing `downloads` permission in manifest
- Using `downloads.open` without `downloads.ui` permission
- Not cleaning up blob URLs after download (`URL.revokeObjectURL`)

## Related Articles

- [Downloads Management Patterns](../patterns/downloads-management.md)
- [Downloads API](../api-reference/downloads-api.md)
