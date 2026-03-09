---
layout: default
title: "Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3"
description: "Master MV3 Chrome extension CSP: sandbox, eval alternatives, trusted types, nonce scripts, remote code limits, violations, debugging, MV2 migration."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-content-security-policy/"
---

# Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3

Content Security Policy represents one of the most critical security mechanisms available to Chrome extension developers. In Manifest V3, Google significantly tightened the default CSP restrictions compared to Manifest V2, fundamentally changing how developers must approach dynamic code execution, external resource loading, and content rendering. This comprehensive guide explores every facet of CSP configuration for modern Chrome extensions, from understanding MV3 defaults to implementing advanced security patterns that protect your users from emerging threats.

The transition to Manifest V3 forced many extension developers to rethink their security architecture. The removal of remote code execution capabilities, the deprecation of `eval()` and similar functions, and the stricter default CSP created new challenges—but these restrictions also dramatically improved the security posture of the entire extension ecosystem. Understanding how to work within these constraints while building powerful extensions requires deep knowledge of CSP mechanics and the alternative patterns available.

## Understanding MV3 CSP Defaults

Chrome extensions operating under Manifest V3 operate with a default Content Security Policy that provides reasonable baseline protection while still allowing common extension patterns to function. The default policy for extension pages is `script-src 'self' https://ajax.googleapis.com; object-src 'self' blob:;`—this configuration permits scripts from the extension's own origin and Google's CDN while restricting object and embed capabilities.

