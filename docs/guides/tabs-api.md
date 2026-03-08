# Chrome Tabs API Guide

## Overview

The Chrome Tabs API provides powerful methods to manage browser tabs—creating, updating, moving, grouping, and listening for tab events. This guide covers all essential methods with practical code examples for building tab management extensions.

**Required Permission:** `"tabs"` (or granular host permissions for specific URLs)

## Tab Properties

Every tab object contains these key properties:

```javascript
{
  id: 42,                    // Unique tab ID
  windowId: 1,               // Parent window ID
  url: "https://example.com",
  title: "Example Page",
  favIconUrl: "https://example.com/favicon.ico",
  status: "complete",       // "loading" or "complete"
  active: true,             // Selected in its window
  pinned: false,           // Pinned tab
  audible: false,          // Playing audio
  mutedInfo: { muted: false, reason: "user" },
  incognito: false,         // In private window
  groupId: -1,              // Tab group ID (-1 = none)
  index: 0,                 // Position in window
  openerTabId: 5,           // Tab that opened this one
  height: 900,              // Tab content height
  width: 1200               // Tab content width
}
```

---

## Finding & Getting Tabs

### chrome.tabs.query — Finding Tabs with Filters

Query tabs using a `QueryInfo` object to filter by various properties:

```javascript
// Get all tabs in the current window
chrome.tabs.query({ currentWindow: true }, (tabs) => {
  console.log(`Found ${tabs.length} tabs`);
  tabs.forEach(tab => console.log(tab.title, tab.url));
});

// Get the active tab in current window
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  console.log('Active tab:', tab.url);
});

// Get all pinned tabs across all windows
chrome.tabs.query({ pinned: true }, (tabs) => {
  tabs.forEach(tab => console.log('Pinned:', tab.url));
});

// Get tabs matching a URL pattern
chrome.tabs.query({ url: 'https://developer.chrome.com/*' }, (tabs) => {
  console.log('Chrome docs tabs:', tabs.length);
});

// Get tabs by status (loading vs complete)
chrome.tabs.query({ status: 'complete' }, (tabs) => { /* loaded tabs */ });

// Get audible tabs
chrome.tabs.query({ audible: true }, (tabs) => {
  tabs.forEach(tab => console.log('Playing audio:', tab.title));
});

// Get tabs in a specific window
chrome.tabs.query({ windowId: 2 }, (tabs) => { /* tabs in window 2 */ });

// Get group tabs
chrome.tabs.query({ groupId: 5 }, (tabs) => { /* tabs in group 5 */ });
```

### chrome.tabs.get — Getting a Tab by ID

```javascript
// Get a specific tab by ID
chrome.tabs.get(42, (tab) => {
  console.log('Tab URL:', tab.url);
  console.log('Tab title:', tab.title);
  console.log('Is active:', tab.active);
});

// Using async/await (MV3 supports Promise-based calls)
const tab = await chrome.tabs.get(42);
console.log(tab.url);
```

### chrome.tabs.getCurrent — Getting the Current Tab

Get the tab where the calling script is running (useful in popup or content script):

```javascript
chrome.tabs.getCurrent((tab) => {
  console.log('Current tab ID:', tab.id);
  console.log('Current tab URL:', tab.url);
});

// In content script or popup context
const currentTab = await chrome.tabs.getCurrent();
```

---

## Creating & Updating Tabs

### chrome.tabs.create — Opening New Tabs

```javascript
// Basic: open a URL in a new tab
chrome.tabs.create({ url: 'https://example.com' });

// Open in current window (default)
chrome.tabs.create({ url: 'https://example.com', currentWindow: true });

// Don't focus the new tab
chrome.tabs.create({ url: 'https://example.com', active: false });

// Open and pin the tab
chrome.tabs.create({ url: 'https://example.com', pinned: true });

// Set as opener (for window.opener reference)
chrome.tabs.create({ url: 'https://example.com', openerTabId: currentTabId });

// Open in a specific index position
chrome.tabs.create({ url: 'https://example.com', index: 0 });

// Open in a new window
chrome.tabs.create({ url: 'https://example.com', windowId: newWindowId });

// Open multiple URLs (using Promise)
const urls = ['https://google.com', 'https://github.com'];
for (const url of urls) {
  await chrome.tabs.create({ url, active: false });
}
```

### chrome.tabs.update — Modifying Tab Properties

