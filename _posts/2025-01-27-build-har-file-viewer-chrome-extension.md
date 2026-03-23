---
layout: post
title: "Build an HAR File Viewer Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a powerful HAR file viewer Chrome extension from scratch. This comprehensive guide covers HTTP archive parsing, network trace visualization, and creating developer tools with Chrome's extension APIs."
date: 2025-01-27
categories: [Chrome-Extensions]
tags: [chrome-extension, developer-tools]
keywords: "har viewer extension, network trace chrome, http archive viewer"
canonical_url: "https://bestchromeextensions.com/2025/01/27/build-har-file-viewer-chrome-extension/"
---

Build an HAR File Viewer Chrome Extension: Complete Developer's Guide

The HTTP Archive format (HAR) is the industry standard for capturing network traffic data. If you have ever used Chrome DevTools Network tab, you have already interacted with HAR files. they are the JSON-based format that stores every network request and response made by your browser. Building a har viewer extension allows you to create a powerful developer tool that can parse, visualize, and analyze network traces directly in the browser.

we will walk through building a production-ready HAR file viewer Chrome extension from scratch. You will learn how to parse HAR files, create intuitive user interfaces for network trace analysis, and use Chrome's extension APIs to build developer tools that rival standalone applications.

---

Understanding HAR Files and Their Structure {#understanding-har-files}

Before diving into the code, it is essential to understand what HAR files are and how they are structured. HAR stands for HTTP Archive, and it is a JSON-based log format that records all HTTP transactions between a browser and web servers.

The HAR File Format

A HAR file contains a single object with a "log" property that holds an array of entries. Each entry represents a single network request and includes comprehensive information such as:

- Request details: URL, method, headers, query parameters, and post data
- Response details: Status code, headers, body content, and timing information
- Timing data: How long each phase of the request took (DNS lookup, TCP connection, SSL handshake, waiting for response, receiving data)
- Cache information: Whether the response was served from cache
- File size: The total bytes transferred

Here is a simplified example of what a HAR entry looks like:

```json
{
  "log": {
    "version": "1.2",
    "creator": {
      "name": "Chrome",
      "version": "120.0.0.0"
    },
    "entries": [
      {
        "startedDateTime": "2025-01-27T10:00:00.000Z",
        "time": 250.5,
        "request": {
          "method": "GET",
          "url": "https://api.example.com/data",
          "httpVersion": "HTTP/2.0",
          "headers": [...],
          "queryString": [...],
          "cookies": [...]
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "headers": [...],
          "content": {
            "size": 15234,
            "mimeType": "application/json"
          }
        },
        "timings": {
          "blocked": 12.3,
          "dns": 5.2,
          "connect": 45.8,
          "ssl": 23.1,
          "wait": 120.5,
          "receive": 43.6
        }
      }
    ]
  }
}
```

Understanding this structure is crucial because your har viewer extension will need to parse and display this information in a user-friendly way. The complexity of HAR files is exactly why developers need specialized tools. raw JSON is not easy to read or analyze.

Why Build a HAR Viewer Extension?

There are several compelling reasons to build a har viewer extension:

1. Offline Analysis: Users can export network traces from any browser and analyze them later without needing the original session
2. Shareability: HAR files make it easy to share network issues with team members
3. Custom Visualization: You can create custom views and filters that suit your specific debugging needs
4. Integration: A browser extension can offer tighter integration with the browsing experience than standalone tools

Many developers rely on tools like the Chrome DevTools Network panel for network trace chrome analysis, but a dedicated HAR viewer extension can offer additional features like local file import, advanced filtering, and custom visualizations.

---

Setting Up the Project Structure {#project-structure}

Let us start building our HAR viewer extension. First, we will set up the project structure following Chrome extension best practices.

Manifest V3 Configuration

Every Chrome extension needs a manifest.json file. Here is the configuration for our HAR viewer:

```json
{
  "manifest_version": 3,
  "name": "HAR Viewer Pro",
  "version": "1.0.0",
  "description": "A powerful HAR file viewer and network trace analyzer for Chrome",
  "permissions": [
    "storage",
    "activeTab",
    "fileSystem"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "file_handlers": {
    "har": {
      "extension": "har",
      "mime_types": ["application/json", "application/har+json"]
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest includes the `fileSystem` permission, which allows users to open local HAR files directly. We also define a file handler for .har files, which registers our extension as a handler for HAR files in the operating system.

Project Directory Structure

Create the following directory structure for your extension:

```
har-viewer-extension/
 manifest.json
 background.js
 popup.html
 popup.js
 popup.css
 viewer/
    viewer.html
    viewer.js
    viewer.css
    har-parser.js
 lib/
    json-viewer.js
 icons/
     icon16.png
     icon48.png
     icon128.png
```

This structure separates the popup interface from the full viewer page, making it easier to maintain and scale the extension.

---

Building the HAR Parser {#har-parser}

The core of any har viewer extension is the parser. We need to read HAR files, validate their structure, and prepare the data for visualization.

Core Parser Implementation

Create `viewer/har-parser.js`:

```javascript
/
 * HAR File Parser for Chrome Extension
 * Parses HTTP Archive (HAR) files and provides utility methods
 */

class HarParser {
  constructor() {
    this.data = null;
    this.entries = [];
    this.metadata = {};
  }

  /
   * Parse a HAR file from JSON string or object
   * @param {string|object} input - HAR file content
   * @returns {object} Parsed HAR data with utilities
   */
  parse(input) {
    try {
      const data = typeof input === 'string' ? JSON.parse(input) : input;
      
      if (!data.log) {
        throw new Error('Invalid HAR file: missing "log" property');
      }

      if (!data.log.entries || !Array.isArray(data.log.entries)) {
        throw new Error('Invalid HAR file: missing or invalid "entries" array');
      }

      this.data = data;
      this.entries = data.log.entries;
      this.metadata = {
        version: data.log.version || '1.1',
        creator: data.log.creator || {},
        browser: data.log.browser || {},
        pages: data.log.pages || [],
        entryCount: this.entries.length,
        totalSize: this.calculateTotalSize()
      };

      return {
        metadata: this.metadata,
        entries: this.entries.map((entry, index) => this.processEntry(entry, index)),
        getFilteredEntries: (filter) => this.filterEntries(filter),
        getStatistics: () => this.calculateStatistics()
      };
    } catch (error) {
      throw new Error(`Failed to parse HAR file: ${error.message}`);
    }
  }

  /
   * Process individual HAR entry for display
   */
  processEntry(entry, index) {
    const request = entry.request;
    const response = entry.response;
    const timings = entry.timings || {};

    return {
      id: index,
      startedDateTime: new Date(entry.startedDateTime),
      time: entry.time,
      method: request.method,
      url: request.url,
      status: response.status,
      statusText: response.statusText,
      type: this.getMimeType(response.content.mimeType),
      size: this.formatSize(response.content.size),
      ip: entry.serverIPAddress || null,
      timings: {
        blocked: timings.blocked || 0,
        dns: timings.dns || 0,
        connect: timings.connect || 0,
        ssl: timings.ssl || 0,
        wait: timings.wait || 0,
        receive: timings.receive || 0
      },
      requestHeaders: request.headers,
      responseHeaders: response.headers,
      postData: request.postData,
      responseContent: response.content
    };
  }

  /
   * Filter entries by various criteria
   */
  filterEntries(filter) {
    let filtered = [...this.entries];

    if (filter.method) {
      filtered = filtered.filter(e => e.request.method === filter.method);
    }

    if (filter.status) {
      if (filter.status === 'error') {
        filtered = filtered.filter(e => e.response.status >= 400);
      } else if (filter.status === 'success') {
        filtered = filtered.filter(e => e.response.status >= 200 && e.response.status < 300);
      }
    }

    if (filter.url) {
      const urlPattern = new RegExp(filter.url, 'i');
      filtered = filtered.filter(e => urlPattern.test(e.request.url));
    }

    if (filter.type) {
      filtered = filtered.filter(e => 
        e.response.content.mimeType && 
        e.response.content.mimeType.includes(filter.type)
      );
    }

    if (filter.minTime) {
      filtered = filtered.filter(e => e.time >= filter.minTime);
    }

    return filtered.map((entry, index) => this.processEntry(entry, index));
  }

  /
   * Calculate statistics about the HAR file
   */
  calculateStatistics() {
    const methods = {};
    const statusCodes = {};
    const mimeTypes = {};
    let totalTime = 0;
    let totalSize = 0;

    this.entries.forEach(entry => {
      const method = entry.request.method;
      const status = Math.floor(entry.response.status / 100) * 100;
      const mimeType = this.getMimeType(entry.response.content.mimeType);

      methods[method] = (methods[method] || 0) + 1;
      statusCodes[status] = (statusCodes[status] || 0) + 1;
      mimeTypes[mimeType] = (mimeTypes[mimeType] || 0) + 1;

      totalTime += entry.time || 0;
      totalSize += entry.response.content.size || 0;
    });

    return {
      methods,
      statusCodes,
      mimeTypes,
      totalRequests: this.entries.length,
      averageTime: totalTime / this.entries.length,
      totalSize,
      slowestRequest: this.findSlowestRequest(),
      largestResponse: this.findLargestResponse()
    };
  }

  findSlowestRequest() {
    if (this.entries.length === 0) return null;
    const slowest = this.entries.reduce((a, b) => (a.time || 0) > (b.time || 0) ? a : b);
    return {
      url: slowest.request.url,
      time: slowest.time,
      method: slowest.request.method,
      status: slowest.response.status
    };
  }

  findLargestResponse() {
    if (this.entries.length === 0) return null;
    const largest = this.entries.reduce((a, b) => 
      (a.response.content.size || 0) > (b.response.content.size || 0) ? a : b
    );
    return {
      url: largest.request.url,
      size: largest.response.content.size,
      mimeType: largest.response.content.mimeType
    };
  }

  calculateTotalSize() {
    return this.entries.reduce((sum, entry) => 
      sum + (entry.response.content.size || 0), 0
    );
  }

  getMimeType(mimeType) {
    if (!mimeType) return 'unknown';
    const type = mimeType.split(';')[0].trim();
    const category = type.split('/')[0];
    return category === 'application' ? type : category;
  }

  formatSize(bytes) {
    if (bytes === -1) return 'cached';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }
}

// Export for use in other modules
window.HarParser = HarParser;
```

This parser handles the complexity of HAR files and provides filtering and statistics capabilities essential for any har viewer extension.

---

Creating the Viewer Interface {#viewer-interface}

Now let us build the main viewer interface where users will analyze their network traces.

The Viewer HTML Structure

Create `viewer/viewer.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HAR Viewer - Network Trace Analyzer</title>
  <link rel="stylesheet" href="viewer.css">
</head>
<body>
  <div class="app-container">
    <header class="header">
      <div class="header-left">
        <h1>HAR Viewer</h1>
        <button id="openFileBtn" class="btn btn-primary">
          <span class="icon"></span> Open HAR File
        </button>
        <input type="file" id="fileInput" accept=".har,.json" hidden>
      </div>
      <div class="header-right">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="Filter by URL...">
        </div>
        <div class="filter-group">
          <select id="methodFilter">
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
          <select id="statusFilter">
            <option value="">All Status</option>
            <option value="success">2xx Success</option>
            <option value="error">4xx/5xx Error</option>
          </select>
          <select id="typeFilter">
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="text">Text</option>
            <option value="application">Application</option>
            <option value="font">Fonts</option>
          </select>
        </div>
      </div>
    </header>

    <div class="main-content">
      <aside class="sidebar">
        <div class="stats-panel" id="statsPanel">
          <h3>Statistics</h3>
          <div class="stat-item">
            <span class="stat-label">Total Requests:</span>
            <span class="stat-value" id="totalRequests">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Size:</span>
            <span class="stat-value" id="totalSize">0 B</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Load Time:</span>
            <span class="stat-value" id="loadTime">0 ms</span>
          </div>
        </div>
        
        <div class="method-breakdown" id="methodBreakdown">
          <h4>Methods</h4>
          <div id="methodList"></div>
        </div>

        <div class="status-breakdown" id="statusBreakdown">
          <h4>Status Codes</h4>
          <div id="statusList"></div>
        </div>
      </aside>

      <main class="entries-panel">
        <div class="entries-header">
          <div class="col col-url">URL</div>
          <div class="col col-method">Method</div>
          <div class="col col-status">Status</div>
          <div class="col col-type">Type</div>
          <div class="col col-size">Size</div>
          <div class="col col-time">Time</div>
        </div>
        <div class="entries-list" id="entriesList">
          <div class="empty-state">
            <p>No HAR file loaded</p>
            <p class="hint">Click "Open HAR File" to load a network trace</p>
          </div>
        </div>
      </main>

      <aside class="details-panel" id="detailsPanel">
        <div class="details-header">
          <h3>Request Details</h3>
          <button class="btn-close" id="closeDetails">×</button>
        </div>
        <div class="details-content" id="detailsContent">
          <p class="empty-hint">Select a request to view details</p>
        </div>
      </aside>
    </div>
  </div>

  <script src="../lib/json-viewer.js"></script>
  <script src="har-parser.js"></script>
  <script src="viewer.js"></script>
</body>
</html>
```

Viewer Styles

Create `viewer/viewer.css` with comprehensive styling:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
  height: 100vh;
  overflow: hidden;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Header Styles */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #1a73e8;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover {
  background: #1557b0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 250px;
  font-size: 14px;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

/* Main Content Layout */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar Styles */
.sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  padding: 16px;
  overflow-y: auto;
}

.stats-panel, .method-breakdown, .status-breakdown {
  margin-bottom: 24px;
}

.stats-panel h3, .method-breakdown h4, .status-breakdown h4 {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-label {
  color: #666;
  font-size: 13px;
}

.stat-value {
  font-weight: 600;
  color: #333;
}

.method-list, .status-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.method-badge, .status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.method-badge.get { background: #e8f5e9; color: #2e7d32; }
.method-badge.post { background: #e3f2fd; color: #1565c0; }
.method-badge.put { background: #fff3e0; color: #e65100; }
.method-badge.delete { background: #ffebee; color: #c62828; }

.status-badge.success { background: #e8f5e9; color: #2e7d32; }
.status-badge.redirect { background: #e3f2fd; color: #1565c0; }
.status-badge.client-error { background: #fff3e0; color: #e65100; }
.status-badge.server-error { background: #ffebee; color: #c62828; }

/* Entries Panel */
.entries-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.entries-header {
  display: flex;
  padding: 10px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
}

.entries-list {
  flex: 1;
  overflow-y: auto;
  background: #fff;
}

.entry-row {
  display: flex;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.15s;
}

.entry-row:hover {
  background: #f8f9fa;
}

.entry-row.selected {
  background: #e3f2fd;
}

.col {
  padding: 0 8px;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.col-url {
  flex: 1;
  min-width: 200px;
}

.col-method { width: 80px; }
.col-status { width: 70px; }
.col-type { width: 100px; }
.col-size { width: 80px; justify-content: flex-end; }
.col-time { width: 80px; justify-content: flex-end; }

.entry-url {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #333;
}

.method-tag {
  font-weight: 600;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
}

.status-code {
  font-weight: 500;
  font-size: 13px;
}

.type-tag {
  font-size: 12px;
  color: #666;
}

.size-tag, .time-tag {
  font-size: 12px;
  color: #666;
  font-family: 'Monaco', 'Menlo', monospace;
}

/* Details Panel */
.details-panel {
  width: 400px;
  background: #fff;
  border-left: 1px solid #e0e0e0;
  display: none;
  flex-direction: column;
}

.details-panel.open {
  display: flex;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.details-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  line-height: 1;
}

.details-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.detail-url {
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
}

.timing-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
}

.timing-segment {
  height: 100%;
}

.timing-blocked { background: #e0e0e0; }
.timing-dns { background: #bbdefb; }
.timing-connect { background: #90caf9; }
.timing-ssl { background: #64b5f6; }
.timing-wait { background: #4fc3f7; }
.timing-receive { background: #4db6ac; }

.timings-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  font-size: 11px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-hint {
  color: #999;
  font-style: italic;
}

.hint {
  font-size: 13px;
}

/* JSON Viewer Styles */
.json-viewer {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.json-key { color: #881391; }
.json-string { color: #0b7500; }
.json-number { color: #1750eb; }
.json-boolean { color: #0033b3; }
.json-null { color: #808080; }
```

Viewer JavaScript Logic

Create `viewer/viewer.js`:

```javascript
/
 * HAR Viewer - Main Application Logic
 */

class HarViewerApp {
  constructor() {
    this.parser = new HarParser();
    this.currentData = null;
    this.filteredEntries = [];
    this.selectedEntry = null;

    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.openFileBtn = document.getElementById('openFileBtn');
    this.fileInput = document.getElementById('fileInput');
    this.searchInput = document.getElementById('searchInput');
    this.methodFilter = document.getElementById('methodFilter');
    this.statusFilter = document.getElementById('statusFilter');
    this.typeFilter = document.getElementById('typeFilter');
    this.entriesList = document.getElementById('entriesList');
    this.detailsPanel = document.getElementById('detailsPanel');
    this.detailsContent = document.getElementById('detailsContent');
    this.closeDetailsBtn = document.getElementById('closeDetails');

    // Stats elements
    this.totalRequestsEl = document.getElementById('totalRequests');
    this.totalSizeEl = document.getElementById('totalSize');
    this.loadTimeEl = document.getElementById('loadTime');
    this.methodListEl = document.getElementById('methodList');
    this.statusListEl = document.getElementById('statusList');
  }

  attachEventListeners() {
    this.openFileBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    
    this.searchInput.addEventListener('input', () => this.applyFilters());
    this.methodFilter.addEventListener('change', () => this.applyFilters());
    this.statusFilter.addEventListener('change', () => this.applyFilters());
    this.typeFilter.addEventListener('change', () => this.applyFilters());
    
    this.closeDetailsBtn.addEventListener('click', () => this.closeDetails());

    // Drag and drop support
    document.body.addEventListener('dragover', (e) => e.preventDefault());
    document.body.addEventListener('drop', (e) => this.handleDrop(e));
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.loadHarFile(file);
    }
  }

  handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.name.endsWith('.har') || file.name.endsWith('.json'))) {
      this.loadHarFile(file);
    }
  }

  async loadHarFile(file) {
    try {
      const text = await file.text();
      this.currentData = this.parser.parse(text);
      this.applyFilters();
      this.updateStatistics();
      this.showEntries();
    } catch (error) {
      alert('Failed to load HAR file: ' + error.message);
    }
  }

  applyFilters() {
    const filters = {
      method: this.methodFilter.value,
      status: this.statusFilter.value,
      type: this.typeFilter.value,
      url: this.searchInput.value
    };

    if (Object.values(filters).some(v => v)) {
      this.filteredEntries = this.currentData.getFilteredEntries(filters);
    } else {
      this.filteredEntries = this.currentData.entries;
    }

    this.showEntries();
  }

  updateStatistics() {
    const stats = this.currentData.getStatistics();
    
    this.totalRequestsEl.textContent = stats.totalRequests;
    this.totalSizeEl.textContent = this.parser.formatSize(stats.totalSize);
    this.loadTimeEl.textContent = Math.round(stats.averageTime) + ' ms';

    // Update method breakdown
    this.methodListEl.innerHTML = Object.entries(stats.methods)
      .map(([method, count]) => `
        <span class="method-badge ${method.toLowerCase()}">
          ${method} (${count})
        </span>
      `).join('');

    // Update status breakdown
    this.statusListEl.innerHTML = Object.entries(stats.statusCodes)
      .map(([status, count]) => {
        let className = 'success';
        if (status >= 300 && status < 400) className = 'redirect';
        else if (status >= 400 && status < 500) className = 'client-error';
        else if (status >= 500) className = 'server-error';
        
        return `<span class="status-badge ${className}">${status}xx (${count})</span>`;
      }).join('');
  }

  showEntries() {
    if (this.filteredEntries.length === 0) {
      this.entriesList.innerHTML = `
        <div class="empty-state">
          <p>No matching entries</p>
          <p class="hint">Try adjusting your filters</p>
        </div>
      `;
      return;
    }

    this.entriesList.innerHTML = this.filteredEntries.map(entry => `
      <div class="entry-row" data-id="${entry.id}">
        <div class="col col-url">
          <span class="entry-url" title="${entry.url}">${this.getFileName(entry.url)}</span>
        </div>
        <div class="col col-method">
          <span class="method-tag ${entry.method.toLowerCase()}">${entry.method}</span>
        </div>
        <div class="col col-status">
          <span class="status-code" style="color: ${this.getStatusColor(entry.status)}">${entry.status}</span>
        </div>
        <div class="col col-type">
          <span class="type-tag">${entry.type}</span>
        </div>
        <div class="col col-size">
          <span class="size-tag">${entry.size}</span>
        </div>
        <div class="col col-time">
          <span class="time-tag">${Math.round(entry.time)} ms</span>
        </div>
      </div>
    `).join('');

    // Attach click handlers
    this.entriesList.querySelectorAll('.entry-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = parseInt(row.dataset.id);
        this.selectEntry(id);
      });
    });
  }

  selectEntry(id) {
    this.selectedEntry = this.filteredEntries.find(e => e.id === id);
    
    // Highlight selected row
    this.entriesList.querySelectorAll('.entry-row').forEach(row => {
      row.classList.toggle('selected', parseInt(row.dataset.id) === id);
    });

    this.showEntryDetails();
  }

  showEntryDetails() {
    const entry = this.selectedEntry;
    if (!entry) return;

    this.detailsPanel.classList.add('open');
    
    const timings = entry.timings;
    const totalTime = timings.blocked + timings.dns + timings.connect + timings.ssl + timings.wait + timings.receive;
    
    this.detailsContent.innerHTML = `
      <div class="detail-section">
        <h4>General</h4>
        <p><strong>URL:</strong></p>
        <p class="detail-url">${entry.url}</p>
      </div>
      
      <div class="detail-section">
        <h4>Request</h4>
        <p><strong>Method:</strong> ${entry.method}</p>
        <p><strong>Status:</strong> ${entry.status} ${entry.statusText}</p>
        <p><strong>Type:</strong> ${entry.type}</p>
        <p><strong>Size:</strong> ${entry.size}</p>
        <p><strong>Time:</strong> ${Math.round(entry.time)} ms</p>
      </div>
      
      <div class="detail-section">
        <h4>Timing Breakdown</h4>
        <div class="timing-bar">
          <div class="timing-segment timing-blocked" style="width: ${(timings.blocked / totalTime) * 100}%"></div>
          <div class="timing-segment timing-dns" style="width: ${(timings.dns / totalTime) * 100}%"></div>
          <div class="timing-segment timing-connect" style="width: ${(timings.connect / totalTime) * 100}%"></div>
          <div class="timing-segment timing-ssl" style="width: ${(timings.ssl / totalTime) * 100}%"></div>
          <div class="timing-segment timing-wait" style="width: ${(timings.wait / totalTime) * 100}%"></div>
          <div class="timing-segment timing-receive" style="width: ${(timings.receive / totalTime) * 100}%"></div>
        </div>
        <div class="timings-legend">
          <div class="legend-item"><div class="legend-color timing-blocked"></div> Blocked (${Math.round(timings.blocked)}ms)</div>
          <div class="legend-item"><div class="legend-color timing-dns"></div> DNS (${Math.round(timings.dns)}ms)</div>
          <div class="legend-item"><div class="legend-color timing-connect"></div> Connect (${Math.round(timings.connect)}ms)</div>
          <div class="legend-item"><div class="legend-color timing-ssl"></div> SSL (${Math.round(timings.ssl)}ms)</div>
          <div class="legend-item"><div class="legend-color timing-wait"></div> Wait (${Math.round(timings.wait)}ms)</div>
          <div class="legend-item"><div class="legend-color timing-receive"></div> Receive (${Math.round(timings.receive)}ms)</div>
        </div>
      </div>
      
      <div class="detail-section">
        <h4>Request Headers</h4>
        <div class="json-viewer">${this.formatHeaders(entry.requestHeaders)}</div>
      </div>
      
      <div class="detail-section">
        <h4>Response Headers</h4>
        <div class="json-viewer">${this.formatHeaders(entry.responseHeaders)}</div>
      </div>
    `;
  }

  closeDetails() {
    this.detailsPanel.classList.remove('open');
    this.selectedEntry = null;
    this.entriesList.querySelectorAll('.entry-row').forEach(row => {
      row.classList.remove('selected');
    });
  }

  getFileName(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      return path.split('/').pop() || urlObj.hostname;
    } catch {
      return url;
    }
  }

  getStatusColor(status) {
    if (status >= 200 && status < 300) return '#2e7d32';
    if (status >= 300 && status < 400) return '#1565c0';
    if (status >= 400 && status < 500) return '#e65100';
    if (status >= 500) return '#c62828';
    return '#666';
  }

  formatHeaders(headers) {
    if (!headers || headers.length === 0) return '<span class="json-null">No headers</span>';
    return headers.map(h => `<span class="json-key">"${h.name}":</span> <span class="json-string">"${h.value}"</span>`).join(',\n');
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new HarViewerApp();
});
```

---

Adding Chrome Extension Specific Features {#extension-features}

Now let us enhance our har viewer extension with Chrome-specific features that make it truly useful for developers.

Background Service Worker

Create `background.js` to handle file associations and extension lifecycle:

```javascript
/
 * HAR Viewer - Background Service Worker
 * Handles extension lifecycle, file associations, and messaging
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('HAR Viewer extension installed');
    
    // Set default preferences
    chrome.storage.local.set({
      theme: 'light',
      showHiddenEntries: false,
      maxEntries: 1000
    });
  }
});

// Handle file associations
chrome.fileSystem.onOpenFile.addListener((volume) => {
  console.log('Opening HAR file from file system:', volume);
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_HAR_FROM_TAB') {
    // Get HAR data from current tab's network log
    chrome.devtools.network.getHAR((har) => {
      sendResponse({ har: har });
    });
    return true; // Keep message channel open for async response
  }
});

// Create context menu for HAR export
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'exportAsHar',
    title: 'Export Network Log as HAR',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'exportAsHar') {
    // Trigger HAR export from DevTools
    chrome.tabs.sendMessage(tab.id, { action: 'exportHAR' });
  }
});
```

Popup Interface

Create a simple `popup.html` and `popup.js` for quick access:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HAR Viewer</title>
  <style>
    body { width: 200px; padding: 12px; font-family: sans-serif; }
    h3 { margin: 0 0 10px 0; font-size: 14px; }
    .btn { 
      display: block; width: 100%; padding: 8px; 
      margin-bottom: 8px; background: #1a73e8; color: white;
      border: none; border-radius: 4px; cursor: pointer;
    }
    .btn:hover { background: #1557b0; }
    p { font-size: 12px; color: #666; margin: 0; }
  </style>
</head>
<body>
  <h3>HAR Viewer</h3>
  <button class="btn" id="openViewer">Open Full Viewer</button>
  <button class="btn" id="captureHar">Capture from Tab</button>
  <p>View and analyze HTTP network archives</p>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
document.getElementById('openViewer').addEventListener('click', () => {
  chrome.tabs.create({ url: 'viewer/viewer.html' });
});

document.getElementById('captureHar').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if DevTools is open, if not, open it
  try {
    chrome.devtools.inspectedWindow.eval(
      'JSON.stringify(window.performance.getEntriesByType("resource"))',
      (result, isException) => {
        if (isException) {
          alert('Please open DevTools Network tab first');
          return;
        }
        
        // Open viewer with captured data
        chrome.tabs.create({
          url: 'viewer/viewer.html?data=' + encodeURIComponent(result)
        });
      }
    );
  } catch (e) {
    console.error('Failed to capture HAR:', e);
    alert('Failed to capture network data');
  }
});
```

---

Testing Your HAR Viewer Extension {#testing}

Testing is crucial for a complex application like a HAR viewer. Here is how to test your extension effectively:

Loading the Extension for Testing

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension's root directory
4. The extension icon should appear in your toolbar

Test HAR Files

You can generate HAR files using various methods:

- Chrome DevTools: Open DevTools (F12), go to Network tab, perform some actions, then right-click and select "Save all as HAR with content"
- Chrome Extensions: Use extensions like "DevTools AutoSave" or similar tools
- Online Generators: Some online tools can create sample HAR files

Testing Checklist

- [ ] Load valid HAR files and verify they parse correctly
- [ ] Test with malformed JSON to ensure error handling works
- [ ] Verify filtering works for all filter types
- [ ] Test large HAR files (1000+ entries) for performance
- [ ] Test drag and drop functionality
- [ ] Verify timing visualizations display correctly

---

Publishing Your HAR Viewer Extension {#publishing}

Once your har viewer extension is ready, you can publish it to the Chrome Web Store.

Preparing for Submission

1. Create Icons: Prepare 16x16, 48x48, and 128x128 pixel icons
2. Take Screenshots: Capture screenshots of your viewer in action (1280x800 or 640x400)
3. Write Description: Include your keywords naturally: "har viewer extension", "network trace chrome", "http archive viewer"
4. Privacy Policy: Explain what data your extension accesses (for file handling)

Review Process

Google reviews typically take 1-3 business days. Common issues that cause rejection:

- Vague or misleading descriptions
- Missing privacy policy for file access
- Poor error handling for invalid HAR files

---

Advanced Features to Consider {#advanced-features}

Once you have the basic har viewer working, consider adding these advanced features:

1. Comparison View

Compare two HAR files side by side to identify performance differences between environments or versions.

2. Waterfall Visualization

Create a Gantt-chart style visualization showing request timing overlaps, similar to Chrome DevTools.

3. Request/Response Body Viewing

Add functionality to view and syntax-highlight request and response bodies, especially for JSON and XML.

4. Search and Filter Enhancements

Add regex support, save filter presets, and create advanced query builders.

5. Export Functionality

Allow users to export filtered results or generate reports in various formats.

---

Conclusion {#conclusion}

Building a har viewer extension is an excellent project that combines file parsing, data visualization, and Chrome extension development. The skills you learn. handling JSON data, creating responsive interfaces, and working with Chrome APIs. are directly applicable to many other extension projects.

With this guide, you have a complete foundation for building a production-ready har viewer extension that can compete with existing network trace chrome tools. The http archive viewer functionality you have built provides essential capabilities for web developers debugging network issues, analyzing performance, and sharing network traces with team members.

Remember to test thoroughly with real HAR files, gather user feedback, and iterate on your implementation. The Chrome Web Store is an excellent distribution channel, and a well-built har viewer extension can serve thousands of developers who need to analyze network traffic regularly.

---

*This guide is part of the [Chrome Extension Guide](https://bestchromeextensions.com/) by theluckystrike. your comprehensive resource for Chrome extension development.*
