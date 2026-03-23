# Building Privacy-Focused Chrome Extensions

## Introduction

Privacy-focused extensions are increasingly in demand as users become more conscious of their digital footprint. Building an extension with privacy at its core requires intentional architectural decisions, not just feature additions. This guide covers the technical implementation of privacy-preserving features while maintaining compliance with Chrome Web Store (CWS) policies and global privacy regulations.

## 1. Privacy by Design Principles

Privacy by design means embedding privacy considerations into every layer of your extension's architecture. The seven foundational principles are:

1. Proactive not Reactive: Anticipate privacy risks before they occur
2. Privacy as Default: Ensure privacy protections are active without user configuration
3. Privacy Embedded in Design: Integrate privacy into the extension's core, not as an add-on
4. Full Functionality: Achieve both privacy and business goals without compromise
5. End-to-End Security: Protect data throughout its entire lifecycle
6. Visibility and Transparency: Operate openly with verifiable practices
7. Respect for User Privacy: Maintain strong privacy defaults with user-centric options

### Implementation Blueprint

```javascript
// manifest.json - Declare privacy-focused permissions
{
  "permissions": [
    "storage",
    "declarativeNetRequest",
    "webRequest",
    "privacy"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

## 2. Data Minimization in Extensions

Data minimization means collecting only the information strictly necessary for your extension's functionality. This principle reduces liability, improves user trust, and often improves performance.

### Practical Strategies

- Audit every data point: Before collecting any information, ask: "Does this serve a core function?"
- Use pseudonymous identifiers: Instead of email addresses, use hashed or generated IDs
- Aggregate before transmitting: Send counts and statistics rather than individual events
- Implement data expiration: Auto-delete data older than necessary retention periods

```javascript
// Example: Minimal data collection pattern
class PrivacyAwareAnalytics {
  constructor() {
    this.anonymousId = this.generateAnonymousId();
  }

  generateAnonymousId() {
    // Create a random ID without tying to personal information
    return crypto.randomUUID();
  }

  // Only track what you need
  trackEvent(eventType, metadata = {}) {
    const minimalData = {
      event: eventType,
      timestamp: Date.now(),
      sessionId: this.anonymousId,
      // Only include functional metadata, never PII
      ...this.sanitizeMetadata(metadata)
    };
    this.sendToAnalytics(minimalData);
  }

  sanitizeMetadata(metadata) {
    const forbiddenKeys = ['email', 'name', 'phone', 'address', 'ip'];
    const sanitized = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (!forbiddenKeys.includes(key.toLowerCase())) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
```

## 3. Local-Only Processing vs Cloud Processing

### Local-First Architecture

The safest approach for user data is processing everything locally. Chrome's storage APIs provide solid local storage that never sends data to external servers:

```javascript
// Use chrome.storage.local for sensitive data
const saveUserPreferences = async (preferences) => {
  await chrome.storage.local.set({ preferences });
};

// Use chrome.storage.sync for cross-device sync (still local until sync)
const saveSyncPreferences = async (preferences) => {
  await chrome.storage.sync.set({ preferences });
};
```

### When Cloud Processing is Necessary

Only send data to external servers when absolutely required (e.g., cloud sync, API-backed features). When you must:

- Encrypt before transmission: Never send plaintext sensitive data
- Use minimal payloads: Send only what's required
- Process on server when possible: Do heavy computation server-side rather than uploading raw data

```javascript
// Secure external communication pattern
class SecureAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.yourservice.com';
  }

