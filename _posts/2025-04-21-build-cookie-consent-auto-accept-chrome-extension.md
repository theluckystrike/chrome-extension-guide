---
layout: post
title: "Build a Cookie Consent Auto-Accept Chrome Extension: Skip Cookie Banners"
description: "Learn to build a cookie consent auto-accept Chrome extension that automatically skips annoying cookie banners. Complete guide with code examples."
date: 2025-04-21
categories: [Chrome-Extensions, Tutorials]
tags: [cookies, consent, chrome-extension]
keywords: "chrome extension cookie consent, auto accept cookies chrome, skip cookie banner extension, chrome extension cookie popup, cookie consent blocker"
canonical_url: "https://bestchromeextensions.com/2025/04/21/build-cookie-consent-auto-accept-chrome-extension/"
---

# Build a Cookie Consent Auto-Accept Chrome Extension: Skip Cookie Banners

Cookie consent banners have become an unavoidable part of web browsing. These popups appear on nearly every website, interrupting your browsing experience and demanding explicit consent before you can access content. For millions of users, clicking "Accept" or "Allow All" dozens of times per day has become a tedious ritual. If you're a Chrome extension developer, you can solve this problem by building a cookie consent auto-accept extension that automatically handles these annoying popups for your users.

In this comprehensive guide, we will walk you through building a production-ready Chrome extension that automatically accepts cookie consent banners, saving your users valuable time and frustration. This project will teach you advanced content script manipulation, MutationObserver patterns for detecting dynamic DOM elements, and how to handle various cookie consent implementations used by different websites.

---

## Understanding Cookie Consent Banners and the Chrome Extension Solution {#understanding-cookie-banners}

Before we dive into the code, it's essential to understand why cookie consent banners exist and how our Chrome extension will handle them. The European Union's General Data Protection Regulation (GDPR) and similar privacy regulations worldwide require websites to obtain explicit consent before setting non-essential cookies. While these regulations aim to protect user privacy, the implementation has led to a fragmented ecosystem of consent management platforms, each with its own unique DOM structure, button labels, and behavior.

Cookie consent banners come in many forms. Some display simple modals with "Accept" and "Reject" buttons, while others show comprehensive preference centers with toggles for different cookie categories. Some banners appear as slim bars at the bottom or top of the page, while others cover significant portions of the screen as full-page overlays. This diversity presents a significant challenge for developers building cookie consent auto-accept extensions.

Our Chrome extension will need to be intelligent enough to identify cookie consent elements across various implementations, determine the appropriate action to take (typically accepting all cookies or selecting the least intrusive options), and automatically interact with the consent UI without disrupting the user's browsing experience. We will achieve this by combining DOM analysis techniques, pattern matching, and configurable user preferences.

---

## Prerequisites and Development Environment Setup {#prerequisites}

Before you begin building this Chrome extension, ensure your development environment is properly configured. You will need Google Chrome or a Chromium-based browser for testing, a modern code editor such as Visual Studio Code, and a solid understanding of HTML, CSS, and JavaScript. Familiarity with Chrome's developer tools will be helpful for debugging and understanding the DOM structure of cookie consent banners.

Create a new folder for your project named `cookie-consent-auto-accept` and organize it with the standard extension file structure. Your project will need the following files: `manifest.json` for configuration, `content.js` for the core automation logic, `popup.html` and `popup.js` for user settings, `background.js` for service worker functionality, and `styles.css` for styling. You will also need icon files for the extension.

