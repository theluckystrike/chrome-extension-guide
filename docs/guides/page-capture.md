---
layout: default
title: "Chrome Extension Page Capture. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/page-capture/"
---
# Page Capture API Guide

Overview {#overview}

The `chrome.pageCapture` API enables Chrome extensions to save web pages as MHTML (MIME HTML) format. MHTML is a web page archive format that packages all resources (images, CSS, JavaScript) into a single file, making it ideal for offline viewing and archiving purposes.

- Requires `"pageCapture"` permission (cross-ref `docs/permissions/page-capture.md`)
- Saves pages as MHTML - a self-contained format that works offline
- Only works in extension context (background scripts, content scripts with proper messaging)
- Cannot be used directly from web pages - requires extension mediation

Permissions {#permissions}

Manifest Configuration {#manifest-configuration}

```json
{
  "name": "Page Capture Extension",
  "version": "1.0",
  "permissions": [
    "pageCapture",
    "downloads"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

Important Permission Notes {#important-permission-notes}

- The `pageCapture` permission is a "host permission" in Manifest V3 - it must be declared in `host_permissions` for full functionality
- You need `"<all_urls>"` or specific host patterns to capture pages from any website
- The `activeTab` permission can also be used for tab-specific capture without broad URL access
- Unlike some APIs, pageCapture does NOT require user gesture (click) to function

Saving Pages as MHTML {#saving-pages-as-mhtml}

The saveAsMHTML Method {#the-saveasmhtml-method}

```javascript
// Basic usage - capture a specific tab
function captureTab(tabId) {
  chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (mhtmlBlob) => {
    if (chrome.runtime.lastError) {
      console.error('Capture failed:', chrome.runtime.lastError);
      return;
    }
    
    // mhtmlBlob is a Blob object containing the MHTML data
    console.log('Captured MHTML, size:', mhtmlBlob.size);
  });
}

// Capture the active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    captureTab(tabs[0].id);
  }
});
```

Method Signature {#method-signature}

```typescript
chrome.pageCapture.saveAsMHTML(
  options: {
    tabId: number
  },
  callback: (blob: Blob) => void
)
```

- `tabId`: The ID of the tab to capture
- Returns: A Blob containing the MHTML content
- The MHTML follows RFC 2557 standard for MIME HTML documents

Blob Handling and Download Creation {#blob-handling-and-download-creation}

Converting Blob to Download {#converting-blob-to-download}

```javascript
// Complete example: capture and save
async function captureAndSave(tabId, filename) {
  return new Promise((resolve, reject) => {
    chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (mhtmlBlob) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      // Convert Blob to ArrayBuffer for Downloads API
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result;
        
        // Use chrome.downloads to save the file
        chrome.downloads.download({
          url: URL.createObjectURL(mhtmlBlob),
          filename: filename,
          saveAs: true,
          conflictAction: 'uniquify'
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(downloadId);
          }
        });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(mhtmlBlob);
    });
  });
}
```

Alternative: Using createObjectURL {#alternative-using-createobjecturl}

```javascript
// Simpler approach using URL.createObjectURL
chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (blob) => {
  const url = URL.createObjectURL(blob);
  
  // Create a link and click it to download
  const a = document.createElement('a');
  a.href = url;
  a.download = `page-${Date.now()}.mhtml`;
  a.click();
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
```

Handling Large Pages {#handling-large-pages}

```javascript
// Handle large MHTML files with streaming approach
function captureLargePage(tabId) {
  chrome.pageCapture.saveAsMHTML({ tabId: tabId }, async (blob) => {
    // Check blob size first
    console.log('MHTML size:', blob.size, 'bytes');
    
    if (blob.size > 50 * 1024 * 1024) { // 50MB limit
      console.warn('Large file - may take time to process');
    }
    
    // Process in chunks if needed
    const stream = blob.stream();
    const reader = stream.getReader();
    const chunks = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    console.log('Total processed:', totalSize, 'bytes');
  });
}
```

Use Cases {#use-cases}

Offline Reading {#offline-reading}

```javascript
// Save page for offline reading
function saveForOffline(tabId) {
  chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (blob) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Store in extension storage or file system
      chrome.storage.local.set({
        [`offline_${tabId}`]: {
          timestamp: Date.now(),
          content: reader.result
        }
      }, () => {
        console.log('Page saved for offline reading');
      });
    };
    reader.readAsDataURL(blob);
  });
}
```

Archiving {#archiving}

```javascript
// Automatic page archiver
class PageArchiver {
  constructor() {
    this.archivedUrls = new Set();
  }
  
