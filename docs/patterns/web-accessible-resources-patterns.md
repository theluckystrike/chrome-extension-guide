---
layout: default
title: "Chrome Extension Web Accessible Resources Patterns. Best Practices"
description: "Advanced patterns for web accessible resources."
canonical_url: "https://bestchromeextensions.com/patterns/web-accessible-resources-patterns/"
---

# Web Accessible Resources Advanced Patterns (MV3)

Overview {#overview}

Web Accessible Resources (WAR) in Manifest V3 allow extensions to expose specific resources to web pages. This document covers advanced patterns for secure and effective usage.

MV3 Format {#mv3-format}

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
- resources: Array of file paths relative to extension root
- matches: Match patterns specifying which sites can access resources
- use_dynamic_url: Generates unique URL per session (prevents fingerprinting)

Security Best Practices {#security-best-practices}

Restrict Access with Exact Match Patterns {#restrict-access-with-exact-match-patterns}

```json
{
  "matches": ["https://example.com/page/*"]
}
```

Never use `<all_urls>` unless absolutely necessary. Be as specific as possible with your match patterns to minimize exposure.

Use Dynamic URLs {#use-dynamic-urls}

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

Common Patterns {#common-patterns}

1. Script Injection into Page Context {#1-script-injection-into-page-context}

Inject scripts that run in the page's main world:

```javascript
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
(document.head || document.documentElement).appendChild(script);
script.remove();
```

2. Asset Loader (Images, Fonts, CSS) {#2-asset-loader-images-fonts-css}

```javascript
function loadExtensionAsset(path) {
  return chrome.runtime.getURL(path);
}

// Usage
const img = document.createElement('img');
img.src = loadExtensionAsset('images/icon.png');
```

3. Communication Bridge {#3-communication-bridge}

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

4. PDF/HTML Viewer {#4-pdfhtml-viewer}

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

Security Implications {#security-implications}

- Any matched site can load your resources: Keep the list of accessible resources minimal
- Extension detection: Websites can detect your extension by probing for accessible resources
- Privacy concern: Avoid exposing sensitive data or unique identifiers in WAR

Alternatives to Consider {#alternatives-to-consider}

- Inline scripts: Bundle JavaScript directly in content scripts to avoid exposure
- Programmatic injection: Use chrome.scripting.executeScript() instead of WAR
- Message passing: Use chrome.runtime.sendMessage for communication

Related Patterns {#related-patterns}

- [MV3 Web Accessible Resources](../mv3/web-accessible-resources.md)
- [Basic Web Accessible Resources](../patterns/web-accessible-resources.md)
- [Security Best Practices](../guides/security-best-practices.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