```
cookie-consent-auto-accept/
├── manifest.json
├── content.js
├── background.js
├── popup.html
├── popup.js
├── styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

This project structure follows Chrome's Manifest V3 guidelines and separates concerns between the popup interface, content scripts that run on web pages, and the background service worker that coordinates functionality.

---

## Creating the Manifest Configuration {#manifest-file}

The manifest.json file defines your extension's capabilities, permissions, and components. For our cookie consent auto-accept extension, we need specific permissions to access web pages and inject our content scripts. We'll also need host permissions to work across all websites.

```json
{
  "manifest_version": 3,
  "name": "Cookie Consent Auto-Accept",
  "version": "1.0.0",
  "description": "Automatically accept cookie consent banners with one click. Skip annoying cookie popups and browse seamlessly.",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
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

This manifest configuration grants our extension the necessary permissions to operate across all websites. The content_scripts array ensures our automation logic runs on every page after the DOM has finished loading. The storage permission allows us to save user preferences, and the scripting permission enables programmatic script injection when needed.

---

## Building the Content Script for Cookie Banner Detection {#content-script}

The content script is the heart of our cookie consent auto-accept extension. This script runs in the context of each web page and is responsible for detecting cookie consent banners, identifying the appropriate buttons to click, and executing the acceptance action. We will use the MutationObserver API to detect dynamically added elements, as many consent banners load asynchronously.

Create the `content.js` file with the following implementation:

```javascript
// Cookie Consent Auto-Accept Content Script
// This script runs on every page to detect and handle cookie consent banners

(function() {
  'use strict';

  // Configuration for common cookie consent providers
  const CONSENT_PROVIDERS = {
    // OneTrust Cookie Consent
    onetrust: {
      selector: '#onetrust-banner-sdk, #onetrust-consent-sdk',
      acceptButton: '#onetrust-accept-btn-handler, .onetrust-pc-dark-filter',
      rejectButton: '#onetrust-reject-all-handler',
      categoryToggle: '.category-toggle'
    },
    // Cookiebot
    cookiebot: {
      selector: '#CybotCookiebotDialog, #CybotCookiebotDialogBodyUnderlay',
      acceptButton: '#CybotCookiebotDialogAcceptButton',
      rejectButton: '#CybotCookiebotDialogDeclineButton'
    },
    // CookieConsent (Osano)
    osano: {
      selector: '.cc-window, .cc-banner',
      acceptButton: '.cc-btn.cc-dismiss, .cc-allow',
      rejectButton: '.cc-reject'
    },
    // Quantcast Choice
    quantcast: {
      selector: '.qc-cmp2-container, .qc-cmp-showing',
      acceptButton: '.qc-cmp2-button[mode="accept"]',
      rejectButton: '.qc-cmp2-button[mode="reject"]'
    },
    // TrustArc
    trustarc: {
      selector: '#truste-consent-track, .truste-consent-button',
      acceptButton: '.truste-consent-button',
      rejectButton: '.truste-consent-reject'
    },
    // Generic common patterns
    generic: {
      selector: '[class*="cookie"][class*="banner"], [class*="cookie"][class*="popup"], [class*="consent"][class*="banner"], [id*="cookie"][id*="banner"], [id*="consent"][id*="popup"]',
      acceptButton: 'button:contains("Accept"), button:contains("Allow"), button:contains("Agree"), button:contains("OK"), button:contains("Got it"), [class*="accept"], [class*="allow"], [id*="accept"], [id*="allow"]',
      rejectButton: 'button:contains("Reject"), button:contains("Decline"), button:contains("Deny"), button:contains("Decline"), [class*="reject"], [class*="decline"]'
    }
  };

  // State management
  let isEnabled = true;
  let autoAcceptMode = 'all'; // 'all', 'necessary', 'custom'
  let processedBanners = new Set();

  // Load settings from storage
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['enabled', 'autoAcceptMode'], (result) => {
        isEnabled = result.enabled !== false;
        autoAcceptMode = result.autoAcceptMode || 'all';
        resolve();
      });
    });
  }

  // Find cookie consent banner on the page
  function findConsentBanner() {
    // Check each known provider
    for (const [provider, config] of Object.entries(CONSENT_PROVIDERS)) {
      const banner = document.querySelector(config.selector);
      if (banner) {
        return { provider, config, element: banner };
      }
    }
    return null;
  }

  // Find accept button within a consent banner
  function findAcceptButton(bannerInfo) {
    const { config } = bannerInfo;
    
    // Try provider-specific accept button selector
    if (config.acceptButton) {
      const buttons = document.querySelectorAll(config.acceptButton);
      for (const button of buttons) {
        if (isVisible(button)) {
          return button;
        }
      }
    }

    // Fallback to generic button detection
    const allButtons = bannerInfo.element.querySelectorAll('button, a[role="button"], div[role="button"]');
    for (const button of allButtons) {
      const text = button.textContent?.toLowerCase() || '';
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
      
      // Look for accept/allow keywords
      if (text.includes('accept') || text.includes('allow') || 
          text.includes('agree') || text.includes('ok') || 
          text.includes('got it') || text.includes('continue') ||
          ariaLabel.includes('accept') || ariaLabel.includes('allow')) {
        if (isVisible(button)) {
          return button;
        }
      }
    }

    return null;
  }

  // Find reject/decline button within a consent banner
  function findRejectButton(bannerInfo) {
    const { config } = bannerInfo;
    
    if (config.rejectButton) {
      const buttons = document.querySelectorAll(config.rejectButton);
      for (const button of buttons) {
        if (isVisible(button)) {
          return button;
        }
      }
    }

    const allButtons = bannerInfo.element.querySelectorAll('button, a[role="button"], div[role="button"]');
    for (const button of allButtons) {
      const text = button.textContent?.toLowerCase() || '';
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
      
      if (text.includes('reject') || text.includes('decline') || 
          text.includes('deny') || text.includes('refuse') ||
          ariaLabel.includes('reject') || ariaLabel.includes('decline')) {
        if (isVisible(button)) {
          return button;
        }
      }
    }

    return null;
  }

  // Check if element is visible
  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  // Click button with proper event handling
  function clickButton(button) {
    try {
      // Create and dispatch mouse events for proper tracking
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      button.dispatchEvent(clickEvent);
      
      // Also try native click for stubborn elements
      button.click();
      
      return true;
    } catch (error) {
      console.error('Cookie Auto-Accept: Error clicking button:', error);
      return false;
    }
  }

  // Handle cookie consent banner
  function handleConsentBanner() {
    if (!isEnabled) return;

    const bannerInfo = findConsentBanner();
    if (!bannerInfo) return;

    // Prevent processing the same banner multiple times
    const bannerId = bannerInfo.element.id || bannerInfo.element.className || Math.random().toString();
    if (processedBanners.has(bannerId)) return;
    processedBanners.add(bannerId);

    // Determine which button to click based on settings
    let buttonToClick = null;
    
    if (autoAcceptMode === 'all') {
      buttonToClick = findAcceptButton(bannerInfo);
    } else if (autoAcceptMode === 'necessary') {
      buttonToClick = findRejectButton(bannerInfo);
    }

    // Click the appropriate button
    if (buttonToClick) {
      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        if (clickButton(buttonToClick)) {
          console.log('Cookie Auto-Accept: Successfully handled consent banner');
        }
      }, 500);
    }
  }

  // Set up MutationObserver to detect dynamically added consent banners
  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Check if consent banner was added
          setTimeout(handleConsentBanner, 100);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_SETTINGS') {
      isEnabled = message.enabled;
      autoAcceptMode = message.autoAcceptMode;
      sendResponse({ success: true });
    } else if (message.type === 'MANUAL_TRIGGER') {
      handleConsentBanner();
      sendResponse({ success: true });
    }
    return true;
  });

  // Initialize the content script
  async function init() {
    await loadSettings();
    
    // Initial check for existing consent banners
    setTimeout(handleConsentBanner, 1000);
    
    // Set up DOM observation for dynamic content
    if (document.body) {
      observeDOM();
    } else {
      document.addEventListener('DOMContentLoaded', observeDOM);
    }
  }

  // Start the extension
  init();
})();
```

This content script provides comprehensive cookie consent detection and handling. It includes patterns for major consent providers like OneTrust, Cookiebot, Osano, Quantcast, and TrustArc, while also falling back to generic pattern matching for unknown implementations. The MutationObserver ensures we catch banners that load dynamically after the initial page render.

---

## Creating the Popup Interface {#popup-interface}

The popup interface allows users to configure how the extension handles cookie consent banners. Users should be able to toggle the extension on and off, choose between accepting all cookies or only necessary ones, and manually trigger banner detection if needed.

Create `popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cookie Consent Auto-Accept</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="popup-container">
    <div class="header">
      <h1>🍪 Cookie Auto-Accept</h1>
    </div>
    
    <div class="content">
      <div class="toggle-section">
        <label class="switch">
          <input type="checkbox" id="enableToggle" checked>
          <span class="slider"></span>
        </label>
        <span class="label-text">Enable Auto-Accept</span>
      </div>

      <div class="mode-section">
        <h3>Auto-Accept Mode</h3>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" name="acceptMode" value="all" checked>
            <span class="radio-label">Accept All Cookies</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="acceptMode" value="necessary">
            <span class="radio-label">Necessary Only</span>
          </label>
        </div>
      </div>

      <button id="triggerButton" class="trigger-btn">Handle Current Page</button>
    </div>

    <div class="footer">
      <p>Status: <span id="statusText">Active</span></p>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Now create `popup.js` to handle user interactions:

```javascript
// Popup Script for Cookie Consent Auto-Accept Extension

document.addEventListener('DOMContentLoaded', () => {
  const enableToggle = document.getElementById('enableToggle');
  const modeRadios = document.querySelectorAll('input[name="acceptMode"]');
  const triggerButton = document.getElementById('triggerButton');
  const statusText = document.getElementById('statusText');

  // Load saved settings
  chrome.storage.sync.get(['enabled', 'autoAcceptMode'], (result) => {
    enableToggle.checked = result.enabled !== false;
    const mode = result.autoAcceptMode || 'all';
    document.querySelector(`input[name="acceptMode"][value="${mode}"]`).checked = true;
    updateStatus();
  });

  // Handle enable toggle
  enableToggle.addEventListener('change', () => {
    const enabled = enableToggle.checked;
    chrome.storage.sync.set({ enabled });
    updateStatus();
    notifyContentScript();
  });

  // Handle mode selection
  modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const mode = document.querySelector('input[name="acceptMode"]:checked').value;
      chrome.storage.sync.set({ autoAcceptMode: mode });
      notifyContentScript();
    });
  });

  // Handle manual trigger button
  triggerButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'MANUAL_TRIGGER' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Could not connect to page');
            return;
          }
          
          // Visual feedback
          triggerButton.textContent = 'Handled!';
          setTimeout(() => {
            triggerButton.textContent = 'Handle Current Page';
          }, 1500);
        });
      }
    });
  });

  // Notify content script of settings changes
  function notifyContentScript() {
    const enabled = enableToggle.checked;
    const mode = document.querySelector('input[name="acceptMode"]:checked').value;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_SETTINGS',
          enabled,
          autoAcceptMode: mode
        });
      }
    });
  }

  // Update status text
  function updateStatus() {
    if (enableToggle.checked) {
      statusText.textContent = 'Active';
      statusText.className = 'status-active';
    } else {
      statusText.textContent = 'Disabled';
      statusText.className = 'status-disabled';
    }
  }
});
```

---

## Styling the Popup {#popup-styles}

Create `styles.css` to give your popup a clean, modern appearance:

```css
/* Cookie Consent Auto-Accept Popup Styles */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: #f9fafb;
  min-width: 320px;
}

