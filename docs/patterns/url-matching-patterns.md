---
layout: default
title: "Chrome Extension Url Matching Patterns. Best Practices"
description: "Match URLs with patterns for content script injection."
canonical_url: "https://bestchromeextensions.com/patterns/url-matching-patterns/"
last_modified_at: 2026-01-15
---

URL Matching Patterns in Chrome Extensions

URL matching patterns in Chrome extensions define which URLs an extension can access or interact with. Understanding these patterns is essential for configuring permissions, content scripts, and network request rules.

Syntax Overview {#syntax-overview}

Match patterns follow the scheme: `<scheme>://<host>/<path>`

```
<scheme>://<host><path>
```

Scheme Options {#scheme-options}

| Scheme | Description |
|--------|-------------|
| `http` | HTTP URLs only |
| `https` | HTTPS URLs only |
| `*` | Matches both http and https |
| `ftp` | FTP URLs |
| `file` | Local file URLs |

Host Patterns {#host-patterns}

| Pattern | Example | Description |
|---------|---------|-------------|
| Exact | `example.com` | Matches exactly example.com |
| Wildcard subdomain | `*.example.com` | Matches sub.example.com, www.example.com, but not example.com |
| All hosts | `*` or `*.` | Matches any host |
| No host | `file://` | Matches local files |

Path Patterns {#path-patterns}

| Pattern | Example | Description |
|---------|---------|-------------|
| Exact | `/page.html` | Matches exactly /page.html |
| Wildcard | `/api/*` | Matches /api/users, /api/posts/123 |
| All paths | `/*` | Matches any path |
| No path | (empty) | Matches all paths |

Special Patterns {#special-patterns}

&lt;all_urls&gt; {#ltall-urlsgt}

The special pattern `<all_urls>` matches all URLs. Use sparingly due to security implications.

```
<all_urls>
```

Equivalent to: `*://*/*`

Where Match Patterns Are Used {#where-match-patterns-are-used}

- `content_scripts` matches / exclude_matches - Inject scripts on specific pages
- `host_permissions` - Access to network requests and page content
- `web_accessible_resources` - Make extension resources accessible to web pages
- `declarativeNetRequest` - Block or modify network requests

Glob Patterns in Content Scripts {#glob-patterns-in-content-scripts}

Content scripts support additional glob patterns via `include_globs` and `exclude_globs`:

```json
{
  "content_scripts": [{
    "matches": ["https://example.com/*"],
    "include_globs": ["*admin*"],
    "exclude_globs": ["*private*"]
  }]
}
```

Match Patterns vs Glob Patterns {#match-patterns-vs-glob-patterns}

| Feature | Match Patterns | Glob Patterns |
|---------|-----------------|---------------|
| Syntax | `scheme://host/path` | `*`, `?`, `[]` |
| Location | `matches`, `exclude_matches` | `include_globs`, `exclude_globs` |
| Wildcard position | Only at start of host | Anywhere in path |

Common Patterns {#common-patterns}

All HTTPS Sites {#all-https-sites}
```
https://*/*
```

Specific Domain and All Subdomains {#specific-domain-and-all-subdomains}
```
*://*.example.com/*
```

Specific Path {#specific-path}
```
https://example.com/dashboard/*
```

Multiple Specific Domains {#multiple-specific-domains}
```
*://example.com/*
*://api.example.com/*
```

The URLPattern API (Modern Alternative) {#the-urlpattern-api-modern-alternative}

Chrome 100+ provides a newer programmatic API:

```javascript
const pattern = new URLPattern({
  protocol: 'https',
  hostname: '*.example.com',
  path: '/api/*'
});

if (pattern.test('https://api.example.com/api/users')) {
  console.log('Matches!');
}
```

Security Implications {#security-implications}

Always request minimum necessary permissions.

- Avoid `<all_urls>` when possible
- Use specific domains instead of wildcards
- Consider using declarativeNetRequest for network control instead of host permissions
- Test patterns thoroughly before distribution

Common Mistakes {#common-mistakes}

1. Missing scheme: Using `example.com/*` instead of `https://example.com/*`
2. Missing path: Not including `/*` at the end
3. Overly broad patterns: Using `*://*/*` when only `https://example.com/*` is needed
4. Confusing glob and match patterns: Using glob syntax in `matches` field

Testing Patterns Programmatically {#testing-patterns-programmatically}

```javascript
// Test if a URL matches a pattern
function testMatchPattern(url, pattern) {
  const urlObj = new URL(url);
  
  // Simple test - in production use URLPattern API
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  return new RegExp(`^${regex}$`).test(urlObj.href);
}

testMatchPattern('https://api.example.com/users', 'https://*.example.com/*');
// true
```

Related Documentation {#related-documentation}

- [Permissions Model](../guides/permissions-model.md)
- [Content Script Patterns](../guides/content-script-patterns.md)
- [Manifest Fields Reference](../reference/manifest-fields.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
