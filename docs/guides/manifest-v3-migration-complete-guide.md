---
layout: guide
title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: "A comprehensive guide to migrating Chrome extensions from Manifest V2 to V3. Learn about service workers, declarativeNetRequest, permission changes, and more."
seo:
  title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
  description: "Complete guide for migrating Chrome extensions from MV2 to MV3. Covers background service workers, declarativeNetRequest, permission updates, and testing strategies."
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's transition from Manifest V2 to Manifest V3 represents the most significant architectural change in Chrome extension development history. With Google completing the deprecation of MV2 and enforcing MV3 for all new and existing extensions on the Chrome Web Store, developers must understand the fundamental differences between these two versions and master the migration process. This comprehensive guide walks you through every aspect of converting your extension from MV2 to MV3, from background page transformation to permission model updates, ensuring your extension remains functional and compliant with modern Chrome standards.

## Understanding MV2 vs MV3 Architecture Differences

The core distinction between Manifest V2 and Manifest V3 lies in how Chrome manages extension execution and security. In MV2, extensions operated with a persistent background page that remained loaded as long as the browser was running, consuming system resources continuously and maintaining direct access to browser APIs. This model, while straightforward, created security vulnerabilities and performance overhead that Google sought to address with MV3.

Manifest V3 introduces an event-driven architecture centered around service workers that replace the persistent background page. These service workers are ephemeral by design—they activate when needed to handle events and terminate after periods of inactivity. This architectural shift provides substantial benefits including reduced memory consumption, improved security through limited execution windows, and better resource management across the browser ecosystem.

Beyond the background script changes, MV3 introduces several other architectural modifications that affect how extensions function. The declarative Net Request API replaces the blocking webRequest API for network modification, reducing the need for broad host permissions. Remote code execution is eliminated, requiring all extension code to be bundled within the extension package itself. The action API consolidates browserAction and pageAction into a unified interface, while content scripts operate under stricter isolation rules that affect how they interact with web pages and the extension context.

Understanding these architectural differences is essential before beginning your migration journey. The changes are not merely syntactic—they require rethinking how your extension manages state, handles asynchronous operations, and communicates between different extension components.

## Migrating from Background Pages to Service Workers

The transformation from persistent background pages to service workers represents the most significant technical challenge in MV3 migration. Your background script no longer maintains a continuous presence in memory, which means any state you previously stored in global variables will be lost when the service worker terminates.

To migrate effectively, you must first update your manifest.json to declare a service worker instead of a background page. Replace the background.scripts array with background.service_worker:

```json
{
  "background": {
    "service_worker": "background.js"
  }
}
```

The service worker operates entirely through event listeners. Instead of code executing immediately when the worker loads, your script must register handlers for the events your extension needs to respond to. Common events include chrome.runtime.onInstalled, chrome.runtime.onStartup, chrome.alarms.onAlarm, and message passing events from content scripts or popup pages.

For state persistence, migrate from in-memory variables to the chrome.storage API. The storage API persists data across service worker terminations and can synchronize across browser instances when using the sync storage area. Consider which storage type best suits your needs—local storage offers greater capacity while sync storage provides cross-device synchronization.

Timer management requires particular attention since setTimeout and setInterval do not function reliably in service workers that may terminate at any time. Use the chrome.alarms API instead for scheduled tasks, which maintains timers across service worker restarts and provides reliable execution even when the worker has been terminated and recreated.

For an in-depth exploration of service worker patterns and best practices, see our [Chrome Extension Background Service Worker Guide](background-service-worker.md), which covers advanced techniques for state management, event handling, and production-ready architectures.

## Converting webRequest to declarativeNetRequest

If your MV2 extension uses the webRequest API to block, modify, or redirect network requests, you must migrate to the declarativeNetRequest API for Manifest V3 compliance. This change improves user privacy by moving request modification logic from your extension's execution context to Chrome's internal declarative ruleset.

The fundamental difference is that declarativeNetRequest uses static rules defined in JSON files rather than dynamic code execution. Your extension no longer inspects individual requests in real-time—instead, you define rules that Chrome applies internally, which is more efficient and private.

