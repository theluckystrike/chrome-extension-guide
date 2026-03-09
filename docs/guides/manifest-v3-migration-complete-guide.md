---

layout: guide
title: Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covering background page to service worker migration, webRequest to declarativeNetRequest, permission updates, and testing strategies.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's Manifest V3 represents the most significant transformation in Chrome extension development since the platform's inception. This comprehensive guide walks you through every aspect of migrating your extension from Manifest V2 to Manifest V3, addressing architectural changes, API replacements, and the new security model that defines modern Chrome extension development.

The migration process involves far more than updating a version number in your manifest file. You'll need to rethink how your extension handles background tasks, network requests, content scripts, and state management. This guide provides a systematic approach to understanding each change, implementing the required modifications, and testing your migrated extension to ensure it meets Chrome's MV3 requirements while maintaining (or improving) its original functionality.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental difference between Manifest V2 and Manifest V3 lies in how the extension's background component operates. In MV2, background pages ran as persistent HTML pages that stayed alive throughout the browser session. This persistent model allowed developers to maintain global state, run continuous timers, and keep DOM elements accessible at all times. The background page would initialize when Chrome started and remain active until the browser closed, consuming system resources even when the extension wasn't actively performing tasks.

Manifest V3 replaces this persistent background page with an event-driven service worker model. Service workers are ephemeral by design—they activate when triggered by specific events and terminate after a period of inactivity, typically around 30 seconds. This architectural shift offers significant benefits: reduced memory consumption, improved security through shorter attack surfaces, and more efficient system resource utilization. However, it requires developers to adopt new patterns for maintaining state, scheduling tasks, and handling long-running operations.

The service worker model means your background code executes in response to events rather than running continuously. When Chrome needs to handle an extension event—such as a message from a content script, a browser action, or an alarm—it wakes up your service worker, executes the relevant handlers, and then allows the worker to terminate when idle. This event-driven approach aligns Chrome extensions with modern web service worker patterns but requires careful planning to ensure your extension remains responsive and maintains data consistency across worker lifecycle cycles.

The implications extend beyond the background script. Network request interception moves from the blocking webRequest API to the declarative declarativeNetRequest API. The action API consolidates browserAction and pageAction into a unified action API. Content scripts gain new capabilities but also face additional constraints. The permission model becomes more granular, requiring developers to request permissions more thoughtfully and handle dynamic permission requests for optional features.

### Key Architectural Shifts Summary

The transition from MV2 to MV3 involves several interconnected changes that affect virtually every part of your extension. Background pages become service workers with their event-driven lifecycle. The webRequest API transitions to declarativeNetRequest with its rule-based approach to network modification. Host permissions become more restricted, encouraging developers to request only what's necessary. The action API unifies what were previously separate browser actions and page actions. Remote code execution—loading scripts from external URLs—no longer functions, requiring all code to be bundled within the extension package.

Understanding these changes holistically helps you plan your migration strategy. Rather than treating each change as an isolated modification, consider how the new architectural model affects your extension's overall design. The goal is not merely to make your extension work under MV3 but to take advantage of the improved security and performance characteristics that MV3 provides.

## Migrating from Background Page to Service Worker

The background page to service worker migration represents the most substantial change in the MV2 to MV3 transition. Your existing background script likely maintains state in global variables, uses setInterval for recurring tasks, and directly accesses extension APIs at any time. Each of these patterns requires modification to work correctly with the service worker lifecycle.

### Converting Persistent State to Persistent Storage

In MV2, you might have stored extension state in global variables within your background page:

```javascript
// MV2 Background Page
let extensionState = {
  users: [],
  settings: {},
  cache: {}
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getState') {
    sendResponse(extensionState);
  }
  return true;
});
```

This approach fails in MV3 because the service worker terminates between events, losing all in-memory state. Instead, you must persist state to storage and restore it when the service worker activates:

```javascript
// MV3 Service Worker
let extensionState = null;

async function loadState() {
  const result = await chrome.storage.local.get(['users', 'settings', 'cache']);
  extensionState = {
    users: result.users || [],
    settings: result.settings || {},
    cache: result.cache || {}
  };
}

// Load state on service worker startup
loadState();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getState') {
    sendResponse(extensionState);
  }
  return true;
});

// Persist state when it changes
async function saveState() {
  await chrome.storage.local.set(extensionState);
}
```

The chrome.storage API provides persistent storage that survives service worker restarts. For better performance with large datasets, consider using chrome.storage.session for volatile data that doesn't need to persist across browser restarts, or use the IndexedDB API for complex data structures requiring indexed queries.

### Replacing Timers with Alarms

The setInterval and setTimeout functions don't work reliably in service workers because they can prevent the worker from terminating or fire after the worker has already shut down. The chrome.alarms API provides the recommended replacement:

```javascript
// MV2 Background Page
setInterval(() => {
  fetchUpdates();
}, 60000);
```

```javascript
// MV3 Service Worker
chrome.alarms.create('periodic-update', {
  delayInMinutes: 1,
  periodInMinutes: 1
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodic-update') {
    fetchUpdates();
  }
});
```

Alarms persist across service worker restarts, ensuring your scheduled tasks continue running even after Chrome terminates and restarts your worker. The alarm granularity is limited to approximately one minute minimum, which suits most extension use cases. For finer timing control, consider combining alarms with performance timestamps to track elapsed time across worker cycles.

### Handling Service Worker Lifecycle Events

Service workers in Chrome extensions follow a lifecycle similar to web service workers but with extension-specific behaviors. Understanding this lifecycle helps you design robust background code:

```javascript
// Service Worker Installation
self.addEventListener('install', (event) => {
  console.log('Service worker installing');
  // Precache resources if needed
  self.skipWaiting(); // Activate immediately
});

// Service Worker Activation
self.addEventListener('activate', (event) => {
  console.log('Service worker activating');
  // Clean up old caches, migrate data
  event.waitUntil(clients.claim()); // Take control of clients immediately
});

// Fetch event for intercepting requests (if needed)
self.addEventListener('fetch', (event) => {
  // Handle fetch events if using cache
});
```

For detailed guidance on service worker implementation patterns, including keep-alive strategies and advanced lifecycle management, see our [Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/).

## Migrating from webRequest to declarativeNetRequest

The webRequest API in MV2 allowed extensions to observe, analyze, and modify network requests in flight. This powerful capability came with a significant security tradeoff: it required the "webRequest" permission plus broad host permissions to function effectively. Malicious extensions could potentially intercept sensitive data from network requests.

Manifest V3 replaces this with the declarativeNetRequest API, which uses a rule-based system to specify modifications to network requests without reading the request content itself. This approach maintains privacy while still allowing extensions to block, redirect, or modify requests.

### Understanding the Rule-Based System

DeclarativeNetRequest uses JSON rules that define actions and conditions:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": ".*\\.doubleclick\\.net",
      "resourceTypes": ["script", "image", "sub_frame"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": { "url": "https://example.com/placeholder.png" }
    },
    "condition": {
      "urlFilter": ".*\\.tracker\\.com/ads/.*",
      "resourceTypes": ["image"]
    }
  }
]
```

These rules are loaded into Chrome at extension startup and applied automatically to matching network requests. The extension doesn't need to actively monitor requests—it specifies what should happen, and Chrome enforces the rules efficiently.

### Implementing Dynamic Rules

For rules that need to change at runtime, use dynamic rules:

```javascript
// Adding a dynamic rule
async function blockDomain(domain) {
  const rule = {
    id: Math.floor(Math.random() * 100000),
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `.*${escapeRegExp(domain)}.*`,
      resourceTypes: ['script', 'image', 'sub_frame', 'main_frame']
    }
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule]
  });
}

