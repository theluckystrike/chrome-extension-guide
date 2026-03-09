---
layout: default
title: "Building a Tab Manager Chrome Extension — Step-by-Step Tutorial (2025)"
description: "Learn to build a full-featured tab manager Chrome extension. Covers tab grouping, search, suspend/restore, keyboard shortcuts, and Chrome Web Store publishing."
date: 2025-01-22
categories: [tutorials]
tags: [tab-manager, chrome-extension-tutorial, tab-groups, chrome-tabs-api, browser-extension]
author: theluckystrike
---

# Building a Tab Manager Chrome Extension — Step-by-Step Tutorial (2025)

Tab overload is one of the most common productivity challenges facing modern browser users. Whether you are a researcher managing dozens of research papers, a developer juggling multiple projects, or simply someone who forgets to close tabs, a well-designed tab manager can transform your browsing experience. In this comprehensive tutorial, we will build a fully functional tab manager Chrome extension from scratch using Manifest V3.

By the end of this guide, you will have created an extension with tab grouping, search functionality, suspend/restore capabilities, keyboard shortcuts, and session persistence. This tutorial assumes you have basic knowledge of HTML, CSS, and JavaScript, but no prior Chrome extension experience is required.

---

## Project Setup with Manifest V3 {#project-setup}

Every Chrome extension starts with a `manifest.json` file. This file tells Chrome about your extension's name, version, permissions, and the files it needs to load. For our tab manager, we will use Manifest V3, the latest and most secure version of the Chrome extension platform.

Create a new folder for your project and add the following `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Tab Master - Tab Manager",
  "version": "1.0.0",
  "description": "Organize, search, and manage your tabs with ease. Group tabs, suspend inactive tabs, and save sessions.",
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "commands"
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
    "toggle-popup": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "mac": "Command+Shift+T"
      },
      "description": "Toggle tab manager popup"
    },
    "suspend-all": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Suspend all inactive tabs"
    }
  }
}
```

This manifest requests the essential permissions for our tab manager: `tabs` for querying and manipulating tabs, `tabGroups` for organizing tabs into groups, `storage` for saving sessions, and `commands` for keyboard shortcuts. For a detailed understanding of why we request these specific permissions, see our [permissions guide](/chrome-extension-guide/docs/permissions/).

Create the following folder structure for your extension:

```
tab-manager/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── styles.css
```

You will need to create basic icon files or use placeholder images for testing. Now let us dive into the core of any tab manager: the Chrome Tabs API.

---

## Chrome.tabs API Deep Dive {#chrome-tabs-api}

The `chrome.tabs` API is the foundation of any tab management extension. It provides methods for creating, querying, updating, and removing tabs. Understanding this API thoroughly is essential for building a robust tab manager.

### Core Tab Operations

The most frequently used method in the Tabs API is `chrome.tabs.query()`, which retrieves tabs based on specified criteria. This method returns a promise that resolves to an array of Tab objects:

```javascript
// Get all tabs in the current window
const tabs = await chrome.tabs.query({ currentWindow: true });

// Get only active tabs
const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });

// Get tabs from all windows
const allTabs = await chrome.tabs.query({});

// Get pinned tabs
const pinnedTabs = await chrome.tabs.query({ pinned: true, currentWindow: true });
```

Each Tab object contains valuable properties including `id`, `title`, `url`, `favIconUrl`, `active`, `pinned`, `windowId`, `index`, and `discarded`. The `discarded` property is particularly useful for detecting suspended tabs.

Creating new tabs is straightforward with `chrome.tabs.create()`:

```javascript
// Create a new tab
const newTab = await chrome.tabs.create({ 
  url: 'https://example.com',
  active: true,
  pinned: false
});

// Open in a specific window
const newTabInWindow = await chrome.tabs.create({
  windowId: targetWindowId,
  url: 'https://example.com'
});
```

Updating tabs allows you to modify their properties:

```javascript
// Activate a tab
await chrome.tabs.update(tabId, { active: true });

// Pin or unpin a tab
await chrome.tabs.update(tabId, { pinned: true });

// Reload a tab
await chrome.tabs.reload(tabId);

// Move a tab to a different window
await chrome.tabs.move(tabId, { windowId: targetWindowId, index: -1 });
```

For a complete reference of all available methods and properties, see our [Tabs API documentation](/chrome-extension-guide/docs/api-reference/tabs-api/).

---

## Tab Querying and Filtering {#tab-querying-filtering}

A powerful tab manager needs sophisticated filtering capabilities. Users should be able to find tabs quickly using various criteria. Let us implement a comprehensive tab search feature.

### Building a Tab Search Feature

The popup interface will include a search input that filters tabs in real-time:

