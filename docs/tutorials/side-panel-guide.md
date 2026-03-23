---
layout: default
title: "Building Side Panel Extensions in Chrome. Complete Tutorial"
description: "Learn how to build Chrome extensions with side panels. This comprehensive tutorial covers the chrome.sidePanel API, per-tab vs global panels, lifecycle management, UI design, messaging, and responsive design patterns."
canonical_url: "https://bestchromeextensions.com/tutorials/side-panel-guide/"
---

Building Side Panel Extensions in Chrome

Side panels provide a powerful way to create persistent, always-accessible UI for your Chrome extensions. Unlike popups that disappear on blur, side panels remain visible alongside the web content, making them ideal for note-taking tools, page analyzers, bookmarks managers, and any extension that benefits from continuous visibility.

This tutorial walks you through building a complete side panel extension from scratch, covering everything from manifest configuration to responsive design.

Prerequisites {#prerequisites}

Before starting, ensure you have:
- Chrome 114 or later (the Side Panel API was introduced in this version)
- Basic familiarity with HTML, CSS, and JavaScript
- Understanding of Chrome extension architecture (manifest V3)

Step 1: Manifest Configuration {#step-1-manifest-configuration}

The side panel requires specific manifest configuration. Create a new extension project:

```json
{
  "manifest_version": 3,
  "name": "Page Notes Side Panel",
  "version": "1.0",
  "description": "A side panel extension for taking notes on any webpage",
  "permissions": [
    "sidePanel",
    "storage",
    "activeTab"
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "Open Page Notes"
  }
}
```

Key manifest entries:
- `permissions: ["sidePanel"]`. Required to use the side panel API
- `side_panel.default_path`. The default HTML file shown when the panel opens
- `action.default_title`. Tooltip shown when hovering over the extension icon

Step 2: Create the Side Panel HTML {#step-2-create-the-side-panel-html}

Create `sidepanel.html` with a clean, functional layout:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Notes</title>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div class="panel-container">
    <header class="panel-header">
      <h1>Page Notes</h1>
      <button id="settings-btn" aria-label="Settings"></button>
    </header>
    
    <div class="page-info" id="page-info">
      <span class="page-title" id="page-title">Loading...</span>
      <span class="page-url" id="page-url"></span>
    </div>
    
    <div class="notes-container">
      <textarea 
        id="notes-input" 
        placeholder="Take notes about this page..."
        rows="10"
      ></textarea>
      <button id="save-btn">Save Note</button>
    </div>
    
    <div class="notes-list" id="notes-list">
      <!-- Notes will be rendered here -->
    </div>
  </div>
  
  <script src="sidepanel.js"></script>
</body>
</html>
```

Step 3: Styling for Responsive Design {#step-3-styling-for-responsive-design}

The side panel can be resized by users, so your CSS must handle varying widths gracefully:

```css
/* sidepanel.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background: #fff;
  min-width: 200px;
  max-width: 400px;
  width: 100%;
  height: 100vh;
  overflow-x: hidden;
}

.panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header h1 {
  font-size: 16px;
  font-weight: 600;
}

.page-info {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 6px;
  gap: 4px;
}

.page-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-url {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notes-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#notes-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  font-size: 14px;
}

#notes-input:focus {
  outline: none;
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
}

#save-btn {
  padding: 8px 16px;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

#save-btn:hover {
  background: #357abd;
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.note-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.note-timestamp {
  font-size: 11px;
  color: #888;
  margin-top: 8px;
}

/* Responsive adjustments for narrow widths */
@media (max-width: 280px) {
  .panel-container {
    padding: 12px;
  }
  
  .panel-header h1 {
    font-size: 14px;
  }
  
  #notes-input {
    min-height: 60px;
  }
}
```

Step 4: Side Panel JavaScript Logic {#step-4-side-panel-javascript-logic}

Create `sidepanel.js` to handle the panel's functionality:

```javascript
// sidepanel.js

// Get current tab information
async function getCurrentTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tabs[0];
}

// Display current page info
async function displayPageInfo() {
  const tab = await getCurrentTab();
  
  const titleEl = document.getElementById('page-title');
  const urlEl = document.getElementById('page-url');
  
  titleEl.textContent = tab.title || 'Unknown Page';
  urlEl.textContent = tab.url || '';
  
  return tab;
}

// Load notes for current page
async function loadNotes(tabId) {
  const result = await chrome.storage.local.get(String(tabId));
  return result[String(tabId)] || [];
}

// Save note for current page
async function saveNote() {
  const tab = await getCurrentTab();
  const noteInput = document.getElementById('notes-input');
  const content = noteInput.value.trim();
  
  if (!content) return;
  
  const notes = await loadNotes(tab.id);
  const newNote = {
    content,
    timestamp: Date.now()
  };
  
  notes.push(newNote);
  
  await chrome.storage.local.set({
    [String(tab.id)]: notes
  });
  
  noteInput.value = '';
  renderNotes(notes);
}

// Render notes list
function renderNotes(notes) {
  const container = document.getElementById('notes-list');
  
  if (!notes.length) {
    container.innerHTML = '<p class="no-notes">No notes yet</p>';
    return;
  }
  
  container.innerHTML = notes
    .slice()
    .reverse()
    .map(note => `
      <div class="note-item">
        <div class="note-content">${escapeHtml(note.content)}</div>
        <div class="note-timestamp">
          ${new Date(note.timestamp).toLocaleString()}
        </div>
      </div>
    `)
    .join('');
}

// Helper to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
async function init() {
  const tab = await displayPageInfo();
  const notes = await loadNotes(tab.id);
  renderNotes(notes);
  
  // Event listeners
  document.getElementById('save-btn').addEventListener('click', saveNote);
  
  // Auto-save on input (debounced)
  let saveTimeout;
  document.getElementById('notes-input').addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNote, 1000);
  });
}

