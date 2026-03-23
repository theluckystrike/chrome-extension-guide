---
layout: post
title: "Build a Dark Mode Chrome Extension: Invert Colors and Apply Themes"
description: "Learn to build a dark mode Chrome extension with color inversion and custom themes. Step-by-step tutorial covering Manifest V3, content scripts, and CSS techniques."
date: 2025-03-30
categories: [Chrome-Extensions, Tutorials]
tags: [dark-mode, theme, chrome-extension]
author: theluckystrike
canonical_url: "https://bestchromeextensions.com/2025/03/30/build-dark-mode-chrome-extension/"
---

Build a Dark Mode Chrome Extension: Invert Colors and Apply Themes

Dark mode has evolved from a simple aesthetic preference to a crucial accessibility feature that millions of users rely on daily. Whether you're a developer who spends long hours coding or someone sensitive to bright screens, having the ability to build dark mode extension functionality into Chrome can dramatically improve the browsing experience. This comprehensive tutorial will walk you through creating a fully functional dark mode Chrome extension that can invert colors chrome extension style and apply beautiful themes to any website you visit.

The demand for dark theme extension tutorial has grown exponentially as more users seek to reduce eye strain and improve their browsing comfort. By the end of this guide, you'll have the skills to create something similar to the popular Dark Reader extension, complete with color inversion capabilities, custom theme support, and site-specific preferences. This project will teach you essential Chrome extension development skills that apply to countless other extension ideas.

---

