# Chrome Extension Management API Patterns

## Overview

The Chrome Management API (`chrome.management`) provides powerful capabilities for managing installed extensions and applications within the browser. This API enables developers to build extension managers, audit installed software, enforce policies, and respond to extension lifecycle events. This guide covers eight practical patterns for leveraging the Management API effectively in your extensions.

**Required Permission:** `"management"` must be declared in your extension's `manifest.json`:

```json
{
  "permissions": ["management"]
}
```

Note: The Management API is not available in content scripts—only in background scripts, popup pages, options pages, and other extension contexts.

---

## Pattern 1: Management API Basics

The Management API provides three core methods for retrieving extension information:

### chrome.management.getAll() — List All Extensions

Retrieve information about every installed extension, app, and theme:

```ts
// management-basic.ts
interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  disabledReason?: chrome.management.DisabledReason;
  type: "extension" | "theme" | "app" | "hosted_app";
  appLaunchUrl?: string;
  homepageUrl?: string;
  updateUrl?: string;
  offlineEnabled: boolean;
  icons?: Array<{ size: number; url: string }>;
  permissions: string[];
  hostPermissions: string[];
  installType: "development" | "normal" | "sideload" | "other";
  mayDisable: boolean;
  mayEnable: boolean;
  enabledVariations?: string[];
  disabledVariations?: string[];
}

async function getAllExtensions(): Promise<ExtensionInfo[]> {
  const extensions = await chrome.management.getAll();
  // Filter out the extension itself to avoid self-reference
  const currentId = chrome.runtime.id;
  return extensions.filter((ext) => ext.id !== currentId);
}
```

### chrome.management.get(extensionId) — Get Specific Extension

Retrieve detailed information about a single extension by its ID:

```ts
// management-get.ts
async function getExtensionInfo(extensionId: string): Promise<ExtensionInfo | null> {
  try {
    const info = await chrome.management.get(extensionId);
    return info;
  } catch (error) {
    console.error(`Extension not found: ${extensionId}`, error);
    return null;
  }
}

// Usage: Get info about a known extension
const info = await getExtensionInfo("gfjoidjioffllmkbjhcffnmfpjjhplph");
if (info) {
  console.log(`${info.name} v${info.version} is ${info.enabled ? "enabled" : "disabled"}`);
}
```

### chrome.management.getSelf() — Get Current Extension Info

Use this to understand your own extension's properties at runtime:

```ts
// management-self.ts
async function getSelfInfo(): Promise<ExtensionInfo> {
  const self = await chrome.management.getSelf();
  
  console.log(`Extension: ${self.name}`);
  console.log(`Version: ${self.version}`);
  console.log(`Install type: ${self.installType}`);
  console.log(`May disable: ${self.mayDisable}`);
  
  return self;
}

// Check if extension was force-installed by enterprise policy
function isForceInstalled(): boolean {
  return chrome.management.getSelf().then(
    (self) => self.installType === "sideload"
  );
}
```

**Key insight:** The `installType` property reveals how the extension was installed:
- `"development"` — Loaded as unpacked extension
- `"normal"` — Installed from Chrome Web Store
- `"sideload"` — Installed by enterprise policy or external program
- `"other"` — Other installation methods

---

## Pattern 2: Extension Info Display

Build a user interface to display installed extensions with filtering and sorting:

### Display Extensions in Popup

```ts
// extension-list.ts
interface DisplayableExtension {
  id: string;
  name: string;
  version: string;
  iconUrl: string | null;
  enabled: boolean;
  type: string;
}

function getDisplayableExtension(info: chrome.management.ExtensionInfo): DisplayableExtension {
  return {
    id: info.id,
    name: info.name,
    version: info.version,
    iconUrl: info.icons?.[0]?.url ?? null,
    enabled: info.enabled,
    type: info.type,
  };
}

async function renderExtensionList(
  container: HTMLElement,
  filter?: { type?: string; enabled?: boolean }
): Promise<void> {
  const extensions = await chrome.management.getAll();
  
  let filtered = extensions.filter((ext) => ext.id !== chrome.runtime.id);
  
  if (filter?.type) {
    filtered = filtered.filter((ext) => ext.type === filter.type);
  }
  
  if (filter?.enabled !== undefined) {
    filtered = filtered.filter((ext) => ext.enabled === filter.enabled);
  }
  
  container.innerHTML = filtered.map((ext) => {
    const display = getDisplayableExtension(ext);
    return `
      <div class="extension-item ${display.enabled ? "enabled" : "disabled"}">
        <img src="${display.iconUrl || "placeholder.png"}" alt="" width="32" height="32" />
        <div class="extension-info">
          <div class="extension-name">${display.name}</div>
          <div class="extension-meta">v${display.version} · ${display.type}</div>
        </div>
        <span class="status-badge">${display.enabled ? "Active" : "Disabled"}</span>
      </div>
    `;
  }).join("");
}
```

