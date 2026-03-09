---
layout: default
title: "Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3"
description: "Guide to MV3 CSP: defaults, sandbox, eval alternatives, trusted types, nonce scripts, remote code restrictions, debugging, and migration."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-content-security-policy/"
---

# Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3

Content Security Policy represents one of the most critical security mechanisms in modern browser extensions. In Manifest V3, Chrome significantly tightened CSP enforcement compared to the permissive defaults of Manifest V2, fundamentally changing how extension developers must think about security. This comprehensive guide walks you through every aspect of extension CSP—from understanding default behaviors to implementing advanced security patterns that protect millions of users.

Understanding and properly configuring CSP is not optional; it's a fundamental requirement for building secure extensions that pass Chrome Web Store review and protect users from malicious actors. Whether you're migrating from Manifest V2 or starting fresh with Manifest V3, this guide provides the deep technical knowledge you need to implement robust CSP policies.

## Understanding MV3 CSP Defaults

Chrome extensions in Manifest V3 ship with a default Content Security Policy that provides baseline protection while allowing common extension patterns to function. However, these defaults represent a balance between security and compatibility—not maximum security. Understanding exactly what the default policy allows and restricts is essential before you customize it for your extension.

The default CSP for extension pages in Manifest V3 is `script-src 'self' https://ajax.googleapis.com; object-src 'self'; style-src 'self' 'unsafe-inline'`. This policy permits scripts from the extension's own origin and Google's AJAX CDN, allows object elements from the extension's origin, and permits inline styles. While this seems restrictive compared to web pages, it still presents security vulnerabilities that custom policies can address.

The inclusion of `https://ajax.googleapis.com` in the default script sources deserves particular attention. This允许 extension developers to easily include popular JavaScript libraries from Google's CDN without configuration. However, this convenience comes with risks: if Google's CDN were compromised or if an attacker performed a man-in-the-middle attack, malicious code could execute within your extension context. For production extensions, you should either bundle dependencies locally or implement Subresource Integrity (SRI) hashes for any external scripts you load.

Default extension pages also inherit Chrome's extension-specific Content Security Policy relaxations that web pages don't receive. These include limited access to `eval()` and related functions, permission to make cross-origin requests to extension-owned URLs, and special handling for WebAssembly that isn't available in standard web contexts. Understanding these nuances helps you make informed decisions about what additional restrictions your extension can safely impose.

## Sandbox Pages for Untrusted Content

One of the most powerful CSP-related features in Manifest V3 is the sandbox pages mechanism. Sandboxed pages run in an isolated origin with no access to Chrome extension APIs, providing a secure environment for rendering potentially untrusted content. This isolation is crucial for extensions that handle user-generated HTML, process external templates, or render content from third-party sources.

You declare sandbox pages in your manifest.json using the `sandbox` key, specifying which HTML files should run in the sandboxed context. These pages receive a unique origin and cannot access `chrome.*` APIs directly. Instead, they communicate with your main extension through the standard postMessage API, receiving and sending data through a secure message channel you control.

```json
{
  "sandbox": {
    "pages": ["sandbox.html", "markdown-renderer.html"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'"
  }
}
```

The sandbox CSP itself can be more permissive than your main extension pages because the isolated context limits potential damage from vulnerabilities. However, you should still apply sensible restrictions. The `sandbox` directive in the CSP enables sandboxing, while additional directives control what the sandboxed page can do. Notice the `allow-scripts` permission—this is necessary for the sandboxed page to execute JavaScript, but it doesn't grant access to extension APIs.

When designing your extension architecture, use sandbox pages whenever you process content that originates outside your trusted codebase. Markdown renderers, syntax highlighters that process user code, and HTML preview components all benefit from sandbox isolation. This approach follows the principle of least privilege: each component gets only the permissions it absolutely needs to function.

## Alternatives to eval() and Similar Functions

Manifest V3 significantly restricted the use of `eval()`, `Function()`, `setTimeout()` with string arguments, and similar dynamic code execution mechanisms. These functions were common vectors for XSS attacks in Manifest V2 extensions, and their restriction improves the security posture of the entire extension ecosystem. However, this change broke many extensions that relied on dynamic code generation, requiring developers to find alternative approaches.

The primary replacement for dynamic code execution is standard function creation with proper arguments. Instead of `eval('var x = ' + userInput)`, use straightforward function calls with parameters. If you're parsing user-provided code—like configuration scripts or expression evaluators—you have several secure alternatives depending on your use case.

