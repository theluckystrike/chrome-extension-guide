---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: Complete step-by-step guide for migrating Chrome extensions from Manifest V2 to Manifest V3. Learn about background service workers, declarativeNetRequest, permission changes, and more.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Google's transition from Manifest V2 to Manifest V3 represents the most significant change to Chrome extension development since extensions were introduced. With the deprecation timeline now firmly in place, understanding how to migrate your extension from MV2 to MV3 is essential for every Chrome extension developer. This comprehensive guide walks you through every aspect of the migration process, from architectural changes to practical implementation details.

The migration involves more than just updating your manifest.json file. You'll need to rethink how your extension handles background processing, network request interception, and state management. Many patterns that worked in MV2 simply don't translate directly to MV3, and attempting to force them will result in warnings or broken functionality.

This guide assumes you're familiar with Chrome extension development and have an existing MV2 extension that you need to migrate. We'll cover all the major API changes, provide practical code examples, and offer tips for avoiding common pitfalls during the migration process.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental difference between Manifest V2 and Manifest V3 lies in how the browser handles extension background code. In MV2, extensions could run persistent background pages that stayed alive as long as the browser was open. These pages could execute arbitrary JavaScript, make network requests at any time, and maintain in-memory state without any time constraints.

Manifest V3 replaces this model with ephemeral service workers that Chrome activates only when needed and terminates after periods of inactivity. This architectural shift offers significant benefits: reduced memory consumption, improved security through shorter attack surfaces, and better resource management. However, it requires developers to adopt new patterns for handling state, timers, and event-driven workflows.

Another major distinction involves remote code execution. MV2 allowed extensions to load and execute remote JavaScript code, which created significant security vulnerabilities. MV3 eliminates this capability entirely—all extension code must be bundled with the extension package. This change improves security but requires developers to update their build processes and distribution strategies.

The permission system has also been restructured. MV3 introduces more granular permission controls and requires developers to declare permissions more explicitly. Some previously optional permissions are now mandatory for certain functionality, while others have been restricted or removed entirely.

## Migrating from Background Pages to Service Workers

The transition from persistent background pages to service workers is perhaps the most challenging part of MV3 migration. Your background script can no longer assume it will remain running indefinitely, and you must design for a world where the service worker may be terminated and restarted at any time.

Start by reading our [Chrome Extension Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/) for detailed implementation patterns. The key changes you'll need to implement include:

First, move all event listener registrations to the top level of your service worker file. Unlike MV2 where you could register listeners inside functions, MV3 requires all listeners to be registered synchronously at load time. This ensures Chrome can properly dispatch events to your service worker when it wakes up.

```javascript
// MV3 Service Worker - Top-level event registration
chrome.runtime.onInstalled.addListener(() => {
  initializeExtension();
});

chrome.alarms.create('periodicTask', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTask') {
    handlePeriodicTask();
  }
});
```

Second, replace all setTimeout and setInterval calls with chrome.alarms API. Service workers don't guarantee that setTimeout will fire, but chrome.alarms is specifically designed to wake service workers when needed.

Third, migrate all persistent state from in-memory variables to chrome.storage. Any data your extension needs to persist must be saved to chrome.storage (or IndexedDB) because your service worker will lose access to in-memory state when terminated.

```javascript
// Store state properly in MV3
async function saveState(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function loadState(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}
```

Finally, implement proper lifecycle handling. Your service worker should handle the install, activate, and fetch events appropriately, and be prepared to reinitialize state when Chrome restarts your worker.

## Converting webRequest to declarativeNetRequest

The webRequest API in MV2 allowed extensions to intercept, block, or modify network requests in flight. This powerful capability came with significant privacy and performance costs—all extensions using webRequest needed broad permissions to observe all network traffic.

MV3 replaces this with the declarativeNetRequest API, which uses static rulesets to declare how requests should be handled. This approach improves privacy (the extension never sees request details) and performance (Chrome can optimize request handling), but requires some architectural changes.

Our [Chrome Extension Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/) provides comprehensive coverage of this API. Here's what you need to know for migration:

