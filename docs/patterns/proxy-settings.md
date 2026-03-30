---
layout: default
title: "Chrome Extension Proxy Settings. Best Practices"
description: "Configure proxy settings for extensions."
canonical_url: "https://bestchromeextensions.com/patterns/proxy-settings/"
last_modified_at: 2026-01-15
---

Proxy Settings API Patterns

Overview {#overview}

The Chrome Proxy Settings API (`chrome.proxy`) allows extensions to manage Chrome's proxy configuration programmatically. This is essential for building extensions that route traffic through specific proxy servers, implement split tunneling, or provide VPN-like functionality. This guide covers practical patterns for configuring proxies, handling authentication, managing multiple profiles, and building user interfaces for proxy control.

Key facts:
- Permission Required: `"proxy"` in manifest (requires host permissions for full functionality)
- API Stability: `chrome.proxy` is available in all modern browsers but behavior varies
- Storage Integration: Use `chrome.storage` or `@theluckystrike/webext-storage` for persisting proxy profiles
- Error Handling: Always implement fallback behavior since proxy connections can fail

---

Pattern 1: Proxy Configuration Types {#pattern-1-proxy-configuration-types}

Chrome supports multiple proxy configuration modes through the `chrome.proxy.settings.set()` API. Understanding each type is essential for choosing the right approach:

Fixed Servers Mode {#fixed-servers-mode}

The simplest configuration. direct proxy server assignment:

```ts
// types/proxy.ts
export interface ProxyServer {
  scheme: "http" | "https" | "socks4" | "socks5" | "quic";
  host: string;
  port: number;
}

export interface ProxyRules {
  singleProxy?: ProxyServer;
  proxyForHttp?: ProxyServer;
  proxyForHttps?: ProxyServer;
  proxyForFtp?: ProxyServer;
  bypassList?: string[];
}

export interface ProxyConfig {
  mode: "fixed_servers" | "pac_script" | "direct" | "auto_detect" | "system";
  rules?: ProxyRules;
  pacScript?: {
    url?: string;
    data?: string;
  };
}
```

Configuration Examples {#configuration-examples}

```ts
// background/proxy-config.ts
import type { ProxyConfig } from "../types/proxy";

// Direct connection (no proxy)
const directConfig: ProxyConfig = {
  mode: "direct"
};

// System proxy settings
const systemConfig: ProxyConfig = {
  mode: "system"
};

// Auto-detect proxy (WPAD)
const autoDetectConfig: ProxyConfig = {
  mode: "auto_detect"
};

// Fixed single proxy for all protocols
const fixedSingleProxy: ProxyConfig = {
  mode: "fixed_servers",
  rules: {
    singleProxy: {
      scheme: "http",
      host: "proxy.example.com",
      port: 8080
    }
  }
};

// Per-scheme proxy configuration
const perSchemeProxy: ProxyConfig = {
  mode: "fixed_servers",
  rules: {
    proxyForHttp: { scheme: "http", host: "http-proxy.example.com", port: 8080 },
    proxyForHttps: { scheme: "https", host: "https-proxy.example.com", port: 8443 },
    proxyForFtp: { scheme: "http", host: "ftp-proxy.example.com", port: 8080 }
  }
};

// PAC script configuration (covered in Pattern 3)
const pacConfig: ProxyConfig = {
  mode: "pac_script",
  pacScript: {
    data: `function FindProxyForURL(url, host) {
      return "PROXY proxy.example.com:8080";
    }`
  }
};
```

Manifest Permission {#manifest-permission}

```json
// manifest.json
{
  "name": "Proxy Manager Extension",
  "version": "1.0.0",
  "permissions": [
    "proxy",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

---

Pattern 2: Fixed Proxy Server Setup {#pattern-2-fixed-proxy-server-setup}

Single Proxy for All Traffic {#single-proxy-for-all-traffic}

The most common use case. routing all traffic through one proxy:

```ts
// background/proxy-manager.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";
import type { ProxyConfig, ProxyServer } from "../types/proxy";

const schema = defineSchema({
  proxyServer: { 
    type: "string", 
    default: "" 
  },
  proxyPort: { 
    type: "number", 
    default: 0 
  },
  proxyScheme: {
    type: "string",
    default: "http"
  }
});

const storage = createStorage(schema);

export class ProxyManager {
  private static async setProxy(config: ProxyConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.proxy.settings.set(
        { value: config, scope: "regular" },
        () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        }
      );
    });
  }

  static async enableProxy(
    host: string, 
    port: number, 
    scheme: "http" | "https" | "socks4" | "socks5" = "http"
  ): Promise<void> {
    const config: ProxyConfig = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme,
          host,
          port
        }
      }
    };

    await this.setProxy(config);
    
    // Persist settings
    await storage.set({
      proxyServer: host,
      proxyPort: port,
      proxyScheme: scheme
    });
  }

  static async disableProxy(): Promise<void> {
    await this.setProxy({ mode: "direct" });
    await storage.set({ proxyServer: "", proxyPort: 0 });
  }

  static async getCurrentProxy(): Promise<ProxyConfig | null> {
    return new Promise((resolve) => {
      chrome.proxy.settings.get({ incognito: false }, (config) => {
        resolve(config.value as ProxyConfig || null);
      });
    });
  }
}
```

Per-Scheme Proxy Routing {#per-scheme-proxy-routing}

Different proxies for different protocols:

```ts
// background/scheme-routing.ts
export interface SchemeProxyConfig {
  http: { host: string; port: number };
  https: { host: string; port: number };
  ftp?: { host: string; port: number };
}

