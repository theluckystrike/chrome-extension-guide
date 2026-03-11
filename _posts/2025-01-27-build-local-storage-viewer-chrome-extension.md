---
layout: post
title: "Build a Local Storage Viewer Chrome Extension"
description: "Learn how to create a powerful Local Storage Viewer Chrome Extension from scratch. This comprehensive developer guide covers web storage APIs, manifest V3 configuration, storage inspection, and best practices for building developer tools."
date: 2025-01-27
categories: [Chrome-Extensions]
tags: [chrome-extension, developer-tools]
keywords: "localstorage viewer, storage inspector chrome, web storage extension, chrome storage api, local storage inspector"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/27/build-local-storage-viewer-chrome-extension/"
---

# Build a Local Storage Viewer Chrome Extension

Web storage is a fundamental part of modern web development. Whether you are storing user preferences, session data, authentication tokens, or application state, localStorage and sessionStorage have become essential tools for creating rich, personalized web experiences. However, inspecting and managing these storage values has traditionally been limited to the Chrome DevTools Application tab, which can be cumbersome for developers who need quick access to storage data without switching contexts.

In this comprehensive guide, we will walk through building a complete Local Storage Viewer Chrome Extension from scratch. This extension will provide a user-friendly interface for viewing, editing, adding, and deleting localStorage and sessionStorage values across any website. By the end of this tutorial, you will have a fully functional developer tool that integrates seamlessly into Chrome and follows the latest Manifest V3 specifications.

---

## Understanding Web Storage APIs {#understanding-web-storage}

Before diving into extension development, it is essential to understand the web storage APIs that our extension will interact with. Chrome provides two primary storage mechanisms that developers use extensively: localStorage and sessionStorage.

### localStorage vs sessionStorage

The **localStorage** API provides persistent key-value storage that remains available even after the browser is closed and reopened. Data stored in localStorage has no expiration time and will persist across multiple sessions and browser tabs from the same origin. This makes it ideal for storing user preferences, settings, cached data, and long-term application state.

The **sessionStorage** API, on the other hand, provides temporary key-value storage that is specific to a single browsing context—typically a single tab or window. Data stored in sessionStorage is cleared when the page session ends, making it perfect for storing temporary state, form data during a single session, or sensitive information that should not persist beyond the current tab.

Both APIs share the same interface: `getItem(key)`, `setItem(key, value)`, `removeItem(key)`, `clear()`, and the `length` property. Values are always stored as strings, which means you will need to serialize and deserialize complex data structures using JSON methods.

### Storage Events and Synchronization

One important aspect of web storage that our extension will need to handle is storage events. When data changes in localStorage or sessionStorage in one tab, other tabs from the same origin receive a `storage` event. This event contains information about the changed key, its old value, and its new value. Our extension can listen for these events to keep the displayed data synchronized with the actual storage state.

Chrome also provides the `chrome.storage` API for extensions, which offers additional features like synchronization across devices, larger storage quotas, and structured data support. However, for a storage viewer that inspects website storage, we will primarily work with the standard web storage APIs accessible through the page context.

---

## Project Structure and Manifest Configuration {#project-setup}

Every Chrome extension begins with the manifest file, and our Local Storage Viewer is no exception. We will use Manifest V3, the latest version of the Chrome extension platform, which provides improved security, performance, and user privacy.

### Creating the Project Directory

First, create a new directory for your extension project with the following structure:

```
local-storage-viewer/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Manifest V3 Configuration

The manifest.json file is the heart of your Chrome extension. It defines the extension's capabilities, permissions, and entry points. Here is the complete manifest configuration for our Local Storage Viewer:

```json
{
  "manifest_version": 3,
  "name": "Local Storage Viewer",
  "version": "1.0.0",
  "description": "A powerful localStorage and sessionStorage viewer for Chrome. Inspect, edit, and manage web storage values with ease.",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
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

The manifest includes several key permissions that our extension requires. The `activeTab` permission allows us to access the currently active tab when the user clicks the extension icon. The `scripting` permission enables us to inject content scripts and execute JavaScript in the context of web pages. The `host_permissions` with `<all_urls>` allows our extension to work on any website, which is essential for a storage inspector that needs to access storage across different origins.

### Understanding Permissions in Manifest V3

Manifest V3 introduced several changes to how permissions work in Chrome extensions. Unlike the previous Manifest V2, background scripts now run as service workers, which means they cannot access the DOM directly and have a more limited execution model. Additionally, host permissions must be declared separately in the `host_permissions` key rather than the `permissions` key.

For our storage viewer, we need the ability to inject scripts into web pages to access their localStorage and sessionStorage data. This is accomplished through the `scripting` API, which allows us to execute functions in the context of the page. We will use this capability to retrieve storage data and perform operations like adding, updating, or deleting storage items.

---

## Building the Popup Interface {#popup-interface}

The popup is what users see when they click the extension icon in Chrome's toolbar. This is where users will interact with storage data, so it needs to be intuitive and feature-rich.

### HTML Structure

The popup.html file defines the user interface for our storage viewer. We will create a clean, organized layout that displays both localStorage and sessionStorage data:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Local Storage Viewer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Storage Viewer</h1>
      <div class="controls">
        <button id="refreshBtn" title="Refresh">↻</button>
        <button id="clearAllBtn" title="Clear All">Clear All</button>
      </div>
    </header>
    
    <div class="storage-type-selector">
      <label>
        <input type="radio" name="storageType" value="local" checked>
        localStorage
      </label>
      <label>
        <input type="radio" name="storageType" value="session">
        sessionStorage
      </label>
    </div>
    
    <div class="add-item-form">
      <input type="text" id="newKey" placeholder="Key">
      <input type="text" id="newValue" placeholder="Value">
      <button id="addItemBtn">Add</button>
    </div>
    
    <div class="storage-list" id="storageList">
      <p class="empty-state">Click refresh to load storage data</p>
    </div>
    
    <div class="status-bar">
      <span id="itemCount">0 items</span>
      <span id="storageSize">0 KB</span>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The popup interface includes several key components: a header with refresh and clear buttons, a radio button selector to switch between localStorage and sessionStorage, an input form for adding new storage items, a scrollable list for displaying storage data, and a status bar showing item count and estimated storage size.

### Styling the Popup

The popup.css file provides styling that makes the interface clean and professional. We will use a modern, developer-tool aesthetic with clear visual hierarchy:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 400px;
  min-height: 500px;
  background: #1e1e1e;
  color: #d4d4d4;
}

.container {
  padding: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.controls button {
  background: #333;
  border: 1px solid #444;
  color: #d4d4d4;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 8px;
  transition: background 0.2s;
}

.controls button:hover {
  background: #444;
}

.storage-type-selector {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.storage-type-selector label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.add-item-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.add-item-form input {
  flex: 1;
  padding: 8px;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  color: #d4d4d4;
}

.add-item-form button {
  padding: 8px 16px;
  background: #0d6396;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.add-item-form button:hover {
  background: #0a4d78;
}

.storage-list {
  max-height: 340px;
  overflow-y: auto;
}

.storage-item {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
}

.storage-item .key {
  font-weight: 600;
  color: #9cdcfe;
  word-break: break-all;
  margin-bottom: 4px;
}

.storage-item .value {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #ce9178;
  word-break: break-all;
  white-space: pre-wrap;
}

.storage-item .actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.storage-item .actions button {
  padding: 4px 8px;
  font-size: 11px;
  background: #333;
  border: 1px solid #444;
  border-radius: 3px;
  color: #d4d4d4;
  cursor: pointer;
}

.storage-item .actions button:hover {
  background: #444;
}

.storage-item .actions button.delete {
  color: #f48771;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid #444;
  font-size: 12px;
  color: #808080;
}

.empty-state {
  text-align: center;
  color: #808080;
  padding: 40px 0;
}
```

The styling uses a dark theme that matches Chrome DevTools, creating a familiar environment for developers. The color scheme uses muted grays for backgrounds, with specific colors for different data types: light blue for keys and coral/orange for string values.

---

## Implementing the Extension Logic {#implementation-logic}

Now we need to implement the core functionality of our extension. This involves the popup.js script that handles user interactions, content.js for accessing page storage, and background.js for managing the extension lifecycle.

### Content Script for Storage Access

The content script runs in the context of web pages and provides the bridge between the extension popup and the page's storage data. Create content.js with the following implementation:

```javascript
// content.js - Runs in the context of web pages

// Function to get all storage items
function getStorageData(storageType) {
  return new Promise((resolve, reject) => {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    const items = [];
    
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        const value = storage.getItem(key);
        items.push({ key, value });
      }
      resolve({ items, type: storageType });
    } catch (error) {
      reject({ error: error.message, type: storageType });
    }
  });
}

// Function to set a storage item
function setStorageItem(key, value, storageType) {
  return new Promise((resolve, reject) => {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    
    try {
      storage.setItem(key, value);
      resolve({ success: true, key, value, type: storageType });
    } catch (error) {
      reject({ error: error.message, type: storageType });
    }
  });
}

