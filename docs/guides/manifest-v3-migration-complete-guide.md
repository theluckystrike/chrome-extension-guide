---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to V3, covering background service workers, declarativeNetRequest, permission changes, and testing strategies.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's Manifest V3 represents the most significant transformation in extension development history. Google introduced MV3 to enhance security, improve performance, and protect user privacy. This comprehensive guide walks you through every aspect of migrating your extension from Manifest V2 to Manifest V3, covering architectural changes, API replacements, and testing strategies you'll need for a successful transition.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental shift between Manifest V2 and Manifest V3 lies in how extensions handle background execution and network request interception. Understanding these differences is crucial before beginning your migration.

### Manifest V2 Background Page Architecture

In Manifest V2, background pages operate as persistent HTML pages that remain loaded throughout the browser session. These pages have full access to the DOM and maintain global state through JavaScript variables that persist for the extension's lifetime. Background pages in MV2 can use `setTimeout` and `setInterval` without concerns about termination, and they maintain persistent connections to servers through WebSockets or long-polling mechanisms.

The background page architecture in MV2 provides developers with a straightforward programming model. You declare a background script in your manifest, and Chrome loads it as a persistent page. This page can register event listeners, maintain in-memory state, and execute periodic tasks without worrying about the script being unloaded.

```javascript
// MV2 background.js - Persistent background page
let extensionState = {
  userData: null,
  cachedConfig: {},
  activeConnections: []
};

// This variable persists throughout the browser session
const API_POLL_INTERVAL = 30000;

setInterval(() => {
  fetchLatestData();
}, API_POLL_INTERVAL);

// Long-running connections work without issues
const ws = new WebSocket('wss://api.example.com/updates');
ws.onmessage = (event) => {
  handleUpdate(JSON.parse(event.data));
};
```

### Manifest V3 Service Worker Architecture

Manifest V3 replaces persistent background pages with service workers—event-driven scripts that terminate when idle and wake up to handle specific events. This architectural change significantly reduces resource consumption but requires developers to rethink how they manage state, handle timers, and maintain connections.

Service workers in MV3 follow the same lifecycle as web service workers. Chrome terminates service workers after approximately 30 seconds of inactivity, though this timeout can vary. When relevant events occur—such as extension icon clicks, message passing, or alarm triggers—the service worker wakes up, handles the event, and then terminates again after completing its work.

```javascript
// MV3 service-worker.js - Event-driven service worker
// State must be retrieved from storage when needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    chrome.storage.local.get(['state'], (result) => {
      sendResponse(result.state);
    });
    return true; // Keep channel open for async response
  }
});

// Use chrome.alarms instead of setInterval
chrome.alarms.create('dataSync', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dataSync') {
    syncData();
  }
});
```

The service worker architecture offers substantial benefits for browser resource usage. Extensions consume significantly less memory when idle, and the event-driven model encourages better coding practices. However, migrating requires careful attention to state management, timer implementation, and connection handling.

## Migrating from Background Pages to Service Workers

The transition from background pages to service workers represents the most significant change in your migration. For a detailed technical guide on this process, see our [Background Service Worker Guide](/docs/guides/background-service-worker/).

### Key Migration Steps

Start by updating your manifest file to declare a service worker instead of a background page. Remove the `background.scripts` or `background.page` property and replace it with `background.service_worker`.

```json
// manifest.json - MV2
{
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  }
}

// manifest.json - MV3
{
  "background": {
    "service_worker": "service-worker.js"
  }
}
```

Next, audit your background script for DOM access, global variables that need state persistence, and timer usage. Replace DOM manipulations with appropriate alternatives—service workers cannot access the DOM. Convert global variables to use `chrome.storage` APIs, and migrate `setTimeout`/`setInterval` to `chrome.alarms`.

### Handling State Persistence

Service workers don't maintain memory across invocations, so any state your extension needs must be stored using the Chrome Storage API. The `chrome.storage.local` API provides persistent storage with a 5MB quota, while `chrome.storage.sync` automatically syncs across the user's devices when they're signed into Chrome.

