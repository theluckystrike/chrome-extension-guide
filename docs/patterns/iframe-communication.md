---
layout: default
title: "Chrome Extension Iframe Communication — Best Practices"
description: "Communicate with iframes in content scripts."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/iframe-communication/"
---

# iframe Communication Patterns in Chrome Extensions

iframes are ubiquitous on the web, and Chrome extensions frequently need to communicate with them, embed them, or use them as sandboxed execution environments. This guide covers eight patterns for working with iframes in Manifest V3 extensions, from basic message passing to advanced UI injection techniques.

> **Related guides:** [Content Script Isolation](content-script-isolation.md) | [Web Accessible Resources](../mv3/web-accessible-resources.md)

---

## Pattern 1: Content Script to Page iframe Communication {#pattern-1-content-script-to-page-iframe-communication}

Content scripts can access iframes on the host page, but cross-origin restrictions apply. For same-origin iframes, you can inject directly. For cross-origin iframes, use `window.postMessage`.

```typescript
// content-script.ts
function sendToSameOriginIframe(
  iframe: HTMLIFrameElement,
  message: unknown
): void {
  // Same-origin: direct access to contentWindow
  const iframeWindow = iframe.contentWindow;
  if (!iframeWindow) {
    console.warn("iframe contentWindow not accessible");
    return;
  }

  // Post message with the page's origin for same-origin frames
  iframeWindow.postMessage(
    { source: "my-extension", payload: message },
    window.location.origin
  );
}

function sendToCrossOriginIframe(
  iframe: HTMLIFrameElement,
  message: unknown,
  targetOrigin: string
): void {
  const iframeWindow = iframe.contentWindow;
  if (!iframeWindow) return;

  // Always specify the exact target origin, never use "*"
  iframeWindow.postMessage(
    { source: "my-extension", payload: message },
    targetOrigin
  );
}

// Listen for responses from iframes
window.addEventListener("message", (event: MessageEvent) => {
  // Validate origin before processing
  if (!isAllowedOrigin(event.origin)) return;
  if (event.data?.source !== "my-extension-iframe") return;

  console.log("Response from iframe:", event.data.payload);
});

function isAllowedOrigin(origin: string): boolean {
  const allowed = ["https://trusted-site.example.com"];
  return allowed.includes(origin);
}

// Find and communicate with all iframes on the page
function broadcastToIframes(message: unknown): void {
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe) => {
    try {
      iframe.contentWindow?.postMessage(
        { source: "my-extension", payload: message },
        "*" // Only use "*" for broadcast when message contains no secrets
      );
    } catch (err) {
      // Security error for sandboxed frames without allow-same-origin
    }
  });
}
```

**Gotchas:**
- Content scripts run in an isolated world. They can see the page DOM (including iframes) but do not share JavaScript variables with the page.
- Never use `"*"` as the target origin when sending sensitive data. Always specify the exact expected origin.
- Some iframes use the `sandbox` attribute without `allow-same-origin`, which gives them an opaque origin. `postMessage` to these frames must use `"*"` as the target origin.

---

## Pattern 2: Extension iframe in Content Script (Shadow DOM) {#pattern-2-extension-iframe-in-content-script-shadow-dom}

Inject an extension-hosted iframe into a page using Shadow DOM to isolate styles and prevent the host page from interfering with your UI.

```typescript
// content-script.ts
function injectExtensionUI(): void {
  // Create a host element
  const host = document.createElement("div");
  host.id = "my-extension-root";

  // Attach a closed shadow root so the page cannot access it
  const shadow = host.attachShadow({ mode: "closed" });

  // Style the container
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      width: 380px;
      height: 500px;
      border: none;
      border-radius: 8px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  `;

  // Create the iframe pointing to an extension page
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("panel.html");
  iframe.setAttribute("allow", "");

  shadow.appendChild(style);
  shadow.appendChild(iframe);
  document.body.appendChild(host);

  // Set up communication between the content script and the iframe
  setupIframeBridge(iframe);
}

function setupIframeBridge(iframe: HTMLIFrameElement): void {
  // Listen for messages from the extension iframe
  window.addEventListener("message", (event: MessageEvent) => {
    // Only accept messages from our extension origin
    if (event.source !== iframe.contentWindow) return;

    const { action, data } = event.data;
    switch (action) {
      case "get-page-info":
        iframe.contentWindow?.postMessage(
          {
            action: "page-info",
            data: {
              title: document.title,
              url: window.location.href,
              selection: window.getSelection()?.toString() || "",
            },
          },
          chrome.runtime.getURL("")
        );
        break;

      case "close-panel":
        document.getElementById("my-extension-root")?.remove();
        break;
    }
  });
}

