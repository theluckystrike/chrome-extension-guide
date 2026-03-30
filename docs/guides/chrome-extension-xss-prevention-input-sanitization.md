---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "Master XSS prevention in Chrome extensions with this comprehensive guide covering DOMPurify, Trusted Types, message sanitization, CSP, and modern browser security APIs."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-xss-prevention-input-sanitization/"
last_modified_at: 2026-01-15
---

Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) vulnerabilities represent one of the most critical security risks facing Chrome extension developers. Unlike traditional web applications, extensions operate with elevated privileges within the browser, granting them access to sensitive APIs, user data, and browser functionality that malicious actors actively target. A single XSS vulnerability in an extension can compromise millions of users, exposing passwords, session tokens, browsing history, and sensitive communications. This comprehensive guide provides the essential techniques and best practices for securing your Chrome extension against XSS attacks through proper input sanitization, secure DOM manipulation, and defense-in-depth strategies.

Understanding XSS in the extension context requires recognizing how extension architecture differs from standard web pages. Extensions consist of multiple components running in different contexts: content scripts that inject into web pages, background service workers that handle logic, popup and options pages that provide user interfaces, and messaging systems that connect these components. Each of these contexts presents unique attack surfaces that require tailored security approaches. The techniques covered here address each component type while building layers of protection that work together to minimize risk.

Understanding Extension-Specific XSS Vectors

Chrome extensions face XSS threats that differ significantly from traditional web applications. The most common vectors include DOM-based XSS through content script manipulation, cross-origin data leakage through message passing, injection via user-controlled URLs, and exploitation of extension API privileges. Understanding these vectors is essential for building effective defenses.

Content scripts represent the most exposed attack surface because they execute within the context of arbitrary web pages. When your content script reads data from the page and renders it without proper sanitization, you create a direct pathway for attackers to inject malicious scripts. This is particularly dangerous because content scripts have access to the `chrome` API, meaning successful attacks can access sensitive extension functionality, retrieve stored data, and interact with background processes.

The fundamental problem stems from the trust boundary confusion that occurs in content scripts. Developers often treat data from the host page as safe because it originates within the extension's execution context, but this data ultimately comes from untrusted web pages controlled by potentially malicious actors. Any data flowing from the page to your content script should be treated as user input requiring sanitization.

Message passing between extension components introduces additional attack vectors. When background scripts receive messages from content scripts without validation, attackers can craft messages that exploit vulnerabilities in message handlers. Similarly, popup pages that display data from storage or background scripts must sanitize this data before rendering. The extension's internal communication system does not provide security boundaries, compromising one component can often lead to compromising others.

URL handling in extensions deserves special attention because extensions frequently work with URLs from various sources. Bookmarklets, context menu actions, navigation events, and external links all provide potential injection points. Extensions that process URLs without validation may inadvertently execute malicious JavaScript contained within URL parameters or fragments.

The Dangers of innerHTML and Unsafe DOM Methods

The most common source of XSS vulnerabilities in extensions is the use of `innerHTML` for rendering content. While `innerHTML` provides convenient syntax for inserting HTML into pages, it parses and executes any HTML content, including embedded scripts. When you set `element.innerHTML = userInput`, any JavaScript within `userInput` will execute in the context of your extension or the host page.

Consider this vulnerable pattern commonly found in extensions:

```javascript
// VULNERABLE: Never use innerHTML with untrusted data
function displaySearchResults(results) {
  const container = document.getElementById('results');
  results.forEach(result => {
    container.innerHTML += `<div class="result">
      <h3>${result.title}</h3>
      <p>${result.description}</p>
      <a href="${result.url}">Visit</a>
    </div>`;
  });
}
```

If an attacker controls `result.title` or `result.description`, they can inject script tags that execute when the HTML is parsed. The same vulnerability exists with other unsafe methods including `insertAdjacentHTML`, `outerHTML`, and any use of `document.write()` in content scripts.

Beyond script tag injection, attackers can exploit `innerHTML` through event handler injection. Even if your CSP blocks inline scripts, attributes like `onload`, `onerror`, or `onmouseover` can execute JavaScript when they fire:

```html
<!-- These execute JavaScript without script tags -->
<img src="x" onerror="alert('XSS')">
<svg onload="alert('XSS')">
<a href="javascript:alert('XSS')">click</a>
```

The solution is to use safe DOM manipulation methods that treat content as text rather than HTML. The preferred approach uses `textContent` for text nodes and `innerText` for displayed text, along with DOM creation methods that create elements programmatically.

DOMPurify Integration for Trusted HTML

When your extension needs to render HTML content from untrusted sources, you need a sanitization library that strips dangerous content while preserving safe formatting. DOMPurify is the industry-standard solution, used by major projects including Google, Facebook, and Twitter. It parses HTML and removes anything dangerous while preserving legitimate formatting.

