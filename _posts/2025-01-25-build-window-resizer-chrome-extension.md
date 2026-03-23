---
layout: post
title: "Build a Window Resizer Chrome Extension for Responsive Design"
description: "Learn how to build a window resizer Chrome extension for responsive design testing. Complete guide covering Manifest V3, popup UI, window management API, and best practices for browser resize extensions."
date: 2025-01-25
categories: [tutorials, chrome-extensions]
tags: [window resizer extension, resize browser chrome, responsive design extension, chrome extension development, chrome extension manifest v3, window management api, browser resize tool, responsive testing tool]
keywords: "window resizer extension, resize browser chrome, responsive design extension, chrome extension window management, browser resize tool, responsive testing chrome extension, manifest v3 window api, chrome extension development guide"
canonical_url: "https://bestchromeextensions.com/2025/01/25/build-window-resizer-chrome-extension/"
---

# Build a Window Resizer Chrome Extension for Responsive Design

Responsive design has become a fundamental aspect of modern web development. With users accessing websites from an ever-growing variety of devices, from large desktop monitors to compact mobile phones, ensuring your web applications look and function beautifully across all screen sizes is no longer optional. It's essential. One of the most practical tools in any web developer's arsenal is a window resizer extension that allows quick and easy testing of responsive layouts without manually dragging browser windows to specific dimensions. we'll walk through building a fully functional Window Resizer Chrome extension using Manifest V3, covering everything from project setup to advanced features like custom presets and keyboard shortcuts.

Creating a window resizer extension for Chrome is an excellent project for developers looking to expand their understanding of Chrome extension architecture while building something genuinely useful for daily workflow. The extension we'll build today will allow users to quickly resize their browser window to common viewport dimensions, custom sizes, and even preset breakpoints used in modern responsive design frameworks. By the end of this tutorial, you'll have a complete, production-ready extension that you can use immediately and optionally publish to the Chrome Web Store.

---

