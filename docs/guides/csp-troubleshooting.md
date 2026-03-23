---
layout: default
title: "Chrome Extension Content Security Policy Errors — Troubleshooting Guide"
description: "Resolve Content Security Policy (CSP) errors in Chrome extensions with this detailed troubleshooting guide covering common violations, manifest configuration, and workarounds."
canonical_url: "https://bestchromeextensions.com/guides/csp-troubleshooting/"
---

# Chrome Extension Content Security Policy Errors — Troubleshooting Guide

Content Security Policy (CSP) errors are among the most frustrating issues you'll encounter when developing Chrome extensions. These errors occur when your extension attempts to execute code or load resources that violate Chrome's security policies. This guide covers the most common CSP violations and proven solutions.

## Understanding CSP in Chrome Extensions

Chrome extensions operate under a strict Content Security Policy that's more restrictive than regular web pages. By default, extensions can only load scripts and styles from their own package—no external scripts unless explicitly permitted. This policy prevents malicious extensions from executing injected code but can block legitimate extension functionality.

The extension CSP differs from webpage CSP in several important ways. Extensions can declare their own CSP through the manifest.json file, but certain restrictions remain regardless of your configuration. Understanding these limitations is key to building compliant extensions.

## Common CSP Error Messages

### "Refused to execute inline script"

This error appears when your extension contains inline JavaScript—either in `<script>` tags within HTML files or as inline event handlers like `onclick="handleClick()"`.

**Error message example:**
```
Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self'".
```

**Solution:** Move all JavaScript to external files. Instead of inline scripts, use proper event listeners:

```html
<!-- Instead of inline handler -->
<button id="my-button" onclick="handleClick()">Click me</button>

<!-- Use external script -->
<button id="my-button">Click me</button>
<script src="popup.js"></script>
```

```javascript
// In popup.js
document.getElementById('my-button').addEventListener('click', handleClick);
```

### "Refused to load the script 'eval()'"

The use of `eval()` and similar functions that execute string as code is restricted.

**Error message example:**
```
Refused to evaluate a string as JavaScript because it's unsafe for an extension to evaluate a string as JavaScript.
```

**Solution:** Avoid eval(), Function(), setTimeout with string arguments, and similar dynamic code execution:

```javascript
// Instead of eval()
const result = eval('1 + 1'); // Bad

// Use JSON parsing
const data = JSON.parse('{"value": 1}'); // Good

// For dynamic function creation, use proper alternatives
const handler = new Function('a', 'b', 'return a + b');
```

### "Refused to load the script from 'http://example.com/script.js'"

Loading scripts from HTTP sources violates CSP. Extensions must use HTTPS or same-origin resources.

**Error message example:**
```
Refused to load the script 'http://example.com/script.js' because it violates the following Content Security Policy directive: "script-src 'self' https://example.com".
```

**Solution:** Use HTTPS for all external resources:

```javascript
// Use HTTPS
const script = document.createElement('script');
script.src = 'https://example.com/script.js'; // Not http://
document.head.appendChild(script);
```

Also ensure your manifest.json declares the permission:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content-script.js"],
    "run_at": "document_idle"
  }],
  "permissions": ["activeTab"],
  "host_permissions": ["https://example.com/*"]
}
```

### "Refused to load the image from 'http://...'"

Images from insecure sources are blocked similarly to scripts.

**Solution:** Use HTTPS images or embed images as base64 data URIs:

```javascript
// Option 1: Use HTTPS
const img = document.createElement('img');
img.src = 'https://example.com/image.png';

