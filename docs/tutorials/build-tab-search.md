---
layout: default
title: "Chrome Extension Tab Search — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-tab-search/"
---
# Build a Tab Search & Switch Extension

This tutorial guides you through building a Chrome extension that searches and switches between open tabs, with support for recently closed tabs.

## Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create `manifest.json` with the necessary permissions:

```json
{
  "manifest_version": 3,
  "name": "Tab Search",
  "version": "1.0",
  "permissions": ["tabs", "sessions"],
  "commands": {
    "open-tab-search": {
      "suggested_key": "Ctrl+Shift+Space",
      "description": "Open tab search"
    }
  }
}
```

## Step 2: Popup HTML {#step-2-popup-html}

Create `popup.html` with a search input that auto-focuses when opened:

```html
<input type="text" id="search" placeholder="Search tabs..." autofocus>
<ul id="results"></ul>
```

## Step 3: List All Open Tabs {#step-3-list-all-open-tabs}

Use `chrome.tabs.query({})` to fetch all tabs with their title, URL, and favicon:

```javascript
async function getAllTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.map(tab => ({
    id: tab.id,
    title: tab.title,
    url: tab.url,
    favicon: tab.favIconUrl,
    pinned: tab.pinned
  }));
}
```

## Step 4: Fuzzy Search {#step-4-fuzzy-search}

Filter tabs as the user types, matching both title and URL:

```javascript
function filterTabs(tabs, query) {
  const lower = query.toLowerCase();
  return tabs.filter(tab => 
    tab.title.toLowerCase().includes(lower) ||
    tab.url.toLowerCase().includes(lower)
  );
}
```

## Step 5: Switch to Tab {#step-5-switch-to-tab}

Use `chrome.tabs.update()` and `chrome.windows.update()` to activate a tab:

```javascript
async function switchToTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}
```

## Step 6: Keyboard Navigation {#step-6-keyboard-navigation}

Implement arrow key navigation, Enter to switch, and Escape to close:

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { /* move selection down */ }
  if (e.key === 'ArrowUp') { /* move selection up */ }
  if (e.key === 'Enter') { /* switch to selected tab */ }
  if (e.key === 'Escape') { window.close(); }
});
```

## Step 7: Recently Closed Tabs {#step-7-recently-closed-tabs}

Use `chrome.sessions.getRecentlyClosed()` to retrieve closed tabs:

```javascript
async function getRecentlyClosed() {
  const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 10 });
  return sessions.map(s => s.tab).filter(Boolean);
}
```

## Step 8: Reopen Closed Tabs {#step-8-reopen-closed-tabs}

Restore a closed tab using `chrome.sessions.restore()`:

```javascript
async function restoreTab(sessionId) {
  await chrome.sessions.restore(sessionId);
}
```

## Additional Features {#additional-features}

- **Tab Deduplication**: Highlight duplicate URLs in the list
- **Pin/Unpin**: Right-click options to pin/unpin tabs
- **Close Tab**: Close tabs directly from search results

## Keyboard Shortcut {#keyboard-shortcut}

The extension uses the `commands` API. Press `Ctrl+Shift+Space` to open the search popup.

## Related Documentation {#related-documentation}

- [Tabs API Reference](../api-reference/tabs-api.md)
- [Sessions API Reference](../api-reference/sessions-api.md)
- [Tab Management Patterns](../patterns/tab-management.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
