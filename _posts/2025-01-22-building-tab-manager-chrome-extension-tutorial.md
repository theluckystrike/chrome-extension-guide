---
layout: default
title: "Building a Tab Manager Chrome Extension — Step-by-Step Tutorial (2025)"
description: "Learn to build a full-featured tab manager Chrome extension. Covers tab grouping, search, suspend/restore, keyboard shortcuts, and Chrome Web Store publishing."
date: 2025-01-22
categories: [tutorials]
tags: [tab-manager, chrome-extension-tutorial, tab-groups, chrome-tabs-api, browser-extension]
author: theluckystrike
---

# Building a Tab Manager Chrome Extension from Scratch — Step-by-Step Tutorial (2025)

Tab management remains one of the most requested features in Chrome extensions. With users routinely keeping dozens or even hundreds of tabs open, the need for powerful tab organization tools has never been greater. In this comprehensive tutorial, we'll build a fully functional tab manager extension using Manifest V3, covering everything from project setup to Chrome Web Store publication.

By the end of this guide, you'll have created an extension with tab grouping, search functionality, suspend/restore capabilities, keyboard shortcuts, and session persistence. Let's dive in.

---

## Project Setup with Manifest V3 {#project-setup}

Every Chrome extension begins with the manifest file. For our tab manager, we'll use Manifest V3, which offers improved security and performance over its predecessor. Create a new directory for your extension and add the following `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "TabMaster Pro",
  "version": "1.0.0",
  "description": "Powerful tab manager with grouping, search, and suspend features",
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "commands"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon48.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "commands": {
    "toggle-sidebar": {
      "suggested_key": "Ctrl+Shift+T",
      "description": "Toggle tab manager sidebar"
    }
  },
  "icons": {
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The permissions we've selected are essential for our tab manager. The `tabs` permission provides access to tab information, `tabGroups` enables grouping functionality, `storage` allows saving sessions, and `commands` lets us define keyboard shortcuts. For a production extension, you might want to use `activeTab` instead of `tabs` where possible to minimize permission requirements—see our [permissions guide](/docs/permissions/) for best practices.

Create the directory structure:

```
tab-manager/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── styles.css
├── icons/
│   ├── icon48.png
│   └── icon128.png
└── content.js
```

---

## Chrome.tabs API Deep Dive {#chrome-tabs-api}

The chrome.tabs API is the foundation of any tab management extension. Understanding its capabilities is crucial for building effective tab managers. The API provides methods for creating, querying, updating, and closing tabs, along with event listeners for tracking tab changes.

### Key Methods Overview

The most frequently used methods include `chrome.tabs.query()` for retrieving tabs matching specific criteria, `chrome.tabs.create()` for opening new tabs, `chrome.tabs.update()` for modifying tab properties, and `chrome.tabs.remove()` for closing tabs. For our extension, we'll primarily work with query and update operations.

Here's how to fetch all tabs in the current window:

```javascript
// Get all tabs in the current window
async function getAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs;
}
```

The query method accepts a filter object that can include properties like `active`, `pinned`, `audible`, `mutedInfo`, and `windowId`. This flexibility allows you to build sophisticated filtering systems. Our [API reference](/docs/api-reference/tabs-api) provides complete documentation on all available methods and properties.

### Understanding Tab Objects

Each tab object returned by the API contains numerous properties. The most important for our purposes are:

- **id**: Unique identifier for the tab
- **title**: The page title
- **url**: The full URL of the page
- **favIconUrl**: The favicon URL
- **active**: Boolean indicating if the tab is active
- **pinned**: Boolean indicating if the tab is pinned
- **groupId**: The ID of the tab's group (if any)
- **discarded**: Boolean indicating if the tab is suspended

Understanding these properties enables you to build rich interfaces that display meaningful tab information to users.

---

## Tab Querying and Filtering {#tab-querying-filtering}

Building an effective tab manager requires powerful search and filtering capabilities. Users need to quickly locate tabs among potentially hundreds open. Let's implement a robust filtering system.

### Basic Filtering

```javascript
async function filterTabs(query) {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const lowerQuery = query.toLowerCase();
  
  return allTabs.filter(tab => {
    return tab.title.toLowerCase().includes(lowerQuery) ||
           tab.url.toLowerCase().includes(lowerQuery);
  });
}
```

### Advanced Filtering with Multiple Criteria

For a production-grade tab manager, you'll want to support multiple filter types:

```javascript
async function advancedFilter(filters) {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  
  return allTabs.filter(tab => {
    // Filter by search query
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (!tab.title.toLowerCase().includes(q) && 
          !tab.url.toLowerCase().includes(q)) {
        return false;
      }
    }
    
    // Filter by tab state
    if (filters.active !== undefined && tab.active !== filters.active) {
      return false;
    }
    
    if (filters.pinned !== undefined && tab.pinned !== filters.pinned) {
      return false;
    }
    
    if (filters.discarded !== undefined && tab.discarded !== filters.discarded) {
      return false;
    }
    
    // Filter by URL pattern
    if (filters.urlPattern) {
      const pattern = new RegExp(filters.urlPattern);
      if (!pattern.test(tab.url)) {
        return false;
      }
    }
    
    return true;
  });
}
```

This filtering system forms the backbone of our search functionality, allowing users to find tabs by title, URL, or state quickly.

---

## Tab Groups API {#tab-groups-api}

Chrome's Tab Groups API (introduced in Chrome 87) revolutionized tab organization. Groups allow users to visually organize related tabs with color-coded headers. Our extension will leverage this API to provide powerful grouping capabilities.

### Creating Tab Groups

```javascript
async function createTabGroup(tabIds, title, color) {
  const groupId = await chrome.tabs.group({ tabIds });
  
  await chrome.tabGroups.update(groupId, {
    title: title,
    color: color
  });
  
  return groupId;
}
```

The API supports several colors: grey, red, orange, yellow, green, blue, purple, pink, and cyan. Choose colors that make sense for your UI and consider providing a color picker for users.

### Moving Tabs to Groups

```javascript
async function moveTabsToGroup(tabIds, groupId) {
  await chrome.tabs.group({
    groupId: groupId,
    tabIds: tabIds
  });
}
```

### Listing and Managing Groups

```javascript
async function getAllGroups() {
  const groups = await chrome.tabGroups.query({});
  return groups;
}

async function updateGroupColor(groupId, newColor) {
  await chrome.tabGroups.update(groupId, { color: newColor });
}

async function ungroupTabs(tabIds) {
  for (const tabId of tabIds) {
    await chrome.tabs.ungroup(tabId);
  }
}
```

The Tab Groups API requires the `tabGroups` permission in your manifest. This feature works seamlessly with the tabs API, allowing you to build sophisticated organization features. See our detailed [Tab Groups documentation](/docs/permissions/tabGroups) for more advanced usage patterns.

---

## Suspend and Restore with chrome.tabs.discard {#suspend-restore}

Memory management is critical for users with many tabs. Chrome's built-in tab discarding mechanism unloads tab content from memory while keeping the tab open. Our extension will leverage this to help users manage memory more effectively.

### Understanding Tab Discarding

When a tab is discarded, Chrome removes its renderer process from memory but keeps the tab in the tab strip. When the user activates a discarded tab, Chrome automatically reloads it. This is transparent to users but significantly reduces memory usage.

### Implementing Suspend Functionality

```javascript
async function suspendTab(tabId) {
  try {
    // The discard method moves the tab to a discarded state
    await chrome.tabs.discard(tabId);
    return true;
  } catch (error) {
    console.error('Failed to discard tab:', error);
    return false;
  }
}

async function suspendMultipleTabs(tabIds) {
  const results = await Promise.allSettled(
    tabIds.map(tabId => chrome.tabs.discard(tabId))
  );
  
  return {
    success: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length
  };
}
```

### Auto-Suspend Based on Inactivity

Many users want tabs to automatically suspend after a period of inactivity. While Chrome doesn't provide a native "auto-suspend" feature, you can implement this using the Alarms API:

```javascript
// In background.js
chrome.alarms.create('checkIdleTabs', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkIdleTabs') {
    const state = await chrome.idle.queryState(30); // 30 minutes
    if (state === 'idle') {
      const tabs = await chrome.tabs.query({ 
        active: false, 
        discarded: false,
        pinned: false 
      });
      
      // Suspend all inactive tabs
      for (const tab of tabs) {
        await chrome.tabs.discard(tab.id);
      }
    }
  }
});
```

This implementation checks every 5 minutes if the user is idle, and if so, suspends all inactive, non-pinned tabs. Remember to add the `idle` permission to your manifest for this to work.

---

## Popup UI with Tab List {#popup-ui}

The popup interface is the primary way users interact with our extension. Let's build a clean, functional popup that displays tabs and provides quick actions.

### HTML Structure

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <input type="text" id="search-input" placeholder="Search tabs...">
      <div class="header-actions">
        <button id="group-btn" title="Create Group">📁</button>
        <button id="suspend-btn" title="Suspend All">💤</button>
      </div>
    </header>
    
    <div class="tab-list" id="tab-list">
      <!-- Tabs will be dynamically inserted here -->
    </div>
    
    <footer class="popup-footer">
      <span id="tab-count">0 tabs</span>
      <button id="settings-btn">⚙️</button>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### JavaScript for Tab Rendering

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  await renderTabs();
  
  // Set up search functionality
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    await renderTabs(query);
  });
});

