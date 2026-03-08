---
layout: default
title: "Chrome Extension Declarative Net Request — Manifest V3 Guide"
description: "Use Declarative Net Request API for network request filtering in Manifest V3."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/mv3/declarative-net-request/"
---

# Declarative Net Request (DNR)

> The Declarative Net Request API is the MV3 replacement for the deprecated `webRequestBlocking` API.

## Overview {#overview}

In Manifest V2 (MV2), extensions could use `webRequestBlocking` to intercept and modify network requests in real-time. However, this API presented significant performance and privacy concerns because:

- It required access to raw network data
- It blocked threads while processing requests
- It had unlimited access to request/response bodies

**In Manifest V3 (MV3), `webRequestBlocking` is completely removed.** Instead, extensions use the **Declarative Net Request** API, which allows Chrome to handle network requests based on predefined rules without exposing raw request data to extensions.

With DNR, you declare rules that tell Chrome how to handle requests, and Chrome executes these rules internally. This provides better privacy, performance, and security.

## MV2 vs MV3 Comparison {#mv2-vs-mv3-comparison}

| Feature | MV2 (webRequest) | MV3 (Declarative Net Request) |
|---------|------------------|------------------------------|
| **Block requests** | ✅ `webRequestBlocking` | ✅ `declarativeNetRequest` |
| **Modify headers** | ✅ `webRequestBlocking` | ✅ `modifyHeaders` action |
| **Redirect requests** | ✅ `webRequestBlocking` | ✅ `redirect` action |
| **Access request body** | ✅ Yes | ❌ No |
| **Access response body** | ✅ Yes | ❌ No |
| **Non-blocking execution** | ❌ Blocks thread | ✅ Declarative, async |
| **Rule updates** | Requires reload | Dynamic rules at runtime |

## Manifest Configuration {#manifest-configuration}

To use Declarative Net Request, you need to add the appropriate permissions and configuration to your `manifest.json`.

### Required Permissions {#required-permissions}

```json
{
  "permissions": [
    "declarativeNetRequest"
  ]
}
```

### Feedback Permission (Optional) {#feedback-permission-optional}

If you need to know which rules were matched (for logging or user feedback):

```json
{
  "permissions": [
    "declarativeNetRequestFeedback"
  ]
}
```

### Static Rules Configuration {#static-rules-configuration}

Static rules are defined in a JSON file and bundled with the extension:

```json
{
  "permissions": [
    "declarativeNetRequest"
  ],
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "ruleset_1",
        "enabled": true,
        "path": "rules/block-trackers.json"
      }
    ]
  }
}
```

### Dynamic Rules {#dynamic-rules}

Dynamic rules can be added or modified at runtime by the extension:

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

> **Note:** Dynamic rules don't require any manifest configuration—they're managed entirely through the API.

## Rule Structure {#rule-structure}

Rules are defined in JSON format with the following structure:

```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "block"
  },
  "condition": {
    "urlFilter": "tracker.example.com",
    "resourceTypes": ["script"]
  }
}
```

### Key Properties {#key-properties}

| Property | Type | Description |
|----------|------|-------------|
| `id` | integer | Unique rule identifier (1+) |
| `priority` | integer | Rule priority (higher = evaluated first) |
| `action` | object | What to do when matched |
| `condition` | object | Matching conditions |

### Condition Properties {#condition-properties}

| Property | Type | Description |
|----------|------|-------------|
| `urlFilter` | string | Filter pattern to match URLs (uses special syntax with `*`, `\|`, `\|\|`, `^` operators -- not regex) |
| `regexFilter` | string | Alternative regex pattern |
| `resourceTypes` | array | Types: `main_frame`, `sub_frame`, `stylesheet`, `script`, `image`, `font`, `object`, `xmlhttprequest`, `ping`, `csp_report`, `media`, `websocket`, `webtransport`, `webbundle`, `other` |
| `initiatorDomains` | array | Domains that initiated the request |
| `requestDomains` | array | Domains being requested |
| `excludedInitiatorDomains` | array | Initiator domains to exclude |
| `excludedRequestDomains` | array | Request domains to exclude |
| `tabIds` | array | Specific tab IDs to match |
| `excludeTabIds` | array | Tab IDs to exclude |

