---
layout: post
title: "Build a Dark Reader Chrome Extension. Complete 2025 Tutorial"
description: "Learn how to build a dark reader Chrome extension with dark mode injection. This comprehensive tutorial covers content scripts, CSS inversion, shadow DOM, and how to implement dark theme for all sites."
date: 2025-01-22
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
author: theluckystrike
canonical_url: "https://bestchromeextensions.com/2025/01/22/build-dark-reader-chrome-extension/"
---

Build a Dark Reader Chrome Extension. Complete 2025 Tutorial

Dark mode has become an essential feature for modern web applications and browser extensions. With users spending countless hours in front of screens, the demand for dark reader extension functionality has skyrocketed. This comprehensive tutorial will walk you through building a complete Chrome extension that provides dark mode injection capabilities, enabling users to apply a dark theme all sites they visit.

By the end of this guide, you'll have built a fully functional dark mode extension similar to the popular Dark Reader extension, with features including automatic CSS inversion, customizable themes, brightness adjustment, and site-specific overrides. This is the exact technology that powers millions of extensions helping users reduce eye strain and improve their browsing experience.

---

Understanding Dark Mode Injection Architecture {#dark-mode-injection}

Before diving into code, it's essential to understand how dark mode injection works at a fundamental level. When you want to apply dark theme all sites across the web, you need to understand the browser's content script execution model and how CSS can be dynamically injected into web pages.

How Content Scripts Work

Chrome extensions use content scripts to interact with web page content. Unlike regular JavaScript that runs in the extension's isolated world, content scripts share the DOM with the page's own JavaScript but maintain their own JavaScript execution environment. This isolation is crucial for security and stability.

Content scripts are injected into pages based on patterns you define in the manifest. For a dark mode extension, you'll want to match all URLs using the `<all_urls>` permission, or more specifically, you can use content script matches to target specific domains.

The key insight is that content scripts can:
- Read and modify the DOM
- Read and modify CSS stylesheets
- Add new elements to the page
- Listen for DOM events
- Communicate with the background script

CSS Injection Strategies

There are multiple approaches to implementing dark mode injection, each with pros and cons:

1. CSS Custom Properties: Define CSS variables for colors and override them in dark mode
2. CSS Class Toggle: Add a class to the document and use descendant selectors
3. Style Element Injection: Inject a complete `<style>` element into the page
4. Shadow DOM Isolation: Use shadow DOM to encapsulate styles

For a universal dark reader that works on all sites, the most solid approach combines multiple strategies. We'll use a combination of injected stylesheets and CSS variables to ensure maximum compatibility.

---

Project Setup with Manifest V3 {#project-setup}

Every Chrome extension begins with the manifest.json file. This JSON configuration tells Chrome about your extension's capabilities, permissions, and the files it should load. For a dark mode extension, we need specific permissions to inject content scripts into web pages.

Create a new directory for your project and add the following manifest.json file:

```json
{
  "manifest_version": 3,
  "name": "DarkMode All - Universal Dark Reader",
  "version": "1.0.0",
  "description": "Apply dark theme to all websites. Reduce eye strain with customizable dark mode.",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
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

This manifest declares the critical permissions for our dark reader extension:

- storage: For saving user preferences and theme settings
- activeTab: For accessing the current tab when needed
- scripting: For dynamically executing content scripts
- host_permissions: With `<all_urls>`, we can inject content scripts into any website

Understanding Host Permissions

The `host_permissions` field is crucial for a universal dark reader. Unlike the `permissions` array which handles API access, host permissions specifically control which websites your extension can access and modify.

For production extensions, you should be transparent about why you need these permissions. A dark reader inherently needs to access all websites to function, so this is one of the few cases where `<all_urls>` is genuinely justified.

---

Core Dark Mode Engine {#core-engine}

Now let's build the core dark mode engine that handles CSS injection and transformation. This is the heart of your dark reader extension.

The Content Script Structure

Create a file named `content.js` in your project directory:

```javascript
// content.js - Core dark mode injection engine

class DarkModeEngine {
  constructor() {
    this.settings = {
      enabled: true,
      brightness: 100,
      contrast: 100,
      sepia: 0,
      mode: 'filter', // 'filter' or 'css'
      textColor: '#ffffff',
      backgroundColor: '#1a1a1a',
      siteOverrides: {}
    };
    
    this.styleElement = null;
    this.initialized = false;
  }

  async init() {
    // Load settings from storage
    await this.loadSettings();
    
    if (this.settings.enabled) {
      this.applyDarkMode();
    }
    
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
    
    this.initialized = true;
  }

  async loadSettings() {
    const stored = await chrome.storage.local.get('darkModeSettings');
    if (stored.darkModeSettings) {
      this.settings = { ...this.settings, ...stored.darkModeSettings };
    }
  }

  async saveSettings() {
    await chrome.storage.local.set({ darkModeSettings: this.settings });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'TOGGLE_DARK_MODE':
        this.settings.enabled = message.enabled;
        if (this.settings.enabled) {
          this.applyDarkMode();
        } else {
          this.removeDarkMode();
        }
        this.saveSettings();
        break;
        
      case 'UPDATE_SETTINGS':
        this.settings = { ...this.settings, ...message.settings };
        if (this.settings.enabled) {
          this.applyDarkMode();
        }
        this.saveSettings();
        break;
        
      case 'GET_STATUS':
        sendResponse({ 
          enabled: this.settings.enabled, 
          settings: this.settings 
        });
        break;
    }
  }

  applyDarkMode() {
    if (this.styleElement) {
      this.styleElement.remove();
    }

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'dark-mode-all-styles';
    this.styleElement.textContent = this.generateDarkModeCSS();
    
    // Insert as first child of head to have highest specificity precedence
    document.head.insertBefore(this.styleElement, document.head.firstChild);
    
    // Also add a class to the body for CSS selectors
    document.body.classList.add('dark-mode-all-active');
  }

  removeDarkMode() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    document.body.classList.remove('dark-mode-all-active');
  }

  generateDarkModeCSS() {
    const { brightness, contrast, sepia } = this.settings;
    
    // Calculate CSS filter values
    const brightnessValue = brightness / 100;
    const contrastValue = contrast / 100;
    const sepiaValue = sepia / 100;
    
    // Base styles that invert colors and then apply dark theme
    return `
      /* Base dark mode styles */
      html {
        filter: brightness(${brightnessValue}) contrast(${contrastValue}) sepia(${sepiaValue}) invert(1) hue-rotate(180deg);
      }
      
      /* Images need special handling - invert them back */
      html img, 
      html video, 
      html picture, 
      html canvas,
      html [style*="background-image"] {
        filter: brightness(${brightnessValue}) contrast(${contrastValue}) sepia(${sepiaValue}) invert(1) hue-rotate(180deg) invert(1);
      }
      
      /* Preserve transparency for PNGs and SVGs */
      html img[src$=".png"], 
      html img[src$=".svg"],
      html svg {
        filter: brightness(${brightnessValue}) contrast(${contrastValue}) sepia(${sepiaValue});
      }
      
      /* Dark mode active indicator */
      body.dark-mode-all-active::before {
        content: '';
        position: fixed;
        top: 5px;
        right: 5px;
        z-index: 999999;
        font-size: 12px;
        opacity: 0.5;
      }
    `;
  }
}

