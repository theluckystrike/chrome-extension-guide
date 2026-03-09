---
layout: post
title: "Build a Color Picker Chrome Extension: Eye Dropper and Palette Generator"
description: "Learn to build a color picker Chrome extension with eye dropper functionality and palette generator. Complete tutorial with code examples."
date: 2025-04-08
categories: [Chrome Extensions, Tutorials]
tags: [color-picker, design, chrome-extension]
keywords: "chrome extension color picker, build eye dropper extension, color picker chrome, chrome extension eyedropper, color palette chrome extension"
---

# Build a Color Picker Chrome Extension: Eye Dropper and Palette Generator

Color is one of the most powerful design elements in web development and digital design. Whether you're a web designer, frontend developer, or digital artist, having quick access to color picking tools can dramatically improve your workflow. In this comprehensive tutorial, we'll walk through building a fully functional Chrome extension that combines an eye dropper tool with a palette generator, giving users the ability to pick colors from any webpage and generate harmonious color palettes automatically.

Chrome extensions are the perfect platform for this type of tool because they can access webpage content directly, run in the background, and provide a persistent popup interface. By the end of this guide, you'll have a complete understanding of how to implement color picking functionality using the EyeDropper API, how to generate color palettes using color theory algorithms, and how to package everything as a production-ready Chrome extension.

---

## Why Build a Color Picker Extension? {#why-build-color-picker}

The demand for color picker tools in browsers has never been higher. Designers and developers constantly need to extract colors from websites, create color schemes for new projects, and maintain consistency across their work. While there are several color picker extensions already available in the Chrome Web Store, building your own gives you complete control over features, design, and functionality.

A well-designed color picker extension solves multiple problems simultaneously. First, it provides instant access to an eye dropper tool that can sample any color visible on the screen. Second, it offers palette generation capabilities that help users discover complementary, analogous, triadic, and other color harmonies. Third, it allows users to save and manage their favorite colors for future reference. Building these features from scratch is an excellent learning exercise that teaches you about Chrome extension architecture, the EyeDropper API, and practical JavaScript color manipulation.

From a practical standpoint, color picker extensions are also highly monetizable. Many designers and developers are willing to pay for premium features like cloud sync, advanced palette algorithms, and integration with design tools like Figma or Adobe XD. Starting with a solid foundation in this tutorial gives you the opportunity to expand and monetize your creation in the future.

---

## Project Overview and Features {#project-overview}

Before diving into the code, let's outline what our color picker Chrome extension will accomplish. This project will include three core features that make it useful for designers and developers.

The first feature is the eye dropper tool, which uses the native EyeDropper API to allow users to pick any color from their screen. This API is relatively new in Chrome and provides a standardized way to access the system's color sampling functionality. Users simply click the eyedropper button, then click anywhere on their screen to capture the color at that exact pixel location.

The second feature is the color palette generator, which takes a base color and generates harmonious color schemes based on color theory principles. We'll implement several algorithms including complementary colors (colors opposite on the color wheel), analogous colors (colors adjacent on the color wheel), triadic colors (three colors evenly spaced on the color wheel), and split-complementary colors. This gives users instant access to professional-grade color harmonies.

The third feature is color management functionality that lets users save colors to a personal library, copy color values in various formats (HEX, RGB, HSL), and organize colors into named collections. This makes the extension practical for long-term use rather than just a one-time color sampling tool.

---

## Setting Up the Project Structure {#project-structure}

Every Chrome extension needs a specific file structure to function properly. Let's set up the foundation for our color picker extension. Create a new folder for your project and add the following files: manifest.json, popup.html, popup.js, popup.css, and icons folder for the extension icon.

The manifest.json file is the most critical component because it tells Chrome about your extension's capabilities and permissions. For our color picker extension, we'll use Manifest V3, which is the current standard for Chrome extensions. Here's what the manifest will look like:

