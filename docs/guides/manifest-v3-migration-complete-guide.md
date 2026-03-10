---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3, covering service workers, declarativeNetRequest, permission changes, and testing strategies.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Google's transition from Manifest V2 to Manifest V3 represents the most significant change to Chrome extension development in a decade. This migration affects every aspect of extension architecture, from background script execution to network request handling. This comprehensive guide walks you through the complete migration process, highlighting critical differences, common pitfalls, and best practices for a smooth transition.

## Understanding MV2 vs MV3 Architecture Differences

Manifest V2 and Manifest V3 differ fundamentally in how Chrome extensions operate. In MV2, extensions could execute persistent background pages that remained loaded continuously, with direct access to all Chrome APIs and the ability to run arbitrary JavaScript code fetched from remote servers. This architecture provided maximum flexibility but created significant security vulnerabilities and performance concerns.

Manifest V3 introduces a more restricted, security-focused model. The most dramatic change is the replacement of persistent background pages with event-driven service workers. Unlike background pages that loaded continuously, service workers activate only when needed and terminate after completing their tasks. This dramatically reduces memory consumption but requires developers to rethink state management and long-running operations.

The permission system also underwent substantial tightening. MV3 eliminates several powerful capabilities, including the ability to execute remote code, blocking web requests in real-time, and accessing cookies across all sites without restriction. These changes protect user privacy but require developers to adopt new patterns for achieving similar functionality.

Your extension's manifest.json file serves as the blueprint for these architectural differences. The `manifest_version` field switches from 2 to 3, and the `background` section transforms from specifying a persistent page to declaring a service worker.

## Background Page to Service Worker Migration

The shift from background pages to service workers represents the most challenging aspect of MV3 migration. Understanding the service worker lifecycle is essential for successful migration.

Service workers in extensions follow the same event-driven model as web service workers, but with access to Chrome-specific extension APIs. They initialize when needed, handle events, and then terminate to conserve resources. This means your extension cannot maintain in-memory state between events.

### Adapting to the Ephemeral Lifecycle

In MV2, you might have stored data in global variables:

```javascript
// MV2 Background Page
let cachedData = null;
let lastFetchTime = 0;

function getData() {
  if (cachedData && Date.now() - lastFetchTime < 60000) {
    return Promise.resolve(cachedData);
  }
  return fetch('/api/data').then(response => {
    cachedData = response.data;
    lastFetchTime = Date.now();
    return cachedData;
  });
}
```

For MV3, you must persist state using the chrome.storage API instead:

```javascript
// MV3 Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getData') {
    getData().then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function getData() {
  const { cachedData, lastFetchTime } = await chrome.storage.local.get(
    ['cachedData', 'lastFetchTime']
  );
  
  if (cachedData && Date.now() - lastFetchTime < 60000) {
    return cachedData;
  }
  
  const response = await fetch('/api/data');
  const data = await response.json();
  
  await chrome.storage.local.set({
    cachedData: data,
    lastFetchTime: Date.now()
  });
  
  return data;
}
```

### Handling Timers and Periodic Tasks

The chrome.alarms API replaces setInterval for scheduling recurring tasks, as service workers cannot maintain internal timers after termination:

```javascript
// MV3 Alarm-based scheduling
chrome.alarms.create('periodicSync', {
  periodInMinutes: 15
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSync') {
    performSync();
  }
});
```

For a complete guide on service worker patterns, see our [Chrome Extension Background Service Worker Guide](/docs/guides/chrome-extension-background-service-worker-guide/).

## webRequest to declarativeNetRequest Migration

The webRequest API in MV2 allowed extensions to observe and modify network requests in real-time. This powerful capability enabled ad blockers and privacy extensions but required broad permissions that posed significant privacy risks.

MV3's declarativeNetRequest API shifts request modification to a declarative model. Instead of intercepting each request programmatically, you define rules in JSON files that Chrome applies internally. This provides stronger privacy guarantees since your extension never sees the actual request data.

### Converting Blocking Rules

MV2 webRequest blocking:

```javascript
// MV2
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isAdUrl(details.url)) {
      return { cancel: true };
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);
```

