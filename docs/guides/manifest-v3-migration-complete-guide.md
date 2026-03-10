---

title: Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Learn about background service workers, declarativeNetRequest, permission changes, and testing strategies.
layout: guide
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"

---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Google's transition from Manifest V2 to Manifest V3 represents the most significant change to Chrome extension development since the platform's inception. This comprehensive guide walks you through every aspect of migrating your extension, from understanding the fundamental architectural shifts to implementing the new patterns required for production-ready MV3 extensions. Whether you're maintaining a simple utility extension or a complex enterprise tool, this guide provides the actionable information you need to complete your migration successfully.

## Understanding the Manifest V2 to V3 Transition

Manifest V3 introduces fundamental changes to how Chrome extensions operate, primarily driven by three key objectives: improving security, enhancing user privacy, and reducing the performance impact of extensions on browser resources. These changes aren't merely cosmetic—they require developers to rethink core architectural decisions that were previously standard practice in extension development.

The most immediate difference you'll encounter is the shift from persistent background pages to ephemeral service workers. In Manifest V2, your background script ran continuously as long as the browser was open, maintaining state in memory and executing tasks on demand. Manifest V3 replaces this with a service worker model where Chrome activates your background script when needed and terminates it after periods of inactivity. This change significantly reduces memory consumption but requires you to think differently about state management, timers, and maintaining continuity across service worker restarts.

Another major transformation involves network request interception. The powerful `webRequest` API that allowed extensions to observe and modify network traffic in nearly unlimited ways has been replaced by the `declarativeNetRequest` API. This new approach uses predefined rules that Chrome evaluates internally, providing a more privacy-conscious and performant way to filter content without requiring broad access to network data.

The elimination of remote code execution represents perhaps the most significant security improvement. Extensions can no longer load and execute JavaScript from external sources at runtime. All code must be bundled within the extension package itself, eliminating a common attack vector that had been exploited by malicious extensions. This change requires you to review your extension's architecture and ensure all functionality is self-contained.

## Background Page to Service Worker Migration

The transition from background pages to service workers affects virtually every aspect of extension development. Understanding the service worker lifecycle and adapting your code accordingly is essential for successful migration.

In Manifest V2, your background page maintained a persistent execution context where variables remained in memory and event listeners stayed active indefinitely. Your code might have looked something like this:

```javascript
// MV2 Background Page
let cachedData = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchData') {
    if (cachedData) {
      sendResponse({ data: cachedData });
    } else {
      fetchDataFromAPI().then(data => {
        cachedData = data;
        sendResponse({ data: data });
      });
      return true; // Keep message channel open for async response
    }
  }
});
```

This pattern no longer works in Manifest V3 because the service worker can be terminated at any time, destroying your in-memory cache. Instead, you must use `chrome.storage` for any data that needs to persist across service worker lifecycles:

```javascript
// MV3 Service Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchData') {
    chrome.storage.local.get(['cachedData']).then(result => {
      if (result.cachedData) {
        sendResponse({ data: result.cachedData });
      } else {
        return fetchDataFromAPI().then(data => {
          chrome.storage.local.set({ cachedData: data });
          sendResponse({ data: data });
        });
      }
    });
    return true; // Required for async sendResponse
  }
});
```

All event listeners must be registered at the top level of your service worker file, never inside functions or callbacks. Chrome scans your service worker on startup to register listeners, and any listener registered after the initial execution will never fire.

For timing operations, replace `setTimeout` and `setInterval` with the `chrome.alarms` API. The service worker doesn't support these standard JavaScript timers because Chrome may terminate the worker before the timeout fires. The alarms API integrates with Chrome's internal scheduler, ensuring your callbacks execute even when the service worker isn't running.

The official documentation for service workers provides deeper insights into implementation patterns. We strongly recommend reviewing our [Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/) for comprehensive coverage of these concepts, including TypeScript patterns, debugging strategies, and production optimization techniques.

## webRequest to declarativeNetRequest Migration

The `webRequest` API in Manifest V2 provided extensive control over network requests but required broad host permissions and granted extensions visibility into all network traffic. The `declarativeNetRequest` API in Manifest V3 addresses these privacy concerns by using a rule-based approach where Chrome evaluates rules internally without exposing raw request data to your extension.

To migrate from `webRequest` to `declarativeNetRequest`, you must first identify all the network modifications your extension performs. Common patterns include blocking specific URLs, redirecting requests, modifying headers, and preventing certain request types from completing. Each of these patterns has a corresponding rule type in the declarativeNetRequest API.

Here's an example of creating blocking rules:

```json
{
  "declarative_net_request": {
    "rule_resources": [{
      "id": "blocking_rules",
      "enabled": true,
      "path": "rules/blocking.json"
    }]
  }
}
```

