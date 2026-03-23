---
layout: default
title: "Chrome Extension Promise Based Apis — Manifest V3 Guide"
description: "Master promise-based APIs in Manifest V3 for asynchronous operations."
canonical_url: "https://bestchromeextensions.com/mv3/promise-based-apis/"
---

# Promise-Based APIs in MV3

A comprehensive guide to migrating from callback-based Chrome extension APIs to promise-based patterns in Manifest V3.

## Overview {#overview}

In Manifest V3, most `chrome.*` APIs now return Promises when no callback is provided. This represents a significant shift from the callback-based pattern used in Manifest V2, bringing Chrome extension APIs in line with modern JavaScript async/await patterns.

**Key change**: When you omit the callback parameter, Chrome APIs return a Promise instead of requiring you to pass a callback function. You cannot use both on the same function call -- if you pass a callback, the function will not return a promise.

```js
// MV2 (callback-based)
chrome.storage.local.get("count", (result) => {
  console.log(result.count);
});

// MV3 (promise-based)
const result = await chrome.storage.local.get("count");
console.log(result.count);
```

## The Change: Before/After Code {#the-change-beforeafter-code}

### Storage API {#storage-api}

**Before (MV2 with callbacks):**
```js
chrome.storage.local.get("settings", (result) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }
  console.log(result.settings);
});
```

**After (MV3 with promises):**
```js
try {
  const result = await chrome.storage.local.get("settings");
  console.log(result.settings);
} catch (error) {
  console.error(error);
}
```

### Tabs API {#tabs-api}

**Before (MV2 with callbacks):**
```js
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }
  const tab = tabs[0];
  chrome.tabs.update(tab.id, { url: "https://example.com" }, () => {
    // Tab updated
  });
});
```

**After (MV3 with promises):**
```js
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
await chrome.tabs.update(tab.id, { url: "https://example.com" });
```

### Downloads API {#downloads-api}

**Before (MV2 with callbacks):**
```js
chrome.downloads.download({
  url: "https://example.com/file.pdf",
  filename: "file.pdf"
}, (downloadId) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }
  console.log("Download started:", downloadId);
});
```

**After (MV3 with promises):**
```js
const downloadId = await chrome.downloads.download({
  url: "https://example.com/file.pdf",
  filename: "file.pdf"
});
console.log("Download started:", downloadId);
```

## APIs That Return Promises {#apis-that-return-promises}

The following Chrome APIs return Promises in MV3 when the callback is omitted:

| API | Method | Return Type |
|-----|--------|-------------|
| **tabs** | `create()`, `update()`, `remove()`, `reload()`, `goBack()`, `goForward()`, `captureVisibleTab()`, `query()`, `get()`, `highlight()` | `Promise<Tab>` / `Promise<number>` / `Promise<Tab[]>` |
| **storage** | `get()`, `set()`, `remove()`, `clear()` | `Promise<{[key: string]: any}>` |
| **permissions** | `contains()`, `request()`, `remove()` | `Promise<boolean>` |
| **scripting** | `executeScript()`, `insertCSS()`, `removeCSS()`, `getRegisteredContentScripts()` | `Promise<InjectionResult[]>` / `Promise<ContentScriptInfo[]>` |
| **action** | `setBadgeText()`, `setBadgeBackgroundColor()`, `setTitle()`, `setIcon()`, `setPopup()`, `openPopup()` | `Promise<void>` |
| **alarms** | `create()`, `get()`, `getAll()`, `clear()`, `clearAll()` | `Promise<Alarm>` / `Promise<Alarm[]>` |
| **cookies** | `get()`, `getAll()`, `set()`, `remove()`, `getCookieStore()` | `Promise<Cookie>` / `Promise<Cookie[]>` |
| **downloads** | `download()`, `search()`, `pause()`, `resume()`, `cancel()`, `erase()`, `open()`, `show()`, `showDefaultFolder()` | `Promise<number>` / `Promise<void>` |
| **notifications** | `create()`, `update()`, `clear()` | `Promise<string>` / `Promise<boolean>` |
| **contextMenus** | `update()`, `remove()`, `removeAll()` (Chrome 123+) | `Promise<void>` |
| **runtime** | `sendMessage()`, `sendNativeMessage()` | `Promise<any>` |

## APIs Still Using Callbacks {#apis-still-using-callbacks}

Not all Chrome APIs have been converted to return Promises. These APIs still require callback patterns:

| API | Reason |
|-----|--------|
| **runtime.onMessage** | Event listeners cannot return promises; they must handle messages synchronously |
| **webRequest** | High-performance event API requiring synchronous blocking |
| **storage.onChanged** | Event listener for storage changes |
| **tabs.onUpdated** | Event listener for tab updates |
| **windows.onFocusChanged** | Event listener for window focus changes |

### Handling Event Listeners (Still Callback-Based) {#handling-event-listeners-still-callback-based}

Event listeners continue to use callbacks because they respond to events asynchronously:

```js
// This still uses callbacks - cannot be promise-based
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_DATA") {
    const data = getData();
    sendResponse({ data });
  }
  return true; // Keep message channel open for async response
});
```

## How @theluckystrike/webext-storage Handles This {#how-theluckystrikewebext-storage-handles-this}

The `@theluckystrike/webext-storage` library provides a promise-based interface that works seamlessly with MV3:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// Define your schema
const schema = defineSchema({
  count: { type: "number", default: 0 },
  settings: {
    type: "object",
    properties: {
      theme: { type: "string", default: "light" },
      notifications: { type: "boolean", default: true }
    },
    default: { theme: "light", notifications: true }
  }
});

// Create storage instance
const storage = createStorage({ schema });

// Always async/await - works in MV3
const count = await storage.get("count");
console.log(count); // 0 (or stored value)

// Set values
await storage.set("count", count + 1);

// Remove values
await storage.remove("count");
```

**Benefits:**
- Fully promise-based API
- TypeScript support with auto-completion
- Schema validation built-in
- Works across all contexts (popup, background, content scripts)

## How @theluckystrike/webext-messaging Handles This {#how-theluckystrikewebext-messaging-handles-this}

The `@theluckystrike/webext-messaging` library wraps callback-based message passing into clean promises:

```ts
import { createMessenger, MessagingError } from "@theluckystrike/webext-messaging";

// Define your message types
interface Messages = {
  getData: { key: string };
  setData: { key: string; value: any };
  getDataResponse: { value: any };
};

// Create messenger instance
const msg = createMessenger<Messages>();

// Send message and wait for response - automatically returns a promise
const data = await msg.send("getData", { key: "myKey" });
console.log(data.value);

// Error handling with MessagingError
try {
  const result = await msg.send("getData", { key: "myKey" });
} catch (error) {
  if (error instanceof MessagingError) {
    console.error("Messaging error:", error.message);
  }
}
```

**Benefits:**
- Promise-based send/receive pattern
- Type-safe message definitions
- Automatic error propagation
- Cross-context communication made simple

## How @theluckystrike/webext-permissions Handles This {#how-theluckystrikewebext-permissions-handles-this}

The `@theluckystrike/webext-permissions` library wraps `chrome.permissions` callbacks into promises:

```ts
import { checkPermission, requestPermission, removePermission } from "@theluckystrike/webext-permissions";

// Check if a permission is granted
const hasTabs = await checkPermission("tabs");
console.log("Has tabs permission:", hasTabs);

// Check multiple permissions
const hasAll = await checkPermission(["tabs", "storage", "activeTab"]);

// Request a permission
const granted = await requestPermission("tabs");
if (granted) {
  console.log("Tabs permission granted!");
}

// Remove a permission
await removePermission("tabs");
```

**Benefits:**
- Clean promise-based API
- Supports single and multiple permission checks
- Works with all permission types (host permissions, API permissions)
- TypeScript support

## Migration Patterns {#migration-patterns}

### Pattern 1: Callback to Await {#pattern-1-callback-to-await}

Transform callback-based code to async/await:

```js
// ❌ MV2 style
function getSettings(callback) {
  chrome.storage.local.get("settings", (result) => {
    callback(result.settings);
  });
}

// ✅ MV3 style
async function getSettings() {
  const result = await chrome.storage.local.get("settings");
  return result.settings;
}
```

### Pattern 2: Error Handling (lastError to try/catch) {#pattern-2-error-handling-lasterror-to-trycatch}

When using promise-based calls, errors become rejected promises instead of requiring `chrome.runtime.lastError` checks (though `lastError` still exists for callback-based usage):

```js
// ❌ MV2 style
chrome.storage.local.get("key", (result) => {
  if (chrome.runtime.lastError) {
    console.error("Error:", chrome.runtime.lastError.message);
    return;
  }
  // Success
});

// ✅ MV3 style
try {
  const result = await chrome.storage.local.get("key");
  // Success
} catch (error) {
  console.error("Error:", error.message);
}
```

### Pattern 3: Parallel Requests with Promise.all {#pattern-3-parallel-requests-with-promiseall}

Execute multiple async operations in parallel:

```js
// ❌ MV2 style (nested callbacks)
chrome.storage.local.get("key1", (result1) => {
  chrome.storage.local.get("key2", (result2) => {
    chrome.storage.local.get("key3", (result3) => {
      // All done
    });
  });
});

// ✅ MV3 style (parallel execution)
const [result1, result2, result3] = await Promise.all([
  chrome.storage.local.get("key1"),
  chrome.storage.local.get("key2"),
  chrome.storage.local.get("key3")
]);
```

### Pattern 4: Using @theluckystrike Packages {#pattern-4-using-theluckystrike-packages}

Leverage the libraries for consistent promise-based APIs:

```ts
import { createStorage } from "@theluckystrike/webext-storage";
import { createMessenger } from "@theluckystrike/webext-messaging";
import { checkPermission, requestPermission } from "@theluckystrike/webext-permissions";

