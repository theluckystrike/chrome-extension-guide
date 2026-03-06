# power Permission

## What It Grants
Access to the `chrome.power` API for controlling system and display power management (preventing sleep/screen off).

## Manifest
```json
{
  "permissions": ["power"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access
When granted, you can use:
- `chrome.power.requestKeepAwake(level)` — prevent sleep
- `chrome.power.releaseKeepAwake()` — allow sleep again

### Keep-Awake Levels
| Level | Effect |
|---|---|
| `"system"` | Prevents system from sleeping (display may turn off) |
| `"display"` | Prevents both system sleep AND display from turning off |

## Basic Usage
```typescript
// Prevent display from sleeping
chrome.power.requestKeepAwake("display");

// Later, release
chrome.power.releaseKeepAwake();
```

## Toggle Pattern
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ keepAwake: 'boolean' });
const storage = createStorage(schema, 'local');

chrome.action.onClicked.addListener(async () => {
  const isAwake = await storage.get('keepAwake');
  if (isAwake) {
    chrome.power.releaseKeepAwake();
    await storage.set('keepAwake', false);
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.power.requestKeepAwake('display');
    await storage.set('keepAwake', true);
    chrome.action.setBadgeText({ text: 'ON' });
  }
});
```

## MV3 Service Worker Considerations
- Service worker can terminate — keep-awake state persists in browser
- On SW wake-up, re-read state and re-request if needed:
```typescript
chrome.runtime.onStartup.addListener(async () => {
  const isAwake = await storage.get('keepAwake');
  if (isAwake) {
    chrome.power.requestKeepAwake('display');
  }
});
```

## Timed Keep-Awake
```typescript
chrome.power.requestKeepAwake('display');
chrome.alarms.create('release-power', { delayInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'release-power') {
    chrome.power.releaseKeepAwake();
    storage.set('keepAwake', false);
  }
});
```

## When to Use
- Presentation mode / kiosk mode
- Media playback extensions
- Long download/upload monitoring
- Video conferencing extensions
- Pomodoro/timer extensions

## When NOT to Use
- Don't keep awake permanently — wastes battery
- Don't use `"display"` when `"system"` suffices
- Release as soon as the reason ends

## Battery Impact
Keeping the display awake significantly increases power consumption. Always provide user controls and auto-release mechanisms.

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('power');
```

## Cross-References
- Guide: `docs/guides/power-management.md`
- Patterns: `docs/patterns/power-api.md`