Why Build a Dark Mode Extension? {#why-build}

Before we dive into the code, let's understand why learning to build dark mode extension is such a valuable skill. The dark reader Chrome extension ecosystem serves millions of users worldwide, making it one of the most popular extension categories. Users install these extensions to reduce eye strain during nighttime browsing, conserve battery on OLED displays, improve readability, and comply with personal preferences or accessibility needs.

Building a dark mode chrome extension teaches you several fundamental concepts that apply to virtually every type of Chrome extension you'll develop in the future. You'll learn about content script injection, which is the foundation for any extension that modifies webpage appearance. You'll master CSS manipulation techniques that enable dynamic styling changes. You'll understand how to persist user preferences using the Chrome Storage API, and you'll gain experience with the messaging system that allows different parts of your extension to communicate.

The skills you develop building this extension translate directly to other projects like ad blockers, page customizers, accessibility tools, and productivity enhancers. Many of the techniques we cover here appear in various forms across the Chrome extension ecosystem.

---

Understanding the Architecture {#architecture}

To successfully build a dark mode Chrome extension, you need to understand how Chrome extensions interact with web pages. The architecture involves several components working together to deliver a smooth user experience. Let's break down each piece and understand how they contribute to the overall functionality.

Content Scripts: The Engine of Page Modification

Content scripts are the heart of any extension that modifies how web pages look or behave. These scripts run in the context of web pages, meaning they can directly access and modify the DOM (Document Object Model) and CSS of the page. Unlike regular JavaScript on a webpage, content scripts have superpowers granted by the Chrome extension API, but they also operate under certain restrictions to protect user privacy and security.

When you build dark mode extension functionality, your content script will inject CSS into pages, modify existing styles, and potentially add new UI elements like toggle buttons or theme selectors. The content script runs isolated from the page's JavaScript, which prevents conflicts but also means you need to communicate through specific messaging channels if you need to exchange data with your extension's background script or popup.

Understanding content script injection is crucial for implementing the invert colors chrome extension feature. The injection process allows you to add CSS rules that override the original page styles, effectively changing the visual appearance without altering the underlying HTML structure.

Manifest V3: The Foundation

Every Chrome extension starts with its manifest file. Manifest V3 is the current standard, introducing several important changes from the older Manifest V2. For our dark mode extension, we'll need to declare specific permissions and configure content script injection properly.

The manifest defines what your extension can do, which pages it can access, and how different components interact. For a dark mode extension, you'll need to specify the `activeTab` permission or broad URL access patterns, configure content scripts with appropriate match patterns, and declare any optional permissions for advanced features like storage synchronization or scripting capabilities.

Background Scripts: The Coordinator

Background scripts (or service workers in Manifest V3) handle the logic that doesn't need to run directly in the context of a web page. For our dark mode extension, the background script might handle keyboard shortcut events, manage extension state across different tabs, or coordinate communication between the popup and content scripts.

While our primary dark mode functionality will live in content scripts, understanding the background script's role helps you build more sophisticated extensions in the future. Many features like automatic theme detection based on system preferences or scheduled dark mode activation rely on background script logic.

---

Step-by-Step Implementation Guide {#implementation}

Now let's build the actual extension. We'll create a complete dark mode Chrome extension that implements color inversion and custom theme application. Follow each step carefully, and you'll have a working extension by the end.

Step 1: Project Structure and Manifest

Create a new folder for your extension and set up the basic file structure. You'll need a manifest.json file, an HTML file for the popup, JavaScript for the popup logic, content script files, and CSS for styling. Let's start with the manifest:

```json
{
  "manifest_version": 3,
  "name": "Dark Mode Toggle",
  "version": "1.0",
  "description": "Toggle dark mode on any website with color inversion and custom themes",
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest configures our extension to inject content scripts into all web pages, provides a popup interface for user interaction, and requests the necessary permissions for storage and script execution. The `activeTab` permission ensures we can access the current tab when the user activates the extension.

Step 2: Creating the Popup Interface

The popup provides the user interface for toggling dark mode and selecting themes. Create a popup.html file with the following structure:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dark Mode Toggle</title>
  <style>
    body {
      width: 300px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #333333;
    }
    
    body.dark {
      background: #1a1a1a;
      color: #e0e0e0;
    }
    
    h1 {
      font-size: 18px;
      margin-bottom: 15px;
    }
    
    .toggle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    
    body.dark .toggle-container {
      background: #2d2d2d;
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
      background-color: #ccc;
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
    
    .theme-selector {
      margin-bottom: 20px;
    }
    
    .theme-selector label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
    }
    
    .theme-selector select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      background: white;
    }
    
    body.dark .theme-selector select {
      background: #333;
      color: #e0e0e0;
      border-color: #555;
    }
    
    .site-list {
      max-height: 150px;
      overflow-y: auto;
    }
    
    .site-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
    
    body.dark .site-item {
      border-color: #333;
    }
    
    .remove-site {
      color: #ff4444;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1> Dark Mode Toggle</h1>
  
  <div class="toggle-container">
    <span>Enable Dark Mode</span>
    <label class="toggle-switch">
      <input type="checkbox" id="darkModeToggle">
      <span class="slider"></span>
    </label>
  </div>
  
  <div class="theme-selector">
    <label for="themeSelect">Choose Theme:</label>
    <select id="themeSelect">
      <option value="invert">Color Inversion</option>
      <option value="dark">Dark Theme</option>
      <option value="sepia">Sepia Theme</option>
      <option value="dim">Dim Theme</option>
      <option value="custom">Custom Theme</option>
    </select>
  </div>
  
  <div class="theme-selector">
    <label>Brightness:</label>
    <input type="range" id="brightnessSlider" min="50" max="150" value="100" style="width: 100%;">
  </div>
  
  <div class="theme-selector">
    <label>Contrast:</label>
    <input type="range" id="contrastSlider" min="50" max="150" value="100" style="width: 100%;">
  </div>
  
  <div class="theme-selector">
    <label>Grayscale:</label>
    <input type="range" id="grayscaleSlider" min="0" max="100" value="0" style="width: 100%;">
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This popup provides a comprehensive interface for controlling dark mode. Users can toggle dark mode on and off, select from multiple theme options, and adjust brightness, contrast, and grayscale levels. The design is fully themed to match dark mode when enabled.

Step 3: Popup JavaScript Logic

Create a popup.js file to handle user interactions and communicate with content scripts:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const themeSelect = document.getElementById('themeSelect');
  const brightnessSlider = document.getElementById('brightnessSlider');
  const contrastSlider = document.getElementById('contrastSlider');
  const grayscaleSlider = document.getElementById('grayscaleSlider');
  
  // Load saved settings
  loadSettings();
  
  // Event listeners
  darkModeToggle.addEventListener('change', handleToggle);
  themeSelect.addEventListener('change', handleThemeChange);
  brightnessSlider.addEventListener('input', handleSettingsChange);
  contrastSlider.addEventListener('input', handleSettingsChange);
  grayscaleSlider.addEventListener('input', handleSettingsChange);
  
  async function loadSettings() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      const url = new URL(currentTab.url).hostname;
      
      // Get global settings
      const globalSettings = await chrome.storage.local.get(['darkModeEnabled', 'globalTheme']);
      darkModeToggle.checked = globalSettings.darkModeEnabled || false;
      themeSelect.value = globalSettings.globalTheme || 'invert';
      
      // Get site-specific settings if they exist
      const siteSettings = await chrome.storage.local.get(['siteSettings']);
      const settings = siteSettings.siteSettings || {};
      
      if (settings[url]) {
        themeSelect.value = settings[url].theme || globalSettings.globalTheme;
        brightnessSlider.value = settings[url].brightness || 100;
        contrastSlider.value = settings[url].contrast || 100;
        grayscaleSlider.value = settings[url].grayscale || 0;
      }
      
      // Apply popup theme
      if (globalSettings.darkModeEnabled) {
        document.body.classList.add('dark');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  async function handleToggle() {
    const enabled = darkModeToggle.checked;
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Save global setting
      await chrome.storage.local.set({ darkModeEnabled: enabled });
      
      // Send message to content script
      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleDarkMode',
        enabled: enabled,
        theme: themeSelect.value,
        settings: {
          brightness: brightnessSlider.value,
          contrast: contrastSlider.value,
          grayscale: grayscaleSlider.value
        }
      });
      
      // Update popup theme
      if (enabled) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    } catch (error) {
      console.error('Error toggling dark mode:', error);
    }
  }
  
  async function handleThemeChange() {
    const theme = themeSelect.value;
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = new URL(tabs[0].url).hostname;
      
      // Save global theme setting
      await chrome.storage.local.set({ globalTheme: theme });
      
      // Send message to content script
      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'changeTheme',
        theme: theme,
        settings: {
          brightness: brightnessSlider.value,
          contrast: contrastSlider.value,
          grayscale: grayscaleSlider.value
        }
      });
    } catch (error) {
      console.error('Error changing theme:', error);
    }
  }
  
  async function handleSettingsChange() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateSettings',
        settings: {
          brightness: brightnessSlider.value,
          contrast: contrastSlider.value,
          grayscale: grayscaleSlider.value
        }
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }
});
```

This JavaScript handles all the popup interactions, saves user preferences to Chrome's storage API, and communicates with the content script to apply changes in real-time. It also handles both global settings and site-specific preferences.

Step 4: Content Script Implementation

The content script is where the magic happens. This script runs in the context of each web page and actually applies the dark mode styles. Create a content.js file:

```javascript
// Dark Mode Content Script
// This script runs on every page and handles dark mode application

let currentSettings = {
  enabled: false,
  theme: 'invert',
  brightness: 100,
  contrast: 100,
  grayscale: 0
};

let styleElement = null;

// Theme definitions
const themes = {
  invert: {
    filter: 'invert(1) hue-rotate(180deg)',
    background: '#ffffff',
    text: '#000000'
  },
  dark: {
    filter: 'none',
    background: '#1a1a1a',
    text: '#e0e0e0'
  },
  sepia: {
    filter: 'sepia(100%)',
    background: '#f4ecd8',
    text: '#5b4636'
  },
  dim: {
    filter: 'brightness(0.9)',
    background: '#2d2d2d',
    text: '#c0c0c0'
  },
  custom: {
    filter: 'none',
    background: 'custom',
    text: 'custom'
  }
};

// Initialize
function init() {
  loadSettings();
  createStyleElement();
  
  if (currentSettings.enabled) {
    applyDarkMode();
  }
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(handleMessage);
}

// Create the style element for dark mode CSS
function createStyleElement() {
  styleElement = document.createElement('style');
  styleElement.id = 'dark-mode-extension-styles';
  styleElement.type = 'text/css';
  document.head.appendChild(styleElement);
}

// Load settings from storage
async function loadSettings() {
  try {
    const url = new URL(window.location.href).hostname;
    const globalSettings = await chrome.storage.local.get(['darkModeEnabled', 'globalTheme']);
    const siteSettings = await chrome.storage.local.get(['siteSettings']);
    
    const settings = siteSettings.siteSettings || {};
    const siteSpecific = settings[url];
    
    currentSettings.enabled = globalSettings.darkModeEnabled || false;
    currentSettings.theme = siteSpecific?.theme || globalSettings.globalTheme || 'invert';
    currentSettings.brightness = siteSpecific?.brightness || 100;
    currentSettings.contrast = siteSpecific?.contrast || 100;
    currentSettings.grayscale = siteSpecific?.grayscale || 0;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Handle messages from popup
function handleMessage(message) {
  switch (message.action) {
    case 'toggleDarkMode':
      currentSettings.enabled = message.enabled;
      if (message.enabled) {
        applyDarkMode();
      } else {
        removeDarkMode();
      }
      break;
      
    case 'changeTheme':
      currentSettings.theme = message.theme;
      if (currentSettings.enabled) {
        applyDarkMode();
      }
      break;
      
    case 'updateSettings':
      currentSettings.brightness = message.settings.brightness;
      currentSettings.contrast = message.settings.contrast;
      currentSettings.grayscale = message.settings.grayscale;
      if (currentSettings.enabled) {
        applyDarkMode();
      }
      break;
      
    case 'getStatus':
      chrome.runtime.sendMessage({
        action: 'statusResponse',
        settings: currentSettings
      });
      break;
  }
}

// Apply dark mode to the page
function applyDarkMode() {
  const theme = themes[currentSettings.theme];
  let filter = theme.filter;
  
  // Add brightness, contrast, and grayscale adjustments
  if (currentSettings.brightness !== 100 || 
      currentSettings.contrast !== 100 || 
      currentSettings.grayscale !== 0) {
    
    const filters = [];
    
    if (currentSettings.brightness !== 100) {
      filters.push(`brightness(${currentSettings.brightness}%)`);
    }
    
    if (currentSettings.contrast !== 100) {
      filters.push(`contrast(${currentSettings.contrast}%)`);
    }
    
    if (currentSettings.grayscale !== 0) {
      filters.push(`grayscale(${currentSettings.grayscale}%)`);
    }
    
    if (currentSettings.theme === 'invert') {
      filters.unshift('invert(1)');
      filters.push('hue-rotate(180deg)');
    }
    
    filter = filters.join(' ');
  }
  
  // Create comprehensive CSS rules
  const css = `
    /* Main dark mode filter */
    html {
      filter: ${filter} !important;
      background-color: ${theme.background} !important;
    }
    
    /* Preserve images and media */
    img, video, canvas, svg, picture, [style*="background-image"] {
      filter: ${currentSettings.theme === 'invert' ? 'invert(1) hue-rotate(180deg)' : 'none'} !important;
    }
    
    /* Handle inline styles */
    [style*="background"] {
      background-color: ${theme.background} !important;
    }
    
    /* Text colors - use CSS custom properties for better handling */
    body, body * {
      color-scheme: dark;
    }
  `;
  
  styleElement.textContent = css;
  
  // Add a class for JavaScript-based styling
  document.documentElement.classList.add('dark-mode-active');
}

// Remove dark mode from the page
function removeDarkMode() {
  styleElement.textContent = '';
  document.documentElement.classList.remove('dark-mode-active');
}

// Run initialization
init();
```

This content script handles all the core functionality. It loads user preferences, listens for messages from the popup, and applies the appropriate CSS filters and styles to transform any webpage into dark mode. The script handles multiple themes including color inversion, dark theme, sepia, and dim modes, plus allows for custom adjustments to brightness, contrast, and grayscale.

---

Advanced Features and Enhancements {#advanced}

Now that you have a working dark mode extension, let's explore several advanced features that can make your extension truly stand out. These enhancements will teach you valuable skills while significantly improving the user experience.

Site-Specific Theme Preferences

One of the most useful features for a dark mode extension is the ability to save different themes for different websites. Users often want dark mode on some sites but prefer the original design on others. Implementing site-specific preferences requires extending both the popup and content scripts to handle per-domain settings.

To implement this feature, modify your storage logic to organize settings by domain. Create a settings object where each key is a domain name, and store theme preferences, brightness, and other settings separately for each site. When the extension loads, check if there are specific settings for the current domain before falling back to global defaults.

The implementation involves updating your storage structure to support this hierarchy. Instead of storing a single theme preference, you'll maintain an object mapping domains to their individual settings. When loading settings, check the current hostname against this object to find domain-specific overrides.

Automatic Theme Detection

Advanced dark mode extensions can automatically detect when to enable dark mode based on system preferences or time of day. The system preference detection uses the `prefers-color-scheme` media query, which reflects the user's operating system dark mode setting. For time-based activation, you can check the current hour and automatically enable dark mode during evening hours.

To implement automatic detection, add logic to your content script that checks `window.matchMedia('(prefers-color-scheme: dark)')`. Listen for changes to this preference using the `addEventListener` method, and automatically toggle dark mode when the system preference changes. This provides a smooth experience where the extension automatically adapts to user preferences without manual intervention.

Keyboard Shortcuts

Adding keyboard shortcuts makes your extension more accessible and convenient to use. Chrome's commands API allows you to define global keyboard shortcuts that work even when the popup is closed. Users can quickly toggle dark mode without opening the extension popup.

To implement keyboard shortcuts, add a `commands` section to your manifest file. Define the shortcut key combination and specify what should happen when it's triggered. You'll need a background script to handle the command event and communicate with the active tab to toggle dark mode.

Custom Theme Creator

Allow users to create their own custom themes with specific color palettes. This feature requires storing custom color values and applying them through CSS custom properties. You can create a color picker interface in the popup that lets users select colors for backgrounds, text, links, and other elements.

The custom theme system should store color values in Chrome storage and generate dynamic CSS that applies these colors through CSS custom properties. This approach gives users complete control over the appearance and makes your extension more versatile.

---

Testing and Debugging {#testing}

Proper testing is essential for any Chrome extension. Learn to use Chrome's developer tools to debug content scripts, inspect the injected styles, and verify that your extension works correctly across different websites. The debugging process involves understanding how content scripts interact with web pages and identifying any conflicts that might occur.

Using Chrome DevTools

Chrome DevTools provides powerful debugging capabilities for extensions. You can inspect the content script's execution, view console logs, and examine the injected styles. To debug content scripts, open DevTools for the webpage and look for your extension's scripts in the Sources panel.

Set breakpoints in your content script code to pause execution and examine variable values. This helps identify logic errors and understand how your code processes different scenarios. The Console panel shows any errors or warnings that your extension generates, which is invaluable for troubleshooting issues.

Cross-Browser Testing

Test your extension on various websites with different designs and structures. Some websites use aggressive CSS that might override your dark mode styles, while others might use JavaScript frameworks that dynamically generate content. Identifying these edge cases helps you build a more solid extension.

Pay special attention to websites with complex layouts, embedded media, and dynamic content. Your color inversion logic should handle images, videos, and canvas elements correctly, preserving media content while inverting other visual elements. The hue rotation component of the color inversion helps maintain reasonable color appearance for images.

---

Publishing Your Extension {#publishing}

Once your dark mode extension is working correctly, you can publish it to the Chrome Web Store. The publishing process involves creating a developer account, preparing store listing assets, and submitting your extension for review. A well-optimized store listing with clear screenshots and descriptions helps attract users.

When preparing for publication, create compelling store graphics that demonstrate your extension's functionality. Write a clear, keyword-rich description that explains the features and benefits. Include screenshots showing the extension in action on different types of websites. Proper SEO optimization helps your extension rank higher in search results.

---

Conclusion {#conclusion}

Congratulations! You've learned how to build a complete dark mode Chrome extension with color inversion and custom themes. This project taught you fundamental skills that apply to virtually any Chrome extension you might build in the future. You now understand content script injection, CSS manipulation, storage API usage, and popup-to-content communication.

The extension you built serves as an excellent foundation for more advanced features. Consider adding automatic theme detection, site-specific preferences, keyboard shortcuts, and custom theme creation to make your extension even more powerful. The dark mode extension category remains one of the most popular on the Chrome Web Store, making this an excellent project for building practical development skills while creating something genuinely useful.

Remember to test thoroughly across different websites and browser configurations before publishing. User feedback will help you identify areas for improvement and guide future development. Good luck with your Chrome extension development journey!
