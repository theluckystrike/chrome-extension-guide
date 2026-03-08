---
layout: default
title: "Chrome Extension Shadow Dom Advanced — Best Practices"
description: "Advanced shadow DOM patterns for extension UI components."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/shadow-dom-advanced/"
---

# Shadow DOM Advanced Patterns for Chrome Extensions

Shadow DOM gives content scripts a private DOM subtree that host page styles cannot penetrate. This guide covers eight advanced patterns for building robust, accessible extension UI with Shadow DOM in Manifest V3.

## Pattern Summary

| # | Pattern | Use Case |
|---|---------|----------|
| 1 | Closed vs open Shadow DOM | Choose the right encapsulation level |
| 2 | Constructable stylesheets | Efficient style sharing with adoptedStyleSheets |
| 3 | Slotted content | Customizable widgets that accept host-page content |
| 4 | Shadow DOM event handling | Event retargeting and composed events |
| 5 | Forms inside Shadow DOM | Form-associated custom elements with ElementInternals |
| 6 | CSS custom properties for theming | Theming across the shadow boundary |
| 7 | Nested Shadow DOM | Component composition with multiple shadow roots |
| 8 | Accessibility in Shadow DOM | ARIA, focus delegation, and screen reader support |

---

## Pattern 1: Closed vs Open Shadow DOM for Extension UI

Open shadow roots are accessible via `element.shadowRoot`. Closed roots return `null`, preventing host-page scripts from inspecting or modifying extension UI.

```typescript
function createExtensionHost(mode: "open" | "closed"): ShadowRoot {
  const host = document.createElement("div");
  host.id = "ext-ui-host";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode });

  const container = document.createElement("div");
  container.className = "ext-root";
  container.textContent = "Extension UI";
  shadow.appendChild(container);

  return shadow;
}

// Closed mode: host page cannot access the shadow root
const shadow = createExtensionHost("closed");

// With open mode, any script on the page could do:
//   document.querySelector("#ext-ui-host").shadowRoot.innerHTML = "";
// Closed mode prevents this entirely.
```

When to use each:

- **Closed** -- Default choice for content-script UI. Prevents page scripts from tampering with your DOM. You must keep a reference to the `ShadowRoot` yourself since `element.shadowRoot` returns `null`.
- **Open** -- Useful during development or when you intentionally want the page to interact with your elements.

---

## Pattern 2: Constructable Stylesheets (adoptedStyleSheets)

Constructable stylesheets let you create `CSSStyleSheet` objects in JavaScript and share them across multiple shadow roots without duplicating `<style>` elements.

```typescript
function createStyles(): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    :host {
      all: initial;
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      color: #1a1a1a;
    }
    .panel {
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }
    .btn {
      background: #4285f4; color: white; border: none;
      border-radius: 4px; padding: 8px 16px; cursor: pointer;
    }
    .btn:hover { background: #3367d6; }
  `);
  return sheet;
}

// Shared across all extension shadow roots
const sharedStyles = createStyles();

function attachUI(hostElement: HTMLElement): ShadowRoot {
  const shadow = hostElement.attachShadow({ mode: "closed" });
  shadow.adoptedStyleSheets = [sharedStyles];

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `<p>Widget content</p><button class="btn">Action</button>`;
  shadow.appendChild(panel);
  return shadow;
}
```

Calling `sheet.replaceSync(newCSS)` at runtime instantly updates every shadow root that has adopted it -- useful for live theme switching.

---

## Pattern 3: Slotted Content for Customizable Widgets

Slots let an extension widget accept content from the host page's light DOM, useful when building overlay-style UIs that wrap existing page content.

```typescript
class ExtHighlighter extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    const style = new CSSStyleSheet();
    style.replaceSync(`
      :host { display: inline; }
      .highlight {
        background: rgba(255, 235, 59, 0.4);
        border-radius: 2px; padding: 0 2px; position: relative;
      }
      .tooltip {
        display: none; position: absolute; bottom: 100%; left: 0;
        background: #333; color: #fff; padding: 4px 8px;
        border-radius: 4px; font-size: 12px; white-space: nowrap;
      }
      .highlight:hover .tooltip { display: block; }
      ::slotted(*) { cursor: help; }
    `);
    shadow.adoptedStyleSheets = [style];

    shadow.innerHTML = `
      <span class="highlight">
        <slot></slot>
        <span class="tooltip">${this.getAttribute("data-note") ?? ""}</span>
      </span>
    `;
  }
}

customElements.define("ext-highlight", ExtHighlighter);