```javascript
// Migrating global state to chrome.storage
// Before (MV2)
let userPreferences = { theme: 'dark', notifications: true };

// After (MV3)
chrome.storage.local.get(['userPreferences'], (result) => {
  userPreferences = result.userPreferences || { theme: 'dark', notifications: true };
});

function updatePreferences(newPrefs) {
  userPreferences = { ...userPreferences, ...newPrefs };
  chrome.storage.local.set({ userPreferences });
}
```

### Timer and Alarm Migration

The `chrome.alarms` API replaces `setTimeout` and `setInterval` for scheduling future events. Unlike web timers, alarms persist across service worker terminations and can be configured with minimum intervals to prevent excessive CPU usage.

```javascript
// MV2 - Using setInterval
setInterval(() => {
  checkForNotifications();
}, 60000);

// MV3 - Using chrome.alarms
chrome.alarms.create('checkNotifications', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkNotifications') {
    checkForNotifications();
  }
});
```

## webRequest to declarativeNetRequest Migration

One of the most consequential changes in Manifest V3 involves network request interception. The powerful `webRequest` API, which allowed extensions to observe and modify any network request, has been replaced by the more restricted `declarativeNetRequest` API. For in-depth coverage of this API, consult our [Declarative Net Request Guide](/docs/guides/declarative-net-request/).

### Understanding the Change

The `webRequest` API in MV2 required broad host permissions—often `"<all_urls>"` or `"*://*/*"`—to function effectively. This meant extensions could potentially intercept, modify, or block any network request, raising significant privacy and security concerns. The `declarativeNetRequest` API addresses these concerns by shifting request modification to a declarative model where extensions specify rules in advance, and Chrome enforces them without granting runtime access to request details.

### Implementing Declarative Rules

Declarative Net Request uses rule sets defined in JSON files. Each rule specifies conditions matching certain requests and actions to take when those conditions are met. Rules are statically defined and bundled with the extension, preventing runtime manipulation.

```json
// rules.json - MV3 declarativeNetRequest rules
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": ".*\\.ad\\..*",
      "resourceTypes": ["script", "image"]
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
      "urlFilter": ".*tracking\\.gif",
      "resourceTypes": ["image"]
    }
  }
]
```

### Updating Your Manifest

Declare the ruleset in your manifest and specify the required permissions.

```json
{
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "*://*/*"
  ],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

### Handling Dynamic Rules

For extensions that need to add or modify rules at runtime, the `declarativeNetRequest` API provides dynamic rule management through the `chrome.declarativeNetRequest.updateDynamicRules` method. However, these dynamic rules still operate within the declarative framework and cannot inspect individual request content.

```javascript
// Adding dynamic rules at runtime
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 1001,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: 'example.com/tracker',
        resourceTypes: ['script']
      }
    }
  ],
  removeRuleIds: [1001]
});
```

## Remote Code Elimination

Manifest V3 prohibits loading remote code—JavaScript or Wasm files from external URLs must be included in the extension package. This change significantly improves security by ensuring that extensions cannot be modified post-publication to include malicious code.

### What This Means for Your Extension

If your MV2 extension loads JavaScript from external servers or CDNs, you must bundle all code within the extension package. This applies to libraries, frameworks, and any dynamically-loaded scripts. Update your build process to download and include dependencies locally.

```javascript
// MV2 - Loading remote code (NOT ALLOWED IN MV3)
// <script src="https://cdn.example.com/library.js"></script>

