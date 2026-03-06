# Web Workers in Chrome Extensions

Web Workers provide a mechanism for running scripts in background threads, separate from the main execution thread. In Chrome extensions, workers are useful for offloading CPU-intensive tasks without blocking the UI or the service worker. This guide covers eight key patterns for using Web Workers effectively in Manifest V3 extensions.

> **Related guides:** [Offscreen Documents](offscreen-documents.md) | [Service Workers (MV3)](../mv3/service-workers.md)

---

## Pattern 1: Creating a Dedicated Worker from Extension Resources

Chrome extensions bundle their files as extension resources. To create a Web Worker, you must reference the script using `chrome.runtime.getURL()` so the browser resolves the path within the extension's origin.

```typescript
// content-script.ts or popup.ts
function createExtensionWorker(scriptPath: string): Worker {
  const workerURL = chrome.runtime.getURL(scriptPath);
  const worker = new Worker(workerURL, { type: "module" });
  return worker;
}

const worker = createExtensionWorker("workers/compute.js");

worker.onmessage = (event: MessageEvent) => {
  console.log("Result from worker:", event.data);
};

worker.postMessage({ task: "analyze", payload: [1, 2, 3] });
```

```typescript
// workers/compute.ts
self.onmessage = (event: MessageEvent) => {
  const { task, payload } = event.data;
  if (task === "analyze") {
    const result = payload.reduce((sum: number, n: number) => sum + n, 0);
    self.postMessage({ task, result });
  }
};
```

**Gotchas:**
- The worker script must be listed in `web_accessible_resources` in your manifest if it is loaded from a content script context.
- Workers created from extension pages (popup, options) do not need `web_accessible_resources` since they share the extension origin.
- Use `{ type: "module" }` to enable ES module imports inside the worker.

---

## Pattern 2: SharedWorker for Cross-Tab Communication

A `SharedWorker` allows multiple extension pages (popup, options, side panel) to share a single worker instance. This is useful for maintaining shared state across contexts without relying on `chrome.storage`.

```typescript
// shared-state-worker.ts
interface ClientPort {
  port: MessagePort;
  id: string;
}

const clients: ClientPort[] = [];
let sharedState: Record<string, unknown> = {};

self.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  const clientId = crypto.randomUUID();
  clients.push({ port, id: clientId });

  port.onmessage = (msg: MessageEvent) => {
    const { action, key, value } = msg.data;

    if (action === "set") {
      sharedState[key] = value;
      // Broadcast to all connected clients
      for (const client of clients) {
        client.port.postMessage({
          type: "state-update",
          key,
          value,
        });
      }
    } else if (action === "get") {
      port.postMessage({
        type: "state-response",
        key,
        value: sharedState[key],
      });
    }
  };

  port.start();
};
```

```typescript
// popup.ts or options.ts
const shared = new SharedWorker(
  chrome.runtime.getURL("workers/shared-state-worker.js")
);

shared.port.start();
shared.port.postMessage({ action: "set", key: "theme", value: "dark" });

shared.port.onmessage = (event: MessageEvent) => {
  if (event.data.type === "state-update") {
    console.log(`State changed: ${event.data.key} = ${event.data.value}`);
  }
};
```

**Gotchas:**
- `SharedWorker` is not available in content scripts -- only in extension pages that share the extension origin.
- The shared worker persists as long as at least one port is connected. When all pages close, the worker terminates.
- Service workers (background scripts) cannot create or connect to `SharedWorker` instances.

---

## Pattern 3: Worker Message Passing with Typed Messages

Untyped `postMessage` calls become error-prone as complexity grows. Define a discriminated union for messages to get compile-time safety.

```typescript
// types/worker-messages.ts
export interface ComputeRequest {
  type: "compute";
  id: string;
  expression: string;
  precision: number;
}

export interface CancelRequest {
  type: "cancel";
  id: string;
}

export type WorkerRequest = ComputeRequest | CancelRequest;

export interface ComputeResult {
  type: "result";
  id: string;
  value: number;
  elapsed: number;
}

export interface ComputeError {
  type: "error";
  id: string;
  message: string;
}

export interface ProgressUpdate {
  type: "progress";
  id: string;
  percent: number;
}

export type WorkerResponse = ComputeResult | ComputeError | ProgressUpdate;
```

