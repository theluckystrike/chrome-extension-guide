---
layout: default
title: "Chrome Extension Content Script Patterns — Developer Guide"
description: "Learn Chrome extension content script patterns with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/content-script-patterns/"
---
# Content Script Patterns

## Overview
Content scripts run in web pages and bridge the gap between the page and your extension. They can read/modify the DOM but need messaging to communicate with the background service worker.

## Manifest Setup
```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  }],
  "permissions": ["storage"]
}
```

## run_at Options
| Value | When | Use Case |
|-------|------|----------|
| `document_start` | Before DOM is built | Inject early CSS, block elements |
| `document_idle` | Between `document_end` and just after `window.onload` (default) | Most common — safe DOM access |
| `document_end` | After DOM parsed, before subresources | DOM manipulation before images load |

## Pattern 1: Send Page Data to Background

```ts
// content.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  reportPageData: {
    request: { url: string; title: string; wordCount: number };
    response: { received: boolean };
  };
};

const msg = createMessenger<Messages>();

async function reportPage() {
  await msg.send("reportPageData", {
    url: location.href,
    title: document.title,
    wordCount: document.body.innerText.split(/\s+/).length,
  });
}

reportPage();
```

## Pattern 2: Receive Commands from Background/Popup

```ts
// content.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  highlight: {
    request: { color: string; selector: string };
    response: { count: number };
  };
  extractLinks: {
    request: void;
    response: string[];
  };
};

const msg = createMessenger<Messages>();

msg.onMessage({
  highlight: ({ color, selector }) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => (el as HTMLElement).style.backgroundColor = color);
    return { count: elements.length };
  },
  extractLinks: () => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map(a => (a as HTMLAnchorElement).href);
  },
});
```

## Pattern 3: Read Settings from Storage

Content scripts can access chrome.storage directly:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  enabled: true,
  highlightColor: "#ffff00",
  blockedSelectors: [] as string[],
});
const storage = createStorage({ schema });

async function applySettings() {
  const { enabled, highlightColor, blockedSelectors } = await storage.getAll();

  if (!enabled) return;

  // Hide blocked elements
  blockedSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      (el as HTMLElement).style.display = "none";
    });
  });
}

// React to settings changes in real-time
storage.watch("enabled", (enabled) => {
  if (!enabled) removeAllModifications();
  else applySettings();
});

storage.watch("highlightColor", (color) => {
  document.querySelectorAll(".ext-highlight").forEach(el => {
    (el as HTMLElement).style.backgroundColor = color;
  });
});

applySettings();
```

## Pattern 4: Overlay/Widget UI

Inject a floating UI widget into the page:

```ts
function createWidget() {
  const shadow = document.createElement("div");
  shadow.id = "my-extension-root";
  const shadowRoot = shadow.attachShadow({ mode: "closed" });

  shadowRoot.innerHTML = `
    <style>
      .widget { position: fixed; bottom: 20px; right: 20px; z-index: 999999;
        background: #1a1a2e; color: #fff; padding: 16px; border-radius: 8px;
        font-family: system-ui; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
      .widget button { background: #4ade80; border: none; padding: 8px 16px;
        border-radius: 4px; cursor: pointer; color: #000; }
    </style>
    <div class="widget">
      <p id="status">Ready</p>
      <button id="action">Run</button>
    </div>
  `;

  document.body.appendChild(shadow);
  return shadowRoot;
}
```

Explain: Shadow DOM isolates your styles from the page and vice versa.

## Pattern 5: Mutation Observer (Dynamic Pages)

Watch for DOM changes on SPAs:

```ts
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        processNewElement(node);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
```

## Pattern 6: Bidirectional Communication

Content script acts as a bridge between the page and background:

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  processData: {
    request: { data: string };
    response: { result: string };
  };
};
const msg = createMessenger<Messages>();

// Listen for messages FROM the page (via window.postMessage)
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "FROM_PAGE") return;

  // Forward to background via extension messaging
  const result = await msg.send("processData", { data: event.data.payload });

  // Send result back to page
  window.postMessage({ type: "FROM_EXTENSION", result: result.result }, "*");
});
```

## Pattern 7: Conditional Injection

Only activate on certain pages:

```ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  enabledDomains: [] as string[],
  disabledDomains: [] as string[],
});
const storage = createStorage({ schema });

async function shouldActivate(): Promise<boolean> {
  const { enabledDomains, disabledDomains } = await storage.getAll();
  const hostname = location.hostname;

  if (disabledDomains.includes(hostname)) return false;
  if (enabledDomains.length > 0 && !enabledDomains.includes(hostname)) return false;
  return true;
}

if (await shouldActivate()) {
  init();
}
```

## Content Script Isolation
- Content scripts share the DOM but have a separate JavaScript environment
- Cannot access page's JS variables (use `world: "MAIN"` in MV3 for that)
- Page cannot access your content script's variables
- Use Shadow DOM for UI to avoid CSS conflicts

## Gotchas
- Content scripts can't use `chrome.tabs`, `chrome.action`, etc. — use messaging
- `chrome.storage` IS available in content scripts
- Don't pollute the global scope — wrap in IIFE or use modules
- MutationObserver is essential for SPAs (React, Vue, etc.)
- Clean up on SPA navigation (remove observers, listeners)
- Content script CSS can conflict with page CSS — use Shadow DOM or unique prefixes

## Related Guides
- [Messaging Quickstart](../tutorials/messaging-quickstart.md)
- [Storage Quickstart](../tutorials/storage-quickstart.md)
- [Popup Patterns](popup-patterns.md)

## Related Articles

- [Content Script Injection](../patterns/content-script-injection.md)
- [Communication Bridge](../patterns/content-script-communication-bridge.md)
