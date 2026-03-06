# Chrome Extension Enterprise Policies Patterns

## Overview

Enterprise policies allow IT administrators to control how Chrome extensions behave in managed organizational environments. This guide covers practical patterns for building extensions that respect enterprise configurations, support force-installation, and integrate with corporate policy systems.

Key facts:
- **Permission Required**: `"storage"` for managed storage access; `"management"` for force-install detection
- **API Stability**: `chrome.storage.managed` is stable across all Chrome versions
- **Storage Integration**: Use `@theluckystrike/webext-storage` for unified storage access
- **Policy Schema**: Requires JSON schema declaration in manifest and optional `.json` policy template

---

## Pattern 1: Enterprise Extension Basics

Chrome Enterprise extensions leverage `chrome.storage.managed` to receive read-only configuration from IT administrators. Unlike regular storage APIs, managed storage is configured by group policy and cannot be modified by the extension user or the extension itself.

### Understanding Managed Storage

Managed storage is a read-only key-value store pushed to extensions via Chrome's enterprise policy system. Administrators deploy settings through:
- Google Admin console (for Chrome Browser Cloud Management)
- Windows Group Policy (GPO)
- macOS Configuration Profiles

### Manifest Configuration

To enable managed storage, declare it in your manifest:

```json
{
  "manifest_version": 3,
  "name": "Enterprise Extension",
  "version": "1.0",
  "permissions": [
    "storage"
  ],
  "managed_storage_schema": "schemas/managed-schema.json"
}
```

### Schema File Declaration

Create a JSON schema file that defines the expected structure of your managed configuration:

```json
// schemas/managed-schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "enabled": {
      "type": "boolean",
      "default": true,
      "description": "Enable or disable the extension functionality"
    },
    "serverUrl": {
      "type": "string",
      "format": "uri",
      "default": "https://api.example.com",
      "description": "Enterprise API server URL"
    },
    "allowedDomains": {
      "type": "array",
      "items": { "type": "string" },
      "default": ["*.company.com"],
      "description": "List of allowed domains for operations"
    }
  },
  "additionalProperties": false
}
```

### Storage Areas Comparison

```ts
// types/storage.ts
export interface StorageComparison {
  /** Read-write, syncs across user devices */
  sync: chrome.storage.SyncStorageArea;
  /** Read-write, local to this device */
  local: chrome.storage.LocalStorageArea;
  /** Read-only, set by IT administrators */
  managed: chrome.storage.ManagedStorageArea;
  /** Session-scoped, cleared on browser close */
  session: chrome.storage.SessionStorageArea;
}
```

---

## Pattern 2: Managed Storage Schema

A well-designed managed storage schema provides type safety, validation, and clear documentation for IT administrators deploying your extension.

### Basic Schema Properties

Define properties with types, defaults, and descriptions:

```ts
// schemas/managed-schema.types.ts
export interface ManagedConfigSchema {
  /** Master toggle for extension functionality */
  enabled: boolean;
  /** API endpoint for enterprise services */
  serverUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Maximum file size in MB */
  maxFileSizeMB: number;
  /** Feature flags for gradual rollout */
  features: {
    advancedReporting: boolean;
    betaFeatures: boolean;
  };
}
```

### Complete Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "enabled": {
      "type": "boolean",
      "default": true,
      "description": "Enable or disable the extension"
    },
    "serverUrl": {
      "type": "string",
      "format": "uri",
      "default": "https://api.enterprise.com",
      "description": "Enterprise API server endpoint"
    },
    "apiKey": {
      "type": "string",
      "minLength": 32,
      "description": "API authentication key (optional)"
    },
    "maxFileSizeMB": {
      "type": "number",
      "minimum": 1,
      "maximum": 100,
      "default": 10,
      "description": "Maximum upload file size in megabytes"
    },
    "features": {
      "type": "object",
      "properties": {
        "advancedReporting": {
          "type": "boolean",
          "default": false,
          "description": "Enable detailed analytics and reporting"
        },
        "betaFeatures": {
          "type": "boolean",
          "default": false,
          "description": "Enable experimental beta features"
        },
        "allowedOperations": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["read", "write", "delete", "export"]
          },
          "default": ["read", "write"],
          "description": "Permitted file operations"
        }
      },
      "required": ["advancedReporting"]
    },
    "ui": {
      "type": "object",
      "properties": {
        "theme": {
          "type": "string",
          "enum": ["light", "dark", "system"],
          "default": "system"
        },
        "showBadge": {
          "type": "boolean",
          "default": true
        }
      }
    }
  },
  "required": ["enabled", "serverUrl"],
  "additionalProperties": false
}
```

### Chrome Policy Template Generation

For enterprise deployment, generate an ADMX policy template:

```xml
<!-- policy-template.admx -->
<policyDefinitions>
  <policyGroup>
    <policy name="ExtensionEnabled" class="User">
      <presentation>
        <presentationId>ExtensionEnabled</presentationId>
        <text>Enable Enterprise Extension</text>
      </presentation>
      <elements>
        <boolean key="true">ExtensionEnabled</boolean>
      </elements>
    </policy>
    <policy name="ServerUrl" class="User">
      <presentation>
        <presentationId>ServerUrl</presentationId>
        <text>Enterprise Server URL</text>
      </presentation>
      <elements>
        <text value="ServerUrl" required="true"/>
      </elements>
    </policy>
  </policyGroup>
