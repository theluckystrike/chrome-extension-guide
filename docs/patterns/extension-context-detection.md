---
layout: default
title: "Chrome Extension Extension Context Detection — Best Practices"
description: "Detect execution context in Chrome extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/extension-context-detection/"
---

# Extension Context Detection

Chrome extensions run code in multiple distinct contexts, each with different APIs and constraints. Detecting which context your code is executing in is essential for building robust, portable extensions.

## Context Detection Techniques

### Service Worker Detection

```javascript
const isServiceWorker = typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
```

Service workers run in a background context without DOM access. They have access to most Chrome APIs but not to `window` or `document`.

### Content Script Detection

```javascript
const isContentScript = typeof window !== 'undefined' && 
                        typeof chrome.runtime?.id !== 'undefined' && 
                        typeof chrome.runtime?.getBackgroundPage === 'undefined';
```

Content scripts run in the context of web pages but have access to a modified `chrome.runtime` API. They share the page's DOM but have isolated `chrome.storage`.

### Popup Detection

```javascript
const isPopup = typeof window !== 'undefined' && 
               window.location.href.includes('chrome-extension://') &&
               window.location.href.includes('/popup.html');
```

The popup runs in a short-lived window with access to the full extension API. It closes when the user clicks outside or presses Escape.

### Options Page Detection

```javascript
const isOptionsPage = typeof window !== 'undefined' && 
                      window.location.href.includes('chrome-extension://') &&
                      window.location.href.includes('/options.html');
```

Options pages are dedicated HTML pages for extension settings. They persist until closed by the user.

### Side Panel Detection

```javascript
const isSidePanel = typeof chrome.sidePanel !== 'undefined' && 
                    chrome.sidePanel.getCurrent;
```

Side panels are available in Manifest V3 and provide a persistent sidebar experience.

### DevTools Panel Detection

```javascript
const isDevTools = typeof chrome.devtools !== 'undefined' && 
                   typeof chrome.devtools.panels !== 'undefined';
```

DevTools extensions add custom panels and sidebars to Chrome's developer tools.

### Offscreen Document Detection

```javascript
const isOffscreen = typeof window !== 'undefined' && 
                    document.title === 'Extension Offscreen Document';
```

Offscreen documents handle long-running tasks with DOM access in Manifest V3.

## Why Context Detection Matters

Different contexts have different API availability:

- **Service Workers**: No DOM, event-driven lifecycle
- **Content Scripts**: Limited API access, shares page JavaScript context
- **Popup/Options**: Full API access, ephemeral lifecycle
- **Side Panel**: Persistent, full API access

Security constraints also vary. Content scripts inherit the page's CSP and may be restricted by site scripts.

## Building Isomorphic Utilities

Create a context detector utility:

```javascript
const ExtensionContext = {
  SERVICE_WORKER: 'service_worker',
  CONTENT_SCRIPT: 'content_script',
  POPUP: 'popup',
  OPTIONS: 'options_page',
  SIDE_PANEL: 'side_panel',
  DEVTOOLS: 'devtools',
  OFFSCREEN: 'offscreen',
  UNKNOWN: 'unknown'
};

export function detectContext() {
  if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
    return ExtensionContext.SERVICE_WORKER;
  }
  if (typeof chrome.devtools?.panels !== 'undefined') {
    return ExtensionContext.DEVTOOLS;
  }
  if (typeof chrome.sidePanel?.getCurrent === 'function') {
    return ExtensionContext.SIDE_PANEL;
  }
  if (typeof window !== 'undefined') {
    const url = window.location.href;
    if (url.includes('/popup.html')) return ExtensionContext.POPUP;
    if (url.includes('/options.html')) return ExtensionContext.OPTIONS;
    if (document.title === 'Extension Offscreen Document') return ExtensionContext.OFFSCREEN;
    if (typeof chrome.runtime?.id !== 'undefined' && typeof chrome.runtime?.getBackgroundPage === 'undefined') {
      return ExtensionContext.CONTENT_SCRIPT;
    }
  }
  return ExtensionContext.UNKNOWN;
}
```

## Context-Aware Logger

```javascript
import { detectContext } from './context-detector';

export function createLogger(prefix) {
  const context = detectContext();
  
  return {
    log: (...args) => console.log(`[${prefix}:${context}]`, ...args),
    warn: (...args) => console.warn(`[${prefix}:${context}]`, ...args),
    error: (...args) => console.error(`[${prefix}:${context}]`, ...args)
  };
}
```

## Platform Abstraction Layer

```javascript
import { detectContext } from './context-detector';

export const platform = {
  async storage() {
    if (detectContext() === 'content_script') {
      return chrome.storage.local;
    }
    return new Promise(resolve => {
      chrome.storage.local.get(null, resolve);
    });
  },
  
  async runtimeSendMessage(message) {
    return chrome.runtime.sendMessage(message);
  },
  
  getPlatformInfo() {
    return chrome.runtime.getPlatformInfo();
  }
};
```

## See Also

- [Extension Architecture](../guides/extension-architecture.md)
- [Content Script API](../reference/content-script-api.md)
- [Service Workers](../mv3/service-workers.md)
