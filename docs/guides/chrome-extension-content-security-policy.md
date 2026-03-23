---
layout: default
title: "Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3"
description: "Chrome extension CSP in MV3: sandbox pages, eval alternatives, trusted types, nonce scripts, remote code, violation reporting, debugging, MV2 migration."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-content-security-policy/"
---

# Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3

Content Security Policy represents one of the most critical security mechanisms in modern browser extensions. In Chrome's Manifest V3, CSP has undergone significant changes that strengthen the security posture of extensions while introducing new challenges for developers accustomed to Manifest V2's more permissive policies. This comprehensive guide walks you through every aspect of CSP configuration, from understanding default behaviors to implementing advanced security patterns that protect millions of users.

Chrome extensions operate with elevated privileges within the browser, granting them access to sensitive APIs, user data, and browser functionality that standard web pages cannot reach. This power makes extensions attractive targets for attackers, and misconfigured CSP is one of the most common vulnerabilities exploited. A robust CSP serves as your extension's first line of defense against cross-site scripting attacks, data injection, and unauthorized resource loading. Understanding how to configure it correctly is essential for every extension developer who takes security seriously.

## Understanding Manifest V3 CSP Defaults

Chrome extensions built with Manifest V3 ship with a default Content Security Policy that provides baseline protection while remaining compatible with common extension patterns. The default policy allows scripts from the extension's own origin and from Google's CDN, specifically permitting `script-src 'self' https://ajax.googleapis.com`. This default exists to ensure basic functionality works out of the box, but relying on it leaves significant security gaps that attackers can exploit.

The default CSP also permits loading resources from the extension's origin, which includes all files bundled within your extension package. Style sheets and images can load from the extension's files, and XMLHttpRequest or fetch calls can connect back to the extension origin. These permissions are necessary for basic extension functionality, but they create potential attack surfaces if your extension processes any external data.

What's notably absent from the default CSP is any restriction on object sources, frame ancestors, or base URIs. This means extensions running with default CSP are potentially vulnerable to plugin-based attacks, clickjacking through iframe embedding, and base URL manipulation attacks. The default policy also lacks any Content Security Policy reporting mechanism, so you won't receive notifications if CSP violations occur in production. For any extension handling sensitive data or processing external content, you must override these defaults with a strict custom policy.

The default policy does not permit eval() or similar functions like new Function(), setTimeout with string arguments, or inline scripts. This represents a significant security improvement over Manifest V2, where relaxed CSP allowed these dangerous patterns. However, many older extensions were built assuming these capabilities, creating migration challenges that we address later in this guide.

## Configuring Strict Extension Page CSP

Your popup, options page, side panel, and other extension UI pages require the strictest possible CSP configuration. These pages run in the extension's context and frequently display sensitive information, handle user credentials, or provide access to privileged APIs. A security breach in these pages can expose your entire extension functionality to attackers, making their CSP configuration paramount.

