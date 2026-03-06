# alarms Permission Reference

## What It Does
- Grants access to the `chrome.alarms` API
- Schedule code to run at specific times or intervals
- MV3 replacement for `setTimeout`/`setInterval` (which don't survive service worker termination)
- Minimum interval: 30 seconds (Chrome 120+; was 1 minute before). Unpacked extensions have no minimum during development.

## Why alarms Instead of setTimeout
In MV3, the background is a service worker that can be terminated at any time. `setTimeout` and `setInterval` are unreliable. `chrome.alarms` persists across service worker restarts.

| Feature | setTimeout/setInterval | chrome.alarms |
|---------|----------------------|---------------|
| Survives SW termination | No | Yes |
| Minimum delay | 0ms | 30s (Chrome 120+; no limit for unpacked) |
| Persistent | No | Yes |
| Use case | Short delays | Scheduled/periodic tasks |

## Manifest Configuration
```json
{ "permissions": ["alarms"] }
```

Low-warning permission — no user prompt.

## Using with @theluckystrike/webext-permissions

```ts
import { checkPermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

const result = await checkPermission("alarms");
console.log(result.description); // "Schedule code to run at specific times"

PERMISSION_DESCRIPTIONS.alarms; // "Schedule code to run at specific times"
```

## Using with @theluckystrike/webext-messaging

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

## Using with @theluckystrike/webext-storage

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

## Key API Methods

| Method | Description |
|--------|-------------|
| `alarms.create(name, alarmInfo)` | Create a one-time or repeating alarm |
| `alarms.get(name)` | Get a specific alarm |
| `alarms.getAll()` | Get all active alarms |
| `alarms.clear(name)` | Cancel a specific alarm |
| `alarms.clearAll()` | Cancel all alarms |
| `alarms.onAlarm` | Event — fires when an alarm triggers |

## AlarmInfo Options
- `delayInMinutes` — fire once after N minutes
- `when` — fire once at a specific timestamp (Date.now() + ms)
- `periodInMinutes` — repeat every N minutes (min 30s prod)

## Common Patterns
1. Periodic data sync (API polling, feed updates)
2. Reminder/notification scheduler
3. Token refresh (auth tokens before expiry)
4. Daily cleanup tasks
5. Badge update intervals

## Gotchas
- Minimum interval is 30 seconds in production (Chrome 120+; was 1 minute before). Unpacked extensions have no minimum limit during development.
- Alarms are not precise — they may fire slightly late under system load
- `alarms.create()` with same name replaces the existing alarm
- Must register `onAlarm` listener at top level of service worker (not inside async)
- Alarms persist across browser restarts but are NOT guaranteed to persist across extension updates
- Maximum 500 concurrent alarms per extension (Chrome 117+); `create()` fails beyond this limit

## Related Permissions
- [notifications](notifications.md) — often paired to show alerts when alarms fire
- [storage](storage.md) — store alarm metadata and configuration

## API Reference
- [Alarms API Reference](../api-reference/alarms-api.md)
- [Chrome alarms API docs](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [Alarms API deep dive](../api-reference/alarms-api.md)
