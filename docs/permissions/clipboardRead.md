# clipboardRead Permission

## What It Grants
Allows the extension to read clipboard content using `document.execCommand('paste')` or `navigator.clipboard.readText()`.

## Manifest
```json
{
  "permissions": ["clipboardRead"]
}
```

## User Warning
"Read data you copy and paste" — triggers a warning.

## How to Read Clipboard

### In Popup/Options Page
```typescript
// Modern Clipboard API (preferred)
const text = await navigator.clipboard.readText();
console.log('Clipboard:', text);

// Legacy method
document.execCommand('paste'); // pastes into focused element
```

### In Service Worker (MV3)
Service workers cannot access clipboard directly. Use an offscreen document:
```typescript
// background.ts
async function readClipboard(): Promise<string> {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Read clipboard content'
    });
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'READ_CLIPBOARD' }, (response) => {
      resolve(response.text);
    });
  });
}

// offscreen.ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'READ_CLIPBOARD') {
    navigator.clipboard.readText()
      .then(text => sendResponse({ text }))
      .catch(() => sendResponse({ text: '' }));
    return true;
  }
});
```

### In Content Script
```typescript
// Content scripts need user gesture + permission
document.addEventListener('keydown', async (e) => {
  if (e.ctrlKey && e.key === 'v') {
    const text = await navigator.clipboard.readText();
    chrome.runtime.sendMessage({ type: 'CLIPBOARD_PASTE', text });
  }
});
```

## Messaging Integration
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  GET_CLIPBOARD: { request: {}; response: { text: string } };
};
const m = createMessenger<Messages>();

m.onMessage('GET_CLIPBOARD', async () => {
  // From offscreen document or popup
  const text = await navigator.clipboard.readText();
  return { text };
});
```

## Storage Integration
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ clipboardHistory: 'string' }); // JSON array
const storage = createStorage(schema, 'local');

async function saveToHistory(text: string) {
  const history = JSON.parse(await storage.get('clipboardHistory') || '[]');
  history.unshift({ text, timestamp: Date.now() });
  if (history.length > 100) history.length = 100; // Keep last 100
  await storage.set('clipboardHistory', JSON.stringify(history));
}
```

## When to Use
- Clipboard manager/history extensions
- Paste transformation tools (format, clean, translate)
- Data extraction from clipboard
- Productivity tools

## When NOT to Use
- If you only need to write to clipboard — use `clipboardWrite` only
- If user pastes into your UI element — no permission needed

## Also See: clipboardWrite
For writing to clipboard, use the `clipboardWrite` permission with `navigator.clipboard.writeText()`.

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('clipboardRead');
```

## Cross-References
- Tutorial: `docs/tutorials/build-clipboard-manager.md`
- Related: `docs/permissions/offscreen.md`
