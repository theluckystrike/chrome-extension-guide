---
layout: default
title: "Building Popup and Options Pages for Chrome Extensions"
description: "A comprehensive tutorial covering popup vs options page differences, popup lifecycle, options page types, UI frameworks, responsive design, settings storage, and dark mode support."
canonical_url: "https://bestchromeextensions.com/tutorials/popup-and-options-pages/"
---

# Building Popup and Options Pages for Chrome Extensions

Popups and options pages are the two primary user interfaces in Chrome extensions. Understanding when and how to use each, along with their unique constraints and capabilities, is essential for building polished, professional extensions. This tutorial covers everything you need to know to create effective popup and options page experiences for your users.

## Popup vs Options Page: Understanding the Differences {#popup-vs-options}

Before diving into implementation, it's crucial to understand the fundamental differences between popups and options pages, as each serves a distinct purpose in your extension's user experience.

**Popups** are the quick-access interface that appears when users click your extension icon in the browser toolbar. They're designed for immediate, focused interactions—toggle a feature on/off, view recent activity, or perform a quick action. Popups are ephemeral by nature: they open when clicked and close when the user clicks outside or presses Escape. This makes them perfect for single-purpose interactions that don't require extensive configuration.

**Options pages** are the dedicated settings interface where users configure how your extension behaves. They're accessed through the extension's context menu or the extensions management page. Options pages support complex forms, detailed configurations, and thorough customization. Unlike popups, options pages remain open as long as the user needs them, allowing for thoughtful configuration without time pressure.

The key distinction is intent: use popups for quick actions and immediate feedback, use options pages for detailed configuration and settings management. Many successful extensions use both—a popup for daily interactions and an options page for initial setup and advanced customization.

## Popup Lifecycle: Understanding Opens and Closes {#popup-lifecycle}

Understanding the popup lifecycle is essential because Chrome handles popups differently from regular web pages. The popup's code executes differently depending on whether it's opening or closing, and this affects how you manage state and initialization.

### How Popups Load

When a user clicks your extension icon, Chrome creates a new instance of your popup HTML page. This means every time the popup opens, the page starts from a fresh state—your JavaScript executes from the top, and any in-memory data from previous sessions is lost. This is a critical distinction from regular web apps:

```javascript
// popup.js - This runs EVERY time the popup opens
console.log('Popup opened');

// Any global variables are reset
let previousData = null; // This is always null when popup opens

// Initialize from storage on each open
async function init() {
  const result = await chrome.storage.local.get('cachedData');
  previousData = result.cachedData || [];
  render(previousData);
}

document.addEventListener('DOMContentLoaded', init);
```

### Handling Popup Closure

Popups close automatically when users click outside the popup, press Escape, or navigate to a different page. Chrome does not fire a `beforeunload` event predictably, so you shouldn't rely on it for saving state. Instead, save changes immediately as they happen:

```javascript
// Save immediately on user action - don't wait for popup close
document.getElementById('toggle-feature').addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  
  // Save immediately
  await chrome.storage.sync.set({ featureEnabled: enabled });
  
  // Show feedback
  showToast(enabled ? 'Feature enabled' : 'Feature disabled');
});

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}
```

### Communicating with Background Scripts

Since popups open and close frequently, they often need to communicate with background service workers to share state. The background script acts as the source of truth, while the popup queries for current state:

```javascript
// popup.js - Request state from background
async function loadExtensionState() {
  // Query the current state from the background script
  const response = await chrome.runtime.sendMessage({ 
    type: 'GET_EXTENSION_STATE' 
  });
  
  if (response) {
    updateUI(response);
  }
}

// background.js - Handle the request
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_EXTENSION_STATE') {
    // Return current state from memory or storage
    sendResponse({
      isEnabled: globalState.isEnabled,
      lastAction: globalState.lastAction,
      itemCount: globalState.items.length
    });
  }
  return true; // Keep channel open for async response
});
```

## Options Page Types: Embedded vs Full Page {#options-page-types}

Chrome extensions support two distinct options page configurations, each with unique characteristics suited to different use cases.

### Embedded Options

Embedded options render within Chrome's extensions management page, creating a seamless experience that feels part of the browser. They're configured simply in your manifest:

```json
{
  "options_page": "options.html"
}
```