This default policy represents a significant departure from the permissive environment of Manifest V2, where extensions could execute arbitrary remote code and load resources from any source. The default restricts script sources to `'self'` (the extension's own files) and Google's AJAX Libraries CDN, preventing extensions from loading potentially malicious scripts from arbitrary domains. The `object-src 'self' blob:` restriction allows blob URLs for specific use cases like creating Blob objects programmatically while preventing the loading of potentially dangerous plugins.

The background service worker in MV3 operates under its own CSP context, which is generally more restrictive than popup or options pages. Service workers cannot execute inline scripts and must load all code from external files within the extension. This restriction aligns with the broader security model where the service worker serves as a secure event handler rather than a general-purpose execution environment.

Extension developers must explicitly declare any CSP modifications in their manifest.json file. The `content_security_policy` key accepts an object with `extension_pages` and `sandbox` properties, each taking a CSP string value. Failing to configure a custom CSP means accepting Google's defaults—which may be appropriate for simple extensions but often insufficient for complex applications requiring external API communication or dynamic content rendering.

## Sandbox Pages for Untrusted Content

When your extension needs to render content that cannot be fully trusted—such as user-generated HTML, Markdown, or content fetched from external APIs—sandbox pages provide an essential security layer. Sandboxed pages run in an isolated origin with no access to extension APIs, effectively creating a sandbox that protects your main extension context from potentially malicious code.

Configuring sandbox pages requires two manifest.json entries: declaring which pages should be sandboxed and defining their CSP. The sandbox CSP differs from the main extension pages CSP in that it must explicitly grant permissions that the default extension context would otherwise restrict.

```json
{
  "sandbox": {
    "pages": ["sandbox.html", "renderer.html", "user-content-viewer.html"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts allow-same-origin; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'"
  }
}
```

The sandboxed environment receives a unique origin that cannot access chrome.* APIs directly. However, you can enable communication between sandboxed pages and your main extension using `chrome.runtime.sendMessage()` and the `sandbox` permission in your message passing setup. This architecture allows you to render untrusted content safely while still providing controlled access to extension functionality when needed.

Sandbox pages are particularly valuable for extensions that display web content, render email messages, or process user-uploaded files. By isolating these operations, you prevent XSS vulnerabilities in external content from compromising your extension's credentials, storage, or user data. The `allow-same-origin` directive in the sandbox CSP is sometimes necessary for compatibility with certain libraries but should be used cautiously—it grants the sandboxed content access to its own origin's storage, which could expose data if the rendered content is compromised.

## Alternatives to eval() and Function()

The removal of `eval()`, `new Function()`, and similar dynamic code execution capabilities in Manifest V3 represents one of the most significant security changes for extension developers. These functions, which evaluate strings as executable JavaScript, have been a source of countless security vulnerabilities over the years. Chrome's decision to restrict them in extensions aligns with broader web platform security trends.

For most use cases, developers can replace dynamic code execution with safer alternatives. If you're evaluating mathematical expressions, libraries like math.js provide secure parsing without code execution. For template rendering, modern template engines like Handlebars or Mustache compile templates to functions at build time rather than runtime. JSON parsing should always use `JSON.parse()` rather than `eval()`—it's faster and eliminates code execution risks entirely.

When you genuinely need dynamic code generation for legitimate purposes, the WebAssembly API provides a secure alternative. WebAssembly runs in a sandboxed execution environment that cannot access the DOM or extension APIs without explicit permission. You can compile dynamically generated WebAssembly modules using the `WebAssembly.compile()` function, which provides near-native performance while maintaining security boundaries.

For configuration-based logic where you previously might have used eval, consider implementing a simple interpreter that processes data structures rather than executable code. This approach transforms potentially dangerous dynamic execution into a controlled parsing operation:

```javascript
// Instead of: eval(userConfig.functionString)
function executeConfig(config, context) {
  const operations = {
    add: (a, b) => a + b,
    multiply: (a, b) => a * b,
    filter: (array, predicate) => array.filter(predicate),
    // Define your operations explicitly
  };
  
  if (!operations[config.operation]) {
    throw new Error(`Unknown operation: ${config.operation}`);
  }
  
  return operations[config.operation](...config.args);
}
```

This pattern eliminates the possibility of arbitrary code execution while providing flexibility for configuration-driven functionality.

## Trusted Types for DOM XSS Prevention

Trusted Types represent an advanced browser security feature that helps prevent DOM-based XSS attacks by requiring that certain potentially dangerous operations only accept specially marked values rather than raw strings. When enabled, the browser will reject attempts to assign strings to sinks like `innerHTML`, `document.write()`, or event handler attributes.

Implementing Trusted Types in your extension requires declaring the policy in your HTML pages and ensuring all dynamic content goes through the Trusted Type API. This approach shifts the security model from "filter bad input" to "only accept explicitly trusted content," which is fundamentally more robust.

```javascript
// Create a Trusted Types policy
if (window.trustedTypes) {
  const policy = trustedTypes.createPolicy('extension-policy', {
    createHTML: (string) => {
      // Sanitize the string using a library like DOMPurify
      return DOMPurify.sanitize(string, { RETURN_TRUSTED_TYPE: true });
    },
    createScript: (string) => {
      // Reject script injection attempts
      throw new Error('Inline scripts are not allowed');
    }
  });
  
  // Use the policy when setting innerHTML
  element.innerHTML = policy.createHTML(userContent);
}
```

Enabling Trusted Types in your extension requires adding the appropriate CSP directive: `require-trusted-types-for 'script'`. This directive tells the browser to enforce Trusted Types for all script operations, preventing the assignment of raw strings to dangerous DOM properties.

The adoption of Trusted Types does require careful consideration of your dependencies. Some third-party libraries may not be compatible with Trusted Types enforcement, requiring either library upgrades, alternative implementations, or careful policy configuration to allow specific patterns. Budget extra development time for testing and potential library replacements when implementing this security feature.

## Nonce-Based Script Execution

Traditional CSP allows inline scripts using a hash or nonce value, which provides a cryptographic guarantee that the script originated from your server (or extension files) rather than being injected by an attacker. The nonce approach generates a unique, unguessable value for each page load and includes it both in the CSP header and in the script tag itself.

For extensions, nonce-based script execution is particularly useful when you need to inject scripts dynamically from your background service worker or when working with frameworks that require inline script execution. While `'unsafe-inline'` in script-src is generally discouraged, the nonce mechanism provides equivalent flexibility with proper security guarantees.

```html
<!-- In your extension HTML file -->
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="script-src 'nonce-{NONCE}' 'self';">
</head>
<body>
  <!-- Script with matching nonce will execute -->
  <script nonce="{NONCE}">
    // Your extension code here
  </script>
</body>
</html>
```

Generating and injecting nonces requires server-side (or in our case, extension context) coordination. For extension pages, you can generate a nonce in your background script and pass it to the page during construction, or generate it dynamically when serving the HTML content. The key requirement is that the nonce must be unguessable—use cryptographically secure random number generation rather than predictable values.

Hash-based inline scripts provide an alternative to nonces when the script content is static and known in advance. You specify the SHA-256, SHA-384, or SHA-512 hash of the script content directly in the CSP, and the browser will execute only scripts matching that hash. This approach is particularly useful for built-in scripts that never change, while nonces work better for dynamic scenarios.

## Remote Code Restrictions and External Resource Loading

Manifest V3 explicitly prohibits loading and executing remote code—extensions can no longer fetch JavaScript from external servers and execute it. This restriction fundamentally improves extension security by eliminating an entire category of attacks where compromised extension update servers could inject malicious code into millions of browsers.

Instead of remote code execution, extensions must bundle all executable JavaScript in their package. This requirement means that extension updates require submitting new versions to the Chrome Web Store rather than pushing code through external servers. While this adds friction to the development process, the security benefits are substantial: users can verify the code they're installing, and there's no possibility of silent code injection through compromised remote servers.

For external resources like stylesheets, images, and fonts, the CSP controls what sources are allowed. The `connect-src`, `img-src`, `font-src`, and `style-src` directives each control their respective resource types. A common pattern for extensions that communicate with APIs is to explicitly whitelist the domains they need:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src https://api.example.com wss://api.example.com"
  }
}
```

This configuration restricts all resources to the extension's own origin by default, then explicitly allows external connections only to specific API endpoints. The `object-src 'none'` directive is critical—it prevents loading of plugins and other potentially dangerous content types that could introduce vulnerabilities.

When loading external scripts is genuinely necessary—for analytics, for example—consider using the subresource integrity feature in combination with explicit CSP allowances. Subresource integrity ensures that even if an external server is compromised, the browser will refuse to load modified content that doesn't match the expected hash.

## CSP Violation Reporting

Monitoring CSP violations in production extensions helps identify potential security issues before they become actual exploits. The `report-uri` directive (or the newer `report-to` directive) instructs the browser to send JSON violation reports to a specified endpoint when CSP is violated.

For extensions, setting up violation reporting requires a server endpoint capable of receiving and processing these reports. The reports include details about the violated policy, the resource that was blocked, and the page where the violation occurred—information that's invaluable for debugging and security monitoring.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; report-uri https://your-server.com/csp-reports"
  }
}
```

