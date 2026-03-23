Building a Code Snippet Manager Chrome Extension

A code snippet manager lets developers save, organize, and quickly retrieve reusable code blocks. This guide walks through building a full-featured snippet manager extension using Manifest V3, TypeScript, and modern Chrome extension patterns. You'll learn to architect the extension, implement core features, design the UI, handle state management, and prepare for publication.

Table of Contents

- [Architecture and Manifest Setup](#architecture-and-manifest-setup)
- [Core TypeScript Implementation](#core-typescript-implementation)
- [UI Design: Popup, Sidebar, and Content Script](#ui-design-popup-sidebar-and-content-script)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management and Storage](#state-management-and-storage)
- [Error Handling and Edge Cases](#error-handling-and-edge-cases)
- [Testing Approach](#testing-approach)
- [Full Code Examples](#full-code-examples)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

Architecture and Manifest Setup

The snippet manager follows a standard extension architecture with three main contexts: a service worker for background logic, a popup for quick access, and content scripts for page interaction. The service worker acts as the central hub, managing all state and coordinating communication between the popup and content scripts.

Directory Structure

```
snippet-manager/
 manifest.json
 src/
    background/
       index.ts          # Service worker entry point
       handlers/
          snippets.ts   # Snippet CRUD operations
          storage.ts    # Chrome storage abstraction
          messaging.ts  # Message handlers
    popup/
       popup.html
       popup.ts          # Popup entry point
       styles.css
    content/
       overlay.ts        # Page overlay for snippet insertion
       styles.css
    shared/
       types.ts          # TypeScript interfaces
       constants.ts
       utils.ts
    options/
        options.html
        options.ts
 icons/
 _locales/
 tsconfig.json
```

Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Code Snippet Manager",
  "version": "1.0.0",
  "description": "Save, organize, and quickly retrieve code snippets",
  "default_locale": "en",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png"
    }
  },
  "background": {
    "service_worker": "src/background/index.js",
    "type": "module"
  },
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "options_page": "src/options/options.html"
}
```

---

Core TypeScript Implementation

Type Definitions

Define all data structures in the shared types file to ensure consistency across contexts:

```typescript
// src/shared/types.ts

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
}

export interface SnippetFolder {
  id: string;
  name: string;
  snippetIds: string[];
  createdAt: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultLanguage: string;
  syncEnabled: boolean;
  keyboardShortcut: string;
}

export interface AppState {
  snippets: Record<string, CodeSnippet>;
  folders: Record<string, SnippetFolder>;
  settings: AppSettings;
  selectedFolderId: string | null;
  searchQuery: string;
}

export type MessageAction =
  | { action: 'GET_SNIPPETS' }
  | { action: 'ADD_SNIPPET'; payload: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'> }
  | { action: 'UPDATE_SNIPPET'; payload: { id: string; updates: Partial<CodeSnippet> } }
  | { action: 'DELETE_SNIPPET'; payload: { id: string } }
  | { action: 'GET_SETTINGS' }
  | { action: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { action: 'INSERT_SNIPPET'; payload: { snippetId: string; tabId: number } }
  | { action: 'SEARCH_SNIPPETS'; payload: { query: string } };
```

Snippet Service (Background)

The snippet service handles all CRUD operations and communicates with Chrome storage:

```typescript
// src/background/handlers/snippets.ts

import { CodeSnippet, AppState, SnippetFolder } from '../../shared/types';
import { getStorage, setStorage } from './storage';

const DEFAULT_STATE: AppState = {
  snippets: {},
  folders: {},
  settings: {
    theme: 'system',
    defaultLanguage: 'javascript',
    syncEnabled: false,
    keyboardShortcut: 'Ctrl+Shift+S'
  },
  selectedFolderId: null,
  searchQuery: ''
};

function generateId(): string {
  return `snippet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function getAllSnippets(): Promise<CodeSnippet[]> {
  const state = await getStorage<AppState>('appState');
  return Object.values(state?.snippets || {});
}

export async function addSnippet(
  payload: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CodeSnippet> {
  const state = await getStorage<AppState>('appState') || DEFAULT_STATE;
  
  const now = Date.now();
  const newSnippet: CodeSnippet = {
    ...payload,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  };
  
  state.snippets[newSnippet.id] = newSnippet;
  await setStorage('appState', state);
  
  return newSnippet;
}

export async function updateSnippet(
  id: string,
  updates: Partial<CodeSnippet>
): Promise<CodeSnippet | null> {
  const state = await getStorage<AppState>('appState') || DEFAULT_STATE;
  
  if (!state.snippets[id]) {
    return null;
  }
  
  state.snippets[id] = {
    ...state.snippets[id],
    ...updates,
    updatedAt: Date.now()
  };
  
  await setStorage('appState', state);
  return state.snippets[id];
}

export async function deleteSnippet(id: string): Promise<boolean> {
  const state = await getStorage<AppState>('appState') || DEFAULT_STATE;
  
  if (!state.snippets[id]) {
    return false;
  }
  
  delete state.snippets[id];
  await setStorage('appState', state);
  return true;
}

export async function searchSnippets(query: string): Promise<CodeSnippet[]> {
  const state = await getStorage<AppState>('appState') || DEFAULT_STATE;
  const lowerQuery = query.toLowerCase();
  
  return Object.values(state.snippets).filter(snippet =>
    snippet.title.toLowerCase().includes(lowerQuery) ||
    snippet.code.toLowerCase().includes(lowerQuery) ||
    snippet.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
```

---

UI Design: Popup, Sidebar, and Content Script

Popup Interface

The popup provides quick access to search and insert snippets:

```typescript
// src/popup/popup.ts

import { CodeSnippet, MessageAction } from '../shared/types';

const state = {
  snippets: [] as CodeSnippet[],
  searchQuery: ''
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadSnippets();
  setupEventListeners();
  setupKeyboardShortcuts();
});

async function loadSnippets(): Promise<void> {
  const message: MessageAction = { action: 'GET_SNIPPETS' };
  const response = await chrome.runtime.sendMessage(message);
  state.snippets = response || [];
  renderSnippetList(state.snippets);
}

function renderSnippetList(snippets: CodeSnippet[]): void {
  const listEl = document.getElementById('snippet-list');
  if (!listEl) return;
  
  listEl.innerHTML = snippets.map(snippet => `
    <div class="snippet-item" data-id="${snippet.id}">
      <div class="snippet-header">
        <span class="snippet-title">${escapeHtml(snippet.title)}</span>
        <span class="snippet-lang">${snippet.language}</span>
      </div>
      <pre class="snippet-preview">${escapeHtml(snippet.code.substring(0, 100))}</pre>
      <div class="snippet-actions">
        <button class="btn-copy" data-id="${snippet.id}">Copy</button>
        <button class="btn-insert" data-id="${snippet.id}">Insert</button>
      </div>
    </div>
  `).join('');
  
  // Attach event listeners
  listEl.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', handleCopy);
  });
  listEl.querySelectorAll('.btn-insert').forEach(btn => {
    btn.addEventListener('click', handleInsert);
  });
}

async function handleCopy(e: Event): Promise<void> {
  const target = e.target as HTMLElement;
  const id = target.dataset.id;
  const snippet = state.snippets.find(s => s.id === id);
  
  if (snippet) {
    await navigator.clipboard.writeText(snippet.code);
    showNotification('Copied to clipboard!');
  }
}

async function handleInsert(e: Event): Promise<void> {
  const target = e.target as HTMLElement;
  const id = target.dataset.id;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id) {
    const message: MessageAction = { action: 'INSERT_SNIPPET', payload: { snippetId: id!, tabId: tab.id } };
    await chrome.runtime.sendMessage(message);
    window.close();
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message: string): void {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 2000);
}

function setupEventListeners(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = (e.target as HTMLInputElement).value;
    filterSnippets();
  });
  
  const addBtn = document.getElementById('add-snippet-btn');
  addBtn?.addEventListener('click', () => {
    // Open options page or show add form
    chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
  });
}

function filterSnippets(): void {
  const query = state.searchQuery.toLowerCase();
  const filtered = state.snippets.filter(s =>
    s.title.toLowerCase().includes(query) ||
    s.code.toLowerCase().includes(query) ||
    s.tags.some(t => t.toLowerCase().includes(query))
  );
  renderSnippetList(filtered);
}

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.close();
    }
  });
}
```

Content Script Overlay

The content script overlay allows inserting snippets directly into web pages:

```typescript
// src/content/overlay.ts

import { CodeSnippet } from '../shared/types';

let currentSnippet: CodeSnippet | null = null;
let overlayEl: HTMLElement | null = null;

export async function initOverlay(): Promise<void> {
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SHOW_INSERT_OVERLAY') {
      currentSnippet = message.snippet;
      showOverlay(currentSnippet);
    } else if (message.action === 'HIDE_OVERLAY') {
      hideOverlay();
    }
  });
}

function showOverlay(snippet: CodeSnippet): void {
  if (overlayEl) return;
  
  overlayEl = document.createElement('div');
  overlayEl.id = 'snippet-manager-overlay';
  overlayEl.innerHTML = `
    <div class="overlay-header">
      <h3>Insert Snippet: ${escapeHtml(snippet.title)}</h3>
      <button class="overlay-close">&times;</button>
    </div>
    <div class="overlay-content">
      <pre><code>${escapeHtml(snippet.code)}</code></pre>
    </div>
    <div class="overlay-actions">
      <button class="btn-insert-at-cursor">Insert at Cursor</button>
      <button class="btn-replace-selection">Replace Selection</button>
      <button class="btn-cancel">Cancel</button>
    </div>
  `;
  
  document.body.appendChild(overlayEl);
  
  // Add event listeners
  overlayEl.querySelector('.overlay-close')?.addEventListener('click', hideOverlay);
  overlayEl.querySelector('.btn-cancel')?.addEventListener('click', hideOverlay);
  overlayEl.querySelector('.btn-insert-at-cursor')?.addEventListener('click', () => insertAtCursor(snippet));
  overlayEl.querySelector('.btn-replace-selection')?.addEventListener('click', () => replaceSelection(snippet));
}

function hideOverlay(): void {
  overlayEl?.remove();
  overlayEl = null;
  currentSnippet = null;
}

function insertAtCursor(snippet: CodeSnippet): void {
  const activeEl = document.activeElement;
  
  if (activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement) {
    const start = activeEl.selectionStart;
    const end = activeEl.selectionEnd;
    const value = activeEl.value;
    
    activeEl.value = value.substring(0, start) + snippet.code + value.substring(end);
    activeEl.selectionStart = activeEl.selectionEnd = start + snippet.code.length;
    activeEl.focus();
  } else if (activeEl?.isContentEditable) {
    document.execCommand('insertText', false, snippet.code);
  }
  
  hideOverlay();
}

function replaceSelection(snippet: CodeSnippet): void {
  document.execCommand('insertText', false, snippet.code);
  hideOverlay();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

Chrome APIs and Permissions

Required Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Persist snippets, folders, and settings locally |
| `activeTab` | Access current tab for snippet insertion |
| `scripting` | Execute scripts to insert code into pages |
| `contextMenus` | Add right-click menu for quick snippet access |
| `<all_urls>` | Allow insertion into any webpage |

Context Menu Setup

```typescript
// src/background/handlers/contextMenus.ts

export function setupContextMenus(): void {
  // Remove existing menus
  chrome.contextMenus.removeAll();
  
  // Create parent menu
  chrome.contextMenus.create({
    id: 'snippet-manager',
    title: 'Code Snippets',
    contexts: ['selection', 'editable']
  });
  
  // Add submenu items
  chrome.contextMenus.create({
    id: 'snippet-manager-save',
    parentId: 'snippet-manager',
    title: 'Save Selection as Snippet',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'snippet-manager-insert',
    parentId: 'snippet-manager',
    title: 'Insert Snippet',
    contexts: ['editable']
  });
  
  // Handle clicks
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'snippet-manager-save' && info.selectionText) {
      handleSaveSelection(info.selectionText, tab?.id);
    }
  });
}

async function handleSaveSelection(selection: string, tabId?: number): Promise<void> {
  // Open popup or options page to save the snippet
  chrome.runtime.sendMessage({
    action: 'OPEN_SAVE_DIALOG',
    payload: { code: selection, sourceTabId: tabId }
  });
}
```

---

State Management and Storage

Storage Abstraction Layer

```typescript
// src/background/handlers/storage.ts

export async function getStorage<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] as T | undefined);
    });
  });
}

