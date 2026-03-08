---
layout: default
title: "Alarms and Scheduling in Chrome Extensions — Developer Guide"
description: "Master the chrome.alarms API for reliable background task scheduling in Manifest V3 extensions. Learn to create periodic and one-time alarms, replace setInterval, and implement cron-like patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/alarms-and-scheduling/"
---

# Alarms and Scheduling in Chrome Extensions

## Overview {#overview}

The `chrome.alarms` API is the foundation of reliable background task scheduling in Manifest V3 extensions. Unlike `setInterval()` and `setTimeout()`, which fail when Chrome terminates your service worker to conserve memory, alarms persist across restarts and wake your extension when needed.

This guide covers everything you need to know about scheduling in Chrome extensions—from basic one-time alarms to complex cron-like patterns.

## Why Alarms Replace setInterval in MV3 {#why-alarms}

In Manifest V2, developers commonly used JavaScript's `setInterval()` in background pages:

```javascript
// MV2 - This doesn't work reliably in MV3
setInterval(() => {
  checkForNewEmails();
}, 60000); // Check every minute
```

This approach has critical problems in MV3:

1. **Service workers terminate** - Chrome unloads idle service workers after ~30 seconds of inactivity
2. **Timers don't survive termination** - `setInterval` stops when the worker is killed
3. **No persistence** - Timers reset when the browser restarts

The `chrome.alarms` API solves all these issues:

```javascript
// MV3 - Reliable scheduling with chrome.alarms
chrome.alarms.create("checkEmails", {
  delayInMinutes: 1,
  periodInMinutes: 1
});
```

## Required Permission {#permission}

Add the `"alarms"` permission to your `manifest.json`:

```json
{
  "manifest_version": 3,
  "permissions": ["alarms"],
  "background": {
    "service_worker": "background.js"
  }
}
```

## Creating Alarms {#creating-alarms}

### One-Time Alarms

Fire once after a specified delay:

```javascript
// Fire after 5 minutes
chrome.alarms.create("oneTimeTask", {
  delayInMinutes: 5
});

// Fire at a specific Unix timestamp
chrome.alarms.create("scheduledTask", {
  when: Date.now() + 30 * 60 * 1000 // 30 minutes from now
});
```

### Periodic (Repeating) Alarms

Fire repeatedly at a set interval:

```javascript
// First fires after 1 minute, then every 30 minutes
chrome.alarms.create("periodicSync", {
  delayInMinutes: 1,
  periodInMinutes: 30
});
```

The `periodInMinutes` property automatically reschedules the alarm after each firing.

## Minimum Alarm Intervals {#minimum-interval}

Chrome enforces a **minimum interval of 1 minute** for alarms in production extensions:

| Environment | Minimum Interval |
|-------------|-------------------|
| Production  | 1 minute          |
| Unpacked (dev mode) | ~1 second (use sparingly) |

This restriction exists to prevent battery drain and excessive background activity. If you need sub-minute precision, consider using:

- **Chrome's native APIs** (notifications, webNavigation)
- **Third-party libraries** that work within constraints

## Handling Alarm Events {#handling-alarms}

Register a listener in your service worker to respond when alarms fire:

```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`Alarm fired: ${alarm.name}`);

  switch (alarm.name) {
    case "syncData":
      syncDataToServer();
      break;
    case "checkNotifications":
      checkForNotifications();
      break;
    case "cleanupCache":
      cleanOldCacheEntries();
      break;
  }
});
```

**Important:** Register the listener at the top level of your service worker, not inside an async function.

## Alarm Persistence Across Restarts {#persistence}

One of the key advantages of `chrome.alarms`:

- Alarms persist when Chrome terminates the service worker
- Alarms persist across browser restarts
- Chrome wakes your service worker when an alarm fires

```javascript
// Check if an alarm already exists before creating
chrome.alarms.get("periodicSync", (existingAlarm) => {
  if (!existingAlarm) {
    chrome.alarms.create("periodicSync", {
      delayInMinutes: 1,
      periodInMinutes: 15
    });
  }
});

// Or with Promise syntax (Chrome 111+)
const alarm = await chrome.alarms.get("periodicSync");
if (!alarm) {
  await chrome.alarms.create("periodicSync", {
    delayInMinutes: 1,
    periodInMinutes: 15
  });
}
```

## Managing Multiple Alarms {#managing-multiple}

### Getting Alarm Info

```javascript
chrome.alarms.get("syncData", (alarm) => {
  if (alarm) {
    console.log(`Next fire: ${new Date(alarm.scheduledTime)}`);
    console.log(`Period: ${alarm.periodInMinutes} minutes`);
  } else {
    console.log("Alarm not found");
  }
});
```

### Listing All Alarms

```javascript
chrome.alarms.getAll((alarms) => {
  alarms.forEach((alarm) => {
    console.log(`${alarm.name}: ${new Date(alarm.scheduledTime)}`);
  });
});
```

### Clearing Alarms

```javascript
// Clear a specific alarm
await chrome.alarms.clear("oldTask");

// Clear all alarms
await chrome.alarms.clearAll();
```

### Practical Example: Multiple Scheduled Tasks

```javascript
// Initialize all scheduled tasks
function initializeAlarms() {
  // Daily sync at 9 AM
  const scheduleDailySync = () => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(9, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    chrome.alarms.create("dailySync", {
      when: target.getTime(),
      periodInMinutes: 24 * 60 // Every 24 hours
    });
  };

  // Hourly cleanup
  chrome.alarms.create("hourlyCleanup", {
    delayInMinutes: 1,
    periodInMinutes: 60
  });

  // Quick polling every 5 minutes
  chrome.alarms.create("quickPoll", {
    delayInMinutes: 1,
    periodInMinutes: 5
  });

  scheduleDailySync();
}

// Handle each alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case "dailySync":
      performDailySync();
      break;
    case "hourlyCleanup":
      cleanupOldData();
      break;
    case "quickPoll":
      checkForUpdates();
      break;
  }
});
```

