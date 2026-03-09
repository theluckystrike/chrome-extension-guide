---
layout: post
title: "Build a Distraction-Free Site Blocker Chrome Extension"
description: "Learn how to build a powerful site blocker extension for Chrome to block distracting sites and boost productivity. This comprehensive guide covers Manifest V3, blocking APIs, focus mode implementation, and deployment."
date: 2025-01-25
categories: [guides, chrome-extensions, productivity]
tags: [site blocker extension, block distracting sites, focus mode chrome, chrome extension development, productivity tools, website blocker]
keywords: "site blocker extension, block distracting sites, focus mode chrome, chrome extension blocker, distraction free browser, productivity chrome extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/25/distraction-free-site-blocker-extension/"
---

# Build a Distraction-Free Site Blocker Chrome Extension

In an era where digital distractions compete for every moment of our attention, building a site blocker extension represents one of the most valuable projects a Chrome extension developer can undertake. Whether you are a developer looking to expand your portfolio or someone seeking to eliminate time-wasting websites from your browsing experience, this comprehensive guide will walk you through creating a fully functional distraction-free site blocker Chrome extension using the latest Manifest V3 specifications.

The demand for site blocker extensions has never been higher. Professionals, students, and anyone seeking to improve focus struggle daily with distracting websites that steal precious productivity hours. By learning how to block distracting sites effectively, you not only solve a real problem but also gain valuable experience with Chrome's declarativeNetRequest API, storage APIs, and user interface design within the extension ecosystem.

This guide covers everything from project setup to advanced features like scheduled blocking, focus mode chrome integration, and cross-device synchronization. By the end, you will have a production-ready extension that can be published to the Chrome Web Store and potentially modified for Firefox or Edge using the WebExtensions API.

---

## Understanding the Architecture of a Site Blocker Extension {#architecture-overview}

Before diving into code, it is essential to understand how site blocker extensions work at a fundamental level. Unlike traditional web applications, Chrome extensions operate with elevated privileges that allow them to intercept network requests, modify browser behavior, and persist data across sessions.

### How Site Blocking Works in Manifest V3

Chrome's Manifest V3 introduced significant changes to how extensions can block network requests. The old approach using the webRequest API with blocking permissions has been replaced by the declarativeNetRequest API, which provides a more privacy-focused and performant way to block requests. Instead of inspecting every single network request in real-time, you define rules in advance, and Chrome's engine applies them efficiently.

The declarativeNetRequest API works by matching incoming requests against a set of predefined rules. When a request matches a rule, Chrome can block it, redirect it, or modify headers before the request completes. This approach is significantly faster because the matching happens at the network layer rather than requiring JavaScript execution for each request.

Your extension will need to manage several key components: a user interface for adding and removing blocked sites, a storage system for persisting the blocklist, a rule generation system that compiles your blocklist into declarativeNetRequest rules, and optional features like scheduling and focus mode chrome functionality.

### Core Components and File Structure

A well-organized site blocker extension follows a clear directory structure that separates concerns and makes maintenance easier. The typical structure includes the manifest.json file that defines extension metadata and permissions, a background service worker that handles rule updates and storage operations, a popup HTML and JavaScript for the user interface, content scripts if you want to show blocking notifications on blocked pages, and options page for advanced configuration.

Understanding this architecture ensures your extension remains maintainable as you add features. Each component has a specific responsibility: the manifest declares capabilities, the background script manages data and rules, the popup provides quick access to common actions, and content scripts handle page-specific interactions.

---

## Setting Up Your Development Environment {#project-setup}

Every Chrome extension begins with a properly configured manifest.json file. This JSON file tells Chrome about your extension's capabilities, permissions, and the files it should load.

### Creating the Manifest

For a site blocker extension using Manifest V3, your manifest.json will need several specific permissions. The declarativeNetRequest permission allows you to define blocking rules, storage permission enables persisting the user's blocklist, and scripting permission lets you inject content scripts to show blocking notifications.

