---
layout: default
title: "Chrome Extension First Extension — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-first-extension/"
---
# Building Your First Chrome Extension

A complete beginner's guide to creating your first Chrome extension from scratch.

## Prerequisites {#prerequisites}

Before starting, ensure you have:
- Basic knowledge of HTML, CSS, and JavaScript
- Google Chrome browser installed
- A text editor (VS Code, Sublime Text, etc.)

## Step 1: Create Project Directory {#step-1-create-project-directory}

Create a new folder for your extension project:

```bash
mkdir my-first-extension
cd my-first-extension
```

This folder will contain all your extension files.

## Step 2: Create manifest.json {#step-2-create-manifestjson}

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

### Understanding Manifest Fields {#understanding-manifest-fields}

| Field | Description |
|-------|-------------|
| `manifest_version` | Always use 3 for new extensions (MV3) |
| `name` | Display name shown in Chrome |
| `version` | Your extension version (e.g., "1.0") |
| `description` | Brief description of functionality |
| `action` | Defines the extension icon and popup |

## Step 3: Create popup.html {#step-3-create-popuphtml}

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

## Step 4: Add popup.js {#step-4-add-popupjs}

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

## Step 5: Add popup.css {#step-5-add-popupcss}

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

## Step 6: Load Extension in Chrome {#step-6-load-extension-in-chrome}

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select your extension folder

Your extension should now appear in the toolbar!

## Step 7: Test and Iterate {#step-7-test-and-iterate}

To update your extension after changes:
1. Make changes to your files
2. Return to `chrome://extensions`
3. Click the **Reload** button on your extension

Your changes will reflect immediately.

## Step 8: Add an Icon {#step-8-add-an-icon}

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

## Step 9: Add a Content Script {#step-9-add-a-content-script}

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

## Step 10: Add Background Service Worker {#step-10-add-background-service-worker}

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

## Debugging Tips {#debugging-tips}

- **Popup**: Right-click extension icon → Inspect Popup
- **Service Worker**: chrome://extensions → click "service worker" link
- **Content Scripts**: Open DevTools on any page, check Console

## Common Beginner Mistakes {#common-beginner-mistakes}

1. **Forgetting manifest_version**: Always use 3 for new extensions
2. **Invalid JSON**: Use a JSON validator for manifest.json
3. **File path errors**: Ensure file paths in manifest match actual locations
4. **Missing permissions**: Request only what you need

## Next Steps {#next-steps}

- Explore Chrome's [Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- Read the [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- Experiment with different extension types

## Related Guides {#related-guides}

- [Manifest JSON Reference](./manifest-json-reference.md)
- [Debugging Extensions](./debugging-extensions.md)
- [Extension Architecture](./extension-architecture.md)

## Related Articles {#related-articles}

## Related Articles

- [Project Structure](../guides/chrome-extension-project-structure.md)
- [Manifest Reference](../guides/manifest-json-reference.md)
