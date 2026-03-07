# Web Accessible Resources

## Overview

Web Accessible Resources allow extension resources to be accessible from web pages and content scripts. This is essential for injecting UI components, loading extension assets in web pages, and enabling fingerprinting protection through dynamic URLs.

## Declaring web_accessible_resources in Manifest

In Manifest V3, declare resources in `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "web_accessible_resources": [
    {
      "resources": ["images/*", "fonts/*.woff2", "ui/*.html"],
      "matches": ["https://*.example.com/*"]
    },
    {
      "resources": ["private/*"],
      "matches": ["https://example.com/*"],
      "extension_ids": ["abcdefghijklmnopqrstuvwxyz012345"]
    }
  ]
}
```

### Manifest V2 Differences

MV2 uses a simpler array format:

```json
{
  "web_accessible_resources": [
    "images/*",
    "fonts/*.woff2",
    "ui/*.html"
  ]
}
```

MV2 resources are accessible from any page by default, while MV3 requires explicit `matches` patterns.

## Resource Matching: matches and extension_ids

The `matches` array uses URL patterns similar to content scripts:

| Pattern | Description |
|---------|-------------|
| `<all_urls>` | Accessible from any URL |
| `https://*.example.com/*` | Any subdomain of example.com |
| `https://example.com/path/*` | Specific path and below |

The `extension_ids` array restricts access to specific extensions:

```json
{
  "resources": ["shared/*"],
  "matches": ["<all_urls>"],
  "extension_ids": ["extension-id-1", "extension-id-2"]
}
```

## use_dynamic_url for Fingerprinting Protection

The `use_dynamic_url` property generates unique, non-predictable URLs for each resource, preventing fingerprinting:

```json
{
  "resources": ["images/logo.png"],
  "matches": ["https://*.example.com/*"],
  "use_dynamic_url": true
}
```

### How Dynamic URLs Work

Instead of predictable URLs like:
```
chrome-extension://extension-id/images/logo.png
```

Dynamic URLs change per session or navigation:
```
chrome-extension://extension-id/12345678/images/logo.png
```

This prevents websites from detecting your extension by checking for known resource paths.

## Accessing Resources from Content Scripts

Content scripts can use `chrome.runtime.getURL()` to build resource URLs:

```javascript
// content.js
const iconUrl = chrome.runtime.getURL('images/icon.png');
const styleUrl = chrome.runtime.getURL('css/injected.css');

// Create and inject an image
const img = document.createElement('img');
img.src = iconUrl;
document.body.appendChild(img);

// Inject stylesheets
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = styleUrl;
document.head.appendChild(link);
```

## Accessing Resources from Web Pages

Web pages can only access resources if they're declared with matching patterns:

```javascript
// From a web page (if allowed by manifest)
const img = document.createElement('img');
img.src = 'chrome-extension://EXTENSION_ID/images/logo.png';
```

**Note**: Web pages cannot determine your extension ID or access resources without explicit declaration.

## Dynamic Resource Access Patterns

### Loading Resources on Demand

```javascript
// background.js - Handle dynamic resource requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_RESOURCE') {
    const url = chrome.runtime.getURL(message.resourcePath);
    sendResponse({ url });
  }
});

// content.js - Request resource URL dynamically
async function getResourceUrl(resourcePath) {
  const response = await chrome.runtime.sendMessage({
    type: 'GET_RESOURCE',
    resourcePath
  });
  return response.url;
}
```

### Caching Behavior

Resources loaded via `chrome.runtime.getURL()` are cached by the browser:

```javascript
// First load - fetched from extension bundle
const url1 = chrome.runtime.getURL('images/logo.png');

// Subsequent loads - served from cache
const url2 = chrome.runtime.getURL('images/logo.png');

console.log(url1 === url2); // true (same URL, cached)
```

To force refresh, append a query parameter:

```javascript
const url = chrome.runtime.getURL('images/logo.png') + '?v=' + Date.now();
```

## Images, Fonts, and Stylesheets as Web Accessible Resources

### Images

```json
{
  "resources": ["images/*.png", "images/*.svg", "icons/*.ico"],
  "matches": ["<all_urls>"]
}
```

