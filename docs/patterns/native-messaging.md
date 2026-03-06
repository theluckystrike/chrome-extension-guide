# Native Messaging Patterns

## Overview

Native messaging enables Chrome extensions to communicate with native applications. Two modes exist:
- **Connection-based**: `chrome.runtime.connectNative()` for persistent communication
- **One-shot**: `chrome.runtime.sendNativeMessage()` for single requests

## Connection Management

### Basic Connection

```javascript
function createNativeConnection() {
  const port = chrome.runtime.connectNative('com.example.myapp');
  
  port.onMessage.addListener((message) => console.log(message));
  port.onDisconnect.addListener(() => {
    setTimeout(createNativeConnection, 5000); // Auto-reconnect
  });
  
  return port;
}
```

### Reconnection with Backoff

```javascript
class NativeConnectionManager {
  constructor(appId) {
    this.appId = appId;
    this.port = null;
    this.retryCount = 0;
  }
  
  connect() {
    try {
      this.port = chrome.runtime.connectNative(this.appId);
      this.port.onDisconnect.addListener(() => this.attemptReconnection());
      this.retryCount = 0;
    } catch (error) {
      this.handleError(error);
    }
  }
  
  attemptReconnection() {
    if (this.retryCount >= 5) return;
    const delay = 1000 * Math.pow(2, this.retryCount++);
    setTimeout(() => this.connect(), delay);
  }
}
```

### Heartbeat Detection

```javascript
class HeartbeatConnection {
  constructor(appId, interval = 30000) {
    this.appId = appId;
    this.port = null;
    this.timer = null;
  }
  
  connect() {
    this.port = chrome.runtime.connectNative(this.appId);
    this.port.onDisconnect.addListener(() => clearInterval(this.timer));
    this.timer = setInterval(() => this.port?.postMessage({ type: 'heartbeat' }), interval);
  }
}
```

## Request-Response Pattern

### Message ID Correlation

```javascript
class RequestResponseManager {
  constructor() {
    this.pending = new Map();
    this.messageId = 0;
  }
  
  sendRequest(appId, message, timeout = 30000) {
    const id = ++this.messageId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request ${id} timed out`));
      }, timeout);
      
      this.pending.set(id, { resolve, reject, timer });
      const port = chrome.runtime.connectNative(appId);
      port.postMessage({ ...message, requestId: id });
      
      port.onMessage.addListener((response) => {
        if (response.requestId === id) {
          clearTimeout(timer);
          this.pending.get(id)?.resolve(response);
          this.pending.delete(id);
        }
      });
    });
  }
}
```

### Promise Wrapper

```javascript
function sendNativeMessage(appId, message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(appId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
```

## Streaming Data

### Chunking Large Payloads (1MB limit)

```javascript
const MAX_SIZE = 1024 * 1024;

function sendLargeMessage(port, data) {
  const json = JSON.stringify(data);
  const chunks = [];
  
  for (let i = 0; i < json.length; i += MAX_SIZE) {
    chunks.push(json.slice(i, i + MAX_SIZE));
  }
  
  port.postMessage({ type: 'chunked', total: chunks.length, chunks });
}

function receiveLargeMessage(chunks) {
  return JSON.parse(chunks.join(''));
}
```

### Progress Tracking

```javascript
class ProgressConnection {
  constructor(appId, onProgress) {
    this.appId = appId;
    this.onProgress = onProgress;
    this.port = null;
  }
  
  connect() {
    this.port = chrome.runtime.connectNative(this.appId);
    this.port.onMessage.addListener((msg) => {
      if (msg.type === 'progress') {
        this.onProgress(msg.percent, msg.stage);
      }
    });
  }
}
```

## Error Recovery

### Host Not Found

```javascript
async function checkNativeHost(appId) {
  return new Promise((resolve) => {
    const port = chrome.runtime.connectNative(appId);
    port.onDisconnect.addListener(() => {
      const notFound = chrome.runtime.lastError?.message?.includes('not found');
      resolve(!notFound);
    });
    port.postMessage({ type: 'ping' });
  });
}

async function handleMissingHost() {
  const installed = await checkNativeHost('com.example.app');
  if (!installed) {
    return { needsInstall: true, url: 'https://example.com/download' };
  }
  return { needsInstall: false };
}
```

### Crash Recovery

```javascript
async function sendWithRecovery(appId, message) {
  try {
    return await sendNativeMessage(appId, message);
  } catch (error) {
    if (error.message.includes('native host')) {
      await new Promise(r => setTimeout(r, 2000));
      return sendWithRecovery(appId, message);
    }
    throw error;
  }
}
```

## Security

### Input Validation

```javascript
function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    throw new Error('Invalid message format');
  }
  
  const validTypes = ['response', 'progress', 'error', 'heartbeat'];
  if (!message.type || !validTypes.includes(message.type)) {
    throw new Error('Invalid message type');
  }
  
  return true;
}

// Never use eval() - use structured handlers
function handleMessage(message) {
  validateMessage(message);
  
  switch (message.action) {
    case 'updateBadge':
      chrome.action.setBadgeText({ text: message.value });
      break;
    case 'showNotification':
      chrome.notifications.create(message.options);
      break;
  }
}
```

### Structured Message Format

Always use explicit type fields:

```javascript
// Outgoing
const request = {
  type: 'request',
  action: 'getData',
  requestId: Date.now(),
  payload: {}
};

// Incoming
const response = {
  type: 'response',
  requestId: 123,
  data: { ... },
  error: null
};
```

## Native Host Tips

### Reading Messages (32-bit length prefix)

```python
import struct
import sys
import json

def read_message():
    length_bytes = sys.stdin.buffer.read(4)
    if not length_bytes:
        return None
    length = struct.unpack('I', length_bytes)[0]
    json_str = sys.stdin.buffer.read(length).decode('utf-8')
    return json.loads(json_str)

def write_message(message):
    json_str = json.dumps(message)
    sys.stdout.buffer.write(struct.pack('I', len(json_str)))
    sys.stdout.buffer.write(json_str.encode('utf-8'))
    sys.stdout.buffer.flush()

# Exit cleanly when stdin closes
while True:
    msg = read_message()
    if msg is None:
        break
    response = process(msg)
    write_message(response)
```

## Code Examples

### Promise Wrapper

```javascript
const Native = {
  appId: 'com.example.myapp',
  
  send(message, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
      chrome.runtime.sendNativeMessage(this.appId, message, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  },
  
  request(action, data = {}) {
    return this.send({ action, data, requestId: Date.now() });
  }
};
```

### Auto-Reconnecting Port

```javascript
class AutoReconnectPort {
  constructor(appId) {
    this.appId = appId;
    this.queue = [];
  }
  
  connect() {
    this.port = chrome.runtime.connectNative(this.appId);
    this.port.onDisconnect.addListener(() => {
      setTimeout(() => this.connect(), 2000);
    });
  }
  
  postMessage(msg) {
    if (this.port) {
      this.port.postMessage(msg);
    } else {
      this.queue.push(msg);
    }
  }
}
```

### Host Installer Detection

```javascript
async function detectHost(appId) {
  try {
    const port = chrome.runtime.connectNative(appId);
    port.disconnect();
    return { installed: true };
  } catch (error) {
    return {
      installed: false,
      instructions: 'Download from https://example.com/downloads'
    };
  }
}
```

## Cross-references

- [Native Messaging Permission](./permissions/native-messaging.md)
- [Message Passing Patterns](./reference/message-passing-patterns.md)
