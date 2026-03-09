---

layout: guide
title: Manifest V3 Migration Guide — Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating your Chrome extension from Manifest V2 to Manifest V3. Learn about background service workers, declarativeNetRequest, permission changes, and the complete migration checklist.
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"

---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Google's transition from Manifest V2 to Manifest V3 represents the most significant architectural change in Chrome extension development history. This comprehensive guide walks you through every aspect of migrating your extension, from understanding the fundamental architectural differences to implementing advanced patterns that leverage MV3's improved security and performance model.

The migration process can seem daunting, especially for complex extensions with extensive background logic or network request manipulation. However, by understanding the reasoning behind each change and following a systematic approach, you can ensure a smooth transition that actually improves your extension's performance and security posture.

## Understanding the Architectural Differences

Manifest V2 and Manifest V3 differ in fundamental ways that affect how your extension operates at every level. Understanding these differences is essential before beginning your migration journey.

### The Persistent Background Page vs. Ephemeral Service Worker

In Manifest V2, your background script ran as a persistent page that remained loaded for the entire duration the browser was open. This background page had full access to the DOM and could maintain state in global variables without concern for lifecycle management. While convenient for developers accustomed to traditional web development, this model created significant memory overhead, especially for users with multiple extensions installed.

Manifest V3 replaces the persistent background page with a service worker that Chrome activates when needed and terminates after periods of inactivity. This architectural change means your background logic must be entirely event-driven. The service worker wakes up in response to events like browser alarms, user actions, network requests, or messages from content scripts, executes its handler, and then allows Chrome to terminate it when idle.

This shift requires you to rethink state management entirely. Global variables that persisted across user interactions in MV2 will be lost when the service worker terminates. Instead, you must store any persistent state using the storage API or IndexedDB, and your extension must be prepared to reinitialize state when the service worker next activates.

The service worker model offers substantial benefits for users: reduced memory consumption, improved security through shorter attack windows, and better overall browser performance. For developers, it requires adopting asynchronous patterns and proper state initialization routines, but these patterns ultimately lead to more robust extensions.

### Execution Model Changes

Beyond the background script transformation, MV3 introduces several execution model changes that affect how your extension runs. Content scripts in MV3 no longer share the DOM with the page they're injected into, which prevents certain types of cross-site scripting vulnerabilities but requires adjustments to how you interact with page content.

The removal of remote code execution is perhaps the most significant security-focused change. MV2 allowed extensions to execute code from remote servers, enabling dynamic functionality but also creating substantial security risks. MV3 requires all extension code to be bundled within the extension itself, eliminating the attack vector entirely while requiring developers to plan for all functionality at extension build time.

These changes collectively create a more secure extension platform that protects users from malicious extensions while maintaining the flexibility developers need to build powerful tools.

## Background Page to Service Worker Migration

The migration from background pages to service workers is the most substantial part of any MV2 to MV3 transition. This section provides detailed guidance for making this shift successfully.

### Converting Your Background Script

Begin by updating your manifest.json to declare a service worker instead of a background page:

```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

If your existing background script uses ES modules, setting `"type": "module"` allows you to import other modules within your service worker. This is essential for organizing code in larger extensions.

### Event-Driven Architecture

Your background script must now be entirely event-driven. Every piece of functionality should be triggered by an event rather than running continuously. Chrome provides events for almost every extension API, from `chrome.runtime.onInstalled` for initialization to `chrome.alarms.onAlarm` for scheduled tasks.

Convert any continuous polling or setInterval-based logic to use the alarms API:

```javascript
// MV2: Continuous polling (anti-pattern in MV3)
setInterval(() => {
  checkForUpdates();
}, 60000);

// MV3: Alarm-based approach
chrome.alarms.create('checkUpdates', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkUpdates') {
    checkForUpdates();
  }
});
```

### State Management Patterns

With the service worker terminating between activations, you need robust state management. The recommended pattern uses the storage API with lazy initialization:

```javascript
// Initialize state on service worker startup
let extensionState = {};

async function initializeState() {
  const stored = await chrome.storage.local.get(['settings', 'cache']);
  extensionState = {
    settings: stored.settings || {},
    cache: stored.cache || {}
  };
}

// Run initialization when service worker activates
chrome.runtime.onInstalled.addListener(() => {
  initializeState();
});

chrome.runtime.onStartup.addListener(() => {
  initializeState();
});

