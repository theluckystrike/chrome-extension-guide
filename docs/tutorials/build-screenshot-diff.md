---
layout: default
title: "Chrome Extension Screenshot Diff — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-screenshot-diff/"
---
# Build a Screenshot Diff Extension — Tutorial

## What We're Building {#what-were-building}
- Capture page snapshots and compare them visually
- Highlight pixel differences with red overlay
- Side-by-side and slider comparison modes
- Snapshot history per URL with IndexedDB storage

## manifest.json {#manifestjson}
```json
{
  "manifest_version": 3,
  "name": "Screenshot Diff",
  "version": "1.0.0",
  "permissions": ["activeTab", "storage"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" }
}
```
- `activeTab` for capturing visible tab
- `storage` permission (IndexedDB works without it, but good practice)

## Step 1: Capture Current Tab {#step-1-capture-current-tab}
```javascript
// background.js
async function captureTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
}
```
- Returns base64 data URL of visible viewport
- Cross-ref: `docs/tutorials/build-screenshot-tool.md`

## Step 2: Save to IndexedDB {#step-2-save-to-indexeddb}
Chrome storage has 5MB limit—use IndexedDB for images.

```javascript
// db.js
const DB_NAME = "ScreenshotDiffDB";
const STORE_NAME = "snapshots";

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveSnapshot(url, imageData) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.add({ url, imageData, timestamp: Date.now() });
}
```
- Cross-ref: `docs/patterns/indexeddb-extensions.md`

## Step 3: Popup UI for Snapshot History {#step-3-popup-ui-for-snapshot-history}
```javascript
// popup.js
async function loadSnapshotsForUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  
  request.onsuccess = () => {
    const snapshots = request.result.filter(s => s.url === tab.url);
    renderSnapshotList(snapshots);
  };
}
```

## Step 4: Pixel-by-Pixel Comparison {#step-4-pixel-by-pixel-comparison}
```javascript
// diff.js
function compareImages(img1Data, img2Data, threshold = 30) {
  const diff = new Uint8ClampedArray(img1Data.length);
  let diffCount = 0;
  
  for (let i = 0; i < img1Data.length; i += 4) {
    const r1 = img1Data[i], g1 = img1Data[i+1], b1 = img1Data[i+2];
    const r2 = img2Data[i], g2 = img2Data[i+1], b2 = img2Data[i+2];
    
    // Color distance formula (Euclidean)
    const distance = Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
    
    if (distance > threshold) {
      diff[i] = 255;     // R - highlight in red
      diff[i+1] = 0;     // G
      diff[i+2] = 0;     // B
      diff[i+3] = 255;   // A - fully opaque
      diffCount++;
    } else {
      diff[i+3] = 0;     // Transparent if no diff
    }
  }
  return { diff: new ImageData(diff, img1Data.width), diffCount };
}
```
- Cross-ref: `docs/patterns/image-manipulation.md`

## Step 5: Visual Diff Display {#step-5-visual-diff-display}
```javascript
// renderer.js
function renderDiffOverlay(original, modified, diffData) {
  const canvas = document.createElement("canvas");
  canvas.width = diffData.width;
  canvas.height = diffData.height;
  const ctx = canvas.getContext("2d");
  
  // Draw original
  ctx.putImageData(original, 0, 0);
  // Overlay diff in red
  ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
  for (let i = 0; i < diffData.diff.data.length; i += 4) {
    if (diffData.diff.data[i+3] > 0) {
      const pixelIndex = i / 4;
      const x = pixelIndex % diffData.width;
      const y = Math.floor(pixelIndex / diffData.width);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas.toDataURL();
}
```

## Step 6: Side-by-Side & Slider Comparison {#step-6-side-by-side-slider-comparison}
```html
<!-- comparison.html -->
<div class="comparison-container">
  <img id="before" src="...">
  <div class="slider-wrapper">
    <img id="after" src="...">
    <input type="range" min="0" max="100" class="slider" id="diffSlider">
  </div>
</div>
```
```javascript
slider.addEventListener("input", e => {
  const position = e.target.value + "%";
  document.getElementById("after").style.clipPath = `inset(0 ${100 - position} 0 0)`;
});
```

## Step 7: Handle Viewport Differences {#step-7-handle-viewport-differences}
```javascript
function normalizeForComparison(img1, img2) {
  const canvas = document.createElement("canvas");
  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext("2d");
  // Draw both to same size, padding with white
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img1, 0, 0);
  const data1 = ctx.getImageData(0, 0, width, height);
  
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img2, 0, 0);
  const data2 = ctx.getImageData(0, 0, width, height);
  
  return { data1, data2, width, height };
}
```

## Step 8: Full Page Capture {#step-8-full-page-capture}
```javascript
async function captureFullPage() {
  const heights = [];
  const viewportHeight = window.innerHeight;
  const totalHeight = document.documentElement.scrollHeight;
  
  for (let y = 0; y < totalHeight; y += viewportHeight) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 100));
    const img = await chrome.tabs.captureVisibleTab();
    heights.push(img);
  }
  
  // Stitch using canvas
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = totalHeight;
  // ... stitch logic
}
```

## Step 9: Export Diff as Image {#step-9-export-diff-as-image}
```javascript
function exportDiff(diffCanvas) {
  const link = document.createElement("a");
  link.download = `diff-${Date.now()}.png`;
  link.href = diffCanvas.toDataURL("image/png");
  link.click();
}
```

## Summary {#summary}
| Feature | Implementation |
|---------|----------------|
| Capture | `chrome.tabs.captureVisibleTab()` |
| Storage | IndexedDB (not chrome.storage) |
| Diff | Canvas getImageData + pixel comparison |
| Display | Overlay, side-by-side, slider |
| Export | canvas.toDataURL() + download |
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