// Option 2: Use base64 encoded images
img.src = 'data:image/png;base64,iVBORw0KGgo...';
```

### "Refused to connect to 'api.example.com'"

Network requests to external domains require proper host permission declarations.

**Error message example:**
```
Refused to connect to 'https://api.example.com' because it violates the following Content Security Policy directive: "connect-src 'self' https://api.example.com".
```

**Solution:** Declare host permissions in manifest.json:

```json
{
  "host_permissions": [
    "https://api.example.com/*",
    "https://*.google.com/*"
  ]
}
```

For Manifest V3, you also need to declare permissions for the API calls:

```json
{
  "permissions": [
    "https://api.example.com/*"
  ]
}
```

### "Refused to frame 'https://example.com'"

Embedding external pages in iframes within extensions requires specific permissions.

**Solution:** Add the URL to host permissions and use appropriate framing:

```json
{
  "host_permissions": [
    "https://example.com/*"
  ]
}
```

Then in your extension HTML:

```html
<iframe src="https://example.com/page" allow="cross-origin-isolated"></iframe>
```

## Manifest Configuration for CSP

### Declaring Custom CSP

You can override the default CSP in your manifest:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'unsafe-inline' https://trusted.com; object-src 'self'",
    "content_scripts": "script-src 'self' 'unsafe-inline' https://trusted.com; object-src 'self'"
  }
}
```

However, 'unsafe-eval' and certain other directives are never allowed regardless of your CSP declaration.

### Manifest V3 CSP Restrictions

Manifest V3 enforces stricter CSP than V2. Key differences include:

- Cannot use 'unsafe-eval' in any context
- Service workers cannot use eval() or new Function()
- Content scripts inherit the page's CSP in addition to extension CSP

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

## Handling Dynamic Content

### User Scripts and eval()

If your extension needs to execute user-provided scripts, use the scripting API:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => {
    // This runs in the target page context
    console.log('Executing in page context');
  }
});
```

### Dynamic Code Loading

For extensions that must load code dynamically, use these approaches:

```javascript
// Using import for ES modules (Manifest V3)
import('/module.js').then(module => {
  module.run();
});

// Using chrome.scripting for content scripts
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content-script.js']
});
```

## Content Script CSP Considerations

Content scripts face unique CSP challenges because they run in the context of web pages, which have their own CSP.

### Page CSP vs Extension CSP

Content scripts must comply with both the extension CSP and the page's CSP. If a page has a restrictive CSP blocking external scripts, your content script cannot inject external scripts even with proper permissions.

**Solution:** Move the logic to the background script and communicate results back:

```javascript
// In content script - request data from background
chrome.runtime.sendMessage({ type: 'FETCH_DATA' }, (response) => {
  // Process response
});

// In background service worker - fetch and return data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_DATA') {
    fetch('https://api.example.com/data')
      .then(r => r.json())
      .then(data => sendResponse(data));
    return true;
  }
});
```

### Injecting Styles Safely

CSS injection through content scripts must follow CSP rules:

```javascript
// Create and inject stylesheet link
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = chrome.runtime.getURL('styles.css');
document.head.appendChild(link);

// Or use shadow DOM for style isolation
const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'open' });
shadow.innerHTML = '<style>.local-style { color: red; }</style>';
document.body.appendChild(host);
```

## Troubleshooting Checklist

When facing CSP errors, systematically work through these steps:

1. Identify the exact violation from the console error message
2. Determine whether the error originates in a popup, content script, or service worker
3. Check if you're using inline scripts—move them to external files
4. Verify all external URLs use HTTPS
5. Confirm host permissions are declared in manifest.json
6. For Manifest V3, check both "permissions" and "host_permissions"
7. If using eval() or new Function(), refactor to avoid dynamic code execution
8. For content scripts, consider whether the page CSP is blocking your code

## Advanced Workarounds

### Web Accessible Resources

When content scripts need to load extension resources that must be accessible from web pages:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/*", "styles/*.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

Then load resources using chrome.runtime.getURL:

```javascript
const img = document.createElement('img');
img.src = chrome.runtime.getURL('images/icon.png');
```

### Using Declarative Net Request

For modifications that require circumventing page CSP, use declarativeNetRequest:

```json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"]
}
```

This allows header modifications without direct script execution in page context.

## Best Practices for Avoiding CSP Issues

- Design with CSP restrictions in mind from the start
- Keep all code in external files
- Use HTTPS for all external resources
- Declare all required host permissions in manifest.json
- Test with Chrome's strict CSP settings enabled
- Avoid eval() and dynamic code execution patterns

By understanding CSP fundamentals and following these troubleshooting steps, you can resolve most Content Security Policy errors in your Chrome extensions. Remember that CSP exists to protect users—working within its constraints makes your extension more secure.
