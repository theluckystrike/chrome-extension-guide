---
title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
seo_description: "Complete guide to migrating Chrome extensions from Manifest V2 to V3. Learn about service workers, declarativeNetRequest, permission changes, and testing strategies."
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Migrating your Chrome extension from Manifest V2 (MV2) to Manifest V3 (MV3) is one of the most significant updates you'll undertake as a Chrome extension developer. Google announced the transition in 2020, and with the deprecation timeline now firmly in place, understanding how to navigate this migration is essential for maintaining and improving your extension.

This comprehensive guide walks you through every aspect of the migration process, from understanding the fundamental architectural differences to executing a smooth transition that keeps your users' experience intact.

## Understanding MV2 vs MV3 Architecture Differences

### The Fundamental Shift

Manifest V3 introduces several architectural changes designed to improve security, performance, and privacy in Chrome extensions. The most significant difference lies in how background processes operate.

In Manifest V2, extensions used persistent background pages that loaded once when the browser started and remained active until it closed. These background pages could execute arbitrary code, maintain long-lived connections, and access Chrome APIs directly at any time.

Manifest V3 replaces persistent background pages with **service workers**. Service workers are event-driven, temporary execution contexts that activate only when needed and terminate when idle. This change dramatically improves resource usage but requires developers to rethink how they handle asynchronous operations and state management.

### Key Architectural Differences

The architectural differences between MV2 and MV3 extend beyond just the background script:

| Feature | Manifest V2 | Manifest V3 |
|---------|-------------|-------------|
| Background Script | Persistent background page | Service worker (event-based) |
| Code Execution | Remote code allowed | No remote code permitted |
| Network Requests | webRequest blocking | declarativeNetRequest |
| Content Scripts | Injected automatically | Programmatically injected |
| Actions | Multiple action types | Unified action API |
| Host Permissions | Request on install | Request at runtime |

### Why These Changes Matter

Google implemented these changes for three primary reasons:

1. **Security**: Eliminating remote code execution prevents malicious extensions from loading unverified code after installation.

2. **Performance**: Service workers use fewer system resources since they only run when needed, reducing memory footprint and improving browser startup time.

3. **Privacy**: The new permission model gives users more control over what data extensions can access, requiring explicit permission grants for sensitive operations.

## Migrating from Background Pages to Service Workers

The background page to service worker migration is the most substantial change in MV3. Here's what you need to know:

### Understanding Service Worker Lifecycle

Service workers in extensions follow a lifecycle similar to web service workers but with Chrome-specific behaviors:

- **Installation**: The service worker installs when the extension updates or Chrome restarts
- **Activation**: After installation, the old service worker is terminated before the new one activates
- **Idle**: The service worker terminates after remaining idle for approximately 30 seconds
- **Wake**: Events like browser actions, network requests, or alarms wake the service worker

### Converting Your Background Script

Your MV2 background script likely looks something like this:

```javascript
// MV2 Background Page
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  // Initialize extension state
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchData') {
    fetch(request.url).then(response => response.json()).then(sendResponse);
    return true; // Keep channel open for async response
  }
});
```

Convert this to MV3 by removing persistent listeners and adding wake events:

```javascript
// MV3 Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchData') {
    // Must handle async response differently
    fetch(request.url)
      .then(response => response.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Keep service worker alive for specific operations
chrome.alarms.create('periodicSync', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSync') {
    // Handle periodic sync
  }
});
```

### State Management Without Persistent Variables

Since service workers terminate and lose their execution context, you cannot rely on in-memory variables persisting between events. Instead:

- Use `chrome.storage` for persistent state
- Use `chrome.alarms` for scheduled tasks
- Use `chrome.idle` to detect when the user is active
- Pass state explicitly between service worker invocations

For more detailed guidance on service workers, see our [Service Worker Guide](/docs/guides/service-worker-guide/).

## webRequest to declarativeNetRequest Migration

One of the most complex migrations involves network request blocking. MV2's `webRequest` API allowed you to block or modify network requests synchronously. MV3's `declarativeNetRequest` uses a declarative ruleset approach.

