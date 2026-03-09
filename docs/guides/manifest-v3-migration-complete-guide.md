---
layout: default
title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: "A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covers service workers, declarativeNetRequest, permission changes, and more."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's transition from Manifest V2 to Manifest V3 represents the most significant architectural change in the extension platform's history. With Google officially deprecating MV2 and enforcing MV3 requirements, developers must update their extensions to comply with the new standards. This comprehensive guide walks you through every aspect of the migration process, from understanding the fundamental architectural differences to implementing the new APIs and patterns required by MV3.

The migration involves more than just updating a version number in your manifest.json file. You'll need to rethink how your extension handles background processing, network request interception, state management, and user permissions. This guide provides detailed explanations, code examples, and best practices to ensure your migration is smooth and your extension remains functional and performant.

## Understanding MV2 vs MV3 Architecture

The fundamental difference between Manifest V2 and Manifest V3 lies in how each version handles background processing and resource management. Understanding these architectural differences is crucial for successful migration.

### Background Page Architecture (MV2)

In Manifest V2, background pages operated as persistent HTML pages that remained loaded throughout the browser session. These background pages had full access to Chrome's extension APIs and could maintain global state in memory indefinitely. Developers could rely on variables persisting across event handlers, use setTimeout and setInterval without concern for termination, and access the DOM directly within the background context.

```javascript
// MV2 Background Page (background.js)
let extensionState = {
    userData: null,
    cachedResponses: new Map(),
    settings: {}
};

// This timer runs continuously
setInterval(() => {
    checkForUpdates();
    syncData();
}, 60000);

// Message handling with persistent state access
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getUserData') {
        sendResponse({ data: extensionState.userData });
    }
    return true; // Keep the message channel open for async responses
});

// Direct DOM manipulation was possible
document.getElementById('status').textContent = 'Extension active';
```

The persistent nature of MV2 background pages meant that extensions could consume significant system resources even when not actively being used. Chrome's decision to move to MV3 was partly driven by the desire to improve browser performance and reduce resource consumption.

### Service Worker Architecture (MV3)

Manifest V3 replaces persistent background pages with **ephemeral service workers** that follow an event-driven lifecycle. Service workers activate only when needed to handle events, then terminate after a period of inactivity. This fundamentally changes how you must structure your background logic.

```javascript
// MV3 Service Worker (service-worker.js)

// State is NOT persistent - must use chrome.storage
let cachedState = null;

// Event listeners MUST be at top level - no lazy loading
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getUserData') {
        // Load state from storage when needed
        chrome.storage.local.get(['userData'], (result) => {
            sendResponse({ data: result.userData });
        });
        return true; // Required for async sendResponse
    }
});

// Use chrome.alarms instead of setInterval
chrome.alarms.create('periodicUpdate', {
    periodInMinutes: 1
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'periodicUpdate') {
        checkForUpdates();
    }
});

// No DOM access - use chrome.runtime.lastError for error handling
```

For a detailed guide on service worker patterns and best practices, see our [Chrome Extension Service Workers](/chrome-extension-guide/mv3/service-workers/) guide.

## Migrating from webRequest to declarativeNetRequest

One of the most significant API changes in MV3 affects extensions that intercept or modify network requests. The powerful webRequestBlocking API has been removed and replaced with the declarativeNetRequest API, which provides a more secure and performant approach to network filtering.

### Understanding the Change

In MV2, extensions could use webRequestBlocking to intercept network requests synchronously, allowing them to block or modify requests in real-time. While powerful, this approach had several drawbacks: it required broad access to raw network data, could block browser threads during processing, and presented privacy concerns since extensions had access to complete request and response data.

MV3's declarativeNetRequest API takes a different approach. Instead of intercepting each request individually, you define rules that tell Chrome how to handle categories of requests. Chrome then applies these rules internally without exposing raw network data to your extension.

```javascript
// MV2 with webRequest (manifest.json)
{
    "permissions": [
        "webRequest",
        "webRequestBlocking",
        "https://example.com/*"
    ]
}

// MV2 background.js
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.url.includes('ads')) {
            return { cancel: true };
        }
        return { cancel: false };
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
);
```

```javascript
// MV3 with declarativeNetRequest
{
    "permissions": [
        "declarativeNetRequest"
    ],
    "host_permissions": [
        "https://example.com/*"
    ]
}

// rules.json - declarative rules
[
    {
        "id": 1,
        "priority": 1,
        "action": { "type": "block" },
        "condition": {
            "urlFilter": "ads",
            "resourceTypes": ["main_frame", "sub_frame"]
        }
    },
    {
        "id": 2,
        "priority": 1,
        "action": {
            "type": "redirect",
            "redirect": { "url": "https://example.com/placeholder" }
        },
        "condition": {
            "urlFilter": "old-api",
            "resourceTypes": ["xmlhttprequest"]
        }
    }
]
```

