---
layout: default
title: "Chrome API Reference Overview"
description: "A comprehensive reference for Chrome Extensions APIs in Manifest V3, covering permissions, methods, events, types, and practical code examples for all extension capabilities."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/README/"
---

# Chrome API Reference

A comprehensive reference for the Chrome Extensions APIs available in Manifest V3. Each article covers permissions, methods, events, types, and practical code examples.

## Getting Started with Chrome Extension APIs

Chrome provides a rich set of APIs that enable extensions to interact with the browser in powerful ways. This reference covers the most commonly used APIs, from managing tabs and windows to handling storage, notifications, and background tasks.

### Understanding API Categories

Chrome Extension APIs are organized into several categories based on their functionality. Understanding these categories helps you quickly find the right API for your needs.

## Tab & Window Management

## Tab & Window Management {#tab-window-management}

- [Chrome Tabs API Reference](tabs-api.md) -- Create, modify, query, and rearrange browser tabs using the most heavily used Chrome extension API.
- [Chrome Windows API Reference](windows-api.md) -- Create, modify, query, and monitor browser windows alongside the Tabs API.

### When to Use These APIs

The tabs and windows APIs are essential for any extension that interacts with web content. Use the tabs API when you need to:
- Create new tabs or modify existing ones
- Query information about open tabs
- Capture tab content or screenshots
- Manage tab groups
- Listen for tab lifecycle events

Use the windows API when you need to:
- Create popup windows
- Focus or minimize windows
- Get information about the current window
- Manage window state

## Data & Storage

## Data & Storage {#data-storage}

- [Chrome Bookmarks API Reference](bookmarks-api.md) -- Create, read, update, delete, search, and organize bookmarks in a tree structure.
- [Chrome History API Reference](history-api.md) -- Search, read, add, and delete browser history entries and visit records.
- [Chrome Downloads API Reference](downloads-api.md) -- Initiate, monitor, search, pause, resume, cancel, and manage file downloads.
- [Chrome Storage API Deep Dive](storage-api-deep-dive.md) -- In-depth coverage of all four storage areas, quota management, change listeners, and advanced usage patterns.

### Storage API Overview

Chrome provides four storage areas:
- **local**: Stored locally, not synced, limited only by available disk space
- **sync**: Synced across user's Chrome instances via their Google account
- **managed**: Set by enterprise policies, read-only for extensions
- **session**: Cleared when the last browser session ends

Choose the appropriate storage type based on whether you need syncing, persistence, or policy management.

## Background & Scheduling

## Background & Scheduling {#background-scheduling}

- [Chrome Alarms API Reference](alarms-api.md) -- Schedule code to run periodically or at a specified time, the primary mechanism for reliable background work in MV3.
- [Chrome Runtime API Reference](runtime-api.md) -- Core extension lifecycle management, messaging, and utility functions available to every extension.

### Background Processing in MV3

In Manifest V3, background scripts are replaced by service workers. The alarms API becomes crucial for scheduling periodic tasks since service workers can be terminated by the browser when idle.

## User Interface

## User Interface {#user-interface}

- [Chrome Notifications API Reference](notifications-api.md) -- Create rich desktop notifications using templates that appear as system-level alerts outside the browser.
- [Chrome Context Menus API Reference](context-menus-api.md) -- Add custom items to Chrome's right-click context menu for pages, links, images, and selections.

### Building Effective UIs

When extending Chrome's UI, consider:
- Notifications should be timely and relevant
- Context menu items should provide value without cluttering the menu
- Always provide keyboard alternatives where possible
- Test UI elements across different Chrome configurations

## Common API Patterns

### Handling Asynchronous Operations

Most Chrome APIs return Promises or accept callbacks. In modern extensions, prefer async/await:

```javascript
// Modern approach with async/await
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}
```

### Error Handling

Always handle potential errors when calling Chrome APIs:

```javascript
try {
  await chrome.storage.sync.set({ key: value });
} catch (error) {
  console.error('Storage error:', error);
  // Fallback or user notification
}
```

### Permissions and Manifest

Always declare required permissions in your manifest:

```json
{
  "permissions": ["tabs", "storage"],
  "host_permissions": ["<all_urls>"]
}
```

## Best Practices

### Minimize Permissions
Only request the permissions your extension actually needs. This improves user trust and simplifies Chrome Web Store review.

### Handle API Availability
Some APIs may not be available in all Chrome versions or contexts. Always check for API availability:

```javascript
if (chrome.tabs) {
  // Use tabs API
}
```

### Use Offscreen Documents for Clipboard
In MV3, use offscreen documents when you need to access clipboard APIs from service workers.

### Test Across Chrome Versions
APIs may behave differently across Chrome versions. Test your extension with stable, beta, and dev channels.

## See Also

## See Also {#see-also}

- [Permissions Reference](../permissions/) -- Detailed breakdown of each Chrome extension permission and its user-facing warnings.
- [Guides](../guides/) -- Step-by-step tutorials for building Chrome extensions with MV3.
