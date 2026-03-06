# Chrome Extension Keyboard Shortcuts API Guide

This guide provides comprehensive coverage of the `chrome.commands` API for implementing keyboard shortcuts in Chrome Extensions. Keyboard shortcuts significantly enhance user productivity by enabling quick access to extension features without navigating through menus or clicking toolbar icons.

## Overview of the chrome.commands API

The `chrome.commands` API is a powerful system for defining, handling, and managing keyboard shortcuts in Chrome Extensions. It allows extension developers to register keyboard combinations that users can trigger to activate specific extension functionality.

### Core Components

The API consists of three main parts that work together to provide a complete keyboard shortcut system:

1. **Manifest Configuration**: Define shortcuts in `manifest.json` using the `commands` key
2. **Event Listener**: Use `chrome.commands.onCommand` to respond when shortcuts are triggered
3. **Query API**: Use `chrome.commands.getAll()` to retrieve current bindings

### Basic API Methods

```javascript
// Retrieve all registered commands and their current shortcuts
chrome.commands.getAll(callback);

// Listen for command activation
chrome.commands.onCommand.addListener((command, tab) => {
  // Handle the command
});
```

The `getAll()` method returns an array of command objects, each containing:
- `name`: The command identifier
- `description`: The description from the manifest
- `shortcut`: The current keyboard shortcut (or empty if not set)
- `global`: Whether it's a global shortcut

## Manifest.json commands Entry

The `commands` key in your manifest.json file is where you define all keyboard shortcuts for your extension. Each command requires specific properties to function correctly.

### Properties

Command definitions support the following properties:

1. **suggested_key** (optional): The default keyboard combination. An extension can have many commands but may specify at most four suggested keyboard shortcuts.
2. **description** (required for standard commands, ignored for Action commands): A human-readable description shown in the shortcuts UI

### Basic Manifest Structure

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "commands": {
    "command-name": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Description shown in shortcuts UI"
    }
  }
}
```

### Complete Example

```json
{
  "manifest_version": 3,
  "name": "Productivity Booster",
  "version": "1.0.0",
  "permissions": ["storage", "sidePanel"],
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "Open extension popup"
    },
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "mac": "Command+Shift+T"
      },
      "description": "Toggle the main feature on/off"
    },
    "open-sidebar": {
      "suggested_key": {
        "default": "Ctrl+Shift+B",
        "mac": "Command+Shift+B"
      },
      "description": "Open the side panel"
    },
    "quick-action": {
      "suggested_key": {
        "default": "Alt+S",
        "mac": "Alt+S"
      },
      "description": "Execute quick action on current page"
    }
  }
}
```

## Defining Keyboard Shortcuts with suggested_key

The `suggested_key` property defines the default keyboard combination(s) for your command. You can specify different keys for different platforms to ensure a consistent user experience across operating systems.

### Platform Identifiers

Chrome supports several platform identifiers for targeting specific operating systems:

- **default**: Fallback key combination used when no platform-specific key is defined
- **windows**: Windows operating system
- **mac**: macOS (Apple computers)
- **linux**: Linux distribution

### Platform-Specific Configuration

```json
{
  "commands": {
    "my-command": {
      "suggested_key": {
        "default": "Ctrl+Shift+M",
        "windows": "Ctrl+Shift+M",
        "mac": "Command+Shift+M",
        "linux": "Ctrl+Shift+M"
      },
      "description": "Execute my command"
    }
  }
}
```

### Supported Keys

The Chrome Commands API supports a wide range of keys:

**Alphabetic Keys:**
- Letters A through Z (case-insensitive)

**Numeric Keys:**
- Numbers 0 through 9

**Punctuation and Symbols:**
- Comma, Period, Slash, Backslash, Quote, Semicolon, Equals, Bracket keys

**Special Keys:**
- Space, Insert, Home, End, PageUp, PageDown, Delete

**Arrow Keys:**
- Up, Down, Left, Right

**Function Keys:**
- F1 through F12

**Media Keys:**
- MediaNextTrack, MediaPrevTrack, MediaPlayPause, MediaStop

**Modifier Keys (used in combinations):**
- Ctrl, Alt, Shift, Command (Mac only), MacCtrl (Mac only), Search (ChromeOS only)

### Modifier Requirements

Chrome enforces specific modifier requirements to prevent conflicts with system shortcuts:

**All Platforms:**
- Extension command shortcuts must include either Ctrl or Alt
- Shift is optional but commonly used
- On macOS, `Ctrl` is automatically converted to `Command`; use `MacCtrl` to target the actual Control key
- Media Keys can be used without modifiers, but modifiers cannot be combined with Media Keys

```json
// Valid combinations
"valid-1": { "suggested_key": { "default": "Ctrl+Shift+A" } }
"valid-2": { "suggested_key": { "default": "Alt+T" } }
"valid-3": { "suggested_key": { "mac": "Command+Shift+P" } }

