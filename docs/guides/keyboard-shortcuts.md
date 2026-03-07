# Chrome Extension Keyboard Shortcuts

## Introduction
- The `chrome.commands` API allows extensions to define keyboard shortcuts
- Shortcuts can trigger actions even when the extension has no UI open
- Users can customize shortcuts via `chrome://extensions/shortcuts`
- Requires `"commands"` permission in manifest.json
- Cross-ref: `docs/permissions/commands.md`

## manifest.json Configuration

### Basic Setup
```json
{
  "name": "My Extension",
  "commands": {
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Toggle the feature on/off"
    }
  }
}
```

### Platform-Specific Keys
```json
{
  "commands": {
    "open-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+P",
        "mac": "MacCtrl+Shift+P",
        "linux": "Ctrl+Shift+P",
        "chromeos": "Ctrl+Shift+U"
      },
      "description": "Open side panel"
    }
  }
}
```

## Handling Commands

### Basic Command Listener
```javascript
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
```

### With Action Parameters
```javascript
chrome.commands.onCommand.addListener(async (command) => {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  
  switch (command) {
    case 'format-code':
      chrome.tabs.sendMessage(tab[0].id, { action: 'format' });
      break;
    case 'refactor-selection':
      chrome.tabs.sendMessage(tab[0].id, { action: 'refactor' });
      break;
  }
});
```

## Special Commands

### _execute_action (Action Button)
- Triggers the extension's action (toolbar icon) click
- Works even if the extension has no popup
```json
{
  "commands": {
    "execute-action": {
      "suggested_key": {
        "default": "Ctrl+Shift+E"
      },
      "description": "Trigger extension action"
    }
  }
}
```
```javascript
// No special listener needed - triggers chrome.action.onClicked
chrome.action.onClicked.addListener((tab) => {
  // This fires when user presses the shortcut
});
```

### _execute_browser_action (MV2)
- Equivalent to `_execute_action` in MV3
- Still works for backward compatibility
```json
{
  "commands": {
    "open-popup": {
      "suggested_key": {
        "default": "Ctrl+Shift+B"
      },
      "description": "Open browser action popup"
    }
  }
}
```

### _execute_side_panel (Side Panel API)
- Opens the side panel programmatically
```json
{
  "commands": {
    "toggle-side-panel": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Toggle side panel"
    }
  }
}
```

## Platform-Specific Considerations

### Mac Modifier Keys
- `Command` = Mac ⌘ key
- `MacCtrl` = Control key on Mac (different from Ctrl)
- `Ctrl` = Control key on Windows/Linux
```json
{
  "commands": {
    "mac-special": {
      "suggested_key": {
        "default": "Ctrl+Shift+M",
        "mac": "Command+Shift+M"
      }
    }
  }
}
```

### Key Syntax
| Key | Description |
|-----|-------------|
| `Ctrl` | Control (Windows/Linux) |
| `Command` | ⌘ (Mac) |
| `MacCtrl` | Control on Mac |
| `Alt` | Alt/Option |
| `Shift` | Shift |
| `Space` | Spacebar |
| `Up`/`Down`/`Left`/`Right` | Arrow keys |
| `0-9` | Number keys |
| `A-Z` | Letter keys |

### Modifier Order
- Always: `Ctrl`/`Command` + `Shift` + `Alt` + key
- Example: `Ctrl+Shift+Alt+T`

## User Customization

### Accessing User-Defined Shortcuts
```javascript
chrome.commands.getAll((commands) => {
  commands.forEach(cmd => {
    console.log(`${cmd.name}: ${cmd.shortcut || 'not set'}`);
  });
});
```

### Detecting Shortcut Changes
```javascript
chrome.commands.onCommand.addListener((command) => {
  console.log(`User triggered: ${command}`);
});

// Note: There's no direct "onCommandChanged" event
// Users must press the shortcut to trigger your handler
```

### Preserving User Settings
- User shortcuts persist across extension updates
- Don't hardcode shortcuts in your code
- Always use `chrome.commands.onCommand` regardless of manifest settings

## Security Restrictions

### Scope Limits
- Shortcuts must include at least one modifier (Ctrl, Alt, etc.)
- Single keys without modifiers are blocked
- Some system shortcuts cannot be overridden

### Restricted Shortcuts
Cannot override:
- `Ctrl+Alt+Del`
- `F12` in some contexts
- System browser shortcuts

## Common Patterns

### Toggle State
```javascript
let isEnabled = false;

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-feature') {
    isEnabled = !isEnabled;
    chrome.storage.local.set({ isEnabled });
    chrome.action.setIcon({
      path: isEnabled ? 'icon-active.png' : 'icon-inactive.png'
    });
  }
});
```

### Multi-Feature Shortcuts
```json
{
  "commands": {
    "do-something": {
      "suggested_key": { "default": "Ctrl+Shift+1" }
    },
    "do-something-else": {
      "suggested_key": { "default": "Ctrl+Shift+2" }
    },
    "do-another-thing": {
      "suggested_key": { "default": "Ctrl+Shift+3" }
    }
  }
}
```

