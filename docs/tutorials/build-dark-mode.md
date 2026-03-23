---
layout: default
title: "Chrome Extension Dark Mode. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-dark-mode/"
---
Build a Dark Mode Toggle Extension. Full Tutorial

Creating a dark mode extension is one of the most practical projects you can build for Chrome. This tutorial walks you through building a complete dark mode toggle that works on any website, respects per-site preferences, and provides a smooth user experience. By the end, you'll understand how to use the Chrome Scripting API, manage per-site storage, and handle real-time updates across extension contexts.

What We're Building

We'll create a Chrome extension that provides one-click dark mode for any website using CSS filters. The extension will:

- Toggle dark mode with a single click on the toolbar icon
- Store per-site preferences using `@theluckystrike/webext-storage`
- Automatically apply the user's preferred theme when navigating to a site
- Provide an options page for advanced customization
- Show a badge indicator when dark mode is active

The extension uses `activeTab`, `scripting`, and `storage` permissions, making it a great example of practical extension development.

Prerequisites

Before starting, ensure you have:
- Chrome or Chromium-based browser (Edge, Brave, etc.)
- A code editor (VS Code recommended)
- Basic JavaScript/TypeScript knowledge
- Understanding of HTML and CSS

manifest.json. MV3 Configuration

Create your manifest file with the necessary permissions and configuration:

```json
{
  "manifest_version": 3,
  "name": "Dark Mode Toggle",
  "version": "1.0.0",
  "description": "One-click dark mode for any website",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "Toggle Dark Mode"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_start"
  }],
  "options_page": "options.html"
}
```

Step 1: Toggle on Icon Click

The toolbar icon click handler is the entry point for the extension. When clicked, it checks the current site status and toggles accordingly:

```javascript
// background.js
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage();

chrome.action.onClicked.addListener(async (tab) => {
  const url = new URL(tab.url);
  const hostname = url.hostname;
  
  // Get current dark sites list
  const { darkSites = [] } = await storage.get('darkSites') || {};
  const isDark = darkSites.includes(hostname);
  
  // Toggle the site
  const newDarkSites = isDark
    ? darkSites.filter(site => site !== hostname)
    : [...darkSites, hostname];
  
  await storage.set('darkSites', newDarkSites);
  
  // Update icon to reflect state
  chrome.action.setIcon({
    tabId: tab.id,
    path: isDark ? 'icons/light.png' : 'icons/dark.png'
  });
  
  // Send message to content script
  chrome.tabs.sendMessage(tab.id, {
    type: 'TOGGLE_DARK_MODE',
    enabled: !isDark
  });
});
```

The icon changes to reflect the current state for the active tab, giving users immediate visual feedback.

Step 2: CSS Filter Dark Mode

The core of dark mode implementation uses CSS filters to invert colors and shift hues. This approach works on any website without requiring site-specific styles:

```javascript
// content.js
const DARK_MODE_STYLE_ID = 'dark-mode-injection';

function injectDarkMode(enabled) {
  // Remove existing styles if disabling
  if (!enabled) {
    const existing = document.getElementById(DARK_MODE_STYLE_ID);
    existing?.remove();
    return;
  }
  
  // Check if styles already injected
  if (document.getElementById(DARK_MODE_STYLE_ID)) {
    return;
  }
  
  // Create and inject dark mode styles
  const style = document.createElement('style');
  style.id = DARK_MODE_STYLE_ID;
  style.textContent = `
    html {
      filter: invert(1) hue-rotate(180deg);
    }
    
    /* Re-invert images, videos, and other media */
    img, video, canvas, svg, picture, [style*="background-image"] {
      filter: invert(1) hue-rotate(180deg);
    }
    
    /* Preserve transparency for PNGs and SVGs */
    img[src$=".png"], svg[fill="none"] {
      filter: invert(1) hue-rotate(180deg) opacity(0.9);
    }
  `;
  
  document.head.appendChild(style);
}

// Listen for toggle messages from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TOGGLE_DARK_MODE') {
    injectDarkMode(msg.enabled);
    sendResponse({ success: true });
  }
});
```

The CSS filter approach inverts all colors and then rotates the hue by 180 degrees to maintain color relationships. Images and videos need to be re-inverted to appear normal.

Step 3: Auto-Apply on Navigation

Content scripts need to check storage for domain preferences when the page loads. Using `@theluckystrike/webext-storage` simplifies this with its watch functionality:

```javascript
// content.js
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage();

async function initializeDarkMode() {
  const hostname = window.location.hostname;
  const { darkSites = [] } = await storage.get('darkSites') || {};
  
  if (darkSites.includes(hostname)) {
    injectDarkMode(true);
  }
}

// Watch for real-time changes from background/popup
storage.watch('darkSites', (newVal, oldVal, area) => {
  const hostname = window.location.hostname;
  const isDark = newVal?.includes(hostname);
  injectDarkMode(isDark);
});

// Handle SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    initializeDarkMode();
  }
}).observe(document.body, { subtree: true, childList: true });

// Initialize on load
initializeDarkMode();
```

The MutationObserver handles Single Page Applications (SPAs) that change content without full page reloads.

Step 4: Options Page

The options page allows users to customize dark mode behavior, including brightness adjustments, contrast controls, and site-specific exceptions:

```html
<!-- options.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Dark Mode Options</title>
  <style>
    body { font-family: system-ui; max-width: 600px; margin: 2rem auto; padding: 1rem; }
    .setting { margin-bottom: 1.5rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
    input[type="range"] { width: 100%; }
    .exclude-list { width: 100%; height: 150px; }
    .custom-css { width: 100%; height: 200px; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Dark Mode Settings</h1>
  
  <div class="setting">
    <label>Brightness Adjustment: <span id="brightnessVal">100%</span></label>
    <input type="range" id="brightness" min="50" max="150" value="100">
  </div>
  
  <div class="setting">
    <label>Contrast Adjustment: <span id="contrastVal">100%</span></label>
    <input type="range" id="contrast" min="50" max="150" value="100">
  </div>
  
  <div class="setting">
    <label>Exclude Sites (one per line)</label>
    <textarea id="excludeList" class="exclude-list"></textarea>
  </div>
  
  <div class="setting">
    <label>Custom CSS</label>
    <textarea id="customCSS" class="custom-css" placeholder="/* Add your custom styles here */"></textarea>
  </div>
  
  <button id="save">Save Settings</button>
  
  <script src="options.js"></script>
</body>
</html>
```

```javascript
// options.js
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage();

async function loadSettings() {
  const settings = await storage.get('darkModeSettings') || {};
  
  document.getElementById('brightness').value = settings.brightness || 100;
  document.getElementById('contrast').value = settings.contrast || 100;
  document.getElementById('excludeList').value = (settings.excludeSites || []).join('\n');
  document.getElementById('customCSS').value = settings.customCSS || '';
  
  updateLabels();
}

function updateLabels() {
  document.getElementById('brightnessVal').textContent = 
    document.getElementById('brightness').value + '%';
  document.getElementById('contrastVal').textContent = 
    document.getElementById('contrast').value + '%';
}

async function saveSettings() {
  const settings = {
    brightness: parseInt(document.getElementById('brightness').value),
    contrast: parseInt(document.getElementById('contrast').value),
    excludeSites: document.getElementById('excludeList').value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s),
    customCSS: document.getElementById('customCSS').value
  };
  
  await storage.set('darkModeSettings', settings);
  alert('Settings saved!');
}

document.getElementById('brightness').addEventListener('input', updateLabels);
document.getElementById('contrast').addEventListener('input', updateLabels);
document.getElementById('save').addEventListener('click', saveSettings);

loadSettings();
```

Step 5: Badge Indicator

Show the current state in the extension badge for quick visual feedback:

```javascript
// background.js - Update badge on state change
async function updateBadge(tabId, enabled) {
  if (enabled) {
    await chrome.action.setBadgeText({ tabId, text: 'ON' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#4CAF50' });
  } else {
    await chrome.action.setBadgeText({ tabId, text: '' });
  }
}
```

Alternative: Custom Stylesheet Injection

For more control over the dark mode appearance, inject custom stylesheets per domain. This approach provides better visual results but requires more maintenance:

```javascript
// Custom stylesheet injection
async function injectCustomStyles(hostname) {
  const stylesheetPath = `styles/${hostname}.css`;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: [stylesheetPath]
    });
  } catch (error) {
    // Fallback to default styles if custom not found
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['styles/default-dark.css']
    });
  }
}
```

Create site-specific CSS files in the `styles/` directory and reference them in `web_accessible_resources` in the manifest.

Testing Your Extension

Test thoroughly across different types of websites:

1. Image-heavy sites: Verify images are properly re-inverted
2. Video sites: Check video playback and controls
3. SPAs: Test navigation within single-page applications
4. Per-site persistence: Toggle dark mode, navigate away, return - it should persist
5. Sync across devices: If using sync storage, verify preferences sync

