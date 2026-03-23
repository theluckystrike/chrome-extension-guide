---
layout: post
title: "Build an Image Compressor Chrome Extension"
description: "Learn how to build a powerful image compressor Chrome extension that reduces image file sizes without losing quality. This comprehensive guide covers compression algorithms, WebP conversion, batch processing, and Manifest V3 implementation for creating a production-ready image compressor extension."
date: 2025-01-25
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project, tutorial]
keywords: "image compressor extension, compress images chrome, webp converter extension, chrome extension image optimization, batch image compression tool"
canonical_url: "https://bestchromeextensions.com/2025/01/25/build-an-image-compressor-chrome-extension/"
---

# Build an Image Compressor Chrome Extension

Image optimization remains one of the most impactful ways to improve website performance, reduce bandwidth costs, and enhance user experience. Whether you are a web developer, content creator, or digital marketer, having a reliable image compression tool directly in your browser can dramatically streamline your workflow. In this comprehensive guide, we will walk you through building a fully functional image compressor Chrome extension from scratch using modern web technologies and the latest Manifest V3 standards.

This project will teach you essential concepts in Chrome extension development, including file handling, canvas manipulation, image encoding, and user interface design. By the end of this tutorial, you will have a production-ready extension capable of compressing images, converting between formats, and processing multiple files in batch.

---

## Why Build an Image Compressor Extension? {#why-build}

The need for efficient image compression has never been more critical. Modern websites rely heavily on visual content, and unoptimized images often account for the majority of page weight. A well-built image compressor extension provides immediate value by allowing users to compress images without leaving their browser, upload images to websites with reduced file sizes, and convert images to modern formats like WebP for better performance.

Building this extension also provides an excellent learning opportunity. You will work with the Chrome Downloads API for file handling, the Canvas API for image manipulation, the File System Access API for reading local files, and various compression algorithms that demonstrate the power of client-side processing. Unlike server-side compression solutions, your extension will perform all processing locally in the browser, ensuring privacy and eliminating server costs.

The extension we will build supports multiple compression levels, format conversion between JPEG, PNG, and WebP, batch processing for multiple files, and before-and-after comparison to visualize quality improvements. This comprehensive feature set makes it a genuinely useful tool while providing depth in learning Chrome extension development concepts.

---

## Project Architecture and Prerequisites {#prerequisites}

Before diving into the code, let us establish the architecture of our image compressor extension. The project consists of several key components that work together to provide a seamless compression experience.

The extension uses a popup interface for quick access to compression settings and single-file compression. A dedicated options page handles advanced configuration, while background scripts manage file processing and downloads. The core compression logic leverages the browser's Canvas API for image manipulation and the ImageCodec API for format conversion.

For this project, you will need a basic understanding of HTML, CSS, and JavaScript. Familiarity with Chrome extension architecture will be helpful but is not strictly required, as we will explain each component in detail. You will also need Google Chrome or a Chromium-based browser for testing, and a code editor such as Visual Studio Code for writing the extension.

The extension follows Manifest V3 specifications, which is the current standard for Chrome extensions. This means we will use service workers instead of background pages, declarativeNetRequest for certain permissions, and modern async/await patterns for asynchronous operations.

---

## Setting Up the Project Structure {#project-structure}

Create a new folder for your extension project and set up the following directory structure:

```
image-compressor/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── background.js
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
├── lib/
│   └── compressor.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── _locales/
    └── en/
        └── messages.json
```

This structure separates concerns between the popup interface, background processing, and options page. The `lib` directory contains our compression logic, making it reusable across different parts of the extension.

---

## Creating the Manifest File {#manifest}

The manifest.json file defines the extension's configuration, permissions, and components. For our image compressor, we need permissions for downloads, file system access, and scripting. Here is the complete manifest configuration:

```json
{
  "manifest_version": 3,
  "name": "Image Compressor Pro",
  "version": "1.0.0",
  "description": "Compress images and convert to WebP without losing quality",
  "permissions": [
    "downloads",
    "fileSystem",
    "scripting"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options/options.html",
  "background": {
    "service_worker": "background/background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest declares the necessary permissions for file handling and downloads while defining our popup and options page. The service worker in the background handles more intensive processing tasks without blocking the user interface.

---

## Implementing the Core Compression Logic {#compression-logic}

The heart of our extension lies in the compression library. We will create a robust JavaScript module that handles image loading, compression, and format conversion. This module uses the Canvas API for image manipulation, which provides excellent compatibility and performance.

Create the file `lib/compressor.js` with the following implementation:

```javascript
/**
 * Image Compressor Library
 * Handles image compression, format conversion, and quality optimization
 */

