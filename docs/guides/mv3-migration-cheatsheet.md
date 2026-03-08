---
layout: default
title: "Chrome Extension MV3 Migration Cheatsheet — Developer Guide"
description: "Migrate your Chrome extension to Manifest V3 with this comprehensive guide covering API changes and required updates."
---
# MV2 to MV3 Migration Cheatsheet

A practical, side-by-side reference for migrating Chrome extensions from Manifest V2 to Manifest V3. Each section shows the old MV2 pattern and its MV3 replacement with working code examples.

> For a task-based checklist, see [Migration Checklist](../mv3/migration-checklist.md).

---

## Table of Contents

1. [Manifest Version Key](#1-manifest-version-key)
2. [Background Pages to Service Workers](#2-background-pages-to-service-workers)
3. [Persistent Background to Event-Driven Alarms](#3-persistent-background-to-event-driven-alarms)
4. [browser_action / page_action to action](#4-browser_action--page_action-to-action)
5. [chrome.browserAction to chrome.action](#5-chromebrowseraction-to-chromeaction)
6. [Callback-Based APIs to Promise-Based APIs](#6-callback-based-apis-to-promise-based-apis)
7. [chrome.extension.getURL to chrome.runtime.getURL](#7-chromeextensiongeturl-to-chromeruntimegeturl)
8. [executeScript Changes](#8-executescript-changes)
9. [Content Security Policy Changes](#9-content-security-policy-changes)
10. [webRequest Blocking to declarativeNetRequest](#10-webrequest-blocking-to-declarativenetrequest)
11. [localStorage in Background to chrome.storage.session](#11-localstorage-in-background-to-chromestoragesession)
12. [setTimeout / setInterval to chrome.alarms](#12-settimeout--setinterval-to-chromealarms)
13. [Host Permissions](#13-host-permissions)
14. [web_accessible_resources](#14-web_accessible_resources)
15. [Typed Storage with @theluckystrike/webext-storage](#15-typed-storage-with-theluckystrikewebext-storage)
16. [Typed Messaging with @theluckystrike/webext-messaging](#16-typed-messaging-with-theluckystrikewebext-messaging)

---

## 1. Manifest Version Key

### manifest.json

**MV2:**
```json
{
  "manifest_version": 2,
  "name": "My Extension",
  "version": "1.0"
}
```

**MV3:**
```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0"
}
```

---

## 2. Background Pages to Service Workers

Service workers have no DOM access. There is no `window`, `document`, or `XMLHttpRequest`. They are short-lived and terminate after ~30 seconds of inactivity.

### Manifest

**MV2:**
```json
{
  "background": {
    "scripts": ["bg-utils.js", "background.js"],
    "persistent": true
  }
}
```

**MV3:**
```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

> Only a single file is allowed in `service_worker`. Use `"type": "module"` and `import` statements to pull in other files.

### No DOM Access

**MV2:**
```js
// background.js — MV2 had full DOM access
const parser = new DOMParser();
const doc = parser.parseFromString(html, "text/html");
const img = document.createElement("canvas");

const xhr = new XMLHttpRequest();
xhr.open("GET", url);
xhr.send();
```

**MV3:**
```ts
// background.ts — no DOM, no XMLHttpRequest
// Use fetch() for network requests
const response = await fetch(url);
const data = await response.json();

// For DOM operations, use an offscreen document
// See docs/mv3/offscreen-documents.md
await chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: [chrome.offscreen.Reason.DOM_PARSER],
  justification: "Parse HTML content",
});
```

### Event Listeners Must Be Top-Level

**MV2:**
```js
// Could register listeners anywhere, anytime
setTimeout(() => {
  chrome.runtime.onMessage.addListener(handler);
}, 1000);
```

**MV3:**
```ts
// ALL listeners must be registered synchronously at the top level.
// If registered inside async callbacks, the SW may terminate before
// they are attached and events will be missed on restart.
chrome.runtime.onMessage.addListener(handleMessage);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.action.onClicked.addListener(handleClick);

function handleMessage(msg: unknown, sender: chrome.runtime.MessageSender, sendResponse: Function) {
  // ...
}
```

> Deep dive: [Service Worker Lifecycle](service-worker-lifecycle.md) | [Service Workers (MV3)](../mv3/service-workers.md)

---

## 3. Persistent Background to Event-Driven Alarms

MV2 background pages could stay alive forever. MV3 service workers terminate when idle. Use `chrome.alarms` for periodic work.

**MV2:**
```js
// background.js — persistent, runs forever
let count = 0;

setInterval(() => {
  count++;
  console.log("Heartbeat", count);
  checkForUpdates();
}, 60000);
```

**MV3:**
```ts
// background.ts — event-driven, non-persistent
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("heartbeat", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "heartbeat") {
    // Retrieve persisted state — no in-memory globals survive termination
    const { count } = await chrome.storage.session.get({ count: 0 });
    await chrome.storage.session.set({ count: count + 1 });
    await checkForUpdates();
  }
});
```

> Full API reference: [Alarms API](../api-reference/alarms-api.md)

---

## 4. browser_action / page_action to action

MV3 merges `browser_action` and `page_action` into a single `action` key.

### Manifest

**MV2:**
```json
{
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png",
    "default_title": "My Extension"
  }
}
```

or

```json
{
  "page_action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```

**MV3:**
```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png",
    "default_title": "My Extension"
  }
}
```

---

## 5. chrome.browserAction to chrome.action

Every `chrome.browserAction.*` and `chrome.pageAction.*` call becomes `chrome.action.*`.

**MV2:**
```js
chrome.browserAction.setBadgeText({ text: "5" });
chrome.browserAction.setBadgeBackgroundColor({ color: "#FF0000" });
chrome.browserAction.setIcon({ path: "icon-active.png" });
chrome.browserAction.onClicked.addListener((tab) => {
  // handle click
});

chrome.pageAction.show(tabId);
```

**MV3:**
```ts
chrome.action.setBadgeText({ text: "5" });
chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
chrome.action.setIcon({ path: "icon-active.png" });
chrome.action.onClicked.addListener((tab) => {
  // handle click
});

// page_action show/hide equivalent
chrome.action.enable(tabId);
chrome.action.disable(tabId);
```

---

## 6. Callback-Based APIs to Promise-Based APIs

All `chrome.*` APIs return Promises in MV3. Callbacks still work but Promises with `async`/`await` are preferred.

**MV2:**
```js
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  chrome.tabs.sendMessage(tab.id, { type: "getData" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      return;
    }
    console.log(response);
  });
});
```

**MV3:**
```ts
try {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id!, { type: "getData" });
  console.log(response);
} catch (err) {
  console.error("Message failed:", err);
}
```

> Note: `chrome.runtime.onMessage` listeners that respond asynchronously must still return `true` to keep the message channel open, even in MV3.

---

## 7. chrome.extension.getURL to chrome.runtime.getURL

`chrome.extension.getURL` is removed in MV3.

**MV2:**
```js
const imageUrl = chrome.extension.getURL("images/icon.png");
const pageUrl = chrome.extension.getURL("options.html");
```

**MV3:**
```ts
const imageUrl = chrome.runtime.getURL("images/icon.png");
const pageUrl = chrome.runtime.getURL("options.html");
```

---

## 8. executeScript Changes

`chrome.tabs.executeScript` is replaced by `chrome.scripting.executeScript` with a different call signature. Add `"scripting"` to your `permissions`.

**MV2:**
```js
chrome.tabs.executeScript(tabId, {
  code: 'document.title',
}, (results) => {
  console.log(results[0]);
});

chrome.tabs.executeScript(tabId, {
  file: "content.js",
  allFrames: true,
});

chrome.tabs.insertCSS(tabId, {
  file: "styles.css",
});
```

**MV3:**
```ts
// manifest.json: add "scripting" to permissions
// Inline code uses a function, not a string
const results = await chrome.scripting.executeScript({
  target: { tabId },
  func: () => document.title,
});
console.log(results[0].result);

// File injection
await chrome.scripting.executeScript({
  target: { tabId, allFrames: true },
  files: ["content.js"],
});

// CSS injection moved to chrome.scripting too
await chrome.scripting.insertCSS({
  target: { tabId },
  files: ["styles.css"],
});
```

> Key differences:
> - `target` object instead of `tabId` as first argument
> - `func` (a real function) instead of `code` (a string) — no `eval`
> - `files` array instead of `file` string
> - Results are an array of `InjectionResult` objects with a `result` property

---

## 9. Content Security Policy Changes

MV3 uses an object format and disallows `unsafe-eval` and remote code.

### Manifest

**MV2:**
```json
{
  "content_security_policy": "script-src 'self' 'unsafe-eval' https://cdn.example.com; object-src 'self'"
}
```

**MV3:**
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Code Impact

**MV2:**
```js
// These all worked in MV2
eval("console.log('hello')");
new Function("return 1 + 2")();
setTimeout("alert('hi')", 100);
// Remote scripts in HTML:
// <script src="https://cdn.example.com/lib.js"></script>
```

**MV3:**
```ts
// None of the above are allowed. Instead:
// - Bundle all dependencies locally
// - Use function references, not strings
// - Use a sandboxed page if you absolutely need eval
setTimeout(() => {
  console.log("Use function references, not strings");
}, 100);
```

> Full details: [Content Security Policy (MV3)](../mv3/content-security-policy.md)

---

## 10. webRequest Blocking to declarativeNetRequest

Blocking web requests (modifying/canceling) now requires `declarativeNetRequest` with static or dynamic JSON rules. Observational (non-blocking) `webRequest` listeners are still available.

**MV2:**
```js
// manifest.json: "permissions": ["webRequest", "webRequestBlocking", "<all_urls>"]
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes("ads.example.com")) {
      return { cancel: true };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);
```

**MV3:**
```ts
// manifest.json:
// "permissions": ["declarativeNetRequest"],
// "declarative_net_request": { "rule_resources": [{ "id": "ruleset_1", "enabled": true, "path": "rules.json" }] }

// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "ads.example.com",
      "resourceTypes": ["script", "image", "sub_frame"]
    }
  }
]
```

For dynamic rules (added at runtime):

```ts
await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 100,
      priority: 1,
      action: { type: "block" as const },
      condition: {
        urlFilter: "tracker.example.com",
        resourceTypes: ["script" as const],
      },
    },
  ],
  removeRuleIds: [],
});
```

> Full details: [Declarative Net Request](../mv3/declarative-net-request.md)

---

## 11. localStorage in Background to chrome.storage.session

`localStorage` and `sessionStorage` are not available in service workers. Use `chrome.storage.session` for ephemeral data and `chrome.storage.local` for persistent data.

**MV2:**
```js
// background.js — had access to localStorage
localStorage.setItem("token", "abc123");
const token = localStorage.getItem("token");

// Also had in-memory globals that persisted (page never unloaded)
let cache = {};
```

**MV3:**
```ts
// chrome.storage.session — in-memory, persists across SW restarts but cleared on browser restart, extension reload/update/disable
await chrome.storage.session.set({ token: "abc123" });
const { token } = await chrome.storage.session.get("token");

// chrome.storage.local — persists across restarts
await chrome.storage.local.set({ preferences: { theme: "dark" } });
const { preferences } = await chrome.storage.local.get("preferences");
```

> Deep dive: [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md) | [Storage Changes (MV3)](../mv3/storage-changes.md)

---

## 12. setTimeout / setInterval to chrome.alarms

Timers are unreliable in service workers because the SW can terminate at any time. Use `chrome.alarms` for anything longer than a few seconds.

**MV2:**
```js
// These survived indefinitely in a persistent background page
setTimeout(() => {
  doDelayedWork();
}, 300000); // 5 minutes

setInterval(() => {
  pollServer();
}, 60000); // every minute
```

**MV3:**
```ts
// One-time delayed work
chrome.alarms.create("delayedWork", { delayInMinutes: 5 });

// Repeating work
chrome.alarms.create("pollServer", { periodInMinutes: 1 });

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case "delayedWork":
      doDelayedWork();
      break;
    case "pollServer":
      pollServer();
      break;
  }
});
```

> Note: Since Chrome 120, the minimum alarm period is 30 seconds (`periodInMinutes: 0.5`). Setting values lower than 0.5 will not be honored and will cause a warning. For shorter intervals, you can use `setTimeout` inside an active event handler, but it will not survive SW termination.

> Full API reference: [Alarms API](../api-reference/alarms-api.md)

---

## 13. Host Permissions

URL-based permissions move out of `permissions` and into `host_permissions`.

**MV2:**
```json
{
  "permissions": [
    "tabs",
    "storage",
    "https://*.example.com/*",
    "<all_urls>"
  ]
}
```

**MV3:**
```json
{
  "permissions": [
    "tabs",
    "storage"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ]
}
```

> Avoid `<all_urls>` in `host_permissions` when possible. Use `optional_host_permissions` and request at runtime with `@theluckystrike/webext-permissions`.

---

## 14. web_accessible_resources

The flat array is replaced by an array of objects that specify which origins can access each resource.

**MV2:**
```json
{
  "web_accessible_resources": [
    "images/icon.png",
    "inject.js",
    "styles.css"
  ]
}
```

**MV3:**
```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/icon.png", "styles.css"],
      "matches": ["https://*.example.com/*"]
    },
    {
      "resources": ["inject.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## 15. Typed Storage with @theluckystrike/webext-storage

Instead of migrating raw `localStorage` calls to raw `chrome.storage` calls, use `@theluckystrike/webext-storage` for a typed, schema-driven approach.

**MV2:**
```js
// Untyped, error-prone, scattered localStorage calls
localStorage.setItem("settings", JSON.stringify({ theme: "dark", fontSize: 14 }));
const raw = localStorage.getItem("settings");
const settings = raw ? JSON.parse(raw) : { theme: "light", fontSize: 12 };
```

**MV3:**
```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// Define schema with defaults once
const schema = defineSchema({
  settings: {
    theme: "light" as "light" | "dark",
    fontSize: 12,
  },
  token: "",
  onboardingDone: false,
});

const storage = createStorage(schema);

// Typed get — returns the correct type with defaults applied
const settings = await storage.get("settings");
// settings: { theme: "light" | "dark"; fontSize: number }

// Typed set — compiler catches invalid keys/values
await storage.set("settings", { theme: "dark", fontSize: 14 });

// Set multiple keys at once
await storage.setMany({
  token: "abc123",
  onboardingDone: true,
});

// Watch for changes reactively
storage.watch("settings", (newValue, oldValue) => {
  console.log("Settings changed:", oldValue, "->", newValue);
});

// Get everything
const all = await storage.getAll();

// Clean up
await storage.remove("token");
await storage.clear();
```

> Full API reference: [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)

---

## 16. Typed Messaging with @theluckystrike/webext-messaging

Instead of raw `chrome.runtime.sendMessage` with untyped payloads, use `@theluckystrike/webext-messaging` for type-safe, structured messaging.

**MV2:**
```js
// background.js — untyped listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getCount") {
    sendResponse({ count: 42 });
  } else if (msg.type === "increment") {
    // ...
    sendResponse({ ok: true });
  }
  return true; // keep channel open for async
});

// popup.js — untyped sender, easy to misspell msg.type
chrome.runtime.sendMessage({ type: "getCount" }, (response) => {
  console.log(response.count);
});
```

**MV3:**
```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

// Define your message contract
type Messages = {
  getCount: { request: void; response: { count: number } };
  increment: { request: { by: number }; response: { ok: boolean } };
};

const messenger = createMessenger<Messages>();

// background.ts — typed handler
messenger.onMessage("getCount", async () => {
  return { count: 42 };
});

messenger.onMessage("increment", async ({ by }) => {
  // by: number — fully typed
  return { ok: true };
});

// popup.ts — typed sender, autocomplete for message names and payloads
const { count } = await messenger.send("getCount");

// Send to a specific tab's content script
await messenger.sendTab(tabId, "increment", { by: 1 });
```

> Benefits over raw `sendMessage`:
> - Message names are autocompleted and typo-proof
> - Request and response types are enforced at compile time
> - No manual `return true` or `sendResponse` boilerplate
> - Works across background, popup, content scripts, and options pages

---

## Quick Reference Table

| MV2 | MV3 |
|-----|-----|
| `"manifest_version": 2` | `"manifest_version": 3` |
| `"background": { "scripts": [...] }` | `"background": { "service_worker": "..." }` |
| `"browser_action"` / `"page_action"` | `"action"` |
| `chrome.browserAction.*` | `chrome.action.*` |
| `chrome.extension.getURL()` | `chrome.runtime.getURL()` |
| `chrome.tabs.executeScript()` | `chrome.scripting.executeScript()` |
| `chrome.tabs.insertCSS()` | `chrome.scripting.insertCSS()` |
| `chrome.webRequest` (blocking) | `chrome.declarativeNetRequest` |
| `localStorage` (background) | `chrome.storage.session` / `chrome.storage.local` |
| `setTimeout` / `setInterval` | `chrome.alarms` |
| `"permissions": ["https://..."]` | `"host_permissions": ["https://..."]` |
| `"web_accessible_resources": [...]` | `"web_accessible_resources": [{ resources, matches }]` |
| `"content_security_policy": "..."` | `"content_security_policy": { "extension_pages": "..." }` |
| Callbacks | Promises / `async` `await` |
| `XMLHttpRequest` | `fetch()` |
| `chrome.extension.getBackgroundPage()` | Use messaging (`@theluckystrike/webext-messaging`) |

---

## Further Reading

- [Migration Checklist](../mv3/migration-checklist.md) — step-by-step task list
- [Service Workers (MV3)](../mv3/service-workers.md) — technical details
- [Service Worker Lifecycle](service-worker-lifecycle.md) — lifecycle deep dive
- [Action API](../mv3/action-api.md) — full action API reference
- [Promise-Based APIs](../mv3/promise-based-apis.md) — async patterns
- [Content Security Policy](../mv3/content-security-policy.md) — CSP rules
- [Declarative Net Request](../mv3/declarative-net-request.md) — network rules
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md) — storage patterns
- [Alarms API](../api-reference/alarms-api.md) — scheduling reference
