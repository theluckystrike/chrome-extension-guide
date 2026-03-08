---
layout: default
title: "Chrome Extension Storage Encryption — Best Practices"
description: "Encrypt data in extension storage for security."
---

# Storage Encryption Pattern

## Overview

Encrypt sensitive data before storing in `chrome.storage` using the Web Crypto API for browser-native cryptography. This pattern provides key derivation from user password to secure sensitive information like passwords, tokens, and API keys.

## Why Encrypt Storage

- **chrome.storage is not encrypted at rest** - Data is stored in plain text and can be accessed locally
- **Other extensions cannot read your storage** - But local machine access is still a vector
- **Required for sensitive data** - Passwords, authentication tokens, personal data, and API keys
- **Compliance requirements** - GDPR, CCPA, and other data protection regulations

## Web Crypto API Approach

Use SubtleCrypto (built into modern browsers, no dependencies):
- **AES-GCM** for authenticated encryption (confidentiality + integrity)
- **PBKDF2** for key derivation from user password  
- **Random IV** per encryption for semantic security

```js
const encoder = new TextEncoder();
const decoder = new TextDecoder();
```

## Key Derivation (PBKDF2)

Derive a key from master password using PBKDF2 with SHA-256:

```js
async function deriveKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  );
}
```

## Encrypt/Decrypt Flow

**Encryption:** User password → PBKDF2 key derivation → AES-GCM encrypt with random IV → Store {iv, ciphertext, salt}

**Decryption:** Retrieve stored bundle → Re-derive key with salt → AES-GCM decrypt with IV → Parse result

```js
async function encrypt(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(data))
  );
  return { iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(encrypted)), salt: Array.from(salt) };
}

async function decrypt(bundle, password) {
  const { iv, ciphertext, salt } = bundle;
  const key = await deriveKey(password, new Uint8Array(salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) }, key, new Uint8Array(ciphertext)
  );
  return JSON.parse(decoder.decode(decrypted));
}
```

## Session Key Caching

Cache derived key in `chrome.storage.session` (memory only, not persisted):

```js
class SecureStorage {
  constructor() { this.key = null; }
  
  async unlock(password) {
    const salt = await this.getSalt();
    this.key = await deriveKey(password, salt);
  }
  
  async setItem(key, value) {
    if (!this.key) throw new Error('Storage locked');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, this.key, encoder.encode(JSON.stringify(value))
    );
    await chrome.storage.local.set({ [key]: { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) } });
  }
  
  async getItem(key) {
    if (!this.key) throw new Error('Storage locked');
    const record = (await chrome.storage.local.get(key))[key];
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(record.iv) }, this.key, new Uint8Array(record.data)
    );
    return JSON.parse(decoder.decode(decrypted));
  }
  
  lock() { this.key = null; }
}
```

## What NOT to Do

- Never store encryption keys in `chrome.storage.local` (use session only)
- Never use custom crypto - use Web Crypto API
- Never use MD5 or SHA-1 for key derivation
- Never hardcode keys or salts in source code
- Never reuse IVs - generate fresh for each operation

## Code Examples

### Master Password Setup

```js
async function setupMasterPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const verified = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify({ verified: true }))
  );
  await chrome.storage.local.set({
    _salt: Array.from(salt),
    _verified: { iv: Array.from(iv), data: Array.from(new Uint8Array(verified)) }
  });
}
```

## Cross-references

- [Security Best Practices](../guides/security-best-practices.md)
- [Security Hardening](../guides/security-hardening.md)
- [Build a Password Manager Tutorial](../tutorials/build-password-manager.md)
- [Storage Patterns Reference](../reference/storage-patterns.md)
