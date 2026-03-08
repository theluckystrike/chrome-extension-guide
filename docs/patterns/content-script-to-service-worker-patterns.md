---
layout: default
title: "Chrome Extension Content Script To Service Worker Patterns — Best Practices"
description: "Communicate from content scripts to service workers."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/content-script-to-service-worker-patterns/"
---

# Content Script to Service Worker Communication Patterns

This guide covers the communication patterns between content scripts and service workers in Chrome extensions. This is the most fundamental and error-prone part of extension development.

## Prerequisites {#prerequisites}

Ensure your manifest declares the necessary permissions:

```json
{
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": ["<all_urls>"]
}
```

---

## Simple Request-Response with sendMessage {#simple-request-response-with-sendmessage}

The most straightforward pattern uses chrome.runtime.sendMessage for one-off requests. The content script sends a message and receives a single response.

```typescript
// content-script.ts
async function fetchUserData(userId: string) {
  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_USER_DATA',
    payload: { userId }
  });
  
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data;
}

// service-worker.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_USER_DATA') {
    fetchUserFromAPI(message.payload.userId)
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: { message: error.message } }));
    return true; // Keep channel open for async response
  }
});
```

The return value of true tells Chrome the response will arrive asynchronously.

---

## Long-Lived Connections with connect {#long-lived-connections-with-connect}

For ongoing communication, use chrome.runtime.connect to establish a port. This survives service worker restarts more gracefully.

```typescript
// content-script.ts
const port = chrome.runtime.connect({ name: 'data-stream' });

port.onMessage.addListener((message) => {
  console.log('Received:', message);
});

port.onDisconnect.addListener(() => {
  console.log('Port disconnected, attempting reconnect...');
  // Implement reconnection logic
});

// Send messages through the port
port.postMessage({ type: 'SUBSCRIBE', channel: 'updates' });
```

Ports handle reconnection automatically when the service worker wakes up.

---

## Streaming Data from Service Worker {#streaming-data-from-service-worker}

When you need continuous data flow, establish a persistent port and use it as an event emitter.

```typescript
// service-worker.ts
const activePorts = new Map<number, chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name.startsWith('stream-')) {
    const tabId = port.sender?.tab?.id;
    if (tabId) {
      activePorts.set(tabId, port);
      
      port.onDisconnect.addListener(() => {
        activePorts.delete(tabId);
      });
    }
  }
});

// Broadcast to specific content script
function sendUpdate(tabId: number, data: unknown) {
  const port = activePorts.get(tabId);
  if (port) {
    port.postMessage({ type: 'UPDATE', payload: data });
  }
}
```

---

## Broadcasting to All Content Scripts {#broadcasting-to-all-content-scripts}

Use tabs.query to find all active tabs and send messages to each content script.

```typescript
// service-worker.ts
async function broadcastToAllContentScripts(message: unknown) {
  const tabs = await chrome.tabs.query({});
  
  const results = await Promise.allSettled(
    tabs.map(tab => {
      if (tab.id) {
        return chrome.tabs.sendMessage(tab.id, message);
      }
    })
  );
  
  // Handle failures for disconnected tabs
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`Failed to send to tab ${tabs[index].id}`);
    }
  });
}
```

---

## Permission-Gated Actions Through Service Worker {#permission-gated-actions-through-service-worker}

Content scripts cannot directly access many Chrome APIs. Route requests through the service worker.

```typescript
// content-script.ts
async function readClipboard() {
  return chrome.runtime.sendMessage({ type: 'READ_CLIPBOARD' });
}

// service-worker.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'READ_CLIPBOARD') {
    navigator.clipboard.readText()
      .then(text => sendResponse({ data: text }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});
```

This pattern lets you perform restricted operations while keeping your content script lightweight.

---

## Handling Service Worker Restarts {#handling-service-worker-restarts}

Service workers can terminate after inactivity. Your code must handle this gracefully.

```typescript
// content-script.ts
class SWConnection {
  private port: chrome.runtime.Port | null = null;
  private messageQueue: unknown[] = [];
  
  connect() {
    this.port = chrome.runtime.connect({ name: 'persistent' });
    
    this.port.onMessage.addListener((msg) => this.handleMessage(msg));
    this.port.onDisconnect.addListener(() => {
      this.port = null;
      setTimeout(() => this.reconnect(), 1000);
    });
  }
  
  private async reconnect() {
    this.connect();
    // Flush queued messages
    for (const msg of this.messageQueue) {
      this.port?.postMessage(msg);
    }
    this.messageQueue = [];
  }
  
  send(message: unknown) {
    if (this.port) {
      this.port.postMessage(message);
    } else {
      this.messageQueue.push(message);
    }
  }
}
```

This queue ensures no messages are lost during service worker restarts.

---

## Type-Safe Messaging Patterns {#type-safe-messaging-patterns}

Define a shared types file to ensure type safety across contexts.

```typescript
// types/messages.ts
export type MessageType =
  | { type: 'FETCH_USER'; payload: { userId: string } }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATEBadge'; payload: { count: number } };

export type Response<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };
```

Import this type definition in both your content script and service worker for compile-time checking.

---

## Error Propagation Across Contexts {#error-propagation-across-contexts}

Always propagate errors explicitly rather than letting them disappear.

```typescript
// service-worker.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(data => sendResponse({ success: true, data }))
    .catch(error => {
      console.error('Handler error:', error);
      sendResponse({ 
        success: false, 
        error: { 
          name: error.name, 
          message: error.message,
          stack: error.stack 
        }
      });
    });
  return true;
});
```

This gives the content script full context about what went wrong.

---

## Performance Patterns with Batching {#performance-patterns-with-batching}

When sending many messages, batch them to reduce overhead.

```typescript
// content-script.ts
class BatchedSender {
  private queue: unknown[] = [];
  private flushTimer: number | null = null;
  private readonly batchSize = 10;
  private readonly flushInterval = 100;
  
  send(message: unknown) {
    this.queue.push(message);
    
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => this.flush(), this.flushInterval);
    }
  }
  
  private flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    
    const batch = this.queue.splice(0, this.batchSize);
    chrome.runtime.sendMessage({ type: 'BATCH', payload: batch });
  }
}
```

Batching reduces the number of service worker wake-ups significantly.

---

## Conclusion {#conclusion}

These patterns form the backbone of content script to service worker communication. Choose the right pattern based on your use case. For simple requests, sendMessage works well. For ongoing communication, prefer connect with proper reconnection logic.

For more extension development patterns and tutorials, visit zovo.one.
