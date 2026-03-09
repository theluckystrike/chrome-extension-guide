---
layout: post
title: "Build a Base64 Encoder Decoder Chrome Extension: Complete 2025 Guide"
description: "Learn how to build a Base64 encoder decoder Chrome extension from scratch. This comprehensive guide covers manifest configuration, popup UI, encoding/decoding logic, keyboard shortcuts, and publishing to the Chrome Web Store."
date: 2025-01-27
categories: [Chrome Extensions, Developer Tools]
tags: [chrome-extension, developer-tools]
author: theluckystrike
---

# Build a Base64 Encoder Decoder Chrome Extension: Complete 2025 Guide

Base64 encoding is an essential tool for developers, security professionals, and anyone working with data transmission. Whether you're debugging API responses, encoding images for data URLs, or working with authentication tokens, a reliable **base64 converter** extension can significantly boost your productivity. In this comprehensive guide, we'll walk you through building a fully functional **base64 extension** for Chrome from scratch.

This tutorial uses the latest Manifest V3 standards and covers everything from project setup to publishing on the Chrome Web Store. By the end, you'll have a production-ready Chrome extension that can encode and decode Base64 strings with a beautiful, intuitive interface.

---

## Why Build a Base64 Extension? {#why-build}

Base64 encoding converts binary data into ASCII text format, making it safe for transmission over protocols that only support text. You'll encounter Base64 in many scenarios:

- **API Development**: Many APIs use Base64 for authentication tokens and request/response payloads
- **Image Handling**: Data URLs in web pages use Base64-encoded images
- **Email**: Base64 is used for email attachments in MIME format
- **Configuration Files**: API keys and credentials often use Base64 encoding

Having a quick-access **encode decode chrome** tool in your browser toolbar saves constant context switching between your browser and external encoding websites.

---

## Project Structure and Setup {#project-structure}

Every Chrome extension starts with a well-organized project structure. Create a new folder for your extension and set up the following files:

```
base64-tool/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

This structure separates concerns between the popup interface, background script, and extension configuration. Let's start building each component.

---

## Manifest Configuration (manifest.json) {#manifest}

The manifest.json file is the heart of every Chrome extension. It defines permissions, UI components, and extension behavior. Here's the complete configuration for our Base64 encoder decoder:

```json
{
  "manifest_version": 3,
  "name": "Base64 Encoder & Decoder",
  "version": "1.0.0",
  "description": "Quickly encode and decode Base64 strings directly in your browser",
  "permissions": [
    "storage",
    "clipboardRead",
    "clipboardWrite"
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
  "commands": {
    "encode-selection": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "Encode selected text to Base64"
    },
    "decode-selection": {
      "suggested_key": {
        "default": "Ctrl+Shift+D",
        "mac": "Command+Shift+D"
      },
      "description": "Decode Base64 selection to plain text"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Key features in this manifest:

- **Popup action**: Opens our encoding/decoding interface when clicking the extension icon
- **Clipboard permissions**: Allow users to quickly copy/paste encoded content
- **Keyboard shortcuts**: Global shortcuts for encoding and decoding selected text
- **Storage permission**: Save user preferences (like dark mode or auto-copy)

---

## Building the Popup Interface (popup.html) {#popup-html}

The popup is the main user interface for your extension. It needs to be clean, intuitive, and responsive. Here's the complete HTML structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Base64 Encoder & Decoder</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Base64 Tool</h1>
      <div class="mode-toggle">
        <button id="modeBtn" class="mode-btn">Mode: Encode</button>
      </div>
    </header>

    <main>
      <div class="input-section">
        <label for="inputText">Input</label>
        <textarea id="inputText" placeholder="Enter text to encode/decode..."></textarea>
        <div class="char-count">
          <span id="charCount">0</span> characters
        </div>
      </div>

      <div class="action-buttons">
        <button id="processBtn" class="primary-btn">Encode</button>
        <button id="clearBtn" class="secondary-btn">Clear</button>
        <button id="swapBtn" class="icon-btn" title="Swap input/output">
          ⇄
        </button>
      </div>

      <div class="output-section">
        <label for="outputText">Output</label>
        <textarea id="outputText" readonly placeholder="Result will appear here..."></textarea>
        <div class="output-actions">
          <span id="status" class="status"></span>
          <button id="copyBtn" class="copy-btn">Copy to Clipboard</button>
        </div>
      </div>
    </main>

    <footer>
      <div class="options">
        <label class="checkbox-label">
          <input type="checkbox" id="autoCopy">
          Auto-copy result
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="urlSafe" checked>
          URL-safe encoding
        </label>
      </div>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

This HTML provides:

- **Mode toggle**: Switch between encode and decode modes
- **Input textarea**: Large text area for entering content
- **Character count**: Real-time character count display
- **Action buttons**: Process, clear, and swap buttons
- **Output textarea**: Read-only area for results
- **Options**: Checkboxes for auto-copy and URL-safe encoding

---

## Styling the Popup (popup.css) {#popup-css}

A well-designed extension looks professional and is pleasant to use. Here's a comprehensive CSS file with modern styling:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --primary-color: #4285f4;
  --primary-hover: #3367d6;
  --background: #ffffff;
  --surface: #f8f9fa;
  --border: #dadce0;
  --text-primary: #202124;
  --text-secondary: #5f6368;
  --success: #34a853;
  --error: #ea4335;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 400px;
  min-height: 500px;
  background: var(--background);
  color: var(--text-primary);
}

.container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

h1 {
  font-size: 18px;
  font-weight: 600;
}

.mode-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  background: var(--border);
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-section, .output-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s ease;
}

textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

textarea[readonly] {
  background: var(--surface);
}

.char-count {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 8px 0;
}

.primary-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.primary-btn:hover {
  background: var(--primary-hover);
}

.secondary-btn {
  background: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-btn:hover {
  background: var(--border);
}

.icon-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--border);
  transform: rotate(180deg);
}

