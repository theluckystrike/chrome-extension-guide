---
layout: default
title: "Chrome Notifications API Complete Reference"
description: "The Chrome Notifications API creates rich desktop notifications using templates, displaying system-level alerts outside the browser window with icons, titles, and messages."
canonical_url: "https://bestchromeextensions.com/api-reference/notifications-api/"
last_modified_at: 2026-01-15
---

Chrome Notifications API Reference

The `chrome.notifications` API lets you create rich desktop notifications using templates. These are system-level notifications that appear outside the browser window.

Permissions {#permissions}

```json
{
  "permissions": ["notifications"]
}
```

No user-facing warning for this permission. The OS may prompt users to allow notifications from Chrome separately.

See the [notifications permission reference](../permissions/notifications.md) for details.

Notification Templates {#notification-templates}

Chrome supports four notification template types:

basic {#basic}

Simple notification with icon, title, and message.

```ts
chrome.notifications.create("basic-example", {
  type: "basic",
  iconUrl: "icon128.png",
  title: "Hello",
  message: "This is a basic notification",
});
```

image {#image}

Like `basic`, but with a large image below the message.

```ts
chrome.notifications.create("image-example", {
  type: "image",
  iconUrl: "icon128.png",
  title: "New Photo",
  message: "Check out this image",
  imageUrl: "screenshot.png",
});
```

list {#list}

Shows a list of items with titles and messages.

```ts
chrome.notifications.create("list-example", {
  type: "list",
  iconUrl: "icon128.png",
  title: "3 New Emails",
  message: "You have unread messages",
  items: [
    { title: "Alice", message: "Hey, are you free tomorrow?" },
    { title: "Bob", message: "Meeting notes attached" },
    { title: "Carol", message: "PR review requested" },
  ],
});
```

progress {#progress}

Shows a progress bar.

```ts
chrome.notifications.create("progress-example", {
  type: "progress",
  iconUrl: "icon128.png",
  title: "Downloading...",
  message: "file.zip",
  progress: 45, // 0, 100
});
```

NotificationOptions {#notificationoptions}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `TemplateType` | Yes | `"basic"`, `"image"`, `"list"`, `"progress"` |
| `iconUrl` | `string` | Yes | Icon for the notification (relative to extension root) |
| `title` | `string` | Yes | Primary title text |
| `message` | `string` | Yes | Body text |
| `contextMessage` | `string` | No | Additional context text (shown smaller) |
| `priority` | `number` | No | `-2` to `2` (default `0`). Higher = more prominent |
| `eventTime` | `number` | No | Timestamp for the notification |
| `buttons` | `ButtonOptions[]` | No | Up to 2 action buttons |
| `imageUrl` | `string` | No | Large image (`type: "image"` only) |
| `items` | `ItemOptions[]` | No | List items (`type: "list"` only) |
| `progress` | `number` | No | 0, 100 (`type: "progress"` only) |
| `requireInteraction` | `boolean` | No | Stay visible until user dismisses |
| `silent` | `boolean` | No | Suppress sound |

Buttons {#buttons}

Notifications support up to 2 action buttons:

```ts
chrome.notifications.create("with-buttons", {
  type: "basic",
  iconUrl: "icon128.png",
  title: "New Update Available",
  message: "Version 2.0 is ready to install",
  buttons: [
    { title: "Update Now" },
    { title: "Later" },
  ],
  requireInteraction: true,
});
```

Core Methods {#core-methods}

chrome.notifications.create(notificationId?, options) {#chromenotificationscreatenotificationid-options}

Create and display a notification.

```ts
// With explicit ID (allows updating/clearing later)
const id = await chrome.notifications.create("my-notification", {
  type: "basic",
  iconUrl: "icon128.png",
  title: "Title",
  message: "Message body",
});

// Auto-generated ID
const id = await chrome.notifications.create({
  type: "basic",
  iconUrl: "icon128.png",
  title: "Title",
  message: "Message body",
});
console.log("Notification ID:", id);
```

chrome.notifications.update(notificationId, options) {#chromenotificationsupdatenotificationid-options}

Update an existing notification.

```ts
// Update progress
await chrome.notifications.update("progress-example", {
  progress: 75,
  message: "75% complete...",
});

// Update message
await chrome.notifications.update("my-notification", {
  message: "Updated message content",
});
```

Returns `true` if the notification existed and was updated, `false` otherwise.

chrome.notifications.clear(notificationId) {#chromenotificationsclearnotificationid}

Dismiss a notification.

```ts
const wasClosed = await chrome.notifications.clear("my-notification");
```

chrome.notifications.getAll() {#chromenotificationsgetall}

Get all currently visible notifications.

```ts
const notifications = await chrome.notifications.getAll();
// Returns Record<string, boolean>. keys are notification IDs
const activeIds = Object.keys(notifications);
console.log(`${activeIds.length} active notifications`);
```

chrome.notifications.getPermissionLevel() {#chromenotificationsgetpermissionlevel}

Check if the user has allowed notifications.

```ts
const level = await chrome.notifications.getPermissionLevel();
// "granted" or "denied"
if (level === "denied") {
  console.log("User has disabled notifications for Chrome");
}
```

Events {#events}

chrome.notifications.onClicked {#chromenotificationsonclicked}

User clicked the notification body.

```ts
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log("Notification clicked:", notificationId);

  // Common pattern: open a page
  chrome.tabs.create({ url: "https://example.com" });
  chrome.notifications.clear(notificationId);
});
```

chrome.notifications.onButtonClicked {#chromenotificationsonbuttonclicked}

User clicked one of the notification's action buttons.

```ts
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === "update-available") {
    if (buttonIndex === 0) {
      // "Update Now" clicked
      performUpdate();
    } else {
      // "Later" clicked
      snoozeUpdate();
    }
  }
  chrome.notifications.clear(notificationId);
});
```

chrome.notifications.onClosed {#chromenotificationsonclosed}

User dismissed the notification (or it expired).

```ts
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  console.log(`Notification ${notificationId} closed`);
  console.log(byUser ? "Dismissed by user" : "Closed programmatically or expired");
});
```

chrome.notifications.onPermissionLevelChanged {#chromenotificationsonpermissionlevelchanged}

User changed notification permissions at the OS level.

```ts
chrome.notifications.onPermissionLevelChanged.addListener((level) => {
  console.log("Permission level changed to:", level);
});
```

Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Notification system controlled from the popup:

```ts
// shared/messages.ts
type Messages = {
  sendNotification: {
    request: { title: string; message: string; requireInteraction?: boolean };
    response: { notificationId: string };
  };
  getActiveNotifications: {
    request: void;
    response: string[];
  };
  clearAllNotifications: {
    request: void;
    response: { cleared: number };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage({
  sendNotification: async ({ title, message, requireInteraction }) => {
    const notificationId = await chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title,
      message,
      requireInteraction: requireInteraction || false,
    });
    return { notificationId };
  },
  getActiveNotifications: async () => {
    const all = await chrome.notifications.getAll();
    return Object.keys(all);
  },
  clearAllNotifications: async () => {
    const all = await chrome.notifications.getAll();
    const ids = Object.keys(all);
    await Promise.all(ids.map((id) => chrome.notifications.clear(id)));
    return { cleared: ids.length };
  },
});
```

Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Track notification preferences and history:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  notificationPrefs: {
    enabled: true,
    silent: false,
    maxPerHour: 10,
  },
  notificationLog: [] as Array<{
    id: string;
    title: string;
    timestamp: number;
    clicked: boolean;
  }>,
});

const storage = createStorage({ schema, area: "local" });

async function showNotification(title: string, message: string) {
  const prefs = await storage.get("notificationPrefs");
  if (!prefs.enabled) return null;

  // Rate limiting
  const log = await storage.get("notificationLog");
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentCount = log.filter((n) => n.timestamp > oneHourAgo).length;
  if (recentCount >= prefs.maxPerHour) return null;

  const id = await chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title,
    message,
    silent: prefs.silent,
  });

  log.push({ id, title, timestamp: Date.now(), clicked: false });
  await storage.set("notificationLog", log.slice(-100)); // keep last 100
  return id;
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const log = await storage.get("notificationLog");
  const entry = log.find((n) => n.id === notificationId);
  if (entry) {
    entry.clicked = true;
    await storage.set("notificationLog", log);
  }
});
```

Common Patterns {#common-patterns}

Notification with click-to-open {#notification-with-click-to-open}

```ts
const urlMap = new Map<string, string>();

function notifyWithLink(title: string, message: string, url: string) {
  const id = `link-${Date.now()}`;
  urlMap.set(id, url);
  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: "icon128.png",
    title,
    message,
  });
}

chrome.notifications.onClicked.addListener((id) => {
  const url = urlMap.get(id);
  if (url) {
    chrome.tabs.create({ url });
    urlMap.delete(id);
  }
  chrome.notifications.clear(id);
});
```

Progress notification for long tasks {#progress-notification-for-long-tasks}

```ts
async function processWithProgress(items: string[]) {
  const notifId = "processing";
  await chrome.notifications.create(notifId, {
    type: "progress",
    iconUrl: "icon128.png",
    title: "Processing...",
    message: `0 of ${items.length}`,
    progress: 0,
  });

  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);
    const pct = Math.round(((i + 1) / items.length) * 100);
    await chrome.notifications.update(notifId, {
      progress: pct,
      message: `${i + 1} of ${items.length}`,
    });
  }

  await chrome.notifications.clear(notifId);
  await chrome.notifications.create("done", {
    type: "basic",
    iconUrl: "icon128.png",
    title: "Complete",
    message: `Processed ${items.length} items`,
  });
}
```

Auto-dismiss after timeout {#auto-dismiss-after-timeout}

```ts
async function showTemporaryNotification(title: string, message: string, durationMs: number) {
  const id = await chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title,
    message,
  });

  // Use alarms instead of setTimeout (survives SW termination)
  await chrome.alarms.create(`dismiss-${id}`, {
    delayInMinutes: durationMs / 60000,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith("dismiss-")) {
    const notifId = alarm.name.replace("dismiss-", "");
    chrome.notifications.clear(notifId);
  }
});
```

Gotchas {#gotchas}

1. `iconUrl` is required and must be a relative path to a file bundled with your extension, or a data URL. Remote URLs are not allowed.

2. Maximum 2 buttons. You cannot add more than 2 action buttons.

3. OS may suppress notifications. macOS, Windows, and ChromeOS all have notification settings that can prevent notifications from appearing. Always check `getPermissionLevel()`.

4. `requireInteraction` may be ignored on some platforms. macOS in particular may still auto-dismiss notifications regardless of this setting.

5. Notification IDs are strings. If you omit the ID, Chrome generates a UUID. Use explicit IDs when you need to update or clear notifications later.

6. `list` and `image` types have limited support. On some platforms (especially macOS), list items and images may not render as expected. The `basic` type is the most reliable cross-platform.

7. Notifications don't persist across browser restarts. All notifications are cleared when Chrome is closed. Use alarms + storage to re-show them if needed.

8. `update()` returns false if the notification has already been dismissed. Don't rely on update succeeding.

Related {#related}

- [notifications permission](../permissions/notifications.md)
- [Alarms API](alarms-api.md)
- [Runtime API](runtime-api.md)
- [Chrome notifications API docs](https://developer.chrome.com/docs/extensions/reference/api/notifications)
Frequently Asked Questions

How do I show a notification?
Use chrome.notifications.create() with an ID, notification options, and optional callback.

Can I add action buttons to notifications?
Yes, include an array of "buttons" in your notification options to add clickable action buttons.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
