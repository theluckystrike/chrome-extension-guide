---
layout: default
title: "Chrome Extension Cross-Browser Development. Developer Guide"
description: "Learn Chrome extension cross-browser development with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/cross-browser/"
last_modified_at: 2026-01-15
---
Cross-Browser Extension Development

Building extensions that work across Chrome, Firefox, Edge, and Safari requires understanding each browser's WebExtension implementation, API availability, and submission requirements. This guide covers the essential patterns and techniques for achieving true cross-browser compatibility.

Browser Comparison Table {#browser-comparison-table}

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| Manifest V3 |  Full |  Full |  Full |  Full |
| Service Workers |  |  (background scripts) |  |  (since Safari 16.4) |
| `chrome.*` namespace |  Native |  Via Polyfill |  Native |  Native |
| `browser.*` namespace |  Native (since Chrome 146) |  Native |  Alias |  Alias |
| Promise-based APIs |  |  |  |  Partial |
| sidePanel API |  |  |  |  |
| declarativeNetRequest |  |  |  |  |
| offscreenDocument |  |  |  |  |
| tabGroups |  |  |  |  |
| side_panel in manifest |  |  |  |  |

Namespace Differences {#namespace-differences}

- Chrome: Supports both `chrome.*` and `browser.*` natively (native `browser.*` since Chrome 146)
- Edge: Uses `chrome.*` APIs natively with callbacks
- Firefox: Prefers `browser.*` namespace with Promises (WebExtension standard)
- Safari: Supports both but with limited Promise support in some APIs

WebExtension Polyfill {#webextension-polyfill}

The [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) normalizes API differences across browsers by providing a Promise-based `browser.*` interface that works everywhere.

Installation {#installation}

```bash
npm install webextension-polyfill
```

Usage {#usage}

```javascript
// Instead of chrome.* with callbacks:
chrome.runtime.sendMessage('ext-id', { action: 'doThing' }, (response) => {
  console.log(response);
});

// Use browser.* with Promises:
import browser from 'webextension-polyfill';

const response = await browser.runtime.sendMessage('ext-id', { 
  action: 'doThing' 
});
console.log(response);
```

Setup in Background Script {#setup-in-background-script}

```javascript
// background.js
import browser from 'webextension-polyfill';

// Automatically normalizes chrome.* to browser.*
```

Setup in Content Script {#setup-in-content-script}

```javascript
// content.js
import browser from 'webextension-polyfill';

// Use browser.runtime instead of chrome.runtime
```

> Note: The polyfill doesn't add missing APIs, it only normalizes the interface (Promises vs callbacks, `browser.*` vs `chrome.*`).

Feature Detection Pattern {#feature-detection-pattern}

Always check if an API exists before using it. This prevents errors when running on browsers that don't support certain features.

Basic Detection {#basic-detection}

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
  chrome.declarativeNetRequest.updateDynamicRules({});
} else if (chrome.webRequest) {
  // Fallback for Firefox
  chrome.webRequest.onBeforeRequest.addListener(...);
}

// Check for offscreenDocument
if (chrome.offscreen) {
  await chrome.offscreen.createDocument({ ... });
} else {
  // Fallback: use a popup or dedicated tab
}
```

Advanced Detection with Defaults {#advanced-detection-with-defaults}

```javascript
const BrowserFeatures = {
  hasSidePanel: !!chrome.sidePanel,
  hasOffscreen: !!chrome.offscreen,
  has DNR: !!chrome.declarativeNetRequest,
  hasTabGroups: !!chrome.tabs.group,
  
  // Get the correct sidebar implementation
  getSidebarPath() {
    if (this.hasSidePanel) return 'sidepanel.html';
    // Firefox could use sidebar_action in manifest
    return 'sidebar.html';
  }
};
```

Build Configuration {#build-configuration}

Use a build tool to generate browser-specific builds from a shared codebase.

Vite with Multiple Targets {#vite-with-multiple-targets}

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import chromeExtensionReloader from 'vite-plugin-chrome-extension-reloader';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: 'src/background.js',
        popup: 'src/popup.html',
        content: 'src/content.js'
      }
    }
  },
  plugins: [chromeExtensionReloader()]
});
```

Webpack Multi-Build {#webpack-multi-build}

```javascript
// webpack.config.js
module.exports = [
  // Chrome/Edge build
  {
    target: 'web',
    entry: './src/background.js',
    output: { path: './dist/chrome/background.js' },
    // ... Chrome-specific config
  },
  // Firefox build
  {
    target: 'web',
    entry: './src/background.js',
    output: { path: './dist/firefox/background.js' },
    // ... Firefox-specific config
  }
];
```

Separate Manifests per Browser {#separate-manifests-per-browser}

```
src/
  manifest.json          # Base manifest
  manifests/
    chrome-manifest.json
    firefox-manifest.json
    safari-manifest.json
```

Use a build script to merge the base manifest with browser-specific overrides:

```javascript
// scripts/build-manifest.js
const base = require('../src/manifest.json');
const browser = process.env.BROWSER;
const override = require(`../src/manifests/${browser}-manifest.json`);

const merged = { ...base, ...override };
console.log(JSON.stringify(merged, null, 2));
```

Key Differences {#key-differences}

Service Worker vs Background Scripts {#service-worker-vs-background-scripts}

- Chrome/Edge (MV3): Use service workers (no persistent background context)
- Firefox (MV3): Uses non-persistent background scripts (not event pages; service worker support is in progress)
- Safari (MV3): Supports service workers since Safari 16.4

```javascript
// Detect current environment
const isServiceWorker = !('onConnect' in chrome.runtime);

// Handle differently based on environment
if (isServiceWorker) {
  // Use addListener for persistent events
  chrome.runtime.onMessage.addListener(handleMessage);
} else {
  // Direct event registration works in event pages
  chrome.runtime.onMessage.addListener(handleMessage);
}
```

Host Permissions Placement {#host-permissions-placement}

- MV2: Host permissions in `permissions` array
- MV3: Host permissions in `host_permissions` array (separate from API permissions)

```json
{
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ]
}
```

Firefox and Safari handle host permissions differently, always test permission-related functionality.

Sidebar vs SidePanel {#sidebar-vs-sidepanel}

| Feature | Chrome/Edge SidePanel | Firefox Sidebar |
|---------|----------------------|------------------|
| Manifest key | `side_panel` | `sidebar_action` |
| API | `chrome.sidePanel` | `browser.sidebarAction` |
| Default path | In manifest | In manifest |

```javascript
// Universal sidebar handler
function openSidebar() {
  if (chrome.sidePanel) {
    chrome.sidePanel.setOptions({ path: 'sidebar.html' });
    chrome.sidePanel.open();
  } else if (browser.sidebarAction) {
    browser.sidebarAction.open();
  }
}
```

DNR vs webRequest {#dnr-vs-webrequest}

- declarativeNetRequest (DNR): Newer, privacy-focused, supported in Chrome, Edge, Firefox
- webRequest: Older, more powerful, blocked in MV3 for blocking requests

```javascript
// Universal request blocking
if (chrome.declarativeNetRequest) {
  // MV3 approach
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{ 
      id: 1, 
      priority: 1, 
      action: { type: 'block' }, 
      condition: { urlFilter: '*.ads.*' } 
    }]
  });
} else if (chrome.webRequest) {
  // MV2 fallback (Firefox)
  chrome.webRequest.onBeforeRequest.addListener(
    () => ({ cancel: true }),
    { urls: ['*://*.ads.com/*'] },
    ['blocking']
  );
}
```

Store Submission {#store-submission}

Chrome Web Store (CWS) {#chrome-web-store-cws}

1. Zip your extension (`dist/` folder, not source)
2. Upload via Developer Dashboard
3. Pay one-time $5 developer fee
4. Review typically takes hours to days
5. Publish instantly after approval

Firefox Add-ons (AMO) {#firefox-add-ons-amo}

1. Sign via Mozilla Add-ons Developer Hub
2. No listing fee
3. Review: automated + manual (varies)
4. Can auto-update via Update URL

Edge Add-ons {#edge-add-ons}

1. Use Partner Center Dashboard
2. Free developer registration
3. Review takes 3-5 business days typically
4. Must meet Microsoft Store policies

Safari App Store {#safari-app-store}

1. Requires Apple Developer Program ($99/year)
2. Must use Xcode to build and package
3. Safari Web Extensions require macOS + Xcode
4. Submit through App Store Connect
5. Review takes 1-2 weeks typically

Review Process Differences {#review-process-differences}

| Store | Fee | Review Time | Auto-Update | Notes |
|-------|-----|-------------|-------------|-------|
| Chrome Web Store | $5 (one-time) | Hours-Days |  | Strict policy enforcement |
| Firefox AMO | Free | Days-Weeks |  | Less strict, but quality matters |
| Edge Add-ons | Free | 3-5 business days |  | Microsoft Store policies |
| Safari | $99/year | 1-2 weeks |  | Requires Xcode packaging |

Testing Across Browsers {#testing-across-browsers}

Separate Browser Profiles {#separate-browser-profiles}

Create dedicated profiles for development to avoid conflicts:

```bash
Chrome
chrome --remote-debugging-port=9222 --user-data-dir=./chrome-dev-profile

Firefox
firefox -P firefox-dev-profile -no-remote

Edge
msedge --remote-debugging-port=9222 --user-data-dir=./edge-dev-profile
```

Playwright for Automation {#playwright-for-automation}

```javascript
// test/extension.spec.js
import { test, expect } from '@playwright/test';

test('extension popup works', async ({ page }) => {
  // Load unpacked extension
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read']);
  
  // Test extension functionality
  await page.goto('popup.html');
  await page.click('#action-button');
  // ... assertions
});
```

Manual Testing Checklist {#manual-testing-checklist}

- [ ] Install on Chrome, test all features
- [ ] Install on Firefox, test all features
- [ ] Install on Edge, test all features
- [ ] Install on Safari (if targeting), test all features
- [ ] Test background script persistence
- [ ] Test extension updates
- [ ] Test with all permission levels

Abstraction Layer Pattern {#abstraction-layer-pattern}

Create a browser-api.ts wrapper to centralize feature detection and API normalization:

```typescript
// src/utils/browser-api.ts

interface BrowserAPI {
  runtime: typeof chrome.runtime;
  tabs: typeof chrome.tabs;
  sidePanel?: typeof chrome.sidePanel;
  storage: typeof chrome.storage;
}

function getBrowserAPI(): BrowserAPI {
  const api: BrowserAPI = {
    runtime: chrome.runtime,
    tabs: chrome.tabs,
    storage: chrome.storage,
  };
  
  // Feature detection
  if (chrome.sidePanel) {
    api.sidePanel = chrome.sidePanel;
  }
  
  return api;
}

export const browserAPI = getBrowserAPI();

// Usage
export async function openSidePanel(path: string): Promise<void> {
  if (browserAPI.sidePanel) {
    await browserAPI.sidePanel.setOptions({ path });
    await browserAPI.sidePanel.open();
  } else {
    // Fallback for Firefox
    console.warn('Side panel not supported');
  }
}
```

Common Mistakes {#common-mistakes}

 Assuming chrome.* Works Everywhere {#assuming-chrome-works-everywhere}

```javascript
// BAD: Will fail on Firefox
chrome.runtime.sendMessage({ data: 'hello' });

// GOOD: Use the polyfill or feature detection
import browser from 'webextension-polyfill';
await browser.runtime.sendMessage({ data: 'hello' });
```

 Chrome-Only APIs Without Detection {#chrome-only-apis-without-detection}

```javascript
// BAD: Will throw error on Firefox
chrome.sidePanel.setOptions({ path: 'panel.html' });

// GOOD: Always check first
if (chrome.sidePanel) {
  chrome.sidePanel.setOptions({ path: 'panel.html' });
}
```

 Safari Xcode Requirement {#safari-xcode-requirement}

Safari extensions require:
- macOS machine
- Xcode installed
- Apple Developer Program membership
- Building through Xcode (no CLI upload)

Don't target Safari without accounting for the build complexity.

 Ignoring Manifest Differences {#ignoring-manifest-differences}

```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "your-extension@domain.com",
      "strict_min_version": "109.0"
    },
    "safari": {
      "min_version": "15.4"
    }
  }
}
```

Works With Our Packages {#works-with-our-packages}

The following packages from @theluckystrike are designed for cross-browser compatibility:

@theluckystrike/webext-messaging {#theluckystrikewebext-messaging}

A Promise-based messaging library that works across all browsers:

```javascript
import { Messaging } from '@theluckystrike/webext-messaging';

// Simple message passing between context
const msg = new Messaging();

await msg.sendToBackground({ action: 'getData' });
await msg.sendToContent(tabId, { action: 'updateUI' });
```

@theluckystrike/webext-storage {#theluckystrikewebext-storage}

Promise-based storage abstraction with cross-browser support:

```javascript
import { Storage } from '@theluckystrike/webext-storage';

const storage = new Storage();

// Automatic Promise handling, works everywhere
await storage.set('settings', { theme: 'dark' });
const settings = await storage.get('settings');
```

Both packages handle the Promise/callback normalization and provide consistent APIs across Chrome, Firefox, Edge, and Safari.

Related Articles {#related-articles}

Related Articles

- [Cross-Browser Compatibility](../patterns/cross-browser-compatibility.md)
- [Safari Porting](../guides/chrome-extension-safari-porting.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
