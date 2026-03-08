---
title: "webRequestBlocking Permission (MV2 Only)"
description: "Enables blocking/modifying network requests in `chrome.webRequest` listeners. **MV2 only — removed in MV3.** { "permissions": ["webRequest", "webRequestBlocking", "<all_urls>"] }"
permalink: /permissions/webRequestBlocking/
category: permissions
order: 50
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/webRequestBlocking/"
---

# webRequestBlocking Permission (MV2 Only)

## What It Grants
Enables blocking/modifying network requests in `chrome.webRequest` listeners. **MV2 only — removed in MV3.**

## Manifest (MV2)
```json
{ "permissions": ["webRequest", "webRequestBlocking", "<all_urls>"] }
```

## MV3 Replacement
Use `chrome.declarativeNetRequest` instead. See `docs/permissions/declarativeNetRequest.md`.

## MV2 Usage
```typescript
// Block requests (MV2 only)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => ({ cancel: true }),
  { urls: ["*://ads.example.com/*"] },
  ["blocking"]
);

// Modify headers (MV2 only)
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    details.requestHeaders?.push({ name: 'X-Custom', value: 'test' });
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

// Redirect (MV2 only)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => ({ redirectUrl: 'https://example.com/blocked' }),
  { urls: ["*://blocked.example.com/*"] },
  ["blocking"]
);
```

## Why Removed in MV3
- Performance: blocking listeners run in extension process, slowing page loads
- Privacy: extensions could observe all network traffic
- Security: could modify requests in ways hard to audit
- `declarativeNetRequest` evaluates rules in the browser — faster, safer

## Migration Table
| MV2 webRequestBlocking | MV3 declarativeNetRequest |
|---|---|
| `cancel: true` | `{ "type": "block" }` |
| `redirectUrl` | `{ "type": "redirect", "redirect": {...} }` |
| Modify headers | `{ "type": "modifyHeaders", "requestHeaders": [...] }` |
| Custom logic | Static/dynamic rules |

## Common Use Cases

### Ad Blocking
In MV2, developers could intercept all network requests and cancel those matching ad-related patterns. This was a popular use case for ad-blocking extensions. In MV3, this functionality is now handled by the Declarative Net Request API with static rulesets.

### Request Modification
Extensions could modify request headers before they were sent, adding authentication tokens, custom headers, or removing sensitive information. This was useful for adding API keys or modifying user-agent strings.

### URL Redirection
Redirect users away from malicious or unwanted URLs by intercepting navigation requests and providing an alternative destination. This was commonly used for phishing protection.

### Content Filtering
Filter specific content types or resources based on URL patterns, such as blocking large images or preventing the loading of specific file types.

## Best Practices

### Migrate to MV3 Declarative Net Request
If you're maintaining an MV2 extension, prioritize migrating to MV3 using `declarativeNetRequest`. The new API is more performant and has been designed with security and privacy in mind.

### Understand the Limitations
The declarative approach means you can't have custom logic for every request. Rules must be defined statically or as dynamic rules, not computed per-request in real-time.

### Use Static Rules for Common Blocking
For well-known ad networks or tracking domains, use predefined static rules. This is more efficient than dynamic rules and can be updated through the extension's update mechanism.

### Test Thoroughly in Both Versions
If you must support MV2, test your extension's network interception thoroughly. The behavior can differ between versions, and blocking requests may have unexpected side effects on web pages.

### Consider Privacy Implications
Be transparent about what your extension blocks or modifies. The removal of `webRequestBlocking` in MV3 was partly driven by privacy concerns about extensions observing all network traffic.

## When to Use
- Only in MV2 extensions (legacy)
- Migrate to `declarativeNetRequest` for MV3

## Cross-References
- `docs/permissions/webRequest.md`
- `docs/permissions/declarativeNetRequest.md`
- `docs/mv3/declarative-net-request.md`
