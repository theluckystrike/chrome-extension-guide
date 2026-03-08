---
layout: default
title: "Chrome Extension Security Hardening — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/security-hardening/"
---
# Chrome Extension Security Hardening

An advanced, actionable guide to hardening Chrome extensions against real-world attack vectors. This goes beyond the basics covered in `security-best-practices.md` with concrete implementations you can drop into your codebase.

## Content Security Policy Configuration

MV3 provides a default CSP, but you should tighten it further for different extension contexts.

### Extension Pages CSP

Lock down your popup, options page, and side panel:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.yourservice.com; frame-ancestors 'none'; base-uri 'self'"
  }
}
```

Key directives:
- `object-src 'none'` — blocks Flash, Java, and other plugin-based content
- `frame-ancestors 'none'` — prevents your extension pages from being embedded in iframes (clickjacking defense)
- `base-uri 'self'` — prevents `<base>` tag injection that redirects relative URLs
- `connect-src` — whitelist only the exact API origins your extension contacts

### Sandbox CSP

If you need to run untrusted HTML (e.g., rendering user-provided templates), use a sandboxed page:

```json
{
  "sandbox": {
    "pages": ["sandbox.html"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts; script-src 'self'; object-src 'none'"
  }
}
```

The sandboxed page runs in a unique origin with no access to extension APIs. Communicate with it via `postMessage`:

```typescript
// background.ts — send data to sandbox for processing
const iframe = document.createElement('iframe');
iframe.src = chrome.runtime.getURL('sandbox.html');

iframe.addEventListener('load', () => {
  iframe.contentWindow?.postMessage(
    { type: 'RENDER_TEMPLATE', template: userTemplate, data: safeData },
    '*'  // sandbox has unique origin, so '*' is acceptable here
  );
});

// sandbox.html script — receives and processes
window.addEventListener('message', (event) => {
  if (event.data.type === 'RENDER_TEMPLATE') {
    const result = renderTemplate(event.data.template, event.data.data);
    event.source?.postMessage({ type: 'RENDER_RESULT', html: result }, event.origin);
  }
});
```

## Input Sanitization in Content Scripts

Content scripts run in the context of web pages. Any data read from the DOM is attacker-controlled.

### Never Use innerHTML with Page Data

```typescript
// DANGEROUS — XSS via DOM data
const title = document.querySelector('h1')?.textContent;
container.innerHTML = `<div class="overlay">${title}</div>`;

// SAFE — use DOM APIs
const title = document.querySelector('h1')?.textContent ?? '';
const div = document.createElement('div');
div.className = 'overlay';
div.textContent = title;  // textContent auto-escapes
container.appendChild(div);
```

### Build a Sanitization Utility

For cases where you must work with HTML, build a strict sanitizer:

```typescript
const ALLOWED_TAGS = new Set(['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span']);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
  span: new Set(['class']),
};

function sanitizeHTML(dirty: string): string {
  const template = document.createElement('template');
  template.innerHTML = dirty;

  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        const el = node as Element;
        if (!ALLOWED_TAGS.has(el.tagName.toLowerCase())) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodesToRemove: Element[] = [];

  // Collect disallowed nodes
  const allElements = template.content.querySelectorAll('*');
  for (const el of allElements) {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      nodesToRemove.push(el);
      continue;
    }
    // Strip disallowed attributes
    const allowedAttrs = ALLOWED_ATTRS[tag] ?? new Set();
    for (const attr of Array.from(el.attributes)) {
      if (!allowedAttrs.has(attr.name)) {
        el.removeAttribute(attr.name);
      }
    }
    // Validate href values — block javascript: URLs
    if (el.hasAttribute('href')) {
      const href = el.getAttribute('href') ?? '';
      if (!/^https?:\/\//i.test(href) && !href.startsWith('#') && !href.startsWith('/')) {
        el.removeAttribute('href');
      }
    }
  }

  for (const node of nodesToRemove) {
    node.replaceWith(...Array.from(node.childNodes));
  }

  return template.innerHTML;
}
```

### Validate URLs Before Navigation

```typescript
function isSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Use before chrome.tabs.create, window.open, etc.
function safeNavigate(url: string): void {
  if (!isSafeURL(url)) {
    console.error('Blocked navigation to unsafe URL:', url);
    return;
  }
  chrome.tabs.create({ url });
}
```

## Secure Message Validation

### Verify Sender in onMessage

Every message handler must validate who sent the message:

```typescript
// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Verify the sender is our own extension
  if (sender.id !== chrome.runtime.id) {
    console.warn('Message from unknown extension:', sender.id);
    return false;
  }

  // For content script messages, verify the tab URL
  if (sender.tab) {
    const url = new URL(sender.tab.url ?? '');
    const allowedOrigins = ['https://app.yourservice.com', 'https://dashboard.yourservice.com'];

    if (!allowedOrigins.includes(url.origin)) {
      console.warn('Message from untrusted origin:', url.origin);
      return false;
    }
  }

  // Validate message shape with a type guard
  if (!isValidMessage(message)) {
    console.warn('Malformed message:', message);
    return false;
  }

  handleMessage(message, sender, sendResponse);
  return true; // keep channel open for async response
});

