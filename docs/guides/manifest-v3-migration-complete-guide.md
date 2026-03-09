---
<<<<<<< HEAD

title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covers background service workers, declarativeNetRequest, permission changes, and more.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"

=======
layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to V3. Learn about background service workers, declarativeNetRequest, permission changes, and more.
>>>>>>> content/mv3-migration-guide
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

<<<<<<< HEAD
Google's transition from Manifest V2 to Manifest V3 represents the most significant change to Chrome Extension development in a decade. This comprehensive guide walks you through every aspect of migrating your extension, with practical code examples, common pitfalls to avoid, and a step-by-step checklist to ensure a smooth transition.
=======
Chrome's transition from Manifest V2 to Manifest V3 represents the most significant architectural change in the extension platform's history. This comprehensive guide walks you through every aspect of the migration process, from understanding the fundamental architectural differences to implementing the new APIs and patterns required by MV3. Whether you're maintaining a mature extension with thousands of users or building a new project, this guide provides the knowledge and practical strategies you need for a successful migration.

The shift from MV2 to MV3 wasn't merely an API update—it reflected Chrome's commitment to improving extension performance, security, and user privacy. Understanding the reasons behind these changes will help you appreciate the benefits of migration and avoid common pitfalls that plague developers who treat this as a superficial refactoring exercise.
>>>>>>> content/mv3-migration-guide

## Understanding the Architecture Differences

<<<<<<< HEAD
Manifest V2 and Manifest V3 differ fundamentally in how they handle extension lifecycle, background processing, and network request interception. Understanding these differences is crucial for a successful migration.

### Background Page vs Service Worker

In Manifest V2, background pages operate as persistent HTML pages that remain loaded throughout the browser session. These pages have full access to the DOM, can maintain global state in memory, and execute long-running tasks without concern for termination.

```javascript
// MV2 Background Page (background.js)
let extensionState = {
  userSettings: {},
  cachedData: [],
  activeTabId: null
};
=======
The fundamental distinction between Manifest V2 and Manifest V3 lies in how each version handles the extension's background execution environment. In Manifest V2, extensions used persistent background pages—full HTML documents that remained loaded in memory as long as the browser ran. These pages had complete access to the DOM, could maintain in-memory state indefinitely, and operated with minimal restrictions on execution time and resource consumption.

Manifest V3 replaces this persistent model with ephemeral service workers that follow the same lifecycle as web service workers. These service workers start when needed to handle events, execute their logic, and then terminate after a period of inactivity. This event-driven architecture dramatically reduces memory consumption across the browser but requires developers to rethink how they manage state, handle asynchronous operations, and structure their background logic.

The implications of this architectural shift extend far beyond the background script. Every aspect of extension development changes under MV3, from how you handle network requests to how content scripts communicate with the extension's other components. The Chrome team designed these changes to create a more secure extension ecosystem where users have greater control over what extensions can access and do.

## Migrating from Background Pages to Service Workers

The background page to service worker migration represents the most complex and impactful change in your MV3 journey. Understanding the service worker lifecycle and adapting your code to work within its constraints is essential for building reliable MV3 extensions.

### Service Worker Lifecycle Fundamentals

Service workers in extensions follow a lifecycle similar to web service workers but with some extension-specific behaviors. When your extension installs or updates, Chrome loads your service worker and fires the `chrome.runtime.onInstalled` event. The service worker then remains active to handle events, but Chrome may terminate it after approximately 30 seconds of inactivity. Any pending timers, callbacks, or open connections must complete before termination, and the service worker doesn't maintain any in-memory state between invocations.

This ephemeral nature means you must store all persistent data using the `chrome.storage` API rather than relying on global variables. Any initialization logic that previously ran once when your background page loaded must now execute in response to events, and you should design your service worker to handle being terminated and restarted at any time.

### Converting Background Page Code

The transition from a persistent background page to an event-driven service worker requires systematic changes to your code structure. Here's a comprehensive example showing how to convert MV2 background page code to MV3:

```javascript
// MV2 Background Page (Manifest V2)
let userPreferences = {};
let cachedData = null;
>>>>>>> content/mv3-migration-guide