  async fetchWithPrivacy(url, data) {
    const encryptedPayload = await this.encryptData(data);
    
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        // Strip referrer for privacy
        'Referrer-Policy': 'no-referrer'
      },
      body: JSON.stringify({ payload: encryptedPayload }),
      // Ensure credentials aren't leaked
      credentials: 'same-origin'
    });

    return response.json();
  }

  async encryptData(data) {
    // Use Web Crypto API for secure encryption
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
```

## 4. Encrypting User Data at Rest

Even data stored locally can be compromised if a device is accessed by unauthorized parties. Encrypt sensitive data using the Web Crypto API:

```javascript
// Encryption utilities using Web Crypto API
class LocalEncryption {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  async generateKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.generateKey(password, salt);
    const encoder = new TextEncoder();
    
    const encrypted = await crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      key,
      encoder.encode(JSON.stringify(data))
    );

    return {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }

  async decrypt(encryptedObj, password) {
    const salt = new Uint8Array(encryptedObj.salt);
    const iv = new Uint8Array(encryptedObj.iv);
    const data = new Uint8Array(encryptedObj.data);
    
    const key = await this.generateKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: this.algorithm, iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
}
```

## 5. Secure Communication with External Servers

### HTTPS Enforcement

Always use HTTPS and validate certificates properly:

```javascript
// Background script - Network request interception
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Block non-HTTPS requests to sensitive domains
    const url = new URL(details.url);
    if (url.protocol === 'http:' && this.isSensitiveDomain(url.hostname)) {
      return { cancel: true };
    }
    return { cancel: false };
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Remove potentially sensitive headers
    const requestHeaders = details.requestHeaders.filter(header => {
      const sensitiveHeaders = ['cookie', 'authorization', 'x-api-key'];
      return !sensitiveHeaders.includes(header.name.toLowerCase());
    });
    return { requestHeaders };
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders']
);
```

### Certificate Pinning

For critical APIs, implement certificate pinning:

```javascript
// Content Security Policy in manifest
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.yourservice.com"
  }
}
```

## 6. Cookie and Tracker Blocking Techniques

Use the Declarative Net Request API to block trackers without requiring extensive permissions:

```javascript
// rules.json for declarative net request
{
  "rules": [
    {
      "id": 1,
      "priority": 1,
      "action": { "type": "block" },
      "condition": {
        "urlFilter": ".*",
        "resourceTypes": ["script"],
        "initiatorDomains": ["tracker-analytics.com"]
      }
    },
    {
      "id": 2,
      "priority": 1,
      "action": { "type": "block" },
      "condition": {
        "urlFilter": ".*\\.doubleclick\\.net",
        "resourceTypes": ["image", "script", "sub_frame"]
      }
    },
    {
      "id": 3,
      "priority": 1,
      "action": { "type": "redirect", "redirect": { "url": "data:text/plain,blocked" } },
      "condition": {
        "urlFilter": ".*facebook\\.com/tr.*",
        "resourceTypes": ["ping", "script"]
      }
    }
  ]
}
```

### Dynamic Rule Management

```javascript
// Manage blocking rules dynamically
class TrackerBlocker {
  constructor() {
    this.blockedDomains = this.loadDefaultBlocklist();
  }

  loadDefaultBlocklist() {
    return [
      'google-analytics.com',
      'googletagmanager.com',
      'facebook.net',
      'doubleclick.net',
      'criteo.com',
      'taboola.com',
      'outbrain.com'
    ];
  }

  async updateRules() {
    const rules = this.blockedDomains.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: `.*${domain.replace('.', '\\.')}.*`,
        resourceTypes: ['script', 'image', 'sub_frame']
      }
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: rules.map(r => r.id)
    });
  }
}
```

## 7. Fingerprint Protection Methods

Browser fingerprinting uses collected browser attributes to create unique identifiers. Protect users by normalizing or randomizing these values:

```javascript
// Content script - Canvas fingerprint protection
(() => {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  // Add noise to canvas fingerprinting
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    if (this.isFingerprinting) {
      const context = this.getContext('2d');
      context.fillStyle = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
      context.fillRect(0, 0, 1, 1);
    }
    return originalToDataURL.apply(this, args);
  };

  // Detect and counter fingerprinting attempts
  const detectFingerprinting = () => {
    const canvas = document.createElement('canvas');
    canvas.isFingerprinting = true;
    return canvas.toDataURL();
  };

  // WebGL fingerprint protection
  const protectWebGL = () => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // Return randomized values for fingerprintable parameters
      if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
        return 'Google Inc. (Generic)';
      }
      if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
        return 'ANGLE (Generic, SwiftShader Direct3D11)';
      }
      return getParameter.apply(this, arguments);
    };
  };

  protectWebGL();
})();
```

### Font Fingerprinting Protection

```javascript
// Limit available fonts to prevent fingerprinting
const fontRestrictions = {
  generic: [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Courier New',
    'Verdana',
    'Georgia',
    'Palatino',
    'Garamond',
    'Bookman',
    'Comic Sans MS',
    'Trebuchet MS',
    'Arial Black',
    'Impact'
  ]
};

// Override CSS font detection
Object.defineProperty(document.fonts, 'check', {
  value: () => true
});
```

## 8. DNS-over-HTTPS Integration

DNS-over-HTTPS (DoH) encrypts DNS queries to prevent eavesdropping and manipulation:

```javascript
// Privacy-aware DNS resolver
class DoHResolver {
  constructor() {
    this.dohProviders = [
      'https://dns.google/resolve',
      'https://dns.quad9.net/resolve',
      'https://cloudflare-dns.com/dns-query'
    ];
  }

