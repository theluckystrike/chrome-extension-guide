---
layout: default
title: "Chrome Extension Keyboard Shortcuts — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Keyboard Shortcuts & Commands Guide

## Overview
- `chrome.commands` API for global and extension-scoped keyboard shortcuts
- Define shortcuts in manifest.json `"commands"` key
- Users can customize shortcuts at `chrome://extensions/shortcuts`

## Manifest Configuration
```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Open extension popup"
    },
    "toggle-feature": {
      "suggested_key": {
        "default": "Alt+T",
        "mac": "Alt+T"
      },
      "description": "Toggle the main feature on/off"
    },
    "run-scan": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Run a page scan"
    }
  }
}
```

## Special Commands
- `_execute_action` (MV3) — opens the extension popup (equivalent to clicking toolbar icon)
- `_execute_browser_action` (MV2) — opens the browser action popup
- `_execute_page_action` (MV2) — opens the page action popup
- These are built-in and don't dispatch `onCommand` events

## Listening for Commands
```javascript
chrome.commands.onCommand.addListener((command, tab) => {
  console.log(`Command: ${command} on tab: ${tab?.id}`);

  switch (command) {
    case 'toggle-feature':
      toggleFeature(tab);
      break;
    case 'run-scan':
      runScan(tab);
      break;
  }
});

async function toggleFeature(tab) {
  const enabled = !await getEnabled();
  await setEnabled(enabled);
  chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
}
```

## Querying Registered Commands
```javascript
chrome.commands.getAll((commands) => {
  commands.forEach(cmd => {
    console.log(`${cmd.name}: ${cmd.shortcut || '(not set)'} — ${cmd.description}`);
  });
});
```

## Key Combination Rules
### Required modifiers
- Must include `Ctrl` or `Alt` (Windows/Linux)
- Must include `Command` or `Alt` (Mac)
- `Shift` is optional

### Supported keys
- `A-Z`, `0-9`
- `Comma`, `Period`, `Home`, `End`, `PageUp`, `PageDown`
- `Space`, `Insert`, `Delete`
- Arrow keys: `Up`, `Down`, `Left`, `Right`
- Media keys: `MediaNextTrack`, `MediaPlayPause`, `MediaPrevTrack`, `MediaStop`

### Platform-specific keys
```json
{
  "suggested_key": {
    "default": "Ctrl+Shift+L",
    "windows": "Ctrl+Shift+L",
    "mac": "Command+Shift+L",
    "linux": "Ctrl+Shift+L",
    "chromeos": "Ctrl+Shift+L"
  }
}
```

## Global Shortcuts
```json
{
  "commands": {
    "global-toggle": {
      "suggested_key": { "default": "Ctrl+Shift+1" },
      "description": "Toggle from anywhere",
      "global": true
    }
  }
}
```
- Global shortcuts work even when Chrome is NOT focused
- Limited to `Ctrl+Shift+[0-9]` combinations
- User must explicitly enable at `chrome://extensions/shortcuts`

## Storing Shortcut Preferences
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  featureEnabled: 'boolean',
  lastCommand: 'string',
  commandCount: 'number'
}), 'local');

chrome.commands.onCommand.addListener(async (command) => {
  await storage.set('lastCommand', command);
  const count = (await storage.get('commandCount')) || 0;
  await storage.set('commandCount', count + 1);
});
```

## Limitations
- Maximum 4 suggested keyboard shortcuts per extension
- Users can add more manually at `chrome://extensions/shortcuts`
- Some key combinations are reserved by Chrome or the OS
- No way to programmatically change shortcuts
- `getAll()` returns user's current bindings, not suggested defaults

## Common Mistakes
- Using more than 4 `suggested_key` entries (only 4 allowed)
- Forgetting platform-specific `mac` key (Command instead of Ctrl)
- Not providing `description` (required for shortcuts UI)
- Relying on specific shortcuts being available (users can change them)
- Not handling undefined `tab` in `onCommand` callback
