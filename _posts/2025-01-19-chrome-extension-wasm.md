---
layout: post
title: "WebAssembly in Chrome Extensions: Complete Performance Guide"
description: "Master WebAssembly in Chrome extensions with this comprehensive performance guide. Learn how wasm boosts extension performance, practical implementation patterns, and optimization strategies for chrome extension wasm projects."
date: 2025-01-19
last_modified_at: 2025-01-19
categories: [Chrome-Extensions]
tags: [chrome-extension, development]
keywords: "chrome extension wasm, webassembly extension, wasm performance"
canonical_url: "https://bestchromeextensions.com/2025/01/19/chrome-extension-wasm/"
---

WebAssembly in Chrome Extensions: Complete Performance Guide

WebAssembly (Wasm) is revolutionizing how developers build high-performance Chrome extensions. This technology enables you to run code written in multiple languages at near-native speed within the browser, opening unprecedented possibilities for extension performance optimization. Whether you're processing large datasets, performing complex calculations, or implementing computationally intensive features, WebAssembly can dramatically improve your extension's responsiveness and user experience.

This comprehensive guide explores everything you need about implementing WebAssembly in Chrome extensions. We'll cover the fundamentals of wasm, practical implementation patterns, performance optimization strategies, and real-world examples that you can adapt for your own projects. By the end of this guide, you'll have the knowledge and tools to use WebAssembly effectively in your Chrome extension development workflow.

---

