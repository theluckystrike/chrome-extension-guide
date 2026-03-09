---
layout: post
title: "Web Components in Chrome Extensions: Complete Guide with TypeScript"
description: "Learn how to build modern Chrome extensions using Web Components and TypeScript. This guide covers Shadow DOM, Custom Elements, HTML Templates, and best practices for extension development."
date: 2026-03-09
categories: [tutorials, chrome-extensions, web-components]
tags: [web components, chrome extension, TypeScript, custom elements, shadow dom, tutorial]
keywords: "web components chrome extension, custom elements chrome extension, TypeScript chrome extension, shadow dom extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2026/03/09/web-components-chrome-extensions-guide/"
---

# Web Components in Chrome Extensions: Complete Guide with TypeScript

Web Components represent one of the most powerful paradigms for building reusable, encapsulated UI elements in modern web development. When combined with Chrome extensions, they offer an elegant solution for creating maintainable, scalable extension interfaces. This comprehensive guide explores how to leverage Web Components (Custom Elements, Shadow DOM, and HTML Templates) in your Chrome extension projects using TypeScript.

---

## Why Web Components for Chrome Extensions? {#why-web-components}

Chrome extensions often suffer from styling conflicts when content scripts inject styles into web pages, or when popup scripts interfere with Chrome's internal styles. Web Components solve these problems through **encapsulation**—the Shadow DOM provides a boundary that prevents external styles from affecting your components and vice versa.

### Key Benefits

1. **Style Isolation**: Shadow DOM prevents CSS leakage both ways
2. **Reusable Components**: Build once, use across multiple extensions
3. **Type Safety**: TypeScript integration provides compile-time checks
4. **Native Browser Support**: No additional runtime dependencies required
5. **Manifest V3 Compatible**: Works seamlessly with modern extension architecture

---

## Setting Up Your TypeScript Project {#setup}

First, ensure you have a TypeScript-enabled project. If you are starting fresh:

```bash
mkdir my-extension && cd my-extension
npm init -y
npm install --save-dev typescript
npx tsc --init
```

Configure your `tsconfig.json` for Web Components:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

---

## Creating Your First Custom Element {#first-custom-element}

Here is a complete example of a custom element for a Chrome extension popup:

```typescript
// components/popup-button.ts
type ButtonVariant = 'primary' | 'secondary' | 'danger';

@customElement('ext-popup-button')
export class PopupButton extends HTMLElement {
  private shadow: ShadowRoot;
  
  @property({ type: String })
  variant: ButtonVariant = 'primary';

  @property({ type: Boolean })
  disabled = false;

  @property({ type: String })
  label = 'Click Me';

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupListeners();
  }

  private render() {
    this.shadow.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          transition: opacity 0.2s;
        }
        button:hover:not(:disabled) {
          opacity: 0.8;
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .primary { background: #4285f4; color: white; }
        .secondary { background: #e8eaed; color: #202124; }
        .danger { background: #ea4335; color: white; }
      </style>
      <button class="${this.variant}" ${this.disabled ? 'disabled' : ''}>
        ${this.label}
      </button>
    `;
  }

  private setupListeners() {
    const button = this.shadow.querySelector('button');
    button?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ext-click', {
        bubbles: true,
        composed: true
      }));
    });
  }
}
```

---

## Using Templates for Better Performance {#html-templates}

The `<template>` element allows you to define reusable markup that is not rendered until needed:

```typescript
// components/ext-card.ts
import { PopupButton } from './popup-button';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: system-ui, sans-serif;
    }
    .card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card-header {
      font-weight: 600;
      margin-bottom: 8px;
      color: #202124;
    }
    .card-body {
      color: #5f6368;
    }
  </style>
  <div class="card">
    <div class="card-header"><slot name="header">Default Title</slot></div>
    <div class="card-body"><slot></slot></div>
  </div>
`;

@customElement('ext-card')
export class ExtensionCard extends HTMLElement {
  private shadow: ShadowRoot = this.attachShadow({ mode: 'open' });

  constructor() {
    super();
    this.shadow.appendChild(template.content.cloneNode(true));
  }
}
```

---

## Integrating with Chrome Extension Popup {#popup-integration}