.output-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status {
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.status.show {
  opacity: 1;
}

.status.success {
  color: var(--success);
}

.status.error {
  color: var(--error);
}

.copy-btn {
  background: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: var(--primary-color);
  color: white;
}

footer {
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.options {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  text-transform: none;
  letter-spacing: normal;
}

.checkbox-label input {
  cursor: pointer;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #202124;
    --surface: #303134;
    --border: #5f6368;
    --text-primary: #e8eaed;
    --text-secondary: #9aa0a6;
  }
}
```

This CSS provides:

- Modern, clean design following Material Design principles
- Smooth transitions and hover effects
- Dark mode support based on system preferences
- Responsive layout that adapts to content
- Clear visual feedback for user actions

---

## Core Functionality (popup.js) {#popup-js}

The JavaScript file handles all the encoding/decoding logic, user interactions, and state management. Here's the complete implementation:

```javascript
// State management
let currentMode = 'encode'; // 'encode' or 'decode'
let settings = {
  autoCopy: false,
  urlSafe: true
};

// DOM elements
const modeBtn = document.getElementById('modeBtn');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const charCount = document.getElementById('charCount');
const processBtn = document.getElementById('processBtn');
const clearBtn = document.getElementById('clearBtn');
const swapBtn = document.getElementById('swapBtn');
const copyBtn = document.getElementById('copyBtn');
const status = document.getElementById('status');
const autoCopyCheckbox = document.getElementById('autoCopy');
const urlSafeCheckbox = document.getElementById('urlSafe');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  updateMode();
  setupEventListeners();
});

// Load saved settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    if (result.settings) {
      settings = { ...settings, ...result.settings };
      autoCopyCheckbox.checked = settings.autoCopy;
      urlSafeCheckbox.checked = settings.urlSafe;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings
async function saveSettings() {
  try {
    await chrome.storage.local.set({ settings });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  modeBtn.addEventListener('click', toggleMode);
  inputText.addEventListener('input', updateCharCount);
  processBtn.addEventListener('click', processInput);
  clearBtn.addEventListener('click', clearAll);
  swapBtn.addEventListener('click', swapText);
  copyBtn.addEventListener('click', copyToClipboard);
  autoCopyCheckbox.addEventListener('change', updateSettings);
  urlSafeCheckbox.addEventListener('change', updateSettings);
  
  // Keyboard shortcuts
  inputText.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      processInput();
    }
  });
}

// Update character count
function updateCharCount() {
  const count = inputText.value.length;
  charCount.textContent = count.toLocaleString();
}

// Toggle between encode and decode modes
function toggleMode() {
  currentMode = currentMode === 'encode' ? 'decode' : 'encode';
  updateMode();
}

function updateMode() {
  modeBtn.textContent = `Mode: ${currentMode === 'encode' ? 'Encode' : 'Decode'}`;
  processBtn.textContent = currentMode === 'encode' ? 'Encode' : 'Decode';
  
  // Clear output when switching modes
  outputText.value = '';
  hideStatus();
}

