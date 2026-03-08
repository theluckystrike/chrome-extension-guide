---
layout: default
title: "Chrome Extension Native Messaging — Best Practices"
description: "Communicate with native applications via native messaging."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/native-messaging/"
---

# Native Messaging Patterns

## Overview {#overview}
Native messaging enables Chrome extensions to communicate with native applications. Two modes:
- **Connection-based**: `chrome.runtime.connectNative()` for persistent communication
- **One-shot**: `chrome.runtime.sendNativeMessage()` for single requests

## Connection Management {#connection-management}
### Auto-Reconnecting Port {#auto-reconnecting-port}
```javascript
function createNativeConnection(appId) {
  const port = chrome.runtime.connectNative(appId);
  port.onMessage.addListener((message) => console.log(message));
  port.onDisconnect.addListener(() => setTimeout(() => createNativeConnection(appId), 5000));
  return port;
}
```
### Backoff Reconnection {#backoff-reconnection}
```javascript
class NativeConnectionManager {
  constructor(appId) { this.appId = appId; this.retryCount = 0; }
  connect() {
    this.port = chrome.runtime.connectNative(this.appId);
    this.port.onDisconnect.addListener(() => this.attemptReconnection());
  }
  attemptReconnection() { if (this.retryCount >= 5) return; setTimeout(() => this.connect(), 1000 * Math.pow(2, this.retryCount++)); }
}
```
### Heartbeat Detection {#heartbeat-detection}
```javascript
class HeartbeatConnection {
  constructor(appId, interval = 30000) { this.port = chrome.runtime.connectNative(appId); this.timer = setInterval(() => this.port?.postMessage({ type: 'heartbeat' }), interval); }
}
```

## Request-Response Pattern {#request-response-pattern}
### Promise Wrapper {#promise-wrapper}
```javascript
function sendNativeMessage(appId, message, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    chrome.runtime.sendNativeMessage(appId, message, (response) => { clearTimeout(timer); chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(response); });
  });
}
```
### Message ID Correlation {#message-id-correlation}
```javascript
class RequestResponseManager {
  constructor() { this.pending = new Map(); this.messageId = 0; }
  sendRequest(appId, message, timeout = 30000) {
    const id = ++this.messageId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Request ${id} timed out`)); }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      const port = chrome.runtime.connectNative(appId);
      port.postMessage({ ...message, requestId: id });
      port.onMessage.addListener((response) => { if (response.requestId === id) { clearTimeout(timer); this.pending.get(id)?.resolve(response); this.pending.delete(id); } });
    });
  }
}
```

## Streaming Data {#streaming-data}
### Chunking Large Payloads (1MB limit) {#chunking-large-payloads-1mb-limit}
```javascript
const MAX_SIZE = 1024 * 1024;
function sendLargeMessage(port, data) {
  const json = JSON.stringify(data), chunks = [];
  for (let i = 0; i < json.length; i += MAX_SIZE) chunks.push(json.slice(i, i + MAX_SIZE));
  port.postMessage({ type: 'chunked', total: chunks.length, chunks });
}
```
### Progress Tracking {#progress-tracking}
```javascript
class ProgressConnection {
  constructor(appId, onProgress) { this.port = chrome.runtime.connectNative(appId); this.port.onMessage.addListener((msg) => { if (msg.type === 'progress') onProgress(msg.percent, msg.stage); }); }
}
```

## Error Recovery {#error-recovery}
### Host Not Found {#host-not-found}
```javascript
async function checkNativeHost(appId) {
  return new Promise((resolve) => {
    const port = chrome.runtime.connectNative(appId);
    port.onDisconnect.addListener(() => resolve(!chrome.runtime.lastError?.message?.includes('not found')));
    port.postMessage({ type: 'ping' });
  });
}
```
### Crash Recovery {#crash-recovery}
```javascript
async function sendWithRecovery(appId, message) {
  try { return await sendNativeMessage(appId, message); }
  catch (error) { if (error.message.includes('native host')) { await new Promise(r => setTimeout(r, 2000)); return sendWithRecovery(appId, message); } throw error; }
}
```

## Security {#security}
### Input Validation {#input-validation}
```javascript
function validateMessage(message) {
  if (!message || typeof message !== 'object') throw new Error('Invalid message format');
  const validTypes = ['response', 'progress', 'error', 'heartbeat'];
  if (!message.type || !validTypes.includes(message.type)) throw new Error('Invalid message type');
}
function handleMessage(message) {
  validateMessage(message);
  switch (message.action) { case 'updateBadge': chrome.action.setBadgeText({ text: message.value }); break; case 'showNotification': chrome.notifications.create(message.options); break; }
}
```
### Structured Message Format {#structured-message-format}
```javascript
const request = { type: 'request', action: 'getData', requestId: Date.now(), payload: {} };
const response = { type: 'response', requestId: 123, data: {}, error: null };
```

## Native Host Tips {#native-host-tips}
### 32-bit Length Prefix Protocol {#32-bit-length-prefix-protocol}
```python
import struct, sys, json
def read_message():
    length_bytes = sys.stdin.buffer.read(4)
    if not length_bytes: return None
    return json.loads(sys.stdin.buffer.read(struct.unpack('I', length_bytes)[0]).decode('utf-8'))
def write_message(message):
    json_str = json.dumps(message)
    sys.stdout.buffer.write(struct.pack('I', len(json_str)) + json_str.encode('utf-8'))
    sys.stdout.buffer.flush()
while (msg := read_message()) is not None: write_message(process(msg))
```
### Host Installer Detection {#host-installer-detection}
```javascript
async function detectHost(appId) { try { const port = chrome.runtime.connectNative(appId); port.disconnect(); return { installed: true }; } catch (error) { return { installed: false, instructions: 'Download from https://example.com/downloads' }; } }
```

## Cross-references {#cross-references}
- [Native Messaging Permission](./permissions/native-messaging.md)
- [Message Passing Patterns](./reference/message-passing-patterns.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
