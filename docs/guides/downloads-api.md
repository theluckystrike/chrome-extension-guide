---
layout: default
title: "Chrome Extension Downloads API — How to Download Files and Track Progress"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/downloads-api/"
---
# Chrome Extension Downloads API — How to Download Files and Track Progress

## Overview {#overview}
The Chrome Downloads API (`chrome.downloads`) enables extensions to initiate file downloads, monitor their progress, and manage downloaded files programmatically. This API is essential for extensions that need to save content, cache resources, or provide download management features.

### Permissions and Requirements
- Requires `"downloads"` permission in your `manifest.json`
- The Download Manager API provides full control over downloads: initiation, searching, opening, and showing files in the folder
- Works in both service workers and popup/options pages

## Initiating Downloads {#initiating-downloads}
The `chrome.downloads.download()` method initiates a download and returns a promise with the download ID:

```javascript
// Basic download
chrome.downloads.download({
  url: 'https://example.com/file.pdf'
}, (downloadId) => {
  console.log('Download started with ID:', downloadId);
});

// Download with custom filename and settings
chrome.downloads.download({
  url: 'https://example.com/data.csv',
  filename: 'reports/monthly-sales.csv',  // Relative to default downloads directory
  saveAs: true,                            // Show "Save As" dialog
  conflictAction: 'overwrite'              // Handle filename conflicts
}, (downloadId) => {
  if (chrome.runtime.lastError) {
    console.error('Download failed:', chrome.runtime.lastError);
    return;
  }
  console.log('Download ID:', downloadId);
});
```

### Download Options
The `download()` method accepts several options to customize download behavior:

| Option | Type | Description |
|--------|------|-------------|
| `url` | string | (Required) The URL to download |
| `filename` | string | Override the default filename |
| `saveAs` | boolean | Show save dialog (default: false) |
| `conflictAction` | string | Action on filename conflict: 'overwrite', 'prompt', 'uniquify' |
| `method` | string | HTTP method (default: 'GET') |
| `headers` | object | Additional HTTP headers |
| `body` | string | Request body for POST requests |
| `incognito` | boolean | Download in incognito mode |

## File Naming Strategies {#file-naming-strategies}
Proper file naming is crucial for user experience and organization. Here are common patterns:

```javascript
// Dynamic filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
chrome.downloads.download({
  url: 'https://api.example.com/export',
  filename: `exports/data-${timestamp}.json`
});

// Organize by type and date
function getDatedFilename(baseName, extension) {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `downloads/${extension.slice(1)}/${dateStr}/${baseName}`;
}

chrome.downloads.download({
  url: 'https://example.com/report.pdf',
  filename: getDatedFilename('monthly-report', '.pdf')
});

// Unique filename to prevent overwrites
chrome.downloads.download({
  url: 'https://example.com/document.docx',
  filename: 'documents/my-document.docx',
  conflictAction: 'uniquify'  // Adds (1), (2), etc. if needed
});
```

## Searching Downloads {#searching-downloads}
Use `chrome.downloads.search()` to find downloads by various criteria:

```javascript
// Find all completed downloads
chrome.downloads.search({
  state: 'complete'
}, (downloads) => {
  console.log('Completed downloads:', downloads);
});

// Search by date range
chrome.downloads.search({
  startedAfter: '2024-01-01',
  endedBefore: '2024-12-31'
}, (downloads) => {
  downloads.forEach(d => console.log(d.filename, d.endTime));
});

// Find downloads by URL pattern
chrome.downloads.search({
  urlRegex: '.*\\.pdf$'
}, (downloads) => {
  console.log('PDF downloads:', downloads);
});

// Combined search
chrome.downloads.search({
  state: 'complete',
  filenameRegex: '.*reports.*'
}, (downloads) => {
  console.log('Completed report files:', downloads);
});
```

