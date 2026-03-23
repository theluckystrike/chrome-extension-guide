---
layout: post
title: "Manifest V3 Service Worker Patterns and Anti-Patterns. What Works and What Doesn't"
description: "Essential patterns for Manifest V3 service workers. Learn state management, alarm-based scheduling, message passing, and how to avoid common anti-patterns."
date: 2025-01-30
categories: [guides, manifest-v3]
tags: [manifest-v3, service-worker-patterns, chrome-extensions, background-scripts, state-management]
author: theluckystrike
---

# Manifest V3 Service Worker Patterns and Anti-Patterns

If you've migrated a Chrome extension from Manifest V2 to V3, you've likely encountered the service worker, the replacement for background pages. While service workers bring improved memory management and a more modern architecture, they also introduce a fundamentally different execution model that can break assumptions developers made about background scripts.

The biggest shift? Service workers terminate after periods of inactivity. This single fact ripples through every aspect of how you architect your extension. we'll explore the patterns that work well with MV3 service workers and the anti-patterns that cause silent failures, memory leaks, and frustrated users.

Understanding the Service Worker Lifecycle

Before diving into patterns, it's essential to understand [how service workers behave](/guides/manifest-v3/service-worker-lifecycle). Unlike the persistent background pages of V2, MV3 service workers are event-driven and short-lived. Chrome terminates them after about 30 seconds of inactivity, though this can vary based on system conditions and extension activity.

This termination isn't a bug, it's a feature designed to reduce resource consumption. But it means your service worker must be stateless by default, able to handle events without relying on in-memory state from previous executions.

Pattern: Alarm-Based Periodic Tasks

The most common scheduling need in extensions is running code periodically, checking for updates, syncing data, or performing maintenance tasks. In Manifest V2, developers often used `setInterval` in the background page. This approach fails completely in MV3.

The solution is the [`chrome.alarms`](https://developer.chrome.com/docs/extensions/reference/api/alarms) API. Alarms persist across service worker terminations and will wake your worker when they fire.

```javascript
// Setting up a periodic alarm
chrome.alarms.create('syncData', {
  periodInMinutes: 15  // Minimum is 1 minute
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    handleSync();
  }
});
```

A few critical considerations:

1. Minimum interval is 1 minute. You cannot set a faster periodic alarm. If you need sub-minute precision, consider using [chrome.idle](https://developer.chrome.com/docs/extensions/reference/api/idle) detection combined with alarms.

2. Alarms survive termination. When the service worker wakes from an alarm, it starts fresh. This is good for reliability but means you cannot cache expensive data between alarm fires.

3. Use unique alarm names. Creating multiple alarms with the same name updates the existing alarm rather than creating duplicates.

For more details on migrating from V2's `setInterval`, see our [Manifest V3 Migration Guide](/guides/manifest-v3/migration-guide).

Pattern: State Hydration from Storage

Since your service worker starts fresh on each invocation, you cannot maintain runtime state in global variables. Instead, you must hydrate state from persistent storage when needed.

```javascript
// BAD: Global variable (will be lost on termination)
let cachedData = null;

// GOOD: Hydrate from storage on each execution
async function getData() {
  const result = await chrome.storage.local.get('cachedData');
  return result.cachedData;
}
```

The pattern involves reading from storage at the start of event handlers that need state:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    // Hydrate state from storage
    chrome.storage.local.get(['userData', 'settings']).then((result) => {
      sendResponse({ 
        userData: result.userData, 
        settings: result.settings 
      });
    });
    return true; // Indicates async response
  }
});
```

Key considerations for state management:

1. Storage is asynchronous. Always use the Promise-based API and account for async behavior in your event handlers.

2. Minimize storage reads. If you need multiple pieces of state, read them in a single call rather than multiple sequential reads.

3. Consider what needs persistence. Not everything needs to be stored, ephemeral data that can be reconstructed doesn't need storage overhead.

For a detailed look on managing memory effectively, see our [Memory Management Guide](/guides/manifest-v3/memory-management).

Pattern: Message-Driven Architecture

Extensions are fundamentally message-driven systems. With service workers, this pattern becomes even more critical since there's no persistent execution context.

```javascript
// Service worker: Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'fetchData':
      handleFetchData(message.payload).then(sendResponse);
      return true; // Keep message channel open for async response
    
    case 'updateState':
      return handleUpdateState(message.payload);
  }
});

