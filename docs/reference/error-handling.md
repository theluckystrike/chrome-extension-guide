# Error Handling Reference

## chrome.runtime.lastError
```typescript
chrome.tabs.create({ url: 'invalid://url' }, (tab) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    return;
  }
});
```

## Promise Rejection (MV3)
```typescript
try {
  const tab = await chrome.tabs.create({ url: 'bad' });
} catch (e) {
  console.error(e.message);
}
```

## Common Errors by API

### Tabs
- `"No tab with id: X"` — tab closed
- `"Cannot access contents of url"` — missing host permission
- `"Tabs cannot be edited right now"` — browser busy

### Storage
- `"QUOTA_BYTES quota exceeded"` — 10MB local / 100KB sync limit
- `"MAX_WRITE_OPERATIONS_PER_HOUR exceeded"` — sync rate limit

### Messaging
- `"Could not establish connection. Receiving end does not exist."` — no listener
- `"The message port closed before a response was received."` — no async return true
- `"Extension context invalidated."` — extension updated/reloaded

### Scripting
- `"Cannot access a chrome:// URL"` — restricted URL
- `"Missing host permission for the tab"` — need host_permissions/activeTab

## @theluckystrike/webext-messaging
```typescript
import { createMessenger, MessagingError } from '@theluckystrike/webext-messaging';
const m = createMessenger<Msgs>();
try {
  await m.sendMessage('ACTION', data);
} catch (e) {
  if (e instanceof MessagingError) console.error(e.message);
}
```

## @theluckystrike/webext-storage
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const storage = createStorage(defineSchema({ key: 'string' }), 'local');
try { await storage.set('key', 'val'); }
catch (e) { console.error('Quota?', e); }
```

## Patterns

### Safe Get
```typescript
async function safeGetTab(id: number) {
  try { return await chrome.tabs.get(id); }
  catch { return null; }
}
```

### Batch with allSettled
```typescript
const results = await Promise.allSettled(ids.map(id => chrome.tabs.get(id)));
const tabs = results.filter(r => r.status === 'fulfilled').map(r => r.value);
```

### Listener Protection
```typescript
chrome.alarms.onAlarm.addListener(async (alarm) => {
  try { await processAlarm(alarm); }
  catch (e) { console.error(`Alarm ${alarm.name}:`, e); }
});
```

### Extension Context Invalidated
```typescript
try { chrome.runtime.sendMessage(msg); }
catch (e) {
  if (e.message.includes('Extension context invalidated')) cleanup();
}
```

### Retry
```typescript
async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  for (let i = 0; i < n; i++) {
    try { return await fn(); }
    catch (e) { if (i === n - 1) throw e; await new Promise(r => setTimeout(r, 2 ** i * 1000)); }
  }
  throw new Error('unreachable');
}
```

## Common Pitfalls
1. Not checking `chrome.runtime.lastError` — logs warning
2. Throwing in event listeners — crashes service worker
3. Assuming tabs/windows exist
4. Orphaned content scripts after extension update
5. Ignoring storage quota

## Cross-References
- `docs/guides/debugging-extensions.md`, `docs/guides/advanced-debugging.md`
