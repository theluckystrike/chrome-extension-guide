---
layout: default
title: "Chrome Extension Extension Inter Process — Best Practices"
description: "Implement inter-process communication patterns between extension components like popups, background scripts, and content scripts."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/extension-inter-process/"
---

# Extension Inter-Process Communication Patterns

This document covers communication between Chrome Extensions and external applications, including native messaging and cross-extension communication.

## Native Messaging: Connecting to Local Applications

Chrome Extensions can communicate with native applications installed on the user's computer using the Native Messaging API. This enables extensions to access system-level capabilities that aren't available through web APIs.

### Setting Up Native Messaging

**1. Host Manifest File**

Create a JSON manifest file (e.g., `myhost.json`) in a designated directory:

```json
{
  "name": "my_native_app",
  "description": "My Native Application",
  "path": "/path/to/native/app",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://extension-id/"]
}
```

**2. Register in Windows Registry / macOS/Linux**

- **Windows**: Add to `HKEY_CURRENT_USER\Software\Google\Chrome\Extensions\extension-id\`
- **macOS**: Add to `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
- **Linux**: Add to `~/.config/google-chrome/NativeMessagingHosts/`

### Using connectNative()

```javascript
// In your extension's background script
const port = chrome.runtime.connectNative("my_native_app");

port.onMessage.addListener((message) => {
  console.log("Received from native app:", message);
});

port.postMessage({ action: "getSystemInfo" });

port.onDisconnect.addListener(() => {
  console.log("Disconnected from native app");
});
```

### JSON STDIO Protocol

Native apps communicate via stdin/stdout using JSON messages:

```python
# Example Python native host
import sys
import json

while True:
    line = sys.stdin.readline()
    if not line:
        break
    
    message = json.loads(line)
    # Process message and send response
    response = {"result": "success", "data": "example"}
    sys.stdout.write(json.dumps(response) + "\n")
    sys.stdout.flush()
```

### Use Cases

- **Filesystem Access**: Read/write files beyond web accessible resources
- **Hardware Access**: Interact with serial ports, USB devices, printers
- **System APIs**: Access system notifications, clipboard, system info
- **Legacy Integration**: Connect to existing desktop applications

## Cross-Extension Messaging

Extensions can communicate with other extensions using `extensionId`.

### Sending Messages to Another Extension

```javascript
// In your extension
const extensionId = "abcdefghijklmnopqrstuvwxyz012345";

chrome.runtime.sendMessage(extensionId, {
  type: "DATA_REQUEST",
  payload: { key: "value" }
}, (response) => {
  console.log("Response:", response);
});
```

### Receiving Messages from Other Extensions

```javascript
// In the receiving extension's background script
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (sender.id === "known-extension-id") {
      // Process message
      sendResponse({ status: "received", data: "processed" });
    }
    return true; // Keep channel open for async response
  }
);
```

### Extension ID Discovery

Extensions must know each other's IDs. Share IDs through:
- Documentation or configuration files
- Manifest's `externally_connectable` field

## Communicating with Web Pages

Use `externally_connectable` in manifest.json to allow web pages to connect:

```json
{
  "name": "My Extension",
  "externally_connectable": {
    "matches": ["https://example.com/*"],
    "ids": ["*"]
  }
}
```

### Web Page to Extension

```javascript
// From a web page
const extensionId = "abcdefghijklmnopqrstuvwxyz012345";

chrome.runtime.sendMessage(extensionId, {
  action: "fetchData",
  url: "https://api.example.com/data"
}, (response) => {
  console.log("Extension response:", response);
});
```

## Debugging Native Messaging

### Chrome Logs

- **Windows**: `chrome://net-internals/#native-io`
- Enable logging via `--enable-logging --v=1` flag

### Common Issues

1. **Manifest Not Found**: Verify correct installation location
2. **Permission Denied**: Ensure native app has execute permissions
3. **JSON Parse Error**: Validate message format (newlines matter)
4. **Timeout**: Native app may be unresponsive or crashed

### Testing Native App

```bash
# Test manually (pipe JSON through stdin)
echo '{"action": "test"}' | ./native_app
```

## Security Considerations

- Validate all messages from native apps and external extensions
- Limit `allowed_origins` to specific extension IDs
- Use HTTPS for web page connections
- Sanitize data before passing to web pages or other extensions

## Related Patterns

- [Native Messaging](./native-messaging.md) - Detailed native messaging guide
- [Permissions: nativeMessaging](../permissions/nativeMessaging.md) - Permission configuration
- [Extension-to-Extension](./extension-to-extension.md) - Advanced cross-extension patterns

## See Also

- [Chrome Native Messaging Documentation](https://developer.chrome.com/docs/apps/nativeMessaging)
- [externally_connectable](https://developer.chrome.com/docs/extensions/mv3/manifest/externally_connectable/)
