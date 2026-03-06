# Chrome Extension Page Capture API

The Chrome Extension Page Capture API provides powerful capabilities for saving web pages locally in MHTML format. This guide explores how to use the chrome.pageCapture API to create extensions that can archive web pages for offline reading, implement bookmark-like functionality, or build content backup tools.

## Overview of chrome.pageCapture

The chrome.pageCapture API allows extensions to capture the contents of a tab and save them as a MHTML (MIME HTML) file. MHTML is a web page archive format that bundles all resources (images, CSS, JavaScript) into a single file, making it perfect for offline storage and sharing.

### Key Features

- **Single File Storage**: All page resources are embedded in one MHTML file
- **Self-Contained**: No external dependencies when viewing offline
- **Faithful Reproduction**: Preserves the visual appearance of the original page
- **Simple Integration**: Works seamlessly with other Chrome APIs

### Permissions Required

To use the pageCapture API, you need to declare the `"pageCapture"` permission in your extension's manifest:

```json
{
  "name": "Page Capture Extension",
  "version": "1.0.0",
  "permissions": [
    "pageCapture"
  ],
  "manifest_version": 3
}
```

The `"pageCapture"` permission is required to use the API. The `"tabs"` permission is not needed for `saveAsMHTML()` itself, but you may need it if you want to access `tab.url` or `tab.title` properties for other purposes.

## Understanding MHTML Format

MHTML (MIME HTML) is specified in RFC 2557 and provides a way to combine multiple resources (HTML, images, CSS, JavaScript) into a single file. The format uses MIME multipart messages to embed resources.

### MHTML Structure

An MHTML file has the following structure:

```
MIME-Version: 1.0
Content-Type: multipart/related; boundary=----boundary

------boundary
Content-Type: text/html
Content-Location: https://example.com/page.html

<!DOCTYPE html>
<html>
<head>
  <title>Example Page</title>
</head>
<body>
  <p>Page content here</p>
</body>
</html>

------boundary
Content-Type: image/png
Content-Location: https://example.com/image.png

[Base64 encoded image data]
------boundary--
```

### Advantages for Extension Development

1. **Offline Access**: Users can view captured pages without internet
2. **Portability**: Single file can be shared via email or cloud storage
3. **Preservation**: Captures dynamic content at a point in time
4. **Storage Efficiency**: Compression reduces overall file size

## Capturing a Page

The primary method in the pageCapture API is `saveAsMHTML()`, which captures a tab's content and saves it as an MHTML blob.

### Basic Capture Implementation

```javascript
// background.js (Service Worker)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Capture the page
    const mhtmlBlob = await chrome.pageCapture.saveAsMHTML({
      tabId: tab.id
    });

    // Convert blob to ArrayBuffer for processing
    const arrayBuffer = await mhtmlBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Generate filename from tab title and URL
    const filename = generateFilename(tab.title);

    // Use downloads API to save the file
    await chrome.downloads.download({
      url: blobToDataURL(mhtmlBlob, uint8Array),
      filename: `captures/${filename}.mhtml`,
      saveAs: true
    });

    console.log('Page captured successfully');
  } catch (error) {
    console.error('Failed to capture page:', error);
  }
});

// Helper function to convert blob to data URL
function blobToDataURL(blob, uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return 'data:application/x-mimearchive;base64,' + btoa(binary);
}

// Generate safe filename from title
function generateFilename(title) {
  return title
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50);
}
```

### Handling Large Pages

For pages with many resources, you may want to show progress or handle memory efficiently:

```javascript
// background.js
async function capturePageWithProgress(tabId) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get tab info for progress tracking
      const tab = await chrome.tabs.get(tabId);

      console.log(`Capturing: ${tab.title}`);

      const mhtmlBlob = await chrome.pageCapture.saveAsMHTML({
        tabId: tabId
      });

      const size = mhtmlBlob.size;
      console.log(`Captured ${size.toLocaleString()} bytes`);

      if (size > 10 * 1024 * 1024) {
        console.warn('Large page captured - may take time to save');
      }

      resolve({ blob: mhtmlBlob, tab: tab, size: size });
    } catch (error) {
      reject(error);
    }
  });
}
```

## Integration with Downloads API

The pageCapture API returns a Blob, which you can save using the downloads API or convert to other formats.

### Saving with Downloads API

