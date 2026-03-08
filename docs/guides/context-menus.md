---
layout: default
title: "Chrome Extension Context Menus — How to Add Right-Click Menu Options"
description: "Learn how to use the chrome.contextMenus API to create custom right-click menu options in Chrome extensions with dynamic menus, nested items, and event handling."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/context-menus/"
---
# Chrome Extension Context Menus — How to Add Right-Click Menu Options

## Introduction {#introduction}

The `chrome.contextMenus` API allows Chrome extensions to add custom items to the browser's context menu—the menu that appears when a user right-clicks on a page, link, image, or other element. This powerful API enables developers to create intuitive right-click workflows that enhance user productivity and provide quick access to extension functionality directly from the browser interface.

## Adding the Required Permission {#adding-the-required-permission}

To use the contextMenus API, you must declare the `"contextMenus"` permission in your extension's `manifest.json` file. This permission is required regardless of whether you're creating simple or complex menu structures.

```json
{
  "manifest_version": 3,
  "name": "My Context Menu Extension",
  "version": "1.0",
  "permissions": ["contextMenus"]
}
```

Note that context menus require a background service worker to handle menu click events. Make sure your extension has a properly configured background section in the manifest.

## Creating Basic Context Menu Items {#creating-basic-context-menu-items}

The foundation of any context menu implementation is the `chrome.contextMenus.create()` method. This method accepts an object that defines the menu item's properties, including its title, ID, and the contexts where it should appear.

```javascript
// In your background service worker
chrome.contextMenus.create({
  id: "sample-menu-item",
  title: "Sample Menu Item",
  contexts: ["page", "selection"]
});
```

The `contexts` array specifies where your menu item will appear. Common context values include `"page"` (anywhere on the page), `"selection"` (when text is selected), `"link"` (on hyperlinks), `"image"` (on images), and `"editable"` (in text input fields). You can also use `"all"` to show your menu item in every possible context.

## Menu Types and Their Uses {#menu-types-and-their-uses}

The contextMenus API supports several menu item types that serve different purposes within your extension's menu hierarchy.

### Normal Items

Normal menu items are the standard clickable options that perform actions when selected. They can display text and optional icons, and they trigger events in your extension's background script.

```javascript
chrome.contextMenus.create({
  id: "copy-page-info",
  title: "Copy Page Info",
  contexts: ["page"]
});
```

### Checkbox Items

Checkbox items provide a binary on/off state that persists across browser sessions when stored properly. These are useful for toggling extension features or tracking user preferences.

```javascript
chrome.contextMenus.create({
  id: "enable-feature",
  title: "Enable Feature",
  type: "checkbox",
  checked: false,
  contexts: ["page"]
});
```

### Radio Items

Radio items function as a group where only one option can be selected at a time. They are ideal for providing mutually exclusive choices, such as choosing an action mode or selecting from preset options.

```javascript
chrome.contextMenus.create({
  id: "action-mode",
  title: "Action Mode",
  type: "radio",
  checked: true,
  contexts: ["selection"],
  paths: ["mode-1", "mode-2", "mode-3"]
});
```

### Separator Items

Separators create visual divisions between related menu items, helping users navigate through complex menus by grouping related options together.

```javascript
chrome.contextMenus.create({
  id: "menu-separator",
  type: "separator"
});
```

## Dynamic Menus {#dynamic-menus}

One of the most powerful features of the contextMenus API is the ability to create dynamic menus that change based on context, user actions, or stored data. Unlike static menus defined at installation, dynamic menus can be created and updated in response to runtime conditions.

### Creating Dynamic Menus at Runtime

```javascript
// Create a dynamic menu based on current tab
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "dynamic-menu",
    title: "Dynamic Options",
    contexts: ["page"]
  });
});

// Update menu based on page content or user preferences
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.startsWith("http")) {
    chrome.contextMenus.update("dynamic-menu", {
      title: `Process: ${new URL(tab.url).hostname}`
    });
  }
});
```

## Nested Menus and Hierarchical Structures {#nested-menus-and-hierarchical-structures}

Creating nested menu structures allows you to organize related options into logical groups, improving the user experience for complex extensions. You achieve this by using parent IDs to establish hierarchical relationships between menu items.

### Building Menu Hierarchies

```javascript
// Create parent menu
chrome.contextMenus.create({
  id: "parent-menu",
  title: "Advanced Actions",
  contexts: ["page"]
});

// Create child items under the parent
chrome.contextMenus.create({
  id: "child-action-1",
  parentId: "parent-menu",
  title: "Action One",
  contexts: ["page"]
});

chrome.contextMenus.create({
  id: "child-action-2",
  parentId: "parent-menu",
  title: "Action Two",
  contexts: ["page"]
});

// Create a submenu under a child item
chrome.contextMenus.create({
  id: "submenu-parent",
  parentId: "child-action-1",
  title: "Submenu Options",
  contexts: ["page"]
});
```

## Event Handling {#event-handling}

When a user clicks on a context menu item, your extension receives an event containing information about the clicked item and the context where it was triggered. The `chrome.contextMenus.onClicked` event is the primary handler for menu item interactions.

### Handling Menu Clicks

```javascript
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "copy-page-info":
      // Access page information from info object
      const pageTitle = info.pageTitle;
      const pageUrl = info.pageUrl;
      
      // Perform action - for example, copy to clipboard
      navigator.clipboard.writeText(`${pageTitle}\n${pageUrl}`);
      break;
      
    case "enable-feature":
      // Check the checked state for checkbox/radio items
      if (info.checked) {
        console.log("Feature enabled");
      } else {
        console.log("Feature disabled");
      }
      break;
      
    case "child-action-1":
      // Handle child menu item
      chrome.tabs.sendMessage(tab.id, { action: "action-one" });
      break;
  }
});
```

The `info` object provides valuable context about the menu click, including the `menuItemId` (the ID of clicked item), `pageUrl` (URL of the page where click occurred), `pageTitle` (title of the page), `selectionText` (any selected text), `linkUrl` (if clicking on a link), and `srcUrl` (if clicking on an image or media).

## Best Practices {#best-practices}

When implementing context menus in your Chrome extension, consider the following best practices to ensure a smooth user experience and maintainable code.

### Menu Organization

Keep your context menus organized and intuitive. Use separators to group related items, and limit the number of top-level items to avoid overwhelming users. When possible, use nested menus to create logical hierarchies.

### Performance Considerations

Context menu items should be created efficiently. If you need to create many items dynamically, consider caching and updating existing items rather than recreating them. Also, remove unused menu items to prevent memory leaks.

### User Feedback

Provide visual feedback when users interact with your menu items, especially for actions that take time to complete. Consider using the Chrome notifications API or updating the extension badge to indicate processing status.

## Cleaning Up {#cleaning-up}

When your extension no longer needs context menu items, or during development when you need to reset the menu state, use the `chrome.contextMenus.removeAll()` method to remove all items at once.

```javascript
// Remove all context menu items
chrome.contextMenus.removeAll(() => {
  console.log("All context menus removed");
});
```

This is particularly useful in your extension's uninstall handler or when resetting settings that affect menu visibility.