  async archiveTab(tabId, url) {
    // Check if already archived
    if (this.archivedUrls.has(url)) {
      console.log('Already archived:', url);
      return;
    }
    
    // Capture the page
    chrome.pageCapture.saveAsMHTML({ tabId: tabId }, async (blob) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `archive/${this.sanitizeFilename(url)}-${timestamp}.mhtml`;
      
      try {
        const downloadId = await chrome.downloads.download({
          url: URL.createObjectURL(blob),
          filename: filename,
          saveAs: false
        });
        
        this.archivedUrls.add(url);
        console.log('Archived:', url, 'as', filename);
      } catch (error) {
        console.error('Archive failed:', error);
      }
    });
  }
  
  sanitizeFilename(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 100);
    } catch {
      return 'unknown';
    }
  }
}
```

Evidence Collection {#evidence-collection}

```javascript
// Evidence collection for compliance/legal purposes
class EvidenceCollector {
  constructor(caseId) {
    this.caseId = caseId;
    this.evidence = [];
  }
  
  collectEvidence(tabId, url, notes = '') {
    return new Promise((resolve) => {
      chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (blob) => {
        const evidenceRecord = {
          id: this.generateId(),
          caseId: this.caseId,
          url: url,
          capturedAt: new Date().toISOString(),
          notes: notes,
          hash: null, // Would compute SHA-256 hash here
          size: blob.size
        };
        
        // Save with metadata
        this.saveEvidence(evidenceRecord, blob).then(() => {
          this.evidence.push(evidenceRecord);
          resolve(evidenceRecord);
        });
      });
    });
  }
  
  async saveEvidence(metadata, blob) {
    const filename = `evidence/${this.caseId}/${metadata.id}.mhtml`;
    
    await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: filename,
      saveAs: false
    });
    
    // Save metadata separately
    await chrome.storage.local.set({
      [`evidence_${metadata.id}`]: metadata
    });
  }
  
  generateId() {
    return `EV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

Combining with chrome.downloads {#combining-with-chromedownloads}

Complete Workflow Example {#complete-workflow-example}

```javascript
// Full-featured page saver with progress tracking
class PageSaver {
  constructor() {
    this.downloads = new Map();
    this.setupListeners();
  }
  
  setupListeners() {
    // Track download progress
    chrome.downloads.onCreated.addListener((downloadItem) => {
      console.log('Download started:', downloadItem.id);
      this.downloads.set(downloadItem.id, downloadItem);
    });
    
    chrome.downloads.onChanged.addListener((downloadDelta) => {
      if (downloadDelta.state) {
        console.log('Download state:', downloadDelta.state.current);
        
        if (downloadDelta.state.current === 'complete') {
          this.onDownloadComplete(downloadDelta.id);
        } else if (downloadDelta.state.current === 'interrupted') {
          this.onDownloadError(downloadDelta.id, 'Download interrupted');
        }
      }
    });
    
    chrome.downloads.onErased.addListener((downloadId) => {
      this.downloads.delete(downloadId);
    });
  }
  
  async savePage(tabId, options = {}) {
    const {
      filename = 'captured-page.mhtml',
      saveAs = true,
      autoRename = true
    } = options;
    
    // Step 1: Capture the page
    const blob = await this.captureMHTML(tabId);
    
    // Step 2: Create download
    const downloadId = await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: filename,
      saveAs: saveAs,
      conflictAction: autoRename ? 'uniquify' : 'overwrite'
    });
    
    return downloadId;
  }
  
  captureMHTML(tabId) {
    return new Promise((resolve, reject) => {
      chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (blob) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(blob);
        }
      });
    });
  }
  
  onDownloadComplete(downloadId) {
    console.log('Download complete:', downloadId);
    this.downloads.get(downloadId);
  }
  
  onDownloadError(downloadId, error) {
    console.error('Download error:', downloadId, error);
  }
}
```

Batch Capture {#batch-capture}

```javascript
// Capture multiple tabs
async function captureAllTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  const results = await Promise.allSettled(
    tabs.map(async (tab, index) => {
      const blob = await captureMHTML(tab.id);
      
      return chrome.downloads.download({
        url: URL.createObjectURL(blob),
        filename: `batch/${tab.title.substring(0, 50)}.mhtml`,
        saveAs: false
      });
    })
  );
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`Captured tab ${index}: ${tabs[index].title}`);
    } else {
      console.error(`Failed to capture tab ${index}:`, result.reason);
    }
  });
}
```

Content Security and Cross-Origin Considerations {#content-security-and-cross-origin-considerations}

MHTML Security Model {#mhtml-security-model}

```javascript
// Understanding MHTML limitations
function captureConsiderations(tabId, url) {
  // MHTML has same-origin restrictions
  // Cross-origin resources may not be embedded properly
  
  chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (blob) => {
    // Some resources may be blocked due to CSP
    // Images from other domains might not load
    // Fonts and scripts may be restricted
    
    console.log('Captured blob size:', blob.size);
    // Note: This is the raw MHTML, not a processed version
  });
}
```

Working Around Restrictions {#working-around-restrictions}

```javascript
// Use content script to capture with modifications
// manifest.json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content-script.js"]
  }]
}

