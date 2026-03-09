---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Master XSS prevention in Chrome extensions with comprehensive coverage of innerHTML dangers, DOMPurify integration, Trusted Types API, message passing sanitization, content script security, and automated vulnerability scanning."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) vulnerabilities represent one of the most critical security threats facing Chrome extension developers. Unlike traditional web applications, Chrome extensions operate with elevated privileges and can access sensitive browser APIs, user data, and browsing history. A successful XSS attack against an extension can escalate into complete browser compromise, data exfiltration, and malicious manipulation of web pages. This comprehensive guide covers the extension-specific attack vectors, defensive strategies, and security patterns that every extension developer must understand to protect their users from XSS vulnerabilities.

## Understanding Extension-Specific XSS Vectors

Chrome extensions face unique XSS challenges that differ significantly from standard web applications. The extension ecosystem introduces multiple attack surfaces where malicious scripts can infiltrate your code. Understanding these vectors is essential for building secure extensions.

### Content Script Injection Risks

Content scripts run in the context of web pages, meaning they inherit all the risks associated with the pages they inject into. When your content script interacts with the host page's DOM, you expose yourself to DOM-based XSS vulnerabilities. Attackers can exploit the interaction between your extension and the page by manipulating elements, attributes, or event handlers that your code uses.

Consider a content script that reads data from page elements and displays it in an extension popup:

```javascript
// Dangerous: Reflecting page content without sanitization
document.getElementById('user-display').textContent = document.title;
```

While `textContent` is generally safe, the danger increases when you use `innerHTML` or when the page contains malicious payloads designed to exploit your extension's functionality. Pages can also use `postMessage` to communicate with your content script, and without proper origin validation, malicious pages can send crafted messages containing XSS payloads.

### Message Passing Vulnerabilities

Chrome extensions rely heavily on message passing between content scripts, background scripts, and extension pages. The `runtime.onMessage` and `runtime.sendMessage` APIs facilitate this communication, but they introduce significant security risks if not handled carefully. Any webpage can potentially send messages to your content script, and without validation, these messages can contain malicious HTML or JavaScript code.

The danger becomes apparent when extensions receive message content and render it without sanitization:

```javascript
// Vulnerable: Rendering message content as HTML
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  document.getElementById('output').innerHTML = message.content;
});
```

This pattern allows any website to send messages containing `<script>` tags or event handlers that execute arbitrary JavaScript in your extension's context. Attackers can exploit this by hosting malicious pages that send specially crafted messages to your content script.

### Popup and Options Page Security

Extension popups and options pages run in privileged contexts with access to extension APIs that regular web pages cannot access. This makes them attractive targets for XSS attacks. An XSS vulnerability in your popup can allow attackers to access the extension's storage, modify extension behavior, or steal sensitive data.

Popup XSS typically occurs when displaying user-generated content or data from external sources. If your popup renders HTML from a background script or receives data from a content script, you must treat all data as potentially malicious:

```javascript
// In popup.js - Vulnerable pattern
const container = document.getElementById('comments');
chrome.storage.local.get('userComments', (result) => {
  container.innerHTML = result.userComments; // Dangerous!
});
```

## The Dangers of innerHTML

The `innerHTML` property is one of the most common sources of XSS vulnerabilities in extensions. When you set `innerHTML`, the browser parses the string as HTML, which means any embedded `<script>` tags, event handlers, or JavaScript URLs will execute. This behavior makes innerHTML extremely dangerous for handling untrusted content.

### Why innerHTML Creates Vulnerabilities

When you assign a string to `innerHTML`, the browser performs HTML parsing, which includes executing script tags and evaluating JavaScript in event handlers. Consider what happens when an attacker controls all or part of the string:

```javascript
// User input containing malicious payload
const userInput = '<img src=x onerror="stealCookies()">';
document.getElementById('output').innerHTML = userInput;
```

In this example, the `onerror` event handler executes when the image fails to load, running the attacker's `stealCookies()` function. The script executes in your extension's context with all the privileges that entails.

### Safe Alternatives to innerHTML

Prefer `textContent` over `innerHTML` whenever possible. The `textContent` property sets the text as plain text, completely safe from HTML injection:

```javascript
// Safe: Using textContent
document.getElementById('output').textContent = untrustedData;
```

