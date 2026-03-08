---
layout: default
title: "Chrome Extension Link Saver — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Link Saver Extension

## What You'll Build

In this tutorial, you'll create a Chrome extension that lets users save links with tags and notes for later reference. The extension will allow one-click saving of the current page, right-click saving of any link, and powerful organization features.

**Features:**
- Save links with tags and notes for later
- One-click save current page
- Organize by categories/tags
- Search saved links

## Manifest Configuration

First, configure the required permissions in your `manifest.json`:

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "contextMenus"
  ],
  "action": {}
}
```

For more details on these permissions, see:
- [permissions/activeTab.md](../permissions/activeTab.md)
- [permissions/contextMenus.md](../permissions/contextMenus.md)

## Step 1: Save Current Page

When the user clicks the extension icon, save the current tab's URL, title, and favicon:

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  const linkData = {
    url: tab.url,
    title: tab.title,
    favicon: tab.favIconUrl,
    dateAdded: Date.now()
  };
  
  // Extract description from meta tags
  const [{result}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const meta = document.querySelector('meta[name="description"]') 
        || document.querySelector('meta[property="og:description"]');
      return meta ? meta.content : '';
    }
  });
  
  linkData.description = result;
  
  // Save to storage
  const { links = [] } = await chrome.storage.local.get('links');
  
  // Prevent duplicates
  if (!links.find(l => l.url === linkData.url)) {
    links.unshift(linkData);
    await chrome.storage.local.set({ links });
    chrome.action.setBadgeText({ text: 'Saved!' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
  }
});
```

## Step 2: Context Menu Save

Add right-click functionality to save any link on any page:

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveLink',
    title: 'Save Link',
    contexts: ['link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveLink') {
    const linkData = {
      url: info.linkUrl,
      title: info.selectionText || info.linkUrl,
      dateAdded: Date.now(),
      description: `Saved from: ${tab.title}`
    };
    
    const { links = [] } = await chrome.storage.local.get('links');
    if (!links.find(l => l.url === linkData.url)) {
      links.unshift(linkData);
      await chrome.storage.local.set({ links });
    }
  }
});
```

## Step 3: Popup UI

Create an interactive popup to manage saved links:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 350px; padding: 10px; font-family: system-ui; }
    #search { width: 100%; padding: 8px; margin-bottom: 10px; }
    .link-item { border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 4px; }
    .link-title { font-weight: bold; }
    .link-url { color: #666; font-size: 12px; }
    .link-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
    .tag { background: #e0e7ff; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
    .delete-btn { float: right; color: red; cursor: pointer; }
  </style>
</head>
<body>
  <input type="text" id="search" placeholder="Search links...">
  <div id="linksList"></div>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const { links = [] } = await chrome.storage.local.get('links');
  renderLinks(links);
  
  document.getElementById('search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = links.filter(l => 
      l.title.toLowerCase().includes(query) || 
      l.url.toLowerCase().includes(query) ||
      (l.tags || []).some(t => t.toLowerCase().includes(query))
    );
    renderLinks(filtered);
  });
});

function renderLinks(links) {
  const container = document.getElementById('linksList');
  container.innerHTML = links.map((link, index) => `
    <div class="link-item">
      <span class="delete-btn" data-index="${index}">✕</span>
      <div class="link-title">${link.title}</div>
      <div class="link-url">${link.url}</div>
      ${link.tags ? `<div class="link-tags">${link.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
      ${link.note ? `<div class="link-note">${link.note}</div>` : ''}
    </div>
  `).join('');
  
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.dataset.index);
      links.splice(index, 1);
      await chrome.storage.local.set({ links });
      renderLinks(links);
    });
  });
}
```

## Step 4: Tags and Categories

Add tag support when saving links:

```javascript
// Add tags input to popup UI
async function addTags(linkIndex) {
  const tags = prompt('Enter tags (comma-separated):');
  if (tags) {
    const { links = [] } = await chrome.storage.local.get('links');
    links[linkIndex].tags = tags.split(',').map(t => t.trim());
    await chrome.storage.local.set({ links });
  }
}

// Auto-suggest existing tags
async function getAllTags() {
  const { links = [] } = await chrome.storage.local.get('links');
  const allTags = new Set();
  links.forEach(link => (link.tags || []).forEach(t => allTags.add(t)));
  return Array.from(allTags);
}
```

## Step 5: Notes

Add optional notes to saved links:

```javascript
// In popup.js - Add note editing
async function editNote(linkIndex) {
  const { links = [] } = await chrome.storage.local.get('links');
  const note = prompt('Add a note:', links[linkIndex].note || '');
  links[linkIndex].note = note;
  await chrome.storage.local.set({ links });
}
```

## Step 6: Import/Export

Add import/export functionality for backups:

```javascript
// Export as JSON
async function exportLinks() {
  const { links = [] } = await chrome.storage.local.get('links');
  const blob = new Blob([JSON.stringify(links, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: 'links-backup.json' });
}

// Export as HTML bookmarks
async function exportBookmarks() {
  const { links = [] } = await chrome.storage.local.get('links');
  const html = ['<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<HTML><HEAD><META HTTP-EQUIV="Content-Type" CONTENT="text/html;charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE></HEAD><BODY><H1>Saved Links</H1>',
    '<DL><p>',].join('\n');
  
  links.forEach(link => {
    html += `  <DT><A HREF="${link.url}" ADD_DATE="${link.dateAdded}">${link.title}</A>\n`;
  });
  
  html += '</DL><p></BODY></HTML>';
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: 'links-bookmarks.html' });
}

// Import from bookmark HTML
async function importBookmarks(file) {
  const text = await file.text();
  const urlMatches = text.match(/<A HREF="([^"]+)"/g);
  const links = [];
  
  urlMatches.forEach(match => {
    const url = match.match(/href="([^"]+)"/)[1];
    links.push({ url, title: url, dateAdded: Date.now() });
  });
  
  const { links: existing = [] } = await chrome.storage.local.get('links');
  await chrome.storage.local.set({ links: [...links, ...existing] });
}
```

For syncing across devices, consider using `chrome.storage.sync` instead of `storage.local`, but be aware of the [size limits](https://developer.chrome.com/docs/extensions/mv3/storage/#property-sync).

## Summary

You've built a complete link saver extension with:
- One-click page saving with badge confirmation
- Right-click context menu for saving links
- Searchable popup interface
- Tag and category organization
- Notes support
- Import/Export functionality

For state management patterns, see [patterns/state-management.md](../patterns/state-management.md).