And the corresponding rules file:

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
    "action": { "type": "redirect", "redirect": { "url": "https://example.com/placeholder.png" } },
    "condition": {
      "urlFilter": ".*\\.tracker\\.com/ads.*",
      "resourceTypes": ["image"]
    }
  }
]
```

The key difference is that you define rules statically in JSON files (static rules) or dynamically through the API (dynamic rules), and Chrome applies these rules without your extension needing to intercept or observe individual requests. This approach is significantly more performant and private but requires upfront planning to determine all the conditions your rules need to handle.

For more complex scenarios involving header modifications, request blocking with exceptions, or dynamic rule management, consult our detailed [Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

## Remote Code Elimination

One of the most consequential changes in Manifest V3 is the prohibition on executing remote code. Extensions can no longer fetch JavaScript from external servers and execute it at runtime. All code must be bundled within the extension package uploaded to the Chrome Web Store.

This change primarily affects extensions that dynamically loaded scripts for the following purposes:

- Loading configuration files or feature flags from external servers
- Using third-party analytics or tracking scripts that loaded externally
- Implementing plugin systems that loaded user-provided scripts
- Fetching and executing code based on runtime conditions

For configuration management, the recommended approach is to bundle your configuration and update it through the Chrome Web Store's standard update mechanism or the extensions management API. If you need to support dynamic configuration, consider using the `chrome.storage` API to store user preferences that your bundled code reads at runtime.

Analytics and tracking must now be implemented using the extension's built-in capabilities or by bundling all necessary tracking code within the extension. Many developers have moved to server-side analytics where the extension sends events to your own server, which then processes and aggregates the data.

## Content Script Changes

Content scripts in Manifest V3 operate similarly to Manifest V2 with a few important differences. Most significantly, content scripts can no longer be executed from remotely hosted pages—they must be bundled with the extension.

The manifest declaration remains straightforward:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

However, communicating between your content script and the service worker requires the message passing system. Content scripts can no longer directly access variables or functions in the background page—they must send messages and wait for responses. This architectural separation reinforces the isolation between the content script context and the extension's background service worker.

Dynamic values that were previously computed in the background page and injected into content scripts must now either be computed within the content script itself or requested through the messaging API. Plan for additional latency in these communications since the service worker may need to start up if it isn't already running.

## Permission Model Updates

Manifest V3 implements a more granular permission system that balances functionality with user privacy. Several permissions that were previously optional in Manifest V2 are now required for specific API features, and some powerful permissions now trigger additional user warnings.

The `host_permissions` field in your manifest controls access to website data. Instead of broad patterns like `http://*/*` or `<all_urls>`, prefer specific host patterns that limit your extension's access to only what's necessary. Chrome displays prominent warnings when users install extensions with broad host permissions, and the Chrome Web Store may require justification for extensive permissions.

The `activeTab` permission provides a privacy-friendly alternative to host permissions for many use cases. With `activeTab`, your extension can access the current tab only when the user explicitly invokes it, such as through a toolbar icon click or keyboard shortcut. This approach gives users more control and typically results in better conversion rates on the Chrome Web Store since the permission warning is less alarming.

Certain APIs now require explicit permission declarations that weren't necessary in Manifest V2. Before using the `declarativeNetRequest` API, for example, you must declare it in your manifest. Similarly, the `scripting` API for programmatic content script injection requires its own permission.

Review your extension's manifest and compare it against the current permission requirements. Remove any permissions your extension no longer needs, as this improves user trust and may reduce the severity of installation warnings.

## Action API Migration

The browser action and page action APIs have been unified into a single action API in Manifest V3. If your extension uses either of these older APIs, you'll need to update your code to use the new pattern.

In Manifest V2, you might have had:

```json
{
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" }
  }
}
```

Manifest V3 uses the unified `action` field:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" }
  }
}
```

Similarly, the JavaScript API has changed from `chrome.browserAction` to `chrome.action`. Update all references in your code, including event listeners for clicks and any programmatic manipulation of badges or titles.

## Storage Patterns

The storage APIs in Manifest V3 work similarly to Manifest V2 but with important performance considerations for the service worker environment. Since your service worker can be terminated at any time, all persistent data must be stored using `chrome.storage` rather than in-memory variables.

The `chrome.storage` API provides two main areas: `local` for extension-specific data and `sync` for data that should synchronize across the user's devices when they're signed into Chrome. Choose the appropriate storage area based on whether your data needs to follow the user across devices.

For frequently accessed data, implement a caching layer that loads data from storage into memory when the service worker starts, then reads from storage for persistence:

```javascript
let cache = {};

async function initializeCache() {
  const result = await chrome.storage.local.get(['settings', 'userData']);
  cache = result;
}

