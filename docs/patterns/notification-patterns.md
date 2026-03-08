---
layout: default
title: "Chrome Extension Notification Patterns — Best Practices"
description: "Create and manage notifications in Chrome extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/notification-patterns/"
---

# Notification Patterns

## Overview

The `chrome.notifications` API lets extensions surface timely information outside the browser window. Used well, notifications keep users informed without interrupting their workflow. Used poorly, they train users to disable your extension entirely. This guide covers eight patterns for building a notification system that respects attention, handles platform differences, and scales gracefully.

---

## Required Permissions

```jsonc
// manifest.json
{
  "permissions": ["notifications"],
  // Optional: for notification click handling that opens tabs
  "permissions": ["notifications", "tabs"]
}
```

---

## Pattern 1: Notification Types

Chrome supports four notification template types. Each serves a different purpose.

### Basic Notification

The workhorse — a title, message, and optional icon:

```ts
// basic.ts
function showBasicNotification(
  title: string,
  message: string
): Promise<string> {
  return chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title,
    message,
  });
}

// Usage
await showBasicNotification(
  "Download Complete",
  "report-2026.pdf has been saved to your downloads folder."
);
```

### Image Notification

Includes a large image below the text — useful for previews:

```ts
// image.ts
async function showImageNotification(
  title: string,
  message: string,
  imageUrl: string
): Promise<string> {
  return chrome.notifications.create({
    type: "image",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title,
    message,
    imageUrl,
  });
}

// Usage: show a screenshot preview
await showImageNotification(
  "Screenshot Captured",
  "Click to open in editor",
  chrome.runtime.getURL("captures/latest.png")
);
```

### List Notification

Displays multiple items — good for summaries:

```ts
// list.ts
interface NotificationItem {
  title: string;
  message: string;
}

async function showListNotification(
  title: string,
  message: string,
  items: NotificationItem[]
): Promise<string> {
  return chrome.notifications.create({
    type: "list",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title,
    message,
    items,
  });
}

// Usage: summarize unread items
await showListNotification("3 New Messages", "From your watched threads", [
  { title: "Alice", message: "PR review is ready" },
  { title: "Bob", message: "Deployed to staging" },
  { title: "Carol", message: "Tests passing on CI" },
]);
```

### Progress Notification

Shows a progress bar — ideal for long-running operations:

```ts
// progress.ts
async function showProgressNotification(
  title: string,
  progress: number
): Promise<string> {
  const id = "progress-operation";

  await chrome.notifications.create(id, {
    type: "progress",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title,
    message: `${progress}% complete`,
    progress: Math.min(100, Math.max(0, progress)),
  });

  return id;
}

async function updateProgress(id: string, progress: number): Promise<void> {
  await chrome.notifications.update(id, {
    progress: Math.min(100, Math.max(0, progress)),
    message: `${progress}% complete`,
  });
}

// Usage: track a multi-step export
const notifId = await showProgressNotification("Exporting data...", 0);
for (let i = 0; i <= 100; i += 10) {
  await doExportChunk(i);
  await updateProgress(notifId, i);
}
await chrome.notifications.clear(notifId);
await showBasicNotification("Export Complete", "Your data is ready.");
```

---

## Pattern 2: Click Handling and Deep Linking

Notifications are useless if clicking them does nothing. Route clicks to the right place:

```ts
// click-handler.ts
interface NotificationAction {
  type: "open-url" | "open-popup" | "open-tab" | "focus-tab";
  url?: string;
  tabId?: number;
}

// Registry of pending notification actions
const notificationActions = new Map<string, NotificationAction>();

async function showActionableNotification(
  options: chrome.notifications.NotificationOptions,
  action: NotificationAction
): Promise<string> {
  const id = await chrome.notifications.create(options);
  notificationActions.set(id, action);
  return id;
}

// Single listener handles all notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const action = notificationActions.get(notificationId);
  if (!action) return;

  switch (action.type) {
    case "open-url":
      await chrome.tabs.create({ url: action.url });
      break;

    case "open-tab":
      await chrome.tabs.create({ url: action.url, active: true });
      break;

    case "focus-tab":
      if (action.tabId) {
        const tab = await chrome.tabs.get(action.tabId).catch(() => null);
        if (tab?.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true });
          await chrome.tabs.update(action.tabId, { active: true });
        }
      }
      break;

    case "open-popup":
      await chrome.action.openPopup();
      break;
  }

  notificationActions.delete(notificationId);
  chrome.notifications.clear(notificationId);
});

// Clean up on close without click
chrome.notifications.onClosed.addListener((notificationId) => {
  notificationActions.delete(notificationId);
});
```

### Deep Linking to Extension Pages

```ts
// deep-link.ts
await showActionableNotification(
  {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title: "Settings Migration Complete",
    message: "Click to review your updated preferences.",
  },
  {
    type: "open-url",
    url: chrome.runtime.getURL("options.html#migrated"),
  }
);
```

---

## Pattern 3: Notification Buttons with Action Routing

Notifications support up to two buttons. Use them for quick actions:

```ts
// buttons.ts
interface ButtonAction {
  buttonIndex: number;
  handler: () => Promise<void>;
}

const buttonActions = new Map<string, ButtonAction[]>();

async function showNotificationWithButtons(
  options: chrome.notifications.NotificationOptions,
  actions: Array<{ title: string; handler: () => Promise<void> }>
): Promise<string> {
  const buttons = actions.map(({ title }) => ({ title }));
  const id = await chrome.notifications.create({ ...options, buttons });

  buttonActions.set(
    id,
    actions.map((action, index) => ({
      buttonIndex: index,
      handler: action.handler,
    }))
  );

  return id;
}

chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    const actions = buttonActions.get(notificationId);
    if (!actions) return;

    const action = actions.find((a) => a.buttonIndex === buttonIndex);
    if (action) {
      await action.handler();
    }

    buttonActions.delete(notificationId);
    chrome.notifications.clear(notificationId);
  }
);

// Usage: approve/reject workflow
await showNotificationWithButtons(
  {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title: "Permission Request",
    message: 'Site "example.com" wants to access your blocklist.',
  },
  [
    {
      title: "Allow",
      handler: async () => {
        await grantPermission("example.com");
      },
    },
    {
      title: "Deny",
      handler: async () => {
        await denyPermission("example.com");
      },
    },
  ]
);
```

---

## Pattern 4: Rate Limiting Notifications

Nothing gets an extension uninstalled faster than notification spam. Enforce limits:

```ts
// rate-limiter.ts
interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
  cooldownMs: number;
}

class NotificationRateLimiter {
  private timestamps: number[] = [];
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxPerMinute: config.maxPerMinute ?? 3,
      maxPerHour: config.maxPerHour ?? 10,
      cooldownMs: config.cooldownMs ?? 5_000,
    };
  }

  canNotify(): boolean {
    const now = Date.now();
    this.cleanup(now);

    const oneMinuteAgo = now - 60_000;
    const oneHourAgo = now - 3_600_000;

    const countLastMinute = this.timestamps.filter(
      (t) => t > oneMinuteAgo
    ).length;
    const countLastHour = this.timestamps.filter(
      (t) => t > oneHourAgo
    ).length;

    // Check cooldown since last notification
    const lastTimestamp = this.timestamps[this.timestamps.length - 1];
    if (lastTimestamp && now - lastTimestamp < this.config.cooldownMs) {
      return false;
    }

    return (
      countLastMinute < this.config.maxPerMinute &&
      countLastHour < this.config.maxPerHour
    );
  }

  record(): void {
    this.timestamps.push(Date.now());
  }

  private cleanup(now: number): void {
    const oneHourAgo = now - 3_600_000;
    this.timestamps = this.timestamps.filter((t) => t > oneHourAgo);
  }
}

// Global limiter instance
const limiter = new NotificationRateLimiter({
  maxPerMinute: 3,
  maxPerHour: 15,
  cooldownMs: 10_000,
});

async function rateLimitedNotify(
  options: chrome.notifications.NotificationOptions
): Promise<string | null> {
  if (!limiter.canNotify()) {
    console.log("Notification suppressed by rate limiter");
    return null;
  }

  limiter.record();
  return chrome.notifications.create(options);
}
```

