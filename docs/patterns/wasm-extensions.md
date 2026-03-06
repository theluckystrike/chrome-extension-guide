# WebAssembly in Chrome Extensions

## Overview

WebAssembly brings near-native performance to Chrome extensions for CPU-intensive tasks like cryptography, text processing, and data parsing. MV3's execution contexts each impose different constraints on WASM loading. This guide covers eight production-ready patterns.

---

## Quick Reference

| Pattern | Context | CSP Needed | Streaming | Best For |
|---|---|---|---|---|
| 1. Service Worker Loading | Background | `wasm-unsafe-eval` | No | Lightweight modules |
| 2. Content Script Loading | Content script | Host page CSP | No | Page-scoped compute |
| 3. Offscreen Document | Offscreen | `wasm-unsafe-eval` | Yes | Full WASM support |
| 4. Bundler Integration | Build time | Varies | Varies | Production builds |
| 5. JS/WASM Data Passing | Any | Varies | N/A | Interop patterns |
| 6. Text Processing | Any | Varies | N/A | Regex, parsing |
| 7. Cryptography | Any | Varies | N/A | Hashing, encryption |
| 8. CSP Configuration | manifest.json | N/A | N/A | Security policy |

---

## Pattern 1: Loading WASM in Service Workers

Service workers cannot use `instantiateStreaming`. Fetch the binary as an `ArrayBuffer` and use `WebAssembly.instantiate` instead.

```ts
let wasmInstance: WebAssembly.Instance | null = null;

async function loadWasm(): Promise<WebAssembly.Instance> {
  if (wasmInstance) return wasmInstance;
  const url = chrome.runtime.getURL("wasm/processor.wasm");
  const bytes = await (await fetch(url)).arrayBuffer();
  const result = await WebAssembly.instantiate(bytes, {
    env: { abort: () => { throw new Error("WASM abort"); } },
  });
  wasmInstance = result.instance;
  return wasmInstance;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "WASM_COMPUTE") {
    loadWasm().then((inst) => {
      const fn = inst.exports.compute as (n: number) => number;
      sendResponse({ result: fn(msg.payload) });
    });
    return true;
  }
});
```

Declare the file in `web_accessible_resources` so the service worker can fetch it:

```jsonc
// manifest.json
{
  "web_accessible_resources": [{
    "resources": ["wasm/*.wasm"],
    "matches": ["<all_urls>"]
  }]
}
```

Cache the instance in a module variable, but expect it to be lost on service worker restart. For faster reload, cache the compiled `WebAssembly.Module` in IndexedDB since it survives worker termination.

---

## Pattern 2: Loading WASM in Content Scripts

Content scripts inherit the **host page's** CSP for WASM execution. If the page blocks `wasm-unsafe-eval`, loading fails. Probe first, then fall back to the background.

```ts
async function getWasmStrategy(): Promise<"local" | "remote"> {
  try {
    // Smallest valid WASM module: magic number + version
    new WebAssembly.Module(
      new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    );
    return "local";
  } catch {
    return "remote";
  }
}

async function processData(data: Uint8Array): Promise<Uint8Array> {
  if ((await getWasmStrategy()) === "local") {
    const url = chrome.runtime.getURL("wasm/parser.wasm");
    const bytes = await (await fetch(url)).arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const fn = instance.exports.parse as (ptr: number, len: number) => number;
    // ... use WASM directly
    return data;
  }
  // Delegate to service worker when CSP blocks WASM
  const resp = await chrome.runtime.sendMessage({
    type: "WASM_PROCESS",
    payload: Array.from(data),
  });
  return new Uint8Array(resp.result);
}
```

---

## Pattern 3: Loading WASM in Offscreen Documents

Offscreen documents have full WASM support including `instantiateStreaming`. This is the recommended context for heavy workloads.

```ts
// offscreen/wasm-runner.ts
interface WasmExports {
  memory: WebAssembly.Memory;
  process_data: (ptr: number, len: number) => number;
  alloc: (size: number) => number;
  dealloc: (ptr: number, size: number) => void;
}

let exports: WasmExports | null = null;

async function init(): Promise<WasmExports> {
  if (exports) return exports;
  const url = chrome.runtime.getURL("wasm/engine.wasm");
  const { instance } = await WebAssembly.instantiateStreaming(fetch(url), {});
  exports = instance.exports as unknown as WasmExports;
  return exports;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "OFFSCREEN_WASM") return;
  init().then((wasm) => {
    const input = new Uint8Array(msg.payload);
    const ptr = wasm.alloc(input.length);
    new Uint8Array(wasm.memory.buffer).set(input, ptr);
    const outLen = wasm.process_data(ptr, input.length);
    const result = new Uint8Array(wasm.memory.buffer).slice(ptr, ptr + outLen);
    wasm.dealloc(ptr, input.length);
    sendResponse(Array.from(result));
  });
  return true;
});
```