Understanding WebAssembly in the Chrome Extension Context {#understanding-wasm}

WebAssembly is a binary instruction format designed as a portable compilation target for programming languages. It provides a way to execute code written in languages like C, C++, Rust, Go, and AssemblyScript directly in the browser with performance characteristics native speed. For Chrome extension developers, WebAssembly offers a powerful tool for optimizing performance-critical components without sacrificing cross-platform compatibility.

Chrome extensions operate within a unique environment that combines web technologies with privileged browser APIs. Understanding how WebAssembly fits into this architecture is crucial for effective implementation. The Chrome extension platform supports WebAssembly across all extension contexts, including background service workers, content scripts, popup pages, and options pages. This broad support means you can use wasm performance benefits throughout your extension.

The performance advantages of WebAssembly stem from its binary format and efficient execution model. Unlike JavaScript, which must be parsed and compiled at runtime, WebAssembly modules are delivered in a compact binary format that loads quickly and executes with minimal overhead. This characteristic makes wasm particularly valuable for extensions that perform repetitive computations, process large amounts of data, or implement algorithms with intensive computational requirements.

When to Use WebAssembly in Your Extension

Not every Chrome extension requires WebAssembly. Understanding when wasm provides meaningful benefits helps you make informed architectural decisions. Consider implementing WebAssembly when your extension performs mathematical computations that take significant time in JavaScript, such as image processing, cryptography, or data compression. Extensions that parse and process large JSON or XML documents can also benefit from wasm parsers that outperform their JavaScript equivalents.

Another compelling use case involves porting existing C or C++ libraries to work within your extension. If you have valuable code written in these languages, WebAssembly provides a path to bring that functionality into your extension without rewriting everything in JavaScript. This is particularly relevant for extensions that need to implement complex algorithms, scientific computations, or specialized data processing pipelines.

However, WebAssembly introduces additional complexity including build pipeline requirements, debugging challenges, and increased initial load time for the wasm module itself. For simple operations that JavaScript handles efficiently, the overhead of WebAssembly may not provide meaningful benefits. Evaluate each use case individually and implement wasm where it delivers tangible performance improvements.

---

Setting Up WebAssembly in Your Chrome Extension Project {#setting-up-wasm}

Implementing WebAssembly in a Chrome extension requires configuring your build toolchain to compile source code into wasm binaries and properly loading these binaries within your extension. This section walks through the complete setup process using popular toolchains.

Using AssemblyScript for TypeScript Projects

AssemblyScript provides an excellent starting point for developers familiar with TypeScript. It compiles a TypeScript-like syntax to WebAssembly, making it accessible to web developers while producing efficient wasm output. To set up AssemblyScript in your extension project, install the compiler and dependencies:

```bash
npm install --save-dev assemblyscript
npm install --save-dev as-build
```

Create your first AssemblyScript module by writing a file with the `.ts` extension using AssemblyScript's type annotations:

```typescript
// src/wasm/math-utils.ts
export function fibonacci(n: i32): i32 {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

export function calculatePrimes(limit: i32): i32 {
  const primes = new Array<i32>(limit);
  let count = 0;
  for (let i = 2; i < limit; i++) {
    let isPrime = true;
    for (let j = 2; j * j <= i; j++) {
      if (i % j === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes[count++] = i;
  }
  return count;
}
```

Compile this to WebAssembly using the AssemblyScript compiler:

```bash
npx asc src/wasm/math-utils.ts --outFile src/wasm/math-utils.wasm --optimize
```

Using Rust for High-Performance Modules

Rust produces highly optimized WebAssembly with minimal runtime overhead, making it ideal for performance-critical components. Set up Rust for wasm development by installing the wasm32 target:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

Create a new library crate for your wasm module:

```bash
cargo new --lib wasm-processor
```

Configure your Cargo.toml to produce wasm:

```toml
[package]
name = "wasm-processor"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
```

Write your Rust implementation:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn process_data(data: &[u8], threshold: u8) -> usize {
    data.iter().filter(|&&x| x > threshold).count()
}

#[wasm_bindgen]
pub fn transform_string(input: &str) -> String {
    input.chars().map(|c| {
        if c.is_ascii_uppercase {
            c.to_ascii_lowercase()
        } else if c.is_ascii_lowercase {
            c.to_ascii_uppercase()
        } else {
            c
        }
    }).collect()
}
```

Build the wasm module:

```bash
wasm-pack build --target web wasm-processor
```

---

Loading and Using WebAssembly in Extension Contexts {#loading-wasm}

Once you've compiled your WebAssembly module, the next step is loading and executing it within your Chrome extension. The loading process varies slightly depending on which extension context you're working in, but the core concepts remain consistent.

Loading WebAssembly in Service Workers

Service workers in Manifest V3 extensions provide the primary background processing context. Loading wasm modules in service workers requires careful attention to the chrome-extension:// URL scheme and proper error handling:

```javascript
// background/service-worker.js

let wasmModule = null;

async function loadWasmModule() {
  try {
    const response = await chrome.runtime.getURL('wasm/math-utils.wasm');
    const buffer = await fetch(response).then(res => res.arrayBuffer());
    const { instance } = await WebAssembly.instantiate(buffer);
    wasmModule = instance.exports;
    console.log('WebAssembly module loaded successfully');
  } catch (error) {
    console.error('Failed to load WebAssembly module:', error);
  }
}

// Load the module when the service worker starts
loadWasmModule();

// Example function using the wasm module
function calculateWithWasm(number) {
  if (!wasmModule) {
    console.warn('WASM module not loaded yet');
    return null;
  }
  return wasmModule.fibonacci(number);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CALCULATE_FIBONACCI') {
    const result = calculateWithWasm(message.number);
    sendResponse({ result });
  }
  return true;
});
```

Loading WebAssembly in Content Scripts

Content scripts operate within the context of web pages, which changes how you load wasm modules. The key consideration is ensuring the wasm file is accessible and handling cross-origin restrictions appropriately:

```javascript
// content_scripts/data-processor.js

async function initializeWasm() {
  try {
    // The wasm file must be listed in web_accessible_resources in manifest.json
    const wasmUrl = chrome.runtime.getURL('wasm/data-processor.wasm');
    
    const response = await fetch(wasmUrl);
    const buffer = await response.arrayBuffer();
    
    const { instance } = await WebAssembly.instantiate(buffer, {
      env: {
        // Provide any required imports
        memory: new WebAssembly.Memory({ initial: 256, maximum: 512 })
      }
    });
    
    return instance.exports;
  } catch (error) {
    console.error('WASM initialization failed:', error);
    throw error;
  }
}

let wasmExports = null;

