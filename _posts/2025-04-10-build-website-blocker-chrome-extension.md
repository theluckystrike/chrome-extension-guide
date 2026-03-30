---
layout: post
title: "Build a Website Blocker Chrome Extension: Focus Mode for Productivity"
description: "Learn how to build a powerful website blocker Chrome extension with focus mode, custom blocklists, and productivity timers. Boost your productivity by blocking distracting websites in Chrome today."
date: 2025-04-10
last_modified_at: 2025-04-10
categories: [Chrome-Extensions, Productivity]
tags: [website-blocker, focus, chrome-extension]
author: theluckystrike
canonical_url: "https://bestchromeextensions.com/2025/04/10/build-website-blocker-chrome-extension/"
---

Build a Website Blocker Chrome Extension: Focus Mode for Productivity

maintaining concentration has become increasingly challenging. Social media platforms, news websites, and entertainment portals constantly compete for our attention, often derailing productivity sessions in mere seconds. Whether you're a developer trying to complete a coding project, a student preparing for exams, or a professional working on important deadlines, learning how to build a chrome extension website blocker can transform your workflow and help you reclaim focus.

This comprehensive guide will walk you through creating a fully functional focus mode chrome extension that blocks distracting websites, provides customizable timers, and delivers detailed productivity analytics. By the end of this tutorial, you'll have a production-ready extension that can be published to the Chrome Web Store and potentially help thousands of users combat digital distractions.

---

Why Build a Website Blocker Chrome Extension?

The demand for effective productivity blocker chrome solutions has never been higher. Millions of users actively search for tools to help them stay focused, making this one of the most popular extension categories in the Chrome Web Store. Building this type of extension offers several compelling benefits:

Market Opportunity

The productivity app market continues to grow exponentially as remote work becomes the norm. Users are actively seeking chrome extension website blocker solutions that integrate smoothly with their browsing experience. By building a site blocker extension, you're addressing a proven market need with significant download potential.

Technical Learning Experience

Creating a focus mode chrome extension teaches you essential Chrome extension development skills that transfer to virtually any extension project:

- Declarative Net Request API: The modern, privacy-focused way to block network requests in Manifest V3
- Storage API: For persisting user preferences, blocklists, and productivity data
- Alarms API: For scheduling focus sessions and timed blocks
- Notifications API: For alerting users when they attempt to visit blocked sites
- Message Passing: For smooth communication between popup, background scripts, and content scripts
- Chrome Storage Sync: For synchronizing settings across devices

Real-World Impact

Perhaps most importantly, building a website blocker chrome extension allows you to create a tool that genuinely improves people's lives. Students use these extensions to focus on studies, professionals use them to meet deadlines, and anyone seeking to reduce screen time can benefit from a well-designed focus mode chrome extension.

---

Understanding the Chrome Extension Architecture

Before diving into code, let's establish a solid understanding of how Chrome extensions work, particularly for blocking functionality.

Manifest V3 Requirements

Chrome's Manifest V3 (MV3) introduced significant changes to how extensions can block content. Unlike the previous Manifest V2, where you could use the webRequest API to block requests synchronously, MV3 requires using the Declarative Net Request (DNR) API. This approach is more privacy-conscious because extensions no longer need to inspect every network request, instead, you define blocking rules that Chrome evaluates internally.

For our chrome extension website blocker, we'll need the following key permissions:

- `storage`: To save user preferences and blocklists
- `alarms`: To trigger focus session timers
- `notifications`: To alert users about blocked attempts
- `declarativeNetRequest`: To define and manage blocking rules
- `declarativeNetRequestWithHostAccess`: To block specific website hosts

Extension Components Overview

Our focus mode chrome extension will consist of several interconnected components:

1. Manifest File: Configuration and permissions declaration
2. Background Service Worker: Manages blocking rules and alarm triggers
3. Popup Interface: User-facing controls for managing blocklists and timers
4. Content Script: Injected into pages to provide visual feedback when sites are blocked
5. Options Page: Advanced settings and customization options

---

Step-by-Step Implementation Guide

Let's build our website blocker chrome extension step by step.

Step 1: Project Structure Setup

Create a new directory for your extension and set up the following file structure:

```
focus-blocker/
 manifest.json
 background.js
 popup/
    popup.html
    popup.js
    popup.css
 content.js
 options.html
 options.js
 icons/
     icon16.png
     icon48.png
     icon128.png
```

