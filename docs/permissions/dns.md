---
layout: default
title: "dns Permission"
description: "Permission string: Grants access to API Perform DNS lookups from the extension Note: Limited availability, check chrome.dns existence before use"
permalink: /permissions/dns/
category: permissions
order: 16
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/dns/"
---

# dns Permission

## Overview {#overview}
- Permission string: `"dns"`
- Grants access to `chrome.dns` API
- Perform DNS lookups from the extension
- Note: Limited availability, check chrome.dns existence before use

## API Methods {#api-methods}
- `chrome.dns.resolve(hostname)` resolve a hostname to IP address
  - Returns Promise with `{ resultCode, address }`
  - resultCode: 0 for success, non-zero for error
  - address: resolved IP address string

## Manifest Declaration {#manifest-declaration}
```json
{ "permissions": ["dns"] }
```

## Availability {#availability}
- Originally dev channel only
- Check `typeof chrome.dns !== 'undefined'` before use
- Not available in all Chrome builds
- Consider fallback strategies

## Use Cases {#use-cases}
- Network diagnostics: check if hostname resolves
- Hostname verification: verify domains before connecting
- DNS-based ad/tracker filtering: check DNS blocklists
- Security tools: detect DNS rebinding attempts
- Developer tools: DNS lookup utility

## Limitations {#limitations}
- Only A/AAAA record lookups (no MX, TXT, etc.)
- No cache control
- No TTL information returned
- Single hostname per call (no batch)

## Code Examples {#code-examples}
```typescript
// Basic hostname resolution
async function resolveHostname(hostname: string): Promise<string | null> {
  const result = await chrome.dns.resolve(hostname);
  if (result.resultCode === 0) {
    return result.address || null;
  }
  return null;
}

// Feature detection with fallback
function resolveWithFallback(hostname: string): Promise<string | null> {
  if (typeof chrome.dns !== 'undefined') {
    return resolveHostname(hostname);
  }
  // Fallback to DoH
  return fetch(`https://dns.google/resolve?name=${hostname}`)
    .then(r => r.json())
    .then(data => data.Answer?.[0]?.data || null);
}

// DNS check before navigation
async function navigateIfResolves(url: string): Promise<void> {
  const urlObj = new URL(url);
  const resolved = await resolveHostname(urlObj.hostname);
  if (resolved) {
    window.location.href = url;
  }
}
```

## Common Use Cases

### Network Diagnostics and Debugging
Build diagnostic tools that help users troubleshoot network issues. You can check if a hostname resolves correctly, identify DNS problems, and provide helpful error messages.

### Security Analysis
Detect potential security threats like DNS rebinding attacks. By resolving hostnames yourself, you can verify that the resolved IP addresses match expected ranges and alert users to suspicious activity.

### Ad and Tracker Blocking
Implement custom DNS-based blocking lists. Check domains against blocklists and prevent connections to known ad servers or tracking domains before they're even initiated.

### Pre-flight Connection Testing
Before attempting to connect to a service, verify that the hostname resolves. This can provide better error messages and prevent confusing timeout errors when DNS is misconfigured.

### Developer Utilities
Build DNS lookup utilities similar to `nslookup` or `dig`. These tools are helpful for developers testing DNS configurations or troubleshooting domain issues.

## Best Practices

### Always Check for API Availability
The `chrome.dns` API is not available in all Chrome builds. Always check for its existence before using it:

```typescript
if (typeof chrome !== 'undefined' && chrome.dns) {
  // Use chrome.dns API
}
```

### Provide Robust Fallbacks
Since the DNS API isn't universally available, implement fallback mechanisms using public DNS-over-HTTPS (DoH) services. This ensures your extension works for all users.

### Handle Errors Gracefully
DNS resolution can fail for many reasons (typos, network issues, firewall blocking). Always handle errors and provide meaningful feedback to users.

### Consider Privacy Implications
When using external DNS services (like DoH fallbacks), be aware that you're sending hostname queries to third parties. Consider which DNS providers you trust and be transparent about this in your privacy policy.

### Don't Over-Rely on Cached Results
The DNS API doesn't expose cache information. For repeated lookups of the same hostname, consider implementing your own caching with an appropriate TTL based on typical DNS record lifetimes.

### Test Across Different Network Environments
DNS resolution can behave differently on various networks (home, corporate VPN, public WiFi). Test your extension in multiple environments to ensure it handles various DNS configurations correctly.

### Understand the Limitations
The API only supports A (IPv4) and AAAA (IPv6) records. If you need to query other record types, you'll need to use an external DNS service as a fallback.

## Cross-References

## Cross-References {#cross-references}
- guides/security-best-practices.md
- patterns/network-interception.md

## Frequently Asked Questions

### What does the dns permission do?
The dns permission grants access to chrome.dns for resolving DNS records directly from your extension, useful for network diagnostic tools.

### Is the DNS API available to all extensions?
This API is typically available to extensions with specific purposes and may require additional review for store approval.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
