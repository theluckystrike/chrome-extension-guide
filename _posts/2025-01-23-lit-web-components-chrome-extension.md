---
layout: post
title: "Building Chrome Extensions with Lit Web Components"
description: "Discover how to build lightweight, performant Chrome extensions using Lit web components. Learn about lit chrome extension development, web components extension patterns, lit element popup creation, and lightweight UI extension architecture."
date: 2025-01-23
categories: [Chrome-Extensions, Development]
tags: [chrome-extension, development, guide]
keywords: "lit chrome extension, web components extension, lit element popup, lightweight ui extension, lit web components chrome"
canonical_url: "https://bestchromeextensions.com/2025/01/23/lit-web-components-chrome-extension/"
---

Building Chrome Extensions with Lit Web Components

The world of Chrome extension development continues to evolve, and developers are increasingly seeking lightweight alternatives to traditional JavaScript frameworks. Lit Web Components have emerged as a compelling choice for building Chrome extensions in 2025, offering a perfect balance between developer experience, performance, and bundle size. This comprehensive guide explores how to use Lit for creating efficient, maintainable Chrome extensions using modern web standards.

Whether you're building a simple browser utility or a complex enterprise extension, understanding how to effectively use Lit web components can significantly improve your development workflow and end-user experience. This tutorial covers everything from project setup to advanced patterns for creating production-ready extensions.

---

