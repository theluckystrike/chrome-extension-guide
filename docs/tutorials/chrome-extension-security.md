---
layout: default
title: "Chrome Extension Security Best Practices — Developer Guide"
description: "Learn essential security practices for Chrome extensions including CSP configuration, XSS prevention, secure messaging, and credential storage."
canonical_url: "https://bestchromeextensions.com/tutorials/chrome-extension-security/"
---
# Chrome Extension Security Best Practices

## What You'll Build {#what-youll-build}
- Understand the Chrome extension security threat landscape
- Implement Content Security Policy (CSP) configuration
- Prevent cross-site scripting (XSS) vulnerabilities
- Secure messaging between extension contexts
- Safely store credentials and sensitive data
- Minimize permission usage following the principle of least privilege
- Avoid code injection risks
- Audit third-party dependencies
- Prepare for Chrome Web Store (CWS) review

## Manifest {#manifest}
- permissions: minimal set required
- host_permissions: restricted to necessary domains
- content_security_policy: strict CSP in manifest
- No remote code execution

---

## Step 1: Content Security Policy (CSP) Configuration {#step-1-content-security-policy-csp}

CSP is your first line of defense against XSS and code injection attacks. Chrome Extensions Manifest V3 enforces a strict default CSP.

### Default CSP in MV3

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
```

### Tightening CSP for Your Extension

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src https://api.example.com;"
  }
}
```

### Best Practices for CSP

- **Never use `'unsafe-eval'`** — Blocks `eval()`, `new Function()`, and similar dynamic code execution
- **Never use `'unsafe-inline'`** in scripts — Prevents inline script execution
- **Avoid `'self'` for connect-src** — Explicitly list allowed API endpoints
- **Use `'self'` sparingly** — Only include trusted local resources
- **Separate policies** — Use different CSP for different contexts if needed

```javascript
// ❌ NEVER DO THIS - Dangerous CSP
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src *;"
  }
}

// ✅ SECURE CSP - Your goal
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self'; img-src 'self' data:; connect-src https://api.trusted.com;"
  }
}
```

---

## Step 2: XSS Prevention {#step-2-xss-prevention}

Cross-site scripting (XSS) is the most common vulnerability in extensions. Attackers can inject malicious scripts through user input, web page content, or extension messages.

### Safe DOM Manipulation

Always use safe DOM methods and avoid `innerHTML` with untrusted content:

```javascript
// ❌ DANGEROUS - Vulnerable to XSS
function displayUserName(name) {
  document.getElementById('username').innerHTML = name;
}

// ✅ SAFE - Using textContent
function displayUserName(name) {
  document.getElementById('username').textContent = name;
}

// ✅ SAFE - Using DOM APIs with escaping
function displayUserName(name) {
  const element = document.getElementById('username');
  element.textContent = '';
  element.appendChild(document.createTextNode(name));
}
```

### Sanitizing HTML from Untrusted Sources

When you must render HTML, use a sanitization library:

```javascript
import DOMPurify from 'dompurify';

// ✅ SAFE - Sanitize before rendering
function displayFormattedContent(htmlContent) {
  const clean = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
  document.getElementById('content').innerHTML = clean;
}

// ❌ DANGEROUS - Never trust raw HTML from web pages
function displayFromPage() {
  const pageContent = document.querySelector('.user-input').innerHTML;
  document.getElementById('output').innerHTML = pageContent;
}
```

### Content Script XSS Prevention

Content scripts run in the context of web pages, making them especially vulnerable:

```javascript
// Content script - reading from web page
// ❌ DANGEROUS - Page can manipulate this
function getPageTitle() {
  return document.title; // Page can set title to malicious content
}

// ✅ SAFE - Always sanitize data from pages
function getPageTitle() {
  const title = document.title;
  return DOMPurify.sanitize(title);
}

// ✅ SAFEST - Restrict to specific data types
function getPageTitle() {
  const title = document.title;
  return typeof title === 'string' ? title.slice(0, 200) : '';
}
```

---

## Step 3: Secure Messaging Between Contexts {#step-3-secure-messaging}

