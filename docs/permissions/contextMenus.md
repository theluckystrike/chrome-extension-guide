---
layout: default
title: "contextMenus Permission Reference"
description: "Grants access to the API Add custom items to the browser's right-click context menu Items can appear on pages, links, images, selections, and more"
permalink: /permissions/contextMenus/
category: permissions
order: 9
canonical_url: "https://bestchromeextensions.com/permissions/contextMenus/"
last_modified_at: 2026-01-15
---

contextMenus Permission Reference

What It Does {#what-it-does}
- Grants access to the `chrome.contextMenus` API
- Add custom items to the browser's right-click context menu
- Items can appear on pages, links, images, selections, and more
- Supports nested menus, checkboxes, radio buttons, and separators

Context Types {#context-types}
| Context | When It Appears |
|---------|----------------|
| `page` | Right-click on page background |
| `selection` | Right-click on selected text |
| `link` | Right-click on a link |
| `image` | Right-click on an image |
| `video` | Right-click on a video |
| `audio` | Right-click on audio |
| `frame` | Right-click in a subframe |
| `editable` | Right-click in an input/textarea |
| `action` | Click on the extension's toolbar icon |
| `browser_action` | Click on the extension's browser action (MV2) |
| `page_action` | Click on the extension's page action (MV2) |
| `launcher` | ChromeOS app launcher context menu |
| `all` | All of the above |

Menu Item Types {#menu-item-types}
- `normal`. standard clickable item
- `checkbox`. toggleable item
- `radio`. radio button group
- `separator`. visual divider

Manifest Configuration {#manifest-configuration}
```json
{ "permissions": ["contextMenus"] }
```

Low-warning permission.

Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

```ts
import { checkPermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

const result = await checkPermission("contextMenus");
console.log(result.description); // "Add items to the right-click context menu"

PERMISSION_DESCRIPTIONS.contextMenus; // "Add items to the right-click context menu"
```

Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Pattern: context menu action triggers background handler, sends result to content script:

```ts
type Messages = {
  lookupWord: {
    request: { word: string };
    response: { definition: string; examples: string[] };
  };
  saveSelection: {
    request: { text: string; pageUrl: string; timestamp: number };
    response: { saved: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

// Create context menu items on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "lookup-word",
    title: 'Look up "%s"',
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "save-selection",
    title: "Save selection",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "lookup-word" && info.selectionText) {
    const result = await lookupDictionary(info.selectionText);
    // Send result to content script for display
    if (tab?.id) {
      await msg.sendTab({ tabId: tab.id }, "lookupWord", { word: info.selectionText });
    }
  }
  if (info.menuItemId === "save-selection" && info.selectionText) {
    // Handle save
  }
});
```

Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Store context menu state and preferences:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  contextMenuEnabled: true,
  savedSelections: [] as Array<{ text: string; url: string; timestamp: number }>,
  quickActions: ["lookup", "save", "translate"] as string[],
});
const storage = createStorage({ schema });

// Rebuild context menus when preferences change
storage.watch("quickActions", async (actions) => {
  await chrome.contextMenus.removeAll();
  for (const action of actions) {
    chrome.contextMenus.create({
      id: action,
      title: getActionTitle(action),
      contexts: ["selection"],
    });
  }
});

// Save selection when menu item clicked
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "save" && info.selectionText) {
    const saved = await storage.get("savedSelections");
    saved.push({
      text: info.selectionText,
      url: info.pageUrl,
      timestamp: Date.now(),
    });
    await storage.set("savedSelections", saved.slice(-500));
  }
});
```

Key API Methods {#key-api-methods}

| Method | Description |
|--------|-------------|
| `contextMenus.create(createProperties)` | Create a menu item |
| `contextMenus.update(id, updateProperties)` | Update an existing item |
| `contextMenus.remove(id)` | Remove a specific item |
| `contextMenus.removeAll()` | Remove all items |
| `contextMenus.onClicked` | Event. menu item clicked |

Nested Menus {#nested-menus}
```ts
const parentId = chrome.contextMenus.create({
  id: "parent",
  title: "My Extension",
  contexts: ["all"],
});

chrome.contextMenus.create({
  id: "child-1",
  parentId: "parent",
  title: "Action 1",
  contexts: ["all"],
});

chrome.contextMenus.create({
  id: "child-2",
  parentId: "parent",
  title: "Action 2",
  contexts: ["all"],
});
```

Common Patterns {#common-patterns}
1. "Look up" selected text (dictionary, translator)
2. Save/bookmark selections or links
3. Quick actions on images (download, reverse search)
4. Developer tools (inspect element info)
5. Toggle extension features via checkbox items

Gotchas {#gotchas}
- Must create menus in `chrome.runtime.onInstalled` listener (persists across restarts)
- `%s` in title is replaced with selected text (selection context only)
- Maximum 6 top-level items before Chrome collapses into a submenu
- `onClicked` only fires in the background service worker
- Dynamic menus: call `removeAll()` then recreate (no bulk update API)

Related Permissions {#related-permissions}
- [activeTab](activeTab.md). context menu click grants activeTab access
- [scripting](scripting.md). inject scripts after context menu action
- [storage](storage.md). store menu preferences and saved data

API Reference {#api-reference}
- [Context Menus API Reference](../api-reference/context-menus-api.md)
- [Chrome contextMenus API docs](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
- [Context Menus API detailed look](../api-reference/context-menus-api.md)

Frequently Asked Questions

How do I add a context menu item in Chrome extension?
Use chrome.contextMenus.create() in your background script to add items to the right-click context menu. You can specify contexts like "page", "selection", or "link".

Can I add submenus to context menus?
Yes, create a parent menu item first, then use the "parentId" property when creating child items.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