async function processPageData(data) {
  if (!wasmExports) {
    wasmExports = await initializeWasm();
  }
  
  // Create a typed array from the data
  const inputArray = new Uint8Array(data);
  
  // Allocate memory in wasm and copy data
  const inputPtr = wasmExports.allocate(inputArray.length);
  const memory = wasmExports.memory;
  
  new Uint8Array(memory.buffer).set(inputArray, inputPtr);
  
  // Call the wasm function
  const resultPtr = wasmExports.process_data(inputPtr, inputArray.length);
  const resultLength = wasmExports.get_result_length(resultPtr);
  
  // Read the result back
  const resultArray = new Uint8Array(memory.buffer, resultPtr, resultLength);
  
  // Clean up allocated memory
  wasmExports.deallocate(inputPtr);
  wasmExports.deallocate(resultPtr);
  
  return Array.from(resultArray);
}

// Initialize on page load
initializeWasm().then(() => {
  console.log('Content script wasm initialized');
});
```

Configuring Manifest for WebAssembly

Your extension's manifest.json must properly declare WebAssembly resources to make them accessible from different contexts:

```json
{
  "manifest_version": 3,
  "name": "High-Performance Extension",
  "version": "1.0",
  "permissions": ["storage"],
  "web_accessible_resources": [
    {
      "resources": ["wasm/*.wasm"],
      "matches": ["<all_urls>"]
    }
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content_scripts/data-processor.js"]
    }
  ]
}
```

---

Performance Optimization Strategies for Chrome Extension Wasm {#optimization-strategies}

Maximizing the performance benefits of WebAssembly in your Chrome extension requires understanding wasm-specific optimization techniques. This section covers strategies to achieve optimal performance from your wasm modules.

Minimizing Module Load Time

WebAssembly module instantiation can contribute to perceived latency, especially in contexts like service workers that may start and stop frequently. Several strategies help minimize this overhead.

Lazy Loading: Defer wasm module loading until the functionality is actually needed rather than loading on extension initialization:

```javascript
// Only load wasm when user triggers the feature
async function getWasmProcessor() {
  if (!wasmProcessor) {
    wasmProcessor = await loadWasmProcessor();
  }
  return wasmProcessor;
}

document.getElementById('processButton').addEventListener('click', async () => {
  const processor = await getWasmProcessor();
  const result = processor.process(document.getElementById('input').value);
  displayResult(result);
});
```

Streaming Instantiation: Use WebAssembly.instantiateStreaming when possible to begin compilation before the entire module downloads:

```javascript
async function loadWasmStreaming(url) {
  const response = await fetch(url);
  const { instance } = await WebAssembly.instantiateStreaming(response);
  return instance.exports;
}
```

Caching Compiled Modules: Cache the compiled wasm module in chrome.storage to avoid recompilation across extension restarts:

```javascript
async function loadWithCaching() {
  const cacheKey = 'wasm_module_v1';
  
  // Check cache first
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey]) {
    const module = await WebAssembly.compile(cached[cacheKey]);
    return WebAssembly.instantiate(module);
  }
  
  // Load and cache if not present
  const response = await fetch(chrome.runtime.getURL('wasm/module.wasm'));
  const buffer = await response.arrayBuffer();
  
  await chrome.storage.local.set({ [cacheKey]: buffer });
  
  return WebAssembly.instantiate(buffer);
}
```

Memory Management in WebAssembly

WebAssembly provides linear memory that you must manage explicitly. Proper memory handling prevents issues like memory leaks and out-of-bounds access while optimizing performance.

Pre-allocating Memory: When you know the maximum memory requirements, allocate memory upfront to avoid dynamic allocation overhead during execution:

```typescript
// AssemblyScript example
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB
const buffer = new ArrayBuffer(MAX_BUFFER_SIZE);
const view = new DataView(buffer);
```

Using Typed Arrays Efficiently: Minimize conversions between JavaScript and WebAssembly memory by working directly with typed arrays:

```javascript
function processInPlace(wasmMemory, pointer, length) {
  // Work directly with the wasm memory view
  const view = new Uint8Array(wasmMemory.buffer, pointer, length);
  
  for (let i = 0; i < length; i++) {
    view[i] = transformByte(view[i]);
  }
  
  // No need to copy back - transformation happened in place
}
```

Implementing Custom Allocators: For complex wasm modules, consider implementing a custom allocator to reduce memory fragmentation:

```rust
struct Allocator {
    free_list: Vec<(usize, usize)>,
}

