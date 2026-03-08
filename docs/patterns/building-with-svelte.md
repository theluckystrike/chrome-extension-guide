---
layout: default
title: "Chrome Extension Building With Svelte — Best Practices"
description: "Build Chrome extensions with Svelte framework."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/building-with-svelte/"
---

# Building Chrome Extensions with Svelte

## Overview

Svelte compiles components into efficient imperative code with no virtual DOM overhead, making it ideal for Chrome extensions where bundle size and startup speed matter. Popup windows, side panels, and content script overlays all benefit from Svelte's small footprint. This guide covers eight practical patterns for building production extensions with Svelte 5 and Vite.

---

## Pattern 1: Project Structure for Svelte 5 + Chrome Extension

Organize your project so each extension context has its own entry point while sharing components and utilities:

```
my-extension/
├── src/
│   ├── background/
│   │   └── index.ts              # Service worker (no Svelte)
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── App.svelte
│   ├── options/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── App.svelte
│   ├── content/
│   │   ├── index.ts
│   │   └── Overlay.svelte
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── App.svelte
│   ├── lib/
│   │   ├── stores/               # Shared Svelte stores
│   │   ├── components/           # Shared UI components
│   │   └── utils/
│   └── types/
├── public/
│   ├── manifest.json
│   └── icons/
├── vite.config.ts
└── package.json
```

Each UI context follows the same mount pattern:

```ts
// popup/main.ts
import { mount } from "svelte";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
```

```html
<!-- popup/index.html -->
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

---

## Pattern 2: Vite Configuration for Multiple Entry Points

Configure Vite to build popup, options, side panel, background, and content script in a single pass:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
        sidepanel: resolve(__dirname, "src/sidepanel/index.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
      },
      output: {
        entryFileNames: "[name]/index.js",
        chunkFileNames: "shared/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: {
    alias: {
      $lib: resolve(__dirname, "src/lib"),
    },
  },
});
```

Content scripts cannot use ES modules in MV3. Build them separately as IIFE:

```ts
// vite.config.content.ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  plugins: [svelte({ compilerOptions: { css: "external" } })],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/content/index.ts"),
      formats: ["iife"],
      name: "ContentScript",
      fileName: () => "content/index.js",
    },
    rollupOptions: {
      output: { assetFileNames: "content/style.css" },
    },
  },
});
```

```json
{
  "scripts": {
    "build": "vite build && vite build --config vite.config.content.ts"
  }
}
```

---

## Pattern 3: Svelte Stores Backed by chrome.storage

Create writable stores that automatically sync with `chrome.storage` so UI reacts to changes from any context:

```ts
// lib/stores/storage.ts
import { writable, type Writable } from "svelte/store";

export function chromeStorageStore<T>(
  key: string,
  defaultValue: T,
  area: "local" | "sync" = "local"
): Writable<T> & { ready: Promise<void> } {
  const store = writable<T>(defaultValue);
  const storage = area === "sync" ? chrome.storage.sync : chrome.storage.local;
  let skipNextSync = false;

  const ready = storage.get(key).then((result) => {
    if (result[key] !== undefined) {
      store.set(result[key] as T);
    }
  });

  // Push store changes to chrome.storage
  store.subscribe((value) => {
    if (skipNextSync) {
      skipNextSync = false;
      return;
    }
    storage.set({ [key]: value });
  });

  // Pull chrome.storage changes into the store (from other contexts)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== area || !changes[key]) return;
    skipNextSync = true;
    store.set(changes[key].newValue as T);
  });

  return { ...store, ready };
}
```

```svelte
<!-- popup/App.svelte -->
<script lang="ts">
  import { chromeStorageStore } from "$lib/stores/storage";

  const settings = chromeStorageStore("settings", {
    theme: "light" as "light" | "dark",
    fontSize: 14,
    enabled: true,
  });

  function toggleTheme() {
    settings.update((s) => ({
      ...s,
      theme: s.theme === "light" ? "dark" : "light",
    }));
  }
</script>

<div class="popup" class:dark={$settings.theme === "dark"}>
  <label>
    <input type="checkbox" bind:checked={$settings.enabled} />
    Enabled
  </label>
  <button onclick={toggleTheme}>
    Switch to {$settings.theme === "light" ? "dark" : "light"} mode
  </button>
  <label>
    Font Size: {$settings.fontSize}px
    <input type="range" min="10" max="24" bind:value={$settings.fontSize} />
  </label>
</div>
```

The `skipNextSync` flag prevents a write loop: without it, a storage change would update the store, which would write back to storage.

---

## Pattern 4: Shared Components Across Popup, Options, and Side Panel

