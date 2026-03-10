---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Master XSS prevention in Chrome extensions. Learn about extension-specific attack vectors, DOMPurify integration, Trusted Types API, message passing sanitization, and defense-in-depth strategies for secure extension development."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) represents one of the most critical security vulnerabilities affecting Chrome extensions. While web applications have well-established XSS mitigation practices, extensions face unique challenges due to their elevated privileges, multiple execution contexts, and complex messaging systems. A single XSS vulnerability in an extension can expose users' browsing data, authentication tokens, and sensitive information to malicious actors. This comprehensive guide explores the extension-specific attack vectors that make XSS particularly dangerous in this context, alongside practical implementation strategies for building secure extensions that protect users from these threats.

Understanding XSS in the extension ecosystem requires recognizing that extensions operate with capabilities far beyond those of regular web pages. Extensions can access the Chrome API, read and modify web page content, manage cookies, and interact with browser tabs. When an extension suffers from an XSS vulnerability, attackers gain access to these powerful capabilities, making the impact far more severe than traditional web XSS attacks. The Chrome Web Store has removed numerous extensions due to XSS vulnerabilities, and understanding these risks is essential for any extension developer who wants to create secure, trustworthy software.

## Extension-Specific XSS Vectors

Chrome extensions present several unique attack vectors that developers must understand to build secure applications. Unlike standard web applications, extensions have multiple entry points where untrusted data can enter the system. Content scripts execute in the context of web pages, where they can receive messages from the page itself. Background scripts handle messages from content scripts and extension pages. Popup pages and options pages display user interfaces that may render external data. Each of these contexts represents a potential XSS vector if proper sanitization is not applied.

The most common extension XSS vector involves content scripts receiving data from web pages and rendering it without proper sanitization. Web pages can send messages to content scripts using the `window.postMessage` API or by injecting script tags that interact with the content script's context. Developers who trust messages from web pages without validation create vulnerabilities that attackers can exploit. A malicious website can send specially crafted messages designed to execute arbitrary JavaScript when the content script processes and renders the data.

Another significant vector involves the extension's popup and options pages loading external URLs in iframes or directly. If an extension displays user-provided URLs or data from external APIs in its popup without proper sanitization, attackers can inject malicious scripts that execute in the extension's privileged context. This is particularly dangerous because extension popup pages have access to the Chrome API, meaning successful exploitation grants attackers access to browser history, bookmarks, passwords stored in the extension, and other sensitive data.

Background scripts present additional attack surface through their message handling systems. Content scripts can send messages to background scripts, and background scripts can send messages to extension pages. If these messages contain malicious payloads that get rendered without sanitization, the entire extension becomes compromised. The communication channels between different extension components must treat all incoming data as potentially hostile and apply appropriate sanitization before processing or displaying it.

## The Dangers of innerHTML

The `innerHTML` property represents one of the most dangerous patterns in extension development when used with untrusted data. Setting `innerHTML` causes the browser to parse the provided string as HTML, executing any embedded script tags, event handlers, or other executable content. This behavior makes innerHTML fundamentally incompatible with handling user-generated content, data from external sources, or any information that originates outside the extension's trusted code.

Consider a content script that displays the page title to users:

```javascript
// DANGEROUS: Never do this with untrusted data
document.getElementById('title-display').innerHTML = pageTitle;
```

If an attacker controls the page title through meta tags, Open Graph tags, or JavaScript-injected content, they can embed malicious scripts that execute in the extension's context. The attacker's script would have access to the content script's environment, potentially allowing them to intercept messages, access page data, or communicate with the extension's background script.

The proper approach involves using `textContent` instead of `innerHTML` whenever possible. The `textContent` property sets text as plain text, ensuring that any HTML entities are escaped and no script execution occurs. For the example above, the safe implementation would be:

```javascript
// SAFE: Use textContent for untrusted text
document.getElementById('title-display').textContent = pageTitle;
```

When HTML rendering is genuinely necessary, developers must use a sanitization library that removes dangerous elements while preserving safe formatting. This is where DOMPurify becomes essential for extension security.

## DOMPurify Integration

