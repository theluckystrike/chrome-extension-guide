# Advanced Side Panel Patterns

This guide covers advanced patterns for building Chrome Extension side panels using the Side Panel API (Manifest V3).

## Setting Up the Side Panel

Configure the side panel in `manifest.json`:

```json
{
  "name": "Side Panel Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

Programmatic configuration:

```javascript
chrome.sidePanel.setOptions({
  path: 'sidepanel.html',
  enabled: true
});
```

## Opening the Side Panel Programmatically

Chrome 116+ supports opening the side panel programmatically:

```javascript
// Open side panel for the current window
await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });

// Open side panel for a specific tab
await chrome.sidePanel.open({ tabId: currentTab.id });
```

## Per-Tab Side Panels

Display different content per tab using `tabId`:

```javascript
chrome.sidePanel.setOptions({
  tabId: tabId,
  path: getPanelPathForTab(tabId)
});

// Listen for tab switches
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  chrome.sidePanel.setOptions({
    tabId,
    path: getPanelPathForTab(tabId)
  });
});
```

## Communication with Page Content

Bridge the side panel with the active page using content scripts:

```javascript
// Content script (content.js)
window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'FROM_PANEL') {
    // Handle message from side panel
  }
});

// Side panel (sidepanel.js)
window.postMessage({ type: 'FROM_PANEL', data: 'hello' }, '*');
```

## Side Panel Lifecycle

Unlike popups, side panels persist across tab switches:

```javascript
// State persists when user switches tabs
let panelState = { scrollPosition: 0, userData: null };

// Restore state when panel opens
// Side panel does not have an onShow event.
// Use document lifecycle events instead:
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') restoreState();
});
```

## Responsive Design

Handle variable panel widths:

```javascript
// Detect panel width
const width = document.body.offsetWidth;

// Adjust layout based on width
if (width < 200) {
  document.body.classList.add('compact');
}
```

## Navigation Within Side Panel

Build SPA-like navigation with hash routing:

```javascript
function navigate(hash) {
  window.location.hash = hash;
  renderContent();
}

window.addEventListener('hashchange', renderContent);
```

## Side Panel vs Popup

| Feature | Side Panel | Popup |
|---------|-----------|-------|
| Persistence | Stays open | Closes on blur |
| Size | Resizable | Fixed |
| Communication | Continuous | Transient |
| State | Maintained | Reset each open |

## Side Panel vs DevTools

Side panels are ideal for:
- User-facing features
- Lightweight tools
- Quick access utilities

DevTools are better for:
- Debugging tools
- Deep inspection
- Developer-focused features

## Keyboard Shortcuts

Toggle side panel with keyboard:

```json
{
  "commands": {
    "toggle-side-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Toggle side panel"
    }
  }
}
```

```javascript
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-side-panel') {
    await chrome.sidePanel.open();
  }
});
```

## Limitations

- Only one side panel per extension
- Cannot programmatically resize panel width
- Panel width determined by user settings

## Related Resources

- [Side Panel API Reference](../api-reference/side-panel-api.md)
- [Side Panel Basics](../mv3/side-panel.md)
- [Side Panel Pattern Guide](./side-panel.md)
