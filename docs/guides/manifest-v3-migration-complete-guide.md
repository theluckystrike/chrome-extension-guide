---

layout: guide
title: Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating your Chrome extension from Manifest V2 to Manifest V3. Learn about background service workers, declarativeNetRequest, permission changes, and the complete migration checklist.
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"

---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's transition from Manifest V2 to Manifest V3 represents the most significant architectural change in Chrome extension development history. With Google phasing out MV2 support and requiring all new extensions to use MV3, understanding this migration is essential for every extension developer. This comprehensive guide walks you through every aspect of moving your extension from MV2 to MV3, covering architecture changes, API replacements, permission updates, and testing strategies.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental difference between Manifest V2 and Manifest V3 lies in how each version handles background execution. In MV2, your extension ran a persistent background page that stayed alive as long as the browser was open. This background page could execute code continuously, maintain open connections, and run timers without concern for lifecycle management. MV3 replaces this model with ephemeral service workers that Chrome activates when needed and terminates after periods of inactivity.

This architectural shift delivers substantial benefits for end users. Extensions consume zero memory when idle, the attack surface is dramatically reduced due to shorter execution windows, and the browser allocates system resources more efficiently. However, these benefits require developers to fundamentally rethink how they handle state, manage timers, and structure their extensions. The service worker model demands that you register all event listeners at the top level of your script, use chrome.storage for persistence instead of in-memory variables, and replace setTimeout/setInterval with the chrome.alarms API.

Beyond the background execution model, MV3 introduces several other architectural changes. Remote code execution is no longer permitted, meaning all your extension's code must be bundled within the package. The webRequest API is now read-only, requiring migration to declarativeNetRequest for network modification capabilities. The action API consolidates browser action and page action into a single interface. These changes collectively improve security, privacy, and performance but require careful planning to implement correctly.

## Migrating from Background Pages to Service Workers

The transition from persistent background pages to service workers represents the most challenging aspect of MV3 migration. Your extension's background script must be completely restructured to work within the service worker lifecycle. The fundamental principle is that your service worker should initialize quickly, register all necessary event listeners, and then wait for Chrome to dispatch events. Any state your extension needs to persist must be stored in chrome.storage, as in-memory variables will be lost when Chrome terminates the service worker.

Begin by updating your manifest.json to declare a service worker instead of a background page:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

The "type": "module" setting enables ES modules, which is highly recommended for organizing code in modern extensions. Next, restructure your background.js to register all event listeners at the top level. Unlike MV2 where you might have conditionally registered listeners, MV3 requires all listeners to be registered immediately when the service worker executes:

```javascript
// MV3 Service Worker Pattern
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ initialized: true });
});

chrome.alarms.create('periodicCleanup', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicCleanup') {
    // Handle cleanup task
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages from content scripts or popup
});
```

For detailed implementation patterns, refer to our [Chrome Extension Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/) which covers TypeScript patterns, messaging, alarms, and production-ready architectures.

## Moving from webRequest to declarativeNetRequest

If your MV2 extension uses the webRequest API to block, modify, or redirect network requests, you must migrate to the declarativeNetRequest API in MV3. This change significantly impacts how your extension handles network requests, as declarativeNetRequest operates on a set of declarative rules that Chrome evaluates internally, rather than intercepting each request programmatically.

The declarativeNetRequest API offers several advantages. It doesn't require host permissions to modify requests, operates more efficiently since Chrome evaluates rules internally, and provides better privacy for users since extension code doesn't see request contents. However, the trade-off is reduced flexibility—you must define your rules statically or dynamically, and you cannot inspect or modify request bodies.

To migrate, first remove the webRequest permission and add the declarativeNetRequest permission to your manifest:

```json
{
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "*://*.example.com/*"
  ]
}
```

Create a rules JSON file that defines your request modification rules:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": "*.ads.example.com", "resourceTypes": ["main_frame", "sub_frame"] }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "redirect", "redirect": { "url": "https://example.com/placeholder.png" } },
    "condition": { "urlFilter": ".*\\.jpg$", "resourceTypes": ["image"] }
  }
]
```

Load these rules in your service worker using chrome.declarativeNetRequest.updateDynamicRules. For comprehensive coverage of this API including dynamic rules, rule priorities, and advanced filtering, see our [Chrome Extension Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

## Eliminating Remote Code

One of the most significant security improvements in MV3 is the elimination of remote code execution. Your extension cannot load, evaluate, or execute code from external sources—everything must be bundled within the extension package. This change protects users from malicious extensions that might have injected code from remote servers.

If your MV2 extension loads external scripts or evaluates dynamic code, you must restructure your approach. Any functionality that previously came from external sources must now be bundled directly in your extension. For configurations that previously came from servers, consider using chrome.storage to store rule sets that your extension applies locally. If your extension requires user-customizable rules, provide a user interface for them to define rules that your extension processes using declarativeNetRequest.

This change also affects how you handle updates. Previously, you might have pushed code changes through your server; now, you must publish updates through the Chrome Web Store. Plan your release process accordingly, as review times vary.

## Content Script Changes in MV3

Content scripts undergo several important changes in MV3. They continue to run in the context of web pages, but the mechanisms for injection and communication have evolved. You can still inject content scripts through the manifest or programmatically, but programmatic injection offers more control over when and how scripts load.

The key difference is in how content scripts communicate with your background service worker. Since the service worker can terminate at any time, you should structure messaging to be resilient to disconnections. Consider using message queues in your content script that can retry failed sends, and design your service worker to handle messages gracefully regardless of when it wakes up.

Content scripts can still access most extension APIs directly, but some changes apply. The chrome.runtime.getManifest() method works the same way, and you can still use chrome.storage.sync or chrome.storage.local. However, be aware that chrome.runtime.lastError may behave differently in certain contexts—always check for its presence in your callbacks.

## Updated Permission Model

MV3 introduces a refined permission model that balances functionality with user privacy and security. Some permissions that were previously default or automatic now require explicit user consent at runtime. Understanding these changes is crucial for maintaining functionality while providing transparency to users.

The most significant change involves host permissions. In MV2, requesting access to all URLs (<all_urls>) was common. In MV3, you should request only the hosts your extension actually needs. Chrome now displays permissions more prominently in the extension's store listing, and users must grant host permissions explicitly during installation or first use.

Certain permissions now trigger additional warnings or restrictions. The "scripting" permission requires explicit declaration. The "activeTab" permission provides a more privacy-friendly alternative to host permissions when you only need to access the current tab. Use "activeTab" whenever possible, as it only grants access when the user explicitly invokes your extension.

## Action API Migration

MV3 consolidates the browser action and page action APIs into a single "action" API. If your MV2 extension uses either browserAction or pageAction, you must update your code to use chrome.action instead. This consolidation simplifies extension development while maintaining the same functionality.

Update your manifest to use the action key:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  }
}
```

