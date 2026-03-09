---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating your Chrome extension from Manifest V2 to Manifest V3. Covers background pages, webRequest, permissions, and more.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's Manifest V3 represents the most significant transformation in Chrome extension development history. Google introduced MV3 to improve security, privacy, and performance, but the changes require careful consideration and systematic migration. This guide walks you through every aspect of moving your extension from Manifest V2 to Manifest V3, with practical code examples and battle-tested patterns.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental shift between Manifest V2 and Manifest V3 lies in how Chrome manages extension execution. In MV2, your background script ran as a persistent background page that stayed alive as long as the browser was open. This page had full access to all Chrome APIs and could execute code at any time. While convenient for developers, this model created security vulnerabilities and consumed system resources even when the extension wasn't actively being used.

Manifest V3 replaces persistent background pages with **service workers** that are event-driven and ephemeral. Chrome activates your service worker when it needs to handle an event—perhaps a browser action click, an alarm firing, or a message from a content script. After completing the event handler, the service worker can be terminated at any time. This architectural change means your extension must be stateless and reinitialize itself on each activation.

Beyond the background architecture, MV3 introduces several other architectural changes. Remote code execution is no longer allowed—all your extension's code must be bundled within the extension package. The permission model becomes more granular, requiring developers to request permissions more thoughtfully. The action API consolidates browser actions and page actions into a single unified API. These changes work together to create a more secure extension ecosystem while maintaining functionality through new patterns and APIs.

## Migrating from Background Page to Service Worker

The transition from background page to service worker requires rethinking your extension's architecture. Your background script can no longer maintain global state or rely on being always available. Instead, you must store state in chrome.storage and reinitialize on each service worker activation.

For detailed guidance on implementing service workers, see our [Chrome Extension Background Service Worker Guide](/docs/guides/background-service-worker/). This comprehensive resource covers TypeScript patterns, event handling, messaging, and production-ready implementations.

Here's a basic migration pattern for your background script:

```javascript
// MV2 Background Page (old approach)
let cachedData = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getData') {
    if (!cachedData) {
      cachedData = fetchDataFromAPI();
    }
    sendResponse(cachedData);
  }
  return true;
});

// MV3 Service Worker (new approach)
import { loadCachedData, saveCachedData } from './storage.js';

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'getData') {
    // Always load from storage - we can't rely on in-memory cache
    const cachedData = await loadCachedData();
    sendResponse(cachedData);
  }
  return true;
});

// Handle service worker activation
self.addEventListener('activate', async (event) => {
  // Reinitialize any needed state from storage
  console.log('Service worker activated');
});
```

Notice how the MV3 version imports state management functions rather than relying on global variables. Your service worker should treat every execution as a fresh start, retrieving necessary state from chrome.storage or IndexedDB before responding to events.

## Replacing webRequest with declarativeNetRequest

One of the most significant API changes in MV3 involves network request modification. The powerful webRequest API, which allowed extensions to observe and modify any network request in MV2, becomes blocking in MV3 only for installed extensions, with new limitations. Instead, you must use the declarativeNetRequest API for most blocking and modification use cases.

Our [Declarative Net Request Guide](/docs/guides/declarative-net-request/) provides in-depth coverage of this API, but here's the fundamental migration pattern:

```javascript
// MV2 with webRequest
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('ads')) {
      return { cancel: true };
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

// MV3 with declarativeNetRequest
// First, declare rules in manifest.json
/*
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "block_ads",
      "enabled": true,
      "path": "rules/block_ads.json"
    }]
  }
}
*/

// Then add dynamic rules in your service worker
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1,
    priority: 1,
    action: { type: 'block' },
    condition: { urlFilter: '.*\\.ads\\..*', resourceTypes: ['main_frame'] }
  }]
});
```

The declarativeNetRequest API works differently than webRequest. Rather than intercepting each request programmatically, you define rules in JSON files that Chrome evaluates internally. This approach is more performant and private—Chrome processes the rules without needing to activate your extension for every network request.

## Remote Code Elimination

Manifest V3 explicitly prohibits loading and executing remote code. Your extension must include all JavaScript, CSS, and WebAssembly files within the extension package itself. This restriction prevents malicious extensions from dynamically loading code after installation, significantly improving security.

To migrate, bundle all your dependencies and external libraries directly into your extension. If you use a build tool like webpack, Rollup, or esbuild, configure it to produce a single bundled file or a small set of files that include all necessary code. Remove any dynamically constructed script tags or eval() calls that load external scripts.

```javascript
// MV2 - This is no longer allowed in MV3
const script = document.createElement('script');
script.src = 'https://external-server.com/library.js';
document.head.appendChild(script);

// MV3 - Bundle the library or use chrome.runtime.getURL
import { bundledLibrary } from './lib/bundled-library.js';
// Now use the bundled version
```

This change actually benefits your users—smaller download sizes, faster installation, and no risk of compromised third-party code loading into your extension.

## Content Script Changes

Content scripts undergo important changes in MV3, primarily around execution timing and communication. While content scripts can still inject into web pages, the mechanism for matching and executing changes slightly.

The most notable difference involves CSS injection. In MV2, you could programmatically inject CSS using chrome.runtime.sendMessage to request CSS from the background page. In MV3, use the chrome.scripting API for programmatic injection:

```javascript
// MV3 Content Script Injection
chrome.scripting.insertCSS({
  target: { tabId: tabId },
  files: ['styles/injected.css']
});

chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['scripts/content.js']
});
```

Content scripts in MV3 also communicate with service workers differently. Since service workers aren't always running, you might need to use the chrome.storage API as an intermediary or ensure your service worker stays active long enough to respond. Plan your messaging architecture around the ephemeral nature of service workers.

