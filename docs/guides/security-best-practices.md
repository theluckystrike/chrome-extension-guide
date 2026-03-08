---
layout: default
title: "Chrome Extension Security Best Practices — Developer Guide"
description: "Secure your Chrome extension with this security guide covering best practices, vulnerability prevention, and audit procedures."
---
# Security Best Practices for Chrome Extensions

## Introduction
- Extensions have elevated privileges — security matters more than in regular web apps
- Common attack vectors: XSS in extension pages, message spoofing, permission over-reach

## 1. Principle of Least Privilege
- Only request permissions you actively use
- Use `optional_permissions` for features users may not enable
- Use `@theluckystrike/webext-permissions` `requestPermission()` to request at runtime instead of install time
- Use `activeTab` instead of `<all_urls>` whenever possible
- Example: `const result = await requestPermission('tabs'); if (result.granted) { /* proceed */ }`

## 2. Content Security Policy (CSP)
- MV3 default CSP: `script-src 'self'; object-src 'self'`
- Never use `unsafe-eval` or `unsafe-inline`
- No remote code loading — bundle everything locally
- Cross-ref: `docs/mv3/content-security-policy.md`

## 3. Secure Messaging
- Validate message origins in `onMessage` handlers
- Never trust data from content scripts blindly — web pages can manipulate the DOM
- Use `@theluckystrike/webext-messaging` typed messages to enforce request/response contracts:
  ```typescript
  type Messages = {
    saveBookmark: { request: { url: string; title: string }; response: { id: string } };
  };
  const messenger = createMessenger<Messages>();
  // Type system prevents sending malformed messages
  ```
- Handle `MessagingError` for failed communications
- Never pass `eval()`-able strings through messages

## 4. Storage Security
- `chrome.storage.local` is only accessible to your extension — prefer it for sensitive data
- `chrome.storage.sync` syncs across devices — don't store secrets there
- Use `@theluckystrike/webext-storage` schema validation to prevent storing unexpected data types:
  ```typescript
  const schema = defineSchema({ apiKey: 'string', isEnabled: 'boolean' });
  const storage = createStorage(schema, 'local');
  // storage.set('apiKey', 123) — TypeScript error! Must be string
  ```
- Never store plaintext passwords or tokens — use `chrome.identity` for OAuth

## 5. Content Script Safety
- Sanitize all data from web pages before using it
- Use `textContent` instead of `innerHTML` when reading page data
- Never inject user-controlled strings with `innerHTML` or `document.write`
- Use `DOMPurify` if you must insert HTML from untrusted sources

## 6. XSS Prevention in Extension Pages
- Extension popups, options, and background pages are targets for XSS
- Never use `innerHTML` with dynamic content — use DOM APIs or a framework
- Don't use `eval()`, `new Function()`, `setTimeout(string)` — all blocked by MV3 CSP anyway
- Sanitize any data displayed from `chrome.storage` or messages

## 7. Network Request Security
- Always use HTTPS for external requests
- Validate and sanitize API responses before processing
- Use `fetch()` with proper error handling
- Set appropriate `Content-Type` headers

## 8. Update and Supply Chain Security
- Pin dependency versions in package.json
- Audit dependencies with `npm audit`
- Use a bundler to avoid shipping `node_modules`
- Chrome Web Store auto-updates — ensure every version is thoroughly tested

## Security Checklist
- [ ] Only essential permissions requested
- [ ] Optional permissions used where possible
- [ ] No `eval()` or dynamic code execution
- [ ] All messages validated and typed
- [ ] Storage schema enforced
- [ ] No `innerHTML` with dynamic content
- [ ] HTTPS for all network requests
- [ ] Dependencies audited