### Context Menu Integration
```javascript
chrome.commands.onCommand.addListener((command) => {
  if (command === 'quick-note') {
    chrome.contextMenus.create({
      id: 'quick-note',
      title: 'Add Quick Note',
      contexts: ['selection']
    });
  }
});
```

### Content Script Communication
```javascript
// background.js
chrome.commands.onCommand.addListener((command, tab) => {
  chrome.tabs.sendMessage(tab.id, { command });
});

// content.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.command === 'format-selection') {
    formatSelectedText();
  }
});
```

## Best Practices

### Design Guidelines
1. Always provide default shortcuts via `suggested_key`
2. Use platform-specific keys for Mac compatibility
3. Document recommended shortcuts in your extension's README
4. Test on all platforms your extension supports

### Implementation Guidelines
1. Register `onCommand` listener at top level of service worker
2. Don't assume shortcuts are immutable—users can change them
3. Handle the case where no shortcut is set
4. Use descriptive command names (`toggle-dark-mode` not `cmd1`)

### UI Feedback
```javascript
chrome.commands.onCommand.addListener((command) => {
  // Show visual feedback
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Extension',
    message: `Executed: ${command}`
  });
});
```

## Manifest Reference

### Full Command Object
```json
{
  "commands": {
    "command-name": {
      "suggested_key": {
        "default": "Ctrl+Shift+K",
        "mac": "Command+Shift+K",
        "linux": "Ctrl+Shift+K",
        "chromeos": "Ctrl+Shift+K"
      },
      "description": "What this shortcut does",
      "global": false
    }
  }
}
```

### Global vs Page Shortcuts
- `global: true` - works even when Chrome isn't focused (requires "commands.global" permission)
- `global: false` (default) - only works when Chrome is the active window
- Note: Global shortcuts require additional approval during Chrome Web Store review

## Troubleshooting

### Shortcut Not Working
1. Check `chrome://extensions/shortcuts` - is it set?
2. Verify the command name matches exactly
3. Ensure listener is registered at top level
4. Check for conflicts with other extensions

### Development Tips
1. Use `Ctrl+Shift+[0-9]` for personal dev shortcuts
2. Log command names to debug
3. Test on Mac with Command key
4. Remember Chrome caches service workers

### Common Errors
```
"Invalid key combination" - Missing modifier or invalid key
"Shortcut unavailable" - Already taken by browser/extension
"Permission denied" - Need "commands" permission
```

## Advanced Patterns

### Command Throttling and Debouncing
Prevent rapid-fire command execution with throttling:
```javascript
// Throttle command execution
const throttleStates = new Map();

function createThrottledHandler(command, cooldown = 1000) {
  const state = { lastExecution: 0, isInCooldown: false, cooldownDuration: cooldown };
  throttleStates.set(command, state);
  return async (handler) => {
    if (state.isInCooldown) return;
    state.lastExecution = Date.now();
    state.isInCooldown = true;
    await handler();
    setTimeout(() => { state.isInCooldown = false; }, cooldown);
  };
}

// Usage
const throttledToggle = createThrottledHandler('toggle-feature', 500);

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-feature') {
    throttledToggle(async () => {
      // Your handler logic here
      console.log('Feature toggled');
    })();
  }
});
```

### Multi-Key Sequences (Chord Shortcuts)
Implement two-step shortcuts similar to Vim:
```javascript
// background.js - Chord/sequence handler
const chordDefinitions = {
  'ctrl+k ctrl+s': { keys: ['Ctrl+K', 'Ctrl+S'], handler: async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: 'QUICK_SAVE' });
  }},
  'ctrl+k ctrl+f': { keys: ['Ctrl+K', 'Ctrl+F'], handler: async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_FIND' });
  }},
};

const chordState = { sequence: [], timeoutId: null, timeoutDuration: 1000 };

function resetChord() {
  if (chordState.timeoutId) clearTimeout(chordState.timeoutId);
  chordState.sequence = [];
}

function processChordKey(key) {
  chordState.sequence.push(key);
  const current = chordState.sequence.join(' ');
  const match = chordDefinitions[current.toLowerCase()];
  if (match) {
    match.handler();
    resetChord();
    return;
  }
  const partials = Object.keys(chordDefinitions).filter(c => c.startsWith(current.toLowerCase()));
  if (partials.length === 0) {
    resetChord();
    return;
  }
  if (chordState.timeoutId) clearTimeout(chordState.timeoutId);
  chordState.timeoutId = setTimeout(() => resetChord(), chordState.timeoutDuration);
}
```