The declarativeNetRequest API uses rules stored in JSON files that are bundled with your extension. Instead of intercepting requests in JavaScript, you declare rules that Chrome applies before making requests.

```json
// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": ".*\\.doubleclick\\.net",
      "resourceTypes": ["script", "image"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "redirect", "redirect": { "url": "https://example.com/blocked.html" } },
    "condition": {
      "urlFilter": "malicious-site.com",
      "resourceTypes": ["main_frame"]
    }
  }
]
```

Declare these rules in your manifest.json:

```json
{
  "name": "My Extension",
  "version": "1.0",
  "manifest_version": 3,
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

For extensions that need dynamic rule management (adding or removing rules at runtime), use chrome.declarativeNetRequest.updateDynamicRules(). Note that the number of dynamic rules is limited, so plan your rule usage accordingly.

One significant limitation to be aware of: you cannot inspect or modify request bodies with declarativeNetRequest. If your MV2 extension relied on reading or modifying request bodies, you'll need to redesign your approach or consider alternative APIs.

## Handling Remote Code Elimination

MV2 allowed extensions to load and execute JavaScript from remote servers. This capability was frequently abused by malicious extensions and created significant security risks. MV3 eliminates remote code execution entirely—all JavaScript, CSS, and WebAssembly used by your extension must be bundled in the extension package.

This change affects several common MV2 patterns:

If your extension previously loaded scripts from a CDN or remote server, you must download and bundle those scripts with your extension. Update your build process to fetch remote dependencies during development or include them directly in your source code.

For extensions that used remote configuration to change behavior dynamically, consider using chrome.storage to store configuration data that can be updated without republishing the extension. Chrome provides the enterprise.deviceAttributes or enterprise.hardwarePlatform APIs for managed environments, but these have limited use cases.

Some extensions used remote code loading to implement plugin systems or load user-provided scripts. These architectures need fundamental redesign in MV3. Consider implementing a sandboxed iframe approach for user scripts, or accept that all code must be bundled with the extension.

## Content Script Changes in MV3

Content scripts run in the context of web pages and remain largely the same in MV3, but there are a few important changes to note.

Content scripts can no longer be executed via chrome.runtime.executeScript. Instead, use chrome.scripting.executeScript in the permissions section of your manifest:

```json
{
  "permissions": ["scripting"],
  "host_permissions": ["<all_urls>"]
}
```

```javascript
// MV3 content script injection
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
});
```

The match_about_blank and match_origin_as_fallback options for content scripts have changed behavior. If your extension relies on these, test thoroughly after migration.

Content scripts can still communicate with your service worker using message passing, but remember that your service worker may not be running when a content script tries to communicate. Implement proper error handling and consider using chrome.storage for asynchronous communication when the service worker might be terminated.

## Updates to the Permission Model

MV3 introduces several permission changes that affect how extensions access browser functionality.

The host permissions model has been restructured. In MV2, you could request host permissions alongside other permissions. In MV3, host permissions are separated into their own section in the manifest:

```json
{
  "permissions": [
    "storage",
    "alarms",
    "scripting"
  ],
  "host_permissions": [
    "https://*.example.com/*",
    "<all_urls>"
  ]
}
```

Some previously optional permissions are now required for specific features. For example, if you need to access cookies on specific domains, you must now declare the "cookies" permission along with appropriate host permissions.

The "webRequestBlocking" permission has been removed entirely—use declarativeNetRequest instead. Similarly, "webRequest" alone no longer allows blocking; you must use the declarativeNetRequest API with appropriate rules.

Be careful with the "scripting" permission. In MV3, it's required for injecting content scripts programmatically, and you should declare it explicitly rather than relying on the content script declaration to grant access.

## Migrating to the Action API

The browserAction and pageAction APIs from MV2 have been unified into a single "action" API in MV3. This change simplifies extension development but requires manifest and code updates.

Update your manifest.json to use the action key:

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

In your JavaScript code, replace chrome.browserAction and chrome.pageAction calls with chrome.action:

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000' });

// MV3
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
```

If your extension used pageAction to show an icon only on specific pages, you can now use the action API with conditional visibility rules or handle visibility in your popup code.

