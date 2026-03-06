# MV3 Action API Guide

The Chrome Extension Manifest V3 (MV3) unified the `browserAction` and `pageAction` APIs into a single `chrome.action` API. This guide covers migration patterns, API usage, and common workflows.

---

## Overview

In Manifest V2, Chrome had two separate APIs for extension actions:

- **`browserAction`**: Appears in the Chrome toolbar, always visible
- **`pageAction`**: Appears in the address bar, only for specific pages

In MV3, these are merged into a single **`chrome.action`** API that works as either type depending on how you configure it.

---

## Migration Table

| MV2 | MV3 |
|-----|-----|
| `chrome.browserAction` | `chrome.action` |
| `chrome.pageAction` | `chrome.action` |
| `"browser_action"` manifest key | `"action"` |
| `"page_action"` manifest key | `"action"` |

---

## Manifest Change

### Before (MV2)

```json
{
  "manifest_version": 2,
  "name": "My Extension",
  "version": "1.0",
  "browser_action": {
    "default_icon": "icon.png",
    "default_title": "My Extension",
    "default_popup": "popup.html"
  }
}
```

### After (MV3)

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "action": {
    "default_icon": "icon.png",
    "default_title": "My Extension",
    "default_popup": "popup.html"
  }
}
```

---

## Action API Methods

| Method | Description |
|--------|-------------|
| `chrome.action.setIcon(details)` | Set the icon for the action |
| `chrome.action.setTitle(details)` | Set the tooltip title |
| `chrome.action.setBadgeText(details)` | Set the badge text overlay |
| `chrome.action.setBadgeBackgroundColor(details)` | Set the badge background color |
| `chrome.action.setPopup(details)` | Set or remove the popup |
| `chrome.action.enable([tabId])` | Enable the action |
| `chrome.action.disable([tabId])` | Disable the action |
| `chrome.action.setBadgeTextColor(details)` | Set the badge text color |
| `chrome.action.getUserSettings()` | Get user-specified settings for the action |
| `chrome.action.isEnabled([tabId])` | Check if the action is enabled |
| `chrome.action.openPopup()` | Open the extension popup programmatically |
| `chrome.action.onClicked` | Event fired when action is clicked (no popup) |

All setter/getter methods accept an optional `tabId` parameter to target specific tabs. Tab-specific settings take priority over global settings.

---

## Per-Tab vs Global

Most Action API methods accept an optional `tabId` parameter:

```ts
// Set badge for a specific tab
chrome.action.setBadgeText({ text: "5", tabId: 12345 });

// Set badge globally (all tabs)
chrome.action.setBadgeText({ text: "5" });

// Enable only for a specific tab
chrome.action.enable(12345);

// Disable globally
chrome.action.disable();
```

When `tabId` is omitted, the operation applies globally.

---

## Using with @theluckystrike/webext-messaging

The `@theluckystrike/webext-messaging` package enables communication between your popup, content scripts, and service worker. Here's how to use it with the Action API:

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

// Create messenger for popup <-> service worker communication
const messenger = createMessenger();

// Toggle feature from popup and update badge
async function toggleFeature(enabled: boolean) {
  // Send message to service worker
  await messenger.send("toggle-feature", { enabled });
  
  // Update badge globally (omit tabId for global)
  chrome.action.setBadgeText({
    text: enabled ? "ON" : ""
  });

  chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#4CAF50" : "#999999"
  });
}

// Listen for messages from service worker
messenger.onMessage("feature-status", (message) => {
  chrome.action.setBadgeText({ text: message.active ? "●" : "" });
});
```

---

## Using with @theluckystrike/webext-storage

The `@theluckystrike/webext-storage` package provides typed storage with automatic persistence. This is essential for maintaining badge state across service worker restarts.

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// Define storage schema
const storageSchema = defineSchema({
  badgeState: {
    enabled: { type: "boolean", default: false },
    count: { type: "number", default: 0 }
  }
});

const storage = createStorage(storageSchema);

// Restore badge on startup (service worker initialization)
async function restoreBadgeState() {
  const { badgeState } = await storage.get("badgeState");
  
  chrome.action.setBadgeText({
    text: badgeState.enabled ? String(badgeState.count) : ""
  });
  
  chrome.action.setBadgeBackgroundColor({
    color: badgeState.enabled ? "#4CAF50" : "#999999"
  });
}

