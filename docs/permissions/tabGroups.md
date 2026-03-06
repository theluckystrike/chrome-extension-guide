# tabGroups Permission

## What It Grants
Access to the `chrome.tabGroups` API for reading and modifying tab groups (title, color, collapsed state).

## Manifest
```json
{
  "permissions": ["tabGroups"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access
When granted, you can use:
- `chrome.tabGroups.get(groupId)` — get a specific group
- `chrome.tabGroups.query(queryInfo)` — find groups by properties
- `chrome.tabGroups.update(groupId, updateProperties)` — modify a group
- `chrome.tabGroups.move(groupId, moveProperties)` — move group to another window position

### Events
- `chrome.tabGroups.onCreated` — new group created
- `chrome.tabGroups.onUpdated` — group properties changed
- `chrome.tabGroups.onRemoved` — group removed (all tabs ungrouped/closed)
- `chrome.tabGroups.onMoved` — group moved

## Group Properties
| Property | Type | Description |
|---|---|---|
| `id` | number | Unique group ID |
| `title` | string | Group title (can be empty) |
| `color` | string | One of: `grey`, `blue`, `red`, `yellow`, `green`, `pink`, `purple`, `cyan`, `orange` |
| `collapsed` | boolean | Whether the group is collapsed |
| `windowId` | number | Window containing the group |

## Creating Tab Groups
Tab groups are created via `chrome.tabs` API (not `chrome.tabGroups`):
```typescript
// Group tabs together
const groupId = await chrome.tabs.group({ tabIds: [tab1.id, tab2.id] });

// Then customize the group
await chrome.tabGroups.update(groupId, {
  title: 'Research',
  color: 'blue',
  collapsed: false
});
```

## Query Groups
```typescript
// Find all blue groups
const blueGroups = await chrome.tabGroups.query({ color: 'blue' });

// Find collapsed groups
const collapsed = await chrome.tabGroups.query({ collapsed: true });

// Find by title
const research = await chrome.tabGroups.query({ title: 'Research' });
```

## Workspace Organizer Pattern
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ workspaces: 'string' }); // JSON
const storage = createStorage(schema, 'sync');

async function organizeByDomain() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const byDomain: Record<string, number[]> = {};

  for (const tab of tabs) {
    const domain = new URL(tab.url || '').hostname;
    (byDomain[domain] ??= []).push(tab.id!);
  }

  for (const [domain, tabIds] of Object.entries(byDomain)) {
    if (tabIds.length > 1) {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: domain,
        color: 'blue'
      });
    }
  }
}
```

## Event Monitoring
```typescript
chrome.tabGroups.onCreated.addListener((group) => {
  console.log(`Group created: ${group.title} (${group.color})`);
});

chrome.tabGroups.onUpdated.addListener((group) => {
  console.log(`Group updated: ${group.title} → collapsed: ${group.collapsed}`);
});

chrome.tabGroups.onRemoved.addListener((group) => {
  console.log(`Group removed: ${group.id}`);
});
```

## Save/Restore Groups
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  SAVE_GROUPS: { request: {}; response: { count: number } };
  RESTORE_GROUPS: { request: {}; response: { restored: number } };
};

const messenger = createMessenger<Messages>();

messenger.onMessage('SAVE_GROUPS', async () => {
  const groups = await chrome.tabGroups.query({});
  const saved = [];
  for (const group of groups) {
    const tabs = await chrome.tabs.query({ groupId: group.id });
    saved.push({ title: group.title, color: group.color, urls: tabs.map(t => t.url) });
  }
  await storage.set('workspaces', JSON.stringify(saved));
  return { count: saved.length };
});
```

## Colors
Available: `grey`, `blue`, `red`, `yellow`, `green`, `pink`, `purple`, `cyan`, `orange`

## When to Use
- Tab organization/workspace tools
- Project management extensions
- Session management (save/restore tab groups)
- Productivity extensions (group by domain, topic)

## When NOT to Use
- If you only need tab info — use `tabs` permission
- If you don't need to modify groups — `tabs` events include `groupId`

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('tabGroups');
```

## Cross-References
- Guide: `docs/guides/tab-management.md`
- Related: `docs/permissions/tabs.md`
