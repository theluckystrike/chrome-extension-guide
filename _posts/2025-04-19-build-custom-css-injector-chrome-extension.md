---
layout: post
title: "Build a Custom CSS Injector Chrome Extension: Restyle Any Website"
description: "Learn how to build a custom CSS injector Chrome extension from scratch. This comprehensive guide covers content scripts, manifest configuration, user interface design, and advanced CSS injection techniques for 2025."
date: 2025-04-19
categories: [Chrome Extensions, Tutorials]
tags: [css, styling, chrome-extension]
keywords: "chrome extension custom css, inject css chrome extension, stylish chrome extension build, custom stylesheet chrome, override css chrome extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/19/build-custom-css-injector-chrome-extension/"
---

# Build a Custom CSS Injector Chrome Extension: Restyle Any Website

Have you ever visited a website and wished you could change its appearance? Perhaps the font is too small, the colors strain your eyes, or you simply prefer a different visual style. What if you could create your own Chrome extension that injects custom CSS into any website, giving you complete control over how web pages look? This comprehensive guide will walk you through building a powerful custom CSS injector Chrome extension from scratch.

The ability to inject custom CSS into websites is one of the most sought-after features in the Chrome extension ecosystem. Popular extensions like Stylish (now called Stylus) have millions of users who rely on custom stylesheets to personalize their browsing experience. By building your own CSS injector, you gain complete control over website appearances while learning valuable Chrome extension development skills.

This guide covers everything from understanding the foundational concepts of CSS injection to implementing advanced features like style persistence, live preview, and cross-browser compatibility. Whether you are a beginner to Chrome extension development or an experienced developer looking to expand your skills, this tutorial provides the knowledge and code examples you need to create a professional-grade CSS injector extension.

---

## Understanding CSS Injection in Chrome Extensions {#understanding-css-injection}

Before diving into code, it is essential to understand how CSS injection works within the Chrome extension architecture. Chrome extensions operate in a sandboxed environment separate from regular web pages, but they can interact with websites through content scripts and the Chrome APIs.

### How Content Scripts Work

Content scripts are JavaScript files that run in the context of web pages. When you specify a content script in your extension's manifest, Chrome injects it into matching pages automatically. These scripts can access and modify the page's DOM (Document Object Model) and CSS, making them the perfect vehicle for CSS injection.

The key concept to understand is that content scripts share the page's DOM but run in an isolated JavaScript environment. This isolation prevents conflicts between the page's original JavaScript and your extension's code. However, when it comes to CSS, you can directly modify the page's stylesheets or inject new ones that override existing styles.

There are two primary methods for injecting CSS into web pages through Chrome extensions. The first method uses the chrome stylesheets API to insert CSS programmatically at runtime. The second method involves creating a content script that dynamically creates and appends style elements to the page. Both approaches have their advantages, and we will explore both in this guide.

### The Manifest File: Your Extension's Foundation

Every Chrome extension begins with the manifest.json file. This configuration file tells Chrome about your extension's capabilities, permissions, and the files it includes. For a CSS injector extension, you need to declare content scripts and potentially host permissions for the websites you want to modify.

The manifest version 3 format has become the standard for modern Chrome extensions. This version introduces several changes from version 2, including stricter security requirements and new APIs. Our CSS injector will use manifest version 3 to ensure compatibility with current Chrome browser standards and future updates.

---

## Setting Up Your Development Environment {#development-environment}

Before writing any code, you need to set up a proper development environment. This involves creating the necessary project structure and organizing your files for maintainability and scalability.

### Project Structure

Create a new folder for your extension project and organize it with the following structure:

```
css-injector-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   ├── content.js
│   └── injector.js
├── background/
│   └── background.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── _locales/
    └── en/
        └── messages.json
```

This structure separates concerns between different parts of your extension. The popup folder contains the user interface that appears when users click your extension icon. The content folder holds scripts that run on web pages. The background folder contains service workers that handle events and coordinate between different parts of the extension.

### Creating Your Manifest File

The manifest.json file is the heart of your extension. Here is a complete manifest configuration for a CSS injector extension:

