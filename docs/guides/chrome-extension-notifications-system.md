---
layout: default
title: "Chrome Extension Notifications: Badges, Alarms, and Alert Systems"
description: "Master Chrome extension notifications. Learn the Notifications API, badge management, alarm scheduling, in-page toasts, and smart notification timing with TypeScript."
permalink: /guides/chrome-extension-notifications-system/
---

# Chrome Extension Notifications: Badges, Alarms, and Alert Systems

Notifications are one of the most powerful features for engaging users in Chrome extensions. When implemented correctly, they keep users informed about important events, drive return visits, and create meaningful touchpoints without overwhelming them. This comprehensive guide covers every aspect of notification systems in Chrome extensions, from system-level desktop notifications to in-page toast components, badge management, and intelligent scheduling.

## Introduction: Notifications as a User Engagement Tool

Chrome extensions have access to multiple notification mechanisms, each suited for different use cases and user experience requirements. Understanding when and how to use each type is essential for building extensions that users find valuable rather than annoying.

### Types of Notifications Available to Extensions

**System Tray Notifications** (chrome.notifications API): These appear in the operating system's notification center and persist until dismissed. They support rich content including images, action buttons, and progress indicators. System notifications are ideal for time-sensitive alerts, important updates, and events that warrant interrupting the user's workflow.

**Badge Text and Icon**: The extension icon in the Chrome toolbar can display a small text overlay (the badge) showing numbers like unread counts or status indicators. This lightweight notification mechanism doesn't interrupt the user but provides persistent visual feedback. Combined with dynamic icon changes, badges communicate state changes without requiring any user interaction.

**In-Page Notifications**: These are custom UI elements injected into web pages via content scripts. Toast notifications slide in from corners of the page, while panels can display more substantial content. In-page notifications work well for page-specific alerts, context-aware tips, and feedback related to the current page.

**Popup-Based Notifications**: The extension's popup can display its own notification UI. While this requires users to open the popup, it provides complete control over the notification appearance and behavior without system-level constraints.

### When to Notify vs. When Not to Notify

Notification fatigue is a real problem that leads users to disable notifications entirely or uninstall extensions that spam them. Before sending any notification, ask these questions:

1. **Is this time-sensitive?** If the information will be equally valuable hours later, don't interrupt the user now.
2. **Does the user explicitly want this?** Respect opt-in preferences and per-category settings.
3. **Could this wait for a batched update?** Instead of five notifications about five items changing, send one summary notification.
4. **Is this truly important?** Marketing messages, upsells, and promotional content should never use system notifications—violating Chrome Web Store policies and annoying users.

The best notification systems are opt-in, configurable, and respect user attention. For strategies on using notifications to reduce churn and retain users, see the [Extension Monetization Guide](/guides/extension-monetization/).

## Chrome Notifications API

The chrome.notifications API is the primary way to send desktop notifications that appear in the system notification center. These notifications work even when Chrome is minimized or in the background.

### Permission Setup in Manifest.json

Before using the notifications API, declare the permission in your manifest:

```json
{
  "name": "My Extension",
  "version": "1.0",
  "permissions": ["notifications"],
  "background": {
    "service_worker": "background.js"
  }
}
```

For Manifest V2, use `"background": {"page": "background.html"}` instead of service_worker. The notifications API is available in both versions, but MV3 service workers have additional considerations for maintaining notification state across restarts.

### Notification Types

Chrome supports four notification templates, each with different visual layouts:

- **basic**: Displays an icon, title, and message—simple and universally supported
- **image**: Adds a large image area below the message—great for previews
- **list**: Shows multiple list items—useful for showing several items at once
- **progress**: Displays a progress bar—perfect for sync status or download progress

### NotificationService Class Implementation

Here's a comprehensive TypeScript class that handles all notification types:

```typescript
interface NotificationOptions {
  type: 'basic' | 'image' | 'list' | 'progress';
  iconUrl?: string;
  title: string;
  message: string;
  imageUrl?: string;
  items?: Array<{ title: string; message: string }>;
  progress?: number;
  priority?: number;
  eventTime?: number;
  buttons?: Array<{ title: string; iconUrl?: string }>;
  isClickable?: boolean;
}

interface NotificationCallback {
  onClick?: (notificationId: string) => void;
  onButtonClick?: (notificationId: string, buttonIndex: number) => void;
  onClose?: (notificationId: string, byUser: boolean) => void;
}

class NotificationService {
  private callbacks: Map<string, NotificationCallback> = new Map();
  private static instance: NotificationService;

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private setupListeners(): void {
    chrome.notifications.onClicked.addListener((notificationId) => {
      const callback = this.callbacks.get(notificationId);
      if (callback?.onClick) {
        callback.onClick(notificationId);
      }
    });

    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      const callback = this.callbacks.get(notificationId);
      if (callback?.onButtonClick) {
        callback.onButtonClick(notificationId, buttonIndex);
      }
    });

    chrome.notifications.onClosed.addListener((notificationId, byUser) => {
      const callback = this.callbacks.get(notificationId);
      if (callback?.onClose) {
        callback.onClose(notificationId, byUser);
      }
      this.callbacks.delete(notificationId);
    });
  }

  async create(options: NotificationOptions, callbacks?: NotificationCallback): Promise<string> {
    const notificationId = this.generateId();

    if (callbacks) {
      this.callbacks.set(notificationId, callbacks);
    }

    return new Promise((resolve, reject) => {
      chrome.notifications.create(
        notificationId,
        {
          type: options.type,
          iconUrl: options.iconUrl || 'images/icon.png',
          title: options.title,
          message: options.message,
          imageUrl: options.imageUrl,
          items: options.items,
          progress: options.progress,
          priority: options.priority || 0,
          eventTime: options.eventTime,
          buttons: options.buttons,
          isClickable: options.isClickable !== false,
        },
        (notificationId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(notificationId);
          }
        }
      );
    });
  }

  async update(notificationId: string, options: Partial<NotificationOptions>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      chrome.notifications.update(
        notificationId,
        {
          type: options.type,
          iconUrl: options.iconUrl,
          title: options.title,
          message: options.message,
          imageUrl: options.imageUrl,
          items: options.items,
          progress: options.progress,
          priority: options.priority,
          eventTime: options.eventTime,
          buttons: options.buttons,
        },
        (wasUpdated) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(wasUpdated);
          }
        }
      );
    });
  }

  async clear(notificationId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      chrome.notifications.clear(notificationId, (wasCleared) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(wasCleared);
        }
      });
    });
  }

  // Convenience methods for common notification types

  async showBasic(title: string, message: string, iconUrl?: string): Promise<string> {
    return this.create({
      type: 'basic',
      title,
      message,
      iconUrl,
    });
  }

  async showWithImage(title: string, message: string, imageUrl: string): Promise<string> {
    return this.create({
      type: 'image',
      title,
      message,
      imageUrl,
    });
  }

  async showList(title: string, items: Array<{ title: string; message: string }>): Promise<string> {
    return this.create({
      type: 'list',
      title,
      message: `${items.length} items`,
      items,
    });
  }

  async showProgress(title: string, progress: number): Promise<string> {
    return this.create({
      type: 'progress',
      title,
      message: `${progress}% complete`,
      progress,
    });
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Usage Examples

```typescript
const notifications = NotificationService.getInstance();