export async function setStorage<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      resolve();
    });
  });
}

export async function removeStorage(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, () => {
      resolve();
    });
  });
}

// Storage change listener for sync across contexts
export function watchStorage<T>(
  key: string,
  callback: (newValue: T, oldValue: T) => void
): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && key in changes) {
      callback(changes[key].newValue as T, changes[key].oldValue as T);
    }
  });
}
```

Message Handler Registration

```typescript
// src/background/handlers/messaging.ts

import { MessageAction } from '../../shared/types';
import * as snippetHandlers from './snippets';
import * as settingsHandlers from './settings';

export function registerMessageHandlers(): void {
  chrome.runtime.onMessage.addListener((
    message: MessageAction,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    handleMessage(message).then(sendResponse);
    return true; // Keep channel open for async response
  });
}

async function handleMessage(message: MessageAction): Promise<unknown> {
  switch (message.action) {
    case 'GET_SNIPPETS':
      return snippetHandlers.getAllSnippets();
      
    case 'ADD_SNIPPET':
      return snippetHandlers.addSnippet(message.payload);
      
    case 'UPDATE_SNIPPET':
      return snippetHandlers.updateSnippet(message.payload.id, message.payload.updates);
      
    case 'DELETE_SNIPPET':
      return snippetHandlers.deleteSnippet(message.payload.id);
      
    case 'SEARCH_SNIPPETS':
      return snippetHandlers.searchSnippets(message.payload.query);
      
    case 'GET_SETTINGS':
      return settingsHandlers.getSettings();
      
    case 'UPDATE_SETTINGS':
      return settingsHandlers.updateSettings(message.payload);
      
    case 'INSERT_SNIPPET':
      return snippetHandlers.insertSnippet(message.payload.snippetId, message.payload.tabId);
      
    default:
      console.warn('Unknown message action:', message);
      return { error: 'Unknown action' };
  }
}
```

---

Error Handling and Edge Cases

Comprehensive Error Handling

```typescript
// src/shared/errors.ts