```javascript
// Navigate a tab to a new URL
chrome.tabs.update(tabId, { url: 'https://new-url.com' });

// Activate a tab
chrome.tabs.update(tabId, { active: true });

// Focus the window containing the tab
chrome.tabs.update(tabId, { active: true }, () => {
  chrome.windows.update(tab.windowId, { focused: true });
});

// Pin or unpin a tab
chrome.tabs.update(tabId, { pinned: true });
chrome.tabs.update(tabId, { pinned: false });

// Mute or unmute a tab
chrome.tabs.update(tabId, { muted: true });
chrome.tabs.update(tabId, { muted: false });

// Set attention (highlight in tab strip)
chrome.tabs.update(tabId, { attention: true });

// Update multiple properties at once
chrome.tabs.update(tabId, {
  url: 'https://example.com',
  pinned: true,
  active: true
});
```

---

## Closing & Organizing Tabs

### chrome.tabs.remove — Closing Tabs

```javascript
// Close a single tab
chrome.tabs.remove(tabId);

// Close multiple tabs
chrome.tabs.remove([tabId1, tabId2, tabId3]);

// Close all tabs in a window
chrome.tabs.query({ windowId: windowId }, (tabs) => {
  const tabIds = tabs.map(t => t.id);
  chrome.tabs.remove(tabIds);
});
```

### chrome.tabs.move — Reordering Tabs

```javascript
// Move a tab to a new position in the same window
chrome.tabs.move(tabId, { index: 0 }); // Move to first position

// Move to end of window
chrome.tabs.move(tabId, { index: -1 });

// Move tab to a different window (creates new window if needed)
chrome.tabs.move(tabId, { windowId: targetWindowId, index: 0 });

// Move multiple tabs at once
chrome.tabs.move([tabId1, tabId2], { index: 3 });
```

### chrome.tabs.duplicate — Duplicating a Tab

```javascript
// Duplicate a tab (opens a copy at the next index)
chrome.tabs.duplicate(tabId, (newTab) => {
  console.log('Duplicated tab ID:', newTab.id);
  console.log('Original URL:', newTab.openerTabId);
});
```

---

## Navigation & Reloading

### chrome.tabs.reload — Refreshing Tabs

```javascript
// Basic reload
chrome.tabs.reload(tabId);

// Reload bypassing cache
chrome.tabs.reload(tabId, { bypassCache: true });

// Reload with flags (Chrome-specific)
chrome.tabs.reload(tabId, { bypassCache: true });
```

### chrome.tabs.goBack / goForward — Navigation History

```javascript
// Go back in history
chrome.tabs.goBack(tabId);

// Go forward in history
chrome.tabs.goForward(tabId);

// Check if navigation is possible
chrome.tabs.canGoBack(tabId, (canGoBack) => {
  if (canGoBack) chrome.tabs.goBack(tabId);
});

chrome.tabs.canGoForward(tabId, (canGoForward) => {
  if (canGoForward) chrome.tabs.goForward(tabId);
});
```

---

## Tab Groups

### chrome.tabs.group — Adding Tabs to a Group

```javascript
// Create a new group and add tabs
chrome.tabs.group({ tabIds: [tabId1, tabId2, tabId3] }, (groupId) => {
  console.log('Created group:', groupId);
});

// Add tabs to an existing group
chrome.tabs.group({ groupId: existingGroupId, tabIds: [tabId4] });
```

### chrome.tabs.ungroup — Removing Tabs from Groups

```javascript
// Remove tabs from their group (becomes ungrouped)
chrome.tabs.ungroup([tabId1, tabId2]);

// Remove a tab from group (other tabs stay in group)
chrome.tabs.ungroup(tabId);

// Delete entire group (moves tabs out)
chrome.tabGroups.delete(groupId);
```

---

## Screenshots & Messaging

### chrome.tabs.captureVisibleTab — Taking Screenshots

```javascript
// Capture visible area as data URL
chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
  console.log('Screenshot:', dataUrl);
});

// Capture with specific quality
chrome.tabs.captureVisibleTab(windowId, {
  format: 'jpeg',
  quality: 80
}, (dataUrl) => {
  // Use dataUrl for <img> src or download
});

// Capture full page (requires content script in MV3)
// Use chrome.scripting.executeScript to capture full scroll height
```

### chrome.tabs.sendMessage — Messaging Content Scripts

```javascript
// Send message to a specific tab's content script
chrome.tabs.sendMessage(tabId, { action: 'getData' }, (response) => {
  console.log('Response:', response);
});

// Send message and handle errors
chrome.tabs.sendMessage(tabId, { action: 'doSomething' })
  .then(response => console.log(response))
  .catch(error => console.log('No content script:', error.message));
```

---

## Tab Events

### chrome.tabs.onCreated — New Tab Events

```javascript
chrome.tabs.onCreated.addListener((tab) => {
  console.log('New tab created:', tab.id);
  console.log('URL:', tab.url);
  console.log('Window:', tab.windowId);
});
```

### chrome.tabs.onUpdated — Tab Property Changes