```json
{
  "manifest_version": 3,
  "name": "Custom CSS Injector",
  "version": "1.0.0",
  "description": "Inject custom CSS into any website and restyle it according to your preferences",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background/background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest declares the necessary permissions for our extension. The storage permission allows us to save user's custom CSS rules. The scripting permission enables us to inject CSS dynamically. The host permissions with "<all_urls>" allow the extension to work on any website.

---

## Building the Content Script: CSS Injection Logic {#content-script}

The content script is where the actual CSS injection happens. This script runs on every web page (based on our manifest configuration) and provides the functionality to inject, manage, and remove custom styles.

### Core Injection Engine

Create the content/content.js file with the following comprehensive CSS injection logic:

```javascript
// Custom CSS Injector - Content Script
// This script runs on web pages and handles CSS injection

class CSSInjector {
  constructor() {
    this.styleElement = null;
    this.injectedStyles = new Map();
    this.initialize();
  }

  initialize() {
    // Create the main style element for injecting CSS
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'custom-css-injector-styles';
    this.styleElement.type = 'text/css';
    
    // Append to head or document element
    const target = document.head || document.documentElement;
    target.appendChild(this.styleElement);
    
    console.log('Custom CSS Injector initialized');
  }

  injectCSS(cssCode, identifier = 'default') {
    try {
      // Store the CSS with its identifier for later retrieval
      this.injectedStyles.set(identifier, cssCode);
      
      // Combine all stored CSS rules
      const combinedCSS = Array.from(this.injectedStyles.values()).join('\n');
      
      // Update the style element
      this.styleElement.textContent = combinedCSS;
      
      console.log(`CSS injected successfully with identifier: ${identifier}`);
      return true;
    } catch (error) {
      console.error('Error injecting CSS:', error);
      return false;
    }
  }

  removeCSS(identifier) {
    if (this.injectedStyles.has(identifier)) {
      this.injectedStyles.delete(identifier);
      
      // Rebuild the style element with remaining styles
      const combinedCSS = Array.from(this.injectedStyles.values()).join('\n');
      this.styleElement.textContent = combinedCSS;
      
      console.log(`CSS removed for identifier: ${identifier}`);
      return true;
    }
    return false;
  }

  clearAll() {
    this.injectedStyles.clear();
    this.styleElement.textContent = '';
    console.log('All custom CSS cleared');
  }

  getInjectedStyles() {
    return Object.fromEntries(this.injectedStyles);
  }
}

// Initialize the injector
const cssInjector = new CSSInjector();

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'injectCSS':
      const result = cssInjector.injectCSS(message.css, message.identifier);
      sendResponse({ success: result });
      break;
      
    case 'removeCSS':
      const removeResult = cssInjector.removeCSS(message.identifier);
      sendResponse({ success: removeResult });
      break;
      
    case 'clearAll':
      cssInjector.clearAll();
      sendResponse({ success: true });
      break;
      
    case 'getStyles':
      sendResponse({ styles: cssInjector.getInjectedStyles() });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true; // Keep the message channel open for async response
});

