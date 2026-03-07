# Context Menus API Guide

## Overview
The Chrome Context Menus API allows extensions to add custom items to Chrome's right-click context menu. This powerful API enables users to perform actions on specific page elements, selected text, links, images, and other content directly from the context menu.

- Requires `"contextMenus"` permission in manifest.json
- Menu items are created in the background service worker and persist across browser restarts
- Items can be shown conditionally based on context types (selection, link, image, etc.)
- Supports nested menus, checkboxes, radio buttons, and separators

## manifest.json Setup

```json
{
  "name": "My Context Menu Extension",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": ["contextMenus"],
  "background": {
    "service_worker": "background.js"
  }
}
```

## Creating Menu Items

### chrome.contextMenus.create()

The primary method for adding items to the context menu. Menu items should be created in the `chrome.runtime.onInstalled` event listener to ensure they persist across service worker restarts.

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  // Create a simple menu item shown when text is selected
  chrome.contextMenus.create({
    id: "lookupSelection",
    title: "Look up '%s'",  // %s replaced with selected text
    contexts: ["selection"]  // Only show when text is selected
  });
});
```

**Key Properties:**
- `id` (required): Unique string identifier for the menu item
- `title`: Display text shown in the context menu; use `%s` as placeholder for contextual data
- `contexts`: Array of context types determining when the item appears
- `type`: Menu item type - "normal", "checkbox", "radio", or "separator"
- `parentId`: ID of parent menu for creating nested submenus

### Menu Item Types

**Normal (default):** Standard clickable menu item
```javascript
chrome.contextMenus.create({
  id: "normalItem",
  title: "Normal Menu Item",
  contexts: ["all"]
});
```

**Checkbox:** Toggleable item with on/off state
```javascript
chrome.contextMenus.create({
  id: "toggleFeature",
  title: "Enable Feature",
  type: "checkbox",
  checked: false,
  contexts: ["page"]
});
```

**Radio:** Mutually exclusive options within a group
```javascript
chrome.contextMenus.create({
  id: "option1",
  title: "Option 1",
  type: "radio",
  checked: true,
  contexts: ["page"]
});
chrome.contextMenus.create({
  id: "option2",
  title: "Option 2",
  type: "radio",
  checked: false,
  contexts: ["page"]
});
```

**Separator:** Visual divider between menu sections
```javascript
chrome.contextMenus.create({
  id: "separator1",
  type: "separator",
  contexts: ["page"]
});
```

## Context Types

Context types determine when menu items appear. You can specify multiple contexts to show an item in various situations.

| Context | Description |
|---------|-------------|
| `"all"` | Show in all contexts |
| `"page"` | Right-click on page background |
| `"selection"` | Text is selected on the page |
| `"link"` | Right-click on a hyperlink |
| `"image"` | Right-click on an image element |
| `"video"` | Right-click on a video element |
| `"audio"` | Right-click on an audio element |
| `"frame"` | Right-click within an iframe |
| `"editable"` | Right-click on input fields or textareas |
| `"launcher"` | ChromeOS app launcher |
| `"browser_action"` | Extension's toolbar icon (MV2) |
| `"action"` | Extension's toolbar icon (MV3) |

```javascript
// Show different items based on what's clicked
chrome.contextMenus.create({
  id: "openLink",
  title: "Open Link in New Tab",
  contexts: ["link"]
});

chrome.contextMenus.create({
  id: "copyImage",
  title: "Copy Image URL",
  contexts: ["image"]
});

chrome.contextMenus.create({
  id: "searchSelected",
  title: "Search for '%s'",
  contexts: ["selection"]
});
```

## Nested Menus (Submenus)

Create hierarchical menu structures using the `parentId` property.

```javascript
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu item
  chrome.contextMenus.create({
    id: "toolsMenu",
    title: "Developer Tools",
    contexts: ["page"]
  });

  // Child items under parent
  chrome.contextMenus.create({
    id: "inspectElement",
    parentId: "toolsMenu",
    title: "Inspect Element",
    contexts: ["page", "selection"]
  });

  chrome.contextMenus.create({
    id: "viewSource",
    parentId: "toolsMenu",
    title: "View Page Source",
    contexts: ["page"]
  });

  // Nested submenu
  chrome.contextMenus.create({
    id: "networkTools",
    parentId: "toolsMenu",
    title: "Network",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "clearCache",
    parentId: "networkTools",
    title: "Clear Cache",
    contexts: ["page"]
  });
});
```

## Handling Click Events

### chrome.contextMenus.onClicked

The `onClicked` event fires when a user clicks a context menu item. The callback receives two parameters: `info` containing click details and `tab` representing the active tab.

```javascript
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "lookupSelection":
      // Handle selected text
      if (info.selectionText) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(info.selectionText)}`;
        chrome.tabs.create({ url: searchUrl });
      }
      break;

    case "openLink":
      // Handle link click
      if (info.linkUrl) {
        chrome.tabs.create({ url: info.linkUrl });
      }
      break;

    case "copyImage":
      // Handle image click - use clipboard API
      if (info.srcUrl) {
        navigator.clipboard.writeText(info.srcUrl);
      }
      break;

    case "toggleFeature":
      // Handle checkbox toggle
      console.log("Checkbox checked:", info.checked);
      break;
  }
});
```

### OnClickData Properties

