---
layout: post
title: "Chrome Extension Downloads API: Build a Download Manager Extension"
description: "Master the Chrome downloads API to build a powerful download manager extension. Learn chrome.downloads methods, event handling, file management, and advanced features for creating professional download managers."
date: 2025-03-08
last_modified_at: 2025-03-08
categories: [Chrome-Extensions, APIs]
tags: [downloads, chrome-extension, tutorial]
keywords: "chrome extension downloads API, chrome.downloads, download manager chrome extension, chrome extension file download, manage downloads chrome extension"
canonical_url: "https://bestchromeextensions.com/2025/03/08/chrome-extension-downloads-api-guide/"
---

Chrome Extension Downloads API: Build a Download Manager Extension

Download management is one of the most requested features for Chrome extensions. Whether you're building a productivity tool that needs to batch download files, a web scraper that collects resources, or a full-featured download manager with pause/resume capabilities, the Chrome Downloads API provides the foundation you need. This comprehensive guide will teach you how to use the chrome.downloads API to create powerful download management functionality in your Chrome extension.

The Downloads API, part of the Chrome Extension APIs, enables extensions to initiate downloads, monitor their progress, manage files, and interact with Chrome's built-in download manager. Unlike simple link clicking, this API gives you programmatic control over every aspect of the download process, making it essential for building sophisticated download manager chrome extension solutions.

---

