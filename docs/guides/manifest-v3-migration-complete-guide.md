---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: Complete guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covers service workers, declarativeNetRequest, permission changes, and more with step-by-step instructions.
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's transition from Manifest V2 to Manifest V3 represents the most significant architectural change in Chrome extension development history. This comprehensive guide walks you through every aspect of migrating your extension, from understanding the fundamental architectural differences to implementing advanced patterns that work seamlessly with the new manifest version.

The migration process requires careful attention to multiple API changes, architectural shifts, and new security requirements. Whether you're maintaining a simple utility extension or a complex enterprise tool, this guide provides the actionable information you need to complete your migration successfully while avoiding common pitfalls that catch many developers unprepared.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental difference between Manifest V2 and Manifest V3 lies in how the browser manages your extension's background code. In Manifest V2, extensions used persistent background pages that remained loaded as long as the browser was running. These pages had full access to the DOM, could maintain global state in memory, and operated as continuously running processes with unrestricted execution time.

Manifest V3 replaces this persistent model with an event-driven service worker architecture. Your background script now runs only when needed to handle specific events—messages from content scripts, browser actions, alarms, or other triggers—and then terminates after a period of inactivity. This ephemeral execution model offers significant benefits: reduced memory consumption, improved security through shorter attack surfaces, and better overall browser performance. However, it requires developers to fundamentally rethink how they manage state, handle asynchronous operations, and structure their extension's logic.

The implications of this architectural shift extend throughout your entire extension. Variables that once persisted indefinitely now need to be stored in `chrome.storage`. Timers that ran continuously now need to be rescheduled after each service worker wake-up. Network requests that used XMLHttpRequest directly now require fetch API calls or the new declarativeNetRequest system. Understanding this core distinction early in your migration will help you approach each subsequent change with the right mental model.

### Key Architectural Changes Summary

Manifest V3 introduces several additional architectural requirements beyond the service worker transition. Remote code execution is no longer allowed—all your extension's code must be bundled within the package itself. The webRequest blocking API has been replaced with the declarativeNetRequest API for network modification. Browser actions and page actions have been unified into a single Action API. These changes collectively improve security and user privacy but require specific code modifications for each affected extension.

## Migrating from Background Pages to Service Workers

The background page to service worker migration represents the most substantial code change in your MV3 transition. Our comprehensive [Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/) provides detailed implementation patterns, but here are the critical points you need to understand for a successful migration.

### Manifest Configuration Changes

Your manifest.json requires updates to declare a service worker instead of a background page. Remove the `"background"` property with its `"scripts"` array and `"persistent"` flag, then add the `"background"` property with a `"service_worker"` key pointing to your new worker file.

```json
{
  "background": {
    "service_worker": "service-worker.js"
  }
}
```

### Handling State Persistence

The most common migration issue involves code that previously relied on global variables to maintain state. In MV3, your service worker can be terminated at any time after handling events, meaning any in-memory state will be lost. You must migrate all persistent data to `chrome.storage`:

```javascript
// MV2 - Background page with global state
let userSettings = {};
let cache = {};

function handleMessage(request) {
  if (request.type === 'getSettings') {
    return userSettings;
  }
}

// MV3 - Service worker with persistent storage
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getSettings') {
    chrome.storage.local.get(['userSettings'], (result) => {
      sendResponse(result.userSettings || {});
    });
    return true; // Keep channel open for async response
  }
});
```

### Timer and Alarm Migration

The `setTimeout` and `setInterval` functions don't work reliably in service workers because they can be terminated before the timer fires. Chrome provides the Alarms API specifically for this scenario:

```javascript
// MV2 - Background page timer
setInterval(() => {
  checkForUpdates();
}, 60000);

// MV3 - Service worker with alarms
chrome.alarms.create('checkUpdates', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkUpdates') {
    checkForUpdates();
  }
});
```

## Converting webRequest to declarativeNetRequest

The webRequest API in MV2 allowed extensions to observe and block network requests in flight. This capability required broad host permissions and presented security concerns since extensions could potentially intercept sensitive data. Manifest V3 replaces this with the declarativeNetRequest API, which allows extensions to specify rules for modifying requests without accessing the request content itself.

Our [Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/) covers this API in depth, but here's what you need to know for migration:

### Manifest Permission Changes

Replace the `webRequest` permission (and particularly `webRequestBlocking`) with `declarativeNetRequest`:

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

### Rule Migration Example

