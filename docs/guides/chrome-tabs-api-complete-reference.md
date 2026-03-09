---
layout: default
title: "Chrome Tabs API Complete Guide: Query, Group, Move, and Manage Tabs"
description: "Master the Chrome Tabs API with this complete reference. Learn chrome.tabs.query patterns, tab groups API, lifecycle events, moving/pinning/discarding, tab capture, cross-window management, and real code examples for building powerful tab manager extensions."
permalink: /guides/chrome-tabs-api-complete-reference/
---

# Chrome Tabs API Complete Guide: Query, Group, Move, and Manage Tabs

The Chrome Tabs API is the cornerstone of any tab management extension. Whether you're building a simple tab saver or a sophisticated tab manager with grouping, suspension, and cross-window synchronization, this complete reference will guide you through every method, event, and pattern you need to know.

This guide covers the full spectrum of tab management capabilities—from basic querying to advanced features like tab groups, discarding, capture, and cross-window operations. Each section includes production-ready code examples that you can adapt directly for your extension.

## Table of Contents

1. [Understanding Tab Objects](#understanding-tab-objects)
2. [chrome.tabs.query Patterns](#chrometabsquery-patterns)
3. [Tab Group Management API](#tab-group-management-api)
4. [Tab Lifecycle Events](#tab-lifecycle-events)
5. [Moving, Pinning, and Discarding Tabs](#moving-pinning-and-discarding-tabs)
6. [Tab Capture API](#tab-capture-api)
7. [Cross-Window Management](#cross-window-management)
8. [Building a Complete Tab Manager Extension](#building-a-complete-tab-manager-extension)
9. [Performance Considerations](#performance-considerations)

---

## Understanding Tab Objects

Before diving into the API methods, it's essential to understand the structure of a tab object. Every tab in Chrome is represented by a comprehensive object containing dozens of properties:

```javascript
{
  id: 42,                           // Unique tab identifier (persists until tab closes)
  windowId: 1,                      // ID of the parent window
  url: "https://example.com/page", // Full URL of the page
  title: "Example Page",            // Document title
  favIconUrl: "https://example.com/favicon.ico",
  status: "complete",               // "loading" or "complete"
  active: true,                     // Whether tab is selected in its window
  pinned: false,                    // Whether tab is pinned
  audible: false,                   // Whether tab is playing audio
  mutedInfo: { muted: true, reason: "user" },
  incognito: false,                 // Whether tab is in incognito window
  groupId: 15,                      // Tab group ID (-1 if ungrouped)
  index: 3,                         // Position in the tab strip (0-based)
  openerTabId: 5,                   // ID of tab that opened this one
  width: 1440,                      // Width of tab content area
  height: 900,                      // Height of tab content area
  sessionId: "session123"           // Used for session restore
}
```

**Key Property Notes:**

- Tab IDs are unique within a browser session but are not persistent across restarts
- The `groupId` property links tabs to their tab group (available in Chrome 88+)
- `openerTabId` is useful for building workflows that track tab relationships
- The `mutedInfo` object tells you why a tab is muted and by whom (user or extension)

---

## chrome.tabs.query Patterns

The `chrome.tabs.query()` method is your primary tool for finding tabs. It accepts a `QueryInfo` object and returns an array of matching tabs. Mastering query patterns is essential for building efficient tab managers.

### Basic Query Patterns

```javascript
// Get all tabs in the current window
const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });

// Get the active tab in the current window
const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

// Get all pinned tabs across all windows
const pinnedTabs = await chrome.tabs.query({ pinned: true });

// Get all tabs playing audio
const audibleTabs = await chrome.tabs.query({ audible: true });
```

### Advanced Filtering by URL Patterns

```javascript
// Get tabs matching a URL pattern (requires host permissions)
const exampleTabs = await chrome.tabs.query({ 
  url: 'https://*.example.com/*' 
});

// Get tabs with specific title patterns
const githubTabs = await chrome.tabs.query({ 
  title: '*GitHub*' 
});

// Get tabs that are currently loading
const loadingTabs = await chrome.tabs.query({ 
  status: 'loading' 
});
```

### Building a Duplicate Tab Finder

One of the most useful tab manager features is finding duplicate tabs:

```javascript
async function findDuplicateTabs() {
  const allTabs = await chrome.tabs.query({});
  
  // Group tabs by URL (normalized)
  const urlMap = new Map();
  
  for (const tab of allTabs) {
    if (!tab.url || tab.url.startsWith('chrome://')) continue;
    
    const normalizedUrl = new URL(tab.url).href;
    
    if (!urlMap.has(normalizedUrl)) {
      urlMap.set(normalizedUrl, []);
    }
    urlMap.get(normalizedUrl).push(tab);
  }
  
  // Return URLs with multiple tabs
  const duplicates = [];
  for (const [url, tabs] of urlMap) {
    if (tabs.length > 1) {
      duplicates.push({ url, tabs });
    }
  }
  
  return duplicates;
}

// Usage: Close duplicate tabs, keeping the oldest
async function closeDuplicateTabs(keepNewest = false) {
  const duplicates = await findDuplicateTabs();
  
  for (const { url, tabs } of duplicates) {
    const sorted = tabs.sort((a, b) => a.id - b.id);
    const toClose = keepNewest ? sorted.slice(0, -1) : sorted.slice(1);
    
    for (const tab of toClose) {
      await chrome.tabs.remove(tab.id);
    }
  }
}
```

### Querying by Window Type

```javascript
// Get all tabs in regular (non-incognito) windows
const regularTabs = await chrome.tabs.query({ 
  windowType: 'normal' 
});

// Get all tabs in incognito windows
const incognitoTabs = await chrome.tabs.query({ 
  windowType: 'incognito' 
});

// Note: You can only access incognito tabs if your extension
// is enabled in incognito mode in manifest.json
```

---

## Tab Group Management API

Tab groups (introduced in Chrome 88) allow users to organize their tabs into colored, named groups. The Chrome Tabs API provides full support for creating, modifying, and querying tab groups.

### Creating and Managing Tab Groups

```javascript
// Create a new tab group from existing tabs
async function createTabGroup(tabIds, title, color = 'grey') {
  const groupId = await chrome.tabs.group({ 
    tabIds: tabIds 
  });
  
  await chrome.tabGroups.update(groupId, {
    title: title,
    color: color  // 'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'orange'
  });
  
  return groupId;
}

// Example: Group all GitHub tabs together
async function groupGitHubTabs() {
  const githubTabs = await chrome.tabs.query({
    url: '*://github.com/*'
  });
  
  if (githubTabs.length > 0) {
    const groupId = await createTabGroup(
      githubTabs.map(t => t.id),
      'GitHub',
      'blue'
    );
    console.log('Created GitHub group:', groupId);
  }
}
```

### Querying and Modifying Tab Groups

```javascript
// Get all tab groups in a window
async function getTabGroups(windowId) {
  const groups = await chrome.tabGroups.query({ windowId });
  return groups;
}

// Update a tab group's properties
async function updateTabGroup(groupId, updates) {
  await chrome.tabGroups.update(groupId, updates);
}

// Example: Rename and recolor a group
async function reorganizeGroup(groupId) {
  await chrome.tabGroups.update(groupId, {
    title: 'Projects',
    color: 'purple'
  });
}

// Ungroup tabs (remove from group but keep open)
async function ungroupTabs(tabIds) {
  await chrome.tabs.ungroup(tabIds);
}

// Move a tab group to a specific position
async function moveTabGroup(groupId, windowId, index) {
  await chrome.tabGroups.move(groupId, { windowId, index });
}
```

### Tab Group Events

```javascript
// Listen for group creation
chrome.tabGroups.onCreated.addListener((group) => {
  console.log('Tab group created:', group.title, group.color);
});

// Listen for group updates
chrome.tabGroups.onUpdated.addListener((group, changes) => {
  console.log('Tab group updated:', changes);
});

// Listen for group removal
chrome.tabGroups.onRemoved.addListener((group) => {
  console.log('Tab group removed:', group.title);
});
```

---

## Tab Lifecycle Events

Understanding tab lifecycle events is crucial for building reactive extensions that respond to user actions in real-time.

### Monitoring Tab Creation

```javascript
chrome.tabs.onCreated.addListener((tab) => {
  console.log('New tab created:', {
    id: tab.id,
    url: tab.url,
    windowId: tab.windowId,
    active: tab.active
  });
  
  // Auto-pin new tabs from specific domains
  if (tab.url?.includes('github.com')) {
    chrome.tabs.update(tab.id, { pinned: true });
  }
});
```

### Tracking Tab Updates

The `onUpdated` event fires whenever a tab's properties change—URL, title, favicon, loading status, pinned state, or mute state:

```javascript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Track page load completion
  if (changeInfo.status === 'complete') {
    console.log('Page loaded:', tab.url);
    
    // Extract and store metadata
    const metadata = {
      url: tab.url,
      title: tab.title,
      favicon: tab.favIconUrl,
      loadedAt: Date.now()
    };
    // Store in extension storage...
  }
  
  // Detect URL changes (SPA navigation, redirects)
  if (changeInfo.url) {
    console.log('URL changed to:', changeInfo.url);
  }
  
  // Track pinned state changes
  if (changeInfo.pinned !== undefined) {
    console.log('Tab pinned:', changeInfo.pinned);
  }
  
  // Detect audio state changes
  if (changeInfo.audible !== undefined) {
    console.log('Tab audible:', changeInfo.audible);
  }
});
```

### Handling Tab Removal

```javascript
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('Tab removed:', tabId);
  console.log('Was in window:', removeInfo.windowId);
  console.log('Window closing:', removeInfo.isWindowClosing);
  
  // Clean up any stored data for this tab
  // updateBadgeCount(); etc.
});
```

### Tab Activation Events

```javascript
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Activated tab:', activeInfo.tabId);
  console.log('Window:', activeInfo.windowId);
  
  // Update extension state to reflect current tab
  updatePopupForTab(activeInfo.tabId);
});

// Note: onActivated fires for tab switches within a window
// Use chrome.windows.onFocusChanged for cross-window tracking
```

### Window Events

```javascript
// Window created
chrome.windows.onCreated.addListener((window) => {
  console.log('Window created:', window.id, window.type);
});

// Window removed
chrome.windows.onRemoved.addListener((windowId) => {
  console.log('Window removed:', windowId);
});

// Focus changed (including between windows)
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    console.log('Focus changed to window:', windowId);
  }
});
```

---

## Moving, Pinning, and Discarding Tabs

These operations form the core functionality of any tab manager extension.

### Moving Tabs

```javascript
// Move a tab to a specific position in the same window
async function moveTab(tabId, index) {
  await chrome.tabs.move(tabId, { index });
}

// Move a tab to a different window
async function moveTabToWindow(tabId, targetWindowId) {
  await chrome.tabs.move(tabId, { 
    windowId: targetWindowId,
    index: -1  // -1 means move to end
  });
}

// Reorder tabs (drag and drop simulation)
async function reorderTabs(tabIds, windowId) {
  for (let i = 0; i < tabIds.length; i++) {
    await chrome.tabs.move(tabIds[i], { 
      windowId: windowId,
      index: i 
    });
  }
}

// Example: Move all tabs from one window to another
async function migrateTabs(sourceWindowId, targetWindowId) {
  const tabs = await chrome.tabs.query({ windowId: sourceWindowId });
  const tabIds = tabs.map(t => t.id);
  
  await chrome.tabs.move(tabIds, {
    windowId: targetWindowId,
    index: -1
  });
}
```

### Pinning Tabs

Pinned tabs stay at the left edge of the tab strip and can't be easily closed:

```javascript
// Pin a tab
async function pinTab(tabId) {
  await chrome.tabs.update(tabId, { pinned: true });
}

// Unpin a tab
async function unpinTab(tabId) {
  await chrome.tabs.update(tabId, { pinned: false });
}

// Example: Pin all tabs from a domain
async function pinDomainTabs(domain) {
  const tabs = await chrome.tabs.query({ 
    url: `*://${domain}/*` 
  });
  
  for (const tab of tabs) {
    if (!tab.pinned) {
      await chrome.tabs.update(tab.id, { pinned: true });
    }
  }
}

// Get all pinned tabs
async function getPinnedTabs() {
  return await chrome.tabs.query({ pinned: true });
}
```

### Discarding Tabs

Discarding unloads a tab's content from memory while keeping it in the tab strip. This is crucial for memory management in extensions like Tab Suspender Pro:

```javascript
// Discard a specific tab (unloads from memory)
async function discardTab(tabId) {
  try {
    await chrome.tabs.discard(tabId);
    console.log('Tab discarded:', tabId);
  } catch (error) {
    console.error('Failed to discard tab:', error);
  }
}

// Discard multiple tabs
async function discardTabs(tabIds) {
  for (const tabId of tabIds) {
    try {
      await chrome.tabs.discard(tabId);
    } catch (error) {
      console.error(`Failed to discard tab ${tabId}:`, error);
    }
  }
}

// Check if a tab is discarded
async function isTabDiscarded(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return tab.discarded;
}

// Auto-discard inactive tabs
async function autoDiscardInactive(maxAgeMs = 5 * 60 * 1000) {
  const tabs = await chrome.tabs.query({ 
    active: false, 
    pinned: false 
  });
  
  const now = Date.now();
  
  for (const tab of tabs) {
    // Skip tabs that are already discarded
    if (tab.discarded) continue;
    
    // Skip tabs with active media (audio/video)
    if (tab.audible || tab.mutedInfo?.muted === false) continue;
    
    // In production, you'd track last active time in storage
    // For now, discard non-pinned inactive tabs
    await chrome.tabs.discard(tab.id).catch(() => {});
  }
}

// Restore a discarded tab (reload it)
async function restoreTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.discarded) {
    await chrome.tabs.reload(tabId);
  }
}
```

---

## Tab Capture API

The Tab Capture API allows you to capture the visual content of a tab as a media stream. This is essential for building tab sharing, screenshot, or screencast extensions.

### Basic Tab Capture

```javascript
// Capture a tab as a video stream
async function captureTab(tabId) {
  const stream = await chrome.tabCapture.capture({
    tabId: tabId,
    videoConstraints: {
      mandatory: {
        minWidth: 1280,
        maxWidth: 1920,
        minHeight: 720,
        maxHeight: 1080,
        minFrameRate: 30,
        maxFrameRate: 60
      }
    }
  });
  
  return stream;
}

// Capture at specific resolution
async function captureTabScreenshot(tabId) {
  // Get stream first
  const stream = await chrome.tabCapture.capture({
    tabId: tabId,
    audio: false,
    videoConstraints: {
      mandatory: {
        minWidth: 1920,
        maxWidth: 1920,
        minHeight: 1080,
        maxHeight: 1080
      }
    }
  });
  
  // For screenshots, you'd use canvas to capture a frame
  // This requires a content script or offscreen document
  return stream;
}
```

### Capture Events

```javascript
// Listen for capture status changes
chrome.tabCapture.onStatusChanged.addListener((info) => {
  console.log('Capture status:', {
    tabId: info.tabId,
    status: info.status  // 'started' or 'stopped'
  });
});
```

### Use Cases for Tab Capture

1. **Screenshots**: Capture visible area or full page
2. **Tab Sharing**: WebRTC screen sharing integration
3. **Tab Mirroring**: Display tab content in sidebars
4. **Video Recording**: Record tab activity

---

## Cross-Window Management

Modern workflows often span multiple windows. The Chrome Tabs API provides comprehensive support for managing tabs across windows.

### Window Operations

```javascript
// Create a new window with tabs
async function createWindow(urls, incognito = false) {
  const window = await chrome.windows.create({
    url: urls,
    incognito: incognito,
    type: 'normal',
    focused: true,
    left: 100,
    top: 100,
    width: 1200,
    height: 800
  });
  
  return window;
}

// Move tabs between windows
async function moveToNewWindow(tabIds) {
  const window = await chrome.windows.create();
  await chrome.tabs.move(tabIds, {
    windowId: window.id,
    index: -1
  });
  
  return window;
}

// Get all windows with their tabs
async function getAllWindows() {
  const windows = await chrome.windows.getAll({ 
    populate: true,
    windowTypes: ['normal']
  });
  
  return windows.map(w => ({
    id: w.id,
    focused: w.focused,
    tabs: w.tabs.map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      active: t.active
    }))
  }));
}

// Find a tab across all windows
async function findTabByUrl(url) {
  const allTabs = await chrome.tabs.query({});
  return allTabs.find(tab => tab.url === url);
}

// Example: Move tab to the window with most similar tabs
async function smartMoveTab(tabId) {
  const sourceTab = await chrome.tabs.get(tabId);
  const sourceDomain = new URL(sourceTab.url).hostname;
  
  const windows = await chrome.windows.getAll({ populate: true });
  
  let bestWindow = null;
  let maxMatches = 0;
  
  for (const window of windows) {
    if (window.id === sourceTab.windowId) continue;
    
    const matches = window.tabs.filter(t => 
      t.url && new URL(t.url).hostname.includes(sourceDomain)
    ).length;
    
    if (matches > maxMatches) {
      maxMatches = matches;
      bestWindow = window;
    }
  }
  
  if (bestWindow) {
    await chrome.tabs.move(tabId, {
      windowId: bestWindow.id,
      index: -1
    });
  }
}
```

---

## Building a Complete Tab Manager Extension

Here's a comprehensive example that brings together all the concepts above into a production-ready tab manager:

```javascript
// background.js - Complete Tab Manager Implementation

class TabManager {
  constructor() {
    this.init();
  }
  
  async init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize badge
    await this.updateBadge();
  }
  
  setupEventListeners() {
    // Tab events
    chrome.tabs.onCreated.addListener(tab => this.onTabCreated(tab));
    chrome.tabs.onRemoved.addListener((tabId, info) => this.onTabRemoved(tabId, info));
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => 
      this.onTabUpdated(tabId, changeInfo, tab));
    chrome.tabs.onActivated.addListener(info => this.onTabActivated(info));
    
    // Tab group events
    chrome.tabGroups.onCreated.addListener(group => this.onGroupCreated(group));
    chrome.tabGroups.onUpdated.addListener((group, changes) => 
      this.onGroupUpdated(group, changes));
    chrome.tabGroups.onRemoved.addListener(group => this.onGroupRemoved(group));
    
    // Window events
    chrome.windows.onRemoved.addListener(windowId => 
      this.onWindowRemoved(windowId));
  }
  
  // Event handlers
  async onTabCreated(tab) {
    console.log('Tab created:', tab.id, tab.url);
    await this.updateBadge();
    
    // Auto-group new tabs from known domains
    await this.maybeAutoGroup(tab);
  }
  
  onTabRemoved(tabId, info) {
    console.log('Tab removed:', tabId);
    this.updateBadge();
  }
  
  onTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      console.log('Tab loaded:', tab.url);
    }
  }
  
  onTabActivated(info) {
    console.log('Tab activated:', info.tabId);
    this.updateLastActive(info.tabId);
  }
  
  onGroupCreated(group) {
    console.log('Group created:', group.title);
  }
  
  onGroupUpdated(group, changes) {
    console.log('Group updated:', changes);
  }
  
  onGroupRemoved(group) {
    console.log('Group removed:', group.title);
  }
  
  onWindowRemoved(windowId) {
    console.log('Window removed:', windowId);
  }
  
  // Core functionality
  async getAllTabs() {
    return await chrome.tabs.query({});
  }
  
  async getWindowTabs(windowId) {
    return await chrome.tabs.query({ windowId });
  }
  
  async getActiveTab() {
    const [tab] = await chrome.tabs.query({ 
      active: true, 
      currentWindow: true 
    });
    return tab;
  }
  
  async closeTab(tabId) {
    await chrome.tabs.remove(tabId);
  }
  
  async closeDuplicateTabs() {
    const tabs = await this.getAllTabs();
    const urlMap = new Map();
    
    // Normalize and group by URL
    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith('chrome://')) continue;
      
      try {
        const url = new URL(tab.url).href;
        if (!urlMap.has(url)) urlMap.set(url, []);
        urlMap.get(url).push(tab);
      } catch (e) {
        // Invalid URL, skip
      }
    }
    
    // Close duplicates (keep oldest)
    let closed = 0;
    for (const [url, tabList] of urlMap) {
      if (tabList.length > 1) {
        const sorted = tabList.sort((a, b) => a.id - b.id);
        const toClose = sorted.slice(1);
        
        for (const tab of toClose) {
          await this.closeTab(tab.id);
          closed++;
        }
      }
    }
    
    return closed;
  }
  
  async groupTabsByDomain() {
    const tabs = await this.getAllTabs();
    const domainGroups = new Map();
    
    for (const tab of tabs) {
      if (!tab.url || tab.groupId !== -1) continue;
      
      try {
        const domain = new URL(tab.url).hostname.replace('www.', '');
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain).push(tab.id);
      } catch (e) {
        // Skip invalid URLs
      }
    }
    
    // Create groups for domains with 2+ tabs
    const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'orange'];
    let colorIndex = 0;
    
    for (const [domain, tabIds] of domainGroups) {
      if (tabIds.length >= 2) {
        const groupId = await chrome.tabs.group({ tabIds });
        await chrome.tabGroups.update(groupId, {
          title: domain,
          color: colors[colorIndex % colors.length]
        });
        colorIndex++;
      }
    }
  }
  
  async discardInactiveTabs(maxAgeMs = 300000) {
    const tabs = await this.getAllTabs();
    const now = Date.now();
    
    for (const tab of tabs) {
      // Skip active, pinned, audible, or already discarded tabs
      if (tab.active || tab.pinned || tab.audible || tab.discarded) {
        continue;
      }
      
      try {
        await chrome.tabs.discard(tab.id);
      } catch (e) {
        // Some tabs can't be discarded
      }
    }
  }
  
  async createWorkspace(name, tabIds) {
    const window = await chrome.windows.create({
      url: 'workspace.html',
      type: 'normal',
      focused: true
    });
    
    // Move tabs to new window
    await chrome.tabs.move(tabIds, {
      windowId: window.id,
      index: -1
    });
    
    // Store workspace metadata
    await chrome.storage.local.set({
      [`workspace_${window.id}`]: {
        name,
        tabIds,
        createdAt: Date.now()
      }
    });
    
    return window;
  }
  
  async updateBadge() {
    const tabs = await this.getAllTabs();
    const count = tabs.length;
    
    await chrome.action.setBadgeText({
      text: count > 0 ? String(count) : ''
    });
    
    await chrome.action.setBadgeBackgroundColor({
      color: '#4CAF50'
    });
  }
  
  async updateLastActive(tabId) {
    await chrome.storage.local.set({
      lastActiveTab: { id: tabId, timestamp: Date.now() }
    });
  }
  
  async maybeAutoGroup(tab) {
    const domain = new URL(tab.url).hostname;
    const autoGroupDomains = ['github.com', 'gitlab.com', 'stackoverflow.com'];
    
    if (autoGroupDomains.includes(domain)) {
      // Find or create group for this domain
      const groups = await chrome.tabGroups.query({});
      const existingGroup = groups.find(g => 
        g.title.toLowerCase().includes(domain.replace('www.', ''))
      );
      
      if (existingGroup) {
        await chrome.tabs.group({
          tabIds: [tab.id],
          groupId: existingGroup.id
        });
      }
    }
  }
}

