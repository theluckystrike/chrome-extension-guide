---
layout: default
title: "Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3"
description: "Master MV3 CSP defaults, sandbox pages, eval alternatives, trusted types, nonce-based scripts, and secure extension patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-content-security-policy/"
---

# Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3

Content Security Policy represents one of the most critical security mechanisms available to Chrome extension developers. With Manifest V3 introducing significant changes to how extensions handle CSP, understanding these differences is essential for building secure, compliant extensions that protect users from cross-site scripting attacks, data injection, and unauthorized resource loading. This comprehensive guide covers every aspect of CSP implementation in Chrome extensions, from understanding default behaviors to implementing advanced security patterns that meet enterprise-grade security requirements.

Chrome extensions operate with elevated privileges within the browser, granting them access to sensitive APIs, user data, and powerful browser capabilities. This power comes with significant responsibility—any vulnerability in your extension can expose millions of users to malicious activities. CSP serves as your first line of defense, establishing explicit rules about what resources your extension can load and execute. Without a properly configured CSP, your extension becomes vulnerable to attacks that could compromise user data, hijack browser sessions, or turn your extension into a vector for malware distribution.

## Understanding MV3 CSP Defaults

Manifest V3 introduced significant changes to Content Security Policy compared to its predecessor. Understanding these defaults is crucial because they represent the baseline security posture of your extension, and knowing what they allow helps you identify where you need to add restrictions.

The default CSP for Chrome extensions in Manifest V3 is notably more restrictive than what many developers were accustomed to in Manifest V2. By default, extensions are limited to `script-src 'self' https://ajax.googleapis.com; object-src 'self';` which allows scripts from the extension's own origin and Google's CDN, along with object resources from the extension itself. This default provides a reasonable starting point, but it was carefully designed to balance security with compatibility for common extension use cases.

One of the most significant changes in MV3 is the removal of the ability to relax CSP for extension pages. In Manifest V2, developers could specify relaxed CSP policies that allowed eval(), inline scripts, or external script loading for specific use cases. Manifest V3 eliminates these relaxations entirely for extension pages, enforcing stricter defaults that cannot be overridden. This change was made in response to numerous security incidents where extensions were compromised through CSP relaxation, and it represents Google's commitment to securing the extension ecosystem.

The default policy also restricts connect-src to the extension's origin, meaning your extension cannot make arbitrary network requests without explicit permission through the manifest. This limitation prevents compromised extension code from exfiltrating user data to attacker-controlled servers but requires developers to explicitly declare all legitimate API endpoints in their manifest. Understanding these defaults helps you audit your extension's actual requirements and implement the minimum permissions necessary for your functionality.

## Implementing Strict CSP for Extension Pages

Your popup, options page, side panel, and other extension UI pages represent your extension's primary attack surface. These pages often handle sensitive information, display user data, or provide interfaces for configuring extension behavior. A breach in any of these pages can compromise your entire extension, making strict CSP implementation essential for protecting your users.