// Initialize when the content script loads
injectExtensionUI();
```

```typescript
// panel.ts (loaded inside the extension iframe)
window.addEventListener("DOMContentLoaded", () => {
  // Request page info from the content script
  window.parent.postMessage({ action: "get-page-info" }, "*");

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.data.action === "page-info") {
      const info = event.data.data;
      document.getElementById("page-title")!.textContent = info.title;
    }
  });
});
```

**Gotchas:**
- The iframe `src` must point to a file listed in `web_accessible_resources` in your manifest. Without this, the browser blocks the load.
- Using `mode: "closed"` for the shadow root prevents page scripts from traversing into your DOM, but determined actors can still detect the host element.
- The extension iframe runs in the extension origin, so it has access to `chrome.*` APIs. Content scripts always have access to `chrome.runtime.getURL()` as part of the `chrome.runtime` API subset available to content scripts.

---

## Pattern 3: Cross-Origin iframe Messaging with postMessage {#pattern-3-cross-origin-iframe-messaging-with-postmessage}

When communicating across origins, a structured protocol with handshake, validation, and typed messages prevents security issues and race conditions.

```typescript
// types/iframe-protocol.ts
interface HandshakeMessage {
  type: "handshake";
  version: number;
  capabilities: string[];
}

interface DataMessage {
  type: "data";
  channel: string;
  payload: unknown;
  requestId?: string;
}

interface AckMessage {
  type: "ack";
  requestId: string;
  status: "ok" | "error";
  error?: string;
}

type ProtocolMessage = HandshakeMessage | DataMessage | AckMessage;

const PROTOCOL_KEY = "__ext_iframe_protocol__";
```

```typescript
// iframe-bridge.ts
class IframeBridge {
  private targetWindow: Window;
  private targetOrigin: string;
  private connected = false;
  private pendingRequests = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private handlers = new Map<string, (payload: unknown) => unknown>();

  constructor(targetWindow: Window, targetOrigin: string) {
    this.targetWindow = targetWindow;
    this.targetOrigin = targetOrigin;

    window.addEventListener("message", this.onMessage.bind(this));
  }

  private onMessage(event: MessageEvent): void {
    // Strict origin check
    if (event.origin !== this.targetOrigin) return;
    if (event.source !== this.targetWindow) return;

    const data = event.data;
    if (!data || data[PROTOCOL_KEY] !== true) return;

    const message: ProtocolMessage = data.message;

    switch (message.type) {
      case "handshake":
        this.connected = true;
        this.send({
          type: "ack",
          requestId: "handshake",
          status: "ok",
        });
        break;

      case "data":
        this.handleDataMessage(message);
        break;

      case "ack":
        this.handleAck(message);
        break;
    }
  }

  private handleDataMessage(message: DataMessage): void {
    const handler = this.handlers.get(message.channel);
    if (!handler) return;

    try {
      const result = handler(message.payload);
      if (message.requestId) {
        this.send({
          type: "ack",
          requestId: message.requestId,
          status: "ok",
        });
      }
    } catch (err) {
      if (message.requestId) {
        this.send({
          type: "ack",
          requestId: message.requestId,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private handleAck(message: AckMessage): void {
    const pending = this.pendingRequests.get(message.requestId);
    if (!pending) return;
    this.pendingRequests.delete(message.requestId);

    if (message.status === "ok") {
      pending.resolve(undefined);
    } else {
      pending.reject(new Error(message.error || "Unknown error"));
    }
  }

  private send(message: ProtocolMessage): void {
    this.targetWindow.postMessage(
      { [PROTOCOL_KEY]: true, message },
      this.targetOrigin
    );
  }

  on(channel: string, handler: (payload: unknown) => unknown): void {
    this.handlers.set(channel, handler);
  }

  async request(channel: string, payload: unknown): Promise<void> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve: resolve as any, reject });
      this.send({ type: "data", channel, payload, requestId });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error("Request timed out"));
        }
      }, 5000);
    });
  }

  initiateHandshake(): void {
    this.send({
      type: "handshake",
      version: 1,
      capabilities: ["data", "ack"],
    });
  }

  destroy(): void {
    window.removeEventListener("message", this.onMessage.bind(this));
    this.pendingRequests.clear();
    this.handlers.clear();
  }
}
```

**Gotchas:**
- Always wrap messages in a unique key (`PROTOCOL_KEY`) to distinguish your protocol from other `postMessage` traffic on the page.
- The `event.source` check is critical. Without it, any iframe or window on the page could spoof messages matching your origin.
- `postMessage` is asynchronous and unordered. If ordering matters, add sequence numbers to your protocol.

---

## Pattern 4: Sandboxed iframe for Untrusted Content {#pattern-4-sandboxed-iframe-for-untrusted-content}

Chrome extensions can use sandboxed pages to run untrusted code (such as user-provided templates or third-party scripts) without access to extension APIs.

```jsonc
// manifest.json (partial)
{
  "sandbox": {
    "pages": ["sandbox.html"]
  }
}
```

```html
<!-- sandbox.html -->
<!DOCTYPE html>
<html>
<head><title>Sandbox</title></head>
<body>
  <script src="sandbox.js"></script>
