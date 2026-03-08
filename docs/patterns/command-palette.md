---
layout: default
title: "Chrome Extension Command Palette — Best Practices"
description: "Build command palettes for quick access to features."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/command-palette/"
---

# Command Palette Pattern

The command palette pattern brings VS Code-style functionality to Chrome Extensions, combining keyboard shortcuts, fuzzy search, and quick actions into a unified interface that users love.

## Overview

A command palette provides:
- Quick access to all extension features via keyboard
- Fuzzy search across commands by title, description, and keywords
- Keyboard-driven navigation without mouse interaction
- Consistent UX familiar from VS Code, Slack, and other apps

---

## Architecture

The command palette consists of three interconnected components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Script                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │  Palette UI │◄───│  Key Handler│    │ Shadow DOM  │    │
│  │  (injected) │    │  (Ctrl+Shift+K)   │  (isolated) │    │
│  └──────┬──────┘         └──────┬──────┘              │    │
│         │                       │                      │    │
└─────────┼───────────────────────┼──────────────────────┼────┘
          │                       │                      │
          │        chrome.runtime.sendMessage            │
          ▼                       ▼                      │
┌─────────────────────────────────────────────────────────────┐
│                    Service Worker                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Command   │    │    Message  │    │   Handler   │    │
│  │  Registry   │◄───│   Listener │───►│   Executor  │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| Content Script | Inject palette UI, capture keyboard events, handle navigation |
| Service Worker | Store command registry, execute handlers, manage state |
| @theluckystrike/webext-messaging | Connect UI to handlers, type-safe communication |

---

## Pattern 1: Command Registry

Define commands as objects with metadata for search and execution:

```typescript
// src/commands/registry.ts
export interface Command {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  handler: (tab: chrome.tabs.Tab) => Promise<void>;
}

export const commandRegistry: Command[] = [
  {
    id: 'open-settings',
    title: 'Open Settings',
    description: 'Navigate to extension settings page',
    keywords: ['preferences', 'config', 'options'],
    handler: async () => {
      chrome.runtime.openOptionsPage();
    }
  },
  {
    id: 'toggle-dark-mode',
    title: 'Toggle Dark Mode',
    description: 'Switch between light and dark themes',
    keywords: ['theme', 'dark', 'light', 'mode'],
    handler: async (tab) => {
      await chrome.tabs.sendMessage(tab.id!, { action: 'toggle-theme' });
    }
  },
  {
    id: 'capture-screenshot',
    title: 'Capture Screenshot',
    description: 'Take a screenshot of the current page',
    keywords: ['capture', 'image', 'screen', 'snapshot'],
    handler: async (tab) => {
      await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    }
  }
];

export function getCommands(): Command[] {
  return commandRegistry;
}
```

---

## Pattern 2: Keyboard Trigger

Use `chrome.commands` to define the palette shortcut in your manifest:

```json
{
  "commands": {
    "open-command-palette": {
      "suggested_key": {
        "default": "Ctrl+Shift+K",
        "mac": "Command+Shift+K"
      },
      "description": "Open command palette"
    }
  }
}
```

Listen for the command in your content script:

```typescript
// src/content/command-palette.ts
import { getCommands } from '../commands/registry';

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-command-palette') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: showCommandPalette
    });
  }
});

function showCommandPalette() {
  // Palette injection logic
}
```

---

## Pattern 3: Palette UI with Shadow DOM

Inject an isolated modal overlay using Shadow DOM for style encapsulation:

```typescript
// src/content/palette-ui.ts

interface PaletteItem {
  id: string;
  title: string;
  description: string;
  keywords: string[];
}

export function createPalette(commands: PaletteItem[]): HTMLElement {
  // Create shadow host
  const host = document.createElement('div');
  host.id = 'command-palette-host';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    .palette-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; justify-content: center; padding-top: 100px;
      font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .palette-modal {
      width: 600px; max-height: 400px;
      background: #1e1e1e; border-radius: 8px;
      box-shadow: 0 16px 70px rgba(0,0,0,0.5);
      overflow: hidden; display: flex; flex-direction: column;
    }
    .search-input {
      width: 100%; padding: 16px; font-size: 16px;
      background: #252526; border: none; color: #ccc;
      outline: none; border-bottom: 1px solid #3c3c3c;
    }
    .results {
      overflow-y: auto; flex: 1; list-style: none;
      margin: 0; padding: 0;
    }
    .result-item {
      padding: 10px 16px; cursor: pointer;
      display: flex; flex-direction: column; gap: 2px;
    }
    .result-item.selected {
      background: #094771;
    }
    .result-title { color: #fff; font-weight: 500; }
    .result-desc { color: #888; font-size: 12px; }
    .no-results { padding: 20px; color: #666; text-align: center; }
  `;
  shadow.appendChild(style);

  // Modal structure
  const overlay = document.createElement('div');
  overlay.className = 'palette-overlay';
  
  const modal = document.createElement('div');
  modal.className = 'palette-modal';
  
  const input = document.createElement('input');
  input.className = 'search-input';
  input.placeholder = 'Type a command...';
  input.autofocus = true;

  const results = document.createElement('ul');
  results.className = 'results';

  modal.appendChild(input);
  modal.appendChild(results);
  overlay.appendChild(modal);
  shadow.appendChild(overlay);

  return { overlay, input, results, host };
}
```

---

## Pattern 4: Fuzzy Search & Keyboard Navigation

Implement fuzzy filtering and keyboard-driven selection:

```typescript
// src/content/search.ts

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  let qi = 0;
  for (let i = 0; i < lowerText.length && qi < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[qi]) qi++;
  }
  return qi === lowerQuery.length;
}

