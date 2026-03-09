---
title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: "A comprehensive guide to migrating Chrome extensions from Manifest V2 to V3. Learn about service workers, declarativeNetRequest, permission changes, and testing strategies."
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's transition from Manifest V2 (MV2) to Manifest V3 (MV3) represents the most significant architectural change in the extensions platform since its inception. This comprehensive guide walks you through every aspect of the migration process, from understanding the fundamental architectural differences to implementing advanced patterns that leverage MV3's new capabilities.

## Understanding the MV2 vs MV3 Architecture Differences

Manifest V2 and MV3 differ in fundamental ways that affect how your extension operates at every level. These aren't merely cosmetic changes—they represent a complete reimagining of how Chrome extensions interact with the browser and the web.

### The Background Page Transformation

In MV2, background pages operated as persistent HTML pages that remained loaded throughout the browser session. These pages maintained full access to all Chrome APIs and could run continuously, making them ideal for long-lived tasks, event handling, and maintaining state across the extension.

MV3 replaces persistent background pages with **service workers**—event-driven, ephemeral background scripts that activate only when needed and terminate after completing their tasks. This architecture change dramatically improves memory usage and security but requires developers to rethink how they handle state, timers, and event listeners.

The service worker model means your background code must be entirely asynchronous. Unlike MV2's background pages, which could maintain in-memory state between events, MV3 service workers may be terminated and restarted at any time. This fundamental difference impacts everything from API calls to data persistence.

### Execution Environment Changes

MV2 allowed background pages to execute arbitrary JavaScript through `eval()` and similar mechanisms. MV3 eliminates this capability entirely as part of Google's security hardening initiative. All extension code must now be bundled within the extension package—no loading code from external sources at runtime.

This remote code elimination requirement means you must bundle all dependencies, libraries, and logic within your extension. While this improves security and reduces the attack surface, it also increases the importance of efficient bundling and code splitting strategies.

### Network Request Interception

One of the most significant changes affects how extensions can intercept and modify network requests. MV2 allowed extensions to use the `webRequest` API with blocking and modifying capabilities, giving them almost complete control over network traffic. MV3 restricts this to the `declarativeNetRequest` API, which uses predefined rulesets rather than dynamic interception.

This change improves user privacy by preventing extensions from observing all network traffic, but it requires developers to define their blocking and modification rules in advance through JSON rulesets.

## Migrating from Background Pages to Service Workers

The background script migration represents the most complex and impactful change in your MV3 migration. Understanding the service worker lifecycle and adapting your code accordingly is essential for a successful transition.

### Service Worker Lifecycle

Service workers in MV3 follow a distinct lifecycle that differs significantly from MV2's persistent background pages. When installed, your service worker registers and begins listening for events. Chrome may terminate the service worker at any time to conserve resources, and it will be restarted when the next relevant event occurs.

This means your service worker must be prepared to handle events after being dormant. Unlike MV2's background pages, you cannot rely on in-memory state persisting between events. Instead, you must use the `chrome.storage` API or other persistent storage mechanisms to maintain state.

### Converting Synchronous Code to Asynchronous Patterns

Most MV2 background scripts contained synchronous code that assumed persistent execution. Converting to MV3 requires wrapping synchronous operations in asynchronous patterns using Promises and async/await syntax.

```javascript
// MV2 Background Script (synchronous)
chrome.runtime.onInstalled.addListener(() => {
  const settings = localStorage.getItem('settings');
  initializeExtension(JSON.parse(settings));
});

// MV3 Service Worker (asynchronous)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('settings').then((result) => {
    initializeExtension(result.settings);
  });
});
```

### Timer Handling Changes

MV2 background pages could use `setTimeout` and `setInterval` freely, knowing the background page would remain loaded. MV3 service workers require using the `chrome.alarms` API for scheduling, as browser timers may not fire after service worker termination.

