---
layout: default
title: "Chrome Extension WebAuthn — Developer Guide"
description: "Learn Chrome extension webauthn with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/webauthn-extensions/"
---
# WebAuthn & FIDO2 in Chrome Extensions

## Overview

WebAuthn (Web Authentication API) is a W3C standard that enables secure passwordless authentication using public-key cryptography. Chrome Extensions can leverage WebAuthn to implement password managers, passkey managers, and strong authentication flows. This guide covers integrating WebAuthn/FIDO2 in extension contexts.

Key concepts:
- **Public-key credentials**: Cryptographic key pairs bound to a user account and Relying Party (RP)
- **Authenticator**: Hardware or software that creates and stores credentials (Touch ID, YubiKey, Google Password Manager)
- **Relying Party (RP)**: The web application that authenticates users via WebAuthn
- **Passkeys**: WebAuthn credentials that can be synced across devices (Google, Apple, password managers)

## WebAuthn in Extension Pages

Extensions can use the WebAuthn API directly in their HTML pages (popup, options page, tab). The API is available in extension contexts just like regular web pages.

```javascript
// Check if WebAuthn is available
if (PublicKeyCredential.isConditionalMediationAvailable?.()) {
  console.log('Conditional mediation available');
}

if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()) {
  console.log('Platform authenticator (Touch ID/Face ID) available');
}
```

### Registering a Credential

```javascript
async function registerCredential(userId, username) {
  // Generate challenge (should come from your server in production)
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialCreationOptions = {
    challenge: challenge,
    rp: {
      name: 'My Chrome Extension',
      id: window.location.hostname
    },
    user: {
      id: new TextEncoder().encode(userId),
      name: username,
      displayName: username
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },  // ES256
      { type: 'public-key', alg: -257 } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',  // Prefer platform authenticator
      requireResidentKey: true,
      userVerification: 'preferred'
    },
    timeout: 60000,
    attestation: 'none'
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });
    
    // Send credential to your server for storage
    return credential;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}
```

### Authenticating with a Credential

```javascript
async function authenticateUser(accountId) {
  // Challenge from server
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialRequestOptions = {
    challenge: challenge,
    timeout: 60000,
    userVerification: 'preferred',
    rpId: window.location.hostname
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });
    
    // Send assertion to server for verification
    return assertion;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}
```

## Passkey Integration Patterns

Passkeys are WebAuthn credentials synced by the operating system or password manager. They enable passwordless authentication across devices.

### Detecting Passkey Support

```javascript
async function checkPasskeySupport() {
  const results = await Promise.allSettled([
    PublicKeyCredential.isConditionalMediationAvailable(),
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  ]);
  
  return {
    conditionalMediation: results[0].status === 'fulfilled' && results[0].value,
    platformAuthenticator: results[1].status === 'fulfilled' && results[1].value
  };
}
```

### Conditional UI (Auto-fill)

Extensions can use conditional mediation to show passkeys in autofill suggestions:

```javascript
async function setupConditionalFill(userId) {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialRequestOptions = {
    challenge: challenge,
    mediation: 'conditional',  // Enables autofill UI
    rpId: 'example.com',
    allowCredentials: []  // Empty = return all credentials for this RP
  };

  // This will trigger browser's autofill UI
  const credential = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions
  });
  
  return credential;
}
```

### Managing Passkeys

```javascript
class PasskeyManager {
  constructor(storage) {
    this.storage = storage;
  }

  async storePasskey(credentialId, userId, userName) {
    const passkeys = await this.storage.get('passkeys') || {};
    passkeys[credentialId] = {
      userId,
      userName,
      createdAt: Date.now()
    };
    await this.storage.set('passkeys', passkeys);
  }

  async getPasskeysForRP(rpId) {
    const passkeys = await this.storage.get('passkeys') || {};
    // Filter and return credentials for this RP
    return Object.entries(passkeys)
      .filter(([, data]) => data.rpId === rpId)
      .map(([id, data]) => ({
        id: new TextEncoder().encode(id),
        type: 'public-key'
      }));
  }

  async deletePasskey(credentialId) {
    const passkeys = await this.storage.get('passkeys') || {};
    delete passkeys[credentialId];
    await this.storage.set('passkeys', passkeys);
  }
}
```

## Platform vs Roaming Authenticators

WebAuthn supports two types of authenticators:

### Platform Authenticators
- Built into the device (Touch ID, Face ID, Windows Hello, Android fingerprint)
- Cannot be moved between devices
- Faster user experience (no additional hardware)
- Use `authenticatorAttachment: 'platform'` in creation options

