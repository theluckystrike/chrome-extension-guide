---
layout: default
title: "Chrome Extension Debugging Techniques. Developer Guide"
description: "Master Chrome extension debugging and testing with this guide covering tools, techniques, and common issues."
canonical_url: "https://bestchromeextensions.com/guides/advanced-debugging/"
---
# Advanced Debugging Techniques for Chrome Extensions

Debugging Chrome extensions is fundamentally different from debugging regular web applications. Your code runs across multiple isolated contexts -- service workers, content scripts, popups, options pages, and side panels -- each with its own DevTools instance and lifecycle. This guide goes beyond the basics to cover the techniques and tools that experienced extension developers rely on daily.

Table of Contents {#table-of-contents}

- [Debugging Service Workers](#debugging-service-workers)
- [Debugging Content Scripts](#debugging-content-scripts)
- [Debugging Popup and Side Panel](#debugging-popup-and-side-panel)
- [chrome://extensions Debug Tools](#chromeextensions-debug-tools)
- [Network Debugging](#network-debugging)
- [Storage Debugging](#storage-debugging)
- [Message Passing Debugging](#message-passing-debugging)
- [Memory Leak Detection](#memory-leak-detection)
- [Performance Profiling](#performance-profiling)
- [Remote Debugging on Android](#remote-debugging-on-android)
- [Common Error Messages Decoded](#common-error-messages-decoded)
- [Building a Debug Mode Toggle](#building-a-debug-mode-toggle)

---

Debugging Service Workers {#debugging-service-workers}

Service workers are the backbone of Manifest V3 extensions, but their lifecycle makes them one of the hardest contexts to debug. They start up on events, can be terminated at any time, and do not have a persistent DevTools connection by default.

chrome://serviceworker-internals {#chromeserviceworker-internals}

Navigate to `chrome://serviceworker-internals` to see every registered service worker in the browser, including your extension's. This page provides information that the standard `chrome://extensions` page does not:

- Registration status -- whether the service worker is installed, activated, or redundant.
- Running status -- whether the worker is currently running or stopped.
- Received events -- a log of events that have been dispatched to the worker.
- Start/stop controls -- you can manually start and stop the worker to test lifecycle behavior.

Use the "Stop" button to simulate the browser terminating your service worker, then trigger an event (like clicking your extension icon) to verify it restarts cleanly.

Lifecycle Event Debugging {#lifecycle-event-debugging}

Service workers go through distinct lifecycle phases. Instrument each one to understand exactly when your code runs:

```javascript
// background.js (service worker)

self.addEventListener('install', (event) => {
  console.log('[SW] Install event fired', {
    timestamp: Date.now(),
    state: self.registration?.active?.state
  });
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event fired', {
    timestamp: Date.now()
  });
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[SW] onStartup fired -- browser just launched');
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SW] onInstalled fired', {
    reason: details.reason,
    previousVersion: details.previousVersion
  });
});
```

Catching Unhandled Errors in Service Workers {#catching-unhandled-errors-in-service-workers}

Service worker errors can silently kill the worker. Add a global error handler early in your service worker script:

```javascript
self.addEventListener('error', (event) => {
  console.error('[SW] Uncaught error:', event.message, event.filename, event.lineno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});
```

Keeping the Service Worker Alive for Debugging {#keeping-the-service-worker-alive-for-debugging}

During development, you may want to prevent the service worker from being terminated so you can inspect state. Use a periodic alarm:

```javascript
// Development only -- do not ship this
if (process.env.NODE_ENV === 'development') {
  chrome.alarms.create('keep-alive-debug', { periodInMinutes: 0.5 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keep-alive-debug') {
      console.log('[SW] Keep-alive ping at', new Date().toISOString());
    }
  });
}
```

---

Debugging Content Scripts {#debugging-content-scripts}

Content scripts run in a special isolated world within the web page's context. They share the page's DOM but have their own JavaScript environment. This creates unique debugging challenges.

Finding Your Content Scripts in DevTools {#finding-your-content-scripts-in-devtools}

Open DevTools on the page where your content script is injected. In the Sources panel, look under the Content scripts tab in the left sidebar. Your extension's content scripts will appear grouped by extension ID. If you do not see this tab, make sure you have the page's DevTools open (not the extension's DevTools).

Source Maps for Content Scripts {#source-maps-for-content-scripts}

If you use a bundler like webpack or Rollup, generate source maps and include them in your extension package:

```javascript
// webpack.config.js
module.exports = {
  devtool: 'cheap-module-source-map',
  // ...
};
```

Then reference the source map in your content script output. Chrome DevTools will automatically pick up inline source maps or source maps referenced via `//# sourceMappingURL=`. This lets you set breakpoints in your original TypeScript or JSX source rather than the bundled output.

Setting Breakpoints {#setting-breakpoints}

There are several ways to set breakpoints in content scripts:

1. Source panel breakpoints -- navigate to your content script file in Sources and click the line number gutter.
2. Conditional breakpoints -- right-click the gutter and add a condition. Useful when your content script runs on many pages but you only want to break on specific ones:
   ```javascript
   // Condition: window.location.hostname === 'example.com'
   ```
3. `debugger` statement -- add `debugger;` directly in your source code. This works reliably in content scripts.
4. DOM breakpoints -- right-click a DOM node in Elements, select "Break on..." to pause when the node is modified. This catches both your content script and the page's own scripts.

Debugging the Isolated World Boundary {#debugging-the-isolated-world-boundary}

Content scripts cannot directly access page JavaScript variables. If you need to inspect the page's JS context while debugging your content script, use the context selector dropdown at the top of the Console panel. Switch between your extension's isolated world and the page's main world.

To pass data across the boundary for debugging:

```javascript
// content-script.js -- post to page context
window.postMessage({
  source: 'my-extension-debug',
  data: { someState: myVariable }
}, '*');

// Injected into page context via chrome.scripting.executeScript with world: 'MAIN'
window.addEventListener('message', (event) => {
  if (event.data?.source === 'my-extension-debug') {
    console.log('[Page Context] Received debug data:', event.data.data);
  }
});
```

---

Debugging Popup and Side Panel {#debugging-popup-and-side-panel}

Popups and side panels are ephemeral UI surfaces. The popup closes when it loses focus, which also closes its DevTools -- making debugging frustrating without the right approach.

Inspecting the Popup {#inspecting-the-popup}

Right-click the extension icon in the toolbar and select "Inspect popup". This opens a dedicated DevTools window for the popup. The popup will stay open as long as DevTools is open, even if it loses focus.

Alternatively, from `chrome://extensions`, click the "Inspect views" link next to your extension. If the popup is open, it will appear as an inspectable view.

Keeping the Popup Open {#keeping-the-popup-open}

When DevTools is attached to the popup, the popup remains open. However, if you need to interact with the page behind the popup while keeping the popup visible, you can detach DevTools into a separate window (click the three dots in DevTools, then select a dock position or "Undock into separate window").

Side Panel Debugging {#side-panel-debugging}

Side panels are more stable than popups because they persist while the user navigates. Open DevTools for the side panel the same way as the popup -- through the "Inspect views" link on `chrome://extensions`, or by right-clicking inside the side panel and selecting "Inspect".

Since side panels remain open during navigation, you can use the Application panel in DevTools to monitor storage changes, service worker status, and more in real time.

Persistent DevTools for Extension Pages {#persistent-devtools-for-extension-pages}

For options pages and other full-tab extension pages (`chrome-extension://YOUR_ID/options.html`), DevTools works exactly like it does for normal web pages. Open with F12 or Cmd+Option+I. These pages persist until the tab is closed, so debugging is straightforward.

---

chrome://extensions Debug Tools {#chromeextensions-debug-tools}

The `chrome://extensions` page in developer mode provides several debugging tools that are easy to overlook.

The Errors Panel {#the-errors-panel}

When your extension throws an error, a red "Errors" button appears on your extension's card. Click it to see a list of errors with:

- The error message and stack trace.
- The context where the error occurred (service worker, content script, popup).
- A timestamp for each error.
- A "Clear all" button to reset the list.

Check this panel regularly during development. Some errors -- like manifest parsing errors or permission denials -- only appear here and not in any DevTools console.

The Update Button {#the-update-button}

Click "Update" to force-reload your unpacked extension. This is equivalent to removing and re-adding it but preserves your extension ID. It triggers the `onInstalled` event with `reason: 'update'`.

Use this instead of manually reloading when you change:

- The manifest.json file.
- Service worker scripts (they do not hot-reload).
- Declarative rules (declarativeNetRequest, declarativeContent).

Service Worker Status Indicator {#service-worker-status-indicator}

The extension card shows whether the service worker is "active", "inactive", or has an error. The "service worker" link opens DevTools for the service worker directly. If the service worker is stopped, clicking this link will start it and attach DevTools.

The "Inspect views" section lists all active views: popups, options pages, side panels, and DevTools pages. Each link opens a DevTools instance for that specific view.

---

Network Debugging {#network-debugging}

Extensions interact with the network in ways that standard web apps do not -- intercepting requests, modifying headers, and dealing with CORS from privileged contexts.

Monitoring Extension Network Requests {#monitoring-extension-network-requests}

Requests made from the service worker (via `fetch`) appear in the service worker's DevTools Network panel. Requests made from content scripts appear in the page's DevTools Network panel. Requests from popups appear in the popup's DevTools.

To see all extension-related network activity in one place, use the `chrome.webRequest` API with logging:

```javascript
// background.js -- log all requests from your extension
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.initiator?.startsWith('chrome-extension://')) {
      console.log('[Network]', details.method, details.url, {
        type: details.type,
        tabId: details.tabId,
        initiator: details.initiator
      });
    }
  },
  { urls: ['<all_urls>'] }
);
```

Debugging CORS Issues {#debugging-cors-issues}

Extensions have a privileged network position. Requests from the service worker with proper `host_permissions` bypass CORS entirely. But content scripts are still subject to CORS when making requests from the page context.

Common CORS debugging patterns:

```javascript
// This works from the service worker (with host_permissions)
const response = await fetch('https://api.example.com/data');

// This fails from a content script due to CORS
// Move the fetch to the service worker and use message passing
chrome.runtime.sendMessage({ action: 'fetch', url: 'https://api.example.com/data' },
  (response) => {
    console.log('Data from background:', response);
  }
);
```

Debugging declarativeNetRequest Rules {#debugging-declarativenetrequest-rules}

Use `chrome.declarativeNetRequest.getMatchedRules()` to see which rules have been applied:

```javascript
// Check matched rules for a specific tab
chrome.declarativeNetRequest.getMatchedRules({ tabId: tabId }, (result) => {
  console.log('Matched rules:', result.rulesMatchedInfo);
});
```

Enable the "Matched Rules" tab in DevTools (under the Network panel) to see which declarativeNetRequest rules affected each request.

---

Storage Debugging {#storage-debugging}

Chrome extensions use `chrome.storage` rather than `localStorage` or `IndexedDB` for most persisted state. Debugging storage issues requires different tools.

chrome.storage Viewer {#chromestorage-viewer}

In the service worker's DevTools, open the Application panel. Under the Storage section, look for Extension Storage. This viewer shows the contents of `chrome.storage.local` and `chrome.storage.sync`.

You can also query storage directly from the console:

```javascript
// In the service worker or popup console
chrome.storage.local.get(null, (items) => {
  console.log('All local storage:', JSON.stringify(items, null, 2));
});

chrome.storage.sync.get(null, (items) => {
  console.log('All sync storage:', JSON.stringify(items, null, 2));
});

chrome.storage.session.get(null, (items) => {
  console.log('All session storage:', JSON.stringify(items, null, 2));
});
```

Understanding Storage Types {#understanding-storage-types}

Each storage area has different characteristics that affect debugging:

| Storage Area | Persistence | Shared Across Devices | Quota | Survives SW Restart |
|---|---|---|---|---|
| `local` | Permanent | No | 10 MB | Yes |
| `sync` | Permanent | Yes (with Chrome sign-in) | 100 KB total | Yes |
| `session` | Until browser closes | No | 10 MB | Yes (within session) |
| `managed` | Set by enterprise policy | N/A | Read-only | Yes |

Monitoring Storage Changes {#monitoring-storage-changes}

Set up a storage change listener to log all modifications:

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`[Storage] ${areaName}.${key} changed:`,
      '\n  Old:', JSON.stringify(oldValue),
      '\n  New:', JSON.stringify(newValue)
    );
  }
});
```

Debugging Storage Quota Issues {#debugging-storage-quota-issues}

When you approach storage limits, writes will fail silently or throw errors. Monitor your usage:

```javascript
chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
  const quota = chrome.storage.local.QUOTA_BYTES; // 10485760
  console.log(`[Storage] Using ${bytesInUse} of ${quota} bytes (${(bytesInUse / quota * 100).toFixed(1)}%)`);
});
```

---

Message Passing Debugging {#message-passing-debugging}

Message passing between contexts is one of the most error-prone areas of extension development. Messages can be lost, handlers can be called multiple times, and ports can disconnect unexpectedly.

Logging Middleware Pattern {#logging-middleware-pattern}

Wrap your message handlers with a logging middleware to trace every message through the system:

```javascript
// debug-middleware.js -- import in each context

function createDebugMiddleware(contextName) {
  return {
    wrapOnMessage(handler) {
      return (message, sender, sendResponse) => {
        const id = Math.random().toString(36).substring(2, 8);
        console.log(`[${contextName}] MSG-${id} received:`, {
          message,
          sender: sender.tab ? `tab:${sender.tab.id}` : sender.id,
          timestamp: Date.now()
        });

        const wrappedSendResponse = (response) => {
          console.log(`[${contextName}] MSG-${id} responding:`, response);
          sendResponse(response);
        };

        const result = handler(message, sender, wrappedSendResponse);

        if (result === true) {
          console.log(`[${contextName}] MSG-${id} handler will respond async`);
        }

        return result;
      };
    },

    wrapSendMessage(target, message) {
      const id = Math.random().toString(36).substring(2, 8);
      console.log(`[${contextName}] MSG-${id} sending:`, { target, message });

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error(`[${contextName}] MSG-${id} error:`, chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log(`[${contextName}] MSG-${id} response:`, response);
            resolve(response);
          }
        });
      });
    }
  };
}

// Usage in background.js
const debug = createDebugMiddleware('background');

chrome.runtime.onMessage.addListener(
  debug.wrapOnMessage((message, sender, sendResponse) => {
    // Your actual handler logic here
    if (message.action === 'getData') {
      sendResponse({ data: 'hello' });
    }
    return true;
  })
);
```

Debugging Port Connections {#debugging-port-connections}

Long-lived connections via `chrome.runtime.connect` are harder to debug because disconnects can happen silently:

```javascript
// Wrap port creation with debugging
function createDebugPort(name) {
  const port = chrome.runtime.connect({ name });

  port.onMessage.addListener((msg) => {
    console.log(`[Port:${name}] received:`, msg);
  });

  port.onDisconnect.addListener(() => {
    const error = chrome.runtime.lastError?.message || 'no error';
    console.warn(`[Port:${name}] disconnected: ${error}`);
  });

  const originalPostMessage = port.postMessage.bind(port);
  port.postMessage = (msg) => {
    console.log(`[Port:${name}] sending:`, msg);
    originalPostMessage(msg);
  };

  return port;
}
```

---

Memory Leak Detection {#memory-leak-detection}

Extension memory leaks are particularly insidious because the service worker may be terminated and restarted, masking leaks that accumulate during a session. Content scripts can also leak by holding references to detached DOM nodes.

Taking Heap Snapshots {#taking-heap-snapshots}

In any extension context's DevTools, go to the Memory panel:

1. Select Heap snapshot and click "Take snapshot".
2. Perform the actions you suspect cause a leak.
3. Take another snapshot.
4. Select the second snapshot and change the view to Comparison (comparing against the first snapshot).
5. Sort by Size Delta to find objects that grew between snapshots.

Look for:

- Detached DOM trees (search for "Detached" in the snapshot).
- Growing arrays or maps that are never cleaned up.
- Event listener counts that increase without decreasing.

Allocation Timeline {#allocation-timeline}

The Allocation instrumentation on timeline option in the Memory panel records every allocation over time. Start recording, perform your suspect actions, then stop. Blue bars indicate allocations that are still alive -- potential leaks. Gray bars indicate allocations that were garbage collected -- normal behavior.

Common Extension Memory Leaks {#common-extension-memory-leaks}

```javascript
// LEAK: Event listeners added in content scripts that are never removed
function init() {
  // This listener is never removed, even if the content script is re-injected
  window.addEventListener('scroll', handleScroll);
}

// FIX: Track and clean up listeners
const listeners = [];

function init() {
  const handler = handleScroll.bind(this);
  window.addEventListener('scroll', handler);
  listeners.push({ event: 'scroll', handler });
}

function cleanup() {
  listeners.forEach(({ event, handler }) => {
    window.removeEventListener(event, handler);
  });
  listeners.length = 0;
}

// LEAK: Storing tab references that are never cleaned up
const tabData = {};
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  tabData[tabId] = { ...changeInfo, url: tab.url };
});

// FIX: Clean up when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabData[tabId];
});
```

---

Performance Profiling {#performance-profiling}

Extension performance issues often manifest as slow browser startup, sluggish page loads (from content scripts), or delayed responses to user actions.

Flame Charts for Service Worker Startup {#flame-charts-for-service-worker-startup}

Open the service worker's DevTools and go to the Performance panel. Click "Record", then trigger a service worker restart (update the extension from `chrome://extensions`). Stop recording after the worker has fully initialized.

The flame chart shows:

- Script evaluation time -- how long it takes to parse and execute your service worker code.
- Event handler registration -- time spent registering listeners.
- API calls -- time spent in Chrome API calls during startup.

Aim for service worker startup under 100ms. If it exceeds this, consider:

- Lazy-loading modules using dynamic `import()`.
- Deferring non-critical initialization.
- Reducing the size of your service worker bundle.

```javascript
// Lazy-load expensive modules
chrome.action.onClicked.addListener(async (tab) => {
  // Only load the heavy module when the user actually clicks
  const { processTab } = await import('./heavy-processor.js');
  await processTab(tab);
});
```

Content Script Performance {#content-script-performance}

Content scripts that run on every page need to be especially fast. Profile them using the page's DevTools Performance panel:

1. Record a page load with your extension enabled.
2. Look for your content script's execution in the flame chart under "Evaluate Script".
3. Compare against a recording with your extension disabled to see the overhead.

Use `performance.mark()` and `performance.measure()` for custom timing:

```javascript
// content-script.js
performance.mark('ext-cs-start');

// ... your content script logic ...

performance.mark('ext-cs-end');
performance.measure('Extension Content Script', 'ext-cs-start', 'ext-cs-end');

const measure = performance.getEntriesByName('Extension Content Script')[0];
console.log(`[Perf] Content script took ${measure.duration.toFixed(2)}ms`);
```

Benchmarking Chrome API Calls {#benchmarking-chrome-api-calls}

Some Chrome API calls are surprisingly slow. Benchmark the ones you call frequently:

```javascript
async function benchmarkApi(name, fn, iterations = 100) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);
  const min = Math.min(...times);
  console.log(`[Bench] ${name}: avg=${avg.toFixed(2)}ms min=${min.toFixed(2)}ms max=${max.toFixed(2)}ms`);
}

// Example usage
benchmarkApi('storage.local.get', () =>
  chrome.storage.local.get('myKey')
);

benchmarkApi('tabs.query', () =>
  chrome.tabs.query({ active: true, currentWindow: true })
);
```

---

Remote Debugging on Android {#remote-debugging-on-android}

To debug your extension on Android, you need Chrome for Android and a USB connection to your development machine.

Setup {#setup}

1. Enable Developer options and USB debugging on your Android device.
2. Connect the device to your computer via USB.
3. Open `chrome://inspect` on your desktop Chrome.
4. Your Android device should appear under "Remote Target".

Installing the Extension {#installing-the-extension}

Chrome for Android does not natively support extensions from local files. You have two options:

1. Kiwi Browser -- an Android browser based on Chromium that supports loading unpacked extensions. Install your extension as you would on desktop, then use `chrome://inspect` to debug the service worker and other contexts.
2. Chrome Dev/Canary channels -- some Android builds support extension sideloading via command-line flags. Check the current Chromium documentation for the latest approach.

Debugging Tips for Mobile {#debugging-tips-for-mobile}

- Use `chrome://inspect` to access DevTools for any page or extension context on the connected device.
- Mobile content scripts may behave differently due to viewport differences, touch events, and mobile-specific CSS. Test thoroughly.
- Performance characteristics differ significantly -- operations that are instant on desktop may take hundreds of milliseconds on mobile hardware.

---

Common Error Messages Decoded {#common-error-messages-decoded}

Extension developers encounter a set of recurring error messages. Your content script tried to call a Chrome API (like `chrome.runtime.sendMessage`) after the extension was updated or reloaded. The old content script is still running on the page, but its connection to the extension runtime is severed.

Fix: Wrap Chrome API calls in try-catch and handle the invalidated state:

```javascript
function safeSendMessage(message) {
  try {
    return chrome.runtime.sendMessage(message);
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.warn('Extension was reloaded. Please refresh the page.');
      // Optionally show a notification to the user
      showRefreshBanner();
      return null;
    }
    throw error;
  }
}
```

"Could not establish connection. Receiving end does not exist." {#could-not-establish-connection-receiving-end-does-not-exist}

What happened: `chrome.runtime.sendMessage` or `chrome.tabs.sendMessage` was called, but there is no listener registered in the target context. Common causes:

- The service worker was terminated and has not restarted yet.
- The content script has not been injected into the target tab.
- The popup is closed (popups only exist while visible).

Fix: Always check `chrome.runtime.lastError` in callbacks, or use try-catch with promises:

```javascript
try {
  const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
} catch (error) {
  // Content script not injected in this tab
  // Inject it first, then retry
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content-script.js']
  });
  const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
}
```

"Service worker registration failed" {#service-worker-registration-failed}

What happened: Chrome could not register your service worker, usually because:

- There is a syntax error in the service worker file.
- The file path in `manifest.json` is wrong.
- You are using ES module syntax (`import`/`export`) without `"type": "module"` in the manifest.

Fix: Check the Errors panel on `chrome://extensions`. If using modules, add the type field:

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

"Access to fetch at ... has been blocked by CORS policy" {#access-to-fetch-at-has-been-blocked-by-cors-policy}

What happened: A content script attempted a cross-origin fetch. Content scripts are subject to the same CORS restrictions as the page they run on.

Fix: Move the fetch to the service worker (which bypasses CORS with proper `host_permissions`) and use message passing to relay the data back to the content script.

"Manifest file is missing or unreadable" {#manifest-file-is-missing-or-unreadable}

What happened: Chrome cannot parse your `manifest.json`. Common causes include trailing commas, missing required fields, or BOM characters.

Fix: Validate your manifest with `JSON.parse()` or a JSON linter. Ensure required fields like `manifest_version`, `name`, and `version` are present.

"The message port closed before a response was received" {#the-message-port-closed-before-a-response-was-received}

What happened: A `sendMessage` call expected a response, but the listener did not call `sendResponse` (or did not return `true` to indicate an asynchronous response).

Fix: If your `onMessage` handler is async, return `true` from the listener to keep the message port open:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessageAsync(message).then(sendResponse);
  return true; // Keep the message channel open for async response
});
```

---

Building a Debug Mode Toggle {#building-a-debug-mode-toggle}

Rather than scattering `console.log` statements everywhere and removing them before release, build a debug mode that can be toggled at runtime.

Implementation {#implementation}

```javascript
// debug.js -- shared debug utility

class DebugMode {
  constructor(namespace) {
    this.namespace = namespace;
    this._enabled = false;
    this._load();
  }

  async _load() {
    const result = await chrome.storage.local.get('__debug_mode');
    this._enabled = result.__debug_mode === true;
  }

  async toggle() {
    this._enabled = !this._enabled;
    await chrome.storage.local.set({ __debug_mode: this._enabled });
    console.log(`[${this.namespace}] Debug mode ${this._enabled ? 'ON' : 'OFF'}`);
    return this._enabled;
  }

  get enabled() {
    return this._enabled;
  }

  log(...args) {
    if (this._enabled) {
      console.log(`[${this.namespace}]`, ...args);
    }
  }

  warn(...args) {
    if (this._enabled) {
      console.warn(`[${this.namespace}]`, ...args);
    }
  }

  error(...args) {
    // Always log errors, regardless of debug mode
    console.error(`[${this.namespace}]`, ...args);
  }

  time(label) {
    if (this._enabled) {
      console.time(`[${this.namespace}] ${label}`);
    }
  }

  timeEnd(label) {
    if (this._enabled) {
      console.timeEnd(`[${this.namespace}] ${label}`);
    }
  }

  table(data) {
    if (this._enabled) {
      console.log(`[${this.namespace}] Table:`);
      console.table(data);
    }
  }
}

// Create instances for each context
const debug = new DebugMode('background');
export default debug;
```

Using the Debug Mode {#using-the-debug-mode}

```javascript
// background.js
import debug from './debug.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debug.log('Message received:', message, 'from:', sender.tab?.id);
  debug.time('message-handling');

  // Handle the message...

  debug.timeEnd('message-handling');
  sendResponse({ success: true });
  return true;
});
```

Toggle from the Console {#toggle-from-the-console}

In any extension context's DevTools console, you can toggle debug mode:

```javascript
// Toggle debug mode on/off
chrome.storage.local.set({ __debug_mode: true });

// Or create a keyboard shortcut command in manifest.json
// that triggers the toggle via chrome.commands
```

Adding a Debug Panel to Options {#adding-a-debug-panel-to-options}

For a more user-friendly approach, add a debug section to your options page:

```javascript
// options.js
const debugToggle = document.getElementById('debug-toggle');

chrome.storage.local.get('__debug_mode', (result) => {
  debugToggle.checked = result.__debug_mode === true;
});

debugToggle.addEventListener('change', (e) => {
  chrome.storage.local.set({ __debug_mode: e.target.checked });
});
```

Environment-Based Debug Configuration {#environment-based-debug-configuration}

For production builds, strip debug code entirely using your bundler:

```javascript
// webpack.config.js
const webpack = require('webpack');

module.exports = (env) => ({
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(env.mode !== 'production')
    })
  ]
});
```

```javascript
// In your source code
if (__DEV__) {
  debug.log('This entire block is removed in production builds');
}
```

---

Summary {#summary}

Debugging Chrome extensions requires a systematic approach because code runs across multiple isolated contexts, each with its own lifecycle and DevTools instance. The key techniques to remember:

- Use `chrome://serviceworker-internals` and `chrome://extensions` together for full service worker visibility.
- Content scripts are debugged from the page's DevTools, not the extension's.
- Right-click inspect keeps popups open for debugging.
- Build logging middleware for message passing -- it is the single most useful debugging investment.
- Take heap snapshots before and after suspect operations to catch memory leaks.
- Profile service worker startup to keep it under 100ms.
- Build a debug mode toggle rather than scattering and removing console.log statements.

Master these techniques and you will spend less time confused about what your extension is doing and more time building features.

Related Articles {#related-articles}

Related Articles

- [Debugging Checklist](../guides/extension-debugging-checklist.md)
- [Debugging Extensions](../guides/debugging-extensions.md)
- [Debugging Tools](../guides/chrome-extension-debugging-tools.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