### Understanding the Differences

**webRequest (MV2)**:
- Synchronous blocking of requests
- Can read and modify request headers
- Requires host permissions for all URLs
- Evaluated per-request in real-time

**declarativeNetRequest (MV3)**:
- Declarative rules defined in JSON
- Asynchronous (rules are evaluated by Chrome)
- Limited header modification capabilities
- More performant but less flexible

### Migration Strategy

First, define your rules in a JSON file:

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
      "resourceTypes": ["script", "image"]
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
      "urlFilter": "https://example.com/missing-image.jpg",
      "resourceTypes": ["image"]
    }
  }
]
```

Then update your manifest:

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

For comprehensive details on implementing declarativeNetRequest, see our [declarativeNetRequest Guide](/docs/guides/declarative-net-request/).

## Remote Code Elimination

MV3 prohibits loading and executing remote code. This means you cannot:

- Load external scripts via `<script>` tags with remote URLs
- Use `eval()` or `new Function()` with dynamically constructed code
- Fetch and execute code from external servers

### What This Means for Your Extension

If your MV2 extension loads external scripts or evaluates dynamic code, you must bundle all logic within the extension. Update your build process to inline any external dependencies:

```javascript
// No longer allowed in MV3
fetch('https://external-server.com/script.js')
  .then(response => response.text())
  .then(code => eval(code));

// Instead, bundle the code
import { bundledFunction } from './bundled-module.js';
```

This change improves security by ensuring users know exactly what code runs in their browser.

## Content Script Changes

Content scripts require significant changes in MV3. Previously, you could declare content scripts in manifest.json and they would automatically inject into matching pages. MV3 requires programmatic injection.

### Programmatic Injection

Instead of automatic injection:

```json
// MV2 - manifest.json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }
]
```

Use programmatic injection in MV3:

```javascript
// MV3 - service worker
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});
```

Or declare permissions in manifest and inject on navigation:

```json
{
  "permissions": ["scripting"],
  "host_permissions": ["<all_urls>"]
}
```

```javascript
// Inject when user navigates to matching URL
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ['content.js']
    });
  }
}, { url: [{ schemes: ['https'] }] });
```

## Permission Model Updates

MV3 introduces a more granular permission model. Many permissions that were automatically granted at installation now require runtime permission requests.

### New Permission Categories

- **Mandatory permissions**: Required at installation
- **Optional permissions**: Requested at runtime when needed
- **Host permissions**: Can be requested at runtime

### Migrating Permissions

Review your manifest and identify which permissions can become optional:

```json
{
  "permissions": [
    "storage",
    "alarms",
    "scripting"
  ],
  "optional_permissions": [
    "tabs",
    "bookmarks",
    "history"
  ]
}
```

Request optional permissions when needed:

```javascript
// Check if permission is granted
async function requestPermission(permission) {
  const result = await chrome.permissions.request({ permissions: [permission] });
  return result;
}

// Check current permissions
async function hasPermission(permission) {
  return await chrome.permissions.contains({ permissions: [permission] });
}
```

## Action API Migration

MV3 consolidates the various action types (browser action, page action) into a single Action API.

### Updating Manifest Configuration

```json
// MV2
"browser_action": {
  "default_icon": { "16": "icon16.png" },
  "default_title": "My Extension"
},
"page_action": {
  "default_icon": { "16": "icon16.png" },
  "default_title": "Page Action"
}

// MV3
"action": {
  "default_icon": { "16": "icon16.png" },
  "default_title": "My Extension"
}
```

### API Changes

```javascript
// MV2
chrome.browserAction.onClicked.addListener((tab) => { /* ... */ });
chrome.pageAction.onClicked.addListener((tab) => { /* ... */ });

// MV3
chrome.action.onClicked.addListener((tab) => { /* ... */ });

// Setting badge text
chrome.browserAction.setBadgeText({ text: '5' });
// becomes
chrome.action.setBadgeText({ text: '5' });
```

## Storage Patterns for MV3

With service workers, you must adapt your storage strategy since the execution context doesn't persist.

### Using chrome.storage

Always use `chrome.storage` for data that needs to persist beyond service worker lifecycle:

```javascript
// Storing data
await chrome.storage.local.set({ key: 'value' });
await chrome.storage.sync.set({ key: 'value' });

