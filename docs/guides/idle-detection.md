---
layout: default
title: "Chrome Extension Idle Detection — Developer Guide"
description: "Learn Chrome extension idle detection with this developer guide covering implementation, best practices, and code examples."
---
# Idle Detection API

## Introduction

The Chrome Idle Detection API (`chrome.idle`) enables extensions to detect when users become inactive, active, or when their screen is locked. This API is essential for building extensions that need to respond to user presence, such as auto-saving documents, implementing session timeouts, or displaying away status.

The Idle Detection API provides three core capabilities:
- Query the current idle state at any time
- Listen for idle state changes in real-time
- Configure detection sensitivity

> **Note**: This API is available in both Manifest V2 and Manifest V3. The examples use Manifest V3 service worker syntax.

## Permissions

Add the `"idle"` permission to your manifest:

```json
{
  "name": "My Idle Detection Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["idle"],
  "background": {
    "service_worker": "background.js"
  }
}
```

The `"idle"` permission must be declared in the manifest. It does not trigger a permission warning during installation.

## Idle States

The chrome.idle API defines three states:

- **"active"**: User is actively using the device with recent input
- **"idle"**: User has not interacted with the device for the specified period
- **"locked"**: Device is locked by screen saver, login screen, or manual lock

State priority: locked > idle > active

## Detecting Current Idle State

### Using queryState()

```javascript
chrome.idle.queryState(detectionIntervalInSeconds, callback)
```

Parameters:
- `detectionIntervalInSeconds`: Threshold in seconds to consider user idle
- `callback`: Receives the idle state string

```javascript
chrome.idle.queryState(60, (state) => {
  switch (state) {
    case "active": console.log("User is active"); break;
    case "idle": console.log("User is idle"); break;
    case "locked": console.log("Screen is locked"); break;
  }
});
```

### Auto-Save Example

```javascript
function performAutoSave() {
  chrome.idle.queryState(30, (state) => {
    if (state === "active" || state === "idle") {
      saveDocumentToStorage();
    } else if (state === "locked") {
      console.log("Skipping save - screen is locked");
    }
  });
}
```

## Setting Detection Intervals

### Using setDetectionInterval()

```javascript
chrome.idle.setDetectionInterval(intervalInSeconds)
```

```javascript
// Aggressive detection
chrome.idle.setDetectionInterval(30);
// Balanced (recommended)
chrome.idle.setDetectionInterval(60);
// Passive (battery friendly)
chrome.idle.setDetectionInterval(300);
```

### Dynamic Interval Adjustment

```javascript
function adjustDetectionInterval() {
  const hour = new Date().getHours();
  chrome.idle.setDetectionInterval(hour >= 9 && hour <= 18 ? 30 : 120);
}
```

## Listening for State Changes

### Using onStateChanged

```javascript
chrome.idle.onStateChanged.addListener((newState) => {
  console.log("Idle state changed to:", newState);
  
  switch (newState) {
    case "active": handleUserReturn(); break;
    case "idle": handleUserAway(); break;
    case "locked": handleScreenLock(); break;
  }
});

function handleUserReturn() { console.log("User returned"); }
function handleUserAway() { console.log("User is away"); }
function handleScreenLock() { console.log("Screen locked"); }
```

## Complete Implementation Example

```javascript
// background.js

const CONFIG = {
  DETECTION_INTERVAL: 60,
  AUTO_SAVE_INTERVAL: 300000,
  SYNC_INTERVAL: 60000
};

let autoSaveTimer = null;
let syncTimer = null;

function initialize() {
  chrome.idle.setDetectionInterval(CONFIG.DETECTION_INTERVAL);
  chrome.idle.onStateChanged.addListener(handleStateChange);
}

function handleStateChange(state) {
  switch (state) {
    case "active": onUserActive(); break;
    case "idle": onUserIdle(); break;
    case "locked": onScreenLocked(); break;
  }
}

function onUserActive() { startAutoSave(); startSync(); }
function onUserIdle() { stopAutoSave(); }

function onScreenLocked() {
  stopAutoSave();
  stopSync();
  clearSensitiveData();
}

function startAutoSave() {
  if (autoSaveTimer) return;
  autoSaveTimer = setInterval(performAutoSave, CONFIG.AUTO_SAVE_INTERVAL);
}

function stopAutoSave() {
  if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
}

function performAutoSave() {
  chrome.idle.queryState(CONFIG.DETECTION_INTERVAL, (state) => {
    if (state !== "locked") saveCurrentState();
  });
}

function startSync() {
  if (syncTimer) return;
  syncTimer = setInterval(syncData, CONFIG.SYNC_INTERVAL);
}

function stopSync() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

function saveCurrentState() { console.log("Auto-saving..."); }
function syncData() { console.log("Syncing data..."); }
function clearSensitiveData() { console.log("Clearing sensitive data..."); }

initialize();
```

