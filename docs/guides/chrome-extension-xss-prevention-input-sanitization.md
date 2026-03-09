---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Comprehensive guide to preventing cross-site scripting (XSS) vulnerabilities in Chrome extensions. Learn about DOMPurify, Trusted Types, message sanitization, and security best practices for extension developers."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) remains one of the most dangerous and prevalent security vulnerabilities in web applications, and Chrome extensions are no exception. In fact, extensions often face greater XSS risk than standard web applications because they operate with elevated privileges, have access to sensitive browser APIs, and frequently interact with untrusted web content. A successful XSS attack against an extension can give attackers access to user browsing history, cookies, stored credentials, and the ability to manipulate any web page the user visits. This comprehensive guide covers the extension-specific XSS attack vectors, practical defense mechanisms, and the security architecture patterns you must implement to protect your users.

Understanding XSS in the extension context requires recognizing that your attack surface extends far beyond your own extension pages. Content scripts execute in the context of arbitrary web pages, extension popups and options pages display user-controlled data, and message passing channels can transmit malicious payloads between different extension components. Each of these interaction points represents a potential XSS vector that attackers actively exploit. By the end of this guide, you will have the knowledge and practical tools to identify, prevent, and mitigate XSS vulnerabilities throughout your extension's architecture.

## Extension-Specific XSS Vectors

Chrome extensions face XSS vulnerabilities that differ significantly from traditional web applications. While standard web XSS typically involves injecting malicious scripts through user input fields or URL parameters, extension XSS can originate from multiple sources that are unique to the extension ecosystem. Understanding these distinct attack vectors is the first step toward building effective defenses.

The most critical extension-specific XSS vector involves content scripts interacting with web pages. When your content script reads data from the DOM and then uses that data in a potentially dangerous manner, you create an attack surface that web page authors can exploit. Malicious web pages can craft HTML and JavaScript specifically designed to trick your content script into executing unintended code. This differs from traditional reflected or stored XSS because the attacker controls the environment in which your script runs, not just specific input fields.

Extension popups and options pages present another significant XSS vector. These pages often display data fetched from external sources, retrieved from storage, or received through message passing from content scripts. If any of this data is rendered using unsafe DOM manipulation methods, an attacker who can inject malicious data into storage or intercept message passing can achieve XSS in your extension pages. Unlike content scripts that run in potentially hostile web page contexts, extension pages run in the privileged extension origin, meaning XSS here can access all extension APIs.

Message passing between extension components creates additional XSS opportunities. The chrome.runtime messaging API allows communication between content scripts, background scripts, popup pages, and options pages. If your extension accepts messages from content scripts without proper validation, a malicious web page can send crafted messages that, when processed by your extension, result in XSS vulnerabilities. This is particularly dangerous because messages from content scripts appear to originate from a trusted source within your extension's architecture.

## The Dangers of innerHTML and Unsafe DOM Manipulation

The innerHTML property is perhaps the most common source of XSS vulnerabilities in JavaScript applications, and extensions are particularly vulnerable because developers often use it for convenience without fully understanding the risks. When you assign a string to innerHTML, the browser parses the string as HTML, which means any embedded script tags will execute. This behavior makes innerHTML fundamentally unsafe for any user-controlled data, regardless of where that data originates.

Consider a typical extension scenario where you display the title of the current tab in your popup. If you retrieve the tab title using chrome.tabs.get and then display it with innerHTML, an attacker who can manipulate the tab's title—for example, by controlling a malicious web page—can inject arbitrary JavaScript into your popup. The attack works because the tab title appears to be trusted data from Chrome's own API, but in reality, web page authors can set arbitrary titles including those containing script tags or event handlers.

```javascript
// DANGEROUS: Never use innerHTML with any dynamic content
function displayTabTitle(title) {
  document.getElementById('title').innerHTML = title;
}

// SAFE: Use textContent instead
function displayTabTitle(title) {
  document.getElementById('title').textContent = title;
}
```

The textContent property safely handles any string by treating it as plain text rather than HTML. The browser automatically escapes any special characters, preventing script injection. This single change eliminates a vast category of XSS vulnerabilities in your extension. Beyond textContent, the createTextNode method and template literals with textContent provide safe alternatives for rendering dynamic content.

