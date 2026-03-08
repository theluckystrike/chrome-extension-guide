---
layout: default
title: "Chrome Extension Firefox Migration — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-migration-firefox/"
---
# Chrome Extension Migration to Firefox

Guide for porting Chrome extensions to Firefox, covering API compatibility and best practices.

## Overview {#overview}

Porting Chrome extensions to Firefox is straightforward. Firefox's WebExtensions API is largely compatible with Chrome's.

## Browser Namespace {#browser-namespace}

Firefox supports both `chrome.*` and `browser.*` namespaces. Use `browser.*` for Promise-based APIs:

```javascript
// Chrome (callback-based)
chrome.storage.local.get('key', (result) => console.log(result.key));

// Firefox (Promise-based)
const result = await browser.storage.local.get('key');
```

## WebExtensions Polyfill {#webextensions-polyfill}

Use `webextension-polyfill` for consistent Promise APIs:

```javascript
import browser from 'webextension-polyfill';
await browser.storage.local.set({ key: 'value' });
```

## Manifest Differences {#manifest-differences}

### Manifest V2 {#manifest-v2}

Firefox still supports MV2. Use `browser_action` instead of `action`.

### Manifest V3 {#manifest-v3}

Firefox has limited service worker support for MV3 backgrounds.

## Background Scripts {#background-scripts}

Firefox supports both persistent and event-based backgrounds:

```json
{
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  }
}
```

## Content Scripts {#content-scripts}

Content scripts are mostly compatible between Chrome and Firefox. Both support:
- Programmatic injection via `chrome.scripting.executeScript`
- Declarative injection in manifest
- Access to DOM and Chrome/Firefox extension APIs

## Building for Both Browsers {#building-for-both-browsers}

Use conditional code or build-time configuration:

```javascript
const isFirefox = typeof browser !== 'undefined' && !chrome.runtime?.id;

if (isFirefox) {
  // Firefox-specific code
}
```

Or use build tools to swap polyfills based on target browser.

## Storage API {#storage-api}

The `browser.storage` API is fully compatible: `storage.local`, `storage.sync`, and `storage.managed`.

## Messaging {#messaging}

Message passing works identically in both browsers:

```javascript
browser.runtime.sendMessage({ greeting: 'hello' });
browser.runtime.onMessage.addListener((message) => console.log(message));
```

## APIs Not Available in Firefox {#apis-not-available-in-firefox}

- `chrome.sidePanel` - Use `browser.sidebarAction` instead
- Some `chrome.declarativeNetRequest` features

## Firefox-Only APIs {#firefox-only-apis}

- `browser.sidebarAction` - Sidebar control
- `browser.find` - Page search

## Testing {#testing}

Use `web-ext` tool: `npm install -g web-ext && web-ext run`

Use `about:debugging` for Firefox extension inspection.

## Packaging {#packaging}

Firefox uses `.xpi` format: `web-ext build`

## Publishing {#publishing}

1. Create account at addons.mozilla.org (AMO)
2. Upload `.xpi` file
3. Undergo review
4. Publish after approval

## Cross-Reference {#cross-reference}

- [Cross-Browser Development](../guides/cross-browser.md)
- [Cross-Browser Compatibility Patterns](../patterns/cross-browser-compatibility.md)
- [Browser Compatibility Reference](../reference/browser-compatibility.md)

## Related Articles {#related-articles}

## Related Articles

- [Edge Migration](../guides/chrome-extension-migration-edge.md)
- [MV2 to MV3 Migration](../guides/mv2-to-mv3-migration.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
