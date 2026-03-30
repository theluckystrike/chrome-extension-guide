---
layout: default
title: "Chrome Extension Service Worker Debugging. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/service-worker-debugging/"
last_modified_at: 2026-01-15
---
Service Worker Debugging Guide

Overview {#overview}
- MV3 service workers are harder to debug than MV2 background pages
- SW lifecycle (start/stop) introduces new debugging challenges
- Key tools and techniques for effective debugging

Accessing SW DevTools {#accessing-sw-devtools}
- Go to chrome://extensions
- Find your extension, click "Inspect views: service worker"
- DevTools opens attached to the service worker
- Console, Sources, Network all work

Common Issues {#common-issues}

SW Goes Inactive {#sw-goes-inactive}
- Problem: service worker stops after ~30s of inactivity
- Symptom: breakpoints not hit, listeners not firing
- Debug: check chrome://serviceworker-internals for SW status
- Fix: ensure events are registered at top level synchronously

Lost State {#lost-state}
- Problem: variables reset on SW restart
- Symptom: data disappears between actions
- Debug: log at SW startup to confirm restarts
- Fix: use chrome.storage.session for temporary state

Event Listeners Not Firing {#event-listeners-not-firing}
- Problem: listeners registered inside async code
- Symptom: events missed after SW restart
- Debug: add console.log at registration point
- Fix: register all listeners synchronously at top level

Port Disconnected {#port-disconnected}
- Problem: long-lived connections drop when SW idles
- Symptom: runtime.Port.onDisconnect fires unexpectedly
- Fix: reconnect pattern or use sendMessage instead

Debugging Tools {#debugging-tools}

chrome://serviceworker-internals {#chromeserviceworker-internals}
- Shows all registered service workers
- Start/stop/inspect controls
- View registration scope and status

console.log Strategies {#consolelog-strategies}
- Log at SW startup to detect restarts
- Log event registrations
- Log alarm and message handlers
- Use structured logging with timestamps

Breakpoints {#breakpoints}
- Set breakpoints in Sources panel
- Conditional breakpoints for specific events
- Event listener breakpoints in DevTools

Network Tab {#network-tab}
- Monitor fetch requests from SW
- Check for failed requests
- Inspect headers and responses

Testing SW Lifecycle {#testing-sw-lifecycle}
- Manually stop SW from chrome://serviceworker-internals
- Trigger alarm to verify SW wakes up
- Send message to verify listener registration
- Test after Chrome restart

Code Examples {#code-examples}

Debug Logging Wrapper for SW {#debug-logging-wrapper-for-sw}
```javascript
const DEBUG = true;
function debug(...args) {
  if (DEBUG) {
    console.log(`[SW:${Date.now()}]`, ...args);
  }
}

// Log SW startup
debug('Service worker started', { version: chrome.runtime.getManifest().version });

// Log event registration
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debug('Message received', { message, sender });
  // handler code
});
```

SW Restart Detection Pattern {#sw-restart-detection-pattern}
```javascript
let isFirstRun = true;

chrome.runtime.onStartup.addListener(() => {
  isFirstRun = true;
  console.log('[SW] New session started');
});

// Log whenever SW starts (including after restarts)
console.log('[SW] Initializing, firstRun:', isFirstRun);

// Re-initialize state on each startup
async function initializeState() {
  const stored = await chrome.storage.local.get('state');
  if (!stored.state) {
    await chrome.storage.local.set({ state: { initialized: Date.now() } });
  }
  console.log('[SW] State initialized');
}

initializeState();
```

Connection Recovery Pattern {#connection-recovery-pattern}
```javascript
// For long-lived connections that may drop when SW idles
function createReconnectHandler(port) {
  port.onDisconnect.addListener(() => {
    console.log('[SW] Port disconnected, attempting reconnect...');
    // Wait a bit then reconnect
    setTimeout(() => {
      const newPort = chrome.runtime.connect({ name: 'recovered' });
      setupPortListeners(newPort);
    }, 1000);
  });
}

// Alternative: use sendMessage instead of long-lived ports
async function sendWithRetry(message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 500));
    }
  }
}
```

Cross-references {#cross-references}
- [mv3/service-workers.md](../mv3/service-workers.md)
- [mv3/service-worker-tips.md](../mv3/service-worker-tips.md)
- [guides/debugging-extensions.md](debugging-extensions.md)
- [guides/advanced-debugging.md](advanced-debugging.md)

Related Articles {#related-articles}

Related Articles

- [Advanced Debugging](../guides/advanced-debugging.md)
- [Service Worker Lifecycle](../guides/service-worker-lifecycle.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
