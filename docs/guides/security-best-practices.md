# Security Best Practices for Chrome Extensions

## Introduction

Chrome extensions operate with elevated privileges compared to regular web applications. They can access sensitive APIs, modify web pages, and store user data. This makes security a paramount concern. Common attack vectors include cross-site scripting (XSS), message spoofing, permission over-reach, and supply chain vulnerabilities.

This guide covers essential security practices aligned with Google's documentation at [developer.chrome.com/docs/extensions/develop/migrate/improve-security](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security).

## 1. Principle of Least Privilege

Request only the minimum permissions necessary. Use `optional_permissions` and request at runtime when needed. Prefer `activeTab` over `<all_urls>`.

```json
{
  "optional_permissions": ["tabs", "bookmarks"],
  "permissions": ["activeTab", "storage"]
}
```

```javascript
async function requestPermission() {
  const result = await chrome.permissions.request({ permissions: ['bookmarks'] });
  if (result.granted) { /* proceed */ }
}
```

## 2. Content Security Policy (CSP)

Manifest V3 enforces strict CSP: `script-src 'self'; object-src 'self'`. Never use `unsafe-eval` or `unsafe-inline`.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
  }
}
```

```javascript
// BAD - XSS vulnerability
element.innerHTML = userInput;
// GOOD - Safe DOM manipulation
element.textContent = userInput;
```

## 3. Avoiding Remotely Hosted Code

Manifest V3 prohibits remote code execution. Bundle all JavaScript locally. Never fetch and execute external code.

```javascript
// BAD
fetch('https://cdn.example.com/script.js').then(code => eval(code));
// GOOD
import { helperFunction } from './utils/helper.js';
```

## 4. Input Sanitization in Content Scripts

Treat all web page data as untrusted. Use DOMPurify for HTML sanitization.

```javascript
import DOMPurify from 'dompurify';

function renderUserContent(htmlContent) {
  const sanitized = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
  document.getElementById('content').innerHTML = sanitized;
}

function validateMessage(message) {
  return message && typeof message === 'object' && typeof message.action === 'string';
}
```

## 5. XSS Prevention in Extension Pages

Use `textContent` instead of `innerHTML`. Avoid `document.write()`, `eval()`, and `new Function()`.

```javascript
function safeRender(userName) {
  const div = document.createElement('div');
  div.textContent = userName;  // Automatically escapes HTML
  document.body.appendChild(div);
}
```

## 6. Secure Storage

Use `chrome.storage.local` for sensitive data. Never store secrets in `chrome.storage.sync`. Use `chrome.identity` for OAuth.

```javascript
const secureStorage = {
  async setSecure(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },
  async getSecure(key) {
    return (await chrome.storage.local.get(key))[key];
  }
};
```

## 7. OAuth Token Security

Use chrome.identity for OAuth flows. Implement token refresh. Clear tokens on logout.

```javascript
async function authenticate() {
  const redirectUri = chrome.identity.getRedirectURL();
  const authUrl = `https://oauth.provider.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token`;
  
  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true
  });
  
  const token = new URL(responseUrl).hash.split('&')[0].split('=')[1];
  await secureStorage.setSecure('oauth_token', token);
  return token;
}
```

## 8. Native Messaging Security

Validate all native messages. Use strict schema validation. Limit host access.

```javascript
class NativeMessenger {
  async sendMessage(message) {
    const allowedTypes = ['ping', 'getData', 'saveData'];
    if (!message?.type || !allowedTypes.includes(message.type)) {
      throw new Error('Invalid message type');
    }
    return chrome.runtime.sendNativeMessage(APP_ID, message);
  }
}
```

## 9. Web Accessible Resources

Restrict access using `matches`. Avoid exposing sensitive files. Use unique filenames.

```json
{
  "web_accessible_resources": [
    { "resources": ["images/*.png"], "matches": ["https://trusted-site.com/*"] }
  ]
}
```

## 10. Cross-Origin Request Security

Validate URL origins. Use HTTPS. Validate all API responses.

```javascript
async function secureFetch(url) {
  const allowedOrigins = ['https://api.example.com'];
  const urlObj = new URL(url);
  
  if (!allowedOrigins.includes(urlObj.origin)) {
    throw new Error('Origin not allowed');
  }
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

## 11. Message Validation

Validate message origins and structure in onMessage handlers.

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  if (!validateMessage(message)) {
    sendResponse({ error: 'Invalid message' });
    return false;
  }
  
  handleMessage(message)
    .then(result => sendResponse({ success: true, data: result }))
    .catch(error => sendResponse({ error: error.message }));
  
  return true;
});
```

## 12. DOM-Based Attack Protection

Avoid dangerous patterns: innerHTML, document.write, eval, setTimeout(string).

```javascript
// Dangerous patterns to avoid:
element.innerHTML = userInput;         // XSS!
document.write(htmlContent);           // Blocked in MV3
eval(userData);                        // Blocked by CSP

