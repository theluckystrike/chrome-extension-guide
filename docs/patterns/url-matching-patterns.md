# URL Matching Patterns in Chrome Extensions

URL matching patterns in Chrome extensions define which URLs an extension can access or interact with. Understanding these patterns is essential for configuring permissions, content scripts, and network request rules.

## Syntax Overview

Match patterns follow the scheme: `<scheme>://<host>/<path>`

```
<scheme>://<host><path>
```

## Scheme Options

| Scheme | Description |
|--------|-------------|
| `http` | HTTP URLs only |
| `https` | HTTPS URLs only |
| `*` | Matches both http and https |
| `ftp` | FTP URLs |
| `file` | Local file URLs |

## Host Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| Exact | `example.com` | Matches exactly example.com |
| Wildcard subdomain | `*.example.com` | Matches sub.example.com, www.example.com, but not example.com |
| All hosts | `*` or `*.` | Matches any host |
| No host | `file://` | Matches local files |

## Path Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| Exact | `/page.html` | Matches exactly /page.html |
| Wildcard | `/api/*` | Matches /api/users, /api/posts/123 |
| All paths | `/*` | Matches any path |
| No path | (empty) | Matches all paths |

## Special Patterns

### &lt;all_urls&gt;

The special pattern `<all_urls>` matches all URLs. Use sparingly due to security implications.

```
<all_urls>
```

Equivalent to: `*://*/*`

## Where Match Patterns Are Used

- **`content_scripts`** matches / exclude_matches - Inject scripts on specific pages
- **`host_permissions`** - Access to network requests and page content
- **`web_accessible_resources`** - Make extension resources accessible to web pages
- **`declarativeNetRequest`** - Block or modify network requests

## Glob Patterns in Content Scripts

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

### Match Patterns vs Glob Patterns

| Feature | Match Patterns | Glob Patterns |
|---------|-----------------|---------------|
| Syntax | `scheme://host/path` | `*`, `?`, `[]` |
| Location | `matches`, `exclude_matches` | `include_globs`, `exclude_globs` |
| Wildcard position | Only at start of host | Anywhere in path |

## Common Patterns

### All HTTPS Sites
```
https://*/*
```

### Specific Domain and All Subdomains
```
*://*.example.com/*
```

### Specific Path
```
https://example.com/dashboard/*
```

### Multiple Specific Domains
```
*://example.com/*
*://api.example.com/*
```

## The URLPattern API (Modern Alternative)

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

## Security Implications

**Always request minimum necessary permissions.**

- Avoid `<all_urls>` when possible
- Use specific domains instead of wildcards
- Consider using declarativeNetRequest for network control instead of host permissions
- Test patterns thoroughly before distribution

## Common Mistakes

1. **Missing scheme**: Using `example.com/*` instead of `https://example.com/*`
2. **Missing path**: Not including `/*` at the end
3. **Overly broad patterns**: Using `*://*/*` when only `https://example.com/*` is needed
4. **Confusing glob and match patterns**: Using glob syntax in `matches` field

## Testing Patterns Programmatically

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

## Related Documentation

- [Permissions Model](../guides/permissions-model.md)
- [Content Script Patterns](../guides/content-script-patterns.md)
- [Manifest Fields Reference](../reference/manifest-fields.md)