// Function to remove a storage item
function removeStorageItem(key, storageType) {
  return new Promise((resolve, reject) => {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    
    try {
      storage.removeItem(key);
      resolve({ success: true, key, type: storageType });
    } catch (error) {
      reject({ error: error.message, type: storageType });
    }
  });
}

// Function to clear all storage
function clearStorage(storageType) {
  return new Promise((resolve, reject) => {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    
    try {
      storage.clear();
      resolve({ success: true, type: storageType });
    } catch (error) {
      reject({ error: error.message, type: storageType });
    }
  });
}

// Calculate storage size in bytes
function getStorageSize(storageType) {
  const storage = storageType === 'local' ? localStorage : sessionStorage;
  let size = 0;
  
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    const value = storage.getItem(key);
    size += key.length + value.length;
  }
  
  return size;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, key, value, storageType } = message;
  
  switch (action) {
    case 'getStorage':
      getStorageData(storageType).then(result => {
        sendResponse({ 
          ...result, 
          size: getStorageSize(storageType) 
        });
      }).catch(error => sendResponse({ error }));
      return true;
      
    case 'setItem':
      setStorageItem(key, value, storageType).then(result => {
        sendResponse(result);
      }).catch(error => sendResponse({ error }));
      return true;
      
    case 'removeItem':
      removeStorageItem(key, storageType).then(result => {
        sendResponse(result);
      }).catch(error => sendResponse({ error }));
      return true;
      
    case 'clearAll':
      clearStorage(storageType).then(result => {
        sendResponse(result);
      }).catch(error => sendResponse({ error }));
      return true;
  }
});
```

The content script exposes several functions that the popup can call via message passing. Each function returns a Promise, allowing for asynchronous operations and proper error handling. The script also calculates the approximate storage size in bytes, which provides useful feedback to users.

### Popup Script

The popup.js script handles user interactions and communicates with the content script:

```javascript
// popup.js - Handles popup UI interactions

let currentStorageType = 'local';
let currentItems = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  
  // Event listeners
  document.getElementById('refreshBtn').addEventListener('click', loadStorage);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllStorage);
  document.getElementById('addItemBtn').addEventListener('click', addItem);
  
  // Storage type selector
  document.querySelectorAll('input[name="storageType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentStorageType = e.target.value;
      loadStorage();
    });
  });
});

// Load storage data from current tab
async function loadStorage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getStorage',
      storageType: currentStorageType
    });
    
    if (response.error) {
      showError('Cannot access storage: ' + response.error);
      return;
    }
    
    currentItems = response.items;
    renderStorageList(response.items);
    updateStatus(response.items.length, response.size || 0);
  } catch (error) {
    showError('Cannot access this page. Make sure you are on a web page.');
  }
}

// Render storage items in the popup
function renderStorageList(items) {
  const list = document.getElementById('storageList');
  
  if (items.length === 0) {
    list.innerHTML = '<p class="empty-state">No items in storage</p>';
    return;
  }
  
  list.innerHTML = items.map((item, index) => `
    <div class="storage-item" data-key="${escapeHtml(item.key)}">
      <div class="key">${escapeHtml(item.key)}</div>
      <div class="value">${escapeHtml(item.value)}</div>
      <div class="actions">
        <button class="edit-btn" data-index="${index}">Edit</button>
        <button class="delete delete-btn" data-key="${escapeHtml(item.key)}">Delete</button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to buttons
  list.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => editItem(e.target.dataset.index));
  });
  
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteItem(e.target.dataset.key));
  });
}

// Add new storage item
async function addItem() {
  const keyInput = document.getElementById('newKey');
  const valueInput = document.getElementById('newValue');
  
  const key = keyInput.value.trim();
  const value = valueInput.value.trim();
  
  if (!key) {
    alert('Please enter a key');
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.tabs.sendMessage(tab.id, {
      action: 'setItem',
      key,
      value,
      storageType: currentStorageType
    });
    
    keyInput.value = '';
    valueInput.value = '';
    loadStorage();
  } catch (error) {
    alert('Failed to add item: ' + error.message);
  }
}

// Edit existing storage item
async function editItem(index) {
  const item = currentItems[index];
  const newValue = prompt(`Edit value for "${item.key}":`, item.value);
  
  if (newValue === null || newValue === item.value) {
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.tabs.sendMessage(tab.id, {
      action: 'setItem',
      key: item.key,
      value: newValue,
      storageType: currentStorageType
    });
    
    loadStorage();
  } catch (error) {
    alert('Failed to update item: ' + error.message);
  }
}

// Delete storage item
async function deleteItem(key) {
  if (!confirm(`Delete "${key}"?`)) {
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.tabs.sendMessage(tab.id, {
      action: 'removeItem',
      key,
      storageType: currentStorageType
    });
    
    loadStorage();
  } catch (error) {
    alert('Failed to delete item: ' + error.message);
  }
}

// Clear all storage
async function clearAllStorage() {
  if (!confirm('Clear all storage items?')) {
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.tabs.sendMessage(tab.id, {
      action: 'clearAll',
      storageType: currentStorageType
    });
    
    loadStorage();
  } catch (error) {
    alert('Failed to clear storage: ' + error.message);
  }
}

// Update status bar
function updateStatus(count, size) {
  document.getElementById('itemCount').textContent = `${count} items`;
  document.getElementById('storageSize').textContent = `${(size / 1024).toFixed(2)} KB`;
}

// Show error message
function showError(message) {
  document.getElementById('storageList').innerHTML = 
    `<p class="empty-state" style="color: #f48771;">${escapeHtml(message)}</p>`;
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

The popup script coordinates all user interactions with the content script. It handles loading storage data, adding new items, editing existing values, deleting items, and clearing all storage. The script also includes proper error handling and user feedback through alerts and status updates.

### Background Service Worker

The background.js file serves as the service worker for the extension. In Manifest V3, service workers handle events like extension installation, updates, and browser action clicks:

```javascript
// background.js - Service worker for the extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Local Storage Viewer installed:', details.reason);
});

