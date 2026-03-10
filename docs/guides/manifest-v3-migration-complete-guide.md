---
layout: guide
title: Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3
description: Complete guide to migrating Chrome extensions from Manifest V2 to Manifest V3. Covering service workers, declarativeNetRequest, permission changes, and more.
---

# Manifest V3 Migration Guide: Convert Your Chrome Extension from MV2 to MV3

Chrome's Manifest V3 represents the most significant evolution in extension development since the platform's inception. Google introduced MV3 to enhance security, improve performance, and protect user privacy. For developers, this transition requires understanding fundamental architectural changes, rewriting core components, and adapting to new patterns. This comprehensive guide walks you through every aspect of migrating your extension from Manifest V2 to Manifest V3.

## Understanding MV2 vs MV3 Architecture Differences

The architectural shift between Manifest V2 and Manifest V3 represents a complete reimagining of how Chrome extensions operate. In MV2, extensions enjoyed a persistent background page that remained active throughout the browser session. This page could run continuously, maintaining state in memory, executing long-running tasks, and responding to events in real-time. While convenient for developers, this model consumed significant system resources even when extensions sat idle.

Manifest V3 replaces the persistent background page with an event-driven service worker model. Your background script now runs only when Chrome needs to respond to specific events—extension icon clicks, network requests, alarms, or messages from content scripts. After completing its work, the service worker terminates, freeing up memory and CPU resources. This ephemeral nature improves overall browser performance and reduces the attack surface available to malicious extensions.

Beyond the background script changes, MV3 introduces several other architectural modifications. The action API consolidates browser action and page action into a single unified interface. Content scripts now run in a more isolated context with limited access to extension APIs. The permission system requires more granular declarations, reducing the likelihood of overprivileged extensions. Remote code execution—once common in MV2 extensions—is now prohibited entirely, forcing developers to bundle all logic within the extension package.

These changes reflect Google's commitment to user privacy and security. However, they require developers to rethink fundamental patterns. State management, timer handling, network interception, and cross-component communication all require new approaches in MV3.

## Migrating from Background Page to Service Worker

The transition from background pages to service workers demands the most significant code changes in your migration journey. Your persistent background script likely maintains state in global variables, uses setInterval for periodic tasks, and maintains open connections. Each of these patterns requires modification.

First, update your manifest.json to declare a service worker instead of a background page:

```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

The service worker must register all event listeners at the top level of the script. Unlike the background page where you could add listeners dynamically, service workers require complete registration on first execution. Chrome will terminate the service worker after it finishes processing events, so every necessary listener must be in place before termination:

```javascript
// MV3 Service Worker - register all listeners upfront
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed or updated
  initializeExtension();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

chrome.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm);
});