// Persistent event listeners maintain state
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
<<<<<<< HEAD
  if (request.type === 'getData') {
    sendResponse({ data: extensionState.cachedData });
=======
  if (request.type === 'getPreferences') {
    sendResponse(userPreferences);
>>>>>>> content/mv3-migration-guide
  }
  return true; // Keep message channel open
});

<<<<<<< HEAD
// Long-running operations work directly
setInterval(() => {
  syncWithServer();
}, 60000 * 5); // Every 5 minutes
```

Manifest V3 replaces persistent background pages with service workers—event-driven scripts that terminate when idle and wake up to handle events. This model significantly reduces resource consumption but requires developers to rethink state management.

```javascript
// MV3 Service Worker (service-worker.js)
// State must be persisted to storage, not memory
let cachedState = null;

// Load state when needed
async function getState() {
  if (!cachedState) {
    const result = await chrome.storage.local.get(['state']);
    cachedState = result.state || {};
  }
  return cachedState;
}

// Event listeners at top level - no DOM available
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getData') {
    getState().then(state => sendResponse({ data: state.cachedData }));
    return true; // Required for async response
  }
});

// Use chrome.alarms for periodic tasks
chrome.alarms.create('sync', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync') {
    syncWithServer();
  }
});
```

The key architectural shift involves accepting that your service worker will terminate between events. You cannot rely on in-memory state, must use chrome.storage for persistence, and should implement proper initialization logic that runs on every wake-up.

## webRequest vs declarativeNetRequest

One of the most consequential changes in Manifest V3 affects how extensions intercept and modify network requests. The webRequest API in MV2 allowed extensions to observe, block, or modify HTTP requests in flight. MV3 replaces this with declarativeNetRequest, which uses a declarative ruleset approach.

### Migrating from webRequest

```javascript
// MV2 - Using webRequest to block ads
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isAdUrl(details.url)) {
      return { cancel: true };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// MV2 - Modifying headers
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    details.requestHeaders.push({ name: 'X-Custom-Header', value: 'value' });
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);
```

### Implementing with declarativeNetRequest

```javascript
// MV3 manifest.json configuration
{
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}

// rules.json - Declarative rules
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": "ads.example.com", "resourceTypes": ["main_frame", "sub_frame"] }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "modifyHeaders", "requestHeaders": [{ "header": "X-Custom-Header", "operation": "set", "value": "value" }] },
    "condition": { "urlFilter": "api.example.com", "resourceTypes": ["xmlhttprequest"] }
  }
]
```

The declarativeNetRequest API offers several advantages: it doesn't require host permissions for the rules themselves, provides better privacy by keeping request details within Chrome, and improves performance by handling rules in a separate process. However, the static ruleset approach means dynamic rule management requires the declarativeNetRequestWithHostAccess permission.

For more detailed information, see our [declarativeNetRequest guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

## Remote Code Elimination

Manifest V3 explicitly prohibits loading and executing remote code. All JavaScript and Wasm files must be bundled within the extension package. This change improves security and reduces the attack surface for malicious extensions.

### What Changed

In MV2, you could load scripts from remote servers:

```javascript
// MV2 - Loading remote code (NO LONGER ALLOWED)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.url) {
    fetch(request.url)
      .then(response => response.text())
      .then(script => eval(script)); // Dangerous! Not allowed in MV3
  }
});
```

In MV3, all code must be bundled:

```javascript
// MV3 - Bundled code only
// Your extension can only execute code from:
// 1. manifest.json declared files
// 2. Code embedded in HTML files within the package
// 3. eval() with chrome.scripting.executeScript() in extension context
```

### Migration Strategy

1. Audit all external script references in your extension
2. Download and bundle any remote libraries you depend on
3. Replace dynamic code loading with bundled alternatives
4. If you need to fetch configuration data, fetch JSON (not code) and process it locally

```javascript
// MV3 - Fetching configuration (allowed), not code
async function loadConfig() {
  const response = await fetch(chrome.runtime.getURL('config.json'));
  const config = await response.json();
  return config;
}
```

## Content Script Changes

Content scripts in MV3 maintain much of their functionality but have some important differences. They still run in the context of web pages but cannot be injected programmatically in the same way.

### Declaration in Manifest

```javascript
// MV2 - Content scripts in manifest.json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}

