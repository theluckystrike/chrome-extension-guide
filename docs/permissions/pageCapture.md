---
title: "pageCapture Permission"
description: "Access to the `chrome.pageCapture` API for saving complete web pages as MHTML files. { "permissions": ["pageCapture"] } None — this permission does not trigger a warning at install time."
permalink: /permissions/pageCapture/
category: permissions
order: 28
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/pageCapture/"
---

# pageCapture Permission

## What It Grants
Access to the `chrome.pageCapture` API for saving complete web pages as MHTML files.

## Manifest
```json
{
  "permissions": ["pageCapture"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access
Single method:
```typescript
chrome.pageCapture.saveAsMHTML({ tabId: number }, (mhtmlData: Blob | undefined) => {
  // mhtmlData is a Blob containing the complete page as MHTML
});
```

## Promise-based (MV3)
```typescript
const mhtmlBlob = await chrome.pageCapture.saveAsMHTML({ tabId: tab.id! });
```

## Basic Usage
```typescript
// Save current tab as MHTML
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const mhtmlBlob = await chrome.pageCapture.saveAsMHTML({ tabId: tab.id! });

// Create download link
const url = URL.createObjectURL(mhtmlBlob);
await chrome.downloads.download({
  url,
  filename: `${tab.title || 'page'}.mhtml`,
  saveAs: true
});
```

## Web Clipper Pattern
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ savedPages: 'string' }); // JSON array of metadata
const storage = createStorage(schema, 'sync');

type Messages = {
  SAVE_PAGE: { request: { tabId: number }; response: { success: boolean; filename: string } };
  LIST_SAVED: { request: {}; response: { pages: Array<{ title: string; url: string; date: number }> } };
};
const m = createMessenger<Messages>();

m.onMessage('SAVE_PAGE', async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  const blob = await chrome.pageCapture.saveAsMHTML({ tabId });

  const filename = `saved/${Date.now()}-${(tab.title || 'page').replace(/[^a-z0-9]/gi, '_')}.mhtml`;
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({ url, filename });

  // Save metadata
  const pages = JSON.parse(await storage.get('savedPages') || '[]');
  pages.push({ title: tab.title || '', url: tab.url || '', date: Date.now() });
  await storage.set('savedPages', JSON.stringify(pages));

  return { success: true, filename };
});
```

## Context Menu Save
```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-page-mhtml',
    title: 'Save page as MHTML',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-page-mhtml' && tab?.id) {
    const blob = await chrome.pageCapture.saveAsMHTML({ tabId: tab.id });
    const url = URL.createObjectURL(blob);
    await chrome.downloads.download({
      url,
      filename: `${tab.title || 'page'}.mhtml`,
      saveAs: false
    });
  }
});
```

## What MHTML Contains
- Complete HTML content
- Inline CSS and JavaScript
- Embedded images (base64)
- All subresources bundled in a single file
- Can be opened directly in Chrome

## Key Characteristics
- Captures the rendered page state
- Includes all resources (images, CSS, JS)
- Output is a `Blob` (binary data)
- MHTML format is supported by Chrome, Edge, IE
- File sizes can be large (includes all resources)

## When to Use
- Page archival/offline saving
- Web clipping extensions
- Research tools (save sources)
- Evidence/documentation capture
- Offline reading

## When NOT to Use
- For screenshots — use `chrome.tabs.captureVisibleTab()`
- For page text only — use content scripts to extract text
- For specific elements — use content scripts with DOM selection
- For PDF export — not supported by this API

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('pageCapture');
```

## Cross-References
- Guide: `docs/guides/page-capture.md`
- Related: `docs/permissions/downloads.md`, `docs/tutorials/build-web-clipper.md`
