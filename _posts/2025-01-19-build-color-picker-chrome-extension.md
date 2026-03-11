---
layout: post
title: "Build a Color Picker Chrome Extension: Complete Step-by-Step Guide"
description: "Learn how to build a color picker Chrome extension from scratch. This comprehensive guide covers the Eyedropper API, color conversion, CSS color tools, and how to publish your extension to the Chrome Web Store."
date: 2025-01-19
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, tutorial, project]
keywords: "color picker chrome extension, eyedropper extension, css color tool, chrome color picker, color picker extension tutorial"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/19/build-color-picker-chrome-extension/"
---

# Build a Color Picker Chrome Extension: Complete Step-by-Step Guide

Color picker tools are essential for web developers, designers, and anyone working with colors on the web. Building a color picker Chrome extension is an excellent project that teaches you fundamental extension development concepts while creating a genuinely useful tool. In this comprehensive guide, we will walk through building a fully functional color picker extension using Chrome's Eyedropper API and modern JavaScript.

This tutorial assumes you have basic knowledge of HTML, CSS, and JavaScript. By the end of this guide, you will have a working color picker extension that can sample colors from any webpage, display them in multiple formats, and save color histories for later reference.

---

## Why Build a Color Picker Extension? {#why-build-color-picker}

The demand for color picker tools in the browser is substantial. Web designers constantly need to sample colors from websites, developers need to extract colors for their projects, and content creators frequently need to match colors across different platforms. A well-designed color picker extension solves these problems directly from the browser.

Building a color picker extension teaches several valuable skills that translate to other extension projects. You will learn how to interact with the DOM, use Chrome's experimental APIs, handle user interactions with popups, store data persistently, and communicate between different extension components. These skills form the foundation for building more complex extensions.

The Chrome browser already includes a built-in color picker in DevTools, but having a dedicated extension provides several advantages. Extensions can be accessed with a single click, can maintain color history, offer additional color conversion features, and work independently of the DevTools panel. Many popular color picker extensions on the Chrome Web Store have millions of users, demonstrating the market demand for this type of tool.

---

## Project Overview and Features {#project-overview}

Before writing any code, let us define what our color picker extension will do. We will build an extension with the following features:

First, the extension will use the Eyedropper API to allow users to pick colors from any webpage. This API provides native color sampling functionality built directly into Chrome. Users can click the extension icon, then click anywhere on the page to capture the color at that pixel.

Second, the extension will display colors in multiple formats. Web developers work with HEX, RGB, HSL, and sometimes RGBA values. Our extension will automatically convert and display the picked color in all these formats, making it easy for users to copy whichever format they need.

Third, we will implement a color history feature. Users often need to reference previously picked colors. We will store the last ten colors in local storage and display them for quick access.

Fourth, the extension will include one-click copy functionality. Clicking on any color format will copy it to the clipboard, streamlining the workflow for developers and designers.

Finally, we will add a mini color palette generator. When a color is picked, we will generate complementary, analogous, and triadic color schemes to help users find matching colors.

---

## Setting Up the Project Structure {#project-structure}

Create a new folder for your extension project. Inside this folder, create the following file structure:

