---
layout: default
title: "Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3"
description: "Master CSP in Chrome extensions MV3. Covers defaults, sandbox pages, eval alternatives, trusted types, nonce scripts, remote code restrictions, and debugging."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-content-security-policy/"
---

# Chrome Extension Content Security Policy (CSP): Complete Security Guide for MV3

Content Security Policy represents one of the most critical security mechanisms available to Chrome extension developers. With the transition from Manifest V2 to Manifest V3, Google significantly strengthened CSP requirements, eliminating many previously allowed patterns that posed security risks. This comprehensive guide explores every aspect of CSP configuration for modern Chrome extensions, from understanding default behaviors to implementing advanced security patterns that protect your users from common attack vectors.

Understanding CSP is no longer optional for extension developers—the Chrome Web Store review process actively examines CSP configurations, and extensions with inadequate policies face rejection or removal. Beyond compliance, robust CSP implementation protects your users from cross-site scripting attacks, data exfiltration, and malicious code injection that could compromise their browsing experience and sensitive information.

## Understanding Manifest V3 CSP Defaults

Chrome extensions built on Manifest V3 operate with a default Content Security Policy that provides baseline protection while allowing common development patterns. The default policy for extension pages is `script-src 'self' https://ajax.googleapis.com; object-src 'self';` — this configuration permits scripts from the extension's own origin and Google's AJAX CDN while allowing object elements from the extension origin.

The default CSP exists primarily for backward compatibility and developer convenience during initial extension setup. Relying on these defaults without understanding their implications creates security vulnerabilities that sophisticated attackers can exploit. The allowance of `https://ajax.googleapis.com` is particularly concerning — if an attacker manages to compromise Google's CDN or inject malicious code into a commonly-used library, your extension could execute arbitrary JavaScript in your users' browsers.

Modern extension development requires explicit CSP configuration that aligns with your actual requirements. The default policy serves as a starting point, but production extensions should define comprehensive policies that restrict permissions to the minimum necessary for functionality. This approach follows the principle of least privilege — every capability your extension doesn't need should be explicitly denied.

When you specify a custom CSP in your manifest.json, it completely replaces the default policy rather than augmenting it. This behavior surprises many developers who expect custom rules to add to existing restrictions. You must explicitly include all directives your extension requires, or those capabilities will be unavailable. For most extensions, this means crafting a policy that covers script sources, style sources, connect destinations, image sources, font sources, and object sources according to your specific use cases.

## Sandbox Pages for Untrusted Content

Chrome's sandbox pages provide essential isolation for rendering content that cannot be fully trusted. When your extension needs to display user-generated HTML, process Markdown, render templates with user input, or handle content from external sources, doing so in your main extension context exposes all extension APIs and user data to potential compromise. Sandboxed pages run in an isolated environment with no access to extension APIs, creating a protective barrier between untrusted content and sensitive functionality.

Configuring sandbox pages requires explicit declaration in your manifest and separate CSP for sandboxed content:

```json
{
  "sandbox": {
    "pages": ["sandbox.html", "renderer.html", "markdown-viewer.html"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'"
  }
}
```

The sandbox CSP uses the `sandbox` directive to control what capabilities the isolated page receives. The `allow-scripts` keyword is essential — without it, the sandboxed page cannot execute any JavaScript at all, rendering it useless for dynamic content. However, notice the absence of extension API access in this policy — sandboxed pages cannot call chrome.runtime, chrome.storage, or any other extension APIs directly.

Communication between sandboxed pages and your main extension requires the messaging API. The sandboxed page sends messages to your background script or popup, which then performs privileged operations on its behalf. This architecture ensures that even if malicious content compromises the sandbox, it cannot directly access extension APIs or user data without passing through your controlled message handlers.

Popular extensions use sandboxing extensively for features like password manager autofill (rendering untrusted webpage content), email clients (displaying HTML emails), and note-taking extensions (rendering user-created Markdown). The additional development complexity is justified by the significant security improvement — a compromise in rendered content cannot directly access extension storage, credentials, or browser manipulation capabilities.

## Alternatives to eval() and Function() in MV3

Manifest V3 explicitly prohibits `eval()` and related functions like `new Function()` in extension pages by default. This restriction eliminates a common attack vector where attacker-controlled data could be interpreted as executable JavaScript. While this change broke many existing extensions that relied on dynamic code execution, the security improvement is substantial — the vast majority of `eval()` usages represent potential security vulnerabilities rather than necessary functionality.

Modern JavaScript provides numerous alternatives that eliminate the need for dynamic code execution. Template literals, JSON parsing with `JSON.parse()`, and function composition patterns replace most common `eval()` use cases. For extensions that previously used `eval()` to execute user scripts or dynamic plugins, Chrome provides the User Scripts API (available in Manifest V3) that safely executes user-provided code in isolated worlds without access to extension APIs.

When you genuinely need dynamic code execution for legitimate extension functionality, the sandboxed page approach provides a secure alternative. Generate your dynamic code within a sandboxed page where script execution is allowed, then communicate results back to your main extension through message passing. This approach maintains security boundaries while enabling dynamic functionality.

