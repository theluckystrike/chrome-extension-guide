---
layout: default
title: "Chrome Extension Extension Command Palette — Best Practices"
description: "Implement a command palette for quick extension actions and navigation."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/extension-command-palette/"
---

# Command Palette Pattern for Chrome Extensions

A command palette provides a powerful keyboard-driven interface for accessing extension functionality, similar to VS Code's popular Ctrl+Shift+P launcher. This pattern has become essential for power users who want to navigate and control extensions efficiently without reaching for the mouse. By implementing a well-designed command palette, you can significantly improve your extension's usability and user satisfaction.

## Why Command Palettes Matter

Command palettes have become a standard UI pattern in modern applications because they:

- Enable rapid navigation without mouse interaction
- Provide discoverability for advanced features
- Reduce the number of toolbar buttons needed
- Create a consistent, predictable interface
- Support keyboard-only workflows preferred by power users

## Activation

The first step is registering a global keyboard shortcut in your manifest.json that triggers the command palette:

```json
{
  "commands": {
    "toggle-command-palette": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "MacCtrl+Shift+P"
      },
      "description": "Toggle command palette"
    }
  }
}
```

Chrome's Commands API provides built-in keyboard shortcut handling. The shortcut can be customized by users in Chrome's extension settings, but you provide sensible defaults.

Listen for the command in the background script and inject the palette via content script:

```javascript
// background.js
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-command-palette') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject the command palette into the current page
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: togglePalette
    });
  }
});

function togglePalette() {
  const existing = document.getElementById('extension-command-palette');
  if (existing) {
    existing.remove();
  } else {
    createPalette();
  }
}

function createPalette() {
  // Palette creation code here
}
```

## UI Structure

Design the command palette as a full-width overlay at the top of the page for maximum visibility:

```html
<div id="extension-command-palette" class="palette-hidden">
  <div class="palette-container">
    <div class="palette-header">
      <input 
        type="text" 
        id="palette-input" 
        placeholder="Type a command or search..."
        autocomplete="off"
        spellcheck="false"
      >
    </div>
    <div id="palette-results" class="palette-results"></div>
    <div class="palette-footer">
      <span class="hint">↑↓ Navigate</span>
      <span class="hint">↵ Execute</span>
      <span class="hint">Esc Close</span>
    </div>
  </div>
</div>
```

```css
#extension-command-palette {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  max-width: 90vw;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 16px 70px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.palette-hidden {
  display: none;
}

.palette-container {
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

#palette-input {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  border: none;
  border-bottom: 1px solid #eee;
  outline: none;
}

.palette-results {
  overflow-y: auto;
  max-height: 300px;
}

.palette-footer {
  padding: 8px 16px;
  background: #f5f5f5;
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}
```

## Fuzzy Search Algorithm

Implement fuzzy matching to help users find commands even with typos. Consecutive character matches should score higher:

```javascript
function fuzzyMatch(query, target) {
  if (!query || !target) return null;
  
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  let score = 0;
  let lastIndex = -1;
  let consecutiveBonus = 0;
  
  for (let i = 0; i < queryLower.length; i++) {
    const char = queryLower[i];
    const searchFrom = lastIndex + 1;
    const index = targetLower.indexOf(char, searchFrom);
    
    if (index === -1) {
      // Non-matching character - penalize but don't fail
      score -= 5;
      continue;
    }
    
    // Base score for matching
    score += 10;
    
    // Bonus for consecutive matches
    if (index === searchFrom) {
      consecutiveBonus += 5;
      score += consecutiveBonus;
    } else {
      consecutiveBonus = 0;
    }
    
    // Bonus for matching at word boundaries
    if (index === 0 || target[index - 1] === ' ' || target[index - 1] === '-') {
      score += 15;
    }
    
    // Bonus for matching camelCase
    if (target[index] === target[index].toUpperCase() && target[index] !== target[index].toLowerCase()) {
      score += 10;
    }
    
    lastIndex = index;
  }
  
  return { score, matched: lastIndex !== -1 };
}

function rankCommands(query, commands) {
  return commands
    .map(cmd => {
      const titleScore = fuzzyMatch(query, cmd.title);
      const descScore = fuzzyMatch(query, cmd.description || '');
      
      return {
        ...cmd,
        score: Math.max(
          titleScore?.score || 0,
          descScore?.score || 0
        ),
        matched: (titleScore?.matched || descScore?.matched)
      };
    })
    .filter(cmd => cmd.matched)
    .sort((a, b) => b.score - a.score);
}
```

## Command Registry

Create a flexible command registry that supports dynamic registration and categorization:

```javascript
class CommandRegistry {
  constructor() {
    this.commands = [];
    this.categories = new Map();
  }

  register(command) {
    // Validate command structure
    if (!command.id || !command.title || !command.handler) {
      throw new Error('Command must have id, title, and handler');
    }
    
    // Set defaults
    const cmd = {
      description: '',
      category: 'General',
      shortcut: null,
      condition: null,
      ...command
    };
    
    this.commands.push(cmd);
    
    // Track categories
    if (!this.categories.has(cmd.category)) {
      this.categories.set(cmd.category, []);
    }
    this.categories.get(cmd.category).push(cmd);
    
    return this;
  }

  unregister(commandId) {
    const index = this.commands.findIndex(c => c.id === commandId);
    if (index !== -1) {
      const [removed] = this.commands.splice(index, 1);
      const categoryCommands = this.categories.get(removed.category);
      const catIndex = categoryCommands?.indexOf(removed);
      if (catIndex !== -1) {
        categoryCommands.splice(catIndex, 1);
      }
    }
    return this;
  }

  getCommands(context = {}) {
    return this.commands
      .filter(cmd => !cmd.condition || cmd.condition(context))
      .sort((a, b) => {
        // Sort by category first, then alphabetically
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.title.localeCompare(b.title);
      });
  }

  execute(commandId, context = {}) {
    const command = this.commands.find(c => c.id === commandId);
    if (command && (!command.condition || command.condition(context))) {
      return command.handler(context);
    }
    return Promise.reject(new Error(`Command ${commandId} not found or not available`));
  }
}

const commands = new CommandRegistry();

// Register extension commands
commands.register({
  id: 'tab-close',
  title: 'Tab > Close',
  description: 'Close the current tab',
  category: 'Tabs',
  shortcut: 'Ctrl+W',
  handler: async ({ tab }) => {
    await chrome.tabs.remove(tab.id);
  }
});

commands.register({
  id: 'tab-pin',
  title: 'Tab > Pin',
  description: 'Pin or unpin the current tab',
  category: 'Tabs',
  handler: async ({ tab }) => {
    await chrome.tabs.update(tab.id, { pinned: !tab.pinned });
  }
});

commands.register({
  id: 'bookmark-add',
  title: 'Bookmark > Add',
  description: 'Add current page to bookmarks',
  category: 'Bookmarks',
  handler: async ({ tab }) => {
    await chrome.bookmarks.create({
      title: tab.title,
      url: tab.url
    });
  }
});
```

## Dynamic Commands

Filter commands based on current context such as page URL or extension permissions:

```javascript
function getContextualCommands(tab, extensionContext) {
  const allCommands = commands.getCommands({ tab });
  
  return allCommands.filter(cmd => {
    // Check URL-based conditions
    if (cmd.requiresUrl && !isValidUrl(tab.url, cmd.requiresUrl)) {
      return false;
    }
    
    // Check permission-based conditions
    if (cmd.requiresPermission) {
      return hasPermission(extensionContext, cmd.requiresPermission);
    }
    
    // Check platform conditions
    if (cmd.platform && cmd.platform !== getCurrentPlatform()) {
      return false;
    }
    
    return true;
  });
}

function isValidUrl(url, pattern) {
  if (typeof pattern === 'string') {
    return url.includes(pattern);
  }
  if (pattern instanceof RegExp) {
    return pattern.test(url);
  }
  if (Array.isArray(pattern)) {
    return pattern.some(p => isValidUrl(url, p));
  }
  return true;
}
```

## Keyboard Navigation

Implement comprehensive keyboard navigation for accessibility and efficiency:

```javascript
class PaletteKeyboardNavigator {
  constructor() {
    this.selectedIndex = 0;
    this.commands = [];
  }

  init(commands) {
    this.commands = commands;
    this.selectedIndex = 0;
    this.render();
  }

  moveSelection(delta) {
    this.selectedIndex = Math.max(0, Math.min(
      this.commands.length - 1,
      this.selectedIndex + delta
    ));
    this.render();
    this.scrollToSelected();
  }

  selectFirst() {
    this.selectedIndex = 0;
    this.render();
  }

  selectLast() {
    this.selectedIndex = this.commands.length - 1;
    this.render();
  }

  scrollToSelected() {
    const selected = document.querySelector('.palette-command.selected');
    selected?.scrollIntoView({ block: 'nearest' });
  }

  handleKeyDown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveSelection(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveSelection(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.selectFirst();
        break;
      case 'End':
        event.preventDefault();
        this.selectLast();
        break;
      case 'PageDown':
        event.preventDefault();
        this.moveSelection(10);
        break;
      case 'PageUp':
        event.preventDefault();
        this.moveSelection(-10);
        break;
      case 'Enter':
        event.preventDefault();
        return this.executeSelected();
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
    return false;
  }

  executeSelected() {
    const command = this.commands[this.selectedIndex];
    if (command) {
      commands.execute(command.id, { tab: currentTab });
      this.close();
      return true;
    }
    return false;
  }

  close() {
    document.getElementById('extension-command-palette')?.remove();
  }

  render() {
    const results = document.getElementById('palette-results');
    results.innerHTML = this.commands.map((cmd, index) => `
      <div class="palette-command ${index === this.selectedIndex ? 'selected' : ''}" 
           data-command-id="${cmd.id}">
        <div class="command-title">${cmd.title}</div>
        <div class="command-description">${cmd.description || ''}</div>
        ${cmd.shortcut ? `<div class="command-shortcut">${cmd.shortcut}</div>` : ''}
      </div>
    `).join('');
  }
}
```

