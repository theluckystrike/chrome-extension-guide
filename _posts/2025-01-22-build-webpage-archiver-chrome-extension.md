---
layout: post
title: "Build a Webpage Archiver Chrome Extension: Complete 2025 Tutorial"
description: "Learn how to build a webpage archiver extension that saves pages offline. This comprehensive tutorial covers Manifest V3, the chrome.pageCapture API, storage solutions, and how to create a production-ready web archive chrome extension."
date: 2025-01-22
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "webpage archiver extension, save page offline, web archive chrome"
canonical_url: "https://bestchromeextensions.com/2025/01/22/build-webpage-archiver-chrome-extension/"
---

# Build a Webpage Archiver Chrome Extension: Complete 2025 Tutorial

The internet is constantly changing. Websites disappear, content gets removed, and valuable resources become inaccessible every day. Whether you are a researcher collecting articles for study, a developer saving documentation for offline reference, or simply someone who wants to preserve important web content, a webpage archiver extension can be an invaluable tool.

In this comprehensive tutorial, we will walk through building a production-ready webpage archiver Chrome extension from scratch. We will use Chrome's built-in page capture APIs, implement efficient storage solutions, and create a user-friendly interface that makes saving web pages offline simple and intuitive.

---

## Why Build a Webpage Archiver Extension? {#why-build-webpage-archiver}

Before we dive into the code, let us explore why building a webpage archiver extension is a worthwhile project in 2025.

### The Problem with Link Rot

Link rot is a genuine issue affecting the web. Studies have shown that approximately 20% of links in academic papers are no longer functional, and the same applies to blog posts, news articles, and documentation. When a website goes offline or removes content, all that valuable information is lost forever.

A webpage archiver extension solves this problem by allowing users to save complete web pages locally, including all HTML, CSS, images, and JavaScript. This creates a self-contained archive that can be accessed even without an internet connection.

### Use Cases for a Webpage Archiver

There are many practical applications for a webpage archiver extension:

- **Research and Academia**: Save articles, papers, and reference materials for offline reading and future reference.
- **Documentation Preservation**: Keep local copies of important technical documentation that might change or disappear.
- **Offline Reading**: Save news articles, blog posts, and tutorials for reading during commutes or travel.
- **Content Backup**: Create backups of your own web content before making changes to your site.
- **Archive Quality**: Some websites have paywalls or require subscriptions. Saving locally lets you retain access to content you have already viewed.

---

## Understanding Chrome's Page Capture APIs {#understanding-apis}

Chrome provides several APIs that enable webpage archiving functionality. Understanding these APIs is crucial for building an effective archiver extension.

### The chrome.pageCapture API

The primary API we will use is `chrome.pageCapture`. This API allows extensions to save the content of a tab as an MHTML file. MHTML (MIME HTML) is a web page archive format that bundles all resources (images, CSS, JavaScript) into a single file.

The `chrome.pageCapture.saveAsMHTML` method is the core function we will use. It takes a tab ID as input and returns a blob containing the complete MHTML representation of the page.

### Key Capabilities

The chrome.pageCapture API offers several important capabilities:

- **Complete Page Capture**: Saves the entire DOM, including dynamically loaded content.
- **Resource Bundling**: Embeds all external resources (images, stylesheets, scripts) directly into the MHTML file.
- **Single File Output**: Creates a single, self-contained file that is easy to store and share.
- **Native Format**: Produces standard MHTML that browsers can open directly.

### Limitations to Consider

While chrome.pageCapture is powerful, it has some limitations:

- **No Captured Screenshots**: It does not capture visual screenshots; it captures the HTML content.
- **Some Dynamic Content**: Content loaded via complex JavaScript frameworks may not render perfectly.
- **Cross-Origin Restrictions**: Some cross-origin resources may not be captured due to CORS policies.

---

## Project Structure and Setup {#project-structure}

Let us set up our Chrome extension project with the proper structure.

### Directory Structure