Understanding the Chrome Downloads API {#understanding-downloads-api}

The chrome.downloads API is one of Chrome's extension APIs that provides comprehensive download management capabilities. Before diving into implementation, it's crucial to understand what this API offers and how it fits into the Chrome extension architecture.

API Overview and Capabilities

The chrome.downloads API provides methods for initiating downloads, querying download history, controlling download behavior, and handling download events. With this API, you can create a download manager chrome extension that rivals many standalone applications in functionality.

The API supports several key operations:
- Starting downloads with custom settings
- Pausing and resuming downloads
- Canceling active downloads
- Removing downloads from history
- Opening downloaded files
- Searching and filtering download history
- Monitoring download progress in real-time

To use the chrome.downloads API, your extension must declare the "downloads" permission in the manifest file. Additionally, if you want to download files to custom locations or access downloaded files, you may need additional permissions depending on your use case.

Required Permissions and Manifest Configuration

For your chrome extension file download functionality to work, you need to configure your manifest.json properly. Here's what you need to include in your Manifest V3 extension:

```json
{
  "name": "Download Manager Pro",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": [
    "downloads"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

The "downloads" permission is essential for using the chrome.downloads API. The host_permissions field grants your extension access to download files from any website, which is necessary for a general-purpose download manager.

---

Core Methods of the Downloads API {#core-methods}

Understanding the core methods is essential for building any download manager chrome extension.  each major method in detail.

Initiating Downloads with download()

The chrome.downloads.download() method is the primary way to start downloads programmatically. This method accepts a DownloadOptions object and returns a promise with the download ID.

```javascript
// Basic download initiation
chrome.downloads.download({
  url: "https://example.com/files/document.pdf",
  filename: "document.pdf",
  saveAs: false,
  conflictAction: "uniquify"
}, (downloadId) => {
  if (chrome.runtime.lastError) {
    console.error("Download failed:", chrome.runtime.lastError);
  } else {
    console.log("Download started with ID:", downloadId);
  }
});
```

The download() method supports numerous options:

- url: The URL to download from (required)
- filename: Custom filename for the saved file
- saveAs: Boolean to show the "Save As" dialog
- conflictAction: What to do if file exists (uniquify, overwrite, prompt)
- method: HTTP method (GET or POST)
- headers: Custom HTTP headers for POST requests
- body: Request body for POST downloads

For POST requests with file uploads, you can include form data:

```javascript
chrome.downloads.download({
  url: "https://api.example.com/upload",
  method: "POST",
  headers: [
    { name: "Content-Type", value: "application/x-www-form-urlencoded" }
  ],
  body: "file=data&filename=document.pdf"
}, handleDownloadId);
```

Querying Downloads with search()

The chrome.downloads.search() method allows you to query the download history. This is crucial for building a download manager that displays existing downloads or checks if a file has already been downloaded.

```javascript
// Search for all downloads from today
const today = new Date();
today.setHours(0, 0, 0, 0);

chrome.downloads.search({
  query: ["report"],
  orderBy: ["-startTime"],
  limit: 50
}, (downloads) => {
  downloads.forEach(download => {
    console.log(`${download.filename}: ${download.bytesReceived}/${download.totalBytes} bytes`);
  });
});
```

The search method supports various query parameters:
- query: Array of strings to match against URL and filename
- startTime: Earliest download to include
- endTime: Latest download to include
- limit: Maximum number of results
- orderBy: Sort order (e.g., "-startTime" for newest first)
- state: Filter by state (in_progress, completed, interrupted, paused)

Pausing and Resuming Downloads

One of the most valuable features of a download manager chrome extension is the ability to pause and resume downloads. The API provides methods for both:

```javascript
// Pause a download
function pauseDownload(downloadId) {
  chrome.downloads.pause(downloadId, () => {
    if (chrome.runtime.lastError) {
      console.error("Pause failed:", chrome.runtime.lastError);
    } else {
      console.log(`Download ${downloadId} paused`);
    }
  });
}

// Resume a paused download
function resumeDownload(downloadId) {
  chrome.downloads.resume(downloadId, () => {
    if (chrome.runtime.lastError) {
      console.error("Resume failed:", chrome.runtime.lastError);
    } else {
      console.log(`Download ${downloadId} resumed`);
    }
  });
}
```

These methods work with downloads that support pausing. Note that not all servers support resumable downloads, the server must send the Accept-Ranges header and your initial request must use the correct byte range.

Canceling and Removing Downloads

Managing download lifecycle includes the ability to cancel active downloads and remove completed downloads from history:

```javascript
// Cancel an active download
chrome.downloads.cancel(downloadId, () => {
  if (chrome.runtime.lastError) {
    console.error("Cancel failed:", chrome.runtime.lastError);
  }
});

// Remove a download from history (does not delete the file)
chrome.downloads.remove(downloadId, () => {
  console.log("Download removed from history");
});

// Erase download history (does not delete files)
chrome.downloads.erase({
  query: ["example.com"],
  limit: 100
}, (erasedIds) => {
  console.log(`Erased ${erasedIds.length} downloads from history`);
});
```

---

Handling Download Events {#handling-events}

Real-time event handling is what makes a chrome extension download manager truly interactive. The chrome.downloads API provides several events to monitor download status.

Listening for Download State Changes

The onChanged event fires when any property of a download changes:

```javascript
chrome.downloads.onChanged.addListener((downloadDelta) => {
  const { id, state, paused, error } = downloadDelta;
  
  console.log(`Download ${id} changed:`);
  
  if (state) {
    console.log(`  New state: ${state.current}`);
    if (state.current === "complete") {
      console.log("  Download finished successfully!");
    } else if (state.current === "interrupted") {
      console.log(`  Download interrupted: ${downloadDelta.error?.current}`);
    }
  }
  
  if (paused) {
    console.log(`  Paused: ${paused.current}`);
  }
  
  if (downloadDelta.progress) {
    const { bytesReceived, totalBytes } = downloadDelta.progress;
    const percent = ((bytesReceived.current / totalBytes.current) * 100).toFixed(1);
    console.log(`  Progress: ${percent}% (${bytesReceived.current}/${totalBytes.current} bytes)`);
  }
});
```

The downloadDelta object contains only the properties that changed, minimizing the data you need to process.

Monitoring Download Creation

The onCreated event fires when a new download is initiated:

```javascript
chrome.downloads.onCreated.addListener((download) => {
  console.log("New download created:");
  console.log(`  ID: ${download.id}`);
  console.log(`  URL: ${download.url}`);
  console.log(`  Filename: ${download.filename}`);
  console.log(`  Total Size: ${download.totalBytes} bytes`);
  console.log(`  Start Time: ${download.startTime}`);
  
  // Add to your extension's download manager UI
  addDownloadToManager(download);
});
```

Detecting Download Completion

For many use cases, you need to know when a download completes to perform additional actions:

```javascript
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state && downloadDelta.state.current === "complete") {
    const downloadId = downloadDelta.id;
    
    // Get full download info
    chrome.downloads.search({ id: downloadId }, (downloads) => {
      if (downloads.length > 0) {
        const completed = downloads[0];
        
        console.log(`Download completed: ${completed.filename}`);
        
        // Auto-open downloaded files if needed
        if (shouldAutoOpen(completed.filename)) {
          chrome.downloads.open(completed.id);
        }
        
        // Notify user
        showNotification(`Download complete: ${completed.filename}`);
      }
    });
  }
});
```

---

Building a Complete Download Manager Extension {#building-download-manager}

Now that you understand the API methods and events, let's build a practical download manager chrome extension. We'll create a popup-based interface that manages downloads.

The Popup HTML Structure

Create a clean popup interface for your download manager:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Download Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 400px; font-family: -apple-system, system-ui, sans-serif; }
    .header { background: #4285f4; color: white; padding: 16px; }
    .header h1 { font-size: 18px; font-weight: 500; }
    .download-list { max-height: 400px; overflow-y: auto; }
    .download-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      gap: 12px;
    }
    .download-item.active { background: #f8f9fa; }
    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #34a853;
      transition: width 0.3s;
    }
    .download-info { flex: 1; min-width: 0; }
    .download-name {
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .download-stats {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .download-actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }
    .btn:hover { background: #eee; }
    .btn-pause { color: #fbbc04; }
    .btn-resume { color: #34a853; }
    .btn-cancel { color: #ea4335; }
    .empty-state {
      padding: 40px;
      text-align: center;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Download Manager</h1>
  </div>
  <div class="download-list" id="downloadList">
    <div class="empty-state">No active downloads</div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

The Popup JavaScript Logic

Implement the download manager functionality in popup.js:

```javascript
// Store active downloads
let activeDownloads = new Map();

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadActiveDownloads();
  setupEventListeners();
});

