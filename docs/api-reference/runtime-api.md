---
layout: default
title: "Chrome Runtime API Complete Reference"
description: "The Chrome Runtime API provides core extension lifecycle management, messaging between contexts, resource URL resolution, and platform utilities available to every extension."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/runtime-api/"
---

# Chrome Runtime API Complete Reference

The `chrome.runtime` API is the backbone of every Chrome extension. It provides lifecycle management, messaging between contexts, resource URL resolution, and platform utilities. No permission is required -- it is available in every extension context (service worker, popup, options page, content script).

---

## Properties {#properties}

### chrome.runtime.id {#chromeruntimeid}

```typescript
const extensionId: string = chrome.runtime.id;
// "abcdefghijklmnopqrstuvwxyz"
```

The globally unique identifier for this extension. Stable across sessions; changes only if the extension is unpacked and reloaded from a different directory.

### chrome.runtime.lastError {#chromeruntimelasterror}

```typescript
chrome.runtime.lastError: { message: string } | undefined;
```

Set inside callbacks when the preceding async API call failed. In MV3 with promise-based APIs, prefer `try/catch` instead.

```typescript
// Callback style (MV2 / backward-compat)
chrome.tabs.create({ url: "chrome://invalid" }, (tab) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    return;
  }
  console.log("Tab created:", tab.id);
});

// Promise style (MV3) -- lastError not needed
try {
  const tab = await chrome.tabs.create({ url: "https://example.com" });
} catch (err) {
  console.error((err as Error).message);
}
```

### chrome.runtime.getManifest() {#chromeruntimegetmanifest}

```typescript
function getManifest(): chrome.runtime.Manifest;
```

Returns the parsed `manifest.json` as an object. Useful for reading your own version, permissions, or custom keys at runtime.

```typescript
const manifest = chrome.runtime.getManifest();
console.log(manifest.version);      // "1.2.3"
console.log(manifest.name);         // "My Extension"
console.log(manifest.permissions);   // ["storage", "alarms"]
```

### chrome.runtime.getURL(path) {#chromeruntimegeturlpath}

```typescript
function getURL(path: string): string;
```

Converts a relative path within the extension bundle to a fully qualified `chrome-extension://` URL.

```typescript
const popupUrl = chrome.runtime.getURL("popup.html");
// "chrome-extension://abcdef.../popup.html"

// Use in content scripts to reference extension-bundled assets
const img = document.createElement("img");
img.src = chrome.runtime.getURL("icons/logo.png");
document.body.appendChild(img);
```

---

## Events {#events}

### chrome.runtime.onInstalled {#chromeruntimeoninstalled}

```typescript
chrome.runtime.onInstalled.addListener(
  callback: (details: {
    reason: "install" | "update" | "chrome_update" | "shared_module_update";
    previousVersion?: string;
    id?: string;
  }) => void
): void;
```

Fires when the extension is first installed, updated to a new version, or when Chrome itself updates. The standard place to run one-time setup.

```typescript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ version: chrome.runtime.getManifest().version });
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
  if (details.reason === "update") {
    console.log(`Updated from ${details.previousVersion}`);
    migrateStorageSchema(details.previousVersion!);
  }
  // Context menus must be recreated on every install/update
  chrome.contextMenus.create({ id: "main-action", title: "Do the thing", contexts: ["selection"] });
});
```

### chrome.runtime.onStartup {#chromeruntimeonstartup}

```typescript
chrome.runtime.onStartup.addListener(callback: () => void): void;
```

Fires when a Chrome profile that has this extension installed starts up. Does **not** fire on install -- only on subsequent browser launches.

```typescript
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.session.set({ sessionStart: Date.now() });
});
```

### chrome.runtime.onSuspend {#chromeruntimeonsuspend}

```typescript
chrome.runtime.onSuspend.addListener(callback: () => void): void;
```

Fires just before the service worker (MV3) or event page (MV2) is unloaded. You have roughly five seconds to run synchronous cleanup -- async operations are not guaranteed to complete.

```typescript
chrome.runtime.onSuspend.addListener(() => {
  chrome.storage.session.set({ cachedData: inMemoryCache });
});
```

### chrome.runtime.onMessage {#chromeruntimeonmessage}

```typescript
chrome.runtime.onMessage.addListener(
  callback: (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => boolean | undefined
): void;
```

