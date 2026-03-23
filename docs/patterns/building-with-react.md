---
layout: default
title: "Chrome Extension Building With React — Best Practices"
description: "Build Chrome extensions with React."
canonical_url: "https://bestchromeextensions.com/patterns/building-with-react/"
---

# Building Chrome Extensions with React

## Overview {#overview}

React is a natural fit for Chrome extension UIs — popups, options pages, side panels, and even content script overlays are all component trees that benefit from declarative rendering. But extension projects have unique build requirements: multiple HTML entry points, separate service worker bundles, Shadow DOM mounting, and Chrome API integration that doesn't fit standard React patterns. This guide covers practical patterns for structuring, building, and optimizing a React-based Chrome extension.

---

## Extension + React Architecture {#extension-react-architecture}

```
┌───────────────────────────────────────────────────┐
│                  Chrome Extension                  │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │  Popup   │  │ Options  │  │  Side Panel   │   │
│  │  (React) │  │  (React) │  │   (React)     │   │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘   │
│       │              │               │             │
│       └──────┬───────┘───────────────┘             │
│              │                                     │
│     ┌────────▼────────┐    ┌────────────────┐     │
│     │ Shared Components│    │  Background SW │     │
│     │ Hooks / Context  │    │  (no React)    │     │
│     └─────────────────┘    └────────────────┘     │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  Content Script (React in Shadow DOM)       │   │
│  └────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

Each UI surface is a separate React root with its own entry point. They share components, hooks, and context providers through a common `src/shared/` directory. The background service worker has no DOM and does not use React.

---

## Pattern 1: Project Structure {#pattern-1-project-structure}

Organize code by entry point, with shared code extracted to a common directory:

```
my-extension/
├── public/
│   ├── manifest.json
│   ├── popup.html
│   ├── options.html
│   ├── sidepanel.html
│   └── icons/
├── src/
│   ├── background/
│   │   └── index.ts              # Service worker (no React)
│   ├── popup/
│   │   ├── index.tsx             # React root for popup
│   │   ├── App.tsx
│   │   └── components/
│   ├── options/
│   │   ├── index.tsx             # React root for options
│   │   ├── App.tsx
│   │   └── components/
│   ├── sidepanel/
│   │   ├── index.tsx             # React root for side panel
│   │   └── App.tsx
│   ├── content/
│   │   ├── index.tsx             # Content script mount
│   │   └── Overlay.tsx
│   └── shared/
│       ├── components/           # Shared UI components
│       │   ├── Button.tsx
│       │   ├── StatusBadge.tsx
│       │   └── SettingsForm.tsx
│       ├── hooks/                # Chrome API hooks
│       │   ├── useStorage.ts
│       │   ├── useTab.ts
│       │   └── useMessage.ts
│       ├── context/
│       │   └── StorageContext.tsx
│       └── lib/
│           └── chrome-api.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

Each entry point HTML file loads its own script bundle:

```html
<!-- public/popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Popup</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="../src/popup/index.tsx"></script>
</body>
</html>
```

```tsx
// src/popup/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { StorageProvider } from "../shared/context/StorageContext";
import { App } from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <StorageProvider>
      <App />
    </StorageProvider>
  </React.StrictMode>
);
```

---

## Pattern 2: Vite Configuration for Multiple Entry Points {#pattern-2-vite-configuration-for-multiple-entry-points}

Vite handles multiple entry points cleanly. Configure it to build each UI surface and the background worker as separate bundles:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyDirFirst: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "public/popup.html"),
        options: resolve(__dirname, "public/options.html"),
        sidepanel: resolve(__dirname, "public/sidepanel.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.tsx"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
});
```

The background service worker needs special handling — it must be a single file without dynamic imports (service workers don't support them in MV3):

```ts
// vite.config.ts — additional config for background
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "public/popup.html"),
        options: resolve(__dirname, "public/options.html"),
        sidepanel: resolve(__dirname, "public/sidepanel.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.tsx"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Background and content must be flat files
          if (chunkInfo.name === "background") return "background.js";
          if (chunkInfo.name === "content") return "content.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
```

The manifest references the built output:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html"
  },
  "options_page": "options.html",
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

---

## Pattern 3: Shared Components Across Surfaces {#pattern-3-shared-components-across-surfaces}

Extract reusable components into `src/shared/` so popup, options, and side panel stay consistent:

{% raw %}
```tsx
// src/shared/components/StatusBadge.tsx

interface StatusBadgeProps {
  status: "active" | "paused" | "error";
  label?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: "#e6f4ea", text: "#1e8e3e" },
  paused: { bg: "#fef7e0", text: "#f9ab00" },
  error: { bg: "#fce8e6", text: "#d93025" },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: style.text,
        }}
      />
      {label ?? status}
    </span>
  );
}
```
{% endraw %}

```tsx
// src/shared/components/SettingsForm.tsx

