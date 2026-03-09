---
layout: post
title: "Build a Tab Session Manager Chrome Extension: Save and Restore Tab Groups"
description: "Learn how to build a chrome extension session manager to save and restore tab groups. Complete 2025 guide with code examples for saving tab sessions, managing windows, and implementing a tab session saver."
date: 2025-04-30
categories: [Chrome Extensions, Tutorials]
tags: [session-manager, tabs, chrome-extension]
keywords: "chrome extension session manager, save tab session chrome, restore tabs chrome extension, tab session saver, chrome extension save windows"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/30/build-tab-session-manager-chrome-extension/"
---

# Build a Tab Session Manager Chrome Extension: Save and Restore Tab Groups

Browser tab management has become one of the most critical productivity challenges for modern web users. Whether you're a developer working on multiple projects, a researcher gathering information across dozens of sources, or a professional managing different work contexts, the ability to save and restore tab sessions can dramatically improve your workflow. This comprehensive guide will walk you through building a powerful Tab Session Manager Chrome extension from scratch.

In this tutorial, you'll learn how to capture all open tabs and windows, store them persistently using Chrome's storage APIs, and restore sessions with a single click. We'll cover the complete implementation using Manifest V3, modern JavaScript patterns, and best practices for a production-ready extension.

---

## Why Build a Tab Session Manager? {#why-build}

The average Chrome user has between 20 and 50 tabs open at any given time, according to recent browser usage studies. This tab overload leads to memory issues, decreased productivity, and the dreaded "too many tabs" notification. While Chrome offers some built-in session management through sync and history, it lacks the granular control that power users need.

A custom tab session manager extension solves several key problems:

- **Project-based organization**: Save different tab sets for different projects or clients
- **Quick context switching**: Restore a complete working environment in seconds
- **Accidental closure recovery**: Retrieve tabs after browser crashes or unexpected closures
- **Multi-window management**: Handle multiple browser windows with different session states
- **Tab group preservation**: Maintain Chrome's tab groups when saving and restoring

Building your own session manager gives you complete control over how sessions are stored, organized, and restored—features you won't find in basic browser functionality or existing extensions.

---

## Understanding the Chrome Tabs and Windows APIs {#chrome-apis}

Before diving into code, you need to understand the core Chrome APIs that make session management possible. The extension will primarily interact with three key APIs:

### The Tabs API

The `chrome.tabs` API provides methods for creating, modifying, and organizing tabs. For session management, you'll use methods like:

- `chrome.tabs.query()` - Retrieve all open tabs with filtering options
- `chrome.tabs.create()` - Open new tabs with specified URLs
- `chrome.tabs.get()` - Get details about a specific tab
- `chrome.tabs.move()` - Move tabs between windows

Each tab object contains essential properties including URL, title, favIconUrl, pinned status, and groupId (for tab groups).

### The Windows API

The `chrome.windows` API manages browser windows:

- `chrome.windows.getAll()` - Retrieve all open windows
- `chrome.windows.get()` - Get details about a specific window
- `chrome.windows.create()` - Create new windows
- `chrome.windows.getCurrent()` - Get the focused window

Window objects include properties like id, type, state, tabs array, and incognito status.

### The Storage API

For persisting sessions, you'll use `chrome.storage`:

- `chrome.storage.local` - Store data locally (5MB default limit)
- `chrome.storage.sync` - Sync data across devices using Chrome sync
- `chrome.storage.session` - Store data for the current session only

For a session manager with potentially large session data, `chrome.storage.local` is typically the best choice.

---

## Project Setup and Manifest Configuration {#project-setup}

Let's start building the extension. First, create your project structure:

```bash
tab-session-manager/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── background.js
├── options.html
├── options.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### The Manifest File

Create your `manifest.json` with the required permissions:

```json
{
  "manifest_version": 3,
  "name": "Tab Session Manager",
  "version": "1.0.0",
  "description": "Save and restore your browser tabs and windows with ease",
  "permissions": [
    "tabs",
    "storage",
    "windows"
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
  "options_page": "options.html"
}
```

The key permissions here are `tabs`, `storage`, and `windows`. The `host_permissions` with `<all_urls>` is necessary because the tabs API returns URLs that you need to access and restore.

---

## Building the Popup Interface {#popup-interface}

The popup is the main user interface for your extension. It displays saved sessions and allows users to save current sessions or restore existing ones.

### HTML Structure

Create `popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tab Session Manager</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Tab Session Manager</h1>
      <button id="saveSessionBtn" class="primary-btn">
        <span class="icon">💾</span> Save Current Session
      </button>
    </header>

    <section class="sessions-list">
      <h2>Saved Sessions</h2>
      <div id="sessionsContainer" class="sessions-container">
        <!-- Sessions will be dynamically inserted here -->
        <p class="empty-state">No saved sessions yet. Click "Save Current Session" to get started!</p>
      </div>
    </section>

    <section class="quick-actions">
      <h2>Quick Actions</h2>
      <div class="action-buttons">
        <button id="saveAllWindowsBtn" class="secondary-btn">
          Save All Windows
        </button>
        <button id="restoreLastBtn" class="secondary-btn">
          Restore Last
        </button>
      </div>
    </section>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### Styling the Popup

Create `popup.css` for a clean, modern interface:

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
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 18px;
  margin-bottom: 12px;
  color: #1a73e8;
}

