---
layout: post
title: "Build a ZIP File Handler Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a ZIP file handler Chrome extension from scratch. This comprehensive tutorial covers file compression, extraction, and handling ZIP files directly in your browser using modern JavaScript techniques."
date: 2025-01-22
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "zip handler extension, unzip chrome extension, file compression extension, chrome extension zip, build zip extension"
canonical_url: "https://bestchromeextensions.com/2025/01/22/build-zip-file-handler-chrome-extension/"
---

# Build a ZIP File Handler Chrome Extension: Complete Developer's Guide

File compression and extraction are essential operations for anyone working with digital files. Whether you are downloading software packages, sharing multiple documents, or managing project files, ZIP files remain the most popular archive format on the internet. While desktop applications have long handled ZIP files with ease, browser-based solutions have been limited—until now.

In this comprehensive guide, we will walk you through building a fully functional ZIP file handler Chrome extension that can compress files, extract archives, and manage compressed data directly within Chrome. This project will teach you valuable skills in Chrome extension development, file handling APIs, and modern JavaScript techniques.

---

## Why Build a ZIP Handler Extension? {#why-build-zip-handler}

The demand for browser-based file compression tools continues to grow for several compelling reasons. Understanding these motivations will help you design a better extension that meets real user needs.

### Rising Need for Browser-Based Tools

Modern workflows increasingly operate in the cloud. Users collaborate on documents, store files in cloud services, and share resources through web platforms. However, the ability to compress or extract files often requires switching to desktop applications, disrupting productivity. A ZIP handler extension eliminates this friction by bringing compression capabilities directly into the browser environment.

Users frequently encounter ZIP files while browsing—downloading software, extracting resources from tutorials, or sharing multiple files. Having an extension that handles these operations seamlessly transforms Chrome into a more capable workstation. The extension can detect ZIP files automatically, offer extraction options, and even create compressed archives from selected files.

### Learning Opportunities

Building a ZIP handler extension teaches you several important concepts in extension development. You will work with the Chrome Downloads API to manage file operations, use the File System Access API for user interactions, implement background workers for heavy processing, and handle binary data in JavaScript. These skills transfer directly to other extension projects and general web development.

The project also introduces you to working with third-party JavaScript libraries for compression. Libraries like JSZip provide robust, well-tested implementations that handle the complexities of the ZIP format, allowing you to focus on building the extension interface and integration points.

---

## Project Architecture and Components {#project-architecture}

Before writing any code, let us establish the architecture of our ZIP handler extension. A well-planned structure makes development smoother and the final product more maintainable.

### Core Components

Our ZIP handler extension consists of four main components working together. The manifest file defines the extension's configuration, permissions, and entry points. Background service workers handle long-running tasks and coordinate between different parts of the extension. The popup interface provides quick access to compression and extraction features. Content scripts enable the extension to interact with ZIP files encountered during browsing.

This separation of concerns follows Chrome's extension development best practices. Service workers run in the background and can respond to events even when no popup is open. Content scripts inject into web pages to detect ZIP file links and downloads. The popup serves as the primary user interface for manual operations.

### Required Permissions

Our extension requires several permissions to function properly. The downloads permission allows saving extracted files and created archives to the user's filesystem. The storage permission enables persisting user preferences and recent operations. The scripting permission lets content scripts detect ZIP files on web pages. The activeTab permission provides context-aware functionality when users invoke the extension.

---

## Setting Up the Development Environment {#development-environment}

Let us begin by setting up the project structure and installing necessary dependencies.

### Creating the Project Structure

Create a new directory for your extension project and set up the following structure:

