---
layout: default
title: "Chrome Extension Performance Profiling. Best Practices"
description: "Profile and optimize extension performance."
canonical_url: "https://bestchromeextensions.com/patterns/performance-profiling/"
---

# Performance Profiling for Chrome Extensions

Overview {#overview}

Extensions run in shared browser processes. A slow extension degrades the entire browsing experience. This guide covers how to measure, profile, and optimize extension performance across service workers, content scripts, popups, and storage operations.

---

Where Performance Matters {#where-performance-matters}

| Context | Impact | Bottleneck |
|---------|--------|-----------|
| Service worker startup | Delays event handling | Cold start time, import size |
| Content scripts | Slows page load | DOM manipulation, injection timing |
| Popup rendering | Feels sluggish to open | Initial render, data fetching |
| Storage operations | Blocks UI updates | Read/write latency, serialization |
| Message passing | Delays responses | Payload size, handler complexity |

---

Pattern 1: Measuring Service Worker Startup {#pattern-1-measuring-service-worker-startup}

Service workers are terminated after ~30 seconds of inactivity and must restart quickly:

```ts
// background.ts. Measure cold start time
const startTime = performance.now();

chrome.runtime.onInstalled.addListener(() => {
  const elapsed = performance.now() - startTime;
  console.log(`[perf] Service worker initialized in ${elapsed.toFixed(1)}ms`);
});

// Track event handler registration time
// All event listeners MUST be registered synchronously at top level
chrome.action.onClicked.addListener(async (tab) => {
  const handlerStart = performance.now();
  // ... handler logic
  console.log(`[perf] action.onClicked: ${(performance.now() - handlerStart).toFixed(1)}ms`);
});
```

Tracking Startup Over Time {#tracking-startup-over-time}

```ts
// background.ts
async function recordStartupMetric() {
  const startupTime = performance.now();
  const { startupHistory = [] } = await chrome.storage.local.get("startupHistory");

  startupHistory.push({
    timestamp: Date.now(),
    duration: startupTime,
  });

  // Keep last 50 entries
  if (startupHistory.length > 50) startupHistory.shift();

  await chrome.storage.local.set({ startupHistory });
}

recordStartupMetric();
```

---

Pattern 2: Content Script Performance {#pattern-2-content-script-performance}

Content scripts run on every matched page. Heavy scripts cause visible jank:

```ts
// content.ts. Performance-aware DOM manipulation

// Bad: Synchronous DOM thrashing
function badApproach() {
  document.querySelectorAll("p").forEach((p) => {
    const height = p.offsetHeight; // forces layout
    p.style.marginBottom = `${height * 0.5}px`; // triggers layout again
  });
}

// Good: Batch reads and writes
function goodApproach() {
  const paragraphs = document.querySelectorAll("p");

  // Read phase
  const heights = Array.from(paragraphs).map((p) => p.offsetHeight);

  // Write phase (single reflow)
  paragraphs.forEach((p, i) => {
    p.style.marginBottom = `${heights[i] * 0.5}px`;
  });
}

// Better: Use requestAnimationFrame for non-critical updates
function bestApproach() {
  requestAnimationFrame(() => {
    const paragraphs = document.querySelectorAll("p");
    const heights = Array.from(paragraphs).map((p) => p.offsetHeight);

    requestAnimationFrame(() => {
      paragraphs.forEach((p, i) => {
        p.style.marginBottom = `${heights[i] * 0.5}px`;
      });
    });
  });
}
```

Debouncing DOM Observers {#debouncing-dom-observers}

```ts
// content.ts. Efficient MutationObserver
function observeDOM(callback: () => void) {
  let timeout: ReturnType<typeof setTimeout>;

  const observer = new MutationObserver(() => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, 100); // debounce at 100ms
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    // Only observe what you need. avoid attributes/characterData if unused
  });

  return observer;
}
```

---

Pattern 3: Popup Load Time Optimization {#pattern-3-popup-load-time-optimization}

Popups feel slow because users expect instant response after clicking the icon:

```ts
// popup.ts. Progressive rendering

// 1. Show cached data immediately
async function renderPopup() {
  const root = document.getElementById("app")!;

  // Phase 1: Show skeleton/cached state (< 16ms)
  const { cachedData } = await chrome.storage.session.get("cachedData");
  if (cachedData) {
    renderData(root, cachedData);
  } else {
    renderSkeleton(root);
  }

  // Phase 2: Fetch fresh data in background
  const freshData = await fetchFreshData();
  renderData(root, freshData);
  await chrome.storage.session.set({ cachedData: freshData });
}

function renderSkeleton(root: HTMLElement) {
  root.innerHTML = `
    <div class="skeleton-line" style="width: 60%"></div>
    <div class="skeleton-line" style="width: 80%"></div>
    <div class="skeleton-line" style="width: 40%"></div>
  `;
}
```

Measuring Popup Paint Time {#measuring-popup-paint-time}

```ts
// popup.ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`[perf] ${entry.name}: ${entry.startTime.toFixed(1)}ms`);
  }
});

observer.observe({ type: "paint", buffered: true });

// Also measure custom marks
performance.mark("data-fetch-start");
const data = await fetchData();
performance.mark("data-fetch-end");
performance.measure("data-fetch", "data-fetch-start", "data-fetch-end");

const measures = performance.getEntriesByType("measure");
measures.forEach((m) => console.log(`[perf] ${m.name}: ${m.duration.toFixed(1)}ms`));
```

---

Pattern 4: Storage Operation Profiling {#pattern-4-storage-operation-profiling}

Storage is async I/O. batch operations whenever possible:

```ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  count: 0,
  items: [] as string[],
  settings: { theme: "light" as "light" | "dark", fontSize: 14 },
});

const storage = createStorage({ schema, area: "local" });

// Bad: Multiple sequential reads
async function slowRead() {
  const count = await storage.get("count");       // 1 IPC call
  const items = await storage.get("items");        // 1 IPC call
  const settings = await storage.get("settings");  // 1 IPC call
  // Total: 3 round trips
}

// Good: Batch read
async function fastRead() {
  const data = await storage.getMany(["count", "items", "settings"]);
  // Total: 1 round trip
}

// Profiling wrapper
async function profileStorage<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const elapsed = performance.now() - start;
  console.log(`[storage] ${label}: ${elapsed.toFixed(1)}ms`);

  if (elapsed > 50) {
    console.warn(`[storage] ${label} exceeded 50ms threshold`);
  }

  return result;
}

// Usage
const data = await profileStorage("load-settings", () =>
  storage.getMany(["count", "items", "settings"])
);
```

---

Pattern 5: Message Passing Performance {#pattern-5-message-passing-performance}

Large payloads and frequent messages create overhead:

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  getPageData: {
    request: { tabId: number };
    response: { title: string; links: string[] };
  };
};

const msg = createMessenger<Messages>();

// Bad: Sending full page data on every navigation
// Good: Send only what changed, or send summaries

// Measure message round-trip time
async function profileMessage() {
  const start = performance.now();
  const response = await msg.send("getPageData", { tabId: 1 });
  const elapsed = performance.now() - start;
  console.log(`[msg] getPageData round-trip: ${elapsed.toFixed(1)}ms`);
  console.log(`[msg] payload size: ${JSON.stringify(response).length} bytes`);
  return response;
}
```

Payload Size Guidelines {#payload-size-guidelines}

| Payload Size | Performance | Recommendation |
|-------------|-------------|----------------|
| < 1 KB | Negligible overhead | Fine for any frequency |
| 1–100 KB | Measurable latency | Batch or debounce |
| 100 KB–1 MB | Noticeable delay | Paginate or stream |
| > 1 MB | Avoid | Use storage as intermediary |

---

Pattern 6: DevTools Performance Panel {#pattern-6-devtools-performance-panel}

Use Chrome DevTools to profile your extension:

Service Worker Profiling {#service-worker-profiling}
1. Open `chrome://extensions`
2. Click "Inspect views: service worker" on your extension
3. Go to Performance tab
4. Click Record, trigger events, stop recording
5. Analyze the flame chart for long tasks

Content Script Profiling {#content-script-profiling}
1. Open the page your content script runs on
2. Open DevTools > Performance tab
3. Record a page load
4. Filter by your extension's script in the flame chart
5. Look for layout thrashing, long script evaluation

Key Metrics to Watch {#key-metrics-to-watch}

```ts
// Collect Web Vitals from content scripts
function collectMetrics() {
  // Long tasks (> 50ms)
  const longTaskObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
        console.warn(`[perf] Long task: ${entry.duration.toFixed(1)}ms`);
      }
    }
  });
  longTaskObserver.observe({ type: "longtask", buffered: true });

  // Resource timing for injected resources
  const resourceObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes(chrome.runtime.id)) {
        console.log(`[perf] Extension resource: ${entry.name}. ${entry.duration.toFixed(1)}ms`);
      }
    }
  });
  resourceObserver.observe({ type: "resource", buffered: true });
}
```

---

Pattern 7: Bundle Size Analysis {#pattern-7-bundle-size-analysis}

Large bundles slow down service worker startup and content script injection:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    visualizer({
      filename: "dist/bundle-analysis.html",
      gzipSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Analyze chunk sizes
        manualChunks: undefined, // let Vite decide for extensions
      },
    },
  },
});
```

Size Budgets {#size-budgets}

| Component | Target | Warning |
|-----------|--------|---------|
| Service worker | < 100 KB | > 200 KB |
| Content script | < 50 KB | > 100 KB |
| Popup | < 150 KB (total) | > 300 KB |
| Individual message payload | < 1 KB | > 100 KB |

---

Pattern 8: Lazy Loading in Extensions {#pattern-8-lazy-loading-in-extensions}

Not every module needs to load at startup:

```ts
// background.ts
// Register all listeners synchronously (required)
chrome.contextMenus.onClicked.addListener(async (info) => {
  // Lazy-load heavy modules only when needed
  const { processSelection } = await import("./text-processor");
  await processSelection(info.selectionText ?? "");
});

chrome.action.onClicked.addListener(async (tab) => {
  const { handleActionClick } = await import("./action-handler");
  await handleActionClick(tab);
});
```

```ts
// content.ts. Lazy inject additional functionality
document.addEventListener("mouseup", async () => {
  const selection = window.getSelection()?.toString().trim();
  if (selection && selection.length > 0) {
    // Only load tooltip module when user selects text
    const { showTooltip } = await import("./tooltip");
    showTooltip(selection);
  }
}, { once: false });
```

---

Automated Performance Testing {#automated-performance-testing}

```ts
// tests/performance.test.ts
import { test, expect } from "@playwright/test";

test("popup opens within 200ms", async ({ page, context }) => {
  const start = Date.now();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForSelector("#app:not(.loading)");
  const loadTime = Date.now() - start;

  expect(loadTime).toBeLessThan(200);
});

test("content script does not create long tasks", async ({ page }) => {
  const longTasks: number[] = [];

  await page.evaluate(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as any).__longTasks = (window as any).__longTasks || [];
        (window as any).__longTasks.push(entry.duration);
      }
    });
    observer.observe({ type: "longtask" });
  });

  await page.goto("https://example.com");
  await page.waitForTimeout(2000);

  const tasks = await page.evaluate(() => (window as any).__longTasks || []);
  const extensionTasks = tasks.filter((d: number) => d > 50);

  expect(extensionTasks.length).toBe(0);
});
```

---

Summary {#summary}

| Area | Key Optimization |
|------|-----------------|
| Service worker | Minimize bundle size, register listeners synchronously |
| Content scripts | Batch DOM reads/writes, debounce observers |
| Popup | Progressive rendering, cache last state |
| Storage | Batch operations with `getMany`/`setMany` |
| Messages | Keep payloads small, avoid high-frequency sends |
| Bundle | Set size budgets, use dynamic imports |
| Testing | Automate performance assertions in CI |

Profile first, optimize second. Use `performance.now()`, DevTools Performance panel, and automated tests to find real bottlenecks before applying optimizations.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
