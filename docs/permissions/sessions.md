# sessions Permission

## What It Grants
Access to the `chrome.sessions` API for querying and restoring recently closed tabs/windows and accessing tabs from other devices.

## Manifest
```json
{
  "permissions": ["sessions"]
}
```

## User Warning
None — this permission does not trigger a warning at install time. (Note: accessing tabs from other devices also requires `tabs` permission.)

## API Access
- `chrome.sessions.getRecentlyClosed(filter?)` — get recently closed tabs/windows
- `chrome.sessions.restore(sessionId?)` — restore a closed tab or window
- `chrome.sessions.getDevices(filter?)` — get tabs from other synced devices
- `chrome.sessions.MAX_SESSION_RESULTS` — maximum number of results (25)

### Events
- `chrome.sessions.onChanged` — fired when recently closed list changes

## Get Recently Closed
```typescript
const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 10 });

for (const session of sessions) {
  if (session.tab) {
    console.log(`Closed tab: ${session.tab.title} — ${session.tab.url}`);
  } else if (session.window) {
    console.log(`Closed window with ${session.window.tabs?.length} tabs`);
  }
}
```

## Restore a Session
```typescript
// Restore most recently closed
const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
if (sessions.length > 0) {
  const session = sessions[0];
  const sessionId = session.tab?.sessionId || session.window?.sessionId;
  if (sessionId) {
    await chrome.sessions.restore(sessionId);
  }
}

// Restore without specifying ID restores the most recent
await chrome.sessions.restore();
```

## Cross-Device Tabs
```typescript
// Requires both "sessions" and "tabs" permissions
const devices = await chrome.sessions.getDevices({ maxResults: 5 });

for (const device of devices) {
  console.log(`Device: ${device.deviceName}`);
  for (const session of device.sessions) {
    if (session.window?.tabs) {
      for (const tab of session.window.tabs) {
        console.log(`  Tab: ${tab.title} — ${tab.url}`);
      }
    }
  }
}
```

## Session Restore UI Pattern
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  GET_CLOSED_TABS: { request: { max: number }; response: { tabs: Array<{ title: string; url: string; sessionId: string }> } };
  RESTORE_TAB: { request: { sessionId: string }; response: { ok: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('GET_CLOSED_TABS', async ({ max }) => {
  const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: max });
  const tabs = sessions
    .filter(s => s.tab)
    .map(s => ({
      title: s.tab!.title || '',
      url: s.tab!.url || '',
      sessionId: s.tab!.sessionId || ''
    }));
  return { tabs };
});

m.onMessage('RESTORE_TAB', async ({ sessionId }) => {
  await chrome.sessions.restore(sessionId);
  return { ok: true };
});
```

## Monitor Changes
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ closedCount: 'number' });
const storage = createStorage(schema, 'local');

chrome.sessions.onChanged.addListener(async () => {
  const sessions = await chrome.sessions.getRecentlyClosed();
  await storage.set('closedCount', sessions.length);
  chrome.action.setBadgeText({ text: String(sessions.length) });
});
```

## Session Object Structure
```typescript
interface Session {
  lastModified: number;  // timestamp
  tab?: tabs.Tab;        // if a tab was closed
  window?: windows.Window; // if a window was closed
}
```

## When to use
- "Recently closed tabs" UI
- Session restore/undo close
- Cross-device tab sync display
- Tab history/analytics

## When NOT to Use
- If you need full browsing history — use `history` permission
- If you only need current tabs — use `tabs` permission

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('sessions');
```

## Cross-References
- Related: `docs/permissions/tabs.md`, `docs/permissions/history.md`
- Patterns: `docs/patterns/sessions-api.md`
