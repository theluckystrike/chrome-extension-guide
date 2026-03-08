---
title: "sessions Permission"
description: "- Permission string: `"sessions"` - Grants access to `chrome.sessions` API - Query and restore recently closed tabs/windows, access cross-device tabs Gets a list of recently closed tabs/windows."
permalink: /permissions/sessions/
category: permissions
order: 37
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/sessions/"
---

# sessions Permission

## Overview {#overview}
- Permission string: `"sessions"`
- Grants access to `chrome.sessions` API
- Query and restore recently closed tabs/windows, access cross-device tabs

## API Methods {#api-methods}

### chrome.sessions.getRecentlyClosed(filter?) {#chromesessionsgetrecentlyclosedfilter}
Gets a list of recently closed tabs/windows.

```ts
interface Filter {
  maxResults?: number; // Default: 25, Maximum: 25
}

interface Session {
  lastModified: number; // Timestamp in milliseconds
  tab?: Tab;           // Present if closed item was a tab
  window?: Window;     // Present if closed item was a window
}

// Returns array of Session objects
const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 10 });
```

### chrome.sessions.restore(sessionId?) {#chromesessionsrestoresessionid}
Restores a closed tab or window.

```ts
// Omit sessionId to restore most recently closed item
const restored = await chrome.sessions.restore();

// Restore a specific session
const restored = await chrome.sessions.restore(sessionId);

// Returns the restored Session object
```

### chrome.sessions.getDevices(filter?) {#chromesessionsgetdevicesfilter}
Gets tabs from other signed-in devices.

```ts
interface Filter {
  maxResults?: number;
}

interface Device {
  deviceName: string;   // Name of the other device
  sessions: Session[]; // Sessions from that device
}

// Returns array of Device objects
const devices = await chrome.sessions.getDevices({ maxResults: 10 });
```

## Types {#types}

### Session {#session}
```ts
{
  lastModified: number;    // Unix timestamp
  tab?: chrome.tabs.Tab;   // Tab object (either tab OR window, not both)
  window?: chrome.windows.Window; // Window object
}
```

### Device {#device}
```ts
{
  deviceName: string;     // e.g., "Mike's MacBook Pro"
  sessions: Session[];    // Array of sessions from this device
}
```

## Constants {#constants}
- `chrome.sessions.MAX_SESSION_RESULTS` — Maximum number of sessions returned (25)

## Events {#events}
- `chrome.sessions.onChanged` — Fires when the recently closed list changes
```ts
chrome.sessions.onChanged.addListener(() => {
  console.log("Recently closed sessions changed");
});
```

## Manifest Declaration {#manifest-declaration}

```json
{
  "permissions": ["sessions"]
}
```

Note: Also needs `"tabs"` permission to see tab URLs/titles.

## Use Cases {#use-cases}

### Session Restore UI {#session-restore-ui}
Build a "recently closed" dropdown showing tabs the user can reopen:
```ts
async function getRecentlyClosedTabs() {
  const sessions = await chrome.sessions.getRecentlyClosed();
  return sessions
    .filter(s => s.tab)
    .map(s => ({
      title: s.tab?.title,
      url: s.tab?.url,
      lastModified: s.lastModified
    }));
}
```

### "Undo Close Tab" Feature {#undo-close-tab-feature}
Implement keyboard shortcut to restore the most recent tab:
```ts
// Restore most recently closed tab
async function undoCloseTab() {
  const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
  if (sessions.length > 0) {
    await chrome.sessions.restore(sessions[0].tab?.sessionId);
  }
}
```

### Cross-Device Tab Access {#cross-device-tab-access}
Show tabs from other signed-in devices:
```ts
async function getCrossDeviceTabs() {
  const devices = await chrome.sessions.getDevices();
  const allTabs: Array<{ device: string; title: string; url: string }> = [];
  
  for (const device of devices) {
    for (const session of device.sessions) {
      if (session.tab) {
        allTabs.push({
          device: device.deviceName,
          title: session.tab.title || "Untitled",
          url: session.tab.url || ""
        });
      }
    }
  }
  return allTabs;
}
```

### Store Session Snapshots with @theluckystrike/webext-storage {#store-session-snapshots-with-theluckystrikewebext-storage}
```ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  sessionSnapshots: [] as Array<{
    id: string;
    tabs: Array<{ title: string; url: string }>;
    savedAt: number;
  }>
});

const storage = createStorage({ schema });

async function saveSessionSnapshot() {
  const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 25 });
  const snapshot = {
    id: crypto.randomUUID(),
    tabs: sessions
      .filter(s => s.tab)
      .map(s => ({ title: s.tab!.title || "", url: s.tab!.url || "" })),
    savedAt: Date.now()
  };
  
  const snapshots = await storage.get("sessionSnapshots");
  await storage.set("sessionSnapshots", [snapshot, ...snapshots].slice(0, 10));
}
```

## Cross-references {#cross-references}
- [tabs](tabs.md) — Required to access tab URLs/titles
- [patterns/sessions-api](../patterns/sessions-api.md) — Session management patterns
- [guides/tab-management](../guides/tab-management.md) — Tab management guide

## Frequently Asked Questions

### What can I do with the sessions API?
chrome.sessions allows your extension to query and restore recently closed tabs and windows, useful for session management extensions.

### Can I sync sessions across devices?
Sessions API provides local session data only. For cross-device sync, you'd need to implement your own cloud storage.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
