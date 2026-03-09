---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "A comprehensive developer guide for preventing cross-site scripting (XSS) in Chrome extensions. Learn about extension-specific XSS vectors, DOMPurify integration, Trusted Types API, message passing sanitization, and security best practices."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) remains one of the most critical security vulnerabilities in web applications, and Chrome extensions are particularly susceptible due to their elevated privileges and complex interaction patterns. While extensions operate within the browser's security sandbox, they often have access to sensitive APIs, user data, and the ability to modify web page content. A successful XSS attack against an extension can lead to credential theft, data exfiltration, unauthorized API access, and complete compromise of user privacy. This guide provides a comprehensive examination of XSS prevention strategies specifically tailored for Chrome extensions, covering both fundamental principles and advanced defensive techniques.

## Understanding Extension-Specific XSS Vectors {#extension-specific-xss-vectors}

Chrome extensions face unique XSS challenges that differ from traditional web applications. The extension ecosystem involves multiple execution contexts: background scripts, content scripts, popup pages, options pages, and side panels. Each of these contexts can become a vector for XSS attacks, and understanding these attack surfaces is essential for building secure extensions.

The most common XSS vectors in Chrome extensions originate from untrusted data sources that extensions routinely process. Web page content accessed through content scripts represents a significant attack surface, as attackers can inject malicious scripts into web pages specifically designed to exploit extension vulnerabilities. When your content script reads data from the DOM using methods like `document.innerHTML` or `document.write()`, any malicious scripts embedded in the page will execute within the extension's context, potentially giving attackers access to extension APIs and stored data.

Message passing between extension components creates another critical attack vector. Extensions frequently use `chrome.runtime.sendMessage` and `chrome.runtime.onMessage` to communicate between content scripts and background scripts. If message handlers fail to validate and sanitize incoming messages, attackers can inject malicious payloads that trigger unintended behavior. This is especially dangerous because message handlers often have access to powerful extension APIs that could expose sensitive user data or perform privileged operations.

Extension popups and options pages are vulnerable to XSS when they display data from external sources without proper sanitization. If your popup renders user-supplied content, data fetched from web APIs, or information extracted from web pages, you must treat all of this data as potentially malicious. Even data that originates from your own background script should be validated before rendering, as it may have originated from a compromised content script.

## The Dangers of innerHTML {#innerhtml-dangers}

The `innerHTML` property is one of the most dangerous methods for manipulating DOM content in extension contexts. When you assign HTML content to an element's `innerHTML` property, the browser parses the string and executes any embedded script tags. This behavior makes `innerHTML` a primary vector for XSS attacks, and its use should be avoided whenever possible in extension code.

Consider a content script that extracts page content and displays it in the extension popup:

```javascript
// DANGEROUS: Never do this
function displayPageContent(htmlContent) {
  document.getElementById('content').innerHTML = htmlContent;
}
```

If an attacker controls the `htmlContent` variable—perhaps through a compromised web page—they can inject malicious scripts that execute in your extension's context. Once a script executes within the extension, it can access `chrome.runtime` APIs, read stored extension data, intercept messages, and perform actions on behalf of the user.

The secure alternative is to use text content APIs that treat all input as literal text rather than HTML:

```javascript
// SAFE: Using textContent instead of innerHTML
function displayPageContent(textContent) {
  document.getElementById('content').textContent = textContent;
}
```

When you must render HTML content from untrusted sources, you must sanitize it first using a dedicated sanitization library. Even then, prefer safer alternatives like creating elements programmatically:

```javascript
// SAFER: Create elements programmatically
function createSafeElement(tagName, text, attributes) {
  const element = document.createElement(tagName);
  element.textContent = text;
  Object.entries(attributes || {}).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}
```

## DOMPurify Integration {#dompurify-integration}

DOMPurify is the gold standard for sanitizing HTML content in web applications, and it works equally well within Chrome extensions. It parses HTML, removes dangerous elements and attributes while preserving safe markup, and returns clean HTML that can be safely rendered. Integrating DOMPurify into your extension provides defense-in-depth against XSS attacks from untrusted content.