For a complete guide to implementing declarativeNetRequest, see our [Chrome Extension Declarative Net Request](/chrome-extension-guide/mv3/declarative-net-request/) guide.

## Remote Code Elimination

MV3 enforces strict limits on executable code to improve security and performance. Extensions can no longer load remote code or eval() functions at runtime. All JavaScript must be bundled directly in the extension package.

### What Changed

In MV2, developers could load scripts from external URLs or use eval() and new Function() to execute dynamically generated code. This flexibility, while convenient, created significant security vulnerabilities. Malicious extensions could potentially load harmful code from external sources or execute user-supplied code.

MV3 eliminates these risks by requiring all extension code to be bundled:

```javascript
// MV2 - NOT ALLOWED IN MV3
// Loading external script
const script = document.createElement('script');
script.src = 'https://cdn.example.com/library.js';
document.head.appendChild(script);

// Using eval
const userCode = 'console.log("Hello")';
eval(userCode);

// Dynamic function creation
const fn = new Function('return "Hello"');
```

```javascript
// MV3 - All code must be bundled
// Import bundled modules
import { helperFunction } from './utils/helpers.js';
import { apiClient } from './services/api.js';

// Use chrome.scripting for content scripts
chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content-script.js']
});
```

### Content Security Policy Updates

MV3 enforces stricter Content Security Policy rules:

- No `unsafe-eval` - Functions like eval(), new Function(), and setTimeout(string) are disabled
- No remote script loading - All JavaScript must be in the extension package
- No remote styles for content scripts - CSS must be bundled or injected via chrome.scripting

## Content Script Changes

Content scripts in MV3 have several important changes from MV2, primarily in how they're injected and how they communicate with the extension.

### Programmatic Injection

Instead of declaring content scripts in manifest.json, MV3 emphasizes programmatic injection using the chrome.scripting API:

```javascript
// MV2 - manifest.json declaration
{
    "content_scripts": [
        {
            "matches": ["<all_urls>"],
            "js": ["content-script.js"],
            "css": ["styles.css"]
        }
    ]
}
```

```javascript
// MV3 - Programmatic injection
// From service worker or popup
chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content-script.js']
}, (results) => {
    // Handle results
});

chrome.scripting.insertCSS({
    target: { tabId: tabId },
    files: ['styles.css']
});
```

### Message Passing

Content scripts communicate with the extension background through message passing, but the patterns remain similar. However, remember that your service worker may terminate between messages, so design your communication accordingly.

## Permission Model Updates

MV3 introduces a clearer separation between permissions and host permissions, along with new optional permission patterns.

### Host Permissions Separation

In MV2, host permissions were listed alongside API permissions. MV3 separates them for better user transparency:

```javascript
// MV2
{
    "permissions": [
        "tabs",
        "storage",
        "https://*.google.com/*",
        "https://api.myapp.com/*"
    ]
}

// MV3
{
    "permissions": [
        "tabs",
        "storage"
    ],
    "host_permissions": [
        "https://*.google.com/*",
        "https://api.myapp.com/*"
    ]
}
```

### Optional Permissions

MV3 allows you to request permissions at runtime when needed, rather than requiring all permissions at installation:

```javascript
// Request optional permissions when needed
async function requestAdditionalPermissions() {
    const permissions = { permissions: ['bookmarks'] };
    const granted = await chrome.permissions.request(permissions);
    if (granted) {
        console.log('Bookmarks permission granted');
    }
}

// Check for optional permissions
chrome.permissions.contains({ permissions: ['bookmarks'] }, (result) => {
    if (result) {
        // Permission is granted
    }
});
```

## Action API Migration

The browserAction and pageAction APIs from MV2 have been unified into the action API in MV3.

### Migration Example

```javascript
// MV2
chrome.browserAction.setIcon({ path: 'icon.png' });
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setPopup({ popup: 'popup.html' });

// MV3
chrome.action.setIcon({ path: 'icon.png' });
chrome.action.setBadgeText({ text: '5' });
chrome.action.setPopup({ popup: 'popup.html' });
```

The main change is the API name: `chrome.browserAction` or `chrome.pageAction` becomes `chrome.action`.

## Storage Patterns

With service workers terminating when idle, you can no longer rely on in-memory state. All persistent data must use chrome.storage.

### State Management Strategies

