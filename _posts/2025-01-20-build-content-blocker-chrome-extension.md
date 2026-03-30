---
layout: post
title: "Build a Content Blocker Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a content blocker Chrome extension with our comprehensive developer's guide. Master element hiding, page cleaning, and create powerful content filtering extensions using Manifest V3."
date: 2025-01-20
last_modified_at: 2025-01-20
categories: [Chrome-Extensions]
tags: [chrome-extension, development]
keywords: "content blocker extension, element hider chrome, page cleaner extension, chrome content blocker tutorial, build ad blocker chrome extension"
canonical_url: "https://bestchromeextensions.com/2025/01/20/build-content-blocker-chrome-extension/"
---

Build a Content Blocker Chrome Extension: Complete Developer's Guide

Content blocking extensions are among the most popular and useful tools in the Chrome Web Store. Whether you want to hide annoying pop-ups, block specific page elements, remove distracting advertisements, or clean up web pages to focus on essential content, building a content blocker extension is an excellent project that teaches valuable skills in Chrome extension development.

we will walk you through building a fully functional content blocker Chrome extension from scratch. You'll learn how to use the declarativeNetRequest API, manipulate DOM elements, create user-friendly interfaces for managing blocklists, and package your extension for the Chrome Web Store.

---

Understanding Content Blocking in Chrome Extensions {#understanding-content-blocking}

Before we dive into code, it's essential to understand how content blocking works in modern Chrome extensions. Chrome provides two primary methods for blocking content: network-level blocking using the declarativeNetRequest API and DOM-level element hiding using content scripts.

Network-Level Blocking (declarativeNetRequest API)

The declarativeNetRequest API allows extensions to block or modify network requests before they are made. This is the most efficient method for blocking advertisements at the network level because the blocked resources never reach the browser, saving bandwidth and improving page load times.

This approach is perfect for:
- Blocking entire network requests (images, scripts, iframes)
- Redirecting URLs to different destinations
- Modifying request headers
- Blocking cookies

DOM-Level Element Hiding

DOM-level element hiding involves examining the page's HTML after it has loaded and hiding or removing specific elements using CSS selectors. This method is more flexible for visual customizations but requires the page to fully load before processing.

This approach excels at:
- Hiding specific page elements by CSS selectors
- Removing distracting UI components
- Cleaning up social media feeds
- Customizing the appearance of websites

Most production content blockers use a combination of both approaches for optimal results. The network-level blocking handles advertisements efficiently, while DOM manipulation handles elements that slip through or require more granular control.

---

Project Setup and Manifest Configuration {#project-setup}

Let's start by setting up our Chrome extension project. Create a new directory for your extension and set up the necessary files.

Creating the Project Structure

Create the following directory structure for your content blocker extension:

```
content-blocker/
 manifest.json
 background.js
 content.js
 popup.html
 popup.js
 popup.css
 options.html
 options.js
 blocked-elements.json
 icons/
     icon16.png
     icon48.png
     icon128.png
```

Manifest V3 Configuration

The manifest.json file is the heart of your Chrome extension. For a content blocker, we need to declare specific permissions and configure the appropriate extension type.

```json
{
  "manifest_version": 3,
  "name": "Page Cleaner Pro",
  "version": "1.0.0",
  "description": "Block unwanted content, hide page elements, and clean up distracting web pages.",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "declarativeNetRequest"
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
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ]
}
```

This manifest configuration includes several key components. The declarativeNetRequest permission enables network-level blocking, while the scripting permission allows us to inject content scripts for DOM manipulation. The host permissions with "<all_urls>" allow the extension to work on all websites.

---

Implementing Network-Level Blocking {#network-blocking}

The declarativeNetRequest API is powerful but requires careful setup. Unlike older blocking methods, it uses static rules defined in a JSON file rather than dynamic rules for better performance and security.

Creating Blocking Rules

Create a file named rules.json in your project directory:

```json
{
  "rules": [
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
        "urlFilter": ".*googlesyndication\\.com.*",
        "resourceTypes": ["script", "image", "sub_frame"]
      }
    },
    {
      "id": 3,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": ".*googleadservices\\.com.*",
        "resourceTypes": ["script", "image"]
      }
    },
    {
      "id": 4,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": ".*google-analytics\\.com.*",
        "resourceTypes": ["script"]
      }
    },
    {
      "id": 5,
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
}
```

These rules block common advertising and tracking networks. Each rule has an ID, priority, action type, and condition. The urlFilter uses regular expressions to match URLs, and resourceTypes specifies what types of requests to block.

Registering Rules in Background Script

Now let's create the background.js to register these rules when the extension starts:

```javascript
// background.js

// Rule IDs must be unique and start from 1
const RULE_IDS = {
  DOUBLECLICK: 1,
  GOOGLE_SYNDICATION: 2,
  GOOGLE_ADSERVICES: 3,
  GOOGLE_ANALYTICS: 4,
  FACEBOOK_TRACKING: 5
};

// Initialize extension and register rules
chrome.runtime.onInstalled.addListener(async () => {
  // Load and register the blocking rules
  try {
    const response = await fetch(chrome.runtime.getURL('rules.json'));
    const rules = await response.json();
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules.rules,
      removeRuleIds: Object.values(RULE_IDS)
    });
    
    console.log('Content blocking rules registered successfully');
  } catch (error) {
    console.error('Failed to register blocking rules:', error);
  }
});

// Handle messages from popup or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStats') {
    // Return blocking statistics
    chrome.declarativeNetRequest.getStats((stats) => {
      sendResponse(stats);
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'updateRules') {
    // Update blocking rules based on user preferences
    handleRuleUpdate(message.enabledCategories)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleRuleUpdate(enabledCategories) {
  // Dynamically update rules based on user settings
  // This allows users to enable/disable specific blocking categories
  const categoryRules = getCategoryRules(enabledCategories);
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: categoryRules
  });
}

function getCategoryRules(enabledCategories) {
  // Define rules for different categories
  const allRules = {
    ads: [
      {
        id: 101,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '.*ads\\..*', resourceTypes: ['script', 'image'] }
      }
    ],
    trackers: [
      {
        id: 201,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '.*tracking.*', resourceTypes: ['script'] }
      }
    ],
    social: [
      {
        id: 301,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '.*connect\\.facebook\\.net.*', resourceTypes: ['script'] }
      }
    ]
  };
  
  let rules = [];
  enabledCategories.forEach(category => {
    if (allRules[category]) {
      rules = rules.concat(allRules[category]);
    }
  });
  
  return rules;
}
```

The background script handles rule registration and management. It includes functionality for dynamic rule updates based on user preferences, allowing users to enable or disable specific blocking categories.

---

Implementing DOM Element Hiding {#element-hiding}

Now let's implement the content script that handles DOM-level element hiding. This is where the "element hider chrome" functionality comes to life.

The Content Script

Create content.js to handle element hiding:

```javascript
// content.js

// Configuration for elements to hide on different domains
const ELEMENT_RULES = {
  // Common selectors that work across many sites
  global: [
    '.advertisement',
    '.ad-container',
    '.ad-wrapper',
    '[class*="ad-"]',
    '[id*="ad-"]',
    '[class*="sponsored"]',
    '[data-ad]',
    '.popup-ad',
    '.modal-ad',
    '.newsletter-popup',
    '.cookie-banner',
    '.cookie-notice',
    '.gdpr-banner'
  ],
  
  // YouTube-specific selectors
  'youtube.com': [
    '#player-ads',
    '.ytp-ad-module',
    '#masthead-ad',
    'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-companion-slot-renderer'
  ],
  
  // Twitter/X-specific selectors
  'twitter.com': [
    '[data-testid="sidebarColumn"]',
    '[data-testid="placementTracking"]',
    '.promoted-trend',
    '.ads-holder'
  ],
  
  // Facebook-specific selectors
  'facebook.com': [
    '[data-pagelet="RightRail"]',
    '.userContentWrapper .userContent',
    '[data-testid="fbfeed_story"] .userContent'
  ],
  
  // Generic news sites
  'news sites': [
    '.ad-unit',
    '.sponsored-content',
    '.outbrain',
    '.taboola',
    '[id*="google_ads"]'
  ]
};

// Load user custom rules from storage
async function getCustomRules() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['customSelectors', 'enabledCategories'], (result) => {
      resolve({
        customSelectors: result.customSelectors || [],
        enabledCategories: result.enabledCategories || ['ads', 'privacy']
      });
    });
  });
}

// Apply hiding rules to the current page
async function applyElementHiding() {
  const { customSelectors, enabledCategories } = await getCustomRules();
  
  // Get current hostname
  const hostname = window.location.hostname;
  const domain = getDomainKey(hostname);
  
  // Collect all selectors to hide
  let selectorsToHide = [];
  
  // Add global selectors
  if (enabledCategories.includes('ads')) {
    selectorsToHide = selectorsToHide.concat(ELEMENT_RULES.global);
  }
  
  // Add domain-specific selectors
  for (const [key, selectors] of Object.entries(ELEMENT_RULES)) {
    if (key === 'global') continue;
    
    if (key.includes(' ') || hostname.includes(key.replace(' ', ''))) {
      selectorsToHide = selectorsToHide.concat(selectors);
    }
  }
  
  // Add custom user selectors
  if (customSelectors.length > 0) {
    selectorsToHide = selectorsToHide.concat(customSelectors);
  }
  
  // Remove duplicates
  selectorsToHide = [...new Set(selectorsToHide)];
  
  // Apply CSS to hide elements
  hideElements(selectorsToHide);
  
  // Set up mutation observer for dynamically loaded content
  observeDOMChanges(selectorsToHide);
}

// Get the domain key for matching rules
function getDomainKey(hostname) {
  const domainMap = {
    'youtube.com': 'youtube.com',
    'twitter.com': 'twitter.com',
    'x.com': 'twitter.com',
    'facebook.com': 'facebook.com'
  };
  
  return domainMap[hostname] || hostname;
}

// Create and inject CSS to hide elements
function hideElements(selectors) {
  if (selectors.length === 0) return;
  
  const style = document.createElement('style');
  style.id = 'page-cleaner-pro-styles';
  
  // Create CSS rules to hide each selector
  const cssRules = selectors.map(selector => {
    // Escape special characters in selector
    const escapedSelector = selector.replace(/:/g, '\\:');
    return `${escapedSelector} { display: none !important; visibility: hidden !important; }`;
  }).join('\n');
  
  style.textContent = cssRules;
  
  // Remove existing styles if any
  const existingStyle = document.getElementById('page-cleaner-pro-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  document.head.appendChild(style);
  
  // Also hide any already-rendered elements
  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      });
    } catch (e) {
      // Invalid selector, skip
    }
  });
}

// Watch for DOM changes and apply hiding to new elements
function observeDOMChanges(baseSelectors) {
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        shouldUpdate = true;
      }
    });
    
    if (shouldUpdate) {
      // Re-apply hiding to catch new elements
      hideElements(baseSelectors);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for updates from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateHiding') {
    applyElementHiding().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      hostname: window.location.hostname,
      title: document.title
    });
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyElementHiding);
} else {
  applyElementHiding();
}
```

This content script handles the "element hider chrome" functionality comprehensively. It uses CSS selectors to hide unwanted elements, supports both global rules and site-specific rules, allows custom user-defined selectors, and includes a mutation observer to handle dynamically loaded content.

---

Creating the User Interface {#user-interface}

A content blocker extension needs a user-friendly interface for managing settings. Let's create the popup and options pages.

The Popup Interface

Create popup.html:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Cleaner Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Page Cleaner Pro</h1>
      <p class="status">Protection Active</p>
    </header>
    
    <div class="toggle-section">
      <label class="toggle-label">
        <span>Enable Protection</span>
        <input type="checkbox" id="masterToggle" checked>
        <span class="toggle-slider"></span>
      </label>
    </div>
    
    <div class="categories">
      <h2>Blocking Categories</h2>
      
      <label class="category-toggle">
        <input type="checkbox" id="blockAds" checked>
        <span class="category-name">Advertisements</span>
        <span class="blocked-count" id="adsBlocked">0 blocked</span>
      </label>
      
      <label class="category-toggle">
        <input type="checkbox" id="blockTrackers" checked>
        <span class="category-name">Trackers</span>
        <span class="blocked-count" id="trackersBlocked">0 blocked</span>
      </label>
      
      <label class="category-toggle">
        <input type="checkbox" id="blockSocial">
        <span class="category-name">Social Widgets</span>
        <span class="blocked-count" id="socialBlocked">0 blocked</span>
      </label>
      
      <label class="category-toggle">
        <input type="checkbox" id="hideCookieBanners" checked>
        <span class="category-name">Cookie Banners</span>
        <span class="status-badge">Element Hiding</span>
      </label>
    </div>
    
    <div class="stats-section">
      <h2>Today's Stats</h2>
      <div class="stat-row">
        <span>Requests Blocked:</span>
        <span id="totalBlocked">0</span>
      </div>
      <div class="stat-row">
        <span>Data Saved:</span>
        <span id="dataSaved">0 KB</span>
      </div>
    </div>
    
    <footer class="popup-footer">
      <button id="openOptions" class="btn-secondary">More Settings</button>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The Popup Styles

Create popup.css:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background: #f5f5f5;
  color: #333;
}

.popup-container {
  padding: 16px;
}

.popup-header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.popup-header h1 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.status {
  font-size: 12px;
  color: #4caf50;
  font-weight: 500;
}

.toggle-section {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.toggle-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.toggle-label input {
  display: none;
}

.toggle-slider {
  width: 44px;
  height: 24px;
  background: #ccc;
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-label input:checked + .toggle-slider {
  background: #4caf50;
}

.toggle-label input:checked + .toggle-slider::after {
  transform: translateX(20px);
}

.categories {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.categories h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.category-toggle {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.category-toggle:last-child {
  border-bottom: none;
}

.category-toggle input {
  margin-right: 12px;
  width: 18px;
  height: 18px;
  accent-color: #4caf50;
}

.category-name {
  flex: 1;
  font-size: 14px;
}

.blocked-count {
  font-size: 12px;
  color: #666;
}

.status-badge {
  font-size: 10px;
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 10px;
}

.stats-section {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.stats-section h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

.stat-row span:last-child {
  font-weight: 600;
}

.popup-footer {
  text-align: center;
}

.btn-secondary {
  background: #f0f0f0;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #e0e0e0;
}
```

The Popup JavaScript

Create popup.js:

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadStats();
  setupEventListeners();
});

function setupEventListeners() {
  // Master toggle
  document.getElementById('masterToggle').addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.sync.set({ masterEnabled: enabled });
    
    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: enabled ? 'enable' : 'disable' 
        });
      }
    });
  });
  
  // Category toggles
  ['blockAds', 'blockTrackers', 'blockSocial', 'hideCookieBanners'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      saveCategorySettings();
    });
  });
  
  // Open options page
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function loadSettings() {
  chrome.storage.sync.get([
    'masterEnabled',
    'blockAds',
    'blockTrackers', 
    'blockSocial',
    'hideCookieBanners'
  ], (result) => {
    document.getElementById('masterToggle').checked = result.masterEnabled !== false;
    document.getElementById('blockAds').checked = result.blockAds !== false;
    document.getElementById('blockTrackers').checked = result.blockTrackers !== false;
    document.getElementById('blockSocial').checked = result.blockSocial === true;
    document.getElementById('hideCookieBanners').checked = result.hideCookieBanners !== false;
  });
}

function saveCategorySettings() {
  const settings = {
    blockAds: document.getElementById('blockAds').checked,
    blockTrackers: document.getElementById('blockTrackers').checked,
    blockSocial: document.getElementById('blockSocial').checked,
    hideCookieBanners: document.getElementById('hideCookieBanners').checked
  };
  
  chrome.storage.sync.set(settings);
  
  // Update content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'updateHiding' });
    }
  });
}

function loadStats() {
  chrome.storage.local.get(['blockedCount', 'dataSaved'], (result) => {
    const blocked = result.blockedCount || 0;
    const dataKB = Math.round((result.dataSaved || 0) / 1024);
    
    document.getElementById('totalBlocked').textContent = blocked.toLocaleString();
    document.getElementById('dataSaved').textContent = `${dataKB} KB`;
  });
  
  // Simulated stats for demo
  document.getElementById('adsBlocked').textContent = `${Math.floor(Math.random() * 50)} blocked`;
  document.getElementById('trackersBlocked').textContent = `${Math.floor(Math.random() * 30)} blocked`;
}
```

---

Advanced Features: Custom Element Rules {#advanced-features}

For power users, you should provide an options page where they can add custom selectors to hide specific elements on any website.

The Options Page

Create options.html:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Cleaner Pro - Options</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 20px; }
    h2 { font-size: 18px; margin: 20px 0 10px; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    textarea { width: 100%; height: 150px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 13px; }
    button { background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px; }
    button:hover { background: #45a049; }
    button.secondary { background: #666; }
    .hint { font-size: 12px; color: #666; margin-top: 8px; }
    .saved-message { display: none; color: green; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>Page Cleaner Pro - Settings</h1>
  
  <div class="section">
    <h2>Custom CSS Selectors</h2>
    <p>Add CSS selectors for elements you want to hide on all websites. Enter one selector per line.</p>
    <textarea id="customSelectors" placeholder=".annoying-popup&#10;.promotion-banner&#10;#unwanted-element"></textarea>
    <p class="hint">Example: .class-name, #element-id, [data-attribute]</p>
    <button id="saveCustomSelectors">Save Custom Selectors</button>
    <span class="saved-message" id="savedMessage">Saved!</span>
  </div>
  
  <div class="section">
    <h2>Per-Site Rules</h2>
    <p>Add rules that only apply to specific websites. Format: domain|selector</p>
    <textarea id="siteRules" placeholder="youtube.com|#player-ads&#10;twitter.com|[data-testid=&quot;sidebarColumn&quot;]"></textarea>
    <button id="saveSiteRules">Save Site Rules</button>
    <span class="saved-message" id="siteSavedMessage">Saved!</span>
  </div>
  
  <div class="section">
    <h2>Export/Import Settings</h2>
    <button id="exportSettings" class="secondary">Export Settings</button>
    <button id="importSettings" class="secondary">Import Settings</button>
    <input type="file" id="importFile" style="display: none;" accept=".json">
  </div>
  
  <script src="options.js"></script>
</body>
</html>
```

Create options.js:

```javascript
// options.js

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('saveCustomSelectors').addEventListener('click', () => {
    const selectors = document.getElementById('customSelectors').value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    chrome.storage.sync.set({ customSelectors: selectors });
    
    const message = document.getElementById('savedMessage');
    message.style.display = 'inline';
    setTimeout(() => message.style.display = 'none', 2000);
    
    // Notify all tabs to update
    notifyAllTabs();
  });
  
  document.getElementById('saveSiteRules').addEventListener('click', () => {
    const rules = {};
    const lines = document.getElementById('siteRules').value.split('\n');
    
    lines.forEach(line => {
      const [domain, selector] = line.split('|').map(s => s.trim());
      if (domain && selector) {
        if (!rules[domain]) rules[domain] = [];
        rules[domain].push(selector);
      }
    });
    
    chrome.storage.sync.set({ siteSpecificRules: rules });
    
    const message = document.getElementById('siteSavedMessage');
    message.style.display = 'inline';
    setTimeout(() => message.style.display = 'none', 2000);
    
    notifyAllTabs();
  });
  
  document.getElementById('exportSettings').addEventListener('click', () => {
    chrome.storage.sync.get(null, (settings) => {
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'page-cleaner-settings.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  });
  
  document.getElementById('importSettings').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  
  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settings = JSON.parse(event.target.result);
        chrome.storage.sync.set(settings);
        alert('Settings imported successfully!');
        loadSettings();
      } catch (err) {
        alert('Invalid settings file');
      }
    };
    reader.readAsText(file);
  });
}

function loadSettings() {
  chrome.storage.sync.get(['customSelectors', 'siteSpecificRules'], (result) => {
    if (result.customSelectors) {
      document.getElementById('customSelectors').value = result.customSelectors.join('\n');
    }
    
    if (result.siteSpecificRules) {
      const lines = [];
      Object.entries(result.siteSpecificRules).forEach(([domain, selectors]) => {
        selectors.forEach(selector => {
          lines.push(`${domain}|${selector}`);
        });
      });
      document.getElementById('siteRules').value = lines.join('\n');
    }
  });
}

function notifyAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'updateHiding' }).catch(() => {});
    });
  });
}
```

---

Testing Your Extension {#testing}

Before publishing, thoroughly test your content blocker extension in development mode.

Loading the Extension

1. Open Chrome and navigate to chrome://extensions/
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension directory
4. The extension icon should appear in your toolbar

Testing Network Blocking

Visit websites with known advertisements (make sure to use test sites that don't have malicious content). Open the extension popup and verify that the blocked counts increase. Check the network tab in Chrome DevTools to see blocked requests.

Testing Element Hiding

Visit popular websites like YouTube, Twitter, or news sites. Verify that advertisements, cookie banners, and other unwanted elements are hidden. Test the custom selector functionality by adding your own selectors and verifying they work.

Testing the Options Page

Open the options page from the popup. Add custom selectors and site-specific rules. Verify they apply correctly to different websites.

---

Publishing to the Chrome Web Store {#publishing}

Once you've thoroughly tested your extension, you can publish it to the Chrome Web Store.

Creating Store Assets

You'll need:
- A 128x128 pixel icon (icon128.png)
- A 440x280 pixel screenshot (can use multiple)
- A 920x680 pixel promotional image (optional)
- A detailed description following SEO best practices

The Publishing Process

1. Create a developer account at the Chrome Web Store Developer Dashboard
2. Zip your extension directory (excluding .git and test files)
3. Upload the zip file
4. Fill in the store listing with:
   - A compelling title containing your main keywords
   - A detailed description (your 2000+ word article can be adapted here)
   - Appropriate category and tags
5. Submit for review

SEO Optimization for the Store

Your store listing should include:
- Primary keyword: "content blocker extension" in the title
- Secondary keywords: "element hider chrome", "page cleaner extension" in the description
- Clear screenshots showing the extension in action
- A detailed description explaining features and benefits

---

Conclusion {#conclusion}

Congratulations! You've built a complete content blocker Chrome extension with both network-level blocking using the declarativeNetRequest API and DOM-level element hiding using content scripts. The extension includes:

- Comprehensive network request blocking for advertisements and trackers
- Element hiding capabilities that work across all websites
- A user-friendly popup interface for quick controls
- An advanced options page for custom selectors and per-site rules
- Statistics tracking to show users the impact of the extension
- Export/import functionality for settings

This project demonstrates the full range of Chrome extension development skills including Manifest V3 configuration, service workers, content scripts, the declarativeNetRequest API, and UI development with HTML, CSS, and JavaScript.

Content blockers remain one of the most popular extension categories in the Chrome Web Store. With this foundation, you can continue to enhance your extension by adding features like filter list synchronization, advanced matching rules, a cloud-based blocklist, or integration with popular ad blocking filter lists like EasyList.

Remember to test thoroughly across different websites and browsers before publishing. Good luck with your content blocker extension!
