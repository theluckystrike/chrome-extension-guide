---
layout: default
title: "Chrome Extension DOM Inspector. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-dom-inspector/"
last_modified_at: 2026-01-15
---
Building a DOM Inspector Extension

This tutorial walks through building a Chrome extension that lets users inspect DOM elements on any webpage, hover to highlight, view element details, and copy selectors.

Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create `manifest.json` with the `activeTab` permission for minimal access:

```json
{
  "manifest_version": 3,
  "name": "DOM Inspector",
  "version": "1.0",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_title": "Toggle Inspector"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

Step 2: Toggle Inspect Mode {#step-2-toggle-inspect-mode}

Handle the browser action click in `background.js` to inject the content script:

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});
```

Step 3: Hover Overlay Highlighting {#step-3-hover-overlay-highlighting}

In `content.js`, create an overlay that highlights elements on hover:

```javascript
let isInspecting = false;
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;background:rgba(66,133,244,0.2);border:2px solid #4285f4;';

document.addEventListener('mouseover', (e) => {
  if (!isInspecting || e.target.closest('[data-dom-inspector]')) return;
  const rect = e.target.getBoundingClientRect();
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  document.body.appendChild(overlay);
});
```

Step 4: Element Info Panel {#step-4-element-info-panel}

Show element details on click, tag name, classes, id, dimensions, computed styles:

```javascript
document.addEventListener('click', (e) => {
  if (!isInspecting) return;
  const info = createInfoPanel(e.target);
  document.body.appendChild(info);
});

function createInfoPanel(el) {
  const panel = document.createElement('div');
  panel.setAttribute('data-dom-inspector', 'panel');
  const styles = window.getComputedStyle(el);
  panel.innerHTML = `
    <strong>${el.tagName.toLowerCase()}</strong><br>
    ID: ${el.id || 'none'}<br>
    Classes: ${el.className || 'none'}<br>
    Size: ${el.offsetWidth}x${el.offsetHeight}<br>
    Color: ${styles.color}
  `;
  return panel;
}
```

Step 5: Generate CSS Selector {#step-5-generate-css-selector}

Build a unique CSS selector for any element:

```javascript
function getCssSelector(el) {
  if (el.id) return `#${el.id}`;
  let selector = el.tagName.toLowerCase();
  if (el.className) {
    selector += '.' + el.className.trim().split(' ')[0];
  }
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter(
      (e) => e.tagName === el.tagName
    );
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      selector += `:nth-of-type(${index})`;
    }
  }
  return getCssSelector(parent) + ' > ' + selector;
}
```

Step 6: Generate XPath {#step-6-generate-xpath}

Create an XPath for element selection:

```javascript
function getXPath(el) {
  if (el.id) return `//*[@id="${el.id}"]`;
  if (el === document.body) return '/html/body';
  let index = 1;
  const siblings = el.parentNode?.childNodes || [];
  for (const sib of siblings) {
    if (sib === el) break;
    if (sib.nodeType === 1 && sib.tagName === el.tagName) index++;
  }
  return `${getXPath(el.parentElement)}/${el.tagName.toLowerCase()}[${index}]`;
}
```

Step 7: DOM Tree Hierarchy View {#step-7-dom-tree-hierarchy-view}

Display parent hierarchy up to body:

```javascript
function getHierarchy(el) {
  const hierarchy = [];
  let current = el;
  while (current && current !== document.body) {
    hierarchy.unshift(current.tagName.toLowerCase());
    current = current.parentElement;
  }
  hierarchy.unshift('body');
  return hierarchy.join(' > ');
}
```

Step 8: Clipboard Operations {#step-8-clipboard-operations}

Copy selector, XPath, or HTML to clipboard:

```javascript
async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'c' && e.ctrlKey) {
    copyToClipboard(getCssSelector(document.querySelector('.selected')));
  }
  if (e.key === 'Escape') {
    isInspecting = false;
    overlay.remove();
  }
});
```

Performance & UX Tips {#performance-ux-tips}

- Throttle mousemove: Use `requestAnimationFrame` or lodash throttle to limit hover updates
- Exclude extension elements: Use `e.target.closest('[data-dom-inspector]')` to skip overlay UI
- Keyboard navigation: Arrow keys to move up/down the DOM tree
- Scroll offset: Account for `window.scrollY` and `window.scrollX` in overlay positioning

Related Patterns {#related-patterns}

- See [DOM Observer Patterns](/patterns/dom-observer-patterns.md) for mutation tracking
- See [Clipboard Patterns](/patterns/clipboard-patterns.md) for advanced copy operations
- See [Dynamic Content Injection](/patterns/dynamic-content-injection.md) for script injection
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
