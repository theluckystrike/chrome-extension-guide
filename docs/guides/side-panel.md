---
layout: default
title: "Chrome Extension Side Panel API. How to Build a Sidebar UI"
description: "Learn how to build a sidebar UI in Chrome extensions using the chrome.sidePanel API. This guide covers manifest setup, open/close methods, per-tab panels, and UX patterns."
canonical_url: "https://bestchromeextensions.com/guides/side-panel/"
---

Chrome Extension Side Panel API. How to Build a Sidebar UI

Introduction {#introduction}

The Chrome Side Panel API, introduced in Chrome 114, provides a modern way to create persistent sidebar UIs for your Chrome extension. Unlike popup windows that disappear when you click away, side panels remain open alongside the web page, giving users easy access to your extension's features without interrupting their browsing experience.

This guide covers everything you need to build a sidebar UI: manifest configuration, the chrome.sidePanel API methods, per-tab panel customization, and UX best practices for creating a polished user experience.

Manifest Setup {#manifest-setup}

To use the Side Panel API, you need to declare the `sidePanel` permission in your manifest.json and specify a default panel path.

```json
{
  "name": "My Side Panel Extension",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

The `side_panel` key defines the default HTML file that loads when the side panel opens. This file should contain your complete sidebar UI, including any CSS and JavaScript needed for the panel's functionality.

The chrome.sidePanel API {#the-chromesidepanel-api}

The chrome.sidePanel API provides methods to control the side panel's behavior, content, and visibility. Here's an overview of the main methods:

Setting Panel Behavior {#setting-panel-behavior}

By default, clicking the extension's toolbar icon opens the action popup. You can redirect this to open the side panel instead:

```javascript
// background.js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

This single line changes the toolbar icon behavior to show the side panel when clicked. The panel persists open until the user explicitly closes it or navigates to a new tab where it's disabled.

Opening the Side Panel Programmatically {#opening-the-side-panel-programmatically}

You can open the side panel from your background script or content script using the `open()` method:

```javascript
// Open in the current window
await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });

// Open for a specific tab
await chrome.sidePanel.open({ tabId: tab.id });
```

The `open()` method requires a user gesture (such as a click or keyboard shortcut) to work. If you try to call it without a user gesture, it will fail silently or throw an error.

Setting Panel Options {#setting-panel-options}

Use `setOptions()` to configure the panel's content and visibility:

```javascript
// Set a global default panel
chrome.sidePanel.setOptions({
  path: "sidepanel.html",
  enabled: true
});

// Set a tab-specific panel
chrome.sidePanel.setOptions({
  tabId: tab.id,
  path: "tab-specific-panel.html",
  enabled: true
});
```

Getting Panel Options {#getting-panel-options}

Retrieve the current panel configuration:

```javascript
// Get options for a specific tab
const options = await chrome.sidePanel.getOptions({ tabId: tab.id });
console.log(options.path, options.enabled);
```

Per-Tab Side Panels {#per-tab-side-panels}

One of the most powerful features of the Side Panel API is the ability to show different content for different tabs. This is perfect for extensions that need context-aware content.

```javascript
// content-script.js or background.js
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('github.com')) {
      // Show GitHub-specific panel
      chrome.sidePanel.setOptions({
        tabId: tabId,
        path: "github-panel.html",
        enabled: true
      });
    } else if (tab.url.includes('docs.')) {
      // Show documentation-specific panel
      chrome.sidePanel.setOptions({
        tabId: tabId,
        path: "docs-panel.html",
        enabled: true
      });
    } else {
      // Disable panel for non-matching tabs
      chrome.sidePanel.setOptions({
        tabId: tabId,
        enabled: false
      });
    }
  }
});
```

This pattern allows your extension to provide relevant tools based on the current page, making the side panel feel intelligent and context-aware.

Closing the Side Panel {#closing-the-side-panel}

Users can close the side panel by clicking the close button (X) or by toggling it off. From code, you cannot directly close the side panel, the user must take action. However, you can disable it for specific tabs or windows:

```javascript
// Disable side panel for a specific tab
chrome.sidePanel.setOptions({
  tabId: tabId,
  enabled: false
});
```

UX Patterns and Best Practices {#ux-patterns-and-best-practices}

Responsive Width Design {#responsive-width-design}

Side panels have a default width, but users can resize them. Design your panel to handle varying widths gracefully:

```css
/* sidepanel.css */
body {
  min-width: 250px;
  max-width: 400px;
  width: 100%;
  box-sizing: border-box;
}

.panel-content {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px;
}
```

Communication with the Active Tab {#communication-with-the-active-tab}

Your side panel often needs to interact with the current page. Use message passing:

```javascript
// sidepanel.js. Send message to content script
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: "getData" }, (response) => {
    console.log("Page data:", response);
  });
});
```

```javascript
// content-script.js. Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getData") {
    sendResponse({ data: document.title, url: window.location.href });
  }
});
```

Persisting User Preferences {#persisting-user-preferences}

Store user settings and panel preferences using the storage API:

```javascript
// sidepanel.js
async function loadPreferences() {
  const prefs = await chrome.storage.local.get(['theme', 'collapsedSections']);
  applyTheme(prefs.theme);
  restoreSections(prefs.collapsedSections);
}

document.getElementById('theme-toggle').addEventListener('click', async () => {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  await chrome.storage.local.set({ theme: newTheme });
  applyTheme(newTheme);
});
```

Keyboard Shortcuts Integration {#keyboard-shortcuts-integration}

The side panel works smoothly with keyboard shortcuts defined in your manifest:

```json
{
  "commands": {
    "toggle-side-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Toggle the side panel"
    }
  }
}
```

```javascript
// background.js
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-side-panel") {
    // Check if panel is open and toggle accordingly
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const options = await chrome.sidePanel.getOptions({ tabId: tabs[0].id });
    
    if (options.enabled) {
      chrome.sidePanel.setOptions({ tabId: tabs[0].id, enabled: false });
    } else {
      await chrome.sidePanel.open({ tabId: tabs[0].id });
    }
  }
});
```

Common Issues and Solutions {#common-issues-and-solutions}

Panel Not Opening {#panel-not-opening}

If your side panel doesn't open, check these common issues:
- Missing `sidePanel` permission in manifest
- Incorrect path in `side_panel.default_path`
- Calling `open()` without a user gesture

Content Script Not Running in Panel {#content-script-not-running-in-panel}

Side panel HTML files don't load content scripts automatically. If you need scripts in your panel, include them directly:

```html
<!-- sidepanel.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div id="app"></div>
  <script src="sidepanel.js"></script>
</body>
</html>
```

Memory Management {#memory-management}

Since side panels persist, be mindful of memory usage:
- Clean up event listeners when the panel unloads
- Release resources when disabled for specific tabs
- Use `chrome.tabs.onRemoved` to clean up tab-specific resources

Conclusion {#conclusion}

The Side Panel API opens up new possibilities for Chrome extension UIs. By providing a persistent, context-aware sidebar, you can create more engaging and useful extensions that don't interrupt the user's workflow. Remember to test with different panel widths, integrate with keyboard shortcuts, and use per-tab panels to provide relevant content for each page your users visit.