```javascript
const platformOnlyOptions = {
  authenticatorSelection: {
    authenticatorAttachment: 'platform',  // Only use platform authenticator
    requireResidentKey: false,
    userVerification: 'required'
  }
};
```

### Roaming Authenticators
- External devices (YubiKey, Solo, Titan Security Key)
- Work across multiple devices
- Higher security (physical presence required)
- Use `authenticatorAttachment: 'cross-platform'`

```javascript
const roamingOptions = {
  authenticatorSelection: {
    authenticatorAttachment: 'cross-platform',  // Prefer external authenticator
    requireResidentKey: true,
    userVerification: 'preferred'
  }
};
```

### Detecting Available Authenticators

```javascript
async function detectAuthenticators() {
  const capabilities = {
    platformAuthenticator: await 
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() ?? false,
    conditionalMediation: await 
      PublicKeyCredential.isConditionalMediationAvailable() ?? false,
    passkeySupport: 'isConditionalMediationAvailable' in PublicKeyCredential
  };
  
  console.log('Authenticator capabilities:', capabilities);
  return capabilities;
}
```

## Extension-Based Credential Management

Extensions can act as credential providers, managing WebAuthn credentials for multiple sites.

### Storing Credentials Securely

```javascript
// Note: There is no chrome.storage.secure API. Extensions don't have
// encrypted storage by default. Use the Web Crypto API to encrypt
// sensitive data before storing it in chrome.storage.local.

class CredentialStore {
  constructor() {
    this.storage = chrome.storage.local;
  }

  // Encrypt credential data before storage
  async encryptData(data, key) {
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }

  // Decrypt credential data
  async decryptData(encrypted, key) {
    const iv = new Uint8Array(encrypted.iv);
    const data = new Uint8Array(encrypted.data);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  async storeCredential(rpId, credential) {
    const credentials = await this.getCredentials();
    credentials[rpId] = credentials[rpId] || [];
    
    credentials[rpId].push({
      credentialId: Array.from(new Uint8Array(credential.rawId)),
      transports: credential.getClientExtensionResults().transports || [],
      createdAt: Date.now()
    });
    
    await this.storage.set({ webauthn_credentials: credentials });
  }

  async getCredentials() {
    const result = await this.storage.get('webauthn_credentials');
    return result.webauthn_credentials || {};
  }
}
```

### Credential Provider Interface

Extensions can provide credentials to websites using the WebAuthn credential management API:

```javascript
// In a content script or extension page
async function provideCredential(rpId) {
  const credentials = await credentialStore.getCredentials();
  const rpCredentials = credentials[rpId] || [];
  
  const allowCredentials = rpCredentials.map(cred => ({
    id: new Uint8Array(cred.credentialId),
    type: 'public-key',
    transports: cred.transports
  }));
  
  if (allowCredentials.length === 0) {
    throw new Error('No credentials found for this site');
  }
  
  return allowCredentials;
}
```

## Security Considerations

### Extension-Specific Security Concerns

1. **Content Script Isolation**: WebAuthn calls must originate from extension pages, not content scripts
2. **Context Verification**: Always verify the calling context

```javascript
// Run in extension context (popup, options page, or background)
// Never rely on content scripts for WebAuthn operations

// Verify execution context
if (window.location.protocol === 'chrome-extension:') {
  // Safe to use WebAuthn
}
```

### Secure Credential Storage

```javascript
// Best practices for credential storage

class SecureCredentialManager {
  constructor() {
    this.storage = chrome.storage.local;
    this.encryptionKey = null;
  }

  async initializeKey() {
    // Generate or retrieve encryption key
    const stored = await this.storage.get('enc_key');
    
    if (stored.enc_key) {
      this.encryptionKey = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(atob(stored.enc_key)),
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );
    } else {
      this.encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      const exported = await crypto.subtle.exportKey('jwk', this.encryptionKey);
      await this.storage.set({ enc_key: btoa(JSON.stringify(exported)) });
    }
  }

  async saveCredential(rpId, credential) {
    const encrypted = await this.encryptData({
      rawId: Array.from(new Uint8Array(credential.rawId)),
      id: Array.from(new Uint8Array(credential.id)),
      response: {
        attestationObject: Array.from(new Uint8Array(credential.response.attestationObject)),
        clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
      }
    }, this.encryptionKey);
    
    await this.storage.set({ [`cred_${rpId}`]: encrypted });
  }
}
```

### Input Validation and Sanitization