## Use Cases

### Auto-Save Functionality

```javascript
class AutoSaveManager {
  constructor(options = {}) {
    this.interval = options.interval || 60000;
    this.idleThreshold = options.idleThreshold || 60;
    this.timer = null;
    this.init();
  }
  
  init() {
    chrome.idle.onStateChanged.addListener((state) => {
      if (state === "idle" || state === "locked") this.save();
      else if (state === "active") this.start();
    });
  }
  
  start() { this.timer = setInterval(() => this.save(), this.interval); }
  
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  
  save() {
    chrome.idle.queryState(this.idleThreshold, (state) => {
      if (state !== "locked") console.log("Saving data...");
    });
  }
}

const autoSave = new AutoSaveManager({ interval: 60000 });
autoSave.start();
```

### Session Timeout

```javascript
class SessionTimeoutManager {
  constructor(options = {}) {
    this.timeoutDuration = options.timeoutDuration || 900000;
    this.timer = null;
    this.init();
  }
  
  init() {
    chrome.idle.setDetectionInterval(30);
    chrome.idle.onStateChanged.addListener((state) => {
      if (state === "active") this.resetTimer();
      else if (state === "locked") this.lockSession();
    });
  }
  
  resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.lockSession(), this.timeoutDuration);
  }
  
  lockSession() {
    chrome.storage.local.remove(["authToken"]);
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: "SESSION_LOCKED" });
      });
    });
  }
}

const sessionManager = new SessionTimeoutManager({ timeoutDuration: 900000 });
```

### Away Status Integration

```javascript
class AwayStatusManager {
  constructor() { this.status = "active"; this.init(); }
  
  init() {
    chrome.idle.setDetectionInterval(60);
    chrome.idle.onStateChanged.addListener((state) => {
      const previousStatus = this.status;
      switch (state) {
        case "active": this.status = "active"; break;
        case "idle": this.status = "away"; break;
        case "locked": this.status = "do_not_disturb"; break;
      }
      if (previousStatus !== this.status) this.onStatusChange(previousStatus, this.status);
    });
  }
  
  onStatusChange(oldStatus, newStatus) {
    console.log(`Status: ${oldStatus} -> ${newStatus}`);
    const badgeColor = { "active": "#4CAF50", "away": "#FFC107", "do_not_disturb": "#F44336" }[newStatus];
    chrome.action.setBadgeText({ text: newStatus === "active" ? "" : "A" });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  }
}

const awayStatus = new AwayStatusManager();
```

## Best Practices

### 1. Set Appropriate Detection Intervals

```javascript
// DON'T: Set very short intervals (battery drain)
chrome.idle.setDetectionInterval(5);

// DO: Set reasonable intervals
chrome.idle.setDetectionInterval(60);
```

### 2. Always Handle All States

```javascript
chrome.idle.onStateChanged.addListener((state) => {
  switch (state) {
    case "active":
    case "idle":
    case "locked":
      handleAllStates(state);
      break;
  }
});
```

### 3. Use queryState for Critical Operations

```javascript
chrome.idle.queryState(60, (state) => {
  if (state !== "locked") performCriticalOperation();
});
```

### 4. Clean Up Resources on Lock

```javascript
chrome.idle.onStateChanged.addListener((state) => {
  if (state === "locked") { clearAllTimers(); sensitiveData = null; }
});
```

## Platform Limitations

- **Chrome OS**: The "locked" state may not fire reliably
- **Linux**: Screen lock detection depends on desktop session management
- **Mac**: May not detect screen lock in all cases
- **Mobile**: Not fully supported on Android Chrome

## Summary

The chrome.idle API provides essential functionality:

1. **queryState()** - Check current idle state on demand
2. **setDetectionInterval()** - Configure detection sensitivity
3. **onStateChanged** - Listen for real-time state changes
4. **Three states** - active, idle, and locked

Use these capabilities to implement auto-save, session timeouts, away status, and more.

## Related Articles

- [Idle API Reference](../api-reference/idle.md)
- [Power Management](../guides/power-management.md)
