---
layout: post
title: "Build a Color Palette Generator Chrome Extension: Complete Guide"
description: "Learn how to build a color palette generator Chrome extension from scratch. This comprehensive guide covers Manifest V3, color extraction, scheme generation, and publishing your extension to the Chrome Web Store."
date: 2025-01-28
categories: [Chrome-Extensions]
tags: [chrome-extension, utility]
keywords: "color palette extension, color scheme chrome, palette generator, chrome extension color picker, build color extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/28/chrome-extension-color-palette/"
---

# Build a Color Palette Generator Chrome Extension: Complete Guide

Color is one of the most powerful tools in a designer's arsenal. Whether you're a web developer, UI/UX designer, or digital artist, having quick access to beautiful color palettes can dramatically improve your workflow. In this comprehensive guide, I'll walk you through building a fully functional Color Palette Generator Chrome Extension from scratch.

By the end of this tutorial, you'll have created an extension that can extract colors from any webpage, generate harmonious color schemes, and save your favorite palettes for later use. This project is perfect for developers looking to expand their Chrome extension portfolio with a practical, everyday utility.

---

## Why Build a Color Palette Generator Extension? {#why-build}

The demand for color tools in the browser is substantial. Designers and developers constantly need to:

- Extract colors from websites they visit
- Generate harmonious color schemes for new projects
- Test color contrast for accessibility compliance
- Save and organize color inspiration

Building a color palette extension teaches you valuable skills that apply to many other extension types. You'll work with the DOM, handle user interactions, manage local storage, and create intuitive popup interfaces. These skills transfer directly to building productivity tools, developer utilities, and content customization extensions.

The Chrome Web Store has proven there's an audience for such tools. Extensions like ColorZilla, ColorSnapper, and similar utilities have millions of users. A well-built color palette generator with unique features can easily find its place in this market.

---

## Project Overview and Features {#project-overview}

Before writing any code, let's define what our Color Palette Generator extension will do:

### Core Features

1. **Color Picker**: Extract any color from the current webpage with a single click
2. **Color Scheme Generation**: Automatically generate harmonious color palettes (complementary, analogous, triadic, etc.)
3. **Format Conversion**: Convert colors between HEX, RGB, HSL, and HSV formats
4. **Palette Storage**: Save favorite palettes to local storage for later reference
5. **Color Contrast Checker**: Verify text readability against background colors

### Technical Requirements

- Manifest V3 (the current Chrome extension standard)
- No external dependencies (pure HTML, CSS, and JavaScript)
- Persistent popup interface
- Content script for page color extraction

---

## Setting Up the Project Structure {#project-structure}

Create a new folder for your extension and set up the following file structure:

