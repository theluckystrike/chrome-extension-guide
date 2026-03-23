# Chrome vs Firefox Extension Porting Guide

A comprehensive guide for porting Chrome extensions to Firefox and achieving cross-browser compatibility.

## Overview

Porting Chrome extensions to Firefox is generally straightforward thanks to the WebExtensions standard. However, several key differences in API implementations, manifest handling, and distribution require attention. This guide covers all critical aspects of Chrome-to-Firefox porting.

## Manifest V3 vs V2 Differences

### Manifest V2 (MV2)

Firefox still supports MV2, while Chrome deprecated it. Key differences:

```json
{
  "manifest_version": 2,
  "browser_action": { ... },
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  }
}
```

### Manifest V3 (MV3)

```json
{
  "manifest_version": 3,
  "action": { ... },
  "background": {
    "service_worker": "background.js"
  }
}
```

### Key MV3 Changes

| Feature | MV2 | MV3 |
|---------|-----|-----|
| Background type | Persistent background page | Service worker |
| Action API | `browser_action` / `action` | `action` only |
| Declarative Net Request | Optional permission | Declarative permissions |
| Remote code | Allowed | Forbidden |
| Host permissions | Wildcards allowed | Limited wildcards |

## chrome.* vs browser.* Namespace

### Namespace Overview

- Chrome: Uses `chrome.*` namespace with callback-based APIs
- Firefox: Supports both `chrome.*` and `browser.*` namespaces natively
- Best practice: Use `browser.*` with WebExtensions polyfill for cross-browser compatibility

### Chrome Namespace (Callbacks)

```javascript
chrome.runtime.sendMessage({ type: 'GREET' }, (response) => {
  console.log(response);
});

chrome.storage.local.get(['key'], (result) => {
  console.log(result.key);
});
```

### Firefox Namespace (Promises)

```javascript
const response = await browser.runtime.sendMessage({ type: 'GREET' });
const result = await browser.storage.local.get('key');
```

### Using browser.* in Chrome

Install the polyfill for consistent Promise-based APIs:

```bash
npm install webextension-polyfill
```

```javascript
// background.js
import browser from 'webextension-polyfill';

// Instead of chrome.* callbacks
const tabs = await browser.tabs.query({ active: true });
await browser.storage.local.set({ setting: true });
```

## Promise vs Callback APIs

Chrome's `chrome.*` APIs use callbacks; Firefox's `browser.*` uses Promises.

### Callback Pattern (Chrome)

```javascript
chrome.tabs.query({ active: true }, (tabs) => {
  const tab = tabs[0];
  chrome.tabs.sendMessage(tab.id, { ping: true }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError.message);
      return;
    }
    console.log('Response:', response);
  });
});
```

### Promise Pattern (Firefox/browser.*)

```javascript
try {
  const tabs = await browser.tabs.query({ active: true });
  const tab = tabs[0];
  const response = await browser.tabs.sendMessage(tab.id, { ping: true });
  console.log('Response:', response);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Async/Await Wrapper for Chrome

```javascript
const promisify = (api, ...args) =>
  new Promise((resolve, reject) => {
    api(...args, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });

// Usage
const tabs = await promisify(chrome.tabs.query, { active: true });
```

## WebExtensions Polyfill

The [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) normalizes cross-browser differences.

### Installation

```bash
npm install webextension-polyfill
```

### Setup

```javascript
// background.js or content script
import browser from 'webextension-polyfill';

// HTML entry point
<script src="/node_modules/webextension-polyfill/dist/browser-polyfill.js"></script>
```

### Manifest Import

```json
{
  "background": {
    "scripts": ["browser-polyfill.js", "background.js"]
  }
}
```

### Common API Mappings

| Chrome (callback) | browser.* (Promise) |
|-------------------|---------------------|
| `chrome.runtime.sendMessage()` | `browser.runtime.sendMessage()` |
| `chrome.storage.local.get()` | `browser.storage.local.get()` |
| `chrome.tabs.query()` | `browser.tabs.query()` |
| `chrome.notifications.create()` | `browser.notifications.create()` |

## Service Workers vs Background Pages

### Chrome MV3 (Service Workers)

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

Service workers:
- Non-persistent (unload when idle)
- No access to DOM or `window`
- Use `chrome.runtime.onStartup` for initialization
- Cannot use `setTimeout` reliably

### Firefox MV3 (Background Scripts)

```json
{
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  }
}
```

Firefox supports:
- Event pages (non-persistent background)
- Persistent background pages (for MV2)
- ES modules via `"type": "module"`

### Firefox Service Worker Support

Firefox has limited service worker support:

```json
{
  "background": {
    "service_worker": "sw.js",
    "type": "module"
  }
}
```

Not all Chrome service worker APIs work in Firefox. Test thoroughly.

### Migration Pattern

```javascript
// MV2 background (persistent)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Installed');
});

