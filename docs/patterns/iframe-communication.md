# iframe Communication Patterns for Chrome Extensions

Embedding extension UI inside web pages via iframes provides strong isolation while enabling rich interactions. This guide covers eight patterns for building reliable iframe-based communication in Manifest V3 extensions.

## Pattern Summary

| # | Pattern | Use Case |
|---|---------|----------|
| 1 | Extension page inside iframe | Embed trusted extension UI in any web page |
| 2 | postMessage between content script and iframe | Send data across the content/iframe boundary |
| 3 | Secure origin validation | Prevent spoofed messages from malicious pages |
| 4 | Bidirectional RPC protocol | Call named functions across boundaries with responses |
| 5 | iframe sandboxing options | Control iframe capabilities with granular policies |
| 6 | Dynamic iframe sizing | Auto-resize iframe to match its content height |
| 7 | Multiple iframes coordination | Manage several extension iframes on one page |
| 8 | Fallback when iframes are blocked | Detect CSP restrictions and degrade gracefully |

---

## Pattern 1: Extension Page Inside iframe (web_accessible_resources)

Chrome extensions can embed their own HTML pages into web pages using iframes. The page must be declared in `web_accessible_resources` so the browser allows the host page to load it.

**manifest.json**

```json
{
  "manifest_version": 3,
  "name": "iframe Widget",
  "version": "1.0",
  "content_scripts": [
    { "matches": ["<all_urls>"], "js": ["content.ts"] }
  ],
  "web_accessible_resources": [
    {
      "resources": ["widget.html", "widget.js", "widget.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

**content.ts** -- Inject the iframe into the host page:

```typescript
function injectWidget(): void {
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("widget.html");
  iframe.id = "ext-widget-frame";
  iframe.style.cssText = `
    position: fixed; bottom: 16px; right: 16px;
    width: 360px; height: 480px; border: none;
    z-index: 2147483647;
  `;
  document.body.appendChild(iframe);
}

injectWidget();
```

The iframe runs in the extension origin (`chrome-extension://<id>`), fully isolated from the host page DOM and JavaScript context.

---

## Pattern 2: postMessage Between Content Script and Extension iframe

Use `window.postMessage` on the iframe's `contentWindow` and listen for `message` events to communicate across the origin boundary.

**content.ts**:

```typescript
function sendToWidget(data: unknown): void {
  const iframe = document.getElementById("ext-widget-frame") as HTMLIFrameElement | null;
  if (!iframe?.contentWindow) return;

  iframe.contentWindow.postMessage(
    { source: "ext-content-script", payload: data },
    chrome.runtime.getURL("")
  );
}

window.addEventListener("message", (event: MessageEvent) => {
  const iframe = document.getElementById("ext-widget-frame") as HTMLIFrameElement;
  if (event.source !== iframe?.contentWindow) return;
  console.log("Content script received:", event.data.payload);
});

sendToWidget({ type: "PAGE_INFO", title: document.title, url: location.href });
```

**widget.ts**:

```typescript
window.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.source !== "ext-content-script") return;

  document.getElementById("root")!.textContent = `Viewing: ${event.data.payload.title}`;

  // Reply to content script
  window.parent.postMessage({ source: "ext-widget", payload: { type: "ACK" } }, "*");
});
```

Always specify a `targetOrigin` when sending to the iframe. Use `"*"` only when replying from the iframe if you have validated the sender separately.

---

## Pattern 3: Secure Origin Validation for postMessage

Every handler must check `event.origin` and `event.source` before processing data.

**widget.ts** -- Strict validation inside the extension iframe:

```typescript
const ALLOWED_ORIGINS = new Set(["https://example.com", "https://app.example.com"]);

async function getSharedNonce(): Promise<string> {
  const { nonce } = await chrome.storage.session.get("nonce");
  return nonce as string;
}

window.addEventListener("message", async (event: MessageEvent) => {
  if (!ALLOWED_ORIGINS.has(event.origin)) return;      // 1. origin allowlist
  if (event.source !== window.parent) return;           // 2. source check

  const expectedNonce = await getSharedNonce();
  if (event.data.nonce !== expectedNonce) return;       // 3. nonce validation

  processMessage(event.data.payload);
});
```

**content.ts** -- Set nonce before injecting:

