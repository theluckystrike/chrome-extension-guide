---

title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: "Complete step-by-step guide to migrating your Chrome extension from Manifest V2 to Manifest V3. Learn about background service workers, declarativeNetRequest, permission changes, and testing strategies."
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"

---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Migrating your Chrome extension from Manifest V2 to Manifest V3 is not just a simple version bump—it's a fundamental architectural shift that impacts nearly every aspect of your extension's behavior. Google began phasing out Manifest V2 support in 2023, with full deprecation expected in the coming years. This comprehensive guide walks you through every aspect of the migration process, from understanding the core architectural differences to implementing advanced patterns that work seamlessly with the new manifest version.

## Understanding MV2 vs MV3 Architecture Differences

The transition from Manifest V2 to Manifest V3 represents a paradigm shift in how Chrome extensions operate. Understanding these differences is crucial for a successful migration.

### Persistent Background Pages vs. Ephemeral Service Workers

In Manifest V2, your extension could run a persistent background page that remained loaded at all times. This background page had full access to all Chrome APIs and could maintain in-memory state throughout the browser session. The background page would continue running even when the user wasn't actively interacting with your extension, consuming memory and CPU resources continuously.

Manifest V3 replaces this model with service workers that are event-driven and ephemeral. A service worker starts up when Chrome needs to handle an event related to your extension—such as a browser action click, a network request, or an alarm firing. Once the event handler completes and there's no additional work, the service worker terminates. This approach significantly reduces resource consumption but requires you to rethink how you manage state and handle asynchronous operations.

The service worker lifecycle means you cannot rely on in-memory variables persisting between events. Any state that needs to survive service worker termination must be stored in `chrome.storage` or another persistent storage mechanism. This fundamental change affects everything from user preferences to complex extension state machines.

### Synchronous vs. Promise-Based APIs

Manifest V2 featured many synchronous APIs that blocked execution until they completed. For example, calling `chrome.tabs.get()` would return the tab object immediately. Manifest V3 has migrated almost all APIs to return Promises, enabling non-blocking asynchronous operations but requiring you to update your code to handle Promise chains or use async/await syntax.

This shift improves overall extension responsiveness but requires careful refactoring of existing code. Methods that previously returned values directly now return promises that must be properly awaited. Error handling also needs updating, as promise rejections must be caught using `.catch()` or try/catch blocks within async functions.

## Migrating from Background Pages to Service Workers

The background script migration is perhaps the most significant change in your extension. Converting from a persistent background page to a service worker requires careful attention to several key areas.

### Manifest File Changes

Your manifest.json requires fundamental changes to the background section:

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

The `persistent` property is no longer needed—service workers are never persistent by design. Remove it entirely from your manifest.

### Adapting to the Service Worker Lifecycle

Service workers in extensions operate much like service workers in web development, but with some Chrome-specific behaviors. Your background script must handle the lifecycle correctly.

For detailed guidance on service worker implementation patterns, see our [Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/).

The service worker can terminate at any time when idle, which means you should:

1. **Register event listeners at the top level**—never assume your code runs continuously. Register all listeners immediately when the service worker loads.

2. **Use chrome.storage for persistence**—any state that must persist between service worker invocations must be saved to `chrome.storage.local` or `chrome.storage.sync`.

3. **Handle the install and activate events**—while these work similarly to web service workers, the focus is on cleaning up old data and preparing for the new version.

4. **Use the Service Worker Badge API for status**—to keep the extension icon updated, use `chrome.action.setBadgeText()` and related methods.

```javascript
// Service worker example
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize default settings
    chrome.storage.local.set({ initialized: true, settings: {} });
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Handle tab activation
  const tab = await chrome.tabs.get(activeInfo.tabId);
  // Process tab data
});
```

## Converting webRequest to declarativeNetRequest

If your extension intercepts or modifies network requests, you need to migrate from the blocking `chrome.webRequest` API to `chrome.declarativeNetRequest`. This change has significant implications for how you handle network requests.

### Why the Change?

