---
layout: default
title: "Chrome Storage API Deep Dive"
description: "An in-depth guide to the Chrome Storage API covering all four storage areas, quota management, change listeners, migration patterns, and advanced usage for extension data persistence."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/storage-api-deep-dive/"
---

# Chrome Storage API Deep Dive

This is an in-depth reference for `chrome.storage`, covering all four storage areas, quota management, change listeners, migration patterns, performance, and advanced usage with `@theluckystrike/webext-storage`.

For the basic permission reference, see [storage permission](../permissions/storage.md).

## Permissions {#permissions}

```json
{
  "permissions": ["storage"]
}
```

No user-facing warning. Add `"unlimitedStorage"` to remove the 10MB `local` limit.

## The Four Storage Areas {#the-four-storage-areas}

### chrome.storage.local {#chromestoragelocal}

General-purpose persistent storage. Data is stored on the local machine only.

```ts
// Raw Chrome API
await chrome.storage.local.set({ key: "value", count: 42 });
const result = await chrome.storage.local.get("key");
console.log(result.key); // "value"

// Get multiple keys
const result = await chrome.storage.local.get(["key", "count"]);

// Get all data
const all = await chrome.storage.local.get(null);

// Get with defaults
const result = await chrome.storage.local.get({ key: "default", missing: true });
// result.missing is true (the default) if "missing" isn't stored

// Remove
await chrome.storage.local.remove("key");
await chrome.storage.local.remove(["key", "count"]);

// Clear everything
await chrome.storage.local.clear();

// Check bytes in use
const bytes = await chrome.storage.local.getBytesInUse(null);
console.log(`Using ${bytes} bytes of ${10 * 1024 * 1024}`);
```

**Limits:** 10MB (or unlimited with `"unlimitedStorage"` permission).

### chrome.storage.sync {#chromestoragesync}

Synced across the user's Chrome instances via their Google account.

```ts
await chrome.storage.sync.set({ theme: "dark", fontSize: 14 });
const result = await chrome.storage.sync.get("theme");
```

**Limits:**

| Limit | Value |
|-------|-------|
| Total storage | 102,400 bytes (100KB) |
| Per item | 8,192 bytes (8KB) |
| Max items | 512 |
| Write operations/hour | 1,800 |
| Write operations/minute | 120 |

```ts
// Check quota usage
const bytesInUse = await chrome.storage.sync.getBytesInUse(null);
const perKey = await chrome.storage.sync.getBytesInUse("theme");
console.log(`Total: ${bytesInUse}/102400, "theme": ${perKey}/8192`);
```

### chrome.storage.session {#chromestoragesession}

Temporary storage that's cleared when the browser is closed. Available to all extension contexts (service worker, popup, content scripts) but not persisted.

```ts
await chrome.storage.session.set({ token: "abc123", tempState: { step: 2 } });
const result = await chrome.storage.session.get("token");

// Share session state between service worker and popup
// without persisting to disk
```

**Limits:** 10MB. No sync. Cleared on browser restart.

**Use cases:**
- Auth tokens that shouldn't persist
- Temporary UI state
- Caching expensive computations for the current session
- Cross-context state sharing (service worker <-> popup)

### chrome.storage.managed {#chromestoragemanaged}

Read-only storage populated by enterprise policy. Your extension declares a JSON schema, and IT admins set values via Chrome Enterprise policies.

```ts
// Read only — set by enterprise admins
const result = await chrome.storage.managed.get("serverUrl");
console.log(result.serverUrl); // Set by admin policy
```

Requires a `managed_schema` declaration in the manifest:

```json
{
  "storage": {
    "managed_schema": "schema.json"
  }
}
```

## Change Listeners {#change-listeners}

### chrome.storage.onChanged {#chromestorageonchanged}

Global listener that fires for changes in any storage area.

```ts
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log(`Storage area "${areaName}" changed:`);
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`  ${key}: ${JSON.stringify(oldValue)} -> ${JSON.stringify(newValue)}`);
  }
});
```

### Area-specific listeners {#area-specific-listeners}

```ts
// Only local changes
chrome.storage.local.onChanged.addListener((changes) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`local.${key} changed`);
  }
});

// Only sync changes
chrome.storage.sync.onChanged.addListener((changes) => {
  // Fires when data syncs from another device too
});

// Only session changes
chrome.storage.session.onChanged.addListener((changes) => {
  // Useful for reactive UI updates
});
```

### Change object structure {#change-object-structure}

Each changed key provides:

```ts
interface StorageChange {
  oldValue?: any; // undefined if key was just created
  newValue?: any; // undefined if key was just removed
}
```

