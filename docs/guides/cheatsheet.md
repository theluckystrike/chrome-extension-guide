# Chrome Extension Development Cheatsheet

Quick-reference for Manifest V3 Chrome extension development. Every snippet is copy-paste ready TypeScript.

---

## Manifest V3 Skeleton

```jsonc
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "A brief description.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://*.example.com/*"],
  "background": { "service_worker": "src/background.ts", "type": "module" },
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" }
  },
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["src/content.ts"],
    "run_at": "document_idle"
  }],
  "options_ui": { "page": "options.html", "open_in_tab": false },
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" },
  "web_accessible_resources": [{
    "resources": ["images/*"],
    "matches": ["https://*.example.com/*"]
  }]
}
```

---

## Service Worker Event Registration

All listeners **must** be registered synchronously at the top level. The worker terminates when idle and restarts on events.

```typescript
// background.ts
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") chrome.storage.local.set({ installedAt: Date.now() });
  if (details.reason === "update") console.log(`Updated from ${details.previousVersion}`);
});

chrome.runtime.onStartup.addListener(() => { /* browser cold start */ });

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender, sendResponse);
  return true; // keep channel open for async sendResponse
});

chrome.alarms.onAlarm.addListener((alarm) => handleAlarm(alarm));
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "complete") handleTabReady(tabId, tab);
});
```

---

## Content Script Injection (3 Ways)

**1. Manifest-declared (static)**
```jsonc
{ "content_scripts": [{
    "matches": ["https://example.com/*"],
    "js": ["src/content.ts"],
    "run_at": "document_idle",  // "document_start" | "document_end" | "document_idle"
    "all_frames": false
}]}
```

**2. Programmatic file injection** (requires `"scripting"` permission)
```typescript
chrome.scripting.executeScript({ target: { tabId }, files: ["src/content.ts"] });
```

**3. Programmatic inline function**
```typescript
chrome.scripting.executeScript({
  target: { tabId },
  func: (greeting: string) => { document.title = greeting; },
  args: ["Hello from extension"],
});
```

---

## Message Passing Templates

**One-shot: content to background**
```typescript
// content.ts
const response = await chrome.runtime.sendMessage({ type: "FETCH_DATA", url: location.href });

// background.ts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FETCH_DATA") {
    fetch(msg.url).then(r => r.json()).then(data => sendResponse({ data }));
    return true; // async
  }
});
```

**One-shot: background to tab**
```typescript
const response = await chrome.tabs.sendMessage(tabId, { type: "HIGHLIGHT", selector: "#main" });
```

**Long-lived port**
```typescript
// content.ts
const port = chrome.runtime.connect({ name: "stream" });
port.postMessage({ type: "SUBSCRIBE" });
port.onMessage.addListener((msg) => console.log(msg));

// background.ts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "stream") return;
  port.onMessage.addListener((msg) => {
    const interval = setInterval(() => port.postMessage({ ts: Date.now() }), 1000);
    port.onDisconnect.addListener(() => clearInterval(interval));
  });
});
```

**Popup to background**
```typescript
const { status } = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
```

---

## Storage Snippets

```typescript
// ---- chrome.storage.local ----
await chrome.storage.local.set({ settings: { theme: "dark" }, lastSync: Date.now() });
const { settings } = await chrome.storage.local.get("settings");
const { settings: s } = await chrome.storage.local.get({ settings: { theme: "light" } }); // defaults
await chrome.storage.local.remove("lastSync");
await chrome.storage.local.clear();

// ---- chrome.storage.sync (100KB total, 8KB per item) ----
await chrome.storage.sync.set({ prefs: { lang: "en" } });
const { prefs } = await chrome.storage.sync.get("prefs");

// ---- chrome.storage.session (cleared on browser close) ----
await chrome.storage.session.set({ token: "abc" });
await chrome.storage.session.setAccessLevel({
  accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS", // allow content scripts
});

// ---- Listen for changes ----
chrome.storage.onChanged.addListener((changes, area) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes))
    console.log(`[${area}] ${key}: ${oldValue} -> ${newValue}`);
});
```

---

## chrome.action Badge/Icon/Title