```javascript
const img = document.createElement('img');
img.src = chrome.runtime.getURL('images/extension-logo.png');
document.body.appendChild(img);
```

### Fonts

```json
{
  "resources": ["fonts/custom-font.woff2"],
  "matches": ["https://*.example.com/*"]
}
```

```javascript
const style = document.createElement('style');
style.textContent = `
  @font-face {
    font-family: 'CustomFont';
    src: url(${chrome.runtime.getURL('fonts/custom-font.woff2')}) format('woff2');
  }
`;
document.head.appendChild(style);
```

### Stylesheets

```json
{
  "resources": ["css/injected.css"],
  "matches": ["https://*.example.com/*"]
}
```

```javascript
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = chrome.runtime.getURL('css/injected.css');
document.head.appendChild(link);
```

## Injecting UI Components from Extension Resources

### Shadow DOM Injection

```javascript
// content.js
async function injectExtensionUI() {
  const container = document.createElement('div');
  container.id = 'my-extension-root';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'closed' });

  // Load HTML template
  const response = await fetch(chrome.runtime.getURL('ui/panel.html'));
  const html = await response.text();

  // Load and inject CSS
  const cssResponse = await fetch(chrome.runtime.getURL('css/panel.css'));
  const css = await cssResponse.text();

  const style = document.createElement('style');
  style.textContent = css;

  shadow.appendChild(style);
  shadow.innerHTML += html;
}
```

### Inline Templates

```html
<!-- ui/panel.html -->
<template id="extension-panel-template">
  <style>
    :host {
      display: block;
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
    }
    .panel {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 16px;
    }
  </style>
  <div class="panel">
    <slot></slot>
  </div>
</template>
```

## Using Iframes with Extension Pages in Content Scripts

### Inline Iframe

```javascript
function createExtensionIframe() {
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('pages/popup.html');
  iframe.style.cssText = 'position:fixed;top:10px;right:10px;width:300px;height:400px;border:none;';
  document.body.appendChild(iframe);
}
```

### Communication with Iframe

```javascript
// content.js - Sending to iframe
const iframe = document.querySelector('#extension-iframe');
iframe.contentWindow.postMessage({ action: 'update' }, '*');

// content.js - Receiving from iframe
window.addEventListener('message', (event) => {
  if (event.source === iframe.contentWindow) {
    console.log('Message from iframe:', event.data);
  }
});
```

## Security Implications

### Risks of Exposed Resources

1. **Information Disclosure**: Sensitive data in resources can be exposed
2. **Fingerprinting**: Predictable resource URLs enable extension detection
3. **XSS via Resources**: If user input can influence resource loading

### Mitigation Strategies

```json
{
  "web_accessible_resources": [
    {
      "resources": ["public/*"],
      "matches": ["https://*.example.com/*"]
    },
    {
      "resources": ["sensitive/*"],
      "matches": ["https://example.com/admin/*"],
      "extension_ids": ["trusted-extension-id"]
    }
  ]
}
```

### Best Practices

- **Least Privilege**: Only expose resources that must be accessible
- **Use Dynamic URLs**: Enable `use_dynamic_url` when fingerprinting protection is needed
- **Restrict Matches**: Use specific URL patterns instead of `<all_urls>`
- **Validate Origins**: In content scripts, verify message origins

## Extension Fingerprinting Risks and Mitigation

### Fingerprinting Methods

Websites can detect extensions by:

1. Checking for known resource paths
2. Looking for extension-related DOM elements
3. Detecting injected iframes or scripts

### Protection with use_dynamic_url

```json
{
  "resources": ["images/*", "ui/*"],
  "matches": ["<all_urls>"],
  "use_dynamic_url": true
}
```

This makes resource URLs unpredictable and prevents:
- Static path fingerprinting
- Cache-based detection
- Known extension ID detection

## Reference

- [Web Accessible Resources - Chrome Extensions](https://developer.chrome.com/docs/extensions/develop/concepts/manifest/web-accessible-resources)
- [Manifest V3 - web_accessible_resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)
