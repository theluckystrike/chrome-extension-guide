# offscreen Permission

## What It Grants
Access to the `chrome.offscreen` API for creating offscreen documents — hidden HTML pages that provide DOM access without visible UI. MV3 only.

## Manifest
```json
{
  "permissions": ["offscreen"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access
- `chrome.offscreen.createDocument(params)` — create an offscreen document
- `chrome.offscreen.closeDocument()` — close the offscreen document
- `chrome.offscreen.hasDocument()` — check if one exists (Chrome 116+)

## Creating an Offscreen Document
```typescript
await chrome.offscreen.createDocument({
  url: chrome.runtime.getURL('offscreen.html'),
  reasons: [chrome.offscreen.Reason.DOM_PARSER],
  justification: 'Parse HTML content from fetched pages'
});
```

## Reasons Enum
You must specify why you need the document. Valid reasons:

| Reason | Use Case |
|---|---|
| `TESTING` | Automated testing |
| `AUDIO_PLAYBACK` | Play audio |
| `IFRAME_SCRIPTING` | Interact with iframe content |
| `DOM_SCRAPING` | Parse/scrape DOM |
| `BLOBS` | Create/manage Blobs |
| `DOM_PARSER` | Use DOMParser API |
| `USER_MEDIA` | Access camera/microphone |
| `DISPLAY_MEDIA` | Screen capture |
| `WEB_RTC` | WebRTC connections |
| `CLIPBOARD` | Clipboard read/write |
| `LOCAL_STORAGE` | Access localStorage |
| `WORKERS` | Run web workers |
| `BATTERY_STATUS` | Battery API |
| `MATCH_MEDIA` | Media queries |
| `GEOLOCATION` | Geolocation API |

## Key Constraints
- **Only one offscreen document at a time** per extension
- Document has no visible UI
- Cannot use `chrome.tabs`, `chrome.windows`, or other UI-focused APIs
- Can use `chrome.runtime.sendMessage` to communicate with service worker

## Communication Pattern
```typescript
// In service worker:
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  PARSE_HTML: { request: { html: string }; response: { text: string } };
};
const m = createMessenger<Messages>();

// Ensure offscreen doc exists before sending
async function ensureOffscreen() {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Parse HTML'
    });
  }
}

// In offscreen.html script:
m.onMessage('PARSE_HTML', async ({ html }) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return { text: doc.body.textContent || '' };
});
```

## Clipboard Access Pattern
```typescript
// Service worker
await ensureOffscreen();
const text = await m.sendMessage('READ_CLIPBOARD', {});

// offscreen.js
m.onMessage('READ_CLIPBOARD', async () => {
  const text = await navigator.clipboard.readText();
  return { text };
});
```

## When to Use
- DOM parsing (DOMParser, innerHTML) — not available in service workers
- Clipboard operations (navigator.clipboard)
- Audio/video playback
- Canvas/image manipulation
- Geolocation access
- Web Workers that need DOM context

## When NOT to Use
- If you can do it in the service worker directly (fetch, storage, alarms)
- If a content script can handle it (DOM access on existing pages)
- If you need visible UI — use popup, side panel, or options page

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('offscreen');
```

## Cross-References
- Guide: `docs/mv3/offscreen-documents.md`
- Related: `docs/tutorials/build-clipboard-manager.md`