Installing DOMPurify is straightforward through npm or by including it directly in your extension:

```bash
npm install dompurify
```

For Manifest V3 extensions, you can import DOMPurify as an ES module or include it as a script. The module approach provides better tree-shaking and bundling:

```javascript
import DOMPurify from 'dompurify';

// Configure for extension context
const clean = DOMPurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol'],
  ALLOWED_ATTR: ['href', 'class'],
  ALLOW_DATA_ATTR: false
});
```

The key to effective DOMPurify configuration is restricting allowed tags and attributes to the minimum your extension requires. The default configuration is permissive by design to accommodate common use cases, but you should tighten it based on your specific needs.

For content that requires more formatting options, you can expand the allowed list while remaining cautious:

```javascript
const clean = DOMPurify.sanitize(userContent, {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 
                 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 
                 'li', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick']
});
```

DOMPurify also supports hooks for custom processing and a validation mode that lets you check whether content is clean without modifying it:

```javascript
// Check if content is clean without sanitizing
if (DOMPurify.isValidHTML(dirtyHTML)) {
  // Handle valid content
} else {
  // Reject or sanitize
}
```

For extensions that must render external HTML content like articles or comments, DOMPurify should be your primary defense. Run it on the server when possible to reduce client-side processing, but always sanitize in the extension as a defense-in-depth measure.

The Trusted Types API

Modern browsers provide the Trusted Types API as a powerful mechanism for preventing DOM XSS. This API enables you to write code that only accepts specially created "trusted" values for dangerous operations, blocking injection attacks even if an attacker finds a way to inject malicious content.

Trusted Types work by requiring developers to explicitly create trusted values for operations that were previously vulnerable:

```javascript
// Before Trusted Types - vulnerable
element.innerHTML = userInput;

// With Trusted Types - secure
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => DOMPurify.sanitize(input)
});

element.innerHTML = policy.createHTML(userInput);
```

To enable Trusted Types in your extension, add the appropriate CSP header in your manifest.json:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; trusted-types myPolicy default;"
  }
}
```

The `trusted-types` directive tells the browser to enforce type checking for specified policies. The extension will block any attempt to use innerHTML with a plain string when a policy is defined.

Setting up Trusted Types in your extension requires several steps. First, define your policies in a script that runs early:

```javascript
// trusted-types.js - load early in your extension
if (window.trustedTypes) {
  // Policy for user-generated content
  trustedTypes.createPolicy('usercontent', {
    createHTML: (input) => DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br']
    })
  });

  // Policy for URL rendering
  trustedTypes.createPolicy('urlcontent', {
    createHTML: (input) => {
      // Sanitize URLs to prevent javascript: links
      return DOMPurify.sanitize(input, {
        ADD_ATTR: ['target', 'rel']
      });
    }
  });
}
```

Then ensure your HTML files load the policy script before any other scripts:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="trusted-types.js"></script>
  <!-- Other scripts loaded after -->
</head>
<body>
  <!-- Your extension UI -->
</body>
</html>
```

Trusted Types provide strong protection because they work at the browser level. Even if an attacker somehow bypasses your sanitization logic, the browser will block the operation if it doesn't use a trusted value.

Message Passing Sanitization

Chrome extensions rely heavily on message passing between components, and this communication channel is a prime target for attacks. Messages can originate from content scripts (which run in untrusted page contexts), from external sources through the runtime API, or from compromised extension components.

The fundamental principle is simple: treat all received messages as untrusted input and validate them before acting on their contents. This applies even to messages that appear to come from within your extension.

A secure message handling pattern validates message structure before processing:

```javascript
// Background script - secure message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || typeof message !== 'object') {
    sendResponse({ error: 'Invalid message format' });
    return true;
  }

  // Validate required fields
  if (!message.type || typeof message.type !== 'string') {
    sendResponse({ error: 'Missing message type' });
    return true;
  }

  // Whitelist allowed message types
  const allowedTypes = ['GET_DATA', 'UPDATE_STATUS', 'REQUEST_ACTION'];
  if (!allowedTypes.includes(message.type)) {
    sendResponse({ error: 'Unknown message type' });
    return true;
  }

  // Validate payload based on message type
  switch (message.type) {
    case 'GET_DATA':
      if (message.maxResults && typeof message.maxResults !== 'number') {
        sendResponse({ error: 'Invalid maxResults' });
        return true;
      }
      handleGetData(message, sender, sendResponse);
      break;
    case 'UPDATE_STATUS':
      if (typeof message.status !== 'string' || message.status.length > 100) {
        sendResponse({ error: 'Invalid status' });
        return true;
      }
      handleUpdateStatus(message, sender, sendResponse);
      break;
    default:
      handleDefault(message, sender, sendResponse);
  }

  return true; // Keep message channel open for async responses
});
```

