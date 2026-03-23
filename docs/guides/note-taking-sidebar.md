Building a Note-Taking Sidebar Chrome Extension

Overview

A note-taking sidebar extension provides users with a persistent panel to capture thoughts, annotations, and ideas while browsing the web. This guide covers building a complete MV3 extension using the Side Panel API, Storage API, and modern TypeScript patterns.

Architecture

The extension follows a clean architecture with clear separation of concerns:

```

                      Side Panel (UI)                        
        
    Note List      Editor         Toolbar              
        

                            Message Passing
                           

              Background Service Worker                     
        
    Storage        Sync           Context Menu         
    Manager        Service        Handler              
        

                           
                           

                   Chrome Storage (Sync)                     

```

Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "QuickNotes Sidebar",
  "version": "1.0.0",
  "description": "A minimal note-taking sidebar for Chrome",
  "permissions": [
    "storage",
    "sidePanel",
    "contextMenus",
    "tabs"
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "action": {
    "default_title": "Open Notes"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

TypeScript Implementation

Types Definition

```ts
// types.ts
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  searchQuery: string;
}

export type NoteMessage = 
  | { type: 'GET_NOTES'; response: Note[] }
  | { type: 'SAVE_NOTE'; request: Note }
  | { type: 'DELETE_NOTE'; request: { id: string } }
  | { type: 'SEARCH_NOTES'; request: { query: string } };
```

Background Service Worker

```ts
// background.ts
import type { Note, NoteMessage } from './types';

// Initialize storage with defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ notes: [], activeNoteId: null });
});

// Handle messages from side panel
chrome.runtime.onMessage.addListener((
  message: NoteMessage,
  _sender,
  sendResponse
) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message: NoteMessage): Promise<any> {
  const { type } = message;

  switch (type) {
    case 'GET_NOTES': {
      const { notes } = await chrome.storage.sync.get('notes');
      return notes || [];
    }

    case 'SAVE_NOTE': {
      const { notes } = await chrome.storage.sync.get('notes');
      const note = message.request;
      const existingIndex = notes.findIndex((n: Note) => n.id === note.id);
      
      if (existingIndex >= 0) {
        notes[existingIndex] = { ...note, updatedAt: Date.now() };
      } else {
        notes.push({ ...note, createdAt: Date.now(), updatedAt: Date.now() });
      }
      
      await chrome.storage.sync.set({ notes });
      return { success: true };
    }

    case 'DELETE_NOTE': {
      const { notes } = await chrome.storage.sync.get('notes');
      const filtered = notes.filter((n: Note) => n.id !== message.request.id);
      await chrome.storage.sync.set({ notes: filtered });
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

// Open side panel on action click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: 'sidepanel.html'
  });
});
```

Side Panel UI

```html
<!-- sidepanel.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickNotes</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app">
    <header class="header">
      <input type="text" id="search" placeholder="Search notes...">
      <button id="new-note">+ New</button>
    </header>
    <aside class="notes-list" id="notes-list"></aside>
    <main class="editor">
      <input type="text" id="note-title" placeholder="Note title">
      <textarea id="note-content" placeholder="Start typing..."></textarea>
      <div class="tags" id="tags"></div>
    </main>
  </div>
  <script type="module" src="sidepanel.js"></script>
</body>
</html>
```

```css
/* styles.css */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  height: 100vh;
  background: #1a1a1a;
  color: #e0e0e0;
}

.app {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: auto 1fr;
  height: 100vh;
}

.header {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #252525;
  border-bottom: 1px solid #333;
}

.header input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #2a2a2a;
  color: #e0e0e0;
}

.header button {
  padding: 8px 16px;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.notes-list {
  overflow-y: auto;
  border-right: 1px solid #333;
  padding: 8px;
}

.note-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  background: #2a2a2a;
  transition: background 0.2s;
}

.note-item:hover { background: #333; }
.note-item.active { background: #4a90d9; }

.note-item h4 {
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-item p {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.editor input {
  font-size: 18px;
  font-weight: 600;
  padding: 8px;
  margin-bottom: 12px;
  background: transparent;
  border: none;
  color: #e0e0e0;
  outline: none;
}

.editor textarea {
  flex: 1;
  resize: none;
  padding: 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  color: #e0e0e0;
  font-family: inherit;
  line-height: 1.6;
}
```

Side Panel Script

```ts
// sidepanel.ts
import type { Note } from './types';

let notes: Note[] = [];
let activeNoteId: string | null = null;

// DOM Elements
const notesList = document.getElementById('notes-list')!;
const noteTitle = document.getElementById('note-title') as HTMLInputElement;
const noteContent = document.getElementById('note-content') as HTMLTextAreaElement;
const searchInput = document.getElementById('search') as HTMLInputElement;
const newNoteBtn = document.getElementById('new-note')!;

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Load notes from storage
async function loadNotes(): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'GET_NOTES' });
  notes = response;
  renderNotesList();
}

// Save current note
async function saveNote(): Promise<void> {
  if (!activeNoteId) return;
  
  const note = notes.find(n => n.id === activeNoteId);
  if (!note) return;
  
  note.title = noteTitle.value || 'Untitled';
  note.content = noteContent.value;
  note.updatedAt = Date.now();
  
  await chrome.runtime.sendMessage({ 
    type: 'SAVE_NOTE', 
    request: note 
  });
  
  renderNotesList();
}

// Create new note
function createNewNote(): void {
  const newNote: Note = {
    id: generateId(),
    title: '',
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: []
  };
  
  notes.unshift(newNote);
  activeNoteId = newNote.id;
  renderNotesList();
  renderEditor();
}

// Delete note
async function deleteNote(id: string): Promise<void> {
  await chrome.runtime.sendMessage({ 
    type: 'DELETE_NOTE', 
    request: { id } 
  });
  
  notes = notes.filter(n => n.id !== id);
  activeNoteId = notes[0]?.id || null;
  renderNotesList();
  renderEditor();
}

// Render notes list
function renderNotesList(filter?: string): void {
  const filtered = filter 
    ? notes.filter(n => 
        n.title.toLowerCase().includes(filter.toLowerCase()) ||
        n.content.toLowerCase().includes(filter.toLowerCase()))
    : notes;
  
  notesList.innerHTML = filtered.map(note => `
    <div class="note-item ${note.id === activeNoteId ? 'active' : ''}" data-id="${note.id}">
      <h4>${note.title || 'Untitled'}</h4>
      <p>${note.content.substring(0, 50) || 'No content'}</p>
    </div>
  `).join('');
  
  // Add click listeners
  notesList.querySelectorAll('.note-item').forEach(el => {
    el.addEventListener('click', () => {
      activeNoteId = el.getAttribute('data-id');
      renderNotesList(searchInput.value);
      renderEditor();
    });
  });
}

// Render editor
function renderEditor(): void {
  const note = notes.find(n => n.id === activeNoteId);
  
  if (!note) {
    noteTitle.value = '';
    noteContent.value = '';
    return;
  }
  
  noteTitle.value = note.title;
  noteContent.value = note.content;
}

// Event Listeners
newNoteBtn.addEventListener('click', createNewNote);
noteTitle.addEventListener('input', saveNote);
noteContent.addEventListener('input', saveNote);
searchInput.addEventListener('input', () => {
  renderNotesList(searchInput.value);
});

// Auto-save on panel close
window.addEventListener('beforeunload', saveNote);

// Initialize
loadNotes();
```

Chrome APIs Used

| API | Purpose |
|-----|---------|
| `chrome.sidePanel` | Open/close sidebar, set options |
| `chrome.storage.sync` | Persist notes across devices |
| `chrome.runtime.onMessage` | Communication between contexts |
| `chrome.action` | Browser action button |
| `chrome.tabs` | Get current tab info |

Testing

Manual Testing

1. Load unpacked extension in Chrome (`chrome://extensions`)
2. Enable developer mode
3. Click "Load unpacked" and select extension directory
4. Click extension icon to open side panel
5. Test creating, editing, and deleting notes

Automated Testing with Playwright

```ts
// tests/sidebar.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Note Taking Sidebar', () => {
  test('should create a new note', async ({ page }) => {
    // Load the extension popup or side panel
    await page.goto('sidepanel.html');
    
    // Click new note button
    await page.click('#new-note');
    
    // Fill in note content
    await page.fill('#note-title', 'Test Note');
    await page.fill('#note-content', 'This is a test note');
    
    // Verify note appears in list
    const noteItem = page.locator('.note-item').first();
    await expect(noteItem).toContainText('Test Note');
  });
  
  test('should persist notes after reload', async ({ page }) => {
    await page.goto('sidepanel.html');
    
    // Create note
    await page.click('#new-note');
    await page.fill('#note-title', 'Persistent Note');
    await page.fill('#note-content', 'Content');
    
    // Reload and verify
    await page.reload();
    await expect(page.locator('#note-title')).toHaveValue('Persistent Note');
  });
});
```

Keyboard Shortcuts

```json
{
  "commands": {
    "toggle-sidebar": {
      "suggested_key": "Ctrl+Shift+N",
      "description": "Toggle note-taking sidebar"
    }
  }
}
```

Best Practices

1. Auto-save: Implement debounced auto-save to prevent excessive storage writes
2. Sync: Use `chrome.storage.sync` for cross-device persistence
3. Performance: Virtualize long note lists for better performance
4. Error handling: Wrap storage operations in try-catch blocks
5. Security: Sanitize note content before rendering to prevent XSS
---

Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*