```javascript
// popup.js - Tab search functionality
class TabManager {
  constructor() {
    this.tabs = [];
    this.filteredTabs = [];
    this.init();
  }

  async init() {
    // Load all tabs when popup opens
    this.tabs = await chrome.tabs.query({ currentWindow: true });
    this.filteredTabs = [...this.tabs];
    this.renderTabs();
    
    // Set up search listener
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.filterTabs(e.target.value);
    });
  }

  filterTabs(query) {
    const lowerQuery = query.toLowerCase();
    this.filteredTabs = this.tabs.filter(tab => {
      return tab.title.toLowerCase().includes(lowerQuery) ||
             tab.url.toLowerCase().includes(lowerQuery);
    });
    this.renderTabs();
  }

  renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    
    this.filteredTabs.forEach(tab => {
      const tabElement = this.createTabElement(tab);
      container.appendChild(tabElement);
    });
  }

  createTabElement(tab) {
    const div = document.createElement('div');
    div.className = 'tab-item';
    div.innerHTML = `
      <img src="${tab.favIconUrl || 'icons/default-favicon.png'}" class="tab-favicon">
      <div class="tab-info">
        <div class="tab-title">${this.escapeHtml(tab.title)}</div>
        <div class="tab-url">${this.escapeHtml(new URL(tab.url).hostname)}</div>
      </div>
      <div class="tab-actions">
        <button class="close-btn" data-id="${tab.id}">×</button>
      </div>
    `;
    return div;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TabManager();
});
```

This implementation filters tabs by both title and URL, providing a responsive search experience. The search updates the displayed tabs in real-time as the user types.

---

## Tab Groups API {#tab-groups-api}

Chrome's Tab Groups API (introduced in Chrome 87) allows users to organize their tabs into color-coded groups. Our tab manager will leverage this API to provide powerful grouping functionality.

### Creating and Managing Tab Groups

```javascript
// background.js - Tab group management

// Create a new tab group
async function createTabGroup(tabIds, title, color) {
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, { 
    title: title,
    color: color
  });
  return groupId;
}

// Add tabs to an existing group
async function addTabsToGroup(groupId, tabIds) {
  await chrome.tabs.group({ groupId, tabIds });
}

// Remove tabs from their group (ungroup)
async function ungroupTabs(tabIds) {
  for (const tabId of tabIds) {
    await chrome.tabs.ungroup(tabId);
  }
}

// Get all tab groups in the current window
async function getTabGroups() {
  return await chrome.tabGroups.query({ currentWindow: true });
}

// Example: Group tabs by domain
async function groupTabsByDomain() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Group tabs by domain
  const domainGroups = {};
  for (const tab of tabs) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      if (!domainGroups[domain]) {
        domainGroups[domain] = [];
      }
      domainGroups[domain].push(tab.id);
    } catch (e) {
      // Skip invalid URLs
    }
  }
  
  // Create groups for each domain
  const colors = ['grey', 'blue', 'green', 'yellow', 'orange', 'red', 'pink', 'purple'];
  let colorIndex = 0;
  
  for (const [domain, tabIds] of Object.entries(domainGroups)) {
    if (tabIds.length > 1) {
      await createTabGroup(tabIds, domain, colors[colorIndex % colors.length]);
      colorIndex++;
    }
  }
}
```

The Tab Groups API provides a seamless way to organize tabs visually. Each group has a title and color, making it easy to identify related tabs at a glance.

---

## Suspend and Restore with chrome.tabs.discard {#suspend-restore}

Tab suspension is one of the most valuable features for users with many open tabs. Chrome provides the `chrome.tabs.discard()` API to suspend inactive tabs and free up memory while preserving the tab's URL and position.

### Implementing Suspend/Restore

```javascript
// background.js - Tab suspension management

// Discard (suspend) a specific tab
async function discardTab(tabId) {
  try {
    const discardedTab = await chrome.tabs.discard(tabId);
    return discardedTab;
  } catch (error) {
    console.error('Failed to discard tab:', error);
    return null;
  }
}

// Discard all inactive tabs in the current window
async function discardInactiveTabs() {
  const tabs = await chrome.tabs.query({ 
    currentWindow: true,
    active: false,
    pinned: false
  });
  
  const results = await Promise.allSettled(
    tabs.map(tab => chrome.tabs.discard(tab.id))
  );
  
  return results.filter(r => r.status === 'fulfilled').length;
}

// Check if a tab is discarded
async function isTabDiscarded(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return tab.discarded || false;
}

// Restore a discarded tab by navigating to its URL
async function restoreTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.discarded) {
    await chrome.tabs.update(tabId, { 
      url: tab.url,
      active: true 
    });
  }
}

// Auto-suspend tabs after inactivity
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.discarded) return;
  
  // Skip pinned tabs and active tab
  if (tab.pinned || tab.active) return;
  
  // Set up auto-discard after 30 minutes of inactivity
  setTimeout(async () => {
    const currentTab = await chrome.tabs.get(tabId);
    if (!currentTab.active && !currentTab.pinned) {
      await discardTab(tabId);
    }
  }, 30 * 60 * 1000); // 30 minutes
});
```

