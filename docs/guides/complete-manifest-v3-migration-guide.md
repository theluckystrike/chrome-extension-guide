---
layout: default
title: "The Complete Manifest V3 Migration Guide"
description: "Everything you need to migrate a Chrome extension from Manifest V2 to Manifest V3. Written by a developer who migrated 20 production extensions."
canonical_url: "https://bestchromeextensions.com/guides/complete-manifest-v3-migration-guide/"
---

The Complete Manifest V3 Migration Guide

Everything you need to migrate a Chrome extension from Manifest V2 to Manifest V3. Written by a developer who migrated 20 production extensions.

---

Why Migrate Now

Chrome Web Store has been progressively tightening restrictions on Manifest V2 extensions. Understanding the timeline and implications helps you plan your migration strategically. The Chrome extension ecosystem has undergone a fundamental transformation, and extensions that remain on MV2 will eventually become non-functional. This guide provides the comprehensive information you need to successfully migrate your extension and ensure continued functionality for your users.

Chrome MV2 Deprecation Timeline

Google announced the deprecation of Manifest V2 in 2022, with the following key milestones that every extension developer must understand and plan around:

- January 2023: New Manifest V2 extensions no longer featured on Chrome Web Store. This marked the beginning of the end for MV2, as new extensions could not gain visibility through the Chrome Web Store discovery mechanisms.

- June 2023: Existing Manifest V2 extensions could no longer be updated with new features. This freeze meant that while existing installations continued to work, developers could not improve or fix their MV2 extensions.

- January 2024: Manifest V2 extensions removed from the Chrome Web Store entirely, except for enterprise extensions. This was the point of no return for most consumer-facing extensions.

- June 2025: Enterprise users lose access to MV2 extensions. Even the enterprise exception, which provided a lifeline for business-critical extensions, is now being phased out.

- 2026 and beyond: Chrome continues to tighten restrictions, and future Chrome versions will progressively reduce functionality available to MV2 extensions until they become completely non-functional.

What Happens to MV2 Extensions

Once the timeline completes, MV2 extensions will stop functioning entirely. Users will see errors when attempting to load them. Extensions still on MV2 will become unusable for all Chrome users, not just those on the stable channel. The Chrome team has been clear that this is not a temporary measure or a negotiating position - the migration to MV3 is mandatory for any extension that wishes to continue functioning.

The implications extend beyond just the extension itself. If your extension provides functionality that users rely upon, you have a responsibility to migrate it. Users who have installed your extension expect it to continue working, and failing to migrate means abandoning those users to an increasingly broken experience.

Enterprise Extension Exceptions

Enterprise administrators can use enterprise policies to allow specific MV2 extensions within their organization. However, this is a temporary measure that should not be relied upon for long-term planning:

- Policy support for MV2 will eventually be removed, though no specific timeline has been announced. The writing on the wall is clear - even enterprise support is temporary.

- New enterprise deployments should plan for MV3, as the policies that enable MV2 extensions are being progressively deprecated. Building new infrastructure around MV2 is a mistake.

- The exception only applies to managed devices, not consumer Chrome. If your extension has any consumer users, you must migrate regardless of enterprise considerations.

- Many enterprises are already proactively blocking MV2 extensions as part of their security policies, even before Chrome forces the issue. The writing is on the wall.

---

Before You Start

Successful migration requires preparation. Understanding your current extension state and having the right tools available makes the migration significantly smoother. Rushing into migration without proper preparation leads to avoidable mistakes and extended debugging sessions.

Automated Migration

Manual migration is tedious and error-prone. Fortunately, several tools automate the mechanical parts of the transition, allowing you to focus on the business logic that requires human attention.

