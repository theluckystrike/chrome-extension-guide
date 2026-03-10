---
layout: default
title: "Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3"
description: "Master Chrome extension CSP in MV3. Learn sandbox pages, eval alternatives, trusted types, nonce scripts, remote code restrictions, and debugging."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-content-security-policy/"
---

# Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3

Content Security Policy represents one of the most critical security mechanisms available to Chrome extension developers. Unlike web applications where CSP is optional and often relaxed for compatibility, extensions operate with elevated privileges that make CSP configuration not just recommended but essential for protecting millions of users. This comprehensive guide dives deep into CSP implementation for Manifest V3 extensions, covering everything from default behaviors to advanced techniques like sandbox isolation, trusted types, and violation monitoring.

Understanding CSP in the context of Chrome extensions requires recognizing a fundamental difference from traditional web development. Your extension runs with access to powerful APIs—cookies, tabs, webRequest, history, and more—that web pages simply cannot touch. A vulnerability in your extension therefore has far greater consequences than a vulnerability on a typical website. CSP serves as your primary defense against code injection attacks that could exploit these privileged APIs.

## Understanding MV3 CSP Defaults

Chrome extensions built on Manifest V3 ship with a default Content Security Policy that provides baseline protection while remaining flexible enough for common development scenarios. The default policy permits scripts from the extension's own origin (`'self'`) and allows loading resources from `https://ajax.googleapis.com`, a remnant of the era when Google's CDN was the standard way to include popular libraries like jQuery.

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0"
}
```

With this minimal manifest, your extension operates under the following implicit CSP: `script-src 'self' https://ajax.googleapis.com; object-src 'self'; child-src 'self'`. While this baseline protects against some attack vectors, it leaves significant gaps that malicious actors can exploit. The允许从Google CDN加载脚本的规定尤其令人担忧——如果攻击者能够渗透该CDN或通过中间人攻击替换资源，他们就可以在数百万个安装的扩展中执行任意代码。

The implicit policy also permits `object-src 'self'`, allowing your extension to load plugins and embedded content from its own origin. This capability, while sometimes necessary for specific use cases like PDF viewing, represents a potential attack surface that should be eliminated unless explicitly required.

### Tightening Default Policies for Production

