---
layout: default
title: "Chrome Extension Data Sync — Best Practices"
description: "Sync extension data across devices with sync storage."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/data-sync/"
---

# Data Synchronization Patterns

## Overview {#overview}

Chrome extensions that store user data face a deceptively hard problem: keeping that data consistent across devices, respecting quota limits, and recovering gracefully when things go wrong. The `chrome.storage.sync` API handles the transport layer, but conflict resolution, delta tracking, and migration are your responsibility. This guide covers eight practical patterns for reliable data synchronization.

---

## Storage Area Comparison {#storage-area-comparison}

| Property | `storage.local` | `storage.sync` | `storage.session` |
|----------|-----------------|----------------|--------------------|
| Max total size | 10 MB | 100 KB | 10 MB |
| Max per item | No limit | 8,192 bytes | No limit |
| Max items | No limit | 512 | No limit |
| Write operations/hour | No limit | 1,800 | No limit |
| Syncs across devices | No | Yes | No |
| Persists on restart | Yes | Yes | No |
| Available in | All contexts | All contexts | All contexts (MV3) |

---

## Pattern 1: Cross-Device Settings with chrome.storage.sync {#pattern-1-cross-device-settings-with-chromestoragesync}

The simplest sync pattern — store user preferences that follow them across devices:

```ts
// types.ts
interface UserSettings {
  theme: "light" | "dark" | "system";
  fontSize: number;
  notifications: boolean;
  blockedSites: string[];
  lastUpdated: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  fontSize: 14,
  notifications: true,
  blockedSites: [],
  lastUpdated: 0,
};
```

```ts
// settings.ts
async function getSettings(): Promise<UserSettings> {
  const stored = await chrome.storage.sync.get("settings");
  return { ...DEFAULT_SETTINGS, ...stored.settings };
}

async function updateSettings(
  partial: Partial<UserSettings>
): Promise<UserSettings> {
  const current = await getSettings();
  const updated: UserSettings = {
    ...current,
    ...partial,
    lastUpdated: Date.now(),
  };
  await chrome.storage.sync.set({ settings: updated });
  return updated;
}

// Usage in options page
const saveButton = document.getElementById("save")!;
saveButton.addEventListener("click", async () => {
  const theme = (document.getElementById("theme") as HTMLSelectElement).value;
  await updateSettings({ theme: theme as UserSettings["theme"] });
});
```

### Gotcha: Sync Is Eventually Consistent {#gotcha-sync-is-eventually-consistent}

Changes written on device A may take seconds to minutes to appear on device B. Never assume immediate consistency — always treat `storage.sync` as an eventually-consistent store.

---

## Pattern 2: Conflict Resolution Strategies {#pattern-2-conflict-resolution-strategies}

When two devices edit the same data before sync completes, you need a strategy.

### Last-Write-Wins (LWW) {#last-write-wins-lww}

The simplest approach — timestamp every change, keep the newest:

```ts
// conflict-lww.ts
interface Timestamped<T> {
  value: T;
  updatedAt: number;
  deviceId: string;
}

function resolveConflictLWW<T>(
  local: Timestamped<T>,
  remote: Timestamped<T>
): Timestamped<T> {
  if (remote.updatedAt > local.updatedAt) {
    return remote;
  }
  if (remote.updatedAt === local.updatedAt) {
    // Deterministic tiebreaker: compare device IDs lexicographically
    return remote.deviceId > local.deviceId ? remote : local;
  }
  return local;
}

// Generate a stable device ID on first install
async function getDeviceId(): Promise<string> {
  const { deviceId } = await chrome.storage.local.get("deviceId");
  if (deviceId) return deviceId;

  const id = crypto.randomUUID();
  await chrome.storage.local.set({ deviceId: id });
  return id;
}
```

### Field-Level Merge {#field-level-merge}

For complex objects, merge at the field level instead of replacing the whole object:

```ts
// conflict-merge.ts
interface MergeableSettings {
  [key: string]: {
    value: unknown;
    updatedAt: number;
  };
}

function mergeFields(
  local: MergeableSettings,
  remote: MergeableSettings
): MergeableSettings {
  const result: MergeableSettings = { ...local };

  for (const [key, remoteField] of Object.entries(remote)) {
    const localField = local[key];
    if (!localField || remoteField.updatedAt > localField.updatedAt) {
      result[key] = remoteField;
    }
  }

  return result;
}

// Example: two devices change different fields simultaneously
// Device A: changes theme at t=100
// Device B: changes fontSize at t=101
// Result: both changes are preserved
```

