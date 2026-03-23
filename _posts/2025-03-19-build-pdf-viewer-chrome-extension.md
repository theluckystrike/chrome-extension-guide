---
layout: post
title: "Build a PDF Viewer Chrome Extension: Complete Tutorial with pdf.js"
description: "Learn to build a powerful PDF viewer Chrome extension using pdf.js. This comprehensive tutorial covers manifest setup, content scripts, rendering, and deployment."
date: 2025-03-19
categories: [Chrome-Extensions, Tutorials]
tags: [pdf, pdfjs, chrome-extension]
keywords: "chrome extension pdf viewer, pdf.js chrome extension, build pdf reader extension, chrome extension open pdf, pdf extension chrome"
canonical_url: "https://bestchromeextensions.com/2025/03/19/build-pdf-viewer-chrome-extension/"
---

# Build a PDF Viewer Chrome Extension: Complete Tutorial with pdf.js

PDF documents remain one of the most widely used file formats for sharing and preserving document formatting across different platforms. While Chrome includes a built-in PDF viewer, building your own PDF viewer Chrome extension using pdf.js opens up powerful customization possibilities. Whether you need to add annotation tools, implement custom navigation features, or create a branded document viewing experience, this comprehensive tutorial will guide you through building a production-ready PDF viewer extension from scratch.

In this guide, we will explore the architecture of Chrome extensions, integrate the Mozilla pdf.js library, implement efficient PDF rendering, and deploy a fully functional PDF viewer that can open PDF files directly in Chrome. By the end of this tutorial, you will have a complete understanding of how to build pdf reader extensions that rival commercial solutions.

---

## Understanding the PDF Viewer Extension Architecture

Before diving into code, it is essential to understand how PDF viewer extensions work in Chrome. Unlike simple content scripts that modify web pages, a PDF viewer extension requires a sophisticated architecture that handles file loading, rendering, and user interaction. The extension we will build uses a multi-component architecture that separates concerns effectively.

The core components of our PDF viewer extension include the manifest file that declares extension capabilities, a background service worker for handling extension lifecycle events, a popup interface for quick access, and a content script that handles PDF rendering within the browser. This architecture allows for clean separation of concerns and makes the extension maintainable as features grow.

Chrome's extension system provides several APIs specifically useful for PDF viewers. The chrome.downloads API enables downloading PDF files, the chrome.fileSystem API allows accessing local files, and the chrome.tabs API facilitates working with browser tabs. Understanding these APIs and when to use them is crucial for building a robust PDF viewer extension.

---

## Setting Up the Extension Project Structure

Every Chrome extension begins with a manifest.json file that declares the extension's permissions, files, and capabilities. For our PDF viewer extension, we need to carefully configure the manifest to support file access, downloads, and tab management. The manifest version 3 is the current standard, and we will use it throughout this tutorial.

Create a new directory for your extension and add the manifest.json file with the following configuration:

```json
{
  "manifest_version": 3,
  "name": "PDF Viewer Pro",
  "version": "1.0.0",
  "description": "A powerful PDF viewer Chrome extension built with pdf.js",
  "permissions": [
    "downloads",
    "tabs",
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "*://*/*"
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
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest declares the necessary permissions for file handling and tab management while keeping the extension flexible. The host permissions are set broadly to allow the extension to work with PDFs from any source, though in a production environment, you might want to restrict these permissions for security.

---

## Implementing the Background Service Worker

The background service worker handles extension lifecycle events and manages communication between different extension components. In our PDF viewer extension, the background script will listen for toolbar button clicks, handle extension installation, and manage any background processing tasks.

Create the background.js file with the following implementation:

```javascript
// Background service worker for PDF Viewer extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('PDF Viewer Pro extension installed');
  
  // Set default options
  chrome.storage.sync.set({
    defaultZoom: 1.0,
    autoOpen: false,
    darkMode: false
  });
});

// Handle toolbar button clicks
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'openPDFViewer' });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPDFInfo') {
    // Process PDF information request
    sendResponse({ status: 'success' });
  }
  return true;
});
```

The background service worker initializes default settings when the extension is first installed and sets up message handling for communication with other extension components. This architecture ensures that the extension maintains state across different tabs and sessions.

---

## Creating the Popup Interface

The popup provides quick access to the extension's features without opening a full page. For our PDF viewer extension, the popup allows users to quickly open a PDF file or adjust viewing settings. The popup uses standard HTML, CSS, and JavaScript, making it easy to customize the interface.

Create the popup.html file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Viewer Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <h1>PDF Viewer Pro</h1>
    <div class="controls">
      <button id="openFileBtn" class="primary-btn">
        Open PDF File
      </button>
      <input type="file" id="fileInput" accept=".pdf" style="display: none;">
    </div>
    <div class="settings">
      <label>
        <input type="checkbox" id="autoOpen">
        Auto-open PDFs in viewer
      </label>
      <label>
        <input type="checkbox" id="darkMode">
        Dark Mode
      </label>
    </div>
    <div class="zoom-controls">
      <label>Default Zoom:</label>
      <input type="range" id="zoomSlider" min="0.5" max="3" step="0.1" value="1">
      <span id="zoomValue">100%</span>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

The popup interface provides essential controls for file opening and viewing preferences. Users can toggle auto-opening of PDFs, enable dark mode for comfortable reading, and set their preferred default zoom level. These settings are persisted using the Chrome storage API, ensuring they persist across browser sessions.

Add the corresponding popup.css for styling:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 300px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
  color: #333;
  padding: 16px;
}

.popup-container h1 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #1a73e8;
}

.controls {
  margin-bottom: 16px;
}

.primary-btn {
  width: 100%;
  padding: 12px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover {
  background: #1557b0;
}

.settings {
  margin-bottom: 16px;
}

.settings label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  cursor: pointer;
}

.zoom-controls {
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

.zoom-controls label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}

.zoom-controls input[type="range"] {
  width: 100%;
}

#zoomValue {
  display: block;
  text-align: center;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}
```

