---
layout: post
title: "Chrome Action API Guide: Popup, Badge, and Click Handling"
description: "Complete guide to the Chrome Action API for Manifest V3. Learn how to manage popups, badges, icons, click handlers, and migrate from browserAction to action."
date: 2025-01-24
categories: [Chrome-Extensions, API-Guide]
tags: [chrome-extension, api, tutorial, manifest-v3]
keywords: "chrome.action api, extension popup api, browserAction to action migration, chrome extension badge, toolbar icon api"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/24/chrome-action-api-guide/"
---

# Chrome Action API Guide: Popup, Badge, and Click Handling

The `chrome.action` API controls your extension's toolbar icon — the small button that sits in Chrome's toolbar and serves as the primary interaction point between your extension and the user. Through this API, you can manage popups, display dynamic badges, change icons, handle click events, and provide contextual information to users at a glance.

In Manifest V3, `chrome.action` replaces both `chrome.browserAction` and `chrome.pageAction` from Manifest V2, unifying toolbar icon management into a single, streamlined API. This guide covers every method and event in the Action API, with practical examples and patterns for building polished extension interfaces.

---

## Understanding the Action API {#understanding-action-api}

Every Chrome extension can have a toolbar icon, which Chrome calls an "action." The Action API gives you programmatic control over this icon and its associated behaviors. When a user installs your extension, the toolbar icon is the most visible part of your extension's presence in the browser.

The Action API lets you control four main aspects of the toolbar icon:

1. **Popup**: An HTML page that opens when the user clicks the icon
2. **Badge**: A small text overlay on the icon (up to 4 characters)
3. **Icon**: The image displayed in the toolbar
4. **Title/Tooltip**: Text shown when the user hovers over the icon

Additionally, the API fires events when users interact with the icon, allowing your extension to respond to clicks when no popup is configured.

### Manifest Declaration

To use the Action API, declare the `"action"` key in your `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "My Extension",
    "default_popup": "popup.html"
  },
  "permissions": []
}
```

No special permissions are needed for the Action API — the `"action"` manifest key is sufficient. However, if you want to use the `onClicked` event, you must not declare a `default_popup` (or you must programmatically remove it), because the popup intercepts the click.

---

## Popup Management {#popup-management}

The popup is an HTML page that opens in a small window anchored to the toolbar icon when the user clicks it. It is the most common way extensions present a user interface.

### Static Popup

The simplest approach is declaring a popup in the manifest:

```json
{
  "action": {
    "default_popup": "popup.html"
  }
}
```

The popup HTML file works like any web page, but runs in the extension context:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 320px;
      min-height: 200px;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 12px;
    }
    .status {
      padding: 8px 12px;
      border-radius: 6px;
      background: #e8f5e9;
      color: #2e7d32;
    }
    button {
      margin-top: 12px;
      padding: 8px 16px;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #3367d6;
    }
  </style>
</head>
<body>
  <h1>Extension Status</h1>
  <div class="status" id="status">Active</div>
  <button id="actionBtn">Run Analysis</button>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
document.getElementById('actionBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  // Send a message to the service worker
  const response = await chrome.runtime.sendMessage({
    type: 'ANALYZE',
    tabId: tab.id
  });

  document.getElementById('status').textContent = response.status;
});
```

### Dynamic Popup Switching

You can change the popup at runtime based on context:

```javascript
// background.js — set different popups based on the active tab
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);

  if (tab.url?.includes('github.com')) {
    await chrome.action.setPopup({
      tabId,
      popup: 'popups/github-tools.html'
    });
  } else if (tab.url?.includes('docs.google.com')) {
    await chrome.action.setPopup({
      tabId,
      popup: 'popups/docs-tools.html'
    });
  } else {
    await chrome.action.setPopup({
      tabId,
      popup: 'popup.html'
    });
  }
});
```

### Disabling the Popup for Click Handling

To use `chrome.action.onClicked` instead of a popup, either omit `default_popup` from the manifest or clear it at runtime:

```javascript
// Remove the popup so onClicked fires
await chrome.action.setPopup({ popup: '' });

