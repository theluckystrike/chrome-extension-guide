# Keyboard Shortcuts in Chrome Extensions

## Introduction

Keyboard shortcuts are one of the most powerful ways to enhance user productivity in Chrome extensions. They allow users to quickly access extension features without needing to click through menus or interact with the extension popup. The `chrome.commands` API provides a robust system for defining, handling, and managing keyboard shortcuts in your extension.

This guide covers everything you need to know about implementing keyboard shortcuts in Chrome extensions, from basic manifest configuration to advanced platform-specific handling and user customization.

## Understanding the chrome.commands API

The `chrome.commands` API is Chrome's official mechanism for adding keyboard shortcuts to extensions. It consists of several key components:

- **Manifest declaration**: Define shortcuts in `manifest.json` using the `commands` key
- **Command listener**: Use `chrome.commands.onCommand` to respond to shortcut activation
- **Query API**: Use `chrome.commands.getAll()` to retrieve current shortcut bindings
- **User customization**: Users can modify shortcuts via `chrome://extensions/shortcuts`

The API handles the complexity of platform differences (Windows/Linux vs macOS) and ensures shortcuts don't conflict with Chrome's built-in shortcuts.

## Manifest Configuration

### Basic Commands Structure

The `commands` key in `manifest.json` is where you define all keyboard shortcuts for your extension. Each command requires a unique name and at minimum, a `suggested_key` and `description`:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
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

### Command Properties

Each command in the manifest supports several properties:

- **suggested_key** (required): The default keyboard combination(s) for the command
- **description** (required): Human-readable description shown in the shortcuts UI
- **global** (optional): Boolean to make the shortcut work even when Chrome isn't focused
- **Requirements**: The shortcut must include Ctrl/Cmd or Alt as a modifier

