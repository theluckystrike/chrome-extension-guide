---
layout: default
title: "Chrome Extension Context Menu Patterns — Best Practices"
description: "Create dynamic and contextual right-click menus with the Chrome Context Menus API."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/context-menu-patterns/"
---

# Context Menu Patterns

## Overview {#overview}

Context menus let Chrome extensions add items to the right-click menu on pages, selections, links, and images. The `chrome.contextMenus` API runs entirely in the service worker and supports nested hierarchies, radio buttons, checkboxes, and dynamic updates. This guide covers eight patterns for building context menus that adapt to context, coordinate with content scripts, and stay in sync with user preferences.

---

## Required Permissions {#required-permissions}

```jsonc
// manifest.json
{
  "permissions": ["contextMenus", "storage"],
  "background": {
    "service_worker": "background.ts",
    "type": "module"
  }
}
```

---

## Pattern 1: Dynamic Context Menu Creation on Install/Update {#pattern-1-dynamic-context-menu-creation-on-installupdate}

Menus must be recreated every time the service worker starts after an install or update. Use `chrome.runtime.onInstalled` to set them up once, and the browser persists them until the next update:

```ts
// background.ts
function createMenus(): void {
  // Remove all existing items to avoid duplicates on update
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "search-selection",
      title: "Search '%s' on MDN",
      contexts: ["selection"],
    });

    chrome.contextMenus.create({
      id: "save-page",
      title: "Save this page for later",
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "copy-link-markdown",
      title: "Copy link as Markdown",
      contexts: ["link"],
    });
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  createMenus();

  if (details.reason === "update") {
    console.log(`Updated from ${details.previousVersion}`);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "search-selection":
      const query = encodeURIComponent(info.selectionText ?? "");
      chrome.tabs.create({
        url: `https://developer.mozilla.org/en-US/search?q=${query}`,
      });
      break;
    case "save-page":
      chrome.storage.local.get({ savedPages: [] }, (data) => {
        const pages = data.savedPages as Array<{ url: string; title: string }>;
        pages.push({ url: info.pageUrl, title: tab?.title ?? "Untitled" });
        chrome.storage.local.set({ savedPages: pages });
      });
      break;
    case "copy-link-markdown":
      const markdown = `[${info.linkUrl}](${info.linkUrl})`;
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "COPY_TO_CLIPBOARD",
          text: markdown,
        });
      }
      break;
  }
});
```

The `removeAll` call inside `onInstalled` is important: without it, updating the extension can create duplicate entries if item IDs change between versions.

---

## Pattern 2: Nested Context Menus (Parent/Child Hierarchy) {#pattern-2-nested-context-menus-parentchild-hierarchy}

Use the `parentId` property to build multi-level menus. Chrome supports arbitrary nesting, but two levels is the practical maximum for usability:

```ts
// background.ts
function createNestedMenus(): void {
  chrome.contextMenus.removeAll(() => {
    // Top-level parent
    chrome.contextMenus.create({
      id: "translate",
      title: "Translate selection",
      contexts: ["selection"],
    });

    // Child items under "Translate selection"
    const languages = [
      { id: "translate-es", label: "Spanish" },
      { id: "translate-fr", label: "French" },
      { id: "translate-de", label: "German" },
      { id: "translate-ja", label: "Japanese" },
      { id: "translate-zh", label: "Chinese" },
    ];

    for (const lang of languages) {
      chrome.contextMenus.create({
        id: lang.id,
        parentId: "translate",
        title: lang.label,
        contexts: ["selection"],
      });
    }

    // Second top-level group
    chrome.contextMenus.create({
      id: "share",
      title: "Share page",
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "share-twitter",
      parentId: "share",
      title: "Twitter / X",
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "share-email",
      parentId: "share",
      title: "Email",
      contexts: ["page"],
    });
  });
}

