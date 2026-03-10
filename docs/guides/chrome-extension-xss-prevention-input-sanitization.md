---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Learn how to prevent XSS vulnerabilities in Chrome extensions with comprehensive coverage of DOMPurify, Trusted Types, message passing sanitization, content script security, and defense-in-depth strategies."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

## Introduction {#introduction}

Cross-site scripting (XSS) vulnerabilities represent one of the most critical security risks facing Chrome extension developers. Unlike traditional web applications, extensions operate with elevated privileges and can access sensitive APIs, making XSS attacks potentially devastating. A successful XSS exploit in an extension can give attackers access to user browsing data, cookies, saved passwords, and the ability to manipulate web page content on behalf of users. This guide provides comprehensive coverage of XSS prevention techniques specific to Chrome extension development, from understanding extension-specific attack vectors to implementing robust sanitization strategies.

Chrome extensions present unique XSS challenges because they operate across multiple contexts: content scripts that interact directly with web pages, background scripts that handle extension logic, and popup or options pages that provide user interfaces. Each of these contexts has different trust boundaries and requires careful attention to data flow security. Understanding these distinct contexts is essential for building secure extensions that protect user privacy and data integrity.

## Extension-Specific XSS Vectors {#extension-specific-xss-vectors}

Understanding where XSS vulnerabilities can occur in Chrome extensions requires recognizing the unique attack surfaces that extensions introduce. Unlike standard web applications, extensions have access to powerful APIs that can read and modify browser behavior, making the consequences of XSS far more severe than in traditional web contexts.

Content scripts represent the most exposed attack surface in Chrome extensions. When your extension's content script interacts with a web page, it must treat all data from that page as potentially malicious. Web pages can intentionally inject specially crafted data into the DOM specifically designed to exploit vulnerabilities in content scripts. This includes manipulating attributes, creating elements with event handlers, and exploiting parsing ambiguities that browsers tolerate but that can lead to script execution when processed by extension code.

The message passing system between extension components introduces another significant XSS vector. Background scripts, content scripts, and popup pages communicate through the Chrome message passing API, and this communication can be intercepted or manipulated if proper validation is not implemented. Content scripts running on malicious web pages can send crafted messages to the extension's background script, attempting to inject malicious payloads through what might appear to be legitimate message channels.

Extension options pages and popups face XSS risks when they display user-provided data or data retrieved from web pages. If your extension allows users to configure custom content, display data from external APIs, or render information extracted from web pages, you must apply the same sanitization standards you would use when rendering untrusted HTML in any web application context.

## The Dangers of innerHTML {#the-dangers-of-innerhtml}

The innerHTML property remains one of the most common sources of XSS vulnerabilities in Chrome extensions. While innerHTML provides a convenient way to set HTML content, it parses and executes any embedded scripts, event handlers, and javascript: URLs that the string contains. This behavior makes innerHTML fundamentally unsafe for rendering untrusted content.

Consider a content script that displays page information to users:

```javascript
// DANGEROUS: Never use innerHTML with untrusted data
function displayPageInfo(pageData) {
  const container = document.getElementById('info-container');
  container.innerHTML = `<h1>${pageData.title}</h1><p>${pageData.description}</p>`;
}
```

If an attacker controls the pageData.title or pageData.description values, they can easily inject malicious scripts:

```javascript
// Attack payload that would execute arbitrary JavaScript
const maliciousData = {
  title: '<img src=x onerror="alert(\'XSS\')">',
  description: 'Click here for a prize!'
};
```

This attack works because innerHTML causes the browser to parse the img tag, recognize the onerror event handler, and execute the JavaScript when the image fails to load. The attack succeeds without requiring the victim to click anything or interact with the page in any way.

The solution is to use safe DOM manipulation methods instead of innerHTML. textContent safely inserts text without parsing it as HTML, preventing any script execution. When you need to insert HTML, you must first sanitize the content using a proper HTML sanitization library.

## DOMPurify Integration {#dompurify-integration}