// Simple notification
await notifications.showBasic(
  'Sync Complete',
  'Your data has been synchronized successfully.'
);

// Notification with action buttons
await notifications.create(
  {
    type: 'basic',
    title: 'Update Available',
    message: 'Version 2.0 has been released with new features!',
    buttons: [
      { title: 'Update Now' },
      { title: 'Later' }
    ]
  },
  {
    onButtonClick: (id, buttonIndex) => {
      if (buttonIndex === 0) {
        // Handle update now
      }
    }
  }
);

// Progress notification for long-running operations
const notificationId = await notifications.showProgress('Downloading', 0);

// Update progress
for (let i = 0; i <= 100; i += 10) {
  await notifications.update(notificationId, {
    progress: i,
    message: `${i}% complete`
  });
  await new Promise(r => setTimeout(r, 500));
}
```

## Badge Text and Icon

Badge notifications provide lightweight, always-visible indicators on the extension icon. They're perfect for showing unread counts, pending items, or status indicators without interrupting the user.

### Badge Text API

The `chrome.action.setBadgeText` method displays text on the extension icon. The text is limited to 4 characters, so use short numbers or characters:

```typescript
// Set badge text
chrome.action.setBadgeText({ text: '5' });

// Clear badge
chrome.action.setBadgeText({ text: '' });

// Set badge for a specific tab
chrome.action.setBadgeText({ text: '3', tabId: 123 });
```

### Badge Background Color

Customize the badge background color to convey different states:

```typescript
// Set red badge for alerts
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

// Set green for success
chrome.action.setBadgeBackgroundColor({ color: '#00FF00' });

// Orange for warnings
chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });

// Per-tab badge color
chrome.action.setBadgeBackgroundColor({ color: '#4285F4', tabId: 123 });
```

### Dynamic Icon Changes

Use `chrome.action.setIcon` to change the entire icon based on state:

```typescript
chrome.action.setIcon({
  path: {
    '16': 'images/icon-active16.png',
    '48': 'images/icon-active48.png',
    '128': 'images/icon-active128.png'
  }
});
```

### BadgeManager Class

This class provides comprehensive badge management across tabs:

```typescript
interface BadgeState {
  count: number;
  color: string;
  icon?: string;
}

interface TabBadgeState {
  [tabId: number]: BadgeState;
}

class BadgeManager {
  private tabStates: TabBadgeState = {};
  private defaultState: BadgeState = { count: 0, color: '#4285F4' };
  private iconStates: Map<string, string> = new Map();
  private static instance: BadgeManager;

  private constructor() {}

  static getInstance(): BadgeManager {
    if (!BadgeManager.instance) {
      BadgeManager.instance = new BadgeManager();
    }
    return BadgeManager.instance;
  }

  // Register named icon states for easy switching
  registerIcon(name: string, iconPath: Record<string, string>): void {
    this.iconStates.set(name, JSON.stringify(iconPath));
  }

  async setBadge(count: number, tabId?: number): Promise<void> {
    const state: BadgeState = {
      count,
      color: this.defaultState.color,
    };
    
    if (tabId) {
      this.tabStates[tabId] = state;
    }

    const text = count > 0 ? (count > 99 ? '99+' : count.toString()) : '';
    
    if (tabId) {
      await chrome.action.setBadgeText({ text, tabId });
    } else {
      await chrome.action.setBadgeText({ text });
    }
  }

  async setColor(color: string, tabId?: number): Promise<void> {
    this.defaultState.color = color;
    
    if (tabId && this.tabStates[tabId]) {
      this.tabStates[tabId].color = color;
    }

    if (tabId) {
      await chrome.action.setBadgeBackgroundColor({ color, tabId });
    } else {
      await chrome.action.setBadgeBackgroundColor({ color });
    }
  }