chrome.runtime.onInstalled.addListener(createNestedMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (typeof info.menuItemId === "string" && info.menuItemId.startsWith("translate-")) {
    const langCode = (info.menuItemId as string).replace("translate-", "");
    const text = encodeURIComponent(info.selectionText ?? "");
    chrome.tabs.create({
      url: `https://translate.google.com/?sl=auto&tl=${langCode}&text=${text}`,
    });
  }

  if (info.menuItemId === "share-twitter") {
    const url = encodeURIComponent(info.pageUrl);
    chrome.tabs.create({
      url: `https://twitter.com/intent/tweet?url=${url}`,
    });
  }

  if (info.menuItemId === "share-email") {
    const subject = encodeURIComponent(tab?.title ?? "");
    chrome.tabs.create({
      url: `mailto:?subject=${subject}&body=${info.pageUrl}`,
    });
  }
});
```

When a parent item has children, clicking the parent itself does nothing -- only the children are actionable.

---

## Pattern 3: Context-Aware Menu Items {#pattern-3-context-aware-menu-items}

Different `contexts` values control where each item appears. You can create separate items for text selections, links, images, and plain page backgrounds:

```ts
// background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // Only appears when text is selected
    chrome.contextMenus.create({
      id: "count-words",
      title: "Count words in selection",
      contexts: ["selection"],
    });

    // Only appears on right-clicked links
    chrome.contextMenus.create({
      id: "archive-link",
      title: "Open in Wayback Machine",
      contexts: ["link"],
    });

    // Only appears on right-clicked images
    chrome.contextMenus.create({
      id: "reverse-search",
      title: "Reverse image search",
      contexts: ["image"],
    });

    // Only appears on the page background (no selection, link, or image)
    chrome.contextMenus.create({
      id: "page-stats",
      title: "Show page statistics",
      contexts: ["page"],
    });

    // Appears on editable fields (input, textarea, contenteditable)
    chrome.contextMenus.create({
      id: "insert-date",
      title: "Insert today's date",
      contexts: ["editable"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "count-words": {
      const words = (info.selectionText ?? "").split(/\s+/).filter(Boolean).length;
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "SHOW_NOTIFICATION",
          text: `Word count: ${words}`,
        });
      }
      break;
    }

    case "archive-link": {
      const target = encodeURIComponent(info.linkUrl ?? "");
      chrome.tabs.create({
        url: `https://web.archive.org/web/*/${target}`,
      });
      break;
    }

    case "reverse-search": {
      const imgUrl = encodeURIComponent(info.srcUrl ?? "");
      chrome.tabs.create({
        url: `https://lens.google.com/uploadbyurl?url=${imgUrl}`,
      });
      break;
    }

    case "page-stats": {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "COLLECT_PAGE_STATS" });
      }
      break;
    }

    case "insert-date": {
      if (tab?.id) {
        const today = new Date().toISOString().split("T")[0];
        chrome.tabs.sendMessage(tab.id, {
          type: "INSERT_TEXT",
          text: today,
        });
      }
      break;
    }
  }
});
```

The `contexts` array accepts multiple values per item. For example, `["selection", "link"]` makes the item appear on both text selections and links.

---

## Pattern 4: Context Menu with Radio Buttons and Checkboxes {#pattern-4-context-menu-with-radio-buttons-and-checkboxes}

Use `type: "radio"` and `type: "checkbox"` for toggleable settings directly in the context menu:

```ts
// background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // Parent group for theme selection
    chrome.contextMenus.create({
      id: "theme-group",
      title: "Reading theme",
      contexts: ["page"],
    });

    // Radio buttons -- only one in a group can be checked
    const themes = [
      { id: "theme-light", label: "Light" },
      { id: "theme-sepia", label: "Sepia" },
      { id: "theme-dark", label: "Dark" },
    ];

    for (const theme of themes) {
      chrome.contextMenus.create({
        id: theme.id,
        parentId: "theme-group",
        title: theme.label,
        type: "radio",
        checked: theme.id === "theme-light",
        contexts: ["page"],
      });
    }

    // Separator between groups
    chrome.contextMenus.create({
      id: "sep-1",
      type: "separator",
      contexts: ["page"],
    });

    // Checkboxes -- each toggles independently
    chrome.contextMenus.create({
      id: "opt-auto-save",
      title: "Auto-save articles",
      type: "checkbox",
      checked: false,
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "opt-notifications",
      title: "Show notifications",
      type: "checkbox",
      checked: true,
      contexts: ["page"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Radio button: info.checked is true for the newly selected item
  if (typeof info.menuItemId === "string" && info.menuItemId.startsWith("theme-")) {
    const theme = (info.menuItemId as string).replace("theme-", "");
    chrome.storage.local.set({ selectedTheme: theme });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "APPLY_THEME", theme });
    }
  }

  // Checkbox: info.checked reflects the new state after the click
  if (info.menuItemId === "opt-auto-save") {
    chrome.storage.local.set({ autoSave: info.checked });
  }

  if (info.menuItemId === "opt-notifications") {
    chrome.storage.local.set({ showNotifications: info.checked });
  }
});
```

Radio buttons are grouped by their `parentId`. All radios under the same parent form one exclusive group. Checkboxes are independent regardless of parent.

---

## Pattern 5: Per-Tab Context Menu Updates {#pattern-5-per-tab-context-menu-updates}

Enable or disable specific menu items based on the active tab's URL. Use `chrome.tabs.onActivated` and `chrome.tabs.onUpdated` to react to tab changes:

```ts
// background.ts
const GITHUB_MENU_ID = "github-tools";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: GITHUB_MENU_ID,
      title: "GitHub Tools",
      contexts: ["page"],
      enabled: false, // Disabled by default
    });

    chrome.contextMenus.create({
      id: "gh-copy-pr-link",
      parentId: GITHUB_MENU_ID,
      title: "Copy PR link as Markdown",
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "gh-view-raw",
      parentId: GITHUB_MENU_ID,
      title: "View raw file",
      contexts: ["page"],
    });
  });
});

