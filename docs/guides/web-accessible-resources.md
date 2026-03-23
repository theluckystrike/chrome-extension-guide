# Web Accessible Resources

## Overview

Web Accessible Resources allow extension resources to be accessible from web pages and content scripts. This is essential for injecting UI components, loading extension assets in web pages, and enabling fingerprinting protection through dynamic URLs.

## Declaring web_accessible_resources in Manifest

In Manifest V3, declare resources in `manifest.json`:
---
layout: default
title: "Chrome Extension Web Accessible Resources. How to Share Files with Web Pages"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/web-accessible-resources/"
---

# Chrome Extension Web Accessible Resources. How to Share Files with Web Pages

Web Accessible Resources (WAR) is a critical manifest configuration in Chrome Extensions that determines which extension files can be loaded by web pages. This mechanism bridges the gap between your extension's bundled resources and the broader web ecosystem, enabling powerful use cases while maintaining security boundaries.

Understanding web_accessible_resources in Manifest V3

The `web_accessible_resources` manifest field declares which files within your extension can be accessed by external web pages. In Manifest V3, this configuration is more structured than ever, requiring explicit declaration of both the resources and the contexts that can access them.

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
      "resources": ["images/*.png", "fonts/*.woff2"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

Manifest V2 Differences

MV2 uses a simpler array format:
Each entry in the `web_accessible_resources` array contains two key properties: `resources` specifies the file patterns (using glob patterns), and `matches` defines which web pages can access those resources. This granular approach replaces the simpler array format from Manifest V2, giving developers precise control over resource accessibility.

Key Changes from Manifest V2

In Manifest V2, `web_accessible_resources` was a simple array of file paths. Manifest V3 introduces a more sophisticated structure that requires explicit match patterns. This change addresses long-standing security concerns about extensions inadvertently exposing internal resources to malicious websites. When migrating from MV2 to MV3, you must review and update this configuration to ensure your extension continues functioning correctly.

Using extension:// URLs

Once configured, web-accessible resources are accessed through special `extension://` URLs. These URLs follow a predictable pattern that includes your extension's unique ID:

```javascript
// Constructing extension:// URLs in content scripts
const iconUrl = chrome.runtime.getURL('images/icon.png');

// Using in CSS
document.body.style.backgroundImage = `url(${chrome.runtime.getURL('images/background.jpg')})`;

// Referencing in HTML
const img = document.createElement('img');
img.src = chrome.runtime.getURL('images/logo.png');
document.body.appendChild(img);
```

The `chrome.runtime.getURL()` method is the recommended way to generate these URLs, as it automatically handles your extension's ID and ensures correct URL formatting. This method is available in both content scripts and background scripts, making it versatile for various extension components.

The use_dynamic_url Feature

Chrome 120+ introduced the `use_dynamic_url` property, adding another layer of security to web-accessible resources. When enabled, this feature changes the URL format for resources each time the extension updates, preventing websites from hardcoding and relying on specific extension resource URLs.

```json
{
  "web_accessible_resources": [
    "images/*",
    "fonts/*.woff2",
    "ui/*.html"
    {
      "resources": ["secure-data/*"],
      "matches": ["https://trusted-site.com/*"],
      "use_dynamic_url": true
    }
  ]
}
```

MV2 resources are accessible from any page by default, while MV3 requires explicit `matches` patterns.

Resource Matching: matches and extension_ids

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

use_dynamic_url for Fingerprinting Protection

The `use_dynamic_url` property generates unique, non-predictable URLs for each resource, preventing fingerprinting:

```json
{
  "resources": ["images/logo.png"],
  "matches": ["https://*.example.com/*"],
  "use_dynamic_url": true
}
```

How Dynamic URLs Work

Instead of predictable URLs like:
```
chrome-extension://extension-id/images/logo.png
```

Dynamic URLs change per session or navigation:
```
chrome-extension://extension-id/12345678/images/logo.png
```

This prevents websites from detecting your extension by checking for known resource paths.

Accessing Resources from Content Scripts

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

Accessing Resources from Web Pages

Web pages can only access resources if they're declared with matching patterns:

```javascript
// From a web page (if allowed by manifest)
const img = document.createElement('img');
img.src = 'chrome-extension://EXTENSION_ID/images/logo.png';
```

Web pages cannot determine your extension ID or access resources without explicit declaration.

Dynamic Resource Access Patterns

Loading Resources on Demand

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

Caching Behavior

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

Images, Fonts, and Stylesheets as Web Accessible Resources

Images

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

Fonts

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
With `use_dynamic_url: true`, the extension URL changes after each update. This is particularly useful for:
- Preventing URL-based caching of dynamic content
- Protecting against website attempts to fingerprint extension resources
- Ensuring websites always fetch the latest version of resources

The dynamic URL follows the pattern: `chrome-extension://<dynamic-id>/path/to/resource`, where the ID changes with each extension update.

Security Implications

Exposing extension resources to the web introduces potential security risks that must be carefully considered. Understanding these implications helps you make informed decisions about what to expose and to whom.

Risks of Over-Exposure

Declaring `<all_urls>` as the match pattern for sensitive resources can expose internal extension files to any website. This includes:
- Potentially revealing proprietary code or data
- Enabling website fingerprinting of your extension
- Creating vectors for information disclosure attacks

Best Practices

Follow these security guidelines when configuring web-accessible resources:

1. Limit to specific domains: Instead of `<all_urls>`, use specific domain patterns like `https://trusted-app.com/*` whenever possible.

2. Restrict file types: Only expose resources that genuinely need to be accessible. Avoid exposing JavaScript files unless absolutely necessary.

3. Validate request origins: If your resources are accessed dynamically, implement origin checking in your extension logic.

4. Consider using chrome.runtime.sendMessage: For sensitive data, consider message-based communication instead of direct resource access.

Serving Images and Fonts

One of the most common use cases for web-accessible resources is serving images and fonts to web pages. This enables extensions to enhance web content with custom visual assets.

Image Serving

```javascript
// In content script - setting custom icons on web pages
function setCustomIcon(element, iconName) {
  const iconUrl = chrome.runtime.getURL(`icons/${iconName}.png`);
  element.style.backgroundImage = `url('${iconUrl}')`;
}

// Using Data URLs for smaller images
async function getIconAsDataUrl(iconPath) {
  const response = await fetch(chrome.runtime.getURL(iconPath));
  const blob = await response.blob();
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
```

Font Serving

```json
{
  "web_accessible_resources": [
    {
      "resources": ["fonts/custom-font.woff2"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

```css
/* In content script - inject custom font styles */
const style = document.createElement('style');
style.textContent = `
  @font-face {
    font-family: 'CustomExtensionFont';
    src: url('${chrome.runtime.getURL('fonts/custom-font.woff2')}') format('woff2');
  }
  .custom-font {
    font-family: 'CustomExtensionFont', sans-serif;
  }
`;
document.head.appendChild(style);
```

Stylesheets

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

Injecting UI Components from Extension Resources

Shadow DOM Injection

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

Inline Templates

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

Using Iframes with Extension Pages in Content Scripts

Inline Iframe

```javascript
function createExtensionIframe() {
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('pages/popup.html');
  iframe.style.cssText = 'position:fixed;top:10px;right:10px;width:300px;height:400px;border:none;';
  document.body.appendChild(iframe);
}
```

Communication with Iframe

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

Security Implications

Risks of Exposed Resources

1. Information Disclosure: Sensitive data in resources can be exposed
2. Fingerprinting: Predictable resource URLs enable extension detection
3. XSS via Resources: If user input can influence resource loading

Mitigation Strategies

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

Best Practices

- Least Privilege: Only expose resources that must be accessible
- Use Dynamic URLs: Enable `use_dynamic_url` when fingerprinting protection is needed
- Restrict Matches: Use specific URL patterns instead of `<all_urls>`
- Validate Origins: In content scripts, verify message origins

Extension Fingerprinting Risks and Mitigation

Fingerprinting Methods

Websites can detect extensions by:

1. Checking for known resource paths
2. Looking for extension-related DOM elements
3. Detecting injected iframes or scripts

Protection with use_dynamic_url

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

Reference

- [Web Accessible Resources - Chrome Extensions](https://developer.chrome.com/docs/extensions/develop/concepts/manifest/web-accessible-resources)
- [Manifest V3 - web_accessible_resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)
Common Use Cases

Web-accessible resources power several important extension functionalities:

- Content script styling: Injecting extension-controlled images into web pages
- Dynamic theming: Allowing web applications to use extension-bundled assets
- Font enhancements: Providing custom fonts for web page typography
- Data visualization: Serving chart assets or image sprites to web content
- Icon systems: Exposing icon libraries for consistent visual presentation

Conclusion

Web Accessible Resources provide essential functionality for Chrome extensions that need to share assets with web pages. By understanding the Manifest V3 configuration, leveraging `use_dynamic_url` for enhanced security, and following best practices, you can effectively implement resource sharing while minimizing security risks. Always audit your `web_accessible_resources` configuration regularly to ensure it follows the principle of least privilege.
