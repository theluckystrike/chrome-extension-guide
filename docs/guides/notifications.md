---
layout: default
title: "Chrome Extension Notifications — How to Send Desktop Alerts and Updates"
description: "Learn how to use the chrome.notifications API to send desktop notifications in Chrome extensions. Covers notification types, buttons, images, event handlers, and limits."
canonical_url: "https://bestchromeextensions.com/guides/notifications/"
---

# Chrome Extension Notifications — How to Send Desktop Alerts and Updates

## Introduction {#introduction}

The `chrome.notifications` API enables Chrome extensions to display desktop notifications to users, even when the extension's popup or service worker is not actively running. This API is essential for building user engagement features, alerting users to important events, and providing real-time updates without requiring users to keep your extension's interface open.

Desktop notifications appear in the system's notification center and persist until the user dismisses them or they timeout. This makes them perfect for scenarios like monitoring tasks, message alerts, background synchronization status, and time-sensitive updates.

## Adding the Notifications Permission {#adding-the-notifications-permission}

Before using the notifications API, you must declare the appropriate permissions in your extension's `manifest.json` file:

```json
{
  "permissions": ["notifications"]
}
```

For Manifest V3 extensions, the notifications API works within the service worker context. However, note that the notification will be displayed by the Chrome browser itself, not by your extension's running process.

## Creating Basic Notifications {#creating-basic-notifications}

The `chrome.notifications.create()` method is the primary way to display notifications. This method accepts a unique notification ID and a notification options object:

```javascript
chrome.notifications.create("notification-id-1", {
  type: "basic",
  iconUrl: "images/icon.png",
  title: "Update Available",
  message: "A new version of the extension is available!"
}, function(notificationId) {
  if (chrome.runtime.lastError) {
    console.error("Notification error:", chrome.runtime.lastError);
  }
});
```

The notification ID is important—you can use it to update or clear specific notifications later. If you pass an empty string or null as the ID, Chrome will generate a unique ID automatically.

## Notification Types {#notification-types}

Chrome supports several notification types that determine how the notification appears:

### Basic Notification

The most common type, displaying an icon, title, and message:

```javascript
{
  type: "basic",
  iconUrl: "images/icon.png",
  title: "Task Complete",
  message: "Your backup has finished successfully."
}
```

### Image Notification

Displays a larger image, ideal for visual content:

```javascript
{
  type: "image",
  iconUrl: "images/icon.png",
  imageUrl: "images/preview.png",
  title: "Photo Uploaded",
  message: "Your photo is now visible to friends."
}
```

### List Notification

Shows multiple items in a structured format:

```javascript
{
  type: "list",
  iconUrl: "images/icon.png",
  title: "New Messages",
  message: "You have 3 new messages.",
  items: [
    { title: "John", message: "Hey, how are you?" },
    { title: "Sarah", message: "Meeting at 3pm" },
    { title: "Mike", message: "Check this out!" }
  ]
}
```

### Progress Notification

Displays a progress bar for ongoing operations:

```javascript
{
  type: "progress",
  iconUrl: "images/icon.png",
  title: "Downloading...",
  message: "Download in progress",
  progress: 45  // 0-100 percentage
}
```

## Adding Buttons to Notifications {#adding-buttons-to-notifications}

Interactive buttons make notifications more powerful by allowing users to take action directly from the notification:

```javascript
chrome.notifications.create("notification-with-buttons", {
  type: "basic",
  iconUrl: "images/icon.png",
  title: "New Friend Request",
  message: "John Smith wants to connect",
  buttons: [
    { title: "Accept" },
    { title: "Decline" }
  ]
}, function(notificationId) {
  // Notification created
});
```

When users click these buttons, your extension receives the event through the `chrome.notifications.onButtonClicked` listener.

## Handling Notification Events {#handling-notification-events}

Your extension can respond to user interactions with notifications through several event listeners:

### Click Events

Triggered when users click the notification body:

```javascript
chrome.notifications.onClicked.addListener(function(notificationId) {
  console.log("Notification clicked:", notificationId);
  
  // Open extension popup or navigate to a page
  chrome.action.openPopup();
});
```

### Button Click Events

Triggered when users click action buttons:

```javascript
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
  console.log("Button clicked:", notificationId, "Button index:", buttonIndex);
  
  if (buttonIndex === 0) {
    // Handle Accept action
    acceptFriendRequest(notificationId);
  } else if (buttonIndex === 1) {
    // Handle Decline action
    declineFriendRequest(notificationId);
# Chrome Extension Notifications API

## Introduction
- `chrome.notifications` API allows extensions to display system notifications to users
- Notifications appear in the system's notification center (Windows, macOS, Linux) or notification shade (Chrome OS, Android)
- Requires `"notifications"` permission in manifest.json
- Works in both MV2 (background pages) and MV3 (service workers)
- Reference: https://developer.chrome.com/docs/extensions/reference/api/notifications

## manifest.json
```json
{
  "permissions": ["notifications"],
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
}
```
- Icon is shown in the notification; use extension icons or custom notification-specific icons

## Creating Notifications

### Basic Notification
```javascript
chrome.notifications.create("notification-id-1", {
  type: "basic",
  iconUrl: "images/icon48.png",
  title: "Hello!",
  message: "This is a basic notification.",
  priority: 0
}, (notificationId) => {
  console.log("Created notification:", notificationId);
});
```
- `notificationId`: Unique string to identify this notification (required first param)
- `type`: Template type (basic, image, list, progress)
- `iconUrl`: Path to icon image (relative to extension root)
- `priority`: -2 to 2 (higher = more important, 0 is default)

### Notification with Image
```javascript
chrome.notifications.create("notification-with-image", {
  type: "image",
  iconUrl: "images/icon48.png",
  title: "New Photo",
  message: "Someone shared a photo with you.",
  imageUrl: "images/photo-preview.jpg",
  priority: 1
});
```
- `imageUrl`: Large image displayed in notification (up to 320x320 in most systems)

### List Notification
```javascript
chrome.notifications.create("notification-list", {
  type: "list",
  iconUrl: "images/icon48.png",
  title: "3 New Emails",
  message: "You have new messages.",
  items: [
    { title: "Project Update", message: "The project is ready for review" },
    { title: "Meeting Reminder", message: "Standup in 15 minutes" },
    { title: "Newsletter", message: "This week's tech news" }
  ],
  priority: 1
});
```
- `items`: Array of up to 3 items (varies by platform)
- Each item has `title` and `message` properties

### Progress Notification
```javascript
chrome.notifications.create("download-progress", {
  type: "progress",
  iconUrl: "images/icon48.png",
  title: "Downloading File",
  message: "Download in progress...",
  progress: 45,  // 0-100 percentage
  priority: 1
});
```
- `progress`: Integer 0-100 (or -1 for indeterminate)
- Useful for long-running operations like downloads, sync, uploads

## NotificationOptions Reference

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | Template: "basic", "image", "list", or "progress" |
| `iconUrl` | string | Path to notification icon |
| `title` | string | Notification header (max ~50 chars recommended) |
| `message` | string | Main notification body (max ~200 chars recommended) |
| `priority` | number | -2 to 2 (0 default); higher = more important |
| `eventTime` | number | Unix timestamp for timestamp display |
| `buttons` | array | Up to 2 action buttons |
| `imageUrl` | string | Large image (type: "image" only) |
| `items` | array | List items (type: "list" only) |
| `progress` | number | Progress value 0-100 (type: "progress" only) |
| `requireInteraction` | boolean | Keep on screen until user interacts (MV3 only) |

### Buttons
```javascript
chrome.notifications.create("with-buttons", {
  type: "basic",
  iconUrl: "images/icon48.png",
  title: "Download Complete",
  message: "File has been downloaded.",
  buttons: [
    { title: "Open File", iconUrl: "images/open.png" },
    { title: "Show in Folder", iconUrl: "images/folder.png" }
  ]
});
```
- Maximum 2 buttons per notification
- Each button has `title` and optional `iconUrl`

## Handling Notification Events

### onClicked - User clicked notification body
```javascript
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === "notification-id-1") {
    // Focus extension popup or open a page
    chrome.action.openPopup();
    // Or open a new tab:
    // chrome.tabs.create({ url: "options.html" });
  }
});
```

### Notification Closed Events

Fired when notifications are dismissed or timeout:

```javascript
chrome.notifications.onClosed.addListener(function(notificationId, byUser) {
  console.log("Notification closed:", notificationId, "By user:", byUser);
});
```

## Using Images in Notifications {#using-images-in-notifications}

Image notifications require the `notifications` permission and work best with appropriately sized images. The recommended icon size is 128x128 pixels for best display quality across different screen resolutions:

```javascript
chrome.notifications.create("image-notification", {
  type: "image",
  iconUrl: "images/app-icon.png",
  imageUrl: "images/screenshot.png",
  title: "Screenshot Captured",
  message: "Your screenshot has been saved to Downloads."
}, callback);
```

Note that image URLs must be relative paths within your extension or absolute URLs from a web accessible resource. The image will be scaled to fit the notification area.

## Managing Notification Limits {#managing-notification-limits}

Chrome enforces limits on notifications to prevent abuse and ensure good user experience:

- **Maximum active notifications**: Chrome typically allows up to 3 visible notifications at once
- **Auto-clear behavior**: Notifications may be automatically cleared when new ones exceed the limit
- **User preferences**: Users can disable notifications entirely through Chrome settings

Best practices for handling limits:

```javascript
// Use a single notification ID to update rather than create new ones
const NOTIFICATION_ID = "status-update";

