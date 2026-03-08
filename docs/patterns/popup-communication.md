---
layout: default
title: "Chrome Extension Popup Communication — Best Practices"
description: "Communicate between popups and background scripts."
---

# Popup Communication

## Overview

Chrome extension popups are created on click and destroyed on blur, requiring specific communication patterns for reliable functionality.

---

## Popup Lifecycle

```javascript
document.addEventListener('DOMContentLoaded', () => console.log('Open'));
window.addEventListener('unload', () => console.log('Closed'));
```

## Loading Data from Storage

```typescript
async function init() {
  const cached = await chrome.storage.local.get('data');
  if (cached.data) render(cached.data);
  const fresh = await chrome.runtime.sendMessage({ type: 'GET_DATA' });
  await chrome.storage.local.set({ data: fresh });
  render(fresh);
}
```

## Sending Commands via runtime.sendMessage

```typescript
await chrome.runtime.sendMessage({ type: 'ACTION', payload: data });

async function request(msg: unknown, ms = 5000) {
  return new Promise((r, e) => {
    const id = setTimeout(() => e(new Error('Timeout')), ms);
    chrome.runtime.sendMessage(msg, (v) => { clearTimeout(id); r(v); });
  });
}
```

## Real-Time Updates with Ports

```typescript
let port: chrome.runtime.Port;
function connect() {
  port = chrome.runtime.connect({ name: 'popup' });
  port.onMessage.addListener((m) => m.type === 'UPDATE' && handle(m.data));
}
function send(msg: unknown) { port?.postMessage(msg) || chrome.runtime.sendMessage(msg); }
```

## Popup to Content Script via tabs.sendMessage

```typescript
async function toTab(msg: unknown) {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.tabs.sendMessage(t.id!, msg);
}
```

## State Preservation in storage.session

```typescript
const key = 'popupState';
async function save(s: PopupState) { await chrome.storage.session.set({ [key]: s }); }
async function load() { return (await chrome.storage.session.get(key))[key]; }
```

## Preloading in Background

```typescript
// background.ts
chrome.runtime.onMessage.addListener((m, s, r) => {
  if (m.type === 'PRELOAD') preload(s.tab?.id).then(r);
  return true;
});
```

## Loading Indicators and Error States

```typescript
function loading(v: boolean) { document.getElementById('overlay')?.classList.toggle('hidden', !v); }
function error(e: Error) { const el = document.getElementById('error'); if (el) { el.textContent = e.message; el.classList.remove('hidden'); } }
```

## Related

- [Popup State Persistence](./popup-state-persistence.md)
- [Popup-to-Tab](./popup-to-tab.md)
- [Message Passing](../reference/message-passing-patterns.md)