Here's a more complete example showing multiple commands:

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "Open extension popup"
    },
    "open-sidebar": {
      "suggested_key": {
        "default": "Ctrl+Shift+B",
        "mac": "Command+Shift+B"
      },
      "description": "Open the side panel"
    },
    "quick-search": {
      "suggested_key": {
        "default": "Alt+S",
        "mac": "Alt+S"
      },
      "description": "Quick search on current page"
    },
    "export-data": {
      "suggested_key": {
        "default": "Ctrl+Shift+X",
        "mac": "Command+Shift+X"
      },
      "description": "Export extension data"
    }
  }
}
```

## Defining Keyboard Shortcuts with suggested_key

The `suggested_key` object allows you to specify different key combinations for different platforms. Chrome supports the following platform identifiers:

- **default**: Fallback for all platforms (used if platform-specific key isn't defined)
- **windows**: Windows and Linux
- **mac**: macOS
- **linux**: Linux only
- **chromeos**: Chrome OS

### Platform-Specific Keys

The most important distinction is between `default` (which applies to Windows/Linux) and `mac` (which applies to macOS). On macOS, users expect the Command key (⌘) instead of Ctrl:

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

You can also use explicit platform keys for more granular control:

```json
{
  "commands": {
    "linux-only": {
      "suggested_key": {
        "linux": "Ctrl+Shift+L"
      }
    },
    "cross-platform": {
      "suggested_key": {
        "default": "Ctrl+Shift+C",
        "mac": "Command+Shift+C",
        "linux": "Ctrl+Shift+C"
      }
    }
  }
}
```

### Supported Keys

Chrome supports a wide range of keys for keyboard shortcuts:

**Letters and Numbers**:
- `A` through `Z`
- `0` through `9`

**Punctuation**:
- `Comma`, `Period`, `Slash`, `Backslash`
- `Semicolon`, `Quote`, `BracketLeft`, `BracketRight`
- `Minus`, `Equal`, `Backquote`

**Special Keys**:
- `Space`, `Tab`, `Enter`, `Backspace`, `Delete`
- `Insert`
- `Home`, `End`, `PageUp`, `PageDown`

**Arrow Keys**:
- `Up`, `Down`, `Left`, `Right`

**Function Keys**:
- `F1` through `F12`

**Media Keys**:
- `MediaNextTrack`
- `MediaPrevTrack`
- `MediaPlayPause`
- `MediaStop`

**Modifier Keys** (must be combined with other keys):
- `Ctrl`, `Alt`, `Shift`, `Command` (macOS only), `Meta`

### Modifier Requirements

For security and usability reasons, Chrome requires shortcuts to include at least one modifier:

- **Windows/Linux**: Must include `Ctrl`, `Alt`, or both
- **macOS**: Must include `Command` (⌘), `Alt` (⌥), or both
- `Shift` alone is not sufficient but can be combined with other modifiers

Valid shortcut examples:
- `Ctrl+Shift+A` ✅
- `Alt+X` ✅
- `Command+Shift+P` ✅
- `Ctrl+Alt+T` ✅

Invalid shortcut examples:
- `Shift+A` ❌ (Shift alone is not allowed)
- `A` ❌ (no modifier)
- `F1` ❌ (function keys alone are not allowed)

## Handling Commands with chrome.commands.onCommand

Once you've defined commands in the manifest, you need to listen for them in your background service worker:

### Basic Command Listener

```javascript
// background.js (service worker)
chrome.commands.onCommand.addListener((command, tab) => {
  console.log(`Command "${command}" triggered on tab ${tab?.id}`);

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
  
  // Get current state from storage
  const { featureEnabled } = await chrome.storage.local.get('featureEnabled');
  const newState = !featureEnabled;
  
  // Update storage
  await chrome.storage.local.set({ featureEnabled: newState });
  
  // Update badge to show state
  chrome.action.setBadgeText({
    tabId: tab.id,
    text: newState ? 'ON' : ''
  });
  
  // Notify content script
  chrome.tabs.sendMessage(tab.id, {
    type: 'FEATURE_TOGGLE',
    enabled: newState
  });
}

async function handleOpenSidebar(tab) {
  if (!tab) return;
  
  // Open side panel if defined
  await chrome.sidePanel.open({ tabId: tab.id });
}

async function handleQuickSearch(tab) {
  if (!tab) return;
  
  // Focus the extension's side panel for search
  await chrome.sidePanel.open({ tabId: tab.id });
  
  // Send message to side panel to focus search input
  chrome.tabs.sendMessage(tab.id, { type: 'FOCUS_SEARCH' });
}

async function handleExportData() {
  // Get all stored data
  const data = await chrome.storage.local.get(null);
  
  // Create and download JSON file
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `extension-export-${Date.now()}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}
```

### Command Listener Parameters

The `onCommand` listener receives two parameters:

1. **command** (string): The name of the command that was triggered
2. **tab** (Tab object): The active tab when the shortcut was pressed

The `tab` parameter can be `undefined` in certain scenarios, so always check for its existence before using it.

### Communicating with Content Scripts

When a keyboard shortcut is triggered, you often need to communicate with the content script running in the active tab:

```javascript
// In your background service worker
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;

  switch (command) {
    case 'highlight-selection':
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'highlight',
        color: '#ff0000'
      });
      
      if (chrome.runtime.lastError) {
        console.log('Content script not loaded:', chrome.runtime.lastError.message);
      }
      break;

    case 'extract-data':
      // Request data from content script
      const data = await chrome.tabs.sendMessage(tab.id, {
        action: 'extract'
      });
      
      if (data) {
        await chrome.storage.local.set({ lastExtracted: data });
      }
      break;
  }
});
```

```javascript
// In your content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlight') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.backgroundColor = message.color;
      range.surroundContents(span);
      sendResponse({ success: true, count: 1 });
    }
  }
  
  if (message.action === 'extract') {
    // Extract page data
    const data = {
      title: document.title,
      url: window.location.href,
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent)
    };
    sendResponse(data);
  }
  
  return true; // Keep message channel open for async response
});
```

## Special Commands: _execute_action and _execute_side_panel

Chrome provides two built-in special commands that have default behaviors:

### _execute_action

This command triggers the extension's action (toolbar icon) popup. It's equivalent to the user clicking the extension icon in the toolbar:

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "Open extension popup"
    }
  }
}
```

If your extension has an action popup, pressing this shortcut will open it. If there's no popup, it will still trigger the `chrome.action.onClicked` event (if you have a listener for it), but this is less common.

Note: You don't need to add an `onCommand` listener for `_execute_action` - the popup behavior is automatic.

### _execute_side_panel

This command opens the extension's side panel:

```json
{
  "commands": {
    "_execute_side_panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "Command+Shift+P"
      },
      "description": "Open side panel"
    }
  }
}
```

Similar to `_execute_action`, this special command works automatically without needing an `onCommand` listener.

### Using Both Special Commands

Many extensions provide both a popup and a side panel, allowing users to choose their preferred interface:

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "Open popup"
    },
    "_execute_side_panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Open side panel"
    },
    "quick-action": {
      "suggested_key": {
        "default": "Ctrl+Shift+Q",
        "mac": "Command+Shift+Q"
      },
      "description": "Quick action without UI"
    }
  }
}
```