// Content script: Send messages
chrome.runtime.sendMessage({ 
  action: 'fetchData', 
  payload: { url: 'https://api.example.com/data' }
}).then(response => {
  console.log('Data received:', response.data);
});
```

The `return true` pattern is crucial for async message handling. Without it, Chrome closes the message channel before your async operation completes.

For communication between different extension contexts, consider using [Message Passing](/guides/manifest-v3/message-passing) patterns:

- Short-lived tasks: Use `chrome.runtime.sendMessage` for one-off requests
- Long-lived connections: Use `chrome.runtime.connect` for persistent channels
- Tab-specific communication: Use `chrome.tabs.sendMessage` with tab IDs

Pattern: Offscreen Document for DOM Access

One of the biggest limitations of service workers is lack of DOM access. If you need to work with the DOM, URLs, or perform operations requiring a window context, you'll need an offscreen document.

```javascript
// Create an offscreen document
async function createOffscreen() {
  const existingContexts = await chrome.contextMenus.getTargetInfos(
    // This is just to check, real implementation varies
  );
  
  // Check if offscreen document already exists
  const hasOffscreen = await chrome.offscreen.hasDocument();
  
  if (!hasOffscreen) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_SCRAPING', 'BLOBS'],
      justification: 'Need DOM access to parse page content'
    });
  }
}
```

The offscreen document is a hidden page that can access the DOM. Use it for:

1. DOM scraping: When you need to parse page content beyond what content scripts can access
2. Complex URL processing: Parsing URLs, handling redirects
3. File operations: Working with Blobs and FileReader
4. PDF generation: Any task requiring window.print() or similar

Remember that offscreen documents have their own lifecycle, they can be closed by Chrome under memory pressure. Always check if the document exists before sending messages to it.

Anti-Pattern: Global Variables for State

This is the most common mistake developers make when migrating from V2:

```javascript
// ANTI-PATTERN: Global variables will be lost
let userProfile = null;
let settings = {};

function initialize() {
  // This runs once when the worker loads
  loadFromStorage().then(data => {
    userProfile = data.profile;
    settings = data.settings;
  });
}

// Later...
function getUser() {
  return userProfile; // Will be null most of the time!
}
```

This fails because:
1. The service worker may terminate between `initialize()` and `getUser()`
2. Even if it doesn't terminate, Chrome may terminate workers arbitrarily
3. The worker is shared across all extension contexts, no guarantee of initialization order

Always use storage or retrieve state on demand.

Anti-Pattern: setTimeout for Scheduling

```javascript
// ANTI-PATTERN: setTimeout will not fire reliably
setTimeout(() => {
  syncData();
}, 60000); // 1 minute

// This timer is lost when the service worker terminates
```

The `setTimeout` and `setInterval` functions do not persist across service worker termination. Even if the timer fires while the worker is alive, there's no guarantee the worker will still be running when the callback executes.

Use `chrome.alarms` instead, as demonstrated in the alarm-based pattern above.

Anti-Pattern: Synchronous Storage Access

```javascript
// ANTI-PATTERN: Using deprecated synchronous storage
const data = localStorage.getItem('key'); // Doesn't work in service workers
const syncData = chrome.storage.sync.getSync('key'); // getSync doesn't exist!
```

The synchronous storage APIs from Manifest V2 are not available in service workers. You must use the asynchronous Promise-based API:

```javascript
// CORRECT: Async storage access
async function getData() {
  const result = await chrome.storage.local.get('key');
  return result.key;
}
```

For more information on storage options, see the [chrome.storage](https://developer.chrome.com/docs/extensions/reference/api/storage) documentation.

Advanced Pattern: Service Worker Lifecycle Management

Understanding and managing the service worker lifecycle is crucial for building solid extensions. Here are advanced patterns:

Keeping the Service Worker Alive

For operations that take longer than the typical 30-second timeout, you can keep the worker active:

```javascript
// Use chrome.runtime.onKeepAlive to extend worker lifetime
chrome.runtime.onKeepAlive.addListener((details) => {
  if (details.reason === 'pending_connection') {
    console.log('Keeping service worker alive for pending connection');
    // Return true to keep the worker alive
    return true;
  }
});
```

Monitoring Service Worker State

Track when your service worker starts and stops:

```javascript
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker starting - initialize state here');
  initializeExtension();
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker is being suspended - save state');
  // Quick cleanup before termination
  saveStateToStorage();
});

// Note: onSuspend is not always reliable, don't rely on it for critical operations
```

Heartbeat Pattern for Long-Running Tasks

For operations that need to complete even if they take time:

```javascript
class HeartbeatManager {
  private intervalId: number | null = null;
  private readonly HEARTBEAT_INTERVAL = 25000; // Send heartbeat every 25 seconds

