---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating your Chrome extension from Manifest V2 to Manifest V3. Covers background service workers, declarativeNetRequest, permission changes, and more.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Google's transition from Manifest V2 to Manifest V3 represents the most significant architectural change in Chrome extension development history. This guide walks you through every aspect of migrating your extension, from understanding the fundamental architectural shifts to implementing the new APIs that power modern Chrome extensions.

## MV2 vs MV3: Understanding the Architectural Differences

Manifest V2, introduced in 2012, established the foundation for modern Chrome extensions with its straightforward permission model and persistent background pages. However, as browser security threats evolved and user privacy concerns grew, Google recognized the need for a more secure and efficient architecture.

Manifest V3 introduces several fundamental changes that affect how extensions operate:

**The Death of Persistent Background Pages**: In MV2, background pages remained loaded as long as the browser was running. This persistent execution model allowed developers to maintain state easily but consumed significant memory and created security vulnerabilities. MV3 replaces this with ephemeral service workers that activate only when needed and terminate after periods of inactivity.

**The Shift from webRequest to declarativeNetRequest**: The powerful webRequest API that allowed extensions to intercept and modify network requests freely has been replaced by the more restrictive declarativeNetRequest API. This change significantly reduces the potential for malicious extensions to intercept sensitive data like cookies and authentication tokens.

**Remote Code Elimination**: MV3 prohibits loading remote code—extensions must include all JavaScript and CSS locally. This prevents extensions from being compromised through remote code injection attacks but requires developers to update their build processes and release workflows.

**Revised Permission Model**: Host permissions are now granted at installation time rather than at runtime, and many powerful APIs now require explicit user consent. This gives users greater control over what extensions can access.

These changes aren't merely cosmetic—they represent a fundamental rethinking of extension security and performance. Understanding why these changes were made helps you appreciate the benefits and work within the new constraints effectively.

## Migrating from Background Pages to Service Workers

The transition from persistent background pages to service workers represents the most significant code change for most extension developers. Your background script no longer runs continuously; instead, Chrome invokes your service worker when events occur and terminates it after approximately 30 seconds of inactivity.

For a detailed guide on implementing service workers, see our [Chrome Extension Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/).

### Key Changes You Need to Make

First, update your manifest.json to declare a service worker instead of a background page:

```json
{
  "background": {
    "service_worker": "background.js"
  }
}
```

Unlike background pages, service workers cannot access the DOM or use `window` objects. All communication with content scripts must occur through the message passing API. Additionally, you must now use the Alarms API for scheduled tasks instead of `setTimeout` or `setInterval`, as these timers don't persist across service worker terminations.

### Managing State Across Service Worker Lifecycles

Because service workers terminate and restart frequently, you cannot rely on in-memory state. Instead, adopt one of these patterns:

**Storage-Based State**: Use chrome.storage.local or chrome.storage.session to persist state. Remember that storage operations are asynchronous, so refactor your code to handle promises and callbacks properly.

**Runtime State with Initialization**: Design your service worker to reinitialize state when it starts. Store critical data in chrome.storage and reconstruct your runtime state when the service worker activates.

**Event-Driven Architecture**: Restructure your code around events. Rather than maintaining long-running state, respond to events and retrieve necessary data from storage when needed.

This architectural shift requires you to rethink how your extension handles state, timers, and communication—it's not simply a matter of renaming files.

## Transitioning from webRequest to declarativeNetRequest

The webRequest API in MV2 allowed extensions to observe and modify network requests in powerful ways, but this capability was frequently abused for tracking and data theft. The declarativeNetRequest API provides similar functionality while protecting user privacy.

Our [Chrome Extension Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/) provides comprehensive coverage of this API.

### Understanding the New Model

Instead of intercepting requests programmatically, you define rules in JSON files that Chrome evaluates internally. Your extension no longer sees request details—Chrome applies your rules automatically.

A basic declarativeNetRequest rule looks like this:

```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "block"
  },
  "condition": {
    "urlFilter": ".*\\.ads\\..*",
    "resourceTypes": ["script", "image", "sub_frame"]
  }
}
```

### Migration Strategy

