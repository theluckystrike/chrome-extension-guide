# Chrome DeclarativeNetRequest API

## Introduction
- DeclarativeNetRequest (DNR) allows extensions to block or modify network requests declaratively
- **Replaces webRequest blocking** - DNR rules are evaluated in the browser, not in extension JS
- Much better performance than webRequest because rules run natively, not in service worker
- Three rule types: Static (manifest.json), Dynamic (runtime), Session (temporary)
- Requires `"declarativeNetRequest"` permission in manifest.json
- Cross-ref: `docs/permissions/declarative-net-request.md`

## manifest.json Configuration
```json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js" }
}
```

### Declaring Static Rulesets
```json
{
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "default_ruleset",
        "enabled": true,
        "path": "rules/default.json"
      },
      {
        "id": "custom_rules",
        "enabled": false,
        "path": "rules/custom.json"
      }
    ]
  }
}
```

## Rule Structure

### Basic Rule Format
```json
{
  "id": 1,
  "priority": 1,
  "condition": { ... },
  "action": { ... }
}
```
- `id`: Unique integer within a ruleset (required, starts at 1)
- `priority`: Higher = evaluated first (default: 1)
- `condition`: Defines when rule applies
- `action`: What to do when matched

### Condition Object
```json
{
  "urlFilter": "example\\.com",
  "resourceTypes": ["main_frame", "sub_frame", "xmlhttprequest"],
  "requestDomains": ["ads.example.com"],
  "excludedRequestDomains": ["trusted.example.com"],
  "requestMethods": ["get", "post"],
  "excludedRequestMethods": ["connect"],
  "tabIds": [1, 2],
  "excludedTabIds": [3],
  "domainType": "thirdParty"  // "firstParty" | "thirdParty"
}
```
- `urlFilter`: Regex pattern (uses RE2 syntax)
- `regexFilter`: Alternative to urlFilter for more complex patterns (slower)
- `resourceTypes`: Array of resource types to match
- `requestDomains`: Filter by domain (can use wildcard prefix `*.`)
- `requestMethods`: HTTP methods to match

### Action Types

#### block
```json
{
  "id": 1,
  "priority": 1,
  "condition": { "urlFilter": "ads\\." },
  "action": { "type": "block" }
}
```

#### allow
```json
{
  "id": 2,
  "priority": 2,
  "condition": { "urlFilter": ".*" },
  "action": { "type": "allow" }
}
```
- Use higher priority to allow specific URLs that would otherwise be blocked

#### allowAllRequests
```json
{
  "id": 3,
  "priority": 1,
  "condition": { "urlFilter": ".*\\.png$", "resourceTypes": ["image"] },
  "action": { "type": "allowAllRequests" }
}
```
- Allows all requests for a document (main_frame, sub_frame)

#### redirect
```json
{
  "id": 4,
  "priority": 1,
  "condition": { "urlFilter": "ads\\.example\\.com" },
  "action": {
    "type": "redirect",
    "redirect": {
      "url": "https://example.com/placeholder.png"
    }
  }
}
```

#### redirect with extensionPath
```json
{
  "id": 5,
  "priority": 1,
  "condition": { "urlFilter": "blocked\\.example\\.com" },
  "action": {
    "type": "redirect",
    "redirect": { "extensionPath": "/images/blocked.svg" }
  }
}
```

#### redirect with transform
```json
{
  "id": 6,
  "priority": 1,
  "condition": { "urlFilter": "example\\.com/old" },
  "action": {
    "type": "redirect",
    "redirect": {
      "transform": {
        "scheme": "https",
        "host": "new.example.com",
        "path": "/new-path",
        "queryTransform": {
          "addOrReplaceParams": [{ "key": "source", "value": "extension" }]
        }
      }
    }
  }
}
```

