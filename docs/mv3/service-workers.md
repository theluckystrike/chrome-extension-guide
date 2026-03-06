# MV3 Service Workers: A Complete Migration Guide

In Manifest V3, the persistent background page from Manifest V2 is replaced by **ephemeral service workers**. This fundamental architectural change impacts how you manage state, handle events, and structure your extension's background logic. This guide covers everything you need to know to migrate successfully.

---

## Overview

In MV2, background pages were **persistent**—they loaded once when the browser started and stayed alive indefinitely. This allowed developers to rely on global variables, maintain DOM references, and use `setTimeout`/`setInterval` without concern.

In MV3, background pages are replaced by **service workers** that are:

- **Ephemeral**: Activated when needed, then terminated after a period of inactivity
- **Event-driven**: Wake up only to handle events, then go back to idle
- **Stateless**: No memory persistence between terminations and activations

This is the single biggest change in MV3 and affects virtually every aspect of background script logic.

---

## Key Differences: MV2 vs MV3

| Feature | MV2 Background Page | MV3 Service Worker |
|---------|---------------------|-------------------|
| **Lifecycle** | Persistent (always running) | Ephemeral (terminate when idle) |
| **DOM Access** | ✅ Full DOM access | ❌ No DOM access |
| **setTimeout/setInterval** | ✅ Works reliably | ⚠️ Terminated; use chrome.alarms |
| **Global State** | ✅ Stays in memory | ❌ Lost on termination |
| **Web APIs** | Full access | Limited (no XMLHttpRequest) |
| **Event Listeners** | Can be async | Must be synchronous (top-level) |
| **Console Access** | Yes (background page inspectable) | Yes (via chrome://extensions) |

---

## Manifest Change

The manifest.json configuration changes significantly:

### MV2 (Background Scripts)

```json
{
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  }
}
```

### MV3 (Service Worker)

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

**Key changes:**
- `scripts` → `service_worker`
- `persistent: true` is removed (service workers are non-persistent by default)
- `"type": "module"` enables ES modules in the service worker

---

## Problem 1: State Loss

The most critical issue with service workers is that **global variables are not preserved** between terminations. If your extension relies on:

```ts
// ❌ MV2 style - DOES NOT WORK in MV3
let counter = 0;
let userData = {};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'INCREMENT') {
    counter++;
  }
});
```

This will fail because when the service worker terminates (after ~30 seconds of inactivity), `counter` resets to `0`.

### Solution: Use @theluckystrike/webext-storage

The `@theluckystrike/webext-storage` library provides a type-safe storage abstraction:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// Define your schema with full type safety
const schema = defineSchema({
  counter: 0,
  lastActiveTab: 0,
  sessionData: {} as Record<string, unknown>
});

// Create the storage instance
const storage = createStorage({ schema });

// Use it anywhere in your service worker
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'INCREMENT') {
    storage.set('counter', storage.get('counter') + 1);
  }
  if (msg.type === 'GET_COUNT') {
    return Promise.resolve({ count: storage.get('counter') });
  }
});
```

**Why this works:**
- Data persists in `chrome.storage` (or `localStorage`/`sessionStorage` for non-extension contexts)
- Survives service worker termination
- Type-safe with full TypeScript support
- Works seamlessly across service worker restarts

---

## Problem 2: setTimeout/setInterval

In MV2, you could set timers that would reliably fire:

```ts
// ❌ MV2 style - Unreliable in MV3
setInterval(() => {
  checkForUpdates();
}, 60000); // Every minute
```

In MV3, the service worker **will be terminated** before the timer fires, causing missed executions.

### Solution: Use chrome.alarms

Chrome provides the `chrome.alarms` API specifically for this purpose:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({ lastSync: 0 });
const storage = createStorage({ schema });

// Create an alarm
chrome.alarms.create('syncData', {
  periodInMinutes: 5,
  delayInMinutes: 1  // First trigger after 1 minute
});

// Listen for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    syncData();
  }
});

async function syncData() {
  // Your sync logic here
  storage.set('lastSync', Date.now());
}
```

**Benefits of chrome.alarms:**
- Survives service worker termination
- Alarms persist across browser restarts
- Minimum interval of 1 minute; timing is approximate, not precise

---

## Problem 3: Event Listeners Must Be Synchronous

In MV2, you could register event listeners inside async functions:

```ts
// ❌ MV2 style - DOES NOT WORK in MV3
async function setupListeners() {
  // This won't work because by the time the service worker
  // wakes up, this async function may not have run yet
  chrome.runtime.onMessage.addListener(handleMessage);
}

setupListeners();
```

In MV3, service workers wake up briefly to handle events. If your listener isn't registered at the **top level** of the script, it won't be there when the event fires.

### Solution: Use @theluckystrike/webext-messaging

The `@theluckystrike/webext-messaging` library handles this correctly:

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

// Define your message types
interface Messages = {
  increment: { amount: number };
  getCount: void;
  syncData: void;
};

// Create messenger at top level - synchronous registration
const msg = createMessenger<Messages>();

// Register handlers at top level
msg.onMessage('increment', async ({ amount }) => {
  // Handler logic here
  return { success: true };
});

msg.onMessage('getCount', async () => {
  return { count: 42 };
});

