# Keyboard Shortcuts in Chrome Extensions

## Introduction

Keyboard shortcuts enhance user productivity by allowing quick access to extension features. The `chrome.commands` API provides a robust system for defining, handling, and managing keyboard shortcuts.

## The chrome.commands API

- **Manifest**: Define shortcuts in `manifest.json` using `commands`
- **Listener**: Use `chrome.commands.onCommand` to respond
- **Query**: Use `chrome.commands.getAll()` to retrieve bindings
- **Customize**: Users modify via `chrome://extensions/shortcuts`

## Manifest Configuration

### Basic Structure

```json
{
  "manifest_version": 3,
  "commands": {
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Toggle the main feature on/off"
    }
  }
}
```

### Properties

- **suggested_key** (required): Default keyboard combination
- **description** (required): Shown in shortcuts UI
- **global** (optional): Works when Chrome isn't focused

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {"default": "Ctrl+Shift+E", "mac": "Command+Shift+E"},
      "description": "Open extension popup"
    },
    "open-sidebar": {
      "suggested_key": {"default": "Ctrl+Shift+B", "mac": "Command+Shift+B"},
      "description": "Open the side panel"
    },
    "quick-search": {
      "suggested_key": {"default": "Alt+S", "mac": "Alt+S"},
      "description": "Quick search on current page"
    },
    "export-data": {
      "suggested_key": {"default": "Ctrl+Shift+X", "mac": "Command+Shift+X"},
      "description": "Export extension data"
    }
  }
}
```

## Defining Keyboard Shortcuts with suggested_key

Platform identifiers:
- **default**: Fallback for all platforms
- **windows**: Windows and Linux
- **mac**: macOS
- **linux**: Linux only

```json
{
  "commands": {
    "my-command": {
      "suggested_key": {
        "default": "Ctrl+Shift+M",
        "mac": "Command+Shift+M"
      }
    }
  }
}
```

### Supported Keys

- **Letters/Numbers**: `A`-`Z`, `0`-`9`
- **Punctuation**: `Comma`, `Period`, `Slash`
- **Special**: `Space`, `Tab`, `Enter`, `Delete`, `Home`, `End`
- **Arrows**: `Up`, `Down`, `Left`, `Right`
- **Function**: `F1`-`F12`
- **Media**: `MediaNextTrack`, `MediaPlayPause`
- **Modifiers**: `Ctrl`, `Alt`, `Shift`, `Command`

### Modifier Requirements

- **Windows/Linux**: Must include `Ctrl` or `Alt`
- **macOS**: Must include `Command` (⌘) or `Alt` (⌥)

Valid: `Ctrl+Shift+A` ✅, `Command+Shift+P` ✅  
Invalid: `Shift+A` ❌, `A` ❌

## Handling Commands with chrome.commands.onCommand

```javascript
// background.js
chrome.commands.onCommand.addListener((command, tab) => {
  console.log(`Command: "${command}" on tab: ${tab?.id}`);

  switch (command) {
    case 'toggle-feature':
      handleToggleFeature(tab);
      break;
    case 'open-sidebar':
      handleOpenSidebar(tab);
      break;
    case 'quick-search':
      handleQuickSearch(tab);
      break;
    case 'export-data':
      handleExportData();
      break;
  }
});

async function handleToggleFeature(tab) {
  if (!tab) return;
  const { featureEnabled } = await chrome.storage.local.get('featureEnabled');
  const newState = !featureEnabled;
  await chrome.storage.local.set({ featureEnabled: newState });
  chrome.action.setBadgeText({ tabId: tab.id, text: newState ? 'ON' : '' });
  chrome.tabs.sendMessage(tab.id, { type: 'FEATURE_TOGGLE', enabled: newState });
}

async function handleOpenSidebar(tab) {
  if (!tab) return;
  await chrome.sidePanel.open({ tabId: tab.id });
}

async function handleQuickSearch(tab) {
  if (!tab) return;
  await chrome.sidePanel.open({ tabId: tab.id });
  chrome.tabs.sendMessage(tab.id, { type: 'FOCUS_SEARCH' });
}

