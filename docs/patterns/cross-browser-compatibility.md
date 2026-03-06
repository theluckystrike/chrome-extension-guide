# Cross-Browser Compatibility

## Overview

Chrome extensions can run on multiple Chromium-based browsers (Edge, Brave, Opera, Vivaldi) and, with care, on Firefox. This guide covers practical patterns for writing extensions that work across browsers without maintaining separate codebases.

---

## The Browser Extension Landscape

| Browser | Engine | API Namespace | Manifest | Store |
|---------|--------|--------------|----------|-------|
| Chrome | Chromium | `chrome.*` | MV3 | Chrome Web Store |
| Edge | Chromium | `chrome.*` / `browser.*` | MV3 | Edge Add-ons |
| Brave | Chromium | `chrome.*` | MV3 | Chrome Web Store |
| Opera | Chromium | `chrome.*` / `opr.*` | MV3 | Opera Addons |
| Firefox | Gecko | `browser.*` | MV2/MV3 | Firefox Add-ons |
| Safari | WebKit | `browser.*` | MV3 (via Xcode) | App Store |

---

## Pattern 1: Unified API Namespace

Firefox uses `browser.*` with native Promises. Chrome uses `chrome.*` with callbacks (and increasingly Promises). Create a unified accessor:

```ts
// browser-api.ts
export const api: typeof chrome =
  typeof browser !== "undefined"
    ? (browser as unknown as typeof chrome)
    : chrome;
```

Usage:

```ts
import { api } from "./browser-api";

const tabs = await api.tabs.query({ active: true, currentWindow: true });
```

For projects using `@anthropic-ai/webext-*` packages, the libraries already abstract over `chrome.*` — but direct API calls still need this wrapper.

### Type-Safe Approach with Declaration Merging

```ts
// types/browser.d.ts
declare global {
  const browser: typeof chrome | undefined;
}
export {};
```

---

## Pattern 2: Feature Detection over User-Agent Sniffing

Never rely on `navigator.userAgent` to determine browser capabilities. Instead, detect features directly:

```ts
// Feature detection helpers
export const supports = {
  sidePanel: "sidePanel" in chrome,
  offscreen: "offscreen" in chrome,
  declarativeNetRequest: "declarativeNetRequest" in chrome,
  userScripts: "userScripts" in chrome,
  tabGroups: "tabGroups" in chrome,

  // Firefox-specific
  contextualIdentities:
    typeof browser !== "undefined" && "contextualIdentities" in browser,
} as const;

// Usage
if (supports.sidePanel) {
  chrome.sidePanel.setOptions({ path: "sidepanel.html" });
}
```

---

## Pattern 3: Manifest Differences

Chrome and Firefox have small but critical manifest differences. Use a build script to generate per-browser manifests from a shared base:

```ts
// build/manifest.ts
interface ManifestBase {
  name: string;
  version: string;
  description: string;
  permissions: string[];
  content_scripts?: chrome.runtime.ManifestV3["content_scripts"];
}

const base: ManifestBase = {
  name: "My Extension",
  version: "1.0.0",
  description: "A cross-browser extension",
  permissions: ["storage", "tabs"],
};

function buildChromeManifest(base: ManifestBase) {
  return {
    manifest_version: 3,
    ...base,
    background: {
      service_worker: "background.js",
      type: "module" as const,
    },
  };
}

function buildFirefoxManifest(base: ManifestBase) {
  return {
    manifest_version: 3,
    ...base,
    background: {
      scripts: ["background.js"],
    },
    browser_specific_settings: {
      gecko: {
        id: "my-extension@example.com",
        strict_min_version: "109.0",
      },
    },
  };
}
```

### Key Manifest Differences

| Feature | Chrome MV3 | Firefox MV3 |
|---------|-----------|-------------|
| Background | `service_worker` (single file) | `scripts` (array) |
| Extension ID | Assigned by store | Set via `browser_specific_settings` |
| CSP | `content_security_policy.extension_pages` | Same, but different defaults |
| Host permissions | `host_permissions` key | Same (MV3) |
| `web_accessible_resources` | `matches` required | `matches` required |

---

## Pattern 4: Polyfilling Missing APIs

Some APIs exist only in certain browsers. Create graceful fallbacks:

```ts
// polyfills/action.ts
// Chrome renamed browserAction to action in MV3
export function getAction() {
  return chrome.action ?? (chrome as any).browserAction;
}

// polyfills/scripting.ts
// Fallback for browsers without chrome.scripting
export async function executeScript(
  tabId: number,
  func: () => void
): Promise<void> {
  if (chrome.scripting) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func,
    });
  } else {
    // Legacy fallback
    await chrome.tabs.executeScript(tabId, {
      code: `(${func.toString()})()`,
    });
  }
}
```

