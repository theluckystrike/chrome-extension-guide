---
title: "search Permission"
description: "Access to the `chrome.search` API for triggering searches using the user's default search engine. { "permissions": ["search"] } None — this permission does not trigger a warning at install time."
permalink: /permissions/search/
category: permissions
order: 36
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/search/"
---

# search Permission

## What It Grants
Access to the `chrome.search` API for triggering searches using the user's default search engine.

## Manifest
```json
{
  "permissions": ["search"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access
Single method:
```typescript
await chrome.search.query({
  text: 'chrome extension development',
  disposition: 'NEW_TAB'
});
```

## Parameters
| Parameter | Type | Description |
|---|---|---|
| `text` | string | The search query (required) |
| `disposition` | string | Where to show results: `CURRENT_TAB`, `NEW_TAB`, `NEW_WINDOW` |
| `tabId` | number | Tab to show results in (only with `CURRENT_TAB`) |

## Disposition Options
```typescript
// Search in current tab
await chrome.search.query({ text: 'query', disposition: 'CURRENT_TAB' });

// Search in new tab (default)
await chrome.search.query({ text: 'query', disposition: 'NEW_TAB' });

// Search in new window
await chrome.search.query({ text: 'query', disposition: 'NEW_WINDOW' });

// Search in specific tab
await chrome.search.query({ text: 'query', disposition: 'CURRENT_TAB', tabId: 123 });
```

## Search Launcher Pattern
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  QUICK_SEARCH: { request: { query: string; where?: string }; response: { ok: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('QUICK_SEARCH', async ({ query, where }) => {
  await chrome.search.query({
    text: query,
    disposition: (where as 'CURRENT_TAB' | 'NEW_TAB' | 'NEW_WINDOW') || 'NEW_TAB'
  });
  return { ok: true };
});
```

## Keyboard Shortcut Search
```typescript
// manifest.json: "commands": { "quick-search": { "suggested_key": { "default": "Ctrl+Shift+S" } } }

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-search') {
    // Get selected text from active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => window.getSelection()?.toString() || ''
    });
    if (result) {
      await chrome.search.query({ text: result, disposition: 'NEW_TAB' });
    }
  }
});
```

## Context Menu Search
```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'search-selection',
    title: 'Search for "%s"',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'search-selection' && info.selectionText) {
    await chrome.search.query({ text: info.selectionText, disposition: 'NEW_TAB' });
  }
});
```

## Important Notes
- Uses the user's default search engine (you cannot choose which engine)
- Does NOT return search results — only opens the search page
- Simple API — just triggers browser search

## When to use
- Quick-search extensions
- Context menu "search for this" features
- Omnibox alternatives
- Keyboard shortcut search triggers

## When NOT to use
- If you need search results programmatically — use a search API directly (Google Custom Search, etc.)
- If you want to control which search engine — not possible with this API

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('search');
```

## Cross-References
- Related: `docs/guides/omnibox-api.md`
