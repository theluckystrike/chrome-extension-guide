# Storage Migration Patterns for Chrome Extensions

Extensions evolve. Data schemas change. Users update from v1.0 to v3.0 in a single jump.
Without a migration strategy, stale data silently corrupts state, causes crashes, or -- worst
of all -- loses user data. This guide covers eight patterns for safely migrating storage in
Manifest V3 extensions, from simple schema versioning to full rollback strategies.

> **See also:** [State Management](state-management.md) |
> [Update and Migration Lifecycle](update-migration.md)

---

## Pattern 1: Schema Versioning with Storage Metadata

Every migration system starts with knowing what version of data you are working with. Store
a schema version alongside your data and check it on every read.

```typescript
// schema-version.ts

interface StorageMetadata {
  schemaVersion: number;
  lastMigration: string;   // ISO timestamp
  extensionVersion: string; // chrome.runtime.getManifest().version
}

const CURRENT_SCHEMA_VERSION = 5;

async function getSchemaVersion(): Promise<number> {
  const result = await chrome.storage.local.get("__metadata");
  const metadata = result.__metadata as StorageMetadata | undefined;
  return metadata?.schemaVersion ?? 0; // 0 means fresh install or pre-versioning
}

async function setSchemaVersion(version: number): Promise<void> {
  const metadata: StorageMetadata = {
    schemaVersion: version,
    lastMigration: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
  };
  await chrome.storage.local.set({ __metadata: metadata });
}

async function needsMigration(): Promise<boolean> {
  const current = await getSchemaVersion();
  return current < CURRENT_SCHEMA_VERSION;
}
```

**Gotchas:**

- Never use the extension version string (`"1.2.3"`) as the schema version. Extension
  versions and schema versions evolve on different timelines -- a patch release may not
  change the schema at all.
- Use a `__metadata` key (double underscore) to avoid collisions with application data keys.
- Always default to version `0` for missing metadata. This handles users who installed before
  you added versioning.

---

## Pattern 2: Running Migrations on Extension Update (runtime.onInstalled)

`chrome.runtime.onInstalled` fires when the extension is installed, updated, or Chrome
itself updates. This is the canonical place to trigger migrations.

```typescript
// background.ts

interface Migration {
  version: number;
  name: string;
  up: () => Promise<void>;
}

const migrations: Migration[] = [
  { version: 1, name: "add-settings-defaults", up: addSettingsDefaults },
  { version: 2, name: "normalize-urls", up: normalizeStoredUrls },
  { version: 3, name: "split-config-keys", up: splitConfigKeys },
  { version: 4, name: "migrate-to-sync", up: migrateLocalToSync },
  { version: 5, name: "add-created-timestamps", up: addCreatedTimestamps },
];

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // Fresh install -- set to current version, no migrations needed
    await setSchemaVersion(CURRENT_SCHEMA_VERSION);
    return;
  }

  if (details.reason === "update") {
    await runPendingMigrations();
  }
});

async function runPendingMigrations(): Promise<void> {
  const currentVersion = await getSchemaVersion();

  const pending = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) return;

  console.log(`Running ${pending.length} migration(s) from v${currentVersion}`);

  for (const migration of pending) {
    console.log(`Migration ${migration.version}: ${migration.name}`);
    try {
      await migration.up();
      await setSchemaVersion(migration.version);
    } catch (err) {
      console.error(`Migration ${migration.version} failed:`, err);
      // Stop running further migrations -- data may be inconsistent
      throw err;
    }
  }
}
```

**Gotchas:**

- `onInstalled` fires *once* per update, but the service worker may restart many times. Do
  not put migration logic in the top-level worker scope -- it will run on every restart.
- Set the schema version *after each* successful migration, not after all of them. This way,
  if migration 4 of 5 fails, the user retries from 4, not from 1.
- If your migration is slow (>30 s), the service worker may terminate mid-migration.
  MV3 service workers do not have a reliable pre-termination event (there is no
  `chrome.runtime.onSuspend` in service workers). Break large migrations into chunks
  and persist progress after each chunk (see Pattern 7).

---

## Pattern 3: Migrating Between Storage Areas (Local to Sync)

Moving data from `chrome.storage.local` to `chrome.storage.sync` is common when you want
to enable cross-device sync for settings. The two areas have very different quotas.