Use [mv3-migrate](https://github.com/theluckystrike/mv3-migrate) to automate the mechanical parts of migration. It handles background page to service worker conversion, browserAction to action API, and webRequest to declarativeNetRequest transformations. This tool examines your existing extension code and automatically applies the mechanical transformations required for MV3 compatibility.

The mv3-migrate tool can transform most boilerplate code automatically, but you will still need to review the changes and handle custom logic. The tool is not magic - it cannot understand your specific business logic or the unique patterns in your extension. Plan to spend time reviewing every change the tool makes, as subtle bugs often lurk in the automated transformations.

Additionally, mv3-migrate handles common patterns like the background page to service worker conversion, but it may miss more complex patterns. Always test thoroughly after running any automated migration tool.

Validate Your Current Manifest

Before making changes, understand what you currently have. Running analysis tools on your existing extension prevents surprises later and helps you identify potential issues before they become blockers.

Run [crx-manifest-validator](https://github.com/theluckystrike/crx-manifest-validator) on your existing manifest to identify potential issues before migration. This tool catches permission problems, deprecated field usage, and common mistakes that cause extension rejection. Using this tool before starting migration gives you a clean baseline to work from and helps avoid the frustration of building on a faulty foundation.

The manifest validator checks for issues like incorrect permission names, missing required fields, deprecated APIs being referenced, and configuration that will cause problems in the Chrome Web Store review process. Fixing these issues before migration ensures your migrated extension passes review the first time.

Audit Your Current Codebase

Before beginning migration, conduct a thorough audit of your extension codebase:

- Identify all background page usage patterns, including event listeners, state management, and DOM manipulation.

- Document all webRequest API usage, including the specific events, filters, and blocking behaviors you rely upon.

- Note all inline scripts and external resource loading, as these require significant changes in MV3.

- Check for any use of deprecated APIs or patterns that will not work in MV3.

- Identify any external code loading, as this is not permitted in MV3.

This audit becomes your migration roadmap and helps you estimate the scope of work required.

---

Step-by-Step Migration

This section provides detailed, step-by-step instructions for each phase of the migration process. Follow these steps in order, as each step builds upon the previous one. Skipping steps or working out of order leads to incomplete migration and difficult-to-debug issues.

1. Update manifest.json

The manifest.json file is the entry point for any Chrome extension. Making these changes first establishes the MV3 foundation upon which all other changes depend. A correctly configured manifest is essential for your extension to even load in Chrome.

Change manifest_version

Find the manifest_version field and change its value from 2 to 3:

```json
{
  "manifest_version": 3
}
```

This single change triggers Chrome to treat your extension as an MV3 extension and applies all the associated restrictions and capabilities. However, this change alone is not sufficient - you must make additional changes to your manifest for the extension to function correctly.

Rename browser_action to action

Replace the browser_action key with action in your manifest. The functionality is essentially the same, but the API has been renamed:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    },
    "default_title": "My Extension"
  }
}
```

If your extension uses a browser action without a popup (just a click handler), you still need to declare the action field, but you can omit the default_popup:

```json
{
  "action": {}
}
```

You will then need to listen for clicks using the chrome.action API:

```javascript
chrome.action.onClicked.addListener((tab) => {
  // Handle click
});
```

Update permissions format

Permissions remain in the permissions array, but some permission names changed. Review your current permissions and update any that have been renamed:

```json
{
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting",
    "alarms",
    "contextMenus"
  ]
}
```

Pay special attention to permissions that have been removed or restricted in MV3. Some permissions that worked in MV2 require additional configuration or are no longer available.

Add host_permissions separately

Host permissions must be declared in their own array, separate from API permissions. This separation improves security because users can see which sites your extension can access when installing:

```json
{
  "host_permissions": [
    "https://*.example.com/*",
    "https://example.org/*",
    "<all_urls>"
  ]
}
```

The host_permissions array accepts the same formats as the permissions array previously did for host permissions. However, the separation is important for user trust and transparency.

Note that if you need access to a specific host for content script injection, you still need to declare that host in host_permissions, even if your content scripts are already declared in the content_scripts section.

Update optional_permissions

If your extension uses optional permissions, those also need to be updated:

```json
{
  "optional_permissions": [
    "bookmarks",
    "history"
  ]
}
```

The same host permission separation applies to optional permissions.

Reference

For complete field documentation, see [Manifest V3 Fields](https://github.com/theluckystrike/blob/main/docs/guides/manifest-v3-fields.md). This reference provides detailed information on every field available in the manifest, including new fields introduced in MV3.

---

2. Replace Background Pages with Service Workers

This is the most significant architectural change in MV3. Background pages were persistent pages that stayed loaded in the browser, maintaining memory state and DOM access. Service workers are event-driven processes that terminate when idle and must reinitialize when events occur. This fundamental architectural shift affects nearly every aspect of extension development.

Event-Driven Architecture

Service workers wake up only when events occur. Your code must register event listeners at the top level of your script, outside of any functions. Unlike the background page where code ran on page load, in a service worker, code only executes in response to events:

```javascript
// These listeners are registered at the top level
// They will be invoked when their respective events occur

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed', details.reason);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab loaded:', tabId, tab.url);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  console.log('Tab created:', tab.id);
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('Tab removed:', tabId);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('Storage changed:', changes, areaName);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
});
```

All your service worker code should be structured around event listeners. Avoid placing logic at the top level that executes on service worker startup, as this can cause issues with the ephemeral lifecycle.

No DOM Access

Service workers cannot access the DOM. This is a fundamental limitation that affects how you structure your extension code. If you need to manipulate pages, you must use content scripts or offscreen documents:

```javascript
// This will NOT work in a service worker
const element = document.getElementById('my-element');
document.querySelector('.container').innerHTML = '<p>Content</p>';

