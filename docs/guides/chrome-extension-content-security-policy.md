---
layout: default
title: "Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3"
description: "Master CSP in Chrome extensions: MV3 defaults, sandbox pages, eval alternatives, trusted types, nonce scripts, remote code restrictions, debugging."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-content-security-policy/"
---

# Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3

Content Security Policy (CSP) is your first line of defense against cross-site scripting (XSS), data injection, and code injection attacks in Chrome extensions. With Manifest V3's stricter security model, understanding CSP is no longer optional—it's essential for building secure, store-compliant extensions. This guide covers everything from MV3's default CSP to advanced techniques like trusted types and nonce-based script execution.

## Understanding MV3's Default CSP

Chrome extensions running on Manifest V3 operate under a restrictive default Content Security Policy that significantly limits what your extension can do. Understanding these defaults is critical before attempting to customize them.

### Default Policy for Extension Pages

All extension pages—popups, options pages, side panels, and the background service worker—inherit this default CSP:

```
default-src 'self'; script-src 'self'; object-src 'self'; child-src 'self';
```

This default policy imposes several important restrictions:

- **Scripts**: Only `'self'` (your extension's bundled files) are allowed. Remote scripts are completely blocked.
- **Objects**: Only locally bundled plugins and resources are permitted.
- **Frames**: Only extension pages and the extension's own origins can be embedded.
- **XHR/Fetch**: By default, only same-origin requests are allowed.

The background service worker faces even stricter limitations—it cannot execute dynamically generated code, meaning `eval()`, `new Function()`, and similar constructs are completely unavailable.

### Content Script Context

Content scripts occupy a unique security context. They inherit the CSP of the pages they inject into, but also receive additional restrictions:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

Content scripts can only make cross-origin requests if the extension has appropriate host permissions. Without host permissions, all network requests from content scripts are blocked by the browser's same-origin policy.

## Sandboxed Pages: Isolating Untrusted Code

Sometimes you need to execute code that you cannot fully trust—perhaps rendering user-generated templates, processing third-party markdown, or running legacy libraries with potentially unsafe patterns. This is where sandboxed pages become essential.

### Configuring Sandbox Pages

Sandbox pages run in an isolated origin with no access to extension APIs. They're ideal for processing untrusted content safely:

```json
{
  "sandbox": {
    "pages": ["sandbox.html", "sandbox-preview.html"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts allow-same-origin; script-src 'self' 'unsafe-eval'; object-src 'none'"
  }
}
```

The sandbox CSP is separate from your extension pages' CSP and can be more permissive, allowing `'unsafe-eval'` within the sandbox context.

### Communication Pattern with Sandboxed Pages

Since sandboxed pages lack extension API access, you communicate via message passing:

```typescript
// background.ts — sending work to sandbox
export function processUserTemplate(template: string, data: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('sandbox.html');
    iframe.style.display = 'none';
    
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'TEMPLATE_RESULT') {
        window.removeEventListener('message', messageHandler);
        iframe.remove();
        resolve(event.data.html);
      } else if (event.data.type === 'TEMPLATE_ERROR') {
        window.removeEventListener('message', messageHandler);
        iframe.remove();
        reject(new Error(event.data.error));
      }
    };
    
    window.addEventListener('message', messageHandler);
    document.body.appendChild(iframe);
    
    iframe.addEventListener('load', () => {
      iframe.contentWindow?.postMessage(
        { type: 'RENDER_TEMPLATE', template, data },
        '*'
      );
    });
  });
}
```

```html
<!-- sandbox.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="sandbox-renderer.js"></script>
</head>
<body>
  <div id="output"></div>
</body>
</html>
```

```javascript
// sandbox-renderer.js
window.addEventListener('message', (event) => {
  if (event.data.type === 'RENDER_TEMPLATE') {
    try {
      // Use a safe template engine here
      const result = renderTemplate(event.data.template, event.data.data);
      event.source.postMessage({ type: 'TEMPLATE_RESULT', html: result }, '*');
    } catch (error) {
      event.source.postMessage({ type: 'TEMPLATE_ERROR', error: error.message }, '*');
    }
  }
});
```

## Alternatives to eval() and Function()

MV3's restriction on `eval()` and `new Function()` affects extensions that rely on runtime code generation. Common use cases include:

- Template engines that compile templates to functions
- DSL interpreters
- Dynamic rule evaluation
- String-based math expression parsers

### Safe Alternatives

**Precompilation**: Move code generation to build time rather than runtime:

```typescript
// Instead of runtime template compilation:
const compiled = eval('(' + templateString + ')');

// Use precompiled templates:
import { compile } from 'handlebars';
const precompiled = compile(templateSource);
// Store precompiled template in extension
```

**JSON.parse() for Data**: If you're using `eval()` to parse JSON-like data, use `JSON.parse()` instead—it's safer and faster.

**Function Constructors with Limited Scope**: If you must generate functions, use a Web Worker (which has its own isolated global scope):

```typescript
// worker.ts — runs in isolated scope
self.onmessage = (event) => {
  try {
    // Use Function constructor in worker context
    const fn = new Function('data', event.data.expression);
    const result = fn(event.data.variables);
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
```

**Expression Evaluators**: For math or logical expression evaluation, use purpose-built libraries like `mathjs` or `filbert` that don't rely on `eval()`.

## Trusted Types: Preventing DOM XSS

Trusted Types is a browser security feature that helps prevent DOM-based XSS by requiring you to explicitly create trusted values before using them in sensitive DOM sinks. Chrome extensions should adopt Trusted Types as part of their defense-in-depth strategy.

### Enabling Trusted Types

Add the policy to your extension pages:

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="require-trusted-types-for 'script'">
  <script src="app.js"></script>
</head>
<body>
  <!-- Your extension UI -->
</body>
</html>
```

### Creating Trusted Type Policies

Define policies that restrict how values can be created:

```typescript
// trusted-types.ts
// Create a policy for safe HTML rendering
const safeHtmlPolicy = trustedTypes.createPolicy('safeHtml', {
  createHTML: (input: string) => {
    // Sanitize the input - use DOMPurify or similar
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'] });
  }
});

// Create a policy for URLs
const safeUrlPolicy = trustedTypes.createPolicy('safeUrl', {
  createURL: (input: string) => {
    const url = new URL(input);
    // Only allow http, https, and extension protocols
    if (!['http:', 'https:', 'chrome-extension:'].includes(url.protocol)) {
      throw new Error('Disallowed protocol');
    }
    return url;
  }
});

// Usage
const sanitizedHtml = safeHtmlPolicy.createHTML(userInput);
element.innerHTML = sanitizedHtml; // Works if CSP requires trusted types

const safeLink = safeUrlPolicy.createURL(userUrl);
link.href = safeLink;
```

### Integration with CSP

Trusted Types work alongside your existing CSP:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'"
  }
}
```

## Nonce-Based Script Execution

When you need to execute specific scripts while maintaining strict CSP, nonces provide a solution. A nonce is a random token generated server-side (or in your extension's background script) that allows a specific script tag to execute.

### Implementing Nonces in Extension Pages

Generate a nonce in your HTML and include it in your script tags:

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'nonce-{NONCE}'; object-src 'none'">
</head>
<body>
  <div id="app"></div>
  
  <!-- Nonced script - will execute because nonce matches -->
  <script nonce="{NONCE}">
    // Your extension initialization code
    initializeApp();
  </script>
  
  <!-- Dynamic scripts need to be handled differently -->
  <script nonce="{NONCE}" src="app.js"></script>
</body>
</html>
```

For dynamically added scripts in your JavaScript:

```typescript
function createScriptWithNonce(src: string, nonce: string): HTMLScriptElement {
  const script = document.createElement('script');
  script.src = src;
  script.nonce = nonce;
  script.type = 'module';
  return script;
}

// Generate nonce (in production, use cryptographically secure random)
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
```

## Remote Code Restrictions and Remote Hosting

MV3 fundamentally changed how extensions can load code. Understanding these restrictions is critical for architecture decisions.

### The Remote Code Ban

Manifest V3 prohibits loading executable code from remote servers:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

This means:
- All JavaScript must be bundled with the extension
- You cannot fetch JS from external CDN and execute it
- Extension updates must include all code changes

### Alternatives to Remote Code

If you previously used remote code loading, consider these MV3-compatible approaches:

**Configuration-Driven Behavior**: Store logic in JSON configuration bundled with the extension:

```typescript
// rules.json (bundled)
{
  "transformations": [
    { "pattern": "*.example.com", "action": "redirect", "to": "https://new.example.com" }
  ]
}

// background.ts
import rules from './rules.json';

function applyRule(url: string): string | null {
  for (const rule of rules.transformations) {
    if (matchPattern(rule.pattern, url)) {
      return applyTransformation(url, rule);
    }
  }
  return null;
}
```

**Feature Flags**: Use bundled configuration to enable/disable features:

```typescript
// feature-flags.json
{
  "newUi": true,
  "betaFeatures": ["advanced-filtering", "export-pdf"],
  "apiEndpoint": "https://api.production.example.com"
}
```

**Remote Configuration (Not Code)**: Fetch data-driven configuration, not executable code:

```typescript
async function fetchConfiguration(): Promise<ExtensionConfig> {
  const response = await fetch('https://config.example.com/extension-config.json');
  // Validate configuration schema before using
  return validateConfig(await response.json());
}
```

## CSP Violation Reporting

Monitoring CSP violations helps identify potential security issues and misconfigurations before they become problems.

### Setting Up Reporting

Add a report-uri or use the Reporting API:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; report-uri https://your-api.example.com/csp-reports"
  }
}
```

### Handling Reports in Extension Context

For extension pages, use the chrome.runtime API to collect violations:

```typescript
// In your extension's background or popup
document.addEventListener('securitypolicyviolation', (event) => {
  const violation = {
    blockedURI: event.blockedURI,
    violatedDirective: event.violatedDirective,
    effectiveDirective: event.effectiveDirective,
    originalPolicy: event.originalPolicy,
    timestamp: new Date().toISOString(),
    documentURL: event.documentURL
  };
  
  // Log locally for debugging
  console.warn('CSP Violation:', violation);
  
  // Optionally send to your analytics
  sendToAnalytics('csp-violation', violation);
});
```

### Common Violation Patterns

Be aware of these common MV3 CSP violations:

| Violation | Cause | Solution |
|-----------|-------|----------|
| `script-src 'self'` + external script | Loading scripts from CDN | Bundle the script or use import maps |
| `object-src 'none'` + Flash/Java | Legacy plugin content | Remove plugin dependencies |
| Inline scripts without nonce | `<script>alert(1)</script>` | Use external files or nonces |
| `eval()` usage | Runtime code generation | Use alternatives shown earlier |

## Debugging CSP Errors

When CSP blocks resources, debugging can be challenging. Here's a systematic approach.

### Identifying CSP Errors

CSP violations appear in multiple places:

1. **Console**: Red CSP error messages in DevTools
2. **chrome://extensions**: Error page with blocked resource details
3. **DevTools Network Tab**: Failed requests with "blocked by CSP" status

### Using DevTools Effectively

1. Open your extension's popup or options page
2. Open DevTools (right-click → Inspect)
3. Check the Console for CSP violation messages
4. Look for failed network requests in the Network tab

### Common Fixes

**Scripts not loading**:
- Check if script is bundled in manifest
- Verify file path in `web_accessible_resources` if loaded dynamically

**Styles not applying**:
- Ensure `style-src 'self'` includes any external stylesheets
- Consider using CSS-in-JS solutions bundled with extension

**Images/Resources blocked**:
- Add `img-src 'self' data:` for inline images
- Whitelist external domains in appropriate directives

**Fonts not loading**:
- Add `font-src` for external font sources
- Bundle fonts with extension when possible

## Migration from MV2 Relaxed CSP

Extensions migrating from Manifest V2 often face CSP-related breaking changes. Here's how to address common issues.

### MV2 vs MV3 CSP Differences

| Aspect | MV2 | MV3 |
|--------|-----|-----|
| Default | Less restrictive | Stricter by default |
| eval() | Allowed with `'unsafe-eval'` | Requires explicit policy |
| Remote scripts | Allowed with CSP override | Banned entirely |
| Inline scripts | Allowed with hash/nonce | Requires nonce or hash |

### Step-by-Step Migration

1. **Audit current code**: Find all uses of `eval()`, `new Function()`, inline scripts, and external resource loading

2. **Bundle resources**: Move all external scripts, styles, and fonts into your extension bundle

3. **Replace dynamic code**: Refactor any runtime code generation:
   ```typescript
   // MV2: eval-based template
   const render = eval('(function(data) { return ' + template + ' })');
   
   // MV3: precompiled Handlebars
   import Handlebars from 'handlebars';
   const compiled = Handlebars.compile(template);
   const render = (data) => compiled(data);
   ```

4. **Update manifest CSP**: Tighten your CSP:
   ```json
   {
     "content_security_policy": {
       "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'"
     }
   }
   ```

5. **Test thoroughly**: Load unpacked, check console for violations

## Real-World Secure Extension Examples

### Example 1: Tightly Scoped CSP

A privacy-focused extension with minimal permissions:

```json
{
  "name": "Privacy Shield",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["storage", "activeTab"],
  "host_permissions": [],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"
  }
}
```

Key security features:
- No external script sources
- `object-src 'none'` blocks plugin-based attacks
- `frame-ancestors 'none'` prevents clickjacking
- No `connect-src` external domains limits data exfiltration

### Example 2: Extension with API Integration

An extension that communicates with a single backend API:

```json
{
  "name": "Cloud Sync Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": ["https://api.example.com/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.example.com; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'"
  }
}
```

Note how `connect-src` specifically whitelist only the required API domain.

### Example 3: Extension with Sandbox Usage

An extension that renders user-provided markdown:

```json
{
  "name": "Markdown Notes",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": [],
  "sandbox": {
    "pages": ["sandbox.html"]
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
    "sandbox": "sandbox allow-scripts allow-same-origin; script-src 'self' 'unsafe-inline'; object-src 'none'"
  }
}
```

The sandbox allows `unsafe-inline` for the markdown renderer while the main extension remains locked down.

## Cross-References

For continued learning on extension security:

- [Security Hardening Guide](./security-hardening.md) — Advanced security implementations beyond CSP
- [WebRequest API](./web-request.md) — Network request interception and security considerations
- [Permissions Model](./permissions-model.md) — Understanding the permissions system
- [Content Script Isolation](./content-script-isolation.md) — Security boundaries for content scripts
- [Security Best Practices](./security-best-practices.md) — Foundational security concepts

## Related Articles

- [Security Hardening](../guides/security-hardening.md)
- [WebRequest API](../guides/web-request.md)
- [Security Best Practices](../guides/security-best-practices.md)
- [Extension Security Audit](../guides/extension-security-audit.md)

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