### Set Union for Collections {#set-union-for-collections}

For arrays like blocklists, union is often safer than replacement:

```ts
// conflict-union.ts
function mergeBlocklists(local: string[], remote: string[]): string[] {
  return [...new Set([...local, ...remote])];
}

// For sets with add/remove, track operations instead of state
interface SetOperation {
  action: "add" | "remove";
  item: string;
  timestamp: number;
}

function applyOperations(operations: SetOperation[]): Set<string> {
  // Sort by timestamp, then apply in order
  const sorted = [...operations].sort((a, b) => a.timestamp - b.timestamp);
  const result = new Set<string>();

  for (const op of sorted) {
    if (op.action === "add") result.add(op.item);
    else result.delete(op.item);
  }

  return result;
}
```

---

## Pattern 3: Optimistic UI Updates with storage.onChanged {#pattern-3-optimistic-ui-updates-with-storageonchanged}

Update the UI immediately on local write, then reconcile when the real sync fires:

```ts
// optimistic-ui.ts
class SettingsStore {
  private listeners = new Set<(settings: UserSettings) => void>();
  private cache: UserSettings | null = null;

  constructor() {
    // Listen for changes from other devices or other extension contexts
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync" || !changes.settings) return;

      const remote = changes.settings.newValue as UserSettings;
      this.cache = remote;
      this.notifyListeners(remote);
    });
  }

  subscribe(listener: (settings: UserSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(settings: UserSettings) {
    for (const listener of this.listeners) {
      listener(settings);
    }
  }

  async get(): Promise<UserSettings> {
    if (this.cache) return this.cache;
    this.cache = await getSettings();
    return this.cache;
  }

  async update(partial: Partial<UserSettings>): Promise<void> {
    // 1. Optimistically update cache and notify UI
    const current = await this.get();
    const optimistic = { ...current, ...partial, lastUpdated: Date.now() };
    this.cache = optimistic;
    this.notifyListeners(optimistic);

    // 2. Persist — if this fails, the onChanged listener will correct the UI
    try {
      await chrome.storage.sync.set({ settings: optimistic });
    } catch (error) {
      // Revert to what storage actually has
      this.cache = null;
      const actual = await this.get();
      this.notifyListeners(actual);
      throw error;
    }
  }
}

// Usage in popup
const store = new SettingsStore();

store.subscribe((settings) => {
  document.getElementById("theme-label")!.textContent = settings.theme;
});
```

### Handling Cross-Context Updates {#handling-cross-context-updates}

The `storage.onChanged` event fires in every extension context (popup, options, content scripts, service worker). This means you get free cross-context reactivity:

```ts
// content.ts — automatically reacts to settings changed in the popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;

  if (changes.settings?.newValue?.theme) {
    applyTheme(changes.settings.newValue.theme);
  }
});
```

---

## Pattern 4: Quota Management {#pattern-4-quota-management}

Sync storage is small. You must plan for it.

### Checking Usage Before Write {#checking-usage-before-write}

```ts
// quota.ts
interface QuotaInfo {
  totalBytesUsed: number;
  totalBytesAvailable: number;
  itemCount: number;
  maxItems: number;
  bytesPerItem: number;
}

async function getQuotaInfo(): Promise<QuotaInfo> {
  const bytesInUse = await chrome.storage.sync.getBytesInUse(null);

  return {
    totalBytesUsed: bytesInUse,
    totalBytesAvailable: chrome.storage.sync.QUOTA_BYTES - bytesInUse,
    itemCount: Object.keys(await chrome.storage.sync.get(null)).length,
    maxItems: chrome.storage.sync.MAX_ITEMS, // 512
    bytesPerItem: chrome.storage.sync.QUOTA_BYTES_PER_ITEM, // 8,192
  };
}

async function safeSync(key: string, value: unknown): Promise<boolean> {
  const json = JSON.stringify({ [key]: value });
  const byteSize = new Blob([json]).size;

  // Check per-item limit
  if (byteSize > chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
    console.error(
      `Item "${key}" is ${byteSize} bytes, exceeds ${chrome.storage.sync.QUOTA_BYTES_PER_ITEM} limit`
    );
    return false;
  }

  // Check total quota
  const quota = await getQuotaInfo();
  if (byteSize > quota.totalBytesAvailable) {
    console.error(
      `Not enough quota: need ${byteSize}, have ${quota.totalBytesAvailable}`
    );
    return false;
  }

  await chrome.storage.sync.set({ [key]: value });
  return true;
}
```

