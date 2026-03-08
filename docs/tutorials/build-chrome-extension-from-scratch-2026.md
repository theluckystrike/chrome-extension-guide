---
layout: default
title: "How to Build a Chrome Extension from Scratch in 2026 - Beginner Tutorial"
description: "Learn how to build a Chrome extension from scratch in 2026. This beginner tutorial covers Manifest V3, popup creation, content scripts, background service workers, and publishing to the Chrome Web Store."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/tutorials/build-chrome-extension-from-scratch-2026/"
---

# How to Build a Chrome Extension from Scratch in 2026 - Beginner Tutorial

Building a Chrome extension has never been more accessible, especially with the improvements introduced in Manifest V3 and the modern development tooling available in 2026. Whether you want to create a simple productivity tool or a complex browser enhancement, this comprehensive tutorial will guide you through the entire process from concept to Chrome Web Store publication.

In this tutorial, we'll build a fully functional Chrome extension called "Page Notes" that allows users to add personal notes to any webpage. This practical project will teach you the core concepts of Chrome extension development while creating something genuinely useful. By the end of this guide, you'll have the knowledge and confidence to build and publish your own Chrome extensions.

## Prerequisites for Chrome Extension Development

Before we dive into building our extension, let's ensure you have the necessary tools installed on your development machine. You'll need a modern code editor (Visual Studio Code is highly recommended), Node.js version 18 or higher, and Google Chrome browser for testing your extension.

Additionally, you'll want familiarity with HTML, CSS, and JavaScript fundamentals. While we'll keep the code accessible for beginners, understanding these core web technologies will help you grasp the concepts more quickly. If you're comfortable creating web pages, you'll find Chrome extension development follows many of the same patterns you're already familiar with.

## Understanding Chrome Extension Architecture

Chrome extensions consist of several components that work together to extend browser functionality. Understanding these components is crucial before writing any code. The main parts include the manifest file, popup interface, background service worker, content scripts, and optional components like options pages and side panels.

The manifest file serves as the configuration blueprint for your extension, declaring permissions, defining UI components, and specifying which files the browser should load. Content scripts run in the context of web pages, allowing your extension to interact with page content. The background service worker handles events and long-running tasks independent of any particular webpage. The popup provides a convenient interface accessible from the Chrome toolbar.

One excellent example of a well-architected extension is Tab Suspender Pro, which demonstrates efficient use of the background service worker for managing tab states, content scripts for page interaction, and the Chrome Storage API for persisting user preferences. We'll draw inspiration from these patterns throughout this tutorial.

## Step 1: Creating Your Extension Project Structure

Let's start by creating the project directory and essential files. Create a new folder named "page-notes" and set up the following directory structure:

```
page-notes/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
├── icon.png
└── _locales/
    └── en/
        └── messages.json
```

This structure separates our concerns logically, with each file serving a specific purpose in our extension. The manifest.json file is the only required file, but the others enable the full functionality we need.

## Step 2: Writing the Manifest File

The manifest.json file is the heart of every Chrome extension. In Manifest V3 (the current standard), this file defines everything about your extension:

```json
{
  "manifest_version": 3,
  "name": "Page Notes",
  "version": "1.0.0",
  "description": "Add personal notes to any webpage",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon.png",
      "48": "icon.png",
      "128": "icon.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icon.png",
    "48": "icon.png",
    "128": "icon.png"
  }
}
```

The manifest_version: 3 is essential, as Google deprecated Manifest V2 extensions in 2024. Our permissions array includes storage (for saving notes), activeTab (for accessing the current tab), and scripting (for injecting content scripts when needed).

## Step 3: Building the Popup Interface