export async function setSchemeBasedProxy(config: SchemeProxyConfig): Promise<void> {
  const proxyConfig: ProxyConfig = {
    mode: "fixed_servers",
    rules: {
      proxyForHttp: {
        scheme: "http",
        host: config.http.host,
        port: config.http.port
      },
      proxyForHttps: {
        scheme: "https",
        host: config.https.host,
        port: config.https.port
      },
      ...(config.ftp && {
        proxyForFtp: {
          scheme: "http",
          host: config.ftp.host,
          port: config.ftp.port
        }
      })
    }
  };

  await chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" });
}

// Example: Different proxies for different protocols
await setSchemeBasedProxy({
  http: { host: "http-proxy.corp.com", port: 8080 },
  https: { host: "https-proxy.corp.com", port: 8443 },
  ftp: { host: "ftp-proxy.corp.com", port: 8080 }
});
```

Fallback Proxy Chain {#fallback-proxy-chain}

Configure fallback when primary proxy fails:

```ts
// background/fallback-proxy.ts
interface ProxyChain {
  primary: ProxyServer;
  fallback: ProxyServer;
  bypassList?: string[];
}

export async function setProxyWithFallback(chain: ProxyChain): Promise<void> {
  // PAC script for chain logic
  const pacScript = `
    function FindProxyForURL(url, host) {
      var primary = "${chain.primary.host}:${chain.primary.port}";
      var fallback = "${chain.fallback.host}:${chain.fallback.port}";
      
      // Try primary, fall back to direct, then fallback proxy
      return "PROXY " + primary + "; DIRECT; PROXY " + fallback;
    }
  `;

  const config: ProxyConfig = {
    mode: "pac_script",
    pacScript: {
      data: pacScript
    },
    rules: {
      bypassList: chain.bypassList || []
    }
  };

  await chrome.proxy.settings.set({ value: config, scope: "regular" });
}
```

---

Pattern 3: PAC Script Proxy {#pattern-3-pac-script-proxy}

Proxy Auto-Configuration (PAC) scripts provide dynamic proxy selection based on URL patterns.

Inline PAC Script Configuration {#inline-pac-script-configuration}

```ts
// background/pac-generator.ts
export interface PACRule {
  pattern: RegExp;
  proxy: string;
}

export class PACGenerator {
  private rules: PACRule[] = [];

  addRule(pattern: RegExp, proxy: string): this {
    this.rules.push({ pattern, proxy });
    return this;
  }

