# Building a Password Generator Chrome Extension

A comprehensive guide to building a production-ready Chrome extension for secure password generation with modern web technologies. This extension will demonstrate core Chrome extension patterns including popup UI, background service workers, storage management, clipboard integration, and autofill capabilities.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Manifest Configuration](#manifest-configuration)
- [Project Structure](#project-structure)
- [Core TypeScript Implementation](#core-typescript-implementation)
- [Password Generation Logic](#password-generation-logic)
- [Password Strength Meter](#password-strength-meter)
- [Clipboard Integration](#clipboard-integration)
- [Password History](#password-history)
- [Autofill Integration](#autofill-integration)
- [UI Design and Styling](#ui-design-and-styling)
- [Testing Approach](#testing-approach)
- [Chrome APIs Reference](#chrome-apis-reference)

---

## Architecture Overview

This extension follows the standard Chrome extension architecture with three primary contexts:

1. **Popup** (`popup/`): The main user interface where users generate passwords and configure settings
2. **Background Service Worker** (`background/`): Handles long-running tasks, alarm scheduling for password history cleanup, and cross-context communication
3. **Content Script** (`content/`): Handles autofill functionality on web forms

### Data Flow

```
User Action (Generate) → Popup UI → Background Service Worker → Chrome Storage
                                    ↓
                             Clipboard API
                                    ↓
                             Password History (Storage)
```

The popup communicates with the background service worker for secure password generation to ensure cryptographically secure random values. Generated passwords are stored in Chrome's local storage for history tracking, and the content script can inject passwords into web forms using the autofill feature.

---

## Manifest Configuration

The `manifest.json` defines the extension's capabilities, permissions, and entry points. This configuration uses Manifest V3, the current standard for Chrome extensions.

```json
{
  "manifest_version": 3,
  "name": "SecurePass Generator",
  "version": "1.0.0",
  "description": "Generate secure random passwords with strength analysis and autofill",
  "permissions": [
    "storage",
    "clipboardWrite",
    "contextMenus",
    "alarms",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Permission Rationale

| Permission | Purpose |
|------------|---------|
| `storage` | Persist password history and user preferences |
| `clipboardWrite` | Copy generated passwords to clipboard |
| `contextMenus` | Add right-click menu for quick password generation |
| `alarms` | Schedule periodic history cleanup |
| `activeTab` | Access current tab for autofill operations |
| `scripting` | Inject content script for form autofill |
| `<all_urls>` | Required for autofill on all websites |

---

## Project Structure

```
password-generator/
├── manifest.json
├── tsconfig.json
├── webpack.config.js
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   ├── popup.css
│   │   └── components/
│   │       ├── PasswordDisplay.ts
│   │       ├── PasswordOptions.ts
│   │       ├── StrengthMeter.ts
│   │       └── HistoryPanel.ts
│   ├── background/
│   │   ├── background.ts
│   │   └── passwordGenerator.ts
│   ├── content/
│   │   └── content.ts
│   ├── shared/
│   │   ├── types.ts
│   │   ├── strength.ts
│   │   └── storage.ts
│   └── utils/
│       └── crypto.ts
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── tests/
    ├── passwordGenerator.test.ts
    └── strength.test.ts
```

---

## Core TypeScript Implementation

### Shared Types (`src/shared/types.ts`)

Define TypeScript interfaces for type safety across all extension contexts:

```typescript
export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  customSymbols?: string;
}

export interface GeneratedPassword {
  id: string;
  value: string;
  timestamp: number;
  strength: PasswordStrength;
  options: PasswordOptions;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: 'weak' | 'fair' | 'good' | 'strong' | 'very strong';
  color: string;
  entropy: number;
}

export interface StorageSchema {
  passwordHistory: GeneratedPassword[];
  options: PasswordOptions;
  maxHistory: number;
}

export const DEFAULT_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
  customSymbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};
```

### Password Generation Service (`src/background/passwordGenerator.ts`)

This service handles cryptographically secure password generation in the background service worker:

```typescript
import { PasswordOptions, GeneratedPassword, PasswordStrength } from '../shared/types';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const AMBIGUOUS = 'Il1O0';
const SYMBOLS_DEFAULT = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export class PasswordGenerator {
  private crypto: Crypto;

  constructor() {
    this.crypto = crypto;
  }

  generate(options: PasswordOptions): string {
    let charset = '';
    const required: string[] = [];

    if (options.uppercase) {
      const chars = options.excludeAmbiguous 
        ? UPPERCASE.split('').filter(c => !AMBIGUOUS.includes(c)).join()
        : UPPERCASE;
      charset += chars;
      required.push(chars[Math.floor(this.secureRandom() * chars.length)]);
    }

    if (options.lowercase) {
      const chars = options.excludeAmbiguous 
        ? LOWERCASE.split('').filter(c => !AMBIGUOUS.includes(c)).join()
        : LOWERCASE;
      charset += chars;
      required.push(chars[Math.floor(this.secureRandom() * chars.length)]);
    }

    if (options.numbers) {
      const chars = options.excludeAmbiguous 
        ? NUMBERS.split('').filter(c => !AMBIGUOUS.includes(c)).join()
        : NUMBERS;
      charset += chars;
      required.push(chars[Math.floor(this.secureRandom() * chars.length)]);
    }

    if (options.symbols) {
      const chars = options.customSymbols || SYMBOLS_DEFAULT;
      charset += chars;
      required.push(chars[Math.floor(this.secureRandom() * chars.length)]);
    }

    if (charset.length === 0) {
      throw new Error('At least one character type must be selected');
    }

    // Generate remaining characters
    const remainingLength = options.length - required.length;
    const passwordChars: string[] = [...required];

    for (let i = 0; i < remainingLength; i++) {
      passwordChars.push(charset[Math.floor(this.secureRandom() * charset.length)]);
    }

    // Fisher-Yates shuffle for unbiased randomization
    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = Math.floor(this.secureRandom() * (i + 1));
      [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    return passwordChars.join('');
  }

  private secureRandom(): number {
    const array = new Uint32Array(1);
    this.crypto.getRandomValues(array);
    return array[0] / (0xFFFFFFFF + 1);
  }

  createPasswordRecord(options: PasswordOptions, strength: PasswordStrength): GeneratedPassword {
    return {
      id: crypto.randomUUID(),
      value: this.generate(options),
      timestamp: Date.now(),
      strength,
      options: { ...options }
    };
  }
}

export const passwordGenerator = new PasswordGenerator();
```

---

## Password Strength Meter

### Strength Calculation (`src/shared/strength.ts`)

Implements entropy-based password strength analysis:

```typescript
import { PasswordOptions, PasswordStrength } from './types';

export function calculateStrength(password: string, options: PasswordOptions): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'weak', color: '#dc2626', entropy: 0 };
  }

  let charsetSize = 0;
  if (options.uppercase) charsetSize += 26;
  if (options.lowercase) charsetSize += 26;
  if (options.numbers) charsetSize += 10;
  if (options.symbols) charsetSize += (options.customSymbols?.length || 14);

  // Calculate entropy: H = L * log2(N)
  const entropy = password.length * Math.log2(charsetSize || 1);

  let score: number;
  let label: PasswordStrength['label'];
  let color: string;

  if (entropy < 28) {
    score = 0;
    label = 'weak';
    color = '#dc2626'; // Red
  } else if (entropy < 36) {
    score = 1;
    label = 'fair';
    color = '#f59e0b'; // Orange
  } else if (entropy < 60) {
    score = 2;
    label = 'good';
    color = '#84cc16'; // Lime
  } else if (entropy < 80) {
    score = 3;
    label = 'strong';
    color = '#22c55e'; // Green
  } else {
    score = 4;
    label = 'very strong';
    color = '#10b981'; // Emerald
  }

  return { score, label, color, entropy: Math.round(entropy) };
}

export function getStrengthDescription(label: PasswordStrength['label']): string {
  const descriptions = {
    'weak': 'Easily cracked - avoid using',
    'fair': 'Better but still vulnerable',
    'good': 'Reasonable protection',
    'strong': 'Good protection for most accounts',
    'very strong': 'Excellent protection'
  };
  return descriptions[label];
}
```

---

## Clipboard Integration

### Writing to Clipboard

Modern browsers support the Clipboard API. In Manifest V3, the popup can directly use `navigator.clipboard`, while the background service worker must use an offscreen document:

```typescript
// popup/popup.ts - Direct clipboard write from popup
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

// background/background.ts - Clipboard via offscreen document
export async function copyFromBackground(text: string): Promise<boolean> {
  // Check if offscreen document exists
  const hasDocument = await chrome.offscreen.hasDocument();
  
  if (!hasDocument) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Write generated password to clipboard'
    });
  }

  // Send message to offscreen document
  const response = await chrome.runtime.sendMessage({
    type: 'CLIPBOARD_WRITE',
    text
  });

  return response?.success ?? false;
}
```

### Offscreen Document (`offscreen.html`)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="offscreen.js"></script>
</head>
<body></body>
</html>
```

```typescript
// offscreen.ts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CLIPBOARD_WRITE') {
    navigator.clipboard.writeText(message.text)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
```

---

## Password History

### Storage Management

Use Chrome's storage API to persist password history with automatic cleanup:

```typescript
// background/storage.ts
import { GeneratedPassword, StorageSchema } from '../shared/types';

const STORAGE_KEY = 'passwordHistory';
const MAX_HISTORY = 50;

export async function addToHistory(password: GeneratedPassword): Promise<void> {
  const history = await getHistory();
  history.unshift(password);

  // Trim to max size
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: history });
}

export async function getHistory(): Promise<GeneratedPassword[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

export async function removeFromHistory(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter(p => p.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

// Scheduled cleanup using chrome.alarms
chrome.alarms.create('cleanupHistory', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanupHistory') {
    const history = await getHistory();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = history.filter(p => p.timestamp > thirtyDaysAgo);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  }
});
```

---

## Autofill Integration

### Content Script for Form Detection

The content script detects password fields and provides autofill functionality:

```typescript
// content/content.ts
interface FormField {
  type: 'password' | 'text' | 'email' | 'username';
  element: HTMLInputElement;
  confidence: number;
}

function detectPasswordFields(): FormField[] {
  const fields: FormField[] = [];
  const selectors = [
    'input[type="password"]',
    'input[name*="password" i]',
    'input[id*="password" i]',
    'input[autocomplete*="current-password" i]',
    'input[autocomplete*="new-password" i]'
  ];

  const elements = document.querySelectorAll(selectors.join(', '));

  elements.forEach(el => {
    if (el instanceof HTMLInputElement) {
      const type = el.type === 'password' ? 'password' :
                   el.autocomplete?.includes('password') ? 'password' : 'text';
      fields.push({ type, element: el, confidence: 0.9 });
    }
  });

  return fields;
}

function injectPassword(password: string, field: HTMLInputElement): void {
  // Focus and set value
  field.focus();
  
  // Modern approach
  field.setAttribute('value', password);
  field.value = password;
  
  // Dispatch events to trigger validation
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new Event('blur', { bubbles: true }));

  // For React and other frameworks
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  if (descriptor) {
    const originalSet = descriptor.set;
    descriptor.set = function(value) {
      originalSet.call(this, password);
    };
    Object.defineProperty(field, 'value', descriptor);
    field.value = password;
  }
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'AUTOFILL') {
    const fields = detectPasswordFields();
    const targetField = fields.find(f => f.type === 'password');
    
    if (targetField) {
      injectPassword(message.password, targetField.element);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No password field found' });
    }
  }
  return true;
});
```

### Autofill from Popup

```typescript
// popup/popup.ts
async function autofillPassword(password: string): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id) {
    throw new Error('No active tab');
  }

  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'AUTOFILL',
    password
  });

  if (!response?.success) {
    throw new Error(response?.error || 'Autofill failed');
  }
}
```

---

## UI Design and Styling

### Popup Layout (`popup/popup.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device=width, initial-scale=1.0">
  <title>SecurePass Generator</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>🔐 SecurePass</h1>
    </header>

    <section class="password-display">
      <div class="password-field">
        <input type="text" id="password-output" readonly>
        <button id="copy-btn" title="Copy to clipboard">
          📋
        </button>
        <button id="regenerate-btn" title="Generate new">
          🔄
        </button>
      </div>
      <div id="strength-meter" class="strength-meter">
        <div class="strength-bar"></div>
        <span class="strength-label"></span>
        <span class="strength-entropy"></span>
      </div>
    </section>

    <section class="options">
      <div class="option-row">
        <label for="length-slider">Length: <span id="length-value">16</span></label>
        <input type="range" id="length-slider" min="8" max="64" value="16">
      </div>
      <div class="option-checks">
        <label><input type="checkbox" id="opt-uppercase" checked> ABC</label>
        <label><input type="checkbox" id="opt-lowercase" checked> abc</label>
        <label><input type="checkbox" id="opt-numbers" checked> 123</label>
        <label><input type="checkbox" id="opt-symbols" checked> @#$</label>
        <label><input type="checkbox" id="opt-ambiguous"> 1lO</label>
      </div>
    </section>

    <section class="actions">
      <button id="autofill-btn" class="btn-secondary">Autofill 🔑</button>
    </section>

    <section class="history">
      <div class="history-header">
        <h2>Recent Passwords</h2>
        <button id="clear-history" class="btn-text">Clear</button>
      </div>
      <ul id="history-list" class="history-list"></ul>
    </section>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

### Styling (`popup/popup.css`)

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --accent-color: #3b82f6;
  --success-color: #22c55e;
  --danger-color: #dc2626;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 360px;
  min-height: 480px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.container {
  padding: 16px;
}

.header {
  text-align: center;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
}

.password-display {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.password-field {
  display: flex;
  gap: 8px;
  align-items: center;
}

.password-field input {
  flex: 1;
  padding: 10px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
}

.password-field button {
  padding: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.password-field button:hover {
  background: var(--bg-secondary);
}

.strength-meter {
  margin-top: 12px;
}

.strength-bar {
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.strength-bar::after {
  content: '';
  display: block;
  height: 100%;
  width: var(--strength-width, 0%);
  background: var(--strength-color, var(--danger-color));
  transition: width 0.3s, background 0.3s;
}

.strength-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.options {
  margin-bottom: 16px;
}

.option-row {
  margin-bottom: 12px;
}

.option-row label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
}

.option-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.option-checks label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
}

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn-secondary {
  flex: 1;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary:hover {
  background: var(--border-color);
}

.history {
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-header h2 {
  font-size: 14px;
  font-weight: 500;
}

.btn-text {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.btn-text:hover {
  color: var(--danger-color);
}

.history-list {
  list-style: none;
  max-height: 150px;
  overflow-y: auto;
}

.history-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  font-size: 12px;
  font-family: monospace;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}

.history-list li:hover {
  background: var(--bg-secondary);
}

.history-list .timestamp {
  font-size: 10px;
  color: var(--text-secondary);
  font-family: sans-serif;
}
```

---

## Testing Approach

### Unit Testing Password Generator

```typescript
// tests/passwordGenerator.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordGenerator } from '../src/background/passwordGenerator';

describe('PasswordGenerator', () => {
  let generator: PasswordGenerator;

  beforeEach(() => {
    generator = new PasswordGenerator();
  });

  it('generates password with correct length', () => {
    const password = generator.generate({ 
      length: 20, 
      uppercase: true, 
      lowercase: true, 
      numbers: true, 
      symbols: false,
      excludeAmbiguous: false
    });
    expect(password.length).toBe(20);
  });

  it('includes uppercase when enabled', () => {
    const password = generator.generate({
      length: 100,
      uppercase: true,
      lowercase: false,
      numbers: false,
      symbols: false,
      excludeAmbiguous: false
    });
    expect(password).toMatch(/[A-Z]/);
  });

  it('excludes ambiguous characters when enabled', () => {
    const password = generator.generate({
      length: 100,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: false,
      excludeAmbiguous: true
    });
    expect(password).not.toMatch(/[Il1O0]/);
  });

  it('throws error when no character types selected', () => {
    expect(() => generator.generate({
      length: 16,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
      excludeAmbiguous: false
    })).toThrow();
  });
});
```

### Testing Strength Calculator

```typescript
// tests/strength.test.ts
import { describe, it, expect } from 'vitest';
import { calculateStrength } from '../src/shared/strength';

describe('calculateStrength', () => {
  it('returns weak for short passwords', () => {
    const result = calculateStrength('abc', { 
      length: 3, uppercase: false, lowercase: true, numbers: false, symbols: false, excludeAmbiguous: false 
    });
    expect(result.label).toBe('weak');
  });

  it('returns strong for long complex passwords', () => {
    const result = calculateStrength('Tr0ub4dor&3', { 
      length: 11, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeAmbiguous: false 
    });
    expect(['strong', 'very strong']).toContain(result.label);
  });

  it('calculates entropy correctly', () => {
    const result = calculateStrength('abcd', { 
      length: 4, uppercase: false, lowercase: true, numbers: false, symbols: false, excludeAmbiguous: false 
    });
    // 4 * log2(26) = ~18.8
    expect(result.entropy).toBeGreaterThan(18);
  });
});
```

### Running Tests

```bash
# Install dependencies
npm install vitest @testing-library/dom jsdom -D

# Run tests
npx vitest run

# Watch mode
npx vitest
```

---

## Chrome APIs Reference

| API | Usage |
|-----|-------|
| `chrome.storage` | Persist password history and user options |
| `chrome.clipboard` | Write passwords to system clipboard |
| `chrome.contextMenus` | Right-click menu for quick generation |
| `chrome.alarms` | Schedule history cleanup |
| `chrome.tabs` | Query active tab for autofill |
| `chrome.scripting` | Inject content scripts |
| `chrome.offscreen` | Enable clipboard in service worker |
| `chrome.runtime` | Message passing between contexts |

---

## Next Steps

1. **Add options page**: Allow users to customize default settings
2. **Implement sync**: Use `chrome.storage.sync` for cross-device history
3. **Add encryption**: Encrypt stored passwords with user-provided key
4. **Implement keyboard shortcuts**: Use `chrome.commands` for quick generation
5. **Add analytics**: Track usage patterns (with privacy considerations)
6. **Submit to Web Store**: Follow the publishing guide at `docs/publishing/publishing-guide.md`

---

## Related Guides

- [Extension Architecture Patterns](architecture-patterns.md)
- [Storage Permission](permissions/storage.md)
- [Clipboard Write Permission](permissions/clipboardWrite.md)
- [Context Menus Pattern](patterns/context-menu-patterns.md)
- [Publishing Guide](../publishing/publishing-guide.md)