## @theluckystrike/webext-storage Deep Dive {#theluckystrikewebext-storage-deep-dive}

The `@theluckystrike/webext-storage` package wraps `chrome.storage` with type safety, schema validation, and a cleaner API.

### Schema Definition {#schema-definition}

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// defineSchema is an identity function that provides TypeScript inference
const schema = defineSchema({
  // Primitives
  theme: "dark" as "dark" | "light",
  fontSize: 14,
  enabled: true,
  username: "",

  // Arrays
  blockedSites: [] as string[],
  recentItems: [] as Array<{ id: string; timestamp: number }>,

  // Objects
  windowBounds: { x: 0, y: 0, width: 800, height: 600 },
  preferences: {
    notifications: true,
    sound: false,
    volume: 50,
  },

  // Records
  siteSettings: {} as Record<string, { blocked: boolean; customCss: string }>,
});

// Schema defaults serve as the initial values AND the type source
type Schema = typeof schema;
// {
//   theme: "dark" | "light";
//   fontSize: number;
//   enabled: boolean;
//   ...
// }
```

### Creating Storage Instances {#creating-storage-instances}

```ts
// Local storage (default)
const local = createStorage({ schema, area: "local" });

// Sync storage
const sync = createStorage({ schema, area: "sync" });

// Multiple schemas for different purposes
const settingsSchema = defineSchema({
  theme: "dark" as "dark" | "light",
  language: "en",
});

const dataSchema = defineSchema({
  cache: {} as Record<string, unknown>,
  lastFetch: 0,
});

const settings = createStorage({ schema: settingsSchema, area: "sync" });
const data = createStorage({ schema: dataSchema, area: "local" });
```

### TypedStorage Methods {#typedstorage-methods}

```ts
const storage = createStorage({ schema, area: "local" });

// get — returns the typed value, or the default from the schema
const theme = await storage.get("theme"); // "dark" | "light"
const size = await storage.get("fontSize"); // number

// getMany — returns a typed partial object
const { theme, fontSize } = await storage.getMany(["theme", "fontSize"]);

// getAll — returns all schema values
const all = await storage.getAll();
// { theme: "dark" | "light", fontSize: number, enabled: boolean, ... }

// set — type-checked value
await storage.set("theme", "light"); // OK
await storage.set("theme", "blue"); // TypeScript error!
await storage.set("fontSize", "big"); // TypeScript error!

// setMany — set multiple keys atomically
await storage.setMany({
  theme: "light",
  fontSize: 16,
  enabled: false,
});

// remove / removeMany — resets to schema default on next get
await storage.remove("theme");
await storage.removeMany(["theme", "fontSize"]);

// clear — removes all schema keys (not other keys in the storage area)
await storage.clear();
```

### Reactive Watching {#reactive-watching}

```ts
// Watch a single key
const unwatch = storage.watch("theme", (newValue, oldValue) => {
  console.log(`Theme changed: ${oldValue} -> ${newValue}`);
  document.body.dataset.theme = newValue;
});

// Stop watching
unwatch();

// Watch fires for changes from ANY context:
// - Background script sets a value -> popup's watcher fires
// - Content script sets a value -> background's watcher fires
// - Sync brings a change from another device -> local watcher fires
```

### Advanced Patterns with webext-storage {#advanced-patterns-with-webext-storage}

#### Migrating schema versions

```ts
const schemaV2 = defineSchema({
  theme: "dark" as "dark" | "light",
  fontSize: 14,
  accentColor: "#0066cc", // new in v2
  schemaVersion: 2,
});

const storage = createStorage({ schema: schemaV2, area: "local" });

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "update") {
    const version = await storage.get("schemaVersion");
    if (version < 2) {
      // Migrate: set new defaults
      await storage.set("accentColor", "#0066cc");
      await storage.set("schemaVersion", 2);
    }
  }
});
```

#### Derived/computed values

```ts
// Don't store derived values — compute them
const schema = defineSchema({
  items: [] as Array<{ price: number; quantity: number }>,
});
const storage = createStorage({ schema, area: "local" });

