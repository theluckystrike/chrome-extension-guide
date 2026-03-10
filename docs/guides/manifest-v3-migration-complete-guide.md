---
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covers background page to service worker migration, webRequest to declarativeNetRequest, permission updates, and testing strategies.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Migrating your Chrome extension from Manifest V2 (MV2) to Manifest V3 (MV3) is one of the most important updates you'll make to ensure your extension remains functional and compliant with Chrome Web Store requirements. Chrome has completed the deprecation of MV2, and all extensions must now use MV3 to remain in the store. This comprehensive guide walks you through every aspect of the migration process, from understanding the architectural differences to testing your migrated extension thoroughly.

## MV2 vs MV3: Understanding the Architectural Differences

The transition from Manifest V2 to Manifest V3 represents a fundamental shift in how Chrome extensions operate. Understanding these architectural differences is crucial for a successful migration and for building robust extensions that take advantage of the new platform capabilities.

### Background Pages vs Service Workers

The most significant change in MV3 is the replacement of persistent background pages with ephemeral service workers. In MV2, your background script ran continuously as long as the browser was open, maintaining full access to all extension APIs at all times. This persistent execution model, while convenient for developers, consumed significant system resources even when the extension was idle.

In MV3, background scripts are now implemented as service workers that Chrome activates only when needed and terminates after periods of inactivity. This means your extension must be designed to handle being woken up multiple times throughout a browser session, with no guarantee of maintaining in-memory state between activations.

This architectural change offers substantial benefits for end users. Extensions consume far less memory when idle, the attack surface is reduced due to shorter execution windows, and the overall browser performance improves. However, developers must adapt their thinking to design around event-driven patterns rather than persistent execution.

### The Impact on Extension Design

The service worker model fundamentally changes how you architect your extension. Global variables and cached data will be lost when the service worker terminates. Any state that needs to persist across service worker activations must be stored in chrome.storage or another persistent storage mechanism. This includes not just user preferences and configuration data, but also any runtime state your extension needs to function correctly.

Additionally, long-running operations that assumed continuous execution must be refactored. Any work that needs to complete even after the service worker terminates must use background handlers like chrome.alarms or chrome.webRequest (with appropriate modifications). The event-driven nature of service workers also means that certain patterns, such as polling loops or waiting for asynchronous operations without registering proper callbacks, will simply not work.

## Migrating from Background Pages to Service Workers

The migration from background pages to service workers is the most involved part of moving to MV3. This section provides detailed guidance on making this transition smoothly while maintaining all the functionality your extension users expect.

### Updating Your Manifest Configuration

The manifest.json file requires several changes to declare a service worker instead of a background page. The background property changes from an array of scripts to a single service worker file, and the persistent property is no longer used (it was always required to be false in MV2 anyway).

```json
// MV2 manifest.json
{
  "manifest_version": 2,
  "name": "My Extension",
  "version": "1.0",
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  }
}

// MV3 manifest.json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "background": {
    "service_worker": "background.js"
  }
}
```

### Event Listener Registration Patterns

All event listeners in your service worker must be registered at the top level of your script, outside of any function calls. This ensures that when Chrome wakes your service worker, all necessary listeners are already in place to handle incoming events.

```javascript
// MV3 Service Worker Pattern
// ❌ Incorrect - listener registered inside function
function setupListeners() {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
  });
}

// ✅ Correct - listener registered at top level
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});
```

This requirement exists because Chrome may terminate and restart your service worker at any time. When it restarts, only the top-level code executes—functions that were previously called will not be re-executed unless triggered by an event.

For a complete guide on service worker patterns, including handling lifecycle events, managing state, and debugging, see our [Chrome Extension Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/).

## Migrating from webRequest to declarativeNetRequest

The webRequest API in MV2 allowed extensions to observe and analyze network requests in real-time, with the ability to modify or block any request. This powerful capability came with significant privacy and security implications, as it required broad permissions that could potentially be abused.

MV3 replaces this with the declarativeNetRequest API, which allows extensions to specify rules for how network requests should be handled without requiring access to observe individual requests. This is a privacy-focused change that gives users more confidence in extension behavior.

