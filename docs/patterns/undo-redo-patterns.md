---
layout: default
title: "Chrome Extension Undo Redo Patterns — Best Practices"
description: "Implement undo/redo functionality in extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/undo-redo-patterns/"
---

# Undo/Redo Patterns for Chrome Extensions

This guide covers implementing undo/redo functionality in Chrome extensions using proven patterns.

## Command Pattern {#command-pattern}

The Command pattern is the foundation for undo/redo systems. Each action is wrapped as a command object:

```typescript
interface Command {
  execute(): Promise<void> | void;
  undo(): Promise<void> | void;
}

class DeleteBookmarkCommand implements Command {
  constructor(private bookmarkId: string, private bookmarkData: BookmarkItem) {}
  
  execute(): void {
    chrome.bookmarks.remove(this.bookmarkId);
  }
  
  undo(): void {
    chrome.bookmarks.create({
      title: this.bookmarkData.title,
      url: this.bookmarkData.url,
      parentId: this.bookmarkData.parentId
    });
  }
}
```

## Stack Management {#stack-management}

Maintain two stacks: one for undo and one for redo:

```typescript
class UndoManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxDepth = 50;
  
  async execute(command: Command): Promise<void> {
    await command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo on new action
    
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
  }
  
  async undo(): Promise<void> {
    const command = this.undoStack.pop();
    if (command) {
      await command.undo();
      this.redoStack.push(command);
    }
  }
  
  async redo(): Promise<void> {
    const command = this.redoStack.pop();
    if (command) {
      await command.execute();
      this.undoStack.push(command);
    }
  }
}
```

## Snapshot vs Diff Approaches {#snapshot-vs-diff-approaches}

### Snapshot Approach {#snapshot-approach}
Save complete state before each change. Simpler to implement:

```typescript
class SnapshotManager {
  private history: Map<string, any>[] = [];
  
  snapshot(key: string): void {
    chrome.storage.local.get(key, (result) => {
      this.history.push({ key, state: result[key] });
    });
  }
  
  async undo(key: string): Promise<void> {
    const snapshot = this.history.pop();
    if (snapshot?.key === key) {
      await chrome.storage.local.set({ [key]: snapshot.state });
    }
  }
}
```

### Diff-Based Approach {#diff-based-approach}
Save only changes. More memory efficient for large states:

```typescript
interface Diff {
  key: string;
  oldValue: any;
  newValue: any;
}

class DiffManager {
  private diffs: Diff[] = [];
  
  recordDiff(key: string, oldValue: any, newValue: any): void {
    this.diffs.push({ key, oldValue, newValue });
  }
  
  async undo(key: string): Promise<void> {
    const diff = this.diffs.pop();
    if (diff?.key === key) {
      await chrome.storage.local.set({ [key]: diff.oldValue });
    }
  }
}
```

## Storage Persistence {#storage-persistence}

Serialize undo history to chrome.storage for persistence across sessions:

```typescript
class PersistentUndoManager extends UndoManager {
  async save(): Promise<void> {
    const data = {
      undoStack: this.undoStack,
      redoStack: this.redoStack
    };
    await chrome.storage.local.set({ undoHistory: data });
  }
  
  async load(): Promise<void> {
    const result = await chrome.storage.local.get('undoHistory');
    if (result.undoHistory) {
      // Restore stacks from serialized data
    }
  }
}
```

## Keyboard Shortcuts {#keyboard-shortcuts}

Register Ctrl+Z (undo) and Ctrl+Shift+Z or Ctrl+Y (redo) in manifest.json:

```json
{
  "commands": {
    "undo": {
      "suggested_key": "Ctrl+Z",
      "description": "Undo last action"
    },
    "redo": {
      "suggested_key": "Ctrl+Shift+Z",
      "description": "Redo last action"
    }
  }
}
```

## UI: Undo Toast Notification {#ui-undo-toast-notification}

Display a temporary toast with undo option:

```typescript
function showUndoToast(message: string, onUndo: () => void): void {
  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  toast.innerHTML = `
    <span>${message}</span>
    <button class="undo-btn">Undo</button>
  `;
  
  toast.querySelector('.undo-btn').addEventListener('click', onUndo);
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 5000); // Auto-dismiss after 5s
}
```

## Best Practices {#best-practices}

1. **Limit stack size**: Set maxDepth (50 recommended) to control memory
2. **Batch operations**: Combine related small operations into single undoable actions
3. **Handle destructive actions carefully**: Always store sufficient data to restore state
4. **Persist critical undo history**: Use chrome.storage for important operations
5. **Provide clear feedback**: Show undo toast for user actions

## Related Patterns {#related-patterns}

- [State Management](./state-management.md)
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)
- [Keyboard Shortcuts](../guides/keyboard-shortcuts.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
