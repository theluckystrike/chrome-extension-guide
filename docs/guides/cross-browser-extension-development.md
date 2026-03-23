---
layout: default
title: "Cross-Browser Extension Development — Complete Guide"
description: "A comprehensive guide to building browser extensions across Chrome, Firefox, Safari, and Edge using WebExtensions APIs with practical code examples and compatibility patterns."
canonical_url: "https://bestchromeextensions.com/guides/cross-browser-extension-development/"
---

# Cross-Browser Extension Development

Building extensions that work across multiple browsers maximizes your reach and ensures a consistent experience for all users. This guide covers the WebExtensions standard, browser-specific considerations, compatibility patterns, and distribution strategies for Chrome, Firefox, Safari, and Edge. Whether you're starting fresh or porting an existing extension, these patterns will help you achieve true cross-browser compatibility.

## Table of Contents

- [Understanding the WebExtensions Standard](#understanding-the-webextensions-standard)
- [Browser Compatibility Matrix](#browser-compatibility-matrix)
- [Manifest Configuration for Multiple Browsers](#manifest-configuration-for-multiple-browsers)
- [API Polyfills and Feature Detection](#api-polyfills-and-feature-detection)
- [Handling Browser-Specific Differences](#handling-browser-specific-differences)
- [Testing Across Browsers](#testing-across-browsers)
- [Distribution and Publishing Strategies](#distribution-and-publishing-strategies)
- [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)

---

## Understanding the WebExtensions Standard

The WebExtensions API provides a unified system for developing browser extensions that works across Chrome, Firefox, Edge, and Safari. Originally created by Mozilla for Firefox and subsequently adopted by Google (Chrome), Microsoft (Edge), and Apple (Safari), this standardized approach dramatically reduces the effort required to support multiple browsers.

At its core, WebExtensions defines a common set of APIs for core extension functionality:

- **Manifest file** (manifest.json) - Declares extension capabilities
- **Background scripts** - Handle events and long-running tasks
- **Content scripts** - Interact with web pages
- **Popup/Options pages** - User interfaces
- **Browser action** - Toolbar buttons and badges

The key insight is that while the APIs are standardized, implementations vary in subtle but important ways. Understanding these differences is crucial for building robust cross-browser extensions.

---

## Browser Compatibility Matrix

Before diving into implementation, understanding browser support for key APIs helps you plan feature availability:

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| Manifest V3 | 88+ | 121+ | 79+ | 15.4+ |
| Service Workers | 88+ | 109+ | 79+ | 15.4+ |
| Declarative Net Request | 84+ | 113+ | 84+ | 17.2+ |
| Side Panel | 114+ | 120+ | 114+ | 16.4+ |
| Storage API | Yes | Yes | Yes | Yes |
| Web Navigation | Yes | Yes | Yes | Limited |
| Tabs API | Full | Full | Full | Limited |
| Native Messaging | Yes | Yes | Yes | No |
| offscreenDocument | 109+ | No | 109+ | 16.4+ |

This table represents general availability. Always check the official Mozilla Developer Network (MDN) compatibility tables for the most current information, as browser vendors frequently add API support.

---

## Manifest Configuration for Multiple Browsers

The manifest.json file is the entry point for cross-browser compatibility. Different browsers require different fields and configurations.

### Basic Manifest Structure

```json
{
  "manifest_version": 3,
  "name": "My Cross-Browser Extension",
  "version": "1.0.0",
  "description": "Works across Chrome, Firefox, Safari, and Edge",
  "icons": {
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png",
    "128": "icons/icon-128.png"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/toolbar-16.png",
      "32": "icons/toolbar-32.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### Browser-Specific Settings

Firefox requires the `browser_specific_settings` field for extension identity, while Safari needs similar configuration for its App Store requirements:

```json
{
  "manifest_version": 3,
  "name": "My Cross-Browser Extension",
  "browser_specific_settings": {
    "gecko": {
      "id": "extension@example.com",
      "strict_min_version": "109.0"
    },
    "safari": {
      "targets": [
        {
          "platform": "mac",
          "id": "com.example.extension"
        },
        {
          "platform": "ios",
          "id": "com.example.extension-ios"
        }
      ]
    }
  }
}
```

The `gecko.id` is required for Firefox and must be a valid email format or UUID. This identifier persists across updates, so choose carefully.

---

## API Polyfills and Feature Detection

The `webextension-polyfill` library provides Promise-based wrappers that normalize API differences across browsers:

### Installation

```bash
npm install webextension-polyfill
```

### Basic Usage

```typescript
import browser from 'webextension-polyfill';

// Storage - unified API across all browsers
async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings });
  await browser.storage.sync.set({ settings });
}

async function loadSettings(): Promise<Settings | null> {
  const result = await browser.storage.sync.get('settings');
  return result.settings ?? null;
}

// Message passing - consistent API
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'GET_TABS') {
    return browser.tabs.query({ active: true, currentWindow: true });
  }
  return false;
});

// Send messages with consistent Promise-based API
async function notifyBackground(action: string, data: unknown): Promise<void> {
  await browser.runtime.sendMessage({ type: action, payload: data });
}
```

### Feature Detection Pattern

Instead of assuming API availability, implement feature detection:

```typescript
const ExtensionFeatures = {
  get declarativeNetRequestSupported(): boolean {
    return typeof browser.declarativeNetRequest !== 'undefined';
  },

  get sidePanelSupported(): boolean {
    return typeof browser.sidePanel !== 'undefined';
  },

  get offscreenDocumentSupported(): boolean {
    // Chrome/Edge: offscreenDocument API
    // Firefox: Limited/no support
    // Safari: Supported in 16.4+
    return typeof browser.offscreen !== 'undefined' ||
           typeof (browser as any).offscreenDocument !== 'undefined';
  },

  get storageSyncSupported(): boolean {
    return typeof browser.storage?.sync !== 'undefined';
  },

  get nativeMessagingSupported(): boolean {
    // Not available in Safari
    return typeof browser.runtime?.sendNativeMessage === 'function';
  }
};

function initializeFeatureFlags(): Record<string, boolean> {
  return {
    dnr: ExtensionFeatures.declarativeNetRequestSupported,
    sidePanel: ExtensionFeatures.sidePanelSupported,
    offscreen: ExtensionFeatures.offscreenDocumentSupported,
    syncStorage: ExtensionFeatures.storageSyncSupported,
    nativeMessaging: ExtensionFeatures.nativeMessagingSupported
  };
}
```

This pattern allows your extension to gracefully degrade or adapt based on available features.

---

## Handling Browser-Specific Differences

Even with the WebExtensions standard, browsers implement APIs differently. Here are common differences and how to handle them.

### Tab API Differences

Safari's Tabs API has limitations compared to Chrome and Firefox:

```typescript
// Safe tab operations across browsers
async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab ?? null;
}