// Type guard for message validation
interface ExtensionMessage {
  type: string;
  payload: unknown;
  nonce?: string;
}

function isValidMessage(msg: unknown): msg is ExtensionMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const obj = msg as Record<string, unknown>;
  return typeof obj.type === 'string' && obj.type.length > 0 && obj.type.length < 100;
}
```

### Secure External Messaging

If your extension accepts messages from web pages via `externally_connectable`:

```json
{
  "externally_connectable": {
    "matches": ["https://app.yourservice.com/*"]
  }
}
```

```typescript
// background.ts — handle external messages
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // sender.url is the page URL, sender.id is undefined for web pages
  if (!sender.url) {
    return false;
  }

  const senderOrigin = new URL(sender.url).origin;
  const trustedOrigins = new Set(['https://app.yourservice.com']);

  if (!trustedOrigins.has(senderOrigin)) {
    console.warn('External message from untrusted origin:', senderOrigin);
    return false;
  }

  // Rate limit external messages
  const key = `rate:${senderOrigin}`;
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 30;

  chrome.storage.session.get(key, (data) => {
    const timestamps: number[] = (data[key] ?? []).filter(
      (t: number) => now - t < windowMs
    );

    if (timestamps.length >= maxRequests) {
      sendResponse({ error: 'RATE_LIMITED' });
      return;
    }

    timestamps.push(now);
    chrome.storage.session.set({ [key]: timestamps });
    handleExternalMessage(message, sender, sendResponse);
  });

  return true;
});
```

## Minimal Permissions with Optional Permissions

### Audit Your Permissions

Map every permission to the feature that requires it:

```typescript
// permissions-map.ts — document why each permission exists
export const PERMISSION_JUSTIFICATION = {
  required: {
    storage: 'Core settings and user preferences',
    activeTab: 'Read page content when user clicks the extension icon',
  },
  optional: {
    bookmarks: 'Bookmark import/export feature (Settings > Import)',
    history: 'History search feature (activated from command palette)',
    downloads: 'Export data as file (activated from export dialog)',
    tabs: 'Tab overview panel (activated from side panel)',
  },
} as const;
```

### Request Permissions Just-In-Time

```typescript
async function withPermission<T>(
  permission: chrome.permissions.Permissions,
  action: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  const hasPermission = await chrome.permissions.contains(permission);

  if (hasPermission) {
    return action();
  }

  const granted = await chrome.permissions.request(permission);

  if (granted) {
    return action();
  }

  if (fallback) {
    return fallback();
  }

  throw new Error(`Permission denied: ${JSON.stringify(permission)}`);
}