[DOMPurify](https://github.com/cure53/DOMPurify) is a mature, well-audited sanitization library that removes malicious HTML while preserving safe markup. It is the de facto standard for sanitizing HTML in JavaScript applications and should be a core dependency for any extension that handles HTML content from untrusted sources. DOMPurify uses a whitelist approach, removing everything except known-safe elements and attributes by default, making it resilient against new attack techniques.

Installing DOMPurify in your extension is straightforward:

```bash
npm install dompurify
```

After installation, you can use it to sanitize HTML before rendering:

```javascript
import DOMPurify from 'dompurify';

// Sanitize HTML from potentially untrusted sources
const cleanHTML = DOMPurify.sanitize(userProvidedHTML, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: ['class'],
  ALLOW_DATA_ATTR: false
});

// Render the sanitized HTML safely
document.getElementById('content').innerHTML = cleanHTML;
```

The configuration options allow you to tailor the sanitization to your specific needs. The default configuration is already quite restrictive, removing all script tags, event handlers, and dangerous attributes. However, you should further restrict allowed tags and attributes based on what your extension actually needs to render. This defense-in-depth approach ensures that even if an attacker finds a way to bypass DOMPurify's default protections, they cannot use features your extension doesn't need.

For extensions that need to render more complex HTML, such as markdown renderers or rich text editors, DOMPurify can be configured with additional allowed tags and attributes while still maintaining security. The key is to audit your configuration regularly and ensure you're not allowing features that could be exploited. Many XSS vulnerabilities in extensions stem from overly permissive DOMPurify configurations that allow more HTML than necessary.

It's worth noting that DOMPurify should be used in content scripts, background scripts, and extension pages when displaying any HTML that didn't originate from your extension's own code. Even data that comes from your own backend API should be sanitized if it could contain user-generated content, as API compromises can inject malicious HTML into otherwise trusted data streams.

## Trusted Types API

The [Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API) provides a modern, browser-enforced approach to preventing XSS attacks. By enabling Trusted Types, you can instruct the browser to reject assignments to sensitive DOM properties (like `innerHTML`, `innerText`, and `insertAdjacentHTML`) unless the value is created through a trusted type policy. This makes it impossible to accidentally use innerHTML with a string, forcing developers to explicitly create trusted values through policy functions.

Enabling Trusted Types in your extension requires adding a Content Security Policy directive and implementing creation policies. In your manifest.json:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; require-trusted-types-for 'script'"
  }
}
```

Then implement a policy in your extension code:

```javascript
// Create a trusted types policy for HTML rendering
const htmlPolicy = trustedTypes.createPolicy('extension-html', {
  createHTML: (input) => DOMPurify.sanitize(input)
});

// Now innerHTML only accepts TrustedHTML, not plain strings
const trusted = htmlPolicy.createHTML('<p>User content here</p>');
element.innerHTML = trusted; // Works

