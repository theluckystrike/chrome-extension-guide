# Building an Image Compressor Chrome Extension

A comprehensive guide to building a production-ready image compressor Chrome extension with TypeScript.

## Overview

This guide covers building a Chrome extension that compresses images directly in the browser without uploading to external servers. The extension will support drag-and-drop, right-click context menu compression, and bulk processing.

## Architecture and manifest.json Setup

The extension uses Manifest V3 with a modular architecture:

```json
{
  "manifest_version": 3,
  "name": "Image Compressor Pro",
  "version": "1.0.0",
  "description": "Compress images directly in your browser",
  "permissions": [
    "storage",
    "contextMenus",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["content/content.css"]
    }
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["icons/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## Project Structure

```
image-compressor/
├── src/
│   ├── background/
│   │   ├── background.ts
│   │   └── contextMenus.ts
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   ├── popup.css
│   │   └── components/
│   ├── sidepanel/
│   │   ├── sidepanel.html
│   │   ├── sidepanel.ts
│   │   └── sidepanel.css
│   ├── content/
│   │   ├── content.ts
│   │   ├── overlay.ts
│   │   └── content.css
│   ├── core/
│   │   ├── compressor.ts
│   │   ├── imageProcessor.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── storage/
│       └── storage.ts
├── icons/
├── manifest.json
├── tsconfig.json
├── webpack.config.js
└── package.json
```

## Core Implementation with TypeScript

### Type Definitions

```typescript
// src/types/index.ts
export interface CompressedImage {
  id: string;
  originalSize: number;
  compressedSize: number;
  originalUrl: string;
  compressedUrl: string;
  format: 'jpeg' | 'png' | 'webp';
  quality: number;
  dimensions: { width: number; height: number };
  timestamp: number;
}

export interface CompressionOptions {
  quality: number;
  maxWidth: number;
  maxHeight: number;
  format: 'jpeg' | 'png' | 'webp';
  preserveExif: boolean;
}

export interface CompressionProgress {
  total: number;
  processed: number;
  current: string;
  errors: string[];
}

export type CompressionStatus = 'idle' | 'compressing' | 'completed' | 'error';
```

### Image Compressor Core

```typescript
// src/core/compressor.ts
import { CompressedImage, CompressionOptions, CompressionProgress } from '../types';

export class ImageCompressor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async compress(
    file: File | Blob,
    options: CompressionOptions,
    onProgress?: (progress: CompressionProgress) => void
  ): Promise<CompressedImage> {
    const bitmap = await createImageBitmap(file);
    const { width, height } = this.calculateDimensions(
      bitmap.width,
      bitmap.height,
      options.maxWidth,
      options.maxHeight
    );

    this.canvas.width = width;
    this.canvas.height = height;

    // Fill with white background for transparency handling
    if (options.format === 'jpeg') {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, width, height);
    }

    this.ctx.drawImage(bitmap, 0, 0, width, height);

    const compressedBlob = await this.canvasToBlob(
      this.canvas,
      `image/${options.format}`,
      options.quality
    );

    return {
      id: crypto.randomUUID(),
      originalSize: file.size,
      compressedSize: compressedBlob.size,
      originalUrl: URL.createObjectURL(file),
      compressedUrl: URL.createObjectURL(compressedBlob),
      format: options.format,
      quality: options.quality,
      dimensions: { width, height },
      timestamp: Date.now()
    };
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
    return ratio < 1
      ? { width: Math.round(originalWidth * ratio), height: Math.round(originalHeight * ratio) }
      : { width: originalWidth, height: originalHeight };
  }

  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        type,
        quality
      );
    });
  }
}
```

### Background Service Worker

```typescript
// src/background/background.ts
import { CompressionOptions, CompressedImage } from '../types';
import { StorageManager } from '../storage/storage';

const storage = new StorageManager();

