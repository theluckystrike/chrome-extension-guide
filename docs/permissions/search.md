---
layout: default
title: "search Permission"
description: "Access to the API for triggering searches using the user's default search engine. None. this permission does not trigger a warning at install time."
permalink: /permissions/search/
category: permissions
order: 36
canonical_url: "https://bestchromeextensions.com/permissions/search/"
---

# search Permission

What It Grants {#what-it-grants}
Access to the `chrome.search` API for triggering searches using the user's default search engine.

Manifest {#manifest}
```json
{
  "permissions": ["search"]
}
```

User Warning {#user-warning}
None. this permission does not trigger a warning at install time.

API Access {#api-access}
Single method:
```typescript
await chrome.search.query({
  text: 'chrome extension development',
  disposition: 'NEW_TAB'
});
```

Parameters {#parameters}
| Parameter | Type | Description |
|---|---|---|
| `text` | string | The search query (required) |
| `disposition` | string | Where to show results: `CURRENT_TAB`, `NEW_TAB`, `NEW_WINDOW` |
| `tabId` | number | Tab to show results in (only with `CURRENT_TAB`) |

Disposition Options {#disposition-options}
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

Search Launcher Pattern {#search-launcher-pattern}
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

Keyboard Shortcut Search {#keyboard-shortcut-search}
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

Context Menu Search {#context-menu-search}
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

Important Notes {#important-notes}

search API Important Notes and Limitations
- Uses the user's default search engine (you cannot choose which engine)
- Does NOT return search results. only opens the search page
- Simple API. just triggers browser search

When to use {#when-to-use}
- Quick-search extensions
- Context menu "search for this" features
- Omnibox alternatives
- Keyboard shortcut search triggers

When NOT to use {#when-not-to-use}
- If you need search results programmatically. use a search API directly (Google Custom Search, etc.)
- If you want to control which search engine. not possible with this API

Permission Check {#permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('search');
```

Cross-References {#cross-references}
- Related: `docs/guides/omnibox-api.md`

Frequently Asked Questions

How do I create a search provider in Chrome?
Use chrome.search to interact with Chrome's default search provider. Your extension can perform searches and get information about the current search provider.

Can I add custom search engines?
The search API doesn't allow creating new search engines, but you can interact with existing ones.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
