# Extension Configuration Patterns

## Overview

Configuration management is essential for customizable Chrome extensions. This guide covers patterns for storing, validating, migrating, and observing configuration changes.

---

## Basic Configuration Manager

Store defaults in code, merge with user settings:

```ts
// config/defaults.ts
export const DEFAULT_CONFIG = {
  theme: 'system',
  notifications: true,
  autoSave: true,
  maxHistory: 100,
  language: 'en'
};

export type Config = typeof DEFAULT_CONFIG;

// config/manager.ts
class ConfigManager {
  private cache: Config | null = null;

  async load(): Promise<Config> {
    const stored = await chrome.storage.local.get('config');
    this.cache = { ...DEFAULT_CONFIG, ...stored.config };
    return this.cache;
  }

  async save(config: Partial<Config>): Promise<void> {
    const current = await this.load();
    const updated = { ...current, ...config };
    await chrome.storage.local.set({ config: updated });
    this.cache = updated;
  }

  async get<K extends keyof Config>(key: K): Promise<Config[K]> {
    const config = await this.load();
    return config[key];
  }
}

export const configManager = new ConfigManager();
```

---

## Schema Validation

Validate configuration on load to reject invalid values:

```ts
// config/validator.ts
import { DEFAULT_CONFIG, type Config } from './defaults';

const schema: Record<keyof Config, (value: unknown) => boolean> = {
  theme: (v) => ['light', 'dark', 'system'].includes(v as string),
  notifications: (v) => typeof v === 'boolean',
  autoSave: (v) => typeof v === 'boolean',
  maxHistory: (v) => typeof v === 'number' && v > 0 && v <= 1000,
  language: (v) => typeof v === 'string' && v.length === 2
};

export function validateConfig(config: Partial<Config>): Config {
  const valid: Config = { ...DEFAULT_CONFIG };
  
  for (const [key, value] of Object.entries(config)) {
    const validator = schema[key as keyof Config];
    if (validator && validator(value)) {
      (valid as any)[key] = value;
    }
  }
  
  return valid;
}
```

---

## Reactive Configuration Observer

Listen for changes across devices using `chrome.storage.onChanged`:

```ts
// config/observer.ts
type ConfigListener = (changes: chrome.storage.StorageChange) => void;

class ConfigObserver {
  private listeners: Map<string, Set<ConfigListener>> = new Map();

  constructor() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' && area !== 'local') return;
      
      for (const [key, change] of Object.entries(changes)) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
          keyListeners.forEach(listener => listener(change));
        }
      }
    });
  }

  subscribe(key: string, listener: ConfigListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);
    
    return () => this.listeners.get(key)?.delete(listener);
  }
}

export const configObserver = new ConfigObserver();

// Usage
configObserver.subscribe('theme', (change) => {
  document.documentElement.dataset.theme = change.newValue;
});
```

---

## Layered Configuration

Support defaults, user settings, and enterprise policy:

```ts
// config/layered.ts
async function getLayeredConfig() {
  // Layer 1: Defaults
  let config = { ...DEFAULT_CONFIG };
  
  // Layer 2: Enterprise policy (highest priority)
  const policy = await chrome.storage.managed.get('policy');
  if (policy.policy) {
    config = { ...config, ...policy.policy };
  }
  
  // Layer 3: User settings (can override unless locked by policy)
  const user = await chrome.storage.local.get('settings');
  config = { ...config, ...user.settings };
  
  return validateConfig(config);
}
```

---

## Configuration Migration

Handle schema changes across extension updates:

```ts
// config/migration.ts
const MIGRATIONS: Record<string, (config: any) => any> = {
  '1.0.0': (config) => {
    // Migrate from v1.0 to v1.1
    if (config.maxItems !== undefined) {
      config.maxHistory = config.maxItems;
      delete config.maxItems;
    }
    return config;
  },
  '1.2.0': (config) => {
    // Add new defaults for v1.2
    return { ...config, language: config.language || 'en' };
  }
};

export async function migrateConfig(previousVersion: string): Promise<void> {
  const { config, version } = await chrome.storage.local.get(['config', 'version']);
  if (!version || version === previousVersion) return;

  let migrated = config;
  const versions = Object.keys(MIGRATIONS).sort();
  
  for (const ver of versions) {
    if (ver > version && MIGRATIONS[ver]) {
      migrated = MIGRATIONS[ver](migrated);
    }
  }
  
  await chrome.storage.local.set({ config: migrated, version: previousVersion });
}
```

---

## Config Groups

Organize settings into logical groups:

```ts
// config/groups.ts
export const CONFIG_GROUPS = {
  general: {
    label: 'General',
    fields: ['language', 'autoSave', 'notifications']
  },
  appearance: {
    label: 'Appearance', 
    fields: ['theme']
  },
  advanced: {
    label: 'Advanced',
    fields: ['maxHistory']
  }
};

// Options page renders each group as a section
```

---

## Common Mistakes

❌ **Wrong** - Storing config without validation:
```ts
// Risky: accepts any value
await chrome.storage.local.set({ config: userInput });
```

✅ **Correct** - Always validate before saving:
```ts
const validConfig = validateConfig(userInput);
await chrome.storage.local.set({ config: validConfig });
```

❌ **Wrong** - No migration handling:
```ts
chrome.runtime.onInstalled.addListener(() => {
  // Assumes fresh install
});
```

✅ **Correct** - Handle both install and update:
```ts
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    await migrateConfig(details.previousVersion);
  }
});
```

---

## Cross-References

- [Options Page Guide](../guides/options-page.md)
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)
- [Feature Flag Patterns](./feature-flags.md)