```typescript
// worker-client.ts
import type { WorkerRequest, WorkerResponse } from "./types/worker-messages";

class TypedWorkerClient {
  private worker: Worker;
  private handlers = new Map<string, (response: WorkerResponse) => void>();

  constructor(scriptPath: string) {
    this.worker = new Worker(chrome.runtime.getURL(scriptPath), {
      type: "module",
    });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const handler = this.handlers.get(response.id);
      if (handler) {
        handler(response);
        if (response.type === "result" || response.type === "error") {
          this.handlers.delete(response.id);
        }
      }
    };
  }

  send(request: WorkerRequest): Promise<WorkerResponse> {
    return new Promise((resolve) => {
      this.handlers.set(request.id, resolve);
      this.worker.postMessage(request);
    });
  }

  terminate(): void {
    this.worker.terminate();
    this.handlers.clear();
  }
}
```

**Gotchas:**
- `postMessage` serializes data via the structured clone algorithm. Functions, DOM nodes, and class instances cannot be transferred.
- Always include an `id` field so the caller can match responses to requests.
- Consider adding a timeout mechanism on the client side to avoid hanging promises.

---

## Pattern 4: Offloading Heavy Computation to Workers

CPU-bound tasks such as image processing, data parsing, or cryptographic operations should run in a worker to keep the UI responsive.

```typescript
// workers/image-processor.ts
interface ProcessRequest {
  type: "process-image";
  imageData: ArrayBuffer;
  width: number;
  height: number;
  filter: "grayscale" | "invert" | "blur";
}

self.onmessage = (event: MessageEvent<ProcessRequest>) => {
  const { imageData, width, height, filter } = event.data;
  const pixels = new Uint8ClampedArray(imageData);

  switch (filter) {
    case "grayscale":
      for (let i = 0; i < pixels.length; i += 4) {
        const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        pixels[i] = avg;
        pixels[i + 1] = avg;
        pixels[i + 2] = avg;
      }
      break;

    case "invert":
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 255 - pixels[i];
        pixels[i + 1] = 255 - pixels[i + 1];
        pixels[i + 2] = 255 - pixels[i + 2];
      }
      break;

    case "blur":
      applyBoxBlur(pixels, width, height, 3);
      break;
  }

  // Transfer the buffer back (zero-copy)
  const resultBuffer = pixels.buffer;
  self.postMessage(
    { type: "result", imageData: resultBuffer, width, height },
    [resultBuffer] as any
  );
};

function applyBoxBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): void {
  const copy = new Uint8ClampedArray(pixels);
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            sum += copy[((y + dy) * width + (x + dx)) * 4 + c];
            count++;
          }
        }
        pixels[(y * width + x) * 4 + c] = sum / count;
      }
    }
  }
}
```

```typescript
// popup.ts -- sending image data with transferable objects
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d")!;
// ... draw image to canvas ...

const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const buffer = imageData.data.buffer.slice(0); // copy before transfer

worker.postMessage(
  {
    type: "process-image",
    imageData: buffer,
    width: canvas.width,
    height: canvas.height,
    filter: "grayscale",
  },
  [buffer] // transfer ownership for zero-copy performance
);
```

**Gotchas:**
- Use `Transferable` objects (ArrayBuffer, MessagePort, OffscreenCanvas) to avoid expensive copies. After transfer, the sender can no longer access the buffer.
- Workers do not have access to the DOM or `document`. All canvas/image operations must happen on the main thread or via `OffscreenCanvas`.
- Very large payloads can still cause jank during serialization. Consider chunking data if needed.

---

## Pattern 5: Worker Lifecycle Management in Extensions

Workers should be created on demand and terminated when no longer needed to conserve memory. A pool pattern helps manage multiple tasks.