```javascript
// background.js
async function saveMHTML(blob, suggestedName) {
  // Create a unique filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `captures/${suggestedName}_${timestamp}.mhtml`;

  // Convert blob to data URL
  const dataUrl = await blobToDataUrl(blob);

  // Trigger download
  const downloadId = await chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: true,
    conflictAction: 'uniquify'
  });

  return downloadId;
}

// Convert Blob to data URL
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### Listening for Download Events

```javascript
// background.js
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state) {
    if (downloadDelta.state.current === 'complete') {
      console.log(`Download completed: ${downloadDelta.id}`);
    } else if (downloadDelta.state.current === 'interrupted') {
      console.error(`Download interrupted: ${downloadDelta.id}`);
    }
  }
});

chrome.downloads.onErased.addListener((downloadId) => {
  console.log(`Download erased: ${downloadId}`);
});
```

## Building a Complete Page Capture Extension

Here's a more complete implementation showing best practices:

### Manifest (manifest.json)

```json
{
  "name": "Page Saver",
  "version": "1.0.0",
  "description": "Capture and save web pages as MHTML for offline reading",
  "permissions": [
    "pageCapture",
    "tabs",
    "downloads",
    "storage"
  ],
  "action": {
    "default_title": "Save this page"
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "manifest_version": 3
}
```

### Background Script (background.js)

```javascript
// Store captured pages metadata
const STORAGE_KEY = 'captured_pages';

// Handle toolbar icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const result = await captureAndSavePage(tab);
    await updateStorage(result);
    showNotification('Page Saved', `Saved: ${tab.title}`);
  } catch (error) {
    console.error('Capture failed:', error);
    showNotification('Capture Failed', error.message);
  }
});

// Main capture function
async function captureAndSavePage(tab) {
  // Capture the page
  const mhtmlBlob = await chrome.pageCapture.saveAsMHTML({
    tabId: tab.id
  });

  // Get page info
  const tabInfo = await chrome.tabs.get(tab.id);

  // Generate filename
  const filename = generateSafeFilename(tabInfo.title);

  // Save using downloads API
  const downloadId = await saveToDownloads(mhtmlBlob, filename);

  // Return metadata
  return {
    id: downloadId,
    url: tabInfo.url,
    title: tabInfo.title,
    capturedAt: new Date().toISOString(),
    filename: `${filename}.mhtml`,
    size: mhtmlBlob.size
  };
}

// Save blob to downloads
async function saveToDownloads(blob, filename) {
  const dataUrl = await blobToDataUrl(blob);

  return await chrome.downloads.download({
    url: dataUrl,
    filename: `PageSaver/${filename}.mhtml`,
    saveAs: true,
    conflictAction: 'uniquify'
  });
}

// Update storage with capture metadata
async function updateStorage(result) {
  const { captured_pages: existing = [] } = await chrome.storage.local.get(
    STORAGE_KEY
  );

  const updated = [result, ...existing].slice(0, 100); // Keep last 100

  await chrome.storage.local.set({
    [STORAGE_KEY]: updated
  });
}

// Generate safe filename
function generateSafeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60)
    .toLowerCase();
}

// Convert blob to data URL
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message
  });
}
```

### Popup UI (popup.html)

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 300px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    h2 { margin-top: 0; }
    .recent-captures {
      max-height: 200px;
      overflow-y: auto;
    }
    .capture-item {
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
    .capture-item:last-child { border-bottom: none; }
    .capture-title {
      font-weight: 600;
      font-size: 14px;
    }
    .capture-meta {
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <h2>📄 Page Saver</h2>
  <p>Click the toolbar icon to save any page as MHTML.</p>
  <h3>Recent Captures</h3>
  <div class="recent-captures" id="captures"></div>
  <script src="popup.js"></script>
</body>
</html>
```