Embedded options load within an iframe-like environment with constrained dimensions. The maximum width is approximately 700px, and the height varies based on the Chrome window. This limitation means you should design for a compact layout and avoid complex, multi-column designs.

The advantages of embedded options include faster load times (Chrome caches the frame), automatic styling that matches Chrome's interface, and a straightforward configuration that works reliably across browsers. However, you're limited in styling customization and must work within the provided frame.

### Full-Page Options

Full-page options open in a dedicated browser tab, giving you complete control over the user experience. This is the preferred approach for modern Manifest V3 extensions:

```json
{
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  }
}
```

Full-page options are ideal for complex settings interfaces with multiple sections, custom navigation, advanced form controls, and rich interactivity. You have full control over styling, layout, and behavior:

```html
<!-- options.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extension Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="settings-container">
    <nav class="settings-nav">
      <a href="#general" class="nav-item active">General</a>
      <a href="#appearance" class="nav-item">Appearance</a>
      <a href="#advanced" class="nav-item">Advanced</a>
    </nav>
    <main class="settings-content">
      <section id="general" class="settings-section">
        <!-- General settings -->
      </section>
      <section id="appearance" class="settings-section">
        <!-- Appearance settings -->
      </section>
      <section id="advanced" class="settings-section">
        <!-- Advanced settings -->
      </section>
    </main>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

## UI Frameworks in Popups: React, Svelte, Vue {#ui-frameworks}

While you can build popup UIs with vanilla JavaScript, many developers prefer using modern UI frameworks for their productivity benefits. Each framework has distinct characteristics that affect popup development.

### React in Popups

React's component-based architecture works well for popup development, though you need to configure your build system correctly:

```javascript
// popup.jsx - Entry point
import React from 'react';
import { createRoot } from 'react-dom/client';
import PopupApp from './PopupApp';
import './popup.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<PopupApp />);
```

```jsx
// PopupApp.jsx - Main component
import React, { useState, useEffect } from 'react';

export default function PopupApp() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load settings on mount
    chrome.storage.sync.get(['theme', 'notifications'], (result) => {
      setSettings(result);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="popup-container">
      <h1>Extension Popup</h1>
      <label>
        <input 
          type="checkbox" 
          checked={settings.notifications}
          onChange={(e) => handleToggle(e.target.checked)}
        />
        Enable Notifications
      </label>
    </div>
  );
}
```

React adds bundle size overhead, which impacts popup load time. Use code splitting and load only what's needed for the initial render. For simple popups, consider whether React's overhead is justified.

### Svelte in Popups

Svelte's compile-time approach produces smaller bundles, making it excellent for popup development:

```svelte
<!-- Popup.svelte -->
<script>
  import { onMount } from 'svelte';
  
  let settings = { theme: 'light', notifications: true };
  
  onMount(async () => {
    const result = await chrome.storage.sync.get(['theme', 'notifications']);
    settings = { ...settings, ...result };
  });
  
  async function handleToggle(key, value) {
    settings[key] = value;
    await chrome.storage.sync.set({ [key]: value });
  }
</script>

<div class="popup-container">
  <h1>My Extension</h1>
  
  <label class="toggle">
    <input 
      type="checkbox" 
      checked={settings.notifications}
      on:change={(e) => handleToggle('notifications', e.target.checked)}
    />
    <span>Enable Notifications</span>
  </label>
  
  <select 
    value={settings.theme} 
    on:change={(e) => handleToggle('theme', e.target.value)}
  >
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
</div>

<style>
  .popup-container {
    width: 300px;
    padding: 16px;
  }
  
  .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0;
  }
</style>
```

### Vue in Popups

Vue offers a good balance between developer experience and bundle size:

```javascript
// main.js
import { createApp } from 'vue';
import Popup from './Popup.vue';

createApp(Popup).mount('#app');
```

```vue
<!-- Popup.vue -->
<template>
  <div class="popup-container">
    <h1>Extension Popup</h1>
    
    <div class="setting">
      <label>
        <input 
          type="checkbox" 
          v-model="settings.notifications"
          @change="saveSettings"
        />
        Enable Notifications
      </label>
    </div>
    
    <div class="setting">
      <label>Theme</label>
      <select v-model="settings.theme" @change="saveSettings">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      settings: {
        theme: 'light',
        notifications: true
      }
    };
  },
  
  async mounted() {
    const result = await chrome.storage.sync.get(['theme', 'notifications']);
    this.settings = { ...this.settings, ...result };
  },
  
  methods: {
    async saveSettings() {
      await chrome.storage.sync.set(this.settings);
    }
  }
};
</script>

