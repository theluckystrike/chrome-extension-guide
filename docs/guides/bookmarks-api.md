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