```
webpage-archiver/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── background.js
├── content/
│   └── content.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Manifest V3 Configuration

Our `manifest.json` file will define the extension's permissions and components:

```json
{
  "manifest_version": 3,
  "name": "Webpage Archiver",
  "version": "1.0.0",
  "description": "Save complete web pages offline for offline reading and archiving",
  "permissions": [
    "pageCapture",
    "storage",
    "tabs"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"]
    }
  ]
}
```

The manifest requests three key permissions:
- `pageCapture`: Required to save pages as MHTML
- `storage`: Required to manage saved archives
- `tabs`: Required to access tab information

---

## Implementing the Background Service Worker {#background-service-worker}

The background service worker handles the core archiving logic. It communicates with the popup and manages the saved archives.

### Background Script Implementation

Create `background/background.js`:

```javascript
// Background service worker for Webpage Archiver extension

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'savePage') {
    savePageAsArchive(message.tabId, message.tabUrl, message.tabTitle)
      .then(archiveInfo => {
        sendResponse({ success: true, archive: archiveInfo });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'getArchives') {
    getAllArchives()
      .then(archives => {
        sendResponse({ success: true, archives: archives });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (message.action === 'deleteArchive') {
    deleteArchive(message.archiveId)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// Save the current page as an MHTML archive
async function savePageAsArchive(tabId, tabUrl, tabTitle) {
  try {
    // Capture the page as MHTML
    const mhtmlBlob = await chrome.pageCapture.saveAsMHTML({ tabId });
    
    if (!mhtmlBlob) {
      throw new Error('Failed to capture page');
    }
    
    // Create a unique ID and filename
    const archiveId = `archive_${Date.now()}`;
    const sanitizedTitle = tabTitle
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50);
    const filename = `${sanitizedTitle}_${Date.now()}.mhtml`;
    
    // Convert blob to ArrayBuffer for storage
    const arrayBuffer = await mhtmlBlob.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Store the archive metadata and data
    const archiveInfo = {
      id: archiveId,
      title: tabTitle,
      url: tabUrl,
      filename: filename,
      savedAt: new Date().toISOString(),
      size: arrayBuffer.byteLength
    };
    
    // Save to chrome.storage
    const storageKey = `archive_${archiveId}`;
    await chrome.storage.local.set({
      [storageKey]: {
        metadata: archiveInfo,
        data: base64Data
      }
    });
    
    // Update archive list
    const result = await chrome.storage.local.get('archiveList');
    const archiveList = result.archiveList || [];
    archiveList.unshift(archiveInfo);
    await chrome.storage.local.set({ archiveList: archiveList });
    
    return archiveInfo;
  } catch (error) {
    console.error('Error saving page:', error);
    throw error;
  }
}

// Get all saved archives
async function getAllArchives() {
  const result = await chrome.storage.local.get('archiveList');
  return result.archiveList || [];
}

// Delete an archive
async function deleteArchive(archiveId) {
  const storageKey = `archive_${archiveId}`;
  await chrome.storage.local.remove(storageKey);
  
  const result = await chrome.storage.local.get('archiveList');
  const archiveList = result.archiveList || [];
  const updatedList = archiveList.filter(archive => archive.id !== archiveId);
  await chrome.storage.local.set({ archiveList: updatedList });
}

// Listen for tab updates to potentially auto-save (optional feature)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Optional: Implement auto-archive functionality here
    // For now, we let users manually save pages
  }
});
```

The background script handles all the heavy lifting: capturing pages, converting them to MHTML format, and managing storage. It provides a clean API for the popup to interact with.

---

## Creating the Popup Interface {#popup-interface}

The popup provides the user interface for our extension. It allows users to save the current page and view their saved archives.

### HTML Structure

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webpage Archiver</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Webpage Archiver</h1>
      <p class="subtitle">Save pages offline</p>
    </header>
    
    <div class="current-page">
      <h2>Current Page</h2>
      <div id="pageInfo" class="page-info">
        <p class="loading">Loading...</p>
      </div>
      <button id="saveButton" class="primary-button">
        Save This Page
      </button>
    </div>
    
    <div class="archives-section">
      <h2>Saved Archives</h2>
      <div id="archivesList" class="archives-list">
        <p class="empty-state">No archives saved yet</p>
      </div>
    </div>
    
    <div id="statusMessage" class="status-message"></div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### CSS Styling

Create `popup/popup.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 350px;
  min-height: 400px;
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #1a73e8;
}

.subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.current-page {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.current-page h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #444;
}

.page-info {
  margin-bottom: 12px;
}

.page-info .loading {
  color: #666;
  font-size: 12px;
}

.page-title {
  font-weight: 500;
  font-size: 13px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-url {
  font-size: 11px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-button {
  width: 100%;
  padding: 10px 16px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-button:hover {
  background: #1557b0;
}

.primary-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.archives-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.archives-section h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #444;
}

.archives-list {
  max-height: 200px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  color: #666;
  font-size: 12px;
  padding: 20px 0;
}

.archive-item {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.archive-item:last-child {
  border-bottom: none;
}

.archive-title {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-meta {
  font-size: 10px;
  color: #666;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.archive-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.archive-actions button {
  padding: 4px 8px;
  font-size: 11px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.view-btn {
  background: #e8f0fe;
  color: #1a73e8;
}

.view-btn:hover {
  background: #d2e3fc;
}

.delete-btn {
  background: #fce8e6;
  color: #d93025;
}

.delete-btn:hover {
  background: #f1c0c0;
}

.status-message {
  margin-top: 12px;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
  display: none;
}

.status-message.success {
  display: block;
  background: #e6f4ea;
  color: #1e8e3e;
}

.status-message.error {
  display: block;
  background: #fce8e6;
  color: #d93025;
}

.status-message.loading {
  display: block;
  background: #e8f0fe;
  color: #1a73e8;
}
```

### Popup JavaScript

Create `popup/popup.js`:

```javascript
// Popup script for Webpage Archiver extension

document.addEventListener('DOMContentLoaded', async () => {
  const pageInfo = document.getElementById('pageInfo');
  const saveButton = document.getElementById('saveButton');
  const archivesList = document.getElementById('archivesList');
  const statusMessage = document.getElementById('statusMessage');
  
  let currentTab = null;
  
  // Get the current active tab
  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }
  
  // Display current page info
  async function displayCurrentPage() {
    try {
      currentTab = await getCurrentTab();
      
      if (currentTab && currentTab.url && !currentTab.url.startsWith('chrome://')) {
        pageInfo.innerHTML = `
          <p class="page-title">${currentTab.title || 'Untitled'}</p>
          <p class="page-url">${currentTab.url}</p>
        `;
        saveButton.disabled = false;
      } else {
        pageInfo.innerHTML = `
          <p class="loading">Cannot archive this page</p>
        `;
        saveButton.disabled = true;
      }
    } catch (error) {
      pageInfo.innerHTML = `
        <p class="loading">Error loading page info</p>
      `;
      saveButton.disabled = true;
    }
  }
  
  // Save the current page
  async function saveCurrentPage() {
    if (!currentTab) {
      showStatus('No page to save', 'error');
      return;
    }
    
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    showStatus('Saving page...', 'loading');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'savePage',
        tabId: currentTab.id,
        tabUrl: currentTab.url,
        tabTitle: currentTab.title
      });
      
      if (response.success) {
        showStatus(`Saved: ${response.archive.title}`, 'success');
        await loadArchives();
      } else {
        showStatus(`Error: ${response.error}`, 'error');
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save This Page';
    }
  }
  
  // Load and display archives
  async function loadArchives() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getArchives' });
      
      if (response.success && response.archives.length > 0) {
        renderArchives(response.archives);
      } else {
        archivesList.innerHTML = '<p class="empty-state">No archives saved yet</p>';
      }
    } catch (error) {
      archivesList.innerHTML = '<p class="empty-state">Error loading archives</p>';
    }
  }
  
  // Render archives list
  function renderArchives(archives) {
    archivesList.innerHTML = archives.map(archive => `
      <div class="archive-item" data-id="${archive.id}">
        <p class="archive-title">${archive.title}</p>
        <div class="archive-meta">
          <span>${formatDate(archive.savedAt)}</span>
          <span>${formatSize(archive.size)}</span>
        </div>
        <div class="archive-actions">
          <button class="view-btn" onclick="viewArchive('${archive.id}')">View</button>
          <button class="delete-btn" onclick="deleteArchive('${archive.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }
  
  // View an archive
  window.viewArchive = async function(archiveId) {
    try {
      const result = await chrome.storage.local.get(`archive_${archiveId}`);
      const archiveData = result[`archive_${archiveId}`];
      
      if (archiveData) {
        // Create a blob from the base64 data
        const binaryString = atob(archiveData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'message/rfc822' });
        
        // Create a URL for the blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Open in a new tab
        chrome.tabs.create({ url: blobUrl });
      }
    } catch (error) {
      showStatus(`Error viewing archive: ${error.message}`, 'error');
    }
  };
  
  // Delete an archive
  window.deleteArchive = async function(archiveId) {
    try {
      await chrome.runtime.sendMessage({
        action: 'deleteArchive',
        archiveId: archiveId
      });
      await loadArchives();
      showStatus('Archive deleted', 'success');
    } catch (error) {
      showStatus(`Error deleting: ${error.message}`, 'error');
    }
  };
  
  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Format file size
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    if (type !== 'loading') {
      setTimeout(() => {
        statusMessage.className = 'status-message';
      }, 3000);
    }
  }
  
  // Event listeners
  saveButton.addEventListener('click', saveCurrentPage);
  
  // Initialize
  await displayCurrentPage();
  await loadArchives();
});
```

The popup provides a clean, intuitive interface for saving and managing archived pages. Users can save the current page with a single click, view their saved archives, and even open archived pages directly from the popup.

---

## Adding Content Script Functionality {#content-script}

While our main functionality works through the background script, we can add a content script for enhanced features like a context menu option.

Create `content/content.js`:

```javascript
// Content script for Webpage Archiver extension

// This script runs on web pages and can provide additional functionality
// For example, we could add a floating button on the page itself

console.log('Webpage Archiver content script loaded');

// Optional: Add a floating save button to the page
function addFloatingButton() {
  // Only add if not already present
  if (document.getElementById('webpage-archiver-floating-btn')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'webpage-archiver-floating-btn';
  button.innerHTML = '💾';
  button.title = 'Save page with Webpage Archiver';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #1a73e8;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 999999;
    transition: transform 0.2s, background 0.2s;
  `;
  
  button.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.runtime.sendMessage({
      action: 'savePage',
      tabId: tab.id,
      tabUrl: tab.url,
      tabTitle: document.title
    }, (response) => {
      if (response.success) {
        button.textContent = '✅';
        setTimeout(() => {
          button.textContent = '💾';
        }, 2000);
      }
    });
  });
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });
  
  document.body.appendChild(button);
}