Fires when a message is sent via `chrome.runtime.sendMessage` or `chrome.tabs.sendMessage` from any context within the same extension. Return `true` to keep the channel open for async `sendResponse`.

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_DATA") {
    fetchData(message.key)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async -- must return true
  }
  if (message.type === "LOG") {
    console.log(`[Tab ${sender.tab?.id}] ${message.text}`);
    sendResponse({ ack: true }); // sync -- no return true needed
  }
});
```

**MessageSender fields:**

| Field | Type | Description |
|---|---|---|
| `sender.tab` | `Tab \| undefined` | The tab that sent the message (undefined from popup/background) |
| `sender.frameId` | `number` | Frame ID within the tab (0 = main frame) |
| `sender.id` | `string` | Extension ID of the sender |
| `sender.url` | `string` | URL of the sending context |
| `sender.origin` | `string` | Origin of the sending context |
| `sender.documentId` | `string` | UUID of the sender document |
| `sender.documentLifecycle` | `string` | Lifecycle state of the sender document |

### chrome.runtime.onMessageExternal {#chromeruntimeonmessageexternal}

```typescript
chrome.runtime.onMessageExternal.addListener(
  callback: (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => boolean | undefined
): void;
```

Fires when a message arrives from a **different extension** or from a web page (if `"externally_connectable"` is configured in the manifest). The `sender.id` identifies which extension sent the message.

```typescript
// manifest.json: "externally_connectable": { "ids": ["other-ext-id"] }

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (sender.id !== "expected-extension-id") {
    sendResponse({ error: "unauthorized" });
    return;
  }
  sendResponse({ data: "shared info" });
});
```

### chrome.runtime.onConnect {#chromeruntimeonconnect}

```typescript
chrome.runtime.onConnect.addListener(
  callback: (port: chrome.runtime.Port) => void
): void;
```

Fires when a long-lived connection is opened via `chrome.runtime.connect()`.

```typescript
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    if (msg.type === "PING") port.postMessage({ type: "PONG", ts: Date.now() });
  });
  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) console.warn("Port error:", chrome.runtime.lastError.message);
  });
});
```

### chrome.runtime.onConnectExternal {#chromeruntimeonconnectexternal}

```typescript
chrome.runtime.onConnectExternal.addListener(
  callback: (port: chrome.runtime.Port) => void
): void;
```

Like `onConnect`, but for connections originating from other extensions or web pages. Requires `"externally_connectable"` in the manifest.

```typescript
chrome.runtime.onConnectExternal.addListener((port) => {
  console.log(`External connection from: ${port.sender?.id}`);
  port.onMessage.addListener((msg) => {
    port.postMessage({ echo: msg });
  });
});
```

**Manifest declaration for external messaging:**

```jsonc
{
  "externally_connectable": {
    "matches": ["https://example.com/*"],
    "ids": ["other-extension-id-here"]
  }
}
```

### chrome.runtime.onUpdateAvailable {#chromeruntimeonupdateavailable}

```typescript
chrome.runtime.onUpdateAvailable.addListener(
  callback: (details: { version: string }) => void
): void;
```

Fires when a Chrome Web Store update is available but not yet applied. Chrome delays updates while the extension is active. Call `chrome.runtime.reload()` to apply immediately, or let Chrome apply it on next restart.

```typescript
chrome.runtime.onUpdateAvailable.addListener((details) => {
  console.log(`Update to v${details.version} available`);
  // Apply immediately or defer -- see "Update flow" pattern below
  chrome.runtime.reload();
});
```

---

## Methods {#methods}

### chrome.runtime.sendMessage() {#chromeruntimesendmessage}

```typescript
function sendMessage<R = any>(
  message: any,
  options?: { includeTlsChannelId?: boolean }
): Promise<R>;

function sendMessage<R = any>(
  extensionId: string,
  message: any,
  options?: { includeTlsChannelId?: boolean }
): Promise<R>;
```

Sends a one-shot message to the extension's service worker. When `extensionId` is provided, sends to that other extension.

```typescript
// To own background
const response = await chrome.runtime.sendMessage({ type: "GET_COUNT" });

// To another extension
const extRes = await chrome.runtime.sendMessage("other-ext-id", { type: "SHARE" });

// Error handling
try {
  await chrome.runtime.sendMessage({ type: "ACTION" });
} catch (err) {
  // "Could not establish connection. Receiving end does not exist."
  console.error((err as Error).message);
}
```

### chrome.runtime.connect() {#chromeruntimeconnect}

```typescript
function connect(connectInfo?: { name?: string }): chrome.runtime.Port;
function connect(
  extensionId: string,
  connectInfo?: { name?: string }
): chrome.runtime.Port;
```

Opens a long-lived message channel returning a `Port` for bidirectional communication.

```typescript
const port = chrome.runtime.connect({ name: "data-stream" });
port.postMessage({ subscribe: "updates" });
port.onMessage.addListener((msg) => console.log("Received:", msg));
port.onDisconnect.addListener(() => console.log("Closed"));
port.disconnect(); // close when done
```

### chrome.runtime.getContexts() (MV3 only, Chrome 116+) {#chromeruntimegetcontexts-mv3-only-chrome-116}

```typescript
function getContexts(filter: {
  contextTypes?: ContextType[];
  documentIds?: string[];
  documentOrigins?: string[];
  documentUrls?: string[];
  frameIds?: number[];
  incognito?: boolean;
  tabIds?: number[];
  windowIds?: number[];
}): Promise<ExtensionContext[]>;

