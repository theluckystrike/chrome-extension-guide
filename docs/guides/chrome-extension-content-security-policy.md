---
layout: default
title: "Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3"
description: "Master MV3 Content Security Policy for Chrome extensions. Learn sandbox pages, eval alternatives, trusted types, nonce scripts, and secure patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-content-security-policy/"
---

# Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3

Content Security Policy represents one of the most critical security mechanisms in modern Chrome extension development. Unlike web applications where CSP serves as an optional defensive layer, Chrome extensions built under Manifest V3 (MV3) rely heavily on CSP to establish clear security boundaries between extension contexts and the broader web. Understanding CSP in depth isn't merely recommended—it's essential for building extensions that pass Chrome Web Store review, protect user data, and defend against the increasingly sophisticated attack vectors targeting browser extensions.

This comprehensive guide covers every facet of CSP implementation for Chrome extensions, from the default policies enforced by MV3 to advanced techniques like nonce-based script execution, trusted types enforcement, and secure migration strategies from Manifest V2. Whether you're building a simple utility extension or a complex enterprise tool, the patterns and practices outlined here will help you implement CSP correctly from the start.

## Understanding MV3 CSP Defaults

Chrome extensions running under Manifest V3 operate under a significantly stricter security model than their Manifest V2 predecessors. The default Content Security Policy applied to all extension pages—popup windows, options pages, side panels, and the background service worker—enforces restrictive defaults that prevent many common attack vectors from succeeding.

The default MV3 CSP appears as follows:

```
default-src 'self'; script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'
```

This seemingly simple policy carries profound implications for extension developers. The `'self'` directive restricts all resource loading to origins within the extension package itself, effectively blocking inline scripts, remote code execution, and the execution of dynamically generated code. The inclusion of `'unsafe-inline'` for stylesheets exists primarily for backward compatibility, allowing CSS to function without requiring separate stylesheet files for every component.

Understanding what this default actually prevents reveals why CSP matters so much for extensions. Most critically, the default CSP blocks `eval()` and similar dynamic code execution mechanisms, prevents loading scripts from remote servers, blocks inline event handlers like `onclick="..."`, and prohibits the creation of script elements from strings at runtime. Each of these restrictions eliminates entire categories of potential vulnerabilities that could be exploited if an attacker managed to inject malicious content into your extension.

The CSP applies differently to various extension contexts. Extension pages—including popups, options pages, and side panels—operate under the extension's CSP as defined in the manifest. Content scripts, however, inherit the CSP of the pages they're injected into rather than the extension's CSP, a distinction that often surprises developers. The background service worker runs under its own isolated context with strict CSP enforcement. Sandbox pages, which we'll explore in detail later, operate under a completely separate CSP that you define explicitly.

### Extension Pages vs. Content Script CSP

One of the most common sources of confusion stems from the different CSP contexts that exist within a single extension. Extension pages—your popup, options page, and side panel—operate under the CSP you define in your manifest's `content_security_policy` field. These pages have direct access to the Chrome Extension APIs and can communicate with your background service worker.

Content scripts occupy a fundamentally different position in the security model. When a content script executes within a web page, it inherits that page's CSP rather than your extension's CSP. This means that if the host page has a restrictive CSP that blocks certain actions, your content script will be subject to those restrictions. Conversely, your content script cannot rely on your extension's CSP to protect it from malicious web content.

This distinction has practical implications for extension design. If your extension needs to perform actions that would be blocked by a page's CSP, you must move that logic to an extension page or the background service worker. Content scripts should focus on DOM manipulation and page-specific tasks that don't require dangerous capabilities.

## Sandbox Pages: Isolated Execution Environments

There are circumstances where your extension needs to execute code that cannot be trusted with full extension privileges—perhaps you're rendering user-provided templates, executing mathematical expressions from external sources, or processing data through third-party libraries that you haven't audited thoroughly. For these scenarios, Chrome extensions provide sandbox pages, a mechanism for running untrusted code in complete isolation from the rest of your extension.

