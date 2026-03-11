---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Master XSS prevention in Chrome extensions with this comprehensive guide covering DOMPurify, Trusted Types API, message passing sanitization, content script risks, and security best practices for extension developers."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) remains one of the most critical security vulnerabilities affecting Chrome extensions. Unlike traditional web applications, Chrome extensions operate with elevated privileges within the browser, granting them access to sensitive APIs, user data, and browser functionality that standard web pages cannot reach. This makes XSS vulnerabilities in extensions particularly dangerous—an attacker who successfully exploits an XSS flaw can potentially access cookies, hijack sessions, steal sensitive information, or perform actions on behalf of the user. This comprehensive guide covers the essential techniques for preventing XSS in Chrome extensions, from understanding extension-specific attack vectors to implementing robust sanitization strategies that protect millions of users.

## Understanding Extension-Specific XSS Vectors

Chrome extensions face unique XSS challenges that differ significantly from traditional web applications. While standard web XSS typically involves injecting malicious scripts through user input fields or URL parameters, extension XSS can occur through multiple vectors that are specific to the extension architecture. Understanding these vectors is the first step toward building secure extensions.

### Content Script Injection Risks

Content scripts run in the context of web pages, which means they inherit all the vulnerabilities present on those pages while also having access to extension APIs. This dual exposure creates several unique attack surfaces. When your content script interacts with the page's DOM, any data you receive from the page—whether through direct DOM access, message passing, or event listeners—should be treated as potentially malicious.

Consider a content script that reads data from page elements and displays them in an extension-created panel:

```javascript
// DANGEROUS: Directly inserting page content without sanitization
function displayPageTitle() {
  const title = document.querySelector('h1').textContent;
  const panel = document.getElementById('extension-panel');
  panel.innerHTML = `<h2>${title}</h2>`;  // XSS vulnerability!
}
```

The problem here is that the page title could contain malicious HTML or JavaScript. If an attacker controls the page content (through a stored XSS on the page itself), they could inject arbitrary code that executes in your extension's context.

Content scripts also face risks from messaging. When your extension receives messages from web pages via the `runtime.onMessage` API, the sending page could be controlled by an attacker. Never assume that messages from content scripts are safe, even if they originate from your own extension pages.

### Popup and Options Page Security

Extension popup and options pages represent high-value targets because they often display sensitive information and have access to privileged APIs. These pages can be vulnerable to XSS through several mechanisms, including displaying user-controlled data, rendering content from storage, or processing messages from content scripts.

A common pattern that leads to vulnerabilities is storing user-provided data in extension storage and then rendering it without proper sanitization:

```javascript
// Retrieving and displaying stored user data unsafely
chrome.storage.local.get('userData', (result) => {
  const display = document.getElementById('display');
  display.innerHTML = result.userData;  // Vulnerable to XSS
});
```

Even data that users provide themselves can be dangerous if stored and rendered later—users might paste malicious content inadvertently, or an attacker with local access could modify storage directly.

### Message Passing Sanitization

The message passing system between extension components is another critical vector for XSS attacks. Content scripts frequently send messages to the background script or popup, carrying data extracted from web pages. Background scripts might then relay this data to other extension components or store it for later use. Each step in this chain represents a potential injection point if data is not properly sanitized.

When designing your extension's messaging architecture, implement input validation at every boundary. Verify the type, format, and length of incoming messages. Use allowlists for acceptable values rather than trying to filter out dangerous patterns. Apply sanitization before storing any external data and before rendering it in any context.

## The Dangers of innerHTML

The `innerHTML` property is one of the most common sources of XSS vulnerabilities in Chrome extensions. While convenient for manipulating DOM content, it parses HTML strings and executes any embedded scripts, making it inherently dangerous when used with untrusted data. Understanding when and how to avoid innerHTML is crucial for building secure extensions.

### Why innerHTML Executes Scripts

When you set `innerHTML` with a string containing `<script>` tags, the browser parses the HTML and executes any scripts it finds. This behavior is by design and allows legitimate use cases, but it creates severe security risks when handling user-controlled data:

```javascript
// This executes the embedded script!
document.getElementById('output').innerHTML = '<img src=x onerror="alert(1)">';
document.getElementById('output').innerHTML = '<a href="javascript:alert(1)">click</a>';
```

Even seemingly harmless HTML can be weaponized. Event handlers like `onerror`, `onload`, `onmouseover`, and countless others can execute arbitrary JavaScript. SVG elements, `<body onload>`, and `<iframe>` with `srcdoc` all provide additional execution vectors.

### Safe Alternatives to innerHTML

The safest approach is to avoid innerHTML entirely when working with untrusted data. Use `textContent` for text nodes, `setAttribute` for attributes, and `createElement`/`appendChild` for building complex structures:

```javascript
// Safe: Using textContent for user data
const userName = getUserInput();
const element = document.createElement('span');
element.textContent = userName;  // Text is automatically escaped
document.getElementById('container').appendChild(element);

// Safe: Using setAttribute for attributes
const url = getUserInput();
const link = document.createElement('a');
link.setAttribute('href', url);
link.textContent = 'Visit link';
document.getElementById('links').appendChild(link);
```

For cases where you genuinely need HTML rendering, such as displaying formatted user content, you must use a sanitization library that removes dangerous elements while preserving safe formatting.

## DOMPurify Integration

DOMPurify is the gold standard for sanitizing HTML in browser environments. It uses a robust whitelist-based approach to strip dangerous content while preserving safe HTML elements and attributes. Integrating DOMPurify into your Chrome extension provides reliable protection against XSS attacks when you need to render HTML content.

### Installing and Configuring DOMPurify

DOMPurify can be included directly in your extension or loaded from a trusted CDN. For security-critical applications, bundling DOMPurify with your extension is recommended to ensure you control the version and eliminate CDN compromise risks:

```html
<!-- In your popup.html or content script -->
<script src="dompurify/dist/purify.min.js"></script>
```

For Manifest V3 extensions with strict CSP that blocks external scripts, you may need to include DOMPurify as a bundled file:

```javascript
// Import DOMPurify in your JavaScript
import DOMPurify from './lib/dompurify/dist/purify.min.js';
```

DOMPurify can be configured to match your specific requirements. The default configuration is conservative and suitable for most use cases, but you can customize it for specialized requirements:

```javascript
// Configure DOMPurify with specific settings
const clean = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: ['class'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['style', 'script'],
  FORBID_ATTR: ['onerror', 'onclick']
});
```

### Using DOMPurify in Extension Contexts

DOMPurify should be used consistently whenever you need to render HTML that originates from external sources. This includes data from web pages, user input, storage, messages from content scripts, and any other untrusted source:

```javascript
// Safe rendering with DOMPurify
function displayUserContent(content) {
  const container = document.getElementById('content');
  const clean = DOMPurify.sanitize(content);
  container.innerHTML = clean;  // Now safe to use innerHTML
}

// Example with extension storage
chrome.storage.local.get(['savedContent'], (result) => {
  if (result.savedContent) {
    const display = document.getElementById('display');
    display.innerHTML = DOMPurify.sanitize(result.savedContent);
  }
});
```

Remember that DOMPurify should be applied at the point of rendering, not at the point of storage. Sanitizing on display allows you to maintain the original data while protecting users when content is rendered.

## Trusted Types API

Trusted Types provide a modern, browser-enforced mechanism for preventing XSS attacks by requiring that certain DOM operations use typed objects instead of strings. When properly implemented, Trusted Types can eliminate entire categories of XSS vulnerabilities at runtime.

### Enabling Trusted Types in Extensions

Trusted Types can be enabled for extension pages through CSP headers. In Manifest V3, you add Trusted Types directives to your extension's CSP in manifest.json:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'"
  }
}
```

Once enabled, the browser will block string-based assignments to dangerous sinks like `innerHTML`, `outerHTML`, and `document.write`. Instead, you must create trusted type objects:

```javascript
// With Trusted Types enabled, this throws an error:
element.innerHTML = '<div>user data</div>';

// You must use a Trusted Type instead:
const trusted = trustedTypes.createHTML('<div>user data</div>');
element.innerHTML = trusted;
```

### Integrating DOMPurify with Trusted Types

DOMPurify returns a Trusted Type when Trusted Types are enabled, making it compatible with the enforced policy:

```javascript
// DOMPurify integrates with Trusted Types
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => DOMPurify.sanitize(input)
});