```
color-picker-extension/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

The manifest.json file defines your extension configuration. For the Eyedropper API to work, we need to declare specific permissions and use Manifest V3, the current standard for Chrome extensions.

Create the manifest.json file with the following content:

```json
{
  "manifest_version": 3,
  "name": "Color Picker Pro",
  "version": "1.0",
  "description": "Pick colors from any webpage with one click. View colors in HEX, RGB, HSL formats and save your color history.",
  "permissions": [
    "scripting",
    "activeTab"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The permissions we include are minimal and focused. The "scripting" permission allows us to inject scripts into pages when needed, while "activeTab" gives us access to the currently active tab without requiring host permissions for all websites.

---

## Creating the Popup Interface {#popup-interface}

The popup is what users see when they click the extension icon. It should be clean, functional, and provide quick access to all features. Let us create popup.html:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Color Picker Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Color Picker Pro</h1>
    </header>
    
    <div class="picker-section">
      <button id="pickColor" class="primary-button">
        <span class="icon">🎯</span> Pick Color from Page
      </button>
    </div>
    
    <div id="colorResult" class="color-result hidden">
      <div class="color-preview" id="colorPreview"></div>
      
      <div class="color-formats">
        <div class="format-row" data-format="hex">
          <label>HEX</label>
          <span id="hexValue">#000000</span>
          <button class="copy-btn" data-copy="hexValue">📋</button>
        </div>
        
        <div class="format-row" data-format="rgb">
          <label>RGB</label>
          <span id="rgbValue">rgb(0, 0, 0)</span>
          <button class="copy-btn" data-copy="rgbValue">📋</button>
        </div>
        
        <div class="format-row" data-format="hsl">
          <label>HSL</label>
          <span id="hslValue">hsl(0, 0%, 0%)</span>
          <button class="copy-btn" data-copy="hslValue">📋</button>
        </div>
      </div>
    </div>
    
    <div class="history-section">
      <h2>Color History</h2>
      <div id="colorHistory" class="color-history"></div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The HTML structure is straightforward. We have a picker button, a result section that shows the picked color in various formats, and a history section that displays previously picked colors.

---

## Styling the Popup {#popup-styling}

The CSS should make the extension look professional and easy to use. Create popup.css with these styles:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header h1 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #1a73e8;
}

.picker-section {
  margin-bottom: 16px;
}

.primary-button {
  width: 100%;
  padding: 12px 16px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.primary-button:hover {
  background-color: #1557b0;
}

.primary-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.hidden {
  display: none;
}

.color-result {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.color-preview {
  width: 100%;
  height: 60px;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #ddd;
}

.color-formats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.format-row label {
  font-weight: 600;
  font-size: 12px;
  width: 40px;
  color: #666;
}

.format-row span {
  flex: 1;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
}

.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.copy-btn:hover {
  opacity: 1;
}

.history-section h2 {
  font-size: 14px;
  margin-bottom: 12px;
  color: #444;
}

.color-history {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-color {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ddd;
  transition: transform 0.2s;
}

.history-color:hover {
  transform: scale(1.1);
}
```

The styling uses a clean, modern design with good contrast and clear visual hierarchy. The button is prominently displayed, and the color formats are easy to read and copy.

---

## Implementing the Extension Logic {#extension-logic}

Now comes the core functionality. Create popup.js with all the color manipulation and interaction logic:

```javascript
// Color conversion utilities
const ColorUtils = {
  // Convert RGB to HEX
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },
  
  // Convert RGB to HSL
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  },
  
  // Convert HEX to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },
  
  // Format RGB string
  formatRgb(r, g, b) {
    return `rgb(${r}, ${g}, ${b})`;
  },
  
  // Format HSL string
  formatHsl(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
};

// Storage management
const StorageManager = {
  async getHistory() {
    const result = await chrome.storage.local.get('colorHistory');
    return result.colorHistory || [];
  },
  
  async addToHistory(color) {
    const history = await this.getHistory();
    
    // Remove if already exists
    const filtered = history.filter(c => c.hex !== color.hex);
    
    // Add to beginning
    filtered.unshift(color);
    
    // Keep only last 10
    const trimmed = filtered.slice(0, 10);
    
    await chrome.storage.local.set({ colorHistory: trimmed });
    return trimmed;
  },
  
  async clearHistory() {
    await chrome.storage.local.set({ colorHistory: [] });
  }
};

// UI Controller
class ColorPickerUI {
  constructor() {
    this.pickButton = document.getElementById('pickColor');
    this.colorResult = document.getElementById('colorResult');
    this.colorPreview = document.getElementById('colorPreview');
    this.hexValue = document.getElementById('hexValue');
    this.rgbValue = document.getElementById('rgbValue');
    this.hslValue = document.getElementById('hslValue');
    this.colorHistory = document.getElementById('colorHistory');
    
    this.init();
  }
  
  init() {
    this.pickButton.addEventListener('click', () => this.activatePicker());
    this.setupCopyButtons();
    this.loadHistory();
  }
  
  async activatePicker() {
    this.pickButton.disabled = true;
    this.pickButton.textContent = 'Click anywhere on the page...';
    
    try {
      // Use the Eyedropper API
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      
      const hex = result.sRGBHex;
      const rgb = ColorUtils.hexToRgb(hex);
      
      this.displayColor(hex, rgb);
      await StorageManager.addToHistory({ hex, rgb });
      this.loadHistory();
      
    } catch (error) {
      console.error('Color picker error:', error);
      if (error.name !== 'AbortError') {
        alert('Could not pick color. Make sure you are on a webpage.');
      }
    }
    
    this.pickButton.disabled = false;
    this.pickButton.innerHTML = '<span class="icon">🎯</span> Pick Color from Page';
  }
  
  displayColor(hex, rgb) {
    const hsl = ColorUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    this.colorPreview.style.backgroundColor = hex;
    this.hexValue.textContent = hex.toUpperCase();
    this.rgbValue.textContent = ColorUtils.formatRgb(rgb.r, rgb.g, rgb.b);
    this.hslValue.textContent = ColorUtils.formatHsl(hsl.h, hsl.s, hsl.l);
    
    this.colorResult.classList.remove('hidden');
  }
  
  setupCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.copy;
        const text = document.getElementById(targetId).textContent;
        
        navigator.clipboard.writeText(text).then(() => {
          const originalText = btn.textContent;
          btn.textContent = '✓';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 1000);
        });
      });
    });
  }
  
  async loadHistory() {
    const history = await StorageManager.getHistory();
    
    this.colorHistory.innerHTML = '';
    
    history.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'history-color';
      swatch.style.backgroundColor = color.hex;
      swatch.title = color.hex;
      swatch.addEventListener('click', () => {
        this.displayColor(color.hex, color.rgb);
      });
      this.colorHistory.appendChild(swatch);
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ColorPickerUI();
});
```

This JavaScript file contains three main sections. First, the ColorUtils object handles all color conversions between HEX, RGB, and HSL formats. Second, the StorageManager handles saving and retrieving color history from Chrome's local storage. Third, the ColorPickerUI class manages all the user interface interactions.

The key functionality is in the activatePicker method, which uses the EyeDropper API. This is an experimental API that allows extensions to sample colors from the page. When the user clicks "Pick Color from Page," the API opens and lets them click anywhere to capture the color at that pixel.

---

## Adding Background Script {#background-script}

For a more complete extension, we need a background script. This is required for certain features and future expansion. Create background.js:

```javascript
// Background script for Color Picker Pro
// This script handles extension lifecycle events