// Load existing downloads
async function loadActiveDownloads() {
  return new Promise((resolve) => {
    chrome.downloads.search({
      state: "in_progress",
      orderBy: ["-startTime"],
      limit: 50
    }, (downloads) => {
      downloads.forEach(download => {
        activeDownloads.set(download.id, download);
      });
      renderDownloadList();
      resolve();
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Listen for download changes
  chrome.downloads.onChanged.addListener(handleDownloadChanged);
  
  // Listen for new downloads
  chrome.downloads.onCreated.addListener(handleDownloadCreated);
}

// Handle download changes
function handleDownloadChanged(downloadDelta) {
  const downloadId = downloadDelta.id;
  
  if (activeDownloads.has(downloadId)) {
    const download = activeDownloads.get(downloadId);
    
    // Update download object with changes
    if (downloadDelta.state) {
      download.state = downloadDelta.state.current;
    }
    if (downloadDelta.paused) {
      download.paused = downloadDelta.paused.current;
    }
    if (downloadDelta.progress) {
      download.bytesReceived = downloadDelta.progress.bytesReceived.current;
      download.totalBytes = downloadDelta.progress.totalBytes.current;
    }
    
    // Remove from active if completed or interrupted
    if (download.state === "complete" || download.state === "interrupted") {
      activeDownloads.delete(downloadId);
    }
    
    renderDownloadList();
  }
}

// Handle new downloads
function handleDownloadCreated(download) {
  activeDownloads.set(download.id, download);
  renderDownloadList();
}

// Render the download list
function renderDownloadList() {
  const container = document.getElementById('downloadList');
  
  if (activeDownloads.size === 0) {
    container.innerHTML = '<div class="empty-state">No active downloads</div>';
    return;
  }
  
  container.innerHTML = '';
  
  activeDownloads.forEach((download, id) => {
    const item = createDownloadElement(download);
    container.appendChild(item);
  });
}

// Create download item element
function createDownloadElement(download) {
  const item = document.createElement('div');
  item.className = `download-item ${download.state}`;
  
  const percent = download.totalBytes > 0 
    ? Math.round((download.bytesReceived / download.totalBytes) * 100) 
    : 0;
  
  const statusText = getStatusText(download);
  
  item.innerHTML = `
    <div class="download-info">
      <div class="download-name" title="${download.filename}">
        ${download.filename.split('/').pop()}
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="download-stats">${statusText}</div>
    </div>
    <div class="download-actions">
      ${download.paused 
        ? `<button class="btn btn-resume" data-action="resume" data-id="${download.id}"></button>`
        : `<button class="btn btn-pause" data-action="pause" data-id="${download.id}">⏸</button>`
      }
      <button class="btn btn-cancel" data-action="cancel" data-id="${download.id}"></button>
    </div>
  `;
  
  // Add event listeners to buttons
  item.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', handleAction);
  });
  
  return item;
}

// Get status text for download
function getStatusText(download) {
  if (download.state === 'interrupted') {
    return `Interrupted: ${download.error}`;
  }
  
  const received = formatBytes(download.bytesReceived || 0);
  const total = formatBytes(download.totalBytes || 0);
  
  if (download.paused) {
    return `Paused • ${received} / ${total}`;
  }
  
  return `${received} / ${total}`;
}

// Handle action buttons
async function handleAction(event) {
  const action = event.target.dataset.action;
  const downloadId = parseInt(event.target.dataset.id);
  
  switch (action) {
    case 'pause':
      chrome.downloads.pause(downloadId);
      break;
    case 'resume':
      chrome.downloads.resume(downloadId);
      break;
    case 'cancel':
      chrome.downloads.cancel(downloadId);
      activeDownloads.delete(downloadId);
      renderDownloadList();
      break;
  }
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
```

This creates a functional download manager with pause, resume, and cancel capabilities. The popup displays real-time progress updates as downloads proceed.

---

Advanced Features and Best Practices {#advanced-features}

For a production-ready download manager chrome extension, consider implementing these advanced features.

Batch Downloads

For downloading multiple files at once, implement batch download functionality:

```javascript
async function downloadMultipleFiles(urls) {
  const results = [];
  
  for (const url of urls) {
    try {
      const downloadId = await new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: url,
          conflictAction: "uniquify"
        }, (id) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(id);
          }
        });
      });
      
      results.push({ url, success: true, id: downloadId });
    } catch (error) {
      results.push({ url, success: false, error: error.message });
    }
  }
  
  return results;
}