#### modifyHeaders
```json
{
  "id": 7,
  "priority": 1,
  "condition": { "urlFilter": "api\\." },
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [
      { "header": "X-Custom-Header", "operation": "set", "value": "value" },
      { "header": "Authorization", "operation": "remove" }
    ],
    "responseHeaders": [
      { "header": "X-Tracker", "operation": "remove" },
      { "header": "Access-Control-Allow-Origin", "operation": "set", "value": "*" }
    ]
  }
}
```
- Header operations: `append`, `set`, `remove`
- `set`: Sets value (creates if doesn't exist)
- `append`: Adds another value (for headers that allow multiple values)
- `remove`: Removes header entirely

## Dynamic Rules

### Adding Dynamic Rules
```javascript
// background.js
const rules = [{
  id: 1001,
  priority: 1,
  condition: { urlFilter: "track\\." },
  action: { type: "block" }
}];

chrome.declarativeNetRequest.updateDynamicRules({
  addRules: rules,
  removeRuleIds: []  // Optional: remove by ID
});
```

### Updating Dynamic Rules
```javascript
// Replace existing rules
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{ id: 1001, priority: 1, condition: { urlFilter: "new\\." }, action: { type: "block" } }],
  removeRuleIds: [1001]
});
```

### Getting Dynamic Rules
```javascript
chrome.declarativeNetRequest.getDynamicRules()
  .then(rules => console.log(rules));
```

## Session Rules

- Session rules are temporary and cleared when the browser session ends
- Use `updateSessionRules` API
- Perfect for feature-gated rules or user toggles
```javascript
chrome.declarativeNetRequest.updateSessionRules({
  addRules: [{ id: 1, priority: 1, condition: { urlFilter: "test\\." }, action: { type: "block" } }],
  removeRuleIds: []
});
```

## Rule Priorities and Matching Order

1. Rules evaluated by priority (highest first)
2. Within same priority: static > dynamic > session
3. First matching rule wins
4. If no action: continue to next rule

### Priority Declaration
```json
{
  "id": 1,
  "priority": 100,  // Higher = more important
  "condition": { ... },
  "action": { ... }
}
```

## Debugging

### getMatchedRules
```javascript
// Get all matched rules (requires declarativeNetRequestFeedback)
chrome.declarativeNetRequest.getMatchedRules()
  .then(result => {
    result.rules.forEach(rule => {
      console.log(rule.ruleId, rule.matchedOn);
    });
  });
```

### onRuleMatchedDebug
```javascript
// Real-time rule matching events (development only)
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  console.log('Rule matched:', info.rule, 'URL:', info.request.url);
});
```
- Only works in unpacked extensions
- Great for testing rule conditions

## Limits and Quotas

### Static Rules
- Maximum: **300,000 rules** per ruleset
- Maximum: **100 rulesets** per extension
- Rules defined in manifest.json at install time

### Dynamic Rules
- Maximum: **30,000 rules** per extension
- Persist across browser sessions

### Session Rules
- Maximum: **5,000 rules** per session
- Cleared on browser restart

### Header Modification
- Maximum: **100 header modifications** per rule

## Migrating from webRequest Blocking

### Before (MV2 webRequest)
```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => ({ cancel: true }),
  { urls: ["*://ads.example.com/*"] },
  ["blocking"]
);
```

### After (MV3 DNR)
```json
[
  {
    "id": 1,
    "priority": 1,
    "condition": { "urlFilter": "ads\\.example\\.com" },
    "action": { "type": "block" }
  }
]
```

### Key Differences
| webRequest Blocking | DeclarativeNetRequest |
|---------------------|----------------------|
| JS in service worker | Native browser evaluation |
| Dynamic updates | Static + dynamic rules |
| Unlimited rules | Quota limits |
| Full request access | Declarative actions only |

## Building an Ad Blocker

### manifest.json
```json
{
  "name": "Ad Blocker",
  "version": "1.0",
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "easylist",
      "enabled": true,
      "path": "rules/easylist.json"
    }]
  }
}
```

### rules/easylist.json
```json
[
  {
    "id": 1,
    "priority": 1,
    "condition": { "urlFilter": "\\.doubleclick\\.net" },
    "action": { "type": "block" }
  },
  {
    "id": 2,
    "priority": 1,
    "condition": { "urlFilter": "pagead2\\.googlesyndication\\.com" },
    "action": { "type": "block" }
  },
  {
    "id": 3,
    "priority": 1,
    "condition": { "urlFilter": ".*", "resourceTypes": ["image"], "requestDomains": ["ads."] },
    "action": { "type": "block" }
  }
]
```

### Dynamic User Rules
```javascript
// Allow user to block custom domains
function addUserBlockRule(domain) {
  const rule = {
    id: Date.now(),
    priority: 1,
    condition: { urlFilter: domain.replace(/\./g, '\\.') },
    action: { type: "block" }
  };
  return chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule]
  });
}
```

## Building a Privacy Extension

### Block Trackers
```javascript
const trackerRules = [
  {
    id: 1,
    priority: 1,
    condition: { urlFilter: "google-analytics\\.com" },
    action: { type: "block" }
  },
  {
    id: 2,
    priority: 1,
    condition: { urlFilter: "facebook\\.com/tr" },
    action: { type: "block" }
  }
];

chrome.declarativeNetRequest.updateDynamicRules({
  addRules: trackerRules
});
```

### Strip Tracking Parameters
```javascript
const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];

const stripParamsRule = {
  id: 100,
  priority: 1,
  condition: { urlFilter: ".*" },
  action: {
    type: "redirect",
    redirect: {
      "transform": {
        "queryTransform": {
          "removeParams": trackingParams
        }
      }
    }
  }
};
```

### Add Security Headers
```javascript
const headerRules = [
  {
    id: 200,
    priority: 1,
    condition: { urlFilter: ".*" },
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "X-Content-Type-Options", "operation": "set", value: "nosniff" },
        { header: "X-Frame-Options", "operation": "set", value: "DENY" }
      ]
    }
  }
];
```

## Filter List Conversion

### EasyList to DNR Rules
AdBlock-style filters need conversion:
```
||example.com^ → { "urlFilter": "example\\.com", "condition": { "domainType": "thirdParty" } }
|https://example.com → { "urlFilter": "https://example\\.com" }
||ads.example.com/* → { "urlFilter": "ads\\.example\\.com/.*" }
```

### Conversion Example
```javascript
function convertFilterToRule(filter) {
  let urlFilter = filter
    .replace(/\^\$/g, '')  // End anchor
    .replace(/^\|\|/g, '')  // Domain anchor
    .replace(/^\|/g, '')    // Start anchor
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\^/g, '.*');  // Any character

  return {
    id: Date.now(),
    priority: 1,
    condition: { urlFilter },
    action: { type: "block" }
  };
}
```

## Best Practices
- Use static rules for permanent rules (loaded from manifest)
- Use dynamic rules for user-configurable blocks
- Use session rules for temporary/toggled features
- Set appropriate priorities - allow rules need higher priority than block
- Test with `onRuleMatchedDebug` in development
- Monitor `getMatchedRules` for rule usage analytics
- Group similar rules to minimize rule count
- Use regex sparingly - urlFilter is faster

## Common Mistakes
- Forgetting host_permissions for URL matching
- Using webRequest patterns instead of DNR urlFilter syntax
- Not accounting for rule priority in complex scenarios
- Exceeding quota limits without handling errors
- Modifying headers that browsers protect (e.g., Content-Length)
- Using session rules for persistent user preferences

## Reference
- Official Docs: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- Sample Extensions: https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/api/declarative-net-request
- EasyList Format: https://help.adblockplus.org/hc/en-us/articles/360062833197