export class SnippetManagerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SnippetManagerError';
  }
}

export const ErrorCodes = {
  SNIPPET_NOT_FOUND: 'SNIPPET_NOT_FOUND',
  STORAGE_ERROR: 'STORAGE_ERROR',
  INSERT_FAILED: 'INSERT_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED'
} as const;

export function handleError(error: unknown): { success: false; error: string } {
  if (error instanceof SnippetManagerError) {
    console.error(`[${error.code}] ${error.message}`, error.details);
    return { success: false, error: error.message };
  }
  
  if (error instanceof Error) {
    console.error('[UNEXPECTED]', error.message);
    return { success: false, error: 'An unexpected error occurred' };
  }
  
  return { success: false, error: 'Unknown error occurred' };
}

// Validation helpers
export function validateSnippet(payload: unknown): payload is { title: string; code: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'title' in payload &&
    'code' in payload &&
    typeof (payload as { title: unknown }).title === 'string' &&
    typeof (payload as { code: unknown }).code === 'string'
  );
}

export function sanitizeCode(code: string): string {
  // Remove potentially dangerous patterns
  return code
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '');
}
```

---

Testing Approach

Unit Testing with Vitest

```typescript
// tests/snippets.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addSnippet, getAllSnippets, deleteSnippet } from '../src/background/handlers/snippets';