</policyDefinitions>
```

---

## Pattern 3: Reading Managed Settings

Reading managed storage requires understanding the asynchronous nature of the API and implementing proper fallback chains for when policies are not configured.

### Basic Managed Storage Reading

```ts
// services/managed-config.ts
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

export interface ManagedSettings {
  enabled: boolean;
  serverUrl: string;
  apiKey?: string;
  features: {
    advancedReporting: boolean;
    betaFeatures: boolean;
    allowedOperations: string[];
  };
}

// Create managed storage instance
const managedStorage = createStorage<ManagedSettings>({
  area: StorageArea.Managed
});

/**
 * Read managed configuration with fallbacks
 * Priority: managed (enterprise) -> sync -> local -> defaults
 */
export async function getExtensionConfig(): Promise<ManagedSettings> {
  // Try to read managed storage first
  const managed = await managedStorage.get();
  
  if (managed.enabled !== undefined) {
    console.log("[Config] Using enterprise-managed settings");
    return managed;
  }
  
  // Fallback to sync storage (user preferences)
  const syncStorage = createStorage<Partial<ManagedSettings>>({
    area: StorageArea.Sync
  });
  const sync = await syncStorage.get();
  
  // Fallback to local storage
  const localStorage = createStorage<Partial<ManagedSettings>>({
    area: StorageArea.Local
  });
  const local = await localStorage.get();
  
  // Merge with defaults
  return {
    enabled: sync.enabled ?? local.enabled ?? true,
    serverUrl: sync.serverUrl ?? local.serverUrl ?? "https://api.example.com",
    features: {
      advancedReporting: sync.features?.advancedReporting ?? 
                         local.features?.advancedReporting ?? false,
      betaFeatures: sync.features?.betaFeatures ?? 
                     local.features?.betaFeatures ?? false,
      allowedOperations: sync.features?.allowedOperations ?? 
                          local.features?.allowedOperations ?? ["read", "write"]
    }
  };
}
```

### Direct Chrome API Usage

```ts
// services/managed-config-native.ts
/**
 * Native Chrome API approach for reading managed storage
 */
export async function getManagedConfig(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    chrome.storage.managed.get((result) => {
      if (chrome.runtime.lastError) {
        console.warn("Managed storage error:", chrome.runtime.lastError.message);
        resolve({});
        return;
      }
      resolve(result);
    });
  });
}

/**
 * Check if extension is under enterprise management
 */
export async function isEnterpriseManaged(): Promise<boolean> {
  const config = await getManagedConfig();
  return Object.keys(config).length > 0;
}
```

### Fallback Chain Implementation

```ts
// services/config-fallback.ts
export interface ExtensionConfig {
  enabled: boolean;
  serverUrl: string;
  apiKey?: string;
  features: {
    advancedReporting: boolean;
    betaFeatures: boolean;
  };
}

const DEFAULT_CONFIG: ExtensionConfig = {
  enabled: true,
  serverUrl: "https://api.default.com",
  features: {
    advancedReporting: false,
    betaFeatures: false
  }
};

/**
 * Complete fallback chain: managed -> sync -> local -> defaults
 */
