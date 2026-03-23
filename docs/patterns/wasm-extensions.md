---
layout: default
title: "Chrome Extension Wasm Extensions. Best Practices"
description: "Integrate WebAssembly modules into Chrome extensions for performance."
canonical_url: "https://bestchromeextensions.com/patterns/wasm-extensions/"
---

# WebAssembly in Chrome Extensions

WebAssembly (WASM) enables near-native performance for compute-heavy tasks inside Chrome extensions. This guide covers eight practical patterns for integrating WASM modules with Manifest V3, including loading strategies, memory management, caching, and Content Security Policy configuration.

> Cross-references:
> - [Content Security Policy in MV3](../mv3/content-security-policy.md)
> - [Performance Profiling](performance-profiling.md)

---

Pattern 1: Loading WASM in a Service Worker {#pattern-1-loading-wasm-in-a-service-worker}

Service workers in MV3 support `WebAssembly.instantiate` but do not support `WebAssembly.instantiateStreaming` in all contexts. The safest approach is to fetch the binary and instantiate from an `ArrayBuffer`.

```typescript
// background.ts
let wasmInstance: WebAssembly.Instance | null = null;

async function loadWasm(): Promise<WebAssembly.Instance> {
  if (wasmInstance) return wasmInstance;

  const wasmUrl = chrome.runtime.getURL("wasm/processor.wasm");
  const response = await fetch(wasmUrl);
  const bytes = await response.arrayBuffer();

  const importObject: WebAssembly.Imports = {
    env: {
      log: (ptr: number, len: number) => {
        const memory = wasmInstance!.exports.memory as WebAssembly.Memory;
        const text = new TextDecoder().decode(
          new Uint8Array(memory.buffer, ptr, len)
        );
        console.log("[WASM]", text);
      },
    },
  };

  const { instance } = await WebAssembly.instantiate(bytes, importObject);
  wasmInstance = instance;
  return instance;
}

// Use the WASM module in a message handler
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "PROCESS") {
    loadWasm().then((instance) => {
      const process = instance.exports.process as (n: number) => number;
      sendResponse({ result: process(msg.value) });
    });
    return true; // async response
  }
});
```

Gotchas:
- The WASM file can be fetched from the service worker using `chrome.runtime.getURL` without listing it in `web_accessible_resources`. However, if content scripts need to fetch the file, it must be listed in `web_accessible_resources`.
- Service workers terminate after ~30 seconds of inactivity. The WASM instance is lost on termination and must be re-instantiated. Cache the compiled module (see Pattern 3) to speed up restarts.
- `instantiateStreaming` may fail in service worker contexts on some Chrome versions. Always fall back to `ArrayBuffer`-based instantiation.

---

Pattern 2: Loading WASM in Content Scripts {#pattern-2-loading-wasm-in-content-scripts}

Content scripts run in an isolated world but can load WASM modules. The module must be declared in `web_accessible_resources` so the content script can fetch it.

```typescript
// manifest.json (partial)
// {
//   "web_accessible_resources": [{
//     "resources": ["wasm/analyzer.wasm"],
//     "matches": ["https://*.example.com/*"]
//   }]
// }

// content.ts
async function loadAnalyzer(): Promise<WebAssembly.Instance> {
  const wasmUrl = chrome.runtime.getURL("wasm/analyzer.wasm");
  const response = await fetch(wasmUrl);
  const bytes = await response.arrayBuffer();

  const { instance } = await WebAssembly.instantiate(bytes, {
    env: {
      now: () => performance.now(),
    },
  });

  return instance;
}

// Example: analyze DOM text content with WASM
async function analyzePageContent(): Promise<number> {
  const instance = await loadAnalyzer();
  const memory = instance.exports.memory as WebAssembly.Memory;
  const alloc = instance.exports.alloc as (size: number) => number;
  const analyze = instance.exports.analyze as (ptr: number, len: number) => number;

  const text = document.body.innerText;
  const encoded = new TextEncoder().encode(text);

  // Allocate memory in WASM and copy data
  const ptr = alloc(encoded.length);
  new Uint8Array(memory.buffer, ptr, encoded.length).set(encoded);

  return analyze(ptr, encoded.length);
}
```

Gotchas:
- Exposing WASM files via `web_accessible_resources` makes them accessible to the host page. Scope `matches` to only the domains that need access.
- Content scripts share the page's CSP constraints for network requests, but WASM compilation uses the extension's own CSP.
- Large WASM modules in content scripts increase memory usage per tab. Consider offloading to the service worker and communicating results via messaging.

---

Pattern 3: WASM Module Caching with chrome.storage {#pattern-3-wasm-module-caching-with-chromestorage}

Compiling WASM from bytes is expensive. Cache the compiled module bytes in `chrome.storage.local` to avoid re-fetching on every service worker restart.

```typescript
// wasm-cache.ts
const WASM_CACHE_KEY = "wasm_module_v1";

interface CachedModule {
  bytes: number[];
  version: string;
  timestamp: number;
}

async function getCachedModule(
  wasmPath: string,
  version: string
): Promise<WebAssembly.Module> {
  // Try cache first
  const { [WASM_CACHE_KEY]: cached } = await chrome.storage.local.get(
    WASM_CACHE_KEY
  );

  if (cached && (cached as CachedModule).version === version) {
    const bytes = new Uint8Array((cached as CachedModule).bytes);
    return WebAssembly.compile(bytes);
  }

  // Fetch and cache
  const url = chrome.runtime.getURL(wasmPath);
  const response = await fetch(url);
  const bytes = await response.arrayBuffer();
  const byteArray = Array.from(new Uint8Array(bytes));

  await chrome.storage.local.set({
    [WASM_CACHE_KEY]: {
      bytes: byteArray,
      version,
      timestamp: Date.now(),
    } satisfies CachedModule,
  });

  return WebAssembly.compile(bytes);
}

async function instantiateCached(
  wasmPath: string,
  version: string,
  imports: WebAssembly.Imports
): Promise<WebAssembly.Instance> {
  const module = await getCachedModule(wasmPath, version);
  return WebAssembly.instantiate(module, imports);
}

// Usage
const instance = await instantiateCached(
  "wasm/processor.wasm",
  "1.2.0",
  { env: { /* ... */ } }
);
```

Gotchas:
- `chrome.storage.local` has a default quota of ~10 MB. Large WASM modules (several MB) can consume significant storage. Use `chrome.storage.local.getBytesInUse` to monitor.
- Storing binary data as `number[]` increases size due to JSON serialization overhead. For modules over 1 MB, consider using IndexedDB instead (available in service workers since Chrome 108).
- Always version your cache key so that extension updates load the new WASM binary.

---

Pattern 4: Memory Management for WASM Modules {#pattern-4-memory-management-for-wasm-modules}

WASM linear memory must be managed carefully, especially in long-running extension contexts where leaks accumulate.

```typescript
// memory-manager.ts
class WasmMemoryManager {
  private memory: WebAssembly.Memory;
  private alloc: (size: number) => number;
  private dealloc: (ptr: number, size: number) => void;
  private allocations: Map<number, number> = new Map(); // ptr -> size

  constructor(instance: WebAssembly.Instance) {
    this.memory = instance.exports.memory as WebAssembly.Memory;
    this.alloc = instance.exports.alloc as (size: number) => number;
    this.dealloc = instance.exports.dealloc as (
      ptr: number,
      size: number
    ) => void;
  }

  allocate(size: number): number {
    const ptr = this.alloc(size);
    if (ptr === 0) {
      throw new Error(`WASM allocation failed for ${size} bytes`);
    }
    this.allocations.set(ptr, size);
    return ptr;
  }

  free(ptr: number): void {
    const size = this.allocations.get(ptr);
    if (size === undefined) {
      console.warn("Attempting to free unknown pointer:", ptr);
      return;
    }
    this.dealloc(ptr, size);
    this.allocations.delete(ptr);
  }

  writeString(str: string): { ptr: number; len: number } {
    const encoded = new TextEncoder().encode(str);
    const ptr = this.allocate(encoded.length);
    new Uint8Array(this.memory.buffer, ptr, encoded.length).set(encoded);
    return { ptr, len: encoded.length };
  }

  readString(ptr: number, len: number): string {
    return new TextDecoder().decode(
      new Uint8Array(this.memory.buffer, ptr, len)
    );
  }

  writeBytes(data: Uint8Array): number {
    const ptr = this.allocate(data.length);
    new Uint8Array(this.memory.buffer, ptr, data.length).set(data);
    return ptr;
  }

  readBytes(ptr: number, len: number): Uint8Array {
    return new Uint8Array(this.memory.buffer, ptr, len).slice();
  }

  freeAll(): void {
    for (const [ptr, size] of this.allocations) {
      this.dealloc(ptr, size);
    }
    this.allocations.clear();
  }

  get stats(): { allocations: number; totalBytes: number } {
    let totalBytes = 0;
    for (const size of this.allocations.values()) {
      totalBytes += size;
    }
    return { allocations: this.allocations.size, totalBytes };
  }
}
```

Gotchas:
- WASM memory can only grow, never shrink. If your module allocates heavily, memory usage increases monotonically until the context (service worker or tab) is destroyed.
- When the service worker restarts, all WASM memory is reclaimed. This is actually beneficial -- treat SW termination as automatic garbage collection.
- The `memory.buffer` reference becomes invalid after `memory.grow()`. Always re-read `memory.buffer` after any operation that might grow memory.

---

Pattern 5: Passing Data Between JS and WASM {#pattern-5-passing-data-between-js-and-wasm}

WASM only understands numeric types natively. Strings, objects, and arrays must be serialized into linear memory.

```typescript
// data-bridge.ts

interface WasmExports {
  memory: WebAssembly.Memory;
  alloc: (size: number) => number;
  dealloc: (ptr: number, size: number) => void;
  process_json: (ptr: number, len: number) => number;
  get_result_ptr: () => number;
  get_result_len: () => number;
}

class WasmDataBridge {
  private exports: WasmExports;

  constructor(instance: WebAssembly.Instance) {
    this.exports = instance.exports as unknown as WasmExports;
  }

  // Pass a JS object to WASM as JSON
  callWithJson<TInput, TOutput>(
    fn: (ptr: number, len: number) => number,
    data: TInput
  ): TOutput {
    const json = JSON.stringify(data);
    const encoded = new TextEncoder().encode(json);

    const ptr = this.exports.alloc(encoded.length);
    const view = new Uint8Array(this.exports.memory.buffer, ptr, encoded.length);
    view.set(encoded);

    const status = fn.call(null, ptr, encoded.length);
    this.exports.dealloc(ptr, encoded.length);

    if (status !== 0) {
      throw new Error(`WASM function returned error code: ${status}`);
    }

    // Read result
    const resultPtr = this.exports.get_result_ptr();
    const resultLen = this.exports.get_result_len();
    const resultBytes = new Uint8Array(
      this.exports.memory.buffer,
      resultPtr,
      resultLen
    );
    const resultJson = new TextDecoder().decode(resultBytes);

    return JSON.parse(resultJson) as TOutput;
  }

  // Pass typed arrays directly (zero-copy for numeric data)
  passFloat64Array(data: Float64Array): number {
    const byteLen = data.byteLength;
    const ptr = this.exports.alloc(byteLen);
    const view = new Float64Array(
      this.exports.memory.buffer,
      ptr,
      data.length
    );
    view.set(data);
    return ptr;
  }

  // Read a typed array result from WASM
  readFloat64Array(ptr: number, length: number): Float64Array {
    return new Float64Array(
      this.exports.memory.buffer,
      ptr,
      length
    ).slice(); // slice() to copy out of WASM memory
  }
}

// Usage in extension
const bridge = new WasmDataBridge(instance);

interface AnalysisInput {
  text: string;
  options: { caseSensitive: boolean; maxResults: number };
}

interface AnalysisResult {
  matches: number;
  score: number;
}

const result = bridge.callWithJson<AnalysisInput, AnalysisResult>(
  instance.exports.process_json as (ptr: number, len: number) => number,
  { text: "hello world", options: { caseSensitive: false, maxResults: 10 } }
);
```

Gotchas:
- JSON serialization adds overhead. For hot paths with numeric data, pass typed arrays directly into WASM memory instead of serializing to JSON.
- Always `.slice()` when reading typed arrays from WASM memory. Without slicing, the returned view shares the WASM buffer and becomes invalid if memory grows or the module is freed.
- String encoding must match between JS and WASM. Use UTF-8 consistently. If your WASM module is compiled from Rust, its `String` type is already UTF-8.

---

Pattern 6: WASM for Crypto Operations in Extensions {#pattern-6-wasm-for-crypto-operations-in-extensions}

WASM excels at cryptographic operations that would be slow in pure JavaScript. This is useful for extensions that handle encryption, hashing, or signature verification client-side.

```typescript
// crypto-wasm.ts

interface CryptoWasmExports {
  memory: WebAssembly.Memory;
  alloc: (size: number) => number;
  dealloc: (ptr: number, size: number) => void;
  sha256: (inputPtr: number, inputLen: number, outputPtr: number) => void;
  argon2_hash: (
    passwordPtr: number,
    passwordLen: number,
    saltPtr: number,
    saltLen: number,
    outputPtr: number,
    iterations: number,
    memoryKb: number
  ) => number;
  aes_gcm_encrypt: (
    keyPtr: number,
    keyLen: number,
    noncePtr: number,
    dataPtr: number,
    dataLen: number,
    outputPtr: number
  ) => number;
}

class ExtensionCrypto {
  private exports: CryptoWasmExports;

  constructor(instance: WebAssembly.Instance) {
    this.exports = instance.exports as unknown as CryptoWasmExports;
  }

  async sha256(data: Uint8Array): Promise<Uint8Array> {
    const inputPtr = this.exports.alloc(data.length);
    const outputPtr = this.exports.alloc(32); // SHA-256 is always 32 bytes

    new Uint8Array(this.exports.memory.buffer, inputPtr, data.length).set(data);
    this.exports.sha256(inputPtr, data.length, outputPtr);

    const hash = new Uint8Array(this.exports.memory.buffer, outputPtr, 32).slice();

    this.exports.dealloc(inputPtr, data.length);
    this.exports.dealloc(outputPtr, 32);

    return hash;
  }

  async hashPassword(
    password: string,
    salt: Uint8Array
  ): Promise<Uint8Array> {
    const passwordBytes = new TextEncoder().encode(password);
    const passwordPtr = this.exports.alloc(passwordBytes.length);
    const saltPtr = this.exports.alloc(salt.length);
    const outputPtr = this.exports.alloc(32);

    new Uint8Array(
      this.exports.memory.buffer, passwordPtr, passwordBytes.length
    ).set(passwordBytes);
    new Uint8Array(
      this.exports.memory.buffer, saltPtr, salt.length
    ).set(salt);

    const status = this.exports.argon2_hash(
      passwordPtr, passwordBytes.length,
      saltPtr, salt.length,
      outputPtr,
      3,    // iterations
      65536 // 64 MB memory cost
    );

    if (status !== 0) {
      throw new Error("Argon2 hashing failed");
    }

    const hash = new Uint8Array(this.exports.memory.buffer, outputPtr, 32).slice();

    this.exports.dealloc(passwordPtr, passwordBytes.length);
    this.exports.dealloc(saltPtr, salt.length);
    this.exports.dealloc(outputPtr, 32);

    return hash;
  }
}

// Usage in background service worker
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "HASH_PASSWORD") {
    loadCryptoWasm().then(async (crypto) => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await crypto.hashPassword(msg.password, salt);
      sendResponse({
        hash: Array.from(hash),
        salt: Array.from(salt),
      });
    });
    return true;
  }
});
```

Gotchas:
- For simple hashing (SHA-256, SHA-512), the Web Crypto API (`crypto.subtle`) is already fast and available in service workers. Use WASM only for algorithms not in Web Crypto (Argon2, scrypt, custom ciphers).
- Memory-hard algorithms like Argon2 require significant WASM memory. Ensure the initial memory allocation in the WASM module is large enough, or configure `WebAssembly.Memory` with adequate `initial` and `maximum` pages.
- Sensitive data (passwords, keys) stored in WASM linear memory is not automatically zeroed. Overwrite buffers with zeros after use.

---

Pattern 7: Performance Comparison -- JS vs WASM in Extensions {#pattern-7-performance-comparison-js-vs-wasm-in-extensions}

Not everything benefits from WASM. Here is a framework for benchmarking and deciding when WASM is worthwhile.

```typescript
// benchmark.ts

interface BenchmarkResult {
  name: string;
  jsTimeMs: number;
  wasmTimeMs: number;
  speedup: string;
  recommendation: string;
}

async function benchmark(
  name: string,
  jsFn: () => void,
  wasmFn: () => void,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  // Warm up
  for (let i = 0; i < 10; i++) {
    jsFn();
    wasmFn();
  }

  // Benchmark JS
  const jsStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    jsFn();
  }
  const jsTime = performance.now() - jsStart;

  // Benchmark WASM
  const wasmStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    wasmFn();
  }
  const wasmTime = performance.now() - wasmStart;

  const speedup = jsTime / wasmTime;

  return {
    name,
    jsTimeMs: Math.round(jsTime * 100) / 100,
    wasmTimeMs: Math.round(wasmTime * 100) / 100,
    speedup: `${speedup.toFixed(2)}x`,
    recommendation:
      speedup > 2
        ? "Use WASM"
        : speedup > 1.2
          ? "WASM marginal, consider complexity trade-off"
          : "Stick with JS",
  };
}

// Example benchmarks for common extension tasks
async function runExtensionBenchmarks(
  wasmInstance: WebAssembly.Instance
): Promise<void> {
  const results: BenchmarkResult[] = [];
  const exports = wasmInstance.exports as Record<string, Function>;

  // 1. Image processing (pixel manipulation)
  const imageData = new Uint8Array(1920 * 1080 * 4); // Full HD RGBA
  crypto.getRandomValues(imageData);

  results.push(
    await benchmark(
      "Image grayscale (1080p)",
      () => {
        for (let i = 0; i < imageData.length; i += 4) {
          const avg = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
          imageData[i] = imageData[i + 1] = imageData[i + 2] = avg;
        }
      },
      () => exports.grayscale(imageData.length),
      10
    )
  );

  // 2. String search (regex-like pattern matching)
  const text = "a".repeat(10000);
  results.push(
    await benchmark(
      "Pattern search (20KB text)",
      () => text.indexOf("search_pattern"),
      () => exports.find_pattern(text.length),
      100
    )
  );

  // 3. JSON parsing
  const jsonStr = JSON.stringify({ data: Array(1000).fill({ x: 1, y: 2 }) });
  results.push(
    await benchmark(
      "JSON parse (structured data)",
      () => JSON.parse(jsonStr),
      () => exports.parse_json(jsonStr.length),
      100
    )
  );

  console.table(results);
}
```

When WASM wins in extensions:

| Task | Typical Speedup | Notes |
|---|---|---|
| Image/video processing | 3-10x | Pixel-level operations on large buffers |
| Cryptographic hashing | 2-5x | Argon2, bcrypt, custom ciphers |
| Data compression | 2-8x | zlib, brotli, custom codecs |
| Complex parsing | 2-4x | Binary formats, protocol buffers |
| Math-heavy computation | 3-15x | Signal processing, simulations |

When JS is sufficient:

| Task | Why JS Wins |
|---|---|
| DOM manipulation | WASM cannot access DOM directly |
| Simple string operations | V8 is heavily optimized for strings |
| Small data transforms | Marshaling overhead dominates |
| Chrome API calls | All chrome.* APIs are JS-only |
| JSON handling | V8's native JSON.parse is very fast |

Gotchas:
- The marshaling cost (copying data between JS and WASM memory) can negate WASM's raw speed advantage for small inputs. Benchmark with realistic data sizes.
- V8 optimizes hot JS code aggressively (TurboFan). Simple loops in JS may approach WASM speed after JIT compilation.
- In service workers, WASM instantiation cost is paid on every wake-up unless you cache the compiled module (Pattern 3).

---

Pattern 8: CSP Considerations for WASM in MV3 {#pattern-8-csp-considerations-for-wasm-in-mv3}

Manifest V3 enforces a strict Content Security Policy. WASM compilation requires explicitly opting in via CSP configuration.

```typescript
// MV3 default CSP (implicit):
// script-src 'self';
// object-src 'self';

// IMPORTANT: 'wasm-unsafe-eval' is NOT included by default in MV3.
// You must explicitly add it to your manifest to use WebAssembly:

// manifest.json -- required for WASM support
// {
//   "content_security_policy": {
//     "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
//   }
// }
```

Verifying WASM Loads Under CSP {#verifying-wasm-loads-under-csp}

```typescript
// csp-check.ts
async function verifyWasmSupport(): Promise<{
  supported: boolean;
  error?: string;
}> {
  try {
    // Minimal valid WASM module (8 bytes: magic number + version)
    const minimalWasm = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // \0asm magic
      0x01, 0x00, 0x00, 0x00, // version 1
    ]);
    await WebAssembly.compile(minimalWasm);
    return { supported: true };
  } catch (err) {
    return {
      supported: false,
      error: `WASM blocked by CSP: ${(err as Error).message}`,
    };
  }
}

// Run on extension startup
chrome.runtime.onInstalled.addListener(async () => {
  const { supported, error } = await verifyWasmSupport();
  if (!supported) {
    console.error("WASM not available:", error);
  }
});
```

Loading WASM Safely Across Contexts {#loading-wasm-safely-across-contexts}

```typescript
// wasm-loader.ts
type WasmContext = "service-worker" | "extension-page" | "content-script";

function detectContext(): WasmContext {
  if (
    typeof ServiceWorkerGlobalScope !== "undefined" &&
    self instanceof ServiceWorkerGlobalScope
  ) {
    return "service-worker";
  }
  if (typeof window !== "undefined" && chrome.runtime?.id) {
    return "extension-page";
  }
  return "content-script";
}

async function loadWasmModule(
  path: string,
  imports: WebAssembly.Imports = {}
): Promise<WebAssembly.Instance> {
  const context = detectContext();
  const url = chrome.runtime.getURL(path);

  switch (context) {
    case "service-worker":
    case "extension-page": {
      // Extension CSP applies -- wasm-unsafe-eval is available
      const response = await fetch(url);
      const bytes = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, imports);
      return instance;
    }

    case "content-script": {
      // Content scripts use the extension's CSP for WASM compilation,
      // but the host page's CSP for network requests.
      // Fetching from chrome.runtime.getURL bypasses the host page CSP.
      try {
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, imports);
        return instance;
      } catch (err) {
        // Fallback: ask the service worker to compile and send the bytes
        console.warn(
          "Direct WASM load failed in content script, falling back to SW"
        );
        const bytes = await chrome.runtime.sendMessage({
          type: "GET_WASM_BYTES",
          path,
        });
        const { instance } = await WebAssembly.instantiate(
          new Uint8Array(bytes),
          imports
        );
        return instance;
      }
    }
  }
}

// Service worker handler for the fallback path
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_WASM_BYTES") {
    const url = chrome.runtime.getURL(msg.path);
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => sendResponse(Array.from(new Uint8Array(buf))));
    return true;
  }
});
```

CSP Quick Reference for WASM {#csp-quick-reference-for-wasm}

| Directive | MV3 Default | Effect on WASM |
|---|---|---|
| `wasm-unsafe-eval` | Not included by default | Must be explicitly added to allow `WebAssembly.compile()` and `instantiate()` |
| `script-src 'self'` | Included | WASM files must be bundled with the extension |
| `script-src 'unsafe-eval'` | Forbidden in MV3 | Cannot use `eval()`, but WASM is unaffected |
| No `wasm-unsafe-eval` | Default state | Blocks all WASM compilation |

Gotchas:
- MV3 does not automatically include `wasm-unsafe-eval` in the extension pages CSP. You must explicitly add `'wasm-unsafe-eval'` to `content_security_policy.extension_pages` in your manifest for WASM to work. Without it, `WebAssembly.compile()` and `WebAssembly.instantiate()` will be blocked by CSP.
- Content scripts compile WASM under the extension's CSP, not the host page's CSP. This means WASM works in content scripts even on pages with restrictive CSPs.
- Sandbox pages (`content_security_policy.sandbox`) can use `wasm-unsafe-eval` independently. This is useful for isolating WASM execution in an iframe.
- Remote WASM files cannot be loaded in MV3. All WASM modules must be bundled in the extension package. Fetch from `chrome.runtime.getURL` only.

---

Summary {#summary}

| Pattern | Best For | Key Consideration |
|---|---|---|
| SW loading | Background processing | Re-instantiation on wake-up |
| Content script loading | Per-page analysis | Memory per tab, `web_accessible_resources` |
| Module caching | Fast SW restarts | Storage quota, versioning |
| Memory management | Long-running tasks | Linear memory only grows |
| Data bridging | Complex inputs/outputs | Marshaling overhead |
| Crypto operations | Argon2, custom ciphers | Check Web Crypto first |
| Performance benchmarking | Build vs. buy decisions | Realistic data sizes |
| CSP configuration | Deployment correctness | Keep `wasm-unsafe-eval` |

WASM is a powerful tool for Chrome extensions, but it adds complexity. Use it when profiling shows a clear bottleneck that JS cannot solve, and prefer the Web Platform APIs (Web Crypto, Compression Streams) when they cover your use case.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
