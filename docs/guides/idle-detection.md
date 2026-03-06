# Idle Detection API

## Introduction

The Chrome Idle Detection API (`chrome.idle`) allows your extension to detect when the user becomes idle, active, or when the screen is locked. This is essential for building extensions that need to respond to user presence, such as auto-saving documents, implementing session timeouts, or showing away status.

The Idle Detection API provides three key capabilities:
- Query the current idle state at any time
- Set up listeners to be notified when idle state changes
- Configure how quickly the extension detects idle state

This guide covers all aspects of working with the chrome.idle API in Manifest V3.

> **Note**: This API is available in both Manifest V2 and Manifest V3 extensions. The examples in this guide use the Manifest V3 service worker syntax.

## Permissions

### manifest.json Configuration

To use the Idle Detection API, you need to add the `"idle"` permission to your manifest:

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

The `"idle"` permission is considered a "grant on demand" permission in Manifest V3. This means:
- Users won't be prompted for this permission during installation
- The permission is granted when your extension first calls the idle API
- You can request it dynamically using `chrome.permissions.request()`

### Dynamic Permission Request

For more granular control, you can request the idle permission dynamically:

```javascript
// Check if permission is already granted
chrome.permissions.contains({ permissions: ["idle"] }, (granted) => {
  if (!granted) {
    // Request the permission
    chrome.permissions.request({ permissions: ["idle"] }, (granted) => {
      if (granted) {
        console.log("Idle permission granted");
        initializeIdleDetection();
      } else {
        console.log("Idle permission denied");
      }
    });
  } else {
    initializeIdleDetection();
  }
});
```

### Checking Permission Status

You can check if your extension has idle permission at any time:

```javascript
function checkIdlePermission() {
  chrome.permissions.contains({ permissions: ["idle"] }, (result) => {
    console.log("Idle permission status:", result ? "granted" : "not granted");
  });
}
```

## Idle States

The chrome.idle API defines three distinct states:

### 1. "active" State
The user is actively using the device. This means there is recent keyboard or mouse activity, or touch input on touch-capable devices.

```javascript
// Example: active state means user is present and engaged
// User is typing, moving mouse, touching screen, etc.
```

### 2. "idle" State
The user has not interacted with the device for a specified period of time. The system is on but the user is away.

```javascript
// Example: idle state - user stepped away
// No keyboard/mouse/touch activity for the configured interval
```

### 3. "locked" State
The device is locked, typically by a screen saver, login screen, or the user manually locking it. This state takes precedence over "idle".

```javascript
// Example: locked state
// Screen is locked, user needs to authenticate to continue
```

State priority (highest to lowest): locked > idle > active

## Detecting Current Idle State

### Using queryState()

The `chrome.idle.queryState()` method allows you to check the current idle state at any moment. This is useful when you need to know the state immediately, such as before performing an important action.

#### Basic Syntax

```javascript
chrome.idle.queryState(detectionIntervalInSeconds, callback)
```

Parameters:
- `detectionIntervalInSeconds` (integer): The threshold in seconds used to determine when to consider the user as idle. If the user has been inactive for this many seconds, the state will be "idle".
- `callback` (function): Callback function that receives the idle state string.

#### Example: Checking Current State

```javascript
// Query the current idle state with a 60-second threshold
function checkCurrentIdleState() {
  chrome.idle.queryState(60, (state) => {
    console.log("Current idle state:", state);
    
    switch (state) {
      case "active":
        console.log("User is active - continue normal operations");
        break;
      case "idle":
        console.log("User is idle - pause non-essential tasks");
        break;
      case "locked":
        console.log("Screen is locked - pause all user-facing tasks");
        break;
    }
  });
}
```

#### Example: Auto-Save Before Critical Operations

```javascript
// Check idle state before performing auto-save
function performAutoSave() {
  chrome.idle.queryState(30, (state) => {
    if (state === "active" || state === "idle") {
      // Save even if idle - we don't want to lose data
      saveDocumentToStorage();
    } else if (state === "locked") {
      // Don't save when locked - might be security concern
      console.log("Skipping save - screen is locked");
    }
  });
}
```

