---
layout: default
title: "Chrome Extension Bookmarks API — How to Create, Search, and Organize Bookmarks"
description: "A comprehensive guide to using the Chrome Bookmarks API in extensions. Learn to create, search, organize bookmarks with CRUD operations, event listeners, and import/export features."
canonical_url: "https://bestchromeextensions.com/guides/bookmarks-api/"
---

# Chrome Extension Bookmarks API — How to Create, Search, and Organize Bookmarks

The Chrome Bookmarks API (`chrome.bookmarks`) is a powerful extension API that enables your Chrome extension to create, read, update, and delete bookmarks, as well as organize them into folders. This guide covers everything you need to build bookmark management features into your extension.

## Prerequisites and Permissions

Before using the Bookmarks API, you need to declare the `"bookmarks"` permission in your `manifest.json`:

```json
{
  "permissions": ["bookmarks"]
}
```

This permission grants read and write access to all bookmarks in the user's browser. Note that you cannot restrict access to specific folders—a request for any bookmark returns all available data.

## Understanding the Bookmark Tree Structure

The Chrome Bookmarks API organizes bookmarks in a hierarchical tree structure known as the **BookmarkTreeNode**. Each node represents either a bookmark or a folder and contains properties like:

- `id` (string): Unique identifier for the node
- `parentId` (string): ID of the parent folder (null for the root)
- `title` (string): Display title of the bookmark or folder
- `url` (string): URL of the bookmark (undefined for folders)
- `index` (number): Position within the parent's children
- `dateAdded` (number): Unix timestamp when the bookmark was created
- `dateGroupModified` (number): Unix timestamp of last modification
- `children` (array): Child nodes (only present when retrieving subtrees)

The tree root contains three default folders:
1. **Bookmarks Bar** (usually ID "1")
2. **Other Bookmarks** (usually ID "2")
3. **Mobile Bookmarks** (usually ID "3")

## CRUD Operations

### Reading Bookmarks

Retrieve bookmarks using several methods:

```javascript
// Get the entire bookmark tree
chrome.bookmarks.getTree((tree) => {
  const root = tree[0];
  const bookmarksBar = root.children[0];
  console.log("Bookmarks Bar:", bookmarksBar);
});

// Get recent bookmarks
chrome.bookmarks.getRecent(10, (results) => {
  results.forEach(b => console.log(b.title, b.url));
});

// Search bookmarks by title or URL
chrome.bookmarks.search("tutorial", (results) => {
  results.forEach(b => console.log(b));
});

// Search with specific criteria
chrome.bookmarks.search({ url: "https://example.com" }, (results) => {
  console.log("Exact URL matches:", results);
});
```

### Creating Bookmarks and Folders

Create bookmarks with the `create()` method:

```javascript
// Create a new bookmark
chrome.bookmarks.create({
  parentId: "1",  // Bookmarks Bar
  title: "Chrome Extensions Docs",
  url: "https://developer.chrome.com/docs/extensions/"
}, (newBookmark) => {
  console.log("Created bookmark:", newBookmark.id);
});

// Create a folder
chrome.bookmarks.create({
  parentId: "1",
  title: "Work Resources"
}, (newFolder) => {
  console.log("Created folder:", newFolder.id);
});
```

### Updating Bookmarks

Modify existing bookmarks or folders:

```javascript
// Update bookmark title and URL
chrome.bookmarks.update("123", {
  title: "Updated Title",
  url: "https://new-url.com"
}, (updatedBookmark) => {
  console.log("Updated:", updatedBookmark);
});

// Move bookmark to a different folder
chrome.bookmarks.move("123", {
  parentId: "2",  // Move to Other Bookmarks
  index: 0        // First position
});
```

### Deleting Bookmarks

Remove bookmarks or entire folders:

```javascript
// Delete a single bookmark
chrome.bookmarks.remove("123", () => {
  console.log("Bookmark deleted");
});

// Delete a folder and all its contents
chrome.bookmarks.removeTree("456", () => {
  console.log("Folder and contents deleted");
});
# Chrome Bookmarks API Guide

## Introduction
- `chrome.bookmarks` API manages browser bookmarks programmatically
- Enables reading, creating, organizing, and searching bookmarks
- Requires `"bookmarks"` permission in manifest.json

## manifest.json
```json
{ "permissions": ["bookmarks"], "background": { "service_worker": "background.js" } }
```

## Bookmark Tree Structure
Each node has: `id`, `parentId`, `index`, `title`, `url` (bookmarks), `dateAdded`, `dateGroupModified`. Folders have `children`; bookmarks have `url`.

## Reading Bookmarks

### getTree - Full Bookmark Tree
```javascript
chrome.bookmarks.getTree((results) => {
  console.log("Root:", results[0].title, "Children:", results[0].children);
});
```

### getSubTree - Partial Tree
```javascript
chrome.bookmarks.getSubTree("folder_id", (results) => console.log(results[0].children));
```

### getChildren - Direct Children Only
```javascript
chrome.bookmarks.getChildren("folder_id", (results) => results.forEach(n => console.log(n.title)));
```

### getRecent - Recently Added
```javascript
chrome.bookmarks.getRecent(10, (results) => console.log("Recent:", results));
```

## Searching Bookmarks

### search - Find by Title or URL
```javascript
// Search by text
chrome.bookmarks.search("tutorial", (results) => console.log(results));