```javascript
// MV2 - webRequest blocking
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    return { cancel: details.url.includes('ads') };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// MV3 - declarativeNetRequest rule
const rules = [{
  id: 1,
  priority: 1,
  action: { type: "block" },
  condition: {
    urlFilter: ".*ads.*",
    resourceTypes: ["main_frame", "sub_frame", "script", "image"]
  }
}];

chrome.declarativeNetRequest.updateDynamicRules({
  addRules: rules,
  removeRuleIds: [1]
});
```

The declarativeNetRequest approach is more privacy-preserving because your extension never sees the actual request content—it simply provides rules that Chrome enforces internally. This also means your extension no longer needs host permissions for the domains you're modifying, though you still need host permissions to inject content scripts or perform other operations.

## Remote Code Elimination

Manifest V3 explicitly prohibits loading and executing remote code—all JavaScript and Wasm files must be included in the extension package. This change improves security by ensuring users can review exactly what code their extension contains and by preventing extensions from dynamically loading potentially malicious scripts from external sources.

If your MV2 extension loaded external scripts or evaluated dynamic code, you must bundle all functionality directly in your extension. This includes any libraries, frameworks, or utility code that was previously loaded from CDNs or external servers. Review your extension's dependencies and ensure everything is included in your package.

For extensions that genuinely need dynamic behavior, consider using sandboxed pages with careful content security policy configuration, or evaluate whether your use case can be achieved through other MV3 features like declarativeNetRequest rules or user scripts.

## Content Script Changes

Content scripts undergo several important changes in Manifest V3. They continue to run in the context of web pages, but the injection mechanism and capabilities have evolved.

### Programmatic Injection

In MV3, content scripts are typically injected programmatically rather than declared statically in the manifest. This approach provides more control over when and how scripts are injected:

```javascript
// MV3 programmatic injection
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content-script.js']
});
```

You can also inject functions directly rather than files, which is useful for small scripts or when you need to pass dynamic parameters:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: (arg) => {
    document.body.style.backgroundColor = arg.color;
  },
  args: [{ color: 'lightblue' }]
});
```

### Communication with Service Workers

Content scripts communicate with service workers instead of background pages. The message passing API remains similar, but remember that your service worker may not be running when a content script sends a message. Consider using the `chrome.storage` API or the new `chrome.runtime.sendMessage` with appropriate error handling:

```javascript
// Content script sending message
chrome.runtime.sendMessage({ action: 'processData', data: someData })
  .then(response => console.log(response))
  .catch(error => {
    // Handle case where service worker isn't running
    console.log('Service worker unavailable:', error);
  });
```

## Permission Model Updates

Manifest V3 introduces a refined permissions model that separates optional permissions and requires more explicit user consent for sensitive capabilities.

### Host Permissions

Host permissions are now declared separately in the `host_permissions` key rather than mixing with API permissions. This separation makes it clearer to users what websites your extension can access:

```json
{
  "permissions": [
    "storage",
    "alarms",
    "scripting"
  ],
  "host_permissions": [
    "*://*.google.com/*",
    "https://api.example.com/"
  ]
}
```

### Optional Permissions

Many permissions can now be requested dynamically when needed rather than requiring them at installation. This approach improves user trust and allows extensions to function with minimal permissions initially:

```javascript
// Request permission when needed
async function requestBookmarkPermission() {
  const result = await chrome.permissions.request({
    permissions: ['bookmarks']
  });
  if (result) {
    // Permission granted, proceed with bookmark operations
  }
}
```

### Restricted Permissions

Some APIs that were available in MV2 are now restricted or require additional review for Chrome Web Store publication. The `debugger` API, for example, now requires the `declarativeNetRequest` permission to be moved to a different category. Review the [Chrome extension permission documentation](https://developer.chrome.com/docs/extensions/mv3/permission_warnings/) to understand any restrictions affecting your extension.

## Action API Migration

The browserAction and pageAction APIs from MV2 have been unified into a single Action API in MV3. This consolidation simplifies extension development by providing a consistent interface regardless of your extension's type.

### Manifest Changes

Replace `browserAction` or `pageAction` with the new `action` key:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "32": "images/icon32.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  }
}
```

### API Calls

Update your JavaScript calls from `chrome.browserAction` or `chrome.pageAction` to `chrome.action`:

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000' });

// MV3
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
```

## Storage Pattern Updates

While the Storage API itself hasn't changed dramatically, its importance has increased significantly due to the service worker architecture. All persistent data that previously lived in global variables must now be stored explicitly.

### Recommended Storage Patterns

Use `chrome.storage.local` for user-specific data and `chrome.storage.sync` for data that should sync across devices:

```javascript
// Local storage for large datasets
chrome.storage.local.set({ largeDataset: bigObject });