### Filter by Extension Type

```ts
// filter-types.ts
type ExtensionType = "extension" | "theme" | "app" | "hosted_app";

function filterByType(extensions: chrome.management.ExtensionInfo[], type: ExtensionType): chrome.management.ExtensionInfo[] {
  return extensions.filter((ext) => ext.type === type);
}

// Example: Get only regular extensions (not themes or apps)
async function getOnlyExtensions(): Promise<chrome.management.ExtensionInfo[]> {
  const all = await chrome.management.getAll();
  return filterByType(all, "extension");
}

// Count by type
async function getExtensionCounts(): Promise<Record<ExtensionType, number>> {
  const all = await chrome.management.getAll();
  
  const counts: Record<ExtensionType, number> = {
    extension: 0,
    theme: 0,
    app: 0,
    hosted_app: 0,
  };
  
  for (const ext of all) {
    if (ext.type in counts) {
      counts[ext.type as ExtensionType]++;
    }
  }
  
  return counts;
}
```

---

## Pattern 3: Enable/Disable Extensions

Build a full-featured extension manager with enable/disable capabilities:

### Basic Toggle Functionality

```ts
// toggle-extension.ts
async function toggleExtension(extensionId: string, enable: boolean): Promise<boolean> {
  try {
    await chrome.management.setEnabled(extensionId, enable);
    return true;
  } catch (error) {
    console.error(`Failed to ${enable ? "enable" : "disable"} extension:`, error);
    return false;
  }
}

// Check if extension can be toggled
async function canToggle(extensionId: string): Promise<boolean> {
  const info = await chrome.management.get(extensionId);
  return info.mayDisable || info.mayEnable;
}
```

### Context-Aware Profile Management

```ts
// profile-manager.ts
import { Storage } from "@theluckystrike/webext-storage";

interface ExtensionProfile {
  id: string;
  name: string;
  enabledIds: string[];
}

const storage = new Storage<{ profiles: ExtensionProfile[]; activeProfile: string }>();

const DEFAULT_PROFILES: ExtensionProfile[] = [
  { id: "work", name: "Work", enabledIds: [] },
  { id: "personal", name: "Personal", enabledIds: [] },
];

async function initializeProfiles(): Promise<void> {
  const existing = await storage.get("profiles");
  if (!existing.profiles) {
    await storage.set("profiles", DEFAULT_PROFILES);
    await storage.set("activeProfile", "work");
  }
}

async function switchProfile(profileId: string): Promise<void> {
  const { profiles } = await storage.get("profiles");
  const profile = profiles.find((p) => p.id === profileId);
  
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }
  
  const allExtensions = await chrome.management.getAll();
  
  // Disable all extensions first
  for (const ext of allExtensions) {
    if (ext.id !== chrome.runtime.id && ext.enabled && ext.mayDisable) {
      await chrome.management.setEnabled(ext.id, false);
    }
  }
  
  // Enable extensions in the profile
  for (const extId of profile.enabledIds) {
    const ext = allExtensions.find((e) => e.id === extId);
    if (ext && !ext.enabled && ext.mayEnable) {
      await chrome.management.setEnabled(extId, true);
    }
  }
  
  await storage.set("activeProfile", profileId);
}

async function saveCurrentStateToProfile(profileId: string): Promise<void> {
  const { profiles } = await storage.get("profiles");
  const allExtensions = await chrome.management.getAll();
  
  const enabledIds = allExtensions
    .filter((ext) => ext.enabled && ext.id !== chrome.runtime.id)
    .map((ext) => ext.id);
  
  const profileIndex = profiles.findIndex((p) => p.id === profileId);
  if (profileIndex !== -1) {
    profiles[profileIndex].enabledIds = enabledIds;
    await storage.set("profiles", profiles);
  }
}
```

