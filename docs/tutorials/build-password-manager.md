---
layout: default
title: "Chrome Extension Password Manager — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-password-manager/"
---
# Build a Password Manager Extension

## Overview {#overview}
Build a Chrome extension that saves credentials, auto-fills login forms, and generates passwords — all with client-side encryption.

## Manifest {#manifest}
```json
{
  "manifest_version": 3,
  "name": "SecureVault",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab", "contextMenus", "unlimitedStorage", "idle"],
  "action": { "default_popup": "popup.html" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "background": { "service_worker": "background.js" }
}
```

## Encryption Layer {#encryption-layer}
```typescript
// crypto.ts — client-side encryption with Web Crypto API
async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(masterPassword), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, encoder.encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(key: CryptoKey, encoded: string): Promise<string> {
  const data = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ciphertext
  );
  return new TextDecoder().decode(plaintext);
}
```

## Storage with @theluckystrike/webext-storage {#storage-with-theluckystrikewebext-storage}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  encryptedVault: 'string',   // Encrypted JSON of all credentials
  salt: 'string',              // Base64-encoded PBKDF2 salt
  isLocked: 'boolean',
  autoLockMinutes: 'number',
  lastActivity: 'number'
});
const storage = createStorage(schema, 'local');
```

## Messaging with @theluckystrike/webext-messaging {#messaging-with-theluckystrikewebext-messaging}
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  UNLOCK: { request: { masterPassword: string }; response: { success: boolean } };
  LOCK: { request: {}; response: { ok: boolean } };
  GET_CREDENTIALS: { request: { url: string }; response: { entries: Array<{ username: string; password: string }> } };
  SAVE_CREDENTIALS: { request: { url: string; username: string; password: string }; response: { ok: boolean } };
  GENERATE_PASSWORD: { request: { length: number; options: { upper: boolean; lower: boolean; digits: boolean; symbols: boolean } }; response: { password: string } };
  AUTOFILL: { request: { username: string; password: string }; response: { ok: boolean } };
};

const m = createMessenger<Messages>();
```

## Service Worker (background.ts) {#service-worker-backgroundts}
```typescript
let cryptoKey: CryptoKey | null = null;

m.onMessage('UNLOCK', async ({ masterPassword }) => {
  const saltB64 = await storage.get('salt');
  if (!saltB64) {
    // First time — create salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await storage.set('salt', btoa(String.fromCharCode(...salt)));
    cryptoKey = await deriveKey(masterPassword, salt);
    await storage.set('encryptedVault', await encrypt(cryptoKey, '{}'));
    await storage.set('isLocked', false);
    return { success: true };
  }
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  cryptoKey = await deriveKey(masterPassword, salt);
  try {
    const vaultData = await storage.get('encryptedVault');
    await decrypt(cryptoKey, vaultData!); // Test decrypt
    await storage.set('isLocked', false);
    return { success: true };
  } catch {
    cryptoKey = null;
    return { success: false };
  }
});

m.onMessage('GET_CREDENTIALS', async ({ url }) => {
  if (!cryptoKey) return { entries: [] };
  const vaultData = await storage.get('encryptedVault');
  const vault = JSON.parse(await decrypt(cryptoKey, vaultData!));
  const domain = new URL(url).hostname;
  return { entries: vault[domain] || [] };
});

m.onMessage('GENERATE_PASSWORD', async ({ length, options }) => {
  let chars = '';
  if (options.upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.lower) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (options.digits) chars += '0123456789';
  if (options.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const array = crypto.getRandomValues(new Uint8Array(length));
  const password = Array.from(array, b => chars[b % chars.length]).join('');
  return { password };
});
```

## Content Script (content.ts) {#content-script-contentts}
```typescript
// Detect login forms
function findLoginForm(): { usernameInput: HTMLInputElement | null; passwordInput: HTMLInputElement | null } {
  const passwordInput = document.querySelector<HTMLInputElement>('input[type="password"]');
  if (!passwordInput) return { usernameInput: null, passwordInput: null };
  const form = passwordInput.closest('form');
  const usernameInput = form?.querySelector<HTMLInputElement>(
    'input[type="email"], input[type="text"], input[name*="user"], input[name*="email"], input[autocomplete="username"]'
  ) || null;
  return { usernameInput, passwordInput };
}

// Auto-fill on message
m.onMessage('AUTOFILL', async ({ username, password }) => {
  const { usernameInput, passwordInput } = findLoginForm();
  if (usernameInput) {
    usernameInput.value = username;
    usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (passwordInput) {
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  return { ok: true };
});

// Detect form submission to save credentials
document.addEventListener('submit', async (e) => {
  const form = e.target as HTMLFormElement;
  const passwordInput = form.querySelector<HTMLInputElement>('input[type="password"]');
  if (!passwordInput?.value) return;
  const usernameInput = form.querySelector<HTMLInputElement>(
    'input[type="email"], input[type="text"], input[name*="user"]'
  );
  if (usernameInput?.value) {
    m.sendMessage('SAVE_CREDENTIALS', {
      url: location.href,
      username: usernameInput.value,
      password: passwordInput.value
    });
  }
});
```

## Auto-Lock on Idle {#auto-lock-on-idle}
```typescript
// In background.ts
chrome.idle.setDetectionInterval(300); // 5 minutes
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'idle' || state === 'locked') {
    cryptoKey = null;
    await storage.set('isLocked', true);
  }
});
```

## Context Menu for Fill {#context-menu-for-fill}
```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fill-credentials',
    title: 'Fill login credentials',
    contexts: ['page', 'editable']
  });
  chrome.contextMenus.create({
    id: 'generate-password',
    title: 'Generate password',
    contexts: ['editable']
  });
});
```

## Security Best Practices {#security-best-practices}
- Never store master password — only derived key (in memory)
- PBKDF2 with 600k+ iterations
- AES-256-GCM for authenticated encryption
- Auto-lock on idle/screen lock
- Clear `cryptoKey` from memory on lock
- Never transmit credentials to external servers
- Salt per vault (stored alongside encrypted data)

## Cross-References {#cross-references}
- Guide: `docs/guides/security-best-practices.md`
- Permission: `docs/permissions/storage.md`, `docs/permissions/unlimitedStorage.md`
- MV3: `docs/mv3/service-workers.md`
