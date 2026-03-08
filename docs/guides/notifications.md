---
layout: default
title: "Chrome Extension Notifications — How to Send Desktop Alerts and Updates"
description: "Learn how to use the chrome.notifications API to send desktop notifications in Chrome extensions. Covers notification types, buttons, images, event handlers, and limits."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/notifications/"
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