MV3 declarativeNetRequest:

```javascript
// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": ".*\\.doubleclick\\.net",
      "resourceTypes": ["script", "image", "sub_frame"]
    }
  }
]
```

In your manifest.json:

```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

The declarativeNetRequest API offers several action types: block, allow, redirect, upgradeScheme, and modifyHeaders. Each rule specifies conditions using URL filters, resource types, and domain matching.

For dynamic rule management at runtime, use the chrome.declarativeNetRequest.updateDynamicRules API. This enables features like user-configurable filters without requiring manifest updates.

Our [Declarative Net Request Guide](/docs/guides/declarative-net-request/) provides detailed coverage of rule syntax, static versus dynamic rules, and advanced filtering patterns.

## Remote Code Elimination

MV3 explicitly prohibits loading and executing remote code. Your extension must contain all JavaScript it executes—this includes content scripts, background scripts, and any libraries you bundle.

This restriction prevents several previously common patterns:

**Bundled libraries required**: If you previously loaded external scripts from CDNs, you must now download and include them in your extension package. This affects analytics libraries, framework dependencies, and utility scripts.

**No eval() or new Function()**: These dynamic code execution methods no longer work in extension contexts. Review any code that generates functions dynamically.

**Inline scripts disallowed**: The `<script>` tags in HTML files must be converted to external script references. CSP headers in your manifest control this behavior.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

For extensions requiring significant dynamic behavior, consider using sandboxed pages with postMessage communication or evaluating user-provided scripts within isolated worlds.

## Content Script Changes

Content scripts undergo several subtle but important changes in MV3. They retain their ability to interact with web pages but face new restrictions.

**Manifest declaration remains similar**:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

**Key differences include**:

- Content scripts cannot use `fetch` with `localhost` or remote URLs unless you declare host permissions
- The `chrome.extension` API is deprecated; use `chrome.runtime` instead
- Message passing to the background works similarly but be aware of service worker lifecycle

Content scripts can now be injected programmatically with more flexibility using the chrome.scripting API:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => document.title
}).then(results => console.log(results[0].result));
```

## Permission Model Updates

MV3 introduces a refined permission model that separates mandatory permissions from optional ones. Understanding this distinction helps you request only necessary access and improves user trust.

### Host Permissions

Host permissions in MV3 work differently than MV2. The `host_permissions` field in manifest.json handles website access separately from other permissions:

```json
{
  "permissions": ["storage", "alarms", "activeTab"],
  "host_permissions": ["https://*.example.com/*"]
}
```

The `activeTab` permission deserves special attention. It grants temporary access to the current tab only when the user invokes your extension (typically through a popup click or keyboard shortcut). This permission provides a user-friendly alternative to broad host access:

```json
{
  "permissions": ["activeTab"]
}
```

### Permission Trimming

Review your extension's requested permissions carefully. The Chrome Web Store may reject extensions requesting unnecessary permissions. Common reductions include:

- Replace `<all_urls>` host permission with specific domains or activeTab
- Use declarativeNetRequest instead of webRequest for network filtering
- Prefer optional permissions that users explicitly enable

## Action API Migration

MV3 consolidates the browser action and page action APIs into a unified action API. This simplifies extension development but requires manifest and code updates.

**Manifest changes**:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

**API updates**:

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000' });

// MV3
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
```

The action API also introduces new capabilities like programmatic badge updates and title management that work identically to the deprecated APIs.

## Storage Patterns

Extension storage requires adaptation for the service worker model. The chrome.storage API remains available but behaves differently when your background code terminates unexpectedly.

**Use chrome.storage for persistent data**:

```javascript
// Storing user preferences
await chrome.storage.sync.set({
  theme: 'dark',
  notifications: true
});

// Retrieving with defaults
const { theme, notifications = true } = await chrome.storage.sync.get(['theme', 'notifications']);
```

**Consider chrome.storage.manifest** for extension configuration that rarely changes, and chrome.storage.session for temporary data that need not persist across sessions.

**IndexedDB for complex data**: For large datasets or complex queries, IndexedDB provides better performance. Use the idb library wrapper for Promise-based syntax:

```javascript
import { openDB } from 'idb';