document.addEventListener('DOMContentLoaded', init);
```

Step 5: Configure Side Panel Behavior {#step-5-configure-side-panel-behavior}

Create `background.js` to configure how the side panel opens:

```javascript
// background.js

// Configure side panel to open when clicking the extension icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-side-panel') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  }
});

// Set context-specific panels based on URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Example: Different panel for GitHub
    if (tab.url.includes('github.com')) {
      chrome.sidePanel.setOptions({
        tabId,
        path: 'github-panel.html',
        enabled: true
      });
    }
    // Example: Different panel for documentation
    else if (tab.url.includes('docs.')) {
      chrome.sidePanel.setOptions({
        tabId,
        path: 'docs-panel.html',
        enabled: true
      });
    }
    // Default panel for other sites
    else {
      chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: true
      });
    }
  }
});
```

Step 6: Understanding Per-Tab vs Global Panels {#step-6-understanding-per-tab-vs-global-panels}

The side panel API supports two modes of operation:

Global Side Panel

A single panel that works across all tabs:

```javascript
// Set global panel (applies to all tabs)
chrome.sidePanel.setOptions({
  path: 'global-panel.html',
  enabled: true
});

// Get current global options
const options = await chrome.sidePanel.getOptions({});
console.log(options.path); // 'global-panel.html'
```

Per-Tab Side Panel

Different content for different tabs:

```javascript
// Set tab-specific panel
chrome.sidePanel.setOptions({
  tabId: specificTabId,
  path: 'custom-panel.html',
  enabled: true
});

// Check tab-specific options
const tabOptions = await chrome.sidePanel.getOptions({
  tabId: specificTabId
});
```

When to Use Each Mode

| Mode | Use Case |
|------|----------|
| Global | Settings panel, bookmark manager, universal tools |
| Per-Tab | Context-aware tools, page-specific notes, URL analyzers |

Step 7: Side Panel Lifecycle {#step-7-side-panel-lifecycle}

Understanding when the side panel is active helps manage resources:

```javascript
// Listen for side panel visibility changes
chrome.sidePanel.onShow.addListener(() => {
  console.log('Side panel is now visible');
  // Resume animations, start timers, etc.
});

chrome.sidePanel.onHide.addListener(() => {
  console.log('Side panel is now hidden');
  // Pause animations, save state, etc.
});

