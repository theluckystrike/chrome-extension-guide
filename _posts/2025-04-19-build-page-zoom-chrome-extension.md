---
layout: post
title: "Build a Page Zoom Chrome Extension: Custom Zoom Levels Per Website"
description: "Learn how to build a Chrome extension that allows custom zoom levels per website. This comprehensive guide covers Manifest V3, storage APIs, content scripts, and best practices for creating a page zoom extension."
date: 2025-04-19
categories: [Chrome Extensions, Tutorials]
tags: [zoom, accessibility, chrome-extension]
keywords: "chrome extension zoom, page zoom chrome extension, custom zoom level chrome, zoom per website chrome, build zoom extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/19/build-page-zoom-chrome-extension/"
---

# Build a Page Zoom Chrome Extension: Custom Zoom Levels Per Website

Have you ever visited a website with text that's too small to read comfortably, or a site with massive images that require constant scrolling? Maybe you need different zoom levels for different websites—your favorite news site at 110%, a documentation site at 125%, and your email at 100%. The built-in Chrome zoom works globally, but what if you want custom zoom levels per website? That's exactly what we'll build in this comprehensive guide.

Building a page zoom Chrome extension with per-site zoom levels is a practical project that teaches you fundamental concepts of Chrome extension development. You'll work with the Chrome Storage API, content scripts, popup interfaces, and the zoom API—skills that transfer to countless other extension projects.

In this tutorial, we'll create a fully functional Chrome extension that remembers your preferred zoom level for each website and automatically applies it when you visit. Let's dive in.

---

## Why Build a Custom Zoom Extension? {#why-build-zoom-extension}

Before we write code, let's understand why a custom zoom extension is valuable. Chrome's built-in zoom feature works at the browser level, applying the same zoom to all websites. While useful, this one-size-fits-all approach has limitations:

### The Problem with Global Zoom

When you set Chrome's zoom to 120%, every website displays at 120%. This creates issues: some sites look perfectly sized while others appear oversized or broken at that zoom level. Text might overflow containers, images might misalign, and responsive designs might break.

Some users need 150% zoom for certain sites due to vision impairment, while keeping other sites at default zoom. Others prefer smaller zoom on information-dense sites like Reddit or Hacker News to see more content at once.

### The Solution: Per-Site Zoom Levels

A custom zoom extension solves this by storing zoom preferences for each domain. When you visit a website, the extension checks if you have a saved preference and applies it automatically. You get the perfect zoom level for every site, without manual adjustment.

This approach demonstrates several key Chrome extension concepts:
- Persisting user preferences with the Chrome Storage API
- Running content scripts on specific pages
- Communicating between extension components
- Building a user-friendly popup interface
- Using the chrome.zoom API

---

## Project Architecture {#project-architecture}

Our zoom extension will consist of four main components:

1. **manifest.json** - The extension configuration file
2. **popup.html/popup.js** - The user interface for setting zoom levels
3. **content.js** - Injected script that applies zoom on each page
4. **background.js** - Service worker for handling extension events

Here's how these components work together:

- When the user visits a website, content.js detects the domain and requests the saved zoom level from storage
- If a preference exists, content.js applies the zoom using chrome.tabs.setZoom
- The user can click the extension icon to open the popup, see the current zoom, and adjust it
- Changes are saved to Chrome's local storage and applied immediately

---

## Step 1: Creating the Manifest {#step-1-manifest}

Every Chrome extension starts with a manifest.json file. We'll use Manifest V3, the current standard:

