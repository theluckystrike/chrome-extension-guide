---
layout: default
title: "Working with Bookmarks in Chrome Extensions. Developer Guide"
description: "A comprehensive tutorial on using the Chrome Bookmarks API in extensions. Learn to create, read, update, delete bookmarks, organize folders, and handle bookmark events."
canonical_url: "https://bestchromeextensions.com/tutorials/bookmarks-api-guide/"
last_modified_at: 2026-01-15
---

Working with Bookmarks in Chrome Extensions

Overview {#overview}

The Chrome Bookmarks API (`chrome.bookmarks`) is one of the most powerful extension APIs available, allowing you to create, read, update, and delete bookmarks programmatically. Whether you're building a bookmark manager, a bookmark importer, or integrating bookmark functionality into your extension, this guide covers everything you need to know.

Prerequisites {#prerequisites}

Before using the Bookmarks API, add the `"bookmarks"` permission to your `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My Bookmark Extension",
  "version": "1.0",
  "permissions": ["bookmarks"]
}
```

The bookmarks permission grants access to all bookmarks. You cannot restrict access to specific folders.

Understanding the Bookmark Tree Structure {#bookmark-tree-structure}

The Chrome Bookmarks API organizes bookmarks in a hierarchical tree structure. Each node is a `BookmarkTreeNode` with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for the node |
| `parentId` | string | ID of parent folder (null for root) |
| `title` | string | Display title |
| `url` | string | URL of the bookmark (undefined for folders) |
| `index` | number | Position within parent's children |
| `dateAdded` | number | Unix timestamp when created |
| `dateGroupModified` | number | Unix timestamp of last modification |
| `children` | array | Child nodes (only when retrieving subtrees) |

The tree root contains three default folders:
1. Bookmarks Bar (typically ID "1")
2. Other Bookmarks (typically ID "2")
3. Mobile Bookmarks (typically ID "3")

Reading Bookmarks {#reading-bookmarks}

Get the Entire Tree

```javascript
chrome.bookmarks.getTree((tree) => {
  const root = tree[0];
  const bookmarksBar = root.children[0];
  const otherBookmarks = root.children[1];
  
  console.log("Bookmarks Bar:", bookmarksBar.title);
  console.log("Children:", bookmarksBar.children);
});
```

Get Recent Bookmarks

```javascript
// Get the 10 most recently added bookmarks
chrome.bookmarks.getRecent(10, (results) => {
  results.forEach(bookmark => {
    console.log(`${bookmark.title}: ${bookmark.url}`);
  });
});
```

Get a Specific Bookmark

```javascript
// Get bookmarks by ID
chrome.bookmarks.get("12345", (results) => {
  if (results.length > 0) {
    console.log("Found:", results[0]);
  }
});

// Get multiple bookmarks by ID
chrome.bookmarks.get(["12345", "67890"], (results) => {
  console.log("Found bookmarks:", results);
});
```

Searching Bookmarks {#searching-bookmarks}

Simple Text Search

```javascript
// Search by title or URL
chrome.bookmarks.search("tutorial", (results) => {
  results.forEach(b => console.log(b.title, b.url));
});
```

Search with Query Object

```javascript
// Search by URL
chrome.bookmarks.search({ url: "https://developer.chrome.com" }, (results) => {
  console.log("URL matches:", results);
});

// Search by title
chrome.bookmarks.search({ title: "My Bookmark" }, (results) => {
  console.log("Title matches:", results);
});

// Search multiple criteria
chrome.bookmarks.search({ url: "https://example.com" }, (results) => {
  results.forEach(b => console.log(b));
});
```

Practical Search Example

```javascript
function findDuplicates() {
  const urlMap = new Map();
  
  chrome.bookmarks.getTree((tree) => {
    function traverse(nodes) {
      nodes.forEach(node => {
        if (node.url) {
          if (urlMap.has(node.url)) {
            console.log(`Duplicate: "${node.title}" and "${urlMap.get(node.url)}"`);
          } else {
            urlMap.set(node.url, node.title);
          }
        }
        if (node.children) {
          traverse(node.children);
        }
      });
    }
    traverse(tree);
  });
}
```

Creating Bookmarks {#creating-bookmarks}

Create a Simple Bookmark

```javascript
// Create a bookmark in the bookmarks bar
chrome.bookmarks.create({
  parentId: "1",  // Bookmarks Bar ID
  title: "Chrome Extensions Docs",
  url: "https://developer.chrome.com/docs/extensions/"
}, (newBookmark) => {
  console.log("Created bookmark with ID:", newBookmark.id);
});
```

Create a Folder

```javascript
// Create a new folder
chrome.bookmarks.create({
  parentId: "1",
  title: "Work Resources"
}, (newFolder) => {
  console.log("Created folder with ID:", newFolder.id);
});
```

Create Nested Structure

```javascript
// Create a folder with subfolders
function createProjectStructure() {
  // First, create the main folder
  chrome.bookmarks.create({
    parentId: "1",
    title: "My Projects"
  }, (projectsFolder) => {
    // Then create subfolders
    chrome.bookmarks.create({
      parentId: projectsFolder.id,
      title: "In Progress"
    }, () => {
      chrome.bookmarks.create({
        parentId: projectsFolder.id,
        title: "Completed"
      }, () => {
        console.log("Project structure created!");
      });
    });
  });
}
```

Create Bookmark with Callbacks Using Promises

```javascript
// Wrap callbacks in promises for cleaner async/await
const bookmarksAPI = {
  create: (props) => new Promise((resolve) => {
    chrome.bookmarks.create(props, resolve);
  }),
  
  getTree: () => new Promise((resolve) => {
    chrome.bookmarks.getTree(resolve);
  }),
  
  search: (query) => new Promise((resolve) => {
    chrome.bookmarks.search(query, resolve);
  })
};

// Usage with async/await
async function addProjectBookmark() {
  const projects = await bookmarksAPI.search({ title: "My Projects" });
  const parentId = projects[0]?.id || "1";
  
  const bookmark = await bookmarksAPI.create({
    parentId,
    title: "New Project",
    url: "https://example.com"
  });
  
  console.log("Created:", bookmark);
}
```

Updating Bookmarks {#updating-bookmarks}

Update Bookmark Title and URL

```javascript
// Update a bookmark's title
chrome.bookmarks.update("12345", { title: "New Title" }, (result) => {
  console.log("Updated:", result);
});

// Update URL
chrome.bookmarks.update("12345", { url: "https://new-url.com" }, (result) => {
  console.log("URL updated:", result);
});

// Update both
chrome.bookmarks.update("12345", {
  title: "Updated Title",
  url: "https://updated-url.com"
}, (result) => {
  console.log("Bookmark updated:", result);
});
```

Move Bookmark to Different Folder

```javascript
// Move a bookmark to a different folder
chrome.bookmarks.move("12345", { parentId: "2" }, (result) => {
  console.log("Moved to Other Bookmarks");
});

// Move and change position
chrome.bookmarks.move("12345", { parentId: "2", index: 0 }, (result) => {
  console.log("Moved to first position in Other Bookmarks");
});
```

Reorder Bookmarks in a Folder

```javascript
// Get current bookmarks and reorder
function reorderBookmarks(parentId, newOrder) {
  newOrder.forEach((bookmarkId, index) => {
    chrome.bookmarks.move(bookmarkId, { parentId, index });
  });
}
```

Deleting Bookmarks {#deleting-bookmarks}

Delete a Single Bookmark

```javascript
// Delete by ID
chrome.bookmarks.remove("12345", () => {
  console.log("Bookmark deleted");
});
```

Delete a Folder (and all contents)

```javascript
// Remove a folder and all its children
chrome.bookmarks.removeTree("67890", () => {
  console.log("Folder and contents deleted");
});
```

Delete Multiple Bookmarks

```javascript
// Delete multiple bookmarks
const idsToDelete = ["12345", "67890", "11111"];
idsToDelete.forEach(id => {
  chrome.bookmarks.remove(id);
});
```

Safe Delete with Confirmation

```javascript
function safeDeleteBookmark(id) {
  chrome.bookmarks.get(id, (results) => {
    if (results.length === 0) {
      console.log("Bookmark not found");
      return;
    }
    
    const bookmark = results[0];
    const isFolder = !bookmark.url;
    
    if (confirm(`Delete "${bookmark.title}"?`)) {
      if (isFolder) {
        chrome.bookmarks.removeTree(id, () => console.log("Folder deleted"));
      } else {
        chrome.bookmarks.remove(id, () => console.log("Bookmark deleted"));
      }
    }
  });
}
```

Bookmark Events {#bookmark-events}

Listen for changes to keep your extension in sync.

Listen for Bookmark Creation

```javascript
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log(`New bookmark created: "${bookmark.title}"`);
  console.log("ID:", id);
  console.log("URL:", bookmark.url);
});
```

Listen for Bookmark Deletion

```javascript
chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log(`Bookmark removed: "${removeInfo.node.title}"`);
  console.log("Parent ID:", removeInfo.parentId);
  console.log("Was folder:", !removeInfo.node.url);
});
```

Listen for Bookmark Updates

```javascript
chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log(`Bookmark ${id} changed:`);
  console.log("New title:", changeInfo.title);
  console.log("New URL:", changeInfo.url);
});
```

Listen for Bookmark Moves

```javascript
chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log(`Bookmark moved from ${moveInfo.parentId} to ${moveInfo.index}`);
});
```

Listen for Folder Reorganization

```javascript
chrome.bookmarks.onChildrenReordered.addListener((id, reorderInfo) => {
  console.log(`Folder ${id} children reordered:`, reorderInfo.childIds);
});
```

Complete Event Handler Example

```javascript
// background.js - Handle all bookmark events
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log("Created:", bookmark.title);
  // Update your UI or storage
});

chrome.bookmarks.onRemoved.addListener((id, info) => {
  console.log("Removed:", info.node.title);
  // Remove from your UI or storage
});

chrome.bookmarks.onChanged.addListener((id, info) => {
  console.log("Changed:", info.title || info.url);
  // Update your UI or storage
});

chrome.bookmarks.onMoved.addListener((id, info) => {
  console.log("Moved to folder:", info.parentId);
  // Reorder in your UI
});

chrome.bookmarks.onChildrenReordered.addListener((id, info) => {
  console.log("Reordered children in folder:", id);
  // Update display order
});
```

Organizing Folders {#organizing-folders}

Create Nested Folder Structure

```javascript
function createNestedFolders(parentId, path) {
  const [current, ...rest] = path;
  
  return new Promise((resolve) => {
    chrome.bookmarks.create({ parentId, title: current }, (folder) => {
      if (rest.length === 0) {
        resolve(folder);
      } else {
        createNestedFolders(folder.id, rest).then(resolve);
      }
    });
  });
}

// Usage: Create "Work/Projects/2024/Q1"
createNestedFolders("1", ["Work", "Projects", "2024", "Q1"])
  .then(folder => console.log("Created nested structure at:", folder.id));
```

Flatten Nested Structure

```javascript
function flattenFolder(folderId) {
  chrome.bookmarks.getChildren(folderId, (children) => {
    children.forEach(child => {
      if (child.children) {
        // It's a folder, recurse
        flattenFolder(child.id);
      } else if (child.url) {
        // Move bookmark to parent
        chrome.bookmarks.move(child.id, { parentId: folderId }, () => {
          console.log("Moved:", child.title);
        });
      }
    });
  });
}
```

Sort Folder Contents

```javascript
function sortFolderByTitle(folderId) {
  chrome.bookmarks.getChildren(folderId, (children) => {
    const bookmarks = children.filter(c => c.url);
    const folders = children.filter(c => c.children);
    
    // Sort bookmarks alphabetically
    bookmarks.sort((a, b) => a.title.localeCompare(b.title));
    
    // Put folders first, then bookmarks
    const sorted = [...folders, ...bookmarks];
    
    sorted.forEach((item, index) => {
      chrome.bookmarks.move(item.id, { parentId: folderId, index });
    });
  });
}
```

Import/Export Patterns {#import-export-patterns}

Export Bookmarks to JSON

```javascript
function exportBookmarks() {
  chrome.bookmarks.getTree((tree) => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      bookmarks: tree[0]
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json"
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookmarks-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
```

Import Bookmarks from JSON

```javascript
function importBookmarks(jsonData) {
  const data = JSON.parse(jsonData);
  const imported = data.bookmarks;
  
  function importNode(node, parentId) {
    return new Promise((resolve) => {
      const options = {
        parentId,
        title: node.title
      };
      
      if (node.url) {
        // It's a bookmark
        options.url = node.url;
      }
      
      chrome.bookmarks.create(options, (created) => {
        if (node.children && node.children.length > 0) {
          const promises = node.children.map(child => 
            importNode(child, created.id)
          );
          Promise.all(promises).then(resolve);
        } else {
          resolve(created);
        }
      });
    });
  }
  
  return importNode(imported, "2"); // Import to Other Bookmarks
}

// Handle file input
document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    importBookmarks(event.target.result)
      .then(() => console.log("Import complete!"))
      .catch(err => console.error("Import failed:", err));
  };
  reader.readAsText(file);
});
```

Import from HTML Bookmark Export

```javascript
function importFromHTML(htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const links = doc.querySelectorAll("a");
  
  let promise = Promise.resolve("1"); // Start at bookmarks bar
  
  links.forEach(link => {
    const href = link.getAttribute("href");
    const title = link.textContent;
    
    if (href && href.startsWith("http")) {
      promise = promise.then(parentId => {
        return new Promise(resolve => {
          chrome.bookmarks.create({ parentId, title, url: href }, () => {
            resolve(parentId);
          });
        });
      });
    }
  });
  
  return promise;
}
```

Bookmark Bar Interaction {#bookmark-bar-interaction}

Add Button to Bookmark Bar

```javascript
// In manifest.json
{
  "action": {
    "default_icon": "icon.png",
    "default_title": "Save to My App"
  }
}

// In background.js
chrome.action.onClicked.addListener((tab) => {
  // Get current page info and create bookmark
  chrome.bookmarks.create({
    parentId: "1",
    title: tab.title,
    url: tab.url
  }, (bookmark) => {
    console.log("Bookmarked:", bookmark.title);
  });
});
```

Context Menu for Bookmarks

```javascript
// Create context menu for bookmarks
chrome.contextMenus.create({
  id: "addToMyApp",
  title: "Add to My Bookmark App",
  contexts: ["bookmark"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToMyApp") {
    // Get bookmark details and add tags or move to specific folder
    chrome.bookmarks.get(info.bookmarkId, (results) => {
      const bookmark = results[0];
      console.log("Adding:", bookmark.title);
      // Your custom logic here
    });
  }
});
```

Check if Bookmark Exists

```javascript
function isBookmarked(url) {
  return new Promise((resolve) => {
    chrome.bookmarks.search({ url }, (results) => {
      resolve(results.length > 0);
    });
  });
}

// Usage
isBookmarked("https://example.com").then(isBookmarked => {
  if (isBookmarked) {
    console.log("This page is bookmarked!");
  }
});
```

Get All Bookmarks from Bar

```javascript
function getBookmarksBarBookmarks() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      const bookmarksBar = tree[0].children[0];
      resolve(bookmarksBar.children || []);
    });
  });
}
```

Complete Example: Bookmark Manager Service {#complete-example}

Here's a complete service class that wraps the Bookmarks API:

```javascript
// bookmarksService.js
class BookmarksService {
  constructor() {
    this.cache = null;
    this.listeners = new Set();
    
    // Set up event listeners
    this.setupListeners();
  }
  
  setupListeners() {
    chrome.bookmarks.onCreated.addListener((id, bookmark) => {
      this.invalidateCache();
      this.notifyListeners("created", { id, bookmark });
    });
    
    chrome.bookmarks.onRemoved.addListener((id, info) => {
      this.invalidateCache();
      this.notifyListeners("removed", { id, info });
    });
    
    chrome.bookmarks.onChanged.addListener((id, info) => {
      this.invalidateCache();
      this.notifyListeners("changed", { id, info });
    });
    
    chrome.bookmarks.onMoved.addListener((id, info) => {
      this.invalidateCache();
      this.notifyListeners("moved", { id, info });
    });
  }
  
  invalidateCache() {
    this.cache = null;
  }
  
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  notifyListeners(event, data) {
    this.listeners.forEach(cb => cb(event, data));
  }
  
  async getTree() {
    if (this.cache) return this.cache;
    return new Promise(resolve => {
      chrome.bookmarks.getTree(tree => {
        this.cache = tree;
        resolve(tree);
      });
    });
  }
  
  async search(query) {
    return new Promise(resolve => {
      chrome.bookmarks.search(query, resolve);
    });
  }
  
  async create(props) {
    return new Promise(resolve => {
      chrome.bookmarks.create(props, resolve);
    });
  }
  
  async update(id, props) {
    return new Promise(resolve => {
      chrome.bookmarks.update(id, props, resolve);
    });
  }
  
  async move(id, destination) {
    return new Promise(resolve => {
      chrome.bookmarks.move(id, destination, resolve);
    });
  }
  
  async remove(id) {
    return new Promise(resolve => {
      chrome.bookmarks.remove(id, resolve);
    });
  }
  
  async removeTree(id) {
    return new Promise(resolve => {
      chrome.bookmarks.removeTree(id, resolve);
    });
  }
  
  async getFolderContents(folderId) {
    return new Promise(resolve => {
      chrome.bookmarks.getChildren(folderId, resolve);
    });
  }
}

// Usage
const bookmarks = new BookmarksService();

// Subscribe to changes
const unsubscribe = bookmarks.subscribe((event, data) => {
  console.log("Bookmark event:", event, data);
});

// Search bookmarks
bookmarks.search("tutorial").then(results => {
  console.log("Found:", results);
});

// Create a bookmark
bookmarks.create({
  parentId: "1",
  title: "My Extension",
  url: "https://example.com"
}).then(bookmark => {
  console.log("Created:", bookmark.id);
});
```

Related Articles {#related-articles}

- [Build a Bookmark Manager Extension](/tutorials/build-bookmark-manager/). Build a complete bookmark manager with search, folder navigation, and duplicate detection
- [Build a Bookmark Sorter Extension](/tutorials/build-bookmark-sorter/). Automatically organize bookmarks by domain, date, or custom rules
- [Chrome Bookmarks API Reference](/guides/bookmarks-api/). Complete API reference with all methods and events

---

Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).
