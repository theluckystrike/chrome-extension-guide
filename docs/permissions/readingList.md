---
title: "readingList Permission"
description: "- **Permission string**: `"readingList"` - **API**: `chrome.readingList` — manage Chrome's built-in Reading List - **Chrome version**: Chrome 120+ Adds URL to reading list. Throws if URL already ex..."
permalink: /permissions/readingList/
category: permissions
order: 33
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/readingList/"
---

# readingList Permission

## Overview {#overview}

- **Permission string**: `"readingList"`
- **API**: `chrome.readingList` — manage Chrome's built-in Reading List
- **Chrome version**: Chrome 120+

## API Methods {#api-methods}

### addEntry(entry) {#addentryentry}

Adds URL to reading list. Throws if URL already exists.

```javascript
chrome.readingList.addEntry({ url, title, hasBeenRead })
```

- `url`: must be HTTP/HTTPS
- `title`: string
- `hasBeenRead`: boolean

### removeEntry(info) {#removeentryinfo}

Removes entry by URL.

```javascript
chrome.readingList.removeEntry({ url })
```

### updateEntry(info) {#updateentryinfo}

Updates an entry. URL is the identifier.

```javascript
chrome.readingList.updateEntry({ url, title?, hasBeenRead? })
```

### query(info) {#queryinfo}

Search reading list with optional filters.

```javascript
chrome.readingList.query({ url?, title?, hasBeenRead? })
```

Returns array of ReadingListEntry objects.

## Events {#events}

- `chrome.readingList.onEntryAdded` — fires when entry added
- `chrome.readingList.onEntryRemoved` — fires when entry removed
- `chrome.readingList.onEntryUpdated` — fires when entry updated

## ReadingListEntry Type {#readinglistentry-type}

```javascript
{ url, title, hasBeenRead, lastUpdateTime, creationTime }
```

## Manifest Declaration {#manifest-declaration}

```json
{ "permissions": ["readingList"] }
```

## Common Use Cases

## Use Cases {#use-cases}

### Read-Later Functionality
The primary use case for the Reading List API is enabling users to save articles for later reading. Extensions can add a context menu option or toolbar button that saves the current page to Chrome's built-in Reading List with a single click.

### Content Curation
Build tools that allow users or content curators to batch-add URLs from RSS feeds, newsletters, or other sources. This is useful for building curated reading lists from multiple sources.

### Research Tools
Academic researchers and professionals can use the API to organize research materials. They can add articles, papers, and resources to the reading list and track which items have been read.

### Reading Progress Tracking
Track reading progress by marking entries as read or unread. The `hasBeenRead` property can be updated automatically when users visit a URL or manually through extension controls.

### Bookmark Migration
Help users migrate from traditional bookmarks to the Reading List, or sync between different bookmarking services and Chrome's Reading List.

## Code Examples {#code-examples}

### Add page via context menu {#add-page-via-context-menu}

```javascript
// manifest: { "permissions": ["readingList", "contextMenus"] }
chrome.contextMenus.create({
  id: 'addToReadingList',
  title: 'Add to Reading List',
  contexts: ['page']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToReadingList') {
    chrome.readingList.addEntry({ url: tab.url, title: tab.title, hasBeenRead: false });
  }
});
```

### Query unread entries {#query-unread-entries}

```javascript
const unread = await chrome.readingList.query({ hasBeenRead: false });
```

### Mark as read after visiting {#mark-as-read-after-visiting}

```javascript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.readingList.updateEntry({ url: tab.url, hasBeenRead: true });
  }
});
```

### Batch add from URLs

```javascript
async function addMultipleUrls(urls) {
  for (const { url, title } of urls) {
    try {
      await chrome.readingList.addEntry({ url, title, hasBeenRead: false });
    } catch (e) {
      // Entry already exists, skip or update
      console.log(`Skipping ${url}: ${e.message}`);
    }
  }
}
```

### Search reading list

```javascript
// Find entries containing a specific term
async function searchReadingList(query) {
  const all = await chrome.readingList.query({});
  return all.filter(entry => 
    entry.title.toLowerCase().includes(query.toLowerCase()) ||
    entry.url.toLowerCase().includes(query.toLowerCase())
  );
}
```

## Best Practices

### Handle Duplicate Entries
The `addEntry` method throws an error if the URL already exists in the Reading List. Always handle this gracefully by catching the error or checking if the entry exists first.

### Sync Read Status Carefully
Be mindful when automatically marking entries as read. Users may want to revisit articles without losing their place. Consider providing an option to disable automatic read status updates.

### Respect User Privacy
Reading List entries contain browsing history information. Never transmit this data to external servers without explicit user consent, and be transparent in your privacy policy.

### Use Descriptive Titles
When adding entries programmatically, use meaningful titles. The page title is usually the best choice, but you might want to allow users to edit titles before saving.

### Consider Storage Quotas
While Chrome's Reading List has generous storage, be mindful of the volume of entries. Consider implementing cleanup of old or read entries to keep the list manageable.

### Handle Events for Real-Time Updates
Use the Reading List events to keep your extension's UI in sync with changes made through Chrome's native UI or other extensions.

## Use Cases

- Read-later: save articles from context menu
- Content curation: batch add URLs from feeds
- Research tools: organize research reading
- Reading tracker: mark as read/unread

## Cross-references

## Cross-references {#cross-references}

- patterns/reading-list-api.md
- tutorials/build-reading-list.md

## Frequently Asked Questions

### What is the readingList API?
The chrome.readingList API allows extensions to add, remove, and query items in Chrome's reading list feature.

### Is readingList available in all Chrome versions?
The readingList API was introduced recently and may not be available in older Chrome versions.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