DOMPurify is the gold standard for sanitizing HTML in JavaScript applications, and it works seamlessly in Chrome extension contexts. DOMPurify uses a robust whitelist-based approach to remove dangerous HTML elements and attributes while preserving safe formatting markup. Integrating DOMPurify into your extension provides reliable protection against XSS attacks.

First, install DOMPurify as a dependency:

```bash
npm install dompurify
```

Then integrate it into your extension's content script or popup:

```javascript
import DOMPurify from 'dompurify';

// Safe HTML rendering with DOMPurify
function safeDisplayContent(untrustedHTML) {
  const container = document.getElementById('content');
  
  // Configure DOMPurify to allow specific elements
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a'],
    ALLOWED_ATTR: ['href', 'class', 'id'],
    ALLOW_DATA_ATTR: false
  };
  
  // Sanitize the HTML
  const clean = DOMPurify.sanitize(untrustedHTML, config);
  
  // Now it's safe to insert
  container.innerHTML = clean;
}
```

For content scripts that need to work with web page data, configure DOMPurify to be more restrictive since you are handling potentially malicious page content:

```javascript
// Content script sanitization - more restrictive
const contentScriptPurify = DOMPurify(document).configure({
  ALLOWED_TAGS: [],
  ALLOW_DATA_ATTR: false
});

// When extracting text from the page, sanitize it
function extractAndSanitizeText(selector) {
  const elements = document.querySelectorAll(selector);
  const texts = Array.from(elements).map(el => contentScriptPurify.sanitize(el.textContent));
  return texts;
}
```

DOMPurify also provides functionality to sanitize CSS, which is important when dealing with style attributes that could contain expression() injections in older browsers or other CSS-based attacks.

## Trusted Types API {#trusted-types-api}

The Trusted Types API provides a modern, browser-enforced approach to preventing DOM XSS. By declaring Trusted Type policies in your extension, you can ensure that the browser automatically blocks dangerous DOM operations that could lead to XSS, regardless of whether you've remembered to sanitize every piece of content.

To enable Trusted Types in your extension, add the appropriate Content Security Policy directive in your manifest:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; require-trusted-types-for 'script'"
  }
}
```

Now create Trusted Type policies in your extension code:

```javascript
// Create a Trusted Types policy
const policy = trustedTypes.createPolicy('extension-policy', {
  createHTML: (input) => DOMPurify.sanitize(input),
  createScript: (input) => {
    // Only allow pre-approved scripts
    throw new Error('Dynamic script creation not allowed');
  },
  createScriptURL: (input) => {
    // Only allow same-origin URLs
    const url = new URL(input);
    if (url.origin !== window.location.origin) {
      throw new Error('Cross-origin scripts not allowed');
    }
    return input;
  }
});

// Use the policy - this is safe
function safeSetContent(container, html) {
  const trustedHTML = policy.createHTML(html);
  container.innerHTML = trustedHTML; // Only works with Trusted Types
}
```

When Trusted Types are enforced, attempting to use innerHTML with regular strings will throw an error, forcing developers to explicitly use the policy. This provides defense-in-depth protection even if sanitization is accidentally omitted.

Note that Trusted Types require browser support and proper CSP headers. Most modern browsers support Trusted Types, but you should test your extension across all target browsers to ensure compatibility.

## Message Passing Sanitization {#message-passing-sanitization}

The Chrome extension message passing system is essential for communication between content scripts, background scripts, and popup pages, but it also creates potential attack vectors that require careful handling. Any message received from a content script should be treated as potentially malicious since it may have been generated by a compromised or malicious web page.

Always validate and sanitize messages at the receiving end:

```javascript
// Background script - message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || typeof message !== 'object') {
    console.error('Invalid message format');
    return false;
  }
  
  // Validate sender origin for content scripts
  if (sender.url) {
    const url = new URL(sender.url);
    // Only accept messages from allowed domains
    const allowedDomains = ['https://example.com', 'https://app.example.com'];
    if (!allowedDomains.includes(url.origin)) {
      console.error('Message from unauthorized origin:', url.origin);
      return false;
    }
  }
  
  // Sanitize any HTML content in the message
  const sanitizedMessage = {
    ...message,
    content: message.content ? DOMPurify.sanitize(message.content) : undefined,
    title: message.title ? DOMPurify.sanitize(message.title, {ALLOWED_TAGS: []}) : undefined
  };
  
  // Process the sanitized message
  handleMessage(sanitizedMessage);
  
  return true;
});
```

For more complex message handling scenarios, consider implementing a schema validation library like JSON Schema or Yup to ensure messages conform to expected structures before processing:

```javascript
import * as yup from 'yup';

