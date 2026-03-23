---
layout: post
title: "Build a Local API Mock Chrome Extension: Complete Developer Guide"
description: "Learn how to build a powerful local API mock Chrome extension that intercepts network requests, returns fake responses, and speeds up frontend development. Complete tutorial with code examples."
date: 2025-01-27
categories: [Chrome-Extensions, Developer-Tools]
tags: [chrome-extension, developer-tools]
keywords: "api mock extension, mock server chrome, fake api extension, chrome extension api mock, local api mock chrome extension, mock network requests chrome extension"
canonical_url: "https://bestchromeextensions.com/2025/01/27/build-local-api-mock-chrome-extension/"
---

# Build a Local API Mock Chrome Extension: Complete Developer Guide

Creating a local API mock Chrome extension is one of the most valuable skills a frontend developer can add to their toolkit. Whether you're working on a project with incomplete backend services, need to test edge cases that are difficult to reproduce with real APIs, or simply want to speed up your development workflow by eliminating network latency, a well-built API mock extension can dramatically improve your productivity. we'll walk through the entire process of building a fully functional local API mock Chrome extension using Manifest V3 patterns.

The concept of API mocking isn't new to web development. Developers have long used tools like Postman, WireMock, or MSW (Mock Service Worker) to simulate API responses. However, building this functionality directly into a Chrome extension offers unique advantages that make it particularly appealing for everyday development tasks. Unlike external tools that require additional setup or server processes, a Chrome extension runs directly in the browser, intercepting network requests at the extension level and returning mock responses without any external dependencies.

---

Understanding the Architecture of a Local API Mock Extension {#understanding-architecture}

Before diving into the implementation details, it's essential to understand the core architecture that makes a local API mock extension work. The foundation lies in Chrome's webRequest API, which allows extensions to observe, analyze, and modify network requests as they pass through the browser. Combined with the declarativeNetRequest API introduced in Manifest V3, you can create powerful rules that intercept specific URL patterns and return custom responses without modifying the original request.

The architecture consists of several key components working together smoothly. The background service worker serves as the central controller, managing mock configurations and handling communication between different parts of the extension. A popup interface provides developers with an intuitive way to create, edit, and toggle mock rules in real-time. Storage mechanisms using chrome.storage enable persistence of mock configurations across browser sessions, so you don't need to recreate your mocks every time you restart Chrome.

One of the most significant advantages of building this as a Chrome extension is the ability to work completely offline. Traditional mock servers require running a local Node.js server or similar setup, which adds complexity to your development environment. With a Chrome extension, everything runs within the browser itself, making it portable and easy to share with team members through the Chrome Web Store or direct extension loading.

Why Build Your Own Instead of Using Existing Solutions?

You might wonder why you should build your own API mock extension when several existing solutions like Requestly, Mockable.io, or various browser DevTools already provide similar functionality. The answer lies in customization and learning. Building your own extension gives you complete control over features, allows you to tailor it to your specific workflow, and provides invaluable insights into how Chrome extensions interact with network requests.

Moreover, existing tools often come with limitations, whether in the form of paid features, data privacy concerns, or simply not matching your particular use case. A custom-built solution can be exactly what you need, and the knowledge gained from building it translates to better understanding of Chrome extension development overall.

---

Setting Up the Project Structure {#project-structure}

Every well-organized Chrome extension follows a clear project structure that separates concerns and makes maintenance straightforward. For our local API mock extension, we'll use the following directory layout that reflects best practices for Manifest V3 extensions.

```
chrome-api-mock/
 manifest.json
 background/
    service-worker.js
 popup/
    popup.html
    popup.css
    popup.js
 content/
    content-script.js
 mock-data/
    mocks.json
 icons/
     icon16.png
     icon48.png
     icon128.png
```

The manifest.json file serves as the extension's configuration, declaring permissions, background scripts, and popup details. The background directory contains the service worker that manages mock rules and intercepts network requests. The popup directory holds the user interface for managing mocks, while the mock-data directory stores our predefined mock responses. Let's start by creating the manifest.json with the necessary permissions.

```json
{
  "manifest_version": 3,
  "name": "Local API Mock",
  "version": "1.0.0",
  "description": "Intercept and mock network requests directly in Chrome",
  "permissions": [
    "storage",
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
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

The key permissions here are declarativeNetRequest and host_access, which allow our extension to intercept and modify network requests across all websites. The storage permission enables persisting our mock configurations, while activeTab provides access to the current tab for additional functionality.

---

Implementing the Service Worker {#service-worker}

The service worker acts as the brain of our extension, handling mock rule management and coordinating with the declarativeNetRequest API. Let's create a comprehensive service worker that handles all the core functionality.

```javascript
// background/service-worker.js

const MOCK_RULES_COLLECTION = 'mock-rules';
const DYNAMIC_RULES_COLLECTION = 'dynamic-rules';

let mockRules = [];
let isExtensionEnabled = false;

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  await loadMockRules();
  console.log('Local API Mock extension installed');
});