// These are also not available in service workers
window.location.href = 'https://example.com';
document.cookie = 'value=abc';
```

Any code that requires DOM manipulation must run in a content script, a popup, an options page, or an offscreen document. This is a significant architectural change that affects how extensions handle user interfaces and page manipulation.

No Persistent State in Memory

Variables lose their values when the service worker terminates. Service workers can terminate at any time after approximately 30 seconds of inactivity, or immediately after handling certain events. Do not store user data in global variables:

```javascript
// BAD: Data lost when service worker terminates
let userData = null;
let cachedConfig = {};
let tabCache = new Map();

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'setUserData') {
    userData = message.data;  // This will be lost!
  }
});

// Even this pattern fails:
let initializationComplete = false;

chrome.runtime.onInstalled.addListener(async () => {
  await loadConfiguration();
  initializationComplete = true;
  // When service worker terminates, initializationComplete becomes false
});
```

Always use chrome.storage for any data that must persist across service worker restarts. The storage API is the only reliable way to maintain state.

Using chrome.storage for Persistence

Replace in-memory state with chrome.storage. This API persists data to disk and survives service worker restarts:

```javascript
// GOOD: Data persists across service worker restarts
// Writing data
chrome.storage.local.set({ userData: message.data });

chrome.storage.local.set({
  config: { theme: 'dark', language: 'en' },
  cache: { lastUpdate: Date.now() }
});

// Reading data with callbacks
chrome.storage.local.get('userData', (result) => {
  console.log('User data:', result.userData);
});

// Reading data with promises
const result = await chrome.storage.local.get('userData');
console.log(result.userData);

// Reading multiple values
const { userData, config, cache } = await chrome.storage.local.get(['userData', 'config', 'cache']);

// Using sync storage (synced across user's Chrome instances)
chrome.storage.sync.set({ preference: 'value' });
const synced = await chrome.storage.sync.get('preference');
```

The storage API has quota limits, so be mindful of how much data you store. For large datasets, consider using IndexedDB or caching strategies.

Consider using [webext-storage](https://github.com/theluckystrike/webext-storage) for typed storage with schema validation. This library provides TypeScript support and helps prevent bugs caused by incorrect storage access patterns.

Handling Service Worker Lifecycle

Service workers terminate after about 30 seconds of inactivity. They also terminate immediately after handling certain events. To ensure operations complete, you must use specific patterns:

```javascript
// Pattern 1: Return true to keep the message channel open
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'long-operation') {
    // Start async operation
    performLongOperation(message.data)
      .then((result) => {
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

// Pattern 2: Use keepAlive for certain APIs
chrome.alarms.create('periodicTask', {
  periodInMinutes: 1,
  delayInMinutes: 0
});

// The alarm event will wake the service worker
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTask') {
    // This work will complete before the service worker terminates
    doPeriodicWork();
  }
});

