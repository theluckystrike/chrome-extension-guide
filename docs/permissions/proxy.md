---
layout: default
title: "proxy Permission. Chrome Extension Reference"
description: ": : Access to API. configure Chrome's proxy settings : High. routes ALL browser traffic through specified proxy"
permalink: /permissions/proxy/
category: permissions
order: 32
canonical_url: "https://bestchromeextensions.com/permissions/proxy/"
---

# proxy Permission. Chrome Extension Reference

Overview {#overview}
- Permission string: `"proxy"`
- What it grants: Access to `chrome.proxy` API. configure Chrome's proxy settings
- Risk level: High. routes ALL browser traffic through specified proxy
- User prompt: "Read and change all your data on all websites"
- `@theluckystrike/webext-permissions`: `describePermission('proxy')`

manifest.json {#manifestjson}
```json
{ "permissions": ["proxy"] }
```

Key APIs {#key-apis}

chrome.proxy.settings (ChromeSetting pattern: get/set/clear) {#chromeproxysettings-chromesetting-pattern-getsetclear}

Setting a Proxy {#setting-a-proxy}
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

Proxy Modes {#proxy-modes}
- `"direct"`. no proxy
- `"auto_detect"`. WPAD protocol
- `"pac_script"`. PAC auto-config script
- `"fixed_servers"`. specified server(s)
- `"system"`. system settings

PAC Script Mode {#pac-script-mode}
- Inline `data` or remote `url` for PAC file
- `FindProxyForURL(url, host)` function returns proxy or "DIRECT"

Getting/Clearing Settings {#gettingclearing-settings}
- `get()` returns current config + `levelOfControl`
- `clear()` resets to default

Error Handling {#error-handling}
- `chrome.proxy.onProxyError` listener for proxy failures

Proxy Rules Structure {#proxy-rules-structure}
- `singleProxy`, `proxyForHttp`, `proxyForHttps`, `proxyForFtp`, `fallbackProxy`
- `bypassList`: array of patterns to skip proxy

Common Patterns {#common-patterns}

VPN-Like Extension {#vpn-like-extension}
- Set fixed proxy to VPN server, user chooses location
- Store server with `@theluckystrike/webext-storage`

Per-Site Proxy {#per-site-proxy}
- Dynamic PAC script routing specific domains through proxy

Proxy Toggle {#proxy-toggle}
- Toolbar icon: `set()` to enable, `clear()` to disable

Security Considerations {#security-considerations}
- Proxy intercepts ALL traffic. extremely sensitive permission
- HTTPS: proxy sees destination but not content (CONNECT tunnel)
- Never hardcode credentials
- Consider `optional_permissions`

Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

```ts
import { checkPermission, requestPermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

const result = await checkPermission("proxy");
console.log(result.description); // "Configure proxy settings"
console.log(result.granted);

PERMISSION_DESCRIPTIONS.proxy; // "Configure proxy settings"

// Proxy is sensitive. consider optional_permissions
if (!result.granted) {
  const req = await requestPermission("proxy");
  if (!req.granted) {
    showMessage("Proxy permission is required for this feature");
    return;
  }
}
```

Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Pattern: popup provides proxy controls, background applies settings:

```ts
type Messages = {
  setProxy: {
    request: { host: string; port: number; scheme?: string; bypassList?: string[] };
    response: { success: boolean };
  };
  clearProxy: {
    request: void;
    response: { success: boolean };
  };
  getProxyStatus: {
    request: void;
    response: { mode: string; host?: string; port?: number; controlledBy: string };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

msg.onMessage({
  setProxy: async ({ host, port, scheme, bypassList }) => {
    await chrome.proxy.settings.set({
      value: {
        mode: "fixed_servers",
        rules: {
          singleProxy: { scheme: scheme || "http", host, port },
          bypassList: bypassList || ["localhost", "127.0.0.1"],
        },
      },
      scope: "regular",
    });
    return { success: true };
  },
  clearProxy: async () => {
    await chrome.proxy.settings.clear({ scope: "regular" });
    return { success: true };
  },
  getProxyStatus: async () => {
    const config = await chrome.proxy.settings.get({ incognito: false });
    return {
      mode: config.value.mode,
      host: config.value.rules?.singleProxy?.host,
      port: config.value.rules?.singleProxy?.port,
      controlledBy: config.levelOfControl,
    };
  },
});
```

Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Store proxy profiles and preferences:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  proxyEnabled: false,
  activeProfile: "",
  proxyProfiles: [] as Array<{
    name: string;
    host: string;
    port: number;
    scheme: string;
    bypassList: string[];
  }>,
  autoSwitchRules: [] as Array<{ domain: string; profileName: string }>,
});
const storage = createStorage({ schema });

// React to proxy toggle changes from popup
storage.watch("proxyEnabled", async (enabled) => {
  if (enabled) {
    const profileName = await storage.get("activeProfile");
    const profiles = await storage.get("proxyProfiles");
    const profile = profiles.find(p => p.name === profileName);
    if (profile) {
      await chrome.proxy.settings.set({
        value: {
          mode: "fixed_servers",
          rules: {
            singleProxy: { scheme: profile.scheme, host: profile.host, port: profile.port },
            bypassList: profile.bypassList,
          },
        },
        scope: "regular",
      });
    }
  } else {
    await chrome.proxy.settings.clear({ scope: "regular" });
  }
});
```

Practical Example: PAC Script for Per-Site Routing {#practical-example-pac-script-for-per-site-routing}

```ts
// Route specific domains through a proxy, everything else direct
function createPacScript(proxyHost: string, proxyPort: number, domains: string[]): string {
  const conditions = domains.map(d => `shExpMatch(host, "${d}")`).join(" || ");
  return `
    function FindProxyForURL(url, host) {
      if (${conditions}) {
        return "PROXY ${proxyHost}:${proxyPort}";
      }
      return "DIRECT";
    }
  `;
}

async function applyPerSiteProxy(host: string, port: number, domains: string[]) {
  const pac = createPacScript(host, port, domains);
  await chrome.proxy.settings.set({
    value: {
      mode: "pac_script",
      pacScript: { data: pac },
    },
    scope: "regular",
  });
}
```

Practical Example: Proxy Error Monitoring {#practical-example-proxy-error-monitoring}

```ts
chrome.proxy.onProxyError.addListener((details) => {
  console.error(`Proxy error: ${details.error} (fatal: ${details.fatal})`);

  if (details.fatal) {
    // Fatal error. fall back to direct connection
    chrome.proxy.settings.clear({ scope: "regular" });
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon-128.png",
      title: "Proxy Connection Failed",
      message: "Falling back to direct connection. Check your proxy settings.",
    });
  }
});
```

Gotchas {#gotchas}
- `controlled_by_other_extensions` blocks your changes. if another extension has set the proxy, your `set()` call silently fails. Always check `levelOfControl` from `get()` before setting.
- Proxy credentials cannot be set programmatically. Chrome will prompt the user with its own auth dialog when the proxy requires authentication. You cannot bypass or pre-fill this.
- PAC script errors are silent. if your `FindProxyForURL` function has a syntax error, Chrome falls back to direct connections without any visible error. Always test PAC scripts thoroughly.
- Incognito mode inherits from regular by default. incognito windows inherit proxy settings from regular windows. You can override with `scope: "incognito_persistent"` to set separate proxy for incognito.
- Proxy settings are global. this permission affects ALL browser traffic, not just your extension. Be very transparent with users about what you are routing and where.

Common Errors {#common-errors}
- `controlled_by_other_extensions`. another extension owns proxy
- Invalid PAC syntax
- Can't set proxy credentials programmatically. Chrome prompts user

Related {#related}
- [Chrome proxy API docs](https://developer.chrome.com/docs/extensions/reference/api/proxy)
- [webRequest](webRequest.md). observe requests going through the proxy
- [storage](storage.md). persist proxy profiles and preferences
- [notifications](notifications.md). alert users to proxy errors

Frequently Asked Questions

How do I configure proxy in Chrome extension?
Use chrome.proxy.settings.set() to configure proxy settings. You can set pac scripts, fixed servers, or use system settings.

Can extensions bypass the proxy for specific domains?
Yes, specify bypassList in your proxy configuration to exclude specific domains from proxy routing.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