// Safe alternatives:
element.textContent = userInput;
const span = document.createElement('span');
span.textContent = userData;
element.appendChild(span);
```

## 13. Safe innerHTML Alternatives

Use DOMPurify for HTML when necessary. Create elements programmatically.

```javascript
import DOMPurify from 'dompurify';

function safeRenderHtml(html) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'ul', 'li'],
    ALLOWED_ATTR: ['class']
  });
  document.getElementById('container').innerHTML = clean;
}

function createSafeElements(userData) {
  const list = document.createElement('ul');
  userData.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.name;
    list.appendChild(li);
  });
  return list;
}
```

## 14. CSP Header Configuration

Configure strict CSP in manifest. Use report-uri for monitoring.

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; img-src 'self' data: https:; connect-src https://api.example.com"
  }
}
```

## 15. Evaluating Third-Party Dependencies

Audit dependencies regularly. Pin versions. Use minimal dependencies.

```bash
npm audit
npm outdated
```

- Pin exact versions in package.json
- Use npm audit fix cautiously
- Review dependencies for abandonment

## 16. Security Review Checklist

- [ ] Only essential permissions requested
- [ ] Optional permissions used where possible
- [ ] CSP configured without unsafe-eval/unsafe-inline
- [ ] All JavaScript bundled locally
- [ ] No eval() or dynamic code execution
- [ ] All messages validated and typed
- [ ] No innerHTML with dynamic content
- [ ] Sensitive data in chrome.storage.local only
- [ ] OAuth tokens handled properly
- [ ] HTTPS for all network requests
- [ ] Dependencies audited (npm audit)
- [ ] Web accessible resources minimized

## 17. Common Vulnerabilities

1. **XSS**: Injecting untrusted content - Use textContent, sanitize HTML
2. **Message Injection**: Forged messages - Validate origins and structure
3. **Privilege Escalation**: Excessive permissions - Use least privilege
4. **Insecure Storage**: Sensitive data exposed - Use chrome.storage.local
5. **Dependency Vulnerabilities**: Compromised libraries - Regular audits

## 18. Google Security Review Process

Google looks for: permission justification, user data handling, security practices, potential abuse prevention.

### Common Rejection Reasons

- Excessive permissions without justification
- Remote code execution capability
- Inadequate input validation
- Storing sensitive data insecurely
- CSP violations (unsafe-inline, unsafe-eval)
- Vulnerable dependencies

### Preparing for Review

1. Document all permission justifications
2. Update privacy policy with data handling
3. Test thoroughly before submission
4. Fix all security vulnerabilities
5. Provide video demonstration

## 19. Code Examples Summary

```javascript
// manifest.json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "storage"],
  "optional_permissions": ["bookmarks"],
  "host_permissions": ["https://api.example.com/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}

// Secure message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !validateMessage(message)) {
    return false;
  }
  handleMessage(message).then(sendResponse).catch(e => sendResponse({ error: e.message }));
  return true;
});

// Safe content script
function displayData(data) {
  document.getElementById('data').textContent = data;
}
```

## 20. References

- [Improve Security - Chrome Extensions](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro)
- [Content Security Policy](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies)

## Conclusion

Security requires defense-in-depth: principle of least privilege, strict CSP, input validation, secure storage, and regular audits. Treat all external data as potentially malicious. Keep dependencies updated. Build secure extensions that protect users.
