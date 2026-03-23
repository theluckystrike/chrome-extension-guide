---
layout: default
title: "Content Script Injection Patterns. Developer Guide"
description: "Master advanced content script injection patterns in Chrome extensions with this comprehensive guide covering programmatic injection, CSS injection, shadow DOM integration, and world types."
canonical_url: "https://bestchromeextensions.com/guides/content-script-injection-patterns/"
---

Content Script Injection Patterns

Content script injection is the foundation of how Chrome extensions interact with web pages. While basic injection through the manifest works for simple use cases, advanced extension development requires deeper understanding of programmatic injection, CSS manipulation, and Shadow DOM integration. This guide covers sophisticated patterns that enable robust, performant, and secure content script deployment for complex extension architectures.

Table of Contents {#table-of-contents}

- [Programmatic Injection detailed look](#programmatic-injection-deep detailed look)
- [CSS Injection Patterns](#css-injection-patterns)
- [Shadow DOM Integration](#shadow-dom-integration)
- [World Types and Isolation](#world-types-and-isolation)
- [Injection Lifecycle Management](#injection-lifecycle-management)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)

---

Programmatic Injection detailed look {#programmatic-injection-deep detailed look}

Programmatic injection using `chrome.scripting.executeScript` provides granular control over when and how content scripts execute. Unlike static manifest declarations, programmatic injection allows runtime decisions based on user actions, page conditions, or extension state.

Button-Triggered Injection

The most common pattern triggers injection when users click the extension icon:

```typescript
// background.ts
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Check if already injected to avoid duplicate execution
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.__EXTENSION_INJECTED__
  });

  if (result) {
    // Script already running - send message instead
    chrome.tabs.sendMessage(tab.id, { action: "toggle" });
    return;
  }

  // First-time injection
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content/main.js"],
  });

  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ["content/styles.css"],
  });
});
```

Conditional Injection Based on Page State

Programmatic injection excels at making runtime decisions about whether and how to inject:

```typescript
// background.ts
async function shouldInject(tabId: number): Promise<boolean> {
  // Check page URL against complex patterns
  const [tab] = await chrome.tabs.get(tabId);
  if (!tab.url) return false;

  // Exclude extension pages and Chrome internal pages
  const excluded = [
    "chrome://",
    "chrome-extension://",
    "devtools://",
    "about:",
  ];
  if (excluded.some((prefix) => tab.url.startsWith(prefix))) {
    return false;
  }

  // Query page for specific conditions
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Check if page has specific elements we need
        return {
          hasReact: !!document.querySelector('[data-reactroot]'),
          hasVue: !!document.querySelector('[data-v-app]'),
          isSPA: !!document.querySelector('#app, #root, [role="application"]'),
        };
      },
    });
    return result?.isSPA ?? true;
  } catch {
    return false;
  }
}
```

Injection with Parameters

Pass runtime data to content scripts through function injection:

```typescript
// background.ts
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== "inject-with-config") return;

  const { tabId, config } = message;

  chrome.scripting.executeScript({
    target: { tabId },
    func: (userConfig) => {
      // This function runs in the page context
      window.__EXTENSION_CONFIG__ = userConfig;
      window.__EXTENSION_INJECTED__ = true;
      initializeExtension(userConfig);
    },
    args: [config],
  });
});

function initializeExtension(config: ExtensionConfig) {
  console.log("Extension initialized with config:", config);
  // Main content script logic here
}
```

Handling Injection Failures

Robust extensions handle various failure scenarios:

```typescript
// background.ts
async function safeInject(tabId: number): Promise<boolean> {
  try {
    // Method 1: Check for existing injection
    const [checkResult] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.__EXTENSION_LOADED__,
    });
    if (checkResult) return true;

    // Method 2: Inject with error handling
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        try {
          window.__EXTENSION_LOADED__ = true;
          main();
        } catch (e) {
          console.error("Content script error:", e);
          window.__EXTENSION_ERROR__ = e.message;
        }
      },
    });
    return true;
  } catch (error) {
    // Common errors: tab closed, permissions denied, etc.
    if (error instanceof Error) {
      if (error.message.includes("No tab with id")) {
        console.log("Tab no longer exists");
      } else if (error.message.includes("Permission denied")) {
        console.log("Missing scripting permission");
      }
    }
    return false;
  }
}
```

---

CSS Injection Patterns {#css-injection-patterns}

CSS injection enables visual modifications to web pages. Chrome provides both static and programmatic approaches, each with specific use cases and trade-offs.

Static CSS Injection

Declared in the manifest, static CSS automatically applies to matching pages:

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "css": ["styles/base.css", "styles/theme.css"]
  }]
}
```

Static injection applies immediately when the content script loads, but cannot be conditionally applied or removed at runtime without extension reload.

Programmatic CSS Injection

For dynamic styling control, use `chrome.scripting.insertCSS` and `removeCSS`:

```typescript
// background.ts
chrome.runtime.onMessage.addListener((message, sender) => {
  if (!sender.tab?.id) return;
  const tabId = sender.tab.id;

  if (message.type === "enable-dark-mode") {
    chrome.scripting.insertCSS({
      target: { tabId },
      files: ["styles/dark-mode.css"],
    });
  } else if (message.type === "disable-dark-mode") {
    chrome.scripting.removeCSS({
      target: { tabId },
      files: ["styles/dark-mode.css"],
    });
  }
});
```

Injecting CSS Rules Dynamically

For fine-grained control over specific elements, inject CSS rules directly:

```typescript
// content.ts - runs in page context
function injectDynamicStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .extension-highlight {
      background-color: rgba(255, 235, 59, 0.3);
      border: 2px solid #ffc107;
      border-radius: 4px;
    }
    .extension-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999999;
    }
    .extension-tooltip {
      position: absolute;
      padding: 8px 12px;
      background: #333;
      color: white;
      border-radius: 4px;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `;
  document.head.appendChild(style);
  return style;
}
```

Theme Switching Pattern

A complete theme switching implementation:

```typescript
// content.ts
type Theme = "light" | "dark" | "auto";

class ThemeManager {
  private styleElement: HTMLStyleElement | null = null;
  private currentTheme: Theme = "auto";

  async init() {
    const { theme } = await chrome.storage.sync.get("theme");
    this.setTheme(theme || "auto");

    // Listen for theme changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.theme) {
        this.setTheme(changes.theme.newValue);
      }
    });
  }

  setTheme(theme: Theme) {
    this.currentTheme = theme;
    const resolvedTheme = theme === "auto" ? this.getSystemTheme() : theme;

    if (this.styleElement) {
      this.styleElement.remove();
    }

    this.styleElement = document.createElement("style");
    this.styleElement.textContent = this.getThemeCSS(resolvedTheme);
    document.head.appendChild(this.styleElement);
  }

  private getSystemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  private getThemeCSS(theme: "light" | "dark"): string {
    if (theme === "dark") {
      return `
        body.extension-theme { background: #1a1a1a; color: #e0e0e0; }
        .extension-card { background: #2d2d2d; border-color: #404040; }
        .extension-button { background: #4a4a4a; color: #ffffff; }
      `;
    }
    return `
      body.extension-theme { background: #ffffff; color: #333333; }
      .extension-card { background: #f5f5f5; border-color: #e0e0e0; }
      .extension-button { background: #2196f3; color: #ffffff; }
    `;
  }
}

new ThemeManager().init();
```

---

Shadow DOM Integration {#shadow-dom-injection}

Shadow DOM provides encapsulation for extension UI, preventing conflicts with page styles and JavaScript. This is crucial for building reliable extensions that work on complex websites with their own CSS and JavaScript.

Creating Shadow DOM Host

Inject extension UI into a Shadow DOM container:

```typescript
// content.ts
function createShadowHost(): HTMLElement {
  // Create a container element
  const host = document.createElement("div");
  host.id = "extension-root";
  host.style.cssText = "all: initial;"; // Reset all CSS

  // Attach Shadow DOM
  const shadow = host.attachShadow({ mode: "open" });

  // Inject styles into shadow DOM
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 2147483647;
      overflow: hidden;
    }
    .header {
      padding: 16px;
      background: #2196f3;
      color: white;
      font-weight: 600;
    }
    .content {
      padding: 16px;
    }
  `;
  shadow.appendChild(style);

  // Add content
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <div class="header">Extension Panel</div>
    <div class="content">
      <p>This content is isolated in Shadow DOM.</p>
    </div>
  `;
  shadow.appendChild(panel);

  document.body.appendChild(host);
  return host;
}
```

Shadow DOM with React Components

Integrate React components into Shadow DOM for complete isolation:

```typescript
// content.tsx
import { createRoot } from "react-dom/client";
import React from "react";

function mountReactInShadow(Component: React.ComponentType) {
  const host = document.createElement("div");
  host.id = "extension-react-root";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Create mount point for React
  const mountPoint = document.createElement("div");
  mountPoint.id = "react-mount";
  shadow.appendChild(mountPoint);

  // Inject styles specifically for this shadow root
  const styleSheet = document.createElement("style");
  styleSheet.textContent = getExtensionStyles(); // Your CSS here
  shadow.appendChild(styleSheet);

  // Mount React
  const root = createRoot(mountPoint);
  root.render(<Component />);

  return { host, shadow, root };
}

function getExtensionStyles(): string {
  return `
    * { box-sizing: border-box; }
    button {
      padding: 8px 16px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover { background: #1976d2; }
  `;
}
```

Communicating with Shadow DOM Content

Bridge messages between the content script and Shadow DOM internals:

```typescript
// content.ts
class ShadowDOMBridge {
  private shadowRoot: ShadowRoot;

  constructor(hostId: string) {
    const host = document.getElementById(hostId);
    if (!host || !host.shadowRoot) {
      throw new Error("Shadow host not found");
    }
    this.shadowRoot = host.shadowRoot;

    // Listen for messages from shadow DOM
    this.shadowRoot.addEventListener("extension-message", (e: Event) => {
      const customEvent = e as CustomEvent;
      this.handleMessage(customEvent.detail);
    });
  }

  private handleMessage(data: MessageData) {
    switch (data.type) {
      case "get-state":
        this.sendToShadow({ type: "state-update", state: getAppState() });
        break;
      case "action":
        executeAction(data.action);
        break;
    }
  }

  sendToShadow(message: object) {
    const event = new CustomEvent("page-message", {
      detail: message,
      bubbles: true,
      composed: true,
    });
    this.shadowRoot.dispatchEvent(event);
  }
}

// Usage inside shadow DOM
const sendToPage = (data: object) => {
  const event = new CustomEvent("extension-message", {
    detail: data,
    bubbles: true,
    composed: true,
  });
  document.dispatchEvent(event);
};
```

---

World Types and Isolation {#world-types-and-isolation}

Chrome provides two execution worlds for content scripts: the isolated world (default) and the main world. Understanding the differences is essential for advanced integrations.

Isolated World (Default)

Content scripts run in an isolated world with its own JavaScript context:

```typescript
// This runs in isolated world - can't access page JS
// content.ts
console.log(window.location); // Extension's window, not page's

const pageWindow = window.wrappedJSObject; // Mozilla extension API (not Chrome)
```

Main World Injection

Inject scripts directly into the page's JavaScript context:

```typescript
// background.ts
chrome.scripting.executeScript({
  target: { tabId },
  world: "MAIN", // Inject into page's JavaScript context
  func: () => {
    // This runs in the page's context - can access page JS
    window.__PAGE_DATA__ = {
      user: window.currentUser,
      state: window.__REDUX_STORE__.getState(),
    };
  },
});
```

Use Cases for Main World

```typescript
// Access page's React/Vue/Angular state
chrome.scripting.executeScript({
  target: { tabId },
  world: "MAIN",
  func: () => {
    // React
    const reactRoot = document.querySelector("[data-reactroot]");
    const reactInternal = reactRoot?._reactRootContainer?._internalRoot;

    // Vue
    const vueApp = document.querySelector("[data-v-app]");
    const vueInternal = vueApp?.__vue_app__;

    // Angular
    const ngRoot = document.querySelector("app-root");
    const ngZone = ngRoot?.__zone_symbol__?.ngZone;

    window.__FRAMEWORK_STATE__ = { reactInternal, vueInternal, ngZone };
  },
});
```

---

Injection Lifecycle Management {#injection-lifecycle-management}

Managing the lifecycle of injected content scripts ensures proper initialization, cleanup, and state management.

Tracking Injection State

```typescript
// content.ts
const INJECTION_KEY = "__EXTENSION_STATE__";

interface ExtensionState {
  initialized: boolean;
  version: string;
  features: string[];
}

function getState(): ExtensionState {
  return window[INJECTION_KEY] as ExtensionState;
}

function setState(state: Partial<ExtensionState>) {
  window[INJECTION_KEY] = { ...getState(), ...state };
}

function initialize() {
  if (getState()?.initialized) {
    console.log("Already initialized");
    return;
  }

  setState({ initialized: true, version: "1.0.0", features: [] });
  setupEventListeners();
  setupMutationObserver();
}

// Clean up on page navigation (for SPAs)
function setupMutationObserver() {
  const observer = new MutationObserver(() => {
    if (!document.body) return;
    observer.disconnect();
    initialize();
  });
  observer.observe(document.documentElement, { childList: true });
}

// Cleanup on unload
window.addEventListener("unload", () => {
  cleanup();
});
```

Graceful Degradation

Handle scenarios where injection fails or conditions aren't met:

```typescript
// content.ts
async function conditionalInit() {
  // Check dependencies
  const hasRequiredLibs = checkLibraries();

  if (!hasRequiredLibs) {
    console.warn("Required libraries not found, deferring initialization");
    setTimeout(conditionalInit, 1000);
    return;
  }

  // Check DOM readiness
  if (document.readyState === "loading") {
    await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve));
  }

  // All checks passed
  initialize();
}

function checkLibraries(): boolean {
  // Check for jQuery, React, Vue, or custom page objects
  return !!(
    window.jQuery ||
    window.React ||
    window.Vue ||
    window.__PAGE_APP__
  );
}
```

---

Performance Optimization {#performance-optimization}

Content script injection impacts page performance. Optimize for minimal overhead.

Lazy Injection

Defer expensive operations until needed:

```typescript
// content.ts
class LazyLoader {
  private initialized = false;

  constructor(private triggerElement: string) {
    this.setupTrigger();
  }

  private setupTrigger() {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.initialized) {
          this.initialize();
        }
      },
      { threshold: 0.1 }
    );

    const trigger = document.querySelector(this.triggerElement);
    if (trigger) observer.observe(trigger);
  }

  private initialize() {
    this.initialized = true;
    loadHeavyFeature();
  }
}

// Only load on user interaction
document.addEventListener("click", () => {
  if (!window.__HEAVY_FEATURE_LOADED__) {
    loadHeavyFeature();
    window.__HEAVY_FEATURE_LOADED__ = true;
  }
}, { once: true });
```

Efficient DOM Operations

```typescript
// Bad: Multiple reflows
element.style.width = "100px";
element.style.height = "100px";
element.style.padding = "10px";

// Good: Single update
element.style.cssText = "width: 100px; height: 100px; padding: 10px;";

// Better: Use CSS classes
element.classList.add("extension-active");
```

---

Security Considerations {#security-considerations}

Always follow security best practices when injecting content scripts.

Input Sanitization

```typescript
// content.ts
function sanitizeHTML(input: string): string {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

// Never use innerHTML with untrusted data
element.textContent = userInput; // Safe
// element.innerHTML = userInput; // Dangerous!
```

Content Security Policy Compliance

```typescript
// If page has strict CSP, use safe alternatives
async function fetchData(url: string) {
  // Use chrome.runtime.fetch instead of page's fetch
  const response = await chrome.runtime.sendMessage({
    type: "fetch",
    url,
  });
  return response;
}
```

---

Related Guides {#related-guides}

- [Content Script Patterns](content-script-patterns.md)
- [Content Script Isolation](content-script-isolation.md)
- [Static vs Programmatic Injection](content-script-injection.md)
- [Service Worker Best Practices](background-patterns.md)

---

Related Articles {#related-articles}

- [Chrome Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Shadow DOM Guide](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [Content Security Policy](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
