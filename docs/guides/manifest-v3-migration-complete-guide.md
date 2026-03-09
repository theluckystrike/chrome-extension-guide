---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating your Chrome extension from Manifest V2 to Manifest V3. Learn about background service workers, declarativeNetRequest, permission changes, and more.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's transition from Manifest V2 to Manifest V3 represents the most significant architectural change in Chrome extension development history. Google announced the deprecation timeline for Manifest V2 extensions, making migration not just recommended but necessary for maintaining your extension's presence in the Chrome Web Store. This comprehensive guide walks you through every aspect of migrating your extension from MV2 to MV3, covering architecture changes, API replacements, permission updates, and testing strategies.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental difference between Manifest V2 and Manifest V3 lies in how the browser handles extension background processes. In Manifest V2, background pages ran as persistent HTML pages that stayed alive throughout the browser session. These pages could execute code at any time, maintain long-lived connections, and access browser APIs continuously. This model, while powerful, created significant memory overhead because extensions consumed resources even when performing no useful work.

Manifest V3 introduces background service workers, which are event-driven, ephemeral JavaScript modules that Chrome manages automatically. Service workers activate only when needed—such as when a user interacts with your extension or when a registered event fires—and terminate after a period of inactivity. This architecture reduces memory consumption significantly but requires developers to rethink how they structure background logic.

The implications extend beyond just memory management. Service workers cannot access the DOM directly, cannot use synchronous XHR, and cannot maintain state between invocations in the same way background pages could. You must now use the [Chrome Extension Background Service Worker](/docs/guides/background-service-worker/) pattern to handle state persistence, and you need to implement proper event handling that accounts for the service worker's lifecycle.

Another critical architectural change involves remote code execution. Manifest V2 allowed extensions to load and execute remote JavaScript code, which created significant security vulnerabilities. Manifest V3 eliminates this attack vector by requiring all extension code to be bundled within the extension package. This means no loading external scripts from CDNs, no fetching code from remote servers at runtime, and no dynamic code evaluation. While this improves security substantially, it requires developers to bundle all dependencies and update their extension through the Web Store submission process rather than pushing code changes remotely.

## Migrating from Background Pages to Service Workers

The transition from background pages to service workers is perhaps the most impactful change in the migration process. Your existing background script likely assumes a persistent execution environment where variables retain their values and event listeners remain active indefinitely. This assumption no longer holds in MV3.

To migrate successfully, you need to refactor your background script into a service worker that follows the [service worker lifecycle](/docs/guides/chrome-extension-service-worker-lifecycle/). Register all event listeners at the top level of your service worker file, as these are what keep your worker alive when activated. Avoid storing data in global variables between handler invocations—instead, use chrome.storage API or chrome.storage.session for persistent and temporary data respectively.

```javascript
// MV2 Background Page (persistent)
let cachedData = null;

function getData() {
  if (!cachedData) {
    cachedData = fetchDataFromAPI();
  }
  return cachedData }

// MV3 Service Worker (ephemeral)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    // Must fetch fresh or retrieve from storage
    chrome.storage.local.get(['cachedData'], (result) => {
      sendResponse(result.cachedData);
    });
    return true; // Keep message channel open for async response
  }
});
```

Notice the critical difference: in MV3, you cannot rely on in-memory caching across service worker invocations. Every time your service worker wakes up, it starts fresh. Additionally, when using chrome.storage within an event listener that needs to send a response asynchronously, you must return true to indicate the response will be handled later.

## Converting webRequest to declarativeNetRequest

The webRequest API in Manifest V2 allowed extensions to intercept, block, or modify network requests in-flight. This powerful capability required broad permissions that created privacy concerns—extensions could potentially read all network traffic. Manifest V3 replaces this with the [declarativeNetRequest API](/docs/guides/declarative-net-request/), which uses a declarative rules-based approach.

Instead of intercepting requests programmatically, you define rules in JSON files that Chrome applies automatically. This approach is more performant and privacy-preserving because extensions never see the actual request data—Chrome applies the rules internally.

```json
// rules.json (declarativeNetRequest)
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": ".*tracking\\.com.*",
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
      "urlFilter": ".*\\.ad\\.png$",
      "resourceTypes": ["image"]
    }
  }
]
```

In your manifest.json, you need to declare the ruleset:

```json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["*://*/*"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

The declarativeNetRequest API has limitations compared to webRequest. You cannot read request headers or bodies, cannot make decisions based on complex runtime conditions, and cannot modify requests with the same flexibility. However, for common use cases like ad blocking, content filtering, and request redirection, the API provides sufficient capability while significantly improving performance and privacy.

## Remote Code Elimination

Manifest V3's ban on remote code execution fundamentally changes how you develop and distribute extensions. In MV2, you might have loaded libraries from CDNs, fetched configuration from your server, or dynamically generated code based on user settings. None of these patterns work in MV3.

To migrate, audit your extension for any external script loading. Replace CDN-hosted libraries with bundled copies—you can download JavaScript libraries and include them in your extension package. For configuration that previously came from a remote server, consider embedding default configuration in your extension and using chrome.storage to allow users to customize settings locally.

```javascript
// MV2: Loading external library
const script = document.createElement('script');
script.src = 'https://cdn.example.com/library.js';
document.head.appendChild(script);