// Handle messages from content scripts if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle any background tasks here
  console.log('Background received message:', message);
});
```

While the background service worker is minimal in this implementation, it provides a foundation for adding more advanced features like keyboard shortcuts, context menus, or cross-tab synchronization.

---

## Testing Your Extension {#testing-extension}

Before deploying your extension, you need to test it thoroughly to ensure all functionality works as expected. Chrome provides a convenient way to load unpacked extensions for testing.

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked" and select your extension's directory
4. The extension icon should appear in Chrome's toolbar

### Testing Storage Operations

To test your Local Storage Viewer extension:

1. Navigate to any website (or create a simple test page with localStorage)
2. Open the browser's DevTools (F12) and use the console to set some test data:
   ```javascript
   localStorage.setItem('testKey', 'testValue');
   localStorage.setItem('userPreferences', JSON.stringify({theme: 'dark', language: 'en'}));
   sessionStorage.setItem('sessionData', 'temporary value');
   ```
3. Click your extension icon in the toolbar
4. Verify that you can see all the storage items
5. Test adding, editing, and deleting items
6. Switch between localStorage and sessionStorage using the radio buttons

---

## Advanced Features and Enhancements {#advanced-features}

Once you have the basic storage viewer working, consider adding these advanced features to make your extension even more powerful:

### JSON Syntax Highlighting and Formatting

Currently, all values are displayed as plain strings. You can enhance the display to automatically detect and format JSON data with syntax highlighting, making nested objects and arrays much easier to read.

### Search and Filter Functionality

Add a search input that filters storage items by key or value. This is especially useful when dealing with applications that store many items in localStorage.

### Export and Import

Allow users to export storage data as a JSON file for backup purposes, and import previously exported data. This is valuable for developers who need to share configuration between environments.

### Storage Quota Monitoring

Display warnings when storage is approaching browser limits. Different browsers have different quotas for localStorage (typically 5-10MB per origin).

---

## Conclusion {#conclusion}

Building a Local Storage Viewer Chrome Extension is an excellent project that teaches you fundamental concepts of Chrome extension development while creating a genuinely useful developer tool. Throughout this guide, we covered the essential components of a Manifest V3 extension: the manifest configuration, popup interface with HTML and CSS, content scripts for accessing page context, and the popup script for handling user interactions.

The extension we built provides complete CRUD functionality for both localStorage and sessionStorage, with a clean dark-theme interface that matches Chrome DevTools. Users can view all storage items, add new key-value pairs, edit existing values, delete individual items, or clear all storage at once.

This foundation opens doors to more advanced extension development projects. You could extend this storage viewer to support cookies, IndexedDB, and Cache API inspection. You could add features like storage change monitoring with real-time updates, or implement data visualization for understanding application state. The skills you have learned here—working with Chrome APIs, managing extension permissions, building popup interfaces, and implementing cross-context communication—transfer directly to any Chrome extension project you tackle next.

Remember to test your extension thoroughly across different websites and browsers before publishing it to the Chrome Web Store. Pay attention to security considerations, always validate user input, and handle errors gracefully to provide the best possible experience for your users.