// Load mock rules from storage
async function loadMockRules() {
  const result = await chrome.storage.local.get(MOCK_RULES_COLLECTION);
  mockRules = result[MOCK_RULES_COLLECTION] || [];
}

// Save mock rules to storage
async function saveMockRules() {
  await chrome.storage.local.set({
    [MOCK_RULES_COLLECTION]: mockRules
  });
}

// Toggle extension on/off
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleExtension') {
    isExtensionEnabled = request.enabled;
    if (isExtensionEnabled) {
      applyMockRules();
    } else {
      clearMockRules();
    }
    sendResponse({ success: true, enabled: isExtensionEnabled });
  }
  
  if (request.action === 'getStatus') {
    sendResponse({ enabled: isExtensionEnabled, rules: mockRules });
  }
  
  if (request.action === 'addMockRule') {
    mockRules.push(request.rule);
    saveMockRules();
    if (isExtensionEnabled) {
      applyMockRules();
    }
    sendResponse({ success: true });
  }
  
  if (request.action === 'deleteMockRule') {
    mockRules = mockRules.filter((_, index) => index !== request.index);
    saveMockRules();
    if (isExtensionEnabled) {
      applyMockRules();
    }
    sendResponse({ success: true });
  }
  
  return true;
});

// Apply mock rules using declarativeNetRequest
async function applyMockRules() {
  const rules = mockRules.map((mock, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        url: mock.isLocalFile 
          ? `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(mock.response))}`
          : mock.customUrl
      },
      responseHeaders: [
        { header: 'Access-Control-Allow-Origin', value: '*' },
        { header: 'Content-Type', value: 'application/json' }
      ]
    },
    condition: {
      urlFilter: mock.urlPattern,
      resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame']
    }
  }));

  try {
    // First, clear any existing dynamic rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map(r => r.id)
    });
    
    // Then add new rules
    if (rules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules
      });
    }
  } catch (error) {
    console.error('Error applying mock rules:', error);
  }
}

