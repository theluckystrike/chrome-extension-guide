---
layout: post
title: "Build a Text Expander Chrome Extension: Type Shortcuts, Get Full Text"
description: "Learn to build a text expander Chrome extension that automatically expands typed shortcuts into full text. Complete guide with code examples and implementation details."
date: 2025-04-30
categories: [Chrome-Extensions, Productivity]
tags: [text-expander, productivity, chrome-extension]
keywords: "chrome extension text expander, text shortcut chrome, build text expander extension, typing shortcut chrome extension, auto expand text chrome"
canonical_url: "https://bestchromeextensions.com/2025/04/30/build-text-expander-chrome-extension/"
---

Build a Text Expander Chrome Extension: Type Shortcuts, Get Full Text

Text expanders are incredibly powerful productivity tools that can save you hours of typing every week. Whether you frequently type email signatures, code snippets, addresses, or repetitive phrases, a text expander Chrome extension can transform how you work. Instead of typing the same long text repeatedly, you simply type a short shortcut. like "/sig" for your email signature or "//email" for your full email address. and the extension automatically expands it to the complete text.

we will walk you through building a fully functional text expander Chrome extension from scratch. You will learn how to detect typed shortcuts in any text field, manage expansion rules, handle special cases, and package your extension for the Chrome Web Store. By the end of this tutorial, you will have a production-ready extension that can significantly boost productivity for you and your users.

---