// Retrieve the current popup
const popup = await chrome.action.getPopup({});
console.log('Current popup:', popup); // '' if none
```

### Programmatically Opening the Popup

Starting in Chrome 127, you can open the popup programmatically in response to certain user actions:

```javascript
// Open the popup from a keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-popup') {
    await chrome.action.openPopup();
  }
});
```

Note: `openPopup()` can only be called in response to a user action (such as a keyboard shortcut). It cannot be called from a timer or arbitrary background logic.

---

## Badge Text and Color {#badges}

Badges are small text overlays displayed on top of your toolbar icon. They are perfect for showing counts, statuses, or brief notifications.

### Setting Badge Text

```javascript
// Set a global badge
await chrome.action.setBadgeText({ text: '42' });

// Set a tab-specific badge
await chrome.action.setBadgeText({
  tabId: tabId,
  text: '3'
});

// Clear the badge
await chrome.action.setBadgeText({ text: '' });
```

Badge text is limited to about 4 characters. Longer text is truncated. Use numbers, short abbreviations, or symbols.

### Badge Background Color

```javascript
// Set badge background color (RGBA array or hex string)
await chrome.action.setBadgeBackgroundColor({
  color: '#FF0000'
});

// Using RGBA array
await chrome.action.setBadgeBackgroundColor({
  color: [255, 0, 0, 255]
});

// Tab-specific color
await chrome.action.setBadgeBackgroundColor({
  tabId: tabId,
  color: '#4CAF50'
});
```

### Badge Text Color

Starting in Chrome 110, you can also control the text color:

```javascript
await chrome.action.setBadgeTextColor({
  color: '#FFFFFF'
});
```

### Practical Badge Patterns

Here is a pattern for showing an unread count badge that updates in real time:

```javascript
// background.js
let unreadCount = 0;

async function updateBadge() {
  if (unreadCount === 0) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  const text = unreadCount > 99 ? '99+' : String(unreadCount);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: unreadCount > 10 ? '#F44336' : '#FF9800'
  });
}

// Listen for new items from your API or content scripts
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NEW_ITEM') {
    unreadCount++;
    updateBadge();
  } else if (message.type === 'ITEMS_READ') {
    unreadCount = Math.max(0, unreadCount - message.count);
    updateBadge();
  }
});
```

A status indicator pattern for showing extension state:

```javascript
async function setExtensionStatus(status) {
  const config = {
    active: { text: 'ON', color: '#4CAF50' },
    paused: { text: '||', color: '#FF9800' },
    error: { text: '!', color: '#F44336' },
    off: { text: '', color: '#9E9E9E' }
  };

  const { text, color } = config[status] || config.off;
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
}
```

---

## Icon Management {#icon-management}

You can change the toolbar icon dynamically to reflect different states or contexts.

### Setting Icons from Files

```javascript
await chrome.action.setIcon({
  path: {
    16: 'icons/active-16.png',
    32: 'icons/active-32.png',
    48: 'icons/active-48.png'
  }
});

// Tab-specific icon
await chrome.action.setIcon({
  tabId: tabId,
  path: { 16: 'icons/special-16.png', 32: 'icons/special-32.png' }
});
```

### Generating Icons with Canvas

For truly dynamic icons, use the `OffscreenCanvas` API in your service worker or an offscreen document:

```javascript
async function setDynamicIcon(letter, bgColor) {
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext('2d');

  // Draw background circle
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.arc(16, 16, 15, 0, Math.PI * 2);
  ctx.fill();

  // Draw letter
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 16, 17);

  const imageData = ctx.getImageData(0, 0, 32, 32);
  await chrome.action.setIcon({ imageData: { 32: imageData } });
}

