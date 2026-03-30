---
layout: post
title: "Build a Network Monitor Chrome Extension"
description: "Learn how to build a network monitor Chrome extension from scratch. This comprehensive guide covers HTTP request logging, network traffic monitoring, and creating powerful developer tools for analyzing browser requests."
date: 2025-01-20
last_modified_at: 2025-01-20
categories: [guides, chrome-extensions, development-tools]
tags: [network monitor extension, http request logger chrome, network traffic extension, chrome devtools, web development, api monitoring]
keywords: "network monitor extension, http request logger chrome, network traffic extension"
canonical_url: "https://bestchromeextensions.com/2025/01/20/build-network-monitor-chrome-extension/"
---

Build a Network Monitor Chrome Extension

Network monitoring is an essential skill for web developers, security researchers, and QA engineers. Understanding how your application communicates with servers, debugging API calls, and tracking HTTP requests in real-time can save hours of troubleshooting. we will walk you through building a powerful network monitor Chrome extension that captures, displays, and analyzes HTTP requests directly in your browser.

Whether you need to debug API endpoints, track third-party service calls, or monitor network performance, building your own network monitor extension gives you complete control over how you analyze traffic. to the world of Chrome extension development and create a fully functional network traffic monitoring tool.

---

Understanding Chrome's Network Monitoring APIs {#understanding-network-apis}

Before we start coding, it's crucial to understand what tools Chrome provides for network monitoring. The Chrome Extension API offers several powerful mechanisms for intercepting and analyzing network requests, each with its own strengths and use cases.

The chrome.webRequest API

The primary API for network monitoring in Chrome extensions is `chrome.webRequest`. This API allows you to intercept, block, or modify network requests before they are sent, and inspect responses as they arrive. Unlike the DevTools Network panel, a webRequest-based extension can run in the background and continue monitoring even when you're not actively inspecting a page.

The webRequest API provides several event hooks throughout the request lifecycle: `onBeforeRequest` fires before a request is made, `onSendHeaders` triggers when headers are about to be sent, `onHeadersReceived` fires when response headers arrive, `onResponseStarted` triggers when the first byte of the response is received, and `onCompleted` fires when the request finishes successfully. Each event provides different data about the request and response.

One important limitation to note is that the webRequest API cannot access the request body for POST requests or the response body by default. To access these, you need to use the `blocking` and `extraHeaders` configuration options and declare specific permissions in your manifest.

The chrome.debugger API

For more comprehensive network analysis, Chrome provides the `chrome.debugger` API. This API offers lower-level access to network events and can capture request and response bodies, which the webRequest API cannot do. However, the debugger API requires users to grant explicit permission each time you attach to a target, making it less suitable for background monitoring.

The debugger API is ideal if you need to capture full request and response payloads, including POST data and response bodies. It's particularly useful for building API testing tools or security analysis extensions.

Choosing the Right API for Your Extension

For most network monitor extension use cases, the webRequest API provides the best balance of functionality and user experience. It runs silently in the background, doesn't require explicit user approval for each session, and captures sufficient information for general network monitoring. We'll use the webRequest API for this guide, as it's the most practical choice for building a useful network monitoring tool.

---

