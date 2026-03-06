# Build a Password Generator Extension

Build a Chrome extension that generates cryptographically secure passwords with customizable options, a strength indicator, history tracking, and context menu integration. Uses **@theluckystrike/webext-storage** for persistent settings and history.

## Prerequisites

- Chrome 116+ with Developer Mode enabled
- Node.js 18+ and npm
- Familiarity with HTML, CSS, JavaScript, and Chrome extension basics

---

## Step 1: Manifest and Project Setup

```bash
mkdir password-generator-ext && cd password-generator-ext
npm init -y
npm install @theluckystrike/webext-storage
```

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Password Generator",
  "version": "1.0.0",
  "description": "Generate strong, cryptographically secure passwords instantly.",
  "permissions": ["storage", "contextMenus", "clipboardWrite", "activeTab"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  }],
  "options_ui": { "page": "options/options.html", "open_in_tab": false },
  "commands": {
    "generate-password": {
      "suggested_key": { "default": "Alt+Shift+P", "mac": "Alt+Shift+P" },
      "description": "Generate and copy a password"
    }
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

`contextMenus` adds a right-click generate option. `clipboardWrite` enables copying from the background context. `activeTab` grants temporary page access on user interaction. `commands` registers the keyboard shortcut.

---

## Step 2: Popup UI

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Password Generator</h1>
    <div class="password-display">
      <input type="text" id="password-output" readonly>
      <button id="copy-btn" title="Copy to clipboard">Copy</button>
    </div>
    <div class="strength-bar"><div id="strength-fill"></div></div>
    <p id="strength-label">Generate a password</p>
    <div class="controls">
      <label>Length: <span id="length-value">16</span>
        <input type="range" id="length-slider" min="8" max="64" value="16">
      </label>
      <label><input type="checkbox" id="opt-uppercase" checked> Uppercase (A-Z)</label>
      <label><input type="checkbox" id="opt-lowercase" checked> Lowercase (a-z)</label>
      <label><input type="checkbox" id="opt-numbers" checked> Numbers (0-9)</label>
      <label><input type="checkbox" id="opt-symbols" checked> Symbols (!@#$...)</label>
    </div>
    <button id="generate-btn">Generate Password</button>
    <details class="history-section">
      <summary>History (<span id="history-count">0</span>)</summary>
      <ul id="history-list"></ul>
    </details>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Create `popup/popup.css`:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 340px; font-family: system-ui, sans-serif; background: #1a1a2e; color: #e0e0e0; padding: 16px; }
h1 { font-size: 16px; text-align: center; margin-bottom: 12px; color: #00d4ff; }
.password-display { display: flex; gap: 8px; margin-bottom: 8px; }
#password-output { flex: 1; padding: 8px; border: 1px solid #333; border-radius: 4px; background: #0f0f23; color: #00ff88; font-family: monospace; font-size: 13px; }
#copy-btn { padding: 8px 14px; border: none; border-radius: 4px; background: #00d4ff; color: #1a1a2e; font-weight: 600; cursor: pointer; }
#copy-btn.copied { background: #00ff88; }
.strength-bar { height: 6px; background: #333; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
#strength-fill { height: 100%; width: 0; border-radius: 3px; transition: width 0.3s, background 0.3s; }
#strength-label { font-size: 11px; color: #888; margin-bottom: 12px; }
.controls { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.controls label { font-size: 13px; display: flex; align-items: center; gap: 6px; }
#length-slider { width: 100%; margin-top: 4px; accent-color: #00d4ff; }
#generate-btn { width: 100%; padding: 10px; border: none; border-radius: 4px; background: #00d4ff; color: #1a1a2e; font-size: 14px; font-weight: 600; cursor: pointer; }
.history-section { margin-top: 12px; font-size: 12px; }
.history-section summary { cursor: pointer; color: #888; }
#history-list { list-style: none; max-height: 150px; overflow-y: auto; }
#history-list li { padding: 4px 0; font-family: monospace; font-size: 11px; color: #aaa; border-bottom: 1px solid #222; cursor: pointer; }
#history-list li:hover { color: #00ff88; }
```

---

## Step 3: Cryptographically Secure Password Generation

Create `lib/generate.js`:

```javascript
const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

export function generatePassword(options) {
  const { length = 16, uppercase = true, lowercase = true, numbers = true, symbols = true } = options;
  let pool = '';
  if (uppercase) pool += CHARSETS.uppercase;
  if (lowercase) pool += CHARSETS.lowercase;
  if (numbers) pool += CHARSETS.numbers;
  if (symbols) pool += CHARSETS.symbols;
  if (!pool.length) throw new Error('At least one character type must be selected');

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  const chars = Array.from(randomValues, v => pool[v % pool.length]);

  // Guarantee at least one character from each selected set
  const required = [];
  if (uppercase) required.push(CHARSETS.uppercase);
  if (lowercase) required.push(CHARSETS.lowercase);
  if (numbers) required.push(CHARSETS.numbers);
  if (symbols) required.push(CHARSETS.symbols);

  for (const charset of required) {
    if (!chars.some(c => charset.includes(c))) {
      const pos = crypto.getRandomValues(new Uint32Array(1))[0] % length;
      chars[pos] = charset[crypto.getRandomValues(new Uint32Array(1))[0] % charset.length];
    }
  }
  return chars.join('');
}

export function calculateStrength(password) {
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  const bits = password.length * Math.log2(poolSize || 1);
  if (bits < 40) return { bits: Math.round(bits), label: 'Weak', percent: 20 };
  if (bits < 60) return { bits: Math.round(bits), label: 'Fair', percent: 40 };
  if (bits < 80) return { bits: Math.round(bits), label: 'Good', percent: 60 };
  if (bits < 100) return { bits: Math.round(bits), label: 'Strong', percent: 80 };
  return { bits: Math.round(bits), label: 'Very Strong', percent: 100 };
}
```

`crypto.getRandomValues` uses a CSPRNG, unlike `Math.random` which is predictable. The guarantee loop ensures every selected character set appears at least once. Entropy is calculated as `length * log2(poolSize)` -- a 16-character all-types password yields ~105 bits.

---

## Step 4: Copy to Clipboard with Visual Feedback

Create `popup/popup.js`:

```javascript
import { generatePassword, calculateStrength } from '../lib/generate.js';
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage('password-generator', {
  history: [],
  defaults: { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true }
});

const $ = id => document.getElementById(id);
const passwordOutput = $('password-output'), copyBtn = $('copy-btn');
const strengthFill = $('strength-fill'), strengthLabel = $('strength-label');
const lengthSlider = $('length-slider'), lengthValue = $('length-value');
const generateBtn = $('generate-btn'), historyList = $('history-list'), historyCount = $('history-count');
const cbs = { uppercase: $('opt-uppercase'), lowercase: $('opt-lowercase'), numbers: $('opt-numbers'), symbols: $('opt-symbols') };

async function loadDefaults() {
  const { defaults, history } = await storage.get();
  lengthSlider.value = defaults.length;
  lengthValue.textContent = defaults.length;
  Object.entries(cbs).forEach(([k, el]) => el.checked = defaults[k]);
  renderHistory(history);
}

function getOptions() {
  return { length: +lengthSlider.value, ...Object.fromEntries(Object.entries(cbs).map(([k, el]) => [k, el.checked])) };
}

async function handleGenerate() {
  try {
    const pw = generatePassword(getOptions());
    passwordOutput.value = pw;
    const { bits, label, percent } = calculateStrength(pw);
    strengthFill.style.width = `${percent}%`;
    strengthFill.style.background = { 20: '#ff4444', 40: '#ff8800', 60: '#ffcc00', 80: '#88cc00', 100: '#00ff88' }[percent];
    strengthLabel.textContent = `${label} (${bits} bits of entropy)`;
    await saveToHistory(pw);
  } catch (e) { strengthLabel.textContent = e.message; }
}

async function handleCopy() {
  if (!passwordOutput.value) return;
  await navigator.clipboard.writeText(passwordOutput.value);
  copyBtn.textContent = 'Copied!';
  copyBtn.classList.add('copied');
  setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1500);
}

async function saveToHistory(password) {
  const data = await storage.get();
  const history = [{ password, timestamp: Date.now() }, ...data.history].slice(0, 20);
  await storage.set({ history });
  renderHistory(history);
}

function renderHistory(history) {
  historyCount.textContent = history.length;
  historyList.innerHTML = '';
  for (const entry of history) {
    const li = document.createElement('li');
    li.textContent = entry.password;
    li.title = `Generated: ${new Date(entry.timestamp).toLocaleString()} -- Click to copy`;
    li.addEventListener('click', async () => {
      await navigator.clipboard.writeText(entry.password);
      li.style.color = '#00ff88';
      setTimeout(() => li.style.color = '', 800);
    });
    historyList.appendChild(li);
  }
}

lengthSlider.addEventListener('input', () => lengthValue.textContent = lengthSlider.value);
generateBtn.addEventListener('click', handleGenerate);
copyBtn.addEventListener('click', handleCopy);
Object.values(cbs).forEach(cb => cb.addEventListener('change', () => {
  if (!Object.values(cbs).some(c => c.checked)) cb.checked = true;
}));
loadDefaults().then(handleGenerate);
```

The copy button toggles text to "Copied!" and turns green for 1.5 seconds. The strength bar uses color-coded entropy ranges (red through green). History entries are clickable for quick re-copy.

---

## Step 5: Password Strength Indicator

The strength indicator (wired in Step 4) maps entropy to visual feedback:

| Entropy | Rating | Color | Bar |
|---------|--------|-------|-----|
| < 40 bits | Weak | Red | 20% |
| 40-59 | Fair | Orange | 40% |
| 60-79 | Good | Yellow | 60% |
| 80-99 | Strong | Light green | 80% |
| 100+ | Very Strong | Green | 100% |

The formula `E = L * log2(P)` uses the detected pool size (not configured) so the bar reflects actual password content. A 16-character all-types password: `16 * log2(94) = 104.8 bits`.

---

## Step 6: Password History (Last 20)

History is stored via `@theluckystrike/webext-storage` wrapping `chrome.storage.local`. Each entry is `{ password, timestamp }`. The `saveToHistory` function in Step 4 prepends new entries and truncates to 20 with `.slice(0, 20)`. The collapsible `<details>` element keeps the popup compact. History entries are clickable to copy.

---

## Step 7: Context Menu Auto-Fill

Create `background.js`:

```javascript
import { generatePassword } from './lib/generate.js';
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage('password-generator', {
  history: [],
  defaults: { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'generate-password', title: 'Generate Password', contexts: ['editable'] });
});

async function generateAndSave() {
  const data = await storage.get();
  const password = generatePassword(data.defaults);
  const history = [{ password, timestamp: Date.now() }, ...data.history].slice(0, 20);
  await storage.set({ history });
  return password;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'generate-password') return;
  const password = await generateAndSave();
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (pw) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        el.value = pw;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    args: [password]
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'generate-password') return;
  const password = await generateAndSave();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (pw) => {
      navigator.clipboard.writeText(pw).then(() => {
        const toast = document.createElement('div');
        toast.textContent = 'Password copied!';
        Object.assign(toast.style, {
          position: 'fixed', top: '20px', right: '20px', padding: '12px 20px',
          background: '#00d4ff', color: '#1a1a2e', borderRadius: '6px',
          fontFamily: 'sans-serif', fontWeight: '600', zIndex: '999999', transition: 'opacity 0.3s'
        });
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1500);
      });
    },
    args: [password]
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'generate') {
    generateAndSave().then(pw => sendResponse({ password: pw }));
    return true;
  }
});
```

The context menu uses `contexts: ['editable']` so it only appears on input fields. The injected script dispatches `input` and `change` events so frameworks (React, Vue) detect the value change.

---

## Step 8: Content Script for Password Fields

Create `content.js`:

```javascript
const BUTTON_CLASS = 'pwgen-inject-btn';

