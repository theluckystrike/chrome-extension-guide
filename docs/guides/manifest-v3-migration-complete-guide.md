---
title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: "A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covering service workers, declarativeNetRequest, permission changes, and the complete migration checklist with best practices."
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Google's transition from Manifest V2 to Manifest V3 represents the most significant change to Chrome extension development in over a decade. This comprehensive guide walks you through every aspect of the migration process, from understanding the fundamental architectural differences to implementing the new APIs that replace deprecated functionality. Whether you're maintaining a mature extension with thousands of users or preparing a new project for the future, this guide provides the knowledge and practical strategies you need for a successful migration.

The Manifest V3 initiative aims to improve extension performance, enhance user privacy, and strengthen security across the Chrome extension ecosystem. While these goals benefit end users, they require developers to rethink how extensions are architected and implemented. The changes are substantial but manageable when approached systematically.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental distinction between Manifest V2 and Manifest V3 lies in how extensions handle background processing and network request interception. These architectural changes affect virtually every extension, regardless of its primary functionality.

### Background Page to Service Worker Transformation

In Manifest V2, background pages operated as persistent HTML pages that remained loaded throughout the browser session. These pages had direct access to the DOM, could maintain global state in memory, and could rely on `setTimeout` and `setInterval` for scheduled tasks. The background page was essentially a long-running process that could handle events, manage state, and coordinate between different extension components.

Manifest V3 replaces this persistent model with **service workers**—event-driven scripts that terminate after periods of inactivity and wake up only when needed. This approach significantly reduces memory consumption and CPU usage but requires developers to rethink state management and event handling patterns. Service workers cannot access the DOM, cannot maintain in-memory state between invocations, and must use `chrome.alarms` instead of native timer functions.

The service worker lifecycle fundamentally changes how you architect extension behavior. When a service worker terminates (typically after 30 seconds of inactivity), all local variables are destroyed. Any state that needs to persist must be stored in `chrome.storage` or another persistent storage mechanism. This shift encourages better engineering practices but requires careful planning during migration.

### WebRequest to DeclarativeNetRequest Evolution

Manifest V2 allowed extensions to intercept, block, and modify network requests using the `chrome.webRequest` API with the `webRequestBlocking` permission. This powerful capability enabled ad blockers, privacy tools, and traffic analyzers but came with significant privacy and performance costs. Extensions could read all network traffic, including sensitive data like authentication headers and cookies.

Manifest V3 eliminates `webRequestBlocking` entirely and replaces it with the **Declarative Net Request (DNR)** API. Instead of intercepting requests in real-time, extensions now declare rules that tell Chrome how to handle specific types of requests. Chrome then applies these rules internally, never exposing raw request data to the extension. This approach provides the same functionality for most use cases while dramatically improving privacy and performance.

The DNR API supports blocking requests, redirecting requests, modifying request and response headers, and removing headers. However, it cannot access request or response bodies—a significant limitation for some advanced use cases. Extensions that previously relied on body access must find alternative approaches or, in some cases, may not be fully migratable without functionality changes.

### Remote Code and Execution Context Changes

Manifest V3 introduces strict limitations on executable code to improve security. Extensions can no longer load remote scripts from external URLs at runtime. All JavaScript must be bundled within the extension package, eliminating the ability to push updates without going through the Chrome Web Store review process.

This change affects extensions that previously loaded configuration data, rule sets, or feature flags from external servers. Such extensions must adopt new patterns, such as including all necessary data in the extension bundle or using the `chrome.runtime.fetch` capabilities for dynamic content that doesn't require code execution. The Content Security Policy in MV3 also disallows `unsafe-eval`, which affects some templating libraries and dynamic code generation approaches.

## Migrating Background Scripts to Service Workers

The background script migration represents the most complex and impactful change in the MV3 transition. Successful migration requires understanding the service worker lifecycle and adapting your code to work within its constraints.

### Manifest Configuration Changes

The manifest.json file requires updates to switch from the background page model to the service worker model. Here's how the background configuration changes:

```json
// Manifest V2
{
  "manifest_version": 2,
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  }
}

// Manifest V3
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  }
}
```