  async setIcon(name: string, tabId?: number): Promise<void> {
    const iconPath = this.iconStates.get(name);
    if (!iconPath) {
      console.warn(`Icon state "${name}" not registered`);
      return;
    }

    const icon = JSON.parse(iconPath);
    
    if (tabId) {
      await chrome.action.setIcon({ path: icon, tabId });
    } else {
      await chrome.action.setIcon({ path: icon });
    }
  }

  async increment(tabId?: number): Promise<number> {
    const currentCount = tabId && this.tabStates[tabId] 
      ? this.tabStates[tabId].count 
      : 0;
    const newCount = currentCount + 1;
    await this.setBadge(newCount, tabId);
    return newCount;
  }

  async decrement(tabId?: number): Promise<number> {
    const currentCount = tabId && this.tabStates[tabId] 
      ? this.tabStates[tabId].count 
      : 0;
    const newCount = Math.max(0, currentCount - 1);
    await this.setBadge(newCount, tabId);
    return newCount;
  }

  async clear(tabId?: number): Promise<void> {
    if (tabId) {
      delete this.tabStates[tabId];
      await chrome.action.setBadgeText({ text: '', tabId });
    } else {
      this.tabStates = {};
      await chrome.action.setBadgeText({ text: '' });
    }
  }

  getCount(tabId?: number): number {
    if (tabId && this.tabStates[tabId]) {
      return this.tabStates[tabId].count;
    }
    return this.defaultState.count;
  }
}
```

### Usage Example

```typescript
const badgeManager = BadgeManager.getInstance();

// Register different icon states
badgeManager.registerIcon('normal', {
  '16': 'icons/icon16.png',
  '48': 'icons/icon48.png',
  '128': 'icons/icon128.png'
});

badgeManager.registerIcon('alert', {
  '16': 'icons/alert16.png',
  '48': 'icons/alert48.png',
  '128': 'icons/alert128.png'
});

// Set badge to show 5 unread items
await badgeManager.setBadge(5);

// Change to alert state
await badgeManager.setIcon('alert');
await badgeManager.setColor('#FF0000');

// User reads one item
await badgeManager.decrement();

// Clear when all items read
await badgeManager.clear();
```

## Chrome Alarms API

The Chrome Alarms API enables scheduled background tasks that persist across service worker restarts. This is essential for periodic sync, reminders, and time-triggered notifications.

### Required Permission

```json
{
  "permissions": ["alarms"],
  "background": {
    "service_worker": "background.js"
  }
}
```

### AlarmScheduler Class

This class provides robust alarm management with named alarms and event handlers:

```typescript
interface AlarmConfig {
  name: string;
  delayInMinutes?: number;
  periodInMinutes?: when?: number;
}

interface AlarmHandler {
  (alarm: chrome.alarms.Alarm): void;
}

class AlarmScheduler {
  private handlers: Map<string, AlarmHandler> = new Map();
  private static instance: AlarmScheduler;

  private constructor() {
    this.setupListener();
  }

  static getInstance(): AlarmScheduler {
    if (!AlarmScheduler.instance) {
      AlarmScheduler.instance = new AlarmScheduler();
    }
    return AlarmScheduler.instance;
  }

  private setupListener(): void {
    chrome.alarms.onAlarm.addListener((alarm) => {
      const handler = this.handlers.get(alarm.name);
      if (handler) {
        handler(alarm);
      }
    });
  }

