---
layout: post
title: "Chrome Web Request API: Complete Guide to Network Interception in Extensions"
description: "Master the Chrome Web Request API and declarativeNetRequest for intercepting, blocking, and modifying network requests in your Chrome extensions. This comprehensive guide covers Manifest V3 compliance, rule-based filtering, and practical implementation examples for building powerful network control extensions."
date: 2025-01-17
categories: [Chrome-Extensions, API-Guide]
tags: [web-request, network, declarativeNetRequest, manifest-v3]
keywords: "chrome web request api, declarativeNetRequest guide, chrome extension network requests, block requests chrome extension, manifest v3 network interception"
canonical_url: "https://bestchromeextensions.com/2025/01/17/chrome-web-request-api-complete-guide/"
---

# Chrome Web Request API: Complete Guide to Network Interception in Extensions

Network interception represents one of the most powerful capabilities available to Chrome extension developers. Whether you are building an ad blocker, developer tool, privacy enhancer, or content filter, understanding how to intercept, analyze, and modify network requests is essential. This comprehensive guide explores the Chrome Web Request API and its Manifest V3 replacement, declarativeNetRequest, providing you with everything needed to build solid network control extensions.

---

Understanding Network Request Interception in Chrome Extensions {#understanding-network-interception}

Chrome extensions have historically provided two primary APIs for network request manipulation: the Web Request API and the declarativeNetRequest API. Understanding the differences between these APIs and when to use each is crucial for building modern, compliant extensions.

The Web Request API has been available since early Chrome versions and offers granular control over network requests. It allows extensions to observe, block, or modify requests in flight, providing detailed access to request headers, response headers, and request bodies. However, this power comes with significant privacy and security implications. Because Web Request can inspect all network traffic, including sensitive data like authentication tokens and personal information, Google restricted its use in Manifest V3 to protect user privacy.

The declarativeNetRequest API emerged as the privacy-focused replacement in Manifest V3. Instead of inspecting individual requests in real-time, extensions define declarative rules that Chrome evaluates internally. This approach prevents extensions from accessing sensitive request data while still enabling powerful request blocking and modification capabilities. For most use cases, declarativeNetRequest should be your default choice in modern extensions.

When to Use Each API

Choose the Web Request API when you need to perform complex, dynamic analysis of network traffic that cannot be expressed as static rules. This includes scenarios where you need to make blocking decisions based on request bodies, analyze response content in real-time, or implement sophisticated logging that requires access to full request and response details.

Choose declarativeNetRequest when you need to block or modify requests based on URL patterns, headers, or other attributes that can be expressed as rules. This API is ideal for ad blocking, content filtering, domain blocking, and header modification. It offers better performance, stronger privacy guarantees, and easier review processes for the Chrome Web Store.

---

The DeclarativeNetRequest API: Modern Network Control {#declarative-net-request}

DeclarativeNetRequest provides a rule-based system for blocking and modifying network requests. Extensions define rules in JSON format, and Chrome evaluates these rules internally without exposing request content to extension code. This architecture significantly improves user privacy while maintaining the effectiveness of network filtering.

Setting Up Your Manifest

Before implementing declarativeNetRequest functionality, you need proper manifest configuration. Your manifest.json must declare the declarativeNetRequest permission along with any host permissions for the URLs you intend to modify. Here is a complete manifest configuration example:

```json
{
  "manifest_version": 3,
  "name": "Network Request Controller",
  "version": "1.0",
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

The `declarativeNetRequestWithHostAccess` permission allows your extension to modify requests to websites while still maintaining the privacy benefits of the declarative approach. If you only need to block requests without accessing content, you can use the more restricted `declarativeNetRequest` permission alone.

Understanding Rule Structure

DeclarativeNetRequest rules follow a structured JSON format that defines conditions and actions. Each rule consists of an ID, priority, action, and condition. The condition determines when the rule applies, while the action defines what happens when conditions are met.

The primary rule types include:

Block rules prevent requests from being made entirely. When a request matches a block rule, Chrome cancels the request before it is sent, returning a simulated error to the page. This is useful for blocking ads, tracking scripts, or unwanted content.

Allow rules bypass other rules for matching requests. When a request matches an allow rule, Chrome proceeds with the request without evaluating other blocking rules. This enables whitelisting functionality.

Modify rules can add, remove, or modify request and response headers. This capability is essential for implementing features like cookie management, CORS modifications, or custom header injection.

Redirect rules send requests to different URLs. This powerful feature enables URL rewriting, domain forwarding, and sophisticated traffic routing.

Creating Your First Rules

Let us build a practical example that demonstrates blocking ads, allowing specific domains, and modifying headers. First, create a rules.json file in your extension directory:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "doubleclick.net",
      "resourceTypes": ["script", "image", "sub_frame"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "googlesyndication.com",
      "resourceTypes": ["script", "image"]
    }
  },
  {
    "id": 3,
    "priority": 2,
    "action": {
      "type": "allow"
    },
    "condition": {
      "urlFilter": "trusted-site.com",
      "resourceTypes": ["main_frame"]
    }
  },
  {
    "id": 4,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "X-Custom-Extension-Header", "operation": "set", "value": "extension-modified" }
      ]
    },
    "condition": {
      "urlFilter": "api.example.com",
      "resourceTypes": ["xmlhttprequest", "fetch"]
    }
  }
]
```

These rules demonstrate the four primary action types. The first two rules block common advertising domains, the third allows a trusted site to bypass blocking rules, and the fourth adds a custom header to API requests.

Loading Rules in Your Extension

To use these rules in your extension, you need to load them programmatically using the chrome.declarativeNetRequest API. Create a background service worker to manage rule loading:

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  // Load rules from rules.json
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: "doubleclick.net",
          resourceTypes: ["script", "image", "sub_frame"]
        }
      },
      {
        id: 2,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: "googlesyndication.com",
          resourceTypes: ["script", "image"]
        }
      },
      {
        id: 3,
        priority: 2,
        action: { type: "allow" },
        condition: {
          urlFilter: "trusted-site.com",
          resourceTypes: ["main_frame"]
        }
      },
      {
        id: 4,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "X-Custom-Extension-Header", operation: "set", value: "extension-modified" }
          ]
        },
        condition: {
          urlFilter: "api.example.com",
          resourceTypes: ["xmlhttprequest", "fetch"]
        }
      }
    ],
    removeRuleIds: []
  });
});
```

The updateDynamicRules method allows you to add and remove rules at runtime. This flexibility enables features like user-controlled allowlists, toggleable filters, and dynamic rule management based on user preferences.

---

The Web Request API: Legacy but Powerful {#web-request-api}

While declarativeNetRequest is the recommended approach for most use cases, the Web Request API remains relevant for specific scenarios requiring dynamic, fine-grained request analysis. Understanding this API helps when maintaining legacy extensions or when you genuinely need capabilities that declarativeNetRequest cannot provide.

Manifest V3 Restrictions

In Manifest V3, the Web Request API can only be used with the "blocking" option in the background service worker context. This means you cannot actively block or modify requests synchronously in the same way you could in Manifest V2. Instead, you must use the async pattern with Promises or callbacks.

Additionally, Web Request usage now requires host permissions that exactly match the URLs you intend to intercept. The `<all_urls>` wildcard is generally not approved for Web Request usage in the Chrome Web Store unless you can demonstrate a compelling need.

Implementing Web Request Listeners

When you genuinely need Web Request functionality, here is how to implement it properly in Manifest V3:

```javascript
// background.js - Manifest V3
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Analyze request and decide action
    if (shouldBlock(details.url)) {
      return { cancel: true };
    }
    // For modification, you need to use declarativeNetRequest instead
    return { requestHeaders: details.requestHeaders };
  },
  {
    urls: ["https://example.com/*"],
    types: ["script", "image"]
  },
  ["blocking", "requestHeaders"]
);
```

Note that the blocking option requires the webRequestBlocking permission in your manifest, and your extension will face additional review scrutiny for Chrome Web Store approval.

Use Cases Requiring Web Request

The Web Request API remains necessary for scenarios including request body inspection and modification, response body analysis, dynamic authentication token handling, and complex multi-step request transformation logic. For all other scenarios, declarativeNetRequest provides a cleaner, more privacy-preserving solution.

---

Advanced DeclarativeNetRequest Techniques {#advanced-techniques}

Mastering declarativeNetRequest requires understanding advanced features like rule priorities, resource type filtering, regex patterns, and rule set management.

Rule Priorities and Conflict Resolution

When multiple rules match a request, Chrome uses priority values to determine which action applies. Higher priority rules take precedence over lower priority ones. You can set priorities explicitly using the priority field in your rule definition:

```javascript
{
  "id": 10,
  "priority": 100,
  "action": { "type": "allow" },
  "condition": {
    "urlFilter": "important-resource.com",
    "resourceTypes": ["main_frame"]
  }
}
```

This system allows you to implement sophisticated rule layering, where general blocking rules can be overridden by specific allow rules with higher priorities.

Resource Type Filtering

The resourceTypes array in rule conditions determines which types of network requests a rule applies to. Chrome supports numerous resource types including main_frame, sub_frame, script, image, stylesheet, object, xmlhttprequest, ping, csp_report, media, websocket, and other. Proper resource type filtering ensures your rules apply only to relevant request types, improving both effectiveness and performance.

Regular Expression Matching

For complex URL patterns that cannot be expressed with simple wildcard matching, you can use regex filters:

```javascript
{
  "id": 20,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "regexFilter": ".*\\.ads\\..*",
    "resourceTypes": ["script", "image"]
  }
}
```

Regex patterns provide flexibility but come with performance considerations. Chrome must evaluate regex patterns for every request, so prefer simple URL filters when possible.

Static Rule Sets vs Dynamic Rules

DeclarativeNetRequest supports two types of rule sets: static rules defined in your extension package and dynamic rules added at runtime. Static rules are defined in the manifest and cannot be changed without updating the extension. Dynamic rules can be added, removed, or modified by your extension at any time.

Static rules are ideal for default filtering rules that ship with your extension, while dynamic rules enable user customization, preferences-based filtering, and runtime rule updates without extension updates.

---

Building a Complete Network Control Extension {#complete-example}

Let us build a practical extension that demonstrates comprehensive network control using declarativeNetRequest. This extension will block ads, allow user-specified domains, modify headers for debugging, and provide a simple UI for managing rules.

Project Structure

Create the following file structure:

```
network-controller/
 manifest.json
 background.js
 popup.html
 popup.js
 popup.css
 rules/
     default-rules.json
