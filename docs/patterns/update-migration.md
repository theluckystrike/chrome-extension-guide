---
layout: default
title: "Chrome Extension Update Migration. Best Practices"
description: "Handle extension updates and migrations smoothly."
canonical_url: "https://bestchromeextensions.com/patterns/update-migration/"
---

# Extension Update and Migration Strategies

Overview {#overview}

Chrome auto-updates extensions silently. When users receive a new version, your service worker restarts, storage schemas may be outdated, context menus disappear, and alarms are cleared. Without proper migration code, updates break features and lose user data. This guide covers practical patterns for handling installs, updates, schema migrations, permission changes, and rollback strategies.

---

The Update Lifecycle {#the-update-lifecycle}

```

              Chrome Updates Your Extension            
                                                      
  1. New .crx downloaded and unpacked                 
  2. Old service worker terminated                    
  3. New service worker starts                        
  4. runtime.onInstalled fires (reason: "update")     
  5. Context menus, alarms, rules. all gone          
  6. Storage data. still there (old schema)          
                                                      
  Your job: re-register ephemeral state,              
            migrate storage, handle breaking changes   

```

Key facts:
- Storage persists across updates. `chrome.storage.local` and `chrome.storage.sync` survive
- Ephemeral state is lost. context menus, alarms, declarativeNetRequest rules must be re-registered
- Service worker restarts. all global variables and in-memory state are gone
- `previousVersion` is available in the `onInstalled` details for update events

---

Pattern 1: Handling onInstalled Events {#pattern-1-handling-oninstalled-events}

The `chrome.runtime.onInstalled` event fires for three distinct reasons. Handle each one explicitly:

```ts
// background.ts

chrome.runtime.onInstalled.addListener(async (details) => {
  switch (details.reason) {
    case "install":
      await handleFirstInstall();
      break;
    case "update":
      await handleExtensionUpdate(details.previousVersion!);
      break;
    case "chrome_update":
      await handleChromeUpdate();
      break;
  }
});

async function handleFirstInstall(): Promise<void> {
  await chrome.storage.local.set({
    schemaVersion: 3,
    settings: { theme: "system", notifications: true },
    userData: { bookmarks: [], history: [] },
    installedAt: Date.now(),
  });
  await registerEphemeralState();
  await chrome.tabs.create({
    url: chrome.runtime.getURL("onboarding.html"),
  });
}

async function handleExtensionUpdate(
  previousVersion: string
): Promise<void> {
  await runMigrations(previousVersion);
  await registerEphemeralState();
  await showChangelogNotification(previousVersion);
}

async function handleChromeUpdate(): Promise<void> {
  // Chrome itself updated. re-register ephemeral state
  // No schema migration needed
  await registerEphemeralState();
}
```

---

Pattern 2: Storage Schema Versioning {#pattern-2-storage-schema-versioning}

Always store a version number alongside your data. Define typed interfaces for each version:

```ts
// lib/schema.ts

// Version 1: Initial schema
interface SettingsV1 {
  enabled: boolean;
  color: string;
}

// Version 2: Renamed color → accentColor, added theme
interface SettingsV2 {
  enabled: boolean;
  accentColor: string;
  theme: "light" | "dark";
}

// Version 3: Added notifications, widened theme enum
interface SettingsV3 {
  enabled: boolean;
  accentColor: string;
  theme: "light" | "dark" | "system";
  notifications: { email: boolean; push: boolean; digest: string };
}

export type Settings = SettingsV3;
export const CURRENT_SCHEMA_VERSION = 3;
```

```ts
// lib/migration-runner.ts

export interface Migration {
  version: number;
  description: string;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}

export const migrations: Migration[] = [
  {
    version: 2,
    description: "Rename color to accentColor, add theme field",
    migrate(data) {
      const settings = data.settings as Record<string, unknown>;
      return {
        ...data,
        schemaVersion: 2,
        settings: {
          ...settings,
          accentColor: settings.color ?? "#4285f4",
          theme: "light",
          color: undefined,
        },
      };
    },
  },
  {
    version: 3,
    description: "Add notification preferences, expand theme options",
    migrate(data) {
      const settings = data.settings as Record<string, unknown>;
      return {
        ...data,
        schemaVersion: 3,
        settings: {
          ...settings,
          theme: settings.theme === "light" ? "system" : settings.theme,
          notifications: { email: true, push: true, digest: "weekly" },
        },
      };
    },
  },
];
```

---

Pattern 3: Incremental Migration Runner {#pattern-3-incremental-migration-runner}

Always migrate through every intermediate version (v1 -> v2 -> v3), never skip steps. Each migration is small, testable, and reversible:

```ts
// lib/migrate.ts
import { migrations, CURRENT_SCHEMA_VERSION } from "./schema";

export async function runMigrations(
  previousVersion: string
): Promise<void> {
  const data = await chrome.storage.local.get(null);
  const currentSchema = (data.schemaVersion as number) ?? 1;

  if (currentSchema >= CURRENT_SCHEMA_VERSION) return;

  // Back up current data before migrating
  await chrome.storage.local.set({
    [`__backup_v${currentSchema}`]: JSON.parse(JSON.stringify(data)),
  });

  // Run each migration in order
  let migrated = { ...data };
  const pending = migrations
    .filter((m) => m.version > currentSchema)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    try {
      migrated = migration.migrate(migrated);
    } catch (error) {
      console.error(`Migration to v${migration.version} failed:`, error);
      // Restore backup and abort
      const backup = await chrome.storage.local.get(
        `__backup_v${currentSchema}`
      );
      await chrome.storage.local.set(
        backup[`__backup_v${currentSchema}`]
      );
      return;
    }
  }

  await chrome.storage.local.set(migrated);
}
```

Why incremental? Consider a user who skipped several versions:

```
User on v1.0 (schema v1) → auto-updates to v3.0 (schema v3)

Skip approach (BAD):  v1 → v3 must handle every v1 edge case
Incremental (GOOD):   v1 → v2 (rename field) → v3 (add object)
                       Each step is small and independently testable
```

---

Pattern 4: Context Menu and Alarm Re-registration {#pattern-4-context-menu-and-alarm-re-registration}

Context menus, alarms, and declarativeNetRequest rules are ephemeral. Chrome clears them on update. Re-register on install, update, and every service worker startup:

```ts
// lib/ephemeral-state.ts

export async function registerEphemeralState(): Promise<void> {
  await Promise.all([
    registerContextMenus(),
    registerAlarms(),
  ]);
}

async function registerContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll(); // Avoid "duplicate ID" errors

  chrome.contextMenus.create({
    id: "save-selection",
    title: "Save selection",
    contexts: ["selection"],
  });

  const { settings } = await chrome.storage.local.get("settings");
  if (settings?.advancedMode) {
    chrome.contextMenus.create({
      id: "inspect-element",
      title: "Inspect with extension",
      contexts: ["page"],
    });
  }
}

async function registerAlarms(): Promise<void> {
  await chrome.alarms.clearAll();

  await chrome.alarms.create("sync-data", { periodInMinutes: 30 });
  await chrome.alarms.create("cleanup-cache", { periodInMinutes: 1440 });

  // Restore persisted one-shot alarms
  const { pendingAlarms = [] } = await chrome.storage.local.get(
    "pendingAlarms"
  );
  for (const alarm of pendingAlarms) {
    if (alarm.scheduledTime > Date.now()) {
      await chrome.alarms.create(alarm.name, {
        when: alarm.scheduledTime,
      });
    }
  }
}
```

Register on both install/update and every service worker start:

```ts
// background.ts

chrome.runtime.onInstalled.addListener(() => registerEphemeralState());

// Also on every SW start. context menus survive restarts but
// re-registering is safe since we removeAll() first
registerEphemeralState();
```

Persist one-shot alarm timestamps so they survive updates:

```ts
// lib/alarm-persistence.ts

export async function createPersistentAlarm(
  name: string,
  when: number
): Promise<void> {
  await chrome.alarms.create(name, { when });
  const { pendingAlarms = [] } = await chrome.storage.local.get(
    "pendingAlarms"
  );
  pendingAlarms.push({ name, scheduledTime: when });
  await chrome.storage.local.set({ pendingAlarms });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const { pendingAlarms = [] } = await chrome.storage.local.get(
    "pendingAlarms"
  );
  await chrome.storage.local.set({
    pendingAlarms: pendingAlarms.filter(
      (a: { name: string }) => a.name !== alarm.name
    ),
  });
});
```

---

Pattern 5: Handling Breaking Permission Changes {#pattern-5-handling-breaking-permission-changes}

When an update requires new permissions, Chrome won't grant them automatically. Use `optional_permissions` and request at runtime:

```json
{
  "permissions": ["storage", "alarms", "contextMenus"],
  "optional_permissions": ["tabs", "bookmarks", "history"]
}
```

```ts
// lib/permissions.ts

export async function checkAndRequestPermission(
  permission: string,
  reason: string
): Promise<boolean> {
  const granted = await chrome.permissions.contains({
    permissions: [permission],
  });
  if (granted) return true;

  // Must be called from a user gesture (click handler)
  try {
    return await chrome.permissions.request({
      permissions: [permission],
    });
  } catch {
    return false;
  }
}

export async function getFeatureAvailability(): Promise<
  Record<string, boolean>
> {
  const features: Record<string, string[]> = {
    urlFilter: ["tabs"],
    bookmarkSync: ["bookmarks"],
  };

  const result: Record<string, boolean> = {};
  for (const [feature, perms] of Object.entries(features)) {
    result[feature] = await chrome.permissions.contains({
      permissions: perms,
    });
  }
  return result;
}
```

Disable features gracefully when permissions are revoked between versions:

```ts
// background.ts

chrome.permissions.onRemoved.addListener(async (permissions) => {
  const { settings } = await chrome.storage.local.get("settings");
  const availability = await getFeatureAvailability();

  for (const [feature, available] of Object.entries(availability)) {
    if (!available && settings?.[feature]?.enabled) {
      settings[feature].enabled = false;
    }
  }
  await chrome.storage.local.set({ settings });
});
```

---

Pattern 6: Post-Update Changelog Notification {#pattern-6-post-update-changelog-notification}

Let users know what changed without being intrusive. Only open tabs for major updates:

```ts
// lib/changelog.ts

interface ChangelogEntry {
  version: string;
  type: "major" | "minor" | "patch";
  highlights: string[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "3.0.0",
    type: "major",
    highlights: ["Redesigned settings", "Dark mode support"],
  },
  {
    version: "2.5.0",
    type: "minor",
    highlights: ["Performance improvements", "Context menu fix"],
  },
];

export async function showChangelogNotification(
  previousVersion: string
): Promise<void> {
  const current = chrome.runtime.getManifest().version;
  const newEntries = changelog.filter(
    (e) => compareVersions(e.version, previousVersion) > 0
      && compareVersions(e.version, current) <= 0
  );

  if (newEntries.length === 0) return;

  if (newEntries.some((e) => e.type === "major")) {
    // Open changelog tab for major updates (don't steal focus)
    await chrome.tabs.create({
      url: chrome.runtime.getURL(
        `changelog.html?from=${previousVersion}`
      ),
      active: false,
    });
  } else {
    // Badge + stored notice for the popup to show
    await chrome.action.setBadgeText({ text: "NEW" });
    await chrome.action.setBadgeBackgroundColor({ color: "#4285f4" });
    await chrome.storage.local.set({
      pendingChangelog: { entries: newEntries, dismissedAt: null },
    });
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
```

---

Pattern 7: Rollback Strategies When Migrations Fail {#pattern-7-rollback-strategies-when-migrations-fail}

A solid migration runner tracks state and can automatically roll back:

```ts
// lib/robust-migrate.ts

interface MigrationState {
  status: "running" | "complete" | "failed";
  fromVersion: number;
  toVersion: number;
  completedSteps: number[];
  error?: string;
}

export async function runMigrationsWithTracking(): Promise<void> {
  const data = await chrome.storage.local.get(null);
  const currentSchema = (data.schemaVersion as number) ?? 1;
  if (currentSchema >= CURRENT_SCHEMA_VERSION) return;

  const state: MigrationState = {
    status: "running",
    fromVersion: currentSchema,
    toVersion: CURRENT_SCHEMA_VERSION,
    completedSteps: [],
  };
  await chrome.storage.local.set({ __migrationState: state });

  // Backup
  await chrome.storage.local.set({
    [`__backup_v${currentSchema}`]: { ...data },
  });

  let migrated = { ...data };
  const pending = migrations
    .filter((m) => m.version > currentSchema)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    try {
      migrated = migration.migrate(migrated);
      state.completedSteps.push(migration.version);
      await chrome.storage.local.set({ __migrationState: state });
    } catch (error) {
      state.status = "failed";
      state.error = error instanceof Error ? error.message : String(error);
      await chrome.storage.local.set({ __migrationState: state });

      // Auto-rollback
      const backupKey = `__backup_v${currentSchema}`;
      const backup = await chrome.storage.local.get(backupKey);
      if (backup[backupKey]) {
        await chrome.storage.local.clear();
        await chrome.storage.local.set(backup[backupKey]);
      }
      return;
    }
  }

  state.status = "complete";
  await chrome.storage.local.set({ ...migrated, __migrationState: state });
}
```

Expose rollback to the options page for manual recovery:

```ts
// lib/rollback.ts

export async function rollbackToVersion(
  targetVersion: number
): Promise<boolean> {
  const backupKey = `__backup_v${targetVersion}`;
  const { [backupKey]: backup } = await chrome.storage.local.get(backupKey);

  if (!backup || backup.schemaVersion !== targetVersion) return false;

  await chrome.storage.local.clear();
  await chrome.storage.local.set(backup);
  await registerEphemeralState();
  return true;
}
```

---

Pattern 8: Testing Migrations with Mock Storage {#pattern-8-testing-migrations-with-mock-storage}

Migrations are critical code paths. Test every version transition with fixture data:

```ts
// tests/fixtures/storage-fixtures.ts

export const storageV1 = {
  schemaVersion: 1,
  settings: { enabled: true, color: "#ff5722" },
  userData: {
    bookmarks: [{ id: "1", url: "https://example.com", title: "Example" }],
  },
};

export const storageV2 = {
  schemaVersion: 2,
  settings: { enabled: true, accentColor: "#ff5722", theme: "light" as const },
  userData: { bookmarks: [{ id: "1", url: "https://example.com", title: "Example" }] },
};

export const storageNoVersion = {
  settings: { enabled: true, color: "#4285f4" },
};
```

```ts
// tests/migrations.test.ts
import { describe, it, expect } from "vitest";
import { migrations } from "../lib/migration-runner";
import { storageV1, storageV2, storageNoVersion } from "./fixtures/storage-fixtures";

describe("Migration v1 → v2", () => {
  const migrate = migrations.find((m) => m.version === 2)!.migrate;

  it("renames color to accentColor", () => {
    const result = migrate(structuredClone(storageV1));
    expect(result.settings.accentColor).toBe("#ff5722");
    expect(result.settings.color).toBeUndefined();
    expect(result.schemaVersion).toBe(2);
  });

  it("adds theme field with default", () => {
    const result = migrate(structuredClone(storageV1));
    expect(result.settings.theme).toBe("light");
  });

  it("preserves existing userData", () => {
    const result = migrate(structuredClone(storageV1));
    expect(result.userData.bookmarks).toHaveLength(1);
  });
});

describe("Full migration chain v1 → v3", () => {
  it("migrates through all versions sequentially", () => {
    let data: Record<string, unknown> = structuredClone(storageV1);
    for (const migration of migrations) {
      if (migration.version > ((data.schemaVersion as number) ?? 1)) {
        data = migration.migrate(data);
      }
    }
    expect(data.schemaVersion).toBe(3);
    expect(data.settings.accentColor).toBe("#ff5722");
    expect(data.settings.theme).toBe("system");
    expect(data.settings.notifications.digest).toBe("weekly");
  });

  it("handles data with no schema version", () => {
    let data: Record<string, unknown> = structuredClone(storageNoVersion);
    for (const migration of migrations) {
      if (migration.version > ((data.schemaVersion as number) ?? 1)) {
        data = migration.migrate(data);
      }
    }
    expect(data.schemaVersion).toBe(3);
  });
});
```

Mock `chrome.storage.local` for integration tests:

```ts
// tests/helpers/mock-storage.ts

export function createMockStorage(
  initial: Record<string, unknown> = {}
): typeof chrome.storage.local {
  let store = { ...initial };
  return {
    get: (keys) => {
      if (keys === null) return Promise.resolve({ ...store });
      const arr = typeof keys === "string" ? [keys] : keys;
      const result: Record<string, unknown> = {};
      for (const k of arr) if (k in store) result[k] = store[k];
      return Promise.resolve(result);
    },
    set: (items) => { store = { ...store, ...items }; return Promise.resolve(); },
    remove: (keys) => {
      for (const k of typeof keys === "string" ? [keys] : keys) delete store[k];
      return Promise.resolve();
    },
    clear: () => { store = {}; return Promise.resolve(); },
  } as unknown as typeof chrome.storage.local;
}
```

---

Summary {#summary}

| Pattern | Problem It Solves |
|---------|------------------|
| onInstalled handler | Distinguish install vs update vs Chrome update events |
| Schema versioning | Track what shape your stored data is in |
| Incremental migrations | Safe, testable upgrade path through every version |
| Ephemeral re-registration | Context menus, alarms, and rules lost on every update |
| Permission handling | Graceful degradation when permissions change between versions |
| Changelog notification | Inform users about new features without being intrusive |
| Rollback strategies | Recover user data when a migration fails |
| Testing migrations | Catch migration bugs before they reach users |

Extension updates are invisible to users. until something breaks. Always version your storage schema, migrate incrementally with backups, re-register ephemeral state on every startup, and test your migration chain from every historical schema version to the current one. The ten minutes you spend writing migration tests will save you from a one-star review that says "lost all my settings after update."
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
