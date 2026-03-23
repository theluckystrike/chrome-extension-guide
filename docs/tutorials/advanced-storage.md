---
layout: default
title: "Chrome Extension Advanced Storage. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/advanced-storage/"
---
# Advanced Storage Patterns with @theluckystrike/webext-storage

Prerequisites {#prerequisites}
- Read `docs/tutorials/storage-quickstart.md` first
- `npm install @theluckystrike/webext-storage`

1. Schema Design {#1-schema-design}
- `defineSchema()` creates a type-safe schema. the identity function provides TypeScript inference:
  ```typescript
  import { defineSchema, createStorage } from '@theluckystrike/webext-storage';

  const schema = defineSchema({
    theme: 'string',         // 'dark' | 'light' etc.
    fontSize: 'number',      // 12, 14, 16, etc.
    isEnabled: 'boolean',    // true/false
    blockedSites: 'string',  // JSON-serialized arrays stored as strings
    lastSync: 'number',      // Unix timestamp
  });
  ```
- Schema keys map to `chrome.storage` keys. keep them short and descriptive

2. Local vs Sync Storage {#2-local-vs-sync-storage}
- `createStorage(schema, 'local')`. stored on this device, 10MB limit
- `createStorage(schema, 'sync')`. synced across signed-in Chrome instances, 100KB total / 8KB per item
- When to use local: large data, device-specific settings, sensitive data
- When to use sync: user preferences, small configs that should follow the user
- You can use BOTH in the same extension:
  ```typescript
  const localStore = createStorage(defineSchema({ cache: 'string' }), 'local');
  const syncStore = createStorage(defineSchema({ theme: 'string' }), 'sync');
  ```

3. Batch Operations with getMany/setMany {#3-batch-operations-with-getmanysetmany}
- Read multiple keys in one call (single `chrome.storage` API call under the hood):
  ```typescript
  const { theme, fontSize } = await storage.getMany(['theme', 'fontSize']);
  ```
- Write multiple keys atomically:
  ```typescript
  await storage.setMany({ theme: 'dark', fontSize: 14 });
  ```
- More efficient than multiple individual `get`/`set` calls

4. Using getAll for Settings Pages {#4-using-getall-for-settings-pages}
- `getAll()` returns every key in the schema:
  ```typescript
  const allSettings = await storage.getAll();
  // allSettings: { theme: string; fontSize: number; isEnabled: boolean; ... }
  populateSettingsForm(allSettings);
  ```
- Perfect for options pages that display all settings at once

5. Reactive Updates with watch() {#5-reactive-updates-with-watch}
- `watch()` listens for changes to a specific key. works across ALL extension contexts:
  ```typescript
  storage.watch('theme', (newValue, oldValue) => {
    console.log(`Theme changed: ${oldValue} -> ${newValue}`);
    document.body.className = newValue;
  });
  ```
- Use case: popup changes a setting, content script reacts immediately
- Use case: background updates a counter, popup displays it in real-time
- The watcher fires for changes from ANY context (popup, background, content, options)

6. Bulk Cleanup with remove/removeMany/clear {#6-bulk-cleanup-with-removeremovemanyclear}
- Remove a single key: `await storage.remove('cache')`
- Remove multiple keys: `await storage.removeMany(['cache', 'lastSync'])`
- Remove ALL keys in schema: `await storage.clear()`
- Use `clear()` for "Reset to defaults" buttons in options pages

7. Schema Validation {#7-schema-validation}
- `TypedStorage` validates keys at runtime. accessing a key not in the schema throws an error
- TypeScript provides compile-time safety:
  ```typescript
  await storage.set('theme', 'dark');    // OK
  await storage.set('theme', 123);       // TS Error: number not assignable to string
  await storage.set('unknown', 'value'); // TS Error: 'unknown' not in schema
  ```
- Internal `validateKey()` and `validateType()` methods enforce this at runtime too

8. Real-World Example: User Preferences System {#8-real-world-example-user-preferences-system}
- Full working example: options page saves settings, popup reads them, content script applies them
- Schema with 5+ keys covering different types
- Shows `setMany` on options save, `getAll` on popup load, `watch` in content script
- Demonstrates local + sync storage used together

9. Migration Patterns {#9-migration-patterns}
- Adding new keys: just add to schema. `get` returns `undefined` for unset keys
- Renaming keys: read old key with raw `chrome.storage`, write to new key, remove old
- Changing types: version your schema, migrate on extension update via `chrome.runtime.onInstalled`

Common Mistakes {#common-mistakes}
- Storing large objects as JSON strings in sync storage (8KB per-item limit)
- Not handling `undefined` returns for keys that haven't been set yet
- Creating multiple `TypedStorage` instances for the same area with overlapping keys
- Using `clear()` when you meant `remove()`. `clear()` wipes everything in the schema
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
