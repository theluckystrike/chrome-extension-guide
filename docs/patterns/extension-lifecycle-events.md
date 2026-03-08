---
layout: default
title: "Chrome Extension Extension Lifecycle Events — Best Practices"
description: "Handle extension lifecycle events."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/extension-lifecycle-events/"
---

# Extension Lifecycle Events

This guide covers handling Chrome extension lifecycle events comprehensively: installation, updates, startup, and shutdown.

## Prerequisites {#prerequisites}

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "contextMenus", "declarativeContent"]
}
```

---

## chrome.runtime.onInstalled {#chromeruntimeoninstalled}

Fires once when the extension is installed or updated. Use for one-time initialization.

```typescript
// background/service-worker.ts

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time setup
    handleFirstInstall();
  } else if (details.reason === 'update') {
    // Handle extension update
    handleUpdate(details.previousVersion);
  }
});

async function handleFirstInstall(): Promise<void> {
  // Set default settings (idempotent)
  await initializeDefaultSettings();
  
  // Create context menus
  await setupContextMenus();
  
  // Set up declarativeContent rules
  await setupDeclarativeRules();
  
  // Open onboarding tab
  chrome.tabs.create({ url: 'onboarding.html' });
}

async function handleUpdate(previousVersion: string): Promise<void> {
  // Run migrations
  await runMigrations(previousVersion);
  
  // Show "what's new" notification
  await showWhatsNew(previousVersion);
}
```

---

## Initialization Best Practices {#initialization-best-practices}

### Idempotent Storage Initialization {#idempotent-storage-initialization}

Always check before setting defaults to support users who have customized settings:

```typescript
async function initializeDefaultSettings(): Promise<void> {
  const defaults = {
    theme: 'system',
    notifications: true,
    syncEnabled: false
  };
  
  const stored = await chrome.storage.local.get(Object.keys(defaults));
  
  // Only set defaults for keys that don't exist
  const toSet: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (stored[key] === undefined) {
      toSet[key] = value;
    }
  }
  
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
}
```

### Context Menu Recreation {#context-menu-recreation}

Always recreate context menus in onInstalled to handle extension updates:

```typescript
async function setupContextMenus(): Promise<void> {
  // Clear existing to avoid duplicates
  await chrome.contextMenus.removeAll();
  
  chrome.contextMenus.create({
    id: 'analyze-page',
    title: 'Analyze This Page',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'analyze-selection',
    title: 'Analyze Selection',
    contexts: ['selection']
  });
}
```

---

## chrome.runtime.onStartup {#chromeruntimeonstartup}

Runs when Chrome starts (profile starts). Use for restoring state:

```typescript
chrome.runtime.onStartup.addListener(() => {
  console.log('Chrome started, initializing extension...');
  
  // Restore any cached state
  initializeFromStorage();
  
  // Re-register listeners that may have been cleared
  setupEventListeners();
});
```

---

## chrome.runtime.onSuspend {#chromeruntimeonsuspend}

Fires just before the service worker is terminated. Save critical state:

```typescript
chrome.runtime.onSuspend.addListener(() => {
  // Save current state before SW stops
  saveCurrentState();
  
  // Persist any pending operations
  flushPendingChanges();
});
```

---

## Listener Registration: Common Mistake {#listener-registration-common-mistake}

**Always register listeners at top level**, not inside callbacks:

```typescript
// ❌ WRONG - listeners won't receive events
chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.onMessage.addListener(handleMessage);
});

// ✅ CORRECT - listeners registered at top level
chrome.runtime.onInstalled.addListener(handleInstall);
chrome.runtime.onMessage.addListener(handleMessage);
```

---

## Complete Lifecycle Handler {#complete-lifecycle-handler}

```typescript
// background/service-worker.ts

// Top-level listener registration
chrome.runtime.onInstalled.addListener(handleInstall);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.runtime.onSuspend.addListener(handleSuspend);

async function handleInstall(details: chrome.runtime.InstalledDetails): Promise<void> {
  if (details.reason === 'install') {
    await initializeDefaults();
    await setupContextMenus();
    await setupDeclarativeRules();
  } else if (details.reason === 'update') {
    await runMigrations(details.previousVersion);
    await showUpdateNotification(details.previousVersion);
  }
}

async function handleStartup(): Promise<void> {
  // Always re-register listeners on startup
  await restoreState();
  registerContentScripts();
}

function handleSuspend(): void {
  // Critical: save state synchronously if needed
  persistState();
}
```

---

## Event Ordering {#event-ordering}

On first install, only `chrome.runtime.onInstalled` fires -- `chrome.runtime.onStartup` does **not** fire during the initial installation. `onStartup` fires on subsequent browser/profile starts after the extension is already installed. Both events are independent and serve different purposes.

---

## Cross-References {#cross-references}

- [Lifecycle Events Reference](/docs/reference/lifecycle-events.md)
- [Runtime API Reference](/docs/api-reference/runtime-api.md)
- [Update Migration Patterns](/docs/patterns/update-migration.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
