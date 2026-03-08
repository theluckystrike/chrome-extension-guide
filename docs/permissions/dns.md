---
title: "dns Permission"
description: "- Permission string: `"dns"` - Grants access to `chrome.dns` API - Perform DNS lookups from the extension - Note: Limited availability, check chrome.dns existence before use"
permalink: /permissions/dns/
category: permissions
order: 16
---

# dns Permission

## Overview
- Permission string: `"dns"`
- Grants access to `chrome.dns` API
- Perform DNS lookups from the extension
- Note: Limited availability, check chrome.dns existence before use

## API Methods
- `chrome.dns.resolve(hostname)` resolve a hostname to IP address
  - Returns Promise with `{ resultCode, address }`
  - resultCode: 0 for success, non-zero for error
  - address: resolved IP address string

## Manifest Declaration
```json
{ "permissions": ["dns"] }
```

## Availability
- Originally dev channel only
- Check `typeof chrome.dns !== 'undefined'` before use
- Not available in all Chrome builds
- Consider fallback strategies

## Use Cases
- Network diagnostics: check if hostname resolves
- Hostname verification: verify domains before connecting
- DNS-based ad/tracker filtering: check DNS blocklists
- Security tools: detect DNS rebinding attempts
- Developer tools: DNS lookup utility

## Limitations
- Only A/AAAA record lookups (no MX, TXT, etc.)
- No cache control
- No TTL information returned
- Single hostname per call (no batch)

## Code Examples
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

## Cross-References
- guides/security-best-practices.md
- patterns/network-interception.md
