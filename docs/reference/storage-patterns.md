# Storage Patterns Reference

Complete reference for Chrome extension storage APIs and patterns.

## Chrome Storage API Comparison

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      CHROME EXTENSION STORAGE API COMPARISON                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│     STORAGE.LOCAL   │   │    STORAGE.SYNC     │   │   STORAGE.SESSION   │   │   STORAGE.MANAGED   │
│                     │   │                     │   │                     │   │                     │
│  ┌───────────────┐  │   │  ┌───────────────┐  │   │  ┌───────────────┐  │   │  ┌───────────────┐  │
│  │  10 MB quota* │  │   │  │ 100 KB total  │  │   │  │  10 MB quota  │  │   │  │  Read-only    │  │
│  │  (unlimited)  │  │   │  │  8 KB per item│  │   │  │               │  │   │  │               │  │
│  └───────────────┘  │   │  └───────────────┘  │   │  └───────────────┘  │   │  └───────────────┘  │
│                     │   │                     │   │                     │   │                     │
│  ✓ Persists        │   │  ✓ Syncs across    │   │  ✗ Cleared on      │   │  ✓ Enterprise     │
│    permanently     │   │    devices          │   │    restart         │   │    policies       │
│                     │   │                     │   │                     │   │                     │
│  ✓ No API rate      │   │  ✗ Rate limits:    │   │  ✓ No sync        │   │  ✗ No write       │
│    limits           │   │    1800 writes/hr  │   │    overhead        │   │    access         │
│                     │   │                     │   │                     │   │                     │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘   └─────────────────────┘
         │                         │                        │                         │
         ▼                         ▼                        ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │   Large     │          │  User       │          │  Temporary  │          │  Config    │
   │   data,     │          │  prefs,     │          │  session    │          │  from IT   │
   │   caches,   │          │  theme,     │          │  state,     │          │  admin     │
   │   complex   │          │  sync data  │          │  sensitive  │          │            │
   │   objects   │          │             │          │  flags      │          │            │
   └─────────────┘          └─────────────┘          └─────────────┘          └─────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE LIFECYCLE EXAMPLE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

  Extension Install              User Changes Setting            Browser Restart
        │                              │                              │
        ▼                              ▼                              ▼
  ┌─────────────┐                ┌─────────────┐                ┌─────────────┐
  │ local: {}   │                │ local:      │                │ local:      │
  │ sync: {}    │   ───────►     │   {theme:   │    ──────►     │   {theme:   │
  │ session: {} │                │    'dark'}  │                │    'dark'}  │
  └─────────────┘                │ session: {} │                │ session: {} │
                                  └─────────────┘                └─────────────┘
                                                                              ▲
                                                                              │
                                                      session cleared ───────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CHANGE LISTENERS                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

  chrome.storage.onChanged.addListener((changes, areaName) => {
    // Fires in ALL extension contexts when storage changes
    // Use areaName to filter: 'local' | 'sync' | 'session'
  });

  Background SW ◄─────────────────────► Popup ◄─────────────────────► Content Script
       │                                     │                                    │
       │   onChanged fires in ALL contexts  │                                    │
       │◄────────────────────────────────────│◄───────────────────────────────────┘
       │
       │
```

![Chrome Extension storage API comparison diagram showing local, sync, session, and managed storage areas with quota and synchronization details](docs/images/storage-api-comparison.svg)

## Storage Areas Comparison

## Storage Areas Comparison {#storage-areas-comparison}

| Area | Quota | Sync | Persist | Use Case |
|------|-------|------|---------|----------|
| `chrome.storage.local` | 10MB (unlimited with permission) | No | Yes | Large data, caches |
| `chrome.storage.sync` | 100KB total, 8KB/item | Yes (across devices) | Yes | User preferences |
| `chrome.storage.session` | 10MB | No | No (cleared on restart) | Temporary state |
| `chrome.storage.managed` | Read-only | Via enterprise policy | Yes | Enterprise config |

## Raw Chrome Storage API {#raw-chrome-storage-api}

### Basic CRUD {#basic-crud}
```javascript
// Set values
chrome.storage.local.set({ theme: 'dark', count: 42, config: { debug: true } });

// Get values
chrome.storage.local.get(['theme', 'count'], (result) => {
  console.log(result.theme, result.count);
});

// Get with defaults
chrome.storage.local.get({ theme: 'light', count: 0 }, (result) => {
  // result.theme = 'dark' (stored value) or 'light' (default)
});

// Get all
chrome.storage.local.get(null, (result) => {
  console.log('All data:', result);
});

// Remove
chrome.storage.local.remove(['theme']);
chrome.storage.local.remove('count');

// Clear everything
chrome.storage.local.clear();
```

### Promise-based (MV3) {#promise-based-mv3}
```javascript
const { theme } = await chrome.storage.local.get('theme');
await chrome.storage.local.set({ theme: 'dark' });
await chrome.storage.local.remove('theme');
```

### Storage Change Listener {#storage-change-listener}
```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`${areaName}.${key}: ${oldValue} -> ${newValue}`);
  }
});
```

## Type-Safe Storage with @theluckystrike/webext-storage {#type-safe-storage-with-theluckystrikewebext-storage}

### Schema Definition {#schema-definition}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  theme: 'string',        // 'light' | 'dark'
  fontSize: 'number',     // 12-24
  isEnabled: 'boolean',   // feature toggle
  config: 'string'        // JSON for complex objects
});

const storage = createStorage(schema, 'local');
// or: createStorage(schema, 'sync') for cross-device sync
```

