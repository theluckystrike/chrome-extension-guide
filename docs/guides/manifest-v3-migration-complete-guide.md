---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Learn about background service workers, declarativeNetRequest, permission changes, and testing strategies.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Google's transition from Manifest V2 to Manifest V3 represents the most significant change to Chrome extension development in over a decade. This comprehensive guide walks you through every aspect of migrating your extension, from understanding architectural differences to implementing modern patterns that will keep your extension functional and compliant with Chrome Web Store policies.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental shift between Manifest V2 and Manifest V3 lies in how extensions handle background execution and network request interception. In MV2, extensions could run persistent background pages that stayed alive as long as the browser was open, allowing developers to use traditional JavaScript patterns with setTimeout, setInterval, and long-running operations. MV3 introduces service workers that are event-driven and ephemeral, meaning Chrome can terminate them after periods of inactivity.

This architectural change affects every aspect of extension development. Your background script must now be entirely asynchronous, registering event listeners at the top level and responding to Chrome events rather than maintaining continuous execution. State cannot be stored in global variables since the service worker may be terminated and restarted at any time. Instead, you must rely on chrome.storage for all persistent data and implement patterns that gracefully handle the service worker lifecycle.

Memory management also differs significantly between the two versions. MV2 background pages could hold references to DOM elements and maintain complex object graphs in memory. MV3 service workers have no access to the DOM and should minimize memory footprint to avoid triggering Chrome's termination logic. This means rethinking how you cache data, manage connections, and handle long-running operations.

## Migrating from Background Pages to Service Workers

The transition from background pages to service workers requires rethinking your extension's architecture. Your service worker should register all event listeners synchronously at the top level of the script, ensuring they're in place before any events fire. Unlike MV2 where you might have initialized things lazily, MV3 demands upfront registration of all handlers.

For detailed guidance on implementing service workers, see our [Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/) which covers TypeScript patterns, event handling, messaging, and production-ready implementations.

Replace all setTimeout and setInterval calls with chrome.alarms API. The alarms API is designed to work with the service worker lifecycle, firing reliably even after the service worker restarts. Here's a migration example:

```javascript
// MV2 - Background Page
setInterval(() => {
  fetchLatestData();
}, 60000);

// MV3 - Service Worker
chrome.alarms.create('fetchData', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'fetchData') {
    fetchLatestData();
  }
});
```

State management requires using chrome.storage instead of global variables. Store any data that needs to persist across service worker restarts in chrome.storage.local or chrome.storage.sync. For frequently accessed data, consider implementing a caching layer that loads from storage on service worker startup.

## webRequest to declarativeNetRequest Migration

One of the most significant changes in MV3 affects extensions that modify network requests. The webRequest API, which allowed extensions to block or modify requests in flight, has been replaced by declarativeNetRequest for most use cases. This change was made to improve user privacy by preventing extensions from observing all network traffic.

The declarativeNetRequest API works differently than webRequest. Instead of intercepting each request and deciding what to do in JavaScript, you define rules in JSON that Chrome applies internally. This means you cannot dynamically modify requests based on runtime conditions as you could with webRequest. Instead, you must define all possible rules upfront or use dynamic rules that can be updated at runtime.

