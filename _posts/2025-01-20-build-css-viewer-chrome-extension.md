---
layout: post
title: "Build a CSS Properties Viewer Chrome Extension"
description: "Learn how to build a CSS properties viewer Chrome extension from scratch. This comprehensive guide covers Manifest V3, content scripts, DOM manipulation, and how to inspect CSS chrome for any website."
date: 2025-01-20
categories: [tutorials, chrome-extensions]
tags: [css viewer extension, chrome extension development, css tool extension, inspect css chrome, web development tools]
keywords: "css viewer extension, inspect css chrome, css tool extension, chrome extension css, inspect element chrome, css properties viewer"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/20/build-css-viewer-chrome-extension/
---

# Build a CSS Properties Viewer Chrome Extension

If you have ever used the built-in Chrome DevTools to debug styling issues, you know how powerful CSS inspection can be. But what if you could have quick access to CSS properties directly in your browser toolbar without opening the developer tools? A CSS properties viewer extension provides exactly that functionality — a streamlined way to inspect CSS chrome elements and view computed styles at a glance.

In this comprehensive guide, we will walk you through building a fully functional CSS viewer extension using Chrome's Manifest V3 architecture. Whether you are a beginner looking to understand Chrome extension development or an experienced developer wanting to add a useful tool to your arsenal, this tutorial has everything you need.

---

## Why Build a CSS Viewer Extension? {#why-build-css-viewer}

The web development ecosystem is filled with tools for inspecting and debugging CSS, but having a dedicated CSS tool extension offers several distinct advantages. First and foremost, it provides instant access to CSS information without requiring you to open the full Chrome DevTools panel, which can be intimidating for newcomers and time-consuming for experienced developers who just need a quick peek at specific styles.

A custom CSS viewer extension can be tailored to your specific workflow needs. You might want to view only inherited properties, filter by specific CSS categories like flexbox or grid layouts, or highlight specific elements on the page with a single click. The flexibility to customize these features makes building your own extension worthwhile.

From a learning perspective, creating a CSS viewer extension is an excellent project because it touches on many fundamental aspects of Chrome extension development. You will work with content scripts that interact directly with web pages, popup interfaces that provide user interaction, and background service workers that can handle more complex operations. This makes it an ideal project for anyone looking to deepen their understanding of extension architecture.

---

## Understanding the Extension Architecture {#extension-architecture}

Before we dive into the code, let us understand the core components that make up our CSS viewer extension. Chrome extensions built with Manifest V3 consist of several parts that work together to deliver functionality.

### The Manifest File

The manifest.json file serves as the configuration hub for your extension. It defines the extension name, version, permissions, and declares which scripts and resources the extension will use. For our CSS viewer, we will need permissions to access the active tab and execute scripts within page contexts.

### Content Scripts

Content scripts are JavaScript files that run in the context of web pages. They can read and modify the DOM, access computed styles, and interact with page elements. This is where the core CSS inspection logic will live.

### Popup Interface

The popup is what users see when they click the extension icon in the Chrome toolbar. This provides our user interface for selecting elements and displaying CSS properties.

### Background Service Worker

The background service worker handles events and can coordinate between different parts of the extension. While our CSS viewer might not heavily rely on this, understanding its role is important for more complex extensions.

---

## Setting Up the Project Structure {#project-setup}

Let us start by creating the necessary files for our extension. Create a new folder for your project and set up the following structure:

```
css-viewer-extension/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── content.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

This structure keeps our files organized and makes it easy to manage different components of the extension. Each file has a specific purpose that we will explore in detail throughout this guide.

---

## Creating the Manifest File {#manifest-file}

The manifest.json file is the backbone of any Chrome extension. Here is the complete manifest for our CSS viewer extension:

```json
{
  "manifest_version": 3,
  "name": "CSS Properties Viewer",
  "version": "1.0.0",
  "description": "Inspect and view CSS properties of any element on the page with a single click.",
  "permissions": [
    "activeTab",
    "scripting"
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
      "css": ["content.css"]
    }
  ]
}
```

This manifest declares that our extension requires permission to access the active tab and execute scripts. The content_scripts configuration ensures our CSS inspection script loads on every web page the user visits.

---

## Building the Content Script {#content-script}

The content script is where the magic happens. This JavaScript file runs within the context of each web page and has access to the DOM and computed styles. Let us build a comprehensive content script that can inspect any element:

```javascript
// content.js

class CSSViewer {
  constructor() {
    this.highlightedElement = null;
    this.styleCache = new Map();
    this.init();
  }