// Notify that content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' });
```

This content script provides a robust foundation for CSS injection. It maintains a Map of injected styles, allowing multiple style rules to coexist without conflicts. The script listens for messages from other parts of the extension and responds accordingly.

### Advanced Injection Techniques

Beyond basic CSS injection, you might want to implement more sophisticated features. One powerful technique is using CSS custom properties (variables) to create more flexible and maintainable style overrides. Another advanced approach involves using the Shadow DOM to create truly isolated style scopes.

For websites with complex CSS architectures, you might need to use !important declarations more liberally or target specific elements with higher specificity. Our content script can be extended to include helper functions that generate more specific selectors:

```javascript
// Helper function to generate highly specific selectors
function generateSpecificSelector(element) {
  if (!element || !element.tagName) return null;
  
  let selector = element.tagName.toLowerCase();
  
  // Add ID if available
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Build a path using classes
  const classes = Array.from(element.classList)
    .filter(cls => !cls.includes(' ') && cls.length > 0)
    .join('.');
  
  if (classes) {
    selector += `.${classes}`;
  }
  
  // Add data attributes if available
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-')) {
      selector += `[${attr.name}="${attr.value}"]`;
      break;
    }
  }
  
  return selector;
}
```

---

## Building the Popup Interface {#popup-interface}

The popup is what users see when they click your extension icon. It should provide an intuitive interface for writing, saving, and managing custom CSS rules. Let's create a comprehensive popup with all the features users expect from a professional CSS injector.

### HTML Structure

Create popup/popup.html:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Custom CSS Injector</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>CSS Injector</h1>
      <p class="subtitle">Customize any website</p>
    </header>
    
    <section class="current-site">
      <label for="site-input">Target Website</label>
      <div class="site-input-wrapper">
        <input type="text" id="site-input" placeholder="e.g., example.com or *://*.com/*">
        <button id="apply-site" class="btn-secondary">Apply</button>
      </div>
    </section>
    
    <section class="css-editor">
      <label for="css-input">Custom CSS</label>
      <textarea id="css-input" placeholder="/* Enter your custom CSS here */
/* Example: */
body {
  font-size: 18px !important;
  background-color: #f5f5f5 !important;
}

h1, h2, h3 {
  color: #333 !important;
}"></textarea>
      <div class="editor-actions">
        <button id="inject-btn" class="btn-primary">Inject CSS</button>
        <button id="preview-btn" class="btn-secondary">Live Preview</button>
        <button id="clear-btn" class="btn-danger">Clear</button>
      </div>
    </section>
    
    <section class="saved-styles">
      <h2>Saved Styles</h2>
      <div id="saved-list" class="saved-list">
        <!-- Saved styles will be populated here -->
      </div>
    </section>
    
    <section class="options">
      <label class="checkbox-label">
        <input type="checkbox" id="auto-inject">
        <span>Auto-inject on page load</span>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" id="dark-mode">
        <span>Dark mode</span>
      </label>
    </section>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Styling the Popup

Create popup/popup.css with professional styling:

```css
/* CSS Injector Popup Styles */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: #ffffff;
  color: #333;
  width: 400px;
  min-height: 500px;
}

body.dark-mode {
  background-color: #1a1a1a;
  color: #e0e0e0;
}

.container {
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

body.dark-mode header {
  border-bottom-color: #333;
}

h1 {
  font-size: 22px;
  font-weight: 600;
  color: #4285f4;
  margin-bottom: 5px;
}

.subtitle {
  font-size: 13px;
  color: #666;
}

body.dark-mode .subtitle {
  color: #999;
}

section {
  margin-bottom: 20px;
}

label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  color: #666;
}

body.dark-mode label {
  color: #999;
}

.site-input-wrapper {
  display: flex;
  gap: 8px;
}

input[type="text"] {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-color: #fff;
}

body.dark-mode input[type="text"] {
  background-color: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

input[type="text"]:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
}

textarea {
  width: 100%;
  height: 180px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  background-color: #fafafa;
}

body.dark-mode textarea {
  background-color: #2a2a2a;
  border-color: #444;
  color: #e0e0e0;
}

textarea:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
}

.editor-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

button {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #4285f4;
  color: white;
  flex: 1;
}

.btn-primary:hover {
  background-color: #3367d6;
}

.btn-secondary {
  background-color: #e8eaed;
  color: #333;
}

body.dark-mode .btn-secondary {
  background-color: #3a3a3a;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #dfe0e1;
}

body.dark-mode .btn-secondary:hover {
  background-color: #4a4a4a;
}

.btn-danger {
  background-color: #fa755a;
  color: white;
}

.btn-danger:hover {
  background-color: #ea4335;
}

.saved-styles h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

body.dark-mode .saved-styles h2 {
  color: #e0e0e0;
}

.saved-list {
  max-height: 150px;
  overflow-y: auto;
}

.saved-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 6px;
  margin-bottom: 8px;
}

body.dark-mode .saved-item {
  background-color: #2a2a2a;
}

.saved-item-info {
  flex: 1;
  overflow: hidden;
}

