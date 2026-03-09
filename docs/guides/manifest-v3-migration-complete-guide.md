---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covering service workers, declarativeNetRequest, permissions, and the complete migration checklist with practical examples.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Migrating from Manifest V2 to Manifest V3 is one of the most significant updates Chrome extension developers have faced. With Chrome Web Store no longer accepting Manifest V2 extensions and the mandatory transition deadline passed, understanding the migration process is essential for any extension developer. This comprehensive guide walks you through every aspect of the migration, from architectural changes to specific API replacements, with practical code examples and a detailed checklist to ensure your transition is smooth and complete.

## Understanding the MV2 vs MV3 Architectural Differences

Manifest V3 introduces fundamental architectural changes designed to improve security, performance, and user privacy. The most significant difference lies in how background code executes. In MV2, extensions used persistent background pages that remained loaded in memory throughout the browser session. This approach, while simple to understand, consumed significant system resources and created potential security vulnerabilities.

Manifest V3 replaces persistent background pages with service workers, which are event-driven scripts that activate only when needed and terminate when idle. This change dramatically reduces memory footprint and improves browser performance, but it requires developers to rethink how they manage state, timers, and long-running operations. The service worker model means your background code must be entirely asynchronous and cannot rely on maintaining in-memory state between events.

Another major architectural difference involves remote code execution. MV2 allowed extensions to load and execute remote JavaScript code, which created significant security risks. MV3 eliminates this capability entirely—all extension code must be bundled with the extension package. This change forces developers to include all logic in their distribution but dramatically improves the security posture of the extension ecosystem.

The permission model also underwent substantial changes. MV3 implements a more granular permission system where many powerful permissions become optional. Users can install extensions with minimal permissions and grant additional capabilities as needed, providing better control over what extensions can access. This approach improves user privacy but requires developers to design their extensions with permission handling in mind.

## Migrating from Background Pages to Service Workers

The transition from background pages to service workers represents the most significant technical change in the migration process. Your existing background scripts likely contain event listeners, maintain state variables, and use synchronous patterns that must be rewritten for the asynchronous service worker model.

Service workers in extensions follow the same lifecycle as web service workers but include additional extension-specific events. When migrating, first update your manifest to declare a service worker instead of background scripts:

```json
{
  "background": {
    "service_worker": "background.js"
  }
}
```

Unlike persistent background pages, your service worker will not have access to the DOM or the `window` object. Any code that previously relied on DOM manipulation in the background context must be moved to other contexts, such as the extension popup, options page, or content scripts. For detailed implementation patterns, see our [Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/).

State management requires a fundamental rethink in MV3. Where MV2 background pages could maintain JavaScript objects in memory, MV3 service workers must persist all state to storage APIs. The `chrome.storage` API becomes essential for maintaining any data that needs to persist across service worker activations:

```javascript
// Store state in chrome.storage
async function saveState(state) {
  await chrome.storage.local.set({ extensionState: state });
}

async function loadState() {
  const result = await chrome.storage.local.get('extensionState');
  return result.extensionState || {};
}
```

Timer handling also changes significantly. The `setTimeout` and `setInterval` functions still work but are unreliable in service workers because the browser can terminate idle service workers. For reliable scheduling, use the `chrome.alarms` API:

```javascript
chrome.alarms.create('periodicTask', {
  periodInMinutes: 15
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTask') {
    // Perform your periodic task here
  }
});
```

Message passing between content scripts and the service worker works similarly to MV2 but requires careful handling given the non-persistent nature of service workers. Establish communication patterns that account for service worker lifecycle events and implement retry logic when the service worker is not currently running.

## Converting webRequest to declarativeNetRequest

The network request modification API underwent a complete redesign in MV3. The powerful `webRequest` API, which allowed extensions to observe and modify any network request, was replaced with the `declarativeNetRequest` API. This change significantly improves user privacy by preventing extensions from accessing detailed network request data while still enabling common use cases like ad blocking and request filtering.

The `declarativeNetRequest` API works by defining rules that the browser evaluates internally, returning only the action results to your extension rather than raw request data. This approach prevents malicious extensions from snooping on user traffic while maintaining functionality for legitimate filtering scenarios.

Static rules are defined in JSON files and bundled with your extension:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": ".*\\.ads\\..*",
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
      "urlFilter": ".*tracking\\.png",
      "resourceTypes": ["image"]
    }
  }
]
```

Dynamic rules can be added and modified at runtime:

```javascript
// Add dynamic rules
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1001,
    priority: 1,
    action: { type: 'block' },
    condition: { urlFilter: 'example.com/ads/*' }
  }],
  removeRuleIds: [1001]
});
```

For comprehensive documentation on implementing request modification, refer to our [Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

Note that the `webRequest` API is still available in MV3 but with significant restrictions. It can only be used with the `blocking` permission in specific, limited scenarios, and Chrome has indicated this capability will be further restricted. All new development should use `declarativeNetRequest`.

## Handling Remote Code Elimination

One of the most impactful changes in MV3 is the elimination of remote code execution. Extensions can no longer load JavaScript from external URLs at runtime—all code must be bundled in the extension package. This change significantly improves security but requires careful planning for extensions that previously used dynamic code loading.

If your extension previously loaded remote scripts for features like analytics, A/B testing, or dynamic configuration, you must bundle this code directly. For analytics, consider using the Chrome Analytics SDK or a bundled analytics library. For feature flags or remote configuration, download configuration data at runtime (which is still permitted) while keeping the actual code in the extension.

For extensions that previously used eval() or Function() to execute dynamically constructed code, you must refactor to eliminate these patterns. This might require working with your backend team to provide configuration in a different format or restructuring your extension's architecture.

## Content Script Changes in Manifest V3

Content scripts remain a core part of extension functionality in MV3, but some important changes affect how they operate. The most significant change involves execution context—content scripts now run in a more isolated environment that provides better security but requires attention to how scripts interact with the page.

In MV2, content scripts could use `<script>` tags to inject additional scripts into pages. This approach is deprecated in MV3. Instead, declare all scripts in the manifest:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }]
}
```

