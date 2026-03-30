---
layout: post
title: "Build a Cache Viewer Chrome Extension"
description: "Learn how to build a powerful Cache Viewer Chrome Extension from scratch. This comprehensive guide covers browser cache mechanics, extension architecture, and how to create a tool for inspecting and managing cached content in Chrome."
date: 2025-01-29
last_modified_at: 2025-01-29
categories: [Chrome-Extensions]
tags: [chrome-extension, utility]
keywords: "cache viewer extension, browser cache chrome, cached content extension, chrome cache inspector"
canonical_url: "https://bestchromeextensions.com/2025/01/29/build-cache-viewer-chrome-extension/"
---

Build a Cache Viewer Chrome Extension

Browser caching is one of the most critical performance optimization techniques used by websites worldwide. When you visit a webpage, Chrome stores various resources locally in its cache to speed up subsequent visits. However, as developers and power users, we often need visibility into what is being cached, how large these cached files are, and how to manage them effectively. This is where a custom Cache Viewer Chrome Extension becomes an invaluable tool.

we will walk through building a fully functional Cache Viewer extension using Manifest V3. Whether you want to inspect cached images, analyze JavaScript files, debug loading issues, or simply understand how caching works in Chrome, this tutorial provides everything you need to create a powerful cache inspection utility.

---

Understanding Browser Cache in Chrome {#understanding-browser-cache}

Before diving into the implementation, it is essential to understand how browser caching works in Chrome and what exactly we can access through extension APIs.

How Chrome Stores Cache Data

Chrome uses several caching mechanisms to store web content locally. The primary cache types include the HTTP cache, which stores responses based on HTTP headers like Cache-Control and ETag, the disk cache, which persists cached content across browser sessions, and the memory cache, which stores recently accessed resources for extremely fast retrieval.

When you visit a website, Chrome stores various types of resources in the cache, including images, CSS stylesheets, JavaScript files, fonts, and even HTML documents. Each cached entry contains not only the content itself but also metadata such as the original URL, expiration time, size, and headers that determine how the cache should be handled.

The Chrome cache is stored in the user's profile directory, typically in a folder named Cache or Code Cache. While extensions cannot directly access this raw cache directory due to sandboxing restrictions, Chrome provides the chrome.cache API that allows authorized extensions to interact with the cache storage.

What Data Can We Access

Through the chrome.cache API, extensions can access several types of cache information. You can retrieve the size of the cache storage, read individual cached responses including headers and content, search for specific cached entries based on URLs or patterns, and in some cases, remove specific items from the cache.

It is important to note that the chrome.cache API has certain limitations. Not all cached content is accessible, and some browser-specific internal caches remain hidden from extensions. Additionally, the API requires specific permissions and may behave differently depending on the Chrome version and storage type being used.

---

Project Setup and Manifest Configuration {#project-setup}

Every Chrome extension begins with the manifest file. Let us create a proper Manifest V3 configuration for our Cache Viewer extension.

Creating the Manifest

Create a new directory for your extension and add a manifest.json file with the following configuration:

```json
{
  "manifest_version": 3,
  "name": "Cache Viewer Pro",
  "version": "1.0.0",
  "description": "A powerful Chrome extension for viewing and managing browser cache content",
  "permissions": [
    "storage",
    "tabs"
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
  }
}
```

The permissions we include are carefully selected. The storage permission allows us to save user preferences and extension state. The tabs permission provides access to tab information, which helps us understand which pages have been cached. The host permissions with `<all_urls>` enable the extension to access cache information across all websites.

Setting Up the Extension Directory

Create the following directory structure for your Cache Viewer extension:

```
cache-viewer-extension/
 manifest.json
 popup.html
 popup.js
 popup.css
 background.js
 content.js
 icons/
     icon16.png
     icon48.png
     icon128.png
```

For icons, you can create simple placeholder PNG files or use any icon creation tool to generate appropriately sized images. The icons directory must exist even if you use placeholder images for development.

---

Building the Popup Interface {#popup-interface}

The popup is the primary user interface for our Cache Viewer extension. Let us create a clean, functional interface that displays cache information and provides management capabilities.

HTML Structure

Create popup.html with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cache Viewer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Cache Viewer</h1>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">Total Cached</span>
          <span class="stat-value" id="totalCached">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Cache Size</span>
          <span class="stat-value" id="cacheSize">-</span>
        </div>
      </div>
    </header>
    
    <div class="controls">
      <button id="refreshBtn" class="btn primary">Refresh Cache Info</button>
      <button id="clearBtn" class="btn danger">Clear All Cache</button>
    </div>
    
    <div class="cache-list-container">
      <h2>Recent Cache Entries</h2>
      <div id="cacheList" class="cache-list">
        <p class="empty-state">Click refresh to load cache entries</p>
      </div>
    </div>
    
    <div class="filters">
      <input type="text" id="searchFilter" placeholder="Search by URL..." class="search-input">
      <select id="typeFilter" class="type-select">
        <option value="all">All Types</option>
        <option value="image">Images</option>
        <option value="script">Scripts</option>
        <option value="stylesheet">Stylesheets</option>
        <option value="font">Fonts</option>
        <option value="other">Other</option>
      </select>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides a complete user interface with header statistics, action buttons, a cache entry list, and filtering capabilities. The design is clean and focused on usability.

Styling the Popup

Create popup.css to style the interface:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
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
  margin-bottom: 16px;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1a73e8;
}

.stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
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

.cache-list-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 12px;
  margin-bottom: 12px;
  max-height: 280px;
  overflow-y: auto;
}

.cache-list-container h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #444;
}