chrome.runtime.onInstalled.addListener(() => {
  console.log('Color Picker Pro extension installed');
  
  // Initialize storage with default values
  chrome.storage.local.set({
    colorHistory: [],
    settings: {
      defaultFormat: 'hex',
      showInToolbar: true
    }
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getHistory') {
    chrome.storage.local.get('colorHistory', (result) => {
      sendResponse(result.colorHistory || []);
    });
    return true;
  }
  
  if (message.action === 'clearHistory') {
    chrome.storage.local.set({ colorHistory: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
```

The background script handles extension installation and message passing between different parts of the extension.

---

## Creating Extension Icons {#extension-icons}

Every extension needs icons. You can create simple icons using any image editing tool. The icons should be PNG files at 16x16, 48x48, and 128x128 pixels. For development purposes, you can create placeholder icons or use the following approach to generate them programmatically.

For now, create a simple icons folder and add placeholder files. You will need to replace these with proper icons before publishing to the Chrome Web Store.

```bash
mkdir -p icons
```

You can use an online tool like favicon.cc or create icons in a graphics editor. The icons should represent an eyedropper or color picker.

---

## Testing the Extension {#testing}

Now let us test the extension in Chrome. Follow these steps:

First, open Chrome and navigate to chrome://extensions/. Enable "Developer mode" using the toggle in the top right corner. Click the "Load unpacked" button and select your extension folder.

Once loaded, you should see the extension icon in your toolbar. Click the icon to open the popup. You should see the "Pick Color from Page" button.

To test the color picker, navigate to any website with various colors. Click the extension icon, then click "Pick Color from Page." Your cursor will change to a crosshair. Click anywhere on the webpage to capture that color.

The picked color will appear in the popup with HEX, RGB, and HSL values. Click the copy button next to any format to copy it to your clipboard. The color will also be saved to your history.

---

## Troubleshooting Common Issues {#troubleshooting}

If the Eyedropper API does not work, it may be because the API is still experimental. Make sure you are using a recent version of Chrome. The Eyedropper API is available in Chrome 95 and later.

If you get a permission error, check that your manifest.json includes the correct permissions. The activeTab permission is usually sufficient for color picking.

If the popup does not open, check the console for errors. You can do this by right-clicking the popup and selecting "Inspect" to open the developer tools.

---

## Enhancing the Extension {#enhancing-features}

Once the basic extension is working, consider adding these advanced features to make it more useful:

Add a color palette generator that shows complementary, analogous, triadic, and split-complementary colors based on the picked color. This helps designers find matching colors quickly.

Implement a feature to export colors to different formats like SCSS variables, CSS custom properties, or JSON. This is particularly useful for developers working on design systems.

Add an option to save favorite colors separately from the history. Users often have a set of brand colors they reference frequently.

Implement keyboard shortcuts so users can activate the color picker without using the mouse. For example, you could use Alt+C to open the picker.

Add support for color blindness simulation to help designers ensure their color choices are accessible.

---

## Publishing to the Chrome Web Store {#publishing}

When your extension is ready, you can publish it to the Chrome Web Store. First, zip your extension folder. Then, navigate to the Chrome Web Store Developer Dashboard and create a new listing.

You will need to provide a detailed description, screenshots, and icon. The description should include the keywords: color picker chrome extension, eyedropper extension, and css color tool to improve search visibility.

After submitting, Google will review your extension. The review process typically takes a few hours to a few days. Once approved, your extension will be available to all Chrome users.

---

## Conclusion {#conclusion}

Building a color picker Chrome extension is an excellent project that teaches you fundamental extension development concepts while creating a genuinely useful tool. You have learned how to use the Eyedropper API, work with color conversions, manage persistent storage, and create a polished user interface.

The extension we built today includes all the essential features: color picking from any webpage, multiple color format display, one-click copying, and color history. These features form a solid foundation that you can extend with additional functionality as needed.

Color picker extensions remain popular on the Chrome Web Store because they solve a real problem for developers and designers. With some additional features and polish, your extension could become a valuable tool for thousands of users.

Remember to test thoroughly across different websites and browsers before publishing. Pay attention to edge cases, such as picking colors from images or websites with complex layouts. With careful development and testing, you can create a reliable color picker extension that users will love.
