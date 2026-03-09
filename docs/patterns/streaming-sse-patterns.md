---
layout: default
title: "Chrome Extension Streaming Sse Patterns — Best Practices"
description: "Implement Server-Sent Events for real-time streaming in extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/streaming-sse-patterns/"
---

# Streaming and Server-Sent Events in Chrome Extensions

Modern Chrome extensions increasingly need to handle streaming data -- from AI API responses
to real-time feeds. The extension architecture (service workers, popups, content scripts) adds
unique constraints around where streams can live, how long connections persist, and how data
flows between contexts. This guide covers eight battle-tested patterns for working with
streaming and SSE in Manifest V3 extensions.

> **See also:** [WebSocket Patterns in Service Workers](websocket-service-workers.md) |
> [Offscreen Documents](offscreen-documents.md)

---

## Pattern 1: Fetch Streaming Responses in a Service Worker {#pattern-1-fetch-streaming-responses-in-a-service-worker}

Service workers can use the Fetch API with `ReadableStream` to consume chunked responses.
The key constraint is that service workers terminate after ~30 seconds of inactivity, so you
must keep the event loop busy while a stream is active.

```typescript
// background.ts (service worker)

async function fetchStream(url: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "text/event-stream" },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Forward chunk to listeners (see Pattern 4)
      broadcastChunk(chunk);
    }
  } finally {
    reader.releaseLock();
  }
}
```

**Gotchas:**

- The service worker idle timer resets on every `reader.read()` call, but only while the
  promise is pending. If the server pauses sending for >30 s, Chrome may kill the worker.
- `TextDecoder` with `{ stream: true }` is essential -- without it, multi-byte characters
  split across chunks will corrupt.
- Always call `reader.releaseLock()` in a `finally` block to avoid locking the stream body.

---

## Pattern 2: SSE Connections via Offscreen Document {#pattern-2-sse-connections-via-offscreen-document}

`EventSource` is not available in service workers. To maintain a persistent SSE connection,
use an offscreen document -- it runs in a full DOM context and survives as long as the
service worker keeps it alive.

```typescript
// background.ts -- create the offscreen document

async function ensureOffscreen(): Promise<void> {
  const exists = await chrome.offscreen.hasDocument();
  if (exists) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: "Maintain SSE connection for real-time data",
  });
}

// Listen for messages from the offscreen document
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SSE_EVENT") {
    handleSSEEvent(message.data);
    sendResponse({ received: true });
  }
});
```

```typescript
// offscreen.ts -- runs inside offscreen.html

function connectSSE(url: string): EventSource {
  const source = new EventSource(url);

  source.onmessage = (event: MessageEvent) => {
    chrome.runtime.sendMessage({
      type: "SSE_EVENT",
      data: event.data,
    });
  };

  source.onerror = () => {
    // EventSource auto-reconnects on error, but notify the SW
    chrome.runtime.sendMessage({
      type: "SSE_ERROR",
      data: { readyState: source.readyState },
    });
  };

  return source;
}

connectSSE("https://api.example.com/events");
```

**Gotchas:**

- Only one offscreen document can exist at a time. If you need SSE alongside other offscreen
  uses (audio, DOM parsing), multiplex inside a single document.
- `chrome.offscreen.Reason` doesn't have an "SSE" value. Use `WORKERS` if the
  offscreen document also spawns workers, or another applicable reason. Avoid using
  `WEB_RTC` unless you actually use WebRTC -- pick the reason that most honestly
  describes your use case for Chrome Web Store review.
- The offscreen document is torn down if the service worker dies. Use `chrome.alarms` to
  periodically wake the worker and verify the document is alive.

---

## Pattern 3: Streaming AI API Responses (Chunked Transfer) {#pattern-3-streaming-ai-api-responses-chunked-transfer}

AI APIs (OpenAI, Anthropic, Google) return streaming completions as SSE over `fetch`. Each
chunk is a JSON payload prefixed with `data: `. Parsing requires accumulating a line buffer.

