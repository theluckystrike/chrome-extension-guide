---
title: "chrome.runtime API Reference"
description: "The `chrome.runtime` API provides extension information and utilities for messaging, lifecycle management, and resource handling. **No permissions required** — always available."
permalink: /permissions/runtime/
category: permissions
order: 34
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/runtime/"
---

# chrome.runtime API Reference

The `chrome.runtime` API provides extension information and utilities for messaging, lifecycle management, and resource handling. **No permissions required** — always available.

## Availability

Available in Service Workers, Content Scripts, Popup, and Options pages without any manifest permissions.

## Key Properties

### chrome.runtime.id
Unique extension ID.
```javascript
console.log(chrome.runtime.id);
```

### chrome.runtime.lastError
Check in callbacks for errors.
```javascript
chrome.runtime.sendMessage({ msg: "hello" }, () => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
  }
});
```

### chrome.runtime.getURL(path)
Convert relative path to full URL.
```javascript
const iconUrl = chrome.runtime.getURL("images/icon.png");
```

### chrome.runtime.getManifest()
Returns parsed manifest.json.
```javascript
const version = chrome.runtime.getManifest().version;
```

## Messaging API

### chrome.runtime.sendMessage
Send messages between extension contexts.
```javascript
chrome.runtime.sendMessage({ action: "fetchData" }, (response) => {
  console.log(response);
});

// To another extension
chrome.runtime.sendMessage(extensionId, { action: "ping" });
```

### chrome.runtime.onMessage
Listen for messages.
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetchData") {
    sendResponse({ data: "example" });
  }
  return true; // async response
});
```

### runtime.sendMessage vs tabs.sendMessage
| API | Target | Permission |
|-----|--------|------------|
| runtime.sendMessage | Any context | None |
| tabs.sendMessage | Specific tab | `"tabs"` |

## Connection API

### chrome.runtime.connect / onConnect
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

## Extension Events

### chrome.runtime.onInstalled
First install or update.
```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") console.log("First install");
  if (details.reason === "update") console.log(`Updated from ${details.previousVersion}`);
});
```

### chrome.runtime.onStartup
Profile with extension starts.
```javascript
chrome.runtime.onStartup.addListener(() => console.log("Started"));
```

### Other Events
- `onUpdateAvailable` — Update ready but not downloaded
- `onSuspend` — Service worker suspending
- `onMessageExternal` — Message from another extension
- `onConnectExternal` — Connection from another extension

## Extension Lifecycle
1. **Install**: `onInstalled` reason `"install"`
2. **Update**: `onInstalled` reason `"update"`
3. **Enable**: `onStartup` fires
4. **Disable**: Use `chrome.management` API

## Communication Between Extensions
```javascript
// Send to another extension
chrome.runtime.sendMessage("target-id", { action: "ping" });

// Receive external messages
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  sendResponse({ pong: true });
});
```

## @theluckystrike/webext-messaging
Wrapper with type-safe schemas and promise API.
```javascript
import { createMessenger } from "@theluckystrike/webext-messaging";
const messenger = createMessenger({ context: "background" });
const response = await messenger.send("fetchData");
```

## Best Practices
1. Always check `chrome.runtime.lastError` in callbacks
2. Use connection ports for long-lived communication
3. Validate `sender.id` for external messages
4. Use `getURL` instead of hardcoded URLs

## Related
- [Message Passing Patterns](../reference/message-passing-patterns.md)
- [chrome.tabs API](./tabs.md)
- [chrome.management API](./management.md)
