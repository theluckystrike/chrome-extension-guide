---
layout: default
title: "Chrome Extension Content Security Policy — Manifest V3 Guide"
description: "Understand and work with Content Security Policy restrictions in Manifest V3."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/mv3/content-security-policy/"
---

# MV3 Content Security Policy

A comprehensive guide to Content Security Policy changes in Manifest V3 and how to migrate your extension.

## Overview {#overview}

Manifest V3 (MV3) enforces a **stricter Content Security Policy (CSP)** compared to Manifest V2. The most significant changes are:

- **No `eval()`** — Dynamic code execution is no longer allowed
- **No `new Function()`** — Function constructor is blocked
- **No remote code** — All scripts must be bundled locally
- **No inline scripts** — Inline scripts are blocked; move all code to external .js files

These changes improve security but require code refactoring for many extensions.

---

## Key Changes Table {#key-changes-table}

| Feature | MV2 | MV3 | Notes |
|---------|-----|-----|-------|
| `eval()` | ✅ Allowed | ❌ Blocked | Use JSON.parse or a proper parser |
| `new Function()` | ✅ Allowed | ❌ Blocked | Use alternative implementations |
| Remote scripts | ✅ Allowed | ❌ Blocked | Bundle all dependencies locally |
| Inline scripts | ✅ Allowed | ❌ Blocked | Move to separate .js files |
| Data URIs | ✅ Allowed | ⚠️ Restricted | Allowed in some contexts |
| WebAssembly | ⚠️ Limited | ✅ Allowed | Enabled by default in MV3 |

---

## Default MV3 CSP {#default-mv3-csp}

Manifest V3 extensions have this default CSP:

```
script-src 'self' 'wasm-unsafe-eval'; object-src 'self';
```

Breaking it down:
- `'self'` — Only extension's own scripts
- `'wasm-unsafe-eval'` — WebAssembly is allowed (but marked unsafe-eval)
- `object-src 'self'` — Only extension's own resources

You can customize this in `manifest.json`:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts allow-same-origin"
  }
}
```

---

## Manifest Configuration {#manifest-configuration}

In MV3, CSP is now an **object** with two keys:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts allow-same-origin"
  }
}
```

| Key | Description |
|-----|-------------|
| `extension_pages` | CSP for extension popup, background script, options page |
| `sandbox` | CSP for sandboxed pages (used for dynamic code) |

---

## Problem 1: `eval()` and `new Function()` {#problem-1-eval-and-new-function}

These are the most common migration issues. Both are blocked in MV3.

### ❌ MV2 (Will Fail in MV3) {#mv2-will-fail-in-mv3}

```javascript
// Using eval() to parse JSON
const data = eval('(' + jsonString + ')');

// Using new Function() for dynamic code
const fn = new Function('return ' + jsonString);
```

### ✅ MV3 Compatible {#mv3-compatible}

```javascript
// Use JSON.parse for JSON
const data = JSON.parse(jsonString);

// Use a proper parser or template engine
import { parse } from './parser.js';
const data = parse(jsonString);
```

### Replacing Template Engines {#replacing-template-engines}

If a library uses `eval()` internally, consider alternatives:

| Library | MV2 | MV3 Alternative |
|---------|-----|-----------------|
| Handlebars | ✅ | Use precompiled templates |
| Lodash templates | ✅ | Use precompiled or esbuild |
| Underscore.js | ✅ | Use precompiled templates |
| Custom eval | ❌ | Use JSON.parse or a parser |

---

## Problem 2: Remote Scripts {#problem-2-remote-scripts}

MV3 requires all scripts to be bundled locally. No loading from CDN.

### ❌ MV2 (Will Fail in MV3) {#mv2-will-fail-in-mv3}

```html
<script src="https://cdn.example.com/library.js"></script>
```

```javascript
// In manifest.json (MV2)
"content_scripts": [{
  "js": ["https://cdn.example.com/library.js"]
}]
```

### ✅ MV3 Compatible {#mv3-compatible}

1. **Download the dependency**
2. **Place it in your extension**
3. **Reference locally**

```bash
npm install library-name
cp node_modules/library-name/dist/library.js extension/lib/
```

```json
// manifest.json (MV3)
{
  "content_scripts": [{
    "js": ["lib/library.js", "content.js"]
  }]
}
```

### Bundling with Build Tools {#bundling-with-build-tools}

For complex dependencies, use a bundler:

```javascript
// rollup.config.js
export default {
  input: 'src/background.js',
  output: {
    file: 'dist/background.js',
    format: 'iife'
  },
  external: ['chrome']
};
```

---

## Problem 3: Inline Scripts {#problem-3-inline-scripts}

Inline scripts (`<script>` tags and inline event handlers) are blocked.

### ❌ MV2 (Will Fail in MV3) {#mv2-will-fail-in-mv3}

```html
<!-- Inline script -->
<script>
  console.log('Hello');
</script>

<!-- Inline event handler -->
<button onclick="handleClick()">Click</button>

<!-- Inline style with expression -->
<style>
  body { width: calc(100% - 10px); }
</style>
```

### ✅ MV3 Compatible {#mv3-compatible}