When a tab is discarded, Chrome removes its content from memory but keeps its URL and position in the tab strip. When the user clicks on a discarded tab, Chrome automatically reloads it. This provides an elegant memory-saving mechanism without requiring users to manually manage their tabs.

---

## Popup UI with Tab List {#popup-ui}

The popup is the primary interface users interact with. It should display a searchable list of tabs with options to organize, suspend, and manage them.

### HTML Structure

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Tab Master</h1>
      <div class="search-container">
        <input type="text" id="search-input" placeholder="Search tabs...">
      </div>
    </header>
    
    <div class="tabs-list" id="tabs-container">
      <!-- Tabs will be rendered here -->
    </div>
    
    <footer class="popup-footer">
      <button id="group-by-domain">Group by Domain</button>
      <button id="suspend-all">Suspend All</button>
      <button id="save-session">Save Session</button>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Styling

```css
/* popup.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 400px;
  min-height: 500px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
}

.popup-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.popup-header {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.popup-header h1 {
  font-size: 18px;
  margin-bottom: 12px;
  color: #333;
}

.search-container input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.search-container input:focus {
  outline: none;
  border-color: #4285f4;
}

.tabs-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: #fff;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.tab-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tab-favicon {
  width: 16px;
  height: 16px;
  margin-right: 10px;
}

.tab-info {
  flex: 1;
  min-width: 0;
}

.tab-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-url {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-actions {
  margin-left: 8px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #ffebee;
  color: #d32f2f;
}

.popup-footer {
  padding: 12px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.popup-footer button {
  flex: 1;
  padding: 8px 12px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #4285f4;
  color: #fff;
  transition: background 0.2s;
}

.popup-footer button:hover {
  background: #3367d6;
}
```

---

## Keyboard Shortcuts {#keyboard-shortcuts}

Keyboard shortcuts significantly improve the usability of your tab manager. Chrome's Commands API allows you to define global keyboard shortcuts that work even when the popup is not open.

### Registering Commands

We already added the commands to our manifest. Now let us implement the handlers in the service worker:

```javascript
// background.js - Command handlers

// Toggle popup open/close
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-popup':
      await togglePopup();
      break;
    case 'suspend-all':
      await discardInactiveTabs();
      break;
  }
});

async function togglePopup() {
  // Check if popup is already open
  const windows = await chrome.windows.getAll({ populate: true });
  const popupWindow = windows.find(w => w.type === 'popup');
  
  if (popupWindow) {
    // Close the popup
    chrome.windows.remove(popupWindow.id);
  } else {
    // Open the popup
    const { width, height } = await chrome.windows.getCurrent().then(
      w => ({ width: w.width, height: w.height })
    );
    
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 420,
      height: 600,
      left: width - 420,
      top: 100
    });
  }
}
```

For a complete reference on implementing keyboard shortcuts in Chrome extensions, see our [Commands API documentation](/chrome-extension-guide/docs/api-reference/commands-api/).

---

## Storage for Saved Sessions {#storage-sessions}

Allowing users to save and restore sessions is a powerful feature. We will use Chrome's Storage API to persist session data.

### Session Management

```javascript
// background.js - Session management

const SESSION_STORAGE_KEY = 'tab-manager-sessions';

// Save current session
async function saveSession(name) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  const session = {
    name: name || `Session ${new Date().toLocaleString()}`,
    timestamp: Date.now(),
    tabs: tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      pinned: tab.pinned,
      active: tab.active
    }))
  };
  
  // Get existing sessions
  const { sessions } = await chrome.storage.local.get(SESSION_STORAGE_KEY);
  const existingSessions = sessions || [];
  
  // Add new session
  existingSessions.push(session);
  
  // Save back to storage
  await chrome.storage.local.set({
    [SESSION_STORAGE_KEY]: existingSessions
  });
  
  return session;
}

// Load a saved session
async function loadSession(sessionIndex) {
  const { sessions } = await chrome.storage.local.get(SESSION_STORAGE_KEY);
  const session = sessions[sessionIndex];
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Close current tabs
  const currentTabs = await chrome.tabs.query({ currentWindow: true });
  await Promise.all(currentTabs.map(tab => chrome.tabs.remove(tab.id)));
  
  // Create tabs from session
  for (const tab of session.tabs) {
    await chrome.tabs.create({
      url: tab.url,
      pinned: tab.pinned,
      active: tab.active
    });
  }
}

// Get all saved sessions
async function getSessions() {
  const { sessions } = await chrome.storage.local.get(SESSION_STORAGE_KEY);
  return sessions || [];
}

// Delete a saved session
async function deleteSession(sessionIndex) {
  const { sessions } = await chrome.storage.local.get(SESSION_STORAGE_KEY);
  sessions.splice(sessionIndex, 1);
  await chrome.storage.local.set({ [SESSION_STORAGE_KEY]: sessions });
}
```

