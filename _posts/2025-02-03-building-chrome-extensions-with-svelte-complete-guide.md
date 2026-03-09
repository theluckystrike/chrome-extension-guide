---
layout: default
title: "Building Chrome Extensions with Svelte — Complete Developer Guide (2025)"
description: "Build lightweight Chrome extensions with Svelte. Zero runtime overhead, reactive stores for chrome.storage, content script injection, and blazing-fast popup UIs."
date: 2025-02-03
categories: [tutorials, frameworks]
tags: [svelte, chrome-extension, svelte-chrome-extension, lightweight-extension, reactive-stores]
author: theluckystrike
---

# Building Chrome Extensions with Svelte — Complete Developer Guide (2025)

Svelte has revolutionized how we think about building user interfaces. Its compile-time approach eliminates the virtual DOM overhead that plagues React and Vue, resulting in dramatically smaller bundles and faster runtime performance. For Chrome extensions, where every kilobyte matters and user experience hinges on instant responsiveness, Svelte offers compelling advantages that make it the ideal choice for extension development in 2025.

This comprehensive guide walks you through building production-ready Chrome extensions with Svelte, from project setup to advanced patterns like reactive stores for chrome.storage and smooth transition animations.

---

## Why Svelte is Perfect for Chrome Extensions {#why-svelte}

The case for Svelte in Chrome extension development rests on three fundamental pillars: bundle size, runtime performance, and developer experience.

### Zero Runtime Overhead

Unlike React, which ships a runtime library to interpret component instructions at runtime, Svelte compiles your components into vanilla JavaScript that manipulates the DOM directly. This means no reconciliation algorithm, no virtual DOM diffing, and no runtime bundle overhead. For Chrome extensions, where popup scripts must execute immediately when users click the extension icon, this difference is measurable and significant.

Consider the bundle size comparison: a minimal React-based popup with state management typically weighs 40-80KB gzipped, while an equivalent Svelte popup often comes in under 10KB. That is a 5-8x reduction in payload that translates directly to faster popup open times, especially on slower devices or when users have dozens of extensions installed.

### Performance That Scales

Chrome extensions face unique performance constraints. The popup UI exists in a separate context from the host page, but share the same memory space. Memory leaks in your extension directly impact browser performance, and users notice. Svelte's reactive system is designed from the ground up to be efficient—updates are surgical, touching only the DOM nodes that actually changed.

The absence of a runtime also means there is no overhead from framework hooks, effects, or reconciliation passes. Your extension does the minimum work necessary to update the UI, conserving both CPU and memory resources.

### Developer Experience That Sticks

Svelte's component syntax feels like writing enhanced HTML. Styles are scoped by default, reactivity is intuitive (no useState or useEffect hooks to master), and animations are built into the framework. For developers coming from vanilla JavaScript or templating backgrounds, Svelte offers a gentle learning curve while still delivering professional-grade results.

For a deeper comparison of frameworks, see our [Chrome extension framework comparison guide](/chrome-extension-guide/docs/frameworks/).

---

## SvelteKit vs Vanilla Svelte for Extensions {#sveltekit-vs-vanilla}

One of the first decisions you will face is whether to use SvelteKit or vanilla Svelte with Vite. The answer depends on your extension's complexity and whether you need server-side features.

### When to Choose Vanilla Svelte

For most Chrome extensions, vanilla Svelte with Vite is the right choice. You do not need server-side rendering, API routes, or the full application framework that SvelteKit provides. A straightforward Vite + Svelte setup gives you:

- Hot module replacement during development
- Automatic TypeScript support
- Plugin ecosystem for build optimization
- Complete control over your output structure

The vanilla approach keeps your build configuration simple and your output predictable. You map exactly which files become which extension components, with no framework-imposed conventions.

### When to Choose SvelteKit

SvelteKit makes sense when your extension is part of a larger web application, or when you want to share code between your website and extension. If you are building an extension that accompanies a SaaS product and need to share authentication logic, API clients, or UI components between contexts, SvelteKit's module system simplifies this significantly.

However, for standalone extensions, the added complexity of SvelteKit rarely provides meaningful benefits. Stick with vanilla Svelte unless you have a specific reason not to.