// Define expected message schema
const messageSchema = yup.object({
  type: yup.string().oneOf(['page-data', 'user-action', 'status-update']).required(),
  payload: yup.object({
    id: yup.string().uuid().required(),
    content: yup.string().max(10000),
    timestamp: yup.date()
  }).required()
});

// Validate incoming messages
async function validateMessage(message) {
  try {
    return await messageSchema.validate(message);
  } catch (error) {
    console.error('Message validation failed:', error.message);
    return null;
  }
}
```

## Content Script Injection Risks {#content-script-injection-risks}

Content scripts run in the context of web pages with access to the page's DOM, making them particularly vulnerable to injection attacks. Understanding these risks is essential for building secure extensions that interact with web content.

Web pages can exploit content scripts through DOM manipulation that targets your script's selectors or data extraction logic. If your content script queries the DOM using user-controllable selectors or processes data from the page without sanitization, attackers can inject malicious content specifically designed to exploit these operations.

Protect against these attacks by implementing strict content filtering:

```javascript
// Content script - safe DOM interaction
function safeProcessPage() {
  // Use specific, restrictive selectors rather than general ones
  const trustedElements = document.querySelectorAll('.trusted-content-section');
  
  trustedElements.forEach(element => {
    // Extract text content, not HTML
    const textContent = element.textContent;
    
    // If HTML is needed, sanitize it first
    const innerHTML = element.innerHTML;
    const sanitized = DOMPurify.sanitize(innerHTML, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong'],
      ALLOWED_ATTR: []
    });
    
    // Process safely
    processContent(sanitized);
  });
}
```

Additionally, avoid using eval() or Function() with any data from the web page, as these will execute arbitrary JavaScript. Even seemingly safe data transformations can introduce vulnerabilities if they result in dynamic code execution.

## Popup and Options Page Security {#popup-and-options-page-security}

Extension popups and options pages are HTML pages that run in the extension's context, but they can still be vulnerable to XSS if they display data from external sources. These pages should follow the same security practices as any web application that handles untrusted content.

Implement strict Content Security Policy for popup and options pages:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src https://api.example.com"
  }
}
```

When displaying user-configured content or data from external sources in your popup or options page, always sanitize before rendering:

```javascript
// Options page - displaying user configuration
function displayUserSettings(settings) {
  const container = document.getElementById('settings-display');
  
  // Sanitize all user-provided content
  const sanitized = {
    displayName: DOMPurify.sanitize(settings.displayName, {ALLOWED_TAGS: []}),
    customMessage: DOMPurify.sanitize(settings.customMessage, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a']
    }),
    customUrl: settings.customUrl // Validate URLs separately
  };
  
  // Display safely
  document.getElementById('display-name').textContent = sanitized.displayName;
  document.getElementById('message').innerHTML = sanitized.customMessage;
}
```

Always validate URLs separately from HTML sanitization, as sanitized HTML can still contain dangerous javascript: or data: URLs:

```javascript
function validateAndSanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Only allow http, https, and relative URLs
    if (!['http:', 'https:', ''].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}
```

## Content Security Policy as Defense Layer {#content-security-policy-as-defense-layer}

Content Security Policy (CSP) serves as a critical defense-in-depth layer against XSS attacks in Chrome extensions. CSP provides a mechanism for controlling which resources the extension can load and execute, significantly reducing the impact of any XSS vulnerabilities that might exist in your code. For a detailed guide on implementing CSP in your extension, refer to our [Content Security Policy Guide](/chrome-extension-guide/guides/chrome-extension-content-security-policy/).

Manifest V3 enforces a restrictive default CSP that you should never weaken:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; worker-src 'self'"
  }
}
```

Never relax your CSP to work around development issues. Instead, fix the underlying code:

```javascript
// BAD: Relaxing CSP to allow inline scripts
"content_security_policy": "script-src 'self' 'unsafe-inline'"