The `webRequest` API in Manifest V2 allowed extensions to intercept, block, or modify network requests in flight. While powerful, this approach required broad permissions and created performance overhead. Malicious extensions could also abuse this API to intercept sensitive data.

The `declarativeNetRequest` API uses a declarative ruleset approach. Instead of examining each request in real-time, you define rules that Chrome evaluates internally. This is more performant and doesn't require access to request content.

### Migration Steps

For comprehensive instructions on implementing declarativeNetRequest, see our [Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

1. **Define your rules in a JSON file:**

```json
// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "block"
    },
    "condition": {
      "urlFilter": "https://example.com/tracker",
      "resourceTypes": ["script"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "url": "https://example.com/alternate.js"
      }
    },
    "condition": {
      "urlFilter": "https://example.com/main.js",
      "resourceTypes": ["script"]
    }
  }
]
```

2. **Update your manifest to reference the rules:**

```json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["*://*.example.com/*"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

3. **Remove blocking webRequest permissions** and replace with the declarative alternative.

Note that `declarativeNetRequest` has limitations—it cannot inspect or modify request bodies, and certain advanced blocking scenarios may require different approaches or may not be fully supported.

## Eliminating Remote Code

Manifest V3 enforces strict limits on code execution to improve security. Your extension cannot load remote scripts from external URLs, and all executable code must be bundled with the extension.

### What Changed?

In Manifest V2, you could load scripts from remote servers:

```javascript
// MV2 - NOT ALLOWED IN MV3
const script = document.createElement('script');
script.src = 'https://example.com/script.js';
document.head.appendChild(script);
```

This approach is prohibited in Manifest V3. All JavaScript must be bundled within the extension package.

### Handling Dynamic Code

If your extension previously loaded code dynamically, you need to refactor to bundle all code:

1. **Bundle all scripts** into your extension's directory
2. **Use dynamic imports** for code splitting within bundled scripts
3. **Store configuration data** in JSON files or chrome.storage rather than fetching code from external sources

```javascript
// Instead of loading remote code, import locally
import { helperFunction } from './utils/helper.js';

// Or use dynamic import for lazy loading
async function loadFeature() {
  const module = await import('./features/feature.js');
  module.initialize();
}
```

## Content Script Changes

Content scripts run in the context of web pages and have specific considerations in Manifest V3.

### Manifest Declaration

Content scripts are still declared in the manifest but with some changes:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

### Programmatic Injection

For dynamic content script injection, the API changed from `chrome.tabs.executeScript` to `chrome.scripting.executeScript`:

```javascript
// MV2
chrome.tabs.executeScript(tabId, {
  file: 'content.js'
});

// MV3
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
});
```

Similarly, inserting CSS changed from `chrome.tabs.insertCSS` to `chrome.scripting.insertCSS`.

### Communication with Background

Content script messaging remains similar, but remember that your background script (now a service worker) may not always be running. Use appropriate timeout handling and consider the ephemeral nature of service workers when designing your messaging architecture.

## Permission Model Updates

Manifest V3 reorganizes permissions into more granular categories, improving user privacy and security.

### Separating Host Permissions

Host permissions are now separated from API permissions:

```json
{
  "permissions": [
    "storage",
    "tabs",
    "action"
  ],
  "host_permissions": [
    "https://*.google.com/*",
    "https://api.example.com/*"
  ]
}
```

This separation makes it clearer to users what sites your extension can access. Host permissions now trigger installation prompts that separately list the domains.

### Optional Permissions

Consider implementing optional permissions for features that don't need to be enabled immediately:

```json
{
  "optional_permissions": [
    "bookmarks",
    "history"
  ]
}
```

Request these permissions when needed rather than at installation:

```javascript
// Request optional permission when needed
async function enableHistoryFeature() {
  const granted = await chrome.permissions.request({
    permissions: ['history'],
    origins: ['https://example.com/*']
  });
  
  if (granted) {
    // Enable the feature
  }
}
```

## Action API Migration

The unified `chrome.action` API replaces both `chrome.browserAction` and `chrome.pageAction` from Manifest V2.

### Manifest Changes

```json
// MV2
{
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" }
  }
}