```text
zip-handler-extension/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content.js
├── lib/
│   └── jszip.min.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

This structure organizes files logically, with clear separation between the popup interface, background logic, and content scripts. The lib directory holds external dependencies like JSZip.

### Installing JSZip

Download the JSZip library from the official source or install it via npm if you prefer managing dependencies programmatically. For this tutorial, we will use the standalone minified version. Place the jszip.min.js file in the lib directory.

JSZip is a JavaScript library that reads and writes ZIP files purely in JavaScript. It works in browsers and Node.js environments, making it perfect for our extension. The library handles various ZIP formats and provides a straightforward API for reading archive contents and creating new archives.

---

## Writing the Manifest File {#manifest-file}

The manifest.json file is the foundation of every Chrome extension. It defines metadata, permissions, and the files that compose your extension.

```json
{
  "manifest_version": 3,
  "name": "ZIP Handler Pro",
  "version": "1.0.0",
  "description": "Compress and extract ZIP files directly in your browser",
  "permissions": [
    "downloads",
    "storage",
    "scripting",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest declares our extension as a Manifest V3 extension, specifies required permissions, configures the background service worker, and defines the popup interface. The host permissions allow the extension to work with files from any website.

---

## Building the Background Service Worker {#background-worker}

The background service worker handles the heavy lifting—processing ZIP files without blocking the user interface. It communicates with the popup and content scripts to coordinate operations.

```javascript
// background.js
import JSZip from './lib/jszip.min.js';

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractZip') {
    handleExtraction(message.data, sender.tab);
  } else if (message.action === 'createZip') {
    handleCompression(message.data, sender.tab);
  } else if (message.action === 'readZipContent') {
    readZipContent(message.data).then(sendResponse);
    return true;
  }
  return true;
});

// Extract files from a ZIP archive
async function handleExtraction(data, tab) {
  try {
    const { zipData, filename } = data;
    
    // Load the ZIP file
    const zip = await JSZip.loadAsync(zipData);
    
    // Get list of files in the archive
    const files = [];
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        files.push({
          name: zipEntry.name,
          size: zipEntry._data.uncompressedSize,
          path: relativePath
        });
      }
    });
    
    // Extract each file
    const extractedFiles = [];
    for (const file of files) {
      const zipEntry = zip.file(file.path);
      if (zipEntry) {
        const blob = await zipEntry.async('blob');
        const buffer = await blob.arrayBuffer();
        
        // Create a download for each file
        const downloadId = await chrome.downloads.download({
          url: URL.createObjectURL(new Blob([buffer])),
          filename: file.name,
          saveAs: false
        });
        
        extractedFiles.push({ name: file.name, downloadId });
      }
    }
    
    // Notify the content script of successful extraction
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'extractionComplete',
        files: extractedFiles
      });
    }
    
    return { success: true, files: extractedFiles };
  } catch (error) {
    console.error('Extraction error:', error);
    return { success: false, error: error.message };
  }
}

// Create a ZIP archive from files
async function handleCompression(data, tab) {
  try {
    const { files, archiveName } = data;
    
    // Create a new ZIP archive
    const zip = new JSZip();
    
    // Add each file to the archive
    for (const file of files) {
      const content = await file.arrayBuffer();
      zip.file(file.name, content);
    }
    
    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Download the archive
    const downloadId = await chrome.downloads.download({
      url: URL.createObjectURL(zipBlob),
      filename: archiveName || 'archive.zip',
      saveAs: true
    });
    
    return { success: true, downloadId };
  } catch (error) {
    console.error('Compression error:', error);
    return { success: false, error: error.message };
  }
}

// Read ZIP content without extracting
async function readZipContent(data) {
  try {
    const { zipData } = data;
    const zip = await JSZip.loadAsync(zipData);
    
    const files = [];
    zip.forEach((relativePath, zipEntry) => {
      files.push({
        name: zipEntry.name,
        path: relativePath,
        size: zipEntry._data?.uncompressedSize || 0,
        isDirectory: zipEntry.dir
      });
    });
    
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Handle file drops from the browser
chrome.downloads.onCreated.addListener((downloadItem) => {
  if (downloadItem.url.endsWith('.zip')) {
    // Could trigger automatic extraction or notify user
    console.log('ZIP file downloaded:', downloadItem.filename);
  }
});
```

This background worker provides three main functions: extracting ZIP archives, creating new ZIP archives, and reading archive contents. It uses JSZip to process the binary data and Chrome's Downloads API to save extracted files.

---

## Creating the Popup Interface {#popup-interface}

The popup provides the user interface for manual operations. Users can drag and drop files to compress them or select ZIP files to extract.

### Popup HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZIP Handler Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>ZIP Handler Pro</h1>
      <p class="subtitle">Compress & Extract Files</p>
    </header>
    
    <div class="tabs">
      <button class="tab active" data-tab="extract">Extract</button>
      <button class="tab" data-tab="compress">Compress</button>
    </div>
    
    <div class="tab-content active" id="extract-tab">
      <div class="drop-zone" id="extract-drop-zone">
        <div class="drop-icon">📦</div>
        <p>Drop ZIP file here</p>
        <span>or click to select</span>
        <input type="file" id="extract-input" accept=".zip" hidden>
      </div>
      <div class="file-info" id="extract-file-info" hidden>
        <h3>Archive Contents</h3>
        <ul id="file-list"></ul>
        <button class="btn primary" id="extract-btn">Extract All</button>
      </div>
    </div>
    
    <div class="tab-content" id="compress-tab">
      <div class="drop-zone" id="compress-drop-zone">
        <div class="drop-icon">📁</div>
        <p>Drop files to compress</p>
        <span>or click to select</span>
        <input type="file" id="compress-input" multiple hidden>
      </div>
      <div class="selected-files" id="selected-files" hidden>
        <h3>Selected Files</h3>
        <ul id="compress-file-list"></ul>
        <div class="archive-name">
          <label for="archive-name-input">Archive name:</label>
          <input type="text" id="archive-name-input" value="archive.zip">
        </div>
        <button class="btn primary" id="compress-btn">Create ZIP</button>
      </div>
    </div>
    
    <div class="status" id="status"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### Popup CSS

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  background: #f5f5f5;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
}

h1 {
  font-size: 18px;
  color: #333;
}

.subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tab.active {
  background: #4285f4;
  color: white;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.drop-zone:hover,
.drop-zone.dragover {
  border-color: #4285f4;
  background: #e8f0fe;
}

.drop-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.drop-zone p {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.drop-zone span {
  font-size: 12px;
  color: #666;
}

.file-info,
.selected-files {
  margin-top: 16px;
}

.file-info h3,
.selected-files h3 {
  font-size: 14px;
  margin-bottom: 8px;
}

#file-list,
#compress-file-list {
  list-style: none;
  max-height: 120px;
  overflow-y: auto;
  background: white;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 12px;
}

#file-list li,
#compress-file-list li {
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
}

#file-list li:last-child,
#compress-file-list li:last-child {
  border-bottom: none;
}

