---
layout: default
title: "Chrome Extension Extension Configuration — Best Practices"
description: "Implement flexible configuration patterns for Chrome extensions using chrome.storage, managed storage, and feature flags."
canonical_url: "https://bestchromeextensions.com/patterns/extension-configuration/"
---

# Extension Configuration Patterns

Configuration management is critical for building flexible, user-customizable Chrome extensions. This guide covers patterns for implementing robust configuration systems.

## Default Configuration {#default-configuration}

Always provide hardcoded default values merged with user overrides:

```typescript
const DEFAULT_CONFIG = {
  theme: 'system',
  notifications: true,
  syncEnabled: false,
  maxResults: 50,
} as const;

async function loadConfig(): Promise<Config> {
  const userConfig = await chrome.storage.local.get(null);
  return { ...DEFAULT_CONFIG, ...userConfig };
}
```

## Schema Validation {#schema-validation}

Validate configuration on load and reject invalid values:

```typescript
const configSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.boolean().default(true),
  maxResults: z.number().min(1).max(100).default(50),
});

function validateConfig(raw: unknown): Config {
  return configSchema.parse(raw);
}
```

## Configuration Versioning {#configuration-versioning}

Migrate config across extension updates:

```typescript
const CONFIG_VERSION = 2;

const migrations: Record<number, (config: Config) => Config> = {
  1: (cfg) => ({ ...cfg, theme: 'system', version: 2 }),
};

async function migrateConfig(config: Config): Promise<Config> {
  let current = config;
  for (let v = (config.version || 1); v < CONFIG_VERSION; v++) {
    current = migrations[v](current);
  }
  return { ...current, version: CONFIG_VERSION };
}
```

## Layered Configuration {#layered-configuration}

Priority: defaults < user settings < enterprise policy:

```typescript
async function getEffectiveConfig(): Promise<Config> {
  const [defaults, user, policy] = await Promise.all([
    loadDefaults(),
    chrome.storage.local.get(null),
    chrome.storage.managed.get(null),
  ]);
  return { ...defaults, ...policy, ...user };
}
```

## Observing Config Changes {#observing-config-changes}

Use `chrome.storage.onChanged` for reactive updates:

```typescript
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    const newConfig = validateConfig(changes);
    applyConfig(newConfig);
  }
});
```

## Typed Config with TypeScript {#typed-config-with-typescript}

Use interfaces for type-safe configuration:

```typescript
interface ExtensionConfig {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  syncEnabled: boolean;
  maxResults: number;
  version: number;
}
```

## Config UI Patterns {#config-ui-patterns}

- **Options page forms**: Group settings by category (general, appearance, advanced, experimental)
- **Import/Export**: JSON serialization for backup and sharing
- **Reset to defaults**: Clear user overrides, restore factory settings

## Sync vs Local Storage {#sync-vs-local-storage}

- **chrome.storage.sync**: User preferences that follow the user across devices
- **chrome.storage.local**: Machine-specific settings (window size, debug flags)

## Feature Toggles {#feature-toggles}

Enable/disable features via boolean flags:

```typescript
const FEATURES = {
  experimentalFeatures: false,
  newDashboard: true,
} as const;
```

## Cross-References {#cross-references}

- [Options Page Guide](../guides/options-page.md)
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)
- [Feature Flags Pattern](./feature-flags.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
