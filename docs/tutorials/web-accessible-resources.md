---
layout: default
title: "Web Accessible Resources in Chrome Extensions. Tutorial"
description: "Learn how to use web accessible resources in Chrome Extensions to inject UI, load assets, and secure your extension in Manifest V3."
canonical_url: "https://bestchromeextensions.com/tutorials/web-accessible-resources/"
---

# Web Accessible Resources in Chrome Extensions

Web Accessible Resources are a fundamental feature of Chrome Extensions that allow your extension's files to be loaded and used in contexts outside the extension itself. specifically in web pages and content scripts. This tutorial covers everything you need to know to use them effectively in Manifest V3.

What You'll Learn

- What web accessible resources are and why they're needed
- How to configure `web_accessible_resources` in your manifest
- Using `use_dynamic_url` for fingerprinting protection
- Accessing resources from content scripts and web pages
- Security implications and best practices
- Common patterns for injecting UI and loading assets
- Key differences between Manifest V2 and V3

---

What Are Web Accessible Resources?

By default, Chrome extensions are sandboxed. their files cannot be accessed by external web pages. Web Accessible Resources provide a controlled way to expose specific extension files to:

- Content scripts that need to inject UI elements into web pages
- Web pages that you want to allow access to certain assets
- Other extensions that need to share resources

Common use cases include:

- Injecting floating toolbars or sidebars into web pages
- Loading custom fonts or stylesheets on specific websites
- Displaying extension icons or images in injected UI
- Creating iframed extension pages within web content

---

Manifest Configuration

Basic Manifest V3 Setup

In Manifest V3, you declare web accessible resources as an array of objects, each with `resources` and `matches` properties:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "web_accessible_resources": [
    {
      "resources": ["images/*", "fonts/*.woff2", "ui/*.html"],
      "matches": ["https://*.example.com/*"]
    }
  ]
}
```

Each entry contains:

| Property | Description |
|----------|-------------|
| `resources` | Array of paths relative to the extension root. Supports wildcards (`*`) |
| `matches` | URL patterns that can access these resources |
| `extension_ids` | (Optional) Specific extension IDs that can access the resources |

Matching Patterns

The `matches` property uses the same pattern syntax as content scripts:

| Pattern | Description |
|---------|-------------|
| `<all_urls>` | Accessible from any URL |
| `https://*.example.com/*` | Any subdomain of example.com |
| `https://example.com/path/*` | Specific path and below |
| `https://*/*` | Any HTTPS page |

Restricting to Specific Extensions

You can limit access to your resources to specific extensions using `extension_ids`:

```json
{
  "resources": ["shared/*"],
  "matches": ["<all_urls>"],
  "extension_ids": ["abcdefghijklmnopqrstuvwxyz012345", "another-extension-id"]
}
```

---

use_dynamic_url for Fingerprinting Protection

One of the most important features in Manifest V3 is `use_dynamic_url`. This property generates unique, non-predictable URLs for each resource, preventing websites from detecting your extension through known resource paths.

Enabling Dynamic URLs

```json
{
  "resources": ["images/logo.png", "ui/panel.html"],
  "matches": ["<all_urls>"],
  "use_dynamic_url": true
}
```

How It Works

Instead of predictable URLs like:
```
chrome-extension://extension-id/images/logo.png
```

Dynamic URLs change per session or navigation:
```
chrome-extension://extension-id/12345678/images/logo.png
```

Why It Matters

Without dynamic URLs, websites can detect your extension by:

1. Checking for known resource paths in the DOM
2. Using cache-based detection
3. Fingerprinting based on your extension ID

Dynamic URLs prevent all of these detection methods, improving user privacy and reducing the risk of websites blocking your extension.

---

Accessing Resources from Content Scripts

Content scripts can easily access extension resources using `chrome.runtime.getURL()`:

```javascript
// content.js
const iconUrl = chrome.runtime.getURL('images/icon.png');
const styleUrl = chrome.runtime.getURL('css/injected.css');

// Create and inject an image
const img = document.createElement('img');
img.src = iconUrl;
document.body.appendChild(img);

// Inject a stylesheet
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = styleUrl;
document.head.appendChild(link);
```

Loading Resources Dynamically

For larger resources like HTML templates or complex UI:

```javascript
// content.js
async function loadExtensionUI() {
  // Load HTML template
  const response = await fetch(chrome.runtime.getURL('ui/panel.html'));
  const html = await response.text();

  // Load CSS
  const cssResponse = await fetch(chrome.runtime.getURL('css/panel.css'));
  const css = await cssResponse.text();

  // Create container with Shadow DOM
  const container = document.createElement('div');
  container.id = 'my-extension-root';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'closed' });

  // Add styles
  const style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  // Add HTML content
  shadow.innerHTML = html;
}
```

---

Accessing Resources from Web Pages

Web pages can only access your extension's resources if:

1. The resources are declared in `web_accessible_resources`
2. The page URL matches the declared patterns

