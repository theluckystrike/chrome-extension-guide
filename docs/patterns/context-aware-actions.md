---
layout: default
title: "Chrome Extension Context Aware Actions — Best Practices"
description: "Implement context-aware actions based on page and user state."
---

# Context-Aware Extension Actions

## Overview

The `chrome.action` API provides powerful methods to make your extension's toolbar button respond to the current tab context. By passing the `tabId` parameter to action API calls, you can display different icons, badges, popups, and titles for each tab — enabling site-specific behavior and toggle states.

---

## Dynamic Icon Based on State

Change the icon based on whether the extension is active for a specific tab:

```ts
// background.ts
function updateIcon(tabId: number, isActive: boolean) {
  chrome.action.setIcon({
    tabId,
    path: {
      "16": isActive ? "icons/active-16.png" : "icons/inactive-16.png",
      "32": isActive ? "icons/active-32.png" : "icons/inactive-32.png",
    },
  });
}

// Toggle on icon click
chrome.action.onClicked.addListener(async (tab) => {
  const isActive = await getTabState(tab.id!);
  await setTabState(tab.id!, !isActive);
  updateIcon(tab.id!, !isActive);
});
```

---

## Dynamic Badge Per Tab

Display different badge text and colors for each tab:

```ts
// background.ts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;
  
  if (tab.url.includes("github.com")) {
    chrome.action.setBadgeText({ tabId, text: "GH" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#24292e" });
  } else if (tab.url.includes("stackoverflow.com")) {
    chrome.action.setBadgeText({ tabId, text: "?" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#f48024" });
  } else {
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});
```

---

## Dynamic Popup Per Context

Show different popup pages based on the current site:

```ts
// background.ts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  
  if (tab.url.includes("youtube.com")) {
    chrome.action.setPopup({ tabId, popup: "popup-youtube.html" });
  } else if (tab.url.includes("reddit.com")) {
    chrome.action.setPopup({ tabId, popup: "popup-reddit.html" });
  } else {
    chrome.action.setPopup({ tabId, popup: "popup-default.html" });
  }
});
```

---

## Dynamic Title for Contextual Tooltip

Provide contextual information via the hover tooltip:

```ts
chrome.action.setTitle({
  tabId,
  title: `Extension ${isEnabled ? "enabled" : "disabled"} on this page`,
});
```

---

## Enabling/Disabling Per Tab

Control whether the action button is clickable on a per-tab basis:

```ts
// Disable on specific sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url?.includes("chrome://")) {
    chrome.action.disable(tabId);
  } else {
    chrome.action.enable(tabId);
  }
});
```

---

## Declarative Approach with chrome.declarativeContent

Automatically show/hide the action based on page conditions without content scripts:

```ts
// manifest.json
{
  "permissions": ["declarativeContent"],
  "host_permissions": ["*://*.example.com/*"]
}
```

```ts
// background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined);
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostSuffix: "example.com" },
        }),
      ],
      actions: [new chrome.declarativeContent.ShowAction()],
    },
  ]);
});
```

---

## Resetting to Defaults

To clear tab-specific overrides and fall back to global/manifest defaults:

```ts
chrome.action.setPopup({ tabId, popup: '' });    // Clears tab-specific popup (empty string = no popup)
chrome.action.setTitle({ tabId, title: '' });     // Clears tab-specific title, falls back to manifest
```

Note: Tab-specific overrides are automatically cleared when the tab is closed.

---

## Combining with activeTab Permission

Use `activeTab` for on-demand permissions while maintaining context-aware UI:

```ts
// manifest.json
{
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_icon": { "16": "icons/default-16.png" }
  }
}
```

```ts
// background.ts
chrome.action.onClicked.addListener(async (tab) => {
  // Get context-aware icon before executing
  const isEnabled = await getSiteConfig(tab.url);
  chrome.action.setIcon({ tabId: tab.id, path: `icons/${isEnabled ? "on" : "off"}-16.png` });
  
  // Now use activeTab permission to run content script
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => console.log("Running on:", location.href),
  });
});
```

---

## Use Cases

- **Toggle states**: Show active/inactive icon based on page-specific mode
- **Site-specific tools**: Different popup for YouTube, GitHub, etc.
- **Page-aware badges**: Show unread counts, error indicators per tab
- **Conditional availability**: Disable action on restricted pages like chrome:// URLs

---

## Related Patterns

- [Badge Action UI](./badge-action-ui.md) — Comprehensive badge and action button patterns
- [Declarative Content](./declarative-content.md) — Automatic show/hide based on page conditions
- [Action API Reference](../../api-reference/action-api.md) — Full chrome.action API documentation