const clean = policy.createHTML(userInput);
document.getElementById('container').innerHTML = clean;  // Works!
```

This combination provides defense in depth—DOMPurify sanitizes the content while Trusted Types enforce that sanitization is used consistently throughout your codebase.

## The Sanitizer API

The Sanitizer API is a newer browser standard that provides built-in HTML sanitization without external libraries. While not yet as widely supported as DOMPurify, it represents the future of browser-based sanitization and offers a native solution for modern extensions.

### Using the Built-in Sanitizer

The Sanitizer API provides a straightforward method for sanitizing HTML:

```javascript
// Using the built-in Sanitizer API
const sanitizer = new Sanitizer();
const clean = sanitizer.sanitizeFromString('<div>user content</div>');
element.replaceChildren(clean);
```

The API allows configuration through constructor options:

```javascript
// Configure the sanitizer
const sanitizer = new Sanitizer({
  allowElements: ['b', 'i', 'em', 'strong', 'p'],
  blockElements: ['script', 'iframe'],
  dropAttributes: {
    'all': ['onerror', 'onclick', 'onload']
  }
});
```

### Browser Support Considerations

The Sanitizer API is currently supported in Chrome, Edge, and other Chromium-based browsers but may not be available in Firefox or Safari. For maximum compatibility, consider using DOMPurify as your primary solution while adding Sanitizer API support as an enhancement for browsers that support it:

```javascript
// Feature detection with fallback
function sanitizeHTML(input) {
  if (window.Sanitizer) {
    const sanitizer = new Sanitizer();
    return sanitizer.sanitizeFromString(input);
  } else if (window.DOMPurify) {
    return DOMPurify.sanitize(input);
  } else {
    // Fallback for older browsers - consider warning users
    return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

## Content Security Policy as a Defense Layer

Content Security Policy serves as your extension's primary defense against XSS attacks, providing browser-enforced restrictions on what resources can be loaded and executed. A properly configured CSP can prevent XSS attacks from succeeding even when vulnerabilities exist in your code.

### Configuring Extension CSP

In Manifest V3, you configure CSP in your manifest.json file. For maximum security, use strict policies that limit script sources and disable dangerous features:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.example.com; object-src 'none'; base-uri 'self'"
  }
}
```

Key directives for XSS prevention include:
- `script-src 'self'`: Only allow scripts from your extension's origin
- `object-src 'none'`: Prevent plugin-based attacks by blocking object loading
- `base-uri 'self'`: Prevent base URL manipulation attacks
- `require-trusted-types-for 'script'`: Enable Trusted Types enforcement

For more detailed guidance on configuring CSP for Chrome extensions, see our [Chrome Extension Content Security Policy guide](/chrome-extension-guide/guides/chrome-extension-content-security-policy/).

### CSP Reporting

Configure CSP violation reporting to detect attacks and configuration issues in production:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; ...; report-uri https://your-api.com/csp-reports"
  }
}
```

Violations reported through this mechanism help you identify potential security issues before attackers can exploit them.

## Automated Security Scanning

Automated tools help identify XSS vulnerabilities during development before they reach production. Integrating security scanning into your development workflow catches issues early and reduces the risk of shipping vulnerable code.

### Extension-Specific Security Tools

Several tools specialize in Chrome extension security analysis:

**ESLint with Security Plugins**: Configure ESLint to detect potentially dangerous patterns in your code:

```bash
npm install --save-dev eslint eslint-plugin-security
```

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  rules: {
    'security/detect-unsafe-regex': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandom-bytes': 'error'
  }
};
```

**OWASP Dependency Check**: Scan your dependencies for known vulnerabilities:

```bash
npm install --save-dev owasp-dependency-check
npx dependency-check --assembly "Chrome Extension" --path .
```

### Regular Security Audits

Conduct periodic security audits of your extension, reviewing code that handles external data, processes user input, or manipulates the DOM. Pay special attention to:
- All uses of `innerHTML`, `outerHTML`, and `document.write`
- Event handlers that execute strings as code
- Message handlers that process external data
- Storage retrieval and display logic

For comprehensive security hardening guidance, see our [Chrome Extension Security Hardening guide](/chrome-extension-guide/guides/chrome-extension-security-hardening/).

## OWASP for Extensions

The Open Web Application Security Project (OWASP) provides resources specifically relevant to browser extension security. While OWASP's traditional Top 10 focuses on web applications, the organization has produced extension-specific guidance that addresses the unique security challenges of browser extensions.

### OWASP Chrome Extension Considerations

Key OWASP principles adapted for extensions include:

**A1 - Injection**: Apply the same injection prevention techniques used for web applications, with additional attention to content script contexts where page data is inherently untrusted.

**A2 - Broken Authentication**: Extension authentication often relies on tokens stored in extension storage or cookies. Ensure these are protected and consider using the identity API for secure authentication flows.

**A3 - Sensitive Data Exposure**: Extensions have access to sensitive browser data. Minimize the data your extension accesses, encrypt sensitive information in storage, and avoid logging sensitive values.

**A4 - XML External Entities (XXE)**: Extensions that parse XML should disable external entity processing to prevent XXE attacks.

**A5 - Broken Access Control**: Implement proper origin checking in message handlers and validate that requests originate from your extension's legitimate components.

### Extension-Specific OWASP Resources

The OWASP Magnesium project provides specific guidance for browser extension security. Review their recommendations and incorporate them into your security practices. Additionally, the Chrome Web Store has its own security review process—understanding these requirements helps you build extensions that pass review without security compromises.

## Conclusion

XSS prevention in Chrome extensions requires a comprehensive approach combining multiple defensive layers. Never rely on a single mitigation technique—instead, implement defense in depth through sanitization libraries like DOMPurify, browser-enforced protections like Trusted Types and CSP, secure coding practices that avoid dangerous APIs, and automated security scanning throughout development.

The unique privileges that Chrome extensions hold make security especially critical. A vulnerability in your extension can expose not just your users' data but potentially their entire browser session. By following the practices outlined in this guide, you build extensions that protect users from XSS attacks while maintaining the functionality they expect.

Remember that security is an ongoing process, not a one-time achievement. Review your code regularly, update your dependencies, stay informed about new attack vectors, and continuously improve your security posture. Your users trust you with their browsing experience—earning that trust means making security a fundamental part of your extension development practice.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
