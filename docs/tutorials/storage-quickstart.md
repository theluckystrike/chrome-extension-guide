---
layout: default
title: "Chrome Extension Storage Quickstart — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/storage-quickstart/"
---
# Storage Quickstart

## Overview {#overview}

Brief intro: `@theluckystrike/webext-storage` gives you a fully-typed wrapper around `chrome.storage` with schema validation, default values, and reactive watchers.

## Install {#install}

```bash
npm install @theluckystrike/webext-storage
```

## Step 1: Define a Schema {#step-1-define-a-schema}

Use `defineSchema()` to declare keys with their default values. TypeScript infers the types automatically.

```ts
import { defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  theme: "dark" as "dark" | "light",
  fontSize: 14,
  notifications: true,
  blockedSites: [] as string[],
});
```

Explain that `defineSchema()` is an identity function — it just returns what you pass in, but enables TypeScript inference.

## Step 2: Create a Storage Instance {#step-2-create-a-storage-instance}

Use `createStorage()` with your schema. Explain the `area` option ("local" vs "sync").

```ts
import { createStorage } from "@theluckystrike/webext-storage";

const storage = createStorage({ schema, area: "local" });
```

Mention that under the hood this creates a `TypedStorage<S>` instance.

## Step 3: Reading Values {#step-3-reading-values}

### Single key — `get(key)` {#single-key-getkey}

```ts
const theme = await storage.get("theme");
// Returns "dark" (the default) if nothing stored yet
```

### Multiple keys — `getMany(keys)` {#multiple-keys-getmanykeys}

```ts
const { theme, fontSize } = await storage.getMany(["theme", "fontSize"]);
```

### All keys — `getAll()` {#all-keys-getall}

```ts
const all = await storage.getAll();
// { theme: "dark", fontSize: 14, notifications: true, blockedSites: [] }
```

Explain that `get()` returns the schema default if the key hasn't been set.

## Step 4: Writing Values {#step-4-writing-values}

### Single key — `set(key, value)` {#single-key-setkey-value}

```ts
await storage.set("theme", "light");
// Type error: await storage.set("theme", 42);
```

### Multiple keys — `setMany(items)` {#multiple-keys-setmanyitems}

```ts
await storage.setMany({ theme: "light", fontSize: 16 });
```

Explain runtime validation: `validateType()` checks values match the schema's expected typeof.

## Step 5: Removing Values {#step-5-removing-values}

### Single — `remove(key)` {#single-removekey}

```ts
await storage.remove("theme");
// Next get("theme") returns "dark" (the schema default)
```

### Multiple — `removeMany(keys)` {#multiple-removemanykeys}

```ts
await storage.removeMany(["theme", "fontSize"]);
```

### All schema keys — `clear()` {#all-schema-keys-clear}

```ts
await storage.clear();
```

Note: `clear()` only removes keys in YOUR schema, not all of chrome.storage.

## Step 6: Watching for Changes {#step-6-watching-for-changes}

Use `watch(key, callback)` to react to storage changes. Returns an `Unwatch` function.

```ts
const unwatch = storage.watch("theme", (newValue, oldValue) => {
  console.log(`Theme changed: ${oldValue} -> ${newValue}`);
  document.body.className = newValue;
});

// Later:
unwatch();
```

Explain: uses `chrome.storage.onChanged.addListener` under the hood, filtered by area and key.

## Step 7: Complete Example — Options Page {#step-7-complete-example-options-page}

Full realistic example combining all methods in an options page scenario.

## API Reference Summary {#api-reference-summary}

| Method   | Signature                                              | Returns                    |
|----------|--------------------------------------------------------|----------------------------|
| `get`    | `get<K>(key: K)`                                       | `Promise<S[K]>`            |
| `getMany`| `getMany<K>(keys: K[])`                                | `Promise<Pick<S, K>>`      |
| `getAll` | `getAll()`                                             | `Promise<SchemaType<S>>`  |
| `set`    | `set<K>(key: K, value: S[K])`                         | `Promise<void>`            |
| `setMany`| `setMany(items: Partial<S>)`                           | `Promise<void>`            |
| `remove` | `remove<K>(key: K)`                                    | `Promise<void>`            |
| `removeMany` | `removeMany<K>(keys: K[])`                         | `Promise<void>`            |
| `clear`  | `clear()`                                              | `Promise<void>`            |
| `watch`  | `watch<K>(key: K, cb: WatchCallback<S[K]>)`           | `Unwatch`                  |

## Next Steps {#next-steps}

- [Messaging Quickstart](messaging-quickstart.md)
- [Permissions Quickstart](permissions-quickstart.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