// Check if side panel is currently showing for a tab
async function isSidePanelVisible(tabId) {
  const options = await chrome.sidePanel.getOptions({ tabId });
  return options.enabled === true;
}
```

Step 8: Communicating with Content Scripts {#step-8-communicating-with-content-scripts}

Your side panel often needs to interact with the page content:

```javascript
// sidepanel.js. Send message to content script

// Get the current active tab
const [tab] = await chrome.tabs.query({ 
  active: true, 
  currentWindow: true 
});

// Send message to content script
chrome.tabs.sendMessage(tab.id, {
  action: 'getPageData',
  data: { /* any data to send */ }
}, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message error:', chrome.runtime.lastError);
    return;
  }
  console.log('Received:', response);
});
```

```javascript
// content-script.js. Listen for messages

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageData') {
    // Gather data from the page
    const pageData = {
      title: document.title,
      url: window.location.href,
      selection: window.getSelection().toString(),
      // Add more page data as needed
    };
    
    sendResponse(pageData);
  }
  
  // Return true if responding asynchronously
  return true;
});
```

Step 9: Programmatic Opening with User Activation {#step-9-programmatic-opening-with-user-activation}

The `chrome.sidePanel.open()` method requires user activation:

```javascript
// This works. triggered by user action
document.getElementById('open-panel-btn').addEventListener('click', async () => {
  await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
});

// This FAILS. no user activation
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'auto-open') {
    // Won't work without user gesture
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  }
});
```

Workaround for Programmatic Opening

Use keyboard shortcuts defined in the manifest:

```json
{
  "commands": {
    "toggle-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+N",
        "mac": "Command+Shift+N"
      },
      "description": "Toggle side panel"
    }
  }
}
```

```javascript
// background.js
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-panel') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});
```

Step 10: Advanced Patterns {#step-10-advanced-patterns}

Multiple Panel Paths

Support different experiences for different contexts:

```javascript
// background.js
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  
  let panelPath = 'default-panel.html';
  
  // Determine panel based on URL patterns
  if (tab.url.startsWith('https://github.com')) {
    panelPath = 'github-panel.html';
  } else if (tab.url.startsWith('https://docs.')) {
    panelPath = 'docs-panel.html';
  } else if (tab.url.startsWith('https://mail.google.com')) {
    panelPath = 'email-panel.html';
  }
  
  chrome.sidePanel.setOptions({
    tabId,
    path: panelPath,
    enabled: true
  });
});
```

Dynamic Content Loading

Load content on demand to improve performance:

```javascript
// sidepanel.js
async function loadTabSpecificContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Send message to content script for data
  const response = await chrome.tabs.sendMessage(tab.id, {
    action: 'getDynamicContent'
  });
  
  if (response) {
    document.getElementById('dynamic-content').innerHTML = response.html;
  }
}
```

State Persistence

Save and restore panel state:

```javascript
// sidepanel.js
async function savePanelState(state) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.storage.local.set({
    [`panel-state-${tab.id}`]: state
  });
}

async function restorePanelState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const result = await chrome.storage.local.get(`panel-state-${tab.id}`);
  return result[`panel-state-${tab.id}`] || {};
}
```

Testing Your Extension {#testing-your-extension}

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select your extension folder
4. Click the extension icon to open the side panel
5. Resize the panel to test responsive design
6. Navigate to different websites to test per-tab panels

Common Issues and Solutions {#common-issues-and-solutions}

Panel Not Opening

- Verify `sidePanel` permission is in manifest
- Check that `side_panel.default_path` points to an existing file
- Ensure `chrome.sidePanel.open()` is called with user activation

Styles Not Loading

- Use relative paths in `<link>` and `<script>` tags
- Check the console in the side panel (right-click → Inspect)

Message Passing Fails

- Content script may not be injected; use `chrome.tabs.sendMessage` with error handling
- Ensure the content script matches the URL patterns

Memory Leaks

- Clean up event listeners in the side panel
- Use `chrome.tabs.onRemoved` to clean up tab-specific storage

Related Articles {#related-articles}

- [Chrome Extension Side Panel API](../guides/side-panel.md). Detailed look into the sidePanel API methods and options
- [Message Passing Between Extension Components](../guides/message-passing.md). Learn how to communicate between different parts of your extension
- [Storage API Guide](../guides/storage-api.md). Persisting data with chrome.storage

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
