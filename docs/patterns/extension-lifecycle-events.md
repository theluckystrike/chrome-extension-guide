# Extension Lifecycle Events

## Overview

Chrome extensions fire events at install, update, startup, and shutdown. This guide covers patterns for handling each lifecycle event.

## chrome.runtime.onInstalled

Fires on first install, update, or Chrome update:

```ts
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ settings: { theme: "light" }, firstRun: Date.now() });
    chrome.tabs.create({ url: "onboarding.html" });
  }
  if (details.reason === "update") migrateFrom(details.previousVersion);
});
```

## chrome.runtime.onStartup

Fires when Chrome starts or extension is enabled:

```ts
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.session.set({ sessionStart: Date.now() });
});
```

**Note**: On first install, `onInstalled` fires before `onStartup`.

## chrome.runtime.onSuspend

Fires before service worker terminates:

```ts
chrome.runtime.onSuspend.addListener(() => {
  chrome.storage.local.set({ lastSuspend: Date.now() });
});
```

## Idempotent Initialization

Ensure setup runs safely multiple times:

```ts
async function ensureInit() {
  const { initialized } = await chrome.storage.local.get("initialized");
  if (!initialized) { await doSetup(); await chrome.storage.local.set({ initialized: true }); }
}
chrome.runtime.onStartup.addListener(ensureInit);
chrome.runtime.onInstalled.addListener(ensureInit);
```

## Storage Defaults

Set defaults only if not already set:

```ts
const { prefs } = await chrome.storage.local.get("prefs");
if (!prefs) await chrome.storage.local.set({ prefs: { theme: "system" } });
```

## Common Mistakes

❌ **Wrong** - Listeners inside onInstalled don't persist:
```ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.onMessage.addListener(handler);
});
```

✅ **Correct** - Register at top level:
```ts
chrome.runtime.onMessage.addListener(handler);
```

## Cross-References

- [Runtime API Reference](../api-reference/runtime-api.md)
- [Lifecycle Events Reference](../reference/lifecycle-events.md)
- [Update Migration Patterns](./update-migration.md)