### Splitting Large Data Across Keys {#splitting-large-data-across-keys}

When a single object exceeds 8 KB, split it across multiple keys:

```ts
// chunked-storage.ts
const CHUNK_SIZE = 7_500; // Leave headroom under 8,192

async function setChunked(prefix: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  const chunks: string[] = [];

  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.slice(i, i + CHUNK_SIZE));
  }

  const items: Record<string, unknown> = {
    [`${prefix}_meta`]: { chunkCount: chunks.length, updatedAt: Date.now() },
  };

  for (let i = 0; i < chunks.length; i++) {
    items[`${prefix}_${i}`] = chunks[i];
  }

  await chrome.storage.sync.set(items);
}

async function getChunked<T>(prefix: string): Promise<T | null> {
  const metaResult = await chrome.storage.sync.get(`${prefix}_meta`);
  const meta = metaResult[`${prefix}_meta`];
  if (!meta) return null;

  const keys = Array.from(
    { length: meta.chunkCount },
    (_, i) => `${prefix}_${i}`
  );
  const chunks = await chrome.storage.sync.get(keys);

  const json = keys.map((k) => chunks[k] ?? "").join("");
  return JSON.parse(json) as T;
}

async function removeChunked(prefix: string): Promise<void> {
  const metaResult = await chrome.storage.sync.get(`${prefix}_meta`);
  const meta = metaResult[`${prefix}_meta`];
  if (!meta) return;

  const keys = [
    `${prefix}_meta`,
    ...Array.from({ length: meta.chunkCount }, (_, i) => `${prefix}_${i}`),
  ];
  await chrome.storage.sync.remove(keys);
}
```

---

## Pattern 5: Background Sync with External APIs {#pattern-5-background-sync-with-external-apis}

Sync extension data with your own server using the service worker:

```ts
// background.ts
interface SyncState {
  lastSyncTimestamp: number;
  pendingChanges: Record<string, unknown>[];
  syncInProgress: boolean;
}

const syncState: SyncState = {
  lastSyncTimestamp: 0,
  pendingChanges: [],
  syncInProgress: false,
};

// Queue changes during offline or error states
function queueChange(change: Record<string, unknown>): void {
  syncState.pendingChanges.push(change);
  scheduleSyncWithAlarm();
}

function scheduleSyncWithAlarm(): void {
  chrome.alarms.create("background-sync", {
    delayInMinutes: 1,
    periodInMinutes: 15,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "background-sync") return;
  await performSync();
});

async function performSync(): Promise<void> {
  if (syncState.syncInProgress) return;
  syncState.syncInProgress = true;

  try {
    const changes = [...syncState.pendingChanges];
    if (changes.length === 0) return;

    const response = await fetch("https://api.example.com/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        changes,
        lastSync: syncState.lastSyncTimestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const serverChanges = await response.json();

    // Apply server changes to local storage
    if (serverChanges.updates) {
      await chrome.storage.local.set(serverChanges.updates);
    }

    // Clear synced changes from the queue
    syncState.pendingChanges = syncState.pendingChanges.slice(changes.length);
    syncState.lastSyncTimestamp = Date.now();
    await chrome.storage.local.set({
      lastSyncTimestamp: syncState.lastSyncTimestamp,
    });
  } catch (error) {
    console.error("Background sync failed:", error);
    // Changes remain in the queue for next attempt
  } finally {
    syncState.syncInProgress = false;
  }
}

async function getAuthToken(): Promise<string> {
  // Use chrome.identity for OAuth flows
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}
```

### Exponential Backoff on Failure {#exponential-backoff-on-failure}

