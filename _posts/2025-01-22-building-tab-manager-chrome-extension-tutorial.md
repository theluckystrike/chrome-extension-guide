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

Tab management remains one of the most requested features in the Chrome extension ecosystem. With users commonly keeping 50+ tabs open, the need for powerful tab management tools has never been greater. This comprehensive tutorial walks you through building a production-ready tab manager extension from scratch using Manifest V3.

By the end of this guide, you will have created an extension with tab grouping, search functionality, suspend/restore capabilities, keyboard shortcuts, and session saving. You will also learn how to publish your extension to the Chrome Web Store and explore monetization strategies.

---

## Why Build a Tab Manager Extension? {#why-build-tab-manager}

The demand for tab management solutions continues to grow. Chrome's built-in tab groups have limitations, and users frequently need more advanced features like automatic tab suspension, cross-window tab organization, and session management.

Building a tab manager is an excellent project because it touches on many Chrome extension APIs, giving you hands-on experience with the core platform. Extensions like [Tab Suspender Pro](https://chromewebstore.google.com/detail/tab-suspender-pro/dedhmikogfenolhffljmpgcfcgbgelkm) have millions of users, demonstrating the market appetite for well-designed tab management tools.

---

## Project Setup with Manifest V3 {#project-setup}

Every Chrome extension begins with the manifest file. For a tab manager, we need to declare the appropriate permissions and define the extension's components.

### Creating the Manifest

Create a new directory for your extension and add the following `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Tab Master Pro",
  "version": "1.0.0",
  "description": "Powerful tab management with grouping, search, and session saving",
  "permissions": [
    "tabs",
    "tabGroups",
    "storage",
    "commands"
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
  "commands": {
    "open-tab-manager": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "mac": "Command+Shift+T"
      },
      "description": "Open tab manager"
    }
  }
}
```

The permissions you declare directly impact user trust and the review process. For a tab manager, you need `tabs` for tab information, `tabGroups` for grouping functionality, `storage` for saving sessions, and `commands` for keyboard shortcuts. For a detailed explanation of each permission, see our [permissions guide](/chrome-extension-guide/docs/permissions/).

### Project Structure

Create the following file structure:

```
tab-master-pro/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── styles.css
├── options.html
├── options.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Chrome Tabs API Deep Dive {#chrome-tabs-api}

The `chrome.tabs` API is the foundation of any tab management extension. Understanding its methods and events is essential for building robust functionality.

### Querying Tabs

The `chrome.tabs.query()` method is your primary tool for retrieving tab information:

```javascript
// Get all tabs in the current window
const tabs = await chrome.tabs.query({ currentWindow: true });

// Get all tabs across all windows
const allTabs = await chrome.tabs.query({});

// Get only pinned tabs
const pinnedTabs = await chrome.tabs.query({ pinned: true });

// Get tabs from a specific window
const windowTabs = await chrome.tabs.query({ windowId: someWindowId });
```

Each `Tab` object contains valuable properties including `id`, `url`, `title`, `favIconUrl`, `pinned`, `active`, `highlighted`, `incognito`, and `windowId`. For complete API documentation, see our [tabs API reference](/chrome-extension-guide/docs/api-reference/tabs-api.md).

### Creating and Updating Tabs

You can programmatically create and modify tabs:

```javascript
// Create a new tab
const newTab = await chrome.tabs.create({
  url: 'https://example.com',
  active: true,
  pinned: false
});

// Update tab properties
await chrome.tabs.update(tabId, {
  pinned: true,
  active: true,
  muted: true
});

// Reload a tab
await chrome.tabs.reload(tabId);

// Move a tab to a different window
await chrome.tabs.move(tabId, { windowId: targetWindowId, index: -1 });
```

### Tab Events

Your extension should respond to tab changes. The tabs API provides comprehensive event listeners:

```javascript
chrome.tabs.onCreated.addListener((tab) => {
  console.log('Tab created:', tab.title);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab finished loading:', tab.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('Tab removed, window closing:', removeInfo.isWindowClosing);
});

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  console.log('Tab moved to index:', moveInfo.toIndex);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Switched to tab:', activeInfo.tabId);
});
```

---

## Tab Querying and Filtering {#tab-querying-filtering}

A powerful tab manager needs sophisticated filtering capabilities. Users should be able to find tabs quickly using various criteria.

### Building a Search Function

Implement tab search in your popup or side panel:

```javascript
async function searchTabs(query) {
  const allTabs = await chrome.tabs.query({});
  
  const normalizedQuery = query.toLowerCase();
  
  return allTabs.filter(tab => {
    const titleMatch = tab.title?.toLowerCase().includes(normalizedQuery);
    const urlMatch = tab.url?.toLowerCase().includes(normalizedQuery);
    return titleMatch || urlMatch;
  });
}