The violation report format includes the directive that was violated, the blocked resource URL, the effective policy, and the referrer. Analyzing these reports helps identify legitimate use cases that your CSP accidentally blocks, potential XSS attack attempts, and dependency issues where third-party scripts are being loaded unexpectedly.

For development and testing, you can use the `chrome://extensions/?errors` page and browser console to see CSP violations in real time. Chrome provides detailed error messages indicating exactly which directive blocked which resource, making it easier to iteratively refine your CSP without requiring a full production deployment to discover issues.

## Debugging CSP Errors

When CSP blocks legitimate functionality, debugging requires understanding which directive caused the block and why. Chrome's DevTools provide clear error messages in the console and network tabs, but the messages can sometimes be cryptic, especially when multiple directives interact.

The console message format is generally "Refused to [action] '[directive]' because it violates the following Content Security Policy directive: '[directive-name]'." The specific directive name tells you exactly which part of your CSP is blocking the content. Common issues include missing `'unsafe-inline'` for styles when using CSS-in-JS libraries, missing domain allowances for API calls, and attempting to load resources over HTTP when only HTTPS is allowed.

For script blocking issues specifically, ensure you're not accidentally including inline event handlers like `onclick="handleClick()"` in your HTML. These patterns are incompatible with strict CSP and must be replaced with addEventListener calls in external scripts. Modern frameworks typically handle this automatically, but if you're writing vanilla JavaScript or using older libraries, you may need to refactor event handling.

The Network tab shows CSP violations as failed requests with a specific status and error message. The "initiator" column helps track which script or resource triggered the blocked request, which is particularly useful when debugging issues with third-party dependencies. Chrome also provides a Security panel in DevTools that shows the active CSP and any violations.

## Migration from MV2 Relaxed CSP

Extensions migrating from Manifest V2 often relied on significantly more permissive CSP configurations that are no longer valid in Manifest V3. The migration process requires systematically identifying and addressing each relaxed security pattern.

Common MV2 patterns that require changes include: loading scripts from arbitrary CDN domains (must be explicitly whitelisted), using `eval()` or `new Function()` (must be replaced with alternatives), inline scripts without nonce/hash (must be moved to external files or use nonce/hash), and loading remote HTML content directly into the extension (should use sandboxed pages with restricted permissions).

The migration workflow begins with testing your MV2 extension in Manifest V3 mode using the "Manifest V3" flag in `chrome://extensions`. Most violations will surface immediately in the console. Prioritize fixing script execution issues first, as they're most likely to break functionality, then address resource loading for images, stylesheets, and API calls.

For extensions that absolutely require capabilities removed in MV3, consider whether the functionality can be redesigned using available APIs. Chrome has been gradually adding capabilities to MV3 that were initially missing, and many patterns once considered impossible now work with proper implementation. The extension developer community has also produced polyfills and workarounds for common migration challenges.

## Real-World Secure Extension Examples

Examining how well-designed extensions implement CSP provides practical guidance for your own projects. Extensions like Google Translate and Grammarly, which handle sensitive user data and external content, demonstrate comprehensive CSP implementation patterns.

A typical secure extension configuration includes: strict `script-src 'self'` that only allows the extension's own scripts, explicit whitelisting of necessary API domains in `connect-src`, data URIs allowed in `img-src` for inline icons, and `object-src 'none'` universally applied to prevent plugin-based attacks. The specific directives depend on the extension's functionality, but the principle of explicit allowlisting over implicit permissions remains consistent.

For extensions that need to render external HTML content safely, the sandbox pattern is essential. The extension loads external content in a sandboxed page with no access to extension APIs, then communicates necessary data through message passing with careful input validation. This architecture prevents XSS vulnerabilities in external content from affecting the extension's security context.

---

**Related Security Guides:**

- [Chrome Extension Security Hardening](/chrome-extension-guide/guides/chrome-extension-security-hardening/) — Comprehensive protection strategies
- [Chrome Extension Web Request Interception](/chrome-extension-guide/guides/chrome-extension-web-request-interception/) — Network request security patterns

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