```ts
// backoff.ts
async function syncWithBackoff(maxRetries = 5): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await performSync();
      return;
    } catch {
      const delay = Math.min(1000 * 2 ** attempt, 60_000);
      const jitter = Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }
  console.error("Sync failed after maximum retries");
}
```

---

## Pattern 6: Delta Sync {#pattern-6-delta-sync}

Only sync what changed, not the entire dataset:

```ts
// delta-sync.ts
interface DeltaEntry {
  key: string;
  value: unknown;
  timestamp: number;
  deleted?: boolean;
}

class DeltaTracker {
  private storageKey = "delta_log";

  async recordChange(key: string, value: unknown): Promise<void> {
    const log = await this.getLog();
    log.push({ key, value, timestamp: Date.now() });
    await chrome.storage.local.set({ [this.storageKey]: log });
  }

  async recordDeletion(key: string): Promise<void> {
    const log = await this.getLog();
    log.push({ key, value: null, timestamp: Date.now(), deleted: true });
    await chrome.storage.local.set({ [this.storageKey]: log });
  }

  async getChangesSince(timestamp: number): Promise<DeltaEntry[]> {
    const log = await this.getLog();
    return log.filter((entry) => entry.timestamp > timestamp);
  }

  async clearProcessedEntries(upToTimestamp: number): Promise<void> {
    const log = await this.getLog();
    const remaining = log.filter((entry) => entry.timestamp > upToTimestamp);
    await chrome.storage.local.set({ [this.storageKey]: remaining });
  }

  private async getLog(): Promise<DeltaEntry[]> {
    const result = await chrome.storage.local.get(this.storageKey);
    return result[this.storageKey] ?? [];
  }
}

// Usage: wrap your storage writes with delta tracking
const deltaTracker = new DeltaTracker();

async function updateSetting(key: string, value: unknown): Promise<void> {
  await chrome.storage.sync.set({ [key]: value });
  await deltaTracker.recordChange(key, value);
}

// During server sync, only send deltas
async function syncDeltasToServer(lastSyncTime: number): Promise<void> {
  const deltas = await deltaTracker.getChangesSince(lastSyncTime);
  if (deltas.length === 0) return;

  const response = await fetch("https://api.example.com/sync/delta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deltas }),
  });

  if (response.ok) {
    const latestTimestamp = Math.max(...deltas.map((d) => d.timestamp));
    await deltaTracker.clearProcessedEntries(latestTimestamp);
  }
}
```

---

## Pattern 7: Import/Export User Data as JSON Backup {#pattern-7-importexport-user-data-as-json-backup}

Let users take their data with them:

```ts
// export.ts
async function exportAllData(): Promise<string> {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(null),
    chrome.storage.local.get(null),
  ]);

  const exportPayload = {
    version: chrome.runtime.getManifest().version,
    exportedAt: new Date().toISOString(),
    sync: syncData,
    local: localData,
  };

  return JSON.stringify(exportPayload, null, 2);
}

function downloadJson(data: string, filename: string): void {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Use chrome.downloads for a clean save dialog
  chrome.downloads.download({
    url,
    filename,
    saveAs: true,
  });

  // Revoke after a delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Trigger from options page
document.getElementById("export-btn")!.addEventListener("click", async () => {
  const json = await exportAllData();
  downloadJson(json, `extension-backup-${Date.now()}.json`);
});
```

```ts
// import.ts
interface ImportPayload {
  version: string;
  exportedAt: string;
  sync: Record<string, unknown>;
  local: Record<string, unknown>;
}

async function importData(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const payload: ImportPayload = JSON.parse(text);

    // Validate structure
    if (!payload.version || !payload.exportedAt) {
      return { success: false, message: "Invalid backup file format." };
    }

    // Validate version compatibility
    const currentVersion = chrome.runtime.getManifest().version;
    if (!isCompatibleVersion(payload.version, currentVersion)) {
      return {
        success: false,
        message: `Backup from v${payload.version} is not compatible with v${currentVersion}.`,
      };
    }

    // Validate sync data fits within quota
    const syncJson = JSON.stringify(payload.sync);
    if (new Blob([syncJson]).size > chrome.storage.sync.QUOTA_BYTES) {
      return { success: false, message: "Sync data exceeds storage quota." };
    }

    // Write data
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(payload.sync);
    await chrome.storage.local.set(payload.local);

    return { success: true, message: "Data imported successfully." };
  } catch {
    return { success: false, message: "Failed to parse backup file." };
  }
}

function isCompatibleVersion(backup: string, current: string): boolean {
  const [backupMajor] = backup.split(".").map(Number);
  const [currentMajor] = current.split(".").map(Number);
  return backupMajor === currentMajor; // Same major version = compatible
}

// File input handler
document.getElementById("import-input")!.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const result = await importData(file);
  const status = document.getElementById("import-status")!;
  status.textContent = result.message;
  status.className = result.success ? "success" : "error";
});
```

