---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Learn comprehensive XSS prevention strategies for Chrome extensions including innerHTML dangers, DOMPurify integration, Trusted Types API, message passing sanitization, and security best practices for content scripts and extension pages."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) remains one of the most critical security vulnerabilities affecting Chrome extensions. Unlike traditional web applications, extensions operate with elevated privileges and access to sensitive browser APIs, making XSS attacks potentially devastating. A single vulnerability can expose user credentials, hijack browsing sessions, steal sensitive data from web pages, and even compromise the entire extension. This comprehensive guide covers essential techniques for preventing XSS in Chrome extensions, from understanding extension-specific attack vectors to implementing robust sanitization strategies that protect your users and your extension's integrity.

Chrome extensions face unique XSS challenges because they interact with multiple contexts: the extension's own pages (popup, options, side panel), content scripts running in web pages, and background service workers. Each context presents different attack surfaces, and understanding these differences is crucial for effective security. The techniques in this guide provide defense-in-depth, ensuring that even if one protection layer fails, others remain to prevent exploitation.

## Extension-Specific XSS Vectors

Understanding where XSS vulnerabilities can occur in extensions is the first step toward preventing them. Extensions are not single-context applications—they span multiple origins, execution environments, and trust boundaries. This complexity creates attack vectors that don't exist in traditional web applications.

### Content Script Injection Risks

Content scripts execute in the context of web pages, which means they inherit all the dangers of the host page. Any data extracted from the page, whether through DOM queries, message passing from the page, or data received from the extension's background script, must be treated as potentially malicious. Attackers can exploit content scripts through several vectors.

First, DOM-based XSS occurs when content scripts insert unsanitized data into the page's DOM. If your content script uses `document.write()`, `innerHTML`, or similar methods with data from the page, attackers can craft malicious HTML that executes arbitrary JavaScript. For example, if your extension highlights search terms by reading from the URL and inserting HTML into the page, an attacker could embed malicious scripts in specially crafted URLs.

Second, message-based XSS targets extensions that communicate with web pages. If your content script exposes message listeners that respond to page events, attackers can send specially crafted messages designed to exploit vulnerabilities. Any data received from the page context should be validated and sanitized before use.

Third, storage-based XSS occurs when content scripts read data from extension storage and render it without sanitization. If an attacker can somehow inject malicious data into your extension's storage (perhaps through a compromised background script or a vulnerable web application), that data could be rendered as executable code when the content script runs.

### Popup and Options Page Security

Extension popup and options pages run in the extension's origin, giving them access to powerful APIs. However, this privilege comes with responsibility—vulnerabilities in these pages can give attackers full access to extension functionality. The popup and options pages face XSS risks from user input, data from external APIs, and content received through message passing.

User input in extension pages can originate from multiple sources: direct form inputs, URL parameters (if the page is opened with parameters), stored preferences, or data synced from other devices. Any unvalidated user input rendered as HTML creates an XSS vulnerability. Similarly, data fetched from external APIs may be compromised—either through a man-in-the-middle attack, a compromised API, or malicious data injected by an attacker who has compromised the data source.

Message passing presents another attack vector. Extension pages often receive data from background scripts or content scripts. If these messages contain unsanitized HTML and the receiving page renders them using unsafe methods, XSS vulnerabilities emerge. Always validate the source and content of messages before rendering any data.

### Background Script XSS

Although background service workers don't directly render HTML, they can become XSS vectors if they pass unsafe data to content scripts or extension pages. Background scripts handle message routing, API calls, and storage operations. If background scripts forward malicious data without validation, they become conduits for XSS attacks. Additionally, background scripts that use `eval()` or similar dynamic code execution methods with untrusted data create severe vulnerabilities that could lead to complete extension compromise.

## The Danger of innerHTML

The `innerHTML` property is one of the most common sources of XSS vulnerabilities in extensions. When you set `innerHTML`, the browser parses the string as HTML, potentially executing any embedded scripts. This behavior makes `innerHTML` extremely dangerous with untrusted data.

Consider this vulnerable content script that displays page information to users:

```javascript
// VULNERABLE - Never use innerHTML with untrusted data
function displayPageInfo() {
  const pageTitle = document.title;
  const url = window.location.href;
  
  // Directly inserting untrusted data into the DOM
  document.getElementById('info-container').innerHTML = 
    `<h1>${pageTitle}</h1><p>URL: ${url}</p>`;
}
```

In this example, if an attacker controls the page title (through a reflected or stored XSS on the web page), they can inject malicious scripts that execute in your content script's context. Even worse, if your content script runs with elevated privileges, the injected script can access extension APIs and sensitive data.

