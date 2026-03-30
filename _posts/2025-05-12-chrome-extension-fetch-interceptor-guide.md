---
layout: post
title: "Chrome Extension Fetch Interceptor: Monitor and Modify API Calls"
description: "Learn how to build a Chrome extension fetch interceptor to monitor, log, and modify API calls in real-time. Complete guide with code examples."
date: 2025-05-12
last_modified_at: 2025-05-12
categories: [Chrome-Extensions, Developer-Tools]
tags: [fetch, interceptor, chrome-extension]
keywords: "chrome extension fetch interceptor, intercept fetch chrome, modify api calls extension, chrome extension api monitor, request interceptor extension"
canonical_url: "https://bestchromeextensions.com/2025/05/12/chrome-extension-fetch-interceptor-guide/"
---

Chrome Extension Fetch Interceptor: Monitor and Modify API Calls

Web developers often need to inspect, debug, or modify network requests flowing between their applications and backend APIs. Whether you're building a developer tool, debugging an application, creating an API monitor, or implementing advanced functionality like request caching, understanding how to intercept and manipulate fetch requests in Chrome extensions is an essential skill.

we'll explore how to create a Chrome extension fetch interceptor that can monitor, log, and modify API calls in real-time. We'll cover the technical implementation, practical use cases, and provide complete working code examples that you can adapt for your own projects.

---

Understanding Fetch Interception in Chrome Extensions {#understanding-fetch-interception}

The Fetch API is the modern standard for making HTTP requests in JavaScript. Unlike the older XMLHttpRequest, Fetch provides a cleaner, promise-based interface that has become the backbone of modern web application networking. However, by default, fetch requests operate silently in the background, making it challenging to monitor or modify them without explicit instrumentation.

Chrome extensions offer a powerful solution through the `declarativeNetRequest` API and the ability to intercept requests at various stages. With Manifest V3, Google introduced significant changes to how extensions can interact with network requests, prioritizing user privacy and security while still providing solid capabilities for legitimate use cases.

A fetch interceptor extension can serve multiple purposes:

- API Monitoring: Track all API calls made by a web application for debugging and analytics
- Request Modification: Alter headers, query parameters, or request bodies before they reach the server
- Response Manipulation: Modify API responses for testing or development purposes
- Request Blocking: Prevent certain requests from being made based on custom rules
- Caching: Implement custom caching strategies to reduce network traffic

---

Setting Up Your Chrome Extension Project {#setting-up-project}

Before diving into the implementation, let's set up a basic Chrome extension project structure. You'll need the following files:

manifest.json

```json
{
  "manifest_version": 3,
  "name": "Fetch Interceptor Pro",
  "version": "1.0.0",
  "description": "Monitor and modify fetch API calls in Chrome",
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
    "storage",
    "tabs"
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

The manifest declares the necessary permissions for intercepting network requests. The `declarativeNetRequest` permission is the key capability that allows us to modify and monitor HTTP requests without requiring broad access to page content.

---

Implementing the Fetch Interceptor Logic {#implementing-interceptor}

The Background Service Worker

The background service worker serves as the central hub for managing fetch interception rules. Here's a complete implementation:

```javascript
// background.js

// Store for captured requests
let capturedRequests = [];
const MAX_STORED_REQUESTS = 1000;

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Fetch Interceptor Pro installed');
  initializeRules();
});

// Function to add interception rules
function initializeRules() {
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'X-Fetch-Interceptor', operation: 'set', value: 'active' }
        ]
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['xmlhttprequest', 'fetch']
      }
    }
  ];

  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
    removeRuleIds: [1]
  });
}

// Listen for request headers
chrome.declarativeNetRequest.onHeadersReceived.addListener(
  (details) => {
    const requestInfo = {
      id: Date.now() + Math.random(),
      url: details.url,
      method: details.method,
      statusCode: details.statusCode,
      requestHeaders: details.requestHeaders,
      responseHeaders: details.responseHeaders,
      timestamp: new Date().toISOString(),
      tabId: details.tabId
    };

    // Store the request
    capturedRequests.unshift(requestInfo);
    
    // Limit stored requests
    if (capturedRequests.length > MAX_STORED_REQUESTS) {
      capturedRequests = capturedRequests.slice(0, MAX_STORED_REQUESTS);
    }

    // Broadcast to popup if open
    chrome.runtime.sendMessage({
      type: 'REQUEST_CAPTURED',
      request: requestInfo
    }).catch(() => {
      // Popup not open, ignore error
    });

    return { responseHeaders: details.responseHeaders };
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_REQUESTS':
      sendResponse({ requests: capturedRequests });
      break;
    case 'CLEAR_REQUESTS':
      capturedRequests = [];
      sendResponse({ success: true });
      break;
    case 'MODIFY_REQUEST':
      modifyRequest(message.data).then(sendResponse);
      return true; // Keep message channel open for async response
    case 'BLOCK_REQUEST':
      blockRequest(message.data.requestId).then(sendResponse);
      return true;
  }
});

