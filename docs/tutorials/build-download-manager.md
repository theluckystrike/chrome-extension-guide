---
layout: default
title: "Chrome Extension Download Manager. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-download-manager/"
last_modified_at: 2026-01-15
---
Build a Download Manager Extension

What You'll Build {#what-youll-build}

A comprehensive download manager extension with enhanced features including automatic file organization by category, real-time download progress tracking, desktop notifications, and batch download capabilities.

Prerequisites {#prerequisites}

- Chrome Downloads API (cross-ref `docs/api-reference/downloads-api.md`)
- Chrome Notifications API (cross-ref `docs/api-reference/notifications-api.md`)
- Understanding of service workers and event handling
- Storage API for persisting user preferences

For permission requirements, see:
- [permissions/downloads.md](../permissions/downloads.md)
- [permissions/notifications.md](../permissions/notifications.md)

For download management patterns, see:
- [guides/download-management.md](../guides/download-management.md)

Project Structure {#project-structure}

```
download-manager/
  manifest.json
  background.js
  popup/
    popup.html
    popup.css
    popup.js
  options/
    options.html
    options.js
```

Step 1: Manifest Configuration {#step-1-manifest-configuration}

Define required permissions and background worker:

```json
{
  "manifest_version": 3,
  "name": "Download Manager Pro",
  "version": "1.0.0",
  "permissions": [
    "downloads",
    "notifications",
    "storage",
    "contextMenus"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "options_page": "options/options.html"
}
```

Step 2: Download Monitoring {#step-2-download-monitoring}

Set up listeners in the background service worker to track all downloads:

```javascript
// background.js

// Track active downloads
const activeDownloads = new Map();

// Listen for new downloads
chrome.downloads.onCreated.addListener((downloadItem) => {
  activeDownloads.set(downloadItem.id, {
    ...downloadItem,
    startTime: Date.now(),
    bytesReceived: 0
  });
  
  // Update badge to show active count
  updateBadge();
  
  // Notify popup about new download
  broadcastDownloadUpdate(downloadItem);
});

// Track download progress
chrome.downloads.onChanged.addListener((downloadDelta) => {
  const download = activeDownloads.get(downloadDelta.id);
  if (!download) return;
  
  // Update download object with changes
  if (downloadDelta.bytesReceived) {
    download.bytesReceived = downloadDelta.bytesReceived.newValue;
  }
  if (downloadDelta.state) {
    download.state = downloadDelta.state.newValue;
  }
  
  broadcastDownloadUpdate(download);
  
  // Handle completion
  if (downloadDelta.state?.newValue === 'complete') {
    activeDownloads.delete(downloadDelta.id);
    updateBadge();
    showCompletionNotification(download);
  }
  
  // Handle errors
  if (downloadDelta.error) {
    showErrorNotification(download, downloadDelta.error.newValue);
  }
});

function updateBadge() {
  const count = activeDownloads.size;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
}

function broadcastDownloadUpdate(download) {
  chrome.runtime.sendMessage({
    type: 'DOWNLOAD_UPDATE',
    download: Object.fromEntries(activeDownloads)
  }).catch(() => {});
}
```

Step 3: Auto-Organization {#step-3-auto-organization}

Implement automatic file organization using `chrome.downloads.onDeterminingFilename`:

```javascript
// Configure category rules
const categoryRules = {
  images: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
    folder: 'Images'
  },
  documents: {
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'],
    folder: 'Documents'
  },
  videos: {
    extensions: ['.mp4', '.webm', '.avi', '.mov', '.mkv'],
    folder: 'Videos'
  },
  audio: {
    extensions: ['.mp3', '.wav', '.ogg', '.flac', '.aac'],
    folder: 'Audio'
  },
  archives: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    folder: 'Archives'
  }
};

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  const filename = downloadItem.filename.toLowerCase();
  const extension = '.' + filename.split('.').pop();
  
  for (const [category, rule] of Object.entries(categoryRules)) {
    if (rule.extensions.includes(extension)) {
      const suggestedPath = `Downloads/${rule.folder}/${downloadItem.filename}`;
      suggest({ filename: suggestedPath });
      return;
    }
  }
});

// Custom rules from storage
chrome.storage.local.get(['customRules'], (result) => {
  if (result.customRules) {
    // Apply user-defined rules
  }
});
```

Step 4: Progress UI in Popup {#step-4-progress-ui-in-popup}

Create an interactive popup showing download progress:

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="header">
    <h1>Downloads</h1>
    <button id="btn-clear">Clear Completed</button>
  </div>
  <div id="download-list"></div>
  <div class="footer">
    <button id="btn-options">Options</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

```css
/* popup/popup.css */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 360px; font-family: system-ui; background: #1a1a2e; color: #e0e0e0; }
.header { padding: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
.header h1 { font-size: 16px; color: #00ff41; }
#btn-clear { padding: 4px 8px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer; }
#download-list { max-height: 400px; overflow-y: auto; }
.download-item { padding: 12px; border-bottom: 1px solid #333; display: flex; flex-direction: column; gap: 8px; }
.download-item .name { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.download-item .progress-container { height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
.download-item .progress-bar { height: 100%; background: #00ff41; transition: width 0.3s; }
.download-item .stats { display: flex; justify-content: space-between; font-size: 11px; color: #888; }
.download-item .controls { display: flex; gap: 8px; }
.download-item button { padding: 4px 8px; font-size: 11px; cursor: pointer; border-radius: 4px; border: 1px solid #00ff41; background: transparent; color: #00ff41; }
.footer { padding: 8px; border-top: 1px solid #333; }
#btn-options { width: 100%; padding: 8px; background: #333; color: white; border: none; cursor: pointer; }
```

```javascript
// popup/popup.js
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  customRules: 'string'
}), 'local');

let activeDownloads = {};

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'DOWNLOAD_UPDATE') {
    activeDownloads = message.download;
    renderDownloads();
  }
});

// Load current downloads on open
chrome.downloads.search({}, (downloads) => {
  activeDownloads = downloads.filter(d => 
    d.state === 'in_progress' || d.state === 'interrupted'
  ).reduce((acc, d) => ({ ...acc, [d.id]: d }), {});
  renderDownloads();
});

function renderDownloads() {
  const list = document.getElementById('download-list');
  list.innerHTML = '';
  
  Object.values(activeDownloads).forEach(download => {
    const percent = download.totalBytes 
      ? Math.round((download.bytesReceived / download.totalBytes) * 100) 
      : 0;
    
    const item = document.createElement('div');
    item.className = 'download-item';
    item.innerHTML = `
      <div class="name">${download.filename}</div>
      <div class="progress-container">
        <div class="progress-bar" style="width: ${percent}%"></div>
      </div>
      <div class="stats">
        <span>${formatBytes(download.bytesReceived)} / ${formatBytes(download.totalBytes || 0)}</span>
        <span>${percent}%</span>
      </div>
      <div class="controls">
        <button data-action="pause" data-id="${download.id}">Pause</button>
        <button data-action="cancel" data-id="${download.id}">Cancel</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Control handlers
document.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  const id = parseInt(e.target.dataset.id);
  
  if (action === 'pause') {
    chrome.downloads.pause(id);
  } else if (action === 'cancel') {
    chrome.downloads.cancel(id);
  } else if (e.target.id === 'btn-options') {
    chrome.runtime.openOptionsPage();
  } else if (e.target.id === 'btn-clear') {
    chrome.downloads.search({ state: 'complete' }, (downloads) => {
      downloads.forEach(d => chrome.downloads.removeFile(d.id));
    });
  }
});
```

Step 5: Notifications {#step-5-notifications}

Add desktop notifications for download events:

```javascript
// Notification helpers (add to background.js)

function showCompletionNotification(download) {
  chrome.notifications.create(`complete-${download.id}`, {
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Download Complete',
    message: download.filename,
    priority: 1
  }, (notificationId) => {
    // Auto-dismiss after 5 seconds
    setTimeout(() => chrome.notifications.clear(notificationId), 5000);
  });
}

function showErrorNotification(download, error) {
  chrome.notifications.create(`error-${download.id}`, {
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Download Failed',
    message: `${download.filename}: ${error}`,
    priority: 2,
    buttons: [
      { title: 'Retry' },
      { title: 'Open Downloads' }
    ]
  }, (notificationId) => {
    // Handle button clicks
    chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
      if (id === notificationId) {
        if (buttonIndex === 0) {
          // Retry download
          chrome.downloads.download({ url: download.url });
        } else {
          chrome.downloads.showDefaultFolder();
        }
      }
    });
  });
}
```

Step 6: Batch Downloads {#step-6-batch-downloads}

Add context menu for batch downloading links:

```javascript
// Add to background.js

chrome.contextMenus.create({
  id: 'batch-download',
  title: 'Download All Links',
  contexts: ['page']
});

chrome.contextMenus.create({
  id: 'batch-download-images',
  title: 'Download All Images',
  contexts: ['page']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'batch-download') {
    fetchAllLinks(tab.id);
  } else if (info.menuItemId === 'batch-download-images') {
    fetchImageLinks(tab.id);
  }
});

function fetchAllLinks(tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'getLinks' }, (links) => {
    downloadSequentially(links);
  });
}