The recommended CSP configuration for extension pages in MV3 is significantly more restrictive than the defaults. By specifying your own CSP in the manifest, you gain fine-grained control over what resources your extension pages can load:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.yourservice.com; frame-ancestors 'none'; base-uri 'self'"
  }
}
```

This configuration demonstrates several important security principles. The `script-src 'self'` directive ensures only JavaScript from your extension's own origin can execute, preventing any attempts to load malicious external scripts. This is particularly important because script injection attacks are among the most common and devastating vulnerabilities in web applications and extensions. By limiting scripts to your own origin, you eliminate the attack vector entirely.

The `object-src 'none'` directive deserves special attention because it provides protection against legacy plugin-based attacks. Flash, Java applets, and other browser plugins have been vectors for numerous security vulnerabilities over the years. By explicitly blocking all object content, you eliminate an entire class of potential attacks that might otherwise compromise your extension. Even though these technologies are largely deprecated, their support remains in browsers for legacy compatibility, making this restriction essential.

The `frame-ancestors 'none'` directive prevents your extension pages from being embedded in iframes on external websites. Without this protection, malicious websites could embed your options page or popup in an invisible iframe, potentially enabling clickjacking attacks where users are tricked into clicking buttons they cannot see. This directive ensures your extension UI can only be displayed in legitimate contexts.

## Sandbox Pages for Untrusted Content

Extensions frequently need to render content that cannot be fully trusted—user-generated HTML from templates, Markdown content rendered to HTML, or content fetched from external APIs. Running this untrusted content in your main extension context exposes all your extension's APIs and data to potential compromise. Chrome's sandboxed pages provide an isolated environment for handling this scenario safely.

Sandbox pages run in a special isolated world with no access to extension APIs, chrome.storage, or any other Chrome extension functionality. This isolation ensures that even if an attacker manages to inject malicious code into your sandboxed content, they cannot access user data, make network requests on your extension's behalf, or perform any actions that require extension permissions. The sandbox provides a secure container for processing potentially dangerous content.

Configuring sandbox pages requires declaring them in your manifest and specifying a separate CSP for sandboxed content:

```json
{
  "sandbox": {
    "pages": ["sandbox.html", "markdown-renderer.html", "user-template.html"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'"
  }
}
```

The sandbox CSP can be slightly more permissive than your extension pages CSP because the sandboxed environment provides additional isolation. Notice the `sandbox allow-scripts` directive—this is required for sandboxed pages to execute any JavaScript at all. The key security benefit comes from the fact that sandboxed pages cannot access extension APIs, making the consequences of any compromise far less severe.

When implementing sandbox pages, communicate between the sandbox and your main extension using message passing. Your main extension page can send data to the sandbox for processing, and the sandbox can return results after performing its operations. This pattern allows you to benefit from sandbox isolation while still integrating processed content into your extension's functionality.

## Alternatives to eval() and Dynamic Code Execution

One of the most significant CSP restrictions in MV3 is the complete removal of support for eval() and similar dynamic code execution methods. In Manifest V2, developers could use eval(), new Function(), setTimeout with string arguments, and similar mechanisms by including them in their CSP. MV3 blocks all of these, requiring developers to refactor code that relies on dynamic execution.

The security rationale for this restriction is compelling. Dynamic code execution is inherently dangerous because it allows strings to be interpreted as executable code. If an attacker can influence what gets passed to eval(), they can execute arbitrary code in your extension's context. Even careful sanitization often fails against sophisticated attacks, making complete avoidance the only truly safe approach.

For most use cases that previously relied on eval(), there are safer alternatives. If you were using eval() to parse JSON, use JSON.parse() instead—it performs the same function without the security risks. If you were dynamically constructing functions based on user input, consider redesigning your approach to use configuration objects or strategy patterns that select from predefined implementations. For template engines that used eval() for compilation, migrate to modern template libraries that generate functions through safe constructor patterns.

In rare cases where dynamic code execution seems necessary, consider whether the sandbox page pattern might provide a safer approach. While sandboxed pages cannot use eval() either, the isolation they provide significantly reduces the impact of any vulnerability. Alternatively, evaluate whether WebAssembly might provide the dynamic capabilities you need—WASM modules can be loaded dynamically while still maintaining strong isolation from the JavaScript context.

## Trusted Types for DOM XSS Prevention

Trusted Types represent an advanced browser security feature that provides programmatic protection against DOM-based cross-site scripting attacks. When enabled, Trusted Types require that potentially dangerous DOM operations use specifically created "trusted" objects rather than raw strings, preventing the injection of malicious content into your page.

Implementing Trusted Types in your extension requires both configuring your CSP to enable the feature and modifying your JavaScript to create trusted objects where appropriate:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script'"
  }
}
```

With `require-trusted-types-for 'script'` in your CSP, the browser will block any attempt to pass strings to dangerous DOM sinks like innerHTML, insertAdjacentHTML, or document.write. Instead, you must use Trusted Type objects created through the Trusted Type policy API:

```javascript
// Create a trusted types policy
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => {
    // Implement sanitization here
    return DOMPurify.sanitize(input);
  }
});

// Use the policy instead of raw strings
const element = document.getElementById('content');
element.innerHTML = policy.createHTML(userProvidedContent);
```

This pattern provides defense in depth—even if your sanitization has a flaw, the Trusted Types enforcement ensures that only explicitly processed content can reach dangerous DOM operations. For extensions that handle user-generated content or render content from external sources, Trusted Types significantly reduce the risk of XSS vulnerabilities.

## Nonce-Based Script Execution for Dynamic Needs

In situations where you genuinely need to execute dynamically generated scripts while maintaining security, nonce-based script execution provides a controlled mechanism. Rather than allowing all scripts or none, nonces allow specific script tags to execute based on a cryptographic token generated server-side or by your extension's backend logic.

To implement nonce-based scripts, include the nonce directive in your CSP and generate unique nonces for each script you need to execute:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'nonce-{NONCE}'; object-src 'none'"
  }
}
```

In your HTML, add the nonce attribute to script tags:

```html
<script nonce="<%= generatedNonce %>">
  // This script will execute because its nonce matches the CSP