// Modify a captured request
async function modifyRequest(data) {
  const { requestId, newUrl, newHeaders, newMethod } = data;
  
  // Update stored request
  const request = capturedRequests.find(r => r.id === requestId);
  if (request) {
    request.modified = true;
    request.modifications = { newUrl, newHeaders, newMethod };
  }

  return { success: true, message: 'Request modification queued' };
}

// Block a specific request
async function blockRequest(requestId) {
  const ruleId = Math.floor(requestId * 1000);
  
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: ruleId,
      priority: 2,
      action: { type: 'block' },
      condition: {
        urlFilter: capturedRequests.find(r => r.id === requestId)?.url || '',
        resourceTypes: ['xmlhttprequest', 'fetch']
      }
    }],
    removeRuleIds: []
  });

  return { success: true, message: 'Request will be blocked' };
}

// Export for cleanup
export function cleanup() {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1]
  });
}
```

---

Creating the Popup Interface {#popup-interface}

The popup provides a user interface for viewing and managing captured requests:

popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fetch Interceptor</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 400px;
      min-height: 500px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
    }
    .header {
      padding: 16px;
      background: #16213e;
      border-bottom: 1px solid #0f3460;
    }
    .header h1 {
      font-size: 16px;
      color: #e94560;
    }
    .controls {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: #16213e;
    }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }
    .btn-primary {
      background: #e94560;
      color: white;
    }
    .btn-secondary {
      background: #0f3460;
      color: white;
    }
    button:hover { opacity: 0.9; }
    .request-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .request-item {
      padding: 12px 16px;
      border-bottom: 1px solid #0f3460;
      cursor: pointer;
      transition: background 0.2s;
    }
    .request-item:hover {
      background: #16213e;
    }
    .request-method {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
      margin-right: 8px;
    }
    .method-get { background: #4caf50; }
    .method-post { background: #2196f3; }
    .method-put { background: #ff9800; }
    .method-delete { background: #f44336; }
    .request-url {
      font-size: 11px;
      color: #aaa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .request-status {
      float: right;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .status-success { background: #4caf50; }
    .status-error { background: #f44336; }
    .filter-input {
      width: 100%;
      padding: 8px;
      background: #0f3460;
      border: 1px solid #16213e;
      color: white;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .stats {
      padding: 8px 16px;
      font-size: 11px;
      color: #888;
      background: #0f3460;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1> Fetch Interceptor Pro</h1>
  </div>
  <div class="controls">
    <button id="clearBtn" class="btn-secondary">Clear All</button>
    <button id="pauseBtn" class="btn-secondary">Pause</button>
    <button id="exportBtn" class="btn-primary">Export</button>
  </div>
  <div style="padding: 12px 16px;">
    <input type="text" id="filterInput" class="filter-input" placeholder="Filter requests by URL...">
  </div>
  <div class="stats" id="stats">Loading...</div>
  <div class="request-list" id="requestList"></div>
  <script src="popup.js"></script>
</body>
</html>
```

popup.js

```javascript
// popup.js

let isPaused = false;
let requests = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadRequests();
  setupEventListeners();
  setupMessageListener();
});

function setupEventListeners() {
  document.getElementById('clearBtn').addEventListener('click', clearRequests);
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('exportBtn').addEventListener('click', exportRequests);
  document.getElementById('filterInput').addEventListener('input', filterRequests);
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'REQUEST_CAPTURED' && !isPaused) {
      requests.unshift(message.request);
      renderRequests();
      updateStats();
    }
  });
}

async function loadRequests() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_REQUESTS' });
    requests = response.requests || [];
    renderRequests();
    updateStats();
  } catch (error) {
    console.error('Failed to load requests:', error);
  }
}

function renderRequests() {
  const list = document.getElementById('requestList');
  const filter = document.getElementById('filterInput').value.toLowerCase();
  
  const filteredRequests = requests.filter(r => 
    r.url.toLowerCase().includes(filter)
  );

  list.innerHTML = filteredRequests.map(req => `
    <div class="request-item" data-id="${req.id}">
      <span class="request-method method-${req.method.toLowerCase()}">${req.method}</span>
      <span class="request-url">${formatUrl(req.url)}</span>
      <span class="request-status ${req.statusCode >= 400 ? 'status-error' : 'status-success'}">${req.statusCode}</span>
    </div>
  `).join('');

  // Add click handlers
  list.querySelectorAll('.request-item').forEach(item => {
    item.addEventListener('click', () => showRequestDetails(item.dataset.id));
  });
}

function formatUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + (urlObj.search || '');
  } catch {
    return url;
  }
}

function filterRequests() {
  renderRequests();
}

function updateStats() {
  const stats = document.getElementById('stats');
  stats.textContent = `${requests.length} requests captured | Showing ${document.querySelectorAll('.request-item').length} after filter`;
}

async function clearRequests() {
  await chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
  requests = [];
  renderRequests();
  updateStats();
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById('pauseBtn').textContent = isPaused ? 'Resume' : 'Pause';
}

function exportRequests() {
  const data = JSON.stringify(requests, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `fetch-requests-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

