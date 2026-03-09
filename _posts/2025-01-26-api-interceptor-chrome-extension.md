---
layout: post
title: "Build an API Request Interceptor Chrome Extension"
description: "Learn how to build a powerful API request interceptor Chrome extension from scratch. This comprehensive guide covers the DeclarativeNetRequest API, webRequest API for older Manifest versions, request modification, header injection, and practical implementation examples for intercepting and modifying HTTP requests in Chrome extensions."
date: 2025-01-26
categories: [Chrome Extensions, API Guide, Development Tutorial]
tags: [api-interceptor, http-requests, network, declarativeNetRequest, manifest-v3]
keywords: "api interceptor extension, http request modifier chrome, request interceptor extension, chrome extension network interception, modify http requests chrome extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/26/api-interceptor-chrome-extension/"
---

# Build an API Request Interceptor Chrome Extension

API request interception represents one of the most valuable capabilities available to Chrome extension developers. Whether you need to debug API calls, modify request headers for testing, simulate different server responses, or build developer tools, understanding how to intercept and manipulate HTTP requests is essential. This comprehensive guide walks you through building a complete API request interceptor extension using modern Chrome extension APIs.

---

## Understanding API Interception in Chrome Extensions {#understanding-api-interception}

Chrome extensions can intercept, analyze, and modify network requests through several APIs, each with different capabilities and limitations. The primary approaches include the DeclarativeNetRequest API for Manifest V3 extensions, the Web Request API for legacy extensions, and content script-based interception for specific page-level scenarios.

The DeclarativeNetRequest API serves as the modern, privacy-focused approach to network request manipulation. It uses a declarative rule-based system where you define rules in JSON format, and Chrome evaluates these rules internally without exposing sensitive request data to your extension code. This approach provides excellent privacy guarantees while maintaining powerful request blocking and modification capabilities.

The Web Request API offers more granular control over network requests, allowing you to observe, block, or modify requests in flight with full access to request and response details. However, due to privacy concerns, Google restricted this API in Manifest V3, requiring specific justification for its use in extensions published to the Chrome Web Store.

For most use cases, DeclarativeNetRequest provides the best balance of functionality and compliance. However, understanding both APIs enables you to choose the right approach for your specific requirements.

---

## Setting Up Your Extension Project {#setting-up-project}

Before implementing API interception functionality, you need to set up a proper Chrome extension project structure. Create a new directory for your extension and add the necessary configuration files.

### Project Structure

Create the following directory structure for your API interceptor extension:

```
api-interceptor/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   └── popup.js
├── rules/
│   └── rules.json
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Manifest Configuration

Your manifest.json defines the extension's permissions and capabilities. For API interception, you need to declare the appropriate permissions:

```json
{
  "manifest_version": 3,
  "name": "API Request Interceptor",
  "version": "1.0",
  "description": "Intercept and modify HTTP requests with ease",
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
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
    "service_worker": "background.js"
  }
}
```

The `declarativeNetRequestWithHostAccess` permission allows your extension to modify requests to websites while maintaining the privacy benefits of the declarative approach. The `storage` permission enables saving user preferences and interception rules between sessions.

---

## Implementing the DeclarativeNetRequest API {#implementing-declarative-net-request}

DeclarativeNetRequest uses a rule-based system where you define conditions and actions. Rules are evaluated by Chrome internally, ensuring that sensitive request data remains private while still enabling powerful request manipulation.

### Understanding Rule Structure

Each rule consists of an ID, priority, action, and condition. The condition determines when the rule applies, while the action defines what happens when conditions are met:

```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [
      { "header": "X-Custom-Header", "operation": "set", "value": "intercepted" }
    ]
  },
  "condition": {
    "urlFilter": "api.example.com",
    "resourceTypes": ["xmlhttprequest", "fetch"]
  }
}
```

### Creating Interception Rules

Create a rules/rules.json file with various rule types to demonstrate different interception capabilities:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": ".*analytics\\.tracker\\.com.*",
      "resourceTypes": ["script", "image", "beacon"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "X-Debug-Mode", "operation": "set", "value": "true" },
        { "header": "X-Request-Interceptor", "operation": "set", "value": "active" }
      ]
    },
    "condition": {
      "urlFilter": ".*api\\.example\\.com/.*",
      "resourceTypes": ["xmlhttprequest", "fetch"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "url": "https://api.staging.example.com/alternative"
      }
    },
    "condition": {
      "urlFilter": ".*api\\.production\\.example\\.com/.*",
      "resourceTypes": ["xmlhttprequest", "fetch"]
    }
  },
  {
    "id": 4,
    "priority": 1,
    "action": {
      "type": "allow"
    },
    "condition": {
      "urlFilter": ".*api\\.example\\.com/health.*",
      "resourceTypes": ["xmlhttprequest"]
    }
  }
]
```