For dynamic script injection, use the `chrome.scripting` API:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['injected.js']
});
```

Content scripts in MV3 have improved isolation from page scripts through the use of isolated worlds, but they still share the DOM. Be mindful of this relationship when manipulating page content and use appropriate safeguards against page script interference.

## Permission Model Updates

The permission system in MV3 is more granular and user-centric. Many permissions that were previously required at installation can be requested at runtime when needed. This approach improves user trust but requires implementing permission request flows in your extension.

Host permissions for specific domains are now separate from other permissions in the manifest:

```json
{
  "host_permissions": [
    "https://*.example.com/*",
    "https://another-site.com/*"
  ],
  "permissions": [
    "storage",
    "alarms",
    "scripting"
  ]
}
```

For powerful permissions like `tabs`, `bookmarks`, or `management`, implement optional permissions:

```javascript
// Request optional permission at runtime
async function requestPermission(permission) {
  const result = await chrome.permissions.request({ permissions: [permission] });
  return result;
}
```

Always implement graceful degradation when permissions are denied. Design your extension to provide core functionality without optional permissions, and clearly communicate to users what features require additional access.

## Action API Migration

The Browser Action and Page Action APIs are unified in MV3 under a single Action API. This consolidation simplifies extension development but requires updating your code if you used either of the older APIs.

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    },
    "default_title": "My Extension"
  }
}
```

Programmatic actions use the `chrome.action` API:

```javascript
// Set badge text
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

// Enable/disable action
chrome.action.disable(tabId);
chrome.action.enable(tabId);
```

## Storage Patterns for MV3

The storage APIs remain largely unchanged in MV3, but their importance increases given the service worker model. Proper use of `chrome.storage` is essential for maintaining state across service worker lifecycles.

Use `chrome.storage.local` for extension-specific data that doesn't need to sync:

```javascript
// Store local data
await chrome.storage.local.set({
  settings: { theme: 'dark', notifications: true },
  cachedData: someLargeObject
});

// Retrieve local data
const { settings } = await chrome.storage.local.get('settings');
```

Use `chrome.storage.sync` for user preferences that should follow their Google account:

```javascript
// Store syncable data
await chrome.storage.sync.set({
  preferences: userPreferences
});
```

Be mindful of storage quotas—storage.local has a 10MB limit while storage.sync has a 100KB limit with approximately 512 bytes per property.

## Step-by-Step Migration Checklist

Use this checklist to ensure a complete migration:

1. **Update manifest version**: Change `"manifest_version": 2` to `"manifest_version": 3` in your manifest.json
2. **Convert background scripts**: Replace persistent background pages with service workers in manifest.json
3. **Update background code**: Refactor background scripts for async patterns, implement chrome.storage for state, replace timers with chrome.alarms
4. **Migrate network request handling**: Replace webRequest with declarativeNetRequest, create rule files, implement dynamic rules
5. **Update permissions**: Separate host_permissions from permissions, implement optional permissions
6. **Migrate action API**: Replace browser_action and page_action with unified action API
7. **Review content scripts**: Ensure proper declaration in manifest, use chrome.scripting for dynamic injection
8. **Bundle remote code**: Eliminate all remote code loading, include all JavaScript in extension package
9. **Update APIs**: Replace any deprecated APIs with their MV3 equivalents
10. **Test thoroughly**: Verify all functionality works with the new architecture

## Common Migration Pitfalls

Several common issues trip up developers during migration. The service worker lifecycle causes the most problems—remember that your background code will not persist in memory and must handle the `onActivate` and `onInstall` events to initialize properly each time the service worker starts.

Timer functions like setTimeout become unreliable in service workers. Many developers forget to migrate to chrome.alarms and find their scheduled tasks stop working. Similarly, code that relies on synchronous operations or maintains in-memory state between events will fail.

The declarativeNetRequest migration often catches developers off guard because the API is fundamentally different. You cannot simply translate webRequest listeners to declarativeNetRequest rules—you must rethink your approach using the rules-based system.

## Testing Your Migrated Extension

Testing MV3 extensions requires attention to service worker behavior that wasn't necessary in MV2. Use Chrome's extension service worker debugging features to observe lifecycle events and identify issues:

1. Open chrome://extensions
2. Enable developer mode
3. Click on your extension's service worker link
4. Use the Console to observe logs and errors

Test permission requests by uninstalling and reinstalling your extension, clearing storage, and verifying graceful degradation when permissions are denied. Test your extension across different Chrome versions and consider using automated testing with Playwright or Puppeteer.

## Chrome Timeline for MV2 Deprecation

Chrome has progressively retired Manifest V2 support. Starting in June 2024, warning banners appeared in the Chrome Web Store for MV2 extensions. By October 2024, Chrome began automatically disabling MV2 extensions on the stable channel. All new extensions and updates must now target Manifest V3.

This timeline means MV2 extensions are no longer functional for most users. If you haven't migrated, your extension is likely no longer working and you're losing users. The migration is not optional—it's a requirement for continued operation in Chrome.

---

*This guide is part of the Chrome Extension Guide by theluckystrike. For more tutorials and patterns, visit [zovo.one](https://zovo.one).*
