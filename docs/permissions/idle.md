---
title: "Idle Permission"
description: "- **Permission string:** `"idle"` - **Grants access to:** `chrome.idle` API - **Purpose:** Detects when user is idle or screen is locked
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/idle/"
--- Returns Promise resolving to `"active"`, `"idle"`, or `"..."
permalink: /permissions/idle/
category: permissions
order: 23
---

# Idle Permission

## Overview {#overview}

- **Permission string:** `"idle"`
- **Grants access to:** `chrome.idle` API
- **Purpose:** Detects when user is idle or screen is locked

---

## API Methods {#api-methods}

### `chrome.idle.queryState(detectionIntervalInSeconds)` {#chromeidlequerystatedetectionintervalinseconds}

Returns Promise resolving to `"active"`, `"idle"`, or `"locked"`.

```javascript
chrome.idle.queryState(30).then((state) => {
  console.log(`Current state: ${state}`);
});
```

### `chrome.idle.setDetectionInterval(intervalInSeconds)` {#chromeidlesetdetectionintervalintervalinseconds}

Sets threshold for idle detection (minimum 15 seconds).

```javascript
chrome.idle.setDetectionInterval(60);
```

### `chrome.idle.getAutoLockDelay()` {#chromeidlegetautolockdelay}

Returns system auto-lock delay in seconds (0 if never).

```javascript
chrome.idle.getAutoLockDelay().then((delay) => console.log(delay));
```

---

## Events {#events}

### `chrome.idle.onStateChanged.addListener(callback)` {#chromeidleonstatechangedaddlistenercallback}

Fires with new state: `"active"`, `"idle"`, or `"locked"`. Detection interval set by `setDetectionInterval` determines when "idle" fires.

```javascript
chrome.idle.onStateChanged.addListener((state) => {
  console.log(`State: ${state}`);
});
```

---

## Manifest Declaration {#manifest-declaration}

```json
{ "permissions": ["idle"] }
```

---

## Use Cases {#use-cases}

- **Auto-save drafts** when user goes idle
- **Presence detection** for collaboration tools
- **Security lockout**: lock extension UI when screen locks
- **Pause background sync** when idle to save resources
- **Activity tracking** and time management tools

---

## MV3 Considerations {#mv3-considerations}

- `onStateChanged` wakes the service worker
- Use with `chrome.alarms` for periodic idle checks
- Store last-known state in `@theluckystrike/webext-storage`

---

## Code Examples {#code-examples}

### Basic Idle Detection {#basic-idle-detection}

```javascript
chrome.idle.setDetectionInterval(30);
chrome.idle.onStateChanged.addListener((state) => {
  console.log(`User is: ${state}`);
});
```

### Auto-Save Pattern {#auto-save-pattern}

```javascript
let isDirty = false;

chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle' && isDirty) {
    saveToStorage('draft', getContent());
    isDirty = false;
  } else if (state === 'active') {
    isDirty = true;
  }
});
```

### Security Pattern {#security-pattern}

```javascript
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'locked') {
    localStorage.removeItem('authToken');
    sessionStorage.clear();
  }
});
```

### Presence Detection for Collaboration

```javascript
function updatePresence(state) {
  const status = state === 'active' ? 'available' : 'away';
  // Send presence update to your server
  fetch('/api/presence', {
    method: 'POST',
    body: JSON.stringify({ status, timestamp: Date.now() })
  });
}

chrome.idle.onStateChanged.addListener(updatePresence);
```

### Resource Management

```javascript
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle') {
    // Pause resource-intensive operations
    pauseSync();
    pauseNotifications();
  } else if (state === 'active') {
    // Resume operations
    resumeSync();
    processQueuedNotifications();
  }
});
```

## Common Use Cases

### Auto-Save and Draft Management
The most common use case for the idle API is automatically saving user work when they step away. This protects against data loss if the user forgets to save or if the browser crashes.

### Security and Privacy
Lock sensitive data or session information when the user is away or when the screen is locked. This is particularly important for extensions handling authentication tokens or sensitive documents.

### Presence Systems
For collaboration tools, track whether users are at their computers. This helps team members know when colleagues are available for quick questions or meetings.

### Battery and Resource Management
Reduce background activity when the user is away to conserve system resources and battery life. This includes pausing sync operations, reducing network requests, and limiting background processing.

### Time Tracking and Productivity
Track how much time users spend active versus idle. This is useful for productivity extensions that help users understand their work patterns and identify time wastage.

## Best Practices

### Set Appropriate Detection Intervals
The default detection interval may not suit all use cases. For auto-save, 30-60 seconds is typically good. For resource management, longer intervals (5-10 minutes) might be more appropriate.

### Handle All Three States
Your code should handle all three states: `active`, `idle`, and `locked`. Each represents a different level of user presence and may require different responses.

### Store Last Known State
In MV3, service workers can be terminated. Store the last known idle state so you can take appropriate action when the service worker wakes up.

### Combine with Alarms for Periodic Checks
For continuous monitoring, combine idle detection with `chrome.alarms` to periodically check state even after the service worker has been terminated.

### Consider Battery Impact
Frequent state checks and listeners can impact battery life, especially on laptops. Balance the need for real-time updates with power efficiency.

### Test on Different Platforms
Idle detection behavior can vary between platforms (Windows, macOS, Linux). Test your extension on all target platforms to ensure consistent behavior.

### Provide User Control
Allow users to configure idle detection settings. Some users may want immediate idle detection while others prefer longer intervals.

---

## Cross-References {#cross-references}

- `permissions/power.md`
- `patterns/idle-detection.md`
- `guides/idle-detection.md`

## Frequently Asked Questions

### How do I detect when user is idle?
Use chrome.idle.queryState() to check current idle state, or chrome.idle.onStateChanged.addListener to be notified when idle state changes.

### Can I run code when user returns from idle?
Yes, listen to onStateChanged and check for "active" state to trigger actions when the user returns.