element.innerHTML = '<p>User content</p>'; // Throws TypeError
```

Trusted Types provide an additional layer of defense beyond sanitization. Even if a developer accidentally attempts to use innerHTML with a raw string, the browser will block the operation, preventing potential XSS vulnerabilities. This is particularly valuable in larger codebases where multiple developers might work on different parts of the extension, as the browser enforces security at the API level.

Browser support for Trusted Types is excellent in modern browsers, and the Chrome Web Store encourages their use for new extensions. While full migration to Trusted Types can require significant refactoring, the security benefits make it worthwhile for extensions that handle sensitive data or have complex rendering requirements.

## Message Passing Sanitization

Chrome extensions rely heavily on message passing between content scripts, background scripts, and extension pages. Every message represents a potential attack vector if the receiving end doesn't properly validate and sanitize incoming data. This is especially critical because content scripts operate in the context of web pages, where attackers can send arbitrary messages designed to exploit vulnerabilities in the extension.

The `chrome.runtime.onMessage` listener should always validate incoming messages before processing them:

```javascript
// Always validate message structure
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check message type against expected formats
  if (!message || typeof message.action !== 'string') {
    console.warn('Invalid message received');
    return false;
  }

  // Validate message data based on action type
  switch (message.action) {
    case 'displayContent':
      if (typeof message.data?.html !== 'string') {
        sendResponse({ error: 'Invalid data format' });
        return false;
      }
      // Sanitize before use
      const sanitized = DOMPurify.sanitize(message.data.html);
      renderContent(sanitized);
      break;
    // Handle other actions...
  }

  sendResponse({ success: true });
  return true;
});
```

This pattern ensures that every message is validated before processing. The validation should check both the structure of the message and the content of any data fields. Even when messages come from within the extension itself, validation provides defense against compromised components and programming errors that might pass invalid data.

For extensions that use frame messaging or receive messages from web pages, additional validation is necessary. Content scripts should validate any data received from `window.postMessage` before passing it to background scripts or using it in the extension's DOM. Web pages can send arbitrary messages to content scripts, so treat all external messages as potentially hostile.

## Content Script Injection Risks

Content scripts face unique risks because they execute in the context of web pages, where attackers have full control over the environment. Malicious websites can attempt to inject code into content scripts, access content script variables, or intercept messages between content scripts and background scripts. Understanding these risks is essential for building secure extensions.

One common attack involves web pages attempting to overwrite or access content script functions. If your content script defines global functions or variables, malicious pages can attempt to access them through the shared DOM. The solution is to avoid globals in content scripts whenever possible and to use Immediately Invoked Function Expressions (IIFEs) to encapsulate code:

```javascript
// Wrap content script in IIFE to avoid global pollution
(function() {
  // Your content script code here
  // No globals exposed to the page
})();
```

Web pages can also attempt to send messages that appear to come from the content script using `window.postMessage`. Content scripts should verify the origin of incoming messages and not trust messages from unknown origins. Additionally, content scripts should use `window.postMessage` carefully, specifying an exact target origin rather than using `*`:

```javascript
// SECURE: Specify exact target origin
window.parent.postMessage(message, 'https://your-extension.com');

// AVOID: Using wildcard allows any origin to receive the message
window.parent.postMessage(message, '*');
```

Another consideration is that content scripts share the DOM with page scripts, which can manipulate elements the content script creates. Page scripts cannot directly read content script variables, but they can modify DOM elements that the content script relies upon. Always validate DOM state before making security decisions based on DOM content.

## Popup and Options Page Security

Extension popup and options pages represent high-value targets for attackers because they run in the extension's privileged context with access to Chrome APIs. These pages should treat all external data as potentially malicious and apply appropriate sanitization before rendering any HTML or executing any code derived from external sources.

If your extension's popup displays data from web pages, content scripts, or external APIs, that data must be sanitized before rendering. Even if the data comes from your own background script, it might have originated from an untrusted source. Apply the same sanitization rules you would use for directly user-generated content:

```javascript
// In popup.js - always sanitize data from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'pageData') {
    // Sanitize even internal data
    const sanitized = DOMPurify.sanitize(message.payload.html, {
      ALLOWED_TAGS: ['span', 'div', 'a'],
      ALLOWED_ATTR: ['class', 'href']
    });
    renderData(sanitized);
  }
});
```

Options pages that allow users to configure extension behavior should also validate and sanitize any user input before storing it or rendering it back to the user. While users might be unlikely to XSS themselves, storing unsanitized configuration values can lead to issues if those values are ever displayed in a different context or if the extension is compromised through another vector.

## Content Security Policy as a Defense Layer

Content Security Policy (CSP) serves as the foundation of extension security, providing a browser-enforced layer of protection against XSS and code injection attacks. For a comprehensive understanding of CSP implementation in Chrome extensions, see our [Chrome Extension Content Security Policy](/chrome-extension-guide/guides/chrome-extension-content-security-policy/) guide.

The default CSP for Manifest V3 extensions provides reasonable baseline protection, but custom policies can significantly enhance security. At minimum, your extension should implement these practices:

- **Avoid unsafe-inline**: Never use `'unsafe-inline'` in your script-src directive, as it defeats XSS protections
- **Avoid unsafe-eval**: The `'unsafe-eval'` directive allows `eval()` and similar functions that can execute arbitrary strings as code
- **Use nonces or hashes for inline scripts**: If you must have inline scripts, use nonces or hashes rather than allowing all inline scripts
- **Restrict object-src**: The `object-src` directive should be restricted to `'self'` or specific trusted sources

A robust CSP for extensions looks like:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src https://api.yourdomain.com"
  }
}
```

