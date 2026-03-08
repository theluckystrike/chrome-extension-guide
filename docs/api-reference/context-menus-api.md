---
layout: default
title: "Chrome Context Menus API Complete Reference"
description: "The Chrome Context Menus API adds custom items to Chrome's right-click context menu, appearing on pages, links, images, selections, and other contexts."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/context-menus-api/"
---

# Chrome Context Menus API Reference

The `chrome.contextMenus` API lets you add items to Chrome's right-click context menu. Menu items can appear on pages, links, images, selections, and more.

## Permissions {#permissions}

```json
{
  "permissions": ["contextMenus"]
}
```

No user-facing warning. This is a low-sensitivity permission.

See the [contextMenus permission reference](../permissions/contextMenus.md) for details.

## Core Methods {#core-methods}

### chrome.contextMenus.create(createProperties, callback?) {#chromecontextmenuscreatecreateproperties-callback}

Create a context menu item. This is a synchronous-style call (returns the menu item ID directly) but accepts an optional callback for error handling.

```ts
// Basic menu item
chrome.contextMenus.create({
  id: "my-action",
  title: "Do Something",
  contexts: ["page"],
});

// Menu item for selected text
chrome.contextMenus.create({
  id: "search-selected",
  title: 'Search for "%s"', // %s is replaced with selected text
  contexts: ["selection"],
});

// Menu item on links
chrome.contextMenus.create({
  id: "copy-link",
  title: "Copy Clean Link",
  contexts: ["link"],
});

// Menu item on images
chrome.contextMenus.create({
  id: "download-image",
  title: "Download Image",
  contexts: ["image"],
});

// Menu item on the extension's action button
chrome.contextMenus.create({
  id: "options",
  title: "Open Options",
  contexts: ["action"], // MV3: "action", MV2: "browser_action"/"page_action"
});

// Checkbox menu item
chrome.contextMenus.create({
  id: "dark-mode",
  title: "Dark Mode",
  type: "checkbox",
  checked: false,
  contexts: ["action"],
});

// Radio buttons
chrome.contextMenus.create({
  id: "size-small",
  title: "Small",
  type: "radio",
  contexts: ["action"],
});
chrome.contextMenus.create({
  id: "size-medium",
  title: "Medium",
  type: "radio",
  checked: true,
  contexts: ["action"],
});
chrome.contextMenus.create({
  id: "size-large",
  title: "Large",
  type: "radio",
  contexts: ["action"],
});

// Separator
chrome.contextMenus.create({
  id: "sep1",
  type: "separator",
  contexts: ["action"],
});

// Only show on specific URL patterns
chrome.contextMenus.create({
  id: "github-action",
  title: "Open in GitHub Desktop",
  contexts: ["page"],
  documentUrlPatterns: ["https://github.com/*"],
});

// Only show on links matching a pattern
chrome.contextMenus.create({
  id: "open-repo",
  title: "Open Repository",
  contexts: ["link"],
  targetUrlPatterns: ["https://github.com/*/*"],
});
```

### Nested Menus (Submenus) {#nested-menus-submenus}

Create parent items and assign children via `parentId`:

```ts
// Parent menu
chrome.contextMenus.create({
  id: "parent",
  title: "My Extension",
  contexts: ["page"],
});

// Child items
chrome.contextMenus.create({
  id: "child-1",
  parentId: "parent",
  title: "Action 1",
  contexts: ["page"],
});

chrome.contextMenus.create({
  id: "child-2",
  parentId: "parent",
  title: "Action 2",
  contexts: ["page"],
});
```

### CreateProperties {#createproperties}

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (recommended; required for event pages) |
| `title` | `string` | Display text (`%s` for selected text) |
| `type` | `ItemType` | `"normal"` (default), `"checkbox"`, `"radio"`, `"separator"` |
| `checked` | `boolean` | Initial state for checkbox/radio |
| `contexts` | `ContextType[]` | Where to show the item |
| `parentId` | `string \| number` | Parent menu item ID |
| `documentUrlPatterns` | `string[]` | Show only on pages matching these patterns |
| `targetUrlPatterns` | `string[]` | Show only on links/images matching these patterns |
| `enabled` | `boolean` | Whether the item is enabled (default `true`) |
| `visible` | `boolean` | Whether the item is visible (default `true`) |