function createGenerateButton(input) {
  if (input.dataset.pwgenInjected) return;
  input.dataset.pwgenInjected = 'true';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = BUTTON_CLASS;
  btn.textContent = 'Gen';
  btn.title = 'Generate a secure password';

  const wrapper = document.createElement('span');
  wrapper.className = 'pwgen-wrapper';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);
  wrapper.appendChild(btn);

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const response = await chrome.runtime.sendMessage({ action: 'generate' });
    if (response?.password) {
      input.value = response.password;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      btn.textContent = 'Done';
      btn.style.background = '#00ff88';
      setTimeout(() => { btn.textContent = 'Gen'; btn.style.background = ''; }, 1200);
    }
  });
}

function scan() {
  document.querySelectorAll('input[type="password"]:not([data-pwgen-injected])').forEach(createGenerateButton);
}

scan();
new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
```

Create `content.css`:

```css
.pwgen-wrapper { position: relative; display: inline-flex; align-items: center; }
.pwgen-wrapper input { padding-right: 48px; }
.pwgen-inject-btn {
  position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
  padding: 3px 8px; border: none; border-radius: 3px;
  background: #0078d4; color: #fff; font-size: 11px; font-weight: 600;
  cursor: pointer; z-index: 10000;
}
.pwgen-inject-btn:hover { background: #005ea2; }
```

The `MutationObserver` detects password fields added dynamically (SPAs, lazy-loaded forms). Each field gets a "Gen" button positioned inside.

---

## Step 9: Options Page

Create `options/options.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><link rel="stylesheet" href="options.css"></head>
<body>
  <div class="container">
    <h1>Password Generator Settings</h1>
    <section>
      <h2>Default Options</h2>
      <label>Default Length: <span id="length-value">16</span>
        <input type="range" id="length-slider" min="8" max="64" value="16">
      </label>
      <label><input type="checkbox" id="opt-uppercase" checked> Uppercase (A-Z)</label>
      <label><input type="checkbox" id="opt-lowercase" checked> Lowercase (a-z)</label>
      <label><input type="checkbox" id="opt-numbers" checked> Numbers (0-9)</label>
      <label><input type="checkbox" id="opt-symbols" checked> Symbols</label>
    </section>
    <section>
      <h2>History</h2>
      <p id="history-info">0 passwords saved.</p>
      <button id="clear-history">Clear History</button>
    </section>
    <div id="status"></div>
    <button id="save-btn">Save Settings</button>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

Create `options/options.css`:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; padding: 24px; max-width: 480px; }
h1 { font-size: 20px; margin-bottom: 16px; }
h2 { font-size: 15px; margin-bottom: 8px; color: #555; }
section { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
section p { font-size: 13px; color: #777; margin-bottom: 12px; }
label { display: block; font-size: 14px; margin-bottom: 8px; }
input[type="range"] { width: 100%; margin-top: 4px; }
#save-btn { padding: 10px 24px; border: none; border-radius: 4px; background: #0078d4; color: #fff; font-weight: 600; cursor: pointer; }
#clear-history { padding: 6px 16px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; }
#status { font-size: 13px; color: #00aa44; margin-bottom: 8px; min-height: 20px; }
```

Create `options/options.js`:

```javascript
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage('password-generator', {
  history: [],
  defaults: { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true }
});

const $ = id => document.getElementById(id);
const slider = $('length-slider'), val = $('length-value');
const cbs = { uppercase: $('opt-uppercase'), lowercase: $('opt-lowercase'), numbers: $('opt-numbers'), symbols: $('opt-symbols') };

async function load() {
  const { defaults, history } = await storage.get();
  slider.value = defaults.length;
  val.textContent = defaults.length;
  Object.entries(cbs).forEach(([k, el]) => el.checked = defaults[k]);
  $('history-info').textContent = `${history.length} passwords saved.`;
}

$('save-btn').addEventListener('click', async () => {
  const defaults = { length: +slider.value, ...Object.fromEntries(Object.entries(cbs).map(([k, el]) => [k, el.checked])) };
  if (!Object.values(cbs).some(c => c.checked)) { $('status').textContent = 'Select at least one type.'; return; }
  await storage.set({ defaults });
  $('status').textContent = 'Settings saved.';
  setTimeout(() => $('status').textContent = '', 2000);
});

$('clear-history').addEventListener('click', async () => {
  await storage.set({ history: [] });
  $('history-info').textContent = '0 passwords saved.';
});

slider.addEventListener('input', () => val.textContent = slider.value);
load();
```

The options page writes to the same storage namespace. Changes immediately affect generation from popup, context menu, and keyboard shortcut.

---

## Step 10: Keyboard Shortcut

The shortcut (`Alt+Shift+P`) is registered in the manifest and handled in `background.js` (Step 7). The flow: read defaults from storage, generate a password, save to history, inject a script that copies to clipboard and shows a brief toast. Users can customize the binding at `chrome://extensions/shortcuts`.

---

## Project Structure

```
password-generator-ext/
  manifest.json
  background.js
  content.js
  content.css
  lib/generate.js
  popup/   (popup.html, popup.css, popup.js)
  options/ (options.html, options.css, options.js)
  icons/   (icon16.png, icon48.png, icon128.png)
```

## Bundling

ES module imports require a bundler. Use Rollup:

```bash
npm install -D rollup @rollup/plugin-node-resolve
```

```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
export default ['popup/popup.js', 'background.js', 'options/options.js'].map(input => ({
  input,
  output: { file: `dist/${input}`, format: 'iife' },
  plugins: [resolve()]
}));
```

Run `npx rollup -c`, copy static assets to `dist/`, and load `dist/` as your extension.

## Key Takeaways

- Use `crypto.getRandomValues` for security-sensitive generation -- `Math.random` is predictable.
- Entropy (`L * log2(P)`) quantifies strength. 16 chars with all types yields ~105 bits, well above the 80-bit strong threshold.
- `contextMenus` with `editable` context targets only input fields, avoiding menu clutter.
- `MutationObserver` in content scripts handles dynamically added password fields in SPAs.
- `@theluckystrike/webext-storage` wraps `chrome.storage.local` with a clean async API.
- Register keyboard shortcuts in the manifest; handle them in the service worker via `chrome.commands.onCommand`.