// Advanced filtering with multiple criteria
async function filterTabs(filters) {
  let tabs = await chrome.tabs.query({});
  
  if (filters.windowId) {
    tabs = tabs.filter(t => t.windowId === filters.windowId);
  }
  
  if (filters.pinned !== undefined) {
    tabs = tabs.filter(t => t.pinned === filters.pinned);
  }
  
  if (filters.audible !== undefined) {
    tabs = tabs.filter(t => t.audible === filters.audible);
  }
  
  if (filters.muted !== undefined) {
    tabs = tabs.filter(t => t.mutedInfo?.muted === filters.muted);
  }
  
  if (filters.groupId !== undefined) {
    tabs = tabs.filter(t => t.groupId === filters.groupId);
  }
  
  return tabs;
}
```

### Organizing by Domain

Many users prefer organizing tabs by domain:

```javascript
function groupTabsByDomain(tabs) {
  const groups = {};
  
  for (const tab of tabs) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push(tab);
    } catch (e) {
      // Handle invalid URLs
      if (!groups['Other']) {
        groups['Other'] = [];
      }
      groups['Other'].push(tab);
    }
  }
  
  return groups;
}
```

---

## Tab Groups API {#tab-groups-api}

Chrome's Tab Groups API allows you to organize tabs into colored groups directly within the browser interface.

### Creating Tab Groups

```javascript
// Create a new tab group
const groupId = await chrome.tabs.group({
  tabIds: [tabId1, tabId2, tabId3]
});

// Set group properties
await chrome.tabGroups.update(groupId, {
  title: 'Research',
  color: 'blue'
});
```

Available group colors include `grey`, `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, and `pink`.

### Managing Groups

```javascript
// Get all tab groups in a window
const groups = await chrome.tabGroups.query({ windowId: currentWindowId });

// Rename a group
await chrome.tabGroups.update(groupId, { title: 'New Name' });

// Change group color
await chrome.tabGroups.update(groupId, { color: 'green' });

// Ungroup tabs (move them out of the group)
await chrome.tabs.ungroup([tabId1, tabId2]);

// Delete a group (and optionally its tabs)
await chrome.tabGroups.remove(groupId);
```

Tab groups integrate with Chrome's native UI, providing a seamless experience for users. For more details on the Tab Groups API, see our [permissions documentation](/chrome-extension-guide/docs/permissions/tabGroups/).

---

## Suspend and Restore with chrome.tabs.discard {#suspend-restore}

Tab discarding is a powerful feature that frees memory by unloading inactive tabs while keeping their entry point in the tab strip.

### Understanding Tab Discarding

Chrome automatically discards tabs when memory is low, but your extension can manage this process explicitly:

```javascript
// Discard a specific tab to free memory
await chrome.tabs.discard(tabId);

// Discard multiple tabs
async function discardInactiveTabs() {
  const tabs = await chrome.tabs.query({
    discarded: false,
    active: false,
    pinned: false
  });
  
  for (const tab of tabs) {
    try {
      await chrome.tabs.discard(tab.id);
    } catch (e) {
      // Some tabs cannot be discarded
      console.log('Cannot discard:', tab.title);
    }
  }
}

// Check if a tab is discarded
async function isTabDiscarded(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return tab.discarded;
}
```

### Restoring Discarded Tabs