**ContextType values:** `"all"`, `"page"`, `"frame"`, `"selection"`, `"link"`, `"editable"`, `"image"`, `"video"`, `"audio"`, `"action"`, `"browser_action"`, `"page_action"`, `"launcher"`.

### chrome.contextMenus.update(id, updateProperties) {#chromecontextmenusupdateid-updateproperties}

Modify an existing menu item.

```ts
// Disable a menu item
await chrome.contextMenus.update("my-action", { enabled: false });

// Change title dynamically
await chrome.contextMenus.update("my-action", { title: "New Title" });

// Toggle checkbox
await chrome.contextMenus.update("dark-mode", { checked: true });

// Hide/show
await chrome.contextMenus.update("my-action", { visible: false });
```

### chrome.contextMenus.remove(menuItemId) {#chromecontextmenusremovemenuitemid}

Remove a specific menu item.

```ts
await chrome.contextMenus.remove("my-action");
```

### chrome.contextMenus.removeAll() {#chromecontextmenusremoveall}

Remove all menu items created by your extension.

```ts
await chrome.contextMenus.removeAll();
```

## Events {#events}

### chrome.contextMenus.onClicked {#chromecontextmenusonclicked}

Fires when a menu item is clicked.

```ts
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "search-selected":
      chrome.tabs.create({
        url: `https://www.google.com/search?q=${encodeURIComponent(info.selectionText || "")}`,
      });
      break;

    case "copy-link":
      // Send link URL to content script for processing
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "copyText",
          text: info.linkUrl,
        });
      }
      break;

    case "download-image":
      if (info.srcUrl) {
        chrome.downloads.download({ url: info.srcUrl });
      }
      break;

    case "dark-mode":
      // info.checked is the NEW state after clicking
      console.log("Dark mode:", info.checked);
      break;
  }
});
```

### OnClickData (the `info` parameter) {#onclickdata-the-info-parameter}

| Property | Type | Description |
|----------|------|-------------|
| `menuItemId` | `string \| number` | ID of the clicked item |
| `parentMenuItemId` | `string \| number` | Parent item ID |
| `mediaType` | `string` | `"image"`, `"video"`, `"audio"` if applicable |
| `linkUrl` | `string` | URL of the link (if context is `"link"`) |
| `srcUrl` | `string` | URL of the media element |
| `pageUrl` | `string` | URL of the page |
| `frameUrl` | `string` | URL of the frame |
| `frameId` | `number` | Frame ID |
| `selectionText` | `string` | Selected text (if context is `"selection"`) |
| `editable` | `boolean` | Whether the element is editable |
| `wasChecked` | `boolean` | Previous state (checkbox/radio) |
| `checked` | `boolean` | New state (checkbox/radio) |

## Setting Up Context Menus {#setting-up-context-menus}

Context menus should be created in `chrome.runtime.onInstalled` so they persist and aren't duplicated:

```ts
// background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(); // clean slate

  chrome.contextMenus.create({
    id: "search",
    title: 'Search "%s"',
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "save-page",
    title: "Save Page",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Handle clicks...
});
```

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Route context menu actions through the messaging layer:

```ts
// shared/messages.ts
type Messages = {
  saveSelection: {
    request: { text: string; pageUrl: string; timestamp: number };
    response: { saved: boolean };
  };
  lookupWord: {
    request: { word: string };
    response: { definition: string };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  savedSelections: [] as Array<{ text: string; pageUrl: string; timestamp: number }>,
});
const storage = createStorage({ schema, area: "local" });
const msg = createMessenger<Messages>();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-selection",
    title: 'Save "%s"',
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "save-selection" && info.selectionText) {
    const selections = await storage.get("savedSelections");
    selections.push({
      text: info.selectionText,
      pageUrl: info.pageUrl || "",
      timestamp: Date.now(),
    });
    await storage.set("savedSelections", selections.slice(-50));
  }
});