// Mock chrome.storage
vi.mock('chrome', () => ({
  default: {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn()
      }
    }
  }
}));

describe('Snippet Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should add a new snippet', async () => {
    const payload = {
      title: 'Test Snippet',
      code: 'console.log("hello")',
      language: 'javascript',
      tags: ['test'],
      favorite: false
    };
    
    const result = await addSnippet(payload);
    
    expect(result).toHaveProperty('id');
    expect(result.title).toBe(payload.title);
    expect(result.code).toBe(payload.code);
    expect(result.createdAt).toBeDefined();
  });
  
  it('should return all snippets', async () => {
    const snippets = await getAllSnippets();
    
    expect(Array.isArray(snippets)).toBe(true);
  });
  
  it('should delete a snippet', async () => {
    const result = await deleteSnippet('nonexistent_id');
    
    expect(result).toBe(false); // Non-existent snippet
  });
});
```

---

Full Code Examples

Background Service Worker Entry Point

```typescript
// src/background/index.ts

import { registerMessageHandlers } from './handlers/messaging';
import { setupContextMenus } from './handlers/contextMenus';
import { initializeSettings } from './handlers/settings';

console.log('[Snippet Manager] Service worker starting...');

// Register all handlers
registerMessageHandlers();
setupContextMenus();

// Initialize default settings
initializeSettings();