export async function resolveConfig(): Promise<ExtensionConfig> {
  // Step 1: Try managed storage (enterprise)
  const managed = await chrome.storage.managed.get() as Partial<ExtensionConfig>;
  const hasEnterpriseConfig = Object.keys(managed).length > 0;
  
  if (hasEnterpriseConfig) {
    return {
      ...DEFAULT_CONFIG,
      ...managed,
      features: { ...DEFAULT_CONFIG.features, ...managed.features }
    };
  }
  
  // Step 2: Try sync storage (user preferences that sync)
  const sync = await chrome.storage.sync.get() as Partial<ExtensionConfig>;
  if (Object.keys(sync).length > 0) {
    return {
      ...DEFAULT_CONFIG,
      ...sync,
      features: { ...DEFAULT_CONFIG.features, ...sync.features }
    };
  }
  
  // Step 3: Try local storage
  const local = await chrome.storage.local.get() as Partial<ExtensionConfig>;
  if (Object.keys(local).length > 0) {
    return {
      ...DEFAULT_CONFIG,
      ...local,
      features: { ...DEFAULT_CONFIG.features, ...local.features }
    };
  }
  
  // Step 4: Return defaults
  return DEFAULT_CONFIG;
}
```

---

## Pattern 4: Responding to Policy Changes

Extensions must listen for changes to managed storage to dynamically adapt to enterprise policy updates without requiring browser restart.

### Listening for Policy Changes

```ts
// services/policy-listener.ts
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

export interface ManagedSettings {
  enabled: boolean;
  serverUrl: string;
  features: {
    advancedReporting: boolean;
    betaFeatures: boolean;
  };
}

type PolicyChangeCallback = (settings: ManagedSettings) => void;

/**
 * Subscribe to managed storage changes
 */
export function onPolicyChange(callback: PolicyChangeCallback): () => void {
  const managedStorage = createStorage<ManagedSettings>({
    area: StorageArea.Managed
  });
  
  // Initial read
  managedStorage.get().then(callback);
  
  // Listen for changes
  const unsubscribe = managedStorage.onChanged((changes, areaName) => {
    if (areaName === "managed") {
      console.log("[Policy] Enterprise settings changed:", changes);
      managedStorage.get().then(callback);
    }
  });
  
  return unsubscribe;
}
```

### Dynamic Feature Toggle Implementation

```ts
// services/feature-manager.ts
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

export interface FeatureFlags {
  advancedReporting: boolean;
  betaFeatures: boolean;
  exportData: boolean;
}

class FeatureManager {
  private features: FeatureFlags = {
    advancedReporting: false,
    betaFeatures: false,
    exportData: true
  };
  
  private listeners: Set<(features: FeatureFlags) => void> = new Set();
  
  constructor() {
    this.initializePolicyListener();
  }
  
  private async initializePolicyListener(): Promise<void> {
    const managedStorage = createStorage<{ features?: FeatureFlags }>({
      area: StorageArea.Managed
    });
    
    // Listen for managed storage changes
    managedStorage.onChanged((changes, area) => {
      if (area === "managed" && changes.features) {
        this.updateFeatures(changes.features.newValue);
      }
    });
    
    // Initial load
    const managed = await managedStorage.get();
    if (managed.features) {
      this.updateFeatures(managed.features);
    }
  }
  
  private updateFeatures(newFeatures: FeatureFlags): void {
    this.features = { ...this.features, ...newFeatures };
    this.notifyListeners();
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.features));
  }
  
  public isEnabled(feature: keyof FeatureFlags): boolean {
    return this.features[feature];
  }
  
  public subscribe(callback: (features: FeatureFlags) => void): () => void {
    this.listeners.add(callback);
    callback(this.features); // Immediate callback with current state
    
    return () => this.listeners.delete(callback);
  }
}

export const featureManager = new FeatureManager();
```

### UI Adaptation Based on Policies

```ts
// ui/policy-ui-adapter.ts
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

export interface UISettings {
  theme: "light" | "dark" | "system";
  showBadge: boolean;
  allowUserConfig: boolean;
}

class UIPolicyAdapter {
  private uiSettings: UISettings = {
    theme: "system",
    showBadge: true,
    allowUserConfig: true
  };
  
  async initialize(): Promise<void> {
    const managedStorage = createStorage<{ ui?: Partial<UISettings> }>({
      area: StorageArea.Managed
    });
    
    managedStorage.onChanged((changes, area) => {
      if (area === "managed" && changes.ui) {
        this.applyUISettings(changes.ui.newValue);
      }
    });
    
    const managed = await managedStorage.get();
    if (managed.ui) {
      this.applyUISettings(managed.ui);
    }
  }
  