Chrome extensions have multiple contexts: background scripts, content scripts, popup pages, and options pages. Secure communication is critical.

### Validating Message Sources

Always validate the sender of messages:

```javascript
// Background script receiving messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ✅ Validate sender has expected properties
  if (!sender.id || sender.id !== chrome.runtime.id) {
    console.error('Message from unknown extension');
    return false;
  }

  // ✅ Validate message structure
  if (!message || typeof message.action !== 'string') {
    console.error('Invalid message format');
    return false;
  }

  // ✅ Check sender context
  if (sender.contextType === chrome.runtime.ContextType.CONTENT_SCRIPT) {
    // Validate content script messages extra carefully
    if (!validateContentScriptMessage(message)) {
      return false;
    }
  }

  // Process valid message
  handleMessage(message);
  return true;
});

function validateContentScriptMessage(message) {
  const allowedActions = ['getPageData', 'scanElement', 'getSelection'];
  return allowedActions.includes(message.action);
}
```

### Type-Safe Messaging Pattern

Use TypeScript interfaces for type-safe messaging:

```typescript
// types/messages.ts
interface BaseMessage {
  action: string;
  timestamp: number;
}

interface SaveBookmarkRequest extends BaseMessage {
  action: 'saveBookmark';
  payload: {
    url: string;
    title: string;
    folder?: string;
  };
}

interface GetBookmarksRequest extends BaseMessage {
  action: 'getBookmarks';
  payload: {
    folder?: string;
    limit?: number;
  };
}

type ExtensionMessage = SaveBookmarkRequest | GetBookmarksRequest;

// Type-safe message handler
function handleMessage(message: ExtensionMessage): void {
  switch (message.action) {
    case 'saveBookmark':
      // TypeScript knows payload has url, title, folder
      saveBookmark(message.payload.url, message.payload.title, message.payload.folder);
      break;
    case 'getBookmarks':
      getBookmarks(message.payload.folder, message.payload.limit);
      break;
    default:
      console.warn('Unknown message action:', message.action);
  }
}
```

### Avoiding Message Spoofing

Never trust messages from content scripts without validation:

```javascript
// ❌ DANGEROUS - Trusting content script blindly
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'deleteAllData') {
    clearAllData(); // Content script could be compromised
    sendResponse({ success: true });
  }
});

// ✅ SAFE - Verify request legitimacy
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'deleteAllData') {
    // Require user confirmation for destructive actions
    chrome.runtime.sendMessage({
      action: 'showConfirmDialog',
      message: 'Are you sure you want to delete all data?'
    }).then(confirmed => {
      if (confirmed) {
        clearAllData();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, reason: 'cancelled' });
      }
    });
    return true; // async response
  }
});
```

---

## Step 4: Safe Storage of Credentials {#step-4-safe-storage-of-credentials}

Never store sensitive credentials in plain text. Use Chrome's identity system and secure storage.

### Using Chrome Identity for OAuth

```javascript
// ✅ SAFE - Use Chrome Identity for authentication
function authenticateUser() {
  chrome.identity.launchWebAuthFlow(
    {
      url: 'https://auth.example.com/oauth/authorize',
      interactive: true
    },
    (redirectUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Auth error:', chrome.runtime.lastError);
        return;
      }
      // Extract token from redirect URL
      const token = new URL(redirectUrl).searchParams.get('access_token');
      // Store token securely
      storeTokenSecurely(token);
    }
  );
}

function storeTokenSecurely(token) {
  // Store in chrome.storage.session - cleared on restart
  chrome.storage.session.set({ authToken: token });
}
```

### Storing Sensitive Data Safely