---

## Pattern 8: Migration Between Storage Areas {#pattern-8-migration-between-storage-areas}

Move data from `storage.local` to `storage.sync` (or vice versa) during upgrades:

```ts
// migration.ts
interface MigrationConfig {
  from: "local" | "sync";
  to: "local" | "sync";
  keys: string[];
  transform?: (key: string, value: unknown) => unknown;
  deleteAfterMigration: boolean;
}

async function migrateStorageArea(config: MigrationConfig): Promise<void> {
  const source =
    config.from === "local" ? chrome.storage.local : chrome.storage.sync;
  const target =
    config.to === "local" ? chrome.storage.local : chrome.storage.sync;

  const data = await source.get(config.keys);

  // Apply optional transformations
  const transformed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    transformed[key] = config.transform ? config.transform(key, value) : value;
  }

  // Validate size if migrating to sync
  if (config.to === "sync") {
    for (const [key, value] of Object.entries(transformed)) {
      const size = new Blob([JSON.stringify({ [key]: value })]).size;
      if (size > chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
        throw new Error(
          `Key "${key}" (${size} bytes) exceeds sync per-item limit`
        );
      }
    }
  }

  await target.set(transformed);

  if (config.deleteAfterMigration) {
    await source.remove(config.keys);
  }
}
```

### Version-Based Migration Runner {#version-based-migration-runner}

```ts
// migration-runner.ts
interface Migration {
  version: number;
  name: string;
  run: () => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "Move settings from local to sync",
    run: async () => {
      await migrateStorageArea({
        from: "local",
        to: "sync",
        keys: ["settings"],
        deleteAfterMigration: true,
      });
    },
  },
  {
    version: 2,
    name: "Compress blocklist for sync quota",
    run: async () => {
      const { blocklist } = await chrome.storage.sync.get("blocklist");
      if (Array.isArray(blocklist) && blocklist.length > 200) {
        // Keep only the 200 most recent entries in sync, archive rest locally
        const sorted = [...blocklist].sort();
        await chrome.storage.sync.set({ blocklist: sorted.slice(-200) });
        await chrome.storage.local.set({ blocklist_archive: sorted });
      }
    },
  },
];

async function runMigrations(): Promise<void> {
  const { migrationVersion = 0 } = await chrome.storage.local.get(
    "migrationVersion"
  );

  const pending = migrations.filter((m) => m.version > migrationVersion);

  for (const migration of pending) {
    console.log(`Running migration ${migration.version}: ${migration.name}`);
    try {
      await migration.run();
      await chrome.storage.local.set({ migrationVersion: migration.version });
    } catch (error) {
      console.error(`Migration ${migration.version} failed:`, error);
      break; // Stop on first failure
    }
  }
}

// Run on install and update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    await runMigrations();
  }
});
```

---

## Summary {#summary}

| Pattern | When To Use |
|---------|-------------|
| `storage.sync` settings | Simple preferences that follow the user across devices |
| Conflict resolution (LWW / merge) | Multiple devices may edit the same data concurrently |
| Optimistic UI + `onChanged` | UI must feel instant and stay reactive across contexts |
| Quota management + chunking | Data approaches sync storage limits (100 KB total, 8 KB/item) |
| Background sync with alarms | Extension data must sync with an external server |
| Delta sync | Large datasets where full sync is wasteful |
| Import/export JSON | Users need data portability and backup capability |
| Storage area migration | Upgrading schema or moving data between local and sync |

Sync storage is convenient but constrained. Always validate against quota limits before writing, assume eventual consistency between devices, and give users an escape hatch with import/export. For anything beyond simple settings, consider `storage.local` as the primary store with selective sync of critical data via `storage.sync`.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