// Initialize on service worker startup
initializeCache();

function updateCache(key, value) {
  cache[key] = value;
  chrome.storage.local.set({ [key]: value });
}
```

This pattern ensures your service worker can access data quickly while maintaining persistence across restarts.

## Step-by-Step Migration Checklist

Migrating a complex extension can be overwhelming. Use this systematic checklist to ensure you address all necessary changes:

First, update your manifest file to use manifest_version 3 and review all permission declarations. Remove unnecessary permissions and update the host_permissions section to be as specific as possible.

Second, convert your background script to a service worker. Register all event listeners at the top level, replace timers with chrome.alarms, and implement chrome.storage for any persistent state. Test that your extension functions correctly after the service worker is terminated and restarted.

Third, migrate network request interception to declarativeNetRequest. Document all URL patterns your extension blocks or modifies, create corresponding rule files, and update your manifest to declare the declarative_net_request permission and rule resources.

Fourth, review all code that executes remotely and bundle it within your extension. Update any configuration loading to use chrome.storage or bundled JSON files.

Fifth, update content script communication to use the message passing API. Ensure all communication pathways work correctly with the ephemeral service worker.

Sixth, update the action API references from browserAction or pageAction to the unified action API.

Seventh, test your extension thoroughly in development mode, paying special attention to scenarios that involve service worker lifecycle events.

Finally, test your migrated extension with the Chrome Extension Test Template provided by Google to ensure compatibility with upcoming Chrome changes.

## Common Pitfalls

Several issues frequently trip up developers during migration. Understanding these pitfalls in advance can save significant debugging time.

The most common issue is failing to handle service worker termination properly. Many developers assume their background script stays running and use in-memory variables for state. When the service worker restarts, this state is lost, causing unexpected behavior. Always use chrome.storage for anything that must persist.

Another frequent mistake is registering event listeners inside functions or callbacks. Chrome scans your service worker on startup to discover listeners, and any listener registered after that point won't receive events. Place all listener registrations at the top level of your service worker file.

With declarativeNetRequest, developers often forget that static rules require the extension to be updated in the Chrome Web Store when rules change. If you need to update rules frequently without requiring a full extension update, use dynamic rules instead.

The async message handling pattern catches many developers off guard. When responding to messages asynchronously, you must return true from the listener to keep the message channel open. Without this, your sendResponse callback will fail.

Finally, ensure you declare all required permissions in your manifest. Unlike Manifest V2, where some APIs worked without explicit declaration, Manifest V3 requires explicit permission for each API your extension uses.

## Testing Strategy

Comprehensive testing is essential for a successful migration. Your testing strategy should cover functional correctness, performance, and edge cases related to the service worker lifecycle.

Start by testing basic functionality in a fresh development environment. Install your extension from the unpacked extension page and verify that all features work as expected. Pay special attention to features that rely on background processing, as these are most likely to encounter issues with the service worker model.

Test service worker lifecycle scenarios explicitly. After confirming basic functionality, force the service worker to terminate (available in chrome://extensions) and verify that your extension still functions correctly when activated. This simulates real-world conditions where Chrome terminates idle service workers.

Use Chrome's developer tools to debug your service worker. The Service Worker debugging pane in chrome://extensions shows the service worker status, provides access to the console, and allows you to inspect storage. The Network tab can help identify issues with message passing between content scripts and the service worker.

Test with the "Do not persist" option enabled in developer mode to ensure your extension works correctly across service worker restarts. This option simulates the production environment where service workers are terminated more aggressively.

Finally, test with multiple windows and tabs to ensure your extension handles concurrent contexts correctly. The sync storage API can exhibit race conditions under heavy concurrent access that won't appear in single-session testing.

## Chrome Timeline for MV2 Deprecation

Google has implemented a phased deprecation of Manifest V2, and understanding this timeline is crucial for planning your migration.

The Chrome Web Store stopped accepting new Manifest V2 extensions in January 2022 and began requiring MV3 for all new extensions and updates. Existing Manifest V2 extensions can still function, but they receive reduced visibility in the store and will eventually be removed.

Chrome has gradually increased the restrictions on Manifest V2 extensions with each release. The timeline has shifted multiple times based on developer feedback and the complexity of migration, so monitor the official Chrome Extensions blog for the most current information.

The recommended approach is to complete your migration as soon as possible, regardless of the current deadline. Extensions that delay migration risk losing users who encounter warnings or find their extension no longer available.

For enterprise environments, Chrome offers Enterprise policies that can extend Manifest V2 support, but this is a temporary measure. All extensions should plan for full Manifest V3 compatibility.

---

*This guide is part of the Chrome Extension Guide by theluckystrike. For more tutorials and patterns, visit [zovo.one](https://zovo.one).*