```

Complete Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Network Controller Pro",
  "version": "1.0",
  "description": "Control and filter network requests with ease",
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

Background Service Worker Implementation

```javascript
// background.js
const DEFAULT_BLOCK_RULES = [
  {
    id: 1,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "doubleclick.net", resourceTypes: ["script", "image", "sub_frame"] }
  },
  {
    id: 2,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "googlesyndication.com", resourceTypes: ["script", "image"] }
  },
  {
    id: 3,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "googleadservices.com", resourceTypes: ["script", "image"] }
  },
  {
    id: 4,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "analytics.google.com", resourceTypes: ["script"] }
  },
  {
    id: 5,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "facebook.net/tr.js", resourceTypes: ["script"] }
  }
];

// Initialize extension with default rules
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: DEFAULT_BLOCK_RULES,
    removeRuleIds: []
  });
  
  // Initialize storage for user preferences
  await chrome.storage.local.set({
    blockedCount: 0,
    allowedDomains: []
  });
});

// Track blocked requests for statistics
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  chrome.storage.local.get(['blockedCount'], (result) => {
    chrome.storage.local.set({ blockedCount: result.blockedCount + 1 });
  });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStats') {
    chrome.storage.local.get(['blockedCount'], (result) => {
      sendResponse({ blockedCount: result.blockedCount });
    });
    return true;
  }
  
  if (message.action === 'addAllowDomain') {
    addAllowDomain(message.domain);
    return true;
  }
});