// MV3 - Similar declaration, but programmatic injection is preferred
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["scripting"]
}
```

### Programmatic Injection

```javascript
// MV3 - Programmatic content script injection
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
});

// Or inject a function
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => {
    console.log('Injected at:', window.location.href);
  }
});
```

## Permission Model Updates

Manifest V3 introduces a more granular permission system. Several previously broad permissions now require host permissions, and some powerful APIs have been restricted.

### Key Permission Changes

| Permission | MV2 Behavior | MV3 Behavior |
|------------|--------------|--------------|
| host_permissions | Optional | Required for most APIs |
| webRequest | Block requests | Cannot block, only observe |
| declarativeNetRequest | N/A | Replaces webRequest blocking |
| scriptable | Not required | Required for programmatic injection |

### Migration Example

```javascript
// MV2 manifest.json
{
  "permissions": [
    "tabs",
    "webRequest",
    "webRequestBlocking",
    "storage",
    "http://*/*",
    "https://*/*"
  ]
}

// MV3 manifest.json
{
  "permissions": [
    "tabs",
    "storage",
    "scripting",
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "http://*/*",
=======
function initialize() {
  loadPreferences();
  startPolling();
}

function loadPreferences() {
  // Synchronous loading from storage
  chrome.storage.local.get('preferences', (result) => {
    userPreferences = result.preferences || {};
  });
}

function startPolling() {
  setInterval(fetchLatestData, 60000);
}
```

Converting this to MV3 requires restructuring to handle the asynchronous nature of storage and the service worker lifecycle:

```javascript
// MV3 Service Worker (Manifest V3)
import { loadPreferences, savePreferences } from './storage-utils.js';
import { fetchLatestData } from './data-service.js';

let userPreferences = null;

// Initialize on service worker startup
chrome.runtime.onInstalled.addListener(async () => {
  userPreferences = await loadPreferences();
  scheduleDataFetch();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getPreferences') {
    // Handle async response properly
    getPreferences().then(sendResponse);
    return true; // Keep channel open for async response
  }
});

// Use chrome.alarms instead of setInterval
function scheduleDataFetch() {
  chrome.alarms.create('dataFetch', { periodInMinutes: 1 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dataFetch') {
    fetchLatestData();
  }
});

async function getPreferences() {
  if (!userPreferences) {
    userPreferences = await loadPreferences();
  }
  return userPreferences;
}
```

For more detailed guidance on service worker patterns and best practices, see our [Chrome Extension Background Service Worker Guide](/docs/guides/chrome-extension-background-service-worker-guide.md) and [Service Worker Lifecycle](/docs/guides/service-worker-lifecycle.md).

## Converting webRequest to declarativeNetRequest

Network request modification represents another significant change in MV3. The powerful `webRequest` API that allowed extensions to intercept, block, and modify any network request has been replaced by the more restricted `declarativeNetRequest` API. This change improves user privacy by preventing extensions from reading users' network traffic while still enabling common use cases like ad blocking and request redirection.

### Understanding the Declarative Net Request Model

The `declarativeNetRequest` API works fundamentally differently from `webRequest`. Instead of your extension actively intercepting and processing each request, you define rules statically in JSON files or dynamically through the API. Chrome then evaluates these rules internally, applying your specified actions without giving your extension access to request content.

This approach means you cannot read the body of HTTP requests or responses, analyze headers for complex conditions, or modify requests in ways not предусмотренные (foreseen) by the API. However, you can still block requests, redirect them to other URLs, modify specific headers, and control cookie behavior.

### Rule File Structure

Your MV3 extension will include one or more JSON rule files that define the network modification logic:

```json
// ruleset.json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": ".*\\.advertising\\.com.*",
      "resourceTypes": ["main_frame", "sub_frame", "stylesheet", "script", "image", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "url": "https://example.com/placeholder.png"
      }
    },
    "condition": {
      "urlFilter": ".*\\.tracker\\.com/images/.*",
      "resourceTypes": ["image"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "Referer", "operation": "remove" },
        { "header": "X-Custom-Tracker", "operation": "remove" }
      ]
    },
    "condition": {
      "urlFilter": ".*",
      "resourceTypes": ["xmlhttprequest", "script"]
    }
  }
]
```

### Registering Rules in Your Manifest

You must declare your rule files in the manifest and specify the permissions required:

```json
{
  "manifest_version": 3,
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "*://*/*"
  ],
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "ruleset_1",
        "enabled": true,
        "path": "rules/ruleset.json"
      }
    ]
  }
}
```

For comprehensive documentation on implementing network request rules, including dynamic rule updates and complex matching conditions, refer to our [Declarative Net Request Guide](/docs/guides/declarative-net-request.md).

## Remote Code Elimination Requirements

One of the most consequential changes in MV3 involves how extensions can incorporate external code. Manifest V2 allowed extensions to load and execute remote JavaScript from external servers, enabling dynamic updates without submitting new versions to the Chrome Web Store. This capability, while convenient for developers, created significant security vulnerabilities that could be exploited by attackers who compromised the external servers.

Manifest V3 mandates that all executable code must be bundled within the extension package. You cannot load JavaScript from external URLs at runtime, and any dynamic code generation using `eval()` or `new Function()` will fail in most contexts. This requirement significantly improves extension security but requires you to redesign your update mechanisms and reconsider any architecture that relies on remote code execution.

To comply with this requirement, you must include all your logic within the extension package. If you previously fetched code from a server to enable dynamic feature toggles or A/B testing, you must now implement these features using configuration files or the `chrome.storage` API to store feature flags that your bundled code reads and acts upon.

## Content Script Changes Under MV3

Content scripts undergo fewer fundamental changes than background scripts, but several modifications affect how you work with them. The most significant change involves how content scripts are declared in the manifest and how they can communicate with the extension.

### Manifest Declaration Changes

Content scripts in MV3 use the `content_scripts` field in the manifest, similar to MV2, but the syntax and capabilities have been refined:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

One important change is that content scripts no longer have access to certain Chrome APIs that were available in MV2. If your content script relies on APIs like `chrome.runtime.sendMessage()` for communication, this pattern still works, but you should be aware of the messaging limits and consider using other communication channels for high-volume data transfer.

### Dynamic Content Script Registration

MV3 introduces the ability to programmatically register content scripts using the `chrome.scripting.registerContentScripts()` API, giving you more flexibility in when and how content scripts load:

```javascript
chrome.scripting.registerContentScripts([{
  id: 'main-content-script',
  matches: ['<all_urls>'],
  js: ['content-script.js'],
  runAt: 'document_idle'
}]);
```

This dynamic approach is particularly useful for extensions that need to inject scripts based on user preferences or runtime conditions rather than static URL patterns.

## Permission Model Updates

The permission system in MV3 introduces several important changes designed to give users more control over what extensions can access. These changes require you to carefully review your extension's permission requirements and adapt your code to work within the new constraints.

### Host Permissions

Host permissions in MV3 are now declared separately from API permissions in the manifest. This separation makes it clearer to users what websites your extension can access:

```json
{
  "permissions": [
    "storage",
    "alarms",
    "tabs"
  ],
  "host_permissions": [
    "https://*.google.com/*",
>>>>>>> content/mv3-migration-guide
    "https://*/*"
  ]
}
```
<<<<<<< HEAD

## Action API Migration

The browserAction and pageAction APIs from MV2 are unified into a single action API in MV3.

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setBadgeBackgroundColor({ color: '#FF0000' });
chrome.pageAction.show(tabId);

// MV3
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
// No equivalent to pageAction - use action with appropriate conditions
```

