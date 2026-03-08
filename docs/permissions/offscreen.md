---
title: "offscreen Permission"
description: "The `offscreen` permission enables the Chrome `chrome.offscreen` API, which allows extensions to create offscreen documents for performing operations that require DOM access from the extension's se..."
permalink: /permissions/offscreen/
category: permissions
order: 27
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/offscreen/"
---

# offscreen Permission

The `offscreen` permission enables the Chrome `chrome.offscreen` API, which allows extensions to create offscreen documents for performing operations that require DOM access from the extension's service worker context. This is a Manifest V3-only feature that replaces the background page DOM access available in Manifest V2.

## Overview {#overview}

| Property | Value |
|----------|-------|
| Permission string | `"offscreen"` |
| API | `chrome.offscreen` |
| Minimum Chrome version | 94+ |
| Manifest requirement | Must be declared in `permissions` array |

The offscreen document is a hidden HTML document that runs in the context of your extension but has no visible UI. It provides a way to perform DOM-related operations from the service worker, which otherwise has no access to the DOM.

## API Methods {#api-methods}

### createDocument {#createdocument}

Creates an offscreen document with the specified parameters:

```javascript
chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
  justification: 'Need to parse HTML content for data extraction'
});
```

**Parameters:**
- `url` (string): Path to the HTML file relative to the extension root
- `reasons` (array): Array of `chrome.offscreen.Reason` enum values
- `justification` (string): Explanation of why the offscreen document is needed (required for Chrome Web Store review)

### closeDocument {#closedocument}

Closes the currently open offscreen document:

```javascript
await chrome.offscreen.closeDocument();
```

### hasDocument {#hasdocument}

Checks whether an offscreen document currently exists (Chrome 116+):

```javascript
const exists = await chrome.offscreen.hasDocument();
```

## Reason Enum Values {#reason-enum-values}

The `chrome.offscreen.Reason` enum provides various reasons for creating an offscreen document. Chrome supports the following reasons:

| Reason | Description |
|--------|-------------|
| `TESTING` | Used for automated testing scenarios |
| `AUDIO_PLAYBACK` | Audio playback from background context |
| `IFRAME_SCRIPTING` | Scripting iframes from background |
| `DOM_SCRAPING` | Parsing and extracting data from HTML |
| `BLOBS` | Working with Blob objects |
| `DOM_PARSER` | HTML/XML parsing operations |
| `USER_MEDIA` | Capturing user media (webcam/microphone) |
| `DISPLAY_MEDIA` | Capturing display media |
| `WEB_RTC` | WebRTC operations |
| `CLIPBOARD` | Clipboard read/write operations |
| `LOCAL_STORAGE` | Local storage operations |
| `WORKERS` | Web Worker management |
| `BATTERY_STATUS` | Battery API access |
| `MATCH_MEDIA` | Media query matching |
| `GEOLOCATION` | Geolocation API access |

## Constraints {#constraints}

### One Document Limit {#one-document-limit}

Only **one offscreen document** can exist at a time per extension. Attempting to create a new one while one already exists will result in an error. Always check with `hasDocument()` before creating:

```javascript
async function createOffscreenIfNeeded() {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }
  
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification: 'Need to parse HTML for data extraction'
  });
}
```

### Reason Requirement {#reason-requirement}

At least **one reason** must be specified when creating the document. Providing an empty array will cause an error.

### No UI Visibility {#no-ui-visibility}

The offscreen document has **no visible UI** to the user. It exists purely in memory and is not rendered in any window.

### Communication via Messaging {#communication-via-messaging}

Since the offscreen document runs in isolation, communication with your service worker or content scripts must use `chrome.runtime` messaging:

```javascript
// In service worker
chrome.runtime.sendMessage({ action: 'doWork', data: '...' });

// In offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message and respond
  sendResponse({ result: '...' });
});
```

## Manifest Declaration {#manifest-declaration}