```json
{
  "manifest_version": 3,
  "name": "Color Picker Pro",
  "version": "1.0",
  "description": "Pick colors from any webpage and generate beautiful color palettes",
  "permissions": ["activeTab"],
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

This manifest file defines our extension with basic permissions. The activeTab permission allows us to access the current tab when needed, which is essential for the eye dropper functionality. We're using a popup-based interface, which means users will interact with our extension through a small popup window that appears when they click the extension icon.

---

## Creating the Popup Interface {#popup-interface}

The popup HTML file defines the user interface that users see when they click our extension icon. We need to design an intuitive interface that makes color picking and palette generation effortless. Let's create a clean, modern design using HTML and CSS.

The popup should include several key sections. At the top, we need a prominent eye dropper button that activates the color picking mode. Below that, we'll display the currently selected color in multiple formats (HEX, RGB, and HSL) so users can easily copy whichever format they need. The palette generation section should offer buttons for different color harmony types, and the saved colors section should display a grid of colors the user has collected.

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
    
    <section class="picker-section">
      <button id="eyedropper-btn" class="primary-btn">
        <span class="icon">🎨</span>
        Pick Color
      </button>
    </section>
    
    <section class="color-display">
      <div class="color-preview" id="color-preview"></div>
      <div class="color-values">
        <div class="color-value">
          <label>HEX</label>
          <input type="text" id="hex-value" readonly>
          <button class="copy-btn" data-target="hex-value">Copy</button>
        </div>
        <div class="color-value">
          <label>RGB</label>
          <input type="text" id="rgb-value" readonly>
          <button class="copy-btn" data-target="rgb-value">Copy</button>
        </div>
        <div class="color-value">
          <label>HSL</label>
          <input type="text" id="hsl-value" readonly>
          <button class="copy-btn" data-target="hsl-value">Copy</button>
        </div>
      </div>
    </section>
    
    <section class="palette-section">
      <h2>Generate Palette</h2>
      <div class="palette-buttons">
        <button class="palette-btn" data-type="complementary">Complementary</button>
        <button class="palette-btn" data-type="analogous">Analogous</button>
        <button class="palette-btn" data-type="triadic">Triadic</button>
        <button class="palette-btn" data-type="split-complementary">Split-Comp</button>
        <button class="palette-btn" data-type="tetradic">Tetradic</button>
      </div>
      <div class="palette-colors" id="palette-colors"></div>
    </section>
    
    <section class="saved-colors-section">
      <div class="section-header">
        <h2>Saved Colors</h2>
        <button id="save-color-btn" class="secondary-btn">Save Current</button>
      </div>
      <div class="saved-colors" id="saved-colors"></div>
    </section>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides a clean, organized interface with clearly defined sections for each major feature. The semantic HTML makes the extension accessible and easy to style with CSS.

---

## Styling the Extension {#styling-extension}

The CSS file should create a polished, professional appearance that matches Chrome's design language while standing out as a useful tool. We'll use modern CSS features like Flexbox and CSS custom properties to create a responsive, maintainable stylesheet.

```css
:root {
  --primary-color: #4285f4;
  --primary-hover: #3367d6;
  --background: #ffffff;
  --surface: #f8f9fa;
  --border: #e0e0e0;
  --text-primary: #202124;
  --text-secondary: #5f6368;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  --radius: 8px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  background: var(--background);
  color: var(--text-primary);
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

section {
  margin-bottom: 20px;
}

.primary-btn {
  width: 100%;
  padding: 12px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
}

.primary-btn:hover {
  background: var(--primary-hover);
}

.secondary-btn {
  padding: 8px 16px;
  background: var(--surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-btn:hover {
  background: var(--border);
}

.color-preview {
  width: 100%;
  height: 80px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  margin-bottom: 12px;
  background: #cccccc;
}

.color-values {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-value label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  width: 36px;
}

.color-value input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.copy-btn {
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.copy-btn:hover {
  background: var(--border);
}

.palette-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.palette-btn {
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.palette-btn:hover, .palette-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.palette-colors {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.palette-color {
  width: 48px;
  height: 48px;
  border-radius: var(--radius);
  cursor: pointer;
  border: 1px solid var(--border);
  transition: transform 0.2s;
}

.palette-color:hover {
  transform: scale(1.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h2 {
  font-size: 14px;
  font-weight: 600;
}

.saved-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 48px;
}

.saved-color {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  cursor: pointer;
  border: 1px solid var(--border);
  position: relative;
}

.saved-color .delete-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ff4444;
  color: white;
  border: none;
  font-size: 10px;
  cursor: pointer;
  display: none;
}

.saved-color:hover .delete-btn {
  display: block;
}
```

This CSS provides a clean, professional interface that matches Chrome's design aesthetic. The use of CSS custom properties makes it easy to theme and modify colors later if needed.

---

## Implementing the JavaScript Logic {#javascript-logic}

The JavaScript file is where the core functionality comes to life. We'll implement the EyeDropper API integration, color conversion functions, palette generation algorithms, and local storage for saving colors. This is the most complex part of the extension, so let's break it down into manageable sections.

First, let's implement the color conversion utilities that will be used throughout the extension. Colors can be represented in multiple formats, and we need to convert between them seamlessly:

```javascript
// Color conversion utilities
const ColorUtils = {
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  },

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
    return { h: h * 360, s: s * 100, l: l * 100 };
  },

  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }
};
```

Now let's implement the palette generation algorithms based on color theory:

```javascript
// Palette generation algorithms
const PaletteGenerator = {
  generate(baseColor, type) {
    const rgb = ColorUtils.hexToRgb(baseColor);
    const hsl = ColorUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);
    let colors = [];

    switch (type) {
      case 'complementary':
        colors = [
          baseColor,
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l)))
        ];
        break;

      case 'analogous':
        colors = [
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h - 30 + 360) % 360, hsl.s, hsl.l))),
          baseColor,
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l)))
        ];
        break;

      case 'triadic':
        colors = [
          baseColor,
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l))),
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l)))
        ];
        break;

      case 'split-complementary':
        colors = [
          baseColor,
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h + 150) % 360, hsl.s, hsl.l))),
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h + 210) % 360, hsl.s, hsl.l)))
        ];
        break;

      case 'tetradic':
        colors = [
          baseColor,
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h + 90) % 360, hsl.s, hsl.l))),
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l))),
          ColorUtils.rgbToHex(...Object.values(ColorUtils.hslToRgb((hsl.h + 270) % 360, hsl.s, hsl.l)))
        ];
        break;
    }

    return colors;
  }
};
```

Now let's wire up the main application logic that handles user interactions:

```javascript
// Main application state
let currentColor = '#4285f4';
let savedColors = JSON.parse(localStorage.getItem('savedColors') || '[]');

