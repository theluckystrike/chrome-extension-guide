# Build a Notification Center Extension — Full Tutorial

## What We're Building
- Notification center displaying all notifications in a side panel
- Supports all 4 notification types: basic, image, list, progress
- Stores history with read/unread states, badge showing unread count
- Scheduled notifications via alarms
- Cross-ref: [notifications permission](../permissions/notifications.md), [sidePanel permission](../permissions/sidePanel.md)

## Prerequisites
- Basic Chrome extension knowledge
- `npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging`

## Step 1: manifest.json
```json
{
  "manifest_version": 3,
  "name": "Notification Center",
  "version": "1.0.0",
  "permissions": ["notifications", "sidePanel", "storage", "alarms"],
  "side_panel": { "default_path": "sidepanel.html" },
  "action": { "default_icon": "icon.png" },
  "background": { "service_worker": "background.js" }
}
```

## Step 2: Storage Schema
```typescript
// storage.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

export interface NotificationEntry {
  id: string; type: 'basic' | 'image' | 'list' | 'progress';
  title: string; message: string; timestamp: number; read: boolean;
  iconUrl?: string; imageUrl?: string; items?: Array<{ title: string; message: string }>; progress?: number;
}

export const storage = createStorage(defineSchema({ notifications: 'object', unreadCount: 'number' }), 'local');
export const DEFAULT_STATE = { notifications: [] as NotificationEntry[], unreadCount: 0 };
```

## Step 3: Create All Notification Types
```typescript
// notifications.ts
import { storage, DEFAULT_STATE } from './storage';
import type { NotificationEntry } from './storage';

async function addToHistory(entry: NotificationEntry) {
  const state = await storage.get() || DEFAULT_STATE;
  state.notifications.unshift(entry);
  state.unreadCount++;
  await storage.set(state);
  return entry;
}

export async function createBasic(title: string, message: string) {
  const id = await chrome.notifications.create({ type: 'basic', iconUrl: 'icons/n.png', title, message });
  return addToHistory({ id, title, message, timestamp: Date.now(), read: false, type: 'basic' });
}

export async function createImage(title: string, message: string, imageUrl: string) {
  const id = await chrome.notifications.create({ type: 'image', iconUrl: 'icons/n.png', title, message, imageUrl });
  return addToHistory({ id, title, message, timestamp: Date.now(), read: false, type: 'image', imageUrl });
}

export async function createList(title: string, items: Array<{ title: string; message: string }>) {
  const id = await chrome.notifications.create({ type: 'list', iconUrl: 'icons/n.png', title, message: `${items.length} items`, items });
  return addToHistory({ id, title, message: `${items.length} items`, timestamp: Date.now(), read: false, type: 'list', items });
}

export async function createProgress(title: string, progress: number) {
  const id = await chrome.notifications.create({ type: 'progress', iconUrl: 'icons/n.png', title, message: `${progress}%`, progress });
  return addToHistory({ id, title, message: `${progress}%`, timestamp: Date.now(), read: false, type: 'progress', progress });
}
```

