---
layout: default
title: "Chrome Extension Password Generator. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-password-generator/"
---
# Build a Password Generator Extension. Full Tutorial

What We're Building {#what-were-building}
- Popup with configurable password options (length, uppercase, lowercase, numbers, symbols)
- Cryptographically secure generation using `crypto.getRandomValues`
- Visual password strength indicator with color-coded bar
- One-click copy to clipboard with `navigator.clipboard`
- Password history stored with `@theluckystrike/webext-storage`
- Content script to auto-fill password fields on web pages
- Keyboard shortcut (`Alt+Shift+P`) to generate a password from anywhere

Prerequisites {#prerequisites}
- Basic Chrome extension knowledge (cross-ref: `docs/guides/extension-architecture.md`)
- Node.js + npm installed
- `npm install @theluckystrike/webext-storage`

---

Step 1: Project Setup and manifest.json {#step-1-project-setup-and-manifestjson}

```bash
mkdir securepass-ext && cd securepass-ext
npm init -y
npm install @theluckystrike/webext-storage
npm install -D typescript
```

```json
{
  "manifest_version": 3,
  "name": "SecurePass Generator",
  "version": "1.0.0",
  "description": "Generate cryptographically secure passwords with one click.",
  "permissions": ["storage", "activeTab", "clipboardWrite"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "commands": {
    "generate-password": {
      "suggested_key": { "default": "Alt+Shift+P", "mac": "Alt+Shift+P" },
      "description": "Generate and fill a password"
    }
  }
}
```

`clipboardWrite` lets us copy passwords programmatically. `activeTab` grants access to the current page when invoked via keyboard shortcut. The content script runs on all pages to detect and fill password fields. The `commands` entry registers `Alt+Shift+P` for quick generation.

---

Step 2: Popup UI with Password Options {#step-2-popup-ui-with-password-options}

Create `popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { width: 320px; padding: 16px; font-family: system-ui, sans-serif; }
    h2 { margin: 0 0 12px; font-size: 16px; }
    .password-display { display: flex; gap: 8px; margin-bottom: 8px; }
    .password-display input {
      flex: 1; font-family: monospace; font-size: 14px;
      padding: 8px; border: 1px solid #ccc; border-radius: 4px;
    }
    .password-display button {
      padding: 8px 12px; border: none; border-radius: 4px;
      background: #4285f4; color: white; cursor: pointer; font-weight: 600;
    }
    .strength-bar { height: 6px; border-radius: 3px; margin-bottom: 4px; background: #eee; overflow: hidden; }
    .strength-bar .fill { height: 100%; transition: width 0.3s, background 0.3s; }
    #strength-label { font-size: 11px; color: #888; margin-bottom: 12px; }
    .option-row {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 8px; font-size: 13px;
    }
    .option-row input[type="range"] { width: 120px; }
    #generate-btn {
      width: 100%; padding: 10px; background: #34a853; color: white;
      border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 600;
    }
    #history { margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px; }
    #history h3 { font-size: 13px; margin: 0 0 8px; color: #666; }
    .history-item {
      font-family: monospace; font-size: 12px; padding: 4px 0;
      color: #333; cursor: pointer; word-break: break-all;
    }
    .history-item:hover { color: #4285f4; }
  </style>
</head>
<body>
  <h2>SecurePass Generator</h2>
  <div class="password-display">
    <input type="text" id="password" readonly />
    <button id="copy-btn">Copy</button>
  </div>
  <div class="strength-bar"><div class="fill" id="strength-fill"></div></div>
  <p id="strength-label"></p>
  <div class="option-row">
    <label>Length: <span id="length-val">16</span></label>
    <input type="range" id="length-slider" min="8" max="64" value="16" />
  </div>
  <div class="option-row"><label>Uppercase (A-Z)</label><input type="checkbox" id="opt-uppercase" checked /></div>
  <div class="option-row"><label>Lowercase (a-z)</label><input type="checkbox" id="opt-lowercase" checked /></div>
  <div class="option-row"><label>Numbers (0-9)</label><input type="checkbox" id="opt-numbers" checked /></div>
  <div class="option-row"><label>Symbols (!@#$...)</label><input type="checkbox" id="opt-symbols" checked /></div>
  <button id="generate-btn">Generate Password</button>
  <div id="history">
    <h3>Recent Passwords</h3>
    <div id="history-list"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

The popup is 320px wide with a monospace password display, a color-coded strength bar, and checkboxes for each character set. The history section at the bottom shows clickable previous passwords.

---

Step 3: Crypto-Secure Password Generation {#step-3-crypto-secure-password-generation}

`crypto.getRandomValues` provides a CSPRNG, unlike `Math.random` which is predictable. This module is shared between the popup and background script.

```typescript
// generator.ts

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
} as const;

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export function generatePassword(options: PasswordOptions): string {
  let charset = '';
  if (options.uppercase) charset += CHARSETS.uppercase;
  if (options.lowercase) charset += CHARSETS.lowercase;
  if (options.numbers) charset += CHARSETS.numbers;
  if (options.symbols) charset += CHARSETS.symbols;

  if (charset.length === 0) {
    throw new Error('At least one character set must be selected');
  }

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < options.length; i++) {
    password += charset[array[i] % charset.length];
  }

  // Guarantee at least one character from each selected set
  const required: string[] = [];
  if (options.uppercase) required.push(secureRandomChar(CHARSETS.uppercase));
  if (options.lowercase) required.push(secureRandomChar(CHARSETS.lowercase));
  if (options.numbers) required.push(secureRandomChar(CHARSETS.numbers));
  if (options.symbols) required.push(secureRandomChar(CHARSETS.symbols));

  const chars = password.split('');
  for (let i = 0; i < required.length; i++) {
    chars[i] = required[i];
  }
  return secureShuffle(chars).join('');
}

function secureRandomChar(charset: string): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return charset[array[0] % charset.length];
}

