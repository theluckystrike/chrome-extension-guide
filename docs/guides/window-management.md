---
layout: default
title: "Chrome Extension Window Management — Developer Guide"
description: "Learn Chrome extension window management with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/window-management/"
---
# Window Management in Chrome Extensions

## Introduction {#introduction}
- `chrome.windows` API for creating, managing, and monitoring browser windows
- No special permission required for basic window operations
- Use with `chrome.tabs` for full window/tab management

## Key APIs {#key-apis}

### chrome.windows.create() {#chromewindowscreate}
```javascript
// Normal browser window
const win = await chrome.windows.create({ url: "https://example.com", type: "normal" });

// Popup window (no tabs, bookmarks bar, etc.)
const popup = await chrome.windows.create({
  url: "popup-window.html",
  type: "popup",
  width: 400, height: 600,
  left: 100, top: 100
});

// Incognito window
const incog = await chrome.windows.create({ url: "https://example.com", incognito: true });
```

### Window Types {#window-types}
- `"normal"` — standard browser window with all chrome UI
- `"popup"` — minimal window, no tabs/address bar — great for extension UIs
- `"panel"` — deprecated, use popup instead

### chrome.windows.get/getAll/getCurrent/getLastFocused {#chromewindowsgetgetallgetcurrentgetlastfocused}
```javascript
const current = await chrome.windows.getCurrent({ populate: true }); // includes tabs
const all = await chrome.windows.getAll({ populate: true });
const focused = await chrome.windows.getLastFocused();
```
- `populate: true` includes tab array in the result

### chrome.windows.update() {#chromewindowsupdate}
```javascript
await chrome.windows.update(windowId, {
  left: 0, top: 0, width: 800, height: 600,  // Position and size
  focused: true,   // Bring to front
  state: "normal"  // "normal", "minimized", "maximized", "fullscreen"
});
```

### chrome.windows.remove() {#chromewindowsremove}
```javascript
await chrome.windows.remove(windowId); // Closes all tabs in the window
```

## Window Events {#window-events}
```javascript
chrome.windows.onCreated.addListener((window) => { /* new window */ });
chrome.windows.onRemoved.addListener((windowId) => { /* window closed */ });
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    console.log("No Chrome window focused");
  }
});
```

## Common Patterns {#common-patterns}

### Floating Tool Window {#floating-tool-window}
- Create a `"popup"` type window for extension UI that persists alongside browsing
- Position relative to main window
- Store position with `@theluckystrike/webext-storage`

### Multi-Window Session Manager {#multi-window-session-manager}
- Save all windows and their tabs: `getAll({ populate: true })`
- Restore by creating windows with `create({ url: [...] })`
- Store sessions with `@theluckystrike/webext-storage`

### Picture-in-Picture Style UI {#picture-in-picture-style-ui}
- Small `"popup"` window always on top (use `focused: true` on focus loss)
- Fixed small size for video/chat overlay

### Incognito Awareness {#incognito-awareness}
- Check `window.incognito` before performing actions
- Extension must declare `"incognito": "spanning"` or `"split"` in manifest
- `@theluckystrike/webext-storage` local storage is shared, sync storage is separate per profile

## Window-Tab Relationship {#window-tab-relationship}
- Every tab belongs to a window (`tab.windowId`)
- `chrome.tabs.move(tabId, { windowId })` moves tabs between windows
- Closing last tab in a window closes the window

## Common Mistakes {#common-mistakes}
- Not handling `WINDOW_ID_NONE` in `onFocusChanged` — fires when no Chrome window is focused
- Assuming window position is valid on multi-monitor — check `screen` dimensions
- Creating too many popup windows — confuses users
- Not requesting `"tabs"` permission when you need tab URLs in `populate: true` results

## Related Articles {#related-articles}

- [Multi-Window Patterns](../patterns/multi-window.md)
- [Windows API](../api-reference/windows-api.md)
