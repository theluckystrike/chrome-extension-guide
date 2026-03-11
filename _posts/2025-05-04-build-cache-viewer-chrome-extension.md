---
layout: post
title: "Build a Cache Viewer Chrome Extension: Inspect Browser Cache Contents"
description: "Learn how to build a Chrome extension cache viewer to inspect browser cache contents, manage cached resources, and debug caching issues in your web applications."
date: 2025-05-04
categories: [Chrome-Extensions, Developer-Tools]
tags: [cache, debugging, chrome-extension]
keywords: "chrome extension cache viewer, browser cache inspector, chrome cache extension, view cached resources chrome, cache management extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/05/04/build-cache-viewer-chrome-extension/"
---

# Build a Cache Viewer Chrome Extension: Inspect Browser Cache Contents

Browser caching is one of the most critical performance optimization techniques used in modern web development. When users visit a website, Chrome stores various resources locally—images, stylesheets, JavaScript files, fonts, and API responses—in its cache to speed up subsequent page loads. While this mechanism significantly improves user experience and reduces server load, it can also create debugging challenges for developers. Understanding what is cached, how long it remains stored, and being able to inspect these cached resources manually is essential for troubleshooting caching issues, optimizing performance, and building robust web applications.

In this comprehensive guide, we will walk through building a Chrome extension that allows you to view, inspect, and manage browser cache contents. This cache viewer extension will provide a user-friendly interface to explore cached resources, examine their headers, and even clear specific items from the cache. Whether you are a web developer debugging caching issues or a power user wanting more control over your browser's storage, this project will give you valuable insights into Chrome's caching mechanisms.

---

## Understanding Browser Cache Architecture {#understanding-browser-cache}

Before diving into the implementation, it is crucial to understand how Chrome's cache system works. Chrome uses multiple caching mechanisms, each serving different purposes and storing different types of data.

### HTTP Cache

The HTTP cache is the primary mechanism for storing web resources. When your browser makes an HTTP request, the server responds with caching directives through headers like `Cache-Control`, `ETag`, and `Last-Modified`. Based on these headers, Chrome decides whether to serve a cached version or fetch a fresh copy from the server. The HTTP cache stores various resource types including HTML documents, CSS stylesheets, JavaScript files, images, fonts, and API responses.

The HTTP cache is further divided into two components: the memory cache and the disk cache. The memory cache stores recently accessed resources in RAM for extremely fast access, while the disk cache stores larger or less frequently accessed items on the hard drive. Chrome automatically manages the division between memory and disk cache based on available resources and usage patterns.

### Cache Storage APIs

For extensions, Chrome provides several APIs to interact with caching mechanisms. The most important ones include the `chrome.cache` API, the `chrome.broadcastChannel` for communication, and the various storage APIs like `chrome.storage`. However, it is important to note that the standard Chrome Extensions API does not provide direct access to the HTTP cache for security and privacy reasons.

Extensions can use the `chrome.webRequest` API to intercept network requests and analyze caching behavior, the `chrome.storage` API to store extension-specific data, and the `chrome.debugger` API for more advanced introspection capabilities. For our cache viewer extension, we will leverage a combination of these APIs to provide comprehensive cache inspection functionality.

---

## Project Setup and Manifest Configuration {#project-setup}

Every Chrome extension begins with a `manifest.json` file that defines the extension's configuration, permissions, and capabilities. For our cache viewer extension, we need to specify permissions for accessing cache storage, browsing data, and network request information.

Create a new directory for your extension project and add the following `manifest.json` file:

```json
{
  "manifest_version": 3,
  "name": "Cache Viewer Pro",
  "version": "1.0.0",
  "description": "Inspect and manage browser cache contents with ease",
  "permissions": [
    "storage",
    "browsingData",
    "webRequest",
    "webRequestBlocking"
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
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest requests the necessary permissions to access browsing data and intercept network requests. The `webRequest` permission combined with `webRequestBlocking` allows us to observe network traffic and cache-related information.

---

## Building the Popup Interface {#building-popup-interface}

The popup is the primary user interface for our extension. It provides a clean, intuitive interface for users to view and manage cached resources. We will create an HTML file with a modern, responsive design that displays cache information in an organized manner.

Create `popup.html` with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cache Viewer Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Cache Viewer Pro</h1>
      <div class="stats">
        <span id="cacheCount">0</span> cached items
      </div>
    </header>
    
    <div class="controls">
      <button id="refreshBtn" class="btn primary">
        <span class="icon">⟳</span> Refresh
      </button>
      <button id="clearAllBtn" class="btn danger">
        <span class="icon">🗑</span> Clear All
      </button>
    </div>
    
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search cached resources...">
    </div>
    
    <div class="cache-list" id="cacheList">
      <div class="loading">Loading cached resources...</div>
    </div>
    
    <div class="details-panel" id="detailsPanel" style="display: none;">
      <h3>Resource Details</h3>
      <div id="resourceDetails"></div>
      <button id="closeDetails" class="btn secondary">Close</button>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The HTML structure provides a clean interface with a header showing cache statistics, action buttons for refreshing and clearing cache, a search box for filtering resources, a scrollable list of cached items, and a details panel for viewing individual resource information.

---

## Styling the Extension {#styling-extension}

A well-designed extension not only looks professional but also provides a better user experience. We will create a modern, clean design using CSS with attention to usability and visual hierarchy.

Create `popup.css` with the following styles:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 400px;
  min-height: 500px;
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
}

.stats {
  font-size: 14px;
  color: #666;
  background: #e8f0fe;
  padding: 4px 12px;
  border-radius: 16px;
}

.controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn.primary {
  background: #1a73e8;
  color: white;
}

.btn.primary:hover {
  background: #1557b0;
}

.btn.danger {
  background: #ea4335;
  color: white;
}

.btn.danger:hover {
  background: #c5221f;
}

.btn.secondary {
  background: #f1f3f4;
  color: #333;
  margin-top: 12px;
}

.btn.secondary:hover {
  background: #e8eaed;
}

.search-box {
  margin-bottom: 12px;
}

.search-box input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-box input:focus {
  border-color: #1a73e8;
}

.cache-list {
  max-height: 350px;
  overflow-y: auto;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.cache-item {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
}

.cache-item:hover {
  background: #f8f9fa;
}

.cache-item:last-child {
  border-bottom: none;
}

.cache-item .url {
  font-size: 13px;
  color: #1a73e8;
  word-break: break-all;
  margin-bottom: 4px;
}

.cache-item .meta {
  font-size: 11px;
  color: #666;
  display: flex;
  gap: 12px;
}

.cache-item .type {
  background: #e8f0fe;
  color: #1a73e8;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.loading {
  padding: 24px;
  text-align: center;
  color: #666;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: #999;
}

.details-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 350px;
  height: 100%;
  background: white;
  box-shadow: -2px 0 10px rgba(0,0,0,0.1);
  padding: 16px;
  overflow-y: auto;
}

.details-panel h3 {
  margin-bottom: 16px;
  font-size: 16px;
}

.detail-row {
  margin-bottom: 12px;
}

.detail-label {
  font-size: 11px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 13px;
  word-break: break-all;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
}
```

These styles provide a clean, modern interface with proper spacing, hover effects, and a professional color scheme consistent with Chrome's design language.

---

## Implementing the Core Logic {#implementing-core-logic}

Now we need to implement the JavaScript logic that powers our extension. This includes the background service worker that monitors network requests and caches information, and the popup script that displays this information to users.

First, create `background.js` which will serve as the service worker:

```javascript
// background.js - Service Worker for Cache Viewer Pro

// Storage for captured cache entries
let cacheEntries = [];
let isMonitoring = false;

// Listen for web requests to capture cache information
chrome.webRequest.onCompleted.addListener(
  (details) => {
    // Only track responses that might be cached
    if (details.ip || details.fromCache) {
      const entry = {
        id: Date.now() + Math.random(),
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        mimeType: details.mimeType,
        fromCache: details.fromCache,
        responseHeaders: details.responseHeaders,
        timeStamp: new Date().toISOString(),
        tabId: details.tabId,
        frameId: details.frameId
      };
      
      // Add to our entries (limit to 500 most recent)
      cacheEntries.unshift(entry);
      if (cacheEntries.length > 500) {
        cacheEntries.pop();
      }
      
      // Notify popup if open
      chrome.runtime.sendMessage({
        type: 'CACHE_UPDATE',
        entries: cacheEntries
      }).catch(() => {
        // Popup may not be open, ignore error
      });
    }
  },
  { urls: ['<all_urls>'] }
);

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CACHE_ENTRIES') {
    sendResponse({ entries: cacheEntries });
  } else if (message.type === 'CLEAR_CACHE') {
    clearBrowsingData().then(() => {
      cacheEntries = [];
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  } else if (message.type === 'CLEAR_ENTRY') {
    const entryId = message.id;
    cacheEntries = cacheEntries.filter(e => e.id !== entryId);
    sendResponse({ success: true });
  }
});

// Clear browsing data
async function clearBrowsingData() {
  return new Promise((resolve) => {
    chrome.browsingData.remove({
      since: 0
    }, {
      cache: true,
      cookies: false,
      fileSystems: false,
      formData: false,
      history: false,
      indexedDB: false,
      localStorage: false,
      passwords: false,
      serviceWorkers: false,
      webSQL: false
    }, () => {
      resolve();
    });
  });
}

// Listen for tab updates to refresh cache entries
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Refresh cache entries when page loads
    // This is handled by the webRequest listener
  }
});
```

