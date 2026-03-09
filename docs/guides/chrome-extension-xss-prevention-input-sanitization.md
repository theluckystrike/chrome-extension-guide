---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Master XSS prevention in Chrome extensions with this comprehensive guide covering innerHTML dangers, DOMPurify integration, Trusted Types API, message passing sanitization, content script injection risks, and defense-in-depth security strategies."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) vulnerabilities represent one of the most critical security risks facing Chrome extension developers. Unlike traditional web applications, extensions operate with elevated privileges, granting them access to sensitive browser APIs, user data, and powerful capabilities that can be weaponized by attackers. A single XSS vulnerability in your extension can compromise not just your users' data, but potentially their entire browsing experience. This guide provides comprehensive coverage of extension-specific XSS vectors, modern sanitization techniques, and defense strategies that every extension developer must understand and implement.

Understanding XSS in the extension context requires recognizing that your attack surface extends far beyond traditional web application boundaries. Content scripts execute in the context of arbitrary web pages, background scripts manage complex state, and popup pages interact with both user-generated content and extension APIs. Each of these contexts presents unique XSS risks that demand tailored mitigation approaches. The techniques covered here build upon the security hardening practices outlined in our [Chrome Extension Security Hardening Guide](/guides/chrome-extension-security-hardening/) and complement the Content Security Policy configuration detailed in our [CSP Guide](/guides/chrome-extension-content-security-policy/).

## Understanding Extension-Specific XSS Vectors

Chrome extensions face XSS risks that differ significantly from standard web applications. While traditional web XSS typically involves injecting malicious scripts through user input fields or URL parameters, extension XSS can originate from multiple sources that may not be immediately obvious to developers. The primary vectors include compromised web pages accessed by content scripts, malicious messages passed between contexts, vulnerable extension popup pages that render external content, and storage mechanisms that fail to sanitize data before rendering.

Content scripts represent the most exposed surface for XSS attacks. When your content script reads data from the DOM of web pages, you must treat that content as potentially malicious. Even seemingly safe operations like extracting text content can become dangerous if the extracted data is later inserted into HTML without proper sanitization. Attackers can craft web pages specifically designed to exploit extensions that don't properly sanitize DOM data, injecting scripts that run with your extension's elevated privileges.

The message passing system between extension components presents another significant attack vector. Background scripts often receive messages from content scripts or external sources without validating the message contents. If your extension uses `runtime.onMessage` listeners to process data from web pages and then displays that data in extension UI without sanitization, you create a direct path for XSS attacks. This is particularly dangerous because the attack can originate from any website your users visit, not just from attacker-controlled domains.

Storage APIs also require careful handling. When extensions store data retrieved from web pages and later display that data in extension contexts, the data must be sanitized before rendering. Many developers assume that data stored in `chrome.storage` is somehow "safe" because it's stored locally, but this assumption ignores that the original source of the data may have been maliciously crafted to exploit rendering vulnerabilities.

## The Dangers of innerHTML and Unsafe DOM Manipulation

The `innerHTML` property represents one of the most common sources of XSS vulnerabilities in Chrome extensions. When you set `element.innerHTML = userInput`, any HTML or JavaScript embedded in the user input will be executed by the browser. This behavior makes innerHTML fundamentally unsafe for rendering any content that originates from external sources, including web pages, user input, or data retrieved from storage.

Consider a typical extension pattern where a content script extracts data from a webpage and displays it in the extension popup:

```javascript
// DANGEROUS: Never use innerHTML with untrusted content
function displayPageTitle(title) {
  document.getElementById('title').innerHTML = title;
}

// The web page can exploit this by setting a malicious title
const title = document.querySelector('title').textContent;
displayPageTitle(title);
```

An attacker controlling the web page could set their page title to something like `<img src=x onerror="chrome.runtime.sendMessage({action: 'stealData'})">`, and when your extension displays this title, the JavaScript will execute with your extension's context. This gives the attacker access to all your extension APIs, potentially allowing them to read sensitive data, modify extension behavior, or pivot attacks to other contexts.

The solution is to use `textContent` instead of `innerHTML` whenever possible. For plain text that should not contain any HTML markup, `textContent` is both safer and more performant:

```javascript
// SAFE: Use textContent for plain text
function displayPageTitle(title) {
  document.getElementById('title').textContent = title;
}
```

When you genuinely need to render HTML content, you must sanitize it first using a robust HTML sanitization library. Never attempt to write your own sanitization logic, as it's incredibly difficult to get right and attackers are constantly finding bypasses for naive implementations.

## DOMPurify Integration for Robust HTML Sanitization

