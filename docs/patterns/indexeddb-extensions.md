---
layout: default
title: "Chrome Extension Indexeddb Extensions — Best Practices"
description: "Use IndexedDB for persistent client-side storage in Chrome extension content scripts."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/indexeddb-extensions/"
---

# IndexedDB in Extensions

## Overview {#overview}

`chrome.storage.local` works well for simple key-value data, but it falls apart when your extension needs to store thousands of structured records, run range queries, or manage data larger than 10 MB. IndexedDB gives you a full transactional database inside your extension — but it comes with its own quirks, especially in Manifest V3 service workers where the database connection can vanish when the worker terminates. This guide covers eight patterns for using IndexedDB effectively in Chrome extensions.

---

## When to Use IndexedDB vs. chrome.storage {#when-to-use-indexeddb-vs-chromestorage}

| Criteria | `chrome.storage.local` | IndexedDB |
|----------|----------------------|-----------|
| Data size limit | 10 MB (or `unlimitedStorage`) | Effectively unlimited (quota-managed) |
| Data model | Flat key-value pairs | Structured objects with indexes |
| Query capability | Get by key only | Range queries, compound indexes, cursors |
| API style | Promise-based, simple | Callback/event-based, verbose |
| Service worker safety | Always available | Connection may close on SW termination |
| Cross-context access | All contexts | All contexts (separate connections) |
| Sync support | `storage.sync` available | No built-in sync |
| Best for | Settings, small state | Large datasets, structured records, offline caches |

Use `chrome.storage` for settings and small state. Use IndexedDB when you need to store hundreds or thousands of records and query them by fields other than the primary key.

---

## Pattern 1: Why IndexedDB (When chrome.storage Is Not Enough) {#pattern-1-why-indexeddb-when-chromestorage-is-not-enough}

Consider a browser history analyzer extension that stores page visit metadata:

```ts
// With chrome.storage.local — everything in one key, loaded entirely into memory
const { visits = [] } = await chrome.storage.local.get("visits");
const filtered = visits.filter(
  (v: Visit) => v.timestamp > weekAgo && v.domain === "github.com"
);
// Problem: 50,000 visits loaded into memory just to filter 200
```

```ts
// With IndexedDB — query only what you need via an index
const tx = db.transaction("visits", "readonly");
const index = tx.objectStore("visits").index("by-domain-time");
const range = IDBKeyRange.bound(
  ["github.com", weekAgo],
  ["github.com", Date.now()]
);
const results: Visit[] = [];
for await (const cursor of iterateCursor(index.openCursor(range))) {
  results.push(cursor.value);
}
// Only the matching 200 records are loaded
```

IndexedDB wins when: (1) your dataset exceeds a few hundred records, (2) you need to query by non-primary-key fields, or (3) you need transactional writes across multiple object stores.

---

## Pattern 2: Database Setup with Versioned Schema {#pattern-2-database-setup-with-versioned-schema}

Structure your database with explicit version numbers and upgrade handlers:

```ts
// lib/database.ts

const DB_NAME = "my-extension-db";
const DB_VERSION = 3;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // Version 1: Initial schema
      if (oldVersion < 1) {
        const visits = db.createObjectStore("visits", {
          keyPath: "id",
          autoIncrement: true,
        });
        visits.createIndex("by-url", "url", { unique: false });
        visits.createIndex("by-timestamp", "timestamp", { unique: false });
      }

      // Version 2: Add bookmarks store, add domain index to visits
      if (oldVersion < 2) {
        db.createObjectStore("bookmarks", { keyPath: "id" });

        // Add new index to existing store
        const visitStore = request.transaction!.objectStore("visits");
        visitStore.createIndex("by-domain", "domain", { unique: false });
      }

      // Version 3: Add compound index for domain+time queries
      if (oldVersion < 3) {
        const visitStore = request.transaction!.objectStore("visits");
        visitStore.createIndex("by-domain-time", ["domain", "timestamp"], {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      reject(new Error("Database upgrade blocked — close other tabs"));
    };
  });
}
```

### Gotcha: Blocked Upgrades {#gotcha-blocked-upgrades}

If another tab has an open connection to the database at an older version, the upgrade will be blocked. Handle `onblocked` and listen for `onversionchange` on existing connections:

```ts
// In every context that opens the database
const db = await openDatabase();

db.onversionchange = () => {
  db.close();
  // Notify user or reload the page
  console.warn("Database upgrade needed — closing connection");
};
```

---

## Pattern 3: Typed CRUD Wrapper Class {#pattern-3-typed-crud-wrapper-class}

The raw IndexedDB API is verbose. Wrap it in a type-safe class:

```ts
// lib/idb-store.ts

export class TypedStore<T extends { id: string | number }> {
  constructor(
    private getDb: () => Promise<IDBDatabase>,
    private storeName: string
  ) {}

  async get(id: T["id"]): Promise<T | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const request = tx.objectStore(this.storeName).get(id);
      request.onsuccess = () => resolve(request.result ?? undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const request = tx.objectStore(this.storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(item: T): Promise<T["id"]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const request = tx.objectStore(this.storeName).put(item);
      request.onsuccess = () => resolve(request.result as T["id"]);
      request.onerror = () => reject(request.error);
    });
  }

  async putMany(items: T[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(id: T["id"]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const request = tx.objectStore(this.storeName).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const request = tx.objectStore(this.storeName).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(): Promise<number> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const request = tx.objectStore(this.storeName).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
```

```ts
// Usage
import { openDatabase } from "./database";
import { TypedStore } from "./idb-store";

interface Visit {
  id: number;
  url: string;
  domain: string;
  title: string;
  timestamp: number;
}

const visitStore = new TypedStore<Visit>(openDatabase, "visits");

// Fully typed — TypeScript enforces the Visit shape
await visitStore.put({
  id: 1,
  url: "https://github.com",
  domain: "github.com",
  title: "GitHub",
  timestamp: Date.now(),
});

const visit = await visitStore.get(1); // Visit | undefined
```

---

## Pattern 4: Indexes and Querying {#pattern-4-indexes-and-querying}

Indexes are what make IndexedDB useful beyond a key-value store. Use them for range queries, sorting, and compound lookups:

```ts
// lib/idb-query.ts

/** Iterate an IDB cursor as an async generator */
async function* iterateCursor<T>(
  request: IDBRequest<IDBCursorWithValue | null>
): AsyncGenerator<T> {
  while (true) {
    const cursor = await new Promise<IDBCursorWithValue | null>(
      (resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    );
    if (!cursor) return;
    yield cursor.value as T;
    cursor.continue();
  }
}

/** Query an index with optional bounds and limit */
export async function queryIndex<T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  options: {
    lower?: IDBValidKey;
    upper?: IDBValidKey;
    lowerOpen?: boolean;
    upperOpen?: boolean;
    direction?: IDBCursorDirection;
    limit?: number;
  } = {}
): Promise<T[]> {
  const tx = db.transaction(storeName, "readonly");
  const index = tx.objectStore(storeName).index(indexName);

  let range: IDBKeyRange | undefined;
  if (options.lower !== undefined && options.upper !== undefined) {
    range = IDBKeyRange.bound(
      options.lower,
      options.upper,
      options.lowerOpen,
      options.upperOpen
    );
  } else if (options.lower !== undefined) {
    range = IDBKeyRange.lowerBound(options.lower, options.lowerOpen);
  } else if (options.upper !== undefined) {
    range = IDBKeyRange.upperBound(options.upper, options.upperOpen);
  }

  const results: T[] = [];
  const cursor = index.openCursor(range, options.direction);

  for await (const value of iterateCursor<T>(cursor)) {
    results.push(value);
    if (options.limit && results.length >= options.limit) break;
  }

  return results;
}
```

```ts
// Example queries

// Get all visits from the last 24 hours, newest first
const recentVisits = await queryIndex<Visit>(db, "visits", "by-timestamp", {
  lower: Date.now() - 86_400_000,
  direction: "prev",
});

// Get the 10 most recent visits to github.com using the compound index
const githubVisits = await queryIndex<Visit>(
  db,
  "visits",
  "by-domain-time",
  {
    lower: ["github.com", 0],
    upper: ["github.com", Date.now()],
    direction: "prev",
    limit: 10,
  }
);
```

### Compound Index Key Ordering {#compound-index-key-ordering}

Compound index keys are compared left-to-right. The index `["domain", "timestamp"]` groups records by domain first, then sorts by timestamp within each domain. You cannot query by timestamp alone using this index — you need a separate `by-timestamp` index for that.

---

## Pattern 5: IndexedDB in Service Workers {#pattern-5-indexeddb-in-service-workers}

Service workers are the trickiest context for IndexedDB. The worker can terminate mid-transaction, and the database connection becomes stale on wake:

```ts
// lib/sw-database.ts

let dbInstance: IDBDatabase | null = null;

/**
 * Get a database connection, reopening if the previous one was closed.
 * Service workers may terminate and restart, invalidating old connections.
 */
export async function getDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    // Check if the connection is still alive
    try {
      // A simple transaction will throw if the connection is dead
      dbInstance.transaction("visits", "readonly");
      return dbInstance;
    } catch {
      dbInstance = null;
    }
  }

  dbInstance = await openDatabase();

  // Clean up on close (SW termination or version change)
  dbInstance.onclose = () => {
    dbInstance = null;
  };

  dbInstance.onversionchange = () => {
    dbInstance?.close();
    dbInstance = null;
  };

  return dbInstance;
}
```