function secureShuffle(arr: string[]): string[] {
  const shuffled = [...arr];
  const randomValues = new Uint32Array(shuffled.length);
  crypto.getRandomValues(randomValues);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

The guarantee loop replaces the first N characters with one from each required set, then the Fisher-Yates shuffle (using secure randomness) distributes them. For production, consider rejection sampling to eliminate modulo bias. See cross-ref: `docs/guides/security-best-practices.md`.

---

Step 4: Password Strength Indicator {#step-4-password-strength-indicator}

The strength calculation uses entropy estimation: `bits = length * log2(poolSize)`. The pool size is detected from the actual password content, not the configured options.

```typescript
// strength.ts

export interface StrengthResult {
  score: number;   // 0-100
  bits: number;    // entropy in bits
  label: string;   // 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Excellent'
  color: string;   // CSS color for the bar
}

export function calculateStrength(password: string): StrengthResult {
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  const bits = Math.round(password.length * Math.log2(poolSize || 1));

  // Uniqueness bonus: penalize repeated characters
  const uniqueRatio = new Set(password).size / password.length;
  const adjustedBits = Math.round(bits * (0.7 + 0.3 * uniqueRatio));

  let score: number, label: string, color: string;
  if (adjustedBits < 40)  { score = 20;  label = 'Weak';      color = '#ea4335'; }
  else if (adjustedBits < 60)  { score = 40;  label = 'Fair';      color = '#fbbc04'; }
  else if (adjustedBits < 80)  { score = 60;  label = 'Good';      color = '#ffcc00'; }
  else if (adjustedBits < 100) { score = 80;  label = 'Strong';    color = '#34a853'; }
  else                         { score = 100; label = 'Excellent'; color = '#0d652d'; }

  return { score, bits: adjustedBits, label, color };
}
```

| Entropy (bits) | Rating | Color | Bar % |
|----------------|--------|-------|-------|
| < 40 | Weak | Red | 20% |
| 40-59 | Fair | Yellow | 40% |
| 60-79 | Good | Gold | 60% |
| 80-99 | Strong | Green | 80% |
| 100+ | Excellent | Dark green | 100% |

A 16-character password with all types: `16 * log2(94) = 104.8 bits`.

---

Step 5: Clipboard Copy with Visual Feedback {#step-5-clipboard-copy-with-visual-feedback}

Uses `navigator.clipboard.writeText` with a fallback to `document.execCommand('copy')` for older contexts. See cross-ref: `docs/patterns/clipboard-patterns.md`.

```typescript
// clipboard.ts

export async function copyToClipboard(
  text: string,
  button: HTMLButtonElement
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback: select from a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  // Visual feedback
  const original = button.textContent;
  const originalBg = button.style.background;
  button.textContent = 'Copied!';
  button.style.background = '#34a853';
  setTimeout(() => {
    button.textContent = original;
    button.style.background = originalBg;
  }, 1500);
}
```

---

Step 6: Password History with @theluckystrike/webext-storage {#step-6-password-history-with-theluckystrikewebext-storage}

```typescript
// popup.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { generatePassword, PasswordOptions } from './generator';
import { calculateStrength } from './strength';
import { copyToClipboard } from './clipboard';

const schema = defineSchema({
  passwordLength: 'number',
  useUppercase: 'boolean',
  useLowercase: 'boolean',
  useNumbers: 'boolean',
  useSymbols: 'boolean',
  passwordHistory: 'string' // JSON-encoded array of { password, timestamp }
});
const storage = createStorage(schema, 'local');

const MAX_HISTORY = 20;

// DOM references
const passwordInput = document.getElementById('password') as HTMLInputElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const strengthFill = document.getElementById('strength-fill') as HTMLDivElement;
const strengthLabel = document.getElementById('strength-label') as HTMLParagraphElement;
const lengthSlider = document.getElementById('length-slider') as HTMLInputElement;
const lengthVal = document.getElementById('length-val') as HTMLSpanElement;
const historyList = document.getElementById('history-list') as HTMLDivElement;

const checkboxes = {
  uppercase: document.getElementById('opt-uppercase') as HTMLInputElement,
  lowercase: document.getElementById('opt-lowercase') as HTMLInputElement,
  numbers: document.getElementById('opt-numbers') as HTMLInputElement,
  symbols: document.getElementById('opt-symbols') as HTMLInputElement,
};

// --- Restore saved options ---
async function restoreOptions(): Promise<void> {
  const len = await storage.get('passwordLength');
  if (len) { lengthSlider.value = String(len); lengthVal.textContent = String(len); }

  const flags: Array<[string, keyof typeof checkboxes]> = [
    ['useUppercase', 'uppercase'], ['useLowercase', 'lowercase'],
    ['useNumbers', 'numbers'], ['useSymbols', 'symbols']
  ];
  for (const [key, cb] of flags) {
    const val = await storage.get(key as any);
    if (val !== null) checkboxes[cb].checked = val;
  }
}

function getOptions(): PasswordOptions {
  return {
    length: parseInt(lengthSlider.value),
    uppercase: checkboxes.uppercase.checked,
    lowercase: checkboxes.lowercase.checked,
    numbers: checkboxes.numbers.checked,
    symbols: checkboxes.symbols.checked,
  };
}

async function saveOptions(): Promise<void> {
  const opts = getOptions();
  await storage.set('passwordLength', opts.length);
  await storage.set('useUppercase', opts.uppercase);
  await storage.set('useLowercase', opts.lowercase);
  await storage.set('useNumbers', opts.numbers);
  await storage.set('useSymbols', opts.symbols);
}

// --- Generate and display ---
function generate(): string | null {
  try {
    const password = generatePassword(getOptions());
    passwordInput.value = password;

    const strength = calculateStrength(password);
    strengthFill.style.width = `${strength.score}%`;
    strengthFill.style.background = strength.color;
    strengthLabel.textContent = `${strength.label} (${strength.bits} bits)`;
    return password;
  } catch (e: any) {
    passwordInput.value = '';
    strengthLabel.textContent = e.message;
    return null;
  }
}

// --- History management ---
async function addToHistory(password: string): Promise<void> {
  const raw = await storage.get('passwordHistory');
  const history: Array<{ password: string; timestamp: number }> =
    raw ? JSON.parse(raw) : [];

  history.unshift({ password, timestamp: Date.now() });
  if (history.length > MAX_HISTORY) history.pop();
  await storage.set('passwordHistory', JSON.stringify(history));
  renderHistory(history);
}

async function loadHistory(): Promise<void> {
  const raw = await storage.get('passwordHistory');
  const history = raw ? JSON.parse(raw) : [];
  renderHistory(history);
}

function renderHistory(
  history: Array<{ password: string; timestamp: number }>
): void {
  historyList.innerHTML = '';
  for (const entry of history) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.textContent = entry.password;
    div.title = `${new Date(entry.timestamp).toLocaleString()} -- click to copy`;
    div.addEventListener('click', async () => {
      await navigator.clipboard.writeText(entry.password);
      div.style.color = '#34a853';
      setTimeout(() => { div.style.color = ''; }, 800);
    });
    historyList.appendChild(div);
  }
}

// --- Event listeners ---
lengthSlider.addEventListener('input', () => {
  lengthVal.textContent = lengthSlider.value;
  generate();
  saveOptions();
});

Object.values(checkboxes).forEach(cb => {
  cb.addEventListener('change', () => {
    // Prevent unchecking all boxes
    if (!Object.values(checkboxes).some(c => c.checked)) {
      cb.checked = true;
      return;
    }
    generate();
    saveOptions();
  });
});

generateBtn.addEventListener('click', async () => {
  const password = generate();
  if (password) await addToHistory(password);
});

copyBtn.addEventListener('click', () => {
  if (passwordInput.value) copyToClipboard(passwordInput.value, copyBtn);
});

// --- Initialize ---
restoreOptions().then(() => {
  generate();
  loadHistory();
});
```

Options persist across popup opens. History stores up to 20 entries with timestamps. Each history item is clickable to re-copy.

---

Step 7: Auto-Fill Password Fields (Content Script) {#step-7-auto-fill-password-fields-content-script}

The content script detects password fields on web pages and injects a small "Gen" button inside each one. A `MutationObserver` handles dynamically-added fields in SPAs.

```typescript
// content.ts

import { generatePassword, PasswordOptions } from './generator';

const DEFAULT_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

function findPasswordFields(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(
    'input[type="password"], input[autocomplete="new-password"]'
  ));
}

function injectFillButton(field: HTMLInputElement): void {
  if (field.dataset.securepassInjected) return;
  field.dataset.securepassInjected = 'true';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Gen';
  btn.title = 'Generate secure password';
  Object.assign(btn.style, {
    position: 'absolute',
    right: '4px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '11px',
    padding: '3px 8px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    background: '#fff',
    cursor: 'pointer',
    zIndex: '10000',
    fontWeight: '600',
  });

  const wrapper = document.createElement('span');
  Object.assign(wrapper.style, {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    width: field.offsetWidth + 'px',
  });
  field.parentNode?.insertBefore(wrapper, field);
  wrapper.appendChild(field);
  wrapper.appendChild(btn);

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const password = generatePassword(DEFAULT_OPTIONS);
    field.value = password;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));

    // Visual feedback
    btn.textContent = 'Done';
    btn.style.background = '#34a853';
    btn.style.color = '#fff';
    setTimeout(() => {
      btn.textContent = 'Gen';
      btn.style.background = '#fff';
      btn.style.color = '';
    }, 1200);

    try {
      await navigator.clipboard.writeText(password);
    } catch {
      // Clipboard access may be blocked in content script context
    }
  });
}

// Initial scan
findPasswordFields().forEach(injectFillButton);

// Watch for dynamically added password fields
const observer = new MutationObserver(() => {
  findPasswordFields().forEach(injectFillButton);
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from background (keyboard shortcut trigger)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'fill-password') {
    const fields = findPasswordFields();
    if (fields.length > 0) {
      const password = generatePassword(DEFAULT_OPTIONS);
      fields.forEach(field => {
        field.value = password;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
      sendResponse({ filled: true, password });
    } else {
      sendResponse({ filled: false });
    }
  }
  return true; // Keep message channel open for async response
});
```

The `input` and `change` events are dispatched so frameworks like React and Vue detect the programmatic value change.

---

Step 8: Keyboard Shortcut (Background Service Worker) {#step-8-keyboard-shortcut-background-service-worker}

The background script handles the `Alt+Shift+P` shortcut registered in the manifest. It sends a message to the content script to fill any password fields, and copies the generated password to clipboard.

```typescript
// background.ts

chrome.commands.onCommand.addListener(async (command: string) => {
  if (command !== 'generate-password') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'fill-password'
    });

    if (response?.filled && response?.password) {
      // Show a brief toast via injected script
      chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: (pw: string) => {
          navigator.clipboard.writeText(pw);
          const toast = document.createElement('div');
          toast.textContent = 'Password generated and copied!';
          Object.assign(toast.style, {
            position: 'fixed', top: '20px', right: '20px', padding: '12px 20px',
            background: '#34a853', color: '#fff', borderRadius: '6px',
            fontFamily: 'system-ui, sans-serif', fontWeight: '600',
            zIndex: '999999', transition: 'opacity 0.3s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          });
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
          }, 1500);
        },
        args: [response.password]
      });
    }
  } catch {
    // Content script not loaded on this page (chrome://, edge://, etc.)
  }
});
```

Users can customize the shortcut at `chrome://extensions/shortcuts`.

---

Testing {#testing}

1. Load unpacked from `chrome://extensions` with Developer Mode on
2. Click the extension icon -- verify popup shows with options
3. Move the length slider, toggle checkboxes -- confirm password regenerates and strength bar updates
4. Click "Copy" -- paste elsewhere to verify clipboard works
5. Click "Generate Password" several times -- check history section fills
6. Close and reopen the popup -- verify options and history persist
7. Navigate to a login or signup page, confirm "Gen" button appears in password fields
8. Click "Gen" in a password field -- verify value fills and button shows "Done" briefly
9. Press `Alt+Shift+P` on a page with a password field -- verify it fills and shows a toast

What You Learned {#what-you-learned}
- Crypto-secure random generation with `crypto.getRandomValues` and Fisher-Yates shuffle
- Entropy-based password strength estimation
- Clipboard access with `navigator.clipboard` and fallback (cross-ref: `docs/patterns/clipboard-patterns.md`)
- Persisting structured data with `@theluckystrike/webext-storage` and `defineSchema`
- Content scripts that detect and modify page DOM with `MutationObserver`
- Keyboard shortcuts via `chrome.commands` and background service worker
- Security considerations for password handling (cross-ref: `docs/guides/security-best-practices.md`)
-e 

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