In your `popup.ts` file, import and register your components:

```typescript
// popup.ts
import './components/popup-button';
import './components/ext-card';

// Now use in your popup HTML:
// <ext-popup-button label="Save" variant="primary"></ext-popup-button>
// <ext-card><span slot="header">Settings</span>Content here</ext-card>

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.querySelector('ext-popup-button');
  saveBtn?.addEventListener('ext-click', async () => {
    // Access Chrome storage
    const { settings } = await chrome.storage.local.get('settings');
    console.log('Saving settings:', settings);
  });
});
```

### Using Web Components with React in Popup

If your extension uses React alongside Web Components, you'll need to configure React to treat custom elements as custom elements rather than components:

```tsx
// popup.tsx
import { createRoot } from 'react-dom/client';
import App from './App';

// Tell React not to treat custom elements as React components
const customElements = ['ext-popup-button', 'ext-card', 'ext-input'];

const originalCreateElement = React.createElement;

React.createElement = function(type: any, props: any, ...children: any[]) {
  if (typeof type === 'string' && customElements.includes(type)) {
    // Pass all props as attributes
    return originalCreateElement(type, { ...props, }, ...children);
  }
  return originalCreateElement(type, props, ...children);
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
```

### Complete Popup Implementation Example

Here's a more complete example showing how to build a settings popup using Web Components:

```typescript
// components/settings-form.ts
import { PopupButton } from './popup-button';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
    }
    input, select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
  </style>
  <form id="settings-form">
    <div class="form-group">
      <label for="username">Username</label>
      <input type="text" id="username" name="username" />
    </div>
    <div class="form-group">
      <label for="theme">Theme</label>
      <select id="theme" name="theme">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="auto">Auto</option>
      </select>
    </div>
    <div class="form-group">
      <label for="notifications">Enable Notifications</label>
      <input type="checkbox" id="notifications" name="notifications" />
    </div>
    <div class="actions">
      <ext-popup-button variant="primary" label="Save Settings" id="save-btn"></ext-popup-button>
      <ext-popup-button variant="secondary" label="Reset" id="reset-btn"></ext-popup-button>
    </div>
  </form>
`;

@customElement('ext-settings-form')
export class SettingsForm extends HTMLElement {
  private shadow: ShadowRoot;
  private form: HTMLFormElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.appendChild(template.content.cloneNode(true));
    this.form = this.shadow.getElementById('settings-form') as HTMLFormElement;
  }

  connectedCallback() {
    this.loadSettings();
    this.setupEventListeners();
  }

  private async loadSettings() {
    const result = await chrome.storage.local.get(['username', 'theme', 'notifications']);
    (this.shadow.getElementById('username') as HTMLInputElement).value = result.username || '';
    (this.shadow.getElementById('theme') as HTMLSelectElement).value = result.theme || 'light';
    (this.shadow.getElementById('notifications') as HTMLInputElement).checked = result.notifications ?? true;
  }

  private setupEventListeners() {
    const saveBtn = this.shadow.getElementById('save-btn');
    const resetBtn = this.shadow.getElementById('reset-btn');

    saveBtn?.addEventListener('ext-click', async () => {
      const formData = new FormData(this.form);
      await chrome.storage.local.set({
        username: formData.get('username'),
        theme: formData.get('theme'),
        notifications: formData.get('notifications') === 'on'
      });
      this.dispatchEvent(new CustomEvent('settings-saved', { bubbles: true, composed: true }));
    });

    resetBtn?.addEventListener('ext-click', () => {
      this.form.reset();
    });
  }
}
```

### Handling Form Validation

Add robust form validation to your Web Components:

```typescript
// Adding validation to components
private validateForm(): boolean {
  const username = this.shadow.getElementById('username') as HTMLInputElement;
  const errorElement = this.shadow.getElementById('username-error');
  
  if (username.value.length < 3) {
    username.setCustomValidity('Username must be at least 3 characters');
    username.reportValidity();
    return false;
  }
  
  username.setCustomValidity('');
  return true;
}
```

---

## Web Components in Content Scripts {#content-scripts}

For content scripts that run in webpage context, Web Components must be defined carefully to avoid conflicts:

```typescript
// content-script.ts
// Wrap in IIFE to prevent global scope pollution
(function() {
  if (window.hasDefinedExtensionComponents) return;
  window.hasDefinedExtensionComponents = true;

  @customElement('ext-page-overlay')
  class PageOverlay extends HTMLElement {
    private shadow: ShadowRoot;
    private isOpen = false;

    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: 'closed' });
    }

    connectedCallback() {
      this.render();
    }

    toggle() {
      this.isOpen = !this.isOpen;
      this.shadow.querySelector('.overlay')?.classList.toggle('visible', this.isOpen);
    }

    private render() {
      this.shadow.innerHTML = `
        <style>
          .overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
            z-index: 999999;
          }
          .overlay.visible {
            opacity: 1;
            visibility: visible;
          }
        </style>
        <div class="overlay"></div>
      `;
    }
  }

  // Inject the custom element
  document.body.appendChild(document.createElement('ext-page-overlay'));
})();
```

---

## Shadow DOM Deep Dive {#shadow-dom-deep-dive}

Understanding Shadow DOM is crucial for building robust Web Components. Let's explore advanced patterns:

### Event Handling with Shadow DOM

Events dispatched from within Shadow DOM don't leak outside by default, but you can control this behavior:

```typescript
@customElement('ext-action-button')
export class ActionButton extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.shadow.querySelector('button')?.addEventListener('click', () => {
      // This event bubbles up through the shadow boundary
      this.dispatchEvent(new CustomEvent('action-triggered', {
        bubbles: true,
        composed: true, // Allows event to cross shadow DOM boundary
        detail: { timestamp: Date.now() }
      }));
    });
  }

  private render() {
    this.shadow.innerHTML = `
      <button>Execute Action</button>
      <style>
        button {
          padding: 10px 20px;
          background: #4285f4;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background: #3367d6;
        }
      </style>
    `;
  }
}