### Handling Errors

The `queryState()` method can throw errors in certain scenarios:

```javascript
chrome.idle.queryState(60, (state) => {
  if (chrome.runtime.lastError) {
    console.error("Error querying idle state:", chrome.runtime.lastError.message);
    return;
  }
  // Process state normally
  console.log("State:", state);
});
```

## Setting Detection Intervals

### Using setDetectionInterval()

The `chrome.idle.setDetectionInterval()` method sets the interval used to determine when the user is considered idle. This is crucial for balancing responsiveness with battery life.

#### Basic Syntax

```javascript
chrome.idle.setDetectionInterval(intervalInSeconds)
```

Parameters:
- `intervalInSeconds` (integer): Threshold in seconds before considering the user idle.

#### Default and Recommended Intervals

```javascript
// Default Chrome threshold is 60 seconds
// You can customize based on your use case

// For aggressive detection (quick response)
chrome.idle.setDetectionInterval(30);  // 30 seconds

// For balanced approach (recommended)
chrome.idle.setDetectionInterval(60);  // 1 minute

// For passive detection (battery friendly)
chrome.idle.setDetectionInterval(300);  // 5 minutes
```

#### Setting Interval in Background Script

```javascript
// background.js - Set detection interval when extension starts
function initializeIdleDetection() {
  // Set 60-second detection interval
  chrome.idle.setDetectionInterval(60);
  
  console.log("Idle detection initialized with 60-second interval");
}

// Call on service worker startup
initializeIdleDetection();
```

#### Dynamic Interval Adjustment

You can change the detection interval based on time of day or user preferences:

```javascript
function adjustDetectionInterval() {
  const hour = new Date().getHours();
  
  // More sensitive during work hours (9 AM - 6 PM)
  if (hour >= 9 && hour <= 18) {
    chrome.idle.setDetectionInterval(30);
    console.log("Detection interval set to 30 seconds (work hours)");
  } else {
    // Less sensitive during off hours to save battery
    chrome.idle.setDetectionInterval(120);
    console.log("Detection interval set to 120 seconds (off hours)");
  }
}
```

## Listening for State Changes

### Using onStateChanged

The `chrome.idle.onStateChanged` event fires when the system idle state changes. This is the primary way to react to user presence changes in real-time.

#### Basic Syntax

```javascript
chrome.idle.onStateChanged.addListener(callback)
```

Parameters:
- `callback` (function): Listener function that receives the new idle state string.

#### Example: Basic State Change Listener

```javascript
// background.js
chrome.idle.onStateChanged.addListener((newState) => {
  console.log("Idle state changed to:", newState);
  
  switch (newState) {
    case "active":
      handleUserReturn();
      break;
    case "idle":
      handleUserAway();
      break;
    case "locked":
      handleScreenLock();
      break;
  }
});

function handleUserReturn() {
  console.log("User returned - resuming normal operations");
  // Resume any paused tasks
  resumeSync();
  showNotification("Welcome back!", "Resume your session");
}

function handleUserAway() {
  console.log("User is away - pausing non-essential tasks");
  // Pause heavy operations
  pauseAutoSave();
}

function handleScreenLock() {
  console.log("Screen locked - securing data");
  // Clear sensitive data from memory
  clearSensitiveData();
  // Stop all network requests
  pauseAllSync();
}
```

### Complete Implementation Example

Here's a complete background script that implements idle detection:

```javascript
// background.js - Complete Idle Detection Implementation

// Configuration
const CONFIG = {
  DETECTION_INTERVAL: 60,        // seconds
  AUTO_SAVE_INTERVAL: 300000,    // milliseconds (5 minutes)
  SYNC_INTERVAL: 60000,          // milliseconds (1 minute)
  LOCK_TIMEOUT: 300000           // milliseconds (5 minutes)
};

// State management
let autoSaveTimer = null;
let syncTimer = null;
let lastActiveTime = Date.now();

// Initialize idle detection
function initialize() {
  // Set detection interval
  chrome.idle.setDetectionInterval(CONFIG.DETECTION_INTERVAL);
  
  // Set up state change listener
  chrome.idle.onStateChanged.addListener(handleStateChange);
  
  console.log("Idle detection initialized");
}

// Handle idle state changes
function handleStateChange(state) {
  console.log("State changed:", state);
  
  switch (state) {
    case "active":
      onUserActive();
      break;
    case "idle":
      onUserIdle();
      break;
    case "locked":
      onScreenLocked();
      break;
  }
}

// User became active
function onUserActive() {
  lastActiveTime = Date.now();
  console.log("User is active");
  
  // Resume auto-save
  startAutoSave();
  
  // Resume sync
  startSync();
  
  // Check if we missed any updates while away
  checkForMissedUpdates();
}

// User became idle
function onUserIdle() {
  console.log("User is idle");
  
  // Pause auto-save (user is away)
  stopAutoSave();
  
  // Continue sync but less frequently
  adjustSyncInterval(300000); // 5 minutes
}

// Screen was locked
function onScreenLocked() {
  console.log("Screen locked");
  
  // Stop all activities
  stopAutoSave();
  stopSync();
  
  // Clear any sensitive data from memory
  clearSensitiveData();
  
  // Send notification to other parts of extension
  chrome.runtime.sendMessage({
    type: "SCREEN_LOCKED"
  });
}

// Auto-save functions
function startAutoSave() {
  if (autoSaveTimer) return;
  
  autoSaveTimer = setInterval(() => {
    performAutoSave();
  }, CONFIG.AUTO_SAVE_INTERVAL);
  
  console.log("Auto-save started");
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
    console.log("Auto-save stopped");
  }
}

function performAutoSave() {
  // Query current state first
  chrome.idle.queryState(CONFIG.DETECTION_INTERVAL, (state) => {
    if (state === "active" || state === "idle") {
      // Perform save
      saveCurrentState();
    }
  });
}

// Sync functions
function startSync() {
  if (syncTimer) return;
  
  syncTimer = setInterval(() => {
    syncData();
  }, CONFIG.SYNC_INTERVAL);
  
  console.log("Sync started");
}

function stopSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    console.log("Sync stopped");
  }
}

function adjustSyncInterval(interval) {
  stopSync();
  CONFIG.SYNC_INTERVAL = interval;
  startSync();
}

function syncData() {
  // Sync implementation
  console.log("Syncing data...");
}

function checkForMissedUpdates() {
  // Check what happened while user was away
  console.log("Checking for missed updates...");
}

// Helper functions
function saveCurrentState() {
  console.log("Auto-saving current state...");
}

function clearSensitiveData() {
  console.log("Clearing sensitive data...");
}

// Initialize when extension starts
initialize();
```

## Use Cases

### Use Case 1: Auto-Save Functionality

One of the most common use cases for idle detection is implementing auto-save functionality. Here's how to build it:

```javascript
// Auto-save manager
class AutoSaveManager {
  constructor(options = {}) {
    this.interval = options.interval || 60000; // 1 minute default
    this.enabled = true;
    this.lastSaveTime = Date.now();
    this.timer = null;
    this.idleThreshold = options.idleThreshold || 60;
    
    this.init();
  }
  
  init() {
    // Listen for state changes
    chrome.idle.onStateChanged.addListener((state) => {
      if (state === "idle" || state === "locked") {
        // Save immediately when user becomes idle
        this.save();
      } else if (state === "active") {
        // Resume auto-save when user returns
        this.start();
      }
    });
  }
  
  start() {
    if (!this.enabled) return;
    
    this.timer = setInterval(() => {
      this.save();
    }, this.interval);
    
    console.log("Auto-save started");
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("Auto-save stopped");
    }
  }
  
  save() {
    chrome.idle.queryState(this.idleThreshold, (state) => {
      // Don't save if screen is locked (security)
      if (state === "locked") {
        console.log("Skipping save - screen locked");
        return;
      }
      
      // Perform save
      this.performSave();
    });
  }
  
  performSave() {
    // Implementation depends on your storage needs
    console.log("Saving data...", new Date());
    this.lastSaveTime = Date.now();
    
    // Notify content scripts
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "AUTO_SAVE_COMPLETE",
          timestamp: this.lastSaveTime
        });
      }
    });
  }
}

// Usage
const autoSave = new AutoSaveManager({
  interval: 60000,        // Save every minute
  idleThreshold: 30      // 30 second idle threshold
});
autoSave.start();
```

