---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Comprehensive guide to preventing cross-site scripting (XSS) vulnerabilities in Chrome extensions. Learn about extension-specific XSS vectors, DOMPurify integration, Trusted Types API, message passing sanitization, and security best practices."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) remains one of the most critical security vulnerabilities in web applications, and Chrome extensions are particularly susceptible due to their privileged access to browser APIs and web page content. Unlike traditional web applications, extensions operate across multiple contexts—background service workers, content scripts, popups, options pages, and side panels—each presenting unique attack surfaces. This guide provides comprehensive strategies for preventing XSS vulnerabilities in Chrome extensions, covering extension-specific attack vectors, modern sanitization libraries, security APIs, and automated testing approaches.

## Table of Contents

- [Understanding Extension-Specific XSS Vectors](#understanding-extension-specific-xss-vectors)
- [The Dangers of innerHTML and Unsafe DOM Manipulation](#the-dangers-of-innerhtml-and-unsafe-dom-manipulation)
- [DOMPurify Integration for Robust Sanitization](#dompurify-integration-for-robust-sanitization)
- [The Trusted Types API](#the-trusted-types-api)
- [Message Passing and Cross-Context Sanitization](#message-passing-and-cross-context-sanitization)
- [Content Script Injection Risks](#content-script-injection-risks)
- [Popup and Options Page Security](#popup-and-options-page-security)
- [Content Security Policy as a Defense Layer](#content-security-policy-as-a-defense-layer)
- [The Sanitizer API](#the-sanitizer-api)
- [Automated Security Scanning](#automated-security-scanning)
- [OWASP for Chrome Extensions](#owasp-for-chrome-extensions)

---

## Understanding Extension-Specific XSS Vectors

Chrome extensions face XSS risks that differ significantly from standard web applications. The primary vectors include injection through web page content, message passing between extension contexts, storage APIs, and external data sources.

**DOM-Based XSS in Content Scripts** occurs when extensions read data from web pages and render it without proper sanitization. A common pattern involves extracting text from page elements and displaying it in the extension's UI:

```javascript
// DANGEROUS: Directly inserting page content without sanitization
function displayPageTitle() {
  const title = document.querySelector('h1')?.textContent;
  document.getElementById('output').innerHTML = `Page title: ${title}`;
}
```

If a malicious website contains `<h1><img src=x onerror=alert('XSS')></h1>`, this script would execute arbitrary JavaScript in the extension's context.

**Storage-Based XSS** emerges when extensions persist data that later gets rendered without sanitization. Extensions frequently store user preferences, cached data, or information from external APIs. When this data is retrieved and inserted into the DOM, it becomes a potential XSS vector:

```javascript
// Storing and later rendering user data unsafely
chrome.storage.local.set({ userData: userInput });
// Later...
document.getElementById('display').innerHTML = data.userData;
```

**Message Passing XSS** occurs in the communication channel between extension contexts. Content scripts often receive messages from web pages or background scripts and render them without validation:

```javascript
// Content script receiving unsafe messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  document.getElementById('container').innerHTML = message.content;
});
```

---

## The Dangers of innerHTML and Unsafe DOM Manipulation

The `innerHTML` property is the most common source of XSS vulnerabilities in extensions. When you set `innerHTML`, the browser parses the string as HTML, executing any embedded scripts. This behavior makes it inherently dangerous for user-controlled content.

**Understanding the Risk**: Every string assigned to `innerHTML` undergoes HTML parsing, which means `<script>` tags, event handlers like `onload`, `onerror`, or `onmouseover`, and SVG elements with embedded scripts all execute:

```javascript
// These all execute JavaScript
element.innerHTML = '<script>alert("XSS")</script>';
element.innerHTML = '<img src=x onerror=alert("XSS")>';
element.innerHTML = '<svg onload=alert("XSS")>';
```

**Safer Alternatives** include `textContent` for text-only content, `innerText` for visually rendered text, and `document.createTextNode()`:

```javascript
// SAFE: Using textContent for plain text
element.textContent = userInput;

// SAFE: Creating text nodes explicitly
const textNode = document.createTextNode(userInput);
element.appendChild(textNode);

// SAFE: Using template literals with textContent
element.textContent = `User input: ${userInput}`;
```

When HTML rendering is necessary, proper sanitization becomes essential. The next section covers DOMPurify, the industry-standard solution for this purpose.

---

## DOMPurify Integration for Robust Sanitization

[DOMPurify](https://github.com/cure53/DOMPurify) is a comprehensive, security-focused HTML sanitizer that removes dangerous code while preserving safe markup. It's the recommended solution for Chrome extensions handling untrusted content.

### Installation and Basic Usage

Install DOMPurify via npm or include it directly in your extension:

```bash
npm install dompurify
```

For extensions without a build process, use the minified CDN version with careful CSP configuration:

```html
<script src="dompurify/dist/purify.min.js"></script>
```

### Core Sanitization Patterns

**Sanitizing HTML Strings**:

```javascript
import DOMPurify from 'dompurify';

// Basic sanitization
const clean = DOMPurify.sanitize(dirtyHTML);
element.innerHTML = clean;

// With custom configuration
const cleanHTML = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOW_DATA_ATTR: false
});
```

**Sanitizing in Content Scripts**: Content scripts operate in a special environment. DOMPurify must be loaded as a module or inline script:

```javascript
// content-script.js
import DOMPurify from 'dompurify';

function displaySafeContent(htmlContent) {
  const sanitized = DOMPurify.sanitize(htmlContent, {
    RETURN_DOM: false,
    RETURN_TRUSTED_TYPE: true  // Works with Trusted Types
  });
  return sanitized;
}

// Apply to DOM safely
const container = document.getElementById('extension-container');
container.innerHTML = displaySafeContent(pageContent);
```

**Configuring Allowlists**: Tailor DOMPurify's behavior to your extension's needs:

```javascript
const config = {
  // Only allow these tags
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
  // Only allow these attributes
  ALLOWED_ATTR: ['href', 'class', 'target'],
  // Disallow data URIs in links
  ALLOW_DATA_ATTR: false,
  // Add rel="noopener" to links with target="_blank"
  ADD_ATTR: ['rel'],
  // Custom hook for additional processing
  hooks: {
    afterSanitizeAttributes: (node) => {
      if (node.tagName === 'A' && node.target === '_blank') {
        node.rel = 'noopener noreferrer';
      }
    }
  }
};
```

---

## The Trusted Types API

Trusted Types provide a modern, browser-enforced mechanism for preventing DOM XSS. By creating policies that return TrustedHTML, TrustedScript, or TrustedScriptURL objects, developers can ensure that only sanitized content enters the DOM.

### Enabling Trusted Types

Add the HTTP header or meta tag to enable Trusted Types:

```html
<!-- In popup.html, options.html, or extension pages -->
<meta http-equiv="Content-Security-Policy" content="trusted-types default">
```

### Creating a Sanitization Policy

```javascript
// Create a Trusted Types policy
const sanitizerPolicy = trustedTypes.createPolicy('sanitizer', {
  createHTML: (input) => DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  }),
  createScript: (input) => {
    // Reject all scripts by returning empty string
    console.warn('Script creation blocked');
    return '';
  }
});

// Using the policy
const trusted = sanitizerPolicy.createHTML(userInput);
document.getElementById('output').innerHTML = trusted; // Only works with trusted types
```

### Integration with DOMPurify

DOMPurify supports returning TrustedHTML when the `RETURN_TRUSTED_TYPE` option is enabled:

```javascript
const clean = DOMPurify.sanitize(input, {
  RETURN_TRUSTED_TYPE: true
});
// clean is a TrustedHTML object, safe to assign to innerHTML
element.innerHTML = clean;
```

This integration provides defense-in-depth: even if a vulnerability exists in your sanitization logic, Trusted Types prevent unsafe assignments in supported browsers.

---

## Message Passing and Cross-Context Sanitization

Chrome extensions communicate across multiple contexts using message passing. Every message from untrusted sources—particularly content scripts receiving data from web pages—must be sanitized before rendering.

### Secure Message Handling

```javascript
// Content script: Receiving messages from background or page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ALWAYS sanitize incoming data
  if (message.type === 'display') {
    const sanitized = DOMPurify.sanitize(message.content);
    document.getElementById('container').innerHTML = sanitized;
  }
});

// Background script: Validating data before sending
function sendToContentScript(tabId, data) {
  // Sanitize in the sender context
  const clean = DOMPurify.sanitize(data.content);
  chrome.tabs.sendMessage(tabId, { type: 'display', content: clean });
}
```

### Type-Safe Message Validation

Implement strict type checking for messages:

```javascript
// Define message schemas
const MessageSchema = {
  display: {
    content: 'string',
    source: ['background', 'popup', 'content']
  },
  action: {
    command: 'string',
    args: 'array'
  }
};

function validateMessage(message) {
  const schema = MessageSchema[message.type];
  if (!schema) return false;

  for (const [key, expectedType] of Object.entries(schema)) {
    if (typeof message[key] !== expectedType) {
      console.error(`Invalid type for ${key}: expected ${expectedType}`);
      return false;
    }
  }
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!validateMessage(message)) {
    sendResponse({ error: 'Invalid message format' });
    return;
  }
  // Process validated message
});
```

---

## Content Script Injection Risks

Content scripts run in the context of web pages, making them particularly vulnerable to page-level attacks. Malicious pages can exploit the shared DOM to inject data into your extension's content scripts.

### Understanding the Attack Surface

Content scripts share the DOM with page scripts but have additional privileges. A malicious page can:

1. Inject content into elements your script reads
2. Intercept messages between your script and the background
3. Exploit timing vulnerabilities in your script's initialization

### Defensive Strategies

**Read DOM Elements Safely**:

```javascript
// SAFE: Use textContent to read values
const titleElement = document.querySelector('.page-title');
const safeTitle = titleElement?.textContent || 'Default Title';
// Now safeTitle contains only text, no HTML

// If you must use innerHTML for reading, sanitize immediately
const htmlContent = document.querySelector('.content').innerHTML;
const safeContent = DOMPurify.sanitize(htmlContent);
```

**Avoid Executing Page Scripts**: Content scripts can inadvertently trigger page-level scripts:

```javascript
// DANGEROUS: document.write() from page context can execute page scripts
document.write(userInput);

// SAFE: Use createElement/appendChild instead
const div = document.createElement('div');
div.textContent = userInput;
document.body.appendChild(div);
```

**Isolate Extension Context**: Use iframe sandboxing for rendering untrusted content:

```javascript
function createSandboxedFrame(content) {
  const iframe = document.createElement('iframe');
  iframe.sandbox = 'allow-same-origin'; // No scripts, limited capabilities
  iframe.srcdoc = DOMPurify.sanitize(content);
  document.body.appendChild(iframe);
  return iframe;
}
```

---

## Popup and Options Page Security

Extension popups and options pages are HTML documents served from the extension's origin. They face unique risks from stored data, message passing, and user input.

### Securing Popup Interactions

```javascript
// popup.js - Safe data rendering
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get('userData');

  // Always sanitize before rendering
  const displayElement = document.getElementById('user-data');
  if (data.userData) {
    displayElement.textContent = data.userData; // Plain text, safe
  }
});

// For HTML content in popups
function displayRichContent(html) {
  const sanitized = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'], // If you need iframe support
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'sandbox']
  });
  document.getElementById('rich-container').innerHTML = sanitized;
}
```

### Input Validation in Options Pages

```javascript
// options.js - Validate all user inputs
document.getElementById('save-settings').addEventListener('click', () => {
  const apiKey = document.getElementById('api-key').value.trim();

  // Validate format
  if (!/^[a-zA-Z0-9_-]{32,}$/.test(apiKey)) {
    alert('Invalid API key format');
    return;
  }

  // Sanitize before storage
  const cleanKey = DOMPurify.sanitize(apiKey);
  chrome.storage.local.set({ apiKey: cleanKey });
});
```

---

## Content Security Policy as a Defense Layer

Content Security Policy (CSP) provides a critical defense-in-depth layer. For Chrome extensions, configure CSP in the manifest and individual HTML pages. See the [Chrome Extension CSP Guide](/chrome-extension-guide/guides/chrome-extension-content-security-policy/) for detailed configuration.

### Recommended CSP for Extensions

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
  }
}
```

### Strict CSP with Nonces

For high-security extensions, implement nonce-based script execution:

```html
<meta http-equiv="Content-Security-Policy" content="
  script-src 'nonce-{NONCE}';
  style-src 'self' 'nonce-{NONCE}';
  object-src 'none';
">
```

Generate nonces server-side or in the service worker for each page request.

---

## The Sanitizer API

The [Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/Sanitizer_API) is a browser-native solution for safely rendering HTML. Currently supported in Chrome and Edge, it provides built-in sanitization without external dependencies.

### Basic Usage

```javascript
const sanitizer = new Sanitizer();

// Sanitize HTML string
const clean = sanitizer.sanitizeFor('div', '<img src=x onerror=alert(1)>');
// Result: <div></div> - dangerous elements removed

// Parse HTML into DOM
document.getElementById('container').replaceChildren(sanitizer.sanitizeFor('div', userHTML));
```

### Configuration Options

```javascript
const customSanitizer = new Sanitizer({
  allowElements: ['p', 'br', 'b', 'i', 'strong', 'em', 'a'],
  allowAttributes: {
    'href': ['a'],
    'target': ['a'],
    'rel': ['a']
  },
  allowStyles: [], // Disallow all style attributes
  dropElements: ['script', 'iframe', 'object', 'embed']
});
```

The Sanitizer API provides a standardized, dependency-free approach that integrates well with modern extension development.

---

## Automated Security Scanning

Regular security scanning helps identify XSS vulnerabilities before deployment. Implement both static analysis and dynamic testing in your development workflow.

### Static Analysis with eslint-plugin-security

```bash
npm install --save-dev eslint-plugin-security
```

Configure rules that catch common XSS patterns:

```json
{
  "plugins": ["security"],
  "rules": {
    "security/detect-unsafe-regex": "error",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-non-literal-regexp": "error",
    "security/detect-non-literal-constructor": "error"
  }
}
```

### Dynamic Security Testing

Use Playwright to test for XSS vulnerabilities in your extension:

```javascript
// test-xss.js
const { test, expect } = require('@playwright/test');

test('XSS attempt in popup is neutralized', async ({ page }) => {
  // Load extension
  await page.goto('chrome-extension://' + extensionId + '/popup.html');

  // Inject test payload
  await page.evaluate(() => {
    localStorage.setItem('test', '<img src=x onerror=alert(1)>');
  });

  // Reload and check for alerts
  let alertTriggered = false;
  page.on('dialog', async dialog => {
    alertTriggered = true;
    await dialog.dismiss();
  });

  await page.reload();

  // Verify no XSS executed
  expect(alertTriggered).toBe(false);
});
```

### Dependency Scanning

Use npm audit and Snyk to identify vulnerabilities in dependencies:

```bash
npm audit
npm install -g snyk
snyk test
```

---

## OWASP for Chrome Extensions

The OWASP Foundation provides security guidance applicable to Chrome extensions. Key resources include the [OWASP Top 10](https://owasp.org/www-project-top-ten/) and the [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/).

### Applying OWASP to Extensions

**A01:2021 – Broken Access Control**: Ensure content scripts cannot access extension APIs beyond what's explicitly permitted. Use `chrome.runtime.getManifest().permissions` to verify capabilities.

**A03:2021 – Injection**: Apply the sanitization strategies outlined in this guide. Never trust data from web pages, storage, or external APIs without validation.

**A04:2021 – Insecure Design**: Implement security considerations early in development. Review the [Chrome Extension Security Hardening Guide](/chrome-extension-guide/guides/chrome-extension-security-hardening/) for architectural patterns.

### Security Checklist

- [ ] All user input sanitized with DOMPurify or Sanitizer API
- [ ] innerHTML replaced with textContent where possible
- [ ] CSP configured with strict policies
- [ ] Trusted Types implemented where supported
- [ ] Message passing includes input validation
- [ ] Content scripts read DOM values safely
- [ ] Automated security scans in CI/CD pipeline
- [ ] Regular dependency vulnerability checks

---

## Conclusion

XSS prevention in Chrome extensions requires a multi-layered approach combining secure coding practices, proper sanitization libraries, browser security features, and automated testing. By understanding extension-specific attack vectors, implementing DOMPurify for HTML sanitization, leveraging Trusted Types and the Sanitizer API, and maintaining robust CSP policies, you can significantly reduce the attack surface of your extension.

Security is an ongoing process. Regularly review the [Security Best Practices](/chrome-extension-guide/guides/security-best-practices/) and perform security audits using the techniques described in this guide. For comprehensive extension security guidance, refer to the [Chrome Extension Security Checklist](/chrome-extension-guide/guides/chrome-extension-security-checklist/).

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
