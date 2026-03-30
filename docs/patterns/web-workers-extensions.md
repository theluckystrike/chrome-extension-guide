---
layout: default
title: "Chrome Extension Web Workers Extensions. Best Practices"
description: "Use Web Workers for background processing in extensions."
canonical_url: "https://bestchromeextensions.com/patterns/web-workers-extensions/"
last_modified_at: 2026-01-15
---

Web Workers in Chrome Extensions

Overview {#overview}

Web Workers run scripts on background threads, keeping the main thread responsive. In MV3 extensions, Workers cannot be created directly from service workers, but offscreen documents, popup pages, and other extension pages support them fully. This guide covers eight production-ready patterns for using Web Workers effectively.

---

Quick Reference {#quick-reference}

| Pattern | Where | Use Case | Complexity |
|---|---|---|---|
| 1. Workers in Offscreen Documents | Offscreen | Primary worker host | Low |
| 2. SharedWorker in Extension Pages | Popup/options | Cross-page state | Medium |
| 3. CPU-Intensive Tasks | Any page | Data processing, images | Low |
| 4. Typed Message Protocol | Any page | Type-safe communication | Medium |
| 5. Worker Pool | Offscreen | Parallel processing | High |
| 6. Transferable Objects | Any page | Zero-copy data passing | Medium |
| 7. Lifecycle Management | Offscreen | On-demand create/terminate | Medium |
| 8. Comlink RPC | Any page | Transparent async calls | Low |

---

Pattern 1: Web Workers in Offscreen Documents {#pattern-1-web-workers-in-offscreen-documents}

Offscreen documents are the primary host for Web Workers in MV3 since service workers cannot create them. Create the offscreen document, then spawn workers inside it.

```ts
// background/service-worker.ts
async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  if (contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: "Run Web Workers for CPU-intensive tasks",
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "HEAVY_COMPUTE") {
    ensureOffscreen().then(() => {
      chrome.runtime.sendMessage(
        { type: "WORKER_TASK", payload: msg.payload },
        sendResponse
      );
    });
    return true;
  }
});
```

```ts
// offscreen/offscreen.ts
const worker = new Worker("worker.js", { type: "module" });

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "WORKER_TASK") return;

  const handler = (e: MessageEvent) => {
    worker.removeEventListener("message", handler);
    sendResponse(e.data);
  };
  worker.addEventListener("message", handler);
  worker.postMessage(msg.payload);
  return true;
});
```

```ts
// offscreen/worker.ts
self.addEventListener("message", (e: MessageEvent) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
});

function heavyComputation(data: number[]): number {
  return data.reduce((sum, val) => sum + Math.sqrt(val), 0);
}
```

Offscreen documents are extension pages, so the worker script does not need to be listed in `web_accessible_resources`. It can be loaded directly by path since the offscreen document runs in the extension origin.

---

Pattern 2: SharedWorker Patterns in Extension Pages {#pattern-2-sharedworker-patterns-in-extension-pages}

SharedWorkers allow multiple extension pages (popup, options, side panel) to share a single worker instance and its state.

```ts
// shared/shared-worker.ts
const connections: MessagePort[] = [];
let sharedState: Record<string, unknown> = {};

self.addEventListener("connect", (e: MessageEvent) => {
  const port = e.ports[0];
  connections.push(port);

  port.addEventListener("message", (event: MessageEvent) => {
    const { action, key, value } = event.data;

    if (action === "set") {
      sharedState[key] = value;
      for (const conn of connections) {
        conn.postMessage({ type: "state_update", key, value });
      }
    } else if (action === "get") {
      port.postMessage({ type: "state_value", key, value: sharedState[key] });
    }
  });

  port.start();
  port.postMessage({ type: "connected", clientCount: connections.length });
});
```

```ts
// popup/popup.ts
const worker = new SharedWorker(
  chrome.runtime.getURL("shared-worker.js"),
  { type: "module", name: "extension-shared" }
);

worker.port.addEventListener("message", (e: MessageEvent) => {
  if (e.data.type === "state_update") {
    updateUI(e.data.key, e.data.value);
  }
});
worker.port.start();

// Set state visible to all extension pages
worker.port.postMessage({ action: "set", key: "lastAction", value: Date.now() });
```

SharedWorkers persist as long as at least one page holds a reference. They terminate when all connecting pages close.

---

Pattern 3: Worker for CPU-Intensive Tasks {#pattern-3-worker-for-cpu-intensive-tasks}

Offload heavy computation to keep the UI responsive. Common use cases: data transformation, image processing, JSON parsing of large payloads.

```ts
// workers/image-processor.ts
self.addEventListener("message", async (e: MessageEvent) => {
  const { imageData, operation } = e.data as {
    imageData: ImageData;
    operation: "grayscale" | "blur" | "threshold";
  };

  const pixels = imageData.data;
  const result = new Uint8ClampedArray(pixels.length);

  switch (operation) {
    case "grayscale":
      for (let i = 0; i < pixels.length; i += 4) {
        const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        result[i] = result[i + 1] = result[i + 2] = avg;
        result[i + 3] = pixels[i + 3];
      }
      break;

    case "threshold":
      for (let i = 0; i < pixels.length; i += 4) {
        const val = ((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3) > 128 ? 255 : 0;
        result[i] = result[i + 1] = result[i + 2] = val;
        result[i + 3] = pixels[i + 3];
      }
      break;
  }

  const output = new ImageData(result, imageData.width, imageData.height);
  self.postMessage({ imageData: output }, { transfer: [output.data.buffer] });
});
```

---

Pattern 4: Typed Message Protocol Between Worker and Main Thread {#pattern-4-typed-message-protocol-between-worker-and-main-thread}

Define a strongly-typed protocol to prevent runtime errors from mismatched messages.

```ts
// shared/worker-protocol.ts
interface WorkerRequestMap {
  "parse-csv": { csv: string; delimiter: string };
  "sort-data": { data: number[]; order: "asc" | "desc" };
  "search": { haystack: string; needle: string };
}

interface WorkerResponseMap {
  "parse-csv": { rows: string[][]; columnCount: number };
  "sort-data": { sorted: number[] };
  "search": { indices: number[] };
}

type WorkerRequest<K extends keyof WorkerRequestMap> = {
  id: string;
  type: K;
  payload: WorkerRequestMap[K];
};

type WorkerResponse<K extends keyof WorkerResponseMap> = {
  id: string;
  type: K;
  payload: WorkerResponseMap[K];
} | {
  id: string;
  type: "error";
  payload: { message: string };
};
```

```ts
// shared/typed-worker-client.ts
class TypedWorkerClient {
  private pending = new Map<string, {
    resolve: (val: any) => void;
    reject: (err: Error) => void;
  }>();
  private nextId = 0;

  constructor(private worker: Worker) {
    worker.addEventListener("message", (e: MessageEvent) => {
      const { id, type, payload } = e.data;
      const req = this.pending.get(id);
      if (!req) return;
      this.pending.delete(id);
      type === "error" ? req.reject(new Error(payload.message)) : req.resolve(payload);
    });
  }

  send<K extends keyof WorkerRequestMap>(
    type: K,
    payload: WorkerRequestMap[K]
  ): Promise<WorkerResponseMap[K]> {
    const id = String(this.nextId++);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, payload });
    });
  }
}

// Usage
const client = new TypedWorkerClient(worker);
const { rows } = await client.send("parse-csv", { csv: rawText, delimiter: "," });
```

---

Pattern 5: Worker Pool for Parallel Processing {#pattern-5-worker-pool-for-parallel-processing}

Distribute work across multiple workers for true parallelism on multi-core machines.

```ts
class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{
    data: any; transfer?: Transferable[];
    resolve: (v: any) => void; reject: (e: Error) => void;
  }> = [];
  private busy = new Set<Worker>();

  constructor(scriptUrl: string, size: number) {
    for (let i = 0; i < size; i++) {
      this.workers.push(new Worker(scriptUrl, { type: "module" }));
    }
  }

  exec<T>(data: unknown, transfer?: Transferable[]): Promise<T> {
    return new Promise((resolve, reject) => {
      const idle = this.workers.find((w) => !this.busy.has(w));
      if (idle) this.dispatch(idle, data, transfer, resolve, reject);
      else this.queue.push({ data, transfer, resolve, reject });
    });
  }

  private dispatch(
    worker: Worker, data: unknown, transfer: Transferable[] | undefined,
    resolve: (v: any) => void, reject: (e: Error) => void
  ): void {
    this.busy.add(worker);
    const cleanup = () => { this.busy.delete(worker); this.dequeue(); };
    const onMsg = (e: MessageEvent) => {
      worker.removeEventListener("message", onMsg);
      worker.removeEventListener("error", onErr);
      cleanup();
      resolve(e.data);
    };
    const onErr = (e: ErrorEvent) => {
      worker.removeEventListener("message", onMsg);
      worker.removeEventListener("error", onErr);
      cleanup();
      reject(new Error(e.message));
    };
    worker.addEventListener("message", onMsg);
    worker.addEventListener("error", onErr);
    worker.postMessage(data, { transfer: transfer ?? [] });
  }

  private dequeue(): void {
    if (!this.queue.length) return;
    const idle = this.workers.find((w) => !this.busy.has(w));
    if (!idle) return;
    const { data, transfer, resolve, reject } = this.queue.shift()!;
    this.dispatch(idle, data, transfer, resolve, reject);
  }

  terminate(): void {
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
    this.busy.clear();
  }
}

// Usage: split data and process in parallel
const pool = new WorkerPool(
  chrome.runtime.getURL("workers/chunk-processor.js"),
  navigator.hardwareConcurrency || 4
);
const results = await Promise.all(chunks.map((c) => pool.exec(c)));
```

---

Pattern 6: Transferable Objects for Zero-Copy Data Passing {#pattern-6-transferable-objects-for-zero-copy-data-passing}

Transferable objects move ownership of memory instead of copying. Critical for large ArrayBuffers.

```ts
// BAD: Copies the entire buffer (slow for large data)
worker.postMessage({ buffer: largeArrayBuffer });

// GOOD: Transfers ownership (near-instant, original becomes detached)
worker.postMessage({ buffer: largeArrayBuffer }, {
  transfer: [largeArrayBuffer],
});
// largeArrayBuffer.byteLength === 0 after transfer
```

```ts
// workers/transfer-example.ts
self.addEventListener("message", (e: MessageEvent) => {
  const { buffer } = e.data as { buffer: ArrayBuffer };
  const view = new Float64Array(buffer);
  for (let i = 0; i < view.length; i++) {
    view[i] = Math.sqrt(view[i]);
  }
  // Transfer back to main thread
  self.postMessage({ buffer }, { transfer: [buffer] });
});
```

Transferable types include `ArrayBuffer`, `MessagePort`, `ImageBitmap`, `OffscreenCanvas`, `ReadableStream`, `WritableStream`, and `TransformStream`. For data that must stay accessible on both sides, use `SharedArrayBuffer` with `Atomics` for synchronization.

---

Pattern 7: Worker Lifecycle Management {#pattern-7-worker-lifecycle-management}

Create workers on demand and terminate them after an idle period to save memory.

```ts
class ManagedWorker {
  private worker: Worker | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private taskCount = 0;

  constructor(private scriptUrl: string, private idleMs = 30_000) {}

  async exec<T>(data: unknown, transfer?: Transferable[]): Promise<T> {
    const w = this.getOrCreate();
    this.taskCount++;
    this.clearIdle();

    return new Promise((resolve, reject) => {
      const done = (fn: Function, val: any) => {
        w.removeEventListener("message", onMsg);
        w.removeEventListener("error", onErr);
        this.taskCount--;
        if (this.taskCount === 0) this.startIdle();
        fn(val);
      };
      const onMsg = (e: MessageEvent) => done(resolve, e.data);
      const onErr = (e: ErrorEvent) => done(reject, new Error(e.message));
      w.addEventListener("message", onMsg);
      w.addEventListener("error", onErr);
      w.postMessage(data, { transfer: transfer ?? [] });
    });
  }

  private getOrCreate(): Worker {
    if (!this.worker) {
      this.worker = new Worker(this.scriptUrl, { type: "module" });
      this.startIdle();
    }
    return this.worker;
  }

  private startIdle(): void {
    this.clearIdle();
    this.idleTimer = setTimeout(() => this.terminate(), this.idleMs);
  }

  private clearIdle(): void {
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
  }

  terminate(): void {
    this.clearIdle();
    this.worker?.terminate();
    this.worker = null;
    this.taskCount = 0;
  }

  get isAlive(): boolean { return this.worker !== null; }
}

// Worker auto-terminates after 30s of inactivity
const managed = new ManagedWorker(chrome.runtime.getURL("workers/proc.js"));
const result = await managed.exec({ task: "analyze", data: input });
```

---

Pattern 8: Comlink for RPC-Style Worker Communication {#pattern-8-comlink-for-rpc-style-worker-communication}

Comlink (by Google) wraps `postMessage` into a proxy-based RPC interface, eliminating manual message protocol boilerplate.

```ts
// workers/api-worker.ts
import * as Comlink from "comlink";

class DataProcessor {
  async parseCsv(csv: string, delimiter = ","): Promise<string[][]> {
    return csv.split("\n").map((row) => row.split(delimiter));
  }

  async sortNumbers(data: number[], order: "asc" | "desc"): Promise<number[]> {
    return [...data].sort((a, b) => (order === "asc" ? a - b : b - a));
  }

  async hashText(text: string): Promise<string> {
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text)
    );
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

Comlink.expose(new DataProcessor());
```

```ts
// offscreen/comlink-client.ts
import * as Comlink from "comlink";

const worker = new Worker(
  chrome.runtime.getURL("workers/api-worker.js"),
  { type: "module" }
);

const api = Comlink.wrap<{
  parseCsv(csv: string, delimiter?: string): Promise<string[][]>;
  sortNumbers(data: number[], order: "asc" | "desc"): Promise<number[]>;
  hashText(text: string): Promise<string>;
}>(worker);

// Call worker methods as if they were local async functions
const rows = await api.parseCsv(rawCsv);
const sorted = await api.sortNumbers([3, 1, 4, 1, 5], "asc");
const hash = await api.hashText("hello world");

// Transfer large buffers with Comlink.transfer()
await api.processBuffer(Comlink.transfer(buffer, [buffer]));
```

Comlink adds ~4KB gzipped and eliminates boilerplate for request IDs, message routing, and error propagation.

---

Summary {#summary}

| # | Pattern | Key Takeaway |
|---|---|---|
| 1 | Offscreen Document Workers | Primary host for Workers in MV3; service workers cannot create them |
| 2 | SharedWorker | Share state across popup, options, and side panel pages |
| 3 | CPU-Intensive Tasks | Offload image processing, parsing, and transforms to workers |
| 4 | Typed Message Protocol | Use discriminated unions and request IDs for type-safe messaging |
| 5 | Worker Pool | Distribute chunks across `hardwareConcurrency` workers |
| 6 | Transferable Objects | Transfer ArrayBuffers for zero-copy; original becomes detached |
| 7 | Lifecycle Management | Create on demand, terminate after idle timeout to save memory |
| 8 | Comlink RPC | Proxy-based API eliminates message protocol boilerplate |

General guidance:

- Always host Workers in offscreen documents, not service workers.
- Use transferable objects for any data over 1MB.
- Terminate idle workers to avoid memory leaks.
- Consider Comlink when your worker has more than two or three message types.
- Size worker pools to `navigator.hardwareConcurrency` for optimal parallelism.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