These rules demonstrate four fundamental interception capabilities: blocking unwanted requests, modifying request headers, redirecting requests to different URLs, and allowing specific requests to bypass other rules.

---

## Implementing the Background Service Worker {#background-service-worker}

The background service worker handles rule management and communicates with other extension components. It loads rules on startup, allows dynamic rule updates, and provides an interface for the popup to manage interception settings.

### Background Script Implementation

Create the background.js file with comprehensive rule management functionality:

```javascript
// background.js - Service Worker for API Request Interceptor

const RULE_FILE = 'rules/rules.json';
let currentRules = [];
let isInterceptionEnabled = true;

// Load and update rules when the extension starts
chrome.runtime.onInstalled.addListener(async () => {
  console.log('API Interceptor extension installed');
  await loadRules();
});

// Load rules from the rules file
async function loadRules() {
  try {
    const response = await fetch(chrome.runtime.getURL(RULE_FILE));
    const rules = await response.json();
    await updateRules(rules);
  } catch (error) {
    console.error('Failed to load rules:', error);
  }
}

// Update declarativeNetRequest rules
async function updateRules(rules) {
  try {
    // First, remove any existing rules
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: currentRules.map(r => r.id)
    });
    
    // Then add new rules
    if (isInterceptionEnabled && rules.length > 0) {
      await chrome.declarativeNetRequest.updateSessionRules({
        addRules: rules
      });
      currentRules = rules;
    }
    
    console.log(`Loaded ${rules.length} interception rules`);
    return { success: true, ruleCount: rules.length };
  } catch (error) {
    console.error('Failed to update rules:', error);
    return { success: false, error: error.message };
  }
}

// Toggle interception on/off
async function toggleInterception(enabled) {
  isInterceptionEnabled = enabled;
  
  if (enabled) {
    await updateRules(currentRules);
  } else {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: currentRules.map(r => r.id)
    });
  }
  
  // Notify popup of state change
  chrome.runtime.sendMessage({
    type: 'INTERCEPTION_STATE_CHANGED',
    enabled: isInterceptionEnabled
  });
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE':
      sendResponse({
        enabled: isInterceptionEnabled,
        ruleCount: currentRules.length
      });
      break;
      
    case 'UPDATE_RULES':
      updateRules(message.rules).then(result => sendResponse(result));
      return true; // Keep channel open for async response
      
    case 'TOGGLE_INTERCEPTION':
      toggleInterception(message.enabled).then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'GET_MATCHED_REQUESTS':
      // Query recent matched requests (Manifest V3 feature)
      chrome.declarativeNetRequest.getMatchedRules({
        URLFilter: message.urlFilter || undefined
      }).then(result => {
        sendResponse({ rules: result.rules });
      });
      return true;
  }
});

// Log rule matching events for debugging (requires declarativeNetRequestFeedback)
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  console.log('Rule matched:', info);
  
  // Store matched requests for display in popup
  chrome.storage.local.get(['matchedRequests'], (result) => {
    const requests = result.matchedRequests || [];
    requests.unshift({
      timestamp: Date.now(),
      url: info.request.url,
      ruleId: info.rule.ruleId
    });
    
    // Keep only last 100 matched requests
    const trimmed = requests.slice(0, 100);
    chrome.storage.local.set({ matchedRequests: trimmed });
  });
});
```

This background service worker provides comprehensive rule management, state toggling, and matched request logging capabilities.

---

## Building the Popup Interface {#popup-interface}

The popup provides users with a graphical interface to manage interception rules and view matched requests.

### Popup HTML

