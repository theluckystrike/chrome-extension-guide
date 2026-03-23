---
layout: default
title: "Chrome Extension Screenshot Tool — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-screenshot-tool/"
---
# Build a Screenshot Capture Extension — Full Tutorial

## What We're Building {#what-were-building}
- Capture visible tab, full page, or selected area
- Save to downloads or copy to clipboard
- Optional annotation (draw, text) using canvas
- Uses `activeTab`, `downloads`, `offscreen` permissions

## manifest.json {#manifestjson}
```json
{
  "manifest_version": 3,
  "name": "Screenshot Tool",
  "version": "1.0.0",
  "permissions": ["activeTab", "downloads", "offscreen"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" }
}
```

## Step 1: Capture Visible Tab {#step-1-capture-visible-tab}
```javascript
// background.js
async function captureVisibleTab() {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, {
    format: "png",
    quality: 100
  });
  return dataUrl; // "data:image/png;base64,..."
}
```
- Returns base64 data URL of the visible viewport
- `activeTab` permission is sufficient (no broad `tabs` needed)

## Step 2: Full Page Capture {#step-2-full-page-capture}
- Content script scrolls the page, captures each viewport
- Send each capture to background via `@theluckystrike/webext-messaging`
- Stitch screenshots together using canvas in offscreen document
- Cross-ref: `docs/mv3/offscreen-documents.md`

```typescript
// content.js
const messenger = createMessenger<Messages>();
const totalHeight = document.documentElement.scrollHeight;
const viewportHeight = window.innerHeight;

for (let y = 0; y < totalHeight; y += viewportHeight) {
  window.scrollTo(0, y);
  await new Promise(r => setTimeout(r, 100)); // Wait for render
  await messenger.sendMessage('captureViewport', { y, totalHeight, viewportHeight });
}
```

## Step 3: Save to Downloads {#step-3-save-to-downloads}
```javascript
async function saveScreenshot(dataUrl, filename) {
  const blob = await fetch(dataUrl).then(r => r.blob());
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({
    url: url,
    filename: `screenshots/${filename}`,
    saveAs: true  // Show save dialog
  });
}
```

## Step 4: Copy to Clipboard (via Offscreen Document) {#step-4-copy-to-clipboard-via-offscreen-document}
```javascript
// background.js — create offscreen doc for clipboard access
await chrome.offscreen.createDocument({
  url: "offscreen.html",
  reasons: ["CLIPBOARD"],
  justification: "Copy screenshot to clipboard"
});

// offscreen.js — write image to clipboard
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "copyToClipboard") {
    const response = await fetch(msg.dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
  }
});
```

## Step 5: Popup UI {#step-5-popup-ui}
- Three buttons: "Visible Area", "Full Page", "Select Area"
- Preview of last screenshot
- "Save" and "Copy" buttons
- Store last screenshot path with `@theluckystrike/webext-storage`

## Step 6: Area Selection (Advanced) {#step-6-area-selection-advanced}
- Content script creates overlay canvas on page
- User drags to select rectangle
- Crop from full capture using canvas
- Send crop coordinates via `@theluckystrike/webext-messaging`

## Step 7: Simple Annotation {#step-7-simple-annotation}
- After capture, show in popup with canvas overlay
- Tools: pen draw, rectangle, text, arrow
- Canvas 2D API for drawing
- "Save annotated" re-exports canvas to PNG

## Testing {#testing}
- Test on various page heights (short and scrollable)
- Test clipboard copy works
- Test download with different filenames
- Test full-page capture on dynamically loaded content

## What You Learned {#what-you-learned}
- `chrome.tabs.captureVisibleTab` API
- Offscreen documents for clipboard access
- `chrome.downloads` API
- Canvas API for image manipulation
- Content script scrolling + messaging for full-page capture
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