```
color-palette-generator/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

Let's start with the manifest file, which defines our extension's configuration.

---

## Creating the Manifest (manifest.json) {#manifest}

The manifest.json file is the backbone of any Chrome extension. In Manifest V3, we need to declare all permissions and permissions explicitly:

```json
{
  "manifest_version": 3,
  "name": "Color Palette Generator",
  "version": "1.0.0",
  "description": "Extract colors from any webpage and generate beautiful color palettes",
  "permissions": [
    "activeTab",
    "storage",
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
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Key points to note:

- We use `activeTab` permission to access the current tab's content
- `storage` permission allows us to save palettes locally
- `scripting` permission lets us inject content scripts to extract colors
- The popup is our main interface, triggered when clicking the extension icon

---

## Building the Popup Interface (popup.html) {#popup-html}

The popup is what users see when they click your extension icon. Let's create a clean, functional interface:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Color Palette Generator</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Color Palette Generator</h1>
      <p class="subtitle">Extract & create beautiful color schemes</p>
    </header>

    <section class="color-picker-section">
      <h2>Current Color</h2>
      <div class="color-display">
        <div id="current-color" class="color-preview"></div>
        <div class="color-values">
          <input type="text" id="hex-value" readonly>
          <button id="copy-hex" class="copy-btn">Copy</button>
        </div>
      </div>
      <button id="pick-color" class="primary-btn">Pick Color from Page</button>
    </section>

    <section class="scheme-section">
      <h2>Color Scheme</h2>
      <div class="scheme-options">
        <button class="scheme-btn active" data-scheme="complementary">Complementary</button>
        <button class="scheme-btn" data-scheme="analogous">Analogous</button>
        <button class="scheme-btn" data-scheme="triadic">Triadic</button>
        <button class="scheme-btn" data-scheme="split-complementary">Split</button>
        <button class="scheme-btn" data-scheme="tetradic">Tetradic</button>
      </div>
      <div id="scheme-palette" class="palette"></div>
    </section>

    <section class="saved-section">
      <h2>Saved Palettes</h2>
      <div id="saved-palettes" class="saved-list"></div>
      <button id="save-palette" class="secondary-btn">Save Current Palette</button>
    </section>

    <section class="contrast-section">
      <h2>Contrast Checker</h2>
      <div class="contrast-inputs">
        <div class="contrast-input">
          <label>Background</label>
          <input type="color" id="bg-color" value="#ffffff">
        </div>
        <div class="contrast-input">
          <label>Text</label>
          <input type="color" id="text-color" value="#000000">
        </div>
      </div>
      <div id="contrast-result" class="contrast-result"></div>
    </section>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

The HTML structure is organized into four main sections:

1. **Color Picker Section**: Shows the currently selected color with its HEX value
2. **Color Scheme Section**: Buttons to generate different color harmony schemes
3. **Saved Palettes Section**: Displays previously saved palettes
4. **Contrast Checker Section**: Tests text readability against backgrounds

---

## Styling the Popup (popup.css) {#popup-css}

Now let's make it look professional with clean, modern CSS:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 360px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #f8f9fa;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 12px;
  color: #666;
}

h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #444;
}

section {
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.color-preview {
  width: 100%;
  height: 80px;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #ddd;
}

.color-values {
  display: flex;
  gap: 8px;
}

input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
}

.primary-btn, .secondary-btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn {
  background: #4285f4;
  color: white;
}

.primary-btn:hover {
  background: #3367d6;
}

.secondary-btn {
  background: #f1f3f4;
  color: #333;
}

.secondary-btn:hover {
  background: #e8eaed;
}

.copy-btn {
  padding: 8px 12px;
  background: #f1f3f4;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.scheme-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.scheme-btn {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 11px;
  cursor: pointer;
}

.scheme-btn.active {
  background: #4285f4;
  color: white;
  border-color: #4285f4;
}

.palette {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.palette-color {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #ddd;
  position: relative;
}

.palette-color:hover::after {
  content: attr(data-color);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  white-space: nowrap;
}

.saved-palette {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.saved-colors {
  display: flex;
  gap: 2px;
}

.saved-color {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: 1px solid #ddd;
}

.delete-palette {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
}

.delete-palette:hover {
  color: #d93025;
}

.contrast-inputs {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.contrast-input {
  flex: 1;
}

.contrast-input label {
  display: block;
  font-size: 11px;
  margin-bottom: 4px;
  color: #666;
}

.contrast-input input {
  width: 100%;
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.contrast-result {
  padding: 12px;
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
}

.contrast-result.pass {
  background: #e6f4ea;
  color: #137333;
}

.contrast-result.fail {
  background: #fce8e6;
  color: #c5221f;
}
```

This styling creates a clean, professional look with proper spacing, rounded corners, and clear visual hierarchy. The interface is intuitive and easy to use.

---

## Implementing the Popup Logic (popup.js) {#popup-js}

Now for the core functionality. The popup JavaScript handles all user interactions:

```javascript
// State
let currentColor = '#4285f4';
let currentScheme = 'complementary';
let generatedPalette = [];

// DOM Elements
const colorPreview = document.getElementById('current-color');
const hexInput = document.getElementById('hex-value');
const pickColorBtn = document.getElementById('pick-color');
const copyBtn = document.getElementById('copy-hex');
const schemeButtons = document.querySelectorAll('.scheme-btn');
const paletteContainer = document.getElementById('scheme-palette');
const saveBtn = document.getElementById('save-palette');
const savedPalettesContainer = document.getElementById('saved-palettes');
const bgColorInput = document.getElementById('bg-color');
const textColorInput = document.getElementById('text-color');
const contrastResult = document.getElementById('contrast-result');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSavedPalettes();
  updateDisplay();
  setupEventListeners();
});

function setupEventListeners() {
  // Pick color from page
  pickColorBtn.addEventListener('click', pickColorFromPage);
  
  // Copy HEX value
  copyBtn.addEventListener('click', () => copyToClipboard(hexInput.value));
  
  // Scheme buttons
  schemeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      schemeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScheme = btn.dataset.scheme;
      generateScheme();
    });
  });
  
  // Save palette
  saveBtn.addEventListener('click', savePalette);
  
  // Contrast checker
  bgColorInput.addEventListener('input', checkContrast);
  textColorInput.addEventListener('input', checkContrast);
}