## Action Types {#action-types}

The `action.type` property determines what happens when a rule matches:

| Action Type | Description | Available in MV3 |
|-------------|-------------|------------------|
| `block` | Block the request entirely | ✅ |
| `allow` | Allow the request (取消阻止) | ✅ |
| `redirect` | Redirect to a different URL | ✅ |
| `upgradeScheme` | Upgrade HTTP to HTTPS | ✅ |
| `modifyHeaders` | Add, remove, or modify request/response headers | ✅ |
| `allowAllRequests` | Allow all requests in a frame hierarchy | ✅ |

### Example: Block Action {#example-block-action}

```json
{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "tracker.example.com",
    "resourceTypes": ["script", "image"]
  }
}
```

### Example: Redirect Action {#example-redirect-action}

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

## Static Rules File Example {#static-rules-file-example}

Create a rules file at `rules/block-trackers.json`:

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "google-analytics\\.com",
      "resourceTypes": ["script", "xmlhttprequest"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "doubleclick\\.net",
      "resourceTypes": ["script", "image", "sub_frame"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": { "url": "https://example.com/blocked.png" }
    },
    "condition": {
      "urlFilter": "advertisement\\.com",
      "resourceTypes": ["image"]
    }
  },
  {
    "id": 4,
    "priority": 1,
    "action": { "type": "upgradeScheme" },
    "condition": {
      "urlFilter": "http://insecure-example\\.com",
      "resourceTypes": ["main_frame"]
    }
  },
  {
    "id": 5,
    "priority": 1,
    "action": { "type": "allow" },
    "condition": {
      "urlFilter": "google-analytics\\.com/collect",
      "resourceTypes": ["xmlhttprequest"]
    }
  }
]
```

## Dynamic Rules (Runtime) {#dynamic-rules-runtime}

Static rules are compiled with your extension, but dynamic rules can be added, updated, or removed at runtime. This is useful for user-configurable blocking lists.

### Adding Dynamic Rules {#adding-dynamic-rules}

```typescript
import { chromeStorage } from "@theluckystrike/webext-storage";

// Define your blocking rules
const blockedDomains = [
  "tracker.example.com",
  "ads.example.net"
];

async function updateBlockingRules(domains: string[]) {
  const rules = domains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: domain.replace(/\./g, "\\."),
      resourceTypes: ["script", "image", "xmlhttprequest"]
    }
  }));

  // Get existing dynamic rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map(r => r.id);

  // Update with new rules (remove old, add new)
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: rules
  });

  console.log(`Updated blocking rules: ${domains.length} domains`);
}

// Usage
updateBlockingRules(blockedDomains);
```

### Retrieving Dynamic Rules {#retrieving-dynamic-rules}

```typescript
async function getCurrentBlockingRules() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  
  return rules.map(rule => ({
    id: rule.id,
    domain: rule.condition?.urlFilter,
    action: rule.action.type
  }));
}

// Usage
getCurrentBlockingRules().then(rules => {
  console.log("Current blocking rules:", rules);
});
```

### Getting Matched Rules (with Feedback Permission) {#getting-matched-rules-with-feedback-permission}

If you have the `declarativeNetRequestFeedback` permission, you can track which rules matched:

```typescript
// Enable matched rules callback in manifest
// "permissions": ["declarativeNetRequestFeedback"]

chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  console.log("Rule matched:", {
    ruleId: info.rule.ruleId,
    url: info.request.url,
    type: info.request.type
  });
});
```

## Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

The `@theluckystrike/webext-permissions` library provides type-safe permission checking for Declarative Net Request:

```typescript
import { checkPermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

// Check if the extension has DNR permission
const hasDNR = await checkPermission("declarativeNetRequest");

// Get permission description
console.log(PERMISSION_DESCRIPTIONS.declarativeNetRequest); 
// Output: "Block or modify network requests"

// Check multiple permissions
const permissions = await checkPermission([
  "declarativeNetRequest",
  "storage"
]);

if (permissions.declarativeNetRequest) {
  console.log("DNR is available!");
}
```

### Permission Descriptions {#permission-descriptions}

| Permission | Description |
|------------|-------------|
| `declarativeNetRequest` | Block or modify network requests |
| `declarativeNetRequestFeedback` | Receive feedback on matched rules |

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

For communication between popup/options pages and the background script when managing blocking rules:

```typescript
import { createMessenger, MessageTypes } from "@theluckystrike/webext-messaging";

// Define message types for DNR operations
interface DNRMessage {
  type: "UPDATE_RULES";
  payload: {
    domains: string[];
    action: "block" | "allow";
  };
}

// Create messenger for background script
const backgroundMessenger = createMessenger<DNRMessage>({
  name: "dnr-background"
});

// Handle messages in background
backgroundMessenger.handle("UPDATE_RULES", async ({ payload }) => {
  const rules = payload.domains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: payload.action },
    condition: {
      urlFilter: domain.replace(/\./g, "\\."),
      resourceTypes: ["script", "xmlhttprequest"]
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules
  });

  return { success: true, count: rules.length };
});

// In popup or options page
const messenger = createMessenger<DNRMessage>({
  name: "dnr-popup"
});

async function updateBlockingList(domains: string[]) {
  const response = await messenger.send("UPDATE_RULES", {
    domains,
    action: "block"
  });
  
  console.log(`Blocked ${response.count} domains`);
}
```

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Persist user-configured blocking rules using `@theluckystrike/webext-storage`:

```typescript
import { chromeStorage } from "@theluckystrike/webext-storage";

// Define storage schema
interface BlockingConfig {
  blockedDomains: string[];
  enabled: boolean;
}

const defaultConfig: BlockingConfig = {
  blockedDomains: [],
  enabled: true
};

// Initialize storage
const storage = chromeStorage<BlockingConfig>("blocking-config", defaultConfig);

// Load and apply saved rules
async function loadSavedRules() {
  const config = await storage.get();
  
  if (config.enabled && config.blockedDomains.length > 0) {
    const rules = config.blockedDomains.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: "block" },
      condition: {
        urlFilter: domain.replace(/\./g, "\\."),
        resourceTypes: ["script", "image", "xmlhttprequest"]
      }
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });

    console.log(`Loaded ${rules.length} blocking rules from storage`);
  }
}

// Save new rules
async function saveAndApplyRules(domains: string[]) {
  await storage.set({
    blockedDomains: domains,
    enabled: true
  });

  // Apply rules
  const rules = domains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: domain.replace(/\./g, "\\."),
      resourceTypes: ["script", "image", "xmlhttprequest"]
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules
  });
}
```

## Rule Limits {#rule-limits}

Each extension has limits on the number of rules it can declare:

| Rule Type | Limit | Description |
|-----------|-------|-------------|
| **Static Rules** | 30,000 (guaranteed minimum) | Defined in JSON files, bundled with extension (up to 100 rulesets, 50 enabled at once) |
| **Dynamic Rules** | 30,000 | Added/removed at runtime |
| **Session Rules** | 5,000 | Temporary rules for current session |
| **Regex Rules** | 1,000 | Rules using `regexFilter` |

### Checking Available Rules {#checking-available-rules}

```typescript
async function checkRuleLimits() {
  const count = await chrome.declarativeNetRequest.getAvailableStaticRuleCount();

  console.log(`Available static rules: ${count}`);
}

