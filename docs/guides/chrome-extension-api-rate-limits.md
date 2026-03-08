---
layout: default
title: "Chrome Extension API Rate Limits — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-api-rate-limits/"
---
# Chrome API Rate Limits and Quotas

This guide documents the rate limits and quotas enforced by Chrome for extension APIs. Understanding these limits is essential for building reliable extensions that function correctly across all users.

## Storage Quotas

### storage.local

The `storage.local` API provides persistent storage for extension data.

- **Default quota**: 10 MB total
- **Unlimited storage**: Available with the `unlimitedStorage` permission
- **Write operations**: Limited to 120 writes per minute

When approaching the 10 MB limit, users will receive a warning. The `unlimitedStorage` permission removes these restrictions entirely.

### storage.sync

The `storage.sync` API synchronizes data across user's Chrome instances.

- **Total quota**: 100 KB across all keys
- **Per-item quota**: 8 KB maximum per individual key
- **Write limit**: 120 writes per minute
- **Batch operations**: Bundled automatically to reduce write counts

The per-item limit of 8 KB is a hard constraint—larger values will fail with a `QUOTA_BYTES_PER_ITEM` error.

## Alarm API Limits

The `chrome.alarms` API schedules code execution at specific times.

- **Minimum interval**: 30 seconds (since Chrome 120; was 1 minute prior)
- **Minimum `periodInMinutes`**: 0.5 (30 seconds)
- **Maximum alarms**: No explicit limit, but practical constraints apply

Use the minimum interval wisely. Alarms firing too frequently impact performance and battery life. For sub-minute precision, consider using `requestAnimationFrame` or Web Workers instead.

## Notification Rate Limiting

Platform-specific throttling applies to the Notifications API:

- **Chrome OS**: 5 notifications per 30 seconds per app
- **Windows**: Similar throttling, varies by Windows version
- **Linux**: Notification daemon-dependent

Excessive notifications may be suppressed or queued. Batch related notifications to avoid hitting limits.

## declarativeNetRequest Limits

The `declarativeNetRequest` API modifies network requests declaratively.

| Rule Type | Limit |
|-----------|-------|
| Static rules (guaranteed minimum) | 30,000 |
| Dynamic rules | 30,000 |
| Regex rules | 1,000 |

Static rules are defined in `ruleset` JSON files. Dynamic rules can be added at runtime via `updateDynamicRules()`. Regex rules have higher overhead—use static rules when possible.

## Badge Text

No explicit rate limit exists for `chrome.action.setBadgeText()`, but rapid updates cause visual flicker. Badge updates are asynchronous and may not render between calls.

**Best practice**: Debounce badge updates to once per second maximum.

## chrome.tabs.query

No hard limit exists, but `chrome.tabs.query()` becomes expensive with large tab sets (100+ tabs). The API scans all open tabs across all windows.

**Optimization**: Use event listeners (`chrome.tabs.onUpdated`, `chrome.tabs.onCreated`) instead of polling with `query()`.

## Message Passing

No explicit rate limit exists, but performance degrades with excessive message passing. Each message incurs serialization and context switching overhead.

**Recommendation**: Batch related data and minimize message frequency. Use `chrome.storage` for inter-context communication when real-time delivery isn't required.

## Downloads API

The `chrome.downloads` API has concurrent download limits:

- **Concurrent downloads**: Browser-dependent (typically 6-8)
- **Queue management**: Use `pause()`, `resume()`, and `cancel()` to manage flow

Exceeding concurrent limits queues downloads automatically.

## Identity API

The `chrome.identity` API has token refresh limits:

- **Token refresh**: Rate-limited per Google Account
- **Retry strategy**: Implement exponential backoff on failures

Token caching reduces API calls. Store tokens securely and refresh only when expired or invalid.

## Strategies for Working Within Limits

### Batching Writes

Aggregate data before writing to storage:

```javascript
const pendingWrites = [];
function queueWrite(key, value) {
  pendingWrites.push({ key, value });
  if (pendingWrites.length >= 10) flushWrites();
}
```

### Debouncing Updates

Coalesce rapid updates into single operations:

```javascript
let updateTimer = null;
function debouncedBadgeUpdate(count) {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    chrome.action.setBadgeText({ text: String(count) });
  }, 500);
}
```

### Caching API Results

Cache frequently accessed data to reduce API calls:

```javascript
let tabCache = { timestamp: 0, data: null };
async function getCachedTabs() {
  if (Date.now() - tabCache.timestamp < 5000) return tabCache.data;
  tabCache.data = await chrome.tabs.query({});
  tabCache.timestamp = Date.now();
  return tabCache.data;
}
```

## Detecting Quota Errors

Catch specific error types to handle quota violations gracefully:

```javascript
try {
  await chrome.storage.local.set({ largeData: bigObject });
} catch (error) {
  if (error.message.includes('QUOTA_BYTES')) {
    // Handle quota exceeded - compress data or request unlimitedStorage
  }
}
```

Common error codes:
- `QUOTA_EXCEEDED`: Storage limit reached
- `MAX_WRITE_OPERATIONS_PER_MINUTE`: Too many writes
- `QUOTA_BYTES_PER_ITEM`: Item too large for storage.sync

## Related Resources

- [Size Limits Reference](/reference/size-limits.md)
- [Storage API Deep Dive](/api-reference/storage-api-deep-dive.md)
- [Rate Limiting Patterns](/patterns/rate-limiting.md)

## Related Articles

- [Rate Limiting Patterns](../patterns/rate-limiting.md)
- [API Mocking](../guides/chrome-extension-api-mocking.md)