</body>
</html>
```

```typescript
// sandbox.ts -- runs in a sandboxed, null-origin context
// No access to chrome.* APIs here

window.addEventListener("message", (event: MessageEvent) => {
  const { action, template, data } = event.data;

  if (action === "render-template") {
    try {
      // Safe to eval user templates here -- sandboxed context
      const renderFn = new Function("data", `return \`${template}\`;`);
      const result = renderFn(data);
      event.source?.postMessage(
        { action: "render-result", result },
        event.origin as any
      );
    } catch (err) {
      event.source?.postMessage(
        {
          action: "render-error",
          error: err instanceof Error ? err.message : String(err),
        },
        event.origin as any
      );
    }
  }
});
```

```typescript
// popup.ts or options.ts -- the extension page hosting the sandbox
function createSandbox(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.src = "sandbox.html";
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  return iframe;
}

async function renderTemplate(
  sandbox: HTMLIFrameElement,
  template: string,
  data: Record<string, unknown>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      if (event.source !== sandbox.contentWindow) return;

      window.removeEventListener("message", handler);

      if (event.data.action === "render-result") {
        resolve(event.data.result);
      } else if (event.data.action === "render-error") {
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener("message", handler);

    sandbox.contentWindow?.postMessage(
      { action: "render-template", template, data },
      "*" // Sandboxed pages have null origin, must use "*"
    );
  });
}

// Usage
const sandbox = createSandbox();
const html = await renderTemplate(
  sandbox,
  "<h1>${data.title}</h1><p>${data.body}</p>",
  { title: "Hello", body: "World" }
);
```

**Gotchas:**
- Sandboxed pages have a `null` origin. You must use `"*"` as the target origin when posting messages to them. Validate `event.source` instead.
- Sandboxed pages cannot use `chrome.*` APIs, `fetch` to extension resources, or navigate to extension pages. They are fully isolated.
- The `sandbox` manifest key only works for pages listed explicitly. Dynamically created iframes with `sandbox` attributes are a different mechanism entirely.

---

## Pattern 5: iframe Permission and CSP Considerations {#pattern-5-iframe-permission-and-csp-considerations}

Chrome extensions enforce a Content Security Policy that affects which iframes can be embedded and what they can do. Understanding these constraints prevents silent failures.

```jsonc
// manifest.json -- CSP configuration
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; frame-src 'self' https://trusted-embed.example.com",
    "sandbox": "sandbox allow-scripts; script-src 'self' 'unsafe-eval'; object-src 'self'"
  }
}
```

```typescript
// csp-safe-iframe-loader.ts
interface IframeConfig {
  url: string;
  container: HTMLElement;
  sandbox?: string[];
  allow?: string[];
  onLoad?: () => void;
  onError?: (error: string) => void;
}

function createSecureIframe(config: IframeConfig): HTMLIFrameElement {
  const iframe = document.createElement("iframe");

  // Set sandbox attributes for defense in depth
  const sandboxFlags = config.sandbox || [
    "allow-scripts",
    "allow-same-origin", // Required for postMessage origin checking
  ];
  iframe.setAttribute("sandbox", sandboxFlags.join(" "));

  // Permissions policy (formerly feature policy)
  const allowFlags = config.allow || [
    "clipboard-read",
    "clipboard-write",
  ];
  iframe.setAttribute("allow", allowFlags.join("; "));

  // Prevent the iframe from navigating the top window
  iframe.setAttribute("referrerpolicy", "no-referrer");

  // CSP via meta tag is not reliable for iframes. Use headers
  // or the sandbox attribute instead.

  iframe.addEventListener("load", () => {
    config.onLoad?.();
  });

  iframe.addEventListener("error", () => {
    config.onError?.("Failed to load iframe");
  });

  iframe.src = config.url;
  config.container.appendChild(iframe);

  return iframe;
}