function updateStatus(message, progress) {
  chrome.notifications.create(NOTIFICATION_ID, {
    type: progress !== undefined ? "progress" : "basic",
    iconUrl: "images/icon.png",
    title: "Extension Status",
    message: message,
    progress: progress,
    priority: 1  // Higher priority increases visibility
  });
}

// Clear notifications when no longer needed
function clearNotification() {
  chrome.notifications.clear(NOTIFICATION_ID, function(wasCleared) {
    console.log("Notification cleared:", wasCleared);
  });
}
```

## Best Practices {#best-practices}

When implementing notifications in your Chrome extension:

1. **Request permissions sparingly** – Only request the notifications permission when truly needed
2. **Respect user preferences** – Allow users to opt out of notifications within your extension
3. **Use appropriate notification types** – Choose the right type for your use case (progress for ongoing tasks, list for multiple items)
4. **Handle errors gracefully** – Always check for `chrome.runtime.lastError` in callbacks
5. **Test on multiple platforms** – Notification appearance varies across operating systems

## Conclusion {#conclusion}

The `chrome.notifications` API provides a powerful way to engage users with your Chrome extension through desktop alerts and interactive notifications. By understanding the different notification types, implementing button interactions, and respecting platform limits, you can create compelling notification experiences that keep users informed and engaged with your extension's functionality.
### onButtonClicked - User clicked a button
```javascript
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === "with-buttons") {
    if (buttonIndex === 0) {
      // "Open File" button clicked
      openFile();
    } else if (buttonIndex === 1) {
      // "Show in Folder" button clicked
      showInFolder();
    }
  }
});
```

### onClosed - Notification was dismissed
```javascript
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  console.log(`Notification ${notificationId} closed by ${byUser ? 'user' : 'system'}`);
  // byUser = true if user dismissed; false if system removed it
});
```

## Updating Notifications

### Update Progress
```javascript
// Update progress bar
chrome.notifications.update("download-progress", {
  progress: 75,
  message: "Download 75% complete..."
}, (wasUpdated) => {
  if (wasUpdated) {
    console.log("Progress updated");
  }
});
```

### Update to Show Completion
```javascript
// Change from progress to complete
chrome.notifications.update("download-progress", {
  type: "basic",
  message: "Download complete!",
  priority: 1
});
```

## Clearing Notifications

### Clear Single Notification
```javascript
chrome.notifications.clear("notification-id-1", (wasCleared) => {
  if (wasCleared) {
    console.log("Notification cleared");
  }
});
```

### Clear All Notifications
```javascript
chrome.notifications.getAll((notifications) => {
  Object.keys(notifications).forEach(id => {
    chrome.notifications.clear(id);
  });
});
```

## Template Use Cases

| Template | Best For |
|----------|----------|
| `basic` | Simple alerts, confirmations, reminders |
| `image` | Rich notifications with preview (photos, screenshots) |
| `list` | Multiple items (emails, messages, updates) |
| `progress` | Long-running operations (downloads, sync, upload) |

## Combining with chrome.alarms

### Scheduled Notifications
```javascript
// Schedule a notification for later
chrome.alarms.create("reminder-alarm", {
  delayInMinutes: 30
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "reminder-alarm") {
    chrome.notifications.create("reminder-1", {
      type: "basic",
      iconUrl: "images/icon48.png",
      title: "Reminder",
      message: "Time to check your tasks!",
      buttons: [
        { title: "Dismiss" },
        { title: "Snooze", iconUrl: "images/snooze.png" }
      ]
    });
  }
});
```

### Periodic Summary Notifications
```javascript
// Daily digest at 9 AM
chrome.alarms.create("daily-digest", {
  when: getNext9AM(),
  periodInMinutes: 24 * 60  // Daily
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "daily-digest") {
    const stats = await getDailyStats();
    chrome.notifications.create("daily-summary", {
      type: "list",
      iconUrl: "images/icon48.png",
      title: "Daily Summary",
      message: `${stats.newItems} new items today`,
      items: [
        { title: "Emails", message: `${stats.emails} new` },
        { title: "Tasks", message: `${stats.tasks} completed` },
        { title: "Alerts", message: `${stats.alerts} pending` }
      ]
    });
  }
});

