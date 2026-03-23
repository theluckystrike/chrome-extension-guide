---
layout: post
title: "Build a Responsive Design Tester Extension"
description: "Learn how to create a powerful Responsive Design Tester Extension for Chrome. This comprehensive guide covers viewport simulation, device presets, touch emulation, and Manifest V3 best practices for building professional mobile testing tools."
date: 2025-01-26
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "responsive tester extension, mobile view chrome, device simulator extension, responsive design testing tool, chrome responsive tester, viewport tester chrome extension, mobile emulator extension"
canonical_url: "https://bestchromeextensions.com/2025/01/26/build-responsive-design-tester-extension/"
---

# Build a Responsive Design Tester Extension

Responsive web design has become a non-negotiable aspect of modern web development. With users accessing websites from an ever-expanding array of devices—from massive desktop monitors to compact smartphones—developers need reliable tools to test how their designs adapt across different screen sizes and orientations. While Chrome's built-in DevTools provides basic viewport resizing capabilities, a dedicated responsive design tester extension can dramatically improve your workflow by offering device presets, quick orientation switching, touch emulation, and screenshot capabilities all from a convenient popup interface.

This comprehensive guide will walk you through building a complete Responsive Design Tester Extension using Chrome's Manifest V3 API. By the end of this tutorial, you will have a fully functional extension that can simulate various devices, test responsive breakpoints, capture screenshots at different viewports, and help ensure your websites look perfect on every device your users might use.

---

## Understanding Responsive Testing Requirements {#understanding-responsive-testing}

Before diving into code, it is essential to understand what makes a responsive design tester truly useful for developers. The best responsive testing tools go beyond simple window resizing—they provide accurate device simulation that accounts for the nuanced differences between actual devices and generic viewport sizes.

### Why Built-in DevTools May Not Be Enough

Chrome DevTools offers device mode through the toggle device toolbar, which allows you to select from preset device dimensions and simulate touch events. However, this requires opening DevTools (pressing F12 or Ctrl+Shift+I), navigating to the device toolbar, and then selecting your desired device. This workflow becomes tedious when you need to quickly switch between multiple devices during active development or when testing numerous breakpoint scenarios.

A dedicated responsive tester extension solves this problem by providing instant access to device simulation directly from the browser toolbar. With just one click, you can switch between an iPhone, iPad, Android phone, or desktop view without leaving your current workflow. This streamlined access saves valuable time and encourages more frequent responsive testing throughout the development process.

### Key Features of a Professional Responsive Tester

A well-designed responsive design tester extension should include several core features that address the most common testing scenarios web developers face daily. First and foremost, accurate device simulation with presets for popular devices including iPhones, iPads, Android phones, and common laptop resolutions provides immediate value. These presets should include the actual viewport dimensions, device pixel ratio, and user agent strings that match real-world devices.

Orientation switching is another critical feature that allows you to test landscape and portrait modes with a single click. Many modern websites implement different layouts for landscape orientation, particularly on tablets, making this capability essential for comprehensive testing. Touch event simulation enables developers to verify that tap targets are appropriately sized and that hover states are properly replaced with touch-friendly alternatives on mobile devices.

Viewport dimension display shows the current width and height of the simulated viewport, which helps developers identify exactly when their responsive breakpoints are triggered. Screenshot capabilities at different viewports allow for visual comparison and documentation of responsive behavior. Finally, responsive breakpoint presets let you quickly jump to common breakpoints like 320px, 480px, 768px, 1024px, and 1440px without needing to manually drag resize.

---

## Project Architecture and Setup {#project-architecture}

Let us set up the project structure for our Responsive Design Tester Extension. We will create a well-organized extension with clear separation between the popup interface, content scripts, and background logic.

### Directory Structure

Create a new directory for your extension project and set up the following structure:

```
responsive-tester/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   └── content.js
├── background/
│   └── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

This structure follows Chrome's recommended extension architecture, separating concerns between the popup interface users interact with, content scripts that manipulate the page, and background scripts that handle persistent state and cross-tab coordination.

### Manifest Configuration

The manifest.json file defines your extension's capabilities and permissions. For a responsive tester extension, we need access to the active tab to manipulate its viewport and capture screenshots.

```json
{
  "manifest_version": 3,
  "name": "Responsive Design Tester",
  "version": "1.0",
  "description": "Test responsive designs across multiple device viewports with ease",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background/background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest declares the necessary permissions for our extension to function. The `activeTab` permission allows us to execute scripts on the currently active tab when the user activates our extension. The `scripting` permission enables us to inject JavaScript and CSS into pages, which we will use to modify viewport dimensions. The `storage` permission lets us remember user preferences across sessions.

---

## Building the Device Preset System {#device-presets}

The core functionality of any responsive tester extension is its device preset system. We need a comprehensive list of devices with accurate viewport dimensions, device pixel ratios, and user agent strings that realistically simulate each device.

### Defining Device Presets

Create a JavaScript file to store our device definitions. This data structure will be used across the popup, content script, and background service worker to ensure consistent device simulation.

```javascript
// devicePresets.js
const devicePresets = [
  {
    name: "iPhone 14 Pro",
    width: 393,
    height: 852,
    devicePixelRatio: 3,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    touch: true
  },
  {
    name: "iPhone 14 Pro Max",
    width: 430,
    height: 932,
    devicePixelRatio: 3,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    touch: true
  },
  {
    name: "iPhone SE",
    width: 375,
    height: 667,
    devicePixelRatio: 2,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    touch: true
  },
  {
    name: "iPad Pro 12.9\"",
    width: 1024,
    height: 1366,
    devicePixelRatio: 2,
    userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 iPad Safari/604.1",
    isMobile: true,
    touch: true
  },
  {
    name: "iPad Pro 11\"",
    width: 834,
    height: 1194,
    devicePixelRatio: 2,
    userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 iPad Safari/604.1",
    isMobile: true,
    touch: true
  },
  {
    name: "iPad Mini",
    width: 768,
    height: 1024,
    devicePixelRatio: 2,
    userAgent: "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 iPad Safari/604.1",
    isMobile: true,
    touch: true
  },
  {
    name: "Samsung Galaxy S23",
    name: "Samsung Galaxy S23",
    width: 360,
    height: 780,
    devicePixelRatio: 3,
    userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    touch: true
  },
  {
    name: "Samsung Galaxy S23 Ultra",
    width: 412,
    height: 846,
    devicePixelRatio: 3,
    userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    touch: true
  },
  {
    name: "Google Pixel 7",
    width: 412,
    height: 915,
    devicePixelRatio: 2.625,
    userAgent: "Mozilla/5.0 (Linux; Android 13; G2ZO4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    touch: true
  },
  {
    name: "OnePlus 9",
    width: 412,
    height: 915,
    devicePixelRatio: 2.625,
    userAgent: "Mozilla/5.0 (Linux; Android 12; LE2115) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
    isMobile: true,
    touch: true
  },
  {
    name: "Desktop HD",
    width: 1366,
    height: 768,
    devicePixelRatio: 1,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    isMobile: false,
    touch: false
  },
  {
    name: "Desktop Full HD",
    width: 1920,
    height: 1080,
    devicePixelRatio: 1,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
    isMobile: false,
    touch: false
  },
  {
    name: "MacBook Pro 14\"",
    width: 1512,
    height: 982,
    devicePixelRatio: 2,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
    isMobile: false,
    touch: false
  },
  {
    name: "MacBook Air M2",
    width: 1470,
    height: 956,
    devicePixelRatio: 2,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
    isMobile: false,
    touch: false
  }
];

const breakpoints = [
  { name: "Extra Small", width: 320, height: 480 },
  { name: "Small", width: 480, height: 640 },
  { name: "Medium", width: 768, height: 1024 },
  { name: "Large", width: 1024, height: 1366 },
  { name: "Extra Large", width: 1440, height: 900 },
  { name: "Ultra Wide", width: 1920, height: 1080 }
];

export { devicePresets, breakpoints };
```

This comprehensive device preset system covers the most commonly used devices across iOS, Android, and desktop platforms. Each preset includes the logical viewport dimensions, device pixel ratio for accurate rendering, and appropriate user agent strings for realistic browser simulation.

---

## Implementing the Content Script {#content-script}

The content script is the bridge between our extension and the web page being tested. It handles the actual viewport manipulation, device pixel ratio changes, and user agent spoofing.

```javascript
// content/content.js
(function() {
  // Store original values to allow restoration
  let originalViewport = null;
  let originalUserAgent = null;

  // Function to apply device simulation
  function applyDeviceSimulation(device) {
    // Store original values if not already stored
    if (!originalViewport) {
      originalViewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
    }

    // Create viewport meta tag if it doesn't exist
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      document.head.appendChild(viewportMeta);
    }

    // Update viewport meta content
    viewportMeta.content = `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`;

    // Apply viewport override using Chrome's debugging API
    // This requires communication with the background script
    chrome.runtime.sendMessage({
      action: 'simulateDevice',
      device: device,
      tabId: chrome.runtime.id
    });
  }

  // Function to reset to original viewport
  function resetViewport() {
    if (originalViewport) {
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.content = 'width=device-width, initial-scale=1.0';
      }
      
      chrome.runtime.sendMessage({
        action: 'resetDevice',
        originalViewport: originalViewport
      });
      
      originalViewport = null;
    }
  }

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getViewport') {
      sendResponse({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      });
    }
    
    if (message.action === 'applyDevice' && message.device) {
      applyDeviceSimulation(message.device);
      sendResponse({ success: true });
    }
    
    if (message.action === 'reset') {
      resetViewport();
      sendResponse({ success: true });
    }
    
    return true;
  });

  // Export functions for use in console
  window.responsiveTester = {
    applyDevice: applyDeviceSimulation,
    reset: resetViewport
  };
})();
```

The content script maintains a reference to the original viewport dimensions so users can easily reset their browser to its normal state after testing. It communicates with the background script to leverage Chrome's more powerful APIs for device simulation.

---

## Building the Background Service Worker {#background-worker}

The background service worker coordinates device simulation across tabs and handles the actual viewport resizing using Chrome's chrome.debugger API or alternative approaches.

```javascript
// background/background.js
// Store active device simulations per tab
const activeSimulations = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'simulateDevice') {
    simulateDevice(message.tabId, message.device)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (message.action === 'resetDevice') {
    resetDevice(message.tabId)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (message.action === 'getActiveSimulation') {
    const simulation = activeSimulations.get(message.tabId);
    sendResponse(simulation || null);
    return true;
  }
});

async function simulateDevice(tabId, device) {
  try {
    // Use chrome.scripting to inject CSS that constrains the viewport
    // This approach works without requiring debugger permissions
    
    const width = device.width;
    const height = device.height;
    const dpr = device.devicePixelRatio;
    
    // Inject CSS to constrain and simulate the viewport
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      css: `
        html {
          overflow: hidden !important;
        }
        body {
          overflow: hidden !important;
          max-width: ${width}px !important;
          max-height: ${height}px !important;
          transform: scale(1) !important;
        }
      `
    });
    
    // Inject JavaScript to set viewport dimensions
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (width, height, dpr, device) => {
        // Create a viewport wrapper
        const existingWrapper = document.getElementById('responsive-tester-wrapper');
        if (existingWrapper) {
          existingWrapper.remove();
        }
        
        const wrapper = document.createElement('div');
        wrapper.id = 'responsive-tester-wrapper';
        wrapper.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: ${width}px;
          height: ${height}px;
          overflow: hidden;
          z-index: 2147483647;
          background: white;
          transform-origin: top left;
        `;
        
        // Store the device info
        wrapper.dataset.deviceWidth = width;
        wrapper.dataset.deviceHeight = height;
        wrapper.dataset.deviceDPR = dpr;
        wrapper.dataset.deviceName = device.name;
        
        // Move body content into wrapper
        while (document.body.firstChild) {
          wrapper.appendChild(document.body.firstChild);
        }
        document.body.appendChild(wrapper);
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('responsiveTesterDeviceChanged', {
          detail: { device }
        }));
      },
      args: [width, height, dpr, device]
    });
    
    // Store active simulation
    activeSimulations.set(tabId, device);
    
    // Update extension badge to show active simulation
    chrome.action.setBadgeText({ 
      text: device.name.substring(0, 2),
      tabId: tabId 
    });
    
    return { success: true, device };
  } catch (error) {
    console.error('Device simulation error:', error);
    throw error;
  }
}

