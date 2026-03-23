# Manifest V3 Migration Guide

## Overview

Manifest V3 (MV3) is the latest version of the Chrome Extensions platform, introducing significant changes to improve security, performance, and user privacy. This comprehensive guide covers every aspect of migrating from Manifest V2 (MV2) to MV3, with practical examples and common pitfalls to avoid.

## Timeline and Chrome Web Store Requirements

Important Dates:
- June 2024: Warning banners appeared in Chrome Web Store for MV2 extensions
- October 2024: Chrome began disabling MV2 extensions on stable channel
- Present: MV3 is required for all new submissions and updates

All extensions must migrate to Manifest V3 to remain in the Chrome Web Store. The migration involves changes to the manifest file, background scripts, permissions, and various APIs.

## Manifest Field Changes

### Basic Manifest Migration

```json
// MV2 - manifest.json
{
  "manifest_version": 2,
  "name": "My Extension",
  "version": "1.0",
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  },
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "permissions": [
    "tabs",
    "storage",
    "https://example.com/*"
  ],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}

// MV3 - manifest.json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "permissions": [
    "tabs",
    "storage"
  ],
  "host_permissions": [
    "https://example.com/*"
  ],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

### Key Manifest Changes

| MV2 Field | MV3 Field | Notes |
|-----------|-----------|-------|
| `manifest_version: 2` | `manifest_version: 3` | Required |
| `background.scripts` | `background.service_worker` | Single file, no array |
| `background.persistent` | Removed | Service workers are non-persistent |
| `browser_action` | `action` | Unified API |
| `page_action` | `action` | Unified API |
| Host patterns in `permissions` | `host_permissions` | Separated in MV3 |
| `content_security_policy` | `content_security_policy` object | Now uses object format |

### Web Accessible Resources

```json
// MV2
"web_accessible_resources": [
  "images/*",
  "styles/main.css"
]

// MV3 - must specify which pages can access
"web_accessible_resources": [
  {
    "resources": ["images/*", "styles/main.css"],
    "matches": ["<all_urls>"]
  }
]
```

## Background Pages to Service Workers

The most significant change in MV3 is replacing persistent background pages with service workers. This affects how you write and structure your extension's background logic.

### Service Worker Basics

```javascript
// MV3 Service Worker (background.js)
// Runs in isolated global context - no DOM access

// ALL event listeners MUST be registered at top level
// Do NOT wrap in async functions or callbacks

// Good: Top-level registration
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  initializeExtension();
});

chrome.alarms.create('sync', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync') {
    performSync();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getData') {
    getData().then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

// Bad: This listener may not be registered in time
async function init() {
  chrome.runtime.onInstalled.addListener(() => {}); // Won't work!
}
init();
```

### Handling State in Service Workers

```javascript
// Service workers are stateless - all data is lost on termination
// Use chrome.storage for persistence

// Instead of global variables
let cachedData = null; // Lost on every wake-up!

// Use storage
const storage = {
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }
};

// Initialize on each wake-up
async function initialize() {
  const lastInit = await storage.get('lastInit');
  const now = Date.now();
  
  // Check if we need to refresh cached data
  if (!lastInit || now - lastInit > 24 * 60 * 60 * 1000) {
    await refreshData();
  }
  
  await storage.set('lastInit', now);
}

// Lazy loading pattern
let config = null;
async function getConfig() {
  if (!config) {
    const stored = await storage.get('config');
    config = stored ? JSON.parse(stored) : DEFAULT_CONFIG;
  }
  return config;
}
```

### Replacing setTimeout/setInterval

```javascript
// MV2 - background page
setTimeout(() => {
  doSomething();
}, 60000); // Works in background page

// MV3 - service worker
// Use chrome.alarms instead

// Create alarm (minimum 1 minute interval)
chrome.alarms.create('reminder', {
  delayInMinutes: 1,
  periodInMinutes: 1
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'reminder') {
    doSomething();
  }
});
```

### Using Offscreen Documents for DOM Operations

```javascript
// Service workers can't access DOM
// Use offscreen documents for: DOM parsing, canvas, video, etc.