function getNext9AM() {
  const now = new Date();
  const next9AM = new Date(now);
  next9AM.setHours(9, 0, 0, 0);
  if (next9AM <= now) {
    next9AM.setDate(next9AM.getDate() + 1);
  }
  return next9AM.getTime();
}
```

## Best Practices

### Don't Spam Users
- Only send notifications for genuinely important events
- Respect user attention — avoid excessive notifications
- Consider adding a user preference for notification frequency
- Use `priority` wisely — reserve high priority for critical alerts

### Respect User Choices
```javascript
// Check if notifications are permitted
chrome.notifications.getPermissionLevel((level) => {
  if (level === "granted") {
    // Can show notifications
  } else if (level === "denied") {
    // Can't show notifications — show in-app message instead
  }
});
```

### Clear After Purpose
```javascript
// Auto-clear successful notifications after a delay
chrome.notifications.onClicked.addListener((id) => {
  // Clear after user clicks (optional)
  setTimeout(() => chrome.notifications.clear(id), 5000);
});
```

### Handle Permission Denied
```javascript
async function showNotification(title, message) {
  const level = await new Promise(resolve => 
    chrome.notifications.getPermissionLevel(resolve)
  );
  
  if (level !== "granted") {
    console.warn("Notifications not permitted");
    return;
  }
  
  chrome.notifications.create({ /* ... */ });
}
```

### Use Meaningful IDs
```javascript
// Good: Descriptive, unique IDs
chrome.notifications.create(`download-${fileId}`, { /* ... */ });

// Avoid: Generic or duplicate IDs
chrome.notifications.create("notification", { /* ... */ });
```

## Common Mistakes
- Not checking permission before creating notifications
- Using the same notification ID without updating — overwrites previous
- Exceeding character limits — content may be truncated
- Too many buttons — only first 2 are shown on most platforms
- Not handling `onClicked` — clicks do nothing by default
- Creating notifications in content scripts — must be in background/service worker
- Using progress type incorrectly — progress must be 0-100 or -1

## Complete Example
```javascript
// background.js

// Create notification with all features
function showDownloadComplete(fileName, filePath) {
  chrome.notifications.create(`download-${Date.now()}`, {
    type: "basic",
    iconUrl: "images/icon48.png",
    title: "Download Complete",
    message: `${fileName} has been downloaded.`,
    buttons: [
      { title: "Open", iconUrl: "images/open.png" },
      { title: "Show in Folder", iconUrl: "images/folder.png" }
    ],
    priority: 1
  });
}

// Handle button clicks
chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
  if (id.startsWith("download-")) {
    if (buttonIndex === 0) {
      // Open file
      const filePath = getFilePathFromId(id);
      chrome.downloads.open(filePath);
    } else if (buttonIndex === 1) {
      // Show in folder
      const filePath = getFilePathFromId(id);
      chrome.downloads.show(filePath);
    }
    // Clear after action
    chrome.notifications.clear(id);
  }
});

// Clear on click — focus app instead
chrome.notifications.onClicked.addListener((id) => {
  chrome.notifications.clear(id);
  chrome.windows.create({ url: "dashboard.html" });
});
```

## Summary
- Use `chrome.notifications.create()` with proper `NotificationOptions`
- Choose the right template type for your use case
- Handle `onClicked`, `onButtonClicked`, and `onClosed` events
- Use `update()` and `clear()` to manage notification lifecycle
- Combine with `chrome.alarms` for scheduled/scheduled notifications
- Always respect users — don't spam notifications
- Check permission status before creating notifications

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.