### Per-Category Rate Limiting

Different notification types deserve different limits:

```ts
// category-limiter.ts
class CategoryRateLimiter {
  private limiters = new Map<string, NotificationRateLimiter>();
  private configs: Record<string, Partial<RateLimitConfig>>;

  constructor(configs: Record<string, Partial<RateLimitConfig>>) {
    this.configs = configs;
  }

  canNotify(category: string): boolean {
    const limiter = this.getOrCreate(category);
    return limiter.canNotify();
  }

  record(category: string): void {
    const limiter = this.getOrCreate(category);
    limiter.record();
  }

  private getOrCreate(category: string): NotificationRateLimiter {
    if (!this.limiters.has(category)) {
      const config = this.configs[category] ?? this.configs["default"] ?? {};
      this.limiters.set(category, new NotificationRateLimiter(config));
    }
    return this.limiters.get(category)!;
  }
}

const categoryLimiter = new CategoryRateLimiter({
  critical: { maxPerMinute: 5, maxPerHour: 30, cooldownMs: 2_000 },
  info: { maxPerMinute: 1, maxPerHour: 5, cooldownMs: 30_000 },
  marketing: { maxPerMinute: 0, maxPerHour: 1, cooldownMs: 3_600_000 },
  default: { maxPerMinute: 2, maxPerHour: 10, cooldownMs: 10_000 },
});
```

---

## Pattern 5: Notification Queuing and Priority

When multiple notifications fire at once, queue and prioritize them:

```ts
// queue.ts
interface QueuedNotification {
  options: chrome.notifications.NotificationOptions;
  priority: "critical" | "high" | "normal" | "low";
  action?: NotificationAction;
  createdAt: number;
  expiresAt?: number;
}

class NotificationQueue {
  private queue: QueuedNotification[] = [];
  private isProcessing = false;
  private displayIntervalMs: number;

  constructor(displayIntervalMs = 3_000) {
    this.displayIntervalMs = displayIntervalMs;
  }

  enqueue(notification: QueuedNotification): void {
    // Drop expired notifications
    if (notification.expiresAt && Date.now() > notification.expiresAt) {
      return;
    }

    this.queue.push(notification);
    this.sortQueue();
    this.processQueue();
  }

  private sortQueue(): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    this.queue.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const notification = this.queue.shift()!;

      // Skip expired entries
      if (notification.expiresAt && Date.now() > notification.expiresAt) {
        continue;
      }

      // Critical notifications bypass rate limiting
      if (notification.priority === "critical") {
        await chrome.notifications.create(notification.options);
      } else {
        await rateLimitedNotify(notification.options);
      }

      // Pause between notifications to avoid overwhelming the user
      if (this.queue.length > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.displayIntervalMs)
        );
      }
    }

    this.isProcessing = false;
  }
}

const notificationQueue = new NotificationQueue(3_000);

// Usage
notificationQueue.enqueue({
  options: {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title: "Security Alert",
    message: "Suspicious login detected on your account.",
  },
  priority: "critical",
  createdAt: Date.now(),
});

notificationQueue.enqueue({
  options: {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title: "Weekly Summary",
    message: "You blocked 247 trackers this week.",
  },
  priority: "low",
  createdAt: Date.now(),
  expiresAt: Date.now() + 300_000, // Expire after 5 minutes
});
```

---

## Pattern 6: Persistent vs Transient Notifications