function updateMenuForUrl(url: string | undefined): void {
  const isGitHub = url?.includes("github.com") ?? false;

  chrome.contextMenus.update(GITHUB_MENU_ID, {
    enabled: isGitHub,
    title: isGitHub ? "GitHub Tools" : "GitHub Tools (not on GitHub)",
  });
}

// Fires when the user switches tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateMenuForUrl(tab.url);
  });
});

// Fires when a tab finishes navigating
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    updateMenuForUrl(tab.url);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "gh-copy-pr-link" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "COPY_PR_MARKDOWN" });
  }

  if (info.menuItemId === "gh-view-raw" && tab?.url) {
    const rawUrl = tab.url
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/");
    chrome.tabs.create({ url: rawUrl });
  }
});
```

Note that `chrome.contextMenus.update` accepts the same properties as `create`. You can update `title`, `checked`, `enabled`, `visible`, `contexts`, `parentId`, `documentUrlPatterns`, `targetUrlPatterns`, and more.

---

## Pattern 6: Context Menu with Dynamic Sub-Items from Storage {#pattern-6-context-menu-with-dynamic-sub-items-from-storage}

Build menus whose children come from user data stored in `chrome.storage`. Rebuild the menu whenever storage changes:

```ts
// background.ts
interface SavedSearch {
  id: string;
  label: string;
  urlTemplate: string;
}

const DEFAULT_SEARCHES: SavedSearch[] = [
  { id: "search-google", label: "Google", urlTemplate: "https://google.com/search?q=%s" },
  { id: "search-stack", label: "StackOverflow", urlTemplate: "https://stackoverflow.com/search?q=%s" },
];

async function rebuildSearchMenu(): Promise<void> {
  const data = await chrome.storage.sync.get({ customSearches: DEFAULT_SEARCHES });
  const searches = data.customSearches as SavedSearch[];

  // Remove only our search items, then recreate
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: "quick-search",
    title: "Quick search '%s'",
    contexts: ["selection"],
  });

  for (const search of searches) {
    chrome.contextMenus.create({
      id: `qs-${search.id}`,
      parentId: "quick-search",
      title: search.label,
      contexts: ["selection"],
    });
  }

  chrome.contextMenus.create({
    id: "qs-manage",
    parentId: "quick-search",
    title: "Manage search engines...",
    contexts: ["selection"],
  });
}

// Build on install
chrome.runtime.onInstalled.addListener(() => {
  rebuildSearchMenu();
});

// Rebuild when the user adds or removes a search engine from the options page
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.customSearches) {
    rebuildSearchMenu();
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "qs-manage") {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (typeof info.menuItemId === "string" && info.menuItemId.startsWith("qs-")) {
    const data = await chrome.storage.sync.get({ customSearches: DEFAULT_SEARCHES });
    const searches = data.customSearches as SavedSearch[];
    const searchId = (info.menuItemId as string).replace("qs-", "");
    const engine = searches.find((s) => s.id === searchId);

    if (engine && info.selectionText) {
      const query = encodeURIComponent(info.selectionText);
      const url = engine.urlTemplate.replace("%s", query);
      chrome.tabs.create({ url });
    }
  }
});
```

Calling `removeAll` plus re-creating every item is the safest approach. Trying to diff and surgically update individual items adds complexity for little gain.

---

## Pattern 7: Context Menu Actions with Content Script Coordination {#pattern-7-context-menu-actions-with-content-script-coordination}

Some actions require reading or modifying the page DOM. The service worker sends a message, and the content script performs the work:

```ts
// background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "highlight-selection",
      title: "Highlight selection",
      contexts: ["selection"],
    });

    chrome.contextMenus.create({
      id: "extract-links",
      title: "Extract all links on page",
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "save-image-info",
      title: "Save image metadata",
      contexts: ["image"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case "highlight-selection":
      // Content script wraps the selection in a <mark> tag
      chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT_SELECTION" });
      break;

    case "extract-links": {
      // Content script reads all <a> tags and sends them back
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "EXTRACT_LINKS",
      });
      const links = response?.links as string[] | undefined;
      if (links) {
        await chrome.storage.local.set({
          [`links-${Date.now()}`]: { url: info.pageUrl, links },
        });
      }
      break;
    }

    case "save-image-info":
      chrome.tabs.sendMessage(tab.id, {
        type: "GET_IMAGE_INFO",
        srcUrl: info.srcUrl,
      });
      break;
  }
});
```

```ts
// content-script.ts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "HIGHLIGHT_SELECTION": {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const mark = document.createElement("mark");
        mark.style.backgroundColor = "#fef08a";
        range.surroundContents(mark);
      }
      break;
    }

    case "EXTRACT_LINKS": {
      const anchors = document.querySelectorAll("a[href]");
      const links = Array.from(anchors)
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith("http"));
      sendResponse({ links });
      return true; // Keep message channel open for async response
    }

    case "GET_IMAGE_INFO": {
      const img = document.querySelector(
        `img[src="${message.srcUrl}"]`
      ) as HTMLImageElement | null;
      if (img) {
        chrome.runtime.sendMessage({
          type: "IMAGE_INFO",
          data: {
            src: img.src,
            alt: img.alt,
            width: img.naturalWidth,
            height: img.naturalHeight,
          },
        });
      }
      break;
    }
  }
});
```

Always return `true` from `onMessage` listeners that call `sendResponse` asynchronously, otherwise the message channel closes immediately.

---

## Pattern 8: Keyboard Shortcut Hints in Context Menu Titles {#pattern-8-keyboard-shortcut-hints-in-context-menu-titles}

Show keyboard shortcuts alongside menu item titles so users learn them. Pull the binding from the manifest or `chrome.commands` API:

```ts
// background.ts
interface ShortcutMap {
  [commandName: string]: string;
}