const db = await openDB('extension-db', 1, {
  upgrade(db) {
    db.createObjectStore('cache', { keyPath: 'url' });
  }
});

await db.put('cache', { url, data, timestamp: Date.now() });
```

## Step-by-Step Migration Checklist

Use this checklist to track your MV3 migration progress:

1. **Update manifest.json**: Change `manifest_version` to 3, restructure background section, separate host_permissions
2. **Migrate background scripts**: Convert to service worker, implement chrome.storage for state, use chrome.alarms for scheduling
3. **Update network rules**: Convert webRequest listeners to declarativeNetRequest rules JSON
4. **Bundle dependencies**: Download all external scripts and include in package
5. **Update content scripts**: Review API usage, test message passing
6. **Migrate action API**: Rename browserAction/pageAction to action
7. **Audit permissions**: Remove unnecessary permissions, consider optional permissions
8. **Test comprehensively**: Verify all features work in MV3 environment
9. **Update Chrome Web Store listing**: Note MV3 compatibility

## Common Pitfalls

**Forgetting service worker termination**: Service workers shut down after events complete. Never assume your code continues running.

**Ignoring asynchronous patterns**: Many extension APIs return promises. Use async/await consistently:

```javascript
// Wrong - assuming sync execution
const data = chrome.storage.local.get('key');
console.log(data.key); // undefined

// Correct - handling async properly
const data = await chrome.storage.local.get('key');
console.log(data.key); // works
```

**Missing host permissions for content scripts**: If your content script needs to access page content or make network requests, ensure host permissions are declared.

**Not testing with反腐败 extensions**: Use Chrome's extension debugging mode to test service worker behavior thoroughly.

## Testing Strategy

Effective MV3 testing requires understanding the service worker lifecycle and testing across different scenarios. Unlike MV2 background pages that remained loaded, MV3 service workers can terminate and restart at any time, making comprehensive testing essential.

**Use Chrome's debugging tools**: Access service worker inspection through chrome://extensions or the Application panel in DevTools. The Service Workers pane shows active workers, their status, and provides controls to stop, update, and inspect them.

**Test lifecycle events**: Verify your extension handles installation, update, and startup correctly:

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time setup
  } else if (details.reason === 'update') {
    // Migration from previous version
  }
});
```

**Test across contexts**: Verify popup, background, and content script communication works reliably. Pay special attention to message passing timing, as service workers may not be running when you expect them to be.

**Simulate service worker termination**: Manually stop the service worker in DevTools to verify your extension handles wake-up events correctly. Any unhandled state will be lost, so ensure all critical data persists to storage.

**Use automated testing**: Chrome provides extension testing capabilities through Puppeteer or Playwright:

```javascript
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Load unpacked extension
  const extensionPath = path.resolve('./dist');
  await context.browser().extensions().load(extensionPath);
})();
```

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 phase-out:

- **January 2023**: New extensions no longer accepted with Manifest V2
- **June 2023**: Chrome Web Store stopped updating existing MV2 extensions
- **January 2024**: Enterprise administrators could disable MV2 support
- **2024-2025**: Gradual enforcement with user-facing warnings

Extensions must migrate to Manifest V3 to remain functional. The Chrome team has stated that MV2 will be fully deprecated, making migration mandatory rather than optional.

---

## Conclusion

Migrating from Manifest V2 to Manifest V3 requires careful attention to architectural changes, particularly the shift to service workers and the declarativeNetRequest API. While the process involves significant updates, the resulting extensions are more secure, more performant, and better aligned with user privacy expectations.

Start your migration by updating your manifest, then methodically work through each component—background scripts, network rules, content scripts, and permissions. Test thoroughly at each stage, and take advantage of Chrome's debugging tools to identify issues early.

For more detailed information on specific topics, explore our guides on [Background Service Workers](/docs/guides/chrome-extension-background-service-worker-guide/) and [Declarative Net Request](/docs/guides/declarative-net-request/).

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one*