// MV3
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icon16.png" }
  }
}
```

### API Calls

Replace all `chrome.browserAction` and `chrome.pageAction` calls with `chrome.action`:

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setPopup({ popup: 'popup.html' });

// MV3
chrome.action.setBadgeText({ text: '5' });
chrome.action.setPopup({ popup: 'popup.html' });
```

## Storage Pattern Updates

With service workers terminating frequently, proper storage usage becomes critical.

### Using chrome.storage

The `chrome.storage` API remains the primary storage mechanism but requires different patterns:

```javascript
// Storing state
async function saveState(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

// Retrieving state
async function getState(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

// Listening for changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    console.log('Settings changed:', changes.settings.newValue);
  }
});
```

### Managing Large Data

For larger datasets, consider using IndexedDB directly or through a wrapper library. The storage API has quota limits (typically 5MB for `storage.local` and 100KB for `storage.sync`).

## Step-by-Step Migration Checklist

Use this checklist to ensure complete migration:

1. **Update manifest_version** — Change `"manifest_version": 2` to `3`

2. **Convert background scripts** — Replace persistent background page with service worker:
   - Update manifest background section
   - Refactor to handle service worker lifecycle
   - Move state to chrome.storage

3. **Migrate webRequest to declarativeNetRequest** — If blocking requests:
   - Create rules JSON file
   - Update manifest permissions
   - Remove blocking webRequest

4. **Update action API** — Replace browserAction/pageAction with action

5. **Separate host permissions** — Move URL patterns from permissions to host_permissions

6. **Fix content scripts** — Update to chrome.scripting API

7. **Eliminate remote code** — Bundle all scripts locally

8. **Update API calls** — Convert to Promise-based async/await patterns

9. **Test thoroughly** — Verify all features work with MV3

## Common Pitfalls to Avoid

Several common mistakes can derail your migration:

**Assuming service worker persistence** — Never assume your service worker stays running. Every event handler should be self-contained and restore necessary state from storage.

**Ignoring Promise-based APIs** — Failing to await promises is one of the most common bugs. Use `chrome.runtime.lastError` handling for older callbacks, or properly await all Promise-returning methods.

**Missing host permission separation** — Forgetting to move host permissions to `host_permissions` can cause runtime errors.

**Using deprecated APIs** — Double-check you're not using deprecated APIs like `browserAction` or `tabs.executeScript`.

**Not testing service worker termination** — Manually test what happens when the service worker is terminated between operations.

## Testing Strategy

A robust testing strategy is essential for migration success.

### Manual Testing

1. **Test service worker lifecycle** — Disable and re-enable your extension, verify it recovers properly
2. **Test across different scenarios** — Install, update, restart browser
3. **Test permission prompts** — Verify your extension handles permission requests correctly

### Automated Testing

Use Chrome's testing frameworks and extension-specific tools:

1. **Use Puppeteer or Playwright** for integration testing
2. **Test with different Chrome versions** to ensure compatibility
3. **Verify manifest parsing** using Chrome's extension diagnostics

### Chrome Flags for Testing

Enable these flags for testing:

- `chrome://flags/#extension-manifest-v2` — View MV2 extension warnings
- `chrome://extensions/` — Use "Developer mode" for testing unpacked extensions

## Chrome Timeline for MV2 Deprecation

Google has progressively phased out Manifest V2:

- **January 2023** — New Manifest V2 extensions no longer accepted for Chrome Web Store
- **2023-2024** — Feature deprecation began, with warnings for MV2 extensions
- **2024-2025** — Full MV2 support removal expected

Check the [official Chrome Extensions documentation](https://developer.chrome.com/docs/extensions/develop/migrate) for the latest timeline information.

---

## Conclusion

Migrating from Manifest V2 to Manifest V3 requires careful attention to architectural changes, but the result is a more secure, efficient, and performant extension. The key is understanding that many patterns that worked in MV2 simply don't apply in MV3—particularly around persistent background pages and synchronous APIs.

Take the migration step-by-step, test thoroughly at each stage, and leverage the resources available. The Chrome Extension team has published extensive documentation, and community resources like this guide provide practical patterns for common scenarios.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
