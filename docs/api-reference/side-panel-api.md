---
layout: default
title: "Chrome Side Panel API Complete Reference"
description: "The Chrome Side Panel API provides a persistent side panel UI that displays alongside web content, offering an integrated experience for extensions that need to display information while users browse."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/side-panel-api/"
---

# chrome.sidePanel API Reference

The `chrome.sidePanel` API provides a persistent side panel UI that displays alongside web content. Introduced in Chrome 114, it offers a more integrated experience than popups for extensions that need to display information while users browse.

## Overview {#overview}

- **Persistent side panel UI** alongside web content
- **Permission required**: `"sidePanel"`
- **Minimum Chrome version**: 114+
- Full access to `chrome.*` APIs from within the panel

## Manifest Declaration {#manifest-declaration}

```json
{
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

The `side_panel` manifest key defines the default panel page. The permission grants access to the `chrome.sidePanel` API.

## API Methods {#api-methods}

### chrome.sidePanel.setOptions(details) {#chromesidepanelsetoptionsdetails}

Configures the side panel for a specific tab or globally.

```typescript
// Set global panel (same for all tabs)
await chrome.sidePanel.setOptions({ path: "sidepanel.html", enabled: true });

// Set panel for specific tab
await chrome.sidePanel.setOptions({
  tabId: 123,
  path: "page-specific-panel.html",
  enabled: true
});

// Disable panel for specific tab
await chrome.sidePanel.setOptions({ tabId: 123, enabled: false });
```

**Parameters:**
- `details` (object): Configuration options
  - `path` (string): Path to the HTML file
  - `enabled` (boolean): Whether the panel is enabled
  - `tabId` (integer, optional): Tab ID for per-tab configuration

### chrome.sidePanel.getOptions(details) {#chromesidepanelgetoptionsdetails}

Retrieves the current side panel configuration.

```typescript
// Get global options
const globalOptions = await chrome.sidePanel.getOptions({});

// Get per-tab options
const tabOptions = await chrome.sidePanel.getOptions({ tabId: 123 });
```

**Parameters:**
- `details` (object)
  - `tabId` (integer, optional): Tab ID to query

**Returns:** Promise resolving to an object with `path` and `enabled` properties.

### chrome.sidePanel.open(details) — Chrome 116+ {#chromesidepanelopendetails-chrome-116}

Opens the side panel programmatically. Requires a user gesture.

```typescript
// Open panel in current tab
await chrome.sidePanel.open({});

// Open panel in specific tab
await chrome.sidePanel.open({ tabId: 123 });