impl Allocator {
    fn new() -> Self {
        Allocator { free_list: vec![(0, 65536)] }
    }
    
    fn allocate(&mut self, size: usize) -> Option<usize> {
        // Find first fitting block
        if let Some(idx) = self.free_list.iter().position(|(start, end)| {
            end - start >= size
        }) {
            let (start, end) = self.free_list.remove(idx);
            let remaining = end - start - size;
            
            if remaining > 0 {
                self.free_list.push((start + size, end));
            }
            
            Some(start)
        } else {
            None
        }
    }
}
```

Optimizing Data Transfer Between JavaScript and Wasm

The boundary between JavaScript and WebAssembly can become a performance bottleneck if not managed carefully. Minimize data transfer overhead using these techniques.

Passing Pointers Rather Than Copies: When possible, pass memory pointers rather than copying data:

```javascript
// Instead of this:
function processData(dataArray) {
  const wasmResult = wasmModule.process_data(Array.from(dataArray));
  return wasmResult;
}

// Do this:
function processDataInPlace(dataArray) {
  const pointer = wasmModule.allocate(dataArray.length);
  const wasmMemory = new Uint8Array(wasmModule.memory.buffer);
  
  // Copy once
  wasmMemory.set(dataArray, pointer);
  
  // Process in place
  wasmModule.process_in_place(pointer, dataArray.length);
  
  // Read result
  const result = wasmMemory.slice(pointer, pointer + dataArray.length);
  
  wasmModule.deallocate(pointer);
  return result;
}
```

Using SharedArrayBuffer for Multi-threaded Processing: Chrome supports SharedArrayBuffer in extension contexts, enabling true parallel processing:

```javascript
const sharedBuffer = new SharedArrayBuffer(1024 * 1024);
const sharedArray = new Uint8Array(sharedBuffer);

// Initialize wasm with shared memory
const wasmModule = await WebAssembly.instantiate(wasmBuffer, {
  env: {
    shared_memory: sharedBuffer
  }
});

// Spawn workers that share the same memory
const worker = new Worker('wasm-worker.js');
worker.postMessage({ sharedBuffer });
```

---

Real-World Chrome Extension Wasm Implementation Examples {#real-world-examples}

Understanding how WebAssembly performs in production scenarios provides valuable insights for your own implementations. These examples demonstrate practical wasm usage in Chrome extensions.

Example 1: Image Processing Extension

Image processing is a classic use case for WebAssembly due to the computational intensity of pixel manipulation operations. This example shows a content script that uses wasm to apply filters to images on web pages:

```javascript
// content_scripts/image-filter.js

let wasmImageProcessor = null;

async function loadImageProcessor() {
  if (wasmImageProcessor) return wasmImageProcessor;
  
  const response = await fetch(chrome.runtime.getURL('wasm/image-processor.wasm'));
  const buffer = await response.arrayBuffer();
  
  const { instance } = await WebAssembly.instantiate(buffer);
  wasmImageProcessor = instance.exports;
  
  return wasmImageProcessor;
}

async function applyGrayscaleFilter(imageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const processor = await loadImageProcessor();
  
  // Allocate memory in wasm
  const inputPtr = processor.allocate(imageData.data.length);
  const inputView = new Uint8Array(processor.memory.buffer);
  
  // Copy image data to wasm memory
  inputView.set(imageData.data, inputPtr);
  
  // Apply grayscale filter in wasm
  processor.apply_grayscale(inputPtr, canvas.width, canvas.height);
  
  // Copy result back
  const outputView = new Uint8Array(
    processor.memory.buffer,
    inputPtr,
    imageData.data.length
  );
  imageData.data.set(outputView);
  
  // Put processed image back
  ctx.putImageData(imageData, 0, 0);
  
  // Replace original
  imageElement.parentNode.replaceChild(canvas, imageElement);
  
  // Clean up
  processor.deallocate(inputPtr);
}
```

Example 2: Data Extraction Extension

Extensions that scrape and process web page data benefit significantly from wasm parsers that outperform JavaScript alternatives:

```javascript
// content_scripts/data-extractor.js