.archive-name {
  margin-bottom: 12px;
}

.archive-name label {
  font-size: 12px;
  display: block;
  margin-bottom: 4px;
}

.archive-name input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.primary {
  background: #4285f4;
  color: white;
}

.btn.primary:hover {
  background: #3367d6;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.status {
  margin-top: 12px;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
}

.status.success {
  background: #e6f4ea;
  color: #1e8e3e;
}

.status.error {
  background: #fce8e6;
  color: #d93025;
}
```

### Popup JavaScript

```javascript
// popup.js

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
  });
});

// Extract tab functionality
const extractDropZone = document.getElementById('extract-drop-zone');
const extractInput = document.getElementById('extract-input');

extractDropZone.addEventListener('click', () => extractInput.click());

extractDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  extractDropZone.classList.add('dragover');
});

extractDropZone.addEventListener('dragleave', () => {
  extractDropZone.classList.remove('dragover');
});

extractDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  extractDropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.zip')) {
    handleExtractFile(file);
  }
});

extractInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleExtractFile(file);
  }
});

async function handleExtractFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  
  // Send to background worker to read contents
  chrome.runtime.sendMessage({
    action: 'readZipContent',
    data: { zipData: arrayBuffer }
  }, (response) => {
    if (response.success) {
      displayZipContents(response.files);
    } else {
      showStatus(response.error, 'error');
    }
  });
}

function displayZipContents(files) {
  const fileList = document.getElementById('file-list');
  const fileInfo = document.getElementById('extract-file-info');
  
  fileList.innerHTML = '';
  files.forEach(file => {
    if (!file.isDirectory) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${file.name}</span><span>${formatSize(file.size)}</span>`;
      fileList.appendChild(li);
    }
  });
  
  fileInfo.hidden = false;
}

document.getElementById('extract-btn').addEventListener('click', async () => {
  const extractInput = document.getElementById('extract-input');
  const file = extractInput.files[0];
  
  if (!file) {
    showStatus('Please select a ZIP file first', 'error');
    return;
  }
  
  const arrayBuffer = await file.arrayBuffer();
  
  showStatus('Extracting files...', 'info');
  
  chrome.runtime.sendMessage({
    action: 'extractZip',
    data: { zipData: arrayBuffer, filename: file.name }
  }, (response) => {
    if (response.success) {
      showStatus(`Extracted ${response.files.length} files successfully!`, 'success');
    } else {
      showStatus(response.error, 'error');
    }
  });
});

// Compress tab functionality
const compressDropZone = document.getElementById('compress-drop-zone');
const compressInput = document.getElementById('compress-input');
let selectedFiles = [];

compressDropZone.addEventListener('click', () => compressInput.click());

compressDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  compressDropZone.classList.add('dragover');
});

compressDropZone.addEventListener('dragleave', () => {
  compressDropZone.classList.remove('dragover');
});

compressDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  compressDropZone.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files);
  handleCompressFiles(files);
});

compressInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  handleCompressFiles(files);
});

function handleCompressFiles(files) {
  selectedFiles = [...selectedFiles, ...files];
  displaySelectedFiles();
}

function displaySelectedFiles() {
  const fileList = document.getElementById('compress-file-list');
  const selectedContainer = document.getElementById('selected-files');
  
  fileList.innerHTML = '';
  selectedFiles.forEach(file => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${file.name}</span><span>${formatSize(file.size)}</span>`;
    fileList.appendChild(li);
  });
  
  selectedContainer.hidden = false;
}

document.getElementById('compress-btn').addEventListener('click', () => {
  if (selectedFiles.length === 0) {
    showStatus('Please select files to compress', 'error');
    return;
  }
  
  const archiveName = document.getElementById('archive-name-input').value || 'archive.zip';
  
  showStatus('Creating ZIP archive...', 'info');
  
  chrome.runtime.sendMessage({
    action: 'createZip',
    data: { files: selectedFiles, archiveName }
  }, (response) => {
    if (response.success) {
      showStatus('ZIP archive created successfully!', 'success');
      selectedFiles = [];
      displaySelectedFiles();
    } else {
      showStatus(response.error, 'error');
    }
  });
});

