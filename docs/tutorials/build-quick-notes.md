---
layout: default
title: "Chrome Extension Quick Notes — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Quick Notes Popup Extension

This tutorial walks through building a Chrome extension for instant note-taking with auto-save, folders, and search functionality.

## Step 1: Manifest with Storage Permission

Create `manifest.json` with the required permissions:

```json
{
  "manifest_version": 3,
  "name": "Quick Notes",
  "version": "1.0",
  "permissions": ["storage", "commands"],
  "action": { "default_popup": "popup.html" }
}
```

## Step 2: Popup with Textarea for Quick Note Entry

Create `popup.html` with a textarea and note list:

```html
<input type="text" id="note-title" placeholder="Title">
<div id="editor" contenteditable="true"></div>
<div id="notes-list"></div>
```

See [guides/popup-patterns.md](../guides/popup-patterns.md) for popup best practices.

## Step 3: Auto-Save on Every Keystroke (Debounced)

Implement debounced auto-save using `chrome.storage.sync`:

```javascript
let saveTimeout;
editor.addEventListener('input', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    chrome.storage.sync.set({ [noteId]: noteData });
  }, 500);
});
```

For storage limits and deep dive, see [api-reference/storage-api-deep-dive.md](../api-reference/storage-api-deep-dive.md).

## Step 4: Note List with Preview and Timestamp

Display notes with preview and timestamps:

```javascript
function renderNotes(notes) {
  notesList.innerHTML = notes.map(n => `
    <div class="note" data-id="${n.id}">
      <div class="preview">${n.content.substring(0, 50)}...</div>
      <div class="timestamp">${new Date(n.updated).toLocaleString()}</div>
    </div>
  `).join('');
}
```

## Step 5: Create/Delete/Edit Notes

Add CRUD operations for notes:

```javascript
function createNote() {
  const note = { id: Date.now(), title: '', content: '', created: Date.now() };
  // Save to storage and update UI
}

function deleteNote(id) {
  chrome.storage.sync.remove(String(id), renderNotes);
}
```

## Step 6: Folder/Category Organization

Organize notes into folders:

```json
{ "id": 1, "folder": "Work", "content": "..." }
```

Filter notes by folder in the sidebar.

## Step 7: Full-Text Search Across All Notes

Implement search functionality:

```javascript
function searchNotes(query) {
  const lower = query.toLowerCase();
  return notes.filter(n => 
    n.content.toLowerCase().includes(lower) ||
    n.title.toLowerCase().includes(lower)
  );
}
```

## Step 8: Keyboard Shortcut to Open Popup

Add a keyboard shortcut in `manifest.json`:

```json
"commands": {
  "open-popup": {
    "suggested_key": "Ctrl+Shift+N",
    "description": "Open Quick Notes"
  }
}
```

See [api-reference/commands-api.md](../api-reference/commands-api.md) for more.

## Additional Features

### Rich Text Basics
Use `contentEditable` for bold, italic, and lists:

```javascript
document.execCommand('bold');
document.execCommand('italic');
document.execCommand('insertUnorderedList');
```

### Sync Across Devices
`chrome.storage.sync` syncs automatically across devices (100KB limit).

### Export Notes as Text/Markdown
```javascript
function exportNotes() {
  const markdown = notes.map(n => `# ${n.title}\n\n${n.content}`).join('\n\n');
  const blob = new Blob([markdown], { type: 'text/markdown' });
  // Download file
}
```

### Pin Important Notes to Top
Add a `pinned: true` property and sort notes accordingly.

### Note Count in Badge
Display note count in extension badge:

```javascript
chrome.action.setBadgeText({ text: String(notes.length) });
```

Your Quick Notes extension is ready! This pattern scales well with additional features like tags, rich text formatting, and cloud backup.
