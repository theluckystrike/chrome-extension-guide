---
layout: default
title: "Chrome Tabs API Complete Reference"
description: "The Chrome Tabs API creates, modifies, queries, and rearranges browser tabs, providing access to tab properties like URL, title, favicon, and loading status."
canonical_url: "https://bestchromeextensions.com/api-reference/tabs-api/"
---

# Chrome Tabs API Reference

The `chrome.tabs` API lets you create, modify, query, and rearrange tabs in the browser. It is one of the most heavily used Chrome extension APIs.

## Permissions {#permissions}

Most `chrome.tabs` methods work **without** the `tabs` permission. The permission only controls access to sensitive properties (`url`, `title`, `favIconUrl`, `pendingUrl`) on `Tab` objects.

```json
{
  "permissions": ["tabs"]
}
```

See the [tabs permission reference](../permissions/tabs.md) for a detailed breakdown of what requires permission and what does not.

## Tab Object {#tab-object}

Every method that returns tab data provides a `chrome.tabs.Tab` object:

| Property | Type | Needs `tabs` Permission |
|----------|------|------------------------|
| `id` | `number` | No |
| `index` | `number` | No |
| `windowId` | `number` | No |
| `active` | `boolean` | No |
| `pinned` | `boolean` | No |
| `highlighted` | `boolean` | No |
| `incognito` | `boolean` | No |
| `status` | `TabStatus \| undefined` | No |
| `discarded` | `boolean` | No |
| `autoDiscardable` | `boolean` | No |
| `groupId` | `number` | No |
| `url` | `string \| undefined` | Yes |
| `pendingUrl` | `string \| undefined` | Yes |
| `title` | `string \| undefined` | Yes |
| `favIconUrl` | `string \| undefined` | Yes |
| `openerTabId` | `number \| undefined` | No |
| `audible` | `boolean \| undefined` | No |
| `mutedInfo` | `MutedInfo \| undefined` | No |
| `width` | `number \| undefined` | No |
| `height` | `number \| undefined` | No |
| `sessionId` | `string \| undefined` | No |
| `lastAccessed` | `number` | No |

## Core Methods {#core-methods}

### chrome.tabs.query(queryInfo) {#chrometabsqueryqueryinfo}

Find tabs matching a filter. The most-used method in the API.

```ts
// Get the active tab in the current window
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

// Get all tabs in all windows
const allTabs = await chrome.tabs.query({});

// Tabs matching a URL pattern (requires tabs or host permission)
const gmailTabs = await chrome.tabs.query({ url: "https://mail.google.com/*" });

// All pinned tabs
const pinned = await chrome.tabs.query({ pinned: true });

// Tabs with audible media
const audible = await chrome.tabs.query({ audible: true });

// Combine filters: active, non-incognito, in current window
const tabs = await chrome.tabs.query({
  active: true,
  currentWindow: true,
  incognito: false,
});
```

**QueryInfo properties:** `active`, `pinned`, `audible`, `muted`, `highlighted`, `discarded`, `autoDiscardable`, `currentWindow`, `lastFocusedWindow`, `status`, `title`, `url` (glob pattern), `windowId`, `windowType`, `groupId`, `index`.

### chrome.tabs.create(createProperties) {#chrometabscreatecreateproperties}

Open a new tab.

```ts
// Simple: open a URL
const tab = await chrome.tabs.create({ url: "https://example.com" });

// Open next to current tab
const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
const tab = await chrome.tabs.create({
  url: "https://example.com",
  index: current.index + 1,
  active: false, // open in background
});

// Open extension page
const tab = await chrome.tabs.create({
  url: chrome.runtime.getURL("options.html"),
});
```

**CreateProperties:** `url`, `windowId`, `index`, `active`, `pinned`, `openerTabId`.

### chrome.tabs.update(tabId, updateProperties) {#chrometabsupdatetabid-updateproperties}

Modify an existing tab.

```ts
// Navigate a tab to a new URL
await chrome.tabs.update(tabId, { url: "https://example.com" });

// Pin the active tab
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
await chrome.tabs.update(tab.id!, { pinned: true });

// Mute a tab
await chrome.tabs.update(tabId, { muted: true });

// Activate (focus) a specific tab
await chrome.tabs.update(tabId, { active: true });
```

**UpdateProperties:** `url`, `active`, `highlighted`, `pinned`, `muted`, `openerTabId`, `autoDiscardable`.

### chrome.tabs.remove(tabIds) {#chrometabsremovetabids}

Close one or more tabs.

```ts
// Close a single tab
await chrome.tabs.remove(tabId);

// Close multiple tabs
await chrome.tabs.remove([tabId1, tabId2, tabId3]);

// Close all tabs matching a pattern
const tabs = await chrome.tabs.query({ url: "https://example.com/*" });
await chrome.tabs.remove(tabs.map((t) => t.id!));
```

