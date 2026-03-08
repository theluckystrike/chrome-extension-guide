# Chrome Storage API Guide

## Overview

The Chrome Storage API provides specialized storage solutions for extensions, offering advantages over `localStorage`: automatic synchronization, change notifications, larger quotas, and async operations. This guide covers all storage areas, operations, and best practices.

## Storage Areas

### chrome.storage.local

Local persistent storage that persists until the user clears it. Ideal for extension-specific data.

```javascript
chrome.storage.local.set({ key: 'value' }, () => {
  console.log('Data saved');
});
chrome.storage.local.get('key', (result) => {
  console.log(result.key);
});
```
**Quota**: 10MB default, unlimited with `"unlimitedStorage"` permission.

### chrome.storage.sync

Cross-device synchronized storage using the user's Google account. Data syncs automatically.

```javascript
chrome.storage.sync.set({ theme: 'dark', fontSize: 14 });
chrome.storage.sync.get(['theme', 'fontSize'], (result) => {
  console.log(result.theme, result.fontSize);
});
```
**Quota**: 100KB total, 8KB per item.

### chrome.storage.session

Session-only storage in Manifest V3. Data clears when browser closes or extension reloads.

```javascript
chrome.storage.session.set({ tempData: 'temporary' });
chrome.storage.session.get('tempData', (result) => {
  console.log(result.tempData);
});
```
**Quota**: 10MB.

### chrome.storage.managed

Enterprise-managed read-only storage set by administrators via enterprise policies.

```javascript
chrome.storage.managed.get(['companySettings'], (result) => {
  console.log(result.companySettings);
});
```
Requires `managed_schema` in manifest to define allowed keys and types.

## Core Operations

### StorageArea.get - Reading Values

```javascript
// Single key with default
chrome.storage.local.get('theme', (r) => r.theme ?? 'light');

// Multiple keys with defaults
chrome.storage.sync.get({
  theme: 'light',
  fontSize: 14
}, (result) => {});

// Get all data
chrome.storage.local.get(null, (result) => {});
```

### StorageArea.set - Writing Values

```javascript
chrome.storage.sync.set({ theme: 'dark', fontSize: 14 }, () => {});
```

### StorageArea.remove - Deleting Keys

```javascript
chrome.storage.local.remove('oldSetting');
chrome.storage.sync.remove(['key1', 'key2']);
```

### StorageArea.clear - Clearing All Data

```javascript
chrome.storage.local.clear();
```

### StorageArea.getBytesInUse - Checking Usage

```javascript
chrome.storage.sync.getBytesInUse(null, (bytes) => {
  console.log(`${bytes / 1024} KB used`);
});
```

### StorageArea.setAccessLevel - MV3 Access Control

```javascript
chrome.storage.session.setAccessLevel({
  accessLevel: 'TRUSTED_CONTEXT' // or 'TRUSTED_OR_UNTRUSTED_CONTEXTS'
});
```

## Change Events

### chrome.storage.onChanged

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.theme) {
    console.log('Old:', changes.theme.oldValue);
    console.log('New:', changes.theme.newValue);
  }
});
```

## Storage Quotas

| Area | Default | Per-Item | Permission |
|------|---------|----------|------------|
| local | 10MB | 8KB | None |
| sync | 100KB | 8KB | None |
| session | 10MB | 8KB | None |
| local (unlimited) | Unlimited | 8KB | unlimitedStorage |

## Performance: Batching Operations

```javascript
// Batch writes - prefer this over multiple calls
chrome.storage.sync.set({ setting1: a, setting2: b, setting3: c });

// Batch reads
chrome.storage.sync.get(null, (result) => {});
```

## Migration: localStorage to chrome.storage

```javascript
// Before: localStorage
localStorage.setItem('theme', 'dark');
const theme = localStorage.getItem('theme');

// After: chrome.storage.local
chrome.storage.local.set({ theme: 'dark' });
chrome.storage.local.get('theme', (r) => console.log(r.theme));

// Async wrapper pattern
const storage = {
  get(k) { return new Promise(r => chrome.storage.local.get(k, x => r(x[k]))); },
  set(k, v) { return new Promise(r => chrome.storage.local.set({[k]: v}, r)); }
};
await storage.set('theme', 'dark');
```

## JSON Serialization Edge Cases

```javascript
// Date objects - convert to ISO string
const user = { name: 'John', createdAt: new Date().toISOString() };
chrome.storage.local.set({ user });
// On read: new Date(result.user.createdAt)

// undefined is ignored - use null instead
const data = { value: null }; // OK
// const data = { value: undefined }; // Ignored!
```

## Managed Storage Schema

```json
// manifest.json
"managed_schema": "managed-schema.json"
```

```json
// managed-schema.json
{
  "type": "object",
  "properties": {
    "companyName": { "type": "string" },
    "allowedDomains": { "type": "array", "items": { "type": "string" } }
  }
}
```

## Encrypting Sensitive Data

```javascript
async function encrypt(data, key) {
  const enc = new TextEncoder();
  return crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
    key, enc.encode(JSON.stringify(data))
  );
}

async function secureStore(key, data) {
  const key = await getKey(); // Your key management
  const encrypted = await encrypt(data, key);
  chrome.storage.local.set({ [key]: Array.from(new Uint8Array(encrypted)) });
}
```

## Building a Settings Sync System

```javascript
class SettingsSync {
  constructor() {
    this.listeners = [];
  }

  async init() {
    const { lastSync } = await this.get('syncMeta');
    this.lastSync = lastSync;
    chrome.storage.onChanged.addListener((c, a) => {
      if (a === 'local' && c.settings) this.notify(c.settings.newValue);
    });
  }

  async sync(newSettings) {
    const current = await this.get('settings') || {};
    const merged = { ...current, ...newSettings };
    await this.set('settings', merged);
    await this.set('syncMeta', { lastSync: Date.now() });
    return merged;
  }

  get(k) { return new Promise(r => chrome.storage.local.get(k, x => r(x[k]))); }
  set(k, v) { return new Promise(r => chrome.storage.local.set({[k]: v}, r)); }
  notify(v) { this.listeners.forEach(cb => cb(v)); }
}
```

## Reference

- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Enterprise Policy Storage](https://developer.chrome.com/docs/extensions/mv3/managed-storage/)

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, [Stripe integration](https://theluckystrike.github.io/extension-monetization-playbook/monetization/stripe-integration), subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