For mathematical expressions, simple parsers that evaluate tokens without executing arbitrary code provide both security and performance benefits. For more complex needs, consider embedding a JavaScript interpreter like QuickJS or斗牛的JS interpreter, which executes untrusted code in a completely isolated context with no access to browser APIs or the DOM. These interpreters run significantly slower than native JavaScript but provide strong security guarantees.

WebAssembly offers another alternative for performance-critical code that needs to run dynamically. You can compile code to WebAssembly at build time and load it at runtime, avoiding the need for dynamic code generation entirely. WebAssembly executes in a sandboxed environment separate from JavaScript, providing additional isolation. For extensions that need to run user-provided logic—such as automation rules or conditional actions—WebAssembly-based solutions provide a secure, performant path forward.

## Trusted Types for DOM XSS Prevention

Trusted Types represent Google's modern solution to DOM-based XSS attacks, and they're increasingly important for Chrome extensions. When you enable Trusted Types, the browser enforces that certain potentially dangerous DOM APIs can only receive typed objects rather than raw strings. This prevents the most common XSS attack vectors at the API level, complementing your CSP.

To enable Trusted Types in your extension, add the appropriate CSP directive:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'; trusted-types default"
  }
}
```

The `require-trusted-types-for 'script'` directive tells the browser to block string assignments to dangerous sink properties like `innerHTML`, `outerHTML`, and `insertAdjacentHTML`. Your code must create DOM elements using trusted type factories like `document.createElement` with proper attributes, or use TrustedHTML, TrustedScript, and TrustedScriptURL objects.

Implementing Trusted Types requires careful refactoring of existing code. Every place you currently set innerHTML needs rewriting. The good news is that this refactoring catches real XSS vulnerabilities—you'll discover and fix bugs that might otherwise lead to security breaches. Many popular frameworks including Angular, React (in development mode), and Lit have built-in Trusted Types support, so if you're using a modern framework, enabling Trusted Types may require only configuration changes.

## Nonce-Based Script Execution

For situations where you need to execute inline scripts—perhaps for inline event handlers or performance-critical code that benefits from direct script placement—Chrome extensions support nonce-based script execution through CSP. This approach allows specific inline scripts to run while blocking all other inline scripts, maintaining strong security while providing necessary flexibility.

A nonce is a random, unique value generated server-side (or in your extension's background script) for each page load. You include this nonce in both your CSP header and the inline script's nonce attribute. The browser only executes scripts whose nonce matches the current request, making it impossible for attackers to inject malicious scripts because they cannot predict or control the nonce value.

```javascript
// In your background script or server generating the page
const nonce = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

// Set CSP with the nonce
const csp = `script-src 'self' 'nonce-${nonce}'; object-src 'none'`;

// When generating HTML for your extension page
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="${csp}">
</head>
<body>
  <script nonce="${nonce}">
    // This script will execute because its nonce matches
    console.log('Secure inline script');
  </script>
</body>
</html>
`;
```

For extension popup and options pages generated dynamically, nonce-based scripts provide a secure pattern. However, for static HTML files in your extension, simpler approaches like moving code to external files often suffice. Use nonces when you have genuine need for inline script execution and cannot refactor to external files.

## Remote Code Restrictions in Manifest V3

Manifest V3 introduced some of the most significant security improvements by restricting remote code execution. Extensions can no longer load and execute arbitrary JavaScript from external URLs—only specific, whitelisted resource types can load from remote sources. This change dramatically reduces the attack surface of Chrome extensions by preventing the most dangerous attack vector: dynamic code injection.

Under Manifest V3, you can still load remote resources including stylesheets, images, fonts, and fetch/XHR data, but you cannot load executable JavaScript from external servers. This means your extension must bundle all logic that runs in extension contexts. Remote configuration files can control behavior, but they cannot contain executable code that runs with extension privileges.

The practical implication is that you must build all your extension's JavaScript into the extension package during development. Configuration that previously lived in remote JavaScript files must move to JSON configuration, which your bundled JavaScript reads and applies. This architectural change improves security by ensuring users can audit exactly what code runs in their browser—the extension package contains everything, with no hidden remote code.

For extensions that previously used remote code loading as a mechanism for rapid iteration or A/B testing, Manifest V3 requires new approaches. Remote configuration, feature flags stored in your extension's storage, and incremental rollout through Chrome's gradual rollout percentage provide alternatives that don't compromise security.

## CSP Violation Reporting

Monitoring CSP violations in your extension helps you identify misconfigurations, security issues, and unexpected behavior before they affect users. Chrome provides a violation reporting mechanism that sends JSON reports to endpoints you specify, containing details about blocked requests and the policies that blocked them.

