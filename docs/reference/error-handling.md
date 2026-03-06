# Error Handling Reference

## chrome.runtime.lastError
```typescript
// Callback APIs set chrome.runtime.lastError
chrome.tabs.create({ url: 'invalid://url' }, (tab) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    return;
  }
  // success
});
```

## Promise Rejection (MV3)
```typescript
try {
  const tab = await chrome.tabs.create({ url: 'invalid://url' });
} catch (error) {
  console.error(error.message);
}
```

## Common Error Messages

### Tabs: "No tab with id: X", "Cannot access contents of url", "Tabs cannot be edited right now"
### Storage: "QUOTA_BYTES quota exceeded", "MAX_ITEMS quota exceeded", "MAX_WRITE_OPERATIONS_PER_HOUR exceeded"
### Messaging: "Could not establish connection. Receiving end does not exist.", "The message port closed before a response was received.", "Extension context invalidated."
### Scripting: "Cannot access a chrome:// URL", "Missing host permission for the tab"
### Alarms: "Alarm delay is less than minimum of 30 seconds"

## @theluckystrike/webext-messaging Errors
```typescript
import { createMessenger, MessagingError } from '@theluckystrike/webext-messaging';
type Msgs = { GET_DATA: { request: { id: string }; response: { data: string } } };
const m = createMessenger<Msgs>();

try {
  const result = await m.sendMessage('GET_DATA', { id: '123' });
} catch (error) {
  if (error instanceof MessagingError) {
    console.error(`Messaging failed: ${error.message}`);
  }
}
```

## @theluckystrike/webext-storage Errors
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const storage = createStorage(defineSchema({ count: 'number' }), 'local');
try {
  await storage.set('count', 42);
} catch (error) {
  console.error('Storage error:', error); // quota exceeded, etc.
}
```

## Async/Await Patterns
```typescript
// Safe get
async function safeGetTab(tabId: number) {
  try { return await chrome.tabs.get(tabId); }
  catch { return null; }
}

// Batch with allSettled
const results = await Promise.allSettled(tabIds.map(id => chrome.tabs.get(id)));
const tabs = results.filter((r): r is PromiseFulfilledResult<chrome.tabs.Tab> => r.status === 'fulfilled').map(r => r.value);
```

## Listener Error Handling
```typescript
// Always catch in listeners — uncaught errors crash service worker
chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    await processAlarm(alarm);
  } catch (error) {
    console.error(`Alarm ${alarm.name} failed:`, error);
  }
});

// Message listener with error response
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg)
    .then(result => sendResponse({ success: true, data: result }))
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true;
});
```

## Extension Context Invalidated
```typescript
function safeSendMessage(msg: any) {
  try {
    chrome.runtime.sendMessage(msg);
  } catch (error) {
    if ((error as Error).message.includes('Extension context invalidated')) {
      cleanup(); // Extension updated — content script orphaned
    }
  }
}
```

## Retry Pattern
```typescript
async function retry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Unreachable');
}
```

## Debugging
- Service worker: `chrome://extensions` → "Inspect views: service worker"
- Popup: Right-click popup → "Inspect"
- Content script: Page DevTools → Sources → Content scripts
- Errors button: `chrome://extensions` → extension card → "Errors"

## Common Pitfalls
1. Not checking `chrome.runtime.lastError` in callbacks
2. Swallowing Promise rejections
3. Throwing in event listeners (crashes SW)
4. Assuming tabs/windows exist
5. Not handling extension update orphaned content scripts
6. Ignoring storage quota limits

## Cross-References
- Guide: `docs/guides/debugging-extensions.md`
- Guide: `docs/guides/advanced-debugging.md`
- Reference: `docs/reference/message-passing-patterns.md`