  addBypass(host: string): this {
    this.rules.push({
      pattern: new RegExp(`^https?://${host.replace(/\./g, "\\.")}`),
      proxy: "DIRECT"
    });
    return this;
  }

  generate(): string {
    const rulesCode = this.rules
      .map((rule, index) => `
        if (${rule.pattern.toString()}.test(url)) {
          return "${rule.proxy}";
        }`)
      .join("\n");

    return `
      function FindProxyForURL(url, host) {
        ${rulesCode}
        return "PROXY default.proxy.com:8080";
      }
    `;
  }

  async apply(scope: "regular" | "incognito" = "regular"): Promise<void> {
    const pacScript = this.generate();
    
    await chrome.proxy.settings.set({
      value: {
        mode: "pac_script",
        pacScript: { data: pacScript }
      },
      scope
    });
  }
}

// Usage example
const pac = new PACGenerator()
  .addRule(/^https?:\/\/api\.example\.com/, "PROXY api-proxy.example.com:8080")
  .addRule(/^https?:\/\/internal\./, "DIRECT")
  .addBypass("localhost")
  .addBypass("127.0.0.1");

await pac.apply();
```

Dynamic PAC Generation Based on User Rules {#dynamic-pac-generation-based-on-user-rules}

```ts
// background/dynamic-pac.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface ProxyRule {
  id: string;
  pattern: string;  // URL pattern
  proxy: string;   // "PROXY host:port" or "DIRECT"
  enabled: boolean;
}

const schema = defineSchema({
  proxyRules: { type: "array", default: [] as ProxyRule[] },
  defaultProxy: { type: "string", default: "PROXY default.proxy.com:8080" }
});

const storage = createStorage(schema);

export async function generateDynamicPAC(): Promise<string> {
  const { proxyRules, defaultProxy } = await storage.get(
    "proxyRules", 
    "defaultProxy"
  );

  const ruleConditions = proxyRules
    .filter(rule => rule.enabled)
    .map(rule => {
      // Convert URL pattern to regex
      const regexPattern = rule.pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".");
      
      return `
        if (url.match(/^${regexPattern}/)) {
          return "${rule.proxy}";
        }`;
    })
    .join("\n");

  return `
    function FindProxyForURL(url, host) {
      ${ruleConditions}
      return "${defaultProxy}";
    }
  `;
}

export async function applyDynamicPAC(): Promise<void> {
  const pacScript = await generateDynamicPAC();
  
  await chrome.proxy.settings.set({
    value: {
      mode: "pac_script",
      pacScript: { data: pacScript }
    },
    scope: "regular"
  });
}

// Listen for rule changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.proxyRules || changes.defaultProxy) {
    await applyDynamicPAC();
  }
});
```

---

Pattern 4: Proxy Bypass Rules {#pattern-4-proxy-bypass-rules}

Bypass rules allow certain requests to bypass the proxy and connect directly.

Basic Bypass Configuration {#basic-bypass-configuration}

```ts
// background/bypass-rules.ts
export interface BypassConfig {
  bypassList: string[];
}

export async function setProxyWithBypass(
  proxyHost: string,
  proxyPort: number,
  bypassList: string[]
): Promise<void> {
  const config: ProxyConfig = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "http",
        host: proxyHost,
        port: proxyPort
      },
      bypassList
    }
  };

  await chrome.proxy.settings.set({ value: config, scope: "regular" });
}

// Common bypass patterns
const commonBypasses = [
  "localhost",
  "127.0.0.1",
  "*.local",
  "192.168.0.0/16",    // Private network
  "10.0.0.0/8",        // Private network  
  "172.16.0.0/12",     // Private network
  "<local>"            // All local addresses
];

