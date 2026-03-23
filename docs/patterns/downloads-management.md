---
layout: default
title: "Chrome Extension Downloads Management — Best Practices"
description: "Manage file downloads from extensions."
canonical_url: "https://bestchromeextensions.com/patterns/downloads-management/"
---

# Downloads Management Patterns

This guide covers patterns for managing downloads in Chrome extensions using the Downloads API.

## Starting Downloads {#starting-downloads}

Use `chrome.downloads.download()` to initiate downloads:

```javascript
async function startDownload(url, filename) {
  const downloadId = await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true,
    method: 'GET'
  });
  return downloadId;
}
```

**Options:**
- `url`: The URL to download
- `filename`: Custom filename (optional, auto-generated if omitted)
- `saveAs`: Show "Save As" dialog (`true`/`false`)
- `method`: HTTP method (default: 'GET')

## Monitoring Progress {#monitoring-progress}

Listen to `chrome.downloads.onChanged` to track download progress:

```javascript
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state) {
    console.log(`State: ${downloadDelta.state.current}`);
  }
  if (downloadDelta.bytesReceived) {
    const progress = (downloadDelta.bytesReceived / downloadDelta.totalBytes) * 100;
    updateProgressBar(downloadDelta.id, progress);
  }
});
```

## Download States {#download-states}

Downloads transition through these states:
- `in_progress`: Download is actively downloading
- `interrupted`: Download was interrupted (check `error` for reason)
- `complete`: Download finished successfully

## Progress UI in Popup {#progress-ui-in-popup}

Display download progress in your extension popup:

```javascript
function updateProgressBar(downloadId, percent) {
  const progressBar = document.getElementById('download-progress');
  progressBar.style.width = `${percent}%`;
  progressBar.textContent = `${Math.round(percent)}%`;
}
```

## Filename Generation {#filename-generation}

Generate dynamic filenames with timestamps:

```javascript
function generateFilename(baseName, extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitized = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${sanitized}_${timestamp}.${extension}`;
}
```

## File Type Handling {#file-type-handling}

Set appropriate MIME types and extensions:

```javascript
const fileTypes = {
  json: { mime: 'application/json', ext: 'json' },
  csv: { mime: 'text/csv', ext: 'csv' },
  png: { mime: 'image/png', ext: 'png' }
};
```

## Batch Downloads {#batch-downloads}

Queue multiple downloads with concurrency control:

```javascript
async function batchDownload(urls, concurrency = 3) {
  const queue = [...urls];
  const active = [];
  
  while (queue.length > 0 || active.length > 0) {
    while (active.length < concurrency && queue.length > 0) {
      const url = queue.shift();
      const promise = chrome.downloads.download({ url }).then(id => {
        active.splice(active.indexOf(promise), 1);
      });
      active.push(promise);
    }
    await Promise.race(active);
  }
}
```

## Download from Generated Data {#download-from-generated-data}

Create downloads from Blob URLs for generated content:

```javascript
async function downloadDataAsFile(data, filename, mimeType) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({ url, filename });
  URL.revokeObjectURL(url);
}
```

## Cancel, Pause, Resume {#cancel-pause-resume}

```javascript
chrome.downloads.cancel(downloadId);    // Cancel download
chrome.downloads.pause(downloadId);    // Pause download
chrome.downloads.resume(downloadId);   // Resume paused download
```

## Open and Show Files {#open-and-show-files}

```javascript
chrome.downloads.open(downloadId);    // Open downloaded file
chrome.downloads.show(downloadId);    // Show in file manager
```

## Download History {#download-history}

Query past downloads:

```javascript
async function getDownloadHistory() {
  const downloads = await chrome.downloads.search({ limit: 50 });
  return downloads.filter(d => d.state === 'complete');
}
```

## Shelf Control {#shelf-control}

Control the download shelf (bottom bar):

```javascript
chrome.downloads.setShelfEnabled(false);  // Hide download shelf
chrome.downloads.setShelfEnabled(true);   // Show download shelf
```

## Related Documentation {#related-documentation}

- [Downloads API Reference](../api-reference/downloads-api.md)
- [Downloads Permissions](../permissions/downloads.md)
- [Download Management Guide](../guides/download-management.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