```javascript
// Validate all WebAuthn inputs

function validateCredential(credential) {
  if (!credential) {
    throw new Error('Credential is required');
  }
  
  if (!credential.rawId || !(credential.rawId instanceof Uint8Array)) {
    throw new Error('Invalid credential ID');
  }
  
  if (!credential.response) {
    throw new Error('Credential response is missing');
  }
  
  // Verify attestation if required
  if (credential.response.attestationObject) {
    const attestation = new Uint8Array(credential.response.attestationObject);
    // Parse and verify attestation structure
    // In production, validate the attestation certificate chain
  }
  
  return true;
}
```

### Transport Security

```javascript
// Enforce secure transport for credential operations

async function secureRegister(options) {
  // Verify we're in a secure context
  if (!window.isSecureContext) {
    throw new Error('WebAuthn requires a secure context (HTTPS)');
  }
  
  // Check for subdomains that might not be secure
  if (window.location.protocol === 'file:' || 
      window.location.hostname === 'localhost' && 
      !isLocalhostSecure()) {
    throw new Error('WebAuthn requires HTTPS (except for localhost with proper config)');
  }
  
  return navigator.credentials.create(options);
}

function isLocalhostSecure() {
  // Chrome allows localhost with appropriate flags
  return true;
}
```

## Building a Password Manager Extension with WebAuthn

This section provides a complete example of a password manager extension using WebAuthn.

### Extension Structure

```
password-manager/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── background/
│   └── background.js
└── lib/
    ├── webauthn.js
    └── storage.js
```

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "WebAuthn Password Manager",
  "version": "1.0",
  "permissions": [
    "storage"
  ],
  "action": {
    "default_popup": "popup/popup.html"
  },
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### WebAuthn Manager Implementation

```javascript
// lib/webauthn.js

export class WebAuthnManager {
  constructor(storage) {
    this.storage = storage;
  }

  async createCredential(rpId, userId, userName) {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const options = {
      challenge,
      rp: {
        name: 'Password Manager',
        id: rpId
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: userName,
        displayName: userName
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      authenticatorSelection: {
        userVerification: 'required',
        requireResidentKey: true
      },
      timeout: 120000
    };

    const credential = await navigator.credentials.create({ publicKey: options });
    
    // Store credential reference
    await this.storage.storeCredentialRef(rpId, {
      credentialId: Array.from(new Uint8Array(credential.rawId)),
      userName
    });
    
    return credential;
  }

  async authenticate(rpId) {
    const credentials = await this.storage.getCredentialRefs(rpId);
    
    if (!credentials || credentials.length === 0) {
      throw new Error('No credentials found for this site');
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const options = {
      challenge,
      rpId,
      allowCredentials: credentials.map(c => ({
        id: new Uint8Array(c.credentialId),
        type: 'public-key'
      })),
      userVerification: 'required',
      timeout: 120000
    };

    return navigator.credentials.get({ publicKey: options });
  }

  async getCredentialsForSite(rpId) {
    return this.storage.getCredentialRefs(rpId);
  }

  async deleteCredential(rpId, credentialId) {
    return this.storage.removeCredentialRef(rpId, credentialId);
  }
}
```

### Storage Implementation

```javascript
// lib/storage.js

export class CredentialStorage {
  constructor() {
    this.storage = chrome.storage.local;
  }

  async storeCredentialRef(rpId, credential) {
    const data = await this.getAllData();
    if (!data[rpId]) {
      data[rpId] = [];
    }
    
    // Check for duplicates
    const exists = data[rpId].some(
      c => c.credentialId.join() === credential.credentialId.join()
    );
    
    if (!exists) {
      data[rpId].push({
        ...credential,
        createdAt: Date.now()
      });
    }
    
    await this.storage.set({ password_manager_data: data });
  }

  async getCredentialRefs(rpId) {
    const data = await this.getAllData();
    return data[rpId] || [];
  }

  async removeCredentialRef(rpId, credentialId) {
    const data = await this.getAllData();
    if (data[rpId]) {
      data[rpId] = data[rpId].filter(
        c => c.credentialId.join() !== credentialId.join()
      );
      await this.storage.set({ password_manager_data: data });
    }
  }

  async getAllData() {
    const result = await this.storage.get('password_manager_data');
    return result.password_manager_data || {};
  }
}
```

### Popup Implementation

