# Chrome Runtime API Reference

The `chrome.runtime` API provides core extension lifecycle management, messaging, and utility functions. It's the backbone of every Chrome extension — no permission is required to use it.

## Permissions

None required. `chrome.runtime` is available to all extension contexts by default.

## Properties

### chrome.runtime.id

The extension's unique ID.

```ts
console.log(chrome.runtime.id); // "abcdefghijklmnop..."
```

### chrome.runtime.lastError

Set when an async Chrome API call fails. Check this in callbacks (less relevant with promise-based MV3 APIs — use try/catch instead).

```ts
// Legacy callback pattern
chrome.tabs.create({ url: "invalid" }, (tab) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    return;
  }
  // success
});

// Modern async pattern — use try/catch instead
try {
  await chrome.tabs.create({ url: "chrome://invalid" });
} catch (e) {
  console.error(e);
}
```

## URL and Resource Methods

### chrome.runtime.getURL(path)

Convert a relative path to a fully qualified `chrome-extension://` URL.

```ts
const url = chrome.runtime.getURL("popup.html");
// "chrome-extension://abcdefghijklmnop/popup.html"

const iconUrl = chrome.runtime.getURL("images/icon.png");

// Use in HTML
const img = document.createElement("img");
img.src = chrome.runtime.getURL("assets/logo.png");
```

### chrome.runtime.getManifest()

Get the parsed `manifest.json` as an object.

```ts
const manifest = chrome.runtime.getManifest();
console.log(manifest.version); // "1.2.3"
console.log(manifest.name);    // "My Extension"
console.log(manifest.permissions); // ["tabs", "storage"]
```

## Lifecycle Events

### chrome.runtime.onInstalled

Fires when the extension is first installed, updated, or Chrome is updated. This is the most important lifecycle event.

```ts
chrome.runtime.onInstalled.addListener((details) => {
  switch (details.reason) {
    case "install":
      // First install — set defaults, show onboarding
      console.log("Extension installed!");
      chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
      break;

    case "update":
      // Extension updated — migrate data if needed
      console.log(`Updated from ${details.previousVersion}`);
      break;

    case "chrome_update":
      // Browser itself was updated
      console.log("Chrome updated");
      break;
  }
});
```

**InstallDetails:**

| Property | Type | Description |
|----------|------|-------------|
| `reason` | `string` | `"install"`, `"update"`, `"chrome_update"` |
| `previousVersion` | `string \| undefined` | Previous version (only on `"update"`) |
| `id` | `string \| undefined` | ID of the imported extension (shared module) |

### chrome.runtime.onStartup

Fires when the browser starts up (profile loaded). Does NOT fire on install — use `onInstalled` for that.

```ts
chrome.runtime.onStartup.addListener(() => {
  console.log("Browser started — extension service worker waking up");
  // Re-initialize state, re-register alarms, etc.
});
```

### chrome.runtime.onSuspend

Fires just before the service worker is terminated. You have a very short time window (~5 seconds) to clean up.

```ts
chrome.runtime.onSuspend.addListener(() => {
  console.log("Service worker shutting down");
  // Close connections, flush buffers
});
```

### chrome.runtime.onUpdateAvailable

Fires when a new version of the extension is available but hasn't been installed yet (because the extension is running).

```ts
chrome.runtime.onUpdateAvailable.addListener((details) => {
  console.log(`Update available: ${details.version}`);
  // Force update immediately (instead of waiting for browser restart)
  chrome.runtime.reload();
});
```

## Messaging

### chrome.runtime.sendMessage(message, options?)

Send a message from any context to the service worker (or between extension pages).

```ts
// From popup or content script
const response = await chrome.runtime.sendMessage({
  type: "getData",
  key: "settings",
});
console.log(response);
```

### chrome.runtime.onMessage

Listen for messages. Return `true` from the listener to indicate you'll send a response asynchronously.

```ts
// In service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getData") {
    // Async response pattern
    fetchData(message.key).then((data) => {
      sendResponse(data);
    });
    return true; // keep the message channel open
  }

  if (message.type === "ping") {
    sendResponse("pong");
    // No return true needed — response is synchronous
  }
});
```

**Sender object:**

