# Chrome Windows API

## Introduction
- `chrome.windows` API manages browser windows for multi-window extensions
- Required for picture-in-picture, auth popups, and window-based extensions
- Requires `"windows"` permission in manifest.json
- Reference: https://developer.chrome.com/docs/extensions/reference/api/windows

## manifest.json
```json
{ "permissions": ["windows"] }
```

## Window Types
- `normal` - Standard browser window with tabs/address bar
- `popup` - Minimal window for extension UI  
- `panel` - Docked panel (Chrome app behavior)
- `app` - Deprecated, use extensions instead

## Window State
- `normal` - Standard decorated window
- `minimized` - Minimized to taskbar
- `maximized` - Fills screen
- `fullscreen` - Fullscreen mode

## Getting Windows

### chrome.windows.getAll
```javascript
// Get all windows
chrome.windows.getAll((windows) => {
  windows.forEach(win => console.log(`Window ${win.id}: ${win.type}`));
});
// Filter by type
chrome.windows.getAll({ types: ["normal"] }, (w) => console.log(w.length));
```

### chrome.windows.get
```javascript
chrome.windows.get(windowId, (window) => console.log(window));
```

### chrome.windows.getCurrent
```javascript
chrome.windows.getCurrent((window) => console.log("Current:", window.id));
```

### chrome.windows.getLastFocused
```javascript
chrome.windows.getLastFocused((window) => console.log("Last:", window.id));
```

## Creating Windows

### chrome.windows.create
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

## Updating Windows

### chrome.windows.update
```javascript
chrome.windows.update(windowId, { focused: true });
chrome.windows.update(windowId, { left: 200, top: 150 });
chrome.windows.update(windowId, { width: 800, height: 600 });
chrome.windows.update(windowId, { left: 100, top: 100, width: 1024, height: 768 });
chrome.windows.update(windowId, { state: "maximized" });
chrome.windows.update(windowId, { state: "minimized" });
chrome.windows.update(windowId, { state: "normal" });
chrome.windows.update(windowId, { state: "fullscreen" });
```

## Closing Windows

### chrome.windows.remove
```javascript
chrome.windows.remove(windowId, () => console.log("Closed"));
chrome.windows.getCurrent((win) => chrome.windows.remove(win.id));
```

## Window Events

### onCreated
```javascript
chrome.windows.onCreated.addListener((window) => console.log("Created:", window.id));
```

### onRemoved
```javascript
chrome.windows.onRemoved.addListener((windowId) => console.log("Removed:", windowId));
```

### onFocusChanged
```javascript
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) console.log("No focus");
  else console.log("Focus:", windowId);
});
```

### onBoundsChanged
```javascript
chrome.windows.onBoundsChanged.addListener((w) => 
  console.log("Bounds:", w.left, w.top, w.width, w.height));
```

## Use Cases

### Picture-in-Picture Window
```javascript
function openPiP(videoUrl) {
  chrome.windows.create({
    url: `player.html?video=${encodeURIComponent(videoUrl)}`,
    type: "popup", width: 640, height: 360, alwaysOnTop: true, focused: true
  });
}
```

### Auth Popup
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

### Multi-Window Manager
```javascript
const extWindows = new Set();
chrome.windows.onCreated.addListener((w) => { if (w.type === "popup") extWindows.add(w.id); });
chrome.windows.onRemoved.addListener((id) => extWindows.delete(id));
function closeAll() { extWindows.forEach(id => chrome.windows.remove(id)); extWindows.clear(); }
```

### State Restoration
```javascript
let savedState = null;
function saveState(windowId) {
  chrome.windows.get(windowId, (w) => { savedState = { left: w.left, top: w.top, width: w.width, height: w.height, state: w.state }; });
}
function restoreState(windowId) { if (savedState) chrome.windows.update(windowId, savedState); }
```

### Tab to Window
```javascript
// Move tab to new window
chrome.tabs.move(tabId, { windowId: null, index: -1 }, (tab) => { chrome.windows.create({ tabId: tab.id }); });
// Get windows with tabs
chrome.windows.getAll({ populate: true }, (windows) => { windows.forEach(w => console.log(`Window ${w.id}: ${w.tabs.length} tabs`)); });
```

## Complete Example
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

## Constants
- `chrome.windows.WINDOW_ID_CURRENT` - Current window
- `chrome.windows.WINDOW_ID_NONE` - No window focused

## Best Practices
- Check window existence before updating/removing
- Use `populate: true` for tab information
- Handle WINDOW_ID_NONE in focus listeners
- Store window IDs for later reference
