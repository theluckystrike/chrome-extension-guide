---

title: Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3
description: Complete guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covers service workers, declarativeNetRequest, permission changes, and testing strategies for a successful migration.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"

---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Google's transition from Manifest V2 to Manifest V3 represents the most significant change to Chrome extensions since their inception. This comprehensive guide walks you through every aspect of migrating your extension, from understanding the fundamental architectural differences to implementing advanced patterns that work with the new extension platform.

## Understanding the Architecture Shift

### Manifest V2 vs Manifest V3: Core Differences

The transition from Manifest V2 to Manifest V3 isn't merely an API update—it's a fundamental reimagining of how Chrome extensions operate. Understanding these differences is crucial for a successful migration.

**Manifest V2 Architecture:**

In Manifest V2, extensions used a persistent background page that remained active as long as the browser was running. This background page could execute long-running operations, maintain state in memory, and use blocking APIs like `chrome.webRequest.onBeforeRequest` to modify network requests in real-time. The persistent nature of the background page meant that extensions could rely on in-memory state, set intervals without concern for termination, and execute code dynamically.

**Manifest V3 Architecture:**

Manifest V3 introduces a completely different paradigm. Background pages are replaced by service workers that are event-driven and ephemeral. Chrome activates these service workers when needed—typically in response to events like API calls, network requests, or alarms—and terminates them after a period of inactivity. This architectural change significantly reduces the memory footprint of extensions but requires developers to rethink how they manage state, handle timers, and persist data.

The service worker model offers several advantages: reduced resource consumption when extensions are idle, improved security through shorter attack windows, and better system resource management. However, it also introduces complexity that wasn't present in Manifest V2 development.

### Key Changes Overview

Several fundamental changes define the Manifest V3 platform:

- **Service Workers Replace Background Pages**: The persistent background context is gone. Service workers must be stateless and event-driven.
- **declarativeNetRequest Replaces webRequest**: Blocking web requests declaratively through rulesets rather than programmatic interception.
- **Remote Code Elimination**: Extensions cannot load remote code; all JavaScript must be bundled.
- **Promise-Based APIs**: Most Chrome extension APIs now return promises instead of using callbacks.
- **Action API Unification**: The browser action and page action APIs are merged into a single action API.

## Migrating the Background Script

### From Background Page to Service Worker

The background script migration is perhaps the most complex part of moving to Manifest V3. The service worker lifecycle is fundamentally different from the persistent background page, requiring significant architectural changes.

For detailed guidance on implementing service workers, see our [Service Workers Guide](/chrome-extension-guide/docs/mv3/service-workers/). This comprehensive resource covers everything from basic setup to advanced patterns for maintaining state and handling events.

The first step is updating your `manifest.json`:

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

### Handling the Ephemeral Lifecycle

Service workers in Chrome extensions have a maximum lifetime of approximately 5 minutes after the last event is processed. After this period of inactivity, Chrome terminates the service worker to conserve resources. This means your extension must be prepared for:

- **State Loss**: Any in-memory state will be lost when the service worker terminates. Use `chrome.storage` for persistent state.
- **Timer Issues**: `setTimeout` and `setInterval` won't work reliably. Use the `chrome.alarms` API instead.
- **Event Listener Persistence**: Keep event listeners registered, but don't rely on closure state.

Here's a pattern for handling the service worker lifecycle:

```javascript
// Initialize state from storage on startup
let extensionState = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['state'], (result) => {
    extensionState = result.state || {};
  });
});

// Use chrome.alarms for reliable timing
chrome.alarms.create('periodicTask', {
  periodInMinutes: 1
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTask') {
    // Handle periodic task
  }
});

// Save state before termination
chrome.runtime.onSuspend.addListener(() => {
  chrome.storage.local.set({ state: extensionState });
});
```

## Network Request Modification

### Moving from webRequest to declarativeNetRequest

The `webRequest` API in Manifest V2 allowed extensions to intercept, block, or modify network requests programmatically. This powerful capability was also a significant security concern because it required broad permissions and allowed extensions to inspect and modify request content.

Manifest V3 replaces this with `declarativeNetRequest`, which uses a declarative ruleset approach. Instead of intercepting each request programmatically, you define rules that specify how requests should be handled. Chrome evaluates these rules internally, eliminating the need for the extension to be involved in every network request.