```json
{
  "manifest_version": 3,
  "name": "Focus Guard - Site Blocker",
  "version": "1.0.0",
  "description": "Block distracting sites and stay focused with Focus Guard",
  "permissions": [
    "declarativeNetRequest",
    "storage",
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

Notice that we do not include the "webRequestBlocking" permission, as that is no longer available in Manifest V3. Instead, we rely entirely on declarativeNetRequest, which provides equivalent functionality with better performance and privacy.

### Creating the Directory Structure

Create your extension directory with all necessary folders and files. The icons folder should contain PNG images at the specified sizes, while the root directory holds your JavaScript and HTML files. Starting with this organized structure prevents confusion as your project grows.

---

## Implementing the Background Service Worker {#background-service-worker}

The background service worker serves as the central nervous system of your extension. It handles communication between components, manages storage, and generates the blocking rules that declarativeNetRequest uses.

### Initializing Storage and Rules

Your background script needs to initialize default settings when the extension first installs, load the user's blocklist from storage, generate declarativeNetRequest rules from the blocklist, and listen for changes to update rules accordingly.

```javascript
// background.js
const DEFAULT_BLOCKED_SITES = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'reddit.com',
  'youtube.com'
];

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get('blockedSites');
  if (!result.blockedSites) {
    await chrome.storage.local.set({ 
      blockedSites: DEFAULT_BLOCKED_SITES,
      focusMode: false,
      schedule: null
    });
    await updateBlockingRules(DEFAULT_BLOCKED_SITES);
  }
});

// Update blocking rules based on current blocklist
async function updateBlockingRules(blockedSites) {
  const rules = blockedSites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: 'block'
    },
    condition: {
      urlFilter: `.*${site}.*`,
      resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'image', 'script', 'stylesheet']
    }
  }));

  // Always keep rule ID 1 as a catch-all for unblocking
  if (rules.length === 0) {
    rules.push({
      id: 1,
      priority: 1,
      action: { type: 'allow' },
      condition: { urlFilter: '.*' }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
    removeRuleIds: rules.map((_, i) => i + 1)
  });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.blockedSites && areaName === 'local') {
    updateBlockingRules(changes.blockedSites.newValue);
  }
});
```

This code demonstrates the core logic for maintaining and updating your blocking rules. The updateBlockingRules function transforms the user's blocklist into declarativeNetRequest format, and the storage listener ensures rules update automatically when the user modifies their blocklist.

---

## Building the Popup Interface {#popup-interface}

The popup provides quick access to your extension's most common functions. Users should be able to see which sites are blocked, add or remove sites from the blocklist, toggle focus mode on or off, and access the full options page for advanced configuration.

### HTML Structure

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; background: #f5f5f5; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: 600; color: #333; }
    .focus-toggle { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .focus-toggle label { font-size: 14px; font-weight: 500; color: #333; }
    .blocked-sites { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-height: 200px; overflow-y: auto; }
    .site-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid #eee; }
    .site-item:last-child { border-bottom: none; }
    .site-name { font-size: 14px; color: #333; }
    .remove-btn { background: none; border: none; color: #999; cursor: pointer; font-size: 18px; }
    .remove-btn:hover { color: #dc3545; }
    .add-site { display: flex; gap: 8px; margin-top: 16px; }
    .add-site input { flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .add-site button { padding: 8px 16px; background: #4a90d9; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
    .add-site button:hover { background: #3a7bc8; }
    .stats { margin-top: 16px; padding: 12px; background: white; border-radius: 8px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <span class="title">🛡️ Focus Guard</span>
  </div>
  
  <div class="focus-toggle">
    <label for="focusMode">Focus Mode</label>
    <input type="checkbox" id="focusMode">
  </div>
  
  <div class="blocked-sites" id="blockedSites"></div>
  
  <div class="add-site">
    <input type="text" id="newSite" placeholder="Enter domain (e.g., facebook.com)">
    <button id="addBtn">Add</button>
  </div>
  
  <div class="stats" id="stats"></div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Popup JavaScript Logic

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const blockedSitesContainer = document.getElementById('blockedSites');
  const newSiteInput = document.getElementById('newSite');
  const addBtn = document.getElementById('addBtn');
  const focusModeToggle = document.getElementById('focusMode');
  const statsContainer = document.getElementById('stats');
  
  // Load current state
  const result = await chrome.storage.local.get(['blockedSites', 'focusMode', 'blockedCount']);
  const sites = result.blockedSites || [];
  focusModeToggle.checked = result.focusMode || false;
  
  renderSites(sites);
  updateStats(result.blockedCount || 0);
  
  // Add new site
  addBtn.addEventListener('click', async () => {
    const newSite = newSiteInput.value.trim().toLowerCase();
    if (!newSite) return;
    
    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(newSite) && !/^[a-z0-9]+$/.test(newSite)) {
      alert('Please enter a valid domain');
      return;
    }
    
    const updatedSites = [...sites, newSite];
    await chrome.storage.local.set({ blockedSites: updatedSites });
    renderSites(updatedSites);
    newSiteInput.value = '';
  });
  
  // Remove site
  window.removeSite = async (siteToRemove) => {
    const updatedSites = sites.filter(site => site !== siteToRemove);
    await chrome.storage.local.set({ blockedSites: updatedSites });
    renderSites(updatedSites);
  };
  
  // Focus mode toggle
  focusModeToggle.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ focusMode: e.target.checked });
  });
  
  function renderSites(sites) {
    if (sites.length === 0) {
      blockedSitesContainer.innerHTML = '<div class="site-item"><span class="site-name" style="color: #999;">No sites blocked</span></div>';
      return;
    }
    
    blockedSitesContainer.innerHTML = sites.map(site => `
      <div class="site-item">
        <span class="site-name">${site}</span>
        <button class="remove-btn" onclick="removeSite('${site}')">×</button>
      </div>
    `).join('');
  }
  
  function updateStats(count) {
    statsContainer.textContent = `Currently blocking ${count || 0} sites`;
  }
});
```