  async resolve(domain, type = 'A') {
    const url = new URL(this.dohProviders[0]);
    url.searchParams.set('name', domain);
    url.searchParams.set('type', type);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'accept': 'application/dns-json' }
      });
      return await response.json();
    } catch (error) {
      console.error('DoH resolution failed:', error);
      return null;
    }
  }
}

// Use Chrome's built-in privacy DNS settings
const configurePrivacyDNS = async () => {
  // Check current DNS settings
  const settings = await chrome.privacy.network.webRTCIPHandlingPolicy.get({});
  
  // Configure to use private DNS only
  await chrome.privacy.network.webRTCIPHandlingPolicy.set({
    value: 'default'
  });
};
```

## 9. WebRTC Leak Prevention

WebRTC can expose real IP addresses even behind VPNs. Protect users by controlling WebRTC behavior:

```javascript
// Prevent WebRTC IP leaks
class WebRTCProtection {
  constructor() {
    this.enabled = false;
  }

  async enable() {
    this.enabled = true;
    
    // Use Chrome's built-in WebRTC privacy settings
    await chrome.privacy.network.webRTCIPHandlingPolicy.set({
      value: 'disable_non_proxied_udp'
    });

    // For maximum privacy, use default public interface only
    await chrome.privacy.network.webRTCMultipleRoutingIPs.set({
      value: 'default'
    });
  }

  async disable() {
    this.enabled = false;
    await chrome.privacy.network.webRTCIPHandlingPolicy.set({
      value: 'default'
    });
  }

  // Monitor WebRTC usage in tabs
  setupMonitoring() {
    chrome.webRTCMediaRouteDetected.addListener((details) => {
      if (this.enabled && details.state === 'started') {
        // Log or block WebRTC connections based on policy
        console.log('WebRTC connection detected:', details);
      }
    });
  }
}
```

## 10. Referrer Header Stripping

Control referrer headers to prevent leaking user browsing history to third parties:

```javascript
// Background script - Manage referrer policy
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    let modified = false;
    const requestHeaders = details.requestHeaders.map(header => {
      if (header.name.toLowerCase() === 'referer') {
        // Strip referrer for sensitive destinations
        const destination = new URL(details.url);
        if (this.isThirdParty(destination.hostname)) {
          modified = true;
          return { 
            name: 'Referer', 
            value: destination.origin 
          };
        }
      }
      return header;
    });

    return modified ? { requestHeaders } : {};
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders']
);

// Content script - Set default referrer policy
const setReferrerPolicy = () => {
  // Set on document level
  document.documentElement.setAttribute('referrerpolicy', 'no-referrer');
  
  // Meta tag fallback
  const meta = document.createElement('meta');
  meta.name = 'referrer';
  meta.content = 'no-referrer';
  document.head.appendChild(meta);
};
```

## 11. User-Agent Spoofing Considerations

User-agent spoofing is controversial, it can break websites but is sometimes necessary for privacy. Implement carefully:

```javascript
// User-Agent management (use with caution)
class UserAgentManager {
  constructor() {
    this.defaultUA = navigator.userAgent;
    this.privacyUA = this.createPrivacyUA();
  }

  createPrivacyUA() {
    // Generic Chrome on Windows to reduce fingerprintability
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  applyPrivacyUA() {
    // Note: This only affects your extension's requests
    // Content scripts inherit page's user-agent
    Object.defineProperty(navigator, 'userAgent', {
      get: () => this.privacyUA,
      configurable: false
    });
  }
}
```

## 12. Privacy Policy Requirements for CWS

The Chrome Web Store has strict privacy requirements:

### Mandatory Disclosures

- Data collection declaration: List all data your extension accesses
- Privacy policy URL: Required if collecting ANY user data
- Third-party disclosure: Document all analytics, APIs, and services
- User communications: How you handle data deletion requests

### CWS Privacy Practices Form

Complete the privacy practices disclosure honestly:

| Data Type | Collected? | Purpose | Shared? |
|-----------|------------|---------|---------|
| Browsing activity | Yes/No | Describe | Yes/No |
| Personally identifiable information | Yes/No | Describe | Yes/No |
| Personal communications | Yes/No | Describe | Yes/No |
| Location data | Yes/No | Describe | Yes/No |
| Health data | Yes/No | Describe | Yes/No |

## 13. GDPR Compliance for Extensions

### Key Requirements

- Lawful basis: Identify your legal basis (consent, contract, legitimate interest)
- Consent management: Request consent before collecting non-essential data
- Data subject rights: Implement features for:
  - Right to access (data export)
  - Right to rectification (data editing)
  - Right to erasure (account deletion)
  - Right to portability (data portability)

### Implementation Example

```javascript
// GDPR-compliant data handling
class GDPRCompliance {
  async exportUserData(userId) {
    const data = {
      profile: await this.getProfile(userId),
      preferences: await this.getPreferences(userId),
      activity: await this.getActivity(userId),
      communications: await this.getCommunications(userId)
    };
    
    // Format for portability
    return JSON.stringify(data, null, 2);
  }