.saved-item-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.saved-item-preview {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

body.dark-mode .saved-item-preview {
  color: #888;
}

.saved-item-actions {
  display: flex;
  gap: 4px;
}

.saved-item-actions button {
  padding: 6px 10px;
  font-size: 11px;
}

.options {
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

body.dark-mode .options {
  border-top-color: #333;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  text-transform: none;
  margin-bottom: 10px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
```

### JavaScript Logic for Popup

Create popup/popup.js to handle user interactions:

```javascript
// CSS Injector Popup - Main Logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const siteInput = document.getElementById('site-input');
  const applySiteBtn = document.getElementById('apply-site');
  const cssInput = document.getElementById('css-input');
  const injectBtn = document.getElementById('inject-btn');
  const previewBtn = document.getElementById('preview-btn');
  const clearBtn = document.getElementById('clear-btn');
  const savedList = document.getElementById('saved-list');
  const autoInjectCheckbox = document.getElementById('auto-inject');
  const darkModeCheckbox = document.getElementById('dark-mode');
  
  let currentTab = null;
  let previewMode = false;
  
  // Initialize
  initialize();
  
  async function initialize() {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      currentTab = tabs[0];
      siteInput.value = currentTab.url || '';
    }
    
    // Load saved settings
    loadSettings();
    
    // Load saved styles for current site
    loadSavedStyles();
  }
  
  // Apply site-specific targeting
  applySiteBtn.addEventListener('click', async () => {
    const targetPattern = siteInput.value.trim();
    if (!targetPattern) return;
    
    // Save the target pattern
    await chrome.storage.local.set({
      currentTarget: targetPattern
    });
    
    showNotification(`Target set to: ${targetPattern}`);
  });
  
  // Inject CSS button
  injectBtn.addEventListener('click', async () => {
    const cssCode = cssInput.value.trim();
    if (!cssCode) {
      showNotification('Please enter some CSS code', 'error');
      return;
    }
    
    try {
      // Send CSS to content script
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'injectCSS',
        css: cssCode,
        identifier: 'user-custom-css'
      });
      
      // Save the CSS for future use
      const siteUrl = new URL(currentTab.url).hostname;
      const savedStyles = await chrome.storage.local.get('savedStyles') || {};
      
      if (!savedStyles.savedStyles) {
        savedStyles.savedStyles = {};
      }
      
      savedStyles.savedStyles[siteUrl] = {
        css: cssCode,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set(savedStyles);
      
      showNotification('CSS injected successfully!');
      loadSavedStyles();
      
    } catch (error) {
      console.error('Error injecting CSS:', error);
      showNotification('Error injecting CSS. Make sure the page is loaded.', 'error');
    }
  });
  
  // Live preview toggle
  previewBtn.addEventListener('click', async () => {
    previewMode = !previewMode;
    
    if (previewMode) {
      const cssCode = cssInput.value.trim();
      if (cssCode) {
        await chrome.tabs.sendMessage(currentTab.id, {
          action: 'injectCSS',
          css: cssCode,
          identifier: 'preview-mode'
        });
        previewBtn.textContent = 'Stop Preview';
        previewBtn.classList.add('active');
      }
    } else {
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'removeCSS',
        identifier: 'preview-mode'
      });
      previewBtn.textContent = 'Live Preview';
      previewBtn.classList.remove('active');
    }
  });
  
  // Clear all CSS
  clearBtn.addEventListener('click', async () => {
    try {
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'clearAll'
      });
      cssInput.value = '';
      showNotification('All CSS cleared');
    } catch (error) {
      showNotification('Error clearing CSS', 'error');
    }
  });
  
  // Load saved styles
  async function loadSavedStyles() {
    const savedStyles = await chrome.storage.local.get('savedStyles');
    const styles = savedStyles.savedStyles || {};
    
    savedList.innerHTML = '';
    
    if (Object.keys(styles).length === 0) {
      savedList.innerHTML = '<p class="no-styles">No saved styles yet</p>';
      return;
    }
    
    for (const [site, data] of Object.entries(styles)) {
      const item = document.createElement('div');
      item.className = 'saved-item';
      item.innerHTML = `
        <div class="saved-item-info">
          <div class="saved-item-name">${site}</div>
          <div class="saved-item-preview">${data.css.substring(0, 50)}...</div>
        </div>
        <div class="saved-item-actions">
          <button class="btn-secondary load-style" data-site="${site}">Load</button>
          <button class="btn-danger delete-style" data-site="${site}">Delete</button>
        </div>
      `;
      
      savedList.appendChild(item);
    }
    
    // Add event listeners to buttons
    document.querySelectorAll('.load-style').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const site = e.target.dataset.site;
        const siteData = styles[site];
        if (siteData) {
          cssInput.value = siteData.css;
          siteInput.value = site;
        }
      });
    });
    
    document.querySelectorAll('.delete-style').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const site = e.target.dataset.site;
        delete styles[site];
        await chrome.storage.local.set({ savedStyles: styles });
        loadSavedStyles();
        showNotification('Style deleted');
      });
    });
  }
  
  // Settings
  autoInjectCheckbox.addEventListener('change', async () => {
    await chrome.storage.local.set({
      autoInject: autoInjectCheckbox.checked
    });
  });
  
  darkModeCheckbox.addEventListener('change', async () => {
    await chrome.storage.local.set({
      darkMode: darkModeCheckbox.checked
    });
    
    if (darkModeCheckbox.checked) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  });
  
  async function loadSettings() {
    const settings = await chrome.storage.local.get(['autoInject', 'darkMode']);
    
    if (settings.autoInject) {
      autoInjectCheckbox.checked = true;
    }
    
    if (settings.darkMode) {
      darkModeCheckbox.checked = true;
      document.body.classList.add('dark-mode');
    }
  }
  
  // Notification helper
  function showNotification(message, type = 'success') {
    // Simple notification - could be enhanced with a toast system
    console.log(`[${type}] ${message}`);
    
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background-color: ${type === 'error' ? '#ea4335' : '#34a853'};
      color: white;
      border-radius: 6px;
      font-size: 13px;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
});
```

---

## Background Service Worker {#background-service}

The background service worker handles events that occur independently of any particular tab or popup. It is particularly useful for managing extension state, handling installation events, and coordinating between different parts of your extension.

Create background/background.js:

```javascript
// CSS Injector - Background Service Worker

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('CSS Injector extension installed');
    
    // Set default settings
    chrome.storage.local.set({
      savedStyles: {},
      autoInject: false,
      darkMode: false,
      currentTarget: '<all_urls>'
    });
  } else if (details.reason === 'update') {
    console.log('CSS Injector extension updated');
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentScriptReady') {
    console.log('Content script ready on tab:', sender.tab?.id);
  }
  
  // Handle other background tasks
  if (message.action === 'getSettings') {
    chrome.storage.local.get(['autoInject', 'darkMode', 'currentTarget'], (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }
});