---

## Pattern 5: Storage API Compatibility

The storage API is mostly consistent, but session storage is Chrome-only:

```ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  settings: { theme: "light" as "light" | "dark", fontSize: 14 },
  cache: { lastFetch: 0 },
});

// Use "local" for cross-browser compatibility
// "session" is Chrome 102+ only
const storage = createStorage({
  schema,
  area: "local", // works everywhere
});

// If you need session-like behavior on Firefox, use a memory cache
// with storage as a persistence fallback
const sessionCache = new Map<string, unknown>();

export async function getSessionValue<T>(key: string, fallback: T): Promise<T> {
  if (sessionCache.has(key)) {
    return sessionCache.get(key) as T;
  }
  // Fall back to local storage
  const stored = await chrome.storage.local.get(key);
  return (stored[key] as T) ?? fallback;
}
```

---

## Pattern 6: Conditional Imports with Build Tools

Use your bundler to swap modules per target browser:

```ts
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const browser = process.env.TARGET_BROWSER ?? "chrome";

  return {
    define: {
      __BROWSER__: JSON.stringify(browser),
    },
    resolve: {
      alias: {
        "~platform": `./src/platform/${browser}`,
      },
    },
  };
});
```

```ts
// src/platform/chrome/notifications.ts
export function notify(title: string, message: string) {
  chrome.notifications.create({ type: "basic", iconUrl: "icon.png", title, message });
}

// src/platform/firefox/notifications.ts
export function notify(title: string, message: string) {
  browser.notifications.create({ type: "basic", iconUrl: "icon.png", title, message });
}

// src/popup.ts — resolved at build time
import { notify } from "~platform/notifications";
notify("Hello", "Cross-browser notification");
```

---

## Pattern 7: Testing Across Browsers

Use Playwright or Puppeteer to test your extension in multiple browsers:

```ts
// tests/cross-browser.test.ts
import { test, chromium } from "@playwright/test";
import path from "path";

const extensionPath = path.resolve(__dirname, "../dist/chrome");

test("extension loads in Chromium", async () => {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  // Wait for service worker
  let [worker] = context.serviceWorkers();
  if (!worker) {
    worker = await context.waitForEvent("serviceworker");
  }

  // Test extension functionality
  const page = await context.newPage();
  await page.goto("https://example.com");
  // ...assertions
  await context.close();
});
```

---

## Common Pitfalls

### 1. Promise vs Callback Styles
Chrome historically used callbacks. Firefox always used Promises. Modern Chrome (MV3) supports Promises for most APIs, but some older APIs still need callbacks:

```ts
// Safe wrapper for APIs that might not support promises
export function promisify<T>(
  fn: (callback: (result: T) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}
```

### 2. Extension URL Schemes
```ts
// Chrome: chrome-extension://<id>/page.html
// Firefox: moz-extension://<uuid>/page.html
// Edge: extension://<id>/page.html
// Use chrome.runtime.getURL() — works in all browsers
const url = chrome.runtime.getURL("options.html");
```

### 3. Context Menu Differences
```ts
// Chrome supports "action" context; Firefox does not
const contexts: chrome.contextMenus.ContextType[] = ["page", "selection"];
if (supports.sidePanel) {
  // Only Chrome has this context type
  contexts.push("action" as chrome.contextMenus.ContextType);
}

chrome.contextMenus.create({
  id: "my-menu",
  title: "My Action",
  contexts,
});
```

---

## Build Script: Multi-Browser Package

```json
{
  "scripts": {
    "build:chrome": "TARGET_BROWSER=chrome vite build",
    "build:firefox": "TARGET_BROWSER=firefox vite build",
    "build:edge": "TARGET_BROWSER=edge vite build",
    "build:all": "npm run build:chrome && npm run build:firefox && npm run build:edge",
    "package:chrome": "cd dist/chrome && zip -r ../../releases/chrome.zip .",
    "package:firefox": "cd dist/firefox && web-ext build -a ../../releases/",
    "package:all": "npm run build:all && npm run package:chrome && npm run package:firefox"
  }
}
```

---

## Summary

| Strategy | When to Use |
|----------|------------|
| Unified `api` namespace | Every cross-browser project |
| Feature detection | Before using any non-universal API |
| Build-time manifest generation | Shipping to 2+ browser stores |
| Platform-specific modules | Complex divergence in behavior |
| Polyfills | Supporting older browser versions |
| Automated cross-browser tests | CI/CD for multi-browser releases |

Cross-browser compatibility is primarily about **detection over assumption** and **abstraction over duplication**. Start with Chrome, feature-detect gracefully, and use build tooling to handle the manifest and API differences that can't be abstracted away.