  init() {
    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'inspectElement') {
        this.enableInspectionMode();
        sendResponse({ success: true });
      } else if (request.action === 'getElementStyles') {
        const styles = this.getElementStyles(request.elementSelector);
        sendResponse({ styles: styles });
      } else if (request.action === 'disableInspection') {
        this.disableInspectionMode();
        sendResponse({ success: true });
      }
      return true;
    });
  }

  enableInspectionMode() {
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('click', this.handleClick.bind(this), true);
    document.body.style.cursor = 'crosshair';
  }

  disableInspectionMode() {
    document.removeEventListener('mouseover', this.handleMouseOver.bind(this));
    document.removeEventListener('click', this.handleClick.bind(this), true);
    document.body.style.cursor = 'default';
    
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove('css-viewer-highlight');
    }
  }

  handleMouseOver(event) {
    if (this.highlightedElement) {
      this.highlightedElement.classList.remove('css-viewer-highlight');
    }
    
    this.highlightedElement = event.target;
    this.highlightedElement.classList.add('css-viewer-highlight');
  }

  handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target;
    const styles = this.getComputedStyles(element);
    
    chrome.runtime.sendMessage({
      action: 'elementSelected',
      styles: styles,
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      id: element.id
    });
    
    this.disableInspectionMode();
  }

  getComputedStyles(element) {
    const computed = window.getComputedStyle(element);
    const styles = {};
    
    // Get all CSS properties
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      styles[prop] = computed.getPropertyValue(prop);
    }
    
    return styles;
  }

  getElementStyles(selector) {
    const element = document.querySelector(selector);
    if (!element) return null;
    
    return this.getComputedStyles(element);
  }
}

