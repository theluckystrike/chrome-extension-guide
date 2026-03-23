---
layout: default
title: "Chrome Extension Color Picker. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-color-picker/"
---
Build a Color Picker Extension

What You'll Build {#what-youll-build}
- Pick any color from any web page
- Copy in HEX, RGB, HSL formats
- Save color palettes
- View recently picked colors
- Keyboard shortcut: Alt+Shift+C

Manifest {#manifest}
- permissions: activeTab, storage, clipboardWrite
- commands with Alt+Shift+C shortcut
- action with popup

---

Step 1: EyeDropper API (Modern Browsers) {#step-1-eyedropper-api-modern-browsers}

Chrome 95+ supports the native EyeDropper API:

```javascript
async function pickColor() {
  const eyeDropper = new EyeDropper();
  const result = await eyeDropper.open();
  return result.sRGBHex; // "#ff0000"
}
```

Must be triggered from user gesture. For broader compatibility, use a content script:

```javascript
document.addEventListener('mousemove', (e) => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const color = getComputedStyle(el).backgroundColor;
});
```

---

Step 2: Magnifier Overlay {#step-2-magnifier-overlay}

Inject a picker with crosshair:

```javascript
const magnifier = document.createElement('div');
magnifier.innerHTML = '<div class="crosshair"></div><div class="preview"></div>';
document.body.appendChild(magnifier);

document.addEventListener('mousemove', (e) => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  magnifier.querySelector('.preview').style.background = getComputedStyle(el).backgroundColor;
});
```

Style: 10x zoom canvas, crosshair at center, position fixed, z-index 999999.

---

Step 3: Color Conversion {#step-3-color-conversion}

```javascript
export function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
```

---

Step 4: Popup UI {#step-4-popup-ui}

```html
<div class="picker-popup">
  <div class="current-color">
    <div id="color-swatch"></div>
    <div class="color-values">
      <button class="format-btn active" data-format="hex">HEX</button>
      <button class="format-btn" data-format="rgb">RGB</button>
      <button class="format-btn" data-format="hsl">HSL</button>
      <div id="color-value">#3498db</div>
    </div>
  </div>
  <button id="pick-btn">Pick Color</button>
  <button id="copy-btn">Copy to Clipboard</button>
  <div class="recent-colors"><h3>Recent</h3><div id="recent-grid"></div></div>
  <div class="palette-section"><h3>Palette</h3><button id="save-btn">Save</button></div>
</div>
```

---

Step 5: Palette Storage {#step-5-palette-storage}

Use `@theluckystrike/webext-storage`:

```javascript
import { storage } from '@theluckystrike/webext-storage';

async function saveToPalette(name, color) {
  const palettes = await storage.get('colorPalettes') || {};
  (palettes[name] ||= []).push(color);
  await storage.set('colorPalettes', palettes);
}

function exportAsCssVars(name, colors) {
  return `:root {\n${colors.map((c, i) => `--${name}-${i + 1}: ${c};`).join('\n')}\n}`;
}
```

---

Step 6: Keyboard Shortcut {#step-6-keyboard-shortcut}

manifest.json:
```json
{
  "commands": {
    "pick-color": {
      "suggested_key": { "default": "Alt+Shift+C", "mac": "Alt+Shift+C" },
      "description": "Pick a color from the page"
    }
  }
}
```

background.js:
```javascript
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'pick-color') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'start-picker' });
  }
});
```

Works via activeTab, must be user-triggered. Set at chrome://extensions/shortcuts.

---

Cross-References {#cross-references}

- [activeTab Permission](./permissions/activeTab.md). Overview of activeTab
- [clipboardWrite Permission](./permissions/clipboardWrite.md). Copying colors to clipboard
- [Clipboard Patterns](./patterns/clipboard-patterns.md). Best practices for clipboard operations

---

Summary {#summary}

You built a color picker extension with EyeDropper API + fallback content script, color conversion (HEX/RGB/HSL), popup UI with format switching, palette storage and export, and keyboard shortcut (Alt+Shift+C). Test at chrome://extensions/ with Developer mode enabled.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