Build reusable components using Svelte 5's `$props()` and `$bindable()` runes:

```svelte
<!-- lib/components/Toggle.svelte -->
<script lang="ts">
  interface Props {
    checked: boolean;
    label: string;
    disabled?: boolean;
    onchange?: (checked: boolean) => void;
  }
  let { checked = $bindable(), label, disabled = false, onchange }: Props = $props();

  function handleToggle() {
    if (disabled) return;
    checked = !checked;
    onchange?.(checked);
  }
</script>

<button
  class="toggle" class:active={checked} class:disabled
  role="switch" aria-checked={checked} onclick={handleToggle}
>
  <span class="track"><span class="thumb"></span></span>
  <span>{label}</span>
</button>

<style>
  .toggle { display: flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; }
  .track { width: 36px; height: 20px; background: #ccc; border-radius: 10px; position: relative; transition: background 0.2s; }
  .active .track { background: #4285f4; }
  .thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: transform 0.2s; }
  .active .thumb { transform: translateX(16px); }
  .disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

Use the same component in every UI context:

```svelte
<!-- popup/App.svelte -->
<script lang="ts">
  import Toggle from "$lib/components/Toggle.svelte";
  import { chromeStorageStore } from "$lib/stores/storage";
  const enabled = chromeStorageStore("enabled", true);
</script>

<Toggle label="Enable extension" bind:checked={$enabled} />
```

```svelte
<!-- options/App.svelte -->
<script lang="ts">
  import Toggle from "$lib/components/Toggle.svelte";
  import { chromeStorageStore } from "$lib/stores/storage";
  const notifications = chromeStorageStore("notifications", true);
  const autoSync = chromeStorageStore("autoSync", false);
</script>

<Toggle label="Push notifications" bind:checked={$notifications} />
<Toggle label="Auto-sync data" bind:checked={$autoSync} />
```

---

## Pattern 5: Content Script Svelte Mounting with Shadow DOM

Mount Svelte inside a Shadow DOM to isolate from host page styles:

```ts
// content/index.ts
import { mount } from "svelte";
import Overlay from "./Overlay.svelte";

function mountApp(): void {
  const host = document.createElement("div");
  host.id = "my-extension-root";
  host.style.cssText = "all: initial; position: fixed; z-index: 2147483647; top: 0; right: 0;";

  const shadow = host.attachShadow({ mode: "closed" });

  // Load compiled CSS into the shadow root
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("content/style.css");
  shadow.appendChild(link);

  const target = document.createElement("div");
  shadow.appendChild(target);
  document.body.appendChild(host);

  mount(Overlay, { target });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountApp);
} else {
  mountApp();
}
```

```svelte
<!-- content/Overlay.svelte -->
<script lang="ts">
  let visible = $state(false);
  let message = $state("");

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SHOW_OVERLAY") {
      message = msg.text ?? "";
      visible = true;
    }
    if (msg.type === "HIDE_OVERLAY") visible = false;
  });
</script>

{#if visible}
  <div class="overlay" role="dialog">
    <p>{message}</p>
    <button onclick={() => { visible = false; }}>Dismiss</button>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; top: 16px; right: 16px;
    background: white; border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
    padding: 16px 20px; max-width: 320px;
    font-family: system-ui, sans-serif; font-size: 14px;
  }
</style>
```

Svelte's default `css: "injected"` mode appends styles to `document.head`, which does not pierce the shadow boundary. Use `css: "external"` in your content script build config and load the CSS file into the shadow root explicitly.

---

## Pattern 6: Reactive Messaging with Svelte Stores + chrome.runtime.onMessage

Bridge Chrome's message-passing API with Svelte's reactivity:

```ts
// lib/stores/messaging.ts
import { writable, readonly, type Readable } from "svelte/store";

export function messageStore<T>(
  messageType: string,
  initialValue: T,
  transform: (payload: Record<string, unknown>) => T = (p) => p as T
): Readable<T> {
  const store = writable<T>(initialValue);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === messageType) {
      store.set(transform(message.payload ?? {}));
    }
  });

  return readonly(store);
}

export function messageBridge<T extends Record<string, unknown>>(
  sendType: string,
  receiveType: string,
  initialValue: T
) {
  const internal = writable<T>(initialValue);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === receiveType && message.payload) {
      internal.update((current) => ({ ...current, ...message.payload }));
    }
  });

  function send(value: Partial<T>) {
    internal.update((current) => ({ ...current, ...value }));
    chrome.runtime.sendMessage({ type: sendType, payload: value }).catch(() => {});
  }

  return { store: readonly(internal), send };
}
```

```svelte
<!-- popup/Dashboard.svelte -->
<script lang="ts">
  import { messageStore, messageBridge } from "$lib/stores/messaging";

  const tabCount = messageStore<number>("TAB_COUNT_UPDATE", 0, (p) => p.count as number);
  const filters = messageBridge(
    "FILTER_UPDATE", "FILTER_SYNC",
    { query: "", active: false }
  );

  let query = $state("");
