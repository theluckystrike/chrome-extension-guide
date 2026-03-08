---
title: "clipboardRead Permission"
description: "Allows reading clipboard content using `navigator.clipboard.readText()` or `document.execCommand('paste')`. { "permissions": ["clipboardRead"] } "Read data you copy and paste""
permalink: /permissions/clipboardRead/
category: permissions
order: 5
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/clipboardRead/"
---

# clipboardRead Permission

## What It Grants {#what-it-grants}
Allows reading clipboard content using `navigator.clipboard.readText()` or `document.execCommand('paste')`.

## Manifest {#manifest}
```json
{ "permissions": ["clipboardRead"] }
```

## User Warning {#user-warning}
"Read data you copy and paste"

## Reading Clipboard {#reading-clipboard}

### Popup/Options Page {#popupoptions-page}
```typescript
const text = await navigator.clipboard.readText();
```

### Service Worker (MV3) — via Offscreen Document {#service-worker-mv3-via-offscreen-document}
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

## Clipboard History Pattern {#clipboard-history-pattern}
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

## Messaging Integration {#messaging-integration}
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';
type Msgs = { GET_CLIPBOARD: { request: {}; response: { text: string } } };
const m = createMessenger<Msgs>();
m.onMessage('GET_CLIPBOARD', async () => {
  const text = await navigator.clipboard.readText();
  return { text };
});
```

## Common Use Cases

### Clipboard Managers
Build comprehensive clipboard history managers that track multiple clipboard entries, allow searching through history, and let users paste previous items.

### Paste Transformers
Process clipboard content before pasting. For example, automatically format text, convert between formats (Markdown to HTML), or apply text transformations.

### Data Extraction
Extract specific data from clipboard content. For instance, parse URLs from copied text, extract email addresses from selected content, or pull structured data from copied spreadsheet cells.

### Quick Note Capture
Allow users to quickly capture clipboard contents as notes. This is useful for research, where users want to save information they've copied from web pages.

### Form Auto-Fill
Automatically fill form fields with data from the clipboard. This could include pasting addresses, phone numbers, or other frequently used information.

## Best Practices

### Use Offscreen Documents for Service Workers
In MV3, service workers cannot directly access the clipboard API. Always use an offscreen document for clipboard operations in the background script.

### Handle Permission Gracefully
The clipboardRead permission triggers a significant warning. Only request it when necessary and explain to users why you need access.

### Respect User Privacy
Clipboard content may contain sensitive information (passwords, personal data, credit card numbers). Never transmit clipboard data to external servers without explicit consent.

### Implement Security Measures
Consider adding options to exclude sensitive apps or to clear clipboard after reading. Some users may want to manually approve clipboard access.

### Cache When Appropriate
Clipboard access can be slow. If you need to access clipboard content multiple times, consider caching it temporarily rather than reading repeatedly.

### Handle Empty or Unsupported Content
The clipboard may be empty or contain unsupported formats. Always handle these cases gracefully in your code.

### Provide Visual Feedback
Let users know when clipboard content has been read and what will happen with it. This builds trust and helps users understand your extension's behavior.

## When to Use

## When to Use {#when-to-use}
- Clipboard managers, paste transformers, data extraction from clipboard

## When NOT to Use {#when-not-to-use}
- If only writing clipboard — use `clipboardWrite`
- If user pastes into your UI — no permission needed

## Permission Check {#permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('clipboardRead');
```

## Cross-References {#cross-references}
- Related: `docs/permissions/clipboardWrite.md`, `docs/permissions/offscreen.md`
- Tutorial: `docs/tutorials/build-clipboard-manager.md`

## Frequently Asked Questions

### How do I read the clipboard in a Chrome extension?
Add "clipboardRead" to your permissions in manifest.json, then use navigator.clipboard.readText() in your content script or background script to read clipboard contents.

### Why does clipboardRead require user gesture?
Chrome requires a user gesture (click, keypress) before allowing clipboard access to prevent malicious extensions from reading sensitive data silently.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