// Create offscreen document
async function createOffscreen() {
  const offscreenUrl = 'offscreen.html';
  
  // Check if already exists
  const contexts = await chrome.contextMenus.getContexts({});
  const hasOffscreen = contexts.some(c => c.contextType === 'offscreen');
  
  if (!hasOffscreen) {
    await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ['DOM_PARSER', 'CLIPBOARD', 'WEB_RTC'],
      justification: 'Need DOM parser for HTML processing'
    });
  }
}

// In offscreen.html
<script>
  // This runs in a real window context with DOM
  self.onmessage = async (event) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(event.data.html, 'text/html');
    const title = doc.querySelector('title')?.textContent;
    self.postMessage({ title });
  };
</script>
```

## chrome.browserAction to chrome.action

The `browserAction` and `page_action` APIs are unified into a single `action` API in MV3.

### API Changes

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000' });
chrome.browserAction.setTitle({ title: 'My Extension' });
chrome.browserAction.setIcon({ path: 'icon.png' });
chrome.browserAction.setPopup({ popup: 'popup.html' });

// MV3 - use chrome.action
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
chrome.action.setTitle({ title: 'My Extension' });
chrome.action.setIcon({ path: 'icon.png' });
chrome.action.setPopup({ popup: 'popup.html' });

// Checking if action is enabled
chrome.action.canToggle((result) => {
  console.log('Can toggle:', result);
});

// In MV3, you can also get the action's current state
chrome.action.getBadgeText({}, (result) => {
  console.log('Badge text:', result);
});
```

### Manifest Changes for Actions

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    },
    "default_title": "My Extension",
    "default_badge": "NEW"
  }
}
```

## Blocking webRequest to declarativeNetRequest

MV3 removes the ability to block or modify web requests synchronously. You must use the declarativeNetRequest API instead.

### Basic Migration

```javascript
// MV2 - blocking webRequest
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('ads.example.com')) {
      return { cancel: true }; // Block the request
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

// MV3 - declarativeNetRequest
// manifest.json
{
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}

// rules.json (static rules)
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "ads.example.com",
      "resourceTypes": ["main_frame", "sub_frame"]
    }
  }
]
```

### Dynamic Rules

```javascript
// For rules that change at runtime, use dynamic rules

// Add dynamic rule
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 1001,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          url: 'https://example.com/blocked.html'
        }
      },
      condition: {
        urlFilter: 'example.com/ads/*',
        resourceTypes: ['main_frame']
      }
    }
  ],
  removeRuleIds: [1001]
});

// Get current dynamic rules
chrome.declarativeNetRequest.getDynamicRules((rules) => {
  console.log('Current dynamic rules:', rules);
});
```

### Header Modification

```javascript
// MV2 - modifying headers
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    details.requestHeaders.push({
      name: 'X-Custom-Header',
      value: 'custom-value'
    });
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders']
);

// MV3 - use declarativeNetRequest with modifyHeaders
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 2001,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'X-Custom-Header', operation: 'set', value: 'custom-value' },
          { header: 'User-Agent', operation: 'remove' }
        ]
      },
      condition: {
        urlFilter: 'api.example.com',
        resourceTypes: ['xmlhttprequest']
      }
    }
  ]
});
```

### Ruleset Limits

| Rule Type | Limit |
|-----------|-------|
| Static rules (rules.json) | 30,000 rules |
| Dynamic rules | 30,000 rules |
| Session rules | 10,000 rules |

## Remotely Hosted Code Restrictions

MV3 prohibits loading remote code (JavaScript or Wasm) from external sources. All code must be bundled with the extension.

### What Changed

```javascript
// MV2 - could load remote scripts
const script = document.createElement('script');
script.src = 'https://cdn.example.com/library.js';
document.head.appendChild(script);

// MV3 - PROHIBITED
// This will fail with CSP violation

// Must bundle all code locally
// Put library.js in your extension and reference it
const script = document.createElement('script');
script.src = '/lib/library.js'; // Bundled with extension
document.head.appendChild(script);
```

### Migration Strategies

```javascript
// 1. Bundle dependencies
// Use a bundler (webpack, rollup, vite) to include all dependencies

// webpack.config.js example
module.exports = {
  entry: './src/background.js',
  output: {
    filename: 'background.js',
    path: '/dist'
  },
  externals: {
    // Don't fetch these from CDN
  }
};

