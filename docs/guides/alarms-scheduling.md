---
layout: default
title: "Chrome Extension Alarms & Scheduling. Developer Guide"
description: "Learn Chrome extension alarms & scheduling with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/alarms-scheduling/"
---
Background Scheduling with chrome.alarms

Introduction {#introduction}
- `chrome.alarms` is THE way to schedule background tasks in MV3
- Replaces `setInterval`/`setTimeout` which don't survive service worker termination
- Requires `"alarms"` permission
- Cross-ref: `docs/permissions/alarms.md`

manifest.json {#manifestjson}
```json
{
  "permissions": ["alarms"],
  "background": { "service_worker": "background.js" }
}
```

Creating Alarms {#creating-alarms}

One-Time Alarm {#one-time-alarm}
```javascript
chrome.alarms.create("checkUpdates", {
  delayInMinutes: 5  // Fire once, 5 minutes from now
});
```

Repeating Alarm {#repeating-alarm}
```javascript
chrome.alarms.create("syncData", {
  delayInMinutes: 1,     // First fire after 1 minute
  periodInMinutes: 30    // Then every 30 minutes
});
```

Alarm at Specific Time {#alarm-at-specific-time}
```javascript
chrome.alarms.create("dailyReport", {
  when: new Date("2024-01-15T09:00:00").getTime()  // Unix timestamp
});
```

Handling Alarms {#handling-alarms}
```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case "checkUpdates":
      checkForUpdates();
      break;
    case "syncData":
      syncDataToServer();
      break;
    case "dailyReport":
      generateReport();
      break;
  }
});
```
- Register listener at TOP LEVEL of service worker (not inside async functions)
- Handler wakes up the service worker if it was terminated

Managing Alarms {#managing-alarms}

Get Alarm Info {#get-alarm-info}
```javascript
chrome.alarms.get("syncData", (alarm) => {
  if (alarm) {
    console.log("Next fire:", new Date(alarm.scheduledTime));
    console.log("Period:", alarm.periodInMinutes, "minutes");
  }
});
```

List All Alarms {#list-all-alarms}
```javascript
chrome.alarms.getAll((alarms) => {
  alarms.forEach(a => console.log(a.name, new Date(a.scheduledTime)));
});
```

Cancel Alarms {#cancel-alarms}
```javascript
chrome.alarms.clear("syncData");    // Cancel specific alarm
chrome.alarms.clearAll();            // Cancel all alarms
```

MV3 Minimum Interval {#mv3-minimum-interval}
- Minimum period: 30 seconds in production (was 1 minute, reduced in Chrome 120+)
- In development (unpacked): can be shorter
- For sub-30-second tasks, use `chrome.alarms` as a wake-up and then use `setTimeout` within the handler

Common Patterns {#common-patterns}

Periodic Data Sync {#periodic-data-sync}
```javascript
// Setup on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("sync", { periodInMinutes: 60 });
});

// Handle sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "sync") {
    const data = await fetchFromServer();
    const storage = createStorage(defineSchema({ lastSync: 'number', data: 'string' }), 'local');
    await storage.setMany({ lastSync: Date.now(), data: JSON.stringify(data) });
  }
});
```

Badge Update (Unread Count) {#badge-update-unread-count}
```javascript
chrome.alarms.create("updateBadge", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "updateBadge") {
    const count = await getUnreadCount();
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  }
});
```

Reminder System {#reminder-system}
- User sets reminders via popup
- Store reminder times with `@theluckystrike/webext-storage`
- Create alarm for each reminder
- Show `chrome.notifications` when alarm fires

Session Cleanup {#session-cleanup}
- Periodic cleanup of stale data in storage
- `clearAll()` on extension update, recreate needed alarms

Alarms + Storage Integration {#alarms-storage-integration}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const storage = createStorage(defineSchema({
  syncInterval: 'number',
  lastSync: 'number'
}), 'sync');

// User changes sync interval in options
async function updateSyncInterval(minutes) {
  await storage.set('syncInterval', minutes);
  await chrome.alarms.clear("sync");
  chrome.alarms.create("sync", { periodInMinutes: minutes });
}
```

Best Practices {#best-practices}
- Create alarms in `chrome.runtime.onInstalled`. they persist across restarts
- Use descriptive alarm names. easier to debug
- Always register `onAlarm` at top level of service worker
- Don't create duplicate alarms. check with `get()` first or just overwrite
- Handle the case where alarm fires while offline (for network tasks)
- Log alarm activity for debugging

Common Mistakes {#common-mistakes}
- Using `setTimeout`/`setInterval`. doesn't survive SW termination
- Registering `onAlarm` inside an async function. listener won't catch events
- Setting period less than 30 seconds. silently clamped to minimum
- Not handling extension update. alarms persist but handlers may change
- Creating alarm with same name overwrites previous. can be feature or bug

Related Articles {#related-articles}

Related Articles

- [Alarm Scheduling Patterns](../patterns/alarm-scheduling-patterns.md)
- [Background Patterns](../guides/background-patterns.md)
- [Alarms Permission](../permissions/alarms.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

