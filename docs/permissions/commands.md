---
title: "commands (Manifest Key)"
description: "is a manifest key (not a entry) that defines keyboard shortcuts. Enables the API. { 'commands': { '_execute_action': {"
permalink: /permissions/commands/
category: permissions
order: 7
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/commands/"
---

# commands (Manifest Key)

## What It Is {#what-it-is}
`commands` is a manifest key (not a `permissions` entry) that defines keyboard shortcuts. Enables the `chrome.commands` API.

## Manifest {#manifest}
```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": { "default": "Ctrl+Shift+Y", "mac": "Command+Shift+Y" },
      "description": "Open the extension popup"
    },
    "toggle-feature": {
      "suggested_key": { "default": "Ctrl+Shift+U", "mac": "Command+Shift+U" },
      "description": "Toggle the feature on/off"
    }
  }
}
```

## User Warning {#user-warning}
None — keyboard shortcuts do not trigger a permission warning.

## Special Commands {#special-commands}
- `_execute_action` — triggers `chrome.action.onClicked` or opens the popup
- `_execute_side_panel` — opens the extension's side panel

## Key Format Rules {#key-format-rules}
- Must include `Ctrl` or `Alt` (Mac: `Command` or `MacCtrl`)
- `Shift` is optional modifier
- Media keys: `MediaNextTrack`, `MediaPlayPause`, `MediaPrevTrack`, `MediaStop`
- Maximum 4 suggested shortcuts per extension
- Users override at `chrome://extensions/shortcuts`

## API Access {#api-access}
```typescript
chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'toggle-feature') { /* handle */ }
});

const commands = await chrome.commands.getAll();
commands.forEach(cmd => console.log(`${cmd.name}: ${cmd.shortcut || 'not set'}`));
```

## Global Shortcuts {#global-shortcuts}
```json
{
  "commands": {
    "show-panel": {
      "suggested_key": { "default": "Ctrl+Shift+9" },
      "description": "Show panel",
      "global": true
    }
  }
}
```

## Storage Integration {#storage-integration}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const schema = defineSchema({ shortcutAction: 'string' });
const storage = createStorage(schema, 'sync');

chrome.commands.onCommand.addListener(async (command) => {
  const action = await storage.get('shortcutAction');
  if (action === 'notify') {
    chrome.notifications.create({ type: 'basic', title: command, message: 'Shortcut triggered' });
  }
});
```

## Common Use Cases

### Quick Access to Extension Features
Add keyboard shortcuts for frequently used extension features. This is especially useful for productivity tools where users need rapid access without clicking through menus.

### Popup/Side Panel Trigger
Use `_execute_action` or `_execute_side_panel` to open your extension's UI via keyboard. This provides a quick way to access your extension from anywhere in the browser.

### Power User Features
Enable power users to perform complex actions with a single keystroke. For example, a note-taking extension might use a shortcut to quickly capture the current page as a note.

### Toggle Functionality
Allow users to toggle features on and off, such as enabling/disabling a reading mode, turning on a dark theme, or activating a focus mode.

### Media Control
For extensions that handle media playback, use media keys to provide playback controls that work even when the extension's UI isn't visible.

## Best Practices

### Provide Sensible Defaults
Always provide suggested shortcuts, but understand that users can override them. Choose shortcuts that won't conflict with common browser or OS shortcuts.

### Support Both Platforms
When defining shortcuts, always specify keys for both `default` (Windows/Linux) and `mac` platforms. Remember that Mac uses `Command` instead of `Ctrl`.

### Limit to Four Suggestions
Chrome only allows four suggested shortcuts. Prioritize the most important ones and let users customize additional shortcuts through the shortcuts page.

### Use Global Shortcuts Judiciously
Global shortcuts (those that work even when Chrome isn't focused) are limited to Ctrl+Shift+[0-9]. Use them sparingly as they can conflict with other applications.

### Provide User Customization
Allow users to see and modify shortcuts. Direct them to `chrome://extensions/shortcuts` or provide a settings UI in your extension.

### Handle Command Events Safely
Command listeners should be resilient. If a command triggers an action that fails, provide feedback to the user rather than silently failing.

### Test Across Platforms
Test your shortcuts on both Windows and macOS. What works on one platform might not work as expected on another due to different keyboard layouts and modifier key behavior.

## When to Use

## When to Use {#when-to-use}
- Add keyboard shortcuts for common actions
- Open popup/side panel via hotkey
- Power-user features

## Limitations {#limitations}
- Max 4 suggested key bindings
- Some key combos reserved by OS/browser
- `global: true` limited to Ctrl+Shift+[0-9]

## Cross-References {#cross-references}
- Guide: `docs/guides/commands-keyboard-shortcuts.md`
- Related: `docs/permissions/activeTab.md`

## Frequently Asked Questions

### How do I add keyboard shortcuts to my Chrome extension?
Declare commands in your manifest.json with "commands" key, then handle them in your background script with chrome.commands.onCommand.addListener.

### What keyboard shortcuts are reserved in Chrome?
Ctrl+Shift+1 through Ctrl+Shift+9 are reserved by Chrome for switching to specific tabs. Your extension cannot override these.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