await setProxyWithBypass("proxy.example.com", 8080, commonBypasses);
```

Pattern Syntax Reference {#pattern-syntax-reference}

```ts
// Reference: Bypass pattern syntax
const bypassPatterns = {
  // Domain wildcards
  "*.example.com": "All subdomains of example.com",
  "example.com": "Exact domain match only",
  
  // IP ranges (CIDR notation)
  "192.168.0.0/16": "Class C private network",
  "10.0.0.0/8": "Class A private network",
  "172.16.0.0/12": "Class B private network",
  
  // Special keywords
  "<local>": "All local addresses (localhost, 127.0.0.1, etc.)",
  
  // Exact IP
  "192.168.1.1": "Specific IP address",
  
  // Port-based (for SOCKS)
  "*.example.com:8080": "Specific port on domain",
  
  // Negation (if needed - requires PAC script)
  // Note: Direct negation not supported in bypassList,
  // use PAC script for complex logic
};
```

Combining Bypass with Multiple Proxies {#combining-bypass-with-multiple-proxies}

```ts
// background/multi-proxy-bypass.ts
interface ProxyProfile {
  name: string;
  proxy: ProxyServer;
  bypassList: string[];
}

const profiles: ProxyProfile[] = [
  {
    name: "Corporate",
    proxy: { scheme: "http", host: "corp-proxy.corp.com", port: 8080 },
    bypassList: ["*.corp.com", "localhost", "127.0.0.1", "10.0.0.0/8"]
  },
  {
    name: "US Proxy",
    proxy: { scheme: "http", host: "us-proxy.example.com", port: 8080 },
    bypassList: ["localhost", "127.0.0.1"]
  },
  {
    name: "Privacy",
    proxy: { scheme: "socks5", host: "socks.example.com", port: 1080 },
    bypassList: ["localhost", "127.0.0.1", "*.local"]
  }
];

export async function applyProfile(profile: ProxyProfile): Promise<void> {
  const config: ProxyConfig = {
    mode: "fixed_servers",
    rules: {
      singleProxy: profile.proxy,
      bypassList: profile.bypassList
    }
  };

  await chrome.proxy.settings.set({ value: config, scope: "regular" });
}
```

---

Pattern 5: Dynamic Proxy Switching {#pattern-5-dynamic-proxy-switching}

Toggle and switch between proxy profiles at runtime.

Toggle Proxy On/Off via Action Click {#toggle-proxy-onoff-via-action-click}

```ts
// background/proxy-toggle.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  isEnabled: { type: "boolean", default: false },
  proxyHost: { type: "string", default: "proxy.example.com" },
  proxyPort: { type: "number", default: 8080 },
  proxyScheme: { type: "string", default: "http" }
});

const storage = createStorage(schema);

async function updateBadge(): Promise<void> {
  const isEnabled = await storage.get("isEnabled");
  
  await chrome.action.setBadgeText({
    text: isEnabled ? "ON" : "OFF"
  });
  
  await chrome.action.setBadgeBackgroundColor({
    color: isEnabled ? "#4CAF50" : "#9E9E9E"
  });
}

async function toggleProxy(): Promise<void> {
  const { isEnabled, proxyHost, proxyPort, proxyScheme } = await storage.get(
    "isEnabled",
    "proxyHost", 
    "proxyPort",
    "proxyScheme"
  );

  const newState = !isEnabled;
  
  if (newState) {
    // Enable proxy
    await chrome.proxy.settings.set({
      value: {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: proxyScheme as "http",
            host: proxyHost,
            port: proxyPort
          }
        }
      },
      scope: "regular"
    });
  } else {
    // Disable proxy - direct connection
    await chrome.proxy.settings.set({
      value: { mode: "direct" },
      scope: "regular"
    });
  }

  await storage.set("isEnabled", newState);
  await updateBadge();
}

// Register click handler
chrome.action.onClicked.addListener(async () => {
  await toggleProxy();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  const { isEnabled } = await storage.get("isEnabled");
  
  if (isEnabled) {
    const { proxyHost, proxyPort, proxyScheme } = await storage.get(
      "proxyHost",
      "proxyPort",
      "proxyScheme"
    );
    
    await chrome.proxy.settings.set({
      value: {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: proxyScheme as "http",
            host: proxyHost,
            port: proxyPort
          }
        }
      },
      scope: "regular"
    });
  }
  
  await updateBadge();
});
```

Switch Between Proxy Profiles {#switch-between-proxy-profiles}

```ts
// background/profile-manager.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