A well-configured extension page CSP should start with restricting script sources to only your extension's origin:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.yourservice.com; frame-ancestors 'none'; base-uri 'self'"
  }
}
```

This configuration locks down your extension pages significantly. The `script-src 'self'` directive ensures only your extension's JavaScript can execute, blocking any attempt to load malicious external scripts. Even if an attacker compromises your build pipeline or a dependency, they cannot inject arbitrary scripts into your extension pages.

The `object-src 'none'` directive deserves special attention. This prevents Flash, Java applets, and other legacy plugin content from loading within your extension pages. Plugin-based attacks have historically been among the most severe browser vulnerabilities, and blocking object sources eliminates this entire attack class from your extension.

The `frame-ancestors 'none'` directive prevents your extension pages from being embedded in iframes on external websites. This defends against clickjacking attacks where malicious sites attempt to trick users into interacting with invisible extension UI elements. Combined with `base-uri 'self'`, which blocks attempts to override base URLs that attackers could use to redirect relative links to malicious destinations, these directives provide defense in depth against framing and redirection attacks.

## Sandbox Pages for Untrusted Content

Sometimes extensions must render content that cannot be fully trusted. User-generated HTML templates, Markdown content from external sources, email bodies, or HTML extracted from arbitrary web pages all pose significant risks if rendered in the main extension context. A single XSS vulnerability in how you handle this content could compromise your entire extension.

Chrome's sandboxed pages provide an elegant solution by running content in an isolated environment with no access to extension APIs. When a page runs in the sandbox, it cannot access chrome.runtime, chrome.storage, or any other Chrome extension API. It also cannot access the parent extension's JavaScript variables or DOM. The sandbox provides a communication mechanism through postMessage, allowing controlled data exchange between sandboxed pages and your main extension code.

To enable sandbox pages, declare them in your manifest:

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

The sandbox CSP can be more permissive than your extension page CSP because the sandboxed page has no access to sensitive APIs. Notice the `sandbox` keyword in the CSP value, which enables sandboxing. You can add additional directives like `allow-scripts` to permit JavaScript execution within the sandbox while maintaining isolation.

When designing sandboxed content handling, implement a strict content security policy on the non-sandboxed side as well. Validate and sanitize all data before passing it to sandboxed pages. Use structured cloning rather than eval() when passing complex data. Consider implementing a message validation scheme that verifies the origin and structure of messages received from sandboxed pages.

## Alternatives to eval() and Dynamic Code Execution

Manifest V3's strict CSP fundamentally prohibits eval() and similar dynamic code execution mechanisms. This represents a significant security improvement but requires developers to find alternative approaches for common patterns that relied on runtime code generation. Understanding these alternatives is essential for successful MV3 migration and secure extension design.

The most common use case for eval() in extensions was dynamic template rendering. Legacy code often constructed JavaScript templates by concatenating strings and then executing them with eval(). This pattern is extremely dangerous because it creates opportunities for code injection if any user data finds its way into the template. Modern template libraries like Handlebars, Mustache, or lit-html provide equivalent functionality without requiring dynamic code execution. These libraries compile templates to static functions at build time or render DOM elements programmatically, eliminating injection vectors entirely.

Another frequent use case involved loading extension features dynamically based on configuration. Instead of eval(), use a configuration object that maps keys to pre-loaded module references:

```javascript
// Instead of eval('feature_' + featureName + '()');
const features = {
  search: () => { /* search implementation */ },
  filter: () => { /* filter implementation */ },
  export: () => { /* export implementation */ }
};

function runFeature(featureName) {
  if (features[featureName]) {
    features[featureName]();
  }
}
```

For cases where you genuinely need to evaluate dynamic expressions, JavaScript's Function constructor provides a slightly safer alternative because it executes in the global scope rather than the local scope. However, this still executes arbitrary code and should be avoided whenever possible. If you must use Function, ensure all input is strictly validated and preferably sandboxed.

## Trusted Types for DOM Manipulation

Trusted Types represent Google's modern approach to preventing DOM-based XSS attacks. When enabled, the browser enforces that certain dangerous DOM APIs can only receive trusted values rather than arbitrary strings. This shifts the security burden from remembering to sanitize every input to ensuring your code uses the right APIs.

Enabling Trusted Types in your extension requires adding the appropriate CSP directive:

```
script-src 'self'; object-src 'none'; require-trusted-types-for 'script'
```

With Trusted Types enforced, operations like element.innerHTML, document.write(), and eval() will throw errors unless you use Trusted Type objects. This might seem restrictive, but it forces you to adopt safer patterns. Instead of setting innerHTML with raw strings, use textContent for plain text or create elements programmatically:

```javascript
// This will fail with Trusted Types
element.innerHTML = userData;

// Use this instead
element.textContent = userData;

// Or create elements explicitly
const span = document.createElement('span');
span.textContent = userData;
element.appendChild(span);
```

For cases where you need HTML-like content, use TrustedHTML with a policy you define:

```javascript
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => {
    // Implement your sanitization here
    return DOMPurify.sanitize(input);
  }
});

