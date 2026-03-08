---
layout: default
title: "Building a Tab Manager Chrome Extension — Step-by-Step Tutorial (2025)"
description: "Learn to build a full-featured tab manager Chrome extension. Covers tab grouping, search, suspend/restore, keyboard shortcuts, and Chrome Web Store publishing."
date: 2025-01-22
categories: [tutorials]
tags: [tab-manager, chrome-extension-tutorial, tab-groups, chrome-tabs-api, browser-extension]
author: theluckystrike
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/22/building-tab-manager-chrome-extension-tutorial/"
---

# Building a Tab Manager Chrome Extension — Step-by-Step Tutorial (2025)

If you have ever found yourself drowning in dozens of open browser tabs, you are not alone. The average Chrome user has 70+ tabs open at any given time, leading to memory issues, slower performance, and lost productivity. Building a tab manager extension is one of the most useful projects you can undertake in 2025 — it solves a real problem, has clear monetization potential, and teaches you the full range of Chrome extension APIs.

In this comprehensive tutorial, we will build a complete tab manager extension from scratch using Manifest V3. You will learn how to query and filter tabs, organize them into groups, implement suspend/restore functionality, create a polished popup UI, add keyboard shortcuts, persist sessions, and publish to the Chrome Web Store.

---

## Prerequisites and Project Setup {#project-setup}

Before we dive into code, ensure you have a basic development environment set up. You will need:

- A text editor (VS Code recommended)
- Google Chrome or Chromium-based browser
- Basic knowledge of HTML, CSS, and JavaScript

### Creating the Project Structure

Create a new folder for your extension and set up the following file structure:

```
tab-manager/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── service-worker.js
├── content/
│   └── content.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Writing the Manifest V3 Configuration

The manifest file is the heart of your extension. Here is the complete manifest.json for our tab manager:

```json
{
  "manifest_version": 3,
  "name": "Tab Master Pro",
  "version": "1.0.0",
  "description": "Powerful tab manager with grouping, search, and suspend features",
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "commands",
    "unlimitedStorage"
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
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest requests the essential permissions for a tab manager. The `tabs` permission gives us access to the chrome.tabs API, while `tabGroups` enables the grouping functionality introduced in Chrome 88. The `storage` permission allows us to save sessions and user preferences. For more details on permissions and when to use each, see our [permissions guide](/chrome-extension-guide/docs/permissions/).

---

## Deep Dive into the chrome.tabs API {#chrome-tabs-api}

The chrome.tabs API is the foundation of any tab management extension. It provides methods for creating, reading, updating, and deleting tabs, as well as querying tabs based on various criteria.

### Understanding Tab Objects

Every tab in Chrome is represented as a tab object with numerous properties. The most important ones for our tab manager include:

- **id**: Unique identifier for the tab
- **windowId**: The window containing the tab
- **title**: The page title
- **url**: The current URL
- **favIconUrl**: URL of the page favicon
- **active**: Whether the tab is currently active
- **pinned**: Whether the tab is pinned
- **audible**: Whether the tab is playing audio
- **discarded**: Whether the tab has been discarded (suspended)
- **groupId**: The ID of the tab's group (if any)

### Querying Tabs with chrome.tabs.query

The `chrome.tabs.query()` method is the workhorse of tab management. It allows you to retrieve tabs matching specific criteria:

```javascript
// Get all tabs in the current window
chrome.tabs.query({ currentWindow: true }, (tabs) => {
  console.log(`Found ${tabs.length} tabs`);
  tabs.forEach(tab => {
    console.log(`${tab.title}: ${tab.url}`);
  });
});

// Get only active tabs (not discarded)
chrome.tabs.query({ currentWindow: true, discarded: false }, (tabs) => {
  // Process non-suspended tabs
});

// Get tabs from a specific domain
chrome.tabs.query({ url: '*://*.github.com/*' }, (tabs) => {
  // All GitHub tabs across all windows
});

// Get pinned tabs
chrome.tabs.query({ currentWindow: true, pinned: true }, (tabs) => {
  // Handle pinned tabs separately
});
```

The query method is asynchronous and uses callbacks. For modern code, you can wrap it in a Promise for cleaner async/await usage:

```javascript
function getTabs(queryInfo) {
  return new Promise((resolve) => {
    chrome.tabs.query(queryInfo, resolve);
  });
}

// Usage
const allTabs = await getTabs({ currentWindow: true });
```

### Filtering and Searching Tabs

For a real tab manager, you will need powerful filtering capabilities. Here is how to implement tab search:

```javascript
function searchTabs(query) {
  const lowerQuery = query.toLowerCase();
  
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const results = tabs.filter(tab => {
      const titleMatch = tab.title?.toLowerCase().includes(lowerQuery);
      const urlMatch = tab.url?.toLowerCase().includes(lowerQuery);
      return titleMatch || urlMatch;
    });
    
    displayResults(results);
  });
}
```

This basic search can be enhanced with regex support, fuzzy matching, or integration with fuzzy search libraries like Fuse.js for more intelligent results.

---

## Working with Tab Groups API {#tab-groups-api}

Chrome's Tab Groups API (introduced in Chrome 88) allows you to organize tabs into colored groups. This is incredibly useful for visual organization and is a core feature of any modern tab manager.

### Creating Tab Groups

To create a tab group, use the `chrome.tabGroups.create()` method:

```javascript
async function createTabGroup(tabIds, title, color = 'grey') {
  const group = await chrome.tabGroups.create({
    tabIds: tabIds,
    title: title,
    color: color
  });
  return group;
}

// Usage: Group selected tabs
const selectedTabIds = [12, 15, 18];
const group = await createTabGroup(selectedTabIds, 'Research', 'blue');
```

Available colors include: grey, blue, cyan, green, yellow, orange, red, and purple.

### Managing Tab Groups

Once you have created groups, you can update, query, and delete them:

```javascript
// Get all groups in the current window
async function getTabGroups() {
  const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  return groups;
}

// Update a group's properties
async function renameGroup(groupId, newTitle, newColor) {
  await chrome.tabGroups.update(groupId, {
    title: newTitle,
    color: newColor
  });
}

// Move tabs to an existing group
async function addTabsToGroup(tabIds, groupId) {
  await chrome.tabs.group({ tabIds: tabIds, groupId: groupId });
}

// Ungroup tabs (move to window root)
async function ungroupTabs(tabIds) {
  await chrome.tabs.ungroup(tabIds);
}
```

For a complete reference on the Tab Groups API, see our [Tab Groups API Guide](/chrome-extension-guide/docs/tutorials/tab-groups-api-guide/).

---

## Implementing Tab Suspend and Restore {#suspend-restore}

Tab suspension is one of the most requested features for tab managers. It allows users to "freeze" inactive tabs to save memory while keeping them accessible for quick restoration.

### Using chrome.tabs.discard

Chrome provides a built-in method for discarding tabs:

```javascript
// Discard a specific tab
async function discardTab(tabId) {
  try {
    const discardedTab = await chrome.tabs.discard(tabId);
    console.log('Tab discarded:', discardedTab.id);
    return discardedTab;
  } catch (error) {
    console.error('Failed to discard tab:', error);
  }
}

// Discard multiple tabs (except active ones)
async function discardInactiveTabs() {
  const tabs = await chrome.tabs.query({ 
    currentWindow: true, 
    active: false,
    discarded: false
  });
  
  for (const tab of tabs) {
    await chrome.tabs.discard(tab.id);
  }
}
```

The discard API automatically selects which tab to discard based on Chrome's internal heuristics. When a tab is discarded, Chrome replaces it with a "placeholder" tab that shows the original URL and title. When the user clicks on it, Chrome automatically reloads the tab.

### Restoring Discarded Tabs

Restoring a discarded tab is simple — just navigate to its URL or reload it:

```javascript
async function restoreTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.discarded) {
    await chrome.tabs.reload(tabId);
  }
}

// Or restore by navigating to the original URL
async function restoreTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.discarded && tab.url) {
    await chrome.tabs.update(tabId, { url: tab.url });
  }
}
```

### Smart Auto-Suspend

For a more sophisticated implementation, you can create an auto-suspend feature that discards tabs after a period of inactivity:

```javascript
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle') {
    // User is away - discard inactive tabs
    discardInactiveTabs();
  } else if (state === 'active') {
    // User returned - nothing needed, 
    // discarded tabs will auto-restore on click
  }
});

// Configure idle detection threshold (default is 5 minutes)
chrome.idle.setDetectionInterval(300); // 5 minutes in seconds
```

---

## Building the Popup UI {#popup-ui}

The popup is the main interface users interact with. It should display a list of tabs, allow searching and filtering, and provide quick actions.

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tab Master Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Tab Master Pro</h1>
      <div class="search-box">
        <input type="text" id="search" placeholder="Search tabs...">
      </div>
      <div class="actions">
        <button id="group-btn" title="Group Selected">Group</button>
        <button id="discard-btn" title="Suspend Selected">Suspend</button>
        <button id="close-btn" title="Close Selected">Close</button>
      </div>
    </header>
    
    <div class="tabs-container" id="tabs-list">
      <!-- Tabs will be dynamically inserted here -->
    </div>
    
    <footer class="footer">
      <span id="tab-count">0 tabs</span>
      <button id="settings-btn">Settings</button>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### Styling the Popup

Create a modern, clean interface with proper spacing and visual hierarchy:

```css
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

.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  background: #fff;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.search-box input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 12px;
}

.search-box input:focus {
  outline: none;
  border-color: #4285f4;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

#group-btn { background: #e8f0fe; color: #1a73e8; }
#discard-btn { background: #fce8e6; color: #d93025; }
#close-btn { background: #f1f3f4; color: #5f6368; }

.actions button:hover {
  opacity: 0.8;
}

.tabs-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.tab-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tab-item.selected {
  background: #e8f0fe;
  border: 2px solid #4285f4;
}

.tab-icon {
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
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-item.discarded .tab-title {
  color: #999;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #666;
}

#settings-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}
```

### Implementing Popup Logic

The popup JavaScript handles loading tabs, search filtering, and user interactions:

```javascript
let allTabs = [];
let selectedTabs = new Set();

// Load tabs when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  await loadTabs();
  setupEventListeners();
});

async function loadTabs() {
  allTabs = await chrome.tabs.query({ currentWindow: true });
  renderTabs(allTabs);
  updateTabCount();
}

function renderTabs(tabs) {
  const container = document.getElementById('tabs-list');
  container.innerHTML = '';
  
  tabs.forEach(tab => {
    const tabElement = createTabElement(tab);
    container.appendChild(tabElement);
  });
}

function createTabElement(tab) {
  const div = document.createElement('div');
  div.className = `tab-item${tab.discarded ? ' discarded' : ''}`;
  div.dataset.tabId = tab.id;
  
  div.innerHTML = `
    <img class="tab-icon" src="${tab.favIconUrl || 'icons/icon16.png'}" onerror="this.src='icons/icon16.png'">
    <div class="tab-info">
      <div class="tab-title">${tab.title}</div>
      <div class="tab-url">${new URL(tab.url).hostname}</div>
    </div>
  `;
  
  // Click to activate tab
  div.addEventListener('click', async () => {
    await chrome.tabs.update(tab.id, { active: true });
    window.close();
  });
  
  // Ctrl/Cmd+Click to select
  div.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey) {
      toggleTabSelection(tab.id);
      e.stopPropagation();
    }
  });
  
  return div;
}

function toggleTabSelection(tabId) {
  if (selectedTabs.has(tabId)) {
    selectedTabs.delete(tabId);
  } else {
    selectedTabs.add(tabId);
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  document.querySelectorAll('.tab-item').forEach(el => {
    const tabId = parseInt(el.dataset.tabId);
    el.classList.toggle('selected', selectedTabs.has(tabId));
  });
}

// Search functionality
document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  
  if (!query) {
    renderTabs(allTabs);
    return;
  }
  
  const filtered = allTabs.filter(tab => {
    return (tab.title?.toLowerCase().includes(query)) ||
           (tab.url?.toLowerCase().includes(query));
  });
  
  renderTabs(filtered);
});

// Action buttons
document.getElementById('group-btn').addEventListener('click', async () => {
  if (selectedTabs.size < 2) {
    alert('Select at least 2 tabs to group');
    return;
  }
  
  const groupName = prompt('Enter group name:');
  if (groupName) {
    await chrome.tabs.group({ 
      tabIds: Array.from(selectedTabs) 
    });
    // Then update the group with name
    await loadTabs();
  }
});

document.getElementById('discard-btn').addEventListener('click', async () => {
  const tabsToDiscard = selectedTabs.size > 0 
    ? Array.from(selectedTabs) 
    : allTabs.filter(t => !t.active).map(t => t.id);
  
  for (const tabId of tabsToDiscard) {
    await chrome.tabs.discard(tabId);
  }
  
  await loadTabs();
  selectedTabs.clear();
});

document.getElementById('close-btn').addEventListener('click', async () => {
  const tabsToClose = selectedTabs.size > 0 
    ? Array.from(selectedTabs) 
    : allTabs.filter(t => !t.active).map(t => t.id);
  
  await chrome.tabs.remove(tabsToClose);
  await loadTabs();
  selectedTabs.clear();
});

function updateTabCount() {
  document.getElementById('tab-count').textContent = 
    `${allTabs.length} tabs`;
}
```

---

## Adding Keyboard Shortcuts {#keyboard-shortcuts}

Keyboard shortcuts make your extension significantly more powerful. Chrome provides the `commands` API for this purpose.

### Defining Shortcuts in Manifest

Add commands to your manifest.json:

```json
"commands": {
  "focus-search": {
    "suggested_key": {
      "default": "Ctrl+Shift+F",
      "mac": "Command+Shift+F"
    },
    "description": "Focus search in popup"
  },
  "discard-all": {
    "suggested_key": {
      "default": "Ctrl+Shift+D",
      "mac": "Command+Shift+D"
    },
    "description": "Discard all inactive tabs"
  },
  "group-selected": {
    "suggested_key": {
      "default": "Ctrl+Shift+G",
      "mac": "Command+Shift+G"
    },
    "description": "Group selected tabs"
  },
  "close-others": {
    "suggested_key": {
      "default": "Ctrl+Shift+W",
      "mac": "Command+Shift+W"
    },
    "description": "Close all tabs except current"
  }
}
```

### Handling Commands in Service Worker

In your service worker, listen for keyboard commands:

```javascript
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'focus-search':
      // Open popup with focus on search
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.action.openPopup();
      // Send message to popup to focus search input
      chrome.runtime.sendMessage({ action: 'focusSearch' });
      break;
      
    case 'discard-all':
      const tabs = await chrome.tabs.query({ 
        currentWindow: true, 
        active: false,
        discarded: false 
      });
      for (const t of tabs) {
        await chrome.tabs.discard(t.id);
      }
      break;
      
    case 'group-selected':
      // Implementation for grouping
      break;
      
    case 'close-others':
      const [activeTab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      const allWindowTabs = await chrome.tabs.query({ 
        currentWindow: true 
      });
      const others = allWindowTabs
        .filter(t => t.id !== activeTab.id)
        .map(t => t.id);
      await chrome.tabs.remove(others);
      break;
  }
});
```

For more on implementing keyboard commands, see our [Commands API Reference](/chrome-extension-guide/docs/api-reference/commands-api/).

---

## Persisting Sessions with Storage API {#storage-sessions}

A truly useful tab manager should be able to save and restore sessions. Chrome's storage API provides the perfect solution.

### Saving a Session

```javascript
async function saveSession(name) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  const session = {
    name: name,
    timestamp: Date.now(),
    tabs: tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      pinned: tab.pinned,
      groupId: tab.groupId
    }))
  };
  
  // Get existing sessions
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  sessions.push(session);
  
  // Save back to storage
  await chrome.storage.local.set({ sessions });
  
  console.log(`Session "${name}" saved with ${tabs.length} tabs`);
}
```

### Restoring a Session

```javascript
async function restoreSession(session) {
  const window = await chrome.windows.create();
  
  for (const tabInfo of session.tabs) {
    await chrome.tabs.create({
      windowId: window.id,
      url: tabInfo.url,
      pinned: tabInfo.pinned
    });
  }
}
```

### Listing Saved Sessions

```javascript
async function getSavedSessions() {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  return sessions.sort((a, b) => b.timestamp - a.timestamp);
}
```

The storage API gives you 10MB of free storage per extension, which is plenty for session data. For larger applications, see our guide on [advanced storage patterns](/chrome-extension-guide/docs/tutorials/advanced-storage/).

---

## Publishing to the Chrome Web Store {#publishing}

Once your extension is complete, it is time to share it with the world. The Chrome Web Store is the official distribution channel.

### Preparing for Publication

Before publishing, ensure you have:

1. **Developer account**: Sign up at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. **Privacy policy**: Required if your extension requests permissions
3. **Screenshots**: At least one 1280x800 or 640x400 screenshot
4. **Icons**: All required sizes (128x128, 48x48, 16x16)

### Creating a Release Build

Package your extension using Chrome or the CLI:

```bash
# Using Chrome (GUI)
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Pack extension"
# 4. Select your extension folder
# 5. Note the .crx and .pem files

# Or using npm package extension
npm install -g extension
extension zip .
```

### Publishing Process

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item" and upload your .zip file
3. Fill in the Store Listing:
   - Title and description
   - Category (Productivity recommended for tab managers)
   - Language
   - Screenshots and promotional images
4. Set pricing and distribution (Free or Paid)
5. Submit for review

Review times typically take 1-3 days. For detailed optimization tips, see our [Chrome Web Store listing optimization guide](/chrome-extension-guide/docs/tutorials/chrome-web-store-listing-optimization/).

---

## Monetization Options {#monetization}

Tab managers have excellent monetization potential. Here are proven strategies:

### Freemium Model

Offer basic features for free with a paid version for power users. Free version could include:

- Basic tab listing and search
- Manual tab grouping
- Up to 3 saved sessions

Premium features:

- Unlimited session saving
- Auto-suspend with customization
- Cloud sync across devices
- Advanced keyboard shortcuts

### Tab Suspender Pro: A Case Study

[Tab Suspender Pro](https://chromewebstore.google.com/detail/tab-suspender-pro/dedhmikogfenolhffljmpgcfcgbgelkm) is an excellent example of a successful tab management extension. It monetizes through:

- Premium subscription ($2.99/month or $24.99/year)
- Feature-locked free tier
- Focus on specific pain point (battery/memory saving)

The key to successful monetization is solving a specific problem exceptionally well rather than trying to be everything to everyone.

### Alternative Monetization Approaches

- **One-time purchase**: $4.99-9.99 for lifetime access
- **Affiliate integrations**: Partner with productivity tools
- **Data premium**: Offer sync and backup as paid features

For a comprehensive guide on extension monetization, see our [Extension Monetization Playbook](/chrome-extension-guide/docs/monetization/).

---

## Summary and Next Steps {#summary}

Congratulations! You now have a complete understanding of how to build a production-ready tab manager Chrome extension. We covered:

- **Project setup** with proper Manifest V3 configuration
- **chrome.tabs API** for querying, filtering, and managing tabs
- **Tab Groups API** for organizing tabs visually
- **Tab suspension** using chrome.tabs.discard for memory optimization
- **Popup UI** with search, filtering, and action buttons
- **Keyboard shortcuts** for power users
- **Session storage** to save and restore tab configurations
- **Publishing** to the Chrome Web Store
- **Monetization** strategies for building a sustainable business

### Suggested Enhancements

To take your tab manager to the next level, consider adding:

- Tab preview thumbnails using chrome.tabs.captureVisibleTab
- Drag-and-drop reordering in the popup
- Cloud sync using Firebase or your own backend
- Tab usage analytics to identify stale tabs
- Integration with the Side Panel API for persistent access
- Cross-browser support (Firefox, Edge)

The complete code for this tutorial is available in our [examples repository](https://github.com/theluckystrike/chrome-extension-guide). For more advanced patterns and API references, explore our [API documentation](/chrome-extension-guide/docs/api-reference/) and [tutorials section](/chrome-extension-guide/docs/tutorials/).

---

**Built by theluckystrike at [zovo.one](https://zovo.one)**
