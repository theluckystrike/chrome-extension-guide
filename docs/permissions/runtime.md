---
layout: default
title: "chrome.runtime API Reference"
description: "The API provides extension information and utilities for messaging, lifecycle management, and resource handling.. always available."
permalink: /permissions/runtime/
category: permissions
order: 34
canonical_url: "https://bestchromeextensions.com/permissions/runtime/"
---

# chrome.runtime API Reference

The `chrome.runtime` API provides extension information and utilities for messaging, lifecycle management, and resource handling. No permissions required. always available.

Availability {#availability}

Available in Service Workers, Content Scripts, Popup, and Options pages without any manifest permissions.

Key Properties {#key-properties}

chrome.runtime.id {#chromeruntimeid}
Unique extension ID.
```javascript
console.log(chrome.runtime.id);
```

chrome.runtime.lastError {#chromeruntimelasterror}
Check in callbacks for errors.
```javascript
chrome.runtime.sendMessage({ msg: "hello" }, () => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
  }
});
```

chrome.runtime.getURL(path) {#chromeruntimegeturlpath}
Convert relative path to full URL.
```javascript
const iconUrl = chrome.runtime.getURL("images/icon.png");
```

chrome.runtime.getManifest() {#chromeruntimegetmanifest}
Returns parsed manifest.json.
```javascript
const version = chrome.runtime.getManifest().version;
```

Messaging API {#messaging-api}

chrome.runtime.sendMessage {#chromeruntimesendmessage}
Send messages between extension contexts.
```javascript
chrome.runtime.sendMessage({ action: "fetchData" }, (response) => {
  console.log(response);
});

// To another extension
chrome.runtime.sendMessage(extensionId, { action: "ping" });
```

chrome.runtime.onMessage {#chromeruntimeonmessage}
Listen for messages.
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetchData") {
    sendResponse({ data: "example" });
  }
  return true; // async response
});
```

runtime.sendMessage vs tabs.sendMessage {#runtimesendmessage-vs-tabssendmessage}
| API | Target | Permission |
|-----|--------|------------|
| runtime.sendMessage | Any context | None |
| tabs.sendMessage | Specific tab | `"tabs"` |

Connection API {#connection-api}

chrome.runtime.connect / onConnect {#chromeruntimeconnect-onconnect}
Long-lived connection between contexts.
```javascript
// Popup
const port = chrome.runtime.connect({ name: "channel" });
port.postMessage({ greeting: "hello" });

// Background
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => console.log(msg));
});
```

Extension Events {#extension-events}

chrome.runtime.onInstalled {#chromeruntimeoninstalled}
First install or update.
```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") console.log("First install");
  if (details.reason === "update") console.log(`Updated from ${details.previousVersion}`);
});
```

chrome.runtime.onStartup {#chromeruntimeonstartup}
Profile with extension starts.
```javascript
chrome.runtime.onStartup.addListener(() => console.log("Started"));
```

Other Events {#other-events}
- `onUpdateAvailable`. Update ready but not downloaded
- `onSuspend`. Service worker suspending
- `onMessageExternal`. Message from another extension
- `onConnectExternal`. Connection from another extension

Extension Lifecycle {#extension-lifecycle}
1. Install: `onInstalled` reason `"install"`
2. Update: `onInstalled` reason `"update"`
3. Enable: `onStartup` fires
4. Disable: Use `chrome.management` API

Communication Between Extensions {#communication-between-extensions}
```javascript
// Send to another extension
chrome.runtime.sendMessage("target-id", { action: "ping" });

// Receive external messages
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  sendResponse({ pong: true });
});
```

@theluckystrike/webext-messaging {#theluckystrikewebext-messaging}
Wrapper with type-safe schemas and promise API.
```javascript
import { createMessenger } from "@theluckystrike/webext-messaging";
const messenger = createMessenger({ context: "background" });
const response = await messenger.send("fetchData");
```

Best Practices {#best-practices}
1. Always check `chrome.runtime.lastError` in callbacks
2. Use connection ports for long-lived communication
3. Validate `sender.id` for external messages
4. Use `getURL` instead of hardcoded URLs

Related {#related}
- [Message Passing Patterns](../reference/message-passing-patterns.md)
- [chrome.tabs API](./tabs.md)
- [chrome.management API](./management.md)

Frequently Asked Questions

What is the runtime API used for?
chrome.runtime provides messaging between parts of your extension, access to manifest info, and lifecycle events.

How do I detect extension updates?
Use chrome.runtime.onUpdateAvailable to detect when a new version is available, and chrome.runtime.reload() to update.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
