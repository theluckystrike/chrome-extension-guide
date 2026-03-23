---
layout: default
title: "Managing Downloads in Chrome Extensions. Developer Guide"
description: "Learn how to use the Chrome Downloads API to initiate, monitor, pause, resume, and manage file downloads in your Chrome extension."
canonical_url: "https://bestchromeextensions.com/tutorials/downloads-api-guide/"
---

Managing Downloads in Chrome Extensions

The `chrome.downloads` API provides powerful capabilities for managing file downloads directly from your Chrome extension. This guide covers everything from initiating downloads to handling the download shelf, with practical code examples for common operations.

Prerequisites {#prerequisites}

- Basic understanding of Chrome extension architecture
- Familiarity with service workers and event handling
- For permission requirements, see: [downloads permission](../permissions/downloads.md)

For a complete API reference, see: [Downloads API Reference](../api-reference/downloads-api.md)

1. Setting Up Permissions {#1-setting-up-permissions}

Before using the Downloads API, add the required permissions to your manifest:

```json
{
  "manifest_version": 3,
  "name": "Download Manager",
  "version": "1.0",
  "permissions": [
    "downloads"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

For additional capabilities, you may need:

```json
{
  "permissions": [
    "downloads",
    "downloads.open",    // For opening downloaded files
    "downloads.ui"       // For showing download shelf
  ]
}
```

2. Initiating Downloads {#2-initiating-downloads}

The `chrome.downloads.download()` method initiates a download. It returns a `Promise` with the download ID:

```javascript
// background.js (service worker)

async function downloadFile(url, filename) {
  try {
    const downloadId = await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true,          // Show save dialog
      method: 'GET',         // HTTP method
      headers: [             // Custom headers (if needed)
        { name: 'Authorization', value: 'Bearer token123' }
      ]
    });
    
    console.log('Download started with ID:', downloadId);
    return downloadId;
  } catch (error) {
    console.error('Download failed:', error);
  }
}

// Download from a blob
async function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  return await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: false
  });
}
```

Download Options {#download-options}

| Option | Type | Description |
|--------|------|-------------|
| `url` | string | The URL to download |
| `filename` | string | Local file path (relative to Downloads) |
| `saveAs` | boolean | Show save dialog |
| `headers` | array | Custom HTTP headers |
| `method` | string | HTTP method (GET, POST, etc.) |
| `body` | string | Request body for POST |
| `incognito` | boolean | Download in incognito mode |

3. Monitoring Download Progress {#3-monitoring-download-progress}

Listen to download events to track progress in real-time:

```javascript
// background.js

// Listen for download creation
chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log('Download created:', downloadItem.id);
  console.log('URL:', downloadItem.url);
  console.log('Filename:', downloadItem.filename);
});

// Listen for download state changes
chrome.downloads.onChanged.addListener((downloadDelta) => {
  console.log('Download changed:', downloadDelta.id);
  
  // Check if download completed
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    console.log('Download finished!');
    handleCompletedDownload(downloadDelta.id);
  }
  
  // Track progress
  if (downloadDelta.bytesReceived) {
    const progress = (downloadDelta.bytesReceived.current / 
                      downloadDelta.totalBytes?.current) * 100;
    console.log(`Progress: ${progress.toFixed(1)}%`);
  }
});

// Listen for download errors
chrome.downloads.onError.addListener((downloadItem) => {
  console.error('Download error:', downloadItem.error);
});
```

Querying Downloads {#querying-downloads}

Search for downloads using `chrome.downloads.search()`:

```javascript
// Get all active downloads
async function getActiveDownloads() {
  const downloads = await chrome.downloads.search({
    state: 'in_progress'
  });
  return downloads;
}

// Get completed downloads from today
async function getTodaysDownloads() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const downloads = await chrome.downloads.search({
    state: 'complete',
    startedAfter: today.toISOString()
  });
  return downloads;
}

// Search by filename pattern
async function findDownloads(query) {
  return await chrome.downloads.search({
    query: [query]
  });
}
```

4. Pausing, Resuming, and Cancelling {#4-pausing-resuming-and-cancelling}

Control download lifecycle with pause, resume, and cancel operations:

```javascript
// Pause a download
async function pauseDownload(downloadId) {
  await chrome.downloads.pause(downloadId);
  console.log('Download paused');
}