### Popup Script (popup.js)

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const { captured_pages: captures } = await chrome.storage.local.get(
    'captured_pages'
  );

  const container = document.getElementById('captures');

  if (!captures || captures.length === 0) {
    container.innerHTML = '<p>No captures yet</p>';
    return;
  }

  container.innerHTML = captures.slice(0, 10).map(capture => `
    <div class="capture-item">
      <div class="capture-title">${escapeHtml(capture.title)}</div>
      <div class="capture-meta">
        ${new Date(capture.capturedAt).toLocaleDateString()} •
        ${formatBytes(capture.size)}
      </div>
    </div>
  `).join('');
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
```

## Use Cases and Applications

### 1. Offline Reading Archive

Build an extension that allows users to save articles for later offline reading:

```javascript
// Capture and organize by domain
async function captureForOfflineReading(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const domain = new URL(tab.url).hostname;

  const mhtmlBlob = await chrome.pageCapture.saveAsMHTML({
    tabId: tabId
  });

  const dataUrl = await blobToDataUrl(mhtmlBlob);
  const filename = `${domain}/${generateFilename(tab.title)}.mhtml`;

  await chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: false
  });
}
```

### 2. Bookmark Backup System

Create automatic backups of bookmarked pages:

```javascript
// Backup all bookmarks
async function backupBookmarks() {
  const bookmarks = await chrome.bookmarks.getTree();

  async function processNode(node) {
    if (node.children) {
      for (const child of node.children) {
        await processNode(child);
      }
    } else if (node.url) {
      // Find tab with this URL and capture
      const tabs = await chrome.tabs.query({ url: node.url });
      if (tabs[0]) {
        await capturePage(tabs[0].id, node.title);
      }
    }
  }

  await processNode(bookmarks[0]);
}
```

### 3. Research Collection Tool

For researchers collecting web sources:

```javascript
// Add metadata to captured pages
async function captureWithMetadata(tabId, tags = []) {
  const tab = await chrome.tabs.get(tabId);
  const mhtmlBlob = await chrome.pageCapture.saveAsMHTML({
    tabId: tabId
  });

  const metadata = {
    url: tab.url,
    title: tab.title,
    capturedAt: new Date().toISOString(),
    tags: tags,
    notes: ''
  };

  // Save both MHTML and metadata
  await saveWithMetadata(mhtmlBlob, metadata);
}
```

## Best Practices

### 1. Handle Large Pages Efficiently

```javascript
// Check page size before capture
async function canCaptureTab(tabId) {
  const tab = await chrome.tabs.get(tabId);

  // Skip file:// URLs
  if (tab.url.startsWith('file://')) {
    throw new Error('Cannot capture file:// URLs');
  }

  // Skip chrome:// URLs
  if (tab.url.startsWith('chrome://')) {
    throw new Error('Cannot capture Chrome internal pages');
  }

  return true;
}
```

### 2. User Experience Considerations

```javascript
// Show progress for large captures
async function captureWithProgress(tabId) {
  const tab = await chrome.tabs.get(tabId);

  // Update badge to show activity
  chrome.action.setBadgeText({ tabId: tabId, text: '...' });
  chrome.action.setBadgeBackgroundColor({
    tabId: tabId,
    color: '#FFA500'
  });

  try {
    const blob = await chrome.pageCapture.saveAsMHTML({ tabId });

    chrome.action.setBadgeText({ tabId: tabId, text: '✓' });
    chrome.action.setBadgeBackgroundColor({
      tabId: tabId,
      color: '#4CAF50'
    });

    return blob;
  } catch (error) {
    chrome.action.setBadgeText({ tabId: tabId, text: '!' });
    chrome.action.setBadgeBackgroundColor({
      tabId: tabId,
      color: '#F44336'
    });
    throw error;
  }
}
```

### 3. Error Handling

```javascript
// Comprehensive error handling
async function safeCapture(tabId) {
  try {
    // Validate tab exists
    const tab = await chrome.tabs.get(tabId);

    // Check URL scheme
    if (!tab.url.startsWith('http://') &&
        !tab.url.startsWith('https://')) {
      throw new Error('Only http:// and https:// pages can be captured');
    }

    // Attempt capture
    return await chrome.pageCapture.saveAsMHTML({ tabId });

  } catch (error) {
    if (error.message.includes('No tab with id')) {
      throw new Error('Tab no longer exists');
    }
    if (error.message.includes('Extension has not been granted')) {
      throw new Error('Permission denied');
    }
    throw error;
  }
}
```

## Limitations and Considerations

### What Works Well

- Static content preservation
- Single-page applications (SPAs)
- Pages with embedded images and CSS
- Offline archiving for personal use
- Research and documentation

### Limitations

- **Dynamic Content**: Content loaded via JavaScript after page load may not be captured
- **Authentication**: Protected pages require login before capture
- **Cross-Origin**: Some resources may be blocked due to CORS
- **Large Files**: Very large pages can create unwieldy MHTML files
- **Playback**: Dynamic media (video/audio) may not playback from MHTML

### Alternatives to Consider

For certain use cases, other APIs might be more appropriate:

- **chrome.tabCapture**: For audio/video content
- **chrome.debugger** with `Page.printToPDF`: For PDF output (via Chrome DevTools Protocol)
- **chrome.devtools.inspectedWindow**: For developer-focused saving

## Conclusion

The chrome.pageCapture API provides a straightforward way to save web pages for offline use, archiving, and backup purposes. By combining it with other Chrome APIs like downloads and storage, you can build powerful extensions for capturing and organizing web content.

Key takeaways:
- Use `"pageCapture"` permission in manifest
- The `saveAsMHTML()` method returns a Blob
- Combine with downloads API for file saving
- Handle errors gracefully for better UX
- Consider the limitations for dynamic content

With these patterns, you can create extensions that help users build personal archives, save research materials, or capture web content for offline reading.