Sandbox pages execute in a unique origin that has no access to Chrome Extension APIs, the background service worker, or any other extension context. They exist in a strict sandbox where the only communication channel is through the `postMessage` API. This isolation makes sandbox pages ideal for handling untrusted content safely.

To enable sandbox pages in your extension, you must declare them in your manifest:

```json
{
  "sandbox": {
    "pages": ["sandbox.html", "sandbox-worker.js"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts; script-src 'self' 'unsafe-eval'; object-src 'none'"
  }
}
```

The sandbox CSP operates independently from your main extension CSP. Notice that the example above includes `'unsafe-eval'` in the sandbox's script-src directive—this is necessary because sandbox pages are commonly used for template engines and similar tools that require dynamic code generation. However, this capability remains safely isolated within the sandbox where it cannot affect your main extension.

When implementing sandbox communication, remember that the sandbox page runs in a different security context:

```javascript
// In your extension page (popup.js, for example)
const sandboxFrame = document.getElementById('sandbox-frame');
sandboxFrame.contentWindow.postMessage(
  { action: 'process', template: userTemplate },
  '*'
);

window.addEventListener('message', (event) => {
  if (event.source === sandboxFrame.contentWindow) {
    console.log('Received result:', event.data.result);
  }
});
```

```javascript
// In sandbox.html (or its imported script)
window.addEventListener('message', (event) => {
  if (event.data.action === 'process') {
    // Safely process untrusted template
    const result = processTemplate(event.data.template);
    event.source.postMessage({ result }, '*');
  }
});
```

This pattern enables you to safely execute potentially dangerous operations—template rendering, data processing through untrusted libraries, parsing external data formats—while maintaining complete isolation from your extension's privileged contexts.

## Alternatives to eval() and Dynamic Code Execution

The prohibition on `eval()` and similar functions represents one of the most significant changes from Manifest V2 to Manifest V3. Extensions that previously relied on `eval()`, `new Function()`, or similar mechanisms for dynamic code execution must find alternative approaches. This restriction exists because these functions represent prime targets for code injection attacks—if an attacker can influence what gets passed to `eval()`, they can execute arbitrary code within your extension's context.

### Template Precompilation

The most common use case for dynamic code generation involves template engines. Modern template libraries support precompilation, where templates are converted to JavaScript functions at build time rather than runtime. This approach eliminates the need for `eval()` entirely.

For example, Handlebars provides a precompiler that generates template functions during your build process:

```bash
handlebars template.hbs -f template.js
```

```javascript
// At runtime, simply import the precompiled function
import template from './template.js';
const html = template({ data: someObject });
```

This approach offers additional benefits beyond security—precompiled templates execute significantly faster than those parsed at runtime, and they reduce the size of your extension package.

### JSON Parsing

If you're using `eval()` to parse JSON data, simply use `JSON.parse()` instead. This method is both safer and faster:

```javascript
// Instead of this:
const data = eval('(' + jsonString + ')');

// Use this:
const data = JSON.parse(jsonString);
```

### Expression Evaluation

For extensions that need to evaluate mathematical or logical expressions (calculation tools, formula evaluators), several safe alternatives exist. Libraries like `math.js` provide expression parsing without dynamic code execution:

```javascript
import { evaluate } from 'mathjs';
const result = evaluate('sqrt(3^2 + 4^2)'); // Returns 5
```

For simpler use cases, the `Function` constructor with carefully controlled input provides a safer alternative to `eval()` when properly sandboxed, though it should still be avoided where possible.

### Dynamic Configuration Systems

Extensions that previously used `eval()` to load dynamic configuration or behavior rules should instead use data-driven approaches. Define your dynamic behavior as structured data that your extension interprets:

```javascript
// Instead of: eval(dynamicRule)
// Use a rule engine:
const rules = [
  { condition: { urlContains: 'example.com' }, action: 'block' },
  { condition: { domain: 'tracker.io' }, action: 'flag' }
];

function evaluateRules(request) {
  for (const rule of rules) {
    if (matchesCondition(request, rule.condition)) {
      return rule.action;
    }
  }
  return 'allow';
}
```

This approach is more maintainable, easier to test, and doesn't require executing potentially dangerous code.

## Trusted Types: Preventing DOM XSS

Trusted Types represent an advanced security feature that complements CSP by providing an API for creating sanitized, policy-bound values that the browser guarantees are safe to insert into the DOM. Unlike traditional CSP which blocks dangerous operations, Trusted Types actively prevent DOM-based XSS by requiring that potentially dangerous DOM assignments go through type checking.

When you enable Trusted Types, the browser enforces that certain dangerous DOM APIs—`innerHTML`, `outerHTML`, `insertAdjacentHTML`, and similar methods—cannot accept raw strings. Instead, they must receive values created through a Trusted Type policy.

To enable Trusted Types in your extension, add it to your CSP:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'"
  }
}
```

Creating and using Trusted Types requires defining a policy:

```javascript
// Create a Trusted Types policy
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => {
    // Sanitize the input
    return DOMPurify.sanitize(input);
  },
  createURL: (input) => {
    const url = new URL(input);
    // Validate and normalize the URL
    if (!url.protocol.startsWith('http')) {
      throw new Error('Invalid protocol');
    }
    return url.href;
  }
});

// Use the policy
const sanitizedHTML = policy.createHTML(userInput);
element.innerHTML = sanitizedHTML; // This now works

// This would throw an error:
element.innerHTML = userInput; // Blocked by Trusted Types
```

For extensions processing user-provided HTML content, combining Trusted Types with a sanitization library like DOMPurify provides robust protection against XSS attacks. The key insight is that Trusted Types enforce at the API level that all DOM manipulation goes through your sanitization policies—there's no way to accidentally bypass the protection.

## Nonce-Based Script Execution

There are situations where you genuinely need to execute inline scripts—perhaps you're integrating with third-party libraries that require it, or you have performance-critical code that cannot be externalized. Chrome extensions support nonce-based script execution as a controlled way to permit specific inline scripts while blocking everything else.

A nonce is a random, single-use token that you generate server-side or at runtime and include in both your CSP header and your script tag. Chrome will only execute scripts with a nonce that matches the nonce in the CSP:

```html
<!-- In your extension page -->
<script nonce="random-token-123">
  // This script will execute
  console.log('Authorized inline script');
</script>

<script>
  // This script will NOT execute - no matching nonce
  console.log('Blocked inline script');
</script>
```

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'nonce-random-token-123'; object-src 'none'"
  }
}
```

Each time the page loads, generate a new nonce and include it in both your CSP and your script tags:

```javascript
// Generate a nonce
const nonce = crypto.getRandomValues(new Uint8Array(16))
  .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');

// Apply nonce to CSP
const meta = document.createElement('meta');
meta.httpEquiv = 'Content-Security-Policy';
meta.content = `script-src 'self' 'nonce-${nonce}'; object-src 'none'`;
document.head.appendChild(meta);

// Add nonce to script tags
document.querySelectorAll('script').forEach(script => {
  script.setAttribute('nonce', nonce);
});
```

This approach is particularly useful when integrating third-party scripts that require inline execution—you can scope the nonce specifically to those scripts while maintaining strict blocking for all other inline content.

## Remote Code Restrictions and Remote Hosting

Manifest V3 dramatically restricts how extensions can load and execute remote code. Unlike Manifest V2, which permitted loading JavaScript from remote servers and executing it with extension privileges, MV3 requires that all executable code be bundled within the extension package itself. This restriction protects users from extensions that could be compromised through attacks on remote servers or that could be silently modified after review.