async function handleExportData() {
  const data = await chrome.storage.local.get(null);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Communicating with Content Scripts

```javascript
// Background
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;
  switch (command) {
    case 'highlight-selection':
      await chrome.tabs.sendMessage(tab.id, { action: 'highlight', color: '#ff0000' });
      break;
    case 'extract-data':
      const data = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
      if (data) await chrome.storage.local.set({ lastExtracted: data });
      break;
  }
});

// Content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlight') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const span = document.createElement('span');
      span.style.backgroundColor = message.color;
      selection.getRangeAt(0).surroundContents(span);
    }
  }
  if (message.action === 'extract') {
    sendResponse({ title: document.title, url: location.href });
  }
  return true;
});
```

## Special Commands: _execute_action and _execute_browser_action

### _execute_action

Opens the extension popup (equivalent to clicking toolbar icon):

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {"default": "Ctrl+Shift+E", "mac": "Command+Shift+E"},
      "description": "Open extension popup"
    }
  }
}
```

No `onCommand` listener needed - automatic behavior.

### _execute_browser_action

In Manifest V2, use `_execute_browser_action`. In MV3, use `_execute_action`:

```json
// MV2
{
  "commands": {
    "_execute_browser_action": {
      "suggested_key": {"default": "Ctrl+Shift+E", "mac": "Command+Shift+E"}
    }
  }
}
```

### _execute_side_panel

Opens the extension's side panel:

```json
{
  "commands": {
    "_execute_side_panel": {
      "suggested_key": {"default": "Ctrl+Shift+P", "mac": "Command+Shift+P"},
      "description": "Open side panel"
    }
  }
}
```

### Using Multiple Special Commands

```json
{
  "commands": {
    "_execute_action": {"suggested_key": {"default": "Ctrl+Shift+E"}, "description": "Open popup"},
    "_execute_side_panel": {"suggested_key": {"default": "Ctrl+Shift+S"}, "description": "Open side panel"},
    "quick-action": {"suggested_key": {"default": "Ctrl+Shift+Q"}, "description": "Quick action"}
  }
}
```

## User Customization via chrome://extensions/shortcuts

Users customize shortcuts:
1. Open `chrome://extensions/shortcuts`
2. Find your extension
3. Click shortcut field
4. Press desired key
5. Saved automatically

### Querying Current Shortcuts

```javascript
chrome.commands.getAll((commands) => {
  commands.forEach(cmd => {
    console.log(`${cmd.name}: ${cmd.shortcut || '(not set)'}`);
  });
});
```

### Limitations

1. **Maximum 4 suggested shortcuts** in manifest
2. Users can add more manually
3. Some combinations reserved by Chrome/OS
4. No programmatic modification allowed
5. User overrides take precedence

### Global Shortcuts

Works when Chrome isn't focused:

```json
{
  "commands": {
    "global-toggle": {
      "suggested_key": {"default": "Ctrl+Shift+1"},
      "description": "Toggle globally",
      "global": true
    }
  }
}
```

Restrictions: Limited to `Ctrl+Shift+[0-9]`, must be enabled by user.

```javascript
chrome.commands.onCommand.addListener((command) => {
  if (command === 'global-toggle') handleGlobalToggle();
});
```

## Platform-Specific Considerations

### Ctrl vs Command on macOS

- **Windows/Linux**: Use `Ctrl`
- **macOS**: Use `Command` (⌘)

### macOS Reserved Shortcuts

- `Command+L` - Address bar
- `Command+T` - New tab
- `Command+W` - Close tab
- `Command+N` - New window

## Best Practices

### Use Meaningful Shortcuts

Easy to remember, consistent with other apps.

### Provide Clear Descriptions

```json
"toggle-feature": {
  "suggested_key": {"default": "Ctrl+Shift+T"},
  "description": "Toggle feature on current page"
}
```

### Handle Missing Tabs

```javascript
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab) return;
});
```

### Store User Preferences

```javascript
chrome.commands.onCommand.addListener(async (command) => {
  const stats = (await chrome.storage.local.get('stats')).stats || {};
  stats[command] = (stats[command] || 0) + 1;
  await chrome.storage.local.set({ stats });
});
```

### Inform Users About Shortcuts

Document in popup, options page, and store listing.

## Common Mistakes

### Missing Platform-Specific Keys

```json
// Bad: {"suggested_key": {"default": "Ctrl+Shift+E"}}
// Good: {"suggested_key": {"default": "Ctrl+Shift+E", "mac": "Command+Shift+E"}}
```

### Forgetting Description

```json
// Bad: {"suggested_key": {"default": "Ctrl+Shift+K"}}
// Good: {"suggested_key": {"default": "Ctrl+Shift+K"}, "description": "Open search"}
```

### Not Handling Content Script Loading

```javascript
// Bad: chrome.tabs.sendMessage(tab.id, { action: 'x' });
// Good: chrome.tabs.sendMessage(tab.id, { action: 'x' }, () => {
//   if (chrome.runtime.lastError) console.log('Not ready');
// });
```

### Too Many Shortcuts

Limit to 4 suggested shortcuts.

## Conclusion

Keyboard shortcuts enhance extension usability:
- Define shortcuts in manifest.json with `suggested_key` and `description`
- Include platform-specific keys (Ctrl for Windows/Linux, Command for macOS)
- Use `chrome.commands.onCommand` to handle activation
- Use special commands `_execute_action` and `_execute_side_panel`
- Users customize via `chrome://extensions/shortcuts`
- Follow best practices for cross-platform compatibility