In manifest.json:

```javascript
// MV2
"browser_action": { ... },
"page_action": { ... }

// MV3
"action": { ... }
```
=======

When users install your extension, Chrome displays API permissions and host permissions separately, giving them more granular control over installation decisions.

### Optional Permissions

Many previously required permissions can now be requested optionally, allowing your extension to function with reduced functionality until users explicitly grant additional access:

```json
{
  "optional_permissions": [
    "bookmarks",
    "history",
    "geolocation"
  ]
}
```

Your code must then request these permissions at runtime using `chrome.permissions.request()` and handle the user's decision gracefully:

```javascript
function requestGeolocation() {
  chrome.permissions.request({
    permissions: ['geolocation']
  }, (granted) => {
    if (granted) {
      // Geolocation access granted
      initGeolocationFeature();
    } else {
      // User denied the request
      showGeolocationUnavailableMessage();
    }
  });
}
```

### Restricted APIs

Some APIs that were available in MV2 are now restricted or have changed their permission requirements in MV3. The `webRequestBlocking` and `webRequest` APIs for network request modification have been superseded by `declarativeNetRequest`, as discussed earlier. Similarly, the `debugger` API now requires the `debugger` permission and operates differently than in MV2.

## Action API Migration

The browser action and page action APIs from MV2 have been unified into a single Action API in MV3. This consolidation simplifies extension development by providing a single interface for toolbar buttons regardless of whether they operate on specific pages or globally.

