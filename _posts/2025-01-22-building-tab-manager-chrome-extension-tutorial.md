---
layout: default
title: "Building a Tab Manager Chrome Extension — Step-by-Step Tutorial (2025)"
description: "Learn to build a full-featured tab manager Chrome extension. Covers tab grouping, search, suspend/restore, keyboard shortcuts, and Chrome Web Store publishing."
date: 2025-01-22
categories: [tutorials]
tags: [tab-manager, chrome-extension-tutorial, tab-groups, chrome-tabs-api, browser-extension]
author: theluckystrike
---

# Building a Tab Manager Chrome Extension from Scratch

Tab management is one of the most requested features in Chrome extensions. With users often juggling dozens of tabs across multiple windows, a well-designed tab manager can dramatically improve productivity and reduce browser memory usage. In this comprehensive tutorial, we'll build a full-featured tab manager extension from scratch using Manifest V3, covering everything from basic tab querying to advanced features like tab grouping, search, suspend/restore functionality, and publishing to the Chrome Web Store.

This tutorial assumes you have basic familiarity with JavaScript and the Chrome browser. By the end, you'll have a complete, production-ready tab manager extension that you can customize and publish.

---

## Project Setup with Manifest V3

Every Chrome extension starts with a `manifest.json` file. For our tab manager, we'll use Manifest V3, which is the current standard and offers improved security and performance over the deprecated Manifest V2.

Create a new directory for your extension and add the following `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "TabMaster Pro",
  "version": "1.0.0",
  "description": "A powerful tab manager with grouping, search, and suspend features",
  "permissions": [
    "tabs",
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
  "commands": {
    "toggle-tab-manager": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "mac": "Command+Shift+T"
      },
      "description": "Toggle tab manager popup"
    },
    "suspend-active-tab": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Suspend the active tab"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

For more details on permissions and which ones your extension needs, check out our [Chrome Extension Permissions Deep Dive](/docs/guides/permissions-deep-dive/) guide.

### Understanding the Manifest Structure

The manifest defines your extension's capabilities and requirements. Here's what each key section means for our tab manager:

- **permissions**: We need `"tabs"` for tab querying and manipulation, `"storage"` for saving sessions, and `"commands"` for keyboard shortcuts.
- **action**: Defines the extension's popup that appears when clicking the toolbar icon.
- **commands**: Registers global keyboard shortcuts that work even when the popup isn't open.

Create placeholder icon files or use any PNG images for testing. You'll need at least the three icon sizes specified.

---

## Chrome Tabs API Deep Dive

The `chrome.tabs` API is the foundation of our tab manager. This powerful API provides methods for querying, creating, updating, and organizing tabs. Let's explore the key methods we'll use throughout this tutorial.

### Querying Tabs

The `chrome.tabs.query()` method is your primary tool for retrieving tabs. It accepts a query object and returns an array of matching tabs:

```javascript
// Get all tabs in the current window
chrome.tabs.query({ currentWindow: true }, (tabs) => {
  console.log(`Found ${tabs.length} tabs`);
  tabs.forEach(tab => {
    console.log(`${tab.title}: ${tab.url}`);
  });
});

// Get all pinned tabs
chrome.tabs.query({ pinned: true }, (pinnedTabs) => {
  console.log(`Found ${pinnedTabs.length} pinned tabs`);
});

// Get audible tabs
chrome.tabs.query({ audible: true }, (audibleTabs) => {
  console.log(`Found ${audibleTabs.length} audible tabs`);
});
```

### Tab Properties

Each tab object contains valuable properties you can access:

- **id**: Unique tab identifier
- **title**: Page title
- **url**: Full URL of the page
- **faviconUrl**: URL of the page favicon
- **groupId**: ID of the tab's group (if using Tab Groups)
- **incognito**: Whether the tab is in incognito mode
- **pinned**: Whether the tab is pinned
- **audible**: Whether the tab is playing audio
- **mutedInfo**: Whether the tab is muted
- **windowId**: Parent window ID
- **active**: Whether the tab is active in its window
- **index**: Position within the window

For a complete reference of all available properties and methods, see our [Chrome Tabs API Reference](/docs/api-reference/tabs-api/).

### Creating and Updating Tabs

```javascript
// Create a new tab
chrome.tabs.create({ 
  url: 'https://example.com',
  active: true,
  pinned: false
}, (newTab) => {
  console.log('Created tab:', newTab.id);
});

