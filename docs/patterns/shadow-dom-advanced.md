# Advanced Shadow DOM Patterns for Chrome Extensions

Shadow DOM is the single most powerful tool for building robust content script UIs. It provides true DOM and style encapsulation, preventing host page interference and ensuring your extension UI renders exactly as designed. This guide covers eight advanced patterns that go beyond the basics.

> **Cross-references:** [Content Script Isolation](content-script-isolation.md) | [Building with React](building-with-react.md)

---

## 1. Creating Isolated UI with Shadow DOM in Content Scripts

The foundational pattern: inject a host element into the page and attach a shadow root so your UI lives in an isolated subtree.

**Explanation:**
Content scripts share the page's DOM. Without Shadow DOM, your injected elements inherit page styles, collide with page selectors, and risk being mutated by page scripts. Attaching a closed shadow root gives you a clean slate and prevents external access via `element.shadowRoot`.

```typescript
// content-script.ts
function createIsolatedUI(): ShadowRoot {
  const host = document.createElement("extension-ui-host");

  // Closed mode prevents page scripts from accessing shadowRoot
  const shadow = host.attachShadow({ mode: "closed" });

  // Reset all inherited styles on the host element
  host.style.cssText = `
    all: initial !important;
    position: fixed !important;
    z-index: 2147483647 !important;
    top: 0 !important;
    right: 0 !important;
  `;

  document.documentElement.appendChild(host);
  return shadow;
}

// Usage
const shadow = createIsolatedUI();
const container = document.createElement("div");
container.id = "app-root";
shadow.appendChild(container);
```

**Gotchas:**
- Using `mode: "open"` lets any page script read your DOM via `host.shadowRoot`. Always use `"closed"` for extension UIs where security matters.
- Some aggressive pages run `MutationObserver` and remove unknown elements. You may need to re-inject or use `document_start` timing.
- The host element is still visible in DevTools; a custom tag name like `extension-ui-host` avoids collisions with common selectors.

---

## 2. Styling Shadow DOM Components (CSS Injection)

Inject styles into your shadow root without any risk of leaking into (or being affected by) the host page.

**Explanation:**
Styles inside a shadow root are fully scoped. You can inline them via a `<style>` element, load a CSS file from your extension bundle, or use `adoptedStyleSheets` for maximum performance and deduplication.

```typescript
// styles.ts
function injectStyles(shadow: ShadowRoot, cssText: string): void {
  // Option A: <style> element (broadest compatibility)
  const style = document.createElement("style");
  style.textContent = cssText;
  shadow.appendChild(style);
}

function injectStylesheet(shadow: ShadowRoot, path: string): void {
  // Option B: <link> to bundled CSS (requires web_accessible_resources)
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL(path);
  shadow.appendChild(link);
}

function injectAdoptedStyles(shadow: ShadowRoot, cssText: string): void {
  // Option C: adoptedStyleSheets (best performance, Chrome 73+)
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  shadow.adoptedStyleSheets = [sheet];
}

// Usage with adoptedStyleSheets (preferred)
const css = `
  :host {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    color: #1a1a1a;
  }
  .panel {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;
injectAdoptedStyles(shadow, css);
```

**Gotchas:**
- `adoptedStyleSheets` is the fastest option because it avoids creating DOM nodes, but it is not supported in Firefox (as of early 2025). If you target Firefox, use `<style>` elements.
- When using `<link>`, the CSS file path must be listed under `web_accessible_resources` in `manifest.json`, which exposes that file to all websites.
- Styles defined with `:host` target the shadow host element itself, which is useful for positioning and layout.

---

## 3. Shadow DOM Event Handling and Delegation

Handle events inside shadow DOM correctly, accounting for retargeting and composed paths.

**Explanation:**
Events that originate inside a shadow tree are "retargeted": listeners outside the shadow root see the host element as `event.target`, not the actual clicked element. Use `event.composedPath()` to get the full path. For delegation inside the shadow root, attach a single listener to the shadow root itself.

```typescript
// events.ts
function setupEventDelegation(shadow: ShadowRoot): void {
  // Delegation inside the shadow root
  shadow.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    // Match by data attribute for reliable delegation
    const action = target.closest<HTMLElement>("[data-action]");
    if (!action) return;

    switch (action.dataset.action) {
      case "close":
        handleClose();
        break;
      case "submit":
        handleSubmit(action);
        break;
      case "toggle":
        action.classList.toggle("active");
        break;
    }
  });

  // Prevent events from leaking to the host page
  const stopPropagation = (e: Event) => e.stopPropagation();
  shadow.addEventListener("keydown", stopPropagation);
  shadow.addEventListener("keyup", stopPropagation);
  shadow.addEventListener("input", stopPropagation);
}

