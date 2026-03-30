---
layout: default
title: "declarativeNetRequest: Content Blocking in MV3. Complete Tutorial"
description: "Master declarativeNetRequest API in Chrome Extensions Manifest V3. Learn static vs dynamic rules, JSON syntax, migration from webRequest, and common use cases."
canonical_url: "https://bestchromeextensions.com/tutorials/declarative-net-request/"
last_modified_at: 2026-01-15
---

declarativeNetRequest: Content Blocking in MV3

> Learn how to block, redirect, and modify network requests in Manifest V3 using the Declarative Net Request API. the MV3 replacement for webRequestBlocking.

What is declarativeNetRequest? {#what-is-declarativenetrequest}

The Declarative Net Request API (DNR) is Chrome's recommended way to intercept and modify network requests in Manifest V3 extensions. It was introduced as the replacement for the deprecated `webRequestBlocking` API that existed in Manifest V2.

Unlike the old `webRequestBlocking` API. which gave extensions raw access to network data and could block browser threads while processing. DNR uses a declarative approach. You define rules in advance, and Chrome applies them internally without your extension needing to process each request.

Why DNR Replaced webRequestBlocking {#why-dnr-replaced-webrequestblocking}

The old `webRequestBlocking` API presented significant problems:

- Privacy concerns: Extensions had access to all raw network request/response data
- Performance issues: The API was synchronous and could block browser threads
- Security risks: Unlimited access to request bodies created attack surfaces
- Noisy API: Every request triggered callback functions in your extension

DNR solves these by having you declare rules upfront. Chrome matches requests against these rules internally, so your extension never sees the raw network data.

Static vs Dynamic Rules {#static-vs-dynamic-rules}

DNR supports two types of rules, each with different use cases:

Static Rules {#static-rules}

Static rules are defined in JSON files bundled with your extension. They are:
- Declared in `manifest.json` under `declarative_net_request.rule_resources`
- Fixed at extension install/update time
- Updated only when the extension is reloaded
- Perfect for predefined blocklists (ads, trackers)

Manifest configuration:
```json
{
  "name": "My Ad Blocker",
  "version": "1.0",
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "ad_blocker_rules",
        "enabled": true,
        "path": "rules/ads.json"
      }
    ]
  }
}
```

Example rules file (rules/ads.json):
```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "doubleclick\\.net",
      "resourceTypes": ["script", "image"]
    }
  }
]
```

Dynamic Rules {#dynamic-rules}

Dynamic rules are added, updated, or removed at runtime by your extension code. They are:
- Managed entirely through JavaScript API calls
- Persistent across browser sessions (stored by Chrome)
- Perfect for user-configurable features (custom blocklists)
- Share the same 30,000 rule limit as static rules

Adding dynamic rules:
```javascript
async function addBlockedDomain(domain) {
  const escapedDomain = domain.replace(/\./g, "\\.");
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: Date.now(),
      priority: 1,
      action: { "type": "block" },
      condition: {
        urlFilter: escapedDomain,
        resourceTypes: ["script", "image", "xmlhttprequest"]
      }
    }]
  });
}
```

Key Differences {#key-differences}

| Aspect | Static Rules | Dynamic Rules |
|--------|--------------|---------------|
| Where defined | JSON files in extension | JavaScript at runtime |
| Update mechanism | Extension reload required | API calls anytime |
| Use case | Predefined blocklists | User-configurable features |
| Rule count | Part of 30,000 limit | Part of 30,000 limit |
| Maximum rulesets | 100 files, 50 enabled | Unlimited |

Rule Syntax and Conditions {#rule-syntax-and-conditions}

Each DNR rule is a JSON object with four main properties:

```json
{
  "id": 1,
  "priority": 1,
  "action": { },
  "condition": { }
}
```

Rule Properties {#rule-properties}

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | integer | Yes | Unique identifier (1-65535) |
| `priority` | integer | Yes | Higher priority rules evaluate first |
| `action` | object | Yes | What to do when matched |
| `condition` | object | Yes | Matching criteria |

Condition Properties {#condition-properties}

The `condition` object defines when a rule should trigger:

| Property | Type | Description |
|----------|------|-------------|
| `urlFilter` | string | Pattern to match URLs (uses special syntax) |
| `regexFilter` | string | Regex pattern (more powerful, has limits) |
| `resourceTypes` | array | Types: `main_frame`, `sub_frame`, `stylesheet`, `script`, `image`, `font`, `object`, `xmlhttprequest`, `ping`, `csp_report`, `media`, `websocket`, `webtransport`, `webbundle`, `other` |
| `initiatorDomains` | array | Domains that initiated the request |
| `requestDomains` | array | Domains being requested |
| `excludedDomains` | array | Domains to exclude |
| `tabIds` | array | Specific tab IDs to match |
| `excludeTabIds` | array | Tab IDs to exclude |

URL Filter Syntax {#url-filter-syntax}

DNR uses a special filter syntax (not regex) for `urlFilter`:

| Pattern | Meaning | Example |
|---------|---------|---------|
| `*` | Wildcard | `*.example.com` matches `ads.example.com` |
| `\|\|` | Anchor to domain start | `\|\|example.com` matches `example.com` and `sub.example.com` |
| `^` | Separator (end of domain) | `example.com^` matches `example.com/` but not `example.com.org` |
| `\|` | Anchor to start/end | `\|https://` matches URLs starting with `https://` |
| `\` | Escape special chars | `ads\.example\\.com` matches literal `ads.example.com` |

Common patterns:
```json
// Block all requests to a domain
"urlFilter": "||tracker.example.com"

// Block specific path
"urlFilter": "||example.com/ads/"

// Block specific file type
"urlFilter": "\\.mp4$"

// Block URLs containing specific text
"urlFilter": "tracking"
```

Regex Filters {#regex-filters}

For more complex matching, use `regexFilter` instead of `urlFilter`:

```json
{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "regexFilter": ".*\\.example\\.com/track/.*",
    "resourceTypes": ["xmlhttprequest"]
  }
}
```

> Note: Regex filters are limited to 1,000 rules per extension.

Action Types {#action-types}

The `action.type` property determines what happens when a rule matches:

Block {#action-block}

Completely blocks the network request:

```json
{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "ads\\.example\\.com",
    "resourceTypes": ["script", "image"]
  }
}
```

Redirect {#action-redirect}

Redirects the request to a different URL:

```json
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
    "urlFilter": "ads\\.example\\.com",
    "resourceTypes": ["image"]
  }
}
```

Redirect options:
```json
// Redirect to a specific URL
"redirect": { "url": "https://example.com/blocked.html" }

// Redirect to extension's internal page
"redirect": { "extensionPath": "/blocked.html" }

// Transform to a transform rule (advanced)
"redirect": { "transform": { "scheme": "https" } }
```

ModifyHeaders {#action-modifyheaders}

Add, remove, or modify HTTP headers:

```json
{
  "id": 3,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [
      { "header": "User-Agent", "operation": "set", "value": "Mozilla/5.0 (MyExtension/1.0)" },
      { "header": "X-Custom-Header", "operation": "set", "value": "my-value" }
    ],
    "responseHeaders": [
      { "header": "X-Tracker-ID", "operation": "remove" },
      { "header": "Cache-Control", "operation": "set", "value": "no-store" }
    ]
  },
  "condition": {
    "urlFilter": "api\\.example\\.com",
    "resourceTypes": ["xmlhttprequest"]
  }
}
```

Header operations:
| Operation | Description |
|-----------|-------------|
| `set` | Set value (add if not exists, replace if exists) |
| `append` | Append to existing value |
| `remove` | Remove header entirely |

Allow {#action-allow}

Allow a request (useful for exceptions):

```json
{
  "id": 4,
  "priority": 2,
  "action": { "type": "allow" },
  "condition": {
    "urlFilter": "google-analytics\\.com/collect",
    "resourceTypes": ["xmlhttprequest"]
  }
}
```

upgradeScheme {#action-upgradescheme}

Automatically upgrade HTTP to HTTPS:

```json
{
  "id": 5,
  "priority": 1,
  "action": { "type": "upgradeScheme" },
  "condition": {
    "urlFilter": "http://insecure\\.example\\.com",
    "resourceTypes": ["main_frame"]
  }
}
```

allowAllRequests {#action-allowallrequests}

Allow all requests in a frame hierarchy:

```json
{
  "id": 6,
  "priority": 1,
  "action": { "type": "allowAllRequests" },
  "condition": {
    "urlFilter": "||trusted-cdn.com",
    "resourceTypes": ["sub_frame"]
  }
}
```

Rule Priorities {#rule-priorities}

Rule priority determines which rule wins when multiple rules match the same request.

How Priority Works {#how-priority-works}

1. Rules are sorted by priority (highest first)
2. First matching rule wins
3. If equal priority, rule with more specific condition wins

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": ".*", "resourceTypes": ["script"] }
  },
  {
    "id": 2,
    "priority": 2,
    "action": { "type": "allow" },
    "condition": { "urlFilter": "trusted\\.com", "resourceTypes": ["script"] }
  }
]
```

In this example, scripts from `trusted.com` are allowed (priority 2) while all other scripts are blocked (priority 1).

Priority with Redirects {#priority-with-redirects}

When redirecting, ensure higher priority rules come first:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": ".*" }
  },
  {
    "id": 2,
    "priority": 2,
    "action": {
      "type": "redirect",
      "redirect": { "url": "https://example.com/redirected" }
    },
    "condition": { "urlFilter": "special\\.example\\.com" }
  }
]
```

Testing Rules {#testing-rules}

Using chrome://extensions {#using-chrome-extensions}

1. Load your unpacked extension
2. Enable "Developer mode" 
3. Click "Reload" after modifying rules
4. For dynamic rules, call `updateDynamicRules` in console

Debugging with declarativeNetRequestFeedback {#debugging-with-feedback}

Add the feedback permission to see which rules match:

```json
{
  "permissions": ["declarativeNetRequestFeedback"]
}
```

```javascript
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  console.log("Rule matched:", {
    ruleId: info.rule.ruleId,
    url: info.request.url,
    type: info.request.type
  });
});
```

> Note: This event is for debugging only and may impact performance.

Using Test APIs {#using-test-apis}

```javascript
// Check available static rule count
const available = await chrome.declarativeNetRequest.getAvailableStaticRuleCount();
console.log("Available static rules:", available);

// Test if a URL would be affected
const testURL = "https://ads.example.com/banner.jpg";
const result = await chrome.declarativeNetRequest.testMatchURL(testURL);
console.log("Would match:", result);
```

Common Testing Issues {#common-testing-issues}

| Issue | Solution |
|-------|----------|
| Rules not applying | Ensure ruleset is enabled in manifest |
| Dynamic rules not working | Check if extension has host permissions |
| Redirect loop | Verify redirect URL doesn't match another rule |
| Headers not modified | Use correct header names (case-sensitive) |

Common Use Cases {#common-use-cases}

Ad Blocking {#ad-blocking}

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "doubleclick\\.net",
      "resourceTypes": ["script", "image", "iframe"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "googlesyndication\\.com",
      "resourceTypes": ["script", "image"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "google-analytics\\.com",
      "resourceTypes": ["script", "xmlhttprequest"]
    }
  }
]
```

Privacy Protection {#privacy-protection}

Block trackers and analytics:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "facebook\\.com/tr",
      "resourceTypes": ["image", "script"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "modifyHeaders" },
    "action": {
      "requestHeaders": [
        { "header": "DNT", "operation": "set", "value": "1" }
      ]
    },
    "condition": {
      "urlFilter": ".*",
      "resourceTypes": ["xmlhttprequest", "script"]
    }
  }
]
```

CORS Workaround {#cors-workaround}

Add CORS headers to bypass cross-origin restrictions:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        { "header": "Access-Control-Allow-Origin", "operation": "set", "value": "*" }
      ]
    },
    "condition": {
      "urlFilter": "https://api\\.yourdomain\\.com/.*",
      "resourceTypes": ["xmlhttprequest"]
    }
  }
]
```

Redirect to HTTPS {#redirect-to-https}

Force HTTPS on specific domains:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "upgradeScheme" },
    "condition": {
      "urlFilter": "http://example\\.com",
      "resourceTypes": ["main_frame", "sub_frame"]
    }
  }
]
```

Custom Block Page {#custom-block-page}

Redirect blocked requests to a custom page:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": { "extensionPath": "/blocked.html" }
    },
    "condition": {
      "urlFilter": "||blocked-site.com",
      "resourceTypes": ["main_frame"]
    }
  }
]
```