Understanding Chrome Extension Architecture for Window Management {#understanding-chrome-extension-architecture}

Before diving into code, it's crucial to understand the architecture that makes window resizing possible in Chrome extensions. Chrome provides a powerful Windows API that allows extensions to create, modify, and manage browser windows programmatically. This API is part of the chrome.windows namespace and offers methods for querying window information, updating window properties, and handling window events.

The architecture of a Chrome extension typically consists of several components working together. The manifest.json file serves as the configuration hub, declaring permissions, identifying background scripts, and defining the extension's capabilities. The background service worker handles long-running tasks and listens for events, while the popup HTML and JavaScript provide the user interface that appears when clicking the extension icon. For a window resizer extension, we'll primarily interact with the chrome.windows API from either the popup context or the background service worker, depending on our implementation approach.

Manifest V3, the current version of Chrome's extension manifest format, introduced several important changes from Manifest V2. One significant change relevant to our project is that background pages are now replaced by service workers, which are event-driven and can be terminated when idle. This actually works well for our window resizer since resizing operations are typically quick, one-time actions rather than continuous processes. We'll need to ensure our implementation handles the service worker lifecycle appropriately, but this won't present significant challenges for our use case.

The permissions required for window resizing are relatively minimal. We'll need the "windows" permission to access and modify window properties. Unlike some other extension features, window management doesn't require particularly sensitive permissions, making our extension relatively non-intrusive from a privacy perspective. However, we should still be careful about what other permissions we request and clearly explain why we need them in our extension's description.

---

Setting Up the Project Structure {#setting-up-project-structure}

Every Chrome extension begins with a well-organized project structure. Let's create the foundation for our window resizer extension. First, create a new directory for your project, let's call it "window-resizer-extension", and set up the following file structure within it:

```
window-resizer-extension/
 manifest.json
 popup.html
 popup.js
 popup.css
 background.js
 icons/
    icon-16.png
    icon-48.png
    icon-128.png
 README.md
```

This structure separates our concerns cleanly, keeping the manifest configuration separate from the user interface and background logic. The icons directory will hold the extension's icons at various sizes, which are required for the Chrome Web Store and for displaying in the browser's extension manager.

The manifest.json file is the heart of our extension. Let's create a comprehensive manifest that declares all necessary permissions and configurations:

```json
{
  "manifest_version": 3,
  "name": "Window Resizer for Responsive Design",
  "version": "1.0.0",
  "description": "Quickly resize your browser window to common viewport dimensions for responsive design testing",
  "permissions": [
    "windows"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

This manifest declares the "windows" permission, which is essential for our extension to function. It also specifies popup.html as the default popup interface and includes the necessary icon declarations. The version number follows semantic versioning, making it clear this is a first release.

---

Creating the Popup User Interface {#creating-popup-user-interface}

The popup is what users see when they click our extension icon in the Chrome toolbar. For a window resizer, we need an intuitive interface that displays common viewport sizes and allows custom input. Let's create the HTML structure first:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Window Resizer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Window Resizer</h1>
      <p class="subtitle">Responsive Design Testing</p>
    </header>

    <section class="presets">
      <h2>Quick Presets</h2>
      <div class="preset-grid">
        <button class="preset-btn" data-width="1920" data-height="1080">
          <span class="preset-name">Full HD</span>
          <span class="preset-size">1920 × 1080</span>
        </button>
        <button class="preset-btn" data-width="1366" data-height="768">
          <span class="preset-name">Laptop</span>
          <span class="preset-size">1366 × 768</span>
        </button>
        <button class="preset-btn" data-width="1440" data-height="900">
          <span class="preset-name">MacBook</span>
          <span class="preset-size">1440 × 900</span>
        </button>
        <button class="preset-btn" data-width="768" data-height="1024">
          <span class="preset-name">Tablet Portrait</span>
          <span class="preset-size">768 × 1024</span>
        </button>
        <button class="preset-btn" data-width="1024" data-height="768">
          <span class="preset-name">Tablet Landscape</span>
          <span class="preset-size">1024 × 768</span>
        </button>
        <button class="preset-btn" data-width="375" data-height="667">
          <span class="preset-name">iPhone SE</span>
          <span class="preset-size">375 × 667</span>
        </button>
        <button class="preset-btn" data-width="390" data-height="844">
          <span class="preset-name">iPhone 12</span>
          <span class="preset-size">390 × 844</span>
        </button>
        <button class="preset-btn" data-width="414" data-height="896">
          <span class="preset-name">iPhone 11</span>
          <span class="preset-size">414 × 896</span>
        </button>
      </div>
    </section>

    <section class="custom-size">
      <h2>Custom Size</h2>
      <div class="input-group">
        <div class="input-field">
          <label for="custom-width">Width</label>
          <input type="number" id="custom-width" placeholder="Width" min="100" max="3840">
        </div>
        <span class="separator">×</span>
        <div class="input-field">
          <label for="custom-height">Height</label>
          <input type="number" id="custom-height" placeholder="Height" min="100" max="2160">
        </div>
        <button id="apply-custom" class="apply-btn">Apply</button>
      </div>
    </section>

    <section class="options">
      <label class="checkbox-label">
        <input type="checkbox" id="center-window">
        <span>Center on screen</span>
      </label>
    </section>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

This HTML provides a clean, organized interface with two main sections. The presets section displays common viewport sizes organized by device category, making it easy for users to quickly test standard breakpoints. The custom size section allows users to enter specific dimensions for more precise testing. We've also included a checkbox for centering the window, which is a handy feature for responsive testing.

---

Styling the Popup Interface {#styling-popup-interface}

A well-designed popup enhances user experience significantly. Let's create CSS that makes our extension visually appealing and easy to use:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background-color: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 12px;
  color: #666;
}

h2 {
  font-size: 13px;
  font-weight: 600;
  color: #444;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

section {
  margin-bottom: 16px;
}

.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  background: #e8f0fe;
  border-color: #1a73e8;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.preset-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.preset-size {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.input-group {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.input-field {
  flex: 1;
}

.input-field label {
  display: block;
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
}

.input-field input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.input-field input:focus {
  outline: none;
  border-color: #1a73e8;
}

.separator {
  color: #999;
  font-size: 16px;
  padding-bottom: 8px;
}

.apply-btn {
  padding: 8px 16px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.apply-btn:hover {
  background: #1557b0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: #1a73e8;
}
```

This CSS provides a modern, clean look that aligns with Chrome's Material Design guidelines. We've used a subtle color scheme with blue accents, proper spacing, and smooth hover transitions. The grid layout for presets ensures buttons are evenly distributed and easy to tap.

---

Implementing the Extension Logic {#implementing-extension-logic}

Now comes the core functionality, making the extension actually resize windows. We'll create the JavaScript that handles user interactions and communicates with Chrome's Windows API:

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const presetButtons = document.querySelectorAll('.preset-btn');
  const customWidthInput = document.getElementById('custom-width');
  const customHeightInput = document.getElementById('custom-height');
  const applyCustomBtn = document.getElementById('apply-custom');
  const centerWindowCheckbox = document.getElementById('center-window');

  // Get the current window
  async function getCurrentWindow() {
    return await chrome.windows.getCurrent();
  }

  // Resize and optionally center the window
  async function resizeWindow(width, height, shouldCenter = false) {
    try {
      const currentWindow = await getCurrentWindow();
      
      let updateData = {
        width: parseInt(width, 10),
        height: parseInt(height, 10)
      };

      if (shouldCenter) {
        // Get screen dimensions
        const screen = await chrome.windows.getCurrentWindowManifest;
        // Calculate center position based on screen size
        const { screenWidth, screenHeight } = await chrome.system.display.getInfo()
          .then(displays => {
            const primaryDisplay = displays[0];
            return {
              screenWidth: primaryDisplay.workArea.width,
              screenHeight: primaryDisplay.workArea.height
            };
          });

        updateData.left = Math.round((screenWidth - width) / 2);
        updateData.top = Math.round((screenHeight - height) / 2);
      }

      await chrome.windows.update(currentWindow.id, updateData);
      
      // Visual feedback
      showNotification(`Window resized to ${width} × ${height}`);
    } catch (error) {
      console.error('Error resizing window:', error);
      showNotification('Failed to resize window', true);
    }
  }

  // Handle preset button clicks
  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      const width = button.dataset.width;
      const height = button.dataset.height;
      const shouldCenter = centerWindowCheckbox.checked;
      resizeWindow(width, height, shouldCenter);
    });
  });

  // Handle custom size apply button
  applyCustomBtn.addEventListener('click', () => {
    const width = customWidthInput.value;
    const height = customHeightInput.value;

    if (!width || !height) {
      showNotification('Please enter both width and height', true);
      return;
    }

    const shouldCenter = centerWindowCheckbox.checked;
    resizeWindow(width, height, shouldCenter);
  });

  // Handle Enter key in custom size inputs
  [customWidthInput, customHeightInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applyCustomBtn.click();
      }
    });
  });

  // Simple notification system
  function showNotification(message, isError = false) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background: ${isError ? '#d93025' : '#1a73e8'};
      color: white;
      border-radius: 4px;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 2 seconds
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => notification.remove(), 200);
    }, 2000);
  }

  // Add CSS animations for notifications
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(10px); }
    }
  `;
  document.head.appendChild(style);
});
```

