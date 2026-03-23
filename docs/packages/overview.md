---
layout: default
title: Webext Packages Overview. Chrome Extension Development
description: Complete comparison of @theluckystrike webext packages for Chrome extension development. Learn when to use each package and how to install them.
---

Webext Packages Overview

A comprehensive comparison of the 8 core `@theluckystrike/webext-*` packages for building Chrome extensions. Each package provides typed, Promise-based wrappers for Chrome's extension APIs.

Quick Comparison Table

| Package | Use When... | Install |
|---------|-------------|---------|
| [webext-storage](#webext-storage) | You need typed Chrome storage with schema validation | `npm i @theluckystrike/webext-storage` |
| [webext-messaging](#webext-messaging) | You need type-safe message passing between contexts | `npm i @theluckystrike/webext-messaging` |
| [webext-tabs](#webext-tabs) | You work with browser tabs frequently | `npm i @theluckystrike/webext-tabs` |
| [webext-permissions](#webext-permissions) | You need runtime permission management | `npm i @theluckystrike/webext-permissions` |
| [webext-action](#webext-action) | You need to control the extension toolbar icon | `npm i @theluckystrike/webext-action` |
| [webext-alarms](#webext-alarms) | You need scheduled/periodic tasks | `npm i @theluckystrike/webext-alarms` |
| [webext-badge](#webext-badge) | You need to show notification badges | `npm i @theluckystrike/webext-badge` |
| [webext-notifications](#webext-notifications) | You need rich browser notifications | `npm i @theluckystrike/webext-notifications` |

---

webext-storage

Best for: Persisting extension settings, user preferences, and cached data with full TypeScript support.

```bash
npm install @theluckystrike/webext-storage
```

When to Use
- Storing user preferences that sync across devices
- Caching API responses for offline use
- Managing extension configuration
- Any data that needs to persist across sessions

Key Features
- Schema validation. Define schemas with `defineSchema()` for full type inference
- Typed API. `createStorage()` returns typed get/set/watch interface
- Dual storage. Supports both `local` and `sync` storage areas
- Reactive updates. Watch for storage changes with callbacks

Basic Usage

```typescript
import { defineSchema, createStorage } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  settings: {
    theme: 'light' as string,
    notifications: true as boolean,
  },
  user: {
    name: '' as string,
    lastLogin: 0 as number,
  }
});

const storage = createStorage(schema);

await storage.get('settings'); // { theme: 'light', notifications: true }
await storage.set('settings', { theme: 'dark' });

storage.watch('settings', (changes) => {
  console.log('Settings changed:', changes);
});
```

---

webext-messaging

Best for: Type-safe communication between background scripts, content scripts, and popups.

```bash
npm install @theluckystrike/webext-messaging
```

When to Use
- Background script needs to communicate with content scripts
- Popup needs to query background for data
- Any cross-context communication in your extension
- Building a message-based architecture

Key Features
- Full type inference. `createMessenger<M>()` with typed messages
- Bidirectional. Background-to-content and content-to-background
- Error handling. Custom `MessagingError` class with proper wrapping
- Promise-based. Modern async/await API

Basic Usage

```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  getUser: { request: void; response: { id: string; name: string } };
  updateUser: { request: { name: string }; response: { success: boolean } };
  ping: { request: void; response: 'pong' };
};

// In background script
const backgroundMessenger = createMessenger<Messages>('background');

backgroundMessenger.on('getUser', async () => {
  return { id: '123', name: 'Alice' };
});

backgroundMessenger.on('updateUser', async ({ name }) => {
  await saveUser(name);
  return { success: true };
});

// In content script
const contentMessenger = createMessenger<Messages>('content');
const user = await contentMessenger.send('getUser');
```

---

webext-tabs

Best for: Querying, managing, and manipulating browser tabs in your extension.

```bash
npm install @theluckystrike/webext-tabs
```

When to Use
- Building a tab manager extension
- Need to find active/current tab
- Bulk operations on multiple tabs (close, move, group)
- Tracking tab lifecycle events

Key Features
- Pre-built queries. Active tab, tabs by URL pattern, duplicates
- Typed events. Tab event subscriptions with full types
- Batch operations. Close, move, highlight multiple tabs
- Tab group support. Work with Chrome's tab groups

Basic Usage

```typescript
import { 
  getActiveTab, 
  getTabsByUrl, 
  closeTabs,
  createTab 
} from '@theluckystrike/webext-tabs';

// Get the currently active tab
const activeTab = await getActiveTab();

// Find all tabs matching a URL pattern
const youtubeTabs = await getTabsByUrl('*://*.youtube.com/*');

// Create a new tab
const newTab = await createTab('https://example.com');

// Close multiple tabs
await closeTabs([tab1.id, tab2.id]);

// Listen for tab events
import { onTabCreated, onTabUpdated, onTabClosed } from '@theluckystrike/webext-tabs';

onTabCreated((tab) => {
  console.log('New tab created:', tab.url);
});
```

---

webext-permissions

Best for: Managing runtime permissions. checking, requesting, and removing permissions dynamically.

```bash
npm install @theluckystrike/webext-permissions
```

When to Use
- Onboarding flows that request permissions progressively
- Feature-gated permissions (request only when needed)
- Showing users why certain permissions are needed
- Graceful degradation when permissions are denied

Key Features
- Runtime checks. Check if permission is granted without prompting
- Request flow. Request permissions with context
- Human-readable. 50+ permission descriptions
- Batch operations. Check/request multiple permissions

Basic Usage

```typescript
import { 
  hasPermission, 
  requestPermission, 
  getPermissionDescription 
} from '@theluckystrike/webext-permissions';

// Check if permission is already granted
const hasAccess = await hasPermission('tabs');

// Get human-readable description
console.log(getPermissionDescription('activeTab'));
// → "Access the tabs when you click the extension"

// Request a permission
const granted = await requestPermission('tabs');
if (granted) {
  console.log('Permission granted!');
}

// Check multiple permissions
const needed = ['storage', 'activeTab', 'scripting'];
const hasAll = await Promise.all(needed.map(hasPermission));
```

---

webext-action

Best for: Controlling the extension's toolbar icon (action). setting badge, popup, icon, and title.

```bash
npm install @theluckystrike/webext-action
```

When to Use
- Showing extension status via the toolbar icon
- Opening a popup programmatically
- Setting badge text (like unread counts)
- Dynamic title based on state

Key Features
- Full control. Icon, title, badge, popup programmatically
- Per-tab config. Different settings per tab
- Click handling. Unified click event handling

Basic Usage

```typescript
import { 
  setIcon, 
  setBadge, 
  setTitle, 
  setPopup,
  openPopup,
  onActionClicked 
} from '@theluckystrike/webext-action';

// Set icon
await setIcon({ path: 'icons/icon-48.png' });

// Set badge (shows on toolbar)
await setBadge({ text: '5', color: '#FF0000' });

// Set tooltip title
await setTitle({ title: 'My Extension - 5 unread' });

// Open popup programmatically
await openPopup();

// Handle icon click (when no popup is set)
onActionClicked.addListener((tab) => {
  console.log('Icon clicked on tab:', tab.id);
});
```

---

webext-alarms

Best for: Scheduling periodic tasks in your extension background service worker.

```bash
npm install @theluckystrike/webext-alarms
```

When to Use
- Periodic data sync or refresh
- Scheduled notifications
- Cleanup tasks (clear cache, old data)
- Any time-based recurring operations

Key Features
- Create/query/clear. Full alarm lifecycle management
- Typed events. Alarm fired event with types
- Minimum interval. Automatic enforcement of Chrome's 1-minute minimum

Basic Usage

```typescript
import { 
  createAlarm, 
  getAlarm, 
  getAllAlarms, 
  clearAlarm,
  onAlarmFired 
} from '@theluckystrike/webext-alarms';

// Create a periodic alarm (minimum 1 minute in Chrome)
await createAlarm({
  name: 'data-sync',
  delayInMinutes: 15,  // Or use periodInMinutes for repeating
  periodInMinutes: 15
});

// Get specific alarm
const alarm = await getAlarm('data-sync');

// Listen for alarm
onAlarmFired.addListener((alarm) => {
  if (alarm.name === 'data-sync') {
    syncData();
  }
});

// Clear when done
await clearAlarm('data-sync');
```

---

webext-badge

Best for: Showing small text overlays on the extension icon. notification counts, status indicators.

```bash
npm install @theluckystrike/webext-badge
```

When to Use
- Unread count badges
- Status indicators (online/offline, syncing)
- Quick visual feedback without notifications
- Number overlays on the toolbar icon

Key Features
- Text and color. Full control over badge content
- Per-tab badges. Different badges for different tabs
- Clear/reset. Easy cleanup

Basic Usage

```typescript
import { 
  setBadge, 
  getBadge, 
  clearBadge,
  setBadgeColor 
} from '@theluckystrike/webext-badge';

// Set badge with count
await setBadge({ text: '12' });

// Set badge with color
await setBadge({ text: '3', color: '#FF5733' });

// Per-tab badge
await setBadge({ text: '5', tabId: 123 });

// Clear badge
await clearBadge();

// Get current badge
const current = await getBadge();
```

---

webext-notifications

Best for: Rich browser notifications with interactive buttons, icons, and click handlers.

```bash
npm install @theluckystrike/webext-notifications
```

When to Use
- User alerts and reminders
- Action notifications (with buttons)
- Progress notifications
- Click-through to specific content

Key Features
- Multiple types. Basic, image, list, progress notifications
- Interactive. Button clicks, icon clicks
- Updates. Modify existing notifications
- Full typing. TypeScript support for all options

Basic Usage

```typescript
import { 
  createNotification, 
  updateNotification,
  clearNotification,
  onNotificationClicked,
  onNotificationButtonClicked
} from '@theluckystrike/webext-notifications';

// Create basic notification
await createNotification({
  type: 'basic',
  iconUrl: 'icons/notification.png',
  title: 'New Message',
  message: 'You have 3 new messages',
  priority: 1
});

// Create with action buttons
await createNotification({
  type: 'basic',
  title: 'Download Complete',
  message: 'file.zip has been downloaded',
  buttons: [
    { title: 'Open File' },
    { title: 'Show in Folder' }
  ]
});

// Handle clicks
onNotificationClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
});

onNotificationButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    openFile();
  }
});
```

---

Which Package Should You Use?

| Scenario | Recommended Package |
|----------|-------------------|
| Store user settings | `webext-storage` |
| Store app state | `webext-storage` + `webext-reactive-store` |
| Background ↔ Content communication | `webext-messaging` |
| Popup ↔ Background communication | `webext-messaging` |
| Work with browser tabs | `webext-tabs` |
| Request permissions on demand | `webext-permissions` |
| Toolbar icon control | `webext-action` |
| Show notification count | `webext-badge` |
| Schedule background tasks | `webext-alarms` |
| Rich user notifications | `webext-notifications` |

Bundle All Eight

If you need all eight packages, consider the meta-package:

```bash
npm install @theluckystrike/chrome-extension-toolkit
```

This installs all core webext packages plus additional utilities in one command.

---

Related Articles

- [Package Catalog](/docs/package-catalog). Full list of all 80+ packages
- [Getting Started](/docs/getting-started). Set up your first extension
- [Storage Guide](/docs/guides/storage-patterns). Best practices for extension storage
- [Messaging Architecture](/docs/guides/messaging-patterns). Cross-context communication