### Use Case 2: Session Timeout

Implement automatic session timeout for security-sensitive applications:

```javascript
// Session timeout manager
class SessionTimeoutManager {
  constructor(options = {}) {
    this.timeoutDuration = options.timeoutDuration || 900000; // 15 minutes
    this.warningDuration = options.warningDuration || 60000;  // 1 minute warning
    this.lastActivityTime = Date.now();
    this.timer = null;
    this.warningTimer = null;
    this.isActive = true;
    
    this.init();
  }
  
  init() {
    // Set detection interval
    chrome.idle.setDetectionInterval(30);
    
    // Listen for state changes
    chrome.idle.onStateChanged.addListener((state) => {
      if (state === "active") {
        this.onUserActive();
      } else if (state === "idle") {
        this.onUserIdle();
      } else if (state === "locked") {
        this.onScreenLocked();
      }
    });
  }
  
  onUserActive() {
    this.lastActivityTime = Date.now();
    this.isActive = true;
    
    // Clear any existing timers
    this.clearTimers();
    
    // Restart session timer
    this.startSessionTimer();
    
    console.log("Session timer reset");
  }
  
  onUserIdle() {
    // Start warning timer
    this.warningTimer = setTimeout(() => {
      this.showTimeoutWarning();
    }, this.timeoutDuration - this.warningDuration);
  }
  
  onScreenLocked() {
    // Lock session immediately
    this.lockSession();
  }
  
  startSessionTimer() {
    this.timer = setTimeout(() => {
      this.timeoutSession();
    }, this.timeoutDuration);
  }
  
  clearTimers() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }
  
  showTimeoutWarning() {
    // Notify user that session will expire
    chrome.runtime.sendMessage({
      type: "SESSION_TIMEOUT_WARNING",
      message: "Your session will expire in 1 minute due to inactivity."
    });
  }
  
  timeoutSession() {
    this.isActive = false;
    this.lockSession();
  }
  
  lockSession() {
    // Clear sensitive data
    this.clearSensitiveData();
    
    // Notify all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: "SESSION_LOCKED",
          reason: "timeout"
        });
      });
    });
    
    console.log("Session locked due to inactivity");
  }
  
  clearSensitiveData() {
    // Clear tokens, sensitive data, etc.
    chrome.storage.local.remove(["authToken", "userData"]);
  }
  
  // Manual methods
  extendSession() {
    this.onUserActive();
  }
  
  logout() {
    this.clearTimers();
    this.clearSensitiveData();
    this.isActive = false;
  }
}

// Usage
const sessionManager = new SessionTimeoutManager({
  timeoutDuration: 900000,  // 15 minutes
  warningDuration: 60000   // Warn 1 minute before
});
```

### Use Case 3: Away Status Integration

Build an extension that shows the user's away status (useful for team collaboration):

