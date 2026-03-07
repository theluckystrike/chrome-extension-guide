# Chrome Extension Native Messaging

Native messaging allows Chrome Extensions to communicate with native applications installed on the user's computer. This powerful feature enables extensions to access system resources, hardware, and perform operations that web APIs cannot handle.

## Architecture Overview

Native messaging creates a bi-directional communication channel between a Chrome Extension and a native host application. The communication occurs through standard input (stdin) and standard output (stdout) using JSON messages.

```
┌─────────────────────┐     ┌─────────────────────┐
│  Chrome Extension   │     │  Native Host App    │
│                     │     │                     │
│  ┌───────────────┐  │     │  ┌───────────────┐  │
│  │  JavaScript   │◄─┼────►│  │  Python/Node/ │  │
│  │    Code       │  │     │  │  Rust/C++     │  │
│  └───────────────┘  │     │  └───────────────┘  │
└─────────────────────┘     └─────────────────────┘
         │                          │
         │    stdin/stdout         │
         │    (JSON messages)      │
         ▼                          ▼
```

## Host Application Manifest

The native host application must provide a manifest file describing its configuration. This manifest tells Chrome how to connect to the native application.

### Manifest Structure (nativeMessaging.json)

```json
{
  "name": "com.example.myapp",
  "description": "My Native Messaging Host",
  "path": "/path/to/native/host",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://[extension-id]/"
  ]
}
```

| Property | Description |
|----------|-------------|
| `name` | Unique identifier for the native host |
| `path` | Path to the executable (Windows: .exe, Mac/Linux: executable) |
| `type` | Must be "stdio" for standard input/output communication |
| `allowed_origins` | List of extensions allowed to connect |

## Chrome Extension API

### Persistent Connection: chrome.runtime.connectNative

Use `connectNative` for ongoing communication where multiple messages are exchanged.

```javascript
// In your extension's background script
const port = chrome.runtime.connectNative('com.example.myapp');

port.onMessage.addListener((message) => {
  console.log('Received:', message);
});

port.onDisconnect.addListener(() => {
  console.log('Disconnected from native app');
});

// Send messages through the port
port.postMessage({ action: 'getSystemInfo' });
```

### One-Time Message: chrome.runtime.sendNativeMessage

Use `sendNativeMessage` for single request-response patterns.

```javascript
// Send a one-time message
chrome.runtime.sendNativeMessage(
  'com.example.myapp',
  { action: 'readFile', path: '/tmp/data.txt' },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
    } else {
      console.log('Response:', response);
    }
  }
);

// Async/await version using promises
async function sendNativeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage('com.example.myapp', message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
```

## Host Application Implementation

### Python Implementation

```python
#!/usr/bin/env python3
"""Native Messaging Host in Python"""

import sys
import json
import subprocess

def read_message():
    """Read a message from stdin"""
    # Read message length (4 bytes, little-endian)
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None
    
    message_length = int.from_bytes(raw_length, 'little')
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message):
    """Send a message to stdout"""
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(len(encoded).to_bytes(4, 'little'))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

def handle_message(message):
    """Process incoming message and return response"""
    action = message.get('action', '')
    
    if action == 'getSystemInfo':
        return {
            'platform': sys.platform,
            'python_version': sys.version,
            'status': 'success'
        }
    elif action == 'executeCommand':
        cmd = message.get('command', '')
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            return {
                'stdout': result.stdout,
                'stderr': result.stderr,
                'returncode': result.returncode
            }
        except Exception as e:
            return {'error': str(e)}
    
    return {'error': 'Unknown action'}

def main():
    """Main loop - read and process messages"""
    while True:
        message = read_message()
        if message is None:
            break
        
        response = handle_message(message)
        send_message(response)

if __name__ == '__main__':
    main()
```

### Node.js Implementation