// Initialize state from storage
async function initializeExtension() {
  const state = await chrome.storage.local.get(['settings', 'data']);
  // Set up your initial state
}
```

State persistence becomes critical in MV3. Since your service worker terminates between events, you cannot rely on in-memory state. Use chrome.storage.local or chrome.storage.sync for all persistent data. Initialize your state from storage when the service worker starts, and save any changes immediately when state updates occur.

For timer-based operations, replace setInterval and setTimeout with chrome.alarms API. The alarms API survives service worker termination and will wake your worker when the scheduled time arrives:

```javascript
// Instead of setInterval
chrome.alarms.create('periodicTask', {
  delayInMinutes: 5,
  periodInMinutes: 5
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTask') {
    performPeriodicTask();
  }
});
```

For more detailed guidance on service worker implementation, see our [Chrome Extension Background Service Worker Guide](/chrome-extension-guide/docs/guides/background-service-worker/).

## Converting webRequest to declarativeNetRequest

Network request modification represents one of the most challenging migration areas. In MV2, the webRequest API allowed extensions to observe, block, or modify any network request in real-time. You could analyze headers, body content, and make blocking decisions based on complex logic. This power came with significant privacy implications—extensions could potentially read all network traffic.

MV3's declarativeNetRequest API takes a different approach. Instead of examining requests in real-time, you define rules statically or update them dynamically. Chrome evaluates these rules internally, applying your specified actions without exposing raw request data to your extension. This design protects user privacy while still enabling powerful request modification.

Static rules are bundled with your extension and defined in JSON files:

```json
// rules/block_ads.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": ".*\\.doubleclick\\.net",
      "resourceTypes": ["script", "image"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "redirect", "redirect": { "url": "https://example.com/placeholder.png" } },
    "condition": {
      "urlFilter": ".*\\.tracker\\.com/track\\.png",
      "resourceTypes": ["image"]
    }
  }
]
```

Declare these rules in your manifest:

```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ad_blocker_rules",
      "enabled": true,
      "path": "rules/block_ads.json"
    }]
  }
}
```

Dynamic rules allow runtime modification. Use these for user-controlled blocking, allowlists, or feature-specific rules:

```javascript
// Add dynamic rule at runtime
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1001,
    priority: 1,
    action: { type: 'block' },
    condition: { urlFilter: 'example.com/tracking', resourceTypes: ['script'] }
  }],
  removeRuleIds: []
});
```

For comprehensive documentation on this API, refer to our [Declarative Net Request Guide](/chrome-extension-guide/docs/guides/declarative-net-request/).

## Eliminating Remote Code

Perhaps the most consequential MV3 change involves the complete prohibition of remote code execution. In MV2, extensions could fetch and execute JavaScript from external servers, enabling dynamic feature deployment and A/B testing. This capability created significant security vulnerabilities—if an attack compromised your server, they could inject malicious code into millions of extensions.

MV3 eliminates this attack vector entirely. All executable code must exist within the extension package uploaded to the Chrome Web Store. No eval(), no new Function(), no loading scripts from external URLs. This requirement applies to all JavaScript, CSS, and Wasm—everything must be bundled.

To migrate, audit your codebase for external code sources. Common patterns requiring refactoring include:

- Loading scripts from your server: Bundle scripts into the extension
- Remote configuration affecting behavior: Store configuration locally and update via chrome.storage
- Dynamic feature toggles: Use manifest features or storage-based flags
- External libraries: Include them in your package rather than loading from CDN

If you previously used remote code for A/B testing, consider alternative approaches. Client-side experimentation using random assignment stored in chrome.storage works well. Server-side experiments can control which features appear in the UI without executing remote code—the extension simply reads configuration that controls feature visibility.

## Content Script Changes

Content scripts face new constraints in MV3. While they still inject into web pages, their access to extension APIs and communication patterns have changed.

Content scripts in MV3 can no longer use certain APIs directly. The webRequest API, for instance, is unavailable from content scripts—use the service worker and declarativeNetRequest instead. Additionally, content scripts now run in a more isolated world, meaning they cannot share variables with page scripts as easily.

The messaging system remains functional but requires attention. Since the service worker may not be running when a content script sends a message, implement proper error handling and queueing:

```javascript
// Content script
async function sendToBackground(message) {
  try {
    const response = await chrome.runtime.sendMessage(message);
    return response;
  } catch (error) {
    // Service worker might not be running
    // Queue message or retry later
    console.log('Background unavailable, queueing message');
    return null;
  }
}
```

For complex extensions, consider using persistent connections with chrome.runtime.connect from the content script, allowing the service worker to respond when it wakes.

## Permission Model Updates

MV3 introduces a more granular permission system designed to protect user privacy. Several powerful permissions now trigger additional review processes or require manifest version 3 specifically.

The host permission model changed significantly. In MV2, you could request broad access to all URLs using &lt;all_urls&gt; or *. In MV3, host permissions must be specific, and many common patterns require the activeTab permission instead. The activeTab permission grants access only when the user explicitly invokes your extension—clicking the toolbar icon or using a keyboard shortcut.

Key permission changes to address:

- **Host permissions**: Be as specific as possible. Instead of &lt;all_urls&gt;, use specific domains
- **activeTab**: Use this for extensions that operate on the current page when triggered
- **scripting**: The chrome.scripting API requires explicit permission declaration
- **declarativeNetRequest**: Replaces webRequest for network modification
- **storage**: Now requires explicit declaration even for local storage

Review your extension's requested permissions and remove any that are genuinely unnecessary. Fewer permissions mean faster installation, less user resistance, and simpler Chrome Web Store review.

## Action API Migration

MV3 consolidates browser actions and page actions into a single "action" API. If your MV2 extension uses browserAction or pageAction, you must migrate to the new system.

Update your manifest to use the unified action:

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

In your JavaScript, replace chrome.browserAction and chrome.pageAction with chrome.action:

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setPopup({ popup: 'popup.html' });

// MV3
chrome.action.setBadgeText({ text: '5' });
chrome.action.setPopup({ popup: 'popup.html' });
```