// Avoid properties not available in all browsers
async function getTabInfo(tabId: number): Promise<TabInfo> {
  const tab = await browser.tabs.get(tabId);
  
  return {
    id: tab.id,
    url: tab.url,
    title: tab.title,
    // These properties may not exist in all browsers
    favIconUrl: tab.favIconUrl,
    // Safely access potentially undefined properties
    incognito: (tab as any).incognito ?? false,
    pinned: tab.pinned ?? false
  };
}
```

### Storage API Quotas

Storage limits vary by browser:

```typescript
// Check available storage before writing large data
async function saveLargeData(key: string, data: unknown): Promise<boolean> {
  const estimate = await navigator.storage?.estimate?.();
  const available = (estimate?.quota ?? 0) - (estimate?.usage ?? 0);
  const dataSize = new Blob([JSON.stringify(data)]).size;
  
  // Add 10% buffer for overhead
  if (dataSize > available * 0.9) {
    console.warn('Storage quota exceeded');
    return false;
  }
  
  await browser.storage.local.set({ [key]: data });
  return true;
}

// Firefox has lower sync storage limits (100KB vs Chrome's 1MB)
async function saveToSync(key: string, data: unknown): Promise<boolean> {
  try {
    const serialized = JSON.stringify(data);
    // Firefox: ~100KB limit, Chrome: ~1MB limit
    if (serialized.length > 100 * 1024) {
      console.warn('Data too large for sync storage');
      return false;
    }
    await browser.storage.sync.set({ [key]: data });
    return true;
  } catch (error) {
    console.error('Sync storage error:', error);
    return false;
  }
}
```

### Service Worker Lifecycle

Firefox and Safari handle service worker lifecycle differently:

```typescript
// Service worker registration with error handling
async function registerServiceWorker(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.register(
      'service-worker.js'
    );
    
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New service worker available');
          }
        });
      }
    });
  } catch (error) {
    console.error('Service worker registration failed:', error);
  }
}

// Listen for service worker events across browsers
browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'update') {
    // Perform migration checks
    handleMigration(details.previousVersion);
  }
});

browser.runtime.onStartup.addListener(() => {
  // Extension started with browser
  console.log('Browser started, initializing...');
});
```

---

## Testing Across Browsers

Comprehensive testing is essential for cross-browser compatibility.

### Local Testing Setup

Create browser-specific test configurations:

```typescript
// test/utils/browser-detector.ts
export type BrowserType = 'chrome' | 'firefox' | 'edge' | 'safari' | 'unknown';

export function detectBrowser(): BrowserType {
  const ua = navigator.userAgent;
  
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
  if (ua.includes('Chrome')) return 'chrome';
  
  return 'unknown';
}

export function getBrowserVersion(): string {
  const ua = navigator.userAgent;
  const match = ua.match(/(Firefox|Chrome|Edge|Safari)\/(\d+)/);
  return match ? match[2] : 'unknown';
}
```

### Automated Testing with Playwright

```typescript
// test/cross-browser.test.ts
import { test, expect } from '@playwright/test';

const browsers = [
  { name: 'chromium', channel: 'chrome' },
  { name: 'firefox' },
  { name: 'webkit' } // For Safari
];

