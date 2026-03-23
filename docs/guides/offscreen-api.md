Chrome Offscreen Documents API

Introduction
- The Offscreen Documents API (`chrome.offscreen`) allows MV3 extensions to create hidden documents with full DOM access
- Solves the DOM access limitation in MV3 where service workers cannot access the DOM directly
- Enables scenarios that require HTML parsing, canvas manipulation, audio playback, and clipboard operations
- Requires `"offscreen"` permission in manifest.json
- Reference: https://developer.chrome.com/docs/extensions/reference/api/offscreen

manifest.json Configuration
```json
{
  "permissions": ["offscreen"],
  "background": { "service_worker": "background.js" }
}
```

Core API Methods

chrome.offscreen.createDocument()
Creates a new offscreen document with specified parameters:
```javascript
await chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: ["AUDIO_PLAYBACK", "DOM_PARSER"],
  justification: "Need DOM parsing for HTML email processing"
});
```
- `url`: Path to the HTML document (relative to extension root)
- `reasons`: Array of Reason enums (at least one required)
- `justification`: Human-readable string explaining why the API is needed

chrome.offscreen.closeDocument()
Closes the current offscreen document:
```javascript
await chrome.offscreen.closeDocument();
```
- No parameters required
- Should be called when the document is no longer needed

chrome.offscreen.hasDocument()
Checks if an offscreen document currently exists:
```javascript
const hasDocument = await chrome.offscreen.hasDocument();
```
- Returns boolean: `true` if document exists, `false` otherwise

Reason Enum Values
| Reason | Description |
|--------|-------------|
| `AUDIO_PLAYBACK` | Playing audio files from service worker |
| `CLIPBOARD` | Clipboard read/write operations |
| `DOM_PARSER` | Parsing HTML/XML documents |
| `DOM_SCRAPING` | Extracting data from web pages |
| `IFRAME` | Embedding cross-origin iframes |
| `WEB_RTC` | WebRTC peer connections |

Lifecycle and Limits
- One document per extension: Only ONE offscreen document can exist at a time
- Lifetime tied to extension: Document closes when extension is updated or Chrome exits
- Replacing reasons: Calling createDocument with different reasons replaces existing document
- Service worker lifecycle: Document survives service worker termination but not extension updates
- Memory considerations: Close documents when not needed to free resources

Communication via chrome.runtime Messaging
Service worker communicates with offscreen document using message passing:

Service Worker → Offscreen:
```javascript
// Send message to offscreen
chrome.runtime.sendMessage({
  target: "offscreen",
  action: "parseHtml",
  html: "<html><body>Test</body></html>"
});

// In offscreen.html
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "parseHtml") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, "text/html");
    sendResponse({ title: doc.title });
  }
});
```

Offscreen → Service Worker:
```javascript
// In offscreen.html
chrome.runtime.sendMessage({
  action: "processingComplete",
  result: { data: "processed" }
});

// In service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "processingComplete") {
    console.log("Result:", message.result);
  }
});
```

Use Cases and Examples

DOM Parsing from Service Worker
```javascript
// background.js - Service worker
async function parseHtmlContent(htmlString) {
  // Ensure offscreen document exists
  if (!await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["DOM_PARSER"],
      justification: "Parse HTML content for data extraction"
    });
  }

  return new Promise((resolve) => {
    const messageId = Date.now();
    
    const handler = (message) => {
      if (message.id === messageId) {
        chrome.runtime.onMessage.removeListener(handler);
        resolve(message.result);
      }
    };
    
    chrome.runtime.onMessage.addListener(handler);
    
    chrome.runtime.sendMessage({
      target: "offscreen",
      action: "parseHtml",
      html: htmlString,
      id: messageId
    });
  });
}

// offscreen.html
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "parseHtml") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, "text/html");
    
    const result = {
      title: doc.title,
      links: Array.from(doc.querySelectorAll("a")).map(a => a.href)
    };
    
    chrome.runtime.sendMessage({
      id: message.id,
      result: result
    });
  }
});
```

Audio Playback from Service Worker
```javascript
// background.js
async function playAudio(audioUrl) {
  await chrome.offscreen.createDocument({
    url: "offscreen-audio.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play notification sounds"
  });

  chrome.runtime.sendMessage({
    target: "offscreen",
    action: "playAudio",
    url: audioUrl
  });
}

// offscreen-audio.html
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "playAudio") {
    const audio = new Audio(message.url);
    audio.play();
  }
});
```

Clipboard Operations
```javascript
// background.js
async function copyToClipboard(text) {
  await chrome.offscreen.createDocument({
    url: "offscreen-clipboard.html",
    reasons: ["CLIPBOARD"],
    justification: "Copy formatted text to clipboard"
  });

  chrome.runtime.sendMessage({
    target: "offscreen",
    action: "copy",
    text: text
  });
}

// offscreen-clipboard.html
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "copy") {
    navigator.clipboard.writeText(message.text);
  }
});
```

Canvas Image Manipulation
```javascript
// In offscreen.html - Image processing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "processImage") {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      ctx.filter = "grayscale(100%)";
      ctx.drawImage(canvas, 0, 0);
      
      const dataUrl = canvas.toDataURL("image/png");
      sendResponse({ imageData: dataUrl });
    };
    img.src = message.imageUrl;
  }
});
```

Best Practices

1. Always check document existence before creating or sending messages:
   ```javascript
   if (!await chrome.offscreen.hasDocument()) {
     await createOffscreen();
   }
   ```

2. Close documents when done to free memory:
   ```javascript
   await chrome.offscreen.closeDocument();
   ```

3. Provide clear justification - Chrome reviews may ask for clarification

4. Use single offscreen document for multiple operations to avoid recreation overhead

5. Handle message timeouts - Service workers may terminate during long operations

6. Store context in chrome.storage - Persist state since offscreen can be recreated

7. Use meaningful Reason enums - Match the actual use case exactly

Error Handling
```javascript
try {
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["DOM_PARSER"],
    justification: "Parse HTML"
  });
} catch (error) {
  if (error.message.includes("An offscreen document is already open")) {
    // Document already exists, close it first
    await chrome.offscreen.closeDocument();
    // Then retry
  }
}
```

Migration from MV2
- MV2 background pages had full DOM access - offscreen documents replace this capability
- Move DOM-dependent code to offscreen.html
- Use message passing to communicate between service worker and offscreen
- Consider which operations truly need DOM vs. what can be done with extension APIs