```typescript
await chrome.action.setBadgeText({ text: "5" });              // global
await chrome.action.setBadgeText({ text: "5", tabId });        // per-tab
await chrome.action.setBadgeBackgroundColor({ color: "#F00" });
await chrome.action.setBadgeTextColor({ color: "#FFF" });      // Chrome 110+
await chrome.action.setTitle({ title: "Click me" });
await chrome.action.setIcon({ path: { 16: "icons/on-16.png", 32: "icons/on-32.png" } });
await chrome.action.enable(tabId);
await chrome.action.disable(tabId);
await chrome.action.openPopup();  // Chrome 127+, needs user gesture

chrome.action.onClicked.addListener((tab) => { /* fires only if no popup */ });
```

---

## Context Menu Creation

```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "lookup", title: 'Look up "%s"', contexts: ["selection"] });
  chrome.contextMenus.create({ id: "save-img", title: "Save image", contexts: ["image"] });
  chrome.contextMenus.create({
    id: "sidebar", title: "Open sidebar", contexts: ["page"],
    documentUrlPatterns: ["https://*.example.com/*"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "lookup") console.log("Selected:", info.selectionText);
  if (info.menuItemId === "save-img") console.log("Image:", info.srcUrl);
});
```

---

## chrome.alarms Setup

```typescript
// Requires "alarms" permission
chrome.alarms.create("one-shot", { delayInMinutes: 1 });
chrome.alarms.create("periodic", { delayInMinutes: 1, periodInMinutes: 30 });
chrome.alarms.create("scheduled", { when: Date.now() + 3600_000 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "periodic") syncData();
});

const all = await chrome.alarms.getAll();
await chrome.alarms.clear("one-shot");
await chrome.alarms.clearAll();
```

---

## chrome.tabs Common Operations

```typescript
// Query
const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
const matching = await chrome.tabs.query({ url: "https://example.com/*" });

// Create / Update / Remove
const tab = await chrome.tabs.create({ url: "https://example.com", active: true });
await chrome.tabs.update(tabId, { url: "https://new.com", pinned: true });
await chrome.tabs.remove(tabId);
await chrome.tabs.remove([tabId1, tabId2]);

// Move / Duplicate
await chrome.tabs.move(tabId, { index: 0 });
const dup = await chrome.tabs.duplicate(tabId);

// Group
const groupId = await chrome.tabs.group({ tabIds: [tabId1, tabId2] });
await chrome.tabGroups.update(groupId, { title: "Research", color: "blue" });

// Message to content script
const res = await chrome.tabs.sendMessage(tabId, { type: "PING" });

// Capture screenshot (requires "activeTab")
const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });

// Reload
await chrome.tabs.reload(tabId, { bypassCache: true });
```

---

## chrome.scripting.executeScript Templates

```typescript
// Execute file
await chrome.scripting.executeScript({ target: { tabId }, files: ["scripts/inject.js"] });

// Inline function with args
const [{ result }] = await chrome.scripting.executeScript({
  target: { tabId },
  func: (sel: string) => document.querySelector(sel)?.textContent ?? null,
  args: ["h1"],
});

// All frames
await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["inject.js"] });

// MAIN world (access page JS)
await chrome.scripting.executeScript({
  target: { tabId }, world: "MAIN",
  func: () => (window as any).appConfig,
});

// Insert / remove CSS
await chrome.scripting.insertCSS({ target: { tabId }, css: "body { border: 3px solid red; }" });
await chrome.scripting.removeCSS({ target: { tabId }, css: "body { border: 3px solid red; }" });

// Register dynamic content scripts
await chrome.scripting.registerContentScripts([{
  id: "dynamic", matches: ["https://example.com/*"],
  js: ["scripts/dynamic.js"], runAt: "document_idle", persistAcrossSessions: true,
}]);
await chrome.scripting.unregisterContentScripts({ ids: ["dynamic"] });
```

---

## declarativeNetRequest Rule Templates

**Block**
```jsonc
[{ "id": 1, "priority": 1,
   "action": { "type": "block" },
   "condition": { "urlFilter": "tracker.example.com", "resourceTypes": ["script", "image"] }
}]
```

**Redirect**
```jsonc
[{ "id": 2, "priority": 1,
   "action": { "type": "redirect", "redirect": { "url": "https://safe.example.com/" } },
   "condition": { "urlFilter": "old.example.com", "resourceTypes": ["main_frame"] }
}]
```

