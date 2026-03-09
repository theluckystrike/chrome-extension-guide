---
layout: post
title: "Build a CORS Proxy Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a CORS proxy Chrome extension to bypass cross-origin restrictions. This comprehensive guide covers manifest configuration, background workers, content scripts, and deployment."
date: 2025-01-27
categories: [Chrome Extensions]
tags: [chrome-extension, developer-tools]
keywords: "cors proxy extension, cors bypass chrome, cross origin extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/27/build-cors-proxy-chrome-extension/"
---

# Build a CORS Proxy Chrome Extension: Complete Developer's Guide

Cross-Origin Resource Sharing (CORS) is one of the most common pain points for web developers. Whether you're building a development tool, scraping data, or integrating APIs, CORS restrictions can bring your project to a halt. The good news? You can solve this with a CORS proxy Chrome extension that you build yourself.

In this comprehensive guide, we'll walk through the entire process of creating a production-ready CORS proxy extension using Manifest V3. By the end, you'll have a fully functional extension that can bypass CORS restrictions directly from your browser, a valuable tool for any developer's toolkit.

---

## Understanding CORS and Why You Need a Proxy {#understanding-cors}

Before we dive into code, let's establish a solid understanding of what CORS is and why a proxy extension is so useful.

### What is CORS?

Cross-Origin Resource Sharing (CORS) is a security mechanism implemented by web browsers. It restricts web pages from making requests to a different domain, protocol, or port than the one that served the web page. This is a fundamental security feature designed to prevent malicious websites from making unauthorized requests on behalf of users.

When your JavaScript code running on `example.com` tries to fetch data from `api.otherdomain.com`, the browser enforces the Same-Origin Policy. If `api.otherdomain.com` doesn't explicitly allow requests from `example.com` through CORS headers, the request fails with a CORS error.

### Common CORS Error Scenarios

Developers encounter CORS errors in many situations:

1. **Local Development**: You're running a React app on localhost:3000 and trying to fetch from localhost:5000
2. **API Integration**: Third-party APIs don't include your domain in their allowed origins
3. **Web Scraping**: You want to fetch data from websites that don't enable CORS
4. **Testing**: You're testing APIs locally that are designed for production domains

### Why a Chrome Extension?

A CORS proxy Chrome extension offers several advantages over traditional proxy solutions:

- **No Server Required**: The extension handles everything locally in your browser
- **Easy to Distribute**: Users can install it directly from the Chrome Web Store
- **Always Available**: It's just a click away in your browser toolbar
- **Privacy-Focused**: Data stays on your machine rather than going through a third-party proxy server

---

## Architecture of Our CORS Proxy Extension {#architecture}

Our extension will work by intercepting requests and routing them through a proxy endpoint. Here's the high-level architecture:

1. **Background Service Worker**: Handles the core proxy logic and manages requests
2. **Popup UI**: Allows users to toggle the proxy on/off and configure settings
3. **Content Scripts**: Can inject the proxy URL into page scripts automatically

For this implementation, we'll use a public CORS proxy service (like cors-anywhere or your own proxy server) to handle the actual proxying. This keeps our extension lightweight while providing full functionality.

---

## Step-by-Step Implementation {#implementation}

Let's build the extension! We'll create each file systematically.

### Step 1: Manifest Configuration (manifest.json)

Every Chrome extension needs a manifest file. We'll use Manifest V3, which is the current standard:

```json
{
  "manifest_version": 3,
  "name": "CORS Bypass - Developer Proxy Extension",
  "version": "1.0.0",
  "description": "Bypass CORS restrictions with a single click. Perfect for development and testing.",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
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
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Key points about this manifest:
- **host_permissions**: We need access to all URLs since CORS affects any website
- **storage**: To save user preferences (proxy enabled/disabled)
- **scripting**: To inject content scripts that modify requests

### Step 2: Background Service Worker (background.js)

The background service worker is the brain of our extension. It handles the toggle state and communicates with the popup:

```javascript
// background.js - Service Worker for CORS Proxy Extension

// Default state
let proxyEnabled = false;
let useCustomProxy = false;
let customProxyUrl = '';

// Load saved settings from storage
chrome.storage.sync.get(['proxyEnabled', 'useCustomProxy', 'customProxyUrl'], (result) => {
  if (result.proxyEnabled !== undefined) {
    proxyEnabled = result.proxyEnabled;
  }
  if (result.useCustomProxy !== undefined) {
    useCustomProxy = result.useCustomProxy;
  }
  if (result.customProxyUrl) {
    customProxyUrl = result.customProxyUrl;
  }
  // Update badge to reflect current state
  updateBadge();
});

// Update extension badge based on state
function updateBadge() {
  const text = proxyEnabled ? 'ON' : 'OFF';
  const color = proxyEnabled ? '#00FF00' : '#FF0000';
  
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}