export class ImageCompressor {
  constructor() {
    this.defaultOptions = {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      format: 'image/jpeg',
      preserveExif: false
    };
  }

  /**
   * Compress an image file with specified options
   * @param {File|Blob} file - Source image file
   * @param {Object} options - Compression options
   * @returns {Promise<Blob>} - Compressed image blob
   */
  async compress(file, options = {}) {
    const settings = { ...this.defaultOptions, ...options };
    
    // Load the image
    const imageBitmap = await this.loadImage(file);
    
    // Calculate new dimensions
    const { width, height } = this.calculateDimensions(
      imageBitmap.width,
      imageBitmap.height,
      settings.maxWidth,
      settings.maxHeight
    );
    
    // Create canvas for compression
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0, width, height);
    
    // Convert to target format
    const blob = await this.canvasToBlob(canvas, settings.format, settings.quality);
    
    return blob;
  }

  /**
   * Load an image file into an ImageBitmap
   * @param {File|Blob} file - Source file
   * @returns {Promise<ImageBitmap>}
   */
  async loadImage(file) {
    return createImageBitmap(file);
  }

  /**
   * Calculate new dimensions while preserving aspect ratio
   */
  calculateDimensions(width, height, maxWidth, maxHeight) {
    let newWidth = width;
    let newHeight = height;

    if (width > maxWidth) {
      newHeight = (maxWidth / width) * height;
      newWidth = maxWidth;
    }

    if (newHeight > maxHeight) {
      newWidth = (maxHeight / newHeight) * newWidth;
      newHeight = maxHeight;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  /**
   * Convert canvas to blob with specified format and quality
   */
  canvasToBlob(canvas, format, quality) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, format, quality);
    });
  }

  /**
   * Get file size in human-readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Calculate compression ratio
   */
  getCompressionRatio(originalSize, compressedSize) {
    return ((1 - compressedSize / originalSize) * 100).toFixed(1);
  }
}

export default ImageCompressor;
```

This compression library provides a clean API for image processing. The `compress` method handles the entire workflow from loading to exporting, while helper methods manage dimension calculations and format conversions. The library supports JPEG, PNG, and WebP formats, giving users flexibility in their compression needs.

The ImageCompressor class uses modern JavaScript features including async/await for asynchronous operations and ES6 module syntax for clean code organization. This makes it easy to import and use in both our popup and background scripts.

---

## Building the Popup Interface {#popup-interface}

The popup provides the primary user interface for quick compression tasks. It should be clean, intuitive, and responsive. Let us create a popup that allows users to select files, configure compression settings, and initiate compression with visual feedback.

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Compressor</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Image Compressor</h1>
      <p class="subtitle">Compress images without quality loss</p>
    </header>

    <main>
      <div class="upload-section" id="dropZone">
        <input type="file" id="fileInput" accept="image/*" multiple hidden>
        <div class="upload-content">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p>Drop images here or <button id="browseBtn">browse</button></p>
          <span class="hint">Supports JPEG, PNG, WebP</span>
        </div>
      </div>

      <div class="settings-section">
        <div class="setting-group">
          <label for="quality">Quality: <span id="qualityValue">80%</span></label>
          <input type="range" id="quality" min="10" max="100" value="80">
        </div>

        <div class="setting-group">
          <label for="format">Output Format</label>
          <select id="format">
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp" selected>WebP</option>
          </select>
        </div>

        <div class="setting-group">
          <label for="maxWidth">Max Width (px)</label>
          <input type="number" id="maxWidth" value="1920" min="100" max="8000">
        </div>
      </div>

      <button id="compressBtn" class="primary-btn" disabled>Compress Images</button>

      <div class="results-section" id="resultsSection" hidden>
        <h2>Results</h2>
        <div id="resultsList"></div>
        <button id="downloadAllBtn" class="secondary-btn">Download All</button>
      </div>
    </main>

    <footer>
      <a href="#" id="optionsLink">Options</a>
    </footer>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

Now create `popup/popup.css` for styling:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 360px;
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  color: #1a73e8;
}

.subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.upload-section {
  background: white;
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.upload-section:hover,
.upload-section.drag-over {
  border-color: #1a73e8;
  background: #f8f9ff;
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: #999;
  margin-bottom: 8px;
}

.upload-content p {
  font-size: 14px;
  margin-bottom: 4px;
}

.upload-content button {
  background: none;
  border: none;
  color: #1a73e8;
  cursor: pointer;
  font-size: 14px;
  text-decoration: underline;
}

.hint {
  font-size: 11px;
  color: #999;
}

.settings-section {
  margin: 16px 0;
  background: white;
  border-radius: 8px;
  padding: 12px;
}

.setting-group {
  margin-bottom: 12px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #555;
}

.setting-group input[type="range"],
.setting-group input[type="number"],
.setting-group select {
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.setting-group input[type="range"] {
  -webkit-appearance: none;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
}

.setting-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #1a73e8;
  border-radius: 50%;
  cursor: pointer;
}

.primary-btn {
  width: 100%;
  padding: 12px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover:not(:disabled) {
  background: #1557b0;
}

.primary-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.results-section {
  margin-top: 16px;
  background: white;
  border-radius: 8px;
  padding: 12px;
}

.results-section h2 {
  font-size: 14px;
  margin-bottom: 12px;
}

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 8px;
}

.result-item:last-child {
  margin-bottom: 0;
}

.result-info {
  flex: 1;
}

.result-name {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.result-stats {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.compression-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.compression-badge.positive {
  background: #e6f4ea;
  color: #1e8e3e;
}

.compression-badge.negative {
  background: #fce8e6;
  color: #d93025;
}

.secondary-btn {
  width: 100%;
  padding: 10px;
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  margin-top: 12px;
  transition: background 0.2s;
}

.secondary-btn:hover {
  background: #eee;
}

footer {
  margin-top: 16px;
  text-align: center;
}

footer a {
  font-size: 12px;
  color: #666;
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}
```