Step 2: Creating the Manifest File

The manifest.json file is the heart of your chrome extension website blocker. Here's the complete configuration:

```json
{
  "manifest_version": 3,
  "name": "Focus Mode - Website Blocker",
  "version": "1.0.0",
  "description": "Block distracting websites and boost productivity with customizable focus timers and blocklists",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess"
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
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest declares all necessary permissions for our productivity blocker chrome extension. The `declarativeNetRequest` permission is essential for the actual website blocking functionality.

Step 3: Implementing the Background Service Worker

The background service worker manages blocking rules, handles alarms for focus sessions, and coordinates communication between different parts of your chrome extension website blocker. Create `background.js`:

```javascript
// Background service worker for Focus Mode Website Blocker

// Default blocklist for distracting websites
const DEFAULT_BLOCKLIST = [
  { pattern: '*://*.facebook.com/*', enabled: true },
  { pattern: '*://*.twitter.com/*', enabled: true },
  { pattern: '*://*.instagram.com/*', enabled: true },
  { pattern: '*://*.tiktok.com/*', enabled: true },
  { pattern: '*://*.reddit.com/*', enabled: true },
  { pattern: '*://*.youtube.com/*', enabled: false },
  { pattern: '*://*.netflix.com/*', enabled: true }
];

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default configuration
    await chrome.storage.local.set({
      blocklist: DEFAULT_BLOCKLIST,
      focusMode: false,
      focusDuration: 25, // 25 minutes (Pomodoro)
      blockedCount: 0,
      sitesVisited: []
    });
    
    // Initialize default blocking rules
    await updateBlockingRules(DEFAULT_BLOCKLIST.filter(s => s.enabled));
  }
});

// Update blocking rules based on current blocklist
async function updateBlockingRules(activeRules) {
  const rules = activeRules.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: site.pattern.replace('*://', '').replace('/*', ''),
      resourceTypes: ['main_frame']
    }
  }));

  // Get existing rules and remove them
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleIdsToRemove = existingRules.map(rule => rule.id);
  
  // Add new rules
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIdsToRemove,
    addRules: rules
  });
}

// Handle focus mode timer
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'focusTimer') {
    await chrome.storage.local.set({ focusMode: false });
    
    // Show notification when focus session ends
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Focus Session Complete!',
      message: 'Great work! Your focus session has ended. Take a break or start another session.'
    });
    
    // Disable blocking rules when focus mode ends
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: (await chrome.declarativeNetRequest.getDynamicRules()).map(r => r.id)
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleFocusMode') {
    handleFocusModeToggle(message.enabled, message.duration);
  } else if (message.action === 'updateBlocklist') {
    updateBlockingRules(message.blocklist.filter(s => s.enabled));
  } else if (message.action === 'getStats') {
    getStatistics().then(sendResponse);
    return true;
  }
});

async function handleFocusModeToggle(enabled, duration) {
  await chrome.storage.local.set({ focusMode: enabled, focusDuration: duration });
  
  if (enabled) {
    // Set alarm for focus duration
    chrome.alarms.create('focusTimer', { delayInMinutes: duration });
    
    // Get current blocklist and activate blocking
    const { blocklist } = await chrome.storage.local.get('blocklist');
    await updateBlockingRules(blocklist.filter(s => s.enabled));
  } else {
    // Cancel any existing alarm
    chrome.alarms.clear('focusTimer');
    
    // Remove all blocking rules
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map(r => r.id)
    });
  }
}

async function getStatistics() {
  const data = await chrome.storage.local.get(['blockedCount', 'sitesVisited', 'focusMode']);
  return data;
}