When a user clicks on a discarded tab, Chrome automatically reloads it:

```javascript
// Listen for tab activation to restore discarded tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  
  if (tab.discarded) {
    // The tab will automatically reload when accessed
    // You can also manually reload to restore
    await chrome.tabs.reload(activeInfo.tabId);
  }
});

// Alternatively, explicitly restore before activation
async function restoreTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.discarded) {
    await chrome.tabs.reload(tabId);
  }
}
```

Automatic tab suspension is a hallmark of memory-focused extensions. See how [Tab Suspender Pro](https://chromewebstore.google.com/detail/tab-suspender-pro/dedhmikogfenolhffljmpgcfcgbgelkm) implements intelligent suspension rules in our [memory optimization guide](/chrome-extension-guide/docs/tab-suspender-pro-memory-guide/).

---

## Popup UI with Tab List {#popup-ui}

The popup interface is your extension's primary interaction point. Design it to be fast and responsive.

### HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="header">
    <input type="text" id="search" placeholder="Search tabs...">
    <button id="refresh-btn">⟳</button>
  </div>
  
  <div class="tabs-container" id="tabs-list">
    <!-- Tabs will be rendered here -->
  </div>
  
  <div class="footer">
    <button id="suspend-all-btn">Suspend All</button>
    <button id="save-session-btn">Save Session</button>
    <button id="options-btn">⚙</button>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Rendering the Tab List

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  await renderTabs();
  
  // Search functionality
  document.getElementById('search').addEventListener('input', async (e) => {
    const query = e.target.value;
    const filtered = await searchTabs(query);
    renderTabList(filtered);
  });
  
  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    await renderTabs();
  });
});

async function renderTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  renderTabList(tabs);
}

function renderTabList(tabs) {
  const container = document.getElementById('tabs-list');
  container.innerHTML = '';
  
  tabs.forEach(tab => {
    const tabElement = createTabElement(tab);
    container.appendChild(tabElement);
  });
}

function createTabElement(tab) {
  const div = document.createElement('div');
  div.className = `tab-item ${tab.active ? 'active' : ''} ${tab.pinned ? 'pinned' : ''}`;
  div.dataset.tabId = tab.id;
  
  div.innerHTML = `
    <img class="favicon" src="${tab.favIconUrl || 'default-icon.png'}" alt="">
    <div class="tab-info">
      <div class="tab-title">${escapeHtml(tab.title)}</div>
      <div class="tab-url">${escapeHtml(new URL(tab.url).hostname)}</div>
    </div>
    <div class="tab-actions">
      <button class="close-btn" title="Close tab">×</button>
    </div>
  `;
  
  // Click to activate
  div.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('close-btn')) {
      await chrome.tabs.update(tab.id, { active: true });
    }
  });
  
  // Close button
  div.querySelector('.close-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await chrome.tabs.remove(tab.id);
  });
  
  return div;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### CSS Styling

```css
* {
  box-sizing: border-box;
}

body {
  width: 400px;
  min-height: 500px;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1e1e1e;
  color: #e0e0e0;
}

.header {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

#search {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: #3d3d3d;
  color: #e0e0e0;
}

#search:focus {
  outline: 2px solid #4285f4;
}

.tabs-container {
  max-height: 400px;
  overflow-y: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #3d3d3d;
  transition: background 0.15s;
}

.tab-item:hover {
  background: #3d3d3d;
}

.tab-item.active {
  background: #4285f4;
}

.tab-item.pinned {
  border-left: 3px solid #fbbc04;
}

.favicon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
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

.tab-actions button {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.tab-actions button:hover {
  background: #555;
  color: #fff;
}

.footer {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #2d2d2d;
  border-top: 1px solid #3d3d3d;
}

.footer button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: #3d3d3d;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 12px;
}

.footer button:hover {
  background: #4d4d4d;
}
```

---

## Keyboard Shortcuts {#keyboard-shortcuts}

Keyboard shortcuts significantly improve productivity and are expected in professional extensions.

### Defining Shortcuts

Add commands to your manifest:

```json
"commands": {
  "open-tab-manager": {
    "suggested_key": {
      "default": "Ctrl+Shift+T",
      "mac": "Command+Shift+T"
    },
    "description": "Open tab manager popup"
  },
  "search-tabs": {
    "suggested_key": {
      "default": "Ctrl+Shift+F",
      "mac": "Command+Shift+F"
    },
    "description": "Focus tab search"
  },
  "close-current-tab": {
    "suggested_key": {
      "default": "Ctrl+Shift+W",
      "mac": "Command+Shift+W"
    },
    "description": "Close the active tab"
  },
  "suspend-tab": {
    "suggested_key": {
      "default": "Ctrl+Shift+D",
      "mac": "Command+Shift+D"
    },
    "description": "Suspend current tab"
  }
}
```

### Handling Commands in Background

```javascript
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'open-tab-manager':
      await chrome.action.openPopup();
      break;
      
    case 'search-tabs':
      // Open popup and focus search
      await chrome.action.openPopup();
      // Send message to popup to focus search
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'focus-search' });
      break;
      
    case 'close-current-tab':
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        await chrome.tabs.remove(activeTab.id);
      }
      break;
      
    case 'suspend-tab':
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (currentTab && !currentTab.pinned) {
        await chrome.tabs.discard(currentTab.id);
      }
      break;
  }
});
```

For more shortcut patterns and user customization options, see our [commands API guide](/chrome-extension-guide/docs/api-reference/commands-api/).

---

## Storage for Saved Sessions {#storage-sessions}

Session management allows users to save and restore their tab configurations, essential for workflow preservation.

### Session Data Structure

```javascript
const SESSION_KEY = 'saved_sessions';

function createSession(tabs, name) {
  return {
    id: Date.now().toString(),
    name: name || `Session ${new Date().toLocaleString()}`,
    created: new Date().toISOString(),
    tabs: tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      pinned: tab.pinned,
      windowId: tab.windowId
    }))
  };
}

async function saveSession(sessionName) {
  const tabs = await chrome.tabs.query({});
  
  // Filter out special Chrome pages
  const validTabs = tabs.filter(tab => {
    return !tab.url.startsWith('chrome://') && 
           !tab.url.startsWith('chrome-extension://');
  });
  
  const session = createSession(validTabs, sessionName);
  
  const { [SESSION_KEY]: sessions = [] } = await chrome.storage.local.get(SESSION_KEY);
  sessions.unshift(session);
  
  // Keep only last 20 sessions
  const trimmedSessions = sessions.slice(0, 20);
  
  await chrome.storage.local.set({ [SESSION_KEY]: trimmedSessions });
  
  return session;
}

async function loadSession(sessionId) {
  const { [SESSION_KEY]: sessions = [] } = await chrome.storage.local.get(SESSION_KEY);
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Create tabs in current window
  for (const tab of session.tabs) {
    await chrome.tabs.create({
      url: tab.url,
      pinned: tab.pinned,
      active: false
    });
  }
}

async function deleteSession(sessionId) {
  const { [SESSION_KEY]: sessions = [] } = await chrome.storage.local.get(SESSION_KEY);
  const filtered = sessions.filter(s => s.id !== sessionId);
  await chrome.storage.local.set({ [SESSION_KEY]: filtered });
}

async function getSessions() {
  const { [SESSION_KEY]: sessions = [] } = await chrome.storage.local.get(SESSION_KEY);
  return sessions;
}
```

### Auto-Save Sessions

Implement automatic session saving on browser startup and periodic intervals:

```javascript
// In background.js
chrome.runtime.onInstalled.addListener(() => {
  // Set up periodic auto-save
  chrome.alarms.create('autoSaveSession', { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoSaveSession') {
    await saveSession('Auto-saved');
  }
});

// Save on browser close
chrome.windows.onRemoved.addListener(async (windowId) => {
  const tabs = await chrome.tabs.query({ windowId: windowId });
  if (tabs.length > 0) {
    await saveSession('Window closed');
  }
});
```