The Storage API provides 100MB of storage for extensions, which is more than enough for storing session data. Sessions are stored locally on the user's device, ensuring privacy.

---

## Publishing to Chrome Web Store {#publishing}

Once your extension is complete, it is time to publish it to the Chrome Web Store. This process involves preparing your extension, creating developer account, and submitting for review.

### Preparing for Publication

First, ensure your extension follows Chrome's policies:

1. **Complete your manifest**: Add a detailed description, screenshots, and privacy policy
2. **Test thoroughly**: Verify all features work in a fresh Chrome profile
3. **Optimize your listing**: Use clear screenshots and a compelling description
4. **Set a pricing model**: Decide between free, one-time purchase, or subscription

### Publishing Steps

1. **Create a developer account** at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. **Upload your extension** as a ZIP file (do not include the `manifest.json` at the root)
3. **Fill in store listing details**: Description, screenshots, category, and privacy policy
4. **Submit for review**: Google typically reviews within a few hours to a few days

For a comprehensive guide to the publishing process, see our [Chrome Web Store publishing guide](/chrome-extension-guide/docs/publishing/publishing-guide/).

---

## Monetization Options {#monetization}

Building a successful tab manager can be a profitable venture. There are several monetization strategies to consider.

### Freemium Model

The freemium model is particularly effective for tab managers. Offer basic features for free (tab listing, basic grouping, search) while reserving advanced features for paying users:

- **Free**: Basic tab list, search, pin/unpin tabs
- **Pro ($2.99/month)**: Unlimited session保存, tab groups, auto-suspend, cloud sync
- **Team ($4.99/month/user)**: Shared tab collections, team workspace

### Premium Features That Drive Sales

Focus on features that solve real pain points:

- **Aggressive auto-suspend**: More configurable suspension rules
- **Cloud sync**: Access saved sessions across devices
- **Tab history**: Track previously closed tabs
- **Export/import**: Backup and restore functionality

For an example of a successful tab management extension with premium features, check out [Tab Suspender Pro](https://chromewebstore.google.com/detail/tab-suspender-pro/dedhmikogfenolhffljmpgcfcgbgelkm) on the Chrome Web Store. It demonstrates effective freemium implementation with features like adjustable suspension timing, whitelist management, and memory usage statistics.

### Additional Monetization Approaches

- **One-time purchase**: $9.99 for lifetime access
- **Affiliate partnerships**: Partner with productivity tools
- **Data insights**: Anonymized usage analytics (with user consent)

For a comprehensive guide to implementing these monetization strategies, refer to the [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/).

---

## Conclusion

Building a tab manager Chrome extension is an excellent project that teaches you valuable skills while creating a genuinely useful tool. In this tutorial, you have learned how to:

1. Set up a Manifest V3 extension project with proper permissions
2. Use the Chrome Tabs API to query, filter, and manipulate tabs
3. Implement tab grouping using the Tab Groups API
4. Add suspend/restore functionality with chrome.tabs.discard
5. Build a responsive popup UI with search capabilities
6. Register keyboard shortcuts using the Commands API
7. Persist user sessions with the Storage API
8. Prepare and publish your extension to the Chrome Web Store
9. Monetize your extension with various pricing strategies

The Chrome extension ecosystem continues to grow, and tab management remains one of the most requested categories. With the skills from this tutorial, you are well-equipped to build and publish your own tab management extension.

---

## Next Steps

Now that you have built your tab manager, consider enhancing it with these advanced features:

- **Virtual scrolling**: Handle hundreds of tabs efficiently with virtual list rendering
- **Tab preview**: Show thumbnail previews of tab content
- **Drag-and-drop**: Allow reorganizing tabs in the popup
- **Cloud sync**: Synchronize sessions across devices
- **Analytics**: Track popular features and user behavior

Explore our [Chrome Extension API Reference](/chrome-extension-guide/docs/api-reference/) for deeper dives into specific APIs, and check out our [permissions documentation](/chrome-extension-guide/docs/permissions/) for best practices on requesting the right permissions.


---

*Built by theluckystrike at [zovo.one](https://zovo.one)*