// Open panel in specific window
await chrome.sidePanel.open({ windowId: 99 });
```

**Parameters:**
- `details` (object)
  - `tabId` (integer, optional): Target tab
  - `windowId` (integer, optional): Target window

**Note:** This method requires a user gesture (e.g., action click, keyboard shortcut).

### chrome.sidePanel.setPanelBehavior(details) {#chromesidepanelsetpanelbehaviordetails}

Configures behavior for opening the panel via toolbar icon clicks.

```typescript
// Open panel when toolbar icon is clicked
await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Disable opening on icon click
await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
```

**Parameters:**
- `details` (object)
  - `openPanelOnActionClick` (boolean): Whether clicking the action icon opens the side panel

### chrome.sidePanel.getPanelBehavior() {#chromesidepanelgetpanelbehavior}

Retrieves the current panel behavior configuration.

```typescript
const behavior = await chrome.sidePanel.getPanelBehavior();
console.log(behavior.openPanelOnActionClick);
```

**Returns:** Promise resolving to an object with `openPanelOnActionClick` boolean.

## Per-Tab vs Global Configuration {#per-tab-vs-global-configuration}

### Global Panel (Default) {#global-panel-default}

Omit `tabId` to configure a global panel that appears the same for all tabs:

```typescript
await chrome.sidePanel.setOptions({
  path: "global-panel.html",
  enabled: true
});
```

### Per-Tab Panel {#per-tab-panel}

Provide `tabId` to configure different panels for different tabs:

```typescript
// Different content for different sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const url = new URL(tab.url);
    if (url.hostname.includes("github.com")) {
      chrome.sidePanel.setOptions({
        tabId,
        path: "github-panel.html",
        enabled: true
      });
    } else if (url.hostname.includes("youtube.com")) {
      chrome.sidePanel.setOptions({
        tabId,
        path: "youtube-panel.html",
        enabled: true
      });
    }
  }
});
```

### Precedence {#precedence}

Per-tab configuration overrides global configuration for that specific tab.

## Communication {#communication}

The side panel does not have dedicated events. Use standard message passing:

### From Panel to Service Worker {#from-panel-to-service-worker}

```typescript
// In side panel
chrome.runtime.sendMessage({ type: "GET_DATA", payload: { tabId: 123 } });
```

### From Service Worker to Panel {#from-service-worker-to-panel}

```typescript
// In service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DATA_UPDATE") {
    // Send to panel
    chrome.tabs.sendMessage(message.tabId, message.data);
  }
});
```

### Using @theluckystrike/webext-messaging {#using-theluckystrikewebext-messaging}

For type-safe messaging, use the `@theluckystrike/webext-messaging` package:

```typescript
// Define message types
interface SidePanelMessages {
  GET_ANALYTICS: { url: string };
  ANALYTICS_DATA: { views: number; clicks: number };
}
```

The side panel has full `chrome.*` API access, similar to popup windows.

## Differences from Popup {#differences-from-popup}

| Feature | Side Panel | Popup |
|---------|-----------|-------|
| Persistence | Stays open while browsing | Closes on focus loss |
| Size | Larger UI surface | Limited by browser |
| Content updates | Can update as user navigates | Static until reopened |
| Multiple instances | Single instance per window | One per action click |
| Closing | Must close explicitly | Closes automatically |

## Code Examples {#code-examples}

### Basic Setup {#basic-setup}

**manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "My Side Panel Extension",
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

**sidepanel.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 16px; }
  </style>
</head>
<body>
  <h1>Side Panel</h1>
  <div id="content">Loading...</div>
  <script src="sidepanel.js"></script>
</body>
</html>
```

### Open Panel on Toolbar Icon Click {#open-panel-on-toolbar-icon-click}

```typescript
// background.js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

This connects the side panel to the extension's toolbar icon.

### Two-Way Messaging with Service Worker {#two-way-messaging-with-service-worker}

**sidepanel.js:**
```typescript
// Send message to service worker
async function fetchData() {
  const tabId = chrome.runtime.id;
  const response = await chrome.runtime.sendMessage({
    type: "FETCH_ANALYTICS",
    tabId
  });
  document.getElementById("content").textContent = JSON.stringify(response);
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message) => {
  console.log("Received:", message);
});
```

**background.js:**
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_ANALYTICS") {
    // Process request and respond
    sendResponse({ data: "example" });
  }
});
```

### Dynamic Content Based on Active Tab {#dynamic-content-based-on-active-tab}

```typescript
// sidepanel.js - update content when tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updatePanelContent(tab.url);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    updatePanelContent(tab.url);
  }
});

function updatePanelContent(url) {
  const urlObj = new URL(url);
  document.getElementById("domain").textContent = urlObj.hostname;
}
```

## Cross-References {#cross-references}

- [permissions/sidePanel.md](../permissions/sidePanel.md) — Permission details
- [mv3/side-panel.md](../mv3/side-panel.md) — Manifest V3 side panel
- [patterns/side-panel.md](../patterns/side-panel.md) — Usage patterns
## Frequently Asked Questions

### How do I open the side panel?
Use chrome.sidePanel.setOptions() to configure behavior, and users can open it via the extension icon in the toolbar.

### Can the side panel open automatically?
Yes, use the "side_panel" permission with "openPanelOnActionClick": true to open when users click your extension icon.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