Now create `popup/popup.js` to handle user interactions:

```javascript
import { ImageCompressor } from '../lib/compressor.js';

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const dropZone = document.getElementById('dropZone');
  const qualitySlider = document.getElementById('quality');
  const qualityValue = document.getElementById('qualityValue');
  const formatSelect = document.getElementById('format');
  const maxWidthInput = document.getElementById('maxWidth');
  const compressBtn = document.getElementById('compressBtn');
  const resultsSection = document.getElementById('resultsSection');
  const resultsList = document.getElementById('resultsList');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const optionsLink = document.getElementById('optionsLink');

  const compressor = new ImageCompressor();
  let selectedFiles = [];
  let compressedFiles = [];

  // Quality slider update
  qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = `${e.target.value}%`;
  });

  // File selection
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  // Handle selected files
  function handleFiles(files) {
    selectedFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (selectedFiles.length > 0) {
      compressBtn.disabled = false;
      compressBtn.textContent = `Compress ${selectedFiles.length} Image${selectedFiles.length > 1 ? 's' : ''}`;
    }
  }

  // Compress images
  compressBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    compressBtn.disabled = true;
    compressBtn.textContent = 'Compressing...';
    compressedFiles = [];
    resultsList.innerHTML = '';

    const options = {
      quality: parseInt(qualitySlider.value) / 100,
      format: formatSelect.value,
      maxWidth: parseInt(maxWidthInput.value),
      maxHeight: parseInt(maxWidthInput.value)
    };

    for (const file of selectedFiles) {
      try {
        const compressed = await compressor.compress(file, options);
        const compressionRatio = compressor.getCompressionRatio(file.size, compressed.size);
        
        compressedFiles.push({
          original: file,
          compressed: compressed,
          name: file.name.replace(/\.[^/.]+$/, '') + '.webp',
          ratio: compressionRatio
        });

        // Add result item
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `
          <div class="result-info">
            <div class="result-name">${file.name}</div>
            <div class="result-stats">
              ${compressor.formatFileSize(file.size)} → ${compressor.formatFileSize(compressed.size)}
            </div>
          </div>
          <span class="compression-badge ${compressionRatio > 0 ? 'positive' : 'negative'}">
            ${compressionRatio > 0 ? '-' : '+'}${Math.abs(compressionRatio)}%
          </span>
        `;
        
        // Download individual file
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'secondary-btn';
        downloadBtn.textContent = 'Download';
        downloadBtn.style.marginTop = '8px';
        downloadBtn.addEventListener('click', () => downloadFile(compressedFiles[compressedFiles.length - 1]));
        
        resultItem.appendChild(downloadBtn);
        resultsList.appendChild(resultItem);

      } catch (error) {
        console.error(`Error compressing ${file.name}:`, error);
      }
    }

    resultsSection.hidden = false;
    compressBtn.disabled = false;
    compressBtn.textContent = `Compress ${selectedFiles.length} Image${selectedFiles.length > 1 ? 's' : ''}`;
  });

  // Download single file
  function downloadFile(fileData) {
    const url = URL.createObjectURL(fileData.compressed);
    chrome.downloads.download({
      url: url,
      filename: fileData.name
    });
  }

  // Download all
  downloadAllBtn.addEventListener('click', () => {
    compressedFiles.forEach((fileData, index) => {
      setTimeout(() => downloadFile(fileData), index * 500);
    });
  });

  // Open options
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });
});
```