// Search by URL
chrome.bookmarks.search({ url: "https://example.com" }, (results) => console.log(results));

// Search by title
chrome.bookmarks.search({ title: "My Bookmark" }, (results) => console.log(results));
```

## Creating Bookmarks and Folders

### create - Add Bookmark
```javascript
// Simple bookmark
chrome.bookmarks.create({ title: "Google", url: "https://google.com" }, (bm) => console.log(bm.id));

// In specific folder
chrome.bookmarks.create({ parentId: "folder_id", title: "My Project", url: "https://github.com" }, (bm) => console.log(bm));

// At specific position
chrome.bookmarks.create({ parentId: "folder_id", index: 0, title: "First", url: "https://example.com" }, (bm) => console.log(bm));
```

### create - Add Folder
```javascript
// Root folder
chrome.bookmarks.create({ title: "Work Projects" }, (folder) => console.log(folder.id));

// Nested folder
chrome.bookmarks.create({ parentId: "parent_id", title: "Subfolder" }, (folder) => console.log(folder.id));
```

## Updating Bookmarks

### update - Modify Bookmark/Folder
```javascript
chrome.bookmarks.update("bookmark_id", { title: "New Title" }, (bm) => console.log("Updated:", bm));
chrome.bookmarks.update("bookmark_id", { url: "https://new-url.com" }, (bm) => console.log("URL changed"));
```

### move - Relocate Bookmark/Folder
```javascript
// Move to folder
chrome.bookmarks.move("bookmark_id", { parentId: "new_parent_id" }, (bm) => console.log("Moved:", bm));

// Move to position
chrome.bookmarks.move("bookmark_id", { parentId: "folder_id", index: 0 }, (bm) => console.log(bm));
```

### remove - Delete Bookmark
```javascript
chrome.bookmarks.remove("bookmark_id", () => console.log("Deleted"));
```

### removeTree - Delete Folder and Contents
```javascript
chrome.bookmarks.removeTree("folder_id", () => console.log("Folder deleted")); // Irreversible!
```

## Event Listeners

The Bookmarks API provides event listeners to track changes made by the user or other extensions:

```javascript
// Called when a bookmark or folder is created
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log("Created:", bookmark.title);
});

// Called when a bookmark or folder is removed
chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log("Removed:", removeInfo.title);
  console.log("Parent ID:", removeInfo.parentId);
});

// Called when a bookmark or folder is changed
chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log("Changed:", id, changeInfo);
});

// Called when a bookmark or folder moves to a different parent
chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log("Moved from", moveInfo.parentId, "to", moveInfo.index);
});

// Called when the order of children in a folder changes
chrome.bookmarks.onChildrenReordered.addListener((id, reorderInfo) => {
  console.log("Reordered children:", reorderInfo.childIds);
});
```

Event listeners are essential for keeping your extension's UI in sync with the user's bookmark changes, especially if you display bookmarks in a popup or side panel.

## Import and Export Bookmarks

While the Chrome Bookmarks API doesn't have dedicated import/export methods, you can implement this functionality using standard JavaScript and the Chrome Downloads API or by generating HTML bookmark files.

### Exporting Bookmarks

Generate an HTML bookmarks file that users can import into any browser:

```javascript
function exportBookmarks() {
  chrome.bookmarks.getTree((tree) => {
    const html = generateBookmarksHTML(tree[0]);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: "bookmarks-export.html",
      saveAs: true
    });
  });
}

function generateBookmarksHTML(node) {
  let html = "";
  if (node.url) {
    html += `<DT><A HREF="${node.url}">${node.title}</A>\n`;
  } else {
    html += `<DT><H3>${node.title}</H3>\n`;
  }
  
  if (node.children && node.children.length > 0) {
    html += "<DL><p>\n";
    node.children.forEach(child => {
      html += generateBookmarksHTML(child);
    });
    html += "</DL><p>\n";
  }
  
  return html;
}
```

### Importing Bookmarks

Parse an imported HTML bookmarks file and add each bookmark:

```javascript
function importBookmarks(htmlContent, parentId = "2") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const links = doc.querySelectorAll("a");
  
  links.forEach(link => {
    chrome.bookmarks.create({
      parentId: parentId,
      title: link.textContent,
      url: link.href
    });
  });