msg.onMessage('syncData', async () => {
  await doSync();
  return { synced: true };
});
```

**Why this works:**
- Listeners are registered synchronously at the top level
- The library handles the complex messaging lifecycle
- Full type safety for messages between contexts

---

## Problem 4: No DOM Access

Service workers **cannot access the DOM** directly. If your background script contained:

```ts
// ❌ MV2 style - No DOM in service worker
const div = document.createElement('div');
document.body.appendChild(div);
```

This will fail in MV3.

### Solutions

### Option A: Use chrome.offscreen

For operations requiring DOM (like playing audio, WebRTC, etc.), use the Offscreen API:

```ts
// Create an offscreen document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['DOM_PARSER', 'AUDIO_PLAYBACK'],
  justification: 'Parsing HTML and playing audio notifications'
});

// Communicate via messages
chrome.runtime.sendMessage({
  type: 'DO_DOM_WORK',
  data: { /* ... */ }
});
```

### Option B: Move Logic to Popup or Content Scripts

For most use cases, move DOM-dependent logic to:
- **Popup**: When user clicks the extension icon
- **Content scripts**: When running on web pages

---

## Problem 5: No XMLHttpRequest

The `XMLHttpRequest` API is not available in service workers:

```ts
// ❌ MV2 style - Does not work in MV3
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/data');
xhr.send();
```

### Solution: Use fetch()

The Fetch API works in service workers:

```ts
// ✅ MV3 compatible
async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  return data;
}
```

---

## Service Worker Lifecycle

Understanding the lifecycle is crucial for debugging and optimization:

```
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE WORKER LIFECYCLE                   │
└─────────────────────────────────────────────────────────────────┘

   ┌─────────┐
   │ INSTALL │  ← Cache assets, initialize storage
   └────┬────┘
        │ on install event fires
        ▼
   ┌──────────┐
   │ ACTIVATE │  ← Clean up old caches, handle migrations
   └────┬─────┘
        │ on activate event fires
        ▼
   ┌────────┐     ┌────────┐     ┌───────────┐
   │ IDLE   │────▶│EVENT   │────▶│ TERMINATE │
   └────────┘     └────────┘     └───────────┘
       ▲                                     │
       │                                     │
       └────────── (wake on event) ──────────┘
       
   KEY POINTS:
   - Service worker starts when an event fires
   - After ~30 seconds of inactivity, it terminates
   - On next event, it wakes up fresh (no memory)
   - Use chrome.storage for persistence
   - Register all listeners at top level
```

### Lifecycle Events

1. **Install**: Fires once when the service worker first loads
   - Good for one-time setup
   - Precache static assets

2. **Activate**: Fires after installation (or when updated)
   - Good for cleaning up old data
   - Handle migrations

3. **Message/Alarm/Event**: Wakes the service worker
   - This is when your logic runs
   - Must have all listeners already registered

---

## Migration Checklist

Use this checklist to ensure complete migration:

- [ ] Update manifest.json: `scripts` → `service_worker`, add `"type": "module"`
- [ ] Remove `persistent: true` from manifest
- [ ] Replace global variables with `@theluckystrike/webext-storage`
- [ ] Replace `setTimeout`/`setInterval` with `chrome.alarms`
- [ ] Move event listener registration to top level (synchronous)
- [ ] Use `@theluckystrike/webext-messaging` for message handling
- [ ] Replace XMLHttpRequest with fetch()
- [ ] Remove any DOM manipulation from background script
- [ ] If DOM needed: use chrome.offscreen or move to popup/content script
- [ ] Test extension thoroughly (including after idle periods)
- [ ] Update any background page-related documentation

---

## Common Mistakes

### ❌ Registering Listeners in Async Functions

```ts
// WRONG
async function init() {
  chrome.runtime.onMessage.addListener(handler);
}
init();
```

```ts
// CORRECT - Top level
chrome.runtime.onMessage.addListener(handler);
```

### ❌ Relying on Memory for State

```ts
// WRONG - State lost on termination
let user = { name: 'John' };
```

```ts
// CORRECT - Use storage
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";
const schema = defineSchema({ user: {} as { name: string } });
const storage = createStorage({ schema });
// State persists across terminations
```

### ❌ Using setTimeout for Delayed Tasks

```ts
// WRONG - May not fire after termination
setTimeout(doSomething, 60000);
```

```ts
// CORRECT - Use chrome.alarms
chrome.alarms.create('delayedTask', { delayInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'delayedTask') doSomething();
});
```

### ❌ Using XMLHttpRequest

```ts
// WRONG - Not available in service worker
const xhr = new XMLHttpRequest();
```

```ts
// CORRECT - Use fetch
const response = await fetch(url);
const data = await response.json();
```

---

## Summary

Migrating from MV2 background pages to MV3 service workers requires rethinking your architecture:

1. **State** must live in storage, not memory
2. **Timers** must use chrome.alarms, not setTimeout/setInterval
3. **Event listeners** must be synchronous and top-level
4. **No DOM** in the service worker—use offscreen or other contexts
5. **No XMLHttpRequest**—use fetch instead

The `@theluckystrike/webext-storage` and `@theluckystrike/webext-messaging` libraries provide the foundation for building reliable MV3 extensions that handle the ephemeral nature of service workers gracefully.

---

## Next Steps

- Review the [Runtime API](../api-reference/runtime-api.md) for cross-context communication
- See [Storage Changes in MV3](storage-changes.md) for advanced storage patterns
- Check [Service Worker Lifecycle](../guides/service-worker-lifecycle.md) for detailed event handling