export interface ProxyProfile {
  id: string;
  name: string;
  proxy: ProxyServer;
  bypassList: string[];
  color?: string;  // For UI identification
}

const schema = defineSchema({
  activeProfileId: { type: "string", default: "" },
  profiles: { 
    type: "array", 
    default: [] as ProxyProfile[] 
  }
});

const storage = createStorage(schema);

export class ProfileManager {
  static async addProfile(profile: ProxyProfile): Promise<void> {
    const { profiles } = await storage.get("profiles");
    profiles.push(profile);
    await storage.set("profiles", profiles);
  }

  static async removeProfile(profileId: string): Promise<void> {
    const { profiles, activeProfileId } = await storage.get(
      "profiles", 
      "activeProfileId"
    );
    
    const updated = profiles.filter(p => p.id !== profileId);
    await storage.set("profiles", updated);
    
    if (activeProfileId === profileId) {
      await this.deactivateProfile();
    }
  }

  static async activateProfile(profileId: string): Promise<void> {
    const { profiles } = await storage.get("profiles");
    const profile = profiles.find(p => p.id === profileId);
    
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
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

    await storage.set("activeProfileId", profileId);
    
    // Update badge to show active profile
    await chrome.action.setBadgeText({ text: profile.name.substring(0, 4).toUpperCase() });
  }

  static async deactivateProfile(): Promise<void> {
    await chrome.proxy.settings.set({
      value: { mode: "direct" },
      scope: "regular"
    });
    
    await storage.set("activeProfileId", "");
    await chrome.action.setBadgeText({ text: "" });
  }

  static async getActiveProfile(): Promise<ProxyProfile | null> {
    const { profiles, activeProfileId } = await storage.get(
      "profiles", 
      "activeProfileId"
    );
    
    if (!activeProfileId) return null;
    return profiles.find(p => p.id === activeProfileId) || null;
  }
}

// Default profiles
const defaultProfiles: ProxyProfile[] = [
  {
    id: "work",
    name: "Work",
    proxy: { scheme: "http", host: "work-proxy.corp.com", port: 8080 },
    bypassList: ["*.corp.com", "localhost", "10.0.0.0/8"],
    color: "#2196F3"
  },
  {
    id: "personal-us",
    name: "US Personal",
    proxy: { scheme: "http", host: "us-proxy.example.com", port: 8080 },
    bypassList: ["localhost", "127.0.0.1"],
    color: "#4CAF50"
  },
  {
    id: "personal-eu",
    name: "EU Personal",
    proxy: { scheme: "http", host: "eu-proxy.example.com", port: 8080 },
    bypassList: ["localhost", "127.0.0.1"],
    color: "#FF9800"
  }
];

// Initialize with defaults on first install
chrome.runtime.onInstalled.addListener(async () => {
  const { profiles } = await storage.get("profiles");
  
  if (profiles.length === 0) {
    await storage.set("profiles", defaultProfiles);
  }
});
```

---

Pattern 6: Proxy Authentication {#pattern-6-proxy-authentication}

Handle proxy authentication challenges securely.

Auth Required Listener {#auth-required-listener}

```ts
// background/proxy-auth.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface ProxyCredentials {
  username: string;
  password: string;
}

const schema = defineSchema({
  proxyCredentials: { 
    type: "object", 
    default: null as ProxyCredentials | null 
  }
});

const storage = createStorage(schema);

export function setupProxyAuthListener(): void {
  chrome.webRequest.onAuthRequired.addListener(
    async (details) => {
      console.log("Auth required for:", details.url);
      
      const credentials = await storage.get("proxyCredentials");
      
      if (credentials?.proxyCredentials) {
        return {
          authCredentials: {
            username: credentials.proxyCredentials.username,
            password: credentials.proxyCredentials.password
          }
        };
      }

      // No credentials available - return empty to trigger error
      // Could also notify user via chrome.notifications
      return { cancel: true };
    },
    {
      urls: ["<all_urls>"]
    },
    ["asyncBlocking"]
  );
}

