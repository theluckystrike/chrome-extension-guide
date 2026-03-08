---
layout: default
title: "Chrome Bookmarks API Complete Reference"
description: "The Chrome Bookmarks API enables creating, reading, updating, deleting, searching, and organizing bookmarks in a hierarchical tree structure with folders and nodes."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/bookmarks-api/"
---

# Chrome Bookmarks API Reference

The `chrome.bookmarks` API lets you create, read, update, delete, search, and organize bookmarks. Bookmarks are stored in a tree structure with folders and bookmark nodes.

## Permissions {#permissions}

```json
{
  "permissions": ["bookmarks"]
}
```

The `bookmarks` permission triggers a "Read and change your bookmarks" warning in the Chrome Web Store. Consider using `optional_permissions` if bookmark access is not core functionality.

See the [bookmarks permission reference](../permissions/bookmarks.md) for details.

## BookmarkTreeNode Object {#bookmarktreenode-object}

Every bookmark or folder is represented as a `BookmarkTreeNode`:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique node identifier |
| `parentId` | `string \| undefined` | ID of the parent folder (undefined for root) |
| `index` | `number \| undefined` | Position within the parent folder (0-based) |
| `url` | `string \| undefined` | URL of the bookmark. Absent for folders |
| `title` | `string` | Display title |
| `dateAdded` | `number \| undefined` | Creation timestamp (ms since epoch) |
| `dateLastUsed` | `number \| undefined` | Last time the bookmark was opened (not set for folders; Chrome 114+) |
| `dateGroupModified` | `number \| undefined` | Last time folder contents changed (folders only) |
| `children` | `BookmarkTreeNode[]` | Child nodes (present only when using `getTree()` or `getSubTree()`) |
| `unmodifiable` | `"managed"` | Present if the bookmark is managed by policy |

## Tree Structure {#tree-structure}

Chrome's bookmark tree has a fixed root structure:

```
Root (id: "0")
├── Bookmarks Bar (id: "1")
├── Other Bookmarks (id: "2")
└── Mobile Bookmarks (id: "3")  // synced from mobile
```

You cannot create, modify, or delete the root node or these top-level folders.

## Core Methods {#core-methods}

### chrome.bookmarks.getTree() {#chromebookmarksgettree}

Get the entire bookmark tree.

```ts
const [root] = await chrome.bookmarks.getTree();
// root.children contains: Bookmarks Bar, Other Bookmarks, Mobile Bookmarks

function walkTree(nodes: chrome.bookmarks.BookmarkTreeNode[], depth = 0) {
  for (const node of nodes) {
    const prefix = "  ".repeat(depth);
    if (node.url) {
      console.log(`${prefix}[bookmark] ${node.title} — ${node.url}`);
    } else {
      console.log(`${prefix}[folder] ${node.title}`);
      if (node.children) walkTree(node.children, depth + 1);
    }
  }
}
walkTree(root.children!);
```

### chrome.bookmarks.getSubTree(id) {#chromebookmarksgetsubtreeid}

Get a subtree starting from a specific node.

```ts
// Get everything under "Bookmarks Bar"
const [bar] = await chrome.bookmarks.getSubTree("1");
console.log(bar.children); // direct children of the bar
```

### chrome.bookmarks.get(idOrIds) {#chromebookmarksgetidorids}

Get specific bookmark nodes by ID.

```ts
const [bookmark] = await chrome.bookmarks.get("42");
console.log(bookmark.title, bookmark.url);

// Get multiple
const bookmarks = await chrome.bookmarks.get(["42", "43", "44"]);
```

### chrome.bookmarks.getChildren(id) {#chromebookmarksgetchildrenid}

Get the direct children of a folder.

```ts
// Children of "Other Bookmarks"
const children = await chrome.bookmarks.getChildren("2");
children.forEach((child) => {
  console.log(child.title, child.url ? "(bookmark)" : "(folder)");
});
```

### chrome.bookmarks.getRecent(numberOfItems) {#chromebookmarksgetrecentnumberofitems}

Get the most recently added bookmarks.

```ts
const recent = await chrome.bookmarks.getRecent(10);
recent.forEach((b) => console.log(b.title, b.dateAdded));
```

### chrome.bookmarks.search(query) {#chromebookmarkssearchquery}

Search bookmarks by title, URL, or both.

```ts
// Search by string (matches title and URL)
const results = await chrome.bookmarks.search("chrome extensions");

// Search with specific fields
const results = await chrome.bookmarks.search({
  title: "My Bookmark",
});

const results = await chrome.bookmarks.search({
  url: "https://example.com/page",
});

// Check if a URL is bookmarked
async function isBookmarked(url: string): Promise<boolean> {
  const results = await chrome.bookmarks.search({ url });
  return results.length > 0;
}
```