h2 {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.primary-btn {
  width: 100%;
  padding: 12px 16px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.primary-btn:hover {
  background: #1557b0;
}

.sessions-list {
  margin-bottom: 20px;
}

.sessions-container {
  max-height: 280px;
  overflow-y: auto;
}

.session-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.session-name {
  font-weight: 600;
  font-size: 14px;
}

.session-meta {
  font-size: 12px;
  color: #666;
  display: flex;
  gap: 8px;
}

.session-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.session-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.session-btn:hover {
  background: #f0f0f0;
}

.session-btn.restore {
  background: #e8f0fe;
  color: #1a73e8;
  border-color: #1a73e8;
}

.session-btn.restore:hover {
  background: #d2e3fc;
}

.session-btn.delete {
  color: #dc3545;
}

.session-btn.delete:hover {
  background: #ffeef0;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 20px;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.secondary-btn {
  flex: 1;
  padding: 10px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-btn:hover {
  background: #f0f0f0;
}
```

---

## Implementing the Core Logic {#core-logic}

Now let's build the JavaScript functionality. The popup script handles the user interface, while a background script manages the core session operations.

### Popup Script

Create `popup.js`:

```javascript
// DOM Elements
const saveSessionBtn = document.getElementById('saveSessionBtn');
const saveAllWindowsBtn = document.getElementById('saveAllWindowsBtn');
const restoreLastBtn = document.getElementById('restoreLastBtn');
const sessionsContainer = document.getElementById('sessionsContainer');

// State
let savedSessions = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSessions();
  setupEventListeners();
});

// Load saved sessions from storage
async function loadSessions() {
  const result = await chrome.storage.local.get('sessions');
  savedSessions = result.sessions || [];
  renderSessions();
}

// Save current session
async function saveCurrentSession() {
  try {
    // Get all tabs in the current window
    const window = await chrome.windows.getCurrent({ populate: true });
    const tabs = window.tabs;

    if (tabs.length === 0) {
      showNotification('No tabs to save!');
      return;
    }

    const sessionName = prompt('Enter a name for this session:', 
      `Session ${savedSessions.length + 1}`);

    if (!sessionName) return;

    const session = {
      id: Date.now(),
      name: sessionName,
      timestamp: new Date().toISOString(),
      windowId: window.id,
      tabs: tabs.map(tab => ({
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl,
        pinned: tab.pinned,
        active: tab.active
      })),
      tabCount: tabs.length
    };

    savedSessions.unshift(session);
    await chrome.storage.local.set({ sessions: savedSessions });
    renderSessions();
    showNotification(`Saved "${sessionName}" with ${tabs.length} tabs`);
  } catch (error) {
    console.error('Error saving session:', error);
    showNotification('Failed to save session');
  }
}

// Save all windows
async function saveAllWindows() {
  try {
    const windows = await chrome.windows.getAll({ populate: true });
    
    if (windows.length === 0) {
      showNotification('No windows to save!');
      return;
    }

    const sessionName = prompt('Enter a name for all windows session:', 
      `All Windows ${savedSessions.length + 1}`);

    if (!sessionName) return;

    const allTabs = windows.flatMap(win => 
      win.tabs.map(tab => ({
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl,
        pinned: tab.pinned,
        active: tab.active,
        windowId: win.id
      }))
    );

    const session = {
      id: Date.now(),
      name: sessionName,
      timestamp: new Date().toISOString(),
      isAllWindows: true,
      tabs: allTabs,
      windowCount: windows.length,
      tabCount: allTabs.length
    };

    savedSessions.unshift(session);
    await chrome.storage.local.set({ sessions: savedSessions });
    renderSessions();
    showNotification(`Saved "${sessionName}" with ${windows.length} windows (${allTabs.length} tabs)`);
  } catch (error) {
    console.error('Error saving all windows:', error);
    showNotification('Failed to save windows');
  }
}

// Restore a session
async function restoreSession(sessionId) {
  try {
    const session = savedSessions.find(s => s.id === sessionId);
    if (!session) return;

    // Close current tabs if desired, or just add to them
    for (const tabData of session.tabs) {
      await chrome.tabs.create({
        url: tabData.url,
        pinned: tabData.pinned,
        active: tabData.active
      });
    }

    showNotification(`Restored "${session.name}" with ${session.tabs.length} tabs`);
    window.close();
  } catch (error) {
    console.error('Error restoring session:', error);
    showNotification('Failed to restore session');
  }
}

// Delete a session
async function deleteSession(sessionId) {
  const confirmed = confirm('Are you sure you want to delete this session?');
  if (!confirmed) return;

  savedSessions = savedSessions.filter(s => s.id !== sessionId);
  await chrome.storage.local.set({ sessions: savedSessions });
  renderSessions();
  showNotification('Session deleted');
}

// Restore the last session
async function restoreLastSession() {
  if (savedSessions.length === 0) {
    showNotification('No sessions to restore!');
    return;
  }
  await restoreSession(savedSessions[0].id);
}

// Render sessions list
function renderSessions() {
  if (savedSessions.length === 0) {
    sessionsContainer.innerHTML = `
      <p class="empty-state">No saved sessions yet. Click "Save Current Session" to get started!</p>
    `;
    return;
  }

  sessionsContainer.innerHTML = savedSessions.map(session => `
    <div class="session-card" data-id="${session.id}">
      <div class="session-header">
        <span class="session-name">${escapeHtml(session.name)}</span>
        <button class="delete-session" data-id="${session.id}" title="Delete">🗑️</button>
      </div>
      <div class="session-meta">
        <span>${session.tabCount} tabs</span>
        ${session.windowCount ? `<span>• ${session.windowCount} windows</span>` : ''}
        <span>• ${formatDate(session.timestamp)}</span>
      </div>
      <div class="session-actions">
        <button class="session-btn restore" data-id="${session.id}">Restore</button>
      </div>
    </div>
  `).join('');
}

// Event Listeners
function setupEventListeners() {
  saveSessionBtn.addEventListener('click', saveCurrentSession);
  saveAllWindowsBtn.addEventListener('click', saveAllWindows);
  restoreLastBtn.addEventListener('click', restoreLastSession);

  sessionsContainer.addEventListener('click', (e) => {
    const sessionId = parseInt(e.target.dataset.id);
    if (!sessionId) return;

    if (e.target.classList.contains('restore')) {
      restoreSession(sessionId);
    } else if (e.target.classList.contains('delete-session')) {
      deleteSession(sessionId);
    }
  });
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function showNotification(message) {
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 1000;
    animation: fadeIn 0.3s;
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}
```

---

## Adding Advanced Features {#advanced-features}

Now let's enhance the extension with more powerful capabilities.

### Tab Group Support

Modern Chrome supports tab groups, and your session manager should preserve them:

```javascript
// Enhanced session saving with group support
async function saveSessionWithGroups() {
  const window = await chrome.windows.getCurrent({ populate: true });
  
  // Get tab groups in the current window
  const tabGroups = await chrome.tabs.query({ currentWindow: true });
  const groupsMap = {};
  
  tabGroups.forEach(tab => {
    if (tab.groupId && tab.groupId !== -1) {
      if (!groupsMap[tab.groupId]) {
        groupsMap[tab.groupId] = [];
      }
      groupsMap[tab.groupId].push(tab);
    }
  });

  // Save session with group information
  const session = {
    id: Date.now(),
    name: `Session ${Date.now()}`,
    timestamp: new Date().toISOString(),
    tabs: window.tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      pinned: tab.pinned,
      groupId: tab.groupId
    })),
    groups: groupsMap
  };

  // Store the session
  savedSessions.unshift(session);
  await chrome.storage.local.set({ sessions: savedSessions });
}
```

### Keyboard Shortcuts

Add keyboard shortcuts for power users in your manifest:

```json
{
  "commands": {
    "save-session": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Save current session"
    },
    "restore-last-session": {
      "suggested_key": {
        "default": "Ctrl+Shift+R",
        "mac": "Command+Shift+R"
      },
      "description": "Restore last session"
    }
  }
}
```

Handle these commands in `background.js`:

```javascript
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-session') {
    await saveCurrentWindowSession();
  } else if (command === 'restore-last-session') {
    await restoreLastSession();
  }
});
```

---

## Testing Your Extension {#testing}

Before publishing, thoroughly test your extension:

1. **Load the extension**: Navigate to `chrome://extensions`, enable Developer Mode, and click "Load unpacked"
2. **Test saving**: Open various tabs across multiple windows and test the save functionality
3. **Test restoring**: Verify that tabs open with correct URLs and preserve pinned status
4. **Test deletion**: Confirm sessions are properly removed
5. **Test persistence**: Reload Chrome and verify sessions persist
6. **Test keyboard shortcuts**: Verify commands work as expected