To implement declarativeNetRequest, create rule files in your extension's rules directory:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||example.com/ads/*",
      "resourceTypes": ["main_frame", "sub_frame"]
    }
  }
]
```

Update your manifest to declare these rules and the declarativeNetRequest permission:

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
      "path": "rules/block_ads.json"
    }]
  }
}
```

For complex request modifications that require inspection, use declarativeNetRequestWithHostAccess which allows limited access to request headers while maintaining the declarative model. For complete migration guidance, refer to our dedicated [Chrome Extension Declarative Net Request Guide](declarative-net-request.md), which covers static rules, dynamic rules, and advanced filtering patterns.

## Eliminating Remote Code Execution

Manifest V3 prohibits loading and executing remote code—your extension must include all JavaScript, WebAssembly, and CSS files within the package itself. This restriction enhances security by preventing extensions from dynamically loading potentially malicious code after installation.

To comply with this requirement, audit your extension for any dynamic code execution patterns. Common sources include eval() calls, new Function() constructors, and loading scripts from external URLs. Replace external script loading with bundled alternatives or refactor your architecture to include all necessary code in the extension package.

If your extension previously fetched configuration data or rule sets from external servers, update your workflow to bundle these resources during the build process or use the chrome.storage API to store configuration locally. For rule-based extensions like ad blockers, migrate to declarativeNetRequest rulesets that can be updated through the Chrome Web Store's built-in update mechanism.

This change, while initially inconvenient, ultimately improves your extension's security posture and simplifies distribution by eliminating the need for users to trust external code sources.

## Content Script Changes and Best Practices

Content scripts in MV3 operate under the same-origin isolation model as web pages, meaning they cannot access extension APIs directly or communicate with other extension contexts through shared variables. All interaction between content scripts and the rest of your extension must occur through message passing.

When migrating content scripts, ensure you're using chrome.runtime.sendMessage for one-time communications and chrome.runtime.connect for persistent connections. The popup, background script, and any side panels communicate exclusively through these messaging APIs.

The chrome.scripting API replaces the tabs.executeScript and tabs.insertCSS methods from MV2. Migrate your content script injection to use the new API:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
});

chrome.scripting.insertCSS({
  target: { tabId: tabId },
  files: ['styles.css']
});
```

For dynamic code injection based on page conditions, use the injectable world option which allows execution in the page's JavaScript context, though this requires careful consideration of security implications.

Content script matches continue to work similarly, but note that the host_permissions field in manifest.json now controls which sites your extension can access. Ensure you declare appropriate host permissions if your content scripts need to run on specific domains.

## Permission Model Updates

Manifest V3 introduces a more granular permission system that separates installation permissions from runtime permissions. This change reduces the risk of permission hoarding—extensions now request only the permissions they need at installation time, with sensitive permissions requiring explicit user grants at runtime.

Key permission changes include:

The storage permission remains largely unchanged but consider whether your extension truly needs storage access or if the newer chrome.storage.session API better suits your use case for temporary data.

The activeTab permission provides a privacy-friendly alternative to host permissions for extensions that operate only when the user explicitly activates them. With activeTab, your extension can access the current tab only after the user clicks your extension icon or invokes a keyboard shortcut.

Declarative permissions like declarativeNetRequest and declarativeContent replace runtime permissions for common extension patterns. These allow Chrome to handle specific operations internally without granting your extension direct API access.

Host permissions in MV3 are more strictly controlled. Consider whether your extension truly needs access to all URLs (*://*/*) or if more specific patterns would suffice. Overly broad host permissions trigger additional review processes in the Chrome Web Store and may concern privacy-conscious users.

For extensions requiring access to sensitive data or operations, implement optional permissions that users can enable as needed, rather than requesting everything at installation.

## Action API Migration

In Manifest V2, developers used browserAction for extensions with toolbar buttons that appear always, and pageAction for buttons that appear only on specific pages. Manifest V3 consolidates both into a single action API, simplifying extension development while maintaining equivalent functionality.

Migrate your manifest declarations from browserAction or pageAction to action:

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

In your JavaScript, replace chrome.browserAction and chrome.pageAction calls with chrome.action:

```javascript
// Before (MV2)
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setPopup({ popup: 'popup.html' });

