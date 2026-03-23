Password Manager Patterns in Chrome Extensions

Overview

Password manager extensions provide secure credential storage, form autofill, and password generation capabilities. Building a password manager requires careful attention to security, as these extensions handle sensitive user credentials. This guide covers essential patterns for implementing password management features in Chrome extensions.

Core Architecture

A password manager extension typically consists of several components:

- Background Service Worker: Handles secure storage, encryption, and communication
- Popup UI: Quick access to credentials and password generation
- Content Scripts: Detects login forms and performs autofill
- Options Page: Full vault management interface

Secure Storage Patterns

Never store passwords in plain text. Use `chrome.storage.session` for sensitive in-memory data and implement encryption for persistent storage.

Encrypted Storage Wrapper

```typescript
import { encrypt, decrypt } from './crypto';

interface Credential {
  id: string;
  url: string;
  username: string;
  password: string; // encrypted
  createdAt: number;
  lastUsed?: number;
}

class SecureVault {
  private storage = chrome.storage.local;
  private encryptionKey: CryptoKey | null = null;

  async initialize(masterPassword: string): Promise<void> {
    // Derive key from master password using PBKDF2
    this.encryptionKey = await this.deriveKey(masterPassword);
  }

  private async deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('salt-per-vault'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async saveCredential(credential: Omit<Credential, 'id'>): Promise<string> {
    if (!this.encryptionKey) throw new Error('Vault not unlocked');
    
    const id = crypto.randomUUID();
    const encryptedPassword = await encrypt(
      credential.password,
      this.encryptionKey
    );

    await this.storage.set({
      [`credential_${id}`]: {
        ...credential,
        id,
        password: encryptedPassword,
        createdAt: Date.now()
      }
    });

    return id;
  }

  async getCredential(id: string): Promise<Credential | null> {
    if (!this.encryptionKey) throw new Error('Vault not unlocked');
    
    const result = await this.storage.get(`credential_${id}`);
    const stored = result[`credential_${id}`];
    
    if (!stored) return null;
    
    return {
      ...stored,
      password: await decrypt(stored.password, this.encryptionKey)
    };
  }

  async findCredentialsForUrl(url: string): Promise<Credential[]> {
    const all = await this.storage.get(null);
    const credentials: Credential[] = [];
    
    for (const [key, value] of Object.entries(all)) {
      if (!key.startsWith('credential_')) continue;
      
      const cred = value as Credential;
      if (this.urlMatches(cred.url, url)) {
        credentials.push({
          ...cred,
          password: await decrypt(cred.password, this.encryptionKey!)
        });
      }
    }
    
    return credentials;
  }

  private urlMatches storedUrl: string, currentUrl: string): boolean {
    try {
      const stored = new URL(storedUrl);
      const current = new URL(currentUrl);
      return stored.hostname === current.hostname;
    } catch {
      return false;
    }
  }
}
```

Form Detection and Autofill

Content scripts detect login forms and provide autofill functionality.

Form Detection

```typescript
interface LoginForm {
  usernameField: HTMLInputElement | null;
  passwordField: HTMLInputElement | null;
  form: HTMLFormElement | null;
}

function detectLoginForm(): LoginForm {
  const forms = document.querySelectorAll('form');
  
  for (const form of forms) {
    const inputs = form.querySelectorAll('input');
    const usernameField = Array.from(inputs).find(isUsernameField);
    const passwordField = Array.from(inputs).find(isPasswordField);
    
    if (usernameField && passwordField) {
      return {
        usernameField: usernameField as HTMLInputElement,
        passwordField: passwordField as HTMLInputElement,
        form
      };
    }
  }
  
  return { usernameField: null, passwordField: null, form: null };
}

function isUsernameField(input: Element): boolean {
  const type = (input as HTMLInputElement).type?.toLowerCase();
  const name = input.name?.toLowerCase() ?? '';
  const id = input.id?.toLowerCase() ?? '';
  
  return type === 'text' || type === 'email' || type === 'tel' ||
    name.includes('user') || name.includes('email') || name.includes('login') ||
    id.includes('user') || id.includes('email') || id.includes('login');
}

function isPasswordField(input: Element): boolean {
  const type = (input as HTMLInputElement).type?.toLowerCase();
  const name = input.name?.toLowerCase() ?? '';
  const id = input.id?.toLowerCase() ?? '';
  
  return type === 'password' ||
    name.includes('pass') || id.includes('pass');
}
```

Autofill Implementation