// DOM Elements
const eyedropperBtn = document.getElementById('eyedropper-btn');
const colorPreview = document.getElementById('color-preview');
const hexValue = document.getElementById('hex-value');
const rgbValue = document.getElementById('rgb-value');
const hslValue = document.getElementById('hsl-value');
const paletteColors = document.getElementById('palette-colors');
const savedColorsContainer = document.getElementById('saved-colors');
const saveColorBtn = document.getElementById('save-color-btn');
const paletteBtns = document.querySelectorAll('.palette-btn');
const copyBtns = document.querySelectorAll('.copy-btn');

// Initialize
function init() {
  updateColorDisplay(currentColor);
  renderSavedColors();
}

// Update color display
function updateColorDisplay(hex) {
  currentColor = hex;
  const rgb = ColorUtils.hexToRgb(hex);
  const hsl = ColorUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);

  colorPreview.style.background = hex;
  hexValue.value = hex.toUpperCase();
  rgbValue.value = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
  hslValue.value = `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}

// Eye dropper functionality
if ('EyeDropper' in window) {
  eyedropperBtn.addEventListener('click', async () => {
    const eyeDropper = new EyeDropper();
    try {
      const result = await eyeDropper.open();
      updateColorDisplay(result.sRGBHex);
    } catch (e) {
      console.log('User canceled color picking');
    }
  });
} else {
  eyedropperBtn.textContent = 'Not Supported';
  eyedropperBtn.disabled = true;
}

// Palette generation
paletteBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    paletteBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const type = btn.dataset.type;
    const colors = PaletteGenerator.generate(currentColor, type);
    
    paletteColors.innerHTML = '';
    colors.forEach(color => {
      const colorEl = document.createElement('div');
      colorEl.className = 'palette-color';
      colorEl.style.background = color;
      colorEl.title = color;
      colorEl.addEventListener('click', () => updateColorDisplay(color));
      paletteColors.appendChild(colorEl);
    });
  });
});

// Copy functionality
copyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const targetInput = document.getElementById(targetId);
    targetInput.select();
    document.execCommand('copy');
    
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = originalText, 1500);
  });
});

// Save color functionality
saveColorBtn.addEventListener('click', () => {
  if (!savedColors.includes(currentColor)) {
    savedColors.push(currentColor);
    localStorage.setItem('savedColors', JSON.stringify(savedColors));
    renderSavedColors();
  }
});

function renderSavedColors() {
  savedColorsContainer.innerHTML = '';
  savedColors.forEach((color, index) => {
    const colorEl = document.createElement('div');
    colorEl.className = 'saved-color';
    colorEl.style.background = color;
    colorEl.title = color;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      savedColors.splice(index, 1);
      localStorage.setItem('savedColors', JSON.stringify(savedColors));
      renderSavedColors();
    });
    
    colorEl.addEventListener('click', () => updateColorDisplay(color));
    colorEl.appendChild(deleteBtn);
    savedColorsContainer.appendChild(colorEl);
  });
}

// Initialize on load
init();
```