// Validate that an iframe URL is allowed before loading
function isUrlAllowed(url: string, allowedPatterns: string[]): boolean {
  try {
    const parsed = new URL(url);
    return allowedPatterns.some((pattern) => {
      if (pattern.startsWith("*.")) {
        const domain = pattern.slice(2);
        return (
          parsed.hostname === domain ||
          parsed.hostname.endsWith("." + domain)
        );
      }
      return parsed.origin === pattern;
    });
  } catch {
    return false;
  }
}
```

```typescript
// content-script.ts -- monitoring iframe CSP violations
document.addEventListener("securitypolicyviolation", (event) => {
  if (event.violatedDirective === "frame-src") {
    console.warn(
      `[Extension] Blocked iframe load: ${event.blockedURI} ` +
      `(violated ${event.violatedDirective})`
    );
  }
});
```

**Gotchas:**
- Extension pages default to `script-src 'self'`. Adding `frame-src` to the CSP is required to embed external URLs in extension page iframes.
- The `sandbox` attribute on an iframe and the `sandbox` manifest key are independent. The manifest key creates a sandboxed extension page; the attribute restricts any iframe.
- `allow-same-origin` in a sandbox re-enables origin-based checks. Without it, the iframe has a `null` origin and cannot use cookies, localStorage, or origin-validated postMessage.
- Never combine `allow-same-origin` and `allow-scripts` in a sandbox for untrusted content -- the iframe could remove its own sandbox.

---

## Pattern 6: Detecting and Interacting with Page iframes {#pattern-6-detecting-and-interacting-with-page-iframes}

Content scripts may need to find, filter, and interact with iframes already present on the host page. This requires careful DOM traversal and timing.

```typescript
// iframe-detector.ts
interface DetectedIframe {
  element: HTMLIFrameElement;
  src: string;
  origin: string | null;
  isCrossOrigin: boolean;
  isVisible: boolean;
}

function detectIframes(): DetectedIframe[] {
  const iframes = Array.from(document.querySelectorAll("iframe"));

  return iframes.map((iframe) => {
    let origin: string | null = null;
    let isCrossOrigin = true;

    try {
      // Accessing contentDocument throws for cross-origin iframes
      const doc = iframe.contentDocument;
      if (doc) {
        origin = new URL(iframe.src || window.location.href).origin;
        isCrossOrigin = false;
      }
    } catch {
      try {
        origin = new URL(iframe.src).origin;
      } catch {
        origin = null;
      }
    }

    const rect = iframe.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 &&
      window.getComputedStyle(iframe).display !== "none";

    return {
      element: iframe,
      src: iframe.src || "(about:blank)",
      origin,
      isCrossOrigin,
      isVisible,
    };
  });
}

// Watch for dynamically added iframes
function observeNewIframes(
  callback: (iframe: HTMLIFrameElement) => void
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLIFrameElement) {
          callback(node);
        }
        // Check descendants of added nodes
        if (node instanceof HTMLElement) {
          const nested = node.querySelectorAll("iframe");
          nested.forEach((iframe) => callback(iframe));
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return observer;
}

// Inject a content script into same-origin iframes
function injectIntoSameOriginIframes(scriptFn: () => void): void {
  const iframes = detectIframes().filter((f) => !f.isCrossOrigin);

  for (const { element } of iframes) {
    try {
      const doc = element.contentDocument;
      if (!doc) continue;

      const script = doc.createElement("script");
      script.textContent = `(${scriptFn.toString()})()`;
      doc.head.appendChild(script);
      doc.head.removeChild(script);
    } catch (err) {
      console.warn("Failed to inject into iframe:", err);
    }
  }
}

// Wait for an iframe to load before interacting
function waitForIframeLoad(
  iframe: HTMLIFrameElement,
  timeoutMs = 10000
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (iframe.contentDocument?.readyState === "complete") {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error("iframe load timeout"));
    }, timeoutMs);

    iframe.addEventListener(
      "load",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}