// 2. For large libraries, consider using ES modules
// manifest.json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}

// background.js
import { createStore } from './lib/redux.js';
import { parseHTML } from './lib/domparser.js';
```

### Web Workers

```javascript
// Inline worker (MV3 compatible)
const workerCode = `
  self.onmessage = (e) => {
    self.postMessage(e.data * 2);
  };
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const worker = new Worker(workerUrl);

// Or use offscreen document for more complex worker needs
```

## Content Security Policy Changes

MV3 imposes stricter Content Security Policy (CSP) rules.

### New CSP Requirements

```json
// MV2
"content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'"

// MV3 - must use object format
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'",
  "sandbox": "sandbox allow-scripts; sandbox-forms 'self'"
}
```

### Restrictions

| MV2 | MV3 | Impact |
|-----|-----|--------|
| `unsafe-eval` allowed | Not allowed | No `eval()`, `new Function()`, `setTimeout(string)` |
| Remote scripts allowed | Not allowed | All code must be bundled |
| `file://` access | Limited | Use `chrome.runtime.getURL()` |
| Inline scripts | Limited | Use external files or `chrome.runtime.getURL()` |

### Working Without unsafe-eval

```javascript
// MV2 - using eval (PROHIBITED in MV3)
const result = eval('(' + jsonString + ')'); // Won't work!

// MV3 - use JSON.parse
const result = JSON.parse(jsonString);

// MV2 - dynamic function (PROHIBITED in MV3)
const fn = new Function('a', 'b', 'return a + b');

// MV3 - use arrow functions or predefined functions
const fn = (a, b) => a + b;
```

### Loading External Resources

```javascript
// MV2 - could load external images/styles
<img src="https://cdn.example.com/image.png">

// MV3 - must use local resources
<img src="/images/image.png">

// For user-provided URLs (e.g., in popup), use chrome.runtime.getURL
const iconUrl = chrome.runtime.getURL('images/icon.png');

// For fetching remote data, use fetch (allowed for data retrieval)
fetch('https://api.example.com/data')
  .then(res => res.json())
  .then(data => { /* use data */ });
```

## Host Permissions Separation

MV3 separates host permissions from API permissions, requiring explicit declaration of host access.

### Permission Changes

```json
// MV2 - all in permissions
{
  "permissions": [
    "tabs",
    "storage",
    "https://example.com/*",
    "<all_urls>"
  ],
  "browser_action": {}
}

// MV3 - separated
{
  "permissions": [
    "tabs",
    "storage"
  ],
  "host_permissions": [
    "https://example.com/*",
    "<all_urls>"
  ],
  "action": {}
}
```

### Permission Types

```json
{
  "permissions": [
    "alarms",
    "storage", 
    "scripting",
    "declarativeNetRequest",
    "contextMenus",
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.google.com/*",
    "https://api.myapp.com/*"
  ],
  "optional_permissions": [
    "bookmarks",
    "history"
  ]
}
```

### Requesting Permissions at Runtime

```javascript
// Request optional permissions
async function requestOptionalPermission() {
  const granted = await chrome.permissions.request({
    permissions: ['bookmarks'],
    origins: ['https://example.com/*']
  });
  
  if (granted) {
    console.log('Permission granted');
  }
}

// Check current permissions
chrome.permissions.contains({
  permissions: ['storage'],
  origins: ['https://example.com/*']
}, (result) => {
  console.log('Has permissions:', result);
});
```

## Promise-based API Migration

MV3 APIs return Promises instead of using callbacks, enabling cleaner async/await code.

### Callback to Promise Pattern

```javascript
// MV2 - callback-based
chrome.storage.local.get('key', (result) => {
  console.log(result.key);
});

// MV3 - Promise-based
const result = await chrome.storage.local.get('key');
console.log(result.key);

// Still works with callbacks for backward compatibility
chrome.storage.local.get('key', (result) => {
  console.log(result.key);
});
```

### Async/Await Migration