### chrome.tabs.reload(tabId, reloadProperties?) {#chrometabsreloadtabid-reloadproperties}

Refresh a tab.

```ts
// Soft reload
await chrome.tabs.reload(tabId);

// Hard reload (bypass cache)
await chrome.tabs.reload(tabId, { bypassCache: true });
```

### chrome.tabs.move(tabIds, moveProperties) {#chrometabsmovetabids-moveproperties}

Reorder tabs within or across windows.

```ts
// Move tab to position 0
await chrome.tabs.move(tabId, { index: 0 });

// Move tab to another window
await chrome.tabs.move(tabId, { windowId: targetWindowId, index: -1 });

// Move multiple tabs together
await chrome.tabs.move([tabId1, tabId2], { index: 0 });
```

### chrome.tabs.group(options) / chrome.tabs.ungroup(tabIds) {#chrometabsgroupoptions-chrometabsungrouptabids}

Manage tab groups (Chrome 88+).

```ts
// Group tabs together
const groupId = await chrome.tabs.group({ tabIds: [tabId1, tabId2] });

// Customize the group
await chrome.tabGroups.update(groupId, {
  title: "Research",
  color: "blue",
  collapsed: false,
});

// Add a tab to an existing group
await chrome.tabs.group({ tabIds: tabId3, groupId });

// Ungroup tabs
await chrome.tabs.ungroup([tabId1, tabId2]);
```

### chrome.tabs.discard(tabId?) {#chrometabsdiscardtabid}

Free memory by discarding a tab. The tab remains visible in the tab strip but its content is unloaded.

```ts
await chrome.tabs.discard(tabId);
// Tab will reload when the user clicks on it
```

### chrome.tabs.captureVisibleTab(windowId?, options?) {#chrometabscapturevisibletabwindowid-options}

Take a screenshot of the visible area of the active tab. Requires `<all_urls>` or `activeTab` permission.

```ts
const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
  format: "png",
  quality: 100,
});
// dataUrl is a base64-encoded image
```

### chrome.tabs.sendMessage(tabId, message, options?) {#chrometabssendmessagetabid-message-options}

Send a message to content scripts running in a specific tab.

```ts
// Send to all frames in a tab
const response = await chrome.tabs.sendMessage(tabId, {
  type: "getData",
  selector: ".price",
});

// Send to a specific frame
const response = await chrome.tabs.sendMessage(
  tabId,
  { type: "getData" },
  { frameId: 0 }, // main frame
);
```

### chrome.tabs.goBack(tabId?) / chrome.tabs.goForward(tabId?) {#chrometabsgobacktabid-chrometabsgoforwardtabid}

Navigate tab history.

```ts
await chrome.tabs.goBack(tabId);
await chrome.tabs.goForward(tabId);
```

### chrome.tabs.getZoom(tabId?) / chrome.tabs.setZoom(tabId?, zoomFactor) {#chrometabsgetzoomtabid-chrometabssetzoomtabid-zoomfactor}

```ts
const zoom = await chrome.tabs.getZoom(tabId); // e.g. 1.0
await chrome.tabs.setZoom(tabId, 1.5); // 150%
await chrome.tabs.setZoom(tabId, 0); // reset to default
```

### chrome.tabs.detectLanguage(tabId?) {#chrometabsdetectlanguagetabid}

```ts
const lang = await chrome.tabs.detectLanguage(tabId);
console.log(lang); // "en", "fr", "ja", etc.
```

## Events {#events}

### chrome.tabs.onCreated {#chrometabsoncreated}

Fires when a new tab is created.

```ts
chrome.tabs.onCreated.addListener((tab) => {
  console.log("New tab:", tab.id, tab.pendingUrl);
});
```

### chrome.tabs.onUpdated {#chrometabsonupdated}

Fires when a tab's properties change (URL, title, loading status, etc.). This is the most frequently fired tab event.

```ts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // changeInfo contains only the properties that changed
  if (changeInfo.status === "complete") {
    console.log("Tab finished loading:", tab.url);
  }
  if (changeInfo.title) {
    console.log("Title changed to:", changeInfo.title);
  }
});
```

**Filter for performance** — avoid running logic on every update:

```ts
chrome.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => {
    // Only fires for matching conditions
    console.log("Page loaded:", tab.url);
  },
  { properties: ["status"], urls: ["https://example.com/*"] },
);
```

### chrome.tabs.onRemoved {#chrometabsonremoved}

```ts
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log("Tab closed:", tabId);
  console.log("Window closing?", removeInfo.isWindowClosing);
});
```

### chrome.tabs.onActivated {#chrometabsonactivated}

Fires when the active tab in a window changes.

```ts
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log("Active tab:", activeInfo.tabId, "in window:", activeInfo.windowId);
});
```

### chrome.tabs.onMoved / onAttached / onDetached {#chrometabsonmoved-onattached-ondetached}

