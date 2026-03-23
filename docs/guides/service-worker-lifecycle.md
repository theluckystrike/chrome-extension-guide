---
layout: default
title: "Chrome Extension Service Worker Lifecycle. Events, Idle Timeout, and Persistence in MV3"
description: "Master the Chrome extension service worker lifecycle in Manifest V3. Learn about install/activate events, the 30-second idle timeout, keepalive patterns, offscreen documents, and state persistence between wake-ups."
canonical_url: "https://bestchromeextensions.com/guides/service-worker-lifecycle/"
---

Chrome Extension Service Worker Lifecycle. Events, Idle Timeout, and Persistence in MV3

Introduction {#introduction}

The service worker is the backbone of any Chrome extension's background functionality in Manifest V3. Unlike the persistent background pages of MV2, service workers are ephemeral, they start up when needed and shut down when idle. Understanding this lifecycle is crucial for building reliable extensions that don't lose state or miss critical events.

This guide covers the complete service worker lifecycle, from installation through activation, idle timeout behavior, and the patterns you need to maintain state across wake-up cycles.

Service Worker Lifecycle Overview {#lifecycle-overview}

When Chrome loads your extension, the service worker follows a predictable lifecycle:

1. Installation - Triggered when the extension is first installed or updated
2. Activation - Triggered after installation completes and before the worker handles events
3. Idle - The worker waits for events but terminates after ~30 seconds of inactivity
4. Wake-up - Chrome restarts the worker when events or alarms fire
5. Termination - The worker is killed after the idle timeout expires

Understanding each phase helps you design solid extensions that work correctly despite the worker's non-persistent nature.

Installation Event {#install-event}

The `install` event fires when the extension is first installed or updated to a new version. This is your opportunity to perform one-time setup tasks.

```javascript
// background.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time installation
    console.log('Extension installed for the first time');
    initializeDefaultSettings();
  } else if (details.reason === 'update') {
    // Extension was updated
    const previousVersion = details.previousVersion;
    console.log(`Updated from ${previousVersion}`);
    migrateSettings(previousVersion);
  }
});
```

Key points about the install event:
- Fires exactly once per extension installation or update
- Runs before the service worker activates
- Use this event to initialize databases, fetch initial configuration, or set up default state
- The install phase has no time limit, so you can perform asynchronous operations

What to Do During Installation

- Initialize storage: Set up default values in `chrome.storage`
- Create initial data structures: Set up IndexedDB databases if needed
- Fetch remote configuration: Get initial settings from your server
- Register for events: Set up any necessary event listeners

Activation Event {#activate-event}

The `activate` event fires after installation completes and before the service worker starts handling events. This is the ideal time to clean up old data or perform migration tasks.

```javascript
chrome.runtime.onActivated.addListener((details) => {
  console.log(`Extension activated. Previous ID: ${details.id}`);
  
  // Clean up outdated cached data
  cleanupOldCache();
  
  // Perform any migration tasks
  migrateFromOldVersion();
});
```

The activation event is particularly useful for:
- Cleaning up data from previous versions
- Resetting state that shouldn't persist across updates
- Running database migrations

Idle Timeout Behavior {#idle-timeout}

Chrome terminates extension service workers after approximately 30 seconds of inactivity. This is a fundamental aspect of MV3 that you must design around.

Understanding the 30-Second Rule

The idle timeout isn't fixed at exactly 30 seconds, Chrome uses a dynamic algorithm:
- Minimum idle timeout: ~30 seconds
- Chrome may extend the timeout if there's pending work
- The worker can be terminated at any time after the idle period

```javascript
// WARNING: This won't work reliably in MV3
setInterval(() => {
  // This timer doesn't keep the service worker alive
  console.log('Doing periodic work');
}, 60000);
```

What Happens When the Worker Terminates

When Chrome terminates your service worker:
- All in-memory variables are lost
- Timers and intervals are cleared
- Open connections may be closed
- The worker is completely unloaded from memory

Factors That Extend Idle Time

Chrome may keep your service worker alive longer when:
- An extension popup is open
- The options page is active
- A message port is open
- There's a pending callback from a Chrome API
- An alarm is about to fire soon

Keepalive Patterns {#keepalive-patterns}

Since service workers terminate when idle, you need strategies to keep them running when necessary.

Using Alarms for Periodic Tasks

The `chrome.alarms` API is the recommended way to schedule periodic tasks:

```javascript
// background.js
chrome.alarms.create('periodicSync', {
  periodInMinutes: 15
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSync') {
    // This will wake up the service worker
    performSync();
  }
});
```

Alarms are reliable because:
- Chrome keeps the service worker alive until the alarm fires
- They work even if the worker was terminated
- They're the official MV3-approved mechanism for scheduling

Using Long-Running Tasks

For tasks that take longer than 30 seconds, structure your code to handle interruptions:

```javascript
chrome.alarms.create('longTask', { delayInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'longTask') {
    // Break long tasks into chunks
    const state = await getTaskState() || { progress: 0 };
    
    // Process a chunk
    await processChunk(state.progress);
    
    // Schedule the next chunk if needed
    if (hasMoreWork()) {
      chrome.alarms.create('longTask', { delayInMinutes: 1 });
    }
  }
});
```

Message Keepalive

You can use message passing to keep the worker alive temporarily:

```javascript
// From a content script or popup
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'keepalive' });
}, 20000);

// In the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'keepalive') {
    // This doesn't actually prevent termination
    // Chrome doesn't keep workers alive for message handling
  }
});
```

Simply sending messages doesn't reliably keep the worker alive. Use alarms for guaranteed wake-ups.

Offscreen Documents {#offscreen-documents}

Offscreen documents are a powerful feature for handling tasks that require a DOM or longer execution times. They provide a hidden page that can run JavaScript independently of the service worker.

When to Use Offscreen Documents

- Long-running computations
- Operations that need DOM access
- Audio processing
- Complex animations
- Tasks that exceed the service worker's lifetime

Creating an Offscreen Document

```javascript
// In your service worker
async function createOffscreen() {
  const contexts = await chrome.contextMenus.getAll();
  
  // Check if already exists
  const existing = await chrome.offscreen.hasDocument();
  if (existing) return;
  
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_PARSER', 'WEB_RTC'],
    justification: 'Parsing large HTML documents for content extraction'
  });
}
```

Communication with Offscreen Documents

```javascript
// Service worker to offscreen
async function sendToOffscreen(message) {
  const ports = await chrome.runtime.connectConnect({ name: 'offscreen' });
  ports.postMessage(message);
}

// In offscreen.html
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message);
});
```

When Offscreen Documents Close

Offscreen documents can be closed by Chrome when:
- The extension hasn't used them for a while
- Memory pressure requires cleanup
- The user manually closes them

Always design for the possibility that the offscreen document will be recreated.

State Persistence Between Wake-ups {#state-persistence}

Since your service worker loses all in-memory state when terminated, you must persist critical data.

Using chrome.storage

The recommended approach is using `chrome.storage`:

```javascript
// background.js
let cachedData = null;

// Load state when worker wakes up
async function loadState() {
  const result = await chrome.storage.local.get(['userData', 'settings']);
  cachedData = {
    userData: result.userData || {},
    settings: result.settings || getDefaultSettings()
  };
}

// Save state when it changes
async function saveState() {
  await chrome.storage.local.set({
    userData: cachedData.userData,
    settings: cachedData.settings
  });
}

// Load state when the worker starts
chrome.runtime.onInstalled.addListener(() => {
  loadState();
});

// Also load on every wake-up using the startup event
chrome.runtime.onStartup.addListener(() => {
  loadState();
});
```

The onStartup Event

The `onStartup` event fires when a profile starts, including when Chrome launches after being closed. This is different from `onInstalled`, it fires every time Chrome starts with your extension enabled.

```javascript
chrome.runtime.onStartup.addListener(() => {
  // This runs when Chrome starts, even if the extension was already installed
  loadState();
  initializeBackgroundTasks();
});
```

Using IndexedDB for Complex Data

For complex data structures, IndexedDB is more suitable:

```javascript
// background.js
const DB_NAME = 'ExtensionDB';
const DB_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'id' });
      }
    };
  });
}

async function getCachedData(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('cache', 'readonly');
    const store = transaction.objectStore('cache');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}
```

Best Practices for State Management

1. Always load state on wake-up: Don't assume state persists between invocations
2. Use transactional storage: Group related state changes
3. Handle storage errors gracefully: Storage can fail due to quota or corruption
4. Minimize storage operations: Batch writes when possible
5. Consider encryption: For sensitive data, use chrome.storage.encrypted or your own encryption

Summary {#summary}

The Chrome extension service worker lifecycle in Manifest V3 requires a different mindset than the persistent background pages of MV2:

- Installation is for one-time setup and initialization
- Activation is for cleanup and migration tasks
- Idle timeout (~30 seconds) means you can't rely on in-memory state
- Keepalive patterns using alarms are essential for background tasks
- Offscreen documents handle DOM-dependent or long-running operations
- State persistence via storage APIs is mandatory for any data that must survive termination

By understanding and properly handling each phase of the lifecycle, you can build Chrome extensions that are reliable, efficient, and maintainable despite the ephemeral nature of service workers.
