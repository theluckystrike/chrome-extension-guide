---
layout: default
title: "alarms Permission Reference"
description: "Grants access to the API Schedule code to run at specific times or intervals MV3 replacement for / (which don't survive service worker termination)"
permalink: /permissions/alarms/
category: permissions
order: 2
canonical_url: "https://bestchromeextensions.com/permissions/alarms/"
last_modified_at: 2026-01-15
---

alarms Permission Reference

What It Does {#what-it-does}
- Grants access to the `chrome.alarms` API
- Schedule code to run at specific times or intervals
- MV3 replacement for `setTimeout`/`setInterval` (which don't survive service worker termination)
- Minimum interval: 30 seconds (Chrome 120+; was 1 minute before). Unpacked extensions have no minimum during development.

Why alarms Instead of setTimeout {#why-alarms-instead-of-settimeout}
In MV3, the background is a service worker that can be terminated at any time. `setTimeout` and `setInterval` are unreliable. `chrome.alarms` persists across service worker restarts.

| Feature | setTimeout/setInterval | chrome.alarms |
|---------|----------------------|---------------|
| Survives SW termination | No | Yes |
| Minimum delay | 0ms | 30s (Chrome 120+; no limit for unpacked) |
| Persistent | No | Yes |
| Use case | Short delays | Scheduled/periodic tasks |

Manifest Configuration {#manifest-configuration}
```json
{ "permissions": ["alarms"] }
```

Low-warning permission. no user prompt.

Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

```ts
import { checkPermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

const result = await checkPermission("alarms");
console.log(result.description); // "Schedule code to run at specific times"

PERMISSION_DESCRIPTIONS.alarms; // "Schedule code to run at specific times"
```

Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Pattern: popup controls scheduled tasks via background:

```ts
type Messages = {
  scheduleReminder: {
    request: { name: string; delayMinutes: number; message: string };
    response: { scheduled: boolean };
  };
  getActiveAlarms: {
    request: void;
    response: Array<{ name: string; scheduledTime: number }>;
  };
  cancelAlarm: {
    request: { name: string };
    response: { cancelled: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

msg.onMessage({
  scheduleReminder: async ({ name, delayMinutes, message }) => {
    await chrome.alarms.create(name, { delayInMinutes: delayMinutes });
    // Store the message for when alarm fires
    return { scheduled: true };
  },
  getActiveAlarms: async () => {
    const alarms = await chrome.alarms.getAll();
    return alarms.map(a => ({ name: a.name, scheduledTime: a.scheduledTime }));
  },
  cancelAlarm: async ({ name }) => {
    const cancelled = await chrome.alarms.clear(name);
    return { cancelled };
  },
});

chrome.alarms.onAlarm.addListener((alarm) => {
  // Handle alarm fire
  console.log(`Alarm fired: ${alarm.name}`);
});
```

Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Store alarm metadata and sync state:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  reminders: [] as Array<{ name: string; message: string; time: number }>,
  syncIntervalMinutes: 30,
  lastSyncTime: 0,
});
const storage = createStorage({ schema });

// Set up periodic sync alarm
const interval = await storage.get("syncIntervalMinutes");
chrome.alarms.create("periodic-sync", { periodInMinutes: interval });

// React to interval changes from options page
storage.watch("syncIntervalMinutes", async (newInterval) => {
  await chrome.alarms.clear("periodic-sync");
  chrome.alarms.create("periodic-sync", { periodInMinutes: newInterval });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "periodic-sync") {
    await performSync();
    await storage.set("lastSyncTime", Date.now());
  }
});
```

Key API Methods {#key-api-methods}

| Method | Description |
|--------|-------------|
| `alarms.create(name, alarmInfo)` | Create a one-time or repeating alarm |
| `alarms.get(name)` | Get a specific alarm |
| `alarms.getAll()` | Get all active alarms |
| `alarms.clear(name)` | Cancel a specific alarm |
| `alarms.clearAll()` | Cancel all alarms |
| `alarms.onAlarm` | Event. fires when an alarm triggers |

AlarmInfo Options {#alarminfo-options}
- `delayInMinutes`. fire once after N minutes
- `when`. fire once at a specific timestamp (Date.now() + ms)
- `periodInMinutes`. repeat every N minutes (min 30s prod)

Common Patterns {#common-patterns}
1. Periodic data sync (API polling, feed updates)
2. Reminder/notification scheduler
3. Token refresh (auth tokens before expiry)
4. Daily cleanup tasks
5. Badge update intervals

Gotchas {#gotchas}
- Minimum interval is 30 seconds in production (Chrome 120+; was 1 minute before). Unpacked extensions have no minimum limit during development.
- Alarms are not precise. they may fire slightly late under system load
- `alarms.create()` with same name replaces the existing alarm
- Must register `onAlarm` listener at top level of service worker (not inside async)
- Alarms persist across browser restarts but are NOT guaranteed to persist across extension updates
- Maximum 500 concurrent alarms per extension (Chrome 117+); `create()` fails beyond this limit

Related Permissions {#related-permissions}
- [notifications](notifications.md). often paired to show alerts when alarms fire
- [storage](storage.md). store alarm metadata and configuration

API Reference {#api-reference}
- [Alarms API Reference](../api-reference/alarms-api.md)
- [Chrome alarms API docs](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [Alarms API detailed look](../api-reference/alarms-api.md)

Frequently Asked Questions

How do I schedule tasks in a Chrome extension?
Use the chrome.alarms API to schedule code to run periodically or at a specific time. Unlike setTimeout, alarms persist across extension restarts and service worker wakes.

Does chrome.alarms work in Manifest V3?
Yes, chrome.alarms works in Manifest V3 but runs in the background service worker. Note that the service worker may be terminated between alarm fires.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