```javascript
// MV3: Using chrome.alarms instead of setInterval
chrome.alarms.create('periodicTask', {
  delayInMinutes: 5,
  periodInMinutes: 5
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTask') {
    performPeriodicTask();
  }
});
```

For a deeper dive into service worker patterns and best practices, see our [Service Workers Guide](../guides/service-workers.html).

## Transitioning from webRequest to declarativeNetRequest

The migration from `webRequest` to `declarativeNetRequest` requires rethinking how your extension handles network requests. Instead of dynamically intercepting and modifying requests, you define rules that Chrome applies internally.

### Understanding Declarative Rules

The `declarativeNetRequest` API uses a rule-based system where you specify conditions and actions in advance. Chrome evaluates these rules against network requests and applies the specified actions without your extension code being involved in each individual request.

Rules are defined in JSON files that you include in your extension package:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "https://example.com/tracker",
      "resourceTypes": ["script", "image"]
    }
  }
]
```

### Rule Limitations and Workarounds

The `declarativeNetRequest` API has specific limitations compared to `webRequest`. You cannot:
- Read request headers or body content
- Modify request headers on the fly
- Make decisions based on request content

For complex network filtering needs, consider combining `declarativeNetRequest` with the `declarativeNetRequestWithHostAccess` permission, or using content scripts for page-level analysis.

Our [Declarative Net Request Guide](../guides/declarative-net-request.html) provides comprehensive coverage of rule creation and optimization strategies.

## Content Script Changes in MV3

Content scripts remain a crucial part of extension functionality in MV3, but several important changes affect how they operate.

### Execution Context Isolation

MV3 enforces stricter isolation between content scripts and the host page. Content scripts now run in a more restricted environment that prevents them from accessing page variables directly through `window` object injection.

This isolation improves security but requires using message passing or the `chrome.scripting.executeScript` API for complex interactions between content scripts and the extension.

### Programmatic Injection

Instead of declaring content scripts in the manifest, MV3 encourages programmatic injection using the `chrome.scripting` API:

```javascript
// MV3: Programmatic content script injection
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
});
```

This approach provides more control over when and how content scripts load, but requires managing injection logic in your background service worker.

### Match Patterns and Host Permissions

Content script match patterns work similarly to MV2, but pay attention to the separation between `host_permissions` and other permissions in the manifest. Proper permission configuration ensures your content scripts can access the pages they need while following the principle of least privilege.

## Permission Model Updates

MV3 introduces significant changes to how permissions work, improving user privacy and security.

### Host Permissions

In MV3, host permissions are separated into their own `host_permissions` field in the manifest. This change makes it clearer to users which websites your extension can access:

```json
{
  "permissions": [
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ]
}
```

### Optional Permissions

Many permissions that were required in MV2 can now be requested optionally in MV3. Users can grant permissions after installation, improving the initial installation experience and giving users more control.

### Permission Triggers

Some APIs now require user action to activate. For example, the `scripting` API may require the user to click something before your extension can inject scripts into a page. Plan your permission strategy accordingly to ensure a smooth user experience.

## Action API Migration

MV2's `browser_action` and `page_action` APIs are unified into a single `action` API in MV3. This consolidation simplifies extension development while providing consistent functionality.

### Updating Manifest Configuration

```json
// MV2
"browser_action": {
  "default_popup": "popup.html",
  "default_icon": { "16": "icon16.png" }
}

// MV3
"action": {
  "default_popup": "popup.html",
  "default_icon": { "16": "icon16.png" }
}
```

### API Method Changes

API method names have changed from `browserAction` and `pageAction` to `action`:

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });

// MV3
chrome.action.setBadgeText({ text: '5' });
```

## Storage Patterns for MV3

The storage API remains largely unchanged in MV3, but its importance has increased due to the service worker architecture.

### State Persistence Strategy

With service workers that can terminate at any time, you must store any state that needs to persist in `chrome.storage`:

```javascript
// Saving state in MV3
async function saveState(state) {
  await chrome.storage.local.set({ extensionState: state });
}

// Loading state in MV3
async function loadState() {
  const result = await chrome.storage.local.get('extensionState');
  return result.extensionState;
}
```

### Storage Area Selection

Choose the appropriate storage area based on your needs:
- `chrome.storage.local`: Stores data locally, never syncs
- `chrome.storage.sync`: Syncs across user's Chrome instances
- `chrome.storage.session`: Data cleared when browser closes (MV3 new feature)

For detailed storage patterns and optimization strategies, see our [Storage Patterns Guide](../guides/storage-patterns.html).

## Step-by-Step Migration Checklist

Use this checklist to ensure a complete migration:

1. **Update manifest version**: Change `"manifest_version": 2` to `"manifest_version": 3`

2. **Migrate background scripts**: Convert persistent background pages to service workers
   - Remove background HTML files
   - Update manifest to use `"service_worker": "background.js"`
   - Convert all code to asynchronous patterns
   - Implement proper state persistence

3. **Update network request handling**: Migrate from `webRequest` to `declarativeNetRequest`
   - Define rulesets for blocking/modifying requests
   - Remove blocking permission from manifest
   - Test rule matching thoroughly

4. **Update action APIs**: Replace `browser_action` and `page_action` with `action`
   - Update manifest configuration
   - Update all API calls

5. **Review permissions**: 
   - Separate host permissions into `host_permissions`
   - Identify optional permissions
   - Test permission prompts

6. **Update content scripts**: 
   - Implement programmatic injection if needed
   - Test message passing
   - Verify isolation behavior

7. **Test comprehensively**: 
   - Test service worker lifecycle
   - Test after browser restart
   - Test across different Chrome versions

## Common Migration Pitfalls

Understanding these common mistakes helps you avoid them:

### Forgetting Service Worker Termination

Many developers forget that service workers can terminate at any time. Always persist important state and be prepared to restore it when the service worker wakes up.

### Using Blocking webRequest

Attempting to use `webRequest` with blocking capabilities will fail in MV3. You must migrate to `declarativeNetRequest` or find alternative approaches.

### Leaving Remote Code

MV3 explicitly forbids loading and executing remote code. Audit your dependencies and ensure everything is bundled within the extension.

### Improper Timer Usage

Using `setTimeout` in service workers without `chrome.alarms` will cause unexpected behavior. Always use the `chrome.alarms` API for scheduled tasks.

### Forgetting Match Patterns

Changes to match patterns and host permissions can cause silent failures. Always test with explicit URLs and verify permissions are correctly configured.

## Testing Strategy

A robust testing strategy is essential for successful migration:

### Manual Testing

Test each migration change individually:
- Service worker lifecycle: Close and reopen extension, restart browser
- Network rules: Test each declarativeNetRequest rule
- Permissions: Test with fresh installations
- Content scripts: Test across different page types

### Automated Testing

Use Chrome's debugging tools to verify:
- Service worker registration and events
- Console errors and warnings
- Network rule application
- Storage operations

### Extension Audit

Run Chrome's extension auditing tools to identify:
- Deprecated API usage
- Permission issues
- Manifest validation
- Performance warnings

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 phase-out:

- **January 2022**: Chrome 100+ began showing warnings for MV2 extensions
- **June 2022**: Chrome Web Store stopped accepting new MV2 extensions
- **January 2023**: Chrome disabled third-party MV2 extensions by default
- **2024**: MV2 extensions fully phased out on stable channel

All extensions must now use Manifest V3 to be published or updated on the Chrome Web Store.

## Conclusion

Migrating from Manifest V2 to V3 requires careful attention to architectural changes, but the result is a more secure, performant, and privacy-respecting extension. The service worker model, declarativeNetRequest API, and updated permission system represent significant improvements to the extensions platform.

Start your migration early, test thoroughly, and take advantage of the comprehensive documentation and community resources available. The Chrome team continues to release new features and improvements to MV3, making it the definitive standard for Chrome extension development.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