---

## Implementing the Content Script with pdf.js

The content script is where the magic happens. This script integrates Mozilla's pdf.js library to render PDF documents directly in the browser. The content script detects when a PDF link is clicked and opens the built-in viewer instead of the default Chrome PDF viewer, giving us full control over the viewing experience.

First, you need to include the pdf.js library. Download the latest version from Mozilla's GitHub repository and place it in your extension directory. For this tutorial, we will assume the files are named pdf.js and pdf.worker.js.

Create the content.js file:

```javascript
// PDF Viewer content script using pdf.js

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let canvas = null;
let ctx = null;
let scale = 1.0;

// Initialize pdf.js
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.js');

// Render a PDF page
function renderPage(num) {
  pageRendering = true;
  
  pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale: scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    
    const renderTask = page.render(renderContext);
    
    renderTask.promise.then(() => {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });
  
  document.getElementById('page_num').textContent = num;
}

// Queue rendering if already rendering
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

// Previous page
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}

// Next page
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}

// Open PDF from URL
async function openPDF(url) {
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    pdfDoc = await loadingTask.promise;
    document.getElementById('page_count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
  } catch (error) {
    console.error('Error loading PDF:', error);
  }
}

// Initialize the viewer
function initializeViewer() {
  canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d');
  document.body.appendChild(canvas);
  
  // Add navigation controls
  const navControls = document.createElement('div');
  navControls.className = 'pdf-nav-controls';
  navControls.innerHTML = `
    <button id="prev">Previous</button>
    <span>Page <span id="page_num"></span> of <span id="page_count"></span></span>
    <button id="next">Next</button>
  `;
  document.body.appendChild(navControls);
  
  document.getElementById('prev').addEventListener('click', onPrevPage);
  document.getElementById('next').addEventListener('click', onNextPage);
}

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPDFViewer') {
    const fileUrl = message.pdfUrl;
    if (fileUrl) {
      openPDF(fileUrl);
    }
  }
});

// Intercept PDF links
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href$=".pdf"]');
  if (link && shouldInterceptPDF(link.href)) {
    e.preventDefault();
    openPDF(link.href);
  }
});

function shouldInterceptPDF(url) {
  // Add logic to determine when to intercept PDF links
  // For example, check storage for user preference
  return true;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeViewer);
} else {
  initializeViewer();
}
```

This content script provides the core PDF rendering functionality using pdf.js. It handles page rendering, navigation between pages, and intercepting PDF links. The script creates a canvas element for rendering and adds navigation controls for moving between pages of the document.

---

## Advanced PDF Viewer Features

Building a basic PDF viewer is just the beginning. To create a truly useful chrome extension pdf viewer, you need to implement additional features that enhance the user experience. Let us explore some advanced features that will make your extension stand out from the competition.

### Zoom and Pan Functionality

PDF documents often need to be viewed at different zoom levels. Implementing smooth zoom and pan functionality requires capturing mouse events and updating the canvas scale accordingly. Add these functions to your content script:

```javascript
function zoomIn() {
  scale += 0.25;
  renderPage(pageNum);
}

function zoomOut() {
  if (scale > 0.5) {
    scale -= 0.25;
    renderPage(pageNum);
  }
}

function fitToWidth() {
  const containerWidth = document.body.clientWidth;
  pdfDoc.getPage(pageNum).then((page) => {
    const viewport = page.getViewport({ scale: 1.0 });
    scale = containerWidth / viewport.width;
    renderPage(pageNum);
  });
}

// Mouse wheel zoom
canvas.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }
});
```

### Text Selection and Search

One of the most useful features in a PDF viewer is the ability to search for text and select content. The pdf.js library provides text layer rendering that enables both features. Implementing text selection requires rendering an invisible text layer over the canvas:

```javascript
async function renderTextLayer(page, viewport) {
  const textContent = await page.getTextContent();
  
  const textLayerDiv = document.createElement('div');
  textLayerDiv.className = 'text-layer';
  textLayerDiv.style.width = `${viewport.width}px`;
  textLayerDiv.style.height = `${viewport.height}px`;
  document.body.appendChild(textLayerDiv);
  
  const textLayer = new TextLayerBuilder({
    textLayerDiv: textLayerDiv,
    viewport: viewport,
    textContentItems: textContent.items
  });
  
  textLayer.render();
}
```