// Message handler for popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_PROXY') {
    proxyEnabled = !proxyEnabled;
    chrome.storage.sync.set({ proxyEnabled: proxyEnabled });
    updateBadge();
    
    // Notify all tabs of the state change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'PROXY_STATE_CHANGED', 
          enabled: proxyEnabled 
        }).catch(() => {
          // Ignore errors for tabs without content script
        });
      });
    });
    
    sendResponse({ success: true, enabled: proxyEnabled });
  }
  
  if (message.type === 'GET_STATE') {
    sendResponse({ 
      enabled: proxyEnabled,
      useCustomProxy: useCustomProxy,
      customProxyUrl: customProxyUrl
    });
  }
  
  if (message.type === 'SET_CUSTOM_PROXY') {
    customProxyUrl = message.url;
    useCustomProxy = message.useCustomProxy;
    chrome.storage.sync.set({ 
      useCustomProxy: useCustomProxy, 
      customProxyUrl: customProxyUrl 
    });
    sendResponse({ success: true });
  }
  
  return true;
});

// Install/update handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('CORS Bypass Extension installed');
  updateBadge();
});
```

### Step 3: Popup Interface (popup.html and popup.css)

The popup provides a simple UI for users to toggle the proxy:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>CORS Bypass</h1>
    
    <div class="status-container">
      <span class="status-label">Status:</span>
      <span id="status-text" class="status-text">Disabled</span>
    </div>
    
    <button id="toggle-btn" class="toggle-btn">
      Enable CORS Bypass
    </button>
    
    <div class="divider"></div>
    
    <div class="options">
      <label class="checkbox-label">
        <input type="checkbox" id="custom-proxy-checkbox">
        Use custom proxy server
      </label>
      
      <input type="text" id="custom-proxy-url" 
             placeholder="https://your-proxy-server.com" 
             class="proxy-input"
             disabled>
    </div>
    
    <div class="info">
      <p>When enabled, requests will be routed through a proxy to bypass CORS restrictions.</p>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

```css
/* popup.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 300px;
  padding: 20px;
  background: #1a1a2e;
  color: #ffffff;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

h1 {
  font-size: 18px;
  text-align: center;
  margin-bottom: 5px;
}

.status-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #16213e;
  border-radius: 8px;
}

.status-label {
  font-weight: 600;
  color: #a0a0a0;
}

.status-text {
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 4px;
}

.status-text.enabled {
  background: #00ff88;
  color: #000;
}

.status-text.disabled {
  background: #ff4757;
  color: #fff;
}

.toggle-btn {
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #0f3460;
  color: #fff;
}

.toggle-btn:hover {
  background: #1a4a7a;
}

.toggle-btn.active {
  background: #e94560;
}

.divider {
  height: 1px;
  background: #2a2a4a;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.proxy-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  background: #16213e;
  color: #fff;
  font-size: 12px;
}

.proxy-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.proxy-input:focus {
  outline: none;
  border-color: #e94560;
}

.info {
  font-size: 11px;
  color: #888;
  text-align: center;
  line-height: 1.4;
}
```

### Step 4: Popup Logic (popup.js)

```javascript
// popup.js - Popup UI Logic

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-btn');
  const statusText = document.getElementById('status-text');
  const customProxyCheckbox = document.getElementById('custom-proxy-checkbox');
  const customProxyUrl = document.getElementById('custom-proxy-url');
  
  // Get current state
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    updateUI(response.enabled);
  });
  
  // Toggle button click
  toggleBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_PROXY' }, (response) => {
      if (response) {
        updateUI(response.enabled);
      }
    });
  });
  
  // Custom proxy checkbox
  customProxyCheckbox.addEventListener('change', (e) => {
    customProxyUrl.disabled = !e.target.checked;
    
    chrome.runtime.sendMessage({
      type: 'SET_CUSTOM_PROXY',
      url: customProxyUrl.value,
      useCustomProxy: e.target.checked
    });
  });
  
  // Custom proxy URL input
  customProxyUrl.addEventListener('input', (e) => {
    if (customProxyCheckbox.checked) {
      chrome.runtime.sendMessage({
        type: 'SET_CUSTOM_PROXY',
        url: e.target.value,
        useCustomProxy: true
      });
    }
  });
  
  function updateUI(enabled) {
    if (enabled) {
      toggleBtn.textContent = 'Disable CORS Bypass';
      toggleBtn.classList.add('active');
      statusText.textContent = 'Enabled';
      statusText.classList.add('enabled');
      statusText.classList.remove('disabled');
    } else {
      toggleBtn.textContent = 'Enable CORS Bypass';
      toggleBtn.classList.remove('active');
      statusText.textContent = 'Disabled';
      statusText.classList.add('disabled');
      statusText.classList.remove('enabled');
    }
  }
});
```

### Step 5: Content Script for Automatic Proxying (content.js)

This content script intercepts fetch and XMLHttpRequest to automatically route requests through the proxy:

```javascript
// content.js - Content Script for automatic request proxying

// Default proxy endpoints (you can use cors-anywhere or your own)
const PROXY_ENDPOINTS = {
  default: 'https://corsproxy.io/?',
  alternative: 'https://api.allorigins.win/raw?url='
};

let proxyEnabled = false;
let useCustomProxy = false;
let customProxyUrl = '';

// Listen for state changes from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROXY_STATE_CHANGED') {
    proxyEnabled = message.enabled;
    console.log('[CORS Bypass] Proxy state:', proxyEnabled ? 'enabled' : 'disabled');
  }
  if (message.type === 'PROXY_CONFIG') {
    useCustomProxy = message.useCustomProxy;
    customProxyUrl = message.customProxyUrl;
  }
});

// Get initial state
chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (config) => {
  proxyEnabled = config.enabled;
  useCustomProxy = config.useCustomProxy;
  customProxyUrl = config.customProxyUrl;
});

// Override fetch
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  if (!proxyEnabled) {
    return originalFetch.apply(this, args);
  }
  
  let url = args[0];
  let options = args[1] || {};
  
  // Only proxy http/https requests
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    const proxyURL = useCustomProxy && customProxyUrl 
      ? customProxyUrl + encodeURIComponent(url)
      : PROXY_ENDPOINTS.default + encodeURIComponent(url);
    
    try {
      return await originalFetch(proxyURL, options);
    } catch (error) {
      // Fallback to alternative proxy
      console.warn('[CORS Bypass] Primary proxy failed, trying alternative...');
      const altProxyURL = PROXY_ENDPOINTS.alternative + encodeURIComponent(url);
      return await originalFetch(altProxyURL, options);
    }
  }
  
  return originalFetch.apply(this, args);
};

// Override XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  this._corsProxyURL = url;
  this._corsProxyMethod = method;
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(...args) {
  if (proxyEnabled && this._corsProxyURL && 
      (this._corsProxyURL.startsWith('http://') || this._corsProxyURL.startsWith('https://'))) {
    
    const proxyURL = useCustomProxy && customProxyUrl
      ? customProxyUrl + encodeURIComponent(this._corsProxyURL)
      : PROXY_ENDPOINTS.default + encodeURIComponent(this._corsProxyURL);
    
    this._corsProxyEnabled = true;
    
    this.addEventListener('load', function() {
      // Restore original URL in response
    });
  }
  
  return originalXHRSend.apply(this, args);
};

console.log('[CORS Bypass] Content script loaded, proxy enabled:', proxyEnabled);
```

---

## Testing Your Extension {#testing}

Now let's test our extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension folder
4. Click the extension icon in your toolbar to toggle the proxy
5. Visit a website that normally blocks CORS requests and test

You can test with a simple JavaScript snippet in the browser console:

```javascript
// Test fetch - should succeed with proxy enabled
fetch('https://api.github.com/users/theluckystrike')
  .then(response => response.json())
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));
```

---

## Deployment to Chrome Web Store {#deployment}

When you're ready to distribute your extension:

1. **Create a zip file** of your extension folder (excluding development files)
2. **Go to Chrome Web Store Developer Dashboard**
3. **Create a new item** and upload your zip file
4. **Fill in** the store listing (description, screenshots, category)
5. **Submit for review**

Your extension will be reviewed by Google (usually within a few hours to a few days).

---

## Advanced Features to Consider {#advanced}

Here are some enhancements you might want to add:

1. **Proxy Health Checks**: Automatically detect when a proxy is down and switch to backup
2. **Request Logging**: Show a log of proxied requests for debugging
3. **Whitelist/Blacklist**: Allow users to specify which domains should be proxied
4. **Keyboard Shortcuts**: Add Chrome commands for quick toggle
5. **Analytics**: Track usage patterns to improve the extension

---

## Conclusion {#conclusion}

Building a CORS proxy Chrome extension is a practical project that solves real-world problems. In this guide, we covered:

- **Understanding CORS** and why it exists
- **Manifest V3 configuration** with proper permissions
- **Background service worker** for state management
- **Popup UI** for user interaction
- **Content script** that intercepts fetch and XHR requests

This extension is now ready for personal use or distribution through the Chrome Web Store. Remember to always use such tools responsibly and respect the terms of service of APIs you're accessing.

The CORS proxy extension you build today can serve as a foundation for more advanced browser tools. You might eventually expand it into a full-featured developer toolkit that includes request debugging, response inspection, and automated testing capabilities. The principles you've learned here—intercepting network requests, managing extension state, and creating intuitive user interfaces—apply to virtually any Chrome extension you might want to build.

If you encounter any issues during development, Chrome provides excellent debugging tools. You can access service worker logs through the Extensions page, inspect content script execution in the Elements panel, and monitor network requests in the Network tab. These tools are invaluable for troubleshooting and optimizing your extension.

Remember that CORS exists for important security reasons. While this extension is perfect for development and testing environments, always ensure you're using proper authentication and authorization mechanisms when building production applications. Never use proxy extensions to access APIs or websites that explicitly prohibit automated access in their terms of service.

Happy coding!