.popup-container {
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h1 {
  font-size: 18px;
  color: #1f2937;
  font-weight: 600;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toggle-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.switch input {
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
  background-color: #10b981;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.label-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.mode-section {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.mode-section h3 {
  font-size: 14px;
  color: #374151;
  margin-bottom: 12px;
  font-weight: 600;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.radio-option input {
  width: 18px;
  height: 18px;
  accent-color: #10b981;
}

.radio-label {
  font-size: 13px;
  color: #4b5563;
}

.trigger-btn {
  width: 100%;
  padding: 12px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.trigger-btn:hover {
  background-color: #059669;
}

.trigger-btn:active {
  background-color: #047857;
}

.footer {
  margin-top: 20px;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
}

#statusText {
  font-weight: 600;
}

.status-active {
  color: #10b981;
}

.status-disabled {
  color: #ef4444;
}
```

---

## Background Service Worker {#background-worker}

The background service worker handles extension lifecycle events and can coordinate functionality across tabs. Create `background.js`:

```javascript
// Background Service Worker for Cookie Consent Auto-Accept Extension

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Cookie Consent Auto-Accept extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    autoAcceptMode: 'all'
  });
});

// Handle extension icon click when no popup is defined
chrome.action.onClicked.addListener((tab) => {
  // Send message to content script to handle consent banner
  chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_TRIGGER' });
});