element.innerHTML = policy.createHTML(userInput);
```

Trusted Types work exceptionally well with template libraries that support them. Many modern frameworks have built-in Trusted Types support, allowing you to benefit from XSS prevention without rewriting your entire rendering system.

## Nonce-Based Script Execution

Sometimes you need to execute inline scripts while maintaining CSP compliance. Perhaps you're working with a third-party library that generates inline scripts, or you have a legitimate reason to include dynamic script content. Nonce-based script execution provides a controlled mechanism for this.

A nonce is a random, single-use token that you generate server-side or in your extension's trusted code. You include this nonce in your CSP as `script-src 'self' 'nonce-abc123'` and in your script tag as `<script nonce="abc123">`. The browser will only execute scripts whose nonce matches a nonce currently in the CSP, ensuring that inline scripts cannot be injected by attackers.

Generating secure nonces requires cryptographic randomness:

```javascript
function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
```

When serving HTML that includes nonceable scripts, inject the nonce into both the script tag and a CSP header. In extension pages, you control the HTML directly, so you can generate nonces at page load and include them in your served content. Remember that nonces must be unpredictable and never reused across requests or page loads.

Keep in mind that nonce-based scripts should be the exception rather than the rule. Most extension functionality can be implemented without inline scripts, and each nonceable script represents a potential security risk if mishandled. Consider whether you can refactor your code to use external scripts or event-driven patterns instead.

## Remote Code Restrictions in Manifest V3

Manifest V3 fundamentally changed how extensions can load and execute code. Unlike Manifest V2, which allowed loading and executing remote JavaScript, Manifest V3 restricts extensions to only executing code bundled within the extension package. This change significantly reduces the attack surface of extensions by eliminating the possibility of attackers compromising a remote server to inject malicious code into your extension.

The remote code restriction applies to all script sources. You cannot load scripts from external URLs, whether those URLs point to your own servers or third-party CDNs. All JavaScript that your extension executes must be included in the extension package at install time. This means you must bundle all dependencies, including libraries like React, Lodash, or any other third-party code, directly in your extension.

This restriction has several important implications for extension architecture. First, your extension package will be larger because all code must be included. Second, you cannot update extension logic without publishing a new version to the Chrome Web Store. Third, you must carefully audit all bundled code for vulnerabilities since you cannot hot-patch problematic dependencies.

For loading external resources that are not executable code, you can still use regular URLs in your CSP. Images, stylesheets, fonts, and API requests can all point to external sources. Only executable code is restricted. You can also use external URLs for fetch() or XMLHttpRequest calls to retrieve data at runtime, as long as you properly validate and sanitize that data before using it in your extension.

## CSP Violation Reporting

Understanding when and how your CSP is being violated is crucial for maintaining security and debugging issues. CSP provides a reporting mechanism that sends JSON reports to a specified endpoint whenever a violation occurs. Configuring reporting helps you catch potential attacks and identify legitimate code that needs adjustment.

To enable CSP reporting, add the report-uri directive to your CSP:

```
script-src 'self'; object-src 'none'; report-uri https://your-api.example.com/csp-reports
```

When a CSP violation occurs, the browser sends a POST request with a JSON body containing details about the violation. The report includes the directive that was violated, the blocked resource URL, the page where the violation occurred, and other metadata that helps you understand and respond to the violation.

In production extensions, consider implementing a reporting system that collects and analyzes CSP violations. Patterns of violations might indicate an attack attempt, while repeated violations from the same source might indicate a bug in your code. You can also use reporting to validate that your CSP is correctly configured before tightening it further.

Chrome also provides an onCSPViolation event in the chrome.events API that you can use to receive violation notifications directly in your extension's background service worker:

```javascript
chrome.contentSettings.CSP.clear({}); // Not applicable

