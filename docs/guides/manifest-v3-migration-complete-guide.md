---

title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covering service workers, declarativeNetRequest, permission changes, and more.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"

---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's transition from Manifest V2 to Manifest V3 represents the most significant change to the extension platform since its inception. This comprehensive guide walks you through every aspect of migrating your extension, from understanding the fundamental architectural shifts to executing a smooth transition that maintains functionality while leveraging MV3's improved security and performance characteristics.

The migration process touches nearly every component of your extension. Background pages become service workers, the powerful webRequest API gives way to the more restrictive declarativeNetRequest, and the permission model undergoes substantial tightening. Understanding these changes holistically will help you plan a migration strategy that minimizes disruption to your users while taking full advantage of Manifest V3's benefits.

## Understanding MV2 vs MV3 Architecture Differences

The architectural shift between Manifest V2 and Manifest V3 represents a fundamental change in how Chrome extensions operate. Manifest V2 relied on persistent background pages that remained loaded throughout the browser session, maintaining direct access to Chrome APIs and enabling straightforward synchronous operations. This model, while simple to understand, consumed significant memory resources even when the extension wasn't actively performing tasks.

Manifest V3 replaces this persistent model with an event-driven architecture built on service workers. Unlike background pages, service workers are temporary workers that activate in response to events and terminate when idle. This approach dramatically reduces memory footprint across the Chrome ecosystem but requires developers to rethink how they manage state, handle long-running operations, and coordinate between different extension components.

The implications of this change ripple through every aspect of extension development. Global variables that persisted across message passing in MV2 must now be stored in chrome.storage or other persistent storage mechanisms. Timer-based operations that relied on setInterval with persistent background pages need redesign to work within the service worker's ephemeral lifecycle. The asynchronous nature of service workers also means that callback-based APIs must give way to Promise-based patterns throughout your codebase.

Beyond the background script architecture, MV3 introduces several other architectural differences worth understanding. The action API consolidates what were previously separate browserAction and pageAction APIs into a unified model. The execution environment for content scripts has tighter isolation, and the introduction of offscreen documents provides a new mechanism for handling operations that previously required background page DOM access.

## Migrating from Background Pages to Service Workers

The transition from background pages to service workers constitutes the most complex part of any MV3 migration. This process requires rethinking state management, event handling, and the overall lifecycle of your extension's background logic. For a detailed technical guide, refer to our [Background to Service Worker Migration Guide](/chrome-extension-guide/docs/guides/background-to-sw-migration/). For comprehensive coverage of service worker architecture, see our [MV3 Service Workers Guide](/chrome-extension-guide/docs/mv3/service-workers/).

The first major change you'll encounter is the removal of persistent background pages. In MV2, your background script loaded when the extension installed and remained active until the extension was disabled or removed. Service workers, by contrast, activate in response to events and terminate after a period of inactivity. This means you cannot rely on global variables persisting between user interactions.

```javascript
// MV2 Background Page - Global state persists
let cachedData = null;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getData') {
    if (cachedData) {
      sendResponse(cachedData);
    } else {
      fetchData().then(data => {
        cachedData = data;
        sendResponse(data);
      });
    }
    return true;
  }
});

// MV3 Service Worker - State must be persisted
import { getData, setData } from './storage.js';

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'getData') {
    let cachedData = await getData();
    if (!cachedData) {
      cachedData = await fetchData();
      await setData(cachedData);
    }
    sendResponse(cachedData);
    return true;
  }
});
```

Event handling in service workers requires careful attention to how Chrome dispatches events to your extension. Service workers must declare the event types they handle in the addListener calls, which allows Chrome to optimize when it wakes your worker. This means you'll need to ensure all your event listeners are registered synchronously during the service worker's initial execution phase.

Timer handling also requires rethinking in the service worker context. While setTimeout and setInterval still work, they're not reliable for long-running operations because the service worker may terminate before the timer fires. Instead, use the chrome.alarms API for scheduling periodic tasks, which will wake your service worker when needed.