The popup interface provides a complete user experience for image compression. Users can drag and drop images or browse for files, adjust quality and format settings, and see real-time compression results with file size comparisons. The compression happens directly in the browser, ensuring fast processing and privacy.

---

## Implementing the Background Service Worker {#background-worker}

In Manifest V3, background scripts run as service workers. While our popup handles most functionality directly, we can use the background script for more advanced features like handling file system access or coordinating multiple compression tasks.

Create `background/background.js`:

```javascript
/**
 * Background Service Worker for Image Compressor Extension
 * Handles advanced file operations and coordinates with popup
 */

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'compressFiles') {
    handleBatchCompression(message.files, message.options)
      .then(results => sendResponse({ success: true, results }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'getSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse(result.settings || getDefaultSettings());
    });
    return true;
  }

  if (message.type === 'saveSettings') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Handle batch compression in background
 */
async function handleBatchCompression(files, options) {
  const results = [];
  
  for (const file of files) {
    try {
      const compressed = await compressInBackground(file, options);
      results.push({
        success: true,
        originalName: file.name,
        compressedBlob: compressed.blob,
        originalSize: file.size,
        compressedSize: compressed.blob.size
      });
    } catch (error) {
      results.push({
        success: false,
        originalName: file.name,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Compress a single file in background context
 */
async function compressInBackground(file, options) {
  // Create an offscreen document for canvas operations
  // This is a workaround for service worker limitations
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > options.maxWidth) {
          height = (options.maxWidth / width) * height;
          width = options.maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, width, height });
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          options.format,
          options.quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get default settings
 */
function getDefaultSettings() {
  return {
    quality: 80,
    format: 'image/webp',
    maxWidth: 1920,
    maxHeight: 1080,
    preserveExif: false,
    autoDownload: false
  };
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.local.set({ settings: getDefaultSettings() });
  }
});
```

The background service worker handles more complex operations and maintains settings persistence through Chrome's storage API. This separation of concerns keeps the popup responsive while enabling advanced features.

---

## Creating the Options Page {#options-page}

The options page allows users to configure default compression settings and customize their experience. Create `options/options.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Compressor - Options</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="options-container">
    <header>
      <h1>Settings</h1>
      <p>Configure your image compression preferences</p>
    </header>

    <form id="settingsForm">
      <section class="settings-section">
        <h2>Compression Settings</h2>
        
        <div class="setting-item">
          <label for="defaultQuality">Default Quality</label>
          <div class="range-container">
            <input type="range" id="defaultQuality" min="10" max="100" value="80">
            <span id="qualityDisplay">80%</span>
          </div>
          <p class="hint">Higher quality means larger file sizes</p>
        </div>

        <div class="setting-item">
          <label for="defaultFormat">Default Output Format</label>
          <select id="defaultFormat">
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp" selected>WebP (Recommended)</option>
          </select>
          <p class="hint">WebP provides the best compression</p>
        </div>

        <div class="setting-item">
          <label for="maxWidth">Maximum Width</label>
          <input type="number" id="maxWidth" value="1920" min="100" max="8000">
          <p class="hint">Images larger than this will be resized</p>
        </div>

        <div class="setting-item">
          <label for="maxHeight">Maximum Height</label>
          <input type="number" id="maxHeight" value="1080" min="100" max="8000">
        </div>
      </section>

      <section class="settings-section">
        <h2>Behavior</h2>
        
        <div class="setting-item checkbox-item">
          <label>
            <input type="checkbox" id="autoDownload">
            <span>Automatically download compressed images</span>
          </label>
          <p class="hint">Downloads start immediately after compression</p>
        </div>

        <div class="setting-item checkbox-item">
          <label>
            <input type="checkbox" id="preserveExif">
            <span>Preserve EXIF data</span>
          </label>
          <p class="hint">Keeps metadata like camera info and location</p>
        </div>
      </section>

      <div class="actions">
        <button type="submit" class="save-btn">Save Settings</button>
        <button type="button" id="resetBtn" class="reset-btn">Reset to Defaults</button>
      </div>

      <div id="message" class="message"></div>
    </form>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

Create `options/options.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #f0f0f0;
  color: #333;
  line-height: 1.5;
}