// Usage
async function exportBookmarks() {
  return withPermission(
    { permissions: ['bookmarks'] },
    async () => {
      const tree = await chrome.bookmarks.getTree();
      return serializeBookmarks(tree);
    },
    () => {
      showNotification('Bookmark access is required for export.');
      return null;
    }
  );
}
```

### Release Permissions When No Longer Needed

```typescript
async function cleanupUnusedPermissions(): Promise<void> {
  const settings = await chrome.storage.local.get('enabledFeatures');
  const enabled = new Set(settings.enabledFeatures ?? []);

  const featurePermissions: Record<string, string[]> = {
    bookmarkSync: ['bookmarks'],
    historySearch: ['history'],
    downloadExport: ['downloads'],
  };

  for (const [feature, perms] of Object.entries(featurePermissions)) {
    if (!enabled.has(feature)) {
      const removed = await chrome.permissions.remove({ permissions: perms });
      if (removed) {
        console.log(`Released permissions for disabled feature: ${feature}`);
      }
    }
  }
}

// Run on extension startup
chrome.runtime.onStartup.addListener(cleanupUnusedPermissions);
```

## Storage Encryption for Sensitive Data

Chrome extension storage is not encrypted at rest. Any extension with the `storage` permission can read its own storage, and local storage is accessible via the file system.

### Encrypt Sensitive Values

```typescript
class SecureStorage {
  private keyMaterial: CryptoKey | null = null;

  /**
   * Derive an encryption key from a user-provided passphrase.
   * For extensions that authenticate users, derive from the auth token instead.
   */
  async init(passphrase: string): Promise<void> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Use a fixed salt stored in extension storage (generated once)
    let { encSalt } = await chrome.storage.local.get('encSalt');
    if (!encSalt) {
      encSalt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
      await chrome.storage.local.set({ encSalt });
    }

    this.keyMaterial = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(encSalt),
        iterations: 310_000,  // OWASP recommendation for PBKDF2-SHA256
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(plaintext: string): Promise<{ iv: number[]; data: number[] }> {
    if (!this.keyMaterial) throw new Error('SecureStorage not initialized');

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.keyMaterial,
      encoded
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(ciphertext)),
    };
  }

  async decrypt(encrypted: { iv: number[]; data: number[] }): Promise<string> {
    if (!this.keyMaterial) throw new Error('SecureStorage not initialized');

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(encrypted.iv) },
      this.keyMaterial,
      new Uint8Array(encrypted.data)
    );

    return new TextDecoder().decode(decrypted);
  }

  async setSecure(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(value);
    await chrome.storage.local.set({ [`sec:${key}`]: encrypted });
  }

  async getSecure(key: string): Promise<string | null> {
    const result = await chrome.storage.local.get(`sec:${key}`);
    const encrypted = result[`sec:${key}`];
    if (!encrypted) return null;
    return this.decrypt(encrypted);
  }
}

// Usage
const secureStorage = new SecureStorage();
await secureStorage.init(userPassphrase);
await secureStorage.setSecure('apiToken', 'sk-live-abc123...');
const token = await secureStorage.getSecure('apiToken');
```

## XSS Prevention in Extension Pages

### Use Trusted Types

Enable Trusted Types in your CSP to prevent DOM XSS at the browser level:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'"
  }
}
```

Create a Trusted Types policy for controlled DOM manipulation:

```typescript
// trusted-types.ts
const policy = trustedTypes.createPolicy('extension-safe', {
  createHTML(input: string): string {
    // Only allow pre-sanitized content
    return sanitizeHTML(input);
  },
  createScriptURL(input: string): string {
    // Only allow extension URLs
    if (input.startsWith(chrome.runtime.getURL(''))) {
      return input;
    }
    throw new Error(`Blocked script URL: ${input}`);
  },
});

export { policy };
```

### Template Rendering Without innerHTML

Build your UI safely with a builder pattern:

```typescript
type Attrs = Record<string, string>;

function el(tag: string, attrs: Attrs = {}, children: (Node | string)[] = []): HTMLElement {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') {
      element.className = value;
    } else if (key.startsWith('data-')) {
      element.dataset[key.slice(5)] = value;
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }

  return element;
}

// Usage — builds DOM without any innerHTML
function renderBookmarkList(bookmarks: { title: string; url: string }[]): HTMLElement {
  return el('ul', { class: 'bookmark-list' },
    bookmarks.map((bm) =>
      el('li', { class: 'bookmark-item' }, [
        el('a', { href: bm.url, class: 'bookmark-link' }, [bm.title]),
      ])
    )
  );
}
```

