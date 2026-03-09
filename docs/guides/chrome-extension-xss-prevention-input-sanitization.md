---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Learn how to prevent cross-site scripting (XSS) vulnerabilities in Chrome extensions with input sanitization, DOMPurify, Trusted Types, and defense-in-depth strategies."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) remains one of the most dangerous and prevalent security vulnerabilities in Chrome extensions. Unlike traditional web applications, extensions operate across multiple contexts—content scripts, background service workers, popups, options pages, and side panels—each presenting unique attack surfaces. A single XSS vulnerability in any of these contexts can compromise user data, hijack browser sessions, or inject malicious code into trusted websites. This guide provides comprehensive strategies for preventing XSS in Chrome extensions, covering extension-specific attack vectors, sanitization libraries, modern browser APIs, and defense-in-depth principles that every extension developer must understand.

## Understanding Extension-Specific XSS Vectors

Chrome extensions face XSS risks that differ significantly from standard web applications. The primary vectors include DOM manipulation with unsanitized input, message passing between contexts, user-supplied data in storage APIs, and injection through browser actions or context menus. Unlike server-side XSS in traditional web apps, extension XSS often occurs client-side where attackers can exploit the trust relationships between extension components and web pages.

Content scripts represent the most exposed attack surface because they execute within the context of web pages you do not control. When your content script reads data from the page—via `document.textContent`, `innerText`, or other APIs—and then renders that data without proper sanitization, you create a potential XSS vector. The same principle applies when extensions receive messages from web pages through the `runtime.onMessage` API and subsequently display that content in any extension UI.

Background service workers and extension pages (popups, options, side panels) introduce additional vectors when they render HTML constructed from dynamic data. If your extension fetches data from external APIs and displays it using `innerHTML` or similar methods without sanitization, attackers who compromise those APIs can inject malicious scripts that execute within your extension's privileged context. This is particularly dangerous because extension contexts often have elevated permissions unavailable to regular web pages.

The trust model in extensions is also critically different. Users install extensions voluntarily and grant them significant permissions, expecting them to behave securely. Attackers exploit this trust by crafting web pages designed to trigger vulnerable code paths in extensions, or by compromising data sources that extensions consume. Understanding these vectors is the first step toward building secure extensions.

## The Dangers of innerHTML and Unsafe DOM Methods

The most common source of XSS vulnerabilities in extensions is the use of `innerHTML` with unsanitized user input. When you set `element.innerHTML = userInput`, any HTML or JavaScript embedded in `userInput` will be executed by the browser. This includes script tags, event handlers like `onclick`, and SVG payloads that can execute code or exfiltrate data. Even seemingly harmless operations like inserting text retrieved from `document.activeElement` or `window.name` can introduce vulnerabilities if that data originated from an untrusted source.

The proper approach is to use safe DOM APIs that treat content as text rather than HTML. Methods like `textContent` and `innerText` automatically escape HTML entities, preventing script execution. When you need to insert structured content, use `document.createElement` and `document.createTextNode` to build DOM elements programmatically, or leverage template literals with `.textContent` assignment. For complex structures, consider using the DOMParser API to create elements from HTML strings in a safe manner.

However, many developers continue using `innerHTML` because it offers convenience and performance for simple use cases. The key is to never pass untrusted data directly to `innerHTML`. Instead, sanitize the data first using a library like DOMPurify, or construct the DOM safely without using `innerHTML` at all. The convenience of `innerHTML` is never worth the security risk when safe alternatives exist.

## DOMPurify: The Industry Standard Sanitization Library