class DataExtractor {
  constructor() {
    this.wasm = null;
  }
  
  async initialize() {
    if (this.wasm) return;
    
    const response = await fetch(
      chrome.runtime.getURL('wasm/data-parser.wasm')
    );
    const { instance } = await WebAssembly.instantiate(
      await response.arrayBuffer()
    );
    
    this.wasm = instance.exports;
  }
  
  extractStructuredData(html, selectors) {
    // Parse HTML in wasm for performance
    const htmlPtr = this.writeStringToWasm(html);
    const selectorsPtr = this.writeStringToWasm(JSON.stringify(selectors));
    
    const resultPtr = this.wasm.parse_html(htmlPtr, selectorsPtr);
    const result = this.readStringFromWasm(resultPtr);
    
    this.wasm.deallocate(htmlPtr);
    this.wasm.deallocate(selectorsPtr);
    this.wasm.deallocate(resultPtr);
    
    return JSON.parse(result);
  }
  
  extractTableData(tableElement) {
    const rows = tableElement.querySelectorAll('tr');
    const data = [];
    
    // Process each row with wasm for complex transformations
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th'))
        .map(cell => cell.textContent.trim());
      
      const processedRow = this.processRowWasm(cells);
      if (processedRow.length > 0) {
        data.push(processedRow);
      }
    }
    
    return data;
  }
  
  writeStringToWasm(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str + '\0');
    const ptr = this.wasm.allocate(bytes.length);
    new Uint8Array(this.wasm.memory.buffer).set(bytes, ptr);
    return ptr;
  }
  
  readStringFromWasm(ptr) {
    const view = new Uint8Array(this.wasm.memory.buffer);
    let end = ptr;
    while (view[end] !== 0) end++;
    const bytes = view.slice(ptr, end);
    return new TextDecoder().decode(bytes);
  }
}
```

Example 3: Cryptographic Operations Extension

Extensions that handle sensitive data often need cryptographic functions. WebAssembly enables you to implement these efficiently:

```javascript
// background/crypto-service.js

class WasmCryptoService {
  constructor() {
    this.wasm = null;
  }
  
  async initialize() {
    const response = await fetch(
      chrome.runtime.getURL('wasm/crypto.wasm')
    );
    const { instance } = await WebAssembly.instantiate(
      await response.arrayBuffer()
    );
    
    this.wasm = instance.exports;
  }
  
  hashData(data) {
    const inputPtr = this.writeToWasm(data);
    const hashPtr = this.wasm.sha256(inputPtr, data.length);
    const hash = this.readFromWasm(hashPtr, 32);
    
    this.wasm.deallocate(inputPtr);
    this.wasm.deallocate(hashPtr);
    
    return hash;
  }
  
  encrypt(plaintext, key) {
    const keyPtr = this.writeToWasm(key);
    const textPtr = this.writeToWasm(plaintext);
    
    const encryptedPtr = this.wasm.aes_encrypt(textPtr, plaintext.length, keyPtr);
    const encrypted = this.readFromWasm(encryptedPtr, plaintext.length);
    
    this.wasm.deallocate(keyPtr);
    this.wasm.deallocate(textPtr);
    this.wasm.deallocate(encryptedPtr);
    
    return encrypted;
  }
  
  decrypt(ciphertext, key) {
    const keyPtr = this.writeToWasm(key);
    const cipherPtr = this.writeToWasm(ciphertext);
    
    const decryptedPtr = this.wasm.aes_decrypt(cipherPtr, ciphertext.length, keyPtr);
    const decrypted = this.readStringFromWasm(decryptedPtr);
    
    this.wasm.deallocate(keyPtr);
    this.wasm.deallocate(cipherPtr);
    this.wasm.deallocate(decryptedPtr);
    
    return decrypted;
  }
  