## User Customization via chrome://extensions/shortcuts

One of the powerful features of Chrome's commands API is that users can customize keyboard shortcuts after installing your extension. This is accessed through `chrome://extensions/shortcuts` or by clicking the keyboard icon in the extensions management page.

### How Users Customize Shortcuts

1. Open `chrome://extensions/shortcuts` in Chrome
2. Find your extension in the list
3. Click on the shortcut field for any command
4. Press the desired key combination
5. The shortcut is saved automatically

### Querying Current Shortcuts

You can programmatically retrieve the shortcuts that users have configured:

```javascript
// Get all registered commands with their current shortcuts
chrome.commands.getAll((commands) => {
  commands.forEach(command => {
    console.log(`Command: ${command.name}`);
    console.log(`  Description: ${command.description}`);
    console.log(`  Shortcut: ${command.shortcut || '(not set)'}`);
  });
});
```

The `getAll()` callback returns an array of Command objects, each containing:
- **name**: The command identifier
- **description**: The command description from manifest
- **shortcut**: The current key combination (empty if not set by user)

### Limitations

Be aware of the following limitations regarding shortcuts:

1. **Maximum 4 suggested shortcuts**: You can only define 4 commands with `suggested_key` in your manifest
2. **Users can add more**: There's no strict limit on how many shortcuts users can add manually
3. **Reserved combinations**: Some key combinations are reserved by Chrome or the operating system
4. **No programmatic modification**: You cannot change shortcuts programmatically; only users can modify them
5. **User overrides are final**: If a user changes a shortcut, Chrome uses their version, not your suggested_key

### Global Shortcuts

By default, keyboard shortcuts only work when Chrome is in focus. If you want shortcuts to work even when Chrome is not the active window, you can declare them as global:

```json
{
  "commands": {
    "global-toggle": {
      "suggested_key": {
        "default": "Ctrl+Shift+1"
      },
      "description": "Toggle extension globally",
      "global": true
    }
  }
}
```

Global shortcuts have additional restrictions:
- Limited to `Ctrl+Shift+[0-9]` combinations only
- Must be explicitly enabled by the user (Chrome prompts on first use)
- May conflict with other applications' global shortcuts

```javascript
// Handle global shortcut activation
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'global-toggle') {
    // This works even when Chrome isn't focused
    handleGlobalToggle();
  }
});
```

## Platform-Specific Considerations

### Ctrl vs Command on macOS

The most important cross-platform consideration is the modifier key:
- **Windows/Linux**: Use `Ctrl` as the primary modifier
- **macOS**: Use `Command` (⌘) as the primary modifier

Users on macOS expect Command-based shortcuts, not Ctrl-based ones. Using the wrong modifier provides a poor user experience.

### Testing on Multiple Platforms

Always test your extension's keyboard shortcuts on all target platforms. What works on Windows may not work on macOS due to:

- Different default modifier expectations
- Reserved shortcuts on specific platforms
- Keyboard layout differences

### macOS Chrome Shortcuts

Some shortcuts are reserved by Chrome on macOS. Common reserved combinations include:
- `Command+L` - Focus address bar
- `Command+T` - New tab
- `Command+W` - Close tab
- `Command+Shift+T` - Reopen closed tab
- `Command+N` - New window

Avoid defining shortcuts that conflict with these.

## Best Practices

### 1. Use Meaningful Shortcuts

Choose shortcuts that are:
- Easy to remember (mnemonic)
- Consistent with other extensions or applications
- Unlikely to conflict with Chrome or OS shortcuts

### 2. Provide Clear Descriptions

Always include clear, descriptive `description` fields:

```json
"toggle-feature": {
  "suggested_key": { "default": "Ctrl+Shift+T" },
  "description": "Toggle feature on current page"  // Good: specific
  // "Toggle"  // Bad: too vague
}
```

### 3. Handle Missing Tabs

Always check if `tab` is defined:

```javascript
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab) {
    console.log('No active tab');
    return;
  }
  // Proceed with tab operations
});
```

### 4. Store User Preferences

Use Chrome's storage API to persist user preferences related to shortcuts:

```javascript
chrome.commands.onCommand.addListener(async (command, tab) => {
  // Track shortcut usage
  const { shortcutStats } = await chrome.storage.local.get('shortcutStats');
  const stats = shortcutStats || {};
  
  stats[command] = (stats[command] || 0) + 1;
  await chrome.storage.local.set({ shortcutStats: stats });
});
```

