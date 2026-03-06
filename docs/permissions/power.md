# power Permission

## What It Grants
Access to the `chrome.power` API for preventing system/display sleep.

## Manifest
```json
{
  "permissions": ["power"]
}
```

## User Warning
None — no warning at install.

## API Access
- `chrome.power.requestKeepAwake(level)` — prevent sleep ("system" or "display")
- `chrome.power.releaseKeepAwake()` — allow sleep again

### Levels
| Level | Effect |
|---|---|
| `"system"` | Prevents system sleep (display may turn off) |
| `"display"` | Prevents system sleep AND keeps display on |

## Basic Usage
```typescript
chrome.power.requestKeepAwake("display");
// ... later
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

## MV3 Wake-Up Re-request
```typescript
chrome.runtime.onStartup.addListener(async () => {
  if (await storage.get('keepAwake')) {
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
- Presentations / kiosk mode
- Media playback
- Long downloads
- Video conferencing
- Timer/pomodoro extensions

## When NOT to Use
- Don't keep awake permanently — battery drain
- Use `"system"` instead of `"display"` when screen isn't needed
- Always provide auto-release

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('power');
```

## Cross-References
- Guide: `docs/guides/power-management.md`
- Patterns: `docs/patterns/power-api.md`
- Related: `docs/permissions/idle.md`
