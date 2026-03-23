---
layout: default
title: "Chrome Extension Reading List API. How to Add and Manage Reading List Items"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/reading-list-api/"
---
# Reading List API Guide

Overview {#overview}
- Requires `"readingList"` permission (cross-ref `docs/permissions/readingList.md`)
- Allows extensions to add, query, and remove items from Chrome's Reading List
- Reading List is a cross-device feature that syncs via the user's Google account
- Available in Chrome 120+ and Manifest V3

The Reading List API provides programmatic access to Chrome's built-in "Read Later" functionality. This feature, accessible via the browser's sidebar or bookmarking UI, allows users to save web pages for offline or later reading. Extensions can use this API to create powerful reading list managers, content curation tools, or integrations with third-party services.

Permission {#permission}
Add the `"readingList"` permission to your `manifest.json`:

```json
{
  "permissions": [
    "readingList"
  ]
}
```

The Reading List API does not require host permissions for the URLs you're adding, you can add any URL to the reading list without explicit host match patterns.

Adding Entries {#adding-entries}
Use `chrome.readingList.add()` to save a new item to the reading list:

```javascript
// Add a page to the reading list
chrome.readingList.add({
  title: 'Chrome Extensions Documentation',
  url: 'https://developer.chrome.com/docs/extensions/',
  hasBeenRead: false
}, () => {
  if (chrome.runtime.lastError) {
    console.error('Failed to add:', chrome.runtime.lastError.message);
  } else {
    console.log('Added to reading list');
  }
});
```

The `add()` method accepts an object with the following properties:
- `title` (string): The display title for the item
- `url` (string): The URL of the page to save
- `hasBeenRead` (boolean): Whether the item should be marked as read (default: false)
- `creationTime` (optional number): Unix timestamp for when the item was created

Querying Entries {#querying-entries}
Use `chrome.readingList.query()` to retrieve items from the reading list:

```javascript
// Query all unread items
chrome.readingList.query({
  hasBeenRead: false
}, (items) => {
  items.forEach(item => {
    console.log(`${item.title} - ${item.url}`);
  });
});

// Query with multiple criteria
chrome.readingList.query({
  title: 'Chrome',        // Filter by title (partial match)
  hasBeenRead: false
}, (items) => {
  console.log(`Found ${items.length} unread items matching "Chrome"`);
});
```

The `query()` method accepts an object with optional properties:
- `title` (string): Filter by title (case-insensitive partial match)
- `url` (string): Filter by URL
- `hasBeenRead` (boolean): Filter by read status

Removing Entries {#removing-entries}
Use `chrome.readingList.remove()` to delete an item:

```javascript
// Remove a specific URL
chrome.readingList.remove({
  url: 'https://developer.chrome.com/docs/extensions/'
}, () => {
  console.log('Removed from reading list');
});

// Remove all unread items
chrome.readingList.query({ hasBeenRead: false }, (items) => {
  items.forEach(item => {
    chrome.readingList.remove({ url: item.url });
  });
});
```

Updating Entries {#updating-entries}
Use `chrome.readingList.update()` to modify an existing item:

```javascript
// Mark an item as read
chrome.readingList.update({
  url: 'https://developer.chrome.com/docs/extensions/',
  hasBeenRead: true
}, () => {
  console.log('Marked as read');
});

// Update the title
chrome.readingList.update({
  url: 'https://developer.chrome.com/docs/extensions/',
  title: 'Updated Title'
}, () => {
  console.log('Title updated');
});
```

The `update()` method allows changing `title`, `hasBeenRead`, and `url` properties.

Use Cases {#use-cases}

Save on Command
Create a keyboard shortcut to quickly save the current tab:

```javascript
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-to-reading-list') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.readingList.add({
      title: tab.title,
      url: tab.url,
      hasBeenRead: false
    });
  }
});
```

Reading List Manager
Build a popup UI that displays all reading list items:

```javascript
// Get all items for display
chrome.readingList.query({}, (items) => {
  const unread = items.filter(i => !i.hasBeenRead);
  const read = items.filter(i => i.hasBeenRead);
  
  unread.forEach(item => {
    // Render in popup UI
  });
});
```

Content Curation
Integrate with external services to automatically save articles:

```javascript
// Save articles matching certain criteria
function saveToReadingList(article) {
  if (isTechnicalArticle(article)) {
    chrome.readingList.add({
      title: article.title,
      url: article.url,
      hasBeenRead: false
    });
  }
}
```

Limitations and Considerations {#limitations}

1. Sync Behavior: Reading List items sync across the user's devices via their Google account. Changes made by your extension will appear on all devices.

2. Privacy Trust: Users must trust extensions with reading list access, as it reveals their saved content.

3. No Bulk Operations: Each add, update, or remove operation is individual. For bulk operations, implement proper error handling and consider rate limiting.

4. URL Validation: The API requires valid URLs. Invalid URLs will result in an error.

5. Manifest V3 Only: This API is only available in Manifest V3 extensions, not V2.
