# Build a Dark Mode Toggle Extension — Full Tutorial

This tutorial walks you through building a Chrome extension that adds a dark mode toggle to any website. You'll learn how to inject CSS, manage per-site preferences, and create a polished user experience with an options page.

## What We're Building

By the end of this tutorial, you'll have created an extension that:

- Applies one-click dark mode to any website using CSS filters
- Remembers per-site dark mode preferences using `@theluckystrike/webext-storage`
- Provides a toggle via the toolbar icon with auto-apply on navigation
- Uses the `activeTab`, `scripting`, and `storage` permissions

## Prerequisites

Before starting, make sure you have:

- A Chrome or Chromium-based browser for testing
- Node.js and npm installed
- Basic familiarity with JavaScript and CSS

## manifest.json Configuration

First, let's set up the manifest with the required permissions and configuration:

```json
{
  "manifest_version": 3,
  "name": "Dark Mode Toggle",
  "version": "1.0",
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
    }
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

This manifest uses MV3 with the three permissions needed for our functionality.

## Step 1: Toggle on Icon Click

The core interaction happens in the background service worker. When the user clicks the extension icon, we check the current domain's dark mode state and toggle it accordingly.

Create `background.js`:

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  const domain = new URL(tab.url).hostname;
  
  // Get current dark mode state for this domain
  const { darkSites = {} } = await chrome.storage.local.get('darkSites');
  const isDark = darkSites[domain];
  
  // Toggle the state
  const newState = !isDark;
  
  // Save the new state
  darkSites[domain] = newState;
  await chrome.storage.local.set({ darkSites });
  
  // Apply or remove dark mode
  if (newState) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectDarkMode
    });
  } else {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: removeDarkMode
    });
  }
  
  // Update icon to reflect current state
  updateIcon(tab.id, newState);
});

function updateIcon(tabId, isDark) {
  // Update the icon based on dark mode state
  chrome.action.setIcon({
    tabId: tabId,
    path: isDark ? 'icons/dark.png' : 'icons/light.png'
  });
}

// These functions run in the context of the content page
function injectDarkMode() {
  const styleId = 'dark-mode-injected-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    html { 
      filter: invert(1) hue-rotate(180deg); 
    }
    img, video, canvas, svg { 
      filter: invert(1) hue-rotate(180deg); 
    }
  `;
  document.head.appendChild(style);
}

function removeDarkMode() {
  const style = document.getElementById('dark-mode-injected-styles');
  if (style) {
    style.remove();
  }
}
```

The `chrome.action.onClicked` listener fires when the user clicks your extension's icon. We retrieve the current domain from the tab's URL, check the stored preference, toggle it, and then either inject or remove the dark mode CSS.

## Step 2: CSS Filter Dark Mode

The dark mode effect uses CSS filters to invert colors and then rotate the hue to restore most colors to their intended appearance. This is a simple but effective approach that works on almost any website.

The CSS strategy involves two parts:

1. **Invert the entire page**: `filter: invert(1) hue-rotate(180deg);`
2. **Re-invert images and media**: `filter: invert(1) hue-rotate(180deg);`

The `hue-rotate(180deg)` is essential because simple inversion makes colors look like their negatives. Rotating the hue by 180 degrees restores most colors to their intended appearance while keeping the dark background.

If you want more control over the appearance, you can create custom stylesheet files and use `web_accessible_resources` to inject them:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["styles/dark-theme.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

Then inject them using:

```javascript
chrome.runtime.getURL('styles/dark-theme.css')
```

## Step 3: Auto-Apply on Navigation

To provide a seamless experience, the extension should automatically apply dark mode when the user navigates to a site that has dark mode enabled. We'll use a content script that runs on every page load.

Add this to your manifest:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

Create `content.js`:

```javascript
// content.js
(async () => {
  const domain = window.location.hostname;
  
  // Check if dark mode is enabled for this domain
  const { darkSites = {} } = await chrome.storage.local.get('darkSites');
  
  if (darkSites[domain]) {
    injectDarkMode();
  }
  
  // Listen for updates from background/popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.darkSites) {
      const domain = window.location.hostname;
      const darkSites = changes.darkSites.newValue;
      
      if (darkSites[domain]) {
        injectDarkMode();
      } else {
        removeDarkMode();
      }
    }
  });
})();

function injectDarkMode() {
  const styleId = 'dark-mode-injected-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    html { 
      filter: invert(1) hue-rotate(180deg); 
    }
    img, video, canvas, svg { 
      filter: invert(1) hue-rotate(180deg); 
    }
  `;
  document.head.appendChild(style);
}

function removeDarkMode() {
  const style = document.getElementById('dark-mode-injected-styles');
  if (style) {
    style.remove();
  }
}
```

For more advanced messaging between the background script and content script, you can use `@theluckystrike/webext-messaging`. This library provides a clean API for communication and handles edge cases like message queuing.

## Step 4: Options Page