When you must create complex DOM structures, use `document.createElement` and `document.createTextNode`:

```javascript
// Safe: Building DOM programmatically
const container = document.getElementById('output');
const heading = document.createElement('h2');
heading.textContent = untrustedData;
container.appendChild(heading);
```

For setting individual attributes, use `setAttribute` with careful validation:

```javascript
// Safer: Setting attributes individually
const link = document.createElement('a');
link.setAttribute('href', validateUrl(url));
link.setAttribute('target', '_blank');
link.textContent = linkText;
```

## DOMPurify Integration

DOMPurify is the gold standard for sanitizing HTML in JavaScript applications. It strips dangerous HTML while preserving safe formatting elements. Integrating DOMPurify into your extension provides robust protection against XSS attacks.

### Installing DOMPurify

DOMPurify can be installed via npm or included directly in your extension:

```bash
npm install dompurify
```

For Manifest V3 extensions, you can bundle DOMPurify with your extension files or load it from a trusted CDN with Subresource Integrity:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"
        integrity="sha384-cO4nQmyzCuY5QqQqJ3KtTyvvxM3teXb2lLp0c1iZ6X5R2RNOQ7h3QGLk1lT/3u"
        crossorigin="anonymous"></script>
```

### Using DOMPurify in Extensions

DOMPurify integrates seamlessly with extension contexts:

```javascript
// Sanitize HTML before rendering
const clean = DOMPurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOW_DATA_ATTR: false
});

document.getElementById('output').innerHTML = clean;
```

The configuration options allow you to define exactly which tags and attributes are permitted. For most extension use cases, restrict to a minimal set of safe elements. You can also use DOMPurify in your content scripts, background scripts, and popup pages.

### DOMPurify with Trusted Types

For maximum security, combine DOMPurify with the Trusted Types API:

```javascript
// Using DOMPurify with Trusted Types
const policy = trustedTypes.createPolicy('default', {
  createHTML: (input) => DOMPurify.sanitize(input)
});

// Later in your code
const sanitized = policy.createHTML(userInput);
element.innerHTML = sanitized; // Works with Trusted Types
```

This combination provides defense-in-depth: DOMPurify sanitizes the content, and Trusted Types prevents accidental innerHTML usage elsewhere in your codebase.

## The Trusted Types API

Trusted Types is a browser security feature that helps prevent DOM-based XSS by allowing you to write secure code that avoids dangeroussink functions. When enabled, the browser throws exceptions when code tries to use potentially dangerous DOM APIs with string values, forcing developers to use typed objects instead.

### Enabling Trusted Types

Add a Content Security Policy header that enables Trusted Types:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; trusted-types default"
  }
}
```

### Working with Trusted Types

Trusted Types require you to use specific object types instead of strings for dangerous operations:

```javascript
// Instead of string assignment
element.innerHTML = '<div>Content</div>'; // Throws error with Trusted Types

// Use TrustedHTML
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => DOMPurify.sanitize(input)
});
element.innerHTML = policy.createHTML('<div>Content</div>'); // Works
```

While Trusted Types require more initial setup, they provide strong guarantees against XSS by making insecure patterns raise runtime errors.

## Message Passing Sanitization

Secure message handling is critical for extension security. Every message received from content scripts, background scripts, or extension pages must be treated as potentially malicious.

### Validating Message Origins

Always validate the sender of messages in your `onMessage` listener:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender origin for content script messages
  if (sender.url && !sender.url.startsWith('https://trusted-site.com')) {
    console.error('Rejected message from untrusted origin:', sender.url);
    return false;
  }

  // Process message only after validation
  handleMessage(message);
  return true;
});
```

### Sanitizing Message Content

Never render message content directly without sanitization:

```javascript
// Secure message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const displayElement = document.getElementById('display');

  // Always sanitize before innerHTML
  if (message.htmlContent) {
    displayElement.innerHTML = DOMPurify.sanitize(message.htmlContent, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span'],
      ALLOWED_ATTR: ['class']
    });
  } else if (message.textContent) {
    // Prefer textContent for simple text
    displayElement.textContent = message.textContent;
  }

  return true;
});
```

### Implementing a Message Sanitizer

Create a utility function that consistently sanitizes all message data:

```javascript
const MessageSanitizer = {
  sanitize(obj) {
    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj, { RETURN_TRUSTED_TYPE: true });
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = this.sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  }
};
```

## Content Script Injection Security

Content scripts operate in a unique security context—they have access to extension APIs but run in the context of web pages. This creates specific security considerations.

### Isolating Content Script Context

Use the `world` property in Manifest V3 to control whether your content script runs in the page's JavaScript context or the isolated world:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "world": "ISOLATED"
  }]
}
```