// Resume a paused download
async function resumeDownload(downloadId) {
  await chrome.downloads.resume(downloadId);
  console.log('Download resumed');
}

// Cancel a download
async function cancelDownload(downloadId) {
  await chrome.downloads.cancel(downloadId);
  console.log('Download cancelled');
}

// Check if download can be resumed
async function checkCanResume(downloadId) {
  const [download] = await chrome.downloads.search({ id: downloadId });
  if (download && download.canResume) {
    console.log('Download can be resumed');
    return true;
  }
  return false;
}
```

Erasing Downloads {#erasing-downloads}

Remove download history without deleting the file:

```javascript
// Erase download from history (keeps the file)
async function eraseDownloadHistory(downloadId) {
  await chrome.downloads.erase({ id: downloadId });
  console.log('Download history erased');
}

// Erase all incomplete downloads
async function clearIncompleteDownloads() {
  const incomplete = await chrome.downloads.search({
    state: 'in_progress'
  });
  
  for (const download of incomplete) {
    await chrome.downloads.erase({ id: download.id });
  }
}
```

5. File Naming and Conflict Resolution {#5-file-naming-and-conflict-resolution}

Handle filename conflicts and customize download locations:

```javascript
// Handle filename conflicts
async function downloadWithConflictResolution(url, desiredName) {
  // Option 1: Use unique filename (adds counter)
  const downloadId = await chrome.downloads.download({
    url: url,
    filename: desiredName,
    conflictAction: 'uniquify'  // Adds (1), (2), etc.
  });
  
  // Option 2: Prompt user
  const downloadId2 = await chrome.downloads.download({
    url: url,
    filename: desiredName,
    saveAs: true  // Shows save dialog
  });
  
  // Option 3: Overwrite existing
  const downloadId3 = await chrome.downloads.download({
    url: url,
    filename: desiredName,
    conflictAction: 'overwrite'
  });
  
  return downloadId;
}

// Download to specific subfolder
async function downloadToFolder(url, subfolder, filename) {
  // Downloads go to {downloads.directory}/{subfolder}/{filename}
  return await chrome.downloads.download({
    url: url,
    filename: `${subfolder}/${filename}`
  });
}
```

Conflict Action Values

| Value | Behavior |
|-------|----------|
| `default` | Use global settings |
| `uniquify` | Add unique suffix (file(1).txt) |
| `overwrite` | Replace existing file |
| `prompt` | Ask user via saveAs dialog |

6. Opening Downloaded Files {#6-opening-downloaded-files}

After a download completes, you can open the file programmatically:

```javascript
// Open downloaded file in default application
async function openDownload(downloadId) {
  // First, get the file path
  const [download] = await chrome.downloads.search({ id: downloadId });
  
  if (download && download.state === 'complete') {
    await chrome.downloads.open(downloadId);
  }
}

// Show file in folder (Explorer/Finder)
async function showInFolder(downloadId) {
  await chrome.downloads.show(downloadId);  // Shows in folder
}

// Get file path for manual handling
async function getFilePath(downloadId) {
  const [download] = await chrome.downloads.search({ id: downloadId });
  return download?.filename;
}
```

The `downloads.open` permission is required for `chrome.downloads.open()`.

7. Download Shelf Interaction {#7-download-shelf-interaction}

Control the download shelf visibility:

```javascript
// Show the download shelf
async function showDownloadShelf() {
  await chrome.downloads.show();  // Shows last download
}