</script>

<p>Open tabs: {$tabCount}</p>
<input type="text" bind:value={query} placeholder="Filter tabs..." />
<button onclick={() => filters.send({ query, active: true })}>Apply</button>
```

---

## Pattern 7: Svelte Transitions and Animations in Popup UI

Svelte's built-in transitions create polished UIs with zero additional dependencies:

```svelte
<!-- popup/NotificationList.svelte -->
<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";

  interface Notification { id: string; text: string; type: "info" | "success" | "error"; }
  let notifications = $state<Notification[]>([]);

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "NOTIFICATION") return;
    const n: Notification = { id: crypto.randomUUID(), text: msg.text, type: msg.level ?? "info" };
    notifications = [n, ...notifications].slice(0, 20);
    setTimeout(() => dismiss(n.id), 5000);
  });

  function dismiss(id: string) {
    notifications = notifications.filter((n) => n.id !== id);
  }
</script>

<div class="list">
  {#each notifications as n (n.id)}
    <div
      class="item {n.type}"
      animate:flip={{ duration: 200, easing: quintOut }}
      in:fly={{ x: 300, duration: 300, easing: quintOut }}
      out:fade={{ duration: 150 }}
    >
      <span>{n.text}</span>
      <button onclick={() => dismiss(n.id)}>&times;</button>
    </div>
  {/each}
</div>

<style>
  .list { display: flex; flex-direction: column; gap: 6px; padding: 8px; max-height: 300px; overflow-y: auto; }
  .item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 6px; font-size: 13px; }
  .info    { background: #e8f0fe; color: #1967d2; }
  .success { background: #e6f4ea; color: #1e7e34; }
  .error   { background: #fce8e6; color: #c5221f; }
  .item button { background: none; border: none; font-size: 18px; cursor: pointer; opacity: 0.6; }
  .item button:hover { opacity: 1; }
</style>
```

For popup UIs with tight rendering budgets, prefer `fade` and `slide` over `fly` with large offsets. Avoid `elasticOut` easing on lists with many items.

---

## Pattern 8: Production Build, Tree-Shaking, and Bundle Optimization

Optimize your Svelte extension for the Chrome Web Store:

```ts
// vite.config.ts — production overrides
export default defineConfig(({ mode }) => ({
  plugins: [
    svelte({
      compilerOptions: {
        dev: mode !== "production",
      },
    }),
  ],
  build: {
    target: "chrome120",
    sourcemap: mode !== "production",
    minify: mode === "production" ? "terser" : false,
    terserOptions: mode === "production" ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.debug"],
      },
    } : undefined,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("svelte")) return "svelte-runtime";
          if (id.includes("src/lib/components")) return "shared-components";
          if (id.includes("src/lib/stores")) return "shared-stores";
        },
      },
    },
  },
}));
```

### Typical Bundle Sizes

| Context | Unoptimized | Optimized |
|---------|------------|-----------|
| Popup (Svelte + components) | ~28 KB | ~9 KB |
| Options page | ~32 KB | ~11 KB |
| Content script (overlay) | ~12 KB | ~4 KB |
| Background service worker | ~3 KB | ~2 KB |
| Shared Svelte runtime chunk | ~8 KB | ~3 KB |

Key optimizations: target `chrome120` to skip legacy polyfills, strip source maps for CWS submission, use `drop_console` in terser, and split the Svelte runtime into a shared chunk so popup and options share it via the browser cache.

---

## Summary

| Pattern | What It Solves |
|---------|---------------|
| Project structure | Organized multi-context extension with shared code |
| Vite multi-entry config | Single build pipeline for popup, options, content, background |
| chrome.storage stores | Reactive UI that syncs with storage across all contexts |
| Shared components | Consistent UI without duplicating code per context |
| Shadow DOM mounting | Content script isolation from host page styles |
| Message-reactive stores | Automatic UI updates from Chrome message passing |
| Transitions and animations | Polished popup UX with minimal bundle cost |
| Production optimization | Small bundles, fast loads, CWS-ready builds |

Svelte's compile-time approach makes it uniquely suited for Chrome extensions. The framework overhead is measured in kilobytes, startup is near-instant even in popup windows, and the reactive model maps naturally to Chrome's storage and messaging APIs. Start with the project structure in Pattern 1, wire up storage-backed stores from Pattern 3, and iterate from there.
