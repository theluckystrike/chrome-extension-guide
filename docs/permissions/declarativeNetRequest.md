# declarativeNetRequest Permission — Chrome Extension Reference

## Overview
- **Permission string**: `"declarativeNetRequest"` or `"declarativeNetRequestWithHostAccess"`
- **What it grants**: Block, redirect, or modify network requests using declarative rules
- **Risk level**: Medium-High — can block/redirect any network traffic
- **MV3 replacement**: This replaces the `webRequestBlocking` API from MV2
- `@theluckystrike/webext-permissions` description: `describePermission('declarativeNetRequest')`
- Cross-ref: `docs/mv3/declarative-net-request.md` for migration guide

## Permission Variants
- `"declarativeNetRequest"` — use rules defined in the manifest (static rulesets)
- `"declarativeNetRequestWithHostAccess"` — required to redirect requests to URLs the extension doesn't have host permissions for
- `"declarativeNetRequestFeedback"` — access to `chrome.declarativeNetRequest.onRuleMatchedDebug` for debugging

## manifest.json Setup
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

## Key APIs

### Static Rules (rules.json)
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
- Loaded at install time — very fast
- Up to 300,000 static rules across all rulesets (shared quota)

### Dynamic Rules
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

### Session Rules
```javascript
chrome.declarativeNetRequest.updateSessionRules({
  addRules: [{ id: 2000, priority: 1, action: { type: "block" }, condition: { urlFilter: "temp.example.com" } }]
});
```
- Only exist for current browser session
- Cleared when browser restarts
- Limit: 5,000 session rules

### Rule Actions
- `"block"` — block the request entirely
- `"redirect"` — redirect to another URL (requires host permissions)
- `"allow"` — allow a request that would otherwise be blocked
- `"allowAllRequests"` — allow all requests in a frame
- `"modifyHeaders"` — add/remove/set request or response headers

### Condition Matching
- `urlFilter`: Pattern matching (`||example.com`, `*tracking*`)
- `regexFilter`: Full regex support (limited to 1000 regex rules)
- `resourceTypes`: `"main_frame"`, `"sub_frame"`, `"script"`, `"image"`, `"xmlhttprequest"`, etc.
- `domains`/`excludedDomains`: Limit which sites trigger the rule
- `requestMethods`: `"get"`, `"post"`, etc.

## Common Patterns

### Ad/Tracker Blocker
- Static rules for known ad domains
- Dynamic rules for user-added blocks
- Store user block list with `@theluckystrike/webext-storage`

### Request Redirect
- Redirect HTTP to HTTPS
- Redirect old URLs to new ones
- Custom error pages

### Header Modification
- Add security headers (CSP, X-Frame-Options)
- Remove tracking headers
- Modify User-Agent for specific sites

## Runtime Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const result = await checkPermission('declarativeNetRequest');
```

## Debugging
- `chrome.declarativeNetRequest.onRuleMatchedDebug` (requires `declarativeNetRequestFeedback` permission)
- `chrome.declarativeNetRequest.getMatchedRules()` — see which rules fired
- `chrome.declarativeNetRequest.getDynamicRules()` — list current dynamic rules

## Limits Summary
| Type | Max Rules |
|------|-----------|
| Static | 300,000 (shared) |
| Dynamic | 30,000 |
| Session | 5,000 |
| Regex | 1,000 |

## Common Errors
- Rule ID conflicts — each rule must have a unique ID
- Invalid `urlFilter` pattern — test patterns carefully
- Missing host permissions for redirects
- Exceeding rule count limits
