---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Learn how to prevent cross-site scripting (XSS) vulnerabilities in Chrome extensions with comprehensive coverage of DOMPurify, Trusted Types, message sanitization, content script risks, and defense-in-depth security strategies."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) remains one of the most dangerous and prevalent vulnerabilities affecting Chrome extensions. Unlike traditional web applications, extensions operate with elevated privileges, access to sensitive browser APIs, and often handle confidential user data. A successful XSS attack against an extension can compromise not just the extension itself but potentially the entire browser session, including cookies, tokens, and browsing history. This guide provides comprehensive coverage of XSS prevention techniques specifically tailored for Chrome extension development.

Understanding XSS in the extension context requires recognizing that the attack surface extends far beyond typical web applications. Extensions interact with multiple contexts—background scripts, content scripts, popup pages, options pages, and sandboxed pages—each presenting unique XSS vectors. Attackers may exploit vulnerabilities in any of these contexts to inject malicious scripts that execute with the extension's elevated permissions.

## Extension-Specific XSS Vectors

Chrome extensions face XSS risks from several unique vectors that don't exist in traditional web applications. The communication channels between different extension components create potential injection points, and the privileged nature of extension APIs amplifies the impact of any successful attack.

### Content Script Injection Risks

Content scripts execute in the context of web pages, which means they inherit all the XSS vulnerabilities present on those pages while also having access to extension APIs. This dual exposure creates a dangerous combination: an attacker who finds an XSS vulnerability on a webpage can potentially escalate it to access extension functionality.

When your content script uses `document.write()` or modifies the DOM using innerHTML with data from the page, you're exposing your extension to reflected XSS attacks from malicious websites. Even worse, if your content script exposes any functionality through the messaging API, attackers can potentially invoke it from compromised pages.

Consider a content script that displays notifications based on page content:

```javascript
// DANGEROUS: Never do this in content scripts
function showNotification(message) {
  const notification = document.createElement('div');
  notification.innerHTML = message; // Direct innerHTML usage
  document.body.appendChild(notification);
}

// Even this pattern is dangerous:
browser.runtime.onMessage.addListener((request) => {
  if (request.action === 'showAlert') {
    document.getElementById('alertBox').innerHTML = request.message;
  }
});
```

The first example directly injects page content into the DOM without sanitization. The second example accepts messages from the extension's background script without validating the source, potentially allowing malicious pages to trigger dangerous DOM operations.

### Message Passing Sanitization

The Chrome extension messaging API is a critical attack vector that requires careful sanitization. Messages can originate from multiple sources—content scripts running on arbitrary websites, other extensions, or even the extension's own popup and background scripts. Never trust the source of a message without proper validation.

Always validate message senders using the `sender` parameter provided to message listeners:

```javascript
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validate sender is from a trusted origin
  if (!sender.url || !sender.url.startsWith('https://trusted-domain.com')) {
    console.error('Rejected message from untrusted origin:', sender.url);
    return false;
  }

  // Sanitize any data before using it
  const sanitizedData = DOMPurify.sanitize(request.data);
  processData(sanitizedData);

  return true;
});
```

Message passing between extension components should also follow the principle of least privilege. Background scripts should validate all incoming messages from content scripts, and popup scripts should never blindly execute commands received from content scripts without validation.

### Popup and Options Page Security

Popup and options pages run in the extension's context with access to extension APIs, making them high-value targets for XSS attacks. These pages often display user data, configuration options, and extension status information—all of which could be valuable to attackers.

Any user-controlled data displayed in popups or options pages must be sanitized before rendering. This includes data stored in extension storage, data received from external APIs, and data passed through URL parameters when opening options pages.

The options page URL pattern is particularly risky:

```javascript
// Opening options page with parameters - DANGEROUS
browser.runtime.openOptionsPage();
// Or directly:
browser.tabs.create({ url: 'options.html?user=' + username });
```

If you must pass data to options pages, use the storage API instead of URL parameters:

```javascript
// Safer approach: store data first, then open options
async function openOptionsWithData(data) {
  await browser.storage.local.set({ pendingData: data });
  browser.runtime.openOptionsPage();
}
```

## The Dangers of innerHTML

