---
layout: default
title: "Chrome Extension Code Snippet Manager — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-code-snippet-manager/"
---
# Build a Code Snippet Manager Chrome Extension

In this tutorial, we'll build a Chrome extension that lets you save, organize, and retrieve code snippets from any web page.

## Step 1: Manifest Configuration

Create `manifest.json` with the necessary permissions:

```json
{
  "manifest_version": 3,
  "name": "Code Snippet Manager",
  "version": "1.0",
  "permissions": ["contextMenus", "storage", "activeTab", "downloads"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" }
}
```

Key permissions:
- **contextMenus**: Right-click to save selected code
- **storage**: Persist snippets locally
- **activeTab**: Access current tab's content

## Step 2: Context Menu for Saving Code

In `background.js`, create the context menu:

```javascript
chrome.contextMenus.create({
  id: "saveSnippet",
  title: "Save as Snippet",
  contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveSnippet") {
    saveSnippet(info.selectionText, tab.url);
  }
});
```

## Step 3: Popup UI

Create `popup.html` with search, filter, and snippet list:

```html
<input type="text" id="search" placeholder="Search snippets...">
<select id="languageFilter"><option value="">All Languages</option></select>
<div id="snippetList"></div>
```

Style with `popup.css` for a clean, searchable interface.

## Step 4: IndexedDB Storage

For large snippet collections, use IndexedDB via an offscreen document:

```javascript
// offscreen.js
const dbRequest = indexedDB.open("SnippetsDB", 1);
dbRequest.onupgradeneeded = (e) => {
  const db = e.target.result;
  db.createObjectStore("snippets", { keyPath: "id" });
};
```

See [patterns/indexeddb-extensions.md](../../patterns/indexeddb-extensions.md).

## Step 5: Syntax Highlighting

Use a lightweight highlighter like Prism.js or Highlight.js:

```javascript
function highlightCode(code, language) {
  return Prism.highlight(code, Prism.languages[language], language);
}
```

## Step 6: Copy to Clipboard

Add one-click copy functionality:

```javascript
async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}
```

See [patterns/clipboard-patterns.md](../../patterns/clipboard-patterns.md).

## Step 7: Tags and Categories

Organize snippets with tags:

```javascript
const snippet = {
  id: Date.now(),
  code: "...",
  language: "javascript",
  tags: ["utility", "async"],
  createdAt: new Date().toISOString()
};
```

## Step 8: Import/Export

Export snippets as JSON:

```javascript
function exportSnippets() {
  const data = JSON.stringify(snippets, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: "snippets.json" });
}
```

Import via file input and parse JSON.

## Content Script: Detect Code Blocks

Create `content.js` to detect code on pages:

```javascript
const codeBlocks = document.querySelectorAll("pre code");
codeBlocks.forEach(block => {
  const btn = document.createElement("button");
  btn.textContent = "Save Snippet";
  btn.onclick = () => saveSnippet(block.textContent);
  block.appendChild(btn);
});
```

## Options Page

Create `options.html` for:
- Default language preference
- Storage cleanup/management
- Theme settings

## Summary

This extension demonstrates:
- Context menus for quick saving
- IndexedDB for scalable storage
- Syntax highlighting for readability
- Import/export for portability
- Content scripts for page integration

For more patterns, see [patterns/context-menu-patterns.md](../../patterns/context-menu-patterns.md).
