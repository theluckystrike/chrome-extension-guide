---
layout: post
title: "Build a Request Blocker Chrome Extension: Complete Developer Guide 2025"
description: "Learn how to build a powerful request blocker Chrome extension from scratch. Master the Declarative Net Request API, implement URL blocking, create network filters, and publish your extension to the Chrome Web Store."
date: 2025-01-27
categories: [Chrome-Extensions]
tags: [chrome-extension, developer-tools]
keywords: "request blocker extension, block url chrome, network filter extension, chrome extension blocking, declarative net request"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/27/build-request-blocker-chrome-extension/"
---

# Build a Request Blocker Chrome Extension: Complete Developer Guide 2025

The internet is filled with trackers, advertisements, and unwanted network requests that can slow down your browsing experience and compromise your privacy. Building a request blocker Chrome extension is one of the most valuable skills you can develop as a Chrome extension developer. Not only does this type of extension address real user pain points, but it also provides deep insights into how Chrome's network filtering system works under the hood.

In this comprehensive guide, we will walk you through the entire process of creating a fully functional request blocker extension. From understanding the underlying APIs to implementing advanced filtering rules, from designing an intuitive user interface to publishing your extension on the Chrome Web Store—this guide covers everything you need to know to build a production-ready network filter extension in 2025.

---

## Understanding Request Blocking in Chrome Extensions {#understanding-request-blocking}

Before we dive into code, it is essential to understand how request blocking works in the Chrome extension ecosystem. Modern Chrome extensions must use the Declarative Net Request API, which was introduced as part of Manifest V3 to improve performance and user privacy.

### The Evolution from WebRequest to Declarative Net Request

In the early days of Chrome extensions, developers used the `chrome.webRequest` API to intercept and modify network requests. This API provided powerful capabilities but had significant drawbacks. It required extensive permissions, could only block requests asynchronously, and imposed performance overhead on every network request.

The Declarative Net Request API represents a paradigm shift. Instead of intercepting each request programmatically, you define static rules in a JSON format. Chrome's network stack evaluates these rules internally, resulting in minimal performance impact. This approach also enhances user privacy by preventing extension developers from accessing user browsing data.

### How Declarative Net Request Works

The Declarative Net Request API operates through a rule-based system. You define rules in JSON files that specify which requests to block, redirect, or modify. When a network request is made, Chrome's internal engine matches it against your rules and takes the specified action.

The key components of this system include:

1. **Rule Sets**: Collections of rules organized by purpose
2. **Rule Conditions**: Patterns that match against request URLs
3. **Rule Actions**: What to do when a condition is met (block, redirect, modify headers)
4. **Priority**: How to handle conflicting rules

Understanding these components is crucial for building an effective request blocker extension. The system is designed to be declarative—you specify what you want to happen, and Chrome handles the implementation efficiently.

---

## Setting Up Your Development Environment {#development-environment}

Every Chrome extension project begins with a well-organized development environment. Let us set up the foundation for our request blocker extension.

### Creating the Project Structure

Create a new directory for your extension and set up the essential files. A typical request blocker extension includes the following structure:

```
request-blocker/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── rules/
│   └── rules.json
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── _locales/
    └── en/
        └── messages.json
```

This structure separates concerns effectively. The manifest declares permissions and capabilities, background scripts handle rule management, the popup provides user interface, and the rules directory stores your filtering logic.

### Configuring the Manifest

The manifest.json file is the heart of your extension. For a request blocker using Declarative Net Request, you need specific permissions and configuration:

```json
{
  "manifest_version": 3,
  "name": "Request Blocker Pro",
  "version": "1.0.0",
  "description": "Block unwanted network requests and trackers",
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
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

Pay special attention to the permissions. The `declarativeNetRequest` permission is required for basic blocking, while `declarativeNetRequestWithHostAccess` allows you to modify headers for specific hosts. The `storage` permission enables you to save user preferences and custom rules.

---

## Implementing the Core Blocking Logic {#core-blocking-logic}

Now we come to the heart of our request blocker extension—the background script that manages rules and handles the blocking logic.

### Setting Up Static Rules

Static rules are defined in JSON files and loaded when the extension installs. Create a rules.json file in your rules directory:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": ".*doubleclick\\.net.*",
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
      "urlFilter": ".*google-analytics\\.com.*",
      "resourceTypes": ["script", "ping"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": ".*facebook\\.com/tr.*",
      "resourceTypes": ["script", "image"]
    }
  }
]
```

Each rule consists of three main parts. The `id` is a unique identifier for the rule. The `priority` determines which rule takes precedence when multiple rules match. The `action` specifies what to do—block, allow, redirect, or modify headers. The `condition` defines which requests the rule applies to using URL patterns and resource types.

### Managing Rules in the Background Script

The background script handles loading and managing rules. Here is a comprehensive implementation:

```javascript
// background.js
const RULES_FILE = 'rules/rules.json';

// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Load and update rules
    const response = await fetch(chrome.runtime.getURL(RULES_FILE));
    const rules = await response.json();
    
    // Update the declarative net request rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: rules.map(rule => rule.id)
    });
    
    console.log('Request Blocker: Rules loaded successfully');
  } catch (error) {
    console.error('Failed to load rules:', error);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStats') {
    // Return blocking statistics
    chrome.declarativeNetRequest.getStats()
      .then(stats => sendResponse({ stats }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (message.action === 'toggleRule') {
    handleRuleToggle(message.ruleId, message.enabled)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

// Toggle individual rules on or off
async function handleRuleToggle(ruleId, enabled) {
  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleToModify = currentRules.find(rule => rule.id === ruleId);
  
  if (!ruleToModify) {
    return { success: false, error: 'Rule not found' };
  }
  
  if (enabled) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [ruleToModify]
    });
  } else {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId]
    });
  }
  
  return { success: true };
}
```

This background script loads your rules when the extension installs, provides statistics about blocked requests, and allows users to toggle individual rules on or off through the popup interface.

---

## Creating the User Interface {#user-interface}

A request blocker extension needs an intuitive interface that allows users to manage their blocking preferences without technical knowledge.

### Building the Popup HTML

The popup provides quick access to essential features. Create a clean, functional interface:

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Blocker</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Request Blocker</h1>
      <div class="stats">
        <span id="blocked-count">0</span> requests blocked
      </div>
    </header>
    
    <main>
      <section class="quick-actions">
        <button id="toggle-all" class="btn primary">
          Pause All Blocking
        </button>
      </section>
      
      <section class="rule-categories">
        <h2>Blocking Categories</h2>
        <div class="category">
          <label>
            <input type="checkbox" data-category="ads" checked>
            <span>Advertisements</span>
          </label>
          <span class="count">12 rules</span>
        </div>
        <div class="category">
          <label>
            <input type="checkbox" data-category="trackers" checked>
            <span>Trackers</span>
          </label>
          <span class="count">8 rules</span>
        </div>
        <div class="category">
          <label>
            <input type="checkbox" data-category="social" checked>
            <span>Social Media Widgets</span>
          </label>
          <span class="count">5 rules</span>
        </div>
      </section>
      
      <section class="custom-rules">
        <h2>Add Custom Rule</h2>
        <form id="add-rule-form">
          <input type="text" id="url-pattern" placeholder="URL pattern (e.g., *.example.com)" required>
          <select id="action-type">
            <option value="block">Block</option>
            <option value="allow">Allow</option>
          </select>
          <button type="submit" class="btn secondary">Add Rule</button>
        </form>
      </section>
    </main>
    
    <footer>
      <a href="#" id="open-options">Options</a>
      <span class="version">v1.0.0</span>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### Styling the Popup

Make the popup visually appealing and easy to use:

```css
/* popup/popup.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  background: #f5f5f5;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 18px;
  color: #333;
  margin-bottom: 8px;
}

.stats {
  font-size: 14px;
  color: #666;
}

#blocked-count {
  font-weight: bold;
  color: #4CAF50;
}

section {
  margin-bottom: 20px;
}

h2 {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.primary {
  background: #4CAF50;
  color: white;
}

.primary:hover {
  background: #45a049;
}

.secondary {
  background: #2196F3;
  color: white;
}

.secondary:hover {
  background: #1976D2;
}

.category {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
}

.category label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.category .count {
  font-size: 12px;
  color: #999;
}

#add-rule-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#add-rule-form input,
#add-rule-form select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

footer a {
  color: #666;
  text-decoration: none;
}
```

### Implementing Popup Logic

Connect the UI to the background script:

```javascript
// popup/popup.js
document.addEventListener('DOMContentLoaded', () => {
  // Load blocking statistics
  updateStats();
  
  // Set up event listeners
  document.getElementById('toggle-all').addEventListener('click', toggleAll);
  
  document.querySelectorAll('[data-category]').forEach(checkbox => {
    checkbox.addEventListener('change', handleCategoryChange);
  });
  
  document.getElementById('add-rule-form').addEventListener('submit', handleAddRule);
  
  document.getElementById('open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});

async function updateStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    if (response.stats) {
      document.getElementById('blocked-count').textContent = 
        response.stats.blockedRequestCount || 0;
    }
  } catch (error) {
    console.error('Failed to get stats:', error);
  }
}

async function toggleAll() {
  const button = document.getElementById('toggle-all');
  const isPaused = button.classList.contains('paused');
  
  // Toggle logic would communicate with background script
  // to enable or disable all rules
  if (isPaused) {
    button.textContent = 'Pause All Blocking';
    button.classList.remove('paused');
  } else {
    button.textContent = 'Resume Blocking';
    button.classList.add('paused');
  }
}

function handleCategoryChange(event) {
  const category = event.target.dataset.category;
  const enabled = event.target.checked;
  
  // Send message to background to update category rules
  chrome.runtime.sendMessage({
    action: 'toggleCategory',
    category,
    enabled
  });
}

async function handleAddRule(event) {
  event.preventDefault();
  
  const urlPattern = document.getElementById('url-pattern').value;
  const actionType = document.getElementById('action-type').value;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'addCustomRule',
      rule: {
        urlFilter: urlPattern,
        action: actionType
      }
    });
    
    if (response.success) {
      document.getElementById('url-pattern').value = '';
      alert('Rule added successfully!');
    }
  } catch (error) {
    alert('Failed to add rule: ' + error.message);
  }
}
```

