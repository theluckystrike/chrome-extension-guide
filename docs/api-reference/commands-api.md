# Chrome Commands API Reference

The `chrome.commands` API allows extensions to define keyboard shortcuts that trigger actions. These shortcuts can work within Chrome's context or globally across the entire operating system.

## Overview

The Commands API provides a way to define keyboard shortcuts for your extension. These shortcuts appear in Chrome's extension settings page and can be customized by users.

- **No permission required** — the `commands` key in manifest.json automatically enables the API
- **User-customizable** — users can rebind shortcuts in `chrome://extensions/shortcuts`
- **Global shortcuts** — work even when Chrome is not focused (requires additional configuration)

## Manifest Declaration

Define commands in your `manifest.json` under the `commands` key:

```json
{
  "commands": {
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Toggle the feature on/off"
    },
    "open-panel": {
      "suggested_key": {
        "default": "Alt+Shift+P"
      },
      "description": "Open the side panel"
    }
  }
}
```

### Command Definition Properties

| Property | Type | Description |
|----------|------|-------------|
| `suggested_key` | `object` | Default keybinding(s) for different platforms |
| `description` | `string` | Human-readable description shown in shortcuts UI |
| `global` | `boolean` | If `true`, works when Chrome is not focused (optional) |

### Platform-Specific Keys

The `suggested_key` object supports platform-specific bindings:

| Platform Key | Description |
|--------------|-------------|
| `default` | Windows/Linux/ChromeOS |
| `mac` | macOS |
| `chromeos` | ChromeOS only |
| `linux` | Linux only |
| `windows` | Windows only |

## Special Command Names

Chrome reserves certain command names for specific behaviors:

| Command Name | Behavior |
|--------------|----------|
| `_execute_action` | Triggers the browser action (opens popup or fires `onClicked`) |
| `_execute_side_panel` | Opens the side panel |
| `_execute_browser_action` | Alias for `_execute_action` (deprecated) |

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": { "default": "Alt+Shift+E" },
      "description": "Trigger browser action"
    }
  }
}
```

## API Methods

### chrome.commands.getAll(callback)

Returns all defined commands and their current shortcuts.

```js
chrome.commands.getAll((commands) => {
  commands.forEach((cmd) => {
    console.log(`${cmd.name}: ${cmd.shortcut}`);
  });
});
```

**Response object (`Command`):**

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Command identifier |
| `description` | `string` | Command description |
| `shortcut` | `string` | Current keyboard shortcut (e.g., "Ctrl+Shift+Y") |

### Async version (MV3)

```js
const commands = await chrome.commands.getAll();
```

## Events

### chrome.commands.onCommand.addListener(callback)

Fires when a registered command is activated via keyboard shortcut.

```js
chrome.commands.onCommand.addListener((command, tab) => {
  switch (command) {
    case 'toggle-feature':
      toggleFeature(tab.id);
      break;
    case 'open-panel':
      chrome.sidePanel.open({ tabId: tab.id });
      break;
  }
});
```

**Listener parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | `string` | The command name that was triggered |
| `tab` | `Tab` | The active tab when the command was triggered |

## Key Combinations

### Supported Modifiers

| Modifier | Description |
|----------|-------------|
| `Ctrl` | Control key |
| `Alt` | Alternate key |
| `Shift` | Shift key |
| `Command` | Command key (Mac only) |
| `MacCtrl` | Mac Control key (use when you want the Control key on Mac, not Command) |

### Supported Keys

- **Letters:** A–Z
- **Numbers:** 0–9
- **Punctuation:** Comma, Period, Home, End, Space
- **Arrows:** ArrowLeft, ArrowUp, ArrowDown, ArrowRight
- **Function keys:** F1–F12
- **Media keys:** MediaNextTrack, MediaPlayPause, MediaPrevTrack, MediaStop

### Key Requirements

- Must include at least one modifier (Ctrl or Alt) — except for media keys
- Maximum of 4 shortcuts per extension
- Shortcuts are case-insensitive

```json
{
  "commands": {
    "valid-shortcut": {
      "suggested_key": { "default": "Ctrl+Shift+A" }
    },
    "media-shortcut": {
      "suggested_key": { "default": "MediaPlayPause" }
    }
  }
}
```

## Global Shortcuts

Global shortcuts work even when Chrome doesn't have focus. Enable by adding `"global": true` to your command definition:

```json
{
  "commands": {
    "quick-capture": {
      "suggested_key": { "default": "Ctrl+Shift+N" },
      "description": "Quick capture (works globally)",
      "global": true
    }
  }
}
```

**Important:** Global shortcuts require the user to grant permission. They can be disabled by the user in Chrome's settings or by other applications.

## Code Examples

### Basic Command Handler

```js
// background.js
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log(`Command triggered: ${command}`);

  if (command === 'toggle-feature') {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
  }
});
```

### Display Shortcuts in Options Page

```js
// options.js
document.addEventListener('DOMContentLoaded', async () => {
  const commands = await chrome.commands.getAll();
  const list = document.getElementById('shortcuts-list');

  commands.forEach((cmd) => {
    const li = document.createElement('li');
    li.textContent = `${cmd.name}: ${cmd.shortcut || '(not set)'}`;
    list.appendChild(li);
  });
});
```

### Global Hotkey for Quick Capture

```js
// background.js - Global shortcut for capture functionality
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'quick-capture') {
    // Capture visible area
    chrome.tabs.captureVisibleTab(tab.id, { format: 'png' }, (dataUrl) => {
      // Save or process the capture
      chrome.storage.local.set({ latestCapture: dataUrl });
    });
  }
});
```

## Cross-References

- [Commands Permission](../permissions/commands.md) — Detailed permission reference
- [Keyboard Shortcuts Guide](../guides/commands-keyboard-shortcuts.md) — Step-by-step implementation guide
- [Keyboard Shortcuts Pattern](../patterns/keyboard-shortcuts-api.md) — Recommended patterns and best practices