  private applyUISettings(ui: Partial<UISettings>): void {
    this.uiSettings = { ...this.uiSettings, ...ui };
    this.applyTheme(this.uiSettings.theme);
    this.updateBadgeVisibility(this.uiSettings.showBadge);
    this.toggleUserSettingsPanel(this.uiSettings.allowUserConfig);
  }
  
  private applyTheme(theme: "light" | "dark" | "system"): void {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }
  
  private updateBadgeVisibility(visible: boolean): void {
    const badge = document.getElementById("extension-badge");
    if (badge) {
      badge.style.display = visible ? "flex" : "none";
    }
  }
  
  private toggleUserSettingsPanel(allowed: boolean): void {
    const panel = document.getElementById("user-settings-panel");
    if (panel) {
      panel.style.display = allowed ? "block" : "none";
      
      if (!allowed) {
        console.log("[UI] User settings disabled by enterprise policy");
      }
    }
  }
}

export const uiPolicyAdapter = new UIPolicyAdapter();
```

---

## Pattern 5: Force-Installed Extension Patterns

Enterprise environments often force-install extensions via Chrome Browser Cloud Management or Group Policy. Extensions should detect this state and adapt their behavior accordingly.

### Detecting Force Installation

```ts
// services/force-install-detector.ts
export interface ExtensionInstallInfo {
  installType: "development" | "normal" | "sideload" | "admin" | "third_party";
  isForceInstalled: boolean;
}

/**
 * Detect how the extension was installed
 */
export async function getInstallType(): Promise<ExtensionInstallInfo> {
  return new Promise((resolve) => {
    chrome.management.getSelf((info) => {
      const installType = info.installType;
      const isForceInstalled = 
        installType === "admin" || 
        installType === "third_party";
      
      resolve({
        installType,
        isForceInstalled
      });
    });
  });
}

/**
 * Check if uninstall should be disabled
 */
export async function canUninstall(): Promise<boolean> {
  const installInfo = await getInstallType();
  
  if (installInfo.isForceInstalled) {
    console.warn(
      "[Install] Extension was force-installed by admin. " +
      "User uninstall should be disabled."
    );
    return false;
  }
  
  return true;
}
```

### Disabling Uninstall When Force-Installed

```ts
// background/uninstall-handler.ts
import { getInstallType } from "../services/force-install-detector";

/**
 * Initialize uninstall prevention for force-installed extensions
 */
export async function initUninstallHandler(): Promise<void> {
  const installInfo = await getInstallType();
  
  if (!installInfo.isForceInstalled) {
    console.log("[Uninstall] Voluntary installation - allowing user uninstall");
    return;
  }
  
  console.log("[Uninstall] Force-installed - disabling user uninstall");
  
  // For MV3, we can't directly prevent uninstall in the same way
  // Instead, we can hide the uninstall option in the UI
  // and set up a listener to notify admin on uninstall attempts
  
  // Monitor for uninstall attempts
  chrome.runtime.setUninstallURL(
    "https://enterprise.example.com/extension-uninstall-notice" +
    `?extId=${chrome.runtime.id}` +
    `&version=${chrome.runtime.getManifest().version}`
  );
}

/**
 * Show appropriate UI based on install type
 */
export function getAppropriateUI(): "full" | "limited" | "admin-only" {
  // This would typically be stored in managed storage
  // For now, return based on install type
  return "full";
}
```

### Different Behavior for Managed vs Voluntary Installs

```ts
// services/extension-mode.ts
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

export type ExtensionMode = "full" | "limited" | "admin-only";
export type InstallType = "enterprise" | "voluntary";

export interface ExtensionBehaviorConfig {
  mode: ExtensionMode;
  installType: InstallType;
  showSettings: boolean;
  allowDisable: boolean;
  telemetryEnabled: boolean;
}

export async function determineExtensionBehavior(): Promise<ExtensionBehaviorConfig> {
  // Check install type first
  const installInfo = await chrome.management.getSelf();
  const isEnterprise = 
    installInfo.installType === "admin" || 
    installInfo.installType === "third_party";
  
  // Check for managed storage configuration
  const managedStorage = createStorage<Partial<ExtensionBehaviorConfig>>({
    area: StorageArea.Managed
  });
  
  const managed = await managedStorage.get();
  
  // Enterprise-managed always takes precedence
  if (isEnterprise || Object.keys(managed).length > 0) {
    return {
      mode: managed.mode ?? "full",
      installType: "enterprise",
      showSettings: managed.showSettings ?? true,
      allowDisable: managed.allowDisable ?? false,
      telemetryEnabled: managed.telemetryEnabled ?? true
    };
  }
  
  // Voluntary installation defaults
  return {
    mode: "full",
    installType: "voluntary",
    showSettings: true,
    allowDisable: true,
    telemetryEnabled: false
  };
}
```

---

## Pattern 6: Enterprise Feature Flags

Enterprise environments often require phased rollouts of features. Managed storage provides an ideal mechanism for controlling feature availability across the organization.

### Feature Flag Architecture

```ts
// features/feature-flags.ts
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

