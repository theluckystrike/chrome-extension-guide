---
title: "clipboardWrite Permission"
description: "Allows the extension to write content to the system clipboard using `navigator.clipboard.writeText()` or `document.execCommand('copy')`. { "permissions": ["clipboardWrite"]"
permalink: /permissions/clipboardWrite/
category: permissions
order: 6
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/clipboardWrite/"
---

# clipboardWrite Permission

## What It Grants
Allows the extension to write content to the system clipboard using `navigator.clipboard.writeText()` or `document.execCommand('copy')`.

## Manifest
```json
{
  "permissions": ["clipboardWrite"]
}
```

## User Warning
"Modify data you copy and paste" — triggers a warning.

## How to Write Clipboard

### In Popup/Options Page
```typescript
// Modern Clipboard API (preferred)
await navigator.clipboard.writeText('Hello from extension!');

// Write rich content (HTML)
const blob = new Blob(['<b>Bold text</b>'], { type: 'text/html' });
await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);

// Legacy method
const textarea = document.createElement('textarea');
textarea.value = 'text to copy';
document.body.appendChild(textarea);
textarea.select();
document.execCommand('copy');
textarea.remove();
```

### In Service Worker (MV3)
Service workers cannot write clipboard directly. Use offscreen document:
```typescript
// background.ts
async function writeClipboard(text: string): Promise<void> {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Write to clipboard'
    });
  }
  await chrome.runtime.sendMessage({ type: 'WRITE_CLIPBOARD', text });
}

// offscreen.ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'WRITE_CLIPBOARD') {
    navigator.clipboard.writeText(msg.text)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
```

## Context Menu Copy Pattern
```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'copy-as-markdown',
    title: 'Copy link as Markdown',
    contexts: ['link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'copy-as-markdown' && info.linkUrl) {
    const markdown = `[${info.selectionText || info.linkUrl}](${info.linkUrl})`;
    await writeClipboard(markdown);
  }
});
```

## Messaging Integration
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  COPY_TO_CLIPBOARD: { request: { text: string }; response: { ok: boolean } };
  COPY_TAB_URL: { request: { format: 'plain' | 'markdown' | 'html' }; response: { ok: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('COPY_TAB_URL', async ({ format }) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let text: string;
  switch (format) {
    case 'markdown': text = `[${tab.title}](${tab.url})`; break;
    case 'html': text = `<a href="${tab.url}">${tab.title}</a>`; break;
    default: text = tab.url || '';
  }
  await writeClipboard(text);
  return { ok: true };
});
```

## Storage for Clipboard History
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ recentCopies: 'string' }); // JSON array
const storage = createStorage(schema, 'local');

async function trackCopy(text: string) {
  const recent = JSON.parse(await storage.get('recentCopies') || '[]');
  recent.unshift({ text: text.substring(0, 200), time: Date.now() });
  if (recent.length > 50) recent.length = 50;
  await storage.set('recentCopies', JSON.stringify(recent));
}
```

## When to Use
- Copy-to-clipboard buttons in popup/sidebar
- URL/text formatting and copying
- Code snippet copying
- Context menu copy actions
- Clipboard transformation tools

## When NOT to Use
- In content scripts on the user's page without clear intent
- Don't overwrite clipboard unexpectedly — always user-initiated

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('clipboardWrite');
```

## Cross-References
- Related: `docs/permissions/clipboardRead.md`, `docs/permissions/offscreen.md`
- Tutorial: `docs/tutorials/build-clipboard-manager.md`