### Understanding the New Paradigm

With declarativeNetRequest, you define rules in advance that specify what should happen when certain network requests are made. These rules are evaluated by Chrome itself, not by your extension code. Your extension provides the rules, Chrome enforces them.

```javascript
// MV2 - webRequest (blocking)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('ads')) {
      return { cancel: true };
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

// MV3 - declarativeNetRequest
const rules = [{
  id: 1,
  priority: 1,
  action: { type: 'block' },
  condition: {
    urlFilter: '.*ads.*',
    resourceTypes: ['script', 'image']
  }
}];

chrome.declarativeNetRequest.updateDynamicRules({
  addRules: rules,
  removeRuleIds: [1]
});
```

### Static vs Dynamic Rules

There are two types of rules in declarativeNetRequest. Static rules are bundled with your extension and defined in the manifest. They undergo Chrome Web Store review and cannot be modified by users after installation. Dynamic rules can be added, updated, or removed by your extension at runtime.

For most ad-blocking and content-filtering extensions, static rules form the core functionality with dynamic rules used for user customization. The total number of rules you can use depends on your manifest configuration and the specific permissions your extension requests.

For an in-depth exploration of declarativeNetRequest including advanced rule patterns, see our [Chrome Extension Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

## Remote Code Elimination

One of the most significant security improvements in MV3 is the elimination of remote code execution. Extensions can no longer load and execute arbitrary JavaScript from external sources—all code must be bundled within the extension package.

This change was made to improve security and protect users from malicious extensions that could be compromised to load harmful code from external servers. While this improves the security model, it requires developers to rethink how they handle dynamic content and updates.

### Implications for Extension Developers

Any functionality that previously relied on loading scripts from external servers must now be bundled directly in the extension. This includes feature expansions, rule updates for ad blockers, and any user-generated code systems. For ad-blocking extensions, rule updates must be handled through the declarativeNetRequest API's dynamic rules feature rather than downloading new JavaScript files.

Configuration-driven functionality remains possible—your extension can still fetch JSON or other data from servers and use that data to drive behavior. The key restriction is that the code itself must be bundled, while data can still be fetched remotely.

## Content Script Changes

Content scripts in MV3 operate largely the same as in MV2, but there are a few important changes to be aware of. The most significant is that content scripts can no longer be executed using `eval()` in the context of web pages—this was already restricted in MV2 but is now more strictly enforced.

### Manifest Declaration

Content scripts are still declared in the manifest, though the format has been slightly adjusted:

```json
// MV3 content_scripts
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }
]
```

### Communication with Service Workers

Content scripts must communicate with your service worker rather than a persistent background page. This requires updating message-passing patterns to account for the service worker lifecycle. The chrome.runtime API methods remain the same, but your service worker must be properly set up to receive and respond to messages.

## Permission Model Updates

MV3 introduces several important changes to the permission model, all oriented toward improving user privacy and security. Understanding these changes is essential for a smooth migration.

### Host Permissions

In MV3, host permissions are separated more clearly from API permissions. When declaring host permissions in the manifest, you should use the "host_permissions" key rather than including URLs in the "permissions" array.

```json
// MV3 permissions
"permissions": [
  "storage",
  "tabs",
  "alarms"
],

"host_permissions": [
  "https://example.com/*",
  "<all_urls>"
]
```

This separation makes it clearer to users what sites your extension can access during installation. Additionally, the "activeTab" permission provides a more privacy-friendly alternative to host permissions for many use cases—it grants temporary access to the current tab only when the user explicitly invokes the extension.

### New Permission Requirements

Some APIs that were previously available without special permissions now require explicit declaration. The most notable is the scripting API, which requires the "scripting" permission to be declared. Review your extension's use of all APIs and ensure all required permissions are properly declared.

## Action API Migration

The browserAction API in MV2 is replaced by the action API in MV3. This change consolidates the toolbar button functionality and provides a more consistent interface across different extension types.

### Manifest Changes

```json
// MV2
"browser_action": {
  "default_popup": "popup.html",
  "default_icon": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  },
  "default_title": "My Extension"
}

// MV3
"action": {
  "default_popup": "popup.html",
  "default_icon": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  },
  "default_title": "My Extension"
}
```

### API Method Changes

In your JavaScript code, replace chrome.browserAction with chrome.action. The method signatures are largely the same, but you should review your code for any browserAction-specific methods or properties that may have changed.

## Storage Patterns

The storage API remains available in MV3, but you must ensure your extension properly handles the service worker lifecycle. Any data that needs to persist across service worker restarts must be stored in chrome.storage rather than kept in memory variables.

### Best Practices for MV3 Storage

Always store state that your extension needs in chrome.storage rather than relying on in-memory variables. The storage API is asynchronous, so you must design your code to handle this properly. Use chrome.storage.local for extension-specific data and chrome.storage.sync when you need data to sync across a user's devices.

For frequently accessed data, consider implementing a caching layer that loads data from storage into memory when the service worker starts, but always validate this cached data and be prepared to reload from storage if needed.

## Step-by-Step Migration Checklist

Use this checklist to ensure you've addressed all the necessary changes for a complete MV3 migration:

1. Update manifest_version to 3 in your manifest.json file
2. Convert background from persistent page to service worker declaration
3. Move all event listeners to top-level registration
4. Replace chrome.webRequest blocking with declarativeNetRequest rules
5. Update browserAction to action in manifest and code
6. Separate host_permissions from API permissions
7. Add any new permissions required by APIs you use
8. Review and update content script injection patterns
9. Implement chrome.storage for all persistent state
10. Remove any remote code loading dependencies
11. Test all functionality in development mode
12. Test with service worker termination scenarios
13. Verify extension works after browser restart
14. Test with multiple extension instances if applicable
15. Submit to Chrome Web Store and monitor for errors

## Common Pitfalls to Avoid

Several common mistakes can derail your MV3 migration. Being aware of these pitfalls helps you avoid them in your own migration process.

### Not Handling Service Worker Termination

The most common issue is assuming the service worker stays alive. Remember that Chrome will terminate your service worker after a period of inactivity. Any state stored in memory will be lost. Always use chrome.storage for data that must persist.

### Blocking Event Listeners

Never place event listeners inside functions that may not be called after service worker restart. All listeners must be registered at the top level of your service worker file.

### Incorrect Permission Requests

Double-check that you have all necessary permissions declared. MV3 is more strict about permission requirements, and missing permissions will cause runtime errors.

### Foreground Service Workers

Some extensions require continuous execution and may struggle with the service worker model. For these cases, consider using the offscreen document API to handle long-running operations in a separate context.

## Testing Strategy

Comprehensive testing is essential for a successful migration. Your testing strategy should cover normal operation, edge cases, and the unique behaviors of the service worker lifecycle.

### Development Mode Testing

Load your extension in development mode and test all functionality thoroughly. Pay special attention to operations that involve the service worker, as these will behave differently than in MV2.

### Service Worker Lifecycle Testing

Manually terminate your service worker in chrome://extensions and verify your extension still works correctly when triggered. This simulates the real-world scenario where Chrome terminates idle service workers.

### Storage Testing

Clear extension storage and reload to verify all state is properly restored from chrome.storage. Test across browser restarts to ensure data persistence works correctly.

### Automated Testing

Consider implementing automated tests using tools like Puppeteer or Playwright to verify extension functionality. These tests can simulate user interactions and verify that the extension behaves correctly under various conditions.

## Chrome Timeline for MV2 Deprecation

Chrome has completed the MV2 deprecation process. Starting in mid-2024, Chrome began disabling MV2 extensions on the stable channel, and the Chrome Web Store no longer accepts new MV2 extensions or updates to existing ones. All extensions must now target Manifest V3 to remain available to users.

This timeline means that if you haven't already migrated your extension, you must do so immediately to avoid losing access to your users. The migration process, while requiring significant changes, results in a more secure, performant, and privacy-friendly extension.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one).*
