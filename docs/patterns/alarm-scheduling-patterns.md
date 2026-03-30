---
layout: default
title: "Chrome Extension Alarm Scheduling Patterns. Best Practices"
description: "Schedule tasks with the Alarms API."
canonical_url: "https://bestchromeextensions.com/patterns/alarm-scheduling-patterns/"
last_modified_at: 2026-01-15
---

Alarm Scheduling Patterns

Advanced patterns for the `chrome.alarms` API in Chrome extensions.

Core API Methods {#core-api-methods}

```javascript
// Create an alarm
chrome.alarms.create('my-alarm', {
  delayInMinutes: 5,           // One-shot: fires once after delay
  periodInMinutes: 10          // Periodic: fires every 10 minutes
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(alarm.name, alarm.scheduledTime);
});

// Query alarms
const alarms = await chrome.alarms.getAll();

// Clear specific alarm
await chrome.alarms.clear('my-alarm');

// Clear all alarms
await chrome.alarms.clearAll();
```

Minimum Intervals {#minimum-intervals}

- Production: Minimum 1 minute (`periodInMinutes: 1`)
- Dev mode: Minimum 30 seconds

Shorter intervals may be throttled or ignored by Chrome.

Named Alarms as Routing Keys {#named-alarms-as-routing-keys}

Use descriptive names to route to specific handlers:

```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  const handlers = {
    'data-sync': handleDataSync,
    'notification-check': handleNotifications,
    'cleanup-temp': handleCleanup
  };
  
  if (handlers[alarm.name]) {
    handlers[alarm.name]();
  }
});
```

Scheduled Tasks {#scheduled-tasks}

Calculate `delayInMinutes` from a target time:

```javascript
function scheduleAt(targetDate) {
  const now = Date.now();
  const delayMs = targetDate.getTime() - now;
  const delayInMinutes = Math.max(1, Math.floor(delayMs / 60000));
  
  chrome.alarms.create('scheduled-task', {
    delayInMinutes,
    periodInMinutes: 24 * 60 // Daily repeat
  });
}
```

Time Zone Handling {#time-zone-handling}

Always store UTC timestamps; convert for display:

```javascript
// Store UTC
const scheduledUTC = alarm.scheduledTime;

// Display in local time
const localTime = new Date(scheduledUTC).toLocaleString();
```

Alarm Persistence {#alarm-persistence}

Alarms survive service worker restart. Chrome automatically restores them.

Alarm Recovery on Startup {#alarm-recovery-on-startup}

Recreate missing alarms after extension updates:

```javascript
chrome.runtime.onInstalled.addListener(async () => {
  const alarms = await chrome.alarms.getAll();
  const alarmNames = alarms.map(a => a.name);
  
  if (!alarmNames.includes('daily-sync')) {
    chrome.alarms.create('daily-sync', {
      delayInMinutes: 60,
      periodInMinutes: 24 * 60
    });
  }
});
```

Alarm Cancellation {#alarm-cancellation}

Clear specific alarms when tasks are cancelled:

```javascript
async function cancelTask(taskId) {
  await chrome.alarms.clear(`task-${taskId}`);
}
```

Alarm vs setTimeout {#alarm-vs-settimeout}

| Feature | `chrome.alarms` | `setTimeout` |
|---------|-----------------|--------------|
| Survives SW sleep |  |  |
| Persists restart |  |  |
| Precise timing | Limited |  |

Calendar-like Scheduling {#calendar-like-scheduling}

```javascript
// Daily at midnight
chrome.alarms.create('daily-midnight', {
  delayInMinutes: minutesUntilMidnight(),
  periodInMinutes: 24 * 60
});

// Weekly on Monday
chrome.alarms.create('weekly-monday', {
  delayInMinutes: minutesUntilMonday(),
  periodInMinutes: 7 * 24 * 60
});
```

See Also {#see-also}

- [API Reference: alarms API](../api_reference/alarms-api.md)
- [Guides: Alarms Scheduling](../guides/alarms-scheduling.md)
- [Patterns: Long-running Operations](../patterns/long-running-operations.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