To enable violation reporting, add a `report-uri` or `report-to` directive to your CSP:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; report-uri https://your-report-endpoint.com/csp-reports"
  }
}
```

Reports include the blocked directive, the resource URL that was blocked, the page where the violation occurred, and other contextual information. For extension developers, this data is invaluable for debugging during development and monitoring in production. You can collect reports from your users (with appropriate privacy notice and consent) to discover issues that don't surface in your own testing.

When implementing a reporting endpoint, validate incoming reports carefully—attackers might try to inject malicious data. Store reports in a structured format that allows analysis, and set up alerts for patterns that might indicate active exploitation attempts. A sudden spike in CSP violations might indicate an XSS attack in progress or a misconfiguration affecting legitimate functionality.

## Debugging CSP Errors

CSP errors manifest in various ways: silent failures where content doesn't load, console errors in Chrome DevTools, or security-intercepted pages that display error messages. Understanding how to debug these errors efficiently saves significant development time and helps you implement correct policies from the start.

Open Chrome DevTools on your extension's popup, options page, or side panel—the Console tab displays CSP violations with clear messages indicating which directive blocked which resource. Pay attention to the specific directive name and the resource URL; common issues include trying to load scripts from CDN domains not in your script-src, using inline styles without explicit permission, and attempting cross-origin requests without appropriate connect-src permissions.

For content scripts injected into web pages, debugging is more complex because content scripts inherit the host page's CSP rather than your extension's CSP. If your content script fails to execute or certain APIs don't work, check whether the host page's CSP is blocking your code. The solution often involves moving logic to your extension's background script or using the scripting API's injection capabilities that run with extension privileges.

Chrome's `chrome://extensions` page includes a "View warnings" link for each extension that sometimes surfaces CSP-related issues detected during installation or updates. Additionally, the extension manifest validation in Chrome Web Store publication often catches CSP issues before they reach users. Run your extension through Chrome's validation processes during development to catch problems early.

## Migration from MV2 Relaxed CSP

Migrating from Manifest V2 to Manifest V3 requires addressing CSP changes that affect many extensions. Manifest V2 allowed more permissive CSP configurations, including unrestricted `eval()` usage, remote script loading, and more permissive script sources. Manifest V3 enforces stricter defaults and restricts previously-allowed configurations.

The migration process typically involves several phases. First, identify all external script sources in your current CSP and bundle those dependencies locally. Second, locate all uses of `eval()`, `Function()`, and similar dynamic code execution, then refactor to use safe alternatives. Third, review your connect-src, style-src, and img-src directives to ensure they match actual resource usage—overly permissive source lists often hide security issues.

Many extensions find that their Manifest V2 CSP was more permissive than necessary. Use migration as an opportunity to implement least-privilege CSP: only allow what you actually need. If you don't load fonts from external sources, don't include font-src directives. If all your images are bundled or come from specific domains, specify those domains exactly. This tightening reduces your attack surface while improving your understanding of your extension's actual resource requirements.

Test extensively after migration. CSP issues often surface only with specific user interactions or particular page states. Create a checklist of all your extension's functionality and verify each item works with the new CSP. Pay special attention to third-party integrations, which frequently require additional CSP permissions you might have overlooked.

## Real-World Secure Extension Examples

Examining how well-designed extensions implement CSP provides practical guidance for your own projects. Several popular extensions demonstrate exemplary CSP practices that balance security with functionality.

Password manager extensions like Bitwarden and 1Password implement extremely strict CSP, reflecting the sensitive nature of their data. Their extensions typically use `script-src 'self'` with no external script sources, relying on bundled dependencies. They employ sandbox pages for any HTML rendering that processes untrusted content, and they use Trusted Types throughout their codebases. These extensions also minimize permission requests, following the principle of least privilege.

Privacy-focused extensions like uBlock Origin demonstrate sophisticated CSP implementations that account for the complex content filtering they perform. Their CSP permits specific patterns necessary for content blocking while maintaining strong restrictions elsewhere. Studying their manifest.json configurations reveals how to handle edge cases that more permissive extensions might overlook.

For extensions building user interfaces, the pattern of separating privileged and unprivileged contexts proves effective. Your main popup and options pages run with extension privileges and strict CSP. Any component that renders user-provided or remote content runs in a sandbox page with its own, more permissive but isolated CSP. This architectural pattern prevents compromises in untrusted content rendering from affecting your entire extension.

---

## Related Guides

Deepen your understanding of extension security through these related resources:

- [Security Hardening](/guides/security-hardening.md) — Comprehensive hardening techniques beyond CSP
- [Web Request Interception](/guides/chrome-extension-web-request-interception.md) — Secure patterns for network request modification

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
