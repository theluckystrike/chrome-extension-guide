---
layout: default
title: "Chrome Extension Context Menus — Developer Guide"
description: "Learn Chrome extension context menus with this developer guide covering implementation, best practices, and code examples."
---
# Context Menus in Chrome Extensions

## Introduction
- Add custom items to Chrome's right-click menu
- Requires `"contextMenus"` permission
- Items created in background service worker, persist across restarts

## manifest.json Setup
```json
{
  "permissions": ["contextMenus"],
  "background": { "service_worker": "background.js" }
}
```

## Creating Menu Items

### chrome.contextMenus.create()
```javascript
chrome.contextMenus.create({
  id: "lookupSelection",
  title: "Look up '%s'",           // %s = selected text
  contexts: ["selection"],          // Only show when text is selected
});
```
- Must be called in service worker (typically in `chrome.runtime.onInstalled`)
- `id`: Unique string identifier (required in MV3)
- `title`: Display text, `%s` placeholder for selected text
- `contexts`: Array of when to show — see Context Types below

### Context Types
- `"all"` — show everywhere
- `"page"` — right-click on page background
- `"selection"` — text is selected
- `"link"` — right-click on a link
- `"image"` — right-click on an image
- `"video"`, `"audio"` — media elements
- `"frame"` — right-click in an iframe
- `"editable"` — input fields, textareas
- `"action"` — extension's toolbar icon (replaces `"browser_action"`)
- `"launcher"` — ChromeOS app launcher

### Nested Menus (Submenus)
```javascript
chrome.contextMenus.create({ id: "parent", title: "My Extension" });
chrome.contextMenus.create({ id: "child1", parentId: "parent", title: "Option 1" });
chrome.contextMenus.create({ id: "child2", parentId: "parent", title: "Option 2" });
```

### Menu Item Types
- `"normal"` — standard menu item (default)
- `"checkbox"` — toggleable checkbox
- `"radio"` — radio button (grouped by `parentId`)
- `"separator"` — visual divider

## Handling Clicks

### chrome.contextMenus.onClicked
```javascript
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "lookupSelection":
      console.log("Selected text:", info.selectionText);
      console.log("Page URL:", info.pageUrl);
      break;
    case "saveImage":
      console.log("Image URL:", info.srcUrl);
      break;
  }
});
```

### OnClickData Properties
- `menuItemId`: Which item was clicked
- `selectionText`: Selected text (if context is "selection")
- `pageUrl`: URL of the page
- `srcUrl`: URL of image/video/audio element
- `linkUrl`: URL of the link (if context is "link")
- `frameUrl`: URL of the iframe
- `editable`: Whether the element is editable

## Updating and Removing

### chrome.contextMenus.update(id, changes)
```javascript
chrome.contextMenus.update("myItem", { title: "New Title", enabled: false });
```

### chrome.contextMenus.remove(id)
### chrome.contextMenus.removeAll()

## Patterns

### Dynamic Menus Based on Page
- Create menus in `onInstalled`, update based on active tab
- Use `chrome.tabs.onActivated` to update menu visibility

### Send Selected Text to Background
- Context menu with `"selection"` context
- Use `@theluckystrike/webext-messaging` to process in background:
  ```typescript
  const messenger = createMessenger<Messages>();
  chrome.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === "process" && info.selectionText) {
      await messenger.sendTabMessage(tab.id, 'highlight', { text: info.selectionText });
    }
  });
  ```

### Save User Preferences for Menu Items
- Store checkbox/radio state with `@theluckystrike/webext-storage`
- Restore state in `onInstalled` listener

## Best Practices
- Create all menus in `chrome.runtime.onInstalled` — they persist automatically
- Use descriptive `id` strings — easier to debug than auto-generated IDs
- Keep menu items minimal — too many clutters the context menu
- Use `contexts` to show items only where relevant
- `documentUrlPatterns` to limit to specific sites

## Common Mistakes
- Creating menus outside `onInstalled` — duplicates on every service worker restart
- Forgetting `id` field — required in MV3 (was optional in MV2)
- Not handling all `menuItemId` values in the click listener

## Related Articles

- [Context Menu Patterns](../patterns/context-menu-patterns.md)
- [Keyboard Shortcuts](../guides/commands-keyboard-shortcuts.md)
