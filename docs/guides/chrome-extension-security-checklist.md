---
layout: default
title: "Chrome Extension Security Checklist. Developer Guide"
description: "Secure your Chrome extension with this security guide covering best practices, vulnerability prevention, and audit procedures."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-security-checklist/"
last_modified_at: 2026-01-15
---
Chrome Extension Security Checklist

Use this checklist when developing, auditing, or reviewing a Chrome extension.

Input Validation {#input-validation}
- [ ] Sanitize all user inputs before processing or storage
- [ ] Validate message data received from content scripts
- [ ] Use schema validation libraries (e.g., Zod, Yup) for structured data
- [ ] Never trust data from web pages without validation

XSS Prevention {#xss-prevention}
- [ ] Never use `innerHTML` with untrusted data
- [ ] Use `textContent` or `innerText` for displaying user-controlled strings
- [ ] Use DOM APIs (`document.createElement`, `element.setAttribute`) for dynamic content
- [ ] If HTML rendering is necessary, use a sanitization library (DOMPurify)
- [ ] Avoid `document.write()` entirely. it can introduce XSS vulnerabilities

Content Security Policy (CSP) {#content-security-policy-csp}
- [ ] Use strict CSP in `manifest.json`: `{"content_security_policy": "script-src 'self'; object-src 'self'"}`
- [ ] Never use `unsafe-eval` in CSP
- [ ] Never use `unsafe-inline` for scripts
- [ ] Avoid loading remote scripts. bundle all dependencies locally
- [ ] Cross-ref: `docs/guides/security-best-practices.md`

Permission Minimization {#permission-minimization}
- [ ] Request only the permissions actively used by your extension
- [ ] Use `optional_permissions` for features users can enable/disable
- [ ] Use `activeTab` permission instead of `<all_urls>` when possible
- [ ] Request permissions at runtime rather than install time when appropriate

Secure Storage {#secure-storage}
- [ ] Do not store secrets (API keys, tokens, passwords) in plaintext
- [ ] Use `chrome.storage.local` or `chrome.storage.sync` for extension data
- [ ] Never use `localStorage` for sensitive data. it's accessible to content scripts
- [ ] Use `chrome.identity` for OAuth flows instead of storing credentials

Communication Security {#communication-security}
- [ ] Validate the origin of messages in `onMessage` handlers
- [ ] Verify `sender` identity before processing messages from content scripts
- [ ] Use typed messaging libraries to enforce message schemas
- [ ] Never pass eval-able strings through message passing

Network Security {#network-security}
- [ ] Use HTTPS only for all API calls
- [ ] Implement certificate pinning for critical endpoints
- [ ] Validate server responses before processing
- [ ] Avoid transmitting sensitive data via URL parameters

Content Script Isolation {#content-script-isolation}
- [ ] Use ISOLATED world for extension code execution
- [ ] Treat all data from the page as untrusted
- [ ] Validate and sanitize data before passing to background scripts
- [ ] Avoid sharing DOM access between page scripts and extension code

Third-Party Dependencies {#third-party-dependencies}
- [ ] Audit all npm packages before using them
- [ ] Keep dependencies minimal. fewer dependencies = smaller attack surface
- [ ] Lock dependency versions in `package-lock.json` or `pnpm-lock.yaml`
- [ ] Regularly update dependencies to patch known vulnerabilities
- [ ] Use tools like `npm audit` or Snyk to scan for vulnerabilities

Code Review Checklist {#code-review-checklist}
- [ ] Never use `eval()` or `Function` constructor
- [ ] No remote code execution (no `eval`, `new Function`, dynamic `script` tags)
- [ ] No hardcoded secrets in source code
- [ ] All user inputs are validated and sanitized
- [ ] Cross-ref: `docs/guides/security-hardening.md`

Update Security {#update-security}
- [ ] Verify integrity of updates using Chrome's built-in update mechanism
- [ ] Use CRX format for automatic updates
- [ ] Do not implement custom update mechanisms that bypass Chrome's validation

Supply Chain Security {#supply-chain-security}
- [ ] Enable 2FA on your Chrome Web Store developer account
- [ ] Secure your CI/CD build pipeline
- [ ] Sign extension packages with a trusted certificate
- [ ] Use environment variables for secrets, never commit them
- [ ] Review code before publishing new versions
- [ ] Cross-ref: `docs/guides/extension-security-audit.md`

Quick Reference {#quick-reference}
| Category | Key Action |
|----------|------------|
| XSS | Use `textContent`, not `innerHTML` |
| CSP | No `unsafe-eval`, no `unsafe-inline` |
| Permissions | Request minimum required |
| Storage | Use `chrome.storage`, not `localStorage` |
| Messaging | Validate sender and message schema |
| Dependencies | Audit regularly, lock versions |

Related Articles {#related-articles}

Related Articles

- [Security Best Practices](../guides/security-best-practices.md)
- [Security Hardening](../guides/security-hardening.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