// Check if download shelf is visible
// (Note: This is not directly exposed, but you can infer from events)
```

Download Item States

| State | Description |
|-------|-------------|
| `in_progress` | Currently downloading |
| `interrupted` | Stopped due to error or user action |
| `complete` | Successfully finished |

Danger Types

| Danger | Description |
|--------|-------------|
| `safe` | File is safe |
| `uncommon` | Not commonly downloaded |
| `dangerous` | Potentially harmful |
| `host` | From an untrusted host |
| `unwanted` | May be unwanted software |
| `rare` | Rarely downloaded |

8. MIME Type Handling {#8-mime-type-handling}

Handle different MIME types appropriately:

```javascript
// Determine handling based on MIME type
async function handleDownloadByMimeType(downloadId) {
  const [download] = await chrome.downloads.search({ id: downloadId });
  
  const mimeType = download.mime;
  console.log('MIME type:', mimeType);
  
  // Handle based on type
  if (mimeType.startsWith('image/')) {
    // Handle image download
    console.log('Image download detected');
  } else if (mimeType === 'application/pdf') {
    // Handle PDF
    console.log('PDF download detected');
  } else if (mimeType.includes('zip') || mimeType.includes('archive')) {
    // Handle archive
    console.log('Archive download detected');
  }
}

// Get MIME type from downloaded file
async function getDownloadMimeType(downloadId) {
  const [download] = await chrome.downloads.search({ id: downloadId });
  return download?.mime;
}
```

9. Complete Example: Download Manager {#9-complete-example}

Here's a practical implementation of a download manager:

```javascript
// background.js - Complete Download Manager

class DownloadManager {
  constructor() {
    this.activeDownloads = new Map();
    this.setupListeners();
  }
  
  setupListeners() {
    chrome.downloads.onCreated.addListener(this.handleCreated.bind(this));
    chrome.downloads.onChanged.addListener(this.handleChanged.bind(this));
    chrome.downloads.onError.addListener(this.handleError.bind(this));
  }
  
  handleCreated(downloadItem) {
    this.activeDownloads.set(downloadItem.id, {
      id: downloadItem.id,
      url: downloadItem.url,
      filename: downloadItem.filename,
      startTime: downloadItem.startTime,
      state: 'in_progress'
    });
    
    this.notifyPopup('download-started', downloadItem);
  }
  
  handleChanged(downloadDelta) {
    const download = this.activeDownloads.get(downloadDelta.id);
    if (!download) return;
    
    // Update state
    if (downloadDelta.state) {
      download.state = downloadDelta.state.current;
      
      if (downloadDelta.state.current === 'complete') {
        this.notifyPopup('download-completed', download);
      }
    }
    
    // Update progress
    if (downloadDelta.bytesReceived) {
      download.bytesReceived = downloadDelta.bytesReceived.current;
    }
    if (downloadDelta.totalBytes) {
      download.totalBytes = downloadDelta.totalBytes.current;
    }
  }
  
  handleError(downloadItem) {
    console.error('Download error:', downloadItem.error);
    this.activeDownloads.delete(downloadItem.id);
    this.notifyPopup('download-error', downloadItem);
  }
  
  notifyPopup(event, data) {
    chrome.runtime.sendMessage({ event, data }).catch(() => {
      // Popup may not be open
    });
  }
  
  async startDownload(url, options = {}) {
    const downloadId = await chrome.downloads.download({
      url,
      filename: options.filename,
      saveAs: options.saveAs ?? false,
      conflictAction: options.conflictAction ?? 'uniquify'
    });
    return downloadId;
  }
  
  async pauseDownload(id) {
    await chrome.downloads.pause(id);
  }
  
  async resumeDownload(id) {
    await chrome.downloads.resume(id);
  }
  
  async cancelDownload(id) {
    await chrome.downloads.cancel(id);
    this.activeDownloads.delete(id);
  }
  
  async getActiveDownloads() {
    return Array.from(this.activeDownloads.values());
  }
}

// Initialize
const manager = new DownloadManager();
```

10. Best Practices {#10-best-practices}

1. Always handle errors: Use try/catch and listen to `onError` events
2. Check file size: Warn users before downloading large files
3. Use meaningful filenames: Help users find downloads later
4. Respect user privacy: Don't track downloads without consent
5. Clean up old entries: Periodically erase completed downloads from history

Related Articles {#related-articles}

- [Downloads API Reference](../api-reference/downloads-api.md). Complete API documentation
- [Download Management Patterns](../guides/download-management.md). Advanced patterns and strategies
- [Downloads Permission](../permissions/downloads.md). Permission requirements and security

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
