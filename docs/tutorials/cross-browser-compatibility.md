---
layout: default
title: "Cross-Browser Extension Development — Tutorial"
description: "Learn how to build cross-browser Chrome extensions that work in Chrome, Firefox, Safari, and Edge with this comprehensive tutorial."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/cross-browser-compatibility/"
---

# Cross-Browser Extension Development

Building browser extensions that work across Chrome, Firefox, Safari, and Edge requires understanding the WebExtensions API standard, browser-specific differences, and strategies for handling API incompatibilities. This tutorial covers everything you need to create truly cross-browser extensions.

## Prerequisites

- Basic knowledge of Chrome extension development
- Understanding of manifest.json structure
- Familiarity with JavaScript/TypeScript async patterns

## 1. Understanding the WebExtensions Standard {#1-understanding-webextensions-standard}

The WebExtensions API provides a cross-browser system for developing browser extensions. Originally developed by Mozilla and later adopted by Chrome, Edge, and Safari, it provides a common set of APIs for:

- Background scripts (service workers in MV3)
- Content scripts
- Popup pages
- Options pages
- Browser actions

### Browser Implementation Status

| Browser | WebExtensions Support | Manifest V3 | Primary Namespace |
|---------|----------------------|-------------|-------------------|
| Chrome | Full | ✅ Full | `chrome.*` |
| Firefox | Full | ✅ Full | `browser.*` |
| Edge | Full | ✅ Full | `chrome.*` |
| Safari | Partial | ✅ Full | `chrome.*` / `browser.*` |

## 2. Chrome vs Firefox vs Safari vs Edge Differences {#2-browser-differences}

Each browser implements the WebExtensions API with some variations. Understanding these differences is crucial for cross-browser development.

### API Availability Comparison

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| Manifest V3 | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Service Workers | ✅ | ✅ (background) | ✅ | ✅ (16.4+) |
| sidePanel API | ✅ | ❌ | ✅ | ❌ |
| offscreenDocument | ✅ | ❌ | ✅ | ❌ |
| tabGroups | ✅ | ❌ | ✅ | ❌ |
| declarativeNetRequest | ✅ | ✅ | ✅ | ✅ |
| scripting API | ✅ | ✅ | ✅ | ✅ |
| nativeMessaging | ✅ | ✅ | ✅ | ✅ |
| cookies API | ✅ | ✅ | ✅ | ✅ |
| identity API | ✅ | ✅ | ✅ | ✅ |

### Namespace Differences

```javascript
// Chrome: Uses chrome.* namespace with callbacks (traditional)
// Since Chrome 146: Also supports browser.* natively

chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
  console.log(response);
});

// Firefox: Prefers browser.* namespace with Promises (WebExtensions standard)

browser.runtime.sendMessage({ action: 'ping' })
  .then(response => console.log(response));

// Edge: Uses chrome.* with callbacks like Chrome

// Safari: Supports both with limited Promise support in some APIs
```

### Key Behavioral Differences

| Aspect | Chrome | Firefox | Edge | Safari |
|--------|--------|---------|------|--------|
| Background idle | 30 seconds | 30 seconds | 30 seconds | Different |
| Storage quota | 5MB local | 5MB local | 5MB local | 1MB local |
| CSP in content scripts | Strict | Moderate | Strict | Strict |
| Cookie access | All | All | All | Limited |

## 3. Using the WebExtension Polyfill {#3-webextension-polyfill}

The [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) library normalizes API differences across browsers by providing a Promise-based `browser.*` interface that works everywhere.

### Installation

```bash
npm install webextension-polyfill
```

### Basic Usage

```javascript
// Before (Chrome-specific with callbacks)
chrome.runtime.sendMessage('ext-id', { action: 'doThing' }, (response) => {
  console.log(response);
});

// After (cross-browser with Promises)
import browser from 'webextension-polyfill';

const response = await browser.runtime.sendMessage({ 
  action: 'doThing' 
});
console.log(response);
```

### Setup in Background Script

```javascript
// background.js
import browser from 'webextension-polyfill';

// Now you can use browser.* everywhere
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getData') {
    const data = fetchData();
    sendResponse({ data });
  }
  return true; // Keep channel open for async response
});
```