// Retrieving data
const result = await chrome.storage.local.get(['key']);

// Listening for changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (changes.key && changes.key.newValue !== changes.key.oldValue) {
    // Handle the change
  }
});
```

### Best Practices

- Store all user preferences in `chrome.storage.sync` for cross-device synchronization
- Use `chrome.storage.local` for large datasets that shouldn't sync
- Implement caching strategies using storage for frequently accessed data
- Clear unused data to maintain performance

## Step-by-Step Migration Checklist

Use this checklist to track your migration progress:

1. **Audit Current Extension**
   - List all permissions used
   - Identify background script functionality
   - Document all webRequest usage
   - Map content script injection points

2. **Update Manifest**
   - Change manifest_version to 3
   - Migrate browser_action/page_action to action
   - Move appropriate permissions to optional_permissions
   - Add declarativeNetRequest configuration

3. **Refactor Background Script**
   - Convert to service worker pattern
   - Remove persistent state variables
   - Add alarm-based scheduling
   - Implement proper error handling

4. **Update Network Request Handling**
   - Convert webRequest rules to declarativeNetRequest
   - Create rules JSON files
   - Test blocking behavior thoroughly

5. **Migrate Content Scripts**
   - Change to programmatic injection
   - Update message passing patterns
   - Handle cross-origin requests appropriately

6. **Test All Functionality**
   - Verify service worker lifecycle
   - Test permission requests
   - Confirm network blocking rules work
   - Validate content script injection

7. **Update Documentation**
   - Document any new permissions
   - Update user-facing help text
   - Review Chrome Web Store listing

## Common Pitfalls to Avoid

### Pitfall 1: Assuming Persistent State

Never assume your service worker maintains state between events. Always read from storage at the start of each event handler.

### Pitfall 2: Using Promises Incorrectly

Service workers can terminate before promises resolve. Use async/await properly and ensure critical operations complete before the service worker goes idle.

### Pitfall 3: Blocking Service Worker Termination

Avoid using `while` loops or long-running operations. Use `chrome.alarms` for periodic tasks instead.

### Pitfall 4: Forgetting Host Permissions

Remember that declarativeNetRequest requires host permissions in the `host_permissions` field, separate from `permissions`.

### Pitfall 5: Not Testing in Incognito Mode

Incognito mode may have different behavior. Test your extension thoroughly in all modes.

## Testing Strategy

### Local Testing

1. Enable Developer Mode in Chrome Extensions
2. Click "Load unpacked" and select your extension directory
3. Test all user flows manually
4. Check service worker logs in Chrome DevTools (Extensions > Service Worker)

### Automated Testing

Use Puppeteer or Playwright for end-to-end testing:

```javascript
const { chromium } = require('puppeteer');

async function testExtension() {
  const browser = await chromium.launch({
    args: ['--disable-extensions-except=path/to/extension']
  });
  // Test your extension functionality
}
```

### Testing Service Worker Behavior

Use Chrome's extension debugging tools to:
- Force service worker updates
- Simulate idle/active states
- View console logs from service worker
- Inspect storage

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 deprecation:

- **January 2023**: New extensions rejected from Chrome Web Store
- **June 2023**: Existing MV2 extensions can no longer be updated
- **January 2024**: Chrome disables MV2 extensions (varied by Chrome version)
- **June 2024**: Complete MV2 removal from Chrome

Extensions not migrated by these deadlines will stop functioning. Prioritize your migration to ensure continuous service for your users.

---

## Conclusion

Migrating from Manifest V2 to Manifest V3 requires careful planning and thorough testing, but the result is a more secure, performant extension that follows modern best practices. The key to successful migration is understanding the architectural changes—particularly the shift to service workers—and adapting your code patterns accordingly.

Start your migration early, test thoroughly, and take advantage of the resources available through Google's extension documentation and the Chrome Extension Guide community.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one*