The `innerHTML` property is perhaps the most common source of XSS vulnerabilities in extension development. When you set innerHTML with untrusted data, the browser parses the HTML and executes any embedded scripts, event handlers, or javascript: URLs. This behavior makes innerHTML extremely dangerous for any data that originates outside your extension's controlled codebase.

The fundamental problem is that innerHTML performs HTML parsing, not text insertion. Any HTML structure you insert becomes live DOM content, complete with executable scripts:

```javascript
// This creates a working script element:
document.getElementById('output').innerHTML = '<img src=x onerror="maliciousCode()">';
```

For text content, always use `textContent` instead:

```javascript
// Safe: textContent treats input as plain text
document.getElementById('output').textContent = userInput;

// For user-controlled HTML, you MUST sanitize first:
document.getElementById('output').innerHTML = DOMPurify.sanitize(userInput);
```

When you absolutely must render HTML content—user-generated content, formatted messages, or third-party templates—use a sanitization library to strip dangerous elements while preserving safe formatting.

## DOMPurify Integration

DOMPurify is the industry-standard library for sanitizing HTML and preventing XSS attacks. It parses HTML using a browser-compliant parser, traverses the DOM tree, and removes any content that could lead to script execution while preserving safe HTML elements and attributes.

Installing DOMPurify in your extension is straightforward:

```bash
npm install dompurify
```

Then import it in your scripts:

```javascript
import DOMPurify from 'dompurify';

// Basic sanitization
const clean = DOMPurify.sanitize(dirty);

// Strict sanitization with custom configuration
const strictClean = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: [],
  FORBID_TAGS: ['script', 'style', 'iframe'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload']
});
```

For extensions, consider these DOMPurify configuration best practices:

First, be as restrictive as possible with allowed tags and attributes. Start with minimal allowed elements and add only what's necessary for your use case. Second, always specify ALLOWED_URI_REGEXP to prevent javascript: and data: URLs in attributes. Third, use the `ADD_TAGS` and `ADD_ATTR` options to extend sanitization rather than removing restrictions.

For content scripts specifically, you may want to configure DOMPurify to use the windowless document created for the page context:

```javascript
// For content scripts, use the page's document
const clean = DOMPurify.sanitize(dirty, {
  document: document, // Use page's document context
  WHOLE_DOCUMENT: true
});
```

## The Trusted Types API

Trusted Types provide a powerful browser-native defense against DOM XSS by allowing you to lock down dangerous DOM sinks. When you enable Trusted Types, the browser rejects any assignment to protected properties unless it uses a Trusted Type object.

Enabling Trusted Types in your extension requires adding a Content Security Policy directive and then migrating your code to use Trusted Type creators:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; trusted-types default"
  }
}
```

Once enabled, you must replace dangerous DOM assignments with their Trusted Type equivalents:

```javascript
// Before (dangerous):
element.innerHTML = userInput;

// After (with Trusted Types):
const policy = trustedTypes.createPolicy('default', {
  createHTML: (input) => DOMPurify.sanitize(input)
});
element.innerHTML = policy.createHTML(userInput);
```

Trusted Types work exceptionally well with DOMPurify—use DOMPurify for the sanitization logic and Trusted Types to enforce its use at the API level. This combination ensures that even if a developer accidentally uses innerHTML directly, the browser will block the assignment.

The Trusted Types API also supportsTrustedScript and TrustedScriptURL for other dangerous sinks. Review the [Content Security Policy guide](/guides/chrome-extension-content-security-policy.md) for comprehensive coverage of CSP configuration for extensions.

## The Sanitizer API

The native Sanitizer API provides browser-built-in HTML sanitization without external dependencies. Currently supported in modern browsers, it offers a standards-compliant approach to sanitization that integrates with the browser's security model:

```javascript
const sanitizer = new Sanitizer();
const clean = sanitizer.sanitizeFromString(userInput);
element.replaceChildren(sanitizer.parseFragment(userInput));
```

The Sanitizer API provides sensible defaults that block script execution while preserving semantic HTML. You can customize its behavior with configuration options:

```javascript
const sanitizer = new Sanitizer({
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: {
    'a': ['href']
  }
});
```

While the Sanitizer API is promising, DOMPurify remains more feature-complete and battle-tested for extension use cases. Consider using the Sanitizer API for simple use cases or as a defense-in-depth layer, but rely on DOMPurify for complex sanitation requirements.

## Content Security Policy as a Defense Layer

Content Security Policy provides the foundational security layer for Chrome extensions, defining what resources can load and execute. A properly configured CSP prevents XSS attacks by blocking inline script execution, restricting resource loading to trusted sources, and preventing the use of dangerous protocols.

Review the [Chrome Extension Content Security Policy](/guides/chrome-extension-content-security-policy.md) guide for detailed configuration options. Key CSP directives for XSS prevention include:

- `script-src 'self'`: Block inline scripts and only allow scripts from your extension
- `object-src 'none'`: Prevent Flash and other plugin-based attacks
- `style-src 'self' 'unsafe-inline'`: Carefully consider inline styles
- `base-uri 'self'`: Prevent base URL hijacking

The most important CSP configuration for XSS prevention is eliminating inline scripts. Even with sanitization, preventing inline script execution removes an entire attack vector:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self'"
  }
}
```