```typescript
// migrate-local-to-sync.ts

interface SyncLimits {
  maxItems: number;          // 512
  maxBytesPerItem: number;   // 8,192
  maxTotalBytes: number;     // 102,400
}

const SYNC_LIMITS: SyncLimits = {
  maxItems: 512,
  maxBytesPerItem: 8_192,
  maxTotalBytes: 102_400,
};

async function migrateLocalToSync(keys: string[]): Promise<{
  migrated: string[];
  skipped: Array<{ key: string; reason: string }>;
}> {
  const localData = await chrome.storage.local.get(keys);
  const migrated: string[] = [];
  const skipped: Array<{ key: string; reason: string }> = [];

  for (const key of keys) {
    if (!(key in localData)) {
      skipped.push({ key, reason: "not found in local" });
      continue;
    }

    const value = localData[key];
    const serialized = JSON.stringify(value);

    if (serialized.length > SYNC_LIMITS.maxBytesPerItem) {
      skipped.push({
        key,
        reason: `exceeds sync item limit (${serialized.length} > ${SYNC_LIMITS.maxBytesPerItem})`,
      });
      continue;
    }

    // Check total sync usage before writing
    const currentUsage = await chrome.storage.sync.getBytesInUse(null);
    if (currentUsage + serialized.length > SYNC_LIMITS.maxTotalBytes) {
      skipped.push({ key, reason: "would exceed total sync quota" });
      continue;
    }

    await chrome.storage.sync.set({ [key]: value });
    migrated.push(key);
  }

  // Remove migrated keys from local after successful sync write
  if (migrated.length > 0) {
    await chrome.storage.local.remove(migrated);
  }

  return { migrated, skipped };
}
```

**Gotchas:**

- `chrome.storage.sync` has a write limit of 120 operations per minute. If you migrate many
  keys, batch them with `chrome.storage.sync.set({ key1: v1, key2: v2, ... })` in a single
  call.
- `getBytesInUse` returns bytes of the *stored* representation, which may differ from
  `JSON.stringify().length` due to Chrome's internal encoding. Add a 10% safety margin.
- Always remove from local *after* confirming the sync write succeeded. If you delete first
  and the sync write fails, the data is gone.

---

## Pattern 4: Data Transformation Migrations

Schema changes often require reshaping existing data -- renaming fields, changing types,
merging keys. Write each transformation as a pure function that is easy to test.

```typescript
// transform-migrations.ts

// v1 -> v2: rename "blacklist" to "blocklist", add "enabled" field
interface SettingsV1 {
  blacklist: string[];
  theme: "light" | "dark";
}

interface SettingsV2 {
  blocklist: string[];
  theme: "light" | "dark" | "system";
  enabled: boolean;
}

function migrateSettingsV1ToV2(v1: SettingsV1): SettingsV2 {
  return {
    blocklist: v1.blacklist,
    theme: v1.theme, // "system" only available going forward
    enabled: true,   // default existing users to enabled
  };
}

// v2 -> v3: flatten nested config into top-level keys
interface ConfigV2 {
  settings: SettingsV2;
  profile: { name: string; avatar: string };
}

interface ConfigV3 {
  blocklist: string[];
  theme: "light" | "dark" | "system";
  enabled: boolean;
  profileName: string;
  profileAvatar: string;
}

function migrateConfigV2ToV3(v2: ConfigV2): ConfigV3 {
  return {
    ...v2.settings,
    profileName: v2.profile.name,
    profileAvatar: v2.profile.avatar,
  };
}

// Generic migration runner
type TransformFn<TInput, TOutput> = (input: TInput) => TOutput;

async function runTransformMigration<TInput, TOutput>(
  storageKey: string,
  transform: TransformFn<TInput, TOutput>,
  storageArea: chrome.storage.StorageArea = chrome.storage.local
): Promise<void> {
  const result = await storageArea.get(storageKey);
  const oldData = result[storageKey] as TInput | undefined;

  if (oldData === undefined) return;

  const newData = transform(oldData);
  await storageArea.set({ [storageKey]: newData });
}

// Usage
async function addCreatedTimestamps(): Promise<void> {
  await runTransformMigration("config", migrateConfigV2ToV3);
}
```

**Gotchas:**