.options-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

header {
  margin-bottom: 24px;
}

header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1a73e8;
}

header p {
  color: #666;
  margin-top: 4px;
}

.settings-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.settings-section h2 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item > label {
  display: block;
  font-weight: 500;
  margin-bottom: 6px;
}

.setting-item input[type="number"],
.setting-item select {
  width: 100%;
  max-width: 200px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.range-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-container input[type="range"] {
  flex: 1;
  max-width: 200px;
  -webkit-appearance: none;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
}

.range-container input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #1a73e8;
  border-radius: 50%;
  cursor: pointer;
}

.range-container span {
  font-weight: 500;
  min-width: 40px;
}

.hint {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

.checkbox-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-item span {
  font-weight: normal;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.save-btn {
  padding: 10px 24px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.save-btn:hover {
  background: #1557b0;
}

.reset-btn {
  padding: 10px 24px;
  background: white;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.reset-btn:hover {
  background: #f5f5f5;
}

.message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 4px;
  text-align: center;
  display: none;
}

.message.success {
  display: block;
  background: #e6f4ea;
  color: #1e8e3e;
}

.message.error {
  display: block;
  background: #fce8e6;
  color: #d93025;
}
```

Now create `options/options.js`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settingsForm');
  const qualitySlider = document.getElementById('defaultQuality');
  const qualityDisplay = document.getElementById('qualityDisplay');
  const resetBtn = document.getElementById('resetBtn');
  const messageEl = document.getElementById('message');

  const defaultSettings = {
    quality: 80,
    format: 'image/webp',
    maxWidth: 1920,
    maxHeight: 1080,
    autoDownload: false,
    preserveExif: false
  };

  // Load settings
  loadSettings();

  // Quality slider update
  qualitySlider.addEventListener('input', (e) => {
    qualityDisplay.textContent = `${e.target.value}%`;
  });

  // Save settings
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const settings = {
      quality: parseInt(qualitySlider.value),
      format: document.getElementById('defaultFormat').value,
      maxWidth: parseInt(document.getElementById('maxWidth').value),
      maxHeight: parseInt(document.getElementById('maxHeight').value),
      autoDownload: document.getElementById('autoDownload').checked,
      preserveExif: document.getElementById('preserveExif').checked
    };

    try {
      await chrome.storage.local.set({ settings });
      showMessage('Settings saved successfully!', 'success');
    } catch (error) {
      showMessage('Failed to save settings.', 'error');
    }
  });

  // Reset to defaults
  resetBtn.addEventListener('click', async () => {
    qualitySlider.value = defaultSettings.quality;
    qualityDisplay.textContent = `${defaultSettings.quality}%`;
    document.getElementById('defaultFormat').value = defaultSettings.format;
    document.getElementById('maxWidth').value = defaultSettings.maxWidth;
    document.getElementById('maxHeight').value = defaultSettings.maxHeight;
    document.getElementById('autoDownload').checked = defaultSettings.autoDownload;
    document.getElementById('preserveExif').checked = defaultSettings.preserveExif;

    try {
      await chrome.storage.local.set({ settings: defaultSettings });
      showMessage('Settings reset to defaults!', 'success');
    } catch (error) {
      showMessage('Failed to reset settings.', 'error');
    }
  });

  // Load settings from storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get('settings');
      const settings = result.settings || defaultSettings;

      qualitySlider.value = settings.quality;
      qualityDisplay.textContent = `${settings.quality}%`;
      document.getElementById('defaultFormat').value = settings.format;
      document.getElementById('maxWidth').value = settings.maxWidth;
      document.getElementById('maxHeight').value = settings.maxHeight;
      document.getElementById('autoDownload').checked = settings.autoDownload;
      document.getElementById('preserveExif').checked = settings.preserveExif;
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // Show message
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    
    setTimeout(() => {
      messageEl.className = 'message';
    }, 3000);
  }
});
```

The options page provides a comprehensive settings interface that saves preferences to Chrome's local storage. Users can configure default quality levels, output formats, dimension limits, and behavior preferences.

---

## Creating Extension Icons {#icons}

Every Chrome extension needs icons in three sizes: 16x16, 48x48, and 128x128 pixels. While you can create custom icons in an image editor, you can also generate simple placeholder icons using a canvas-based approach or download free icon sets.

For development purposes, create simple SVG icons that can be converted to PNG, or use any image editing tool to create three PNG files with the following specifications:

- icon16.png: 16x16 pixels (toolbar icon)
- icon48.png: 48x48 pixels (extensions management page)
- icon128.png: 128x128 pixels (installation dialog)

Name your files accordingly and place them in the `icons/` folder.

---

## Adding Localization Support {#localization}

Chrome extensions support internationalization through the _locales folder. Create `locales/en/messages.json` with the following content:

```json
{
  "extensionName": {
    "message": "Image Compressor Pro",
    "description": "The name of the extension"
  },
  "extensionDescription": {
    "message": "Compress images and convert to WebP without losing quality",
    "description": "The description of the extension"
  }
}
```

This enables future localization efforts and follows Chrome extension best practices.

---

## Testing Your Extension {#testing}

Now that we have built all the components, it is time to test the extension. Follow these steps to load your extension in Chrome:

First, open Chrome and navigate to `chrome://extensions/` in the address bar. Enable "Developer mode" using the toggle in the top right corner. Click the "Load unpacked" button that appears and select your extension folder (`image-compressor/`).

The extension should now appear in your Chrome toolbar. Click the extension icon to open the popup, and try compressing an image to verify everything works correctly.

If you encounter issues, use the Chrome DevTools to debug. Right-click the extension popup and select "Inspect" to open the popup's developer tools. Check the Console for any error messages that might indicate problems with your code.

---

## Key Features Summary {#summary}

Throughout this comprehensive guide, we have built a fully functional image compressor Chrome extension with the following capabilities:

**Core Compression Features:** The extension uses the Canvas API to compress images while preserving visual quality. It supports quality adjustment from 10% to 100%, allowing users to balance file size against image fidelity. The compression works entirely client-side, meaning images never leave the user's browser.

**Format Conversion:** Users can convert between JPEG, PNG, and WebP formats. WebP is recommended as it typically provides 25-35% smaller file sizes compared to JPEG at equivalent quality levels. This makes the extension particularly valuable for web developers optimizing their websites.

**Batch Processing:** The extension handles multiple images simultaneously, displaying individual compression results for each file. Users can download compressed images individually or all at once, making it efficient for processing image collections.

**Customizable Settings:** The options page provides persistent settings that remember user preferences. Default quality levels, output formats, and dimension limits can be configured to match specific workflow requirements.

**Modern Architecture:** Built on Manifest V3, the extension uses service workers for background processing, declarative permissions for security, and ES6 modules for clean code organization. This follows current Chrome extension best practices and ensures compatibility with future Chrome updates.

---

## Future Enhancements {#future-enhancements}

While our extension is fully functional, there are numerous ways you could enhance it further. Consider adding drag-and-drop support directly onto web pages using content scripts, implementing advanced compression algorithms like MozJPEG for even better results, adding image preview with zoom functionality before compression, supporting folder processing for batch operations, integrating with cloud storage services for direct uploads, or adding keyboard shortcuts for power users.

Each of these enhancements would provide additional value while teaching you more about Chrome extension development. The foundation we have built serves as an excellent starting point for any image optimization workflow.

---

## Conclusion {#conclusion}

Building an image compressor Chrome extension is an excellent project that combines practical utility with meaningful technical learning. You have created a tool that solves a real problem—optimizing images for web performance—while mastering concepts that apply to many other extension projects.

The extension demonstrates key Chrome extension development patterns including popup interfaces, background service workers, options pages, file handling APIs, and persistent storage. These patterns form the foundation for building virtually any type of Chrome extension you can imagine.

As you continue developing extensions, remember to follow Chrome's best practices for security and performance. Always request only the permissions you need, process data efficiently to avoid blocking the user interface, and test thoroughly across different scenarios. Your image compressor extension is now ready for use—start compressing those images and enjoy the performance benefits of optimized web assets.
