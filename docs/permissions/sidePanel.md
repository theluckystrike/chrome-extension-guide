---
title: "sidePanel Permission"
description: "API 114+ None — this permission does not trigger a warning at ins..."
permalink: /permissions/sidePanel/
category: permissions
order: 38
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/sidePanel/"
---

# sidePanel Permission

## Overview {#overview}

- **Permission string:** `"sidePanel"`
- **Grants access to:** `chrome.sidePanel` API
- **Minimum Chrome version:** 114+
- **User warning:** None — this permission does not trigger a warning at install time

The sidePanel API provides a persistent UI alongside web content, allowing users to view additional information or tools without leaving the current page.

## API Methods {#api-methods}

### `chrome.sidePanel.setOptions(options)` {#chromesidepanelsetoptionsoptions}

Configures the side panel for a specific tab or globally.

```typescript
interface SetOptionsParams {
  tabId?: number;    // Optional: target specific tab
  path?: string;    // HTML file path relative to extension root
  enabled?: boolean; // Enable or disable the panel
}
```

**Example:**
```typescript
// Set global default panel
await chrome.sidePanel.setOptions({
  path: 'sidepanel.html',
  enabled: true
});

// Set panel for specific tab
await chrome.sidePanel.setOptions({
  tabId: 123,
  path: 'tab-specific.html',
  enabled: true
});
```

### `chrome.sidePanel.getOptions(options)` {#chromesidepanelgetoptionsoptions}

Retrieves the current panel configuration.

```typescript
interface GetOptionsParams {
  tabId?: number; // Optional: get config for specific tab
}

// Returns: { path?: string; enabled?: boolean }
const options = await chrome.sidePanel.getOptions({ tabId: 123 });
```

### `chrome.sidePanel.open(options)` {#chromesidepanelopenoptions}

Programmatically opens the side panel. Requires user gesture context.

```typescript
interface OpenParams {
  tabId?: number;     // Optional: open in specific tab
  windowId?: number;  // Optional: open in specific window
}
```

**Example:**
```typescript
// Open panel when action is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Open in current window
await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
```

**Note:** Available in Chrome 116+. Must be called from user gesture context (e.g., action click, keyboard shortcut).

### `chrome.sidePanel.setPanelBehavior(behavior)` {#chromesidepanelsetpanelbehaviorbehavior}

Configures whether clicking the extension action opens the side panel.

```typescript
interface PanelBehavior {
  openPanelOnActionClick: boolean;
}
```

**Example:**
```typescript
// Open panel when toolbar icon is clicked
await chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true
});
```

### `chrome.sidePanel.getPanelBehavior()` {#chromesidepanelgetpanelbehavior}

Retrieves the current panel behavior configuration.

```typescript
const behavior = await chrome.sidePanel.getPanelBehavior();
// Returns: { openPanelOnActionClick: boolean }
```

## Manifest Declaration {#manifest-declaration}

```json
{
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

The `side_panel` key in the manifest specifies the default HTML file to display when the side panel is opened.

## Per-Tab vs Global Panel {#per-tab-vs-global-panel}

### Global Panel {#global-panel}
Set the panel path without a `tabId` to apply the same panel across all tabs:

```typescript
await chrome.sidePanel.setOptions({
  path: 'global-panel.html',
  enabled: true
});
```

### Per-Tab Panel {#per-tab-panel}
Set a specific panel for a particular tab using `tabId`:

```typescript
await chrome.sidePanel.setOptions({
  tabId: targetTab.id,
  path: 'custom-panel.html',
  enabled: true
});
```

### Precedence {#precedence}
Per-tab configuration takes precedence over global configuration when set. A per-tab panel can be disabled by setting `enabled: false` while keeping the global panel active.

```typescript
// Disable panel for specific tab while global panel is enabled
await chrome.sidePanel.setOptions({
  tabId: tabToDisable.id,
  enabled: false
});
```

## Communication {#communication}

The side panel does not have dedicated events. Use Chrome's runtime messaging for communication between the side panel and service worker:

```typescript
// In service worker
chrome.runtime.sendMessage({ type: 'UPDATE_DATA', payload: { ... } });

// In side panel
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_DATA') {
    // Update UI
  }
});
```

The side panel has full access to `chrome.*` APIs, similar to a popup. For structured communication, consider using `@theluckystrike/webext-messaging`.

## Use Cases {#use-cases}

- **Research assistant:** Display notes, annotations, or research findings alongside browsing
- **Translation panel:** Translate page content or show definitions in a sidebar
- **Shopping comparison:** Show prices from other retailers while browsing product pages
- **Reading mode:** Provide a distraction-free reading experience with custom formatting
- **Developer tools:** Show API documentation, debug information, or code snippets
- **Bookmarks manager:** Quick access to saved bookmarks without leaving the current page

## Code Examples {#code-examples}

### Basic Side Panel Setup {#basic-side-panel-setup}

**manifest.json:**
```json
{
  "name": "My Side Panel Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "action": {
    "default_title": "Open Side Panel"
  }
}
```

**sidepanel.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { padding: 16px; font-family: system-ui; }
  </style>
</head>
<body>
  <h1>My Side Panel</h1>
  <div id="content">Welcome!</div>
</body>
</html>
```

**background.js:**
```typescript
// Enable panel on action click
await chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true
});
```

### Per-Tab Panel Switching {#per-tab-panel-switching}

```typescript
// Switch panel based on page content
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  
  if (tab.url?.includes('github.com')) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'panels/github.html',
      enabled: true
    });
  } else if (tab.url?.includes('youtube.com')) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'panels/video-tools.html',
      enabled: true
    });
  } else {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'default-panel.html',
      enabled: true
    });
  }
});
```

### Opening Panel on Action Click {#opening-panel-on-action-click}

```typescript
chrome.action.onClicked.addListener(async (tab) => {
  // First ensure the panel is configured
  await chrome.sidePanel.setOptions({
    path: 'panel.html',
    enabled: true
  });
  
  // Then open it
  await chrome.sidePanel.open({ tabId: tab.id });
});
```

### Messaging Between Side Panel and Service Worker {#messaging-between-side-panel-and-service-worker}

**Service Worker (background.js):**
```typescript
// Listen for messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      sendResponse({ 
        title: activeTab.title, 
        url: activeTab.url 
      });
    });
    return true; // Keep message channel open for async response
  }
});
```

**Side Panel (sidepanel.js):**
```typescript
// Request page info from service worker
async function getPageInfo() {
  const response = await chrome.runtime.sendMessage({ 
    type: 'GET_PAGE_INFO' 
  });
  document.getElementById('page-title').textContent = response.title;
}

document.getElementById('refresh').addEventListener('click', getPageInfo);
```

## Cross-References {#cross-references}

- **Manifest Guide:** `docs/mv3/side-panel.md`
- **Patterns:** `docs/patterns/side-panel.md`
- **Related Permission:** `docs/permissions/tabs.md`
- **Related Permission:** `docs/permissions/scripting.md`

## Frequently Asked Questions

### How do I add a side panel to Chrome?
Declare "side_panel" in your manifest and use chrome.sidePanel.setOptions() to configure its behavior. Users access it via the toolbar icon.

### Can side panels work on all pages?
Yes, you can configure side panels to show on specific URL patterns or allow users to toggle it on any page.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