## Storage Patterns for MV3

Chrome provides several storage APIs, each with different characteristics suited to different use cases. Understanding these options is essential for MV3 migration.

chrome.storage.local provides persistent storage that survives browser restarts but is specific to your extension. Data stored here counts against the extension's storage quota (typically 5MB).

chrome.storage.session provides storage that persists only for the browser session and is cleared when the browser closes. This is useful for temporary state that doesn't need to persist across sessions.

chrome.storage.sync syncs storage across devices when the user is signed into Chrome with the same account. This is ideal for user preferences that should follow users across devices.

For MV3, prefer chrome.storage over localStorage because:
- Service workers don't have access to the DOM, so localStorage isn't available in background scripts
- chrome.storage APIs are asynchronous, which works better with the event-driven service worker model
- chrome.storage provides better security isolation

```javascript
// Proper async storage patterns for MV3
async function getUserPreferences() {
  const result = await chrome.storage.sync.get(['theme', 'notifications']);
  return result;
}

async function setUserPreferences(prefs) {
  await chrome.storage.sync.set(prefs);
}
```

## Step-by-Step Migration Checklist

Use this checklist to track your MV3 migration progress:

1. Update manifest_version to 3 in your manifest.json
2. Migrate background page to service worker—update event registration patterns, replace timers with alarms, implement proper state persistence
3. Convert webRequest blocking to declarativeNetRequest rules
4. Bundle all remote code or scripts with the extension
5. Restructure permissions into "permissions" and "host_permissions" sections
6. Migrate browserAction/pageAction to action API
7. Replace localStorage usage with chrome.storage APIs
8. Update content script injection to use chrome.scripting
9. Review and test all API calls for async/await patterns
10. Test extension loading in Chrome with MV3
11. Run Chrome's extension best practices checker
12. Update any documentation or user instructions

## Common Migration Pitfalls

Several issues frequently trip up developers during MV3 migration:

Forgetting that service workers terminate after inactivity will cause your extension to lose all in-memory state. Audit your code for global variables that assume persistent state and migrate them to chrome.storage.

Using setTimeout instead of chrome.alarms will cause your scheduled tasks to fail when the service worker terminates. Chrome specifically designed the alarms API to work with service worker lifecycle.

Not handling message passing when the service worker isn't running will cause silent failures. Implement retry logic or use chrome.storage for communication that needs to survive service worker restarts.

Assuming host permissions work like MV2 will cause your extension to fail permission checks. Remember that host permissions must be declared separately in the host_permissions array.

Using deprecated APIs like webRequestBlocking will cause your extension to fail review. Test thoroughly with warnings enabled in Chrome.

## Testing Strategy for MV3 Migration

Testing MV3 migrations requires a systematic approach to verify all functionality works correctly.

Enable developer mode in Chrome and load your extension as an unpacked extension. Watch the console for service worker errors and warnings about deprecated APIs.

Use Chrome's service worker debugging tools (chrome://extensions → your extension → "service worker" link) to inspect the service worker state, see event logs, and manually wake the service worker for testing.

Test all user flows including:
- Extension installation and first-run initialization
- Background task execution
- Content script injection and communication
- Popup functionality
- Options page interactions
- Cross-browser-session persistence

Pay special attention to scenarios that involve timing, such as alarms that should fire after the service worker has been terminated and restarted.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 deprecation that all extension developers should understand.

Chrome began phasing out MV2 in 2021 with the introduction of MV3 and the warning period. As of 2023, new extensions submitted to the Chrome Web Store must use Manifest V3. Existing MV2 extensions can still be updated, but developers are strongly encouraged to migrate.

The final deprecation timeline calls for MV2 extensions to stop working sometime in the future, though specific dates have been adjusted several times. The most recent guidance indicates that MV2 support will be removed in a future Chrome release, making migration essential for any extension that needs to continue functioning.

To stay current with Google's timeline, monitor the Chromium Extensions Google Group and the Chrome for Developers blog for announcements about deprecation milestones.

---

*This guide is part of the Chrome Extension Guide by theluckystrike. More at zovo.one*
