# Building a Kanban Board Chrome Extension

A Kanban board extension allows users to manage tasks visually across different stages, directly from their browser. This guide covers building a production-ready Kanban extension using Chrome's modern APIs, TypeScript, and best practices for state management, persistence, and cross-context communication.

## Table of Contents

- [Architecture and Manifest Setup](#architecture-and-manifest-setup)
- [Core Implementation with TypeScript](#core-implementation-with-typescript)
- [UI Design (Popup/Sidebar/Content Script Overlay)](#ui-design-popupsidebarcontent-script-overlay)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management and Storage Patterns](#state-management-and-storage-patterns)
- [Error Handling and Edge Cases](#error-handling-and-edge-cases)
- [Testing Approach](#testing-approach)
- [Code Examples](#code-examples)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture and Manifest Setup

### Manifest Version 3

All modern extensions should use Manifest V3. Here's the manifest structure for a Kanban board:

```json
{
  "manifest_version": 3,
  "name": "Kanban Board",
  "version": "1.0.0",
  "description": "Manage your tasks with a beautiful Kanban board",
  "permissions": [
    "storage",
    "tabs"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["content/content.css"]
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Project Directory Structure

```
kanban-extension/
 manifest.json
 tsconfig.json
 webpack.config.js
 src/
    background/
       index.ts
       types.ts
    popup/
       popup.html
       popup.ts
       popup.css
    sidepanel/
       sidepanel.html
       sidepanel.ts
       sidepanel.css
    content/
       content.ts
       content.css
    shared/
       types.ts
       storage.ts
       events.ts
    utils/
        logger.ts
 public/
    icons/
 tests/
     background.test.ts
```

---

Core Implementation with TypeScript

Shared Types

Define your core data models in `src/shared/types.ts`:

```typescript
// Core Kanban types
export interface Task {
  id: string;
  title: string;
  description: string;
  columnId: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface Column {
  id: string;
  title: string;
  order: number;
}

export interface Board {
  id: string;
  name: string;
  columns: Column[];
  tasks: Task[];
  createdAt: number;
  updatedAt: number;
}

export interface KanbanState {
  boards: Board[];
  activeBoardId: string | null;
  dragState: {
    taskId: string | null;
    sourceColumnId: string | null;
    targetColumnId: string | null;
  };
}

// Storage keys
export const STORAGE_KEYS = {
  BOARDS: 'kanban_boards',
  SETTINGS: 'kanban_settings',
  STATE: 'kanban_state'
} as const;
```

Background Service Worker

The background service worker handles storage operations and coordinates between contexts:

```typescript
// src/background/index.ts
import { Board, Task, KanbanState, STORAGE_KEYS } from '../shared/types';

// Initialize default state
async function initializeState(): Promise<KanbanState> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATE);
  if (result[STORAGE_KEYS.STATE]) {
    return result[STORAGE_KEYS.STATE];
  }
  
  const defaultBoard: Board = {
    id: crypto.randomUUID(),
    name: 'My Board',
    columns: [
      { id: 'todo', title: 'To Do', order: 0 },
      { id: 'in-progress', title: 'In Progress', order: 1 },
      { id: 'done', title: 'Done', order: 2 }
    ],
    tasks: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  const defaultState: KanbanState = {
    boards: [defaultBoard],
    activeBoardId: defaultBoard.id,
    dragState: { taskId: null, sourceColumnId: null, targetColumnId: null }
  };
  
  await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: defaultState });
  return defaultState;
}

// Message handler for all contexts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true;
});

async function handleMessage(message: Message, sender: chrome.runtime.MessageSender) {
  const { type, payload } = message;
  
  switch (type) {
    case 'GET_STATE':
      return await initializeState();
      
    case 'ADD_TASK': {
      const state = await getState();
      const board = state.boards.find(b => b.id === state.activeBoardId);
      if (!board) throw new Error('No active board');
      
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: payload.title,
        description: payload.description || '',
        columnId: payload.columnId || board.columns[0].id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: payload.tags || [],
        priority: payload.priority || 'medium'
      };
      
      board.tasks.push(newTask);
      board.updatedAt = Date.now();
      await saveState(state);
      return board;
    }
    
    case 'MOVE_TASK': {
      const state = await getState();
      const board = state.boards.find(b => b.id === state.activeBoardId);
      if (!board) throw new Error('No active board');
      
      const task = board.tasks.find(t => t.id === payload.taskId);
      if (!task) throw new Error('Task not found');
      
      task.columnId = payload.targetColumnId;
      task.updatedAt = Date.now();
      board.updatedAt = Date.now();
      await saveState(state);
      return board;
    }
    
    case 'DELETE_TASK': {
      const state = await getState();
      const board = state.boards.find(b => b.id === state.activeBoardId);
      if (!board) throw new Error('No active board');
      
      board.tasks = board.tasks.filter(t => t.id !== payload.taskId);
      board.updatedAt = Date.now();
      await saveState(state);
      return board;
    }
    
    case 'ADD_COLUMN': {
      const state = await getState();
      const board = state.boards.find(b => b.id === state.activeBoardId);
      if (!board) throw new Error('No active board');
      
      board.columns.push({
        id: payload.id || crypto.randomUUID(),
        title: payload.title,
        order: board.columns.length
      });
      board.updatedAt = Date.now();
      await saveState(state);
      return board;
    }
  }
}

async function getState(): Promise<KanbanState> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATE);
  return result[STORAGE_KEYS.STATE];
}