// After (MV3)
chrome.action.setBadgeText({ text: '5' });
chrome.action.setPopup({ popup: 'popup.html' });
```

The action API provides the same functionality including badge text, icons, titles, and popups, but through a unified interface that works consistently across all extension types.

## Storage Patterns for MV3

The ephemeral nature of service workers makes proper storage patterns critical for MV3 extensions. Your extension must persist any data that needs to survive service worker restarts, including user preferences, cached data, and inter-component communication state.

Use chrome.storage.local for large amounts of data that don't need synchronization across devices. This storage area offers significantly more capacity than sync storage:

```javascript
chrome.storage.local.set({ key: value }).then(() => {
  console.log('Data saved');
});

chrome.storage.local.get(['key']).then((result) => {
  console.log(result.key);
});
```

For user preferences that should sync across the user's Chrome instances, use chrome.storage.sync. Be mindful of storage quotas and implement cleanup routines to prevent exceeding limits.

For temporary data that should not persist across browser sessions, chrome.storage.session provides in-memory storage that's faster but cleared when the browser closes.

Implement proper error handling for storage operations, as quota exceeded errors and other failures can occur. Use try-catch blocks around storage operations and provide graceful degradation when storage fails.

## Step-by-Step Migration Checklist

Use this checklist to ensure complete MV3 migration:

1. Update your manifest.json to manifest_version: 3
2. Replace background.scripts with background.service_worker
3. Convert all global state to chrome.storage API
4. Replace setTimeout/setInterval with chrome.alarms API
5. Migrate webRequest blocking to declarativeNetRequest
6. Consolidate browserAction and pageAction to action API
7. Update content script injection to use chrome.scripting API
8. Review and minimize host permissions
9. Audit for and eliminate remote code execution
10. Replace message passing with chrome.runtime APIs
11. Update any deprecated or removed API calls
12. Test thoroughly in Chrome with MV3 flags enabled

## Common Migration Pitfalls

Several issues frequently arise during MV3 migration. Understanding these pitfalls helps you avoid common mistakes:

Service worker termination catches many developers off guard. Never assume your background script remains running—always persist state and reinitialize on service worker startup events.

Message passing timing issues emerge when content scripts send messages before the service worker is ready. Implement connection handling that queues messages or retries on service worker activation.

Storage quota limits can cause unexpected failures. Monitor your storage usage and implement cleanup strategies for large data operations.

The declarativeNetRequest rules quota limits the number of rules you can dynamically add. Plan your rule sets carefully and use static rules whenever possible.

Promise-based APIs require understanding asynchronous patterns. Use async/await or proper promise chaining rather than callback-style code.

## Testing Strategy

Comprehensive testing is essential for successful MV3 migration. Test your extension across multiple scenarios that exercise different service worker lifecycle states.

Test service worker termination and restart by triggering the service worker to shut down (idle for 30+ seconds in most cases) and verify your extension recovers correctly. Check that all state is properly persisted and restored.

Test the declarativeNetRequest rules by installing your extension and verifying that network requests are modified as expected across different domains and request types.

Test with minimal permissions—install your extension in a fresh Chrome profile to verify it functions correctly with only the declared permissions.

Use Chrome's extension debugging tools extensively. The Service Worker debugging view provides insights into worker lifecycle events, while the Console captures runtime errors that might indicate migration issues.

Test across different Chrome versions, as MV3 implementation details may vary slightly between browser releases.

## Chrome Timeline for MV2 Deprecation

Google has completed the MV2 deprecation process. As of recent Chrome versions, MV2 extensions can no longer be uploaded to the Chrome Web Store, and existing MV2 extensions have been disabled for most users. All extensions must target Manifest V3 to remain functional.

This final deprecation means extensions still running on MV2 will no longer work for most users. If you haven't migrated yet, do so immediately to maintain your extension's availability and user base.

The migration process, while requiring significant changes, ultimately produces more secure, efficient, and privacy-respecting extensions. The declarative model improves user trust, service workers reduce resource consumption, and the updated permission system creates a more transparent relationship between extensions and their users.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one*