---

## Pattern 4: Bundling WASM with Vite/webpack

### Vite with vite-plugin-wasm

```ts
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  build: {
    target: "esnext",
    rollupOptions: {
      output: { assetFileNames: "wasm/[name][extname]" },
    },
  },
});
```

### wasm-pack output integration

```ts
import init, { process_text } from "../wasm/pkg/my_crate";

let ready = false;
export async function ensureWasm(): Promise<void> {
  if (ready) return;
  await init(chrome.runtime.getURL("wasm/my_crate_bg.wasm"));
  ready = true;
}
export { process_text };
```

### Emscripten loader

```ts
import createModule from "../wasm/pkg/module.js";

export async function loadEmscriptenModule() {
  return createModule({
    locateFile: (path: string) => chrome.runtime.getURL(`wasm/${path}`),
  });
}
```

Emscripten output may use `eval` internally. If so, load it in a sandboxed page (see Pattern 8).

---

## Pattern 5: Passing Data Between JS and WASM

WASM linear memory is a flat `ArrayBuffer`. Data must be explicitly copied in and out. Refresh views after any allocation because `memory.buffer` can be detached when memory grows.

```ts
class WasmBridge {
  constructor(
    private memory: WebAssembly.Memory,
    private alloc: (size: number) => number,
    private dealloc: (ptr: number, size: number) => void
  ) {}

  writeString(str: string): [number, number] {
    const encoded = new TextEncoder().encode(str);
    const ptr = this.alloc(encoded.length);
    new Uint8Array(this.memory.buffer).set(encoded, ptr);
    return [ptr, encoded.length];
  }

  readString(ptr: number, len: number): string {
    return new TextDecoder().decode(
      new Uint8Array(this.memory.buffer, ptr, len)
    );
  }

  writeBytes(data: Uint8Array): [number, number] {
    const ptr = this.alloc(data.length);
    new Uint8Array(this.memory.buffer).set(data, ptr);
    return [ptr, data.length];
  }

  readBytes(ptr: number, len: number): Uint8Array {
    return new Uint8Array(this.memory.buffer).slice(ptr, ptr + len);
  }

  free(ptr: number, len: number): void {
    this.dealloc(ptr, len);
  }
}
```

For zero-copy sharing, use `SharedArrayBuffer` with shared memory:

```ts
function createSharedWasmMemory(pages: number): WebAssembly.Memory {
  return new WebAssembly.Memory({
    initial: pages,
    maximum: pages * 4,
    shared: true, // Requires cross-origin isolation headers
  });
}
```

Shared memory is available in extension pages but not content scripts.

---

## Pattern 6: High-Performance Text Processing

WASM excels at regex matching and parsing on large inputs where JS overhead is noticeable.

```ts
class WasmTextProcessor {
  private bridge: WasmBridge;
  constructor(
    private wasm: {
      memory: WebAssembly.Memory;
      alloc: (n: number) => number;
      dealloc: (p: number, n: number) => void;
      count_matches: (tp: number, tl: number, pp: number, pl: number) => number;
      extract_emails: (tp: number, tl: number, op: number) => number;
    }
  ) {
    this.bridge = new WasmBridge(wasm.memory, wasm.alloc, wasm.dealloc);
  }

  countMatches(text: string, pattern: string): number {
    const [tp, tl] = this.bridge.writeString(text);
    const [pp, pl] = this.bridge.writeString(pattern);
    const count = this.wasm.count_matches(tp, tl, pp, pl);
    this.bridge.free(tp, tl);
    this.bridge.free(pp, pl);
    return count;
  }

  extractEmails(text: string): string[] {
    const [tp, tl] = this.bridge.writeString(text);
    const outCap = 256_000;
    const op = this.wasm.alloc(outCap);
    const len = this.wasm.extract_emails(tp, tl, op);
    const raw = this.bridge.readString(op, len);
    this.bridge.free(tp, tl);
    this.bridge.free(op, outCap);
    return raw.split("\0").filter(Boolean);
  }
}
```