## Step 4: Background Service Worker
```typescript
// background.ts
import { createMessenger } from '@theluckystrike/webext-messaging';
import { storage, DEFAULT_STATE } from './storage';
import { createBasic, createList, createProgress } from './notifications';

type Messages = {
  getNotifications: { request: void; response: any[] };
  markRead: { request: { id: string }; response: void };
  markAllRead: { request: void; response: void };
  clearAll: { request: void; response: void };
};

const messenger = createMessenger<Messages>();

chrome.notifications.onClicked.addListener(async (id) => {
  const state = await storage.get() || DEFAULT_STATE;
  const n = state.notifications.find(x => x.id === id);
  if (n && !n.read) { n.read = true; state.unreadCount = Math.max(0, state.unreadCount - 1); await storage.set(state); updateBadge(state.unreadCount); }
  chrome.notifications.clear(id);
});

function updateBadge(count: number) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
}

messenger.onMessage('getNotifications', async () => (await storage.get() || DEFAULT_STATE).notifications);
messenger.onMessage('markRead', async ({ id }) => {
  const state = await storage.get() || DEFAULT_STATE;
  const n = state.notifications.find(x => x.id === id);
  if (n && !n.read) { n.read = true; state.unreadCount = Math.max(0, state.unreadCount - 1); await storage.set(state); updateBadge(state.unreadCount); }
});
messenger.onMessage('markAllRead', async () => { await storage.set({ ...DEFAULT_STATE, notifications: (await storage.get() || DEFAULT_STATE).notifications.map(n => ({ ...n, read: true })) }); updateBadge(0); });
messenger.onMessage('clearAll', async () => { await storage.set(DEFAULT_STATE); updateBadge(0); });

chrome.action.onClicked.addListener(async (tab) => await chrome.sidePanel.open({ tabId: tab.id }));
```

## Step 5: Side Panel UI
```html
<!-- sidepanel.html -->
<!DOCTYPE html><html><head><link rel="stylesheet" href="sidepanel.css"></head>
<body><header><h1>Notifications</h1><div><button id="markAllRead">Mark All Read</button><button id="clearAll">Clear All</button></div></header>
<div id="notificationList"></div><script src="sidepanel.js"></script></body></html>
```

## Step 6: Side Panel Logic
```typescript
// sidepanel.ts
import { createMessenger } from '@theluckystrike/webext-messaging';
import type { NotificationEntry } from './storage';

const messenger = createMessenger<any>();

async function load() {
  const notifications = await messenger.sendMessage('getNotifications', undefined);
  document.getElementById('notificationList')!.innerHTML = notifications.map(n => 
    `<div class="item ${n.read ? 'read' : 'unread'}" data-id="${n.id}"><div class="title">${n.title}</div><div class="msg">${n.message}</div><div class="time">${new Date(n.timestamp).toLocaleString()}</div></div>`
  ).join('');
}

document.getElementById('markAllRead')!.onclick = async () => { await messenger.sendMessage('markAllRead', undefined); load(); };
document.getElementById('clearAll')!.onclick = async () => { await messenger.sendMessage('clearAll', undefined); load(); };
document.getElementById('notificationList')!.onclick = async (e: any) => { if (e.target.closest('.item')) { await messenger.sendMessage('markRead', { id: e.target.closest('.item').dataset.id }); load(); }};
load();
```

## Step 7: Side Panel CSS
```css
/* sidepanel.css */
body { width: 320px; font-family: system-ui, sans-serif; margin: 0; }
header { display: flex; justify-content: space-between; padding: 10px; background: #f5f5f5; border-bottom: 1px solid #ddd; }
header h1 { margin: 0; font-size: 15px; }
header button { font-size: 11px; margin-left: 6px; cursor: pointer; }
.item { padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; }
.item.unread { background: #e8f0fe; }
.item .title { font-weight: 600; font-size: 13px; }
.item .msg { color: #666; font-size: 12px; margin: 3px 0; }
.item .time { color: #999; font-size: 10px; }
```

## Step 8: Scheduled Notifications via Alarms
```typescript
// scheduled.ts - add to background.ts
export async function scheduleNotification(name: string, title: string, msg: string, delayMin: number = 1) {
  chrome.alarms.create(name, { delayInMinutes: delayMin });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const state = await storage.get() || DEFAULT_STATE;
  const scheduled = state.notifications.find(n => n.id === alarm.name);
  if (scheduled) await chrome.notifications.create({ type: 'basic', iconUrl: 'icons/n.png', title: scheduled.title, message: scheduled.message });
});
```

## Summary
This notification center extension covers: all 4 notification types, @theluckystrike/webext-storage for persistence, side panel UI with history, @theluckystrike/webext-messaging, badge for unread count, scheduled notifications via chrome.alarms, mark read/clear all actions, and proper cross-references.