// Usage: Download all images from a page
const imageUrls = document.querySelectorAll('img').map(img => img.src);
const results = await downloadMultipleFiles(imageUrls);
```

Download Filtering and Search

Implement solid search functionality for your download manager:

```javascript
function searchDownloads(query, filters = {}) {
  const searchOptions = {
    query: [query],
    limit: filters.limit || 20,
    orderBy: [filters.sortBy || "-startTime"]
  };
  
  if (filters.state) {
    searchOptions.state = filters.state;
  }
  
  if (filters.startDate) {
    searchOptions.startTime = filters.startDate.toISOString();
  }
  
  if (filters.endDate) {
    searchOptions.endTime = filters.endDate.toISOString();
  }
  
  return new Promise((resolve) => {
    chrome.downloads.search(searchOptions, resolve);
  });
}

// Usage examples:
// Find all PDF downloads
const pdfs = await searchDownloads("pdf", { state: "completed" });

// Find downloads from the last week
const recent = await searchDownloads("", { 
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  sortBy: "-startTime"
});
```

Error Handling and Recovery

Implement comprehensive error handling:

```javascript
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state?.current === "interrupted") {
    const error = downloadDelta.error?.current;
    handleDownloadError(downloadDelta.id, error);
  }
});

function handleDownloadError(downloadId, error) {
  console.error(`Download ${downloadId} failed: ${error}`);
  
  const errorMessages = {
    "SERVER_UNAUTHORIZED": "Authentication required. Please check your credentials.",
    "SERVER_FORBIDDEN": "Access denied. You don't have permission to download this file.",
    "SERVER_BAD_CONTENT": "File not found or corrupted. Please try again.",
    "NETWORK_ERROR": "Network connection lost. Check your internet connection.",
    "FILE_TOO_LARGE": "File exceeds available disk space.",
    "FILE_WRITE_ERROR": "Unable to write file. Check disk permissions."
  };
  
  const userMessage = errorMessages[error] || "An unknown error occurred.";
  showErrorNotification(userMessage, downloadId);
}
```

---

Security Considerations {#security-considerations}

When building a chrome extension file download feature, security should be a top priority.

Validate Download URLs

Always validate URLs before initiating downloads:

```javascript
function isSafeDownloadUrl(url) {
  try {
    const parsedUrl = new URL(url);
    // Allow http and https only
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

async function safeDownload(url, options = {}) {
  if (!isSafeDownloadUrl(url)) {
    throw new Error("Invalid or unsafe download URL");
  }
  
  // Additional validation: check against allowed domains if needed
  const allowedDomains = options.allowedDomains || [];
  if (allowedDomains.length > 0) {
    const parsedUrl = new URL(url);
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      throw new Error("Domain not allowed");
    }
  }
  
  return chrome.downloads.download({ url, ...options });
}
```

Protect Sensitive Downloads

For sensitive files, implement additional protection:

```javascript
function downloadSensitiveFile(url, filename) {
  return chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true,  // Always prompt for save location
    headers: [
      { name: "Cache-Control", value: "no-store" }
    ]
  });
}
```

---

Testing and Debugging {#testing-debugging}

Proper testing ensures your download manager chrome extension works reliably across different scenarios.

Testing Download Scenarios

Create test cases for various download scenarios:

```javascript
// Test different download types
const testCases = [
  { 
    name: "Simple GET download",
    options: { url: "https://example.com/file.zip" }
  },
  {
    name: "POST request with headers",
    options: {
      url: "https://api.example.com/download",
      method: "POST",
      headers: [
        { name: "Authorization", value: "Bearer token123" }
      ],
      body: "param=value"
    }
  },
  {
    name: "Large file with progress",
    options: {
      url: "https://example.com/large-file.iso",
      filename: "large-file.iso"
    }
  }
];