### Basic Action Implementation

```javascript
// MV2
chrome.browserAction.onClicked.addListener((tab) => {
  chrome.browserAction.setBadgeText({ text: '1', tabId: tab.id });
});

// MV3
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.action.setBadgeText({ text: '1', tabId: tab.id });
});
```

### Popup Handling
>>>>>>> content/mv3-migration-guide

The popup system has also evolved. In MV3, the popup is automatically closed when the user interacts with it in certain ways, and you should design your popup to be lightweight and fast-loading:

<<<<<<< HEAD
With service workers that terminate and restart, your storage strategy becomes critical. The chrome.storage API remains available but should be used more actively.

```javascript
// Service worker - Initialize on each wake-up
let state = {};

async function initialize() {
  const result = await chrome.storage.local.get(['settings', 'cache']);
  state.settings = result.settings || defaultSettings;
  state.cache = result.cache || {};
}

// Call initialization early in service worker lifecycle
initialize();

// Save state changes immediately
function updateState(updates) {
  Object.assign(state, updates);
  chrome.storage.local.set(state);
}
```

For complex storage needs, consider using IndexedDB for larger datasets or the chrome.storage.session API for ephemeral data that doesn't need to persist across restarts.

## Step-by-Step Migration Checklist

Use this checklist to systematically migrate your extension:

1. **Update manifest.json**
   - Change manifest_version to 3
   - Add "action" or migrate browser_action/page_action
   - Separate permissions from host_permissions
   - Review and minimize required permissions

2. **Migrate Background Script**
   - Convert background page to service worker
   - Replace setInterval with chrome.alarms
   - Implement state persistence with chrome.storage
   - Remove DOM-dependent code
   - Add top-level event listeners

3. **Update Network Request Handling**
   - Replace webRequest blocking with declarativeNetRequest
   - Create rules.json with your blocking/modification rules
   - Test rules thoroughly before deployment

4. **Review Content Scripts**
   - Ensure all necessary scripts are bundled
   - Update programmatic injection to use chrome.scripting
   - Test injection across different page types

5. **Migrate Permissions**
   - Move URL patterns to host_permissions
   - Request permissions at runtime where appropriate
   - Implement optional permissions for advanced features

6. **Update Action API**
   - Replace browserAction/pageAction with action
   - Update badge and popup handling

7. **Test All Features**
   - Test in isolation and with other extensions
   - Verify storage persistence
   - Check alarm and background task execution
=======
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

## Storage Patterns for MV3

Given the ephemeral nature of service workers, proper use of the storage API becomes critical for maintaining application state. The `chrome.storage` API provides several distinct storage areas with different characteristics and use cases.

### Choosing the Right Storage Area

The `chrome.storage` API offers three storage areas, each suited to different needs:

- **local**: Storage scoped to your extension, with a 5MB quota by default. Data persists until explicitly removed.
- **sync**: Storage that syncs across the user's Chrome instances when they're signed in. Has a smaller quota (approximately 100KB) but provides automatic synchronization.
- **managed**: Read-only storage configured by enterprise administrators for organization-wide extension configuration.