[DOMPurify](https://github.com/cure53/DOMPurify) is the gold standard for client-side HTML sanitization and should be integrated into every extension that needs to render HTML from untrusted sources. DOMPurify uses a robust whitelist-based approach, stripping out all dangerous HTML while preserving safe formatting elements. It handles edge cases and attack vectors that would be nearly impossible to anticipate when writing custom sanitization logic.

Installing DOMPurify in your extension is straightforward:

```bash
npm install dompurify
```

For extensions using Manifest V3, you can import DOMPurify in your popup or options page:

```javascript
import DOMPurify from 'dompurify';

// Sanitize HTML before rendering
function renderUserContent(htmlContent) {
  const clean = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'class'],
    ALLOW_DATA_ATTR: false
  });
  
  document.getElementById('content').innerHTML = clean;
}
```

The configuration options are critical for security. The `ALLOWED_TAGS` and `ALLOWED_ATTR` lists should be as restrictive as possible, including only the tags and attributes your extension actually needs. The example above permits basic text formatting and links, but removes support for images, iframes, scripts, and other potentially dangerous elements. Even if an attacker manages to inject malicious HTML, the strict whitelist ensures it cannot execute arbitrary JavaScript or load external resources.

For content scripts that need to sanitize HTML before inserting it into web pages, DOMPurify can run in a sandboxed iframe or use the JSDOM-based version for Node.js environments:

```javascript
// For content scripts, run DOMPurify in the extension context
// and only pass the sanitized HTML to the page context

// In your content script
function sanitizeAndDisplay(rawData) {
  // Send to background script for sanitization
  chrome.runtime.sendMessage({
    action: 'sanitizeHTML',
    content: rawData
  }, (cleanHTML) => {
    // Safely display in extension-created element
    const container = document.createElement('div');
    container.textContent = cleanHTML; // Display as text
  });
}
```

## Trusted Types API: Modern Defense Against DOM XSS

The [Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API) represents the modern approach to preventing DOM XSS attacks. Rather than sanitizing strings before inserting them into the DOM, Trusted Types work by requiring that potentially dangerous DOM operations only accept special "trusted" objects instead of plain strings. This shifts the security model from "sanitize everything" to "only allow explicitly created trusted objects."

To enable Trusted Types in your extension, add the appropriate Content Security Policy headers:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'"
  }
}
```

With Trusted Types enforced, code like this will throw a TypeError:

```javascript
// This will FAIL when Trusted Types are enforced
element.innerHTML = '<img src=x onerror=alert(1)>';
```

Instead, you must use Trusted Types compliant methods:

```javascript
// Create a Trusted HTML object using DOMPurify with Trusted Types
import DOMPurify from 'dompurify';

const policy = TrustedTypes.createPolicy('myExtensionPolicy', {
  createHTML: (input) => DOMPurify.sanitize(input)
});

// This works with Trusted Types enforced
const trustedHTML = policy.createHTML('<b>User content here</b>');
element.innerHTML = trustedHTML;
```

Trusted Types provide defense-in-depth even if your sanitization has vulnerabilities. Because the policy creation is centralized and must be explicitly imported, it's much harder for accidentally vulnerable code to slip through. The Trusted Types API is supported in all modern browsers and should be a standard part of your extension's security architecture.

## Sanitizer API: Native Browser Sanitization

The [Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/Sanitizer) is a new native browser API that provides built-in HTML sanitization without external dependencies. While still relatively new, it offers a promising alternative to DOMPurify for extensions that want to minimize their dependency footprint.

```javascript
// Using the native Sanitizer API
const sanitizer = new Sanitizer({
  allowElements: ['b', 'i', 'em', 'strong', 'p', 'br'],
  allowAttributes: { 'href': ['a'] }
});

function sanitizeHTML(input) {
  const element = document.createElement('div');
  element.sanitize(input);  // Modifies element in-place
  return element.innerHTML;
}
```

The Sanitizer API is designed to be secure by default, stripping potentially dangerous elements and attributes without requiring explicit configuration for basic use cases. However, DOMPurify remains more battle-tested and configurable for complex extension requirements. For production extensions, DOMPurify is currently the more reliable choice, but keep an eye on the Sanitizer API as browser support matures.

## Message Passing Sanitization Patterns

The extension message passing system is a critical area for XSS prevention. Messages traveling from content scripts to background scripts, from popup to background, or from external sources to your extension all represent potential attack vectors. Every message listener should treat incoming data as untrusted and sanitize it before use or storage.

A secure message handling pattern for background scripts:

```javascript
// Background script - sanitize all incoming messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  // Whitelist expected message types
  const allowedTypes = ['updateBadge', 'fetchData', 'logAction'];
  if (!allowedTypes.includes(message.type)) {
    console.warn('Unknown message type received');
    return false;
  }
  
  // Sanitize any string content in the message
  const sanitized = sanitizeMessageContent(message);
  
  // Process the sanitized message
  handleMessage(sanitized, sender);
  
  return true;
});