Moving from webRequest to declarativeNetRequest requires planning your rule structure carefully:

**Static Rules**: Define rules in JSON files bundled with your extension. These are checked by Chrome automatically and don't require any runtime code. Static rules are ideal for known blocking patterns like ad networks or tracking domains.

**Dynamic Rules**: Add rules at runtime using the chrome.declarativeNetRequest.updateDynamicRules API. These persist across browser restarts and service worker updates, making them suitable for user-configured filters.

**Session Rules**: Temporary rules that don't persist across browser sessions. Use these for testing or temporary filtering needs.

One significant limitation: you can no longer read request headers or response bodies. If your extension depends on analyzing request content, you'll need to redesign your approach or use the limited header modification capabilities available.

## Handling Remote Code Elimination

MV3 prohibits loading executable code from remote sources—everything your extension runs must be bundled locally. This eliminates a significant attack vector but requires changes to how you deploy updates.

### What This Means Practically

Previously, you might have loaded scripts from your server to enable dynamic functionality or faster iteration:

```javascript
// MV2 - NOT ALLOWED IN MV3
const script = document.createElement('script');
script.src = 'https://your-server.com/script.js';
document.head.appendChild(script);
```

All code must now reside in your extension package. For configuration-driven extensions that previously loaded rules from a server, you have two options:

**Static Configuration Files**: Bundle rule sets as JSON files in your extension. Users receive updates through the Chrome Web Store rather than from your server.

**Dynamic Downloads with Approval**: You can still download data (like rule lists) from remote servers, but this data must be declarative—JSON that defines rules or configurations—not executable JavaScript. The extension review process verifies that you aren't circumventing this requirement.

Update your build process to bundle all necessary files and test thoroughly to ensure no remote code dependencies remain.

## Content Script Changes in MV3

Content scripts run in the context of web pages but with some important differences in MV3.

### The world Property

MV3 introduces the `world` property for content scripts, allowing you to choose between the `MAIN` world (shared with the page's JavaScript) and the `ISOLATED` world (the traditional isolated environment):

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "world": "ISOLATED"
  }]
}
```

The `MAIN` world allows your content script to access page variables and functions directly, but you must be careful about namespace conflicts. The `ISOLATED` world maintains the traditional separation from page JavaScript.

### Communication with Service Workers

Content scripts cannot communicate directly with service workers in the same way they communicated with background pages. Instead, all message passing must flow through the service worker:

```javascript
// Content script sends message
chrome.runtime.sendMessage({ action: "getData" }, response => {
  // Handle response
});

// Service worker receives and responds
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getData") {
    // Process request and send response
    sendResponse({ data: "example" });
  }
});
```

This architectural change means you should review all communication paths between your content scripts and background code.

## Permission Model Updates

MV3 introduces more granular permission controls that affect how users install and use your extension.

### Host Permissions

Host permissions are now requested at installation time rather than runtime. If your extension needs access to specific websites, declare these in the `host_permissions` section of your manifest:

```json
{
  "host_permissions": [
    "https://*.example.com/*",
    "<all_urls>"
  ]
}
```

Users will see all requested host permissions before installing your extension. This transparency is good for user trust but means you should request only the minimum necessary permissions.

### Optional Permissions

For permissions that aren't essential to core functionality, use optional permissions that users can grant later:

```json
{
  "optional_host_permissions": [
    "https://*.optional-domain.com/*"
  ]
}
```

This approach lets users try your extension with limited functionality and grant additional permissions as they discover value.

### New Permission Requirements

Some APIs now require explicit permission in the manifest. Review the Chrome extension documentation to ensure you've declared all necessary permissions—using an API without declaring it in the manifest will cause errors.

## Action API Migration

The Browser Action and Page Action APIs have been unified into a single Action API in MV3.

### Manifest Changes

Replace browser_action and page_action with a single action:

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

### API Changes

Update your JavaScript calls from `chrome.browserAction` and `chrome.pageAction` to `chrome.action`:

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: "5" });
chrome.pageAction.show(tabId);

// MV3
chrome.action.setBadgeText({ text: "5" });
```

The Action API provides consistent functionality across all extension types, simplifying your code.

## Storage Patterns for MV3

