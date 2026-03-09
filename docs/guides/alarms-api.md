# Chrome Alarms API

The Chrome Alarms API provides robust background task scheduling in Manifest V3 extensions, replacing unreliable `setInterval`/`setTimeout` calls.

## Why Use chrome.alarms

In Manifest V2, developers used `setInterval()` and `setTimeout()` in background pages, but these fail when service workers terminate. The `chrome.alarms` API persists alarms across service worker restarts, browser restarts, and wakes the worker when alarms fire.

## Required Permission

```json
{ "permissions": ["alarms"], "background": { "service_worker": "background.js" } }
```

## AlarmInfo Properties

| Property | Type | Description |
|----------|------|-------------|
| `delayInMinutes` | number | Minutes until alarm fires (one-time) |
| `periodInMinutes` | number | Repeat interval in minutes |
| `when` | number | Unix timestamp for exact firing time |

**Minimum interval:** 1 minute in production; shorter in dev allowed.

## chrome.alarms.create — Creating Alarms

### One-Time Alarm
```javascript
chrome.alarms.create("oneTimeTask", { delayInMinutes: 5 });
```

### Periodic Alarm
```javascript
chrome.alarms.create("syncTask", { delayInMinutes: 1, periodInMinutes: 30 });
```

### Alarm at Specific Time
```javascript
chrome.alarms.create("dailyTask", { when: new Date("2024-12-25T09:00:00").getTime() });
```

### Multiple Named Alarms
```javascript
chrome.alarms.create("pomodoroTimer", { delayInMinutes: 25 });
chrome.alarms.create("breakTimer", { delayInMinutes: 5 });
chrome.alarms.create("dataSync", { periodInMinutes: 15 });
```

## chrome.alarms.get — Getting a Specific Alarm

```javascript
chrome.alarms.get("pomodoroTimer", (alarm) => {
  if (alarm) {
    console.log(`Next fire: ${new Date(alarm.scheduledTime)}`);
  } else { console.log("Alarm not found"); }
});
// Promise-based: const alarm = await chrome.alarms.get("name");
```

## chrome.alarms.getAll — Listing All Active Alarms

```javascript
chrome.alarms.getAll((alarms) => alarms.forEach(a => console.log(a.name)));
// Promise-based: const all = await chrome.alarms.getAll();
```

## chrome.alarms.clear — Removing a Specific Alarm

```javascript
chrome.alarms.clear("pomodoroTimer", (wasCleared) => console.log(wasCleared));
// Promise-based: await chrome.alarms.clear("name");
```

## chrome.alarms.clearAll — Removing All Alarms

```javascript
chrome.alarms.clearAll();
// Promise-based: await chrome.alarms.clearAll();
```

## chrome.alarms.onAlarm — Event Listener

Register at the top level of your service worker:

```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoroTimer") handlePomodoroComplete();
  else if (alarm.name === "dataSync") syncData();
});
```

The service worker wakes when alarms fire. Listener must be at top-level.

## Persistent Scheduling Across Restarts

```javascript
chrome.alarms.get("dataSync", (alarm) => {
  if (!alarm) chrome.alarms.create("dataSync", { periodInMinutes: 30 });
});
```

## Building a Pomodoro Timer Extension

```javascript
// background.js - Pomodoro Timer
const POMODORO = 25, BREAK = 5;

function startPomodoro() {
  chrome.alarms.create("pomodoro", { delayInMinutes: POMODORO });
  chrome.storage.local.set({ state: "working" });
}

function startBreak() {
  chrome.alarms.create("break", { delayInMinutes: BREAK });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoro") {
    chrome.notifications.create({ title: "Pomodoro Complete!", message: "Time for a break." });
    startBreak();
  } else if (alarm.name === "break") {
    chrome.notifications.create({ title: "Break Over!", message: "Ready for another?" });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "start") startPomodoro();
  if (msg.action === "stop") { chrome.alarms.clear("pomodoro"); chrome.alarms.clear("break"); }
});
```

## Building a Periodic Data Sync Extension

```javascript
// background.js - Periodic Sync
const SYNC_INTERVAL = 15;

async function syncData() {
  try {
    const resp = await fetch("https://api.example.com/data");
    await chrome.storage.local.set({ lastSync: Date.now(), data: await resp.json() });
  } catch (e) { console.error("Sync failed:", e); }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dataSync", { delayInMinutes: 1, periodInMinutes: SYNC_INTERVAL });
  syncData();
});

chrome.alarms.onAlarm.addListener((a) => { if (a.name === "dataSync") syncData(); });
```

## Best Practices

- Use meaningful alarm names for debugging
- Check for existing alarms before creating duplicates
- Handle missing alarms gracefully with `chrome.alarms.get()`
- Clean up on uninstall using `chrome.runtime.onUninstalled`
- Combine with `chrome.notifications` for user alerts

## Reference

- [Official Documentation](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [Chrome Extensions Samples](https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/api/alarms)

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