// Usage
await setDynamicIcon('A', '#4285F4');
```

---

## Click Handling with onClicked {#click-handling}

When no popup is set, clicking the toolbar icon fires the `chrome.action.onClicked` event. This is useful for extensions that perform a single action or toggle a feature.

### Basic Click Handler

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  // tab contains information about the active tab
  console.log('Clicked on tab:', tab.id, tab.url);

  // Inject a content script on click
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content-scripts/toggle-feature.js']
  });
});
```

### Toggle Pattern

A common pattern is using the icon click to toggle a feature on or off:

```javascript
// background.js
const enabledTabs = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  const isEnabled = enabledTabs.has(tab.id);

  if (isEnabled) {
    enabledTabs.delete(tab.id);
    await chrome.action.setIcon({
      tabId: tab.id,
      path: { 16: 'icons/off-16.png', 32: 'icons/off-32.png' }
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: 'Click to enable'
    });

    // Remove injected CSS
    await chrome.scripting.removeCSS({
      target: { tabId: tab.id },
      files: ['styles/feature.css']
    });
  } else {
    enabledTabs.add(tab.id);
    await chrome.action.setIcon({
      tabId: tab.id,
      path: { 16: 'icons/on-16.png', 32: 'icons/on-32.png' }
    });
    await chrome.action.setBadgeText({ tabId: tab.id, text: 'ON' });
    await chrome.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: '#4CAF50'
    });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: 'Click to disable'
    });

    // Inject feature CSS
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['styles/feature.css']
    });
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  enabledTabs.delete(tabId);
});
```

---

## Title (Tooltip) Management {#title-management}

The title is the tooltip text shown when the user hovers over your toolbar icon.

```javascript
// Set global title
await chrome.action.setTitle({ title: 'My Extension — Active' });

// Tab-specific title
await chrome.action.setTitle({
  tabId: tabId,
  title: 'Found 5 issues on this page'
});

// Reset to manifest default
await chrome.action.setTitle({ title: '' });

// Read current title
const title = await chrome.action.getTitle({ tabId: tabId });
```

Dynamic titles are excellent for providing context-specific information without requiring the user to open the popup.

---

## Enabling and Disabling the Action {#enable-disable}

You can disable the toolbar icon for specific tabs or globally. A disabled icon appears grayed out and does not respond to clicks.

```javascript
// Disable for a specific tab
await chrome.action.disable(tabId);

// Re-enable
await chrome.action.enable(tabId);

// Check if enabled
const isEnabled = await chrome.action.isEnabled({ tabId });
```

### Declarative Enabling with Conditions

For more efficient enable/disable logic, use `chrome.declarativeContent` in combination with the Action API:

```json
{
  "permissions": ["declarativeContent"],
  "action": {}
}
```

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  // Disable the action by default
  chrome.action.disable();

  // Enable it only on matching pages
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: 'github.com' }
          }),
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: 'gitlab.com' }
          })
        ],
        actions: [
          new chrome.declarativeContent.ShowAction()
        ]
      }
    ]);
  });
});
```

This pattern is the MV3 equivalent of MV2's `chrome.pageAction`, where the icon is only active on relevant pages.

---

## Migration from browserAction and pageAction {#migration}

In Manifest V2, there were two separate APIs:
- `chrome.browserAction` — always visible in the toolbar
- `chrome.pageAction` — visible only on certain pages

Manifest V3 merges both into `chrome.action`. Here is how to migrate:

### Manifest Changes

```json
// MV2
{
  "manifest_version": 2,
  "browser_action": {
    "default_icon": "icon.png",
    "default_popup": "popup.html",
    "default_title": "My Extension"
  }
}