function showRequestDetails(requestId) {
  const request = requests.find(r => r.id == requestId);
  if (!request) return;

  const details = `
URL: ${request.url}
Method: ${request.method}
Status: ${request.statusCode}
Time: ${request.timestamp}

Request Headers:
${JSON.stringify(request.requestHeaders, null, 2)}

Response Headers:
${JSON.stringify(request.responseHeaders, null, 2)}
  `;

  alert(details);
}
```

---

Advanced Interception Techniques {#advanced-techniques}

Intercepting Request Bodies

For POST, PUT, and PATCH requests, you often need to inspect or modify the request body. While the `declarativeNetRequest` API doesn't directly support body interception, you can use content scripts with the `webRequest` API:

```javascript
// In content script - intercept fetch before it's called
(function() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [resource, config] = args;
    const url = resource instanceof Request ? resource.url : resource;
    const method = config?.method || 'GET';
    
    // Log the request before it's sent
    console.log('[Fetch Interceptor] Request:', {
      url,
      method,
      headers: config?.headers,
      body: config?.body
    });

    try {
      const response = await originalFetch.apply(this, args);
      
      // Clone response to read body without consuming it
      const clonedResponse = response.clone();
      
      // Log response
      console.log('[Fetch Interceptor] Response:', {
        url,
        status: response.status,
        statusText: response.statusText
      });

      return response;
    } catch (error) {
      console.error('[Fetch Interceptor] Error:', error);
      throw error;
    }
  };
})();
```

Modifying Responses on the Fly

To modify API responses, you can create a more sophisticated interceptor:

```javascript
// Enhanced fetch interceptor with response modification
window.fetch = async function(...args) {
  const [resource, config] = args;
  const url = resource instanceof Request ? resource.url : resource;
  
  // Check if we should modify this response
  const modification = getModificationRule(url);
  
  if (modification) {
    // Return modified response
    return new Response(JSON.stringify(modification.data), {
      status: modification.status || 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return originalFetch.apply(this, args);
};

function getModificationRule(url) {
  // Define your modification rules here
  const rules = [
    {
      pattern: /api\.example\.com\/user/,
      data: { modified: true, message: 'Response intercepted and modified' },
      status: 200
    }
  ];
  
  for (const rule of rules) {
    if (rule.pattern.test(url)) {
      return rule;
    }
  }
  
  return null;
}
```

---

Use Cases for Fetch Interceptors {#use-cases}

1. API Development and Debugging

Developers can use fetch interceptors to debug API calls, inspect request and response headers, and identify issues in real-time. This is particularly useful when working with complex APIs or debugging production issues.

2. API Monitoring and Analytics

Create monitoring tools that track API call patterns, response times, and error rates. This data can help identify performance bottlenecks and reliability issues.

3. Mock API Responses

During development, intercept API calls and return mock data to work independently of backend services. This accelerates frontend development and enables testing edge cases.

4. Security Auditing

Monitor sensitive API calls to identify potential security vulnerabilities, such as exposed credentials or sensitive data in request bodies.

5. Rate Limiting and Throttling

Implement client-side rate limiting to prevent overwhelming APIs or to test how your application handles rate limit responses.

---

Best Practices and Considerations {#best-practices}

Performance Impact

Be mindful of the performance impact when intercepting requests. Minimize the amount of processing done in interceptors, especially for high-frequency API calls.

Privacy and Security

Only capture requests that are necessary for your extension's functionality. Avoid storing sensitive data like authentication tokens unless absolutely required, and implement proper data encryption.

Manifest V3 Limitations

Remember that Manifest V3 has stricter limitations compared to V2. The `declarativeNetRequest` API doesn't support blocking loads or modifying request bodies directly. Plan your implementation accordingly.

User Consent and Transparency

Clearly communicate to users what data your extension collects and how it's used. Provide options for users to control what gets monitored.

---

Conclusion {#conclusion}

Building a Chrome extension fetch interceptor is a powerful way to monitor, debug, and modify API calls in real-time. With the `declarativeNetRequest` API and content script techniques demonstrated in this guide, you can create sophisticated tools for API development, debugging, monitoring, and more.

Remember to follow Chrome's best practices, respect user privacy, and test thoroughly across different scenarios. The techniques covered here provide a solid foundation for building production-ready fetch interception extensions.

Start by implementing the basic structure from this guide, then customize it to fit your specific needs. Whether you're building a developer tool, debugging utility, or production monitoring system, the fetch interception capabilities of Chrome extensions offer endless possibilities for enhancing your development workflow.

---

Additional Resources {#resources}

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [declarativeNetRequest API Reference](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/)
- [Chrome Web Store Publishing Guide](https://developer.chrome.com/docs/webstore/publish/)

Happy coding!