  async create(config: AlarmConfig): Promise<void> {
    const alarmInfo: chrome.alarms.AlarmCreateInfo = {};

    if (config.delayInMinutes) {
      alarmInfo.delayInMinutes = config.delayInMinutes;
    }

    if (config.periodInMinutes) {
      alarmInfo.periodInMinutes = config.periodInMinutes;
    }

    if (config.when) {
      alarmInfo.when = config.when;
    }

    return new Promise((resolve, reject) => {
      chrome.alarms.create(config.name, alarmInfo, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  registerHandler(name: string, handler: AlarmHandler): void {
    this.handlers.set(name, handler);
  }

  async get(name: string): Promise<chrome.alarms.Alarm | undefined> {
    return new Promise((resolve) => {
      chrome.alarms.get(name, (alarm) => {
        resolve(alarm);
      });
    });
  }

  async getAll(): Promise<chrome.alarms.Alarm[]> {
    return new Promise((resolve) => {
      chrome.alarms.getAll((alarms) => {
        resolve(alarms);
      });
    });
  }

  async clear(name: string): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.alarms.clear(name, (wasCleared) => {
        resolve(wasCleared);
      });
    });
  }

  async clearAll(): Promise<void> {
    return new Promise((resolve) => {
      chrome.alarms.clearAll(() => {
        resolve();
      });
    });
  }

  // Convenience methods for common use cases

  async scheduleDaily(name: string, hour: number, minute: number): Promise<void> {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const delayInMinutes = (target.getTime() - now.getTime()) / 60000;

    await this.create({
      name,
      delayInMinutes,
      periodInMinutes: 24 * 60, // 24 hours in minutes
    });
  }

  async schedulePeriodic(name: string, intervalMinutes: number): Promise<void> {
    await this.create({
      name,
      periodInMinutes: intervalMinutes,
    });
  }

  async scheduleOnce(name: string, delayMinutes: number): Promise<void> {
    await this.create({
      name,
      delayInMinutes: delayMinutes,
    });
  }
}
```

### Usage Example

```typescript
const scheduler = AlarmScheduler.getInstance();
const notifications = NotificationService.getInstance();

// Register handler for price check alarms
scheduler.registerHandler('priceCheck', async (alarm) => {
  const prices = await checkProductPrices();
  
  for (const product of prices) {
    if (product.priceDrop) {
      await notifications.showBasic(
        'Price Drop Alert!',
        `${product.name} is now $${product.newPrice} (was $${product.oldPrice})`
      );
    }
  }
});

// Schedule price checks every hour
await scheduler.schedulePeriodic('priceCheck', 60);

// Register handler for daily reminders
scheduler.registerHandler('dailyReminder', async (alarm) => {
  await notifications.showWithButtons(
    'Daily Review',
    "Don't forget to review your tasks for today!",
    [{ title: 'Open App' }, { title: 'Dismiss' }]
  );
});

// Schedule daily reminder at 9 AM
await scheduler.scheduleDaily('dailyReminder', 9, 0);
```

### MV3 Service Worker Considerations

In Manifest V3, service workers can be terminated after periods of inactivity. The Alarms API is specifically designed to wake service workers when alarms fire, but there are important considerations:

1. **Alarms persist across restarts**: When you create an alarm with `chrome.alarms.create()`, it survives browser restarts and service worker terminations.

2. **Minimum alarm interval**: The minimum reliable interval is 1 minute in production. Shorter intervals may work in development but are not guaranteed in production.

3. **Check alarm status on startup**: When your service worker starts, check existing alarms and restore state:

```typescript
// In service worker
chrome.alarms.getAll((alarms) => {
  for (const alarm of alarms) {
    // Reinitialize state based on alarm
    console.log(`Alarm "${alarm.name}" is scheduled`);
  }
});
```

## Notification Click Handling

Making notifications interactive significantly improves their usefulness. Users can take immediate action without navigating to the extension.

### Click Event Handlers

The chrome.notifications API provides three event types:

- `onClicked`: Fired when the notification body is clicked
- `onButtonClicked`: Fired when an action button is clicked
- `onClosed`: Fired when the notification is dismissed (by user or timeout)

### NotificationRouter Class

This class maps notification IDs to appropriate handlers based on notification type:

```typescript
type ClickHandler = (notificationId: string) => void | Promise<void>;
type ButtonHandler = (notificationId: string, buttonIndex: number) => void | Promise<void>;

interface NotificationRoute {
  pattern: RegExp;
  onClick?: ClickHandler;
  onButtonClick?: ButtonHandler;
}

class NotificationRouter {
  private routes: NotificationRoute[] = [];
  private idToRoute: Map<string, NotificationRoute> = new Map();
  private static instance: NotificationRouter;

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): NotificationRouter {
    if (!NotificationRouter.instance) {
      NotificationRouter.instance = new NotificationRouter();
    }
    return NotificationRouter.instance;
  }

  private setupListeners(): void {
    chrome.notifications.onClicked.addListener(async (notificationId) => {
      const route = this.idToRoute.get(notificationId);
      if (route?.onClick) {
        await route.onClick(notificationId);
      }
    });

    chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
      const route = this.idToRoute.get(notificationId);
      if (route?.onButtonClick) {
        await route.onButtonClick(notificationId, buttonIndex);
      }
    });
  }

  registerRoute(id: string, route: NotificationRoute): void {
    this.idToRoute.set(id, route);
  }

  // Factory methods for common notification patterns

  createPriceAlertRoute(notificationId: string, productUrl: string): void {
    this.registerRoute(notificationId, {
      pattern: /price-alert/,
      onClick: async () => {
        await chrome.tabs.create({ url: productUrl, active: true });
      },
      onButtonClick: async (id, buttonIndex) => {
        if (buttonIndex === 0) {
          // View deal
          await chrome.tabs.create({ url: productUrl, active: true });
        }
        // buttonIndex 1: Dismiss - no action needed
      }
    });
  }

  createReminderRoute(notificationId: string, taskId: string): void {
    this.registerRoute(notificationId, {
      pattern: /reminder/,
      onClick: async () => {
        // Open extension popup or options page
        await chrome.tabs.create({ 
          url: `popup.html?task=${taskId}`,
          active: true 
        });
      },
      onButtonClick: async (id, buttonIndex) => {
        if (buttonIndex === 0) {
          // Snooze for 15 minutes
          const scheduler = AlarmScheduler.getInstance();
          await scheduler.scheduleOnce(`snooze-${taskId}`, 15);
        }
      }
    });
  }

  createSyncStatusRoute(notificationId: string): void {
    this.registerRoute(notificationId, {
      pattern: /sync/,
      onClick: async () => {
        // Open sync status page
        await chrome.runtime.openOptionsPage();
      }
    });
  }
}
```

### Usage Example

```typescript
const router = NotificationRouter.getInstance();
const notifications = NotificationService.getInstance();

// Create a price alert notification
const notificationId = await notifications.create(
  {
    type: 'basic',
    title: 'Price Drop: Wireless Headphones',
    message: 'Price dropped from $199 to $149!',
    buttons: [
      { title: 'View Deal' },
      { title: 'Dismiss' }
    ]
  }
);

// Register click handlers
router.createPriceAlertRoute(notificationId, 'https://example.com/product/123');

// Create a reminder notification
const reminderId = await notifications.create(
  {
    type: 'basic',
    title: 'Task Reminder',
    message: 'Review quarterly report',
    buttons: [
      { title: 'Snooze 15min' },
      { title: 'Dismiss' }
    ]
  }
);