// MV3
{
  "manifest_version": 3,
  "action": {
    "default_icon": "icon.png",
    "default_popup": "popup.html",
    "default_title": "My Extension"
  }
}
```

### Code Changes

| MV2 | MV3 |
|-----|-----|
| `chrome.browserAction.onClicked` | `chrome.action.onClicked` |
| `chrome.browserAction.setBadgeText()` | `chrome.action.setBadgeText()` |
| `chrome.browserAction.setIcon()` | `chrome.action.setIcon()` |
| `chrome.pageAction.show(tabId)` | `chrome.action.enable(tabId)` |
| `chrome.pageAction.hide(tabId)` | `chrome.action.disable(tabId)` |

All methods now return Promises, so you can replace callbacks with `async`/`await`:

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' }, () => {
  console.log('Badge set');
});

// MV3
await chrome.action.setBadgeText({ text: '5' });
console.log('Badge set');
```

---

## Tab-Specific vs Global State {#tab-vs-global}

Every Action API setter method accepts an optional `tabId` parameter. Understanding the difference between global and tab-specific state is important:

- **Global state** (no `tabId`): Applies to all tabs. This is the default.
- **Tab-specific state** (`tabId` provided): Overrides the global state for that specific tab.

When a tab-specific value is cleared (e.g., by setting badge text to `''` for a tab), the tab reverts to the global state for that property.

```javascript
// Global badge
await chrome.action.setBadgeText({ text: 'ALL' });

// Override for a specific tab
await chrome.action.setBadgeText({ tabId: 123, text: '7' });

// Tab 123 shows '7', all other tabs show 'ALL'

// Clear tab-specific override
await chrome.action.setBadgeText({ tabId: 123, text: '' });
// Now tab 123 also shows 'ALL'
```

---

## Keyboard Shortcuts and the Action {#keyboard-shortcuts}

You can bind keyboard shortcuts to your extension's action using the `commands` manifest key. When a shortcut is configured with `"_execute_action"`, it triggers the same behavior as clicking the toolbar icon.

### Configuring Shortcuts

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Activate the extension"
    },
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+U",
        "mac": "Command+Shift+U"
      },
      "description": "Toggle the main feature on or off"
    }
  }
}
```

The `_execute_action` command is special — it opens the popup if one is set, or fires the `onClicked` event if no popup is configured. Custom commands (like `toggle-feature`) fire the `chrome.commands.onCommand` event instead.

### Handling Custom Commands Alongside Actions

```javascript
// background.js
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-feature') {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (tab) {
      await toggleFeatureForTab(tab.id);
    }
  }
});

// The _execute_action command is handled by onClicked (if no popup)
chrome.action.onClicked.addListener(async (tab) => {
  await toggleFeatureForTab(tab.id);
});
```

Users can customize keyboard shortcuts at `chrome://extensions/shortcuts`. Always choose suggested keys that do not conflict with common browser or operating system shortcuts. Consider platform differences — for example, `Ctrl` on Windows and Linux maps to `Command` on macOS for most user expectations.

### Indicating Shortcut Availability

You can display the configured shortcut in your popup or tooltip to help users discover it:

```javascript
async function getActionShortcut() {
  const commands = await chrome.commands.getAll();
  const actionCommand = commands.find(c => c.name === '_execute_action');
  return actionCommand?.shortcut || 'Not set';
}

// Display in popup
const shortcut = await getActionShortcut();
document.getElementById('shortcutHint').textContent =
  `Tip: Press ${shortcut} to open this popup quickly.`;
```

---

## Popup Sizing and Layout Considerations {#popup-sizing}

The popup window has specific constraints that affect your UI design:

- **Maximum size**: 800 pixels wide by 600 pixels tall
- **Minimum size**: 25 pixels wide by 25 pixels tall
- **Sizing**: Chrome auto-sizes the popup to fit its content, up to the maximum
- **No resize handle**: Users cannot manually resize the popup

To control the popup size, set dimensions on the `body` or a root container element in your CSS:

```css
/* popup.css */
body {
  width: 350px;
  min-height: 400px;
  max-height: 580px;
  overflow-y: auto;
  margin: 0;
  padding: 16px;
  font-family: system-ui, -apple-system, sans-serif;
}
```

