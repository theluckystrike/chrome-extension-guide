# Screenshot Capture Patterns in Chrome Extensions

Screenshot capture is one of the most requested features for Chrome extensions. Whether you're building a note-taking app, a bug reporting tool, or a design collaboration platform, the ability to capture and manipulate screen content opens up powerful possibilities. we'll explore the various patterns for implementing screenshot functionality in your Chrome extension using Manifest V3.

## Understanding Screenshot APIs

Chrome provides several APIs for capturing screenshots, each with distinct use cases and permission requirements:

1. tabs.captureVisibleTab - Captures the visible area of the active tab
2. desktopCapture - Captures entire screens, windows, or tabs (including off-screen content)
3. activeTab - Limited capture with user permission

## Required Permissions

For screenshot functionality, you'll need to declare appropriate permissions in your manifest:

```json
{
  "permissions": [
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

For desktop capture (full screen including scrolling content):

```json
{
  "permissions": [
    "desktopCapture"
  ]
}
```

## Pattern 1: Simple Visible Tab Capture

The most straightforward approach uses `tabs.captureVisibleTab()`, which captures only what's currently visible in the viewport:

```typescript
// background/service-worker.ts
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  try {
    // Capture the visible portion of the active tab
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 100
    });
    
    // Convert to blob for further processing
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    console.log(`Captured ${blob.size} bytes`);
  } catch (error) {
    console.error('Capture failed:', error);
  }
});
```

## Pattern 2: Full Page Screenshot

For capturing entire scrollable pages, combine `tabs.captureVisibleTab` with a content script that scrolls through the page:

```typescript
// content-scripts/capture-full-page.ts
interface ScrollPosition {
  height: number;
  width: number;
  totalHeight: number;
  images: string[];
}

async function captureFullPage(): Promise<string[]> {
  const images: string[] = [];
  const totalHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  
  let currentPosition = 0;
  
  while (currentPosition < totalHeight) {
    // Scroll to position
    window.scrollTo(0, currentPosition);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture visible portion
    const dataUrl = await chrome.runtime.sendMessage({
      action: 'captureVisibleTab',
      windowId: await getCurrentWindowId()
    });
    
    if (dataUrl) {
      images.push(dataUrl);
    }
    
    currentPosition += viewportHeight;
  }
  
  // Restore scroll position
  window.scrollTo(0, 0);
  
  return images;
}

function getCurrentWindowId(): Promise<number> {
  return new Promise((resolve) => {
    chrome.windows.getCurrent((win) => resolve(win.id!));
  });
}
```

## Pattern 3: Region Selection Capture

Allow users to select a specific region of the page using a canvas-based selection overlay:

```typescript
// content-scripts/region-selector.ts
class RegionSelector {
  private overlay: HTMLDivElement;
  private selectionBox: HTMLDivElement;
  private startX = 0;
  private startY = 0;
  private isSelecting = false;
  
  constructor() {
    this.overlay = this.createOverlay();
    this.selectionBox = this.createSelectionBox();
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.selectionBox);
    
    this.attachEventListeners();
  }
  
  private createOverlay(): HTMLDivElement {
    const div = document.createElement('div');
    div.id = 'screenshot-overlay';
    div.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999999;
      cursor: crosshair;
    `;
    return div;
  }
  
  private createSelectionBox(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      border: 2px dashed #fff;
      background: transparent;
      z-index: 1000000;
      display: none;
      pointer-events: none;
    `;
    return div;
  }
  
  private attachEventListeners(): void {
    this.overlay.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.overlay.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.overlay.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }
  
  private onMouseDown(e: MouseEvent): void {
    this.isSelecting = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.selectionBox.style.display = 'block';
  }
  
  private onMouseMove(e: MouseEvent): void {
    if (!this.isSelecting) return;
    
    const width = Math.abs(e.clientX - this.startX);
    const height = Math.abs(e.clientY - this.startY);
    const left = Math.min(e.clientX, this.startX);
    const top = Math.min(e.clientY, this.startY);
    
    this.selectionBox.style.cssText = `
      position: fixed;
      border: 2px dashed #fff;
      width: ${width}px;
      height: ${height}px;
      left: ${left}px;
      top: ${top}px;
      z-index: 1000000;
      pointer-events: none;
    `;
  }
  
  private onMouseUp(e: MouseEvent): void {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    
    const rect = this.selectionBox.getBoundingClientRect();
    
    // Send selection coordinates to background script
    chrome.runtime.sendMessage({
      action: 'captureRegion',
      region: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      }
    });
    
    this.cleanup();
  }
  
  cleanup(): void {
    this.overlay.remove();
    this.selectionBox.remove();
  }
}
```

## Pattern 4: Desktop Capture for Full Screen

For applications requiring full desktop capture (including multiple monitors or content outside browser), use the desktopCapture API:

```typescript
// background/desktop-capture.ts
async function startDesktopCapture(): Promise<string | null> {
  // Request screen/window/tab capture
  const sources = await chrome.desktopCapture.getDesktopSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 150, height: 150 }
  });
  
  // For full page capture, prefer 'screen' type
  const screenSource = sources.find(s => s.id.startsWith('screen:'));
  
  if (!screenSource) {
    console.error('No screen source available');
    return null;
  }
  
  // Use tab capture with the desktop source
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      // @ts-ignore - Chrome-specific constraint
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: screenSource.id,
        minWidth: 1280,
        maxWidth: 4096,
        minHeight: 720,
        maxHeight: 4096
      }
    }
  });
  
  // Capture frame to canvas
  const video = document.createElement('video');
  video.srcObject = stream;
  await video.play();
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  
  // Stop the stream
  stream.getTracks().forEach(track => track.stop());
  
  return canvas.toDataURL('image/png');
}
```

## Pattern 5: Saving Captured Images

After capturing, save the image using the Downloads API or Chrome Storage:

```typescript
// background/save-screenshot.ts
interface SaveOptions {
  filename: string;
  dataUrl: string;
  saveDir?: string;
}

async function saveScreenshot(options: SaveOptions): Promise<void> {
  const { filename, dataUrl, saveDir = 'Downloads' } = options;
  
  // Convert data URL to ArrayBuffer
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Use Downloads API
  const downloadId = await chrome.downloads.download({
    url: dataUrl,
    filename: `${saveDir}/${filename}.png`,
    saveAs: true,
    conflictAction: 'uniquify'
  });
  
  console.log('Download started:', downloadId);
}

// Alternative: Save to Chrome Storage (for smaller images)
async function saveToStorage(dataUrl: string, key: string): Promise<void> {
  await chrome.storage.local.set({
    [key]: {
      data: dataUrl,
      timestamp: Date.now()
    }
  });
}
```

## Best Practices and Considerations

1. Permission Minimization: Use `activeTab` permission instead of `<all_urls>` when possible to avoid scary permission warnings during installation.

2. Performance: For full-page captures, implement proper delays between scrolls to ensure images load completely.

3. Cross-Origin Issues: Be aware that capturing pages with cross-origin iframes may result in blank areas due to security restrictions.

4. Format Selection: Use PNG for lossless quality or JPEG with compression for smaller file sizes.

5. User Experience: Always provide visual feedback during capture operations and allow users to preview before saving.

## Conclusion

Screenshot capture in Chrome extensions offers powerful capabilities for various use cases. By understanding the different capture patterns, visible tab capture, full-page stitching, region selection, and desktop capture, you can choose the right approach for your extension's needs. Remember to handle permissions appropriately and provide good user experience throughout the capture workflow.