export function filterCommands(commands: Command[], query: string): Command[] {
  if (!query) return commands;
  
  const lowerQuery = query.toLowerCase();
  
  return commands.filter(cmd => {
    // Match title
    if (fuzzyMatch(cmd.title, lowerQuery)) return true;
    // Match description
    if (fuzzyMatch(cmd.description, lowerQuery)) return true;
    // Match keywords
    return cmd.keywords.some(kw => fuzzyMatch(kw, lowerQuery));
  }).sort((a, b) => {
    // Prioritize title matches over keyword matches
    const aTitle = fuzzyMatch(a.title, lowerQuery);
    const bTitle = fuzzyMatch(b.title, lowerQuery);
    if (aTitle && !bTitle) return -1;
    if (!aTitle && bTitle) return 1;
    return 0;
  });
}

export function handleKeyboardNavigation(
  event: KeyboardEvent,
  selectedIndex: number,
  totalItems: number
): number {
  switch (event.key) {
    case 'ArrowDown':
      return (selectedIndex + 1) % totalItems;
    case 'ArrowUp':
      return (selectedIndex - 1 + totalItems) % totalItems;
    case 'Enter':
      return -1; // Signal selection
    case 'Escape':
      return -2; // Signal close
    default:
      return selectedIndex;
  }
}
```

---

## Pattern 5: Action Execution

Send selected command to service worker for execution:

```typescript
// src/content/command-palette.ts

export async function executeCommand(commandId: string, tab: chrome.tabs.Tab) {
  try {
    await chrome.runtime.sendMessage({
      type: 'EXECUTE_COMMAND',
      payload: { commandId, tabId: tab.id }
    });
  } catch (error) {
    console.error('Command execution failed:', error);
  }
}

// In your service worker (background.ts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_COMMAND') {
    const command = commandRegistry.find(c => c.id === message.payload.commandId);
    if (command) {
      command.handler(sender.tab!).then(() => {
        sendResponse({ success: true });
      });
      return true; // Keep message channel open for async response
    }
  }
});
```

---

## Complete Integration

Putting it all together in your content script:

```typescript
// src/content/main.ts

import { createPalette } from './palette-ui';
import { filterCommands, handleKeyboardNavigation } from './search';
import { getCommands, Command } from '../commands/registry';

let palette: ReturnType<typeof createPalette>;
let commands: Command[];
let filteredCommands: Command[];
let selectedIndex = 0;

document.addEventListener('keydown', async (e) => {
  // Ctrl+Shift+K to open palette
  if (e.ctrlKey && e.shiftKey && e.key === 'K') {
    e.preventDefault();
    await openPalette();
  }
});

async function openPalette() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  commands = getCommands();
  filteredCommands = [...commands];
  selectedIndex = 0;

  palette = createPalette(commands);
  renderResults();

  // Focus input
  const input = palette.input as HTMLInputElement;
  input.focus();

  // Input handler
  input.addEventListener('input', () => {
    filteredCommands = filterCommands(commands, input.value);
    selectedIndex = 0;
    renderResults();
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    const newIndex = handleKeyboardNavigation(e, selectedIndex, filteredCommands.length);
    
    if (newIndex === -2) {
      closePalette();
    } else if (newIndex >= 0) {
      selectedIndex = newIndex;
      renderResults();
    } else if (newIndex === -1 && filteredCommands[selectedIndex]) {
      executeAndClose(filteredCommands[selectedIndex].id, tab!);
    }
  });

  // Close on overlay click
  palette.overlay.addEventListener('click', (e) => {
    if (e.target === palette.overlay) closePalette();
  });
}

function renderResults() {
  const { results } = palette;
  results.innerHTML = '';

  if (filteredCommands.length === 0) {
    results.innerHTML = '<li class="no-results">No commands found</li>';
    return;
  }

  filteredCommands.forEach((cmd, index) => {
    const li = document.createElement('li');
    li.className = `result-item ${index === selectedIndex ? 'selected' : ''}`;
    li.innerHTML = `
      <span class="result-title">${cmd.title}</span>
      <span class="result-desc">${cmd.description}</span>
    `;
    li.addEventListener('click', () => executeAndClose(cmd.id, tab!));
    results.appendChild(li);
  });
}

function executeAndClose(commandId: string, tab: chrome.tabs.Tab) {
  closePalette();
  chrome.runtime.sendMessage({
    type: 'EXECUTE_COMMAND',
    payload: { commandId, tabId: tab.id }
  });
}

function closePalette() {
  palette.host.remove();
}
```

---

## Best Practices

1. **Shadow DOM isolation** — Prevent page styles from affecting your palette
2. **Fuzzy matching** — Use fuzzy search for forgiving input matching
3. **Debounce queries** — For large command sets, debounce search input
4. **Keyboard-first** — Ensure full navigation without mouse
5. **Recent commands** — Track and prioritize recently used commands
6. **Loading states** — Show loading indicators for async commands
7. **Error handling** — Display errors in the palette for failed commands

---

## Related Patterns

- [Keyboard Shortcuts API](/docs/patterns/keyboard-shortcuts-api) — Global shortcut configuration
- [Commands Keyboard Shortcuts](/docs/guides/commands-keyboard-shortcuts.md) — Shortcut best practices
- [Content Script Patterns](/docs/guides/content-script-patterns.md) — Safe script injection
- [Shadow DOM Advanced](/docs/patterns/shadow-dom-advanced) — Complex Shadow DOM patterns