| Property | Type | Description |
|----------|------|-------------|
| `tab` | `Tab \| undefined` | Tab that sent the message (if from content script) |
| `frameId` | `number` | Frame ID within the tab |
| `id` | `string` | Extension ID of the sender |
| `url` | `string` | URL of the sender page/script |
| `origin` | `string` | Origin of the sender |

### chrome.runtime.connect(extensionId?, connectInfo)

Establish a long-lived connection (port) for ongoing communication.

```ts
// From popup
const port = chrome.runtime.connect({ name: "popup" });

port.postMessage({ type: "subscribe", channel: "updates" });

port.onMessage.addListener((message) => {
  console.log("Received:", message);
});

port.onDisconnect.addListener(() => {
  console.log("Port disconnected");
});
```

### chrome.runtime.onConnect

Listen for incoming port connections.

```ts
// In service worker
chrome.runtime.onConnect.addListener((port) => {
  console.log(`New connection: ${port.name}`);

  port.onMessage.addListener((message) => {
    if (message.type === "subscribe") {
      // Send periodic updates
      const interval = setInterval(() => {
        try {
          port.postMessage({ type: "update", data: getLatestData() });
        } catch {
          clearInterval(interval); // Port disconnected
        }
      }, 1000);

      port.onDisconnect.addListener(() => {
        clearInterval(interval);
      });
    }
  });
});
```

### External messaging

Communicate with other extensions or web pages.

```ts
// Send to another extension
const response = await chrome.runtime.sendMessage(
  "other-extension-id",
  { type: "request", data: "hello" },
);

// Listen for messages from other extensions
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log(`Message from extension ${sender.id}:`, message);
  sendResponse({ received: true });
});

// Listen for connections from web pages
// (requires "externally_connectable" in manifest)
chrome.runtime.onConnectExternal.addListener((port) => {
  console.log("External connection from:", port.sender?.url);
});
```

**Manifest for external messaging:**

```json
{
  "externally_connectable": {
    "matches": ["https://example.com/*"],
    "ids": ["other-extension-id"]
  }
}
```

## Utility Methods

### chrome.runtime.reload()

Restart the extension.

```ts
chrome.runtime.reload(); // Extension restarts immediately
```

### chrome.runtime.setUninstallURL(url)

Set a URL to open when the user uninstalls the extension.

```ts
chrome.runtime.setUninstallURL("https://example.com/uninstall-survey");
```

### chrome.runtime.openOptionsPage()

Open the extension's options page.

```ts
await chrome.runtime.openOptionsPage();
```

### chrome.runtime.getPlatformInfo()

Get info about the current platform.

```ts
const info = await chrome.runtime.getPlatformInfo();
console.log(info.os);   // "mac", "win", "linux", "cros", "android"
console.log(info.arch); // "arm", "arm64", "x86-32", "x86-64"
```

### chrome.runtime.getContexts(filter)

Get information about active extension contexts (MV3, Chrome 116+).

```ts
// Check if popup is open
const contexts = await chrome.runtime.getContexts({
  contextTypes: ["POPUP"],
});
const popupIsOpen = contexts.length > 0;

// Get all active contexts
const allContexts = await chrome.runtime.getContexts({});
allContexts.forEach((ctx) => {
  console.log(`${ctx.contextType}: ${ctx.documentUrl}`);
});
```

**ContextFilter:**

| Property | Type |
|----------|------|
| `contextTypes` | `("TAB" \| "POPUP" \| "BACKGROUND" \| "OFFSCREEN_DOCUMENT" \| "SIDE_PANEL")[]` |
| `documentIds` | `string[]` |
| `documentOrigins` | `string[]` |
| `documentUrls` | `string[]` |
| `frameIds` | `number[]` |
| `incognito` | `boolean` |
| `tabIds` | `number[]` |
| `windowIds` | `number[]` |

## Using with @theluckystrike/webext-messaging

The `@theluckystrike/webext-messaging` package wraps `chrome.runtime.sendMessage` and `chrome.runtime.onMessage` with type safety:

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  getVersion: { request: void; response: string };
  getPlatform: { request: void; response: { os: string; arch: string } };
  checkUpdate: { request: void; response: { available: boolean; version?: string } };
};

const msg = createMessenger<Messages>();

