---
layout: post
title: "Build a Request Blocker Chrome Extension: Block Trackers and Unwanted Scripts"
description: "Learn how to build a request blocker Chrome extension to block trackers, ads, and unwanted scripts. A complete guide with code examples and implementation details."
date: 2025-05-14
categories: [Chrome-Extensions, Privacy]
tags: [request-blocker, privacy, chrome-extension]
keywords: "chrome extension request blocker, block trackers chrome, script blocker chrome extension, request filter extension, chrome extension block scripts"
canonical_url: "https://bestchromeextensions.com/2025/05/14/build-request-blocker-chrome-extension/"
---

Build a Request Blocker Chrome Extension: Block Trackers and Unwanted Scripts

The internet has become a battlefield of sorts. Every time you visit a website, dozens of invisible requests are made on your behalf, tracking scripts, advertising networks, analytics providers, and third-party widgets all compete to collect data about your browsing behavior. For privacy-conscious users and developers, understanding how to block these requests at the source is a powerful skill.

we will walk you through building a request blocker Chrome extension from scratch. By the end of this tutorial, you will have a fully functional extension capable of intercepting and blocking network requests based on customizable rules. Whether you want to block known trackers, prevent specific scripts from loading, or filter requests by domain patterns, this project will give you the foundation to do exactly that.

---

Why Build a Request Blocker Extension?

Before we dive into the code, let's discuss why building a request blocker extension is valuable. The primary benefits include:

1. Enhanced Privacy: Block tracking scripts and analytics that follow you across websites
2. Improved Performance: Reduce page load times by blocking heavy third-party scripts and ads
3. Educational Value: Learn how Chrome's webRequest API works under the hood
4. Custom Control: Create your own rules tailored to your specific needs
5. Browser Independence: Unlike some privacy tools, this extension works directly in Chrome

Many popular ad blockers use similar techniques to what we will implement here. By understanding these mechanisms, you gain deeper insight into how web privacy tools function, and you can build custom solutions for your unique requirements.

---

Prerequisites

To follow along with this tutorial, you will need:

- Google Chrome or a Chromium-based browser
- Basic knowledge of JavaScript and JSON
- A code editor (VS Code is recommended)
- No paid tools or accounts required

Let's start by setting up the project structure.

---

Project Structure

Every Chrome extension requires a manifest file and the appropriate directory structure. For our request blocker, we will need:

```
request-blocker/
 manifest.json
 background.js
 popup.html
 popup.js
 popup.css
 rules.json
 icons/
     icon16.png
     icon48.png
     icon128.png
```

Create a new folder named `request-blocker` and set up these files. We will build each component step by step.

---

Step 1: Creating the Manifest

The manifest.json file is the backbone of any Chrome extension. It tells Chrome about the extension's permissions, background scripts, and user interface. Here is the manifest for our request blocker:

```json
{
  "manifest_version": 3,
  "name": "Request Blocker",
  "version": "1.0",
  "description": "Block trackers, ads, and unwanted network requests",
  "permissions": [
    "webRequest",
    "webRequestBlocking",
    "storage",
    "activeTab",
    "scripting"
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

Key permissions explained:

- webRequest: Allows us to observe and analyze network requests
- webRequestBlocking: Enables us to block or modify requests before they complete
- storage: Lets us save user preferences and rule configurations
- activeTab: Provides access to the current tab when the user interacts with the extension

---

Step 2: The Background Service Worker

The background script is where the magic happens. This service worker listens for network requests and decides which ones to block based on our rules. Create a file named `background.js`:

```javascript
// Default blocklist of common trackers and ad domains
const defaultBlocklist = [
  // Analytics and tracking
  '*://www.google-analytics.com/*',
  '*://analytics.google.com/*',
  '*://googletagmanager.com/*',
  '*://googlesyndication.com/*',
  
  // Advertising networks
  '*://doubleclick.net/*',
  '*://adservice.google.com/*',
  '*://pagead2.googlesyndication.com/*',
  '*://ad.doubleclick.net/*',
  
  // Social media trackers
  '*://connect.facebook.net/*',
  '*://platform.twitter.com/*',
  '*://platform.linkedin.com/*',
  
  // Common ad networks
  '*://adsserver.com/*',
  '*://adnxs.com/*',
  '*://advertising.com/*',
  '*://pubmatic.com/*',
  '*://rubiconproject.com/*',
  
  // Tracking scripts
  '*://hotjar.com/*',
  '*://mixpanel.com/*',
  '*://segment.io/*',
  '*://amplitude.com/*',
  '*://newrelic.com/*'
];