type ContextType =
  | "TAB" | "POPUP" | "BACKGROUND"
  | "OFFSCREEN_DOCUMENT" | "SIDE_PANEL"
  | "DEVELOPER_TOOLS";
```

Returns information about active extension contexts. The MV3 replacement for `getBackgroundPage()`.

```typescript
// Check if an offscreen document exists
const offscreen = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
const hasOffscreen = offscreen.length > 0;

// Check if popup is open
const popup = await chrome.runtime.getContexts({ contextTypes: ["POPUP"] });
const popupIsOpen = popup.length > 0;
```

### chrome.runtime.getBackgroundPage() (MV2 only) {#chromeruntimegetbackgroundpage-mv2-only}

```typescript
function getBackgroundPage(): Promise<Window>;
```

Returns the `Window` object of the background page. **Not available in MV3.** Replace with `sendMessage()` or shared modules.

```typescript
const bg = await chrome.runtime.getBackgroundPage(); // MV2 only
bg.someGlobalFunction();

### chrome.runtime.reload() {#chromeruntimereload}

```typescript
function reload(): void;
```

Reloads the extension immediately. Equivalent to clicking the reload button on `chrome://extensions`. Terminates the service worker, re-reads the manifest, and restarts.

```typescript
// Apply a pending update
chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload();
});
```

### chrome.runtime.requestUpdateCheck() {#chromeruntimerequestupdatecheck}

```typescript
function requestUpdateCheck(): Promise<{
  status: "throttled" | "no_update" | "update_available";
  version?: string;
}>;
```

Asks the Chrome Web Store whether an update is available for this extension. Throttled if called too frequently.

```typescript
const { status, version } = await chrome.runtime.requestUpdateCheck();
if (status === "update_available") {
  console.log(`Version ${version} is available`);
}
if (status === "throttled") {
  console.log("Too many checks -- try again later");
}
```

### chrome.runtime.setUninstallURL() {#chromeruntimesetuninstallurl}

```typescript
function setUninstallURL(url: string): Promise<void>;
```

Sets a URL to open when the user uninstalls the extension. Must be `http:` or `https:`, max 1023 characters. Typically used for exit surveys.

```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.setUninstallURL(
    "https://example.com/uninstall-survey?ext=my-extension"
  );
});
```

### chrome.runtime.openOptionsPage() {#chromeruntimeopenoptionspage}

```typescript
function openOptionsPage(): Promise<void>;
```

Opens the extension's options page as defined by `options_ui` in the manifest. If the page is already open in a tab, that tab is focused instead.

```typescript
await chrome.runtime.openOptionsPage();
```

### chrome.runtime.getPlatformInfo() {#chromeruntimegetplatforminfo}

```typescript
function getPlatformInfo(): Promise<{
  os: "mac" | "win" | "android" | "cros" | "linux" | "openbsd" | "fuchsia";
  arch: "arm" | "arm64" | "x86-32" | "x86-64" | "mips" | "mips64";
  nacl_arch: "arm" | "x86-32" | "x86-64" | "mips" | "mips64";
}>;
```

Returns the operating system and architecture the extension is running on.

```typescript
const platform = await chrome.runtime.getPlatformInfo();
if (platform.os === "mac") {
  console.log("Use Cmd key shortcuts");
} else {
  console.log("Use Ctrl key shortcuts");
}
```

### chrome.runtime.getPackageDirectoryEntry() {#chromeruntimegetpackagedirectoryentry}

```typescript
function getPackageDirectoryEntry(): Promise<DirectoryEntry>;
```

Returns a `DirectoryEntry` (File System API) for the extension's install directory.

```typescript
const dir = await chrome.runtime.getPackageDirectoryEntry();
dir.getFile("data/config.json", {}, (entry) => {
  entry.file((file) => {
    const reader = new FileReader();
    reader.onload = () => console.log(reader.result);
    reader.readAsText(file);
  });
});
```

---

## Common Patterns {#common-patterns}

### Install handler with storage migration {#install-handler-with-storage-migration}