// Usage: wrap existing text nodes
function highlightText(range: Range, note: string): void {
  const wrapper = document.createElement("ext-highlight");
  wrapper.setAttribute("data-note", note);
  range.surroundContents(wrapper);
}
```

Named slots allow multiple insertion points:

```typescript
shadow.innerHTML = `
  <div class="card">
    <header><slot name="title">Default Title</slot></header>
    <main><slot></slot></main>
    <footer><slot name="actions"></slot></footer>
  </div>
`;
```

---

## Pattern 4: Shadow DOM Event Handling (Event Retargeting, Composed Events)

Events originating inside a shadow root are retargeted: listeners on the host element see `event.target` as the host, not the internal element. Only events with `composed: true` cross shadow boundaries.

```typescript
function setupEventHandling(shadow: ShadowRoot, host: HTMLElement): void {
  const button = document.createElement("button");
  button.className = "internal-btn";
  button.textContent = "Click me";
  shadow.appendChild(button);

  // Listener inside shadow -- sees the real target
  shadow.addEventListener("click", (e: Event) => {
    console.log("Shadow target:", (e.target as HTMLElement).className);
    // -> "internal-btn"
  });

  // Listener on host -- target is retargeted
  host.addEventListener("click", (e: Event) => {
    console.log("Host target:", e.target === host); // -> true
    // Use composedPath() to see the real propagation chain
    console.log("Actual source:", (e.composedPath()[0] as HTMLElement).className);
  });
}

// Dispatching custom events from shadow DOM
function emitFromShadow(shadow: ShadowRoot): void {
  // composed: true  -> crosses shadow boundary
  // composed: false -> stays within shadow root (default)
  shadow.dispatchEvent(
    new CustomEvent("ext-action", {
      bubbles: true,
      composed: true,
      detail: { action: "save", timestamp: Date.now() },
    })
  );
}

// Built-in composed events: click, focus, blur, input, keydown
// Built-in non-composed events: mouseenter, mouseleave, load, scroll
```

---

## Pattern 5: Forms Inside Shadow DOM (formAssociated, ElementInternals)

Form-associated custom elements participate in native form submission and validation through `ElementInternals`.

```typescript
class ExtRating extends HTMLElement {
  static formAssociated = true;
  private internals: ElementInternals;
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.shadow = this.attachShadow({ mode: "open" });

    const style = new CSSStyleSheet();
    style.replaceSync(`
      :host { display: inline-flex; gap: 4px; }
      .star { font-size: 24px; cursor: pointer; color: #ccc; transition: color 0.15s; }
      .star.active { color: #f4b400; }
    `);
    this.shadow.adoptedStyleSheets = [style];

    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.className = "star";
      star.textContent = "\u2605";
      star.addEventListener("click", () => this.select(i));
      this.shadow.appendChild(star);
    }

    this.internals.setValidity({ valueMissing: true }, "Please select a rating");
  }

  private select(rating: number): void {
    this.internals.setFormValue(String(rating));
    this.internals.setValidity({});
    this.shadow.querySelectorAll(".star").forEach((star, idx) => {
      (star as HTMLElement).classList.toggle("active", idx < rating);
    });
  }

  formResetCallback(): void {
    this.select(0);
    this.internals.setValidity({ valueMissing: true }, "Please select a rating");
  }
}

customElements.define("ext-rating", ExtRating);
// Usage: <ext-rating name="quality"></ext-rating> inside a <form>
```

---

## Pattern 6: Shadow DOM with CSS Custom Properties for Theming

CSS custom properties pierce shadow boundaries, making them the standard mechanism for theming shadow DOM components.

```typescript
interface ThemeTokens {
  "--ext-bg": string;
  "--ext-fg": string;
  "--ext-accent": string;
  "--ext-radius": string;
}

const THEMES: Record<string, ThemeTokens> = {
  light: { "--ext-bg": "#ffffff", "--ext-fg": "#1a1a1a", "--ext-accent": "#4285f4", "--ext-radius": "8px" },
  dark:  { "--ext-bg": "#1e1e1e", "--ext-fg": "#e0e0e0", "--ext-accent": "#8ab4f8", "--ext-radius": "8px" },
};

function applyTheme(host: HTMLElement, theme: keyof typeof THEMES): void {
  for (const [prop, value] of Object.entries(THEMES[theme])) {
    host.style.setProperty(prop, value);
  }
}

// Styles inside shadow root reference the custom properties
const themeAwareSheet = new CSSStyleSheet();
themeAwareSheet.replaceSync(`
  .panel {
    background: var(--ext-bg, #fff);
    color: var(--ext-fg, #000);
    border-radius: var(--ext-radius, 4px);
    padding: 16px;
  }
  .btn-primary {
    background: var(--ext-accent, #4285f4);
    color: #fff; border: none; padding: 8px 16px;
    border-radius: var(--ext-radius, 4px); cursor: pointer;
  }
`);