// Update a tab (e.g., pin it)
chrome.tabs.update(tabId, { pinned: true });

// Move a tab to a different window
chrome.tabs.move(tabId, { windowId: newWindowId, index: -1 });
```

---

## Tab Querying and Filtering

A good tab manager needs powerful filtering capabilities. Users should be able to quickly find tabs by title, URL, or other criteria. Let's build a comprehensive search function:

```javascript
class TabSearch {
  constructor() {
    this.cache = [];
    this.lastUpdate = 0;
  }

  async refreshCache() {
    const tabs = await chrome.tabs.query({});
    this.cache = tabs;
    this.lastUpdate = Date.now();
  }

  search(query) {
    const lowerQuery = query.toLowerCase();
    
    return this.cache.filter(tab => {
      const title = tab.title?.toLowerCase() || '';
      const url = tab.url?.toLowerCase() || '';
      return title.includes(lowerQuery) || url.includes(lowerQuery);
    });
  }

  filterByDomain(domain) {
    return this.cache.filter(tab => 
      tab.url?.includes(domain)
    );
  }

  filterByStatus(status) {
    return this.cache.filter(tab => tab.status === status);
  }
}

// Usage
const search = new TabSearch();
await search.refreshCache();
const results = search.search('github');
console.log(`Found ${results.length} matching tabs`);
```

### Advanced Filtering Patterns

You can combine multiple filters for complex queries:

```javascript
async function advancedQuery(filters) {
  let tabs = await chrome.tabs.query({});
  
  if (filters.domain) {
    tabs = tabs.filter(t => t.url?.includes(filters.domain));
  }
  if (filters.pinned !== undefined) {
    tabs = tabs.filter(t => t.pinned === filters.pinned);
  }
  if (filters.audible !== undefined) {
    tabs = tabs.filter(t => t.audible === filters.audible);
  }
  if (filters.groupId !== undefined) {
    tabs = tabs.filter(t => t.groupId === filters.groupId);
  }
  
  return tabs;
}
```

---

## Tab Groups API

Chrome's Tab Groups API (introduced in Chrome 87) allows you to organize tabs into colored groups. Our tab manager can leverage this functionality to provide a superior user experience.

### Creating and Managing Groups

```javascript
// Create a new tab group
async function createGroup(tabIds, title, color) {
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, { 
    title: title,
    color: color // 'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'
  });
  return groupId;
}

// Add tabs to an existing group
async function addToGroup(tabIds, groupId) {
  await chrome.tabs.group({ groupId, tabIds });
}

// Ungroup tabs (remove from group but keep open)
async function ungroupTabs(tabIds) {
  for (const tabId of tabIds) {
    await chrome.tabs.ungroup(tabId);
  }
}
```

### Listing and Displaying Groups

```javascript
async function getAllGroups() {
  const tabs = await chrome.tabs.query({});
  const groups = {};
  
  tabs.forEach(tab => {
    if (tab.groupId !== -1) {
      if (!groups[tab.groupId]) {
        groups[tab.groupId] = {
          id: tab.groupId,
          tabs: []
        };
      }
      groups[tab.groupId].tabs.push(tab);
    }
  });
  
  // Get group details
  const groupInfos = await chrome.tabGroups.get(tab.groupId);
  return Object.values(groups);
}
```

### Group Color Management

```javascript
const GROUP_COLORS = [
  'grey', 'blue', 'red', 'yellow', 
  'green', 'pink', 'purple', 'cyan', 'orange'
];

function getNextColor(existingGroups) {
  const usedColors = existingGroups.map(g => g.color);
  return GROUP_COLORS.find(c => !usedColors.includes(c)) || 'grey';
}
```

---

## Suspend and Restore with chrome.tabs.discard

Tab suspension is a critical feature for users with many open tabs. It saves memory by unloading inactive tabs while keeping them visible in the tab strip. When a suspended tab is clicked, it automatically reloads.

### Discarding Tabs

```javascript
// Discard a specific tab
async function discardTab(tabId) {
  try {
    const newTab = await chrome.tabs.discard(tabId);
    console.log('Tab discarded successfully');
    return newTab;
  } catch (error) {
    console.error('Failed to discard tab:', error);
  }
}