```ts
// Tab moved within a window
chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  console.log(`Tab ${tabId} moved from ${moveInfo.fromIndex} to ${moveInfo.toIndex}`);
});

// Tab moved to a different window
chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  console.log(`Tab ${tabId} detached from window ${detachInfo.oldWindowId} at position ${detachInfo.oldPosition}`);
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  console.log(`Tab ${tabId} attached to window ${attachInfo.newWindowId} at position ${attachInfo.newPosition}`);
});
```

### chrome.tabs.onReplaced {#chrometabsonreplaced}

Fires when a tab is replaced by another (e.g. prerendering).

```ts
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  console.log(`Tab ${removedTabId} replaced by ${addedTabId}`);
});
```

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Build a typed tab manager with the background querying tabs and sending results to the popup:

```ts
// shared/messages.ts
type Messages = {
  queryTabs: {
    request: { query: chrome.tabs.QueryInfo };
    response: Array<{ id: number; title: string; url: string; active: boolean }>;
  };
  closeTab: {
    request: { tabId: number };
    response: { success: boolean };
  };
  moveTab: {
    request: { tabId: number; index: number };
    response: { success: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage({
  queryTabs: async ({ query }) => {
    const tabs = await chrome.tabs.query(query);
    return tabs.map((t) => ({
      id: t.id!,
      title: t.title || "Untitled",
      url: t.url || "",
      active: t.active,
    }));
  },
  closeTab: async ({ tabId }) => {
    await chrome.tabs.remove(tabId);
    return { success: true };
  },
  moveTab: async ({ tabId, index }) => {
    await chrome.tabs.move(tabId, { index });
    return { success: true };
  },
});

// popup.ts
const msg = createMessenger<Messages>();
const tabs = await msg.send("queryTabs", { query: { currentWindow: true } });
```

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Track tab activity and persist it:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  tabHistory: [] as Array<{ url: string; title: string; visitedAt: number }>,
  tabStats: { totalOpened: 0, totalClosed: 0 },
});

const storage = createStorage({ schema, area: "local" });

chrome.tabs.onCreated.addListener(async () => {
  const stats = await storage.get("tabStats");
  await storage.set("tabStats", { ...stats, totalOpened: stats.totalOpened + 1 });
});

chrome.tabs.onRemoved.addListener(async () => {
  const stats = await storage.get("tabStats");
  await storage.set("tabStats", { ...stats, totalClosed: stats.totalClosed + 1 });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const history = await storage.get("tabHistory");
    history.unshift({ url: tab.url, title: tab.title || "", visitedAt: Date.now() });
    await storage.set("tabHistory", history.slice(0, 100));
  }
});
```

## Common Patterns {#common-patterns}

### Get the current tab from a popup or action click {#get-the-current-tab-from-a-popup-or-action-click}

```ts
// From popup.ts or action click handler
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
```

### Inject a content script into a specific tab {#inject-a-content-script-into-a-specific-tab}

```ts
// Requires "scripting" permission
await chrome.scripting.executeScript({
  target: { tabId: tab.id! },
  files: ["content.js"],
});
```

### Duplicate a tab {#duplicate-a-tab}

```ts
const newTab = await chrome.tabs.duplicate(tabId);
```

### Wait for a tab to finish loading {#wait-for-a-tab-to-finish-loading}

```ts
function waitForTabLoad(tabId: number): Promise<chrome.tabs.Tab> {
  return new Promise((resolve) => {
    function listener(id: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) {
      if (id === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(tab);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}
```

## Gotchas {#gotchas}

1. **`tab.id` can be undefined** in rare cases (e.g. devtools tabs). Always use non-null assertion (`tab.id!`) only when you're certain the tab has an ID.

2. **`onUpdated` fires multiple times** per navigation — once for `status: "loading"` and again for `status: "complete"`, plus for title/favicon changes. Always filter on `changeInfo`.

3. **URL matching in `query()` uses glob patterns**, not regex. Use `*` for wildcards: `"https://example.com/*"`.

4. **`captureVisibleTab` captures what's visible**, not the full page. For full-page screenshots, you need a content script.

5. **`tabs.sendMessage` throws an error** if no content script is listening in the target tab ("Could not establish connection. Receiving end does not exist."). Always wrap in try/catch.

6. **Tab IDs are not stable across sessions.** Never persist tab IDs — they change on browser restart.

## Related {#related}

- [tabs permission](../permissions/tabs.md)
- [activeTab permission](../permissions/activeTab.md)
- [Windows API](windows-api.md)
- [Chrome tabs API docs](https://developer.chrome.com/docs/extensions/reference/api/tabs)
## Frequently Asked Questions

### How do I get the current tab?
Use chrome.tabs.query() with {active: true, currentWindow: true} to get the active tab in the current window.

### Can I create new tabs programmatically?
Yes, use chrome.tabs.create() with a URL parameter to open new tabs.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
