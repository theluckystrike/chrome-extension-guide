# Build a Note-Taking Extension

## What You'll Build
Build a quick note-taking extension with page-linked notes, side panel editing, tag organization, and export capabilities.

- Quick note-taking from any web page
- Attach notes to specific URLs/pages
- Side panel for note editing
- Search and organize notes by tag

## Manifest
```json
{
  "manifest_version": 3,
  "name": "PageNotes",
  "version": "1.0.0",
  "permissions": ["sidePanel", "storage", "activeTab", "contextMenus"],
  "side_panel": { "default_path": "sidepanel.html" },
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "commands": {
    "quick-note": {
      "suggested_key": "Ctrl+Shift+N",
      "description": "Open quick note"
    }
  },
  "icons": { "16": "icon-16.png", "48": "icon-48.png", "128": "icon-128.png" }
}
```

## Step 1: Quick Note Capture

### Toolbar and Side Panel
Click the extension icon to open the side panel with a note editor.

```typescript
// background.ts - Open side panel on action click
chrome.sidePanel.setOptions({ path: 'sidepanel.html' });

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});
```

### Context Menu
Add "Add to notes" to capture selected text from any page.

```typescript
// background.ts - Context menu for selected text
chrome.contextMenus.create({
  id: 'addToNotes',
  title: 'Add to Notes',
  contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addToNotes' && info.selectionText) {
    await chrome.sidePanel.open({ tabId: tab.id });
    // Send selected text to side panel
    chrome.tabs.sendMessage(tab.id, {
      type: 'NEW_NOTE',
      content: info.selectionText,
      url: tab.url
    });
  }
});
```

### Keyboard Shortcut
Use the Commands API for quick capture via `Ctrl+Shift+N`.

```typescript
// background.ts - Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'quick-note') {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});
```

## Step 2: Note Storage

### Using @theluckystrike/webext-storage
Store notes with structured schema and automatic sync.

```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const noteSchema = defineSchema({
  notes: 'object',      // Map of noteId -> Note
  tags: 'object',       // Map of tag -> noteId[]
  settings: 'object'    // User preferences
});

const storage = createStorage(noteSchema, 'sync');

interface Note {
  id: string;
  title: string;
  content: string;
  url: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}
```

### Auto-Save with Debounce
Implement auto-save to prevent excessive storage writes.

```typescript
// sidepanel.ts - Debounced auto-save
let saveTimeout: number;

function debounceSave(note: Note) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const notes = (await storage.get('notes')) || {};
    notes[note.id] = { ...note, updatedAt: Date.now() };
    await storage.set('notes', notes);
  }, 500);
}
```

### Storage.sync vs storage.local
Use `storage.sync` for small notes that need cross-device sync, `storage.local` for larger data.

```typescript
// Use sync for small notes (quotas apply)
const syncStorage = createStorage(noteSchema, 'sync');

// Use local for larger datasets
const localStorage = createStorage(largeDataSchema, 'local');
```

## Step 3: Side Panel Editor

### contentEditable Rich Text
Build a simple rich text editor with contentEditable.

```html
<!-- sidepanel.html -->
<div class="editor">
  <div class="toolbar">
    <button data-command="bold"><b>B</b></button>
    <button data-command="italic"><i>I</i></button>
    <button data-command="insertUnorderedList">•</button>
  </div>
  <div id="noteEditor" contenteditable="true"></div>
  <div class="status">
    <span id="charCount">0</span> chars | <span id="wordCount">0</span> words
  </div>
</div>
```

```typescript
// sidepanel.ts - Editor event handlers
document.querySelectorAll('[data-command]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.execCommand(btn.dataset.command, false);
    editor.focus();
  });
});

editor.addEventListener('input', () => {
  const text = editor.innerText;
  charCount.textContent = text.length;
  wordCount.textContent = text.trim() ? text.trim().split(/\s+/).length : 0;
  debounceSave(currentNote);
});
```

### Auto-Link URLs
Automatically convert URLs in notes to clickable links.

```typescript
function autoLink(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
}
```

## Step 4: Page-Linked Notes

### Associate Notes with URLs
Link notes to the current page for context.

```typescript
// Get current tab URL
async function getCurrentTabUrl(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab.url || '';
}

// Filter notes by current page
async function getNotesForPage(url: string): Promise<Note[]> {
  const notes = (await storage.get('notes')) || {};
  return Object.values(notes).filter((n: Note) => n.url === url);
}
```

### Badge Count
Show badge with count of notes for current page.

```typescript
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const notes = await getNotesForPage(tab.url);
    const count = notes.length;
    if (count > 0) {
      chrome.action.setBadgeText({ tabId, text: String(count) });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  }
});
```

## Step 5: Tags and Organization

### Adding Tags
Allow users to add and manage tags for categorization.

```typescript
async function addTagToNote(noteId: string, tag: string): Promise<void> {
  const notes = (await storage.get('notes')) || {};
  const tags = (await storage.get('tags')) || {};

  if (!notes[noteId]) return;
  
  notes[noteId].tags.push(tag);
  tags[tag] = tags[tag] || [];
  tags[tag].push(noteId);

  await storage.set('notes', notes);
  await storage.set('tags', tags);
}
```

### Search Notes
Full-text search across all notes.

```typescript
async function searchNotes(query: string): Promise<Note[]> {
  const notes = (await storage.get('notes')) || {};
  const lowerQuery = query.toLowerCase();

  return Object.values(notes).filter((n: Note) => 
    n.title.toLowerCase().includes(lowerQuery) ||
    n.content.toLowerCase().includes(lowerQuery) ||
    n.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
}
```

### Color-Coded Tags
Display tags with colors for visual organization.

```html
<style>
.tag {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  background: var(--tag-color, #e0e0e0);
}
.tag.work { background: #ff6b6b; color: white; }
.tag.important { background: #ffd93d; }
.tag.personal { background: #6bcb77; color: white; }
</style>
```

## Step 6: Export

### Export Formats
Support plain text, markdown, and JSON export.

```typescript
function exportAsMarkdown(notes: Note[]): string {
  return notes.map(n => 
    `# ${n.title}\n\nTags: ${n.tags.join(', ')}\n\n${n.content}`
  ).join('\n\n---\n\n');
}

function exportAsJSON(notes: Note[]): string {
  return JSON.stringify(notes, null, 2);
}
```

### Copy to Clipboard
Quick copy functionality for individual notes.

```typescript
async function copyNoteToClipboard(note: Note): Promise<void> {
  await navigator.clipboard.writeText(note.content);
  // Show toast notification
}
```

## Cross-references
- [permissions/sidePanel.md](../permissions/sidepanel.md)
- [patterns/side-panel.md](../patterns/side-panel.md)
- [patterns/state-management.md](../patterns/state-management.md)
- [guides/options-page.md](../guides/options-page.md)