async function saveState(state: KanbanState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state });
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  await initializeState();
});
```

---

UI Design

Popup View

The popup provides quick access to view and manage tasks:

```html
<!-- src/popup/popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanban Board</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app">
    <header class="popup-header">
      <h1>Kanban Board</h1>
      <button id="openSidePanel" title="Open Full Board">
        <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M14 3H2v10h12V3zm-2 8H4V5h8v6z"/></svg>
      </button>
    </header>
    <div id="taskList" class="task-list"></div>
    <footer class="popup-footer">
      <button id="addTask" class="btn-primary">+ Add Task</button>
    </footer>
  </div>
  <div id="modal" class="modal hidden">
    <div class="modal-content">
      <h2>New Task</h2>
      <form id="taskForm">
        <input type="text" id="taskTitle" placeholder="Task title" required>
        <textarea id="taskDescription" placeholder="Description (optional)"></textarea>
        <select id="taskPriority">
          <option value="low">Low Priority</option>
          <option value="medium" selected>Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        <div class="modal-actions">
          <button type="button" id="cancelTask" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Add Task</button>
        </div>
      </form>
    </div>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

Side Panel - Full Kanban Board

The side panel provides the complete Kanban experience:

```typescript
// src/sidepanel/sidepanel.ts
import { Board, Task, Column, KanbanState } from '../shared/types';
import { KanbanRenderer } from './renderer';

class SidePanelApp {
  private state: KanbanState | null = null;
  private renderer: KanbanRenderer;
  
  constructor() {
    this.renderer = new KanbanRenderer();
    this.init();
  }
  
  private async init(): Promise<void> {
    try {
      this.state = await this.loadState();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to initialize:', error);
      this.renderer.renderError('Failed to load board');
    }
  }
  
  private async loadState(): Promise<KanbanState> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  private render(): void {
    if (!this.state) return;
    const board = this.state.boards.find(b => b.id === this.state!.activeBoardId);
    if (board) {
      this.renderer.renderBoard(board);
    }
  }
  
  private attachEventListeners(): void {
    // Drag and drop handlers
    document.addEventListener('dragstart', this.handleDragStart.bind(this));
    document.addEventListener('dragover', this.handleDragOver.bind(this));
    document.addEventListener('drop', this.handleDrop.bind(this));
    document.addEventListener('dragend', this.handleDragEnd.bind(this));
  }
  
  private handleDragStart(e: DragEvent): void {
    const taskEl = e.target as HTMLElement;
    if (!taskEl.dataset.taskId) return;
    
    e.dataTransfer?.setData('text/plain', taskEl.dataset.taskId);
    taskEl.classList('dragging');
  }
  
  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    const column = (e.target as HTMLElement).closest('.column');
    if (column) {
      column.classList.add('drag-over');
    }
  }
  
  private async handleDrop(e: DragEvent): void {
    e.preventDefault();
    const taskId = e.dataTransfer?.getData('text/plain');
    const column = (e.target as HTMLElement).closest('.column');
    
    if (taskId && column?.dataset.columnId) {
      await this.moveTask(taskId, column.dataset.columnId);
    }
  }
  
  private async moveTask(taskId: string, targetColumnId: string): Promise<void> {
    const board = await this.sendMessage({
      type: 'MOVE_TASK',
      payload: { taskId, targetColumnId }
    });
    this.renderer.renderBoard(board);
  }
  
  private sendMessage(message: Message): Promise<Board> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new SidePanelApp();
});
```