testCases.forEach(async (testCase) => {
  console.log(`Testing: ${testCase.name}`);
  try {
    const id = await safeDownload(testCase.options);
    console.log(`  Success: Download ID ${id}`);
  } catch (error) {
    console.error(`  Failed: ${error.message}`);
  }
});
```

Debugging Tips

Use Chrome's extension debugging features:

1. View Download Logs: Open Chrome's Download Manager (chrome://downloads) to see all downloads
2. Extension Logs: Use chrome.runtime.lastError to catch API errors
3. Network Tab: Monitor network requests in DevTools
4. Event Pages: Ensure your service worker stays active for download events

---

Conclusion {#conclusion}

The Chrome Downloads API provides everything you need to build a powerful download manager chrome extension. From basic file downloads to advanced features like pause/resume, batch processing, and progress monitoring, this API enables you to create professional-grade download management tools.

Key takeaways from this guide:

- The chrome.downloads API is the foundation for any chrome extension file download functionality
- Manifest V3 requires proper permission configuration for downloads to work
- Event listeners provide real-time updates on download progress and status
- Implement pause, resume, and cancel for a complete user experience
- Always validate URLs and handle errors gracefully
- Test thoroughly across different download scenarios

With these skills, you can build download managers that compete with standalone applications, whether you need simple batch downloading or complex resumable transfers. The chrome.downloads API is well-documented and constantly improving, making it an excellent choice for any extension that handles file downloads.

For ready-to-use code snippets covering batch downloads, progress tracking, and file type handling, see our [downloads management patterns reference](/docs/patterns/downloads-management/).

Start building your download manager today, and explore the endless possibilities of programmatic download management in Chrome extensions.
