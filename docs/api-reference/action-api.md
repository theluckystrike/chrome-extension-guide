---
layout: default
title: "Chrome Action API Complete Reference"
description: "The Chrome Action API controls your extension's toolbar icon in Chrome, enabling popup triggers, badge updates, and dynamic icon changes in Manifest V3."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/action-api/"
---

# Chrome Action API Reference

The `chrome.action` API controls the extension's toolbar icon in Chrome. It replaces the deprecated `chrome.browserAction` API from Manifest V2.

## Overview
- **MV3 replacement** for `chrome.browserAction` (MV2)
- Controls toolbar icon, badge, popup, and click behavior
- Enable via manifest key: `"action": { ... }`
- **No permission required**

## Manifest Declaration
```json
{
  "action": {
    "default_icon": { "16": "icon16.png", "32": "icon32.png" },
    "default_title": "My Extension",
    "default_popup": "popup.html"
  }
}
```
Without a popup, clicks fire `onClicked`.

## Icon Methods
### chrome.action.setIcon(details)
```typescript
await chrome.action.setIcon({ path: "icon.png" });
await chrome.action.setIcon({ path: { "16": "16.png", "32": "32.png" }, tabId: 123 });
```
### chrome.action.getIcon(details)
```typescript
const icon = await chrome.action.getIcon({ tabId: 123 });
```

## Title (Tooltip)
### chrome.action.setTitle(details)
```typescript
await chrome.action.setTitle({ title: "My Extension", tabId: 123 });
```
### chrome.action.getTitle(details)
```typescript
const title = await chrome.action.getTitle({ tabId: 123 });
```

## Badge
### chrome.action.setBadgeText(details)
```typescript
await chrome.action.setBadgeText({ text: "5" });
await chrome.action.setBadgeText({ text: "" }); // Clear
```
### chrome.action.getBadgeText(details)
```typescript
const text = await chrome.action.getBadgeText({ tabId: 123 });
```
### chrome.action.setBadgeBackgroundColor(details)
```typescript
await chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
await chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
```
### chrome.action.getBadgeBackgroundColor(details)
```typescript
const color = await chrome.action.getBadgeBackgroundColor({ tabId: 123 });
```
### chrome.action.setBadgeTextColor(details) — **Chrome 110+**
```typescript
await chrome.action.setBadgeTextColor({ color: "#FFF" });
```
### chrome.action.getBadgeTextColor(details)

## Popup
### chrome.action.setPopup(details)
```typescript
await chrome.action.setPopup({ popup: "popup.html" });
await chrome.action.setPopup({ popup: "" }); // Disable
```
### chrome.action.getPopup(details)
```typescript
const popup = await chrome.action.getPopup({ tabId: 123 });
```
### chrome.action.openPopup() — **Chrome 127+**, user gesture required
```typescript
await chrome.action.openPopup();
```

## Enable/Disable
### chrome.action.enable(tabId?)
```typescript
await chrome.action.enable(123);
```
### chrome.action.disable(tabId?)
```typescript
await chrome.action.disable(123);
```
### chrome.action.isEnabled(tabId?)
```typescript
const isEnabled = await chrome.action.isEnabled(123);
```

## Events
### chrome.action.onClicked
Fires when icon clicked. **Only when NO popup is set.**
```typescript
chrome.action.onClicked.addListener((tab) => {
  console.log("Clicked tab:", tab.id);
});
```

## Per-Tab vs Global
All setters accept optional `tabId` for per-tab overrides. Values reset when tab navigates to new origin.

## Code Examples
**Badge:** `chrome.action.setBadgeText({ text: "5" }); chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });`

**Toggle icon:** `await chrome.action.setIcon({ path: isActive ? "on.png" : "off.png" });`

**Dynamic popup:**
```typescript
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  await chrome.action.setPopup({ popup: tab.url?.startsWith("https://") ? "popup.html" : "", tabId });
});
```

**onClicked:**
```typescript
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => console.toggle() });
});
```

## Cross-References
- [MV3 Action API](../mv3/action-api.md)
- [Badge Action UI Pattern](../patterns/badge-action-ui.md)
- [Popup Patterns](../guides/popup-patterns.md)