### Setup in Content Script

```javascript
// content.js
import browser from 'webextension-polyfill';

// Use browser.runtime instead of chrome.runtime
const response = await browser.runtime.sendMessage({ 
  action: 'fetchUserData',
  userId: 123
});
console.log(response);
```

### Polyfill Limitations

> **Important**: The polyfill doesn't add missing APIs—it only normalizes the interface. For APIs like `sidePanel` that don't exist in Firefox, you still need conditional code.

## 4. Manifest Differences Across Browsers {#4-manifest-differences}

While Manifest V3 is the standard, there are differences in how browsers handle certain manifest fields.

### Manifest Field Compatibility

| Field | Chrome | Firefox | Edge | Safari |
|-------|--------|---------|------|--------|
| `manifest_version` | 3 | 3 | 3 | 3 |
| `background.service_worker` | ✅ | ❌ (use `background.scripts`) | ✅ | ✅ |
| `background.scripts` | ❌ | ✅ | ❌ | ❌ |
| `side_panel` | ✅ | ❌ | ✅ | ❌ |
| `action` | ✅ | ✅ | ✅ | ✅ |
| `host_permissions` | ✅ | ✅ | ✅ | ✅ |
| `optional_host_permissions` | ✅ | ✅ | ✅ | ❌ |

### Cross-Browser Manifest Example

```json
{
  "manifest_version": 3,
  "name": "Cross-Browser Extension",
  "version": "1.0.0",
  "description": "Works across Chrome, Firefox, Edge, and Safari",
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "permissions": [
    "storage",
    "tabs"
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
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

### Firefox-Specific Background

```javascript
// For Firefox compatibility, create firefox-specific manifest
// manifest.firefox.json

{
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  }
}
```

### Building for Multiple Browsers

Use a build tool to generate browser-specific manifests:

```javascript
// build.js
const manifest = {
  manifest_version: 3,
  name: 'My Extension',
  // ... common fields
};

const chromeManifest = {
  ...manifest,
  background: {
    service_worker: 'background.js'
  }
};

const firefoxManifest = {
  ...manifest,
  background: {
    scripts: ['background.js'],
    persistent: false
  }
};
```

## 5. Feature Detection Pattern {#5-feature-detection}

Always check if an API exists before using it. This prevents errors when running on browsers that don't support certain features.

### Basic Feature Detection

```javascript
// Check for sidePanel API (Chrome/Edge only)
if (chrome.sidePanel) {
  chrome.sidePanel.setOptions({ path: 'sidepanel.html' });
} else {
  // Fallback: open a new tab as sidebar alternative
  console.log('sidePanel not supported, using tab fallback');
}

// Check for declarativeNetRequest
if (chrome.declarativeNetRequest) {
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [...],
    removeRuleIds: [...]
  });
} else if (chrome.webRequest) {
  // Fallback for Firefox/Safari (MV2 style)
  chrome.webRequest.onBeforeRequest.addListener(
    callback,
    { urls: ['<all_urls>'] },
    ['blocking']
  );
} else {
  console.error('No blocking request API available');
}
```

### Advanced Feature Detection Helper

```javascript
// features.js
const BrowserFeatures = {
  hasSidePanel: () => !!chrome.sidePanel,
  hasOffscreenDocuments: () => !!chrome.offscreen,
  hasTabGroups: () => !!chrome.tabs.group,
  hasDeclarativeNetRequest: () => !!chrome.declarativeNetRequest,
  hasScripting: () => !!chrome.scripting,
  hasAction: () => !!chrome.action,
  
  // Async feature check
  async checkStorageQuota() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      return bytesInUse < 5 * 1024 * 1024; // 5MB
    } catch {
      return false;
    }
  }
};

export default BrowserFeatures;
```

## 6. Conditional Code Patterns {#6-conditional-code}

Write code that adapts to the browser's capabilities.

### Environment Detection

```javascript
// browser-detection.js

const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'safari';
  return 'chrome';
};