// Invalid combinations (will be ignored)
"invalid-1": { "suggested_key": { "default": "Shift+A" } }
"invalid-2": { "suggested_key": { "default": "A" } }
```

## Handling Commands with chrome.commands.onCommand

The `chrome.commands.onCommand` event is the primary mechanism for responding to keyboard shortcut activations. This event fires whenever the user triggers a registered command.

### Basic Event Listener

```javascript
// background.js (for Manifest V3)
chrome.commands.onCommand.addListener((command, tab) => {
  console.log(`Command "${command}" triggered on tab ${tab?.id}`);
  
  switch (command) {
    case 'toggle-feature':
      handleToggleFeature(tab);
      break;
    case 'open-sidebar':
      handleOpenSidebar(tab);
      break;
    case 'quick-action':
      handleQuickAction(tab);
      break;
  }
});
```

### Tab Parameter Handling

The `tab` parameter provides information about the active tab when the command was triggered. Always verify the tab exists before performing tab-specific operations:

```javascript
chrome.commands.onCommand.addListener((command, tab) => {
  // Always check if tab exists
  if (!tab || !tab.id) {
    console.log('No active tab available');
    return;
  }
  
  // Safe to use tab.id now
  handleCommand(command, tab.id);
});

async function handleCommand(command, tabId) {
  switch (command) {
    case 'capture-screenshot':
      await captureTabScreenshot(tabId);
      break;
    case 'inject-script':
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => console.log('Script injected!')
      });
      break;
  }
}
```

### Communicating with Content Scripts

One common pattern is to respond to keyboard commands by communicating with content scripts running in the active tab:

```javascript
// background.js
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;
  
  switch (command) {
    case 'highlight-elements':
      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'highlight',
        color: '#FFFF00'
      });
      break;
      
    case 'extract-data':
      // Request data from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extract',
        selector: '.important-data'
      });
      
      if (response) {
        await chrome.storage.local.set({ extractedData: response });
      }
      break;
      
    case 'toggle-state':
      // Toggle extension state in the page
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggle-extension-state'
      });
      break;
  }
});

// content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'highlight':
      highlightPageElements(message.color);
      break;
    case 'extract':
      const data = extractPageData(message.selector);
      sendResponse(data);
      break;
    case 'toggle-extension-state':
      toggleExtensionFeature();
      break;
  }
  
  // Required for async response
  return true;
});

function highlightPageElements(color) {
  const elements = document.querySelectorAll('p, h1, h2, h3');
  elements.forEach(el => {
    el.style.backgroundColor = color;
  });
}

function extractPageData(selector) {
  const elements = document.querySelectorAll(selector);
  return Array.from(elements).map(el => el.textContent.trim());
}

function toggleExtensionFeature() {
  document.body.classList.toggle('extension-active');
}
```

### Using Async/Await with Commands

Modern extensions should use async/await patterns for handling commands that require asynchronous operations:

```javascript
chrome.commands.onCommand.addListener(async (command, tab) => {
  try {
    if (!tab?.id) throw new Error('No active tab');
    
    switch (command) {
      case 'save-page':
        await savePageContent(tab.id);
        break;
      case 'open-settings':
        await chrome.runtime.openOptionsPage();
        break;
      case 'sync-data':
        await syncWithServer();
        break;
    }
  } catch (error) {
    console.error('Command failed:', error);
    showErrorNotification(error.message);
  }
});

async function savePageContent(tabId) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerHTML
  });
  
  await chrome.storage.local.set({
    savedPage: {
      url: tab.url,
      title: tab.title,
      content: result[0].result,
      timestamp: Date.now()
    }
  });
}

async function syncWithServer() {
  const { data } = await chrome.storage.local.get('data');
  if (!data) return;
  
  const response = await fetch('https://api.example.com/sync', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('Sync failed');
  }
}

function showErrorNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Command Error',
    message: message
  });
}
```

## Platform-Specific Key Combinations (Ctrl vs Cmd)

Understanding platform-specific key combinations is crucial for creating extensions that feel native on all operating systems. The difference between Windows/Linux and macOS is the most important consideration.

### The Ctrl vs Command Distinction

On Windows and Linux, the primary modifier key is Ctrl (Control). On macOS, the Command key (⌘) serves a similar purpose for user-accessible shortcuts. Note that `Ctrl` in the `default` key is automatically converted to `Command` on macOS, so a single `default` entry often suffices. Use the `mac` key when you want explicit control, or use `MacCtrl` to specifically target the Control key on macOS.

```json
{
  "commands": {
    "open-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "Command+Shift+P"
      },
      "description": "Open side panel"
    },
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+F",
        "mac": "Command+Shift+F"
      },
      "description": "Toggle feature"
    }
  }
}
```

### Best Practices for Platform Keys

Follow these guidelines when defining platform-specific shortcuts:

1. **Provide a `default` key**: `Ctrl` in the `default` key is auto-converted to `Command` on macOS. Add a `mac` key only when you need explicit control or want to use `MacCtrl`.

2. **Use Command for explicit macOS shortcuts**: If providing a `mac` key, use `Command` as the primary modifier since it is the standard for macOS user shortcuts

3. **Consider platform conventions**: Some shortcuts are universal (like Ctrl/Cmd+S for save), while others vary by platform

4. **Test on all platforms**: Always test your shortcuts on both Windows and macOS to ensure they work correctly

### Alternative Platform Keys

Beyond default and mac, you can use more specific platform identifiers:

```json
{
  "commands": {
    "platform-test": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "windows": "Ctrl+Shift+T",
        "mac": "Command+Shift+T",
        "linux": "Ctrl+Shift+T",
        "chromeos": "Ctrl+Shift+T"
      },
      "description": "Test platform-specific keys"
    }
  }
}
```

### macOS-Specific Considerations

macOS has several important considerations:

1. **Command key (⌘)**: The primary modifier for user shortcuts
2. **Option key (⌥)**: Alternative to Command for some shortcuts
3. **Reserved shortcuts**: Many shortcuts are reserved by macOS and the system

Reserved macOS shortcuts to avoid:
- Command+L: Focus address bar
- Command+T: New tab
- Command+W: Close tab
- Command+N: New window
- Command+Q: Quit application
- Command+,: Open preferences

## Special Commands: _execute_action and _execute_browser_action

Chrome provides several special command names that perform built-in actions without requiring an onCommand listener. These commands control core Chrome extension UI elements.

### _execute_action

The `_execute_action` command opens your extension's action popup (the toolbar icon popup). This is equivalent to the user clicking your extension's icon in the toolbar:

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

This command doesn't require an onCommand listener - the popup opens automatically when triggered. This is the Manifest V3 equivalent of what was `_execute_browser_action` in Manifest V2.

### _execute_browser_action

In Manifest V2 extensions, `_execute_browser_action` performed the same function. In Manifest V3, this has been replaced with `_execute_action`. If you're maintaining a Manifest V2 extension:

```json
// Manifest V2
{
  "manifest_version": 2,
  "commands": {
    "_execute_browser_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      }
    }
  }
}
```

### Combining Special and Custom Commands

You can define the special `_execute_action` command alongside regular custom commands:

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
    "custom-command-1": {
      "suggested_key": {
        "default": "Ctrl+Shift+1",
        "mac": "Command+Shift+1"
      },
      "description": "Custom action 1"
    },
    "custom-command-2": {
      "suggested_key": {
        "default": "Ctrl+Shift+2",
        "mac": "Command+Shift+2"
      },
      "description": "Custom action 2"
    }
  }
}
```

> **Note:** To open a side panel via keyboard shortcut, use a custom command with a `chrome.commands.onCommand` listener that calls `chrome.sidePanel.open()`. There is no `_execute_side_panel` reserved command.

## Allowing Users to Customize Shortcuts

One of the key features of the Chrome Commands API is that users can customize keyboard shortcuts through Chrome's built-in interface. This provides flexibility but requires understanding the limitations.

### The chrome://extensions/shortcuts Page

Users can access the shortcuts configuration page at:
`chrome://extensions/shortcuts`

On this page, users can:
- View all registered commands
- See the current shortcut (or lack thereof)
- Add new shortcuts by clicking and pressing keys
- Remove existing shortcuts

### Querying Current Shortcuts

Your extension can query the current state of all shortcuts:

```javascript
// Get all commands with their current shortcuts
chrome.commands.getAll((commands) => {
  commands.forEach(cmd => {
    console.log(`Command: ${cmd.name}`);
    console.log(`Description: ${cmd.description}`);
    console.log(`Current shortcut: ${cmd.shortcut || '(not set)'}`);
    console.log(`Is global: ${cmd.global}`);
    console.log('---');
  });
});

// Using promises (Manifest V3)
async function getAllCommands() {
  const commands = await chrome.commands.getAll();
  return commands;
}

// Example output
// Command: _execute_action
// Description: Open extension popup
// Current shortcut: Ctrl+Shift+E
// Is global: false
// ---
// Command: toggle-feature
// Description: Toggle feature
// Current shortcut: (not set)
// Is global: false
```

### What Users Can Do

Users have the following customization options:

1. **Change existing shortcuts**: Users can modify any suggested shortcut
2. **Add new shortcuts**: Users can add shortcuts for commands that don't have one
3. **Remove shortcuts**: Users can clear any shortcut
4. **Remap global commands**: Users can remap global commands to their preferred key combinations

### What Extensions Cannot Do

Important limitations to communicate to users:

1. **No programmatic modification**: Extensions cannot change shortcuts
2. **No shortcut removal**: Cannot programmatically remove user-set shortcuts
3. **No enforcement**: Cannot guarantee a specific shortcut will always work

### Handling User-Set Shortcuts

Since users can change or remove shortcuts, always handle cases where shortcuts might not be set:

```javascript
chrome.commands.onCommand.addListener((command, tab) => {
  // The command event still fires even if the shortcut was changed by the user
  // This is the expected behavior - the user's custom shortcut triggers the command
  console.log(`Command "${command}" triggered`);
  
  handleCommand(command, tab);
});

async function checkShortcutStatus() {
  const commands = await chrome.commands.getAll();
  const command = commands.find(c => c.name === 'toggle-feature');
  
  if (!command?.shortcut) {
    // Remind user to set a shortcut
    showNotification('Please set a keyboard shortcut in chrome://extensions/shortcuts');
  }
}
```

### Limitations and Restrictions

The Chrome Commands API has several important limitations:

1. **Maximum 4 suggested shortcuts**: Only the first 4 commands with suggested_key entries will appear in the shortcuts UI

2. **Reserved combinations**: Some key combinations are reserved by Chrome or the operating system and cannot be used

3. **Global shortcut restrictions**: Global shortcuts (working outside Chrome) are limited to Ctrl+Shift+[0-9]

4. **Platform-specific behavior**: Shortcuts behave differently on different platforms

```json
// Only 4 commands with suggested_key will be shown in UI
{
  "commands": {
    "cmd-1": { "suggested_key": {...}, "description": "..." },  // Shown
    "cmd-2": { "suggested_key": {...}, "description": "..." },  // Shown
    "cmd-3": { "suggested_key": {...}, "description": "..." },  // Shown
    "cmd-4": { "suggested_key": {...}, "description": "..." },  // Shown
    "cmd-5": { "suggested_key": {...}, "description": "..." }   // NOT shown
  }
}
```

## Global Shortcuts

Global shortcuts work even when Chrome is not the focused application. This is useful for extensions that need to respond to shortcuts regardless of what the user is doing.

### Defining Global Shortcuts

Add `"global": true` to your command definition:

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

### Global Shortcut Restrictions

Global shortcuts have stricter limitations:

1. **Limited key combinations**: Only Ctrl+Shift+[0-9] combinations are allowed
2. **User must enable**: Users must explicitly enable global shortcuts in the UI
3. **OS conflicts**: May conflict with system-wide shortcuts

### Handling Global Shortcuts

```javascript
chrome.commands.onCommand.addListener((command, tab) => {
  // For global shortcuts, tab might be undefined
  console.log(`Global command "${command}" triggered`);
  
  if (command === 'global-toggle') {
    handleGlobalToggle();
  }
});

function handleGlobalToggle() {
  // Global toggle implementation
  // Since there's no tab, work with storage or system-level actions
  chrome.storage.local.get(['enabled'], (result) => {
    const newState = !result.enabled;
    chrome.storage.local.set({ enabled: newState });
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Extension Toggled',
      message: `Extension ${newState ? 'enabled' : 'disabled'}`
    });
  });
}
```

## Best Practices

Follow these best practices for creating effective keyboard shortcuts in your extension:

### 1. Choose Intuitive Shortcuts