<style scoped>
.popup-container {
  width: 300px;
  padding: 16px;
}
</style>
```

## Responsive Design for Popup Constraints {#responsive-design}

Chrome imposes strict size constraints on popups that directly impact your design decisions. Understanding these constraints and designing within them is essential for creating usable interfaces.

### Size Constraints

Chrome extension popups have hard limits: maximum width of **600 pixels** and maximum height of **600 pixels**. Unlike regular web pages, users cannot resize popups—the dimensions are determined by your content, up to these maximums.

Design your popup to be compact and focused. Aim for widths between 280-400 pixels for most use cases, which provides enough space for meaningful interaction without feeling cramped:

```css
/* popup.css */
.popup-container {
  width: 100%;
  max-width: 400px;   /* Stay well under 600px limit */
  min-width: 280px;   /* Avoid too narrow */
  margin: 0 auto;
  padding: 16px;
}

.popup-content {
  max-height: 500px;  /* Leave room for chrome */
  overflow-y: auto;   /* Scroll if needed */
}
```

### Responsive Patterns

Use CSS flexbox and grid for layouts that adapt to available space. Avoid fixed pixel widths and embrace fluid or percentage-based approaches:

```css
/* Flexible layout */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

/* Responsive grid for options */
.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}
```

### Handling Different Viewports

Users access Chrome on various devices with different screen sizes. Test your popup at different zoom levels, as Chrome allows zooming popup content:

```css
/* Use viewport-relative units where appropriate */
.popup-container {
  font-size: 14px;
  line-height: 1.5;
}

/* Media queries for different contexts */
@media (max-height: 400px) {
  /* Compact layout for smaller popups */
  .popup-container {
    padding: 8px;
  }
  
  .popup-header {
    display: none; /* Hide header when space is tight */
  }
}
```

## Saving and Loading Settings {#saving-loading-settings}

Effective settings management requires understanding Chrome's storage API and implementing patterns that ensure data integrity and user experience.

### Using chrome.storage

The chrome.storage API provides persistent storage specifically designed for extensions. It differs from localStorage in important ways: operations are asynchronous, data persists across extension restarts, and you can choose between sync and local storage areas.

```javascript
// Define default settings
const DEFAULT_SETTINGS = {
  theme: 'system',
  notifications: true,
  autoSave: true,
  maxResults: 50,
  enabledFeatures: ['feature1', 'feature2'],
  blockedDomains: []
};

// Load settings with defaults
async function loadSettings() {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result };
}

// Save a single setting
async function saveSetting(key, value) {
  await chrome.storage.sync.set({ [key]: value });
}

// Save multiple settings
async function saveSettings(updates) {
  await chrome.storage.sync.set(updates);
}

// Delete a setting (revert to default)
async function resetSetting(key) {
  await chrome.storage.sync.remove(key);
}
```

### Complete Settings Implementation

Here's a comprehensive example showing a full implementation pattern:

```javascript
// settings-manager.js
class SettingsManager {
  constructor(defaults) {
    this.defaults = defaults;
    this.listeners = new Map();
  }

  // Load all settings with defaults
  async load() {
    const stored = await chrome.storage.sync.get(this.defaults);
    return { ...this.defaults, ...stored };
  }

  // Save specific key
  async set(key, value) {
    await chrome.storage.sync.set({ [key]: value });
    this.notifyListeners(key, value);
  }

  // Save multiple keys
  async setMany(updates) {
    await chrome.storage.sync.set(updates);
    Object.entries(updates).forEach(([key, value]) => {
      this.notifyListeners(key, value);
    });
  }

  // Get specific key
  async get(key) {
    const result = await chrome.storage.sync.get(key);
    return result[key] ?? this.defaults[key];
  }

  // Subscribe to changes
  watch(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(key).delete(callback);
    };
  }

  notifyListeners(key, value) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => callback(value));
    }
  }

  // Reset to defaults
  async reset() {
    await chrome.storage.sync.clear();
  }
}

// Usage
const settings = new SettingsManager({
  theme: 'system',
  notifications: true,
  autoSave: true
});

