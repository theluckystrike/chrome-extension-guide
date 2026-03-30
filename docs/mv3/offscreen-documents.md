---
layout: default
title: "Chrome Extension Offscreen Documents. Manifest V3 Guide"
description: "Use offscreen documents for DOM operations and long-running tasks in Manifest V3."
canonical_url: "https://bestchromeextensions.com/mv3/offscreen-documents/"
last_modified_at: 2026-01-15
---

Offscreen Documents in Manifest V3

Introduction {#introduction}
- MV3 service workers have NO DOM access. no `document`, `window`, `canvas`, `audio`, etc.
- Offscreen documents solve this: create a hidden HTML page for DOM-dependent tasks
- Available since Chrome 109
- Requires `"offscreen"` permission

manifest.json {#manifestjson}
```json
{
  "permissions": ["offscreen"]
}
```

Creating an Offscreen Document {#creating-an-offscreen-document}
```javascript
await chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: ["DOM_SCRAPING"],  // Why you need DOM access
  justification: "Parse HTML content using DOMParser"
});
```

Reasons (enum values) {#reasons-enum-values}
- `"TESTING"`. for testing purposes
- `"AUDIO_PLAYBACK"`. play audio
- `"IFRAME_SCRIPTING"`. interact with iframe content
- `"DOM_SCRAPING"`. parse/manipulate DOM
- `"BLOBS"`. create/manage Blob URLs
- `"DOM_PARSER"`. use DOMParser
- `"USER_MEDIA"`. access camera/microphone
- `"DISPLAY_MEDIA"`. screen capture
- `"WEB_RTC"`. WebRTC connections
- `"CLIPBOARD"`. clipboard read/write
- `"LOCAL_STORAGE"`. access localStorage (not chrome.storage)
- `"WORKERS"`. run web workers
- `"BATTERY_STATUS"`. Battery API
- `"MATCH_MEDIA"`. CSS media queries
- `"GEOLOCATION"`. Geolocation API

Offscreen HTML Page {#offscreen-html-page}
```html
<!-- offscreen.html -->
<!DOCTYPE html>
<html><body><script src="offscreen.js"></script></body></html>
```
```javascript
// offscreen.js. has full DOM access
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "parseHTML") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, "text/html");
    const title = doc.querySelector("title")?.textContent;
    sendResponse({ title });
    return true;
  }
});
```

Communication: Background <-> Offscreen {#communication-background-offscreen}
- Use standard `chrome.runtime.sendMessage` / `onMessage`
- Or use `@theluckystrike/webext-messaging`:
  ```typescript
  // background.js
  const messenger = createMessenger<Messages>();
  const result = await messenger.sendMessage('parseHTML', { html: rawHtml });

  // offscreen.js
  messenger.onMessage('parseHTML', async (req) => {
    const doc = new DOMParser().parseFromString(req.html, 'text/html');
    return { title: doc.title, links: [...doc.querySelectorAll('a')].map(a => a.href) };
  });
  ```

Lifecycle Management {#lifecycle-management}
```javascript
// Check if offscreen document already exists
const existingContexts = await chrome.runtime.getContexts({
  contextTypes: ["OFFSCREEN_DOCUMENT"]
});
if (existingContexts.length === 0) {
  await chrome.offscreen.createDocument({ ... });
}
```
- Only ONE offscreen document can exist at a time
- Must check before creating. `createDocument` throws if one already exists
- Close when done: `await chrome.offscreen.closeDocument()`
- Chrome auto-closes offscreen documents with `AUDIO_PLAYBACK` reason after 30 seconds without audio; all other reasons have no automatic lifetime limit

Common Patterns {#common-patterns}

HTML/DOM Parsing {#htmldom-parsing}
- Fetch HTML in background, send to offscreen for DOMParser processing
- Extract data, return structured result

Audio Playback {#audio-playback}
- Play notification sounds, alarms
- Background SW can't use Audio API. offscreen can

Canvas/Image Processing {#canvasimage-processing}
- Create canvas, draw images, manipulate pixels
- Return processed image as data URL or Blob

Clipboard Access {#clipboard-access}
- Read/write clipboard in offscreen document
- Send results back to background

Web Workers {#web-workers}
- Offscreen can spawn Web Workers for heavy computation
- Keeps background SW responsive

Best Practices {#best-practices}
- Create offscreen document only when needed, close when done
- Always check for existing document before creating
- Use specific `reasons`. Chrome uses these for lifecycle management
- Keep offscreen page minimal. it consumes memory
- Store processing results with `@theluckystrike/webext-storage` if needed

Common Mistakes {#common-mistakes}
- Creating without checking if one exists. throws error
- For `AUDIO_PLAYBACK` reason, Chrome auto-closes after 30s without audio -- re-create as needed
- Using offscreen for tasks that don't need DOM. unnecessary overhead
- Only one offscreen document at a time. can't have multiple

Migration from MV2 {#migration-from-mv2}
- MV2 background pages had DOM access by default
- MV3: move DOM-dependent code to offscreen document
- Add messaging layer between background SW and offscreen
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