// Only add the floating button on user request (via message from background)
// For now, we keep it disabled to avoid cluttering pages
// To enable, you could add a message listener:

/*
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showFloatingButton') {
    addFloatingButton();
  }
});
*/
```

The content script is optional but demonstrates how you could extend the extension with page-level features.

---

## Testing Your Extension {#testing}

Now that we have built the extension, let us discuss how to test it properly.

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension directory
4. The extension should now appear in your toolbar

### Testing the Extension

1. Navigate to any web page you want to archive
2. Click the extension icon in your toolbar
3. Verify that the current page information is displayed
4. Click "Save This Page"
5. Wait for the save to complete
6. Check that the archive appears in the "Saved Archives" list
7. Click "View" to open the archived page in a new tab
8. Verify that the archived page displays correctly offline

### Common Issues and Solutions

If you encounter issues during testing:

- **Extension not loading**: Check for errors in `manifest.json` syntax
- **Save button disabled**: Ensure you are not on a restricted page (chrome://, about:, etc.)
- **Archives not displaying**: Check the extension console for storage errors
- **View not working**: Ensure the MHTML file is being created correctly

---

## Advanced Features to Consider {#advanced-features}

This basic implementation provides solid foundation. Here are some advanced features you could add to make your extension more powerful:

### 1. Automatic Background Saving

Implement a feature that automatically saves pages in the background based on user-defined rules, such as saving pages that match certain URL patterns.

### 2. Cloud Sync

Add cloud storage integration (Google Drive, Dropbox, etc.) to sync archives across devices and provide backup protection.

### 3. Search Functionality

Implement full-text search across all saved archives to help users find specific content quickly.

### 4. Export Options

Add the ability to export archives in different formats (PDF, HTML folder, etc.) for better portability.

### 5. Organization Features

Add folders, tags, and categories to help users organize their archives effectively.

### 6. Bookmark Integration

Allow users to import their Chrome bookmarks and automatically archive them.

### 7. Batch Operations

Implement functionality to archive multiple tabs at once, which is especially useful for researchers collecting multiple sources.

---

## Publishing Your Extension {#publishing}

Once you have tested your extension thoroughly, you can publish it to the Chrome Web Store:

1. Create a developer account at the Chrome Web Store
2. Package your extension as a ZIP file
3. Upload through the Chrome Web Store Developer Dashboard
4. Provide required information (screenshots, description, etc.)
5. Submit for review

When publishing, ensure your extension follows Google's policies and provides genuine value to users. A well-documented, privacy-focused webpage archiver can be a valuable tool for many users.

---

## Conclusion {#conclusion}

Building a webpage archiver Chrome extension is an excellent project that combines practical utility with important development skills. Throughout this tutorial, we have covered:

- The fundamentals of Chrome's pageCapture API
- How to structure a Manifest V3 extension
- Implementing background service workers for core functionality
- Creating intuitive popup interfaces
- Managing local storage for archive data
- Testing and debugging techniques

The extension we built provides a complete solution for saving web pages offline. Users can save any page with a single click, manage their archives, and view saved content even without an internet connection.

As you continue developing the extension, consider adding advanced features like cloud sync, search functionality, and organization tools. With a solid foundation, you can transform this basic archiver into a powerful tool that serves researchers, students, professionals, and anyone who values preserving web content.

The ability to save pages offline is more important than ever in our connected world. By building this extension, you are not just learning Chrome extension development—you are creating a tool that helps preserve knowledge and information for the future.

---

## Additional Resources {#resources}

To continue learning and improving your extension, explore these resources:

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome PageCapture API Reference](https://developer.chrome.com/docs/extensions/reference/pageCapture/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [MHTML Format Specification](https://tools.ietf.org/html/rfc2557)

Happy coding, and enjoy building your webpage archiver extension!
