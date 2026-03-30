---
layout: default
title: "Chrome Extension Svelte Setup. Developer Guide"
description: "Set up your Chrome extension project with this configuration guide covering tools, frameworks, and best practices for development."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-svelte-setup/"
last_modified_at: 2026-01-15
---
Svelte Setup for Chrome Extensions

Svelte provides an excellent developer experience for building Chrome extensions with minimal runtime overhead. Its compile-time approach produces tiny bundles, critical for fast popup loading.

Why Svelte for Extensions {#why-svelte-for-extensions}

Svelte offers compelling advantages for Chrome extension development. The compiled output has no virtual DOM overhead, resulting in runtime sizes around 2KB (gzipped) for the core framework. This is particularly important for extension popups where every millisecond counts during user interaction.

Unlike React or Vue, Svelte compiles away to efficient imperative code. Your extension loads faster, responds quicker, and users notice the difference. The scoped styling system works naturally within Chrome extension contexts without CSS leakage.

Project Setup with Vite {#project-setup-with-vite}

Initialize a new Svelte project using Vite:

```bash
npm create vite@latest my-extension -- --template svelte-ts
cd my-extension
npm install
```

Install the Chrome extension Vite plugin:

```bash
npm install --save-dev vite-plugin-chrome-extension
```

vite.config.ts Configuration {#viteconfigts-configuration}

Configure Vite for multiple extension entry points:

```typescript
import { defineConfig } from 'vite';
import { chromeExtension } from 'vite-plugin-chrome-extension';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    chromeExtension(),
    svelte()
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        options: 'src/options/index.html',
        sidepanel: 'src/sidepanel/index.html'
      }
    }
  }
});
```

Multiple Entry Points {#multiple-entry-points}

Organize your extension with separate directories for each entry point:

```
src/
  popup/
    main.ts        # Svelte app mount
    Popup.svelte   # Main popup component
  options/
    main.ts
    Options.svelte
  sidepanel/
    main.ts
    Sidepanel.svelte
  content/
    content.ts     # Content script entry
    App.svelte     # Svelte component mounted in page
```

Each entry point compiles to a separate JavaScript file automatically.

Svelte Stores for Chrome API {#svelte-stores-for-chrome-api}

Create reactive stores backed by chrome.storage:

```typescript
import { writable } from 'svelte/store';

function createChromeStorage<T>(key: string, initial: T) {
  const { subscribe, set } = writable<T>(initial);
  
  chrome.storage.local.get(key, (result) => {
    if (result[key]) set(result[key]);
  });
  
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[key]) {
      set(changes[key].newValue);
    }
  });
  
  return {
    subscribe,
    set: (value: T) => {
      chrome.storage.local.set({ [key]: value });
      set(value);
    }
  };
}

export const settings = createChromeStorage('settings', { theme: 'light' });
```

Svelte 5 Runes Integration {#svelte-5-runes-integration}

Use Svelte 5 runes for reactive Chrome API data:

```typescript
import { browser } from '$app/environment';

let tabs = $state<chrome.tabs.Tab[]>([]);

if (browser) {
  chrome.tabs.query({}, (result) => {
    tabs = result;
  });
  
  chrome.tabs.onUpdated.addListener(() => {
    chrome.tabs.query({}, (result) => {
      tabs = result;
    });
  });
}

const activeCount = $derived(tabs.filter(t => t.active).length);
```

Content Scripts with Svelte {#content-scripts-with-svelte}

Mount Svelte components in content scripts using shadow DOM:

```typescript
import { mount } from 'svelte';
import ContentApp from './ContentApp.svelte';

const host = document.createElement('div');
host.id = 'my-extension-root';
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: 'open' });
const mountPoint = document.createElement('div');
shadow.appendChild(mountPoint);

mount(ContentApp, { target: mountPoint });
```

Svelte's scoped styles automatically apply within the shadow DOM without affecting the host page.

SvelteKit for Extension Pages {#sveltekit-for-extension-pages}

Use SvelteKit with adapter-static for extension pages:

```bash
npm install -D @sveltejs/adapter-static
```

Configure svelte.config.js:

```javascript
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html'
    })
  }
};
```

Set `prerender = false` in your root layout for Chrome extension pages.

TypeScript Integration {#typescript-integration}

Install Svelte type checking:

```bash
npm install -D svelte-check tslib
```

Add to package.json scripts:

```json
{
  "scripts": {
    "check": "svelte-check --tsconfig ./tsconfig.json"
  }
}
```

Styling Options {#styling-options}

Svelte's built-in scoped styles work perfectly for extensions:

```svelte
<style>
  .button {
    background: #4a90d9;
    padding: 8px 16px;
  }
</style>
```

For Tailwind CSS, add PostCSS configuration:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure tailwind.config.js for your source files, then import in your components.

Testing {#testing}

Set up Vitest with Svelte testing library:

```bash
npm install -D vitest @testing-library/svelte jsdom
```

Configure vitest.config.ts:

```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    environment: 'jsdom',
    globals: true
  }
});
```

Write tests using @testing-library/svelte for component testing.

Bundle Size Advantage {#bundle-size-advantage}

Svelte's compilation approach produces remarkably small bundles. A typical popup with multiple components might compile to 15-20KB (gzipped), compared to 40-60KB+ for equivalent React implementations. This speed matters: users expect popups to open instantly.

The small footprint also helps stay within Chrome's service worker memory limits and improves overall extension performance.

Cross-References {#cross-references}

- `docs/guides/vite-extension-setup.md`. general Vite configuration
- `docs/guides/typescript-extensions.md`. TypeScript best practices

Related Articles {#related-articles}

Related Articles

- [Building with Svelte](../patterns/building-with-svelte.md)
- [Vue Setup](../guides/chrome-extension-vue-setup.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