// Process the input (encode or decode)
function processInput() {
  const input = inputText.value.trim();
  
  if (!input) {
    showStatus('Please enter some text', 'error');
    return;
  }

  try {
    let result;
    
    if (currentMode === 'encode') {
      result = encodeBase64(input);
    } else {
      result = decodeBase64(input);
    }
    
    outputText.value = result;
    
    if (settings.autoCopy) {
      copyToClipboard();
    } else {
      showStatus(`${currentMode === 'encode' ? 'Encoded' : 'Decoded'} successfully`, 'success');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
    outputText.value = '';
  }
}

// Encode string to Base64
function encodeBase64(str) {
  // Handle Unicode characters properly
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  
  let base64 = btoa(String.fromCharCode(...data));
  
  if (settings.urlSafe) {
    base64 = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  
  return base64;
}

// Decode Base64 to string
function decodeBase64(base64) {
  let str = base64;
  
  if (settings.urlSafe) {
    // Convert URL-safe Base64 to standard Base64
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (str.length % 4) {
      str += '=';
    }
  }
  
  // Decode using atob with proper character handling
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}

// Clear all text areas
function clearAll() {
  inputText.value = '';
  outputText.value = '';
  charCount.textContent = '0';
  hideStatus();
}

// Swap input and output
function swapText() {
  const temp = inputText.value;
  inputText.value = outputText.value;
  outputText.value = temp;
  updateCharCount();
}

// Copy output to clipboard
async function copyToClipboard() {
  const text = outputText.value;
  
  if (!text) {
    showStatus('Nothing to copy', 'error');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(text);
    showStatus('Copied to clipboard!', 'success');
  } catch (error) {
    showStatus('Failed to copy', 'error');
  }
}

// Update settings
function updateSettings() {
  settings.autoCopy = autoCopyCheckbox.checked;
  settings.urlSafe = urlSafeCheckbox.checked;
  saveSettings();
}

// Show status message
function showStatus(message, type) {
  status.textContent = message;
  status.className = `status show ${type}`;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    hideStatus();
  }, 3000);
}

// Hide status message
function hideStatus() {
  status.className = 'status';
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'encode') {
    currentMode = 'encode';
    inputText.value = request.text;
    updateMode();
    processInput();
  } else if (request.action === 'decode') {
    currentMode = 'decode';
    inputText.value = request.text;
    updateMode();
    processInput();
  }
});
```

Key features of this implementation:

- **Proper Unicode handling**: Uses TextEncoder/TextDecoder for UTF-8 support
- **URL-safe Base64**: Option to use URL-safe characters (- and _ instead of + and /)
- **Settings persistence**: Saves user preferences using chrome.storage
- **Keyboard shortcuts**: Ctrl+Enter to process, plus global shortcuts
- **Clipboard integration**: Copy results with one click
- **Error handling**: Graceful handling of invalid Base64 input

---

## Background Service Worker (background.js) {#background}

The background script handles keyboard shortcuts and context menu interactions:

```javascript
// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) return;
  
  // Execute script to get selected text
  chrome.tabs.executeScript(tab.id, {
    code: 'window.getSelection().toString();'
  }, async (results) => {
    const selectedText = results[0];
    
    if (!selectedText) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'show-notification',
        message: 'No text selected'
      });
      return;
    }
    
    let result;
    let action;
    
    try {
      if (command === 'encode-selection') {
        // Encode to Base64
        const encoder = new TextEncoder();
        const data = encoder.encode(selectedText);
        result = btoa(String.fromCharCode(...data))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        action = 'encode';
      } else if (command === 'decode-selection') {
        // Decode from Base64
        let str = selectedText.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        result = decoder.decode(bytes);
        action = 'decode';
      }
      
      // Copy result to clipboard
      await navigator.clipboard.writeText(result);
      
      // Show notification
      chrome.tabs.sendMessage(tab.id, {
        action: 'show-notification',
        message: `Text ${action}d and copied!`,
        success: true
      });
      
    } catch (error) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'show-notification',
        message: 'Invalid Base64 string',
        success: false
      });
    }
  });
});