### Bookmark and History Management

For frequently accessed documents, implementing bookmark functionality adds significant value. Store bookmarks using Chrome's storage API:

```javascript
function addBookmark(url, title) {
  chrome.storage.sync.get(['bookmarks'], (result) => {
    const bookmarks = result.bookmarks || [];
    bookmarks.push({ url, title, date: new Date().toISOString() });
    chrome.storage.sync.set({ bookmarks });
  });
}

function getBookmarks(callback) {
  chrome.storage.sync.get(['bookmarks'], (result) => {
    callback(result.bookmarks || []);
  });
}
```

---

## Handling Edge Cases and Error Scenarios

A robust PDF viewer extension must handle various edge cases gracefully. Large PDF files can consume significant memory, password-protected PDFs require authentication, and corrupted files need appropriate error messages. Let us implement proper error handling and edge case management.

### Memory Management for Large PDFs

Large PDF documents can cause memory issues if all pages are rendered simultaneously. Implement lazy loading and canvas recycling to manage memory effectively:

```javascript
const MAX_CACHED_PAGES = 3;
const pageCache = new Map();

function renderPageWithCache(num) {
  if (pageCache.has(num)) {
    const cached = pageCache.get(num);
    canvas.width = cached.width;
    canvas.height = cached.height;
    ctx.drawImage(cached.canvas, 0, 0);
    document.getElementById('page_num').textContent = num;
    return;
  }
  
  // Clear cache if too large
  if (pageCache.size >= MAX_CACHED_PAGES) {
    const oldestKey = pageCache.keys().next().value;
    pageCache.delete(oldestKey);
  }
  
  pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale: scale });
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    page.render({
      canvasContext: tempCtx,
      viewport: viewport
    }).promise.then(() => {
      pageCache.set(num, {
        canvas: tempCanvas,
        width: viewport.width,
        height: viewport.height
      });
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      ctx.drawImage(tempCanvas, 0, 0);
      document.getElementById('page_num').textContent = num;
    });
  });
}
```

### Password-Protected PDF Handling

When opening a password-protected PDF, the library throws an error that you need to catch and handle by prompting for a password:

```javascript
async function openPDFWithPassword(url, password = null) {
  try {
    const loadingTask = pdfjsLib.getDocument({
      url: url,
      password: password
    });
    pdfDoc = await loadingTask.promise;
    renderPage(pageNum);
  } catch (error) {
    if (error.name === 'PasswordException') {
      const userPassword = prompt('This PDF is password protected. Enter password:');
      if (userPassword) {
        openPDFWithPassword(url, userPassword);
      }
    } else {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF. The file may be corrupted or invalid.');
    }
  }
}
```

---

## Testing and Debugging Your Extension

Before publishing your extension, thorough testing is essential. Chrome provides developer tools specifically for extension development that make debugging straightforward. Use the Extension Management page (chrome://extensions) to load your unpacked extension and access developer tools.

When testing your PDF viewer extension, verify the following scenarios: opening PDFs from local files, opening PDFs from URLs, navigating through multi-page documents, zooming in and out, handling password-protected PDFs, managing large PDF files without crashing, and ensuring the extension works across different Chrome versions.

---

## Publishing Your Extension to the Chrome Web Store

Once your extension is tested and ready, you can publish it to the Chrome Web Store. The publishing process requires creating a developer account, preparing promotional assets, and submitting your extension for review. Google reviews extensions to ensure they meet security and policy requirements.

Before submitting, double-check that your extension complies with Chrome Web Store policies, including proper permission usage, privacy policy (if collecting user data), and accurate description of functionality. Also ensure you have created appropriately sized icons (128x128, 48x48, and 16x16 pixels).

---

## Conclusion

Building a PDF viewer Chrome extension with pdf.js is a rewarding project that teaches you valuable skills in Chrome extension development, PDF handling, and user interface design. The architecture and code patterns we covered in this tutorial provide a solid foundation for creating sophisticated document viewing experiences.

From setting up the manifest and background service worker to implementing rendering with pdf.js and adding advanced features like zoom, search, and bookmarking, you now have a comprehensive understanding of how to build pdf reader extensions. The key to success is iterative development: start with basic functionality, test thoroughly, and progressively add features based on user feedback.

Remember to keep performance in mind when handling large PDF files, implement proper error handling for edge cases, and always test across different scenarios before publishing. With the skills gained from this tutorial, you are well-equipped to build professional-grade PDF viewer extensions that enhance Chrome users' document viewing experience.

---

## Additional Resources

To further enhance your PDF viewer extension, consider exploring these advanced topics: integrating annotation APIs for drawing and highlighting, implementing PDF form filling capabilities, adding support for PDF signatures, and exploring WebAssembly-based PDF rendering for improved performance. The Chrome extension documentation and pdf.js documentation provide comprehensive references for diving deeper into these areas.