In your JavaScript, replace chrome.browserAction and chrome.pageAction calls with chrome.action. The API surface is nearly identical, so most changes involve simply renaming the namespace. Badge operations, which were split between browserAction.setBadgeText and pageAction.setBadgeText in MV2, now use chrome.action.setBadgeText exclusively.

## Storage Pattern Updates

Storage patterns in MV3 require adjustment due to the service worker lifecycle. Never assume your service worker will remain running—any state must persist to chrome.storage immediately and be read from storage when the service worker wakes. This applies to configuration, cached data, and any extension state that needs to persist across service worker restarts.

For optimal performance, use chrome.storage.session for data that doesn't need to persist across browser restarts but should survive service worker terminations. Use chrome.storage.sync when data needs to synchronize across a user's devices. Use chrome.storage.local for large amounts of data that don't need syncing.

Implement a pattern where your service worker loads necessary state in the startup event:

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  // Initialize storage with defaults if needed
});

chrome.runtime.onStartup.addListener(async () => {
  // Load state from storage when service worker starts
  const state = await chrome.storage.local.get(['cachedData', 'config']);
  // Initialize your extension with loaded state
});
```

## Step-by-Step Migration Checklist

Use this checklist to systematically migrate your extension from MV2 to MV3. Each step builds on the previous, ensuring you don't miss critical changes.

1. Review your current manifest.json and note all APIs and permissions in use
2. Update manifest_version to 3 and restructure the background section for service workers
3. Convert all background page code to service worker patterns with top-level event listeners
4. Replace chrome.alarms with setTimeout/setInterval for any timer functionality
5. Migrate webRequest usage to declarativeNetRequest
6. Consolidate browserAction and pageAction to chrome.action
7. Review and minimize host permissions, switching to activeTab where appropriate
8. Remove any remote code loading and bundle all functionality locally
9. Update content script injection and messaging patterns for service worker lifecycle
10. Implement chrome.storage for all persistent state
11. Test all functionality in a development extension
12. Run chrome.management extension audit and address warnings
13. Publish to the Chrome Web Store for testing

## Common Pitfalls to Avoid

Several mistakes frequently occur during MV3 migration. Being aware of these helps you avoid wasted time and frustration. First, don't assume your service worker stays running—every piece of state must be in chrome.storage, and all listeners must register at the top level. Second, don't forget to declare "type": "module" in your background configuration if you're using ES modules.

Another common pithew is neglecting the chrome.alarms API. The service worker won't fire setTimeout callbacks after termination, so any recurring tasks must use chrome.alarms. Also, ensure you handle the case where your content script loads before your service worker is ready—implement proper message queuing and response handling.

Finally, don't skip testing with multiple tabs and browser restarts. The service worker lifecycle behaves differently under various conditions, and issues often appear only in specific scenarios.

## Testing Strategy

Comprehensive testing is essential for a successful MV3 migration. Start by testing basic functionality, then progressively test edge cases and lifecycle scenarios. Create test cases for service worker termination and restart, verify that all state persists correctly across browser restarts, and test with multiple extension invocations in quick succession.

Use Chrome's built-in developer tools to debug your service worker. Access the service worker context through the chrome://extensions page, using the "service worker" link to open DevTools in the service worker context. Monitor console output and use logging to track execution flow.

Test your extension with varying numbers of open tabs, with the browser in different states, and simulate the service worker being terminated. Pay particular attention to any asynchronous operations that might not complete before the service worker terminates.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 deprecation. As of January 2023, new extensions cannot use Manifest V2, and all existing MV2 extensions will stop working once the transition completes. The exact timeline has shifted due to the complexity of the ecosystem, but the direction is clear—all extensions must migrate to MV3.

The Chrome Web Store no longer accepts new MV2 extensions, and existing MV2 extensions receive warnings about upcoming removal. For enterprise administrators, Chrome provides Enterprise Policies that can temporarily extend MV2 support, but this is a temporary measure and should not replace migration efforts.

Plan your migration now rather than waiting for deadlines. The longer you wait, the more rushed your migration becomes, and the greater risk of issues with your live extension. Start your migration using this guide, test thoroughly, and publish early to give yourself time to address any issues that arise.

---

*This guide is part of the Chrome Extension Guide by theluckystrike. For more tutorials and patterns, visit [zovo.one](https://zovo.one).*
