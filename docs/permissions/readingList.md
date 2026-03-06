# readingList Permission

## What It Grants
Access to the `chrome.readingList` API for managing Chrome's built-in Reading List (add, remove, update, query entries). Chrome 120+.

## Manifest
```json
{
  "permissions": ["readingList"]
}
```

## User Warning
"Read and change your Reading List" — this permission triggers a warning.

## API Access
- `chrome.readingList.addEntry({ url, title, hasBeenRead })` — add a page
- `chrome.readingList.removeEntry({ url })` — remove a page
- `chrome.readingList.updateEntry({ url, title?, hasBeenRead? })` — update entry
- `chrome.readingList.query({ url?, title?, hasBeenRead? })` — find entries

### Events
- `chrome.readingList.onEntryAdded` — entry added
- `chrome.readingList.onEntryRemoved` — entry removed
- `chrome.readingList.onEntryUpdated` — entry updated

## Basic Usage
```typescript
// Add current page to reading list
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
await chrome.readingList.addEntry({
  url: tab.url!,
  title: tab.title || 'Untitled',
  hasBeenRead: false
});

// Get all unread entries
const unread = await chrome.readingList.query({ hasBeenRead: false });
console.log(`${unread.length} unread articles`);

// Mark as read
await chrome.readingList.updateEntry({
  url: 'https://example.com/article',
  hasBeenRead: true
});

// Remove entry
await chrome.readingList.removeEntry({ url: 'https://example.com/article' });
```

## ReadingListEntry Object
```typescript
interface ReadingListEntry {
  url: string;
  title: string;
  hasBeenRead: boolean;
  lastUpdateTime: number;  // timestamp
  creationTime: number;    // timestamp
}
```

## Context Menu Integration
```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-reading-list',
    title: 'Add to Reading List',
    contexts: ['page', 'link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-to-reading-list') {
    const url = info.linkUrl || info.pageUrl!;
    const title = tab?.title || url;
    try {
      await chrome.readingList.addEntry({ url, title, hasBeenRead: false });
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-48.png',
        title: 'Reading List',
        message: `Added: ${title}`
      });
    } catch (e) {
      // Entry may already exist
      console.error('Failed to add:', e);
    }
  }
});
```

## Reading List Dashboard
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  GET_READING_LIST: { request: { filter?: 'all' | 'read' | 'unread' }; response: { entries: Array<{ url: string; title: string; hasBeenRead: boolean; creationTime: number }> } };
  MARK_READ: { request: { url: string }; response: { ok: boolean } };
  REMOVE_ENTRY: { request: { url: string }; response: { ok: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('GET_READING_LIST', async ({ filter }) => {
  const query: any = {};
  if (filter === 'read') query.hasBeenRead = true;
  if (filter === 'unread') query.hasBeenRead = false;
  const entries = await chrome.readingList.query(query);
  return { entries };
});

m.onMessage('MARK_READ', async ({ url }) => {
  await chrome.readingList.updateEntry({ url, hasBeenRead: true });
  return { ok: true };
});

m.onMessage('REMOVE_ENTRY', async ({ url }) => {
  await chrome.readingList.removeEntry({ url });
  return { ok: true };
});
```

## Badge Counter
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ unreadCount: 'number' });
const storage = createStorage(schema, 'local');

async function updateBadge() {
  const unread = await chrome.readingList.query({ hasBeenRead: false });
  const count = unread.length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
  await storage.set('unreadCount', count);
}

chrome.readingList.onEntryAdded.addListener(updateBadge);
chrome.readingList.onEntryRemoved.addListener(updateBadge);
chrome.readingList.onEntryUpdated.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
```

## When to Use
- Read-later / article saver extensions
- Content curation tools
- Research/bookmark management
- Reading habit tracking

## When NOT to Use
- If you need custom storage for saved articles — use `@theluckystrike/webext-storage` directly
- If you need to save article content (not just URLs) — this only manages the list, not content

## Availability
- Chrome 120+ only
- Not available in other Chromium browsers (they may not have Reading List)

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('readingList');
```

## Cross-References
- Tutorial: `docs/tutorials/build-reading-list.md`
- Related: `docs/permissions/bookmarks.md`