// Listening from outside the shadow root
function listenFromOutside(host: HTMLElement): void {
  host.addEventListener("click", (event: MouseEvent) => {
    // event.target is the host element (retargeted)
    // Use composedPath to see the real target
    const path = event.composedPath();
    const realTarget = path[0] as HTMLElement;
    console.log("Actual clicked element:", realTarget);
  });
}
```

**Gotchas:**
- Only events with `composed: true` cross shadow boundaries. Custom events default to `composed: false`, so set it explicitly if you need them to bubble out.
- `event.stopPropagation()` inside the shadow root prevents the event from reaching the host page, which is often desirable for keyboard events so page shortcuts do not fire.
- `focus` and `blur` events are retargeted; use `focusin`/`focusout` (which are composed) for reliable focus tracking.

---

## 4. Nested Shadow Roots for Complex UIs

Use nested shadow roots to create modular, independently styled components within your extension UI.

**Explanation:**
For complex UIs with multiple independent panels (e.g., a toolbar, a sidebar, and a modal), each component can have its own shadow root. This gives per-component style isolation and keeps DOM trees manageable. The outer shadow root acts as a layout shell, while inner shadow roots own their styles.

```typescript
// nested-components.ts
interface ComponentConfig {
  tag: string;
  css: string;
  html: string;
}

function createNestedComponent(
  parent: ShadowRoot | HTMLElement,
  config: ComponentConfig
): ShadowRoot {
  const host = document.createElement(config.tag);
  const shadow = host.attachShadow({ mode: "closed" });

  const style = new CSSStyleSheet();
  style.replaceSync(config.css);
  shadow.adoptedStyleSheets = [style];

  const template = document.createElement("template");
  template.innerHTML = config.html;
  shadow.appendChild(template.content.cloneNode(true));

  parent.appendChild(host);
  return shadow;
}

// Build a multi-panel extension UI
function buildExtensionUI(rootShadow: ShadowRoot): void {
  const toolbar = createNestedComponent(rootShadow, {
    tag: "ext-toolbar",
    css: `.bar { display: flex; gap: 8px; padding: 8px; background: #f5f5f5; }`,
    html: `<div class="bar"><slot></slot></div>`,
  });

  const sidebar = createNestedComponent(rootShadow, {
    tag: "ext-sidebar",
    css: `.panel { width: 300px; height: 100vh; background: #fff; overflow-y: auto; }`,
    html: `<div class="panel"><slot></slot></div>`,
  });

  const modal = createNestedComponent(rootShadow, {
    tag: "ext-modal",
    css: `
      .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: none; }
      .overlay.open { display: flex; align-items: center; justify-content: center; }
      .dialog { background: #fff; border-radius: 12px; padding: 24px; max-width: 480px; }
    `,
    html: `<div class="overlay"><div class="dialog"><slot></slot></div></div>`,
  });
}
```

**Gotchas:**
- Deeply nested shadow roots add overhead. Two or three levels is practical; beyond that, reconsider your component architecture.
- `<slot>` elements only project children of the immediate host element. You cannot slot content across multiple shadow boundaries without intermediate slots.
- Each shadow root requires its own style injection; there is no style inheritance across shadow boundaries.

---

## 5. Shadow DOM + React/Preact Rendering

Render a React or Preact application inside a shadow root for full framework support with complete style isolation.

**Explanation:**
React's `createRoot` accepts any DOM element, including one inside a shadow root. The key challenge is ensuring that React's event system works correctly, since React historically relied on event delegation at the document level. React 17+ delegates to the root container, which works well inside shadow DOM.

```typescript
// react-shadow.tsx
import { createRoot, Root } from "react-dom/client";
import { StrictMode } from "react";

class ShadowReactHost {
  private root: Root | null = null;
  private shadow: ShadowRoot;

  constructor(private mountPoint: HTMLElement) {
    this.shadow = mountPoint.attachShadow({ mode: "closed" });
  }

  injectStyles(cssText: string): void {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    this.shadow.adoptedStyleSheets = [
      ...this.shadow.adoptedStyleSheets,
      sheet,
    ];
  }

  render(App: React.ComponentType): void {
    const container = document.createElement("div");
    container.id = "react-root";
    this.shadow.appendChild(container);

    this.root = createRoot(container);
    this.root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }

  unmount(): void {
    this.root?.unmount();
    this.mountPoint.remove();
  }
}

// content-script entry point
const host = document.createElement("extension-react-app");
document.documentElement.appendChild(host);

const shadowHost = new ShadowReactHost(host);
shadowHost.injectStyles(`
  * { box-sizing: border-box; margin: 0; }
  #react-root { font-family: system-ui, sans-serif; }
`);
shadowHost.render(App);
```

**Gotchas:**
- React 16 and earlier delegate events to `document`, which breaks inside shadow DOM. Use React 17+ or Preact (which has always used local event delegation).
- CSS-in-JS libraries like styled-components inject `<style>` tags into `document.head` by default. You must configure a custom `StyleSheetManager` target pointing to your shadow root.
- Hot Module Replacement in development may not work inside shadow DOM. Configure your dev server to target the shadow root container.

---

## 6. Preventing Host Page CSS Leaks

Ensure that the host page's styles never bleed into your shadow DOM, even in edge cases.

**Explanation:**
Shadow DOM blocks most CSS inheritance, but certain properties (font, color, line-height, etc.) are inherited by default. The `:host` pseudo-class and `all: initial` reset let you establish a clean baseline. Additionally, some page-level styles using `!important` on inherited properties can still affect your shadow content.

```typescript
// css-reset.ts

/**
 * Comprehensive CSS reset for shadow DOM content.
 * Apply this as the first stylesheet in your shadow root.
 */
const SHADOW_RESET_CSS = `
  :host {
    all: initial !important;
    display: block !important;
    contain: content;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #1a1a1a;
    -webkit-font-smoothing: antialiased;
  }

  /* Reset all elements inside the shadow root */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Prevent inherited custom properties from leaking in */
  :host {
    --page-var-override: initial;
  }
`;

function applyCSSReset(shadow: ShadowRoot): void {
  const resetSheet = new CSSStyleSheet();
  resetSheet.replaceSync(SHADOW_RESET_CSS);

  // Reset sheet goes first so component styles can override
  shadow.adoptedStyleSheets = [resetSheet, ...shadow.adoptedStyleSheets];
}

/**
 * Runtime check for CSS property leaks.
 * Useful during development to detect unexpected inheritance.
 */
function detectCSSLeaks(shadow: ShadowRoot): void {
  if (process.env.NODE_ENV !== "development") return;

  const probe = document.createElement("div");
  shadow.appendChild(probe);

  const computed = getComputedStyle(probe);
  const leakedFont = computed.fontFamily;
  const leakedColor = computed.color;

  console.debug("[Shadow DOM] Inherited font-family:", leakedFont);
  console.debug("[Shadow DOM] Inherited color:", leakedColor);

  probe.remove();
}
```

**Gotchas:**
- `all: initial` on `:host` resets **all** CSS properties, including `display`. You must explicitly set `display: block` (or your desired value) after the reset.
- CSS custom properties (`--var`) defined on the page DO inherit into shadow DOM. This is by design and can be useful, but also a leak vector. Reset specific custom properties in `:host` if needed.
- The `contain: content` property on `:host` prevents layout and paint from affecting ancestors, which improves rendering performance.

---

## 7. Shadow DOM Accessibility Considerations

Make your shadow DOM UI accessible to screen readers and keyboard navigation.

**Explanation:**
Shadow DOM interacts with the accessibility tree differently from regular DOM. The browser flattens shadow trees for assistive technology, but focus management and ARIA references require careful handling because ARIA `id` references do not cross shadow boundaries.

```typescript
// a11y-shadow.ts
function createAccessibleShadowUI(shadow: ShadowRoot): void {
  // ARIA labels work within the shadow root's scope
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-labelledby", "dialog-title");
  dialog.setAttribute("aria-modal", "true");

  dialog.innerHTML = `
    <h2 id="dialog-title">Extension Settings</h2>
    <div role="group" aria-label="Notification preferences">
      <label>
        <input type="checkbox" id="notify-toggle" />
        Enable notifications
      </label>
    </div>
    <button data-action="close" aria-label="Close dialog">Close</button>
  `;

  shadow.appendChild(dialog);
}

/**
 * Focus trap: keep Tab cycling within the shadow root UI.
 */