// Utility functions
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + type;
  status.hidden = false;
  
  if (type !== 'info') {
    setTimeout(() => {
      status.hidden = true;
    }, 5000);
  }
}
```

---

## Implementing Content Script {#content-script}

The content script detects ZIP files on web pages and provides contextual actions. When users encounter ZIP file links, the script can offer quick extraction options.

```javascript
// content.js

// Listen for messages from the background worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractionComplete') {
    // Show notification when extraction completes
    showNotification(`${message.files.length} files extracted successfully!`);
  }
});

// Detect ZIP file links on the page
function detectZipLinks() {
  const links = document.querySelectorAll('a[href$=".zip"]');
  
  links.forEach(link => {
    if (!link.dataset.zipHandlerInitialized) {
      link.dataset.zipHandlerInitialized = 'true';
      
      // Add context menu or visual indicator
      link.title = 'ZIP file - Click to download';
      
      // You could add a custom menu item or button here
      link.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Show custom context menu options
      });
    }
  });
}

// Show notification in the page
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4285f4;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectZipLinks);
} else {
  detectZipLinks();
}

// Observe for dynamically added links
const observer = new MutationObserver((mutations) => {
  detectZipLinks();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

---

## Testing Your Extension {#testing}

Before publishing, thoroughly test your extension to ensure all features work correctly.

### Loading the Extension

Open Chrome and navigate to chrome://extensions/. Enable Developer mode using the toggle in the top right corner. Click Load unpacked and select your extension directory. The extension icon should appear in your toolbar.

### Testing Extraction

Navigate to a website that offers ZIP file downloads. Click the extension icon and try extracting a test ZIP file. Verify that files are extracted to your downloads folder with correct names and content.

### Testing Compression

Open the extension popup, switch to the Compress tab, and select multiple files. Create a ZIP archive and verify that it downloads correctly. Open the downloaded ZIP to confirm all files are present and intact.

### Edge Cases

Test various edge cases: empty ZIP files, ZIP files with nested directories, large files exceeding browser memory limits, password-protected ZIP files (currently not supported), and corrupted ZIP files. Document any limitations clearly for users.

---

## Publishing Your Extension {#publishing}

Once testing is complete, you can publish your extension to the Chrome Web Store.

### Preparing for Release

Create your extension icons in the required sizes (16x16, 48x48, and 128x128 pixels). Update the manifest version number for release. Take screenshots and create a promotional video demonstrating the extension's features. Write a clear, keyword-rich description that explains what your extension does and why users should install it.

### Chrome Web Store Publication

Navigate to the Chrome Web Store Developer Dashboard and create a developer account if you do not already have one. Package your extension as a ZIP file using the Pack Extension feature in chrome://extensions/. Upload your packaged extension and complete the required information including name, description, and category. Submit for review—Google typically reviews submissions within a few hours to a few days.

---

## Advanced Features and Improvements {#advanced-features}

Consider adding these advanced features to make your extension stand out from competitors.

### Password Protection

Implement support for password-protected ZIP files using encryption libraries. This is a highly requested feature for users who need to secure their compressed files.

### Cloud Integration

Integrate with cloud storage services like Google Drive, Dropbox, and OneDrive. Users can extract files directly to cloud storage or compress cloud files without downloading them first.

### Preview Features

Add the ability to preview images, text files, and documents within a ZIP archive before extracting. This helps users find specific files in large archives without extracting everything.

### Batch Operations

Support batch extraction of multiple ZIP files simultaneously. Users often download several archives at once, and processing them individually is time-consuming.

---

## Conclusion {#conclusion}

Building a ZIP handler Chrome extension is an excellent project that teaches valuable skills in extension development while creating a genuinely useful tool. Throughout this guide, we have covered the complete development process from project setup to publishing.

You have learned how to structure a Chrome extension, implement background service workers for heavy processing, create intuitive user interfaces with the popup API, and detect ZIP files on web pages using content scripts. These skills transfer directly to other extension projects and general web development scenarios.

The extension we built provides essential ZIP handling capabilities: reading archive contents, extracting files to the user's downloads folder, and creating new ZIP archives from selected files. Users can now compress and extract files without leaving their browser, improving productivity and streamlining workflows.

As you continue development, consider adding password protection, cloud integration, and preview features to make your extension more competitive in the Chrome Web Store. With over 200,000 extensions available, differentiation through feature richness and user experience is crucial for success.

Start building your ZIP handler extension today and join the community of developers creating tools that millions of Chrome users rely on every day.