```javascript
// popup/popup.js

import { WebAuthnManager } from '../lib/webauthn.js';
import { CredentialStorage } from '../lib/storage.js';

const storage = new CredentialStorage();
const webauthn = new WebAuthnManager(storage);

document.addEventListener('DOMContentLoaded', async () => {
  const currentTab = await getCurrentTab();
  if (!currentTab) return;
  
  const url = new URL(currentTab.url);
  const rpId = url.hostname;
  
  // Load credentials for this site
  const credentials = await webauthn.getCredentialsForSite(rpId);
  displayCredentials(credentials, rpId);
  
  // Set up register button
  document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    if (!username) {
      showError('Please enter a username');
      return;
    }
    
    try {
      await webauthn.createCredential(rpId, username, username);
      showSuccess('Credential created successfully!');
      refreshCredentials(rpId);
    } catch (error) {
      showError(error.message);
    }
  });
  
  // Set up authenticate button
  document.getElementById('authenticateBtn').addEventListener('click', async () => {
    try {
      const assertion = await webauthn.authenticate(rpId);
      showSuccess('Authentication successful!');
      // Send response to background for processing
      chrome.runtime.sendMessage({
        type: 'AUTHENTICATION_SUCCESS',
        rpId,
        credentialId: Array.from(new Uint8Array(assertion.rawId))
      });
    } catch (error) {
      showError(error.message);
    }
  });
});

function displayCredentials(credentials, rpId) {
  const list = document.getElementById('credentialList');
  const siteName = document.getElementById('siteName');
  
  siteName.textContent = rpId;
  
  if (credentials.length === 0) {
    list.innerHTML = '<p class="no-credentials">No credentials saved for this site</p>';
    return;
  }
  
  list.innerHTML = credentials.map(cred => `
    <div class="credential-item">
      <span>${cred.userName}</span>
      <button class="delete-btn" data-id="${cred.credentialId.join(',')}">Delete</button>
    </div>
  `).join('');
  
  // Set up delete handlers
  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const credentialId = btn.dataset.id.split(',').map(Number);
      await webauthn.deleteCredential(rpId, credentialId);
      refreshCredentials(rpId);
    });
  });
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function showError(message) {
  const el = document.getElementById('message');
  el.textContent = message;
  el.className = 'message error';
}

function showSuccess(message) {
  const el = document.getElementById('message');
  el.textContent = message;
  el.className = 'message success';
}

async function refreshCredentials(rpId) {
  const credentials = await webauthn.getCredentialsForSite(rpId);
  displayCredentials(credentials, rpId);
}
```

## Testing WebAuthn Extensions

Testing WebAuthn in extensions requires special setup:

### Using Virtual Authenticators

```javascript
// In tests, use Chrome DevTools Protocol to simulate authenticators

async function setupVirtualAuthenticator() {
  const client = await chrome.debugger.attach({ tabId: targetTabId }, '1.3');
  
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true
    }
  });
}
```

### Mock WebAuthn for Unit Tests

```javascript
// Test utilities for mocking WebAuthn

export function mockWebAuthn() {
  const mockCredential = {
    id: new Uint8Array([1, 2, 3, 4]),
    rawId: new Uint8Array([1, 2, 3, 4]),
    type: 'public-key',
    response: {
      clientDataJSON: new Uint8Array([123]),
      attestationObject: new Uint8Array([123])
    },
    getClientExtensionResults: () => ({})
  };

  global.navigator = global.navigator || {};
  global.navigator.credentials = {
    create: jest.fn().mockResolvedValue(mockCredential),
    get: jest.fn().mockResolvedValue(mockCredential)
  };

  global.PublicKeyCredential = class {
    static isUserVerifyingPlatformAuthenticatorAvailable = jest.fn().mockResolvedValue(true);
    static isConditionalMediationAvailable = jest.fn().mockResolvedValue(true);
  };
}
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebAuthn Level 1 | 67+ | 60+ | 14+ | 18+ |
| WebAuthn Level 2 | 120+ | 119+ | 16+ | 120+ |
| Passkeys (synced) | 108+ | 122+ | 16+ | 108+ |
| Conditional Mediation | 108+ | 122+ | 16+ | 108+ |
| Platform Authenticator | 67+ | 60+ | 14+ | 18+ |

## Conclusion

WebAuthn provides powerful passwordless authentication for Chrome Extensions. Key takeaways:

1. **Use platform authenticators** when possible for better UX
2. **Implement proper credential storage** with encryption
3. **Support both registration and authentication** flows
4. **Handle errors gracefully** and provide clear user feedback
5. **Test with virtual authenticators** during development
6. **Follow security best practices** for credential handling

For more information, see:
- [WebAuthn W3C Specification](https://www.w3.org/TR/webauthn/)
- [Chrome Web Authentication API](https://developer.chrome.com/docs/web-platform/webauthn)
- [FIDO Alliance Standards](https://fidoalliance.org/specifications/)

## Related Articles

- [OAuth Identity](../patterns/oauth-identity.md)
- [Security Audit](../guides/extension-security-audit.md)
