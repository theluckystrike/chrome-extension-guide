---
layout: post
title: "Build a Window Resizer Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a powerful window resizer Chrome extension for responsive design testing. This comprehensive tutorial covers Manifest V3, window management APIs, keyboard shortcuts, and publishing your extension to the Chrome Web Store."
date: 2025-01-25
categories: [Chrome Extensions, Tutorial]
tags: [chrome-extension, project, tutorial]
keywords: "window resizer extension, resize browser chrome, responsive design extension, chrome window management, browser resize tool"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/25/build-window-resizer-chrome-extension/
---

# Build a Window Resizer Chrome Extension: Complete Developer's Guide

Responsive web design has become an essential skill for modern web developers. Testing your website across different viewport sizes is crucial to ensure a seamless user experience on all devices. While browser DevTools provide some built-in tools for viewport testing, a dedicated window resizer extension can dramatically improve your workflow and productivity. In this comprehensive guide, we will walk you through building a fully functional window resizer Chrome extension from scratch using Manifest V3.

This tutorial assumes you have a basic understanding of HTML, CSS, and JavaScript. By the end of this guide, you will have created a production-ready Chrome extension that allows users to quickly resize their browser windows to common viewport sizes, set custom dimensions, save presets, and manage multiple windows simultaneously.

---

## Why Build a Window Resizer Extension? {#why-build-window-resizer}

The demand for window resizer extensions in the Chrome Web Store remains consistently high. Web developers, designers, and QA testers constantly need to test responsive layouts across different screen sizes. Here's why building this extension is an excellent project:

### Market Demand and Use Cases

Every web developer understands the pain of manually resizing browser windows to test responsive designs. Whether you are verifying that your mobile-first design works correctly at 375px width or ensuring your desktop layout looks perfect at 1920x1080, constantly dragging and resizing windows is tedious and imprecise. A window resizer extension solves this problem by providing one-click access to preset viewport sizes.

The primary users of window resizer extensions include front-end developers building responsive websites, UX designers testing design mockups across devices, quality assurance engineers performing cross-browser testing, and accessibility specialists verifying keyboard navigation and focus states at various viewport sizes.

### Learning Opportunities

Building a window resizer extension teaches you several valuable skills that transfer to other Chrome extension projects. You will learn how to work with the Chrome Windows API, manage browser state, create popup interfaces, implement keyboard shortcuts, store user preferences using the Chrome Storage API, and handle cross-origin communication between extension components.

---

## Project Architecture and Features {#project-architecture}

Before writing any code, let's define the features our window resizer extension will include:

### Core Features

Our window resizer extension will provide preset viewport sizes for common devices including mobile phones (375x667, 414x896), tablets (768x1024, 820x1180), laptops (1366x768, 1440x900), and desktops (1920x1080, 2560x1440). Users will be able to define custom viewport dimensions and save their own presets. The extension will support keyboard shortcuts for quick resizing, include a favorites system for frequently used sizes, and display the current viewport dimensions in the extension popup.

### Extension Structure

The extension will follow the standard Chrome extension architecture with a manifest file, background service worker, popup HTML and JavaScript, and content scripts where necessary. We will use Chrome's Windows API for window manipulation and the Storage API for persisting user preferences.

---

## Setting Up the Project {#setting-up-project}

Create a new folder for your extension project and set up the basic file structure. Your project should include the following files:

```
window-resizer/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── _locales/
    └── en/
        └── messages.json
```

Let us start by creating the manifest file, which is the heart of every Chrome extension.

---

## Creating the Manifest File {#creating-manifest}

The manifest.json file defines your extension's configuration, permissions, and components. For our window resizer extension, we need access to the Windows API and storage. Here is the complete manifest:

```json
{
  "manifest_version": 3,
  "name": "Window Resizer Pro",
  "version": "1.0.0",
  "description": "Resize your browser window to preset sizes for responsive design testing. One-click access to mobile, tablet, and desktop viewports.",
  "permissions": [
    "windows",
    "storage",
    "activeTab"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "commands": {
    "resize-mobile": {
      "suggested_key": {
        "default": "Ctrl+Shift+M",
        "mac": "Command+Shift+M"
      },
      "description": "Resize to mobile viewport (375x667)"
    },
    "resize-tablet": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "mac": "Command+Shift+T"
      },
      "description": "Resize to tablet viewport (768x1024)"
    },
    "resize-desktop": {
      "suggested_key": {
        "default": "Ctrl+Shift+D",
        "mac": "Command+Shift+D"
      },
      "description": "Resize to desktop viewport (1920x1080)"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest file declares the required permissions for window manipulation and storage, defines keyboard shortcuts for quick resizing, and specifies the popup interface and background service worker.

---

## Building the Popup Interface {#building-popup}

The popup is the interface users interact with when clicking the extension icon. Let's create a clean, intuitive interface that displays preset sizes, custom dimensions input, and current viewport information.

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Window Resizer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Window Resizer</h1>
      <div class="current-size" id="currentSize">
        Current: <span id="width">--</span> x <span id="height">--</span>
      </div>
    </header>

    <section class="presets">
      <h2>Quick Presets</h2>
      <div class="preset-grid" id="presetGrid">
        <!-- Presets will be dynamically inserted here -->
      </div>
    </section>

    <section class="custom-size">
      <h2>Custom Size</h2>
      <div class="input-group">
        <input type="number" id="customWidth" placeholder="Width" min="100" max="3840">
        <span class="separator">x</span>
        <input type="number" id="customHeight" placeholder="Height" min="100" max="2160">
        <button id="applyCustom">Apply</button>
      </div>
    </section>

    <section class="favorites">
      <h2>Saved Presets</h2>
      <div class="favorites-list" id="favoritesList">
        <!-- Favorites will be dynamically inserted here -->
      </div>
    </section>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### Styling the Popup

The CSS should provide a clean, modern interface that matches Chrome's design language:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.current-size {
  font-size: 13px;
  color: #666;
  background: #fff;
  padding: 6px 12px;
  border-radius: 16px;
  display: inline-block;
}

section {
  margin-bottom: 16px;
}

h2 {
  font-size: 12px;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.preset-btn {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.preset-btn:hover {
  border-color: #4285f4;
  background: #e8f0fe;
}

.preset-btn .name {
  font-size: 13px;
  font-weight: 500;
  display: block;
  margin-bottom: 2px;
}

.preset-btn .dimensions {
  font-size: 11px;
  color: #666;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-group input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.input-group input:focus {
  outline: none;
  border-color: #4285f4;
}

.separator {
  color: #888;
  font-size: 14px;
}

#applyCustom {
  padding: 8px 16px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

#applyCustom:hover {
  background: #3367d6;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.favorite-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #eee;
}

.favorite-item button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
}

.favorite-item button:hover {
  color: #4285f4;
}
```

---

## Implementing the Popup Logic {#implementing-popup-logic}

The popup JavaScript handles user interactions, communicates with the background script, and displays current viewport information. Let us implement the complete functionality:

```javascript
// Default presets configuration
const defaultPresets = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14 Pro', width: 393, height: 852 },
  { name: 'Android', width: 360, height: 800 },
  { name: 'iPad Mini', width: 744, height: 1133 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'MacBook Air', width: 1280, height: 832 },
  { name: 'MacBook Pro', width: 1440, height: 900 },
  { name: 'Full HD', width: 1920, height: 1080 },
  { name: '2K', width: 2560, height: 1440 },
  { name: '4K', width: 3840, height: 2160 }
];

// DOM Elements
const presetGrid = document.getElementById('presetGrid');
const favoritesList = document.getElementById('favoritesList');
const customWidthInput = document.getElementById('customWidth');
const customHeightInput = document.getElementById('customHeight');
const applyCustomBtn = document.getElementById('applyCustom');
const widthDisplay = document.getElementById('width');
const heightDisplay = document.getElementById('height');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentWindowSize();
  renderPresets();
  loadFavorites();
  setupEventListeners();
});

// Get current window size
async function loadCurrentWindowSize() {
  try {
    const windows = await chrome.windows.getCurrent();
    if (windows) {
      widthDisplay.textContent = windows.width;
      heightDisplay.textContent = windows.height;
    }
  } catch (error) {
    console.error('Error getting window size:', error);
  }
}

// Render preset buttons
function renderPresets() {
  presetGrid.innerHTML = defaultPresets.map(preset => `
    <button class="preset-btn" data-width="${preset.width}" data-height="${preset.height}">
      <span class="name">${preset.name}</span>
      <span class="dimensions">${preset.width} x ${preset.height}</span>
    </button>
  `).join('');
}

// Load saved favorites
async function loadFavorites() {
  try {
    const result = await chrome.storage.local.get(['favorites']);
    const favorites = result.favorites || [];
    
    if (favorites.length === 0) {
      favoritesList.innerHTML = '<p class="empty-state">No saved presets yet</p>';
      return;
    }

    favoritesList.innerHTML = favorites.map((preset, index) => `
      <div class="favorite-item">
        <span>${preset.name}: ${preset.width} x ${preset.height}</span>
        <div>
          <button class="apply-fav" data-index="${index}" title="Apply">↗</button>
          <button class="remove-fav" data-index="${index}" title="Remove">×</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading favorites:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Preset buttons
  presetGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.preset-btn');
    if (btn) {
      const width = parseInt(btn.dataset.width);
      const height = parseInt(btn.dataset.height);
      await resizeWindow(width, height);
    }
  });

  // Custom size apply
  applyCustomBtn.addEventListener('click', async () => {
    const width = parseInt(customWidthInput.value);
    const height = parseInt(customHeightInput.value);
    
    if (width && height && width >= 100 && height >= 100) {
      await resizeWindow(width, height);
    }
  });

  // Enter key for custom size
  customWidthInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') customHeightInput.focus();
  });
  
  customHeightInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyCustomBtn.click();
  });

  // Favorites - apply
  favoritesList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('apply-fav')) {
      const index = parseInt(e.target.dataset.index);
      const result = await chrome.storage.local.get(['favorites']);
      const favorites = result.favorites || [];
      if (favorites[index]) {
        await resizeWindow(favorites[index].width, favorites[index].height);
      }
    }
    
    if (e.target.classList.contains('remove-fav')) {
      const index = parseInt(e.target.dataset.index);
      await removeFavorite(index);
    }
  });
}

