---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Comprehensive guide to XSS prevention in Chrome extensions covering DOMPurify integration, Trusted Types API, message passing sanitization, content script injection risks, and modern defense strategies."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) remains one of the most dangerous and prevalent security vulnerabilities in Chrome extensions. Unlike web applications, extensions operate with elevated privileges, access to sensitive browser APIs, and often handle confidential user data. A single XSS vulnerability in an extension can compromise not only the extension itself but also the pages users visit, making these vulnerabilities particularly severe. This guide provides comprehensive coverage of XSS prevention techniques specific to Chrome extensions, from understanding extension-specific attack vectors to implementing defense-in-depth strategies using modern APIs and best practices.

Chrome extensions face unique XSS challenges that differ significantly from traditional web applications. Understanding these distinctions is essential for building secure extensions that protect users from malicious actors.

## Extension-Specific XSS Vectors

Chrome extensions introduce several unique attack vectors that developers must understand to build secure applications. Unlike standard web pages, extensions have access to powerful APIs, can execute code in multiple contexts, and often communicate between components using message passing systems.

### The Content Script Dilemma

Content scripts represent the most significant XSS attack surface in Chrome extensions. These scripts run in the context of web pages, meaning they inherit all the vulnerabilities of those pages while also introducing new ones. When your content script interacts with the page's DOM, any user-controlled data that flows into that DOM becomes a potential XSS vector. This is particularly dangerous because content scripts have access to the `chrome.*` APIs, which often include sensitive permissions like cookies, tabs, and storage.

The fundamental problem stems from the dual nature of content scripts—they must work with untrusted web page content while also protecting the extension's privileged capabilities. Attackers can exploit this by crafting malicious web pages that trick content scripts into executing harmful code or exfiltrating sensitive data through the extension's message passing system.

### Message Passing Vulnerabilities

Extensions typically use message passing to communicate between content scripts, background service workers, popups, and options pages. If these messages aren't properly validated and sanitized, attackers can inject malicious payloads that propagate through the extension's internal communication channels. This is especially dangerous when background scripts blindly trust messages from content scripts, as any compromised content script can send crafted messages that trigger harmful actions.

The message passing system in Chrome extensions is designed for flexibility rather than security, making it the developer's responsibility to implement proper validation at every endpoint. Never assume that messages from content scripts are trustworthy simply because they originate within your extension—the underlying page may have been compromised.

### DOM Injection Through Extension APIs

Many extensions use APIs like `chrome.scripting.executeScript` or `chrome.domains` to inject content into web pages. These operations become dangerous when the injected content includes any user-controlled data without proper sanitization. Even seemingly harmless operations like dynamically generating HTML for display can become XSS vectors if the data isn't sanitized before injection.

## The Dangers of innerHTML

The `innerHTML` property is one of the most common sources of XSS vulnerabilities in extension development. While convenient for quickly rendering HTML content, it executes any embedded scripts and parses HTML in a way that can easily introduce vulnerabilities.

### Why innerHTML Is Particularly Dangerous in Extensions

In the context of Chrome extensions, `innerHTML` becomes even more dangerous than in regular web applications. Content scripts using `innerHTML` to render data from web pages can inadvertently execute malicious scripts embedded by attackers. Similarly, popups and options pages that use `innerHTML` to display user data or extension settings can be compromised if any of that data originates from untrusted sources.

The core problem with `innerHTML` is that it completely bypasses the browser's normal HTML parsing rules by inserting raw HTML into the document. Any `<script>` tags within the inserted content will be executed, event handlers in attributes like `onload` or `onerror` will fire, and SVG elements with embedded scripts will execute—all without any user interaction.

### Safe Alternatives to innerHTML

Instead of using `innerHTML`, prefer text insertion methods that automatically escape potentially dangerous characters. The `textContent` property is the safest choice for displaying plain text, as it treats all characters as literal text rather than HTML. For complex DOM structures, use `document.createElement` and `document.createTextNode` to build elements programmatically, or use template literals with dedicated templating libraries that automatically escape values.

When you must render HTML content from potentially untrusted sources, always sanitize the content before insertion using a dedicated HTML sanitization library. DOMPurify, maintained by the OWASP community, is the gold standard for this purpose and should be your first choice for any HTML sanitization needs.

## DOMPurify Integration

DOMPurify is a widely-used, battle-tested HTML sanitizer that removes all malicious code from HTML while preserving safe formatting elements. Integrating DOMPurify into your Chrome extension provides robust protection against XSS attacks when you need to render HTML content.

