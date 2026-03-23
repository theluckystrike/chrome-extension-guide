---
layout: default
title: "Chrome Extension Enterprise Policies. Best Practices"
description: "Support enterprise deployment with Chrome policies."
canonical_url: "https://bestchromeextensions.com/patterns/enterprise-policies/"
---

Enterprise Policy Patterns for Chrome Extensions

Enterprise environments impose strict requirements on Chrome extensions: managed configuration, forced installation, policy-driven feature flags, and compliance logging. This guide covers eight patterns for building extensions that integrate cleanly with Google Admin Console and enterprise policy infrastructure.

> Cross-references: [Security Hardening](../guides/security-hardening.md) | [Management Permission](../permissions/management.md)

---

1. Detecting Managed/Enterprise Environment {#1-detecting-managedenterprise-environment}

Determine at runtime whether your extension is running in a managed (enterprise) context so you can adjust behavior accordingly.

Chrome exposes `chrome.storage.managed` for enterprise-configured values. If the storage area is empty or inaccessible, the extension is running in an unmanaged environment. You can also check `chrome.runtime.id` against force-installed extension behavior or inspect the install type via `chrome.management.getSelf()`.

```typescript
// detect-managed.ts
interface ManagedEnvironment {
  isManaged: boolean;
  installType: chrome.management.ExtensionInstallType;
  policies: Record<string, unknown>;
}

async function detectManagedEnvironment(): Promise<ManagedEnvironment> {
  // Check install type first
  const self = await chrome.management.getSelf();
  const isForceInstalled =
    self.installType === "admin" || self.installType === "sideload";

  // Attempt to read managed storage
  let policies: Record<string, unknown> = {};
  let hasManagedStorage = false;

  try {
    policies = await chrome.storage.managed.get(null);
    hasManagedStorage = Object.keys(policies).length > 0;
  } catch {
    // chrome.storage.managed throws if no managed schema exists
    // or if the extension is not in a managed environment
    hasManagedStorage = false;
  }

  return {
    isManaged: isForceInstalled || hasManagedStorage,
    installType: self.installType,
    policies,
  };
}

// Usage in service worker
chrome.runtime.onInstalled.addListener(async () => {
  const env = await detectManagedEnvironment();
  if (env.isManaged) {
    console.log("Running in managed environment:", env.policies);
    await applyEnterprisePolicies(env.policies);
  }
});
```

Gotchas:
- `chrome.storage.managed.get()` throws an error (not an empty object) when no managed schema is defined or the extension is unmanaged. Always wrap in try/catch.
- `chrome.management.getSelf()` does not require the `management` permission. It is one of the few `chrome.management` methods (along with `getPermissionWarningsByManifest()` and `uninstallSelf()`) that works without declaring the permission.
- An extension can be managed (has policies) without being force-installed, and vice versa. Check both signals.

---

2. Reading Enterprise Policies with chrome.storage.managed {#2-reading-enterprise-policies-with-chromestoragemanaged}

Read and react to administrator-configured policies stored in Chrome's managed storage area.

Managed storage is a read-only storage area populated by IT administrators via Google Admin Console or Windows Group Policy. Your extension defines expected keys and types in a managed schema file, and administrators set the values. The extension reads them like any other storage area but cannot write to it.

```typescript
// managed-storage.ts
interface ExtensionPolicies {
  serverUrl: string;
  enableAnalytics: boolean;
  maxCacheSize: number;
  allowedDomains: string[];
  proxyConfig?: {
    host: string;
    port: number;
    auth: boolean;
  };
}

const POLICY_DEFAULTS: ExtensionPolicies = {
  serverUrl: "https://api.default.example.com",
  enableAnalytics: true,
  maxCacheSize: 50,
  allowedDomains: [],
};

async function readPolicies(): Promise<ExtensionPolicies> {
  try {
    const managed = await chrome.storage.managed.get(null);
    return { ...POLICY_DEFAULTS, ...managed } as ExtensionPolicies;
  } catch {
    // No managed storage available; use defaults
    return POLICY_DEFAULTS;
  }
}

/
 * Read a single policy with type safety.
 */
async function getPolicy<K extends keyof ExtensionPolicies>(
  key: K
): Promise<ExtensionPolicies[K]> {
  try {
    const result = await chrome.storage.managed.get(key);
    return (result[key] ?? POLICY_DEFAULTS[key]) as ExtensionPolicies[K];
  } catch {
    return POLICY_DEFAULTS[key];
  }
}

// Usage
const serverUrl = await getPolicy("serverUrl");
const allowedDomains = await getPolicy("allowedDomains");
```

Gotchas:
- Managed storage is strictly read-only. Calling `chrome.storage.managed.set()` will throw.
- Policy values can be any JSON-serializable type: strings, numbers, booleans, arrays, and nested objects. Define your schema carefully to match what admins will configure.
- If the administrator has not set a value for a key, it will be absent from the result even if the schema defines a default. Always merge with your own defaults.

---

3. Schema for Managed Storage (managed_schema.json) {#3-schema-for-managed-storage-managed-schemajson}

Define the structure of your managed storage so Google Admin Console and Chrome know what policies your extension accepts.

The `managed_schema.json` file (referenced from `manifest.json` under `storage.managed_schema`) uses JSON Schema format to declare every policy key, its type, description, and optional default. Chrome validates incoming policy values against this schema and ignores non-conforming values.

```typescript
// This is the manifest.json entry pointing to the schema:
// {
//   "storage": {
//     "managed_schema": "managed_schema.json"
//   }
// }

// managed_schema.json (not TypeScript, but shown here for completeness)
const managedSchema = {
  type: "object" as const,
  properties: {
    serverUrl: {
      title: "API Server URL",
      description: "The base URL for the backend API server.",
      type: "string",
      default: "https://api.default.example.com",
    },
    enableAnalytics: {
      title: "Enable Analytics",
      description: "Whether to send anonymous usage analytics.",
      type: "boolean",
      default: true,
    },
    maxCacheSize: {
      title: "Maximum Cache Size (MB)",
      description: "Maximum local cache size in megabytes.",
      type: "integer",
      minimum: 10,
      maximum: 500,
      default: 50,
    },
    allowedDomains: {
      title: "Allowed Domains",
      description: "List of domains where the extension is active.",
      type: "array",
      items: { type: "string" },
      default: [],
    },
    proxyConfig: {
      title: "Proxy Configuration",
      description: "Optional proxy server configuration.",
      type: "object",
      properties: {
        host: { type: "string" },
        port: { type: "integer", minimum: 1, maximum: 65535 },
        auth: { type: "boolean", default: false },
      },
      required: ["host", "port"],
    },
  },
};

/
 * Validate policies at runtime against expected types.
 * Useful as a safety net even though Chrome validates the schema.
 */
function validatePolicies(
  policies: Record<string, unknown>
): string[] {
  const errors: string[] = [];

  if (policies.serverUrl && typeof policies.serverUrl !== "string") {
    errors.push("serverUrl must be a string");
  }
  if (
    policies.maxCacheSize &&
    (typeof policies.maxCacheSize !== "number" ||
      policies.maxCacheSize < 10 ||
      policies.maxCacheSize > 500)
  ) {
    errors.push("maxCacheSize must be an integer between 10 and 500");
  }
  if (
    policies.allowedDomains &&
    !Array.isArray(policies.allowedDomains)
  ) {
    errors.push("allowedDomains must be an array of strings");
  }

  return errors;
}
```

Gotchas:
- The schema file must be valid JSON, not JSONC (no comments). Chrome silently ignores a malformed schema.
- The `type` field must use JSON Schema types: `"string"`, `"integer"`, `"number"`, `"boolean"`, `"array"`, `"object"`. Using TypeScript types will fail.
- Properties not listed in the schema are silently dropped. If an admin sets a key that is not in your schema, it will not appear in `chrome.storage.managed.get()`.
- Nested objects (like `proxyConfig` above) require their own `properties` declaration and can have `required` fields.

---

4. Force-Installed Extension Behavior {#4-force-installed-extension-behavior}

Handle the unique constraints and capabilities of extensions that are force-installed by enterprise policy.

Force-installed extensions (install type `"admin"`) cannot be uninstalled by the user, may have elevated permissions granted by policy, and should behave more conservatively (no onboarding flows, no review prompts). They may also receive different update schedules controlled by the organization.

```typescript
// force-install.ts
interface ForceInstallConfig {
  skipOnboarding: boolean;
  hideUninstallOption: boolean;
  suppressRatingPrompts: boolean;
  respectPolicyPermissions: boolean;
}

async function getForceInstallConfig(): Promise<ForceInstallConfig> {
  const self = await chrome.management.getSelf();
  const isForceInstalled = self.installType === "admin";

  return {
    skipOnboarding: isForceInstalled,
    hideUninstallOption: isForceInstalled,
    suppressRatingPrompts: isForceInstalled,
    respectPolicyPermissions: isForceInstalled,
  };
}

/
 * Adapt the extension's first-run experience based on install type.
 */
async function handleFirstRun(): Promise<void> {
  const config = await getForceInstallConfig();

  if (config.skipOnboarding) {
    // Force-installed: apply defaults silently, log to admin console
    const policies = await chrome.storage.managed.get(null);
    await chrome.storage.local.set({
      setupComplete: true,
      configSource: "enterprise-policy",
      ...policies,
    });
    console.log("Enterprise setup completed automatically");
    return;
  }

  // User-installed: show onboarding flow
  await chrome.tabs.create({
    url: chrome.runtime.getURL("onboarding.html"),
  });
}

/
 * Check if specific permissions were granted by policy.
 * Policy-granted permissions cannot be revoked by the user.
 */
async function checkPolicyPermissions(): Promise<{
  granted: string[];
  revocable: boolean;
}> {
  const permissions = await chrome.permissions.getAll();
  const self = await chrome.management.getSelf();

  return {
    granted: permissions.permissions ?? [],
    // Policy-granted permissions on force-installed extensions
    // are not revocable by the user
    revocable: self.installType !== "admin",
  };
}
```

Gotchas:
- Force-installed extensions still go through `chrome.runtime.onInstalled` but the user never sees Chrome Web Store install UI. Do not assume the user initiated the install.
- The `"admin"` install type covers both Google Admin Console deployments and Windows Group Policy / macOS configuration profile deployments.
- Force-installed extensions can be granted host permissions via policy (`runtime_allowed_hosts`), bypassing the normal permission prompt. Your extension should still validate it has the permissions before using them.

---

5. Policy-Based Feature Flags {#5-policy-based-feature-flags}

Use managed storage policies to enable or disable features, allowing IT administrators to customize extension behavior per organization.

Feature flags via managed storage give admins granular control without requiring extension updates. Define each feature as a boolean or enum policy, read the values at startup, and gate functionality accordingly. Cache the resolved flags in local storage for fast synchronous access in content scripts.

```typescript
// feature-flags.ts
interface FeatureFlags {
  enableScreenCapture: boolean;
  enableClipboardAccess: boolean;
  enableExternalSharing: boolean;
  dataSyncMode: "off" | "local" | "cloud";
  uiTheme: "system" | "light" | "dark";
  maxFileUploadMB: number;
}

const DEFAULT_FLAGS: FeatureFlags = {
  enableScreenCapture: false,
  enableClipboardAccess: true,
  enableExternalSharing: true,
  dataSyncMode: "cloud",
  uiTheme: "system",
  maxFileUploadMB: 25,
};

class PolicyFeatureFlags {
  private flags: FeatureFlags = { ...DEFAULT_FLAGS };
  private listeners: Set<(flags: FeatureFlags) => void> = new Set();

  async initialize(): Promise<void> {
    await this.loadFlags();

    // Listen for policy changes pushed by admin
    chrome.storage.managed.onChanged.addListener((changes) => {
      this.applyChanges(changes);
    });
  }

  private async loadFlags(): Promise<void> {
    try {
      const policies = await chrome.storage.managed.get(null);
      this.flags = { ...DEFAULT_FLAGS, ...policies } as FeatureFlags;
    } catch {
      this.flags = { ...DEFAULT_FLAGS };
    }

    // Cache in local storage for content script access
    await chrome.storage.local.set({ featureFlags: this.flags });
    this.notifyListeners();
  }

  private applyChanges(
    changes: Record<string, chrome.storage.StorageChange>
  ): void {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in this.flags) {
        (this.flags as Record<string, unknown>)[key] = newValue;
      }
    }
    chrome.storage.local.set({ featureFlags: this.flags });
    this.notifyListeners();
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    const value = this.flags[flag];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value !== "off";
    return true;
  }

  get<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
    return this.flags[key];
  }

  onChange(listener: (flags: FeatureFlags) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener({ ...this.flags });
    }
  }
}

// Singleton
export const featureFlags = new PolicyFeatureFlags();
```

Gotchas:
- By default, content scripts can access `chrome.storage.managed` (as well as `local` and `sync`). However, this can be restricted by calling `chrome.storage.managed.setAccessLevel()`. If you need to ensure content scripts always have access regardless of access level settings, caching the resolved flags in `chrome.storage.local` is a safe fallback strategy.
- Policy changes can arrive at any time (e.g., when the admin pushes a new configuration). Always listen for `onChanged` and react dynamically.
- Validate enum-type flags against known values. If an admin sets an unexpected string, fall back to the default rather than crashing.

---

6. Enterprise Extension Deployment via Google Admin Console {#6-enterprise-extension-deployment-via-google-admin-console}

Structure your extension for deployment through Google Workspace admin controls.

Google Admin Console allows IT administrators to force-install, pin, or block extensions for their organization. Your extension must be published to the Chrome Web Store (public, unlisted, or private). The admin configures the extension ID, update URL, and managed policies through the Admin Console or a JSON policy file.

```typescript
// deployment-config.ts

/
 * Generate the policy JSON template that IT admins paste into
 * Google Admin Console under Apps > Chrome > Apps & Extensions.
 *
 * This is documentation/tooling, not runtime code.
 */
function generatePolicyTemplate(extensionId: string): object {
  return {
    [extensionId]: {
      installation_mode: "force_installed",
      update_url:
        "https://clients2.google.com/service/update2/crx",
      policy: {
        serverUrl: "https://api.corp.example.com",
        enableAnalytics: false,
        maxCacheSize: 100,
        allowedDomains: ["*.corp.example.com", "*.internal.example.com"],
        proxyConfig: {
          host: "proxy.corp.example.com",
          port: 8080,
          auth: true,
        },
      },
    },
  };
}

/
 * Self-report deployment information for admin dashboards.
 */
async function reportDeploymentInfo(): Promise<{
  extensionId: string;
  version: string;
  installType: string;
  platform: string;
  chromeVersion: string;
}> {
  const manifest = chrome.runtime.getManifest();
  const self = await chrome.management.getSelf();
  const platformInfo = await chrome.runtime.getPlatformInfo();

  const info = {
    extensionId: chrome.runtime.id,
    version: manifest.version,
    installType: self.installType,
    platform: `${platformInfo.os}_${platformInfo.arch}`,
    chromeVersion: navigator.userAgent.match(
      /Chrome\/(\d+\.\d+\.\d+\.\d+)/
    )?.[1] ?? "unknown",
  };

  return info;
}

/
 * Verify the extension is running from the expected source.
 * Prevents sideloaded copies from connecting to corporate APIs.
 */
function verifyDeploymentIntegrity(): boolean {
  const expectedId = "abcdefghijklmnopqrstuvwxyz012345"; // your CWS ID
  const currentId = chrome.runtime.id;

  if (currentId !== expectedId) {
    console.error(
      "Extension is not running from the expected source.",
      `Expected: ${expectedId}, Got: ${currentId}`
    );
    return false;
  }
  return true;
}
```

Gotchas:
- The `update_url` for Chrome Web Store extensions is always `https://clients2.google.com/service/update2/crx`. For self-hosted extensions (rare in enterprise), you must provide your own update XML endpoint.
- Extensions published as "Private" in Chrome Web Store are only visible to users in the publisher's Google Workspace domain. This is the recommended distribution for internal enterprise tools.
- Extension IDs change between development (unpacked) and production (CWS). Do not hardcode IDs in policy templates without noting this distinction.

---

7. Reporting and Compliance Logging {#7-reporting-and-compliance-logging}

Log extension activity for enterprise audit trails and compliance monitoring.

Enterprise environments require detailed audit logs: who did what, when, and what policies were in effect. Your extension should log significant actions to an enterprise logging endpoint. The logging infrastructure must be resilient (queue and retry on network failure) and respectful of privacy policies.

```typescript
// compliance-logger.ts
interface AuditEntry {
  timestamp: string;
  action: string;
  userId?: string;
  details: Record<string, unknown>;
  policySnapshot: Record<string, unknown>;
  extensionVersion: string;
}

class ComplianceLogger {
  private queue: AuditEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private endpoint: string = "";

  async initialize(): Promise<void> {
    try {
      const policies = await chrome.storage.managed.get([
        "serverUrl",
        "enableAnalytics",
      ]);
      this.endpoint = `${policies.serverUrl}/api/v1/audit`;
    } catch {
      // No managed storage; logging is disabled
      return;
    }

    // Restore any queued entries from previous session
    const stored = await chrome.storage.local.get("auditQueue");
    if (stored.auditQueue) {
      this.queue = stored.auditQueue;
    }

    // Flush every 30 seconds
    this.flushInterval = setInterval(() => this.flush(), 30_000);
  }

  async log(action: string, details: Record<string, unknown>): Promise<void> {
    if (!this.endpoint) return;

    let policySnapshot: Record<string, unknown> = {};
    try {
      policySnapshot = await chrome.storage.managed.get(null);
    } catch {
      // continue without policy snapshot
    }

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      policySnapshot,
      extensionVersion: chrome.runtime.getManifest().version,
    };

    this.queue.push(entry);

    // Persist queue to survive service worker termination
    await chrome.storage.local.set({ auditQueue: this.queue });

    // Flush immediately if queue is large
    if (this.queue.length >= 50) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0 || !this.endpoint) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: batch }),
      });

      if (!response.ok) {
        // Put entries back in queue for retry
        this.queue = [...batch, ...this.queue];
      }
    } catch {
      // Network error; restore queue
      this.queue = [...batch, ...this.queue];
    }

    await chrome.storage.local.set({ auditQueue: this.queue });
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// Singleton
export const complianceLogger = new ComplianceLogger();

// Usage
// complianceLogger.log("settings_changed", { key: "theme", oldValue: "light", newValue: "dark" });
// complianceLogger.log("data_exported", { format: "csv", recordCount: 1250 });
```

Gotchas:
- Service workers can be terminated at any time. Persist the audit queue to `chrome.storage.local` after every write so entries survive restarts.
- Do not log sensitive user data (passwords, tokens, PII) unless your organization's privacy policy explicitly permits it and the data is encrypted in transit and at rest.
- Rate-limit your logging endpoint calls. Batching entries and flushing on an interval (rather than per-event) prevents overwhelming the server and the extension's network budget.
- The `fetch()` API in service workers does not support `keepalive` in all cases. For critical final flushes, consider using `navigator.sendBeacon()` from a content script.

---

8. Handling Policy Changes at Runtime {#8-handling-policy-changes-at-runtime}

React to real-time policy updates pushed by administrators without requiring extension restart.

When an administrator changes a policy in Google Admin Console, Chrome propagates the change to the device on its next policy sync (typically within minutes). The `chrome.storage.managed.onChanged` event fires when policies update. Your extension should handle these changes gracefully, applying them immediately where possible and notifying the user when a restart is required.

```typescript
// policy-change-handler.ts
type PolicyChangeHandler = (
  key: string,
  oldValue: unknown,
  newValue: unknown
) => void | Promise<void>;

class PolicyChangeManager {
  private handlers = new Map<string, PolicyChangeHandler[]>();
  private globalHandlers: PolicyChangeHandler[] = [];

  initialize(): void {
    chrome.storage.managed.onChanged.addListener(
      (changes: Record<string, chrome.storage.StorageChange>) => {
        this.handleChanges(changes);
      }
    );
  }

  /
   * Register a handler for changes to a specific policy key.
   */
  on(key: string, handler: PolicyChangeHandler): () => void {
    const handlers = this.handlers.get(key) ?? [];
    handlers.push(handler);
    this.handlers.set(key, handlers);

    return () => {
      const current = this.handlers.get(key) ?? [];
      this.handlers.set(
        key,
        current.filter((h) => h !== handler)
      );
    };
  }

  /
   * Register a handler for any policy change.
   */
  onAny(handler: PolicyChangeHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      this.globalHandlers = this.globalHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  private async handleChanges(
    changes: Record<string, chrome.storage.StorageChange>
  ): Promise<void> {
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(`Policy changed: ${key}`, { oldValue, newValue });

      // Fire key-specific handlers
      const keyHandlers = this.handlers.get(key) ?? [];
      for (const handler of keyHandlers) {
        try {
          await handler(key, oldValue, newValue);
        } catch (error) {
          console.error(`Policy handler error for "${key}":`, error);
        }
      }

      // Fire global handlers
      for (const handler of this.globalHandlers) {
        try {
          await handler(key, oldValue, newValue);
        } catch (error) {
          console.error("Global policy handler error:", error);
        }
      }
    }
  }
}

// Setup
const policyManager = new PolicyChangeManager();
policyManager.initialize();

// Handle server URL changes: reconnect to new backend
policyManager.on("serverUrl", async (_key, _old, newValue) => {
  await reinitializeApiClient(newValue as string);
});

// Handle domain allowlist changes: update content script matching
policyManager.on("allowedDomains", async (_key, _old, newValue) => {
  const domains = newValue as string[];
  await chrome.storage.local.set({ allowedDomains: domains });
  // Notify all active content scripts
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "POLICY_UPDATE",
        key: "allowedDomains",
        value: domains,
      }).catch(() => {
        // Tab may not have content script injected
      });
    }
  }
});

// Log all policy changes for compliance
policyManager.onAny(async (key, oldValue, newValue) => {
  await complianceLogger.log("policy_changed", {
    key,
    oldValue,
    newValue,
  });
});
```

Gotchas:
- `chrome.storage.managed.onChanged` does not fire on extension startup. You must do an initial read via `chrome.storage.managed.get()` to establish the baseline state.
- Policy sync timing is controlled by Chrome and the enterprise admin console, not by your extension. Changes can take several minutes to propagate after an admin makes them.
- Some policy changes (e.g., switching API endpoints or disabling major features) may require notifying the user. Use `chrome.notifications` to display a non-intrusive message rather than silently changing behavior.
- If multiple policies change simultaneously (common when an admin updates a policy bundle), they arrive as a single `onChanged` event with multiple keys. Process all changes in the same batch to maintain consistency.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