---

Chrome APIs and Permissions

Required Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Persist board data and user preferences |
| `tabs` | Access current tab information for contextual actions |
| `sidePanel` | Enable the side panel feature |
| `alarms` | Schedule periodic autosave |

Using Chrome APIs in TypeScript

```typescript
// Type declarations for Chrome APIs
declare global {
  interface chrome {
    runtime: {
      sendMessage(message: Message, responseCallback?: (response: unknown) => void): void;
      onMessage: {
        addListener(callback: (message: Message, sender: MessageSender, sendResponse: (response?: unknown) => void) => void): void;
      };
      onInstalled: {
        addListener(callback: (details: { reason: string }) => void): void;
      };
    };
    storage: {
      local: {
        get(keys: string | string[] | object): Promise<Record<string, unknown>>;
        set(items: object): Promise<void>;
      };
    };
    sidePanel: {
      setOptions(options: { path: string }): Promise<void>;
    };
  }
}
```

---

State Management and Storage Patterns

Optimistic Updates with Rollback

For responsive UX, update the UI immediately, then sync with storage:

```typescript
class KanbanStore {
  private state: KanbanState;
  private listeners: Set<(state: KanbanState) => void> = new Set();
  
  constructor(initialState: KanbanState) {
    this.state = initialState;
  }
  
  async addTask(taskData: TaskInput): Promise<void> {
    // Optimistic update
    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      ...taskData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.updateState(state => {
      const board = state.boards.find(b => b.id === state.activeBoardId);
      if (board) board.tasks.push(optimisticTask);
      return state;
    });
    
    try {
      // Persist to storage
      await this.persist();
    } catch (error) {
      // Rollback on failure
      this.updateState(state => {
        const board = state.boards.find(b => b.id === state.activeBoardId);
        if (board) board.tasks = board.tasks.filter(t => t.id !== optimisticTask.id);
        return state;
      });
      throw error;
    }
  }
  
  subscribe(listener: (state: KanbanState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private updateState(updater: (state: KanbanState) => KanbanState): void {
    this.state = updater(this.state);
    this.listeners.forEach(listener => listener(this.state));
  }
  
  private async persist(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: this.state });
  }
}
```

---

Error Handling and Edge Cases

Comprehensive Error Handling

```typescript
// src/utils/error-handler.ts
export class KanbanError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'KanbanError';
  }
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`[${context}] Operation failed:`, error);
    
    if (error instanceof KanbanError && !error.recoverable) {
      // Log to analytics or error reporting service
      reportError(error, context);
    }
    
    return fallback;
  }
}

function reportError(error: Error, context: string): void {
  // Implement error reporting (e.g., Sentry, Google Analytics)
  console.error(`[ERROR:${context}]`, {
    message: error.message,
    stack: error.stack,
    timestamp: Date.now()
  });
}
```

Edge Case Handling

- Empty board: Show onboarding UI with sample data option
- Storage quota exceeded: Implement data cleanup or export
- Concurrent edits: Use last-write-wins with timestamps
- Offline mode: Cache in memory, sync when online

---

Testing Approach

Unit Tests for Core Logic

