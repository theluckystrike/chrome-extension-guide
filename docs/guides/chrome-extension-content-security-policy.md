---
layout: default
title: "Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3"
description: "Master Chrome extension CSP in Manifest V3. Learn sandbox pages, eval alternatives, trusted types, nonce scripts, remote code restrictions, and debugging."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-content-security-policy/"
---

# Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3

Content Security Policy represents one of the most critical security mechanisms available to Chrome extension developers. In Manifest V3, the CSP landscape has evolved significantly from the more permissive Manifest V2 era, bringing both enhanced security capabilities and new challenges that developers must understand deeply. This comprehensive guide explores every facet of CSP implementation for modern Chrome extensions, from understanding default policies to implementing advanced security patterns that protect your users from XSS attacks, data exfiltration, and malicious code injection.

Chrome extensions operate with elevated privileges within the browser, granting them access to sensitive APIs, user data, and powerful capabilities that make them attractive targets for attackers. A properly configured CSP serves as your extension's first line of defense, explicitly defining what resources the browser is permitted to load and execute. Without a thorough understanding of CSP mechanics, even well-intentioned extensions can become vectors for security vulnerabilities that compromise millions of users.

## Understanding MV3 CSP Defaults

Chrome extensions in Manifest V3 ship with a default Content Security Policy that provides baseline protection while allowing common extension use cases to function without immediate configuration. The default policy permits scripts from the extension's own origin and from Google's AJAX CDN, a carryover from development patterns that often rely on external libraries. Understanding this default is essential because it represents the minimum security posture your extension will have if you do not explicitly configure CSP.

The default MV3 CSP includes `script-src 'self' https://ajax.googleapis.com`, which allows your extension to load its own JavaScript files plus scripts from Google's CDN. While convenient for development, this default creates potential attack surface. If an attacker could somehow compromise a CDN resource or inject malicious code into a loaded library, your extension would execute that code with full extension privileges. This is why understanding and customizing your CSP is not optional—it is a fundamental security practice that protects your users from realistic threat scenarios.

Additionally, the default policy permits `object-src 'self'` in some contexts, allowing plugins and embedded content to load from the extension origin. This directive represents significant risk because legacy plugins have historically contained numerous security vulnerabilities. Best practice is to explicitly set `object-src 'none'` in your CSP configuration, completely blocking plugin content from loading within your extension pages.

## Configuring Extension Page CSP