CSP acts as a safety net that can block XSS attacks even when other defenses fail. While sanitization libraries like DOMPurify are highly effective, CSP provides browser-level enforcement that protects against zero-day vulnerabilities and implementation mistakes.

## The Sanitizer API

The [Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/Sanitizer) is a modern, browser-native alternative to libraries like DOMPurify. Currently supported in Chrome and other Chromium-based browsers, this API provides built-in HTML sanitization without requiring external dependencies. For extensions targeting modern browsers, the Sanitizer API offers a cleaner approach to handling untrusted HTML.

The API is straightforward to use:

```javascript
// Create a Sanitizer instance with custom configuration
const sanitizer = new Sanitizer({
  allowElements: ['p', 'br', 'strong', 'em'],
  dropAttributes: {
    onAll: ['style']
  }
});

// Sanitize HTML
const sanitized = sanitizer.sanitizeToString('<p>User <script>alert("xss")</script> content</p>');
// Result: "<p>User  content</p>"
```

The Sanitizer API integrates well with DOM operations, allowing you to set innerHTML using the sanitizer:

```javascript
const element = document.getElementById('content');
element.setHTML('<p>User content</p>', { sanitizer });
```

While the Sanitizer API doesn't yet have all the features of DOMPurify (such as the extensive configuration options), it provides sufficient functionality for most extension use cases and has the advantage of being built into the browser with no additional JavaScript payload.

## Automated Security Scanning

Manual code review is essential for security, but automated tools can catch many common vulnerabilities before they reach production. Several tools are specifically useful for extension security scanning:

- **ESLint with security plugins**: The `eslint-plugin-security` package detects patterns that might indicate security issues
- **npm audit**: Run `npm audit` regularly to check for known vulnerabilities in your dependencies
- **Chrome Web Store Privacy Sandbox**: Google's automated scanning catches many common extension vulnerabilities during review
- **OWASP Dependency Check**: Analyzes your dependencies for known vulnerabilities

For extensions, also consider running static analysis tools that understand Chrome extension APIs. Tools like `eslint-plugin-webextension` can catch common mistakes in extension-specific code patterns.

Integrating security scanning into your CI/CD pipeline ensures that vulnerabilities are caught early:

```yaml
# Example GitHub Actions security workflow
- name: Security Audit
  run: |
    npm audit
    npx eslint src --ext .js,.ts
    npm run build && npx htmlhint "**/*.html"
```

## OWASP for Extensions

The Open Web Application Security Project (OWASP) maintains resources specifically addressing extension security. The [OWASP Web Extension Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Angular_Security_Cheat_Sheet.html) provides additional guidance, though much of the general web application security guidance applies to extensions as well.

Key OWASP principles for extensions include:

- **Validate input, sanitize output**: All data entering your extension from external sources should be validated for type and format before processing
- **Defense in depth**: Layer multiple security controls so that if one fails, others still provide protection
- **Principle of least privilege**: Request only the permissions your extension needs and use them only when necessary
- **Fail securely**: When security checks fail, deny access rather than allowing potentially dangerous operations

The Chrome Web Store also provides [extension security best practices](https://developer.chrome.com/docs/extensions/mv3/security/) that align with OWASP recommendations and address Chrome-specific concerns.

## Conclusion

XSS prevention in Chrome extensions requires a comprehensive approach that addresses the unique challenges of extension architecture. By understanding extension-specific attack vectors, using safe DOM APIs like textContent, integrating DOMPurify for HTML sanitization, implementing Trusted Types, securing message passing, and layering CSP as a defense mechanism, you can build extensions that protect users from XSS attacks. Remember that security is not a single feature but an ongoing commitment requiring regular audits, automated scanning, and staying current with emerging threats and best practices.

For more security guidance, explore our [Chrome Extension Security Hardening](/chrome-extension-guide/guides/chrome-extension-security-hardening/) guide and the broader suite of security resources in our [Security Best Practices](/chrome-extension-guide/guides/security-best-practices/) collection.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
