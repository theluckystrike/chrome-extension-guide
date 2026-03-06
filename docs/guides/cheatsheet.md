# Chrome Extension Development Cheatsheet

A quick-reference cheatsheet covering the most common patterns, APIs, and snippets for Chrome extension development with Manifest V3.

---

## Minimal Manifest V3 Template

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "A brief description of your extension.",
  "permissions": ["storage"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon-48.png"
  },
  "icons": {
    "16": "icon-16.png",
    "48": "icon-48.png",
    "128": "icon-128.png"
  }
}
```

---

## Service Worker Quick Patterns

### Lifecycle Events

```typescript
// Install: runs once when extension is first installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ firstRun: true });
  }
  if (details.reason === "update") {
    console.log("Updated from", details.previousVersion);
  }
});

// Startup: runs each time the browser launches
chrome.runtime.onStartup.addListener(() => {
  console.log("Browser started");
});
```

### Alarms (Persistent Scheduling)

```typescript
// Create a repeating alarm
chrome.alarms.create("sync-data", { periodInMinutes: 15 });

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sync-data") {
    syncData();
  }
});

// One-shot alarm (delay only)
chrome.alarms.create("reminder", { delayInMinutes: 5 });
```

### Service Worker Keep-Alive Trick

```typescript
// Use a long-lived port to keep the SW alive (use sparingly)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "keepalive") {
    port.onDisconnect.addListener(() => {
      // Reconnect logic in content script
    });
  }
});
```

---

## Content Script Injection Patterns

### Static (manifest.json)

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle",
    "all_frames": false
  }
]
```

### Programmatic Injection

```typescript
// Inject into the active tab
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ["injected.js"],
});

// Inject a function directly
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (greeting) => document.title = greeting,
  args: ["Hello!"],
});

// Inject CSS
chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: "body { border: 2px solid red; }",
});
```

---

## Storage Quick Patterns

```typescript
// Local storage (per-device, ~10 MB limit)
await chrome.storage.local.set({ key: "value", count: 42 });
const { key } = await chrome.storage.local.get("key");
await chrome.storage.local.remove("key");
await chrome.storage.local.clear();

// Sync storage (synced across devices, ~100 KB total)
await chrome.storage.sync.set({ prefs: { theme: "dark" } });
const { prefs } = await chrome.storage.sync.get("prefs");

// Session storage (in-memory, cleared on restart, ~10 MB)
await chrome.storage.session.set({ token: "abc123" });
const { token } = await chrome.storage.session.get("token");

// Watch for changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.count) {
    console.log("count:", changes.count.oldValue, "->", changes.count.newValue);
  }
});
```

---

## Message Passing Patterns

### One-Time Messages

```typescript
// From content script to background
const response = await chrome.runtime.sendMessage({ type: "FETCH_DATA", url });

// From background to a specific tab
const response = await chrome.tabs.sendMessage(tabId, { type: "HIGHLIGHT" });

// Listener (background or content script)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_DATA") {
    fetch(message.url)
      .then((r) => r.json())
      .then(sendResponse);
    return true; // Keep channel open for async sendResponse
  }
});
```

### Long-Lived Connections (Ports)

```typescript
// Content script: open a port
const port = chrome.runtime.connect({ name: "stream" });
port.postMessage({ subscribe: "updates" });
port.onMessage.addListener((msg) => console.log(msg));

// Background: accept the port
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "stream") {
    port.onMessage.addListener((msg) => {
      port.postMessage({ data: "here you go" });
    });
  }
});
```

---

## Permission Declaration Patterns

```json
// Required permissions (granted at install)
"permissions": ["storage", "alarms", "tabs", "activeTab", "scripting"]

// Optional permissions (requested at runtime)
"optional_permissions": ["bookmarks", "history", "downloads"]

// Host permissions (MV3 separates these)
"host_permissions": ["https://*.example.com/*", "https://api.myservice.com/*"]

// Optional host permissions
"optional_host_permissions": ["https://*/*", "http://*/*"]
```

### Requesting Optional Permissions at Runtime

```typescript
const granted = await chrome.permissions.request({
  permissions: ["bookmarks"],
  origins: ["https://extra-site.com/*"],
});
if (granted) {
  // Permission was granted
}
```

---

## Common chrome.* API One-Liners