```json
{
  "manifest_version": 3,
  "name": "Page Zoom - Custom Zoom Per Website",
  "version": "1.0.0",
  "description": "Set custom zoom levels for each website. Remember your preferences automatically.",
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "zoom"
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
      "run_at": "document_start"
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

### Understanding the Permissions

Let's break down the permissions we need:

- **storage**: Allows us to save zoom preferences per domain
- **activeTab**: Access to the currently active tab when user interacts with extension
- **tabs**: Access to tab information including URLs
- **zoom**: Permission to read and modify zoom settings

The host_permissions of `<all_urls>` ensures our extension can work on any website. Content scripts match all URLs so the zoom applies everywhere.

---

## Step 2: Building the Popup Interface {#step-2-popup}

The popup is what users see when they click our extension icon. It displays the current zoom level and allows users to adjust it:

### popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Page Zoom</title>
  <style>
    body {
      width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      margin: 0;
    }
    h1 {
      font-size: 16px;
      margin: 0 0 12px 0;
      color: #333;
    }
    .current-site {
      font-size: 12px;
      color: #666;
      margin-bottom: 16px;
      word-break: break-all;
    }
    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .zoom-level {
      font-size: 24px;
      font-weight: bold;
      color: #4285f4;
      min-width: 60px;
      text-align: center;
    }
    button {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-decrease {
      background: #f1f3f4;
      color: #333;
    }
    .btn-decrease:hover {
      background: #e8eaed;
    }
    .btn-increase {
      background: #f1f3f4;
      color: #333;
    }
    .btn-increase:hover {
      background: #e8eaed;
    }
    .btn-reset {
      width: 100%;
      background: #ea4335;
      color: white;
    }
    .btn-reset:hover {
      background: #d33426;
    }
    .status {
      font-size: 12px;
      color: #34a853;
      margin-top: 8px;
      text-align: center;
      display: none;
    }
    .status.show {
      display: block;
    }
  </style>
</head>
<body>
  <h1>Page Zoom</h1>
  <div class="current-site" id="currentSite">Loading...</div>
  
  <div class="zoom-controls">
    <button class="btn-decrease" id="decrease">−</button>
    <div class="zoom-level" id="zoomLevel">100%</div>
    <button class="btn-increase" id="increase">+</button>
  </div>
  
  <button class="btn-reset" id="reset">Reset to Default</button>
  <div class="status" id="status">Zoom saved!</div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### popup.js

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const zoomLevelEl = document.getElementById('zoomLevel');
  const currentSiteEl = document.getElementById('currentSite');
  const decreaseBtn = document.getElementById('decrease');
  const increaseBtn = document.getElementById('increase');
  const resetBtn = document.getElementById('reset');
  const statusEl = document.getElementById('status');
  
  let currentTab = null;
  let currentZoom = 100;
  let siteDomain = '';
  
  // Get current tab information
  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }
  
  // Extract domain from URL
  function getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }
  
  // Load saved zoom for current site
  async function loadZoom() {
    currentTab = await getCurrentTab();
    if (!currentTab.url || currentTab.url.startsWith('chrome://')) {
      currentSiteEl.textContent = 'Cannot zoom this page';
      return;
    }
    
    siteDomain = getDomain(currentTab.url);
    currentSiteEl.textContent = siteDomain;
    
    // Get current zoom from storage
    const result = await chrome.storage.local.get(siteDomain);
    const savedZoom = result[siteDomain];
    
    if (savedZoom) {
      currentZoom = savedZoom;
    } else {
      // Get the actual zoom from the tab
      const zoomSettings = await chrome.tabs.getZoom(currentTab.id);
      currentZoom = Math.round(zoomSettings * 100);
    }
    
    updateZoomDisplay();
  }
  
  // Update the zoom display
  function updateZoomDisplay() {
    zoomLevelEl.textContent = currentZoom + '%';
  }
  
  // Save zoom level to storage
  async function saveZoom(zoom) {
    if (!siteDomain) return;
    
    const key = siteDomain;
    const value = zoom;
    
    await chrome.storage.local.set({ [key]: value });
    
    // Apply zoom to current tab
    if (currentTab && currentTab.id) {
      await chrome.tabs.setZoom(currentTab.id, zoom / 100);
    }
    
    currentZoom = zoom;
    updateZoomDisplay();
    showStatus();
  }
  
  // Show save status
  function showStatus() {
    statusEl.classList.add('show');
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 1500);
  }
  
  // Decrease zoom
  decreaseBtn.addEventListener('click', () => {
    if (currentZoom > 25) {
      saveZoom(currentZoom - 25);
    }
  });
  
  // Increase zoom
  increaseBtn.addEventListener('click', () => {
    if (currentZoom < 300) {
      saveZoom(currentZoom + 25);
    }
  });
  
  // Reset to default
  resetBtn.addEventListener('click', async () => {
    if (siteDomain) {
      await chrome.storage.local.remove(siteDomain);
      await chrome.tabs.setZoom(currentTab.id, 1);
      currentZoom = 100;
      updateZoomDisplay();
      showStatus();
    }
  });
  
  // Initialize
  loadZoom();
});
```

The popup handles user interactions, saves zoom preferences to storage, and applies zoom changes immediately. It extracts the domain from the current URL and uses that as the key for storing zoom preferences.

---

## Step 3: Content Script for Automatic Zoom {#step-3-content-script}

The content script runs on every page and applies the saved zoom level when the page loads:

```javascript
// content.js - Runs on every page to apply saved zoom

// Extract domain from URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

// Apply saved zoom level
async function applySavedZoom() {
  try {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
      return;
    }
    
    const domain = getDomain(tab.url);
    
    // Check for saved zoom preference
    const result = await chrome.storage.local.get(domain);
    const savedZoom = result[domain];
    
    if (savedZoom) {
      // Apply the saved zoom
      await chrome.tabs.setZoom(tab.id, savedZoom / 100);
      console.log(`[Page Zoom] Applied ${savedZoom}% zoom for ${domain}`);
    }
  } catch (error) {
    console.error('[Page Zoom] Error applying zoom:', error);
  }
}

// Listen for tab updates (navigation within the same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    applySavedZoom();
  }
});

// Also apply on initial load
applySavedZoom();
```

The content script listens for page loads and applies saved zoom preferences. When a user navigates to a new page or refreshes, the script checks for a saved zoom level and applies it automatically.

---

## Step 4: Background Service Worker {#step-4-background}

The background service worker handles extension lifecycle events and can manage zoom settings:

```javascript
// background.js - Service worker for handling extension events

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Page Zoom extension installed');
  }
});

// Handle tab focus changes - reapply zoom when switching tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
      const domain = new URL(tab.url).hostname;
      const result = await chrome.storage.local.get(domain);
      
      if (result[domain]) {
        await chrome.tabs.setZoom(activeInfo.tabId, result[domain] / 100);
      }
    }
  } catch (error) {
    console.error('Error reapplying zoom:', error);
  }
});

console.log('Page Zoom background service worker loaded');
```

The background script ensures that when users switch between tabs, the correct zoom level is applied to each site. This provides a seamless experience across browsing sessions.

---

## Testing Your Extension {#testing}

Now that we've built all the components, let's test the extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension folder
4. The extension icon should appear in your toolbar

Test the functionality:
- Visit any website (e.g., example.com)
- Click the extension icon
- Adjust the zoom using the + and - buttons
- Navigate to a different website
- Notice that each site remembers its own zoom level

---

## Extension Structure Summary {#summary}

Here's the complete file structure for our zoom extension:

```
zoom-extension/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Advanced Features to Consider {#advanced-features}

Once you have the basic extension working, here are some enhancements to consider:

### 1. Zoom Presets

Add preset buttons for common zoom levels (50%, 75%, 100%, 125%, 150%, 200%):

```javascript
const presets = [50, 75, 100, 125, 150, 200];
```

### 2. Keyboard Shortcuts

Add keyboard shortcuts for quick zoom adjustments:

```json
"commands": {
  "zoom-in": {
    "suggested_key": "Ctrl+Plus",
    "description": "Increase zoom level"
  },
  "zoom-out": {
    "suggested_key": "Ctrl+Minus",
    "description": "Decrease zoom level"
  },
  "reset-zoom": {
    "suggested_key": "Ctrl+0",
    "description": "Reset zoom to default"
  }
}
```

### 3. Export/Import Settings

Allow users to backup and restore their zoom preferences:

```javascript
async function exportSettings() {
  const allData = await chrome.storage.local.get(null);
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  // Trigger download
}
```

### 4. Per-Page vs Per-Site Zoom

Store zoom settings at the page level (including path) for even more granularity:

```javascript
const key = `${domain}${pathname}`; // e.g., example.com/products
```

---

## Best Practices {#best-practices}

When building and maintaining your zoom extension, keep these best practices in mind:

### Performance

- Use Chrome Storage instead of localStorage for better extension integration
- Minimize content script overhead by running only necessary code
- Use event-driven architecture instead of polling

### User Experience

- Provide visual feedback when zoom changes
- Support keyboard shortcuts for power users
- Remember the last zoom level for quick access
- Handle edge cases like chrome:// URLs and about: pages

### Privacy

- Clearly explain what data your extension collects (if any)
- Use local storage instead of sync storage unless cross-device sync is needed
- Don't collect or transmit user browsing data

---

## Troubleshooting Common Issues {#troubleshooting}

Here are solutions to common problems you might encounter:

### Zoom Not Applying

If zoom isn't being applied, check:
- Content script is loaded (check Console for errors)
- Storage permissions are correct in manifest
- Tab ID is valid when calling chrome.tabs.setZoom

### Storage Not Persisting

If preferences aren't saved:
- Verify the domain key is being extracted correctly
- Check that chrome.storage.local.set is being called
- Look for console errors in the service worker

### Zoom Conflicts

If other extensions interfere with zoom:
- Use chrome.tabs.setZoomSettings to control zoom behavior
- Consider using content script zoom injection as fallback

---

## Conclusion {#conclusion}

You've now built a complete Chrome extension for custom zoom levels per website. This project demonstrates core Chrome extension concepts including:

- **Manifest V3 configuration** with proper permissions
- **Popup interface** for user interaction
- **Chrome Storage API** for persisting preferences
- **Content scripts** for page-level functionality
- **Background service workers** for cross-tab functionality
- **Zoom API** for controlling page zoom levels

These skills transfer directly to other extension projects. You can now build features like:
- Dark mode toggles per site
- Custom CSS injection
- Reading mode features
- And countless other enhancements

The zoom extension you've built is functional and ready for use. You can publish it to the Chrome Web Store following Google's guidelines, or keep it for personal use. Either way, you've gained valuable experience in Chrome extension development.

Remember to test thoroughly across different websites, handle edge cases gracefully, and always prioritize user privacy and security. Happy coding!

---

## Next Steps {#next-steps}

Ready to take your extension to the next level? Consider:

1. **Publishing to the Chrome Web Store** - Follow the [official publishing guide](https://developer.chrome.com/docs/webstore/publish)
2. **Adding Manifest V2 support** - For users on older Chrome versions
3. **Implementing zoom animations** - Smooth transitions between zoom levels
4. **Adding zoom history** - Quick access to recently used zoom levels

Explore more Chrome extension tutorials in our comprehensive guide to [Chrome Extension Development](/chrome-extension-guide/chrome-extension-development-2025-complete-beginners-guide/).
