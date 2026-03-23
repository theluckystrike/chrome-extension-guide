Chrome Notifications API

Overview

The Chrome Notifications API enables extensions to display system-level notifications that appear outside the browser window, similar to native desktop applications. These notifications can include text, images, action buttons, and progress indicators, making them powerful tools for user engagement and real-time updates.

Reference: [developer.chrome.com/docs/extensions/reference/api/notifications](https://developer.chrome.com/docs/extensions/reference/api/notifications)

Getting Started

Permission Required

Add the notifications permission to your `manifest.json`:

```json
{
  "permissions": ["notifications"]
}
```

Basic Syntax

```javascript
// Create a simple notification
chrome.notifications.create(
  "notification-id",           // Unique string ID (optional)
  {                            // NotificationOptions object
    type: "basic",
    iconUrl: "images/icon.png",
    title: "Notification Title",
    message: "Notification message"
  },
  (callback) => {              // Completion callback
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    }
  }
);
```

Template Types

The API supports four template types for different notification styles.

1. Basic Notification

The simplest form with an icon, title, and message:

```javascript
chrome.notifications.create("basic-demo", {
  type: "basic",
  iconUrl: "images/app-icon.png",
  title: "New Message",
  message: "You have received a new message from John",
  contextMessage: "From: john@example.com",
  priority: 1,
  silent: false
});
```

2. Image Notification

Displays a larger preview image below the text (recommended 300x200px):

```javascript
chrome.notifications.create("image-demo", {
  type: "image",
  iconUrl: "images/app-icon.png",
  title: "Photo Album",
  message: "New photos added to your album",
  imageUrl: "images/photo-preview.jpg",
  contextMessage: "Click to view all photos"
});
```

3. List Notification

Shows multiple items in a compact list format:

```javascript
chrome.notifications.create("list-demo", {
  type: "list",
  iconUrl: "images/app-icon.png",
  title: "Tasks Due",
  message: "3 tasks require attention",
  items: [
    { title: "Review PR #123", message: "Needs approval" },
    { title: "Update documentation", message: "API docs outdated" },
    { title: "Fix login bug", message: "SSO not working" }
  ]
});
```

4. Progress Notification

Displays a progress bar for ongoing operations:

```javascript
chrome.notifications.create("progress-demo", {
  type: "progress",
  iconUrl: "images/app-icon.png",
  title: "Downloading File",
  message: "downloading-large-file.zip",
  progress: 45,  // 0-100 integer
  silent: true   // Often combined with silent for background downloads
});
```

Action Buttons

Add up to two clickable buttons to notifications:

```javascript
chrome.notifications.create("with-buttons", {
  type: "basic",
  iconUrl: "images/app-icon.png",
  title: "Update Available",
  message: "Version 2.0 is ready to install",
  buttons: [
    { title: "Update Now", iconUrl: "images/update-icon.png" },
    { title: "Later" }
  ],
  requireInteraction: true  // Keeps notification visible until user acts
});
```

Handle button clicks:

```javascript
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === "with-buttons") {
    if (buttonIndex === 0) {
      // Update Now clicked
      triggerUpdate();
    } else if (buttonIndex === 1) {
      // Later clicked - snooze for later
      scheduleSnooze();
    }
  }
});
```

Event Handlers

onClicked - Notification Body Clicked

Triggered when user clicks the notification body (not buttons):

```javascript
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log(`Notification clicked: ${notificationId}`);
  
  // Common actions:
  // - Open relevant page
  chrome.tabs.create({ url: "https://example.com/dashboard" });
  
  // - Focus existing tab
  chrome.tabs.query({ url: "*://example.com/*" }, (tabs) => {
    if (tabs[0]) chrome.tabs.highlight({ tabs: tabs[0].index });
  });
  
  // - Clear the notification
  chrome.notifications.clear(notificationId);
});
```

onButtonClicked - Action Button Clicked

Handle button interactions with the `buttonIndex`:

```javascript
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  switch (notificationId) {
    case "download-complete":
      if (buttonIndex === 0) openDownload();
      break;
    case "reminder":
      if (buttonIndex === 0) snoozeReminder();
      else dismissReminder();
      break;
  }
  chrome.notifications.clear(notificationId);
});
```

onClosed - Notification Dismissed

Track when notifications are dismissed:

```javascript
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  if (byUser) {
    console.log(`User dismissed notification: ${notificationId}`);
    // Update user preferences or track dismissal analytics
  } else {
    console.log(`System closed notification: ${notificationId}`);
    // Often due to OS notification limits
  }
});
```

onShown - Notification Displayed

 fires after notification is rendered (useful for analytics):

```javascript
chrome.notifications.onShown.addListener((notificationId) => {
  console.log(`Notification shown: ${notificationId}`);
  trackNotificationDisplayed(notificationId);
});
```

Updating Notifications

Modify existing notifications in-place using their ID:

```javascript
// Track download progress
let progress = 0;
const notificationId = "download-progress";

const updateProgress = () => {
  progress += 10;
  
  chrome.notifications.update(notificationId, {
    progress: progress,
    message: `${(progress / 100 * 150).toFixed(0)} MB of 150 MB`
  }, (wasUpdated) => {
    if (!wasUpdated) {
      console.error("Failed to update notification");
    }
  });
  
  if (progress >= 100) {
    clearInterval(timer);
    chrome.notifications.update(notificationId, {
      progress: 100,
      message: "Download complete!"
    });
  }
};

const timer = setInterval(updateProgress, 1000);
```

Building a Notification Center

Aggregate notifications into a custom notification center UI:

```javascript
// Store notification history
const notificationHistory = [];

chrome.notifications.onShown.addListener((notificationId) => {
  const notification = {
    id: notificationId,
    timestamp: Date.now(),
    viewed: false
  };
  notificationHistory.push(notification);
  updateBadgeCount();
});

chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  const notification = notificationHistory.find(n => n.id === notificationId);
  if (notification) notification.viewed = true;
  updateBadgeCount();
});

function updateBadgeCount() {
  const unread = notificationHistory.filter(n => !n.viewed).length;
  chrome.action.setBadgeText({ text: unread > 0 ? String(unread) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#FF5722" });
}
```

Notification Manager Class

```javascript
class NotificationManager {
  constructor() {
    this.notifications = new Map();
    this.setupListeners();
  }
  
  create(type, options) {
    const id = options.id || this.generateId();
    const fullOptions = {
      type,
      iconUrl: options.iconUrl || "images/icon.png",
      title: options.title,
      message: options.message,
      ...options
    };
    
    return new Promise((resolve, reject) => {
      chrome.notifications.create(id, fullOptions, (notificationId) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          this.notifications.set(notificationId, { ...fullOptions, created: Date.now() });
          resolve(notificationId);
        }
      });
    });
  }
  
  update(id, options) {
    return new Promise((resolve) => {
      chrome.notifications.update(id, options, resolve);
    });
  }
  
  clear(id) {
    return new Promise((resolve) => {
      chrome.notifications.clear(id, () => {
        this.notifications.delete(id);
        resolve();
      });
    });
  }
  
  clearAll() {
    return new Promise((resolve) => {
      chrome.notifications.getAll((notifications) => {
        Object.keys(notifications).forEach(id => chrome.notifications.clear(id));
        this.notifications.clear();
        resolve();
      });
    });
  }
  
  generateId() {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  setupListeners() {
    chrome.notifications.onClicked.addListener((id) => {
      this.handleClick(id);
    });
    
    chrome.notifications.onButtonClicked.addListener((id, index) => {
      this.handleButton(id, index);
    });
  }
  
  handleClick(id) {
    console.log(`Notification ${id} clicked`);
  }
  
  handleButton(id, index) {
    console.log(`Button ${index} clicked on notification ${id}`);
  }
}

const notifications = new NotificationManager();
```

Platform Differences

| Platform | Behavior |
|----------|----------|
| Windows | Integrates with Action Center; notifications persist until dismissed |
| macOS | Uses Notification Center; may require system permissions |
| Linux | Behavior varies by desktop environment (Unity, GNOME, KDE) |
| ChromeOS | Native notification panel with full feature support |

Platform-Specific Considerations

```javascript
// Detect platform for platform-specific behavior
const isMac = navigator.platform.toLowerCase().includes("mac");
const isWindows = navigator.platform.toLowerCase().includes("win");

// Adjust notification behavior
if (isMac) {
  // macOS doesn't support requireInteraction well
  options.requireInteraction = false;
}

// Windows supports notification sounds differently
if (isWindows) {
  options.silent = false; // Let Windows handle sounds
}
```

Best Practices

1. Unique IDs: Always use meaningful, unique notification IDs to enable updating and clearing
2. Respect Users: Don't spam notifications; provide user controls for frequency
3. Handle Clicks: Always handle `onClicked` to prevent dead-end notifications
4. Clear Stale Notifications: Remove outdated notifications proactively
5. Use Progress Notifications: Show progress for long-running operations
6. Silent Mode: Use `silent: true` for non-critical updates to avoid disrupting users
7. Require Interaction: Use sparingly and only for truly important notifications
8. Icon Requirements: Use 128x128 PNG icons; no remote URLs allowed

Common Issues

- Remote URLs not allowed: `iconUrl` and `imageUrl` must be local extension files or data URLs
- Notification limit: OS may limit active notifications; clear old ones promptly
- Permission denied: Ensure `"notifications"` is in permissions array
- Silent notifications: May be suppressed by OS on low-power mode
- requireInteraction: Only works with priority 2 on Chrome OS and Windows

Related APIs

- [chrome.alarms](/docs/extensions/reference/api/alarms) - Schedule notifications
- [chrome.action.setBadgeText](/docs/extensions/reference/api/action) - Badge indicators
- [GCM Push Notifications](/docs/extensions/reference/api/gcm) - Server-driven notifications
