---
layout: default
title: "Chrome Extension Service Worker Lifecycle — Developer Guide"
description: "Master Chrome extension service workers with this guide covering lifecycle, messaging, and background task implementation."
---
# Service Worker Lifecycle Deep Dive

## Introduction
- MV3 replaces persistent background pages with service workers
- Service workers are event-driven, short-lived, and stateless
- Understanding the lifecycle is critical for reliable extensions

## Lifecycle Phases
1. **Registration**: Chrome reads `manifest.json` `background.service_worker`
2. **Installation**: First time or after update — `chrome.runtime.onInstalled` fires
3. **Activation**: SW becomes active, ready to handle events
4. **Idle**: No events pending — SW enters idle state
5. **Termination**: ~30 seconds after last event — SW is killed
6. **Wake-up**: New event arrives — SW restarts from scratch

## Event-Driven Wake-up
- SW wakes for: alarms, messages, web requests, commands, runtime events
- Each wake-up = cold start — all top-level code re-executes
- MUST register all event listeners at top level (synchronously):
```javascript
// GOOD: top-level registration
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.runtime.onMessage.addListener(handleMessage);
chrome.action.onClicked.addListener(handleClick);

// BAD: inside async — may miss events
async function init() {
  chrome.alarms.onAlarm.addListener(handleAlarm); // Too late!
}
init();
```

## chrome.runtime.onInstalled vs onStartup
- `onInstalled`: fires on first install, extension update, Chrome update
- `onStartup`: fires on every browser launch (not on install/update)
- Use `onInstalled` for: setting defaults, creating alarms, showing welcome page
- Use `onStartup` for: session initialization, connectivity checks
- Cross-ref: `docs/guides/extension-updates.md`

## State Persistence
- **Problem**: all variables reset to initial values on every wake-up
- **Solution**: use `@theluckystrike/webext-storage` for persistent state
```typescript
const storage = createStorage(defineSchema({
  counter: 'number',
  lastActive: 'number',
  settings: 'string'
}), 'local');

// On every wake-up, read state from storage
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const counter = await storage.get('counter') || 0;
  await storage.set('counter', counter + 1);
  await storage.set('lastActive', Date.now());
});
```

## Keeping SW Alive (and Why You Shouldn't)
- Chrome terminates idle SW after ~30 seconds
- Workarounds exist (periodic alarms, ports) but are anti-patterns
- Design FOR termination, not against it
- If you need long-running work: use offscreen documents (`docs/mv3/offscreen-documents.md`)

## Async Initialization Patterns
```javascript
// Pattern: lazy-loaded config
let config = null;
async function getConfig() {
  if (!config) {
    const storage = createStorage(defineSchema({ config: 'string' }), 'local');
    const raw = await storage.get('config');
    config = raw ? JSON.parse(raw) : DEFAULT_CONFIG;
  }
  return config;
}

// Use in handlers
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  getConfig().then(cfg => {
    sendResponse({ theme: cfg.theme });
  });
  return true; // Keep channel open for async response
});
```

## Debugging SW Lifecycle
- `chrome://extensions` → "Inspect views: service worker"
- Console persists across SW restarts (if DevTools stays open)
- `chrome://serviceworker-internals` — low-level SW status
- Add lifecycle logging:
```javascript
console.log('[SW] Script executing at', new Date().toISOString());
chrome.runtime.onInstalled.addListener(() => console.log('[SW] onInstalled'));
chrome.runtime.onStartup.addListener(() => console.log('[SW] onStartup'));
```

## Common Patterns
- **Alarm-driven sync**: `chrome.alarms` wakes SW periodically
- **Message-driven**: popup/content script sends message, SW wakes to respond
- **Event-driven**: `chrome.webNavigation`, `chrome.tabs.onUpdated` wake SW
- **Init on install**: `onInstalled` sets up alarms, defaults, context menus

## Common Mistakes
- Expecting global variables to persist — they don't
- Registering listeners inside `async` functions — misses events
- Using `setTimeout`/`setInterval` for scheduling — use `chrome.alarms`
- Heavy initialization at top level — slows every wake-up
- Not handling the case where SW was terminated mid-operation