Production extensions should always declare explicit CSP rules that eliminate unnecessary permissions. The following configuration represents a solid baseline for most extension types:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'"
  }
}
```

This configuration enforces strict boundaries: only scripts originating from your extension can execute, no plugins or external objects load, inline styles remain permitted for UI convenience, images can load from any HTTPS source, and your extension cannot be embedded in malicious iframes. The `connect-src` directive limits where your extension can make network requests, preventing data exfiltration even if an attacker injects code into your extension.

## Sandbox Pages for Untrusted Content

One of the most powerful CSP features for extension developers is the ability to run pages in a sandboxed environment. Sandboxed pages operate in complete isolation from your extension's JavaScript context and cannot access any Chrome extension APIs. This isolation makes sandbox pages ideal for rendering untrusted content such as user-generated HTML, third-party widgets, or content fetched from external sources.

```json
{
  "sandbox": {
    "pages": ["sandbox/renderer.html", "sandbox/markdown-viewer.html"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'"
  }
}
```

Communication between your main extension context and sandbox pages occurs through message passing. Your main extension sends data to the sandbox, the sandbox processes it without access to sensitive APIs, and returns results back through the messaging system. This architecture ensures that even if malicious content escapes containment, it cannot access user data, intercept cookies, or manipulate browser tabs.

Consider a practical scenario where your extension renders Markdown content from user notes. Parsing untrusted Markdown requires executing complex transformations that might include embedded HTML. By running your Markdown renderer in a sandbox page, you isolate this risky operation from your extension's privileged context. The sandbox cannot access the `chrome.cookies` API, cannot read `chrome.storage`, and cannot make privileged extension calls—limiting the blast radius of any potential compromise.

## Alternatives to eval() and Function() Constructors

Manifest V3 significantly restricts dynamic code execution capabilities that were common in Manifest V2. The `eval()` function, `new Function()` constructor, and similar mechanisms that compile and execute strings as JavaScript code are now blocked by default CSP. This restriction prevents a entire class of code injection attacks but requires developers to refactor code that previously relied on dynamic execution.

The most common use case for `eval()` involved loading scripts from strings—perhaps fetched from a server or constructed based on runtime conditions. Modern extensions should instead fetch complete script files and load them through standard script tags or dynamic import mechanisms.

```javascript
// Instead of eval() for loading remote scripts
// Old approach (broken in MV3):
eval('console.log("loaded")');

// Modern approach: Dynamic import
async function loadModule(modulePath) {
  const module = await import(modulePath);
  return module;
}

// Loading from bundled scripts
import { utilityFunction } from './utils/utility.js';
```

For cases where you genuinely need runtime code generation—such as creating functions from user-defined rules—consider alternatives like the `Function` constructor with careful input validation, or better yet, interpret user input as data rather than code. A rule engine that evaluates conditions against data can often be implemented using a safe expression parser rather than executable code strings.

```javascript
// Safe alternative: Data-driven function generation
function createSafeEvaluator(rules) {
  // Use a sandboxed iframe or create a function with limited scope
  const allowedGlobals = { console, Math, Date, JSON, Array, Object };
  
  return new Function(...Object.keys(allowedGlobals), 'data', `
    with (this) {
      ${rules}
    }
  `).bind(allowedGlobals);
}
```

## Trusted Types for DOM XSS Prevention

Trusted Types represent an advanced browser security feature that helps prevent DOM-based cross-site scripting attacks. When enabled, Trusted Types require that potentially dangerous DOM operations use type-safe objects rather than raw strings. This approach shifts the security model from detecting attacks at runtime to preventing dangerous code patterns from being written in the first place.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script';"
  }
}
```

With Trusted Types enabled, the following code will fail:

```javascript
// This will throw a TypeError
document.getElementById('output').innerHTML = userInput;

// This works with Trusted Types
const trustedHtml = trustedTypes.createHTML(userInput);
document.getElementById('output').innerHTML = trustedHtml;
```

Implementing Trusted Types requires updating all code that manipulates the DOM to use the Trusted Types API. For extensions with significant UI complexity, this migration can be substantial but provides substantial security benefits. The browser enforces type safety at runtime, eliminating entire categories of XSS vulnerabilities that CSP alone cannot prevent.

```javascript
// Define a Trusted Types policy for your extension
const policy = trustedTypes.createPolicy('extension-policy', {
  createHTML: (input) => {
    // Sanitize input according to your requirements
    return DOMPurify.sanitize(input, { RETURN_TRUSTED_TYPE: true });
  },
  createScript: (input) => {
    // Validate and sanitize script content
    if (/^[a-zA-Z0-9_-]+$/.test(input)) {
      return input;
    }
    throw new Error('Invalid script identifier');
  }
});
```

## Nonce-Based Script Execution

For scenarios requiring inline scripts—such as embedding third-party widgets or rendering content from external systems that generate HTML with embedded JavaScript—nonce-based script execution provides a secure alternative to unsafe-inline. Rather than allowing all inline scripts (which would defeat CSP's security purpose), you can whitelist specific scripts using cryptographic nonces.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'nonce-{RANDOM}'; object-src 'none';"
  }
}
```

In your HTML, include the nonce attribute on scripts that must execute:

```html
<script nonce="<%= nonce %>">
  // This script will execute because its nonce matches the CSP
  console.log('Trusted inline script');
</script>
```

The nonce must be generated server-side (or in your extension's build process) and must be unique for each page load. This uniqueness prevents attackers from guessing or reusing nonces, as each page load generates a fresh value that cannot be predicted in advance.

For extensions using a build system, integrating nonce generation is straightforward. Generate a random value during page rendering, inject it into your CSP header, and include it in any inline script tags. Content Security Policy will then permit only those specific scripts to execute while blocking all other inline scripts.

## Remote Code Restrictions and Subresource Integrity

Manifest V3 enforces strict limitations on loading and executing remote code. Extensions cannot load scripts from remote servers at runtime—the code must be bundled with the extension package. This restriction dramatically reduces the attack surface by ensuring that all executable code undergoes Chrome Web Store review and cannot be modified after publication.

For extensions that previously loaded scripts from external servers, this change requires architectural adjustments. Instead of fetching script updates from your server, bundle the scripts with your extension and push updates through the Web Store review process. While this adds friction to your release pipeline, it provides substantial security benefits for users.

When you must load external resources—stylesheets, images, API data—use Subresource Integrity (SRI) to verify that retrieved content hasn't been tampered with:

```html
<link rel="stylesheet" href="https://example.com/styles.css"
      integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
      crossorigin="anonymous">