function trapFocus(shadow: ShadowRoot): () => void {
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;

    const focusable = Array.from(
      shadow.querySelectorAll<HTMLElement>(focusableSelector)
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // shadow.activeElement gives the focused element within the shadow root
    if (e.shiftKey && shadow.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && shadow.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  shadow.addEventListener("keydown", handleKeydown);

  // Return cleanup function
  return () => shadow.removeEventListener("keydown", handleKeydown);
}

/**
 * Announce dynamic content changes to screen readers.
 */
function createLiveRegion(shadow: ShadowRoot): (message: string) => void {
  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.style.cssText = `
    position: absolute; width: 1px; height: 1px;
    overflow: hidden; clip: rect(0, 0, 0, 0);
    white-space: nowrap; border: 0;
  `;
  shadow.appendChild(liveRegion);

  return (message: string) => {
    liveRegion.textContent = "";
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  };
}
```

**Gotchas:**
- ARIA `id` references (`aria-labelledby`, `aria-describedby`, `aria-controls`) only resolve within the same shadow root. Cross-boundary references silently fail.
- `document.activeElement` returns the shadow host when focus is inside the shadow root. Use `shadowRoot.activeElement` to get the actually focused element.
- Screen readers flatten the shadow tree, so your DOM structure and heading hierarchy must still be semantically correct within the shadow root.

---

## 8. Performance Optimization for Shadow DOM in Extensions

Minimize the performance cost of shadow DOM, especially on heavy pages where your extension runs alongside complex web apps.

**Explanation:**
Each shadow root adds overhead to style recalculation and DOM operations. On pages with thousands of elements, multiple shadow roots with large stylesheets can degrade performance. Use `adoptedStyleSheets` for style sharing, batch DOM updates, and leverage `contain` for layout isolation.

```typescript
// performance.ts

/**
 * Share a single CSSStyleSheet across multiple shadow roots.
 * Browsers deduplicate the style data internally.
 */
const sharedStyles = new CSSStyleSheet();
sharedStyles.replaceSync(`
  * { box-sizing: border-box; margin: 0; }
  .container { padding: 16px; }
`);

function createOptimizedShadow(host: HTMLElement): ShadowRoot {
  const shadow = host.attachShadow({ mode: "closed" });
  // Reuse the same sheet instance across all shadow roots
  shadow.adoptedStyleSheets = [sharedStyles];
  return shadow;
}

/**
 * Batch DOM mutations to avoid excessive layout thrashing.
 */
function batchUpdate(
  shadow: ShadowRoot,
  updates: Array<() => void>
): void {
  // Use DocumentFragment for batch insertions
  const fragment = document.createDocumentFragment();

  // Pause observation during batch updates
  requestAnimationFrame(() => {
    for (const update of updates) {
      update();
    }
  });
}

/**
 * Lazy-render shadow DOM content only when visible.
 */
function lazyRenderShadow(
  host: HTMLElement,
  renderFn: (shadow: ShadowRoot) => void
): void {
  let rendered = false;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !rendered) {
        rendered = true;
        const shadow = host.attachShadow({ mode: "closed" });
        renderFn(shadow);
        observer.disconnect();
      }
    },
    { threshold: 0.1 }
  );

  observer.observe(host);
}

/**
 * Cleanup shadow DOM and all associated resources.
 */
function destroyShadowUI(host: HTMLElement): void {
  // Remove the host element, which implicitly removes the shadow root
  // and all its children, event listeners, and adopted stylesheets.
  host.remove();

  // If you held references to the shadow root, null them out
  // to allow garbage collection.
}

/**
 * Monitor shadow DOM performance in development.
 */
function measureShadowPerformance(
  label: string,
  fn: () => void
): void {
  if (process.env.NODE_ENV !== "development") {
    fn();
    return;
  }

  const mark = `shadow-${label}`;
  performance.mark(`${mark}-start`);
  fn();
  performance.mark(`${mark}-end`);
  performance.measure(mark, `${mark}-start`, `${mark}-end`);

  const measure = performance.getEntriesByName(mark).pop();
  if (measure && measure.duration > 16) {
    console.warn(
      `[Shadow DOM] "${label}" took ${measure.duration.toFixed(1)}ms (>16ms frame budget)`
    );
  }
}
```

**Gotchas:**
- Each shadow root with its own `<style>` element triggers independent style parsing. Use `adoptedStyleSheets` with shared `CSSStyleSheet` instances to avoid this cost.
- The `contain: content` CSS property on the shadow host prevents the browser from recalculating layout outside the shadow boundary, which is a significant performance win on complex pages.
- Avoid attaching shadow roots to elements that are not yet in the document. Attach first, then add the shadow root, to prevent double layout calculations.
- When your extension UI is hidden (e.g., a collapsed sidebar), set `display: none` on the host to completely remove it from the rendering pipeline.