async function getShortcutMap(): Promise<ShortcutMap> {
  const commands = await chrome.commands.getAll();
  const map: ShortcutMap = {};
  for (const cmd of commands) {
    if (cmd.name && cmd.shortcut) {
      map[cmd.name] = cmd.shortcut;
    }
  }
  return map;
}

function formatShortcut(shortcut: string): string {
  // Convert "Ctrl+Shift+S" to a more readable format
  return shortcut
    .replace("Ctrl", "\u2303")   // Control symbol
    .replace("Alt", "\u2325")    // Option symbol
    .replace("Shift", "\u21E7") // Shift symbol
    .replace("Command", "\u2318")
    .replace(/\+/g, "");
}

async function buildMenusWithShortcuts(): Promise<void> {
  const shortcuts = await getShortcutMap();

  chrome.contextMenus.removeAll(() => {
    const searchHint = shortcuts["quick-search"]
      ? `  (${formatShortcut(shortcuts["quick-search"])})`
      : "";

    chrome.contextMenus.create({
      id: "quick-search",
      title: `Quick search '%s'${searchHint}`,
      contexts: ["selection"],
    });

    const saveHint = shortcuts["save-page"]
      ? `  (${formatShortcut(shortcuts["save-page"])})`
      : "";

    chrome.contextMenus.create({
      id: "save-page",
      title: `Save page${saveHint}`,
      contexts: ["page"],
    });

    const screenshotHint = shortcuts["take-screenshot"]
      ? `  (${formatShortcut(shortcuts["take-screenshot"])})`
      : "";

    chrome.contextMenus.create({
      id: "take-screenshot",
      title: `Take screenshot${screenshotHint}`,
      contexts: ["page"],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  buildMenusWithShortcuts();
});

// Rebuild if the user changes shortcuts on chrome://extensions/shortcuts
chrome.commands.onCommand.addListener(() => {
  // No direct event for shortcut reassignment, so rebuild periodically
  // or on each command invocation to stay current
  buildMenusWithShortcuts();
});
```

The manifest must declare the commands for shortcuts to appear:

```jsonc
// manifest.json (partial)
{
  "commands": {
    "quick-search": {
      "suggested_key": { "default": "Ctrl+Shift+S" },
      "description": "Quick search selected text"
    },
    "save-page": {
      "suggested_key": { "default": "Ctrl+Shift+D" },
      "description": "Save current page"
    },
    "take-screenshot": {
      "suggested_key": { "default": "Ctrl+Shift+X" },
      "description": "Take a screenshot"
    }
  }
}
```

---

## Summary {#summary}

| Pattern | Purpose | Key API |
|---|---|---|
| 1. Dynamic creation | Build menus on install/update | `chrome.runtime.onInstalled`, `contextMenus.create` |
| 2. Nested menus | Parent/child hierarchy | `parentId` property |
| 3. Context-aware items | Different items for selection, link, image, page, editable | `contexts` array |
| 4. Radio and checkbox | Toggleable settings in the menu | `type: "radio"`, `type: "checkbox"` |
| 5. Per-tab updates | Enable/disable based on active URL | `contextMenus.update`, `tabs.onActivated` |
| 6. Dynamic sub-items | Children from storage data | `storage.onChanged`, `removeAll` + rebuild |
| 7. Content script coordination | DOM actions triggered from menu | `tabs.sendMessage`, `runtime.onMessage` |
| 8. Keyboard shortcut hints | Show bindings in menu titles | `chrome.commands.getAll` |