The popup is what users see when they click your extension icon in the Chrome toolbar. Let's create an intuitive interface for adding and viewing page notes:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Notes</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Page Notes</h1>
    </header>
    
    <main>
      <div id="current-page" class="page-info">
        <span class="page-label">Current page:</span>
        <span id="page-url" class="page-url">Loading...</span>
      </div>
      
      <div class="notes-section">
        <label for="note-input">Your Note:</label>
        <textarea id="note-input" placeholder="Write a note about this page..."></textarea>
      </div>
      
      <div class="actions">
        <button id="save-btn" class="btn-primary">Save Note</button>
        <button id="clear-btn" class="btn-secondary">Clear</button>
      </div>
      
      <div id="status" class="status"></div>
    </main>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now let's style it appropriately:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  padding: 16px;
  background: #ffffff;
  color: #333;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
  text-align: center;
}

.page-info {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
}

.page-label {
  color: #666;
  display: block;
  margin-bottom: 4px;
}

.page-url {
  color: #1a73e8;
  word-break: break-all;
  font-weight: 500;
}

.notes-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notes-section label {
  font-size: 14px;
  font-weight: 500;
}

#note-input {
  width: 100%;
  min-height: 100px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

#note-input:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
}

.actions {
  display: flex;
  gap: 8px;
}

button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