export async function setProxyCredentials(
  username: string, 
  password: string
): Promise<void> {
  await storage.set("proxyCredentials", { username, password });
}

export async function clearProxyCredentials(): Promise<void> {
  await storage.set("proxyCredentials", null);
}
```

Secure Credential Storage {#secure-credential-storage}

```ts
// background/secure-credentials.ts
// Note: For production, consider using chrome.storage.session for sensitive data
// or chrome.identity for OAuth-based authentication

import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  // Store in session to minimize persistence of sensitive data
  sessionCredentials: {
    type: "object",
    default: null as { username: string; password: string } | null
  },
  // For auto-reconnect feature - encrypted in production
  rememberCredentials: {
    type: "boolean",
    default: false
  }
});

const storage = createStorage(schema);

export async function saveCredentials(
  username: string, 
  password: string,
  remember: boolean = false
): Promise<void> {
  await storage.set({
    sessionCredentials: { username, password },
    rememberCredentials: remember
  });
}

export async function getCredentials(): Promise<{ username: string; password: string } | null> {
  const { sessionCredentials } = await storage.get("sessionCredentials");
  return sessionCredentials;
}

export async function clearCredentials(): Promise<void> {
  await storage.set({
    sessionCredentials: null,
    rememberCredentials: false
  });
}
```

---

Pattern 7: Proxy Error Handling {#pattern-7-proxy-error-handling}

Handle proxy failures gracefully with fallbacks and user notifications.

Proxy Error Listener {#proxy-error-listener}

```ts
// background/proxy-error-handler.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  fallbackToDirect: { type: "boolean", default: true },
  notifyOnError: { type: "boolean", default: true },
  lastError: { type: "string", default: "" }
});

const storage = createStorage(schema);

type ProxyErrorType = 
  | " ERR_PROXY_CONNECTION_FAILED"
  | " ERR_PROXY_AUTH_REQUIRED"
  | " ERR_PROXY_AUTH_CHALLENGE"
  | " ERR_PROXY_NEED_FALLBACK";

export interface ProxyErrorEvent {
  error: string;
  details?: string;
}

export function setupProxyErrorListener(): void {
  chrome.proxy.onProxyError.addListener(async (details) => {
    console.error("Proxy error:", details.error);
    
    await storage.set("lastError", details.error);
    
    const { fallbackToDirect, notifyOnError } = await storage.get(
      "fallbackToDirect",
      "notifyOnError"
    );

    if (fallbackToDirect) {
      await fallbackToDirectConnection();
    }

    if (notifyOnError) {
      await notifyUserOfError(details.error);
    }
  });
}

async function fallbackToDirectConnection(): Promise<void> {
  console.log("Falling back to direct connection");
  
  await chrome.proxy.settings.set({
    value: { mode: "direct" },
    scope: "regular"
  });
}

async function notifyUserOfError(error: string): Promise<void> {
  // Use notifications API
  await chrome.notifications.create({
    type: "basic",
    iconPath: "images/icon-error.png",
    title: "Proxy Error",
    message: `Connection failed: ${error}. Switched to direct connection.`,
    priority: 2
  });
}

export async function testProxyConnection(
  host: string, 
  port: number
): Promise<{ success: boolean; latency?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    // Create a test request through the proxy
    const response = await fetch("https://www.google.com/generate_204", {
      method: "HEAD",
      mode: "no-cors"
    });
    
    const latency = Date.now() - startTime;
    
    return { success: true, latency };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
```

Auto-Retry After Auth {#auto-retry-after-auth}

```ts
// background/proxy-retry.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  retryCount: { type: "number", default: 0 },
  maxRetries: { type: "number", default: 3 }
});

const storage = createStorage(schema);