The key change is replacing the `scripts` array with a single `service_worker` field. Note that the `persistent` field is no longer needed—service workers are inherently non-persistent by design.

### State Management Refactoring

Global variables that persisted across events in MV2 background pages must be replaced with persistent storage in MV3 service workers. The `chrome.storage` API provides the primary mechanism for maintaining state:

```javascript
// MV2 Background Page - Persistent global state
let userSettings = { theme: 'dark', notifications: true };
let cachedData = null;

function initialize() {
  loadSettings();
  fetchInitialData();
}

// MV3 Service Worker - State loaded on demand
async function initialize() {
  const result = await chrome.storage.local.get(['userSettings', 'cachedData']);
  const userSettings = result.userSettings || { theme: 'dark', notifications: true };
  const cachedData = result.cachedData;
  
  if (!cachedData) {
    await fetchInitialData();
  }
}
```

The pattern involves loading state from storage when the service worker activates, performing necessary operations, and saving any modified state back to storage. This ensures that even if the service worker terminates, the next activation can restore the necessary context.

### Timer Migration: setTimeout and setInterval

Native timer functions (`setTimeout` and `setInterval`) don't work reliably in service workers because they can fire after the worker has terminated. The `chrome.alarms` API provides the correct mechanism for scheduled tasks:

```javascript
// MV2 - Using native timers
setInterval(() => {
  checkForUpdates();
}, 300000); // Check every 5 minutes

// MV3 - Using chrome.alarms
chrome.alarms.create('checkUpdates', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkUpdates') {
    checkForUpdates();
  }
});
```

Note that the minimum interval for alarms is approximately one minute. For more frequent operations, consider alternative approaches or acknowledge that very short intervals may not be precisely maintained.

### DOM Access and Offscreen Documents

Service workers cannot access the DOM, which affects extensions that performed HTML parsing, PDF generation, or other DOM-dependent operations in the background context. MV3 introduces **offscreen documents** as the solution:

```javascript
// Creating an offscreen document for DOM operations
async function createOffscreenDocument() {
  // Check if offscreen document already exists
  const hasDocument = await chrome.offscreen.hasDocument?.();
  
  if (!hasDocument) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER', 'WORKER'],
      justification: 'Need DOM access for HTML parsing'
    });
  }
}

// Communication with the offscreen document
chrome.runtime.sendMessage({
  target: 'offscreen',
  type: 'PARSE_HTML',
  html: htmlContent
});
```

Offscreen documents are separate page contexts that can be created and destroyed as needed. They consume resources only when active, making them more efficient than the always-running background page DOM.

For a more detailed guide on this migration, see our [background service worker migration guide](/chrome-extension-guide/guides/background-to-sw-migration/).

## WebRequest to DeclarativeNetRequest Migration

Migrating network request handling from `webRequest` to `declarativeNetRequest` requires understanding the new declarative rules model and the capabilities (and limitations) of the DNR API.

### Understanding Declarative Rules

Instead of intercepting requests with event listeners, you define rules in JSON format that specify how Chrome should handle requests. These rules are loaded into Chrome at runtime and applied automatically:

```json
// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": ".*\\.doubleclick\\.net",
      "resourceTypes": ["script", "image", "sub_frame"]
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
      "urlFilter": ".*\\.tracker\\.com/ads/.*",
      "resourceTypes": ["image"]
    }
  }
]
```

### Loading and Managing Rules

Rules are loaded using the `declarativeNetRequest.updateDynamicRules` method:

```javascript
// Loading rules at extension startup
async function loadBlockingRules() {
  const rules = [
    {
      id: 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: '.*\\.ads\\..*',
        resourceTypes: ['script', 'image']
      }
    }
  ];

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
    removeRuleIds: [] // Optional: remove existing rules by ID
  });
}

// Check how many rules are allowed
async function checkRuleLimits() {
  const { MAX_NUMBER_OF_RULES } = await chrome.declarativeNetRequest.getAvailableCount?.();
  console.log(`Maximum allowed rules: ${MAX_NUMBER_OF_RULES}`);
}
```