</script>
```

The nonce must be generated freshly for each page load and must be unpredictable to attackers. In the context of Chrome extensions, you might generate nonces server-side for dynamically rendered pages or in your extension's background service worker when constructing pages programmatically. This approach allows legitimate dynamic script execution while still preventing script injection by attackers who cannot predict or control the nonce value.

For most extension use cases, nonce-based scripts are unnecessary—preferring static scripts with `script-src 'self'` provides stronger security with simpler implementation. However, for extensions that genuinely need to execute dynamically generated code from trusted sources, nonces provide a secure path forward.

## Remote Code Restrictions and Remote Hosting

Manifest V3 imposes strict limitations on loading and executing remote code. Extensions can no longer load arbitrary JavaScript from external URLs at runtime—this change was implemented following incidents where compromised extensions were used to load malicious code from attacker-controlled servers. Understanding these restrictions is essential for architecting your extension correctly.

The fundamental principle is that all code your extension executes must be bundled with the extension package. This means JavaScript files, WebAssembly modules, and any other executable content must be included in your extension at publish time. You cannot load code from external servers and execute it within your extension's context. This restriction provides strong guarantees about what code runs in your extension—it must be reviewed and included in your package.

For extensions that need to communicate with external services, the pattern is to separate data from code. Your extension can fetch data from APIs and use that data within your bundled code, but the code itself must be local. This separation allows you to update your extension's behavior through API changes while still maintaining the security benefits of bundled code. Design your architecture to fetch configuration, content, or data from servers while keeping all executable logic within your extension package.

If you find yourself needing to load external code, consider whether a web-based approach might better serve your use case. Web applications can load code from CDNs and external servers with fewer restrictions, and many extension features can be implemented as web apps with extension integration points rather than as pure extensions.

## CSP Violation Reporting

Understanding when CSP violations occur in your extension is crucial for maintaining security and fixing issues before they become vulnerabilities. Chrome provides mechanisms for detecting and reporting CSP violations, allowing you to monitor your extension's security posture in production.

For extension pages, CSP violations are logged to the Chrome extension debugging console and can be viewed alongside other extension errors. When developing your extension, monitor these logs carefully—violations indicate that your CSP is blocking functionality you may have intended to allow, or they might indicate attempted attacks against your extension.

To implement violation reporting for your own monitoring, you can use the report-uri directive in your CSP:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; report-uri https://your-reporting-endpoint.com/csp-reports"
  }
}
```

When violations occur, Chrome sends JSON reports to your specified endpoint containing details about the violation, including the blocked directive, the blocked resource, and the page where the violation occurred. This information is invaluable for debugging CSP issues and detecting potential security incidents. Implement a reporting endpoint that aggregates these violations and alerts you to patterns that might indicate attacks.

Note that report-uri requires a properly configured HTTPS endpoint, and the reports are sent as POST requests with JSON bodies. For extensions with strict data handling requirements, consider whether third-party violation reporting is appropriate or whether you need to handle violation monitoring through internal logging mechanisms.

## Debugging CSP Errors

CSP errors can be frustrating to debug because they often manifest as silent failures—scripts simply don't execute, styles don't apply, or network requests fail without clear error messages. Understanding how to diagnose CSP issues quickly is essential for efficient extension development.