WASM regex engines like `regex-automata` (Rust) outperform JS `RegExp` by 3-10x on large documents (100KB+). For simple patterns on small text, JS is faster due to copy overhead.

---

## Pattern 7: Cryptography in Extensions

WASM enables battle-tested crypto libraries (RustCrypto, libsodium) for algorithms Web Crypto does not support.

```ts
class WasmCrypto {
  private bridge: WasmBridge;
  constructor(private wasm: any) {
    this.bridge = new WasmBridge(wasm.memory, wasm.alloc, wasm.dealloc);
  }

  sha256(data: Uint8Array): Uint8Array {
    const [dp, dl] = this.bridge.writeBytes(data);
    const op = this.wasm.alloc(32);
    this.wasm.sha256(dp, dl, op);
    const hash = this.bridge.readBytes(op, 32);
    this.bridge.free(dp, dl);
    this.bridge.free(op, 32);
    return hash;
  }

  encrypt(key: Uint8Array, data: Uint8Array): Uint8Array {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const [kp, kl] = this.bridge.writeBytes(key);
    const [np, nl] = this.bridge.writeBytes(nonce);
    const [dp, dl] = this.bridge.writeBytes(data);
    const outCap = data.length + 16; // ciphertext + auth tag
    const op = this.wasm.alloc(outCap);

    const len = this.wasm.aes_gcm_encrypt(kp, kl, np, nl, dp, dl, op);
    const ct = this.bridge.readBytes(op, len);
    this.bridge.free(kp, kl);
    this.bridge.free(np, nl);
    this.bridge.free(dp, dl);
    this.bridge.free(op, outCap);

    // Prepend nonce to ciphertext
    const result = new Uint8Array(12 + ct.length);
    result.set(nonce, 0);
    result.set(ct, 12);
    return result;
  }
}
```

**When to choose WASM vs Web Crypto:** Use Web Crypto for standard algorithms (AES-GCM, RSA, ECDSA) since it is hardware-accelerated. Use WASM for Argon2, ChaCha20-Poly1305, BLAKE3, or custom KDFs.

---

## Pattern 8: CSP Considerations for WASM

WASM requires `wasm-unsafe-eval` in the extension CSP. This is distinct from `unsafe-eval`, which MV3 forbids.

```jsonc
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  }
}
```

For Emscripten modules that need `eval`, use a sandboxed page:

```jsonc
{
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'"
  },
  "sandbox": { "pages": ["sandbox.html"] }
}
```

Sandboxed pages have no `chrome.*` API access. Communicate via `window.postMessage`.

Runtime detection for choosing the right execution context:

```ts
async function isWasmAllowed(): Promise<boolean> {
  try {
    await WebAssembly.compile(
      new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    );
    return true;
  } catch {
    return false;
  }
}

async function chooseContext(): Promise<"local" | "offscreen" | "sandbox"> {
  if (await isWasmAllowed()) return "local";
  if (chrome.offscreen) return "offscreen";
  return "sandbox";
}
```

---

## Summary

| # | Pattern | Key Takeaway |
|---|---|---|
| 1 | Service Worker Loading | Use `instantiate` with `ArrayBuffer`; no streaming |
| 2 | Content Script Loading | Subject to host page CSP; probe before loading |
| 3 | Offscreen Documents | Full WASM support including `instantiateStreaming` |
| 4 | Bundler Integration | Configure Vite/webpack to emit `.wasm` alongside JS |
| 5 | JS/WASM Data Passing | Refresh views after allocations; memory can grow |
| 6 | Text Processing | WASM regex outperforms JS on large inputs (100KB+) |
| 7 | Cryptography | Use WASM for Argon2/BLAKE3; Web Crypto for standard algos |
| 8 | CSP Configuration | Add `wasm-unsafe-eval` to `extension_pages` CSP |

**General guidance:**

- Start with offscreen documents for serious WASM workloads.
- Use the service worker only for lightweight, fast-loading modules.
- Always add `wasm-unsafe-eval` to your extension CSP.
- Test content script WASM on restrictive sites (banking, enterprise portals).
- Prefer `wasm-pack` (Rust) for new projects; Emscripten for existing C/C++ code.
- Profile before assuming WASM is faster -- for small data, JS avoids copy overhead.