// Track blocked attempts
chrome.webNavigation.onCompleted.addListener(async (details) => {
  const { blocklist, focusMode } = await chrome.storage.local.get(['blocklist', 'focusMode']);
  
  if (focusMode) {
    const url = new URL(details.url);
    const blocked = blocklist.some(s => 
      s.enabled && url.hostname.includes(s.pattern.replace('*://*.', '').replace('/*', ''))
    );
    
    if (blocked) {
      const { blockedCount, sitesVisited } = await chrome.storage.local.get(['blockedCount', 'sitesVisited']);
      await chrome.storage.local.set({
        blockedCount: blockedCount + 1,
        sitesVisited: [...sitesVisited, { url: url.hostname, time: Date.now() }]
      });
    }
  }
}, { url: [{ schemes: ['http', 'https'] }] });
```

This background script handles all the core functionality of your chrome extension website blocker, including managing blocking rules, handling focus mode timers, and tracking statistics.

Step 4: Building the Popup Interface

The popup is what users interact with most frequently. Create an intuitive interface in `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Focus Mode</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1> Focus Mode</h1>
      <p class="subtitle">Block distracting websites and boost productivity</p>
    </header>

    <section class="focus-toggle">
      <label class="switch">
        <input type="checkbox" id="focusToggle">
        <span class="slider"></span>
      </label>
      <span id="focusStatus">Focus Mode Off</span>
    </section>

    <section class="timer-section">
      <label for="duration">Focus Duration:</label>
      <select id="duration">
        <option value="15">15 minutes</option>
        <option value="25" selected>25 minutes</option>
        <option value="30">30 minutes</option>
        <option value="45">45 minutes</option>
        <option value="60">1 hour</option>
        <option value="90">1.5 hours</option>
        <option value="120">2 hours</option>
      </select>
    </section>

    <section class="stats-section">
      <h2> Today's Stats</h2>
      <div class="stat-item">
        <span class="stat-label">Sites Blocked:</span>
        <span class="stat-value" id="blockedCount">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Focus Sessions:</span>
        <span class="stat-value" id="sessionCount">0</span>
      </div>
    </section>

    <section class="quick-block">
      <h2> Quick Block</h2>
      <div class="quick-actions">
        <button class="btn btn-add" id="addCurrentSite">Block Current Site</button>
        <button class="btn btn-secondary" id="openOptions">Manage Blocklist</button>
      </div>
    </section>

    <footer>
      <a href="#" id="optionsLink"> Advanced Settings</a>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Step 5: Styling the Popup

Create visually appealing styles in `popup/popup.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  min-height: 400px;
}

.container {
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 24px;
  margin-bottom: 5px;
}

.subtitle {
  font-size: 12px;
  opacity: 0.9;
}

section {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  backdrop-filter: blur(10px);
}

h2 {
  font-size: 14px;
  margin-bottom: 10px;
  opacity: 0.9;
}

/* Focus Toggle */
.focus-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.switch {
  position: relative;
  display: inline-block;
  width: 56px;
  height: 28px;
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
  background-color: rgba(255, 255, 255, 0.3);
  transition: 0.3s;
  border-radius: 28px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #10b981;
}

input:checked + .slider:before {
  transform: translateX(28px);
}

#focusStatus {
  font-weight: 600;
  font-size: 14px;
}

/* Timer Section */
.timer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timer-section label {
  font-size: 13px;
  opacity: 0.9;
}

select {
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 14px;
  cursor: pointer;
}

/* Stats */
.stats-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.stat-label {
  font-size: 11px;
  opacity: 0.8;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
}

/* Buttons */
.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.btn-add {
  background: #10b981;
  color: white;
}

.btn-add:hover {
  background: #059669;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Footer */
footer {
  text-align: center;
}

footer a {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 12px;
}

footer a:hover {
  color: white;
}
```

Step 6: Implementing Popup Functionality

The popup JavaScript connects the UI to the background service worker:

```javascript
// Popup script for Focus Mode Website Blocker

document.addEventListener('DOMContentLoaded', async () => {
  // Load current state
  const { focusMode, focusDuration, blockedCount, sessionCount } = 
    await chrome.storage.local.get(['focusMode', 'focusDuration', 'blockedCount', 'sessionCount']);
  
  // Update UI with current state
  document.getElementById('focusToggle').checked = focusMode;
  document.getElementById('focusStatus').textContent = 
    focusMode ? 'Focus Mode On' : 'Focus Mode Off';
  document.getElementById('duration').value = focusDuration || 25;
  document.getElementById('blockedCount').textContent = blockedCount || 0;
  document.getElementById('sessionCount').textContent = sessionCount || 0;

  // Focus mode toggle handler
  document.getElementById('focusToggle').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    const duration = parseInt(document.getElementById('duration').value);
    
    // Update session count if enabling
    if (enabled) {
      const { sessionCount } = await chrome.storage.local.get('sessionCount');
      await chrome.storage.local.set({ sessionCount: (sessionCount || 0) + 1 });
    }
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'toggleFocusMode',
      enabled,
      duration
    });
    
    document.getElementById('focusStatus').textContent = 
      enabled ? 'Focus Mode On' : 'Focus Mode Off';
  });

  // Duration change handler
  document.getElementById('duration').addEventListener('change', async (e) => {
    const duration = parseInt(e.target.value);
    await chrome.storage.local.set({ focusDuration: duration });
    
    // If focus mode is active, update the alarm
    const { focusMode } = await chrome.storage.local.get('focusMode');
    if (focusMode) {
      chrome.alarms.clear('focusTimer');
      chrome.alarms.create('focusTimer', { delayInMinutes: duration });
    }
  });

  // Block current site button
  document.getElementById('addCurrentSite').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      
      const { blocklist } = await chrome.storage.local.get('blocklist');
      
      // Check if already in blocklist
      const exists = blocklist.some(s => s.pattern.includes(hostname));
      
      if (!exists) {
        const newPattern = `*://*.${hostname}/*`;
        blocklist.push({ pattern: newPattern, enabled: true });
        await chrome.storage.local.set({ blocklist });
        
        // Update blocking rules
        chrome.runtime.sendMessage({
          action: 'updateBlocklist',
          blocklist
        });
        
        alert(` ${hostname} has been added to your blocklist!`);
      } else {
        alert(`ℹ ${hostname} is already in your blocklist!`);
      }
    }
  });

  // Open options page
  document.getElementById('openOptions').addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  document.getElementById('optionsLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('openOptions').click();
  });
});
```

Step 7: Creating the Options Page

The options page allows users to manage their blocklist and customize settings:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Focus Mode - Settings</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .blocklist-item {
      display: flex;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    .blocklist-item input[type="checkbox"] {
      margin-right: 10px;
    }
    .blocklist-item .pattern {
      flex: 1;
      font-family: monospace;
    }
    .blocklist-item .delete {
      color: red;
      cursor: pointer;
      margin-left: 10px;
    }
    #newSite {
      width: 70%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    #addSite {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1> Focus Mode Settings</h1>
  
  <div class="section">
    <h2>Manage Blocklist</h2>
    <div id="blocklist"></div>
    <div style="margin-top: 15px;">
      <input type="text" id="newSite" placeholder="Enter website (e.g., example.com)">
      <button id="addSite">Add Site</button>
    </div>
  </div>

  <div class="section">
    <h2>Focus Session Settings</h2>
    <label>
      Default Duration: 
      <select id="defaultDuration">
        <option value="15">15 minutes</option>
        <option value="25" selected>25 minutes</option>
        <option value="30">30 minutes</option>
        <option value="45">45 minutes</option>
        <option value="60">1 hour</option>
      </select>
    </label>
  </div>

  <script src="options.js"></script>
</body>
</html>
```

Step 8: Implementing Options Page Logic

Create `options.js` to handle the blocklist management:

```javascript
// Options page script for Focus Mode

document.addEventListener('DOMContentLoaded', async () => {
  const { blocklist, focusDuration } = await chrome.storage.local.get(['blocklist', 'focusDuration']);
  
  renderBlocklist(blocklist || []);
  document.getElementById('defaultDuration').value = focusDuration || 25;

  // Add site handler
  document.getElementById('addSite').addEventListener('click', async () => {
    const input = document.getElementById('newSite');
    const domain = input.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    if (domain) {
      const { blocklist } = await chrome.storage.local.get('blocklist');
      const newPattern = `*://*.${domain}/*`;
      
      if (!blocklist.some(s => s.pattern === newPattern)) {
        blocklist.push({ pattern: newPattern, enabled: true });
        await chrome.storage.local.set({ blocklist });
        renderBlocklist(blocklist);
        input.value = '';
        
        // Update blocking rules if focus mode is active
        const { focusMode } = await chrome.storage.local.get('focusMode');
        if (focusMode) {
          chrome.runtime.sendMessage({
            action: 'updateBlocklist',
            blocklist
          });
        }
      }
    }
  });

  // Duration change handler
  document.getElementById('defaultDuration').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ focusDuration: parseInt(e.target.value) });
  });
});