---

## Pattern 4: Extension Install/Uninstall Events

Monitor the extension ecosystem with lifecycle event listeners:

### Listening to Events

```ts
// lifecycle-events.ts
interface ExtensionEvent {
  id: string;
  name: string;
  type: chrome.management.ExtensionType;
  timestamp: number;
}

// Track installation events
chrome.management.onInstalled.addListener((extensionInfo: chrome.management.ExtensionInfo) => {
  const event: ExtensionEvent = {
    id: extensionInfo.id,
    name: extensionInfo.name,
    type: extensionInfo.type,
    timestamp: Date.now(),
  };
  
  console.log(`Extension installed: ${extensionInfo.name} (${extensionInfo.id})`);
  
  // Store event for history
  chrome.storage.local.get("installHistory", (result) => {
    const history = result.installHistory || [];
    history.push(event);
    // Keep last 100 events
    if (history.length > 100) {
      history.shift();
    }
    chrome.storage.local.set({ installHistory: history });
  });
});

// Track uninstallation events
chrome.management.onUninstalled.addListener((extensionId: string) => {
  console.log(`Extension uninstalled: ${extensionId}`);
  
  chrome.storage.local.get("uninstallHistory", (result) => {
    const history = result.uninstallHistory || [];
    history.push({ id: extensionId, timestamp: Date.now() });
    chrome.storage.local.set({ uninstallHistory: history });
  });
});

// Track enable/disable events
chrome.management.onEnabled.addListener((extensionInfo: chrome.management.ExtensionInfo) => {
  console.log(`Extension enabled: ${extensionInfo.name}`);
});

chrome.management.onDisabled.addListener((extensionInfo: chrome.management.ExtensionInfo) => {
  console.log(`Extension disabled: ${extensionInfo.name}`);
});
```

### Building an Activity Timeline

```ts
// activity-timeline.ts
interface ActivityEntry {
  type: "installed" | "uninstalled" | "enabled" | "disabled";
  extensionId: string;
  extensionName: string;
  timestamp: number;
}

async function getExtensionActivityTimeline(
  days: number = 30
): Promise<ActivityEntry[]> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  
  const [installs, uninstalls] = await Promise.all([
    chrome.storage.local.get("installHistory"),
    chrome.storage.local.get("uninstallHistory"),
  ]);
  
  const activities: ActivityEntry[] = [];
  
  for (const entry of (installs.installHistory || [])) {
    if (entry.timestamp >= since) {
      activities.push({
        type: "installed",
        extensionId: entry.id,
        extensionName: entry.name,
        timestamp: entry.timestamp,
      });
    }
  }
  
  for (const entry of (uninstalls.uninstallHistory || [])) {
    if (entry.timestamp >= since) {
      activities.push({
        type: "uninstalled",
        extensionId: entry.id,
        extensionName: "Unknown (previously uninstalled)",
        timestamp: entry.timestamp,
      });
    }
  }
  
  return activities.sort((a, b) => b.timestamp - a.timestamp);
}
```

---

## Pattern 5: Uninstall with Feedback

Collect feedback when users uninstall your extension:

### Self-Uninstall with Confirmation

```ts
// uninstall-self.ts
interface UninstallFeedback {
  reason: string;
  comments: string;
  email?: string;
}

async function uninstallWithFeedback(feedback: UninstallFeedback): Promise<void> {
  // Save feedback before uninstalling
  await chrome.storage.local.set({
    lastUninstallFeedback: {
      ...feedback,
      timestamp: Date.now(),
      version: (await chrome.management.getSelf()).version,
    },
  });
  
  // Trigger uninstall with confirmation dialog
  await chrome.management.uninstallSelf({ showConfirmDialog: true });
}

async function uninstallWithoutDialog(): Promise<void> {
  // Silent uninstall for programmatic use (e.g., after migration)
  await chrome.management.uninstallSelf({ showConfirmDialog: false });
}
```

### Setting Uninstall Redirect URL

Configure a redirect URL that opens when users uninstall your extension:

```ts
// uninstall-redirect.ts
// In your background script or entry point
const UNINSTALL_FEEDBACK_URL = "https://yourdomain.com/uninstall-feedback";

async function setUninstallURL(): Promise<void> {
  try {
    await chrome.runtime.setUninstallURL(UNINSTALL_FEEDBACK_URL);
    console.log("Uninstall URL set successfully");
  } catch (error) {
    console.error("Failed to set uninstall URL:", error);
  }
}

// Call on extension startup
setUninstallURL();
```

The uninstall URL can include query parameters:
```ts
const userId = "user123";
const feedbackUrl = `${UNINSTALL_FEEDBACK_URL}?uid=${userId}&v=${chrome.runtime.getManifest().version}`;
await chrome.runtime.setUninstallURL(feedbackUrl);
```

---

## Pattern 6: Extension Compatibility Checker

Build a tool to identify conflicts and problematic extensions:

### Detecting Duplicate Functionality

```ts
// compatibility-checker.ts
interface ExtensionConflict {
  id: string;
  name: string;
  issues: string[];
  riskLevel: "low" | "medium" | "high";
}

// Known extension categories based on keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "ad-blocker": ["adblock", "ad block", "ads blocker", "advertisement", "ublock"],
  "password-manager": ["password", "credential", "1password", "lastpass", "bitwarden"],
  "translator": ["translate", "translator", "language", "dictionary"],
  " VPN": ["vpn", "proxy", "tunnel", "wireguard"],
  "developer-tools": ["devtools", "developer", "inspector", "debugger"],
};

function categorizeExtension(name: string, permissions: string[]): string[] {
  const lowerName = name.toLowerCase();
  const categories: string[] = [];
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lowerName.includes(kw))) {
      categories.push(category);
    }
  }
  
  return categories;
}

async function checkForConflicts(): Promise<ExtensionConflict[]> {
  const allExtensions = await chrome.management.getAll();
  const extensions = allExtensions.filter((ext) => ext.id !== chrome.runtime.id);
  
  const conflicts: ExtensionConflict[] = [];
  const categoryMap = new Map<string, chrome.management.ExtensionInfo[]>();
  
  // Categorize each extension
  for (const ext of extensions) {
    const categories = categorizeExtension(ext.name, ext.permissions);
    for (const category of categories) {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(ext);
    }
  }
  
  // Find duplicates
  for (const [category, exts] of categoryMap) {
    if (exts.length > 1) {
      for (const ext of exts) {
        const issues = [`Potential conflict with ${exts.length - 1} other ${category} extensions`];
        conflicts.push({
          id: ext.id,
          name: ext.name,
          issues,
          riskLevel: "medium",
        });
      }
    }
  }
  
  return conflicts;
}
```

### Warning About Problematic Extensions

```ts
// problematic-extensions.ts
const KNOWN_PROBLEMATIC_PATTERNS = [
  { pattern: "null", reason: "May indicate malicious code" },
  { pattern: "crx", reason: "Unofficial distribution" },
];

const HIGH_RISK_PERMISSIONS = [
  "<all_urls>",
  "cookies",
  "webRequest",
  "webRequestBlocking",
  "debugger",
  "pageCapture",
  "tabCapture",
];

async function scanForRisks(): Promise<{
  extensions: chrome.management.ExtensionInfo[];
  warnings: string[];
}> {
  const allExtensions = await chrome.management.getAll();
  const warnings: string[] = [];
  
  const riskyExtensions = allExtensions.filter((ext) => {
    const hasHighRiskPerms = ext.permissions.some((p) => 
      HIGH_RISK_PERMISSIONS.includes(p)
    );
    
    if (hasHighRiskPerms) {
      warnings.push(`${ext.name} has high-risk permissions`);
    }
    
    return hasHighRiskPerms;
  });
  
  return { extensions: riskyExtensions, warnings };
}
```

---

## Pattern 7: Extension Permission Audit

Conduct comprehensive security audits of installed extensions:

### Permission Analysis

