---
layout: default
title: "Chrome Extension Context Menus. How to Add Right-Click Menu Options"
description: "Learn how to use the chrome.contextMenus API to create custom right-click menu options in Chrome extensions with dynamic menus, nested items, and event handling."
canonical_url: "https://bestchromeextensions.com/guides/context-menus/"
last_modified_at: 2026-01-15
---
Chrome Extension Context Menus. How to Add Right-Click Menu Options

Introduction {#introduction}

The `chrome.contextMenus` API allows Chrome extensions to add custom items to the browser's context menu, the menu that appears when a user right-clicks on a page, link, image, or other element. This powerful API enables developers to create intuitive right-click workflows that enhance user productivity and provide quick access to extension functionality directly from the browser interface.

Adding the Required Permission {#adding-the-required-permission}

To use the contextMenus API, you must declare the `"contextMenus"` permission in your extension's `manifest.json` file. This permission is required regardless of whether you're creating simple or complex menu structures.

```json
{
  "manifest_version": 3,
  "name": "My Context Menu Extension",
  "version": "1.0",
  "permissions": ["contextMenus"]
Context Menus API Guide

Overview
The Chrome Context Menus API allows extensions to add custom items to Chrome's right-click context menu. This powerful API enables users to perform actions on specific page elements, selected text, links, images, and other content directly from the context menu.

- Requires `"contextMenus"` permission in manifest.json
- Menu items are created in the background service worker and persist across browser restarts
- Items can be shown conditionally based on context types (selection, link, image, etc.)
- Supports nested menus, checkboxes, radio buttons, and separators

manifest.json Setup

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

Note that context menus require a background service worker to handle menu click events. Make sure your extension has a properly configured background section in the manifest.

Creating Basic Context Menu Items {#creating-basic-context-menu-items}

The foundation of any context menu implementation is the `chrome.contextMenus.create()` method. This method accepts an object that defines the menu item's properties, including its title, ID, and the contexts where it should appear.

Chrome Context Menus API

The Chrome Context Menus API adds items to Chrome's right-click menu, enabling contextual interactions with text selections, links, images, or entire pages.

Required Permission

```json
{
  "name": "My Extension",
  "permissions": ["contextMenus"],
  "manifest_version": 3
}
```

Core Methods

chrome.contextMenus.create()

Creates a new context menu item:

```javascript
// In your background service worker
chrome.contextMenus.create({
  id: "sample-menu-item",
  title: "Sample Menu Item",
  contexts: ["page", "selection"]
});
```

The `contexts` array specifies where your menu item will appear. Common context values include `"page"` (anywhere on the page), `"selection"` (when text is selected), `"link"` (on hyperlinks), `"image"` (on images), and `"editable"` (in text input fields). You can also use `"all"` to show your menu item in every possible context.

Menu Types and Their Uses {#menu-types-and-their-uses}

The contextMenus API supports several menu item types that serve different purposes within your extension's menu hierarchy.

Normal Items

Normal menu items are the standard clickable options that perform actions when selected. They can display text and optional icons, and they trigger events in your extension's background script.

```javascript
chrome.contextMenus.create({
  id: "copy-page-info",
  title: "Copy Page Info",
  contexts: ["page"]
});
```

Checkbox Items
  id: "search-selection",
  title: "Search '%s'",
  contexts: ["selection"]
}, () => {
  if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
});
```

Key properties: `id`, `title`, `contexts`, `parentId`, `checked`, `visible`, `enabled`, `icons` (Chrome 128+).

chrome.contextMenus.update()

Modifies an existing item:

```javascript
chrome.contextMenus.update("search-selection", { title: "Find '%s' in Google" });
```

chrome.contextMenus.remove()

Removes a specific item:

```javascript
chrome.contextMenus.remove("search-selection", () => {});
```

chrome.contextMenus.removeAll()

Clears all context menus created by your extension:

```javascript
chrome.contextMenus.removeAll(() => {});
```

Context Types

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

Item Types

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

Parent-Child Hierarchies

Create nested menus:

```javascript
chrome.contextMenus.create({ id: "search-tools", title: "Search Tools", contexts: ["selection"] });
chrome.contextMenus.create({ id: "search-google", parentId: "search-tools", title: "Google", contexts: ["selection"] });
chrome.contextMenus.create({ id: "search-wiki", parentId: "search-tools", title: "Wikipedia", contexts: ["selection"] });
```

Checkbox items provide a binary on/off state that persists across browser sessions when stored properly. These are useful for toggling extension features or tracking user preferences.

```javascript
chrome.contextMenus.create({
  id: "enable-feature",
chrome.contextMenus.create()

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

Key Properties:
- `id` (required): Unique string identifier for the menu item
- `title`: Display text shown in the context menu; use `%s` as placeholder for contextual data
- `contexts`: Array of context types determining when the item appears
- `type`: Menu item type - "normal", "checkbox", "radio", or "separator"
- `parentId`: ID of parent menu for creating nested submenus

Menu Item Types

Normal (default): Standard clickable menu item
```javascript
chrome.contextMenus.create({
  id: "normalItem",
  title: "Normal Menu Item",
  contexts: ["all"]
});
```

Checkbox: Toggleable item with on/off state
```javascript
chrome.contextMenus.create({
  id: "toggleFeature",
  title: "Enable Feature",
  type: "checkbox",
  checked: false,
  contexts: ["page"]
});
```

Radio Items

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

Separator Items

Separators create visual divisions between related menu items, helping users navigate through complex menus by grouping related options together.

```javascript
chrome.contextMenus.create({
  id: "menu-separator",
  type: "separator"
});
```

Dynamic Menus {#dynamic-menus}

One of the most powerful features of the contextMenus API is the ability to create dynamic menus that change based on context, user actions, or stored data. Unlike static menus defined at installation, dynamic menus can be created and updated in response to runtime conditions.

Creating Dynamic Menus at Runtime

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

Nested Menus and Hierarchical Structures {#nested-menus-and-hierarchical-structures}

Creating nested menu structures allows you to organize related options into logical groups, improving the user experience for complex extensions. You achieve this by using parent IDs to establish hierarchical relationships between menu items.

Building Menu Hierarchies

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

Event Handling {#event-handling}

When a user clicks on a context menu item, your extension receives an event containing information about the clicked item and the context where it was triggered. The `chrome.contextMenus.onClicked` event is the primary handler for menu item interactions.

Handling Menu Clicks

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
Radio: Mutually exclusive options within a group
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

Separator: Visual divider between menu sections
```javascript
chrome.contextMenus.create({
  id: "separator1",
  type: "separator",
  contexts: ["page"]
});
```

Context Types

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

Nested Menus (Submenus)

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

Handling Click Events

chrome.contextMenus.onClicked

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

The `info` object provides valuable context about the menu click, including the `menuItemId` (the ID of clicked item), `pageUrl` (URL of the page where click occurred), `pageTitle` (title of the page), `selectionText` (any selected text), `linkUrl` (if clicking on a link), and `srcUrl` (if clicking on an image or media).

Best Practices {#best-practices}

When implementing context menus in your Chrome extension, consider the following best practices to ensure a smooth user experience and maintainable code.

Menu Organization

Keep your context menus organized and intuitive. Use separators to group related items, and limit the number of top-level items to avoid overwhelming users. When possible, use nested menus to create logical hierarchies.

Performance Considerations

Context menu items should be created efficiently. If you need to create many items dynamically, consider caching and updating existing items rather than recreating them. Also, remove unused menu items to prevent memory leaks.

User Feedback

Provide visual feedback when users interact with your menu items, especially for actions that take time to complete. Consider using the Chrome notifications API or updating the extension badge to indicate processing status.

Cleaning Up {#cleaning-up}

When your extension no longer needs context menu items, or during development when you need to reset the menu state, use the `chrome.contextMenus.removeAll()` method to remove all items at once.

```javascript
// Remove all context menu items
chrome.contextMenus.removeAll(() => {
  console.log("All context menus removed");
});
```

This is particularly useful in your extension's uninstall handler or when resetting settings that affect menu visibility.
OnClickData Properties

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

Dynamic Menu Updates

chrome.contextMenus.update()

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

chrome.contextMenus.remove() and removeAll()

Remove specific items or all context menu items.

```javascript
// Remove a single menu item
chrome.contextMenus.remove("oldItem");

// Remove all context menu items (useful for cleanup)
chrome.contextMenus.removeAll();

// Remove entire submenu and children
chrome.contextMenus.remove("parentMenu");
```

Pattern: Context-Aware Actions

Selected Text Processing

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

Element-Specific Actions

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

Using @theluckystrike/extension-context-menu

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
`info` properties: `menuItemId`, `pageUrl`, `linkUrl`, `srcUrl`, `selectionText`, `editable`.

Dynamic Menus

Update menus based on context:

```javascript
chrome.contextMenus.onShown.addListener((info, tab) => {
  chrome.contextMenus.update("dynamic-item", { visible: info.selectionText.length > 0 });
});
chrome.contextMenus.onHidden.addListener(() => {});
```

URL Filtering

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

Icons (Chrome 128+)

```javascript
chrome.contextMenus.create({
  id: "search-icon",
  title: "Search",
  contexts: ["selection"],
  icons: { "16": "icons/search16.png", "32": "icons/search32.png" }
});
```

Complete Example: Productivity Menu

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "search", title: " Search '%s'", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "translate", title: " Translate", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "copy", title: " Copy", contexts: ["selection", "link"] });
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

Best Practices

1. Create menus in onInstalled: Always create context menus within the `chrome.runtime.onInstalled` event listener. This ensures menus are created only once and persist across service worker restarts.

2. Use descriptive IDs: Choose clear, meaningful ID strings for menu items. This makes debugging and maintaining code easier.

3. Limit menu items: Too many menu items clutter the context menu. Prioritize the most common actions and consider using submenus for less frequently used options.

4. Use appropriate contexts: Only show menu items when relevant. Use "selection" for text operations, "link" for link-specific actions, and "image" for image-related features.

5. Use documentUrlPatterns: Limit menu items to specific websites using the `documentUrlPatterns` property for a more targeted experience.

```javascript
chrome.contextMenus.create({
  id: "githubFeature",
  title: "GitHub Feature",
  contexts: ["page"],
  documentUrlPatterns: ["https://github.com/*"]
});
```

6. Handle all cases gracefully: Always check if expected properties exist (e.g., `info.selectionText`, `info.linkUrl`) before using them.

Common Mistakes

- Creating menus outside onInstalled: This causes duplicate menu items every time the service worker restarts.
- Forgetting the id field: Required in Manifest V3 (was optional in MV2).
- Not handling all menuItemId values: Use a switch statement or object map to handle all possible menu item IDs.
- Assuming selectionText exists: Always check `if (info.selectionText)` before using it.
- Not using checked state for checkboxes: Store and restore checkbox states using chrome.storage.

Reference

- [Chrome Context Menus API Documentation](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

1. Use string IDs for easier debugging
2. Check for `chrome.runtime.lastError`
3. Clean up menus in `onUninstalled`
4. Be specific with URL patterns
5. Use icons for discoverability (Chrome 128+)

Reference

- [Chrome Context Menus API](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
- [Samples](https://developer.chrome.com/docs/extensions/mv3/samples#contextmenus)