Beyond innerHTML, several other DOM APIs introduce XSS risks. The document.write method, particularly when used after page load, can introduce XSS vulnerabilities by parsing its input as HTML. The insertAdjacentHTML method has the same danger as innerHTML since it also parses HTML. The document.implementation.createHTMLDocument method creates new documents that can execute scripts. Always prefer safer alternatives like textContent, createTextNode, or the DOM manipulation methods that don't parse HTML.

## DOMPurify Integration for Trusted HTML

Sometimes your extension genuinely needs to render HTML markup—perhaps you're displaying formatted user notes, rendering Markdown content, or displaying HTML email snippets. In these cases, you cannot simply use textContent because you want to preserve formatting. DOMPurify provides a solution by sanitizing HTML to remove dangerous elements while preserving safe formatting tags.

DOMPurify is a battle-tested library that parses HTML and removes everything that could be used for XSS attacks while preserving safe HTML elements and attributes. It removes script tags, event handlers, javascript: URLs, and other XSS vectors while keeping formatting elements like b, i, em, strong, and structural elements like div, span, and table. This makes it suitable for rendering user-generated HTML content that should support basic formatting.

```javascript
import DOMPurify from 'dompurify';

// Configure DOMPurify with strict settings
const purify = DOMPurify(window);

// Allow only safe tags and attributes
const sanitizedHTML = purify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
});

// Now safe to use with innerHTML
document.getElementById('content').innerHTML = sanitizedHTML;
```

When integrating DOMPurify, always configure it with the minimum set of allowed tags and attributes your use case requires. The default DOMPurify configuration is quite permissive, so explicitly specifying allowed elements provides defense in depth. For most extension use cases, you should restrict tags to basic formatting elements and only allow href attributes on anchor tags, avoiding any attributes that can execute JavaScript.

For extensions that need to display more complex HTML, consider using a sandboxed page. Sandboxed pages run in an isolated context without access to extension APIs, so even if XSS occurs, the attacker cannot access sensitive data or APIs. You can communicate with sandboxed pages using postMessage, passing only the data needed for rendering after sanitization in the main extension context.

## Trusted Types API for Content Security

The Trusted Types API represents a modern browser security feature that prevents XSS by requiring all DOM writes to use trusted type objects instead of strings. When you enable Trusted Types, the browser rejects string assignments to dangerous sink properties like innerHTML, requiring you to use TrustedHTML objects instead. This fundamentally prevents XSS because creating TrustedType objects requires going through a policy that you define and control.

Trusted Types work by having you define policies that create trusted objects. Any attempt to assign a string to a protected property throws a TypeError when Trusted Types are enforced. This means that even if an attacker manages to inject a string into a variable that later gets assigned to innerHTML, the assignment will fail rather than executing malicious code.

```javascript
// Define a Trusted Types policy
if (window.trustedTypes && trustedTypes.createPolicy) {
  const safeHTMLPolicy = trustedTypes.createPolicy('extension-policy', {
    createHTML: (input) => {
      // Sanitize before creating TrustedHTML
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
        ALLOWED_ATTR: ['href']
      });
    }
  });
}

// Now use the policy to create trusted HTML
const trusted = safeHTMLPolicy.createHTML(userInput);
element.innerHTML = trusted; // Works
// element.innerHTML = userInput; // Would throw TypeError
```

Chrome extensions can enable Trusted Types through Content Security Policy by adding the require-trusted-types-for 'script' directive. However, this is an aggressive policy that may break existing code that uses innerHTML. For most extensions, implementing Trusted Types gradually—using policies for new code while adding trustedTypes.createPolicy fallback for existing code—provides a practical migration path.

## Message Passing Sanitization

Message passing is fundamental to Chrome extension architecture, connecting content scripts with background scripts, popups, and options pages. However, this communication channel can become an XSS vector if messages are not properly validated and sanitized. Attackers who control web page content can send messages through your content script to other extension components, and those messages might contain malicious payloads designed to exploit vulnerabilities in message handlers.

