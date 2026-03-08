---
layout: default
title: "Chrome Extension Notifications — Developer Guide"
description: "Design Chrome extension UI with this guide covering popup, options page, and side panel development patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/notifications-guide/"
---
# Rich Notifications in Chrome Extensions

## Introduction {#introduction}
- System-level notifications that appear outside the browser
- Requires `"notifications"` permission
- Cross-ref: `docs/permissions/notifications.md` for permission details

## manifest.json {#manifestjson}
```json
{ "permissions": ["notifications"] }
```

## Notification Types {#notification-types}

### Basic Notification {#basic-notification}
```javascript
chrome.notifications.create("my-notif", {
  type: "basic",
  iconUrl: "icon128.png",
  title: "Hello!",
  message: "This is a basic notification.",
  priority: 2  // -2 to 2
});
```

### Image Notification {#image-notification}
```javascript
chrome.notifications.create("img-notif", {
  type: "image",
  iconUrl: "icon128.png",
  title: "New Photo",
  message: "Check out this image",
  imageUrl: "preview.png"
});
```

### List Notification {#list-notification}
```javascript
chrome.notifications.create("list-notif", {
  type: "list",
  iconUrl: "icon128.png",
  title: "Tasks Due Today",
  message: "3 tasks pending",
  items: [
    { title: "Task 1", message: "Fix login bug" },
    { title: "Task 2", message: "Update docs" },
    { title: "Task 3", message: "Deploy v2.0" }
  ]
});
```

### Progress Notification {#progress-notification}
```javascript
chrome.notifications.create("progress-notif", {
  type: "progress",
  iconUrl: "icon128.png",
  title: "Downloading...",
  message: "extension-data.zip",
  progress: 45  // 0 to 100
});
```

## Notification Options {#notification-options}
- `title`: Bold header text
- `message`: Body text
- `iconUrl`: 128x128 icon (required)
- `contextMessage`: Additional context text
- `priority`: -2 (low) to 2 (urgent)
- `buttons`: Up to 2 action buttons `[{ title: "Open" }, { title: "Dismiss" }]`
- `requireInteraction`: Keep notification visible until user acts (priority 2 only)
- `silent`: Suppress notification sound

## Event Handling {#event-handling}

### onClicked — User clicked notification body {#onclicked-user-clicked-notification-body}
```javascript
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: "https://example.com" });
  chrome.notifications.clear(notificationId);
});
```

### onButtonClicked — User clicked an action button {#onbuttonclicked-user-clicked-an-action-button}
```javascript
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) openItem();
  else dismissItem();
});
```

### onClosed — Notification was dismissed {#onclosed-notification-was-dismissed}
```javascript
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  console.log(byUser ? "User dismissed" : "System cleared");
});
```

## Updating Notifications {#updating-notifications}
```javascript
chrome.notifications.update("progress-notif", {
  progress: 75,
  message: "75% complete..."
});
```
- Updates in-place without creating a new notification

## Clearing Notifications {#clearing-notifications}
```javascript
chrome.notifications.clear("my-notif");
chrome.notifications.getAll((notifications) => {
  Object.keys(notifications).forEach(id => chrome.notifications.clear(id));
});
```

## Common Patterns {#common-patterns}

### Timer/Alarm Notifications {#timeralarm-notifications}
- Use `chrome.alarms` to trigger periodic notifications
- Show task reminders, break timers, etc.
- Store notification preferences with `@theluckystrike/webext-storage`

### Download Progress {#download-progress}
- Create progress notification, update as download progresses
- Clear on completion

### New Content Alerts {#new-content-alerts}
- Background checks for new data (API polling, RSS)
- Notify user of new items
- Click opens relevant tab

### Message from Background to User {#message-from-background-to-user}
- Use `@theluckystrike/webext-messaging` for internal communication
- Use notifications for user-facing alerts

## Best Practices {#best-practices}
- Don't spam — respect user attention
- Use `requireInteraction` sparingly — only for urgent items
- Always provide a click action (open tab, show popup)
- Use unique `notificationId` strings — allows update/clear
- Clean up old notifications
- Let users control notification frequency via options page

## Platform Differences {#platform-differences}
- Windows: Action Center integration
- macOS: Notification Center (may require system notification permission)
- Linux: Varies by desktop environment
- ChromeOS: Native notification panel

## Common Mistakes {#common-mistakes}
- `iconUrl` must be a local file or data URL — no remote URLs
- Forgetting to handle `onClicked` — dead-end notifications frustrate users
- Creating too many notifications — OS may throttle or user will disable
- Not clearing notifications — stale notifications pile up

## Related Articles {#related-articles}

## Related Articles

- [Notification Patterns](../patterns/notification-patterns.md)
- [Notifications API](../api-reference/notifications-api.md)
