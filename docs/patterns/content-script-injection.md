---
layout: default
title: "Chrome Extension Content Script Injection — Best Practices"
description: "Advanced content script injection techniques and patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/content-script-injection/"
---

# Content Script Injection Patterns

Content scripts run in the context of web pages. Understanding the different injection methods is essential for building effective Chrome extensions.

## Overview {#overview}

There are three primary ways to inject content scripts:

- **Static Injection**: Declared in manifest.json, runs automatically on matching URLs
- **Programmatic Injection**: Injected on demand via the Scripting API
- **Dynamic Registration**: Registered at runtime but runs automatically on matching pages

## Static Injection (Manifest) {#static-injection-manifest}

Declare content scripts in manifest.json:

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  }]
}
```

Best for always-on functionality on specific sites—runs automatically without user interaction.

## Programmatic Injection {#programmatic-injection}

Use the Scripting API for on-demand injection:

```js
chrome.scripting.executeScript({
  target: { tabId: 123 },
  files: ['content.js']
});
```

Requires `"scripting"` permission plus host permission or `activeTab`. Best for user-triggered actions.

## Dynamic Registration {#dynamic-registration}

Register scripts at runtime:

```js
chrome.scripting.registerContentScripts([{
  id: 'my-script',
  matches: ['https://*.example.com/*'],
  js: ['content.js'],
  persistAcrossSessions: true
}]);
```

Ideal for user-configurable site matching. Unregister with:

```js
chrome.scripting.unregisterContentScripts(['my-script']);
```

## run_at Timing {#run-at-timing}

| Value | Description |
|-------|-------------|
| `"document_start"` | Before DOM constructed |
| `"document_idle"` | After DOMContentLoaded (default, recommended) |
| `"document_end"` | After DOM, before subresources |

## World Isolation {#world-isolation}

- **ISOLATED** (default): Separate JS context, shared DOM, cannot access page variables
- **MAIN**: Page's JS context, can access page variables, security risk

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "world": "MAIN"
  }]
}
```

## CSS Injection {#css-injection}

Static: add `"css": ["styles.css"]` to content_scripts. Programmatic:

```js
chrome.scripting.insertCSS({ target: { tabId: 123 }, css: 'body { }' });
chrome.scripting.removeCSS({ target: { tabId: 123 }, css: 'body { }' });
```

## Injection Guards {#injection-guards}

Prevent duplicate injections using DOM markers:

```js
if (document.body.hasAttribute('data-extension-injected')) return;
document.body.setAttribute('data-extension-injected', 'true');
```

Or check registered scripts:

```js
chrome.scripting.getRegisteredContentScripts({ ids: ['my-script'] });
```

## Best Practices {#best-practices}

1. Use static injection for always-on features
2. Use programmatic injection for user-triggered actions
3. Use dynamic registration for user-configurable matching
4. Prefer ISOLATED world for security
5. Implement injection guards to prevent duplicates

## Cross-References {#cross-references}

- [Content Script Patterns Guide](../guides/content-script-patterns.md)
- [Dynamic Content Scripts (MV3)](../mv3/dynamic-content-scripts.md)
- [Scripting API Reference](../api-reference/scripting.md)
- [Content Script Isolation](../patterns/content-script-isolation.md)
