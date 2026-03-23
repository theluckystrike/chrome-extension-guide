---
layout: default
title: "Chrome Extension Element Hider. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-element-hider/"
---
# Build an Element Hider Extension

In this tutorial, we'll build a Chrome extension that lets users click to hide any page element, with persistent storage per site.

Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create `manifest.json` with `activeTab` and `storage` permissions:

```json
{
  "manifest_version": 3,
  "name": "Element Hider",
  "version": "1.0",
  "permissions": ["activeTab", "storage"],
  "action": { "default_popup": "popup.html" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

Step 2: Toggle Hide Mode {#step-2-toggle-hide-mode}

Add a browser action popup (`popup.html` + `popup.js`) with a toggle button to enable/disable hide mode. When enabled, the extension icon changes state.

Step 3: Hover Highlight (Content Script) {#step-3-hover-highlight-content-script}

In `content.js`, add mouseover/mouseout listeners to highlight elements:

```javascript
document.addEventListener('mouseover', (e) => {
  if (!hideModeEnabled) return;
  e.target.style.outline = '2px solid red';
});

document.addEventListener('mouseout', (e) => {
  e.target.style.outline = '';
});
```

Step 4: Click to Hide {#step-4-click-to-hide}

On click, set `element.style.display = 'none'` and capture the element's CSS selector:

```javascript
document.addEventListener('click', (e) => {
  if (!hideModeEnabled) return;
  e.preventDefault();
  hideElement(e.target);
});
```

Step 5: Generate Unique CSS Selector {#step-5-generate-unique-css-selector}

Create a function to generate a solid CSS selector:

```javascript
function generateSelector(element) {
  if (element.id) return `#${element.id}`;
  let path = [];
  while (element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.tagName.toLowerCase();
    if (element.className) {
      selector += '.' + element.className.trim().split(/\s+/).join('.');
    }
    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(' > ');
}
```

Step 6: Save to Storage {#step-6-save-to-storage}

Store hidden selectors per domain:

```javascript
async function saveHiddenElement(selector) {
  const domain = window.location.hostname;
  const key = `hidden_${domain}`;
  const stored = await chrome.storage.local.get(key);
  const hidden = stored[key] || [];
  hidden.push({ selector, timestamp: Date.now() });
  await chrome.storage.local.set({ [key]: hidden });
}
```

Step 7: Auto-Apply on Page Revisit {#step-7-auto-apply-on-page-revisit}

On page load, retrieve saved selectors and inject CSS to hide them:

```javascript
async function applyHiddenElements() {
  const domain = window.location.hostname;
  const stored = await chrome.storage.local.get(`hidden_${domain}`);
  const hidden = stored[`hidden_${domain}`] || [];
  
  const style = document.createElement('style');
  style.textContent = hidden.map(h => `${h.selector} { display: none !important; }`).join('\n');
  document.head.appendChild(style);
}
```

Step 8: Management UI {#step-8-management-ui}

In the popup, list hidden elements per site with restore buttons. Add:

- Undo last hide: Remove the most recent selector from storage
- Clear all: Remove all hidden elements for current domain

Handling Dynamic Content {#handling-dynamic-content}

Use `MutationObserver` to reapply hiding rules when DOM changes:

```javascript
const observer = new MutationObserver(() => {
  applyHiddenElements();
});
observer.observe(document.body, { childList: true, subtree: true });
```

Cross-References {#cross-references}

- See [Content Script Patterns](../guides/content-script-patterns.md) for communication strategies
- See [DOM Observer Patterns](../patterns/dom-observer-patterns.md) for dynamic content handling
- See [Storage API Deep Dive](../api-reference/storage-api-deep detailed look.md) for storage optimization
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