The solution is straightforward: avoid `innerHTML` when working with untrusted data. Use `textContent` for text nodes, `setAttribute` for attributes, and create elements programmatically using `document.createElement()`. These methods treat data as plain text rather than executable HTML.

```javascript
// SECURE - Using safe DOM methods
function displayPageInfo() {
  const pageTitle = document.title;
  const url = window.location.href;
  
  const container = document.getElementById('info-container');
  container.textContent = ''; // Clear existing content
  
  const titleEl = document.createElement('h1');
  titleEl.textContent = pageTitle;
  
  const urlEl = document.createElement('p');
  urlEl.textContent = `URL: ${url}`;
  
  container.appendChild(titleEl);
  container.appendChild(urlEl);
}
```

For cases where HTML rendering is necessary, such as displaying formatted user-generated content, always sanitize the HTML before insertion.

## DOMPurify Integration

When your extension needs to render HTML content that may include formatting (from user input, external sources, or web page data), use a sanitization library. DOMPurify is the industry-standard solution for sanitizing HTML while removing dangerous code.

DOMPurify strips out malicious scripts, event handlers, and other potentially dangerous elements while preserving safe HTML formatting. It uses a robust whitelist approach, allowing only known-safe elements and attributes.

```javascript
// Secure HTML sanitization with DOMPurify
import DOMPurify from 'dompurify';

function sanitizeAndRender(htmlContent, container) {
  // Configure DOMPurify to allow specific tags and attributes
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'class'],
    ALLOW_DATA_ATTR: false,
  };
  
  // Sanitize the HTML
  const clean = DOMPurify.sanitize(htmlContent, config);
  
  // Now safe to use with innerHTML
  container.innerHTML = clean;
}
```

To use DOMPurify in your extension, install it via npm or include it directly in your extension. For Manifest V3 extensions, you can bundle DOMPurify with your extension code or load it from the extension's JavaScript files.

```javascript
// Loading DOMPurify in a content script
// Option 1: Import from bundled file
import DOMPurify from './lib/dompurify/dist/purify.es.js';

// Option 2: Load dynamically
async function loadDOMPurify() {
  const response = await chrome.runtime.getURL('lib/dompurify/dist/purify.es.js');
  const module = await import(response);
  return module.default;
}
```

Always configure DOMPurify's allowed tags and attributes to match your specific needs. Whitelist only what you need rather than using permissive defaults. This principle of least privilege applies to sanitization configurations as well.

## Trusted Types API

The Trusted Types API provides a powerful mechanism for preventing DOM XSS at the browser level. When enabled, browsers block potentially dangerous DOM operations unless they use trusted type objects. This enforcement happens automatically, catching vulnerabilities before they can be exploited.

Trusted Types work by requiring that potentially dangerous operations use specifically created trusted objects instead of raw strings. For example, instead of setting `element.innerHTML` with a string, you create a `TrustedHTML` object and assign that.

```javascript
// Implementing Trusted Types in extension pages
// In your HTML head, add the policy
const policy = trustedTypes.createPolicy('default', {
  createHTML: (input) => {
    // Apply DOMPurify sanitization as the enforcement point
    return DOMPurify.sanitize(input, {
      RETURN_TRUSTED_TYPE: true
    });
  },
  createScript: (input) => {
    // Block script injection
    console.warn('Blocked script creation:', input);
    return '';
  }
});

// Now DOM operations are automatically protected
const element = document.getElementById('content');
element.innerHTML = policy.createHTML(userInput); // Sanitized automatically
```

To enable Trusted Types in your extension, add the appropriate CSP directive:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'"
  }
}
```

Trusted Types provide excellent defense-in-depth. Even if your code accidentally uses innerHTML with untrusted data, Trusted Types will block the operation, forcing you to use the safe policy. This makes Trusted Types an essential part of modern extension security.

## Message Passing Sanitization

Chrome extensions rely heavily on message passing between content scripts, background scripts, and extension pages. Every message is a potential attack vector—attackers may try to inject malicious content through the messaging system. Proper message handling is critical for security.

### Validating Message Senders

Always verify the sender of messages before processing them. The `sender` parameter in message listeners provides information about the message source, including the script ID, URL, and tab ID.

```javascript
// Secure message handling with sender validation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender origin for content script messages
  if (sender.url && !sender.url.startsWith('https://trusted-site.com')) {
    console.error('Rejected message from untrusted origin:', sender.url);
    return false;
  }
  
  // Validate sender for extension internal messages
  if (sender.id && sender.id !== chrome.runtime.id) {
    console.error('Rejected message from unknown extension:', sender.id);
    return false;
  }
  
  // Process only expected message types
  const validTypes = ['fetch-data', 'update-ui', 'get-status'];
  if (!validTypes.includes(message.type)) {
    console.error('Invalid message type:', message.type);
    return false;
  }
  
  // Sanitize message data before use
  const sanitizedData = sanitizeMessageData(message.data);
  
  // Process the validated and sanitized message
  handleMessage(sanitizedData);
  
  return true;
});

