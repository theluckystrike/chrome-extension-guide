---
layout: default
title: "Chrome Extension Extension Feature Detection — Best Practices"
description: "Detect browser and API capabilities at runtime with feature detection patterns for cross-browser extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/extension-feature-detection/"
---

# Extension Feature Detection Patterns

Feature detection is essential for Chrome extensions because APIs are continuously added in newer Chrome versions, and cross-browser compatibility requires handling missing APIs gracefully.

## Checking API Existence

There are two primary approaches for checking if an API exists:

### Using Conditional Checks

The safest approach is using conditional checks before accessing APIs:

```javascript
if (chrome.sidePanel) {
  // Chrome 114+ API available
}
```

### Using try/catch

For cases where the API might exist but throw errors when accessed:

```javascript
try {
  if (chrome.action.setBadgeTextColor) {
    // API is callable
  }
} catch (e) {
  // API not available
}
```

## Checking Method Existence

Use `typeof` to verify specific methods exist:

```javascript
if (typeof chrome.action?.setBadgeTextColor === 'function') {
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}
```

The optional chaining (`?.`) prevents errors when the parent API doesn't exist.

## Version Detection

### Chrome Version from User Agent

```javascript
function getChromeVersion() {
  const match = navigator.userAgent.match(/Chrome\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
```

> **Warning**: User agent parsing is fragile and should be avoided when feature detection is possible.

### When to Use Version Detection

Version detection is appropriate when:
- No reliable feature detection is available
- You need to warn users about unsupported browsers
- Analytics require Chrome version information

Otherwise, prefer runtime feature detection.

## Graceful Degradation

Provide fallback behavior when APIs are unavailable:

```javascript
async function setBadgeColor(color) {
  if (typeof chrome.action?.setBadgeTextColor === 'function') {
    await chrome.action.setBadgeTextColor({ color });
  } else {
    // Fallback: use solid background (deprecated but widely supported)
    await chrome.action.setBadgeBackgroundColor({ color });
  }
}
```

### Fallback UI Patterns

```javascript
function renderUI() {
  if (chrome.sidePanel) {
    // Use modern side panel API
    chrome.sidePanel.setPanel({ path: 'panel.html' });
  } else {
    // Fallback to popup or options page
    openPopup();
  }
}
```

## Progressive Enhancement

Add features when APIs are detected:

```javascript
class FeatureDetector {
  static get hasSidePanel() {
    return !!chrome.sidePanel;
  }

  static get hasOffscreen() {
    return !!chrome.offscreen;
  }

  static get hasUserScripts() {
    return !!chrome.userScripts;
  }

  static get hasSessionStorage() {
    return typeof chrome.storage.session?.get === 'function';
  }

  static get hasActionColor() {
    return typeof chrome.action?.setBadgeTextColor === 'function';
  }
}
```

## Common Feature Checks

| Feature | Chrome Version | Detection Method |
|---------|----------------|------------------|
| Side Panel | 114+ | `chrome.sidePanel` |
| Offscreen Documents | 109+ | `chrome.offscreen` |
| User Scripts | 120+ | `chrome.userScripts` |
| Session Storage | 102+ | `chrome.storage.session` |
| Badge Text Color | 110+ | `chrome.action.setBadgeTextColor` |

## Feature Detector Utility

```javascript
const FeatureDetector = {
  detect(api, method) {
    const apiObj = chrome[api];
    if (!apiObj) return false;
    if (method) {
      return typeof apiObj[method] === 'function';
    }
    return true;
  },

  require(...features) {
    return features.every(([api, method]) => this.detect(api, method));
  }
};

// Usage
if (FeatureDetector.detect('sidePanel')) {
  // Enable side panel features
}
```

## Polyfills for Missing APIs

For cross-browser compatibility, use the WebExtension Polyfill:

```javascript
import browser from 'webextension-polyfill';

// Instead of chrome.storage.local
browser.storage.local.get('key').then(result => {
  // Works across browsers
});
```

Install via: `npm install webextension-polyfill`

## Feature Matrix

Track which features work in which browsers:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Side Panel | 114+ | ❌ | ❌ | 114+ |
| Offscreen | 109+ | ❌ | ❌ | 114+ |
| User Scripts | 120+ | 102+ | ❌ | 120+ |
| Session Storage | 102+ | 101+ | 14+ | 102+ |

## Testing Across Chrome Versions

- **Stable**: Current public release
- **Beta**: Next release candidate
- **Dev**: Development build (updated weekly)
- **Canary**: Daily builds (most bleeding edge)

Install multiple channels to test feature availability.

## Cross-References

- [API Availability Reference](../reference/api-availability.md)
- [Browser Compatibility](../reference/browser-compatibility.md)
- [Cross-Browser Compatibility Patterns](./cross-browser-compatibility.md)