### Search Query Options
- `query`: Search in URL and filename
- `state`: 'in_progress', 'interrupted', 'complete'
- `startedAfter`, `startedBefore`, `endedAfter`, `endedBefore`: Date filters
- `urlRegex`, `filenameRegex`: Regular expression filters
- `limit`: Maximum results (default: 100)
- `orderBy`: Sort field (default: '-startTime')

## Tracking Progress and Events {#tracking-progress-and-events}
Monitor download progress using event listeners:

```javascript
// Listen for download creation
chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log('Download started:', downloadItem.filename);
  console.log('ID:', downloadItem.id);
  console.log('Total bytes:', downloadItem.totalBytes);
});

// Track download progress
chrome.downloads.onUpdated.addListener((downloadItem) => {
  if (downloadItem.state === 'in_progress') {
    const percent = downloadItem.bytesReceived 
      ? Math.round((downloadItem.bytesReceived / downloadItem.totalBytes) * 100)
      : 0;
    console.log(`Progress: ${percent}%`);
    console.log(`Received: ${downloadItem.bytesReceived}/${downloadItem.totalBytes} bytes`);
  }
});

// Handle completed downloads
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    console.log('Download complete!', downloadDelta.id);
  }
  if (downloadDelta.error) {
    console.error('Download error:', downloadDelta.error.current);
  }
});

// Handle interrupted downloads
chrome.downloads.onInterrupted.addListener((downloadItem) => {
  console.log('Download interrupted:', downloadItem.id);
  console.log('Reason:', downloadItem.error);
});
```

## Opening and Showing Downloads {#opening-and-showing-downloads}
After a download completes, you can open the file or show it in the folder:

```javascript
// Open downloaded file in default application
chrome.downloads.open(downloadId, () => {
  if (chrome.runtime.lastError) {
    console.error('Failed to open:', chrome.runtime.lastError);
  }
});

// Show file in system file manager
chrome.downloads.show(downloadId);  // Show in downloads folder
chrome.downloads.showDefaultFolder(); // Show default downloads folder

// Get the file path after download completes
chrome.downloads.search({ state: 'complete' }, (downloads) => {
  downloads.forEach(d => {
    console.log('File path:', d.filename);
    console.log('File exists:', d.exists);
  });
});
```

### Download Item Properties
Key properties available on download items:

- `id`: Unique download identifier
- `url`: Original URL
- `filename`: Full local file path
- `totalBytes`: Total size (-1 if unknown)
- `bytesReceived`: Bytes downloaded
- `state`: 'in_progress', 'interrupted', 'complete'
- `error`: Error code if interrupted
- `startTime`, `endTime`: Timestamps
- `exists`: Whether file still exists on disk

## Error Handling {#error-handling}
Implement robust error handling for downloads:

```javascript
chrome.downloads.download({
  url: 'https://example.com/file.zip',
  filename: 'downloaded-file.zip'
}, (downloadId) => {
  if (chrome.runtime.lastError) {
    // Handle permission or API errors
    const error = chrome.runtime.lastError.message;
    console.error('Download API error:', error);
    
    if (error.includes('Permission denied')) {
      // Request permissions or show user guidance
    }
    return;
  }
  
  if (!downloadId) {
    console.error('Download failed to start');
    return;
  }
  
  // Track for errors
  chrome.downloads.onInterrupted.addListener((item) => {
    if (item.id === downloadId) {
      console.error('Download interrupted:', item.error);
      // Implement retry logic
    }
  });
});
```

## Best Practices {#best-practices}
- Always check `chrome.runtime.lastError` after async API calls
- Use `conflictAction: 'uniquify'` to prevent accidental overwrites
- Monitor download progress for large files to keep users informed
- Clean up old downloads using `chrome.downloads.removeFile()` when no longer needed
- Use the Downloads API in combination with the File System Access API for advanced file operations

## Conclusion {#conclusion}
The Chrome Downloads API provides powerful capabilities for managing file downloads in your extension. From initiating downloads with custom settings to tracking progress in real-time and opening completed files, this API enables sophisticated download management features. Remember to request the appropriate permissions and implement proper error handling for a polished user experience.
