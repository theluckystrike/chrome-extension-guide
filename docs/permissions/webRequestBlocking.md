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

## When to Use
- Only in MV2 extensions (legacy)
- Migrate to `declarativeNetRequest` for MV3

## Cross-References
- `docs/permissions/webRequest.md`
- `docs/permissions/declarativeNetRequest.md`
- `docs/mv3/declarative-net-request.md`