// Initialize context menu
chrome.contextMenus.create({
  id: 'compressImage',
  title: 'Compress Image',
  contexts: ['image']
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'compressImage' && info.srcUrl) {
    try {
      const response = await fetch(info.srcUrl);
      const blob = await response.blob();
      
      // Send to content script for processing
      chrome.tabs.sendMessage(tab!.id!, {
        type: 'COMPRESS_IMAGE',
        imageUrl: info.srcUrl,
        blob: await blob.arrayBuffer()
      });
    } catch (error) {
      console.error('Failed to fetch image:', error);
    }
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_COMPRESSION_STATS':
      storage.getStats().then(sendResponse);
      return true;
    case 'CLEAR_HISTORY':
      storage.clearHistory().then(() => sendResponse({ success: true }));
      return true;
  }
});
```

## UI Design

### Popup Interface

```html
<!-- src/popup/popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Compressor</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header>
      <h1>Image Compressor</h1>
    </header>
    
    <main>
      <div class="dropzone" id="dropzone">
        <p>Drag & drop images here</p>
        <p class="subtext">or click to select</p>
        <input type="file" id="fileInput" accept="image/*" multiple hidden>
      </div>
      
      <div class="options">
        <label>
          Quality
          <input type="range" id="quality" min="10" max="100" value="80">
          <span id="qualityValue">80%</span>
        </label>
        
        <label>
          Format
          <select id="format">
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
          </select>
        </label>
        
        <label>
          Max Dimensions
          <input type="number" id="maxWidth" value="1920" placeholder="Width">
          <input type="number" id="maxHeight" value="1080" placeholder="Height">
        </label>
      </div>
      
      <div class="progress" id="progress" hidden>
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <p id="progressText">Compressing...</p>
      </div>
      
      <div class="results" id="results" hidden></div>
    </main>
    
    <footer>
      <button id="openSidePanel">Open Side Panel</button>
      <button id="viewHistory">View History</button>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### Content Script Overlay

```typescript
// src/content/overlay.ts
export class ImageOverlay {
  private overlay: HTMLElement | null = null;

  show(imageData: CompressedImage): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'compressor-overlay';
    this.overlay.innerHTML = `
      <div class="compressor-modal">
        <button class="close-btn">&times;</button>
        <img src="${imageData.compressedUrl}" alt="Compressed result">
        <div class="stats">
          <p>Original: ${this.formatSize(imageData.originalSize)}</p>
          <p>Compressed: ${this.formatSize(imageData.compressedSize)}</p>
          <p>Savings: ${(100 - (imageData.compressedSize / imageData.originalSize * 100)).toFixed(1)}%</p>
        </div>
        <button class="download-btn">Download</button>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  hide(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  private formatSize(bytes: number): string {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }
}
```

## State Management and Storage

```typescript
// src/storage/storage.ts
import { CompressedImage, CompressionOptions } from '../types';

const STORAGE_KEYS = {
  HISTORY: 'compression_history',
  OPTIONS: 'compression_options',
  STATS: 'compression_stats'
} as const;

export class StorageManager {
  async saveCompression(image: CompressedImage): Promise<void> {
    const history = await this.getHistory();
    history.unshift(image);
    
    // Keep last 100 compressed images
    if (history.length > 100) {
      history.pop();
    }
    
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
    await this.updateStats(image);
  }

  async getHistory(): Promise<CompressedImage[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    return result[STORAGE_KEYS.HISTORY] || [];
  }