For in-depth coverage of this API, see our [declarativeNetRequest Guide](/chrome-extension-guide/docs/mv3/declarative-net-request/).

### Basic Migration Pattern

Here's how to migrate a simple webRequest blocking rule:

**Manifest V2 (webRequest):**

```json
{
  "permissions": [
    "webRequest",
    "webRequestBlocking"
  ]
}
```

```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    return { cancel: true };
  },
  { urls: ["*://example.com/*"] },
  ["blocking"]
);
```

**Manifest V3 (declarativeNetRequest):**

```json
{
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "*://example.com/*"
  ]
}
```

```javascript
// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": "example.com", "resourceType": ["main_frame"] }
  }
]
```

```json
// manifest.json
{
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

### Dynamic Rules

One limitation of declarativeNetRequest is that rules must be defined in JSON files at build time. However, you can use dynamic rules to add, remove, or update rules at runtime:

```javascript
// Adding dynamic rules
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1001,
    priority: 1,
    action: { type: 'redirect', redirect: { url: 'https://example.com' } },
    condition: { urlFilter: 'example.org', resourceType: ['main_frame'] }
  }],
  removeRuleIds: [1001]
});
```

## Remote Code and Scripting Changes

### Elimination of Remote Code

Manifest V3 explicitly prohibits loading and executing remote code. All JavaScript, Wasm, and CSS files that your extension uses must be bundled with the extension package. This change significantly improves security by ensuring that malicious actors cannot inject code into your extension after installation.

To comply with this requirement:

- Bundle all libraries and dependencies with your extension
- Use inline scripts sparingly (and only where absolutely necessary)
- Move any dynamically generated code to content scripts or the extension bundle

If you were loading external scripts in Manifest V2:

```javascript
// DON'T DO THIS IN MV3
const script = document.createElement('script');
script.src = 'https://example.com/external-script.js';
document.head.appendChild(script);
```

Bundle the script instead and reference it locally:

```javascript
// In MV3, load from the extension bundle
const script = document.createElement('script');
script.src = chrome.runtime.getURL('scripts/external-script.js');
document.head.appendChild(script);
```

### Content Script Modifications

Content scripts in Manifest V3 have some important differences from Manifest V2:

- **Declarative Registration**: Content scripts should be declared in the manifest rather than injected programmatically when possible.
- **Dynamic Import Limitations**: Dynamic imports are restricted in content scripts.
- **World Property**: Use the `world` property to specify whether scripts run in the `ISOLATED` world (default) or the `MAIN` world (shares with the page).

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle",
    "world": "ISOLATED"
  }]
}
```

## Permission Model Updates

### Host Permissions

Manifest V3 introduces a clearer separation between host permissions and API permissions. Host permissions are now declared separately in the `host_permissions` field:

```json
{
  "permissions": [
    "storage",
    "alarms",
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "https://*.example.com/*",
    "<all_urls>"
  ]
}
```

### Optional Permissions

For sensitive permissions, implement optional permission requests to improve user trust:

```javascript
// Request permission when needed
async function requestPermission(permission) {
  try {
    const granted = await chrome.permissions.request({ permissions: [permission] });
    return granted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

// Check if permission exists
async function checkPermission(permission) {
  return await chrome.permissions.contains({ permissions: [permission] });
}
```

### Breaking Changes in Permissions

Several permissions have been removed or restricted in Manifest V2:

- `webRequestBlocking` and `webRequestFor实名` require `declarativeNetRequest` instead
- `downloads.open` requires user gesture and separate permission
- `geolocation` works differently in Manifest V3

## Action API Migration

### browserAction and pageAction Unified

In Manifest V2, extensions could use either `browserAction` or `pageAction` depending on whether the extension's functionality applied to all pages or specific pages. Manifest V3 consolidates these into a single `action` API.

For detailed coverage, see our [Action API Guide](/chrome-extension-guide/docs/mv3/action-api/).

**Manifest V2:**

```json
{
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" }
  }
}
```

**Manifest V3:**

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" }
  }
}
```

The API calls also change from `chrome.browserAction` to `chrome.action`:

```javascript
// MV2
chrome.browserAction.setPopup({ popup: 'popup.html' });

