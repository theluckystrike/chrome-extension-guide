---
layout: default
title: "Chrome Extension Windows API. How to Create and Manage Browser Windows"
description: "Master the chrome.windows API for creating, updating, and managing browser windows in Chrome extensions. Covers window types, focused windows, incognito mode, and multi-monitor support."
canonical_url: "https://bestchromeextensions.com/guides/windows-api/"
---

Chrome Extension Windows API. How to Create and Manage Browser Windows

Introduction {#introduction}

The `chrome.windows` API is a powerful tool for Chrome extension developers who need to programmatically create, modify, and manage browser windows. Unlike basic tab management, the Windows API gives you control over the window container itself, its size, position, type, focus state, and even which display monitor it appears on. This guide covers the essential methods and use cases for building window-aware extensions.

Understanding the Windows API {#understanding-the-windows-api}

The `chrome.windows` API provides a collection of methods that enable full window lifecycle management. Before diving into specific operations, it's important to understand what permissions, if any, are required. For basic window creation and querying, no special permissions are needed. However, certain advanced features like accessing window bounds across all windows may require the `"tabs"` permission.

The API centers around several core methods: `create()` for opening new windows, `update()` for modifying existing windows, `remove()` for closing windows, and various `get*` methods for retrieving window information. Each method returns a Promise (in modern Manifest V3 extensions), making async/await patterns straightforward to implement.

Creating Windows {#creating-windows}

The `chrome.windows.create()` method is your primary entry point for spawning new windows. At its simplest, you can create a window with a single URL:

```javascript
// Create a basic window with a specified URL
const newWindow = await chrome.windows.create({
  url: "https://example.com"
});
```

This creates a standard browser window. However, the real power of the API emerges when you use its many options. You can specify exact dimensions using `width` and `height`, position the window with `left` and `top`, and control the window type with the `type` parameter.

Window Types Explained {#window-types-explained}

Chrome supports several window types, each serving different purposes:

- "normal". The default browser window with full Chrome UI, including the address bar, bookmarks bar, and tabs. This is what users expect from a standard browsing experience.

- "popup". A minimal, temporary window without tabs or address bar. Perfect for extension popups, floating toolbars, or notification-style interfaces. These windows automatically close when Chrome loses focus in some configurations.

- "panel". A deprecated type that behaves similarly to popup but with additional constraints. Modern extensions should use "popup" instead.

- "app". Used for packaged apps, generally not applicable to typical extensions.

```javascript
// Create a popup-style window for an extension tool
const popupWindow = await chrome.windows.create({
  url: "panel.html",
  type: "popup",
  width: 450,
  height: 600,
  left: 100,
  top: 100
});
```

Managing Window Focus and Incognito Mode {#managing-window-focus-and-incognito-mode}

Focused Windows {#focused-windows}

The `focused` property controls whether a newly created window receives keyboard focus. By default, new windows receive focus, but you can change this behavior:

```javascript
// Create window without taking focus
const backgroundWindow = await chrome.windows.create({
  url: "https://example.com",
  focused: false
});
```

This is useful when you want to open reference content without interrupting the user's current task. You can also check and update focus on existing windows:

```javascript
// Get the last focused window
const lastFocused = await chrome.windows.getLastFocused({});

// Focus a specific window by ID
await chrome.windows.update(focusedWindow.id, { focused: true });
```

Incognito Windows {#incognito-windows}

Creating incognito (private browsing) windows requires careful consideration of privacy implications. The `incognito` property allows you to open private windows:

```javascript
// Create an incognito window
const privateWindow = await chrome.windows.create({
  url: "https://example.com",
  incognito: true
});
```

Important restrictions apply to incognito windows: they cannot access extension pages or resources from normal windows, and service workers may have limited visibility into incognito tab activity. Always inform users when your extension interacts with private browsing data.

Updating Windows {#updating-windows}

Once a window exists, you can modify its properties using `chrome.windows.update()`. This method accepts a window ID and an update properties object:

```javascript
// Resize and move a window
await chrome.windows.update(windowId, {
  width: 800,
  height: 600,
  left: 200,
  top: 150
});

// Change window state
await chrome.windows.update(windowId, {
  state: "maximized"  // "normal", "minimized", "maximized", "fullscreen"
});

// Bring window to front
await chrome.windows.update(windowId, {
  focused: true
});
```

The update method is particularly valuable for implementing window management features like "always on top" functionality or snap-to-edge behaviors common in productivity extensions.

Removing Windows {#removing-windows}

Closing a window is straightforward but should be used thoughtfully to avoid frustrating users:

```javascript
// Close a specific window by ID
await chrome.windows.remove(windowId);
```

Note that you cannot close the user's last remaining browser window for security reasons. Attempting to do so will fail silently or throw an error depending on the Chrome version.

Multi-Monitor Support {#multi-monitor-support}

Modern extensions can use multi-monitor setups by querying display information and positioning windows accordingly. The key is combining `chrome.windows` with the Display Surface API:

```javascript
// Get all displays
const displays = await chrome.system.display.getInfo();

// Create window on secondary monitor
const secondaryDisplay = displays[1]; // Assuming display[0] is primary
await chrome.windows.create({
  url: "https://example.com",
  left: secondaryDisplay.bounds.left + 100,
  top: secondaryDisplay.bounds.top + 100,
  width: 1024,
  height: 768
});
```

This capability is essential for extensions that manage workspace layouts or provide multi-monitor productivity tools. You can save and restore window positions across displays, enabling features like "move all windows to monitor 2" or workspace presets.

Querying Windows {#querying-windows}

The API provides several methods to retrieve window information:

- `chrome.windows.get(windowId, options)`. Get a specific window by ID
- `chrome.windows.getCurrent(options)`. Get the window invoking the callback
- `chrome.windows.getLastFocused()`. Get the window most recently focused by the user
- `chrome.windows.getAll(options)`. Get all windows

```javascript
// Get all windows with their tabs
const allWindows = await chrome.windows.getAll({ populate: true });

// Find a specific window by ID
const specificWindow = await chrome.windows.get(windowId, { populate: false });
```

The `populate: true` option is particularly useful when you need to work with both windows and their contained tabs in a single operation.

Best Practices {#best-practices}

When working with the Windows API, consider these recommendations: Always handle errors gracefully, as window operations can fail if the window is closed during the operation or if invalid parameters are provided. Use the `focused` property thoughtfully, unexpected focus shifts can frustrate users. For extensions that create multiple windows, implement cleanup logic to close windows when they're no longer needed.

Test thoroughly across different Chrome configurations and multi-monitor setups, as window behavior can vary between platforms. Finally, document any assumptions about window state in your extension's user-facing documentation.

Conclusion {#conclusion}

The `chrome.windows` API provides comprehensive control over browser window creation, modification, and management in Chrome extensions. From basic window spawning to sophisticated multi-monitor layouts, mastering these capabilities enables you to build powerful productivity tools and sophisticated extension interfaces. Combined with the Tabs API, you have complete control over the user's browsing environment.
Chrome Windows API

Introduction
- `chrome.windows` API manages browser windows for multi-window extensions
- Required for picture-in-picture, auth popups, and window-based extensions
- Requires `"windows"` permission in manifest.json
- Reference: https://developer.chrome.com/docs/extensions/reference/api/windows

manifest.json
```json
{ "permissions": ["windows"] }
```

Window Types
- `normal` - Standard browser window with tabs/address bar
- `popup` - Minimal window for extension UI  
- `panel` - Docked panel (Chrome app behavior)
- `app` - Deprecated, use extensions instead

Window State
- `normal` - Standard decorated window
- `minimized` - Minimized to taskbar
- `maximized` - Fills screen
- `fullscreen` - Fullscreen mode

Getting Windows

chrome.windows.getAll
```javascript
// Get all windows
chrome.windows.getAll((windows) => {
  windows.forEach(win => console.log(`Window ${win.id}: ${win.type}`));
});
// Filter by type
chrome.windows.getAll({ types: ["normal"] }, (w) => console.log(w.length));
```

chrome.windows.get
```javascript
chrome.windows.get(windowId, (window) => console.log(window));
```

chrome.windows.getCurrent
```javascript
chrome.windows.getCurrent((window) => console.log("Current:", window.id));
```

chrome.windows.getLastFocused
```javascript
chrome.windows.getLastFocused((window) => console.log("Last:", window.id));
Chrome Windows API Guide

Overview
The Windows API provides powerful methods to manage browser windows in Chrome extensions. This guide covers window manipulation, events, and practical patterns. No special permissions needed for basic operations, but `"tabs"` permission is required for accessing tab details.

Window Properties
- `id`: Unique window identifier
- `focused`: Boolean indicating if window has focus
- `top`, `left`, `width`, `height`: Window position and dimensions
- `state`: Current window state (normal, minimized, maximized, fullscreen)
- `type`: Window type (normal, popup, panel, app)
- `tabs`: Array of Tab objects (requires `"tabs"` permission)
- `incognito`: Boolean for private browsing windows

Window Types
- normal: Standard browser window with tabs and address bar
- popup: Minimal window often used by extensions
- panel: Docked panel window (deprecated)
- app: Application-specific window for Chrome apps

Window States
- normal: Standard windowed mode
- minimized: Minimized to taskbar
- maximized: Fills the screen
- fullscreen: Fullscreen mode (F11)

Getting Windows

chrome.windows.get. Get a Specific Window
```javascript
chrome.windows.get(windowId, { populate: true }, (window) => {
  window.tabs.forEach(tab => console.log(tab.title));
});
```

chrome.windows.getAll. List All Windows
```javascript
chrome.windows.getAll({ populate: true }, (windows) => {
  console.log('Total tabs:', windows.reduce((sum, w) => sum + w.tabs.length, 0));
});
```

chrome.windows.getCurrent. Current Window
```javascript
chrome.windows.getCurrent((window) => console.log('Current:', window.id));
```

chrome.windows.getLastFocused. Last Focused Window
```javascript
chrome.windows.getLastFocused((window) => console.log('Last focused:', window.id));
```

Creating Windows

chrome.windows.create
```javascript
// Basic window
chrome.windows.create((window) => console.log("Created:", window.id));
// Open URL
chrome.windows.create({ url: "https://example.com" });
// Popup
chrome.windows.create({ url: "popup.html", type: "popup", width: 400, height: 300 });
// Positioned
chrome.windows.create({ url: "p.html", left: 100, top: 100, width: 500, height: 400 });
// Maximized
chrome.windows.create({ url: "p.html", state: "maximized" });
// Incognito
chrome.windows.create({ url: "p.html", incognito: true });
```

Updating Windows

chrome.windows.update
```javascript
chrome.windows.update(windowId, { focused: true });
chrome.windows.update(windowId, { left: 200, top: 150 });
chrome.windows.update(windowId, { width: 800, height: 600 });
chrome.windows.update(windowId, { left: 100, top: 100, width: 1024, height: 768 });
chrome.windows.update(windowId, { state: "maximized" });
chrome.windows.update(windowId, { state: "minimized" });
chrome.windows.update(windowId, { state: "normal" });
chrome.windows.update(windowId, { state: "fullscreen" });
chrome.windows.create. Create New Windows
```javascript
chrome.windows.create({ url: 'https://example.com' });

chrome.windows.create({
  url: 'popup.html',
  type: 'popup',
  width: 400,
  height: 300,
  focused: true,
  state: 'maximized'
});
```

Modifying Windows

chrome.windows.update. Update Window Properties
```javascript
chrome.windows.update(windowId, { focused: true });
chrome.windows.update(windowId, { width: 1024, height: 768 });
chrome.windows.update(windowId, { left: 0, top: 0 });
chrome.windows.update(windowId, { state: 'maximized' });
chrome.windows.update(windowId, { state: 'minimized' });
chrome.windows.update(windowId, { alwaysOnTop: true });
```

Closing Windows

chrome.windows.remove
```javascript
chrome.windows.remove(windowId, () => console.log("Closed"));
chrome.windows.getCurrent((win) => chrome.windows.remove(win.id));
chrome.windows.remove. Close a Window
```javascript
chrome.windows.remove(windowId);
```

Window Events

onCreated
```javascript
chrome.windows.onCreated.addListener((window) => console.log("Created:", window.id));
```

onRemoved
```javascript
chrome.windows.onRemoved.addListener((windowId) => console.log("Removed:", windowId));
```

onFocusChanged
```javascript
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) console.log("No focus");
  else console.log("Focus:", windowId);
});
```

onBoundsChanged
```javascript
chrome.windows.onBoundsChanged.addListener((w) => 
  console.log("Bounds:", w.left, w.top, w.width, w.height));
```

Use Cases

Picture-in-Picture Window
```javascript
function openPiP(videoUrl) {
  chrome.windows.create({
    url: `player.html?video=${encodeURIComponent(videoUrl)}`,
    type: "popup", width: 640, height: 360, alwaysOnTop: true, focused: true
  });
}
```

Auth Popup
```javascript
function openAuth() {
  return new Promise((resolve) => {
    chrome.windows.create({ url: "auth.html", type: "popup", width: 500, height: 600, focused: true }, (win) => {
      const listener = (msg) => {
        if (msg.type === "authComplete") {
          chrome.windows.remove(win.id);
          chrome.runtime.onMessage.removeListener(listener);
          resolve(msg.token);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
    });
  });
}
```

Multi-Window Manager
```javascript
const extWindows = new Set();
chrome.windows.onCreated.addListener((w) => { if (w.type === "popup") extWindows.add(w.id); });
chrome.windows.onRemoved.addListener((id) => extWindows.delete(id));
function closeAll() { extWindows.forEach(id => chrome.windows.remove(id)); extWindows.clear(); }
```

State Restoration
```javascript
let savedState = null;
function saveState(windowId) {
  chrome.windows.get(windowId, (w) => { savedState = { left: w.left, top: w.top, width: w.width, height: w.height, state: w.state }; });
}
function restoreState(windowId) { if (savedState) chrome.windows.update(windowId, savedState); }
```

Tab to Window
```javascript
// Move tab to new window
chrome.tabs.move(tabId, { windowId: null, index: -1 }, (tab) => { chrome.windows.create({ tabId: tab.id }); });
// Get windows with tabs
chrome.windows.getAll({ populate: true }, (windows) => { windows.forEach(w => console.log(`Window ${w.id}: ${w.tabs.length} tabs`)); });
```

Complete Example
```javascript
// background.js
const managed = new Map();
chrome.action.onClicked.addListener(() => {
  const existing = managed.get("main");
  if (existing) chrome.windows.update(existing, { focused: true });
  else chrome.windows.create({ url: "manager.html", type: "normal", width: 800, height: 600 }, (win) => managed.set("main", win.id));
});
chrome.windows.onRemoved.addListener((id) => { if (managed.has(id)) managed.delete(id); });
```

Constants
- `chrome.windows.WINDOW_ID_CURRENT` - Current window
- `chrome.windows.WINDOW_ID_NONE` - No window focused

Best Practices
- Check window existence before updating/removing
- Use `populate: true` for tab information
- Handle WINDOW_ID_NONE in focus listeners
- Store window IDs for later reference
chrome.windows.onCreated
```javascript
chrome.windows.onCreated.addListener((window) => console.log('Created:', window.id));
```

chrome.windows.onRemoved
```javascript
chrome.windows.onRemoved.addListener((windowId) => console.log('Closed:', windowId));
```

chrome.windows.onFocusChanged
```javascript
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  console.log('Focus:', windowId);
});
```

chrome.windows.onBoundsChanged
```javascript
chrome.windows.onBoundsChanged.addListener((window) => {
  console.log('Bounds:', window.left, window.top, window.width, window.height);
});
```

Building a Window Manager Extension
```javascript
class WindowManager {
  constructor() {
    this.setupListeners();
  }
  
  setupListeners() {
    chrome.windows.onCreated.addListener(w => console.log('Created:', w.id));
    chrome.windows.onRemoved.addListener(id => console.log('Closed:', id));
    chrome.windows.onFocusChanged.addListener(id => {
      if (id !== chrome.windows.WINDOW_ID_NONE) console.log('Focus:', id);
    });
  }
  
  async getAllWindows() {
    return chrome.windows.getAll({ populate: true });
  }
  
  async createWindow(url, options = {}) {
    return chrome.windows.create({ url, ...options });
  }
  
  async closeWindow(windowId) {
    return chrome.windows.remove(windowId);
  }
  
  async focusWindow(windowId) {
    return chrome.windows.update(windowId, { focused: true });
  }
  
  async minimizeWindow(windowId) {
    return chrome.windows.update(windowId, { state: 'minimized' });
  }
  
  async maximizeWindow(windowId) {
    return chrome.windows.update(windowId, { state: 'maximized' });
  }
}

const manager = new WindowManager();

chrome.runtime.onMessage.addListener((msg, sender, response) => {
  if (msg.action === 'getWindows') {
    manager.getAllWindows().then(response);
    return true;
  }
});
```

Common Mistakes
- Not checking for `WINDOW_ID_NONE` in focus change events
- Forgetting window bounds may be undefined for minimized windows
- Not handling the async nature of window operations
- Attempting to close the last window without user interaction

Reference
- [Official Chrome Windows API Documentation](https://developer.chrome.com/docs/extensions/reference/api/windows)