```javascript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Tab', tabId, 'changed:', changeInfo);

  // changeInfo contains: { status, pinned, audible, mutedInfo, url, title, favIconUrl }

  // Example: Detect when a page finishes loading
  if (changeInfo.status === 'complete') {
    console.log('Page loaded:', tab.url);
  }

  // Example: Detect URL changes
  if (changeInfo.url) {
    console.log('URL changed to:', changeInfo.url);
  }

  // Example: Detect pin state changes
  if (changeInfo.pinned !== undefined) {
    console.log('Pinned:', changeInfo.pinned);
  }
});
```

### chrome.tabs.onRemoved — Tab Close Events

```javascript
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('Tab closed:', tabId);
  console.log('Window ID:', removeInfo.windowId);
  console.log('Was active:', removeInfo.isWindowClosing);
});
```

### chrome.tabs.onActivated — Tab Switch Events

```javascript
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Switched to tab:', activeInfo.tabId);
  console.log('Window:', activeInfo.windowId);

  // Get the newly active tab
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    console.log('New active URL:', tab.url);
  });
});
```

### chrome.tabs.onMoved — Tab Reorder Events

```javascript
chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  console.log('Tab moved:', tabId);
  console.log('From window:', moveInfo.windowId);
  console.log('New index:', moveInfo.fromIndex, '->', moveInfo.toIndex);
});
```

### chrome.tabs.onAttached / onDetached — Tab Window Changes

```javascript
// When a tab is moved to a different window
chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  console.log('Tab attached to window:', attachInfo.newWindowId);
  console.log('New index:', attachInfo.newIndex);
});

// When a tab is moved from one window to another
chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  console.log('Tab detached from window:', detachInfo.windowId);
  console.log('Previous index:', detachInfo.oldIndex);
});
```

### chrome.tabs.onReplaced — Tab Replacement Events

```javascript
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  console.log('Tab', removedTabId, 'replaced by', addedTabId);
  // Occurs when a tab is replaced by a prerendered/cached version
});
```

---

## QueryInfo Patterns for Common Use Cases

```javascript
// Get all browser tabs
chrome.tabs.query({}, (tabs) => { /* all tabs */ });

// Get tabs in current window, excluding pinned
chrome.tabs.query({ currentWindow: true, pinned: false }, (tabs) => { /* ... */ });

// Get tabs with audio playing
chrome.tabs.query({ audible: true }, (tabs) => {
  tabs.forEach(tab => chrome.tabs.update(tab.id, { muted: true }));
});

// Get recently updated tabs
chrome.tabs.query({ status: 'complete' }, (tabs) => {
  const sorted = tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
});

// Get tabs with specific title pattern
chrome.tabs.query({ title: '*Chrome*' }, (tabs) => { /* ... */ });

// Get non-incognito tabs only
chrome.tabs.query({ incognito: false }, (tabs) => { /* ... */ });
```

---

## Building a Tab Manager Extension

Here's a complete example combining multiple APIs:

```javascript
// background.js - Tab Manager Service Worker

// Find and activate a tab by URL
async function findAndActivateTab(urlPattern) {
  const tabs = await chrome.tabs.query({
    currentWindow: true,
    url: urlPattern
  });
  
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    return tabs[0];
  }
  
  // Create new tab if not found
  return await chrome.tabs.create({ url: urlPattern, active: true });
}

// Close duplicate tabs (keep newest)
async function closeDuplicateTabs(urlPattern) {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  
  if (tabs.length > 1) {
    // Sort by ID (higher = newer)
    const sorted = tabs.sort((a, b) => b.id - a.id);
    const toClose = sorted.slice(1);
    
    await chrome.tabs.remove(toClose.map(t => t.id));
    return sorted[0];
  }
  
  return tabs[0];
}

// Group related tabs
async function groupTabsByDomain() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Group by hostname
  const groups = {};
  tabs.forEach(tab => {
    try {
      const hostname = new URL(tab.url).hostname;
      if (!groups[hostname]) groups[hostname] = [];
      groups[hostname].push(tab.id);
    } catch (e) {}
  });
  
  // Create groups
  for (const [hostname, tabIds] of Object.entries(groups)) {
    if (tabIds.length > 1) {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, { title: hostname });
    }
  }
}

// Listen for tab updates to auto-organize
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Add your logic here
    console.log('Tab ready:', tab.title);
  }
});

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'close-duplicates') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      await closeDuplicateTabs(tab.url);
    }
  }
});
```

---

## Reference

- **Official Documentation:** [developer.chrome.com/docs/extensions/reference/api/tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- **Manifest V3 Migration:** Tabs API is fully supported in MV3
- **Permissions:** Use `"tabs"` for full access or granular host permissions for specific URLs
- **Promises:** Most methods return Promises in MV3—prefer async/await over callbacks

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.