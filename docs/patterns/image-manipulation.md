---
layout: default
title: "Chrome Extension Image Manipulation. Best Practices"
description: "Process and manipulate images in extensions."
canonical_url: "https://bestchromeextensions.com/patterns/image-manipulation/"
---

# Image Manipulation Patterns in Chrome Extensions

This guide covers patterns for handling images in Chrome extensions, including capture, processing, and optimization.

Capturing Tab Screenshots {#capturing-tab-screenshots}

Use `chrome.tabs.captureVisibleTab()` to capture the visible portion of a tab. This API requires the `activeTab` permission.

```javascript
// Capture screenshot of the active tab in a given window
async function captureTabScreenshot(windowId) {
  const screenshot = await chrome.tabs.captureVisibleTab(windowId, {
    format: 'png',
    quality: 100
  });
  return screenshot; // Returns data URL (base64)
}
```

Permissions required:
```json
{
  "permissions": ["activeTab"],
  "host_permissions": ["<all_urls>"] // Optional: for capturing any tab
}
```

Using OffscreenCanvas in Service Workers {#using-offscreencanvas-in-service-workers}

Service workers don't have access to the DOM, so use `OffscreenCanvas` for image processing:

```javascript
// Process image in service worker or offscreen document
async function processImage(imageDataUrl, width, height) {
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();
  
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(bitmap, 0, 0, width, height);
  
  const processedBlob = await canvas.convertToBlob({ type: 'image/png' });
  return processedBlob;
}
```

Image Resizing {#image-resizing}

```javascript
async function resizeImage(imageSource, newWidth, newHeight) {
  const img = new Image();
  img.src = imageSource;
  await img.decode();
  
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, newWidth, newHeight);
  
  return canvas.toDataURL('image/png');
}
```

Converting Image Formats {#converting-image-formats}

```javascript
async function convertFormat(imageSource, format, quality = 0.92) {
  const img = new Image();
  img.src = imageSource;
  await img.decode();
  
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  return canvas.toDataURL(`image/${format}`, quality);
}

// Usage: convert to JPEG, WebP, etc.
const webpImage = await convertFormat(screenshot, 'webp', 0.8);
```

Base64 Encoding/Decoding {#base64-encodingdecoding}

```javascript
// Blob to Base64
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Base64 to Blob
async function base64ToBlob(base64, mimeType = 'image/png') {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}
```

Blob URLs for Efficient Memory {#blob-urls-for-efficient-memory}

```javascript
// Create Blob URL from processed image
function createBlobUrl(blob) {
  return URL.createObjectURL(blob);
}

// Revoke to free memory
function revokeBlobUrl(url) {
  URL.revokeObjectURL(url);
}
```

Image Compression {#image-compression}

```javascript
async function compressImage(imageSource, maxSizeKB, quality = 0.9) {
  const img = new Image();
  img.src = imageSource;
  await img.decode();
  
  let q = quality;
  let blob;
  
  do {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
    q -= 0.1;
  } while (blob.size > maxSizeKB * 1024 && q > 0.1);
  
  return blob;
}
```

Dynamic Badge Icons {#dynamic-badge-icons}

```javascript
// Set dynamic badge icon from image data
async function setBadgeIcon(imageDataUrl) {
  const img = new Image();
  img.src = imageDataUrl;
  await img.decode();
  
  const sizes = [16, 32, 48, 128];
  const iconSet = {};
  
  for (const size of sizes) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    iconSet[size] = canvas.toDataURL();
  }
  
  await chrome.action.setIcon({ imageData: iconSet });
}
```

Using createImageBitmap() in Service Workers {#using-createimagebitmap-in-service-workers}

```javascript
// Efficient bitmap handling in workers
async function processInWorker(worker, imageBlob) {
  const bitmap = await createImageBitmap(imageBlob);
  
  // Transfer bitmap to worker
  worker.postMessage({ bitmap }, [bitmap]);
}
```

Related Resources {#related-resources}

- [Tabs API Reference](../api_reference/tabs-api.md)
- [Offscreen Documents Pattern](./offscreen-documents.md)
- [Screenshot Tool Tutorial](../tutorials/build-screenshot-tool.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