This JavaScript handles all the core functionality. It attaches event listeners to preset buttons and the custom size form, validates user input, and calls the chrome.windows.update API to resize the browser window. We've also added keyboard support (Enter key) and a simple notification system for user feedback.

One thing to note: the centering logic requires additional handling in the background script since the system.display API requires specific permissions. Let's create a more solid solution using a background script:

```javascript
// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'resizeWindow') {
    const { width, height, center } = message;
    
    chrome.windows.getCurrent(async (currentWindow) => {
      let updateData = {
        width: parseInt(width, 10),
        height: parseInt(height, 10)
      };

      if (center) {
        try {
          const displays = await chrome.system.display.getInfo();
          const primaryDisplay = displays[0];
          
          updateData.left = Math.round(
            (primaryDisplay.workArea.width - width) / 2
          );
          updateData.top = Math.round(
            (primaryDisplay.workArea.height - height) / 2
          );
        } catch (error) {
          console.log('Could not get display info:', error);
        }
      }

      chrome.windows.update(currentWindow.id, updateData, () => {
        sendResponse({ success: true });
      });
    });

    return true; // Indicates async response
  }
});
```

We need to add the "system.display" permission to our manifest for centering to work properly:

```json
"permissions": [
  "windows",
  "system.display"
]
```

And update popup.js to message the background script instead of calling the Windows API directly:

```javascript
async function resizeWindow(width, height, shouldCenter = false) {
  try {
    await chrome.runtime.sendMessage({
      action: 'resizeWindow',
      width: width,
      height: height,
      center: shouldCenter
    });
    
    showNotification(`Window resized to ${width} × ${height}`);
  } catch (error) {
    console.error('Error resizing window:', error);
    showNotification('Failed to resize window', true);
  }
}
```

---

Testing Your Extension Locally {#testing-your-extension-locally}

Before publishing, you'll want to test your extension locally to ensure everything works correctly. Chrome provides a simple way to load unpacked extensions for testing. Here's how:

First, open Chrome and navigate to chrome://extensions/. You'll see the Extensions management page. In the top-right corner, toggle on "Developer mode." This enables additional features and buttons that allow you to load unpacked extensions, reload them, and access other development tools.

Click the "Load unpacked" button that appears after enabling developer mode. Navigate to your extension's directory (the folder containing manifest.json) and select it. Chrome will load your extension, and you should see its icon appear in your browser's toolbar.

Test each preset button to verify they resize the window correctly. Try the custom size feature with various dimensions. If you added the centering option, verify that it positions windows correctly on different screen sizes. Pay attention to edge cases, try setting extremely small or large dimensions to see how your extension handles them.

One common issue you might encounter is the window not resizing to exact dimensions due to Chrome's minimum window size constraints or system decorations. This is normal behavior and varies by operating system. Your extension should still work correctly within reasonable bounds.

---

Advanced Features and Enhancements {#advanced-features}

Now that you have a working window resizer extension, consider adding these advanced features to make it even more useful:

Keyboard Shortcuts: Implement keyboard shortcuts that allow users to quickly cycle through preset sizes without opening the popup. Chrome's commands API enables this functionality.

Save Custom Presets: Allow users to save their own custom dimensions as named presets. Store these in chrome.storage for persistence across sessions.

Multiple Monitor Support: Add the ability to move windows between monitors or position them on specific displays.

Responsive Framework Presets: Add presets for common CSS frameworks like Bootstrap, Tailwind, or Material Design breakpoint sizes.

Window State Management: Add options to maximize, minimize, or restore window state in addition to resizing.

These enhancements can significantly increase the value of your extension and differentiate it from existing window resizer tools in the Chrome Web Store.

---

Publishing Your Extension {#publishing-your-extension}

Once you're satisfied with your extension and have thoroughly tested it, you can publish it to the Chrome Web Store. The publishing process involves creating a developer account, preparing your extension assets, and submitting through the Chrome Web Store developer dashboard.

You'll need to create a ZIP file of your extension (excluding unnecessary files like .git directories). Prepare compelling store listing assets including a clear icon, screenshots, and a detailed description that highlights your extension's features and benefits. The description should naturally incorporate relevant keywords like "window resizer," "resize browser," and "responsive design" to improve search visibility.

Chrome charges a one-time $5 developer registration fee to publish extensions. After paying and submitting your extension, Google reviews it for policy compliance, a process that typically takes a few days. Once approved, your extension becomes available to all Chrome users worldwide.

---

Conclusion {#conclusion}

Congratulations! You've successfully built a complete Window Resizer Chrome extension for responsive design testing. This extension demonstrates key concepts in Chrome extension development including Manifest V3 architecture, the chrome.windows API, popup UI design, and background script communication.

The extension you created provides immediate value for web developers and designers who need to test responsive layouts quickly. With its clean interface, preset dimensions for popular devices, and custom size capability, it addresses a real need in the web development workflow.

As you continue developing Chrome extensions, remember that the platform offers tremendous capabilities beyond what we've covered here. The skills you've learned, working with Chrome APIs, designing user interfaces, handling user interactions, and managing extension state, form a foundation for building even more sophisticated extensions.

Consider adding the advanced features we discussed, publishing your extension to the Chrome Web Store, and collecting user feedback to guide future improvements. The world of Chrome extension development offers endless possibilities for creating tools that enhance productivity and solve real-world problems.
