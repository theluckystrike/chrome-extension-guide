---
layout: post
title: "Build a User Agent Switcher Chrome Extension: Complete 2025 Guide"
description: "Learn how to build a user agent switcher extension for Chrome. This comprehensive guide covers device emulation, user agent strings, Manifest V3 implementation, and best practices for creating a powerful developer tool."
date: 2025-01-27
last_modified_at: 2025-01-27
categories: [Chrome-Extensions]
tags: [chrome-extension, developer-tools]
keywords: "user agent switcher extension, change user agent chrome, device emulator"
canonical_url: "https://bestchromeextensions.com/2025/01/27/build-user-agent-switcher-chrome-extension/"
---

Build a User Agent Switcher Chrome Extension: Complete 2025 Guide

User agent switching is one of the most valuable capabilities for web developers, QA testers, and digital marketers. Whether you need to test responsive designs across different devices, debug browser-specific issues, or verify how your website appears to various browsers, a user agent switcher extension provides the flexibility you need. we will walk you through building a fully functional user agent switcher Chrome extension using Manifest V3.

This guide assumes you have basic knowledge of HTML, CSS, and JavaScript. If you are new to Chrome extension development, you might want to review our [complete beginner's guide to Chrome extension development](/2025/01/16/chrome-extension-development-2025-complete-beginners-guide/) first.

---

Understanding User Agents and Why They Matter {#understanding-user-agents}

Before we dive into the code, let us understand what user agents are and why building a user agent switcher extension is a valuable skill.

What is a User Agent?

A user agent is a string of text that a web browser sends to web servers when requesting web pages. This string identifies the browser, its version, the operating system, and other technical details. Web servers use this information to:

- Serve appropriate content based on the browser type
- Implement browser-specific features
- Track analytics about visitor browsers
- Apply compatibility workarounds

The classic user agent string looks something like this:

```
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

This tells the server that the user is running Chrome 120 on macOS. By changing this string, you can make websites think you are using a different browser or device.

Why Build a User Agent Switcher Extension?

There are numerous practical applications for a user agent switcher extension:

1. Cross-browser testing: Test how your website looks in different browsers without actually installing them
2. Device emulation: Simulate mobile devices, tablets, and desktops to test responsive designs
3. Debugging: Reproduce browser-specific bugs by switching to affected browser user agents
4. API development: Test how your API handles requests from different client types
5. Competitive analysis: See how competitor websites present themselves to different browsers

Building this extension will teach you valuable skills including Chrome's declarative net request API, popup UI design, storage management, and background service worker communication.

---

Extension Architecture Overview {#architecture}

Our user agent switcher extension will consist of several components working together:

1. Manifest V3: Configuration file defining extension permissions and components
2. Popup UI: The interface users interact with to select user agents
3. Background Service Worker: Handles communication between components
4. Declarative Net Request Rules: Actually modifies the user agent on HTTP requests
5. Storage: Persists user preferences across sessions

Let us build each component step by step.

---

Step 1: Create the Manifest {#manifest}

The manifest file is the heart of every Chrome extension. For our user agent switcher, we need specific permissions to modify network requests.

```json
{
  "manifest_version": 3,
  "name": "User Agent Switcher",
  "version": "1.0.0",
  "description": "Switch between different user agents and device profiles for testing and development.",
  "permissions": [
    "storage",
    "declarativeNetRequest"
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
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The key permission here is `declarativeNetRequest`, which allows us to modify HTTP request headers. This is the modern, secure way to change user agents in Manifest V3. The older method of using the `webRequest` blocking API is no longer available for new extensions.

---

Step 2: Define User Agent Presets {#presets}

Before building the UI, let us create a comprehensive list of user agent presets. This data will be used by both the popup and the background script.

```javascript
// data/user-agents.js
export const userAgentPresets = [
  {
    id: 'chrome-desktop',
    name: 'Chrome on Desktop',
    category: 'Desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'Windows'
  },
  {
    id: 'firefox-desktop',
    name: 'Firefox on Desktop',
    category: 'Desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    platform: 'Windows'
  },
  {
    id: 'safari-mac',
    name: 'Safari on Mac',
    category: 'Desktop',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    platform: 'MacIntel'
  },
  {
    id: 'edge-desktop',
    name: 'Edge on Desktop',
    category: 'Desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    platform: 'Windows'
  },
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    category: 'Mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    platform: 'iPhone'
  },
  {
    id: 'iphone-15',
    name: 'iPhone 15',
    category: 'Mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
    platform: 'iPhone'
  },
  {
    id: 'pixel-8',
    name: 'Google Pixel 8',
    category: 'Mobile',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    platform: 'Linux'
  },
  {
    id: 'samsung-galaxy-s24',
    name: 'Samsung Galaxy S24',
    category: 'Mobile',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36',
    platform: 'Linux'
  },
  {
    id: 'ipad-pro',
    name: 'iPad Pro 12.9"',
    category: 'Tablet',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
    platform: 'iPad'
  },
  {
    id: 'android-tablet',
    name: 'Android Tablet',
    category: 'Tablet',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X800) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'Linux'
  },
  {
    id: 'bingbot',
    name: 'Bing Bot',
    category: 'Bots',
    userAgent: 'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    platform: 'Windows'
  },
  {
    id: 'googlebot',
    name: 'Google Bot',
    category: 'Bots',
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    platform: 'compatible'
  }
];
```

You can expand this list with additional presets for specific browser versions, older devices, or custom user agents specific to your testing needs.

---

Step 3: Build the Popup UI {#popup}

The popup is what users see when they click the extension icon. We will create a clean, intuitive interface for selecting user agents.

```html
<!-- popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Agent Switcher</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>User Agent Switcher</h1>
      <p class="status" id="status">Current: Default</p>
    </header>
    
    <div class="search-container">
      <input type="text" id="search" placeholder="Search user agents...">
    </div>
    
    <div class="tabs">
      <button class="tab-btn active" data-category="all">All</button>
      <button class="tab-btn" data-category="Desktop">Desktop</button>
      <button class="tab-btn" data-category="Mobile">Mobile</button>
      <button class="tab-btn" data-category="Tablet">Tablet</button>
      <button class="tab-btn" data-category="Bots">Bots</button>
    </div>
    
    <div class="user-agent-list" id="userAgentList">
      <!-- User agents will be populated here -->
    </div>
    
    <footer>
      <button class="btn-secondary" id="resetBtn">Reset to Default</button>
      <button class="btn-secondary" id="manageBtn">Manage Custom</button>
    </footer>
  </div>
  
  <script type="module" src="popup.js"></script>
</body>
</html>
```

Now let us add styling to make the popup look professional:

```css
/* popup.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 360px;
  min-height: 400px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
  margin-bottom: 4px;
}

.status {
  font-size: 12px;
  color: #666;
  padding: 6px 10px;
  background: #e8f0fe;
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-container {
  margin-bottom: 12px;
}

#search {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

#search:focus {
  border-color: #1a73e8;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 6px 12px;
  border: none;
  background: #fff;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #ddd;
}

.tab-btn:hover {
  background: #f0f0f0;
}

.tab-btn.active {
  background: #1a73e8;
  color: white;
  border-color: #1a73e8;
}

.user-agent-list {
  max-height: 280px;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.user-agent-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background 0.2s;
}

.user-agent-item:last-child {
  border-bottom: none;
}

.user-agent-item:hover {
  background: #f8f9fa;
}

.user-agent-item.active {
  background: #e8f0fe;
  border-left: 3px solid #1a73e8;
}

.user-agent-item h3 {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.user-agent-item .category {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

footer {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.btn-secondary {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

/* Custom scrollbar */
.user-agent-list::-webkit-scrollbar {
  width: 6px;
}

.user-agent-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.user-agent-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
```

---

Step 4: Implement Popup Logic {#popup-logic}

Now we need to write the JavaScript to handle user interactions in the popup:

```javascript
// popup.js
import { userAgentPresets } from './data/user-agents.js';

document.addEventListener('DOMContentLoaded', async () => {
  const userAgentList = document.getElementById('userAgentList');
  const searchInput = document.getElementById('search');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('resetBtn');
  
  let currentFilter = 'all';
  let searchQuery = '';
  let currentUserAgent = null;
  
  // Load current user agent from storage
  async function loadCurrentUserAgent() {
    const result = await chrome.storage.local.get('activeUserAgent');
    currentUserAgent = result.activeUserAgent || null;
    updateStatus();
  }
  
  // Update status display
  function updateStatus() {
    if (currentUserAgent) {
      const preset = userAgentPresets.find(u => u.id === currentUserAgent);
      statusEl.textContent = `Current: ${preset ? preset.name : 'Custom'}`;
    } else {
      statusEl.textContent = 'Current: Default';
    }
  }
  
  // Render user agent list
  function renderList(presets) {
    userAgentList.innerHTML = '';
    
    const filtered = presets.filter(preset => {
      const matchesCategory = currentFilter === 'all' || preset.category === currentFilter;
      const matchesSearch = preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           preset.userAgent.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
    
    if (filtered.length === 0) {
      userAgentList.innerHTML = '<div class="no-results">No matching user agents</div>';
      return;
    }
    
    filtered.forEach(preset => {
      const item = document.createElement('div');
      item.className = `user-agent-item ${currentUserAgent === preset.id ? 'active' : ''}`;
      item.innerHTML = `
        <h3>${preset.name}</h3>
        <span class="category">${preset.category}</span>
      `;
      
      item.addEventListener('click', () => selectUserAgent(preset));
      userAgentList.appendChild(item);
    });
  }
  
  // Select a user agent
  async function selectUserAgent(preset) {
    currentUserAgent = preset.id;
    await chrome.storage.local.set({ 
      activeUserAgent: preset.id,
      activeUserAgentString: preset.userAgent
    });
    
    // Update the declarative net request rule
    await updateNetRequestRule(preset);
    
    // Re-render to show active state
    renderList(userAgentPresets);
    updateStatus();
  }
  
  // Update the declarative net request rule
  async function updateNetRequestRule(preset) {
    const rules = [{
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'User-Agent', operation: 'set', value: preset.userAgent }
        ]
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']
      }
    }];
    
    try {
      // First, remove existing rules
      await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1] });
      
      // Then add the new rule
      await chrome.declarativeNetRequest.updateSessionRules({ addRules: rules });
    } catch (error) {
      console.error('Error updating net request rule:', error);
    }
  }
  
  // Reset to default user agent
  resetBtn.addEventListener('click', async () => {
    currentUserAgent = null;
    await chrome.storage.local.remove(['activeUserAgent', 'activeUserAgentString']);
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1] });
    renderList(userAgentPresets);
    updateStatus();
  });
  
  // Search functionality
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderList(userAgentPresets);
  });
  
  // Tab filtering
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.category;
      renderList(userAgentPresets);
    });
  });
  
  // Initialize
  await loadCurrentUserAgent();
  renderList(userAgentPresets);
});
```

---

Step 5: Background Service Worker {#service-worker}

The background service worker handles extension lifecycle events and manages persistent settings:

```javascript
// background.js
chrome.runtime.onInstalled.addListener(async () => {
  // Set default user agent on first install
  await chrome.storage.local.set({
    activeUserAgent: null,
    activeUserAgentString: null
  });
  
  console.log('User Agent Switcher installed');
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getActiveUserAgent') {
    chrome.storage.local.get(['activeUserAgent', 'activeUserAgentString']).then(result => {
      sendResponse(result);
    });
    return true; // Keep the message channel open for async response
  }
  
  if (message.type === 'setCustomUserAgent') {
    const { userAgent } = message;
    chrome.storage.local.set({
      activeUserAgent: 'custom',
      activeUserAgentString: userAgent
    });
    sendResponse({ success: true });
    return true;
  }
});
```

---

Step 6: Loading and Testing the Extension {#testing}

Now let us load the extension in Chrome and verify it works correctly:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select your extension's root directory
4. The extension icon should appear in your toolbar

Testing the Extension

To verify your user agent switcher is working:

1. Click the extension icon in the toolbar
2. Select a user agent (e.g., "iPhone 15 Pro")
3. Visit a website that displays user agent information, such as [whatismyuseragent.com](https://whatismyuseragent.com)
4. The page should now show the selected user agent instead of your actual browser's user agent

You can also test by opening Chrome DevTools (F12), going to the Network tab, and checking the request headers for any network request.

---

Advanced Features {#advanced-features}

Once you have the basic extension working, consider adding these advanced features:

Custom User Agent Support

Allow users to add their own custom user agent strings:

```javascript
// Add to popup.js to handle custom user agents
const manageBtn = document.getElementById('manageBtn');

manageBtn.addEventListener('click', () => {
  const customUA = prompt('Enter custom User-Agent string:');
  if (customUA) {
    selectUserAgent({
      id: 'custom',
      name: 'Custom',
      userAgent: customUA
    });
  }
});
```

URL-Specific Rules

Implement different user agents for different websites:

```javascript
// In background.js - URL-specific user agents
const urlSpecificRules = {
  'facebook.com': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15',
  'twitter.com': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36'
};
```

Quick Toggle in Toolbar

Add a keyboard shortcut for quick user agent switching:

```json
// Add to manifest.json
"commands": {
  "toggle-user-agent": {
    "suggested_key": {
      "default": "Ctrl+Shift+U",
      "mac": "Command+Shift+U"
    },
    "description": "Toggle user agent switching"
  }
}
```

---

Troubleshooting Common Issues {#troubleshooting}

Here are solutions to common problems you might encounter:

Extension Not Modifying Requests

If the user agent is not being modified, check:

1. Permissions: Ensure `declarativeNetRequest` is in your manifest
2. Host permissions: Verify `<all_urls>` is in host_permissions
3. Rule syntax: Make sure your declarative net request rule is properly formatted

User Agent Not Persisting

If the selected user agent resets on page reload:

1. Check that storage is working correctly in the background
2. Verify the service worker is not being terminated unexpectedly
3. Ensure rules are being set on session start if needed

Conflicts with Other Extensions

If another extension is modifying headers:

1. Adjust your rule priority to be higher
2. Use the `tabId` condition to limit rules to specific tabs
3. Check for conflicts in the console

---

Security Considerations {#security}

When building a user agent switcher, keep these security best practices in mind:

1. Validate user input: If allowing custom user agents, validate the input to prevent injection attacks
2. Minimize permissions: Only request the permissions your extension needs
3. Secure storage: Do not store sensitive data in chrome.storage without encryption
4. Content Security Policy: Define a strict CSP in your manifest

---

Publishing Your Extension {#publishing}

Once your user agent switcher extension is complete and tested, you can publish it to the Chrome Web Store:

1. Prepare your listing: Write a compelling description that highlights key features
2. Create screenshots: Show the popup UI and demonstrate how to use the extension
3. Set up payments: Decide whether your extension is free or paid
4. Submit for review: Google typically reviews submissions within 1-3 business days

For a detailed guide to publishing, see our [Chrome Web Store publishing guide](/docs/publishing/).

---

Conclusion {#conclusion}

You have now built a fully functional user agent switcher Chrome extension! This extension demonstrates several important concepts in Chrome extension development:

- Declarative Net Request API: The modern way to modify network requests in Manifest V3
- Popup UI design: Creating intuitive interfaces for extension users
- Storage persistence: Saving user preferences across sessions
- Background service workers: Handling extension lifecycle events
- Module-based architecture: Organizing code for maintainability

The skills you have learned building this extension apply to many other types of extensions. You can expand this project by adding custom user agents, URL-specific rules, keyboard shortcuts, and more.

If you want to continue learning, explore our guides on [building other developer tools](/2025/01/16/best-chrome-extensions-for-developers-2025/), [extension performance optimization](/2025/01/16/chrome-extension-performance-optimization-guide/), and [advanced Chrome extension patterns](/docs/guides/advanced-messaging-patterns/).

---

Next Steps

Ready to take your extension to the better? Here are some ideas:

1. Add a full options page: Allow users to manage custom user agents and URL-specific rules
2. Implement presets for popular devices: Add more device profiles for comprehensive testing
3. Add synchronization: Use chrome.storage.sync to share settings across devices
4. Create keyboard shortcuts: Allow quick toggling between saved user agents
5. Build a companion website: Provide documentation and a way to submit new user agent presets

The user agent switcher you have built is a valuable tool that you can use in your own development workflow while also demonstrating your Chrome extension development skills to potential employers or clients.

---

*This guide is part of the [Chrome Extension Guide](https://bestchromeextensions.com/) by theluckystrike. your comprehensive resource for Chrome extension development.*