// Initialize the tab manager
const tabManager = new TabManager();

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getTabs':
      tabManager.getAllTabs().then(sendResponse);
      return true;
      
    case 'closeDuplicates':
      tabManager.closeDuplicateTabs().then(count => 
        sendResponse({ closed: count })
      );
      return true;
      
    case 'groupByDomain':
      tabManager.groupTabsByDomain().then(() => 
        sendResponse({ success: true })
      );
      return true;
      
    case 'discardInactive':
      tabManager.discardInactiveTabs().then(() => 
        sendResponse({ success: true })
      );
      return true;
  }
});
```

---

## Performance Considerations

When building tab management extensions, performance is critical. Here are key considerations:

### Optimizing Query Performance

```javascript
// BAD: Multiple sequential queries
const tabs1 = await chrome.tabs.query({ windowType: 'normal' });
const tabs2 = await chrome.tabs.query({ pinned: true });

// GOOD: Single query with filtering
const allTabs = await chrome.tabs.query({});
const normalTabs = allTabs.filter(t => !t.incognito);
const pinnedTabs = allTabs.filter(t => t.pinned);
```

### Using Batch Operations

```javascript
// BAD: Individual moves
for (const tabId of tabIds) {
  await chrome.tabs.move(tabId, { index: i++ });
}

// GOOD: Batch move (note: still sequential but cleaner)
await chrome.tabs.move(tabIds, { index: 0 });
```

### Debouncing Events

```javascript
// Avoid processing every single update
let updateTimeout;
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    // Process the update
    processTabUpdate(tabId, changeInfo, tab);
  }, 100);  // Wait 100ms for rapid changes to settle
});
```

### Memory Management

- Don't store large numbers of tab objects in memory
- Use `chrome.storage` for persistent data
- Release references to closed tabs
- Use `WeakMap` for tab-to-data mappings when appropriate

---

## Related Articles

This guide is part of our comprehensive Chrome Extension development series. For more on tab management, see:

- [Automatic Tab Suspension Guide](/guides/automatic-tab-suspension-guide/) - Learn how to implement intelligent tab suspension to reduce memory usage
- [Tab Management Guide](/guides/tab-management/) - Patterns and best practices for building tab management extensions
- [Tab Groups API](/guides/tab-groups/) - Deep dive into Chrome's tab grouping functionality

---

*Part of the [Chrome Extension Guide](https://theluckystrike.github.io/chrome-extension-guide/) by theluckystrike. Professional extension development at [zovo.one](https://zovo.one).*
---

## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.