## Cron-Like Scheduling Patterns {#cron-like}

For complex schedules (specific days, times), you can implement cron-like logic:

### Custom Cron Scheduler

```javascript
class CronScheduler {
  constructor() {
    this.alarms = new Map();
  }

  // Parse simple cron: "0 9 * * 1-5" = 9 AM weekdays
  schedule(cron, taskName, callback) {
    // Convert cron to next run time
    const nextRun = this.parseCron(cron);
    if (!nextRun) return;

    chrome.alarms.create(taskName, {
      when: nextRun.getTime(),
      periodInMinutes: this.getPeriodMinutes(cron)
    });

    this.alarms.set(taskName, { cron, callback });
  }

  parseCron(cron) {
    const [minute, hour, dayMonth, month, dayWeek] = cron.split(" ");
    const now = new Date();

    // Simple implementation - check next 7 days
    for (let i = 0; i < 7; i++) {
      const check = new Date(now);
      check.setDate(check.getDate() + i);
      check.setHours(parseInt(hour) || 0);
      check.setMinutes(parseInt(minute) || 0);

      if (this.matches(check, dayMonth, month, dayWeek)) {
        return check;
      }
    }
    return null;
  }

  matches(date, dayMonth, month, dayWeek) {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const wd = date.getDay();

    const dayMatch = dayMonth === "*" || dayMonth.split(",").includes(String(d));
    const monthMatch = month === "*" || month.split(",").includes(String(m));
    const weekMatch = dayWeek === "*" ||
      (dayWeek.includes("-") &&
        wd >= parseInt(dayWeek.split("-")[0]) &&
        wd <= parseInt(dayWeek.split("-")[1]));

    return dayMatch && monthMatch && weekMatch;
  }

  getPeriodMinutes(cron) {
    // For simplicity, recalculate on each run
    return null;
  }
}
```

### Using chrome-alarms-cron Library

For a production-ready solution, use the **`@theluckystrike/chrome-alarms-cron`** library:

```bash
npm install @theluckystrike/chrome-alarms-cron
```

```javascript
import { createCronScheduler } from "@theluckystrike/chrome-alarms-cron";

const scheduler = createCronScheduler();

// Schedule with cron syntax
await scheduler.schedule("0 9 * * 1-5", "weekdayMorning", () => {
  console.log("Good morning! Starting daily sync...");
});

await scheduler.schedule("0 */6 * * *", "everySixHours", () => {
  console.log("Running 6-hour sync...");
});

// Get scheduled tasks
const tasks = await scheduler.getScheduledTasks();
console.log("Active schedules:", tasks);

// Cancel a schedule
await scheduler.cancel("weekdayMorning");
```

This library handles the complexity of cron parsing while respecting Chrome's minimum interval requirements.

## Complete Example: Notification Extension {#complete-example}

```javascript
// background.js - Service Worker

// Initialize alarms on install
chrome.runtime.onInstalled.addListener(() => {
  // Check for notifications every 15 minutes
  chrome.alarms.create("checkNotifications", {
    delayInMinutes: 1,
    periodInMinutes: 15
  });

  // Daily digest at 8 PM
  scheduleDailyDigest();
});

function scheduleDailyDigest() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(20, 0, 0, 0); // 8 PM

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  chrome.alarms.create("dailyDigest", {
    when: target.getTime(),
    periodInMinutes: 24 * 60
  });
}

// Handle all alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case "checkNotifications":
      await checkAndNotify();
      break;
    case "dailyDigest":
      await sendDailyDigest();
      break;
  }
});

async function checkAndNotify() {
  try {
    const response = await fetch("https://api.example.com/notifications");
    const data = await response.json();

    if (data.newItems) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "New Notifications",
        message: `You have ${data.newItems} new items`
      });
    }
  } catch (error) {
    console.error("Failed to check notifications:", error);
  }
}

async function sendDailyDigest() {
  const stats = await getDailyStats();
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Daily Summary",
    message: `You had ${stats.views} views today`
  });
}
```

## Best Practices {#best-practices}

1. **Always check for existing alarms** before creating duplicates
2. **Use descriptive alarm names** for easier debugging
3. **Handle alarm events efficiently** - do heavy work in separate contexts
4. **Respect the 1-minute minimum** in production code
5. **Use `periodInMinutes`** for repeating alarms instead of recreating
6. **Store state in chrome.storage** - service worker memory is ephemeral
7. **Test with dev mode** for shorter intervals, but verify production behavior

## API Reference Summary {#api-reference}

| Method | Description |
|--------|-------------|
| `chrome.alarms.create(name, alarmInfo)` | Create a new alarm |
| `chrome.alarms.get(name)` | Get info about a specific alarm |
| `chrome.alarms.getAll()` | Get all active alarms |
| `chrome.alarms.clear(name)` | Clear a specific alarm |
| `chrome.alarms.clearAll()` | Clear all alarms |
| `chrome.alarms.onAlarm` | Event fired when an alarm fires |

## Related Articles {#related-articles}

- [Alarms API](../guides/alarms-api.md) - Complete reference for the chrome.alarms API
- [Background Service Workers](../guides/service-worker-lifecycle.md) - Understanding service worker lifecycle and persistence
- [MV2 to MV3 Migration](../guides/mv2-to-mv3-migration.md) - Migrating from setInterval to chrome.alarms

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
