---
layout: default
title: "Chrome Extension CSS Inspector — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-css-inspector/"
---
# Build a CSS Inspector Extension

## What You'll Build {#what-youll-build}
- Hover to inspect any element on a page
- Display computed styles, box model, typography
- Color picker using EyeDropper API
- Copy CSS rules to clipboard
- Generate CSS selector paths
- Inspect Shadow DOM elements

## Step 1: Manifest with activeTab Permission {#step-1-manifest-with-activetab-permission}
```json
{
  "manifest_version": 3,
  "name": "CSS Inspector",
  "version": "1.0.0",
  "permissions": ["activeTab", "clipboardWrite"],
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background.js" }
}
```

## Step 2: Toggle Inspect Mode {#step-2-toggle-inspect-mode}
```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'toggle-inspector' });
});
```

## Step 3: Hover Overlay {#step-3-hover-overlay}
```css
.ext-inspector-overlay {
  position: absolute; border: 2px solid #ff0000;
  pointer-events: none; z-index: 999999;
}
```
```javascript
// content/inspector.js
let isInspecting = false;
const overlay = document.createElement('div');
overlay.className = 'ext-inspector-overlay';
document.body.appendChild(overlay);

document.addEventListener('mouseover', (e) => {
  if (!isInspecting) return;
  const rect = e.target.getBoundingClientRect();
  Object.assign(overlay.style, {
    top: `${rect.top + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`, height: `${rect.height}px`
  });
});
```

## Step 4: Extract Computed Styles {#step-4-extract-computed-styles}
```javascript
function getElementStyles(element) {
  const computed = getComputedStyle(element);
  return {
    display: computed.display,
    position: computed.position,
    width: computed.width, height: computed.height,
    color: computed.color, background: computed.background,
    fontSize: computed.fontSize, fontFamily: computed.fontFamily,
    margin: computed.margin, padding: computed.padding,
    border: computed.border
  };
}
```

## Step 5: Display Panel {#step-5-display-panel}
```javascript
function createInspectPanel() {
  const panel = document.createElement('div');
  panel.className = 'ext-inspector-panel';
  panel.innerHTML = `
    <div class="section"><h4>Box Model</h4><div id="box"></div></div>
    <div class="section"><h4>Typography</h4><div id="type"></div></div>
    <div class="section"><h4>Colors</h4><div id="colors"></div></div>
    <button id="copy-css">Copy CSS</button>`;
  document.body.appendChild(panel);
}
```

## Step 6: Color Picker with EyeDropper API {#step-6-color-picker-with-eyedropper-api}
```javascript
async function pickColor() {
  if (!window.EyeDropper) return null;
  const eyeDropper = new EyeDropper();
  try { return (await eyeDropper.open()).sRGBHex; }
  catch (e) { return null; }
}
```

## Step 7: Copy CSS to Clipboard {#step-7-copy-css-to-clipboard}
```javascript
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showNotification('Copied!'));
}
function generateCssRule(element) {
  const styles = getElementStyles(element);
  const selector = generateSelector(element);
  return `${selector} {\n${Object.entries(styles).map(([k,v])=>`  ${k}: ${v};`).join('\n')}\n}`;
}
```

## Step 8: CSS Selector Path Generator {#step-8-css-selector-path-generator}
```javascript
function generateSelector(element) {
  if (element.id) return `#${element.id}`;
  const parts = [];
  let current = element;
  while (current && current !== document.body) {
    let s = current.tagName.toLowerCase();
    if (current.className) s += `.${current.className.trim().split(/\s+/)[0]}`;
    parts.unshift(s); current = current.parentElement;
  }
  return parts.join(' > ');
}
```

## Shadow DOM Support {#shadow-dom-support}
```javascript
function inspectShadowElement(element) {
  if (element.shadowRoot) {
    const overlay = document.createElement('div');
    overlay.className = 'ext-inspector-overlay';
    element.shadowRoot.appendChild(overlay);
    element.shadowRoot.addEventListener('mouseover', (e) => {
      const rect = e.target.getBoundingClientRect();
      Object.assign(overlay.style, { top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    });
  }
}
```

## Performance: Throttle Mousemove {#performance-throttle-mousemove}
```javascript
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) { func.apply(this, args); inThrottle = true; setTimeout(() => inThrottle = false, limit); }
  };
}
document.addEventListener('mousemove', throttle((e) => { /* handle */ }, 50));
```

## Cleanup: Remove Overlays and Listeners {#cleanup-remove-overlays-and-listeners}
```javascript
function deactivateInspector() {
  isInspecting = false;
  overlay?.remove(); panel?.remove();
  document.querySelectorAll('.ext-inspector-highlight').forEach(el => el.classList.remove('ext-inspector-highlight'));
  document.removeEventListener('mouseover', onMouseOver);
  document.removeEventListener('click', onClick);
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') deactivateInspector(); });
```

## Cross-References {#cross-references}
- [DOM Observer Patterns](./patterns/dom-observer-patterns.md) — Detect dynamic DOM changes
- [Clipboard Patterns](./patterns/clipboard-patterns.md) — Best practices for copy/paste
- [Content Script Patterns](./guides/content-script-patterns.md) — Content script injection strategies

## Summary {#summary}
You built a CSS inspector extension with hover highlighting, computed style extraction, box model/typography/colors display, EyeDropper color picker, CSS rule copying, selector path generation, Shadow DOM support, throttled mousemove for performance, and cleanup on deactivate.