// Clear all mock rules
async function clearMockRules() {
  const ruleIds = mockRules.map((_, index) => index + 1);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIds
  });
}
```

This service worker handles the core functionality of managing and applying mock rules. It listens for messages from the popup interface, loads and saves rules from storage, and uses Chrome's declarativeNetRequest API to intercept network requests. The redirect action is just one option; you can also use the 'response' action type to directly supply a response body.

---

Building the Popup Interface {#popup-interface}

The popup interface provides developers with an intuitive way to manage their mock rules without leaving the browser. Let's create a clean, functional popup that supports adding, viewing, and deleting mock rules.

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Local API Mock</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Local API Mock</h1>
      <label class="toggle">
        <input type="checkbox" id="extensionToggle">
        <span class="slider"></span>
      </label>
    </header>
    
    <section class="add-mock-section">
      <h2>Add New Mock</h2>
      <form id="addMockForm">
        <div class="form-group">
          <label for="urlPattern">URL Pattern (regex or wildcard)</label>
          <input type="text" id="urlPattern" placeholder="https://api.example.com/users*" required>
        </div>
        
        <div class="form-group">
          <label for="responseBody">Response Body (JSON)</label>
          <textarea id="responseBody" rows="5" placeholder='{"users": []}' required></textarea>
        </div>
        
        <div class="form-group">
          <label for="statusCode">Status Code</label>
          <select id="statusCode">
            <option value="200">200 OK</option>
            <option value="201">201 Created</option>
            <option value="400">400 Bad Request</option>
            <option value="401">401 Unauthorized</option>
            <option value="403">403 Forbidden</option>
            <option value="404">404 Not Found</option>
            <option value="500">500 Server Error</option>
          </select>
        </div>
        
        <button type="submit" class="btn-primary">Add Mock Rule</button>
      </form>
    </section>
    
    <section class="rules-section">
      <h2>Active Mocks</h2>
      <div id="rulesList" class="rules-list"></div>
    </section>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now let's add styling to make the popup visually appealing and functional:

```css
/* popup/popup.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 400px;
  min-height: 500px;
  background: #f5f5f5;
}

.container {
  padding: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 18px;
  color: #333;
}

h2 {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

/* Toggle Switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4CAF50;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

/* Form Styles */
.add-mock-section {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.form-group {
  margin-bottom: 12px;
}

label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

input[type="text"],
textarea,
select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

textarea {
  font-family: monospace;
  resize: vertical;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #1976D2;
}

/* Rules List */
.rules-section {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.rules-list {
  max-height: 300px;
  overflow-y: auto;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 8px;
}

.rule-info {
  flex: 1;
  overflow: hidden;
}

.rule-url {
  font-size: 12px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-status {
  font-size: 11px;
  color: #4CAF50;
}

.delete-btn {
  padding: 4px 8px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.delete-btn:hover {
  background: #d32f2f;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 20px;
  font-size: 13px;
}
```

Finally, let's implement the popup JavaScript to handle user interactions:

```javascript
// popup/popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('extensionToggle');
  const form = document.getElementById('addMockForm');
  const rulesList = document.getElementById('rulesList');
  
  // Load initial state
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    toggle.checked = response.enabled;
    renderRules(response.rules || []);
  });
  
  // Handle toggle
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    chrome.runtime.sendMessage({ 
      action: 'toggleExtension', 
      enabled 
    }, (response) => {
      console.log('Extension toggled:', response.enabled);
    });
  });
  
  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const urlPattern = document.getElementById('urlPattern').value;
    const responseBody = document.getElementById('responseBody').value;
    const statusCode = parseInt(document.getElementById('statusCode').value);
    
    let response;
    try {
      response = JSON.parse(responseBody);
    } catch (error) {
      alert('Invalid JSON in response body');
      return;
    }
    
    const rule = {
      urlPattern,
      response,
      statusCode,
      isLocalFile: true,
      createdAt: new Date().toISOString()
    };
    
    chrome.runtime.sendMessage({ 
      action: 'addMockRule', 
      rule 
    }, async () => {
      form.reset();
      chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
        renderRules(response.rules || []);
      });
    });
  });
  
  // Render rules list
  function renderRules(rules) {
    if (rules.length === 0) {
      rulesList.innerHTML = '<div class="empty-state">No mock rules yet. Add one above!</div>';
      return;
    }
    
    rulesList.innerHTML = rules.map((rule, index) => `
      <div class="rule-item">
        <div class="rule-info">
          <div class="rule-url">${rule.urlPattern}</div>
          <div class="rule-status">Status: ${rule.statusCode || 200}</div>
        </div>
        <button class="delete-btn" data-index="${index}">Delete</button>
      </div>
    `).join('');
    
    // Add delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        chrome.runtime.sendMessage({ 
          action: 'deleteMockRule', 
          index 
        }, async () => {
          chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
            renderRules(response.rules || []);
          });
        });
      });
    });
  }
});
```

---

Advanced Features and Use Cases {#advanced-features}

Now that we have the basic implementation working, let's explore some advanced features that can make your API mock extension even more powerful and useful for real-world development scenarios.

Dynamic Response Manipulation

One of the most powerful features you can add is the ability to generate dynamic responses based on request parameters. Instead of returning static JSON, you can create response factories that modify the output based on query parameters, headers, or request body content.

For example, suppose you're mocking an API endpoint that returns a list of users with pagination. You can create a dynamic response that reads the page and limit parameters from the request and returns the appropriate subset of data:

```javascript
// Dynamic response factory example
function createPaginatedResponse(request, mockConfig) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = parseInt(url.searchParams.get('limit')) || 10;
  
  const allUsers = mockConfig.response.users;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: allUsers.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total: allUsers.length,
      totalPages: Math.ceil(allUsers.length / limit)
    }
  };
}
```

This approach allows you to test various pagination scenarios without creating separate mock rules for each page. You can extend this pattern to handle sorting, filtering, and other query parameters that your real API might support.

Request Logging and Debugging

Another valuable feature is implementing request logging that captures all intercepted requests, allowing developers to debug their applications more effectively. You can store request logs in chrome.storage and display them in a dedicated panel within your extension popup.

```javascript
// Request logging in service worker
async function logRequest(details) {
  const logs = await chrome.storage.local.get('requestLogs');
  const requestLogs = logs.requestLogs || [];
  
  requestLogs.unshift({
    url: details.url,
    method: details.method,
    statusCode: details.statusCode,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 100 requests
  const trimmedLogs = requestLogs.slice(0, 100);
  
  await chrome.storage.local.set({ requestLogs: trimmedLogs });
}
```

Mock Response Delay Simulation

Network latency is often the culprit behind performance issues in web applications. Adding configurable delay simulation to your mock responses helps developers understand how their applications behave under slow network conditions.

```javascript
// Add delay to mock responses
async function createDelayedResponse(mock, originalResponse) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(originalResponse);
    }, mock.delay || 0);
  });
}
```

You can extend the popup UI to include a delay input field, allowing developers to test their application's loading states, skeleton screens, and timeout handling.

Mock Suites and Presets

For larger projects with multiple environments or feature branches, organizing mocks into suites and presets becomes essential. You can implement a system where developers can save groups of mock rules as presets and switch between them instantly.

```javascript
// Preset management
async function savePreset(name, rules) {
  const presets = await chrome.storage.local.get('presets');
  const existingPresets = presets.presets || {};
  
  existingPresets[name] = rules;
  await chrome.storage.local.set({ presets: existingPresets });
}