async function renderTabs(filterQuery = null) {
  const tabList = document.getElementById('tab-list');
  const tabCount = document.getElementById('tab-count');
  
  let tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Apply filter if provided
  if (filterQuery) {
    const lowerQuery = filterQuery.toLowerCase();
    tabs = tabs.filter(tab => 
      tab.title.toLowerCase().includes(lowerQuery) ||
      tab.url.toLowerCase().includes(lowerQuery)
    );
  }
  
  tabCount.textContent = `${tabs.length} tabs`;
  tabList.innerHTML = '';
  
  // Sort tabs by activity (active first)
  tabs.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
  
  for (const tab of tabs) {
    const tabElement = createTabElement(tab);
    tabList.appendChild(tabElement);
  }
}

function createTabElement(tab) {
  const div = document.createElement('div');
  div.className = `tab-item ${tab.active ? 'active' : ''} ${tab.discarded ? 'discarded' : ''}`;
  div.dataset.tabId = tab.id;
  
  div.innerHTML = `
    <img class="tab-favicon" src="${tab.favIconUrl || 'icons/default.png'}" alt="">
    <div class="tab-info">
      <div class="tab-title">${escapeHtml(tab.title)}</div>
      <div class="tab-url">${escapeHtml(new URL(tab.url).hostname)}</div>
    </div>
    <div class="tab-actions">
      <button class="action-btn pin-btn" title="${tab.pinned ? 'Unpin' : 'Pin'}">
        ${tab.pinned ? '📌' : '📍'}
      </button>
      <button class="action-btn suspend-btn" title="Suspend">
        💤
      </button>
      <button class="action-btn close-btn" title="Close">✕</button>
    </div>
  `;
  
  // Add click handler to activate tab
  div.addEventListener('click', (e) => {
    if (!e.target.closest('.action-btn')) {
      chrome.tabs.update(tab.id, { active: true });
    }
  });
  
  // Add action button handlers
  div.querySelector('.close-btn').addEventListener('click', () => {
    chrome.tabs.remove(tab.id);
  });
  
  div.querySelector('.suspend-btn').addEventListener('click', () => {
    chrome.tabs.discard(tab.id);
    renderTabs();
  });
  
  return div;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Styling the Popup

```css
/* styles.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 400px;
  height: 500px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #1e1e1e;
  color: #fff;
}

.popup-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.popup-header {
  padding: 12px;
  background: #2d2d2d;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #3d3d3d;
}

#search-input {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: #3d3d3d;
  color: #fff;
  font-size: 14px;
}

#search-input:focus {
  outline: 2px solid #4a9eff;
  background: #454545;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions button {
  background: #3d3d3d;
  border: none;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  font-size: 16px;
}

.header-actions button:hover {
  background: #4d4d4d;
}

.tab-list {
  flex: 1;
  overflow-y: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  gap: 10px;
  cursor: pointer;
  border-bottom: 1px solid #2d2d2d;
  transition: background 0.15s;
}

.tab-item:hover {
  background: #2d2d2d;
}

.tab-item.active {
  background: #3d3d3d;
  border-left: 3px solid #4a9eff;
}

.tab-item.discarded {
  opacity: 0.6;
}

.tab-favicon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.tab-info {
  flex: 1;
  min-width: 0;
}

.tab-title {
  font-size: 13px;
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
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.tab-item:hover .tab-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
}

.action-btn:hover {
  background: #4d4d4d;
}

.popup-footer {
  padding: 10px 12px;
  background: #2d2d2d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #888;
}
```

This popup provides a clean, modern interface with search, tab activation, pinning, suspension, and closing capabilities.

---

## Keyboard Shortcuts {#keyboard-shortcuts}

Power users rely on keyboard shortcuts for speed. Manifest V3 provides a built-in commands API for defining global keyboard shortcuts.

### Defining Commands in Manifest

```json
{
  "commands": {
    "toggle-sidebar": {
      "suggested_key": "Ctrl+Shift+T",
      "description": "Toggle tab manager sidebar"
    },
    "quick-search": {
      "suggested_key": "Ctrl+Shift+F",
      "description": "Open quick search"
    },
    "suspend-inactive": {
      "suggested_key": "Ctrl+Shift+S",
      "description": "Suspend all inactive tabs"
    }
  }
}
```

### Handling Commands in Background Script

```javascript
// background.js
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-sidebar':
      await toggleSidebar();
      break;
    case 'quick-search':
      await openQuickSearch();
      break;
    case 'suspend-inactive':
      await suspendInactiveTabs();
      break;
  }
});

async function toggleSidebar() {
  // Implementation depends on your UI choice
  // Could open side panel or popup
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.sidePanel.open({ tabId: tab.id });
}

async function suspendInactiveTabs() {
  const tabs = await chrome.tabs.query({ 
    active: false, 
    currentWindow: true,
    pinned: false,
    discarded: false 
  });
  
  for (const tab of tabs) {
    await chrome.tabs.discard(tab.id);
  }
}

async function openQuickSearch() {
  // Open a quick search modal or side panel
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.sidePanel.open({ tabId: tab.id });
}
```

Chrome allows users to customize keyboard shortcuts through the extensions management page. Your suggested keys are just defaults—users can change them to whatever works best for their workflow.

---

## Storage for Saved Sessions {#storage-sessions}

Session persistence is crucial for any serious tab manager. Users want to save their current workspace and restore it later. Chrome's storage API provides reliable, synchronous-feeling storage for extension data.

### Saving Sessions

```javascript
async function saveCurrentSession(name) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  const session = {
    name: name,
    created: new Date().toISOString(),
    tabs: tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      pinned: tab.pinned,
      groupId: tab.groupId
    }))
  };
  
  // Get existing sessions
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  sessions.push(session);
  
  // Save back to storage
  await chrome.storage.local.set({ sessions });
  
  return session;
}
```

### Restoring Sessions

```javascript
async function restoreSession(sessionId) {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Create tabs for each saved tab
  const tabIds = [];
  for (const tabData of session.tabs) {
    const tab = await chrome.tabs.create({
      url: tabData.url,
      pinned: tabData.pinned,
      active: false
    });
    tabIds.push(tab.id);
  }
  
  // Restore groups if applicable
  // (Group restoration is more complex and may require
  // creating groups after tabs are created)
  
  return { tabIds, groupCount: session.tabs.filter(t => t.groupId).length };
}
```

### Managing Sessions

```javascript
async function listSessions() {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  return sessions.map(s => ({
    id: s.id,
    name: s.name,
    created: s.created,
    tabCount: s.tabs.length
  })).sort((a, b) => new Date(b.created) - new Date(a.created));
}

async function deleteSession(sessionId) {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const filtered = sessions.filter(s => s.id !== sessionId);
  await chrome.storage.local.set({ sessions: filtered });
}

async function exportSessions() {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tab-sessions-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

The storage API provides 10MB of storage by default, which is sufficient for most session data. For extensions that need more storage, request the `unlimitedStorage` permission.

---

## Publishing to Chrome Web Store {#publishing}

Once your extension is complete, it's time to publish it to the Chrome Web Store. This process involves preparing your extension, creating developer account assets, and navigating the review process.

### Pre-Publishing Checklist

Before submitting, ensure:

1. **Complete manifest.json** - All required fields filled
2. **Privacy policy** - Required for extensions with broad permissions
3. **Screenshots** - At least one 1280x800 or 640x400 screenshot
4. **Icons** - 128x128 icon required, 16x16 and 48x48 recommended
5. **Terms of Service** - Recommended for monetization

### Publishing via CLI

For automated deployments, use the `chrome-webstore-upload` package:

```bash
npm install chrome-webstore-upload-cli -g

chrome-webstore-upload \
  --source ./dist \
  --extension-id $EXTENSION_ID \
  --client-id $CLIENT_ID \
  --client-secret $CLIENT_SECRET \
  --refresh-token $REFRESH_TOKEN \
  --publish-delay 5000
```

### Manual Publishing

1. Package your extension as a ZIP file (don't include the root folder, just contents)
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Create a new item and upload your ZIP
4. Fill in store listing details
5. Submit for review

Chrome's review process typically takes 1-3 days. During review, ensure your extension doesn't violate any policies—particularly around permissions usage and user data handling.

---

## Monetization Options {#monetization}

Building a successful tab manager can also be a viable business. Several monetization strategies work well for productivity extensions.

### Freemium Model

The freemium model offers basic features free with premium features for paying users. For a tab manager, free features might include basic tab grouping and search, while premium features could include:

- Unlimited saved sessions
- Cloud sync across devices
- Advanced automation rules
- Priority support

### Tab Suspender Pro: A Case Study

Consider [Tab Suspender Pro](https://zovo.one) as an example of successful extension monetization. This extension offers:

- Free tier: Basic tab suspension
- Pro tier ($2.99/month): Advanced scheduling, custom rules, cloud backup

This approach provides clear value differentiation while maintaining a useful free version that drives word-of-mouth growth.

### Alternative Revenue Models

- **Donations**: Add a "Support Development" button using Ko-fi or PayPal
- **Affiliate partnerships**: Partner with productivity tool companies
- **Enterprise licensing**: Offer team/company plans with admin controls

For comprehensive guidance on extension monetization, see our [Chrome Extension Monetization Playbook](/docs/monetization/).

---

## Conclusion

Building a tab manager Chrome extension is an excellent project that teaches you fundamental extension development concepts while creating something genuinely useful. You've learned how to work with the chrome.tabs API, implement tab groups, add suspend/restore functionality, create responsive popup interfaces, set up keyboard shortcuts, persist sessions, and publish to the Chrome Web Store.

The features we've covered form the foundation of any serious tab management tool. From here, you can expand into cloud sync, advanced automation, team features, or any number of directions that match your vision.

Remember to respect user privacy, minimize permissions, and provide clear value—whether free or paid. The Chrome extension ecosystem rewards developers who create genuinely helpful tools and treat users fairly.

---

## Additional Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Tabs API Reference](/docs/api-reference/tabs-api)
- [Permissions Best Practices](/docs/permissions/)
- [Tab Groups API Documentation](/docs/permissions/tabGroups)
- [Extension Monetization Guide](/docs/monetization/)

---

*Built by theluckystrike at [zovo.one](https://zovo.one)*