// Discard multiple tabs (excluding active ones)
async function discardInactiveTabs() {
  const tabs = await chrome.tabs.query({ 
    active: false,
    currentWindow: true 
  });
  
  for (const tab of tabs) {
    await chrome.tabs.discard(tab.id);
  }
}

// Auto-discard based on inactivity
async function setupAutoDiscard(inactivityMinutes = 30) {
  // Check every minute for tabs to discard
  setInterval(async () => {
    const tabs = await chrome.tabs.query({ 
      active: false,
      currentWindow: true 
    });
    
    for (const tab of tabs) {
      // Check last active time (requires tracking)
      const lastActive = await getLastActiveTime(tab.id);
      const inactiveTime = Date.now() - lastActive;
      
      if (inactiveTime > inactivityMinutes * 60 * 1000) {
        await chrome.tabs.discard(tab.id);
      }
    }
  }, 60000);
}
```

### Restoring Discarded Tabs

The beauty of `chrome.tabs.discard` is that it automatically restores tabs when users click on them. However, if you need to manually restore a discarded tab:

```javascript
// Reload a discarded tab to restore its content
async function restoreTab(tabId) {
  await chrome.tabs.reload(tabId);
}

// Or simply navigate to the URL
async function restoreTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  await chrome.tabs.update(tabId, { url: tab.url });
}
```

For more on managing extension permissions for these features, see our guide on [Extension Permissions Best Practices](/docs/guides/permissions-best-practices/).

---

## Popup UI with Tab List

Now let's build the user interface. The popup will display a searchable list of all open tabs with options to manage them.

### popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 400px; font-family: system-ui, sans-serif; }
    .search-box { 
      padding: 10px; 
      border-bottom: 1px solid #ddd;
    }
    .search-box input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .tab-list { max-height: 500px; overflow-y: auto; }
    .tab-item {
      display: flex;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }
    .tab-item:hover { background: #f5f5f5; }
    .tab-item.pinned { border-left: 3px solid #4285f4; }
    .tab-favicon { width: 16px; height: 16px; margin-right: 10px; }
    .tab-info { flex: 1; overflow: hidden; }
    .tab-title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tab-url { font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tab-actions { display: flex; gap: 5px; }
    .tab-action { 
      padding: 4px 8px; 
      border: none; 
      background: #eee; 
      cursor: pointer; 
      border-radius: 3px;
    }
    .tab-action:hover { background: #ddd; }
    .group-section {
      background: #f9f9f9;
      padding: 8px;
      font-weight: 600;
      font-size: 12px;
      color: #666;
    }
    .suspended {
      opacity: 0.7;
      background: #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="search-box">
    <input type="text" id="search" placeholder="Search tabs...">
  </div>
  <div class="tab-list" id="tabList"></div>
  <script src="popup.js"></script>
</body>
</html>
```