Create the popup/popup.html file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Interceptor</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 350px;
      padding: 16px;
      background: #f5f5f5;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .header h1 {
      font-size: 16px;
      color: #333;
    }
    
    .toggle-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .toggle-label {
      font-size: 12px;
      color: #666;
    }
    
    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
    }
    
    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.3s;
      border-radius: 24px;
    }
    
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
    
    .toggle input:checked + .toggle-slider {
      background-color: #4CAF50;
    }
    
    .toggle input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }
    
    .section {
      background: white;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .section h2 {
      font-size: 14px;
      color: #333;
      margin-bottom: 12px;
    }
    
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .stat {
      text-align: center;
      padding: 8px;
      background: #f9f9f9;
      border-radius: 6px;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #4CAF50;
    }
    
    .stat-label {
      font-size: 11px;
      color: #666;
    }
    
    .matched-list {
      max-height: 200px;
      overflow-y: auto;
    }
    
    .matched-item {
      padding: 8px;
      border-bottom: 1px solid #eee;
      font-size: 11px;
    }
    
    .matched-item:last-child {
      border-bottom: none;
    }
    
    .matched-url {
      color: #333;
      word-break: break-all;
    }
    
    .matched-time {
      color: #999;
      font-size: 10px;
    }
    
    .empty-state {
      text-align: center;
      color: #999;
      padding: 20px;
      font-size: 12px;
    }
    
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #e8f5e9;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4CAF50;
    }
    
    .status.inactive {
      background: #ffebee;
    }
    
    .status.inactive .status-dot {
      background: #f44336;
    }
    
    .status-text {
      font-size: 12px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>API Request Interceptor</h1>
    <div class="toggle-container">
      <span class="toggle-label">Active</span>
      <label class="toggle">
        <input type="checkbox" id="interceptionToggle" checked>
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>
  
  <div class="status" id="status">
    <div class="status-dot"></div>
    <span class="status-text" id="statusText">Interception Active</span>
  </div>
  
  <div class="section">
    <h2>Statistics</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-value" id="ruleCount">0</div>
        <div class="stat-label">Active Rules</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="matchedCount">0</div>
        <div class="stat-label">Matched Requests</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>Recent Matched Requests</h2>
    <div class="matched-list" id="matchedList">
      <div class="empty-state">No requests intercepted yet</div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Popup JavaScript

Create the popup/popup.js file to handle user interactions:

```javascript
// popup.js - Popup script for API Interceptor

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('interceptionToggle');
  const status = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const ruleCount = document.getElementById('ruleCount');
  const matchedCount = document.getElementById('matchedCount');
  const matchedList = document.getElementById('matchedList');
  
  // Load initial state
  async function loadState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      
      toggle.checked = response.enabled;
      ruleCount.textContent = response.ruleCount;
      
      updateStatus(response.enabled);
      await loadMatchedRequests();
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }
  
  // Update status display
  function updateStatus(enabled) {
    if (enabled) {
      status.classList.remove('inactive');
      statusText.textContent = 'Interception Active';
    } else {
      status.classList.add('inactive');
      statusText.textContent = 'Interception Disabled';
    }
  }
  
  // Load matched requests from storage
  async function loadMatchedRequests() {
    try {
      const result = await chrome.storage.local.get(['matchedRequests']);
      const requests = result.matchedRequests || [];
      
      matchedCount.textContent = requests.length;
      
      if (requests.length === 0) {
        matchedList.innerHTML = '<div class="empty-state">No requests intercepted yet</div>';
        return;
      }
      
      matchedList.innerHTML = requests.map(req => `
        <div class="matched-item">
          <div class="matched-url">${escapeHtml(req.url)}</div>
          <div class="matched-time">${formatTime(req.timestamp)}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load matched requests:', error);
    }
  }
  
  // Toggle interception
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    
    try {
      await chrome.runtime.sendMessage({
        type: 'TOGGLE_INTERCEPTION',
        enabled: enabled
      });
      
      updateStatus(enabled);
    } catch (error) {
      console.error('Failed to toggle interception:', error);
      toggle.checked = !enabled;
    }
  });
  
  // Utility functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }
  
  // Initialize
  await loadState();
  
  // Refresh matched requests periodically
  setInterval(loadMatchedRequests, 2000);
});
```

---

## Advanced Interception Techniques {#advanced-techniques}

Beyond basic request blocking and header modification, you can implement more sophisticated interception patterns for complex use cases.

### Dynamic Rule Generation

For applications requiring runtime rule generation based on user configuration, implement dynamic rule creation in your background script:

```javascript
// Dynamic rule generation based on user configuration
async function generateDynamicRules(config) {
  const rules = [];
  let ruleId = 1;
  
  // Generate blocking rules for blacklisted domains
  config.blockedDomains.forEach(domain => {
    rules.push({
      id: ruleId++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `.*${escapeRegex(domain)}.*`,
        resourceTypes: ['script', 'image', 'sub_frame', 'xmlhttprequest']
      }
    });
  });
  
  // Generate header modification rules
  config.headerModifications.forEach(mod => {
    rules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: mod.header, operation: mod.operation, value: mod.value }
        ]
      },
      condition: {
        urlFilter: mod.urlPattern,
        resourceTypes: ['xmlhttprequest', 'fetch']
      }
    });
  });
  
  // Generate redirect rules
  config.redirects.forEach(redirect => {
    rules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: redirect.to }
      },
      condition: {
        urlFilter: redirect.from,
        resourceTypes: ['xmlhttprequest', 'fetch', 'main_frame']
      }
    });
  });
  
  return rules;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### Request and Response Logging

Implement comprehensive logging for debugging and analytics:

```javascript
// Enhanced logging with request/response details
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async (info) => {
  const logEntry = {
    timestamp: Date.now(),
    request: {
      url: info.request.url,
      method: info.request.method,
      type: info.request.type,
      frameId: info.request.frameId,
      tabId: info.request.tabId
    },
    matchedRule: {
      id: info.rule.ruleId,
      priority: info.rule.priority
    }
  };
  
  // Store log entry
  const result = await chrome.storage.local.get(['requestLogs']);
  const logs = result.requestLogs || [];
  logs.unshift(logEntry);
  
  // Keep last 500 log entries
  const trimmed = logs.slice(0, 500);
  await chrome.storage.local.set({ requestLogs: trimmed });
  
  // Notify popup if open
  chrome.runtime.sendMessage({
    type: 'NEW_REQUEST_LOG',
    entry: logEntry
  });
});
```

### Using Web Request API for Complex Scenarios

For scenarios requiring access to request bodies or response content, you may need to use the Web Request API with appropriate manifest declarations:

```json
{
  "permissions": [
    "webRequest",
    "webRequestBlocking"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

```javascript
// Web Request API implementation for complex interception
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Analyze request body if available
    if (details.requestBody) {
      console.log('Request body:', details.requestBody);
    }
    
    // Redirect based on conditions
    if (shouldRedirect(details.url)) {
      return {
        redirectUrl: getRedirectUrl(details.url)
      };
    }
    
    // Block specific requests
    if (shouldBlock(details.url)) {
      return { cancel: true };
    }
  },
  {
    urls: ['<all_urls>'],
    types: ['xmlhttprequest', 'fetch']
  },
  ['requestBody', 'blocking']
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Modify headers
    const requestHeaders = details.requestHeaders || [];
    
    // Add custom header
    requestHeaders.push({
      name: 'X-Interception-Active',
      value: 'true'
    });
    
    // Remove headers
    const filtered = requestHeaders.filter(
      h => h.name !== 'X-Removed-Header'
    );
    
    return { requestHeaders: filtered };
  },
  {
    urls: ['<all_urls>']
  },
  ['requestHeaders', 'blocking']
);
```

---

## Testing Your Extension {#testing}

Proper testing ensures your interceptor works correctly across different scenarios.

### Loading Your Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked" and select your extension directory
4. The extension icon should appear in your toolbar

### Testing Interception Rules

Use the following approach to verify your rules work correctly:

```javascript
// Test your extension programmatically
async function testInterception() {
  // 1. Check if rules are loaded
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  console.log('Loaded rules:', rules);
  
  // 2. Enable interception
  await chrome.runtime.sendMessage({
    type: 'TOGGLE_INTERCEPTION',
    enabled: true
  });
  
  // 3. Make a test request
  const testUrl = 'https://api.example.com/test';
  await fetch(testUrl);
  
  // 4. Check matched requests
  const matched = await chrome.declarativeNetRequest.getMatchedRules({});
  console.log('Matched rules:', matched);
}
```

### Debugging Tips

When developing interception extensions, keep these debugging strategies in mind:

Use the Chrome DevTools Network panel to verify requests are being intercepted. Look for modified headers and blocked requests. The extension service worker console provides logging output from your background script. The chrome://extensions page shows any errors in your extension's background page. Use the Declarative Net Request Internals page (chrome://net-internals/#declarativeNet) to inspect rule evaluation.

---

## Best Practices and Considerations {#best-practices}

When building API interceptor extensions, follow these guidelines for optimal results.

### Permission Management

Request only the minimum permissions necessary for your extension's functionality. Use `declarativeNetRequestWithHostAccess` instead of broader permissions when possible. Clearly explain to users why your extension needs network access. Consider implementing optional host permissions for specific domains rather than requesting `<all_urls>` access.

### Performance Optimization

Keep your rule sets small and efficient. Use URL filters that are as specific as possible to reduce evaluation time. Avoid complex regex patterns that may slow down request processing. Consider using the `isUrlFilterCaseSensitive` option when appropriate.

### Privacy and Security

Never log or transmit sensitive user data without explicit consent. Store interception data locally rather than sending it to external servers. Implement user controls for what data gets logged. Provide clear privacy policies explaining data handling practices.

### User Experience

Provide clear visual feedback when interception is active. Allow users to easily enable and disable interception. Offer whitelisting for domains that should not be intercepted. Include undo functionality for destructive operations like rule deletion.

---

## Conclusion {#conclusion}

Building an API request interceptor Chrome extension provides powerful capabilities for developers and users alike. Through this guide, you have learned how to implement comprehensive request interception using the DeclarativeNetRequest API, create dynamic rule management systems, build user-friendly popup interfaces, and follow best practices for privacy and performance.

The techniques covered here enable you to build developer tools, API testing utilities, privacy enhancers, and content filters. As Chrome continues to evolve its extension platform, the declarative approach ensures your extensions remain compliant while maintaining robust functionality.

Experiment with the examples provided, extend them with additional features, and adapt them to your specific use cases. The foundation you have built understanding API interception will serve as a valuable skill for countless Chrome extension projects.
