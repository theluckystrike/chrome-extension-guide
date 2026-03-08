---
layout: default
title: "Chrome Extension Color Palette Extractor — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-color-palette-extractor/"
---
# Build a Color Palette Extractor

## What You'll Build
- Extract dominant colors from any web page
- Analyze backgrounds, text, borders, and images
- Copy individual colors or full palette
- Export as CSS variables, JSON, or image
- Color naming and WCAG contrast checking
- Format toggle: HEX, RGB, HSL

## Manifest
- permissions: activeTab, scripting, clipboardWrite
- action with popup
- host_permissions: \<all_urls\> for image analysis

---

## Step 1: Manifest Configuration

```json
{
  "name": "Color Palette Extractor",
  "version": "1.0",
  "permissions": ["activeTab", "scripting", "clipboardWrite"],
  "host_permissions": ["\<all_urls\>"],
  "action": { "default_popup": "popup.html" },
  "content_scripts": [{
    "matches": ["\<all_urls\>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

---

## Step 2: Content Script - Color Scanning

Scan page elements for colors using getComputedStyle:

```javascript
// content.js
function extractPageColors() {
  const colors = new Set();
  const elements = document.querySelectorAll('*');
  
  for (const el of elements) {
    const style = getComputedStyle(el);
    
    // Background colors
    if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      colors.add(style.backgroundColor);
    }
    
    // Text colors
    if (style.color && style.color !== 'rgb(0, 0, 0)') {
      colors.add(style.color);
    }
    
    // Border colors
    if (style.borderColor && style.borderColor !== 'rgb(0, 0, 0)') {
      colors.add(style.borderColor);
    }
  }
  
  return Array.from(colors).map(rgbToHex).filter(Boolean);
}
```

---

## Step 3: Image Color Extraction

Sample pixels from images using canvas:

```javascript
async function extractImageColors(images) {
  const colorCounts = {};
  
  for (const img of images) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50;
    canvas.height = 50;
    
    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    
    for (let i = 0; i < data.length; i += 4) {
      const hex = rgbToHex(`rgb(${data[i]},${data[i+1]},${data[i+2]})`);
      if (hex) colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }
  }
  
  return Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([color]) => color);
}
```

---

## Step 4: Color Analysis

Group similar colors and sort by frequency:

```javascript
function analyzeColors(colors) {
  const groups = {};
  
  for (const color of colors) {
    const hsl = hexToHsl(color);
    const hueBucket = Math.floor(hsl.h / 30) * 30;
    const key = `${hueBucket}-${hsl.s < 30 ? 'low' : hsl.s < 70 ? 'mid' : 'high'}`;
    (groups[key] ||= []).push({ color, count: 1 });
  }
  
  return Object.values(groups)
    .map(group => {
      const total = group.reduce((sum, c) => sum + c.count, 0);
      return {
        dominant: group.sort((a, b) => b.count - a.count)[0].color,
        count: total,
        colors: group.map(g => g.color)
      };
    })
    .sort((a, b) => b.count - a.count);
}
```

---

## Step 5: Popup UI

```html
<div class="palette-popup">
  <h2>Color Palette</h2>
  <div class="format-toggle">
    <button class="format-btn active" data-format="hex">HEX</button>
    <button class="format-btn" data-format="rgb">RGB</button>
    <button class="format-btn" data-format="hsl">HSL</button>
  </div>
  <div id="palette-grid" class="palette-grid"></div>
  <div class="actions">
    <button id="copy-all">Copy All</button>
    <select id="export-format">
      <option value="css">CSS Variables</option>
      <option value="json">JSON</option>
      <option value="image">PNG Image</option>
    </select>
    <button id="export-btn">Export</button>
  </div>
  <div id="contrast-checker" class="contrast-section">
    <h3>WCAG Contrast</h3>
    <div id="contrast-results"></div>
  </div>
</div>
```

---

## Step 6: Color Format Toggle

```javascript
let currentFormat = 'hex';

document.querySelectorAll('.format-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFormat = btn.dataset.format;
    renderPalette();
  });
});

function formatColor(hex) {
  const rgb = hexToRgb(hex);
  const hsl = hexToHsl(hex);
  
  switch (currentFormat) {
    case 'hex': return hex;
    case 'rgb': return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case 'hsl': return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  }
}
```

---

## Step 7: Copy to Clipboard

```javascript
async function copyColor(hex) {
  const formatted = formatColor(hex);
  await navigator.clipboard.writeText(formatted);
  showToast(`Copied: ${formatted}`);
}

async function copyFullPalette(colors) {
  const text = colors.map(c => formatColor(c)).join('\n');
  await navigator.clipboard.writeText(text);
  showToast('Copied all colors!');
}
```

---

## Step 8: Export Palette

```javascript
function exportAsCss(colors) {
  return `:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}\n}`;
}

function exportAsJson(colors) {
  return JSON.stringify({ palette: colors.map(c => ({
    hex: c,
    rgb: formatColor(c),
    name: getColorName(c)
  }))}, null, 2);
}

function exportAsImage(colors) {
  const canvas = document.createElement('canvas');
  canvas.width = colors.length * 60;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  
  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * 60, 0, 60, 60);
    ctx.fillStyle = '#000';
    ctx.fillText(color, i * 60 + 5, 75, 55);
  });
  
  return canvas.toDataURL('image/png');
}
```

---

## Bonus: Color Naming & Contrast

```javascript
function getColorName(hex) {
  const names = {
    '#ff0000': 'Red', '#00ff00': 'Green', '#0000ff': 'Blue',
    '#ffff00': 'Yellow', '#ff00ff': 'Magenta', '#00ffff': 'Cyan',
    '#ffffff': 'White', '#000000': 'Black', '#808080': 'Gray'
  };
  return names[hex.toLowerCase()] || 'Custom';
}

function checkWcagContrast(fg, bg) {
  const l1 = getLuminance(hexToRgb(fg));
  const l2 = getLuminance(hexToRgb(bg));
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return {
    ratio: ratio.toFixed(2),
    aa: ratio >= 4.5,
    aaa: ratio >= 7
  };
}
```

---

## Cross-References

- [Clipboard Patterns](../patterns/clipboard-patterns.md) — Copy colors to clipboard
- [Content Script Patterns](../guides/content-script-patterns.md) — Page scanning techniques
- [Accessibility Guide](../guides/accessibility.md) — WCAG compliance checking

---

## Summary

You built a color palette extractor with activeTab permissions, content script scanning (getComputedStyle), image pixel sampling via canvas, color grouping and sorting, popup UI with format toggle, clipboard operations, and export options (CSS/JSON/PNG). Includes color naming and WCAG contrast checking. Test at chrome://extensions/ with Developer mode enabled.
