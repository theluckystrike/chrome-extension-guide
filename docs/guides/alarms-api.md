# Chrome Alarms API Guide

## Overview
The `chrome.alarms` API provides a way to schedule code to run periodically or at specified times. This is essential for background tasks in Chrome Extensions, especially in Manifest V3 where service workers replace background pages. The Alarms API solves the problem that `setInterval` and `setTimeout` cannot persist after service worker termination.

**Official Reference:** [developer.chrome.com/docs/extensions/reference/api/alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms)

## Permission Requirements
Add the `"alarms"` permission to your `manifest.json`:
```json
{
  "permissions": ["alarms"],
  "background": {
    "service_worker": "background.js"
  }
}
```

## chrome.alarms.create — Creating Alarms

### Basic Syntax
```javascript
chrome.alarms.create(string name, AlarmCreateInfo options, optional function callback)
```

### One-Time Alarm (Delay)
```javascript
// Fire once after specified delay (in minutes)
chrome.alarms.create("oneTimeTask", {
  delayInMinutes: 5
});
```

### Repeating Alarm (Periodic)
```javascript
// Fire after initial delay, then repeat at specified interval
chrome.alarms.create("periodicTask", {
  delayInMinutes: 10,
  periodInMinutes: 30
});
```

### Alarm at Specific Time
```javascript
// Fire at exact timestamp (milliseconds since epoch)
const targetTime = new Date("2024-12-25T09:00:00").getTime();
chrome.alarms.create("dailyReminder", {
  when: targetTime
});
```

### AlarmCreateInfo Options
| Property | Type | Description |
|----------|------|-------------|
| `delayInMinutes` | number | Minutes until alarm fires (one-time) |
| `periodInMinutes` | number | Repeat interval in minutes |
| `when` | number | Exact firing time (Unix timestamp in ms) |

**Note:** If both `delayInMinutes` and `when` are provided, `when` takes precedence. For repeating alarms, use `periodInMinutes`.

## chrome.alarms.get / getAll — Querying Alarms

### Get Single Alarm
```javascript
// Get alarm by name
chrome.alarms.get("myAlarm", (alarm) => {
  if (alarm) {
    console.log(`Next fire: ${new Date(alarm.scheduledTime)}`);
    console.log(`Period: ${alarm.periodInMinutes} minutes`);
    console.log(`Scheduled time: ${alarm.scheduledTime}`);
  } else {
    console.log("Alarm not found");
  }
});

// Promise-based (using chrome.alarms.get returns void in callback, but we can wrap)
const getAlarm = (name) => new Promise((resolve) => {
  chrome.alarms.get(name, (alarm) => resolve(alarm));
});
```

### Get All Alarms
```javascript
// List all active alarms
chrome.alarms.getAll((alarms) => {
  console.log(`Total alarms: ${alarms.length}`);
  alarms.forEach((alarm) => {
    console.log(`- ${alarm.name}: fires at ${new Date(alarm.scheduledTime)}`);
  });
});

// Promise-based
const getAllAlarms = () => new Promise((resolve) => {
  chrome.alarms.getAll((alarms) => resolve(alarms));
});
```

## chrome.alarms.clear / clearAll — Removing Alarms

### Clear Single Alarm
```javascript
// Remove specific alarm by name
chrome.alarms.clear("oldAlarm", (wasCleared) => {
  console.log(wasCleared ? "Alarm removed" : "Alarm not found");
});
```

### Clear All Alarms
```javascript
// Remove all alarms
chrome.alarms.clearAll(() => {
  console.log("All alarms cleared");
});
```

## chrome.alarms.onAlarm — Event Listener

### Basic Usage
```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`Alarm fired: ${alarm.name}`);
  console.log(`Scheduled time: ${new Date(alarm.scheduledTime)}`);
  
  if (alarm.name === "dataSync") {
    performSync();
  }
});
```

### Handling Different Alarm Types
```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case "morningNotification":
      sendMorningAlert();
      break;
    case "dataBackup":
      backupUserData();
      break;
    case "cleanupTask":
      performCleanup();
      break;
  }
});
```

**Critical:** Register `onAlarm` at the top level of your service worker file, NOT inside async functions or event handlers. The listener must be registered when the service worker starts to receive events.

## Replacing setInterval in Manifest V3

### The Problem
In MV2, developers used `setInterval` in background pages:
```javascript
// MV2 - BROKEN IN MV3
setInterval(() => {
  checkForUpdates();
}, 60000); // Every minute
```

This doesn't work in MV3 because service workers can be terminated after 30 seconds of inactivity.

