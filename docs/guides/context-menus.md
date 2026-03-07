# Chrome Context Menus API

The Chrome Context Menus API adds items to Chrome's right-click menu, enabling contextual interactions with text selections, links, images, or entire pages.

## Required Permission

```json
{
  "name": "My Extension",
  "permissions": ["contextMenus"],
  "manifest_version": 3
}
```

## Core Methods

### chrome.contextMenus.create()

Creates a new context menu item:

```javascript
chrome.contextMenus.create({
  id: "search-selection",
  title: "Search '%s'",
  contexts: ["selection"]
}, () => {
  if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
});
```

Key properties: `id`, `title`, `contexts`, `parentId`, `checked`, `visible`, `enabled`, `icons` (Chrome 128+).

### chrome.contextMenus.update()

Modifies an existing item:

```javascript
chrome.contextMenus.update("search-selection", { title: "Find '%s' in Google" });
```

### chrome.contextMenus.remove()

Removes a specific item:

```javascript
chrome.contextMenus.remove("search-selection", () => {});
```

### chrome.contextMenus.removeAll()

Clears all context menus created by your extension:

```javascript
chrome.contextMenus.removeAll(() => {});
```

## Context Types

| ContextType | Description |
|-------------|-------------|
| `page` | Right-click anywhere on the page |
| `selection` | Text is selected |
| `link` | Right-click on a hyperlink |
| `image` | Right-click on an image |
| `video` | Right-click on a video |
| `audio` | Right-click on audio |
| `frame` | Right-click on an iframe |
| `editable` | Right-click in input/textarea |
| `action` | Extension action icon click |

## Item Types

```javascript
// Normal item
chrome.contextMenus.create({ id: "normal", title: "Action", type: "normal" });

// Checkbox (toggle)
chrome.contextMenus.create({ id: "toggle", title: "Enable", type: "checkbox", checked: false });

// Radio (exclusive)
chrome.contextMenus.create({ id: "opt1", title: "Option 1", type: "radio", checked: true });

// Separator
chrome.contextMenus.create({ id: "sep1", type: "separator" });
```

## Parent-Child Hierarchies

Create nested menus:

```javascript
chrome.contextMenus.create({ id: "search-tools", title: "Search Tools", contexts: ["selection"] });
chrome.contextMenus.create({ id: "search-google", parentId: "search-tools", title: "Google", contexts: ["selection"] });
chrome.contextMenus.create({ id: "search-wiki", parentId: "search-tools", title: "Wikipedia", contexts: ["selection"] });
```

## Handling Clicks

```javascript
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "search-selection":
      const query = encodeURIComponent(info.selectionText);
      chrome.tabs.create({ url: `https://google.com/search?q=${query}` });
      break;
    case "copy-link":
      navigator.clipboard.writeText(info.linkUrl);
      break;
  }
});
```

`info` properties: `menuItemId`, `pageUrl`, `linkUrl`, `srcUrl`, `selectionText`, `editable`.

## Dynamic Menus

Update menus based on context:

```javascript
chrome.contextMenus.onShown.addListener((info, tab) => {
  chrome.contextMenus.update("dynamic-item", { visible: info.selectionText.length > 0 });
});
chrome.contextMenus.onHidden.addListener(() => {});
```

## URL Filtering

```javascript
chrome.contextMenus.create({
  id: "admin",
  title: "Admin Tools",
  documentUrlPatterns: ["*://*.example.com/*"],
  contexts: ["page"]
});

chrome.contextMenus.create({
  id: "external-links",
  title: "Open External",
  targetUrlPatterns: ["http://*/*", "https://*/*"],
  contexts: ["link"]
});
```

## Icons (Chrome 128+)

```javascript
chrome.contextMenus.create({
  id: "search-icon",
  title: "Search",
  contexts: ["selection"],
  icons: { "16": "icons/search16.png", "32": "icons/search32.png" }
});
```

## Complete Example: Productivity Menu

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "search", title: "🔍 Search '%s'", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "translate", title: "🌐 Translate", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "copy", title: "📋 Copy", contexts: ["selection", "link"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = info.selectionText || info.linkUrl;
  switch (info.menuItemId) {
    case "search":
      chrome.tabs.create({ url: `https://google.com/search?q=${encodeURIComponent(info.selectionText)}` });
      break;
    case "translate":
      chrome.tabs.create({ url: `https://translate.google.com/?text=${encodeURIComponent(info.selectionText)}` });
      break;
    case "copy":
      navigator.clipboard.writeText(text);
      break;
  }
});
```

## Best Practices

1. Use string IDs for easier debugging
2. Check for `chrome.runtime.lastError`
3. Clean up menus in `onUninstalled`
4. Be specific with URL patterns
5. Use icons for discoverability (Chrome 128+)

## Reference

- [Chrome Context Menus API](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
- [Samples](https://developer.chrome.com/docs/extensions/mv3/samples#contextmenus)