### Common Issues and Solutions

**Issue**: Tabs not restoring with correct URLs  
**Solution**: Some URLs (like chrome:// URLs) have restrictions. Add error handling:

```javascript
try {
  await chrome.tabs.create({ url: tabData.url });
} catch (error) {
  console.warn(`Cannot restore URL: ${tabData.url}`, error);
}
```

**Issue**: Storage quota exceeded  
**Solution**: Implement session cleanup or compression for older sessions:

```javascript
async function cleanupOldSessions() {
  const result = await chrome.storage.local.get('sessions');
  let sessions = result.sessions || [];
  
  // Keep only the last 50 sessions
  if (sessions.length > 50) {
    sessions = sessions.slice(0, 50);
    await chrome.storage.local.set({ sessions });
  }
}
```

---

## Publishing to the Chrome Web Store {#publishing}

Once testing is complete, prepare for publication:

1. **Create store listing**: Prepare screenshots, description, and promotional graphics
2. **Package the extension**: Use the "Pack extension" button in chrome://extensions
3. **Create developer account**: Sign up at the Chrome Web Store Developer Dashboard
4. **Upload and submit**: Upload your CRX file and submit for review

Ensure your extension follows Chrome Web Store policies, particularly around:
- Clear user data handling policies
- Honest representation of functionality
- No malicious behavior
- Proper permissions usage

---

## Conclusion {#conclusion}

You've built a fully functional Tab Session Manager Chrome extension! This extension demonstrates core Chrome extension concepts including:

- **Tabs API**: Capturing and recreating browser tabs
- **Windows API**: Managing multiple browser windows
- **Storage API**: Persisting data locally with Chrome Storage
- **Manifest V3**: Following modern Chrome extension standards
- **Popup UI**: Creating intuitive user interfaces
- **Event handling**: Responding to user interactions and system events

The extension you built can be extended with many additional features:
- Session synchronization across devices using `chrome.storage.sync`
- Auto-save sessions on browser close
- Session naming and organization with folders
- Import/export functionality for backup
- Session sharing between users

This project provides a solid foundation for understanding Chrome extension development and building more complex browser productivity tools. The skills you've learned here apply directly to building any type of Chrome extension, from simple utilities to full-featured applications.

Start using your Tab Session Manager today and never lose an important set of tabs again!
