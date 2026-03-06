# Build a Tab Manager Extension — Full Tutorial

## What We're Building
- Popup showing all open tabs with search/filter
- Close, pin, group, and deduplicate tabs
- Uses `chrome.tabs`, `chrome.tabGroups`, `@theluckystrike/webext-storage`, `@theluckystrike/webext-messaging`

## Prerequisites
- Basic Chrome extension knowledge (cross-ref: `docs/guides/extension-architecture.md`)
- Node.js + npm installed
- `npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging`

## Step 1: manifest.json
```json
{
  "manifest_version": 3,
  "name": "Tab Manager",
  "version": "1.0.0",
  "permissions": ["tabs", "tabGroups", "storage"],
  "action": { "default_popup": "popup.html", "default_icon": "icon.png" },
  "background": { "service_worker": "background.js" }
}
```

## Step 2: Popup HTML/CSS
- Clean list view with search bar at top
- Each tab row: favicon, title (truncated), close button, pin toggle
- Tab groups shown with colored labels
- Responsive to popup width (~350px)

## Step 3: Popup JavaScript
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

type Messages = {
  getTabs: { request: void; response: chrome.tabs.Tab[] };
  closeTab: { request: { tabId: number }; response: void };
  pinTab: { request: { tabId: number; pinned: boolean }; response: void };
  groupTabs: { request: { tabIds: number[]; title: string }; response: void };
};

const messenger = createMessenger<Messages>();
const storage = createStorage(defineSchema({ lastSearch: 'string' }), 'local');

// Load tabs
const tabs = await messenger.sendMessage('getTabs', undefined);
renderTabList(tabs);

// Search filter
const searchInput = document.getElementById('search');
searchInput.value = await storage.get('lastSearch') || '';
searchInput.addEventListener('input', async (e) => {
  const query = e.target.value.toLowerCase();
  await storage.set('lastSearch', query);
  filterTabs(query);
});
```

## Step 4: Background Service Worker
```typescript
const messenger = createMessenger<Messages>();

messenger.onMessage('getTabs', async () => {
  return await chrome.tabs.query({});
});

messenger.onMessage('closeTab', async ({ tabId }) => {
  await chrome.tabs.remove(tabId);
});

messenger.onMessage('pinTab', async ({ tabId, pinned }) => {
  await chrome.tabs.update(tabId, { pinned });
});

messenger.onMessage('groupTabs', async ({ tabIds, title }) => {
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, { title, color: 'blue' });
});
```

## Step 5: Features
- **Search**: filter tabs by title/URL as you type
- **Close**: remove individual tabs or "close duplicates"
- **Pin/Unpin**: toggle pin state
- **Group by domain**: auto-group tabs sharing the same domain
- **Duplicate finder**: highlight tabs with identical URLs

## Step 6: Duplicate Detection
```javascript
function findDuplicates(tabs) {
  const urlMap = new Map();
  tabs.forEach(tab => {
    const existing = urlMap.get(tab.url) || [];
    existing.push(tab);
    urlMap.set(tab.url, existing);
  });
  return [...urlMap.entries()].filter(([, tabs]) => tabs.length > 1);
}
```

## Step 7: Polish
- Keyboard navigation (arrow keys to select tabs, Enter to switch, Delete to close)
- Badge showing tab count: `chrome.action.setBadgeText({ text: String(tabs.length) })`
- Remember last search query with `@theluckystrike/webext-storage`
- Smooth transitions when closing/grouping

## Testing
- Load unpacked from `chrome://extensions`
- Open 10+ tabs, test search, close, group, dedup
- Test with 100+ tabs — ensure performance is acceptable

## What You Learned
- `chrome.tabs` query, create, remove, update, group APIs
- `chrome.tabGroups` for colored tab groups
- Type-safe messaging between popup and background
- Persisting UI state with storage