  startHeartbeat(operationId: string) {
    this.intervalId = setInterval(() => {
      // Update operation status in storage
      chrome.storage.local.set({
        [`operation_${operationId}`]: {
          lastHeartbeat: Date.now(),
          status: 'in_progress'
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  stopHeartbeat() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

Error Handling Best Practices

Service workers need solid error handling since they can terminate unexpectedly:

```javascript
// Global error handler
self.onerror = (event) => {
  console.error('Service worker error:', event.error);
  
  // Log to error tracking service
  logErrorToService({
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    stack: event.error?.stack,
    timestamp: Date.now()
  });
  
  return false; // Don't prevent default error handling
};

// Handle unhandled promise rejections
self.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Store for later analysis
  chrome.storage.local.set({
    pendingErrors: event.reason
  }).catch(() => {
    // Storage might be unavailable
    console.error('Failed to store error:', event.reason);
  });
};
```

Retry Pattern for Network Requests

Implement exponential backoff for failed requests:

```javascript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok && attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

Testing Service Worker Patterns

Testing service workers requires special consideration:

```javascript
// Jest test example for service worker handlers
describe('Service Worker Alarm Handler', () => {
  beforeEach(() => {
    // Mock chrome APIs
    global.chrome = {
      alarms: {
        create: jest.fn(),
        onAlarm: {
          addListener: jest.fn()
        }
      },
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined)
        }
      }
    };
  });

  test('should create alarm on install', () => {
    // Simulate install event
    const createFn = chrome.alarms.create;
    expect(createFn).toHaveBeenCalledWith('syncData', {
      periodInMinutes: 15
    });
  });

  test('should handle alarm and sync data', async () => {
    const alarmHandler = chrome.alarms.onAlarm.addListener.mock.calls[0][0];
    
    // Trigger the alarm
    await alarmHandler({ name: 'syncData' });
    
    // Verify storage was called
    expect(chrome.storage.local.get).toHaveBeenCalled();
  });
});
```

Integration Testing with Puppeteer

Test the full extension lifecycle:

```javascript
// puppeteer.test.ts
import { test, expect } from '@playwright/test';

test('service worker handles alarm correctly', async ({ extension }) => {
  // Load the extension
  const backgroundPage = await extension.background();
  
  // Wait for service worker to initialize
  await backgroundPage.waitForFunction(() => {
    return window.serviceWorkerReady === true;
  });
  
  // Trigger an alarm
  await backgroundPage.evaluate(() => {
    chrome.alarms.create('testAlarm', { delayInMinutes: 0.01 });
  });
  
  // Wait for alarm to fire
  await backgroundPage.waitForEvent('console-message', 
    msg => msg.text() === 'Alarm fired: testAlarm'
  );
});
```

Security Considerations

Content Security Policy in MV3

Service workers have strict CSP requirements:

```javascript
// In manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

Avoid eval and inline scripts

```javascript
// BAD: Using eval
const data = eval(userInput); // Never do this

// GOOD: Use JSON.parse with try-catch
let data;
try {
  data = JSON.parse(userInput);
} catch (e) {
  console.error('Invalid JSON:', e);
  data = null;
}
```

Sanitize Data from Content Scripts

Always validate and sanitize data received from content scripts:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender
  if (!sender.tab) {
    sendResponse({ error: 'Invalid sender' });
    return false;
  }
  
  // Validate message structure
  if (typeof message.data !== 'object' || !message.data.id) {
    sendResponse({ error: 'Invalid message format' });
    return false;
  }
  
  // Sanitize data
  const sanitized = {
    id: Number(message.data.id),
    name: String(message.data.name).slice(0, 100), // Limit length
    // ... validate and sanitize all fields
  };
  
  // Process sanitized data
  processData(sanitized);
  sendResponse({ success: true });
  
  return true;
});
```

Performance Optimization

Lazy Loading of Expensive Modules

Load heavy modules only when needed:

```javascript
// Service worker entry point
import { initializeCore } from './core';

// Don't load heavy modules at startup
let expensiveModule = null;

async function getExpensiveModule() {
  if (!expensiveModule) {
    // Dynamic import - only loads when first needed
    const module = await import('./expensive-module.js');
    expensiveModule = module;
  }
  return expensiveModule;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'heavyOperation') {
    getExpensiveModule().then(module => {
      module.process(message.data).then(sendResponse);
    });
    return true;
  }
});
```

Use IndexedDB for Large Data

For large datasets, use IndexedDB instead of chrome.storage:

```javascript
import { openDB } from 'idb';

const DB_NAME = 'ExtensionDB';
const STORE_NAME = 'cachedData';

async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    }
  });
}