The chrome.storage API becomes your primary tool for maintaining state across service worker invocations. Unlike the background page's global variables, data stored in chrome.storage persists across terminations and can be shared across all extension contexts. For performance-critical scenarios, consider using chrome.storage.session for data that doesn't need to persist across browser restarts.

## Converting webRequest to declarativeNetRequest

The webRequest API in Manifest V2 provided powerful capabilities for intercepting and modifying network requests in flight. Manifest V3 replaces this with the declarativeNetRequest API, which works fundamentally differently. Rather than intercepting requests programmatically, you define rules declaratively that Chrome applies when processing network requests. See our [declarativeNetRequest Guide](/chrome-extension-guide/docs/mv3/declarative-net-request/) for in-depth coverage.

The key difference is that declarativeNetRequest works by specifying static rule sets that Chrome evaluates against network requests. Your extension no longer examines individual requests or modifies them on the fly. Instead, you define rules beforehand, and Chrome applies those rules automatically. This provides better privacy guarantees since your extension never sees the actual request data, but it requires upfront planning about what rules you need.

```javascript
// MV2 with webRequest - Programmatic interception
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('tracker')) {
      return { cancel: true };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// MV3 with declarativeNetRequest - Declarative rules
// manifest.json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "block_trackers",
      "enabled": true,
      "path": "rules/tracker-rules.json"
    }]
  }
}

// rules/tracker-rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "tracker",
      "resourceTypes": ["script", "image"]
    }
  }
]
```

The declarativeNetRequest API has several important limitations compared to webRequest. You cannot inspect or modify request bodies, cannot redirect to URLs computed at runtime (except through pre-defined redirect rules), and cannot dynamically decide whether to block a request based on external data. For many extensions, particularly ad blockers and content filters, these limitations are acceptable given the improved security model.

If your extension requires dynamic request modification based on runtime conditions, you'll need to architect around these limitations. One common pattern is to pre-generate a comprehensive set of rules covering anticipated scenarios, then enable or disable rule sets based on user preferences. Another approach involves using the declarativeNetRequestWithHostAccess permission, which allows rules to be evaluated in context when combined with host permissions.

## Eliminating Remote Code Execution

One of Manifest V3's primary security goals is eliminating remote code execution from extensions. In MV2, extensions could load and execute JavaScript from external URLs, which created significant attack surface if those external resources were compromised. MV3 requires all executable code to be bundled within the extension package.

This change means you must audit any extensions that load external scripts, stylesheets, or modules from CDNs or other remote sources. Fonts, images, and other static assets can still be loaded remotely, but all JavaScript must be bundled. This includes any libraries you might have been loading from CDNs like jQuery, Lodash, or framework dependencies.

For libraries, the solution is straightforward: bundle them with your extension using a build tool like Webpack, Rollup, or Vite. Modern bundlers can treeshake unused code, keeping your extension size reasonable even when including library code. Many popular libraries also offer ES module versions that work well with modern bundlers.

If you absolutely must load external resources, consider using the chrome.runtime.getURL function to reference files within your extension package. For content that genuinely needs to be dynamic, explore alternatives like the Storage API for configuration or the Fetch API for retrieving data at runtime that can be processed locally.

## Content Script Changes in MV3

Content scripts in MV3 operate similarly to MV2 with some important differences. They still run in the context of web pages, but the isolation between content scripts and the extension's background service worker is stricter. Message passing remains the primary communication channel, but you should ensure your code handles the asynchronous nature of these communications properly.

One significant change involves how content scripts are declared in the manifest. The content_scripts key works similarly, but you should be aware that match patterns must now be more specific. The <all_urls> wildcard is restricted in certain contexts, and you may need to explicitly declare host permissions for the domains where your content scripts operate.

Dynamic content script registration through chrome.scripting.registerContentScript replaces the old chrome.contentScripts API. This allows your extension to register content scripts at runtime based on user actions or preferences, providing more flexibility than static declarations.

