---
layout: default
title: "tabs Permission Reference"
description: "Grants persistent access to tab metadata on all tabs in the browser Access to , , , on Tab objects Allows querying and monitoring tabs across all windows"
permalink: /permissions/tabs/
category: permissions
order: 43
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/tabs/"
---

# tabs Permission Reference

## What It Does {#what-it-does}
- Grants persistent access to tab metadata on all tabs in the browser
- Access to `url`, `pendingUrl`, `title`, `favIconUrl` on Tab objects
- Allows querying and monitoring tabs across all windows

## What You Get WITHOUT tabs {#what-you-get-without-tabs}

Without the `tabs` permission, you still get access to these Tab properties:

| Property | Type | Description |
|----------|------|-------------|
| `tab.id` | `number \| undefined` | Unique tab identifier |
| `tab.index` | `number` | Position in tab strip (0-based) |
| `tab.windowId` | `number` | ID of the parent window |
| `tab.active` | `boolean` | Whether tab is active in its window |
| `tab.pinned` | `boolean` | Whether tab is pinned |
| `tab.status` | `"loading" \| "complete"` | Loading state |
| `tab.incognito` | `boolean` | Whether in incognito mode |

You also get access to all `chrome.tabs` methods:
- `chrome.tabs.query()` — find tabs by various criteria
- `chrome.tabs.create()` — open new tabs
- `chrome.tabs.update()` — modify tab properties
- `chrome.tabs.remove()` — close tabs
- `chrome.tabs.reload()` — refresh tabs
- `chrome.tabs.goBack()` / `chrome.tabs.goForward()` — navigation
- `chrome.tabs.highlight()` — bring tabs to front
- `chrome.tabs.move()` — reorder tabs
- `chrome.tabs.captureVisibleTab()` — screenshots (with host permission)
- `chrome.tabs.detectLanguage()` — detect page language
- `chrome.tabs.getZoom()` / `chrome.tabs.setZoom()` — zoom control
- `chrome.tabs.discard()` — discard tabs to save memory

## What You Need tabs FOR {#what-you-need-tabs-for}

The `tabs` permission is required to access these sensitive Tab properties:

| Property | Type | Description |
|----------|------|-------------|
| `tab.url` | `string \| undefined` | Full URL of the tab |
| `tab.title` | `string \| undefined` | Page title |
| `tab.favIconUrl` | `string \| undefined` | Favicon URL |
| `tab.pendingUrl` | `string \| undefined` | URL being navigated to |

Without `tabs` permission, these properties will be `undefined` when you query tabs.

## Manifest Configuration {#manifest-configuration}

### Required permission {#required-permission}
```json
{
  "permissions": ["tabs"]
}
```

### Optional permission (recommended for more flexible UX) {#optional-permission-recommended-for-more-flexible-ux}
```json
{
  "optional_permissions": ["tabs"]
}
```

With optional permissions, users can install without granting tab access, and you can request it later:

```ts
// Request optional tabs permission
const granted = await chrome.permissions.request({ permissions: ["tabs"] });
```

## Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

### Checking if granted {#checking-if-granted}
```ts
import { checkPermission, requestPermission } from "@theluckystrike/webext-permissions";

const result = await checkPermission("tabs");
console.log(result);
// { permission: "tabs", granted: boolean, description: "Read information about open tabs" }

if (!result.granted) {
  const requested = await requestPermission("tabs");
  console.log(requested); // true if user granted
}
```

### Description from PERMISSION_DESCRIPTIONS {#description-from-permission-descriptions}
```ts
import { PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

PERMISSION_DESCRIPTIONS.tabs;
// "Read information about open tabs"
```

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Common pattern: background script queries tabs, sends data to popup/panel.