The `info` object contains contextual information about the click:

| Property | Description |
|----------|-------------|
| `menuItemId` | ID of the clicked menu item |
| `selectionText` | Selected text (when context includes "selection") |
| `pageUrl` | URL of the page where click occurred |
| `srcUrl` | URL of image/video/audio element |
| `linkUrl` | URL of the link (when context is "link") |
| `frameUrl` | URL of the iframe |
| `frameId` | ID of the frame |
| `editable` | Boolean indicating if element is editable |
| `checked` | Current checked state for checkbox/radio items |
| `wasChecked` | Previous checked state before this click |

## Dynamic Menu Updates

### chrome.contextMenus.update()

Modify existing menu items dynamically based on user actions or application state.

```javascript
// Update menu item properties
chrome.contextMenus.update("myItem", {
  title: "New Title",
  enabled: true,  // Enable/disable the item
  checked: true   // Update checkbox state
});

// Conditionally update based on tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  
  if (tab.url.startsWith("https://github.com")) {
    chrome.contextMenus.update("githubAction", {
      enabled: true,
      title: "GitHub Actions"
    });
  } else {
    chrome.contextMenus.update("githubAction", {
      enabled: false
    });
  }
});
```

### chrome.contextMenus.remove() and removeAll()

Remove specific items or all context menu items.

```javascript
// Remove a single menu item
chrome.contextMenus.remove("oldItem");

// Remove all context menu items (useful for cleanup)
chrome.contextMenus.removeAll();

// Remove entire submenu and children
chrome.contextMenus.remove("parentMenu");
```

## Pattern: Context-Aware Actions

### Selected Text Processing

A common pattern is performing actions on selected text, such as searching, translating, or dictionary lookup.

```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "defineWord",
    title: "Define '%s'",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "translateText",
    title: "Translate '%s'",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.selectionText) return;

  const selectedText = info.selectionText;

  switch (info.menuItemId) {
    case "defineWord":
      // Open dictionary lookup
      const dictUrl = `https://www.dictionary.com/browse/${encodeURIComponent(selectedText)}`;
      chrome.tabs.create({ url: dictUrl });
      break;

    case "translateText":
      // Open Google Translate
      const translateUrl = `https://translate.google.com/?text=${encodeURIComponent(selectedText)}`;
      chrome.tabs.create({ url: translateUrl });
      break;
  }
});
```

### Element-Specific Actions

Perform different actions based on what element was clicked.

```javascript
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const { menuItemId, srcUrl, linkUrl, pageUrl, selectionText } = info;

  if (menuItemId === "handleMedia" && srcUrl) {
    // Handle image/video/audio
    console.log("Media URL:", srcUrl);
  }

  if (menuItemId === "handleLink" && linkUrl) {
    // Handle link
    console.log("Link URL:", linkUrl);
  }

  if (menuItemId === "handleSelection" && selectionText) {
    // Handle text selection
    console.log("Selected:", selectionText);
  }
});
```

## Using @theluckystrike/extension-context-menu

For more advanced context menu functionality, consider using the `@theluckystrike/extension-context-menu` package, which provides TypeScript support and additional utilities.

```typescript
import { createContextMenu, ContextMenuManager } from '@theluckystrike/extension-context-menu';

const manager = new ContextMenuManager();

// Create menu with type safety
manager.create({
  id: 'search',
  title: 'Search "%s"',
  contexts: ['selection']
});

// Create checkbox with state management
manager.create({
  id: 'autoSave',
  title: 'Auto-save',
  type: 'checkbox',
  checked: true
});

// Handle clicks with typed info
manager.onClick.addListener((info) => {
  // Full TypeScript support
  if (info.menuItemId === 'search' && info.selectionText) {
    // Process selection
  }
});
```

## Best Practices

1. **Create menus in onInstalled:** Always create context menus within the `chrome.runtime.onInstalled` event listener. This ensures menus are created only once and persist across service worker restarts.

2. **Use descriptive IDs:** Choose clear, meaningful ID strings for menu items. This makes debugging and maintaining code easier.

3. **Limit menu items:** Too many menu items clutter the context menu. Prioritize the most common actions and consider using submenus for less frequently used options.

4. **Use appropriate contexts:** Only show menu items when relevant. Use "selection" for text operations, "link" for link-specific actions, and "image" for image-related features.

5. **Use documentUrlPatterns:** Limit menu items to specific websites using the `documentUrlPatterns` property for a more targeted experience.

```javascript
chrome.contextMenus.create({
  id: "githubFeature",
  title: "GitHub Feature",
  contexts: ["page"],
  documentUrlPatterns: ["https://github.com/*"]
});
```

6. **Handle all cases gracefully:** Always check if expected properties exist (e.g., `info.selectionText`, `info.linkUrl`) before using them.

## Common Mistakes

- **Creating menus outside onInstalled:** This causes duplicate menu items every time the service worker restarts.
- **Forgetting the id field:** Required in Manifest V3 (was optional in MV2).
- **Not handling all menuItemId values:** Use a switch statement or object map to handle all possible menu item IDs.
- **Assuming selectionText exists:** Always check `if (info.selectionText)` before using it.
- **Not using checked state for checkboxes:** Store and restore checkbox states using chrome.storage.

## Reference

- [Chrome Context Menus API Documentation](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