This JavaScript code provides the complete functionality for our color picker extension. The EyeDropper API integration allows users to pick colors from anywhere on their screen, the color conversion utilities handle all the necessary format conversions, and the palette generator creates beautiful color harmonies based on color theory principles.

---

## Testing Your Extension {#testing-extension}

Before publishing your extension, you need to test it thoroughly to ensure everything works correctly. Chrome provides a simple way to load unpacked extensions for testing. Open Chrome and navigate to chrome://extensions/. Enable "Developer mode" using the toggle in the top right corner, then click "Load unpacked" and select your extension folder.

When testing, verify each feature works as expected. Click the eye dropper button and try selecting colors from different websites. Check that the color values display correctly in all three formats. Test each palette type to ensure the color harmonies look visually appealing. Save several colors and verify they persist after closing and reopening the extension. Test the copy functionality for each color format.

Pay special attention to edge cases, such as what happens when the EyeDropper API is not supported (older browsers or certain configurations). Your code handles this gracefully by disabling the button with an appropriate message, but you should verify this works in environments where the API is unavailable.

---

## Publishing to the Chrome Web Store {#publishing}

Once you've tested your extension and are satisfied with its functionality, you can publish it to the Chrome Web Store. First, you'll need to create a developer account through the Chrome Web Store if you don't already have one. There is a one-time registration fee of $5.

To prepare for publication, create optimized versions of your icons in the required sizes (16x16, 48x48, and 128x128 pixels). Your extension should have a clear, compelling description that explains its features and benefits. Take screenshots or a short video demonstrating the extension in action.

When packaging your extension for upload, use the "Pack extension" button in Chrome's developer tools, or manually create a ZIP file containing all your extension files. Upload this ZIP to the Chrome Web Store developer dashboard, fill in the required metadata, and submit for review. Google typically reviews new extensions within a few days.

---

## Future Enhancements and Monetization {#future-enhancements}

This basic color picker extension provides a solid foundation that you can expand in many directions. Consider adding cloud sync functionality that saves colors to a user's Google account, making them accessible across different devices. Integration with design tools like Figma, Adobe XD, or Sketch would be highly valuable for professional designers.

You could also add advanced features like color history that automatically saves recently picked colors, color blindness simulation to help designers understand how their palettes appear to users with different types of color vision deficiency, and export functionality that generates CSS variables, JSON, or other format files for developers.

Monetization options include a freemium model with basic features free and advanced features requiring payment, a one-time purchase for the full version, or a subscription model that includes cloud sync and regular feature updates. Many successful color picker extensions use a combination of these approaches.

---

## Conclusion {#conclusion}

Building a color picker Chrome extension is an excellent project that teaches you valuable skills in Chrome extension development, JavaScript color manipulation, and modern web development practices. The extension we built in this tutorial provides practical utility for designers and developers while demonstrating how to work with the EyeDropper API, implement color theory algorithms, and create polished user interfaces.

The chrome extension color picker you now have can be extended in countless ways to meet the needs of your target users. Whether you keep it simple with the core features or expand it into a full-featured design tool, this project provides a strong foundation for your Chrome extension development journey. The key to success is listening to user feedback and continuously improving your extension based on how people actually use it in their daily workflow.