```typescript
// ai-stream.ts

interface AIChunk {
  id: string;
  choices: Array<{ delta: { content?: string } }>;
}

async function* streamCompletion(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`API error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const payload = trimmed.slice(6);
        if (payload === "[DONE]") return;

        const parsed: AIChunk = JSON.parse(payload);
        const content = parsed.choices[0]?.delta?.content;
        if (content) yield content;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Usage in service worker
async function handleAIRequest(prompt: string): Promise<void> {
  const controller = new AbortController();
  const messages = [{ role: "user", content: prompt }];

  for await (const token of streamCompletion("sk-...", messages, controller.signal)) {
    broadcastChunk(token);
  }
}
```

**Gotchas:**

- Never assume one `reader.read()` call yields exactly one SSE event. A single chunk may
  contain multiple events, or an event may be split across chunks -- hence the line buffer.
- The `[DONE]` sentinel is OpenAI-specific. Anthropic uses `event: message_stop`. Always
  check your provider's docs.
- Store the `AbortController` so the user can cancel generation from the popup.

---

## Pattern 4: Forwarding Stream Chunks to Popup / Side Panel {#pattern-4-forwarding-stream-chunks-to-popup-side-panel}

The popup and side panel have independent lifetimes. Use `chrome.runtime.Port` for
long-lived connections so you can detect when the UI closes and stop streaming.

```typescript
// background.ts

const activeStreams = new Map<string, AbortController>();
const connectedPorts = new Set<chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "stream-channel") return;

  connectedPorts.add(port);

  port.onMessage.addListener(async (msg) => {
    if (msg.action === "start-stream") {
      const controller = new AbortController();
      activeStreams.set(msg.requestId, controller);

      try {
        for await (const token of streamCompletion(msg.apiKey, msg.messages, controller.signal)) {
          port.postMessage({ type: "chunk", requestId: msg.requestId, data: token });
        }
        port.postMessage({ type: "done", requestId: msg.requestId });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          port.postMessage({ type: "error", requestId: msg.requestId, error: String(err) });
        }
      } finally {
        activeStreams.delete(msg.requestId);
      }
    }

    if (msg.action === "cancel-stream") {
      activeStreams.get(msg.requestId)?.abort();
    }
  });

  port.onDisconnect.addListener(() => {
    connectedPorts.delete(port);
    // Cancel any streams initiated by this port
    for (const [id, controller] of activeStreams) {
      controller.abort();
      activeStreams.delete(id);
    }
  });
});
```

```typescript
// popup.ts or sidepanel.ts

const port = chrome.runtime.connect({ name: "stream-channel" });
const requestId = crypto.randomUUID();

port.postMessage({
  action: "start-stream",
  requestId,
  apiKey: "sk-...",
  messages: [{ role: "user", content: "Hello" }],
});

port.onMessage.addListener((msg) => {
  if (msg.requestId !== requestId) return;

  switch (msg.type) {
    case "chunk":
      appendToUI(msg.data);
      break;
    case "done":
      markComplete();
      break;
    case "error":
      showError(msg.error);
      break;
  }
});
```

**Gotchas:**

- `chrome.runtime.sendMessage` is fire-and-forget and unsuitable for high-frequency chunk
  delivery. Always use `Port` for streaming.
- The port disconnects instantly when the popup closes. Your `onDisconnect` handler must
  abort in-flight streams or they will keep the service worker alive pointlessly.
- `postMessage` is async internally; if you send thousands of small chunks per second,
  consider batching (see Pattern 5).

---

## Pattern 5: Stream Buffering and Backpressure Handling {#pattern-5-stream-buffering-and-backpressure-handling}

When the producer (network) is faster than the consumer (UI rendering), chunks pile up in
memory. Implement a simple ring buffer with flush intervals to smooth delivery.

```typescript
// stream-buffer.ts

interface BufferOptions {
  maxSize: number;       // max chars to buffer before force-flush
  flushIntervalMs: number; // periodic flush interval
}