- Keep old interface definitions in your codebase forever (or at least for several major
  versions). You need them to correctly type the `transform` function input.
- Never mutate the input object. Always return a fresh object. This makes rollback easier
  if you store a backup (see Pattern 5).
- Test transformations with real user data snapshots, not just hand-crafted test fixtures.
  Users store surprising things.

---

## Pattern 5: Rollback Strategies for Failed Migrations

Migrations can fail halfway through. Store a backup before starting, and provide a rollback
mechanism to restore the previous state.

```typescript
// migration-rollback.ts

interface MigrationBackup {
  version: number;
  timestamp: string;
  data: Record<string, unknown>;
}

async function createBackup(version: number): Promise<void> {
  // Get all current data
  const allData = await chrome.storage.local.get(null);

  // Remove any existing backup to free space
  delete allData.__migration_backup;

  const backup: MigrationBackup = {
    version,
    timestamp: new Date().toISOString(),
    data: allData,
  };

  await chrome.storage.local.set({ __migration_backup: backup });
}

async function rollback(): Promise<boolean> {
  const result = await chrome.storage.local.get("__migration_backup");
  const backup = result.__migration_backup as MigrationBackup | undefined;

  if (!backup) {
    console.error("No backup found -- cannot rollback");
    return false;
  }

  // Clear everything and restore
  await chrome.storage.local.clear();
  await chrome.storage.local.set(backup.data);
  await setSchemaVersion(backup.version);

  console.log(`Rolled back to schema version ${backup.version}`);
  return true;
}

// Enhanced migration runner with backup/rollback
async function runMigrationSafe(migration: Migration): Promise<void> {
  const currentVersion = await getSchemaVersion();
  await createBackup(currentVersion);

  try {
    await migration.up();
    await setSchemaVersion(migration.version);
    // Keep backup for a while -- remove it after the next successful migration
  } catch (err) {
    console.error(`Migration ${migration.version} failed, rolling back:`, err);
    const success = await rollback();
    if (!success) {
      // Last resort: notify the user
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/error.png",
        title: "Extension Data Error",
        message: "A data migration failed. Please reinstall the extension.",
      });
    }
    throw err;
  }
}
```

**Gotchas:**

- `chrome.storage.local` has a default quota of 10 MB (or unlimited with the
  `unlimitedStorage` permission). Storing a full backup doubles your usage -- check
  `getBytesInUse` before creating the backup.
- `chrome.storage.local.clear()` during rollback wipes *everything*, including the backup
  itself. Read the backup into memory first, then clear, then write.
- For `chrome.storage.sync`, quotas are tight (100 KB). You cannot store a meaningful
  backup in sync storage. Back up sync data into local storage instead.

---

## Pattern 6: Migrating from localStorage to chrome.storage

Extensions migrating from MV2 to MV3 often need to move data from `localStorage` (available
in the old background page) to `chrome.storage`. Since MV3 service workers have no
`localStorage`, this migration must happen during the MV2-to-MV3 transition.

```typescript
// localstorage-migration.ts
// Run this in a content script or an offscreen document that has DOM access

interface LegacyData {
  [key: string]: string; // localStorage is always string-valued
}

function extractLocalStorage(keys?: string[]): LegacyData {
  const data: LegacyData = {};
  const targetKeys = keys ?? Object.keys(localStorage);

  for (const key of targetKeys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  }

  return data;
}

function parseStoredValues(raw: LegacyData): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    try {
      // Attempt JSON parse -- localStorage often stores serialized objects
      parsed[key] = JSON.parse(value);
    } catch {
      // Not JSON -- keep as string
      parsed[key] = value;
    }
  }

  return parsed;
}

async function migrateFromLocalStorage(keys?: string[]): Promise<number> {
  const raw = extractLocalStorage(keys);
  if (Object.keys(raw).length === 0) return 0;

  const parsed = parseStoredValues(raw);
  await chrome.storage.local.set(parsed);

  // Mark migration complete so we don't re-run
  await chrome.storage.local.set({
    __localstorage_migrated: {
      timestamp: new Date().toISOString(),
      keyCount: Object.keys(parsed).length,
    },
  });

  // Clean up localStorage
  for (const key of Object.keys(raw)) {
    localStorage.removeItem(key);
  }

  return Object.keys(parsed).length;
}

// Guard: only run once
async function migrateFromLocalStorageOnce(keys?: string[]): Promise<void> {
  const result = await chrome.storage.local.get("__localstorage_migrated");
  if (result.__localstorage_migrated) return;

  const count = await migrateFromLocalStorage(keys);
  console.log(`Migrated ${count} keys from localStorage to chrome.storage.local`);
}
```

