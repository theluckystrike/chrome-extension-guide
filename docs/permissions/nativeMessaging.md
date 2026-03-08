---
title: "nativeMessaging Permission"
description: "- **Permission string:** `"nativeMessaging"` - Enables communication between extension and native applications - Two modes: **connection-based** (persistent) and **message-based** (one-shot)"
permalink: /permissions/nativeMessaging/
category: permissions
order: 25
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/nativeMessaging/"
---

# nativeMessaging Permission

## Overview {#overview}
- **Permission string:** `"nativeMessaging"`
- Enables communication between extension and native applications
- Two modes: **connection-based** (persistent) and **message-based** (one-shot)

## Manifest Declaration {#manifest-declaration}
```json
{ "permissions": ["nativeMessaging"] }
```

**User warning:** "Communicate with cooperating native applications"

## API Methods {#api-methods}

### Persistent Connection {#persistent-connection}
`chrome.runtime.connectNative(hostName)` returns Port for persistent connection.

**Port Methods:** `Port.postMessage(msg)`, `Port.onMessage`, `Port.onDisconnect`

```typescript
const port = chrome.runtime.connectNative('com.example.myhost');
port.onMessage.addListener((msg) => console.log('From native:', msg));
port.onDisconnect.addListener(() => {
  if (chrome.runtime.lastError) console.error('Disconnect:', chrome.runtime.lastError.message);
});
port.postMessage({ action: 'startMonitoring' });
```

### One-Shot Messages {#one-shot-messages}
`chrome.runtime.sendNativeMessage(hostName, message)` — single request/response.

```typescript
const response = await chrome.runtime.sendNativeMessage('com.example.myhost', {
  action: 'getVersion'
});
console.log(response.version);
```

## Native Messaging Host Setup {#native-messaging-host-setup}

### Host Manifest (JSON) {#host-manifest-json}
```json
{
  "name": "com.example.myhost",
  "description": "My native messaging host",
  "path": "/path/to/native/app",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://abcdef.../"]
}
```

### Registration by OS {#registration-by-os}
| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.example.myhost.json` |
| Linux | `~/.config/google-chrome/NativeMessagingHosts/com.example.myhost.json` |
| Windows | Registry: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.example.myhost` |

## Message Format {#message-format}
- 32-bit message length prefix (native byte order) + UTF-8 JSON payload
- Maximum: 1 MB incoming, 4 GB outgoing from host
- Host reads from stdin, writes to stdout

## Native Host Example (Python) {#native-host-example-python}
```python
import struct, sys, json

def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length: return None
    length = struct.unpack('=I', raw_length)[0]
    return json.loads(sys.stdin.buffer.read(length))

def send_message(msg):
    encoded = json.dumps(msg).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('=I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

while (msg := read_message()):
    if msg.get('action') == 'getVersion':
        send_message({'version': '1.0.0'})
```

## Use Cases {#use-cases}
- File system access beyond browser sandbox
- Native app integration (password managers, VPNs)
- Hardware access (USB, Bluetooth via native helper)
- System services and legacy app bridges

## Security Considerations {#security-considerations}
- `allowed_origins` must list specific extension IDs only
- Host app path must be absolute
- Validate all messages in both directions
- Host process runs with user privileges

## Code Examples {#code-examples}

### One-Shot Message Pattern {#one-shot-message-pattern}
```typescript
async function sendNativeMessage(hostName: string, message: object) {
  try {
    return await chrome.runtime.sendNativeMessage(hostName, message);
  } catch (error) {
    console.error('Native message failed:', error);
    throw error;
  }
}
const version = await sendNativeMessage('com.example.myhost', { action: 'getVersion' });
```

### Persistent Connection with Reconnect {#persistent-connection-with-reconnect}
```typescript
class NativeHostConnection {
  private port: chrome.runtime.Port | null = null;
  private attempts = 0;
  constructor(private hostName: string) {}

  connect(): void {
    this.port = chrome.runtime.connectNative(this.hostName);
    this.port.onMessage.addListener((msg) => console.log('Received:', msg));
    this.port.onDisconnect.addListener(() => {
      this.port = null;
      if (this.attempts++ < 3) setTimeout(() => this.connect(), 1000 * this.attempts);
    });
  }

  send(message: object): void { this.port?.postMessage(message); }
}
```

### Error Handling {#error-handling}
```typescript
chrome.runtime.connectNative('com.example.myhost', (port) => {
  if (chrome.runtime.lastError) {
    const err = chrome.runtime.lastError.message;
    if (err.includes('not found')) console.error('Host not installed');
    else if (err.includes('exited')) console.error('Host crashed');
    else if (err.includes('forbidden')) console.error('Check allowed_origins');
    return;
  }
  port.onMessage.addListener(handleMessage);
});
```

## Common Errors {#common-errors}
- "Native host has exited" — host crashed or wrong path
- "Specified native messaging host not found" — manifest location incorrect
- "Access to the specified native messaging host is forbidden" — extension ID not in `allowed_origins`

## Cross-References {#cross-references}
- Related: `docs/reference/message-passing-patterns.md`