export interface FeatureFlags {
  /** Enable advanced reporting dashboard */
  advancedReporting: boolean;
  /** Enable beta/experimental features */
  betaFeatures: boolean;
  /** Enable data export functionality */
  exportData: boolean;
  /** Enable third-party integrations */
  integrations: boolean;
  /** Enable audit logging */
  auditLogging: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  advancedReporting: false,
  betaFeatures: false,
  exportData: false,
  integrations: false,
  auditLogging: true
};

class EnterpriseFeatureFlags {
  private flags: FeatureFlags = DEFAULT_FLAGS;
  private listeners: Set<(flags: FeatureFlags) => void> = new Set();
  
  private storage = createStorage<{ features?: FeatureFlags }>({
    area: StorageArea.Managed
  });
  
  async initialize(): Promise<void> {
    // Load initial state
    const managed = await this.storage.get();
    if (managed.features) {
      this.flags = { ...DEFAULT_FLAGS, ...managed.features };
    }
    
    // Listen for changes
    this.storage.onChanged((changes, area) => {
      if (area === "managed" && changes.features) {
        this.flags = { ...DEFAULT_FLAGS, ...changes.features.newValue };
        this.notifyListeners();
      }
    });
  }
  
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature] ?? DEFAULT_FLAGS[feature];
  }
  
  subscribe(callback: (flags: FeatureFlags) => void): () => void {
    this.listeners.add(callback);
    callback(this.flags);
    
    return () => this.listeners.delete(callback);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.flags));
  }
}

export const enterpriseFeatures = new EnterpriseFeatureFlags();
```

### Gradual Rollout via Group Policies

```ts
// services/rollout-manager.ts
export interface RolloutConfig {
  /** Percentage of users to enable feature for (0-100) */
  rolloutPercentage: number;
  /** Specific user groups to target */
  targetGroups: string[];
  /** Feature flags to apply */
  flags: Record<string, boolean>;
}

/**
 * Generate rollout policy for IT admins to deploy
 */
export function generateRolloutPolicy(rollout: RolloutConfig): object {
  return {
    policy: "EnterpriseExtensionRollout",
    rollout_percentage: rollout.rolloutPercentage,
    target_groups: rollout.targetGroups,
    features: rollout.flags,
    version: "1.0.0",
    timestamp: new Date().toISOString()
  };
}

/**
 * Example rollout configuration for gradual feature enablement
 */
export const EXAMPLE_ROLLOUT: RolloutConfig = {
  rolloutPercentage: 10,
  targetGroups: ["IT-Beta-Users", "Engineering"],
  flags: {
    advancedReporting: true,
    betaFeatures: false
  }
};
```

### Feature Flag Usage in Code

```ts
// features/report-service.ts
import { enterpriseFeatures, FeatureFlags } from "./feature-flags";

export class ReportService {
  async generateReport(data: unknown): Promise<string> {
    // Check feature flag before proceeding
    if (!enterpriseFeatures.isEnabled("advancedReporting")) {
      console.warn("[Reports] Advanced reporting is not enabled");
      return "Basic report (advanced features disabled)";
    }
    
    // Generate advanced report
    return this.generateAdvancedReport(data);
  }
  
  private generateAdvancedReport(data: unknown): string {
    // Implementation for advanced reporting
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Conditionally enable functionality based on feature flags
 */
export function initFeatureDependentLogic(): void {
  enterpriseFeatures.subscribe((flags) => {
    console.log("[Features] Current feature flags:", flags);
    
    if (flags.exportData) {
      enableExportFunctionality();
    }
    
    if (flags.integrations) {
      initializeIntegrations();
    }
    
    if (flags.auditLogging) {
      enableAuditLogging();
    }
  });
}

function enableExportFunctionality(): void {
  console.log("[Features] Export functionality enabled");
}

function initializeIntegrations(): void {
  console.log("[Features] Third-party integrations enabled");
}

function enableAuditLogging(): void {
  console.log("[Features] Audit logging enabled");
}
```

---

## Pattern 7: Compliance and Audit Logging

Enterprise extensions often need to implement compliance features including audit logging, DLP (Data Loss Prevention) policy enforcement, and health reporting.

### Audit Logging Implementation

```ts
// services/audit-logger.ts
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

export interface AuditEvent {
  timestamp: string;
  action: string;
  userId?: string;
  details: Record<string, unknown>;
  success: boolean;
}

export interface AuditConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  flushInterval: number;
}

class AuditLogger {
  private config: AuditConfig = {
    enabled: false,
    batchSize: 10,
    flushInterval: 60000
  };
  
