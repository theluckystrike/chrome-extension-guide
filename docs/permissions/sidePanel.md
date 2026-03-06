# sidePanel Permission

## What It Grants
Access to the `chrome.sidePanel` API for displaying a side panel UI alongside web content. Chrome 114+.

## Manifest
```json
{
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access
- `chrome.sidePanel.setOptions(options)` — configure panel per-tab or globally
- `chrome.sidePanel.getOptions(options)` — get current configuration
- `chrome.sidePanel.open(options)` — programmatically open the panel (Chrome 116+)
- `chrome.sidePanel.setPanelBehavior(behavior)` — control open-on-action-click

## Basic Setup
```typescript
// Set default panel
await chrome.sidePanel.setOptions({
  path: 'sidepanel.html',
  enabled: true
});

// Open panel on action click
await chrome.sidePanel.setPanelBehavior({
  openPanelOnActionClick: true
});
```

## Per-Tab Panel
```typescript
// Show different panel for specific tab
await chrome.sidePanel.setOptions({
  tabId: tab.id,
  path: 'tab-specific-panel.html',
  enabled: true
});

// Disable panel for a tab
await chrome.sidePanel.setOptions({
  tabId: tab.id,
  enabled: false
});
```

## Programmatic Open
```typescript
// Open side panel (requires user gesture context)
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Open in specific window
await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
```

## Communication with Side Panel
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  UPDATE_PANEL: { request: { data: string }; response: { ok: boolean } };
  GET_TAB_INFO: { request: { tabId: number }; response: { title: string; url: string } };
};

const m = createMessenger<Messages>();

// From service worker, send data to side panel
m.sendMessage('UPDATE_PANEL', { data: 'new content' });

// In side panel, listen for messages
m.onMessage('UPDATE_PANEL', async ({ data }) => {
  document.getElementById('content')!.textContent = data;
  return { ok: true };
});
```

## Storage Integration
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  panelWidth: 'number',
  panelTheme: 'string',
  lastTab: 'number'
});
const storage = createStorage(schema, 'local');

// Save panel preferences
await storage.set('panelTheme', 'dark');
```

## Context-Aware Panel
```typescript
// Show different panel based on the current site
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  const url = new URL(tab.url || '');

  if (url.hostname.includes('github.com')) {
    await chrome.sidePanel.setOptions({ tabId, path: 'panels/github.html' });
  } else {
    await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html' });
  }
});
```

## When to Use
- Persistent UI alongside web content (notes, tools, references)
- Reading lists, bookmarks, annotations
- Chat/assistant interfaces
- Developer tools panels
- Content analysis alongside browsing

## When NOT to Use
- Quick actions — use popup instead
- Settings — use options page
- One-time notifications — use `chrome.notifications`

## Comparison with Other UI
| UI | Persistent | Size | Interaction |
|---|---|---|---|
| Popup | No (closes on blur) | Small | Quick actions |
| Side Panel | Yes | Medium | Ongoing tasks |
| Options Page | No (separate tab) | Full page | Settings |
| Content Script UI | Yes (in page) | Variable | Page-specific |

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('sidePanel');
```

## Cross-References
- Guide: `docs/mv3/side-panel.md`
- Tutorial: `docs/tutorials/build-bookmark-manager.md`
