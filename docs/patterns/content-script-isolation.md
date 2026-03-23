---
layout: default
title: "Chrome Extension Content Script Isolation. Best Practices"
description: "Maintain proper isolation between content scripts and page scripts."
canonical_url: "https://bestchromeextensions.com/patterns/content-script-isolation/"
---

Content Script Isolation Patterns

Overview {#overview}

The [content script isolation reference](../guides/content-script-isolation.md) explains how Chrome's isolated worlds work. This guide provides practical patterns for working within. and across. isolation boundaries: safe DOM interaction, cross-world communication, Shadow DOM encapsulation, defending against hostile pages, and managing multiple content scripts.

---

The Isolation Model {#the-isolation-model}

```

                  Web Page                
                                         
      
    Page World      Isolated World   
                    (Content Script)  
   - page JS        - extension JS   
   - page vars      - chrome.* APIs  
   - page libs      - own globals    
      
                                       
                     
                                        
                          
            Shared DOM                 
                          

```

Both worlds see the same DOM, but they have separate JavaScript execution contexts. This means:
- Content scripts can't access `window.jQuery` or any page-defined variable
- The page can't access `chrome.runtime` or any content script variable
- DOM elements and events are shared. both can add/read/modify them
- Prototype chains are separate. `Array.prototype` modifications in one world don't affect the other

---

Pattern 1: Safe DOM Access {#pattern-1-safe-dom-access}

The page can override built-in DOM methods. Protect against tampered prototypes:

```ts
// content.ts. Capture native references before page scripts can modify them

// Save references at content script load time (document_start)
const nativeQuerySelector = Document.prototype.querySelector;
const nativeQuerySelectorAll = Document.prototype.querySelectorAll;
const nativeCreateElement = Document.prototype.createElement;
const nativeGetAttribute = Element.prototype.getAttribute;
const nativeSetAttribute = Element.prototype.setAttribute;
const nativeAddEventListener = EventTarget.prototype.addEventListener;
const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;

// Use these instead of direct calls
export const safeDOM = {
  querySelector<T extends Element>(
    root: Document | Element,
    selector: string
  ): T | null {
    return nativeQuerySelector.call(root, selector) as T | null;
  },

  querySelectorAll<T extends Element>(
    root: Document | Element,
    selector: string
  ): NodeListOf<T> {
    return nativeQuerySelectorAll.call(root, selector) as NodeListOf<T>;
  },

  createElement(tag: string): HTMLElement {
    return nativeCreateElement.call(document, tag);
  },

  getAttribute(el: Element, name: string): string | null {
    return nativeGetAttribute.call(el, name);
  },

  setAttribute(el: Element, name: string, value: string): void {
    nativeSetAttribute.call(el, name, value);
  },

  addEventListener(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    nativeAddEventListener.call(target, type, handler, options);
  },

  removeEventListener(
    target: EventTarget,
    type: string,
    handler: EventListener
  ): void {
    nativeRemoveEventListener.call(target, type, handler);
  },
};
```

Use with `run_at: "document_start"` to capture native references before any page script runs.

---

Pattern 2: Shadow DOM Encapsulation {#pattern-2-shadow-dom-encapsulation}

Inject UI that is completely isolated from the page's CSS and JavaScript:

```ts
// content.ts. Create a fully encapsulated UI
function createIsolatedUI() {
  const host = document.createElement("div");
  host.id = "my-ext-host";

  // closed mode: page JS can't access shadow internals
  const shadow = host.attachShadow({ mode: "closed" });

  // Styles are scoped to the shadow DOM. no page CSS leaks in
  shadow.innerHTML = `
    <style>
      /* Reset everything. start fresh */
      :host {
        all: initial !important;
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        z-index: 2147483647 !important;
        font-family: system-ui, sans-serif !important;
      }

      /* Your extension styles. completely isolated */
      .panel {
        width: 320px;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin: 12px;
        padding: 16px;
        box-shadow: 0 2px 16px rgba(0,0,0,0.12);
        color: #333;
        font-size: 14px;
        line-height: 1.5;
      }

      button {
        padding: 8px 16px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #f5f5f5;
        cursor: pointer;
        font-size: 14px;
      }

      button:hover { background: #e8e8e8; }
    </style>

    <div class="panel">
      <h3>Extension Panel</h3>
      <p id="content">Loading...</p>
      <button id="action-btn">Run Action</button>
    </div>
  `;

  // Event handling within shadow DOM
  const btn = shadow.getElementById("action-btn")!;
  btn.addEventListener("click", async () => {
    const content = shadow.getElementById("content")!;
    content.textContent = "Processing...";
    const result = await chrome.runtime.sendMessage({ type: "run-action" });
    content.textContent = result.message;
  });

  document.body.appendChild(host);
  return { host, shadow };
}
```

Why Closed Shadow DOM? {#why-closed-shadow-dom}

```ts
// mode: "open". page JS can access your shadow root
const hostOpen = div.attachShadow({ mode: "open" });
// A hostile page could do: document.querySelector('#my-ext-host').shadowRoot
// and read/modify your extension's injected UI

// mode: "closed". page JS cannot access shadow internals
const hostClosed = div.attachShadow({ mode: "closed" });
// document.querySelector('#my-ext-host').shadowRoot === null
// Your reference to the shadow root is the only way in
```

---

Pattern 3: Cross-World Communication {#pattern-3-cross-world-communication}

Content scripts (isolated world) and page scripts (main world) can communicate through the shared DOM:

Using window.postMessage {#using-windowpostmessage}

```ts
// content.ts. Listen for page messages
window.addEventListener("message", (event) => {
  // Always verify the source
  if (event.source !== window) return;

  // Use a unique prefix to avoid collisions
  if (event.data?.type?.startsWith("MY_EXT_")) {
    handlePageMessage(event.data);
  }
});

function handlePageMessage(data: { type: string; payload: unknown }) {
  switch (data.type) {
    case "MY_EXT_PAGE_DATA":
      // Forward page data to background
      chrome.runtime.sendMessage({
        type: "page-data-received",
        data: data.payload,
      });
      break;
  }
}

// Send to page world
function sendToPage(type: string, payload: unknown) {
  window.postMessage({ type: `MY_EXT_${type}`, payload }, "*");
}
```

Using Custom DOM Events {#using-custom-dom-events}

```ts
// content.ts. More targeted than postMessage
const EVENT_PREFIX = "myext";

function listenToPage(eventName: string, handler: (detail: unknown) => void) {
  document.addEventListener(`${EVENT_PREFIX}:${eventName}`, ((e: CustomEvent) => {
    handler(e.detail);
  }) as EventListener);
}

function emitToPage(eventName: string, detail: unknown) {
  document.dispatchEvent(
    new CustomEvent(`${EVENT_PREFIX}:${eventName}`, {
      detail,
      bubbles: false, // don't let page handlers on parent elements see this
    })
  );
}

// Usage
listenToPage("request-data", (detail) => {
  // Page is requesting data from the extension
  const result = processRequest(detail);
  emitToPage("response-data", result);
});
```

Using Shared DOM Elements (Data Channel) {#using-shared-dom-elements-data-channel}

```ts
// content.ts. Hidden element as a data channel
function createDataChannel(): HTMLElement {
  const channel = document.createElement("div");
  channel.id = "my-ext-data-channel";
  channel.style.display = "none";
  document.body.appendChild(channel);

  // Watch for page-side writes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "data-page-msg") {
        const msg = channel.getAttribute("data-page-msg");
        if (msg) {
          handlePageMessage(JSON.parse(msg));
          channel.removeAttribute("data-page-msg");
        }
      }
    }
  });

  observer.observe(channel, { attributes: true });
  return channel;
}

// Send data to page
function sendViaChannel(data: unknown) {
  const channel = document.getElementById("my-ext-data-channel")!;
  channel.setAttribute("data-ext-msg", JSON.stringify(data));
}
```

---

Pattern 4: Defending Against Hostile Pages {#pattern-4-defending-against-hostile-pages}

Pages can try to interfere with your content script. Defensive patterns:

```ts
// content.ts. Defense against page manipulation

// 1. Don't trust page-controlled DOM values
function safeGetText(selector: string): string {
  const el = document.querySelector(selector);
  if (!el) return "";

  // textContent is safer than innerHTML (no XSS risk)
  // But the page controls the DOM, so validate the result
  return (el.textContent ?? "").trim();
}

// 2. Validate before forwarding to background
function validatePageData(data: unknown): data is { url: string; title: string } {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d.url === "string" && typeof d.title === "string";
}

// 3. Don't expose extension ID patterns in the DOM
// Bad: <div data-ext-id="chrome-extension://abc123...">
// Good: Use opaque identifiers
function generateSessionId(): string {
  return crypto.randomUUID();
}

// 4. Rate-limit messages from the page
const messageTimestamps: number[] = [];
const MAX_MESSAGES_PER_SECOND = 10;

function isRateLimited(): boolean {
  const now = Date.now();
  messageTimestamps.push(now);

  // Remove timestamps older than 1 second
  while (messageTimestamps.length > 0 && messageTimestamps[0] < now - 1000) {
    messageTimestamps.shift();
  }

  return messageTimestamps.length > MAX_MESSAGES_PER_SECOND;
}
```

---

Pattern 5: Multiple Content Scripts {#pattern-5-multiple-content-scripts}

When you have multiple content scripts or need modular organization:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/init.js"],
      "run_at": "document_start"
    },
    {
      "matches": ["<all_urls>"],
      "js": ["content/main.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://*.github.com/*"],
      "js": ["content/github.js"],
      "run_at": "document_idle"
    }
  ]
}
```

Coordinate between scripts:

```ts
// content/init.ts. Runs first at document_start
// Capture native references, set up shared state

(globalThis as any).__extShared = {
  nativeQuerySelector: Document.prototype.querySelector.bind(document),
  sessionId: crypto.randomUUID(),
  initialized: true,
};
```

```ts
// content/main.ts. Runs at document_idle
const shared = (globalThis as any).__extShared;
if (!shared?.initialized) {
  console.error("Init script did not run");
}

// Use the captured native references
const el = shared.nativeQuerySelector("#target");
```

---

Pattern 6: Programmatic Injection with World Selection {#pattern-6-programmatic-injection-with-world-selection}

MV3 lets you choose which world to inject into:

```ts
// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

// Inject into the ISOLATED world (default). has chrome.* APIs
async function injectContentScript(tabId: number) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content/analyzer.js"],
    world: "ISOLATED", // default. extension APIs available
  });
}

// Inject into the MAIN world. access page JavaScript
async function injectPageScript(tabId: number) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN", // page world. no chrome.* APIs
    func: () => {
      // Can access page globals: React, jQuery, app state
      const reactRoot = document.getElementById("root");
      const fiber = (reactRoot as any)?._reactRootContainer;

      // Send data back via DOM events
      document.dispatchEvent(
        new CustomEvent("ext:page-data", {
          detail: { hasReact: !!fiber },
        })
      );
    },
  });
}

// Typical flow: inject both, have them communicate via DOM events
async function analyzeTab(tabId: number) {
  // First inject the isolated world script to listen for events
  await injectContentScript(tabId);
  // Then inject the main world script to gather page data
  await injectPageScript(tabId);
}
```

---

Pattern 7: CSS Isolation Without Shadow DOM {#pattern-7-css-isolation-without-shadow-dom}

When Shadow DOM is overkill, use aggressive CSS scoping:

```ts
// content.ts
function injectScopedUI() {
  const container = document.createElement("div");
  container.id = "my-ext-root-a7b3c";  // unique ID to avoid collisions

  const style = document.createElement("style");
  style.textContent = `
    /* Reset all inherited styles */
    #my-ext-root-a7b3c,
    #my-ext-root-a7b3c * {
      all: revert;
      box-sizing: border-box;
    }

    /* Scope all rules to our container */
    #my-ext-root-a7b3c {
      position: fixed;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      z-index: 2147483647;
    }

    #my-ext-root-a7b3c .ext-button {
      /* Use namespaced class names */
      padding: 8px 16px;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(container);
  return container;
}
```

---

Pattern 8: Context Invalidation Handling {#pattern-8-context-invalidation-handling}

When an extension updates, existing content scripts lose their connection to the background:

```ts
// content.ts. Handle extension context invalidation
function isContextValid(): boolean {
  try {
    chrome.runtime.id;
    return true;
  } catch {
    return false;
  }
}

// Wrap all chrome.* API calls
async function safeSendMessage(message: unknown): Promise<unknown> {
  if (!isContextValid()) {
    console.warn("Extension context invalidated. reloading page");
    cleanup();
    // Optionally notify the user
    showBanner("Extension was updated. Please refresh the page.");
    return null;
  }

  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    if (String(error).includes("Extension context invalidated")) {
      cleanup();
      showBanner("Extension was updated. Please refresh the page.");
      return null;
    }
    throw error;
  }
}

function showBanner(message: string) {
  const banner = document.createElement("div");
  banner.textContent = message;
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    padding: "12px",
    background: "#ff9800",
    color: "#000",
    textAlign: "center",
    zIndex: "2147483647",
    fontFamily: "system-ui",
    fontSize: "14px",
    cursor: "pointer",
  });
  banner.addEventListener("click", () => location.reload());
  document.body.appendChild(banner);
}
```

---

Summary {#summary}

| Pattern | Problem It Solves |
|---------|------------------|
| Safe DOM references | Page tampering with native prototypes |
| Closed Shadow DOM | Complete CSS/JS isolation for injected UI |
| postMessage / custom events | Cross-world communication |
| Hostile page defense | XSS, rate limiting, data validation |
| Multiple content scripts | Modular organization, shared state |
| World selection | Choosing ISOLATED vs MAIN world injection |
| CSS scoping | Style isolation without Shadow DOM |
| Context invalidation | Graceful handling of extension updates |

Content script isolation is Chrome's security boundary. Work with it: use the isolated world for extension logic, inject into the main world only when you need page variables, and encapsulate your UI with Shadow DOM. Never trust data from the page. validate everything that crosses the isolation boundary.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