For extensions requiring sophisticated scripting capabilities, consider implementing a domain-specific language or configuration system that interprets structured data rather than executable code. This approach provides flexibility without the risks associated with `eval()`. Many successful extensions have migrated from dynamic execution to structured configuration with improved security postures and no loss of functionality.

## Trusted Types for DOM XSS Prevention

Trusted Types represent an advanced browser security feature that helps prevent DOM-based cross-site scripting attacks by controlling how browser APIs handle potentially dangerous data. When enabled, Trusted Types require that certain sink APIs receive specifically marked "trusted" objects rather than raw strings, preventing attacker-controlled data from being interpreted as executable code.

Implementing Trusted Types in your extension requires adding the appropriate CSP directive and modifying your JavaScript to create trusted objects:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; require-trusted-types-for 'script';"
  }
}
```

With Trusted Types enabled, attempts to assign HTML to innerHTML, document.write(), or other dangerous sinks using raw strings will fail. Instead, you must use the Trusted Types API to create specifically marked objects:

```javascript
// Instead of: element.innerHTML = userInput;
// Use:
const policy = trustedTypes.createPolicy('myPolicy', {
  createHTML: (input) => sanitizeHTML(input)
});
element.innerHTML = policy.createHTML(userInput);
```

The policy function receives raw input and returns sanitized output that the browser treats as trusted. This architecture ensures that even if malicious input passes through your sanitization logic, the browser will not execute it as JavaScript. Many modern frameworks including Angular, React (with appropriate configuration), and Lit automatically generate Trusted Types-compliant code when properly configured.

Adopting Trusted Types requires careful consideration of all DOM manipulation in your extension. Legacy code using innerHTML with user data must be identified and refactored. The investment pays dividends in security — DOM XSS vulnerabilities represent one of the most common and severe extension vulnerabilities, and Trusted Types provide strong protection against entire categories of these attacks.

## Nonce-Based Script Execution

For scenarios requiring dynamic script execution with controlled permissions, the nonce-based approach provides a secure alternative to unsafe-inline scripts. With nonce-based CSP, you include a cryptographically random nonce value in both your CSP header and inline script tags; the browser only executes scripts whose nonce matches the current request, preventing attackers from injecting their own scripts even if they can control page content.

Implementing nonce-based scripts requires server-side generation of unique nonces for each page load:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'nonce-{NONCE}'; object-src 'none';"
  }
}
```

```html
<script nonce="{NONCE}">
  // This script will execute because its nonce matches the CSP
  console.log('Authorized script execution');
</script>
```