### chrome.bookmarks.create(bookmark) {#chromebookmarkscreatebookmark}

Create a new bookmark or folder.

```ts
// Create a bookmark in "Other Bookmarks"
const bookmark = await chrome.bookmarks.create({
  parentId: "2",
  title: "Example Site",
  url: "https://example.com",
});
console.log("Created bookmark with ID:", bookmark.id);

// Create a folder
const folder = await chrome.bookmarks.create({
  parentId: "1", // Bookmarks Bar
  title: "My Extension Bookmarks",
});

// Create a bookmark inside the new folder
await chrome.bookmarks.create({
  parentId: folder.id,
  title: "Saved Page",
  url: "https://example.com/page",
});

// Create at a specific position
await chrome.bookmarks.create({
  parentId: "1",
  index: 0, // first position
  title: "Pinned Bookmark",
  url: "https://example.com",
});
```

### chrome.bookmarks.update(id, changes) {#chromebookmarksupdateid-changes}

Update a bookmark's title or URL.

```ts
// Update title
await chrome.bookmarks.update(bookmarkId, {
  title: "New Title",
});

// Update URL
await chrome.bookmarks.update(bookmarkId, {
  url: "https://example.com/new-path",
});

// Update both
await chrome.bookmarks.update(bookmarkId, {
  title: "Updated Title",
  url: "https://example.com/updated",
});
```

### chrome.bookmarks.move(id, destination) {#chromebookmarksmoveid-destination}

Move a bookmark to a different folder or position.

```ts
// Move to another folder
await chrome.bookmarks.move(bookmarkId, {
  parentId: folderId,
});

// Move to a specific position within a folder
await chrome.bookmarks.move(bookmarkId, {
  parentId: folderId,
  index: 0, // move to first position
});

// Reorder within the same folder
await chrome.bookmarks.move(bookmarkId, {
  index: 3,
});
```

### chrome.bookmarks.remove(id) / chrome.bookmarks.removeTree(id) {#chromebookmarksremoveid-chromebookmarksremovetreeid}

Delete a bookmark or folder.

```ts
// Remove a single bookmark
await chrome.bookmarks.remove(bookmarkId);

// Remove a folder and all its contents
await chrome.bookmarks.removeTree(folderId);
```

## Events {#events}

### chrome.bookmarks.onCreated {#chromebookmarksoncreated}

```ts
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log(`Bookmark created: ${bookmark.title} (${bookmark.url})`);
});
```

### chrome.bookmarks.onRemoved {#chromebookmarksonremoved}

```ts
chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log(`Bookmark removed from parent: ${removeInfo.parentId}`);
  // removeInfo.node contains the removed node data
});
```

### chrome.bookmarks.onChanged {#chromebookmarksonchanged}

Fires when a bookmark's title or URL is updated.

```ts
chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log(`Bookmark ${id} updated:`, changeInfo.title, changeInfo.url);
});
```

### chrome.bookmarks.onMoved {#chromebookmarksonmoved}

```ts
chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log(`Moved from ${moveInfo.oldParentId}[${moveInfo.oldIndex}] to ${moveInfo.parentId}[${moveInfo.index}]`);
});
```

### chrome.bookmarks.onChildrenReordered {#chromebookmarksonchildrenreordered}

Fires when the children of a folder are reordered (e.g. sorted by the user).

```ts
chrome.bookmarks.onChildrenReordered.addListener((id, reorderInfo) => {
  console.log(`Children of ${id} reordered:`, reorderInfo.childIds);
});
```

### chrome.bookmarks.onImportBegan / chrome.bookmarks.onImportEnded {#chromebookmarksonimportbegan-chromebookmarksonimportended}

Fires when the user imports bookmarks. Use these to suppress your event handlers during bulk import.

```ts
let importing = false;

chrome.bookmarks.onImportBegan.addListener(() => {
  importing = true;
});

chrome.bookmarks.onImportEnded.addListener(() => {
  importing = false;
  // Refresh your UI here
});

chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  if (importing) return; // skip during bulk import
  // handle individual bookmark creation
});
```

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Build a bookmark manager with background handling and popup UI:

```ts
// shared/messages.ts
type Messages = {
  searchBookmarks: {
    request: { query: string };
    response: Array<{ id: string; title: string; url: string }>;
  };
  toggleBookmark: {
    request: { url: string; title: string };
    response: { bookmarked: boolean; id?: string };
  };
  getRecentBookmarks: {
    request: { count: number };
    response: Array<{ id: string; title: string; url: string; dateAdded: number }>;
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage({
  searchBookmarks: async ({ query }) => {
    const results = await chrome.bookmarks.search(query);
    return results
      .filter((b) => b.url)
      .map((b) => ({ id: b.id, title: b.title, url: b.url! }));
  },
  toggleBookmark: async ({ url, title }) => {
    const existing = await chrome.bookmarks.search({ url });
    if (existing.length > 0) {
      await chrome.bookmarks.remove(existing[0].id);
      return { bookmarked: false };
    }
    const created = await chrome.bookmarks.create({ title, url });
    return { bookmarked: true, id: created.id };
  },
  getRecentBookmarks: async ({ count }) => {
    const recent = await chrome.bookmarks.getRecent(count);
    return recent.map((b) => ({
      id: b.id,
      title: b.title,
      url: b.url || "",
      dateAdded: b.dateAdded || 0,
    }));
  },
});
```

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Track bookmark statistics and user preferences:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  bookmarkStats: {
    totalCreated: 0,
    totalDeleted: 0,
    lastBookmarkedUrl: "",
  },
  extensionFolderId: "" as string,
});

const storage = createStorage({ schema, area: "local" });

// Ensure extension folder exists on install
chrome.runtime.onInstalled.addListener(async () => {
  const folder = await chrome.bookmarks.create({
    parentId: "2",
    title: "My Extension",
  });
  await storage.set("extensionFolderId", folder.id);
});

// Track bookmark creation
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  const stats = await storage.get("bookmarkStats");
  await storage.set("bookmarkStats", {
    ...stats,
    totalCreated: stats.totalCreated + 1,
    lastBookmarkedUrl: bookmark.url || stats.lastBookmarkedUrl,
  });
});
```

## Common Patterns {#common-patterns}

### Bookmark the current page with one click {#bookmark-the-current-page-with-one-click}

```ts
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url) return;
  const existing = await chrome.bookmarks.search({ url: tab.url });
  if (existing.length > 0) {
    await chrome.bookmarks.remove(existing[0].id);
    // Update icon to indicate "not bookmarked"
  } else {
    await chrome.bookmarks.create({
      title: tab.title || tab.url,
      url: tab.url,
    });
    // Update icon to indicate "bookmarked"
  }
});
```

### Export bookmarks as JSON {#export-bookmarks-as-json}

```ts
async function exportBookmarks(): Promise<string> {
  const [root] = await chrome.bookmarks.getTree();
  return JSON.stringify(root, null, 2);
}
```

### Find duplicate bookmarks {#find-duplicate-bookmarks}

```ts
async function findDuplicates() {
  const [root] = await chrome.bookmarks.getTree();
  const urlMap = new Map<string, chrome.bookmarks.BookmarkTreeNode[]>();

  function collect(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
    for (const node of nodes) {
      if (node.url) {
        const list = urlMap.get(node.url) || [];
        list.push(node);
        urlMap.set(node.url, list);
      }
      if (node.children) collect(node.children);
    }
  }
  collect(root.children!);

  return [...urlMap.entries()]
    .filter(([, nodes]) => nodes.length > 1)
    .map(([url, nodes]) => ({ url, count: nodes.length, ids: nodes.map((n) => n.id) }));
}
```

## Gotchas {#gotchas}

1. **IDs are strings**, not numbers. Always treat bookmark IDs as strings.

2. **Root nodes are immutable.** You cannot modify or delete nodes with IDs `"0"`, `"1"`, `"2"`, or `"3"`.

3. **`search()` is case-insensitive** and matches partial strings in both title and URL when given a string query. Use the object form `{ url: "exact-url" }` for exact URL matching.

4. **`removeTree()` is irreversible.** There is no undo. Consider confirming with the user before deleting folders.

5. **Bookmark URLs must be valid.** `chrome.bookmarks.create()` will throw if you pass an invalid URL. `javascript:` URLs are blocked in MV3.

6. **Events fire during sync.** If the user has Chrome Sync enabled, remote bookmark changes will trigger local events. Use `onImportBegan`/`onImportEnded` to batch handle these.

## Related {#related}

- [bookmarks permission](../permissions/bookmarks.md)
- [History API](history-api.md)
- [Storage API Deep Dive](storage-api-deep-dive.md)
- [Chrome bookmarks API docs](https://developer.chrome.com/docs/extensions/reference/api/bookmarks)

## Frequently Asked Questions

### How do I create bookmarks programmatically?
Use chrome.bookmarks.create() with a title and URL. You can also create folders and organize bookmarks in a tree structure.

### Can I search bookmarks from my extension?
Yes, chrome.bookmarks.search() lets you find bookmarks by text, URL, or other criteria.