**Gotchas:**

- In MV3, service workers have no `localStorage`. This migration *must* run in a context
  that has DOM access: a content script, popup, options page, or offscreen document.
- `JSON.parse` on every value is risky. A string value of `"true"` will parse to boolean
  `true`. If you need to preserve string types, use an explicit type map.
- Chrome preserves `localStorage` data from the old MV2 background page in the extension's
  origin. It remains accessible from the options page or popup even after the MV3 upgrade.

---

## Pattern 7: Large Data Migration with Chunking

When migrating thousands of records, a single `chrome.storage.local.set()` call can exceed
the write size limit or block the service worker. Break the work into async chunks.

```typescript
// chunked-migration.ts

interface ChunkProgress {
  total: number;
  processed: number;
  currentChunk: number;
  totalChunks: number;
}

async function migrateInChunks<T>(
  items: T[],
  processChunk: (chunk: T[]) => Promise<void>,
  options: {
    chunkSize?: number;
    delayBetweenChunks?: number;
    onProgress?: (progress: ChunkProgress) => void;
  } = {}
): Promise<void> {
  const { chunkSize = 100, delayBetweenChunks = 10, onProgress } = options;
  const totalChunks = Math.ceil(items.length / chunkSize);

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const currentChunk = Math.floor(i / chunkSize) + 1;

    await processChunk(chunk);

    onProgress?.({
      total: items.length,
      processed: i + chunk.length,
      currentChunk,
      totalChunks,
    });

    // Yield to the event loop between chunks to avoid blocking
    if (delayBetweenChunks > 0 && i + chunkSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));
    }
  }
}

// Example: migrate bookmark metadata records
interface BookmarkMeta {
  id: string;
  tags: string[];
  notes: string;
  createdAt: number;
}

async function migrateBookmarkMetadata(): Promise<void> {
  const result = await chrome.storage.local.get("bookmarkMeta");
  const allMeta: BookmarkMeta[] = result.bookmarkMeta ?? [];

  if (allMeta.length === 0) return;

  // Transform: old format stored tags as comma-separated string
  const transformed = allMeta.map((item) => ({
    ...item,
    tags: typeof item.tags === "string"
      ? (item.tags as unknown as string).split(",").map((t) => t.trim())
      : item.tags,
    createdAt: item.createdAt ?? Date.now(),
  }));

  // Store each bookmark under its own key for granular sync
  await migrateInChunks(
    transformed,
    async (chunk) => {
      const batch: Record<string, BookmarkMeta> = {};
      for (const item of chunk) {
        batch[`bm_${item.id}`] = item;
      }
      await chrome.storage.local.set(batch);
    },
    {
      chunkSize: 50,
      onProgress: (p) => {
        console.log(`Migration: ${p.processed}/${p.total} (chunk ${p.currentChunk}/${p.totalChunks})`);
      },
    }
  );

  // Remove the old monolithic key
  await chrome.storage.local.remove("bookmarkMeta");
}
```

**Gotchas:**

- `chrome.storage.local.set` with a very large object can cause the service worker to run
  out of memory before the write completes. Keep chunks under 1 MB.
- The `setTimeout` between chunks keeps the event loop responsive but also resets the
  service worker idle timer. For very long migrations, this is actually helpful.
- If the extension updates again mid-migration, your `onInstalled` handler will fire again.
  Track chunk progress in storage so you can resume, not restart.

---

## Pattern 8: Testing Migrations with @theluckystrike/webext-storage

Use `@theluckystrike/webext-storage` to mock `chrome.storage` in unit tests. This lets you
verify migrations without a browser.