function sanitizeMessageData(data) {
  if (typeof data === 'string') {
    // Escape HTML entities for string data
    return data.replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }
  
  if (typeof data === 'object') {
    // Recursively sanitize object properties
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeMessageData(data[key]);
    }
    return sanitized;
  }
  
  return data;
}
```

### Rate Limiting and Input Validation

Implement rate limiting on message handlers to prevent abuse through message flooding. Additionally, validate all message data structure and content before processing.

```javascript
// Rate limiting for message handlers
const messageTimestamps = new Map();

function checkRateLimit(sender, maxMessages = 10, windowMs = 1000) {
  const senderKey = sender.tab?.id || sender.id || 'unknown';
  const now = Date.now();
  
  if (!messageTimestamps.has(senderKey)) {
    messageTimestamps.set(senderKey, []);
  }
  
  const timestamps = messageTimestamps.get(senderKey);
  const recentMessages = timestamps.filter(ts => now - ts < windowMs);
  
  if (recentMessages.length >= maxMessages) {
    return false; // Rate limit exceeded
  }
  
  recentMessages.push(now);
  messageTimestamps.set(senderKey, recentMessages);
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!checkRateLimit(sender)) {
    sendResponse({ error: 'Rate limit exceeded' });
    return true;
  }
  
  // Process message...
});
```

## The Sanitizer API

The native Sanitizer API provides browser-built-in sanitization that doesn't require external libraries. This API offers a standardized way to sanitize HTML without the overhead of third-party libraries.

```javascript
// Using the native Sanitizer API
const sanitizer = new Sanitizer({
  allowElements: ['p', 'br', 'strong', 'em', 'a'],
  allowAttributes: { 'href': ['a'] },
  allowLists: true
});

function sanitizeHtml(input) {
  const element = document.createElement('div');
  element.textContent = input; // Set as text first
  return sanitizer.sanitize(element); // Sanitize and return
}

// Usage
const container = document.getElementById('output');
const cleanHtml = sanitizeHtml(userInput);
container.setHTML(cleanHtml, { sanitizer }); // Safe insertion
```

The Sanitizer API is available in modern Chrome versions and provides excellent performance. However, it may not be as configurable as DOMPurify for specialized use cases. For most extension needs, the Sanitizer API provides adequate protection, but always verify its capabilities match your requirements.

## CSP as a Defense Layer

Content Security Policy serves as the last line of defense against XSS attacks. A properly configured CSP prevents many XSS attempts by blocking inline script execution and restricting resource loading. For extensions, CSP is defined in the manifest.json file.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.example.com"
  }
}
```

The most important CSP directives for XSS prevention are:

- `script-src 'self'`: Blocks external scripts and inline scripts, preventing most XSS attacks from executing
- `object-src 'none'`: Prevents Flash and other legacy plugins that could be used for XSS
- `require-trusted-types-for 'script'`: Enforces Trusted Types, blocking DOM XSS at the browser level

For content scripts, CSP is determined by the host page, but you can set additional restrictions through the manifest. See our [Content Security Policy](/guides/chrome-extension-content-security-policy.md) guide for comprehensive configuration options.

## Automated Security Scanning

Automated tools help identify XSS vulnerabilities during development before they reach production. Several tools are specifically useful for Chrome extension security.

### ESLint Security Plugin

Install the ESLint security plugin to catch insecure patterns during development:

```bash
npm install --save-dev eslint-plugin-security
```

Configure it to warn about dangerous patterns:

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  rules: {
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/no-eval': 'error',
    'security/no-implied-eval': 'error'
  }
};
```

### OWASP for Extensions

The OWASP Foundation provides security guidelines applicable to Chrome extensions. Key resources include:

- OWASP Top 10: The standard list of most critical web application security risks, many of which apply to extensions
- OWASP ASVS: Application Security Verification Standard for comprehensive security requirements
- OWASP Cheat Sheets: Specific guidance for XSS prevention and other vulnerabilities

Refer to our [Security Hardening](/guides/security-hardening.md) guide for additional automated scanning tools and comprehensive security testing strategies.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