class StreamBuffer {
  private buffer = "";
  private timer: ReturnType<typeof setInterval> | null = null;
  private onFlush: (data: string) => void;
  private options: BufferOptions;

  constructor(onFlush: (data: string) => void, options: Partial<BufferOptions> = {}) {
    this.onFlush = onFlush;
    this.options = {
      maxSize: 4096,
      flushIntervalMs: 50,
      ...options,
    };
  }

  start(): void {
    this.timer = setInterval(() => this.flush(), this.options.flushIntervalMs);
  }

  push(chunk: string): void {
    this.buffer += chunk;
    if (this.buffer.length >= this.options.maxSize) {
      this.flush();
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;
    const data = this.buffer;
    this.buffer = "";
    this.onFlush(data);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush(); // emit remaining data
  }
}

// Usage with Port forwarding
function createBufferedForwarder(port: chrome.runtime.Port, requestId: string): StreamBuffer {
  return new StreamBuffer(
    (data) => port.postMessage({ type: "chunk", requestId, data }),
    { maxSize: 2048, flushIntervalMs: 33 } // ~30 fps
  );
}
```

**Gotchas:**

- `setInterval` in a service worker does not prevent termination. Pair it with an active
  `fetch` stream read loop to keep the worker alive.
- The 50 ms default flush interval balances responsiveness with overhead. For AI chat UIs,
  33 ms (~30 fps) feels smooth without taxing the message channel.
- If the port disconnects mid-buffer, the `onFlush` callback will throw. Wrap it in a
  try/catch or check `port` liveness before posting.

---

## Pattern 6: Reconnection Strategies for SSE {#pattern-6-reconnection-strategies-for-sse}

Built-in `EventSource` reconnection is unreliable in extension contexts. Implement your own
with exponential backoff and `Last-Event-ID` tracking.

```typescript
// sse-reconnect.ts

interface SSEReconnectOptions {
  url: string;
  initialRetryMs: number;
  maxRetryMs: number;
  maxAttempts: number;
  onEvent: (event: { id?: string; type: string; data: string }) => void;
  onStatusChange: (status: "connecting" | "connected" | "disconnected") => void;
}

class ResilientSSE {
  private lastEventId: string | null = null;
  private retryMs: number;
  private attempts = 0;
  private controller: AbortController | null = null;
  private options: SSEReconnectOptions;

  constructor(options: SSEReconnectOptions) {
    this.options = options;
    this.retryMs = options.initialRetryMs;
  }

