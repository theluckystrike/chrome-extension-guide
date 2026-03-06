# Service Worker Keep-Alive Patterns

## Understanding MV3 Service Worker Lifecycle

Chrome's Manifest V3 service workers have strict lifetime limits:
- **30 seconds** idle timeout (auto-terminates after 30s of inactivity)
- **5 minutes** hard limit (absolute maximum runtime)

This differs significantly from MV2 background pages which could run indefinitely.

## Legitimate Keep-Alive Patterns

### 1. Active Port Connections

The most reliable way to keep a service worker alive is through active port connections:

```javascript
// From popup/background script
const port = chrome.runtime.connect({ name: 'keepalive' });

// Service worker - handle the connection
chrome.runtime.onConnect.addListener((port) => {
  // Service worker stays alive while port is connected
  port.onDisconnect.addListener(() => {
    // Cleanup when popup closes
  });
});
```

### 2. Alarm-Based Periodic Tasks

For scheduled background work, use chrome.alarms API:

```javascript
// Create alarm (minimum 30s in dev, 1min in production)
chrome.alarms.create('periodic-task', {
  delayInMinutes: 1,
  periodInMinutes: 1
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodic-task') {
    // Perform periodic work
  }
});
```

### 3. Offscreen Documents

For truly persistent work requiring long-running operations:

```javascript
// Create offscreen document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['WORKERS', 'LOCAL_STORAGE'],
  justification: 'Background data processing'
});
```

## Anti-Patterns to Avoid

- **setInterval pings**: Unreliable and may be ignored by Chrome
- **nativeMessaging keepalive**: Considered abusive usage
- **Infinite promise chains**: Poor practice, harms ecosystem

## When to Use Keep-Alive vs Event-Driven Design

**Use keep-alive when:**
- User has an open popup interacting with the extension
- Completing a critical multi-step operation
- Real-time communication via ports

**Redesign for event-driven when:**
- Background sync can be scheduled with alarms
- Data processing can be chunked into smaller tasks
- Notifications or other push-based interactions suffice

## Chrome's Reasoning

These limits exist for good reasons:
- Battery life preservation on mobile and laptop
- Reduced memory usage across extensions
- Ecosystem health and stability

## Testing and Debugging

Monitor service worker lifecycle at: `chrome://serviceworker-internals`

## Graceful Shutdown Pattern

Always save state before termination:

```javascript
let pendingData = [];

chrome.runtime.onSuspend.addListener(() => {
  // Persist any pending data
  chrome.storage.local.set({ suspendedData: pendingData });
});
```

## Related Documentation

- [MV3 Service Workers](../mv3/service-workers.md)
- [Service Worker Lifecycle](../guides/service-worker-lifecycle.md)
- [Long-Running Operations](./long-running-operations.md)