function fetchImageLinks(tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'getImageLinks' }, (links) => {
    downloadSequentially(links);
  });
}

async function downloadSequentially(urls) {
  for (const url of urls) {
    try {
      await chrome.downloads.download({ url });
      // Delay between downloads to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Download failed:', error);
    }
  }
}

// Content script for link extraction
// Add to manifest under content_scripts
```

```javascript
// content-script.js (for link extraction)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getLinks') {
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => a.href)
      .filter(href => href.startsWith('http'));
    sendResponse(links);
  } else if (message.action === 'getImageLinks') {
    const images = Array.from(document.querySelectorAll('img[src]'))
      .map(img => img.src)
      .filter(src => src.startsWith('http'));
    sendResponse(images);
  }
});
```

Step 7: Download History {#step-7-download-history}

Store and search download history using storage:

```javascript
// Add to background.js for history tracking

const historyStorage = {
  key: 'downloadHistory',
  
  async add(download) {
    const history = await this.get();
    history.unshift({
      id: download.id,
      filename: download.filename,
      url: download.url,
      mimeType: download.mime,
      fileSize: download.fileSize,
      startTime: download.startTime,
      endTime: download.endTime,
      state: download.state
    });
    // Keep only last 1000 entries
    if (history.length > 1000) history.pop();
    await chrome.storage.local.set({ [this.key]: history });
  },
  
  async get() {
    const result = await chrome.storage.local.get(this.key);
    return result[this.key] || [];
  },
  
  async search(query) {
    const history = await this.get();
    const lowerQuery = query.toLowerCase();
    return history.filter(item => 
      item.filename.toLowerCase().includes(lowerQuery) ||
      item.url.toLowerCase().includes(lowerQuery)
    );
  },
  
  async clear() {
    await chrome.storage.local.remove(this.key);
  }
};

// Track completed downloads for history
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state?.newValue === 'complete') {
    chrome.downloads.search({ id: downloadDelta.id }, (downloads) => {
      if (downloads[0]) {
        historyStorage.add(downloads[0]);
      }
    });
  }
});
```

Summary {#summary}

This download manager extension provides:

1. Real-time monitoring of all downloads with progress tracking
2. Auto-organization by file type into categorized folders
3. Interactive popup UI with pause/resume/cancel controls
4. Desktop notifications for completion and errors
5. Batch downloading via context menu for images or all links
6. Download history with search and stats

You can extend this further by adding:
- Download speed calculation and ETA
- Queue management with priority
- File integrity verification (checksums)
- Cloud sync for download history
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