const isFirefox = () => getBrowserInfo() === 'firefox';
const isChrome = () => getBrowserInfo() === 'chrome';
const isEdge = () => getBrowserInfo() === 'edge';
const isSafari = () => getBrowserInfo() === 'safari';
```

### Conditional API Usage

```javascript
// api-wrapper.js
import BrowserFeatures from './features.js';

export const createSidebar = async (options) => {
  // Use sidePanel for Chrome/Edge
  if (BrowserFeatures.hasSidePanel()) {
    await chrome.sidePanel.setOptions({
      path: options.path,
      enabled: true
    });
    return;
  }
  
  // Fallback: Open a new tab for Firefox/Safari
  if (isFirefox() || isSafari()) {
    const tab = await chrome.tabs.create({
      url: options.path,
      active: true
    });
    
    // Apply sidebar styling via content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        document.body.style.width = '350px';
        document.body.style.cssFloat = 'left';
      }
    });
  }
};

export const setBadge = (text, color) => {
  // Modern API (Chrome 109+, Edge)
  if (chrome.action) {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
  } 
  // Legacy API (Firefox)
  else if (chrome.browserAction) {
    chrome.browserAction.setBadgeText({ text });
    chrome.browserAction.setBadgeBackgroundColor({ color });
  }
};
```

### Polyfill-Aware Messaging

```javascript
// messaging.js
import browser from 'webextension-polyfill';

// Send message to background
export const sendToBackground = async (message) => {
  try {
    return await browser.runtime.sendMessage(message);
  } catch (error) {
    console.error('Message send failed:', error);
    throw error;
  }
};

// Send message to specific tab
export const sendToTab = async (tabId, message) => {
  try {
    return await browser.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error('Tab message failed:', error);
    throw error;
  }
};

// Listen for messages
export const onMessage = (callback) => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = callback(message, sender);
    
    // Handle both sync and async responses
    if (result instanceof Promise) {
      result.then(sendResponse);
      return true; // Indicates async response
    }
    
    sendResponse(result);
  });
};
```

## 7. Testing Across Browsers {#7-testing-across-browsers}

Testing cross-browser extensions requires multiple strategies.

### Local Development Testing

```bash
# Chrome
# Load unpacked extension from chrome://extensions

# Firefox
# Load temporary add-on from about:debugging

# Edge
# Load unpacked from edge://extensions

# Safari
# Enable Developer menu > Show Extension Builder
```

### Automated Testing with Playwright

```javascript
// test-cross-browser.mjs
import { test, expect } from '@playwright/test';

test.describe('Cross-browser Extension Tests', () => {
  test('works in Chrome', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Load extension (Chrome-specific)
    const extensionPath = './dist/chrome';
    // ... test extension functionality
  });
  
  test('works in Firefox', async ({ browser }) => {
    // Firefox-specific testing
  });
});
```

### Browser-Specific Test Files

```javascript
// __tests__/chrome/api-compat.test.js
describe('Chrome API Compatibility', () => {
  test('sidePanel available in Chrome', () => {
    expect(chrome.sidePanel).toBeDefined();
  });
});

// __tests__/firefox/api-compat.test.js
describe('Firefox API Compatibility', () => {
  test('no sidePanel in Firefox', () => {
    expect(chrome.sidePanel).toBeUndefined();
  });
  
  test('browser.* namespace available', () => {
    expect(browser.runtime).toBeDefined();
  });
});
```

### Testing Feature Detection

```javascript
// __tests__/feature-detection.test.js
import BrowserFeatures from '../../src/utils/features.js';

describe('Feature Detection', () => {
  test('detects available features', () => {
    // Test in appropriate environment
    if (process.env.BROWSER === 'chrome') {
      expect(BrowserFeatures.hasSidePanel()).toBe(true);
    }
    
    if (process.env.BROWSER === 'firefox') {
      expect(BrowserFeatures.hasSidePanel()).toBe(false);
    }
  });
});
```

## 8. Publishing to Multiple Stores {#8-publishing-to-multiple-stores}

Each browser has its own extension store with different submission requirements.

### Store Comparison

| Store | Developer Fee | Review Time | Auto-Update | Account Required |
|-------|---------------|-------------|--------------|------------------|
| Chrome Web Store | $5 one-time | 1-3 days | ✅ | Google Account |
| Firefox Add-ons | Free | 1-7 days | ✅ | Mozilla Account |
| Microsoft Edge | Free | 1-3 days | ✅ | Microsoft Account |
| Safari App Store | $99/year | 1-2 weeks | ✅ | Apple Developer |

### Chrome Web Store Submission

```bash
# Package extension
zip -r extension.zip manifest.json background.js popup.html popup.js content.js icons/