```javascript
// Debug content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'DEBUG') {
    console.log('Current state:', {
      url: window.location.href,
      hostname: window.location.hostname,
      styleInjected: !!document.getElementById('dark-mode-injection')
    });
  }
});
```

Common Use Cases

1. Quick Dark Mode Toggle
The most common use case is toggling dark mode with a single click on the toolbar icon. Users browse their favorite sites and want instant dark mode without configuration.

2. Per-Site Preferences
Users often want dark mode on some sites but not others. The per-site storage approach ensures preferences persist across browser sessions.

3. Developer Mode
Developers frequently use dark mode extensions to reduce eye strain during late-night coding sessions across multiple browser tabs.

4. Accessibility Support
Some users with light sensitivity or visual impairments benefit from dark mode options. Adding contrast and brightness controls improves accessibility.

5. Reading Mode
Dark mode serves as a reading mode for content-heavy sites, reducing eye strain during extended reading sessions.

Best Practices

1. Use CSS filters over custom styles: Filters work universally without site-specific CSS
2. Respect user preferences: Store per-site settings and honor them automatically
3. Handle SPAs: Use MutationObserver for single-page application navigation
4. Clean up styles: Always remove injected styles when disabling dark mode
5. Provide visual feedback: Update icons and badges to show current state
6. Support sync storage: Let users' preferences sync across their devices
7. Handle edge cases: Gracefully handle sites with complex CSS or frames
8. Test extensively: Verify behavior across different site types and browsers

What You Learned

In this tutorial, you built a complete dark mode extension that demonstrates:

- Using `chrome.scripting.executeScript` to inject CSS into pages
- Implementing the `activeTab` pattern for minimal permissions
- Storing per-site preferences with `@theluckystrike/webext-storage`
- Using CSS filters for universal dark mode
- Implementing storage.watch() for real-time updates
- Creating an options page for user customization
- Adding badge indicators for visual state feedback

This foundation can be extended with advanced features like custom themes, scheduled dark mode (follow system preference), or site-specific CSS overrides for better visual results.

What We're Building {#what-were-building}
- One-click dark mode for any website using CSS filters
- Per-site preferences stored with `@theluckystrike/webext-storage`
- Toggle via toolbar icon, auto-apply on navigation
- Uses `activeTab`, `scripting`, `storage` permissions

manifest.json. MV3, activeTab + scripting + storage, action with icon, background SW {#manifestjson-mv3-activetab-scripting-storage-action-with-icon-background-sw}

Step 1: Toggle on Icon Click {#step-1-toggle-on-icon-click}
- `chrome.action.onClicked` listener in background
- Check domain state from storage, toggle, inject CSS via `chrome.scripting.executeScript`
- Update icon to show dark/light state

Step 2: CSS Filter Dark Mode {#step-2-css-filter-dark-mode}
- `html { filter: invert(1) hue-rotate(180deg); }`
- Re-invert images/videos: `img, video, canvas, svg { filter: invert(1) hue-rotate(180deg); }`
- Insert/remove `<style>` element with unique ID

Step 3: Auto-Apply on Navigation {#step-3-auto-apply-on-navigation}
- Content script checks storage for domain preference on load
- `storage.watch('darkSites', ...)` for real-time toggle from background/popup
- Uses `@theluckystrike/webext-messaging` for background <-> content communication

Step 4: Options Page {#step-4-options-page}
- Brightness/contrast sliders, exclude list, custom CSS per domain
- All preferences in `@theluckystrike/webext-storage` sync storage

Step 5: Badge Indicator. show "ON" when dark mode active on current tab {#step-5-badge-indicator-show-on-when-dark-mode-active-on-current-tab}

Alternative: Custom Stylesheet Injection. more control, per-site CSS files via web_accessible_resources {#alternative-custom-stylesheet-injection-more-control-per-site-css-files-via-web-accessible-resources}

Testing. various site types, image handling, per-site persistence, sync across devices {#testing-various-site-types-image-handling-per-site-persistence-sync-across-devices}

What You Learned. scripting.executeScript, activeTab pattern, per-site preferences, CSS filters, storage.watch {#what-you-learned-scriptingexecutescript-activetab-pattern-per-site-preferences-css-filters-storagewatch}
What You Learned. scripting.executeScript, activeTab pattern, per-site preferences, CSS filters, storage.watch
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