### popup.js

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const tabList = document.getElementById('tabList');
  const searchInput = document.getElementById('search');
  let allTabs = [];

  // Load all tabs
  async function loadTabs() {
    allTabs = await chrome.tabs.query({});
    renderTabs(allTabs);
  }

  // Render tabs to the popup
  function renderTabs(tabs) {
    tabList.innerHTML = '';
    
    // Group tabs by window
    const windows = {};
    tabs.forEach(tab => {
      if (!windows[tab.windowId]) {
        windows[tab.windowId] = [];
      }
      windows[tab.windowId].push(tab);
    });

    Object.values(windows).forEach(windowTabs => {
      windowTabs.forEach((tab, index) => {
        if (index === 0) {
          const groupDiv = document.createElement('div');
          groupDiv.className = 'group-section';
          groupDiv.textContent = `Window ${tab.windowId}`;
          tabList.appendChild(groupDiv);
        }

        const tabEl = createTabElement(tab);
        tabList.appendChild(tabEl);
      });
    });
  }

  // Create tab element
  function createTabElement(tab) {
    const div = document.createElement('div');
    div.className = `tab-item${tab.pinned ? ' pinned' : ''}`;
    div.innerHTML = `
      <img class="tab-favicon" src="${tab.favIconUrl || ''}" onerror="this.style.display='none'">
      <div class="tab-info">
        <div class="tab-title">${tab.title}</div>
        <div class="tab-url">${tab.url}</div>
      </div>
      <div class="tab-actions">
        <button class="tab-action" data-action="pin" data-id="${tab.id}">
          ${tab.pinned ? '📌' : '📍'}
        </button>
        <button class="tab-action" data-action="close" data-id="${tab.id}">✕</button>
        <button class="tab-action" data-action="discard" data-id="${tab.id}">💤</button>
      </div>
    `;

    // Click on tab to activate
    div.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-action')) {
        chrome.tabs.update(tab.id, { active: true });
        window.close();
      }
    });

    // Action buttons
    div.querySelectorAll('.tab-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const tabId = parseInt(btn.dataset.id);

        switch (action) {
          case 'pin':
            await chrome.tabs.update(tabId, { pinned: !tab.pinned });
            loadTabs();
            break;
          case 'close':
            await chrome.tabs.remove(tabId);
            loadTabs();
            break;
          case 'discard':
            await chrome.tabs.discard(tabId);
            loadTabs();
            break;
        }
      });
    });

    return div;
  }

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allTabs.filter(tab => 
      (tab.title || '').toLowerCase().includes(query) ||
      (tab.url || '').toLowerCase().includes(query)
    );
    renderTabs(filtered);
  });

  // Initialize
  await loadTabs();
});
```

---

## Keyboard Shortcuts

Keyboard shortcuts make your tab manager much more powerful. We already defined some in the manifest, but let's implement the actual handling.

### Implementing Command Handlers

```javascript
// background.js
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-tab-manager':
      // Toggle the popup or side panel
      const { id, windowId } = await chrome.tabs.query({ active: true, currentWindow: true })[0];
      // Implementation depends on your UI choice
      break;
      
    case 'suspend-active-tab':
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        await chrome.tabs.discard(activeTab.id);
      }
      break;
  }
});

// Alternative: Use action default_shortcut in popup
chrome.action.onClicked.addListener(async (tab) => {
  // This fires when there's no popup defined
  console.log('Extension icon clicked');
});
```

### More Useful Shortcuts

Add these to your manifest's `commands` section:

```json
"commands": {
  "next-tab": {
    "suggested_key": { "default": "Ctrl+Tab" },
    "description": "Switch to next tab"
  },
  "previous-tab": {
    "suggested_key": { "default": "Ctrl+Shift+Tab" },
    "description": "Switch to previous tab"
  },
  "close-and-suspend": {
    "suggested_key": { "default": "Ctrl+Shift+W" },
    "description": "Close current tab and discard it"
  }
}
```

For more keyboard shortcut patterns and best practices, see our [Chrome Extension Keyboard Shortcuts Guide](/_posts/2025-01-17-chrome-extension-keyboard-shortcuts-implementation-guide/).

---

## Storage for Saved Sessions

Allow users to save and restore tab sessions for later use. This is essential for users who work on multiple projects and need to switch between sets of tabs.

### Session Storage Implementation

```javascript
// storage.js
const STORAGE_KEY = 'tabmaster_sessions';

export class SessionManager {
  async saveSession(name) {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const session = {
      name,
      created: Date.now(),
      tabs: tabs.map(tab => ({
        url: tab.url,
        title: tab.title,
        pinned: tab.pinned,
        active: tab.active
      }))
    };

    const { [STORAGE_KEY]: sessions = {} } = await chrome.storage.local.get(STORAGE_KEY);
    sessions[name] = session;
    await chrome.storage.local.set({ [STORAGE_KEY]: sessions });
    
    return session;
  }

  async loadSession(name) {
    const { [STORAGE_KEY]: sessions = {} } = await chrome.storage.local.get(STORAGE_KEY);
    const session = sessions[name];
    
    if (!session) {
      throw new Error(`Session "${name}" not found`);
    }

    // Create tabs in reverse order so the first tab ends up first
    for (const tab of session.tabs.reverse()) {
      await chrome.tabs.create({
        url: tab.url,
        pinned: tab.pinned,
        active: tab.active
      });
    }
    
    return session;
  }

  async listSessions() {
    const { [STORAGE_KEY]: sessions = {} } = await chrome.storage.local.get(STORAGE_KEY);
    return Object.entries(sessions).map(([name, session]) => ({
      name,
      created: session.created,
      tabCount: session.tabs.length
    }));
  }