The critical principle is to treat all message data as untrusted, regardless of its apparent origin. Even though messages technically come from within your extension (via the chrome.runtime API), content scripts operate in the context of potentially malicious web pages. A malicious page can send messages that appear to originate from your content script but contain crafted payloads. Always validate message structure and sanitize any data from messages before using it in DOM operations or storage.

```javascript
// Validate message structure rigorously
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check message type against expected schema
  if (!message || typeof message !== 'object') {
    return false;
  }

  // Validate specific fields
  const allowedActions = ['getStatus', 'saveData', 'updateUI'];
  if (!allowedActions.includes(message.action)) {
    console.warn('Unknown message action:', message.action);
    return false;
  }

  // Sanitize any data from the message before use
  if (message.data && message.data.content) {
    const sanitized = DOMPurify.sanitize(message.data.content);
    processContent(sanitized);
  }

  return true;
});
```

For extensions using TypeScript, consider using message validation libraries that enforce strict schemas. Libraries like zod or yup allow you to define expected message structures and validate incoming messages against those schemas. This provides compile-time safety for message formats and runtime validation for actual messages, significantly reducing the attack surface in your message handlers.

## Content Script Injection Risks

Content scripts face unique XSS risks because they operate within the context of web pages that you do not control. Malicious web pages can exploit your content script in several ways: by setting up DOM elements that your script interprets as HTML, by manipulating the environment to trigger unintended script execution, or by tricking your script into using dangerous APIs with attacker-controlled data.

One common injection technique involves web pages creating elements with event handlers or javascript: URLs that your script might process. For example, if your content script searches for links with certain attributes and then uses those attributes in some way, a malicious page could craft links with event handlers embedded in attributes. Similarly, if your script reads form input values or data attributes, attackers can embed malicious payloads that your script later uses unsafely.

```javascript
// UNSAFE: Reading data attributes and using in innerHTML
const userData = element.getAttribute('data-user-content');
document.getElementById('display').innerHTML = userData;

// SAFE: Always sanitize data from the page
const userData = element.getAttribute('data-user-content');
const sanitized = DOMPurify.sanitize(userData);
document.getElementById('display').textContent = sanitized;
```

To minimize content script XSS risks, follow these practices: always sanitize any data read from the DOM before using it, prefer textContent over innerHTML for displaying page data, avoid using eval() or Function() with any page-derived data, and use manifest permissions to limit what pages your content script can run on. Restricting content scripts to specific domains using the matches permission reduces your exposure to malicious pages.

## Popup and Options Page Security

Extension popups and options pages might seem safer than content scripts because they run in the extension origin rather than on arbitrary web pages. However, these pages frequently display data from external sources—API responses, stored user data, or information passed from content scripts—and this data can contain malicious payloads if not properly handled. Additionally, these pages have access to powerful extension APIs, making XSS here particularly dangerous.

The same security principles apply to popup and options pages as to any web application: never use innerHTML with untrusted data, sanitize all external input, and validate data before displaying it. Pay particular attention to data from chrome.storage, which might have been set by compromised content scripts, and data from message handlers that receive information from content scripts.

```javascript
// Popup displaying data from storage
async function displayStoredSettings() {
  const settings = await chrome.storage.local.get('userPreferences');
  const prefs = settings.userPreferences;

  // Validate before using
  if (!prefs || typeof prefs !== 'object') {
    return;
  }

  // Use textContent for safe display
  if (prefs.displayName) {
    document.getElementById('username').textContent = prefs.displayName;
  }

  // If HTML rendering is needed, always sanitize
  if (prefs.customMessage) {
    const sanitized = DOMPurify.sanitize(prefs.customMessage);
    document.getElementById('message').innerHTML = sanitized;
  }
}
```

Consider implementing a Content Security Policy specifically for your extension pages that restricts what they can do. While Manifest V3 provides default CSP, you can tighten it further in your manifest.json. A strict CSP serves as a defense-in-depth measure, blocking XSS attacks even if your code contains vulnerabilities.

## Content Security Policy as Defense Layer

