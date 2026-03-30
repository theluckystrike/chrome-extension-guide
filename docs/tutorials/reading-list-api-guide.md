---
layout: default
title: "Chrome Reading List API for Extensions. Developer Guide"
description: "A comprehensive guide to using the chrome.readingList API in Chrome extensions. Learn to add, remove, query, and update reading list entries with code examples."
canonical_url: "https://bestchromeextensions.com/tutorials/reading-list-api-guide/"
last_modified_at: 2026-01-15
---

Chrome Reading List API for Extensions

Overview {#overview}

The Chrome Reading List API (`chrome.readingList`) allows extensions to interact with Chrome's built-in Reading List feature. This API enables users to save web pages for later reading, similar to bookmarks but with a focus on content consumption workflow. The Reading List is synchronized across devices via the user's Google account, making it a powerful way to save content for later consumption across desktop and mobile.

This API is particularly useful for building extensions that help users curate content, research topics, or save articles for offline reading. Unlike custom storage solutions, entries in the Reading List automatically sync across all devices where the user is signed in to Chrome.

Prerequisites {#prerequisites}

Before using the Reading List API, add the `"readingList"` permission to your `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My Reading List Extension",
  "version": "1.0",
  "permissions": ["readingList"]
}
```

Important Notes:
- The Reading List API requires Manifest V3
- The API is only available in Chrome 120+
- Entries sync automatically when the user is signed into Chrome
- No additional storage permissions are required for basic operations

Understanding Reading List Entries {#understanding-entries}

Each Reading List entry is represented by a `ReadingListItem` with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for the entry |
| `title` | string | Display title of the entry |
| `url` | string | URL of the saved page |
| `hasUrl` | boolean | Whether the URL is valid |
| `displayUrl` | string | URL formatted for display |
| `dateAdded` | number | Unix timestamp when added |
| `dateLastVisited` | number | Unix timestamp of last visit |
| `isRead` | boolean | Whether the item has been read |
| `isDeleted` | boolean | Whether the item has been removed |
| `excerpt` | string | Auto-generated page excerpt |

Adding Entries {#adding-entries}

Add Current Page to Reading List

```javascript
// Add the current tab to the reading list
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const result = await chrome.readingList.add({
      title: tab.title,
      url: tab.url
    });
    console.log("Added to reading list:", result);
  } catch (error) {
    console.error("Failed to add:", error);
  }
});
```

Add Entry with Custom Title

```javascript
// Add with a custom title
chrome.readingList.add({
  title: "My Custom Article Title",
  url: "https://example.com/article"
}).then(result => {
  console.log("Entry added with ID:", result.id);
}).catch(error => {
  console.error("Error adding entry:", error);
});
```

Check Before Adding

```javascript
// Check if URL already exists in reading list
async function addIfNotExists(title, url) {
  const existing = await chrome.readingList.query({ url });
  
  if (existing.length > 0) {
    console.log("Already in reading list:", existing[0].id);
    return existing[0];
  }
  
  return await chrome.readingList.add({ title, url });
}

// Usage
addIfNotExists("New Article", "https://example.com/new")
  .then(entry => console.log("Entry:", entry));
```

Querying the Reading List {#querying}

Get All Entries

```javascript
// Get all reading list entries
chrome.readingList.query({}).then(items => {
  console.log("Total items:", items.length);
  items.forEach(item => {
    console.log(`${item.title} - ${item.isRead ? 'Read' : 'Unread'}`);
  });
});
```

Filter by Read Status

```javascript
// Get only unread items
chrome.readingList.query({ isRead: false }).then(unreadItems => {
  console.log("Unread count:", unreadItems.length);
});

// Get only read items
chrome.readingList.query({ isRead: true }).then(readItems => {
  console.log("Read count:", readItems.length);
});
```

Search by Title or URL

```javascript
// Search for items matching a query
chrome.readingList.query({
  title: "tutorial"
}).then(items => {
  console.log("Found items:", items);
});

// Search by URL
chrome.readingList.query({
  url: "https://example.com"
}).then(items => {
  console.log("Matching items:", items);
});
```

Advanced Query Example

```javascript
// Get unread items, sorted by date added
async function getUnreadItems() {
  const items = await chrome.readingList.query({ isRead: false });
  
  return items.sort((a, b) => b.dateAdded - a.dateAdded);
}

// Get recently visited items
async function getRecentlyVisited(limit = 10) {
  const items = await chrome.readingList.query({});
  
  return items
    .filter(item => item.dateLastVisited > 0)
    .sort((a, b) => b.dateLastVisited - a.dateLastVisited)
    .slice(0, limit);
}
```

Updating Entries {#updating-entries}

Mark as Read or Unread

```javascript
// Mark an item as read
chrome.readingList.update("entry-id", {
  isRead: true
}).then(result => {
  console.log("Marked as read:", result.isRead);
});

// Mark an item as unread
chrome.readingList.update("entry-id", {
  isRead: false
}).then(result => {
  console.log("Marked as unread:", result.isRead);
});
```

Update Title

```javascript
// Update the title of an entry
chrome.readingList.update("entry-id", {
  title: "Updated Title"
}).then(result => {
  console.log("New title:", result.title);
});
```

Toggle Read Status

```javascript
// Toggle read status
async function toggleReadStatus(entryId) {
  const items = await chrome.readingList.query({});
  const entry = items.find(item => item.id === entryId);
  
  if (entry) {
    await chrome.readingList.update(entryId, {
      isRead: !entry.isRead
    });
  }
}
```

Removing Entries {#removing-entries}

Remove a Single Entry

```javascript
// Remove an entry by ID
chrome.readingList.remove("entry-id").then(() => {
  console.log("Entry removed");
});
```

Remove Multiple Entries

```javascript
// Remove multiple entries
async function removeMultiple(ids) {
  for (const id of ids) {
    await chrome.readingList.remove(id);
  }
}

// Usage
removeMultiple(["id1", "id2", "id3"])
  .then(() => console.log("All removed"));
```

Clear All Read Items

```javascript
// Remove all items marked as read
async function clearReadItems() {
  const readItems = await chrome.readingList.query({ isRead: true });
  
  for (const item of readItems) {
    await chrome.readingList.remove(item.id);
  }
  
  console.log(`Cleared ${readItems.length} read items`);
}
```

Clear All Entries

```javascript
// Clear the entire reading list
async function clearAll() {
  const allItems = await chrome.readingList.query({});
  
  for (const item of allItems) {
    await chrome.readingList.remove(item.id);
  }
  
  console.log("Reading list cleared");
}
```

Reading List Events {#events}

Listen for changes to keep your extension in sync with the reading list.

Listen for Entry Added

```javascript
chrome.readingList.onEntryAdded.addListener((entry) => {
  console.log("Entry added:", entry.title);
  // Update UI or badge
});
```

Listen for Entry Removed

```javascript
chrome.readingList.onEntryRemoved.addListener((entry) => {
  console.log("Entry removed:", entry.title);
  // Update UI or storage
});
```

Listen for Entry Updated

```javascript
chrome.readingList.onEntryUpdated.addListener((entry) => {
  console.log("Entry updated:", entry);
  console.log("Read status:", entry.isRead);
  // Update UI to reflect changes
});
```

Complete Event Handler

```javascript
// background.js - Complete event handling
chrome.readingList.onEntryAdded.addListener((entry) => {
  console.log(` Added: "${entry.title}"`);
  updateBadgeCount();
});

chrome.readingList.onEntryRemoved.addListener((entry) => {
  console.log(` Removed: "${entry.title}"`);
  updateBadgeCount();
});

chrome.readingList.onEntryUpdated.addListener((entry) => {
  console.log(` Updated: "${entry.title}" - Read: ${entry.isRead}`);
  updateBadgeCount();
});

async function updateBadgeCount() {
  const unreadItems = await chrome.readingList.query({ isRead: false });
  const count = unreadItems.length;
  
  chrome.action.setBadgeText({ 
    text: count > 0 ? String(count) : "" 
  });
  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
}
```

Use Cases {#use-cases}

Save for Later Extension

Build an extension that lets users quickly save pages to their reading list with a single click:

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.readingList.add({
    title: tab.title,
    url: tab.url
  });
  
  chrome.notifications.create({
    type: "basic",
    title: "Saved to Reading List",
    message: `"${tab.title}" has been saved for later.`,
    iconUrl: "icon.png"
  });
});
```

```json
// manifest.json
{
  "manifest_version": 3,
  "name": "Save to Reading List",
  "version": "1.0",
  "permissions": ["readingList", "notifications"],
  "action": {},
  "background": { "service_worker": "background.js" }
}
```

Research Tools

Create a research assistant that tracks articles for later review:

```javascript
// Track research materials
async function addResearchMaterial(url, title, tags) {
  const entry = await chrome.readingList.add({
    title: `[${tags.join(', ')}] ${title}`,
    url: url
  });
  
  // Store additional metadata in chrome.storage
  await chrome.storage.local.set({
    [entry.id]: { tags, notes: '', researchArea: tags[0] }
  });
  
  return entry;
}

// Get research materials by tag
async function getResearchByTag(tag) {
  const items = await chrome.readingList.query({});
  
  return items.filter(item => 
    item.title.toLowerCase().includes(tag.toLowerCase())
  );
}
```

Content Curation

Build a content curation tool for collecting and organizing articles:

```javascript
// Content curation service
class ReadingListCuration {
  constructor() {
    this.collections = new Map();
  }
  
  async addToCollection(collectionName, url, title) {
    // Add to reading list with collection prefix
    const entry = await chrome.readingList.add({
      title: `[${collectionName}] ${title}`,
      url: url
    });
    
    // Track in local storage
    this.collections.set(entry.id, { collection: collectionName });
    await this.saveCollections();
    
    return entry;
  }
  
  async getByCollection(collectionName) {
    const items = await chrome.readingList.query({});
    
    return items.filter(item => 
      item.title.startsWith(`[${collectionName}]`)
    );
  }
  
  async saveCollections() {
    await chrome.storage.local.set({
      collections: Object.fromEntries(this.collections)
    });
  }
}

const curator = new ReadingListCuration();
```

Complete Service Example {#complete-example}

Here's a complete service class that wraps the Reading List API with promise-based methods:

```javascript
// readingListService.js
class ReadingListService {
  constructor() {
    this.cache = new Map();
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    chrome.readingList.onEntryAdded.addListener((entry) => {
      this.cache.set(entry.id, entry);
    });
    
    chrome.readingList.onEntryRemoved.addListener((entry) => {
      this.cache.delete(entry.id);
    });
    
    chrome.readingList.onEntryUpdated.addListener((entry) => {
      this.cache.set(entry.id, entry);
    });
  }
  
  async add(title, url) {
    return await chrome.readingList.add({ title, url });
  }
  
  async remove(id) {
    return await chrome.readingList.remove(id);
  }
  
  async update(id, changes) {
    return await chrome.readingList.update(id, changes);
  }
  
  async query(options = {}) {
    return await chrome.readingList.query(options);
  }
  
  async getAll() {
    return await this.query({});
  }
  
  async getUnread() {
    return await this.query({ isRead: false });
  }
  
  async getRead() {
    return await this.query({ isRead: true });
  }
  
  async markAsRead(id) {
    return await this.update(id, { isRead: true });
  }
  
  async markAsUnread(id) {
    return await this.update(id, { isRead: false });
  }
  
  async toggleRead(id) {
    const items = await this.getAll();
    const entry = items.find(item => item.id === id);
    
    if (entry) {
      return await this.update(id, { isRead: !entry.isRead });
    }
  }
  
  async exists(url) {
    const items = await this.query({ url });
    return items.length > 0;
  }
  
  async addIfNotExists(title, url) {
    const existing = await this.query({ url });
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    return await this.add(title, url);
  }
  
  async getUnreadCount() {
    const unread = await this.getUnread();
    return unread.length;
  }
  
  async clearRead() {
    const readItems = await this.getRead();
    
    for (const item of readItems) {
      await this.remove(item.id);
    }
    
    return readItems.length;
  }
}

// Export for use in extension
window.ReadingListService = ReadingListService;
```

Using the Service

```javascript
const readingList = new ReadingListService();

// Get unread count and update badge
readingList.getUnreadCount().then(count => {
  chrome.action.setBadgeText({ text: String(count) });
  chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
});

// Add current page
chrome.action.onClicked.addListener(async (tab) => {
  await readingList.addIfNotExists(tab.title, tab.url);
});

// Toggle read status on click
async function handleItemClick(entryId) {
  await readingList.toggleRead(entryId);
  const count = await readingList.getUnreadCount();
  chrome.action.setBadgeText({ text: String(count) });
}
```

Related Articles {#related-articles}

- [Build a Reading List Extension](/tutorials/build-reading-list/). Build a complete reading list extension with side panel, sync storage, and notifications
- [Bookmarks API Guide](/tutorials/bookmarks-api-guide/). Learn how to use the Chrome Bookmarks API for persistent link storage
- [History API Guide](/tutorials/history-api-guide/). Explore the browsing history API for tracking and searching visited pages

---

Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).