```ts
// permission-audit.ts
interface PermissionAuditResult {
  extensionId: string;
  extensionName: string;
  permissions: string[];
  hostPermissions: string[];
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  concerns: string[];
}

const PERMISSION_RISK_WEIGHTS: Record<string, number> = {
  "<all_urls>": 10,
  "cookies": 8,
  "webRequest": 8,
  "webRequestBlocking": 9,
  "debugger": 10,
  "pageCapture": 7,
  "tabCapture": 7,
  "history": 6,
  "bookmarks": 5,
  "management": 5,
  "tabs": 5,
  "activeTab": 2,
  "storage": 2,
  "alarms": 1,
  "contextMenus": 1,
};

function analyzePermissions(
  permissions: string[],
  hostPermissions: string[]
): { score: number; concerns: string[] } {
  let score = 0;
  const concerns: string[] = [];
  
  for (const perm of permissions) {
    const weight = PERMISSION_RISK_WEIGHTS[perm] || 1;
    score += weight;
    
    if (weight >= 5) {
      concerns.push(`High-risk permission: ${perm}`);
    }
  }
  
  for (const host of hostPermissions) {
    if (host === "<all_urls>" || host === "*://*/*") {
      score += 10;
      concerns.push("Access to all websites");
    } else if (host.includes("*")) {
      score += 3;
      concerns.push(`Broad host access: ${host}`);
    }
  }
  
  return { score, concerns };
}

async function auditAllPermissions(): Promise<PermissionAuditResult[]> {
  const allExtensions = await chrome.management.getAll();
  const results: PermissionAuditResult[] = [];
  
  for (const ext of allExtensions) {
    if (ext.id === chrome.runtime.id) continue;
    
    const { score, concerns } = analyzePermissions(
      ext.permissions,
      ext.hostPermissions
    );
    
    let riskLevel: "low" | "medium" | "high" = "low";
    if (score >= 15) riskLevel = "high";
    else if (score >= 5) riskLevel = "medium";
    
    results.push({
      extensionId: ext.id,
      extensionName: ext.name,
      permissions: ext.permissions,
      hostPermissions: ext.hostPermissions,
      riskScore: score,
      riskLevel,
      concerns,
    });
  }
  
  return results.sort((a, b) => b.riskScore - a.riskScore);
}
```

### Export Audit Report

```ts
// export-audit.ts
import { Storage } from "@theluckystrike/webext-storage";

interface AuditReport {
  generatedAt: number;
  totalExtensions: number;
  results: PermissionAuditResult[];
}

async function exportAuditReport(): Promise<string> {
  const results = await auditAllPermissions();
  
  const report: AuditReport = {
    generatedAt: Date.now(),
    totalExtensions: results.length,
    results,
  };
  
  // Export as JSON
  const json = JSON.stringify(report, null, 2);
  
  // Or create a CSV
  const csv = [
    "Extension,ID,Permissions,Risk Score,Risk Level,Concerns",
    ...results.map(
      (r) =>
        `"${r.extensionName}","${r.extensionId}","${r.permissions.join("; ")}",${r.riskScore},${r.riskLevel},"${r.concerns.join("; ")}"`
    ),
  ].join("\n");
  
  return csv;
}

async function saveAuditToStorage(): Promise<void> {
  const results = await auditAllRepositoriesultsaudit();
  await new Storage<{ lastAudit: AuditReport }>().set("lastAudit", {
    generatedAt: Date.now(),
    totalExtensions: results.length,
    results,
  });
}
```

---

## Pattern 8: Self-Management Patterns

Use Management API for your extension's own health checks and self-regulation:

### Version Checking and Health Checks

```ts
// self-management.ts
interface HealthCheckResult {
  isHealthy: boolean;
  version: string;
  installType: string;
  issues: string[];
}

async function performHealthCheck(): Promise<HealthCheckResult> {
  const self = await chrome.management.getSelf();
  const issues: string[] = [];
  
  // Check version (could compare against a minimum required version)
  const minVersion = "1.0.0";
  if (compareVersions(self.version, minVersion) < 0) {
    issues.push(`Version ${self.version} is below minimum ${minVersion}`);
  }
  
  // Check if disabled by administrator
  if (!self.mayDisable) {
    issues.push("Extension is force-installed by enterprise policy");
  }
  
  // Check storage quota
  const quota = await chrome.storage.local.getBytesInUse();
  const maxQuota = 10 * 1024 * 1024; // 10MB
  if (quota > maxQuota * 0.9) {
    issues.push(`Storage usage high: ${(quota / 1024 / 1024).toFixed(2)}MB`);
  }
  
  return {
    isHealthy: issues.length === 0,
    version: self.version,
    installType: self.installType,
    issues,
  };
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  return 0;
}
```