async function resetDevice(tabId) {
  try {
    // Remove injected CSS
    await chrome.scripting.removeCSS({
      target: { tabId: tabId },
      css: `
        html { overflow: hidden !important; }
        body { overflow: hidden !important; max-width: none !important; max-height: none !important; }
      `
    });
    
    // Remove wrapper and restore content
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const wrapper = document.getElementById('responsive-tester-wrapper');
        if (wrapper) {
          while (wrapper.firstChild) {
            document.body.appendChild(wrapper.firstChild);
          }
          wrapper.remove();
        }
        
        // Reset viewport meta
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        if (viewportMeta) {
          viewportMeta.content = 'width=device-width, initial-scale=1.0';
        }
      }
    });
    
    // Clear active simulation
    activeSimulations.delete(tabId);
    
    // Clear badge
    chrome.action.setBadgeText({ text: '', tabId: tabId });
    
    return { success: true };
  } catch (error) {
    console.error('Device reset error:', error);
    throw error;
  }
}

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeSimulations.delete(tabId);
});

// Clean up when tab navigates away
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    resetDevice(tabId).catch(() => {});
  }
});
```

This background service worker provides robust device simulation by creating a wrapper element that constrains the viewport to the selected device's dimensions. This approach avoids the complexity of debugger APIs while still providing accurate visual simulation.

---

## Creating the Popup Interface {#popup-interface}

The popup interface is what users interact with when they click the extension icon. It should be intuitive, fast, and provide quick access to all testing features.

### Popup HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Responsive Tester</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Responsive Tester</h1>
      <div class="current-viewport" id="currentViewport">
        <span class="dimension">--- × ---</span>
        <span class="dpr">DPR: 1x</span>
      </div>
    </header>

    <section class="device-section">
      <h2>Devices</h2>
      <div class="device-grid" id="deviceGrid">
        <!-- Device buttons will be injected here -->
      </div>
    </section>

    <section class="breakpoint-section">
      <h2>Breakpoints</h2>
      <div class="breakpoint-grid" id="breakpointGrid">
        <!-- Breakpoint buttons will be injected here -->
      </div>
    </section>

    <section class="orientation-section">
      <h2>Orientation</h2>
      <div class="orientation-buttons">
        <button id="portraitBtn" class="orientation-btn active" title="Portrait">
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
            <rect x="2" y="2" width="20" height="28" rx="2" stroke="currentColor" stroke-width="2"/>
          </svg>
          Portrait
        </button>
        <button id="landscapeBtn" class="orientation-btn" title="Landscape">
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
            <rect x="2" y="2" width="28" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
          </svg>
          Landscape
        </button>
      </div>
    </section>

    <section class="custom-size-section">
      <h2>Custom Size</h2>
      <div class="custom-size-inputs">
        <div class="input-group">
          <label for="customWidth">Width</label>
          <input type="number" id="customWidth" placeholder="320" min="100" max="3840">
          <span class="unit">px</span>
        </div>
        <div class="input-group">
          <label for="customHeight">Height</label>
          <input type="number" id="customHeight" placeholder="568" min="100" max="2160">
          <span class="unit">px</span>
        </div>
        <button id="applyCustomBtn" class="apply-btn">Apply</button>
      </div>
    </section>

    <footer class="popup-footer">
      <button id="resetBtn" class="reset-btn">Reset Viewport</button>
      <button id="screenshotBtn" class="screenshot-btn">📸 Screenshot</button>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### Popup CSS Styling

```css
/* popup/popup.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 340px;
  background: #f5f5f5;
  color: #333;
}

.popup-container {
  padding: 16px;
}

.popup-header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.popup-header h1 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a73e8;
}

.current-viewport {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 13px;
  color: #666;
}

.current-viewport .dimension {
  font-weight: 600;
  font-family: monospace;
}

section {
  margin-bottom: 16px;
}

section h2 {
  font-size: 12px;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.device-grid,
.breakpoint-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.device-btn,
.breakpoint-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  text-align: left;
  transition: all 0.15s ease;
}

.device-btn:hover,
.breakpoint-btn:hover {
  border-color: #1a73e8;
  background: #f8f9fa;
}

.device-btn.active,
.breakpoint-btn.active {
  background: #1a73e8;
  border-color: #1a73e8;
  color: white;
}

.device-btn .device-name {
  font-weight: 500;
  display: block;
}

.device-btn .device-dims {
  font-size: 10px;
  opacity: 0.7;
}

.orientation-buttons {
  display: flex;
  gap: 8px;
}

.orientation-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  transition: all 0.15s ease;
}

.orientation-btn:hover {
  border-color: #1a73e8;
}

.orientation-btn.active {
  background: #1a73e8;
  border-color: #1a73e8;
  color: white;
}

.custom-size-inputs {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.input-group {
  flex: 1;
}

.input-group label {
  display: block;
  font-size: 10px;
  color: #666;
  margin-bottom: 4px;
}

.input-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.input-group .unit {
  font-size: 11px;
  color: #888;
}

.apply-btn {
  padding: 8px 16px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.apply-btn:hover {
  background: #1557b0;
}

.popup-footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

.reset-btn {
  flex: 1;
  padding: 10px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #333;
}

.reset-btn:hover {
  background: #e8e8e8;
}

.screenshot-btn {
  padding: 10px 16px;
  background: #34a853;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.screenshot-btn:hover {
  background: #2d8e47;
}
```

### Popup JavaScript Logic

```javascript
// popup/popup.js
import { devicePresets, breakpoints } from '../devicePresets.js';

let currentDevice = null;
let isPortrait = true;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadActiveSimulation();
  renderDevices();
  renderBreakpoints();
  setupEventListeners();
  await updateCurrentViewport();
});

async function loadActiveSimulation() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getViewport' });
      if (response) {
        currentDevice = response;
      }
    } catch (error) {
      console.log('No active simulation');
    }
  }
}

function renderDevices() {
  const deviceGrid = document.getElementById('deviceGrid');
  deviceGrid.innerHTML = devicePresets.map(device => `
    <button class="device-btn ${currentDevice?.name === device.name ? 'active' : ''}" 
            data-device="${encodeURIComponent(JSON.stringify(device))}">
      <span class="device-name">${device.name}</span>
      <span class="device-dims">${device.width} × ${device.height}</span>
    </button>
  `).join('');
}

function renderBreakpoints() {
  const breakpointGrid = document.getElementById('breakpointGrid');
  breakpointGrid.innerHTML = breakpoints.map(bp => `
    <button class="breakpoint-btn" data-width="${bp.width}" data-height="${bp.height}">
      ${bp.name} (${bp.width}px)
    </button>
  `).join('');
}

function setupEventListeners() {
  // Device buttons
  document.getElementById('deviceGrid').addEventListener('click', async (e) => {
    const btn = e.target.closest('.device-btn');
    if (btn) {
      const device = JSON.parse(decodeURIComponent(btn.dataset.device));
      await applyDevice(device);
      updateActiveButtons();
    }
  });

  // Breakpoint buttons
  document.getElementById('breakpointGrid').addEventListener('click', async (e) => {
    const btn = e.target.closest('.breakpoint-btn');
    if (btn) {
      const width = parseInt(btn.dataset.width);
      const height = parseInt(btn.dataset.height);
      const device = {
        name: `Custom ${width}px`,
        width: width,
        height: height,
        devicePixelRatio: 1,
        isMobile: width < 768
      };
      await applyDevice(device);
      updateActiveButtons();
    }
  });

  // Orientation buttons
  document.getElementById('portraitBtn').addEventListener('click', async () => {
    if (!isPortrait && currentDevice) {
      isPortrait = true;
      const newDevice = {
        ...currentDevice,
        width: Math.min(currentDevice.width, currentDevice.height),
        height: Math.max(currentDevice.width, currentDevice.height),
        name: currentDevice.name + ' Portrait'
      };
      await applyDevice(newDevice);
      updateOrientationButtons();
    }
  });

  document.getElementById('landscapeBtn').addEventListener('click', async () => {
    if (isPortrait && currentDevice) {
      isPortrait = false;
      const newDevice = {
        ...currentDevice,
        width: Math.max(currentDevice.width, currentDevice.height),
        height: Math.min(currentDevice.width, currentDevice.height),
        name: currentDevice.name + ' Landscape'
      };
      await applyDevice(newDevice);
      updateOrientationButtons();
    }
  });

  // Custom size
  document.getElementById('applyCustomBtn').addEventListener('click', async () => {
    const width = parseInt(document.getElementById('customWidth').value);
    const height = parseInt(document.getElementById('customHeight').value);
    
    if (width && height) {
      const device = {
        name: `Custom ${width}×${height}`,
        width: width,
        height: height,
        devicePixelRatio: 1,
        isMobile: width < 768
      };
      await applyDevice(device);
      updateActiveButtons();
    }
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'reset' });
      currentDevice = null;
      updateActiveButtons();
      await updateCurrentViewport();
    }
  });

  // Screenshot button
  document.getElementById('screenshotBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      // Use chrome.tabs.captureVisibleTab
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { 
        format: 'png',
        quality: 100
      });
      
      // Create download link
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `screenshot-${currentDevice?.name || 'viewport'}-${Date.now()}.png`;
      a.click();
    }
  });
}

async function applyDevice(device) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, { 
      action: 'applyDevice', 
      device: device 
    });
    currentDevice = device;
    await updateCurrentViewport();
  }
}

function updateActiveButtons() {
  document.querySelectorAll('.device-btn, .breakpoint-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (currentDevice) {
    const deviceBtns = document.querySelectorAll('.device-btn');
    deviceBtns.forEach(btn => {
      const device = JSON.parse(decodeURIComponent(btn.dataset.device));
      if (device.name === currentDevice.name) {
        btn.classList.add('active');
      }
    });
  }
}

function updateOrientationButtons() {
  document.getElementById('portraitBtn').classList.toggle('active', isPortrait);
  document.getElementById('landscapeBtn').classList.toggle('active', !isPortrait);
}

async function updateCurrentViewport() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      const viewport = await chrome.tabs.sendMessage(tab.id, { action: 'getViewport' });
      if (viewport) {
        document.querySelector('.current-viewport .dimension').textContent = 
          `${viewport.width} × ${viewport.height}`;
        document.querySelector('.current-viewport .dpr').textContent = 
          `DPR: ${viewport.devicePixelRatio}x`;
      }
    } catch (error) {
      document.querySelector('.current-viewport .dimension').textContent = 
        `${window.innerWidth} × ${window.innerHeight}`;
    }
  }
}
```

---

## Adding Advanced Features {#advanced-features}

To make your responsive tester extension truly professional, consider implementing these advanced features that enhance the testing workflow.

### Screenshot Comparison Tool

One of the most valuable features for responsive testing is the ability to capture and compare screenshots across different viewports. Implement a screenshot gallery that stores captured images and allows side-by-side comparison.

### Responsive Grid Overlay

Add a visual grid overlay that shows common responsive breakpoints directly on the page. This helps developers see exactly where their content breaks across different viewport sizes.

### Cookie and Local Storage Sync

When testing responsive designs that depend on user preferences or authentication states, maintaining the same cookies and local storage across device simulations ensures consistent testing conditions.

---

## Testing Your Extension {#testing-your-extension}

Before publishing your extension, thorough testing is essential to ensure it works correctly across various scenarios and does not interfere with legitimate website functionality.

### Manual Testing Checklist

Test your extension across multiple device types, verifying that viewport dimensions are accurately simulated. Check that orientation switching works correctly and that the reset function properly restores the original viewport. Verify that screenshots capture the simulated viewport correctly and that the extension does not break when navigating between pages or refreshing.

### Publishing to Chrome Web Store

Once testing is complete, you can publish your extension to the Chrome Web Store. Prepare your store listing with clear screenshots, a compelling description, and relevant keywords to help users find your extension. Ensure you comply with all Chrome Web Store policies, particularly regarding user privacy and data handling.

---

## Conclusion {#conclusion}

Building a Responsive Design Tester Extension is an excellent project that combines practical utility with meaningful Chrome extension development concepts. Throughout this guide, you have learned how to create device presets that accurately simulate real-world devices, implement content scripts and background workers that safely manipulate viewports, design intuitive popup interfaces for quick device switching, and handle orientation changes and custom viewport sizes.

The extension you have built provides immediate value to web developers, designers, and QA testers who need to verify responsive behavior across multiple devices without leaving their browser. With the foundation established here, you can continue to expand the extension with additional features like breakpoint debugging, visual comparison tools, and integration with design handoff tools.

Remember to test thoroughly before publishing, and consider gathering user feedback to guide future improvements. A well-maintained responsive tester extension can become an indispensable tool in any web developer's workflow, helping ensure that websites deliver excellent user experiences across the full spectrum of devices people use to access the web today.