```typescript
class AutofillService {
  private vault: SecureVault;

  constructor(vault: SecureVault) {
    this.vault = vault;
    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'AUTOFILL_REQUEST') {
        this.performAutofill(message.credentialId);
      }
    });
  }

  async performAutofill(credentialId: string): Promise<void> {
    const credential = await this.vault.getCredential(credentialId);
    if (!credential) return;

    const form = detectLoginForm();
    if (!form.usernameField || !form.passwordField) return;

    // Focus and fill username
    form.usernameField.focus();
    form.usernameField.value = credential.username;
    
    // Trigger input events for framework detection
    form.usernameField.dispatchEvent(new InputEvent('input', { bubbles: true }));
    form.usernameField.dispatchEvent(new Event('change', { bubbles: true }));

    // Fill password
    form.passwordField.focus();
    form.passwordField.value = credential.password;
    form.passwordField.dispatchEvent(new InputEvent('input', { bubbles: true }));
    form.passwordField.dispatchEvent(new Event('change', { bubbles: true }));

    // Update last used
    await this.vault.updateLastUsed(credentialId);
  }
}
```

Password Generation

Secure password generation using cryptographic randomness.

```typescript
interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

class PasswordGenerator {
  private readonly AMBIGUOUS = 'l1IO0';
  private readonly UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private readonly LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  private readonly NUMBERS = '0123456789';
  private readonly SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  generate(options: PasswordOptions): string {
    let charset = '';
    let required: string[] = [];

    if (options.includeUppercase) {
      charset += this.filterAmbiguous(options, this.UPPERCASE);
      required.push(this.randomChar(this.UPPERCASE));
    }
    if (options.includeLowercase) {
      charset += this.filterAmbiguous(options, this.LOWERCASE);
      required.push(this.randomChar(this.LOWERCASE));
    }
    if (options.includeNumbers) {
      charset += this.filterAmbiguous(options, this.NUMBERS);
      required.push(this.randomChar(this.NUMBERS));
    }
    if (options.includeSymbols) {
      charset += this.SYMBOLS;
      required.push(this.randomChar(this.SYMBOLS));
    }

    // Generate remaining characters
    const remaining = options.length - required.length;
    const password = required.concat(
      this.randomChars(charset, remaining)
    );

    // Shuffle to avoid predictable positions
    return this.shuffle(password).join('');
  }

  private filterAmbiguous(options: PasswordOptions, chars: string): string {
    if (!options.excludeAmbiguous) return chars;
    return chars.split('').filter(c => !this.AMBIGUOUS.includes(c)).join('');
  }

  private randomChar(charset: string): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return charset[array[0] % charset.length];
  }

  private randomChars(charset: string, length: number): string[] {
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (n) => charset[n % charset.length]);
  }

  private shuffle(array: string[]): string[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
```

Security Best Practices

1. Never store master password: Use it only to derive the encryption key in memory
2. Use AES-GCM encryption: Provides authenticated encryption
3. Implement auto-lock: Lock vault after inactivity timeout
4. Clear sensitive data from memory: Use secure cleanup on unload
5. Validate URLs before autofill: Prevent credential phishing
6. Use Content Security Policy: Restrict script execution
7. Implement clipboard timeout: Clear copied passwords after use

```typescript
class SecurityManager {
  private static readonly AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private static readonly CLIPBOARD_TIMEOUT = 30 * 1000; // 30 seconds
  private lastActivity: number = Date.now();
  private lockCallback: (() => void) | null = null;

  setupAutoLock(callback: () => void): void {
    this.lockCallback = callback;
    
    // Track user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), { passive: true });
    });

    // Check periodically
    setInterval(() => this.checkAutoLock(), 60000);
  }

  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  private checkAutoLock(): void {
    if (!this.lockCallback) return;
    
    if (Date.now() - this.lastActivity > SecurityManager.AUTO_LOCK_TIMEOUT) {
      this.lockCallback();
    }
  }

  async copyToClipboardWithTimeout(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
    
    setTimeout(async () => {
      const current = await navigator.clipboard.readText();
      if (current === text) {
        await navigator.clipboard.writeText('');
      }
    }, SecurityManager.CLIPBOARD_TIMEOUT);
  }
}
```

Cross-Context Communication

Use message passing between service worker and content scripts securely.

```typescript
// Background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CREDENTIALS') {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    // Verify sender is legitimate
    chrome.tabs.get(tabId, async (tab) => {
      const credentials = await vault.findCredentialsForUrl(tab.url);
      sendResponse({ credentials });
    });
    return true; // Keep channel open for async response
  }
});

// Content script
async function requestAutofill(tabId: number): Promise<void> {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'GET_CREDENTIALS'
  });
  
  if (response.credentials?.length > 0) {
    // Show autofill UI
  }
}
```

Conclusion

Building a password manager extension requires a strong focus on security architecture. Use encryption at rest, implement secure key derivation, detect forms accurately, and always validate URLs before autofilling credentials. Follow these patterns to create a secure and user-friendly password management experience.