// Pattern 3: Use chrome.runtime.onStartup to reinitialize
chrome.runtime.onStartup.addListener(async () => {
  // Reinitialize state from storage when Chrome starts
  const config = await chrome.storage.local.get('config');
  initializeExtension(config.config);
});
```

Understanding the service worker lifecycle is crucial for building reliable MV3 extensions. Failing to handle lifecycle properly leads to intermittent bugs that are difficult to reproduce.

Service Worker Lifecycle Events

The service worker lifecycle includes several events you should understand:

- onInstalled: Fires when the extension is first installed or updated. Use this for one-time initialization.

- onStartup: Fires when Chrome starts. Use this to restore state and start background processes.

- onUpdateAvailable: Fires when a new extension version is available. Use this to notify users or prepare for update.

- Service Worker Idle: After approximately 30 seconds without events, the service worker is terminated to save resources.

- Service Worker Wake: When an event occurs, Chrome may start a new service worker instance to handle it.

Reference

For more details, see [Service Workers](https://github.com/theluckystrike/blob/main/docs/mv3/service-workers.md) and [Service Worker Tips](https://github.com/theluckystrike/blob/main/docs/mv3/service-worker-tips.md). These guides provide additional patterns and techniques for working with service workers effectively.

---

3. Migrate webRequest to declarativeNetRequest

The webRequest API allowed you to observe and modify network requests. In MV3, you must use declarativeNetRequest instead, which is more restrictive but more performant and improves user privacy by preventing extensions from observing user browsing activity.

Why the Change

The webRequest API in MV2 allowed extensions to read and modify HTTP headers, block requests entirely, and redirect requests to different URLs. This powerful API was also a significant privacy concern, as it allowed extensions to potentially intercept sensitive data.

DeclarativeNetRequest addresses these concerns by having the extension declare rules about what to do with requests, without actually seeing the request content. Chrome evaluates these rules and takes action, without revealing request details to the extension.

Rule Format

DeclarativeNetRequest uses a JSON-based ruleset format. Each rule specifies conditions and actions:

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
      "resourceTypes": ["script", "image", "sub_frame"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "allow"
    },
    "condition": {
      "urlFilter": "https://example.com/allowed/*",
      "resourceTypes": ["script"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "url": "https://example.com/placeholder.png"
      }
    },
    "condition": {
      "urlFilter": ".*\\.jpg$",
      "resourceTypes": ["image"]
    }
  },
  {
    "id": 4,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "User-Agent", "operation": "set", "value": "Mozilla/5.0" }
      ]
    },
    "condition": {
      "urlFilter": "https://api.example.com/*",
      "resourceTypes": ["xmlhttprequest"]
    }
  }
]
```

Dynamic vs Static Rules

Static rules are defined in the manifest and bundled with your extension. They cannot be modified after the extension is installed:

```json
{
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules/blocked_domains.json"
    },
    {
      "id": "ruleset_2",
      "enabled": true,
      "path": "rules/redirect_rules.json"
    }]
  }
}
```

Dynamic rules are added and modified at runtime. They persist across extension updates and can be changed by the extension during normal operation:

```javascript
// Add dynamic rules
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

// Get current dynamic rules
const rules = await chrome.declarativeNetRequest.getDynamicRules();
console.log('Current rules:', rules);

// Update rules atomically
await chrome.declarativeNetRequest.updateDynamicRules({
  updateRules: [{
    id: 1,
    priority: 2,
    action: { type: 'allow' },
    condition: {
      urlFilter: 'https://exception.com/*',
      resourceTypes: ['script']
    }
  }]
});
```

Limitations Compared to webRequest

DeclarativeNetRequest cannot do everything that webRequest could. Understanding these limitations helps you plan your migration:

- Cannot read request headers: You cannot inspect what headers are being sent with requests.

- Cannot modify request headers (except with specific allowed modifications): Some header modifications are supported through the modifyHeaders action type, but not all headers can be modified.

- Cannot access request body: You cannot see or modify the body of POST requests or other request bodies.

- Cannot redirect to URLs not known at compile time: Static rules must have known redirect targets, but dynamic rules can redirect to runtime-determined URLs.

- Cannot observe requests: There is no way to see what requests are being made, only to define rules that affect them.

Redirect Considerations

Redirects in declarativeNetRequest have specific requirements:

```javascript
// Redirect using a static URL
{
  "id": 1,
  "action": {
    "type": "redirect",
    "redirect": {
      "url": "https://example.com/placeholder.png"
    }
  },
  "condition": {
    "urlFilter": ".*\\.jpg$",
    "resourceTypes": ["image"]
  }
}

// Redirect using a transform
{
  "id": 2,
  "action": {
    "type": "redirect",
    "redirect": {
      "transform": {
        "hostSuffix": "cdn.example.com",
        "pathPrefix": "/images/"
      }
    }
  },
  "condition": {
    "urlFilter": "https://example.com/.*",
    "resourceTypes": ["image"]
  }
}

// Extension page redirects (useful for replacing blocked pages)
{
  "id": 3,
  "action": {
    "type": "redirect",
    "redirect": {
      "extensionPagePath": "/blocked.html"
    }
  },
  "condition": {
    "urlFilter": "https://malicious-site.com/*",
    "resourceTypes": ["main_frame"]
  }
}
```

