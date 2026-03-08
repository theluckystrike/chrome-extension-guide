---
layout: default
title: "Chrome Extension Bookmark Sorter — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-bookmark-sorter/"
---
# Build a Bookmark Sorter Extension

## What You'll Build {#what-youll-build}
A popup-based bookmark sorter that organizes bookmarks alphabetically, by date, finds duplicates, and enables bulk operations.

## Prerequisites {#prerequisites}
- Bookmark API (cross-ref `docs/guides/bookmark-api.md`)
- Storage API for undo functionality (cross-ref `docs/guides/storage-api.md`)

## Project Structure {#project-structure}
```
bookmark-sorter/
  manifest.json
  popup/
    popup.html
    popup.css
    popup.js
  background.js
```

## Step 1: Manifest {#step-1-manifest}
```json
{
  "manifest_version": 3,
  "name": "Bookmark Sorter",
  "version": "1.0.0",
  "permissions": ["bookmarks", "storage"],
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background.js" }
}
```

## Step 2: Popup UI {#step-2-popup-ui}
```html
<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="popup.css"></head>
<body>
  <div class="toolbar">
    <button id="sort-alpha">A-Z</button>
    <button id="sort-date">By Date</button>
    <button id="sort-domain">By Domain</button>
    <button id="find-dupes">Find Duplicates</button>
    <input type="text" id="search" placeholder="Search bookmarks...">
  </div>
  <div id="bookmark-list"></div>
  <div class="status-bar">
    <span id="count">0 bookmarks</span>
    <button id="undo-btn" hidden>Undo</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

## Step 3: Reading Bookmark Tree {#step-3-reading-bookmark-tree}
```javascript
// Load all bookmarks into memory
async function loadBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const bookmarks = flattenTree(tree);
  return bookmarks.filter(b => b.url); // Only actual bookmarks
}

function flattenTree(nodes, result = []) {
  for (const node of nodes) {
    if (node.url) result.push(node);
    if (node.children) flattenTree(node.children, result);
  }
  return result;
}
```

## Step 4: Sorting Algorithms {#step-4-sorting-algorithms}
```javascript
// Sort alphabetically by title
function sortAlphabetically(bookmarks) {
  return [...bookmarks].sort((a, b) => 
    a.title.localeCompare(b.title)
  );
}

// Sort by date added (newest first)
function sortByDate(bookmarks) {
  return [...bookmarks].sort((a, b) => 
    b.dateAdded - a.dateAdded
  );
}

// Group by domain
function sortByDomain(bookmarks) {
  const grouped = {};
  for (const bm of bookmarks) {
    const domain = new URL(bm.url).hostname;
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(bm);
  }
  return Object.entries(grouped).sort((a, b) => 
    a[0].localeCompare(b[0])
  ).flatMap(([_, bms]) => bms);
}
```

## Step 5: Moving Bookmarks {#step-5-moving-bookmarks}
```javascript
// Move bookmark to new position
async function moveBookmark(bookmarkId, parentId, index) {
  await chrome.bookmarks.move(bookmarkId, {
    parentId: parentId,
    index: index
  });
}

// Reorder entire bookmark list
async function reorderBookmarks(orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    await chrome.bookmarks.move(orderedIds[i], { index: i });
  }
}
```

## Step 6: Duplicate Detection {#step-6-duplicate-detection}
```javascript
function findDuplicates(bookmarks) {
  const urlMap = new Map();
  const duplicates = [];
  
  for (const bm of bookmarks) {
    if (urlMap.has(bm.url)) {
      duplicates.push({
        original: urlMap.get(bm.url),
        duplicate: bm
      });
    } else {
      urlMap.set(bm.url, bm);
    }
  }
  return duplicates;
}

// Remove duplicate bookmarks
async function removeDuplicates(duplicates) {
  for (const { duplicate } of duplicates) {
    await chrome.bookmarks.remove(duplicate.id);
  }
}
```

## Step 7: Bulk Operations {#step-7-bulk-operations}
```javascript
// Flatten nested folders
async function flattenFolder(folderId) {
  const children = await chrome.bookmarks.getChildren(folderId);
  const parent = (await chrome.bookmarks.get(folderId))[0];
  
  for (const child of children) {
    if (child.parentId !== parent.id) {
      await chrome.bookmarks.move(child.id, {
        parentId: parent.parentId,
        index: parent.index + 1
      });
    }
  }
}

// Select multiple and delete
async function bulkDelete(ids) {
  for (const id of ids) {
    await chrome.bookmarks.removeTree(id);
  }
}
```

## Step 8: Search Functionality {#step-8-search-functionality}
```javascript
async function searchBookmarks(query) {
  if (!query) return loadBookmarks();
  
  const results = await chrome.bookmarks.search(query);
  return results.filter(r => r.url); // Filter out folders
}

// Debounced search input
let searchTimeout;
document.getElementById('search').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const results = await searchBookmarks(e.target.value);
    renderBookmarks(results);
  }, 300);
});
```

## Handling Large Collections {#handling-large-collections}
For 1000+ bookmarks, implement pagination:
```javascript
const PAGE_SIZE = 50;
let currentPage = 0;

function getPage(bookmarks, page) {
  const start = page * PAGE_SIZE;
  return bookmarks.slice(start, start + PAGE_SIZE);
}
```

## Undo Support {#undo-support}
```javascript
async function saveState(bookmarks) {
  await chrome.storage.local.set({
    lastOperation: {
      type: 'sort',
      previousIds: bookmarks.map(b => b.id),
      timestamp: Date.now()
    }
  });
}

async function undo() {
  const { lastOperation } = await chrome.storage.local.get('lastOperation');
  if (lastOperation && Date.now() - lastOperation.timestamp < 30000) {
    await reorderBookmarks(lastOperation.previousIds);
  }
}
```

## Bookmark Event Listeners {#bookmark-event-listeners}
```javascript
// background.js - Keep UI in sync
chrome.bookmarks.onCreated.addListener(updatePopup);
chrome.bookmarks.onRemoved.addListener(updatePopup);
chrome.bookmarks.onChanged.addListener(updatePopup);
chrome.bookmarks.onMoved.addListener(updatePopup);

function updatePopup() {
  chrome.runtime.sendMessage({ type: 'REFRESH' });
}
```

## Cross-References {#cross-references}
- Bookmark API: `docs/guides/bookmark-api.md`
- Storage API: `docs/guides/storage-api.md`
- Permissions: `docs/permissions/bookmarks.md`
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
