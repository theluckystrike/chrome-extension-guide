---
layout: default
title: "Chrome Extension Page Action Patterns. Best Practices"
description: "Use page actions for tab-specific extension functionality."
canonical_url: "https://bestchromeextensions.com/patterns/page-action-patterns/"
---

Page Action Patterns in MV3

Overview {#overview}

In Manifest V2, extensions had two separate APIs: `chrome.browserAction` for always-visible toolbar buttons and `chrome.pageAction` for buttons that appeared only on specific pages. Chrome  Manifest V3 unifies these into a single `chrome.action` API that can mimic page-action behavior through various patterns.

This guide covers implementing page-action-style functionality in MV3, where the extension action appears only on relevant pages and is hidden or disabled elsewhere.

---

Declarative Content (Recommended) {#declarative-content-recommended}

The most efficient approach uses `chrome.declarativeContent` with `ShowAction` to automatically show/hide the toolbar icon based on URL patterns:

```ts
// background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined);
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostSuffix: "example.com", schemes: ["https", "http"] },
        }),
      ],
      actions: [new chrome.declarativeContent.ShowAction()],
    },
  ]);
});
```

Manifest required:
```json
{
  "permissions": ["declarativeContent"],
  "host_permissions": ["*://*.example.com/*"]
}
```

---

URL-Based Toggle (Imperative) {#url-based-toggle-imperative}

For more complex logic beyond URL matching, listen to tab updates and manually enable/disable:

```ts
// background.ts
const RELEVANT_DOMAINS = ["github.com", "stackoverflow.com"];

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  
  const isRelevant = RELEVANT_DOMAINS.some(domain => 
    tab.url!.includes(domain)
  );
  
  if (isRelevant) {
    chrome.action.enable(tabId);
    chrome.action.setTitle({ tabId, title: "Click to analyze page" });
  } else {
    chrome.action.disable(tabId);
    chrome.action.setTitle({ tabId, title: "Not available on this page" });
  }
});
```

---

Content-Based Activation {#content-based-activation}

For conditions beyond URL matching (e.g., page content detection), use a content script that messages the background:

Content script (content.ts):
```ts
// Detect relevant content on the page
const relevantElement = document.querySelector(".relevant-content");
if (relevantElement) {
  chrome.runtime.sendMessage({ type: "CONTENT_FOUND", url: location.href });
}
```

Background script (background.ts):
```ts
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "CONTENT_FOUND" && sender.tab) {
    chrome.action.enable(sender.tab.id);
    chrome.action.setBadgeText({ 
      tabId: sender.tab.id, 
      text: "NEW" 
    });
    chrome.action.setBadgeBackgroundColor({ 
      tabId: sender.tab.id, 
      color: "#4CAF50" 
    });
  }
});
```

---

Icon State Switching {#icon-state-switching}

Display different icons for active, inactive, and disabled states:

```ts
// background.ts
function updateIcon(tabId: number, isRelevant: boolean) {
  const iconPath = isRelevant 
    ? { "16": "icons/active-16.png", "32": "icons/active-32.png" }
    : { "16": "icons/disabled-16.png", "32": "icons/disabled-32.png" };
  
  chrome.action.setIcon({ tabId, path: iconPath });
}

// Usage in onUpdated listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const isRelevant = tab?.url?.includes("example.com") ?? false;
  updateIcon(tabId, isRelevant);
});
```

---

Dynamic Popup Assignment {#dynamic-popup-assignment}

Show different popup pages based on the current site:

```ts
// background.ts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  
  let popup = "popup-default.html";
  
  if (tab.url.includes("github.com")) {
    popup = "popup-github.html";
  } else if (tab.url.includes("youtube.com")) {
    popup = "popup-youtube.html";
  }
  
  chrome.action.setPopup({ tabId, popup });
});
```

---

Badge as Page Indicator {#badge-as-page-indicator}

Show badge only on relevant pages to indicate availability:

```ts
// background.ts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;
  
  const isRelevant = tab.url.includes("example.com");
  
  chrome.action.setBadgeText({ 
    tabId, 
    text: isRelevant ? "!" : "" 
  });
  chrome.action.setBadgeBackgroundColor({ 
    tabId, 
    color: isRelevant ? "#FF5722" : "transparent" 
  });
});
```

---

Combining with activeTab {#combining-with-activetab}

Use `activeTab` permission for on-demand access while showing the action only on relevant pages:

manifest.json:
```json
{
  "permissions": ["activeTab", "scripting", "declarativeContent"],
  "host_permissions": ["<all_urls>"]
}
```

```ts
// background.ts - DeclarativeContent shows action
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: "example.com" },
    })],
    actions: [new chrome.declarativeContent.ShowAction()],
  }]);
});

// Action click grants temporary permission
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => console.log("Executing with activeTab permission"),
  });
});
```

---

Complete Example {#complete-example}

```ts
// background.ts - Complete page-action pattern
const RELEVANT_PATTERN = /^(https?:\/\/)?(www\.)?example\.(com|org)\//;

function updateAction(tabId: number, url: string | undefined) {
  if (!url || !RELEVANT_PATTERN.test(url)) {
    chrome.action.disable(tabId);
    chrome.action.setTitle({ tabId, title: "Not available" });
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }
  
  chrome.action.enable(tabId);
  chrome.action.setTitle({ tabId, title: "Page Analyzer" });
  chrome.action.setBadgeText({ tabId, text: "READY" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#4CAF50" });
  chrome.action.setIcon({ tabId, path: { "16": "icon-active-16.png" } });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    updateAction(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateAction(activeInfo.tabId, tab.url);
});
```

---

When to Use Each Pattern {#when-to-use-each-pattern}

| Pattern | Use Case |
|---------|----------|
| `declarativeContent.ShowAction` | Simple URL-based show/hide, performance-critical |
| URL-based toggle | Complex URL logic, need to disable vs hide |
| Content-based | Conditions that require page content analysis |
| Icon state switching | Visual feedback for different page states |
| Dynamic popup | Different functionality per site |
| Badge indicator | Show availability without enabling action |
| activeTab combination | Secure on-demand permissions |

---

Related Patterns {#related-patterns}

- [Action API Reference](../../api-reference/action-api.md). Full chrome.action API documentation
- [Declarative Content](./declarative-content.md). Automatic show/hide based on page conditions
- [Context-Aware Actions](./context-aware-actions.md). Dynamic icons, badges, and popups per tab
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