### Auto-Disable on Conditions

```ts
// auto-disable.ts
interface DisableCondition {
  check: () => Promise<boolean>;
  reason: string;
}

const DISABLE_CONDITIONS: DisableCondition[] = [
  {
    check: async () => {
      const battery = await navigator.getBattery?.();
      return battery?.level !== undefined && battery.level < 0.1 && !battery.charging;
    },
    reason: "Low battery mode",
  },
  {
    check: async () => {
      const connection = (navigator as any).connection;
      return connection?.effectiveType === "slow-2g";
    },
    reason: "Slow network connection",
  },
];

async function evaluateDisableConditions(): Promise<string | null> {
  for (const condition of DISABLE_CONDITIONS) {
    if (await condition.check()) {
      return condition.reason;
    }
  }
  return null;
}

// Run periodic checks
setInterval(async () => {
  const shouldDisable = await evaluateDisableConditions();
  if (shouldDisable && (await chrome.management.getSelf()).enabled) {
    console.log(`Auto-disabling: ${shouldDisable}`);
    // Optionally notify user or disable
    // await chrome.management.setEnabled(chrome.runtime.id, false);
  }
}, 60000); // Check every minute
```

### Detecting Enterprise Policy Installation

```ts
// policy-detection.ts
async function detectInstallationContext(): Promise<{
  isEnterpriseInstalled: boolean;
  isDevelopmentMode: boolean;
  installType: string;
}> {
  const self = await chrome.management.getSelf();
  
  return {
    isEnterpriseInstalled: self.installType === "sideload",
    isDevelopmentMode: self.installType === "development",
    installType: self.installType,
  };
}

// Handle enterprise-specific logic
async function handleEnterpriseContext(): Promise<void> {
  const context = await detectInstallationContext();
  
  if (context.isEnterpriseInstalled) {
    // Enterprise-managed extension may have restricted permissions
    // May not be able to uninstall or disable
    
    console.log("Running in enterprise context");
    
    // Adjust UI for enterprise users
    document.body.classList.add("enterprise-mode");
  }
  
  if (context.isDevelopmentMode) {
    console.log("Running in development mode");
    // Enable debugging features
  }
}
```

---

## Summary Table

| Pattern | Use Case | Key APIs |
|---------|----------|----------|
| **Pattern 1: Management API Basics** | Retrieve extension information | `getAll()`, `get()`, `getSelf()` |
| **Pattern 2: Extension Info Display** | Build extension list UI with filtering | `getAll()`, type filtering |
| **Pattern 3: Enable/Disable Extensions** | Toggle extensions, manage profiles | `setEnabled()` |
| **Pattern 4: Install/Uninstall Events** | Track ecosystem changes | `onInstalled`, `onUninstalled`, `onEnabled`, `onDisabled` |
| **Pattern 5: Uninstall with Feedback** | Collect user feedback on uninstall | `uninstallSelf()`, `setUninstallURL()` |
| **Pattern 6: Compatibility Checker** | Find conflicts and duplicates | `getAll()`, permission analysis |
| **Pattern 7: Permission Audit** | Security analysis of extensions | Permission scanning, risk scoring |
| **Pattern 8: Self-Management** | Health checks, auto-regulation | `getSelf()`, conditional logic |

### Key Permissions

| Permission | Description |
|------------|-------------|
| `"management"` | Required for all Management API access |

### Important Notes

1. **Content Script Limitation**: Management API is not available in content scripts—use background scripts or extension pages
2. **User May Disable**: Some extensions cannot be disabled (`mayDisable: false`) due to policy
3. **Self-Reference**: Always filter out your own extension ID when listing all extensions
4. **Privacy**: Handle extension data responsibly; audit results should be stored securely
5. **Enterprise Policies**: Force-installed extensions may have restricted capabilities

---

## Additional Resources

- [Chrome Management API Reference](https://developer.chrome.com/docs/extensions/reference/management/)
- [Extension Install Types](https://developer.chrome.com/docs/extensions/mv3/architecture-overview/)
- [@theluckystrike/webext-storage](https://github.com/theluckystrike/webext-storage) — Type-safe storage wrapper
