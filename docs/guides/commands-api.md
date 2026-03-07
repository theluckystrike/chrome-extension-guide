# Commands API Guide

## Overview
The Chrome Commands API enables keyboard shortcuts for your extension, allowing power users to trigger actions quickly without clicking through menus. This API is essential for building productivity-focused extensions.

## Defining Commands in manifest.json
Commands are declared in the manifest under the `"commands"` key. Each command has a name, description, and optional default keybinding.

```json
{
  "name": "My Extension",
  "version": "1.0",
  "manifest_version": 3,
  "commands": {
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+F",
        "mac": "Command+Shift+F"
      },
      "description": "Toggle the main feature"
    },
    "open-dialog": {
      "suggested_key": {
        "default": "Alt+D",
        "mac": "Option+D"
      },
      "description": "Open the dialog"
    }
  }
}
```

## chrome.commands.getAll — Listing All Registered Commands
Use `chrome.commands.getAll()` to retrieve all commands registered by your extension, including user-modified shortcuts.

```javascript
chrome.commands.getAll((commands) => {
  commands.forEach((command) => {
    console.log(`Command: ${command.name}`);
    console.log(`Shortcut: ${command.shortcut || 'Not set'}`);
    console.log(`Description: ${command.description}`);
  });
});
```

This returns an array of `Command` objects with properties: `name`, `description`, `shortcut`, and `isGlobal`.

## chrome.commands.onCommand — Keyboard Shortcut Handler
Listen for when users trigger a command using `onCommand.addListener()`:

```javascript
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'toggle-feature':
      toggleFeature();
      break;
    case 'open-dialog':
      openDialog();
      break;
  }
});

function toggleFeature() {
  chrome.action.setBadgeText({ text: 'ON' });
  chrome.storage.local.set({ featureEnabled: true });
}

function openDialog() {
  chrome.windows.create({
    url: 'dialog.html',
    type: 'popup',
    width: 400,
    height: 300
  });
}
```

## Special Commands: _execute_action and _execute_page_action
Chrome provides two built-in commands for triggering UI elements:

- `_execute_action` — Triggers the extension's action (toolbar icon click)
- `_execute_page_action` — Triggers the page action (legacy)

```json
{
  "commands": {
    "execute-action": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "Simulate clicking the extension icon"
    }
  }
}
```

## Suggested Key Combinations and Modifiers
### Standard Modifiers
| Modifier | Windows/Linux | macOS |
|----------|---------------|-------|
| Ctrl | Ctrl | Command (⌘) |
| Alt | Alt | Option (⌥) |
| Shift | Shift | Shift (⇧) |
| Search | Search | Command (⌘) |

### Common Patterns
- **Ctrl+Shift+Key**: Less likely to conflict with browser shortcuts
- **Alt+Key**: Good for extension-specific actions
- **Function keys (F1-F12)**: Available but may conflict with browser/devtools

```json
{
  "commands": {
    "quick-action": {
      "suggested_key": {
        "default": "Ctrl+Shift+1",
        "mac": "Command+Shift+1"
      },
      "description": "Quick action"
    }
  }
}
```

## Platform-Specific Key Differences
Always provide platform-specific keybindings using the `suggested_key` object:

```json
{
  "commands": {
    "toggle-mode": {
      "suggested_key": {
        "default": "Ctrl+Shift+M",
        "linux": "Ctrl+Shift+M",
        "mac": "Command+Shift+M",
        "windows": "Ctrl+Shift+M"
      },
      "description": "Toggle mode"
    }
  }
}
```

### Key Naming Conventions
- **Ctrl** vs **Command**: Use `Ctrl` for Windows/Linux, `Command` for macOS
- **Plus signs**: Separate keys with `+` (e.g., `Ctrl+Shift+A`)
- **Spaces**: Allowed in descriptions but not in key strings

## User-Customizable Shortcuts
Users can customize shortcuts via **chrome://extensions/shortcuts** or the extensions management page. Your extension receives these customizations automatically through `onCommand`.

```javascript
// Check user's current shortcut
chrome.commands.getAll((commands) => {
  const myCommand = commands.find(c => c.name === 'toggle-feature');
  if (myCommand?.shortcut) {
    console.log('User customized shortcut:', myCommand.shortcut);
  }
});
```

## Global vs Extension-Scoped Shortcuts
By default, commands only work when the extension has focus. Use `global` property for browser-wide shortcuts:

```json
{
  "commands": {
    "global-toggle": {
      "suggested_key": {
        "default": "Ctrl+Shift+H"
      },
      "description": "Global toggle (requires 'global' permission)",
      "global": true
    }
  }
}
```

**Note**: Global shortcuts require the `"commands"` permission and may require user approval. They cannot use Ctrl+Shift+Key combinations (reserved by Chrome).

## Default Key Combination Best Practices
1. **Avoid conflicts**: Don't use single keys or common browser shortcuts
2. **Use modifiers**: Always include at least one modifier (Ctrl, Alt, Shift)
3. **Provide macOS equivalents**: Mac users expect Command-based shortcuts
4. **Document fallbacks**: Let users know they can customize in chrome://extensions

### Recommended Patterns
- `Ctrl+Shift+[0-9]`: Number shortcuts for quick access
- `Ctrl+Alt+[Letter]`: Alternative for cross-platform consistency
- `Ctrl+Shift+[Letter]`: Popular but may conflict with browser

## Conflict Resolution with Browser Shortcuts
Chrome warns users about conflicts when setting shortcuts in chrome://extensions. Your extension should handle this gracefully:

```javascript
chrome.commands.onCommand.addListener((command) => {
  // Always verify state before acting
  chrome.storage.local.get(['isEnabled'], (result) => {
    if (result.isEnabled) {
      executeCommand(command);
    }
  });
});
```

### Common Conflicts to Avoid
- `Ctrl+N`: New window
- `Ctrl+T`: New tab
- `Ctrl+W`: Close tab
- `Ctrl+Tab`: Next tab
- `Ctrl+Shift+T`: Reopen closed tab

## Building a Power-User Extension with Shortcuts
Here's a complete example combining multiple concepts:

```javascript
// manifest.json
{
  "name": "Power Tools",
  "version": "1.0",
  "manifest_version": 3,
  "commands": {
    "toggle-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "Command+Shift+P"
      },
      "description": "Toggle side panel"
    },
    "quick-search": {
      "suggested_key": {
        "default": "Ctrl+Shift+Space",
        "mac": "Command+Shift+Space"
      },
      "description": "Quick search"
    },
    "execute-action": {
      "suggested_key": {
        "default": "Ctrl+Shift+X",
        "mac": "Command+Shift+X"
      },
      "description": "Execute main action"
    }
  }
}

// background.js
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-panel':
      await togglePanel();
      break;
    case 'quick-search':
      await openQuickSearch();
      break;
    case 'execute-action':
      await executeMainAction();
      break;
  }
});

async function togglePanel() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
}

async function openQuickSearch() {
  chrome.windows.create({
    url: 'quick-search.html',
    type: 'popup',
    width: 500,
    height: 400
  });
}

async function executeMainAction() {
  // Execute the extension's main action
  chrome.runtime.sendMessage({ action: 'runMainAction' });
}
```

## Reference
- [Commands API - Chrome Extensions](https://developer.chrome.com/docs/extensions/reference/api/commands)
- [Manifest - Commands](https://developer.chrome.com/docs/extensions/mv3/manifest/commands)
- [User-Defined Shortcuts](https://developer.chrome.com/docs/extensions/mv3/manifest/commands#user-defined)
