# MV3 Service Worker Tips

This guide covers practical tips for building robust Chrome Extension service workers using Manifest V3.

## 1. Register All Listeners Synchronously at Top Level

Service workers can terminate unexpectedly. All event listeners must be registered at the top level of your script, not inside async functions.

```javascript
// ✅ CORRECT - Listeners at top level
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_DATA') {
    fetchData().then(sendResponse);
    return true; // Keep channel open for async response
  }
});

chrome.alarms.create('periodicSync', { periodInMinutes: 15 });

// ❌ WRONG - Listeners inside functions may not register
async function init() {
  chrome.runtime.onInstalled.addListener(() => {}); // Too late!
}
```

## 2. Use chrome.storage Instead of Global Variables

Service workers terminate frequently. Global variables are lost on restart. Use `chrome.storage` for persistence.

```javascript
// Using @theluckystrike/webext-storage for cleaner API
import { Storage } from '@theluckystrike/webext-storage';

const storage = new Storage();

// Set data
await storage.set('settings', { theme: 'dark', notifications: true });

// Get data (with defaults)
const { theme, notifications } = await storage.get('settings', {
  theme: 'light',
  notifications: false
});

// Listen for changes from other contexts
storage.onChanged.addListener((changes, area) => {
  if (changes.settings?.newValue) {
    console.log('Settings updated:', changes.settings.newValue);
  }
});
```

## 3. Use chrome.alarms Instead of setInterval

`setInterval` and `setTimeout` don't work reliably in service workers. Use `chrome.alarms` instead.

```javascript
// Create a recurring alarm
chrome.alarms.create('dailyCleanup', {
  delayInMinutes: 60,
  periodInMinutes: 60 * 24 // Every 24 hours
});

chrome.alarms.create('quickTask', {
  delayInMinutes: 5
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyCleanup') {
    performCleanup();
  } else if (alarm.name === 'quickTask') {
    handleQuickTask();
  }
});

// Check existing alarms
chrome.alarms.get('dailyCleanup', (alarm) => {
  if (alarm) {
    console.log(`Next cleanup: ${new Date(alarm.scheduledTime)}`);
  }
});
```

## 4. Handle SW Restart in onStartup

The service worker restarts on browser launch or after termination. Use `onStartup` to re-initialize state.

```javascript
chrome.runtime.onStartup.addListener(async () => {
  console.log('Service worker starting');

  // Re-initialize alarms
  chrome.alarms.create('periodicSync', { periodInMinutes: 15 });

  // Restore state from storage
  const storage = new Storage();
  const state = await storage.get('appState');

  if (state?.lastSync) {
    // Check if sync is needed
    const hoursSinceSync = (Date.now() - state.lastSync) / (1000 * 60 * 60);
    if (hoursSinceSync > 24) {
      performSync();
    }
  }

  // Re-register for events if needed
  registerEventHandlers();
});
```

## 5. Use Offscreen Documents for DOM APIs

Service workers cannot access DOM. Use offscreen documents for APIs that require a document context.

```javascript
// Create offscreen document
async function createOffscreen() {
  const exists = await chrome.offscreen.hasDocument();
  if (!exists) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER', 'WORKER'], // Required reasons
      justification: 'Parse HTML content'
    });
  }
}

// Use in your service worker
async function parseHTML(htmlString) {
  await createOffscreen();

  chrome.runtime.sendMessage({
    type: 'PARSE_HTML',
    html: htmlString
  }, (response) => {
    console.log('Parsed result:', response.result);
  });
}

// Close when done
async function closeOffscreen() {
  const exists = await chrome.offscreen.hasDocument();
  if (exists) {
    await chrome.offscreen.closeDocument();
  }
}
```

## 6. Keep SW Alive During Long Operations

Use `chrome.runtime.getContexts` to extend the service worker during long-running tasks.

```javascript
// Extend service worker life
async function keepAlive() {
  const contextTypes = [chrome.runtime.ContextType.SERVICE_WORKER];
  const contexts = await chrome.runtime.getContexts(contextTypes);

  if (contexts.length > 0) {
    const serviceWorker = contexts[0];
    // Keep alive for up to 30 more seconds
    serviceWorker.runtimeChannel?.postMessage({
      type: 'KEEP_ALIVE'
    });
  }
}

// Handle long operations with heartbeat
async function fetchLargeDataset() {
  const chunks = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunk = await fetchChunk(i);
    chunks.push(chunk);

    // Keep SW alive between chunks
    await keepAlive();
  }

  return chunks;
}
```