The nonce must be generated server-side (or in your extension's server-rendered content) and must be cryptographically random to prevent prediction attacks. Each page load should produce a new nonce value, ensuring that captured nonces cannot be reused in subsequent attacks.

Chrome extensions rarely need nonce-based scripts since they can control their entire page content. However, this technique becomes valuable when integrating third-party widgets, ads, or embedded content that requires script execution. By providing nonce values to trusted third-party scripts while blocking untrusted ones, you maintain security while enabling necessary functionality.

## Remote Code Restrictions in MV3

Manifest V3 dramatically restricted the ability to load and execute remote code, representing one of the most significant security improvements in the new manifest version. Extensions can no longer load arbitrary JavaScript from external URLs and execute it within the extension context. All executable code must be bundled within the extension package itself, eliminating the ability to modify extension behavior after publication.

This restriction prevents several attack scenarios that plagued Manifest V2 extensions. Attackers who compromised extension update servers or CDN infrastructure could inject malicious code into millions of extensions. Similarly, developers who maintained "hooks" for loading remote code (sometimes marketed as "dynamic features" or "cloud configuration") created vulnerabilities that attackers exploited. With MV3's remote code restrictions, even complete compromise of external infrastructure cannot inject executable code into properly configured extensions.

The primary implication is that all JavaScript, CSS, and HTML that your extension uses must be included in the package submitted to the Chrome Web Store. This requirement encourages better bundling practices and eliminates "live reload" development patterns that loaded code from external servers. During development, you can use extension reload mechanisms like Chrome's built-in reload feature or development frameworks that support hot module replacement, but production builds must be entirely self-contained.

Extensions requiring dynamic behavior based on external configuration should fetch data (JSON, configuration objects, rulesets) rather than code. The fetched data can then be processed by bundled JavaScript, providing flexibility without compromising security. This pattern supports features like ad blocking rules, content filters, and feature flags while maintaining the security benefits of bundled code.

## CSP Violation Reporting

Effective CSP implementation requires monitoring for violations that indicate attempted attacks or misconfigurations. Chrome provides the `report-uri` directive (and the newer `report-to` directive) to send violation reports to specified endpoints, enabling security teams to detect and respond to attack attempts in real time.

Configuring violation reporting in your extension:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'; report-uri https://your-reporting-endpoint.com/csp-reports;"
  }
}
```

When CSP violations occur, Chrome sends JSON reports to your specified endpoint containing details about the violation including the blocked resource, the directive that was triggered, and the page that originated the request. These reports are invaluable for security monitoring, identifying misconfigurations during development, and detecting potential attack attempts against your users.

For production extensions, consider implementing a reporting endpoint that aggregates and analyzes CSP violations. Patterns of violations may indicate attempted cross-site scripting attacks, misconfigured CSP that breaks functionality, or legitimate feature requests that require policy updates. The reporting infrastructure also enables compliance documentation and security audits.

## Debugging CSP Errors

CSP errors manifest in various ways depending on the nature of the violation and the browser's configuration. Understanding how to identify and resolve these errors is essential for maintaining both security and functionality.

The Chrome DevTools Console displays CSP violation messages with clear indicators of what was blocked and which directive caused the blocking. Common error patterns include:

**Script blocked by script-src**: This typically occurs when attempting to load external JavaScript libraries from CDNs, loading user scripts, or using dynamic code execution. Resolve by either bundling the required code within the extension or whitelisting specific trusted sources in your CSP.

**Inline script blocked**: Manifest V3 blocks inline scripts by default unless you use nonce-based or hash-based allowances. Move functionality to external script files or implement the appropriate inline execution policy.

**Connection blocked by connect-src**: Extensions attempting to make network requests to unauthorized origins trigger this error. Verify that all API endpoints are explicitly listed in your connect-src directive.

**Object blocked by object-src**: The `object-src 'none'` policy prevents plugin content from loading. If your extension genuinely needs object elements (rare in modern web development), specify appropriate sources, but prefer alternative approaches when possible.

Use the Security panel in Chrome DevTools to inspect the current page's CSP policy and identify any violations that have occurred. The Network panel also indicates blocked requests with a red status and CSP error message in the response details.

## Migration Strategies from MV2 Relaxed CSP

Extensions migrating from Manifest V2 often relied on policies that are no longer permitted in MV3. Common migration challenges include removing `eval()` usage, eliminating remote code loading, and restricting inline script execution. A systematic approach ensures secure migration without breaking functionality.

Begin by auditing your MV2 extension's CSP dependencies. Identify all external script sources, inline script blocks, dynamic code execution patterns, and object/embed elements. For each dependency, determine whether it represents legitimate functionality that requires reimplementation or can be eliminated entirely.

Replace external script dependencies with bundled libraries. Most JavaScript libraries can be downloaded and included directly in your extension package. Tools like webpack, Rollup, or esbuild simplify this process by automatically bundling dependencies. For React, Vue, Angular, and other popular frameworks, official documentation provides guidance for bundling within extension packages.

Address dynamic code execution by refactoring to use safer alternatives. Template systems should process data rather than code. User scripting requirements should use the official User Scripts API. Configuration-driven behavior should interpret structured data through bundled logic rather than executing strings as code.

Test extensively after implementing CSP changes. Violation reports and console errors reveal remaining issues. Consider implementing feature flags that allow temporary CSP relaxation for testing new features, then tightening restrictions before production release.

## Real-World Secure Extension Examples

Examining how successful extensions implement CSP provides practical guidance for your own projects. These patterns represent consensus best practices from extensions that have passed Chrome Web Store review and serve millions of users.

Password managers like Bitwarden and 1Password implement strict CSP that permits only bundled scripts while using sandboxed pages for autofill functionality. Their architectures demonstrate effective use of sandbox isolation for handling untrusted page content while maintaining strong security in their main extension context.

Ad blockers implement CSP that allows their rule-loading mechanisms while blocking script execution from blocked sources. These extensions fetch rule updates (data, not code) and process them through bundled JavaScript, exemplifying the data-versus-code pattern that MV3 enforces.

Productivity extensions that integrate with third-party services implement CSP allowing specific API endpoints while blocking other network requests. This approach enables legitimate functionality while preventing data exfiltration through unauthorized connections.

Implementing these patterns in your extension requires honest assessment of your actual requirements. Many extensions can function with extremely restrictive CSP — `script-src 'self'; object-src 'none';` represents a reasonable starting point for extensions without external dependencies. Only add allowed sources that correspond to genuine functionality, and regularly audit your CSP as your extension evolves.

## Conclusion

Content Security Policy forms the cornerstone of Chrome extension security in the Manifest V3 era. The restrictions that once seemed burdensome — elimination of remote code, restrictions on eval(), blocking of inline scripts — collectively create a much more secure extension ecosystem. By understanding and properly implementing CSP, you protect millions of users from sophisticated attacks while passing Chrome Web Store review requirements.

The investment in robust CSP configuration pays dividends beyond security. Well-designed CSP policies clarify your extension's actual requirements, simplify security audits, and provide documentation of intended functionality. Treat CSP not as a compliance checkbox but as an integral part of your extension's security architecture.

For additional security guidance, explore our [Chrome Extension Security Hardening](/chrome-extension-guide/guides/chrome-extension-security-hardening/) guide covering XSS prevention, secure messaging, and permission minimization. The [Web Request Interception](/chrome-extension-guide/guides/chrome-extension-web-request-interception/) guide provides detailed coverage of network request handling with proper security considerations.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
