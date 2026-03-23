---
layout: default
title: "Chrome Extension Local File Access — Best Practices"
description: "Access local files from Chrome extensions."
canonical_url: "https://bestchromeextensions.com/patterns/local-file-access/"
---

# Local File Access Patterns in Chrome Extensions

This guide covers various methods for working with local files in Chrome extensions, from simple file input to advanced filesystem APIs.

## File System Access API {#file-system-access-api}

The File System Access API provides powerful file picker dialogs in extension pages (not content scripts).

```javascript
// Opening a file with showOpenFilePicker
async function openFile() {
  const [fileHandle] = await window.showOpenFilePicker({
    types: [{
      description: 'Text Files',
      accept: { 'text/plain': ['.txt', '.csv', '.json'] }
    }],
    multiple: false
  });
  const file = await fileHandle.getFile();
  return file;
}
```

## Traditional File Input {#traditional-file-input}

Use `<input type="file">` in popup or options pages for simpler file selection:

```html
<input type="file" id="fileInput" accept=".csv,.json">
<script>
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const content = await file.text();
  console.log(content);
});
</script>
```

## Reading Files with FileReader API {#reading-files-with-filereader-api}

```javascript
// Read as text
const reader = new FileReader();
reader.readAsText(file);
reader.onload = () => console.log(reader.result);

// Read as data URL (for images)
reader.readAsDataURL(file);

// Read as ArrayBuffer (for binary data)
reader.readAsArrayBuffer(file);
```

## Drag and Drop {#drag-and-drop}

Enable drag-and-drop file handling in extension pages:

```javascript
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', (e) => e.preventDefault());
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  // Process the dropped file
});
```

## Downloading/Saving Files {#downloadingsaving-files}

### Using chrome.downloads API (requires permissions) {#using-chromedownloads-api-requires-permissions}

```javascript
chrome.downloads.download({
  url: 'data:text/plain,Hello World',
  filename: 'output.txt'
});
```

### Using Blob URLs {#using-blob-urls}

```javascript
const blob = new Blob(['Hello World'], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'file.txt';
a.click();
URL.revokeObjectURL(url);
```

### Using Data URLs {#using-data-urls}

```javascript
const dataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
chrome.downloads.download({ url: dataUrl, filename: 'decoded.txt' });
```

## File Type Validation {#file-type-validation}

Always validate file types for security:

```javascript
function validateFile(file, allowedTypes) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowedTypes.includes(ext)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }
  return true;
}
```

## Processing Large Files {#processing-large-files}

Use streaming for files larger than available memory:

```javascript
async function streamReadFile(file) {
  const stream = file.stream();
  const reader = stream.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Process chunk (value is Uint8Array)
    processChunk(value);
  }
}
```

## Origin Private File System (OPFS) {#origin-private-file-system-opfs}

Store extension-local data using OPFS:

```javascript
async function writeToOPFS(filename, content) {
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}
```

## Temporary Files with createObjectURL {#temporary-files-with-createobjecturl}

```javascript
// Create temporary URL for a Blob
const tempUrl = URL.createObjectURL(blob);
// Use in <img src>, <a href>, etc.
// Remember to revoke when done
URL.revokeObjectURL(tempUrl);
```

## Limitations {#limitations}

- **Content scripts**: Cannot use File System Access API directly; must communicate with background script
- **file:// URLs**: Require explicit user permission; not accessible by default
- **Permissions**: `activeTab` or specific host permissions needed for some operations

## Related Documentation {#related-documentation}

- [Downloads API Reference](../api-reference/downloads-api.md)
- [Native Messaging Patterns](./native-messaging.md)
- [Extension Backup & Restore Guide](../guides/extension-backup-restore.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