```

The integrity hash ensures that even if an attacker intercepts the request and modifies the response, the browser will refuse to load the tampered resource. Combine SRI with strict CSP `connect-src` and `script-src` directives to create defense in depth.

## CSP Violation Reporting

Monitoring CSP violations helps identify potential attack attempts and configuration errors before they cause problems. CSP provides a `report-uri` directive that instructs the browser to send JSON reports when policy violations occur:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; report-uri https://your-server.com/csp-reports;"
  }
}
```

Each violation report contains detailed information about what was blocked, where it originated, and which directive was violated:

```json
{
  "csp-report": {
    "blocked-uri": "self",
    "violated-directive": "script-src 'self'",
    "original-policy": "script-src 'self'; object-src 'none'",
    "document-uri": "chrome-extension://extension-id/popup.html",
    "line-number": 42
  }
}
```

Implementing a violation reporting endpoint requires server-side infrastructure to receive and process the reports. For smaller extensions, consider aggregating reports and reviewing them periodically rather than implementing real-time alerting. Look for patterns that might indicate attacks—for instance, repeated violations from the same extension page attempting to load external scripts could signal an injection vulnerability.

## Debugging CSP Errors

When CSP blocks resources, Chrome provides clear error messages in the console and developer tools. Understanding how to interpret these messages accelerates troubleshooting significantly. The console displays violations with a clear explanation of which directive was violated and what resource was blocked.

The Extensions Management page (`chrome://extensions`) provides a "Errors" tab that shows CSP violations in context. This view is particularly useful because it shows errors across all your extension pages in one place, making it easier to identify systemic issues.

Common CSP errors and their solutions include:

**"Refused to load the script because it violates the following Content Security Policy directive"** — The script source is not allowed. Add the domain to your `script-src` directive or bundle the script with your extension.

**"Refused to evaluate a string as because 'unsafe-eval' is not an allowed directive"** — Your code uses `eval()`, `Function()`, or similar dynamic code execution. Refactor to avoid these patterns.

**"Refused to load the stylesheet because it violates the following Content Security Policy directive"** — Add `'unsafe-inline'` to your `style-src` directive or move styles to external stylesheets.

**"Cannot load a script with URL starting with 'chrome-extension://'"** — This typically occurs when using `script.src` with an extension URL. Use `chrome.runtime.getURL()` to generate proper extension URLs.

## Migration from MV2 Relaxed CSP

Extensions migrating from Manifest V2 to Manifest V3 often face CSP-related breaking changes. MV2 permitted many practices that MV3 restricts or prohibits outright. The migration process requires systematically addressing each area where your extension's behavior conflicts with MV3's stricter security model.

Start by auditing your existing code for dynamic code execution patterns. Search for `eval(`, `new Function(`, `setTimeout(` with string arguments, and similar constructs. Each occurrence needs refactoring to use static code patterns. This audit often reveals opportunities to simplify code architecture while improving security.

Next, review any remote script loading. If your extension fetches scripts from external servers, you must either bundle them with your extension or implement a server-side architecture that serves only data (not executable code) to your extension. The extension then processes this data using bundled code.

Finally, test extensively with strict CSP. Temporarily enable the strictest possible CSP during development to identify issues early:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self';"
  }
}
```

Gradually relax directives only as needed for legitimate functionality, documenting each exception.

## Real-World Secure Extension Examples

Studying well-implemented extensions provides valuable patterns for your own projects. Password manager extensions demonstrate excellent CSP practices—they isolate password handling in sandboxed contexts, use Trusted Types for DOM manipulation, and restrict API access through carefully designed messaging patterns.

Consider a password manager's architecture: the main extension context handles encryption and storage through the chrome.storage API, but all UI rendering occurs in sandboxed pages. User-generated content (password entries, notes) is never rendered directly in the extension context—instead, it's passed to sandbox pages that use Trusted Types and strict CSP to safely display data. This architecture means that even if an XSS vulnerability exists in how the extension renders password entries, the attack cannot access the underlying storage APIs.

Another example: extensions that display third-party web content in frames should use the `sandbox` attribute on iframes and configure CSP to block script execution within the frame. This prevents malicious pages loaded in the iframe from escaping their boundaries to attack the extension.

## Related Guides

Content Security Policy works alongside other security measures to create defense in depth. Explore these related guides to build comprehensive security into your extension:

- [Security Hardening](/guides/chrome-extension-security-hardening.md) — Advanced techniques for protecting your extension against modern attack vectors
- [Web Request Interception](/guides/chrome-extension-web-request-interception.md) — Secure patterns for observing and modifying network requests while maintaining CSP compliance

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
