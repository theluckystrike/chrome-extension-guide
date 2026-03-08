---
layout: default
title: "Chrome Extension Multi Window — Best Practices"
description: "Manage multiple windows and coordinate between them."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/multi-window/"
---

# Multi-Window Management Pattern

## Overview

Chrome extensions often need to manage behavior across multiple browser windows. Whether you're building a productivity tool that tracks multiple projects in separate windows, a dashboard that opens in its own window, or an extension that coordinates state between windows, understanding how to work with the Windows API is essential. This pattern covers window awareness, events, per-window state management, coordination, and practical examples.

Extensions can create and manage multiple window types, track which window is focused, maintain state per window, and coordinate across all windows. This guide provides patterns for building robust multi-window extensions.

---

## Window Awareness

The Windows API provides several methods to query and inspect browser windows. Each window has a unique `windowId` that remains consistent throughout its lifetime.

```js
// Get all windows with their tabs
const windows = await chrome.windows.getAll({ populate: true });
for (const win of windows) {
  console.log(`Window ${win.id}: ${win.tabs?.length} tabs`);
}

// Get the currently focused window
const focused = await chrome.windows.getCurrent();

// Get the most recently focused window (could be different from focused)
const lastFocused = await chrome.windows.getLastFocused();

// Query specific windows by ID
const specific = await chrome.windows.get(windowId, { populate: true });
```

The `chrome.windows.getLastFocused()` method is particularly useful for determining which window the user was last interacting with, even if another extension window has taken focus.

---

## Window Events

Listen to window lifecycle events to stay in sync with the browser:

```js
// New window opened
chrome.windows.onCreated.addListener((window) => {
  console.log(`Window created: ${window.id}`);
  // Initialize state for new window if needed
});

// Window closed
chrome.windows.onRemoved.addListener((windowId) => {
  console.log(`Window removed: ${windowId}`);
  // Clean up per-window state
  windowStates.delete(windowId);
});

// Focus changed (can be WINDOW_ID_NONE when no window has focus)
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    console.log('No window focused');
    return;
  }
  console.log(`Focus changed to window: ${windowId}`);
  updateActiveWindow(windowId);
});
```

The `onFocusChanged` event fires with `chrome.windows.WINDOW_ID_NONE` when the user switches to a non-Chrome window or desktop, allowing you to handle focus loss appropriately.

---

## Per-Window State

Store state specific to each window using a Map keyed by `windowId`. This pattern ensures each window maintains its own context:

```js
// Track state per window
const windowStates = new Map<number, WindowState>();

interface WindowState {
  activeTabId?: number;
  view?: string;
  data?: Record<string, unknown>;
}

// Initialize state when window is created
chrome.windows.onCreated.addListener((window) => {
  windowStates.set(window.id, { view: 'default' });
});

// Clean up when window is removed
chrome.windows.onRemoved.addListener((windowId) => {
  windowStates.delete(windowId);
});

// Helper to get current window's state
async function getCurrentWindowState(): Promise<WindowState | undefined> {
  const win = await chrome.windows.getCurrent();
  return windowStates.get(win.id);
}
```

Persist window state to `chrome.storage.session` so it survives service worker restarts:

```js
const STORAGE_KEY = 'windowStates';

async function saveWindowStates(): Promise<void> {
  const obj = Object.fromEntries(windowStates);
  await chrome.storage.session.set({ [STORAGE_KEY]: obj });
}

async function loadWindowStates(): Promise<void> {
  const result = await chrome.storage.session.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    for (const [id, state] of Object.entries(result[STORAGE_KEY])) {
      windowStates.set(Number(id), state as WindowState);
    }
  }
}

// Call on service worker startup
loadWindowStates();
```

---

## Window Types

Chrome supports different window types with distinct behaviors:

| Type | Description |
|------|-------------|
| `"normal"` | Standard browser window with tabs |
| `"popup"` | Temporary window that closes when losing focus |
| `"panel"` | Docked panel window (deprecated in MV3) |
| `"app"` | App window for Chrome Apps (deprecated) |
| `"devtools"` | Developer tools window |

Filter windows by type when querying:

```js
// Only get normal browser windows
const browserWindows = await chrome.windows.getAll({
  windowTypes: ['normal'],
  populate: true
});

// Get popup windows created by your extension
const popupWindows = await chrome.windows.getAll({
  windowTypes: ['popup'],
  populate: true
});
```

---

## Creating Extension Windows

Create standalone windows for dashboards, settings, or content views:

```js
// Create a popup-style window
const window = await chrome.windows.create({
  url: 'dashboard.html',
  type: 'popup',
  width: 800,
  height: 600,
  focused: true,
  // Optional: constrain to specific screen
  // left: 100, top: 100,
});

// Create a full browser window
const browserWindow = await chrome.windows.create({
  url: 'full-window.html',
  type: 'normal',
  width: 1024,
  height: 768,
  focused: true,
});

// Update an existing window
await chrome.windows.update(window.id!, {
  width: 1024,
  height: 768,
  focused: true
});
```

---

## Window Coordination

Extension badges and icons are global by default, but you can target specific windows using `tabId`:

```js
// Set badge for specific tab (and thus its window)
chrome.action.setBadgeText({ tabId: tabId, text: '5' });
chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#FF0000' });

// Broadcast state changes across all windows via storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes.sharedState) {
    // Notify all windows of the change
    chrome.runtime.sendMessage({
      type: 'STATE_UPDATED',
      data: changes.sharedState.newValue
    });
  }
});
```

Use `chrome.storage` as a coordination mechanism between windows—the `onChanged` listener fires in all extension contexts when storage changes.

---

## Complete Example

Here's a practical example combining all concepts:

```js
// background/service-worker.ts
const windowStates = new Map<number, { activeView: string }>();

// Initialize on startup
chrome.windows.getAll({ windowTypes: ['normal', 'popup'] })
  .then(windows => {
    windows.forEach(win => {
      windowStates.set(win.id, { activeView: 'home' });
    });
  });

// Track creation
chrome.windows.onCreated.addListener((win) => {
  windowStates.set(win.id, { activeView: 'home' });
  console.log(`Tracking new window: ${win.id}`);
});

// Track removal
chrome.windows.onRemoved.addListener((winId) => {
  windowStates.delete(winId);
  console.log(`Stopped tracking window: ${winId}`);
});

// Track focus
chrome.windows.onFocusChanged.addListener(async (winId) => {
  if (winId === chrome.windows.WINDOW_ID_NONE) {
    console.log('User switched away from Chrome');
    return;
  }
  
  // Ensure we're tracking this window
  if (!windowStates.has(winId)) {
    windowStates.set(winId, { activeView: 'home' });
  }
  
  console.log(`Active window: ${winId}`);
});

// Handle messages from content scripts or popups
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'SET_VIEW' && sender.tab?.windowId) {
    const state = windowStates.get(sender.tab.windowId);
    if (state) {
      state.activeView = msg.view;
    }
  }
});
```

---

## Cross-References

- [Windows API Reference](../api-reference/windows-api.md) - Complete API documentation
- [Window Management Guide](../guides/window-management.md) - General window management
- [State Management Patterns](./state-management.md) - Persisting and sharing state
- [Badge and Action UI](./badge-action-ui.md) - Per-window badge management
- [Popup to Tab Pattern](./popup-to-tab.md) - Converting popups to full windows