To use DOMPurify in your extension, install it via npm or download the standalone version:

```bash
npm install dompurify
```

Then integrate it into your content scripts or popup code:

```javascript
import DOMPurify from 'dompurify';

// Sanitize HTML before rendering
function sanitizeAndRender(htmlContent) {
  const clean = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'ul', 'li', 'ol', 'a'],
    ALLOWED_ATTR: ['href', 'class'],
    ALLOW_DATA_ATTR: false,
  });
  document.getElementById('content').innerHTML = clean;
}
```

The key to effective DOMPurify configuration is the principle of least privilege—allow only the tags and attributes your extension absolutely needs. A restrictive configuration that permits only plain text and basic formatting is safer than a permissive configuration that allows complex HTML.

For content scripts that process web page content, configure DOMPurify to remove all script tags and event handlers:

```javascript
const purify = DOMPurify({
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
});
```

DOMPurify also supports custom hooks that allow you to further process nodes during sanitization. You can use hooks to remove dangerous URL schemes, validate URLs against allowlists, or strip specific patterns that your threat model identifies as risky.

## Trusted Types API {#trusted-types-api}

The Trusted Types API provides a modern, browser-enforced mechanism for preventing XSS attacks by requiring that certain DOM operations receive typed objects rather than raw strings. Chrome supports Trusted Types, and using them in your extension adds a powerful layer of defense that cannot be bypassed by simple string manipulation.

Trusted Types work by requiring you to create specific type objects for potentially dangerous operations. Instead of assigning a raw string to `element.innerHTML`, you must create a `TrustedHTML` object using a policy:

```javascript
// Create a Trusted Types policy
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => DOMPurify.sanitize(input),
});

// Use the policy to create trusted HTML
const trusted = policy.createHTML('<p>User content here</p>');
document.getElementById('content').innerHTML = trusted; // Works
// document.getElementById('content').innerHTML = '<p>Raw string</p>'; // Throws error
```

When Trusted Types are enforced, attempting to assign a raw string to protected properties like `innerHTML`, `outerHTML`, or `insertAdjacentHTML` will throw a TypeError. This prevents accidental XSS vulnerabilities by making secure coding the only option.

To enable Trusted Types enforcement in your extension, add a Content Security Policy header in your `manifest.json`:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; require-trusted-types-for 'script'"
  }
}
```

Trusted Types work best when combined with a sanitization policy. The policy acts as a single choke point where all HTML content is sanitized before being used in DOM operations. This pattern is sometimes called "sink-based prevention" because it secures the sinks (DOM APIs that execute code) rather than trying to filter input at every source.

## Message Passing Sanitization {#message-passing-sanitization}

Chrome extension message passing is a powerful feature that enables communication between different extension components, but it also creates significant security risks if not handled carefully. Every message handler should treat incoming messages as potentially malicious and validate their contents before processing.

The fundamental principle is to validate the message origin and payload at every message handler:

```javascript
// SECURE: Validate sender and message content
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Verify the sender is from an allowed context
  const allowedOrigins = ['https://example.com', 'https://trusted-site.org'];
  
  if (sender.url && !allowedOrigins.some(origin => sender.url.startsWith(origin))) {
    console.error('Message from unauthorized origin:', sender.url);
    return false;
  }
  
  // Validate message structure
  if (!message || typeof message !== 'object') {
    sendResponse({ error: 'Invalid message format' });
    return false;
  }
  
  // Validate expected fields
  if (message.type === 'fetchData') {
    if (typeof message.url !== 'string' || !isValidUrl(message.url)) {
      sendResponse({ error: 'Invalid URL' });
      return false;
    }
    // Process validated message
    handleDataRequest(message.url).then(sendResponse);
    return true;
  }
  
  return false;
});

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

Message validation should include type checking, schema validation, and range checking for numeric values. Consider using a validation library like Zod or Joi to define schemas for expected message formats:

