---
layout: post
title: "Build a Content Blocker Chrome Extension: Hide Distracting Page Elements"
description: "Learn how to build a content blocker Chrome extension to hide distracting page elements. Complete guide covering Manifest V3, content scripts, element selection, and publishing."
date: 2025-05-14
last_modified_at: 2025-05-14
categories: [Chrome-Extensions, Tutorials]
tags: [content-blocker, element-hider, chrome-extension]
keywords: "chrome extension content blocker, hide elements chrome, block content chrome extension, element hider extension, chrome extension remove elements"
canonical_url: "https://bestchromeextensions.com/2025/05/14/build-content-blocker-chrome-extension/"
---

Build a Content Blocker Chrome Extension: Hide Distracting Page Elements

The modern web is filled with distractions. From persistent pop-ups and notification banners to social media widgets and recommendation sidebars, unwanted page elements can significantly impact your browsing experience and productivity. Fortunately, Chrome extensions provide a powerful solution: the ability to hide, block, or remove any element on any webpage.

we will walk you through building a complete content blocker Chrome extension from scratch. Whether you want to create a personal tool to eliminate distractions or publish an extension for thousands of users, this tutorial covers everything you need to know about DOM manipulation, content scripts, and the Manifest V3 architecture.

---

Why Build a Content Blocker Extension? {#why-build}

Content blocker and element hider extensions are among the most popular categories in the Chrome Web Store. They solve real problems for real users:

- Productivity: Remove social media feeds, news tickers, and other time-wasting elements
- Focus: Hide distracting advertisements and promotional banners
- Accessibility: Eliminate annoying animations or auto-playing videos
- Privacy: Block tracking pixels and cookie consent dialogs
- Customization: Remove elements that simply annoy you on specific websites

The demand for these tools is enormous. Extensions like uBlock Origin and Element Hider have millions of active users. While building a full-featured ad blocker is complex, creating a focused element hider extension is an excellent project for developers of all skill levels.

---

Understanding the Architecture {#architecture}

Before writing any code, let's understand how Chrome extensions work with content blocking.

How Content Scripts Work

Chrome extensions can inject JavaScript into web pages using content scripts. These scripts run in the context of the loaded page, giving them full access to the DOM (Document Object Model). This means content scripts can:

- Select and modify any element on the page
- Listen for DOM changes and react dynamically
- Store user preferences using Chrome's storage API
- Communicate with the extension's background service worker

The Extension Components

Our content blocker extension will consist of:

1. manifest.json - Configuration file defining permissions and components
2. content.js - The script that runs on web pages to hide elements
3. popup.html/js - User interface for configuring which elements to block
4. background.js - Service worker for handling extension lifecycle

---

Step 1: Create the Manifest File {#manifest}

Every Chrome extension starts with a manifest.json file. For a content blocker using Manifest V3, we need to declare specific permissions.

Create a new folder for your extension and add the following manifest.json:

```json
{
  "manifest_version": 3,
  "name": "Content Blocker Pro",
  "version": "1.0",
  "description": "Hide distracting page elements and block unwanted content",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Key permissions explained:

- storage: Allows saving user preferences (blocked selectors)
- activeTab: Access to the current tab when user interacts with extension
- scripting: Execute scripts and modify page content
- host_permissions: Specifies which websites can be affected (<all_urls> means all websites)

---

Step 2: Create the Content Script {#content-script}

The content script is the heart of our extension. It runs on every page and applies the blocking rules. Create content.js:

```javascript
// Content script - runs on every page

// Default blocked selectors (can be customized by users)
const defaultBlockedSelectors = [
  // Common ad placements
  '.advertisement',
  '.ad-container',
  '[class*="ad-"]',
  '[id*="google_ads"]',
  '[id*="ad-wrapper"]',
  
  // Social widgets
  '.social-share',
  '.share-buttons',
  '[class*="facebook-plugin"]',
  '[class*="twitter-widget"]',
  
  // Distractions
  '.newsletter-signup',
  '.popup-modal',
  '[class*="cookie-banner"]',
  '.notification-bar',
  
  // YouTube distractions
  '#secondary',
  '#related',
  '.ytp-endscreen-content'
];

// Load user's custom blocked selectors
let blockedSelectors = [...defaultBlockedSelectors];

// Initialize the content blocker
async function initContentBlocker() {
  try {
    // Get stored blocked selectors from extension storage
    const result = await chrome.storage.sync.get('blockedSelectors');
    if (result.blockedSelectors && Array.isArray(result.blockedSelectors)) {
      blockedSelectors = [...defaultBlockedSelectors, ...result.blockedSelectors];
    }
    
    // Apply blocking rules immediately
    applyBlockingRules();
    
    // Set up observer for dynamic content
    observeDOMChanges();
  } catch (error) {
    console.log('Content Blocker: Using default rules');
    applyBlockingRules();
    observeDOMChanges();
  }
}

// Hide all matching elements
function applyBlockingRules() {
  blockedSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.style.display = 'none';
        element.setAttribute('data-blocked-by-extension', 'true');
      });
    } catch (e) {
      // Invalid selector, skip it
    }
  });
}