router.createReminderRoute(reminderId, 'task-456');
```

## In-Page Notifications

In-page notifications appear directly within web pages, providing context-aware alerts that don't rely on the operating system's notification system. These are particularly useful for page-specific features,实时 feedback, and contextual information.

### InPageNotifier Class with Shadow DOM

This implementation uses Shadow DOM to ensure styles don't conflict with the host page:

```typescript
interface ToastConfig {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ToastOptions extends ToastConfig {
  title: string;
  message: string;
  iconUrl?: string;
  actions?: Array<{ label: string; action: () => void }>;
}

class InPageNotifier {
  private hostElement: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private defaultConfig: ToastConfig = {
    position: 'bottom-right',
    duration: 5000,
    type: 'info',
  };

  constructor(private document: Document) {}

  private ensureHost(): void {
    if (this.hostElement) return;

    this.hostElement = this.document.createElement('div');
    this.hostElement.id = 'extension-notifier-host';
    this.hostElement.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    this.shadowRoot = this.hostElement.attachShadow({ mode: 'closed' });
    this.document.body.appendChild(this.hostElement);
  }

  private getPositionStyles(position: string): string {
    const spacing = '20px';
    switch (position) {
      case 'top-left':
        return `top: ${spacing}; left: ${spacing};`;
      case 'top-right':
        return `top: ${spacing}; right: ${spacing};`;
      case 'bottom-left':
        return `bottom: ${spacing}; left: ${spacing};`;
      case 'bottom-right':
        return `bottom: ${spacing}; right: ${spacing};`;
      default:
        return `bottom: ${spacing}; right: ${spacing};`;
    }
  }

  private getTypeStyles(type: string): { bg: string; border: string; icon: string } {
    const types: Record<string, { bg: string; border: string; icon: string }> = {
      info: { bg: '#E3F2FD', border: '#2196F3', icon: 'ℹ️' },
      success: { bg: '#E8F5E9', border: '#4CAF50', icon: '✅' },
      warning: { bg: '#FFF3E0', border: '#FF9800', icon: '⚠️' },
      error: { bg: '#FFEBEE', border: '#F44336', icon: '❌' },
    };
    return types[type] || types.info;
  }