import { useStorage } from "../hooks/useStorage";

interface Settings {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  syncEnabled: boolean;
}

const DEFAULTS: Settings = {
  theme: "system",
  notifications: true,
  syncEnabled: false,
};

export function SettingsForm() {
  const [settings, setSettings, { loading }] = useStorage<Settings>(
    "settings",
    DEFAULTS
  );

  if (loading) return <div>Loading...</div>;

  const update = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <label>
        Theme
        <select
          value={settings.theme}
          onChange={(e) =>
            update("theme", e.target.value as Settings["theme"])
          }
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.notifications}
          onChange={(e) => update("notifications", e.target.checked)}
        />
        Enable notifications
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.syncEnabled}
          onChange={(e) => update("syncEnabled", e.target.checked)}
        />
        Sync across devices
      </label>
    </form>
  );
}
```

Use the same component in multiple surfaces:

{% raw %}
```tsx
// src/popup/App.tsx
import { SettingsForm } from "@shared/components/SettingsForm";
import { StatusBadge } from "@shared/components/StatusBadge";

export function App() {
  return (
    <div style={{ width: 320, padding: 16 }}>
      <header>
        <h2>My Extension</h2>
        <StatusBadge status="active" />
      </header>
      <SettingsForm />
    </div>
  );
}
```
{% endraw %}

{% raw %}
```tsx
// src/options/App.tsx — same components, different layout
import { SettingsForm } from "@shared/components/SettingsForm";

export function App() {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
      <h1>Extension Settings</h1>
      <SettingsForm />
    </div>
  );
}
```
{% endraw %}

---

## Pattern 4: React Context for chrome.storage Integration {#pattern-4-react-context-for-chromestorage-integration}

Create a context provider that syncs React state with `chrome.storage` and listens for external changes (from other extension pages or the background):

{% raw %}
```tsx
// src/shared/context/StorageContext.tsx

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface StorageContextValue {
  data: Record<string, unknown>;
  loading: boolean;
  get: <T>(key: string) => T | undefined;
  set: (key: string, value: unknown) => Promise<void>;
  setMultiple: (items: Record<string, unknown>) => Promise<void>;
}

const StorageContext = createContext<StorageContextValue | null>(null);

interface StorageProviderProps {
  children: ReactNode;
  area?: "local" | "sync";
  watchKeys?: string[];
}