```typescript
async function setupSecureChannel(): Promise<void> {
  const nonce = crypto.randomUUID();
  await chrome.storage.session.set({ nonce });
  injectWidget();
  sendToWidget({ type: "INIT", nonce });
}
```

Combining origin checks, source checks, and a shared nonce gives defense-in-depth against spoofed messages.

---

## Pattern 4: Bidirectional RPC Protocol Over postMessage

Wrap postMessage in an RPC layer that supports named methods, arguments, and promise-based responses.

**rpc.ts**:

```typescript
type RpcHandler = (params: unknown) => Promise<unknown> | unknown;

interface RpcRequest { rpc: true; id: string; method: string; params: unknown }
interface RpcResponse { rpc: true; id: string; result?: unknown; error?: string }

export class RpcChannel {
  private handlers = new Map<string, RpcHandler>();
  private pending = new Map<string, {
    resolve: (v: unknown) => void;
    reject: (e: Error) => void;
  }>();

  constructor(private target: Window, private targetOrigin: string) {
    window.addEventListener("message", (e) => this.onMessage(e));
  }

  register(method: string, handler: RpcHandler): void {
    this.handlers.set(method, handler);
  }

  call(method: string, params: unknown): Promise<unknown> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.target.postMessage({ rpc: true, id, method, params }, this.targetOrigin);
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`RPC timeout: ${method}`));
      }, 5000);
    });
  }

  private async onMessage(event: MessageEvent): Promise<void> {
    const msg = event.data;
    if (!msg?.rpc) return;

    if ("method" in msg) {
      const handler = this.handlers.get(msg.method);
      const res: RpcResponse = { rpc: true, id: msg.id };
      try {
        res.result = handler ? await handler(msg.params) : undefined;
      } catch (err) {
        res.error = (err as Error).message;
      }
      (event.source as Window).postMessage(res, this.targetOrigin);
    } else {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error)) : p.resolve(msg.result);
    }
  }
}
```

**content.ts** usage:

```typescript
const iframe = document.getElementById("ext-widget-frame") as HTMLIFrameElement;
const rpc = new RpcChannel(iframe.contentWindow!, chrome.runtime.getURL(""));

rpc.register("getSelection", () => window.getSelection()?.toString() ?? "");
const count = await rpc.call("getBookmarkCount", { folder: "saved" });
```

---

## Pattern 5: iframe Sandboxing Options

The `sandbox` attribute restricts what the iframe content can do.

```typescript
const PROFILES: Record<string, string[]> = {
  strict:   ["allow-scripts"],                                       // no origin access
  standard: ["allow-scripts", "allow-same-origin"],                  // chrome.* APIs work
  form:     ["allow-scripts", "allow-same-origin", "allow-forms"],   // form submission
};

function createSandboxedFrame(profile: keyof typeof PROFILES): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("widget.html");
  iframe.sandbox.value = PROFILES[profile].join(" ");
  return iframe;
}

document.body.appendChild(createSandboxedFrame("standard"));
```

Key considerations:

- `allow-scripts` + `allow-same-origin` together let the iframe remove its own sandbox. Only combine them for trusted extension pages.
- Without `allow-same-origin`, `chrome.runtime`, `chrome.storage`, and cookies are inaccessible.
- Omitting `allow-top-navigation` prevents the iframe from redirecting the parent page.

---

## Pattern 6: Dynamic iframe Sizing (Auto-Resize Based on Content)

Use a `ResizeObserver` inside the iframe to report size changes to the content script.

**widget.ts**:

```typescript
function setupAutoResize(): void {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      window.parent.postMessage({
        source: "ext-widget",
        type: "RESIZE",
        height: Math.ceil(entry.contentRect.height),
      }, "*");
    }
  });
  observer.observe(document.getElementById("root")!);
}
setupAutoResize();
```

**content.ts**:

```typescript
const MAX_HEIGHT = 600;
const MIN_HEIGHT = 48;

window.addEventListener("message", (event: MessageEvent) => {
  const iframe = document.getElementById("ext-widget-frame") as HTMLIFrameElement;
  if (event.source !== iframe?.contentWindow) return;

  if (event.data?.type === "RESIZE") {
    const h = Math.max(MIN_HEIGHT, Math.min(event.data.height + 16, MAX_HEIGHT));
    iframe.style.height = `${h}px`;
  }
});
```

---

## Pattern 7: Multiple iframes Coordination

When an extension injects more than one iframe, each needs a unique channel and coordinated lifecycle.