// Rules storage
let blockRules = [];
let isEnabled = true;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['blocklist', 'enabled'], (result) => {
    if (!result.blocklist) {
      chrome.storage.local.set({ blocklist: defaultBlocklist });
      blockRules = defaultBlocklist;
    } else {
      blockRules = result.blocklist;
    }
    
    if (result.enabled !== undefined) {
      isEnabled = result.enabled;
    }
    
    updateBlockingRules();
  });
});

// Update blocking rules based on blocklist
function updateBlockingRules() {
  if (!isEnabled) {
    chrome.webRequest.onBeforeRequest.removeListener(blockRequest);
    return;
  }
  
  // Create blocking rules
  const rules = blockRules.map((pattern, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: pattern.replace('*://', '').replace('/*', ''),
      resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame']
    }
  }));
  
  // Apply rules
  chrome.webRequest.onBeforeRequest.addListener(
    blockRequest,
    { urls: blockRules },
    ['blocking']
  );
}

// Block matching requests
function blockRequest(details) {
  if (!isEnabled) {
    return { cancel: false };
  }
  
  for (const pattern of blockRules) {
    if (matchPattern(details.url, pattern)) {
      console.log('Blocked request:', details.url);
      return { cancel: true };
    }
  }
  
  return { cancel: false };
}

// Pattern matching utility
function matchPattern(url, pattern) {
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '\\?');
  
  const regex = new RegExp(regexPattern, 'i');
  return regex.test(url);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ enabled: isEnabled, ruleCount: blockRules.length });
  } else if (request.action === 'toggle') {
    isEnabled = request.enabled;
    chrome.storage.local.set({ enabled: isEnabled });
    updateBlockingRules();
    sendResponse({ enabled: isEnabled });
  } else if (request.action === 'getRules') {
    sendResponse({ rules: blockRules });
  } else if (request.action === 'updateRules') {
    blockRules = request.rules;
    chrome.storage.local.set({ blocklist: blockRules });
    updateBlockingRules();
    sendResponse({ success: true });
  }
});

// Track blocked requests for statistics
let blockedCount = 0;

chrome.webRequest.onCompleted.addListener(
  (details) => {
    // This is called for completed requests
    // We could add analytics here
  },
  { urls: ['<all_urls>'] }
);
```

This background script handles the core blocking logic. It maintains a list of blocked domains and patterns, checks each request against this list, and cancels requests that match.

---

Step 3: Building the Popup Interface

The popup is what users see when they click the extension icon. It should provide an interface to enable/disable blocking and view statistics. Create `popup.html`:

```html
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
      <div class="status-indicator">
        <span id="statusText">Active</span>
        <label class="switch">
          <input type="checkbox" id="enableToggle" checked>
          <span class="slider"></span>
        </label>
      </div>
    </header>
    
    <div class="stats">
      <div class="stat-item">
        <span class="stat-value" id="ruleCount">0</span>
        <span class="stat-label">Blocking Rules</span>
      </div>
    </div>
    
    <div class="actions">
      <button id="manageRules" class="btn btn-secondary">Manage Rules</button>
      <button id="addRule" class="btn btn-primary">Add Custom Rule</button>
    </div>
    
    <div class="presets">
      <h3>Quick Presets</h3>
      <div class="preset-buttons">
        <button class="preset-btn" data-preset="trackers">Block Trackers</button>
        <button class="preset-btn" data-preset="ads">Block Ads</button>
        <button class="preset-btn" data-preset="social">Block Social</button>
      </div>
    </div>
  </div>
  
  <div id="modal" class="modal hidden">
    <div class="modal-content">
      <h2 id="modalTitle">Add Custom Rule</h2>
      <input type="text" id="ruleInput" placeholder="Enter URL pattern (e.g., *://example.com/*)">
      <div class="modal-actions">
        <button id="saveRule" class="btn btn-primary">Save</button>
        <button id="cancelRule" class="btn btn-secondary">Cancel</button>
      </div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now let's style it with `popup.css`:

```css
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 18px;
  color: #333;
}

h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

#statusText {
  font-size: 12px;
  font-weight: 600;
  color: #4caf50;
}

#statusText.inactive {
  color: #999;
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}

.switch input {
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
  transition: 0.3s;
  border-radius: 22px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4caf50;
}

input:checked + .slider:before {
  transform: translateX(18px);
}

/* Stats */
.stats {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #2196f3;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

/* Buttons */
.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background: #d5d5d5;
}

/* Presets */
.presets {
  margin-bottom: 16px;
}

.preset-buttons {
  display: flex;
  gap: 8px;
}

.preset-btn {
  flex: 1;
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #f0f0f0;
  border-color: #2196f3;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 280px;
}

.modal-content h2 {
  font-size: 16px;
  margin-bottom: 16px;
}

#ruleInput {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 13px;
}

.modal-actions {
  display: flex;
  gap: 8px;
}

.modal-actions .btn {
  flex: 1;
}
```

Now let's add the popup logic with `popup.js`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const enableToggle = document.getElementById('enableToggle');
  const statusText = document.getElementById('statusText');
  const ruleCountEl = document.getElementById('ruleCount');
  const modal = document.getElementById('modal');
  const ruleInput = document.getElementById('ruleInput');
  const modalTitle = document.getElementById('modalTitle');
  
  // Get initial status
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    enableToggle.checked = response.enabled;
    ruleCountEl.textContent = response.ruleCount;
    updateStatusText(response.enabled);
  });
  
  // Toggle enable/disable
  enableToggle.addEventListener('change', () => {
    const enabled = enableToggle.checked;
    chrome.runtime.sendMessage({ action: 'toggle', enabled }, (response) => {
      updateStatusText(response.enabled);
    });
  });
  
  function updateStatusText(enabled) {
    if (enabled) {
      statusText.textContent = 'Active';
      statusText.classList.remove('inactive');
    } else {
      statusText.textContent = 'Disabled';
      statusText.classList.add('inactive');
    }
  }
  
  // Add custom rule
  document.getElementById('addRule').addEventListener('click', () => {
    modalTitle.textContent = 'Add Custom Rule';
    ruleInput.value = '';
    modal.classList.remove('hidden');
  });
  
  // Manage rules
  document.getElementById('manageRules').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'getRules' }, (response) => {
      const rulesText = response.rules.join('\n');
      modalTitle.textContent = 'Manage Rules (One per line)';
      ruleInput.value = rulesText;
      modal.classList.remove('hidden');
    });
  });
  
  // Save rule
  document.getElementById('saveRule').addEventListener('click', () => {
    const input = ruleInput.value.trim();
    if (!input) {
      modal.classList.add('hidden');
      return;
    }
    
    // Check if multiple rules (for manage rules view)
    const newRules = input.split('\n').filter(r => r.trim());
    
    chrome.runtime.sendMessage({ action: 'updateRules', rules: newRules }, () => {
      ruleCountEl.textContent = newRules.length;
      modal.classList.add('hidden');
    });
  });
  
  // Cancel rule
  document.getElementById('cancelRule').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  
  // Preset buttons
  const presetButtons = document.querySelectorAll('.preset-btn');
  const presets = {
    trackers: [
      '*://www.google-analytics.com/*',
      '*://googletagmanager.com/*',
      '*://hotjar.com/*',
      '*://mixpanel.com/*',
      '*://segment.io/*',
      '*://amplitude.com/*',
      '*://newrelic.com/*',
      '*://fullstory.com/*',
      '*://crazyegg.com/*'
    ],
    ads: [
      '*://doubleclick.net/*',
      '*://adservice.google.com/*',
      '*://pagead2.googlesyndication.com/*',
      '*://ad.doubleclick.net/*',
      '*://adnxs.com/*',
      '*://advertising.com/*',
      '*://pubmatic.com/*',
      '*://rubiconproject.com/*',
      '*://adsserver.com/*'
    ],
    social: [
      '*://connect.facebook.net/*',
      '*://platform.twitter.com/*',
      '*://platform.linkedin.com/*',
      '*://pinterest.com/*',
      '*://addthis.com/*',
      '*://sharethis.com/*'
    ]
  };
  
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      if (presets[preset]) {
        chrome.runtime.sendMessage({ 
          action: 'updateRules', 
          rules: presets[preset] 
        }, () => {
          ruleCountEl.textContent = presets[preset].length;
        });
      }
    });
  });
});
```

---

Step 4: Creating Placeholder Icons

For the extension to work properly, you need icon files. You can create simple placeholder icons using any image editor, or generate them programmatically. For now, create empty placeholder files:

```bash
mkdir -p icons
touch icons/icon16.png
touch icons/icon48.png
touch icons/icon128.png
```

In a production extension, you would create proper 16x16, 48x48, and 128x128 PNG icons.

---

Step 5: Loading the Extension

Now that we have all the files in place, let's load the extension into Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked"
4. Select the `request-blocker` folder

The extension should now appear in your toolbar. Click the icon to see the popup interface. When enabled, it will start blocking requests matching the patterns in the default blocklist.

---

Testing Your Request Blocker

To verify that the extension is working:

1. Visit a website with known trackers (news sites often have many)
2. Open Chrome's Developer Tools (F12)
3. Look at the Console in the background script, you should see "Blocked request:" messages
4. Try enabling/disabling the extension using the toggle

You can also test by adding custom rules:

1. Click the extension icon
2. Click "Add Custom Rule"
3. Enter a pattern like `*://example.com/*`
4. Visit example.com and verify that requests are blocked

