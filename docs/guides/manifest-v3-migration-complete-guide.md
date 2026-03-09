---
layout: default
title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: "A comprehensive step-by-step guide to migrating your Chrome extension from Manifest V2 to V3. Covers service worker migration, declarativeNetRequest, permission changes, and deprecation timeline."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

The transition from Manifest V2 to Manifest V3 represents the most significant architectural change in Chrome extension development history. Google introduced MV3 to enhance security, improve performance, and protect user privacy, but these improvements require developers to rethink fundamental aspects of their extensions. This comprehensive guide walks you through every aspect of migrating your extension from MV2 to MV3, with practical code examples, common pitfalls to avoid, and a testing strategy that ensures your migrated extension works correctly.

## Understanding the MV2 vs MV3 Architecture Differences

Before diving into the migration process, it's essential to understand the fundamental architectural differences between Manifest V2 and Manifest V3. These changes aren't merely syntactic—they represent a complete shift in how Chrome extensions operate, from background script execution to network request interception.

The most significant difference lies in the background execution model. In MV2, background scripts run in a persistent background page that stays alive as long as the browser is open. This page has access to the full DOM and can maintain long-running connections without concern for lifecycle management. MV3 replaces this persistent model with ephemeral service workers that Chrome activates when needed and terminates after periods of inactivity. This change dramatically reduces memory footprint but requires developers to handle state differently and implement strategies for persisting data across service worker restarts.

Network request modification represents another major architectural shift. MV2 allowed extensions to use the blocking `webRequest` API to intercept and modify network requests synchronously. MV3 replaces this with the declarativeNetRequest API, which uses a declarative ruleset approach. Instead of examining and modifying each request in real-time, you define rules upfront that Chrome applies automatically. This improves performance and privacy but requires rethinking how you handle dynamic blocking or modification scenarios.

The remote code execution policy changed significantly between versions. MV2 permitted loading external JavaScript files from remote servers, enabling dynamic code updates but also creating security vulnerabilities. MV3 requires all extension code to be bundled locally, eliminating the risk of remote code injection but requiring you to implement alternative update mechanisms for your extension.

## Background Page to Service Worker Migration

Migrating your background script from the persistent background page model to the service worker model requires careful planning. The service worker's ephemeral nature means you can no longer rely on global variables persisting between events, and you must implement strategies for handling the service worker lifecycle.

Your first step is updating the manifest.json to declare a service worker instead of a background page. Replace the `background.scripts` array with a single `service_worker` property:

```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

The `type: module` setting enables ES modules, which is essential for organizing your code effectively. For more details on implementing service workers, see our [Chrome Extension Background Service Worker Guide](/docs/guides/background-service-worker/).

Unlike the persistent background page, service workers can be terminated at any time after handling events. This means you should avoid storing critical state in global variables. Instead, use the chrome.storage API to persist state:

```javascript
// MV2 - storing state globally (won't work in MV3)
let userSettings = null;
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'updateSettings') {
    userSettings = message.settings; // Will be lost when SW terminates
  }
});

// MV3 - storing state in chrome.storage
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'updateSettings') {
    chrome.storage.local.set({ userSettings: message.settings });
  }
});
```

When your service worker wakes up, you need to restore state from storage before handling events:

```javascript
chrome.runtime.onInstalled.addListener(async () => {
  const { userSettings } = await chrome.storage.local.get('userSettings');
  // Initialize your extension with stored settings
});
```

Timer handling also changes significantly. The `setTimeout` and `setInterval` functions don't work reliably in service workers because they can be terminated before the timer fires. Instead, use the chrome.alarms API:

```javascript
// MV2 - unreliable in service workers
setInterval(() => {
  fetchNewData();
}, 60000);

// MV3 - use chrome.alarms
chrome.alarms.create('fetchData', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'fetchData') {
    fetchNewData();
  }
});
```

## webRequest to declarativeNetRequest Migration

The webRequest to declarativeNetRequest migration is one of the most complex parts of moving to MV3. The blocking webRequest API that many ad blockers and content filters rely on is no longer available, replaced by the declarative ruleset approach.

The declarativeNetRequest API works by defining rules in JSON format that Chrome applies to network requests. These rules are either static (bundled with your extension) or dynamic (added at runtime). For detailed implementation, see our [Chrome Extension Declarative Net Request Guide](/docs/guides/declarative-net-request/).

First, add the required permissions to your manifest:

```json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"]
}
```

Define your rules in a JSON file:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||ads.example.com^",
      "resourceTypes": ["main_frame", "sub_frame", "script", "image"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": { "url": "https://example.com/blocked.html" }
    },
    "condition": {
      "urlFilter": "||malicious-site.com/*",
      "resourceTypes": ["main_frame"]
    }
  }
]
```

Reference this ruleset in your manifest:

```json
{
  "declarative_net_request": {
    "rule_resources": [{
      "id": "blocking_rules",
      "enabled": true,
      "path": "rules/block_requests.json"
    }]
  }
}
```

For dynamic rules that change at runtime, use the updateDynamicRules method:

```javascript
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 100,
      priority: 1,
      action: { type: 'block' },
      condition: { urlFilter: `||${domainToBlock}.com^`, resourceTypes: ['main_frame'] }
    }
  ],
  removeRuleIds: [100]
});
```

The main limitation to be aware of is that you can no longer inspect request headers or bodies in real-time. If your extension needs to analyze request content, consider using the declarativeNetRequestWithHostAccess permission or moving that logic to content scripts.

## Remote Code Elimination

One of the most critical security changes in MV3 is the elimination of remote code execution. All JavaScript, CSS, and WebAssembly must be bundled with your extension. This means you cannot load external scripts in your content_scripts or reference remote URLs in your extension's code.

For content scripts, change external references to local files:

```json
// MV2 - NOT ALLOWED IN MV3
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["https://cdn.example.com/library.js"]
  }]
}

// MV3 - bundle all code locally
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["lib/library.js", "content.js"]
  }]
}
```

If your extension previously loaded code from external servers for dynamic updates, you now need to implement an in-extension update mechanism. One approach is to store your dynamic logic as JSON configuration files that the extension reads at runtime:

```javascript
// rules.json (bundled with extension)
{
  "blockingPatterns": [
    "ads.example.com",
    "tracker.example.net"
  ],
  "redirectRules": [
    { "from": "old-site.com", "to": "new-site.com" }
  ]
}
```

```javascript
// background.js
async function loadRules() {
  const response = await fetch('rules.json');
  const config = await response.json();
  // Apply rules dynamically
  await applyBlockingRules(config.blockingPatterns);
  await applyRedirectRules(config.redirectRules);
}
```

For user-generated scripts or extensions that genuinely need to execute user-provided code, consider using the userScripts API (available in MV3) or evaluating the Sandboxed Web pages approach.

## Content Script Changes

Content scripts in MV3 work similarly to MV2 with a few important differences. They still run in the context of web pages and can communicate with the background service worker via message passing, but some APIs behave differently.

The most significant change is that content scripts no longer share the background page's execution context. They cannot access background variables directly and must communicate through the messaging API:

```javascript
// content.js - sending messages to background
chrome.runtime.sendMessage({ type: 'GET_DATA', url: window.location.href },
  (response) => {
    console.log(response.data);
  });

// background.js - handling messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    fetchData(message.url).then(data => sendResponse({ data }));
    return true; // Keep channel open for async response
  }
});
```

Content script injection has also changed. The `chrome.scripting.executeScript` API replaces the old `chrome.tabs.executeScript`:

```javascript
// MV2
chrome.tabs.executeScript(tabId, {
  file: 'content.js',
  runAt: 'document_idle'
});

// MV3
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js'],
  runAt: 'document_idle'
});
```

Similarly, CSS injection uses the `css` property instead of `insertCSS`:

```javascript
chrome.scripting.insertCSS({
  target: { tabId: tabId },
  files: ['styles.css']
});
```

## Permission Model Updates

The permission model in MV3 introduces significant changes that affect how users interact with your extension. Host permissions can now be requested at runtime rather than only at installation time, giving users more control over what data your extension can access.

For host permissions, request them when needed rather than at installation:

```javascript
// Request host permission when user needs it
function requestAccessToSite(url) {
  const origin = new URL(url).origin;
  chrome.permissions.request({
    origins: [`${origin}/*`]
  }, (granted) => {
    if (granted) {
      console.log('Permission granted for', origin);
      // Now you can access pages on this domain
    }
  });
}
```

Check if you have the necessary permissions before performing operations:

```javascript
chrome.permissions.contains({
  origins: ['https://example.com/*']
}, (result) => {
  if (result) {
    // Can access example.com
  } else {
    // Request permission or show UI to request it
  }
});
```

Be mindful that certain powerful permissions now require Manifest V3 and may trigger additional reviews in the Chrome Web Store. The `scripting` permission, for example, requires the `activeTab` permission or explicit user consent in MV3.

## Action API Migration

The Action API in MV3 replaces both `browserAction` and `pageAction` from MV2 with a unified interface. This simplifies extension development but requires updating your code and manifest entries.

In your manifest, replace the separate entries with a single `action`:

```json
// MV2
{
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" }
  },
  "page_action": {
    "default_icon": { "16": "page-icon16.png" }
  }
}

// MV3
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" }
  }
}
```

Update your JavaScript to use the new API:

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000' });

// MV3
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
```

The action API now supports additional features like side panels and title customizations:

```javascript
// Set a default title for hover tooltip
chrome.action.setTitle({ title: 'My Extension' });

// Enable side panel functionality
chrome.action.setSidePanel({ panel: { path: 'sidepanel.html' } });
```

## Storage Patterns in MV3

Storage patterns in MV3 require more consideration than in MV2 due to the service worker lifecycle. Since the service worker can terminate at any time, you should minimize reliance on in-memory state and persist everything important to chrome.storage.

The chrome.storage API remains the primary storage mechanism but should be used more proactively:

```javascript
// Always read from storage when service worker starts
let cachedSettings = {};

async function initialize() {
  const result = await chrome.storage.local.get(null);
  cachedSettings = result;
  console.log('Settings loaded:', cachedSettings);
}

// Update storage when settings change
function updateSettings(newSettings) {
  cachedSettings = newSettings;
  chrome.storage.local.set(newSettings);
}

// Use storage change listeners for cross-context synchronization
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.userPreferences) {
    cachedSettings.userPreferences = changes.userPreferences.newValue;
    // Notify any open popup or options page
  }
});
```

For sensitive data that needs to persist across sessions, consider using the storage.session API for data that only needs to persist while the browser is running, or the storage.sync API for data that should synchronize across the user's devices.

## Step-by-Step Migration Checklist

Use this checklist to systematically migrate your extension from MV2 to MV3:

1. **Update manifest.json**: Change `manifest_version` to 3 and update background, action, and permissions declarations.

2. **Migrate background script**: Convert from persistent background page to service worker, implement state persistence, and use chrome.alarms for timers.

3. **Migrate network request handling**: Replace webRequest blocking with declarativeNetRequest rules and update any header modification logic.

4. **Bundle remote code**: Download all external scripts and libraries and include them in your extension package.

5. **Update content scripts**: Review message passing implementation and update script injection to use chrome.scripting API.

6. **Migrate permissions**: Implement runtime permission requests for host permissions and audit required permissions.

7. **Update action API**: Replace browserAction and pageAction calls with the unified action API.

8. **Implement storage strategy**: Add state persistence for service worker lifecycle and implement storage change listeners.

9. **Test thoroughly**: Test all functionality in MV3 and verify service worker lifecycle behavior.

## Common Pitfalls and How to Avoid Them

Several common issues trip up developers during MV3 migration. Being aware of these pitfalls helps you avoid wasted debugging time.

The most frequent issue is assuming global state persists. Many developers store configuration in global variables, only to find that their extension loses all settings when the service worker terminates. Always use chrome.storage for any state that must persist.

Timer-related issues are equally common. Using setTimeout or setInterval without understanding the service worker lifecycle leads to missed events. Use chrome.alarms instead, which Chrome guarantees will wake the service worker.

Another pitfall is forgetting to handle the async nature of storage API calls. The chrome.storage methods are asynchronous, so ensure you're using async/await or callbacks correctly. Failing to do this leads to race conditions where your code assumes data is available before it's been read.

For network request modifications, the inability to read request bodies in MV3 catches many developers off guard. If your extension analyzes request or response bodies, you'll need to redesign your approach, possibly moving that logic to content scripts running on specific pages.

Finally, remember that the service worker doesn't have access to the DOM. Any code that manipulates DOM elements directly cannot run in the background service worker—use content scripts for DOM manipulation instead.

## Testing Strategy for MV3 Migration

Testing an MV3 migration requires understanding the new execution model and testing scenarios that didn't exist in MV2.

First, test service worker lifecycle behavior manually. Open chrome://extensions, find your extension, and watch the service worker status. Trigger events and observe the service worker start and terminate. Use the "Inspect" link to open DevTools and debug in real-time.

Automated testing should include Puppeteer or Playwright tests that verify your extension functions correctly across service worker restarts. Test the entire user journey, from installation through all major features, multiple times to catch issues that only appear after the service worker terminates and restarts.

Test permission requests by installing your extension fresh and verifying that all permission prompts appear correctly and that the extension handles permission denial gracefully.

Memory testing becomes more important in MV3. The service worker lifecycle should keep memory usage low, but verify that you're not creating memory leaks by properly cleaning up event listeners and not accumulating data in chrome.storage without cleanup.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 deprecation that extension developers must follow. Understanding this timeline helps you plan your migration appropriately.

As of early 2024, new extensions submitted to the Chrome Web Store must use Manifest V3. Existing MV2 extensions can still be updated, but new features and APIs are only available in MV3.

The final deprecation date for MV2 in Chrome has been extended to give developers more migration time. Chrome will eventually disable MV2 extensions entirely, at which point all extensions must be on MV3 to function.

For enterprise administrators using the ExtensionManifestV2Availability policy, Chrome provides additional time for large organizations to complete their migrations. However, developers should not rely on this extended support and should migrate as soon as possible to avoid last-minute rush.

To stay current on the deprecation timeline, monitor the Chrome Developers blog and the Chromium Extensions group, where Google announces timeline updates and any changes to the migration requirements.

---

## Conclusion

Migrating from Manifest V2 to Manifest V3 requires careful attention to the architectural differences between persistent background pages and ephemeral service workers, the shift from webRequest to declarativeNetRequest for network request handling, and the various API changes throughout the platform. While the migration may seem daunting, following this guide systematically will help you complete it successfully.

Remember that the key to a smooth migration is understanding that MV3 isn't just MV2 with new API names—it's a fundamentally different execution model that requires thinking about state persistence, event handling, and resource usage differently. Take your time with each section, test thoroughly, and your extension will be ready for the future of Chrome extensions.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one*
