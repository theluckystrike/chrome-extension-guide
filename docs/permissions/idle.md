# Idle Permission

## Overview

- **Permission string:** `"idle"`
- **Grants access to:** `chrome.idle` API
- **Purpose:** Detects when user is idle or screen is locked

---

## API Methods

### `chrome.idle.queryState(detectionIntervalInSeconds)`

Returns Promise resolving to `"active"`, `"idle"`, or `"locked"`.

```javascript
chrome.idle.queryState(30).then((state) => {
  console.log(`Current state: ${state}`);
});
```

### `chrome.idle.setDetectionInterval(intervalInSeconds)`

Sets threshold for idle detection (minimum 15 seconds).

```javascript
chrome.idle.setDetectionInterval(60);
```

### `chrome.idle.getAutoLockDelay()`

Returns system auto-lock delay in seconds (0 if never).

```javascript
chrome.idle.getAutoLockDelay().then((delay) => console.log(delay));
```

---

## Events

### `chrome.idle.onStateChanged.addListener(callback)`

Fires with new state: `"active"`, `"idle"`, or `"locked"`. Detection interval set by `setDetectionInterval` determines when "idle" fires.

```javascript
chrome.idle.onStateChanged.addListener((state) => {
  console.log(`State: ${state}`);
});
```

---

## Manifest Declaration

```json
{ "permissions": ["idle"] }
```

---

## Use Cases

- **Auto-save drafts** when user goes idle
- **Presence detection** for collaboration tools
- **Security lockout**: lock extension UI when screen locks
- **Pause background sync** when idle to save resources
- **Activity tracking** and time management tools

---

## MV3 Considerations

- `onStateChanged` wakes the service worker
- Use with `chrome.alarms` for periodic idle checks
- Store last-known state in `@theluckystrike/webext-storage`

---

## Code Examples

### Basic Idle Detection

```javascript
chrome.idle.setDetectionInterval(30);
chrome.idle.onStateChanged.addListener((state) => {
  console.log(`User is: ${state}`);
});
```

### Auto-Save Pattern

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

### Security Pattern

```javascript
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'locked') {
    localStorage.removeItem('authToken');
    sessionStorage.clear();
  }
});
```

---

## Cross-References

- `permissions/power.md`
- `patterns/idle-detection.md`
- `guides/idle-detection.md`
