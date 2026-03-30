---
layout: default
title: "Building Context Menus in Chrome Extensions. Developer Guide"
description: "A comprehensive tutorial on building context menus in Chrome extensions. Learn to use chrome.contextMenus API, create different menu item types, handle clicks, and implement best practices."
canonical_url: "https://bestchromeextensions.com/tutorials/context-menus-guide/"
last_modified_at: 2026-01-15
---

Building Context Menus in Chrome Extensions

Overview {#overview}

Context menus are a powerful way to extend Chrome's right-click functionality, allowing users to access your extension's features directly from any webpage, link, image, or selection. The `chrome.contextMenus` API enables you to create custom menu items that appear when users right-click on specific elements or areas in the browser.

This guide covers everything you need to build solid context menus: from basic menu creation to advanced patterns like nested hierarchies, dynamic updates, and cross-browser considerations.

Prerequisites {#prerequisites}

Before using the Context Menus API, add the `"contextMenus"` permission to your `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My Context Menu Extension",
  "version": "1.0",
  "permissions": ["contextMenus"],
  "background": {
    "service_worker": "background.js"
  }
}
```

Important Notes:
- The Context Menus API only works from background scripts (service workers in MV3)
- You cannot use this API from content scripts
- Menu items persist across browser sessions until explicitly removed

Understanding Context Types {#understanding-context-types}

The `contexts` property determines when your menu item appears. Chrome supports various context types:

| Context | Description | Use Case |
|---------|-------------|----------|
| `"all"` | All contexts | Debug tools, general features |
| `"page"` | Page background right-click | Global page actions |
| `"selection"` | Selected text | Text manipulation, search |
| `"link"` | Right-clicked links | Link-related actions |
| `"image"` | Right-clicked images | Image tools, save options |
| `"video"` | Right-clicked videos | Media manipulation |
| `"audio"` | Right-clicked audio | Audio processing tools |
| `"editable"` | Input fields, textareas | Form utilities |
| `"frame"` | Specific frames | Frame-specific actions |
| `"launcher"` | Browser action click | Quick access items |
| `"browser_action"` | Extension icon click | Quick actions |

Multiple Contexts

You can specify multiple contexts to show your menu item in various situations:

```js
chrome.contextMenus.create({
  id: "search-selection",
  title: "Search for '%s'",
  contexts: ["selection", "link"]
});
```

The `%s` placeholder gets replaced with the selected text or link URL depending on context.

Creating Menu Items {#creating-menu-items}

Basic Menu Item

Create a simple context menu item:

```js
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-dashboard",
    title: "Open Dashboard",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-dashboard") {
    chrome.tabs.create({ url: "https://example.com/dashboard" });
  }
});
```

Menu Item Types

Chrome supports four menu item types:

Normal Menu Item

```js
chrome.contextMenus.create({
  id: "normal-item",
  title: "Normal Menu Item",
  type: "normal",
  contexts: ["page"]
});
```

Checkbox Menu Item

```js
chrome.contextMenus.create({
  id: "enable-feature",
  title: "Enable Feature",
  type: "checkbox",
  checked: false,
  contexts: ["page"]
});
```

Checkbox items maintain state and can be toggled:

```js
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "enable-feature") {
    console.log("Feature enabled:", info.checked);
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, {
      action: "toggleFeature",
      enabled: info.checked
    });
  }
});
```

Radio Menu Item

```js
// Create radio group
const themes = ["light", "dark", "system"];

themes.forEach((theme, index) => {
  chrome.contextMenus.create({
    id: `theme-${theme}`,
    title: theme.charAt(0).toUpperCase() + theme.slice(1),
    type: "radio",
    checked: index === 2, // Default to "system"
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("theme-")) {
    const selectedTheme = info.menuItemId.replace("theme-", "");
    console.log("Selected theme:", selectedTheme);
    chrome.tabs.sendMessage(tab.id, {
      action: "setTheme",
      theme: selectedTheme
    });
  }
});
```

Separator

```js
chrome.contextMenus.create({
  id: "separator-1",
  type: "separator"
});
```

Nested Menus {#nested-menus}

Create hierarchical menus using parent IDs:

```js
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: "tools-parent",
    title: "Developer Tools",
    contexts: ["page"]
  });

  // Child items
  chrome.contextMenus.create({
    id: "tools-inspect",
    title: "Inspect Element",
    parentId: "tools-parent",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "tools-view-source",
    title: "View Page Source",
    parentId: "tools-parent",
    contexts: ["page"]
  });

  // Nested submenu
  chrome.contextMenus.create({
    id: "tools-network",
    title: "Network Tools",
    parentId: "tools-parent",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "tools-network-export",
    title: "Export HAR",
    parentId: "tools-network",
    contexts: ["page"]
  });
});
```

Dynamic Context Data

Access context-specific data in your click handlers:

```js
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context info:", {
    menuItemId: info.menuItemId,
    pageUrl: info.pageUrl,
    pageTitle: info.pageTitle,
    linkUrl: info.linkUrl,          // Available when clicking links
    linkText: info.linkText,         // Text of the link
    srcUrl: info.srcUrl,             // Available for images/video/audio
    mediaType: info.mediaType,      // "image", "video", "audio"
    selectionText: info.selectionText, // Available when text selected
    editable: info.editable,        // Whether clicked element is editable
    frameId: info.frameId,          // Frame ID if in subframe
    frameUrl: info.frameUrl         // URL of the frame
  });
});
```

Dynamic Updates {#dynamic-updates}

Update menu items based on page content or extension state:

```js
// Update menu when page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    // Update menu title based on page
    chrome.contextMenus.update("dynamic-item", {
      title: tab.title.substring(0, 50)
    });
  }
});

// Update based on selection in content script
// From content script:
document.addEventListener("mouseup", () => {
  const selection = window.getSelection().toString();
  if (selection.length > 0) {
    chrome.runtime.sendMessage({
      action: "updateSelection",
      selection: selection
    });
  }
});

// In background script:
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "updateSelection") {
    chrome.contextMenus.update("search-selected", {
      title: `Search "${message.selection.substring(0, 20)}" in Google`
    });
  }
});
```

Conditional Menu Items

Show or hide menu items based on page conditions:

```js
chrome.contextMenus.onShown.addListener((info, tab) => {
  // Check if we should show/hide items
  chrome.tabs.sendMessage(tab.id, { action: "checkPage" }, (response) => {
    if (response && response.isSupported) {
      chrome.contextMenus.update("supported-action", { visible: true });
    } else {
      chrome.contextMenus.update("supported-action", { visible: false });
    }
  });
});
```

Handling Clicks {#handling-clicks}

The primary event for handling context menu clicks:

```js
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "action-1":
      handleAction1(info, tab);
      break;
    case "action-2":
      handleAction2(info, tab);
      break;
    case "action-3":
      handleAction3(info, tab);
      break;
  }
});

function handleAction1(info, tab) {
  // Open a new tab
  chrome.tabs.create({ url: "https://example.com" });
}

function handleAction2(info, tab) {
  // Execute script in the page
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => console.log("Context menu action executed")
  });
}

function handleAction3(info, tab) {
  // Send message to content script
  chrome.tabs.sendMessage(tab.id, {
    action: "processSelection",
    data: info.selectionText
  });
}
```

Async Handling

Handle async operations properly:

```js
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "async-action") {
    try {
      // Example: Save to storage
      await chrome.storage.local.set({
        lastAction: {
          timestamp: Date.now(),
          url: info.pageUrl,
          selection: info.selectionText
        }
      });

      // Show notification
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Action Complete",
        message: "Selection saved successfully"
      });
    } catch (error) {
      console.error("Error:", error);
    }
  }
});
```

Icons in Menus {#icons-in-menus}

Add icons to your context menu items:

```js
chrome.contextMenus.create({
  id: "icon-item",
  title: "Item with Icon",
  contexts: ["page"],
  icons: {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "128": "icons/icon128.png"
  }
});
```

Best Practices for Icons:
- Provide multiple sizes (16, 32, 128 pixels)
- Use PNG format with transparency
- Keep icons simple and recognizable at small sizes
- Test icons in both light and dark themes

Using Extension Icons

```js
chrome.contextMenus.create({
  id: "extension-action",
  title: "Use Extension Icon",
  contexts: ["page"],
  icons: {
    "16": "extension_icon.png"
  }
});
```

Best Practices for UX {#best-practices}

1. Meaningful Titles

```js
//  Bad - unclear action
chrome.contextMenus.create({
  title: "Click Here",
  contexts: ["page"]
});

//  Good - clear action
chrome.contextMenus.create({
  title: "Save to My Extension",
  contexts: ["page"]
});
```

2. Use Contextual Titles

```js
// Show selected text in title
chrome.contextMenus.create({
  title: "Search '%s'",
  contexts: ["selection"]
});

// Show link URL for link context
chrome.contextMenus.create({
  title: "Open %s in New Tab",
  contexts: ["link"]
});
```

3. Organize with Separators

```js
// Group related actions
chrome.contextMenus.create({ id: "group-1-item-1", title: "Item 1", parentId: "group-1" });
chrome.contextMenus.create({ id: "group-1-item-2", title: "Item 2", parentId: "group-1" });
chrome.contextMenus.create({ id: "separator-1", type: "separator" });
chrome.contextMenus.create({ id: "group-2-item-1", title: "Item 1", parentId: "group-2" });
```

4. Provide Visual Feedback

```js
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Show feedback after action
  chrome.tabs.sendMessage(tab.id, {
    action: "showToast",
    message: "Action completed!"
  });
});
```

5. Handle Edge Cases

```js
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Check for missing context data
  if (info.menuItemId === "search-selection") {
    if (!info.selectionText) {
      chrome.notifications.create({
        type: "basic",
        title: "No Selection",
        message: "Please select text first"
      });
      return;
    }
    // Proceed with search
  }
});
```

6. Clean Up on Uninstall

```js
chrome.runtime.onUninstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    console.log("Context menus cleaned up");
  });
});
```

Complete Example {#complete-example}

Here's a comprehensive example combining all concepts:

```js
// background.js
class ContextMenuManager {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.createMenus();
    this.setupListeners();
    this.initialized = true;
  }

  async createMenus() {
    // Main parent menu
    chrome.contextMenus.create({
      id: "main-menu",
      title: "My Extension",
      contexts: ["page", "selection", "link", "image"]
    });

    // Page actions submenu
    chrome.contextMenus.create({
      id: "page-actions",
      title: "Page Actions",
      parentId: "main-menu",
      contexts: ["page"]
    });

    chrome.contextMenus.create({
      id: "page-screenshot",
      title: "Take Screenshot",
      parentId: "page-actions",
      contexts: ["page"]
    });

    chrome.contextMenus.create({
      id: "page-analyze",
      title: "Analyze Page",
      parentId: "page-actions",
      contexts: ["page"]
    });

    // Selection actions
    chrome.contextMenus.create({
      id: "selection-search",
      title: "Search '%s'",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "selection-copy",
      title: "Copy Formatted",
      contexts: ["selection"]
    });

    // Link actions
    chrome.contextMenus.create({
      id: "link-save",
      title: "Save Link",
      contexts: ["link"]
    });

    // Image actions
    chrome.contextMenus.create({
      id: "image-download",
      title: "Download Image",
      contexts: ["image"],
      icons: {
        "16": "icons/download16.png",
        "32": "icons/download32.png"
      }
    });

    // Settings (checkbox)
    chrome.contextMenus.create({
      id: "auto-enable",
      title: "Auto-enable on pages",
      type: "checkbox",
      checked: true,
      contexts: ["page"]
    });
  }

  setupListeners() {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleClick(info, tab);
    });

    // Dynamic updates based on page
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete") {
        this.updateForTab(tab);
      }
    });
  }

  async handleClick(info, tab) {
    const { menuItemId, pageUrl, selectionText, linkUrl, srcUrl } = info;

    switch (menuItemId) {
      case "page-screenshot":
        await this.takeScreenshot(tab);
        break;
      case "page-analyze":
        await this.analyzePage(tab);
        break;
      case "selection-search":
        this.searchSelection(selectionText);
        break;
      case "selection-copy":
        await this.copyFormatted(selectionText, tab);
        break;
      case "link-save":
        await this.saveLink(linkUrl);
        break;
      case "image-download":
        await this.downloadImage(srcUrl);
        break;
      case "auto-enable":
        await this.handleToggle(info.checked);
        break;
    }
  }

  async takeScreenshot(tab) {
    // Implementation for screenshot
    console.log("Taking screenshot of tab:", tab.id);
  }

  async analyzePage(tab) {
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: "analyze" });
  }

  searchSelection(text) {
    if (!text) return;
    const encoded = encodeURIComponent(text);
    chrome.tabs.create({ url: `https://www.google.com/search?q=${encoded}` });
  }

  async copyFormatted(text, tab) {
    chrome.tabs.sendMessage(tab.id, {
      action: "copyFormatted",
      text: text
    });
  }

  async saveLink(url) {
    if (!url) return;
    const { savedLinks = [] } = await chrome.storage.local.get("savedLinks");
    savedLinks.push({ url, savedAt: Date.now() });
    await chrome.storage.local.set({ savedLinks });
    this.notify("Link saved!");
  }

  async downloadImage(url) {
    if (!url) return;
    chrome.downloads.download({ url });
  }

  async handleToggle(enabled) {
    await chrome.storage.local.set({ autoEnable: enabled });
  }

  async updateForTab(tab) {
    // Update dynamic menu items based on tab
    console.log("Updating menus for tab:", tab.url);
  }

  notify(message) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "My Extension",
      message: message
    });
  }
}

// Initialize
const menuManager = new ContextMenuManager();
chrome.runtime.onInstalled.addListener(() => menuManager.initialize());
```

Troubleshooting {#troubleshooting}

Menu Not Appearing

1. Check permissions: Ensure `contextMenus` is in permissions
2. Verify background script: Context menus only work from background/service worker
3. Check contexts: Make sure you're using valid context types

Click Handler Not Firing

1. Verify ID matches: Check menuItemId exactly matches
2. Check tab ID: Ensure tab.id is valid
3. Add logging: Add console logs to debug

Icons Not Showing

1. Check file paths: Verify icons exist at specified paths
2. Manifest icons: Add icons to manifest if using default
3. File size: Ensure icons are correct size (16x16, 32x32, 128x128)

---

Related Articles {#related-articles}

- [Chrome Tabs API Guide](/tutorials/tabs-api-guide/). Learn to query, create, and manage browser tabs, often used together with context menus
- [Messaging Quickstart](/tutorials/messaging-quickstart/). Communication patterns between background scripts and content scripts for context menu actions
- [Build a Screenshot Tool Extension](/tutorials/build-screenshot-tool/). Practical example combining context menus with screenshot capture functionality

---

Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).