function sanitizeMessageContent(obj) {
  if (typeof obj === 'string') {
    // Remove any HTML tags for string values
    return obj.replace(/<[^>]*>/g, '');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeMessageContent);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const key in obj) {
      sanitized[key] = sanitizeMessageContent(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}
```

This pattern validates message types, sanitizes string content, and prevents processing of messages that don't match expected structures. The sanitization function recursively processes all string values, removing HTML tags that could contain malicious scripts.

## Content Script Injection Risks and Prevention

Content scripts run in the context of web pages, giving them unique risks that don't apply to other extension contexts. The primary risk is that a compromised or malicious web page can potentially influence what your content script does, either through the DOM, through JavaScript execution context, or through prototype pollution vulnerabilities.

One common vulnerability occurs when content scripts use `innerHTML` to insert data extracted from the page:

```javascript
// VULNERABLE: InnerHTML with page data
function displayPageInfo() {
  const userDiv = document.createElement('div');
  userDiv.innerHTML = '<h1>' + document.querySelector('.user-name').innerHTML + '</h1>';
  document.body.appendChild(userDiv);
}
```

If an attacker controls the `.user-name` element, they can inject malicious HTML. The fix is straightforward:

```javascript
// SAFE: Use textContent
function displayPageInfo() {
  const userDiv = document.createElement('div');
  const name = document.querySelector('.user-name').textContent;
  const heading = document.createElement('h1');
  heading.textContent = name;
  userDiv.appendChild(heading);
  document.body.appendChild(userDiv);
}
```

Content scripts should also avoid using `eval()` or `new Function()` with any data from the page, as these will execute arbitrary JavaScript. Similarly, be cautious with `setTimeout` and `setInterval` when passing string arguments, as these can also execute code.

## Popup and Options Page Security

Extension popup and options pages are just as vulnerable to XSS as regular web pages, but the consequences can be more severe because these pages often have access to more powerful APIs. Any data displayed in these pages that originates from web pages or external sources must be sanitized before rendering.

Best practices for popup and options page security include:

Always validate and sanitize any data received from content scripts or storage before displaying it. Use `textContent` for plain text and DOMPurify for HTML. Implement the principle of least privilege by requesting only the permissions your extension actually needs, reducing the potential impact of a successful XSS attack. Enable strict CSP as described in our [Chrome Extension Content Security Policy](/guides/chrome-extension-content-security-policy/) guide. Consider using sandboxed pages for rendering untrusted content.

```javascript
// Safe popup rendering example
import DOMPurify from 'dompurify';

// Load and display data from storage
async function displayStoredData() {
  const data = await chrome.storage.local.get('userData');
  
  if (data.userData) {
    const container = document.getElementById('data-container');
    
    // Always sanitize before innerHTML
    const cleanHTML = DOMPurify.sanitize(data.userData.html, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong'],
      ALLOWED_ATTR: []
    });
    
    container.innerHTML = cleanHTML;
  }
}
```

## CSP as a Defense Layer

Content Security Policy serves as your last line of defense against XSS attacks that bypass your sanitization code. A properly configured CSP restricts what resources can be loaded and what code can execute, significantly limiting the impact of any XSS vulnerability that does slip through. Our comprehensive [Content Security Policy Guide](/guides/chrome-extension-content-security-policy/) covers CSP configuration in detail, but the key points for XSS prevention are:

The `script-src 'self'` directive ensures only your extension's own scripts can execute, blocking inline scripts and external scripts. The `object-src 'none'` directive prevents Flash and other legacy plugins that could be used for XSS attacks. The `style-src 'self'` directive (or `'unsafe-inline'` if absolutely necessary) restricts where styles can be loaded from. The `base-uri 'self'` directive prevents attackers from overriding base URLs to redirect relative links.

Even with perfect sanitization, CSP provides crucial defense-in-depth. If a zero-day vulnerability in DOMPurify is discovered, a strict CSP might still prevent exploitation while you update your dependencies.

## Automated Security Scanning

Manual code review is essential but insufficient for catching all XSS vulnerabilities. Automated tools can continuously scan your extension code for common vulnerability patterns, helping you catch issues before they reach production. Key tools and approaches include:

Static analysis tools like ESLint with security plugins can detect patterns like `innerHTML` usage with variable data. Tools like `npm audit` and `snyk` can identify known vulnerabilities in your dependencies. Chrome's own extension auditing features can identify some security issues during development. The [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) provides comprehensive testing methodologies applicable to extensions.

For a more comprehensive security testing approach, refer to our [Extension Security Audit Guide](/guides/extension-security-audit/) which covers automated scanning, manual testing techniques, and security review processes.

## OWASP for Extensions

The [OWASP (Open Web Application Security Project)](https://owasp.org/) maintains resources that are highly relevant to Chrome extension security. While OWASP's Top 10 and various cheat sheets are designed for web applications, the underlying principles apply directly to extension development. Key OWASP resources for extension developers include:

The [OWASP Top 10](https://owasp.org/www-project-top-ten/) identifies the most critical web application security risks, many of which apply directly to extensions. Pay particular attention to A03:2021 – Injection, which covers XSS. The [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) provides detailed guidance on specific security topics, including XSS prevention. The [OWASP ASVS (Application Security Verification Standard)](https://owasp.org/www-project-application-security-verification-standard/) provides a framework for verifying security controls.

For extension-specific security guidance, review our [Security Best Practices Guide](/guides/security-best-practices/) which applies OWASP principles to the unique context of Chrome extension development.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