// content-script.js - run at document_idle
function getPageHTML() {
  // Clone the document
  const docClone = document.cloneNode(true);
  
  // Convert to string (includes all inline content)
  const html = docClone.documentElement.outerHTML;
  
  // Note: This doesn't capture external resources
  // For full capture, use pageCapture from background
}

// Better approach: Inject styles to handle cross-origin images
function enhanceMHTMLCapture(tabId) {
  // First, inject a content script to prepare the page
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      // Make images work with data URLs if possible
      document.querySelectorAll('img').forEach(img => {
        // Store original src for reference
        img.dataset.originalSrc = img.src;
      });
    }
  }, () => {
    // Then capture
    chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (blob) => {
      // Process the blob
    });
  });
}
```

CSP Considerations {#csp-considerations}

```javascript
// Handle Content Security Policy restrictions
function captureWithCSPWorkaround(tabId) {
  // pageCapture itself bypasses some CSP restrictions
  // but the resulting MHTML might not render properly
  
  chrome.pageCapture.saveAsMHTML({ tabId: tabId }, async (blob) => {
    // Read the MHTML content
    const text = await blob.text();
    
    // Analyze embedded resources
    const hasExternalResources = text.includes('src="http');
    const hasInlineScripts = text.includes('<script');
    
    console.log({
      hasExternalResources,
      hasInlineScripts,
      totalSize: text.length
    });
  });
}
```

Privacy and Data Handling {#privacy-and-data-handling}

```javascript
// Secure handling of captured content
class SecurePageCapture {
  constructor() {
    this.encryptionKey = null; // Would use proper key management
  }
  
  async secureCapture(tabId, url) {
    // Capture the page
    const blob = await this.captureMHTML(tabId);
    const arrayBuffer = await blob.arrayBuffer();
    
    // In production, encrypt before storage
    // const encrypted = await this.encrypt(arrayBuffer);
    
    // Store securely
    await chrome.storage.session.set({
      [`capture_${Date.now()}`]: {
        url: url,
        timestamp: Date.now(),
        // encrypted: encrypted, // Would store encrypted data
        size: blob.size
      }
    });
    
    // Clear blob from memory when done
    blob.close?.();
  }
  
  // Clean up temporary data
  cleanup() {
    chrome.storage.local.get(null, (items) => {
      const captures = Object.keys(items).filter(k => k.startsWith('capture_'));
      captures.forEach(key => {
        chrome.storage.local.remove(key);
      });
    });
  }
}
```

Code Examples {#code-examples}

Complete Extension Example {#complete-extension-example}

```javascript
// background.js - Main extension logic