The `ISOLATED` world (default) keeps your content script separate from page scripts, providing better security. The `MAIN` world shares the DOM but runs in a separate JavaScript context.

### Avoiding Page Script Interference

Page scripts can potentially detect and interfere with your content script. To minimize this risk:

```javascript
// Check if your context is properly isolated
if (typeof window.extensionAPI !== 'undefined') {
  console.warn('Potential interference detected');
}
```

Avoid using global variables that page scripts could access:

```javascript
// Instead of global variables
(function() {
  const privateState = 'hidden from page';

  function processData(data) {
    // Your logic here
  }

  chrome.runtime.onMessage.addListener(processData);
})();
```

## CSP as a Defense Layer

Content Security Policy provides an additional layer of defense against XSS. While CSP doesn't replace input sanitization, it significantly reduces the impact of any vulnerabilities that slip through.

### Configuring Extension CSP

In Manifest V3, configure CSP in your manifest.json:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
  }
}
```

### Strict CSP for Extension Pages

Apply stricter CSP to popup and options pages:

```javascript
// In popup or options page HTML
<meta http-equiv="Content-Security-Policy" content="script-src 'self'; object-src 'none';">
```

For maximum security, avoid `'unsafe-inline'` for scripts and styles. If you must allow inline styles, use nonces or hashes:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; style-src 'self' 'sha256-abc123...';"
  }
}
```

## The Sanitizer API

The Sanitizer API is a native browser API that provides built-in HTML sanitization. It's designed to be a secure-by-default alternative to innerHTML:

```javascript
// Using the Sanitizer API
const sanitizer = new Sanitizer({
  allowElements: ['b', 'i', 'em', 'strong', 'a'],
  allowAttributes: { 'href': ['a'] }
});

const element = document.getElementById('target');
element.setHTML('<b>Bold</b> and <script>alert(1)</script>', { sanitizer });
```

The Sanitizer API automatically removes dangerous elements like `<script>` and event handlers while preserving safe formatting.

## Automated Security Scanning

Regular security scanning helps identify vulnerabilities before they reach production. Building automated security checks into your development workflow catches issues early and prevents them from reaching users.

### Using Static Analysis Tools

Integrate security scanning into your development workflow:

```bash
# Install security tooling
npm install --save-dev eslint-plugin-security
npx eslint --plugin=security --rule 'no-inner-html: error' your-script.js
```

ESLint with the security plugin can detect dangerous patterns like innerHTML usage, eval() calls, and other common vulnerability sources. Configure it to fail builds when security issues are detected:

```javascript
// .eslintrc.json
{
  "plugins": ["security"],
  "rules": {
    "security/no-inner-html": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-possible-timing-attacks": "warn"
  }
}
```

### Dependency Vulnerability Scanning

Your extension's dependencies can introduce vulnerabilities. Use tools like npm audit, Snyk, or GitHub Dependabot to track and remediate dependency vulnerabilities:

```bash
# Check for known vulnerabilities
npm audit

# Or use Snyk for continuous monitoring
npx snyk test
```

### Dynamic Security Testing

Consider incorporating dynamic analysis tools that test your running extension:

```javascript
// Example: Testing message handling
function testMessageSanitization() {
  const maliciousPayloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '<a href="javascript:alert(1)">click</a>'
  ];

  maliciousPayloads.forEach(payload => {
    const result = DOMPurify.sanitize(payload);
    if (result.includes('<script') || result.includes('onerror') || result.includes('javascript:')) {
      console.error('Sanitization failed for:', payload);
    }
  });
}
```

### OWASP for Extensions

