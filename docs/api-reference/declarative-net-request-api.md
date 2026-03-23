---
layout: default
title: "Chrome Declarative Net Request API Complete Reference"
description: "The Chrome Declarative Net Request API blocks, redirects, and modifies network requests using declarative rules, replacing webRequest blocking in Manifest V3 with privacy-preserving performance."
canonical_url: "https://bestchromeextensions.com/api-reference/declarative-net-request-api/"
---

# Chrome Declarative Net Request API Reference

The `chrome.declarativeNetRequest` API lets you block, redirect, and modify network requests using declarative rules. It is the MV3 replacement for the `chrome.webRequest` blocking API and is designed to be performant and privacy-preserving -- the browser evaluates rules without exposing request details to the extension.

Permissions {#permissions}

```json
{
  "permissions": ["declarativeNetRequest"]
}
```

Use `declarativeNetRequestWithHostAccess` instead if you need rules that depend on host permissions (for example, redirecting to an extension page requires host access to the original URL).

Add `declarativeNetRequestFeedback` to use `getMatchedRules` for debugging:

```json
{
  "permissions": ["declarativeNetRequest", "declarativeNetRequestFeedback"]
}
```

Rule Sources {#rule-sources}

Chrome supports three rule sources, each with different lifetimes and quota limits.

| Source | Defined In | Persists | Max Rules | Use Case |
|--------|-----------|----------|-----------|----------|
| Static | `rule_resources` in manifest | Always (bundled) | 30,000 guaranteed per extension (shared global pool) | Stable block/allow lists |
| Dynamic | `updateDynamicRules()` | Across sessions | 30,000 | User-configurable rules |
| Session | `updateSessionRules()` | Current session only | 5,000 | Temporary rules, debugging |

Static rules in the manifest {#static-rules-in-the-manifest}

```json
{
  "declarative_net_request": {
    "rule_resources": [
      { "id": "block_ads", "enabled": true, "path": "rules/ads.json" },
      { "id": "block_trackers", "enabled": false, "path": "rules/trackers.json" }
    ]
  }
}
```

Static rulesets can be enabled or disabled at runtime with `updateEnabledRulesets()`, but the rules themselves cannot be modified.

---

Rule Structure {#rule-structure}

```ts
interface Rule {
  id: number;              // Unique within its source (static/dynamic/session)
  priority?: number;       // Default: 1. Higher number = higher priority.
  action: RuleAction;
  condition: RuleCondition;
}
```

RuleAction {#ruleaction}

```ts
interface RuleAction {
  type: "block" | "redirect" | "allow" | "upgradeScheme"
      | "modifyHeaders" | "allowAllRequests";
  redirect?: {
    url?: string;               // Absolute redirect URL
    extensionPath?: string;     // Path within the extension (e.g., "/blocked.html")
    regexSubstitution?: string; // Substitution using capture groups from regexFilter
    transform?: URLTransform;   // Modify parts of the URL
  };
  requestHeaders?: ModifyHeaderInfo[];   // For modifyHeaders
  responseHeaders?: ModifyHeaderInfo[];  // For modifyHeaders
}

interface ModifyHeaderInfo {
  header: string;
  operation: "append" | "set" | "remove";
  value?: string;  // Required for "append" and "set"
}
```

RuleCondition {#rulecondition}

```ts
interface RuleCondition {
  urlFilter?: string;           // Match pattern with wildcards (* and |)
  regexFilter?: string;         // RE2 regular expression (mutually exclusive with urlFilter)
  resourceTypes?: ResourceType[];
  excludedResourceTypes?: ResourceType[];
  initiatorDomains?: string[];
  excludedInitiatorDomains?: string[];
  requestDomains?: string[];
  excludedRequestDomains?: string[];
  requestMethods?: string[];         // "get", "post", "put", etc.
  excludedRequestMethods?: string[];
  domainType?: "firstParty" | "thirdParty";
  isUrlFilterCaseSensitive?: boolean;   // Default: false
  tabIds?: number[];
  excludedTabIds?: number[];
}

type ResourceType =
  | "main_frame" | "sub_frame" | "stylesheet" | "script"
  | "image" | "font" | "object" | "xmlhttprequest" | "ping"
  | "csp_report" | "media" | "websocket" | "webtransport"
  | "webbundle" | "other";
```

urlFilter Syntax {#urlfilter-syntax}

| Pattern | Meaning |
|---------|---------|
| `*` | Matches any sequence of characters |
| `\|` at start | Anchor to the start of the URL |
| `\|\|` | Anchor to a domain (matches any scheme + subdomains) |
| `\|` at end | Anchor to the end of the URL |
| `^` | Separator character (anything except alphanumeric, `_`, `-`, `.`, `%`) |

Examples:

| urlFilter | Matches | Does Not Match |
|-----------|---------|----------------|
| `"ads"` | `https://example.com/ads/banner.js` | `https://example.com/badges` |
| `"\|\|ads.example.com"` | `https://ads.example.com/anything` | `https://example.com/ads` |
| `"\|https://example.com/api"` | `https://example.com/api/data` | `http://example.com/api` |
| `"tracking^"` | `https://x.com/tracking?id=1` | `https://x.com/trackingpixel` |

---

Action Types {#action-types}

block {#block}

Cancels the request. The browser shows a network error.

```json
{
  "id": 1, "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "||ads.example.com",
    "resourceTypes": ["script", "image", "xmlhttprequest"]
  }
}
```

redirect {#redirect}

Redirects the request to a different URL, an extension page, or a transformed URL.

```json
{
  "id": 2, "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": { "extensionPath": "/blocked.html" }
  },
  "condition": {
    "urlFilter": "||malware-site.com",
    "resourceTypes": ["main_frame"]
  }
}
```

allow {#allow}

Allows a request that would otherwise be blocked by a lower-priority rule.

```json
{
  "id": 10, "priority": 5,
  "action": { "type": "allow" },
  "condition": {
    "urlFilter": "||cdn.example.com/safe-script.js",
    "resourceTypes": ["script"]
  }
}
```

allowAllRequests {#allowallrequests}

Allows all requests originating from a matching main_frame or sub_frame. Used to allowlist entire pages.

```json
{
  "id": 11, "priority": 10,
  "action": { "type": "allowAllRequests" },
  "condition": { "urlFilter": "||trusted-site.com", "resourceTypes": ["main_frame"] }
}
```

upgradeScheme {#upgradescheme}

Upgrades the URL from `http://` to `https://`.

```json
{
  "id": 20, "priority": 1,
  "action": { "type": "upgradeScheme" },
  "condition": { "urlFilter": "||example.com", "resourceTypes": ["main_frame", "sub_frame"] }
}
```

modifyHeaders {#modifyheaders}

Adds, sets, or removes request and response headers.

```json
{
  "id": 30, "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [{ "header": "Cookie", "operation": "remove" }],
    "responseHeaders": [
      { "header": "X-Frame-Options", "operation": "remove" },
      { "header": "Access-Control-Allow-Origin", "operation": "set", "value": "*" }
    ]
  },
  "condition": { "urlFilter": "||api.example.com", "resourceTypes": ["xmlhttprequest"] }
}
```

---

Rule Priority and Evaluation Order {#rule-priority-and-evaluation-order}

When multiple rules match the same request:

1. Higher `priority` number wins. A rule with priority 5 beats priority 1.
2. At equal priority, action type determines the winner: `allow` / `allowAllRequests` > `block` > `upgradeScheme` > `redirect`.
3. `modifyHeaders` rules do not conflict with other action types. All matching `modifyHeaders` rules are applied together.
4. Among rule sources at equal priority, static, dynamic, and session rules are all evaluated; the highest priority across all sources wins.

---

Methods {#methods}

chrome.declarativeNetRequest.updateDynamicRules(options) {#chromedeclarativenetrequestupdatedynamicrulesoptions}

Adds or removes dynamic rules. Dynamic rules persist across browser sessions.

```ts
function updateDynamicRules(options: {
  addRules?: Rule[];
  removeRuleIds?: number[];
}): Promise<void>;
```

```ts
await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1, priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "||ads.example.com", resourceTypes: ["script", "image"] },
  }],
});

// Replace a rule (remove then add in one call)
await chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1],
  addRules: [{
    id: 1, priority: 2,
    action: { type: "block" },
    condition: { urlFilter: "||ads.example.com", resourceTypes: ["script", "image", "xmlhttprequest"] },
  }],
});
```

chrome.declarativeNetRequest.updateSessionRules(options) {#chromedeclarativenetrequestupdatesessionrulesoptions}

Same interface as `updateDynamicRules`, but session rules do not persist across browser restarts.

```ts
function updateSessionRules(options: {
  addRules?: Rule[];
  removeRuleIds?: number[];
}): Promise<void>;
```

chrome.declarativeNetRequest.getDynamicRules(filter?) {#chromedeclarativenetrequestgetdynamicrulesfilter}

```ts
function getDynamicRules(filter?: { ruleIds?: number[] }): Promise<Rule[]>;
```

```ts
const allDynamic = await chrome.declarativeNetRequest.getDynamicRules();
const specific = await chrome.declarativeNetRequest.getDynamicRules({ ruleIds: [1, 2] });
```

chrome.declarativeNetRequest.getSessionRules(filter?) {#chromedeclarativenetrequestgetsessionrulesfilter}

```ts
function getSessionRules(filter?: { ruleIds?: number[] }): Promise<Rule[]>;
```

chrome.declarativeNetRequest.updateEnabledRulesets(options) {#chromedeclarativenetrequestupdateenabledrulesetsoptions}

Enables or disables static rulesets defined in the manifest.

```ts
function updateEnabledRulesets(options: {
  enableRulesetIds?: string[];
  disableRulesetIds?: string[];
}): Promise<void>;
```

```ts
await chrome.declarativeNetRequest.updateEnabledRulesets({
  enableRulesetIds: ["block_trackers"],
});
```

chrome.declarativeNetRequest.getEnabledRulesets() {#chromedeclarativenetrequestgetenabledrulesets}

```ts
function getEnabledRulesets(): Promise<string[]>;
```

chrome.declarativeNetRequest.getMatchedRules(filter?) {#chromedeclarativenetrequestgetmatchedrulesfilter}

Returns rules that matched recent requests. Requires `declarativeNetRequestFeedback`.

```ts
function getMatchedRules(filter?: {
  tabId?: number;
  minTimeStamp?: number;
}): Promise<{ rulesMatchedInfo: MatchedRuleInfo[] }>;

interface MatchedRuleInfo {
  rule: { ruleId: number; rulesetId: string };
  timeStamp: number;
  tabId: number;
}
```

```ts
const { rulesMatchedInfo } = await chrome.declarativeNetRequest.getMatchedRules({
  tabId: tab.id,
});
for (const info of rulesMatchedInfo) {
  console.log(`Rule ${info.rule.ruleId} from ${info.rule.rulesetId}`);
}
```

---

Quota Limits {#quota-limits}

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_NUMBER_OF_STATIC_RULESETS` | 100 | Max rulesets in the manifest |
| `MAX_NUMBER_OF_ENABLED_STATIC_RULESETS` | 50 | Max rulesets enabled at once |
| `GUARANTEED_MINIMUM_STATIC_RULES` | 30,000 | Min static rules guaranteed per extension |
| `MAX_NUMBER_OF_DYNAMIC_RULES` | 30,000 | Dynamic rules limit |
| `MAX_NUMBER_OF_SESSION_RULES` | 5,000 | Session rules limit |
| `MAX_NUMBER_OF_REGEX_RULES` | 1,000 | Regex rules across all sources |

```ts
const available = await chrome.declarativeNetRequest.getAvailableStaticRuleCount();
console.log(`Can still add ${available} static rules`);
```

---

Full Examples {#full-examples}

Ad Blocker (static rules) {#ad-blocker-static-rules}

`rules/ads.json`:

```json
[
  {
    "id": 1, "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": "||doubleclick.net", "resourceTypes": ["script", "image", "xmlhttprequest", "sub_frame"] }
  },
  {
    "id": 2, "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": "||googlesyndication.com", "resourceTypes": ["script", "image", "xmlhttprequest", "sub_frame"] }
  },
  {
    "id": 3, "priority": 5,
    "action": { "type": "allow" },
    "condition": { "urlFilter": "||googlesyndication.com/safeframe", "resourceTypes": ["sub_frame"] }
  }
]
```

CORS Fixer (dynamic rules) {#cors-fixer-dynamic-rules}

```ts
await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1, priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
        { header: "Access-Control-Allow-Methods", operation: "set", value: "GET, POST, PUT, DELETE, OPTIONS" },
        { header: "Access-Control-Allow-Headers", operation: "set", value: "Content-Type, Authorization" },
      ],
    },
    condition: { urlFilter: "||api.example.com", resourceTypes: ["xmlhttprequest"] },
  }],
});
```

Redirect Manager (dynamic rules) {#redirect-manager-dynamic-rules}

```ts
async function addRedirect(from: string, to: string) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const nextId = existing.length > 0
    ? Math.max(...existing.map((r) => r.id)) + 1
    : 1;

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: nextId, priority: 1,
      action: { type: "redirect", redirect: { url: to } },
      condition: { urlFilter: from, resourceTypes: ["main_frame"] },
    }],
  });
}

await addRedirect("||old-site.com", "https://new-site.com");
```

Header Modifier (session rules) {#header-modifier-session-rules}

```ts
await chrome.declarativeNetRequest.updateSessionRules({
  addRules: [{
    id: 1, priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "X-Custom-Auth", operation: "set", value: "Bearer dev-token" },
        { header: "X-Debug", operation: "set", value: "true" },
      ],
    },
    condition: { urlFilter: "||staging-api.example.com", resourceTypes: ["xmlhttprequest"] },
  }],
});
```

---

Gotchas and Limitations {#gotchas-and-limitations}

1. No access to request/response bodies. DNR only operates on URLs, headers, and metadata.
2. No programmatic evaluation. You cannot run JavaScript to decide whether to block. Rules are purely declarative.
3. Regex rules are limited to 1,000 across all sources. Use `urlFilter` whenever possible.
4. `regexFilter` uses RE2 syntax, not JavaScript regex. Lookahead and backreferences are not supported.
5. Redirect rules require host permissions for the original URL when using `declarativeNetRequestWithHostAccess`.
6. Static rules cannot be modified at runtime, only enabled/disabled at the ruleset level.
7. `modifyHeaders` cannot modify `Set-Cookie` response headers on main_frame requests.
8. Rule IDs must be unique within their source (static/dynamic/session), but the same ID can exist in different sources.
9. `allowAllRequests` only works with `main_frame` and `sub_frame` resource types.

See Also {#see-also}

- [Scripting API Reference](scripting-api.md) -- injecting scripts and CSS
- [Tabs API Reference](tabs-api.md) -- querying tabs for rule targeting
- [Permissions Reference](../permissions/host-permissions.md) -- host permission patterns
Frequently Asked Questions

What is declarativeNetRequest API?
This API allows extensions to block or modify network requests using declarative rules, which is required in Manifest V3.

How many rules can I have?
Static rulesets are limited to 30,000 rules. Dynamic rules have no limit but share the total quota.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
