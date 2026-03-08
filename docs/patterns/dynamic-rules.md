---
layout: default
title: "Chrome Extension Dynamic Rules — Best Practices"
description: "Implement dynamic declarative rules for network filtering."
---

# Dynamic Rules Pattern (declarativeNetRequest)

The `declarativeNetRequest` API provides a powerful way to modify network requests without needing broad host permissions. Dynamic rules allow extensions to add, remove, or modify network rules at runtime, giving users control over blocking, redirecting, and header modifications.

## Overview

Dynamic rules enable extensions to:

- Add or remove network rules at runtime
- Provide user-configurable blocking and redirecting
- Modify request and response headers
- Replace the deprecated `webRequest` blocking API in MV3

This pattern is essential for ad blockers, privacy tools, and any extension that needs flexible network control without requiring extensive permissions.

## Static vs Dynamic vs Session Rules

Understanding the three types of declarativeNetRequest rules is crucial for choosing the right approach:

| Rule Type | Definition | Persistence | Limit |
|-----------|------------|--------------|-------|
| **Static** | Defined in `manifest.json` | Persist across extension updates | 30,000 guaranteed per extension (plus shared global pool of 300,000) |
| **Dynamic** | Added via API at runtime | Persist across browser sessions | 30,000 rules |
| **Session** | Added via API at runtime | Cleared on browser restart | 5,000 rules |

Static rules are defined in the manifest and bundled with the extension. Dynamic rules are added programmatically and persist until explicitly removed. Session rules are temporary and don't survive browser restarts.

## Adding Dynamic Rules

The `chrome.declarativeNetRequest.updateDynamicRules()` method manages dynamic rules:

```javascript
// Add new dynamic rules
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 1,
      priority: 1,
      action: {
        type: "block"
      },
      condition: {
        urlFilter: "*://example.com/*",
        resourceTypes: ["script", "image"]
      }
    }
  ],
  removeRuleIds: []
});
```

### Rule Structure

Each rule contains:

- **`id`**: Unique identifier (required, positive integer)
- **`priority`**: Rule precedence (higher priority wins on conflicts)
- **`action`**: What to do when matched
- **`condition`**: When to apply the rule

### Available Actions

```javascript
// Block requests
{ action: { type: "block" } }

// Redirect to another URL
{ action: { type: "redirect", redirect: { url: "https://example.com" } } }

// Allow requests (bypass other rules)
{ action: { type: "allow" } }

// Modify headers
{
  action: {
    type: "modifyHeaders",
    requestHeaders: [
      { header: "User-Agent", operation: "set", value: "CustomAgent/1.0" }
    ]
  }
}

// Upgrade HTTP to HTTPS
{ action: { type: "upgradeScheme" } }
```

## Rule Conditions

The `condition` object defines when a rule applies:

```javascript
{
  condition: {
    // Pattern to match URLs (regex supported)
    urlFilter: ".*\\.com\\/ads\\/.*",
    
    // Use regex instead of glob pattern
    regexFilter: "^https://[^/]+/api/v1/.*",
    
    // Limit to specific resource types
    resourceTypes: ["script", "image", "stylesheet", "xhr", "main_frame"],
    
    // Match only specific domains
    domains: ["example.com", "*.example.org"],
    
    // Exclude domains
    excludedDomains: ["trusted-site.com"],
    
    // Match request initiator
    initiatorDomains: ["tracker.com"],
    
    // Apply to specific tab
    tabIds: [123],
    
    // Exclude specific tabs
    excludedTabIds: [456]
  }
}
```

### URL Filter Patterns

- `*` matches any characters
- `|` serves as anchor (start `|`, end `|`, or both)
- `^` matches any character except letters, digits, `_`, `-`, `.`, `&`, `?`, `=`

```javascript
// Block all requests to ads.example.com
urlFilter: "https://ads.example.com/"

// Block all HTTP requests
urlFilter: "http://"

// Block all HTTPS scripts
urlFilter: "https://.*\\.js$"
```

## User-Configurable Rules

A powerful pattern is allowing users to define their own blocking rules. Store user preferences and convert them to DNR rules:

```javascript
// Store user rules using @theluckystrike/webext-storage
async function addUserBlockRule(pattern) {
  // Validate the pattern first
  if (!isValidUrlFilter(pattern)) {
    throw new Error("Invalid URL pattern");
  }
  
  const userRules = await storage.get("userBlockRules") || [];
  const newRuleId = Date.now(); // Generate unique ID
  
  const rule = {
    id: newRuleId,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: pattern,
      resourceTypes: ["main_frame", "sub_frame", "script", "image"]
    }
  };
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule]
  });
  
  // Persist for future sessions
  userRules.push({ id: newRuleId, pattern });
  await storage.set("userBlockRules", userRules);
}

function isValidUrlFilter(pattern) {
  // Basic validation - check for dangerous patterns
  return pattern.length > 0 && !pattern.includes("||");
}
```

## Code Examples

### Complete CRUD Operations

```javascript
// Add multiple rules at once
const rulesToAdd = [
  {
    id: 1001,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "||doubleclick.net" }
  },
  {
    id: 1002,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: "https://example.com/blocked.html" }
    },
    condition: { urlFilter: "||ads.example.com" }
  }
];

await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: rulesToAdd
});

// Remove specific rules
await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [],
  removeRuleIds: [1001, 1002]
});

// Get all current dynamic rules
const rules = await chrome.declarativeNetRequest.getDynamicRules();
console.log("Current rules:", rules);
```

### Header Modification Example

```javascript
async function addHeaderModificationRule() {
  const rule = {
    id: 2001,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "DNT", operation: "set", value: "1" },
        { header: "X-Custom-Header", operation: "remove" }
      ],
      responseHeaders: [
        { header: "X-Tracking-Token", operation: "remove" }
      ]
    },
    condition: {
      urlFilter: "https://api.example.com/.*",
      resourceTypes: ["xhr", "fetch"]
    }
  };
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule]
  });
}
```

## Best Practices

1. **Validate user input**: Always validate URL patterns before adding rules to prevent regex DoS attacks
2. **Use appropriate priority**: Set priorities to handle rule conflicts correctly
3. **Clean up on uninstall**: Remove dynamic rules in the `uninstalled` event listener
4. **Monitor limits**: Keep track of rule counts to avoid hitting limits (30,000 for dynamic)
5. **Test regex carefully**: Regex filters that are too broad can impact performance

## Cross-References

- [Declarative Net Request API Reference](../api-reference/declarative-net-request-api.md)
- [declarativeNetRequest Permissions](../permissions/declarativeNetRequest.md)
- [MV3 Declarative Net Request](../mv3/declarative-net-request.md)
- [Network Interception Pattern](./network-interception.md)