### Installing and Configuring DOMPurify

DOMPurify can be included in your extension by downloading the minified version from the official repository or installing it via npm. For Manifest V3 extensions, include the DOMPurify library in your extension bundle:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["lib/dompurify/purify.min.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

After adding the library to your extension, you can use it in any JavaScript file:

```javascript
// In your popup, background, or content script
import DOMPurify from 'dompurify';

// Sanitize user-controlled HTML before rendering
const userContent = '<p>Hello, <img src=x onerror=alert(1)> world!</p>';
const cleanContent = DOMPurify.sanitize(userContent);
document.getElementById('container').innerHTML = cleanContent;
```

### Configuring DOMPurify for Extension Contexts

DOMPurify offers extensive configuration options that allow you to tailor its behavior to your specific needs. For Chrome extensions, certain configurations are particularly important. The `RETURN_TRUSTED_TYPE` option works alongside the Trusted Types API, while custom element and attribute allowlists let you control exactly what HTML features remain enabled.

For content scripts that must interact with complex web page content, consider using DOMPurify in a configuration that removes all scripts but preserves formatting:

```javascript
const cleanHTML = DOMpurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  ALLOWED_ATTR: ['href', 'class', 'id', 'style'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
});
```

## Trusted Types API

The Trusted Types API provides a powerful mechanism for preventing DOM XSS attacks by allowing developers to create policies that restrict how DOM manipulation can occur. When enabled, the browser blocks dangerous DOM sinks like `innerHTML` unless they receive data from a trusted type.

### Implementing Trusted Types in Extensions

To enable Trusted Types in your extension, add the appropriate CSP directive and create policies in your JavaScript code:

```javascript
// Create a Trusted Types policy
const policy = trustedTypes.createPolicy('extensionPolicy', {
  createHTML: (input) => DOMPurify.sanitize(input, { RETURN_TRUSTED_TYPE: true }),
  createScript: (input) => {
    // Only allow pre-approved scripts
    if (!isApprovedScript(input)) {
      throw new Error('Script not approved');
    }
    return input;
  }
});

// Use the policy
const trusted = policy.createHTML('<p>Safe content</p>');
element.innerHTML = trusted; // This works with Trusted Types enabled
```

For Trusted Types to be effective, you must enable them in your extension's CSP by adding the `require-trusted-types-for` directive:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'"
  }
}
```

This configuration tells the browser to block any use of dangerous DOM sinks that don't use Trusted Types, effectively eliminating an entire category of XSS vulnerabilities at the browser level.

## Message Passing Sanitization

Proper message sanitization is critical for extension security because messages can travel between contexts with different privilege levels. Content scripts running in untrusted page contexts can send messages to background scripts with elevated permissions, making it essential to treat all incoming messages as potentially malicious.

### Validating and Sanitizing Messages

Every message handler in your extension should implement input validation and sanitization:

```javascript
// In your background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || typeof message !== 'object') {
    return false;
  }

  // Validate expected fields
  if (!message.type || typeof message.type !== 'string') {
    console.error('Invalid message: missing type');
    return false;
  }

  // Sanitize data payloads
  const sanitizedData = message.data ? sanitizeMessageData(message.data) : {};

  // Process validated message
  handleMessage(message.type, sanitizedData, sender);
});

function sanitizeMessageData(data) {
  if (typeof data === 'string') {
    // Escape HTML entities to prevent XSS in rendered output
    return data.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#039;');
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeMessageData);
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const key of Object.keys(data)) {
      sanitized[key] = sanitizeMessageData(data[key]);
    }
    return sanitized;
  }

  return data;
}
```

This approach ensures that any data passed through the message system is sanitized before use, preventing malicious payloads from triggering XSS vulnerabilities in other extension contexts.

## Content Script Injection Risks

Content scripts face unique risks because they operate in the context of untrusted web pages. Understanding these risks and implementing appropriate safeguards is essential for maintaining extension security.

### Isolating Content Script Execution

One of the most effective strategies for protecting content scripts is to minimize their interaction with page content. Use the `world` option in Manifest V3 to run your content scripts in an isolated world where they share the DOM with page scripts but maintain separate JavaScript contexts:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "world": "ISOLATED"
    }
  ]
}
```

This isolation prevents page scripts from directly accessing your content script's variables and functions, reducing the risk of data exfiltration through prototype manipulation or other JavaScript-based attacks.