## Categories and Sub-commands

Organize commands hierarchically for easier discovery:

```javascript
// Category definitions with icons
const categoryConfig = {
  'Tabs': { icon: '📑', color: '#4285F4' },
  'Bookmarks': { icon: '🔖', color: '#FBBC05' },
  'Settings': { icon: '⚙️', color: '#34A853' },
  'Tools': { icon: '🔧', color: '#EA4335' },
  'Navigation': { icon: '🧭', color: '#9334E6' }
};

// Hierarchical commands using > separator
commands.register({
  id: 'tab-duplicate',
  title: 'Tab > Duplicate',
  description: 'Create a copy of the current tab',
  category: 'Tabs',
  handler: async ({ tab }) => {
    await chrome.tabs.duplicate(tab.id);
  }
});

commands.register({
  id: 'tab-mute',
  title: 'Tab > Mute/Unmute',
  description: 'Toggle audio mute for current tab',
  category: 'Tabs',
  handler: async ({ tab }) => {
    await chrome.tabs.update(tab.id, { muted: !tab.mutedInfo.muted });
  }
});
```

## Result Preview

Show detailed information for the highlighted command:

```javascript
function renderPreview(command) {
  const preview = document.getElementById('command-preview');
  if (!command) {
    preview.classList.add('hidden');
    return;
  }
  
  preview.classList.remove('hidden');
  preview.innerHTML = `
    <div class="preview-title">${command.title}</div>
    <div class="preview-description">${command.description}</div>
    ${command.shortcut ? `<div class="preview-shortcut">Shortcut: ${command.shortcut}</div>` : ''}
    <div class="preview-category">Category: ${command.category}</div>
  `;
}
```

## Common Use Cases

### 1. Quick Tab Management
Users often need to quickly close, pin, or reorder tabs without reaching for the mouse. Command palette provides instant access:

```javascript
commands.register({
  id: 'tab-reload-all',
  title: 'Tab > Reload All',
  description: 'Reload all tabs in current window',
  category: 'Tabs',
  handler: async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    tabs.forEach(tab => chrome.tabs.reload(tab.id));
  }
});
```

### 2. Bookmark Operations
Quick bookmark creation and management without navigating through menus:

```javascript
commands.register({
  id: 'bookmark-search',
  title: 'Bookmark > Search',
  description: 'Search through bookmarks',
  category: 'Bookmarks',
  handler: async ({ query }) => {
    const results = await chrome.bookmarks.search({ query });
    // Display bookmark search results
  }
});
```

### 3. Extension Settings
Give users quick access to toggle extension features:

```javascript
commands.register({
  id: 'settings-toggle-dark',
  title: 'Settings > Toggle Dark Mode',
  description: 'Enable or disable extension dark mode',
  category: 'Settings',
  handler: async () => {
    const { darkMode } = await chrome.storage.local.get('darkMode');
    await chrome.storage.local.set({ darkMode: !darkMode });
  }
});
```

## Best Practices

1. **Provide meaningful defaults**: Choose shortcuts that don't conflict with common browser shortcuts
2. **Support fuzzy matching**: Users shouldn't need to type exact command names
3. **Show keyboard hints**: Display available shortcuts in the UI
4. **Categorize commands**: Group related commands for easier discovery
5. **Track frequently used**: Prioritize commands the user runs most often
6. **Handle errors gracefully**: Show clear error messages when commands fail
7. **Support mouse interaction**: Not all users prefer keyboard navigation
8. **Keep it fast**: Command palette should appear and respond instantly
9. **Persist user preferences**: Remember the last selected command
10. **Test thoroughly**: Ensure the palette works on various websites

## Cross-references

- [Command Palette Overview](../patterns/command-palette.md)
- [Keyboard Shortcuts Guide](../guides/keyboard-shortcuts.md)
- [Commands API Reference](../api-reference/commands-api.md)
- [Popup Patterns](./popup-patterns.md)
- [Message Passing](../reference/message-passing-patterns.md)
