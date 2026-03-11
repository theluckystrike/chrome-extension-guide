---
layout: default
title: "The Complete Manifest V3 Migration Guide"
description: "Everything you need to migrate a Chrome extension from Manifest V2 to Manifest V3. Written by a developer who migrated 20 production extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/complete-manifest-v3-migration-guide/"
---

# The Complete Manifest V3 Migration Guide

Everything you need to migrate a Chrome extension from Manifest V2 to Manifest V3. Written by a developer who migrated 20 production extensions.

---

## Why Migrate Now

Chrome Web Store has been progressively tightening restrictions on Manifest V2 extensions. Understanding the timeline and implications helps you plan your migration strategically.

### Chrome MV2 Deprecation Timeline

Google announced the deprecation of Manifest V2 in 2022, with the following key milestones:

- **January 2023**: New Manifest V2 extensions no longer featured on Chrome Web Store
- **June 2023**: Existing Manifest V2 extensions could no longer be updated with new features
- **January 2024**: Manifest V2 extensions removed from the Chrome Web Store (except enterprise extensions)
- **June 2025**: Enterprise users lose access to MV2 extensions

### What Happens to MV2 Extensions

Once the timeline completes, MV2 extensions will stop functioning entirely. Users will see errors when attempting to load them. Extensions still on MV2 will become unusable for all Chrome users, not just those on the stable channel.

### Enterprise Extension Exceptions

Enterprise administrators can use enterprise policies to allow specific MV2 extensions within their organization. However, this is a temporary measure:

- Policy support for MV2 will eventually be removed
- New enterprise deployments should plan for MV3
- The exception only applies to managed devices, not consumer Chrome

---

## Before You Start

### Automated Migration

Manual migration is tedious and error-prone. Fortunately, several tools automate the mechanical parts of the transition.

Use [mv3-migrate](https://github.com/theluckystrike/mv3-migrate) to automate the mechanical parts of migration. It handles background page to service worker conversion, browserAction to action API, and webRequest to declarativeNetRequest transformations.

This tool can transform most boilerplate code automatically, but you will still need to review the changes and handle custom logic.

### Validate Your Current Manifest

Before making changes, understand what you currently have. Running analysis tools on your existing extension prevents surprises later.

Run [crx-manifest-validator](https://github.com/theluckystrike/crx-manifest-validator) on your existing manifest to identify potential issues before migration. This tool catches permission problems, deprecated field usage, and common mistakes that cause extension rejection.

---

## Step-by-Step Migration

### 1. Update manifest.json

The manifest.json file is the entry point for any Chrome extension. Making these changes first establishes the MV3 foundation.

#### Change manifest_version

Find the manifest_version field and change its value:

```json
{
  "manifest_version": 3
}
```

#### Rename browser_action to action

Replace the browser_action key with action:

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

#### Update permissions format

Permissions remain in the permissions array, but some permission names changed:

```json
{
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting"
  ]
}
```

#### Add host_permissions separately

Host permissions must be declared in their own array:

```json
{
  "host_permissions": [
    "https://*.example.com/*",
    "https://example.org/*"
  ]
}
```

This separation improves security because users can see which sites your extension can access.

#### Reference

For complete field documentation, see [Manifest V3 Fields](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/guides/manifest-v3-fields.md).

---

### 2. Replace Background Pages with Service Workers

This is the most significant architectural change in MV3. Background pages were persistent pages that stayed loaded. Service workers are event-driven processes that terminate when idle.

#### Event-Driven Architecture

Service workers wake up only when events occur. Your code must register event listeners at the top level of your script:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab loaded:', tabId);
  }
});
```

#### No DOM Access

Service workers cannot access the DOM. If you need to manipulate pages, use content scripts or offscreen documents.

```javascript
// This will NOT work in a service worker
const element = document.getElementById('my-element');
```

#### No Persistent State in Memory

Variables lose their values when the service worker terminates. Do not store user data in global variables:

```javascript
// BAD: Data lost when service worker terminates
let userData = null;

chrome.runtime.onMessage.addListener((message) => {
  userData = message.data;
});
```

#### Using chrome.storage for Persistence

Replace in-memory state with chrome.storage:

```javascript
// GOOD: Data persists across service worker restarts
chrome.storage.local.set({ userData: message.data });