The implications for extension architecture are significant. You cannot load scripts from external CDN URLs for execution:

```javascript
// This will NOT work in MV3:
<script src="https://cdn.example.com/library.js"></script>
```

Instead, you must bundle all executable code:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'"
  }
}
```

```javascript
// Bundled library:
import library from './library.js';
```

For static resources like stylesheets, images, and fonts, you can still load from remote servers:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://cdn.example.com"
  }
}
```

This distinction between executable code (blocked remotely) and static resources (allowed remotely) provides a balance between security and practicality. Your extension can still use external fonts, load images from CDNs, and fetch data from APIs—just not execute arbitrary code from external sources.

### Loading External Data and Configuration

Extensions that previously loaded rules or configuration from remote servers must adapt to MV3's restrictions. The recommended approach involves bundling default configuration and using the Extension Update mechanism to push changes:

```javascript
// Default configuration bundled with extension
const defaultConfig = {
  rules: [
    { pattern: '*.example.com', action: 'block' }
  ]
};

// Load from storage or fetch at runtime (for data, not code)
async function loadConfig() {
  const stored = await chrome.storage.local.get('config');
  return stored.config || defaultConfig;
}
```

For extensions requiring frequent configuration updates, consider using the chrome.storage API to store configuration that users or your server can modify, combined with periodic checks against your server for new data (using fetch() with the data used for configuration, not for code).

## CSP Violation Reporting

Understanding when and how your CSP is being violated helps debug issues and detect potential attacks against your extension. While standard web CSP reporting uses the `report-uri` directive, Chrome extensions handle violation reporting differently.

Extension CSP violations are logged to the Chrome DevTools console and the extension's background service worker logs. You can monitor these violations programmatically by listening for errors:

```javascript
// In your background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CSPViolation') {
    console.error('CSP Violation:', message.details);
    // Optionally send to your analytics
    reportCSPViolation(message.details);
  }
});

// In your extension pages, intercept console errors
const originalError = console.error;
console.error = function(...args) {
  if (args[0]?.includes?.('Content Security Policy')) {
    chrome.runtime.sendMessage({
      type: 'CSPViolation',
      details: { message: args[0], timestamp: Date.now() }
    });
  }
  originalError.apply(console, args);
};
```

For more comprehensive monitoring, Chrome provides the `reportingObserver` API (available in newer Chrome versions) that can capture violation events:

```javascript
if (window.ReportingObserver) {
  const observer = new ReportingObserver((reports) => {
    reports.forEach(report => {
      if (report.type === 'csp-violation') {
        console.log('CSP Violation:', report.body);
      }
    });
  }, { types: ['csp-violation'], buffered: true });
  
  observer.observe();
}
```

## Debugging CSP Errors

CSP errors manifest in various ways, and understanding how to diagnose them quickly saves significant development time. The most common symptoms include scripts not executing, styles not applying, network requests failing, and extension functionality simply not working.

### Identifying CSP Issues in DevTools

Open your extension's popup or options page in DevTools (right-click the extension icon, choose "Inspect popup" or "Inspect views") and check the Console tab. CSP violations appear with clear error messages:

```
Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self'".
```

The error message tells you exactly which directive was violated and what the content was. For inline scripts, the error includes a hash of the script content that you can add to your CSP if you genuinely need that specific script to execute.

For network request failures, check the Network tab. Failed requests due to CSP show as "(blocked by Content Security Policy)" in the status column, with the violating directive noted in the response headers.

### Common CSP Mistakes

Several patterns frequently cause issues in extension CSP configuration:

**Missing object-src 'none'**: Without this directive, extensions can be vulnerable to plugin-based attacks. Always include `object-src 'none'` unless you have a specific need for embedded content.