The storage APIs remain largely unchanged, but you should consider these patterns given the service worker lifecycle.

### Choosing Storage Types

**chrome.storage.local**: Persists until cleared. Use for settings and data that should survive browser restarts. This is the most common choice for extension data.

**chrome.storage.session**: Cleared when the browser session ends. Use for temporary data that doesn't need persistence. This storage is accessible to both the service worker and content scripts.

**chrome.storage.sync**: Syncs across user's signed-in devices. Use for user preferences they expect to be consistent across machines.

### Best Practices

Given that your service worker may not be running when storage operations occur, always use the asynchronous callback or Promise-based APIs:

```javascript
// Preferred - async/await with chrome.storage
async function getSettings() {
  const result = await chrome.storage.local.get(['settings']);
  return result.settings;
}
```

Avoid synchronous access patterns and ensure your code handles the asynchronous nature of storage operations throughout your extension.

## Step-by-Step Migration Checklist

Use this checklist to track your MV3 migration progress:

1. **Update manifest.json**: Change manifest_version to 3, update background section for service worker, add host_permissions, configure action API

2. **Refactor background script**: Implement service worker lifecycle handling, add Alarms API for timers, restructure for event-driven architecture

3. **Update network rules**: Convert webRequest listeners to declarativeNetRequest rules, test rule matching thoroughly

4. **Migrate content scripts**: Review communication paths, add message passing through service worker, test isolated world behavior

5. **Bundle remote code**: Include all JavaScript locally, update build process, remove dynamic script loading

6. **Test permissions**: Verify all required permissions declared, implement optional permissions for non-essential features

7. **Update action API**: Replace browserAction and pageAction calls with chrome.action

8. **Review storage usage**: Ensure all storage operations are async, test state persistence across service worker restarts

9. **Test thoroughly**: Load unpacked, test all features, verify extension works across different scenarios

10. **Prepare for review**: Ensure compliance with Chrome Web Store policies, prepare updated screenshots and descriptions

## Common Migration Pitfalls

Several issues frequently trip up developers during migration:

**Forgetting the Service Worker Lifecycle**: Many developers assume their background code runs continuously. Test your extension with periods of inactivity to ensure it recovers properly when the service worker restarts.

**Blocking Service Worker Events**: Avoid synchronous operations in event listeners. If you need to perform async operations, use the `keepAlive` option or structure your code to complete before the service worker terminates.

**Missing Host Permissions**: If your extension worked with runtime host permissions in MV2, declare them explicitly in the manifest for MV3 or users will see errors.

**Ignoring Storage Async Patterns**: Code that worked synchronously in MV2 background pages will fail in MV3 service workers. Review all storage operations and ensure they're properly async.

**Assuming Request Access**: With declarativeNetRequest, you cannot read request details. Design your rules based on URL patterns rather than content analysis.

## Testing Strategy for MV3 Migration

Comprehensive testing is essential given the architectural changes:

**Load as Unpacked Extension**: Always test your migrated extension as an unpacked extension before submitting. This reveals errors that might not appear in development mode.

**Test Service Worker Termination**: Close your extension's popup or tab and wait for the service worker to terminate (about 30 seconds). Then trigger your extension's functionality to ensure it recovers properly.

**Test Across Scenarios**: Verify your extension works when first installed, after browser restart, with all permissions granted, and with limited permissions.

**Use Chrome Flags**: Enable chrome://extensions/#manage-extensions and use "Reload" frequently during development. Also try loading unpacked after making changes.

**Check Console Output**: Monitor both the service worker console and the popup console for errors.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 phase-out:

- **January 2023**: New Manifest V2 extensions no longer accepted in Chrome Web Store
- **June 2023**: Existing MV2 extensions can no longer be updated (later extended)
- **Various 2024-2025**: Enterprise administrators can disable MV2 support via policy
- **Future**: Chrome will eventually remove MV2 support entirely

Extensions using MV2 will continue working for now but will eventually stop functioning. The exact timeline has shifted due to feedback from developers, but the direction is clear—migration is inevitable.

Start your migration now to ensure your extension remains functional and takes advantage of the improved security and performance in Manifest V3.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