const storage = createStorage({ schema: {} });
const messenger = createMessenger();

// Storage - always promise-based
await storage.set("user", { name: "John" });

// Messaging - promise-based
await messenger.send("updateUser", { name: "John" });

// Permissions - promise-based
const granted = await requestPermission("storage");
```

## chrome.runtime.lastError {#chromeruntimelasterror}

In MV2, `chrome.runtime.lastError` was checked after every async API call. In MV3, when using promise-based calls (omitting the callback), errors are thrown as rejected Promises. Note: `chrome.runtime.lastError` still works when callbacks are used, but `chrome.extension.lastError` is deprecated.

```js
// ❌ MV2 - checking lastError
chrome.tabs.create({ url: "https://example.com" }, (tab) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    return;
  }
  console.log("Tab created:", tab.id);
});

// ✅ MV3 - try/catch
try {
  const tab = await chrome.tabs.create({ url: "https://example.com" });
  console.log("Tab created:", tab.id);
} catch (error) {
  console.error("Error creating tab:", error.message);
}
```

**Common errors:**
- `"Permission denied"`: Missing required permission
- `"No tab with id"`: Tab no longer exists
- `"Extension context invalidated"`: Extension reloaded

## TypeScript Setup {#typescript-setup}

For full TypeScript support with Chrome APIs, use the `chrome-types` package:

```bash
npm install -D chrome-types
```

Then add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["chrome-types"]
  }
}
```

This provides full type definitions for all Chrome APIs including promise return types:

```ts
// Full autocomplete and type checking
const tab = await chrome.tabs.create({ url: "https://example.com" });
tab.id;       // number | undefined
tab.url;      // string | undefined
tab.title;    // string | undefined
```

### TypeScript with @theluckystrike Packages {#typescript-with-theluckystrike-packages}

```ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

// Define schema with full type safety
const schema = defineSchema({
  user: {
    type: "object",
    properties: {
      id: { type: "number" },
      name: { type: "string" },
      email: { type: "string" }
    },
    required: ["id", "name"],
    default: { id: 0, name: "", email: "" }
  }
});

const storage = createStorage({ schema });

// Type-safe get
const user = await storage.get("user");
// user is typed as { id: number; name: string; email: string }
```

## Gotchas {#gotchas}

### 1. Not All APIs Are Promisified {#1-not-all-apis-are-promisified}

Some APIs still require callbacks:
```js
// Still uses callback
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // ...
});
```

### 2. contextMenus.create Does NOT Return a Promise {#2-contextmenuscreate-does-not-return-a-promise}

```js
// ⚠️ create() returns number|string synchronously, NOT a promise
const menuId = chrome.contextMenus.create({
  title: "My Menu",
  contexts: ["selection"]
});
// Use the optional callback parameter for error handling
// Note: update(), remove(), and removeAll() DO return promises (Chrome 123+)
```

### 3. Always Use try/catch {#3-always-use-trycatch}

Unhandled promise rejections in service workers can crash your extension:

```js
// ❌ Dangerous - unhandled rejection can crash SW
const result = await chrome.storage.local.get("key");

// ✅ Safe - always wrap in try/catch
try {
  const result = await chrome.storage.local.get("key");
} catch (error) {
  console.error("Storage error:", error);
}
```

### 4. Unhandled Rejections Crash Service Workers {#4-unhandled-rejections-crash-service-workers}

In MV3 background service workers, unhandled promise rejections terminate the worker:

```js
// ❌ This can crash the service worker
chrome.storage.local.get("nonexistent");

// ✅ Always handle
async function safeGet(key) {
  try {
    return await chrome.storage.local.get(key);
  } catch {
    return null;
  }
}
```

### 5. Event Listeners Cannot Be Async {#5-event-listeners-cannot-be-async}

```js
// ❌ Invalid - event listeners can't return promises
chrome.runtime.onMessage.addListener(async (message) => {
  const data = await fetchData(); // This won't work properly
  return data;
});

// ✅ Correct - handle async internally
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then(data => sendResponse(data));
  return true; // Keep channel open for async response
});
```

## Migration Checklist {#migration-checklist}

- [ ] Replace callback-based storage calls with `await`/`async`
- [ ] Replace `chrome.runtime.lastError` checks with `try`/`catch` blocks
- [ ] Install and configure `chrome-types` for TypeScript
- [ ] Install `@theluckystrike/webext-storage` for type-safe storage
- [ ] Install `@theluckystrike/webext-messaging` for promise-based messaging
- [ ] Install `@theluckystrike/webext-permissions` for promise-based permissions
- [ ] Convert nested callbacks to `Promise.all()` for parallel operations
- [ ] Add global error handlers for unhandled rejections
- [ ] Test service worker for crash-free operation
- [ ] Verify all event listeners follow the `return true` pattern for async responses
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