Your popup, options page, side panel, and other extension UI pages represent your extension's user-facing attack surface. These pages run in the extension's privileged context and frequently handle sensitive information or user credentials. A breach in these pages can expose all extension functionality to attackers, making their CSP configuration particularly critical.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.yourservice.com; frame-ancestors 'none'; base-uri 'self'"
  }
}
```

This configuration locks down your extension pages significantly. The `script-src 'self'` directive ensures only your extension's own JavaScript can execute, blocking any attempt to load external scripts or inject code through reflected or stored XSS vulnerabilities. The `object-src 'none'` directive eliminates Flash, Java applets, and other legacy plugin content that historically represented significant attack vectors. The `frame-ancestors 'none'` directive prevents your extension pages from being embedded in iframes on malicious websites, defending against clickjacking and frame-based attacks. The `base-uri 'self'` directive blocks attempts to override base URLs, which attackers could use to redirect relative links to malicious destinations.

The `style-src 'self' 'unsafe-inline'` directive allows inline styles, which many extensions require for dynamic styling. If your extension does not need inline styles, removing `'unsafe-inline'` provides stronger protection. For extensions requiring dynamic style updates, consider using CSS custom properties and modifying stylesheets loaded from your extension rather than injecting inline styles.

## Sandbox Pages for Untrusted Content

Sometimes extensions must render content that cannot be fully trusted—user-generated HTML templates, Markdown rendering, content scraped from external websites, or third-party widgets. Running this content in your main extension context exposes your entire extension to potential compromise. Chrome's sandboxed pages provide essential isolation by running content in an environment with no access to extension APIs.

```json
{
  "sandbox": {
    "pages": ["sandbox.html", "renderer.html"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'"
  }
}
```

Sandbox pages run with restricted privileges that prevent access to extension APIs, cookies, storage, and the extension's origin. Communication between sandbox pages and your main extension occurs through message passing, allowing you to sanitize and validate data before passing it to privileged contexts. This pattern is essential for extensions that handle user-generated content or parse HTML from untrusted sources.

When implementing sandbox pages, design your architecture to minimize the data passed to the sandbox and maximize validation in the receiving context. Never pass sensitive credentials or tokens to sandbox pages unless absolutely necessary, and always validate and sanitize any data returned from sandbox contexts before using it in privileged code.

## Alternatives to eval() and Function() Constructor

Manifest V3 significantly restricts dynamic code execution that was common in Manifest V2. The `eval()` function and `new Function()` constructor are blocked by default CSP and cannot be used in extension pages. Extensions that previously relied on dynamic code generation for templating, plugins, or extensibility must adopt new patterns that respect security requirements while maintaining functionality.

Modern alternatives include precompiling templates at build time using tools like Handlebars, Mustache, or Template Literals that generate static JavaScript functions. For extensions requiring user-defined logic, consider implementing a safe subset interpreter or using WebAssembly for sandboxed computation. Many extension features that previously required eval can be implemented through configuration-driven approaches where users define behavior through structured data rather than executable code.

```javascript
// Instead of eval for dynamic template rendering
const template = Handlebars.compile(userTemplate);
const rendered = template(context);

// Instead of new Function for creating callbacks
const callbackMap = {
  'action-a': handleActionA,
  'action-b': handleActionB
};
const action = callbackMap[userChoice];
if (action) action(data);
```

If your extension genuinely requires dynamic code execution for legitimate purposes, consider whether a sandboxed service worker or external serverless function could handle the computation, keeping dynamic execution outside the extension's privileged context.

## Trusted Types for DOM XSS Prevention

Trusted Types provide a powerful browser-native mechanism for preventing DOM-based XSS attacks, a particularly insidious vulnerability class where attackers inject malicious code through DOM manipulation rather than server-side injection. Chrome extensions should implement Trusted Types as part of a defense-in-depth strategy, especially for extensions that manipulate the DOM extensively or handle user-generated content.

```javascript
// Configure Trusted Types policy
if (window.trustedTypes) {
  const policy = trustedTypes.createPolicy('extension-policy', {
    createHTML: (input) => {
      return DOMPurify.sanitize(input, { RETURN_TRUSTED_TYPE: true });
    },
    createScript: (input) => {
      // Strictly validate or reject script injection attempts
      throw new Error('Script creation not allowed');
    }
  });
}
```

Trusted Types work by requiring that potentially dangerous DOM operations use type-safe objects rather than raw strings. Operations like `element.innerHTML`, `document.write()`, and various setter methods become restricted, forcing developers to use sanitization functions that return TrustedHTML objects. This creates a强制性的安全检查点 where malicious input cannot silently slip through.

For extensions integrating third-party libraries, ensure those libraries support Trusted Types or wrap their usage carefully. Many modern libraries already support Trusted Types, but older code may require migration or careful integration to maintain security.

## Nonce-Based Script Execution

Traditional script-src directives allow scripts from specific origins but cannot distinguish between different scripts from the same origin. Nonce-based script execution provides granular control, allowing only scripts with a matching cryptographic nonce to execute. This pattern is particularly useful for extensions that need to inject user-controlled HTML containing script-like content without executing that script.

```html
<!-- Only this script will execute -->
<script nonce="random-cryptographic-nonce">
  console.log('This runs because nonce matches CSP');
</script>

<!-- This script will be blocked -->
<script>
  console.log('This will not execute');
</script>
```

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'nonce-{nonce}'"
  }
}
```

Implement nonce generation server-side or in your extension's background script, passing the nonce to pages through the messaging API or template rendering. Generate nonces using cryptographically secure random number generators, and ensure each page load receives a fresh nonce that cannot be predicted or reused by attackers.

## Remote Code Restrictions in MV3

Manifest V3 imposes significant restrictions on remote code execution to enhance security and reduce attack surface. Extensions can no longer load and execute arbitrary JavaScript from external servers—All code must be bundled within the extension package itself. This restriction prevents several attack vectors, including compromised CDN resources and server-side code injection attacks.

For extensions requiring external functionality, the recommended patterns include bundling all necessary code in the extension package, using extension-side configuration to control behavior without code changes, or moving dynamic logic to a backend service that the extension communicates with through a well-defined API. The backend service can be updated independently without requiring extension review and redistribution through the Chrome Web Store.

Extensions that previously loaded external scripts must migrate to bundled alternatives. Popular libraries should be downloaded and included in your extension's package during development. Build tools like webpack, Rollup, or esbuild can automate this process, bundling dependencies alongside your source code into a single distributable package.

## CSP Violation Reporting

Understanding when and how your CSP is violated helps identify potential security issues and misconfigurations during development and production. CSP violation reports can be configured to send information about blocked resources to your extension for analysis, providing valuable debugging information without compromising user security.

```javascript
// Report CSP violations to extension background
document.addEventListener('securitypolicyviolation', (event) => {
  chrome.runtime.sendMessage({
    type: 'CSP_VIOLATION',
    violatedDirective: event.violatedDirective,
    blockedURI: event.blockedURI,
    timestamp: Date.now()
  });
});
```

In your background script, implement logging that captures violation information without sending it externally unless explicitly configured by users. This helps developers understand what their CSP is blocking and whether those blocks indicate actual security issues or misconfigurations requiring adjustment.

For production extensions, consider providing users with an option to submit CSP violation logs for analysis. This can help identify new attack attempts or compatibility issues with websites your extension interacts with.

## Debugging CSP Errors

CSP errors manifest in the Chrome DevTools console with clear messages indicating which directive was violated and what resource triggered the block. Understanding these messages is essential for both initial implementation and ongoing maintenance as websites and APIs your extension interacts with evolve.

Common CSP errors include `Refused to load script` when trying to load external scripts, `Refused to execute inline script` when CSP blocks scripts embedded in HTML, and `Refused to connect` when connect-src blocks API calls. Each error points to specific configuration issues in your CSP that can typically be resolved by adjusting directive values to match your legitimate resource loading patterns.

Use Chrome's `chrome://extensions` page and inspect background service workers, popup pages, and options pages to see detailed CSP error messages. Enable the "Developer mode" toggle to access inspection links. The Console tab displays CSP violations with clear explanations of what was blocked and why.

When debugging, temporarily relax your CSP to identify all resources your extension needs, then systematically tighten restrictions to the minimum required. Document each relaxation's purpose so you can review whether it remains necessary during maintenance.

## Migration from MV2 Relaxed CSP

Many Manifest V2 extensions operated with significantly relaxed CSP policies that would not meet modern security standards. Migration to Manifest V3 provides an opportunity to reassess security posture and implement protections that were not previously available or required.

Begin migration by auditing your extension's current resource loading patterns. Identify all external domains your extension loads scripts, styles, images, or fonts from. For each external resource, determine whether it can be bundled locally, replaced with a bundled alternative, or legitimately added to your CSP allowlist. External resources that cannot be verified or are no longer necessary should be removed.

For extensions with complex dynamic requirements, consider breaking functionality into separate extension contexts with appropriately scoped CSP. A popup might have strict CSP while a sandbox page handles untrusted content processing. This compartmentalization limits the impact of any single component compromise.

## Real-World Secure Extension Examples

Secure extensions demonstrate CSP best practices through their architecture. Consider an extension that provides password management functionality—it implements strict CSP limiting script sources, uses sandbox pages for password generation and encryption operations, communicates with external APIs only through a background service worker with explicit connect-src directives, and implements Trusted Types for any DOM manipulation involving sensitive data.

Another example involves extensions that modify webpage content. These should use content scripts with restricted permissions, implement communication patterns that validate all messages between content and background contexts, and process any webpage HTML through sandbox pages before rendering in extension UI. The architecture assumes all webpage content is potentially malicious and implements multiple validation layers.

Extensions integrating with third-party services should use explicit API endpoints in their connect-src directive rather than wildcards, implement certificate pinning for sensitive communications, and avoid storing long-lived credentials in extension storage, instead using chrome.identity for secure authentication flows.

## Conclusion

Content Security Policy in Chrome extensions represents a fundamental security mechanism that every extension developer must master. The restrictions in Manifest V3 might seem limiting compared to Manifest V2's flexibility, but they provide substantial protection against real-world attack vectors. By understanding default behaviors, implementing strict CSP for extension pages, using sandbox pages for untrusted content, adopting alternatives to eval, implementing Trusted Types, and following the migration patterns outlined in this guide, you build extensions that protect users from XSS attacks, data exfiltration, and malicious code injection.

For further security hardening techniques, explore our guide on [security-hardening](/guides/security-hardening.md) which covers additional protection patterns beyond CSP. To understand how extensions interact with network requests while maintaining security, see our [web-request](/guides/web-request.md) guide covering proper request handling patterns.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
