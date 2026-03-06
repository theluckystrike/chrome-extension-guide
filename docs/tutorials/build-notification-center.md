# Building a Notification Center with Chrome Extension

This tutorial demonstrates how to build a comprehensive notification center for your Chrome extension using the side panel, notifications API, storage, and alarms.

## Prerequisites

- Chrome 114+ (for side panel support)
- Basic knowledge of Manifest V3
- Understanding of service workers

## Required Permissions

Add these permissions to your `manifest.json`:

```json
{
  "permissions": [
    "notifications",
    "sidePanel",
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

For detailed permission explanations, see:
- [permissions/notifications.md](../permissions/notifications.md)
- [permissions/sidePanel.md](../permissions/sidePanel.md)

## Manifest Configuration

Configure your extension to use the side panel:

```json
{
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_icon": "icon.png",
    "default_title": "Notification Center"
  }
}
```

## Notification Types

Chrome notifications support four types (`basic`, `image`, `list`, `progress`):

### Basic Notification

```javascript
chrome.notifications.create('notification-id', {
  type: 'basic',
  iconUrl: 'icon.png',
  title: 'Hello!',
  message: 'This is a basic notification',
  priority: 1
});
```

### List Notification

```javascript
chrome.notifications.create('list-notification', {
  type: 'list',
  iconUrl: 'icon.png',
  title: 'Multiple Items',
  message: 'First item',
  items: [
    { title: 'Item 1', message: 'Description 1' },
    { title: 'Item 2', message: 'Description 2' }
  ]
});
```

### Progress Notification

```javascript
chrome.notifications.create('progress-notification', {
  type: 'progress',
  iconUrl: 'icon.png',
  title: 'Downloading...',
  message: 'Progress update',
  progress: 50  // 0-100
});
```

## Notification History Storage

Store notification history using `@theluckystrike/webext-storage`:

```javascript
// background.js
import { Storage } from '@theluckystrike/webext-storage';

const storage = new Storage();

const NOTIFICATION_HISTORY_KEY = 'notification_history';

export async function saveNotification(notification) {
  const history = await storage.get(NOTIFICATION_HISTORY_KEY) || [];
  
  const notificationRecord = {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    timestamp: Date.now(),
    read: false,
    type: notification.type
  };
  
  history.unshift(notificationRecord);
  
  // Keep only last 100 notifications
  await storage.set(NOTIFICATION_HISTORY_KEY, history.slice(0, 100));
  
  return notificationRecord;
}

export async function getNotificationHistory() {
  return await storage.get(NOTIFICATION_HISTORY_KEY) || [];
}

export async function markAsRead(notificationId) {
  const history = await storage.get(NOTIFICATION_HISTORY_KEY) || [];
  const updated = history.map(n => 
    n.id === notificationId ? { ...n, read: true } : n
  );
  await storage.set(NOTIFICATION_HISTORY_KEY, updated);
}

export async function getUnreadCount() {
  const history = await storage.get(NOTIFICATION_HISTORY_KEY) || [];
  return history.filter(n => !n.read).length;
}
```

## Side Panel Implementation

Create `sidepanel.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div class="header">
    <h1>Notification Center</h1>
    <span id="unread-badge" class="badge">0</span>
  </div>
  <div id="notification-list" class="notification-list"></div>
  <script src="sidepanel.js"></script>
</body>
</html>
```

## Communication with Service Worker

Use `@theluckystrike/webext-messaging` for communication:

```javascript
// sidepanel.js
import { Messaging } from '@theluckystrike/webext-messaging';

const messaging = new Messaging();

// Request notification history on load
const history = await messaging.sendToBackground('get-notification-history');
renderNotifications(history);

// Listen for new notifications
messaging.onMessage((message) => {
  if (message.type === 'new-notification') {
    prependNotification(message.notification);
    updateBadge(message.unreadCount);
  }
});
```

```javascript
// background.js
import { Messaging } from '@theluckystrike/webext-messaging';

const messaging = new Messaging();

messaging.onMessage((message, sender) => {
  switch (message.type) {
    case 'get-notification-history':
      return getNotificationHistory();
    case 'mark-as-read':
      return markAsRead(message.notificationId);
    case 'clear-history':
      return clearNotificationHistory();
  }
});
```

## Button Click Handlers

Handle notification button clicks:

```javascript
// background.js
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log(`Button ${buttonIndex} clicked for notification ${notificationId}`);
  
  if (buttonIndex === 0) {
    // Primary action - mark as read and open related content
    handlePrimaryAction(notificationId);
  } else if (buttonIndex === 1) {
    // Secondary action - dismiss
    handleSecondaryAction(notificationId);
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  // Handle notification click (not button)
  openNotificationDetails(notificationId);
});

chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  if (byUser) {
    // User closed the notification - mark as read
    markAsRead(notificationId);
    updateBadge();
  }
});
```

Create notifications with buttons:

```javascript
chrome.notifications.create('with-buttons', {
  type: 'basic',
  iconUrl: 'icon.png',
  title: 'Action Required',
  message: 'Please choose an action',
  buttons: [
    { title: 'View Details' },
    { title: 'Dismiss' }
  ]
});
```

## Badge with Unread Count

Update the extension badge to show unread count:

```javascript
export async function updateBadge() {
  const unreadCount = await getUnreadCount();
  
  if (unreadCount > 0) {
    chrome.action.setBadgeText({ text: unreadCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#FF5722' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Call after creating or reading notifications
await updateBadge();
```

## Scheduled Notifications with Alarms

Schedule notifications using the alarms API:

```javascript
// background.js
chrome.alarms.create('scheduled-notification', {
  delayInMinutes: 5,
  periodInMinutes: 60  // Repeat every hour
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'scheduled-notification') {
    sendScheduledNotification();
  }
});

async function sendScheduledNotification() {
  // Check if we should send a notification
  const settings = await storage.get('notification_settings');
  
  if (!settings.enabled) return;
  
  const notification = {
    id: `scheduled-${Date.now()}`,
    title: 'Scheduled Reminder',
    message: 'Your scheduled notification is here!',
    type: 'basic'
  };
  
  await chrome.notifications.create(notification.id, {
    type: 'basic',
    iconUrl: 'icon.png',
    title: notification.title,
    message: notification.message
  });
  
  await saveNotification(notification);
  await updateBadge();
}
```

## Complete Flow

Here's the complete flow:

1. **Service Worker** creates notification via `chrome.notifications.create()`
2. User clicks button or notification
3. **Service Worker** handles click via `onButtonClicked` or `onClicked`
4. Notification is saved to storage with `saveNotification()`
5. Badge updates with `updateBadge()`
6. **Side Panel** receives updates via messaging
7. User views history in side panel
8. Notifications marked as read via `markAsRead()`

## Best Practices

- Always handle notification permissions gracefully
- Limit stored history to prevent storage bloat
- Use appropriate notification types for content
- Clear badges when notifications are read
- Test with Chrome's notification permissions

## Related Resources

- [Chrome Notifications API](https://developer.chrome.com/docs/extensions/reference/notifications/)
- [Side Panel API](https://developer.chrome.com/docs/extensions/reference/sidePanel/)
- [Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)
- [@theluckystrike/webext-storage](https://www.npmjs.com/package/@theluckystrike/webext-storage)
- [@theluckystrike/webext-messaging](https://www.npmjs.com/package/@theluckystrike/webext-messaging)
