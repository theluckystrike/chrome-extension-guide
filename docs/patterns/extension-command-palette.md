# Command Palette Pattern for Chrome Extensions

A command palette provides a keyboard-driven interface for accessing extension functionality, similar to VS Code's Ctrl+Shift+P launcher.

## Activation

Register a global keyboard shortcut in `manifest.json`:

```json
{
  "commands": {
    "toggle-command-palette": {
      "suggested_key": { "default": "Ctrl+Shift+P", "mac": "MacCtrl+Shift+P" },
      "description": "Toggle command palette"
    }
  }
}
```

Listen for the command in the background script and inject the palette via content script.

## UI Structure

Full-width overlay at the top of the page:

```html
<div id="command-palette" class="hidden">
  <input type="text" id="palette-input" placeholder="Type a command...">
  <div id="palette-results"></div>
</div>
```

## Fuzzy Search Algorithm

Consecutive matches score higher:

```javascript
function fuzzyMatch(query, target) {
  let score = 0, lastIndex = -1;
  for (let i = 0; i < query.length; i++) {
    const index = target.indexOf(query[i], lastIndex + 1);
    if (index === -1) return null;
    score += (index === lastIndex + 1) ? 10 : 1;
    lastIndex = index;
  }
  return score;
}
```

## Command Registry

Register commands with title, description, handler, category:

```javascript
const commands = { list: [] };
commands.register = function(cmd) { this.list.push(cmd); };
commands.register({
  id: 'tab-close', title: 'Tab > Close', description: 'Close current tab',
  category: 'tabs', handler: () => chrome.tabs.remove(tab.id)
});
```

## Dynamic Commands

Filter by context (current page, permissions):

```javascript
function getContextualCommands(tab) {
  return commands.list.filter(cmd => !cmd.condition || cmd.condition(tab));
}
```

## Keyboard Navigation

Arrow keys navigate, Enter executes, Escape closes.

## Categories

Tabs, Bookmarks, Settings, Tools, Navigation.

## Sub-commands

Hierarchical commands using `>`: "Tab > Close", "Tab > Pin".

## Result Preview

Show description/shortcut for highlighted command.

## Cross-references

- [Command Palette Overview](../patterns/command-palette.md)
- [Keyboard Shortcuts Guide](../guides/keyboard-shortcuts.md)
- [Commands API Reference](../api-reference/commands-api.md)
