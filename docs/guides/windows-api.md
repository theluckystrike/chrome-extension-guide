# Chrome Windows API Guide

## Overview
The Windows API provides powerful methods to manage browser windows in Chrome extensions. This guide covers window manipulation, events, and practical patterns. No special permissions needed for basic operations, but `"tabs"` permission is required for accessing tab details.

## Window Properties
- `id`: Unique window identifier
- `focused`: Boolean indicating if window has focus
- `top`, `left`, `width`, `height`: Window position and dimensions
- `state`: Current window state (normal, minimized, maximized, fullscreen)
- `type`: Window type (normal, popup, panel, app)
- `tabs`: Array of Tab objects (requires `"tabs"` permission)
- `incognito`: Boolean for private browsing windows

## Window Types
- **normal**: Standard browser window with tabs and address bar
- **popup**: Minimal window often used by extensions
- **panel**: Docked panel window (deprecated)
- **app**: Application-specific window for Chrome apps

## Window States
- **normal**: Standard windowed mode
- **minimized**: Minimized to taskbar
- **maximized**: Fills the screen
- **fullscreen**: Fullscreen mode (F11)

## Getting Windows

### chrome.windows.get — Get a Specific Window
```javascript
chrome.windows.get(windowId, { populate: true }, (window) => {
  window.tabs.forEach(tab => console.log(tab.title));
});
```

### chrome.windows.getAll — List All Windows
```javascript
chrome.windows.getAll({ populate: true }, (windows) => {
  console.log('Total tabs:', windows.reduce((sum, w) => sum + w.tabs.length, 0));
});
```

### chrome.windows.getCurrent — Current Window
```javascript
chrome.windows.getCurrent((window) => console.log('Current:', window.id));
```

### chrome.windows.getLastFocused — Last Focused Window
```javascript
chrome.windows.getLastFocused((window) => console.log('Last focused:', window.id));
```

## Creating Windows

### chrome.windows.create — Create New Windows
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

## Modifying Windows

### chrome.windows.update — Update Window Properties
```javascript
chrome.windows.update(windowId, { focused: true });
chrome.windows.update(windowId, { width: 1024, height: 768 });
chrome.windows.update(windowId, { left: 0, top: 0 });
chrome.windows.update(windowId, { state: 'maximized' });
chrome.windows.update(windowId, { state: 'minimized' });
chrome.windows.update(windowId, { alwaysOnTop: true });
```

## Closing Windows

### chrome.windows.remove — Close a Window
```javascript
chrome.windows.remove(windowId);
```

## Window Events

### chrome.windows.onCreated
```javascript
chrome.windows.onCreated.addListener((window) => console.log('Created:', window.id));
```

### chrome.windows.onRemoved
```javascript
chrome.windows.onRemoved.addListener((windowId) => console.log('Closed:', windowId));
```

### chrome.windows.onFocusChanged
```javascript
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  console.log('Focus:', windowId);
});
```

### chrome.windows.onBoundsChanged
```javascript
chrome.windows.onBoundsChanged.addListener((window) => {
  console.log('Bounds:', window.left, window.top, window.width, window.height);
});
```

## Building a Window Manager Extension
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

## Common Mistakes
- Not checking for `WINDOW_ID_NONE` in focus change events
- Forgetting window bounds may be undefined for minimized windows
- Not handling the async nature of window operations
- Attempting to close the last window without user interaction

## Reference
- [Official Chrome Windows API Documentation](https://developer.chrome.com/docs/extensions/reference/api/windows)