### CRUD Operations {#crud-operations}
```typescript
// Single value
const theme = await storage.get('theme');          // string | null
await storage.set('theme', 'dark');

// Multiple values
const prefs = await storage.getMany(['theme', 'fontSize']);
// { theme: string | null, fontSize: number | null }

await storage.setMany({ theme: 'dark', fontSize: 16 });

// All values
const all = await storage.getAll();
// { theme: string | null, fontSize: number | null, isEnabled: boolean | null, config: string | null }

// Remove
await storage.remove('theme');
await storage.removeMany(['theme', 'fontSize']);
await storage.clear();
```

### Watching Changes {#watching-changes}
```typescript
// Per-key watchers
storage.watch('theme', (newValue, oldValue) => {
  console.log(`Theme changed: ${oldValue} -> ${newValue}`);
  document.body.className = newValue || 'light';
});

storage.watch('isEnabled', (enabled) => {
  updateBadge(enabled);
});
```

## Common Patterns {#common-patterns}

### Feature Flags {#feature-flags}
```typescript
const storage = createStorage(defineSchema({
  darkMode: 'boolean',
  betaFeatures: 'boolean',
  sidebarCollapsed: 'boolean'
}), 'sync');

async function isFeatureEnabled(feature) {
  return (await storage.get(feature)) ?? false;
}
```

### User Preferences with Defaults {#user-preferences-with-defaults}
```typescript
const DEFAULTS = { theme: 'light', fontSize: 14, language: 'en' };

async function getPreference(key) {
  return (await storage.get(key)) ?? DEFAULTS[key];
}

async function getAllPreferences() {
  const stored = await storage.getAll();
  return { ...DEFAULTS, ...Object.fromEntries(
    Object.entries(stored).filter(([, v]) => v !== null)
  )};
}
```

### Complex Objects (JSON Pattern) {#complex-objects-json-pattern}
```typescript
const storage = createStorage(defineSchema({
  blockedSites: 'string'  // JSON: string[]
}), 'local');

async function getBlockedSites() {
  const raw = await storage.get('blockedSites');
  return raw ? JSON.parse(raw) : [];
}

async function addBlockedSite(site) {
  const sites = await getBlockedSites();
  sites.push(site);
  await storage.set('blockedSites', JSON.stringify([...new Set(sites)]));
}
```

### Cache with Expiry {#cache-with-expiry}
```typescript
const storage = createStorage(defineSchema({
  cache: 'string'  // JSON: { data: any, expires: number }
}), 'local');

async function getCached(key, fetchFn, ttlMs = 60000) {
  const raw = await storage.get('cache');
  if (raw) {
    const cached = JSON.parse(raw);
    if (cached[key] && cached[key].expires > Date.now()) {
      return cached[key].data;
    }
  }
  const data = await fetchFn();
  const cache = raw ? JSON.parse(raw) : {};
  cache[key] = { data, expires: Date.now() + ttlMs };
  await storage.set('cache', JSON.stringify(cache));
  return data;
}
```

### Migration Between Schema Versions {#migration-between-schema-versions}
```typescript
const CURRENT_VERSION = 2;

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    const { schemaVersion } = await chrome.storage.local.get('schemaVersion');
    if ((schemaVersion || 1) < 2) {
      // Migrate v1 -> v2: rename 'darkMode' to 'theme'
      const { darkMode } = await chrome.storage.local.get('darkMode');
      if (darkMode !== undefined) {
        await chrome.storage.local.set({ theme: darkMode ? 'dark' : 'light' });
        await chrome.storage.local.remove('darkMode');
      }
    }
    await chrome.storage.local.set({ schemaVersion: CURRENT_VERSION });
  }
});
```

## Quota Management {#quota-management}
```javascript
// Check current usage
chrome.storage.local.getBytesInUse(null, (bytes) => {
  console.log(`Using ${bytes} bytes of ${chrome.storage.local.QUOTA_BYTES}`);
});

// Sync quotas
chrome.storage.sync.getBytesInUse(null, (bytes) => {
  console.log(`Sync: ${bytes} / ${chrome.storage.sync.QUOTA_BYTES} bytes`);
  // QUOTA_BYTES = 102400 (100KB)
  // QUOTA_BYTES_PER_ITEM = 8192 (8KB)
  // MAX_ITEMS = 512
  // MAX_WRITE_OPERATIONS_PER_HOUR = 1800
  // MAX_WRITE_OPERATIONS_PER_MINUTE = 120
});
```

## Common Mistakes {#common-mistakes}
- Exceeding sync quota (100KB total, 8KB per item) — use local for large data
- Not handling `null` returns from `get()` — always provide defaults
- Storing sensitive data (passwords, tokens) in sync storage — use local
- Not debouncing frequent writes — hit rate limits on sync
- Forgetting `chrome.storage.onChanged` fires across ALL contexts