Setting Up Your Extension Project {#project-setup}

Now let's set up the project structure for our network monitor extension. Create a new directory for your extension and set up the essential files.

Creating the Manifest

Every Chrome extension requires a manifest.json file that defines the extension's configuration, permissions, and capabilities. For a network monitor extension, we need specific permissions to access network request data.

Create a file named `manifest.json` in your project directory with the following content:

```json
{
  "manifest_version": 3,
  "name": "Network Monitor Pro",
  "version": "1.0.0",
  "description": "Monitor and analyze HTTP requests with detailed logging and filtering capabilities",
  "permissions": [
    "webRequest",
    "webRequestBlocking",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The manifest declares several critical permissions. The `webRequest` and `webRequestBlocking` permissions allow us to intercept and monitor network requests. The `host_permissions` with `<all_urls>` grants access to monitor requests to any website. The `storage` permission enables us to save user preferences and request history.

Directory Structure

Create the following directory structure for your extension:

```
network-monitor-extension/
 manifest.json
 background.js
 popup.html
 popup.js
 styles.css
 icons/
    icon16.png
    icon48.png
    icon128.png
 _locales/
     en/
         messages.json
```

For simplicity, you can create placeholder icon files or use any existing PNG images. The extension will function without icons, though Chrome will show a default icon.

---

Building the Background Service Worker {#background-service-worker}

The background service worker is the core of our network monitor extension. It runs continuously in the background, intercepting network requests and storing data for display in the popup.

Create `background.js` with the following code:

```javascript
// Store for captured network requests
let requestData = [];
const MAX_REQUESTS = 1000;

// Initialize the extension
function initialize() {
  console.log('Network Monitor Pro: Initializing...');
  
  // Set up webRequest listeners
  chrome.webRequest.onBeforeRequest.addListener(
    handleBeforeRequest,
    { urls: ["<all_urls>"] }
  );
  
  chrome.webRequest.onSendHeaders.addListener(
    handleSendHeaders,
    { urls: ["<all_urls>"] }
  );
  
  chrome.webRequest.onHeadersReceived.addListener(
    handleHeadersReceived,
    { urls: ["<all_urls>"] }
  );
  
  chrome.webRequest.onCompleted.addListener(
    handleCompleted,
    { urls: ["<all_urls>"] }
  );
  
  chrome.webRequest.onErrorOccurred.addListener(
    handleError,
    { urls: ["<all_urls>"] }
  );
}

// Handle request before it's sent
function handleBeforeRequest(details) {
  const request = {
    id: generateRequestId(),
    url: details.url,
    method: details.method,
    requestType: details.type,
    timestamp: new Date().toISOString(),
    status: 'pending',
    requestHeaders: [],
    responseHeaders: [],
    statusCode: null,
    responseSize: 0,
    duration: null
  };
  
  // Handle POST data
  if (details.requestBody && details.requestBody.formData) {
    request.requestBody = details.requestBody.formData;
  }
  
  requestData.unshift(request);
  
  // Keep only the most recent requests
  if (requestData.length > MAX_REQUESTS) {
    requestData.pop();
  }
  
  // Notify popup if open
  notifyPopup();
}

// Handle request headers being sent
function handleSendHeaders(details) {
  const request = findRequest(details.requestId);
  if (request) {
    request.requestHeaders = details.requestHeaders;
  }
}

// Handle response headers received
function handleHeadersReceived(details) {
  const request = findRequest(details.requestId);
  if (request) {
    request.responseHeaders = details.responseHeaders;
    request.statusCode = details.statusCode;
    request.status = details.statusCode >= 400 ? 'error' : 'success';
  }
}

// Handle request completion
function handleCompleted(details) {
  const request = findRequest(details.requestId);
  if (request) {
    request.status = 'completed';
    request.statusCode = details.statusCode;
    request.responseSize = details.responseSize;
    request.duration = details.timeStamp - parseTimestamp(request.timestamp);
  }
}

// Handle request errors
function handleError(details) {
  const request = findRequest(details.requestId);
  if (request) {
    request.status = 'error';
    request.error = details.error;
  }
}

// Helper function to find a request by ID
function findRequest(requestId) {
  return requestData.find(req => req.id === requestId);
}

// Generate unique request ID
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Parse timestamp to milliseconds
function parseTimestamp(isoString) {
  return new Date(isoString).getTime();
}

// Notify popup of new data
function notifyPopup() {
  chrome.runtime.sendMessage({
    type: 'UPDATE_DATA',
    data: requestData.slice(0, 100) // Send most recent 100
  }).catch(() => {
    // Popup might not be open, ignore error
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    sendResponse({ data: requestData.slice(0, 100) });
  } else if (message.type === 'CLEAR_DATA') {
    requestData = [];
    sendResponse({ success: true });
  } else if (message.type === 'FILTER_DATA') {
    const filtered = filterRequests(message.filter);
    sendResponse({ data: filtered });
  }
  return true;
});

// Filter requests based on criteria
function filterRequests(filter) {
  return requestData.filter(request => {
    if (filter.method && request.method !== filter.method) return false;
    if (filter.statusCode && request.statusCode !== filter.statusCode) return false;
    if (filter.urlPattern && !request.url.includes(filter.urlPattern)) return false;
    if (filter.requestType && request.requestType !== filter.requestType) return false;
    return true;
  });
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  initialize();
});