For service worker state management, you should adopt a caching pattern where you load data from storage when needed and cache it in memory for the duration of the service worker invocation:

```javascript
class StateManager {
  constructor() {
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        const value = result[key];
        this.cache.set(key, value);
        resolve(value);
      });
    });
  }

  async set(key, value) {
    this.cache.set(key, value);
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
}
```

## Step-by-Step Migration Checklist

Migrating a complex extension requires a systematic approach. Use this checklist to ensure you address all necessary changes:

1. **Audit Your Current Extension**: Document all APIs, permissions, and background page behaviors your extension currently uses. Identify which features rely on MV2-specific behaviors.

2. **Update Your Manifest**: Change `manifest_version` to 3 and reorganize permissions into `permissions` and `host_permissions` arrays.

3. **Migrate Background Scripts**: Convert persistent background pages to service workers. Replace `setTimeout` and `setInterval` with `chrome.alarms`. Implement storage-based state management.

4. **Update Network Request Handling**: Replace `webRequest` with `declarativeNetRequest`. Create rule files and register them in your manifest.

5. **Migrate Content Scripts**: Review content script logic for compatibility. Update manifest declarations if needed.

6. **Update Action API**: Replace browserAction and pageAction with the unified action API.

7. **Review Permission Usage**: Identify optional permissions and implement runtime request logic. Ensure host permissions are correctly specified.

8. **Test All Features**: Thoroughly test every extension feature in MV3 mode. Pay special attention to features that rely on background page state.

9. **Submit for Review**: Upload your MV3 version to the Chrome Web Store. Ensure your store listing mentions MV3 compatibility.
>>>>>>> content/mv3-migration-guide

## Common Migration Pitfalls

<<<<<<< HEAD
### Pitfall 1: Assuming State Persists

The most common mistake is assuming variables maintain their values between service worker invocations.

```javascript
// WRONG - State lost on termination
let userData = null;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!userData) {
    userData = loadFromStorage();
  }
  sendResponse(userData);
});

// CORRECT - Always fetch from storage
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  const result = await chrome.storage.local.get(['userData']);
  sendResponse(result.userData);
  return true;
});
```

### Pitfall 2: Blocking Event Handlers

In MV3, event handlers must return true if they intend to send a response asynchronously.

```javascript
// WRONG - Response sent after handler returns
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  fetchData().then(data => sendResponse(data));
});

// CORRECT - Return true to indicate async response
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  fetchData().then(data => sendResponse(data));
  return true;
});
```

### Pitfall 3: Forgetting Host Permissions

Many APIs require host permissions in addition to named permissions.

```javascript
// Required in MV3 for most network-related features
"host_permissions": [
  "http://example.com/*",
  "https://example.com/*"
]
```

### Pitfall 4: Using Deprecated APIs

Several APIs are deprecated or removed in MV3:
- chrome.webRequest blocking
- chrome.pageAction
- chrome.browserAction (use chrome.action)
- Remote code execution

## Testing Strategy

### Local Testing

1. Load your extension in Developer Mode
2. Test all user-facing features
3. Verify service worker initialization
4. Check storage persistence
5. Test across different Chrome versions

### Automated Testing

```javascript
// Example Puppeteer test for extension
const puppeteer = require('puppeteer');

async function testExtension() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-extensions-except=./dist']
  });
  
  const page = await browser.newPage();
  await page.goto('https://example.com');
  
  // Test content script functionality
  const result = await page.evaluate(() => {
    return window.getExtensionData();
  });
  
  console.log('Content script result:', result);
  await browser.close();
}
```

### Chrome Web Store Testing

Use the Chrome Web Store's draft testing feature to test your MV3 extension before public release. Upload your extension as a draft and use the "Test distribution" option to distribute to trusted testers. This allows you to verify that the extension installs correctly and functions as expected before a public release.

### Debugging Service Workers

Debugging service workers requires a different approach than debugging background pages. Use chrome://extensions to access the service worker console, or navigate directly to chrome-serviceworker://inspect to view active service workers.