## Clickjacking Protection

Extension pages can be embedded in iframes on malicious sites if you are not careful.

### Frame-Busting in Extension Pages

```typescript
// Run at the top of every extension page (popup, options, side panel)
function preventFraming(): void {
  if (window.top !== window.self) {
    // We are in an iframe — break out or blank the page
    document.documentElement.innerHTML = '';
    console.error('Extension page loaded in iframe — possible clickjacking attempt');

    // Attempt to redirect the top frame
    try {
      window.top!.location = window.self.location;
    } catch {
      // Cross-origin — cannot redirect, page is already blanked
    }
    return;
  }
}

preventFraming();
```

### X-Frame-Options via Web Request Rules

Use Declarative Net Request to add headers to your extension page responses:

```json
{
  "declarative_net_request": {
    "rule_resources": [{
      "id": "security_headers",
      "enabled": true,
      "path": "rules/security-headers.json"
    }]
  }
}
```

```json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "responseHeaders": [
        {
          "header": "X-Frame-Options",
          "operation": "set",
          "value": "DENY"
        },
        {
          "header": "X-Content-Type-Options",
          "operation": "set",
          "value": "nosniff"
        }
      ]
    },
    "condition": {
      "urlFilter": "*",
      "resourceTypes": ["sub_frame"]
    }
  }
]
```

## Network Request Security

### HTTPS Enforcement

Block all non-HTTPS requests from your extension:

```typescript
// network-security.ts
const ALLOWED_PROTOCOLS = new Set(['https:']);

function enforceHTTPS(url: string): string {
  const parsed = new URL(url);
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Blocked insecure request to ${parsed.protocol}//${parsed.host}`);
  }
  return url;
}

// Wrap fetch for the entire extension
const originalFetch = globalThis.fetch;

globalThis.fetch = async function secureFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  enforceHTTPS(url);
  return originalFetch.call(globalThis, input, init);
};
```

### API Client with Security Defaults

```typescript
class SecureAPIClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string, timeout = 10_000) {
    if (!baseURL.startsWith('https://')) {
      throw new Error('SecureAPIClient requires HTTPS');
    }
    this.baseURL = baseURL.replace(/\/$/, '');
    this.timeout = timeout;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        // Prevent credentials from leaking
        credentials: 'omit',
        // Prevent referrer leakage
        referrerPolicy: 'no-referrer',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Validate Content-Type before parsing
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Unexpected Content-Type: ${contentType}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Usage
const api = new SecureAPIClient('https://api.yourservice.com');
const data = await api.request<{ items: string[] }>('/v1/items');
```

## Third-Party Dependency Auditing

### Lock and Audit Dependencies

```bash
# Use a lockfile — always
npm ci  # not npm install in CI

# Audit for known vulnerabilities
npm audit --production

# Check for unused dependencies
npx depcheck

# Check for outdated packages
npm outdated
```

### Vendoring Critical Dependencies

For maximum security, vendor your critical dependencies so supply chain attacks cannot affect your published extension:

```bash
# Create a vendor directory
mkdir -p src/vendor

# Copy the specific files you need (not entire packages)
cp node_modules/some-lib/dist/index.min.js src/vendor/some-lib.js

# Generate integrity hashes
shasum -a 256 src/vendor/*.js > src/vendor/CHECKSUMS.sha256
```

Add a verification step to your build:

```typescript
// scripts/verify-vendor.ts
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const checksums = readFileSync('src/vendor/CHECKSUMS.sha256', 'utf-8')
  .trim()
  .split('\n')
  .map((line) => {
    const [hash, file] = line.split(/\s+/);
    return { hash, file };
  });

for (const { hash, file } of checksums) {
  const content = readFileSync(file);
  const actual = createHash('sha256').update(content).digest('hex');
  if (actual !== hash) {
    console.error(`INTEGRITY FAILURE: ${file}`);
    console.error(`  Expected: ${hash}`);
    console.error(`  Actual:   ${actual}`);
    process.exit(1);
  }
}

console.log('All vendor integrity checks passed.');
```

### Subresource Integrity for CDN Resources

If you must load resources from a CDN (e.g., in a sandboxed page):

```html
<script
  src="https://cdn.example.com/lib.min.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxAh6jE..."
  crossorigin="anonymous"
></script>
```

## Chrome Web Store Security Review Preparation

The Chrome Web Store reviews extensions for security issues. Prepare your submission to avoid rejections.

### Pre-Submission Checklist

```typescript
// scripts/security-audit.ts — run before every submission
import { readFileSync } from 'fs';

interface AuditResult {
  check: string;
  passed: boolean;
  details?: string;
}

function auditManifest(): AuditResult[] {
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'));
  const results: AuditResult[] = [];

  // Check for overly broad host permissions
  const hostPerms = manifest.host_permissions ?? [];
  results.push({
    check: 'No wildcard host permissions',
    passed: !hostPerms.includes('<all_urls>') && !hostPerms.includes('*://*/*'),
    details: hostPerms.join(', '),
  });

  // Check CSP exists
  results.push({
    check: 'CSP defined',
    passed: !!manifest.content_security_policy?.extension_pages,
  });

  // Check no remote code
  const csp = manifest.content_security_policy?.extension_pages ?? '';
  results.push({
    check: 'No unsafe-eval in CSP',
    passed: !csp.includes('unsafe-eval'),
  });

  // Check permissions are documented
  const allPerms = [...(manifest.permissions ?? []), ...(manifest.optional_permissions ?? [])];
  results.push({
    check: 'Permissions count reasonable',
    passed: allPerms.length <= 10,
    details: `${allPerms.length} permissions declared`,
  });

  return results;
}