  private buffer: AuditEvent[] = [];
  private flushTimer?: number;
  
  async initialize(): Promise<void> {
    const managedStorage = createStorage<{ audit?: Partial<AuditConfig> }>({
      area: StorageArea.Managed
    });
    
    const managed = await managedStorage.get();
    if (managed.audit) {
      this.config = { ...this.config, ...managed.audit };
    }
    
    if (this.config.enabled) {
      this.startFlushTimer();
    }
  }
  
  log(action: string, details: Record<string, unknown>, success = true): void {
    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      action,
      details,
      success
    };
    
    this.buffer.push(event);
    
    if (this.config.enabled && this.buffer.length >= this.config.batchSize) {
      this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const events = [...this.buffer];
    this.buffer = [];
    
    if (this.config.endpoint) {
      try {
        await fetch(this.config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events })
        });
      } catch (error) {
        console.error("[Audit] Failed to send events:", error);
        // Re-add to buffer on failure
        this.buffer.unshift(...events);
      }
    }
  }
  
  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(
      () => this.flush(),
      this.config.flushInterval
    );
  }
}

export const auditLogger = new AuditLogger();
```

### DLP Policy Enforcement

```ts
// services/dlp-enforcer.ts
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

export interface DLPConfig {
  /** Maximum file size allowed (MB) */
  maxFileSizeMB: number;
  /** Allowed file types */
  allowedFileTypes: string[];
  /** Blocked domains */
  blockedDomains: string[];
  /** Require encryption for sensitive data */
  requireEncryption: boolean;
  /** Audit all data transfers */
  auditTransfers: boolean;
}

export interface DLPResult {
  allowed: boolean;
  reason?: string;
  requiresEncryption?: boolean;
}

class DLPEnforcer {
  private config: DLPConfig = {
    maxFileSizeMB: 10,
    allowedFileTypes: ["pdf", "doc", "docx", "xls", "xlsx"],
    blockedDomains: [],
    requireEncryption: false,
    auditTransfers: true
  };
  
  private storage = createStorage<{ dlp?: Partial<DLPConfig> }>({
    area: StorageArea.Managed
  });
  
  async initialize(): Promise<void> {
    const managed = await this.storage.get();
    if (managed.dlp) {
      this.config = { ...this.config, ...managed.dlp };
    }
  }
  
  checkFileTransfer(file: { name: string; size: number; type: string }): DLPResult {
    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > this.config.maxFileSizeMB) {
      return {
        allowed: false,
        reason: `File size exceeds maximum of ${this.config.maxFileSizeMB}MB`
      };
    }
    
    // Check file type
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!this.config.allowedFileTypes.includes(extension ?? "")) {
      return {
        allowed: false,
        reason: `File type .${extension} is not allowed`
      };
    }
    
    return { allowed: true };
  }
  
  checkDomainTransfer(domain: string): DLPResult {
    if (this.config.blockedDomains.includes(domain)) {
      return {
        allowed: false,
        reason: `Domain ${domain} is blocked by enterprise policy`
      };
    }
    
    return { allowed: true };
  }
  
  checkSensitiveData(data: unknown): DLPResult {
    if (this.config.requireEncryption) {
      // Check if data is encrypted
      // This is a simplified example
      return {
        allowed: true,
        requiresEncryption: true
      };
    }
    
    return { allowed: true };
  }
}

export const dlpEnforcer = new DLPEnforcer();
```

### Extension Health Reporting

```ts
// services/health-reporter.ts
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

export interface HealthReport {
  extensionId: string;
  version: string;
  timestamp: string;
  status: "healthy" | "degraded" | "unhealthy";
  metrics: {
    uptime: number;
    errorCount: number;
    lastError?: string;
    storageUsed: number;
  };
}

export interface ReportingConfig {
  enabled: boolean;
  endpoint?: string;
  interval: number;
}