button:active {
  transform: scale(0.98);
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover {
  background: #1557b0;
}

.btn-secondary {
  background: #f1f3f4;
  color: #333;
}

.btn-secondary:hover {
  background: #e8eaed;
}

.status {
  text-align: center;
  font-size: 12px;
  min-height: 20px;
}

.status.success {
  color: #34a853;
}

.status.error {
  color: #ea4335;
}
```

## Step 4: Implementing Popup Functionality

The popup JavaScript handles user interactions and communicates with other parts of the extension:

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const noteInput = document.getElementById('note-input');
  const saveBtn = document.getElementById('save-btn');
  const clearBtn = document.getElementById('clear-btn');
  const statusDiv = document.getElementById('status');
  const pageUrlSpan = document.getElementById('page-url');
  
  let currentTabUrl = '';
  let currentTabId = null;
  
  // Get the current active tab
  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      currentTabId = tabs[0].id;
      currentTabUrl = tabs[0].url;
      pageUrlSpan.textContent = new URL(currentTabUrl).hostname;
      
      // Load existing note for this page
      loadNote();
    }
  }
  
  // Load note from storage
  async function loadNote() {
    try {
      const result = await chrome.storage.local.get(currentTabUrl);
      if (result[currentTabUrl]) {
        noteInput.value = result[currentTabUrl];
      }
    } catch (error) {
      console.error('Error loading note:', error);
    }
  }
  
  // Save note to storage
  async function saveNote() {
    const note = noteInput.value.trim();
    
    try {
      await chrome.storage.local.set({ [currentTabUrl]: note });
      showStatus('Note saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving note', 'error');
      console.error('Error saving note:', error);
    }
  }
  
  // Clear the note
  async function clearNote() {
    try {
      await chrome.storage.local.remove(currentTabUrl);
      noteInput.value = '';
      showStatus('Note cleared', 'success');
    } catch (error) {
      showStatus('Error clearing note', 'error');
      console.error('Error clearing note:', error);
    }
  }
  
  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 2000);
  }
  
  // Event listeners
  saveBtn.addEventListener('click', saveNote);
  clearBtn.addEventListener('click', clearNote);
  
  // Initialize
  getCurrentTab();
});
```

This implementation uses the Chrome Storage API, which is perfect for storing user data locally. For extensions that need to sync across devices, you can use `chrome.storage.sync` instead of `chrome.storage.local`. This is exactly how Tab Suspender Pro handles user preferences across multiple devices.

## Step 5: Creating the Background Service Worker

The background service worker handles events that occur independently of any specific webpage or popup. While our current extension doesn't heavily rely on background scripts, let's create one to demonstrate the pattern:

```javascript
// background.js

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // First-time installation
    chrome.storage.local.set({
      'extension_installed': true,
      'install_date': new Date().toISOString()
    });
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTabInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title,
          id: tabs[0].id
        });
      }
    });
    return true; // Keep channel open for async response
  }
});

// Handle tab updates to potentially inject content scripts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Log tab updates for debugging purposes
    console.log(`Tab updated: ${tab.url}`);
  }
});
```

The background service worker in Manifest V3 operates differently from background pages in Manifest V2. It doesn't persist between user interactions, so you'll need to handle this statelessness carefully in your extensions.

## Step 6: Creating Content Scripts

Content scripts allow your extension to interact with webpage content. Let's create a simple content script that could highlight pages with saved notes:

```javascript
// content.js

// This content script can interact with the page DOM
// Note: We don't actually inject UI into pages in this basic example
// but this is where you would add page interaction functionality

console.log('Page Notes content script loaded');

// Example: Detect if there's a saved note for this page
// This would typically communicate with the background script
// or use chrome.storage directly (content scripts have access in MV3)

/*
// Example: Add a visual indicator when a note exists
function showNoteIndicator(hasNote) {
  const indicator = document.createElement('div');
  indicator.id = 'page-notes-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: #1a73e8;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 999999;
  `;
  indicator.textContent = '📝';
  indicator.title = 'This page has a note';
  
  document.body.appendChild(indicator);
}
*/
```

Content scripts run in the context of web pages, meaning they can read and modify page content. However, they're isolated from the page's JavaScript variables and functions for security reasons.

## Step 7: Testing Your Extension

Now it's time to test your extension in Chrome. Follow these steps:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked" and select your "page-notes" directory
4. Your extension should now appear in the extensions list

You can now click the extension icon in the toolbar to open the popup, write a note, and save it. Refresh the page and open the popup again—your note should persist thanks to the Chrome Storage API.

For development, use the "Reload" button in the extensions page after making changes to your code. The extension will update without needing to remove and re-add it.

## Step 8: Publishing to the Chrome Web Store

Once your extension is tested and working, you can publish it to reach millions of Chrome users. Here's how:

First, prepare your extension for publication by creating a ZIP file of your extension directory (excluding any development files). Then, navigate to the Chrome Web Store Developer Dashboard and create a developer account if you don't have one.

You'll need to provide:
- A detailed description of your extension
- At least one screenshot (1280x800 or 640x400)
- A small tile icon (128x128)
- A privacy practice disclosure

After submitting, Google reviews your extension for policy compliance. This typically takes a few days. Once approved, your extension is live and available to all Chrome users.

## Best Practices for Extension Development

As you continue building Chrome extensions, keep these best practices in mind. Always request only the permissions you need—users are more likely to install extensions that request minimal permissions. Use Manifest V3 features like service workers and declarative net request instead of deprecated APIs.

Performance matters significantly for extensions. Avoid loading heavy libraries in your popup, and use lazy loading when possible. The Tab Suspender Pro extension exemplifies good performance practices by minimizing memory usage and efficiently managing background processes.

Security should be a priority from day one. Never trust data from web pages, validate all inputs, and use Content Security Policy headers. Keep your dependencies updated to patch security vulnerabilities promptly.

## Conclusion

Congratulations! You've successfully built a Chrome extension from scratch using Manifest V3. The "Page Notes" extension demonstrates the core concepts you need: popup interfaces, background service workers, content scripts, and the Chrome Storage API.

These fundamentals apply to any extension you want to build, whether it's a simple utility like this or a complex application like Tab Suspender Pro. The Chrome extension platform provides powerful APIs that enable you to enhance the browser experience in countless ways.

As a next step, consider adding features like note synchronization across devices using chrome.storage.sync, an options page for user preferences, or side panel integration for a more robust interface. The Chrome Extension Guide offers extensive documentation on all these topics and more.

Remember, the best extensions solve real problems for users. Keep iterating based on feedback, maintain good documentation, and your extension could become the next must-have tool for Chrome users worldwide.