Some notifications should stick around. Others should disappear quickly.

### Transient Notifications with Auto-Clear

```ts
// transient.ts
async function showTransientNotification(
  options: chrome.notifications.NotificationOptions,
  durationMs = 5_000
): Promise<string> {
  const id = await chrome.notifications.create(options);

  // Auto-clear after duration
  setTimeout(() => {
    chrome.notifications.clear(id);
  }, durationMs);

  return id;
}

// Quick confirmation — disappears after 3 seconds
await showTransientNotification(
  {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title: "Saved",
    message: "Your settings have been updated.",
  },
  3_000
);
```

### Persistent Notifications that Require Acknowledgment

```ts
// persistent.ts
const persistentNotifications = new Set<string>();

async function showPersistentNotification(
  options: chrome.notifications.NotificationOptions,
  action?: NotificationAction
): Promise<string> {
  const id = await chrome.notifications.create({
    ...options,
    requireInteraction: true, // Keeps the notification visible until user acts
  });

  persistentNotifications.add(id);

  if (action) {
    notificationActions.set(id, action);
  }

  return id;
}

// Track when persistent notifications are acknowledged
chrome.notifications.onClicked.addListener((id) => {
  if (persistentNotifications.has(id)) {
    persistentNotifications.delete(id);
    logAcknowledgment(id);
  }
});

chrome.notifications.onClosed.addListener((id, byUser) => {
  if (persistentNotifications.has(id)) {
    persistentNotifications.delete(id);
    if (byUser) {
      logDismissal(id);
    }
  }
});

function logAcknowledgment(id: string): void {
  console.log(`Notification ${id} acknowledged by click`);
}

function logDismissal(id: string): void {
  console.log(`Notification ${id} dismissed by user`);
}
```

### Priority Matrix

| Scenario | `requireInteraction` | Auto-clear | Example |
|----------|---------------------|------------|---------|
| Confirmation | No | 3-5 seconds | "Settings saved" |
| Info update | No | 5-10 seconds | "3 new items synced" |
| Action needed | Yes | No | "Review pending changes" |
| Security alert | Yes | No | "Suspicious login detected" |
| Progress complete | No | 10 seconds | "Export finished" |

---

## Pattern 7: Notification Grouping and Replacement

Avoid flooding the user with duplicate notifications by grouping and replacing:

```ts
// grouping.ts
interface NotificationGroup {
  id: string;
  items: string[];
  lastUpdated: number;
}

class NotificationGrouper {
  private groups = new Map<string, NotificationGroup>();
  private collapseDelayMs: number;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(collapseDelayMs = 2_000) {
    this.collapseDelayMs = collapseDelayMs;
  }

  async addToGroup(
    groupId: string,
    item: string,
    formatNotification: (items: string[]) => chrome.notifications.NotificationOptions
  ): Promise<void> {
    const group = this.groups.get(groupId) ?? {
      id: groupId,
      items: [],
      lastUpdated: 0,
    };

    group.items.push(item);
    group.lastUpdated = Date.now();
    this.groups.set(groupId, group);

    // Debounce: wait for more items before showing/updating
    const existingTimer = this.timers.get(groupId);
    if (existingTimer) clearTimeout(existingTimer);

    this.timers.set(
      groupId,
      setTimeout(async () => {
        const currentGroup = this.groups.get(groupId);
        if (!currentGroup) return;

        const options = formatNotification(currentGroup.items);

        // Use the same ID to replace the existing notification
        await chrome.notifications.create(groupId, options);

        this.timers.delete(groupId);
      }, this.collapseDelayMs)
    );
  }

  clearGroup(groupId: string): void {
    this.groups.delete(groupId);
    const timer = this.timers.get(groupId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(groupId);
    }
    chrome.notifications.clear(groupId);
  }
}

const grouper = new NotificationGrouper(2_000);

// Usage: group chat messages from the same thread
async function onNewMessage(threadId: string, sender: string): Promise<void> {
  await grouper.addToGroup(
    `thread-${threadId}`,
    sender,
    (senders) => {
      const unique = [...new Set(senders)];
      return {
        type: "basic" as const,
        iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
        title:
          senders.length === 1
            ? `New message from ${senders[0]}`
            : `${senders.length} new messages`,
        message:
          unique.length === 1
            ? `${senders.length} messages from ${unique[0]}`
            : `From ${unique.slice(0, 3).join(", ")}${unique.length > 3 ? ` and ${unique.length - 3} more` : ""}`,
      };
    }
  );
}
```