```javascript
// MV2 - nested callbacks (callback hell)
function getData() {
  chrome.storage.local.get('userId', (result) => {
    const userId = result.userId;
    fetch('https://api.example.com/users/' + userId)
      .then(response => response.json())
      .then(user => {
        chrome.storage.local.set({ user }, () => {
          chrome.runtime.sendMessage({ type: 'dataReady' });
        });
      });
  });
}

// MV3 - clean async/await
async function getData() {
  const { userId } = await chrome.storage.local.get('userId');
  const response = await fetch('https://api.example.com/users/' + userId);
  const user = await response.json();
  await chrome.storage.local.set({ user });
  chrome.runtime.sendMessage({ type: 'dataReady' });
}
```

### API Promise Support

Most extension APIs support promises in MV3:
- `chrome.storage.*`
- `chrome.runtime.*` (except some methods)
- `chrome.tabs.*`
- `chrome.windows.*`
- `chrome.bookmarks.*`
- `chrome.history.*`
- `chrome.contextMenus.*`
- `chrome.alarms.*`

```javascript
// Batch operations
const results = await chrome.storage.local.get(['key1', 'key2', 'key3']);
await chrome.storage.local.set({ key1: 'value1', key2: 'value2' });
await chrome.storage.local.remove(['key1', 'key2']);

// Promise.all for parallel operations
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const [window] = await chrome.windows.getCurrent();
```

## executeScript API Changes

The `chrome.tabs.executeScript` and `chrome.tabs.insertCSS` APIs have been replaced with the `chrome.scripting` API.

### Script Injection

```javascript
// MV2 - executeScript
chrome.tabs.executeScript(tabId, {
  code: 'document.body.style.backgroundColor = "red";'
}, (results) => {
  console.log('Result:', results[0]);
});

chrome.tabs.executeScript(tabId, {
  file: 'content.js'
});

// MV3 - chrome.scripting
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => document.body.style.backgroundColor = 'red'
});

await chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
});
```

### CSS Injection

```javascript
// MV2 - insertCSS
chrome.tabs.insertCSS(tabId, {
  code: 'body { background: blue; }',
  cssOrigin: 'user'
});

chrome.tabs.insertCSS(tabId, {
  file: 'styles.css'
});

// MV3 - chrome.scripting.insertCSS
await chrome.scripting.insertCSS({
  target: { tabId: tabId },
  css: 'body { background: blue; }',
  origin: 'USER'
});

await chrome.scripting.insertCSS({
  target: { tabId: tabId },
  files: ['styles.css']
});
```

### Injection Results and Errors

```javascript
// MV3 - results are returned in results array
const results = await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => document.title
});
console.log('Title:', results[0].result);

// Handle errors with try/catch
try {
  await chrome.scripting.executeScript({
    target: { tabId: invalidTabId },
    func: () => document.title
  });
} catch (error) {
  console.error('Injection failed:', error.message);
}

// Use 'world' option for isolated world (like MV2)
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => { /* code */ },
  world: 'MAIN',  // Execute in page's JavaScript context
  injectImmediately: true  // Execute before page loads
});
```

## Testing Migration Completeness

### Using chrome://extensions

1. Enable Developer mode
2. Load unpacked extension
3. Check for warnings/errors in the console
4. Test all features manually

### Automated Testing

```javascript
// Test service worker wake-up
chrome.alarms.create('testAlarm', { delayInMinutes: 0.1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'testAlarm') {
    console.log('Service worker wake-up working');
  }
});

// Test storage persistence
async function testStorage() {
  await chrome.storage.local.set({ testKey: 'testValue' });
  const result = await chrome.storage.local.get('testKey');
  console.assert(result.testKey === 'testValue', 'Storage failed');
}

// Test messaging
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  sendResponse({ received: true });
});
```

### Migration Audit Checklist

- [ ] All background scripts use service worker patterns
- [ ] No DOM operations in service worker
- [ ] No setTimeout/setInterval (use chrome.alarms)
- [ ] All state persisted in chrome.storage
- [ ] All event listeners at top level
- [ ] browserAction/pageAction replaced with action
- [ ] webRequest blocking replaced with declarativeNetRequest
- [ ] Host permissions in host_permissions array
- [ ] No remote code loading
- [ ] No unsafe-eval or unsafe-inline
- [ ] executeScript replaced with chrome.scripting
- [ ] All APIs use promises or callback handling
- [ ] Extension loads without errors
- [ ] All features work in MV3