for (const browserConfig of browsers) {
  test.describe(`Extension tests - ${browserConfig.name}`, () => {
    test('should load extension popup', async ({ page }) => {
      // Navigate to a test page
      await page.goto('https://example.com');
      
      // Click extension icon (browser-specific)
      // This requires extension context in Playwright
    });
    
    test('should communicate between content and background', async ({ page }) => {
      // Test message passing in the extension context
    });
  });
}
```

### Manual Testing Checklist

Create a systematic testing approach:

```markdown
## Cross-Browser Testing Checklist

### Chrome
- [ ] Extension loads in browser action
- [ ] Popup opens and functions
- [ ] Content script injects correctly
- [ ] Service worker activates
- [ ] Storage operations work
- [ ] Context menus function

### Firefox
- [ ] Extension loads from about:addons
- [ ] All Chrome features work identically
- [ ] No console errors
- [ ] Storage sync functions

### Edge
- [ ] Extension loads from Edge Add-ons
- [ ] All Chrome features work identically
- [ ] IE/Edge compatibility mode (if applicable)

### Safari
- [ ] Extension appears in Safari menu
- [ ] Popup opens
- [ ] Content script injection
- [ ] Reduced API support acknowledged
- [ ] iOS extension (if applicable)
```

---

## Distribution and Publishing Strategies

Each browser has its own extension store with different requirements and review processes.

### Store Comparison

| Store | Review Time | Dev Account | Fee |
|-------|-------------|-------------|-----|
| Chrome Web Store | 1-3 days | Google Account | $5 one-time |
| Firefox Add-ons | 1-7 days | Mozilla Account | Free |
| Microsoft Edge | 1-3 days | Microsoft Account | Free |
| Safari App Store | 1-2 weeks | Apple Developer | $99/year |

### Publishing with web-ext

The `web-ext` tool simplifies Firefox distribution:

```bash
# Install web-ext
npm install -g web-ext

# Sign and publish to Firefox
web-ext sign --api-key=$AMO_JWT_ISSUER --api-secret=$AMO_JWT_SECRET

# Build for development
web-ext build --ignore-files="*.map"
```

### Using Extension Build Tools

Modern build tools like WXT and Plasmo provide built-in cross-browser support:

```bash
# Create extension with WXT
npm create wxt@latest my-extension

# WXT handles browser-specific builds automatically
npx wxt build --browser=firefox
npx wxt build --browser=chromium
npx wxt build --browser=safari
```

### Version Management

Maintain a clear versioning strategy:

```json
{
  "version": "1.2.3",
  "version_name": "1.2.3 - Feature release"
}
```

The version must follow semver (major.minor.patch). Use `version_name` for a human-readable description that doesn't affect update logic.

---

## Common Pitfalls and Solutions

### Pitfall 1: Assuming All APIs Are Available

```typescript
// ❌ Bad: Assumes native messaging is available
const hasNativeMessaging = browser.runtime.sendNativeMessage;

// ✅ Good: Feature detection
const hasNativeMessaging = typeof browser.runtime?.sendNativeMessage === 'function';
```

### Pitfall 2: Ignoring Storage Limits

```typescript
// ❌ Bad: No size checking before saving
await browser.storage.local.set({ largeData: bigObject });

// ✅ Good: Check size and warn user
async function safeSet(key: string, value: unknown): Promise<void> {
  const serialized = JSON.stringify(value);
  if (serialized.length > 5 * 1024 * 1024) {
    throw new Error('Data exceeds storage limits');
  }
  await browser.storage.local.set({ [key]: value });
}
```

### Pitfall 3: Chrome-Only Manifest Fields

```typescript
// ❌ Bad: Chrome-specific field in base manifest
{
  "action": { ... },
  "options_page": "options.html" // Deprecated in MV3
}

// ✅ Good: Use browser-specific overrides or feature detection
{
  "action": { ... },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  }
}
```

### Pitfall 4: Service Worker Not Reloading

Firefox and Safari handle SW lifecycle differently:

```typescript
// ✅ Good: Handle all SW lifecycle events
browser.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});

browser.runtime.onStartup.addListener(() => {
  console.log('Browser started');
});

// For manual testing: implement a manual refresh option
async function forceUpdate(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.update();
  }
}
```

### Pitfall 5: Content Script Isolation Issues

```typescript
// ❌ Bad: Assuming DOM is fully loaded
const element = document.querySelector('.target');
element.addEventListener('click', handleClick);

// ✅ Good: Wait for DOM and use mutation observers
function waitForElement(selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);
    
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  });
}
```

---

## Conclusion

Cross-browser extension development requires careful attention to API differences, feature detection, and testing strategies. By leveraging the WebExtensions standard, using polyfills like `webextension-polyfill`, and implementing robust feature detection, you can create extensions that provide consistent functionality across Chrome, Firefox, Edge, and Safari.

Key takeaways:

1. **Use the WebExtensions standard** as your foundation
2. **Implement feature detection** rather than assuming API availability
3. **Test on all target browsers** before releasing
4. **Handle storage quotas** appropriately for each browser
5. **Use build tools** that handle browser-specific configurations

Following these patterns ensures your extension reaches the widest possible audience while maintaining a quality experience across all supported browsers.

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