```javascript
// Add logging to track service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker starting');
});

// Debug: Log when service worker wakes up
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('Message received:', msg);
  sendResponse({ status: 'received' });
});
```

### Performance Considerations

Manifest V3's event-driven architecture offers significant performance benefits but requires careful design:

- **Minimize wake-ups**: Each service worker invocation consumes resources. Batch operations when possible and use the chrome.alarms API for scheduled tasks rather than frequent triggers.

- **Optimize storage access**: Storage operations are asynchronous and can be slow. Cache frequently accessed data in memory but always have a fallback to storage.

- **Use declarativeNetRequest efficiently**: Static rules are processed more efficiently than dynamic rules. Define as many rules as possible in the static ruleset.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 deprecation:

- **January 2022**: Chrome 100+ - MV3 becomes default
- **January 2023**: MV2 flagged as deprecated in Chrome Web Store
- **January 2024**: MV2 extensions no longer accepted for new publications
- **June 2024**: MV2 extensions no longer able to be updated
- **Early 2025**: Full MV2 phase-out expected

Your extension must be migrated to MV3 to continue functioning and receiving updates.

## Conclusion

Migrating from Manifest V2 to Manifest V3 requires careful attention to the architectural differences between background pages and service workers, the new declarative approach to network request handling, and the updated permission model. While the migration involves significant changes, the resulting extension is more secure, more performant, and better aligned with modern web platform practices.

Start your migration early, test thoroughly, and take advantage of the extensive documentation and tooling that Google provides. The Chrome Extension community has produced numerous guides, and our related articles on [service workers](/chrome-extension-guide/docs/guides/background-to-sw-migration/) and [declarativeNetRequest](/chrome-extension-guide/docs/guides/declarative-net-request/) provide additional depth on these critical topics.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
=======
Understanding common mistakes helps you avoid wasting time on preventable issues:

**In-Memory State Loss**: Forgetting that service workers terminate and lose all in-memory state. Always use `chrome.storage` for data that must persist between service worker invocations.

**Blocking Asynchronous Operations**: Attempting synchronous operations in service workers that require async handling. Remember that storage API callbacks complete after the service worker may have terminated.

**Timer Misuse**: Continuing to use `setTimeout` and `setInterval` for recurring tasks. These may not fire reliably in terminated service workers. Use `chrome.alarms` instead.

**Rule Limit Exceeded**: The `declarativeNetRequest` API has limits on the number of rules you can define. Large rule sets may require multiple rulesets or server-side rule management updates.

**Permission Overspecification**: Requesting more permissions than necessary triggers additional user prompts and reduces installation conversion. Use optional permissions where possible.

## Testing Strategy

A robust testing strategy is essential for a successful migration. Your testing should cover functional correctness, performance, and edge cases specific to the MV3 architecture.

### Functional Testing

Test all extension features with the MV3 manifest. Pay particular attention to background service worker behaviors, network request modifications, and cross-component communication. Create test cases that exercise the full range of your extension's functionality.

### Lifecycle Testing

Specifically test service worker lifecycle behaviors. Install and uninstall your extension, trigger service worker termination through idle timeout, and verify that state persists correctly across these events. Test what happens when Chrome restarts with your extension installed.

### Permission Testing

Test your extension's behavior when users grant or deny optional permissions. Ensure your extension degrades gracefully when specific permissions are unavailable and doesn't crash or produce errors in these scenarios.

## Chrome Timeline for MV2 Deprecation

Google has announced a phased timeline for Manifest V2 deprecation. Extensions using Manifest V2 will progressively lose functionality and eventually stop working entirely. While specific dates have shifted due to developer feedback and ecosystem considerations, the direction is clear: all extensions must migrate to Manifest V3.

The Chrome Web Store no longer accepts new Manifest V2 extensions, and existing MV2 extensions receive increasingly limited support. You should plan your migration now rather than waiting for强制 deadlines that could compress your timeline unnecessarily.

---

**Part of the Chrome Extension Guide by theluckystrike. More at zovo.one**
>>>>>>> content/mv3-migration-guide
