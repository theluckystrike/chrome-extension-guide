Chrome Idle API

The Chrome Idle API (`chrome.idle`) enables extensions to detect when users become inactive. Use it for security features, auto-save, and analytics.

Core Functions

- `chrome.idle.queryState`. Query current idle state on demand
- `chrome.idle.setDetectionInterval`. Configure idle detection threshold
- `chrome.idle.onStateChanged`. Listen for real-time state changes

> Reference: [developer.chrome.com/docs/extensions/reference/api/idle](https://developer.chrome.com/docs/extensions/reference/api/idle)

Permissions

Add `"idle"` to your `manifest.json`:

```json
{ "permissions": ["idle"], "background": { "service_worker": "background.js" } }
```

Idle States

Three states: `"active"`, `"idle"`, `"locked"`. Priority: locked > idle > active

chrome.idle.queryState

Check current idle state:

```javascript
chrome.idle.queryState(60, (state) => {
  console.log(`State: ${state}`); // "active" | "idle" | "locked"
});
```

chrome.idle.setDetectionInterval

- Default: 60 seconds
- Minimum: 15 seconds (Chrome enforces this)

```javascript
chrome.idle.setDetectionInterval(60);   // Default
chrome.idle.setDetectionInterval(15); // Minimum
chrome.idle.setDetectionInterval(300); // 5 min - battery friendly
```

chrome.idle.onStateChanged

Listen for state changes:

```javascript
chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === "active") handleUserActive();
  else if (newState === "idle") handleUserIdle();
  else if (newState === "locked") handleScreenLocked();
});
```

Building an Auto-Lock Extension

```javascript
// background.js - Locks after 5 minutes of inactivity
const CONFIG = { IDLE_THRESHOLD: 60, LOCK_TIMEOUT: 300 };
let idleTimer = null;

chrome.idle.setDetectionInterval(CONFIG.IDLE_THRESHOLD);
chrome.idle.onStateChanged.addListener((state) => {
  if (state === "idle") {
    idleTimer = setTimeout(performAutoLock, CONFIG.LOCK_TIMEOUT * 1000);
  } else if (state === "active" && idleTimer) {
    clearTimeout(idleTimer);
  }
});

function performAutoLock() {
  chrome.storage.local.remove(["authToken", "sessionData"]);
  chrome.action.setBadgeText({ text: "" });
}
```

Building Activity Tracking

```javascript
class ActivityTracker {
  constructor() { this.sessions = []; this.init(); }
  init() {
    chrome.idle.setDetectionInterval(60);
    chrome.idle.onStateChanged.addListener((s) => this.track(s));
  }
  track(state) {
    const now = Date.now();
    if (state === "active") this.currentSession = { start: now };
    else if ((state === "idle" || state === "locked") && this.currentSession) {
      this.currentSession.end = now;
      this.currentSession.duration = now - this.currentSession.start;
      this.sessions.push(this.currentSession);
      chrome.storage.local.set({ activitySessions: this.sessions });
      this.currentSession = null;
    }
  }
}
new ActivityTracker();
```

Power Management

- Shorter intervals = more power usage; use default (60s) for balance
- Consider longer intervals when on battery
- Clean up listeners when not needed

```javascript
function optimizeForPower(isOnBattery) {
  chrome.idle.setDetectionInterval(isOnBattery ? 300 : 60);
}
```

Security Extension Example

```javascript
chrome.idle.setDetectionInterval(30);
chrome.idle.onStateChanged.addListener((state) => {
  if (state === "active") chrome.action.setBadgeText({ text: "" });
  else if (state === "locked") {
    chrome.storage.local.remove(["tempData", "sensitiveInfo"]);
    chrome.action.setBadgeText({ text: "" });
  }
});
```

Best Practices

1. Use default interval (60s) for balance between responsiveness and battery
2. Handle all three states including "locked"
3. Query state before sensitive operations
4. Clear sensitive data when screen is locked
5. Respect minimum interval of 15 seconds

Summary

The Chrome Idle API provides:
- `queryState()`. Check current idle state
- `setDetectionInterval()`. Configure sensitivity (15-60+ seconds)
- `onStateChanged`. Listen for real-time changes
- States: `active`, `idle`, `locked`

Common use cases: auto-save, security locks, activity analytics, power management.