function renderBlocklist(blocklist) {
  const container = document.getElementById('blocklist');
  container.innerHTML = '';
  
  blocklist.forEach((site, index) => {
    const item = document.createElement('div');
    item.className = 'blocklist-item';
    item.innerHTML = `
      <input type="checkbox" ${site.enabled ? 'checked' : ''} data-index="${index}">
      <span class="pattern">${site.pattern}</span>
      <span class="delete" data-index="${index}"></span>
    `;
    container.appendChild(item);
  });

  // Add event listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const index = parseInt(e.target.dataset.index);
      blocklist[index].enabled = e.target.checked;
      await chrome.storage.local.set({ blocklist });
      
      // Update blocking rules
      const { focusMode } = await chrome.storage.local.get('focusMode');
      if (focusMode) {
        chrome.runtime.sendMessage({
          action: 'updateBlocklist',
          blocklist
        });
      }
    });
  });

  container.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.dataset.index);
      blocklist.splice(index, 1);
      await chrome.storage.local.set({ blocklist });
      renderBlocklist(blocklist);
      
      // Update blocking rules
      const { focusMode } = await chrome.storage.local.get('focusMode');
      if (focusMode) {
        chrome.runtime.sendMessage({
          action: 'updateBlocklist',
          blocklist
        });
      }
    });
  });
}
```

---

Testing Your Website Blocker Chrome Extension

Now that you've built all the components, let's test your focus mode chrome extension:

1. Load the extension:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select your `focus-blocker` directory

2. Verify basic functionality:
   - Click the extension icon to open the popup
   - Toggle Focus Mode on and verify the status changes
   - Try to visit a blocked website (like facebook.com)
   - You should see a "This page has been blocked" message

3. Test the blocklist:
   - Click "Manage Blocklist" to open options
   - Add a new website to block
   - Enable Focus Mode and verify the new site is blocked

4. Test the timer:
   - Select a short duration (like 5 minutes for testing)
   - Enable Focus Mode
   - Wait for the timer to complete
   - Verify you receive a notification when the session ends

---

Advanced Features to Consider

Once you have the basic chrome extension website blocker working, consider adding these advanced features:

1. Whitelist Mode
Instead of blocking specific sites, allow only certain sites (the inverse of blocking). This is useful for work environments where you want to restrict browsing to work-related domains only.

2. Schedule-Based Blocking
Implement automatic focus mode activation based on time schedules. Users can set "work hours" during which distracting sites are automatically blocked.

3. Gradual Blocking
Instead of immediately blocking, show a countdown that allows users to close the tab or click "Wait 5 more minutes." This reduces frustration while still encouraging focus.

4. Productivity Analytics
Track and display detailed statistics about focus sessions, blocked attempts, and productivity trends over time. Users love seeing their progress visualized.

5. Cloud Sync
Implement chrome.storage.sync to allow users to synchronize their blocklist and settings across multiple devices.

6. Browser Action Badges
Display a badge showing the remaining focus time directly on the extension icon for quick glanceability.

---

Publishing Your Chrome Extension Website Blocker

When you're ready to share your focus mode chrome extension with the world:

1. Prepare your listing:
   - Create compelling screenshots showing the popup, options page, and blocked page
   - Write a detailed description highlighting key features
   - Choose appropriate categories and tags

2. Verify compliance:
   - Ensure your extension follows Chrome Web Store policies
   - Verify you have proper icon sizes (128x128, 48x48, 16x16)
   - Test thoroughly to ensure no errors or crashes

3. Submit for review:
   - Create a developer account if you don't have one
   - Upload your extension as a ZIP file
   - Pay the one-time developer registration fee ($5)

---

Conclusion

Building a chrome extension website blocker is an excellent project that combines practical utility with valuable technical learning. You've now created a fully functional focus mode chrome extension that demonstrates:

- How to use the Declarative Net Request API for website blocking
- How to implement focus timers with the Alarms API
- How to create intuitive popup and options interfaces
- How to persist user preferences with the Storage API
- How to communicate between extension components

This foundation opens doors to building more sophisticated productivity tools, from full-featured project management extensions to advanced content filtering solutions. The skills you've learned here are directly transferable to virtually any Chrome extension project you might tackle in the future.

Remember, the best extensions solve real problems, and with digital distractions at an all-time high, a well-designed productivity blocker chrome extension addresses a genuine need. With further development, customization, and user feedback, your focus mode chrome extension has the potential to help thousands of users reclaim their attention and boost their productivity.

Start building today, and transform the way people work online!