### Header Modification

The DNR API supports modifying headers through the `modifyHeaders` action:

```javascript
const headerModificationRules = [
  {
    id: 1,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        { header: 'User-Agent', operation: 'set', value: 'Mozilla/5.0' },
        { header: 'X-Custom-Header', operation: 'remove' }
      ]
    },
    condition: {
      urlFilter: 'https://api.example.com/*',
      resourceTypes: ['xmlhttprequest', 'fetch']
    }
  }
];
```

For a complete guide to DNR implementation, see our [declarativeNetRequest guide](/chrome-extension-guide/mv3/declarative-net-request/).

## Content Script Changes in MV3

Content scripts undergo several important changes in Manifest V3 that affect how they interact with the extension and the page they're injected into.

### Execution Method Updates

The APIs for injecting content scripts have changed from `chrome.tabs.executeScript` and `chrome.tabs.insertCSS` to the unified `chrome.scripting` API:

```javascript
// MV2
chrome.tabs.executeScript(tabId, {
  file: 'content-script.js'
});

chrome.tabs.insertCSS(tabId, {
  file: 'styles.css'
});

// MV3
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content-script.js']
});

chrome.scripting.insertCSS({
  target: { tabId: tabId },
  files: ['styles.css']
});
```

The new API also supports function-based injection for dynamic code:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => {
    document.body.style.backgroundColor = '#f0f0f0';
  }
});
```

### Declarative Content Script Registration

In MV3, content scripts can be declared in the manifest rather than injected programmatically:

```json
{
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

For dynamic injection based on user action or conditions not known at manifest time, use the `chrome.scripting.registerContentScripts` method.

### Communication Patterns

Content scripts continue to communicate with the service worker via message passing, but the patterns may need adjustment due to the service worker's ephemeral nature:

```javascript
// Content script sending messages
chrome.runtime.sendMessage({
  type: 'USER_ACTION',
  data: { action: 'bookmark', url: window.location.href }
});

// Service worker listening
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'USER_ACTION') {
    handleUserAction(message.data);
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});
```

## Permission Model Updates

Manifest V3 restructures permissions to provide users with clearer information about what extensions can access and when.

### Host Permissions Separation

Host permissions are now separated from API permissions in the manifest. This change gives users more granular control and makes the permission requirements clearer during installation:

```json
{
  "permissions": [
    "storage",
    "tabs",
    "alarms",
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "https://*.google.com/*",
    "https://api.myapp.com/*"
  ]
}
```

API permissions are still requested at installation, but host permissions can trigger additional prompts and are displayed separately in the extension's permissions dialog.

### Optional Permissions

Where possible, request permissions dynamically rather than at installation:

```javascript
// Request permission when needed
async function requestHostPermission() {
  const permissions = { permissions: ['tabs'] };
  
  const granted = await chrome.permissions.request(permissions);
  
  if (granted) {
    console.log('Permission granted');
  } else {
    console.log('Permission denied');
  }
}

// Check if permission is already granted
async function checkPermission() {
  const result = await chrome.permissions.contains({
    permissions: ['bookmarks']
  });
  return result;
}
```

### Restricted Permissions

Some permissions that were previously available in MV2 are now restricted or require justification during Chrome Web Store review:

- **debugger**: Requires a detailed explanation of why the API is necessary
- **pageCapture**: Limited to the extension's own pages
- **tabCapture**: Requires a clear use case description

Review the [restricted permissions documentation](https://developer.chrome.com/docs/extensions/develop/migrate/restricted-permissions) before planning your migration.

## Action API Migration

The Action API consolidates the functionality previously spread across `browserAction` and `pageAction` into a single, unified API.

### Manifest Changes

```json
// MV2 - Separate browser and page actions
{
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" }
  },
  "page_action": {
    "default_popup": "page-action-popup.html"
  }
}

// MV3 - Unified action
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" },
    "default_title": "My Extension"
  }
}
```

### API Usage Changes

```javascript
// MV2
chrome.browserAction.setIcon({ path: 'icon.png' });
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.show(tabId);

// MV3
chrome.action.setIcon({ path: 'icon.png' });
chrome.action.setBadgeText({ text: '5' });
// Note: Action is automatically shown/hidden based on manifest configuration
```

The Action API also supports new features like side panels (in Chrome 114+):

```javascript
// Opening side panel
chrome.action.openSidePanel({ tabId: tab.id });

// Configuring side panel in manifest
{
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

## Storage Patterns for MV3

The storage API remains largely unchanged but plays an increasingly important role in MV3 due to the service worker architecture.

### Storage Types and Use Cases

```javascript
// chrome.storage.local - Extension-specific, up to 10MB
await chrome.storage.local.set({ 
  userData: { name: 'John', preferences: {} }
});

// chrome.storage.sync - Synced across user's devices, smaller quota
await chrome.storage.sync.set({
  settings: { theme: 'dark', notifications: true }
});

// chrome.storage.session - Cleared when browser closes, best for temporary data
await chrome.storage.session.set({
  currentTabData: computedData
});
```

### Storage Change Listeners

Monitor storage changes to keep extension components synchronized:

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.settings) {
    const newSettings = changes.settings.newValue;
    applySettings(newSettings);
    
    // Notify content scripts of changes
    chrome.tabs.query({}).then(tabs => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings: newSettings
        }).catch(() => {
          // Ignore errors from tabs without content script
        });
      });
    });
  }
});
```

For advanced storage patterns, see our [advanced storage patterns guide](/chrome-extension-guide/guides/advanced-storage-patterns/).

## Step-by-Step Migration Checklist

Use this checklist to systematically migrate your extension from MV2 to MV3:

### Phase 1: Assessment and Planning

1. **Audit current implementation**
   - List all MV2 APIs used (webRequest, browserAction, tabs.executeScript, etc.)
   - Identify all global variables and their purposes
   - Document all setTimeout/setInterval calls
   - Map all WebSocket connections
   - Identify DOM access in background context

2. **Review permission requirements**
   - Separate API permissions from host permissions
   - Identify optional permissions that can be requested dynamically
   - Check for restricted permissions that require justification

3. **Create feature matrix**
   - Document which features work in MV2 vs MV3
   - Identify functionality that requires significant restructuring
   - Plan alternative approaches for features that may not fully migrate

### Phase 2: Manifest Updates

4. **Update manifest_version**
   - Change `"manifest_version": 2` to `"manifest_version": 3`

5. **Migrate background configuration**
   - Replace `"background": { "scripts": [...] }` with `"background": { "service_worker": "..." }`

6. **Consolidate actions**
   - Merge browser_action and page_action into action

7. **Restructure permissions**
   - Move host permissions from "permissions" to "host_permissions"

### Phase 3: Code Migration

8. **Migrate background script**
   - Convert global variables to chrome.storage
   - Replace setTimeout/setInterval with chrome.alarms
   - Replace XMLHttpRequest with fetch
   - Implement offscreen documents for DOM operations
   - Add event listener registration at top level

9. **Migrate network request handling**
   - Convert webRequest listeners to declarativeNetRequest rules
   - Update rule format and loading mechanism
   - Test blocking, redirecting, and header modification

10. **Migrate content scripts**
    - Update injection to use chrome.scripting API
    - Review message passing patterns for service worker context
    - Test content script functionality

11. **Migrate action API**
    - Replace chrome.browserAction with chrome.action
    - Update popup and badge functionality
    - Test all action-related features

### Phase 4: Testing and Deployment

12. **Comprehensive testing**
    - Test all extension features in MV3 mode
    - Verify storage persistence across service worker restarts
    - Test alarm functionality
    - Verify message passing between all components

13. **Chrome Web Store preparation**
    - Update screenshots and descriptions if needed
    - Prepare release notes highlighting MV3 support
    - Submit for review

14. **Rollback planning**
    - Keep MV2 version available in dashboard
    - Monitor error reports closely after release
    - Prepare hotfix capability if issues arise

## Common Migration Pitfalls

Understanding these common mistakes helps you avoid them during your migration:

### Service Worker Termination Issues

**Problem**: Code assumes service worker stays running and relies on in-memory state.

**Solution**: Always load state from chrome.storage at the start of event handlers. Never assume the service worker has been running continuously.

### Timer Migration Oversights

**Problem**: Using setTimeout/setInterval in service workers, expecting them to work as in MV2.

**Solution**: Convert all timers to chrome.alarms. Be aware of the minimum 1-minute interval constraint.

### webRequest Blocking Assumption

**Problem**: Assuming webRequestBlocking still exists and trying to use it.

**Solution**: Completely rewrite network filtering using declarativeNetRequest. Test rule loading and application carefully.

### Permission Declaration Errors

**Problem**: Not separating host permissions, causing unnecessary permission warnings.

**Solution**: Carefully review permissions and move all URL/host permissions to host_permissions array.

### Message Response Patterns

**Problem**: Not returning true from onMessage listeners when using async responses.

**Solution**: Always return true from onMessage if you intend to send a response asynchronously.

```javascript
// Correct pattern for async response
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  asyncOperation().then(result => {
    sendResponse(result);
  });
  return true; // Required for async response
});
```

## Testing Strategy for MV3 Migration

A robust testing strategy ensures your migrated extension works correctly across all scenarios.

### Unit Testing Service Worker Logic

```javascript
// Test service worker functionality independently
async function testServiceWorkerLogic() {
  // Test storage operations
  await chrome.storage.local.set({ testKey: 'testValue' });
  const result = await chrome.storage.local.get('testKey');
  assert(result.testKey === 'testValue');
  
  // Test alarm creation and firing
  chrome.alarms.create('testAlarm', { delayInMinutes: 0.1 });
  
  // Test message passing
  const response = await chrome.runtime.sendMessage({ test: true });
  assert(response.success);
}
```

### Integration Testing

Test the full extension flow including:
- Extension installation and activation
- Popup interactions
- Content script injection and communication
- Service worker lifecycle events
- Storage synchronization across components

### Chrome Flags for Testing

Use Chrome flags to test different scenarios:
- `chrome://extensions/` - Load unpacked extension
- Enable "Developer mode" to test non-store builds
- Use Chrome's extension error console for debugging

### Automated Testing with Puppeteer/Playwright

```javascript
// Example: Test extension popup with Playwright
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    args: ['--disable-extensions-except=path/to/extension'] 
  });
  
  const page = await browser.newPage();
  
  // Open extension popup
  await page.goto('chrome-extension://EXTENSION_ID/popup.html');
  
  // Test popup functionality
  const button = await page.locator('#action-button');
  await button.click();
  
  // Verify results
  const status = await page.locator('#status').textContent();
  assert(status === 'Success');
  
  await browser.close();
})();
```

## Chrome Timeline for MV2 Deprecation

Google has announced a phased deprecation schedule for Manifest V2:

### Key Dates

- **January 2022**: Chrome 112 begins warning users about upcoming MV2 deprecation
- **June 2023**: Chrome 115 removes support for several deprecated MV2 features
- **January 2024**: Chrome 120 begins disabling MV2 extensions by default
- **June 2024**: Chrome 126 fully removes MV2 support

### What This Means for Developers

Extensions still on Manifest V2 will stop working for users after the final deprecation date. The Chrome Web Store no longer accepts new MV2 extensions, and existing MV2 extensions cannot be updated unless migrated to MV3.

### Preparing for Deadline

- Start migration early—don't wait until the last minute
- Test thoroughly with early Chrome versions
- Monitor Chrome's official blog for timeline updates
- Have a rollback plan in place

## Conclusion

Migrating from Manifest V2 to Manifest V3 requires careful planning and systematic execution, but the result is a more secure, efficient, and privacy-respecting extension. The key challenges—service worker lifecycle management, declarative network filtering, and permission restructuring—require thoughtful architectural decisions but ultimately lead to better engineering practices.

Start your migration early, test thoroughly at each stage, and take advantage of the extensive documentation and community resources available. The Chrome team has provided migration guides and tooling to assist developers through this transition. With proper planning and execution, your extension will not only survive the MV2 deprecation but will be better positioned for future improvements to the Chrome extension platform.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
