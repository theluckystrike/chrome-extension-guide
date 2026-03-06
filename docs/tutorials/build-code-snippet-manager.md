# Build a Code Snippet Manager Extension

## What You'll Build
A code snippet manager that lets users save, organize, and retrieve code snippets from any webpage. Features syntax highlighting, tagging, search, and import/export functionality.

## Project Structure
```
code-snippet-manager/
  manifest.json
  background.js
  content.js
  popup/popup.html
  popup/popup.css
  popup/popup.js
  options/options.html
  options/options.css
  options/options.js
  offscreen.html
  offscreen.js
```

## Step 1: Manifest
```json
{
  "manifest_version": 3,
  "name": "Code Snippet Manager",
  "version": "1.0.0",
  "permissions": ["contextMenus", "storage", "activeTab", "offscreen"],
  "action": { "default_popup": "popup/popup.html" },
  "options_page": "options/options.html",
  "background": { "service_worker": "background.js" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"] }]
}
```

## Step 2: Context Menu
```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveSnippet',
    title: 'Save as Snippet',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveSnippet') {
    chrome.tabs.sendMessage(tab.id, { 
      type: 'SAVE_SELECTION', 
      code: info.selectionText 
    });
  }
});
```

## Step 3: Content Script Detection
```javascript
// content.js
// Detect code blocks and add save buttons
function injectSaveButtons() {
  document.querySelectorAll('pre code, pre').forEach(block => {
    if (block.dataset.snippetBtn) return;
    block.dataset.snippetBtn = 'true';
    
    const btn = document.createElement('button');
    btn.textContent = 'Save Snippet';
    btn.className = 'snippet-save-btn';
    btn.onclick = () => {
      const code = block.querySelector('code')?.textContent || block.textContent;
      chrome.runtime.sendMessage({ type: 'SAVE_CODE', code });
    };
    block.style.position = 'relative';
    block.appendChild(btn);
  });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SAVE_SELECTION') {
    chrome.runtime.sendMessage({ type: 'SAVE_CODE', code: msg.code });
  }
});
```

## Step 4: IndexedDB Storage (via Offscreen)
```javascript
// offscreen.js — handle IndexedDB for large snippet collections
const DB_NAME = 'snippets-db';
const STORE_NAME = 'snippets';

async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('language', 'language', { unique: false });
        store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ADD_SNIPPET') { /* add to IDB */ }
  if (msg.type === 'GET_SNIPPETS') { /* query IDB */ }
  if (msg.type === 'DELETE_SNIPPET') { /* remove from IDB */ }
  if (msg.type === 'EXPORT_SNIPPETS') { /* export all as JSON */ }
  if (msg.type === 'IMPORT_SNIPPETS') { /* import from JSON */ }
  return true;
});
```

## Step 5: Popup UI with Search
```html
<!-- popup/popup.html -->
<div class="snippet-popup">
  <input type="text" id="search" placeholder="Search snippets...">
  <select id="languageFilter"><option>All Languages</option></select>
  <div id="snippetList"></div>
</div>
```
```javascript
// popup/popup.js
async function loadSnippets() {
  const { defaultLanguage } = await chrome.storage.local.get('defaultLanguage');
  // Fetch from background, display with syntax highlighting
}

function renderSnippets(snippets) {
  const list = document.getElementById('snippetList');
  list.innerHTML = snippets.map(s => `
    <div class="snippet-item" data-id="${s.id}">
      <div class="snippet-header">
        <span class="language">${s.language}</span>
        <div class="tags">${s.tags?.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
      <pre><code class="language-${s.language}">${escapeHtml(s.code)}</code></pre>
      <button class="copy-btn">Copy</button>
    </div>
  `).join('');
  // Apply highlighting with Prism.js or highlight.js
}
```

## Step 6: Copy to Clipboard
```javascript
// In popup.js
async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
  // Show toast notification
}

// Options page for default language and cleanup
// Cross-ref: patterns/clipboard-patterns.md, patterns/indexeddb-extensions.md, patterns/context-menu-patterns.md