The storage API is essential for persisting user data. For comprehensive storage patterns, see our [storage API documentation](/chrome-extension-guide/docs/api-reference/storage-api-deep-dive/).

---

## Publishing to Chrome Web Store {#publishing}

Once your extension is complete, publishing it makes it available to millions of Chrome users.

### Preparing for Submission

Before submitting, ensure you have:

1. **Verified icons**: 16x16, 48x48, and 128x128 PNG icons
2. **Screenshots**: 1280x800 or 640x400 pixel images showing your extension
3. **Privacy policy**: Required if your extension accesses user data
4. **Updated manifest**: Remove debug flags and ensure version is correct

### The Submission Process

1. **Package your extension**: Use the "Pack extension" feature in Chrome or create a ZIP file
2. **Create developer account**: Sign up at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. **Upload your package**: Submit the ZIP file with your extension
4. **Fill store listing**: Add description, screenshots, and category
5. **Submit for review**: Google typically reviews within 1-3 business days

For a complete walkthrough, see our [publishing guide](/chrome-extension-guide/docs/publishing/publishing-guide/).

### Store Listing Optimization

Your store listing determines whether users install your extension. Optimize for:

- **Clear screenshots**: Show your key features in action
- **Compelling description**: Focus on benefits, not just features
- **Category selection**: Choose the most relevant category
- **Review responses**: Engage with user reviews professionally

---

## Monetization Options {#monetization}

Building a successful tab manager can become a sustainable business. Here are proven monetization strategies.

### Freemium Model

Offer basic features free while reserving advanced features for paying users:

- **Free**: Basic tab listing, search, simple grouping
- **Premium**: Unlimited session saving, auto-suspend, custom shortcuts, priority support

### Subscription Pricing

Common pricing tiers for tab managers:

- **Monthly**: $2.99/month
- **Annual**: $19.99/year (save 45%)
- **Lifetime**: $49.99 (one-time)

### Extension-Specific Opportunities

Tab managers have unique monetization angles:

- **Enterprise features**: Team tab sharing, admin controls
- **Cloud sync**: Cross-device session sync as a premium feature
- **Advanced analytics**: Tab usage patterns and productivity insights

For detailed monetization strategies including Stripe integration, paywall patterns, and case studies from successful extensions, see the [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/).

---

## Conclusion {#conclusion}

You have built a complete tab manager extension with powerful features including tab grouping, search, suspend/restore, keyboard shortcuts, and session management. This project demonstrates the core concepts of Chrome extension development and provides a foundation for additional features.

From here, consider adding:

- Side panel UI for persistent tab management
- Tab history and undo functionality
- Drag-and-drop tab reordering
- Import/export session data
- Dark mode and theme customization

The Chrome extension ecosystem offers tremendous opportunities for developers who solve real user problems. Tab management remains a high-demand category, and extensions that deliver excellent user experiences can achieve significant user bases and revenue.

---

## Next Steps {#next-steps}

Ready to take your tab manager further? Here are recommended resources:

1. **Explore more APIs**: Learn about the [Sessions API](/chrome-extension-guide/docs/api-reference/sessions-api/) for advanced session handling
2. **Add side panel**: Convert your popup to a [Side Panel](/chrome-extension-guide/docs/api-reference/side-panel-api/) for always-accessible tab management
3. **Optimize performance**: Follow our [performance optimization guide](/chrome-extension-guide/2025/01/16/chrome-extension-performance-optimization-guide/)
4. **Secure your extension**: Implement [security best practices](/chrome-extension-guide/2025/01/16/chrome-extension-security-best-practices-2025/)
5. **Study successful extensions**: Analyze how [Tab Suspender Pro](https://chromewebstore.google.com/detail/tab-suspender-pro/dedhmikogfenolhffljmpgcfcgbgelkm) implements memory optimization in our [deep dive guide](/chrome-extension-guide/docs/tab-suspender-pro-memory-guide/)

---

*This guide is part of the [Chrome Extension Guide](https://theluckystrike.github.io/chrome-extension-guide/) by theluckystrike — your comprehensive resource for Chrome extension development. Built by theluckystrike at zovo.one*