// Load on initialization
const currentSettings = await settings.load();

// Watch for changes from other contexts
const unwatch = settings.watch('theme', (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
});

// Later: unsubscribe when needed
unwatch();
```

### Storage sync vs Local

Choose the right storage area for your use case:

- **storage.sync**: For user preferences that should follow across devices. Quota: ~100KB. Best for: theme, notification preferences, simple toggles.
- **storage.local**: For larger data that doesn't need syncing. Quota: ~10MB. Best for: cached data, large configurations, extension state.

```javascript
// Settings that sync across devices
await chrome.storage.sync.set({ 
  theme: 'dark',
  notifications: true 
});

// Large local data that doesn't need syncing
await chrome.storage.local.set({
  cachedPages: largeArray,
  lastFetchedTimestamp: Date.now()
});
```

## Dark Mode Support {#dark-mode-support}

Modern extensions should support dark mode, respecting system preferences while allowing users to override the default. This requires both CSS theming and JavaScript detection of user preferences.

### CSS Custom Properties for Theming

Use CSS custom properties (variables) for maintainable theming:

```css
/* popup.css */
:root {
  /* Light theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --accent-color: #4285f4;
  --hover-color: #f0f0f0;
}

/* Dark theme */
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #aaaaaa;
  --border-color: #444444;
  --accent-color: #8ab4f8;
  --hover-color: #3d3d3d;
}

/* Apply theme variables */
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 16px;
}

.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

button {
  background-color: var(--accent-color);
  color: var(--bg-primary);
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}
```

### Detecting System Preferences

Use JavaScript to detect system theme preference:

```javascript
// theme-detector.js
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  // If theme is 'system', detect system preference
  const actualTheme = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', actualTheme);
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  // Only update if user has not set a preference
  chrome.storage.sync.get('theme', (result) => {
    if (result.theme === 'system') {
      applyTheme('system');
    }
  });
});
```

### Complete Theme Implementation

Here's a full implementation combining storage, detection, and UI:

```javascript
// popup.js
const THEME_KEY = 'theme';

const themes = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// Apply theme to document
function applyTheme(theme) {
  const effectiveTheme = theme === themes.SYSTEM 
    ? getSystemTheme() 
    : theme;
  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

// Get system theme
function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? themes.DARK 
    : themes.LIGHT;
}

// Initialize theme on load
async function initTheme() {
  const result = await chrome.storage.sync.get(THEME_KEY);
  const theme = result[THEME_KEY] || themes.SYSTEM;
  applyTheme(theme);
  
  // Update UI to reflect current theme
  updateThemeSelector(theme);
}

// Update selector UI
function updateThemeSelector(theme) {
  const selector = document.getElementById('theme-selector');
  selector.value = theme;
}

// Handle theme change
document.getElementById('theme-selector').addEventListener('change', async (e) => {
  const newTheme = e.target.value;
  await chrome.storage.sync.set({ [THEME_KEY]: newTheme });
  applyTheme(newTheme);
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  chrome.storage.sync.get(THEME_KEY, (result) => {
    if (result[THEME_KEY] === themes.SYSTEM) {
      applyTheme(themes.SYSTEM);
    }
  });
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initTheme);
```

```html
<!-- theme selector in popup -->
<label for="theme-selector">Theme</label>
<select id="theme-selector">
  <option value="system">System Default</option>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
</select>
```

## Manifest Configuration {#manifest-configuration}

Here's a complete manifest.json showing how to configure both popup and options page:

```json
{
  "manifest_version": 3,
  "name": "My Chrome Extension",
  "version": "1.0.0",
  "description": "A demo extension showing popup and options pages",
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "My Extension"
  },
  
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  
  "permissions": [
    "storage"
  ],
  
  "host_permissions": [
    "<all_urls>"
  ]
}
```

## Related Articles {#related-articles}

- [Popup UI Best Practices](https://github.com/theluckystrike/blob/main/docs/guides/popup-ui-best-practices.md) — Design patterns and best practices for creating professional popup interfaces
- [Options Page Guide](https://github.com/theluckystrike/blob/main/docs/guides/options-page.md) — Comprehensive guide to building Chrome extension options pages
- [Storage Patterns](https://github.com/theluckystrike/blob/main/docs/patterns/storage-migration.md) — Advanced storage patterns and migration strategies for extensions

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
