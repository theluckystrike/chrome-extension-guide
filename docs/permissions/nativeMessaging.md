# nativeMessaging Permission

## What It Grants
Access to `chrome.runtime.connectNative()` and `chrome.runtime.sendNativeMessage()` for communicating with native applications installed on the user's machine.

## Manifest
```json
{
  "permissions": ["nativeMessaging"]
}
```

## User Warning
"Communicate with cooperating native applications"

## API Access

### One-Time Messages
```typescript
const response = await chrome.runtime.sendNativeMessage('com.example.myhost', {
  action: 'getVersion'
});
console.log(response.version);
```

### Long-Lived Connections
```typescript
const port = chrome.runtime.connectNative('com.example.myhost');

port.onMessage.addListener((msg) => {
  console.log('From native:', msg);
});

port.onDisconnect.addListener(() => {
  if (chrome.runtime.lastError) {
    console.error('Disconnect:', chrome.runtime.lastError.message);
  }
});

port.postMessage({ action: 'startMonitoring' });
```

## Native Host Manifest
The native app must register a JSON manifest:
```json
{
  "name": "com.example.myhost",
  "description": "My Native Host",
  "path": "/usr/local/bin/my-native-host",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://abcdefghijklmnopqrstuvwxyz123456/"
  ]
}
```

### Host Manifest Location
| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.example.myhost.json` |
| Linux | `~/.config/google-chrome/NativeMessagingHosts/com.example.myhost.json` |
| Windows | Registry: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.example.myhost` → path to JSON |

## Message Format
- Messages serialized as JSON
- 32-bit (4-byte) length prefix in native byte order
- Max size: 1 MB (native → extension), 4 GB (extension → native)
- Native host reads stdin, writes stdout

## Native Host Example (Python)
```python
import struct, sys, json

def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    length = struct.unpack('=I', raw_length)[0]
    return json.loads(sys.stdin.buffer.read(length))

def send_message(msg):
    encoded = json.dumps(msg).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('=I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

while True:
    msg = read_message()
    if msg is None:
        break
    if msg.get('action') == 'getVersion':
        send_message({'version': '1.0.0'})
```

## Use Cases
- File system access (read/write local files)
- Hardware integration (USB, serial, Bluetooth)
- Password manager integration
- Native app launcher
- System-level operations

## Messaging Integration
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  NATIVE_CMD: { request: { command: string }; response: { result: string } };
};
const m = createMessenger<Messages>();

m.onMessage('NATIVE_CMD', async ({ command }) => {
  const res = await chrome.runtime.sendNativeMessage('com.example.myhost', { command });
  return { result: res.output };
});
```

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('nativeMessaging');
```

## Common Errors
- "Native host has exited" — host crashed or path wrong
- "Specified native messaging host not found" — manifest not in correct location
- "Access to the specified native messaging host is forbidden" — extension ID not in `allowed_origins`

## Cross-References
- Related: `docs/guides/extension-architecture.md`
