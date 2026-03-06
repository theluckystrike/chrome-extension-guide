# chrome.offscreen API Reference

The `chrome.offscreen` API enables extensions to create offscreen documents for DOM access in Manifest V3. Required for DOM operations that were handled by background pages in MV2.

---

## Overview

- **Permission**: `"offscreen"` in manifest.json
- **MV3 Only**: Not available in Manifest V2
- **Single Document**: One offscreen document at a time per extension
- **No UI**: Cannot display visible content
- **Communication**: Uses `chrome.runtime` messaging

---

## API Methods

### createDocument(params)

Creates a new offscreen document.

```typescript
createDocument(params: { url: string, reasons: Reason[], justification: string }): Promise<void>
```

```javascript
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
  justification: 'Parse HTML content'
});
```

### closeDocument()

Closes the current offscreen document. No parameters.

```javascript
await chrome.offscreen.closeDocument();
```

### hasDocument()

Checks if an offscreen document exists (Chrome 116+). Returns boolean.

```javascript
if (!chrome.offscreen.hasDocument()) {
  await chrome.offscreen.createDocument({...});
}
```

---

## Reason Enum

| Reason | Description |
|--------|-------------|
| `TESTING` | Automated testing |
| `AUDIO_PLAYBACK` | Play audio |
| `IFRAME_SCRIPTING` | Interact with iframe content |
| `DOM_SCRAPING` | Parse DOM from fetched HTML |
| `BLOBS` | Create/manage Blobs |
| `DOM_PARSER` | Use DOMParser API |
| `USER_MEDIA` | getUserMedia access |
| `DISPLAY_MEDIA` | getDisplayMedia access |
| `WEB_RTC` | WebRTC connections |
| `CLIPBOARD` | Clipboard read/write |
| `LOCAL_STORAGE` | localStorage access |
| `WORKERS` | Spawn web workers |
| `BATTERY_STATUS` | Battery API |
| `MATCH_MEDIA` | matchMedia queries |
| `GEOLOCATION` | Geolocation API |

---

## Constraints

- Only ONE offscreen document at a time per extension
- Cannot have a visible UI
- Must specify at least one valid reason
- Communication via chrome.runtime messaging only

---

## Common Pattern

```javascript
// 1. Check hasDocument()
if (!chrome.offscreen.hasDocument()) {
  // 2. Create if needed
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'Parse HTML content'
  });
}
// 3. Send message to offscreen doc
const result = await chrome.runtime.sendMessage({
  target: 'offscreen',
  action: 'scrape',
  data: htmlContent
});
// 4. Optionally close
await chrome.offscreen.closeDocument();
```

---

## Code Examples

### DOM Scraping

```javascript
// Service worker
async function scrapeHTML(url) {
  const html = await fetch(url).then(r => r.text());
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification: 'Scrape data from HTML'
  });
  const result = await chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'scrape',
    html: html,
    selector: '.product-title'
  });
  await chrome.offscreen.closeDocument();
  return result;
}

// offscreen.html
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scrape') {
    const doc = new DOMParser().parseFromString(msg.html, 'text/html');
    sendResponse({ data: [...doc.querySelectorAll(msg.selector)].map(e => e.textContent) });
  }
  return true;
});
```

### Clipboard Access

```javascript
async function readClipboard() {
  if (!chrome.offscreen.hasDocument()) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Read clipboard content'
    });
  }
  return await chrome.runtime.sendMessage({ target: 'offscreen', action: 'readClipboard' });
}
```

### Audio Playback

```javascript
async function playAudio(audioUrl) {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: 'Play notification sound'
  });
  await chrome.runtime.sendMessage({ target: 'offscreen', action: 'playAudio', url: audioUrl });
}
```

---

## Cross-References

- [Offscreen Documents Guide](../guides/offscreen-documents.md)
- [Offscreen Permissions](../permissions/offscreen.md)
- [Offscreen Documents Pattern](../patterns/offscreen-documents.md)