```ts
// background.ts — Using getDatabase in message handlers

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_VISITS") {
    // Handle async response
    (async () => {
      const db = await getDatabase();
      const tx = db.transaction("visits", "readonly");
      const store = tx.objectStore("visits");
      const request = store.getAll();

      return new Promise<Visit[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    })()
      .then((visits) => sendResponse({ visits }))
      .catch((err) => sendResponse({ error: err.message }));

    return true; // Keep the message channel open for async response
  }
});
```

### Gotcha: Long-Running Transactions {#gotcha-long-running-transactions}

Do not start a transaction and then `await` something unrelated before completing it. IndexedDB transactions auto-commit when the event loop is idle. If the service worker sleeps between operations, the transaction will commit prematurely or fail:

```ts
// BAD — transaction may auto-commit during the fetch
const tx = db.transaction("cache", "readwrite");
const data = await fetch("https://api.example.com/data"); // Transaction dies here
tx.objectStore("cache").put(await data.json());

// GOOD — fetch first, then write in one synchronous burst
const data = await fetch("https://api.example.com/data");
const json = await data.json();
const tx = db.transaction("cache", "readwrite");
tx.objectStore("cache").put(json);
```

---

## Pattern 6: Background Data Import/Export with Progress {#pattern-6-background-data-importexport-with-progress}

For extensions that import or export large datasets (bookmarks, history, saved articles), use chunked processing with progress reporting:

```ts
// lib/import-export.ts

interface ImportProgress {
  phase: "reading" | "importing" | "done" | "error";
  processed: number;
  total: number;
  errors: string[];
}

type ProgressCallback = (progress: ImportProgress) => void;

export async function importRecords<T extends { id: string }>(
  db: IDBDatabase,
  storeName: string,
  records: T[],
  onProgress: ProgressCallback,
  chunkSize: number = 500
): Promise<void> {
  const total = records.length;
  const errors: string[] = [];
  let processed = 0;

  onProgress({ phase: "importing", processed: 0, total, errors });

  // Process in chunks to avoid blocking the event loop
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      for (const record of chunk) {
        try {
          store.put(record);
        } catch (err) {
          errors.push(`Record ${record.id}: ${(err as Error).message}`);
        }
      }

      tx.oncomplete = () => {
        processed += chunk.length;
        onProgress({ phase: "importing", processed, total, errors });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });

    // Yield to the event loop between chunks
    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress({ phase: "done", processed, total, errors });
}

export async function exportRecords<T>(
  db: IDBDatabase,
  storeName: string,
  onProgress: ProgressCallback
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const countReq = tx.objectStore(storeName).count();

    countReq.onsuccess = () => {
      const total = countReq.result;
      onProgress({ phase: "reading", processed: 0, total, errors: [] });

      const getAllReq = tx.objectStore(storeName).getAll();
      getAllReq.onsuccess = () => {
        const records = getAllReq.result as T[];
        onProgress({
          phase: "done",
          processed: records.length,
          total,
          errors: [],
        });
        resolve(records);
      };
      getAllReq.onerror = () => reject(getAllReq.error);
    };
    countReq.onerror = () => reject(countReq.error);
  });
}
```

```ts
// background.ts — Wire import/export to messaging

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IMPORT_DATA") {
    (async () => {
      const db = await getDatabase();
      await importRecords(db, "visits", message.records, (progress) => {
        // Forward progress to the requesting tab or popup
        if (sender.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            type: "IMPORT_PROGRESS",
            progress,
          });
        }
      });
      sendResponse({ success: true });
    })();
    return true;
  }
});
```

---

## Pattern 7: Storage Quota Management and Cleanup {#pattern-7-storage-quota-management-and-cleanup}

IndexedDB storage is quota-managed. Monitor usage and implement cleanup strategies to avoid hitting the limit:

```ts
// lib/quota-manager.ts

interface QuotaInfo {
  usageBytes: number;
  quotaBytes: number;
  percentUsed: number;
}

export async function getQuotaInfo(): Promise<QuotaInfo> {
  if (!navigator.storage?.estimate) {
    return { usageBytes: 0, quotaBytes: 0, percentUsed: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usageBytes = estimate.usage ?? 0;
  const quotaBytes = estimate.quota ?? 0;
  const percentUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

  return { usageBytes, quotaBytes, percentUsed };
}

export async function cleanupOldRecords(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  maxAgeMs: number
): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const index = tx.objectStore(storeName).index(indexName);
    const range = IDBKeyRange.upperBound(cutoff);
    const request = index.openCursor(range);
    let deletedCount = 0;

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(deletedCount);
    tx.onerror = () => reject(tx.error);
  });
}
```

