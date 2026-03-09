---
layout: default
title: "Chrome Extension Alarms API — How to Schedule Background Tasks in MV3"
description: "Master the Chrome Alarms API for scheduling background tasks in Manifest V3 extensions. Learn about periodic tasks, service worker lifecycle management, and offscreen documents."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/alarms-background-tasks/"
---

# Chrome Extension Alarms API — How to Schedule Background Tasks in MV3

## Introduction

Building a Chrome extension that needs to run background tasks periodically? In Manifest V3, the days of using `setInterval()` or `setTimeout()` in your background service worker are over. These native JavaScript timers don't survive service worker termination, which means your scheduled tasks will simply stop running when Chrome decides to unload your service worker to save memory.

This is where the **chrome.alarms** API comes in. It's the official, recommended way to schedule background tasks in MV3 extensions. The Alarms API is designed specifically for extension service workers, providing reliable scheduling that persists across service worker restarts and system events.

## Getting Started with chrome.alarms

To use the Alarms API, you need to add the `"alarms"` permission to your `manifest.json`:

```json
{
  "name": "My Extension",
  "version": "1.0",
  "permissions": ["alarms"],
  "background": {
    "service_worker": "background.js"
  }
}
```

Once permissions are configured, you can create alarms in your service worker using the `chrome.alarms.create()` method. The API supports both one-time alarms and repeating alarms, giving you flexibility in how you schedule background tasks.

## Creating One-Time and Repeating Alarms

A one-time alarm fires once at a specified time:

```javascript
// Fire after 10 minutes
chrome.alarms.create("oneTimeTask", {
  delayInMinutes: 10
});

// Fire at a specific timestamp
chrome.alarms.create("scheduledTask", {
  when: Date.now() + 3600000 // 1 hour from now
});
```

For tasks that need to run periodically, use repeating alarms:

```javascript
// Repeat every 30 minutes
chrome.alarms.create("periodicSync", {
  delayInMinutes: 1,      // First trigger after 1 minute
  periodInMinutes: 30     // Then every 30 minutes
});
```

The `periodInMinutes` property ensures the alarm automatically reschedules itself after each firing, making it ideal for sync operations, periodic data fetching, or scheduled notifications.

## Handling Alarm Events

To respond when an alarm fires, register an event listener in your service worker:

```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "periodicSync") {
    console.log("Running periodic sync...");
    // Perform your background task here
  }
});
```

The alarm object contains useful properties like `name` (the alarm identifier), `scheduledTime` (when it will fire next), and `periodInMinutes` (for repeating alarms).

## Understanding the Service Worker Lifecycle

One of the biggest challenges in MV3 is that service workers can be terminated at any time by Chrome to conserve memory. This is where understanding the relationship between alarms and service worker lifecycle becomes critical.

When you create an alarm, Chrome stores it internally and will wake up your service worker when the alarm fires—even if it was terminated. However, there's an important caveat: if your service worker hasn't been active for a while, Chrome may delay the alarm to batch resource usage.

Alarms are more reliable than `setInterval()` because they persist beyond service worker lifetime. When an alarm triggers, Chrome will wake up your service worker and fire the `onAlarm` event, ensuring your task executes even after extended periods of inactivity.

## Keeping Tasks Alive with Offscreen Documents

Sometimes alarms alone aren't enough. If your background task requires access to DOM APIs like `window`, `document`, or the Fetch API with certain features, you'll need an **offscreen document**.

Offscreen documents are hidden pages that your service worker can open to perform tasks that require a full browser context. They're particularly useful for:

- Long-running network requests
- Operations requiring DOM manipulation
- Working with libraries that need a window object

Here's how to create and use an offscreen document:

```javascript
// In your service worker
chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: ["DOM_SCRAPING", "IFRAME_SCRIPTING"],
  justification: "Need DOM access for data processing"
}).then(() => {
  // Send message to offscreen document
  chrome.runtime.sendMessage({
    target: "offscreen",
    action: "processData",
    data: someData
  });
});
```

The offscreen document runs independently and can communicate back to your service worker via message passing. When the work is complete, you can close it to free resources:

```javascript
chrome.offscreen.closeDocument();
```

## Best Practices for Background Tasks

When implementing scheduled background tasks in your Chrome extension, keep these best practices in mind:

**Use meaningful alarm names** — Instead of generic names, use descriptive identifiers that make it easy to identify which alarm triggered in your `onAlarm` handler.

**Handle alarm errors gracefully** — Wrap your alarm handler logic in try-catch blocks to prevent unhandled exceptions from crashing your service worker.

**Clean up unused alarms** — When your extension no longer needs a scheduled task, remove the alarm to conserve resources:

```javascript
chrome.alarms.clear("oldTaskName");
```

**Check if alarms exist before creating** — To avoid duplicate alarms, check if one exists:

```javascript
chrome.alarms.get("myAlarm", (alarm) => {
  if (!alarm) {
    chrome.alarms.create("myAlarm", { periodInMinutes: 60 });
  }
});
```

**Be mindful of minimum intervals** — Chrome enforces a minimum period of approximately 1 minute for repeating alarms. If you need more frequent updates, consider using alternative approaches or accepting that very short intervals may not be precisely maintained.

## Conclusion

The chrome.alarms API is an essential tool for any Chrome extension developer working with Manifest V3. It provides a reliable mechanism for scheduling background tasks that survives service worker termination and handles the natural lifecycle of browser extensions.

For simpler scheduled tasks, alarms alone are sufficient. But when you need full browser context for DOM operations or complex network requests, combine alarms with offscreen documents to create robust, long-running background processes that keep your extension working seamlessly for users.

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

