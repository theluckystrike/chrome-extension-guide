---
layout: default
title: "Chrome Extension Website Annotator — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-website-annotator/"
---
# Build a Website Annotator Extension

This tutorial guides you through building a Chrome extension that allows users to add sticky notes to any position on a webpage, save annotations per URL, and manage their notes.

## Project Overview {#project-overview}

The Website Annotator extension enables users to:
- Add sticky notes to any position on a webpage
- Save notes keyed by URL
- Drag notes to reposition them
- Color-code notes for organization
- View all annotated pages in a popup

## Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create your `manifest.json` with the required permissions:

```json
{
  "name": "Website Annotator",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "activeTab",
    "storage"
  ],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }],
  "action": {
    "default_popup": "popup.html"
  }
}
```

We use `activeTab` permission for minimal access - the extension only works on pages the user explicitly activates.

## Step 2: Content Script Setup {#step-2-content-script-setup}

Create `content.js` to handle note creation and positioning:

```javascript
// content.js - Main content script
let notes = [];
const NOTES_KEY = 'page_notes_';

function init() {
  const url = window.location.href;
  loadNotes(url);
  document.addEventListener('click', handleClick);
}

function handleClick(e) {
  // Only create note if not clicking on existing note
  if (e.target.closest('.annotator-note')) return;
  createNote(e.pageX, e.pageY, getCurrentUrl());
}
```

## Step 3: Click-to-Add Notes {#step-3-click-to-add-notes}

When users click on a page, create a note at that position:

```javascript
function createNote(x, y, url) {
  const note = document.createElement('div');
  note.className = 'annotator-note';
  note.style.left = x + 'px';
  note.style.top = y + 'px';
  note.innerHTML = `
    <textarea placeholder="Add your note..."></textarea>
    <div class="controls">
      <button class="delete">×</button>
      <button class="color" data-color="yellow"></button>
      <button class="color" data-color="green"></button>
      <button class="color" data-color="blue"></button>
    </div>
  `;
  document.body.appendChild(note);
  notes.push({ element: note, x, y, url });
  saveNotes(url);
}
```

## Step 4: Note UI Components {#step-4-note-ui-components}

Style your notes with a floating card design:

```css
.annotator-note {
  position: absolute;
  background: #fff9c4;
  border-radius: 8px;
  padding: 12px;
  width: 200px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 2147483647;
  font-family: sans-serif;
}

.annotator-note textarea {
  width: 100%;
  border: none;
  background: transparent;
  resize: vertical;
  min-height: 60px;
  font-size: 14px;
}
```

## Step 5: Draggable Notes {#step-5-draggable-notes}

Implement drag functionality using mouse events:

```javascript
let draggedNote = null;
let offsetX, offsetY;

document.addEventListener('mousedown', (e) => {
  const note = e.target.closest('.annotator-note');
  if (!note) return;
  
  draggedNote = note;
  const rect = note.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
});

document.addEventListener('mousemove', (e) => {
  if (!draggedNote) return;
  
  draggedNote.style.left = (e.pageX - offsetX) + 'px';
  draggedNote.style.top = (e.pageY - offsetY) + 'px';
});

document.addEventListener('mouseup', () => {
  if (draggedNote) {
    saveNotes(getCurrentUrl());
    draggedNote = null;
  }
});
```

## Step 6: Position Storage {#step-6-position-storage}

Save note positions relative to viewport for consistent placement:

```javascript
function saveNotes(url) {
  const noteData = notes.map(n => ({
    x: parseFloat(n.element.style.left),
    y: parseFloat(n.element.style.top),
    text: n.element.querySelector('textarea').value,
    color: n.element.dataset.color || 'yellow'
  }));
  
  chrome.storage.local.set({
    [NOTES_KEY + btoa(url)]: noteData
  });
}

function loadNotes(url) {
  const key = NOTES_KEY + btoa(url);
  chrome.storage.local.get([key], (result) => {
    const saved = result[key] || [];
    saved.forEach(data => restoreNote(data, url));
  });
}
```

## Step 7: Persistence Across Page Visits {#step-7-persistence-across-page-visits}

Notes are automatically restored when revisiting a page:

```javascript
function restoreNote(data, url) {
  const note = document.createElement('div');
  note.className = 'annotator-note';
  note.style.left = data.x + 'px';
  note.style.top = data.y + 'px';
  note.dataset.color = data.color;
  note.style.background = getColor(data.color);
  note.innerHTML = `<textarea>${data.text}</textarea>`;
  document.body.appendChild(note);
  notes.push({ element: note, x: data.x, y: data.y, url });
}

function getColor(colorName) {
  const colors = { yellow: '#fff9c4', green: '#c8e6c9', blue: '#bbdefb' };
  return colors[colorName] || colors.yellow;
}
```

## Step 8: Note List in Popup {#step-8-note-list-in-popup}

Create `popup.html` to show all annotated pages:

```html
<style>
  body { width: 300px; padding: 10px; }
  .page-item { 
    padding: 8px; 
    border-bottom: 1px solid #eee; 
    cursor: pointer;
  }
  .page-item:hover { background: #f5f5f5; }
</style>
<div id="pages"></div>
<script src="popup.js"></script>
```

```javascript
// popup.js - List all annotated pages
chrome.storage.local.get(null, (items) => {
  const pages = Object.keys(items)
    .filter(k => k.startsWith('page_notes_'))
    .map(k => atob(k.replace('page_notes_', '')));
  
  document.getElementById('pages').innerHTML = pages
    .map(url => `<div class="page-item">${new URL(url).hostname}</div>`)
    .join('');
});
```

## Handling Page Layout Changes {#handling-page-layout-changes}

When page layouts change, notes may appear misplaced. Anchor notes to DOM elements:

```javascript
function anchorToElement(note, selector) {
  const element = document.querySelector(selector);
  if (element) {
    const rect = element.getBoundingClientRect();
    note.style.top = (rect.bottom + 10) + 'px';
    note.style.left = rect.left + 'px';
  }
}
```

## Export Notes as Markdown {#export-notes-as-markdown}

Allow users to export all notes:

```javascript
function exportAsMarkdown() {
  chrome.storage.local.get(null, (items) => {
    let md = '# My Annotations\n\n';
    Object.entries(items).forEach(([key, notes]) => {
      if (!key.startsWith('page_notes_')) return;
      const url = atob(key.replace('page_notes_', ''));
      md += `## ${url}\n\n`;
      notes.forEach((n, i) => {
        md += `${i + 1}. ${n.text}\n`;
      });
      md += '\n';
    });
    // Download as file or copy to clipboard
  });
}
```

## Shadow DOM Isolation {#shadow-dom-isolation}

Use Shadow DOM to prevent page styles from affecting notes:

```javascript
function createNoteWithShadow() {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .note { ... }
    </style>
    <div class="note">...</div>
  `;
  document.body.appendChild(host);
}
```

## Related Patterns {#related-patterns}

- [DOM Observer Pattern](/docs/patterns/dom-observer-patterns.md) - For detecting page changes
- [Dynamic Content Injection](/docs/patterns/dynamic-content-injection.md) - For advanced injection
- [Storage API Deep Dive](/docs/api-reference/storage-api-deep-dive.md) - For complex storage needs
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
