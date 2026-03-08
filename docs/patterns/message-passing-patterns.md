---
layout: default
title: "Chrome Extension Message Passing Patterns — Request/Response, Port, and External Messaging"
description: "Master message passing in Chrome extensions with sendMessage, connect/port, onMessageExternal, and cross-extension messaging patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/message-passing-patterns/"
---

# Chrome Extension Message Passing Patterns — Request/Response, Port, and External Messaging

Chrome extensions use message passing as the primary mechanism for communication between different contexts. Whether you need to coordinate between content scripts and background scripts, communicate with external web pages, or enable cross-extension messaging, understanding these patterns is essential for building robust extensions.

## Prerequisites {#prerequisites}

Ensure you have the required permissions in your manifest:

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab"],
  "host_permissions": ["https://*.example.com/*"]
}
```

---

## Request/Response with chrome.runtime.sendMessage {#sendmessage}

The simplest message passing pattern uses `chrome.runtime.sendMessage()` for one-time request/response communication. This is ideal for scenarios where you need a quick response and don't require a persistent connection.

### Sending Messages from Content Scripts {#sendmessage-from-content}

Content scripts can communicate with the background service worker using `chrome.runtime.sendMessage()`:

```typescript
// content-script.ts
async function fetchExtensionData(): Promise<DataResponse> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_EXTENSION_DATA',
      payload: { userId: '123' }
    });
    
    if (response?.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  } catch (error) {
    console.error('Message send failed:', error);
    throw error;
  }
}
```

### Receiving Messages in Background Scripts {#receive-message-background}

The background service worker listens for messages using `chrome.runtime.onMessage.addListener()`:

```typescript
// background.ts
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message.type === 'GET_EXTENSION_DATA') {
      // Handle the request
      const data = processRequest(message.payload);
      
      // Send response back
      sendResponse({ data });
    }
    
    // Return true to indicate async response
    return true;
  }
);
```

Note that returning `true` from the listener indicates you'll call `sendResponse` asynchronously, which is necessary when performing async operations.

---

## Long-Lived Connections with chrome.runtime.connect {#port-connections}

For scenarios requiring ongoing communication between contexts, use the connection-based API. This pattern creates a persistent port that stays open for continuous message exchange.

### Establishing a Connection {#establish-connection}

```typescript
// content-script.ts
const port = chrome.runtime.connect({ name: 'popup-content-channel' });

port.onMessage.addListener((message) => {
  console.log('Received:', message);
  handleMessage(message);
});

port.postMessage({ type: 'INIT', tabId: chrome.runtime.id });
```

### Handling Connections in Background {#handle-connection}

```typescript
// background.ts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup-content-channel') {
    port.onMessage.addListener((message) => {
      // Handle messages from the connected context
      processMessage(message, port);
    });
    
    port.onDisconnect.addListener(() => {
      // Clean up when connection is closed
      console.log('Port disconnected');
    });
  }
});
```

Long-lived connections are particularly useful for real-time features, streaming data, or maintaining state synchronization between components.

---

## External Messaging with onMessageExternal {#external-messaging}

Chrome extensions can receive messages from external sources, including web pages and other extensions. This requires explicitly declaring allowed origins.

### Configuring External Messaging {#configure-external}

In your manifest, specify which external origins can send messages:

```json
{
  "externally_connectable": {
    "matches": ["https://*.example.com/*"],
    "ids": ["*"]
  }
}
```

### Listening for External Messages {#listen-external}

```typescript
// background.ts
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    // Verify the sender's origin
    if (sender.url?.includes('trusted-site.com')) {
      const response = handleExternalRequest(message);
      sendResponse(response);
    } else {
      sendResponse({ error: 'Unauthorized origin' });
    }
    
    return true;
  }
);
```

### Sending from External Web Pages {#send-from-external}

```javascript
// From a web page
chrome.runtime.sendMessage(
  'YOUR_EXTENSION_ID',
  { type: 'REQUEST_DATA', payload: {} },
  (response) => {
    console.log('Response:', response);
  }
);
```

---

## Cross-Extension Messaging {#cross-extension}

Extensions can communicate with each other using cross-extension messaging. This is useful for extensions that work together or for sharing functionality.

### Sending to Another Extension {#send-to-extension}

```typescript
// Sending extension
async function sendToAnotherExtension(extensionId: string, message: Message) {
  try {
    const response = await chrome.runtime.sendMessage(extensionId, message);
    return response;
  } catch (error) {
    console.error('Cross-extension message failed:', error);
    throw error;
  }
}
```

### Receiving from Another Extension {#receive-from-extension}

The receiving extension uses the same `onMessageExternal` listener, as Chrome treats messages from other extensions as external:

```typescript
// Receiving extension background.ts
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (sender.id === 'trusted-extension-id') {
      // Handle the message
      const result = processMessage(message);
      sendResponse(result);
    }
    
    return true;
  }
);
```

---

## Error Handling Best Practices {#error-handling}

Robust error handling is critical for message passing. Here are essential patterns:

### Timeout Handling {#timeout-handling}

```typescript
async function sendWithTimeout<T>(
  message: object,
  timeoutMs: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, timeoutMs);
    
    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timeout);
      
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
```

### Connection Error Handling {#connection-errors}

```typescript
const port = chrome.runtime.connect({ name: 'channel' });

port.onDisconnect.addListener(() => {
  console.log('Disconnected, attempting reconnect...');
  // Implement reconnection logic
});

port.onMessage.addListener((message) => {
  if (message.error) {
    handleError(message.error);
    return;
  }
  processMessage(message);
});
```

---

## Summary {#summary}

Message passing in Chrome extensions supports multiple patterns suited to different use cases. Use `chrome.runtime.sendMessage()` for simple request/response scenarios, establish persistent connections with `chrome.runtime.connect()` for ongoing communication, and leverage external and cross-extension messaging for broader integration needs. Always implement proper error handling and consider timeout strategies for production-quality extensions.