// Initialize the engine
const darkModeEngine = new DarkModeEngine();
darkModeEngine.init();
```

This core engine provides the foundation for dark mode injection. The key technique here is using CSS filters to invert colors and then re-invert images to restore their appearance. This approach works on virtually any website without requiring site-specific configurations.

The CSS Filter Technique Explained

The magic behind universal dark mode lies in CSS filters:

1. invert(1): This flips all colors on the page - black becomes white, white becomes black
2. hue-rotate(180deg): This shifts all colors to their opposite on the color wheel, making the inverted colors look more natural
3. brightness() and contrast(): These allow users to fine-tune the appearance
4. sepia(): Adds a warm tone that some users prefer

The double-inversion technique for images is crucial. When we invert the entire page, images also get inverted (becoming photo negatives). By applying another invert filter specifically to images, we restore their original appearance while still applying brightness and contrast adjustments.

---

Building the Popup Interface {#popup-ui}

The popup is the user interface users interact with to toggle dark mode and adjust settings. Let's create a clean, intuitive popup.

Popup HTML

Create `popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DarkMode All</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      width: 320px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #ffffff;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #333;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: 600;
    }
    
    .toggle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #2a2a2a;
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    
    .toggle-label {
      font-size: 14px;
      font-weight: 500;
    }
    
    .toggle-switch {
      position: relative;
      width: 50px;
      height: 26px;
    }
    
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #444;
      transition: 0.3s;
      border-radius: 26px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #4CAF50;
    }
    
    input:checked + .slider:before {
      transform: translateX(24px);
    }
    
    .settings-section {
      margin-bottom: 20px;
    }
    
    .settings-section h2 {
      font-size: 12px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    
    .slider-control {
      margin-bottom: 15px;
    }
    
    .slider-control label {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 8px;
    }
    
    .slider-control input[type="range"] {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #333;
      outline: none;
      -webkit-appearance: none;
    }
    
    .slider-control input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #4CAF50;
      cursor: pointer;
    }
    
    .quick-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .action-btn {
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .action-btn.primary {
      background: #4CAF50;
      color: white;
    }
    
    .action-btn.secondary {
      background: #333;
      color: white;
    }
    
    .action-btn:hover {
      opacity: 0.9;
    }
    
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #333;
      text-align: center;
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1> DarkMode All</h1>
  </div>
  
  <div class="toggle-container">
    <span class="toggle-label">Enable Dark Mode</span>
    <label class="toggle-switch">
      <input type="checkbox" id="darkModeToggle">
      <span class="slider"></span>
    </label>
  </div>
  
  <div class="settings-section">
    <h2>Display Settings</h2>
    
    <div class="slider-control">
      <label>
        <span>Brightness</span>
        <span id="brightnessValue">100%</span>
      </label>
      <input type="range" id="brightness" min="50" max="150" value="100">
    </div>
    
    <div class="slider-control">
      <label>
        <span>Contrast</span>
        <span id="contrastValue">100%</span>
      </label>
      <input type="range" id="contrast" min="50" max="150" value="100">
    </div>
    
    <div class="slider-control">
      <label>
        <span>Sepia</span>
        <span id="sepiaValue">0%</span>
      </label>
      <input type="range" id="sepia" min="0" max="100" value="0">
    </div>
  </div>
  
  <div class="settings-section">
    <h2>Quick Actions</h2>
    <div class="quick-actions">
      <button class="action-btn primary" id="enableAllSites">Enable All Sites</button>
      <button class="action-btn secondary" id="disableAllSites">Disable All</button>
    </div>
  </div>
  
  <div class="footer">
    Built by theluckystrike
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Popup JavaScript

Create `popup.js` to handle user interactions:

```javascript
// popup.js - Popup interface logic

document.addEventListener('DOMContentLoaded', async () => {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const brightnessSlider = document.getElementById('brightness');
  const contrastSlider = document.getElementById('contrast');
  const sepiaSlider = document.getElementById('sepia');
  
  const brightnessValue = document.getElementById('brightnessValue');
  const contrastValue = document.getElementById('contrastValue');
  const sepiaValue = document.getElementById('sepiaValue');
  
  const enableAllSitesBtn = document.getElementById('enableAllSites');
  const disableAllSitesBtn = document.getElementById('disableAllSites');
  
  let currentSettings = {
    enabled: false,
    brightness: 100,
    contrast: 100,
    sepia: 0
  };
  
  // Get the current tab
  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  
  // Load current status from content script
  async function loadStatus() {
    const tab = await getCurrentTab();
    
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
      if (response) {
        currentSettings = response.settings;
        updateUI();
      }
    } catch (error) {
      console.log('Could not connect to content script, using defaults');
    }
  }
  
  // Update UI based on current settings
  function updateUI() {
    darkModeToggle.checked = currentSettings.enabled;
    brightnessSlider.value = currentSettings.brightness;
    contrastSlider.value = currentSettings.contrast;
    sepiaSlider.value = currentSettings.sepia;
    
    brightnessValue.textContent = currentSettings.brightness + '%';
    contrastValue.textContent = currentSettings.contrast + '%';
    sepiaValue.textContent = currentSettings.sepia + '%';
  }
  
  // Send update to content script
  async function sendUpdate(updates) {
    const tab = await getCurrentTab();
    currentSettings = { ...currentSettings, ...updates };
    
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_SETTINGS',
        settings: currentSettings
      });
    } catch (error) {
      console.error('Failed to send update:', error);
    }
  }
  
  // Toggle dark mode
  darkModeToggle.addEventListener('change', async (e) => {
    const tab = await getCurrentTab();
    
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_DARK_MODE',
        enabled: e.target.checked
      });
      currentSettings.enabled = e.target.checked;
    } catch (error) {
      console.error('Failed to toggle dark mode:', error);
    }
  });
  
  // Brightness slider
  brightnessSlider.addEventListener('input', (e) => {
    brightnessValue.textContent = e.target.value + '%';
  });
  
  brightnessSlider.addEventListener('change', (e) => {
    sendUpdate({ brightness: parseInt(e.target.value) });
  });
  
  // Contrast slider
  contrastSlider.addEventListener('input', (e) => {
    contrastValue.textContent = e.target.value + '%';
  });
  
  contrastSlider.addEventListener('change', (e) => {
    sendUpdate({ contrast: parseInt(e.target.value) });
  });
  
  // Sepia slider
  sepiaSlider.addEventListener('input', (e) => {
    sepiaValue.textContent = e.target.value + '%';
  });
  
  sepiaSlider.addEventListener('change', (e) => {
    sendUpdate({ sepia: parseInt(e.target.value) });
  });
  
  // Quick action buttons
  enableAllSitesBtn.addEventListener('click', async () => {
    const tab = await getCurrentTab();
    
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_DARK_MODE',
        enabled: true
      });
      currentSettings.enabled = true;
      updateUI();
    } catch (error) {
      console.error('Failed to enable dark mode:', error);
    }
  });
  
  disableAllSitesBtn.addEventListener('click', async () => {
    const tab = await getCurrentTab();
    
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_DARK_MODE',
        enabled: false
      });
      currentSettings.enabled = false;
      updateUI();
    } catch (error) {
      console.error('Failed to disable dark mode:', error);
    }
  });
  
  // Initialize
  loadStatus();
});
```

---

Advanced Dark Mode Techniques {#advanced-techniques}

Now that we have a working dark mode extension, let's explore advanced techniques that will make your extension stand out from the competition.

Site-Specific Overrides

Different websites have different color schemes and structures. A solid dark reader extension needs the ability to apply custom styles to specific sites. Let's add this functionality:

```javascript
// Advanced site-specific override system
class SiteSpecificOverrides {
  constructor() {
    this.overrides = {
      'facebook.com': {
        selector: '.userContentWrapper, .storyBodyContainer',
        background: '#18191a',
        textColor: '#e4e6eb'
      },
      'twitter.com': {
        selector: '[data-testid="primaryColumn"]',
        background: '#16181c',
        textColor: '#e7e9ea'
      },
      'youtube.com': {
        selector: 'ytd-watch-flexy',
        background: '#0f0f0f',
        textColor: '#ffffff'
      },
      'reddit.com': {
        selector: '.shreddit-body[slot="body"]',
        background: '#1a1a1b',
        textColor: '#d7dadc'
      }
    };
  }

  getOverrideForDomain(domain) {
    // Check for exact match or subdomain
    for (const [pattern, override] of Object.entries(this.overrides)) {
      if (domain === pattern || domain.endsWith('.' + pattern)) {
        return override;
      }
    }
    return null;
  }

  generateOverrideCSS(override) {
    return `
      ${override.selector} {
        background-color: ${override.background} !important;
        color: ${override.textColor} !important;
      }
    `;
  }
}
```

Using CSS Variables for Better Compatibility

For more sophisticated dark mode implementations, CSS custom properties (variables) provide better control:

```javascript
// CSS Variable-based dark mode approach
function generateCSSVariableMode(settings) {
  return `
    :root {
      --dm-bg: #1a1a1a;
      --dm-text: #e0e0e0;
      --dm-link: #6da1ff;
      --dm-border: #333333;
    }

    /* Apply dark variables */
    html.dark-mode-active {
      --background: var(--dm-bg);
      --text-primary: var(--dm-text);
      --link-color: var(--dm-link);
      --border-color: var(--dm-border);
    }

    html.dark-mode-active body,
    html.dark-mode-active main,
    html.dark-mode-active article,
    html.dark-mode-active section,
    html.dark-mode-active div,
    html.dark-mode-active header,
    html.dark-mode-active footer,
    html.dark-mode-active nav {
      background-color: var(--dm-bg) !important;
      color: var(--dm-text) !important;
      border-color: var(--dm-border) !important;
    }

    html.dark-mode-active a {
      color: var(--dm-link) !important;
    }

    html.dark-mode-active img {
      opacity: 0.9;
    }
  `;
}
```

---

Background Script for State Management {#background-script}

The background script handles extension-wide state and can coordinate between different parts of the extension.

Create `background.js`:

```javascript
// background.js - Background service worker

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      darkModeSettings: {
        enabled: false,
        brightness: 100,
        contrast: 100,
        sepia: 0,
        mode: 'filter'
      },
      enabledSites: []
    });
    
    console.log('DarkMode All extension installed successfully');
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_ENABLED_STATUS') {
    chrome.storage.local.get('darkModeSettings', (result) => {
      sendResponse(result.darkModeSettings);
    });
    return true; // Keep the message channel open for async response
  }
});

// Handle keyboard shortcuts (if declared in manifest)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-dark-mode') {
    toggleDarkMode();
  }
});

async function toggleDarkMode() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Get current state
  const result = await chrome.storage.local.get('darkModeSettings');
  const settings = result.darkModeSettings || { enabled: false };
  
  // Toggle
  settings.enabled = !settings.enabled;
  
  // Save and notify content script
  await chrome.storage.local.set({ darkModeSettings: settings });
  
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_DARK_MODE',
      enabled: settings.enabled
    });
  } catch (error) {
    console.log('Could not toggle dark mode on this page');
  }
}
```

---

Testing Your Extension {#testing}

Before publishing, thorough testing is essential. Here's how to test your dark mode extension:

Loading the Extension Locally

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension directory
4. The extension icon should appear in your toolbar

Testing Checklist

Test these scenarios:
- [ ] Toggle dark mode on and off
- [ ] Test on various websites (news sites, social media, e-commerce)
- [ ] Test brightness and contrast adjustments
- [ ] Test with different image types (PNG, SVG, JPG)
- [ ] Test with videos and animations
- [ ] Test keyboard shortcut if configured
- [ ] Test that settings persist across page reloads

Common Issues and Solutions

Images appearing as negatives:
- Ensure the double-invert filter is applied to all image types
- Check that SVG elements are handled separately

Text becoming unreadable:
- Adjust the brightness and contrast defaults
- Add site-specific overrides for problematic sites

Performance issues:
- Use CSS `will-change` sparingly
- Consider using `requestAnimationFrame` for animations

---

Publishing to Chrome Web Store {#publishing}

Once your extension is thoroughly tested, it's time to publish to the Chrome Web Store.

Preparing for Publication

1. Create a ZIP file: Package your extension directory
2. Prepare store assets:
   - 1280x800 or 640x400 screenshots
   - 440x280 promotional tile
   - Privacy policy (required for extensions accessing all URLs)

Store Listing Best Practices

For your dark reader extension:

- Title: Include "Dark Reader" and key differentiator
- Description: Highlight universal compatibility, customization options, and privacy
- Screenshots: Show before/after comparisons on popular sites

---

Conclusion

You now have a complete understanding of how to build a production-ready dark reader Chrome extension. We covered:

- Project setup with Manifest V3 and proper permissions
- Core dark mode engine using CSS filter inversion
- Popup interface for user controls and settings
- Advanced techniques including site-specific overrides
- Background script for state management
- Testing and publishing best practices

This foundation allows you to build a dark reader extension comparable to popular options in the Chrome Web Store. The key to success is:

1. Continuous improvement: Listen to user feedback and add site-specific fixes
2. Performance optimization: Ensure the extension doesn't slow down browsing
3. Privacy transparency: Be clear about why your extension needs broad permissions

Dark mode extensions remain one of the most popular categories in the Chrome Web Store. With the skills from this tutorial, you're well-positioned to build something that helps millions of users reduce eye strain and enjoy a more comfortable browsing experience.

---

Next Steps

1. Add more site overrides: Build out overrides for the top 100 websites
2. Implement themes: Create preset themes (OLED black, sepia, etc.)
3. Add scheduling: Allow users to schedule dark mode based on time
4. Keyboard shortcuts: Add global shortcuts for quick toggling

The Chrome extension ecosystem continues to evolve, and dark mode remains a timeless feature. Start building today and contribute to making the web more comfortable for everyone.

---

*Built by theluckystrike at zovo.one*
