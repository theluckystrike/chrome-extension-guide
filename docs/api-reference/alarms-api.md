---
layout: default
title: "Chrome Alarms API Complete Reference"
description: "The Chrome Alarms API schedules code to run periodically or at a specified time, providing reliable background task execution that survives service worker termination in Manifest V3."
---

# Chrome Alarms API Reference

The `chrome.alarms` API lets you schedule code to run periodically or at a specified time. In MV3, alarms are the primary way to perform background work since service workers can be terminated at any time — `setTimeout` and `setInterval` are unreliable.

## Permissions

```json
{
  "permissions": ["alarms"]
}
```

No user-facing warning. This is a low-sensitivity permission.

See the [alarms permission reference](../permissions/alarms.md) for details.

## Why Use Alarms Instead of setTimeout/setInterval

In Manifest V3, the background service worker can be terminated after ~30 seconds of inactivity. This means:

| Approach | Survives SW termination | Minimum interval |
|----------|------------------------|------------------|
| `setTimeout` | No | None |
| `setInterval` | No | None |
| `chrome.alarms` | Yes | 30 seconds |

Alarms are persisted by Chrome and will fire even if the service worker was terminated and restarted.

## Alarm Object

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Alarm identifier |
| `scheduledTime` | `number` | When the alarm will fire next (ms since epoch) |
| `periodInMinutes` | `number \| undefined` | Repeat interval (absent for one-shot alarms) |

## Core Methods

### chrome.alarms.create(name?, alarmInfo)

Create a named alarm. The `name` parameter is optional and defaults to the empty string `""`.

```ts
// Fire once, 5 minutes from now
await chrome.alarms.create("reminder", {
  delayInMinutes: 5,
});

// Fire every 30 minutes, starting 1 minute from now
await chrome.alarms.create("sync", {
  delayInMinutes: 1,
  periodInMinutes: 30,
});

// Fire at a specific time
await chrome.alarms.create("deadline", {
  when: Date.now() + 60 * 60 * 1000, // 1 hour from now
});

// Fire every hour, starting at a specific time
const nextHour = new Date();
nextHour.setMinutes(0, 0, 0);
nextHour.setHours(nextHour.getHours() + 1);
await chrome.alarms.create("hourly", {
  when: nextHour.getTime(),
  periodInMinutes: 60,
});

// Minimum interval: 30 seconds (in production)
// During development with unpacked extension: no minimum
await chrome.alarms.create("frequent", {
  periodInMinutes: 0.5, // 30 seconds — the minimum
});
```

**AlarmInfo properties:**
| Property | Type | Description |
|----------|------|-------------|
| `when` | `number` | Absolute time to fire (ms since epoch) |
| `delayInMinutes` | `number` | Minutes from now to first fire |
| `periodInMinutes` | `number` | Repeat interval in minutes |

You must specify either `when` or `delayInMinutes` (not both). `periodInMinutes` is optional and makes the alarm repeat.

### chrome.alarms.get(name?)

Get a specific alarm. The `name` parameter is optional and defaults to the empty string `""`.

```ts
const alarm = await chrome.alarms.get("sync");
if (alarm) {
  console.log(`Next fire: ${new Date(alarm.scheduledTime)}`);
  console.log(`Repeats every ${alarm.periodInMinutes} minutes`);
} else {
  console.log("Alarm does not exist");
}
```

### chrome.alarms.getAll()

Get all active alarms.

```ts
const alarms = await chrome.alarms.getAll();
alarms.forEach((alarm) => {
  console.log(`${alarm.name}: next at ${new Date(alarm.scheduledTime)}`);
});
```

### chrome.alarms.clear(name?)

Delete a specific alarm. The `name` parameter is optional and defaults to the empty string `""`.

```ts
const wasCleared = await chrome.alarms.clear("sync");
console.log(wasCleared ? "Alarm removed" : "Alarm not found");
```

### chrome.alarms.clearAll()

Delete all alarms.

```ts
const wasCleared = await chrome.alarms.clearAll();
```

## Events

### chrome.alarms.onAlarm

The only event — fires when any alarm triggers.

```ts
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case "sync":
      syncData();
      break;
    case "cleanup":
      cleanupOldData();
      break;
    case "reminder":
      showReminder();
      break;
    default:
      console.log("Unknown alarm:", alarm.name);
  }
});
```

## Using with @theluckystrike/webext-messaging

Manage alarms from a popup or options page:

```ts
// shared/messages.ts
type Messages = {
  setReminder: {
    request: { name: string; delayMinutes: number; message: string };
    response: { success: boolean };
  };
  getReminders: {
    request: void;
    response: Array<{ name: string; scheduledTime: number; message: string }>;
  };
  cancelReminder: {
    request: { name: string };
    response: { success: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  reminderMessages: {} as Record<string, string>,
});
const storage = createStorage({ schema, area: "local" });
const msg = createMessenger<Messages>();

msg.onMessage({
  setReminder: async ({ name, delayMinutes, message }) => {
    await chrome.alarms.create(`reminder-${name}`, {
      delayInMinutes: delayMinutes,
    });
    const messages = await storage.get("reminderMessages");
    messages[`reminder-${name}`] = message;
    await storage.set("reminderMessages", messages);
    return { success: true };
  },
  getReminders: async () => {
    const alarms = await chrome.alarms.getAll();
    const messages = await storage.get("reminderMessages");
    return alarms
      .filter((a) => a.name.startsWith("reminder-"))
      .map((a) => ({
        name: a.name.replace("reminder-", ""),
        scheduledTime: a.scheduledTime,
        message: messages[a.name] || "",
      }));
  },
  cancelReminder: async ({ name }) => {
    const cleared = await chrome.alarms.clear(`reminder-${name}`);
    const messages = await storage.get("reminderMessages");
    delete messages[`reminder-${name}`];
    await storage.set("reminderMessages", messages);
    return { success: cleared };
  },
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("reminder-")) return;
  const messages = await storage.get("reminderMessages");
  const message = messages[alarm.name] || "Reminder!";

  chrome.notifications.create(alarm.name, {
    type: "basic",
    iconUrl: "icon128.png",
    title: "Reminder",
    message,
  });
});
```

## Using with @theluckystrike/webext-storage

Periodic data sync pattern:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  lastSyncTime: 0,
  syncIntervalMinutes: 30,
  syncEnabled: true,
});

const storage = createStorage({ schema, area: "local" });

// Set up sync alarm on install
chrome.runtime.onInstalled.addListener(async () => {
  const interval = await storage.get("syncIntervalMinutes");
  await chrome.alarms.create("data-sync", {
    delayInMinutes: 1,
    periodInMinutes: interval,
  });
});

// React to interval changes
storage.watch("syncIntervalMinutes", async (newInterval) => {
  await chrome.alarms.clear("data-sync");
  const enabled = await storage.get("syncEnabled");
  if (enabled) {
    await chrome.alarms.create("data-sync", {
      delayInMinutes: 0.5,
      periodInMinutes: newInterval,
    });
  }
});

// React to enable/disable
storage.watch("syncEnabled", async (enabled) => {
  if (enabled) {
    const interval = await storage.get("syncIntervalMinutes");
    await chrome.alarms.create("data-sync", {
      delayInMinutes: 0.5,
      periodInMinutes: interval,
    });
  } else {
    await chrome.alarms.clear("data-sync");
  }
});

// Handle the alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "data-sync") return;
  await performSync();
  await storage.set("lastSyncTime", Date.now());
});
```

## Common Patterns

### Initialize alarms on install and startup

```ts
chrome.runtime.onInstalled.addListener(() => setupAlarms());
chrome.runtime.onStartup.addListener(() => setupAlarms());

async function setupAlarms() {
  // Check if alarm already exists to avoid resetting the schedule
  const existing = await chrome.alarms.get("heartbeat");
  if (!existing) {
    await chrome.alarms.create("heartbeat", { periodInMinutes: 1 });
  }
}
```

### One-shot delayed task

```ts
// Execute something once after a delay
await chrome.alarms.create("one-time-task", {
  delayInMinutes: 10,
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "one-time-task") {
    doSomethingOnce();
    // No need to clear — one-shot alarms auto-clear
  }
});
```

### Dynamic alarm names for per-item scheduling

```ts
// Schedule expiration checks for individual items
async function scheduleExpiration(itemId: string, expiresAt: number) {
  await chrome.alarms.create(`expire-${itemId}`, {
    when: expiresAt,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith("expire-")) {
    const itemId = alarm.name.replace("expire-", "");
    handleExpiration(itemId);
  }
});
```

## Gotchas

1. **Minimum interval is 30 seconds** in production (packed extensions). In development (unpacked), there is no minimum. Chrome will silently clamp values below the minimum.

2. **Alarm names must be unique per extension.** Creating an alarm with the same name replaces the existing one.

3. **Alarms are not precise.** Chrome may delay alarm delivery by up to a few minutes, especially if the system is under load or the device is asleep. Do not rely on exact timing.

4. **One-shot alarms auto-clear** after firing. Periodic alarms persist until explicitly cleared or the extension is uninstalled.

5. **`onAlarm` listener must be registered at the top level** of your service worker, not inside an async function or callback. Otherwise, the service worker might not wake up to handle the alarm.

6. **Creating an alarm with the same name resets it.** If you call `create("sync", ...)` while a "sync" alarm already exists, the old one is replaced. Use `get()` first if you want to preserve existing schedules.

7. **Alarms persist across browser restarts** but not across extension updates or reinstalls.

## Related

- [alarms permission](../permissions/alarms.md)
- [Notifications API](notifications-api.md)
- [Runtime API](runtime-api.md)
- [Chrome alarms API docs](https://developer.chrome.com/docs/extensions/reference/api/alarms)
