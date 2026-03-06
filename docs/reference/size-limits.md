# Size Limits and Quotas Reference

This document provides a comprehensive reference for size limits, quotas, and constraints in Chrome Extensions (Manifest V3).

## Extension Package

| Limit | Value | Notes |
|-------|-------|-------|
| CRX file size | ~20 MB recommended | Chrome Web Store recommends keeping extensions under 20MB for faster downloads |
| ZIP upload limit | 50 MB | Maximum compressed package size for Chrome Web Store uploads |
| Unpacked extension | No strict limit | During development, unpacked extensions can be larger |

## Storage Quotas

### chrome.storage.local

| Property | Value | Notes |
|----------|-------|-------|
| Default quota | 10 MB | Default storage capacity for local data |
| With unlimitedStorage | Unlimited | Requires `"permissions": ["unlimitedStorage"]` in manifest |

### chrome.storage.sync

| Property | Value | Notes |
|----------|-------|-------|
| Total quota | 100 KB | Maximum combined storage across all items |
| Per-item quota | 8 KB | Maximum size for a single storage item |
| Maximum items | 512 | Maximum number of distinct keys |
| MAX_WRITE_OPERATIONS_PER_HOUR | 1800 | Hourly write operation limit |
| MAX_WRITE_OPERATIONS_PER_MINUTE | 120 | Minute-by-minute write operation limit |

### chrome.storage.session

| Property | Value | Notes |
|----------|-------|-------|
| Default quota | 10 MB | Available since Chrome 112+ |
| Persistence | Session-only | Data is cleared when the browser session ends |

> **Note**: For applications requiring large storage, use `chrome.storage.local` with the `unlimitedStorage` permission.

## Messaging Limits

### chrome.runtime.sendMessage

| Property | Value | Notes |
|----------|-------|-------|
| Message size | ~64 MB practical limit | No explicit documented limit; constrained by memory |
| Response timeout | None | Messages wait indefinitely for response |

### Native Messaging

| Direction | Limit | Notes |
|-----------|-------|-------|
| Incoming (to native app) | 1 MB | Maximum message size from extension to native app |
| Outgoing (from native app) | 4 GB | Maximum message size from native app to extension |

## Badge Limits

| Property | Value | Notes |
|----------|-------|-------|
| Maximum characters | 4 | Badge text is truncated beyond 4 characters |
| Visibility | Badge text must be set | Empty text hides the badge |

```javascript
// Badge usage example
chrome.action.setBadgeText({ text: '12' }); // Max 4 chars
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
```

## Alarm Limits

| Property | Value | Notes |
|----------|-------|-------|
| Minimum interval | 30 seconds | Alarms cannot be set to fire more frequently |
| Precision | ~1 minute | Alarms may be delayed by up to a minute |

```javascript
// Minimum alarm interval
chrome.alarms.create('myAlarm', {
  delayInMinutes: 0.5,  // 30 seconds minimum
  periodInMinutes: 1
});
```

## Commands (Keyboard Shortcuts)

| Property | Value | Notes |
|----------|-------|-------|
| Maximum shortcuts | 4 | Maximum number of keyboard shortcuts per extension |
| Scope options | "Global" or "Default" | Global shortcuts work even when Chrome isn't focused |

## Sessions API

| Property | Value | Notes |
|----------|-------|-------|
| MAX_SESSION_RESULTS | 25 | Maximum number of session entries retrieved per query |

## Service Worker

| Property | Value | Notes |
|----------|-------|-------|
| Idle timeout | ~30 seconds | Service worker terminates after 30 seconds of inactivity |
| Instance count | 1 | Only one service worker instance runs at a time |
| Lifetime events | fetch, message, alarm, etc. | Various events keep the service worker alive |

> **Best Practice**: Use `chrome.storage` to persist data since service workers can be terminated at any time.

## Notifications

| Property | Value | Notes |
|----------|-------|-------|
| Maximum buttons | 2 | Maximum number of action buttons in notifications |
| Recommended icon size | 80x80 pixels | Optimal icon dimensions for notifications |

```javascript
// Notification with buttons
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icon.png',
  title: 'Notification Title',
  message: 'Notification message',
  buttons: [
    { title: 'Button 1' },
    { title: 'Button 2' }
  ]
});
```

## Cross-References

For more detailed information, see:

- [Permissions: unlimitedStorage](../permissions/unlimitedStorage.md)
- [Permissions: storage](../permissions/storage.md)
- [Storage Patterns](../reference/storage-patterns.md)