// Handle tab updates to auto-inject styles
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if auto-inject is enabled
    const settings = await chrome.storage.local.get('autoInject');
    
    if (settings.autoInject) {
      const hostname = new URL(tab.url).hostname;
      const savedStyles = await chrome.storage.local.get('savedStyles');
      
      if (savedStyles.savedStyles && savedStyles.savedStyles[hostname]) {
        // Inject saved CSS
        chrome.tabs.sendMessage(tabId, {
          action: 'injectCSS',
          css: savedStyles.savedStyles[hostname].css,
          identifier: 'auto-injected'
        });
      }
    }
  }
});

// Badge management
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  
  if (tab.url) {
    const hostname = new URL(tab.url).hostname;
    const savedStyles = await chrome.storage.local.get('savedStyles');
    
    if (savedStyles.savedStyles && savedStyles.savedStyles[hostname]) {
      chrome.action.setBadgeText({ text: 'ON', tabId: activeInfo.tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#34a853', tabId: activeInfo.tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId: activeInfo.tabId });
    }
  }
});
```

---

## Testing Your Extension {#testing}

Now that you have created all the necessary files, it is time to test your extension in Chrome. Follow these steps to load your extension and verify that it works correctly.

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your extension folder
4. Your extension should now appear in the extensions list

### Verifying Functionality

To test your CSS injector:

1. Navigate to any website (for example, example.com)
2. Click your extension icon to open the popup
3. Enter some custom CSS, such as:
   ```css
   body {
     background-color: #ff0000 !important;
   }
   ```
4. Click "Inject CSS" button
5. The website background should change to red

### Troubleshooting Common Issues

If your extension is not working correctly, check the following common issues:

First, verify that all file paths in your manifest are correct and that all referenced files exist. Chrome will not load an extension with missing files. Second, check the console for any error messages by navigating to `chrome://extensions/`, finding your extension, and clicking "Service Worker" to view background console logs.