### The Solution: chrome.alarms
```javascript
// MV3 - Using chrome.alarms
chrome.alarms.create("periodicCheck", {
  delayInMinutes: 1,
  periodInMinutes: 60  // Repeat every hour after initial 1-minute delay
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "periodicCheck") {
    checkForUpdates();
  }
});
```

### Sub-Minute Precision (Development Only)
The minimum alarm period is 30 seconds in production. For more precise timing during development:
```javascript
chrome.alarms.create("preciseTask", {
  delayInMinutes: 0.1,  // 6 seconds (works in unpacked extensions)
  periodInMinutes: 0.1
});
```

**Note:** Short periods (< 30 seconds) are silently clamped in production builds.

## Persistent Scheduling

### Creating Persistent Alarms
Alarms persist even after browser restart. Create them in the install/update handler:
```javascript
chrome.runtime.onInstalled.addListener(() => {
  // Create alarms that survive browser restarts
  chrome.alarms.create("dailyCleanup", {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60  // Daily
  });
  
  chrome.alarms.create("hourlySync", {
    delayInMinutes: 60,
    periodInMinutes: 60
  });
});

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}
```

### Restoring Alarms After Update
```javascript
chrome.runtime.onUpdateAvailable.addListener(() => {
  // Refresh alarm schedules on extension update
  chrome.alarms.clearAll(() => {
    chrome.alarms.create("refreshedTask", { periodInMinutes: 30 });
  });
});
```

## Building a Reminder Extension

### Complete Example
```javascript
// background.js - Reminder Extension

// Store reminders in chrome.storage
const ReminderStorage = {
  async getReminders() {
    return new Promise((resolve) => {
      chrome.storage.local.get("reminders", (result) => {
        resolve(result.reminders || []);
      });
    });
  },
  
  async saveReminder(reminder) {
    const reminders = await this.getReminders();
    reminders.push(reminder);
    await chrome.storage.local.set({ reminders });
  },
  
  async removeReminder(id) {
    const reminders = await this.getReminders();
    const filtered = reminders.filter(r => r.id !== id);
    await chrome.storage.local.set({ reminders: filtered });
  }
};

// Create alarm for a reminder
async function scheduleReminder(reminder) {
  const delay = reminder.time - Date.now();
  
  if (delay <= 0) {
    console.log("Reminder time has passed");
    return;
  }
  
  const delayInMinutes = delay / 60000;
  
  chrome.alarms.create(`reminder-${reminder.id}`, {
    delayInMinutes: delayInMinutes
  });
}

// Handle alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("reminder-")) {
    const reminderId = alarm.name.replace("reminder-", "");
    const reminders = await ReminderStorage.getReminders();
    const reminder = reminders.find(r => r.id === reminderId);
    
    if (reminder) {
      // Show notification
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Reminder",
        message: reminder.message
      });
      
      // Remove completed reminder
      await ReminderStorage.removeReminder(reminderId);
    }
  }
});

// API for popup to create reminders
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "createReminder") {
    scheduleReminder(message.reminder);
    sendResponse({ success: true });
  }
  return true;
});
```

### Manifest Configuration
```json
{
  "permissions": ["alarms", "storage", "notifications"],
  "background": {
    "service_worker": "background.js"
  }
}
```

## Best Practices

### 1. Unique Alarm Names
Use descriptive, unique names to avoid conflicts:
```javascript
chrome.alarms.create(`sync-${extensionVersion}`, { periodInMinutes: 60 });
```

### 2. Check Before Creating
Prevent duplicate alarms:
```javascript
async function createAlarmSafe(name, options) {
  const existing = await new Promise(resolve => 
    chrome.alarms.get(name, resolve)
  );
  
  if (!existing) {
    chrome.alarms.create(name, options);
  }
}
```

### 3. Graceful Offline Handling
```javascript
chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    await doBackgroundTask();
  } catch (error) {
    console.error("Task failed:", error);
    // Schedule retry
    chrome.alarms.create("retryTask", { delayInMinutes: 5 });
  }
});
```

### 4. Debugging Alarms
```javascript
chrome.alarms.getAll((alarms) => {
  alarms.forEach(a => {
    console.log(`[${a.name}] Next: ${new Date(a.scheduledTime)}`);
  });
});
```

## Common Pitfalls

1. **Registering listener inside async function** — Listener won't receive events
2. **Using setInterval** — Doesn't work in MV3 service workers
3. **Setting period < 30 seconds** — Silently clamped in production
4. **Not handling extension updates** — Alarms persist but handlers may change
5. **Creating duplicate alarms** — Same name overwrites previous (can be intentional)

## Summary
The Chrome Alarms API is essential for any extension requiring scheduled background tasks in Manifest V3. It provides reliable, persistent scheduling that survives service worker termination and browser restarts. Use it to replace `setInterval`, implement reminder systems, schedule periodic syncs, and more.
