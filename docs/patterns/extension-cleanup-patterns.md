---
layout: default
title: "Chrome Extension Extension Cleanup Patterns — Best Practices"
description: "Clean up resources when extensions or tabs are closed."
canonical_url: "https://bestchromeextensions.com/patterns/extension-cleanup-patterns/"
---

# Cleanup and Teardown Patterns for Chrome Extensions

Proper cleanup ensures extensions leave no trace when disabled, uninstalled, or updated. This document covers essential patterns for graceful shutdown.

## Uninstall URL {#uninstall-url}

Set an exit survey URL when users uninstall your extension:

```javascript
// background.js
chrome.runtime.setUninstallURL('https://yourdomain.com/uninstall-survey');
```

## Content Script Cleanup {#content-script-cleanup}

Remove injected elements, event listeners, and observers when content scripts unload:

```javascript
// content-script.js
class ContentScriptCleanup {
  constructor() {
    this.elements = [];
    this.listeners = [];
    this.observers = [];
  }

  addElement(el) { this.elements.push(el); }
  addListener(fn, target = window) { 
    this.listeners.push({ fn, target }); 
  }
  addObserver(observer) { this.observers.push(observer); }

  cleanup() {
    // Remove injected DOM elements
    this.elements.forEach(el => el.remove());
    this.elements = [];

    // Remove event listeners
    this.listeners.forEach(({ fn, target }) => {
      target.removeEventListener('click', fn);
    });
    this.listeners = [];

    // Disconnect MutationObservers
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];
  }
}

const cleanup = new ContentScriptCleanup();

// Example: injected element
const widget = document.createElement('div');
document.body.appendChild(widget);
cleanup.addElement(widget);

// Example: observer
const observer = new MutationObserver(() => {});
observer.observe(document.body, { childList: true });
cleanup.addObserver(observer);

// Cleanup on unload
window.addEventListener('unload', () => cleanup.cleanup());
```

## Service Worker State Preservation {#service-worker-state-preservation}

Save state before the service worker terminates:

```javascript
// background.js
chrome.runtime.onSuspend.addListener(() => {
  // Save current state to storage
  chrome.storage.local.set({
    lastState: getCurrentState(),
    timestamp: Date.now()
  });
});
```

## Port Disconnect Handling {#port-disconnect-handling}

Clean up when communication ports are disconnected:

```javascript
// background.js
const ports = new Set();

chrome.runtime.onConnect.addListener(port => {
  ports.add(port);
  port.onDisconnect.addListener(() => {
    ports.delete(port);
    // Perform cleanup for this port's context
  });
});
```

## Alarm Cleanup {#alarm-cleanup}

Clear all alarms when a feature is disabled:

```javascript
// background.js
function disableFeature(featureId) {
  chrome.alarms.clearAll();
  // Disable feature logic
}
```

## Context Menu Cleanup {#context-menu-cleanup}

Remove all context menu items:

```javascript
// background.js
chrome.contextMenus.removeAll(() => {
  console.log('Context menus cleared');
});
```

## Storage Migration Cleanup {#storage-migration-cleanup}

Remove obsolete keys during version upgrades:

```javascript
// background.js
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'update') {
    chrome.storage.local.get(['oldKey1', 'oldKey2'], items => {
      if (items.oldKey1 !== undefined) {
        chrome.storage.local.remove(['oldKey1', 'oldKey2']);
      }
    });
  }
});
```

## Tab Cleanup {#tab-cleanup}

Close extension-opened tabs on uninstall:

```javascript
// background.js
chrome.runtime.onUninstalled.addListener(() => {
  chrome.tabs.query({ url: '*://your-extension-tabs.com/*' }, tabs => {
    tabs.forEach(tab => chrome.tabs.remove(tab.id));
  });
});
```

## CSS Cleanup {#css-cleanup}

Remove dynamically injected styles:

```javascript
// content-script.js
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'cleanup') {
    chrome.scripting.removeCSS({
      css: '/* injected styles */',
      target: { tabId: chrome.tab.id }
    });
  }
});
```

## Memory Leak Prevention {#memory-leak-prevention}

Nullify references and clear intervals:

```javascript
// Always clear intervals and nullify references
let intervalId = setInterval(doWork, 1000);

// On cleanup
clearInterval(intervalId);
intervalId = null;
someObject.reference = null;
```

## Comprehensive Cleanup Manager {#comprehensive-cleanup-manager}

```javascript
// cleanup-manager.js
class ExtensionCleanupManager {
  constructor() {
    this.cleanupTasks = [];
  }

  register(task) {
    this.cleanupTasks.push(task);
  }

  async executeAll() {
    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (e) {
        console.error('Cleanup failed:', e);
      }
    }
    this.cleanupTasks = [];
  }
}

const manager = new ExtensionCleanupManager();

// Register cleanup tasks
manager.register(() => chrome.alarms.clearAll());
manager.register(() => chrome.contextMenus.removeAll());
manager.register(() => chrome.notifications.clear());

// On disable/uninstall
manager.executeAll();
```

## See Also {#see-also}

- [Service Worker Lifecycle](../patterns/service-worker-lifecycle.md)
- [Content Script Lifecycle](../patterns/content-script-lifecycle.md)
- [Extension Uninstall](../patterns/extension-uninstall.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