[DOMPurify](https://github.com/cure53/DOMPurify) is the most widely trusted client-side HTML sanitization library, and it should be your first line of defense against XSS in Chrome extensions. It parses HTML, removes dangerous elements and attributes while preserving safe ones, and returns a clean string that you can safely assign to `innerHTML`. DOMPurify is actively maintained, thoroughly tested against known XSS attack vectors, and works reliably in extension contexts.

Integrating DOMPurify into your extension is straightforward. Install it via npm or include the minified script directly in your extension bundle:

```javascript
import DOMPurify from 'dompurify';

// Sanitize user-supplied content before rendering
const clean = DOMPurify.sanitize(dirtyInput);

// Now safe to use with innerHTML
element.innerHTML = clean;
```

DOMPurify offers extensive configuration options for fine-tuning what HTML elements and attributes are allowed. For most extension use cases, the default configuration provides strong protection. However, you may need to customize it if your extension requires specific HTML features. Always review the configuration carefully—allowing elements like `<script>`, `<iframe>`, or event handlers like `onclick` defeats the purpose of sanitization.

One important consideration for extensions is that DOMPurify relies on the DOM, which means you must use it in contexts where the DOM is available—content scripts, popup pages, options pages, and side panels. In background service workers, the DOM is not available, so you cannot use DOMPurify directly. For background script sanitization, consider using isomorphic-dompurify or sanitizing in a context where the DOM is accessible before passing data to the service worker.

## Trusted Types API: A Modern Browser Security Feature

The [Trusted Types API](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API) provides a powerful alternative to traditional DOM manipulation by requiring that certain dangerous operations use typed objects rather than raw strings. When you enable Trusted Types, the browser enforces that functions like `innerHTML` only accept TrustedHTML objects, TrustedScript objects, or TrustedScriptURL objects—which can only be created through your explicitly defined policies.

Implementing Trusted Types in your extension requires adding a Content Security Policy that enables the feature and defining policies that create trusted objects. This approach shifts security from runtime sanitization (which can have edge cases) to compile-time enforcement (which cannot be bypassed accidentally):

```javascript
// Create a Trusted Types policy
if (window.trustedTypes) {
  const policy = trustedTypes.createPolicy('extension-policy', {
    createHTML: (input) => DOMPurify.sanitize(input),
    createScript: (input) => {
      // Validate and sanitize script sources
      return input;
    }
  });
}

// Now only TrustedHTML can be assigned to innerHTML
element.innerHTML = policy.createHTML(userInput); // Works
element.innerHTML = userInput; // Throws TypeError
```

Trusted Types provide strong guarantees because they prevent the entire class of vulnerabilities caused by accidentally passing unsanitized strings to dangerous sinks. However, they require browser support (available in Chrome, Edge, and Firefox) and some migration effort for existing code. For new extensions, adopting Trusted Types from the start provides excellent security with minimal overhead.

## Message Passing and Cross-Context Security

Chrome extensions rely heavily on message passing between content scripts, background scripts, and extension pages. This communication channel can become an XSS vector if either end of the conversation trusts incoming messages without validation. An attacker-controlled web page can send messages to your content script, and if your content script processes those messages and renders their contents without sanitization, XSS occurs.

The `runtime.onMessage` listener in your content script should treat all incoming message data as untrusted. Validate message structure, check message origins when possible, and sanitize any data from messages before using it in DOM operations or storage. Similarly, when your background script receives data from content scripts or external sources, apply the same strict validation and sanitization rules.

When passing data between extension contexts, consider using structured clone algorithms and explicit message schemas rather than passing raw objects. This helps prevent prototype pollution attacks and ensures that your code handles only expected data structures. For sensitive operations, implement message signing or verification to ensure that messages genuinely originated from your extension's trusted contexts.

See the [secure message passing guide](/chrome-extension-guide/guides/chrome-extension-secure-message-passing/) and [message passing best practices](/chrome-extension-guide/guides/message-passing-best-practices/) for detailed implementation patterns.

## Content Script Injection Risks and Mitigation

Content scripts run in the context of web pages, which means they inherit vulnerabilities from those pages and can be affected by page-level attacks. One subtle but dangerous risk is that content scripts can inadvertently inherit XSS vulnerabilities from the page itself. If your content script reads data from the page using APIs that return HTML-parsed content (like `element.innerHTML`), and then uses that data in your extension's UI, you may be propagating the page's vulnerabilities into your extension.

To mitigate this, content scripts should use DOM APIs that return text content rather than HTML. Use `textContent` or `innerText` when extracting data from page elements, and sanitize the data before using it anywhere in your extension. Be particularly careful when injecting into the page itself—always sanitize data before using `element.innerHTML` in the page context.

Another risk comes from extension-specific injection vectors like browser actions, context menus, and keyboard shortcuts. If your extension responds to user actions by injecting content into the active tab, ensure that any user-controlled data in those actions is sanitized before injection. Attackers can craft web pages that trigger these actions with malicious payloads, testing your extension's defenses.

## Popup and Options Page Security

Popup and options pages are HTML pages that run in the extension's context with elevated privileges. They often display data from storage, external APIs, or content scripts, and this data may come from untrusted sources. Treating this data as safe is a common mistake that leads to XSS vulnerabilities.

Always sanitize data from storage before rendering it in popup or options pages. Storage can be modified by content scripts, other extensions, or even by users through developer tools. Similarly, data fetched from external APIs should be sanitized before display, even if you trust the API—APIs can be compromised, and response data may contain malicious payloads from other users.

Popup and options pages should also implement strict Content Security Policy headers to limit what resources can be loaded and what actions can be performed. The [Content Security Policy guide for Chrome extensions](/chrome-extension-guide/guides/chrome-extension-content-security-policy/) provides detailed configuration recommendations.

## Content Security Policy as a Defense Layer

A properly configured [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) provides a critical defense-in-depth layer against XSS attacks. CSP allows you to define trusted sources for various resource types, restrict script execution, and limit the capabilities of your extension's contexts. Even if sanitization fails somewhere in your code, CSP can prevent or limit the damage from XSS attacks.

For Chrome extensions, manifest.json allows you to specify CSP in the `content_security_policy` field. A strong CSP for extensions typically restricts scripts to self, limits connections to necessary origins, and prevents inline script execution:

```json
{
  "content_security_policy": "script-src 'self'; object-src 'self'; connect-src https://api.example.com"
}
```

Review the [Chrome extension security hardening guide](/chrome-extension-guide/guides/chrome-extension-security-hardening/) and [CSP troubleshooting guide](/chrome-extension-guide/guides/csp-troubleshooting/) for comprehensive CSP configuration recommendations specific to extensions.

## The Sanitizer API: Native Browser Sanitization

The [Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/Sanitizer) is a modern browser-native API that provides built-in HTML sanitization without external libraries. Currently available in Chrome and other Chromium-based browsers, it offers a standardized way to sanitize HTML that is built into the browser itself.

```javascript
const sanitizer = new Sanitizer();
const clean = sanitizer.sanitizeToString(dirtyInput);
element.innerHTML = clean;
```

The Sanitizer API provides strong default protection and can be customized to allow specific elements and attributes. It represents the future of browser-based sanitization and should be adopted as browsers add support. However, for maximum compatibility today, DOMPurify remains the safer choice since it works consistently across all browsers and has been thoroughly battle-tested.

## Automated Security Scanning and Testing

Automated tools can detect many XSS vulnerabilities before they reach production. For Chrome extensions, several scanning approaches complement manual security review:

- **Static analysis tools** like ESLint with security plugins can detect dangerous patterns like `innerHTML` usage with dynamic content
- **Dynamic testing** with tools like Playwright or Puppeteer can inject payloads and verify that sanitization blocks them
- **Linting rules** specifically for extension security can catch common mistakes in manifest.json and background scripts

Consider integrating security scanning into your CI/CD pipeline. The [extension security audit guide](/chrome-extension-guide/guides/extension-security-audit/) covers tools and methodologies for comprehensive security testing.

## OWASP for Extensions: Applying Web Security Standards

The [OWASP Top 10](https://owasp.org/www-project-top-ten/) provides a valuable framework for thinking about extension security, even though it targets web applications. Many OWASP categories directly apply to extensions:

- **A03:2021 – Injection** covers the XSS vulnerabilities detailed in this guide
- **A01:2021 – Broken Access Control** applies to extension context isolation bypasses
- **A02:2021 – Cryptographic Failures** affects extension storage and data handling
- **A04:2021 – Insecure Design** reminds us that security must be architected in from the start

The [security best practices](/chrome-extension-guide/guides/security-best-practices/) and [extension security hardening](/chrome-extension-guide/guides/extension-security-hardening/) guides provide additional context for applying OWASP principles to Chrome extensions.

## Building a Security-First Development Culture

Preventing XSS in Chrome extensions requires more than just technical solutions—it requires a security-first mindset throughout the development process. Every piece of user input, every API response, and every piece of data from external sources should be considered potentially malicious. Implement security review processes for code that handles dynamic content, establish clear guidelines for DOM manipulation, and prioritize security testing.

XSS vulnerabilities often stem from a single oversight: treating some data source as trusted when it is not. By consistently applying sanitization, using safe APIs, and layering defensive measures like CSP and Trusted Types, you can build extensions that protect users from the most common and dangerous web security threats.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one).*
