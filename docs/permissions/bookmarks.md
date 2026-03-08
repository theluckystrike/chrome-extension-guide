---
title: "bookmarks Permission — Chrome Extension Reference"
description: "- **Permission string**: `"bookmarks"` - **What it grants**: Full access to `chrome.bookmarks` API — read, create, update, delete, move, search bookmarks"
permalink: /permissions/bookmarks/
category: permissions
order: 3
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/bookmarks/"
---

# bookmarks Permission — Chrome Extension Reference

## Overview {#overview}
- **Permission string**: `"bookmarks"`
- **What it grants**: Full access to `chrome.bookmarks` API — read, create, update, delete, move, search bookmarks
- **Risk level**: Medium — full access to user's bookmark tree
- **User prompt**: "Read and change your bookmarks"
- `@theluckystrike/webext-permissions` description: `describePermission('bookmarks')`

## manifest.json Setup {#manifestjson-setup}
```json
{
  "permissions": ["bookmarks"]
}
```
- Consider using `optional_permissions` if bookmarks are a secondary feature
- Request at runtime with `@theluckystrike/webext-permissions`:
  ```typescript
  const result = await requestPermission('bookmarks');
  if (result.granted) { /* use chrome.bookmarks */ }
  ```

## Key APIs {#key-apis}

### Reading Bookmarks {#reading-bookmarks}

#### chrome.bookmarks.getTree()
```javascript
chrome.bookmarks.getTree((tree) => {
  // tree[0] is the root node
  // tree[0].children[0] = "Bookmarks Bar"
  // tree[0].children[1] = "Other Bookmarks"
});
```
- Returns the full bookmark tree as nested `BookmarkTreeNode` objects

#### chrome.bookmarks.get(idOrIds)
```javascript
chrome.bookmarks.get("123", (results) => {
  console.log(results[0].title, results[0].url);
});
```

#### chrome.bookmarks.getChildren(id)
- Get direct children of a folder

#### chrome.bookmarks.search(query)
```javascript
chrome.bookmarks.search({ query: "github" }, (results) => {
  results.forEach(b => console.log(b.title, b.url));
});
```
- Search by title, URL, or both
- Also accepts string shorthand: `chrome.bookmarks.search("github", cb)`

### Creating Bookmarks {#creating-bookmarks}

#### chrome.bookmarks.create(bookmark)
```javascript
chrome.bookmarks.create({
  parentId: "1",  // "1" = Bookmarks Bar
  title: "My Site",
  url: "https://example.com"
});
```
- Omit `url` to create a folder
- `index` controls position within parent

### Modifying Bookmarks {#modifying-bookmarks}

#### chrome.bookmarks.update(id, changes)
```javascript
chrome.bookmarks.update("123", { title: "New Title", url: "https://new-url.com" });
```

#### chrome.bookmarks.move(id, destination)
```javascript
chrome.bookmarks.move("123", { parentId: "2", index: 0 });
```

#### chrome.bookmarks.remove(id) / removeTree(id)
- `remove` — delete a single bookmark
- `removeTree` — delete a folder and all its contents

### Events {#events}

#### chrome.bookmarks.onCreated
#### chrome.bookmarks.onRemoved
#### chrome.bookmarks.onChanged
#### chrome.bookmarks.onMoved
#### chrome.bookmarks.onChildrenReordered
#### chrome.bookmarks.onImportBegan
#### chrome.bookmarks.onImportEnded
```javascript
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log(`New bookmark: ${bookmark.title} at ${bookmark.url}`);
});
```
- React to bookmark changes in real-time
- Works in background service worker

## BookmarkTreeNode Structure {#bookmarktreenode-structure}
```typescript
interface BookmarkTreeNode {
  id: string;
  parentId?: string;
  index?: number;
  url?: string;        // undefined for folders
  title: string;
  dateAdded?: number;   // timestamp
  dateGroupModified?: number;
  dateLastUsed?: number; // last opened timestamp (Chrome 114+)
  unmodifiable?: "managed"; // set for admin-configured bookmarks
  children?: BookmarkTreeNode[];  // only for folders
}
```

## Common Patterns {#common-patterns}

### Bookmark Manager {#bookmark-manager}
- Read tree, display in custom UI, allow CRUD operations
- Persist user preferences with `@theluckystrike/webext-storage`

### Bookmark Sync/Export {#bookmark-syncexport}
- `getTree()` to read all, serialize to JSON/HTML
- Import by iterating and calling `create()`

### Duplicate Finder {#duplicate-finder}
- `getTree()`, flatten, group by URL, find duplicates

### Bookmark Search from Popup {#bookmark-search-from-popup}
- Quick search popup using `chrome.bookmarks.search()`
- Show results in extension popup

## Storage Integration {#storage-integration}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const storage = createStorage(defineSchema({
  lastBookmarkSync: 'number',
  bookmarkCount: 'number'
}), 'local');

// Track bookmark count
chrome.bookmarks.getTree(async (tree) => {
  const count = countBookmarks(tree);
  await storage.set('bookmarkCount', count);
});
```

## Common Errors {#common-errors}
- `"Can't modify the root bookmark folders"` — IDs "0", "1", "2" are system folders
- `"Can't remove non-empty folder"` — use `removeTree` for folders with children
- Bookmark ID not found — bookmarks may have been deleted by user

## API Reference {#api-reference}
- [Bookmarks API Reference](../api-reference/bookmarks-api.md)

## Frequently Asked Questions

### How do I bookmark pages in a Chrome extension?
Use the chrome.bookmarks API to create, read, update, and delete bookmarks. You can create folders, organize bookmarks, and listen for changes via chrome.bookmarks.onCreated and other events.

### Can extensions read user's existing bookmarks?
Yes, with the "bookmarks" permission, your extension can read and manipulate the user's existing bookmarks.