// Removing a dynamic rule
async function unblockDomain(domain) {
  // First, you'd need to track the rule ID
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId]
  });
}
```

The dynamic rules API allows your extension to adapt its filtering behavior based on user preferences or runtime conditions without requiring manifest updates or extension reloads.

For comprehensive documentation on implementing network filtering with declarativeNetRequest, including static rule configuration, dynamic rule management, and advanced matching patterns, see our [Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

## Remote Code Elimination

One of the most significant security changes in MV3 involves remote code execution. Extensions can no longer load and execute code from external URLs—all JavaScript and Wasm code must be bundled within the extension package. This eliminates the ability to push code updates without going through the Chrome Web Store review process.

### Implications for Extension Architecture

If your MV2 extension loads external scripts or evaluates dynamically fetched code, you'll need to restructure:

```javascript
// MV2 - Remote code loading (NO LONGER ALLOWED)
const script = document.createElement('script');
script.src = 'https://cdn.example.com/extension-script.js';
document.head.appendChild(script);

// Or using chrome.scripting.executeScript with URL
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['https://cdn.example.com/script.js'] // This will fail in MV3
});
```

For MV3, all code must be bundled:

```javascript
// MV3 - Bundled code only
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['scripts/content-script.js']
});

// For dynamic functionality, use function injection with parameters
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: (userConfig) => {
    // Your code here, using userConfig
    console.log('Running with config:', userConfig);
  },
  args: [{ theme: 'dark', language: 'en' }]
});
```

This change actually improves security by ensuring users can inspect all code that runs in their browser. However, it requires more careful planning of your build process and release cycle. Consider implementing feature flags within your bundled code to toggle functionality without requiring external code loading.

## Content Script Changes

Content scripts in MV3 gain some new capabilities while facing new constraints. The messaging system remains largely compatible, but you'll need to account for service worker lifecycle considerations in your communication patterns.

### Updated Content Script Injection

The scripting API provides more control over content script injection:

```javascript
// MV3 content script injection
chrome.scripting.registerContentScripts([{
  id: 'main-content-script',
  matches: ['<all_urls>'],
  js: ['content-script.js'],
  css: ['styles.css'],
  runAt: 'document_idle'
}]);
```

You can also inject scripts dynamically based on user actions:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => {
    // Code that runs in the page context
    return document.title;
  }
}).then(results => {
  console.log('Page title:', results[0].result);
});
```

### Cross-Origin Communication Considerations

Content scripts continue to run in the context of web pages but maintain access to the chrome.runtime API for communicating with the service worker. However, remember that the service worker may not be running when you send a message—it will be woken up to handle the message, but you should design for asynchronous response handling.

## Permission Model Updates

The permission model in MV3 becomes more granular and user-focused. Users see permission prompts at installation but can revoke certain permissions later through browser settings. This encourages developers to request only essential permissions and design extensions that function with minimal access.

### Host Permissions

Host permissions in MV3 are separated from other permissions in the manifest:

```json
{
  "permissions": [
    "storage",
    "alarms",
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "https://*.example.com/*",
    "http://localhost/*"
  ]
}
```

The separation makes it clearer to users what sites your extension can access. For extensions that need to function on many sites, consider using activeTab permission, which grants temporary access to the current tab only when the user explicitly invokes the extension.

### Optional Permissions

For features that aren't essential to your extension's core functionality, use optional permissions:

```javascript
// Declare in manifest
"optional_permissions": [
  "bookmarks",
  "history"
]

// Request at runtime when needed
chrome.permissions.request({
  permissions: ['bookmarks']
}, (granted) => {
  if (granted) {
    // Can now use bookmarks API
  }
});
```

This approach reduces the permission footprint at installation while still allowing users to access advanced features when they choose to enable them.

## Action API Migration

Manifest V2 distinguished between browserAction (extensions) and pageAction (specific page interactions). MV3 consolidates these into a single action API:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "32": "images/icon32.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    },
    "default_title": "My Extension"
  }
}
```

The action API provides consistent methods for controlling the extension's toolbar icon and popup across all contexts:

```javascript
// Setting badge text
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

// Enabling/disabling for specific tabs
chrome.action.disable(tabId);

// Setting title dynamically
chrome.action.setTitle({ title: 'My Extension - Enabled' });
```

## Storage Patterns in MV3

Storage in MV3 remains similar to MV2 but with improved options. The chrome.storage API provides sync, local, and session storage areas:

```javascript
// Sync storage - syncs across user's devices
chrome.storage.sync.set({ key: value }).then(() => console.log('Saved to sync'));