  async show(options: ToastOptions): Promise<void> {
    this.ensureHost();
    if (!this.shadowRoot) return;

    const config = { ...this.defaultConfig, ...options };
    const typeStyles = this.getTypeStyles(config.type || 'info');
    const positionStyles = this.getPositionStyles(config.position || 'bottom-right');

    const toast = this.document.createElement('div');
    toast.style.cssText = `
      pointer-events: auto;
      background: ${typeStyles.bg};
      border-left: 4px solid ${typeStyles.border};
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      min-width: 300px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      animation: slideIn 0.3s ease-out;
      ${positionStyles}
    `;

    toast.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        .toast-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #333; }
        .toast-message { font-size: 13px; color: #666; line-height: 1.4; }
        .toast-close { 
          cursor: pointer; 
          color: #999; 
          font-size: 18px; 
          line-height: 1;
          margin-left: auto;
        }
        .toast-close:hover { color: #666; }
        .toast-actions { 
          margin-top: 12px; 
          display: flex; 
          gap: 8px; 
        }
        .toast-action {
          background: ${typeStyles.border};
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .toast-action:hover { opacity: 0.9; }
      </style>
      <span style="font-size: 20px;">${typeStyles.icon}</span>
      <div style="flex: 1;">
        <div class="toast-title">${this.escapeHtml(options.title)}</div>
        <div class="toast-message">${this.escapeHtml(options.message)}</div>
      </div>
      <span class="toast-close">×</span>
    `;

    if (options.actions && options.actions.length > 0) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'toast-actions';
      options.actions.forEach((action, index) => {
        const button = document.createElement('button');
        button.className = 'toast-action';
        button.textContent = action.label;
        button.onclick = () => {
          action.action();
          this.dismiss(toast);
        };
        actionsDiv.appendChild(button);
      });
      toast.querySelector('.toast-message')?.appendChild(actionsDiv);
    }

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => this.dismiss(toast));

    this.shadowRoot.appendChild(toast);

    // Auto-dismiss after duration
    if (config.duration && config.duration > 0) {
      setTimeout(() => this.dismiss(toast), config.duration);
    }
  }

  private dismiss(toast: Element): void {
    if (!toast.parentNode) return;
    (toast as HTMLElement).style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => {
      toast.parentNode?.removeChild(toast);
    }, 300);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Convenience methods
  info(title: string, message: string): Promise<void> {
    return this.show({ title, message, type: 'info' });
  }

  success(title: string, message: string): Promise<void> {
    return this.show({ title, message, type: 'success' });
  }

  warning(title: string, message: string): Promise<void> {
    return this.show({ title, message, type: 'warning' });
  }

  error(title: string, message: string): Promise<void> {
    return this.show({ title, message, type: 'error' });
  }
}
```

### Usage in Content Script

```typescript
// In content script
const notifier = new InPageNotifier(document);

// Show notification when price drops detected
notifier.show({
  title: 'Price Alert',
  message: 'Wireless headphones dropped to $149!',
  type: 'success',
  position: 'top-right',
  duration: 8000,
  actions: [
    {
      label: 'View Deal',
      action: () => window.open('https://example.com/product/123')
    }
  ]
});

// Or use convenience methods
notifier.info('Sync Complete', 'Your data has been synchronized.');
notifier.error('Connection Lost', 'Please check your internet connection.');
```

## Notification Preferences

Respecting user preferences is crucial for a positive user experience. The options page should allow users to control which notifications they receive.

### NotificationPreferences Class

This class manages notification settings with chrome.storage.sync for cross-device synchronization:

```typescript
interface NotificationPreference {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
}

interface NotificationSettings {
  global: NotificationPreference;
  categories: {
    [category: string]: NotificationPreference;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
  };
  throttling: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  global: {
    enabled: true,
    sound: true,
    vibration: false,
  },
  categories: {
    alerts: { enabled: true, sound: true, vibration: false },
    updates: { enabled: true, sound: false, vibration: false },
    reminders: { enabled: true, sound: true, vibration: false },
    marketing: { enabled: false, sound: false, vibration: false },
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  throttling: {
    maxPerHour: 10,
    maxPerDay: 50,
  },
};

class NotificationPreferences {
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private static instance: NotificationPreferences;
  private listeners: Array<(settings: NotificationSettings) => void> = [];

  private constructor() {}

  static getInstance(): NotificationPreferences {
    if (!NotificationPreferences.instance) {
      NotificationPreferences.instance = new NotificationPreferences();
    }
    return NotificationPreferences.instance;
  }

  async load(): Promise<void> {
    const stored = await chrome.storage.sync.get('notificationSettings');
    if (stored.notificationSettings) {
      this.settings = { ...DEFAULT_SETTINGS, ...stored.notificationSettings };
    }
    this.notifyListeners();
  }

  async save(): Promise<void> {
    await chrome.storage.sync.set({ notificationSettings: this.settings });
    this.notifyListeners();
  }

  subscribe(listener: (settings: NotificationSettings) => void): void {
    this.listeners.push(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.settings));
  }

  // Getters and setters
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  isEnabled(category?: string): boolean {
    if (!this.settings.global.enabled) return false;
    if (category && this.settings.categories[category]) {
      return this.settings.categories[category].enabled;
    }
    return true;
  }

  async setEnabled(enabled: boolean, category?: string): Promise<void> {
    if (category) {
      if (!this.settings.categories[category]) {
        this.settings.categories[category] = { enabled: true, sound: true, vibration: false };
      }
      this.settings.categories[category].enabled = enabled;
    } else {
      this.settings.global.enabled = enabled;
    }
    await this.save();
  }

  async setQuietHours(enabled: boolean, start?: string, end?: string): Promise<void> {
    this.settings.quietHours.enabled = enabled;
    if (start) this.settings.quietHours.start = start;
    if (end) this.settings.quietHours.end = end;
    await this.save();
  }

  async setThrottling(maxPerHour: number, maxPerDay: number): Promise<void> {
    this.settings.throttling.maxPerHour = maxPerHour;
    this.settings.throttling.maxPerDay = maxPerDay;
    await this.save();
  }

  // Check if notification should be sent now
  shouldNotify(category?: string): { shouldNotify: boolean; reason?: string } {
    // Check global setting
    if (!this.isEnabled(category)) {
      return { shouldNotify: false, reason: 'disabled' };
    }

    // Check quiet hours
    if (this.settings.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const { start, end } = this.settings.quietHours;

      if (start > end) {
        // Quiet hours span midnight
        if (currentTime >= start || currentTime < end) {
          return { shouldNotify: false, reason: 'quiet_hours' };
        }
      } else {
        if (currentTime >= start && currentTime < end) {
          return { shouldNotify: false, reason: 'quiet_hours' };
        }
      }
    }

    return { shouldNotify: true };
  }
}
```

### Usage in Background Service Worker

```typescript
const preferences = NotificationPreferences.getInstance();

async function maybeSendNotification(
  category: string, 
  notification: NotificationOptions
): Promise<boolean> {
  // Load preferences first
  await preferences.load();

  // Check if notification should be sent
  const { shouldNotify, reason } = preferences.shouldNotify(category);
  if (!shouldNotify) {
    console.log(`Notification suppressed: ${reason}`);
    return false;
  }

  // Send notification
  const notifications = NotificationService.getInstance();
  await notifications.showBasic(notification.title, notification.message);
  return true;
}
```

## Smart Notification Timing

Sending notifications at the right time dramatically impacts their effectiveness. Intelligent timing considers user activity, notification batching, and rate limiting.

### NotificationThrottler Class

```typescript
interface ThrottleConfig {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

interface NotificationRecord {
  timestamp: number;
  category?: string;
}

class NotificationThrottler {
  private history: NotificationRecord[] = [];
  private config: ThrottleConfig = {
    maxPerMinute: 1,
    maxPerHour: 10,
    maxPerDay: 50,
  };
  private static instance: NotificationThrottler;

  private constructor() {}

  static getInstance(): NotificationThrottler {
    if (!NotificationThrottler.instance) {
      NotificationThrottler.instance = new NotificationThrottler();
    }
    return NotificationThrottler.instance;
  }

  configure(config: Partial<ThrottleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Record a notification being sent
  record(category?: string): void {
    this.history.push({
      timestamp: Date.now(),
      category,
    });
    this.cleanup();
  }

  // Check if we can send a notification
  canSend(): boolean {
    this.cleanup();
    const now = Date.now();

    const minuteAgo = now - 60000;
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;

    const lastMinute = this.history.filter(r => r.timestamp > minuteAgo).length;
    const lastHour = this.history.filter(r => r.timestamp > hourAgo).length;
    const lastDay = this.history.filter(r => r.timestamp > dayAgo).length;

    return (
      lastMinute < this.config.maxPerMinute &&
      lastHour < this.config.maxPerHour &&
      lastDay < this.config.maxPerDay
    );
  }

  // Get time until next notification allowed
  getWaitTime(): number {
    this.cleanup();
    const now = Date.now();

    if (this.history.length === 0) return 0;

    const minuteAgo = now - 60000;
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;

    const lastMinute = this.history.filter(r => r.timestamp > minuteAgo);
    const lastHour = this.history.filter(r => r.timestamp > hourAgo);
    const lastDay = this.history.filter(r => r.timestamp > dayAgo);

    // If minute limit reached, wait until oldest in last minute expires
    if (lastMinute.length >= this.config.maxPerMinute) {
      return 60000 - (now - lastMinute[0].timestamp);
    }

    // If hour limit reached
    if (lastHour.length >= this.config.maxPerHour) {
      return 3600000 - (now - lastHour[0].timestamp);
    }

    // If day limit reached
    if (lastDay.length >= this.config.maxPerDay) {
      return 86400000 - (now - lastDay[0].timestamp);
    }

    return 0;
  }

  // Batch multiple notifications into one
  async batch<T>(
    items: T[],
    batchSize: number,
    sendBatch: (batch: T[]) => Promise<void>
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await sendBatch(batch);
      
      // Wait between batches
      if (i + batchSize < items.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // Check if user is active (don't interrupt)
  async isUserActive(): Promise<boolean> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return false;

    const tab = tabs[0];
    
    // Check if tab is focused
    if (!tab.focused) return false;

    // Check if user is on the extension's own pages
    if (tab.url?.startsWith('chrome-extension://')) return false;

    // Consider user active if they have any tab focused
    return true;
  }

  // Wait until user is idle for a period
  async waitForIdle(minutes: number = 5): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.idle.queryState(minutes, (state) => {
        resolve(state === 'idle');
      });
    });
  }

  private cleanup(): void {
    const dayAgo = Date.now() - 86400000;
    this.history = this.history.filter(r => r.timestamp > dayAgo);
  }
}
```

### Usage Example

```typescript
const throttler = NotificationThrottler.getInstance();
const notifications = NotificationService.getInstance();

// Configure throttling
throttler.configure({
  maxPerMinute: 1,
  maxPerHour: 5,
  maxPerDay: 20,
});

// Smart notification sender
async function smartNotify(
  title: string, 
  message: string, 
  options?: { category?: string; urgent?: boolean }
): Promise<boolean> {
  // For urgent notifications, skip some checks
  if (!options?.urgent) {
    // Check throttling limits
    if (!throttler.canSend()) {
      const waitTime = throttler.getWaitTime();
      console.log(`Notification throttled. Wait ${waitTime}ms`);
      return false;
    }

    // Don't interrupt active browsing (optional - be careful with this)
    const isActive = await throttler.isUserActive();
    if (isActive) {
      // Could queue for later or use badge instead
      const badge = BadgeManager.getInstance();
      await badge.increment();
      return false;
    }
  }

  // Send the notification
  await notifications.showBasic(title, message);
  throttler.record(options?.category);
  return true;
}

// Example: Batching price alerts
async function notifyPriceDrops(products: Product[]): Promise<void> {
  const throttler = NotificationThrottler.getInstance();
  
  await throttler.batch(
    products,
    3, // Batch size
    async (batch) => {
      await notifications.showList(
        'Price Drops',
        batch.map(p => ({ 
          title: p.name, 
          message: `Now $${p.price} (was $${p.oldPrice})` 
        }))
      );
    }
  );
}
```

## Notification Patterns for Common Use Cases

### Price Drop Alerts (E-Commerce Monitoring)

```typescript
interface ProductPrice {
  id: string;
  name: string;
  url: string;
  currentPrice: number;
  previousPrice: number;
  threshold: number; // percentage drop to alert
}

async function checkPriceAlerts(products: ProductPrice[]): Promise<void> {
  const notifications = NotificationService.getInstance();
  const preferences = NotificationPreferences.getInstance();
  const throttler = NotificationThrottler.getInstance();

  const drops: ProductPrice[] = [];

  for (const product of products) {
    if (product.previousPrice > product.currentPrice) {
      const dropPercent = ((product.previousPrice - product.currentPrice) / product.previousPrice) * 100;
      if (dropPercent >= product.threshold) {
        drops.push(product);
      }
    }
  }

  if (drops.length === 0) return;

  // Check preferences
  await preferences.load();
  if (!preferences.isEnabled('alerts')) return;

  // Send notification
  if (drops.length === 1) {
    const product = drops[0];
    const savings = product.previousPrice - product.currentPrice;
    await notifications.showWithImage(
      '💰 Price Drop Alert!',
      `${product.name} dropped by $${savings.toFixed(2)}`,
      product.imageUrl
    );
  } else {
    // Batch multiple drops
    await notifications.showList(
      `💰 ${drops.length} Price Drops!`,
      drops.map(p => ({
        title: p.name,
        message: `$${p.currentPrice} (was $${p.previousPrice})`
      }))
    );
  }

  throttler.record('price-alerts');
}
```

### New Content Notifications (RSS/Social Media)

```typescript
interface NewContent {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: Date;
  type: 'article' | 'video' | 'post';
}

async function notifyNewContent(items: NewContent[]): Promise<void> {
  const notifications = NotificationService.getInstance();
  const preferences = NotificationPreferences.getInstance();
  
  await preferences.load();
  if (!preferences.isEnabled('updates')) return;

  const iconMap: Record<string, string> = {
    article: '📄',
    video: '🎬',
    post: '💬',
  };

  if (items.length === 1) {
    const item = items[0];
    await notifications.showBasic(
      `New ${item.type}: ${item.source}`,
      item.title
    );
  } else {
    // Summarize multiple items
    const sources = [...new Set(items.map(i => i.source))];
    await notifications.showList(
      `${items.length} New Items`,
      items.slice(0, 5).map(item => ({
        title: `${iconMap[item.type]} ${item.title}`,
        message: item.source
      }))
    );
  }
}
```

### Reminder/Timer Notifications (Productivity)

```typescript
interface Reminder {
  id: string;
  title: string;
  message: string;
  dueTime: Date;
  repeat?: 'daily' | 'weekly' | 'monthly';
}

async function scheduleReminder(reminder: Reminder): Promise<void> {
  const scheduler = AlarmScheduler.getInstance();
  
  const now = new Date();
  const delayMinutes = Math.max(1, (reminder.dueTime.getTime() - now.getTime()) / 60000);

  scheduler.registerHandler(`reminder-${reminder.id}`, async () => {
    const notifications = NotificationService.getInstance();
    const preferences = NotificationPreferences.getInstance();
    
    await preferences.load();
    if (!preferences.isEnabled('reminders')) return;

    await notifications.create(
      {
        type: 'basic',
        title: reminder.title,
        message: reminder.message,
        buttons: [
          { title: 'Complete' },
          { title: 'Snooze 10min' }
        ]
      },
      {
        onButtonClick: async (id, buttonIndex) => {
          if (buttonIndex === 0) {
            // Mark complete - could integrate with task management
            console.log(`Reminder ${reminder.id} completed`);
          } else if (buttonIndex === 1) {
            // Snooze
            await scheduler.scheduleOnce(`snooze-${reminder.id}`, 10);
          }
        }
      }
    );

    // Schedule next occurrence for repeating reminders
    if (reminder.repeat) {
      let nextDue = new Date(reminder.dueTime);
      switch (reminder.repeat) {
        case 'daily':
          nextDue.setDate(nextDue.getDate() + 1);
          break;
        case 'weekly':
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case 'monthly':
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
      }
      await scheduler.create({
        name: `reminder-${reminder.id}`,
        when: nextDue.getTime()
      });
    }
  });

  await scheduler.create({
    name: `reminder-${reminder.id}`,
    delayInMinutes
  });
}
```

### Security Alerts (Password Breach/unsafe Site)

```typescript
interface SecurityAlert {
  type: 'breach' | 'unsafe-site' | 'suspicious-activity';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
}

async function notifySecurityAlert(alert: SecurityAlert): Promise<void> {
  const notifications = NotificationService.getInstance();
  
  const severityConfig = {
    critical: { color: '#F44336', priority: 2, urgent: true },
    warning: { color: '#FF9800', priority: 1, urgent: false },
    info: { color: '#2196F3', priority: 0, urgent: false },
  };

  const config = severityConfig[alert.severity];

  const buttons = alert.actionUrl 
    ? [{ title: 'Take Action' }, { title: 'Dismiss' }]
    : undefined;

  const id = await notifications.create(
    {
      type: 'basic',
      title: `🔒 ${alert.title}`,
      message: alert.message,
      priority: config.priority,
      buttons,
    },
    {
      onClick: async () => {
        if (alert.actionUrl) {
          await chrome.tabs.create({ url: alert.actionUrl, active: true });
        }
      },
      onButtonClick: async (_, buttonIndex) => {
        if (buttonIndex === 0 && alert.actionUrl) {
          await chrome.tabs.create({ url: alert.actionUrl, active: true });
        }
      }
    }
  );

  // Critical alerts get badge too
  if (config.urgent) {
    const badge = BadgeManager.getInstance();
    await badge.setColor('#F44336');
    await badge.increment();
  }
}
```

## Best Practices and Common Mistakes

### Always Provide a Way to Disable Notifications

This cannot be overstated. Users must have complete control over which notifications they receive. Include:

- A global on/off toggle in your options page
- Per-category notification settings
- Clear indication of when notifications are disabled

### Use Appropriate Urgency Levels

The `priority` parameter (0-2) affects how Chrome handles notifications:

- **Priority 0**: Normal—good for non-critical updates
- **Priority 1**: High—appears more prominently
- **Priority 2**: Critical—reserved for urgent situations, may show when Do Not Disturb is active

Use priority 2 sparingly. Overusing urgent notifications desensitizes users and may violate Chrome Web Store policies.

### Keep Notification Text Concise

System notifications have limited space. Follow these guidelines:

- Title: Maximum 50 characters
- Message: Maximum 200 characters
- Buttons: Maximum 2 action buttons with short labels

### Don't Use Notifications for Marketing

The Chrome Web Store explicitly prohibits using notifications for promotional purposes. This includes:

- Upselling premium features
- Promoting other products or services
- Encouraging reviews or ratings (except at appropriate times)

Violations can result in extension removal. For strategies on monetizing extensions while respecting users, see the [Extension Monetization Guide](/guides/extension-monetization/).

### Test on Different Operating Systems

Notification rendering varies significantly across platforms:

- **Windows**: Shows in Action Center, supports rich formatting
- **macOS**: Shows in Notification Center, follows macOS design
- **Linux**: Varies by desktop environment (Unity, GNOME, etc.)

Test your notifications on all target platforms. Pay attention to:

- Icon visibility and sizing
- Text truncation behavior
- Button interaction
- Sound and vibration settings

### Clear Notifications When Appropriate

Don't let notifications pile up:

- Clear progress notifications when complete
- Update notifications rather than create new ones
- Respect the `requireInteraction` flag for critical notifications that need explicit dismissal

### Handle Permission Denial Gracefully

Some users deny notification permissions. Your extension should:

- Detect when permissions are denied
- Provide an alternative (like in-page notifications or badges)
- Guide users to settings if they want to enable notifications later

```typescript
async function checkNotificationPermission(): Promise<boolean> {
  const permission = await chrome.permissions.request({ permissions: ['notifications'] });
  return permission;
}
```

---

Built by [Zovo](https://zovo.one) - Open-source tools and guides for extension developers.