The OWASP Foundation provides security guidance applicable to Chrome extensions. Key resources include:

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — Understanding common web vulnerabilities
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/) — Security best practices
- [DOMPurify](https://github.com/cure53/DOMPurify) — OWASP-sanctioned sanitization library
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — Application security verification standard

While there's no specific "OWASP for Chrome Extensions," the principles from [OWASP's DOM-based XSS](https://owasp.org/www-community/attacks/DOM_Based_XSS) guidance directly apply to extension development. The [OWASP Mobile Application Security](https://mas.owasp.org/) project also provides relevant security patterns for extension development.

### Continuous Security Auditing

Implement automated checks in your CI/CD pipeline:

```yaml
# Example GitHub Actions security workflow
name: Security Audit
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      - name: Run ESLint security
        run: npx eslint --plugin=security .
      - name: Check dependencies
        run: npx retire --path ./dist
      - name: Snyk vulnerability scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## Common Attack Patterns to Defend Against

Understanding how attackers exploit XSS vulnerabilities helps you build better defenses. Several attack patterns are particularly relevant to Chrome extensions.

### Stored XSS in Extension Storage

Attackers can store malicious payloads in extension storage that later executes when viewed by other users or in different contexts:

```javascript
// Vulnerable: Rendering stored content without sanitization
chrome.storage.local.get('userData', (result) => {
  document.getElementById('profile').innerHTML = result.userData;
});
```

The fix requires sanitizing all data before storage and before display:

```javascript
// Secure: Sanitize on input and output
chrome.storage.local.get('userData', (result) => {
  const sanitized = DOMPurify.sanitize(result.userData);
  document.getElementById('profile').innerHTML = sanitized;
});
```

### Reflected XSS Through URL Parameters

Extensions that read URL parameters and display them without sanitization are vulnerable:

```javascript
// Vulnerable: Reflecting URL parameters
const params = new URLSearchParams(window.location.search);
const name = params.get('name');
document.getElementById('greeting').innerHTML = `Hello, ${name}`;
```

An attacker could craft a URL like `chrome-extension://[id]/popup.html?name=<script>...</script>` to execute XSS.

### DOM Clobbering

DOM clobbering occurs when attackers inject elements that override native DOM properties:

```html
<!-- Malicious page can clobber document methods -->
<form name="getElementById">
  <button id="x">Malicious button</button>
</form>
```

This can cause your JavaScript to behave unexpectedly. Use defensive coding practices:

```javascript
// Safer: Use direct method references
const getElement = document.getElementById;
const element = getElement('myId');
```

### Event Handler Injection

Attackers can inject malicious event handlers:

```javascript
// Vulnerable: Setting event handlers from user input
element.setAttribute('onclick', userInput);
```

Always validate and sanitize any data used in event handlers, or use addEventListener instead:

```javascript
// Secure: Using addEventListener with validated handler
element.addEventListener('click', () => {
  handleClick(validData);
});
```

## Best Practices Summary

Building secure Chrome extensions requires consistent attention to security throughout development. Follow these core principles to minimize XSS vulnerabilities.

### Defense in Depth

Never rely on a single security measure. Layer multiple protections so that even if one fails, others provide backup defense. Combine CSP, input sanitization, Trusted Types, and secure coding practices.

### Least Privilege

Request only the permissions your extension actually needs. Minimize the attack surface by limiting access to sensitive APIs and restricting content script matching to necessary domains.

### Validate and Sanitize Everything

Treat all data as potentially malicious—input from users, data from web pages, messages from content scripts, and data from external APIs. Sanitize before display, and validate before use.

### Keep Dependencies Updated

Regularly update DOMPurify and other security-critical dependencies. Monitor vulnerability databases and apply security patches promptly.

### Test Security Regularly

Incorporate security testing into your development workflow. Use static analysis, dynamic testing, and manual code review to catch vulnerabilities before release.

---

## Related Guides

Security requires a layered approach. Explore these related guides to strengthen your extension's defenses:

- [Chrome Extension Security Hardening](/guides/chrome-extension-security-hardening.md) — Comprehensive security measures for extensions
- [Security Best Practices](/guides/security-best-practices.md) — Foundational security concepts
- [Security Hardening](/guides/security-hardening.md) — Advanced hardening techniques
- [CSP Troubleshooting](/guides/csp-troubleshooting.md) — Debugging Content Security Policy issues

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
