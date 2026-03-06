# Browser Compatibility Reference

This reference documents browser compatibility for Chrome extensions. Use this guide to understand which browsers support your extension's APIs and how to develop for cross-browser compatibility.

## Overview

Chrome extensions can run on multiple Chromium-based browsers, but each has its own extension store, API support, and distribution model. Understanding these differences is essential for reaching the widest audience.

- Chrome extensions are primarily designed for Google Chrome
- Chromium-based browsers can run most Chrome extensions with minimal modifications
- Firefox and Safari require different approaches due to different extension platforms

## Chromium-Based Browsers

### Google Chrome
- **Store**: Chrome Web Store
- **API Support**: Full (all stable APIs)
- **Manifest**: MV2 (deprecated), MV3 (current)
- *Reference implementation for all extension development*

### Microsoft Edge
- **Store**: Microsoft Edge Add-ons
- **API Support**: Full MV3 support, minor enterprise policy differences
- **Manifest**: MV2, MV3
- *Excellent compatibility with Chrome*

### Brave
- **Store**: Chrome Web Store or Brave's own store
- **API Support**: MV3 support, blocks some tracking APIs by default
- **Manifest**: MV2, MV3
- *Privacy-focused, may limit some extension features*

### Opera
- **Store**: Opera Add-ons
- **API Support**: Full MV3 compatibility
- **Manifest**: MV2, MV3
- *Own extension store, full API compatibility*

### Vivaldi
- **Store**: Chrome Web Store (direct)
- **API Support**: Full MV3 support
- **Manifest**: MV2, MV3
- *Uses Chrome Web Store directly*

### Arc
- **Store**: Chrome Web Store
- **API Support**: Full MV3 support
- **Manifest**: MV2, MV3
- *Newer browser, uses Chrome Web Store*

## API Availability by Browser

|| API | Chrome | Edge | Brave | Opera |
|---|---|---|---|---|---|
| **chrome.sidePanel** | ✅ 114+ | ✅ 117+ | ✅ | ✅ |
| **chrome.readingList** | ✅ 120+ | ❌ | ❌ | ❌ |
| **chrome.tabGroups** | ✅ 89+ | ✅ 89+ | ❌ | ✅ 89+ |
| **chrome.dns** | ✅ (dev) | ❌ | ❌ | ❌ |
| **chrome.action** | ✅ | ✅ | ✅ | ✅ |
| **chrome.scripting** | ✅ | ✅ | ✅ | ✅ |
| **chrome.storage** | ✅ | ✅ | ✅ | ✅ |
| **chrome.alarms** | ✅ | ✅ | ✅ | ✅ |
| **chrome.bookmarks** | ✅ | ✅ | ✅ | ✅ |
| **chrome.commands** | ✅ | ✅ | ✅ | ✅ |
| **Service Workers** | ✅ | ✅ | ✅ | ✅ |

## Firefox Compatibility

Firefox uses WebExtensions API with important differences:

### Namespace Differences

| Feature | Chrome | Firefox | Edge |
|---------|--------|---------|------|
| **Primary Namespace** | `chrome.*` | `browser.*` | `chrome.*` |
| **Promise Support** | Native (MV3) | Native | Native |
| **Background Scripts** | Service Worker | Event Pages | Service Worker |

### Install the Polyfill

```bash
npm install webextension-polyfill
```

```javascript
// background.js
import browser from 'webextension-polyfill';
await browser.runtime.sendMessage({ greeting: 'hello' });
```

## Safari Compatibility

Safari Web Extensions require different development approach:

- **Xcode Required**: Must have Xcode installed
- **App Wrapper Required**: Extensions wrapped in Safari App Extension
- **API Subset**: Limited Chrome API support
- **Distribution**: Safari Extension Gallery

Supported: `runtime.*`, `storage.*`, `tabs.*`, `bookmarks.*`
Not supported: Side panel, reading list, advanced tab groups

## Namespace Differences

### Chrome (MV3)
```javascript
// Promises (MV3)
await chrome.runtime.sendMessage({ msg: 'hello' });
```

### Firefox (with polyfill)
```javascript
import browser from 'webextension-polyfill';
await browser.runtime.sendMessage({ msg: 'hello' });
```

### Edge
Same as Chrome - uses `chrome.*` namespace.

## Feature Detection Pattern

Use feature detection, not browser detection:

```javascript
// Side Panel
if (typeof chrome.sidePanel !== 'undefined') {
  await chrome.sidePanel.setPanel({ icon: 'icon.png' });
}

// Reading List
if (typeof chrome.readingList !== 'undefined') {
  await chrome.readingList.addEntry({ url: 'https://example.com', title: 'Example' });
}

// Tab Groups
if (typeof chrome.tabGroups !== 'undefined') {
  const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
}
```

## Cross-Browser Development Tips

1. **Use Feature Detection** - Check for API availability at runtime
2. **Test on Target Browsers** - Chrome, Edge, Firefox, Safari
3. **Use WebExtension Polyfill** - `npm install webextension-polyfill`
4. **Check MDN** - [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) for API compatibility
5. **Minimize Manifest Differences** - Use optional permissions, detect features at runtime
6. **Handle Firefox Quirks** - Different permission behavior, Event Pages vs Service Workers

## Cross-References

- Cross-Browser Development: `docs/guides/cross-browser.md`
- Compatibility Patterns: `docs/patterns/cross-browser-compatibility.md`
- MV3 Migration Guide: `docs/mv3/manifest-v3-migration-guide.md`
