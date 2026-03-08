---
title: "declarativeNetRequestFeedback Permission — Chrome Extension Reference"
description: ": : Access to event for debugging rule matches"
permalink: /permissions/declarativeNetRequestFeedback/
category: permissions
order: 14
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/declarativeNetRequestFeedback/"
---

# declarativeNetRequestFeedback Permission — Chrome Extension Reference

## Overview {#overview}
- **Permission string**: `"declarativeNetRequestFeedback"`
- **What it grants**: Access to `chrome.declarativeNetRequest.onRuleMatchedDebug` event for debugging rule matches
- **Risk level**: Low — read-only feedback API, does not modify requests
- **User warning**: No user warning at install time (requires `declarativeNetRequest` permission first)
- **@theluckystrike/webext-permissions** description: `describePermission('declarativeNetRequestFeedback')`
- Cross-ref: `docs/permissions/declarativeNetRequest.md`, `docs/mv3/declarative-net-request.md`

## Permission Relationship {#permission-relationship}
The `declarativeNetRequestFeedback` permission is an **addon** to the base `declarativeNetRequest` permission:

| Permission | What it enables |
|------------|----------------|
| `declarativeNetRequest` | Define and use declarative rules to block/redirect/modify requests |
| `declarativeNetRequestWithHostAccess` | Same as above + can redirect to URLs the extension doesn't have host permissions for |
| `declarativeNetRequestFeedback` | Read-only feedback on which rules matched (requires base DNR permission) |

## manifest.json Setup {#manifestjson-setup}
```json
{
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestFeedback"
  ]
}
```
> **Note**: You must include `declarativeNetRequest` as well — `declarativeNetRequestFeedback` alone doesn't grant rule capabilities.

## API: onRuleMatchedDebug {#api-onrulematcheddebug}

The `onRuleMatchedDebug` event fires whenever a DNR rule matches a network request. This is useful for debugging and analytics.

### Basic Usage {#basic-usage}

### onRuleMatchedDebug Basic Usage
```typescript
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  console.log("Rule matched:", {
    ruleId: info.rule.ruleId,
    rulesetId: info.rule.rulesetId,
    requestId: info.request.requestId,
    url: info.request.url,
    method: info.request.method,
    type: info.request.type,
    tabId: info.request.tabId,
    frameId: info.request.frameId
  });
});
```

### MatchedRuleInfo Properties {#matchedruleinfo-properties}

| Property | Type | Description |
|----------|------|-------------|
| `rule.ruleId` | number | ID of the matched rule |
| `rule.rulesetId` | string | ID of the ruleset containing the rule |
| `request.requestId` | string | Unique identifier for the request |
| `request.tabId` | number | ID of the tab that initiated the request |
| `request.frameId` | number | ID of the frame that initiated the request |
| `request.url` | string | URL of the request |
| `request.method` | string | HTTP method (GET, POST, etc.) |
| `request.type` | string | Resource type (script, image, xmlhttprequest, etc.) |

## Use Cases {#use-cases}

### Debugging Which Rules Fired {#debugging-which-rules-fired}
- Verify that specific rules are matching as expected
- Test new rule patterns before deploying
- Troubleshoot why requests aren't being blocked/redirected

### Rule Testing {#rule-testing}
- Validate rule conditions during development
- Check priority interactions between rules
- Test regex patterns in `urlFilter`

### Rule Analytics {#rule-analytics}
- Track which blocking rules are most active
- Build a dashboard showing blocked requests
- Log patterns for analysis (use sparingly due to performance cost)

## Performance Considerations {#performance-considerations}

> **Important**: `onRuleMatchedDebug` is intended for **development and debugging only**. It has significant performance overhead:

- The event fires for **every matched rule** on **every request**
- Synchronous callback execution can impact extension and browser performance
- Not suitable for production use in extensions with high traffic
- Consider using `chrome.declarativeNetRequest.getMatchedRules()` instead for periodic analysis

### Best Practice for Production {#best-practice-for-production}
```typescript
// Instead of always listening, query matched rules periodically
async function getMatchedRulesAnalysis() {
  const rules = await chrome.declarativeNetRequest.getMatchedRules();
  
  // Process rules array for analytics
  return rules.map(r => ({
    ruleId: r.rule.ruleId,
    url: r.request.url,
    type: r.request.type
  }));
}
```

## Runtime Permission Check {#runtime-permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';

const result = await checkPermission('declarativeNetRequestFeedback');
// Returns true if permission is granted
```

## Common Errors {#common-errors}
- **"Permission 'declarativeNetRequestFeedback' is not supported"** — Make sure you also declare `declarativeNetRequest` in permissions
- **No events firing** — Verify the extension has active rules that could match requests

## Related Permissions {#related-permissions}
- [declarativeNetRequest](declarativeNetRequest.md) — Base DNR permission for rule definition
- [webRequest](webRequest.md) — Read-only network observation (MV3)
- [activeTab](activeTab.md) — Temporary host access for per-tab rules

## API Reference {#api-reference}
- [Chrome declarativeNetRequest API docs](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Chrome onRuleMatchedDebug documentation](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#event-onRuleMatchedDebug)

## Frequently Asked Questions

### How do I get feedback on blocked requests?
Add "declarativeNetRequestFeedback" permission to receive onRuleMatchedDebug events showing which rules matched for each request.

### Can I see which ads are being blocked?
Yes, with declarativeNetRequestFeedback, you can log or display statistics about matched rules and blocked requests.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