Select shortcuts that are:
- Easy to remember (mnemonic)
- Consistent with common application conventions
- Unlikely to conflict with browser or OS shortcuts

### 2. Provide Clear Descriptions

Always include meaningful descriptions:

```json
// Good
"toggle-bookmark": {
  "suggested_key": { "default": "Ctrl+Shift+D" },
  "description": "Add current page to bookmarks"
}

// Bad
"bookmark": {
  "suggested_key": { "default": "Ctrl+Shift+D" },
  "description": "Do bookmark thing"
}
```

### 3. Test Cross-Platform

Always test your extension on:
- Windows with keyboard
- macOS with keyboard
- Chrome OS

### 4. Handle Edge Cases

Always handle scenarios where tabs might not be available:

```javascript
chrome.commands.onCommand.addListener((command, tab) => {
  // tab can be undefined in some cases
  if (!tab) {
    console.log('No active tab - handling globally');
    handleGlobalCommand(command);
    return;
  }
  
  handleTabCommand(command, tab);
});
```

### 5. Document Shortcuts for Users

Make sure users know about available shortcuts by:
- Including shortcuts in your popup UI
- Documenting in your options page
- Adding to your Chrome Web Store listing

```html
<!-- In popup.html -->
<div class="shortcuts-help">
  <h3>Keyboard Shortcuts</h3>
  <ul>
    <li><kbd>Ctrl+Shift+E</kbd> - Open popup</li>
    <li><kbd>Ctrl+Shift+B</kbd> - Open side panel</li>
    <li><kbd>Ctrl+Shift+T</kbd> - Toggle feature</li>
  </ul>
  <p>Customize at: chrome://extensions/shortcuts</p>
</div>
```

## Common Mistakes to Avoid

Avoid these common pitfalls when implementing keyboard shortcuts:

### 1. Understanding Platform Key Mapping

On macOS, `Ctrl` in the `default` key is automatically converted to `Command`. Specifying a separate `mac` key is therefore optional, but recommended for clarity:

```json
// Works on all platforms (Ctrl auto-maps to Command on Mac)
"command": {
  "suggested_key": { "default": "Ctrl+Shift+E" },
  "description": "..."
}

// Explicit — clearer intent, and lets you use MacCtrl if you need the Control key on Mac
"command": {
  "suggested_key": {
    "default": "Ctrl+Shift+E",
    "mac": "Command+Shift+E"
  },
  "description": "..."
}
```

> **Tip:** Use `MacCtrl` in the `"mac"` key if you specifically need the Control key (not Command) on macOS.

### 2. Missing Description

The description is required and must be present:

```json
// Wrong - will fail validation
"command": {
  "suggested_key": { "default": "Ctrl+Shift+E" }
}

// Correct
"command": {
  "suggested_key": { "default": "Ctrl+Shift+E" },
  "description": "Open extension"
}
```

### 3. Not Accounting for User Changes

```javascript
// Don't assume the shortcut hasn't changed
chrome.commands.getAll((commands) => {
  const cmd = commands.find(c => c.name === 'my-command');
  // cmd.shortcut might be different from what you set in manifest
});
```

### 4. Too Many Suggested Shortcuts

Only 4 commands with suggested_key will be shown:

```json
// Only the first 4 will appear in the shortcuts UI
```

### 5. Ignoring Content Script Loading

When sending messages to content scripts, handle the case where the script isn't loaded:

```javascript
// Add error handling
chrome.tabs.sendMessage(tab.id, { action: 'doSomething' }, (response) => {
  if (chrome.runtime.lastError) {
    console.log('Content script not loaded:', chrome.runtime.lastError.message);
    // Handle gracefully
  }
});
```

## Conclusion

The `chrome.commands` API provides a robust system for adding keyboard shortcuts to your Chrome Extension. By following the guidelines in this guide, you can create intuitive, cross-platform keyboard shortcuts that significantly enhance user productivity.

Key takeaways:
- Define shortcuts in manifest.json with `suggested_key` and `description`
- Use platform-specific keys (Ctrl for Windows/Linux, Command for macOS)
- Handle commands with `chrome.commands.onCommand`
- Use the special `_execute_action` command for built-in popup behavior
- Understand that users can customize shortcuts via `chrome://extensions/shortcuts`
- Follow best practices for cross-platform compatibility and user experience

With proper implementation, keyboard shortcuts become a powerful way to make your extension more accessible and efficient for power users.
