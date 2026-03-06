# idle Permission

## What It Grants
Access to the `chrome.idle` API for detecting when the user is idle, active, or has locked their screen.

## Manifest
```json
{
  "permissions": ["idle"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access
When granted, you can use:
- `chrome.idle.queryState(detectionIntervalInSeconds)` — returns `"active"`, `"idle"`, or `"locked"`
- `chrome.idle.setDetectionInterval(intervalInSeconds)` — set the idle threshold (minimum 15 seconds)
- `chrome.idle.onStateChanged` — event fired when idle state changes

## Idle States
| State | Meaning |
|---|---|
| `"active"` | User is interacting with the system |
| `"idle"` | No user input for >= detection interval |
| `"locked"` | Screen is locked (OS-level) |

## Basic Usage
```typescript
// Query current state (idle after 60 seconds of no input)
const state = await chrome.idle.queryState(60);
console.log(`User is ${state}`);

// Set detection interval
chrome.idle.setDetectionInterval(30); // 30 seconds

// Listen for state changes
chrome.idle.onStateChanged.addListener((newState) => {
  console.log(`State changed to: ${newState}`);
});
```

## Auto-Save Pattern
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  draftContent: 'string',
  lastSaved: 'number'
});
const storage = createStorage(schema, 'local');

chrome.idle.setDetectionInterval(30);

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'idle') {
    // User went idle — save their work
    const draft = await storage.get('draftContent');
    if (draft) {
      await storage.set('lastSaved', Date.now());
      console.log('Auto-saved draft on idle');
    }
  }
});
```

## Presence Detection
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  GET_PRESENCE: { request: {}; response: { state: string; since: number } };
};

const messenger = createMessenger<Messages>();
let lastStateChange = Date.now();

chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener((state) => {
  lastStateChange = Date.now();
});

messenger.onMessage('GET_PRESENCE', async () => {
  const state = await chrome.idle.queryState(60);
  return { state, since: lastStateChange };
});
```

## Security Lockout
```typescript
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'locked' || state === 'idle') {
    // Clear sensitive data when user locks screen or goes idle
    await chrome.storage.session.clear();
    chrome.action.setBadgeText({ text: '🔒' });
  }
});
```

## Productivity Tracking
```typescript
chrome.idle.setDetectionInterval(120); // 2 minutes

chrome.idle.onStateChanged.addListener(async (state) => {
  const now = Date.now();
  if (state === 'active') {
    await storage.set('lastActive', now);
  } else if (state === 'idle') {
    const lastActive = await storage.get('lastActive');
    const activeTime = now - (lastActive || now);
    const total = (await storage.get('totalActiveTime')) || 0;
    await storage.set('totalActiveTime', total + activeTime);
  }
});
```

## Detection Interval
- Minimum: 15 seconds
- Default: 60 seconds
- Applies to both `queryState()` and `onStateChanged`
- Lower values = more responsive but more CPU usage

## When to Use
- Auto-save on idle
- Presence/availability indicators
- Security lockout (clear sensitive data)
- Productivity/time tracking
- Pause background operations when user is away
- Auto-logout after inactivity

## When NOT to Use
- If you only need to know when tab is visible — use `document.visibilityState`
- If you need precise mouse/keyboard tracking — use content script events

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('idle');
```

## Cross-References
- Guide: `docs/guides/idle-detection.md`
- Related: `docs/permissions/power.md`