The background script monitors network requests using the `webRequest` API and captures information about cached resources. It stores up to 500 recent entries and communicates with the popup when needed.

Now create `popup.js` which handles the user interface interactions:

```javascript
// popup.js - Popup script for Cache Viewer Pro

document.addEventListener('DOMContentLoaded', () => {
  const cacheList = document.getElementById('cacheList');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const searchInput = document.getElementById('searchInput');
  const cacheCount = document.getElementById('cacheCount');
  const detailsPanel = document.getElementById('detailsPanel');
  const resourceDetails = document.getElementById('resourceDetails');
  const closeDetails = document.getElementById('closeDetails');

  let allEntries = [];
  let filteredEntries = [];

  // Load cache entries
  loadCacheEntries();

  // Event listeners
  refreshBtn.addEventListener('click', loadCacheEntries);
  
  clearAllBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all cached data? This cannot be undone.')) {
      try {
        await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
        allEntries = [];
        filteredEntries = [];
        renderCacheList();
        updateStats();
        alert('Cache cleared successfully!');
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('Failed to clear cache. Please try again.');
      }
    }
  });

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filteredEntries = allEntries.filter(entry => 
      entry.url.toLowerCase().includes(query) ||
      (entry.mimeType && entry.mimeType.toLowerCase().includes(query))
    );
    renderCacheList();
  });

  closeDetails.addEventListener('click', () => {
    detailsPanel.style.display = 'none';
  });

  // Listen for cache updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'CACHE_UPDATE') {
      allEntries = message.entries;
      filteredEntries = allEntries;
      renderCacheList();
      updateStats();
    }
  });

  function loadCacheEntries() {
    cacheList.innerHTML = '<div class="loading">Loading cached resources...</div>';
    
    chrome.runtime.sendMessage({ type: 'GET_CACHE_ENTRIES' }, (response) => {
      if (response && response.entries) {
        allEntries = response.entries;
        filteredEntries = allEntries;
        renderCacheList();
        updateStats();
      } else {
        cacheList.innerHTML = '<div class="empty-state">No cached resources found</div>';
      }
    });
  }

  function renderCacheList() {
    if (filteredEntries.length === 0) {
      cacheList.innerHTML = '<div class="empty-state">No cached resources found</div>';
      return;
    }

    cacheList.innerHTML = filteredEntries.map(entry => {
      const url = new URL(entry.url);
      const fileName = url.pathname.split('/').pop() || url.hostname;
      const extension = fileName.split('.').pop() || '';
      const type = getResourceType(entry.mimeType, extension);
      
      return `
        <div class="cache-item" data-id="${entry.id}">
          <div class="url">${escapeHtml(fileName)}</div>
          <div class="meta">
            <span class="type">${type}</span>
            <span>${entry.statusCode}</span>
            <span>${entry.fromCache ? 'Cached' : 'Network'}</span>
          </div>
        </div>
      `;
    }).join('');

    // Add click listeners to items
    document.querySelectorAll('.cache-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseFloat(item.dataset.id);
        const entry = allEntries.find(e => e.id === id);
        if (entry) {
          showDetails(entry);
        }
      });
    });
  }

  function showDetails(entry) {
    const headers = entry.responseHeaders || [];
    const headersHtml = headers.map(h => 
      `<div class="detail-row">
        <div class="detail-label">${escapeHtml(h.name)}</div>
        <div class="detail-value">${escapeHtml(h.value)}</div>
      </div>`
    ).join('');

    resourceDetails.innerHTML = `
      <div class="detail-row">
        <div class="detail-label">URL</div>
        <div class="detail-value">${escapeHtml(entry.url)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Method</div>
        <div class="detail-value">${entry.method}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Status Code</div>
        <div class="detail-value">${entry.statusCode}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">MIME Type</div>
        <div class="detail-value">${entry.mimeType || 'Unknown'}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Source</div>
        <div class="detail-value">${entry.fromCache ? 'Browser Cache' : 'Network'}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Timestamp</div>
        <div class="detail-value">${entry.timeStamp}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Response Headers</div>
        ${headersHtml || '<div class="detail-value">No headers available</div>'}
      </div>
    `;
    
    detailsPanel.style.display = 'block';
  }

  function updateStats() {
    cacheCount.textContent = filteredEntries.length;
  }

  function getResourceType(mimeType, extension) {
    if (mimeType) {
      if (mimeType.includes('image')) return 'Image';
      if (mimeType.includes('javascript') || mimeType.includes('js')) return 'Script';
      if (mimeType.includes('css')) return 'Stylesheet';
      if (mimeType.includes('html')) return 'HTML';
      if (mimeType.includes('json')) return 'JSON';
      if (mimeType.includes('font')) return 'Font';
    }
    
    const ext = extension.toLowerCase();
    const typeMap = {
      'js': 'Script',
      'css': 'Stylesheet',
      'html': 'HTML',
      'htm': 'HTML',
      'json': 'JSON',
      'png': 'Image',
      'jpg': 'Image',
      'jpeg': 'Image',
      'gif': 'Image',
      'svg': 'Image',
      'woff': 'Font',
      'woff2': 'Font',
      'ttf': 'Font',
      'eot': 'Font'
    };
    
    return typeMap[ext] || 'Resource';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
```

This JavaScript implementation handles all the user interactions, including loading cache entries, searching, displaying details, and clearing the cache. It communicates with the background service worker to fetch and manage cache data.

---

## Advanced Features and Enhancements {#advanced-features}

While our basic cache viewer extension is functional, there are several advanced features you can add to make it even more powerful and useful for debugging web applications.

### Cache Timing Analysis

One of the most valuable features for developers is understanding cache timing. You can enhance the extension to show when each resource was cached, how long it remained in the cache, and compare cache lifetimes against the `Cache-Control` headers. This helps identify resources that are being cached longer or shorter than expected.

### Export Functionality

Adding the ability to export cache data in various formats (JSON, CSV, HAR) enables developers to share cache information with team members or analyze it using external tools. This is particularly useful for documenting caching issues or sharing findings with backend developers.

### Cache Prediction

Advanced extensions can analyze caching patterns and predict which resources are likely to be cached on future visits. This information helps developers understand the expected performance benefits of their caching strategy and identify opportunities for improvement.

### Integration with DevTools

Consider creating a DevTools panel version of your cache viewer for deeper integration with Chrome's developer tools. This provides access to more detailed network information and a more familiar interface for developers who regularly use Chrome's built-in debugging tools.

---

## Testing Your Extension {#testing-extension}

Before publishing your extension, thorough testing is essential to ensure it works correctly across different scenarios and does not cause any unexpected behavior.

Load your extension in Chrome by navigating to `chrome://extensions/`, enabling Developer mode, and clicking "Load unpacked". Select your extension's directory. Test the following scenarios: open various websites and verify that cached resources appear in the extension, search for specific resources and verify filtering works correctly, click on resources to view detailed information, clear the cache and verify that entries are removed, and test the extension's behavior with different types of resources including images, scripts, stylesheets, and API responses.

Monitor the extension's performance and ensure it does not significantly impact browser performance or memory usage. Use Chrome's Task Manager to check the extension's CPU and memory consumption during normal use.

---

## Publishing Your Extension {#publishing-extension}

Once you have thoroughly tested your extension and are satisfied with its functionality, you can publish it to the Chrome Web Store. The publishing process involves creating a developer account, preparing promotional assets, and submitting your extension for review.

Prepare the following items for publication: a compelling description that highlights the extension's features and benefits, screenshots or a video demonstrating the extension in action, an appropriate icon set in the required sizes, and a privacy policy if your extension collects or processes user data.

The review process typically takes a few days, after which your extension will be available to Chrome users worldwide. Regular updates based on user feedback help maintain and grow your extension's user base.

---

## Conclusion {#conclusion}

Building a cache viewer Chrome extension is an excellent project that combines practical utility with valuable learning opportunities. Throughout this guide, you have learned about Chrome's caching mechanisms, the Chrome Extensions API, modern web development practices, and the process of building and publishing a complete extension.

The cache viewer you have created provides developers and power users with valuable insights into browser caching behavior, helping them debug caching issues, optimize website performance, and better understand how Chrome manages web resources. With the foundation established in this guide, you can continue to add features, refine the user experience, and even publish your extension to the Chrome Web Store.

Remember that browser caching is a complex topic with many nuances. Continue exploring the Chrome Extensions API, experiment with different approaches to cache inspection, and stay updated with changes to Chrome's caching mechanisms. Happy building!
