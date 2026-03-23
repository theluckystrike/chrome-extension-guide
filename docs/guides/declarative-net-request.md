---
layout: guide
title: Chrome Extension Declarative Net Request. MV3 Network Request Rules
description: Learn how to use Chrome's Declarative Net Request API to modify network requests, block ads, and redirect traffic in Manifest V3 extensions.
---

# Chrome Extension Declarative Net Request. MV3 Network Request Rules

The Declarative Net Request API is one of the most powerful features introduced in Manifest V3, enabling Chrome extensions to modify, block, or redirect network requests without requiring broad host permissions. This API provides a privacy-preserving and performance-friendly way to handle network-level operations, making it ideal for ad blocking, content filtering, and request modification.

Understanding the Rule Structure

Each Declarative Net Request rule follows a structured JSON format that defines the action to take and the conditions under which to apply it. The core components include an ID, priority, action type, and condition matching rules.

A basic rule structure looks like this:

```json
{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": { "urlFilter": "example.com", "resourceTypes": ["main_frame"] }
}
```

The `urlFilter` property uses regex-like patterns to match URLs, supporting wildcards and special characters. For instance, `||example.com^` matches all requests to example.com and its subdomains, while `.*\.ads\..*` targets any URL containing "ads" in the domain.

Static vs Dynamic Rules

Chrome extensions distinguish between two categories of Declarative Net Request rules: static and dynamic. Understanding the difference is crucial for proper extension architecture.

Static rules are defined in the extension's manifest file and bundled with the extension during installation. They are declared in the `declarative_net_request` permission with a `rule_resources` array pointing to JSON rule files. These rules are verified during the Chrome Web Store review process and cannot be modified after publication.

```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules/block_ads.json"
    }]
  }
}
```

Dynamic rules are added and managed programmatically at runtime using the `chrome.declarativeNetRequest.updateDynamicRules()` method. These rules persist across browser sessions and can be modified by the extension after installation. Dynamic rules are commonly used for user preferences, temporary blocks, or features that require runtime configuration.

```javascript
// Add dynamic rules at runtime
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 1001,
    priority: 1,
    action: { type: "block" },
    condition: { urlFilter: "tracker.example.com", resourceTypes: ["script"] }
  }],
  removeRuleIds: []
});
```

Redirect Rules

Redirect actions allow extensions to intercept requests and forward them to alternative URLs. This is particularly useful for URL shortening, domain forwarding, or replacing blocked resources with placeholder content.

The redirect action supports several modes:

```json
{
  "id": 2,
  "priority": 2,
  "action": {
    "type": "redirect",
    "redirect": {
      "url": "https://example.com/alternative-page"
    }
  },
  "condition": {
    "urlFilter": "https://old-domain.com/page",
    "resourceTypes": ["main_frame"]
  }
}
```

For more sophisticated redirects, you can use transform rules that modify URL components:

```json
{
  "action": {
    "type": "redirect",
    "redirect": {
      "transform": {
        "scheme": "https",
        "host": "new-host.com",
        "path": "/redirected"
      }
    }
  }
}
```

Header Modification

The Declarative Net Request API enables modification of request and response headers through `modifyHeaders` actions. This capability is essential for managing cookies, adding security headers, or stripping tracking parameters.

Request header modification:

```json
{
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [
      { "header": "User-Agent", "operation": "set", "value": "Mozilla/5.0" },
      { "header": "X-Custom-Header", "operation": "remove" }
    ]
  }
}
```

Response header modification works similarly but targets headers in the server's response:

```json
{
  "action": {
    "type": "modifyHeaders",
    "responseHeaders": [
      { "header": "X-Frame-Options", "operation": "set", "value": "DENY" },
      { "header": "Set-Cookie", "operation": "remove" }
    ]
  }
}
```

Ad Blocking Patterns

Creating effective ad blocking rules requires understanding common advertising networks and tracking domains. The declarative format allows for both simple domain blocks and complex pattern matching.

A comprehensive ad blocking rule might combine multiple conditions:

```json
{
  "id": 3,
  "priority": 3,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": ".*",
    "resourceTypes": ["script", "image", "sub_frame"],
    "ifDomain": ["*advertising.com", "*tracker.net", "*analytics.org"]
  }
}
```

For URL parameter-based tracking removal:

```json
{
  "action": {
    "type": "redirect",
    "redirect": {
      "transform": {
        "queryTransform": {
          "removeParams": ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid"]
        }
      }
    }
  }
}
```

Best Practices and Limitations

When implementing Declarative Net Request rules, be mindful of Chrome's quotas. Extensions can have up to 300,000 static rules across all rulesets and 30,000 dynamic rules. Rule evaluation is performant because Chrome compiles rules into an efficient format, but overly complex regex patterns can impact matching speed.

Always test your rules thoroughly using `chrome.declarativeNetRequest.testMatchOutcome()` before deploying to production. This method simulates URL matching without actually modifying requests, helping identify rule conflicts or unexpected behavior.

Rule Priority and Matching Order

Understanding rule priority is essential when multiple rules could match the same request. Chrome evaluates rules in priority order, with higher priority rules taking precedence. When rules have equal priority, the one with the lower ID wins.

The priority is explicitly defined in each rule, but Chrome also derives implicit priority from the specificity of conditions. More specific conditions like `ifDomain` and `unlessDomain` take precedence over broader `urlFilter` patterns. This means you can create general blocking rules while allowing exceptions for specific domains.

For example, to block all ads except on user-approved sites:

```json
// High priority exception rule
{
  "id": 1,
  "priority": 10,
  "action": { "type": "allow" },
  "condition": { "urlFilter": ".*", "ifDomain": ["trusted-site.com"] }
},
// Lower priority blocking rule
{
  "id": 2,
  "priority": 1,
  "action": { "type": "block" },
  "condition": { "urlFilter": ".*\\.ads\\..*", "resourceTypes": ["script"] }
}
```

Common Use Cases

The Declarative Net Request API serves numerous practical applications beyond basic ad blocking. Privacy-focused extensions use it to block tracking pixels and analytics scripts, while developer tools use header modification to debug API calls. Content filtering extensions use redirect rules to replace blocked images with placeholders or remove unwanted content from web pages.

Extensions that manage corporate networks often implement URL forwarding rules to redirect employees to internal resources. E-commerce tools might intercept and modify checkout requests to apply coupon codes automatically. The flexibility of the condition system, supporting domain matching, URL patterns, resource types, and tab attributes, makes nearly any network modification scenario possible.

Security extensions use this API to block known malicious domains, phishing attempts, and malware distribution networks. By maintaining updated blocklists as dynamic rules, these extensions can respond to new threats without requiring users to reinstall or update the extension manually.

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.