For messages that will be displayed in the UI, sanitize the content before rendering:

```javascript
function displayNotification(message) {
  const notification = document.createElement('div');
  // Always sanitize message content
  notification.textContent = message.text || '';
  document.body.appendChild(notification);
}

// When receiving a message
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_NOTIFICATION') {
    displayNotification(message);
  }
});
```

For additional security, consider implementing message signing for internal communication. This ensures that messages genuinely originated from your extension's components rather than from compromised or malicious code:

```javascript
// Add signature to outgoing messages
function createSignedMessage(type, payload) {
  const message = {
    type,
    payload,
    timestamp: Date.now(),
    source: chrome.runtime.id
  };
  // Add signature using a secret known only to extension components
  message.signature = signMessage(message, EXTENSION_SECRET);
  return message;
}

// Verify signature on incoming messages
function verifyMessage(message) {
  if (!message.signature || message.source !== chrome.runtime.id) {
    return false;
  }
  return verifySignature(message, EXTENSION_SECRET);
}
```

Content Script Injection Risks

Content scripts run in the context of web pages, making them particularly vulnerable to exploitation. Understanding these risks is crucial for building secure extensions.

The most significant risk is DOM hijacking, where attackers manipulate the page to control what your content script sees. Attackers can create fake elements that mimic your extension's selectors, inject data into page elements that your script reads, or intercept communications between your script and the page.

Protect against DOM hijacking by explicitly creating elements rather than reading from the page:

```javascript
// Instead of reading from page elements
const pageTitle = document.querySelector('.article-title').textContent;

// Create your own elements with controlled data
const container = document.createElement('div');
container.className = 'my-extension-result';
const title = document.createElement('h2');
title.textContent = sanitizedTitle; // Already sanitized
container.appendChild(title);
```

Content scripts that execute on page events should validate the event context:

```javascript
document.addEventListener('click', (event) => {
  // Only handle clicks on elements your extension controls
  const target = event.target.closest('[data-extension-action]');
  if (!target) return;

  // Validate the action
  const action = target.dataset.extensionAction;
  if (!ALLOWED_ACTIONS.includes(action)) return;

  handleAction(action, event);
});
```

Be cautious with `eval()` and similar functions that execute strings as code. These are blocked by default CSP in Manifest V3, but any workarounds introduce severe vulnerabilities:

```javascript
// NEVER do this - extremely dangerous
const userCode = userInput;
eval(userCode);

// NEVER do this either
new Function(userCode)();
setTimeout(userCode, 0);
setInterval(userCode, 0);
```

If you absolutely must execute user-provided code, use a sandboxed iframe with restricted capabilities:

```javascript
function executeInSandbox(code) {
  return new Promise((resolve, reject) => {
    const sandbox = document.createElement('iframe');
    sandbox.sandbox.add('allow-scripts');
    sandbox.srcdoc = `<script>
      try {
        const result = eval(atob('${btoa(code)}'));
        window.parent.postMessage({ result }, '*');
      } catch (e) {
        window.parent.postMessage({ error: e.message }, '*');
      }
    <\/script>`;
    document.body.appendChild(sandbox);

    const handler = (event) => {
      if (event.source === sandbox.contentWindow) {
        document.removeEventListener('message', handler);
        sandbox.remove();
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.result);
      }
    };
    document.addEventListener('message', handler);
  });
}
```

Popup and Options Page Security

Popup and options pages are extension UI components that run in the extension's privileged context. While they don't directly interact with untrusted web pages, they handle user data and settings that require careful protection.

Always validate and sanitize any data loaded from storage before displaying it:

```javascript
// Load and sanitize user settings
async function loadSettings() {
  const settings = await chrome.storage.local.get('userPreferences');
  const prefs = settings.userPreferences || {};

  // Validate each setting
  const sanitized = {
    theme: ['light', 'dark', 'system'].includes(prefs.theme) ? prefs.theme : 'system',
    maxResults: Math.min(Math.max(parseInt(prefs.maxResults, 10) || 10, 1), 100),
    username: sanitizeText(prefs.username || ''),
    customCSS: '' // Never load custom CSS from storage without sanitization
  };

  applySettings(sanitized);
}

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  // Remove any HTML tags
  return text.replace(/<[^>]*>/g, '');
}
```

Options pages that accept user configuration should validate inputs thoroughly:

```javascript
document.getElementById('settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const settings = {
    // Validate URL inputs
    apiEndpoint: validateUrl(formData.get('apiEndpoint')),
    // Validate number inputs
    refreshInterval: Math.max(1000, Math.min(60000, parseInt(formData.get('refreshInterval'), 10) || 5000)),
    // Sanitize text inputs
    displayName: sanitizeText(formData.get('displayName'), 50)
  };

  chrome.storage.local.set({ settings });
});

function validateUrl(value) {
  try {
    const url = new URL(value);
    // Only allow https in production
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return url.href;
    }
  } catch (e) {}
  return null;
}
```