class HealthReporter {
  private config: ReportingConfig = {
    enabled: false,
    interval: 300000 // 5 minutes
  };
  
  private startTime = Date.now();
  private errorCount = 0;
  private lastError?: string;
  
  private storage = createStorage<{ health?: Partial<ReportingConfig> }>({
    area: StorageArea.Managed
  });
  
  async initialize(): Promise<void> {
    const managed = await this.storage.get();
    if (managed.health) {
      this.config = { ...this.config, ...managed.health };
    }
    
    if (this.config.enabled) {
      this.startReporting();
    }
  }
  
  recordError(error: string): void {
    this.errorCount++;
    this.lastError = error;
  }
  
  private async generateReport(): Promise<HealthReport> {
    return {
      extensionId: chrome.runtime.id,
      version: chrome.runtime.getManifest().version,
      timestamp: new Date().toISOString(),
      status: this.errorCount === 0 ? "healthy" : "degraded",
      metrics: {
        uptime: Date.now() - this.startTime,
        errorCount: this.errorCount,
        lastError: this.lastError,
        storageUsed: await this.getStorageUsage()
      }
    };
  }
  
  private async getStorageUsage(): Promise<number> {
    const bytes = await chrome.storage.local.getBytesInUse();
    return bytes;
  }
  
  private async sendReport(report: HealthReport): Promise<void> {
    if (!this.config.endpoint) return;
    
    try {
      await fetch(this.config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.error("[Health] Failed to send report:", error);
    }
  }
  
  private startReporting(): void {
    setInterval(async () => {
      const report = await this.generateReport();
      await this.sendReport(report);
    }, this.config.interval);
  }
}

export const healthReporter = new HealthReporter();
```

---

## Pattern 8: Testing Enterprise Configurations

Testing enterprise policies requires understanding Chrome's policy testing mechanisms and implementing proper mocking strategies.

### Testing via chrome://policy

```ts
// tests/policy-testing.ts
/**
 * Instructions for testing managed storage:
 * 
 * 1. Open chrome://policy in Chrome
 * 2. Click "Reload policies" 
 * 3. Click "Show policy values"
 * 4. Look for your extension's policies
 * 
 * To set test values:
 * 1. Create a JSON file with your policy values
 * 2. Load unpacked extension with managed_storage_schema in manifest
 * 3. Use chrome.storage.managed API to verify values
 */

/**
 * Example test policy JSON for chrome.management
 */
export const TEST_POLICY_JSON = {
  "EnterpriseExtension": {
    "enabled": true,
    "serverUrl": "https://test-api.enterprise.com",
    "features": {
      "advancedReporting": true,
      "betaFeatures": false,
      "allowedOperations": ["read", "write"]
    }
  }
};
```

### Mocking Managed Storage in Tests

```ts
// tests/__mocks__/managed-storage.ts
/**
 * Mock implementation for testing managed storage
 * Use this in Jest/Vitest tests
 */

interface ManagedStorageMock {
  [key: string]: unknown;
}

const mockStorage: ManagedStorageMock = {};

export function createManagedStorageMock(defaults: ManagedStorageMock = {}): object {
  // Set defaults
  Object.assign(mockStorage, defaults);
  
  return {
    get: (keys?: string | string[]): Promise<ManagedStorageMock> => {
      return new Promise((resolve) => {
        if (!keys) {
          resolve({ ...mockStorage });
          return;
        }
        
        const result: ManagedStorageMock = {};
        const keyArray = Array.isArray(keys) ? keys : [keys];
        
        keyArray.forEach((key) => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        });
        
        resolve(result);
      });
    },
    
    set: (items: ManagedStorageMock): Promise<void> => {
      return new Promise((resolve) => {
        Object.assign(mockStorage, items);
        resolve();
      });
    },
    
    clear: (): Promise<void> => {
      return new Promise((resolve) => {
        Object.keys(mockStorage).forEach((key) => {
          delete mockStorage[key];
        });
        resolve();
      });
    }
  };
}

/**
 * Example test using mocked managed storage
 */
export async function testManagedConfig(): Promise<void> {
  const mock = createManagedStorageMock({
    enabled: true,
    serverUrl: "https://test.example.com",
    features: {
      advancedReporting: true,
      betaFeatures: false
    }
  });
  
  const config = await (mock as chrome.storage.StorageArea).get();
  console.log("Test config:", config);
  
  // Assertions
  expect(config.enabled).toBe(true);
  expect(config.features.advancedReporting).toBe(true);
}
```

### Policy Template Generation for IT Documentation

```ts
// utils/policy-generator.ts
export interface PolicyDefinition {
  name: string;
  type: "string" | "boolean" | "number" | "array" | "object";
  description: string;
  default?: unknown;
  required?: boolean;
  enum?: string[];
}

