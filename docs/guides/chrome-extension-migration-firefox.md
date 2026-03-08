---
layout: default
title: "Chrome Extension Firefox Migration — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Chrome Extension Migration to Firefox

Guide for porting Chrome extensions to Firefox, covering API compatibility and best practices.

## Overview

Porting Chrome extensions to Firefox is straightforward. Firefox's WebExtensions API is largely compatible with Chrome's.

## Browser Namespace

Firefox supports both `chrome.*` and `browser.*` namespaces. Use `browser.*` for Promise-based APIs:

```javascript
// Chrome (callback-based)
chrome.storage.local.get('key', (result) => console.log(result.key));

// Firefox (Promise-based)
const result = await browser.storage.local.get('key');
```

## WebExtensions Polyfill

Use `webextension-polyfill` for consistent Promise APIs:

```javascript
import browser from 'webextension-polyfill';
await browser.storage.local.set({ key: 'value' });
```

## Manifest Differences

### Manifest V2

Firefox still supports MV2. Use `browser_action` instead of `action`.

### Manifest V3

Firefox has limited service worker support for MV3 backgrounds.

## Background Scripts

Firefox supports both persistent and event-based backgrounds:

```json
{
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  }
}
```

## Content Scripts

Content scripts are mostly compatible between Chrome and Firefox. Both support:
- Programmatic injection via `chrome.scripting.executeScript`
- Declarative injection in manifest
- Access to DOM and Chrome/Firefox extension APIs

## Building for Both Browsers

Use conditional code or build-time configuration:

```javascript
const isFirefox = typeof browser !== 'undefined' && !chrome.runtime?.id;

if (isFirefox) {
  // Firefox-specific code
}
```

Or use build tools to swap polyfills based on target browser.

## Storage API

The `browser.storage` API is fully compatible: `storage.local`, `storage.sync`, and `storage.managed`.

## Messaging

Message passing works identically in both browsers:

```javascript
browser.runtime.sendMessage({ greeting: 'hello' });
browser.runtime.onMessage.addListener((message) => console.log(message));
```

## APIs Not Available in Firefox

- `chrome.sidePanel` - Use `browser.sidebarAction` instead
- Some `chrome.declarativeNetRequest` features

## Firefox-Only APIs

- `browser.sidebarAction` - Sidebar control
- `browser.find` - Page search

## Testing

Use `web-ext` tool: `npm install -g web-ext && web-ext run`

Use `about:debugging` for Firefox extension inspection.

## Packaging

Firefox uses `.xpi` format: `web-ext build`

## Publishing

1. Create account at addons.mozilla.org (AMO)
2. Upload `.xpi` file
3. Undergo review
4. Publish after approval

## Cross-Reference

- [Cross-Browser Development](../guides/cross-browser.md)
- [Cross-Browser Compatibility Patterns](../patterns/cross-browser-compatibility.md)
- [Browser Compatibility Reference](../reference/browser-compatibility.md)
