---
layout: default
title: "Chrome Extension WebAssembly — Developer Guide"
description: "Learn Chrome extension webassembly with this developer guide covering implementation, best practices, and code examples."
---
# WebAssembly in Chrome Extensions

WebAssembly (Wasm) enables near-native performance for CPU-intensive tasks in Chrome extensions.

## Overview

Wasm excels at performance-critical operations: image processing, cryptography, data parsing, and porting existing C/C++/Rust code. MV3 CSP allows WebAssembly with proper configuration.

## CSP Configuration

Add `wasm-unsafe-eval` to your extension's CSP in `manifest.json`:

```json
{
  "manifest_version": 3,
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

Without `wasm-unsafe-eval`, `WebAssembly.instantiate()` fails with a CSP violation.

## Loading Wasm in Extensions

Bundle `.wasm` files with your extension and load at runtime:

```javascript
async function loadWasmModule(wasmPath) {
  const wasmUrl = chrome.runtime.getURL(wasmPath);
  const buffer = await (await fetch(wasmUrl)).arrayBuffer();
  return (await WebAssembly.instantiate(buffer)).instance.exports;
}

const wasm = await loadWasmModule('assets/processing.wasm');
const result = wasm.process_data(inputData);
```

Works in popup, options page, offscreen documents, and service workers.

## Service Worker Limitations

Service workers can terminate after inactivity, destroying Wasm instances:

```javascript
let wasmModule = null;

async function getWasmModule() {
  if (!wasmModule) {
    const url = chrome.runtime.getURL('assets/processing.wasm');
    const buffer = await (await fetch(url)).arrayBuffer();
    wasmModule = (await WebAssembly.instantiate(buffer)).instance.exports;
  }
  return wasmModule;
}

chrome.runtime.onStartup.addListener(async () => {
  wasmModule = null;
  await getWasmModule();
});
```

## Use Cases

- **Image Processing**: Resize, filters, format conversion
- **Cryptography**: Hashing (SHA-256), encryption (AES)
- **Text Parsing**: Markdown, CSV, custom formats
- **Data Compression**: Gzip, Brotli

## Rust to Wasm Workflow

```bash
cargo install wasm-pack
wasm-pack build --target web --out-dir assets
```

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn process_data(data: &[u8]) -> Vec<u8> {
    data.iter().map(|b| b.wrapping_mul(2)).collect()
}
```

Bundle both `*.wasm` and `*.js` files in your extension.

## AssemblyScript Alternative

```bash
npm install --save-dev assemblyscript
npx asc index.ts -o index.wasm --optimize
```

```typescript
export function fibonacci(n: i32): i32 {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
```

## Content Scripts and Wasm

Page CSP may block Wasm in content scripts. Use message passing:

```javascript
// content.js
chrome.runtime.sendMessage({ type: 'PROCESS', data: imageData });

// background.js
chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  const result = wasm.process_data(msg.data);
  sendResponse(result);
});
```

Or use offscreen documents for processing.

## Cross-References

- [Content Security Policy](./mv3/content-security-policy.md)
- [CSP Reference](./reference/csp-reference.md)
- [Performance Guide](./guides/performance.md)

## Related Articles

- [WASM Patterns](../patterns/wasm-extensions.md)
- [Web Workers](../guides/web-workers-extensions.md)