```

**Gotchas:**
- `iframe.contentDocument` returns `null` for cross-origin iframes. Accessing it does not throw; it simply returns `null`. However, accessing properties on a cross-origin `contentWindow` does throw.
- Dynamically created iframes may start with `about:blank` and change their `src` later. Wait for the `load` event before reading the final URL.
- MV3 content scripts can be configured with `"all_frames": true` in the manifest to automatically inject into all matching iframes, avoiding manual injection.

---

## Pattern 7: Extension Popup with Embedded iframes {#pattern-7-extension-popup-with-embedded-iframes}

Extension popups can embed iframes to load external dashboards, previews, or dynamically generated content. This pattern requires careful CSP and sizing management.

```typescript
// popup.ts
interface EmbedConfig {
  url: string;
  minHeight: number;
  maxHeight: number;
}

class PopupEmbedManager {
  private iframe: HTMLIFrameElement | null = null;
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = el;
  }

  embed(config: EmbedConfig): void {
    // Remove existing iframe if any
    this.iframe?.remove();

    this.iframe = document.createElement("iframe");
    this.iframe.src = config.url;
    this.iframe.style.width = "100%";
    this.iframe.style.height = `${config.minHeight}px`;
    this.iframe.style.border = "none";
    this.iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");

    // Listen for resize requests from the embedded page
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.source !== this.iframe?.contentWindow) return;

      if (event.data.type === "resize") {
        const height = Math.min(
          Math.max(event.data.height, config.minHeight),
          config.maxHeight
        );
        if (this.iframe) {
          this.iframe.style.height = `${height}px`;
        }
        // Resize the popup itself
        document.body.style.height = `${height + 50}px`;
      }
    });

    this.iframe.addEventListener("load", () => {
      // Send configuration to the embedded page
      this.iframe?.contentWindow?.postMessage(
        { type: "init", theme: "dark" },
        new URL(config.url).origin
      );
    });

    this.container.appendChild(this.iframe);
  }

  destroy(): void {
    this.iframe?.remove();
    this.iframe = null;
  }
}

// Usage in popup
document.addEventListener("DOMContentLoaded", () => {
  const manager = new PopupEmbedManager("embed-container");

  manager.embed({
    url: chrome.runtime.getURL("dashboard.html"),
    minHeight: 300,
    maxHeight: 600,
  });
});
```

```typescript
// dashboard.ts (embedded page)
// Report content height to the parent popup for dynamic resizing
function reportHeight(): void {
  const height = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: "resize", height }, "*");
}

// Report on load and on content changes
window.addEventListener("load", reportHeight);
new MutationObserver(reportHeight).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});
```

**Gotchas:**
- Chrome extension popups have a maximum width of 800px and maximum height of 600px. The iframe must fit within these constraints.
- Popups close when they lose focus. If the iframe navigates to an external site that opens a new window, the popup will close and the iframe state is lost.
- For embedding extension pages, use `chrome.runtime.getURL()`. For external URLs, ensure the domain is listed in `frame-src` within your CSP.

---

## Pattern 8: iframe-Based UI Injection Patterns {#pattern-8-iframe-based-ui-injection-patterns}

Instead of directly manipulating the host page DOM, inject a full UI as an iframe. This provides complete style isolation and avoids conflicts with the page's CSS and JavaScript.

```typescript
// ui-injector.ts
interface InjectionOptions {
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "full-overlay";
  width: string;
  height: string;
  page: string;
  draggable?: boolean;
}

class ExtensionUIInjector {
  private container: HTMLDivElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private shadowRoot: ShadowRoot | null = null;

