---
layout: default
title: "Chrome Extension First Extension — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Building Your First Chrome Extension

A complete beginner's guide to creating your first Chrome extension from scratch.

## Prerequisites

Before starting, ensure you have:
- Basic knowledge of HTML, CSS, and JavaScript
- Google Chrome browser installed
- A text editor (VS Code, Sublime Text, etc.)

## Step 1: Create Project Directory

Create a new folder for your extension project:

```bash
mkdir my-first-extension
cd my-first-extension
```

This folder will contain all your extension files.

## Step 2: Create manifest.json

The manifest.json is the heart of every Chrome extension. It tells Chrome about your extension's capabilities.

Create a file named `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My First Extension",
  "version": "1.0",
  "description": "A beginner's first Chrome extension",
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```

### Understanding Manifest Fields

| Field | Description |
|-------|-------------|
| `manifest_version` | Always use 3 for new extensions (MV3) |
| `name` | Display name shown in Chrome |
| `version` | Your extension version (e.g., "1.0") |
| `description` | Brief description of functionality |
| `action` | Defines the extension icon and popup |

## Step 3: Create popup.html

The popup is the UI that appears when clicking the extension icon.

Create `popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <h1>Hello, World!</h1>
  <button id="actionBtn">Click Me</button>
  <p id="counter">Clicks: 0</p>
  <script src="popup.js"></script>
</body>
</html>
```

## Step 4: Add popup.js

Create `popup.js` to add interactivity:

```javascript
let count = 0;
const button = document.getElementById('actionBtn');
const counter = document.getElementById('counter');

button.addEventListener('click', () => {
  count++;
  counter.textContent = `Clicks: ${count}`;
  
  // Store count in localStorage
  chrome.storage.local.set({ clickCount: count });
});
```

## Step 5: Add popup.css

Style your popup with `popup.css`:

```css
body {
  width: 300px;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #333;
  margin-top: 0;
}

button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 4px;
}

button:hover {
  background: #45a049;
}

#counter {
  margin-top: 15px;
  font-size: 18px;
}
```

## Step 6: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select your extension folder

Your extension should now appear in the toolbar!

## Step 7: Test and Iterate

To update your extension after changes:
1. Make changes to your files
2. Return to `chrome://extensions`
3. Click the **Reload** button on your extension

Your changes will reflect immediately.

## Step 8: Add an Icon

Icons are required for the Chrome Web Store. Create PNG images at these sizes:
- 16x16 px (toolbar)
- 32x32 px
- 48x48 px
- 128x128 px

Place them in your extension folder and update manifest.json:

```json
"icons": {
  "16": "icon16.png",
  "32": "icon32.png",
  "48": "icon48.png",
  "128": "icon128.png"
}
```

## Step 9: Add a Content Script

Content scripts run on web pages. Add to manifest.json:

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }
]
```

Create `content.js`:

```javascript
console.log('Content script loaded!');
document.body.style.border = '5px solid #4CAF50';
```

## Step 10: Add Background Service Worker

Service workers handle events even when the popup is closed. Add to manifest.json:

```json
"background": {
  "service_worker": "background.js"
}
```

Create `background.js`:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed!');
});
```

## Debugging Tips

- **Popup**: Right-click extension icon → Inspect Popup
- **Service Worker**: chrome://extensions → click "service worker" link
- **Content Scripts**: Open DevTools on any page, check Console

## Common Beginner Mistakes

1. **Forgetting manifest_version**: Always use 3 for new extensions
2. **Invalid JSON**: Use a JSON validator for manifest.json
3. **File path errors**: Ensure file paths in manifest match actual locations
4. **Missing permissions**: Request only what you need

## Next Steps

- Explore Chrome's [Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- Read the [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- Experiment with different extension types

## Related Guides

- [Manifest JSON Reference](./manifest-json-reference.md)
- [Debugging Extensions](./debugging-extensions.md)
- [Extension Architecture](./extension-architecture.md)

## Related Articles

- [Project Structure](../guides/chrome-extension-project-structure.md)
- [Manifest Reference](../guides/manifest-json-reference.md)