---

## Advanced Filtering Techniques {#advanced-filtering}

Now that you have the basic blocking working, let us explore advanced filtering capabilities that will make your extension stand out.

### Domain-Specific Blocking

Sometimes you want to block requests only on specific domains. The Declarative Net Request API supports `initiatorDomains` and `requestDomains` conditions:

```javascript
{
  "id": 10,
  "priority": 1,
  "action": {
    "type": "block"
  },
  "condition": {
    "urlFilter": ".*",
    "resourceTypes": ["script"],
    "initiatorDomains": ["example.com", "news-site.com"]
  }
}
```

This rule blocks all scripts loaded by example.com and news-site.com, regardless of where the scripts are hosted.

### Regex Patterns for Advanced Matching

For complex filtering, you can use regex patterns. Chrome supports RE2 regular expressions for efficient pattern matching:

```javascript
{
  "id": 11,
  "priority": 1,
  "action": {
    "type": "block"
  },
  "condition": {
    "urlFilter": "^https?://([^/]+\\.)?tracker[0-9]*\\.(com|net|org)",
    "regexFilter": "^https?://([^/]+\\.)?tracker[0-9]*\\.(com|net|org)",
    "resourceTypes": ["script", "image"]
  }
}
```

### Redirecting Requests

Beyond blocking, you can redirect unwanted requests to safe URLs or local resources:

```javascript
{
  "id": 12,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": {
      "url": "data:text/plain,Blocked"
    }
  },
  "condition": {
    "urlFilter": ".*ads\\.com/tracking.*"
  }
}
```

This is particularly useful for redirecting tracking pixels to transparent placeholder images or empty responses.

### Modifying Request Headers

The Declarative Net Request API allows you to modify request and response headers:

```javascript
{
  "id": 13,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [
      { "header": "Referer", "operation": "remove" },
      { "header": "X-Do-Not-Track", "operation": "set", "value": "1" }
    ]
  },
  "condition": {
    "urlFilter": ".*",
    "resourceTypes": ["xmlhttprequest", "script"]
  }
}
```

This is powerful for enhancing privacy by removing or modifying tracking headers.

---

## Publishing Your Extension {#publishing}

Once your request blocker extension is working, it is time to share it with the world through the Chrome Web Store.

### Preparing for Publication

Before publishing, ensure you have completed these steps:

1. **Test thoroughly**: Test your extension across different websites and scenarios
2. **Create icons**: Prepare 16x16, 48x48, and 128x128 pixel icons
3. **Write a compelling description**: Explain features and benefits clearly
4. **Set up a developer account**: Create a Google Developer account ($5 one-time fee)
5. **Take screenshots**: Capture the popup and any settings pages

### Creating the Store Listing

Your store listing is crucial for discoverability. Include relevant keywords naturally in your description. Focus on the benefits users will experience—faster browsing, enhanced privacy, reduced data usage.

### Handling Reviews

The Chrome Web Store review team will evaluate your extension for policy compliance. For request blockers, ensure you:

- Clearly explain what data your extension accesses and why
- Do not include deceptive functionality
- Provide a working user interface
- Follow all Chrome Web Store policies

---

## Conclusion {#conclusion}

Building a request blocker Chrome extension is a rewarding project that teaches you valuable skills in Chrome extension development, network request handling, and user interface design. The Declarative Net Request API provides a powerful yet efficient way to filter network traffic, and understanding this API opens doors to many other types of extensions.

In this guide, you have learned how to set up a proper development environment, implement core blocking logic with static and dynamic rules, create an intuitive user interface, apply advanced filtering techniques, and publish your extension to the Chrome Web Store.

The demand for privacy-focused extensions continues to grow, and a well-built request blocker can serve thousands or even millions of users. Take the concepts in this guide, experiment with your own filtering rules, and build something that makes the internet a better place for everyone.

Remember to keep your rules updated as new trackers and广告 networks emerge. Consider adding automatic update functionality to your extension to push new rules to users without requiring manual updates. With the foundation you have built in this guide, you are well-equipped to create a professional-quality request blocker extension that can compete with established alternatives in the Chrome Web Store.