// Bad: storing totalPrice separately (can get out of sync)
// Good: compute when needed
async function getTotal(): Promise<number> {
  const items = await storage.get("items");
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

#### Cross-context state machine

```ts
const schema = defineSchema({
  syncState: "idle" as "idle" | "syncing" | "error" | "done",
  syncError: "",
  lastSyncResult: {} as { added: number; updated: number; deleted: number },
});

const storage = createStorage({ schema, area: "session" });

// Background: perform sync
async function performSync() {
  await storage.set("syncState", "syncing");
  try {
    const result = await fetchAndSync();
    await storage.setMany({
      syncState: "done",
      lastSyncResult: result,
      syncError: "",
    });
  } catch (e) {
    await storage.setMany({
      syncState: "error",
      syncError: (e as Error).message,
    });
  }
}

// Popup: react to state changes
storage.watch("syncState", (state) => {
  switch (state) {
    case "syncing":
      showSpinner();
      break;
    case "done":
      hideSpinner();
      showSuccess();
      break;
    case "error":
      hideSpinner();
      showError();
      break;
  }
});
```

## Performance Considerations {#performance-considerations}

### Batch operations {#batch-operations}

```ts
// Bad: multiple round trips
await storage.set("a", 1);
await storage.set("b", 2);
await storage.set("c", 3);

// Good: single operation
await storage.setMany({ a: 1, b: 2, c: 3 });
```

### Avoid reading in hot paths {#avoid-reading-in-hot-paths}

```ts
// Bad: reading on every event
chrome.tabs.onUpdated.addListener(async () => {
  const settings = await storage.get("settings"); // slow if called 100x/sec
  // ...
});

// Good: cache and update via watch
let settings = await storage.get("settings");
storage.watch("settings", (newSettings) => {
  settings = newSettings;
});

chrome.tabs.onUpdated.addListener(() => {
  // Use cached settings — synchronous, fast
  if (settings.enabled) {
    // ...
  }
});
```

### Monitor quota {#monitor-quota}

```ts
async function checkQuota(area: "local" | "sync") {
  const storageArea = chrome.storage[area];
  const bytes = await storageArea.getBytesInUse(null);
  const max = area === "sync" ? 102400 : 10485760;
  const pct = Math.round((bytes / max) * 100);
  console.log(`${area}: ${bytes}/${max} bytes (${pct}%)`);
  return { bytes, max, percent: pct };
}
```

## Raw Chrome API vs webext-storage Comparison {#raw-chrome-api-vs-webext-storage-comparison}

| Feature | `chrome.storage.*` | `@theluckystrike/webext-storage` |
|---------|-------------------|----------------------------------|
| Type safety | No | Full TypeScript inference |
| Default values | Manual (pass defaults to `get`) | Automatic from schema |
| Validation | None | Schema-based runtime checks |
| Watch API | Verbose (`onChanged` + parse) | `storage.watch(key, callback)` |
| Clear behavior | Removes ALL keys in the area | Only removes schema keys |
| Multi-key get | Returns `Record<string, any>` | Returns typed partial object |

## Storage Area Decision Guide {#storage-area-decision-guide}

```
Need persistence across browser restarts?
├── Yes
│   ├── Need cross-device sync? → sync (watch quotas!)
│   └── Local only?
│       ├── Large data (>100KB)? → local
│       └── Small settings? → sync (for user convenience)
└── No → session
```

## Gotchas {#gotchas}

1. **Values must be JSON-serializable.** No `Date`, `Map`, `Set`, `RegExp`, functions, or circular references. Convert to primitives first.

2. **`sync` quotas are strict.** `QUOTA_BYTES_PER_ITEM` (8KB) includes the key name. Large objects will silently fail or throw. Always check `getBytesInUse`.

3. **`onChanged` fires for ALL changes**, including your own writes. Guard against infinite loops when a watcher triggers a write.

4. **`local.clear()` removes EVERYTHING** in your extension's storage area, including keys not managed by your schema. Each extension has its own isolated storage -- `clear()` does not affect other extensions. `TypedStorage.clear()` only removes schema keys.

5. **`session` storage is not available in content scripts by default.** You must set `chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })` in your service worker to allow content script access.

6. **Sync can be slow.** Changes to `sync` storage may take seconds to minutes to propagate across devices. Do not use sync storage for real-time state.

7. **`get(null)` returns everything** in the storage area, including keys not in your schema. Be careful when iterating.

8. **Storage operations can fail.** Quota exceeded, storage corrupted, or Chrome internal errors. Always handle errors gracefully.

```ts
try {
  await storage.set("largeData", data);
} catch (e) {
  if ((e as Error).message.includes("QUOTA_BYTES")) {
    console.error("Storage quota exceeded");
  }
}
```

## Related {#related}

- [storage permission](../permissions/storage.md)
- [Runtime API](runtime-api.md) (for `onInstalled` migration patterns)
- [Chrome storage API docs](https://developer.chrome.com/docs/extensions/reference/api/storage)

## Frequently Asked Questions

### What is the storage API quota?
local: 10MB, sync: 100KB total/8KB per item. Use unlimitedStorage permission to exceed local limits.

### How do I sync across devices?
Use chrome.storage.sync for automatic cross-device synchronization. Data encrypts during transit.
