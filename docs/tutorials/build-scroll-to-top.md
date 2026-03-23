---
layout: default
title: "Chrome Extension Scroll to Top. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-scroll-to-top/"
---
# Build a Scroll-to-Top Button Extension

A floating button that smoothly scrolls to top when clicked, with customizable appearance and per-site preferences.

Prerequisites: Basic JavaScript and Chrome Extensions knowledge.

What We're Building {#what-were-building}
- Floating button appears when scrolled down (threshold: 300px)
- Smooth scroll animation to top of page
- Customizable position, color, size, opacity, shape
- Per-site or global preference storage
- Optional circular progress ring showing scroll position

Step 1: Manifest with Content Script {#step-1-manifest-with-content-script}

Create `manifest.json` with content script running on all URLs:

```json
{
  "manifest_version": 3,
  "name": "Scroll to Top Pro",
  "version": "1.0",
  "permissions": ["storage", "activeTab"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```

Step 2: Floating Button with Shadow DOM {#step-2-floating-button-with-shadow-dom}

Content script creates an isolated button using Shadow DOM to prevent page style conflicts:

```javascript
const button = document.createElement('div');
button.id = 'scroll-top-btn';
button.innerHTML = '<button>↑</button>';
const shadow = button.attachShadow({ mode: 'closed' });
shadow.innerHTML = `
  <style>
    #scroll-top-btn { position: fixed; bottom: 20px; right: 20px; z-index: 999999; }
    button { width: 50px; height: 50px; border-radius: 50%; cursor: pointer; }
  </style>
  <button>↑</button>
`;
document.body.appendChild(button);
```

Step 3: Scroll Listener with Passive Optimization {#step-3-scroll-listener-with-passive-optimization}

Show button when scrolled past 300px, hide otherwise. Use passive listener and requestAnimationFrame:

```javascript
let isVisible = false;
window.addEventListener('scroll', () => {
  requestAnimationFrame(() => {
    const shouldShow = window.scrollY > 300;
    if (shouldShow !== isVisible) {
      isVisible = shouldShow;
      button.style.display = shouldShow ? 'block' : 'none';
    }
  });
}, { passive: true });
```

Step 4: Smooth Scroll Action {#step-4-smooth-scroll-action}

On button click, smoothly scroll to top:

```javascript
button.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
```

Step 5: Popup with Position Options {#step-5-popup-with-position-options}

Add position controls (left/right, offset) in popup.html:

```html
<select id="position">
  <option value="right">Right</option>
  <option value="left">Left</option>
</select>
<input type="number" id="offset" value="20" placeholder="Offset (px)">
```

Step 6: Style Customization {#step-6-style-customization}

Allow customization: color, size, opacity, shape (circle/square/pill):

```javascript
// In content.js, read from storage and apply styles
chrome.storage.sync.get(['btnColor', 'btnSize', 'btnShape'], ( prefs ) => {
  const style = shadow.querySelector('style');
  style.textContent += `
    button {
      background: ${prefs.btnColor || '#333'};
      width: ${prefs.btnSize || 50}px;
      height: ${prefs.btnSize || 50}px;
      border-radius: ${prefs.btnShape === 'pill' ? '25px' : 
                       prefs.btnShape === 'square' ? '4px' : '50%'};
      opacity: ${prefs.btnOpacity || 0.8};
    }
  `;
});
```

Step 7: Per-Site or Global Preferences {#step-7-per-site-or-global-preferences}

Store settings per-site using domain keys or globally:

```javascript
// Save per-site
const domain = window.location.hostname;
chrome.storage.local.set({ [`settings_${domain}`]: prefs });

// Save global
chrome.storage.sync.set({ globalSettings: prefs });
```

Step 8: Circular Progress Ring {#step-8-circular-progress-ring}

Add SVG progress ring around button showing scroll percentage:

```javascript
const progress = Math.min(scrollY / (document.body.scrollHeight - window.innerHeight), 1);
shadow.querySelector('svg circle').style.strokeDashoffset = 
  2 * Math.PI * 40 * (1 - progress);
```

Performance Best Practices {#performance-best-practices}
- Use `{ passive: true }` on scroll listener
- Use requestAnimationFrame for visibility toggle
- Shadow DOM isolates button from page styles
- Debounce expensive operations
- Exclude specific sites via `matches` in manifest

Handling Custom Scroll Containers {#handling-custom-scroll-containers}

For sites with custom scroll containers, detect and handle:

```javascript
const scrollable = document.querySelector('.custom-scroll-container');
if (scrollable) {
  scrollable.addEventListener('scroll', handleScroll);
}
```

Excluding Specific Sites {#excluding-specific-sites}

Add to manifest's content_scripts.matches or use runtime.onInstalled:

```json
"exclude_matches": ["*://*.facebook.com/*", "*://*.twitter.com/*"]
```

Cross-References {#cross-references}
- See [Content Script Patterns](../guides/content-script-patterns.md)
- See [Dynamic Content Injection](../patterns/dynamic-content-injection.md)
- See [Shadow DOM Advanced](../patterns/shadow-dom-advanced.md)

What You Learned {#what-you-learned}
- Content script injection on all URLs
- Shadow DOM for style isolation
- Passive scroll listeners with requestAnimationFrame
- Chrome storage API for preferences
- Smooth scroll API
- Per-site vs global settings
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