```html
<!-- Move to external file -->
<script src="popup.js"></script>

<!-- Use addEventListener -->
<button id="myButton">Click</button>
```

```javascript
// popup.js
document.getElementById('myButton').addEventListener('click', handleClick);
```

### Converting Inline Event Handlers {#converting-inline-event-handlers}

| Inline (MV2) | External (MV3) |
|--------------|----------------|
| `onclick="fn()"` | `element.addEventListener('click', fn)` |
| `onload="init()"` | `window.addEventListener('load', init)` |
| `onerror="handle()"` | `element.addEventListener('error', handle)` |

---

## Problem 4: Dynamic Code Generation {#problem-4-dynamic-code-generation}

If you absolutely need dynamic code execution, use **sandboxed pages**.

### Architecture {#architecture}

```
┌─────────────────────────────────────┐
│  Extension Page                     │
│  (CSP: script-src 'self')          │
│         │                           │
│         │ postMessage               │
│         ▼                           │
│  ┌─────────────────────────────┐   │
│  │  Sandbox Page               │   │
│  │  (CSP: sandbox allow-scripts)│   │
│  │  - Can use eval/Function    │   │
│  │  - Returns results via      │   │
│  │    postMessage              │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Implementation {#implementation}

**manifest.json:**

```json
{
  "sandbox": {
    "pages": ["sandbox.html"]
  }
}
```

**sandbox.html:**

```html
<!DOCTYPE html>
<html>
<head>
  <script src="sandbox.js"></script>
</head>
<body>
  <!-- Sandbox runs in isolation -->
</body>
</html>
```

**sandbox.js:**

```javascript
// This runs in sandbox with relaxed CSP
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  const { code } = event.data;
  try {
    const result = eval(code);
    window.parent.postMessage({ result }, '*');
  } catch (error) {
    window.parent.postMessage({ error: error.message }, '*');
  }
});
```

**Extension page (popup.js):**

```javascript
function executeInSandbox(code) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    
    window.parent.postMessage({ code }, '*', [channel.port2]);
    
    channel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data.result);
      }
    };
    
    // Use sandbox page via iframe
    const iframe = document.createElement('iframe');
    iframe.src = 'sandbox.html';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  });
}
```

> **Note:** The `@theluckystrike/webext-messaging` library handles all this complexity for you with a clean, CSP-safe API.

---

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

The `@theluckystrike/webext-messaging` library is designed to be **fully CSP-compliant**. It uses native `chrome.runtime.sendMessage` and `chrome.runtime.onMessage` APIs—no `eval()`, no inline scripts, no dynamic code.

### Installation {#installation}

```bash
npm install @theluckystrike/webext-messaging
```

### Basic Usage {#basic-usage}

```typescript
import { createMessenger } from "@theluckystrike/webext-messaging";

// Create messenger for background script communication
const messenger = createMessenger({
  context: 'content', // or 'background', 'popup', 'options'
  debug: false
});

// Send messages (CSP-safe, no eval)
async function getData() {
  const response = await messenger.send('get-data', { key: 'value' });
  return response;
}

// Listen for messages
messenger.on('data-updated', (data) => {
  console.log('Data received:', data);
});
```

### Why it's CSP-safe {#why-its-csp-safe}

- **No eval()** — Uses native Chrome messaging APIs
- **No inline scripts** — All event handlers use `addEventListener`
- **No dynamic code** — Pure function calls, no string-to-code conversion
- **TypeScript support** — Full type safety

---

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

The `@theluckystrike/webext-storage` library provides **CSP-compliant** storage operations using Chrome's `chrome.storage` API.

### Installation {#installation}

```bash
npm install @theluckystrike/webext-storage
```

### Basic Usage {#basic-usage}

```typescript
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// Define your storage schema
const schema = defineSchema({
  settings: {
    theme: { type: 'string', default: 'light' },
    notifications: { type: 'boolean', default: true }
  },
  cache: {
    data: { type: 'object' }
  }
});

// Create storage instance
const storage = createStorage(schema);

// CSP-safe operations
async function saveSettings(settings) {
  await storage.set('settings', settings);
}