This popup implementation provides a clean, functional interface for managing blocked sites. The design uses modern styling with subtle shadows and rounded corners, creating a professional appearance consistent with Chrome's own extensions.

---

## Implementing Content Script for Blocking Notifications {#content-script}

When a user tries to visit a blocked site, they should see a clear, helpful message rather than a blank page. The content script handles this by detecting when a page has been blocked and displaying an appropriate notification.

```javascript
// content.js
// This content script runs on blocked pages

// Check if current page was blocked
async function checkBlockedStatus() {
  const tab = await chrome.tabs.getCurrent();
  const url = new URL(tab.url);
  
  const result = await chrome.storage.local.get('blockedSites');
  const blockedSites = result.blockedSites || [];
  
  const isBlocked = blockedSites.some(site => url.hostname.includes(site));
  
  if (isBlocked) {
    showBlockPage(url.hostname);
  }
}

function showBlockPage(hostname) {
  document.body.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 20px;">
      <h1 style="font-size: 48px; margin-bottom: 20px;">🛡️</h1>
      <h2 style="font-size: 28px; margin-bottom: 16px;">Site Blocked</h2>
      <p style="font-size: 18px; margin-bottom: 24px; opacity: 0.9;">${hostname} is on your blocked sites list</p>
      <p style="font-size: 14px; opacity: 0.7; max-width: 400px;">You're staying focused! This site was blocked to help you maintain productivity. Take a deep breath and get back to work.</p>
      <div style="margin-top: 40px; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 12px;">
        <p style="font-size: 14px; margin-bottom: 8px;">Need to access this site?</p>
        <p style="font-size: 12px; opacity: 0.7;">Click the Focus Guard icon in your toolbar to temporarily disable blocking</p>
      </div>
    </div>
  `;
  
  // Clear any existing content and apply our blocking page
  document.documentElement.innerHTML = document.body.innerHTML;
}