// Initialize on startup
initialize();
```

This background service worker captures all network requests and stores them in memory. It provides several message handlers for the popup to retrieve, filter, and clear request data.

---

Creating the Popup Interface {#popup-interface}

The popup provides the user interface for viewing captured network requests. Create `popup.html` with a clean, functional design:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Network Monitor Pro</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Network Monitor Pro</h1>
      <div class="controls">
        <button id="clearBtn" class="btn btn-danger">Clear</button>
        <button id="exportBtn" class="btn btn-primary">Export</button>
      </div>
    </header>
    
    <div class="filters">
      <input type="text" id="urlFilter" placeholder="Filter by URL..." class="filter-input">
      <select id="methodFilter" class="filter-select">
        <option value="">All Methods</option>
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="DELETE">DELETE</option>
      </select>
      <select id="typeFilter" class="filter-select">
        <option value="">All Types</option>
        <option value="xmlhttprequest">XHR</option>
        <option value="script">Script</option>
        <option value="stylesheet">Stylesheet</option>
        <option value="image">Image</option>
        <option value="main_frame">Page</option>
      </select>
    </div>
    
    <div class="stats">
      <span id="requestCount">0</span> requests captured
      <span class="separator">|</span>
      <span id="pendingCount">0</span> pending
    </div>
    
    <div class="request-list" id="requestList">
      <div class="loading">Loading...</div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now create the corresponding CSS file `styles.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  font-size: 13px;
  width: 450px;
  height: 500px;
  background: #1e1e1e;
  color: #d4d4d4;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