### Simple Replacement by ID

For simpler cases, just reuse the notification ID:

```ts
// replace.ts
async function showOrUpdateNotification(
  id: string,
  options: chrome.notifications.NotificationOptions
): Promise<void> {
  // create() with a fixed ID replaces any existing notification with that ID
  await chrome.notifications.create(id, options);
}

// Only one "sync status" notification is ever visible
await showOrUpdateNotification("sync-status", {
  type: "basic",
  iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
  title: "Syncing...",
  message: "Uploading 3 of 10 items",
});

// Later, replace it in-place
await showOrUpdateNotification("sync-status", {
  type: "basic",
  iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
  title: "Sync Complete",
  message: "All 10 items uploaded successfully.",
});
```

---

## Pattern 8: Platform-Aware Notification Strategies

Chrome notifications render differently across operating systems. Account for the differences:

```ts
// platform.ts
interface PlatformNotificationConfig {
  supportsButtons: boolean;
  supportsImages: boolean;
  supportsProgress: boolean;
  supportsList: boolean;
  supportsRequireInteraction: boolean;
  maxTitleLength: number;
  maxMessageLength: number;
}

async function getPlatformConfig(): Promise<PlatformNotificationConfig> {
  const platformInfo = await chrome.runtime.getPlatformInfo();

  switch (platformInfo.os) {
    case "mac":
      return {
        supportsButtons: true,
        supportsImages: false, // macOS native notifications ignore imageUrl
        supportsProgress: false, // Progress bar not rendered on macOS
        supportsList: false, // List items not rendered on macOS
        supportsRequireInteraction: true,
        maxTitleLength: 50, // macOS truncates long titles
        maxMessageLength: 200,
      };

    case "win":
      return {
        supportsButtons: true,
        supportsImages: true,
        supportsProgress: true,
        supportsList: true,
        supportsRequireInteraction: true,
        maxTitleLength: 100,
        maxMessageLength: 500,
      };

    case "linux":
      return {
        supportsButtons: true, // Depends on notification daemon
        supportsImages: true,
        supportsProgress: false, // Varies by desktop environment
        supportsList: true,
        supportsRequireInteraction: true,
        maxTitleLength: 80,
        maxMessageLength: 300,
      };

    default:
      return {
        supportsButtons: false,
        supportsImages: false,
        supportsProgress: false,
        supportsList: false,
        supportsRequireInteraction: false,
        maxTitleLength: 50,
        maxMessageLength: 200,
      };
  }
}
```

### Adaptive Notification Builder

