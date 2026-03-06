# Build a Site Blocker Extension

## Overview
Build an extension that blocks distracting websites using `chrome.declarativeNetRequest`, with a customizable blocklist, schedule-based blocking, and override password.

## Manifest
```json
{
  "manifest_version": 3,
  "name": "FocusGuard",
  "version": "1.0.0",
  "permissions": ["declarativeNetRequest", "storage", "alarms"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "declarative_net_request": {
    "rule_resources": [{ "id": "blocklist", "enabled": true, "path": "rules.json" }]
  }
}
```

## Dynamic Rule Management
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  blockedDomains: 'string',   // JSON array
  isEnabled: 'boolean',
  scheduleStart: 'string',    // "09:00"
  scheduleEnd: 'string',      // "17:00"
  overridePassword: 'string',
  blockCount: 'number'
});
const storage = createStorage(schema, 'local');

async function updateBlockRules() {
  const enabled = await storage.get('isEnabled');
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);

  if (!enabled) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds });
    return;
  }

  const domains = JSON.parse(await storage.get('blockedDomains') || '[]');
  const rules = domains.map((domain: string, i: number) => ({
    id: i + 1,
    priority: 1,
    action: { type: 'redirect' as const, redirect: { extensionPath: '/blocked.html' } },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: ['main_frame' as const]
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: rules
  });
}
```

## Messaging
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  ADD_SITE: { request: { domain: string }; response: { ok: boolean } };
  REMOVE_SITE: { request: { domain: string }; response: { ok: boolean } };
  TOGGLE_BLOCKING: { request: { enabled: boolean }; response: { ok: boolean } };
  GET_BLOCKLIST: { request: {}; response: { domains: string[]; enabled: boolean } };
  GET_STATS: { request: {}; response: { blocked: number } };
  OVERRIDE: { request: { password: string; minutes: number }; response: { ok: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('ADD_SITE', async ({ domain }) => {
  const domains = JSON.parse(await storage.get('blockedDomains') || '[]');
  if (!domains.includes(domain)) {
    domains.push(domain);
    await storage.set('blockedDomains', JSON.stringify(domains));
    await updateBlockRules();
  }
  return { ok: true };
});

m.onMessage('REMOVE_SITE', async ({ domain }) => {
  const domains = JSON.parse(await storage.get('blockedDomains') || '[]');
  const filtered = domains.filter((d: string) => d !== domain);
  await storage.set('blockedDomains', JSON.stringify(filtered));
  await updateBlockRules();
  return { ok: true };
});

m.onMessage('TOGGLE_BLOCKING', async ({ enabled }) => {
  await storage.set('isEnabled', enabled);
  await updateBlockRules();
  return { ok: true };
});
```

## Schedule-Based Blocking
```typescript
chrome.alarms.create('check-schedule', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check-schedule') {
    const start = await storage.get('scheduleStart');
    const end = await storage.get('scheduleEnd');
    if (!start || !end) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const shouldBlock = currentTime >= start && currentTime <= end;
    const isEnabled = await storage.get('isEnabled');

    if (shouldBlock !== isEnabled) {
      await storage.set('isEnabled', shouldBlock);
      await updateBlockRules();
    }
  }
});
```

## Temporary Override
```typescript
m.onMessage('OVERRIDE', async ({ password, minutes }) => {
  const stored = await storage.get('overridePassword');
  if (password !== stored) return { ok: false };

  await storage.set('isEnabled', false);
  await updateBlockRules();
  chrome.alarms.create('re-enable', { delayInMinutes: minutes });
  return { ok: true };
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 're-enable') {
    await storage.set('isEnabled', true);
    await updateBlockRules();
  }
});
```

## Block Counter
```typescript
// Track how many times blocking redirected user
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.url.includes(chrome.runtime.getURL('/blocked.html'))) {
    const count = ((await storage.get('blockCount')) || 0) + 1;
    await storage.set('blockCount', count);
    chrome.action.setBadgeText({ text: String(count) });
  }
});
```

## Blocked Page (blocked.html)
```html
<!DOCTYPE html>
<html>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#1a1a2e;color:#e0e0e0">
  <div style="text-align:center">
    <h1>Site Blocked</h1>
    <p>This site is blocked during focus time.</p>
    <p id="domain"></p>
  </div>
  <script src="blocked.js"></script>
</body>
</html>
```

## Default Blocklist Setup
```typescript
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await storage.set('blockedDomains', JSON.stringify([
      'twitter.com', 'x.com', 'reddit.com', 'facebook.com',
      'instagram.com', 'tiktok.com', 'youtube.com'
    ]));
    await storage.set('isEnabled', true);
    await storage.set('scheduleStart', '09:00');
    await storage.set('scheduleEnd', '17:00');
    await updateBlockRules();
  }
});
```

## Cross-References
- Permission: `docs/permissions/declarativeNetRequest.md`
- MV3: `docs/mv3/declarative-net-request.md`
- Tutorial: `docs/tutorials/build-focus-timer.md`
