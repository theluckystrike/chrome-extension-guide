# Message Passing Patterns Reference

All Chrome extension messaging patterns with code examples.

## One-Time Messages {#one-time-messages}
```javascript
// Popup -> background
chrome.runtime.sendMessage({ type: 'GET_DATA', key: 'config' }, (res) => {
  console.log(res.data);
});

// Background listener (return true for async!)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_DATA') {
    getData(msg.key).then(data => sendResponse({ data }));
    return true;
  }
});

// Background -> content script
chrome.tabs.sendMessage(tabId, { type: 'HIGHLIGHT', selector: '.result' });

// Content script -> background (sender.tab available)
chrome.runtime.sendMessage({ type: 'PAGE_INFO', url: location.href });
```

## Long-Lived Connections (Ports) {#long-lived-connections-ports}
```javascript
// Content script opens port
const port = chrome.runtime.connect({ name: 'stream' });
port.postMessage({ type: 'SUBSCRIBE' });
port.onMessage.addListener((msg) => console.log(msg));
port.onDisconnect.addListener(() => console.log('Closed'));

// Background receives
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => { /* handle */ });
  port.postMessage({ data: 'hello' });
});
```

## External Messaging {#external-messaging}
```javascript
// To another extension
chrome.runtime.sendMessage('OTHER_EXT_ID', { type: 'REQ' }, (res) => {});
// Receive
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  sendResponse({ ok: true });
});
// Manifest: { "externally_connectable": { "ids": ["ID"], "matches": ["https://site/*"] } }

// Web page -> extension
chrome.runtime.sendMessage('EXT_ID', { from: 'page' });
```

## Native Messaging {#native-messaging}
```javascript
const port = chrome.runtime.connectNative('com.example.app');
port.postMessage({ cmd: 'list' });
port.onMessage.addListener((res) => console.log(res));
// Requires nativeMessaging permission
```

## Type-Safe with @theluckystrike/webext-messaging {#type-safe-with-theluckystrikewebext-messaging}
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  GET_CONFIG: { request: { key: string }; response: { value: string } };
  SET_CONFIG: { request: { key: string; value: string }; response: { success: boolean } };
};

// Background
const m = createMessenger<Messages>();
m.onMessage('GET_CONFIG', async ({ key }) => ({ value: await storage.get(key) }));

// Popup
const m = createMessenger<Messages>();
const { value } = await m.sendMessage('GET_CONFIG', { key: 'theme' });
await m.sendTabMessage(tabId, 'SET_CONFIG', { key: 'x', value: 'y' });
```

## Error Handling {#error-handling}
```javascript
chrome.runtime.sendMessage({ type: 'X' }, (res) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    return;
  }
});

// @theluckystrike/webext-messaging
import { MessagingError } from '@theluckystrike/webext-messaging';
try { await m.sendMessage('X', {}); }
catch (e) { if (e instanceof MessagingError) console.error(e); }
```

## Common Mistakes {#common-mistakes}
- Not returning `true` for async `sendResponse`
- Sending to tabs without content scripts
- Missing `externally_connectable`
- Port disconnects on SW termination
- Circular messages