  async getOptions(): Promise<CompressionOptions> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.OPTIONS);
    return result[STORAGE_KEYS.OPTIONS] || {
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      format: 'webp',
      preserveExif: false
    };
  }

  async saveOptions(options: CompressionOptions): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.OPTIONS]: options });
  }

  private async updateStats(image: CompressedImage): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
    const stats = result[STORAGE_KEYS.STATS] || {
      totalCompressed: 0,
      totalSavings: 0,
      byFormat: {}
    };
    
    stats.totalCompressed++;
    stats.totalSavings += image.originalSize - image.compressedSize;
    stats.byFormat[image.format] = (stats.byFormat[image.format] || 0) + 1;
    
    await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
  }

  async getStats(): Promise<any> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
    return result[STORAGE_KEYS.STATS] || { totalCompressed: 0, totalSavings: 0 };
  }

  async clearHistory(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
    await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: null });
  }
}
```

## Error Handling and Edge Cases

```typescript
// src/core/utils.ts
export class ErrorHandler {
  static handleCompressionError(error: unknown): string {
    if (error instanceof Error) {
      switch (error.message) {
        case 'Compression failed':
          return 'Failed to compress image. Please try a different format.';
        case 'Invalid image format':
          return 'Unsupported image format. Please use JPEG, PNG, or WebP.';
        default:
          return `Error: ${error.message}`;
      }
    }
    return 'An unexpected error occurred during compression.';
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Unsupported file type' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File too large (max 50MB)' };
    }
    
    return { valid: true };
  }

  static handleMemoryError(): void {
    // Clear large blobs from memory
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const limit = performance.memory.jsHeapSizeLimit;
      
      if (used / limit > 0.9) {
        console.warn('Memory usage high, clearing caches');
        URL.revokeObjectURL(document.body.dataset.lastUrl || '');
      }
    }
  }
}
```

## Testing Approach

### Unit Testing

```typescript
// tests/compressor.test.ts
import { ImageCompressor } from '../src/core/compressor';

describe('ImageCompressor', () => {
  let compressor: ImageCompressor;
  
  beforeEach(() => {
    compressor = new ImageCompressor();
  });

  test('should compress JPEG with correct quality', async () => {
    const file = new File([/* test image data */], 'test.jpg', { type: 'image/jpeg' });
    const result = await compressor.compress(file, {
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      format: 'jpeg',
      preserveExif: false
    });
    
    expect(result.compressedSize).toBeLessThan(file.size);
    expect(result.format).toBe('jpeg');
  });

  test('should calculate dimensions correctly', async () => {
    const file = new File([/* test image data */], 'test.png', { type: 'image/png' });
    const result = await compressor.compress(file, {
      quality: 80,
      maxWidth: 100,
      maxHeight: 100,
      format: 'webp',
      preserveExif: false
    });
    
    expect(result.dimensions.width).toBeLessThanOrEqual(100);
    expect(result.dimensions.height).toBeLessThanOrEqual(100);
  });
});
```

### Integration Testing with Puppeteer

```typescript
// tests/integration.test.ts
import { test, expect } from '@playwright/test';

test('popup compresses image successfully', async ({ page }) => {
  await page.goto('popup.html');
  
  // Set up file chooser
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('#dropzone');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(['tests/fixtures/test-image.png']);
  
  // Wait for compression
  await expect(page.locator('#progress')).toBeHidden({ timeout: 10000 });
  
  // Check results
  await expect(page.locator('#results')).toBeVisible();
  const savings = await page.locator('.savings-text').textContent();
  expect(savings).toContain('%');
});
```

## Performance Considerations

1. **Web Workers**: Offload compression to Web Workers to prevent UI blocking
2. **Lazy Loading**: Load compression logic only when needed
3. **Object URL Revocation**: Always revoke object URLs after use to prevent memory leaks
4. **Chunked Processing**: Process large images in chunks
5. **Debouncing**: Debounce user input for quality slider
6. **Service Worker Caching**: Cache static assets for faster load times

```typescript
// Using Web Worker for compression
const workerCode = `
  self.onmessage = async (e) => {
    const { imageData, options } = e.data;
    // Perform compression in worker
    const result = await compressInWorker(imageData, options);
    self.postMessage(result);
  };
`;

const worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
```

## Publishing Checklist

- [ ] Update version in manifest.json
- [ ] Test in Chrome, Edge, and Firefox (if cross-browser)
- [ ] Verify all permissions are necessary
- [ ] Add privacy policy URL if needed
- [ ] Create screenshots for store listing (1280x800, 640x400)
- [ ] Write compelling description and short description
- [ ] Set up OAuth for any identity requirements
- [ ] Test development build thoroughly
- [ ] Run chrome-webstore-upload CLI or manual upload
- [ ] Submit for review if required

## Conclusion

This guide provides a complete foundation for building a production-ready image compressor Chrome extension. The architecture uses modern TypeScript patterns, follows MV3 best practices, and includes proper error handling and testing strategies. Extend this base with additional features like batch processing, format conversion, or cloud backup as needed.