```typescript
chrome.runtime.onInstalled.addListener(async (details) => {
  const currentVersion = chrome.runtime.getManifest().version;

  if (details.reason === "install") {
    await chrome.storage.local.set({ version: currentVersion, settings: { theme: "auto" } });
    await chrome.runtime.setUninstallURL("https://example.com/feedback");
  }

  if (details.reason === "update") {
    const { version: old } = await chrome.storage.local.get("version");
    // Run migrations based on previous version
    if (old === "1.0.0") {
      const { config } = await chrome.storage.local.get("config");
      await chrome.storage.local.set({ settings: config });
      await chrome.storage.local.remove("config");
    }
    await chrome.storage.local.set({ version: currentVersion });
  }
});
```

### Message router {#message-router}

```typescript
type Handler = (payload: any, sender: chrome.runtime.MessageSender) => Promise<any>;

const handlers: Record<string, Handler> = {
  GET_DATA: async (p) => ({ data: await fetchFromApi(p.endpoint) }),
  SAVE: async (p) => { await chrome.storage.sync.set({ [p.key]: p.value }); return { ok: true }; },
  TAB_URL: async (_, s) => ({ url: s.tab?.url ?? null }),
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = handlers[msg.type];
  if (!handler) return sendResponse({ error: `Unknown: ${msg.type}` });
  handler(msg.payload, sender)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));
  return true; // async
});
```

### Port management with reconnection {#port-management-with-reconnection}

```typescript
// content.ts -- auto-reconnecting port
function createPort(): chrome.runtime.Port {
  const port = chrome.runtime.connect({ name: "content-link" });

  port.onMessage.addListener((msg) => handleBackgroundMessage(msg));

  port.onDisconnect.addListener(() => {
    // Service worker went idle -- reconnect after a delay
    setTimeout(() => { activePort = createPort(); }, 1000);
  });

  return port;
}

let activePort = createPort();
```

### Deferred update flow {#deferred-update-flow}

```typescript
let updatePending = false;

chrome.runtime.onUpdateAvailable.addListener((details) => {
  updatePending = true;
  chrome.runtime.sendMessage({ type: "UPDATE_AVAILABLE", version: details.version }).catch(() => {});
});

chrome.idle.onStateChanged.addListener((state) => {
  if (state === "idle" && updatePending) chrome.runtime.reload();
});
```

---

## Error Handling Reference {#error-handling-reference}

| Method | Error Message | Cause |
|---|---|---|
| `sendMessage` | `Could not establish connection. Receiving end does not exist.` | No `onMessage` listener in the target context |
| `sendMessage` | `The message port closed before a response was received.` | Listener did not return `true` for async response |
| `connect` | `Could not establish connection.` | Target context does not exist or has no `onConnect` listener |
| `sendMessage` (ext) | `Invalid extension id` | The target extension is not installed |
| `setUninstallURL` | `Invalid URL` | URL exceeds 1023 chars or uses a non-http(s) scheme |
| `openOptionsPage` | `No options page` | `options_ui` not declared in the manifest |
| `getBackgroundPage` | `Access denied` | Called from a content script, or called in MV3 |

---

## MV2 vs MV3 Differences {#mv2-vs-mv3-differences}

| Feature | MV2 | MV3 |
|---|---|---|
| Background context | Persistent background page | Ephemeral service worker |
| `getBackgroundPage()` | Returns background `Window` | Not available -- use `getContexts()` |
| `getContexts()` | Not available | Returns info on all active contexts |
| API style | Callbacks + `chrome.runtime.lastError` | Promises + `try/catch` |
| `onSuspend` timing | Fires when event page goes idle | Fires when service worker terminates (~30s idle) |
| Port lifetime | Survives as long as background page lives | Disconnects when service worker goes idle |
| `getPackageDirectoryEntry` | Full access (DOM available) | Available but limited (no DOM in service worker) |

**Key migration note:** In MV3, service workers terminate after approximately 30 seconds of inactivity. Long-lived `Port` connections will disconnect when this happens. Content scripts must handle reconnection, and all persistent state must go into `chrome.storage` rather than global variables.

---

## Related {#related}

- [Alarms API](alarms-api.md) -- scheduled background work
- [Storage API Deep Dive](storage-api-deep-dive.md) -- persistence patterns
- [Tabs API](tabs-api.md) -- `sendMessage` to content scripts
- [Chrome runtime API docs](https://developer.chrome.com/docs/extensions/reference/api/runtime) -- official reference
## Frequently Asked Questions

### How do I communicate between background and content scripts?
Use chrome.runtime.sendMessage() from content scripts and chrome.runtime.onMessage.addListener() in the background.

### How do I get the extension ID?
Use chrome.runtime.id to get your extension's unique ID at runtime.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