// Optional: Track statistics
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    // Handle settings changes if needed
  }
});
```

---

## Testing Your Extension {#testing}

Now that you've created all the necessary files, it's time to test your cookie consent auto-accept extension. Follow these steps to load it into Chrome:

First, open Chrome and navigate to `chrome://extensions/` in the address bar. Enable "Developer mode" using the toggle in the top right corner. Click the "Load unpacked" button and select your extension's folder. Chrome will load the extension and display it in your extensions list.

To test the functionality, visit a website known to have cookie consent banners, such as a major news site or e-commerce platform. The extension should automatically detect and dismiss the cookie banner. You can also click the extension icon to open the popup and adjust settings or manually trigger banner detection.

For development and debugging, right-click anywhere on a page and select "Inspect" to open Developer Tools. Switch to the "Console" tab to see extension logs. You can also inspect the content script by looking for your extension in the "Extensions" section of Developer Tools.

---

## Advanced Features and Enhancements {#advanced-features}

Once you have the basic extension working, consider adding these advanced features to make your extension more robust and user-friendly. First, implement whitelisting for sites where users want to see cookie banners, perhaps to manage their cookie preferences manually. Second, add support for more consent providers by expanding the CONSENT_PROVIDERS object with additional patterns.

You could also implement intelligent detection that learns which buttons users prefer to click, store statistics about how many banners have been handled, and provide visual notifications when a banner is automatically handled. Another valuable enhancement would be adding keyboard shortcuts that users can customize for triggering the extension.

