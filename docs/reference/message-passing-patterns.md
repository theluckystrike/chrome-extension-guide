# Message Passing Patterns Reference

Complete reference for all Chrome extension messaging patterns with code examples.

## Pattern 1: One-Time Messages (Most Common)

### Background <-> Popup/Options/Side Panel
```javascript
// Send from popup
chrome.runtime.sendMessage({ type: 'GET_DATA', key: 'config' }, (response) => {
  console.log('Got:', response.data);
});

// Receive in background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    fetchData(message.key).then(data => sendResponse({ data }));
    return true; // Keep channel open for async response
  }
});
```

### Background -> Content Script
```javascript
// Send to specific tab's content script
chrome.tabs.sendMessage(tabId, { type: 'HIGHLIGHT', selector: '.result' }, (response) => {
  console.log('Highlighted:', response.count);
});

// Receive in content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HIGHLIGHT') {
    const elements = document.querySelectorAll(message.selector);
    elements.forEach(el => el.style.background = 'yellow');
    sendResponse({ count: elements.length });
  }
});
```

### Content Script -> Background
```javascript
// Send from content script
chrome.runtime.sendMessage({ type: 'PAGE_DATA', url: location.href, title: document.title });

// Receive in background (sender.tab identifies the tab)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_DATA') {
    console.log(`Tab ${sender.tab.id}: ${message.title}`);
  }
});
```

## Pattern 2: Long-Lived Connections (Ports)

### Persistent Channel
```javascript
// Content script opens a port
const port = chrome.runtime.connect({ name: 'stream' });
port.postMessage({ type: 'SUBSCRIBE', topic: 'updates' });
port.onMessage.addListener((msg) => {
  console.log('Update:', msg.data);
});
port.onDisconnect.addListener(() => {
  console.log('Port closed');
});

// Background receives connection
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'stream') {
    port.onMessage.addListener((msg) => {
      if (msg.type === 'SUBSCRIBE') {
        // Send periodic updates
        const interval = setInterval(() => {
          port.postMessage({ data: getLatestData() });
        }, 1000);
        port.onDisconnect.addListener(() => clearInterval(interval));
      }
    });
  }
});
```

### Tab-Specific Port
```javascript
// Background opens port to content script
const port = chrome.tabs.connect(tabId, { name: 'control' });
port.postMessage({ action: 'start' });
```

## Pattern 3: External Messaging (Between Extensions)
```javascript
// Send to another extension
chrome.runtime.sendMessage(
  'OTHER_EXTENSION_ID',
  { type: 'REQUEST', data: 'hello' },
  (response) => { console.log('External response:', response); }
);

// Receive from other extensions
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('From extension:', sender.id);
  sendResponse({ status: 'ok' });
});
```
Requires `externally_connectable` in manifest:
```json
{
  "externally_connectable": {
    "ids": ["OTHER_EXTENSION_ID"],
    "matches": ["https://mysite.com/*"]
  }
}
```

## Pattern 4: Web Page -> Extension
```javascript
// From web page (must be in externally_connectable.matches)
chrome.runtime.sendMessage('EXTENSION_ID', { type: 'FROM_PAGE', url: location.href });

// Extension receives
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (sender.url && message.type === 'FROM_PAGE') {
    console.log('Page says:', message);
  }
});
```

## Pattern 5: Native Messaging
```javascript
// Connect to native app
const port = chrome.runtime.connectNative('com.example.myapp');
port.postMessage({ command: 'list' });
port.onMessage.addListener((response) => {
  console.log('Native app says:', response);
});

// One-time native message
chrome.runtime.sendNativeMessage('com.example.myapp', { command: 'version' }, (response) => {
  console.log('Version:', response.version);
});
```
Requires `nativeMessaging` permission and native messaging host manifest.

## Type-Safe Messaging with @theluckystrike/webext-messaging

```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

// Define message map
type Messages = {
  GET_CONFIG: { request: { key: string }; response: { value: string } };
  SET_CONFIG: { request: { key: string; value: string }; response: { success: boolean } };
  NOTIFY: { request: { title: string; body: string }; response: void };
};

// In background
const messenger = createMessenger<Messages>();
messenger.onMessage('GET_CONFIG', async ({ key }) => {
  const value = await storage.get(key);
  return { value };
});
messenger.onMessage('SET_CONFIG', async ({ key, value }) => {
  await storage.set(key, value);
  return { success: true };
});

// In popup/content script
const messenger = createMessenger<Messages>();
const config = await messenger.sendMessage('GET_CONFIG', { key: 'theme' });
// config is typed as { value: string }

// To content script in specific tab
await messenger.sendTabMessage(tabId, 'NOTIFY', { title: 'Hello', body: 'World' });
```

## Error Handling
```javascript
// Check for errors
chrome.runtime.sendMessage({ type: 'TEST' }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message failed:', chrome.runtime.lastError.message);
    // Common: "Could not establish connection. Receiving end does not exist."
    return;
  }
});

// With @theluckystrike/webext-messaging
import { MessagingError } from '@theluckystrike/webext-messaging';
try {
  await messenger.sendMessage('GET_CONFIG', { key: 'x' });
} catch (e) {
  if (e instanceof MessagingError) {
    console.error('Messaging error:', e.message);
  }
}
```

## Common Mistakes
- Not returning `true` for async `sendResponse` — channel closes immediately
- Sending messages to tabs without content scripts — "Receiving end does not exist"
- Forgetting `externally_connectable` for cross-extension messaging
- Port disconnects when service worker terminates — must reconnect
- Circular message loops (background sends to itself)