Why Build a Text Expander Chrome Extension? {#why-build}

The demand for text expander tools continues to grow as more people work remotely, communicate via text-heavy platforms, and seek ways to streamline their digital workflows. Here is why building a text expander Chrome extension is an excellent project:

High Utility and Practical Application

Text expanders solve real problems for real users. Customer support agents who respond to dozens of tickets daily, developers who repeatedly type code snippets, healthcare professionals who enter patient information, and writers who use standard phrases all benefit from text expansion. This is not a gimmick. it is a genuine productivity tool that saves an average user 30-60 minutes per day.

Relatively Simple Implementation

Despite its usefulness, a basic text expander extension is surprisingly straightforward to build. The core functionality requires detecting keyboard input, maintaining a dictionary of shortcuts, and replacing typed shortcuts with their corresponding expansions. You do not need complex backend infrastructure or expensive resources.

Monetization Potential

Text expander extensions have proven market demand. Popular options like TextExpander (for macOS) and various Chrome extensions command premium prices or offer solid freemium models. Your extension can attract a large user base and potentially generate revenue through premium features, subscriptions, or donations.

---

Understanding the Core Mechanics {#core-mechanics}

Before diving into code, let us understand how text expansion works in a browser environment. The key challenge is detecting when a user types a shortcut and replacing it with the expanded text at the correct cursor position.

How Text Expansion Works

A text expander operates by monitoring keyboard input across text fields in the browser. When the user types a sequence of characters that matches a defined shortcut, the extension replaces those characters with the full expansion text. This process requires several steps:

1. Input Monitoring: Listen for keyboard events in text input fields
2. Shortcut Detection: Track typed characters and check against the shortcut dictionary
3. Text Replacement: Delete the typed shortcut and insert the expansion text
4. Cursor Positioning: Place the cursor at the appropriate position after expansion

Technical Approaches

There are two primary approaches to implementing text expansion in Chrome extensions:

Approach 1: Content Script Input Monitoring

The content script attaches event listeners to all text input elements on the page. It monitors keypress events, builds a buffer of typed characters, and when a shortcut match is found, replaces the text programmatically. This approach works on most websites but may conflict with some complex web applications.

Approach 2: Input Method Editor (IME) Integration

This approach uses the Chrome IME API to intercept text input at the browser level. It provides more reliable detection but requires additional permissions and is more complex to implement.

For this guide, we will use Approach 1. the content script method. because it is simpler to implement, works on most websites, and does not require special permissions.

---

Setting Up the Project Structure {#project-structure}

Let us start by setting up the project structure for our text expander extension. Create a new folder for your project and set up the essential files:

Project Directory

```
text-expander-extension/
 manifest.json
 background.js
 content.js
 popup.html
 popup.js
 popup.css
 options.html
 options.js
 styles.css
 icons/
    icon16.png
    icon48.png
    icon128.png
 data/
     shortcuts.json
```

The Manifest File

Every Chrome extension begins with the manifest.json file. This file defines the extension's name, version, permissions, and the files that make up the extension:

```json
{
  "manifest_version": 3,
  "name": "Text Expander Pro",
  "version": "1.0",
  "description": "Automatically expand typed shortcuts into full text. Boost your productivity with custom text snippets.",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_popup": "popup.html",
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

The manifest declares that we need storage permission to save shortcut configurations, activeTab to access the current tab, and scripting to inject our content script. The host_permissions allow our extension to work on all websites.

---

Building the Content Script {#content-script}

The content script is the heart of our text expander. It runs on every web page and monitors text input to detect and expand shortcuts:

```javascript
// content.js
class TextExpander {
  constructor() {
    this.shortcuts = {};
    this.buffer = '';
    this.maxBufferLength = 50;
    this.lastInputTime = Date.now();
    this.inputTimeout = 500; // Reset buffer after 500ms of inactivity
    this.expansionInProgress = false;
    
    this.init();
  }

  async init() {
    // Load shortcuts from storage
    await this.loadShortcuts();
    
    // Listen for shortcut updates from the popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'shortcutsUpdated') {
        this.shortcuts = message.shortcuts;
      }
    });
    
    // Attach input listeners to existing and future input elements
    this.attachListeners();
    
    // Observe for new elements added to the DOM
    this.observeDOM();
  }

  async loadShortcuts() {
    try {
      const result = await chrome.storage.sync.get('shortcuts');
      this.shortcuts = result.shortcuts || this.getDefaultShortcuts();
    } catch (error) {
      console.error('Error loading shortcuts:', error);
      this.shortcuts = this.getDefaultShortcuts();
    }
  }

  getDefaultShortcuts() {
    return {
      '/sig': 'Best regards,\nYour Name\nSoftware Developer',
      '/email': 'your.email@example.com',
      '/addr': '123 Main Street, City, State 12345',
      '/date': new Date().toLocaleDateString(),
      '/time': new Date().toLocaleTimeString()
    };
  }

  attachListeners() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="search"], textarea, [contenteditable="true"]');
    
    inputs.forEach(input => {
      if (!input.hasAttribute('data-text-expander-attached')) {
        input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        input.addEventListener('input', (e) => this.handleInput(e));
        input.setAttribute('data-text-expander-attached', 'true');
      }
    });
  }

  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          this.attachListeners();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  handleInput(event) {
    // Reset expansion flag
    this.expansionInProgress = false;
    
    // Track time of last input
    const now = Date.now();
    if (now - this.lastInputTime > this.inputTimeout) {
      this.buffer = '';
    }
    this.lastInputTime = now;
  }

  handleKeyDown(event) {
    if (this.expansionInProgress) {
      return;
    }

    // Only process printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      this.buffer += event.key;
      
      // Trim buffer to max length
      if (this.buffer.length > this.maxBufferLength) {
        this.buffer = this.buffer.slice(-this.maxBufferLength);
      }
      
      // Check for shortcut match
      this.checkForShortcut(event.target);
    } else if (event.key === 'Backspace') {
      // Handle backspace - remove last character from buffer
      this.buffer = this.buffer.slice(0, -1);
    } else if (event.key === 'Escape' || event.key === 'Enter') {
      // Reset buffer on escape or enter
      this.buffer = '';
    }
  }

  checkForShortcut(inputElement) {
    // Check if buffer ends with any shortcut
    for (const [shortcut, expansion] of Object.entries(this.shortcuts)) {
      if (this.buffer.endsWith(shortcut)) {
        this.expandShortcut(inputElement, shortcut, expansion);
        break;
      }
    }
  }

  expandShortcut(inputElement, shortcut, expansion) {
    this.expansionInProgress = true;
    
    // Get the current cursor position
    let cursorPosition;
    let textBeforeCursor;
    
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      cursorPosition = inputElement.selectionStart;
      textBeforeCursor = inputElement.value.substring(0, cursorPosition);
    } else if (inputElement.isContentEditable) {
      // Handle contenteditable elements
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(inputElement);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        textBeforeCursor = preCaretRange.toString();
        cursorPosition = textBeforeCursor.length;
      }
    }
    
    // Find where the shortcut starts in the text before cursor
    const shortcutStart = textBeforeCursor.lastIndexOf(shortcut);
    
    if (shortcutStart === -1) {
      this.expansionInProgress = false;
      return;
    }

    // Calculate the number of characters to delete
    const charactersToDelete = textBeforeCursor.length - shortcutStart;
    
    // Perform the expansion
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      const textAfterCursor = inputElement.value.substring(cursorPosition);
      const newValue = textBeforeCursor.substring(0, shortcutStart) + expansion + textAfterCursor;
      inputElement.value = newValue;
      
      // Set cursor position after expansion
      const newCursorPosition = shortcutStart + expansion.length;
      inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
    } else if (inputElement.isContentEditable) {
      // Handle contenteditable expansion
      this.expandContentEditable(inputElement, shortcutStart, charactersToDelete, expansion);
    }
    
    // Clear buffer after expansion
    this.buffer = '';
    
    // Dispatch custom event for analytics or further processing
    inputElement.dispatchEvent(new CustomEvent('textExpanded', {
      detail: { shortcut, expansion }
    }));
  }

  expandContentEditable(element, shortcutStart, charactersToDelete, expansion) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    range.setStart(range.startContainer, shortcutStart);
    range.deleteContents();
    
    const textNode = document.createTextNode(expansion);
    range.insertNode(textNode);
    
    // Move cursor to end of inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// Initialize the text expander when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TextExpander());
} else {
  new TextExpander();
}
```

This content script implements all the core functionality: monitoring keyboard input, maintaining a buffer of typed characters, detecting shortcut matches, and performing the text replacement. It supports both regular input elements and contenteditable areas.

---

Creating the Popup Interface {#popup-interface}

The popup provides a quick interface for users to manage their shortcuts without opening a separate options page:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Text Expander Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Text Expander Pro</h1>
      <span class="badge" id="shortcutCount">0 shortcuts</span>
    </header>
    
    <main class="popup-content">
      <div class="shortcuts-list" id="shortcutsList">
        <!-- Shortcuts will be rendered here -->
      </div>
      
      <button class="add-shortcut-btn" id="addShortcutBtn">
        <span>+</span> Add New Shortcut
      </button>
    </main>
    
    <footer class="popup-footer">
      <button class="options-btn" id="openOptions"> Settings</button>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

```css
/* popup.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: #f9f9f9;
}

.popup-container {
  padding: 16px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.popup-header h1 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.badge {
  background-color: #e8f5e9;
  color: #2e7d32;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.shortcuts-list {
  max-height: 300px;
  overflow-y: auto;
}

.shortcut-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.shortcut-item .shortcut {
  color: #1a73e8;
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.shortcut-item .expansion {
  color: #555;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-shortcut-btn {
  width: 100%;
  padding: 12px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.add-shortcut-btn:hover {
  background-color: #1557b0;
}

.popup-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

.options-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  padding: 4px;
}

.options-btn:hover {
  color: #333;
}
```

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const shortcutsList = document.getElementById('shortcutsList');
  const shortcutCount = document.getElementById('shortcutCount');
  const addShortcutBtn = document.getElementById('addShortcutBtn');
  const openOptions = document.getElementById('openOptions');
  
  let shortcuts = {};
  
  // Load shortcuts from storage
  async function loadShortcuts() {
    try {
      const result = await chrome.storage.sync.get('shortcuts');
      shortcuts = result.shortcuts || {};
      renderShortcuts();
    } catch (error) {
      console.error('Error loading shortcuts:', error);
    }
  }
  
  // Render shortcuts in the list
  function renderShortcuts() {
    const entries = Object.entries(shortcuts);
    shortcutCount.textContent = `${entries.length} shortcut${entries.length !== 1 ? 's' : ''}`;
    
    if (entries.length === 0) {
      shortcutsList.innerHTML = '<p class="empty-message">No shortcuts yet. Add your first shortcut!</p>';
      return;
    }
    
    shortcutsList.innerHTML = entries.map(([shortcut, expansion]) => `
      <div class="shortcut-item">
        <div class="shortcut">${escapeHtml(shortcut)}</div>
        <div class="expansion">${escapeHtml(expansion)}</div>
      </div>
    `).join('');
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Open options page
  openOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Add shortcut button
  addShortcutBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Initial load
  await loadShortcuts();
});
```

---

Building the Options Page {#options-page}

The options page provides a comprehensive interface for managing shortcuts:

```html
<!-- options.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Text Expander - Options</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; margin-bottom: 20px; }
    .container { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .shortcuts-container { margin-bottom: 24px; }
    .shortcut-row { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
    .shortcut-row input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .shortcut-row input:focus { outline: none; border-color: #1a73e8; }
    .shortcut-row .expansion-input { flex: 2; }
    .delete-btn { background: #fee2e2; color: #dc2626; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; }
    .delete-btn:hover { background: #fecaca; }
    .add-btn { background: #1a73e8; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .add-btn:hover { background: #1557b0; }
    .save-btn { background: #22c55e; color: white; border: none; padding: 12px 32px; border-radius: 6px; cursor: pointer; font-size: 16px; }
    .save-btn:hover { background: #16a34a; }
    .message { padding: 12px; border-radius: 6px; margin-bottom: 16px; display: none; }
    .message.success { background: #dcfce7; color: #166534; display: block; }
    .message.error { background: #fee2e2; color: #dc2626; display: block; }
    .import-export { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e5e5; }
    .import-export h3 { margin-bottom: 12px; }
    .import-export button { margin-right: 8px; padding: 8px 16px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; }
    .import-export button:hover { background: #e5e5e5; }
  </style>
</head>
<body>
  <h1>Text Expander Options</h1>
  <div class="container">
    <div class="message" id="message"></div>
    <div class="shortcuts-container" id="shortcutsContainer"></div>
    <button class="add-btn" id="addShortcut">+ Add Shortcut</button>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e5e5;">
    <button class="save-btn" id="saveShortcuts">Save All Changes</button>
    
    <div class="import-export">
      <h3>Import / Export</h3>
      <button id="exportBtn">Export Shortcuts</button>
      <button id="importBtn">Import Shortcuts</button>
      <input type="file" id="importFile" accept=".json" style="display: none;">
    </div>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

```javascript
// options.js
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('shortcutsContainer');
  const addBtn = document.getElementById('addShortcut');
  const saveBtn = document.getElementById('saveShortcuts');
  const message = document.getElementById('message');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  
  let shortcuts = {};
  
  // Load existing shortcuts
  async function loadShortcuts() {
    const result = await chrome.storage.sync.get('shortcuts');
    shortcuts = result.shortcuts || {};
    renderShortcuts();
  }
  
  // Render shortcut rows
  function renderShortcuts() {
    container.innerHTML = '';
    const entries = Object.entries(shortcuts);
    
    if (entries.length === 0) {
      addShortcutRow('', '');
      return;
    }
    
    entries.forEach(([shortcut, expansion]) => {
      addShortcutRow(shortcut, expansion);
    });
  }
  
  // Add a new shortcut row
  function addShortcutRow(shortcut = '', expansion = '') {
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    row.innerHTML = `
      <input type="text" class="shortcut" placeholder="Shortcut (e.g., /sig)" value="${escapeHtml(shortcut)}">
      <input type="text" class="expansion-input expansion" placeholder="Expansion text" value="${escapeHtml(expansion)}">
      <button class="delete-btn">Delete</button>
    `;
    
    row.querySelector('.delete-btn').addEventListener('click', () => {
      row.remove();
    });
    
    container.appendChild(row);
  }
  
  // Show message
  function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
    setTimeout(() => {
      message.className = 'message';
    }, 3000);
  }
  
  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Save shortcuts
  saveBtn.addEventListener('click', async () => {
    const rows = container.querySelectorAll('.shortcut-row');
    const newShortcuts = {};
    
    rows.forEach(row => {
      const shortcut = row.querySelector('.shortcut').value.trim();
      const expansion = row.querySelector('.expansion').value;
      
      if (shortcut && expansion) {
        newShortcuts[shortcut] = expansion;
      }
    });
    
    try {
      await chrome.storage.sync.set({ shortcuts: newShortcuts });
      shortcuts = newShortcuts;
      
      // Notify content scripts of the update
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'shortcutsUpdated', shortcuts: newShortcuts }).catch(() => {});
      });
      
      showMessage('Shortcuts saved successfully!', 'success');
    } catch (error) {
      showMessage('Error saving shortcuts: ' + error.message, 'error');
    }
  });
  
  // Add new shortcut
  addBtn.addEventListener('click', () => {
    addShortcutRow();
  });
  
  // Export shortcuts
  exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(shortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text-expander-shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  
  // Import shortcuts
  importBtn.addEventListener('click', () => {
    importFile.click();
  });
  
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      shortcuts = { ...shortcuts, ...imported };
      renderShortcuts();
      showMessage('Shortcuts imported successfully!', 'success');
    } catch (error) {
      showMessage('Error importing file: ' + error.message, 'error');
    }
    
    importFile.value = '';
  });
  
  // Initial load
  await loadShortcuts();
});
```

---

The Background Service Worker {#background-worker}

The background service worker handles extension lifecycle events and manages communication between components:

```javascript
// background.js
// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default shortcuts on first install
    const defaultShortcuts = {
      '/sig': 'Best regards,\n[Your Name]\n[Your Title]',
      '/email': 'your.email@example.com',
      '/addr': '123 Main Street, City, State 12345',
      '/date': new Date().toLocaleDateString(),
      '/time': new Date().toLocaleTimeString()
    };
    
    chrome.storage.sync.set({ shortcuts: defaultShortcuts });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getShortcuts') {
    chrome.storage.sync.get('shortcuts', (result) => {
      sendResponse(result.shortcuts || {});
    });
    return true;
  }
});

// Handle keyboard shortcut for quick access
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-text-expander') {
    chrome.action.openPopup();
  }
});
```

---

Testing Your Extension {#testing}

Before publishing, thoroughly test your extension:

1. Load the extension: Open Chrome and navigate to `chrome://extensions/`. Enable Developer Mode, click "Load unpacked," and select your project folder.

2. Test on various websites: Try your extension on different types of websites. Gmail, Google Docs, social media, and web apps. Verify that shortcuts expand correctly in different text fields.

3. Test edge cases: Try expanding shortcuts at the beginning of a text field, in the middle, and at the end. Test with special characters and multi-line expansions.

4. Test keyboard interactions: Verify that backspace, escape, and enter keys work correctly after expansion.

---

Publishing to the Chrome Web Store {#publishing}

When your extension is ready:

1. Prepare your assets: Create a compelling icon (128x128 pixels), screenshot images, and a detailed description.

2. Package the extension: In the extensions page, click "Pack extension" to create a .crx file.

3. Create a developer account: Sign up for a Chrome Web Store developer account ($5 one-time fee).

4. Upload and publish: Upload your packaged extension, fill in the listing details, and submit for review.

---

Conclusion {#conclusion}

Congratulations! You have built a fully functional text expander Chrome extension. This extension monitors text input across all websites, detects typed shortcuts, and automatically expands them to full text. The project demonstrates key Chrome extension concepts including content scripts, background service workers, the Storage API, and popup interfaces.

From here, you can enhance your extension with features like:

- Dynamic expansions: Include today's date, clipboard content, or other dynamic data
- Shortcut folders: Organize shortcuts into categories
- Sync across devices: Use chrome.storage.sync to keep shortcuts consistent
- Application-specific shortcuts: Different shortcut sets for different websites

Text expanders remain one of the most practical and marketable Chrome extension categories. Your implementation provides a solid foundation that you can continue to improve and potentially monetize.

---

Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Storage API Reference](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Content Scripts Guide](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Chrome Web Store Publishing](https://developer.chrome.com/docs/webstore/publish/)

Start building your text expander today and experience the productivity gains of automated text expansion in your browser!