// MV3: Bundled library
import { SomeLibrary } from './bundled/library.js';
```

This change actually improves your extension's reliability because users won't experience breakages when external services are unavailable, and you eliminate an entire category of security vulnerabilities related to supply chain attacks.

## Content Script Changes

Content scripts in MV3 have several important differences from MV2. They still run in the context of web pages, but you now declare them as part of a separate array in manifest.json rather than using the old content_scripts format. Additionally, the way content scripts interact with the background service worker has changed.

When communicating between content scripts and your background service worker, you use message passing just as before, but the background endpoint is now ephemeral. Ensure your message handlers are properly registered and that you handle the asynchronous nature of service worker communication correctly.

One significant change involves the execution environment. In MV2, content scripts could execute code in the main world, sharing the page's JavaScript context. In MV3, content scripts always run in an isolated world by default, meaning they cannot access page variables directly. If you need to inject code into the page's context, you must use a script injection approach:

```javascript
// Injecting into page context (MV3)
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => {
    // This runs in page context
    window.pageVariable = 'Hello from extension';
  }
});
```

## Permission Model Updates

Manifest V3 introduces a refined permission model that balances functionality with user privacy. Several permissions that were optional in MV2 now require explicit user consent at installation time, and some capabilities have moved to optional permissions.

The most notable change involves host permissions. In MV2, you could request broad host access that granted your extension read and modify access to all websites. In MV3, you must declare specific host permissions in the manifest, and users will see these permissions during installation. For extensions that need to access many websites, consider using dynamic permissions that request access only when needed:

```javascript
// Requesting host permission dynamically (MV3)
chrome.permissions.request({
  origins: ['https://*.example.com/']
}, (granted) => {
  if (granted) {
    // Permission granted, can now access example.com
  }
});
```

Certain powerful APIs now require the extension to be installed from the Chrome Web Store and cannot be used in unpacked development mode. Test your extension thoroughly with the proper manifest configuration to ensure permissions work correctly.

## Action API Migration

The browserAction API from MV2 becomes the action API in MV3. The functionality remains similar, but the API surface has been modernized and improved. If you're migrating from browserAction, update your code to use chrome.action instead.

```javascript
// MV2
chrome.browserAction.setIcon({ path: 'icon.png' });
chrome.browserAction.setBadgeText({ text: '5' });

// MV3
chrome.action.setIcon({ path: 'icon.png' });
chrome.action.setBadgeText({ text: '5' });
```

The action API also supports newer features like badge text colors and popup previews that weren't available in the older API. Review the [Chrome Action API Guide](/docs/guides/action-api/) for complete implementation details.

## Storage Patterns

Storage patterns must adapt to the ephemeral nature of service workers. The chrome.storage API remains available, but you should use it more intentionally. The session storage (chrome.storage.session) provides a useful option for data that doesn't need to persist across browser sessions but should remain available within a service worker invocation.

For complex data synchronization needs, consider using IndexedDB from your service worker, as it provides more robust storage capabilities than chrome.storage for large datasets.

```javascript
// Using session storage for temporary data
chrome.storage.session.set({ temporaryData: 'value' });

// Retrieving with callback
chrome.storage.session.get(['temporaryData'], (result) => {
  console.log(result.temporaryData);
});
```

## Step-by-Step Migration Checklist

Use this checklist to track your migration progress:

1. **Audit your manifest.json** - Update manifest_version from 2 to 3, review and specify all required permissions
2. **Convert background scripts** - Refactor background pages to service workers, implement proper event handling
3. **Update network request handling** - Replace webRequest with declarativeNetRequest rules
4. **Bundle dependencies** - Remove all external script loading, include libraries in package
5. **Migrate content scripts** - Review injection methods, update message passing for service worker communication
6. **Update action API calls** - Replace browserAction references with action API
7. **Review storage usage** - Adapt caching strategies for ephemeral service worker environment
8. **Test thoroughly** - Verify all functionality works with MV3 manifest

## Common Pitfalls

Several issues frequently trip up developers during migration. The service worker lifecycle causes confusion because variables don't persist between invocations—always use chrome.storage for data that needs to persist. Asynchronous message handling trips up developers who expect synchronous responses—remember to return true from event listeners when sending async responses.

DeclarativeNetRequest rules have limits on the number of rules and rulesets you can define—plan your rules carefully and test with realistic rule counts. Host permission changes mean you might not have access to websites you expected—request permissions dynamically or declare them explicitly in the manifest.

## Testing Strategy

Test your migrated extension extensively before submitting to the Chrome Web Store. Load your extension as an unpacked extension in developer mode to catch runtime errors. Use Chrome's service worker debugging tools to verify proper event handling and lifecycle management. Test across different Chrome profiles and with the extension disabled/enabled to ensure state persistence works correctly.

Pay particular attention to edge cases: what happens when the service worker is terminated mid-operation? How does your extension behave when Chrome restarts? Does your extension recover gracefully from storage quota exceeded errors?

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for Manifest V2 deprecation. The Chrome Web Store stopped accepting new Manifest V2 extensions in January 2023, though updates to existing MV2 extensions continued to be allowed through early 2024. Starting in June 2024, Chrome began disabling existing Manifest V2 extensions for users with the extension being gradually rolled out.

Extensions still on Manifest V2 will stop working entirely as Chrome completes the transition. The exact timeline continues to evolve, but the direction is clear—all extensions must migrate to Manifest V3 to remain functional. Submit your migrated extension to the Chrome Web Store as soon as possible to ensure continuity for your users.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