### onCreated
```javascript
chrome.bookmarks.onCreated.addListener((id, bookmark) => console.log(`Created: ${bookmark.title}`));
```

### onRemoved
```javascript
chrome.bookmarks.onRemoved.addListener((id, info) => console.log(`Removed: ${info.title}`));
```

### onChanged
```javascript
chrome.bookmarks.onChanged.addListener((id, changeInfo) => console.log("Changed:", changeInfo));
// changeInfo contains: title, url (if bookmark)
```

### onMoved
```javascript
chrome.bookmarks.onMoved.addListener((id, info) => console.log(`Moved to ${info.parentId}`));
```

### onImportBegan / onImportEnded
```javascript
chrome.bookmarks.onImportBegan.addListener(() => console.log("Import started"));
chrome.bookmarks.onImportEnded.addListener(() => console.log("Import finished"));
```

## Building a Bookmark Manager Extension

### background.js
```javascript
chrome.runtime.onInstalled.addListener(() => console.log("Installed"));

chrome.bookmarks.onCreated.addListener((id, bm) => console.log("Created:", bm.title));
chrome.bookmarks.onRemoved.addListener((id, info) => console.log("Removed:", info.title));
chrome.bookmarks.onChanged.addListener((id, info) => console.log("Changed:", info));
chrome.bookmarks.onMoved.addListener((id, info) => console.log("Moved:", info.parentId));
```

### popup.js - UI
```javascript
document.addEventListener("DOMContentLoaded", async () => {
  const tree = await chrome.bookmarks.getTree();
  render(tree[0].children, document.getElementById("root"));
  
  document.getElementById("search").addEventListener("input", async (e) => {
    const results = await chrome.bookmarks.search(e.target.value);
    render(results, document.getElementById("root"));
  });
});

function render(nodes, container) {
  container.innerHTML = "";
  nodes.forEach(node => {
    const div = document.createElement("div");
    if (node.url) div.innerHTML = `<a href="${node.url}">${node.title}</a>`;
    else {
      div.innerHTML = `<strong>📁 ${node.title}</strong>`;
      if (node.children) {
        const child = document.createElement("div");
        child.style.paddingLeft = "20px";
        render(node.children, child);
        div.appendChild(child);
      }
    }
    container.appendChild(div);
  });
}
```

### Organize by Domain
```javascript
async function organizeByDomain() {
  const all = await chrome.bookmarks.search({});
  const byDomain = {};
  all.forEach(bm => {
    if (!bm.url) return;
    try { (byDomain[new URL(bm.url).hostname] ||= []).push(bm); } catch (e) {}
  });
  for (const [domain, bms] of Object.entries(byDomain)) {
    if (bms.length < 2) continue;
    const folder = await chrome.bookmarks.create({ title: domain });
    for (const bm of bms) if (bm.parentId !== folder.id) await chrome.bookmarks.move(bm.id, { parentId: folder.id });
  }
}
```

## Best Practices

When implementing bookmark functionality in your extension:

1. **Request permissions sparingly**: Only request the bookmarks permission when needed, and explain why in your extension's store listing.

2. **Cache bookmark data**: For frequent access, consider caching bookmark data locally and updating via event listeners rather than querying the API repeatedly.

3. **Handle missing bookmarks gracefully**: Users may delete bookmarks while your extension is running—always check if a bookmark still exists before attempting operations.

4. **Use meaningful folder organization**: Create dedicated folders for your extension's bookmarks to avoid cluttering the user's main bookmark folders.

5. **Provide undo functionality**: Before deleting bookmarks, store the bookmark data so users can restore accidentally deleted items.

## Conclusion

The Chrome Bookmarks API provides a complete solution for building bookmark management features in your Chrome extension. From simple bookmark creation to complex hierarchical organization and import/export functionality, this API enables rich bookmark-related experiences. Remember to test thoroughly with real user data and handle edge cases like deleted bookmarks gracefully.
- Handle async operations properly (callbacks/promises)
- Use getChildren instead of getTree for specific folders
- Implement event listeners to keep UI in sync
- Consider performance with large bookmark collections

## Common Mistakes
- Not requesting "bookmarks" permission
- Using synchronous calls (all methods are async)
- Not checking for `url` property (folder vs bookmark)
- Using `remove` instead of `removeTree` for folders

## Reference
- Official Docs: https://developer.chrome.com/docs/extensions/reference/api/bookmarks
