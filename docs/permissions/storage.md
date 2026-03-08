---
title: "storage Permission Reference"
description: "- Grants access to `chrome.storage` API (local, sync, session, managed) - Allows persistent key-value storage that survives browser restarts - Enables cross-device sync via `chrome.storage.sync`"
permalink: /permissions/storage/
category: permissions
order: 39
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/storage/"
---

# storage Permission Reference

## What It Does {#what-it-does}
- Grants access to `chrome.storage` API (local, sync, session, managed)
- Allows persistent key-value storage that survives browser restarts
- Enables cross-device sync via `chrome.storage.sync`
- NOT the same as localStorage or IndexedDB — this is extension-specific storage

## Storage Areas {#storage-areas}
| Area | Size Limit | Sync | Persists | Use Case |
|------|-----------|------|----------|----------|
| `local` | 10MB | No | Yes | Large data, local-only settings |
| `sync` | 100KB total, 8KB per item | Yes | Yes | User prefs synced across devices |
| `session` | 10MB | No | No (cleared on restart) | Temporary runtime state |
| `managed` | Read-only | N/A | Yes | Enterprise policy values |

## Manifest Configuration {#manifest-configuration}
```json
{
  "permissions": ["storage"]
}
```

Always a required permission — no user prompt needed. The `storage` permission is one of the "low-warning" permissions.

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

### Full workflow {#full-workflow}
```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// 1. Define your schema with default values
const schema = defineSchema({
  theme: "dark" as "dark" | "light",
  fontSize: 14,
  notifications: true,
  blockedSites: [] as string[],
  lastSync: 0,
});

// 2. Create storage instance — uses "local" by default
const storage = createStorage({ schema, area: "local" });

// 3. Read with full type safety
const theme = await storage.get("theme"); // "dark" | "light"
const { fontSize, notifications } = await storage.getMany(["fontSize", "notifications"]);
const all = await storage.getAll(); // all keys with types

// 4. Write with runtime validation
await storage.set("theme", "light");
await storage.setMany({ fontSize: 16, notifications: false });

// 5. Watch for changes reactively
const unwatch = storage.watch("theme", (newVal, oldVal) => {
  document.body.dataset.theme = newVal;
});

// 6. Clean up
await storage.remove("lastSync");
await storage.removeMany(["blockedSites", "lastSync"]);
await storage.clear(); // removes only schema keys
```

### Using sync storage {#using-sync-storage}
```ts
const syncStorage = createStorage({ schema, area: "sync" });
// Same API — but data syncs across user's Chrome instances
// Remember: 8KB per item, 100KB total limit
```

### Schema validation {#schema-validation}
```ts
// This throws at runtime — schema says theme is a string
await storage.set("theme", 42); // TypeError!

// This throws — "unknown" is not in the schema
await storage.set("unknownKey" as any, "value"); // Error!
```

## Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

Check that storage is available:
```ts
import { checkPermission, describePermission } from "@theluckystrike/webext-permissions";

const result = await checkPermission("storage");
console.log(result.description); // "Store and retrieve data locally"
console.log(result.granted);     // true (if in manifest)
```

```ts
import { PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";
PERMISSION_DESCRIPTIONS.storage; // "Store and retrieve data locally"
```

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Common pattern: content script sends data to background for storage.

```ts
// shared/messages.ts
type Messages = {
  savePageVisit: {
    request: { url: string; title: string; timestamp: number };
    response: { saved: boolean };
  };
  getVisitHistory: {
    request: void;
    response: Array<{ url: string; title: string; timestamp: number }>;
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  visitHistory: [] as Array<{ url: string; title: string; timestamp: number }>,
});
const storage = createStorage({ schema });
const msg = createMessenger<Messages>();

msg.onMessage({
  savePageVisit: async (visit) => {
    const history = await storage.get("visitHistory");
    history.push(visit);
    await storage.set("visitHistory", history);
    return { saved: true };
  },
  getVisitHistory: async () => {
    return storage.get("visitHistory");
  },
});
```

## Storage Quota and Limits {#storage-quota-and-limits}
- `local`: 10MB (use `unlimitedStorage` permission for more)
- `sync`: 100KB total, 8KB per item, 512 items max, 1800 write ops/hour
- `session`: 10MB
- Values must be JSON-serializable (no functions, Dates, Maps, Sets)

## Common Patterns {#common-patterns}
1. Options/settings page (defineSchema + createStorage + watch)
2. Cross-context state (background stores, popup/content reads via messaging)
3. Migration from localStorage (`storage.set` in one-time install handler)
4. Feature flags (schema defaults act as flags, override with `set`)

## Gotchas {#gotchas}
- `chrome.storage.local.clear()` removes EVERYTHING; `TypedStorage.clear()` only removes schema keys
- `sync` has strict quotas — don't store large data
- Storage operations are async — always await
- `watch()` fires for changes from ANY context (popup, background, content script)

## Related Permissions {#related-permissions}
- [activeTab](activeTab.md) — often paired to extract + store page data

## API Reference {#api-reference}
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)
- [Chrome storage API docs](https://developer.chrome.com/docs/extensions/reference/api/storage)