// Sync storage for user preferences
chrome.storage.sync.set({ preferences: userSettings });
```

Implement proper initialization logic that loads data when your service worker starts:

```javascript
// Service worker initialization
let cachedData = null;

async function initialize() {
  const result = await chrome.storage.local.get(['cachedData']);
  cachedData = result.cachedData || {};
}

initialize();
```

## Step-by-Step Migration Checklist

Use this checklist to ensure you've addressed all migration requirements:

1. **Audit current functionality**: Document every feature that relies on background page state, timers, network interception, or other MV2-specific APIs.

2. **Update manifest version**: Change `"manifest_version": 2` to `"manifest_version": 3` in your manifest.json file.

3. **Migrate background scripts**: Convert your background page to a service worker, implementing storage-based state management and the Alarms API for scheduled tasks.

4. **Update network request handling**: Replace webRequest blocking with declarativeNetRequest rules.

5. **Consolidate actions**: Merge browserAction and pageAction into the unified Action API.

6. **Review permissions**: Separate host permissions into the host_permissions key, identify optional permissions, and implement dynamic permission requests.

7. **Bundle all code**: Ensure all JavaScript, libraries, and frameworks are included in your extension package.

8. **Update content scripts**: Convert static content script declarations to programmatic injection if needed, and update message passing to communicate with the service worker.

9. **Test thoroughly**: Test all functionality with the new service worker architecture, paying special attention to state persistence and timer behavior.

10. **Submit for review**: Publish your MV3 extension to the Chrome Web Store, noting that review times may be longer during the migration period.

## Common Pitfalls to Avoid

Several issues frequently cause migration problems. Understanding these pitfalls before encountering them will save significant debugging time.

The most common issue involves assuming service workers behave like persistent background pages. Remember that your service worker will be terminated after handling events, so never rely on in-memory state persisting between user interactions.

Another frequent problem involves forgetting to return `true` from message listeners when using asynchronous sendResponse. In MV3 service workers, if your response handler needs to perform async operations, you must return true to keep the message channel open:

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'asyncOperation') {
    // Must return true to keep channel open
    doAsyncWork().then(result => sendResponse(result));
    return true;
  }
});
```

Timer issues also plague many migrations. Using setTimeout or setInterval directly will not work reliably—always use the Alarms API for scheduled tasks in your service worker.

Finally, ensure you're not attempting to load remote code. Any external script references must be removed or replaced with bundled alternatives.

## Testing Strategy

Comprehensive testing is essential for MV3 migration because the asynchronous, event-driven nature of service workers can expose race conditions and state management issues that didn't exist in MV2.

Test your extension's behavior when the service worker hasn't been active for a period—this will cause Chrome to terminate the worker, and you should verify that subsequent events properly reinitialize state from storage.

Test all message passing paths, particularly those involving content scripts and popups, ensuring they handle the case where the service worker isn't currently running.

Verify that all alarms and scheduled tasks continue to fire correctly after extension updates or browser restarts.

Use Chrome's service worker debugger to inspect your extension's service worker lifecycle and identify any issues with registration or event handling.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for transitioning from Manifest V2 to Manifest V3. Understanding this timeline helps you plan your migration appropriately.

Chrome began phasing out MV2 support in 2023, with new extensions requiring MV3 for publication starting in January 2022. Existing MV2 extensions can still receive updates, but developers are strongly encouraged to migrate.

The Chrome Web Store no longer accepts new MV2 extensions, and existing extensions will eventually stop receiving updates. The exact timeline for complete MV2 removal has been extended multiple times to give developers more migration time, but the direction is clear—all extensions must eventually migrate to MV3.

Monitor the [Chrome Extensions Blog](https://developer.chrome.com/blog/extensions/) for the latest timeline updates and any policy changes affecting your migration.

---

## Conclusion

Migrating from Manifest V2 to Manifest V3 requires careful attention to architectural changes, API updates, and new security requirements. While the process involves significant code changes, the resulting extensions are more secure, more privacy-preserving, and more efficient. The service worker model, despite its initial complexity, leads to better resource management and improved user experience.

Start your migration by auditing your current extension's MV2 dependencies, then work through each component systematically. Use the comprehensive guides on [Background Service Workers](/chrome-extension-guide/docs/guides/background-service-worker/) and [Declarative Net Request](/chrome-extension-guide/docs/guides/declarative-net-request/) for detailed implementation guidance on those specific topics.

With proper planning and thorough testing, your migration can be completed successfully, ensuring your extension remains functional and ready for the future of Chrome extension development.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