```javascript
#!/usr/bin/env node
/** Native Messaging Host in Node.js */

const readline = require('readline');

function readMessage() {
  return new Promise((resolve) => {
    // Read 4 bytes for message length
    const lengthBuffer = Buffer.alloc(4);
    let offset = 0;
    
    process.stdin.on('data', (chunk) => {
      while (offset < 4 && offset < chunk.length) {
        lengthBuffer[offset++] = chunk[offset - (4 - chunk.length)];
      }
      
      if (offset === 4) {
        const length = lengthBuffer.readUInt32LE(0);
        let messageBuffer = Buffer.alloc(length);
        let msgOffset = 0;
        
        const remaining = chunk.slice(4 - offset + chunk.length);
        remaining.copy(messageBuffer, msgOffset);
        msgOffset += remaining.length;
        
        const message = JSON.parse(messageBuffer.toString('utf-8'));
        resolve(message);
      }
    });
  });
}

function sendMessage(message) {
  const encoded = JSON.stringify(message);
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(encoded.length, 0);
  process.stdout.write(lengthBuffer + encoded);
}

async function handleMessage(message) {
  const { action } = message;
  
  if (action === 'getSystemInfo') {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      status: 'success'
    };
  }
  
  return { error: 'Unknown action' };
}

async function main() {
  while (true) {
    try {
      const message = await readMessage();
      const response = await handleMessage(message);
      sendMessage(response);
    } catch (error) {
      sendMessage({ error: error.message });
    }
  }
}

main();
```

### Rust Implementation

```rust
use std::io::{self, Read, Write};
use std::process::{Command, Stdio};

fn read_message() -> Option<String> {
    let mut length_buf = [0u8; 4];
    io::stdin().read_exact(&mut length_buf).ok()?;
    
    let length = u32::from_le_bytes(length_buf) as usize;
    let mut message_buf = vec![0u8; length];
    io::stdin().read_exact(&mut message_buf).ok()?;
    
    String::from_utf8(message_buf).ok()
}

fn send_message(message: &str) {
    let length = (message.len() as u32).to_le_bytes();
    io::stdout().write_all(&length).unwrap();
    io::stdout().write_all(message.as_bytes()).unwrap();
    io::stdout().flush().unwrap();
}

fn handle_message(message: &str) -> String {
    // Parse JSON and handle message
    // Return response as JSON string
    format!(r#"{{"status": "success", "received": "{}"}}"#, message)
}

fn main() {
    loop {
        match read_message() {
            Some(message) => {
                let response = handle_message(&message);
                send_message(&response);
            }
            None => break,
        }
    }
}
```

### C++ Implementation

```cpp
#include <iostream>
#include <string>
#include <cstring>
#include <arpa/inet.h>

std::string readMessage() {
    uint32_t length;
    std::cin.read(reinterpret_cast<char*>(&length), 4);
    length = ntohl(length);
    
    std::string message(length, '\0');
    std::cin.read(&message[0], length);
    return message;
}

void sendMessage(const std::string& message) {
    uint32_t length = htonl(message.length());
    std::cout.write(reinterpret_cast<char*>(&length), 4);
    std::cout.write(message.c_str(), message.length());
    std::cout.flush();
}

int main() {
    while (true) {
        std::string message = readMessage();
        if (message.empty()) break;
        
        // Process message and create response
        std::string response = "{\"status\": \"success\"}";
        sendMessage(response);
    }
    return 0;
}
```

## Communication Protocol

### Message Format

Messages are serialized as JSON and transmitted with a length prefix:

```
┌────────────┬─────────────────────────┐
│ 4 bytes    │ N bytes (max 1MB)       │
│ (length)   │ (JSON message)          │
└────────────┴─────────────────────────┘
```

- **Length**: 4-byte integer (little-endian), specifies message length
- **Message**: JSON string, maximum 1MB

### Size Limits

| Limit | Value |
|-------|-------|
| Maximum message size | 1MB |
| Maximum send timeout | 60 seconds |
| Maximum receive timeout | 60 seconds |