## 7. Debug Service Workers

Use Chrome DevTools to inspect and debug your service worker.

```javascript
// Add debug logging
const DEBUG = true;

function debug(...args) {
  if (DEBUG) {
    console.log('[SW Debug]', new Date().toISOString(), ...args);
  }
}

// Debug tips:
// 1. Open chrome://extensions
// 2. Enable "Developer mode" (top right)
// 3. Find your extension and click "service worker" link
// 4. Use Console for logging
// 5. Use "Preserve log" to see logs across restarts
// 6. Use "Background services" > "Background sync" for debugging
```

## 8. Import Modules

Use ES modules or importScripts for code organization.

```javascript
// In manifest.json, add "type": "module"
// Then use ES modules:
import { Storage } from './utils/storage.js';
import { fetchData } from './utils/api.js';

// Or use importScripts for traditional approach:
// service-worker.js
importScripts('utils/logger.js', 'utils/storage.js');

// Logger is now available globally
logger.info('Service worker started');
```

## 9. Use fetch() Instead of XMLHttpRequest

```javascript
// ✅ Use fetch
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// ❌ Don't use XMLHttpRequest - deprecated in MV3
const xhr = new XMLHttpRequest();
xhr.open('GET', url);
```

## 10. No window/document/localStorage in Service Workers

Service workers have no access to DOM or `localStorage`.

```javascript
// ❌ These will fail in service worker
// window.document.body  // Error!
// localStorage.getItem() // Error!

// ✅ Use chrome.storage instead
const storage = new Storage();
await storage.set('token', 'abc123');
const token = (await storage.get('token')).token;

// ✅ Use chrome.runtime for extension-specific data
chrome.runtime.getManifest();
chrome.runtime.id;
```

## 11. Message Passing That Survives Restarts

Use `@theluckystrike/webext-messaging` for reliable message passing.

```javascript
// In service worker
import { MessageChannel } from '@theluckystrike/webext-messaging';

const channel = new MessageChannel('my-app');

// Send to content script
await channel.send('content-script', {
  type: 'UPDATE_UI',
  data: { status: 'active' }
});

// Listen for messages
channel.onMessage.addListener((message, sender) => {
  console.log('Received:', message);
});

// From content script
channel.sendToServiceWorker({
  type: 'GET_STATE'
});
```

## 12. Test Service Worker Termination

Service workers terminate after ~30 seconds of inactivity. Test this in DevTools.

```javascript
// Test your extension under these conditions:
// 1. Open chrome://extensions
// 2. Click "service worker" link
// 3. In DevTools Console, type:
//    chrome.runtime.reload()
// 4. Watch your extension handle the restart

// Ensure your code handles:
// - Lost in-memory state
// - Interrupted operations
// - Re-initialization on startup

// Add crash recovery
chrome.runtime.onStartup.addListener(async () => {
  // Verify state and recover if needed
  const storage = new Storage();
  const state = await storage.get('crashRecovery');

  if (state?.pendingOperation) {
    // Resume interrupted operation
    await resumeOperation(state.pendingOperation);
  }
});
```

## Summary

| Tip | Key Action |
|-----|------------|
| Listeners at top level | Register before async operations |
| Use chrome.storage | Never rely on global variables |
| Use chrome.alarms | Replace setInterval/setTimeout |
| Handle onStartup | Re-initialize on every restart |
| Offscreen documents | Access DOM APIs properly |
| Keep alive | Use getContexts for long tasks |
| Debug properly | Use chrome://extensions |
| ES modules | Use "type": "module" in manifest |
| Use fetch() | Modern network requests |
| No DOM access | Use storage, not localStorage |
| Message passing | Use webext-messaging package |
| Test termination | Simulate SW restarts in DevTools |

Following these tips ensures your MV3 service worker is reliable, maintainable, and passes Chrome Web Store review.