```typescript
interface FrameEntry { id: string; iframe: HTMLIFrameElement; ready: boolean }

class FrameManager {
  private frames = new Map<string, FrameEntry>();

  create(id: string, src: string, style: Partial<CSSStyleDeclaration>): void {
    if (this.frames.has(id)) return;
    const iframe = document.createElement("iframe");
    iframe.src = chrome.runtime.getURL(src);
    iframe.dataset.extFrameId = id;
    Object.assign(iframe.style, { position: "fixed", border: "none", zIndex: "2147483647", ...style });
    document.body.appendChild(iframe);
    this.frames.set(id, { id, iframe, ready: false });
  }

  send(id: string, payload: unknown): void {
    const entry = this.frames.get(id);
    if (!entry?.ready || !entry.iframe.contentWindow) return;
    entry.iframe.contentWindow.postMessage(
      { source: "ext-content-script", frameId: id, payload },
      chrome.runtime.getURL("")
    );
  }

  broadcast(payload: unknown): void {
    for (const [id] of this.frames) this.send(id, payload);
  }

  remove(id: string): void {
    const entry = this.frames.get(id);
    if (!entry) return;
    entry.iframe.remove();
    this.frames.delete(id);
  }

  constructor() {
    window.addEventListener("message", (event: MessageEvent) => {
      const data = event.data;
      if (data?.source !== "ext-widget") return;
      if (data.type === "FRAME_READY") {
        const entry = this.frames.get(data.frameId);
        if (entry) entry.ready = true;
      }
      if (data.type === "RELAY") this.send(data.targetFrameId, data.payload);
    });
  }
}

// Usage
const mgr = new FrameManager();
mgr.create("sidebar", "sidebar.html", { top: "0", right: "0", width: "320px", height: "100vh" });
mgr.create("tooltip", "tooltip.html", { bottom: "80px", right: "340px", width: "240px", height: "120px" });
mgr.broadcast({ type: "THEME_CHANGE", theme: "dark" });
```

---

## Pattern 8: Fallback When iframes Are Blocked (CSP frame-src)

Some sites set `Content-Security-Policy: frame-src 'self'` which blocks extension iframes. Detect this and fall back to Shadow DOM injection.

```typescript
async function injectUI(): Promise<HTMLElement> {
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("widget.html");
  iframe.id = "ext-widget-frame";
  iframe.style.cssText = `
    position: fixed; bottom: 16px; right: 16px;
    width: 360px; height: 480px; border: none; z-index: 2147483647;
  `;
  document.body.appendChild(iframe);

  const ready = await Promise.race([
    new Promise<boolean>((resolve) => {
      window.addEventListener("message", function handler(e: MessageEvent) {
        if (e.source === iframe.contentWindow && e.data?.type === "WIDGET_READY") {
          window.removeEventListener("message", handler);
          resolve(true);
        }
      });
    }),
    new Promise<boolean>((r) => setTimeout(() => r(false), 2000)),
  ]);

  if (ready) return iframe;

  // Iframe blocked -- fall back to inline Shadow DOM
  iframe.remove();
  return injectInline();
}

function injectInline(): HTMLElement {
  const host = document.createElement("div");
  host.id = "ext-widget-inline";
  host.style.cssText = `
    position: fixed; bottom: 16px; right: 16px;
    width: 360px; height: 480px; z-index: 2147483647;
  `;

  const shadow = host.attachShadow({ mode: "closed" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`:host { all: initial; } .root { padding: 16px; background: #fff; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,.15); }`);
  shadow.adoptedStyleSheets = [sheet];

  const root = document.createElement("div");
  root.className = "root";
  root.textContent = "Extension Widget (inline fallback)";
  shadow.appendChild(root);
  document.body.appendChild(host);

  console.warn("Extension iframe blocked by CSP -- using inline Shadow DOM fallback");
  return host;
}

injectUI().then((el) => console.log("Widget injected:", el.id));
```

---

## Key Takeaways

- Always declare iframe resources in `web_accessible_resources` with the narrowest `matches` possible.
- Validate `event.origin`, `event.source`, and a shared nonce on every `message` handler.
- Wrap raw `postMessage` in an RPC layer for anything beyond simple one-way notifications.
- Use `ResizeObserver` inside the iframe for seamless auto-sizing without polling.
- Plan a fallback path for sites with restrictive CSP headers that block extension iframes.