async function addAllowDomain(domain) {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const maxId = rules.reduce((max, rule) => Math.max(max, rule.id), 0);
  
  const newRule = {
    id: maxId + 1,
    priority: 10,
    action: { type: "allow" },
    condition: {
      urlFilter: domain,
      resourceTypes: ["main_frame", "sub_frame", "script", "image", "stylesheet", "object", "xmlhttprequest", "fetch"]
    }
  };
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [newRule],
    removeRuleIds: []
  });
}
```

Popup Interface

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Network Controller</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Network Controller</h1>
    
    <div class="stats">
      <div class="stat-item">
        <span class="stat-label">Requests Blocked</span>
        <span class="stat-value" id="blockedCount">0</span>
      </div>
    </div>
    
    <div class="section">
      <h2>Quick Toggle</h2>
      <label class="toggle">
        <input type="checkbox" id="enableBlocking" checked>
        <span class="slider"></span>
        <span class="toggle-label">Enable Blocking</span>
      </label>
    </div>
    
    <div class="section">
      <h2>Add Allowed Domain</h2>
      <div class="input-group">
        <input type="text" id="domainInput" placeholder="example.com">
        <button id="addDomain">Allow</button>
      </div>
    </div>
    
    <div class="section">
      <button id="openOptions" class="secondary-btn">More Options</button>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Popup JavaScript

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // Load statistics
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    document.getElementById('blockedCount').textContent = response.blockedCount;
  });
  
  // Toggle blocking
  document.getElementById('enableBlocking').addEventListener('change', async (e) => {
    const isEnabled = e.target.checked;
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = rules.map(r => r.id);
    
    if (isEnabled) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: DEFAULT_BLOCK_RULES,
        removeRuleIds: []
      });
    } else {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }
  });
  
  // Add allowed domain
  document.getElementById('addDomain').addEventListener('click', () => {
    const domain = document.getElementById('domainInput').value.trim();
    if (domain) {
      chrome.runtime.sendMessage({ action: 'addAllowDomain', domain }, () => {
        document.getElementById('domainInput').value = '';
        alert(`Added ${domain} to allowed domains`);
      });
    }
  });
  
  // Open options
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});

const DEFAULT_BLOCK_RULES = [
  { id: 1, priority: 1, action: { type: "block" }, condition: { urlFilter: "doubleclick.net", resourceTypes: ["script", "image", "sub_frame"] } },
  { id: 2, priority: 1, action: { type: "block" }, condition: { urlFilter: "googlesyndication.com", resourceTypes: ["script", "image"] } },
  { id: 3, priority: 1, action: { type: "block" }, condition: { urlFilter: "googleadservices.com", resourceTypes: ["script", "image"] } },
  { id: 4, priority: 1, action: { type: "block" }, condition: { urlFilter: "analytics.google.com", resourceTypes: ["script"] } },
  { id: 5, priority: 1, action: { type: "block" }, condition: { urlFilter: "facebook.net/tr.js", resourceTypes: ["script"] } }
];
```

