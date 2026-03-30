---
layout: default
title: "notifications Permission Reference"
description: "Grants access to the API Show rich desktop notifications (basic, image, list, progress types) Handle notification clicks, button clicks, and close events"
permalink: /permissions/notifications/
category: permissions
order: 26
canonical_url: "https://bestchromeextensions.com/permissions/notifications/"
last_modified_at: 2026-01-15
---

notifications Permission Reference

What It Does {#what-it-does}
- Grants access to the `chrome.notifications` API
- Show rich desktop notifications (basic, image, list, progress types)
- Handle notification clicks, button clicks, and close events
- Notifications persist in the system notification center

Notification Types {#notification-types}
| Type | Description | Fields |
|------|-------------|--------|
| `basic` | Simple text notification | title, message, iconUrl |
| `image` | Notification with large image | + imageUrl |
| `list` | Multiple items in one notification | + items[] |
| `progress` | Shows a progress bar | + progress (0-100) |

Manifest Configuration {#manifest-configuration}
```json
{ "permissions": ["notifications"] }
```

Low-warning permission.

Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

```ts
import { checkPermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

const result = await checkPermission("notifications");
console.log(result.description); // "Show desktop notifications"

PERMISSION_DESCRIPTIONS.notifications; // "Show desktop notifications"
```

Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Pattern: content script triggers notification via background:

```ts
type Messages = {
  showNotification: {
    request: { title: string; message: string; url?: string };
    response: { notificationId: string };
  };
  clearNotification: {
    request: { notificationId: string };
    response: { cleared: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

const notificationUrls = new Map<string, string>();

msg.onMessage({
  showNotification: async ({ title, message, url }) => {
    const notificationId = await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title,
      message,
    });
    if (url) notificationUrls.set(notificationId, url);
    return { notificationId };
  },
  clearNotification: async ({ notificationId }) => {
    const cleared = await chrome.notifications.clear(notificationId);
    notificationUrls.delete(notificationId);
    return { cleared };
  },
});

// Handle notification clicks. open associated URL
chrome.notifications.onClicked.addListener((notificationId) => {
  const url = notificationUrls.get(notificationId);
  if (url) {
    chrome.tabs.create({ url });
    notificationUrls.delete(notificationId);
  }
});
```

Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Store notification preferences and history:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  notificationsEnabled: true,
  notificationSound: true,
  notificationHistory: [] as Array<{ title: string; message: string; timestamp: number }>,
  maxHistorySize: 100,
});
const storage = createStorage({ schema });

async function showNotificationIfEnabled(title: string, message: string) {
  const enabled = await storage.get("notificationsEnabled");
  if (!enabled) return null;

  const id = await chrome.notifications.create({ type: "basic", iconUrl: "icons/icon-128.png", title, message });

  // Log to history
  const history = await storage.get("notificationHistory");
  const maxSize = await storage.get("maxHistorySize");
  history.push({ title, message, timestamp: Date.now() });
  await storage.set("notificationHistory", history.slice(-maxSize));

  return id;
}

// React to preference changes
storage.watch("notificationsEnabled", (enabled) => {
  console.log(`Notifications ${enabled ? "enabled" : "disabled"}`);
});
```

Key API Methods {#key-api-methods}

| Method | Description |
|--------|-------------|
| `notifications.create(id?, options)` | Create and show a notification |
| `notifications.update(id, options)` | Update an existing notification |
| `notifications.clear(id)` | Dismiss a notification |
| `notifications.getAll()` | Get all active notification IDs |
| `notifications.onClicked` | Event. user clicked notification body |
| `notifications.onButtonClicked` | Event. user clicked a notification button |
| `notifications.onClosed` | Event. notification was dismissed |

Notification with Buttons {#notification-with-buttons}
```ts
chrome.notifications.create({
  type: "basic",
  iconUrl: "icons/icon-128.png",
  title: "Update Available",
  message: "Version 2.0 is ready to install",
  buttons: [
    { title: "Install Now" },
    { title: "Later" },
  ],
});

chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
  if (buttonIndex === 0) installUpdate();
  // buttonIndex 1 = "Later", do nothing
});
```

Common Patterns {#common-patterns}
1. Alarm-triggered reminders (alarms + notifications)
2. Download complete alerts
3. New content alerts (periodic check + notify)
4. Action notifications with buttons
5. Progress notifications for long operations

Gotchas {#gotchas}
- Notifications may be silenced by OS-level Do Not Disturb
- `iconUrl` is required. must be a valid extension URL or data URL
- Notification IDs are strings. auto-generated if not provided
- On macOS, button support is limited
- Too many notifications can cause Chrome to throttle them
- `notifications.create()` returns a Promise in MV3

Related Permissions {#related-permissions}
- [alarms](alarms.md). trigger notifications on schedule
- [storage](storage.md). store notification preferences

API Reference {#api-reference}
- [Notifications API Reference](../api-reference/notifications-api.md)
- [Chrome notifications API docs](https://developer.chrome.com/docs/extensions/reference/api/notifications)
- [Notifications API detailed look](../api-reference/notifications-api.md)

Frequently Asked Questions

How do I show notifications in Chrome extensions?
Use chrome.notifications.create() to display system notifications. You'll need the "notifications" permission in your manifest.

Can I customize notification appearance?
Yes, you can set icons, titles, messages, buttons, and even use HTML in notification windows.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