msg.onMessage({
  saveSelection: async (data) => {
    const selections = await storage.get("savedSelections");
    selections.push(data);
    await storage.set("savedSelections", selections.slice(-50));
    return { saved: true };
  },
  lookupWord: async ({ word }) => {
    // Process word lookup
    return { definition: `Definition of "${word}"` };
  },
});
```

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Dynamic context menus based on stored preferences:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  quickActions: [
    { id: "google", label: "Search Google", urlTemplate: "https://google.com/search?q=%s" },
    { id: "translate", label: "Translate", urlTemplate: "https://translate.google.com/?text=%s" },
  ] as Array<{ id: string; label: string; urlTemplate: string }>,
});

const storage = createStorage({ schema, area: "sync" });

async function rebuildMenus() {
  await chrome.contextMenus.removeAll();
  const actions = await storage.get("quickActions");

  for (const action of actions) {
    chrome.contextMenus.create({
      id: `quick-${action.id}`,
      title: action.label.replace("%s", '"%s"'),
      contexts: ["selection"],
    });
  }
}

chrome.runtime.onInstalled.addListener(rebuildMenus);
storage.watch("quickActions", rebuildMenus);

chrome.contextMenus.onClicked.addListener(async (info) => {
  const actionId = (info.menuItemId as string).replace("quick-", "");
  const actions = await storage.get("quickActions");
  const action = actions.find((a) => a.id === actionId);
  if (action && info.selectionText) {
    const url = action.urlTemplate.replace("%s", encodeURIComponent(info.selectionText));
    chrome.tabs.create({ url });
  }
});
```

## Common Patterns {#common-patterns}

### Context-aware menu items {#context-aware-menu-items}

```ts
// Show different menus based on the page
chrome.contextMenus.create({
  id: "github-pr",
  title: "Create Pull Request",
  contexts: ["page"],
  documentUrlPatterns: ["https://github.com/*/*"],
});

chrome.contextMenus.create({
  id: "jira-issue",
  title: "Create Jira Issue",
  contexts: ["selection"],
  documentUrlPatterns: ["https://*.atlassian.net/*"],
});
```

### Update menu title dynamically based on state {#update-menu-title-dynamically-based-on-state}

```ts
let isEnabled = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggle",
    title: "Enable Feature",
    contexts: ["action"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "toggle") {
    isEnabled = !isEnabled;
    await chrome.contextMenus.update("toggle", {
      title: isEnabled ? "Disable Feature" : "Enable Feature",
    });
  }
});
```

## Gotchas {#gotchas}

1. **Create menus in `onInstalled`, not at top level.** Creating at the top level of the service worker will attempt to recreate them every time the worker starts, causing errors (duplicate IDs).

2. **`%s` substitution** only works in the `title` property when the context includes `"selection"`. It gets replaced with the selected text.

3. **Maximum 6 top-level items.** If you create more than 6 top-level items for the same contexts, Chrome automatically collapses them into a submenu under your extension's name.

4. **`create()` is not fully async.** It returns the menu item ID synchronously but accepts a callback for errors. Wrap in a try/catch or provide a callback to detect failures.

5. **Radio items are grouped** by adjacent creation order within the same parent. All consecutive radio items form a group.

6. **`onClicked` doesn't fire for parent items** that have children. Only leaf items trigger the event.

7. **Menu items persist** across browser restarts. Use `removeAll()` in `onInstalled` to avoid stale items after updates.

## Related {#related}

- [contextMenus permission](../permissions/contextMenus.md)
- [Context Menus Guide](../guides/context-menus.md)
- [Tabs API](tabs-api.md)
- [Chrome contextMenus API docs](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)

## Frequently Asked Questions

### How do I add items to the right-click menu?
Use chrome.contextMenus.create() to add items. You can specify which contexts (page, selection, link, image, etc.) trigger your menu items.

### Can I add icons to context menu items?
Yes, provide an "icons" object with 16x16 and 32x32 icon paths when creating the menu item.