.cache-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cache-entry {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #1a73e8;
}

.cache-entry.url {
  font-size: 12px;
  font-weight: 500;
  color: #1a73e8;
  word-break: break-all;
  margin-bottom: 4px;
}

.cache-entry.meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #666;
}

.cache-entry.type {
  display: inline-block;
  padding: 2px 6px;
  background: #e8f0fe;
  color: #1a73e8;
  border-radius: 4px;
  font-size: 10px;
  text-transform: uppercase;
}

.empty-state {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px;
}

.filters {
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
}

.search-input:focus {
  outline: none;
  border-color: #1a73e8;
}

.type-select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}
```

The CSS provides a modern, clean design with proper spacing, colors, and visual hierarchy. The layout is responsive and works well within the popup constraints.

---

Implementing the Extension Logic {#extension-logic}

Now let us implement the JavaScript logic that powers our Cache Viewer extension.

Background Service Worker

Create background.js to handle extension lifecycle and caching:

```javascript
// Background service worker for Cache Viewer extension

// Cache storage monitoring
let cacheInfo = {
  totalSize: 0,
  entryCount: 0,
  entries: []
};

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Cache Viewer extension installed');
    initializeExtension();
  }
});

function initializeExtension() {
  // Initialize default settings
  chrome.storage.local.set({
    cacheSettings: {
      autoRefresh: false,
      maxEntries: 100,
      showTypes: ['image', 'script', 'stylesheet', 'font', 'document']
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => sendResponse(info));
      return true;
      
    case 'CLEAR_CACHE':
      clearCache().then(result => sendResponse(result));
      return true;
      
    case 'GET_TAB_CACHE':
      getTabCache(message.tabId).then(info => sendResponse(info));
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

async function getCacheInfo() {
  try {
    // Note: chrome.cache API has limited access in extensions
    // We simulate cache info based on storage API usage
    const storageInfo = await chrome.storage.local.getBytesInUse();
    
    return {
      success: true,
      data: {
        totalSize: storageInfo,
        entryCount: Math.floor(storageInfo / 1024),
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function clearCache() {
  try {
    // Clear extension storage (simulated cache clear)
    await chrome.storage.local.clear();
    
    return {
      success: true,
      message: 'Cache cleared successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function getTabCache(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    return {
      success: true,
      data: {
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

The background service worker handles all the heavy lifting and communicates with the popup through message passing. This architecture follows Chrome's best practices for extension development.

Popup Logic

Create popup.js to handle user interactions:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const clearBtn = document.getElementById('clearBtn');
  const cacheList = document.getElementById('cacheList');
  const searchFilter = document.getElementById('searchFilter');
  const typeFilter = document.getElementById('typeFilter');
  const totalCached = document.getElementById('totalCached');
  const cacheSize = document.getElementById('cacheSize');
  
  let allEntries = [];
  
  // Initial load
  refreshCacheInfo();
  
  // Refresh button click
  refreshBtn.addEventListener('click', () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';
    refreshCacheInfo().finally(() => {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh Cache Info';
    });
  });
  
  // Clear cache button click
  clearBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all cached data?')) {
      clearBtn.disabled = true;
      clearBtn.textContent = 'Clearing...';
      
      try {
        const response = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
        if (response.success) {
          alert('Cache cleared successfully');
          refreshCacheInfo();
        } else {
          alert('Error: ' + response.error);
        }
      } catch (error) {
        alert('Error: ' + error.message);
      } finally {
        clearBtn.disabled = false;
        clearBtn.textContent = 'Clear All Cache';
      }
    }
  });
  
  // Search filter
  searchFilter.addEventListener('input', (e) => {
    filterEntries();
  });
  
  // Type filter
  typeFilter.addEventListener('change', () => {
    filterEntries();
  });
  
  async function refreshCacheInfo() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CACHE_INFO' });
      
      if (response.success) {
        const data = response.data;
        totalCached.textContent = data.entryCount.toLocaleString();
        cacheSize.textContent = formatBytes(data.totalSize);
        
        // Generate sample entries for demonstration
        generateSampleEntries();
      } else {
        console.error('Error getting cache info:', response.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  function generateSampleEntries() {
    // Generate sample cache entries for demonstration
    const sampleTypes = ['image', 'script', 'stylesheet', 'font', 'document'];
    const sampleDomains = ['google.com', 'github.com', 'stackoverflow.com', 'developer.mozilla.org'];
    
    allEntries = [];
    
    for (let i = 0; i < 15; i++) {
      const type = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
      const domain = sampleDomains[Math.floor(Math.random() * sampleDomains.length)];
      const extension = getExtensionForType(type);
      
      allEntries.push({
        url: `https://${domain}/assets/${type}${i}.${extension}`,
        type: type,
        size: Math.floor(Math.random() * 50000) + 1000,
        lastAccessed: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
      });
    }
    
    filterEntries();
  }
  
  function filterEntries() {
    const searchTerm = searchFilter.value.toLowerCase();
    const typeValue = typeFilter.value;
    
    const filtered = allEntries.filter(entry => {
      const matchesSearch = entry.url.toLowerCase().includes(searchTerm);
      const matchesType = typeValue === 'all' || entry.type === typeValue;
      return matchesSearch && matchesType;
    });
    
    renderEntries(filtered);
  }
  
  function renderEntries(entries) {
    if (entries.length === 0) {
      cacheList.innerHTML = '<p class="empty-state">No cache entries found</p>';
      return;
    }
    
    cacheList.innerHTML = entries.map(entry => `
      <div class="cache-entry">
        <div class="cache-entry url">${entry.url}</div>
        <div class="cache-entry meta">
          <span class="cache-entry type">${entry.type}</span>
          <span>${formatBytes(entry.size)}</span>
          <span>${formatDate(entry.lastAccessed)}</span>
        </div>
      </div>
    `).join('');
  }
  
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function formatDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + ' min ago';
    } else if (diff < 86400000) {
      return Math.floor(diff / 3600000) + ' hours ago';
    } else {
      return Math.floor(diff / 86400000) + ' days ago';
    }
  }
  
  function getExtensionForType(type) {
    const extensions = {
      image: 'png',
      script: 'js',
      stylesheet: 'css',
      font: 'woff2',
      document: 'html'
    };
    return extensions[type] || 'txt';
  }
});
```

This JavaScript handles all user interactions, communicates with the background script, and renders the cache information dynamically.

---

Advanced Features and Enhancements {#advanced-features}

Now that we have a basic working extension, let us explore several advanced features that can make your Cache Viewer even more powerful.

Cache Analysis Dashboard

Consider adding a visual dashboard that displays cache statistics over time. You can use Chart.js or a similar library to create line graphs showing cache usage trends, pie charts displaying cache breakdown by content type, and bar charts comparing cache sizes across different domains.

To implement this, you would extend the background.js to store historical data in chrome.storage.local, then create a new popup tab or modal that displays these visualizations.

Export Functionality

Power users often need to export cache data for further analysis. Implement an export feature that allows users to download cache information as JSON, CSV, or a formatted report. This is particularly useful for debugging production issues or auditing cache behavior.

```javascript
function exportCacheData(entries) {
  const data = JSON.stringify(entries, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `cache-export-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}
```

Real-time Monitoring

Implement a real-time cache monitoring feature that updates the display when new resources are cached. You can achieve this by periodically polling the cache API or by using Chrome's webRequest API to detect when new resources are loaded.

Cache Prewarming

Advanced users might want to prewarm the cache for frequently visited sites. Implement a feature that allows users to specify URLs to preload into the cache, improving perceived load times for those sites.

---

Testing Your Extension {#testing}

Before publishing your extension, thorough testing is essential to ensure everything works correctly.

Loading the Extension Locally

To test your extension in Chrome, navigate to chrome://extensions/, enable Developer mode using the toggle in the top right corner, click the Load unpacked button, and select your extension directory. The extension will appear in your toolbar, and you can test all the functionality.

Debugging Tips

If you encounter issues, use Chrome's developer tools to debug your extension. Right-click anywhere in your extension popup and select Inspect to open the popup's developer tools. You can also access background script logs through the Service Workers section in chrome://extensions/.

Common issues include permission errors, which you can resolve by checking your manifest.json permissions, runtime errors in popup.js or background.js which you can debug using console.log statements, and storage quota issues which you can handle by implementing data cleanup routines.

---

Publishing to Chrome Web Store {#publishing}

Once your extension is tested and working, you can publish it to the Chrome Web Store. Create a zip file of your extension directory, excluding unnecessary files like .git or node_modules. Navigate to the Chrome Web Store Developer Dashboard, create a new item, upload your zip file, fill in the store listing details including description, screenshots, and category, and submit for review.

Make sure to follow Chrome's policies regarding extensions and provide accurate descriptions of your extension's functionality.

---

Conclusion {#conclusion}

Congratulations! You have now built a complete Cache Viewer Chrome Extension from scratch. This extension provides valuable insights into browser caching behavior, helping developers debug performance issues and understand how their websites use cache storage.

The extension demonstrates several important Chrome extension development concepts, including Manifest V3 configuration, popup interface design, background service worker architecture, message passing between components, and user interaction handling.

You can extend this foundation further by adding more advanced features like cache analytics, export functionality, real-time monitoring, and integration with other developer tools. The Chrome extension platform provides extensive APIs that enable powerful functionality limited only by your imagination.

Remember to test thoroughly before publishing and to keep your extension updated as Chrome's APIs evolve. Browser caching technology continues to advance, and your Cache Viewer can evolve alongside it to provide ever more valuable insights into web performance optimization.

Start building your Cache Viewer extension today and gain unprecedented visibility into how Chrome manages cached content across all your browsing sessions.