### 5. Inform Users About Shortcuts

Help users discover your shortcuts by:
- Documenting them in your extension's popup or options page
- Including them in your extension's store listing
- Using Chrome's built-in shortcuts page in your onboarding

## Common Mistakes

### 1. Missing Platform-Specific Keys

```json
// Bad: Only defines Ctrl, doesn't work well on Mac
"command": {
  "suggested_key": { "default": "Ctrl+Shift+E" }
}

// Good: Defines both Ctrl and Command
"command": {
  "suggested_key": {
    "default": "Ctrl+Shift+E",
    "mac": "Command+Shift+E"
  }
}
```

### 2. Forgetting Description

```json
// Bad: Description is required
"command": {
  "suggested_key": { "default": "Ctrl+Shift+K" }
}

// Good: Has description
"command": {
  "suggested_key": { "default": "Ctrl+Shift+K" },
  "description": "Open quick search"
}
```

### 3. Not Handling Content Script Loading

```javascript
// Bad: Doesn't check if content script is loaded
chrome.commands.onCommand.addListener((command, tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'doSomething' });
  // Will fail silently if content script isn't loaded
});

// Good: Checks for errors
chrome.commands.onCommand.addListener((command, tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'doSomething' }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Content script not ready');
      // Handle appropriately
    }
  });
});
```

### 4. Too Many Shortcuts

Limit your suggested shortcuts to the most important ones (maximum 4). Users can always add more manually if needed.

## Example: Complete Implementation

Here's a complete example showing a well-structured keyboard shortcuts implementation:

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Productivity Extension",
  "version": "1.0",
  "permissions": ["storage", "sidePanel"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "Open extension popup"
    },
    "_execute_side_panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "Command+Shift+P"
      },
      "description": "Open side panel"
    },
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "mac": "Command+Shift+T"
      },
      "description": "Toggle main feature"
    },
    "quick-note": {
      "suggested_key": {
        "default": "Ctrl+Shift+N",
        "mac": "Command+Shift+N"
      },
      "description": "Quick note from current page"
    }
  }
}
```

### background.js

```javascript
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab) return;

  switch (command) {
    case 'toggle-feature':
      await toggleFeature(tab);
      break;
    case 'quick-note':
      await createQuickNote(tab);
      break;
  }
});

async function toggleFeature(tab) {
  const { featureEnabled } = await chrome.storage.local.get('featureEnabled');
  const newState = !featureEnabled;
  
  await chrome.storage.local.set({ featureEnabled: newState });
  
  // Update badge
  chrome.action.setBadgeText({
    tabId: tab.id,
    text: newState ? 'ON' : ''
  });
  
  chrome.action.setBadgeBackgroundColor({
    tabId: tab.id,
    color: newState ? '#4CAF50' : '#F44336'
  });
  
  // Notify content script
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_FEATURE',
      enabled: newState
    });
  } catch (error) {
    console.log('Content script not loaded');
  }
}

async function createQuickNote(tab) {
  try {
    // Get page info
    const [{ title, url }] = await chrome.tabs.executeScript(tab.id, {
      code: '({ title: document.title, url: window.location.href })'
    });
    
    // Open side panel for note input
    await chrome.sidePanel.open({ tabId: tab.id });
    
    // Send page info to side panel
    await chrome.tabs.sendMessage(tab.id, {
      type: 'NEW_NOTE',
      pageTitle: title,
      pageUrl: url
    });
  } catch (error) {
    console.error('Error creating note:', error);
  }
}

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed with keyboard shortcuts');
  
  // Show users where to find shortcuts
  chrome.storage.local.set({
    showShortcutsHint: true
  });
});
```

## Conclusion

Keyboard shortcuts are an essential feature for power users and can significantly enhance your extension's usability. The `chrome.commands` API provides a robust foundation for implementing shortcuts that work across platforms and can be customized by users.

Key takeaways:
- Use `manifest.json` to define shortcuts with `suggested_key` and `description`
- Always include platform-specific keys (Ctrl for Windows/Linux, Command for macOS)
- Use `chrome.commands.onCommand` to handle shortcut activation
- Take advantage of special commands `_execute_action` and `_execute_side_panel`
- Remember that users can customize shortcuts via `chrome://extensions/shortcuts`
- Follow best practices for cross-platform compatibility and error handling