// Handle service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Snippet Manager] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[Snippet Manager] Extension updated');
  }
});

// Keep service worker alive for development
chrome.runtime.onConnect.addListener((port) => {
  console.log('[Snippet Manager] Port connected:', port.name);
});
```

---

Performance Considerations

Optimization Strategies

1. Lazy Load Content Scripts: Only inject when needed using `chrome.scripting.executeScript`

2. Debounce Search: Prevent excessive storage queries during typing:
```typescript
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

3. Use IndexedDB for Large Snippets: For snippets exceeding 100KB, use IndexedDB instead of chrome.storage

4. Cache Active Tab Content: Avoid repeated queries by caching tab information

5. Chunk Large Data Operations: When syncing many snippets, process in batches

---

Publishing Checklist

Pre-Publication Steps

- [ ] Test in Incognito Mode: Ensure all features work without persistent storage
- [ ] Verify Permissions: Request only necessary permissions
- [ ] Check Icon Sizes: 16x16, 48x48, 128x128 PNG icons
- [ ] Add Screenshots: 1280x800 PNG screenshots for store listing
- [ ] Write Privacy Policy: Required for extensions with broad permissions
- [ ] Test Cross-Browser: Consider Firefox (WebExtension) compatibility
- [ ] Optimize Bundle Size: Use code splitting and tree shaking

Store Listing Requirements

- [ ] Unique extension name (no trademarked terms)
- [ ] Detailed description (at least 2 sentences)
- [ ] Category selection (Developer Tools > Extensions)
- [ ] Language support declaration in `_locales`

Post-Publish

- [ ] Monitor error reports in Chrome Web Store console
- [ ] Set up update notifications to users
- [ ] Track user reviews and respond promptly
- [ ] Prepare v1.1 with bug fixes ready to submit

---

Summary

Building a code snippet manager requires careful consideration of Chrome's extension architecture. The service worker serves as the central hub, managing state and coordinating between the popup UI and content scripts. Use TypeScript throughout to maintain type safety across contexts, implement proper error handling for robustness, and test thoroughly before publishing. Follow the publishing checklist to ensure your extension passes review and provides a great user experience.