# Upload via Chrome Web Store Developer Dashboard
# https://chrome.google.com/webstore/developer/dashboard
```

### Firefox Add-ons Submission

```bash
# Create .xpi file (Firefox-specific ZIP)
zip -r extension.xpi manifest.json background.js popup.html popup.js content.js icons/

# Sign via Mozilla
# Submit at https://addons.mozilla.org/developers/
```

### Edge Add-ons Submission

```bash
# Package as .zip for Edge
zip -r extension.zip manifest.json background.js popup.html popup.js content.js icons/

# Submit via Microsoft Edge Add-ons site
# https://partner.microsoft.com/dashboard/microsoft-edge/overview
```

### Safari Web Extension

Safari requires additional setup through Xcode:

1. Create Safari Web Extension target in Xcode
2. Add your extension files
3. Configure entitlements
4. Build and test in Safari
5. Submit via App Store Connect

### Cross-Platform Build Script

```javascript
// scripts/build-all.js
import fs from 'fs-extra';
import path from 'path';

const distDir = './dist';

async function buildAll() {
  // Build Chrome/Edge version
  await buildBrowser('chrome');
  
  // Build Firefox version
  await buildBrowser('firefox');
  
  // Copy for Safari (requires Xcode)
  await buildBrowser('safari');
}

async function buildBrowser(browser) {
  const outDir = path.join(distDir, browser);
  await fs.ensureDir(outDir);
  
  // Copy base files
  await fs.copy('./src', outDir);
  
  // Apply browser-specific transformations
  if (browser === 'firefox') {
    // Use background.scripts instead of service_worker
    const manifest = await fs.readJson(path.join(outDir, 'manifest.json'));
    manifest.background = {
      scripts: ['background.js'],
      persistent: false
    };
    await fs.writeJson(path.join(outDir, 'manifest.json'), manifest);
  }
  
  console.log(`Built for ${browser}`);
}

buildAll();
```

### Store-Specific Features

```javascript
// Track which store the user installed from
const getInstallSource = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('utm_source') || 'direct';
};

// Analytics for multi-store
const trackInstall = (store) => {
  analytics.track('extension_installed', {
    store,
    version: chrome.runtime.getManifest().version
  });
};
```

---

## Common Pitfalls

1. **Assuming all APIs exist**: Always use feature detection before calling browser-specific APIs
2. **Ignoring Firefox's persistent background**: Firefox uses persistent: false by default
3. **Not testing in all browsers**: What works in Chrome may fail in Firefox
4. **Forgetting Safari limitations**: Safari has the most restrictions
5. **Using Chrome-only APIs**: Avoid chrome.* exclusive features for cross-browser extensions

---

## Summary

Cross-browser extension development requires:

- **Understanding the WebExtensions standard** as the common foundation
- **Using the webextension-polyfill** for consistent Promise-based APIs
- **Implementing feature detection** to handle API differences
- **Writing conditional code** for browser-specific functionality
- **Testing across all target browsers** before release
- **Following store-specific guidelines** for each platform

With these patterns, you can create extensions that provide a consistent experience across Chrome, Firefox, Edge, and Safari.

---

## Related Articles

- [Cross-Browser Development Guide](https://theluckystrike.github.io/chrome-extension-guide/guides/cross-browser/) — Comprehensive guide to building cross-browser extensions
- [Chrome Extension Migration: Firefox](https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-migration-firefox/) — Step-by-step Firefox porting guide
- [Chrome Extension Migration: Edge](https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-migration-edge/) — Edge-specific migration guide

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