chrome.storage.local.get('userData', (result) => {
  console.log('User data:', result.userData);
});
```

Consider using [webext-storage](https://github.com/theluckystrike/webext-storage) for typed storage with schema validation.

#### Handling Service Worker Lifecycle

Service workers terminate after about 30 seconds of inactivity. They also terminate immediately after handling certain events:

```javascript
// Keep service worker alive for async operations
// Use the keepAlive option for certain APIs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'long-operation') {
    // Perform async operation
    doLongOperation().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
});
```

#### Reference

For more details, see [Service Workers](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/mv3/service-workers.md) and [Service Worker Tips](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/mv3/service-worker-tips.md).

---

### 3. Migrate webRequest to declarativeNetRequest

The webRequest API allowed you to observe and modify network requests. In MV3, you must use declarativeNetRequest instead, which is more restrictive but more performant.

#### Rule Format

DeclarativeNetRequest uses a ruleset format:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "https://example.com/tracker/*",
      "resourceTypes": ["script", "image"]
    }
  }
]
```

#### Dynamic vs Static Rules

Static rules are defined in the manifest and bundled with your extension:

```json
{
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules/blocked_domains.json"
    }]
  }
}
```

Dynamic rules are added at runtime:

```javascript
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: 'https://new-tracker.com/*',
      resourceTypes: ['script']
    }
  }],
  removeRuleIds: [1]
});
```

#### Limitations Compared to webRequest

DeclarativeNetRequest cannot:

- Read request headers
- Modify request headers (except with specific allowed modifications)
- Access request body
- Redirect to URLs not known at compile time (use dynamic rules)