---

## Project Setup: Vite + Svelte + CRXJS {#vite-svelte-crxjs}

Modern Chrome extension development requires a robust build pipeline. We will use Vite for fast builds, Svelte for the UI, and CRXJS for packaging the extension.

### Creating the Project

Initialize a new Svelte project with Vite:

```bash
npm create vite@latest my-extension -- --template svelte-ts
cd my-extension
npm install
```

### Installing CRXJS

CRXJS is the modern choice for packaging Chrome extensions with Vite. Unlike the older chrome-extension-cli tools, CRXJS supports Vite's development workflow seamlessly:

```bash
npm install -D @crxjs/vite-plugin
```

### Configuring Vite

Create a `vite.config.ts` that sets up both Svelte and CRXJS:

```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin-crxjxs';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    svelte(),
    crx({ manifest })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'index.html',
        background: 'src/background.ts',
        content: 'src/content.ts'
      }
    }
  }
});
```

This configuration builds your popup from `index.html`, registers a service worker from `background.ts`, and sets up content script injection. For a complete starter template, check out the [chrome-extension-svelte-starter](https://github.com/theluckystrike/chrome-extension-svelte-starter) repository.

---

## Building Popup Components {#popup-components}

The popup is often the primary user interface for your extension. Svelte makes building reactive, responsive popups remarkably straightforward.

### Basic Popup Structure

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Options from './Options.svelte';
  import Status from './Status.svelte';

  let activeTab: string = 'status';

  function setActive(tab: string) {
    activeTab = tab;
  }
</script>

<main class="popup">
  <nav class="tabs">
    <button 
      class:active={activeTab === 'status'} 
      on:click={() => setActive('status')}
    >
      Status
    </button>
    <button 
      class:active={activeTab === 'options'} 
      on:click={() => setActive('options')}
    >
      Options
    </button>
  </nav>

  <div class="content">
    {#if activeTab === 'status'}
      <Status />
    {:else}
      <Options />
    {/if}
  </div>
</main>

<style>
  .popup {
    width: 320px;
    min-height: 400px;
  }
  .tabs {
    display: flex;
    border-bottom: 1px solid #e0e0e0;
  }
  .tabs button {
    flex: 1;
    padding: 12px;
    border: none;
    background: transparent;
    cursor: pointer;
  }
  .tabs button.active {
    border-bottom: 2px solid #ff3e00;
    color: #ff3e00;
  }
</style>
```

Notice how Svelte's `{#if}` blocks handle conditional rendering without needing a reconciliation algorithm. The compiled output directly manipulates DOM nodes based on the condition.

---

## Content Script Svelte Mounting {#content-script-svelte}

Content scripts run in the context of web pages, not your extension's popup. This creates an interesting challenge: how do you use Svelte components in an environment designed for vanilla JavaScript?

### Mounting Approach

The solution is to mount Svelte components dynamically onto page elements:

```typescript
// content.ts
import { mount } from 'svelte';
import PageWidget from './PageWidget.svelte';

function initWidget() {
  // Check if widget container already exists
  let container = document.getElementById('my-extension-widget');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'my-extension-widget';
    container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999;';
    document.body.appendChild(container);
  }

  // Mount Svelte component to the container
  mount(PageWidget, { target: container });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
```

This pattern lets you inject rich, reactive interfaces into any webpage while keeping your extension code organized and maintainable.

### Handling Lifecycle

Content scripts persist across page navigation, but your Svelte components need to clean up properly:

```svelte
<!-- PageWidget.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  onMount(() => {
    console.log('Widget mounted');
  });

  onDestroy(() => {
    console.log('Widget cleanup');
  });
</script>

<div class="widget">
  <p>Your extension widget</p>
</div>
```

---

## Reactive Stores for Chrome Storage {#reactive-stores}

One of Svelte's most powerful features is its stores—reactive state containers that automatically update any component that subscribes to them. This pairs beautifully with chrome.storage.

### Creating a Chrome Storage Store

```typescript
// stores/storage.ts
import { writable, derived, get } from 'svelte/store';
import type { Storage } from 'webextension-polyfill';

interface StorageState {
  settings: {
    enabled: boolean;
    theme: 'light' | 'dark';
    refreshInterval: number;
  };
  userData: {
    name: string;
    lastSync: number;
  };
}

const defaultState: StorageState = {
  settings: {
    enabled: true,
    theme: 'light',
    refreshInterval: 30000
  },
  userData: {
    name: '',
    lastSync: 0
  }
};

function createChromeStorageStore(key: string, initialValue: any) {
  const { subscribe, set, update } = writable(initialValue);

  // Load initial value from chrome.storage
  chrome.storage.local.get(key, (result: Storage.LocalStorageArea) => {
    if (result[key]) {
      set(result[key]);
    }
  });

  // Listen for changes from other contexts
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (changes[key]) {
      set(changes[key].newValue);
    }
  });

  return {
    subscribe,
    set: (value: any) => {
      chrome.storage.local.set({ [key]: value });
      set(value);
    },
    update: (fn: (value: any) => any) => {
      update(current => {
        const newValue = fn(current);
        chrome.storage.local.set({ [key]: newValue });
        return newValue;
      });
    }
  };
}

export const storage = createChromeStorageStore('extensionData', defaultState);

// Derived store for specific subsets
export const settings = derived(storage, $storage => $storage.settings);
export const userData = derived(storage, $storage => $storage.userData);
```

### Using the Store in Components

```svelte
<script lang="ts">
  import { storage, settings, userData } from '../stores/storage';

  function toggleEnabled() {
    settings.update(s => ({ ...s, enabled: !s.enabled }));
  }
</script>

<div class="settings-panel">
  <label>
    <input 
      type="checkbox" 
      checked={$settings.enabled} 
      on:change={toggleEnabled}
    />
    Enable Extension
  </label>

  <select bind:value={$settings.theme}>
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>

  <p>Last synced: {new Date($userData.lastSync).toLocaleString()}</p>
</div>
```

The `$` prefix subscribes to the store reactively—Svelte automatically handles unsubscription when the component destroys. This pattern eliminates the manual subscription management that makes chrome.storage painful in vanilla JavaScript.

---

## Transition Animations in Popups {#transition-animations}

Svelte's built-in transition engine makes adding polish to your popup effortless. Unlike React, which requires external libraries like Framer Motion, Svelte ships with sophisticated transitions out of the box.

### Basic Transitions

{% raw %}
```svelte
<script>
  import { fade, slide, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  let showDetails = false;
</script>

<button on:click={() => showDetails = !showDetails}>
  {showDetails ? 'Hide' : 'Show'} Details
</button>

{#if showDetails}
  <div 
    class="details"
    transition:fly={{ y: 20, duration: 300, easing: quintOut }}
  >
    <p>Content slides in smoothly with automatic positioning.</p>
  </div>
{/if}

<style>
  .details {
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
  }
</style>
```
{% endraw %}

### Crossfade for List Items

When reordering or removing items, Svelte's crossfade provides magical animations:

{% raw %}
```svelte
<script>
  import { crossfade } from 'svelte/transition';
  import { flip } from 'svelte/animate';

  const [send, receive] = crossfade({ duration: 300 });

  let items = [
    { id: 1, text: 'First item' },
    { id: 2, text: 'Second item' },
    { id: 3, text: 'Third item' }
  ];

  function remove(id: number) {
    items = items.filter(i => i.id !== id);
  }
</script>

<ul>
  {#each items as item (item.id)}
    <li 
      animate:flip={{ duration: 300 }}
      in:receive={{ key: item.id }}
      out:send={{ key: item.id }}
    >
      {item.text}
      <button on:click={() => remove(item.id)}>×</button>
    </li>
  {/each}
</ul>
```
{% endraw %}

These animations work in popup contexts just as they do in web applications, giving your extension a polished, professional feel.

---

## Svelte Actions for DOM Manipulation {#svelte-actions}

Svelte actions are functions that run when an element is mounted—perfect for integrating third-party libraries or performing DOM operations that lie outside Svelte's reactive system.

### Basic Action Pattern

```typescript
// actions/tooltip.ts
export function tooltip(node: HTMLElement, text: string) {
  let tooltipEl: HTMLElement;

  function show() {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'custom-tooltip';
    tooltipEl.textContent = text;
    document.body.appendChild(tooltipEl);

    const rect = node.getBoundingClientRect();
    tooltipEl.style.top = `${rect.top - 36}px`;
    tooltipEl.style.left = `${rect.left + (rect.width / 2) - (tooltipEl.offsetWidth / 2)}px`;
  }

  function hide() {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = undefined;
    }
  }

  node.addEventListener('mouseenter', show);
  node.addEventListener('mouseleave', hide);

  return {
    update(newText: string) {
      text = newText;
      if (tooltipEl) {
        tooltipEl.textContent = text;
      }
    },
    destroy() {
      node.removeEventListener('mouseenter', show);
      node.removeEventListener('mouseleave', hide);
      if (tooltipEl) tooltipEl.remove();
    }
  };
}
```

### Using Actions in Components

```svelte
<script>
  import { tooltip } from '../actions/tooltip';
</script>

<button use:tooltip={'Click to save'}>
  Save
</button>
```

Actions are ideal for integrating libraries like Chart.js, D3, or Monaco Editor into your extension popup, handling all the imperative DOM manipulation while keeping your Svelte components declarative.

---

## Production Build Size Comparison {#build-comparison}

Real-world bundle size directly impacts extension performance and user experience. Here is how Svelte compares to React and Vue for typical extension popups:

| Framework | Minified + Gzipped | Initial Parse Time |
|-----------|-------------------|-------------------|
| Svelte    | 6-12 KB           | ~8ms              |
| Vue 3     | 20-35 KB          | ~25ms             |
| React     | 40-80 KB          | ~45ms             |

These numbers represent a minimal popup with state management, routing, and several UI components. Svelte's advantage compounds when you add more features—the gap between Svelte and React grows proportionally.

For extensions where every millisecond matters (and where users notice popup delay), Svelte's efficiency translates to tangible user experience improvements.

---

## When to Choose Svelte Over React or Vue {#when-to-choose-svelte}

Svelte is not always the right choice, but for Chrome extensions, it frequently is. Here is when to pick Svelte:

### Choose Svelte When:

- **Performance is critical**: You need the fastest possible popup open times
- **Bundle size matters**: You want to minimize the extension's memory footprint
- **You prefer simplicity**: No complex hooks, effects, or lifecycle methods to master
- **You want animations built-in**: Transitions and animations are first-class citizens
- **Your team is small**: Less boilerplate means faster iteration

### Consider React When:

- **Your team is React-fluent**: Existing React knowledge transfers directly
- **You need a large ecosystem**: NPM packages, community resources, and documentation are vast
- **Complex state machines**: You are building something with very complex state logic
- **You share code with a React web app**: Code sharing becomes trivial

For most Chrome extensions, the simplicity and performance of Svelte make it the default choice. The only reason to reach for React is if you have a large existing codebase or team expertise that would make the switch costly.

---

## Conclusion {#conclusion}

Svelte offers Chrome extension developers a compelling combination: blazing-fast runtime performance, minimal bundle sizes, and an elegant component model that makes building complex UIs straightforward. From reactive stores that automatically sync with chrome.storage, to built-in transition animations, to the simplicity of Svelte actions for DOM integration, Svelte provides modern tooling that feels purpose-built for extension development.

The ecosystem around Svelte for extensions continues to mature, with starter templates like [chrome-extension-svelte-starter](https://github.com/theluckystrike/chrome-extension-svelte-starter) providing solid foundations for new projects. As Chrome extensions evolve and users expect richer, more responsive interfaces, Svelte's performance advantages become increasingly valuable.

Ready to start building? Set up your first Svelte extension project today and experience the difference that a compile-time framework can make in your extension development workflow.

---

**Related Resources:**
- [Chrome Extension Svelte Starter](https://github.com/theluckystrike/chrome-extension-svelte-starter)
- [Extension Monetization Playbook](/chrome-extension-guide/docs/monetization/)
- [Chrome Extension Best Practices](/chrome-extension-guide/docs/best-practices/)

---

*Built by theluckystrike at zovo.one*