// Get all rule counts
async function getAllRuleCounts() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  console.log(`Current dynamic rules: ${rules.length}/30,000`);
}
```

## Header Modification Example {#header-modification-example}

The `modifyHeaders` action type allows you to add, remove, or modify HTTP headers:

```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [
      { "header": "User-Agent", "operation": "set", "value": "Mozilla/5.0 (compatible; MyExtension/1.0)" },
      { "header": "X-Custom-Header", "operation": "set", "value": "MyValue" }
    ],
    "responseHeaders": [
      { "header": "X-Tracker", "operation": "remove" },
      { "header": "Cache-Control", "operation": "set", "value": "no-store" }
    ]
  },
  "condition": {
    "urlFilter": "api\\.example\\.com",
    "resourceTypes": ["xmlhttprequest"]
  }
}
```

### Header Operations {#header-operations}

| Operation | Description |
|-----------|-------------|
| `set` | Set header value (add if not exists, replace if exists) |
| `append` | Append to existing header value |
| `remove` | Remove header entirely |

### Programmatic Header Modification {#programmatic-header-modification}

```typescript
async function addCustomHeaders() {
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Accept-Language", operation: "set", value: "en-US,en;q=0.9" }
        ]
      },
      condition: {
        urlFilter: ".*",
        resourceTypes: ["xmlhttprequest"]
      }
    }
  ];

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules
  });
}
```

## Migration from webRequestBlocking {#migration-from-webrequestblocking}

Migrating from MV2's `webRequestBlocking` to MV3's Declarative Net Request requires restructuring how your extension handles network requests.

### Step 1: Remove MV2 Permissions {#step-1-remove-mv2-permissions}

**Before (manifest.json - MV2):**
```json
{
  "permissions": [
    "webRequestBlocking",
    "webRequest"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

**After (manifest.json - MV3):**
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

### Step 2: Convert Blocking Rules {#step-2-convert-blocking-rules}

**Before (MV2 background.js):**
```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    return { cancel: true };
  },
  {
    urls: ["*://tracker.example.com/*"],
    types: ["script", "image"]
  },
  ["blocking"]
);
```

**After (MV3):**

Create `rules/block-trackers.json`:
```json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "tracker\\.example\\.com",
      "resourceTypes": ["script", "image"]
    }
  }
]
```

Update `manifest.json`:
```json
{
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "block_trackers",
        "enabled": true,
        "path": "rules/block-trackers.json"
      }
    ]
  }
}
```

### Step 3: Convert Header Modifications {#step-3-convert-header-modifications}

**Before (MV2):**
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

**After (MV3):**
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
    "urlFilter": ".*",
    "resourceTypes": ["xmlhttprequest", "main_frame"]
  }
}
```

### Step 4: Convert Redirects {#step-4-convert-redirects}

**Before (MV2):**
```javascript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    return { redirectUrl: "https://example.com/blocked.html" };
  },
  {
    urls: ["*://ads.example.com/*"]
  },
  ["blocking"]
);
```

**After (MV3):**
```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": {
      "url": "https://example.com/blocked.html"
    }
  },
  "condition": {
    "urlFilter": "ads\\.example\\.com",
    "resourceTypes": ["main_frame", "sub_frame"]
  }
}
```

### Step 5: Use Dynamic Rules for User Configuration {#step-5-use-dynamic-rules-for-user-configuration}

If your MV2 extension allowed users to add custom blocking rules, migrate to dynamic rules:

```typescript
// MV3: Dynamic rules for user-configured blocklist
async function addUserRule(url: string) {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const newId = Math.max(0, ...rules.map(r => r.id)) + 1;

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: newId,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: url.replace(/\./g, "\\."),
          resourceTypes: ["script", "image", "xmlhttprequest"]
        }
      }
    ]
  });
}
```

## Summary {#summary}

Declarative Net Request replaces `webRequestBlocking` entirely in Manifest V3:

- ✅ **Block requests** — Full support
- ✅ **Redirect requests** — Full support  
- ✅ **Modify headers** — Full support
- ✅ **Upgrade to HTTPS** — Built-in action type
- ✅ **Dynamic rules** — Runtime rule management
- ✅ **Better performance** — No thread blocking
- ✅ **Better privacy** — No raw request data exposure

Use static rules for pre-defined blocking lists bundled with your extension, and dynamic rules for user-configurable features.