For in-depth coverage of this API, see our [Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

Here's a basic migration example:

```javascript
// MV2 - Using webRequest
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('ads')) {
      return { cancel: true };
    }
  },
  { urls: ['*://*/*'] },
  ['blocking']
);

// MV3 - Using declarativeNetRequest
// In manifest.json:
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ads_blocker",
      "enabled": true,
      "path": "rules/ads.json"
    }]
  }
}

// rules/ads.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": ".*ads.*",
      "resourceTypes": ["main_frame", "sub_frame", "stylesheet", "script", "image", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
    }
  }
]
```

The declarativeNetRequest API has some limitations compared to webRequest. You cannot see the full request details, modify request headers dynamically for all requests, or cancel requests based on complex runtime logic. For many extensions, the static rules approach is sufficient, but extensions with complex filtering logic may need significant restructuring.

## Remote Code Elimination

MV3 prohibits loading and executing remote code, which means all your extension's JavaScript and Wasm must be bundled within the extension package. This change improves security by preventing extensions from loading potentially malicious code from external servers.

To migrate, audit your extension for any dynamic code loading. If you were fetching scripts from external servers, bring that code into your extension bundle. If you were using eval or new Function to create code from strings, you must refactor to use predefined functions instead.

For configuration that previously came from remote servers, use chrome.storage to store settings locally or implement a remote configuration pattern where you fetch JSON data (not code) and use it to configure your extension's behavior. The key distinction is that you can fetch data but not executable code.

## Content Script Changes

Content scripts in MV3 work similarly to MV2, but there are important differences to note. Content scripts can no longer use remote code, so any libraries they depend on must be bundled with the extension. The messaging system between content scripts and the background service worker remains functional, but remember that the background service worker may not be running when you send a message.

If your content script needs to communicate with the background, use message passing with the understanding that the service worker might need to start up, causing a slight delay. For extensions that require immediate responses from the background, consider whether the logic can be moved entirely to the content script or if you need to implement a different architecture.

Content scripts can still access web pages and modify them, but they should be careful about assumptions regarding page state. Since content scripts may be injected at different times and the page may change, avoid relying on global page state that might not be present.

## Permission Model Updates

MV3 introduces a new permission model that requires extensions to request permissions more carefully. Host permissions are now separated from other permissions, and you should request them only when needed for specific features. The optional_permissions feature allows extensions to request additional permissions after installation, giving users more control over what your extension can access.

When requesting permissions, prefer activeTab over host permissions when possible. The activeTab permission grants access to the current tab only when the user explicitly invokes your extension, providing a better user experience while maintaining functionality. Here's how permissions compare:

```json
// MV2 manifest.json
{
  "permissions": [
    "tabs",
    "storage",
    "https://*.example.com/*"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ]
}

// MV3 manifest.json  
{
  "permissions": [
    "tabs",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ]
}
```

Review your extension's permissions and remove any that aren't actively used. Unnecessary permissions can cause review delays and may concern users reviewing your extension's access to their data.

## Action API Migration

In MV2, extensions used the browser_action and page_action APIs to control the extension's icon in the toolbar. MV3 consolidates these into a single action API. If you were using browserAction or pageAction, migrate to chrome.action:

```javascript
// MV2
chrome.browserAction.setIcon({ path: 'icon.png' });
chrome.browserAction.setBadgeText({ text: '5' });

// MV3
chrome.action.setIcon({ path: 'icon.png' });
chrome.action.setBadgeText({ text: '5' });
```

The action API also introduces new capabilities like sidePanel, which allows your extension to show a panel alongside web pages. For popup-based extensions, the implementation remains similar, but the underlying mechanism has changed to work with the service worker architecture.

## Storage Patterns

Storage patterns in MV3 require more consideration than MV2 due to the service worker lifecycle. Since the service worker can be terminated at any time, you cannot rely on in-memory caches persisting between events. Implement a storage layer that loads necessary data when the service worker starts and saves any changes immediately.

Use chrome.storage.local for large amounts of data that don't need to sync across devices, and chrome.storage.sync for user preferences that should be available across installations. Be aware of storage quotas and implement cleanup strategies for extensions that store significant amounts of data.

For complex data structures, consider using IndexedDB through a wrapper like idb for better performance and querying capabilities. The storage API is suitable for simple key-value data, but IndexedDB provides more flexibility for structured data.

## Step-by-Step Migration Checklist

Use this checklist to systematically migrate your extension from MV2 to MV3:

First, update your manifest.json to use manifest_version: 3. Change your background script configuration from "persistent": true to use "service_worker": "background.js". Review and update all permissions, separating host_permissions from regular permissions.

Next, refactor your background script to use asynchronous patterns. Replace setTimeout and setInterval with chrome.alarms. Store all state in chrome.storage. Register all event listeners at the top level of your service worker.

Then, update network request handling. If you use webRequest for blocking, migrate to declarativeNetRequest. Define static rules in JSON files. For dynamic rules, implement the dynamicRules API.

After that, update content scripts to work with the new architecture. Ensure all code is bundled locally. Test messaging between content scripts and the service worker. Verify content script injection works correctly.

Finally, test thoroughly. Load your extension in developer mode. Test all features across different scenarios. Verify the service worker lifecycle doesn't break functionality. Check for any remaining MV2 APIs that need updating.

## Common Pitfalls

Several common issues trip up developers during MV3 migration. The most frequent problem is assuming the service worker stays running. Remember that chrome.alarms, chrome.idle, and other event-based APIs are your friends for anything that needs to run periodically.

Another common issue is forgetting to handle the case where the service worker starts up cold. Any state your extension needs should be loaded from chrome.storage on startup, not assumed to exist in memory.

With declarativeNetRequest, developers often forget that rules must have unique IDs and that you need to update dynamic rules properly when modifying them at runtime. The static rules are easier to manage but less flexible.

Finally, many extensions forget to handle the case where the user denies permissions. Implement proper error handling for API calls that might fail due to missing permissions, and provide helpful messages to users when features require additional access.

## Testing Strategy

Testing MV3 extensions requires understanding the service worker lifecycle. Use Chrome's developer tools to inspect the service worker, set breakpoints, and view console output. The Service Worker section in the Chrome DevTools Application tab shows you when the service worker starts, stops, and handles events.

Write tests that verify your extension works correctly after the service worker has been terminated and restarted. This is the most common source of bugs in MV3 extensions. Use chrome.storage to persist state between tests, and verify that your extension recovers gracefully from service worker restarts.

Consider using automated testing with tools like Puppeteer or Playwright to simulate user interactions and verify extension behavior. These tools can help you test the full user experience including popup interactions, content script behavior, and messaging between components.

## Chrome Timeline for MV2 Deprecation

Google has been gradually phasing out MV2 support. The Chrome Web Store stopped accepting new MV2 extensions in January 2022 and began requiring MV3 for all new submissions. Existing MV2 extensions can still be updated, but developers are strongly encouraged to migrate to MV3.

Chrome has disabled MV2 extensions for enterprise-managed devices and is continuing to tighten restrictions. The timeline for complete MV2 removal has been extended several times, but the direction is clear. All extensions must migrate to MV3 to remain functional long-term.

Starting in early 2023, Chrome began warning users about MV2 extensions and showing messages encouraging them to find alternatives. While exact timelines may shift, the writing is on the wall: MV2 extensions will eventually stop working entirely.

---

*This guide is part of the Chrome Extension Guide by theluckystrike. For more tutorials and patterns, visit [zovo.one](https://zovo.one).*