// Local storage - persists on device
chrome.storage.local.set({ key: value }).then(() => console.log('Saved locally'));

// Session storage - clears when browser closes
chrome.storage.session.set({ key: value }).then(() => console.log('Saved to session'));
```

For complex data persistence needs, IndexedDB provides a full database solution within the extension:

```javascript
// Using IndexedDB for complex data
const request = indexedDB.open('ExtensionDB', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  if (!db.objectStoreNames.contains('cache')) {
    db.createObjectStore('cache', { keyPath: 'id' });
  }
};

request.onsuccess = (event) => {
  const db = event.target.result;
  // Perform database operations
};
```

## Step-by-Step Migration Checklist

A systematic approach to migration reduces the risk of missing critical changes. Follow this checklist for a complete MV3 migration:

1. **Manifest Version Update**: Change manifest_version from 2 to 3 in your manifest.json file.

2. **Background Script Conversion**: Convert your background page to a service worker, implementing state persistence and using chrome.alarms for scheduling.

3. **Network Request Handling**: Replace webRequest blocking listeners with declarativeNetRequest rules.

4. **Action API Consolidation**: Merge browserAction and pageAction into a single action configuration.

5. **Permission Review**: Audit required permissions, separate host permissions, and implement optional permissions for non-essential features.

6. **Content Script Updates**: Review content script injection methods and update to use the scripting API.

7. **Remote Code Removal**: Bundle all external scripts and remove any code loading from external URLs.

8. **Storage Implementation**: Ensure all state persists correctly across service worker restarts.

9. **Testing**: Test all functionality in MV3 mode, including edge cases and permission scenarios.

10. **Chrome Web Store Submission**: Submit your updated extension with clear release notes explaining the MV3 migration.

## Common Migration Pitfalls

Several issues frequently arise during MV3 migration. Being aware of these helps you avoid wasted time debugging common problems.

**Service Worker Not Waking**: If your service worker isn't responding to events, ensure you're using the correct event types. Some APIs only work in specific contexts.

**State Loss**: Forgetting to load state from storage on service worker startup causes undefined behavior when the worker starts fresh after termination.

**Timer Issues**: Continuing to use setInterval instead of chrome.alarms causes unreliable scheduling and potential performance issues.

**Blocking WebRequest**: Attempting to use webRequest with blocking listeners fails silently in MV3—check for this if network interception stops working.

**External Code Loading**: Any attempt to load code from external URLs fails in MV3—review all script and stylesheet references.

## Testing Strategy

Thorough testing ensures your migrated extension functions correctly under MV3. Create a comprehensive test plan covering all user workflows:

**Manual Testing**: Walk through every feature, checking both the happy path and error conditions. Verify that extension icons, popups, and options pages work correctly.

**Permission Testing**: Test with minimal permissions granted, as users might install with reduced access. Verify graceful degradation when optional permissions aren't granted.

**Lifecycle Testing**: Close and reopen tabs, restart the browser, and trigger various events to verify the service worker lifecycle handles correctly.

**Performance Testing**: Monitor memory usage and verify the service worker terminates correctly when idle. Compare performance against your MV2 version.

**Chrome Flags Testing**: Test with relevant Chrome flags enabled, such as those for experimental features your extension might use.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 deprecation. Starting in 2023, Chrome began warning users about upcoming MV2 changes. The Chrome Web Store no longer accepts new MV2 extensions, and existing MV2 extensions will stop functioning in future Chrome versions.

The exact timing depends on Chrome's release schedule, but the direction is clear: all extensions must migrate to MV3. Extensions still running on MV2 will eventually stop working as Chrome removes support. The best strategy is to migrate proactively rather than waiting for the deadline.

For the most current timeline information, consult the official Chrome Extensions documentation and the Chrome Web Store developer dashboard. Google provides advance notice of deprecation milestones, typically several months between major changes.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one).*