export interface PolicyTemplate {
  name: string;
  version: string;
  policies: PolicyDefinition[];
}

/**
 * Generate policy documentation in Markdown format
 */
export function generatePolicyMarkdown(template: PolicyTemplate): string {
  let markdown = `# ${template.name} Policy Template\n\n`;
  markdown += `Version: ${template.version}\n\n`;
  markdown += `## Policy Definitions\n\n`;
  
  template.policies.forEach((policy) => {
    markdown += `### ${policy.name}\n\n`;
    markdown += `- **Type**: ${policy.type}\n`;
    markdown += `- **Description**: ${policy.description}\n`;
    
    if (policy.default !== undefined) {
      markdown += `- **Default**: ${JSON.stringify(policy.default)}\n`;
    }
    
    if (policy.required) {
      markdown += `- **Required**: Yes\n`;
    }
    
    if (policy.enum) {
      markdown += `- **Allowed Values**: ${policy.enum.join(", ")}\n`;
    }
    
    markdown += "\n";
  });
  
  return markdown;
}

/**
 * Example policy template
 */
export const EXAMPLE_POLICY_TEMPLATE: PolicyTemplate = {
  name: "Enterprise Extension",
  version: "1.0.0",
  policies: [
    {
      name: "enabled",
      type: "boolean",
      description: "Enable or disable the extension",
      default: true,
      required: true
    },
    {
      name: "serverUrl",
      type: "string",
      description: "Enterprise API server URL",
      default: "https://api.enterprise.com",
      required: true
    },
    {
      name: "features.advancedReporting",
      type: "boolean",
      description: "Enable advanced reporting features",
      default: false
    },
    {
      name: "features.betaFeatures",
      type: "boolean",
      description: "Enable beta features",
      default: false
    },
    {
      name: "features.allowedOperations",
      type: "array",
      description: "List of allowed operations",
      default: ["read", "write"]
    },
    {
      name: "ui.theme",
      type: "string",
      description: "UI theme preference",
      default: "system",
      enum: ["light", "dark", "system"]
    }
  ]
};
```

---

## Summary Table

| Pattern | Use Case | Key APIs | Complexity |
|---------|----------|----------|------------|
| **Pattern 1: Enterprise Extension Basics** | Read-only settings from IT | `chrome.storage.managed` | Basic |
| **Pattern 2: Managed Storage Schema** | Define config structure | JSON Schema, manifest | Intermediate |
| **Pattern 3: Reading Managed Settings** | Access enterprise config | `managed.get()`, fallback chain | Basic |
| **Pattern 4: Responding to Policy Changes** | Dynamic adaptation | `onChanged` listener | Intermediate |
| **Pattern 5: Force-Installed Extension Patterns** | Detect admin install | `chrome.management.getSelf()` | Intermediate |
| **Pattern 6: Enterprise Feature Flags** | Control feature rollout | Managed storage as flag source | Advanced |
| **Pattern 7: Compliance and Audit Logging** | Enterprise compliance | Audit endpoints, DLP checks | Advanced |
| **Pattern 8: Testing Enterprise Configurations** | QA enterprise features | `chrome://policy`, mocks | Intermediate |

### Quick Reference

```ts
// Quick reference for common operations

// 1. Read managed storage
const config = await chrome.storage.managed.get();

// 2. Listen for changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "managed") {
    // Handle policy changes
  }
});

// 3. Check if force-installed
const info = await chrome.management.getSelf();
const isForced = info.installType === "admin" || info.installType === "third_party";

// 4. Use @theluckystrike/webext-storage
import { createStorage, StorageArea } from "@theluckystrike/webext-storage";

const managed = createStorage<Config>({ area: StorageArea.Managed });
const config = await managed.get();
```

---

## Additional Resources

- [Chrome Enterprise Policy Documentation](https://chromeenterprise.google/policies/)
- [Chrome Storage API Reference](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Managed Storage Schema](https://developer.chrome.com/docs/extensions/mv3/manifest/managed_storage_schema/)
- [Group Policy for Chrome Extensions](https://support.google.com/chrome/a/answer/9020283)