### Avoiding eval and Similar Constructs

Content scripts should never use `eval()`, `new Function()`, or similar constructs that execute strings as code. These are particularly dangerous in the content script context because any string execution could potentially be influenced by malicious page scripts. Instead, use direct function calls and JSON.parse() for data parsing.

## Popup and Options Page Security

Popup and options pages are extension pages that users interact with directly, making their security critical. These pages often display user data, settings, and information from external sources, all of which must be properly sanitized before rendering.

### Best Practices for Extension UI Pages

Always treat any data displayed in popups and options pages as potentially malicious, even if it originates from your extension's storage. User data, cached web content, and API responses should all be sanitized before insertion into the DOM. Use `textContent` whenever possible, and implement CSP with strict script-src directives to provide defense in depth.

Implement proper input validation in options pages to ensure users can't inject malicious code through extension settings. Any configuration value that gets rendered or used in DOM operations should be sanitized first.

## CSP as a Defense Layer

Content Security Policy serves as your primary defense against XSS attacks by controlling what resources the browser is allowed to load and execute. A properly configured CSP can prevent XSS attacks from succeeding even if your code contains vulnerabilities.

For a comprehensive guide to CSP configuration in Chrome extensions, see our [Chrome Extension Content Security Policy](/chrome-extension-guide/guides/chrome-extension-content-security-policy/) guide. For security hardening best practices, see [Chrome Extension Security Hardening](/chrome-extension-guide/guides/chrome-extension-security-hardening/).

### Essential CSP Directives for XSS Prevention

At minimum, your extension should implement these CSP directives:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
  }
}
```

The `script-src 'self'` directive ensures only your extension's own scripts can execute, while `object-src 'none'` prevents loading of potentially dangerous plugin content. These restrictions significantly reduce the attack surface available to XSS exploits.

## Sanitizer API

The HTML Sanitizer API is a newer browser standard that provides built-in HTML sanitization capabilities. Unlike DOMPurify, which is a JavaScript library you must include in your bundle, the Sanitizer API is implemented natively by the browser, offering better performance and requiring no external dependencies.

### Using the Sanitizer API

```javascript
const sanitizer = new Sanitizer();
const element = document.getElementById('target');
element.setHTML('<p>Hello <img src=x> world</p>', { sanitizer });
```

The Sanitizer API automatically removes dangerous elements and attributes while preserving safe formatting. However, browser support varies, so you may need to use DOMPurify as a fallback for older browsers.

## Automated Security Scanning

Regular security scanning helps identify XSS vulnerabilities before they reach production. Several tools can automate this process for Chrome extensions.

### Static Analysis Tools

ESLint with security plugins can detect many common XSS patterns in your code:

```bash
npm install --save-dev eslint eslint-plugin-security
```

Configure ESLint to flag dangerous patterns like unescaped variables in innerHTML:

```json
{
  "plugins": ["security"],
  "rules": {
    "security/detect-unsafe-regex": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-non-literal-string": "error"
  }
}
```

### Dynamic Testing with Puppeteer

Automated browser testing can identify runtime XSS vulnerabilities:

```javascript
const puppeteer = require('puppeteer');

async function testXSS(extensionPath) {
  const browser = await puppeteer.launch({
    args: [
      `--extension-path=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath
    ]
  });

  // Test your extension's pages with XSS payloads
  // Verify payloads are properly sanitized
}
```

## OWASP for Extensions

The OWASP Foundation provides resources specifically relevant to Chrome extension security. The [OWASP Cheat Sheet series](https://cheatsheetseries.owasp.org/) includes valuable guidance on XSS prevention that applies to extension development.

Key OWASP recommendations for extensions include implementing defense in depth through multiple security layers, validating all input regardless of source, escaping all output when displaying data in HTML contexts, using security libraries like DOMPurify instead of writing custom sanitization, and regularly auditing code for security vulnerabilities.

## Conclusion

XSS prevention in Chrome extensions requires a comprehensive approach that addresses the unique challenges of extension development. By understanding extension-specific attack vectors, using safe DOM manipulation practices, integrating DOMPurify or the Sanitizer API, implementing Trusted Types, securing message passing channels, and maintaining defense in depth through CSP and regular security auditing, you can build extensions that protect users from XSS attacks. Security must be considered at every stage of development, from initial architecture to ongoing maintenance, ensuring that extensions remain secure as they evolve.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