```javascript
// ✅ SAFE - Use chrome.storage.session for sensitive data
function saveCredentials(credentials) {
  // Session storage is cleared when browser closes
  chrome.storage.session.set({
    apiKey: credentials.apiKey,
    sessionId: credentials.sessionId
  });
}

// ❌ NEVER - Don't use localStorage for sensitive data
function badPractice() {
  localStorage.setItem('apiKey', 'secret-key'); // Accessible to content scripts!
}

// ✅ SAFE - Use chrome.storage.local with encryption
import { encrypt, decrypt } from './crypto-utils';

async function saveSecureData(data) {
  const encrypted = await encrypt(data, getMasterKey());
  await chrome.storage.local.set({ secureData: encrypted });
}

async function getSecureData() {
  const result = await chrome.storage.local.get('secureData');
  if (result.secureData) {
    return await decrypt(result.secureData, getMasterKey());
  }
  return null;
}
```

### Credential Validation Schema

```javascript
// ✅ SAFE - Validate stored data types
const credentialSchema = {
  apiKey: (value) => typeof value === 'string' && value.length > 0,
  expiresAt: (value) => typeof value === 'number' && value > Date.now(),
  userId: (value) => typeof value === 'string'
};

function validateCredentials(data) {
  for (const [key, validator] of Object.entries(credentialSchema)) {
    if (!validator(data[key])) {
      throw new Error(`Invalid credential: ${key}`);
    }
  }
  return true;
}
```

---

## Step 5: Permission Minimization {#step-5-permission-minimization}

Follow the principle of least privilege — only request permissions you actively need.

### Use Optional Permissions

```javascript
// ✅ RECOMMENDED - Request permissions at runtime
async function requestOptionalPermission(permission) {
  const result = await chrome.permissions.request({
    permissions: [permission]
  });
  
  if (result) {
    console.log(`Permission ${permission} granted`);
    // Enable feature that requires this permission
  } else {
    console.log(`Permission ${permission} denied`);
    // Provide fallback or graceful degradation
  }
}

// Check if permission is granted before using
async function useTabsFeature() {
  const hasPermission = await chrome.permissions.contains({
    permissions: ['tabs']
  });
  
  if (hasPermission) {
    const tabs = await chrome.tabs.query({ active: true });
    return tabs;
  } else {
    // Use activeTab instead
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return [tab];
  }
}
```

### Use activeTab Instead of Host Permissions

```json
{
  "permissions": ["activeTab", "storage"],
  "host_permissions": []
}
```

```javascript
// ✅ BETTER - Use activeTab for page access
chrome.action.onClicked.addListener(async (tab) => {
  // activeTab gives temporary access to the current tab
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.title
  });
});
```

### Manifest Permission Strategy

```json
{
  "permissions": [
    "storage",
    "alarms"
  ],
  "optional_permissions": [
    "tabs",
    "bookmarks",
    "history"
  ],
  "host_permissions": [
    "https://api.example.com/*"
  ]
}
```

---

## Step 6: Code Injection Risks {#step-6-code-injection-risks}

Avoid patterns that could allow code injection through your extension.

### Preventing Dynamic Code Execution

```javascript
// ❌ DANGEROUS - Never use eval or similar
function badPatterns() {
  eval('console.log("injected")'); // Blocked by CSP
  new Function('return "injected"')(); // Blocked by CSP
  setTimeout('console.log("injected")', 0); // Blocked by CSP
  document.write('<script>evil()</script>'); // XSS risk
}

// ✅ SAFE - Use direct function calls
function safePatterns() {
  console.log('safe log');
  const fn = () => 'safe';
  setTimeout(() => console.log('safe'), 0);
}
```

### Safe Use of chrome.scripting

```javascript
// ✅ SAFE - Inject known code
async function injectContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content-script.js']
  });
}

// ❌ DANGEROUS - Never inject code from web page
async function badInjection(tabId, pageCode) {
  await chrome.scripting.executeScript({
    target: { tabId },
    // ❌ NEVER DO THIS
    args: [pageCode] // Page controls this!
  });
}

// ✅ SAFE - Inject pre-defined functions
async function injectWithConfig(tabId, config) {
  // Define injection as a function - no user input in code
  const injection = (cfg) => {
    window.myExtension = {
      config: cfg,
      init: () => { /* safe initialization */ }
    };
  };
  
  await chrome.scripting.executeScript({
    target: { tabId },
    func: injection,
    args: [config] // Only pass data, not code
  });
}
```