```typescript
// worker-pool.ts
interface PooledWorker {
  worker: Worker;
  busy: boolean;
}

class WorkerPool {
  private pool: PooledWorker[] = [];
  private queue: Array<{
    message: unknown;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  private scriptPath: string;
  private maxWorkers: number;

  constructor(scriptPath: string, maxWorkers = navigator.hardwareConcurrency || 4) {
    this.scriptPath = scriptPath;
    this.maxWorkers = maxWorkers;
  }

  private createWorker(): PooledWorker {
    const worker = new Worker(chrome.runtime.getURL(this.scriptPath), {
      type: "module",
    });
    return { worker, busy: false };
  }

  async execute<T>(message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const available = this.pool.find((w) => !w.busy);

      if (available) {
        this.runOnWorker(available, message, resolve, reject);
      } else if (this.pool.length < this.maxWorkers) {
        const pooled = this.createWorker();
        this.pool.push(pooled);
        this.runOnWorker(pooled, message, resolve, reject);
      } else {
        this.queue.push({ message, resolve, reject });
      }
    });
  }

  private runOnWorker(
    pooled: PooledWorker,
    message: unknown,
    resolve: (result: any) => void,
    reject: (error: Error) => void
  ): void {
    pooled.busy = true;

    pooled.worker.onmessage = (event: MessageEvent) => {
      pooled.busy = false;
      resolve(event.data);
      this.processQueue();
    };

    pooled.worker.onerror = (error: ErrorEvent) => {
      pooled.busy = false;
      reject(new Error(error.message));
      this.processQueue();
    };

    pooled.worker.postMessage(message);
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;
    const next = this.queue.shift()!;
    this.execute(next.message).then(next.resolve).catch(next.reject);
  }

  terminateAll(): void {
    for (const pooled of this.pool) {
      pooled.worker.terminate();
    }
    this.pool = [];
    for (const queued of this.queue) {
      queued.reject(new Error("Worker pool terminated"));
    }
    this.queue = [];
  }
}

// Usage
const pool = new WorkerPool("workers/compute.js", 4);

async function processItems(items: string[]): Promise<unknown[]> {
  const results = await Promise.all(
    items.map((item) => pool.execute({ action: "process", data: item }))
  );
  return results;
}
```

**Gotchas:**
- Always call `terminateAll()` when the extension page unloads to prevent memory leaks. Hook into `window.addEventListener("unload", ...)`.
- `navigator.hardwareConcurrency` reports logical cores. Creating too many workers degrades performance instead of improving it.
- Workers retain memory for their global scope. If a worker accumulates state over time, consider periodic termination and recreation.

---

## Pattern 6: Using Workers Alongside Service Workers

The extension service worker (background script) and Web Workers serve different roles. The service worker handles extension events, while dedicated workers handle computation. They can communicate via message passing.

```typescript
// background.ts (service worker)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "heavy-compute") {
    // Service workers cannot create dedicated Workers directly.
    // Use an offscreen document to host the worker instead.
    handleViaOffscreen(message.payload).then(sendResponse);
    return true; // keep the message channel open for async response
  }
});

async function handleViaOffscreen(payload: unknown): Promise<unknown> {
  // Create offscreen document if it doesn't exist
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });

  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: "Run Web Worker for heavy computation",
    });
  }

  // Send work to the offscreen document, which hosts the worker
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "offscreen-compute", payload },
      (result) => resolve(result)
    );
  });
}
```

```typescript
// offscreen.ts (loaded by offscreen.html)
const worker = new Worker("workers/compute.js", { type: "module" });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "offscreen-compute") {
    worker.onmessage = (event: MessageEvent) => {
      sendResponse(event.data);
    };
    worker.postMessage(message.payload);
    return true;
  }
});
```

**Gotchas:**
- MV3 service workers **cannot** create `Worker` or `SharedWorker` instances. You must use an offscreen document as a host.
- Offscreen documents have their own lifecycle. They can be closed by the browser if idle for too long. Use `chrome.offscreen.Reason.WORKERS` to justify their existence.
- Chain: content script -> service worker -> offscreen document -> web worker. Each hop adds latency. Minimize round trips for performance-sensitive paths.

---

## Pattern 7: Worker Bundling with Webpack and esbuild

Workers need to be bundled as separate entry points. Both webpack and esbuild support this with slightly different configurations.

**Webpack configuration:**

```typescript
// webpack.config.ts
import path from "path";
import type { Configuration } from "webpack";

const config: Configuration = {
  entry: {
    background: "./src/background.ts",
    popup: "./src/popup.ts",
    "workers/compute": "./src/workers/compute.ts",
    "workers/image-processor": "./src/workers/image-processor.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  // Workers must be separate chunks, not merged
  optimization: {
    splitChunks: false,
  },
};

export default config;
```

**esbuild configuration:**

```typescript
// build.ts
import * as esbuild from "esbuild";

async function build(): Promise<void> {
  // Main extension scripts
  await esbuild.build({
    entryPoints: [
      "src/background.ts",
      "src/popup.ts",
      "src/content-script.ts",
    ],
    bundle: true,
    outdir: "dist",
    format: "esm",
    target: "chrome120",
  });

  // Worker scripts (separate build to avoid shared chunks)
  await esbuild.build({
    entryPoints: [
      "src/workers/compute.ts",
      "src/workers/image-processor.ts",
    ],
    bundle: true,
    outdir: "dist/workers",
    format: "esm",
    target: "chrome120",
    // Workers cannot use dynamic import()
    splitting: false,
  });
}

build().catch(console.error);
```