```javascript
// MV3 Dynamic content script registration
chrome.scripting.registerContentScript({
  id: 'my-content-script',
  matches: ['<all_urls>'],
  js: ['content-script.js'],
  css: ['styles.css'],
  runAt: 'document_idle'
});
```

Content script isolation also means you cannot access extension APIs directly from the page context. Any extension API calls must go through the content script, which then communicates with the service worker via message passing. This separation reinforces the security boundary between web pages and extension functionality.

## Updating the Permission Model

Manifest V3 implements a more granular permission system designed to give users clearer insight into what capabilities extensions request. Several previously optional permissions are now mandatory, while others have been restructured to provide more specific access.

The most notable change involves host permissions. In MV2, extensions could request broad access to all URLs with a single permission. MV3 separates host permissions into their own declaration, making it clearer to users when an extension can access data on any website. For extensions that need to modify content on web pages, you'll need to declare appropriate host permissions.

Several powerful APIs now require explicit permission declarations that were previously implicit. The tabs API, for instance, requires explicit permission to access tab URLs and titles. The bookmarks and history APIs similarly need explicit permission declarations. Review your extension's use of Chrome APIs and ensure all required permissions are declared in your manifest.

Some permissions trigger additional review during the Chrome Web Store submission process. Permissions like debugger, pageCapture, and proxy are considered sensitive and require manual review. Plan accordingly if your extension uses these capabilities.

```json
{
  "permissions": [
    "storage",
    "alarms",
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ]
}
```

## Migrating the Action API

The browserAction and pageAction APIs from MV2 are consolidated into the single Action API in MV3. This simplification means you no longer need to choose between these two patterns or use workarounds to display actions conditionally. The Action API provides a unified interface for all extension actions.

For extensions that used browserAction, the migration is straightforward: replace references to chrome.browserAction with chrome.action. The API surface is nearly identical, with minor differences in how certain properties are accessed.

```javascript
// MV2 browserAction
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000' });
chrome.browserAction.onClicked.addListener((tab) => {
  // Handle click
});

// MV3 Action API
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
chrome.action.onClicked.addListener((tab) => {
  // Handle click
});
```

Extensions that previously used pageAction will find the transition equally straightforward. The pageAction API's functionality is fully incorporated into the Action API. Conditional display of the action icon now uses chrome.action.setIcon with the tabId parameter rather than separate show and hide methods.

## Updated Storage Patterns

Storage patterns in MV3 require adjustment to work properly with the service worker architecture. The chrome.storage API remains the primary persistence mechanism, but how you use it should change to account for service worker lifecycle considerations.

The most significant change involves storage access from content scripts. In MV2, content scripts could often access background page variables directly. In MV3, all cross-context communication should go through message passing, with storage as the backing store for shared state. Consider implementing a proper state management pattern that centralizes storage operations in your service worker.

```javascript
// Service worker - Centralized storage management
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get('settings').then(result => {
      sendResponse(result.settings);
    });
    return true;
  }
  
  if (message.type === 'UPDATE_SETTINGS') {
    chrome.storage.local.set({ settings: message.settings }).then(() => {
      // Notify all tabs of the change
      chrome.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { 
            type: 'SETTINGS_UPDATED', 
            settings: message.settings 
          }).catch(() => {});
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }
});
```

The session storage API (chrome.storage.session) provides fast access to volatile data that doesn't need to persist across browser restarts. This is useful for caching data that can be recomputed if lost, improving performance without risking data corruption if the service worker terminates unexpectedly.

## Step-by-Step Migration Checklist

A systematic approach to migration reduces the risk of missing critical changes. Use this checklist as your migration roadmap, working through each item methodically.

First, audit your current extension's manifest.json to identify all permissions, background script declarations, and content script configurations. Document the current state before making any changes. This baseline helps you verify that all functionality transfers correctly after migration.

Next, create a new manifest file for MV3 while keeping your MV2 manifest as a backup. Update the manifest_version field to 3, then systematically address each section. Move host permissions to the host_permissions key, update the action API references, and configure declarativeNetRequest rules if needed.

