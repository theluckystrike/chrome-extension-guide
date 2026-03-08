---
layout: default
title: "Chrome Extension Tab Management — Developer Guide"
description: "Learn Chrome extension tab management with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/tab-management/"
---
# Tab Management Patterns

## Introduction {#introduction}
- `chrome.tabs` is one of the most-used Chrome APIs
- Requires `"tabs"` permission for full URL/title access (cross-ref: `docs/permissions/tabs.md`)
- `activeTab` permission is sufficient for many use cases

## Querying Tabs {#querying-tabs}
```javascript
// Active tab in current window
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

// All tabs
const allTabs = await chrome.tabs.query({});

// Tabs matching URL pattern
const githubTabs = await chrome.tabs.query({ url: "https://github.com/*" });

// Pinned tabs
const pinned = await chrome.tabs.query({ pinned: true });

// Audible tabs (playing audio)
const audible = await chrome.tabs.query({ audible: true });
```

## Creating/Updating/Removing Tabs {#creatingupdatingremoving-tabs}
```javascript
// Create
const newTab = await chrome.tabs.create({ url: "https://example.com", active: false });

// Update
await chrome.tabs.update(tabId, { url: "https://new-url.com", pinned: true });

// Remove
await chrome.tabs.remove(tabId);
await chrome.tabs.remove([tabId1, tabId2]); // Batch remove
```

## Tab Events {#tab-events}
```javascript
chrome.tabs.onCreated.addListener((tab) => { /* new tab */ });
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') { /* page loaded */ }
  if (changeInfo.url) { /* URL changed */ }
});
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => { /* tab closed */ });
chrome.tabs.onActivated.addListener((activeInfo) => { /* tab switched */ });
```

## Tab Groups (chrome.tabGroups) {#tab-groups-chrometabgroups}
```javascript
// Group tabs
const groupId = await chrome.tabs.group({ tabIds: [tab1.id, tab2.id] });

// Set group properties
await chrome.tabGroups.update(groupId, {
  title: "Research",
  color: "blue",  // blue, cyan, grey, green, orange, pink, purple, red, yellow
  collapsed: false
});

// Move tab to existing group
await chrome.tabs.group({ tabIds: [tab3.id], groupId: groupId });

// Ungroup
await chrome.tabs.ungroup([tab1.id]);
```

## Moving Tabs {#moving-tabs}
```javascript
// Move within window
await chrome.tabs.move(tabId, { index: 0 }); // Move to first position

// Move to another window
await chrome.tabs.move(tabId, { windowId: otherWindowId, index: -1 });
```

## Tab Communication {#tab-communication}
- Send message to specific tab's content script:
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';
const messenger = createMessenger<Messages>();
const response = await messenger.sendTabMessage(tabId, 'getData', { selector: '.title' });
```
- Broadcast to all tabs:
```javascript
const tabs = await chrome.tabs.query({});
for (const tab of tabs) {
  messenger.sendTabMessage(tab.id, 'themeChanged', { theme: 'dark' }).catch(() => {});
}
```

## Advanced Tab Operations {#advanced-tab-operations}
- `chrome.tabs.captureVisibleTab()` — screenshot the active tab
- `chrome.tabs.discard(tabId)` — unload tab to save memory (tab stays in strip)
- `chrome.tabs.duplicate(tabId)` — duplicate a tab
- `chrome.tabs.reload(tabId)` — reload a tab
- `chrome.tabs.detectLanguage(tabId)` — detect page language
- `chrome.tabs.getZoom(tabId)` / `setZoom(tabId, factor)`

## Storing Tab State {#storing-tab-state}
```typescript
const storage = createStorage(defineSchema({
  pinnedTabs: 'string',    // JSON array of URLs
  lastActiveTab: 'number', // Tab ID
  tabNotes: 'string'       // JSON map of tabId -> notes
}), 'local');
```

## Common Patterns {#common-patterns}
- **Tab manager**: list/search/close/group tabs from popup
- **Tab saver**: save tab session, restore later
- **Duplicate finder**: find tabs with same URL
- **Auto-grouper**: group tabs by domain automatically
- **Tab limiter**: warn or close when too many tabs open

## Common Mistakes {#common-mistakes}
- Using `chrome.tabs.query` without `"tabs"` permission — URL/title will be undefined
- Not checking if content script is injected before `sendTabMessage`
- Forgetting `activeTab` gives access to current tab without `"tabs"` permission
- Tab IDs are not persistent across browser restarts

## Related Articles {#related-articles}

## Related Articles

- [Tab Management Patterns](../patterns/tab-management.md)
- [Tab Group Patterns](../patterns/tab-group-patterns.md)