// Usage in regular DOM
document.querySelector('ext-action-button')?.addEventListener('action-triggered', (e) => {
  console.log('Action triggered at:', e.detail.timestamp);
});
```

### Styling from Outside with CSS Custom Properties

Expose styling hooks using CSS custom properties (CSS variables):

```typescript
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      --button-bg: #4285f4;
      --button-color: white;
      --button-padding: 8px 16px;
      --button-radius: 4px;
      
      display: inline-block;
    }
    button {
      background: var(--button-bg);
      color: var(--button-color);
      padding: var(--button-padding);
      border: none;
      border-radius: var(--button-radius);
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 0.9;
    }
  </style>
  <button><slot></slot></button>
`;

@customElement('ext-styled-button')
export class StyledButton extends HTMLElement {
  private shadow: ShadowRoot = this.attachShadow({ mode: 'open' });
  
  constructor() {
    super();
    this.shadow.appendChild(template.content.cloneNode(true));
  }
}

// Usage with custom styling
// <ext-styled-button style="--button-bg: #34a853; --button-radius: 8px;">
//   Custom Styled Button
// </ext-styled-button>
```

### Constructable Stylesheets

For better performance with multiple components, use constructable stylesheets:

```typescript
// shared-styles.ts
const sharedStyles = new CSSStyleSheet();
sharedStyles.replace(`
  .container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-sizing: border-box;
  }
  .container * {
    box-sizing: border-box;
  }
  .hidden {
    display: none !important;
  }
`);

// Use in component
@customElement('ext-container')
export class ExtContainer extends HTMLElement {
  private shadow: ShadowRoot = this.attachShadow({ mode: 'open' });

  constructor() {
    super();
    this.shadow.adoptedStyleSheets = [sharedStyles];
  }

  connectedCallback() {
    this.shadow.innerHTML = `<div class="container"><slot></slot></div>`;
  }
}
```

---

## Communication Patterns Between Components {#communication-patterns}

### Using Broadcast Channel API

For communication between components in different contexts:

```typescript
// Create a channel for extension-wide messaging
const extensionChannel = new BroadcastChannel('extension_events');

@customElement('ext-data-provider')
export class DataProvider extends HTMLElement {
  private channel = extensionChannel;

  constructor() {
    super();
    this.channel.postMessage({ type: 'provider-ready', source: 'data-provider' });
  }

  publishData(data: any) {
    this.channel.postMessage({ type: 'data-update', payload: data });
  }
}

@customElement('ext-data-display')
export class DataDisplay extends HTMLElement {
  private channel = extensionChannel;

  constructor() {
    super();
    this.channel.onmessage = (event) => {
      if (event.data.type === 'data-update') {
        this.updateDisplay(event.data.payload);
      }
    };
  }

  private updateDisplay(data: any) {
    // Update UI with new data
  }
}
```

### Property Change Observation

Monitor property changes and react accordingly:

```typescript
@customElement('ext-smart-input')
export class SmartInput extends HTMLElement {
  private shadow: ShadowRoot = this.attachShadow({ mode: 'open' });
  
  // Observe attribute changes
  static get observedAttributes() {
    return ['value', 'disabled', 'placeholder'];
  }

  constructor() {
    super();
    this.shadow.innerHTML = `
      <input type="text" />
      <style>
        input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      </style>
    `;
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    const input = this.shadow.querySelector('input');
    if (!input) return;

    switch (name) {
      case 'value':
        if (input.value !== newValue) {
          input.value = newValue || '';
        }
        break;
      case 'disabled':
        input.disabled = this.hasAttribute('disabled');
        break;
      case 'placeholder':
        input.placeholder = newValue || '';
        break;
    }
  }

  // Also react to property changes
  set value(val: string) {
    this.setAttribute('value', val);
  }

  get value(): string {
    return this.getAttribute('value') || '';
  }
}
```

---

## Performance Optimization {#performance-optimization}

### Lazy Loading Components

Load components only when needed:

```typescript
// lazy-component-loader.ts
const loadedComponents = new Set<string>();

export async function loadComponentWhenNeeded(tagName: string): Promise<void> {
  if (loadedComponents.has(tagName)) return;
  
  // Dynamic import based on component name
  const componentMap: Record<string, () => Promise<any>> = {
    'ext-popup-button': () => import('./components/popup-button'),
    'ext-card': () => import('./components/ext-card'),
    'ext-data-table': () => import('./components/data-table'),
    'ext-chart': () => import('./components/chart'),
  };

  const loadComponent = componentMap[tagName];
  if (loadComponent) {
    await loadComponent();
    loadedComponents.add(tagName);
  }
}

// Usage in popup
async function initPopup() {
  // Only load components when they're about to be used
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        const tagName = entry.target.tagName.toLowerCase();
        await loadComponentWhenNeeded(tagName);
        observer.unobserve(entry.target);
      }
    });
  });
  
  document.querySelectorAll('ext-popup-button, ext-card, ext-data-table').forEach(
    el => observer.observe(el)
  );
}
```

### Memory Management

Properly clean up components to prevent memory leaks:

```typescript
@customElement('ext-cleanup-example')
export class CleanupExample extends HTMLElement {
  private shadow: ShadowRoot;
  private eventListeners: Map<EventTarget, Map<string, EventListener>> = new Map();

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    // CRITICAL: Clean up all event listeners
    this.cleanupEventListeners();
  }

  private setupEventListeners() {
    const button = this.shadow.querySelector('button');
    if (button) {
      const listener = () => this.handleClick();
      button.addEventListener('click', listener);
      
      // Track for cleanup
      if (!this.eventListeners.has(button)) {
        this.eventListeners.set(button, new Map());
      }
      this.eventListeners.get(button)!.set('click', listener);
    }
  }

  private cleanupEventListeners() {
    this.eventListeners.forEach((listeners, target) => {
      listeners.forEach((listener, type) => {
        target.removeEventListener(type, listener);
      });
    });
    this.eventListeners.clear();
  }

  private handleClick() {
    console.log('Button clicked');
  }

  private render() {
    this.shadow.innerHTML = `<button>Click Me</button>`;
  }
}
```

---

## Best Practices {#best-practices}

### 1. Use Closed Shadow DOM for Security-Sensitive Components

```typescript
this.attachShadow({ mode: 'closed' }); // No external access
```