```typescript
// Get the current active tab
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

// Open a new tab
await chrome.tabs.create({ url: "https://example.com" });

// Get extension URL for a bundled resource
const url = chrome.runtime.getURL("assets/logo.png");

// Set the badge
await chrome.action.setBadgeText({ text: "5" });
await chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });

// Copy to clipboard (content script)
await navigator.clipboard.writeText("copied!");

// Create a context menu item
chrome.contextMenus.create({
  id: "lookup",
  title: "Look up '%s'",
  contexts: ["selection"],
});

// Create a notification
chrome.notifications.create("my-notif", {
  type: "basic",
  iconUrl: "icon-128.png",
  title: "Heads up",
  message: "Something happened.",
});

// Open the side panel (Chrome 114+)
await chrome.sidePanel.open({ windowId: tab.windowId });
```

---

## Debugging Quick Commands

| Action | URL / Method |
|---|---|
| Extensions dashboard | `chrome://extensions` |
| Enable developer mode | Toggle in top-right of `chrome://extensions` |
| Inspect service worker | Click "Inspect views: service worker" on extension card |
| Inspect popup | Right-click extension icon > "Inspect Popup" |
| Content script console | DevTools on the page > Console > select extension context |
| Reload extension | Click the reload arrow on extension card, or `chrome.runtime.reload()` |
| View storage | DevTools > Application > Extension Storage |
| Network for background | Inspect service worker > Network tab |
| Clear service worker | `chrome://serviceworker-internals` |

---

## TypeScript Type Snippets

```typescript
// Typed message handler
interface MessageMap {
  FETCH_DATA: { url: string };
  SET_THEME: { theme: "light" | "dark" };
}

type MessageType = keyof MessageMap;

function sendTypedMessage<T extends MessageType>(
  type: T,
  payload: MessageMap[T]
): Promise<unknown> {
  return chrome.runtime.sendMessage({ type, ...payload });
}

// Typed storage helper
interface StorageSchema {
  count: number;
  prefs: { theme: string; lang: string };
  token: string;
}

async function getStorage<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key];
}
```

---

## @theluckystrike/webext-storage Quick Examples

```typescript
import { createStorage } from "@anthropic/webext-storage";

// Define a typed, reactive store
const store = createStorage({
  count: 0,
  theme: "dark" as "light" | "dark",
});

// Get and set values with full type safety
const count = await store.get("count"); // number
await store.set("count", count + 1);

// Watch for changes reactively
store.watch("theme", (newVal, oldVal) => {
  document.body.className = newVal;
});
```

---

## @theluckystrike/webext-messaging Quick Examples

```typescript
import { defineMessages, createHandler } from "@anthropic/webext-messaging";

// Define your protocol once
const protocol = defineMessages({
  getUser: {
    input: { id: string },
    output: { name: string; email: string },
  },
  setTheme: {
    input: { theme: "light" | "dark" },
    output: { ok: boolean },
  },
});

// Background: register handlers
createHandler(protocol, {
  getUser: async ({ id }) => {
    return { name: "Alice", email: "alice@example.com" };
  },
  setTheme: async ({ theme }) => {
    await chrome.storage.local.set({ theme });
    return { ok: true };
  },
});

// Content script / popup: call with full type safety
const user = await protocol.send("getUser", { id: "123" });
```

---

## Most-Used APIs Summary Table

| API | Permission | Use Case |
|---|---|---|
| `chrome.storage` | `storage` | Persist data locally, sync, or in-session |
| `chrome.tabs` | `tabs` (or `activeTab`) | Query, create, update, remove tabs |
| `chrome.scripting` | `scripting` | Programmatically inject JS/CSS |
| `chrome.runtime` | _(none)_ | Messaging, lifecycle events, extension URLs |
| `chrome.alarms` | `alarms` | Schedule recurring or delayed tasks |
| `chrome.action` | _(none)_ | Badge, popup, icon for the toolbar button |
| `chrome.contextMenus` | `contextMenus` | Right-click menu items |
| `chrome.notifications` | `notifications` | System notifications |
| `chrome.permissions` | _(none)_ | Request optional permissions at runtime |
| `chrome.sidePanel` | `sidePanel` | Open/manage the side panel (Chrome 114+) |
| `chrome.declarativeNetRequest` | `declarativeNetRequest` | Block/redirect network requests declaratively |
| `chrome.identity` | `identity` | OAuth2 authentication flows |

---

## See Also

- [Manifest V3 Fields Reference](manifest-v3-fields.md)
- [Service Worker Lifecycle](service-worker-lifecycle.md)
- [Content Script Patterns](content-script-patterns.md)
- [Debugging Extensions](debugging-extensions.md)
- [MV2 to MV3 Migration Cheatsheet](mv3-migration-cheatsheet.md)