// Initialize the CSS viewer
new CSSViewer();
```

This content script provides the foundation for inspecting elements. When the user activates inspection mode from the popup, the script adds event listeners that track mouse movements and clicks. When an element is clicked, it captures all computed styles and sends them back to the extension.

---

## Creating the Popup Interface {#popup-interface}

The popup provides the user interface for interacting with our CSS viewer. Let us create a clean and functional popup:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <title>CSS Properties Viewer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>CSS Viewer</h1>
      <p class="subtitle">Inspect styles instantly</p>
    </header>
    
    <div class="actions">
      <button id="inspectBtn" class="btn primary">
        <span class="icon">🔍</span>
        Inspect Element
      </button>
    </div>
    
    <div id="stylesPanel" class="styles-panel hidden">
      <div class="element-info">
        <h2>Element Info</h2>
        <p><strong>Tag:</strong> <span id="elementTag"></span></p>
        <p><strong>Class:</strong> <span id="elementClass"></span></p>
        <p><strong>ID:</strong> <span id="elementId"></span></p>
      </div>
      
      <div class="styles-list">
        <h2>CSS Properties</h2>
        <input type="text" id="filterInput" placeholder="Filter properties...">
        <div id="stylesContainer"></div>
      </div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The popup provides a clean interface with an inspect button and a panel to display styles. We have included filtering functionality so users can quickly find specific properties.

---

## Styling the Popup {#popup-styling}

Now let us add some styling to make our popup visually appealing:

```css
/* popup.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  background: #ffffff;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 12px;
  color: #666;
}

.actions {
  margin-bottom: 16px;
}

.btn {
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s, transform 0.1s;
}

.btn.primary {
  background: #4285f4;
  color: white;
}

.btn.primary:hover {
  background: #3367d6;
}

.btn.primary:active {
  transform: scale(0.98);
}

.btn.active {
  background: #ea4335;
}

.styles-panel {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
}

.styles-panel.hidden {
  display: none;
}

.element-info {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.element-info h2 {
  font-size: 14px;
  margin-bottom: 8px;
}

.element-info p {
  font-size: 12px;
  margin-bottom: 4px;
  word-break: break-all;
}

.styles-list h2 {
  font-size: 14px;
  margin-bottom: 8px;
}

#filterInput {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 12px;
}

#filterInput:focus {
  outline: none;
  border-color: #4285f4;
}

#stylesContainer {
  max-height: 300px;
  overflow-y: auto;
}

.style-item {
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
}

.style-item:last-child {
  border-bottom: none;
}

.style-property {
  color: #0d47a1;
  font-weight: 500;
}

.style-value {
  color: #c62828;
  word-break: break-all;
}

.highlight-box {
  background: #fff3e0;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.highlight-box p {
  font-size: 12px;
  margin-bottom: 4px;
}
```

The styling ensures a clean, modern look that matches Chrome's own interface design language. We have used a consistent color palette and proper spacing for a professional appearance.

---

## Implementing Popup Logic {#popup-logic}

Now let us connect everything with the popup JavaScript:

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const inspectBtn = document.getElementById('inspectBtn');
  const stylesPanel = document.getElementById('stylesPanel');
  const stylesContainer = document.getElementById('stylesContainer');
  const filterInput = document.getElementById('filterInput');
  const elementTag = document.getElementById('elementTag');
  const elementClass = document.getElementById('elementClass');
  const elementId = document.getElementById('elementId');

  let isInspecting = false;

  inspectBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!isInspecting) {
      // Start inspection mode
      await chrome.tabs.sendMessage(tab.id, { action: 'inspectElement' });
      inspectBtn.classList.add('active');
      inspectBtn.textContent = 'Click on element...';
      isInspecting = true;
    } else {
      // Cancel inspection
      await chrome.tabs.sendMessage(tab.id, { action: 'disableInspection' });
      inspectBtn.classList.remove('active');
      inspectBtn.innerHTML = '<span class="icon">🔍</span> Inspect Element';
      isInspecting = false;
    }
  });

  // Listen for element selection from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'elementSelected') {
      isInspecting = false;
      inspectBtn.classList.remove('active');
      inspectBtn.innerHTML = '<span class="icon">🔍</span> Inspect Element';
      
      // Display element info
      elementTag.textContent = message.tagName;
      elementClass.textContent = message.className || 'none';
      elementId.textContent = message.id || 'none';
      
      // Display styles
      displayStyles(message.styles);
      stylesPanel.classList.remove('hidden');
    }
  });

  function displayStyles(styles) {
    if (!styles) {
      stylesContainer.innerHTML = '<p>No styles found</p>';
      return;
    }

    const filteredStyles = Object.entries(styles).filter(([prop, value]) => 
      value && value !== '' && value !== 'none'
    );

    stylesContainer.innerHTML = filteredStyles.map(([property, value]) => `
      <div class="style-item">
        <span class="style-property">${property}:</span>
        <span class="style-value">${value}</span>
      </div>
    `).join('');
  }

  // Filter functionality
  filterInput.addEventListener('input', (e) => {
    const filter = e.target.value.toLowerCase();
    const items = stylesContainer.querySelectorAll('.style-item');
    
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(filter) ? 'block' : 'none';
    });
  });
});
```

This JavaScript handles the communication between the popup and the content script. It manages the inspection mode state, processes the returned style information, and provides filtering functionality for the displayed properties.

---

## Adding the Background Service Worker {#background-worker}

While our CSS viewer primarily uses content scripts and popups, the background service worker can add additional functionality:

```javascript
// background.js

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('CSS Properties Viewer installed:', details.reason);
});

// Handle messages from content scripts and popups
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'elementSelected') {
    // You could store selected elements for history tracking
    // or perform additional processing here
    console.log('Element selected:', message.tagName);
  }
});
```

This background script provides a foundation for more advanced features like maintaining a history of inspected elements or adding context menu options.

---

## Testing Your Extension {#testing-extension}

Before publishing your extension, thorough testing is essential. Load your extension in Chrome by following these steps:

1. Open Chrome and navigate to chrome://extensions/
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked" and select your extension folder
4. Test the inspection functionality on various websites
5. Verify that styles display correctly and filtering works

Pay special attention to how the extension handles different types of websites, including those with complex CSS frameworks, dynamically generated content, and shadow DOM elements.

---

## Enhancing Your CSS Viewer {#enhancing-extension}

Now that you have a working CSS viewer extension, here are several ways to enhance it:

### Add Property Categories

Organize CSS properties into categories like Layout, Typography, Colors, and Animation. This makes it easier for users to find relevant properties quickly.

### Implement Style Copying

Add functionality to copy individual property values or entire style blocks to the clipboard. This is useful for developers who want to quickly grab specific styles for reuse.

### Add Hover Preview

When hovering over properties in the popup, show a preview of what that property does. This is especially helpful for developers who are learning CSS.

### Support Multiple Elements

Allow users to select multiple elements and compare their styles side by side. This is valuable for debugging styling inconsistencies.

---

## Publishing Your Extension {#publishing}

Once you have tested your extension thoroughly, you can publish it to the Chrome Web Store. Create a developer account, prepare your store listing with appropriate screenshots and descriptions, and submit for review. Make sure to optimize your listing with relevant keywords like "css viewer extension," "inspect css chrome," and "css tool extension" to improve discoverability.

---

## Conclusion {#conclusion}

Building a CSS properties viewer extension is an excellent project that teaches you fundamental Chrome extension development concepts while creating a genuinely useful tool. You have learned how to create Manifest V3 configurations, build content scripts that interact with web pages, design popup interfaces, and implement communication between different extension components.

The extension you built today provides a solid foundation that can be extended with many additional features. Whether you use it as a personal tool or publish it for others to benefit from, you have gained valuable experience in Chrome extension development that will serve you well in future projects.

Remember to test extensively across different websites and browsers, and consider gathering user feedback to guide future improvements. The Chrome extension ecosystem offers tremendous opportunities for developers who can identify problems and create elegant solutions — and now you have the skills to do exactly that.

---

## Frequently Asked Questions {#faq}

**How do I inspect CSS in Chrome quickly?**

The easiest way is to right-click on any element and select "Inspect" to open DevTools. However, with our CSS viewer extension, you can get quick access to CSS properties directly from the toolbar without opening the full DevTools panel.

**Can this extension view inherited CSS properties?**

Yes, the getComputedStyle() method returns all applied styles including inherited ones. You can further enhance the extension to filter and display only inherited properties if needed.

**Is this extension compatible with all websites?**

Our extension uses content scripts that run on web pages, which means it should work on most websites. However, some sites with strict Content Security Policy (CSP) restrictions may limit functionality.

**How do I add more CSS properties to view?**

The current implementation already captures all computed styles. To add more features, you can modify the content script to include specific property groups or add custom analysis features.