async function loadSettings() {
  const settings = await storage.get('settings');
  return settings;
}
```

### Why it's CSP-safe {#why-its-csp-safe}

- **No eval()** — Direct chrome.storage API calls
- **No dynamic serialization** — Type-safe schema validation
- **No inline scripts** — Event handlers via addEventListener
- **Synchronous & async** — Supports both sync and async patterns

---

## Content Scripts CSP {#content-scripts-csp}

Content scripts have a unique relationship with the host page's CSP.

### Page's CSP vs Extension's CSP {#pages-csp-vs-extensions-csp}

| Context | CSP Applied |
|---------|-------------|
| Host page | Page's CSP (you can't control this) |
| Content script | Not subject to the page's CSP; content scripts can use `chrome.runtime` APIs freely |
| Extension pages | Extension's CSP (your `content_security_policy`) |

### Implications {#implications}

1. **Content scripts** run in an isolated world and are not restricted by the host page's CSP
2. **Messages to extension** use `chrome.runtime.sendMessage` (CSP-exempt)
3. **Inline handlers in page** — You cannot use them, use `addEventListener`

### ❌ MV2 (Will Fail in MV3) {#mv2-will-fail-in-mv3}

```html
<!-- Inline event handler in HTML -- blocked by CSP -->
<button onclick="chrome.runtime.sendMessage({ action: 'doSomething' })">Click</button>
```

### ✅ MV3 Compatible {#mv3-compatible}

```javascript
// Content script or extension page -- use addEventListener or .onclick property
document.querySelector('button').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'doSomething' });
});
```

> **Note:** JavaScript `.onclick` property assignment is NOT blocked by CSP. Only HTML `onclick="..."` attribute inline handlers are blocked.

---

## WebAssembly {#webassembly}

WebAssembly (Wasm) is **allowed by default** in MV3.

### Default CSP Includes Wasm {#default-csp-includes-wasm}

```
script-src 'self' 'wasm-unsafe-eval'; object-src 'self';
```

The `'wasm-unsafe-eval'` directive allows Wasm compilation.

### Using Wasm in Your Extension {#using-wasm-in-your-extension}

```javascript
// Load Wasm module
async function loadWasmModule() {
  const response = await fetch(chrome.runtime.getURL('module.wasm'));
  const buffer = await response.arrayBuffer();
  const module = await WebAssembly.compile(buffer);
  const instance = await WebAssembly.instantiate(module);
  return instance.exports;
}
```

### If You Need to Disable Wasm {#if-you-need-to-disable-wasm}

For maximum security, you can remove `'wasm-unsafe-eval'`:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

> **Warning:** This will break any Wasm-based functionality in your extension.

---

## Common Libraries That Need Fixes {#common-libraries-that-need-fixes}

Some popular libraries have features that violate MV3's CSP. Here's how to handle them:

| Library | Issue | Solution |
|---------|-------|----------|
| **Handlebars** | Uses `eval` for runtime compilation | Precompile templates, use `handlebars-runtime` |
| **Lodash (template)** | Uses `new Function` for templates | Precompile templates |
| **jQuery** | Works fine | Use latest version |
| **Angular.js (1.x)** | Uses `ng-bind` with expressions | Refactor to use components |
| **Moment.js** | Works fine | Use latest version |
| **Underscore.js** | Uses `new Function` for templates | Precompile templates |
| **CoffeeScript** | Compiles to `eval` | Precompile to JS |
| **Babel (runtime)** | May use `eval` | Use `@babel/standalone` precompiled |

### Handlebars Migration Example {#handlebars-migration-example}

```javascript
// ❌ MV2 - Runtime compilation (uses eval)
const template = Handlebars.compile('<div>{{name}}</div>');
const html = template({ name: 'World' });

// ✅ MV3 - Precompiled templates
import template from './templates/hello.js';
const html = template({ name: 'World' });
```

```bash
# Precompile Handlebars
npx handlebars template.hbs -f templates/hello.js
```

---

## Migration Checklist {#migration-checklist}

Use this checklist when migrating from MV2 to MV3:

### Phase 1: Inventory {#phase-1-inventory}

- [ ] List all `eval()` calls in your codebase
- [ ] List all `new Function()` usages
- [ ] Identify all remote script URLs (CDN links)
- [ ] Identify all inline `<script>` tags
- [ ] Identify all inline event handlers (`onclick`, etc.)
- [ ] Check all dependencies for eval/new Function usage

### Phase 2: Replace Dynamic Code {#phase-2-replace-dynamic-code}

- [ ] Replace `eval()` with `JSON.parse()` or a parser
- [ ] Replace `new Function()` with function references
- [ ] Replace inline `<script>` tags with external files
- [ ] Replace inline event handlers with `addEventListener`

### Phase 3: Bundle Dependencies {#phase-3-bundle-dependencies}

- [ ] Download all remote scripts
- [ ] Place scripts in extension directory
- [ ] Update manifest.json to reference local files
- [ ] Configure bundler for complex dependencies

### Phase 4: Verify {#phase-4-verify}

- [ ] Test in Chrome with MV3
- [ ] Check for CSP violations in chrome://extensions
- [ ] Test all dynamic functionality
- [ ] Test WebAssembly if used

### Phase 5: Use CSP-Safe Libraries {#phase-5-use-csp-safe-libraries}

- [ ] Use `@theluckystrike/webext-messaging` for messaging
- [ ] Use `@theluckystrike/webext-storage` for storage
- [ ] Use precompiled templates (Handlebars, Lodash, etc.)

---

## Summary {#summary}

MV3's stricter CSP significantly improves extension security but requires migration effort:

1. **No dynamic code** — Replace `eval()` and `new Function()`
2. **No remote scripts** — Bundle everything locally
3. **No inline scripts** — Use external files and `addEventListener`
4. **Use sandbox pages** — For rare cases requiring dynamic code
5. **Use @theluckystrike libraries** — They're designed for CSP compliance

The `@theluckystrike/webext-messaging` and `@theluckystrike/webext-storage` libraries provide clean, CSP-safe APIs that work out of the box with Manifest V3.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