**Gotchas:**
- Worker scripts must be self-contained or use static imports only. Dynamic `import()` is not supported inside workers in all extension contexts.
- Do not use `splitChunks` or `splitting` for worker entry points. Shared chunks rely on relative path resolution that breaks in the extension environment.
- Make sure your `manifest.json` includes worker output files in `web_accessible_resources` if they are loaded from content scripts.
- If using `{ type: "module" }` workers, the output format must be `esm`.

---

## Pattern 8: Error Handling and Debugging Workers in Extensions

Workers fail silently unless you set up proper error handling. Extension-specific debugging adds extra complexity.

```typescript
// robust-worker-client.ts
class RobustWorkerClient {
  private worker: Worker | null = null;
  private scriptPath: string;
  private restartCount = 0;
  private maxRestarts = 3;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(scriptPath: string) {
    this.scriptPath = scriptPath;
    this.initWorker();
  }

  private initWorker(): void {
    this.worker = new Worker(chrome.runtime.getURL(this.scriptPath), {
      type: "module",
    });

    this.worker.onmessage = (event: MessageEvent) => {
      const { id, error, result } = event.data;
      const pending = this.pendingRequests.get(id);
      if (!pending) return;

      clearTimeout(pending.timer);
      this.pendingRequests.delete(id);

      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    };

    this.worker.onerror = (event: ErrorEvent) => {
      console.error(
        `[Worker Error] ${event.filename}:${event.lineno} - ${event.message}`
      );

      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error(`Worker error: ${event.message}`));
      }
      this.pendingRequests.clear();

      // Attempt restart
      this.attemptRestart();
    };

    this.worker.addEventListener(
      "messageerror",
      (event: MessageEvent) => {
        console.error("[Worker] Failed to deserialize message:", event);
      }
    );
  }

  private attemptRestart(): void {
    if (this.restartCount >= this.maxRestarts) {
      console.error("[Worker] Max restarts reached. Giving up.");
      return;
    }

    this.restartCount++;
    console.warn(
      `[Worker] Restarting (attempt ${this.restartCount}/${this.maxRestarts})`
    );

    this.worker?.terminate();
    this.initWorker();

    // Reset restart count after a stable period
    setTimeout(() => {
      this.restartCount = 0;
    }, 30_000);
  }

  async send(
    message: Record<string, unknown>,
    timeoutMs = 10_000
  ): Promise<unknown> {
    if (!this.worker) {
      throw new Error("Worker is not initialized");
    }

    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Worker request ${id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.worker!.postMessage({ ...message, id });
    });
  }

  destroy(): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Worker client destroyed"));
    }
    this.pendingRequests.clear();
    this.worker?.terminate();
    this.worker = null;
  }
}
```

```typescript
// Inside the worker: structured error reporting
// workers/compute.ts
self.onmessage = async (event: MessageEvent) => {
  const { id, action, data } = event.data;

  try {
    const result = await processAction(action, data);
    self.postMessage({ id, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    self.postMessage({ id, error: message, stack });
  }
};

async function processAction(
  action: string,
  data: unknown
): Promise<unknown> {
  // ... business logic
  throw new Error("Not implemented");
}
```

**Gotchas:**
- `onerror` on the worker only fires for uncaught exceptions. Errors inside `onmessage` handlers that are caught and re-thrown as postMessage responses will not trigger `onerror`.
- To debug workers in Chrome DevTools, open `chrome://inspect/#workers`. Extension workers appear there alongside service workers.
- `messageerror` fires when a message cannot be deserialized. This happens when the sender tries to post non-cloneable objects.
- Workers do not have access to `chrome.runtime.lastError`. Always use explicit error fields in your message protocol.

---

## Summary

| Pattern | Best For | Key Constraint |
|---------|----------|----------------|
| Dedicated Worker | Single-page computation | Must use `chrome.runtime.getURL()` |
| SharedWorker | Cross-page state | Extension pages only, not content scripts |
| Typed Messages | Any worker communication | Requires build step for TypeScript |
| Heavy Computation | Image/data processing | Use transferable objects for performance |
| Lifecycle Management | Multi-task workloads | Terminate idle workers to save memory |
| With Service Workers | Background-triggered tasks | Requires offscreen document as host |
| Bundling | Production builds | Workers need separate entry points |
| Error Handling | Production reliability | Set up restart logic and timeouts |

> **See also:** [Offscreen Documents](offscreen-documents.md) for the offscreen document API used to host workers from the service worker context. [Service Workers](../mv3/service-workers.md) for understanding the MV3 background script lifecycle.
