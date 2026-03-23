---
layout: default
title: "Chrome Extension Typed Storage Wrapper. Best Practices"
description: "Type-safe storage wrappers for extensions."
canonical_url: "https://bestchromeextensions.com/patterns/typed-storage-wrapper/"
---

# Type-Safe Storage Wrapper Patterns

Problem Statement {#problem-statement}

The `chrome.storage` API uses `any` types, which undermines TypeScript's type safety. When you retrieve data from storage, you lose compile-time guarantees about the shape of the data. This leads to runtime errors and makes refactoring risky.

Solution: TypeScript Wrapper with Schema {#solution-typescript-wrapper-with-schema}

Create a typed wrapper that enforces a schema at compile time and validates at runtime.

Defining Storage Schema Interface {#defining-storage-schema-interface}

```typescript
interface StorageSchema {
  userPreferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notificationsEnabled: boolean;
  };
  extensionState: {
    lastOpenedAt: number;
    version: string;
    onboardingComplete: boolean;
  };
  cachedData: {
    apiResponse: unknown;
    timestamp: number;
  };
}
```

Type-Safe Get/Set with Defaults {#type-safe-getset-with-defaults}

```typescript
class TypedStorage<T extends Record<string, unknown>> {
  constructor(private area: 'local' | 'sync' | 'session' = 'local') {}

  async get<K extends keyof T>(key: K): Promise<T[K] | undefined> {
    const result = await chrome.storage[this.area].get(key as string);
    return result[key as string] as T[K] | undefined;
  }

  async getWithDefault<K extends keyof T>(key: K, defaultValue: T[K]): Promise<T[K]> {
    const result = await this.get(key);
    return result ?? defaultValue;
  }

  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await chrome.storage[this.area].set({ [key as string]: value });
  }

  async remove<K extends keyof T>(key: K): Promise<void> {
    await chrome.storage[this.area].remove(key as string);
  }

  async clear(): Promise<void> {
    await chrome.storage[this.area].clear();
  }
}
```

Namespace Isolation with Key Prefixes {#namespace-isolation-with-key-prefixes}

```typescript
class NamespacedStorage<T extends Record<string, unknown>> {
  constructor(
    private namespace: string,
    private storage: TypedStorage<T>
  ) {}

  private prefixKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<K extends keyof T>(key: K): Promise<T[K] | undefined> {
    return this.storage.get(this.prefixKey(key as string) as keyof T);
  }

  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await this.storage.set(this.prefixKey(key as string) as keyof T, value);
  }
}
```

Migration Support with Version Field {#migration-support-with-version-field}

```typescript
interface StorageWithVersion {
  _version: number;
  [key: string]: unknown;
}

const CURRENT_VERSION = 2;

class VersionedStorage<T extends StorageWithVersion> {
  constructor(
    private storage: TypedStorage<T>,
    private migrations: Map<number, (data: T) => T>
  ) {}

  async migrate(): Promise<void> {
    const current = await this.storage.getWithDefault('_version' as keyof T, { _version: 0 } as T);
    const version = (current as any)._version ?? 0;

    if (version < CURRENT_VERSION) {
      let data = current;
      for (let v = version + 1; v <= CURRENT_VERSION; v++) {
        const migration = this.migrations.get(v);
        if (migration) {
          data = migration(data);
        }
      }
      await this.storage.set('_version' as keyof T, { _version: CURRENT_VERSION } as T);
    }
  }
}
```

Validation with Zod {#validation-with-zod}

```typescript
import { z } from 'zod';

const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().default('en'),
  notificationsEnabled: z.boolean().default(true),
});

type UserPreferences = z.infer<typeof UserPreferencesSchema>;

class ValidatedStorage<T> {
  constructor(
    private storage: TypedStorage<T>,
    private schema: z.ZodType<T>
  ) {}

  async getValidated<K extends keyof T>(key: K): Promise<T[K] | undefined> {
    const data = await this.storage.get(key);
    if (data) {
      return this.schema.parse(data) as T[K];
    }
    return undefined;
  }

  async setValidated<K extends keyof T>(key: K, value: unknown): Promise<void> {
    const validated = this.schema.parse(value);
    await this.storage.set(key, validated as T[K]);
  }
}
```

Atomic Read-Modify-Write Helper {#atomic-read-modify-write-helper}

```typescript
async function atomicUpdate<T>(
  storage: TypedStorage<Record<string, T>>,
  key: keyof Record<string, T>,
  updater: (current: T | undefined) => T
): Promise<T> {
  const current = await storage.get(key as any);
  const updated = updater(current);
  await storage.set(key as any, updated);
  return updated;
}
```

React useStorage Hook {#react-usestorage-hook}

```typescript
import { useState, useEffect, useCallback } from 'react';

function useStorage<T>(key: string, defaultValue: T, area: 'local' | 'sync' = 'local') {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage[area].get(key).then((result) => {
      setValue(result[key] ?? defaultValue);
      setLoading(false);
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[key]) {
        setValue(changes[key].newValue ?? defaultValue);
      }
    };

    chrome.storage[area].addListener(listener);
    return () => chrome.storage[area].removeListener(listener);
  }, [key, defaultValue, area]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const resolved = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(value) 
      : newValue;
    setValue(resolved);
    chrome.storage[area].set({ [key]: resolved });
  }, [key, area, value]);

  return { value, setValue: updateValue, loading };
}
```

Supporting Multiple Storage Areas {#supporting-multiple-storage-areas}

```typescript
const storageAreas = {
  local: new TypedStorage<StorageSchema>('local'),
  sync: new TypedStorage<StorageSchema>('sync'),
  session: new TypedStorage<StorageSchema>('session'),
} as const;
```

Related Patterns {#related-patterns}

- [Storage API Deep Dive](../api-reference/storage-api-deep detailed look.md) - Comprehensive guide to chrome.storage API
- [Storage Patterns](../reference/storage-patterns.md) - Additional storage patterns and best practices
- [State Management](./state-management.md) - Managing application state across components
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
