# Event-Driven Architecture in MV3

## Why Event-Driven?
MV3 service workers terminate after ~30s idle. No persistent background. Extensions must design for termination.

## Core Rule: Top-Level Listener Registration
```javascript
// CORRECT
chrome.runtime.onInstalled.addListener(handleInstall);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.action.onClicked.addListener(handleClick);

async function handleInstall(details) { /* ... */ }
```

```javascript
// WRONG: listener inside async — lost on wake-up
chrome.runtime.onInstalled.addListener(async () => {
  const cfg = await loadConfig();
  if (cfg.enabled) {
    chrome.webNavigation.onCompleted.addListener(handleNav); // GONE!
  }
});
```

## Service Worker Lifecycle
Install -> Active -> Idle (30s) -> Terminated -> (event) -> Restart

## No Global State
```javascript
// WRONG
let counter = 0;
chrome.action.onClicked.addListener(() => counter++); // Always 1

// CORRECT
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const storage = createStorage(defineSchema({ counter: 'number' }), 'local');
chrome.action.onClicked.addListener(async () => {
  const c = (await storage.get('counter')) || 0;
  await storage.set('counter', c + 1);
});
```

## Alarms Replace setInterval
```javascript
// WRONG: dies with SW
setInterval(() => check(), 60000);

// CORRECT
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('check', { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check') check();
});
```

## Message-Driven Workflows
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';
type Msgs = {
  GET_STATUS: { request: { id: string }; response: { status: string } };
};
const m = createMessenger<Msgs>();
m.onMessage('GET_STATUS', async ({ id }) => {
  const tasks = JSON.parse(await storage.get('tasks') || '{}');
  return { status: tasks[id] || 'unknown' };
});
```

## Wake-Up Event Sources
- `chrome.alarms.onAlarm`
- `chrome.runtime.onMessage` / `onConnect` / `onMessageExternal`
- `chrome.runtime.onInstalled` / `onStartup`
- `chrome.action.onClicked` / `chrome.commands.onCommand`
- `chrome.contextMenus.onClicked`
- `chrome.webNavigation.*` / `chrome.webRequest.*`
- `chrome.tabs.*` / `chrome.notifications.onClicked`

## Initialization Pattern
```javascript
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await chrome.storage.local.set({ isEnabled: true });
    chrome.alarms.create('sync', { periodInMinutes: 5 });
    chrome.contextMenus.create({ id: 'main', title: 'My Ext', contexts: ['page'] });
  }
});
chrome.runtime.onStartup.addListener(async () => {
  const alarm = await chrome.alarms.get('sync');
  if (!alarm) chrome.alarms.create('sync', { periodInMinutes: 5 });
});
```

## Anti-Patterns

### WebSocket (dies with SW)
```javascript
// Use alarms to poll instead
chrome.alarms.create('poll', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'poll') {
    const data = await fetch('https://api.example.com/updates').then(r => r.json());
    if (data.hasUpdates) processUpdates(data);
  }
});
```

### Long-Running Tasks
```javascript
// Chunk work and save progress
async function processChunk() {
  const { items, idx } = await chrome.storage.local.get(['items', 'idx']);
  const chunk = items.slice(idx, idx + 10);
  for (const item of chunk) await process(item);
  await chrome.storage.local.set({ idx: idx + chunk.length });
  if (idx + chunk.length < items.length) {
    chrome.alarms.create('next', { delayInMinutes: 0.1 });
  }
}
```

## Common Mistakes
- Listeners inside `onInstalled` — lost on wake-up
- Global variables — reset on termination
- `setInterval` / `setTimeout` — use `chrome.alarms`
- Assuming SW stays alive — design for termination
- Not saving progress for long tasks
