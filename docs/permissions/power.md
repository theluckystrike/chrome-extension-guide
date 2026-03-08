---
title: "Power Permission"
description: "- Permission string: `"power"` - Grants access to `chrome.power` API - Controls display and system sleep behavior - Does not trigger a warning at install time"
permalink: /permissions/power/
category: permissions
order: 30
---

# Power Permission

## Overview
- Permission string: `"power"`
- Grants access to `chrome.power` API
- Controls display and system sleep behavior
- Does not trigger a warning at install time

## API Methods
- `chrome.power.requestKeepAwake(level)` where level is `"display"` or `"system"`
  - `"display"` keeps screen on and prevents system sleep
  - `"system"` prevents system sleep only, screen can dim
- `chrome.power.releaseKeepAwake()` releases the keep-awake request

## Manifest Declaration
```json
{ "permissions": ["power"] }
```

## Use Cases
- Presentations and slideshows: keep screen on during presentation
- Media playback: prevent sleep during video/audio
- Long-running downloads: keep system awake until complete
- Kiosk mode: permanent display-on for digital signage
- Timer/stopwatch apps: keep display visible
- Video conferencing extensions: maintain active session

## MV3 Considerations
- Service worker can call requestKeepAwake but SW may go idle
- Re-request after service worker wake-up using chrome.alarms
- Pattern: alarm triggers, SW wakes, re-call requestKeepAwake
- Keep-awake state persists in browser even after SW terminates
- On SW wake-up, re-read state and re-request if needed

## Battery Impact
- Display mode: significant battery drain
- System mode: moderate drain
- Always call releaseKeepAwake when no longer needed
- Good pattern: pair with chrome.idle to auto-release
- Don't use "display" when "system" suffices
- Always provide user controls and auto-release mechanisms

## Code Examples
### Basic Keep-Awake Toggle
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

### Alarm-Based Re-request Pattern for MV3
```typescript
chrome.runtime.onStartup.addListener(async () => {
  const isAwake = await storage.get('keepAwake');
  if (isAwake) {
    chrome.power.requestKeepAwake('display');
  }
});

// Timed keep-awake with auto-release
chrome.power.requestKeepAwake('display');
chrome.alarms.create('release-power', { delayInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'release-power') {
    chrome.power.releaseKeepAwake();
    storage.set('keepAwake', false);
  }
});
```

### Integration with @theluckystrike/webext-storage
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ 
  keepAwake: 'boolean',
  keepAwakeLevel: 'string' 
});
const storage = createStorage(schema, 'local');

// Persist and restore state
async function enableKeepAwake(level: 'display' | 'system') {
  chrome.power.requestKeepAwake(level);
  await storage.set('keepAwake', true);
  await storage.set('keepAwakeLevel', level);
}

async function disableKeepAwake() {
  chrome.power.releaseKeepAwake();
  await storage.set('keepAwake', false);
}
```

## Cross-references
- permissions/idle.md
- guides/power-management.md
- patterns/power-api.md
