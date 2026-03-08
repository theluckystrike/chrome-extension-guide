---
title: "clipboardRead Permission"
description: "Allows reading clipboard content using `navigator.clipboard.readText()` or `document.execCommand('paste')`. { "permissions": ["clipboardRead"] } "Read data you copy and paste""
permalink: /permissions/clipboardRead/
category: permissions
order: 5
---

# clipboardRead Permission

## What It Grants
Allows reading clipboard content using `navigator.clipboard.readText()` or `document.execCommand('paste')`.

## Manifest
```json
{ "permissions": ["clipboardRead"] }
```

## User Warning
"Read data you copy and paste"

## Reading Clipboard

### Popup/Options Page
```typescript
const text = await navigator.clipboard.readText();
```

### Service Worker (MV3) — via Offscreen Document
```typescript
// background.ts
async function readClipboard(): Promise<string> {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Read clipboard'
    });
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'READ_CLIPBOARD' }, (r) => resolve(r.text));
  });
}

// offscreen.ts
chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.type === 'READ_CLIPBOARD') {
    navigator.clipboard.readText()
      .then(text => sendResponse({ text }))
      .catch(() => sendResponse({ text: '' }));
    return true;
  }
});
```

## Clipboard History Pattern
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const schema = defineSchema({ clipHistory: 'string' });
const storage = createStorage(schema, 'local');

async function saveToHistory(text: string) {
  const history = JSON.parse(await storage.get('clipHistory') || '[]');
  history.unshift({ text: text.substring(0, 500), time: Date.now() });
  if (history.length > 100) history.length = 100;
  await storage.set('clipHistory', JSON.stringify(history));
}
```

## Messaging Integration
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';
type Msgs = { GET_CLIPBOARD: { request: {}; response: { text: string } } };
const m = createMessenger<Msgs>();
m.onMessage('GET_CLIPBOARD', async () => {
  const text = await navigator.clipboard.readText();
  return { text };
});
```

## When to Use
- Clipboard managers, paste transformers, data extraction from clipboard

## When NOT to Use
- If only writing clipboard — use `clipboardWrite`
- If user pastes into your UI — no permission needed

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('clipboardRead');
```

## Cross-References
- Related: `docs/permissions/clipboardWrite.md`, `docs/permissions/offscreen.md`
- Tutorial: `docs/tutorials/build-clipboard-manager.md`