If your popup content is dynamic and may vary in height, use `min-height` to prevent the popup from collapsing to a tiny size when loading, and set `overflow-y: auto` to handle content that exceeds the viewport.

Consider that the popup is destroyed every time it closes and recreated when it opens. This means any JavaScript state, scroll position, or form input is lost. Use `chrome.storage.session` to persist transient UI state if needed, or send the state to your service worker before the popup closes:

```javascript
// popup.js — save state before closing
window.addEventListener('beforeunload', () => {
  const formState = {
    searchQuery: document.getElementById('search').value,
    selectedTab: document.querySelector('.tab.active')?.dataset.tab
  };
  // Use synchronous storage or sendMessage (best effort)
  chrome.storage.session.set({ popupState: formState });
});

// Restore state on open
document.addEventListener('DOMContentLoaded', async () => {
  const { popupState } = await chrome.storage.session.get('popupState');
  if (popupState) {
    document.getElementById('search').value = popupState.searchQuery || '';
    if (popupState.selectedTab) {
      switchToTab(popupState.selectedTab);
    }
  }
});
```

---

## Best Practices {#best-practices}

1. **Keep popups lightweight.** The popup window has limited space (max 800x600 pixels). Keep your UI focused and responsive. Load data asynchronously to avoid blank screens.

2. **Use badges sparingly.** Badges are attention-grabbing. Only show them when there is genuinely new information the user needs to see. Clear the badge after the user has acknowledged it.

3. **Provide meaningful tooltips.** Use `setTitle()` to give users context about what clicking the icon will do, especially if your extension changes behavior based on the page.

4. **Handle the popup lifecycle.** The popup is destroyed every time it closes. Do not store state in popup variables — use the [Chrome Storage API](/2025/01/24/chrome-storage-api-patterns/) or send data to the service worker via [Runtime messaging](/2025/01/24/chrome-runtime-api-messaging/).

5. **Design icons for both light and dark themes.** Chrome's toolbar can have a light or dark background. Use icons with good contrast on both, or provide multiple icon sets and detect the theme.

6. **Batch your action updates.** If you need to update the icon, badge, and title at the same time, fire all the calls in parallel rather than awaiting them sequentially:

```javascript
await Promise.all([
  chrome.action.setIcon({ tabId, path: newIcon }),
  chrome.action.setBadgeText({ tabId, text: '5' }),
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#F44336' }),
  chrome.action.setTitle({ tabId, title: 'Found 5 issues' })
]);
```

---

## Related Resources {#related}

- [Chrome Scripting API Complete Reference](/2025/01/24/chrome-scripting-api-complete-reference/) — Inject scripts when the user clicks your action
- [Chrome Runtime API: Messaging and Lifecycle](/2025/01/24/chrome-runtime-api-messaging/) — Communicate between popup and service worker
- [Chrome Storage API Patterns](/2025/01/24/chrome-storage-api-patterns/) — Persist popup state across open/close cycles
- [Chrome Identity API: OAuth2 and Token Management](/2025/01/24/chrome-identity-api-oauth/) — Add authentication flows triggered from your popup

---

## Summary {#summary}

The `chrome.action` API is the front door of your Chrome extension. It controls the toolbar icon that users see and interact with every day. By mastering popups, badges, dynamic icons, click handlers, and the enable/disable pattern, you can build extensions that feel polished and professional.

Key takeaways:

1. Use popups for UI-rich interactions, `onClicked` for single-action extensions.
2. Badges are your best tool for at-a-glance status updates — keep them short and meaningful.
3. Tab-specific state overrides global state, giving you fine-grained control per page.
4. The migration from `browserAction`/`pageAction` to `action` is straightforward — the API surface is nearly identical.
5. Always design with both the popup lifecycle and toolbar theme variations in mind.

With these tools and patterns, your extension will make a strong first impression and provide a smooth, intuitive user experience.