// MV3
chrome.action.setPopup({ popup: 'popup.html' });
```

## Storage Patterns

### Updated Storage API

Manifest V3 changes how storage works, with some APIs now requiring asynchronous patterns and others being deprecated or modified. See our [Storage Changes Guide](/chrome-extension-guide/docs/mv3/storage-changes/) for comprehensive details.

Key changes include:

- Storage area API calls now return promises
- The `unlimitedStorage` permission behavior changed
- Session storage is now `chrome.storage.session` with `clearOnRelease: true` option

```javascript
// Using promises with chrome.storage
async function saveData(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function loadData(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

// Session storage for sensitive data
chrome.storage.session.set({ sensitiveData: 'value' });
```

## Step-by-Step Migration Checklist

Use this checklist to ensure you've addressed all migration requirements:

1. **Update Manifest Version**: Change `manifest_version` from 2 to 3
2. **Replace Background Script**: Convert background page to service worker
3. **Update Permissions**: Separate host permissions, remove deprecated permissions
4. **Migrate webRequest**: Replace with declarativeNetRequest rules
5. **Update Action API**: Change browserAction/pageAction to action
6. **Fix Remote Code**: Bundle all external scripts
7. **Update Storage**: Convert to promise-based APIs
8. **Test Content Scripts**: Ensure compatibility with new content script model
9. **Review Host Permissions**: Move URLs to host_permissions
10. **Test Thoroughly**: Verify all functionality works with MV3
11. **Update Popup Code**: Ensure popup uses modern async patterns
12. **Handle Manifest Errors**: Fix any manifest validation errors before publishing

### Pre-Migration Preparation

Before beginning your migration, create a complete backup of your Manifest V2 extension. Document all APIs, permissions, and functionality your extension uses. This documentation will serve as a roadmap for your migration efforts and help you identify potential issues early in the process.

## Common Pitfalls and Solutions

### Pitfall 1: In-Memory State Loss

**Problem**: Your extension loses state when the service worker terminates.

**Solution**: Always persist state to `chrome.storage` and restore it on startup. Never rely on in-memory variables persisting between service worker activations.

### Pitfall 2: Timer Issues

**Problem**: `setTimeout` and `setInterval` don't work reliably.

**Solution**: Use `chrome.alarms` API for all timing needs. The alarms API is designed to work with the service worker lifecycle.

### Pitfall 3: Missing Host Permissions

**Problem**: Content scripts can't access page content after migration.

**Solution**: Ensure you've declared all required host permissions in the `host_permissions` field of your manifest.

### Pitfall 4: Blocking Callbacks

**Problem**: Code that relied on synchronous callbacks no longer works.

**Solution**: Convert all callback-based APIs to promise-based alternatives or use async/await patterns.

### Pitfall 5: Dynamic Code Execution

**Problem**: Extensions fail when trying to load external scripts.

**Solution**: Bundle all necessary code with the extension. Use the `chrome.runtime.getURL()` function to reference bundled resources.

## Testing Strategy

### Testing Your Migration

Comprehensive testing is essential for a successful migration. Our [Testing MV3 Extensions Guide](/chrome-extension-guide/docs/mv3/testing-mv3-extensions/) provides detailed strategies.

Key testing areas include:

1. **Functional Testing**: Verify all extension features work correctly in MV3
2. **Service Worker Testing**: Test behavior across service worker restarts
3. **Performance Testing**: Ensure the extension doesn't negatively impact browser performance
4. **Permission Testing**: Verify all permission flows work correctly
5. **Cross-Browser Testing**: Test in Chrome, Edge, and other Chromium-based browsers

Use Chrome's built-in developer tools to debug service workers and content scripts. Pay special attention to the Service Worker debugging features in the Chrome DevTools Application panel.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for Manifest V2 deprecation:

- **January 2023**: Chrome 112+ no longer loads newly published MV2 extensions
- **June 2023**: MV2 extensions no longer appear in the Chrome Web Store search results
- **2024**: Full deprecation timeline accelerated, with Chrome disabling MV2 extensions

Extensions must be migrated to Manifest V3 to continue functioning. The Chrome team has made it clear that MV2 extensions will eventually stop working entirely, making migration essential for any extension that needs to remain functional.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