// Update badge when state changes
async function updateBadge(enabled: boolean, count: number) {
  await storage.set("badgeState", { enabled, count });
  
  chrome.action.setBadgeText({
    text: enabled ? String(count) : ""
  });
  
  chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#4CAF50" : "#999999"
  });
}

// Call on service worker startup
restoreBadgeState();
```

---

## Dynamic Popup

By default, clicking an action with a popup opens that popup. To handle clicks programmatically, you can disable the popup:

### Disable popup to use onClicked

```ts
// Remove popup to enable onClicked event
chrome.action.setPopup({ popup: "" });

// Now clicks will fire the onClicked event
chrome.action.onClicked.addListener((tab) => {
  console.log("Action clicked on tab:", tab.id);
});
```

### Re-enable popup

```ts
// Restore popup
chrome.action.setPopup({ popup: "popup.html" });
```

---

## Common Patterns

### Badge Counter

```ts
async function incrementBadge(tabId: number) {
  const currentText = await chrome.action.getBadgeText({ tabId });
  const current = parseInt(currentText || "0", 10);
  const next = current + 1;
  await chrome.action.setBadgeText({ text: String(next), tabId });
}
```

### Toggle On/Off

```ts
let isEnabled = false;

chrome.action.onClicked.addListener(async (tab) => {
  isEnabled = !isEnabled;
  
  chrome.action.setBadgeText({
    text: isEnabled ? "ON" : "",
    tabId: tab.id
  });
  
  chrome.action.setBadgeBackgroundColor({
    color: isEnabled ? "#4CAF50" : "#999999",
    tabId: tab.id
  });
});
```

### Per-Tab State

```ts
const tabStates = new Map<number, boolean>();

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  
  const current = tabStates.get(tab.id) || false;
  const next = !current;
  
  tabStates.set(tab.id, next);
  
  chrome.action.setBadgeText({
    text: next ? "●" : "",
    tabId: tab.id
  });
});
```

### Dynamic Popup

```ts
// Set different popups based on context
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-settings") {
    chrome.action.setPopup({ popup: "settings.html" });
  } else {
    chrome.action.setPopup({ popup: "popup.html" });
  }
});
```

---

## Gotchas

### onClicked only fires without popup

If you set a popup with `setPopup` or in the manifest, `onClicked` will **not** fire. Remove the popup to use the click event:

```ts
// This will NOT trigger onClicked
chrome.action.setPopup({ popup: "popup.html" });

// This WILL trigger onClicked
chrome.action.setPopup({ popup: "" });
```

### Badge text limit

Badge text should use **4 or fewer characters** due to limited space. Longer text may be truncated depending on character width:

```ts
chrome.action.setBadgeText({ text: "12345" }); // May be truncated visually
```

### Per-tab state lost on navigation

Per-tab badge state is cleared when the user navigates to a new URL in that tab. Use storage to persist state:

```ts
// Store state in storage, not memory
await storage.set("tabState", { [tabId]: { active: true } });
```

### Service worker restarts

Badge state set directly on `chrome.action` is lost when the service worker terminates. Always use `@theluckystrike/webext-storage` to persist state.

---

## Find-and-Replace Migration

Use these simple substitutions to migrate from MV2 to MV3:

| Find | Replace |
|------|---------|
| `chrome.browserAction` | `chrome.action` |
| `chrome.pageAction` | `chrome.action` |
| `"browser_action"` | `"action"` |
| `"page_action"` | `"action"` |
| `tab.id` in badge methods | `tabId: tab.id` |

### Example transformation

```ts
// MV2
chrome.browserAction.setBadgeText({ text: "5", tabId: tab.id });

// MV3
chrome.action.setBadgeText({ text: "5", tabId: tab.id });
```

---

## Summary

- MV3 unifies `browserAction` and `pageAction` into `chrome.action`
- Most methods support per-tab targeting via optional `tabId`
- Use `@theluckystrike/webext-messaging` for popup ↔ service worker communication
- Use `@theluckystrike/webext-storage` to persist badge state across restarts
- Remove popup to handle clicks via `onClicked`
- Badge text recommended to be 4 or fewer characters