## Permission Model Updates

Manifest V3 introduces a more granular permission model that requires careful attention during migration. Some previously optional permissions now trigger warnings, and others are restricted to specific use cases.

The most critical changes involve host permissions. In MV2, you could request access to all URLs with a single permission. In MV3, you must specify exact host patterns, and Chrome shows prominent warnings when users install extensions with broad host permissions. Always request the minimum necessary hosts and use dynamic host permission requests when possible.

```javascript
// MV2 - Broad permission
"permissions": ["<all_urls>"]

// MV3 - Specific host permissions
"permissions": [
  "storage",
  "tabs",
  "activeTab"
],
"host_permissions": [
  "https://example.com/*",
  "https://*.example.org/*"
]
```

The activeTab permission deserves special attention. It grants temporary access to the current tab only when the user invokes your extension—through a toolbar click, keyboard shortcut, or context menu. This permission provides a good user experience while maintaining privacy, as users must explicitly activate your extension for each use.

## Action API Migration

In MV2, developers区分 between browser actions (extensions that work regardless of the current page) and page actions (extensions that only work on specific pages). MV3 consolidates these into a single Action API, simplifying implementation while providing equivalent functionality.

```javascript
// MV2 - Browser Action
chrome.browserAction.onClicked.addListener((tab) => {
  chrome.browserAction.setBadgeText({ text: '5', tabId: tab.id });
});

// MV3 - Action API
chrome.action.onClicked.addListener(async (tab) => {
  chrome.action.setBadgeText({ text: '5', tabId: tab.id });
});
```

For extensions that previously used page actions, use the chrome.action API with conditional enabling based on the current URL. Call chrome.action.enable() or chrome.action.disable() in your service worker when navigation events occur.

## Storage Patterns

Storage patterns require adjustment to work effectively with the service worker model. Since your service worker may terminate at any time, you cannot rely on in-memory state. Instead, adopt these patterns for reliable data management:

Always read from chrome.storage in your event handlers before responding. Write to chrome.storage whenever your extension modifies state. For frequently accessed data, implement a simple caching layer that loads from storage on each service worker activation:

```javascript
// Simple cache pattern for MV3
let cache = {};

async function getExtensionState() {
  if (Object.keys(cache).length === 0) {
    // Cache empty - load from storage
    const result = await chrome.storage.local.get(['settings', 'data']);
    cache = result;
  }
  return cache;
}

async function updateExtensionState(updates) {
  await chrome.storage.local.set(updates);
  cache = { ...cache, ...updates };
}
```

For complex data structures, consider using IndexedDB through a wrapper library like idb. The chrome.storage API works well for simple key-value data but becomes cumbersome with nested objects or complex queries.

## Step-by-Step Migration Checklist

Use this systematic approach to migrate your extension:

1. **Audit your current extension**: Document all APIs used, permissions requested, and background script functionality. Identify MV2-only features that need alternatives.

2. **Update manifest.json**: Change manifest_version to 3, restructure permissions, move host permissions to host_permissions, and update background configuration to use service_worker.

3. **Migrate background script**: Convert to async/await patterns, implement storage-based state management, replace deprecated APIs, and handle service worker lifecycle.

4. **Update network request handling**: Replace webRequest blocking with declarativeNetRequest rules, create rule JSON files, and update extension logic to manage rules dynamically.

5. **Migrate content scripts**: Update injection methods to use chrome.scripting API, review message passing patterns, and test communication with service worker.

6. **Update action API**: Consolidate browser and page actions, update icon and badge handling, and implement conditional enabling for page-specific features.

7. **Review permissions**: Minimize required permissions, implement activeTab where appropriate, and test installation flow.

8. **Bundle dependencies**: Update build configuration to include all code, remove dynamic code loading, and verify all resources are packaged.

9. **Test thoroughly**: Use Chrome's extension debugging tools, test across different scenarios, and verify service worker lifecycle behavior.

## Common Pitfalls

Several issues frequently trip up developers during migration. The service worker lifecycle causes the most confusion—remember that your background script executes from scratch on each activation. Don't assume previous state persists between events.

The webRequest to declarativeNetRequest migration catches many developers off guard. The new API has different capabilities and limitations. Specifically, you cannot inspect or modify request bodies, and rules must be defined statically or added dynamically with appropriate permissions.

Memory leaks become more problematic in MV3. Since service workers start and stop frequently, any memory not properly released accumulates. Audit your code for event listener leaks, unclosed connections, and abandoned timers.

Finally, watch for deprecated API usage. Chrome has already removed some MV2 APIs and continues deprecating others. Check the Chrome Extensions documentation regularly for API changes affecting your extension.

## Testing Strategy

Comprehensive testing ensures your migrated extension works correctly across all scenarios. Start with unit tests for individual functions, then progress to integration tests covering API interactions.

Test service worker lifecycle explicitly—unload your extension, trigger an event, and verify it reinitializes correctly. Test with multiple tabs, different user gestures, and edge cases like rapid successive events.

Use Chrome's developer tools extensively. The Service Worker debugging panel shows worker status, and the Console displays service worker logs. The Network tab helps verify declarativeNetRequest rules are working as expected.

## Chrome Timeline for MV2 Deprecation

Google has announced a firm timeline for Manifest V2 phase-out. As of early 2024, new extensions cannot use Manifest V2. By mid-2024, existing MV2 extensions no longer receive updates in the Chrome Web Store. The exact timeline continues to evolve, but the direction is clear—all extensions must migrate to Manifest V3.

Start your migration now to avoid last-minute complications. The process takes longer than expected, especially for complex extensions with sophisticated background processing. Early migration also gives you time to address issues discovered during testing.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