// Handle toolbar icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const blob = await saveTabAsMHTML(tab.id);
    await downloadBlob(blob, `${getFilename(tab.url)}.mhtml`);
    showNotification('Page captured successfully!');
  } catch (error) {
    showNotification('Capture failed: ' + error.message, 'error');
  }
});

// Capture tab as MHTML
function saveTabAsMHTML(tabId) {
  return new Promise((resolve, reject) => {
    chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (blob) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(blob);
      }
    });
  });
}

// Download the captured MHTML
function downloadBlob(blob, filename) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      URL.revokeObjectURL(url);
      
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(downloadId);
      }
    });
  });
}

// Generate filename from URL
function getFilename(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.split('/').filter(Boolean).join('-') || 'index';
    const sanitized = path.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 100);
    return `${urlObj.hostname}_${sanitized}`;
  } catch {
    return `page_${Date.now()}`;
  }
}

// Show notification
function showNotification(message, type = 'success') {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: type === 'success' ? 'Page Capture' : 'Error',
    message: message
  });
}
```

Keyboard Shortcut Handler {#keyboard-shortcut-handler}

```javascript
// commands.json
{
  "commands": {
    "capture-page": {
      "suggested_key": "Ctrl+Shift+S",
      "description": "Capture current page as MHTML"
    }
  }
}

// background.js - Command listener
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'capture-page') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // Execute capture
      await handleCapture(tab);
    }
  }
});
```

Context Menu Integration {#context-menu-integration}

```javascript
// Create context menu for page capture
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-page',
    title: 'Save as MHTML',
    contexts: ['page', 'link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'capture-page') {
    const targetTabId = info.linkUrl 
      ? await openLinkAsTab(info.linkUrl)
      : tab.id;
    
    if (targetTabId) {
      await captureAndDownload(targetTabId);
    }
  }
});

async function openLinkAsTab(url) {
  const [tab] = await chrome.tabs.create({ url, active: false });
  // Wait for page to load
  await new Promise(resolve => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(tabId);
      }
    });
  });
  return tab.id;
}
```

Popup Interface {#popup-interface}

```javascript
// popup.js - When user clicks extension icon
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  document.getElementById('url').textContent = tab.url;
  document.getElementById('title').textContent = tab.title;
  
  document.getElementById('capture-btn').addEventListener('click', async () => {
    const filename = document.getElementById('filename').value || 
      `${tab.title}.mhtml`;
    
    try {
      const blob = await captureMHTML(tab.id);
      await downloadBlob(blob, filename);
      window.close();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });
});

function captureMHTML(tabId) {
  return new Promise((resolve, reject) => {
    chrome.pageCapture.saveAsMHTML({ tabId: tabId }, (blob) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(blob);
      }
    });
  });
}

function downloadBlob(blob, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(downloadId);
      }
    });
  });
}
```

Best Practices {#best-practices}

1. Always handle errors - Check `chrome.runtime.lastError` in callbacks
2. Use async/await - Wrap callbacks in Promises for cleaner code
3. Clean up object URLs - Call `URL.revokeObjectURL()` after downloads complete
4. Consider file sizes - Large MHTML files can impact storage and performance
5. Test cross-origin scenarios - Not all pages capture equally
6. Respect user privacy - Only capture pages with appropriate permissions
7. Provide feedback - Use notifications to inform users of capture status

Related APIs {#related-apis}

- `chrome.downloads` - For saving the captured MHTML files
- `chrome.tabs` - For getting tab information and managing captures
- `chrome.scripting` - For injecting scripts to modify page capture behavior
- `chrome.notifications` - For user feedback during capture process
- `chrome.contextMenus` - For adding capture options to right-click menu
- `chrome.commands` - For keyboard shortcuts to trigger capture

Related Articles {#related-articles}

- [Downloads Management](./downloads-management.md)
- [Desktop Capture](./desktop-capture.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