header h1 {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.controls {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 4px 12px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.btn-primary {
  background: #0e639c;
  color: white;
}

.btn-primary:hover {
  background: #1177bb;
}

.btn-danger {
  background: #4e4e4e;
  color: white;
}

.btn-danger:hover {
  background: #6e4e4e;
}

.filters {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.filter-input {
  flex: 1;
  padding: 4px 8px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  color: #d4d4d4;
  border-radius: 3px;
  font-size: 12px;
}

.filter-input:focus {
  outline: none;
  border-color: #0e639c;
}

.filter-select {
  padding: 4px 8px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  color: #d4d4d4;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
}

.stats {
  padding: 8px 12px;
  background: #252526;
  font-size: 12px;
  color: #858585;
}

.separator {
  margin: 0 8px;
  color: #3e3e42;
}

.request-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.request-item {
  display: flex;
  align-items: center;
  padding: 8px;
  margin-bottom: 4px;
  background: #2d2d30;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
}

.request-item:hover {
  background: #3e3e42;
}

.request-method {
  font-weight: 600;
  min-width: 50px;
  font-size: 11px;
}

.method-get { color: #4ec9b0; }
.method-post { color: #ce9178; }
.method-put { color: #dcdcaa; }
.method-delete { color: #f44747; }

.request-status {
  min-width: 40px;
  text-align: center;
  font-size: 11px;
  margin-right: 8px;
}

.status-success { color: #4ec9b0; }
.status-pending { color: #dcdcaa; }
.status-error { color: #f44747; }

.request-url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #ce9178;
}

.request-type {
  font-size: 10px;
  color: #858585;
  margin-left: 8px;
  text-transform: uppercase;
}

.request-duration {
  font-size: 11px;
  color: #858585;
  margin-left: 8px;
  min-width: 50px;
  text-align: right;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #858585;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #858585;
}

/* Scrollbar styling */
.request-list::-webkit-scrollbar {
  width: 8px;
}

.request-list::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.request-list::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 4px;
}

.request-list::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}
```

---

Implementing Popup Functionality {#popup-javascript}

Create `popup.js` to handle user interactions and display request data:

```javascript
let allRequests = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadRequestData();
  setupEventListeners();
  startAutoRefresh();
});

function setupEventListeners() {
  // Clear button
  document.getElementById('clearBtn').addEventListener('click', clearRequests);
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportRequests);
  
  // Filter inputs
  document.getElementById('urlFilter').addEventListener('input', debounce(applyFilters, 300));
  document.getElementById('methodFilter').addEventListener('change', applyFilters);
  document.getElementById('typeFilter').addEventListener('change', applyFilters);
}

function loadRequestData() {
  chrome.runtime.sendMessage({ type: 'GET_DATA' }, (response) => {
    if (response && response.data) {
      allRequests = response.data;
      renderRequests(allRequests);
      updateStats();
    }
  });
}

function renderRequests(requests) {
  const container = document.getElementById('requestList');
  
  if (requests.length === 0) {
    container.innerHTML = '<div class="empty-state">No requests captured yet. Browse the web to see network activity.</div>';
    return;
  }
  
  container.innerHTML = requests.map(request => createRequestItem(request)).join('');
  
  // Add click handlers for details
  container.querySelectorAll('.request-item').forEach((item, index) => {
    item.addEventListener('click', () => showRequestDetails(requests[index]));
  });
}

function createRequestItem(request) {
  const methodClass = `method-${request.method.toLowerCase()}`;
  const statusClass = request.status === 'pending' ? 'status-pending' : 
                      request.statusCode >= 400 ? 'status-error' : 'status-success';
  
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  
  return `
    <div class="request-item">
      <span class="request-method ${methodClass}">${request.method}</span>
      <span class="request-status ${statusClass}">${request.statusCode || '...'}</span>
      <span class="request-url" title="${request.url}">${path}</span>
      <span class="request-type">${request.requestType}</span>
      <span class="request-duration">${request.duration ? request.duration + 'ms' : ''}</span>
    </div>
  `;
}

function updateStats() {
  const pending = allRequests.filter(r => r.status === 'pending').length;
  document.getElementById('requestCount').textContent = allRequests.length;
  document.getElementById('pendingCount').textContent = pending;
}

function applyFilters() {
  const urlFilter = document.getElementById('urlFilter').value.toLowerCase();
  const methodFilter = document.getElementById('methodFilter').value;
  const typeFilter = document.getElementById('typeFilter').value;
  
  const filtered = allRequests.filter(request => {
    if (methodFilter && request.method !== methodFilter) return false;
    if (typeFilter && request.requestType !== typeFilter) return false;
    if (urlFilter && !request.url.toLowerCase().includes(urlFilter)) return false;
    return true;
  });
  
  renderRequests(filtered);
}

function clearRequests() {
  if (confirm('Clear all captured requests?')) {
    chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, () => {
      allRequests = [];
      renderRequests([]);
      updateStats();
    });
  }
}

function exportRequests() {
  const data = JSON.stringify(allRequests, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `network-requests-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

function showRequestDetails(request) {
  const details = `
Request Details
===============
URL: ${request.url}
Method: ${request.method}
Status: ${request.statusCode || 'Pending'}
Type: ${request.requestType}
Time: ${request.timestamp}
Duration: ${request.duration ? request.duration + 'ms' : 'N/A'}

Request Headers:
${formatHeaders(request.requestHeaders)}

Response Headers:
${formatHeaders(request.responseHeaders)}
  `.trim();
  
  alert(details);
}

function formatHeaders(headers) {
  if (!headers || headers.length === 0) return 'None';
  return headers.map(h => `${h.name}: ${h.value}`).join('\n');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function startAutoRefresh() {
  setInterval(() => {
    loadRequestData();
  }, 2000);
}
```

---

Testing Your Extension {#testing-extension}

Now that we've created all the necessary files, let's test the extension in Chrome.

Loading the Extension

Open Chrome and navigate to `chrome://extensions/`. Enable Developer mode using the toggle in the top right corner. Click the "Load unpacked" button and select your extension directory.

The extension should now appear in your toolbar. Click the extension icon to open the popup. Initially, you'll see an empty state message since no requests have been captured yet.

Capturing Network Requests

Open a new tab and browse to any website. Watch as requests appear in your network monitor popup. Try visiting different types of sites to see various request types: regular web pages, API endpoints, CDN resources, and analytics trackers.

The extension captures all HTTP methods including GET, POST, PUT, DELETE, and others. You can filter requests by URL pattern, HTTP method, and request type using the dropdown filters.

Exporting and Analyzing Data

Use the Export button to download your captured requests as a JSON file. This is particularly useful for analyzing API behavior, debugging issues, or documenting API interactions.

---

Advanced Features and Enhancements {#advanced-features}

While our network monitor extension provides solid functionality, there are numerous ways to enhance it. Here are some ideas for advanced features:

Real-Time WebSocket Monitoring

Add WebSocket connection tracking using the webRequest API's WebSocket request type. This allows you to monitor real-time bidirectional communication used by many modern web applications.

Request Timing Analysis

Implement detailed timing metrics by capturing the time when each request lifecycle event fires. This helps identify slow API endpoints or server response issues.

Request Pattern Alerts

Add the ability to set alerts for specific request patterns, such as failed API calls or requests to specific domains. This is useful for monitoring production applications.

Data Persistence

Use Chrome's storage API to persist request data between sessions. This allows developers to review network activity even after closing and reopening the browser.

Request Modification

With the webRequestBlocking permission, you can modify requests before they are sent. This enables building request editors or API testing tools that can alter headers, parameters, or request bodies on the fly.

---

Understanding Network Request Security {#security-considerations}

When building network monitoring extensions, it's important to understand the security implications and best practices.

Privacy Concerns

Network monitor extensions have access to sensitive data including URLs, request bodies, and potentially authentication headers. Always handle this data responsibly: don't send captured data to external servers without explicit user consent, clearly disclose what data your extension collects, and provide users with controls to clear captured data.

HTTPS Considerations

Modern websites use HTTPS encryption, and your extension can monitor these secure connections when configured with appropriate permissions. However, never intercept or modify requests in ways that would compromise user security or privacy.

Content Script Integration

For deeper integration with specific pages, consider using content scripts alongside the webRequest API. Content scripts can access page-specific network information and provide context-aware analysis.

---

Troubleshooting Common Issues {#troubleshooting}

Here are solutions to common problems you might encounter while building or using your network monitor extension:

Requests Not Appearing

If requests aren't appearing in your popup, check that the extension has the correct permissions in the manifest. Ensure `host_permissions` includes the domains you're testing. Also verify that the background service worker is running by checking chrome://extensions/.

Performance Issues

If the extension causes browser slowdowns, reduce the `MAX_REQUESTS` constant in background.js. Consider implementing more aggressive filtering or throttling updates to the popup.

Memory Leaks

Background service workers can accumulate memory over time. Ensure you're properly cleaning up arrays and removing event listeners when they're no longer needed.

---

Conclusion {#conclusion}

Building a network monitor Chrome extension is an excellent project that teaches you about Chrome's extension architecture, network request handling, and building useful developer tools. The extension we've built captures HTTP requests in real-time, displays them in a filterable interface, and allows exporting data for further analysis.

This foundation opens up numerous possibilities for customization and enhancement. You can add request body viewing, implement advanced filtering, create request modification capabilities, or integrate with external API testing services. The webRequest API provides extensive capabilities for building sophisticated network analysis tools.

Network monitoring is an essential skill for web developers, and having a custom-built tool gives you complete control over how you analyze and debug network traffic. Start with this basic implementation, then customize it to match your specific development workflow and requirements.

Remember to test your extension thoroughly across different types of websites and network conditions. Pay attention to performance and memory usage, especially when monitoring high-traffic applications. With proper optimization, your network monitor extension can become an invaluable part of your web development toolkit.

---

Additional Resources {#resources}

To further enhance your network monitoring capabilities, explore these related topics and Chrome APIs:

- Chrome's official webRequest API documentation provides complete details on all available events and options
- Chrome DevTools Protocol offers additional network debugging capabilities for advanced use cases
- The Chrome Extension Samples repository contains examples of various extension types including network-related projects

Start building your network monitor extension today and take control of your browser's network traffic!

---
Turn Your Extension Into a Business
Ready to monetize? The Extension Monetization Playbook covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

*Built by theluckystrike at zovo.one*