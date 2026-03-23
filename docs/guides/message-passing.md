Chrome Extension Message Passing Patterns

Overview

Message passing enables your content scripts, popup, service worker, and external applications to exchange data and coordinate actions.

Manifest Setup

```json
{
  "manifest_version": 3,
  "permissions": ["nativeMessaging", "tabs"],
  "externally_connectable": { "matches": ["https://example.com/*"] }
}
```

One-Time Messages with sendMessage and onMessage

```ts
// content-script.ts
chrome.runtime.sendMessage({ action: "getData" }, (response) => {
  if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
  else console.log("Received:", response);
});

// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getData") sendResponse({ data: "Hello" });
  return true;
});
```

Service Worker to Content Script

```ts
// background.ts
chrome.tabs.sendMessage(tabId, { action: "updateUI" }, (response) => console.log(response));

// content-script.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateUI") {
    document.body.style.backgroundColor = "lightblue";
    sendResponse({ success: true });
  }
  return true;
});
```

Long-Lived Connections with connect and onConnect

```ts
// Create connection
const port = chrome.runtime.connect({ name: "my-connection" });
port.onMessage.addListener((message) => console.log(message));
port.postMessage({ action: "hello" });

// Receive connections
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((message) => port.postMessage({ action: "welcome" }));
});
```

Broadcasting to All Content Scripts

```ts
async function broadcastToAllTabs(message: object) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter(t => t.id).map(t => 
    chrome.tabs.sendMessage(t.id!, message).catch(() => {})
  ));
}
```

External Messaging Between Extensions

```ts
const EXTENSION_ID = "another-extension-id";
chrome.runtime.sendMessage(EXTENSION_ID, { action: "ping" }, (response) => {});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.action === "ping") sendResponse({ action: "pong" });
  return true;
});
```

Web Page to Extension Messaging

```ts
// On https://example.com
chrome.runtime.sendMessage("YOUR_EXTENSION_ID", { action: "fromPage" }, (response) => {});
```

Native Messaging with Host Applications

```json
{ "name": "My Native App", "nativeMessaging": true }
```

```ts
async function sendToNativeApp(message: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage("com.example.app", message, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response);
    });
  });
}
```

Message Serialization Limits

Large data should use `chrome.storage`:

```ts
async function sendLargeData(data: object) {
  const key = `temp_${Date.now()}`;
  await chrome.storage.local.set({ [key]: data });
  chrome.runtime.sendMessage({ action: "dataReady", key });
}
```

Promise-Based Message Handling

```ts
function sendMessage<T = unknown>(message: object): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response as T);
    });
  });
}
```

Type-Safe Message Router

```ts
interface MessageMap {
  "get-user": { request: void; response: User };
  "update-user": { request: Partial<User>; response: { success: boolean } };
}

const handlers: Partial<Record<keyof MessageMap, (payload: any) => Promise<any>>> = {
  "get-user": async () => ({ id: 1, name: "User" }),
  "update-user": async (user) => { await saveUser(user); return { success: true }; },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = handlers[message.type as keyof MessageMap];
  if (handler) {
    handler(message.payload).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true;
  }
});
```

Error Handling in Message Passing

```ts
async function safeSendMessage(message: object): Promise<unknown> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Could not establish connection")) console.warn("No listener");
      else if (error.message.includes("Receiving end does not exist")) console.warn("Not loaded");
    }
    throw error;
  }
}
```

Performance Considerations

Debouncing High-Frequency Messages

```ts
let pendingUpdate: number | null = null;
function scheduleUpdate(data: object) {
  if (pendingUpdate) clearTimeout(pendingUpdate);
  pendingUpdate = window.setTimeout(() => {
    chrome.runtime.sendMessage({ action: "batchUpdate", data });
    pendingUpdate = null;
  }, 100);
}
```

Connection Pooling

```ts
const portCache = new Map<string, chrome.runtime.Port>();
function getPort(name: string): chrome.runtime.Port {
  if (!portCache.has(name)) portCache.set(name, chrome.runtime.connect({ name }));
  return portCache.get(name)!;
}
```

Message Bus Architecture

```ts
class MessageBus {
  private handlers = new Map<string, Function[]>();

  subscribe(type: string, handler: Function) {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }

  async publish(type: string, payload: unknown, sender?: chrome.runtime.MessageSender) {
    const message = { type, payload, sender };
    const handlers = this.handlers.get(type) || [];
    await Promise.all(handlers.map((h) => h(message)));
  }

  connect(name: string): chrome.runtime.Port {
    const port = chrome.runtime.connect({ name });
    port.onMessage.addListener((msg) => this.publish(msg.type, msg.payload));
    return port;
  }
}
```

Summary

1. One-time messages: Use `sendMessage` for request/response
2. Persistent connections: Use `connect` for ongoing communication
3. External messaging: Configure `externally_connectable` for web pages
4. Native messaging: Use `nativeMessaging` for system integration
5. Error handling: Always wrap message calls in try/catch
6. Performance: Debounce high-frequency messages and reuse ports

See [Chrome Extensions Messaging Documentation](https://developer.chrome.com/docs/extensions/develop/concepts/messaging).