  async connect(): Promise<void> {
    this.controller = new AbortController();
    this.options.onStatusChange("connecting");

    const headers: Record<string, string> = { Accept: "text/event-stream" };
    if (this.lastEventId) {
      headers["Last-Event-ID"] = this.lastEventId;
    }

    try {
      const response = await fetch(this.options.url, {
        headers,
        signal: this.controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE failed: ${response.status}`);
      }

      this.options.onStatusChange("connected");
      this.retryMs = this.options.initialRetryMs;
      this.attempts = 0;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = this.parseEvents(buffer);
        buffer = events.remaining;

        for (const event of events.parsed) {
          if (event.id) this.lastEventId = event.id;
          this.options.onEvent(event);
        }
      }

      // Server closed the connection gracefully
      this.scheduleReconnect();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      this.scheduleReconnect();
    }
  }

  private parseEvents(raw: string): {
    parsed: Array<{ id?: string; type: string; data: string }>;
    remaining: string;
  } {
    const parsed: Array<{ id?: string; type: string; data: string }> = [];
    const blocks = raw.split("\n\n");
    const remaining = blocks.pop() ?? "";

    for (const block of blocks) {
      let id: string | undefined;
      let type = "message";
      const dataLines: string[] = [];

      for (const line of block.split("\n")) {
        if (line.startsWith("id: ")) id = line.slice(4);
        else if (line.startsWith("event: ")) type = line.slice(7);
        else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
        else if (line.startsWith("data:")) dataLines.push(line.slice(5));
      }

      if (dataLines.length > 0) {
        parsed.push({ id, type, data: dataLines.join("\n") });
      }
    }

    return { parsed, remaining };
  }

  private scheduleReconnect(): void {
    this.attempts++;
    if (this.attempts >= this.options.maxAttempts) {
      this.options.onStatusChange("disconnected");
      return;
    }

    const jitter = Math.random() * this.retryMs * 0.3;
    const delay = Math.min(this.retryMs + jitter, this.options.maxRetryMs);
    this.retryMs = Math.min(this.retryMs * 2, this.options.maxRetryMs);

    this.options.onStatusChange("connecting");
    setTimeout(() => this.connect(), delay);
  }

  disconnect(): void {
    this.controller?.abort();
    this.options.onStatusChange("disconnected");
  }
}
```

**Gotchas:**

- Always include jitter in backoff to prevent thundering herd when many clients reconnect
  simultaneously after a server restart.
- `Last-Event-ID` only works if the server supports it. Verify with your SSE provider --
  many only support it for specific event types.
- `setTimeout` in a service worker will fire only if the worker is still alive. For
  reconnections spanning minutes, use `chrome.alarms.create` (minimum 30-second granularity
  since Chrome 120) instead.

---

## Pattern 7: Stream Progress Indicators in Extension UI {#pattern-7-stream-progress-indicators-in-extension-ui}

Show meaningful progress for streams that have a known total length or expected token count.
For indeterminate streams, use a token counter and elapsed time.

{% raw %}
```typescript
// stream-progress.ts

interface StreamProgress {
  status: "idle" | "streaming" | "complete" | "error";
  bytesReceived: number;
  totalBytes: number | null;  // null if Content-Length unknown
  tokensReceived: number;
  elapsedMs: number;
  throughput: string;         // human-readable tokens/sec
}

class StreamProgressTracker {
  private startTime = 0;
  private bytesReceived = 0;
  private tokensReceived = 0;
  private totalBytes: number | null = null;

  start(contentLength: number | null): void {
    this.startTime = performance.now();
    this.bytesReceived = 0;
    this.tokensReceived = 0;
    this.totalBytes = contentLength;
  }

  addBytes(count: number): void {
    this.bytesReceived += count;
  }

  addTokens(count: number): void {
    this.tokensReceived += count;
  }

  getProgress(): StreamProgress {
    const elapsedMs = performance.now() - this.startTime;
    const elapsedSec = elapsedMs / 1000;
    const tps = elapsedSec > 0 ? this.tokensReceived / elapsedSec : 0;

    return {
      status: "streaming",
      bytesReceived: this.bytesReceived,
      totalBytes: this.totalBytes,
      tokensReceived: this.tokensReceived,
      elapsedMs,
      throughput: `${tps.toFixed(1)} tok/s`,
    };
  }
}

// React component for the side panel
function StreamIndicator({ progress }: { progress: StreamProgress }) {
  if (progress.status === "idle") return null;

  const pct = progress.totalBytes
    ? Math.round((progress.bytesReceived / progress.totalBytes) * 100)
    : null;

  return (
    <div className="stream-indicator" role="status" aria-live="polite">
      {pct !== null ? (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
          <span>{pct}%</span>
        </div>
      ) : (
        <div className="stream-stats">
          <span>{progress.tokensReceived} tokens</span>
          <span>{progress.throughput}</span>
          <span>{(progress.elapsedMs / 1000).toFixed(1)}s</span>
        </div>
      )}
    </div>
  );
}
```
{% endraw %}

**Gotchas:**

- `Content-Length` is almost never present on SSE or chunked-transfer responses. Design the
  UI to work without a known total.
- `performance.now()` is available in service workers but returns time since worker start,
  not page load. This is fine for elapsed-time calculations.
- Update the UI at most every 100 ms via `requestAnimationFrame` or a throttle -- updating
  on every token causes layout thrashing.

---

## Pattern 8: ReadableStream Processing in Content Scripts {#pattern-8-readablestream-processing-in-content-scripts}

Content scripts can create their own `ReadableStream` pipelines via `TransformStream`. This
is useful for intercepting and transforming page-initiated streams (e.g., adding translation
to a live chat feed).

```typescript
// content-script.ts

function createChunkTransformer(
  transform: (chunk: string) => string | Promise<string>
): TransformStream<string, string> {
  return new TransformStream<string, string>({
    async transform(chunk, controller) {
      try {
        const result = await transform(chunk);
        controller.enqueue(result);
      } catch {
        controller.enqueue(chunk); // pass through on error
      }
    },
  });
}

// Pipe a stream through a transformer and consume it
async function processTransformedStream(
  sourceUrl: string,
  transformer: (chunk: string) => string | Promise<string>,
  onChunk: (data: string) => void
): Promise<void> {
  const response = await fetch(sourceUrl);
  if (!response.body) throw new Error("No body");

  const textStream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(createChunkTransformer(transformer));

  const reader = textStream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(value);
    }
  } finally {
    reader.releaseLock();
  }
}

// Example: inject translated subtitles into a video player page
async function streamTranslatedSubtitles(subtitleUrl: string): Promise<void> {
  const subtitleContainer = document.getElementById("live-captions");
  if (!subtitleContainer) return;

  await processTransformedStream(
    subtitleUrl,
    async (chunk) => {
      // Send to background for translation, wait for result
      const result = await chrome.runtime.sendMessage({
        type: "TRANSLATE",
        text: chunk,
        targetLang: "en",
      });
      return result.translated;
    },
    (translatedChunk) => {
      const span = document.createElement("span");
      span.textContent = translatedChunk;
      subtitleContainer.appendChild(span);
    }
  );
}
```

```typescript
// Intercepting and proxying a fetch stream from the page context
// Inject via world: "MAIN" in manifest.json

const originalFetch = window.fetch;

window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
  const response = await originalFetch.apply(this, args);
  const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;

  // Only intercept streams from specific endpoints
  if (!url.includes("/api/stream")) return response;
  if (!response.body) return response;

  const [branch1, branch2] = response.body.tee();

  // Consume branch2 in the background for logging/analysis
  consumeForAnalysis(branch2, url);

  // Return branch1 to the page so it works normally
  return new Response(branch1, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

async function consumeForAnalysis(
  stream: ReadableStream<Uint8Array>,
  url: string
): Promise<void> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Forward aggregated data to extension context
  window.postMessage(
    { source: "ext-stream-intercept", url, data: chunks.join("") },
    "*"
  );
}
```

**Gotchas:**

- Content scripts with `world: "MAIN"` share the page's JS context. Your intercepted
  `fetch` runs with the page's CSP, not the extension's.
- `response.body.tee()` doubles memory usage since both branches buffer independently. Only
  tee streams you actually need to fork.
- `TransformStream` backpressure propagates automatically -- if your transformer is slow,
  the source stream pauses. This is usually desirable but can cause timeouts with strict
  servers.
- `chrome.runtime.sendMessage` from a MAIN-world script will fail. You must relay via
  `window.postMessage` to an ISOLATED-world content script, which then forwards to the
  background.

---

## Quick Reference {#quick-reference}

| Pattern | Best Context | Key API |
|---------|-------------|---------|
| Fetch streaming | Service worker | `ReadableStream.getReader()` |
| SSE via offscreen | Long-lived connections | `EventSource` + offscreen API |
| AI streaming | Service worker | `fetch` + line-buffered SSE parsing |
| Port forwarding | SW to popup/side panel | `chrome.runtime.Port` |
| Buffering | High-frequency streams | Custom ring buffer + flush timer |
| Reconnection | Unreliable SSE servers | Exponential backoff + `Last-Event-ID` |
| Progress UI | Popup / side panel | `StreamProgressTracker` + React |
| Content script streams | Page-level interception | `TransformStream` + `tee()` |

---

*Last updated: 2026-03-06*
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
