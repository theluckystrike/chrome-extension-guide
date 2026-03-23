---
layout: default
title: "Chrome Extension Bookmark API — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/bookmark-api/"
---
# Bookmark API Guide

## Overview {#overview}
- Requires `"bookmarks"` permission (cross-ref `docs/permissions/bookmarks.md`)
- Full CRUD access to the bookmark tree
- Bookmark tree is a hierarchy: BookmarkTreeNode objects with `id`, `parentId`, `title`, `url`, `children`

## Reading Bookmarks {#reading-bookmarks}
```javascript
// Get entire bookmark tree
chrome.bookmarks.getTree((tree) => {
  // tree[0] = root node with children: [Bookmarks Bar, Other Bookmarks, Mobile Bookmarks]
  const bookmarksBar = tree[0].children[0];
  const otherBookmarks = tree[0].children[1];
});

// Get specific nodes
chrome.bookmarks.get('123', ([node]) => { /* single bookmark */ });
chrome.bookmarks.getChildren('0', (children) => { /* direct children of root */ });
chrome.bookmarks.getSubTree('123', ([subtree]) => { /* node + all descendants */ });

// Get recently added
chrome.bookmarks.getRecent(10, (results) => {
  results.forEach(b => console.log(b.title, b.url));
});

// Search bookmarks
chrome.bookmarks.search('chrome extension', (results) => {
  // Matches title or URL
});
chrome.bookmarks.search({ url: 'https://developer.chrome.com/' }, (results) => {
  // Exact URL match
});
```

## Creating Bookmarks & Folders {#creating-bookmarks-folders}
```javascript
// Create a bookmark
chrome.bookmarks.create({
  parentId: '1',           // Bookmarks Bar
  title: 'Chrome APIs',
  url: 'https://developer.chrome.com/docs/extensions/reference/'
}, (newBookmark) => {
  console.log('Created:', newBookmark.id);
});

// Create a folder (omit url)
chrome.bookmarks.create({
  parentId: '1',
  title: 'Dev Resources'
}, (folder) => {
  // Now add bookmarks inside the folder
  chrome.bookmarks.create({
    parentId: folder.id,
    title: 'MDN',
    url: 'https://developer.mozilla.org/'
  });
});
```

## Updating & Deleting {#updating-deleting}
```javascript
// Update title/URL
chrome.bookmarks.update('123', {
  title: 'New Title',
  url: 'https://new-url.com'
});

// Move to different folder/position
chrome.bookmarks.move('123', {
  parentId: '2',    // Other Bookmarks
  index: 0          // First position
});

// Delete bookmark or empty folder
chrome.bookmarks.remove('123');

// Delete folder and all contents
chrome.bookmarks.removeTree('123');
```

## Bookmark Events {#bookmark-events}
```javascript
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('New bookmark:', bookmark.title, bookmark.url);
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('Removed:', id, 'from parent:', removeInfo.parentId);
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log('Updated:', changeInfo.title, changeInfo.url);
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log('Moved from', moveInfo.oldParentId, 'to', moveInfo.parentId);
});

chrome.bookmarks.onChildrenReordered.addListener((id, reorderInfo) => {
  console.log('Children reordered in folder:', id);
});
```

## Syncing Bookmark State {#syncing-bookmark-state}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  bookmarkTags: 'string',     // JSON: { [bookmarkId]: string[] }
  lastSyncTime: 'number'
}), 'sync');

// Add custom tags to bookmarks
async function tagBookmark(id, tags) {
  const raw = await storage.get('bookmarkTags');
  const allTags = raw ? JSON.parse(raw) : {};
  allTags[id] = tags;
  await storage.set('bookmarkTags', JSON.stringify(allTags));
}
```

## Practical Patterns {#practical-patterns}
- **Duplicate detector**: search by URL on `onCreated` to find dupes
- **Bookmark organizer**: auto-sort into folders by domain
- **Export/import**: traverse tree, serialize to JSON, download as file
- **Bookmark bar quick switcher**: swap folder contents based on context (work/personal)

## Common Mistakes {#common-mistakes}
- Trying to modify root nodes (ids "0", "1", "2") — they're read-only
- Confusing `remove` (single) with `removeTree` (recursive)
- Not handling the asynchronous nature of all bookmark APIs
- Forgetting that `search` matches both title AND URL substrings

## Related Articles {#related-articles}

## Related Articles

- [Bookmarks API Reference](../api-reference/bookmarks-api.md)
- [History API](../guides/history-api.md)
-e 
---

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