Content Security Policy provides your extension's most important defense-in-depth layer against XSS attacks. A properly configured CSP restricts what resources your extension can load and what scripts can execute, significantly reducing the impact of any XSS vulnerabilities that might exist in your code. In Manifest V3, CSP is mandatory, but you can and should customize it to provide stronger protections than the defaults.

The default CSP for extension pages in Manifest V3 is `script-src 'self' https://ajax.googleapis.com; object-src 'self'; style-src 'self' 'unsafe-inline'`. While this provides basic protection, you should customize it for your extension's specific needs. Tightening the policy reduces your attack surface: remove the Google CDN exception if you bundle all dependencies locally, remove 'unsafe-inline' if possible, and consider adding additional restrictions.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.yourservice.com"
  }
}
```

For detailed guidance on configuring CSP for extensions, refer to our comprehensive [Chrome Extension Content Security Policy](/chrome-extension-guide/guides/chrome-extension-content-security-policy/) guide. Additionally, our [Chrome Extension Security Hardening](/chrome-extension-guide/guides/chrome-extension-security-hardening/) guide provides advanced techniques for securing your extension beyond CSP.

## The Sanitizer API: Modern Native Protection

The HTML Sanitizer API represents a browser-native solution for safely rendering HTML content. Unlike DOMPurify, which is a JavaScript library, the Sanitizer API is built into the browser itself, providing native performance and requiring no external dependencies. As browser support improves, the Sanitizer API should become the preferred method for sanitizing HTML in extensions.

The Sanitizer API provides a simple interface: you create a Sanitizer instance with your configuration, then use its setHTML or getHTML methods to sanitize content. The API automatically removes dangerous elements and attributes while preserving safe formatting.

```javascript
// Using the native Sanitizer API (when available)
const sanitizer = new Sanitizer({
  allowElements: ['b', 'i', 'em', 'strong', 'a', 'p'],
  allowAttributes: { 'href': ['a'] }
});

// Sanitize and set HTML safely
const element = document.getElementById('content');
element.setHTML(userInput, { sanitizer });

// Check for browser support
if (window.Sanitizer) {
  // Use native Sanitizer
} else {
  // Fall back to DOMPurify
  const sanitized = DOMPurify.sanitize(userInput);
  document.getElementById('content').innerHTML = sanitized;
}
```

Currently, the Sanitizer API has good support in Chrome-based browsers but limited support in other browsers. For maximum compatibility, implement feature detection and provide DOMPurify as a fallback. As browser support matures, the native Sanitizer API will simplify your code by removing the need for external dependencies while providing robust protection against XSS.

## Automated Security Scanning

Manual code review for XSS vulnerabilities is essential but insufficient. Automated tools can continuously scan your codebase for common XSS patterns, helping you catch vulnerabilities before they reach production. Integrating security scanning into your development workflow provides ongoing protection as your extension evolves.

ESLint with security-focused plugins can detect many XSS-prone patterns in your JavaScript code. Plugins like eslint-plugin-no-unsanitized can automatically flag uses of innerHTML with dynamic content, helping you identify dangerous code paths during development. Additionally, static analysis tools like CodeQL can find complex vulnerability patterns that simple linters might miss.

For extension-specific security scanning, consider using chrome-extensions-scanner, which is designed to identify common extension vulnerabilities including XSS, overly permissive permissions, and insecure messaging patterns. Regular scanning as part of your CI/CD pipeline ensures that new code changes don't introduce security vulnerabilities.

## OWASP for Chrome Extensions

The Open Web Application Security Project (OWASP) provides foundational security guidance that applies to Chrome extensions, though with extension-specific interpretations. The OWASP Top 10 highlights the most critical web application security risks, and understanding how each applies to extensions helps you prioritize your security efforts.

For extensions, the most relevant OWASP categories include Injection (XSS in extension contexts), Broken Authentication (improper handling of extension identity and storage), Sensitive Data Exposure (insecure storage of user credentials), XML External Entities (processing untrusted data from web pages), and Security Misconfiguration (inadequate CSP or permission settings). Our [security best practices](/chrome-extension-guide/guides/security-best-practices/) guide provides comprehensive coverage of OWASP-aligned security measures for extensions.

---

Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)