// Background — register handlers
msg.onMessage({
  getVersion: async () => {
    return chrome.runtime.getManifest().version;
  },
  getPlatform: async () => {
    const info = await chrome.runtime.getPlatformInfo();
    return { os: info.os, arch: info.arch };
  },
  checkUpdate: async () => {
    const status = await chrome.runtime.requestUpdateCheck();
    return {
      available: status[0] === "update_available",
      version: status[1]?.version,
    };
  },
});

// Popup — send typed messages
const version = await msg.send("getVersion", undefined);
const platform = await msg.send("getPlatform", undefined);
```

## Using with @theluckystrike/webext-storage

Common pattern: initialize storage defaults on install and migrate on update.

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  schemaVersion: 3,
  theme: "system" as "dark" | "light" | "system",
  fontSize: 14,
  sidebarWidth: 300,
  features: {
    autoSave: true,
    spellCheck: true,
    darkMode: false,
  },
});

const storage = createStorage({ schema, area: "local" });

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // First install: all defaults are already set by the schema
    // Optionally set any computed defaults
    const platform = await chrome.runtime.getPlatformInfo();
    if (platform.os === "mac") {
      await storage.set("fontSize", 15); // slightly larger on Mac
    }
  }

  if (details.reason === "update") {
    const version = await storage.get("schemaVersion");

    if (version < 2) {
      // v2 added sidebarWidth
      await storage.set("sidebarWidth", 300);
    }
    if (version < 3) {
      // v3 changed theme to include "system"
      await storage.set("theme", "system");
    }

    await storage.set("schemaVersion", 3);
  }
});
```

## Common Patterns

### Keep the service worker alive (when needed)

```ts
// Use chrome.runtime.onConnect to maintain a keepalive port
// Only do this when genuinely needed (e.g., long-running operations)

// From popup or offscreen document:
const port = chrome.runtime.connect({ name: "keepalive" });
const keepAlive = setInterval(() => port.postMessage("ping"), 25000);

// Clean up when done
clearInterval(keepAlive);
port.disconnect();
```

### Feature detection

```ts
// Check if an API is available
if (chrome.runtime.getContexts) {
  // Chrome 116+ feature
  const contexts = await chrome.runtime.getContexts({});
}

// Check extension context
const isServiceWorker = typeof window === "undefined";
const isPopup = location.href.includes("popup.html");
```

### Graceful error handling for messaging

```ts
async function safeSendMessage(message: unknown) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (e) {
    const error = e as Error;
    if (error.message.includes("Receiving end does not exist")) {
      // Service worker is not running — expected in some cases
      return null;
    }
    throw e;
  }
}
```

### Version comparison on update

```ts
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "update") return;

  const prev = details.previousVersion!.split(".").map(Number);
  const curr = chrome.runtime.getManifest().version.split(".").map(Number);

  const isMajorUpdate = curr[0] > prev[0];
  const isMinorUpdate = curr[0] === prev[0] && curr[1] > prev[1];

  if (isMajorUpdate) {
    chrome.tabs.create({ url: chrome.runtime.getURL("changelog.html") });
  }
});
```

## Gotchas

1. **`onMessage` must return `true`** for async responses in the callback pattern. If you don't return `true`, the message channel closes before your async operation completes. With `@theluckystrike/webext-messaging`, this is handled automatically.

2. **`sendMessage` throws** if no listener is registered. Always wrap in try/catch, especially from content scripts (the service worker may be inactive).

3. **`onInstalled` fires once per reason.** After an update, it fires with `reason: "update"`. It does NOT fire again on the next browser startup — use `onStartup` for that.

4. **`onSuspend` has a very short time window** (~5 seconds). Do not start long async operations. Flush synchronously or accept data loss.

5. **`getContexts()` is Chrome 116+ only.** Check for its existence before using it.

6. **`connect()` ports disconnect** when the other end's context is destroyed (popup closed, tab navigated away). Always handle `onDisconnect`.

7. **External messaging requires manifest declaration.** Without `"externally_connectable"`, web pages cannot send messages to your extension.

8. **`lastError` is only set in callbacks**, not in promise rejections. In MV3 with async/await, use try/catch instead of checking `lastError`.

## Related

- [Alarms API](alarms-api.md) (for scheduled background work)
- [Storage API Deep Dive](storage-api-deep-dive.md)
- [Tabs API](tabs-api.md) (for `sendMessage` to content scripts)
- [Chrome runtime API docs](https://developer.chrome.com/docs/extensions/reference/api/runtime)