Popup Styles

```css
/* popup.css */
body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 16px;
  background: #f5f5f5;
}

.container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h1 {
  font-size: 18px;
  margin: 0 0 16px 0;
  color: #333;
}

h2 {
  font-size: 14px;
  margin: 0 0 12px 0;
  color: #666;
}

.stats {
  background: #e8f5e9;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #2e7d32;
  font-size: 13px;
}

.stat-value {
  color: #1b5e20;
  font-size: 20px;
  font-weight: bold;
}

.section {
  margin-bottom: 16px;
}

.toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle input {
  display: none;
}

.slider {
  width: 40px;
  height: 22px;
  background: #ccc;
  border-radius: 11px;
  position: relative;
  transition: 0.3s;
  margin-right: 10px;
}

.slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: 0.3s;
}

input:checked + .slider {
  background: #4caf50;
}

input:checked + .slider::before {
  transform: translateX(18px);
}

.toggle-label {
  font-size: 14px;
  color: #333;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-group input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.input-group button {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.input-group button:hover {
  background: #1976d2;
}

.secondary-btn {
  width: 100%;
  padding: 10px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.secondary-btn:hover {
  background: #e0e0e0;
}
```

---

Best Practices and Performance Optimization {#best-practices}

Building effective network control extensions requires attention to performance, privacy, and user experience. Follow these guidelines to create extensions that are both powerful and responsible.

Rule Optimization

Keep your rule set as small and specific as possible. Each rule Chrome evaluates adds overhead to request processing. Use resource type filtering to ensure rules only apply to relevant request types. Prefer URL filter patterns over regular expressions when possible, as regex matching is significantly slower.

Privacy Considerations

Always use declarativeNetRequest unless you have a compelling reason requiring Web Request. Never collect or transmit request data without explicit user consent. Be transparent about what your extension does and provide clear privacy policies.

User Experience

Provide visual feedback when requests are blocked or modified. Allow users to easily whitelist domains. Implement toggle controls so users can enable or disable functionality without uninstalling your extension.

Testing and Debugging

Chrome provides the chrome.declarativeNetRequest.onRuleMatchedDebug event for testing rule matching. Use this during development to verify your rules work as expected. The Chrome extension debugging console also provides valuable information about rule evaluation.

---

Conclusion {#conclusion}

The Chrome Web Request API and declarativeNetRequest provide powerful capabilities for intercepting and controlling network requests in Chrome extensions. By understanding when to use each API, implementing proper rule structures, and following best practices for privacy and performance, you can build sophisticated network control extensions that enhance user browsing experiences while maintaining compliance with Chrome Web Store policies and user privacy expectations.

For most modern extension projects, declarativeNetRequest should be your primary tool. Its privacy-preserving design, performance advantages, and simpler review process make it the clear choice for ad blocking, content filtering, and general network request manipulation. Reserve Web Request for scenarios that genuinely require dynamic request analysis that cannot be expressed through declarative rules.

With the techniques and examples in this guide, you have everything needed to start building powerful network control extensions that use the full potential of Chrome's extension platform.

---

Related Articles

- [Declarative Net Request API Complete Tutorial](/2025/01/18/declarative-net-request-api-complete-tutorial/) - Learn more about the declarativeNetRequest API with hands-on examples
- [Chrome Extension Cross-Origin Requests Guide](/2025/01/18/chrome-extension-cross-origin-requests-guide/) - Understanding CORS and cross-origin communication in extensions
- [Build Network Monitor Chrome Extension](/2025/01/20/build-network-monitor-chrome-extension/) - Build a practical extension for monitoring network requests

*Part of the [Chrome Extension Guide](https://bestchromeextensions.com/) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