### Avoiding DOM Clobbering

```javascript
// Content script - be careful with global variables
// ❌ DANGEROUS - Web page can override
window.extensionData = { apiKey: 'secret' };
// Page can do: <div id="extensionData">...</div> to clobber

// ✅ SAFE - Use closures or chrome.storage
(function() {
  const apiKey = 'secret'; // Not on window
  function getApiKey() { return apiKey; }
  // Expose only what you need
  window.getExtensionData = { getApiKey };
})();
```

---

## Step 7: Third-Party Dependency Auditing {#step-7-third-party-dependency-auditing}

Vulnerabilities in dependencies can compromise your entire extension.

### Regular Dependency Auditing

```bash
# Audit dependencies for known vulnerabilities
npm audit

# Audit with fix suggestions
npm audit fix

# Use Snyk for continuous monitoring
npx snyk test

# Check for outdated packages
npm outdated
```

### Locking Dependency Versions

```json
// package.json
{
  "dependencies": {
    "dompurify": "^3.0.0"
  },
  "overrides": {
    "dompurify": "3.0.6"
  }
}
```

### Subresource Integrity for CDN Dependencies

If you must use CDN resources (not recommended for extensions):

```html
<!-- ✅ SAFE - With integrity check -->
<script 
  src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6R9i8G5SiAA1mbqE4F3R4"
  crossorigin="anonymous">
</script>
```

### Bundling Dependencies

```javascript
// webpack.config.js - Bundle all dependencies
module.exports = {
  mode: 'production',
  entry: './src/background.js',
  output: {
    filename: 'background.js',
    path: __dirname + '/dist'
  },
  // External not needed - bundle everything
  externals: {}
};
```

---

## Step 8: Chrome Web Store Review Requirements {#step-8-chrome-web-store-review-requirements}

Prepare for CWS review by following security best practices.

### Common Rejection Reasons

1. **Remote code execution** — Don't load code from external sources
2. **Obfuscated code** — Use readable, non-obfuscated code
3. **Excessive permissions** — Request only necessary permissions
4. **Sensitive data exposure** — Don't store credentials in insecure locations

### Pre-Submission Checklist

```markdown
## Security Checklist

- [ ] No `eval()` or dynamic code execution
- [ ] No remote code or external scripts
- [ ] CSP doesn't use 'unsafe-eval' or 'unsafe-inline'
- [ ] All messages validated
- [ ] User input sanitized
- [ ] No sensitive data in localStorage
- [ ] OAuth tokens stored in chrome.storage.session
- [ ] Permissions minimized
- [ ] No excessive host_permissions
- [ ] Dependencies audited and updated
- [ ] No obfuscated code
- [ ] Privacy policy provided (if collecting data)
```

### Reviewer Notes Template

```javascript
// Include clear comments for reviewers
/**
 * Secure message handler
 * - Validates sender origin before processing
 * - Uses strict allowlist for actions
 * - No sensitive data logged
 */
function handleMessage(message, sender) {
  // Implementation
}
```

---

## Cross-References {#cross-references}

- [Security Best Practices](../guides/security-best-practices.md) — Overview of extension security
- [Security Hardening](../guides/security-hardening.md) — Advanced hardening techniques
- [Extension Security Audit](../guides/extension-security-audit.md) — How to audit your extension

---

## Summary {#summary}

You learned essential Chrome extension security practices:

1. **CSP Configuration** — Set strict Content Security Policy to block XSS and code injection
2. **XSS Prevention** — Use safe DOM methods, sanitize all untrusted input
3. **Secure Messaging** — Validate all messages, use type-safe patterns
4. **Credential Storage** — Use chrome.identity for OAuth, chrome.storage.session for tokens
5. **Permission Minimization** — Request only necessary permissions, use activeTab
6. **Code Injection Prevention** — Never use dynamic code execution, avoid DOM clobbering
7. **Dependency Auditing** — Regularly audit and update dependencies
8. **CWS Review** — Prepare for Chrome Web Store security review

Test your extension security with the Chrome Extension Security Checklist and conduct regular audits.

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
