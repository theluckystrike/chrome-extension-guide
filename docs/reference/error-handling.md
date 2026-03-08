# Error Handling Reference

Quick reference for error handling in Chrome Extensions (Manifest V3).

## 1. chrome.runtime.lastError (MV2 Callbacks) {#1-chromeruntimelasterror-mv2-callbacks}

```js
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    return;
  }
  // Use tabs[0]
});
```

## 2. Promise Rejection with try/catch (MV3) {#2-promise-rejection-with-trycatch-mv3}

```js
async function getActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch (err) {
    console.error('Tab query failed:', err.message);
    throw err;
  }
}
```

## 3. Common Error Messages {#3-common-error-messages}

| API | Error | Cause |
|-----|-------|-------|
| `tabs` | "No tab with id" | Tab already closed |
| `tabs` | "Permission denied" | Missing host permission |
| `storage` | "QUOTA_BYTES" | Data exceeds 10MB limit |
| `storage` | "MAX_SCRIPT_WORKS" | Storage quota exceeded |
| `messaging` | "Could not establish connection" | Receiver not found |
| `messaging` | "Extension context invalidated" | Extension reloaded/unloaded |
| `scripting` | "Scripting disallowed" | Content script not injected |
| `scripting` | "Cannot access frame" | Cross-origin restriction |

## 4. @theluckystrike/webext-messaging MessagingError {#4-theluckystrikewebext-messaging-messagingerror}

```js
import { sendMessage, MessagingError } from '@theluckystrike/webext-messaging';

try {
  const response = await sendMessage('my-extension', { type: 'PING' });
} catch (err) {
  if (err instanceof MessagingError) {
    console.error(`Code: ${err.code}, Details: ${err.details}`);
    // COMMON_CODES: CONNECTION_FAILED, TIMEOUT, NO_RECEIVER
  }
}
```

## 5. @theluckystrike/webext-storage Error Handling {#5-theluckystrikewebext-storage-error-handling}

```js
import { storage } from '@theluckystrike/webext-storage';

try {
  await storage.set('key', { data: 'value' });
} catch (err) {
  if (err.message.includes('QUOTA_BYTES')) {
    // Handle quota exceeded - compress or clear old data
  }
}

// Batch operations
const results = await storage.getMany(['key1', 'key2', 'key3']);
```

## 6. Listener Protection Pattern {#6-listener-protection-pattern}

```js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    handleMessage(message, sender);
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ error: err.message });
  }
  return true; // Keep channel open for async response
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === 'complete') {
      // Process tab
    }
  } catch (err) {
    console.error('Tab update handler error:', err);
  }
});
```

## 7. Extension Context Invalidated {#7-extension-context-invalidated}

```js
// In content script - detect orphaned context
window.addEventListener('unload', () => {
  // Extension context may be invalid after reload
});

chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError?.message.includes('Extension context invalidated')) {
      // Extension reloaded - content script orphaned
    }
  });
});
```

## 8. Retry with Exponential Backoff {#8-retry-with-exponential-backoff}

```js
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 500) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage
const tab = await retryWithBackoff(() => chrome.tabs.get(tabId));
```

## 9. Promise.allSettled for Batch Operations {#9-promiseallsettled-for-batch-operations}

```js
async function updateMultipleSettings(settings) {
  const results = await Promise.allSettled(
    Object.entries(settings).map(([key, value]) => 
      chrome.storage.local.set({ [key]: value })
    )
  );

  const failed = results
    .map((r, i) => ({ key: Object.keys(settings)[i], ...r }))
    .filter(r => r.status === 'rejected');

  if (failed.length) {
    console.error('Failed settings:', failed.map(f => f.key));
  }
  return results;
}
```

## 10. Common Pitfalls {#10-common-pitfalls}

| Pitfall | Solution |
|---------|----------|
| Forgetting `return true` in async listeners | Always return true for async `sendResponse` |
| Not checking `chrome.runtime.lastError` in callbacks | Always check in MV2 callback APIs |
| Ignoring promise rejections | Use `.catch()` or `try/catch` |
| Orphaned content scripts after reload | Check context validity before messaging |
| Race conditions with tab IDs | Verify tab still exists before use |
| Storage quota exceeded | Monitor usage with `chrome.storage.local.getBytesInUse()` |
| Messaging timeout | Use `@theluckystrike/webext-messaging` with timeout option |

## Quick Checklist {#quick-checklist}

- [ ] Always wrap event listeners in try/catch
- [ ] Check `chrome.runtime.lastError` in callbacks
- [ ] Use try/catch with async/await
- [ ] Handle storage quota errors
- [ ] Implement retry logic for network-dependent ops
- [ ] Use `Promise.allSettled` for batch operations
- [ ] Handle extension context invalidation in content scripts