async function loadPreset(name) {
  const presets = await chrome.storage.local.get('presets');
  const rules = presets.presets?.[name];
  if (rules) {
    mockRules = rules;
    await saveMockRules();
    applyMockRules();
  }
}
```

This feature is particularly useful when working on feature branches that might have different API contract requirements, or when switching between development, staging, and production environments.

---

Best Practices and Performance Considerations {#best-practices}

Building a production-ready Chrome extension requires attention to performance, security, and user experience. Here are some essential best practices to ensure your API mock extension performs optimally.

Rule Priority Management

When you have multiple mock rules that might overlap, understanding and properly implementing rule priority becomes crucial. The declarativeNetRequest API processes rules in order of their priority, with higher priority rules being evaluated first. Ensure your UI allows developers to reorder rules or set explicit priorities to avoid unexpected behavior.

Error Handling and Fallbacks

Robust error handling ensures your extension doesn't break the browser's normal functionality when something goes wrong. Always wrap your rule application logic in try-catch blocks, and provide clear error messages to users when their mock configurations are invalid.

Memory Management

Service workers in Chrome extensions are ephemeral and can be terminated after periods of inactivity. Design your extension to persist state properly and reinitialize correctly when the service worker wakes up. Avoid storing large amounts of data in memory, and rely on chrome.storage for persistence.

Security Considerations

When intercepting network requests, you're handling potentially sensitive data. Ensure your extension follows security best practices: validate all user inputs, don't log sensitive headers or authentication tokens by default, and consider adding options for developers to exclude certain domains from mocking.

---

Conclusion and Next Steps {#conclusion}

Building a local API mock Chrome extension is an excellent project that teaches you valuable skills in Chrome extension development while providing a practical tool that can significantly improve your development workflow. The foundation we've built in this guide can be extended in countless ways based on your specific needs.

From here, consider adding features like mock import/export functionality to share configurations with team members, integrating with Swagger or OpenAPI specifications to auto-generate mocks, or building a visual response editor with syntax highlighting. The Chrome extension platform provides powerful APIs that make sophisticated functionality possible directly in the browser.

Remember to test your extension thoroughly across different scenarios, including edge cases with various URL patterns, HTTP methods, and response types. With proper testing and iterative improvement, you'll have a valuable addition to your developer toolkit that can save countless hours of development time.