For the user interface, consider adding a dashboard that shows how many cookies have been blocked or accepted, implementing dark mode support that matches the user's system preferences, and creating an options page with more detailed configuration options.

---

## Publishing to the Chrome Web Store {#publishing}

When your extension is ready for release, you can publish it to the Chrome Web Store. Prepare your store listing with a compelling description that highlights the benefits of automated cookie consent handling. Create promotional screenshots that demonstrate the extension in action, and design a catchy icon that stands out in the store.

Before submitting, ensure your extension doesn't violate any Chrome Web Store policies. Your extension should not mislead users about what it does, and it must handle cookie consent in a transparent manner. After submission, Google will review your extension, which typically takes several days.

---

## Conclusion {#conclusion}

Building a cookie consent auto-accept Chrome extension is an excellent project that teaches valuable skills in DOM manipulation, content script development, and user interface design. The extension solves a genuine problem that millions of users face daily, making it both a practical tool and a potentially popular product for the Chrome Web Store.

Throughout this guide, you learned how to detect cookie consent banners across different implementations, use MutationObserver for dynamic content, create a configurable popup interface, and implement the core automation logic. These skills transfer directly to other Chrome extension projects and general web development tasks.

The key to a successful cookie consent auto-accept extension lies in maintaining a comprehensive list of consent provider patterns and providing users with flexible configuration options. As you continue to improve your extension, you'll discover new techniques for handling the ever-evolving landscape of cookie consent implementations.