To use the offscreen API, declare the permission in your `manifest.json`:

```json
{
  "name": "My Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "offscreen"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

Note: The `offscreen` permission is only available in Manifest V3. It is not available in Manifest V2.

## Use Cases {#use-cases}

### DOM Parsing {#dom-parsing}

Parse HTML content that cannot be handled directly in the service worker:

```javascript
// In service worker
async function parseHTML(html) {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'Parsing HTML content for extraction'
  });
  
  // Send HTML to offscreen document for parsing
  chrome.runtime.sendMessage({
    type: 'PARSE_HTML',
    html: html
  });
  
  // Wait for response (implementation details vary)
  await chrome.offscreen.closeDocument();
}
```

### Audio Playback {#audio-playback}

Play audio from the background service worker context:

```javascript
async function playAudio(audioUrl) {
  await chrome.offscreen.createDocument({
    url: 'audio-player.html',
    reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: 'Playing audio notifications from background'
  });
  
  chrome.runtime.sendMessage({
    type: 'PLAY_AUDIO',
    url: audioUrl
  });
}
```

### Clipboard Operations {#clipboard-operations}

Perform advanced clipboard operations:

```javascript
async function readClipboard() {
  if (await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.closeDocument();
  }
  
  await chrome.offscreen.createDocument({
    url: 'clipboard.html',
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'Reading clipboard content'
  });
  
  return new Promise((resolve) => {
    chrome.runtime.onMessage.addListener(function onMessage(message) {
      if (message.type === 'CLIPBOARD_CONTENT') {
        chrome.runtime.onMessage.removeListener(onMessage);
        resolve(message.content);
      }
    });
  });
}
```

### Geolocation {#geolocation}

Access geolocation from the background context:

```javascript
async function getLocation() {
  await chrome.offscreen.createDocument({
    url: 'geolocation.html',
    reasons: [chrome.offscreen.Reason.GEOLOCATION],
    justification: 'Tracking user location for notifications'
  });
  
  return new Promise((resolve) => {
    chrome.runtime.onMessage.addListener(function onMessage(message) {
      if (message.type === 'LOCATION') {
        chrome.runtime.onMessage.removeListener(onMessage);
        resolve(message.coords);
      }
    });
  });
}
```

## Code Examples {#code-examples}

### Guard Pattern {#guard-pattern}

Always check if an offscreen document exists before creating:

```javascript
async function ensureOffscreen(reason) {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }
  
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [reason],
    justification: 'Required for extension functionality'
  });
}
```

### Complete Workflow {#complete-workflow}

A complete example of creating, communicating, and closing:

```javascript
async function scrapePageData(url) {
  // Create offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
    justification: 'Scraping page content for data extraction'
  });
  
  // Send message to offscreen document
  const response = await chrome.runtime.sendMessage({
    type: 'SCRAPE_URL',
    url: url
  });
  
  // Close the document when done
  await chrome.offscreen.closeDocument();
  
  return response.data;
}
```

## Cross-references {#cross-references}

- [MV3 Offscreen Documents](mv3/offscreen-documents.md) - Detailed guide on using offscreen documents
- [Offscreen Document Patterns](patterns/offscreen-documents.md) - Common patterns and best practices
- [Geolocation Permission](permissions/geolocation.md) - Related permission for location access

## See Also {#see-also}

- [Chrome Extensions Documentation: Offscreen Documents](https://developer.chrome.com/docs/extensions/mv3/offscreen/)
- [chrome.offscreen API Reference](https://developer.chrome.com/docs/extensions/reference/offscreen/)

## Frequently Asked Questions

### What are offscreen documents in Manifest V3?
Offscreen documents are hidden pages that extension can create to perform tasks that require a DOM, like playing audio or using certain APIs.

### How do I create an offscreen document?
Use chrome.offscreen.createDocument() with a specified reason and the HTML file to load. Only one offscreen document can exist per extension at a time.
