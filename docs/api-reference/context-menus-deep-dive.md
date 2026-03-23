---
layout: default
title: "Chrome Context Menus Deep Dive"
description: "Advanced Chrome Context Menus API patterns covering dynamic menus, event handling, nested submenus, and Manifest V3 best practices."
canonical_url: "https://bestchromeextensions.com/api-reference/context-menus-deep detailed look/"
---

# chrome.contextMenus Deep Dive

In-depth reference for `chrome.contextMenus` covering advanced patterns, events, dynamic menus, and MV3.

For basic API, see [context-menus-api.md](./context-menus-api.md).

Overview {#overview}

The Context Menus API adds items to Chrome's right-click menu. Items persist across sessions.

Permission {#permission}

```json
{ "permissions": ["contextMenus"] }
```

No user warning. Create menus in `onInstalled`:

```ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "my-item", title: "My Action", contexts: ["page"] });
});
```

API Methods {#api-methods}

create(createProperties) {#createcreateproperties}

```ts
chrome.contextMenus.create({
  id: "unique-id", title: "Menu Title", type: "normal", // "normal"|"checkbox"|"radio"|"separator"
  contexts: ["page"], parentId: "parent-id", documentUrlPatterns: ["https://*/*"],
});
```

update(id, properties) / remove(id) / removeAll() {#updateid-properties-removeid-removeall}

```ts
chrome.contextMenus.update("my-item", { title: "New Title", enabled: false });
chrome.contextMenus.remove("my-item");
chrome.contextMenus.removeAll();
```

Context Types {#context-types}

| Context | Description |
|---------|-------------|
| `"all"` | All contexts |
| `"page"` | Page background |
| `"selection"` | Selected text |
| `"link"` | Hyperlinks |
| `"editable"` | Editable elements |
| `"image"` | Images |
| `"video"` | Videos |
| `"action"` | Toolbar icon |

Use `%s` in titles: `title: 'Search "%s"'`

Menu Types {#menu-types}

- normal: Standard clickable
- checkbox: Toggleable state  
- radio: Mutually exclusive
- separator: Visual divider

Events {#events}

onClicked {#onclicked}

```ts
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "my-item": console.log("Clicked!"); break;
    case "search": chrome.tabs.create({ url: `https://google.com/search?q=${info.selectionText}` }); break;
    case "toggle": console.log("Checked:", info.checked); break;
  }
});
```

Info: `menuItemId`, `selectionText`, `linkUrl`, `srcUrl`, `pageUrl`, `checked`, `mediaType`.

Nested Menus {#nested-menus}

```ts
chrome.contextMenus.create({ id: "tools", title: "Tools", contexts: ["page"] });
chrome.contextMenus.create({ id: "tools-inspect", title: "Inspect", parentId: "tools" });
chrome.contextMenus.create({ id: "tools-source", title: "View Source", parentId: "tools" });
```

Max 2-3 levels.

Dynamic Menus {#dynamic-menus}

URL-specific: `documentUrlPatterns: ["https://github.com/*"]`

```ts
chrome.contextMenus.update("dynamic", { title: `Mode: ${mode}`, visible: show });
```

MV3 Notes {#mv3-notes}

MV3 contextMenus API Important Notes

1. String IDs required (MV2 allowed integers)
2. Register `onClicked` at top level
3. Use `"action"` instead of `"browser_action"`
4. Create in `onInstalled`

Examples {#examples}

contextMenus API Code Examples

Selection Search {#selection-search}
```ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "search", title: 'Search "%s"', contexts: ["selection"] });
});
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "search") {
    chrome.tabs.create({ url: `https://google.com/search?q=${info.selectionText}` });
  }
});
```

Nested Structure {#nested-structure}
```ts
chrome.contextMenus.create({ id: "github", title: "GitHub", contexts: ["link"] });
chrome.contextMenus.create({ id: "gh-desktop", title: "Open in Desktop", parentId: "github" });
chrome.contextMenus.create({ id: "gh-copy", title: "Copy Link", parentId: "github" });
```

Dynamic Per-Site {#dynamic-per-site}
```ts
chrome.contextMenus.create({
  id: "site-action", title: "Site Action", contexts: ["page"],
  documentUrlPatterns: ["https://example.com/*"],
});
```

Checkbox Group {#checkbox-group}
```ts
chrome.contextMenus.create({ id: "settings", title: "Settings", contexts: ["action"] });
chrome.contextMenus.create({ id: "set-notify", title: "Notifications", type: "checkbox", parentId: "settings", checked: true });
chrome.contextMenus.create({ id: "set-sounds", title: "Sounds", type: "checkbox", parentId: "settings" });
```

Cross-References {#cross-references}

- [context-menus-api.md](./context-menus-api.md) - Basic API
- [contextMenus permission](../permissions/contextMenus.md) - Permission details
- [context-menu-patterns.md](../patterns/context-menu-patterns.md) - Common patterns
Frequently Asked Questions

What's the difference between contextMenus and contextMenus API?
They're the same API - "contextMenus" is the permission name while "context-menus" is typically the filename convention.

Can I create dynamic context menus?
Yes, use chrome.contextMenus.create() in your background script, even dynamically based on page content or user actions.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
