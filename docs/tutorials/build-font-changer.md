---
layout: default
title: "Chrome Extension Font Changer. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-font-changer/"
---
# Build a Font Changer Extension

What You'll Build {#what-youll-build}
- Change fonts on any webpage dynamically
- Per-site font preferences (auto-apply based on domain)
- Live font preview with instant updates
- Font size, line height, and letter spacing controls
- Google Fonts integration
- Keyboard shortcut toggle (Alt+Shift+F)

Manifest {#manifest}
- permissions: activeTab, storage, scripting
- host_permissions: https://fonts.googleapis.com/*
- commands with Alt+Shift+F shortcut
- content script with CSS injection capability

---

Step 1: Manifest Configuration {#step-1-manifest-configuration}

```json
{
  "name": "Font Changer",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": ["https://fonts.googleapis.com/*"],
  "action": { "default_popup": "popup.html" },
  "commands": {
    "toggle-font-changer": {
      "suggested_key": "Alt+Shift+F",
      "description": "Toggle font changer"
    }
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

---

Step 2: Content Script - CSS Injection {#step-2-content-script-css-injection}

See [content-script-patterns.md](../guides/content-script-patterns.md) for injection strategies.

```javascript
// content.js
const FONT_STYLE_ID = 'font-changer-styles';

function injectFontStyles(settings) {
  let styleEl = document.getElementById(FONT_STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = FONT_STYLE_ID;
    document.head.appendChild(styleEl);
  }

  // Preserve icon fonts (use specific selectors)
  const css = `
    body, body *:not(.fa):not(.fas):not(.far):not(.fab):not([class*="icon-"]) {
      font-family: ${settings.fontFamily} !important;
      font-size: ${settings.fontSize}px !important;
      line-height: ${settings.lineHeight} !important;
      letter-spacing: ${settings.letterSpacing}px !important;
    }
  `;
  styleEl.textContent = css;
}

function removeFontStyles() {
  const styleEl = document.getElementById(FONT_STYLE_ID);
  if (styleEl) styleEl.remove();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'apply') injectFontStyles(msg.settings);
  if (msg.action === 'reset') removeFontStyles();
});
```

---

Step 3: Popup - Font Family Dropdown {#step-3-popup-font-family-dropdown}

```html
<!-- popup.html -->
<div class="font-changer-popup">
  <h3>Font Changer</h3>
  
  <label>Font Family</label>
  <select id="fontFamily">
    <option value="Arial, sans-serif">Arial</option>
    <option value="'Times New Roman', serif">Times New Roman</option>
    <option value="'Courier New', monospace">Courier New</option>
    <option value="Georgia, serif">Georgia</option>
    <option value="Verdana, sans-serif">Verdana</option>
    <option value="custom">Custom Google Font...</option>
  </select>
  
  <input type="text" id="customFont" placeholder="Enter Google Font name" style="display:none">
```

---

Step 4: Font Size Slider {#step-4-font-size-slider}

```html
  <label>Font Size: <span id="fontSizeValue">16</span>px</label>
  <input type="range" id="fontSize" min="8" max="32" value="16">
  
  <label>Line Height: <span id="lineHeightValue">1.5</span></label>
  <input type="range" id="lineHeight" min="1" max="3" step="0.1" value="1.5">
  
  <label>Letter Spacing: <span id="letterSpacingValue">0</span>px</label>
  <input type="range" id="letterSpacing" min="-2" max="5" step="0.1" value="0">
  
  <div class="actions">
    <button id="applyBtn">Apply</button>
    <button id="resetBtn">Reset</button>
    <button id="saveSiteBtn">Save for Site</button>
  </div>
</div>
```

---

Step 5: Popup Logic - Event Handling {#step-5-popup-logic-event-handling}

```javascript
// popup.js
const controls = ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing'];

controls.forEach(id => {
  document.getElementById(id).addEventListener('input', (e) => {
    const value = e.target.value;
    // Update display values for sliders
    const displayEl = document.getElementById(id + 'Value');
    if (displayEl) displayEl.textContent = value;
    // Live preview
    previewFonts();
  });
});

function getSettings() {
  return {
    fontFamily: document.getElementById('fontFamily').value,
    fontSize: document.getElementById('fontSize').value,
    lineHeight: document.getElementById('lineHeight').value,
    letterSpacing: document.getElementById('letterSpacing').value
  };
}

function previewFonts() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'apply',
      settings: getSettings()
    });
  });
}
```

---

Step 6: Per-Site Preferences {#step-6-per-site-preferences}

See [font-settings-api.md](../patterns/font-settings-api.md) for storage patterns.

```javascript
// Save per-site settings
document.getElementById('saveSiteBtn').addEventListener('click', () => {
  const domain = new URL(chrome.tabs[0].url).hostname;
  chrome.storage.local.set({
    [`font_${domain}`]: getSettings()
  });
});

// Load on popup open
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const domain = new URL(tabs[0].url).hostname;
  chrome.storage.local.get([`font_${domain}`], (result) => {
    if (result[`font_${domain}`]) {
      applySettingsToUI(result[`font_${domain}`]);
      previewFonts();
    }
  });
});
```

---

Step 7: Apply/Reset with Live Preview {#step-7-applyreset-with-live-preview}

```javascript
document.getElementById('applyBtn').addEventListener('click', () => {
  const settings = getSettings();
  chrome.storage.local.set({ currentSettings: settings });
  previewFonts();
});

document.getElementById('resetBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'reset' });
    chrome.storage.local.remove('currentSettings');
  });
});
```

---

Step 8: Google Fonts Integration {#step-8-google-fonts-integration}

```javascript
function loadGoogleFont(fontName) {
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

// When custom font selected
document.getElementById('fontFamily').addEventListener('change', (e) => {
  if (e.target.value === 'custom') {
    document.getElementById('customFont').style.display = 'block';
  } else {
    document.getElementById('customFont').style.display = 'none';
  }
});
```

---

CSS Specificity Tips {#css-specificity-tips}

- Use `!important` to override existing styles (as shown above)
- Target `body, body *` for comprehensive coverage
- Exclude icon classes: `:not(.fa):not(.fas):not([class*="icon-"])`
- Test on complex sites like Wikipedia, news sites
- Consider `font-display: swap` for Google Fonts

Keyboard Shortcut {#keyboard-shortcut}

The manifest's `commands` API handles Alt+Shift+F:

```javascript
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-font-changer') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.storage.local.get(['currentSettings'], (result) => {
        if (result.currentSettings) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'apply',
            settings: result.currentSettings
          });
        } else {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'reset' });
        }
      });
    });
  }
});
```

Related Patterns {#related-patterns}
- [Theming & Dark Mode](../patterns/theming-dark-mode.md)
- [Content Script Patterns](../guides/content-script-patterns.md)
- [Font Settings API](../patterns/font-settings-api.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