For content script issues, right-click on any web page, select "Inspect", and check the console for errors. Make sure that your content script is properly injected and that there are no JavaScript errors preventing execution.

---

## Advanced Features and Enhancements {#advanced-features}

Once you have the basic CSS injector working, consider adding these advanced features to make your extension more powerful and user-friendly.

### Style Manager with Multiple Profiles

Implement a system that allows users to create and manage multiple style profiles. This feature enables users to switch between different themes for the same website quickly. Each profile can contain multiple CSS rules organized into categories, and users can enable or disable individual rules without deleting them.

### Import and Export Functionality

Add the ability to import CSS from files and export saved styles for backup or sharing. This feature is particularly useful for users who want to share their custom themes with others or transfer their styles between different computers.

### Pre-built Theme Library

Include a library of pre-built themes that users can apply with one click. These themes can target popular websites like YouTube, Twitter, or Reddit, and demonstrate the extension's capabilities to new users. Themes can be organized by category and include both functional and aesthetic modifications.

### Sync Across Devices

Utilize chrome.storage.sync to enable synchronization of saved styles across different devices where users are signed in with the same Google account. This cloud synchronization ensures that users have access to their custom styles regardless of which computer they are using.

---

## Best Practices and Performance Optimization {#best-practices}

When building a production-ready CSS injector extension, following best practices ensures better performance, security, and user experience.

### Performance Considerations

Avoid injecting large amounts of CSS on every page load. Instead, implement lazy loading and only inject styles when necessary. Use efficient CSS selectors and avoid overly complex rules that could slow down page rendering. Consider using CSS containment to limit the scope of your style modifications.

### Security Best Practices

Always validate and sanitize any CSS input from users. While CSS injection is the intended functionality of your extension, malicious CSS could potentially be used for tracking or other purposes. Implement input validation and consider adding a warning when users import CSS from untrusted sources.

### User Experience

Provide clear feedback to users when styles are injected, modified, or removed. Use visual indicators like badges or notifications to show the current state. Include keyboard shortcuts for common actions to power users can work more efficiently.

---

## Conclusion {#conclusion}

Building a custom CSS injector Chrome extension is an excellent project that teaches you fundamental concepts of Chrome extension development while creating a genuinely useful tool. Throughout this guide, you have learned how to create the manifest configuration, build content scripts for CSS injection, design an intuitive popup interface, and implement background service worker logic.

The extension you have created provides a solid foundation that can be extended with additional features like style profiles, theme libraries, and cross-device synchronization. As you continue to develop and refine your extension, you will gain deeper understanding of Chrome's extension APIs and web development best practices.

Custom CSS injection remains one of the most popular use cases for Chrome extensions, with millions of users relying on tools like Stylus to personalize their web browsing experience. By building your own CSS injector, you not only gain a powerful personal tool but also develop skills that are valuable for any Chrome extension development project.

Remember to test thoroughly across different websites and browsers, gather feedback from users, and continuously iterate on your design. With dedication and attention to detail, your CSS injector can become a valuable addition to the Chrome extension ecosystem.

---

## Additional Resources {#resources}

To continue learning and improving your CSS injector extension, explore these additional resources:

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/) - Official Chrome extension development guides
- [Chrome Web Store Developer Dashboard](https://developer.chrome.com/docs/webstore/) - Publishing your extension
- [CSS Specifications](https://www.w3.org/Style/CSS/) - Official CSS standards
- [MDN CSS Documentation](https://developer.mozilla.org/en-US/docs/Web/CSS) - Comprehensive CSS reference

Start building your CSS injector today and transform the way you experience the web!
