---
layout: post
title: "Build a Viewport Size Checker Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a viewport checker extension that displays real-time viewport dimensions and device info. Perfect for responsive design testing and debugging web projects."
date: 2025-01-27
categories: [Chrome Extensions, Developer Tools]
tags: [chrome-extension, developer-tools]
keywords: "viewport checker extension, screen size chrome, responsive viewport"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/27/build-viewport-size-checker-chrome-extension/"
---

# Build a Viewport Size Checker Chrome Extension: Complete Developer's Guide

In the world of modern web development, understanding how your website renders across different viewport sizes is crucial. Whether you're building responsive layouts, debugging CSS issues, or testing breakpoints, having a reliable viewport checker extension in your browser can save countless hours of manual testing. In this comprehensive guide, we'll walk you through building a fully functional Viewport Size Checker Chrome Extension that displays real-time viewport dimensions, device information, and provides useful tools for responsive design development.

The demand for responsive web design has never been higher. With users accessing websites from an ever-growing variety of devices — from large desktop monitors to small mobile phones — developers need robust tools to ensure their designs work seamlessly across all screen sizes. A custom viewport checker extension gives you instant access to viewport information without relying on browser DevTools, making it an essential addition to any developer's toolkit.

## Why Build a Viewport Checker Extension?

Before diving into the code, let's explore why a viewport checker extension is valuable for web developers. Traditional methods of checking viewport sizes involve opening Chrome DevTools, toggling the device toolbar, and manually reading dimensions. While DevTools is powerful, having a dedicated extension provides several advantages:

**Instant Access**: A viewport checker extension displays dimensions directly in your browser toolbar, accessible with a single click. No need to open DevTools panels or switch contexts.

**Real-Time Monitoring**: The best viewport checker extensions update in real-time as you resize windows or navigate between pages, providing immediate feedback on how viewport sizes change.

**Custom Features**: Building your own extension allows you to add features tailored to your specific workflow, whether that's breakpoint indicators, device frame overlays, or export functionality.

**Learning Opportunity**: Creating a Chrome extension is an excellent way to learn the extension development workflow, manifest versioning, and browser API usage — skills that transfer to many other extension projects.

## Project Architecture and File Structure

Our viewport checker extension will consist of several key components working together to provide a seamless user experience. Let's examine the file structure we'll create:

```
viewport-checker/
├── manifest.json          # Extension configuration and permissions
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic and viewport calculations
├── popup.css              # Styling for the popup
├── content.js             # Content script for page interaction
├── background.js          # Background service worker
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

Each file serves a specific purpose in our extension architecture. The manifest.json defines our extension's capabilities and permissions, while the popup files handle the user interface. Content scripts allow us to interact with web pages, and the background service worker manages communication between components.

## Creating the Manifest File

Every Chrome extension begins with a manifest.json file that declares the extension's configuration, permissions, and capabilities. For our viewport checker, we'll use Manifest V3, which is the current standard and provides improved security and performance.

```json
{
  "manifest_version": 3,
  "name": "Viewport Size Checker",
  "version": "1.0.0",
  "description": "Display real-time viewport dimensions and device information for responsive design testing",
  "permissions": [
    "activeTab",
    "storage"
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
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest declares the essential permissions our extension needs. We request "activeTab" permission to access information about the current tab, and "storage" permission to save user preferences. The "action" key defines our popup, and "content_scripts" allows us to inject JavaScript into web pages to measure viewport dimensions.

## Building the Content Script

The content script is the heart of our viewport measurement logic. It runs in the context of web pages and can access the DOM to retrieve accurate viewport information. Let's create a robust content script:

```javascript
// content.js - Runs in the context of web pages
(function() {
  // Store previous dimensions to detect changes
  let previousDimensions = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  // Function to get comprehensive viewport information
  function getViewportInfo() {
    const info = {
      // Core viewport dimensions
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      
      // Outer dimensions (including toolbars)
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      
      // Document dimensions
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      
      // Screen dimensions
      screenWidth: screen.width,
      screenHeight: screen.height,
      availScreenWidth: screen.availWidth,
      availScreenHeight: screen.availHeight,
      
      // Device pixel ratio for high-DPI displays
      devicePixelRatio: window.devicePixelRatio,
      
      // Orientation
      orientation: screen.orientation ? screen.orientation.type : 'unknown',
      
      // Color depth
      colorDepth: screen.colorDepth,
      
      // Breakpoint detection
      breakpoint: getBreakpoint(window.innerWidth),
      
      // Pixel ratio adjusted dimensions
      deviceWidth: window.innerWidth * window.devicePixelRatio,
      deviceHeight: window.innerHeight * window.devicePixelRatio
    };
    
    return info;
  }

  // Determine current responsive breakpoint
  function getBreakpoint(width) {
    if (width < 576) return 'xs';      // Extra small
    if (width < 768) return 'sm';       // Small
    if (width < 992) return 'md';      // Medium
    if (width < 1200) return 'lg';     // Large
    if (width < 1400) return 'xl';     // Extra large
    return 'xxl';                       // Extra extra large
  }

  // Listen for viewport changes
  function setupResizeListener() {
    let resizeTimeout;
    
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        const currentDimensions = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        
        // Only notify if dimensions actually changed
        if (currentDimensions.width !== previousDimensions.width ||
            currentDimensions.height !== previousDimensions.height) {
          previousDimensions = currentDimensions;
          notifyBackgroundOfChange();
        }
      }, 100); // Debounce resize events
    });
  }

  // Notify background script of viewport changes
  function notifyBackgroundOfChange() {
    const viewportInfo = getViewportInfo();
    chrome.runtime.sendMessage({
      type: 'VIEWPORT_CHANGED',
      data: viewportInfo
    });
  }

  // Initialize the content script
  function init() {
    setupResizeListener();
    
    // Send initial viewport info to background
    notifyBackgroundOfChange();
    
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_VIEWPORT_INFO') {
        sendResponse(getViewportInfo());
      }
      return true;
    });
  }

  // Start the content script
  init();
})();
```

This content script provides comprehensive viewport information including not just the basic innerWidth and innerHeight, but also screen dimensions, device pixel ratio for retina displays, breakpoint detection based on common responsive frameworks, and orientation information. The resize listener includes debouncing to prevent excessive updates during window dragging.

## Creating the Background Service Worker

The background service worker acts as a central hub for communication between our extension's components. It manages state and facilitates message passing:

```javascript
// background.js - Service worker for extension lifecycle management
let cachedViewportInfo = null;

// Listen for viewport updates from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VIEWPORT_CHANGED') {
    cachedViewportInfo = message.data;
    
    // Update badge with current width
    chrome.action.setBadgeText({
      text: message.data.viewportWidth.toString()
    });
    
    // Set badge background color
    chrome.action.setBadgeBackgroundColor({
      color: '#4285f4'
    });
  }
  
  if (message.type === 'GET_CACHED_VIEWPORT_INFO') {
    sendResponse(cachedViewportInfo);
  }
  
  return true;
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Viewport Checker installed:', details.reason);
});

// Clean up when extension is updated
chrome.runtime.onUpdateAvailable.addListener(() => {
  console.log('Viewport Checker update available');
});
```

The background service worker caches viewport information for quick access and updates the extension badge to show the current viewport width at a glance. This provides immediate feedback even before clicking on the extension.

## Building the Popup Interface

The popup provides the main user interface for our extension. Let's create an attractive and functional popup:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Viewport Checker</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Viewport Checker</h1>
      <span class="badge-info">Live</span>
    </header>
    
    <main class="popup-content">
      <section class="dimensions-display">
        <div class="dimension-item primary">
          <span class="dimension-label">Viewport</span>
          <span class="dimension-value" id="viewport-dimensions">-- × --</span>
        </div>
        
        <div class="dimension-item">
          <span class="dimension-label">Screen</span>
          <span class="dimension-value" id="screen-dimensions">-- × --</span>
        </div>
        
        <div class="dimension-item">
          <span class="dimension-label">Document</span>
          <span class="dimension-value" id="document-dimensions">-- × --</span>
        </div>
      </section>
      
      <section class="device-info">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Breakpoint</span>
            <span class="info-value" id="breakpoint">--</span>
          </div>
          <div class="info-item">
            <span class="info-label">Pixel Ratio</span>
            <span class="info-value" id="pixel-ratio">--</span>
          </div>
          <div class="info-item">
            <span class="info-label">Orientation</span>
            <span class="info-value" id="orientation">--</span>
          </div>
          <div class="info-item">
            <span class="info-label">Color Depth</span>
            <span class="info-value" id="color-depth">--</span>
          </div>
        </div>
      </section>
      
      <section class="visual-representation">
        <div class="viewport-visual" id="viewport-visual">
          <div class="visual-label">Visual</div>
        </div>
      </section>
    </main>
    
    <footer class="popup-footer">
      <button id="copy-btn" class="action-btn">
        <span class="btn-icon">📋</span> Copy Info
      </button>
      <button id="refresh-btn" class="action-btn secondary">
        <span class="btn-icon">🔄</span> Refresh
      </button>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The popup presents information in a clear, organized layout with primary dimensions prominently displayed, device information in a grid format, and a visual representation of the viewport relative to the screen.

## Styling the Popup

Let's create attractive CSS styling for our popup:

```css
/* popup.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
}

.popup-container {
  padding: 16px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.popup-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.badge-info {
  background: #10b981;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.popup-content {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dimensions-display {
  margin-bottom: 16px;
}

.dimension-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.dimension-item:last-child {
  border-bottom: none;
}

.dimension-item.primary {
  background: linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%);
  margin: -16px -16px 16px -16px;
  padding: 16px;
  border-radius: 12px 12px 0 0;
  border-bottom: none;
}

.dimension-label {
  color: #6c757d;
  font-size: 13px;
}

.dimension-value {
  font-weight: 600;
  font-size: 16px;
  color: #212529;
  font-family: 'Monaco', 'Menlo', monospace;
}

.dimension-item.primary .dimension-value {
  font-size: 20px;
  color: #667eea;
}

.device-info {
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 8px;
  text-align: center;
}

.info-label {
  display: block;
  font-size: 11px;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.info-value {
  display: block;
  font-weight: 600;
  color: #212529;
  font-size: 14px;
}

.visual-representation {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.viewport-visual {
  width: 100%;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  position: relative;
  margin: 0 auto;
  max-width: 200px;
}

.visual-label {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 10px;
  color: white;
  opacity: 0.8;
}

.popup-footer {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.action-btn.primary {
  background: white;
  color: #667eea;
}

.action-btn.primary:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 14px;
}
```

The styling creates a modern, visually appealing popup with a gradient header, organized information sections, and interactive buttons with hover effects.

## Implementing Popup Logic

Finally, let's create the JavaScript for the popup:

```javascript
// popup.js - Popup interface logic
document.addEventListener('DOMContentLoaded', function() {
  // Get the active tab and request viewport information
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0]) {
      // Send message to content script to get viewport info
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_VIEWPORT_INFO' }, function(response) {
        if (response) {
          updatePopup(response);
        } else {
          // Fallback: try to get from background cache
          chrome.runtime.sendMessage({ type: 'GET_CACHED_VIEWPORT_INFO' }, function(cached) {
            if (cached) {
              updatePopup(cached);
            } else {
              showError();
            }
          });
        }
      });
    }
  });

  // Update popup UI with viewport information
  function updatePopup(info) {
    // Update dimensions
    document.getElementById('viewport-dimensions').textContent = 
      `${info.viewportWidth} × ${info.viewportHeight}`;
    document.getElementById('screen-dimensions').textContent = 
      `${info.screenWidth} × ${info.screenHeight}`;
    document.getElementById('document-dimensions').textContent = 
      `${info.documentWidth} × ${info.documentHeight}`;
    
    // Update device info
    document.getElementById('breakpoint').textContent = info.breakpoint.toUpperCase();
    document.getElementById('pixel-ratio').textContent = `${info.devicePixelRatio}x`;
    document.getElementById('orientation').textContent = info.orientation.split('-')[0];
    document.getElementById('color-depth').textContent = `${info.colorDepth}-bit`;
    
    // Update visual representation
    updateVisualRepresentation(info);
  }

  // Update the visual viewport representation
  function updateVisualRepresentation(info) {
    const visual = document.getElementById('viewport-visual');
    const aspectRatio = info.viewportWidth / info.viewportHeight;
    
    // Calculate visual dimensions (scaled)
    const maxWidth = 160;
    const maxHeight = 60;
    
    let visualWidth, visualHeight;
    if (aspectRatio > maxWidth / maxHeight) {
      visualWidth = maxWidth;
      visualHeight = maxWidth / aspectRatio;
    } else {
      visualHeight = maxHeight;
      visualWidth = maxHeight * aspectRatio;
    }
    
    visual.style.width = `${visualWidth}px`;
    visual.style.height = `${visualHeight}px`;
    visual.style.margin = '0 auto';
  }

  // Show error state
  function showError() {
    document.getElementById('viewport-dimensions').textContent = 'Error';
    console.error('Could not retrieve viewport information');
  }

  // Copy button functionality
  document.getElementById('copy-btn').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_VIEWPORT_INFO' }, function(info) {
        if (info) {
          const text = `Viewport: ${info.viewportWidth}x${info.viewportHeight}
Screen: ${info.screenWidth}x${info.screenHeight}
Breakpoint: ${info.breakpoint}
Device Pixel Ratio: ${info.devicePixelRatio}
Orientation: ${info.orientation}`;
          
          navigator.clipboard.writeText(text).then(function() {
            const btn = document.getElementById('copy-btn');
            btn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
            setTimeout(function() {
              btn.innerHTML = '<span class="btn-icon">📋</span> Copy Info';
            }, 2000);
          });
        }
      });
    });
  });

  // Refresh button functionality
  document.getElementById('refresh-btn').addEventListener('click', function() {
    chrome.tabs.reload();
  });
});
```

The popup JavaScript handles retrieving viewport information, updating the UI dynamically, copying information to the clipboard, and refreshing the current tab.

## Testing Your Extension

Now that we've created all the necessary files, let's test our extension:

1. **Create the icons directory** and add placeholder icons (or use any PNG images named icon16.png, icon48.png, and icon128.png)

2. **Open Chrome and navigate to** `chrome://extensions/`

3. **Enable Developer mode** using the toggle in the top right corner

4. **Click "Load unpacked"** and select your extension directory

5. **Test the extension** by visiting any website and clicking the extension icon

You should see the popup displaying real-time viewport dimensions, device information, and breakpoint detection. The extension badge will show the current viewport width.

## Enhancements and Future Improvements

This viewport checker extension provides a solid foundation that you can extend with additional features:

**Breakpoint Overlays**: Add the ability to visually overlay common breakpoint markers on web pages to see exactly where your design will break.

**History Tracking**: Record viewport sizes over time as you navigate, creating a log of all the viewports you've tested.

**Screenshot Capture**: Add functionality to capture screenshots at specific viewport sizes for documentation.

**Custom Breakpoints**: Allow users to define their own breakpoint thresholds based on their specific design requirements.

**Export Functionality**: Export viewport data in various formats (JSON, CSV) for testing reports.

**Integration with Design Tools**: Export dimensions directly to Figma, Sketch, or other design tools.

## Conclusion

Building a viewport checker extension is an excellent project that combines practical utility with valuable learning opportunities. You've learned how to create a Manifest V3 extension, implement content scripts for DOM access, build background service workers for state management, and design attractive popup interfaces.

This extension solves a real problem for web developers: quickly accessing viewport information without leaving the browser context. The real-time updates, comprehensive device information, and visual representation make it an invaluable tool for responsive design development.

As you continue developing Chrome extensions, remember that the techniques learned here — message passing between components, content script injection, and popup interface design — apply to virtually any extension project you undertake. The Chrome Web Store offers vast opportunities for developers to share useful tools with millions of users.

Start building your viewport checker today, and customize it to match your specific development workflow. The foundation is solid, and the possibilities for enhancement are virtually unlimited.
