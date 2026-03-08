---
layout: default
title: "Chrome Extension Migration Wizard — Best Practices"
description: "Create migration wizards for major version updates."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/migration-wizard/"
---

# Migration Wizard Pattern

## Overview {#overview}

Migrate user data between extension versions when storage schema changes. Define ordered migrations that run sequentially from current version to latest.

> **See also:** [Update and Migration](update-migration.md) | [Storage Migration](storage-migration.md) | [State Management](state-management.md)

---

## When Needed {#when-needed}

- Renaming keys or restructuring storage
- MV2 to MV3 upgrade
- Splitting storage between local and sync
- Converting data formats

---

## Migration Runner {#migration-runner}

```typescript
// lib/migration-runner.ts
interface Migration { version: number; name: string; up: (s: any) => Promise<void>; }

const KEY = "__schema";
const LATEST = 3;

class Runner {
  migrations: Migration[] = [];
  register(m: Migration) { this.migrations.push(m); this.migrations.sort((a, b) => a.version - b.version); }

  async getVersion(): Promise<number> {
    const r = await chrome.storage.local.get(KEY);
    return r[KEY]?.v ?? 0;
  }

  async run() {
    const current = await this.getVersion();
    if (current >= LATEST) return { ok: true, errs: [] };
    const errs: string[] = [];
    for (const m of this.migrations) {
      if (m.version > current) {
        try { await this.backup(); await m.up(chrome.storage.local); await this.setVer(m.version); }
        catch (e) { errs.push(`${m.name}: ${e}`); await this.rollback(); break; }
      }
    }
    return { ok: errs.length === 0, errs };
  }

  private async backup() {
    const d = await chrome.storage.local.get(null);
    await chrome.storage.local.set({ __backup: { d, t: Date.now() } });
  }
  private async setVer(v: number) { await chrome.storage.local.set({ [KEY]: { v, migrated: Date.now() } }); }
  private async rollback() {
    const b = await chrome.storage.local.get("__backup");
    if (b.__backup?.d) await chrome.storage.local.set(b.__backup.d);
  }
}
export const runner = new Runner();
```

---

## Defining Migrations {#defining-migrations}

```typescript
// migrations.ts
import { runner } from "./lib/migration-runner";

runner.register({ version: 1, name: "rename-prefs",
  up: async (s) => {
    const r = await s.get("preferences");
    if (r.preferences) { await s.set({ settings: r.preferences }); await s.remove("preferences"); }
  },
});

runner.register({ version: 2, name: "restructure",
  up: async (s) => {
    const r = await s.get("userData");
    if (r.userData) await s.set({ userData: { profile: r.userData, created: Date.now() } });
  },
});
```

---

## Running on Update {#running-on-update}

```typescript
// background.ts
import { runner } from "./lib/migration-runner";
import "./migrations";

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "update") {
    const r = await runner.run();
    r.ok ? console.log("Migrated") : console.error(r.errs);
  }
  await registerEphemeralState(); // alarms, context menus
});
```

---

## Error Handling {#error-handling}

- **Backup** before each migration (in `__backup`)
- **Rollback** on failure from backup
- **Log** errors with name/version
- **Alert** user on critical failures
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