```javascript
import { z } from 'zod';

const DataRequestSchema = z.object({
  type: z.literal('fetchData'),
  url: z.string().url(),
  maxResults: z.number().int().positive().max(100).default(10),
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const result = DataRequestSchema.safeParse(message);
  if (!result.success) {
    sendResponse({ error: 'Invalid message schema' });
    return false;
  }
  
  // Process validated message
  handleDataRequest(result.data).then(sendResponse);
  return true;
});
```

## Content Script Injection Risks {#content-script-injection-risks}

Content scripts execute in the context of web pages and have access to both the page's DOM and extension APIs. This dual access creates unique security challenges, as content scripts can inadvertently become attack vectors for XSS vulnerabilities.

The most common mistake is accessing page content without sanitization:

```javascript
// DANGEROUS: Reading unsanitized page content
function extractPageTitle() {
  const title = document.title;
  // Using title directly without sanitization
  return title;
}

// DANGEROUS: Using page HTML without sanitization
function getPageContent() {
  return document.body.innerHTML;
}
```

While reading page content is generally safe, the danger emerges when this content is used in ways that could execute code. Always sanitize content from the page before using it in DOM operations, message passing, or storage:

```javascript
// SAFE: Sanitize page content before use
import DOMPurify from 'dompurify';

function getSafePageContent() {
  return DOMPurify.sanitize(document.body.innerHTML);
}

function displayPageSummary() {
  const title = DOMPurify.sanitize(document.title, { ALLOWED_TAGS: [] });
  document.getElementById('summary').textContent = title;
}
```

Content scripts should also be careful about eval and Function constructors, which can execute arbitrary code:

```javascript
// NEVER use these with untrusted input
eval(userInput);              // DANGEROUS
new Function(userInput)();    // DANGEROUS
setTimeout(userInput, 0);     // DANGEROUS
```

Instead, use safer alternatives that treat input as data rather than code:

```javascript
// SAFE alternatives
setTimeout(() => processUserData(userData), 0);
document.querySelector('#target').textContent = userData;
```

## Popup and Options Page Security {#popup-options-page-security}

Extension popups and options pages are HTML pages that run in the extension's context. While they don't have direct access to web page content, they often display data from external sources or content scripts, making XSS prevention essential.

Always validate and sanitize any data displayed in popups or options pages:

```javascript
// SECURE: Validate data in popup
function displayMessage(message) {
  const element = document.createElement('div');
  // textContent automatically escapes HTML
  element.textContent = message.text || 'No message';
  document.body.appendChild(element);
}

// Or sanitize if HTML is needed
function displayRichMessage(message) {
  const clean = DOMPurify.sanitize(message.html, { ALLOWED_TAGS: ['b', 'i', 'a'] });
  document.getElementById('message').innerHTML = clean;
}
```

Options pages that accept user configuration should validate all inputs before storing or using them:

```javascript
// SECURE: Validate options before saving
function saveOptions(options) {
  const validated = {
    apiEndpoint: validateUrl(options.apiEndpoint),
    maxResults: validateNumber(options.maxResults, 1, 100),
    enabled: typeof options.enabled === 'boolean' ? options.enabled : true,
  };
  chrome.storage.local.set({ options: validated });
}

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : '';
  } catch {
    return '';
  }
}

function validateNumber(value, min, max) {
  const num = Number(value);
  return isNaN(num) ? min : Math.max(min, Math.min(max, num));
}
```

## Content Security Policy as Defense Layer {#csp-defense-layer}

Content Security Policy (CSP) is your first line of defense against XSS attacks. A properly configured CSP restricts what resources can be loaded and what code can execute in your extension pages. Chrome extensions support CSP headers through the manifest.json file.

Configure a strict CSP in your manifest:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
  }
}
```

A strict CSP limits execution to your extension's own scripts, prevents loading external resources, and blocks inline scripts. While `'unsafe-inline'` is sometimes necessary for compatibility, avoid it when possible and use separate script files instead.

For extensions that need to load external resources (like fonts or analytics), expand the policy carefully:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src https://api.example.com;"
  }
 }
```