## Common Migration Pitfalls

### 1. Top-Level Event Listeners

```javascript
// WRONG - Service worker terminates before listener registers
async function init() {
  chrome.runtime.onInstalled.addListener(() => {}); // Too late!
}
init();

// CORRECT - Register at top level
chrome.runtime.onInstalled.addListener(() => {});
```

### 2. Global State Lost on Wake-up

```javascript
// WRONG - Data lost when service worker restarts
let userData = null;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  sendResponse(userData); // null after first wake-up!
});

// CORRECT - Use storage
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  const { userData } = await chrome.storage.local.get('userData');
  sendResponse(userData);
});
```

### 3. Forgetting Host Permissions

```javascript
// WRONG - Extension can't access sites
"permissions": ["tabs", "storage"]

// CORRECT - Add host permissions
"permissions": ["tabs", "storage"],
"host_permissions": ["https://example.com/*"]
```

### 4. Using Old API Names

```javascript
// WRONG - These don't exist in MV3
chrome.browserAction.setBadgeText({ text: '5' });
chrome.pageAction.show(tabId);

// CORRECT - Use chrome.action
chrome.action.setBadgeText({ text: '5' });
```

### 5. Blocking webRequest

```javascript
// WRONG - Blocking webRequest removed in MV3
chrome.webRequest.onBeforeRequest.addListener(
  (details) => ({ cancel: true }),
  { urls: ['<all_urls>'] },
  ['blocking']
);

// CORRECT - Use declarativeNetRequest
// rules.json
[{
  "id": 1,
  "action": { "type": "block" },
  "condition": { "urlFilter": "ads.example.com" }
}]
```

### 6. Remote Code Loading

```javascript
// WRONG - CSP violation
const script = document.createElement('script');
script.src = 'https://cdn.example.com/lib.js';

// CORRECT - Bundle locally
const script = document.createElement('script');
script.src = chrome.runtime.getURL('lib/bundled.js');
```

### 7. Wrong Storage Key Access

```javascript
// WRONG - Treats entire result as value
const user = await chrome.storage.local.get('user');
console.log(user); // { user: {...} }

// CORRECT - Destructure the key
const { user } = await chrome.storage.local.get('user');
console.log(user); // {...}
```

## Using webextension-polyfill for Compatibility

The [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) library provides Promise-based APIs that work across both MV2 and MV3, making it easier to maintain compatibility.

### Installation

```bash
npm install webextension-polyfill
```

### Basic Usage

```javascript
// Import in your background script
import browser from 'webextension-polyfill';

// Promise-based API - works in both MV2 and MV3
await browser.storage.local.set({ key: 'value' });
const result = await browser.storage.local.get('key');

// Query tabs
const tabs = await browser.tabs.query({ active: true });

// Send messages
await browser.runtime.sendMessage({ message: 'hello' });
```

### With TypeScript

```typescript
import browser from 'webextension-polyfill';

interface MyMessage {
  type: 'GET_DATA';
  payload?: unknown;
}

// Fully typed messaging
browser.runtime.sendMessage({
  type: 'GET_DATA',
  payload: { id: 123 }
} as MyMessage);
```

### Benefits

1. Cross-manifest compatibility: Same code works in MV2 and MV3
2. Promise-based: Clean async/await syntax
3. TypeScript support: Full type definitions included
4. Familiar API: Matches Firefox extension API

## Reference

- Official Migration Guide: [developer.chrome.com/docs/extensions/develop/migrate](https://developer.chrome.com/docs/extensions/develop/migrate)
- Manifest V3 Overview: [developer.chrome.com/docs/extensions/mv3/intro](https://developer.chrome.com/docs/extensions/mv3/intro)
- Service Worker Best Practices: [developer.chrome.com/docs/extensions/mv3/service-workers](https://developer.chrome.com/docs/extensions/mv3/service-workers)
- Declarative Net Request: [developer.chrome.com/docs/extensions/mv3/reference/declarativeNetRequest](https://developer.chrome.com/docs/extensions/mv3/reference/declarativeNetRequest)
- Scripting API: [developer.chrome.com/docs/extensions/reference/scripting](https://developer.chrome.com/docs/extensions/reference/scripting)

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.