const results = auditManifest();
const failures = results.filter((r) => !r.passed);

console.log('\nSecurity Audit Results:');
for (const r of results) {
  const icon = r.passed ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${r.check}${r.details ? ` (${r.details})` : ''}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed. Fix before submission.`);
  process.exit(1);
}
```

### Justification Document

Create a `PERMISSIONS_JUSTIFICATION.md` that maps each permission to its user-facing feature. Chrome Web Store reviewers check this:

```
| Permission | Feature | User Action |
|---|---|---|
| storage | Save settings | Automatic |
| activeTab | Read current page | User clicks icon |
| bookmarks | Import bookmarks | Settings > Import |
```

### Code Minification Considerations

Chrome Web Store may reject heavily obfuscated code. Use minification but not obfuscation:

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    // Minify but keep readable
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,  // Keep console for review transparency
      },
      mangle: {
        keep_fnames: true,  // Preserve function names for reviewability
      },
      format: {
        comments: 'some',  // Keep license comments
      },
    },
    // Include source maps for review
    sourcemap: true,
  },
});
```

## Summary

Security hardening is not optional for Chrome extensions. Extensions run with elevated privileges and access sensitive user data. Apply these measures as layers of defense:

1. **CSP** — restrict what code can execute in your extension pages
2. **Input sanitization** — never trust data from web pages
3. **Message validation** — verify every sender, validate every payload
4. **Minimal permissions** — request only what you need, when you need it
5. **Encrypted storage** — protect sensitive data at rest
6. **XSS prevention** — use Trusted Types and DOM APIs, avoid innerHTML
7. **Clickjacking defense** — prevent embedding of extension pages
8. **Network security** — enforce HTTPS, set timeouts, validate responses
9. **Dependency auditing** — vendor critical deps, verify integrity
10. **Pre-submission audit** — automated checks before every Web Store upload

Cross-references:
- `docs/guides/security-best-practices.md` — foundational security concepts
- `docs/guides/permissions-model.md` — Chrome permissions system in depth
- `docs/guides/content-script-isolation.md` — content script security boundaries
- `docs/guides/web-request-patterns.md` — network request handling

## Related Articles

- [Security Best Practices](../guides/security-best-practices.md)
- [Security Audit](../guides/extension-security-audit.md)