// Works in MV3 service worker too
self.addEventListener('install', (event) => {
  console.log('Installing service worker');
});
```

## Packaging Differences

### Chrome (.zip)

```bash
zip -r extension.zip manifest.json background.js popup.html popup.js content.js/
```

### Firefox (.xpi/.zip)

Firefox accepts `.zip` files or `.xpi` (renamed ZIP):

```bash
zip -r extension.xpi manifest.json background.js popup.html popup.js content.js/
```

### Manifest Requirements

Firefox-specific manifest keys:

```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "extension@example.com",
      "strict_min_version": "109.0"
    }
  }
}
```

## Signing and Distribution

### Chrome Web Store

1. Create developer account ($5 one-time)
2. Upload ZIP package
3. Submit for review
4. Publish (public/unlisted)

### Firefox Add-ons

1. Create Mozilla developer account
2. Upload ZIP/XPI
3. Sign automatically
4. Publish to AMO or distribute directly

### Self-Distribution (Firefox)

```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "extension@example.com",
      "update_url": "https://example.com/updates.json"
    }
  }
}
```

Update manifest:

```json
{
  "updates": [
    {
      "version": "1.0.1",
      "addons": {
        "extension@example.com": {
          "updates": [
            { "version": "1.0.1", "path": "extension.xpi" }
          ]
        }
      }
    }
  ]
}
```

## Cross-Browser Manifest Patterns

### Universal Manifest (MV3)

```json
{
  "manifest_version": 3,
  "name": "__MSG_extension_name__",
  "version": "1.0.0",
  "default_locale": "en",
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "background": {
    "scripts": ["browser-polyfill.js", "background.js"],
    "persistent": false
  },
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "*://*.example.com/*"
  ],
  "browser_specific_settings": {
    "gecko": {
      "id": "extension@example.com",
      "strict_min_version": "109.0"
    }
  }
}
```

### Manifest Conditional Keys

Use `browser_specific_settings` to handle browser differences:

```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "my-extension@company.com"
    }
  }
}
```

## Feature Detection

Always check API availability before use:

```javascript
// Check for API support
if (chrome.sidePanel) {
  chrome.sidePanel.setOptions({ path: 'sidepanel.html' });
}

// Check for Promise support
if (typeof browser !== 'undefined' && browser.runtime) {
  // Use browser.* APIs
} else {
  // Fallback to chrome.* with callbacks
}

// Check manifest version
const manifest = chrome.runtime.getManifest();
const isMV3 = manifest.manifest_version === 3;

// Check for specific permissions
const hasStorage = manifest.permissions.includes('storage');
```

### Runtime Feature Detection

```javascript
const features = {
  hasServiceWorkers: ('serviceWorker' in navigator),
  hasPromises: typeof Promise !== 'undefined',
  hasESModules: () => {
    try {
      return typeof import.meta !== 'undefined';
    } catch (e) {
      return false;
    }
  }
};
```

## Common Gotchas

### 1. Chrome Runtime LastError

```javascript
// Chrome callbacks always execute, check for errors
chrome.storage.local.get('key', () => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError.message);
    return;
  }
});
```

### 2. Firefox Promise Rejection

```javascript
// Always handle promise rejections
browser.storage.local.get('key')
  .catch(error => console.error('Storage error:', error));
```

### 3. Service Worker Lifecycle

```javascript
// Service worker may terminate; don't rely on global state
let cachedData = null;

self.addEventListener('install', (event) => {
  // Pre-cache data during install
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients on activation
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data === 'fetch-data') {
    // Fetch fresh data when needed
    cachedData = await fetchData();
  }
});
```

### 4. Content Script Isolation

```javascript
// Content scripts share page context
// Use explicit messaging, not shared variables

// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    sendResponse({ state: myExtensionState });
  }
  return true; // Keep message channel open
});
```

### 5. CORS in Content Scripts

```javascript
// Content scripts inherit page CSP
// Use background script for cross-origin requests

// content.js
chrome.runtime.sendMessage({ url: 'https://api.example.com/data' });

// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetch(message.url)
    .then(res => res.json())
    .then(data => sendResponse(data))
    .catch(err => sendResponse({ error: err.message }));
  return true;
});
```

### 6. Manifest Permission Order

```json
{
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "*://*.example.com/*"
  ]
}
```

### 7. Firefox-Specific APIs

Firefox supports some APIs not in Chrome:

```javascript
// Firefox: contextualIdentities (Containers)
browser.contextualIdentities.query({})
  .then(identities => console.log(identities));

// Firefox: browsingData
browser.browsingData.remove({}, { cache: true });
```

### 8. Icon Sizing

| Size | Chrome | Firefox |
|------|--------|---------|
| 16x16 | Required | Optional |
| 32x32 | Recommended | Recommended |
| 48x48 | Optional | Required |
| 128x128 | Required (can be remote) | Required |

## Code Examples

### Storage Abstraction Layer

```javascript
// storage.js - Cross-browser storage wrapper
class Storage {
  constructor(namespace = '') {
    this.namespace = namespace;
  }

  async get(key) {
    if (typeof browser !== 'undefined' && browser.storage) {
      const fullKey = this.namespace ? `${this.namespace}.${key}` : key;
      const result = await browser.storage.local.get(fullKey);
      return result[fullKey];
    }
    
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  }

  async set(key, value) {
    const data = this.namespace 
      ? { [`${this.namespace}.${key}`]: value }
      : { [key]: value };
      
    if (typeof browser !== 'undefined' && browser.storage) {
      await browser.storage.local.set(data);
      return;
    }
    
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }
}

export const storage = new Storage('myExtension');
export default storage;
```

### Messaging Abstraction

```javascript
// messaging.js - Cross-browser messaging
class Messenger {
  constructor() {
    this.usingBrowser = typeof browser !== 'undefined' && browser.runtime;
  }

  async sendMessage(message, target = {}) {
    if (this.usingBrowser) {
      return browser.runtime.sendMessage(message);
    }
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  onMessage(callback) {
    if (this.usingBrowser) {
      browser.runtime.onMessage.addListener(callback);
    } else {
      chrome.runtime.onMessage.addListener(callback);
    }
  }
}

export const messenger = new Messenger();
export default messenger;
```

### Background Script Example

```javascript
// background.js
import browser from 'webextension-polyfill';
import { storage } from './storage.js';
import { messenger from './messaging.js';

browser.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason);
  
  // Initialize default settings
  await storage.set('settings', {
    enabled: true,
    theme: 'light'
  });
});

// Handle messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'GET_TAB_INFO') {
    return browser.tabs.get(sender.tab.id);
  }
  if (message.type === 'FETCH_DATA') {
    return fetch(message.url).then(res => res.json());
  }
});

// Alarm handler (cross-browser)
browser.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
});

browser.alarms.create('periodicSync', {
  periodInMinutes: 15
});
```

## Reference

- [MDN: Chrome incompatibilities](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Chrome_incompatibilities)
- [MDN: Firefox WebExtensions](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions)
- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
- [webextension-polyfill GitHub](https://github.com/mozilla/webextension-polyfill)
- [Mozilla Add-on Developer Hub](https://addons.mozilla.org/)

## Summary

Porting Chrome extensions to Firefox requires attention to:

1. Manifest differences: Use MV3 with browser-specific settings
2. API namespaces: Use `browser.*` with polyfill for cross-browser code
3. Async patterns: Handle Promises and callbacks appropriately
4. Background scripts: Understand service worker lifecycle differences
5. Packaging: Adjust build process for Firefox distribution
6. Distribution: Use AMO signing or self-hosted updates
7. Feature detection: Always check API availability at runtime

Following these patterns ensures a smooth porting experience with minimal browser-specific code.
