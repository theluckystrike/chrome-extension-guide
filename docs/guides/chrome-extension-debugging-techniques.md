---
layout: default
title: "Chrome Extension Debugging Techniques. Complete Guide"
description: "Master Chrome extension debugging with our comprehensive guide covering service workers, content scripts, popups, and common error fixes."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-debugging-techniques/"
---
Chrome Extension Debugging Techniques

Debugging Chrome extensions requires understanding the unique architecture of browser extensions. Unlike standard web applications, Chrome extensions run code across multiple isolated contexts: service workers, content scripts, popups, options pages, and side panels. Each context has its own DevTools instance, lifecycle, and debugging workflow. This guide covers the essential techniques every extension developer needs to diagnose and fix issues effectively.

Table of Contents

- [Service Worker Debugging in chrome://serviceworker-internals](#service-worker-debugging-in-chromeserviceworker-internals)
- [Content Script Debugging with Sources Panel](#content-script-debugging-with-sources-panel)
- [Popup Debugging (Right-Click → Inspect)](#popup-debugging-right-click--inspect)
- [Background Page Console Logs](#background-page-console-logs)
- [chrome://extensions Error View](#chromeextensions-error-view)
- [Network Request Inspection](#network-request-inspection)
- [Storage Debugging with DevTools](#storage-debugging-with-devtools)
- [Breakpoints in Injected Scripts](#breakpoints-in-injected-scripts)
- [Remote Debugging on Android](#remote-debugging-on-android)
- [Common Error Patterns and Fixes](#common-error-patterns-and-fixes)

---

Service Worker Debugging in chrome://serviceworker-internals

Service workers are the backbone of Manifest V3 extensions, handling background tasks, event listening, and coordination between extension components. Debugging them requires a different approach than regular JavaScript.

Accessing Service Worker Internals

Navigate to `chrome://serviceworker-internals` in your Chrome browser. This page displays every registered service worker in the browser, including your extension's. Unlike `chrome://extensions`, this page provides granular details about the service worker lifecycle:

- Registration Status: Shows whether the service worker is installed, activated, or in a redundant state
- Running Status: Indicates if the worker is currently running or has been terminated
- Received Events: A chronological log of events dispatched to the worker
- Start/Stop Controls: Manual controls to start or stop the worker for testing

The ability to manually stop the service worker is particularly valuable. Click "Stop" to simulate the browser terminating your worker due to inactivity, then trigger an event (such as clicking your extension icon) to verify it restarts cleanly.

Service Worker Lifecycle Logging

Add logging to each lifecycle event to understand exactly when your code executes:

```javascript
// background.js (service worker)

self.addEventListener('install', (event) => {
  console.log('[SW] Install event fired', {
    timestamp: new Date().toISOString(),
    state: self.registration?.active?.state
  });
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event fired', {
    timestamp: new Date().toISOString()
  });
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[SW] onStartup fired. browser just launched');
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SW] onInstalled fired', {
    reason: details.reason,
    previousVersion: details.previousVersion
  });
});
```

Catching Unhandled Errors

Service worker errors can silently terminate the worker without warning. Implement global error handlers at the top of your service worker script:

```javascript
self.addEventListener('error', (event) => {
  console.error('[SW] Uncaught error:', event.message, event.filename, event.lineno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});
```

Keeping Service Worker Alive During Development

Service workers terminate after approximately 30 seconds of inactivity. During debugging sessions, you may want to prevent this:

```javascript
// Development only
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

Content Script Debugging with Sources Panel

Content scripts run in an isolated world within web pages, sharing the DOM but having a separate JavaScript execution context. This creates unique debugging challenges.

Finding Content Scripts in DevTools

Open DevTools on a page where your content script is active. In the Sources panel, locate the Content scripts tab in the left sidebar. Your extension's scripts appear grouped by extension ID. Ensure you have the page's DevTools open, not the extension's DevTools.

Working with Source Maps

If you use a bundler like webpack, Vite, or Rollup, generate source maps for better debugging:

```javascript
// webpack.config.js
module.exports = {
  devtool: 'cheap-module-source-map',
};
```

Include the source map reference in your bundled content script. Chrome DevTools automatically detects inline source maps or those referenced via `//# sourceMappingURL=`. This enables setting breakpoints in your original TypeScript or ES6 source code.

Setting Breakpoints in Content Scripts

Several methods exist for debugging content scripts:

1. Line breakpoints: Navigate to your content script in Sources and click the line number gutter
2. Conditional breakpoints: Right-click the gutter to add conditions for specific scenarios
3. `debugger` statement: Add `debugger;` directly in your source for reliable pauses
4. DOM breakpoints: Right-click elements in the DOM tree and select "Break on..." to pause on modifications

Debugging Across the Isolated World Boundary

Content scripts cannot access page JavaScript variables directly. Use the context selector dropdown at the Console panel's top to switch between your extension's isolated world and the page's main world.

To pass data across the boundary for debugging:

```javascript
// content-script.js. post to page context
window.postMessage({
  source: 'my-extension-debug',
  data: { someState: myVariable }
}, '*');
```

---

Popup Debugging (Right-Click → Inspect)

Popups and side panels present a debugging challenge because they close when they lose focus, which also closes their DevTools connection.

Inspecting Popups

Right-click your extension icon in the toolbar and select "Inspect popup". This opens a dedicated DevTools window. The popup remains open as long as DevTools stays open, even if it loses focus.

Alternatively, navigate to `chrome://extensions`, enable Developer mode, and click the "Inspect views" link next to your extension.

Side Panel Debugging

Side panels persist during navigation, making them easier to debug than popups. Open DevTools the same way, through the "Inspect views" link or by right-clicking inside the panel and selecting "Inspect".

Persistent DevTools for Extension Pages

Full-tab extension pages (`chrome-extension://YOUR_ID/options.html`) work like regular web pages. Open DevTools with F12 or Cmd+Option+I. These pages persist until closed, making debugging straightforward.

---

Background Page Console Logs

In Manifest V2, background pages were persistent pages where console.log statements remained visible. In Manifest V3, service workers replace background pages and may terminate at any time.

Viewing Service Worker Logs

Open the service worker DevTools from `chrome://extensions` by clicking the "service worker" link. Console logs appear here, but remember that logs disappear when the service worker terminates.

Implementing Persistent Logging

For important events, log to storage instead of console:

```javascript
// Log important events to storage for later inspection
chrome.storage.local.set({
  _debugLogs: [...(await chrome.storage.local.get('_debugLogs'))._debugLogs || [], 
    { time: Date.now(), message: 'Service worker started' }
  ].slice(-100) // Keep last 100 entries
});
```

Using chrome.runtime.lastError

Always check `chrome.runtime.lastError` in callback-based APIs:

```javascript
chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message failed:', chrome.runtime.lastError.message);
    return;
  }
  console.log('Response:', response);
});
```

---

chrome://extensions Error View

The `chrome://extensions` page provides essential debugging information that may not appear elsewhere.

The Errors Panel

When your extension throws an error, a red "Errors" button appears on your extension's card. Click it to view:

- Error messages with stack traces
- Context where errors occurred (service worker, content script, popup)
- Timestamps for each error
- Clear all button to reset

Check this panel regularly. Some errors, particularly manifest parsing errors and permission denials, only appear here.

The Update Button

Click "Update" to force-reload your unpacked extension. This triggers `onInstalled` with `reason: 'update'` and is essential for testing manifest changes, service worker updates, and declarative rules.

Service Worker Status Indicator

The extension card shows whether your service worker is active, inactive, or has an error. Clicking the service worker link opens DevTools directly.

---

Network Request Inspection

Extensions interact with networks uniquely, intercepting requests and modifying headers from privileged contexts.

Monitoring Requests by Context

Requests appear in different DevTools instances based on their origin:

- Service worker requests: Service worker DevTools Network panel
- Content script requests: Page's DevTools Network panel
- Popup requests: Popup's DevTools

Logging Extension Network Activity

Use `chrome.webRequest` for centralized logging:

```javascript
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

Debugging CORS Issues

Service workers with proper `host_permissions` bypass CORS, but content scripts remain subject to cross-origin restrictions. Move problematic requests to the service worker:

```javascript
// From content script, send to service worker instead
chrome.runtime.sendMessage({ 
  action: 'fetch', 
  url: 'https://api.example.com/data' 
}, (response) => {
  console.log('Data from background:', response);
});
```

Debugging Declarative Net Request Rules

Use `chrome.declarativeNetRequest.getMatchedRules()` to verify rule matching:

```javascript
chrome.declarativeNetRequest.getMatchedRules({ tabId: tabId }, (result) => {
  console.log('Matched rules:', result.rulesMatchedInfo);
});
```

Enable the "Matched Rules" tab in DevTools to see which rules affected each request.

---

Storage Debugging with DevTools

Chrome extensions use `chrome.storage` instead of `localStorage`. Debugging requires different approaches.

Viewing Storage in DevTools

In any extension context's DevTools, open the Application panel. Under Storage, find Extension Storage to view `chrome.storage.local` and `chrome.storage.sync`.

Querying Storage from Console

Access storage directly from the console:

```javascript
chrome.storage.local.get(null, (items) => {
  console.log('All local storage:', JSON.stringify(items, null, 2));
});

chrome.storage.sync.get(null, (items) => {
  console.log('All sync storage:', JSON.stringify(items, null, 2));
});
```

Storage Types Reference

| Storage Area | Persistence | Shared Across Devices | Quota |
|--------------|-------------|----------------------|-------|
| `local` | Permanent | No | 10 MB |
| `sync` | Permanent | Yes | 100 KB |
| `session` | Until browser closes | No | 10 MB |

Monitoring Storage Changes

Track all modifications with the change listener:

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

Checking Storage Quota

Monitor usage to prevent quota exceeded errors:

```javascript
chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
  const quota = 10485760; // 10 MB
  console.log(`Using ${bytesInUse} of ${quota} bytes (${(bytesInUse / quota * 100).toFixed(1)}%)`);
});
```

---

Breakpoints in Injected Scripts

Setting breakpoints in dynamically injected scripts requires specific techniques.

Using the debugger Statement

The `debugger;` statement works reliably in injected scripts:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => {
    debugger; // Pauses execution when DevTools is open
    console.log('Script running');
  }
});
```

Finding Injected Scripts in Sources

Injected scripts appear in the Sources panel under "Content scripts" or "Snippets" depending on injection method. Look for the script filename or the injection context.

Conditional Breakpoints

Right-click a line number in Sources, select "Add conditional breakpoint", and enter a JavaScript expression. The breakpoint only triggers when the condition evaluates to true:

```javascript
// Example: window.location.hostname === 'example.com'
```

---

Remote Debugging on Android

Debug extensions on mobile devices using Chrome's remote debugging capabilities.

Setup Requirements

1. Enable Developer options and USB debugging on your Android device
2. Connect the device to your computer via USB
3. Open `chrome://inspect` on desktop Chrome
4. Your Android device appears under "Remote Target"

Installing Extensions on Android

Chrome for Android doesn't support local extension loading natively. Two options exist:

1. Kiwi Browser: A Chromium-based Android browser that supports unpacked extensions. Install your extension as on desktop, then debug using `chrome://inspect`.
2. Chrome Dev/Canary: Some Android builds support extension sideloading via command-line flags.

Debugging on Mobile

Use `chrome://inspect` to access DevTools for any extension context on the connected device. Test thoroughly, mobile content scripts may behave differently due to viewport differences and touch events.

---

Common Error Patterns and Fixes

Understanding common error messages helps diagnose issues quickly.

"Extension context invalidated"

Cause: Content script called a Chrome API after extension reload. The old script runs on the page but loses its extension connection.

Fix: Wrap Chrome API calls in try-catch:

```javascript
function safeSendMessage(message) {
  try {
    return chrome.runtime.sendMessage(message);
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.warn('Extension reloaded. Refresh the page.');
      return null;
    }
    throw error;
  }
}
```

"Could not establish connection. Receiving end does not exist"

Cause: `sendMessage` called but no listener exists in the target context. Common when the service worker is terminated or content script hasn't injected.

Fix: Ensure the target context exists before sending:

```javascript
try {
  const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
} catch (error) {
  // Inject content script first, then retry
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content-script.js']
  });
  const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
}
```

"Service worker registration failed"

Cause: Syntax errors, wrong file paths, or missing module type declaration.

Fix: Check the Errors panel on `chrome://extensions`. If using ES modules:

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

"Manifest file is missing or unreadable"

Cause: Chrome cannot parse manifest.json, trailing commas, missing fields, or BOM characters.

Fix: Validate with JSON.parse() or a linter. Ensure required fields exist: `manifest_version`, `name`, `version`.

"The message port closed before a response was received"

Cause: `sendMessage` expected a response, but the listener didn't call `sendResponse` or return `true`.

Fix: Return `true` for async handlers:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessageAsync(message).then(sendResponse);
  return true; // Keep message channel open
});
```

---

Related Articles

- [Chrome Extension Performance Profiling with DevTools](../guides/chrome-extension-performance-profiling-devtools.md)
- [Extension Testing Strategies](../guides/extension-testing-strategies.md)
- [Comprehensive Extension Testing](../guides/comprehensive-extension-testing.md)
- [Extension Debugging Checklist](../guides/extension-debugging-checklist.md)
- [Unit Testing for Extensions](../guides/unit-testing.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
