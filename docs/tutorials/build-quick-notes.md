---
layout: default
title: "Chrome Extension Quick Notes. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-quick-notes/"
---
Build a Quick Notes Popup Extension

This tutorial walks through building a Chrome extension for instant note-taking with auto-save, folders, and search functionality.

Step 1: Manifest with Storage Permission {#step-1-manifest-with-storage-permission}

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

Step 2: Popup with Textarea for Quick Note Entry {#step-2-popup-with-textarea-for-quick-note-entry}

Create `popup.html` with a textarea and note list:

```html
<input type="text" id="note-title" placeholder="Title">
<div id="editor" contenteditable="true"></div>
<div id="notes-list"></div>
```

See [guides/popup-patterns.md](../guides/popup-patterns.md) for popup best practices.

Step 3: Auto-Save on Every Keystroke (Debounced) {#step-3-auto-save-on-every-keystroke-debounced}

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

For storage limits and detailed look, see [api-reference/storage-api-deep detailed look.md](../api-reference/storage-api-deep detailed look.md).

Step 4: Note List with Preview and Timestamp {#step-4-note-list-with-preview-and-timestamp}

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

Step 5: Create/Delete/Edit Notes {#step-5-createdeleteedit-notes}

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

Step 6: Folder/Category Organization {#step-6-foldercategory-organization}

Organize notes into folders:

```json
{ "id": 1, "folder": "Work", "content": "..." }
```

Filter notes by folder in the sidebar.

Step 7: Full-Text Search Across All Notes {#step-7-full-text-search-across-all-notes}

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

Step 8: Keyboard Shortcut to Open Popup {#step-8-keyboard-shortcut-to-open-popup}

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

Additional Features {#additional-features}

Rich Text Basics {#rich-text-basics}
Use `contentEditable` for bold, italic, and lists:

```javascript
document.execCommand('bold');
document.execCommand('italic');
document.execCommand('insertUnorderedList');
```

Sync Across Devices {#sync-across-devices}
`chrome.storage.sync` syncs automatically across devices (100KB limit).

Export Notes as Text/Markdown {#export-notes-as-textmarkdown}
```javascript
function exportNotes() {
  const markdown = notes.map(n => `# ${n.title}\n\n${n.content}`).join('\n\n');
  const blob = new Blob([markdown], { type: 'text/markdown' });
  // Download file
}
```

Pin Important Notes to Top {#pin-important-notes-to-top}
Add a `pinned: true` property and sort notes accordingly.

Note Count in Badge {#note-count-in-badge}
Display note count in extension badge:

```javascript
chrome.action.setBadgeText({ text: String(notes.length) });
```

Your Quick Notes extension is ready! This pattern scales well with additional features like tags, rich text formatting, and cloud backup.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