  inject(options: InjectionOptions): void {
    if (this.container) this.remove();

    this.container = document.createElement("div");
    this.container.id = `ext-ui-${crypto.randomUUID().slice(0, 8)}`;
    this.shadowRoot = this.container.attachShadow({ mode: "closed" });

    const positionStyles = this.getPositionStyles(options);

    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        ${positionStyles}
        width: ${options.width};
        height: ${options.height};
        z-index: 2147483647;
        font-family: system-ui, sans-serif;
      }
      .frame-wrapper {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        resize: both;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: white;
      }
      .drag-handle {
        height: 28px;
        background: #1a1a2e;
        cursor: move;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        user-select: none;
      }
      .drag-handle span {
        color: #ccc;
        font-size: 12px;
      }
      .close-btn {
        background: none;
        border: none;
        color: #ccc;
        cursor: pointer;
        font-size: 16px;
        padding: 0 4px;
      }
      .close-btn:hover {
        color: white;
      }
    `;

    const wrapper = document.createElement("div");
    wrapper.className = "frame-wrapper";

    if (options.draggable) {
      const handle = document.createElement("div");
      handle.className = "drag-handle";

      const title = document.createElement("span");
      title.textContent = "Extension Panel";
      handle.appendChild(title);

      const closeBtn = document.createElement("button");
      closeBtn.className = "close-btn";
      closeBtn.textContent = "\u00d7";
      closeBtn.addEventListener("click", () => this.remove());
      handle.appendChild(closeBtn);

      wrapper.appendChild(handle);
      this.enableDragging(handle);
    }

    this.iframe = document.createElement("iframe");
    this.iframe.src = chrome.runtime.getURL(options.page);

    wrapper.appendChild(this.iframe);
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(wrapper);
    document.body.appendChild(this.container);

    this.setupMessageChannel();
  }

  private getPositionStyles(options: InjectionOptions): string {
    switch (options.position) {
      case "bottom-right":
        return "bottom: 16px; right: 16px;";
      case "bottom-left":
        return "bottom: 16px; left: 16px;";
      case "top-right":
        return "top: 16px; right: 16px;";
      case "top-left":
        return "top: 16px; left: 16px;";
      case "full-overlay":
        return "top: 0; left: 0; width: 100vw !important; height: 100vh !important;";
    }
  }

  private enableDragging(handle: HTMLElement): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    handle.addEventListener("mousedown", (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.container!.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      // Prevent iframe from capturing mouse events during drag
      if (this.iframe) this.iframe.style.pointerEvents = "none";
    });

    document.addEventListener("mousemove", (e: MouseEvent) => {
      if (!isDragging || !this.container) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      this.container.style.left = `${startLeft + dx}px`;
      this.container.style.top = `${startTop + dy}px`;
      this.container.style.right = "auto";
      this.container.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      if (this.iframe) this.iframe.style.pointerEvents = "auto";
    });
  }

  private setupMessageChannel(): void {
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.source !== this.iframe?.contentWindow) return;

      switch (event.data.action) {
        case "close":
          this.remove();
          break;

        case "resize":
          if (this.container) {
            this.container.style.width = event.data.width;
            this.container.style.height = event.data.height;
          }
          break;

        case "forward-to-background":
          chrome.runtime.sendMessage(event.data.payload);
          break;
      }
    });
  }

  remove(): void {
    this.container?.remove();
    this.container = null;
    this.iframe = null;
    this.shadowRoot = null;
  }

  isVisible(): boolean {
    return this.container !== null;
  }

  toggle(options: InjectionOptions): void {
    if (this.isVisible()) {
      this.remove();
    } else {
      this.inject(options);
    }
  }
}

// Usage from content script
const injector = new ExtensionUIInjector();

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "toggle-panel") {
    injector.toggle({
      position: "bottom-right",
      width: "400px",
      height: "520px",
      page: "panel.html",
      draggable: true,
    });
  }
});
```

**Gotchas:**
- The injected iframe page must be listed in `web_accessible_resources` with appropriate `matches` patterns. Without this, the page URL is not loadable from the host page context.
- `z-index: 2147483647` is the maximum 32-bit integer. Some aggressive pages set high z-index values; this ensures your UI stays on top.
- Dragging requires disabling `pointer-events` on the iframe during the drag operation. Otherwise, the iframe captures mouse events and breaks the drag.
- The `resize: both` CSS property lets users resize the panel, but it only works on the wrapper, not the host element in Shadow DOM. Test across browsers.

---

## Summary {#summary}

| Pattern | Best For | Key Constraint |
|---------|----------|----------------|
| Content Script to iframe | Reading/modifying page iframes | Cross-origin needs postMessage |
| Extension iframe in Shadow DOM | Injecting UI into pages | Requires web_accessible_resources |
| Cross-Origin Messaging | Secure bidirectional communication | Must validate origin and source |
| Sandboxed iframe | Running untrusted code | No chrome.* API access |
| Permissions and CSP | Embedding external content | Must configure frame-src in CSP |
| Detecting Page iframes | Analyzing page structure | Timing-sensitive, use MutationObserver |
| Popup Embedded iframes | Rich popup interfaces | 800x600px popup size limit |
| UI Injection | Full extension panels on pages | Shadow DOM for style isolation |

> **See also:** [Content Script Isolation](content-script-isolation.md) for understanding the isolated world that content scripts run in. [Web Accessible Resources](../mv3/web-accessible-resources.md) for configuring which extension files can be loaded from web pages.
