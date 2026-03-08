---
layout: default
title: "Chrome Extension Web Accessible Resources Patterns — Best Practices"
description: "Advanced patterns for web accessible resources."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/web-accessible-resources-patterns/"
---

# Web Accessible Resources Advanced Patterns (MV3)

## Overview

Web Accessible Resources (WAR) in Manifest V3 allow extensions to expose specific resources to web pages. This document covers advanced patterns for secure and effective usage.

## MV3 Format

```json
{
  "web_accessible_resources": [
    {
      "resources": ["injected.js", "styles.css"],
      "matches": ["https://example.com/*"],
      "use_dynamic_url": true
    }
  ]
}
```

Each entry contains:
- **resources**: Array of file paths relative to extension root
- **matches**: Match patterns specifying which sites can access resources
- **use_dynamic_url**: Generates unique URL per session (prevents fingerprinting)

## Security Best Practices

### Restrict Access with Exact Match Patterns

```json
{
  "matches": ["https://example.com/page/*"]
}
```

Never use `<all_urls>` unless absolutely necessary. Be as specific as possible with your match patterns to minimize exposure.

### Use Dynamic URLs

Enable `use_dynamic_url: true` to generate unique URLs per session:

```json
{
  "use_dynamic_url": true
}
```

This prevents:
- Resource enumeration attacks
- Extension fingerprinting by websites
- Caching of extension resources on third-party servers

## Common Patterns

### 1. Script Injection into Page Context

Inject scripts that run in the page's main world:

```javascript
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
(document.head || document.documentElement).appendChild(script);
script.remove();
```

### 2. Asset Loader (Images, Fonts, CSS)

```javascript
function loadExtensionAsset(path) {
  return chrome.runtime.getURL(path);
}

// Usage
const img = document.createElement('img');
img.src = loadExtensionAsset('images/icon.png');
```

### 3. Communication Bridge

Create a relay between content script and page:

```javascript
// in web-accessible script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  chrome.runtime.sendMessage(event.data);
});

window.addEventListener('message-from-extension', (event) => {
  window.postMessage(event.detail, '*');
});
```

### 4. PDF/HTML Viewer

Allow extension pages to be loaded in frames:

```json
{
  "resources": ["viewer.html"],
  "matches": ["https://example.com/*"],
  "use_dynamic_url": true
}
```

```html
<iframe src="chrome-extension://EXTENSION_ID/viewer.html?file=..."></iframe>
```

## Security Implications

- **Any matched site can load your resources**: Keep the list of accessible resources minimal
- **Extension detection**: Websites can detect your extension by probing for accessible resources
- **Privacy concern**: Avoid exposing sensitive data or unique identifiers in WAR

## Alternatives to Consider

- **Inline scripts**: Bundle JavaScript directly in content scripts to avoid exposure
- **Programmatic injection**: Use chrome.scripting.executeScript() instead of WAR
- **Message passing**: Use chrome.runtime.sendMessage for communication

## Related Patterns

- [MV3 Web Accessible Resources](../mv3/web-accessible-resources.md)
- [Basic Web Accessible Resources](../patterns/web-accessible-resources.md)
- [Security Best Practices](../guides/security-best-practices.md)