async function cacheData(key: string, data: any) {
  const db = await initDB();
  await db.put(STORE_NAME, { id: key, data, timestamp: Date.now() });
}

async function getCachedData(key: string) {
  const db = await initDB();
  const result = await db.get(STORE_NAME, key);
  return result?.data;
}
```

Case Study: Tab Suspender Pro Migration

Let's look at a real-world migration scenario. [Tab Suspender Pro](https://chrome.google.com/webstore/detail/tab-suspender-pro/) is an extension that automatically suspends inactive tabs to save memory. The migration from V2 to V3 required significant architectural changes.

The V2 Architecture

In Manifest V2, the extension used a persistent background page with:
- Global arrays tracking tab states
- `setInterval` checking tab activity every 30 seconds
- Direct DOM access for measuring tab resource usage

The V3 Challenges

1. Tab tracking: Could not maintain tab arrays in memory
2. Periodic checks: `setInterval` replaced by `chrome.alarms`
3. Resource measurement: Required offscreen documents for DOM operations

The Solution

```javascript
// V3 Service Worker Implementation

// Store tab state in chrome.storage
const TAB_STORAGE_KEY = 'suspendedTabs';

async function updateTabState(tabId, state) {
  const result = await chrome.storage.local.get(TAB_STORAGE_KEY);
  const tabs = result[TAB_STORAGE_KEY] || {};
  tabs[tabId] = { ...tabs[tabId], ...state, lastUpdated: Date.now() };
  await chrome.storage.local.set({ [TAB_STORAGE_KEY]: tabs });
}

// Use alarms for periodic checking
chrome.alarms.create('checkInactiveTabs', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkInactiveTabs') {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      // Check idle time and update storage
      const idleState = await chrome.idle.queryState(60);
      if (idleState === 'idle') {
        await updateTabState(tab.id, { status: 'idle' });
      }
    }
  }
});
```

The migration required rethinking every assumption about state persistence, but the result was more solid and memory-efficient.

Testing Service Worker Resilience

Testing MV3 service workers requires simulating the termination and restart behavior that occurs in production. Chrome provides tools to help:

1. Use Chrome's built-in testing: Visit `chrome://extensions` and enable "Developer mode", then use the "Service worker" link to inspect and manually terminate workers.

2. Write integration tests: Test your extension's behavior after service worker termination:
   ```javascript
   // Simulate termination by reloading the extension
   async function testAfterTermination() {
     // Trigger some action
     await chrome.runtime.sendMessage({ action: 'doSomething' });
     
     // Simulate termination (in tests)
     await chrome.test.sendMessage('terminate-sw');
     
     // Verify state persists
     const result = await chrome.storage.local.get('expectedKey');
     expect(result.expectedKey).toBeDefined();
   }
   ```

3. Test alarm behavior: Verify alarms fire correctly even after extension restart.

Debugging Terminated Workers

When things go wrong, debugging service workers can be challenging. Here are techniques that help:

1. Use chrome.runtime.lastError: Always check this in callbacks:
   ```javascript
   chrome.storage.local.get('key').catch((error) => {
     console.error('Storage error:', error);
   });
   ```

2. Check the service worker console: The DevTools view for service workers shows logs from the worker, but it disconnects when the worker terminates.

3. Use persistent logging: Write logs to storage or send them to a content script that logs to the page console:
   ```javascript
   function debugLog(message) {
     const timestamp = new Date().toISOString();
     chrome.storage.local.get('debugLogs').then((result) => {
       const logs = result.debugLogs || [];
       logs.push({ timestamp, message });
       // Keep only last 100 logs
       chrome.storage.local.set({ 
         debugLogs: logs.slice(-100) 
       });
     });
   }
   ```

4. Monitor worker lifecycle: Listen for lifecycle events:
   ```javascript
   chrome.runtime.onStartup.addListener(() => {
     console.log('Extension started');
   });
   
   chrome.runtime.onInstalled.addListener(() => {
     console.log('Extension installed/updated');
   });
   ```

Advanced Pattern: Service Worker Keep-Alive

For extensions that need to maintain state or connections, implementing a keep-alive mechanism can help:

```javascript
// Keep-alive using periodic alarms
chrome.alarms.create('keepAlive', { periodInMinutes: 0.8 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Perform minimal operation to keep worker alive
    chrome.storage.local.get(null).catch(() => {});
  }
});
```

However, use this sparingly. Chrome may still terminate workers under memory pressure, and excessive keep-alive defeats the purpose of the service worker architecture.

Common Pitfalls and How to Avoid Them

Pitfall 1: Not Handling Async Operations Properly