// Save state before termination
chrome.runtime.onSuspend.addListener(() => {
  chrome.storage.local.set(extensionState);
});
```

For more detailed guidance on service worker patterns, see our [Chrome Extension Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/).

## Migrating from webRequest to declarativeNetRequest

The webRequest API in MV2 allowed extensions to observe and modify network requests in real-time, but this capability required broad permissions that posed significant privacy and security concerns. MV3 replaces this with the declarativeNetRequest API, which defines rules for request modification at extension installation time rather than at request time.

### Understanding the New Paradigm

With declarativeNetRequest, you define rules in JSON files that specify which requests to block, redirect, or modify. Chrome evaluates these rules internally without your extension needing to process each request. This approach provides better privacy (your extension never sees request details) and performance (no code execution per request).

First, declare the declarativeNetRequest permission and your rules file in the manifest:

```json
{
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "*://*.example.com/*"
  ],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

### Creating Rule Sets

Your rules.json file defines the actual filtering logic:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": ".*\\.ads\\..*",
      "resourceTypes": ["main_frame", "sub_frame", "script", "image"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": { "url": "https://example.com/custom-page" }
    },
    "condition": {
      "urlFilter": ".*old-pattern\\.com.*",
      "resourceTypes": ["main_frame"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "X-Custom-Header", "operation": "set", "value": "value" }
      ]
    },
    "condition": {
      "urlFilter": ".*api\\.example\\.com.*",
      "resourceTypes": ["xmlhttprequest", "fetch"]
    }
  }
]
```

### Dynamic Rules for User-Configurable Filtering

Many extensions allow users to add their own filters dynamically. The declarativeNetRequest API supports dynamic rules that can be added and removed at runtime:

```javascript
// Adding a dynamic rule based on user input
async function addUserFilter(pattern) {
  const rule = {
    id: USER_RULE_BASE_ID,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: pattern,
      resourceTypes: ['main_frame', 'sub_frame']
    }
  };
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule]
  });
}

// Removing user filter
async function removeUserFilter(pattern) {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [USER_RULE_BASE_ID]
  });
}
```

For comprehensive documentation on this API, refer to our [Chrome Extension Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

## Remote Code Elimination

MV3 prohibits loading and executing code from remote sources, a change that dramatically improves the extension security model. This elimination of remote code capability means all your extension's functionality must be bundled at build time.

### Impact on Extension Architecture

If your MV2 extension loaded code from external servers, you need to restructure this functionality. Common patterns that require changes include:

- **Remote feature flags**: Move from fetching configuration to bundled defaults that can be updated through the Web Store auto-update mechanism
- **Dynamic module loading**: Bundle all modules within the extension rather than loading them on demand from external sources
- **Server-side logic**: Move any processing that was done server-side into your extension's background or content scripts

### Update Mechanisms

For extensions that previously relied on remote code for rapid iteration, MV3 provides alternative update paths:

- **Auto-update through Chrome Web Store**: Upload new versions through the developer dashboard, and Chrome automatically推送 updates to users
- **Chrome Enterprise policies**: For enterprise deployments, administrators can push specific versions to managed devices
- **Extensions autoUpdate**: Organizations can host their own update server for enterprise deployments

Plan your build and release process to accommodate these mechanisms. Frequent updates may require more aggressive testing and potentially a phased rollout strategy.

## Content Script Changes

Content scripts in MV3 operate under stricter isolation than in MV2, requiring adjustments to how they interact with the host page.

### DOM Access and Page Interaction

Content scripts can still manipulate the DOM of pages they're injected into, but they no longer share the page's JavaScript context. This means:

- Page scripts (JavaScript loaded by the website itself) cannot access content script variables
- Content scripts cannot access page script variables
- The content script and page scripts exist in completely isolated worlds

For most extensions, this change is transparent since content scripts typically work within their own isolated context. However, if your extension relied on sharing state with page scripts or vice versa, you'll need to implement alternative communication patterns.

### Injection Changes

The `manifest.json` approach to declaring content scripts remains similar, but with some important additions:

```json
{
  "content_scripts": [
    {
      "matches": ["*://*.example.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "host_permissions": [
    "*://*.example.com/*"
  ]
}
```

Note that host permissions are now declared separately in `host_permissions` rather than being combined with other permissions. This separation provides clearer user permission review.

## Permission Model Updates

MV3 introduces a refined permission model that balances user privacy with extension functionality.

### Host Permissions

Host permissions are now split from API permissions and must be declared in the dedicated `host_permissions` field in the manifest. This change makes it clearer to users exactly which websites your extension can access.

For extensions that need to run on all websites, you'll still use the `*://*/*` or `<all_urls>` pattern, but this explicit declaration makes the capability more visible during permission review.

### Optional Permissions

For sensitive permissions, consider implementing optional permissions that users can grant after installation rather than requiring them upfront:

```javascript
// Request optional permission when needed
async function requestOptionalPermission() {
  const result = await chrome.permissions.request({
    permissions: ['bookmarks']
  });
  
  if (result) {
    // Permission granted, enable the feature
    enableBookmarkFeatures();
  }
}

// Check if permission is available
async function checkPermission() {
  const hasPermission = await chrome.permissions.contains({
    permissions: ['bookmarks']
  });
  
  if (!hasPermission) {
    showPermissionPrompt();
  }
}
```

### Manifest V2 Deprecation Timeline

Google has established a clear timeline for Manifest V2 deprecation that you should factor into your migration planning:

- **2023**: Manifest V2 extensions no longer accepted for new publications requiring MV3
- **2024**: Chrome begins disabling MV2 extensions in stable channel for users
- **2025**: Complete phase-out expected with all MV2 extensions disabled

Monitor the official Chrome Enterprise and Extensions blog for the most current timeline, as these dates may shift based on ecosystem feedback and migration progress.

## Action API Migration

The Browser Action and Page Action APIs from MV2 are unified into a single Action API in MV3, simplifying extension development while adding new capabilities.

### Manifest Changes

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "My Extension"
  }
}
```

### Programmatic Control

Control the action badge and icon dynamically:

```javascript
// Set badge text
chrome.action.setBadgeText({ text: '5' });
chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });

// Enable/disable the action
chrome.action.disable(tabId);
chrome.action.enable(tabId);

// Set title dynamically
chrome.action.setTitle({ title: 'Custom Title', tabId: tabId });
```

## Storage Patterns for MV3

With service worker lifecycle considerations, storage strategy becomes critical for maintaining extension state.

### Storage API Usage

The chrome.storage API remains the primary storage mechanism, now with explicit async handling:

```javascript
// Asynchronous storage operations (required in MV3)
async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
  console.log('Settings saved');
}

async function loadSettings() {
  const result = await chrome.storage.local.get('settings');
  return result.settings || {};
}

// Using storage area directly
chrome.storage.sync.set({ key: value }).then(() => {
  console.log('Saved to sync storage');
});
```

### IndexedDB for Complex Data

For more complex data requirements, IndexedDB provides structured storage:

```javascript
const DB_NAME = 'ExtensionDB';
const STORE_NAME = 'cache';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}
```

## Step-by-Step Migration Checklist

Use this systematic checklist to ensure complete migration:

1. **Audit Current Functionality**: Document all features, permissions, and APIs used in your MV2 extension
2. **Create Manifest V3 Baseline**: Create a new manifest.json with `"manifest_version": 3` and basic configuration
3. **Migrate Background Script**: Convert to service worker, implement event-driven patterns, add state management
4. **Update Network Request Handling**: Replace webRequest with declarativeNetRequest
5. **Review Permissions**: Move host permissions to dedicated field, implement optional permissions where appropriate
6. **Migrate Content Scripts**: Verify DOM manipulation still works, update injection logic if needed
7. **Update Action API**: Consolidate browser_action and page_action into action
8. **Test Thoroughly**: Test all functionality in Chrome with MV3, verify service worker lifecycle behavior
9. **Update Build Process**: Ensure bundling includes all code, remove any remote code loading
10. **Submit for Review**: Publish to Chrome Web Store with MV3 manifest

## Common Pitfalls and Solutions

Several issues frequently arise during MV3 migration. Being aware of these helps you avoid common mistakes:

### Service Worker Not Starting

If your service worker fails to activate, check for syntax errors in the file. Use Chrome's service worker debug tools to verify registration.

### Lost State After Termination

If your extension loses state between service worker activations, ensure you're properly saving state before termination and restoring it on startup.

### DeclarativeNetRequest Rules Not Loading

Verify rule JSON syntax carefully. Invalid JSON will silently fail to load. Also ensure your rule IDs are unique within each ruleset.

### Permission Errors

Some APIs require specific permissions that may have been implicit in MV2. Check API documentation for required permissions in MV3.

## Testing Strategy

Comprehensive testing is essential for successful migration:

- **Unit Test Background Logic**: Test event handlers, state management, and API interactions in isolation
- **Integration Test Service Worker Lifecycle**: Verify proper initialization, state persistence, and cleanup
- **End-to-End Test User Flows**: Test complete user journeys from content script through background to storage
- **Performance Testing**: Verify service worker startup time and memory usage meet acceptable thresholds
- **Cross-Version Testing**: If supporting both MV2 and MV3 temporarily, ensure consistent behavior

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
