---
layout: default
title: "Chrome Extension Proxy Settings Deep Dive — Best Practices"
description: "Configure proxy settings programmatically in extensions."
---

# Proxy Settings Deep Dive

## Overview

The Chrome Proxy Settings API (`chrome.proxy`) enables extensions to programmatically control Chrome's proxy configuration. This deep dive covers advanced patterns, technical details, and implementation strategies for building robust proxy management extensions.

**Permission Required**: `"proxy"` in manifest  
**Primary API**: `chrome.proxy.settings`  
**Error API**: `chrome.proxy.onProxyError`

---

## chrome.proxy.settings API

The `chrome.proxy.settings` API uses the `ChromeSetting` pattern, providing get, set, and clear operations:

### Setting Proxy Configuration

```javascript
chrome.proxy.settings.set({
  value: {
    mode: "fixed_servers",
    rules: {
      singleProxy: { scheme: "http", host: "proxy.example.com", port: 8080 },
      bypassList: ["localhost", "127.0.0.1"]
    }
  },
  scope: "regular"  // or "regular_only" or "incognito_persistent"
}, () => {
  if (chrome.runtime.lastError) {
    console.error("Proxy error:", chrome.runtime.lastError.message);
  }
});
```

### Getting Current Configuration

```javascript
chrome.proxy.settings.get({ incognito: false }, (config) => {
  console.log("Current proxy mode:", config.value?.mode);
});
```

### Clearing Configuration

```javascript
chrome.proxy.settings.clear({}, () => {
  console.log("Proxy reset to system default");
});
```

---

## Proxy Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `"direct"` | No proxy, direct connection | Disable proxy |
| `"auto_detect"` | WPAD auto-detection | Automatic setup |
| `"pac_script"` | Custom PAC script | Complex routing |
| `"fixed_servers"` | Static proxy servers | Simple proxy |
| `"system"` | Use system proxy settings | Follow OS settings |

---

## Fixed Servers Configuration

### Single Proxy for All Protocols

```javascript
const config = {
  mode: "fixed_servers",
  rules: {
    singleProxy: {
      scheme: "http",  // http, https, socks4, socks5, quic
      host: "proxy.example.com",
      port: 8080
    },
    bypassList: [
      "localhost",
      "127.0.0.1",
      "*.local",
      "192.168.0.0/16",
      "10.0.0.0/8"
    ]
  }
};
```

### Per-Protocol Proxies

```javascript
const perProtocolConfig = {
  mode: "fixed_servers",
  rules: {
    proxyForHttp: { scheme: "http", host: "http-proxy.com", port: 8080 },
    proxyForHttps: { scheme: "https", host: "https-proxy.com", port: 8443 },
    proxyForFtp: { scheme: "http", host: "ftp-proxy.com", port: 8080 },
    bypassList: ["localhost"]
  }
};
```

---

## PAC Script Configuration

Proxy Auto-Configuration (PAC) scripts enable dynamic, URL-based proxy routing:

### Inline PAC Script

```javascript
const pacConfig = {
  mode: "pac_script",
  pacScript: {
    data: `
      function FindProxyForURL(url, host) {
        // Route internal domains direct
        if (isPlainHostName(host) || 
            shExpMatch(host, "*.local") ||
            isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
            isInNet(dnsResolve(host), "172.16.0.0", "255.240.0.0") ||
            isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
          return "DIRECT";
        }
        
        // Route corporate traffic through corporate proxy
        if (shExpMatch(host, "*.corp.com")) {
          return "PROXY corp-proxy.corp.com:8080";
        }
        
        // Default: use main proxy with fallback
        return "PROXY proxy.example.com:8080; DIRECT";
      }
    `
  }
};
```

### PAC Script Return Values

- `"DIRECT"` — Connect directly without proxy
- `"PROXY host:port"` — Use specified proxy
- `"SOCKS host:port"` — Use SOCKS proxy
- `"PROXY host1:port1; PROXY host2:port2"` — Try first, fall back to second

---

## Error Handling

### Listening for Proxy Errors

```javascript
chrome.proxy.onProxyError.addListener((details) => {
  console.error("Proxy error:", details.error);
  console.error("Fatal:", details.fatal);
  
  // Common errors:
  // - ERR_PROXY_CONNECTION_FAILED
  // - ERR_PROXY_AUTH_REQUIRED
  // - ERR_PROXY_AUTH_CHALLENGE
  // - ERR_PROXY_NEED_FALLBACK
  
  if (details.fatal) {
    // Switch to direct on fatal errors
    chrome.proxy.settings.set({
      value: { mode: "direct" },
      scope: "regular"
    });
  }
});
```

### Connection Testing

```javascript
async function testProxyConnection(host, port) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    // Note: This test may not work through the proxy in all cases
    const response = await fetch("https://www.google.com/generate_204", {
      signal: controller.signal
    });
    return { success: response.ok };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}
```

---

## Use Cases

### VPN/Proxy Switcher Extensions

Build a toggle switch between different proxy profiles:

```javascript
async function toggleProxy(enabled, profile) {
  if (!enabled) {
    await chrome.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" });
    return;
  }
  
  await chrome.proxy.settings.set({
    value: {
      mode: "fixed_servers",
      rules: {
        singleProxy: profile.proxy,
        bypassList: profile.bypassList
      }
    },
    scope: "regular"
  });
}
```

### Development Proxies

Route traffic through local development proxies:

```javascript
const devConfig = {
  mode: "pac_script",
  pacScript: {
    data: `
      function FindProxyForURL(url, host) {
        if (localhost.test(host) ||127.0.0.1.test(host)) {
          return "DIRECT";
        }
        return "PROXY localhost:8080";
      }
    `
  }
};
```

### Content Filtering

Filter content based on domain categories:

```javascript
const filteredConfig = {
  mode: "pac_script",
  pacScript: {
    data: `
      function FindProxyForURL(url, host) {
        const blocked = ["ads.example.com", "tracker.example.com"];
        if (blocked.some(domain => host.includes(domain))) {
          return "PROXY filter-proxy.example.com:8080";
        }
        return "DIRECT";
      }
    `
  }
};
```

---

## Cross-References

- [permissions/proxy.md](../permissions/proxy.md) — Permission requirements
- [patterns/proxy-settings.md](./proxy-settings.md) — Basic proxy patterns
- [network-interception.md](./network-interception.md) — Network request handling

---

## Summary

The `chrome.proxy.settings` API provides comprehensive control over Chrome's proxy configuration. Key points:

1. **Use `chrome.proxy.settings.set()`** for all configuration changes
2. **Choose the right mode**: `fixed_servers` for simple setups, `pac_script` for complex routing
3. **Always implement error handling** with fallback to direct connection
4. **Use bypass lists** to exclude local traffic from proxying
5. **Handle authentication** via `chrome.webRequest.onAuthRequired`