```javascript
// PROBLEM: Not returning true for async operations
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => sendResponse(data));
  // Missing return true!
});
```

```javascript
// SOLUTION: Always return true for async responses
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => sendResponse(data));
  return true; // Keeps the message channel open
});
```

Pitfall 2: Memory Leaks from Event Listeners

```javascript
// PROBLEM: Adding listeners without cleanup
function init() {
  chrome.storage.onChanged.addListener(handleStorageChange);
  chrome.alarms.onAlarm.addListener(handleAlarm);
  // These persist across worker restarts but can accumulate
}

// SOLUTION: Use persistent listener management
const LISTENERS = new Map();

function addListener(name, type, handler) {
  if (!LISTENERS.has(name)) {
    if (type === 'storage') {
      chrome.storage.onChanged.addListener(handler);
    } else if (type === 'alarm') {
      chrome.alarms.onAlarm.addListener(handler);
    }
    LISTENERS.set(name, { type, handler });
  }
}
```

Pitfall 3: Race Conditions in Storage Operations

```javascript
// PROBLEM: Multiple async operations without coordination
async function updateUser(user) {
  const current = await chrome.storage.local.get('user');
  const updated = { ...current.user, ...user };
  await chrome.storage.local.set({ user: updated });
}

// Multiple calls can cause race conditions
updateUser({ name: 'Alice' });
updateUser({ age: 30 }); // May overwrite name!

// SOLUTION: Use a queue or storage transactions
class StorageQueue {
  constructor() {
    this.queue = Promise.resolve();
  }
  
  async updateUser(updates) {
    return new Promise((resolve) => {
      this.queue = this.queue.then(async () => {
        const current = await chrome.storage.local.get('user');
        const updated = { ...current.user, ...updates };
        await chrome.storage.local.set({ user: updated });
        resolve(updated);
      });
    });
  }
}

const storage = new StorageQueue();
```

Conclusion

Manifest V3 service workers require a different mental model than Manifest V2 background pages. The key insight is that your service worker will terminate. By designing for this reality, using storage for state, alarms for scheduling, and message passing for communication, you can build solid extensions that work reliably.

Remember:
- Use `chrome.alarms` for scheduling, never `setTimeout`
- Hydrate state from storage on each execution
- Build message-driven architectures
- Use offscreen documents for DOM operations
- Test termination behavior explicitly

For more information on extending your knowledge, explore our [service worker lifecycle](/guides/manifest-v3/service-worker-lifecycle) and [migration guide](/guides/manifest-v3/migration-guide).

---

Error Handling and Resilience Patterns {#error-handling}

Building solid extensions requires comprehensive error handling at every layer.

Global Error Listeners

Set up error handling in your service worker to catch unhandled exceptions:

```javascript
// Service worker error handling
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
  
  // Log to error tracking service
  logErrorToService({
    type: 'unhandled_rejection',
    reason: event.reason,
    timestamp: Date.now()
  });
});

self.addEventListener('error', (event) => {
  console.error('[SW] Uncaught error:', event.error);
  
  logErrorToService({
    type: 'uncaught_error',
    message: event.message,
    stack: event.error?.stack,
    timestamp: Date.now()
  });
});
```

Retry Logic with Exponential Backoff

Implement resilient network requests that handle transient failures:

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      console.warn(`Fetch attempt ${attempt + 1} failed:`, error.message);
      
      // Exponential backoff: wait 1s, 2s, 4s...
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}
```

Circuit Breaker Pattern

Prevent cascading failures by implementing a circuit breaker:

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.warn('Circuit breaker opened due to failures');
    }
  }
}
```

---

Debugging Service Worker Issues {#debugging}

Effective debugging requires understanding the service worker lifecycle and Chrome's DevTools.

Viewing Service Worker Logs

1. Open Chrome DevTools (F12)
2. Navigate to the Service Worker panel in Application tab
3. Check the Console for service worker logs
4. Use the Update and Push buttons to trigger service worker events

Force Service Worker Termination

Test how your extension handles service worker restarts:

1. Go to `chrome://extensions`
2. Enable Developer mode
3. Find your extension
4. Click the service worker link
5. Click stop in DevTools

This lets you verify that:
- State is properly persisted to storage
- Alarms are correctly scheduled
- Message listeners are re-registered on wake

Inspecting Storage

Use Chrome DevTools to inspect extension storage:

1. Open DevTools on any page
2. Go to Application → Storage → Extension Storage
3. View `chrome.storage.local` and `chrome.storage.sync`
4. Edit values directly for testing

---

*Built by theluckystrike at [zovo.one](https://zovo.one)*
