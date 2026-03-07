# Chrome Action API Complete Guide

The Chrome Action API (`chrome.action`) is the modern API for toolbar actions in Chrome Extensions (Manifest V3). It replaces the deprecated `chrome.browserAction` API from Manifest V2. This guide covers all aspects of the Action API for building dynamic toolbar extensions.

## Overview

The Action API controls the extension's icon in the Chrome toolbar. Unlike browser actions that appear on all pages, actions can be scoped to specific tabs or work globally.

## API Methods Reference

### 1. chrome.action.setIcon — Dynamic Icon Changes

Set dynamic icons based on context, state, or user actions.

```javascript
// Using an image path
chrome.action.setIcon({
  tabId: tab.id,
  path: {
    "16": "images/icon16.png",
    "32": "images/icon32.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
});

// Using ImageData (for programmatic icon generation)
chrome.action.setIcon({
  tabId: tab.id,
  imageData: canvasToImageData(canvas)
});
```

**Note**: Icons can be set per-tab or globally (omit `tabId`). Use multiple sizes for high-DPI displays.

### 2. chrome.action.setTitle — Dynamic Tooltip

Set the tooltip (hover text) for the action icon.

```javascript
// Per-tab tooltip
chrome.action.setTitle({
  tabId: tab.id,
  title: "Custom tooltip text"
});

// Global tooltip
chrome.action.setTitle({
  title: "Extension name - Click to open"
});
```

### 3. chrome.action.setBadgeText — Badge Text

Display text overlaid on the icon (notifications, counters, status).

```javascript
// Set badge text (max 4 characters)
chrome.action.setBadgeText({
  tabId: tab.id,
  text: "3"
});

// Clear badge
chrome.action.setBadgeText({
  tabId: tab.id,
  text: ""
});
```

### 4. chrome.action.setBadgeBackgroundColor — Badge Color

Set the background color of the badge.

```javascript
// Using RGBA array
chrome.action.setBadgeBackgroundColor({
  tabId: tab.id,
  color: [255, 0, 0, 255]  // Red
});

// Using hex string
chrome.action.setBadgeBackgroundColor({
  tabId: tab.id,
  color: "#FF0000"
});

// Using CSS color name
chrome.action.setBadgeBackgroundColor({
  tabId: tab.id,
  color: "red"
});
```

### 5. chrome.action.setBadgeTextColor — Badge Text Color

Set the text color of the badge (Manifest V3.1+).

```javascript
chrome.action.setBadgeTextColor({
  tabId: tab.id,
  color: "#FFFFFF"  // White text
});
```

### 6. chrome.action.setPopup — Dynamic Popup

Set or change the popup displayed when clicking the action.

```javascript
// Set popup for specific tab
chrome.action.setPopup({
  tabId: tab.id,
  popup: "popup.html"
});

// Clear popup (makes action trigger onClicked)
chrome.action.setPopup({
  tabId: tab.id,
  popup: ""
});

// Global popup
chrome.action.setPopup({
  popup: "popup.html"
});
```

### 7. chrome.action.openPopup — Programmatic Popup Opening

Open the extension popup programmatically (Manifest V3.2+).

```javascript
// Open popup in specific window
chrome.action.openPopup({
  windowId: chrome.windows.WINDOW_ID_CURRENT
});

// Note: Requires user gesture in most contexts
```

### 8. chrome.action.enable — Enabling the Action

Enable the action for a specific tab or globally.

```javascript
// Enable for specific tab
chrome.action.enable(tab.id);

// Enable globally
chrome.action.enable();
```

### 9. chrome.action.disable — Disabling the Action

Disable the action for a specific tab or globally.

```javascript
// Disable for specific tab
chrome.action.disable(tab.id);

// Disable globally
chrome.action.disable();
```

### 10. chrome.action.isEnabled — Checking Enabled State

Check if the action is enabled for a specific tab.

```javascript
async function checkEnabled(tabId) {
  const isEnabled = await chrome.action.isEnabled(tabId);
  console.log("Action enabled:", isEnabled);
  return isEnabled;
}
```

### 11. chrome.action.getUserSettings — User Pinned State

Get user settings for the action (whether pinned to toolbar).

```javascript
chrome.action.getUserSettings((userSettings) => {
  console.log("Is pinned:", userSettings.isOnToolbar);
  console.log("Tab ID:", userSettings.tabId);
});
```

### 12. chrome.action.onClicked — Click Handler

Handle clicks when no popup is set.