The first step in debugging CSP errors is enabling detailed logging in Chrome. Navigate to chrome://extensions, enable Developer mode, and then for your extension, ensure "Allow access to file URLs" is checked if you're testing locally. Then open the extension's popup or options page and access DevTools by right-clicking and selecting Inspect. The Console tab will show CSP violations as error messages, typically highlighted in red with clear descriptions of what was blocked and why.

For more detailed information, access the Extension Toolkit in Chrome DevTools by pressing the settings icon in the DevTools corner and enabling "Extension Views" in the Framework listeners. This provides additional context about how your extension's pages are being processed and any CSP-related issues that might not appear in the standard console.

Common CSP error patterns and their solutions include: "Refused to load script from..." indicates you're trying to load a script from an origin not in your script-src directive—either add the origin to your CSP or bundle the script locally. "Refused to execute inline script" means you have inline scripts but haven't explicitly allowed them (and in MV3, you cannot allow them for extension pages)—move your inline code to external files. "Refused to connect to..." shows your extension is trying to make a network request to an origin not in your connect-src—add the API endpoint to your manifest's permissions.

When you encounter persistent CSP issues, systematically review your extension's network requests, external resource loading, and any third-party scripts or libraries you include. Every external resource must be explicitly permitted in your CSP, and every inline script must be moved to an external file.

## Migration from MV2 Relaxed CSP

Many extensions built for Manifest V2 relied on relaxed CSP configurations that are no longer possible in MV3. Migrating these extensions requires careful analysis of what the relaxed CSP was enabling and finding secure alternatives for each use case.

The most common MV2 relaxations included `script-src 'self' 'unsafe-eval'` for extensions using dynamic code evaluation, `'unsafe-inline'` for extensions with significant inline script logic, and external script sources for code loaded at runtime. Each of these relaxations represents a security risk that MV3 correctly eliminates.

For the `unsafe-eval` relaxation, the migration path involves refactoring code to avoid dynamic execution. This often means rewriting template compilation, removing JavaScript evaluation of user input, and redesigning any plugin systems that relied on eval(). The effort is significant but results in much stronger security.

For inline scripts, the migration requires moving all JavaScript from inline script tags to external files and loading them through standard script tags or dynamically. This is typically straightforward but may require restructuring your build process to bundle scripts correctly. The security benefit is substantial—inline scripts are a common injection vector, and eliminating them removes an entire category of potential vulnerabilities.

For extensions that loaded code from external sources, the migration requires either bundling that code with your extension or redesigning your architecture to fetch data rather than code. Where possible, prefer bundling—it provides better security through code review and eliminates the risk of compromised CDN or server-side code being loaded into your extension.

## Real-World Secure Extension Examples

Examining how well-designed extensions implement CSP provides valuable patterns you can apply to your own projects. Several categories of extensions demonstrate best practices that balance functionality with strong security.

Password manager extensions exemplify strict CSP implementation because they handle highly sensitive credentials. These extensions typically use `script-src 'self'` exclusively, bundle all their code, implement Trusted Types for DOM manipulation, and use sandbox pages for any external content rendering. They demonstrate that even complex functionality can be built within strict security constraints.

Productivity extensions that integrate with third-party APIs show the correct pattern for network communication. Rather than loading code from those APIs, they bundle their own code and use the permissions system to declare exactly which origins they connect to. This approach provides transparency about data access while maintaining strong security.

Developer tools extensions demonstrate effective use of sandbox pages. Tools that render Markdown, display syntax-highlighted code, or process user-provided content do so in sandboxed pages that have no access to extension APIs. Communication between the sandbox and main extension happens through carefully controlled message passing, ensuring that potentially compromised content cannot access sensitive APIs or data.

For building your own secure extensions, follow these principles: bundle all executable code, use the strictest possible CSP that still allows your functionality, implement sandbox pages for untrusted content, avoid dynamic code execution entirely, consider Trusted Types for DOM manipulation, and monitor for CSP violations in production. These patterns, consistently applied, provide robust protection against the most common attack vectors affecting Chrome extensions.

---

For more security best practices, see our guide on [Chrome Extension Security Hardening](/chrome-extension-guide/guides/chrome-extension-security-hardening/) and learn about [Chrome Extension Web Request Interception](/chrome-extension-guide/guides/chrome-extension-web-request-interception/) for secure network traffic handling.

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one*