## Automated Security Scanning

Automated tools help identify XSS vulnerabilities during development but should supplement, not replace, manual security review. Several tools are particularly effective for extension security:

**Static Analysis Tools:**

- ESLint with security plugins can detect dangerous patterns like innerHTML usage
- CodeQL provides sophisticated taint analysis for JavaScript
- npm audit analyzes your dependencies for known vulnerabilities

**Dynamic Testing:**

- Puppeteer or Playwright can simulate XSS attacks against your extension
- Fuzz testing tools can discover edge cases in sanitization

**Extension-Specific Scanning:**

- The Chrome Web Store pre-submit review catches some security issues
- Consider using the [Extension Security Hardening](/guides/chrome-extension-security-hardening.md) checklist during development

Integrate security scanning into your CI pipeline to catch vulnerabilities before they reach production:

```yaml
# Example GitHub Actions security step
- name: Security Audit
  run: |
    npm audit
    npx eslint --ext .js src/
    npx dompurify-audit
```

## OWASP for Extensions

The Open Web Application Security Project provides guidance specifically relevant to extension security. The OWASP Top 10 includes XSS as a persistent threat, and their extension-specific guidance highlights several key considerations:

1. **Injection** includes XSS but also covers SQL, NoSQL, and command injection. Extensions rarely face SQL injection since they don't typically use databases, but XSS remains highly relevant.

2. **Insecure Design** applies to extensions—consider threat modeling during architecture design. Identify all data flows and determine where sanitization must occur.

3. **Security Misconfiguration** is particularly relevant given the complexity of extension CSP, permissions, and manifest configuration.

4. **Vulnerable and Outdated Components** affects extensions that depend on npm packages—regular dependency updates are essential.

Review the [OWASP Top 10](https://owasp.org/www-project-top-ten/) and adapt the guidance to your extension's architecture. The [Security Best Practices](/guides/security-best-practices.md) guide provides additional extension-specific recommendations.

## Implementing Defense in Depth

XSS prevention requires layered defenses—each measure alone may have gaps, but together they provide robust protection. Your defense strategy should include:

1. **CSP as the foundation**: Configure strict CSP to block inline scripts and restrict resource loading
2. **Trusted Types enforcement**: Enable Trusted Types to prevent dangerous DOM assignments
3. **Input sanitization**: Use DOMPurify for any HTML that might contain user data
4. **Output encoding**: Use textContent for plain text, sanitize for HTML
5. **Message validation**: Verify sender origins on all messaging endpoints
6. **Content script isolation**: Minimize content script privileges and validate all data from pages
7. **Regular auditing**: Include security review in your development process

No single defense is foolproof—skilled attackers continually find ways to bypass individual protections. The combination of CSP, sanitization libraries, Trusted Types, and careful coding practices creates multiple barriers that make exploitation extremely difficult.

---

## Related Guides

Continue your security learning with these related guides:

- [Content Security Policy](/guides/chrome-extension-content-security-policy.md) — Configure CSP headers to prevent XSS attacks
- [Security Hardening](/guides/chrome-extension-security-hardening.md) — Advanced hardening techniques for extension protection
- [Security Best Practices](/guides/security-best-practices.md) — Foundational security concepts for extension developers
- [Extension Security Audit](/guides/extension-security-audit.md) — Comprehensive security review checklist

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
