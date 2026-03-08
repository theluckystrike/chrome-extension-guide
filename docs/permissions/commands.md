---
title: "commands (Manifest Key)"
description: "`commands` is a manifest key (not a `permissions` entry) that defines keyboard shortcuts. Enables the `chrome.commands` API. { "commands": { "_execute_action": {"
permalink: /permissions/commands/
category: permissions
order: 7
---

# commands (Manifest Key)

## What It Is
`commands` is a manifest key (not a `permissions` entry) that defines keyboard shortcuts. Enables the `chrome.commands` API.

## Manifest
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

## User Warning
None — keyboard shortcuts do not trigger a permission warning.

## Special Commands
- `_execute_action` — triggers `chrome.action.onClicked` or opens the popup
- `_execute_side_panel` — opens the extension's side panel

## Key Format Rules
- Must include `Ctrl` or `Alt` (Mac: `Command` or `MacCtrl`)
- `Shift` is optional modifier
- Media keys: `MediaNextTrack`, `MediaPlayPause`, `MediaPrevTrack`, `MediaStop`
- Maximum 4 suggested shortcuts per extension
- Users override at `chrome://extensions/shortcuts`

## API Access
```typescript
chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'toggle-feature') { /* handle */ }
});

const commands = await chrome.commands.getAll();
commands.forEach(cmd => console.log(`${cmd.name}: ${cmd.shortcut || 'not set'}`));
```

## Global Shortcuts
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

## Storage Integration
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

## When to Use
- Add keyboard shortcuts for common actions
- Open popup/side panel via hotkey
- Power-user features

## Limitations
- Max 4 suggested key bindings
- Some key combos reserved by OS/browser
- `global: true` limited to Ctrl+Shift+[0-9]

## Cross-References
- Guide: `docs/guides/commands-keyboard-shortcuts.md`
- Related: `docs/permissions/activeTab.md`