```ts
// background.ts — Periodic cleanup via alarms

const CLEANUP_ALARM = "db-cleanup";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const QUOTA_WARN_PERCENT = 80;

chrome.alarms.create(CLEANUP_ALARM, { periodInMinutes: 60 * 24 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== CLEANUP_ALARM) return;

  const quota = await getQuotaInfo();

  if (quota.percentUsed > QUOTA_WARN_PERCENT) {
    console.warn(
      `[storage] ${quota.percentUsed.toFixed(1)}% quota used — running cleanup`
    );

    const db = await getDatabase();
    const deleted = await cleanupOldRecords(
      db,
      "visits",
      "by-timestamp",
      THIRTY_DAYS_MS
    );
    console.log(`[storage] Cleaned up ${deleted} old records`);
  }
});
```

### Requesting Persistent Storage {#requesting-persistent-storage}

By default, the browser can evict IndexedDB data under storage pressure. Request persistent storage to prevent this:

```ts
// Request at extension startup (best done in the service worker)
async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
```

Extensions with the `unlimitedStorage` permission automatically get persistent storage, but it is good practice to check anyway.

---

## Pattern 8: Migration from chrome.storage.local to IndexedDB {#pattern-8-migration-from-chromestoragelocal-to-indexeddb}

When an extension outgrows `chrome.storage.local`, migrate existing data without losing user state:

```ts
// lib/migration.ts

const MIGRATION_KEY = "idb_migration_version";

interface MigrationStep {
  version: number;
  migrate: (db: IDBDatabase) => Promise<void>;
}

const migrations: MigrationStep[] = [
  {
    version: 1,
    migrate: async (db: IDBDatabase) => {
      // Move visits from chrome.storage.local to IndexedDB
      const { visits = [] } = await chrome.storage.local.get("visits");

      if (visits.length === 0) return;

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("visits", "readwrite");
        const store = tx.objectStore("visits");

        for (const visit of visits) {
          store.put({
            ...visit,
            // Add the domain field that IndexedDB indexes need
            domain: new URL(visit.url).hostname,
          });
        }

        tx.oncomplete = async () => {
          // Remove from chrome.storage only after successful migration
          await chrome.storage.local.remove("visits");
          console.log(`[migration] Migrated ${visits.length} visits to IndexedDB`);
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },
  },
  {
    version: 2,
    migrate: async (db: IDBDatabase) => {
      // Move bookmarks
      const { bookmarks = [] } = await chrome.storage.local.get("bookmarks");
      if (bookmarks.length === 0) return;

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("bookmarks", "readwrite");
        const store = tx.objectStore("bookmarks");
        for (const bookmark of bookmarks) {
          store.put(bookmark);
        }
        tx.oncomplete = async () => {
          await chrome.storage.local.remove("bookmarks");
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });
    },
  },
];

export async function runMigrations(db: IDBDatabase): Promise<void> {
  const { [MIGRATION_KEY]: currentVersion = 0 } =
    await chrome.storage.local.get(MIGRATION_KEY);

  const pending = migrations.filter((m) => m.version > currentVersion);

  for (const step of pending) {
    try {
      await step.migrate(db);
      await chrome.storage.local.set({ [MIGRATION_KEY]: step.version });
      console.log(`[migration] Completed migration v${step.version}`);
    } catch (error) {
      console.error(`[migration] Failed at v${step.version}:`, error);
      // Stop on first failure — don't skip migrations
      throw error;
    }
  }
}
```

```ts
// background.ts — Run migrations on install/update

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    try {
      const db = await openDatabase();
      await runMigrations(db);
    } catch (error) {
      console.error("[startup] Migration failed:", error);
    }
  }
});
```

### Migration Safety Rules {#migration-safety-rules}

1. Always remove data from `chrome.storage` only after the IndexedDB write commits successfully.
2. Track migration version separately from the IndexedDB schema version — they serve different purposes.
3. Never skip a failed migration step. If step 2 fails, do not run step 3.
4. Test migrations with real user data sizes. A migration that works with 100 records may time out with 50,000.

---

## Summary {#summary}

| Pattern | Problem It Solves |
|---------|------------------|
| When to use IndexedDB | Choosing the right storage for structured, large, or queryable data |
| Versioned schema setup | Safe database evolution with incremental upgrade handlers |
| Typed CRUD wrapper | Taming the verbose IndexedDB API with type-safe operations |
| Indexes and querying | Efficient range queries and compound lookups without full scans |
| Service worker lifecycle | Keeping database connections alive across SW termination cycles |
| Import/export with progress | Chunked bulk operations that report status to the UI |
| Quota management and cleanup | Monitoring storage usage and evicting stale data |
| Migration from chrome.storage | Moving existing user data without loss or downtime |

IndexedDB is the right tool when your extension manages structured data at scale. Wrap the raw API in typed helpers, manage your schema with versioned upgrades, and always account for the service worker lifecycle. The patterns above give you a production-ready foundation — start with the CRUD wrapper and add indexes and migrations as your data model grows.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
