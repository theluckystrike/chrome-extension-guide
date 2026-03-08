---
layout: default
title: "Chrome Extension Backup & Restore — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/extension-backup-restore/"
---
# Extension Backup and Restore Patterns

## Overview {#overview}
Guide to implementing robust backup and restore functionality for Chrome extension user data. Covers export formats, import strategies, encryption, and migration patterns.

## Export Formats {#export-formats}

### JSON File Download {#json-file-download}
Use `chrome.downloads.download()` to save backup files to the user's filesystem:

```ts
async function exportToFile(data: ExtensionData): Promise<void> {
  const backup = {
    version: "1.0.0",
    timestamp: Date.now(),
    data
  };
  
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  await chrome.downloads.download({
    url,
    filename: `extension-backup-${new Date().toISOString().slice(0, 10)}.json`,
    saveAs: true
  });
  
  URL.revokeObjectURL(url);
}
```

### Clipboard Copy {#clipboard-copy}
For quick backups, copy JSON directly to clipboard:

```ts
async function exportToClipboard(data: ExtensionData): Promise<void> {
  const backup = JSON.stringify({ version: "1.0.0", timestamp: Date.now(), data });
  await navigator.clipboard.writeText(backup);
}
```

## Import Methods {#import-methods}

### File Upload via Input {#file-upload-via-input}
Handle file input in popup or options page:

```ts
document.getElementById("importFile")?.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const text = await file.text();
  const backup = JSON.parse(text) as BackupFormat;
  
  await validateAndRestore(backup);
});
```

### Drag and Drop {#drag-and-drop}
Support drag-and-drop for better UX:

```ts
const dropZone = document.getElementById("dropZone");
dropZone?.addEventListener("drop", async (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files[0];
  if (file && file.type === "application/json") {
    const backup = JSON.parse(await file.text());
    await validateAndRestore(backup);
  }
});
```

## Data Validation {#data-validation}

### Schema Checking {#schema-checking}
Validate backup structure before restore:

```ts
interface BackupFormat {
  version: string;
  timestamp: number;
  data: Record<string, unknown>;
}

function validateBackup(backup: unknown): backup is BackupFormat {
  if (!backup || typeof backup !== "object") return false;
  const b = backup as Record<string, unknown>;
  return (
    typeof b.version === "string" &&
    typeof b.timestamp === "number" &&
    typeof b.data === "object"
  );
}
```

### Version Compatibility {#version-compatibility}
Handle migrations between versions:

```ts
async function migrateIfNeeded(backup: BackupFormat): Promise<BackupFormat> {
  const currentVersion = "1.0.0";
  
  if (backup.version === currentVersion) return backup;
  
  // Example migration: v0.9.0 -> v1.0.0
  if (backup.version === "0.9.0") {
    backup.data.settings = { ...backup.data.settings, newField: true };
    backup.version = "1.0.0";
  }
  
  return backup;
}
```

## Selective Backup {#selective-backup}

Allow users to choose which data to export:

```ts
interface BackupOptions {
  includeSettings: boolean;
  includeBookmarks: boolean;
  includeHistory: boolean;
}

async function createSelectiveBackup(options: BackupOptions): Promise<BackupFormat> {
  const data: Record<string, unknown> = {};
  
  if (options.includeSettings) {
    data.settings = await chrome.storage.sync.get();
  }
  if (options.includeBookmarks) {
    data.bookmarks = await chrome.storage.local.get("bookmarks");
  }
  
  return {
    version: "1.0.0",
    timestamp: Date.now(),
    data
  };
}
```

## Encryption for Sensitive Data {#encryption-for-sensitive-data}

Use Web Crypto API for encrypting sensitive exports:

```ts
async function encryptBackup(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, encoder.encode(data)
  );
  
  return JSON.stringify({
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  });
}
```

## Restore Strategies {#restore-strategies}

### Merge vs Replace {#merge-vs-replace}
Choose between merging or replacing existing data:

```ts
async function restoreWithMerge(importedData: Record<string, unknown>): Promise<void> {
  const current = await chrome.storage.sync.get();
  const merged = { ...current, ...importedData };
  await chrome.storage.sync.set(merged);
}

async function restoreWithReplace(importedData: Record<string, unknown>): Promise<void> {
  await chrome.storage.sync.clear();
  await chrome.storage.sync.set(importedData);
}
```

## Automatic Cloud Backup {#automatic-cloud-backup}

Use `chrome.storage.sync` for automatic cloud backup. Note the limits:
- 8KB per item
- 100KB total storage
- Data syncs across user's Chrome instances

```ts
async function autoBackupToSync(key: string, data: unknown): Promise<void> {
  const serialized = JSON.stringify(data);
  if (serialized.length > 8 * 1024) {
    console.warn("Data exceeds 8KB item limit, consider splitting");
    return;
  }
  await chrome.storage.sync.set({ [key]: data });
}
```

## See Also {#see-also}
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)
- [Downloads API](../api-reference/downloads-api.md)
- [Storage Migration Patterns](./storage-migration.md)

## Related Articles {#related-articles}

## Related Articles

- [State Persistence](../patterns/extension-state-persistence.md)
- [Storage Migration](../guides/storage-migration.md)
