# browsingData Permission

## What It Grants
Access to the `chrome.browsingData` API for removing browsing data (cache, cookies, history, passwords, etc.) programmatically.

## Manifest
```json
{
  "permissions": ["browsingData"]
}
```

## User Warning
None — this permission does not trigger a warning at install time. (Note: the extension still needs separate permissions like `history` to read data, but `browsingData` only removes it.)

## API Access

### Remove All Data Types
```typescript
await chrome.browsingData.remove(
  { since: Date.now() - 3600000 }, // last hour
  {
    cache: true,
    cookies: true,
    history: true,
    localStorage: true,
    formData: true
  }
);
```

### Convenience Methods
```typescript
// Individual removal methods
await chrome.browsingData.removeCache({});
await chrome.browsingData.removeCookies({ since: Date.now() - 86400000 });
await chrome.browsingData.removeDownloads({});
await chrome.browsingData.removeFormData({});
await chrome.browsingData.removeHistory({});
await chrome.browsingData.removeLocalStorage({});
await chrome.browsingData.removePasswords({});
await chrome.browsingData.removePluginData({});
```

### Query Current Settings
```typescript
const settings = await chrome.browsingData.settings();
console.log(settings.options);    // { since: timestamp }
console.log(settings.dataToRemove); // which types are selected
console.log(settings.dataRemovalPermitted); // which types the extension can remove
```

## Removal Options
```typescript
interface RemovalOptions {
  since?: number;          // Only remove data created after this timestamp (ms since epoch)
  originTypes?: {
    unprotectedWeb?: boolean;  // Normal websites (default: true)
    protectedWeb?: boolean;    // Apps/extensions with protectedWeb
    extension?: boolean;       // Extension data
  };
}
```

## Data Types
| Type | What It Removes |
|---|---|
| `appcache` | Application caches |
| `cache` | Browser cache |
| `cacheStorage` | Cache Storage (Service Worker caches) |
| `cookies` | Cookies |
| `downloads` | Download history (not files) |
| `fileSystems` | File system data |
| `formData` | Autofill form data |
| `history` | Browsing history |
| `indexedDB` | IndexedDB data |
| `localStorage` | localStorage data |
| `passwords` | Saved passwords |
| `serviceWorkers` | Service worker registrations |
| `webSQL` | WebSQL data |

## Privacy Tool Pattern
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { createMessenger } from '@theluckystrike/webext-messaging';

const schema = defineSchema({
  cleanOnExit: 'boolean',
  cleanTypes: 'string' // JSON array
});
const storage = createStorage(schema, 'sync');

type Messages = {
  CLEAN_NOW: { request: { types?: string[] }; response: { success: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('CLEAN_NOW', async ({ types }) => {
  const cleanTypes = types || JSON.parse(await storage.get('cleanTypes') || '["cache","cookies"]');
  const dataToRemove: Record<string, boolean> = {};
  cleanTypes.forEach((t: string) => dataToRemove[t] = true);

  await chrome.browsingData.remove({ since: 0 }, dataToRemove);
  return { success: true };
});
```

## Scheduled Cleanup
```typescript
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup') {
    const cleanOnExit = await storage.get('cleanOnExit');
    if (cleanOnExit) {
      await chrome.browsingData.removeCache({});
      await chrome.browsingData.removeCookies({ since: Date.now() - 86400000 });
    }
  }
});
```

## When to Use
- Privacy/cleanup extensions
- Cache clearing tools
- "Panic button" extensions
- Parental control cleanup
- Development/testing utilities

## When NOT to Use
- If you need to read data — use specific APIs (`history`, `cookies`, `downloads`)
- Only removes, never reads

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('browsingData');
```

## Cross-References
- Related: `docs/permissions/cookies.md`, `docs/permissions/history.md`, `docs/permissions/downloads.md`