// MV3 - Bundle the library in your extension
// <script src="library.js"></script>
```

For legitimate use cases like loading configuration data, use `fetch` within the extension to retrieve JSON or other data files that you've bundled, rather than executable code.

## Content Script Changes

Content scripts in MV3 work similarly to MV2 with some important differences. Content scripts can still be injected into web pages, but they run in an isolated world with limited access to Chrome APIs.

### Manifest Declaration

Content script declaration remains largely the same, but ensure you're following best practices for performance and security.

```json
{
  "content_scripts": [
    {
      "matches": ["*://*.example.com/*"],
      "js": ["content-script.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

### Communication with Service Workers

Content scripts communicate with service workers through message passing. The service worker acts as the central coordinator, while content scripts handle page-specific logic.

```javascript
// Content script sending messages
chrome.runtime.sendMessage({
  type: 'PAGE_ACTION',
  data: { url: window.location.href }
});

// Service worker listening for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_ACTION') {
    handlePageAction(message.data);
  }
});
```

## Permission Model Updates

Manifest V3 introduces several permission changes designed to enhance user privacy and security. Understanding these changes is essential for a successful migration.

### Optional Permissions Pattern

Many permissions that were required at installation in MV2 can become optional in MV3. This approach allows users to install your extension with minimal permissions and grant additional access as needed.

```json
{
  "optional_permissions": [
    "tabs",
    "bookmarks",
    "management"
  ]
}
```

Request optional permissions at runtime using the `permissions.request()` method, typically in response to user actions.

```javascript
// Requesting optional permissions
function enableFeature() {
  chrome.permissions.request({
    permissions: ['tabs'],
    origins: ['*://*.example.com/*']
  }, (granted) => {
    if (granted) {
      // Feature enabled
    }
  });
}
```

### Host Permissions

Host permissions in MV3 are handled separately from API permissions. You'll declare host permissions in the `host_permissions` field of your manifest.

```json
{
  "permissions": [
    "storage",
    "alarms",
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "*://*.example.com/*",
    "*://*.partner-site.com/*"
  ]
}
```

## Action API Migration

The Action API in MV3 replaces the Browser Action and Page Action APIs from MV2, providing a unified API for extension icons and popups.

### Updating Your Manifest

Combine browser action and page action into a single action:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    },
    "default_title": "My Extension"
  }
}
```

### Programming the Action

```javascript
// Setting badge text
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

// Checking if action is enabled
chrome.action.isEnabled({ tabId: tabId }, (isEnabled) => {
  // Handle result
});
```

## Storage Patterns for MV3

With service workers that don't maintain memory, proper storage patterns become critical. The Chrome Storage API should be your primary data persistence mechanism.

### Best Practices

Always initialize default values from storage, and use the callback or Promise pattern appropriately. For modern code, wrap storage operations in Promise-based utilities.

```javascript
// Promise-based storage utility
const storage = {
  get: (keys) => new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  }),
  set: (items) => new Promise((resolve) => {
    chrome.storage.local.set(items, resolve);
  })
};

// Usage
async function loadUserSettings() {
  const { settings } = await storage.get(['settings']);
  return settings || { theme: 'light' };
}
```

Use `chrome.storage.sync` when data needs to follow users across devices, but be aware of its 100KB limit and quota restrictions. Use `chrome.storage.local` for larger datasets that don't need syncing.

## Step-by-Step Migration Checklist

Use this checklist to ensure you've addressed all migration requirements:

1. Update manifest version to 3
2. Replace background page with service worker
3. Migrate global variables to chrome.storage
4. Replace setTimeout/setInterval with chrome.alarms
5. Migrate webRequest to declarativeNetRequest
6. Remove remote code loading
7. Update permission declarations
8. Migrate browserAction/pageAction to action API
9. Update content script communication patterns
10. Test all features in MV3 environment

## Common Pitfalls

Several issues frequently cause migration problems. Service worker termination means your code must handle interruption gracefully—never assume continuous execution. Timer issues arise because alarms have minimum intervals; very short intervals may not work as expected. Storage quotas can cause failures if you exceed limits; monitor your usage and clean up unused data.

Message passing requires attention to the async nature of communication with service workers. Always return `true` from message listeners when sending async responses, and handle timeouts appropriately.

## Testing Strategy

Thorough testing is essential for MV3 migration success. Start by testing in Chrome with extension debugging enabled, and use the service worker lifecycle to your advantage—check that state loads correctly when the service worker wakes up.

Test permission requests and optional permission flows. Verify that declarativeNetRequest rules work as expected by checking network requests in the DevTools Network panel. Test edge cases like extension updates, browser restarts, and profile switches.

## Chrome Timeline for MV2 Deprecation

Google has progressively phased out Manifest V2 support. The Chrome Web Store stopped accepting new MV2 extensions in January 2022, and existing MV2 extensions began receiving warnings in 2023. Starting in June 2024, Chrome began disabling MV2 extensions by default, with complete removal planned for early 2025.

Users with existing MV2 extensions have received notifications prompting them to update. Extensions that haven't migrated will stop functioning, making migration urgent for any extension still on MV2.

---

**Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)**
