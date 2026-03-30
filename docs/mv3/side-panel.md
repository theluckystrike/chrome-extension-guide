---
layout: default
title: "Chrome Extension Side Panel. Manifest V3 Guide"
description: "Implement side panels in Manifest V3 with the chrome.sidePanel API."
canonical_url: "https://bestchromeextensions.com/mv3/side-panel/"
last_modified_at: 2026-01-15
---

Side Panel API in Chrome Extensions

Introduction {#introduction}
- Side Panel: persistent UI panel that opens alongside the page (right side of browser)
- Available since Chrome 114 (Manifest V3 only)
- Replaces the need for popups that close when clicked away
- Requires `"sidePanel"` permission

manifest.json {#manifestjson}
```json
{
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

Basic Side Panel {#basic-side-panel}
```html
<!-- sidepanel.html -->
<!DOCTYPE html>
<html>
<head><style>body { width: 300px; font-family: sans-serif; }</style></head>
<body>
  <h1>My Side Panel</h1>
  <div id="content"></div>
  <script src="sidepanel.js"></script>
</body>
</html>
```

Opening the Side Panel {#opening-the-side-panel}

From User Action (Toolbar Click) {#from-user-action-toolbar-click}
```javascript
// background.js. open side panel when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```
- This replaces popup behavior. clicking icon opens side panel instead

Programmatically {#programmatically}
```javascript
// From background service worker
chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });

// For a specific tab
chrome.sidePanel.open({ tabId: tab.id });
```
- Must be triggered by a user gesture (click handler, keyboard shortcut)

Per-Tab Side Panels {#per-tab-side-panels}
```javascript
// Set different panel content for specific tabs
chrome.sidePanel.setOptions({
  tabId: tab.id,
  path: "tab-specific-panel.html",
  enabled: true
});
```
- Different tabs can show different panel content
- Set `enabled: false` to disable side panel for specific tabs

chrome.sidePanel API {#chromesidepanel-api}

setOptions(options) {#setoptionsoptions}
```javascript
chrome.sidePanel.setOptions({
  path: "sidepanel.html",      // Panel HTML file
  enabled: true,                // Enable/disable
  tabId: tab.id                 // Optional: tab-specific
});
```

getOptions(options) {#getoptionsoptions}
```javascript
const options = await chrome.sidePanel.getOptions({ tabId: tab.id });
console.log(options.path, options.enabled);
```

setPanelBehavior(behavior) {#setpanelbehaviorbehavior}
```javascript
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

getPanelBehavior() {#getpanelbehavior}
```javascript
const behavior = await chrome.sidePanel.getPanelBehavior();
console.log(behavior.openPanelOnActionClick);
```

open(options) *(Chrome 116+)* {#openoptions-chrome-116}
```javascript
await chrome.sidePanel.open({ windowId: windowId });
```
- Must be called in response to a user gesture

Side Panel vs Popup {#side-panel-vs-popup}
| Feature | Side Panel | Popup |
|---------|-----------|-------|
| Persistence | Stays open while browsing | Closes on click outside |
| Size | Full browser height, ~300-400px wide | Fixed small window |
| Tab awareness | Can change per-tab | Same for all tabs |
| User interaction | Doesn't interrupt browsing | Requires focus |
| Use case | Reference content, tools, chat | Quick actions, settings |

Communication with Background {#communication-with-background}
```typescript
// sidepanel.js. using @theluckystrike/webext-messaging
const messenger = createMessenger<Messages>();

// Get data from background
const data = await messenger.sendMessage('getData', { key: 'value' });

// Listen for updates from background
messenger.onMessage('updatePanel', (data) => {
  document.getElementById('content').textContent = JSON.stringify(data);
});
```

Reactive Updates with Storage {#reactive-updates-with-storage}
```typescript
// sidepanel.js. react to storage changes in real-time
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const storage = createStorage(defineSchema({ notes: 'string', theme: 'string' }), 'local');

// Watch for changes (e.g., from background or options page)
storage.watch('notes', (newValue) => {
  document.getElementById('notes').textContent = newValue;
});

// Save user input
document.getElementById('input').addEventListener('input', async (e) => {
  await storage.set('notes', e.target.value);
});
```

Common Patterns {#common-patterns}

Reading Assistant {#reading-assistant}
- Show article summary alongside the page
- Extract content via content script, display in panel

Note-Taking Tool {#note-taking-tool}
- Persistent notes panel while browsing
- Save per-tab or global notes

Chat/AI Assistant {#chatai-assistant}
- Sidebar chat interface
- Context-aware based on current page

Developer Tools {#developer-tools}
- Custom inspection panel
- API response viewer

Best Practices {#best-practices}
- Design for 300-400px width. side panels are narrow
- Use responsive CSS. panel may be resized
- Persist panel state with `@theluckystrike/webext-storage`. panel may be closed/reopened
- Load content lazily. panel may not be visible
- Consider both `openPanelOnActionClick` and popup. let user choose in options

Common Mistakes {#common-mistakes}
- Calling `open()` without user gesture. throws an error
- Not handling panel close/reopen. state is lost unless persisted
- Making panel too wide. takes too much page space
- Forgetting `"sidePanel"` permission. API calls fail
- Not testing per-tab panels. each tab can have different state
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