```ts
// shared/messages.ts
type Messages = {
  getAllTabs: {
    request: { windowId?: number };
    response: Array<{ id: number; title: string; url: string; active: boolean }>;
  };
  getActiveTab: {
    request: void;
    response: { id: number; title: string; url: string; favIconUrl?: string };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage({
  getAllTabs: async (payload) => {
    const tabs = await chrome.tabs.query(payload.request?.windowId ? { windowId: payload.request.windowId } : {});
    return tabs.map((tab) => ({
      id: tab.id!,
      title: tab.title || "Untitled",
      url: tab.url || "",
      active: tab.active,
    }));
  },
});

msg.onMessage({
  getActiveTab: async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return {
      id: tab.id!,
      title: tab.title || "Untitled",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl,
    };
  },
});

// popup.ts
const msg = createMessenger<Messages>();
const allTabs = await msg.send("getAllTabs", {});
const activeTab = await msg.send("getActiveTab", undefined);
console.log(`Found ${allTabs.length} tabs. Active: ${activeTab.title}`);
```

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Store tab-related preferences and recent tab data:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  lastVisitedTabs: [] as Array<{ id: number; title: string; url: string; timestamp: number }>,
  pinnedTabsConfig: {
    enabled: true,
    maxPinned: 5,
  },
  tabGroups: {} as Record<string, number[]>, // groupName -> tabIds
});

const storage = createStorage({ schema });

// Store recent tab visit
async function trackTabVisit(tab: chrome.tabs.Tab) {
  const recent = await storage.get("lastVisitedTabs");
  const newEntry = {
    id: tab.id!,
    title: tab.title || "Untitled",
    url: tab.url || "",
    timestamp: Date.now(),
  };
  // Keep only last 20 tabs
  const updated = [newEntry, ...recent].slice(0, 20);
  await storage.set("lastVisitedTabs", updated);
}

// Save a tab to favorites
async function pinTabToGroup(groupName: string, tabId: number) {
  const groups = await storage.get("tabGroups");
  const current = groups[groupName] || [];
  if (!current.includes(tabId)) {
    groups[groupName] = [...current, tabId];
    await storage.set("tabGroups", groups);
  }
}
```

## tabs vs activeTab Comparison {#tabs-vs-activetab-comparison}

| Feature | `tabs` | `activeTab` |
|---------|--------|-------------|
| **Scope** | All tabs, all windows | Only the active tab on user gesture |
| **Duration** | Persistent (always granted) | Temporary (expires on navigation) |
| **URL access** | All tabs | Only current active tab |
| **User gesture required** | No | Yes |
| **Store warning** | "Read your browsing history" | No warning |
| **Chrome Web Store review** | More scrutiny | Faster approval |

## When to Use Which {#when-to-use-which}

### Use `tabs` when: {#use-tabs-when}
- You need to read tab URLs/titles in the background
- You want to list all open tabs in a popup
- You need persistent access without user interaction
- You're building a tab manager, history tool, or session manager

### Use `activeTab` when: {#use-activetab-when}
- You only need to act on the current page
- You want to avoid scary permission warnings
- User trust/privacy is a priority
- You only act when user explicitly invokes your extension

## Gotchas {#gotchas}

1. **Undefined without permission**: Always check if `tab.url`, `tab.title`, `tab.favIconUrl` exist before using them. They will be `undefined` if `tabs` permission isn't granted.

2. **"Browsing history" warning**: The `tabs` permission triggers the "Read your browsing history" warning in the Chrome Web Store. This can reduce conversion rates.

3. **sendMessage works without tabs**: You can use `chrome.tabs.sendMessage()` to communicate with content scripts without the `tabs` permission — as long as you have host permissions for the target URL.

4. **Incognito tabs**: In incognito windows, `tab.url` may be `undefined` even with `tabs` permission unless you've declared `"incognito": "spallow"` or `"incognito": "split"` in your manifest.

5. **tab.id is always available**: Even without `tabs` permission, `tab.id` is always present — but you can't read the URL/title associated with it.

6. **Extension pages**: Tabs hosting extension pages (`chrome-extension://...`) always expose their URL regardless of permissions.

## Related Permissions {#related-permissions}
- [activeTab](activeTab.md) — temporary access to active tab only
- [scripting](scripting.md) — inject content scripts (needs host permissions without tabs)
- [storage](storage.md) — persist data

## API Reference {#api-reference}
- [Tabs API Reference](../api-reference/tabs-api.md)
- [Chrome tabs API](https://developer.chrome.com/docs/extensions/reference/tabs)
- [Manifest permissions](https://developer.chrome.com/docs/extensions/develop/concepts/permissions)

## Frequently Asked Questions

### How do I get the current tab in Chrome extension?
Use chrome.tabs.query({active: true, currentWindow: true}) to get the currently active tab, or use the tab parameter in event listeners.

### Can I access tab URLs without host permissions?
With the tabs permission, you can access limited tab metadata including URL, title, and favIconUrl.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