```javascript
// Initialize state from storage on service worker startup
let extensionState = {};

async function loadState() {
    const result = await chrome.storage.local.get(['settings', 'cachedData']);
    extensionState = {
        settings: result.settings || {},
        cachedData: result.cachedData || {}
    };
}

// Save state changes immediately
async function updateSettings(newSettings) {
    extensionState.settings = { ...extensionState.settings, ...newSettings };
    await chrome.storage.local.set({ settings: extensionState.settings });
}

// Use storage change listeners to sync state across contexts
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.settings) {
        extensionState.settings = changes.settings.newValue;
    }
});
```

## Step-by-Step Migration Checklist

Use this checklist to ensure you've addressed all aspects of MV3 migration:

1. **Update manifest_version**: Change `"manifest_version": 2` to `"manifest_version": 3`

2. **Migrate background scripts**: 
   - Convert background page to service worker
   - Remove persistent background script references
   - Add `"service_worker": "background.js"` to manifest
   - Replace setTimeout/setInterval with chrome.alarms

3. **Update network request handling**:
   - Replace webRequest blocking with declarativeNetRequest
   - Create rules JSON files
   - Update manifest permissions

4. **Migrate action API**:
   - Replace chrome.browserAction with chrome.action
   - Replace chrome.pageAction with chrome.action

5. **Update content scripts**:
   - Consider programmatic injection
   - Update to chrome.scripting API

6. **Fix permissions**:
   - Separate host_permissions from permissions
   - Review and minimize required permissions

7. **Update storage**:
   - Replace in-memory state with chrome.storage
   - Implement storage change listeners

8. **Remove remote code**:
   - Bundle all JavaScript in the extension
   - Remove external script references

9. **Test thoroughly**:
   - Test service worker lifecycle
   - Verify all features work with new APIs

## Common Pitfalls and How to Avoid Them

### Service Worker Termination

**Problem**: Code assumes service worker stays running.

**Solution**: Always use chrome.storage for persistence and chrome.alarms for scheduling. Never assume the service worker is still in memory.

### Async Response Patterns

**Problem**: Forgetting to return true for async message responses.

**Solution**: Always return true from onMessage listeners when using async sendResponse:

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    asyncOperation().then(result => {
        sendResponse(result);
    });
    return true; // Keep message channel open for async response
});
```

### Storage API Differences

**Problem**: Using callback-based storage API incorrectly in async contexts.

**Solution**: Use the promise-based API available in newer Chrome versions:

```javascript
// Promise-based (recommended)
const result = await chrome.storage.local.get(['key']);
// or
chrome.storage.local.set({ key: value }).then(() => { /* success */ });
```

### Permission Errors

**Problem**: Host permissions in wrong location causing errors.

**Solution**: Ensure host permissions are in `host_permissions` array, not `permissions`.

## Testing Strategy

Comprehensive testing is essential for MV3 migration due to the significant architectural changes.

### Testing Service Worker Lifecycle

Test that your extension works correctly when the service worker is terminated and restarted:

1. Load your extension in Chrome
2. Trigger an action that initializes service worker state
3. Wait for the service worker to terminate (can take 30+ seconds of inactivity)
4. Trigger another action that requires the service worker
5. Verify state is correctly restored from storage

### Testing in Manifest V3 Mode

Use Chrome's flags to test with different MV3 configurations:

```
chrome://flags/#extension-manifest-v3
```

### Automated Testing

Consider using tools like Puppeteer or Playwright to automate extension testing:

```javascript
const { chromium } = require('playwright');

async function testExtension() {
    const browser = await chromium.launch({
        args: ['--disable-extensions-except=path/to/extension']
    });
    // Test your extension functionality
}
```

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 deprecation:

- **January 2022**: Chrome 100+ warns about MV2 extensions
- **January 2023**: New MV2 extensions rejected from Chrome Web Store
- **January 2024**: Existing MV2 extensions cannot be updated
- **June 2024**: MV2 extensions disabled in Chrome

Extensions must be migrated to MV3 to continue functioning. Developers should prioritize migration to ensure their extensions remain functional.

## Conclusion

Migrating from Manifest V2 to Manifest V3 requires careful attention to the architectural changes, particularly the shift to service workers and the declarativeNetRequest API. While the migration may seem daunting, following this guide and leveraging the linked resources will help ensure a smooth transition.

Remember that MV3 brings significant benefits: improved performance through service worker lifecycle management, better security through reduced permissions and eliminated remote code, and enhanced user privacy through the declarativeNetRequest API. These improvements make the migration effort worthwhile for both developers and users.

For more detailed information on specific MV3 topics, explore our guides on [Service Workers](/chrome-extension-guide/mv3/service-workers/) and [Declarative Net Request](/chrome-extension-guide/mv3/declarative-net-request/).

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
