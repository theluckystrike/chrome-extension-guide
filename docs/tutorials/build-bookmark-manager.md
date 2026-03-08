---
layout: default
title: "Chrome Extension Bookmark Manager — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-bookmark-manager/"
---
# Build a Bookmark Manager Extension

## What You'll Build {#what-youll-build}
A side panel bookmark manager with search, folder navigation, tags, and duplicate detection.

## Prerequisites {#prerequisites}
- Side panel API (cross-ref `docs/mv3/side-panel.md`)
- Bookmark API (cross-ref `docs/guides/bookmark-api.md`)

## Project Structure {#project-structure}
```
bookmark-manager/
  manifest.json
  background.js
  sidepanel/
    panel.html
    panel.css
    panel.js
```

## Step 1: Manifest {#step-1-manifest}
```json
{
  "manifest_version": 3,
  "name": "Bookmark Manager Pro",
  "version": "1.0.0",
  "permissions": ["bookmarks", "sidePanel", "storage"],
  "side_panel": { "default_path": "sidepanel/panel.html" },
  "action": { "default_title": "Open Bookmark Manager" },
  "background": { "service_worker": "background.js" }
}
```

## Step 2: Background Service Worker {#step-2-background-service-worker}
```javascript
// Open side panel on icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Relay bookmark events to panel
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  chrome.runtime.sendMessage({ type: 'BOOKMARK_CREATED', bookmark }).catch(() => {});
});
chrome.bookmarks.onRemoved.addListener((id, info) => {
  chrome.runtime.sendMessage({ type: 'BOOKMARK_REMOVED', id }).catch(() => {});
});
chrome.bookmarks.onChanged.addListener((id, info) => {
  chrome.runtime.sendMessage({ type: 'BOOKMARK_CHANGED', id, info }).catch(() => {});
});
```

## Step 3: Side Panel HTML {#step-3-side-panel-html}
```html
<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="panel.css"></head>
<body>
  <div class="header">
    <h1>Bookmarks</h1>
    <input type="search" id="search" placeholder="Search bookmarks...">
  </div>
  <div class="toolbar">
    <button id="btn-dupes">Find Duplicates</button>
    <button id="btn-export">Export JSON</button>
  </div>
  <div id="tree"></div>
  <script src="panel.js"></script>
</body>
</html>
```

## Step 4: Panel CSS {#step-4-panel-css}
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui; font-size: 13px; background: #1a1a2e; color: #e0e0e0; }
.header { padding: 12px; border-bottom: 1px solid #333; }
.header h1 { font-size: 16px; margin-bottom: 8px; color: #00ff41; }
#search { width: 100%; padding: 8px; border: 1px solid #333; border-radius: 4px; background: #0d0d1a; color: #e0e0e0; }
.toolbar { padding: 8px 12px; display: flex; gap: 8px; }
.toolbar button { padding: 4px 8px; border: 1px solid #00ff41; background: transparent; color: #00ff41; border-radius: 4px; cursor: pointer; }
.folder { margin-left: 16px; }
.folder-name { cursor: pointer; padding: 4px 8px; font-weight: bold; color: #ffd700; }
.folder-name:hover { background: rgba(255,215,0,0.1); }
.bookmark { padding: 4px 8px 4px 24px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.bookmark:hover { background: rgba(0,255,65,0.1); }
.bookmark a { color: #00ff41; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.duplicate { border-left: 3px solid #ff4444; }
.collapsed > .folder, .collapsed > .bookmark { display: none; }
```

## Step 5: Panel JavaScript {#step-5-panel-javascript}
```javascript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  bookmarkTags: 'string',
  expandedFolders: 'string'
}), 'local');

// Render bookmark tree
async function loadBookmarks() {
  const tree = await chrome.bookmarks.getTree();
  const container = document.getElementById('tree');
  container.innerHTML = '';
  renderNode(tree[0], container);
}

function renderNode(node, parent) {
  if (node.url) {
    const div = document.createElement('div');
    div.className = 'bookmark';
    div.dataset.id = node.id;
    div.dataset.url = node.url;
    const link = document.createElement('a');
    link.href = node.url;
    link.textContent = node.title || node.url;
    link.target = '_blank';
    div.appendChild(link);
    parent.appendChild(div);
  } else if (node.children) {
    const folder = document.createElement('div');
    folder.className = 'folder';
    const name = document.createElement('div');
    name.className = 'folder-name';
    name.textContent = (node.title || 'Root') + ` (${countBookmarks(node)})`;
    name.onclick = () => folder.classList.toggle('collapsed');
    folder.appendChild(name);
    node.children.forEach(child => renderNode(child, folder));
    parent.appendChild(folder);
  }
}

function countBookmarks(node) {
  if (node.url) return 1;
  return (node.children || []).reduce((sum, c) => sum + countBookmarks(c), 0);
}

// Search
document.getElementById('search').addEventListener('input', async (e) => {
  const q = e.target.value.trim();
  if (q.length < 2) return loadBookmarks();
  const results = await chrome.bookmarks.search(q);
  const container = document.getElementById('tree');
  container.innerHTML = '';
  results.forEach(b => renderNode(b, container));
});

// Find duplicates
document.getElementById('btn-dupes').addEventListener('click', async () => {
  const tree = await chrome.bookmarks.getTree();
  const urls = new Map();
  function collect(node) {
    if (node.url) {
      const ids = urls.get(node.url) || [];
      ids.push(node.id);
      urls.set(node.url, ids);
    }
    node.children?.forEach(collect);
  }
  collect(tree[0]);
  const dupes = [...urls.entries()].filter(([, ids]) => ids.length > 1);
  document.querySelectorAll('.duplicate').forEach(el => el.classList.remove('duplicate'));
  dupes.forEach(([, ids]) => {
    ids.forEach(id => {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) el.classList.add('duplicate');
    });
  });
  alert(`Found ${dupes.length} duplicate URLs`);
});

// Export
document.getElementById('btn-export').addEventListener('click', async () => {
  const tree = await chrome.bookmarks.getTree();
  const blob = new Blob([JSON.stringify(tree, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'bookmarks.json'; a.click();
  URL.revokeObjectURL(url);
});

// Tag system
async function addTag(bookmarkId, tag) {
  const raw = await storage.get('bookmarkTags');
  const tags = raw ? JSON.parse(raw) : {};
  tags[bookmarkId] = [...new Set([...(tags[bookmarkId] || []), tag])];
  await storage.set('bookmarkTags', JSON.stringify(tags));
}

async function getTaggedBookmarks(tag) {
  const raw = await storage.get('bookmarkTags');
  const tags = raw ? JSON.parse(raw) : {};
  const ids = Object.entries(tags).filter(([, t]) => t.includes(tag)).map(([id]) => id);
  return Promise.all(ids.map(id => chrome.bookmarks.get(id).then(([b]) => b).catch(() => null)));
}

// Listen for updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type?.startsWith('BOOKMARK_')) loadBookmarks();
});

loadBookmarks();
```

## Next Steps {#next-steps}
- Add drag-and-drop reordering with `chrome.bookmarks.move`
- Add broken link checker (fetch HEAD, check status)
- Import from HTML bookmark file
- Sync tags across devices with `storage.sync`
