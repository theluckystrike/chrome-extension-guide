# Chrome Proxy API Guide

## Overview

The Chrome Proxy API (`chrome.proxy`) controls Chrome's proxy settings, routing all browser traffic through specified servers. Requires `"proxy"` permission in manifest.json.

- Reference: [developer.chrome.com/docs/extensions/reference/api/proxy](https://developer.chrome.com/docs/extensions/reference/api/proxy)

## Proxy Modes

| Mode | Description |
|------|-------------|
| `"direct"` | No proxy |
| `"auto_detect"` | WPAD auto-detection |
| `"pac_script"` | PAC auto-config script |
| `"fixed_servers"` | Specified proxy server(s) |
| `"system"` | System proxy settings |

## chrome.proxy.settings

### Setting a Fixed Proxy

```javascript
chrome.proxy.settings.set({
  value: {
    mode: "fixed_servers",
    rules: {
      singleProxy: { scheme: "http", host: "proxy.example.com", port: 8080 },
      bypassList: ["localhost", "127.0.0.1", "*.corp.local"]
    }
  },
  scope: "regular"
});
```

### Getting Settings

```javascript
chrome.proxy.settings.get({ incognito: false }, (config) => {
  console.log("Mode:", config.value.mode);
  console.log("Control:", config.levelOfControl);
});
```

### Clearing Settings

```javascript
chrome.proxy.settings.clear({ scope: "regular" });
```

## ProxyConfig Types

```typescript
type ProxyConfig = 
  | { mode: "direct" | "auto_detect" | "system" }
  | { mode: "pac_script"; pacScript: { url?: string; data?: string } }
  | { mode: "fixed_servers"; rules?: ProxyRules };

type ProxyRules = {
  singleProxy?: ProxyServer;
  proxyForHttp?: ProxyServer;
  proxyForHttps?: ProxyServer;
  bypassList?: string[];
};

type ProxyServer = {
  scheme: "http" | "https" | "socks4" | "socks5";
  host: string;
  port: number;
};
```

## PAC Script Configuration

PAC scripts use `FindProxyForURL(url, host)` for dynamic routing:

```javascript
const pacScript = `
  function FindProxyForURL(url, host) {
    if (isPlainHostName(host) || 
        isInNet(dnsResolve(host), "10.0.0.0", "255.0.0.0") ||
        isInNet(dnsResolve(host), "192.168.0.0", "255.255.0.0")) {
      return "DIRECT";
    }
    return "PROXY proxy.example.com:8080";
  }
`;

chrome.proxy.settings.set({
  value: { mode: "pac_script", pacScript: { data: pacScript } },
  scope: "regular"
});
```

## Proxy Rules and Bypass Lists

```javascript
rules: {
  singleProxy: { scheme: "http", host: "proxy.example.com", port: 8080 },
  bypassList: ["localhost", "127.0.0.1", "*.corp.local", "192.168.1.0/24", "<-loopback>"]
}
```

Patterns: exact host, `*.domain.com` (wildcard), CIDR, `<-loopback>` (all loopback).

## SOCKS Proxy Setup

```javascript
// SOCKS5
chrome.proxy.settings.set({
  value: {
    mode: "fixed_servers",
    rules: {
      singleProxy: { scheme: "socks5", host: "socks.example.com", port: 1080 },
      bypassList: ["localhost"]
    }
  },
  scope: "regular"
});

// SOCKS4
chrome.proxy.settings.set({
  value: {
    mode: "fixed_servers",
    rules: { singleProxy: { scheme: "socks4", host: "socks.example.com", port: 1080 } }
  },
  scope: "regular"
});
```

## Per-URL Routing

```javascript
const pacScript = `
  function FindProxyForURL(url, host) {
    if (url.substring(0, 5) === "https") return "PROXY https-proxy:8443";
    if (url.substring(0, 4) === "http") return "PROXY http-proxy:8080";
    if (shExpMatch(host, "*.localhost") || shExpMatch(host, "*.dev")) return "DIRECT";
    return "PROXY default-proxy:8080";
  }
`;
```

## onProxyError Handling

```javascript
chrome.proxy.onProxyError.addListener((details) => {
  console.error("Proxy error:", details.error, "Fatal:", details.fatal);
  
  if (details.fatal) {
    chrome.proxy.settings.clear({ scope: "regular" });
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: "Proxy Failed",
      message: "Switched to direct connection."
    });
  }
});
```

## Building a Proxy Switcher

```javascript
// background.js
const PRESETS = [
  { name: "Direct", mode: "direct" },
  { name: "US Proxy", host: "us.proxy.com", port: 8080, scheme: "http" },
  { name: "SOCKS5", host: "socks.proxy.com", port: 1080, scheme: "socks5" }
];

async function setProxy(preset) {
  if (preset.mode === "direct") {
    await chrome.proxy.settings.clear({ scope: "regular" });
  } else {
    await chrome.proxy.settings.set({
      value: {
        mode: "fixed_servers",
        rules: {
          singleProxy: { scheme: preset.scheme, host: preset.host, port: preset.port },
          bypassList: ["localhost", "127.0.0.1"]
        }
      },
      scope: "regular"
    });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "setProxy") {
    setProxy(msg.preset).then(() => sendResponse({ success: true }));
    return true;
  }
});
```

## Important Considerations

Check level of control:
```javascript
chrome.proxy.settings.get({}, (config) => {
  if (config.levelOfControl === "controlled_by_other_extensions") {
    console.warn("Another extension controls the proxy");
  }
});
```

Incognito mode: Use `scope: "incognito_persistent"` or `"incognito_session_only"`.

Security:
1. Never hardcode credentials. Chrome handles proxy auth
2. Use optional_permissions when possible
3. Be transparent about traffic routing
4. PAC errors are silent. test thoroughly

## Related

- [Chrome Proxy API](https://developer.chrome.com/docs/extensions/reference/api/proxy)
- [PAC File Format](https://developer.mozilla.org/en-US/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_PAC_file)
- [proxy Permission](docs/permissions/proxy.md)
