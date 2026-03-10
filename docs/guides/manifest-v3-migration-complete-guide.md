---

title: "Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3"
description: A comprehensive guide to migrating your Chrome extension from Manifest V2 to Manifest V3. Covering service workers, declarativeNetRequest, permission changes, and more.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/manifest-v3-migration-complete-guide/"

---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's Manifest V3 represents the most significant evolution in extension development since the platform's inception. Google introduced MV3 to improve security, privacy, and performance across the Chrome extension ecosystem. This comprehensive guide walks you through every aspect of migrating your extension from Manifest V2 to Manifest V3, covering architectural changes, API replacements, and best practices for a smooth transition.

## Understanding MV2 vs MV3 Architecture Differences

The fundamental difference between Manifest V2 and Manifest V3 lies in how extensions execute code and manage their lifecycle. In MV2, extensions used persistent background pages that remained loaded as long as the browser was running. This continuous execution model allowed developers to maintain state easily but consumed system resources even when the extension was idle.

Manifest V3 replaces persistent background pages with ephemeral service workers. These event-driven scripts activate only when needed and terminate after periods of inactivity. This architectural shift offers substantial benefits: reduced memory consumption, improved security through shorter attack windows, and better resource management across the browser.

The implications extend beyond the background script. MV3 introduces stricter constraints on remote code execution, requires declarative approaches for network request modification, and implements a more granular permission model. Understanding these interconnected changes is essential for successful migration.

### Key Architectural Changes Overview

| Aspect | Manifest V2 | Manifest V3 |
|--------|-------------|-------------|
| Background Script | Persistent background page | Ephemeral service worker |
| Network Filtering | webRequest blocking | declarativeNetRequest |
| Remote Code | Allowed with warnings | Eliminated (bundled only) |
| Action API | browserAction | action |
| Content Scripts | Injected directly | Native support retained |

## Background Page to Service Worker Migration

The transition from background pages to service workers represents the most significant technical change in your migration journey. Service workers in MV3 operate on an entirely different paradigm than persistent background pages.

In MV2, your background script could maintain variables in global scope indefinitely. The script remained loaded, and you could rely on in-memory state throughout the browser session. MV3 service workers, by contrast, can terminate at any time after completing their event handlers. This termination occurs after approximately 30 seconds of inactivity, though Chrome may adjust this timing based on system resources.

### Adapting to the Ephemeral Lifecycle

To migrate successfully, you must move away from relying on in-memory state. All persistent data must live in `chrome.storage` rather than JavaScript variables. This includes user preferences, cached data, and any state your extension needs to maintain across service worker restarts.

Event listeners must be registered at the top level of your service worker file. Unlike MV2 where you could conditionally register listeners, MV3 requires all listeners to be present when the service worker executes. This ensures Chrome can properly route events to your extension regardless of when it activates.

The chrome.alarms API replaces setTimeout and setInterval for scheduling tasks. Timers cannot function reliably in service workers due to the termination behavior, making alarms the only supported mechanism for scheduled background operations.

For a deep dive into implementing service workers, consult our [Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/) which covers TypeScript patterns, event handling, messaging, and production-ready implementations.

### Manifest Configuration Changes

Update your manifest.json to declare the service worker:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "2.0.0",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

The `"type": "module"` setting enables ES module support, allowing you to organize code across multiple files and import external modules.

## webRequest to declarativeNetRequest Migration

Network request modification in MV3 requires a fundamentally different approach. The blocking webRequest API that allowed MV2 extensions to intercept, modify, and block network requests has been replaced with the declarativeNetRequest API.

In MV2, you could use `chrome.webRequest.onBeforeRequest` to block or redirect requests synchronously, examining and transforming request details in your handler. This blocking capability was powerful but presented security concerns—extensions could intercept sensitive data passing through the browser.

The declarativeNetRequest API works differently. Instead of examining and modifying requests in real-time, you define rules declaratively in your extension's manifest. These rules specify patterns for matching requests and the actions to take—block, redirect, or modify headers. Chrome evaluates these rules internally without invoking your extension code for each request.

### Rule Declaration Structure

Declare your rules in a JSON file referenced by the manifest:

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

Your rules.json file contains an array of rule objects:

```json
{
  "rules": [
    {
      "id": 1,
      "priority": 1,
      "action": { "type": "block" },
      "condition": {
        "urlFilter": "*.ads.example.com",
        "resourceTypes": ["script", "image"]
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
        "urlFilter": "*.tracking.example.com",
        "resourceTypes": ["image"]
      }
    }
  ]
}
```

This approach removes your extension from the request processing path entirely, improving both security and performance. However, it requires careful planning of your rule sets since you cannot make runtime decisions about individual requests.

For comprehensive coverage of declarativeNetRequest implementation, including dynamic rules, session rules, and advanced patterns, see our [declarativeNetRequest Guide](/chrome-extension-guide/docs/mv3/declarative-net-request/).

## Remote Code Elimination

Manifest V3 eliminates the ability to execute remote code within extensions. In MV2, you could load and execute JavaScript from external URLs, allowing for dynamic feature updates without publishing new versions to the Chrome Web Store. This capability, while convenient, presented significant security risks—compromised external servers could inject malicious code into users' browsers.

MV3 requires all executable code to be bundled within the extension package. This means any JavaScript, CSS, or WebAssembly your extension uses must be included in the published CRX file. External resources can be loaded for data (JSON files, images, fonts) but not for executable code.

### Migration Strategy

If your MV2 extension loads remote scripts, you must bundle them into your extension package. For configurations that previously loaded dynamically, consider these approaches:

1. **Bundled configurations**: Include configuration data as JSON files in your package. Update by publishing new versions to the Web Store.

2. **Remote configuration with local fallback**: Fetch configuration from your server but implement robust error handling that defaults to bundled values. Use `fetch()` in your service worker to retrieve configuration, then store it in chrome.storage for offline use.

3. **Code splitting for large extensions**: Use dynamic imports within your bundled code to load feature modules on demand without external requests.

This change increases the review time for updates but significantly improves the security posture of the extension ecosystem.

## Content Script Changes

Content scripts undergo fewer breaking changes in MV3 but require some adjustments. The fundamental capability—injecting scripts into web pages—remains supported, but execution context and API access have evolved.

Content scripts in MV3 continue to run in the context of web pages, with access to the page's DOM. However, the extension's background service worker cannot directly access page content. Communication between content scripts and the service worker uses the standard message passing APIs, which remain consistent between MV2 and MV3.

### Manifest Declaration

Content scripts are declared similarly to MV2, with minor syntax changes:

```json
{
  "content_scripts": [
    {
      "matches": ["*://*.example.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

One notable change: the `match_about_blank` option now defaults to false in MV3. If your extension requires injection into about:blank frames or about:srcdoc frames, explicitly enable this option.

Service workers cannot access the DOM directly. If your extension needs to manipulate page content based on background events, maintain a content script that listens for messages from the service worker.

## Permission Model Updates

MV3 implements a more granular permission model designed to give users clearer insight into what data extensions can access. Several permission changes affect migration:

### Host Permissions

In MV2, host permissions could be specified in the "permissions" array alongside API permissions. MV3 separates host permissions into a distinct "host_permissions" array. This separation makes it clearer to users which domains your extension can access.

```json
{
  "permissions": [
    "storage",
    "alarms",
    "action"
  ],
  "host_permissions": [
    "*://*.example.com/*",
    "*://*.another-site.com/*"
  ]
}
```

### Optional Permissions

MV3 supports declaring optional permissions that users can approve separately from the initial installation. This pattern reduces the immediate permission request at installation, improving conversion rates and user trust:

```json
{
  "optional_permissions": [
    "bookmarks",
    "topSites"
  ]
}
```

Request optional permissions at runtime using `chrome.permissions.request()` after explaining why your extension needs the additional access.

### Permission Warnings

Chrome displays permission warnings based on the requested capabilities. Some warnings that appeared in MV2 may appear differently or not at all in MV3 due to the changed architecture. Test your extension's permission warnings by loading it in developer mode and reviewing what Chrome displays during installation.

## Action API Migration

The browserAction API from MV2 is replaced by the action API in MV3. This rename reflects the expanded role of extension actions beyond simple browser toolbar buttons.

### Basic API Mapping

| browserAction Method | action Method |
|---------------------|---------------|
| chrome.browserAction | chrome.action |
| setBadgeText | setBadgeText |
| setBadgeBackgroundColor | setBadgeBackgroundColor |
| setIcon | setIcon |
| setPopup | setPopup |

### Manifest Declaration

In MV2, you might declare the browser action in your manifest:

```json
{
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "32": "icon32.png"
    }
  }
}
```

In MV3, this becomes:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon16.png",
      "32": "icon32.png"
    }
  }
}
```