export async function handleProxyAuthFailure(): Promise<void> {
  const { retryCount, maxRetries } = await storage.get("retryCount", "maxRetries");
  
  if (retryCount < maxRetries) {
    await storage.set("retryCount", retryCount + 1);
    
    // Notify user to check credentials
    await chrome.notifications.create({
      type: "basic",
      iconPath: "images/icon-warning.png",
      title: "Proxy Authentication Required",
      message: `Please update your proxy credentials (attempt ${retryCount + 1}/${maxRetries})`,
      priority: 2
    });
  } else {
    // Max retries reached
    await storage.set("retryCount", 0);
    
    await chrome.notifications.create({
      type: "basic",
      iconPath: "images/icon-error.png",
      title: "Proxy Authentication Failed",
      message: "Maximum retry attempts reached. Please check your credentials.",
      priority: 2
    });
  }
}

// Reset retry count on successful connection
export async function onSuccessfulConnection(): Promise<void> {
  await storage.set("retryCount", 0);
}
```

---

Pattern 8: Proxy Status UI {#pattern-8-proxy-status-ui}

Build user interfaces to display and control proxy settings.

Badge Indicator for Current State {#badge-indicator-for-current-state}

```ts
// background/proxy-status-badge.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  isEnabled: { type: "boolean", default: false },
  currentProxy: { 
    type: "string", 
    default: "" 
  },
  latency: { type: "number", default: 0 }
});

const storage = createStorage(schema);

type ProxyStatus = "enabled" | "disabled" | "error" | "testing";

const STATUS_CONFIG: Record<ProxyStatus, { text: string; color: string }> = {
  enabled: { text: "PROXY", color: "#4CAF50" },
  disabled: { text: "OFF", color: "#9E9E9E" },
  error: { text: "ERR", color: "#F44336" },
  testing: { text: "...", color: "#FF9800" }
};

export async function updateStatusBadge(status: ProxyStatus): Promise<void> {
  const config = STATUS_CONFIG[status];
  
  await chrome.action.setBadgeText({ text: config.text });
  await chrome.action.setBadgeBackgroundColor({ color: config.color });
}

export async function showProxyLatency(latency: number): Promise<void> {
  let text: string;
  
  if (latency < 100) {
    text = latency.toString(); // Show actual ms
  } else if (latency < 1000) {
    text = `${Math.round(latency / 100)}h`; // Hundreds
  } else {
    text = `${Math.round(latency / 1000)}s`; // Seconds
  }
  
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  await storage.set("latency", latency);
}
```

Popup with Proxy Details {#popup-with-proxy-details}

```ts
// popup/proxy-popup.ts
// Note: This is the frontend component - runs in popup context

interface PopupState {
  isEnabled: boolean;
  currentProxy: string;
  profileName: string;
  latency: number;
  bypassList: string[];
}

async function loadState(): Promise<PopupState> {
  const [proxyConfig, storageData] = await Promise.all([
    chrome.proxy.settings.get({ incognito: false }),
    chrome.storage.local.get([
      "isEnabled",
      "activeProfileId",
      "profiles",
      "latency"
    ])
  ]);

  const config = proxyConfig.value as any;
  const isEnabled = config?.mode !== "direct";
  
  let currentProxy = "";
  let bypassList: string[] = [];
  
  if (config?.rules?.singleProxy) {
    const { scheme, host, port } = config.rules.singleProxy;
    currentProxy = `${scheme}://${host}:${port}`;
    bypassList = config.rules.bypassList || [];
  }

  const profileName = storageData.activeProfileId || "None";

  return {
    isEnabled,
    currentProxy,
    profileName,
    latency: storageData.latency || 0,
    bypassList
  };
}

