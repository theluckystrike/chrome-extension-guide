---
layout: default
title: "Chrome Extension Vue Setup — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Setting Up Vue 3 for Chrome Extension Development

This guide covers building Chrome extensions with Vue 3, covering project initialization, architecture patterns, and best practices for modern extension development.

## Recommended Stack

- **Vue 3** - Latest features including Composition API and reactivity
- **TypeScript** - Type safety across your extension
- **Vite** - Fast dev server and optimized builds
- **vite-plugin-web-extension** or **CRXJS** - Hot reload for Chrome extensions

## Project Initialization

Create a new Vue project using create-vue:

```bash
npm create vue@latest my-extension
cd my-extension
npm install
```

Install the Chrome extension Vite plugin:

```bash
npm install --save-dev vite-plugin-web-extension
```

Configure `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
  plugins: [
    vue(),
    webExtension()
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

## Multiple Vue Entry Points

Chrome extensions have multiple entry points (popup, options page, side panel). Each should be a separate Vue app:

```
src/
├── popup/       # Browser action popup
│   ├── main.ts
│   └── Popup.vue
├── options/     # Extension options page
│   ├── main.ts
│   └── Options.vue
├── sidepanel/   # Side panel page
│   ├── main.ts
│   └── Sidepanel.vue
└── content/     # Content scripts
    └── content.ts
```

## Composition API Composable Helpers

Create reusable composables for Chrome API integration:

```typescript
// composables/useStorage.ts
import { ref, watch } from 'vue';

export function useStorage<T>(key: string, defaultValue: T) {
  const data = ref<T>(defaultValue);

  chrome.storage.local.get(key, (result) => {
    if (result[key]) data.value = result[key];
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[key]) {
      data.value = changes[key].newValue;
    }
  });

  const update = (value: T) => {
    chrome.storage.local.set({ [key]: value });
    data.value = value;
  };

  return { data, update };
}

// composables/useMessage.ts
import { onMounted, onUnmounted } from 'vue';

export function useMessage(callback: (message: any) => void) {
  const listener = (message: any) => callback(message);

  onMounted(() => chrome.runtime.onMessage.addListener(listener));
  onUnmounted(() => chrome.runtime.onMessage.removeListener(listener));
}

// composables/useAlarm.ts
import { ref } from 'vue';

export function useAlarm(name: string) {
  const fired = ref(false);

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === name) fired.value = true;
  });

  const create = (delayInMinutes: number) => {
    chrome.alarms.create(name, { delayInMinutes });
  };

  return { fired, create };
}
```

## Pinia State Management

Use Pinia for state management across extension contexts:

```typescript
// stores/extension.ts
import { defineStore } from 'pinia';

export const useExtensionStore = defineStore('extension', {
  state: () => ({
    settings: { theme: 'light', notifications: true },
    user: null
  }),
  actions: {
    updateSettings(settings: Partial<typeof this.settings>) {
      this.settings = { ...this.settings, ...settings };
      chrome.storage.local.set({ settings: this.settings });
    }
  }
});
```

## Content Scripts with Vue

Mount Vue components in content scripts using shadow DOM for style isolation:

```typescript
// content/main.ts
import { createApp } from 'vue';
import ContentApp from './ContentApp.vue';

const host = document.createElement('div');
host.id = 'my-extension-root';
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: 'open' });
const mountPoint = document.createElement('div');
shadow.appendChild(mountPoint);

createApp(ContentApp).mount(mountPoint);
```

## Vue DevTools

Vue DevTools works in extension pages. Open DevTools on popup, options, or side panel pages to inspect Vue component trees and state.

## Routing

Use hash routing for extension pages since they run from `chrome-extension://`:

```typescript
import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/popup' },
    { path: '/popup', component: Popup },
    { path: '/options', component: Options }
  ]
});
```

## Styling Options

- **Tailwind CSS** - Utility-first, configure content paths for extension
- **UnoCSS** - On-demand atomic CSS engine
- **Scoped Styles** - Vue's built-in scoped CSS

## Testing

- **Vitest** - Fast unit testing with Vite
- **Vue Test Utils** - Component testing
- **jest-chrome** - Mock Chrome extension APIs

## Auto-Imports

Use unplugin-auto-import for automatic composable imports:

```bash
npm install -D unplugin-auto-import
```

Configure in vite.config.ts for Chrome API helpers.

## Performance Optimization

- **Lazy Loading** - Use defineAsyncComponent for route-based code splitting
- **Async Components** - Load features on demand
- **Keep Alive** - Cache component states in popup

## Cross-References

- `docs/guides/vite-extension-setup.md` — general Vite configuration
- `docs/patterns/building-with-vue.md` — Vue architecture patterns
- `docs/patterns/content-script-vue.md` — content script patterns