---

Advanced Features to Consider

This basic implementation provides a solid foundation, but there are many ways to enhance it:

1. Dynamic Rule Updates: Fetch updated blocklists from online sources
2. Whitelist Support: Allow users to exclude specific domains
3. Statistics Dashboard: Show how many requests have been blocked
4. Rule Import/Export: Share blocklists with other users
5. Context Menus: Right-click options for quick blocking
6. Tab-Specific Rules: Different rules for different tabs

---

Understanding the webRequest API

The webRequest API is incredibly powerful and forms the backbone of most Chrome ad blockers. Key concepts include:

- onBeforeRequest: Fires before a request begins, ideal for blocking
- onBeforeSendHeaders: Modify headers before they're sent
- onHeadersReceived: Intercept response headers
- onAuthRequired: Handle authentication challenges

Chrome has implemented new restrictions in Manifest V3 to prevent abuse. The `webRequestBlocking` permission now requires manual review for public extensions, but it works fully for development and personal use.

---

Conclusion

You now have a fully functional request blocker Chrome extension. This project demonstrates the core concepts of network request interception and blocking in Chrome extensions. The extension can:

- Block tracking scripts from major analytics providers
- Prevent advertising networks from loading
- Filter social media trackers
- Allow users to add custom blocking rules
- Enable/disable blocking with a simple toggle

This is just the beginning. With these foundations, you can build more sophisticated privacy tools, implement whitelisting, create dynamic blocklist updates, or even build a full-featured ad blocker with UI for managing filter lists.

The knowledge you have gained here applies to many other Chrome extension projects that need to monitor or modify network traffic. Whether you are building developer tools, privacy utilities, or productivity extensions, understanding webRequest is invaluable.

---

Additional Resources

- [Chrome webRequest API Documentation](https://developer.chrome.com/docs/extensions/reference/webRequest/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Filter List Syntax](https://adblockplus.org/filters)
- [EasyList - Community-maintained ad blocking filters](https://easylist.to/)

Start experimenting with your new extension today, and enjoy a cleaner, faster, more private browsing experience!
