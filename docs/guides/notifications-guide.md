---
layout: default
title: "Chrome Extension Notifications — Developer Guide"
description: "Design Chrome extension UI with this guide covering popup, options page, and side panel development patterns."
---
# Rich Notifications in Chrome Extensions

## Introduction
- System-level notifications that appear outside the browser
- Requires `"notifications"` permission
- Cross-ref: `docs/permissions/notifications.md` for permission details

## manifest.json
```json
{ "permissions": ["notifications"] }
```

## Notification Types

### Basic Notification
```javascript
chrome.notifications.create("my-notif", {
  type: "basic",
  iconUrl: "icon128.png",
  title: "Hello!",
  message: "This is a basic notification.",
  priority: 2  // -2 to 2
});
```

### Image Notification
```javascript
chrome.notifications.create("img-notif", {
  type: "image",
  iconUrl: "icon128.png",
  title: "New Photo",
  message: "Check out this image",
  imageUrl: "preview.png"
});
```

### List Notification
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

### Progress Notification
```javascript
chrome.notifications.create("progress-notif", {
  type: "progress",
  iconUrl: "icon128.png",
  title: "Downloading...",
  message: "extension-data.zip",
  progress: 45  // 0 to 100
});
```

## Notification Options
- `title`: Bold header text
- `message`: Body text
- `iconUrl`: 128x128 icon (required)
- `contextMessage`: Additional context text
- `priority`: -2 (low) to 2 (urgent)
- `buttons`: Up to 2 action buttons `[{ title: "Open" }, { title: "Dismiss" }]`
- `requireInteraction`: Keep notification visible until user acts (priority 2 only)
- `silent`: Suppress notification sound

## Event Handling

### onClicked — User clicked notification body
```javascript
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: "https://example.com" });
  chrome.notifications.clear(notificationId);
});
```

### onButtonClicked — User clicked an action button
```javascript
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) openItem();
  else dismissItem();
});
```

### onClosed — Notification was dismissed
```javascript
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  console.log(byUser ? "User dismissed" : "System cleared");
});
```

## Updating Notifications
```javascript
chrome.notifications.update("progress-notif", {
  progress: 75,
  message: "75% complete..."
});
```
- Updates in-place without creating a new notification

## Clearing Notifications
```javascript
chrome.notifications.clear("my-notif");
chrome.notifications.getAll((notifications) => {
  Object.keys(notifications).forEach(id => chrome.notifications.clear(id));
});
```

## Common Patterns

### Timer/Alarm Notifications
- Use `chrome.alarms` to trigger periodic notifications
- Show task reminders, break timers, etc.
- Store notification preferences with `@theluckystrike/webext-storage`

### Download Progress
- Create progress notification, update as download progresses
- Clear on completion

### New Content Alerts
- Background checks for new data (API polling, RSS)
- Notify user of new items
- Click opens relevant tab

### Message from Background to User
- Use `@theluckystrike/webext-messaging` for internal communication
- Use notifications for user-facing alerts

## Best Practices
- Don't spam — respect user attention
- Use `requireInteraction` sparingly — only for urgent items
- Always provide a click action (open tab, show popup)
- Use unique `notificationId` strings — allows update/clear
- Clean up old notifications
- Let users control notification frequency via options page

## Platform Differences
- Windows: Action Center integration
- macOS: Notification Center (may require system notification permission)
- Linux: Varies by desktop environment
- ChromeOS: Native notification panel

## Common Mistakes
- `iconUrl` must be a local file or data URL — no remote URLs
- Forgetting to handle `onClicked` — dead-end notifications frustrate users
- Creating too many notifications — OS may throttle or user will disable
- Not clearing notifications — stale notifications pile up

## Related Articles

- [Notification Patterns](../patterns/notification-patterns.md)
- [Notifications API](../api-reference/notifications-api.md)