function renderPopup(state: PopupState): void {
  const container = document.getElementById("proxy-status");
  if (!container) return;

  container.innerHTML = `
    <div class="proxy-status ${state.isEnabled ? 'enabled' : 'disabled'}">
      <div class="status-row">
        <span class="label">Status:</span>
        <span class="value ${state.isEnabled ? 'on' : 'off'}">
          ${state.isEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>
      
      ${state.isEnabled ? `
        <div class="status-row">
          <span class="label">Profile:</span>
          <span class="value">${state.profileName}</span>
        </div>
        
        <div class="status-row">
          <span class="label">Proxy:</span>
          <span class="value proxy-url">${state.currentProxy}</span>
        </div>
        
        <div class="status-row">
          <span class="label">Latency:</span>
          <span class="value">${state.latency}ms</span>
        </div>
        
        <div class="status-row">
          <span class="label">Bypass:</span>
          <span class="value">${state.bypassList.length} rules</span>
        </div>
      ` : ''}
    </div>
  `;
}

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  const state = await loadState();
  renderPopup(state);
});
```

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 16px; font-family: system-ui; }
    .proxy-status { display: flex; flex-direction: column; gap: 12px; }
    .status-row { display: flex; justify-content: space-between; }
    .label { font-weight: 600; color: #666; }
    .value.on { color: #4CAF50; }
    .value.off { color: #9E9E9E; }
    .proxy-url { font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <h2>Proxy Status</h2>
  <div id="proxy-status">Loading...</div>
  <button id="toggle-btn">Toggle Proxy</button>
  <script src="popup.js" type="module"></script>
</body>
</html>
```

Quick-Switch Dropdown {#quick-switch-dropdown}

```ts
// popup/quick-switch.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  profiles: { type: "array", default: [] },
  activeProfileId: { type: "string", default: "" }
});

const storage = createStorage(schema);

function renderProfileSelector(profiles: any[], activeId: string): void {
  const select = document.getElementById("profile-select") as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = `
    <option value="">Direct (No Proxy)</option>
    ${profiles.map(profile => `
      <option value="${profile.id}" ${profile.id === activeId ? "selected" : ""}>
        ${profile.name}
      </option>
    `).join("")}
  `;

  select.addEventListener("change", async (e) => {
    const profileId = (e.target as HTMLSelectElement).value;
    
    if (profileId) {
      // Activate profile
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
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
    } else {
      // Direct connection
      await chrome.proxy.settings.set({
        value: { mode: "direct" },
        scope: "regular"
      });
    }

    await storage.set("activeProfileId", profileId);
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  const { profiles, activeProfileId } = await storage.get("profiles", "activeProfileId");
  renderProfileSelector(profiles, activeProfileId);
});
```

---

Summary Table {#summary-table}

| Pattern | Use Case | Key API | Complexity |
|---------|----------|---------|------------|
| Pattern 1: Configuration Types | Understanding available proxy modes | `chrome.proxy.settings.set()` | Low |
| Pattern 2: Fixed Proxy | Simple single proxy setup | `mode: "fixed_servers"` | Low |
| Pattern 3: PAC Script | Dynamic proxy routing | `mode: "pac_script"` | Medium |
| Pattern 4: Bypass Rules | Exclude specific traffic | `bypassList` array | Low |
| Pattern 5: Dynamic Switching | Toggle/switch profiles | Storage + `onClicked` | Medium |
| Pattern 6: Authentication | Handle auth challenges | `onAuthRequired` | Medium |
| Pattern 7: Error Handling | Fallback on failures | `onProxyError` | Medium |
| Pattern 8: Status UI | User interface | `action` API + popup | Low |

Quick Reference {#quick-reference}

```ts
// Essential API calls
chrome.proxy.settings.set({ value: config, scope: "regular" });
chrome.proxy.settings.get({ incognito: false }, callback);
chrome.proxy.onProxyError.addListener(callback);
chrome.webRequest.onAuthRequired.addListener(callback, { urls: ["<all_urls>"] }, ["asyncBlocking"]);
```

Storage Integration {#storage-integration}

Always use `@theluckystrike/webext-storage` for persisting proxy configurations:

```ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  isEnabled: { type: "boolean", default: false },
  activeProfileId: { type: "string", default: "" },
  profiles: { type: "array", default: [] }
});

const storage = createStorage(schema);
```

Common Pitfalls {#common-pitfalls}

1. Missing permissions: Always include `"proxy"` permission in manifest
2. Scope confusion: Use `"regular"` for normal profiles, `"incognito"` for private windows
3. Auth handling: Remember to use `"asyncBlocking"` for auth listeners
4. Bypass patterns: Test thoroughly - `<local>` works differently than expected
5. Error handling: Always provide fallback (direct connection) when proxy fails
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
