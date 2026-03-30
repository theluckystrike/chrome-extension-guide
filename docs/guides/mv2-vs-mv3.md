---
layout: default
title: "Manifest V2 vs V3. Complete Comparison for Chrome Extension Developers"
description: "A comprehensive comparison of Manifest V2 vs V3 for Chrome extension developers. Learn about service workers, declarativeNetRequest, breaking changes, and migration strategies."
canonical_url: "https://bestchromeextensions.com/guides/mv2-vs-mv3/"
last_modified_at: 2026-01-15
---

Manifest V2 vs V3. Complete Comparison for Chrome Extension Developers

Introduction

Google's transition from Manifest V2 to Manifest V3 represents the most significant change to Chrome extension development in a decade. Manifest V3 (MV3) was introduced to improve security, privacy, and performance, but it also introduced breaking changes that require developers to update their extensions. This guide provides a complete comparison to help you understand the differences and plan your migration.

Overview of Manifest Versions

Manifest V2 has been the standard since 2012, while Manifest V3 began rolling out in 2021 with a phased deprecation timeline. As of 2024, new extensions must use MV3, and existing MV2 extensions will eventually stop working. Understanding these differences is essential for any Chrome extension developer.

Key Differences Comparison

| Feature | Manifest V2 | Manifest V3 |
|---------|-------------|-------------|
| Background Script | Persistent background pages | Service workers (ephemeral) |
| Network Request Blocking | webRequest blocking | declarativeNetRequest |
| Execution | Remote code allowed | No remote code, all local |
| Manifest Version | `"manifest_version": 2` | `"manifest_version": 3` |
| Host Permissions | Requested at install | Requested at runtime |
| Action API | browserAction + pageAction | Unified `action` API |

Background Scripts: Pages vs Service Workers

Manifest V2: Persistent Background Pages

In MV2, background scripts run in a persistent background page that stays alive as long as the browser is open:

```json
{
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  }
}
```

This persistent nature means:
- Background page loads once and stays resident
- Can maintain long-running connections
- Always has access to DOM APIs
- Higher memory footprint

Manifest V3: Ephemeral Service Workers

MV3 replaces background pages with service workers:

```json
{
  "background": {
    "service_worker": "background.js"
  }
}
```

Service workers are event-driven and terminate when idle:
- No persistent state between events
- Must use `chrome.storage` for persistence
- Lifetime limited to ~30 seconds of inactivity
- Cannot access DOM or `window` objects

Pros and Cons

| Aspect | Manifest V2 Background Pages | Manifest V3 Service Workers |
|--------|------------------------------|----------------------------|
| Persistence | Always running | Terminates when idle |
| Memory | Higher footprint | More efficient |
| State Management | Built-in variables | Requires storage API |
| DOM Access | Full access | No DOM access |
| WebSockets | Native support | Use chrome.socket API |

Network Request Modification

Manifest V2: webRequest Blocking

MV2 uses the `webRequest` API with blocking mode to modify or block network requests:

```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    return { redirectUrl: 'https://example.com/blocked.html' };
  },
  { urls: ['<all_urls>>'] },
  ['blocking']
);
```

Manifest V3: declarativeNetRequest

MV3 requires the `declarativeNetRequest` API with predefined rules:

```json
{
  "permissions": [
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

```javascript
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1,
    priority: 1,
    action: { type: 'redirect', redirect: { url: 'https://example.com' } },
    condition: { urlFilter: '*://bad-site.com/*', resourceTypes: ['main_frame'] }
  }]
});
```

Pros and Cons

| Aspect | MV2 webRequest (Blocking) | MV3 declarativeNetRequest |
|--------|---------------------------|---------------------------|
| Flexibility | Dynamic redirects | Static rules only |
| Performance | Slower (synchronous) | Faster (declarative) |
| Rule Updates | Instant | Requires rule reload |
| Complexity | Simpler code | More setup required |

Remote Code Execution

Manifest V2: Allowed

MV2 permits loading remote code from external servers:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["https://external.com/script.js"]
  }]
}
```

Manifest V3: Local Only

MV3 requires all code to be bundled locally:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

This change significantly improves security by preventing malicious code injection.

Host Permissions

Manifest V2: Install-Time Permissions

All permissions were requested at installation time:

```json
{
  "permissions": [
    "tabs", "bookmarks", "storage", "*://*.example.com/*"
  ]
}
```

Manifest V3: Runtime Permissions

Host permissions for specific sites can be requested at runtime:

```javascript
chrome.permissions.request({
  origins: ['https://example.com/*']
}, (granted) => {
  if (granted) {
    // Permission granted
  }
});
```

This approach improves user trust by showing exactly why permissions are needed.

Action API Unification

Manifest V2: Separate APIs

MV2 had two separate APIs:
- `browserAction` for toolbar icons
- `pageAction` for address bar icons

Manifest V3: Unified Action

MV3 consolidates these into a single `action` API:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```

Migration Strategy

1. Audit Current Extension: List all MV2 APIs used
2. Update Manifest: Change `manifest_version` to 3
3. Convert Background Scripts: Transform to service worker pattern
4. Replace webRequest: Migrate to declarativeNetRequest
5. Bundle Remote Code: Move all external scripts locally
6. Test Thoroughly: Verify all functionality works in MV3

Conclusion

Manifest V3 brings significant improvements in security and performance, but requires careful migration planning. The service worker model, declarativeNetRequest, and removal of remote code are the biggest changes to adapt to. Start your migration early to ensure a smooth transition before MV2 is fully deprecated.

For detailed migration guides, see our [MV3 Migration Guide](/guides/mv3-migration/) and [Background to Service Worker Migration](/guides/background-to-sw-migration/).