**Modify headers**
```jsonc
[{ "id": 3, "priority": 1,
   "action": { "type": "modifyHeaders",
     "requestHeaders": [{ "header": "Cookie", "operation": "remove" }],
     "responseHeaders": [{ "header": "X-Frame-Options", "operation": "remove" }]
   },
   "condition": { "urlFilter": "api.example.com/*", "resourceTypes": ["xmlhttprequest"] }
}]
```

**Dynamic rules at runtime**
```typescript
await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{ id: 100, priority: 1,
    action: { type: "block" as const },
    condition: { urlFilter: "ads.example.com", resourceTypes: ["script" as const] },
  }],
  removeRuleIds: [99],
});
```

---

## Permission Quick Reference

| Permission | Unlocks |
|---|---|
| `activeTab` | Temporary host access on user gesture |
| `alarms` | `chrome.alarms` |
| `bookmarks` | `chrome.bookmarks` |
| `contextMenus` | `chrome.contextMenus` |
| `cookies` | `chrome.cookies` (+ host_permissions) |
| `declarativeNetRequest` | Network request rules |
| `downloads` | `chrome.downloads` |
| `history` | `chrome.history` |
| `identity` | OAuth via `chrome.identity` |
| `notifications` | `chrome.notifications` |
| `offscreen` | Offscreen documents |
| `scripting` | `chrome.scripting` |
| `sidePanel` | `chrome.sidePanel` |
| `storage` | `chrome.storage` |
| `tabGroups` | `chrome.tabGroups` |
| `tabs` | Access tab `url`, `title`, `favIconUrl` |
| `webNavigation` | `chrome.webNavigation` |

---

## Common Errors and Fixes

| Error | Fix |
|---|---|
| `Extension context invalidated` | Extension reloaded. Re-inject content script or reload tab. |
| `Receiving end does not exist` | Target has no listener. Inject content script first. |
| `Message port closed before response` | Return `true` from `onMessage` when using async `sendResponse`. |
| `Cannot access chrome:// URL` | Extensions cannot inject into chrome:// pages. |
| `Service worker registration failed` | Wrong file path or top-level `await` in service worker. |
| `Fetch blocked by CORS` | Move fetch to service worker. Add host to `host_permissions`. |
| `Exceeded storage quota` | `sync` is 100KB. Switch to `storage.local` (10MB). |
| `No tab with id` | Tab closed before execution. Wrap in try/catch. |
| `Alarm delay < 30 seconds` | Minimum alarm delay is 30s in production. |

---

## Debug Commands

```
chrome://extensions          — manage extensions, click "Errors" for logs
chrome://inspect/#extensions — inspect service workers
chrome://flags               — experimental flags
chrome://serviceworker-internals — SW lifecycle status
```

| Action | macOS | Windows/Linux |
|---|---|---|
| DevTools | Cmd+Opt+I | Ctrl+Shift+I |
| Console | Cmd+Opt+J | Ctrl+Shift+J |
| Search files | Cmd+P | Ctrl+P |
| Search source | Cmd+Opt+F | Ctrl+Shift+F |
| Pause debugger | F8 | F8 |

---

## Build Configs

**Vite**
```typescript
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist", emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
      },
      output: { entryFileNames: "[name].js" },
    },
  },
});
```

**CRXJS (simplest)**
```typescript
import { defineConfig } from "vite";
import crx from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
export default defineConfig({ plugins: [crx({ manifest })] });
```

**webpack**
```typescript
import path from "path";
import CopyPlugin from "copy-webpack-plugin";
export default {
  mode: "production",
  entry: { background: "./src/background.ts", content: "./src/content.ts", popup: "./src/popup.ts" },
  output: { path: path.resolve(__dirname, "dist"), filename: "[name].js", clean: true },
  module: { rules: [{ test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ }] },
  resolve: { extensions: [".ts", ".tsx", ".js"] },
  plugins: [new CopyPlugin({ patterns: [
    { from: "manifest.json" }, { from: "popup.html" }, { from: "icons", to: "icons" },
  ]})],
};
```

**package.json scripts**
```jsonc
{ "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "vite build",
    "zip": "cd dist && zip -r ../extension.zip . -x '*.map'",
    "typecheck": "tsc --noEmit"
}}
```

**tsconfig.json**
```jsonc
{ "compilerOptions": {
    "target": "ES2022", "module": "ES2022", "moduleResolution": "bundler",
    "strict": true, "outDir": "dist", "types": ["chrome"]
}, "include": ["src/**/*.ts"] }
```

```bash
npm install -D @types/chrome
```