  async deleteSession(name) {
    const { [STORAGE_KEY]: sessions = {} } = await chrome.storage.local.get(STORAGE_KEY);
    delete sessions[name];
    await chrome.storage.local.set({ [STORAGE_KEY]: sessions });
  }
}
```

### Enhanced Session Features

```javascript
// Auto-save sessions on browser close
chrome.runtime.onInstalled.addListener(() => {
  // Set up periodic auto-save
  setInterval(async () => {
    const sessionManager = new SessionManager();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    await sessionManager.saveSession(`Auto-save ${timestamp}`);
    
    // Keep only last 10 auto-saves
    const sessions = await sessionManager.listSessions();
    const autoSaves = sessions
      .filter(s => s.name.startsWith('Auto-save'))
      .sort((a, b) => b.created - a.created);
    
    for (const session of autoSaves.slice(10)) {
      await sessionManager.deleteSession(session.name);
    }
  }, 30 * 60 * 1000); // Every 30 minutes
});
```

For complete information on Chrome's storage API, check out our [Storage API Deep Dive](/docs/api-reference/storage-api-deep-dive/).

---

## Publishing to Chrome Web Store

Once your tab manager is complete, it's time to publish. The Chrome Web Store is the official marketplace for Chrome extensions.

### Preparation

1. **Create a Developer Account**: Visit the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) and pay the one-time $5 registration fee.

2. **Prepare Assets**:
   - At least one 1280x800 or 640x400 screenshot
   - A 440x280 promotional tile
   - A 128x128 icon
   - A privacy policy URL (required if extension handles user data)

3. **Verify Your Extension**:
   - Run `npm install -g lighthouse` or use Chrome's built-in Lighthouse
   - Test thoroughly in Developer Mode

### Publishing Process

```bash
# Package your extension (excluding unnecessary files)
zip -r tabmaster-pro.zip \
  manifest.json \
  popup.html \
  popup.js \
  background.js \
  storage.js \
  icons/ \
  -x "*.git*"
```

Upload this zip file through the Chrome Web Store Developer Dashboard. Fill in:
- Name and description
- Category (Productivity for tab managers)
- Language
- Screenshots and promotional images
- Privacy policy

### Post-Publishing Updates

When you update your extension:
1. Increment the version number in manifest.json
2. Package the new version
3. Upload to the Developer Dashboard
4. Submit for review (usually takes hours to days)

---

## Monetization Options

There are several ways to monetize your tab manager extension. The most common approaches include:

### Freemium Model
Offer a basic version free with premium features like:
- Unlimited saved sessions (free: 5)
- Advanced search filters
- Cloud sync across devices
- Custom themes

### Donation Model
Add a "Buy Me a Coffee" button or use platforms like Ko-fi.

### Affiliate Revenue
Partner with note-taking apps, task managers, or other productivity tools and earn referral commissions.

For a comprehensive guide on ethical and effective monetization, see our [Extension Monetization Guide](/docs/guides/extension-monetization/).

For inspiration, check out [Tab Suspender Pro](https://github.com/theluckystrike/tab-suspender-pro), which demonstrates a successful tab management extension with thoughtful monetization.

---

## Conclusion

Building a tab manager Chrome extension is a fantastic project that teaches you many essential Chrome extension development concepts. You've learned how to:

- Set up a Manifest V3 extension project
- Use the Chrome Tabs API for querying and manipulating tabs
- Implement tab grouping functionality
- Add tab suspension to save memory
- Create an intuitive popup UI with search
- Add keyboard shortcuts for power users
- Implement session saving and restoring
- Prepare and publish to the Chrome Web Store
- Consider monetization strategies

The complete source code for this tutorial provides a solid foundation. You can extend it further with features like:
- Side panel UI for persistent access
- Tab usage analytics
- Cloud sync using Firebase or similar
- Tab history and quick switcher (like Alfred for tabs)
- Collaboration features

Remember to test thoroughly, handle edge cases, and always prioritize user privacy. With over [permissions best practices](/docs/guides/permissions-best-practices/) in mind, you'll build extensions that users trust and love.

---

**Built by theluckystrike at [zovo.one](https://zovo.one)**
