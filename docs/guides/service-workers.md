Chrome Extension Service Workers Guide

Introduction

Chrome Extension Manifest V3 (MV3) replaced persistent background pages with service workers. Service workers in extensions are event-driven, short-lived, and stateless. This guide covers everything you need to build reliable extension service workers.

Service Worker Lifecycle

Lifecycle Phases

1. Registration: Chrome reads `background.service_worker` from `manifest.json`
2. Installation: `chrome.runtime.onInstalled` fires on first load or update
3. Activation: Service worker becomes active, ready to handle events
4. Idle: No events pending, SW enters idle state
5. Termination: ~30 seconds after last event, SW is killed
6. Wake-up: New event arrives, SW restarts from scratch

Manifest Registration

```json
{
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  }
}
```

Set `type: module` for ES modules support.

Event-Driven Architecture

Top-Level Listener Registration

All listeners MUST be registered at top level synchronously:

```javascript
//  CORRECT: Top-level registration
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.runtime.onMessage.addListener(handleMessage);

//  WRONG: Inside async (misses events)
async function init() {
  chrome.alarms.onAlarm.addListener(handleAlarm); // Too late!
}
init();
```

Persistent Data Storage

chrome.storage vs Global Variables

Never rely on global variables, they reset when the service worker terminates.

```javascript
// Store data
await chrome.storage.local.set({ userData: { name: 'John' }, lastUpdated: Date.now() });

// Retrieve data
const { userData } = await chrome.storage.local.get('userData');

// Session storage (cleared on browser close)
await chrome.storage.session.set({ tempToken: 'abc123' });
```

Lazy Initialization

```javascript
let config = null;
async function getConfig() {
  if (!config) {
    const result = await chrome.storage.local.get('config');
    config = result.config ? JSON.parse(result.config) : DEFAULT_CONFIG;
  }
  return config;
}
```

Alarms for Periodic Tasks

Use `chrome.alarms` instead of `setInterval`, the latter doesn't work in service workers.

```javascript
// Create periodic alarm
chrome.alarms.create('syncData', { delayInMinutes: 5, periodInMinutes: 5 });

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') syncData();
});

// Clean up on uninstall
chrome.runtime.onInstalled.addListener(() => chrome.alarms.clearAll());
```

Keeping Service Worker Alive

Patterns (Use Sparingly)

```javascript
// Periodic alarm keeps SW alive briefly
chrome.alarms.create('keepAlive', { delayInMinutes: 0.1, periodInMinutes: 0.1 });

// Long-lived message port
const port = chrome.runtime.connect({ name: 'keep-alive' });
setInterval(() => port.postMessage({ keepAlive: true }), 25000);
```

Anti-Patterns to Avoid

- Don't use endless loops or timers
- Don't keep SW alive for long operations
- Design for termination instead

Better Alternative: Offscreen Documents

For DOM operations, use offscreen documents:

```javascript
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['DOM_PARSER', 'CLIPBOARD'],
  justification: 'Need DOM for data processing'
});
```

Script Import Methods

importScripts (Classic)

```javascript
importScripts('utils.js', 'api-client.js');
```

ES Modules

```javascript
// In manifest.json
"background": { "service_worker": "sw.js", "type": "module" }

// In sw.js
import { helper } from './utils.js';
```

Fetch Events Differences

Extension service workers handle fetch differently from web service workers:

```javascript
// Extension uses webRequest API, not fetch event
chrome.webRequest.onBeforeRequest.addListener(
  (details) => console.log('Intercepted:', details.url),
  { urls: ['<all_urls>'] }
);
```

Key differences:
- No `fetch` event listener support in extensions
- Use `chrome.webRequest` or `chrome.declarativeNetRequest`
- No Cache API for extension resources

WebSocket Connections

```javascript
let socket = null;
let reconnectAttempts = 0;

function connect() {
  socket = new WebSocket('wss://api.example.com');
  socket.onopen = () => { reconnectAttempts = 0; };
  socket.onclose = () => attemptReconnect();
  socket.onmessage = (e) => handleMessage(JSON.parse(e.data));
}

function attemptReconnect() {
  if (reconnectAttempts < 5) {
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    setTimeout(connect, delay);
  }
}
```

IndexedDB for Large Data

```javascript
const DB_NAME = 'ExtensionDB';
const STORE_NAME = 'cachedData';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}
```

Migrating from MV2 Background Pages

| MV2 Background | MV3 Service Worker |
|---------------|-------------------|
| Always running | Terminates after 30s idle |
| Global variables persist | Use chrome.storage |
| setInterval works | Use chrome.alarms |
| XMLHttpRequest | fetch + chrome.alarms |
| Persistent socket | Reconnection needed |

```javascript
// MV2 (won't work in MV3)
let cachedData = null;
setInterval(() => fetchData(), 60000);

// MV3 style
chrome.alarms.create('fetchData', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'fetchData') fetchData(); });
```

Debugging Service Worker Lifecycle

Access DevTools

1. Open `chrome://extensions`
2. Find your extension
3. Click "Inspect views: service worker"

Lifecycle Logging

```javascript
console.log(`[SW] Started at ${new Date().toISOString()}`);
chrome.runtime.onInstalled.addListener((d) => console.log(`[SW] Installed: ${d.reason}`));
chrome.runtime.onStartup.addListener(() => console.log('[SW] Browser started'));
chrome.alarms.onAlarm.addListener((a) => console.log(`[SW] Alarm: ${a.name}`));
```

Testing Termination Scenarios

Manual Testing

1. Open `chrome://serviceworker-internals`
2. Find your extension's service worker
3. Click "Terminate"
4. Trigger events to verify wake-up

Automated with Puppeteer

```javascript
const targets = await browser.targets();
const swTarget = targets.find(t => t.type() === 'service_worker');
if (swTarget) {
  const sw = await swTarget.worker();
  await sw.detach(); // Terminate SW
}
```

Common Pitfalls

Lost State

```javascript
//  BAD: Expecting state to persist
let userData = null;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!userData) userData = fetchUserData(); // Won't work after restart!
});

//  GOOD: Always read from storage
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  const { userData } = await chrome.storage.local.get('userData');
  sendResponse(userData);
});
```

Race Conditions

```javascript
//  BAD: Concurrent writes cause races
async function updateCounter() {
  const { count } = await chrome.storage.local.get('count');
  await chrome.storage.local.set({ count: count + 1 });
}

//  GOOD: Use storage change listener
chrome.storage.onChanged.addListener((changes) => {
  if (changes.count) console.log('Count:', changes.count.newValue);
});
```

Event Ordering

```javascript
// Handle events that may fire before setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('test', { delayInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener(handleAlarm); // Register first
chrome.runtime.onInstalled.addListener(() => setup()); // Then setup
```

Reference

- Official Docs: [developer.chrome.com/docs/extensions/develop/concepts/service-workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)
- Storage API: [developer.chrome.com/docs/extensions/reference/storage](https://developer.chrome.com/docs/extensions/reference/storage)
- Alarms API: [developer.chrome.com/docs/extensions/reference/alarms](https://developer.chrome.com/docs/extensions/reference/alarms)
- Offscreen Documents: [developer.chrome.com/docs/extensions/mv3/intro/mv3-overview#offscreen-documents](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-overview#offscreen-documents)

Summary

- Design for termination, assume state will be lost
- Register all listeners at top level synchronously
- Use chrome.storage for persistent data
- Use chrome.alarms for periodic tasks
- Test termination and wake-up scenarios
- Use offscreen documents for DOM operations
- Implement reconnection logic for WebSockets
