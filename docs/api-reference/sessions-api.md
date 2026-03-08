---
layout: default
title: "Chrome Sessions API Complete Reference"
description: "The Chrome Sessions API queries and restores recently closed tabs and windows, including access to synced tabs from other devices signed into the same Chrome profile."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/sessions-api/"
---

# chrome.sessions API Reference

The `chrome.sessions` API lets you query and restore recently closed tabs and windows, as well as access tabs from other devices signed into the same Chrome profile.

## Permissions

```json
{
  "permissions": ["sessions"]
}
```

The `sessions` permission by itself only provides access to session metadata (titles, URLs, timestamps). To access the actual URL and title of tabs, you also need the `tabs` permission:

```json
{
  "permissions": ["sessions", "tabs"]
}
```

Without `tabs`, tab objects will have `undefined` values for `url` and `title`.

See the [sessions permission reference](../permissions/sessions.md) for details.

## Types

### Session

Represents a recently closed tab or window:

| Property | Type | Description |
|----------|------|-------------|
| `lastModified` | `number` | Unix timestamp (seconds since epoch) when the session was closed |
| `tab` | `Tab \| undefined` | The closed tab (if it was a tab) |
| `window` | `Window \| undefined` | The closed window (if it was a window) |

A `Session` object contains either a `tab` or a `window`, but never both.

### Device

Represents a remote device with sessions:

| Property | Type | Description |
|----------|------|-------------|
| `deviceName` | `string` | Name of the device (e.g., "Mike's MacBook Pro") |
| `sessions` | `Session[]` | Array of recent sessions on this device |

### Filter

Filter options for querying sessions:

| Property | Type | Description |
|----------|------|-------------|
| `maxResults` | `number` | Maximum number of sessions to return (1-25) |

### MAX_SESSION_RESULTS

```ts
const chrome.sessions.MAX_SESSION_RESULTS; // 25
```

The maximum number of sessions that can be returned in a single query. This is a read-only constant.

## Methods

### chrome.sessions.getRecentlyClosed(filter?)

Retrieves a list of recently closed tabs/windows.

```ts
// Get the 10 most recently closed sessions
const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 10 });

for (const session of sessions) {
  if (session.tab) {
    console.log(`Closed tab: ${session.tab.title} - ${session.tab.url}`);
  } else if (session.window) {
    console.log(`Closed window with ${session.window.tabs?.length} tabs`);
  }
}
```

**Parameters:**
- `filter?` — Optional `{ maxResults?: number }`. Defaults to 25.

**Returns:** `Promise<Session[]>`

### chrome.sessions.restore(sessionId?)

Restores a closed tab or window.

```ts
// Restore the most recently closed session
await chrome.sessions.restore();

// Restore a specific session by ID
await chrome.sessions.restore("session-id-123");
```

**Parameters:**
- `sessionId?` — Optional string. If omitted, restores the most recently closed session.

**Returns:** `Promise<Session>` — The restored session containing either a tab or window.

### chrome.sessions.getDevices(filter?)

Retrieves sessions from all devices signed into the same Chrome profile.

```ts
// Get sessions from all devices
const devices = await chrome.sessions.getDevices();

for (const device of devices) {
  console.log(`Device: ${device.deviceName}`);
  for (const session of device.sessions) {
    if (session.tab) {
      console.log(`  - ${session.tab.title}`);
    }
  }
}
```

**Parameters:**
- `filter?` — Optional `{ maxResults?: number }`. Limits results per device.

**Returns:** `Promise<Device[]>`

## Events

### chrome.sessions.onChanged

Fires when the list of recently closed sessions changes (e.g., user closes a tab).

```ts
chrome.sessions.onChanged.addListener(() => {
  console.log("Recently closed sessions have changed");
});
```

This event has no payload. Query `getRecentlyClosed()` to get the updated list.

## Code Examples

### List Recently Closed Tabs

```ts
async function listRecentlyClosed() {
  const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 10 });
  
  console.log("Recently closed tabs:");
  sessions.forEach((session, index) => {
    if (session.tab) {
      console.log(`  ${index + 1}. ${session.tab.title || "(no title)"}`);
    }
  });
}
```

### Restore Most Recently Closed Tab

```ts
async function restoreLastTab() {
  const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
  
  if (sessions.length > 0 && sessions[0].tab) {
    const restored = await chrome.sessions.restore();
    console.log(`Restored: ${restored.title}`);
  } else {
    console.log("No sessions to restore");
  }
}
```

### Cross-Device Tab Viewer

```ts
async function getAllDeviceTabs(): Promise<Map<string, string[]>> {
  const devices = await chrome.sessions.getDevices();
  const tabMap = new Map<string, string[]>();
  
  for (const device of devices) {
    const urls: string[] = [];
    for (const session of device.sessions) {
      if (session.tab?.url) {
        urls.push(session.tab.url);
      }
    }
    tabMap.set(device.deviceName, urls);
  }
  
  return tabMap;
}
```

## Cross-References

- [Sessions permission](../permissions/sessions.md)
- [Sessions API patterns](../patterns/sessions-api.md)