Many users want fine-grained control over dark mode. Let's add an options page with brightness adjustment, contrast controls, and the ability to exclude specific sites.

Create `options.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Dark Mode Options</title>
  <style>
    body { 
      padding: 20px; 
      font-family: system-ui, sans-serif;
      max-width: 600px;
      margin: 0 auto;
    }
    .control-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input[type="range"] { width: 100%; }
    textarea { 
      width: 100%; 
      height: 100px; 
      font-family: monospace;
    }
    .site-list { 
      display: flex; 
      flex-wrap: wrap; 
      gap: 8px; 
      margin-top: 10px;
    }
    .site-tag {
      background: #eee;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    .site-tag:hover { background: #ddd; }
  </style>
</head>
<body>
  <h1>Dark Mode Options</h1>
  
  <div class="control-group">
    <label>Brightness Adjustment</label>
    <input type="range" id="brightness" min="50" max="150" value="100">
  </div>
  
  <div class="control-group">
    <label>Contrast Adjustment</label>
    <input type="range" id="contrast" min="50" max="150" value="100">
  </div>
  
  <div class="control-group">
    <label>Excluded Sites (one per line)</label>
    <textarea id="excludedSites"></textarea>
  </div>
  
  <button id="save">Save Settings</button>
  
  <script src="options.js"></script>
</body>
</html>
```

Create `options.js`:

```javascript
// options.js
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const { options = {} } = await chrome.storage.local.get('options');
  
  document.getElementById('brightness').value = options.brightness || 100;
  document.getElementById('contrast').value = options.contrast || 100;
  document.getElementById('excludedSites').value = 
    (options.excludedSites || []).join('\n');
  
  // Save settings
  document.getElementById('save').addEventListener('click', async () => {
    const options = {
      brightness: parseInt(document.getElementById('brightness').value),
      contrast: parseInt(document.getElementById('contrast').value),
      excludedSites: document.getElementById('excludedSites')
        .value.split('\n')
        .filter(s => s.trim())
    };
    
    await chrome.storage.local.set({ options });
    alert('Settings saved!');
  });
});
```

Add the options page to your manifest:

```json
{
  "options_page": "options.html"
}
```

Update the content script to use these options:

```javascript
function injectDarkMode() {
  // ... get options from storage
  const { options = {} } = await chrome.storage.local.get('options');
  
  const style = document.createElement('style');
  style.id = 'dark-mode-injected-styles';
  style.textContent = `
    html { 
      filter: invert(1) hue-rotate(180deg) 
             brightness(${options.brightness || 100}%)
             contrast(${options.contrast || 100}%);
    }
    img, video, canvas, svg { 
      filter: invert(1) hue-rotate(180deg); 
    }
  `;
  document.head.appendChild(style);
}
```

The options are stored using `@theluckystrike/webext-storage`, which provides an intuitive API and automatically syncs across devices when the user is signed into Chrome with sync enabled.

## Step 5: Badge Indicator

It's helpful to show users whether dark mode is currently active on the current tab. We'll use the badge to display "ON" when dark mode is enabled.

Update `background.js`:

```javascript
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateBadgeForTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    updateBadgeForTab(tabId);
  }
});

async function updateBadgeForTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://')) return;
    
    const domain = new URL(tab.url).hostname;
    const { darkSites = {} } = await chrome.storage.local.get('darkSites');
    
    if (darkSites[domain]) {
      chrome.action.setBadgeText({ tabId, text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  } catch (e) {
    // Ignore errors for restricted URLs
  }
}

// Also update badge when toggling
chrome.action.onClicked.addListener(async (tab) => {
  // ... existing code ...
  await updateBadgeForTab(tab.id);
});
```

The badge provides immediate visual feedback about the current state without requiring the user to click the extension icon.

## Testing Your Extension

When testing, consider these scenarios:

1. **Various site types**: Test on sites with different layouts—blogs, dashboards, e-commerce sites
2. **Image handling**: Some images may look odd after inversion; you can refine the CSS selector
3. **Per-site persistence**: Navigate away and come back; dark mode should persist
4. **Sync across devices**: If using sync storage, settings should appear on other devices

To load your extension:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select your extension's directory

## What You Learned

In this tutorial, you built a complete Chrome extension that:

- Uses `chrome.scripting.executeScript` to inject CSS into web pages
- Implements the `activeTab` permission pattern for secure tab access
- Manages per-site preferences with Chrome's storage API
- Applies CSS filters for a cross-site dark mode effect
- Creates an options page for user customization
- Displays badge status indicators

This pattern can be extended for theming, accessibility features, or any site-specific preference storage. The techniques learned here apply to many Chrome extension development scenarios.

## Next Steps

Try extending this extension with:

- Custom themes (not just dark/light)
- Scheduled dark mode (auto-enable at sunset)
- Per-element theming (dark mode for specific page sections only)
- Keyboard shortcuts for quick toggle

Happy building!
