---

title: Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3
description: A comprehensive guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covers background service workers, declarativeNetRequest, permission changes, and more.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"

---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Google's transition from Manifest V2 to Manifest V3 represents the most significant change to Chrome Extension development in a decade. This comprehensive guide walks you through every aspect of migrating your extension, with practical code examples, common pitfalls to avoid, and a step-by-step checklist to ensure a smooth transition.

## Understanding the Architecture Differences

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

// Persistent event listeners maintain state
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getData') {
    sendResponse({ data: extensionState.cachedData });
  }
  return true; // Keep message channel open
});

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
    "https://*/*"
  ]
}
```

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

## Storage Patterns

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

## Common Pitfalls

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