async function pickColorFromPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Execute script to get colors from page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getPageColors
    });
    
    if (results[0]result && results[0].result.colors.length > 0) {
      // Show first extracted color
      currentColor = results[0].result.colors[0];
      updateDisplay();
      generateScheme();
    }
  } catch (error) {
    console.error('Error picking color:', error);
    alert('Unable to extract colors. Please try again.');
  }
}

// This function runs in the context of the page
function getPageColors() {
  const colors = new Set();
  const elements = document.querySelectorAll('*');
  
  elements.forEach(el => {
    const style = window.getComputedStyle(el);
    const bgColor = style.backgroundColor;
    const color = style.color;
    
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      colors.add(rgbToHex(bgColor));
    }
    if (color) {
      colors.add(rgbToHex(color));
    }
  });
  
  return { colors: Array.from(colors).slice(0, 20) };
}

function rgbToHex(rgb) {
  if (!rgb || rgb.startsWith('#')) return rgb;
  
  const values = rgb.match(/\d+/g);
  if (!values || values.length < 3) return '#000000';
  
  return '#' + values.slice(0, 3).map(x => {
    const hex = parseInt(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateScheme() {
  const rgb = hexToRgb(currentColor);
  if (!rgb) return;
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const schemes = {
    complementary: [0, 180],
    analogous: [0, -30, 30],
    triadic: [0, 120, 240],
    'split-complementary': [0, 150, 210],
    tetradic: [0, 90, 180, 270]
  };
  
  const angles = schemes[currentScheme];
  generatedPalette = angles.map(angle => {
    const newHue = (hsl.h + angle) % 360;
    return hslToHex(newHue, hsl.s, hsl.l);
  });
  
  renderPalette();
}

function renderPalette() {
  paletteContainer.innerHTML = '';
  generatedPalette.forEach(color => {
    const colorEl = document.createElement('div');
    colorEl.className = 'palette-color';
    colorEl.style.backgroundColor = color;
    colorEl.dataset.color = color;
    colorEl.addEventListener('click', () => {
      currentColor = color;
      updateDisplay();
    });
    paletteContainer.appendChild(colorEl);
  });
}

function updateDisplay() {
  colorPreview.style.backgroundColor = currentColor;
  hexInput.value = currentColor.toUpperCase();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy', 1500);
  });
}

function savePalette() {
  const palettes = JSON.parse(localStorage.getItem('savedPalettes') || '[]');
  palettes.push({
    id: Date.now(),
    colors: [...generatedPalette],
    date: new Date().toISOString()
  });
  localStorage.setItem('savedPalettes', JSON.stringify(palettes));
  loadSavedPalettes();
}

function loadSavedPalettes() {
  const palettes = JSON.parse(localStorage.getItem('savedPalettes') || '[]');
  savedPalettesContainer.innerHTML = '';
  
  palettes.forEach(palette => {
    const paletteEl = document.createElement('div');
    paletteEl.className = 'saved-palette';
    
    const colorsContainer = document.createElement('div');
    colorsContainer.className = 'saved-colors';
    
    palette.colors.forEach(color => {
      const colorEl = document.createElement('div');
      colorEl.className = 'saved-color';
      colorEl.style.backgroundColor = color;
      colorEl.addEventListener('click', () => {
        currentColor = color;
        updateDisplay();
        generateScheme();
      });
      colorsContainer.appendChild(colorEl);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-palette';
    deleteBtn.innerHTML = '×';
    deleteBtn.addEventListener('click', () => deletePalette(palette.id));
    
    paletteEl.appendChild(colorsContainer);
    paletteEl.appendChild(deleteBtn);
    savedPalettesContainer.appendChild(paletteEl);
  });
}

function deletePalette(id) {
  const palettes = JSON.parse(localStorage.getItem('savedPalettes') || '[]');
  const filtered = palettes.filter(p => p.id !== id);
  localStorage.setItem('savedPalettes', JSON.stringify(filtered));
  loadSavedPalettes();
}

function checkContrast() {
  const bg = bgColorInput.value;
  const text = textColorInput.value;
  
  const getLuminance = (hex) => {
    const rgb = hexToRgb(hex);
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const l1 = getLuminance(bg);
  const l2 = getLuminance(text);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  const ratioDisplay = ratio.toFixed(2);
  const passes = ratio >= 4.5;
  
  contrastResult.className = 'contrast-result ' + (passes ? 'pass' : 'fail');
  contrastResult.innerHTML = `
    Contrast Ratio: ${ratioDisplay}:1<br>
    ${passes ? '✓ Passes WCAG AA' : '✗ Fails WCAG AA'}
  `;
}
```

This JavaScript handles all the core functionality including color picking from pages, scheme generation, palette storage, and contrast checking.

---

## Creating the Background Service Worker (background.js) {#background-js}

For Manifest V3, we need a background service worker to handle certain events:

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Color Palette Generator extension installed');
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getColors') {
    // Process color requests
    sendResponse({ status: 'received' });
  }
  return true;
});
```

---

## Creating Extension Icons {#icons}

For a production extension, you'll need proper icons. Create simple colored icons or use a tool to generate them. The icons should be PNG files at 16x16, 48x48, and 128x128 pixels.

For development, you can use placeholder icons or create simple colored squares using any image editor.

---

## Testing Your Extension {#testing}

Now let's test our extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension folder
4. Click the extension icon in the toolbar to open the popup

You should see the Color Palette Generator interface. Try these features:

- Click "Pick Color from Page" to extract colors from the current website
- Click different scheme buttons to generate color harmonies
- Save palettes and see them appear in the saved section
- Use the contrast checker to test text readability

---

## Publishing to the Chrome Web Store {#publishing}

Once your extension is working, follow these steps to publish:

1. **Prepare your extension**: Ensure all files are in place and manifest is correct
2. **Create a ZIP file**: Compress your extension folder
3. **Go to Chrome Web Store Developer Dashboard**: https://chrome.google.com/webstore/devconsole
4. **Create a new item**: Upload your ZIP file
5. **Fill in details**: Add description, screenshots, and category
6. **Submit for review**: Google will review your extension (usually takes a few hours to a few days)

Make sure your extension follows Google's policies to avoid rejection.

---

## Advanced Features to Consider {#advanced-features}

Once you have the basic extension working, consider adding:

- **Color history**: Automatically save recently used colors
- **Export options**: Export palettes as CSS variables, JSON, or image
- **Keyboard shortcuts**: Add keyboard shortcuts for quick access
- **Sync across devices**: Use chrome.storage.sync to save palettes to the cloud
- **Color blindness simulation**: Show how colors appear to people with different types of color blindness
- **Gradient generation**: Create color gradients between two colors

---

## Conclusion {#conclusion}

Congratulations! You've built a fully functional Color Palette Generator Chrome Extension. This extension demonstrates many important concepts:

- Manifest V3 configuration
- Popup interface design
- DOM manipulation through content scripts
- Local storage for data persistence
- Color theory and scheme generation
- Accessibility testing (contrast checking)

These skills form a solid foundation for building many other types of Chrome extensions. The color utility niche is competitive but has room for well-designed tools with unique features.

Consider adding your own unique features to differentiate your extension from existing color tools. Perhaps integrate with design tools like Figma or Sketch, add color naming using AI, or create a community feature where users can share palettes.

The Chrome extension ecosystem continues to grow, and utilities like color palette generators remain popular because they solve real problems for designers and developers. Your extension is now ready to help thousands of users create beautiful color schemes!

---

## Additional Resources {#resources}

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Web Store Publishing Guide](https://developer.chrome.com/docs/webstore/publish/)
- [Color Theory Basics](https://www.colormatters.com/color-theory-basics)
- [WCAG Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

Start building today and share your creation with the world!