export function StorageProvider({
  children,
  area = "local",
  watchKeys,
}: StorageProviderProps) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  const storage = chrome.storage[area];

  // Initial load
  useEffect(() => {
    const keys = watchKeys ?? null; // null = get everything
    storage.get(keys).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  // Listen for changes from other contexts
  useEffect(() => {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== area) return;

      setData((prev) => {
        const next = { ...prev };
        for (const [key, change] of Object.entries(changes)) {
          if (watchKeys && !watchKeys.includes(key)) continue;
          if (change.newValue === undefined) {
            delete next[key];
          } else {
            next[key] = change.newValue;
          }
        }
        return next;
      });
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [area, watchKeys]);

  const get = useCallback(
    <T,>(key: string): T | undefined => data[key] as T | undefined,
    [data]
  );

  const set = useCallback(
    async (key: string, value: unknown) => {
      await storage.set({ [key]: value });
      // Optimistic update — onChanged listener will confirm
      setData((prev) => ({ ...prev, [key]: value }));
    },
    [storage]
  );

  const setMultiple = useCallback(
    async (items: Record<string, unknown>) => {
      await storage.set(items);
      setData((prev) => ({ ...prev, ...items }));
    },
    [storage]
  );

  return (
    <StorageContext.Provider value={{ data, loading, get, set, setMultiple }}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorageContext(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) {
    throw new Error("useStorageContext must be used within StorageProvider");
  }
  return ctx;
}
```
{% endraw %}

---

## Pattern 5: Custom Hooks for Chrome APIs {#pattern-5-custom-hooks-for-chrome-apis}

Wrap Chrome APIs in hooks that handle lifecycle, cleanup, and error states:

```ts
// src/shared/hooks/useStorage.ts

import { useState, useEffect, useCallback } from "react";

type UseStorageResult<T> = [
  value: T,
  setValue: (val: T) => Promise<void>,
  meta: { loading: boolean; error: Error | null },
];

export function useStorage<T>(
  key: string,
  defaultValue: T,
  area: "local" | "sync" = "local"
): UseStorageResult<T> {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const storage = chrome.storage[area];

  useEffect(() => {
    storage
      .get(key)
      .then((result) => {
        if (key in result) setValue(result[key] as T);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [key]);

  // Sync with external changes
  useEffect(() => {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === area && key in changes) {
        setValue(changes[key].newValue as T);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [key, area]);

  const set = useCallback(
    async (newValue: T) => {
      try {
        await storage.set({ [key]: newValue });
        setValue(newValue);
      } catch (err) {
        setError(err as Error);
      }
    },
    [key, storage]
  );

  return [value, set, { loading, error }];
}
```

```ts
// src/shared/hooks/useTab.ts

import { useState, useEffect } from "react";

export function useCurrentTab(): chrome.tabs.Tab | null {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);

  useEffect(() => {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([activeTab]) => setTab(activeTab ?? null));
  }, []);

  return tab;
}

export function useTabUrl(): string | undefined {
  const tab = useCurrentTab();
  return tab?.url;
}
```

```ts
// src/shared/hooks/useMessage.ts

import { useEffect, useCallback } from "react";

type MessageHandler<T = unknown> = (
  message: T,
  sender: chrome.runtime.MessageSender
) => void | Promise<unknown>;

export function useMessageListener<T = unknown>(
  handler: MessageHandler<T>
): void {
  useEffect(() => {
    const listener = (
      message: T,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => {
      const result = handler(message, sender);
      if (result instanceof Promise) {
        result.then(sendResponse);
        return true; // Keep channel open for async response
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [handler]);
}

export function useSendMessage() {
  return useCallback(async <T = unknown>(message: unknown): Promise<T> => {
    return chrome.runtime.sendMessage(message);
  }, []);
}
```

---

## Pattern 6: Content Script React Mounting with Shadow DOM {#pattern-6-content-script-react-mounting-with-shadow-dom}

Content scripts need isolation from the host page's styles. Mount React inside a Shadow DOM container:

```tsx
// src/content/index.tsx

import React from "react";
import { createRoot } from "react-dom/client";
import { Overlay } from "./Overlay";

function mountExtensionUI(): void {
  // Create a host element on the page
  const host = document.createElement("div");
  host.id = "my-extension-root";
  // Prevent the host page from styling our container
  host.style.cssText = "all: initial; position: fixed; z-index: 2147483647;";
  document.body.appendChild(host);

  // Attach Shadow DOM for style isolation
  const shadow = host.attachShadow({ mode: "closed" });

  // Inject extension styles into the shadow root
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      color: #333;
    }
    .overlay-container {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 320px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      padding: 16px;
    }
  `;
  shadow.appendChild(style);

  // Create a mount point inside the shadow
  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);

  // Render React into the shadow DOM
  const root = createRoot(mountPoint);
  root.render(
    <React.StrictMode>
      <Overlay
        onClose={() => {
          root.unmount();
          host.remove();
        }}
      />
    </React.StrictMode>
  );
}

// Listen for activation message from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TOGGLE_OVERLAY") {
    const existing = document.getElementById("my-extension-root");
    if (existing) {
      existing.remove();
    } else {
      mountExtensionUI();
    }
  }
});
```

{% raw %}
```tsx
// src/content/Overlay.tsx

import { useState, useEffect } from "react";

interface OverlayProps {
  onClose: () => void;
}

export function Overlay({ onClose }: OverlayProps) {
  const [pageTitle, setPageTitle] = useState(document.title);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setPageTitle(document.title);
    });
    const titleEl = document.querySelector("title");
    if (titleEl) observer.observe(titleEl, { childList: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="overlay-container">
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>My Extension</strong>
        <button onClick={onClose} aria-label="Close">
          &times;
        </button>
      </header>
      <p>Current page: {pageTitle}</p>
      <button
        onClick={async () => {
          await chrome.runtime.sendMessage({
            type: "SAVE_PAGE",
            url: location.href,
            title: pageTitle,
          });
        }}
      >
        Save this page
      </button>
    </div>
  );
}
```
{% endraw %}

---

## Pattern 7: Hot Module Reload During Development {#pattern-7-hot-module-reload-during-development}

Vite's HMR works out of the box for popup and options pages when served via the dev server. Content scripts and service workers need extra handling:

```ts
// vite.config.ts — dev server configuration
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    hmr: {
      // HMR works for popup/options when loaded as extension pages
      host: "localhost",
    },
  },
  build: {
    // Production build config (same as Pattern 2)
    sourcemap: mode === "development",
    minify: mode === "production",
  },
}));
```

For development, point your HTML files at the dev server:

```html
<!-- public/popup.html (dev version) -->
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body>
  <div id="root"></div>
  <script type="module" src="http://localhost:5173/src/popup/index.tsx"></script>
</body>
</html>
```

Create a dev script that watches and rebuilds content scripts (which can't use HMR since they run in web pages):

```ts
// scripts/dev.ts
import { build } from "vite";
import { resolve } from "path";

// Watch content script and background for changes
async function watchNonHmrEntries() {
  await build({
    configFile: resolve(__dirname, "../vite.config.ts"),
    build: {
      watch: {}, // Enable watch mode
      rollupOptions: {
        input: {
          background: resolve(__dirname, "../src/background/index.ts"),
          content: resolve(__dirname, "../src/content/index.tsx"),
        },
        output: {
          dir: resolve(__dirname, "../dist"),
          entryFileNames: "[name].js",
        },
      },
    },
  });
}

watchNonHmrEntries();
```

Add a content script auto-reload mechanism for development:

```ts
// src/content/dev-reload.ts — only included in dev builds

if (import.meta.env.DEV) {
  // Re-inject content script when the background sends a reload signal
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "__DEV_RELOAD__") {
      location.reload();
    }
  });
}
```

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"tsx scripts/dev.ts\"",
    "build": "vite build",
    "preview": "vite build && web-ext run"
  }
}
```

---

## Pattern 8: Production Build Optimization {#pattern-8-production-build-optimization}

Optimize the production bundle for Chrome Web Store distribution:

```ts
// vite.config.ts — production optimizations
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "public/popup.html"),
        options: resolve(__dirname, "public/options.html"),
        sidepanel: resolve(__dirname, "public/sidepanel.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.tsx"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (["background", "content"].includes(chunk.name)) {
            return "[name].js";
          }
          return "assets/[name]-[hash].js";
        },
        // Share React between popup, options, and sidepanel
        manualChunks(id) {
          if (id.includes("node_modules/react")) {
            return "vendor-react";
          }
          if (id.includes("src/shared/")) {
            return "shared";
          }
        },
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
  },
});
```

Key optimizations:

- **Shared vendor chunk**: React and ReactDOM are loaded once and shared across popup, options, and side panel via a `vendor-react` chunk
- **Shared code chunk**: Components in `src/shared/` are bundled once
- **Flat bundles for SW and content**: Background and content scripts must be self-contained since service workers don't support dynamic imports and content scripts need predictable file names
- **No source maps in production**: Reduces package size for Chrome Web Store submission
- **Console stripping**: Removes debug logging from the shipped bundle

Add a build verification script:

```ts
// scripts/verify-build.ts
import { readdirSync, statSync } from "fs";
import { resolve } from "path";

const distDir = resolve(__dirname, "../dist");

function getDirectorySize(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    total += entry.isDirectory()
      ? getDirectorySize(path)
      : statSync(path).size;
  }
  return total;
}

const totalBytes = getDirectorySize(distDir);
const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
const MAX_SIZE_MB = 10; // Chrome Web Store limit is generous, but keep it lean

console.log(`Build size: ${totalMB} MB`);
if (parseFloat(totalMB) > MAX_SIZE_MB) {
  console.error(`Build exceeds ${MAX_SIZE_MB} MB target!`);
  process.exit(1);
}

// Verify required files exist
const required = ["background.js", "content.js", "popup.html", "manifest.json"];
for (const file of required) {
  try {
    statSync(resolve(distDir, file));
  } catch {
    console.error(`Missing required file: ${file}`);
    process.exit(1);
  }
}

console.log("Build verification passed.");
```

---

## Summary {#summary}

| Pattern | Problem It Solves |
|---------|------------------|
| Project structure | Organize multi-entry extension with shared React code |
| Vite multi-entry config | Build popup, options, side panel, content, and background separately |
| Shared components | Consistent UI across popup, options, and side panel |
| Storage context | Sync React state with chrome.storage, react to external changes |
| Chrome API hooks | Clean, reusable hooks for storage, tabs, and messaging |
| Shadow DOM mounting | Style-isolated React UI in content scripts |
| HMR development | Fast feedback loop for popup/options, watch mode for content/background |
| Production optimization | Code splitting, vendor chunks, and build verification |

React and Chrome extensions work well together once you set up the build pipeline correctly. The critical insight is that each UI surface is its own React application — they share code through imports, not through a single React tree. Keep your background service worker React-free, mount content script UIs in Shadow DOM, and let Vite handle the multi-entry bundling.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