  async deleteUserData(userId) {
    // Delete from local storage
    await chrome.storage.local.remove(['user_' + userId]);
    
    // Notify backend to delete
    await this.notifyBackendDeletion(userId);
    
    // Return confirmation
    return { success: true, deletedAt: new Date().toISOString() };
  }

  async notifyBackendDeletion(userId) {
    // Call your API to delete server-side data
    await fetch('/api/user/delete', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }
}
```

## 14. CCPA Compliance Considerations

### California Consumer Privacy Act

- Right to know: What data you collect and how you use it
- Right to delete: Request deletion of personal information
- Right to opt-out: Opt-out of data "sales" (provide even if not selling)
- Non-discrimination: Don't deny service for exercising rights

### Implementation

```javascript
// CCPA compliance utilities
class CCPACompliance {
  constructor() {
    this.doNotSell = false;
  }

  getDoNotSellStatus() {
    return this.doNotSell;
  }

  setDoNotSellPreference(preference) {
    this.doNotSell = preference;
    chrome.storage.local.set({ ccpaDoNotSell: preference });
  }

  async loadPreferences() {
    const result = await chrome.storage.local.get('ccpaDoNotSell');
    this.doNotSell = result.ccpaDoNotSell || false;
  }
}
```

## 15. Transparency Reports and Audit Logs

Maintain trust through transparency:

### What to Document

- Types of data collected
- Frequency of data collection
- Third-party service usage
- Security incidents
- Policy changes

```javascript
// Transparency logging
class TransparencyLogger {
  constructor() {
    this.logs = [];
  }

  log(dataCollection) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'data_access',
      description: dataCollection.description,
      dataTypes: dataCollection.types,
      purpose: dataCollection.purpose
    };
    
    this.logs.push(entry);
    
    // Store locally (in production, consider secure external storage)
    chrome.storage.local.set({ transparencyLogs: this.logs });
  }

  async generateReport() {
    return {
      generatedAt: new Date().toISOString(),
      period: this.getReportingPeriod(),
      totalAccesses: this.logs.length,
      dataTypesAccessed: [...new Set(this.logs.flatMap(l => l.dataTypes))],
      incidents: this.logs.filter(l => l.type === 'incident')
    };
  }
}
```

## 16. Open Source for Trust Building

Open source builds trust by allowing community verification:

### What to Open Source

- Core extension logic
- Encryption implementations
- Data handling code
- Privacy-preserving features

### Benefits

- Security audits by community
- Faster bug discovery
- Demonstrable privacy commitment
- Trust building with privacy-conscious users

### Repository Structure

```
/src
  /privacy
    encryption.ts    # Encryption implementations
    data-handler.ts  # Data processing logic
    tracker-blocker.ts
  /core
    background.ts
    content.ts
/tests
  /privacy           # Security-focused tests
```

## 17. Summary and Best Practices Checklist

- [ ] Implement privacy by design from project start
- [ ] Collect only essential data (data minimization)
- [ ] Process data locally whenever possible
- [ ] Encrypt sensitive data at rest using Web Crypto API
- [ ] Use HTTPS for all external communications
- [ ] Implement tracker and cookie blocking
- [ ] Protect against fingerprinting techniques
- [ ] Enable DNS-over-HTTPS for DNS queries
- [ ] Prevent WebRTC IP leaks
- [ ] Strip or limit referrer headers
- [ ] Handle user-agent carefully
- [ ] Complete CWS privacy practices disclosure
- [ ] Implement GDPR data subject rights
- [ ] Add CCPA opt-out mechanisms
- [ ] Maintain transparency reports
- [ ] Consider open source for trust building

## References

- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/develop)
- [Chrome Web Store Privacy Guidelines](https://developer.chrome.com/docs/webstore/cws-payments-saas)
- [Declarative Net Request API](https://developer.chrome.com/docs/extensions/mv3/reference/declarativeNetRequest)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [GDPR Official Guidelines](https://gdpr.eu/)
- [CCPA California Attorney General](https://oag.ca.gov/privacy/ccpa)
