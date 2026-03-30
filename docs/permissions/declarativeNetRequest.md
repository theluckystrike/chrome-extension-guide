---
layout: default
title: "declarativeNetRequest Permission. Chrome Extension Reference"
description: ": or : Block, redirect, or modify network requests using declarative rules"
permalink: /permissions/declarativeNetRequest/
category: permissions
order: 13
canonical_url: "https://bestchromeextensions.com/permissions/declarativeNetRequest/"
last_modified_at: 2026-01-15
---

declarativeNetRequest Permission. Chrome Extension Reference

Overview {#overview}
- Permission string: `"declarativeNetRequest"` or `"declarativeNetRequestWithHostAccess"`
- What it grants: Block, redirect, or modify network requests using declarative rules
- Risk level: Medium-High. can block/redirect any network traffic
- MV3 replacement: This replaces the `webRequestBlocking` API from MV2
- `@theluckystrike/webext-permissions` description: `describePermission('declarativeNetRequest')`
- Cross-ref: `docs/mv3/declarative-net-request.md` for migration guide

Permission Variants {#permission-variants}
- `"declarativeNetRequest"`. use rules defined in the manifest (static rulesets)
- `"declarativeNetRequestWithHostAccess"`. required to redirect requests to URLs the extension doesn't have host permissions for
- `"declarativeNetRequestFeedback"`. access to `chrome.declarativeNetRequest.onRuleMatchedDebug` for debugging

manifest.json Setup {#manifestjson-setup}
```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

Key APIs {#key-apis}

Static Rules (rules.json) {#static-rules-rulesjson}
```json
[{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "tracker.example.com",
    "resourceTypes": ["script", "image"]
  }
}]
```
- Defined in JSON files referenced by manifest
- Loaded at install time. very fast
- Up to 300,000 static rules across all rulesets (shared quota)

Dynamic Rules {#dynamic-rules}
```javascript
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1000,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "ads.example.com" }
  }],
  removeRuleIds: [999]
});
```
- Added/removed at runtime
- Persist across extension restarts
- Limit: 30,000 dynamic rules

Session Rules {#session-rules}
```javascript
chrome.declarativeNetRequest.updateSessionRules({
  addRules: [{ id: 2000, priority: 1, action: { type: "block" }, condition: { urlFilter: "temp.example.com" } }]
});
```
- Only exist for current browser session
- Cleared when browser restarts
- Limit: 5,000 session rules

Rule Actions {#rule-actions}
- `"block"`. block the request entirely
- `"redirect"`. redirect to another URL (requires host permissions)
- `"allow"`. allow a request that would otherwise be blocked
- `"allowAllRequests"`. allow all requests in a frame
- `"modifyHeaders"`. add/remove/set request or response headers

Condition Matching {#condition-matching}
- `urlFilter`: Pattern matching (`||example.com`, `*tracking*`)
- `regexFilter`: Full regex support (limited to 1000 regex rules)
- `resourceTypes`: `"main_frame"`, `"sub_frame"`, `"script"`, `"image"`, `"xmlhttprequest"`, etc.
- `domains`/`excludedDomains`: Limit which sites trigger the rule
- `requestMethods`: `"get"`, `"post"`, etc.

Common Patterns {#common-patterns}

Ad/Tracker Blocker {#adtracker-blocker}
- Static rules for known ad domains
- Dynamic rules for user-added blocks
- Store user block list with `@theluckystrike/webext-storage`

Request Redirect {#request-redirect}
- Redirect HTTP to HTTPS
- Redirect old URLs to new ones
- Custom error pages

Header Modification {#header-modification}
- Add security headers (CSP, X-Frame-Options)
- Remove tracking headers
- Modify User-Agent for specific sites

Runtime Permission Check {#runtime-permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const result = await checkPermission('declarativeNetRequest');
```

Debugging {#debugging}
- `chrome.declarativeNetRequest.onRuleMatchedDebug` (requires `declarativeNetRequestFeedback` permission)
- `chrome.declarativeNetRequest.getMatchedRules()`. see which rules fired
- `chrome.declarativeNetRequest.getDynamicRules()`. list current dynamic rules

Limits Summary {#limits-summary}
| Type | Max Rules |
|------|-----------|
| Static | 300,000 (shared) |
| Dynamic | 30,000 |
| Session | 5,000 |
| Regex | 1,000 |

Gotchas {#gotchas}
- Rule IDs must be globally unique. if you use the same ID in both static and dynamic rules, behavior is undefined. Establish a clear ID range convention (e.g., 1-9999 for static, 10000+ for dynamic).
- Regex rules have a hard limit of 1,000. prefer `urlFilter` patterns over `regexFilter` whenever possible. URL filter patterns cover most use cases and don't count against the regex quota.
- Static rules cannot be modified at runtime. they are baked into the extension package. Use `updateEnabledRulesets()` to toggle entire rulesets on/off, or use dynamic rules for user-configurable blocking.

Common Errors {#common-errors}
- Rule ID conflicts. each rule must have a unique ID
- Invalid `urlFilter` pattern. test patterns carefully
- Missing host permissions for redirects
- Exceeding rule count limits

Related Permissions {#related-permissions}
- [webRequest](webRequest.md). read-only network observation (MV3)
- [activeTab](activeTab.md). temporary host access for per-tab rules

API Reference {#api-reference}
- [Chrome declarativeNetRequest API docs](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)

Frequently Asked Questions

What is declarativeNetRequest used for?
declarativeNetRequest allows extensions to block or modify network requests declaratively (without seeing the request content), which is required in Manifest V3.

Is declarativeNetRequest free to use?
Yes, the declarativeNetRequest API is free and doesn't require any special approval, though there are ruleset size limits.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