// GOOD: Moving code to separate files and using proper loading
"content_security_policy": "script-src 'self'"
```

Implement report-uri or reporting API to receive notifications when CSP violations occur:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; report-uri https://your-api.example.com/csp-reports"
  }
}
```

## The Sanitizer API {#the-sanitizer-api}

The HTML Sanitizer API is a browser-native solution for safely rendering HTML that provides built-in protection against XSS attacks. Unlike DOMPurify, which requires an external library, the Sanitizer API is built into modern browsers and offers comparable security with less overhead.

```javascript
// Using the native Sanitizer API
const sanitizer = new Sanitizer({
  elements: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
  attributes: { 'a': ['href'] }
});

function safelySetContent(element, html) {
  // Parse and sanitize in one step
  const sanitized = sanitizer.sanitizeFor('div', html);
  element.replaceChildren(sanitized);
}

// Or use setHTML (newer API)
function setContentSafe(element, html) {
  element.setHTML(html, { sanitizer });
}
```

The Sanitizer API provides different levels of protection through its configuration options. For extension contexts where you need maximum security, use the most restrictive configuration:

```javascript
// Maximum security sanitization
const strictSanitizer = new Sanitizer({
  elements: [], // Allow no elements by default
  allowAttributes: (attr, element) => false
});
```

Note that browser support for the Sanitizer API varies. Check compatibility and provide fallback support using DOMPurify for unsupported browsers.

## Automated Security Scanning {#automated-security-scanning}

Regular security scanning helps identify XSS vulnerabilities and other security issues before they can be exploited. Several tools can integrate into your development workflow to provide automated security assessment.

ESLint with security plugins can catch common XSS patterns during development:

```bash
npm install --save-dev eslint eslint-plugin-security
```

Configure ESLint to detect dangerous patterns:

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  rules: {
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-xss/v-detect-xss-via-innerHTML': 'error',
    'security/detect-xss/v-detect-outerHTML': 'error'
  }
};
```

For comprehensive extension security testing, consider using specialized tools that understand Chrome extension architecture and can identify extension-specific vulnerabilities.

## OWASP for Extensions {#owasp-for-extensions}

The Open Web Application Security Project (OWASP) provides guidance that applies to Chrome extensions, though extension-specific considerations require adapting general security principles. The OWASP Top 10 includes XSS as a persistent threat, and extensions face amplified risks due to their privileged access to browser functionality.

Key OWASP principles adapted for Chrome extensions include:

Treat all data from web pages as untrusted: Content scripts receive data from potentially malicious web pages and should never assume this data is safe. Sanitize all data before using it in any DOM operation or passing it to extension APIs.

Implement defense in depth: Layer your security controls so that if one protection mechanism fails, others still provide protection. Use CSP alongside input sanitization, validate data at multiple points in your extension, and follow the principle of least privilege when requesting permissions.

Validate input on the server-side when possible: If your extension communicates with a backend server, perform validation there in addition to client-side checks. Server-side validation cannot be bypassed by attackers manipulating client-side code.

For comprehensive security hardening strategies beyond XSS prevention, see our [Extension Security Hardening Guide](/chrome-extension-guide/guides/extension-security-hardening/) which covers additional defense mechanisms and security best practices.

## Conclusion

Preventing XSS in Chrome extensions requires a comprehensive approach that addresses the unique challenges of extension architecture. By understanding extension-specific attack vectors, avoiding dangerous APIs like innerHTML with untrusted data, integrating DOMPurify or the native Sanitizer API, implementing Trusted Types, and using Content Security Policy as a defense layer, you can build extensions that protect users from XSS attacks.

Remember that security is not a single feature but an ongoing commitment. Regularly audit your code for XSS vulnerabilities, keep your security libraries updated, and stay informed about new attack techniques and defense mechanisms. The practices outlined in this guide, combined with the security hardening strategies from our related guides, will help you build Chrome extensions that are resilient against cross-site scripting attacks while providing valuable functionality to your users.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