For extensions that allow users to define custom styles or templates, use the Sanitizer API or DOMPurify with strict configuration:

```javascript
// If allowing user styles, limit them severely
function sanitizeUserStyle(style) {
  // Only allow safe CSS properties
  const allowedProps = ['color', 'background-color', 'font-size', 'margin', 'padding'];
  const parser = new CSSParser(style);
  // Return only allowed properties
}
```

Content Security Policy as Defense Layer

Content Security Policy serves as your extension's primary defense against XSS attacks. A properly configured CSP restricts what resources can load and execute, significantly reducing the impact of any XSS vulnerabilities that slip through.

For detailed CSP configuration, refer to our [Chrome Extension Content Security Policy](/guides/chrome-extension-content-security-policy/) guide. The following provides essential configuration for XSS prevention:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'"
  }
}
```

Key directives for XSS prevention include:

- `script-src 'self'`: Only allows scripts from your extension's origin
- `object-src 'none'`: Blocks plugins and embedded content
- `frame-ancestors 'none'`: Prevents clickjacking through iframe embedding

For extensions that need to load external scripts, use Subresource Integrity:

```html
<script src="https://cdn.example.com/library.js" 
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>
```

The Sanitizer API

The Sanitizer API is a native browser API that provides built-in HTML sanitization without external libraries. While browser support is still developing, it offers a standards-based approach to sanitization:

```javascript
// Check if Sanitizer API is available
if (window.Sanitizer) {
  const sanitizer = new Sanitizer({
    allowElements: ['b', 'i', 'em', 'strong', 'a', 'p'],
    allowAttributes: { 'href': ['a'] },
    dropElements: ['script', 'style', 'iframe']
  });

  const clean = sanitizer.sanitize(userInput);
  element.innerHTML = clean;
} else {
  // Fallback to DOMPurify
  element.innerHTML = DOMPurify.sanitize(userInput);
}
```

The Sanitizer API provides a secure default configuration while allowing customization. As browser support improves, it will become the preferred approach for new extensions.

Automated Security Scanning

Regular security scanning helps identify XSS vulnerabilities before they reach production. Several tools can integrate into your development workflow.

For static analysis, consider ESLint plugins and security-focused linters:

```bash
npm install --save-dev eslint-plugin-security
```

Configure ESLint to detect potential XSS issues:

```json
{
  "plugins": ["security"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-non-literal-require": "warn",
    "security/detect-possible-timing-attacks": "warn",
    "security/detect-pseudoRandom-bytes": "warn"
  }
}
```

For runtime testing, tools like OWASP ZAP can scan your extension:

```bash
Install OWASP ZAP
brew install owasp-zap

Run baseline scan
zap-baseline.py -t chrome-extension://your-extension-id/options.html
```

For comprehensive security testing, refer to our [Extension Security Audit](/guides/extension-security-audit/) guide which covers automated scanning, manual testing, and vulnerability assessment.

OWASP for Extensions

The OWASP Foundation provides resources specifically applicable to extension security. The OWASP Top 10 for web applications includes XSS as a critical vulnerability, and extension-specific guidance expands on these concepts.

Key OWASP principles for extensions include:

Input Validation: Validate all input at the boundary between untrusted and trusted contexts. For content scripts, this means validating everything from the page. For background scripts, validate everything from content scripts and external messages.

Output Encoding: Encode output when passing data between contexts. When your content script sends data to the popup, encode it appropriately. When displaying data in the UI, use textContent or sanitization.

Defense in Depth: Never rely on a single security measure. Combine CSP, sanitization, input validation, and secure coding practices. If one layer fails, others provide protection.

Principle of Least Privilege: Request minimum necessary permissions. Extensions with fewer permissions have smaller attack surfaces. Avoid the `<all_urls>` permission unless absolutely necessary.

For additional security hardening techniques, see our [Chrome Extension Security Hardening](/guides/chrome-extension-security-hardening/) guide which covers comprehensive protection strategies including secure coding patterns, dependency management, and deployment security.

Security Checklist

Before publishing your extension, verify these XSS prevention measures:

- [ ] All user input is validated at entry points
- [ ] DOM manipulation uses textContent, innerText, or sanitized HTML
- [ ] DOMPurify is integrated for any HTML rendering from untrusted sources
- [ ] CSP is configured with strict script-src and object-src policies
- [ ] Message handlers validate all incoming messages
- [ ] Content scripts treat all page data as untrusted
- [ ] Popup and options pages sanitize stored data before display
- [ ] Trusted Types API is implemented where possible
- [ ] No use of eval() or similar code execution functions
- [ ] Security scanning is integrated into CI/CD pipeline
- [ ] Dependencies are regularly audited for vulnerabilities

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