// Observe DOM for dynamically added elements
function observeDOMChanges() {
  const observer = new MutationObserver((mutations) => {
    let shouldBlock = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        shouldBlock = true;
      }
    });
    
    if (shouldBlock) {
      applyBlockingRules();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for updates from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBlockedSelectors') {
    blockedSelectors = [...defaultBlockedSelectors, ...message.selectors];
    applyBlockingRules();
    sendResponse({ success: true });
  }
  
  if (message.action === 'getBlockedSelectors') {
    sendResponse({ selectors: blockedSelectors });
  }
  
  return true;
});

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentBlocker);
} else {
  initContentBlocker();
}
```

This content script handles:

- Loading user preferences from Chrome's storage
- Hiding elements matching blocked selectors
- Watching for dynamically loaded content
- Listening for updates from other extension components

---

Step 3: Create the Popup Interface {#popup}

The popup provides users with an interface to manage their blocking rules. Create popup.html:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 320px;
      padding: 16px;
      background: #f5f5f5;
    }
    
    h1 {
      font-size: 18px;
      margin-bottom: 12px;
      color: #333;
    }
    
    .section {
      background: white;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    label {
      display: block;
      font-size: 14px;
      color: #555;
      margin-bottom: 8px;
    }
    
    textarea {
      width: 100%;
      height: 100px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      font-family: monospace;
      font-size: 12px;
      resize: vertical;
    }
    
    .btn {
      display: inline-block;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    .btn-primary {
      background: #4285f4;
      color: white;
    }
    
    .btn-primary:hover {
      background: #3367d6;
    }
    
    .btn-secondary {
      background: #e8e8e8;
      color: #333;
    }
    
    .btn-secondary:hover {
      background: #d8d8d8;
    }
    
    .stats {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
    }
    
    .toggle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
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
    
    .slider {
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
    
    .slider:before {
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
    
    input:checked + .slider {
      background-color: #4285f4;
    }
    
    input:checked + .slider:before {
      transform: translateX(20px);
    }
  </style>
</head>
<body>
  <h1>Content Blocker Pro</h1>
  
  <div class="section">
    <div class="toggle-container">
      <label style="margin-bottom: 0;">Enable Blocking</label>
      <label class="toggle">
        <input type="checkbox" id="enableBlocking" checked>
        <span class="slider"></span>
      </label>
    </div>
  </div>
  
  <div class="section">
    <label for="customSelectors">Custom CSS Selectors (one per line)</label>
    <textarea id="customSelectors" placeholder=".class-to-hide&#10;#id-to-block&#10;[attribute*='value']"></textarea>
    <div style="margin-top: 8px;">
      <button id="saveBtn" class="btn btn-primary">Save Rules</button>
      <button id="resetBtn" class="btn btn-secondary">Reset</button>
    </div>
    <p class="stats" id="stats">Rules active: 0</p>
  </div>
  
  <div class="section">
    <label>Quick Actions</label>
    <button id="blockAds" class="btn btn-secondary" style="margin-right: 4px; margin-bottom: 4px;">Block Ads</button>
    <button id="blockSocial" class="btn btn-secondary" style="margin-right: 4px; margin-bottom: 4px;">Block Social</button>
    <button id="blockNotifications" class="btn btn-secondary" style="margin-bottom: 4px;">Block Notifications</button>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now create popup.js to handle user interactions:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const enableBlocking = document.getElementById('enableBlocking');
  const customSelectors = document.getElementById('customSelectors');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const stats = document.getElementById('stats');
  const blockAds = document.getElementById('blockAds');
  const blockSocial = document.getElementById('blockSocial');
  const blockNotifications = document.getElementById('blockNotifications');
  
  // Load saved settings
  loadSettings();
  
  // Save button click handler
  saveBtn.addEventListener('click', async () => {
    const selectors = customSelectors.value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    await chrome.storage.sync.set({
      blockedSelectors: selectors,
      enabled: enableBlocking.checked
    });
    
    // Notify content script of changes
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateBlockedSelectors',
        selectors: selectors
      });
    }
    
    updateStats(selectors.length);
    alert('Settings saved!');
  });
  
  // Reset button click handler
  resetBtn.addEventListener('click', async () => {
    await chrome.storage.sync.set({
      blockedSelectors: [],
      enabled: true
    });
    
    customSelectors.value = '';
    enableBlocking.checked = true;
    updateStats(0);
    
    // Notify content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateBlockedSelectors',
        selectors: []
      });
    }
  });
  
  // Quick action handlers
  blockAds.addEventListener('click', () => addSelectors([
    '.ad', '.ads', '.advertisement', '.advert',
    '[class*="ad-"]', '[id*="ad-"]',
    '.sponsored', '.promoted'
  ]));
  
  blockSocial.addEventListener('click', () => addSelectors([
    '.social-share', '.share-buttons', '.social-buttons',
    '[class*="facebook"]', '[class*="twitter"]', '[class*="linkedin"]',
    '.follow-button', '.subscribe-button'
  ]));
  
  blockNotifications.addEventListener('click', () => addSelectors([
    '.notification', '.notification-banner', '.cookie-notice',
    '.cookie-consent', '[class*="cookie"]', '.gdpr',
    '.newsletter-popup', '.subscribe-popup'
  ]));
  
  async function addSelectors(newSelectors) {
    const current = customSelectors.value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    const combined = [...new Set([...current, ...newSelectors])];
    customSelectors.value = combined.join('\n');
    updateStats(combined.length);
  }
  
  async function loadSettings() {
    const result = await chrome.storage.sync.get(['blockedSelectors', 'enabled']);
    
    if (result.blockedSelectors) {
      customSelectors.value = result.blockedSelectors.join('\n');
      updateStats(result.blockedSelectors.length);
    }
    
    if (result.enabled !== undefined) {
      enableBlocking.checked = result.enabled;
    } else {
      enableBlocking.checked = true;
    }
  }
  
  function updateStats(count) {
    stats.textContent = `Custom rules: ${count}`;
  }
});
```