```typescript
// tests/kanban-store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('KanbanStore', () => {
  let store: KanbanStore;
  
  beforeEach(() => {
    // Mock chrome.storage
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined)
        }
      }
    } as any;
    
    store = new KanbanStore(createInitialState());
  });
  
  it('should add a task to the correct column', async () => {
    const task = { title: 'Test Task', columnId: 'todo' };
    await store.addTask(task);
    
    const board = store.getState().boards[0];
    expect(board.tasks).toHaveLength(1);
    expect(board.tasks[0].title).toBe('Test Task');
  });
  
  it('should move task between columns', async () => {
    const taskId = 'task-1';
    await store.moveTask(taskId, 'done');
    
    const board = store.getState().boards[0];
    const task = board.tasks.find(t => t.id === taskId);
    expect(task?.columnId).toBe('done');
  });
});
```

Integration Tests

- Test background service worker message handling
- Test popup-to-background communication
- Test storage persistence across extension restarts

---

Code Examples

Drag and Drop Implementation

```typescript
// src/sidepanel/drag-drop.ts
export class DragDropManager {
  private draggedElement: HTMLElement | null = null;
  private draggedTaskId: string | null = null;
  
  init(container: HTMLElement): void {
    container.addEventListener('dragstart', this.onDragStart.bind(this));
    container.addEventListener('dragover', this.onDragOver.bind(this));
    container.addEventListener('drop', this.onDrop.bind(this));
    container.addEventListener('dragend', this.onDragEnd.bind(this));
  }
  
  private onDragStart(e: DragEvent): void {
    const taskEl = (e.target as HTMLElement).closest('[data-task-id]');
    if (!taskEl) return;
    
    this.draggedElement = taskEl as HTMLElement;
    this.draggedTaskId = taskEl.getAttribute('data-task-id');
    
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', this.draggedTaskId!);
    
    requestAnimationFrame(() => {
      this.draggedElement?.classList.add('dragging');
    });
  }
  
  private onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  }
  
  private async onDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    const columnEl = (e.target as HTMLElement).closest('[data-column-id]');
    const targetColumnId = columnEl?.getAttribute('data-column-id');
    
    if (this.draggedTaskId && targetColumnId) {
      await this.onTaskDrop(this.draggedTaskId, targetColumnId);
    }
  }
  
  private onDragEnd(): void {
    this.draggedElement?.classList.remove('dragging');
    this.draggedElement = null;
    this.draggedTaskId = null;
  }
  
  private async onTaskDrop(taskId: string, targetColumnId: string): Promise<void> {
    // Emit event or call store method
  }
}
```

---

Performance Considerations

1. Lazy Loading: Only load visible columns/tasks
2. Virtual Scrolling: For boards with many tasks
3. Debounced Persistence: Batch storage writes during drag operations
4. Memoization: Cache computed values (task counts, filtered tasks)
5. Service Worker Optimization: Minimize cold start time by keeping code lean

```typescript
// Debounced storage writes
const debouncedSave = debounce((state: KanbanState) => {
  chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state });
}, 500);
```

---

Publishing Checklist

Before publishing to the Chrome Web Store:

- [ ] Manifest: Verify all permissions are necessary
- [ ] Icons: Include 16x16, 48x48, and 128x128 PNG icons
- [ ] Screenshots: Add 1280x800 or 640x400 screenshots
- [ ] Description: Write clear, concise description
- [ ] Privacy Policy: If required, host and link privacy policy
- [ ] Testing: Test on multiple Chrome versions
- [ ] Build: Run production build (minified, no source maps)
- [ ] Version: Increment version number in manifest.json

Building for Production

```bash
Using webpack or your preferred bundler
npm run build

Package using Chrome CLI or webstore upload
npx chrome-webstore-upload upload \
  --source dist.zip \
  --extension-id $EXTENSION_ID \
  --client-id $CLIENT_ID \
  --client-secret $CLIENT_SECRET \
  --refresh-token $REFRESH_TOKEN
```

---

Conclusion

Building a Kanban board Chrome extension requires careful consideration of architecture, state management, and cross-context communication. This guide covered the essential patterns for creating a production-ready extension using Manifest V3, TypeScript, and modern Chrome APIs. Key takeaways:

- Use Manifest V3 with modular TypeScript structure
- Implement optimistic updates for responsive UX
- Handle errors gracefully with fallbacks
- Test thoroughly before publishing
- Follow Chrome Web Store guidelines

With these patterns, you can build a solid and user-friendly Kanban extension that provides excellent productivity tools directly in the browser.