Content scripts inherit the CSP of the pages they run on, but you can set a more restrictive policy for content script execution using the `content_scripts` matches and the extension's own CSP. However, note that content scripts are subject to the page's CSP when interacting with page DOM.

## The Sanitizer API {#sanitizer-api}

The HTML Sanitizer API is a browser-native alternative to DOMPurify that provides built-in sanitization without external dependencies. While not yet supported in all browsers, Chrome includes support for this API, making it a viable option for extensions targeting modern browsers.

The Sanitizer API provides a straightforward interface:

```javascript
// Using the native Sanitizer API
const sanitizer = new Sanitizer({
  allowElements: ['p', 'b', 'i', 'strong', 'a'],
  dropAttributes: {
    'a': ['onclick', 'onerror'],
  },
});

function sanitizeHTML(input) {
  const element = document.createElement('div');
  element.innerHTML = input;
  return sanitizer.sanitize(element).innerHTML;
}
```

The Sanitizer API automatically removes script tags, event handlers, and dangerous attributes. Its configuration is more limited than DOMPurify's, but it provides strong security guarantees with zero dependencies.

For maximum compatibility, consider using the Sanitizer API with a fallback to DOMPurify:

```javascript
function sanitize(input) {
  if (window.Sanitizer) {
    const sanitizer = new Sanitizer({ allowElements: ['b', 'i', 'p', 'a'] });
    const element = document.createElement('div');
    element.setHTML(input, { sanitizer });
    return element.innerHTML;
  }
  // Fallback for browsers without Sanitizer API
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: ['b', 'i', 'p', 'a'] });
}
```

## Automated Security Scanning {#automated-security-scanning}

Automated tools can help identify potential XSS vulnerabilities in your extension before they become exploitable. Several scanners are specifically designed for Chrome extensions or can be adapted for extension analysis.

The Chrome Web Store's own review process includes automated scanning, but you should catch issues before submission. Consider integrating these tools into your development workflow:

**OWASP ZAP** can scan your extension's popup and options pages for XSS vulnerabilities. Run it against a local server serving your extension pages.

**eslint-plugin-security** can identify potentially dangerous patterns in your JavaScript code:

```bash
npm install --save-dev eslint-plugin-security
```

Configure it to flag dangerous patterns:

```json
{
  "plugins": ["security"],
  "rules": {
    "security/detect-unsafe-regex": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-non-literal-regexp": "error",
**Retire.js** checks your dependencies for known vulnerabilities:

```bash
npm install -g retire
retire --path ./node_modules
```

## OWASP for Extensions {#owasp-for-extensions}

The OWASP (Open Web Application Security Project) Foundation provides resources specifically addressing extension security. The OWASP Top 10 for web applications includes XSS as a persistent threat, and extension developers should understand how these general web vulnerabilities manifest in the extension context.

Key OWASP principles applied to Chrome extensions:

**A01:2021 - Broken Access Control**: Ensure content scripts cannot access extension APIs beyond their intended scope. Use separate content scripts for different privilege levels.

**A03:2021 - Injection**: This directly relates to XSS prevention. Never concatenate user input into HTML, SQL queries, or shell commands.

**A05:2021 - Security Misconfiguration**: Review your CSP, permissions, and manifest configuration. Request only necessary permissions and configure CSP strictly.

**A06:2021 - Vulnerable and Outdated Components**: Keep all dependencies updated. Regularly audit your dependency tree for known vulnerabilities.

**A08:2021 - Software and Data Integrity Failures**: Verify the integrity of data received from web pages and external APIs. Don't trust data based solely on its source.

---

## Related Articles

- [Security Best Practices](../guides/security-best-practices.md)
- [Security Hardening](../guides/security-hardening.md)
- [CSP Troubleshooting](../guides/csp-troubleshooting.md)
- [Content Script Isolation](../guides/content-script-isolation.md)
- [Permissions Model](../guides/permissions-model.md)

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