```javascript
// Background service worker
chrome.action.onClicked.addListener((tab) => {
  console.log("Action clicked on tab:", tab.id);
  
  // Perform action (e.g., inject content script, send message)
  chrome.tabs.sendMessage(tab.id, { action: "toggle" });
});
```

**Important**: This event only fires when the action has NO popup set. If you set a popup, the click opens the popup instead.

## Migrating from chrome.browserAction (MV2)

The Action API is the Manifest V3 replacement for browserAction. Key differences:

| browserAction (MV2) | Action (MV3) |
|-------------------|--------------|
| `chrome.browserAction` | `chrome.action` |
| Always in toolbar | Can be enabled/disabled per-tab |
| No per-tab enable/disable | Full per-tab control |
| Badge only background | Badge text color added |

```javascript
// MV2 (browserAction)
chrome.browserAction.setBadgeText({ text: "5" });
chrome.browserAction.setBadgeBackgroundColor({ color: "red" });

// MV3 (action)
chrome.action.setBadgeText({ text: "5" });
chrome.action.setBadgeBackgroundColor({ color: "red" });
```

## Per-Tab vs Global State

Actions support two state scopes:

### Global State
Applies to all tabs unless overridden per-tab:
```javascript
chrome.action.setTitle({ title: "Global Title" });
chrome.action.setIcon({ path: "icon.png" });
```

### Per-Tab State
Overrides global state for specific tabs:
```javascript
chrome.action.setTitle({
  tabId: specificTabId,
  title: "Tab-specific Title"
});
```

**Best Practice**: Set global defaults in `manifest.json`, use per-tab state for dynamic behavior.

## Building Dynamic Toolbar Extensions

### Example: Notification Counter Extension

```javascript
// background.js - Full implementation example

// Update badge with notification count
async function updateNotificationBadge(tabId, count) {
  if (count > 0) {
    await chrome.action.setBadgeText({
      tabId: tabId,
      text: count > 99 ? "99+" : String(count)
    });
    await chrome.action.setBadgeBackgroundColor({
      tabId: tabId,
      color: "#FF0000"
    });
  } else {
    await chrome.action.setBadgeText({
      tabId: tabId,
      text: ""
    });
  }
}

// Set icon based on state
async function setIconForTab(tabId, isActive) {
  await chrome.action.setIcon({
    tabId: tabId,
    path: isActive ? "icon-active.png" : "icon-inactive.png"
  });
}

// Handle action click
chrome.action.onClicked.addListener(async (tab) => {
  // Toggle extension functionality
  await chrome.tabs.sendMessage(tab.id, { action: "toggle" });
  
  // Update icon to show active state
  const isEnabled = await chrome.action.isEnabled(tab.id);
  await chrome.action.setIcon({
    tabId: tab.id,
    path: isEnabled ? "icon-active.png" : "icon-inactive.png"
  });
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await chrome.action.setBadgeText({ tabId, text: "" });
});
```

### Example: Page Context Action

```javascript
// Only show action on specific domains
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    if (tab.url.includes("example.com")) {
      chrome.action.enable(tabId);
      chrome.action.setTitle({
        tabId,
        title: "Action for Example.com"
      });
    } else {
      chrome.action.disable(tabId);
    }
  }
});
```

## manifest.json Configuration

```json
{
  "name": "My Action Extension",
  "version": "1.0",
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_icon": {
      "16": "images/icon16.png",
      "32": "images/icon32.png"
    },
    "default_title": "My Extension",
    "default_popup": "popup.html"
  },
  "permissions": ["activeTab", "scripting"]
}
```

## Best Practices

1. **Always provide fallback icons**: Include multiple sizes for different screen densities
2. **Use per-tab state**: For tab-specific features, use per-tab state to avoid conflicts
3. **Clear badges on tab close**: Prevent stale data by cleaning up on `tabs.onRemoved`
4. **Check enabled state**: Use `isEnabled()` before performing tab-specific actions
5. **Handle MV2 migration**: Provide migration guides for users upgrading from Manifest V2
6. **Respect user pinned state**: Check `getUserSettings()` before assuming the icon is visible

## Additional Resources

- [Official Chrome Action API Reference](https://developer.chrome.com/docs/extensions/reference/api/action)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro)
- [Extension Icons Best Practices](https://developer.chrome.com/docs/extensions/reference/manifest/icons)

## Summary

The Chrome Action API provides comprehensive control over your extension's toolbar presence. Use dynamic icon changes, badges, and tooltips to create responsive, context-aware extensions. Take advantage of per-tab state management to build sophisticated extensions that adapt to the user's browsing context.
