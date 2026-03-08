---
layout: default
title: "Chrome Extension Security Audit — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Extension Security Audit Guide

## Overview

Security auditing is a critical part of developing Chrome extensions. A systematic approach to reviewing your extension's security posture helps identify vulnerabilities before they reach users. This guide provides a checklist-based review process and covers common vulnerability patterns with their mitigations.

Extensions have a broad attack surface—they execute code in the context of web pages, handle sensitive user data, and often require significant permissions. Regular security audits should be integrated into your development workflow, especially before publishing updates.

The audit process covers six core areas: permissions, content script security, message passing, storage, network requests, and third-party dependencies. Each area presents unique risks that require specific attention.

## Permission Audit

Permissions in `manifest.json` determine what your extension can access. Every permission should be justified by a clear functional requirement.

Review all declared permissions in your manifest file. Ask whether each permission is truly necessary for core functionality. Remove any permissions that are declared but not actively used in your code.

Check for overly broad host permissions. Instead of `<all_urls>` or `*://*/*`, specify exact domains your extension needs to access. For example, if you only need to read data from `example.com`, use `*://example.com/*` rather than blanket access.

Prefer optional permissions where possible. Request permissions dynamically when needed using the `permissions` API rather than declaring them statically. This reduces the initial permission footprint and improves user trust.

Document why each permission is needed. Maintain a comment or documentation file explaining the purpose of each permission. This helps during code reviews and future audits.

```json
{
  "permissions": ["storage", "tabs"],
  "optional_permissions": ["notifications", "bookmarks"]
}
```

## Content Script Security

Content scripts run in the context of web pages and have direct access to the page's DOM. This makes them particularly vulnerable to cross-site scripting (XSS) attacks if not handled carefully.

Never use `innerHTML` with untrusted data. Always use `textContent` or `innerText` when inserting user-generated or page-derived content into the DOM. This prevents XSS attacks through malicious HTML or script injection.

```javascript
// UNSAFE - vulnerable to XSS
element.innerHTML = userInput;

// SAFE - properly escaped
element.textContent = userInput;
```

Validate data received from the page context. Even data that appears to come from your own background script may be intercepted or manipulated by page scripts. Always validate the shape and content of messages before processing.

Review all message handlers for injection risks. Content scripts that handle messages from web pages must treat all incoming data as potentially malicious. Implement strict schema validation for all message payloads.

Be cautious with `eval()` and similar functions. Avoid using `eval()`, `new Function()`, or `setTimeout()` with string arguments in content scripts. These can execute arbitrary code if the input is compromised.

## Message Passing Security

Message passing is the primary communication channel between extension components. All messages must be validated before processing.

Validate all incoming messages. Check that messages have the expected structure, data types, and required fields. Reject messages that don't match your expected schema.

Never use `eval()` or `Function()` with message data. Even if a message comes from a seemingly trusted source, executing code derived from messages creates serious security risks.

Type-check message payloads. Use TypeScript interfaces or runtime type checks to ensure message data conforms to expected types. This prevents type confusion attacks.

Validate sender identity. In background script handlers, verify that `sender.id` matches your extension's ID. This prevents cross-extension attacks where malicious extensions send messages to your handlers.

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender
  if (sender.id !== chrome.runtime.id) {
    return false;
  }
  
  // Validate message structure
  if (!message.type || typeof message.payload !== 'object') {
    return false;
  }
  
  // Process validated message
  handleMessage(message);
});
```

## Storage Security

Extensions often store user preferences, cached data, and sometimes credentials. Proper storage security is essential to protect user data.

Never store secrets in plain text. API keys, authentication tokens, and other secrets should never be stored in `chrome.storage.local` or `chrome.storage.sync` without encryption. Use the Web Crypto API to encrypt sensitive data before storage.

Use Web Crypto API for encryption. The Web Crypto API provides secure cryptographic functions suitable for encrypting stored data. Always use strong algorithms like AES-GCM for encryption.

```javascript
async function encryptData(data, key) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(data)
  );
  
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}
```

Clear sensitive data when not needed. Implement cleanup logic to remove sensitive data from storage when it's no longer required. This reduces the window of exposure if storage is compromised.

Review what data is synced. Data in `chrome.storage.sync` automatically syncs across all user's devices. Ensure you're not accidentally syncing sensitive information that should remain local.

## Network Security

Extensions frequently make network requests to APIs and external services. Secure network practices protect both your extension and your users.

Use HTTPS exclusively. All network requests should use HTTPS to prevent man-in-the-middle attacks. Configure your Content Security Policy to block HTTP requests.

Validate API response schemas. Don't assume API responses have the expected structure. Validate response data before using it to prevent denial-of-service attacks through malformed responses.

Don't embed API keys in client-side code. API keys should be stored securely and retrieved through your own backend when possible. If keys must be client-side, use Chrome's secret storage or encrypted storage.

CSP prevents loading external scripts. Configure a strict Content Security Policy in your manifest to prevent your extension from loading malicious external scripts. Avoid using inline scripts and external script sources.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.example.com"
  }
}
```

## CSP Review

Content Security Policy (CSP) is your first line of defense against XSS and data injection attacks. Review your CSP configuration carefully.

Verify no unsafe-inline or unsafe-eval. These directives significantly weaken your CSP and should never be used. Use non-inline scripts and avoid dynamic code execution.

Check for overly broad connect-src. Limit the domains your extension can connect to only those necessary for functionality. Avoid wildcards when possible.

Review sandbox page CSP if used. If your extension uses sandboxed pages, ensure they have appropriate CSP headers that don't inherit overly permissive policies from parent pages.

## Third-Party Dependencies

Dependencies can introduce vulnerabilities into your extension. Regular auditing helps identify and address security issues.

Audit npm dependencies for vulnerabilities. Run `npm audit` regularly to identify known vulnerabilities in your dependency tree. Address high and critical severity issues promptly.

Minimize dependencies in content scripts. Content scripts have access to the page's DOM and should have minimal dependencies to reduce attack surface. Consider using vanilla JavaScript for content script logic.

Bundle and vendor dependencies. Don't load dependencies from CDN sources in your extension. Bundle all dependencies or vendor them directly to ensure you're not loading code from untrusted sources.

Review dependency permissions. Some npm packages may require network access or other permissions. Ensure dependencies don't request unnecessary capabilities.

## Code Review Checklist

Use this checklist during security reviews to ensure all critical areas are covered:

- [ ] No eval(), new Function(), or innerHTML with untrusted input
- [ ] All messages validated before processing
- [ ] Permissions are minimal and justified
- [ ] No hardcoded secrets or API keys
- [ ] HTTPS for all external requests
- [ ] CSP is strict (no unsafe-inline)
- [ ] Dependencies are up to date and audited
- [ ] User data is encrypted at rest

## Tools

Several tools help automate security auditing for Chrome extensions:

- `npm audit` - Identifies vulnerabilities in npm dependencies
- Chrome DevTools Security panel - Reviews CSP and security headers for extension pages
- ESLint with security plugins - Catches common security issues during development

## Cross-references

For more detailed guidance on specific security topics, refer to:

- [guides/security-best-practices.md](./security-best-practices.md) - Fundamental security principles
- [guides/security-hardening.md](./security-hardening.md) - Advanced hardening techniques
- [reference/csp-reference.md](../reference/csp-reference.md) - CSP configuration reference

## Related Articles

- [Security Hardening](../guides/security-hardening.md)
- [Security Best Practices](../guides/security-best-practices.md)