```javascript
// From an allowed web page
const img = document.createElement('img');
img.src = 'chrome-extension://YOUR_EXTENSION_ID/images/logo.png';
document.body.appendChild(img);
```

Web pages cannot discover your extension ID on their own. they need to be explicitly told the URL or you need to inject the resource through a content script.

---

Common Patterns

Injecting a Floating UI Panel

This pattern creates a floating panel that persists across page navigation:

```javascript
// content.js
function createFloatingPanel() {
  const container = document.createElement('div');
  container.id = 'extension-panel-container';
  container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'closed' });

  // Build the UI
  shadow.innerHTML = `
    <style>
      .panel {
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 16px;
        font-family: system-ui, sans-serif;
      }
      .close-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        cursor: pointer;
      }
    </style>
    <div class="panel">
      <span class="close-btn"></span>
      <h3>Extension Panel</h3>
      <p>Content here</p>
    </div>
  `;

  // Handle close button
  shadow.querySelector('.close-btn').addEventListener('click', () => {
    container.remove();
  });
}

// Initialize
if (!document.getElementById('extension-panel-container')) {
  createFloatingPanel();
}
```

Loading Custom Fonts

```json
{
  "resources": ["fonts/custom-font.woff2"],
  "matches": ["https://*.example.com/*"]
}
```

```javascript
// content.js
function loadCustomFont() {
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'CustomFont';
      src: url(${chrome.runtime.getURL('fonts/custom-font.woff2')}) format('woff2');
    }
  `;
  document.head.appendChild(style);
}
```

Using Iframes for Extension Pages

```javascript
// content.js
function createExtensionIframe() {
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('pages/popup.html');
  iframe.style.cssText = 'position:fixed;top:10px;right:10px;width:300px;height:400px;border:none;z-index:999999;';
  document.body.appendChild(iframe);
}
```

---

Security Implications

Potential Risks

1. Information Disclosure: Sensitive data in exposed resources can be accessed by any matching page
2. Extension Fingerprinting: Predictable URLs allow websites to detect your extension
3. XSS Vulnerabilities: If user input influences resource loading

Best Practices

#### 1. Follow Least Privilege

Only expose resources that must be accessible:

```json
// Good: Specific resources for specific sites
{
  "resources": ["images/logo.png", "css/injected.css"],
  "matches": ["https://example.com/*"]
}

// Avoid: Overly permissive
{
  "resources": ["*"],
  "matches": ["<all_urls>"]
}
```

#### 2. Use Dynamic URLs

Always enable `use_dynamic_url` when fingerprinting protection is needed:

```json
{
  "resources": ["ui/*", "images/*"],
  "matches": ["<all_urls>"],
  "use_dynamic_url": true
}
```

#### 3. Restrict Match Patterns

Use specific URL patterns instead of `<all_urls>` when possible:

```json
{
  "resources": ["admin-panel/*"],
  "matches": ["https://example.com/admin/*"]
}
```

#### 4. Validate Origins in Communication

When your content script communicates with web pages:

```javascript
// Only accept messages from allowed origins
window.addEventListener('message', (event) => {
  if (event.origin === 'https://trusted-site.com') {
    // Process message
  }
});
```

---

Manifest V2 vs V3 Differences

Key Changes

| Feature | Manifest V2 | Manifest V3 |
|---------|-------------|-------------|
| Format | Simple array | Array of objects with matches |
| Default access | All pages | Must specify matches |
| Dynamic URLs | Not available | `use_dynamic_url` property |
| Extension IDs | Predictable | Can be randomized |

MV2 Example

```json
{
  "manifest_version": 2,
  "web_accessible_resources": [
    "images/*",
    "fonts/*.woff2",
    "ui/*.html"
  ]
}
```

In MV2, resources are accessible from any web page by default. MV3 requires explicit `matches` patterns for security.

Migration Checklist

When migrating from MV2 to MV3:

1. Convert `web_accessible_resources` from array to object format
2. Add `matches` patterns for each resource group
3. Consider enabling `use_dynamic_url` for fingerprinting protection
4. Update content scripts to handle the new URL format
5. Test resource loading on all target pages

---

Summary

Web Accessible Resources are essential for building Chrome Extensions that interact with web pages. Key takeaways:

- Use `web_accessible_resources` in your manifest to expose extension files
- Always specify `matches` patterns to limit access to trusted sites
- Enable `use_dynamic_url` to protect against extension fingerprinting
- Access resources in content scripts using `chrome.runtime.getURL()`
- Follow security best practices: least privilege, specific patterns, validate origins
- Understand the MV2 to MV3 changes when migrating your extension

---

Related Articles

- [Content Script Injection](/docs/guides/content-script-injection/). Learn different methods for injecting content scripts and UI into web pages
- [Manifest V3 Fields Reference](/docs/guides/manifest-v3-fields/). Complete reference for all Manifest V3 configuration options
- [Security Best Practices](/docs/guides/security-best-practices/). Essential security guidelines for Chrome Extensions

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