For typed rule building, consider [chrome-declarative-net](https://github.com/theluckystrike/chrome-declarative-net). This library provides TypeScript interfaces for creating rules and helps prevent errors in rule definitions.

Reference

See [Declarative Net Request](https://github.com/theluckystrike/blob/main/docs/mv3/declarative-net-request.md). This guide provides comprehensive information on the declarativeNetRequest API including advanced rule patterns, performance considerations, and troubleshooting.

---

4. Update Content Security Policy

MV3 enforces stricter Content Security Policy rules. These changes prevent extensions from executing remote code, improving security for users. While these restrictions can be inconvenient, they significantly reduce the attack surface of extensions.

No Remote Code Execution

You cannot load scripts from external URLs. All extension code must be bundled within the extension package. This is a fundamental security improvement that prevents many attack vectors:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

This policy means that all JavaScript must come from the extension's own files. Any attempt to load scripts from external servers will be blocked.

If you previously loaded scripts from a CDN, you must either:

- Bundle the script within your extension
- Download and include the script as part of your extension
- Find an alternative approach that does not require external scripts

No Inline Scripts

Inline JavaScript is no longer allowed. This includes both inline script tags and inline event handlers:

```html
<!-- BAD: Will not work -->
<script>
  console.log('Inline script');
</script>

<!-- BAD: Will not work -->
<button onclick="handleClick()">Click</button>

<!-- BAD: Will not work -->
<img src="x" onerror="console.log('error')">

<!-- GOOD: External script -->
<script src="popup.js"></script>

<!-- GOOD: Event listeners added in JavaScript -->
<button id="myButton">Click</button>
```

```javascript
// In popup.js
document.getElementById('myButton').addEventListener('click', handleClick);

function handleClick() {
  console.log('Button clicked');
}
```

This change improves security by preventing XSS attacks from affecting your extension pages. It also makes extensions more predictable and easier to audit.

Sandboxed Pages for Dynamic Code

If you need to evaluate dynamic code, use a sandboxed page. This is relevant for extensions that need to run user-provided code or use libraries that require eval:

```json
{
  "sandbox": {
    "pages": ["sandbox.html"]
  }
}
```

```html
<!-- sandbox.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="sandbox.js"></script>
</head>
<body>
  <div id="output"></div>
</body>
</html>
```

```javascript
// sandbox.js - runs in sandboxed context
window.addEventListener('message', (event) => {
  if (event.source === window.parent) {
    // Process the message
    const result = evaluateCode(event.data.code);
    window.parent.postMessage({ result }, '*');
  }
});

function evaluateCode(code) {
  // Safe evaluation in sandbox
  try {
    return eval(code);
  } catch (e) {
    return { error: e.message };
  }
}
```

Sandboxed pages have their own CSP that is more permissive but isolated from the extension's main context. This allows for dynamic code execution while maintaining security boundaries.

For generating valid CSP, use [extension-csp-builder](https://github.com/theluckystrike/extension-csp-builder). This tool helps you construct valid Content Security Policy strings that work with MV3 requirements.

Reference

See [Content Security Policy](https://github.com/theluckystrike/blob/main/docs/mv3/content-security-policy.md). This guide covers CSP in depth, including common configurations, troubleshooting, and advanced patterns.

---

5. Update Content Scripts

Content scripts have several changes in MV3 related to resource access and registration. Understanding these changes ensures your content scripts continue to work correctly after migration.

web_accessible_resources Format Change

Resources accessible to content scripts must be declared in the manifest with an array of objects, each specifying resources and the pages that can access them:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/*.png", "fonts/*.woff"],
      "matches": ["<all_urls>"]
    },
    {
      "resources": ["content/*.js"],
      "matches": ["https://*.example.com/*"]
    }
  ]
}
```

The new format provides better control over which resources can be accessed from which pages. You can restrict resources to specific domains rather than exposing them everywhere.

Dynamic Content Script Registration

You can now register content scripts at runtime, rather than only in the manifest. This provides flexibility for extensions that need to conditionally inject scripts:

```javascript
// Register content scripts at runtime
chrome.scripting.registerContentScripts([{
  id: 'my-script',
  matches: ['https://*.example.com/*'],
  js: ['content.js'],
  css: ['styles.css'],
  runAt: 'document_idle'
}]);
```

This replaces the static content_scripts declaration in the manifest. Dynamic registration is useful for:

- Feature flags that enable/disable functionality
- User preference-based script injection
- A/B testing different content script implementations
- Extension-wide script management

You can also unregister scripts:

```javascript
chrome.scripting.unregisterContentScripts(['my-script']);
```

And update existing registrations:

```javascript
chrome.scripting.updateContentScripts([{
  id: 'my-script',
  js: ['updated-content.js']
}]);
```

For more advanced content script injection, the scripting API provides additional methods:

```javascript
// Inject a script into a specific tab
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => {
    console.log('Injected script running');
  }
});

// Inject multiple files
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js', 'content-utils.js']
});

// Inject with specific world (main or isolated)
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  world: 'MAIN',
  func: () => {
    // Runs in page context, can access page JS
  }
});
```

Reference

See [Dynamic Content Scripts](https://github.com/theluckystrike/blob/main/docs/mv3/dynamic-content-scripts.md). This guide covers all aspects of dynamic content script management in MV3.

---

6. Migrate to Promise-Based APIs

All chrome.* APIs now support promises. This simplifies asynchronous code significantly and eliminates callback hell. While callbacks still work, the promise-based approach is preferred for new code.

All chrome.* APIs Now Support Promises

Most Chrome extension APIs now return promises when no callback is provided. This allows you to use modern async/await syntax:

```javascript
// Old callback style
chrome.storage.local.get('key', (result) => {
  console.log(result.key);
});

// New promise style
const result = await chrome.storage.local.get('key');
console.log(result.key);
```

The promise-based approach is cleaner and easier to reason about, especially when dealing with multiple asynchronous operations.

Removing Callback Patterns

Replace nested callbacks with async/await for cleaner code:

```javascript
// Old: Nested callbacks (callback hell)
chrome.tabs.query({ active: true }, (tabs) => {
  if (tabs.length === 0) return;
  const tabId = tabs[0].id;
  
  chrome.tabs.sendMessage(tabId, { ping: true }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Error:', chrome.runtime.lastError.message);
      return;
    }
    console.log('Response:', response);
    
    chrome.storage.local.get('settings', (settings) => {
      console.log('Settings:', settings.settings);
    });
  });
});

// New: Clean async/await
try {
  const tabs = await chrome.tabs.query({ active: true });
  if (tabs.length === 0) return;
  
  const tabId = tabs[0].id;
  const response = await chrome.tabs.sendMessage(tabId, { ping: true });
  console.log('Response:', response);
  
  const { settings } = await chrome.storage.local.get('settings');
  console.log('Settings:', settings);
} catch (error) {
  console.log('Error:', error.message);
}
```

Error Handling

With callbacks, errors were handled through chrome.runtime.lastError. With promises, you use try/catch:

```javascript
// Old callback error handling
chrome.tabs.sendMessage(tabId, message, (response) => {
  if (chrome.runtime.lastError) {
    console.log('Error:', chrome.runtime.lastError.message);
    return;
  }
  // Handle response
});

// New promise error handling
try {
  const response = await chrome.tabs.sendMessage(tabId, message);
  // Handle response
} catch (error) {
  // Promise rejection includes the lastError message
  console.log('Error:', error.message);
}
```

For type-safe promise-based messaging, use [webext-messaging](https://github.com/theluckystrike/webext-messaging). This library provides TypeScript types and helps ensure message handlers are properly typed.

Reference

See [Promise-Based APIs](https://github.com/theluckystrike/blob/main/docs/mv3/promise-based-apis.md). This guide covers the promise-based API patterns in detail, including migration strategies and best practices.

---

7. Handle Offscreen Documents

Service workers cannot access the DOM. When you need DOM operations from your background script, use offscreen documents. This feature allows extensions to perform DOM-based operations in a context that is separate from both the service worker and content scripts.

When You Need DOM Access From Background

Common use cases for offscreen documents include:

- Generating PDFs from HTML content
- Processing images with canvas API
- Parsing HTML from remote content
- Running libraries that require DOM (some charting libraries, for example)
- Complex DOM manipulation that is too complex for content scripts
- Processing user-generated HTML content

Creating and Managing Offscreen Documents

Create an offscreen document when you need DOM capabilities:

```javascript
// Create an offscreen document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['DOCUMENT_PARSING'],
  justification: 'Parse HTML content from remote server'
});

// Alternative reasons:
// - DOM_PARSER: Parse HTML/XML
// - WORKERS: Create web workers
// - BLOBS: Work with Blob objects
// - FILLING_FORM: Fill forms programmatically
```

In offscreen.html:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="offscreen.js"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

```javascript
// offscreen.js - runs in offscreen document context
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'parseHTML') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, 'text/html');
    
    // Process document - extract data, manipulate DOM, etc.
    const title = doc.querySelector('title')?.textContent;
    const links = Array.from(doc.querySelectorAll('a')).map(a => a.href);
    
    // Send results back
    chrome.runtime.sendMessage({
      target: 'background',
      action: 'parseComplete',
      data: { title, links }
    });
  }
  
  if (message.action === 'generatePDF') {
    // Generate PDF using window.print() or similar
    window.print();
  }
});
```

Send messages to the offscreen document from your service worker:

```javascript
// Send message to the offscreen document
const response = await chrome.runtime.sendMessage({
  target: 'offscreen',
  action: 'parseHTML',
  html: '<html><head><title>Test</title></head><body><a href="/page">Link</a></body></html>'
});
```

Close the document when done to free resources:

```javascript
await chrome.offscreen.closeDocument();
```

Offscreen Document Lifecycle

Offscreen documents have their own lifecycle considerations:

- They persist until explicitly closed or until the extension is unloaded
- Multiple offscreen documents can exist simultaneously (use different URLs or IDs)
- Each offscreen document has its own JavaScript execution context
- Communication happens through message passing, just like with content scripts

Reference

See [Offscreen Documents](https://github.com/theluckystrike/blob/main/docs/mv3/offscreen-documents.md). This guide covers advanced patterns for offscreen document management.

---

Testing Your Migration

Testing MV3 extensions requires different tooling than MV2. The following tools help verify your migration is correct and your extension functions properly in the new environment.

Use chrome-extension-testing

Use [chrome-extension-testing](https://github.com/theluckystrike/chrome-extension-testing) for Chrome API mocks. This library provides test utilities for common extension patterns:

```javascript
import { mockChrome, resetChrome } from 'chrome-extension-testing';

describe('My Extension', () => {
  beforeEach(() => {
    mockChrome.reset();
  });
  
  test('should store data correctly', async () => {
    await chrome.storage.local.set({ key: 'value' });
    const result = await chrome.storage.local.get('key');
    expect(result.key).toBe('value');
  });
});
```

This library mocks the Chrome API surface, allowing you to write unit tests that run in Node.js rather than requiring a full Chrome environment.

Run crx-permission-analyzer

Run [crx-permission-analyzer](https://github.com/theluckystrike/crx-permission-analyzer) to audit permissions. It identifies over-permissioned extensions and suggests minimum-required permissions. This tool helps you achieve the principle of least privilege:

```bash
npx crx-permission-analyzer ./path/to/extension
```

The tool analyzes your manifest and provides a report of required permissions, optional permissions, and permissions that may not actually be needed based on your code.

Run crx-extension-size-analyzer

Run [crx-extension-size-analyzer](https://github.com/theluckystrike/crx-extension-size-analyzer) to check bundle size. Large extensions may indicate unused dependencies that survived the migration:

```bash
npx crx-extension-size-analyzer ./path/to/extension
```

This tool breaks down your extension's size by file and dependency, helping you identify opportunities for optimization.

Manual Testing Checklist

Beyond automated testing, perform manual testing:

- Test extension loading in Chrome with developer mode enabled
- Test all popup functionality
- Test all options page functionality
- Test content script injection on multiple websites
- Test service worker lifecycle (load extension, wait 30+ seconds, verify it works)
- Test message passing between all components
- Test storage persistence across service worker restarts
- Test alarm functionality
- Test context menu actions
- Test keyboard shortcuts

Test in Multiple Environments

Test your migrated extension in various environments:

- Different Chrome channels (Stable, Beta, Dev, Canary)
- Different operating systems
- With various numbers of other extensions installed
- With Chrome profile data present and absent

Reference

See [Testing MV3 Extensions](https://github.com/theluckystrike/blob/main/docs/mv3/testing-mv3-extensions.md). This comprehensive guide covers all aspects of testing MV3 extensions.

---

Migration Checklist

Use this numbered checklist to track your migration progress. Each item represents a critical step that must be completed for a successful migration:

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
11. Remove all inline scripts and move to external files
12. Remove all external code loading
13. Test all extension functionality
14. Verify permissions are minimal
15. Test in Chrome with extensions developer mode enabled
16. Run crx-permission-analyzer and fix issues
17. Test service worker lifecycle and persistence
18. Test message passing between all components
19. Verify Chrome Web Store compatibility
20. Submit for review if publishing to Chrome Web Store

For the complete version, see [Migration Checklist](https://github.com/theluckystrike/blob/main/docs/mv3/migration-checklist.md). This detailed checklist provides additional guidance for each item.

---

Starting Fresh

If your extension is small or heavily dependent on MV2 patterns, consider starting from a modern template. Starting fresh allows you to build on modern best practices from the beginning, avoiding the technical debt that accumulates during migration.

MV3 Minimal Starter

[MV3 Minimal Starter](https://github.com/theluckystrike/chrome-extension-mv3-minimal) provides a zero-dependency starting point with modern JavaScript, proper service worker setup, and minimal boilerplate. This template is ideal for:

- New extensions that need to be built from scratch
- Extensions that are simple enough that migration is impractical
- Learning MV3 development without the complexity of a full framework

React Starter

[React Starter](https://github.com/theluckystrike/chrome-extension-react-starter) is ideal for building React applications as Chrome extensions. Includes build tooling and hot reload, making development comfortable. This template is ideal for:

- Extensions that need complex user interfaces
- Teams familiar with React
- Applications that benefit from React's component model

Full Stack Starter

[Full Stack Starter](https://github.com/theluckystrike/chrome-extension-full-stack) supports complex extensions with background service workers, content scripts, popup, options page, and proper TypeScript configuration. This template is ideal for:

- Large, complex extensions
- Teams that want TypeScript support
- Extensions with multiple entry points and complex architecture

---

Common Migration Errors and Fixes

Here are the most common issues developers encounter during MV3 migration, with solutions:

| Error | Cause | Fix |
|-------|-------|-----|
| Extension fails to load | Missing host_permissions | Add host permissions to separate array in manifest |
| Service worker terminates immediately | No pending event | Ensure async operations use return true pattern for message handlers |
| webRequest not working | API not available in MV3 | Use declarativeNetRequest instead |
| Inline script error | CSP blocks inline scripts | Move scripts to external files |
| Storage undefined | Using localStorage | Replace with chrome.storage API |
| Background cannot access DOM | Service worker limitation | Use offscreen documents |
| Message never arrives | Async timing issue | Use async/await with promises and proper error handling |
| Extension rejected by store | Over-permissioned | Request only required permissions |
| Content script not injecting | Match patterns incorrect | Verify patterns in manifest and code |
| Action icon not showing | Wrong icon location | Place icons in extension root and reference correctly |
| Callback fires twice | Event listener not removed | Properly remove listeners in cleanup code |
| Dynamic rules not working | Missing permissions | Add "declarativeNetRequest" to permissions |
| Manifest validation fails | Invalid JSON | Validate JSON syntax in manifest.json |
| Storage quota exceeded | Storing too much data | Implement data cleanup and caching |
| Service worker not starting | No event listeners | Ensure at least one event listener is registered |
| Promise never resolves | Missing await | Verify all async operations use await |

---

Conclusion

Migrating from Manifest V2 to Manifest V3 requires understanding several key architectural changes. The transition from persistent background pages to ephemeral service workers is the most significant. Plan for thorough testing, as timing-related bugs often surface only under specific conditions that are difficult to reproduce in development.

Tools like mv3-migrate automate much of the mechanical work, but you must still review changes and adapt custom logic. Start your migration early to allow time for addressing unexpected issues. The Chrome team has been clear that MV2 support will continue to be deprecated, and extensions that remain on MV2 will eventually stop working entirely.

The migration process, while requiring significant changes, results in a more secure, more performant extension. The MV3 architecture encourages better development practices and provides better isolation between extension components. Embrace these changes as improvements rather than obstacles.

For additional resources, explore the Chrome Extension Guide's comprehensive MV3 documentation covering specific topics in depth. Each of the referenced guides provides detailed information on specific aspects of MV3 development.

---

Part of the [Zovo](https://zovo.one) open-source ecosystem. Built by [theluckystrike](https://github.com/theluckystrike).