  writeToWasm(str) {
    const bytes = new TextEncoder().encode(str);
    const ptr = this.wasm.allocate(bytes.length);
    new Uint8Array(this.wasm.memory.buffer).set(bytes, ptr);
    return ptr;
  }
  
  readFromWasm(ptr, length) {
    return new Uint8Array(this.wasm.memory.buffer, ptr, length);
  }
  
  readStringFromWasm(ptr) {
    const view = new Uint8Array(this.wasm.memory.buffer);
    let end = ptr;
    while (view[end] !== 0) end++;
    return new TextDecoder().decode(view.slice(ptr, end));
  }
}
```

---

Debugging WebAssembly in Chrome Extensions {#debugging-wasm}

Debugging WebAssembly modules in Chrome extensions requires specific techniques and tools. Understanding these approaches helps you quickly identify and resolve issues in your wasm code.

Using Chrome DevTools for Wasm Debugging

Chrome DevTools provides solid support for debugging WebAssembly:

1. Open your extension's background service worker DevTools at `chrome://extensions/`
2. Click "Service Worker" link and then "inspect"
3. Enable "WebAssembly debugging" in DevTools settings
4. Set breakpoints in your .wasm source files directly

Common Issues and Solutions

Module Not Loading: Verify the wasm file is correctly listed in web_accessible_resources and the path matches exactly:

```json
"web_accessible_resources": [
  {
    "resources": ["wasm/module.wasm"],
    "matches": ["<all_urls>"]
  }
]
```

Memory Access Errors: Ensure you're not accessing memory outside the allocated bounds. Use the memory object's byte length to validate pointers:

```javascript
function safeRead(wasmMemory, pointer, length) {
  if (pointer + length > wasmMemory.buffer.byteLength) {
    throw new Error('Memory access out of bounds');
  }
  return new Uint8Array(wasmMemory.buffer, pointer, length);
}
```

Instantiation Failures: Check for import object mismatches between your wasm module and JavaScript:

```javascript
async function loadWithErrorHandling() {
  try {
    const response = await fetch(wasmUrl);
    const buffer = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(buffer, imports);
    return instance;
  } catch (error) {
    console.error('WASM instantiation failed:', error.message);
    console.error('Check that imports match the wasm module exports');
    throw error;
  }
}
```

---

Conclusion and Best Practices {#conclusion}

WebAssembly opens powerful possibilities for optimizing Chrome extension performance, but successful implementation requires careful planning and attention to detail. Key takeaways from this guide include understanding when wasm provides meaningful benefits over JavaScript, properly configuring your build pipeline and manifest, and implementing appropriate loading strategies for different extension contexts.

Follow these best practices as you implement WebAssembly in your extensions:

- Start with profiling: Measure JavaScript performance before adding wasm complexity
- Load lazily: Defer wasm loading until needed to minimize initial extension startup time
- Manage memory explicitly: Clean up allocated memory to prevent leaks
- Test across contexts: Verify wasm behavior in all extension contexts where it runs
- Provide JavaScript fallbacks: Ensure graceful degradation if wasm fails to load

By following these principles and leveraging the techniques demonstrated in this guide, you can successfully integrate WebAssembly into your Chrome extensions and deliver exceptional performance to your users. The combination of Chrome extension APIs with WebAssembly's computational power enables extensions that were previously impossible or impractical to build.

Continue exploring WebAssembly for your extension projects, and remember that the performance benefits must be weighed against the added complexity. For computationally intensive operations, image processing, data parsing, and cryptographic functions, WebAssembly provides a significant advantage. For simpler operations, well-optimized JavaScript often suffices and offers easier debugging and maintenance.

---

Additional Resources

- [WebAssembly Official Documentation](https://webassembly.org/)
- [AssemblyScript Documentation](https://www.assemblyscript.org/)
- [Rust and WebAssembly Book](https://rustwasm.github.io/book/)
- [Chrome Extension Development Documentation](/docs/guides/getting-started/)