### Shortcut Conflict Detection
Detect and warn about conflicts with browser/OS shortcuts:
```javascript
// Reserved Chrome shortcuts
const CHROME_RESERVED = [
  { shortcut: 'Ctrl+Shift+N', description: 'New incognito window' },
  { shortcut: 'Ctrl+Shift+T', description: 'Reopen closed tab' },
  { shortcut: 'Command+Option+I', description: 'DevTools (Mac)' },
  { shortcut: 'CommandOrControl+Shift+K', description: 'Omnibox' },
];

// OS-specific reserved shortcuts
const OS_RESERVED = {
  macOS: ['Command+Q', 'Command+W', 'Command+T', 'Command+Space'],
  Windows: ['Alt+F4', 'Alt+Tab', 'Win+D'],
  Linux: ['Ctrl+Alt+T', 'Alt+F4'],
};

async function detectConflicts() {
  const commands = await chrome.commands.getAll();
  const conflicts = [];
  const platform = navigator.platform.includes('Mac') ? 'macOS' :
                  navigator.platform.includes('Win') ? 'Windows' : 'Linux';

  for (const cmd of commands) {
    if (!cmd.shortcut) continue;
    for (const reserved of CHROME_RESERVED) {
      if (cmd.shortcut === reserved.shortcut) {
        conflicts.push({ command: cmd.name, conflict: reserved.description });
      }
    }
    for (const reserved of OS_RESERVED[platform] || []) {
      if (cmd.shortcut === reserved) {
        conflicts.push({ command: cmd.name, conflict: `OS: ${reserved}` });
      }
    }
  }
  return conflicts;
}

// Usage
detectConflicts().then(conflicts => {
  if (conflicts.length > 0) {
    console.warn('Shortcut conflicts detected:', conflicts);
  }
});
```

### Keyboard Shortcut Onboarding
Help users discover shortcuts with an onboarding flow:
```javascript
// components/ShortcutOnboarding.js
const onboardingSteps = [
  { id: 'welcome', title: 'Welcome', desc: 'Learn keyboard shortcuts', shortcut: '' },
  { id: 'toggle', title: 'Toggle Feature', desc: 'Press to toggle the feature', shortcut: 'Ctrl+Shift+T' },
  { id: 'open-panel', title: 'Open Panel', desc: 'Open the side panel', shortcut: 'Ctrl+Shift+P' },
  { id: 'complete', title: 'All Set!', desc: 'Customize in Chrome settings', shortcut: '' },
];

class ShortcutOnboarding {
  constructor() {
    this.storageKey = 'shortcut-onboarding-done';
  }

  async shouldShow() {
    const result = await chrome.storage.local.get(this.storageKey);
    return !result[this.storageKey];
  }

  async complete() {
    await chrome.storage.local.set({ [this.storageKey]: true });
  }
}

function formatShortcut(shortcut) {
  return shortcut.split('+').map(key => `<kbd>${key}</kbd>`).join('+');
}

async function initOnboarding() {
  const onboarding = new ShortcutOnboarding();
  if (!(await onboarding.shouldShow())) return;

  // Create onboarding UI
  const container = document.createElement('div');
  container.id = 'shortcut-onboarding';
  container.innerHTML = `
    <div class="onboarding-overlay">
      <div class="onboarding-card">
        <h2 id="onboarding-title"></h2>
        <p id="onboarding-desc"></p>
        <div id="onboarding-shortcut"></div>
        <button id="onboarding-next">Next</button>
        <button id="onboarding-skip">Skip</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  let step = 0;
  const updateStep = () => {
    const s = onboardingSteps[step];
    document.getElementById('onboarding-title').textContent = s.title;
    document.getElementById('onboarding-desc').textContent = s.desc;
    document.getElementById('onboarding-shortcut').innerHTML = s.shortcut ? formatShortcut(s.shortcut) : '';
  };

  updateStep();
  document.getElementById('onboarding-next').onclick = () => {
    step++;
    if (step >= onboardingSteps.length) {
      container.remove();
      onboarding.complete();
    } else {
      updateStep();
    }
  };
  document.getElementById('onboarding-skip').onclick = () => container.remove();
}

// Render cheat sheet for options page
function renderCheatSheet(commands) {
  return `
    <table class="shortcut-table">
      <tr><th>Action</th><th>Shortcut</th></tr>
      ${commands.map(c => `
        <tr>
          <td>${c.description || c.name}</td>
          <td><code>${c.shortcut || 'Not set'}</code></td>
        </tr>
      `).join('')}
    </table>
    <button id="customize-shortcuts">Customize Shortcuts</button>
    <script>
      document.getElementById('customize-shortcuts').onclick = () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      };
    </script>
  `;
}
```

### Visual Feedback on Command Execution
Provide clear visual feedback when shortcuts are triggered:
```javascript
chrome.commands.onCommand.addListener((command) => {
  // Update badge
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1000);

  // Show notification for important commands
  if (command.startsWith('toggle-')) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Command Executed',
      message: `${command} was triggered`
    });
  }
});
```

## Cross-References
- Permissions: `docs/permissions/commands.md`
- Patterns: `docs/patterns/keyboard-shortcuts-api.md`
- Keyboard Navigation: `docs/guides/chrome-extension-keyboard-navigation.md`
- Reference: [developer.chrome.com/docs/extensions/reference/api/commands](https://developer.chrome.com/docs/extensions/reference/api/commands)
