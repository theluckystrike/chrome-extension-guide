---
layout: default
title: "Chrome Extension Storage Changes. Manifest V3 Guide"
description: "Handle storage changes with the chrome.storage API in Manifest V3."
canonical_url: "https://bestchromeextensions.com/mv3/storage-changes/"
---

Storage API Changes in Manifest V3

Why Storage Matters More in MV3 {#why-storage-matters-more-in-mv3}
- MV2: persistent background page could hold state in memory
- MV3: service worker terminates. ALL in-memory state is lost
- `chrome.storage` is now the PRIMARY state management solution
- `@theluckystrike/webext-storage` provides type-safe wrapper

What Changed {#what-changed}
- Storage API itself is largely unchanged between MV2 and MV3
- But its importance increased dramatically
- Service worker pattern: read from storage on wake, write on change

Storage Areas {#storage-areas}
| Area | Limit | Persistence | Sync | Use Case |
|------|-------|-------------|------|----------|
| `local` | 10 MB | Device only | No | Large data, caches, sensitive data |
| `sync` | 100 KB total, 8 KB/item | All devices | Yes | User preferences, settings |
| `session` | 10 MB | Browser session | No | Temporary state (Chrome 102+, MV3 only) |
| `managed` | Policy-defined | Read-only | Enterprise | Admin-configured settings |

session Storage (Chrome 102+, MV3 only) {#session-storage-chrome-102-mv3-only}
```javascript
// Persists across SW terminations but NOT browser restarts
await chrome.storage.session.set({ tempData: "value" });
const { tempData } = await chrome.storage.session.get("tempData");
```
- Perfect for: authentication tokens, temporary caches, session state
- Faster than `local` (in-memory backing)
- 10 MB limit (was 1 MB in Chrome 111 and earlier)
- Cleared on browser close, extension reload, or extension update
- Set access from content scripts: `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })`

Promise-Based API (MV3) {#promise-based-api-mv3}
```javascript
// MV2 style (callbacks)
chrome.storage.local.get('key', (result) => { console.log(result.key); });

// MV3 style (promises)
const { key } = await chrome.storage.local.get('key');
```
- All storage methods return Promises in MV3
- `@theluckystrike/webext-storage` always uses Promises:
```typescript
const storage = createStorage(defineSchema({ theme: 'string' }), 'local');
const theme = await storage.get('theme'); // Type-safe, Promise-based
```

Migration from MV2 Background Page State {#migration-from-mv2-background-page-state}
```javascript
// MV2: in-memory state (worked because background was persistent)
let cache = {};
chrome.runtime.onMessage.addListener((msg) => {
  cache[msg.key] = msg.value; // Worked fine
});

// MV3: must persist to storage
const storage = createStorage(defineSchema({ cache: 'string' }), 'session');
chrome.runtime.onMessage.addListener(async (msg) => {
  const cache = JSON.parse(await storage.get('cache') || '{}');
  cache[msg.key] = msg.value;
  await storage.set('cache', JSON.stringify(cache));
});
```

Performance Considerations {#performance-considerations}
- Storage calls involve IPC. async, not instant
- Batch reads: `storage.getMany(['a','b','c'])` or `storage.getAll()`
- Batch writes: `storage.setMany({ a: 1, b: 2, c: 3 })`
- Cache hot values in-memory, sync with `storage.watch()`
- `session` storage is fastest (in-memory backing)
- Cross-ref: `docs/guides/performance.md`

Storage Quotas {#storage-quotas}
- `local`: 10 MB (was 5 MB in Chrome 113 and earlier; can request `"unlimitedStorage"` permission)
- `sync`: 100 KB total, 8 KB per item, 512 items max, 1800 writes/hour, 120 writes/min
- `session`: 10 MB (was 1 MB in Chrome 111 and earlier)
- Check usage: `chrome.storage.local.getBytesInUse(null, (bytes) => {})`

Common MV3 Storage Patterns {#common-mv3-storage-patterns}
- State machine: store current state, restore on wake-up
- Config cache: read config once, watch for changes
- Queue pattern: store pending operations, process on wake-up
- Cross-context sync: popup writes settings, content script watches with `storage.watch()`

Common Mistakes {#common-mistakes}
- Using `localStorage` in SW. not available (no DOM)
- Not awaiting storage operations. data may not persist before SW terminates
- Exceeding sync quotas. 8 KB per item limit is easy to hit with JSON
- Forgetting `session` storage exists. perfect for temporary state
- Not using batch operations. multiple individual calls are slow
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