After updating the manifest, migrate your background script to service worker patterns. Remove global variable dependencies, implement chrome.storage for state management, replace timers with chrome.alarms, and ensure all event listeners are registered synchronously. Test thoroughly at each step.

Then handle the webRequest to declarativeNetRequest conversion. Analyze what request modifications your extension performs, translate those into declarative rules, and test that the rules match and block or redirect as expected. Remember that dynamic modifications require pre-defined rule sets.

Update content scripts for any API changes and verify message passing works correctly with the service worker. Check that any external resources are properly bundled or replaced with local alternatives. Review permission declarations and add any newly required permissions.

Finally, test across multiple scenarios: fresh installation, extension update, browser restart, and various user interaction patterns. Pay special attention to edge cases where the service worker might terminate during operations.

## Common Pitfalls and How to Avoid Them

Several recurring issues trip up developers during MV3 migration. Understanding these pitfalls helps you avoid wasted time and frustration.

The most common issue involves assuming service workers behave like background pages. Global state disappears when service workers terminate, so any assumption that variables persist between events will cause bugs. Always use chrome.storage for data that must persist.

Another frequent problem involves event listener registration. Service workers must register all listeners during their initial execution phase. Listeners registered inside asynchronous callbacks or conditional logic won't be triggered because Chrome evaluates listener declarations synchronously when activating the service worker.

Forgetting to declare required permissions is another common issue. The transition from MV2 often reveals implicit permission dependencies that weren't previously declared. Test your extension with a fresh profile to ensure all required permissions are explicitly declared.

Message passing timeouts also cause issues when developers assume synchronous responses. Service workers can terminate between sending a message and receiving a response. Implement proper Promise-based handling and consider using persistent connections for long-running communications.

The declarativeNetRequest limitations frequently cause frustration for developers accustomed to webRequest's flexibility. If your extension requires dynamic request modification, plan your architecture around pre-defined rules or consider whether the extension's core functionality can be achieved differently.

## Testing Your Migrated Extension

Comprehensive testing is essential for MV3 migration given the architectural changes involved. Start by testing basic functionality manually, verifying that all core features work with the new service worker architecture.

Use Chrome's developer tools to inspect the service worker lifecycle. The Service Workers section in the Application tab shows registration status, active worker, and provides controls for testing update cycles. Enable "Update on reload" during development to ensure you're testing the latest code.

Automated testing becomes more important in MV3 given the asynchronous nature of service worker operations. Write tests that verify storage operations complete correctly, message passing works across contexts, and alarms fire as expected. Consider using chrome.test for extension-specific testing capabilities.

Test across different scenarios that trigger service worker lifecycle events: idle termination, forced update, browser restart, and extension reload. Ensure your extension handles these transitions gracefully without data loss or broken functionality.

Pay special attention to memory usage. One benefit of MV3's service worker model is reduced memory footprint, but poor implementation can negate this benefit. Use Chrome's memory profiling tools to ensure your extension doesn't have memory leaks, particularly around event listener cleanup.

## Chrome's MV2 Deprecation Timeline

Google has established a clear timeline for phasing out Manifest V2 extensions. While dates have shifted due to developer feedback and ecosystem considerations, understanding the timeline helps you plan your migration appropriately.

The Chrome Web Store stopped accepting new Manifest V2 extensions in January 2023, though existing extensions could continue to be updated. The deprecation has progressed through multiple phases, with progressively stricter enforcement of MV3 requirements.

As of the current timeline, Manifest V2 extensions will be fully disabled in future Chrome versions. Users with installed MV2 extensions will see notifications prompting them to find alternatives. Extension developers should prioritize migration to ensure their users aren't stranded.

For enterprise environments, Chrome provides extended support for managed devices running older Chrome versions, but this is a temporary measure. The direction is clear: all extensions must migrate to Manifest V3.

The best time to migrate was when MV3 became available. The second-best time is now. Starting your migration early gives you time to address issues without pressure and ensures your users have a smooth transition.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