For typed rule building, consider [chrome-declarative-net](https://github.com/theluckystrike/chrome-declarative-net).

#### Reference

See [Declarative Net Request](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/mv3/declarative-net-request.md).

---

### 4. Update Content Security Policy

MV3 enforces stricter Content Security Policy rules. These changes prevent extensions from executing remote code, improving security.

#### No Remote Code Execution

You cannot load scripts from external URLs. All extension code must be bundled:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

#### No Inline Scripts

Inline JavaScript is no longer allowed:

```html
<!-- BAD: Will not work -->
<script>
  console.log('Inline script');
</script>

<!-- GOOD: External script -->
<script src="popup.js"></script>
```

#### Sandboxed Pages for Dynamic Code

If you need to evaluate dynamic code, use a sandboxed page:

```json
{
  "sandbox": {
    "pages": ["sandbox.html"]
  }
}
```

For generating valid CSP, use [extension-csp-builder](https://github.com/theluckystrike/extension-csp-builder).

#### Reference

See [Content Security Policy](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/mv3/content-security-policy.md).

---

### 5. Update Content Scripts

Content scripts have several changes in MV3 related to resource access and registration.

#### web_accessible_resources Format Change

Resources accessible to content scripts must be declared in the manifest with an array:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/*.png", "fonts/*.woff"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

#### Dynamic Content Script Registration

You can now register content scripts at runtime:

```javascript
chrome.scripting.registerContentScripts([{
  id: 'my-script',
  matches: ['https://*.example.com/*'],
  js: ['content.js'],
  css: ['styles.css']
}]);
```

This replaces the static content_scripts declaration in the manifest.

#### Reference

See [Dynamic Content Scripts](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/mv3/dynamic-content-scripts.md).

---

### 6. Migrate to Promise-Based APIs

All chrome.* APIs now support promises. This simplifies asynchronous code significantly.

#### All chrome.* APIs Now Support Promises

Instead of callbacks:

```javascript
// Old callback style
chrome.storage.local.get('key', (result) => {
  console.log(result.key);
});

// New promise style
const result = await chrome.storage.local.get('key');
console.log(result.key);
```

#### Removing Callback Patterns

Replace nested callbacks with async/await:

```javascript
// Old: Nested callbacks
chrome.tabs.query({ active: true }, (tabs) => {
  const tabId = tabs[0].id;
  chrome.tabs.sendMessage(tabId, { ping: true }, (response) => {
    console.log(response);
  });
});

// New: Clean async/await
const tabs = await chrome.tabs.query({ active: true });
const tabId = tabs[0].id;
const response = await chrome.tabs.sendMessage(tabId, { ping: true });
console.log(response);
```

For type-safe promise-based messaging, use [webext-messaging](https://github.com/theluckystrike/webext-messaging).

#### Reference

See [Promise-Based APIs](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/mv3/promise-based-apis.md).

---

### 7. Handle Offscreen Documents

Service workers cannot access the DOM. When you need DOM operations from your background script, use offscreen documents.

#### When You Need DOM Access From Background

Common use cases include:

- Generating PDFs
- Processing images with canvas
- Parsing HTML
- Running libraries that require DOM

#### Creating and Managing Offscreen Documents

```javascript
// Create an offscreen document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['DOCUMENT_PARSING'],
  justification: 'Parse HTML content'
});

// Send message to the offscreen document
const response = await chrome.runtime.sendMessage({
  target: 'offscreen',
  action: 'parseHTML',
  html: '<html>...</html>'
});
```

In offscreen.html:

```javascript
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'parseHTML') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, 'text/html');
    // Process document...
    chrome.runtime.sendMessage({
      target: 'background',
      result: 'parsed'
    });
  }
});
```

Close the document when done:

```javascript
await chrome.offscreen.closeDocument();
```

#### Reference

See [Offscreen Documents](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/mv3/offscreen-documents.md).

---

## Testing Your Migration

Testing MV3 extensions requires different tooling than MV2. The following tools help verify your migration is correct.

### Use chrome-extension-testing

Use [chrome-extension-testing](https://github.com/theluckystrike/chrome-extension-testing) for Chrome API mocks. This library provides test utilities for common extension patterns:

```javascript
import { mockChrome } from 'chrome-extension-testing';

beforeEach(() => {
  mockChrome.reset();
});
```

### Run crx-permission-analyzer

Run [crx-permission-analyzer](https://github.com/theluckystrike/crx-permission-analyzer) to audit permissions. It identifies over-permissioned extensions and suggests minimum-required permissions.

### Run crx-extension-size-analyzer

Run [crx-extension-size-analyzer](https://github.com/theluckystrike/crx-extension-size-analyzer) to check bundle size. Large extensions may indicate unused dependencies that survived the migration.

### Reference

See [Testing MV3 Extensions](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/mv3/testing-mv3-extensions.md).

---

## Migration Checklist

Use this numbered checklist to track your migration progress:

1. Update manifest_version to 3
2. Change browser_action to action in manifest.json
3. Move host permissions to host_permissions array
4. Replace background page with service worker
5. Convert callback-based APIs to promises
6. Replace webRequest with declarativeNetRequest
7. Update content_security_policy for MV3
8. Update web_accessible_resources format
9. Implement chrome.storage for persistent state
10. Add offscreen document handling where needed
11. Test all extension functionality
12. Verify permissions are minimal
13. Test in Chrome with extensions developer mode enabled

For the complete version, see [Migration Checklist](https://github.com/theluckystrike/chrome-extension-guide/blob/main/docs/mv3/migration-checklist.md).

---

## Starting Fresh

If your extension is small or heavily dependent on MV2 patterns, consider starting from a modern template. This avoids inheriting technical debt.

### MV3 Minimal Starter

[MV3 Minimal Starter](https://github.com/theluckystrike/chrome-extension-mv3-minimal) provides a zero-dependency starting point with modern JavaScript, proper service worker setup, and minimal boilerplate.

### React Starter

[React Starter](https://github.com/theluckystrike/chrome-extension-react-starter) is ideal for building React applications as Chrome extensions. Includes build tooling and hot reload.

### Full Stack Starter

[Full Stack Starter](https://github.com/theluckystrike/chrome-extension-full-stack) supports complex extensions with background service workers, content scripts, popup, options page, and proper TypeScript configuration.

---

## Common Migration Errors and Fixes

Here are the most common issues developers encounter during MV3 migration, with solutions:

| Error | Cause | Fix |
|-------|-------|-----|
| Extension fails to load | Missing host_permissions | Add host permissions to separate array |
| Service worker terminates immediately | No pending event | Ensure async operations use return true pattern |
| webRequest not working | API not available in MV3 | Use declarativeNetRequest instead |
| Inline script error | CSP blocks inline scripts | Move scripts to external files |
| Storage undefined | Using localStorage | Replace with chrome.storage API |
| Background cannot access DOM | Service worker limitation | Use offscreen documents |
| Message never arrives | Async timing issue | Use async/await with promises |
| Extension rejected by store | Over-permissioned | Request only required permissions |
| Content script not injecting | Match patterns incorrect | Verify patterns in manifest and code |
| Action icon not showing | Wrong icon location | Place icons in extension root |
| Callback fires twice | Event listener not removed | Properly remove listeners |

---

## Conclusion

Migrating from Manifest V2 to Manifest V3 requires understanding several key architectural changes. The transition from persistent background pages to ephemeral service workers is the most significant. Plan for thorough testing, as timing-related bugs often surface only under specific conditions.

Tools like mv3-migrate automate much of the mechanical work, but you must still review changes and adapt custom logic. Start your migration early to allow time for addressing unexpected issues.

For additional resources, explore the Chrome Extension Guide's comprehensive MV3 documentation covering specific topics in depth.

---

Part of the [Zovo](https://zovo.one) open-source ecosystem. Built by [theluckystrike](https://github.com/theluckystrike).