Limitations and Workarounds {#limitations-and-workarounds}

Cannot Access Request/Response Bodies {#cannot-access-bodies}

Limitation: DNR cannot read or modify HTTP request/response bodies.

Workaround: Use `declarativeNetRequest` for headers only, combine with content scripts for body modification:

```javascript
// In content script - modify page content after load
document.addEventListener('DOMContentLoaded', () => {
  // Use DOM manipulation for content filtering
});
```

Limited to Predefined Actions {#limited-actions}

Limitation: Only supports specific action types (block, redirect, modifyHeaders, etc.)

Workaround: Use redirect to send requests to your extension for processing:

```javascript
// Redirect to extension, handle in service worker
{
  "action": {
    "type": "redirect",
    "redirect": { "extensionPath": "/process-request.html" }
  }
}
```

No Regex Lookbehind {#no-regex-lookbehind}

Limitation: DNR regex doesn't support lookbehind assertions.

Workaround: Use multiple rules or simplify patterns:

```json
[
  { "id": 1, "priority": 1, "action": { "type": "allow" }, "condition": { "urlFilter": "good-domain.com" }},
  { "id": 2, "priority": 2, "action": { "type": "block" }, "condition": { "urlFilter": ".*bad-pattern.*" }}
]
```

Rule Limits {#rule-limits}

Limitation: 30,000 static rules, 30,000 dynamic rules, 1,000 regex rules.

Workarounds:
- Use domain patterns instead of individual URLs
- Use blocklists from trusted sources
- Implement rule sharing between static and dynamic

Session Rules (MV3.2+) {#session-rules}

For temporary rules that don't persist:

```javascript
// Add session rule (cleared on browser restart)
await chrome.declarativeNetRequest.updateSessionRules({
  addRules: [{
    id: 1,
    priority: 1,
    action: { "type": "block" },
    condition: { "urlFilter": "temp-blocked.com" }
  }]
});
```

Migration from webRequest {#migration-from-webrequest}

If you're migrating from MV2's `webRequestBlocking`, here's the pattern conversion:

Blocking Requests {#migration-blocking}

MV2 (webRequest):
```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => ({ cancel: true }),
  { urls: ["*://tracker.example.com/*"] },
  ["blocking"]
);
```

MV3 (declarativeNetRequest):
```json
{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "tracker\\.example\\.com",
    "resourceTypes": ["main_frame", "sub_frame", "script"]
  }
}
```

Redirecting Requests {#migration-redirect}

MV2:
```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => ({ redirectUrl: "https://example.com/blocked.html" }),
  { urls: ["*://ads.example.com/*"] },
  ["blocking"]
);
```

MV3:
```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": { "url": "https://example.com/blocked.html" }
  },
  "condition": {
    "urlFilter": "ads\\.example\\.com"
  }
}
```

Modifying Headers {#migration-headers}

MV2:
```javascript
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    details.requestHeaders.push({ name: "X-Custom-Header", value: "value" });
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);
```

MV3:
```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [
      { "header": "X-Custom-Header", "operation": "set", "value": "value" }
    ]
  },
  "condition": {
    "urlFilter": ".*"
  }
}
```

Dynamic User Rules {#migration-dynamic}

For user-configured rules that were dynamic in MV2:

```javascript
// MV3: Store user rules as dynamic rules
async function addUserBlockedSite(domain) {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const newId = Math.max(0, ...rules.map(r => r.id)) + 1;
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: newId,
      priority: 1,
      action: { "type": "block" },
      condition: {
        urlFilter: domain.replace(/\./g, "\\."),
        resourceTypes: ["main_frame"]
      }
    }]
  });
  
  // Persist to storage for restoration
  await saveToStorage('userBlockedSites', domain);
}
```

Complete Example: Ad Blocker Extension {#complete-example}

manifest.json {#example-manifest}
```json
{
  "manifest_version": 3,
  "name": "Simple Ad Blocker",
  "version": "1.0.0",
  "permissions": ["declarativeNetRequest", "storage"],
  "host_permissions": ["<all_urls>"],
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "default_rules",
        "enabled": true,
        "path": "rules/default-rules.json"
      }
    ]
  },
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

rules/default-rules.json {#example-rules}
```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "doubleclick\\.net",
      "resourceTypes": ["script", "image", "iframe"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "googlesyndication\\.com",
      "resourceTypes": ["script", "image"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "google-analytics\\.com",
      "resourceTypes": ["script", "xmlhttprequest"]
    }
  }
]
```

background.js (Dynamic Rules) {#example-background}
```javascript
// Load user rules from storage on startup
chrome.runtime.onInstalled.addListener(async () => {
  const { userBlockedSites = [] } = await chrome.storage.sync.get('userBlockedSites');
  
  if (userBlockedSites.length > 0) {
    const rules = userBlockedSites.map((domain, index) => ({
      id: 1000 + index,
      priority: 1,
      action: { "type": "block" },
      condition: {
        urlFilter: domain.replace(/\./g, "\\."),
        resourceTypes: ["main_frame", "sub_frame", "script"]
      }
    }));
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addBlockedSite') {
    addBlockedSite(message.domain);
  } else if (message.action === 'removeBlockedSite') {
    removeBlockedSite(message.domain);
  }
});

async function addBlockedSite(domain) {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const newId = Math.max(0, ...rules.map(r => r.id)) + 1;
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: newId,
      priority: 1,
      action: { "type": "block" },
      condition: {
        urlFilter: domain.replace(/\./g, "\\."),
        resourceTypes: ["main_frame", "sub_frame", "script"]
      }
    }]
  });
}

async function removeBlockedSite(domain) {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleToRemove = rules.find(r => 
    r.condition?.urlFilter === domain.replace(/\./g, "\\.")
  );
  
  if (ruleToRemove) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleToRemove.id]
    });
  }
}
```

Summary {#summary}

The Declarative Net Request API is the modern way to block and modify network requests in Chrome extensions:

- Static rules. Predefined in JSON files, perfect for bundled blocklists
- Dynamic rules. Runtime-configurable, ideal for user preferences
- Action types. Block, redirect, modifyHeaders, allow, upgradeScheme
- Rule priorities. Control which rule wins when multiple match
- Migration. Direct patterns from webRequestBlocking to DNR

DNR provides better privacy, performance, and security than the old webRequest API while maintaining most blocking capabilities.

---

Related Articles {#related-articles}

- [Build a Content Blocker Extension](build-content-blocker.html). Step-by-step guide to building a complete ad blocker
- [Build a Site Blocker Extension](build-site-blocker.html). Create a productivity-focused site blocker with scheduling
- [Manifest V3 Migration Guide](mv3/manifest-v3-migration-guide.html). Complete guide to migrating from MV2 to MV3
- [Declarative Net Request API Reference](mv3/declarative-net-request.html). Full API documentation

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
---

Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.