The action API also supports new features like sidePanel (for extensions that provide a persistent panel) and declarative content conditions. Review the full API to take advantage of MV3 capabilities.

## Storage Patterns

Your storage strategy requires rethinking in MV3. Since the service worker terminates between invocations, you cannot cache data in memory. Every time your service worker wakes, reload state from chrome.storage.

Implement a robust storage initialization pattern:

```javascript
// Initialize state on service worker start
let extensionState = {
  settings: {},
  userData: {},
  cachedData: null
};

async function loadState() {
  try {
    const stored = await chrome.storage.local.get(null);
    extensionState = {
      settings: stored.settings || {},
      userData: stored.userData || {},
      cachedData: stored.cachedData || null
    };
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

// Call on every service worker start
loadState();

// Save state whenever it changes
async function saveState() {
  await chrome.storage.local.set(extensionState);
}
```

For frequently accessed data, consider using the Cache API alongside chrome.storage. The Cache API provides synchronous access to cached responses, useful for service worker operations where async storage might introduce delays.

## Step-by-Step Migration Checklist

Use this systematic approach to migrate your extension:

1. **Create a new branch** for migration work in your version control
2. **Update manifest.json**: Change manifest_version to 3, update background to service_worker, review and minimize permissions
3. **Migrate background script**: Convert to service worker pattern, register all listeners upfront, implement state persistence
4. **Handle network requests**: Replace webRequest with declarativeNetRequest rules
5. **Update content scripts**: Review API availability, update messaging patterns
6. **Migrate action API**: Consolidate browserAction/pageAction to chrome.action
7. **Audit storage**: Implement proper state loading/saving, remove in-memory caching assumptions
8. **Remove remote code**: Bundle all scripts locally, remove external script loading
9. **Test comprehensively**: Verify all features work with the new architecture
10. **Update documentation**: Reflect MV3 changes in your extension's documentation

## Common Pitfalls

Several issues frequently trip up developers during migration:

**Forgetting event listeners**: Service workers must register all listeners on first execution. If you conditionally add listeners or register them after async operations, they'll be missing when the service worker wakes.

**Assuming persistent state**: Global variables disappear when the service worker terminates. Every piece of state must be read from chrome.storage on startup and written on every change.

**Using blocking webRequest**: The blocking mode of webRequest is unavailable in MV3. You must rewrite to use declarativeNetRequest, which has different capabilities and limitations.

**Ignoring alarm precision**: chrome.alarms has minimum intervals. Very short intervals (under 1 minute) may not behave as expected. Plan for granularity limitations.

**Missing permissions**: Always declare every API you use in the manifest. MV3 enforces permission requirements more strictly than MV2.

## Testing Strategy

 Thorough testing proves essential for successful migration. Create a comprehensive test plan covering:

**Service worker lifecycle**: Verify your extension functions correctly across service worker starts and stops. Test that state persists correctly between invocations.

**Message delivery**: Test communication between content scripts and background when the service worker hasn't been active. Implement and verify retry logic.

**Storage reliability**: Verify data survives browser restarts, extension updates, and service worker termination.

**Permission edge cases**: Test installation with minimal permissions. Verify features work with the exact permissions you plan to declare.

Use Chrome's extension debugging tools extensively. The Service Worker section of chrome://extensions provides access to service worker state, including termination and wake events.

## Chrome Timeline for MV2 Deprecation

Google has established a clear timeline for Manifest V2 phase-out. The transition occurs in phases:

- **January 2023**: Chrome 112 began requiring MV3 for new extensions
- **June 2023**: Auto-update disabled for MV2 extensions
- **2024**: MV2 extensions no longer appear in Chrome Web Store search results
- **2025**: Chrome requires MV3 for all published extensions

While exact dates shift slightly based on development progress, the direction is clear. All extensions must migrate to Manifest V3. Extensions remaining on MV2 will eventually stop functioning.

The Chrome Web Store now requires MV3 for new submissions and has begun removing MV2 extensions from prominent placement. If you haven't started migration, begin immediately to avoid interruption to your users.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