// Respond to system theme changes
function watchSystemTheme(host: HTMLElement): void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const update = (e: MediaQueryListEvent | MediaQueryList) =>
    applyTheme(host, e.matches ? "dark" : "light");
  mq.addEventListener("change", update);
  update(mq);
}
```

---

## Pattern 7: Nested Shadow DOM (Component Composition)

Complex extension UIs benefit from nesting shadow roots -- an outer shell with inner sub-components, each with isolated styles.

```typescript
class ExtPanel extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "closed" });
    const style = new CSSStyleSheet();
    style.replaceSync(`
      :host { display: block; }
      .panel { border: 1px solid var(--ext-border, #e0e0e0); border-radius: 8px; overflow: hidden; }
      .header { padding: 12px 16px; background: var(--ext-bg, #f5f5f5); font-weight: 600; }
      .body { padding: 16px; }
    `);
    shadow.adoptedStyleSheets = [style];
    shadow.innerHTML = `
      <div class="panel">
        <div class="header"><slot name="title">Panel</slot></div>
        <div class="body"><slot></slot></div>
      </div>`;
  }
}

class ExtBadge extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "closed" });
    const style = new CSSStyleSheet();
    style.replaceSync(`
      :host { display: inline-flex; }
      .badge { background: var(--ext-accent, #4285f4); color: #fff;
               padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    `);
    shadow.adoptedStyleSheets = [style];
    shadow.innerHTML = `<span class="badge"><slot></slot></span>`;
  }
}

customElements.define("ext-panel", ExtPanel);
customElements.define("ext-badge", ExtBadge);

// Compose: ext-badge inside ext-panel, each with own shadow root
function buildDashboard(shadow: ShadowRoot): void {
  const panel = document.createElement("ext-panel");
  const title = document.createElement("span");
  title.slot = "title";
  title.textContent = "Status";
  panel.appendChild(title);

  const badge = document.createElement("ext-badge");
  badge.textContent = "Active";
  panel.appendChild(badge);
  shadow.appendChild(panel);
  // Result: outer shadow -> ext-panel shadow -> ext-badge shadow
}
```

---

## Pattern 8: Accessibility in Shadow DOM (ARIA, Focus Delegation)

Shadow DOM requires explicit attention to accessibility. Use `delegatesFocus`, ARIA attributes, and proper tab ordering.

```typescript
class ExtDialog extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed", delegatesFocus: true });

    const style = new CSSStyleSheet();
    style.replaceSync(`
      :host { display: block; position: fixed; inset: 0; z-index: 2147483647; }
      .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
      .dialog {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
        background: var(--ext-bg, #fff); color: var(--ext-fg, #1a1a1a);
        border-radius: 12px; padding: 24px; min-width: 320px;
      }
      .close-btn { position: absolute; top: 8px; right: 8px;
                    background: none; border: none; font-size: 20px; cursor: pointer; }
    `);
    this.shadow.adoptedStyleSheets = [style];
    this.shadow.innerHTML = `
      <div class="backdrop"></div>
      <div class="dialog" role="dialog" aria-labelledby="dlg-title" aria-modal="true" tabindex="-1">
        <button class="close-btn" aria-label="Close">&times;</button>
        <h2 id="dlg-title"><slot name="title">Dialog</slot></h2>
        <div><slot></slot></div>
      </div>`;

    this.shadow.querySelector(".close-btn")!.addEventListener("click", () => this.close());
    this.shadow.querySelector(".backdrop")!.addEventListener("click", () => this.close());
    this.shadow.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") this.close();
      if (e.key === "Tab") this.trapFocus(e);
    });
  }

  private trapFocus(e: KeyboardEvent): void {
    const dialog = this.shadow.querySelector(".dialog")!;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && this.shadow.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && this.shadow.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  open(): void {
    this.style.display = "block";
    (this.shadow.querySelector(".dialog") as HTMLElement).focus();
  }

  close(): void {
    this.style.display = "none";
    this.shadow.dispatchEvent(new CustomEvent("ext-dialog-close", { bubbles: true, composed: true }));
  }
}

customElements.define("ext-dialog", ExtDialog);
```

Accessibility checklist for shadow DOM components:

- Use `delegatesFocus: true` so focus management works naturally.
- Set `role`, `aria-label`, `aria-labelledby`, and `aria-modal` on interactive containers.
- Trap focus inside modal overlays with Tab/Shift+Tab handling.
- Dispatch custom events with `composed: true` so assistive technology integrations outside the shadow root work.
- Test with screen readers -- shadow DOM content is exposed to the accessibility tree.

---

## Key Takeaways

- Prefer **closed** Shadow DOM for content-script UI to prevent host-page tampering.
- Use **constructable stylesheets** to share styles efficiently across multiple shadow roots.
- Expose theming through **CSS custom properties** which pierce the shadow boundary by design.
- Dispatch custom events with `composed: true` and `bubbles: true` to cross shadow boundaries.
- Use `ElementInternals` for form-associated custom elements that participate in native validation.
- Set `delegatesFocus: true` and explicit ARIA attributes to maintain accessibility.
