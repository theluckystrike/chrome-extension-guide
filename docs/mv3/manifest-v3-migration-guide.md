---
layout: default
title: "Chrome Extension Manifest V3 Migration Guide — Manifest V3 Guide"
description: "Complete guide to migrating your Chrome extension from Manifest V2 to Manifest V3."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/mv3/manifest-v3-migration-guide/"
---

# Manifest V3 Migration Guide

## Quick Checklist
1. Change `"manifest_version": 2` → `3`
2. Replace `"background": { "scripts": [...] }` → `"background": { "service_worker": "background.js" }`
3. Replace `"browser_action"` / `"page_action"` → `"action"`
4. Move host permissions from `"permissions"` → `"host_permissions"`
5. Replace `chrome.browserAction` / `chrome.pageAction` → `chrome.action`
6. Replace `chrome.webRequest` blocking → `chrome.declarativeNetRequest`
7. Update CSP: no `unsafe-eval`, no remote scripts
8. Replace `chrome.tabs.executeScript` → `chrome.scripting.executeScript`
9. Replace `chrome.tabs.insertCSS` → `chrome.scripting.insertCSS`
10. Handle service worker lifecycle (no persistent state)

## Manifest Changes
```json
// MV2
{
  "manifest_version": 2,
  "background": { "scripts": ["bg.js"], "persistent": false },
  "browser_action": { "default_popup": "popup.html" },
  "permissions": ["tabs", "https://api.example.com/*"]
}

// MV3
{
  "manifest_version": 3,
  "background": { "service_worker": "background.js" },
  "action": { "default_popup": "popup.html" },
  "permissions": ["tabs"],
  "host_permissions": ["https://api.example.com/*"]
}
```

## Background Script → Service Worker

### No DOM Access
```typescript
// MV2 (had DOM in background page)
const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');

// MV3 — use offscreen document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['DOM_PARSER'],
  justification: 'Parse HTML'
});
```

### No Persistent State
```typescript
// MV2
let count = 0;
chrome.browserAction.onClicked.addListener(() => count++);

// MV3 — use storage
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const storage = createStorage(defineSchema({ count: 'number' }), 'local');
chrome.action.onClicked.addListener(async () => {
  const c = (await storage.get('count')) || 0;
  await storage.set('count', c + 1);
});
```

### No setInterval/setTimeout (long-running)
```typescript
// MV2
setInterval(() => poll(), 60000);

// MV3 — use alarms
chrome.alarms.create('poll', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'poll') poll(); });
```

## Web Request → Declarative Net Request
```typescript
// MV2 (blocking webRequest)
chrome.webRequest.onBeforeRequest.addListener(
  () => ({ cancel: true }),
  { urls: ['*://ads.example.com/*'] },
  ['blocking']
);

// MV3 (declarativeNetRequest rules)
// rules.json:
[{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": { "urlFilter": "||ads.example.com", "resourceTypes": ["script", "image"] }
}]
```

## Scripting API Changes
```typescript
// MV2
chrome.tabs.executeScript(tabId, { code: 'alert("hi")' });
chrome.tabs.executeScript(tabId, { file: 'content.js' });

// MV3
await chrome.scripting.executeScript({
  target: { tabId },
  func: () => alert('hi')
});
await chrome.scripting.executeScript({
  target: { tabId },
  files: ['content.js']
});
```

## Action API
```typescript
// MV2
chrome.browserAction.setIcon({ path: 'icon.png' });
chrome.browserAction.onClicked.addListener(handler);

// MV3
chrome.action.setIcon({ path: 'icon.png' });
chrome.action.onClicked.addListener(handler);
```

## Content Security Policy
```json
// MV2 — allowed remote scripts
{ "content_security_policy": "script-src 'self' https://cdn.example.com; object-src 'self'" }

// MV3 — no remote scripts, no eval
{ "content_security_policy": { "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'" } }
```

## Messaging with @theluckystrike/webext-messaging
```typescript
// Works the same in MV2 and MV3
import { createMessenger } from '@theluckystrike/webext-messaging';
type Msgs = { ACTION: { request: { data: string }; response: { ok: boolean } } };
const m = createMessenger<Msgs>();
// Handles SW lifecycle automatically
```

## Common Migration Pitfalls
- Listeners inside async functions — lost on SW restart
- Global variables — reset on termination
- DOM APIs in service worker — use offscreen document
- `XMLHttpRequest` — use `fetch()` instead
- `localStorage` — use `chrome.storage`
- `window` object — not available in SW

## Cross-References
- `docs/guides/mv2-to-mv3-migration.md`
- `docs/mv3/service-workers.md`
- `docs/mv3/event-driven-architecture.md`
- `docs/mv3/declarative-net-request.md`