// Resize window function
async function resizeWindow(width, height) {
  try {
    const window = await chrome.windows.getCurrent();
    await chrome.windows.update(window.id, {
      width: width,
      height: height,
      left: window.left,
      top: window.top
    });
    
    // Update display after resize
    setTimeout(loadCurrentWindowSize, 100);
  } catch (error) {
    console.error('Error resizing window:', error);
  }
}

// Add to favorites
async function addFavorite(preset) {
  try {
    const result = await chrome.storage.local.get(['favorites']);
    const favorites = result.favorites || [];
    favorites.push(preset);
    await chrome.storage.local.set({ favorites });
    loadFavorites();
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
}

// Remove from favorites
async function removeFavorite(index) {
  try {
    const result = await chrome.storage.local.get(['favorites']);
    const favorites = result.favorites || [];
    favorites.splice(index, 1);
    await chrome.storage.local.set({ favorites });
    loadFavorites();
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
}
```

---

## Implementing Background Service Worker {#background-service-worker}

The background service worker handles keyboard shortcuts and can perform operations even when the popup is not open. This is essential for the keyboard shortcuts we defined in the manifest:

```javascript
// Background service worker for keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const presets = {
    'resize-mobile': { width: 375, height: 667 },
    'resize-tablet': { width: 768, height: 1024 },
    'resize-desktop': { width: 1920, height: 1080 }
  };

  const preset = presets[command];
  if (preset) {
    try {
      const window = await chrome.windows.getCurrent();
      await chrome.windows.update(window.id, {
        width: preset.width,
        height: preset.height,
        left: window.left,
        top: window.top
      });
    } catch (error) {
      console.error('Error resizing window from shortcut:', error);
    }
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Window Resizer Pro installed successfully');
  }
});
```

---

## Testing Your Extension {#testing-extension}

Before publishing, thoroughly test your extension in development mode. Here's how to load your extension in Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your extension folder
4. The extension icon should appear in your toolbar

Test the following scenarios: Click each preset button and verify the window resizes correctly. Enter custom dimensions and apply them. Use the keyboard shortcuts (if they work in your Chrome version). Open and close the popup to ensure it displays current window size. Create and remove favorites to test the storage functionality.

---

## Publishing to Chrome Web Store {#publishing}

Once you have tested your extension and ensured it works correctly, you can publish it to the Chrome Web Store. First, create your extension icons if you haven't already (required sizes: 16x16, 32x32, 48x48, and 128x128 pixels). Then, create a ZIP file of your extension folder excluding any development files.

Navigate to the Chrome Web Store Developer Dashboard and sign in with your Google account. Click "New Item" and upload your ZIP file. Fill in the required information including the extension name, description, and category. Upload your icon images and add screenshots if desired. Review and submit for publishing.

The review process typically takes a few hours to a few days. Once approved, your extension will be available in the Chrome Web Store for millions of users to install.

---

## Advanced Features to Consider {#advanced-features}

While our basic window resizer extension is fully functional, there are several advanced features you can add to make your extension stand out:

### Multi-Window Support

Implement the ability to resize specific windows when multiple windows are open. Use chrome.windows.getAll() to list all windows and allow users to select which window to resize.

### Position Control

Add options to position the window at specific screen coordinates after resizing. This is useful for comparing side-by-side layouts across different viewport sizes.

### Responsive Breakpoint Presets

Create presets based on common CSS breakpoints (320px for mobile, 768px for tablet, 1024px for small desktop, 1280px for desktop) to match common responsive design patterns.

### Export and Import

Allow users to export their saved presets and import them on different computers, useful for developers who work across multiple machines.

### Integration with Browser DevTools

Create a DevTools panel that shows current viewport information and provides quick access to resize functions directly from the developer tools.

---

## Conclusion {#conclusion}

Building a window resizer Chrome extension is an excellent project that teaches you fundamental Chrome extension development concepts while creating a genuinely useful tool for web developers and designers. The extension we built in this guide includes preset viewport sizes for all common devices, custom dimension input with validation, keyboard shortcuts for quick access, favorites system for saving custom presets, and persistent storage using the Chrome Storage API.

The skills you have learned in this tutorial—working with the Windows API, creating popup interfaces, handling user interactions, implementing keyboard shortcuts, and managing persistent storage—transfer directly to other Chrome extension projects you might want to build.

Remember to thoroughly test your extension before publishing and consider adding advanced features to differentiate your extension from existing window resizers in the Chrome Web Store. With over 3 billion Chrome users worldwide, there is significant demand for quality developer tools, and a well-built window resizer extension can serve thousands of developers who need to test responsive designs efficiently.

Good luck with your Chrome extension development journey!