---

Step 4: Create the Background Service Worker {#background}

The background service worker handles extension lifecycle events. Create background.js:

```javascript
// Background service worker

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Content Blocker Pro installed:', details.reason);
  
  // Set default values on first install
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      blockedSelectors: [],
      enabled: true,
      stats: {
        totalBlocked: 0,
        sitesProtected: 0
      }
    });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    chrome.storage.sync.get(['blockedSelectors', 'enabled'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (message.action === 'recordBlock') {
    chrome.storage.sync.get('stats', (result) => {
      const stats = result.stats || { totalBlocked: 0, sitesProtected: 0 };
      stats.totalBlocked += message.count || 1;
      
      if (message.site) {
        stats.sitesProtected = stats.sitesProtected || new Set();
        stats.sitesProtected.add(message.site);
      }
      
      chrome.storage.sync.set({ stats });
    });
    return true;
  }
});

// Context menu for quick blocking
chrome.contextMenus?.create({
  id: 'blockElement',
  title: 'Block this element',
  contexts: ['page', 'link', 'image']
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'blockElement') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showBlockDialog',
      target: info.targetElementId
    });
  }
});
```

---

Step 5: Create Extension Icons {#icons}

Your extension needs icons. Create a simple icons folder with placeholder PNG files. For testing, you can create basic colored squares, but for publishing, design professional icons.

At minimum, you need:

- icons/icon16.png (16x16 pixels)
- icons/icon48.png (48x48 pixels)
- icons/icon128.png (128x128 pixels)

---

Step 6: Testing Your Extension {#testing}

Now let's test our content blocker extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension folder
4. Navigate to any website with ads or distracting elements
5. Click your extension icon to open the popup
6. Add some custom selectors and click "Save Rules"
7. Refresh the page to see the blocking in action

Debugging Tips

If elements aren't being hidden:

1. Check the console for errors (right-click → Inspect → Console)
2. Verify your CSS selectors are correct
3. Ensure the content script is loading (check the Extensions page)
4. Make sure the page hasn't already loaded the elements before your script runs

Common Selector Issues

```javascript
//  Wrong: Using jQuery-style selectors
$('.ad-container')

//  Correct: Standard CSS selectors
'.ad-container'

//  Wrong: Partial attribute matching without proper syntax
'class*="ad"'

//  Correct: Full attribute selector
'[class*="ad-"]'

//  Multiple attributes
'div.advertisement.promo'
```

---

Advanced Features to Consider {#advanced}

Once you have the basic extension working, consider adding these advanced features:

1. Site-Specific Rules

Allow different blocking rules for different websites:

```javascript
const siteRules = {
  'youtube.com': ['#secondary', '#related'],
  'facebook.com': ['.feedTicker', '.fbFeedTicker'],
  'twitter.com': ['[data-testid="sidebarColumn"]']
};
```

2. Element Blocker Mode

Let users click on elements to block them directly:

```javascript
document.addEventListener('click', (e) => {
  if (isBlockingMode) {
    e.preventDefault();
    const selector = getElementSelector(e.target);
    addToBlockedList(selector);
  }
});
```

3. Import/Export Rules

Allow users to share their blocking configurations:

```javascript
// Export
const exportRules = () => {
  const data = JSON.stringify(blockedSelectors);
  const blob = new Blob([data], { type: 'application/json' });
  // Download file
};

// Import
const importRules = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const imported = JSON.parse(e.target.result);
    // Merge with existing rules
  };
  reader.readAsText(file);
};
```

4. Blocking Statistics

Track and display how many elements have been blocked:

```javascript
function trackBlock(count) {
  chrome.storage.sync.get('stats', (result) => {
    const stats = result.stats || { totalBlocked: 0 };
    stats.totalBlocked += count;
    chrome.storage.sync.set({ stats });
  });
}
```

---

Publishing Your Extension {#publishing}

When you're ready to share your extension with the world:

1. Prepare your listing:
   - Write a compelling description
   - Create screenshots and a promotional image
   - Choose appropriate categories and tags

2. Comply with policies:
   - Review Chrome Web Store policies
   - Ensure your extension doesn't violate any rules
   - Provide a valid privacy policy if needed

3. Submit for review:
   - Zip your extension folder
   - Upload to Chrome Web Store Developer Dashboard
   - Wait for review (usually 24-72 hours)

4. Maintain and update:
   - Respond to user reviews
   - Update regularly for compatibility
   - Fix bugs quickly

---

Conclusion {#conclusion}

Building a content blocker Chrome extension is an excellent project that teaches you valuable skills:

- DOM manipulation and JavaScript
- Chrome Extension APIs (Manifest V3)
- User interface design
- Storage and data management
- Publishing to the Chrome Web Store

The extension we built in this guide provides a solid foundation that you can extend with additional features like site-specific rules, import/export functionality, blocking statistics, and more.

Remember to test thoroughly across different websites and browsers, and always consider user privacy when handling data. With the knowledge from this guide, you're well-equipped to create a polished, professional content blocking extension that can help thousands of users focus on what matters most.

Start building today, and happy coding!
