# Build a Focus Timer (Pomodoro) Extension

## Overview
Build a Pomodoro timer extension with configurable work/break intervals, site blocking during focus sessions, notifications, and session history.

## Manifest
```json
{
  "manifest_version": 3,
  "name": "FocusFlow",
  "version": "1.0.0",
  "permissions": ["alarms", "notifications", "storage", "declarativeNetRequest", "activeTab"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "declarative_net_request": {
    "rule_resources": [{ "id": "focus_rules", "enabled": false, "path": "rules.json" }]
  },
  "web_accessible_resources": [{
    "resources": ["blocked.html"],
    "matches": ["<all_urls>"]
  }]
}
```

## Timer with chrome.alarms
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  timerState: 'string',      // 'idle' | 'focus' | 'break'
  timerEndTime: 'number',     // timestamp when current period ends
  focusMinutes: 'number',     // default 25
  breakMinutes: 'number',     // default 5
  sessionsCompleted: 'number',
  totalFocusMinutes: 'number',
  blockedSites: 'string'      // JSON array
});
const storage = createStorage(schema, 'local');

// Start focus session
async function startFocus() {
  const minutes = (await storage.get('focusMinutes')) || 25;
  const endTime = Date.now() + minutes * 60000;
  await storage.set('timerState', 'focus');
  await storage.set('timerEndTime', endTime);
  chrome.alarms.create('focus-end', { delayInMinutes: minutes });
  await enableSiteBlocking();
  updateBadge('focus', minutes);
}
```

## Messaging
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  START_FOCUS: { request: {}; response: { endTime: number } };
  START_BREAK: { request: {}; response: { endTime: number } };
  STOP_TIMER: { request: {}; response: { ok: boolean } };
  GET_STATUS: { request: {}; response: { state: string; remaining: number; sessions: number } };
  GET_STATS: { request: {}; response: { todayMinutes: number; totalSessions: number } };
};
const m = createMessenger<Messages>();

m.onMessage('START_FOCUS', async () => {
  await startFocus();
  const endTime = await storage.get('timerEndTime');
  return { endTime: endTime! };
});

m.onMessage('GET_STATUS', async () => {
  const state = (await storage.get('timerState')) || 'idle';
  const endTime = (await storage.get('timerEndTime')) || 0;
  const remaining = Math.max(0, endTime - Date.now());
  const sessions = (await storage.get('sessionsCompleted')) || 0;
  return { state, remaining, sessions };
});
```

## Alarm Handlers
```typescript
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'focus-end') {
    const sessions = ((await storage.get('sessionsCompleted')) || 0) + 1;
    await storage.set('sessionsCompleted', sessions);
    const focusMin = (await storage.get('focusMinutes')) || 25;
    const total = ((await storage.get('totalFocusMinutes')) || 0) + focusMin;
    await storage.set('totalFocusMinutes', total);

    chrome.notifications.create('focus-done', {
      type: 'basic', iconUrl: 'icon-128.png',
      title: 'Focus Complete!',
      message: `Session ${sessions} done. Time for a break!`,
      buttons: [{ title: 'Start Break' }, { title: 'Skip' }]
    });
    await disableSiteBlocking();
    await storage.set('timerState', 'idle');
  }
  if (alarm.name === 'break-end') {
    chrome.notifications.create('break-done', {
      type: 'basic', iconUrl: 'icon-128.png',
      title: 'Break Over',
      message: 'Ready for another focus session?'
    });
    await storage.set('timerState', 'idle');
  }
  if (alarm.name === 'badge-update') {
    await updateBadgeCountdown();
  }
});
```

## Site Blocking During Focus
```typescript
async function enableSiteBlocking() {
  const sites = JSON.parse(await storage.get('blockedSites') || '["twitter.com","reddit.com","youtube.com"]');
  const rules = sites.map((site: string, i: number) => ({
    id: i + 1,
    priority: 1,
    action: { type: 'redirect' as const, redirect: { extensionPath: '/blocked.html' } },
    condition: { urlFilter: `||${site}`, resourceTypes: ['main_frame' as const] }
  }));
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map((r: any) => r.id),
    addRules: rules
  });
}

async function disableSiteBlocking() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map(r => r.id)
  });
}
```

## Badge Countdown
```typescript
async function updateBadge(state: string, minutes?: number) {
  if (state === 'focus') {
    chrome.action.setBadgeText({ text: `${minutes}m` });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
    chrome.alarms.create('badge-update', { periodInMinutes: 1 });
  } else if (state === 'break') {
    chrome.action.setBadgeText({ text: 'BRK' });
    chrome.action.setBadgeBackgroundColor({ color: '#2ecc71' });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.alarms.clear('badge-update');
  }
}
```

## Notification Actions
```typescript
chrome.notifications.onButtonClicked.addListener(async (notifId, buttonIndex) => {
  if (notifId === 'focus-done' && buttonIndex === 0) {
    const breakMin = (await storage.get('breakMinutes')) || 5;
    await storage.set('timerState', 'break');
    await storage.set('timerEndTime', Date.now() + breakMin * 60000);
    chrome.alarms.create('break-end', { delayInMinutes: breakMin });
    updateBadge('break');
  }
});
```

## Service Worker Restart Recovery
```typescript
chrome.runtime.onStartup.addListener(async () => {
  const state = await storage.get('timerState');
  const endTime = await storage.get('timerEndTime');
  if (state && state !== 'idle' && endTime && endTime > Date.now()) {
    const remaining = (endTime - Date.now()) / 60000;
    chrome.alarms.create(state === 'focus' ? 'focus-end' : 'break-end', { delayInMinutes: remaining });
    if (state === 'focus') await enableSiteBlocking();
    updateBadge(state, Math.ceil(remaining));
  } else if (state !== 'idle') {
    await storage.set('timerState', 'idle');
  }
});
```

## Cross-References
- Permission: `docs/permissions/alarms.md`, `docs/permissions/declarativeNetRequest.md`
- MV3: `docs/mv3/event-driven-architecture.md`
- Guide: `docs/guides/notifications-guide.md`
