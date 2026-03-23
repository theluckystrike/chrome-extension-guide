---
layout: default
title: "Working with the Chrome Tabs API. Developer Guide"
description: "Learn how to query, create, update, and manipulate browser tabs using the Chrome Tabs API. Covers tab events, groups, pinning, capture, and script injection."
canonical_url: "https://bestchromeextensions.com/tutorials/tabs-api-guide/"
---
Working with the Chrome Tabs API

Overview {#overview}

The Chrome Tabs API (`chrome.tabs`) is one of the most frequently used APIs in browser extensions. It allows you to query browser tabs, create new tabs, update existing ones, and listen for tab lifecycle events. Whether you're building a tab manager, a productivity tool, or an extension that needs to coordinate across pages, the Tabs API provides the foundation.

This guide covers the core operations: querying tabs, creating and managing tabs, working with tab events, tab groups, pinning and moving tabs, capturing visible tab content, injecting scripts, and communication patterns between extension components and tabs.

Prerequisites {#prerequisites}

Before working with the Tabs API, ensure you've declared the appropriate permissions in your `manifest.json`:

```json
{
  "permissions": ["tabs"]
}
```

For more advanced operations like capturing tab content or accessing tab groups, you may need additional permissions:

```json
{
  "permissions": ["tabs", "tabGroups", "tabCapture"]
}
```

Querying Tabs {#querying-tabs}

The `chrome.tabs.query()` method is your primary tool for finding tabs. It accepts a query object and returns a promise that resolves to an array of matching `Tab` objects.

Basic Queries {#basic-queries}

```ts
// Get all tabs in the current window
const tabs = await chrome.tabs.query({ currentWindow: true });

// Get all tabs across all windows
const allTabs = await chrome.tabs.query({});

// Get the active tab in the current window
const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
console.log(activeTab.url, activeTab.title);
```

Querying by State {#querying-by-state}

```ts
// Get all pinned tabs
const pinnedTabs = await chrome.tabs.query({ pinned: true });

// Get all audible tabs
const audibleTabs = await chrome.tabs.query({ audible: true });

// Get all tabs that are loading
const loadingTabs = await chrome.tabs.query({ status: "loading" });

// Get all tabs in a specific window by ID
const windowTabs = await chrome.tabs.query({ windowId: 12345 });
```

Querying by URL Pattern {#querying-by-url-pattern}

```ts
// Get all tabs matching a URL pattern
const developerTabs = await chrome.tabs.query({
  url: "*://developer.chrome.com/*"
});

// Get tabs with URLs in a list of patterns
const docsTabs = await chrome.tabs.query({
  url: ["*://*.google.com/*", "*://*.github.com/*"]
});

// Get tabs with http(s) URLs only (excluding chrome:// URLs)
const webTabs = await chrome.tabs.query({
  url: "http://*/*"
});
```

Understanding the Tab Object {#understanding-the-tab-object}

The `Tab` object contains numerous properties:

```ts
interface Tab {
  id: number;              // Unique tab ID
  index: number;           // Position in tab strip (0-based)
  windowId: number;        // Parent window ID
  openerTabId?: number;    // Tab that opened this tab
  title?: string;         // Page title
  url?: string;           // Page URL
  favIconUrl?: string;   // Favicon URL
  status: string;        // "loading" or "complete"
  pinned: boolean;        // Whether tab is pinned
  audible: boolean;      // Whether tab is producing sound
  mutedInfo: MutedInfo;  // Muted state and reason
  isInWindow: boolean;   // Whether tab is in a window
  groupId: number;       // ID of tab's group (-1 if none)
  visible: boolean;      // Whether tab is visible
  // ... and more
}
```

Creating Tabs {#creating-tabs}

Use `chrome.tabs.create()` to open new tabs:

Basic Tab Creation {#basic-tab-creation}

```ts
// Open a URL in a new tab
const newTab = await chrome.tabs.create({
  url: "https://developer.chrome.com"
});

// Open a URL in a new tab in a specific window
const newTabInWindow = await chrome.tabs.create({
  url: "https://example.com",
  windowId: 12345
});
```

Advanced Tab Creation {#advanced-tab-creation}

```ts
// Open a URL in a new tab at a specific position
const tabAtIndex = await chrome.tabs.create({
  url: "https://example.com",
  index: 0  // First position
});

// Open a URL in a new tab that is pinned
const pinnedTab = await chrome.tabs.create({
  url: "https://example.com",
  pinned: true
});

// Open a URL in a new tab that's active (focused)
const activeTab = await chrome.tabs.create({
  url: "https://example.com",
  active: true
});

// Open a new tab as an opener (useful for extensions that create helper tabs)
const openerTab = await chrome.tabs.create({
  url: "https://example.com",
  openerTabId: 12345  // This tab opened by tab 12345
});

// Open a blank tab
const blankTab = await chrome.tabs.create({});
```

Opening Special URLs {#opening-special-urls}

```ts
// Open new tab page
await chrome.tabs.create({ url: "chrome://newtab" });

// Open extensions page
await chrome.tabs.create({ url: "chrome://extensions" });

// Open downloads page
await chrome.tabs.create({ url: "chrome://downloads" });
```

Updating Tabs {#updating-tabs}

Use `chrome.tabs.update()` to modify existing tabs:

Basic Updates {#basic-updates}

```ts
// Navigate a tab to a new URL
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
await chrome.tabs.update(tab.id!, { url: "https://example.com" });

// Reload a tab
await chrome.tabs.reload(tab.id!);

// Go back in history
await chrome.tabs.goBack(tab.id!);

// Go forward in history
await chrome.tabs.goForward(tab.id!);
```

Updating Tab Properties {#updating-tab-properties}

```ts
// Pin or unpin a tab
await chrome.tabs.update(tab.id!, { pinned: true });
await chrome.tabs.update(tab.id!, { pinned: false });

// Mute or unmute a tab
await chrome.tabs.update(tab.id!, { muted: true });
await chrome.tabs.update(tab.id!, { muted: false });

// Set the tab's title (note: this only affects the extension's view)
await chrome.tabs.update(tab.id!, { title: "My Custom Title" });
```

Removing Tabs {#removing-tabs}

Use `chrome.tabs.remove()` to close tabs:

```ts
// Close a specific tab
await chrome.tabs.remove(12345);

// Close multiple tabs
await chrome.tabs.remove([12345, 12346, 12347]);

// Close the active tab in current window
const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (activeTab.id) {
  await chrome.tabs.remove(activeTab.id);
}

// Close all tabs in a window except one
const [keepTab] = await chrome.tabs.query({ active: true, currentWindow: true });
const allTabs = await chrome.tabs.query({ currentWindow: true });
const tabsToClose = allTabs.filter(t => t.id !== keepTab.id).map(t => t.id!);
await chrome.tabs.remove(tabsToClose);
```

Tab Events {#tab-events}

The Tabs API provides events for monitoring tab lifecycle changes:

onCreated {#oncreated}

Fired when a new tab is created:

```ts
chrome.tabs.onCreated.addListener((tab) => {
  console.log(`Tab created: ${tab.id} - ${tab.title}`);
  
  // You can identify the opener
  if (tab.openerTabId) {
    console.log(`This tab was opened by tab: ${tab.openerTabId}`);
  }
});
```

onUpdated {#onupdated}

Fired when a tab is updated (URL changes, loading completes, etc.):

```ts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(`Tab ${tabId} updated:`);
  
  // changeInfo contains what changed
  if (changeInfo.status) {
    console.log(`  Status: ${changeInfo.status}`);
  }
  if (changeInfo.url) {
    console.log(`  URL: ${changeInfo.url}`);
  }
  if (changeInfo.title) {
    console.log(`  Title: ${changeInfo.title}`);
  }
  if (changeInfo.favIconUrl) {
    console.log(`  Favicon: ${changeInfo.favIconUrl}`);
  }
});

// Filter to only fire for specific conditions (more efficient)
chrome.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url?.includes("example.com")) {
      console.log(`Example.com page loaded in tab ${tabId}`);
    }
  },
  { urls: ["*://example.com/*"] }
);
```

onRemoved {#onremoved}

Fired when a tab is closed:

```ts
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log(`Tab ${tabId} closed`);
  console.log(`Was in window: ${removeInfo.windowId}`);
  console.log(`Is window closing: ${removeInfo.isWindowClosing}`);
});
```

onActivated {#onactivated}

Fired when the active tab in a window changes:

```ts
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(`Tab ${activeInfo.tabId} is now active in window ${activeInfo.windowId}`);
  
  // Get the newly active tab
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    console.log(`Active tab URL: ${tab.url}`);
  });
});
```

Other Useful Events {#other-useful-events}

```ts
// Fired when a tab moves to a different position in its window
chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  console.log(`Tab ${tabId} moved from index ${moveInfo.fromIndex} to ${moveInfo.toIndex}`);
});

// Fired when a tab is attached to a window
chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  console.log(`Tab ${tabId} attached to window ${attachInfo.windowId} at index ${attachInfo.newPosition}`);
});

// Fired when a tab is detached from a window
chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  console.log(`Tab ${tabId} detached from window ${detachInfo.windowId}`);
});

// Fired when a tab's zoom changes
chrome.tabs.onZoomChange.addListener((zoomChangeInfo) => {
  console.log(`Tab ${zoomChangeInfo.tabId} zoom changed from ${zoomChangeInfo.oldZoomFactor} to ${zoomChangeInfo.newZoomFactor}`);
});
```

Tab Groups {#tab-groups}

Chrome's tab groups feature allows you to organize related tabs. The `chrome.tabGroups` API (available in Chrome 88+) provides group management:

Creating Tab Groups {#creating-tab-groups}

```ts
// Create a new tab group
const group = await chrome.tabs.group({ tabIds: [12345, 12346] });
console.log(`Created group: ${group}`);

// Set the group's title and color
await chrome.tabGroups.update(group, {
  title: "Research",
  color: "blue"
});
```

Managing Tab Groups {#managing-tab-groups}

```ts
// Get all tab groups in a window
const groups = await chrome.tabGroups.query({ windowId: 12345 });
console.log(`Found ${groups.length} groups`);

// Move a tab to an existing group
await chrome.tabs.group({ groupId: groupId, tabIds: [12347] });

// Ungroup a tab (remove from group)
await chrome.tabs.ungroup([12347]);

// Update group properties
await chrome.tabGroups.update(group, {
  title: "Updated Title",
  color: "red",
  collapsed: true  // Collapse the group in the tab strip
});

// Delete a group (tabs remain, just ungrouped)
await chrome.tabGroups.remove(group);
```

Querying Tab Groups {#querying-tab-groups}

```ts
// Find all groups
const allGroups = await chrome.tabGroups.query({});

// Find groups in current window
const currentWindowGroups = await chrome.tabGroups.query({
  windowId: await chrome.windows.getCurrent().then(w => w.id!)
});

// Get a specific group
const specificGroup = await chrome.tabGroups.get(12345);
```

Moving and Pinning Tabs {#moving-and-pinning-tabs}

Moving Tabs {#moving-tabs}

```ts
// Move a tab to a specific position
await chrome.tabs.move(12345, { index: 0 });  // Move to first position

// Move a tab to a specific position in another window
await chrome.tabs.move(12345, { 
  windowId: 67890,
  index: 0 
});

// Move multiple tabs
await chrome.tabs.move([12345, 12346, 12347], { index: 0 });
```

Pinning Tabs {#pinning-tabs}

Pinned tabs stay at the left edge of the tab strip and show only the favicon:

```ts
// Pin a tab
await chrome.tabs.update(12345, { pinned: true });

// Unpin a tab
await chrome.tabs.update(12345, { pinned: false });

// Find all pinned tabs
const pinnedTabs = await chrome.tabs.query({ pinned: true });

// Move all pinned tabs to the beginning (they're auto-sorted by pin status)
const pinned = await chrome.tabs.query({ pinned: true });
for (const tab of pinned) {
  await chrome.tabs.move(tab.id!, { index: 0 });
}
```

Reorder Tabs by Domain {#example-reorder-tabs-by-domain}

```ts
async function groupTabsByDomain() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Group tabs by domain
  const byDomain = new Map<string, number[]>();
  for (const tab of tabs) {
    if (!tab.url || !tab.url.startsWith("http")) continue;
    
    const hostname = new URL(tab.url).hostname;
    const domain = hostname.replace(/^www\./, "");
    
    if (!byDomain.has(domain)) {
      byDomain.set(domain, []);
    }
    byDomain.get(domain)!.push(tab.id!);
  }
  
  // Move tabs to group them
  let index = 0;
  for (const [domain, tabIds] of byDomain) {
    for (const tabId of tabIds) {
      await chrome.tabs.move(tabId, { index: index++ });
    }
  }
}
```

Capturing Visible Tab {#capturing-visible-tab}

The `chrome.tabs.captureVisibleTab()` method captures the visible area of a tab as a data URL:

Basic Capture {#basic-capture}

```ts
// Capture the visible tab in the current window
const dataUrl = await chrome.tabs.captureVisibleTab();

// Capture with specific format
const pngDataUrl = await chrome.tabs.captureVisibleTab(undefined, {
  format: "png"
});

const jpegDataUrl = await chrome.tabs.captureVisibleTab(undefined, {
  format: "jpeg",
  quality: 80
});
```

Capture Options {#capture-options}

```ts
// Get available capture formats
await chrome.tabs.captureVisibleTab(undefined, {
  format: "jpeg",
  quality: 90  // For JPEG: 0-100, higher = better quality
});

// Capture at specific resolution (useful for thumbnails)
const thumbnail = await chrome.tabs.captureVisibleTab(undefined, {
  format: "png"
});
```

Practical Example: Save Screenshot {#practical-example-save-screenshot}

```ts
async function saveTabScreenshot(tabId: number): Promise<string> {
  const dataUrl = await chrome.tabs.captureVisibleTab(tabId, {
    format: "png"
  });
  
  // Convert data URL to blob and download
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `screenshot-${Date.now()}.png`;
  a.click();
  
  URL.revokeObjectURL(url);
  return dataUrl;
}
```

Capturing requires the `tabCapture` permission and only works for tabs with http(s) URLs.

Injecting Scripts into Tabs {#injecting-scripts-into-tabs}

There are two ways to inject scripts: using the Tabs API directly or the Scripting API:

Using chrome.tabs.executeScript (Legacy) {#using-chrome-tabs-executescript}

```ts
// Inject a script into the active tab
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

// Inject JavaScript
await chrome.tabs.executeScript(tab.id!, {
  code: `console.log("Injected!"); document.body.style.backgroundColor = "red";`
});

// Inject a file
await chrome.tabs.executeScript(tab.id!, {
  file: "content-scripts/injected.js"
});

// Inject CSS
await chrome.tabs.insertCSS(tab.id!, {
  code: `.my-class { color: red; }`
});

await chrome.tabs.insertCSS(tab.id!, {
  file: "content-scripts/styles.css"
});
```

Using chrome.scripting (Recommended) {#using-chrome-scripting-recommended}

The Scripting API (available in Manifest V3) is the recommended approach:

```ts
// First, add "scripting" to your permissions
// In manifest.json: "permissions": ["scripting"]

import { chrome } from "@anthropic-ai/cliqz-chrome-utils";

// Inject JavaScript
await chrome.scripting.executeScript({
  target: { tabId: 12345 },
  func: () => {
    console.log("Script executed!");
    return document.title;
  }
});

// Inject a script file
await chrome.scripting.executeScript({
  target: { tabId: 12345 },
  files: ["content-scripts/main.js"]
});

// Inject CSS
await chrome.scripting.insertCSS({
  target: { tabId: 12345 },
  css: ".my-class { color: red; }"
});

await chrome.scripting.insertCSS({
  target: { tabId: 12345 },
  files: ["content-scripts/styles.css"]
});
```

Injecting into Multiple Tabs {#injecting-into-multiple-tabs}

```ts
// Inject the same script into multiple tabs
const tabs = await chrome.tabs.query({ url: "*://example.com/*" });
const tabIds = tabs.map(t => t.id!);

await chrome.scripting.executeScript({
  target: { tabIds },
  func: () => {
    console.log("Running on", window.location.href);
  }
});
```

Injecting with World Context {#injecting-with-world-context}

In Manifest V3, you can inject scripts into the "MAIN" world (same as page) or "ISOLATED" world:

```ts
// Inject into the MAIN world (shares context with page)
await chrome.scripting.executeScript({
  target: { tabId: 12345 },
  world: "MAIN",
  func: () => {
    // Can access page variables
    const pageData = (window as any).pageData;
    return pageData;
  }
});

// Default is "ISOLATED" world (like traditional content scripts)
```

Tab Communication Patterns {#tab-communication-patterns}

From Extension to Tab {#from-extension-to-tab}

```ts
// Send a message from background/popup to a content script
async function sendMessageToTab(tabId: number, message: object) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}

// In the content script, listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_STATE") {
    // Handle the message
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
});
```

From Tab to Extension {#from-tab-to-extension}

```ts
// In the content script, send messages to the extension
function notifyExtension() {
  chrome.runtime.sendMessage({
    type: "TAB_ACTION",
    data: { url: window.location.href }
  }, (response) => {
    console.log("Extension responded:", response);
  });
}
```

Tab-to-Tab Communication {#tab-to-tab-communication}

```ts
// First tab sends to background, which forwards to second tab
// In background script:
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TO_TAB" && message.targetTabId) {
    chrome.tabs.sendMessage(message.targetTabId, message.payload, sendResponse);
    return true; // Keep channel open for async response
  }
});

// First tab:
chrome.runtime.sendMessage({
  type: "TO_TAB",
  targetTabId: 12345,
  payload: { action: "doSomething" }
});
```

Long-Lived Connections {#long-lived-connections}

For ongoing communication, use ports:

```ts
// In background script - create a port to a specific tab
const port = chrome.tabs.connect(12345, { name: "my-extension" });

port.postMessage({ action: "initialize" });

port.onMessage.addListener((message) => {
  console.log("Received from tab:", message);
});

port.onDisconnect.addListener(() => {
  console.log("Port disconnected");
});

// In content script - listen for connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "my-extension") {
    port.onMessage.addListener((message) => {
      // Handle message
      port.postMessage({ status: "ready" });
    });
  }
});
```

Real-World Example: Popup to Content Script {#real-world-example-popup-to-content-script}

```ts
// popup.ts - Get current tab and send message
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (tab.id) {
  const response = await chrome.tabs.sendMessage(tab.id, {
    action: "getPageData"
  });
  console.log("Page data:", response);
}

// content-script.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getPageData") {
    sendResponse({
      title: document.title,
      url: window.location.href,
      links: Array.from(document.querySelectorAll("a")).map(a => a.href)
    });
  }
  return true;
});
```

Best Practices {#best-practices}

1. Use Filtered Listeners {#use-filtered-listeners}

```ts
//  Bad: Fires for every tab change
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Check condition manually
});

//  Good: Filter at registration level
chrome.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => {
    console.log("Specific URL changed");
  },
  { urls: ["*://example.com/*"] }
);
```

2. Handle Missing Tab IDs {#handle-missing-tab-ids}

```ts
//  Bad: May crash if tab doesn't exist
await chrome.tabs.update(someId, { url: "https://example.com" });

//  Good: Use try-catch or check existence
try {
  await chrome.tabs.update(someId, { url: "https://example.com" });
} catch (e) {
  // Tab may have been closed
}

// Or check first
const tabs = await chrome.tabs.query({ id: someId });
if (tabs.length > 0) {
  await chrome.tabs.update(someId, { url: "https://example.com" });
}
```

3. Be Mindful of Permissions {#be-mindful-of-permissions}

```ts
//  Bad: Request all URLs unnecessarily
"permissions": ["tabs", "<all_urls>"]

//  Good: Use host permissions or activeTab
"permissions": ["activeTab"],
"host_permissions": ["*://*.example.com/*"]
```

4. Clean Up Event Listeners {#clean-up-event-listeners}

```ts
// In service workers, listeners are persistent but you should still manage state
let isListening = false;

function startListening() {
  if (isListening) return;
  
  chrome.tabs.onUpdated.addListener(handleTabUpdate);
  isListening = true;
}

function stopListening() {
  chrome.tabs.onUpdated.removeListener(handleTabUpdate);
  isListening = false;
}
```

5. Use Async/Await Consistently {#use-async-await-consistently}

```ts
//  Bad: Mixing callbacks and promises
chrome.tabs.query({}, (tabs) => {
  chrome.tabs.create({ url: "https://example.com" }, () => {});
});

//  Good: Consistent async/await
const tabs = await chrome.tabs.query({});
await chrome.tabs.create({ url: "https://example.com" });
```

API Reference Summary {#api-reference-summary}

| Method | Description |
|--------|-------------|
| `chrome.tabs.query(queryInfo)` | Query tabs matching criteria |
| `chrome.tabs.create(createProperties)` | Create a new tab |
| `chrome.tabs.update(tabId, updateProperties)` | Update tab properties |
| `chrome.tabs.remove(tabId)` | Close a tab |
| `chrome.tabs.move(tabId, moveProperties)` | Move a tab |
| `chrome.tabs.reload(tabId)` | Reload a tab |
| `chrome.tabs.captureVisibleTab(windowId, options)` | Capture tab as image |
| `chrome.tabs.executeScript(tabId, injection)` | Inject script (legacy) |
| `chrome.tabs.sendMessage(tabId, message)` | Send message to content script |

| Event | Description |
|-------|-------------|
| `chrome.tabs.onCreated` | New tab created |
| `chrome.tabs.onUpdated` | Tab updated |
| `chrome.tabs.onRemoved` | Tab closed |
| `chrome.tabs.onActivated` | Active tab changed |
| `chrome.tabs.onMoved` | Tab moved |
| `chrome.tabs.onZoomChange` | Tab zoom changed |

Related Articles {#related-articles}

- [Tabs API detailed look](tabs-api-deep detailed look.md). Comprehensive reference for all Tabs API methods and properties
- [Tab Management Guide](tab-management.md). Best practices for building tab management extensions
- [Content Scripts Guide](content-scripts-guide.md). Learn how content scripts work with the tabs API

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