checkBlockedStatus();
```

The content script replaces the blocked page with a helpful message that reinforces the user's productivity goals. This positive framing helps users stay motivated rather than feeling punished.

---

## Adding Advanced Features {#advanced-features}

A basic site blocker is useful, but advanced features transform your extension into a truly powerful productivity tool. Consider implementing focus mode chrome functionality, scheduled blocking, custom block pages, and statistics tracking.

### Implementing Focus Mode

Focus mode provides an all-or-nothing approach to blocking. When enabled, it can block all non-essential websites while allowing access only to whitelisted domains. This is particularly useful for deep work sessions.

```javascript
// Add to background.js for focus mode handling
async function applyFocusMode(enabled, blockedSites) {
  if (enabled) {
    // In focus mode, block everything except explicitly allowed sites
    const rules = [
      {
        id: 1,
        priority: 1,
        action: { type: 'block' },
        condition: { urlFilter: '.*', resourceTypes: ['main_frame'] }
      }
    ];
    
    // Add allow rules for productivity sites
    const allowedSites = ['github.com', 'stackoverflow.com', 'docs.google.com', 'notion.so'];
    allowedSites.forEach((site, index) => {
      rules.push({
        id: index + 2,
        priority: 2,
        action: { type: 'allow' },
        condition: {
          urlFilter: `.*${site}.*`,
          resourceTypes: ['main_frame']
        }
      });
    });
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: [1]
    });
  } else {
    // Restore normal blocking behavior
    await updateBlockingRules(blockedSites);
  }
}
```

### Scheduled Blocking

Many users want different blocking rules at different times. You can implement scheduled blocking that automatically enables focus mode during work hours and disables it during breaks.

```javascript
// Add scheduling functionality to background.js
async function checkSchedule() {
  const { schedule, focusMode } = await chrome.storage.local.get(['schedule', 'focusMode']);
  
  if (!schedule || !schedule.enabled) return;
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const daySchedules = schedule.days[currentDay];
  if (!daySchedules) return;
  
  const isWorkDay = daySchedules.enabled && 
    currentTime >= daySchedules.startTime && 
    currentTime < daySchedules.endTime;
  
  if (isWorkDay !== focusMode) {
    await chrome.storage.local.set({ focusMode: isWorkDay });
    await applyFocusMode(isWorkDay);
  }
}

// Check schedule every minute
setInterval(checkSchedule, 60000);
checkSchedule(); // Initial check
```

### Tracking Block Statistics

Understanding your productivity patterns helps users improve their habits. Track how many times each site has been blocked and display this information in the popup.

```javascript
// Add to background.js
chrome.declarativeNetRequest.onRequestDenied.addListener((request) => {
  chrome.storage.local.get('blockedStats', (result) => {
    const stats = result.blockedStats || {};
    const domain = new URL(request.url).hostname;
    stats[domain] = (stats[domain] || 0) + 1;
    chrome.storage.local.set({ 
      blockedStats: stats,
      blockedCount: Object.values(stats).reduce((a, b) => a + b, 0)
    });
  });
}, { urls: ["<all_urls>"] });
```

---

## Testing Your Extension Locally {#testing}

Before publishing to the Chrome Web Store, thoroughly test your extension in development mode. Load your unpacked extension by navigating to chrome://extensions, enabling Developer mode, and clicking Load unpacked. Select your extension directory and test all features thoroughly.

Test adding and removing sites from the blocklist, verify that blocked sites show the blocking page, test focus mode toggle, verify that blocking persists after browser restart, test on multiple Chrome profiles, and check that the extension works in Incognito mode if desired (requires additional permission configuration).

Pay particular attention to edge cases: very long domain names, internationalized domain names, subdomains of blocked sites, and patterns that might accidentally block legitimate sites. Thorough testing prevents negative reviews and user frustration.

---

## Publishing to the Chrome Web Store {#publishing}

Once testing is complete, prepare your extension for publication. Create a zip file containing all your extension files except the .git folder and any development-specific files. Navigate to the Chrome Web Store Developer Dashboard, create a new listing, upload your zip file, fill in the required metadata including description and screenshots, and submit for review.

Chrome's review process typically takes a few hours to a few days. Ensure your extension does not violate any policies, particularly around user privacy and data handling. Clearly explain in your description what data your extension collects and how it is used.

---

## Conclusion and Future Enhancements {#conclusion}

Building a site blocker extension teaches valuable skills while solving a genuine problem affecting millions of productivity-conscious users. You have learned how to work with Chrome's declarativeNetRequest API, implement persistent storage, create intuitive user interfaces, and deploy extensions to the Chrome Web Store.

The foundation you have built can be extended in numerous ways. Consider adding cloud synchronization to share blocklists across devices, implementing pomodoro timer integration, creating custom block page designs, developing analytics dashboards, or adding password protection for changing blocking rules.

The key to a successful extension is solving real user problems while maintaining simplicity and performance. Start with a solid core feature set, gather user feedback, and iterate based on actual usage patterns. With dedication and attention to user needs, your distraction-free site blocker could become an essential tool for thousands of users seeking to reclaim their focus and productivity.