// Optional: Add context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'encodeBase64',
    title: 'Encode to Base64',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'decodeBase64',
    title: 'Decode from Base64',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;
  
  if (!selectedText) return;
  
  let result;
  
  try {
    if (info.menuItemId === 'encodeBase64') {
      const encoder = new TextEncoder();
      const data = encoder.encode(selectedText);
      result = btoa(String.fromCharCode(...data));
    } else if (info.menuItemId === 'decodeBase64') {
      let str = selectedText.replace(/-/g, '+').replace(/_/g, '/');
      while (str.length % 4) str += '=';
      const binary = atob(str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder('utf-8');
      result = decoder.decode(bytes);
    }
    
    navigator.clipboard.writeText(result);
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'show-notification',
      message: 'Copied to clipboard!',
      success: true
    });
  } catch (error) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'show-notification',
      message: 'Operation failed',
      success: false
    });
  }
});
```

This background script provides:

- **Global keyboard shortcuts**: Encode/decode selected text from anywhere
- **Context menu integration**: Right-click options for quick encoding/decoding
- **Clipboard automation**: Automatically copy results

---

## Creating Extension Icons {#icons}

Every extension needs icons. Create simple icons using any image editor or generate them programmatically. The icons should be:

- 16x16 pixels (toolbar icon)
- 48x48 pixels (extension management page)
- 128x128 pixels (Chrome Web Store listing)

For development, you can create placeholder PNG files. Later, replace them with professionally designed icons that match your brand.

---

## Testing Your Extension {#testing}

Before publishing, thoroughly test your extension:

1. **Load unpacked extension**: Go to chrome://extensions, enable Developer mode, click "Load unpacked," and select your extension folder
2. **Test encoding**: Enter text and click Encode - verify correct Base64 output
3. **Test decoding**: Enter valid Base64 and click Decode - verify original text
4. **Test error handling**: Try decoding invalid Base64 - should show error message
5. **Test keyboard shortcuts**: Select text on any page and use Ctrl+Shift+E or Ctrl+Shift+D
6. **Test context menu**: Right-click selected text and use the Base64 options
7. **Test settings**: Toggle auto-copy and URL-safe options - verify they persist

---

## Publishing to Chrome Web Store {#publishing}

Once testing is complete, follow these steps to publish:

1. **Create developer account**: Sign up at the Chrome Web Store Developer Dashboard ($5 one-time fee)
2. **Package your extension**: Click "Pack extension" in chrome://extensions or use the CLI
3. **Create store listing**:
   - Write compelling title and description
   - Upload screenshots and promotional images
   - Set category and language
4. **Submit for review**: Google reviews typically take 1-3 business days
5. **Publish**: Once approved, your extension is live!

---

## Advanced Features to Consider {#advanced-features}

To make your **base64 extension** stand out from competitors, consider adding:

- **File encoding**: Support encoding images and documents to Base64
- **Batch processing**: Encode/decode multiple strings at once
- **History**: Keep track of recent conversions
- **Custom algorithms**: Support other encoding formats (URL encoding, HTML encoding)
- **Themes**: Multiple color themes beyond system default
- **Synchronization**: Sync settings across devices using chrome.storage.sync
- **Statistics**: Track usage patterns

---

## Conclusion {#conclusion}

Building a **base64 converter** Chrome extension is an excellent project that teaches fundamental Chrome extension development concepts while creating a genuinely useful tool. You've learned how to:

- Set up a proper Manifest V3 extension project
- Create an intuitive popup interface
- Implement Base64 encoding and decoding with Unicode support
- Add keyboard shortcuts and context menu integration
- Handle settings persistence
- Test and publish to the Chrome Web Store

This Base64 tool can be a starting point for more complex developer utilities. The skills you gained here apply directly to building other browser extensions like JSON formatters, regex testers, and API clients.

Ready to start building? Clone the complete source code, customize it with your own features, and publish your extension to help developers worldwide streamline their Base64 encoding workflows!

---

## Frequently Asked Questions {#faq}

**Q: Can this extension handle large files?**
A: The popup interface is designed for text strings. For files, you'd need to implement file input handling and potentially use the File System Access API for larger files.

**Q: Is my data secure?**
A: Yes! All encoding/decoding happens locally in your browser. No data is sent to any server.

**Q: Does this work on Firefox or Edge?**
A: This extension uses Chrome-specific APIs. For cross-browser compatibility, you'd need to use Web Extension APIs that work across browsers.

**Q: How do I add more encoding formats?**
A: Add new buttons and corresponding JavaScript functions in popup.js. You can easily add URL encoding, HTML entity encoding, or hex encoding.

**Q: Can I customize the keyboard shortcuts?**
A: Users can remap shortcuts in chrome://extensions under "Keyboard shortcuts" after installation.