```javascript
// Away status manager
class AwayStatusManager {
  constructor() {
    this.status = "active";
    this.listeners = [];
    
    this.init();
  }
  
  init() {
    chrome.idle.setDetectionInterval(60);
    
    chrome.idle.onStateChanged.addListener((state) => {
      this.updateStatus(state);
    });
  }
  
  updateStatus(state) {
    const previousStatus = this.status;
    
    switch (state) {
      case "active":
        this.status = "active";
        break;
      case "idle":
        this.status = "away";
        break;
      case "locked":
        this.status = "do_not_disturb";
        break;
    }
    
    if (previousStatus !== this.status) {
      this.onStatusChange(previousStatus, this.status);
    }
  }
  
  onStatusChange(oldStatus, newStatus) {
    console.log(`Status changed: ${oldStatus} -> ${newStatus}`);
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      listener(oldStatus, newStatus);
    });
    
    // Update storage
    this.persistStatus(newStatus);
    
    // Broadcast to other components
    chrome.runtime.sendMessage({
      type: "STATUS_CHANGED",
      oldStatus,
      newStatus,
      timestamp: Date.now()
    });
  }
  
  async persistStatus(status) {
    await chrome.storage.local.set({
      userStatus: {
        status,
        lastChanged: Date.now()
      }
    });
  }
  
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }
  
  getStatus() {
    return this.status;
  }
  
  async getPersistedStatus() {
    const result = await chrome.storage.local.get("userStatus");
    return result.userStatus;
  }
  
  // Manual status override
  setStatus(status) {
    const validStatuses = ["active", "away", "do_not_disturb", "offline"];
    if (!validStatuses.includes(status)) {
      console.error("Invalid status:", status);
      return;
    }
    
    this.status = status;
    this.persistStatus(status);
  }
}

// Usage
const awayStatus = new AwayStatusManager();

// Listen for status changes
awayStatus.addListener((oldStatus, newStatus) => {
  // Update badge
  const badgeText = newStatus === "active" ? "" : newStatus.charAt(0).toUpperCase();
  const badgeColor = {
    "active": "#4CAF50",
    "away": "#FFC107",
    "do_not_disturb": "#F44336",
    "offline": "#9E9E9E"
  }[newStatus];
  
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
});

// Get initial status
chrome.idle.queryState(60, (state) => {
  awayStatus.updateStatus(state);
});
```

## Best Practices

### 1. Set Appropriate Detection Intervals

```javascript
// DON'T: Set very short intervals (battery drain)
chrome.idle.setDetectionInterval(5); // Check every 5 seconds

// DO: Set reasonable intervals based on use case
chrome.idle.setDetectionInterval(60); // Check every minute (recommended)

// DO: Make it configurable
const userSettings = await chrome.storage.local.get("idleThreshold");
chrome.idle.setDetectionInterval(userSettings.idleThreshold || 60);
```

### 2. Always Handle All States

```javascript
// DON'T: Only handle active/idle
chrome.idle.onStateChanged.addListener((state) => {
  if (state === "idle") {
    // Handle idle
  }
});

// DO: Handle all states explicitly
chrome.idle.onStateChanged.addListener((state) => {
  switch (state) {
    case "active":
      // Handle active
      break;
    case "idle":
      // Handle idle
      break;
    case "locked":
      // Handle locked
      break;
  }
});
```

### 3. Use queryState for Critical Operations

```javascript
// DON'T: Assume state based on last event
if (lastState === "idle") {
  // Might be wrong!
}

// DO: Query state before critical operations
chrome.idle.queryState(60, (state) => {
  if (state !== "locked") {
    performCriticalOperation();
  }
});
```

### 4. Clean Up Resources on Lock

```javascript
// Always clean up on screen lock
chrome.idle.onStateChanged.addListener((state) => {
  if (state === "locked") {
    // Clear timers
    clearAllTimers();
    
    // Clear sensitive data from memory
    sensitiveData = null;
    
    // Close unnecessary connections
    closeNetworkConnections();
  }
});
```

## Platform Limitations

The Idle Detection API has some platform-specific considerations:

- **Chrome OS**: The "locked" state may not fire reliably in all scenarios
- **Linux**: Screen lock detection depends on desktop session management
- **Mobile**: Not fully supported on Android Chrome
- **Mac**: May not detect screen lock in all cases (depends on system settings)

Always test your implementation across target platforms.

## Related APIs

- [chrome.alarms](alarms-scheduling.md) - For scheduling background tasks
- [chrome.storage](storage.md) - For persisting user preferences
- [chrome.runtime](runtime.md) - For messaging between components

## Summary

The chrome.idle API provides essential functionality for building responsive Chrome extensions:

1. **queryState()** - Check current idle state on demand
2. **setDetectionInterval()** - Configure detection sensitivity
3. **onStateChanged** - Listen for real-time state changes
4. **Three states** - active, idle, and locked

Use these capabilities to implement auto-save, session timeouts, away status, and more while following best practices for battery life and user privacy.