The action API also supports new capabilities like programmatic popup opening with `chrome.action.openPopup()`.

## Storage Patterns

Storage patterns require adjustment to work reliably with service workers. Because service workers terminate and restart, you cannot rely on in-memory variables persisting between events.

### Using chrome.storage

All persistent data must use `chrome.storage` rather than localStorage or global variables:

```javascript
// Storing data
chrome.storage.local.set({ 
  userPreferences: { theme: 'dark', notifications: true },
  lastProcessedTimestamp: Date.now()
});

// Retrieving data
chrome.storage.local.get(['userPreferences'], (result) => {
  const prefs = result.userPreferences;
  // Handle the retrieved preferences
});
```

The storage API supports both callback and Promise-based patterns. For cleaner async/await code, use the Promise variant available in recent Chrome versions:

```javascript
const getPreferences = async () => {
  const result = await chrome.storage.local.get(['userPreferences']);
  return result.userPreferences;
};
```

Use `chrome.storage.sync` for data that should synchronize across the user's Chrome instances when signed in to Chrome. Be mindful of storage quotas—sync storage has more restrictive limits than local storage.

## Step-by-Step Migration Checklist

Use this checklist to ensure complete coverage of your migration:

1. **Update manifest_version**: Change `"manifest_version": 2` to `"manifest_version": 3`

2. **Migrate background script**: Convert to service worker, register all event listeners at top level, remove in-memory state dependencies

3. **Update background declaration**: Change `"background": { "scripts": [...] }` to `"background": { "service_worker": "background.js" }`

4. **Replace webRequest blocking**: Implement declarativeNetRequest rules for all network modifications

5. **Migrate browserAction to action**: Update manifest declarations and API calls

6. **Separate host permissions**: Move host patterns from "permissions" to "host_permissions"

7. **Bundle remote code**: Include all JavaScript in extension package, remove external script loading

8. **Implement storage patterns**: Move all state to chrome.storage, remove localStorage dependencies

9. **Update timers**: Replace setTimeout/setInterval with chrome.alarms

10. **Test thoroughly**: Verify all functionality works with service worker lifecycle behavior

## Common Pitfalls

Several issues frequently arise during MV3 migration:

**Forgetting that service workers terminate**: Always assume your service worker may not be running when events fire. Store all state in chrome.storage and re-initialize from storage in each execution.

**Not registering all event listeners at top level**: Listeners registered inside other event handlers will never fire because the service worker may terminate before the outer event completes.

**Using blocking webRequest**: DeclarativeNetRequest cannot replicate all webRequest capabilities. Plan your migration around what the declarative API supports.

**Exceeding rule limits**: declarativeNetRequest has limits on the number of rules you can define. Large rule sets may require multiple rulesets or optimization.

**Assuming timers work**: setTimeout and setInterval will not fire reliably in service workers. Use chrome.alarms exclusively for scheduled tasks.

## Testing Strategy

Comprehensive testing for MV3 extensions requires accounting for the service worker lifecycle:

1. **Manual testing**: Install your extension and trigger various events. Use `chrome://extensions` to inspect service worker state and logs.

2. **Lifecycle testing**: Trigger events, then wait for the service worker to terminate (30+ seconds of inactivity). Verify subsequent events still work correctly.

3. **Storage testing**: Clear extension data and reload. Verify all functionality works with empty storage.

4. **Permission testing**: Test clean install flow to verify permission warnings are appropriate and accurate.

5. **Chrome Web Store testing**: Upload as unlisted and test with a small user group before full release.

Use Chrome's developer tools to debug service workers. Access the service worker console through chrome://extensions, or use the "Inspect service worker" link when viewing your extension's background script details.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for MV2 phase-out:

- **January 2022**: New extensions published to Chrome Web Store must use Manifest V3
- **January 2023**: Existing MV2 extensions can no longer be updated (extended to June 2024)
- **June 2024**: All updates to existing MV2 extensions blocked; extensions must migrate to continue receiving updates
- **Future**: Full removal of MV2 support in subsequent Chrome releases

Extensions that do not migrate will continue to function for users who have them installed, but developers cannot publish updates, security patches, or feature improvements. Given this timeline, migration should be a priority for all extension developers.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