**Overly restrictive connect-src**: If your extension makes API calls, ensure your `connect-src` directive includes all necessary origins:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; connect-src 'self' https://api.example.com https://analytics.example.com"
  }
}
```

**Forgetting about content script CSP**: Remember that content scripts inherit the page's CSP. If functionality works in your extension popup but fails on web pages, CSP is likely the cause.

**Inline styles**: While `style-src 'self' 'unsafe-inline'` is the default, consider removing `'unsafe-inline'` and using separate stylesheets or CSS custom properties for better security.

## Migration from MV2 Relaxed CSP

Extensions migrating from Manifest V2 to Manifest V3 face particular challenges around CSP because MV2 permitted many practices that MV3 explicitly blocks. Planning your migration carefully prevents both security regressions and functional breakage.

### Common MV2 Patterns and Their MV3 Equivalents

**Remote script loading**: MV2 extensions often loaded scripts from external servers. MV3 requires bundling:

```javascript
// MV2: <script src="https://cdn.example.com/script.js"></script>
// MV3: import './bundled-script.js';
```

**eval() usage**: MV2 commonly used `eval()` for dynamic code. MV3 requires alternatives:

```javascript
// MV2: eval(userProvidedCode)
// MV3: Use precompiled templates or expression parsers
```

**Inline scripts**: MV2 often had significant inline script content. MV3 requires either externalization or nonce-based whitelisting:

```javascript
// Extract inline scripts to separate files:
// MV2: <script>initApp();</script>
// MV3: <script type="module" src="init.js"></script>
```

### Incremental Migration Strategy

Rather than attempting a complete CSP migration in one change, consider an incremental approach:

1. **Audit current usage**: Document all CSP-violating patterns in your current extension
2. **Prioritize by risk**: Identify which violations represent security risks vs. convenience
3. **Replace dangerous patterns first**: Address `eval()` usage and remote code loading immediately
4. **Update build process**: Ensure your bundler produces CSP-compatible output
5. **Test thoroughly**: Load your extension unpacked and test all functionality
6. **Submit for review**: Allow extra time for review with CSP changes

## Real-World Secure Extension Examples

Understanding how successful extensions implement CSP provides practical guidance for your own projects. Several patterns appear consistently across well-secured extensions.

### Minimal Extension CSP

A minimal, highly secure extension uses the strictest possible CSP:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
  }
}
```

This configuration:
- Allows only bundled scripts to execute
- Blocks all plugin content (object-src 'none')
- Restricts stylesheets to bundled CSS only
- Permits only self-hosted images and fonts
- Limits network requests to the extension's own origin

### Data-Fetching Extension CSP

Extensions that need to fetch data from APIs require additional connect-src directives:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.example.com https://usercontent.example.com"
  }
}
```

This pattern:
- Allows self plus specific API endpoints in connect-src
- Permits images from any HTTPS source (https: in img-src)
- Includes 'unsafe-inline' for styles if needed (consider removing for production)
- Uses data: for inline fonts when needed

### Extension with Sandboxed Renderer

For extensions requiring untrusted content handling:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'",
    "sandbox": "sandbox allow-scripts; script-src 'self' 'unsafe-eval'"
  }
}
```

This configuration:
- Keeps the main extension under strict CSP
- Provides a sandbox with eval() capability for trusted processing
- Uses separate CSP for sandbox that explicitly allows what it needs

## Related Guides and Resources

Understanding CSP is just one component of building secure Chrome extensions. The following related guides provide additional context for hardening your extension:

- [Security Hardening](./security-hardening.md) — Comprehensive guide to additional security measures beyond CSP, including input validation, secure communication patterns, and defense-in-depth strategies for Chrome extensions.

- [Web Request Interception](./chrome-extension-web-request-interception.md) — Understanding how your extension interacts with network requests is essential for implementing CSP correctly, especially for extensions that modify or block network traffic.

- [Security Best Practices](../guides/security-best-practices.md) — Foundational security concepts that complement CSP implementation.

- [Extension Security Audit](../guides/extension-security-audit.md) — Procedures for reviewing your extension's security posture before publication.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
