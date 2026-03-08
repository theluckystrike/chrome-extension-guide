---
layout: default
title: "Chrome Extension Keyboard Shortcuts — How to Add Custom Hotkeys with the Commands API"
description: "Learn how to add custom keyboard shortcuts to your Chrome extension using the Commands API. Cover manifest configuration, suggested_key, onCommand listener, global shortcuts, and user customization."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/keyboard-shortcuts/"
---
# Chrome Extension Keyboard Shortcuts — How to Add Custom Hotkeys with the Commands API

## Introduction {#introduction}

Keyboard shortcuts dramatically improve user experience by allowing quick access to extension functionality without navigating through menus or clicking buttons. Chrome provides the **Commands API** (also called "commands" or "hotkeys") specifically for this purpose. This guide covers everything you need to know to implement custom keyboard shortcuts in your Chrome extension.

The Commands API allows you to define keyboard shortcuts that trigger actions in your extension, either globally across Chrome or only when your extension's context is active. Users can also customize these shortcuts through Chrome's extension settings.

## Declaring Commands in manifest.json {#manifestjson}

Commands are declared in the `manifest.json` file under the `commands` key. Each command needs a name, a description, and at least one key combination defined using `suggested_key`.

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "commands": {
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+F",
        "mac": "Command+Shift+F"
      },
      "description": "Toggle the main feature"
    },
    "open-panel": {
      "suggested_key": {
        "default": "Alt+P",
        "mac": "Option+P"
      },
      "description": "Open the side panel"
    }
  }
}
```

### Key Properties {#key-properties}

- **Command name**: A unique identifier (e.g., `"toggle-feature"`) used to reference the command in your code
- **description**: Human-readable explanation shown in Chrome's keyboard shortcut settings
- **suggested_key**: Defines the default keybinding. Use `"default"` for Windows/Linux and `"mac"` for macOS
- **global** (optional): Set to `true` to make the shortcut work even when Chrome isn't focused

## Listening for Commands with chrome.commands.onCommand {#oncommand}

Once you've declared commands in the manifest, you need to listen for them in your background service worker. The `chrome.commands.onCommand` listener fires whenever the user activates a command.

```javascript
// background.js (service worker)
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'toggle-feature':
      toggleFeature();
      break;
    case 'open-panel':
      openSidePanel();
      break;
  }
});

async function toggleFeature() {
  // Your implementation here
  console.log('Toggle feature activated');
}

async function openSidePanel() {
  await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
}
```

### Best Practices for Command Handlers {#best-practices}

- Keep command handlers lightweight and fast
- Use async/await for any asynchronous operations
- Add error handling to prevent unhandled exceptions
- Consider adding analytics to track which commands are used most

## Global vs. Context-Specific Shortcuts {#global-vs-context}

Chrome extensions support two types of keyboard shortcuts:

### Regular Shortcuts (Default)

By default, commands only work when your extension is "active" — meaning the user has interacted with your extension UI (popup, side panel, or content script). This is the recommended approach for most extensions.

```json
{
  "commands": {
    "do-something": {
      "suggested_key": {
        "default": "Ctrl+Shift+S"
      },
      "description": "Do something when extension is active"
    }
  }
}
```

### Global Shortcuts

Global shortcuts work anywhere in Chrome, even when your extension isn't active. They require the `"commands"` permission (which is automatic when you use the commands key) and should be used sparingly.

```json
{
  "commands": {
    "open-my-extension": {
      "suggested_key": {
        "default": "Ctrl+Shift+E"
      },
      "description": "Open my extension from anywhere",
      "global": true
    }
  }
}
```

**Important**: Global shortcuts can conflict with other extensions or Chrome's built-in shortcuts. Chrome will warn users if there's a conflict.

## User Customization {#user-customization}

One powerful feature of the Commands API is that users can remap shortcuts through Chrome's extension settings. Users navigate to `chrome://extensions` → click your extension → click "Keyboard shortcuts" to view and modify bindings.

### Querying Current Shortcuts

Your extension can check what shortcut is currently assigned:

```javascript
chrome.commands.getAll((commands) => {
  commands.forEach((command) => {
    console.log(`Command: ${command.name}`);
    console.log(`Shortcut: ${command.shortcut || 'Not set'}`);
    console.log(`Global: ${command.global}`);
  });
});
```

### Handling User-Defined Shortcuts

Always use `chrome.commands.onCommand` regardless of what the user has configured. The listener receives the command name (not the key combination), so it works consistently whether the user has customized the shortcut or not.

## Platform-Specific Considerations {#platform-specific}

When defining keyboard shortcuts, consider these platform differences:

| Concept | Windows/Linux | macOS |
|---------|---------------|-------|
| Modifier | `Ctrl`, `Alt`, `Shift` | `Command`, `Option`, `Control` |
| Special keys | `Ctrl+Shift+Right` | `Command+Shift+Right` |
| Function keys | `F12` | `F12` (works the same) |

Always provide both `default` and `mac` keys in your suggested_key configuration. Note that macOS uses `Command` (⌘) as the primary modifier, not `Control`.

## Advanced: Scope Limitations {#limitations}

Chrome imposes several limitations on keyboard shortcuts:

- Shortcuts cannot use `Escape`, `VolumeUp`, `VolumeDown`, or media keys
- Some system shortcuts (like `Ctrl+N` for new window) cannot be overridden
- Extensions cannot claim shortcuts already used by other extensions
- Global shortcuts require the extension to have a background service worker

## Summary {#summary}

The Chrome Commands API provides a straightforward way to add keyboard shortcuts to your extension. Remember these key points:

1. Declare commands in `manifest.json` with clear descriptions
2. Listen for commands using `chrome.commands.onCommand`
3. Use global shortcuts sparingly and only when necessary
4. Users can remap shortcuts through Chrome's settings
5. Always provide platform-specific key configurations

With proper keyboard shortcut implementation, your extension becomes more efficient and user-friendly for power users who prefer keyboard-driven workflows.