// Use chrome.runtime.onMessage with violation reports instead
```

For sandbox pages, you can set a separate report-uri in the sandbox CSP to receive violations from isolated content separately from your main extension pages.

## Debugging CSP Errors

CSP errors manifest in several ways in Chrome DevTools, and understanding how to find and interpret them is essential for development. The Console tab displays CSP violation messages with clear descriptions of what was blocked and why. The Security tab provides an overview of the page's security configuration, including the active CSP.

Common CSP error messages and their meanings help you quickly diagnose issues. "Refused to execute inline script" means your CSP does not allow the inline script you're trying to run. Fix this by moving the script to an external file or using a nonce. "Refused to load the script" indicates that the script source URL is not in your allowed sources. Check the URL and add it to your script-src if appropriate.

"Refused to connect to" errors occur when your connect-src directive doesn't include the URL you're trying to fetch from. Add the domain to connect-src or use a wildcard if appropriate. "Refused to frame" errors indicate that frame-ancestors is blocking an iframe embedding your page. If you need to be frameable, adjust frame-ancestors, but be aware of clickjacking risks.

For persistent debugging, you can temporarily relax CSP in development using Chrome flags or by loading your extension in development mode with a less restrictive manifest. However, never ship with relaxed CSP. Use environment-specific configurations to ensure your production build has strict security while development remains convenient.

## Migration from Manifest V2 Relaxed CSP

Many extensions built for Manifest V2 relied on relaxed CSP that is no longer allowed in Manifest V3. Migration requires systematic updates to remove dependencies on forbidden patterns and implement secure alternatives. This process can be substantial for complex extensions but is essential for Chrome Web Store compliance.

The most common Manifest V2 patterns that require migration include eval() usage for dynamic code execution, inline scripts without nonces, loading external scripts from CDNs, and using unsafe-inline for styles when not strictly necessary. Each of these requires a different remediation approach.

Start by auditing your extension's JavaScript for eval(), new Function(), setTimeout with string arguments, and similar dynamic execution patterns. Replace each occurrence with static alternatives. Template libraries, configuration objects, and function references can replace most dynamic code patterns. For the few cases where dynamic evaluation is truly necessary, consider whether the feature is essential or can be redesigned.

For external scripts that were loaded from CDNs, download and bundle those scripts in your extension. Use npm or yarn to manage dependencies and include node_modules in your extension build. Verify that bundled scripts are up to date and free of known vulnerabilities. Consider using a build tool like Webpack or Rollup to bundle and minify your code, reducing package size while maintaining security.

## Real-World Secure Extension Examples

Examining how well-designed extensions implement CSP provides valuable patterns you can apply to your own projects. Password manager extensions like Bitwarden demonstrate strict CSP implementation, using separate CSP policies for different contexts and employing sandboxed pages for handling untrusted HTML content from password fields.

Extensions that handle sensitive data should implement defense in depth. OnePassword's extension uses Trusted Types, sandboxed content scripts for password field injection, and strict CSP that allows no external scripts. This multi-layered approach ensures that even if one security control fails, others remain effective.

For extensions that must display user-generated content, the pattern of using sandboxed renderers with strict communication protocols provides a template. Email extensions that display HTML email bodies should render that content in sandboxed pages, sanitize HTML through a library like DOMPurify, and communicate safe content to the main extension through structured messages.

Analytics and telemetry extensions demonstrate how to implement reporting while maintaining security. These extensions configure report-uri to collect violation data, analyze patterns to detect potential issues, and iteratively tighten CSP based on real usage data. This approach allows starting with a functional but permissive CSP and hardening it over time as you understand your extension's true requirements.

## Conclusion

Content Security Policy in Manifest V3 represents a significant advancement in Chrome extension security. The stricter defaults, remote code restrictions, and sandboxed page support provide developers with powerful tools to protect users. However, these benefits require understanding and effort to implement correctly. By configuring strict CSP for your extension pages, using sandboxed pages for untrusted content, replacing eval() with safer alternatives, implementing Trusted Types, and following the migration patterns outlined in this guide, you can build extensions that are secure by design.

Security is not a one-time configuration but an ongoing process. Monitor CSP violations, keep dependencies updated, and regularly audit your extension for security issues. The patterns and practices in this guide provide a foundation, but security ultimately depends on vigilant development and response to emerging threats.

---

## Related Guides

Deepen your understanding of extension security with these related resources:

- [Security Hardening](/guides/security-hardening.md) — Advanced techniques for hardening your extension against attacks
- [Chrome Extension Web Request Interception](/guides/chrome-extension-web-request-interception.md) — Understanding how to intercept and modify network requests securely

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
