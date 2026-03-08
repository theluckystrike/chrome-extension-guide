---
title: "readingList Permission"
description: "- **Permission string**: `"readingList"` - **API**: `chrome.readingList` — manage Chrome's built-in Reading List - **Chrome version**: Chrome 120+ Adds URL to reading list. Throws if URL already ex..."
permalink: /permissions/readingList/
category: permissions
order: 33
---

# readingList Permission

## Overview

- **Permission string**: `"readingList"`
- **API**: `chrome.readingList` — manage Chrome's built-in Reading List
- **Chrome version**: Chrome 120+

## API Methods

### addEntry(entry)

Adds URL to reading list. Throws if URL already exists.

```javascript
chrome.readingList.addEntry({ url, title, hasBeenRead })
```

- `url`: must be HTTP/HTTPS
- `title`: string
- `hasBeenRead`: boolean

### removeEntry(info)

Removes entry by URL.

```javascript
chrome.readingList.removeEntry({ url })
```

### updateEntry(info)

Updates an entry. URL is the identifier.

```javascript
chrome.readingList.updateEntry({ url, title?, hasBeenRead? })
```

### query(info)

Search reading list with optional filters.

```javascript
chrome.readingList.query({ url?, title?, hasBeenRead? })
```

Returns array of ReadingListEntry objects.

## Events

- `chrome.readingList.onEntryAdded` — fires when entry added
- `chrome.readingList.onEntryRemoved` — fires when entry removed
- `chrome.readingList.onEntryUpdated` — fires when entry updated

## ReadingListEntry Type

```javascript
{ url, title, hasBeenRead, lastUpdateTime, creationTime }
```

## Manifest Declaration

```json
{ "permissions": ["readingList"] }
```

## Use Cases

- Read-later: save articles from context menu
- Content curation: batch add URLs from feeds
- Research tools: organize research reading
- Reading tracker: mark as read/unread

## Code Examples

### Add page via context menu

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

### Query unread entries

```javascript
const unread = await chrome.readingList.query({ hasBeenRead: false });
```

### Mark as read after visiting

```javascript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.readingList.updateEntry({ url: tab.url, hasBeenRead: true });
  }
});
```

## Cross-references

- patterns/reading-list-api.md
- tutorials/build-reading-list.md