```ts
// adaptive.ts
class AdaptiveNotificationBuilder {
  private config: PlatformNotificationConfig | null = null;

  private async getConfig(): Promise<PlatformNotificationConfig> {
    if (!this.config) {
      this.config = await getPlatformConfig();
    }
    return this.config;
  }

  async build(
    options: chrome.notifications.NotificationOptions & {
      fallbackMessage?: string;
    }
  ): Promise<chrome.notifications.NotificationOptions> {
    const config = await this.getConfig();
    const result = { ...options };

    // Truncate title and message
    if (result.title && result.title.length > config.maxTitleLength) {
      result.title =
        result.title.slice(0, config.maxTitleLength - 3) + "...";
    }
    if (result.message && result.message.length > config.maxMessageLength) {
      result.message =
        result.message.slice(0, config.maxMessageLength - 3) + "...";
    }

    // Fall back to basic type on platforms that don't support the requested type
    if (result.type === "image" && !config.supportsImages) {
      result.type = "basic";
      // Move image context into the message
      if (options.fallbackMessage) {
        result.message = options.fallbackMessage;
      }
    }

    if (result.type === "progress" && !config.supportsProgress) {
      result.type = "basic";
      // Embed progress in the message text
      if (typeof (options as any).progress === "number") {
        result.message = `${(options as any).progress}% complete`;
      }
    }

    if (result.type === "list" && !config.supportsList) {
      result.type = "basic";
      // Flatten list items into message
      if (options.items) {
        result.message = options.items
          .map((item) => `${item.title}: ${item.message}`)
          .join("\n");
      }
    }

    // Remove buttons on platforms that don't support them
    if (result.buttons && !config.supportsButtons) {
      delete result.buttons;
    }

    // Remove requireInteraction where unsupported
    if (result.requireInteraction && !config.supportsRequireInteraction) {
      delete result.requireInteraction;
    }

    return result;
  }
}

const builder = new AdaptiveNotificationBuilder();

// Usage: works correctly on every OS
const options = await builder.build({
  type: "list",
  iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
  title: "3 Tasks Completed",
  message: "Your background tasks finished.",
  items: [
    { title: "Sync", message: "All data synced" },
    { title: "Backup", message: "Exported to cloud" },
    { title: "Cleanup", message: "Cache cleared" },
  ],
  fallbackMessage: "Sync, backup, and cleanup tasks completed.",
});
await chrome.notifications.create(options);
```

---

## User Preference Integration

Always let users control their notification experience:

```ts
// preferences.ts
interface NotificationPreferences {
  enabled: boolean;
  categories: Record<string, boolean>;
  quietHoursStart: number | null; // Hour in 24h format, null = disabled
  quietHoursEnd: number | null;
}

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  categories: {
    security: true,
    updates: true,
    info: true,
    marketing: false,
  },
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 8, // 8 AM
};

async function shouldNotify(category: string): Promise<boolean> {
  const { notificationPrefs } = await chrome.storage.sync.get("notificationPrefs");
  const prefs: NotificationPreferences = {
    ...DEFAULT_PREFS,
    ...notificationPrefs,
  };

  if (!prefs.enabled) return false;
  if (prefs.categories[category] === false) return false;

  // Check quiet hours
  if (prefs.quietHoursStart !== null && prefs.quietHoursEnd !== null) {
    const hour = new Date().getHours();
    if (prefs.quietHoursStart > prefs.quietHoursEnd) {
      // Wraps midnight: e.g., 22:00 to 08:00
      if (hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd) {
        return category === "security"; // Only security bypasses quiet hours
      }
    } else {
      if (hour >= prefs.quietHoursStart && hour < prefs.quietHoursEnd) {
        return category === "security";
      }
    }
  }

  return true;
}
```

---

## Summary

| Pattern | Key Takeaway |
|---------|-------------|
| Notification types | Use the right template — basic, image, list, or progress — for the content |
| Click handling + deep linking | Every notification should have a meaningful click action |
| Button actions | Two buttons max; use for approve/deny or quick-action workflows |
| Rate limiting | Cap frequency per category; never spam the user |
| Queuing + priority | Critical alerts jump the queue; low-priority items can expire |
| Persistent vs transient | Use `requireInteraction` only for actions that genuinely need attention |
| Grouping + replacement | Collapse related notifications; reuse IDs to update in place |
| Platform-aware strategies | macOS ignores image/progress/list types; adapt gracefully |

The best notification is the one the user actually wants to see. Default to fewer notifications, let users configure categories and quiet hours, and always provide a clear action on click. When in doubt, don't notify — surface the information in your popup or side panel instead.