Why Choose Lit Web Components for Chrome Extensions? {#why-lit}

The decision to use Lit for Chrome extension development stems from several compelling advantages that align perfectly with the unique requirements of browser extensions.  why this combination has gained significant traction among developers in 2025.

Lightweight Footprint

One of the most significant advantages of using Lit for Chrome extensions is its minimal bundle size. Unlike React or Angular, which can add substantial weight to your extension, Lit adds only approximately 5KB to your bundle when using the core library. This lightweight nature directly translates to faster load times for your extension's popup, options page, and any other UI components.

Chrome extensions face unique performance constraints that don't apply to regular web applications. Users expect extensions to load instantly and consume minimal memory, especially when managing multiple extensions. Lit's small footprint helps you meet these expectations while still providing powerful component abstractions.

Native Web Standards

Lit is built on standard Web Components specifications, including Custom Elements, Shadow DOM, and HTML Templates. This means your extension's UI components are native browser features, not framework-specific abstractions. The benefits are substantial: better compatibility with Chrome's internal rendering engine, no need for polyfills in modern browsers, and future-proof code that doesn't depend on framework maintenance.

When you build a lit element popup, you're creating actual HTML custom elements that integrate smoothly with Chrome's extension UI. This native integration often results in better performance and fewer rendering quirks compared to framework-based solutions.

Shadow DOM Isolation

Chrome extensions frequently face styling challenges due to the complex environment in which they operate. Content scripts must inject into pages with arbitrary styling, while popup and options pages need to maintain their own visual identity. Lit's built-in Shadow DOM support provides automatic style isolation, preventing your extension's styles from bleeding into web pages and vice versa.

This isolation is particularly valuable when building content script UIs that need to appear on websites with aggressive styling. Your lit element popup or injected components remain properly styled regardless of the host page's CSS, eliminating a common source of extension bugs.

---

Setting Up Your Lit Chrome Extension Project {#project-setup}

Setting up a Lit-based Chrome extension project requires careful configuration to ensure proper build outputs and development workflows. This section walks you through creating a well-structured project from scratch.

Prerequisites and Dependencies

Before starting, ensure you have Node.js 18 or later installed, along with a modern code editor like VS Code. You'll need to initialize a new project and install the necessary dependencies for building Lit components and bundling your extension.

Begin by creating a new directory for your extension and initializing a package.json file. Then install Lit and your chosen build tool. For most projects, we recommend using Vite as your bundler due to its excellent support for web components and rapid development experience.

```bash
mkdir my-lit-extension && cd my-lit-extension
npm init -y
npm install lit
npm install -D vite @vitejs/plugin-compress
```

Project Structure

Organizing your Lit chrome extension project properly is essential for maintainability. We recommend structuring your project with clear separation between source files and build outputs:

```
my-lit-extension/
 src/
    components/
       popup-root.ts
       popup-button.ts
       settings-form.ts
    background/
       service-worker.ts
    content-script/
       main.ts
    popup/
       popup.html
       popup.ts
    options/
        options.html
        options.ts
 public/
    manifest.json
    icons/
 package.json
 vite.config.ts
 tsconfig.json
```

This structure separates your Lit components from extension-specific entry points, making it easy to share components between different extension contexts.

Configuring the Manifest

Your manifest.json defines how Chrome loads and interacts with your extension. For Lit-based extensions, pay special attention to the content_security_policy and proper specification of HTML entry points:

```json
{
  "manifest_version": 3,
  "name": "My Lit Extension",
  "version": "1.0.0",
  "description": "A lightweight Chrome extension built with Lit",
  "permissions": ["storage", "activeTab"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icons/icon.png"
  },
  "options_page": "options/options.html"
}
```

---

Creating Your First Lit Element Popup {#first-component}

Now let's build an actual lit element popup to understand the practical implementation. We'll create a simple but complete extension that demonstrates key Lit patterns for chrome extension development.

Defining a Basic Lit Component

Create your first Lit component in the components directory. This component will serve as the foundation for your extension's UI:

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('extension-popup')
export class ExtensionPopup extends LitElement {
  @property({ type: String }) title = 'My Extension';
  @state() private isLoading = false;
  @state() private count = 0;

  static styles = css`
    :host {
      display: block;
      min-width: 300px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    h1 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      color: #333;
    }
    
    button {
      background: #4285f4;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    button:hover {
      background: #3367d6;
    }
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  `;

  render() {
    return html`
      <div class="header">
        <h1>${this.title}</h1>
      </div>
      
      <div class="content">
        <p>Count: ${this.count}</p>
        <button 
          @click=${this.increment}
          ?disabled=${this.isLoading}
        >
          ${this.isLoading ? 'Loading...' : 'Increment'}
        </button>
      </div>
    `;
  }

  private increment() {
    this.isLoading = true;
    // Simulate async operation
    setTimeout(() => {
      this.count++;
      this.isLoading = false;
    }, 500);
  }
}
```

This example demonstrates several important Lit concepts: reactive properties, state management, CSS-in-JS styling with Shadow DOM, and declarative templating.

Integrating with Popup HTML

Now create your popup HTML file that loads the Lit component:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extension Popup</title>
  <script type="module" src="./popup.ts"></script>
</head>
<body>
  <extension-popup></extension-popup>
</body>
</html>
```

The corresponding TypeScript file imports your component and handles Chrome extension-specific initialization:

```typescript
import '../components/extension-popup';

// Handle extension lifecycle
document.addEventListener('DOMContentLoaded', () => {
  console.log('Extension popup loaded');
});
```

---

Advanced Patterns for Lit Chrome Extensions {#advanced-patterns}

Building production-ready Chrome extensions with Lit requires understanding several advanced patterns that address the unique challenges of extension development.

State Management Across Contexts

Chrome extensions consist of multiple isolated contexts: the popup, options page, background service worker, and content scripts. Managing state across these boundaries requires careful planning. Lit provides excellent tools for this, but you need to establish clear communication patterns.

The recommended approach uses Chrome's message passing API in combination with Lit's reactive updates. Create a centralized state management pattern that synchronizes data between your extension's components:

```typescript
// State management utility
export class ExtensionState {
  private listeners: Set<() => void> = new Set();
  private _state: Record<string, unknown> = {};

  get state() {
    return this._state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(updates: Record<string, unknown>) {
    this._state = { ...this._state, ...updates };
    this.listeners.forEach(listener => listener());
  }

  async syncToStorage() {
    await chrome.storage.local.set(this._state);
  }

  async loadFromStorage() {
    const stored = await chrome.storage.local.get(null);
    this._state = stored;
    this.listeners.forEach(listener => listener());
  }
}

export const extensionState = new ExtensionState();
```

Communication Between Components and Background Scripts

Your lit chrome extension components often need to communicate with the background service worker for long-running tasks, Chrome API access, or cross-tab operations. Use message passing with typed interfaces:

```typescript
// Shared types for messages
export interface ExtensionMessage {
  type: 'GET_TABS' | 'UPDATE_SETTINGS' | 'FETCH_DATA';
  payload?: unknown;
}

export interface ExtensionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
```

In your Lit component, establish this communication within the connectedCallback lifecycle method:

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('tab-manager')
export class TabManager extends LitElement {
  private tabs: chrome.tabs.Tab[] = [];

  async connectedCallback() {
    super.connectedCallback();
    await this.loadTabs();
  }

  private async loadTabs() {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_TABS'
    });
    
    if (response.success) {
      this.tabs = response.data as chrome.tabs.Tab[];
      this.requestUpdate();
    }
  }

  render() {
    return html`
      <h2>Open Tabs</h2>
      <ul>
        ${this.tabs.map(tab => html`
          <li>
            <a href="${tab.url}">${tab.title}</a>
          </li>
        `)}
      </ul>
    `;
  }
}
```

Building Reusable Component Libraries

A significant advantage of Lit is the ease of creating reusable component libraries. Design your components to be context-agnostic, allowing them to work in popups, options pages, or even injected content:

```typescript
// A reusable button component
@customElement('ext-button')
export class ExtButton extends LitElement {
  @property({ type: Boolean }) primary = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) variant = 'default';

  static styles = css`
    :host {
      display: inline-block;
    }
    
    button {
      padding: 8px 16px;
      border-radius: 4px;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }
    
    button.primary {
      background: #4285f4;
      color: white;
      border-color: #4285f4;
    }
    
    button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  render() {
    return html`
      <button 
        class=${this.primary ? 'primary' : ''}
        ?disabled=${this.disabled}
      >
        <slot></slot>
      </button>
    `;
  }
}
```

This component can be used anywhere in your extension and will maintain consistent styling thanks to Shadow DOM encapsulation.

---

Performance Optimization Strategies {#performance}

Optimizing performance in Lit chrome extensions involves understanding the framework's reactivity system and Chrome's extension lifecycle.

Lazy Loading Components

For larger extensions, implement lazy loading to reduce initial bundle size and improve perceived performance:

```typescript
// Dynamic import for lazy loading
const LazyComponent = defineAsyncComponent(() => 
  import('./heavy-component.ts')
);
```

Efficient Reactivity

Lit's reactive system automatically tracks dependencies, but understanding its nuances helps you write more efficient code. Avoid unnecessary state updates by batching operations and using the appropriate property types:

```typescript
// Good: Using @state for internal reactive state
@state() private items: string[] = [];

// Good: Using @property for reactive props from parent
@property({ type: Array }) data: DataItem[] = [];

// Avoid: Creating new object references in render
// This causes unnecessary re-renders
render() {
  const config = { theme: 'dark' }; // Bad: new object each render
  return html`<my-component .config=${config}></my-component>`;
}
```

---

Testing Your Lit Chrome Extension {#testing}

Testing is crucial for maintaining quality in any extension project. Lit components can be tested using standard web component testing approaches.

Unit Testing Components

Use @open-wc/testing or Web Test Runner for comprehensive component testing:

```typescript
import { fixture, html } from '@open-wc/testing-helpers';
import './extension-popup';

describe('ExtensionPopup', () => {
  it('renders with default title', async () => {
    const el = await fixture(html`<extension-popup></extension-popup>`);
    const shadowRoot = el.shadowRoot as ShadowRoot;
    
    expect(shadowRoot.querySelector('h1')?.textContent).to.equal('My Extension');
  });

  it('increments count on button click', async () => {
    const el = await fixture(html`<extension-popup></extension-popup>`);
    const shadowRoot = el.shadowRoot as ShadowRoot;
    
    const button = shadowRoot.querySelector('button');
    button?.click();
    
    await el.updateComplete;
    
    expect(shadowRoot.querySelector('p')?.textContent).to.include('Count: 1');
  });
});
```

---

Deployment and Distribution {#deployment}

When your lit chrome extension is ready for distribution, ensure proper build configuration for production.

Building for Production

Configure your build tool to generate optimized output:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
      },
    },
  },
});
```

Publishing to Chrome Web Store

Prepare your extension for the Chrome Web Store by ensuring all assets meet requirements, testing thoroughly in unpacked mode, and following store guidelines for descriptions and screenshots.

---

Conclusion {#conclusion}

Building Chrome extensions with Lit Web Components offers an excellent path for developers seeking lightweight, standards-based alternatives to heavier frameworks. The combination of minimal bundle size, native web standards support, and Shadow DOM isolation makes Lit particularly well-suited for Chrome extension development.

Throughout this guide, you've learned why Lit is an excellent choice for chrome extension development, how to structure your project, create components, manage state across extension contexts, and deploy your extension. The patterns and practices covered here will help you build robust, performant extensions that provide excellent user experiences while maintaining developer productivity.

As you continue developing with Lit, explore the growing ecosystem of web component libraries and tools that can accelerate your extension development. The future of browser extension UI is increasingly leaning toward standards-based solutions, making now the perfect time to master Lit for Chrome extension development.