```typescript
// __tests__/migrations.test.ts
import { createMockStorage } from "@theluckystrike/webext-storage/testing";
import { runPendingMigrations, setSchemaVersion } from "../migrations";
import { migrateSettingsV1ToV2 } from "../transform-migrations";

describe("migrateSettingsV1ToV2", () => {
  it("renames blacklist to blocklist and adds enabled flag", () => {
    const v1 = { blacklist: ["example.com"], theme: "dark" as const };
    const v2 = migrateSettingsV1ToV2(v1);

    expect(v2.blocklist).toEqual(["example.com"]);
    expect(v2.enabled).toBe(true);
    expect(v2.theme).toBe("dark");
    expect(v2).not.toHaveProperty("blacklist");
  });

  it("preserves empty blacklist as empty blocklist", () => {
    const v1 = { blacklist: [], theme: "light" as const };
    const v2 = migrateSettingsV1ToV2(v1);

    expect(v2.blocklist).toEqual([]);
  });
});

describe("runPendingMigrations", () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    // Replace chrome.storage with mock
    globalThis.chrome = {
      ...globalThis.chrome,
      storage: {
        local: mockStorage.local,
        sync: mockStorage.sync,
      },
      runtime: {
        getManifest: () => ({ version: "2.0.0" }),
      },
    } as typeof chrome;
  });

  afterEach(() => {
    mockStorage.reset();
  });

  it("runs only pending migrations", async () => {
    // Simulate a user at schema version 2
    await chrome.storage.local.set({
      __metadata: { schemaVersion: 2, lastMigration: "", extensionVersion: "1.0" },
      config: { settings: { blocklist: [], theme: "dark", enabled: true }, profile: { name: "Test", avatar: "" } },
    });

    await runPendingMigrations();

    const result = await chrome.storage.local.get("__metadata");
    expect(result.__metadata.schemaVersion).toBe(5);
  });

  it("stops on migration failure and preserves last good version", async () => {
    await chrome.storage.local.set({
      __metadata: { schemaVersion: 0, lastMigration: "", extensionVersion: "0.9" },
    });

    // Migration 3 will fail because "config" key doesn't exist in expected format
    await expect(runPendingMigrations()).rejects.toThrow();

    const result = await chrome.storage.local.get("__metadata");
    // Should have stopped at the failed migration, preserving the last good version
    expect(result.__metadata.schemaVersion).toBeLessThan(5);
  });
});

describe("local to sync migration", () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage({
      syncQuota: { maxBytesPerItem: 8192, maxTotalBytes: 102400 },
    });
    globalThis.chrome = {
      ...globalThis.chrome,
      storage: {
        local: mockStorage.local,
        sync: mockStorage.sync,
      },
    } as typeof chrome;
  });

  it("skips items that exceed sync item size limit", async () => {
    const largeValue = "x".repeat(10_000);
    await chrome.storage.local.set({ small: "yes", large: largeValue });

    const { migrateLocalToSync } = await import("../migrate-local-to-sync");
    const result = await migrateLocalToSync(["small", "large"]);

    expect(result.migrated).toContain("small");
    expect(result.skipped).toContainEqual(
      expect.objectContaining({ key: "large", reason: expect.stringContaining("exceeds") })
    );
  });
});
```

**Gotchas:**

- `@theluckystrike/webext-storage` mocks quota enforcement by default. Pass custom
  `syncQuota` options to simulate tight quota scenarios.
- Do not mock `chrome.storage.onChanged` manually. The library fires change events
  automatically when `set` or `remove` is called, matching real Chrome behavior.
- Run migration tests in order *and* individually. Sequential tests catch issues with
  cumulative state; individual tests verify each migration works in isolation.
- Use snapshots of real user data (anonymized) as test fixtures. Synthetic data misses
  edge cases like `undefined` values stored by older extension versions.

---

## Quick Reference

| Pattern | When to Use | Key API |
|---------|------------|---------|
| Schema versioning | Every extension | `chrome.storage.local` metadata key |
| onInstalled runner | Every extension | `chrome.runtime.onInstalled` |
| Local-to-sync | Enabling cross-device sync | `chrome.storage.sync.set` |
| Data transforms | Schema shape changes | Pure transform functions |
| Rollback | High-risk migrations | Backup/restore in `chrome.storage.local` |
| localStorage migration | MV2 to MV3 upgrade | `localStorage` + offscreen/popup |
| Chunked migration | Thousands of records | Batched `set()` with progress |
| Testing | CI/CD pipeline | `@theluckystrike/webext-storage/testing` |

---

*Last updated: 2026-03-06*