Using a closed shadow DOM prevents external JavaScript from accessing or modifying your component's internal structure. This is particularly important for extensions that handle sensitive data like authentication tokens or payment information. While closed shadow DOM adds a layer of security, remember that determined attackers can still access it through other means, so don't rely on it as your only security measure.

### 2. Communicate via Custom Events

```typescript
// Dispatch
this.dispatchEvent(new CustomEvent('data-loaded', {
  detail: { data: myData },
  bubbles: true,
  composed: true
}));

// Listen
element.addEventListener('data-loaded', (e: CustomEvent) => {
  console.log(e.detail.data);
});
```

Custom events are the recommended way to communicate between Web Components and the rest of your extension. The `bubbles` property allows events to bubble up through the DOM, while `composed: true` allows events to cross shadow DOM boundaries. This pattern is essential for building decoupled components that can work independently.

### 3. Leverage TypeScript for Props

```typescript
import { property, state } from 'lit/decorators';

@customElement('my-component')
export class MyComponent extends HTMLElement {
  @property() // Reflects to attribute
  title: string = '';

  @state() // Internal reactive state
  private _count = 0;
}
```

Using TypeScript decorators from libraries like Lit provides a clean way to define reactive properties. The `@property` decorator automatically reflects property changes to HTML attributes, allowing users to configure components via HTML. The `@state` decorator marks internal state that, when changed, triggers re-rendering.

### 4. Bundle Efficiently

Use a bundler like Vite or esbuild to create a single bundle for your popup:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: 'popup.html',
      output: {
        entryFileNames: 'assets/[name].js',
      },
    },
  },
});
```

### 5. Debugging Web Components in Chrome DevTools

Chrome DevTools provides excellent support for debugging Web Components. Here's how to inspect and debug your extension's Web Components:

1. **Inspect Shadow DOM**: Open DevTools (F12), find your custom element in the Elements panel, and expand the `#shadow-root` node to see the component's internal structure.

2. **Breakpoints**: Set breakpoints inside your component's JavaScript to debug rendering issues or event handling problems.

3. **Console API**: Use `$0` to reference the currently selected element, then access its shadow root with `$0.shadowRoot`.

```javascript
// In DevTools Console
const component = $0;
console.log(component.shadowRoot.querySelector('button'));
```

### 6. Performance Considerations

Web Components are generally performant, but following these guidelines ensures optimal performance:

- **Avoid excessive re-renders**: Use `@state` only for properties that affect rendering
- **Lazy load components**: Import components only when needed in your popup or content scripts
- **Use template cloning**: Create templates once and clone them rather than rebuilding innerHTML each render
- **Minimize DOM manipulation**: Batch DOM updates when possible

```typescript
// Good: Single template clone
const clone = template.content.cloneNode(true);

// Avoid: Repeated innerHTML assignment
this.shadow.innerHTML = `...`; // Called frequently = bad
```

---

## Advanced: Building a Component Library {#component-library}

For larger extensions, consider building a reusable component library. Here's how to structure it:

```typescript
// library/index.ts
export { PopupButton } from './popup-button';
export { ExtensionCard } from './ext-card';
export { ExtensionInput } from './ext-input';
export { ExtensionModal } from './ext-modal';
export { ExtensionToast } from './ext-toast';
```

This approach allows you to:
- Share components across multiple extensions
- Maintain consistent styling across your extension's UI
- Update components in one place and have changes propagate everywhere
- Version your component library independently from your extension

Example component library structure:
```
components/
├── index.ts          # Export all components
├── popup-button.ts   # Reusable button component
├── ext-card.ts       # Card/container component
├── ext-input.ts      # Form input component
├── ext-modal.ts      # Modal/dialog component
├── ext-toast.ts      # Toast notification component
├── base/            # Base classes and utilities
│   ├── component.ts # Base component with common functionality
│   └── styles.ts    # Shared CSS-in-JS templates
└── themes/          # Theme definitions
    ├── light.ts     # Light theme styles
    └── dark.ts      # Dark theme styles
```

---

## Conclusion {#conclusion}

Web Components provide a robust foundation for building Chrome extensions that are maintainable, style-safe, and reusable. By leveraging Shadow DOM for encapsulation, TypeScript for type safety, and the native Custom Elements API, you can create extension UIs that are both powerful and clean.

