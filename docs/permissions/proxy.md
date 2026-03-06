# proxy Permission — Chrome Extension Reference

## Overview
- **Permission string**: `"proxy"`
- **What it grants**: Access to `chrome.proxy` API — configure Chrome's proxy settings
- **Risk level**: High — routes ALL browser traffic through specified proxy
- `@theluckystrike/webext-permissions`: `describePermission('proxy')`

## manifest.json
```json
{ "permissions": ["proxy"] }
```

## Key APIs

### chrome.proxy.settings (ChromeSetting pattern: get/set/clear)

### Setting a Proxy
```javascript
chrome.proxy.settings.set({
  value: {
    mode: "fixed_servers",
    rules: {
      singleProxy: { scheme: "http", host: "proxy.example.com", port: 8080 },
      bypassList: ["localhost", "127.0.0.1", "*.local"]
    }
  },
  scope: "regular"
});
```

### Proxy Modes
- `"direct"` — no proxy
- `"auto_detect"` — WPAD protocol
- `"pac_script"` — PAC auto-config script
- `"fixed_servers"` — specified server(s)
- `"system"` — system settings

### PAC Script Mode
- Inline `data` or remote `url` for PAC file
- `FindProxyForURL(url, host)` function returns proxy or "DIRECT"

### Getting/Clearing Settings
- `get()` returns current config + `levelOfControl`
- `clear()` resets to default

### Error Handling
- `chrome.proxy.onProxyError` listener for proxy failures

## Proxy Rules Structure
- `singleProxy`, `proxyForHttp`, `proxyForHttps`, `proxyForFtp`, `fallbackProxy`
- `bypassList`: array of patterns to skip proxy

## Common Patterns

### VPN-Like Extension
- Set fixed proxy to VPN server, user chooses location
- Store server with `@theluckystrike/webext-storage`

### Per-Site Proxy
- Dynamic PAC script routing specific domains through proxy

### Proxy Toggle
- Toolbar icon: `set()` to enable, `clear()` to disable

## Security Considerations
- Proxy intercepts ALL traffic — extremely sensitive permission
- HTTPS: proxy sees destination but not content (CONNECT tunnel)
- Never hardcode credentials
- Consider `optional_permissions`

## Common Errors
- `controlled_by_other_extensions` — another extension owns proxy
- Invalid PAC syntax
- Can't set proxy credentials programmatically — Chrome prompts user

**IMPORTANT**: Author all commits as `theluckystrike`. No Co-Authored-By lines. Verify the file lands on `main`.
