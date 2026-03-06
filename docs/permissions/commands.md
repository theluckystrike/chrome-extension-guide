# commands (Manifest Key)

## What It Is
`commands` is a manifest key (not a `permissions` entry) that lets you define keyboard shortcuts your extension can listen for. It enables the `chrome.commands` API.

## Manifest
```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Open the extension popup"
    },
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+U",
        "mac": "Command+Shift+U"
      },
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
- Must include `Ctrl` or `Alt` (on Mac: `Command` or `MacCtrl`)
- `Shift` is optional modifier
- Media keys allowed: `MediaNextTrack`, `MediaPlayPause`, `MediaPrevTrack`, `MediaStop`
- Maximum 4 suggested shortcuts per extension
- Users can override at `chrome://extensions/shortcuts`

## API Access
```typescript
// Listen for command
chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'toggle-feature') {
    // handle shortcut
  }
});

// List all registered commands
const commands = await chrome.commands.getAll();
commands.forEach(cmd => {
  console.log(`${cmd.name}: ${cmd.shortcut || 'not set'}`);
});
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
Global shortcuts work even when Chrome is not focused. Limited availability (Ctrl+Shift+[0-9] on most platforms).

## Cross-Platform Keys
| Windows/Linux | Mac |
|---|---|
| `Ctrl` | `Command` |
| `Alt` | `Option` |
| `MacCtrl` (n/a) | `MacCtrl` (physical Ctrl) |

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
- Let users trigger features without clicking
- Open popup/side panel via hotkey

## Limitations
- Max 4 suggested key bindings
- Users can change or remove bindings
- Some key combos reserved by OS/browser
- `global: true` limited to Ctrl+Shift+[0-9]

## Cross-References
- Guide: `docs/guides/commands-keyboard-shortcuts.md`
- Related: `docs/permissions/activeTab.md`