## Registering Native Host

### Windows Registry

On Windows, register the native host in the registry:

```
HKEY_LOCAL_MACHINE\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.example.myapp
```

Or for per-user installation:

```
HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.example.myapp
```

Set the default value to the path of the manifest JSON file.

```powershell
# Register using PowerShell (as Administrator)
$manifestPath = "C:\path\to\nativeMessaging.json"
$regPath = "HKLM:\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.example.myapp"
New-Item -Path $regPath -Force | Out-Null
Set-ItemProperty -Path $regPath -Name "(Default)" -Value $manifestPath
```

### macOS Manifest Location

Place the manifest file in:

```
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/
```

Or system-wide:

```
/Library/Application Support/Google/Chrome/NativeMessagingHosts/
```

### Linux Manifest Location

Place the manifest file in:

```
~/.config/google-chrome/NativeMessagingHosts/
```

Or system-wide:

```
/etc/opt/chrome/nativeMessagingHosts/
```

For Chromium:

```
~/.config/chromium/NativeMessagingHosts/
/etc/chromium/nativeMessagingHosts/
```

## Debugging Native Messaging

### Enable Logging

```javascript
// In extension - enable debug mode
chrome.runtime.connectNative('com.example.myapp', { debug: true });
```

### Check Native Host Registration

**Windows (PowerShell):**
```powershell
Get-ItemProperty "HKLM:\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.example.myapp"
```

**Linux:**
```bash
ls -la ~/.config/google-chrome/NativeMessagingHosts/
cat ~/.config/google-chrome/NativeMessagingHosts/com.example.myapp.json
```

**macOS:**
```bash
ls -la ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Connection refused | Verify manifest location and executable path |
| Timeout errors | Check firewall settings, increase timeout |
| Permission denied | Ensure executable has execute permissions |
| Message parse error | Validate JSON format, check encoding |

## Security Considerations

### Validate Messages

Always validate and sanitize messages from the native host:

```javascript
// In extension
port.onMessage.addListener((message) => {
  if (!message || typeof message !== 'object') {
    console.error('Invalid message format');
    return;
  }
  // Process only expected fields
  const safeMessage = {
    status: message.status,
    data: typeof message.data === 'string' ? message.data : null
  };
});
```

### Limit Allowed Origins

Restrict which extensions can connect:

```json
{
  "allowed_origins": [
    "chrome-extension://abcdefghijklmnopqrstuvwxyz012345/"
  ]
}
```

### Secure the Native Host

- Validate all input data
- Run with minimal privileges
- Use absolute paths in manifest
- Sign executables on Windows

## Use Cases

### System Integration

- Read system information (CPU, memory, OS version)
- Execute system commands
- Manage system services

### Hardware Access

- Communicate with serial devices (Arduino, USB devices)
- Access Bluetooth peripherals
- Control connected hardware

### File System Operations

- Read/write files outside extension's sandbox
- Access user documents
- Manage configuration files

### Advanced Examples

#### File Reader Example

```javascript
// Extension side
function readFile(path) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(
      'com.example.myapp',
      { action: 'readFile', path: path },
      (response) => {
        if (response.error) reject(new Error(response.error));
        else resolve(response.content);
      }
    );
  });
}

// Usage
readFile('/home/user/documents/data.txt')
  .then(content => console.log(content))
  .catch(err => console.error(err));
```

## Additional Resources

- **Official Documentation**: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- **Chrome Extensions API**: https://developer.chrome.com/docs/extensions/reference/runtime
- **Native Messaging Host Examples**: https://github.com/GoogleChrome/chrome-extensions-samples

## Conclusion

Native messaging bridges Chrome Extensions with native applications, enabling powerful system integration capabilities. By following the protocols and security best practices outlined in this guide, you can create robust extensions that leverage the full power of the underlying operating system while maintaining security and reliability.