The patterns demonstrated in this guide—from basic custom elements to content script integration—will help you build professional-grade Chrome extensions that scale well and avoid common pitfalls like style conflicts and memory leaks.

<<<<<<< HEAD
Start incorporating Web Components into your extension workflow today, and enjoy the benefits of truly reusable, encapsulated UI components. Remember to consider performance implications, use TypeScript for type safety, and follow security best practices when handling sensitive data.

For more advanced topics, explore CSS-in-JS solutions like Lit, Stencil, or Glue, which provide additional features like scoped styles, reactive properties, and efficient rendering. These tools can further accelerate your extension development while maintaining the benefits of native Web Components.
=======
Start incorporating Web Components into your extension workflow today, and enjoy the benefits of truly reusable, encapsulated UI components.

---

## Debugging Web Components in Chrome DevTools {#debugging}

Debugging Web Components requires understanding how Chrome DevTools presents Shadow DOM content. Here's how to effectively debug your components.

### Viewing Shadow DOM

Chrome DevTools automatically显示 Shadow DOM content. To inspect Shadow DOM:

1. Open DevTools (F12 or Cmd+Option+I)
2. Navigate to the Elements panel
3. Expand elements with `#shadow-root` nodes
4. Inspect styles and DOM structure within the shadow tree

### Using the Breakpoint Feature

Set DOM modification breakpoints to catch changes:

```typescript
// In your component, add debug logging
connectedCallback() {
  console.log('[Debug] Component connected:', this.tagName);
  this.render();
}

attributeChangedCallback(name: string, oldValue: string, newValue: string) {
  console.log(`[Debug] ${this.tagName} attribute changed:`, name, oldValue, '→', newValue);
  this.render();
}
```

### Common Debugging Scenarios

**Issue: Styles not applying**
- Check if Shadow DOM is properly attached
- Verify CSS selectors are within the shadow tree
- Use `this.shadowRoot.querySelector()` instead of `document.querySelector()`

**Issue: Events not firing**
- Ensure event listeners are set up in `connectedCallback()`
- Check if event bubbles through Shadow DOM with `bubbles: true` and `composed: true`

---

## Performance Optimization for Web Components {#performance}

Building performant Web Components requires attention to memory management and rendering efficiency.

### Lazy Registration

Register components only when needed to reduce initial load time:

```typescript
// Instead of importing all components upfront
// popup.ts
async function loadComponents() {
  const { PopupButton } = await import('./components/popup-button');
  const { ExtensionCard } = await import('./components/ext-card');
  // Components auto-register via @customElement decorator
}

document.addEventListener('DOMContentLoaded', loadComponents);
```

### Template Cloning Optimization

Use templates efficiently to avoid repeated DOM operations:

```typescript
// Create template once, clone multiple times
const cardTemplate = document.createElement('template');
cardTemplate.innerHTML = `<div class="card"><slot></slot></div>`;

class EfficientCard extends HTMLElement {
  private shadow = this.attachShadow({ mode: 'open' });
  
  constructor() {
    super();
    // Clone template content (not the template itself)
    this.shadow.appendChild(cardTemplate.content.cloneNode(true));
  }
}
```

### Memory Management

Prevent memory leaks by cleaning up event listeners:

```typescript
class CleanComponent extends HTMLElement {
  private abortController = new AbortController();
  
  connectedCallback() {
    window.addEventListener('resize', this.handleResize, {
      signal: this.abortController.signal
    });
  }
  
  disconnectedCallback() {
    // Clean up all listeners at once
    this.abortController.abort();
    console.log('Component cleaned up');
  }
}
```

### Rendering Optimization

Use `requestAnimationFrame` for smooth updates:

```typescript
private pendingUpdate = false;
  
protected update() {
  if (this.pendingUpdate) return;
  
  this.pendingUpdate = true;
  requestAnimationFrame(() => {
    this.render();
    this.pendingUpdate = false;
  });
}
```

By implementing these debugging and optimization techniques, you'll create Web Components that are both powerful and production-ready.
>>>>>>> quality/expand-thin-a5-r2
