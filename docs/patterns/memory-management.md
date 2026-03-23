---
layout: default
title: "Chrome Extension Memory Management. Best Practices"
description: "Implement memory management to prevent memory leaks."
canonical_url: "https://bestchromeextensions.com/patterns/memory-management/"
---

# Memory Management in Chrome Extensions

Overview {#overview}

Chrome extensions share memory with the browser. A leaking content script consumes memory for every tab it runs on. A bloated service worker delays event handling. This guide covers practical patterns for identifying and fixing memory leaks, managing object lifecycles, and keeping your extension's footprint small.

---

Memory Budgets {#memory-budgets}

| Context | Typical Allocation | Warning Threshold |
|---------|-------------------|-------------------|
| Service worker | 20–50 MB | > 100 MB |
| Content script (per tab) | 5–20 MB | > 50 MB |
| Popup | 10–30 MB | > 50 MB |
| Options page | 10–50 MB | > 100 MB |

Chrome may terminate service workers or content scripts that consume excessive memory.

---

Pattern 1: Avoiding Leaks in Event Listeners {#pattern-1-avoiding-leaks-in-event-listeners}

The most common memory leak in extensions. registering listeners without cleanup:

```ts
// content.ts

// Bad: Adds a new listener every time the content script re-executes
document.addEventListener("scroll", handleScroll);

// Good: Track and clean up listeners
const listeners: Array<{ target: EventTarget; event: string; handler: EventListener }> = [];

function addTrackedListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
) {
  target.addEventListener(event, handler, options);
  listeners.push({ target, event, handler });
}

function removeAllListeners() {
  for (const { target, event, handler } of listeners) {
    target.removeEventListener(event, handler);
  }
  listeners.length = 0;
}

// Register
addTrackedListener(document, "scroll", handleScroll);
addTrackedListener(window, "resize", handleResize);

// Clean up when extension context is invalidated
chrome.runtime.onConnect.addListener(() => {});
try {
  chrome.runtime.id; // throws if context invalidated
} catch {
  removeAllListeners();
}
```

AbortController Pattern {#abortcontroller-pattern}

A cleaner approach using `AbortController`:

```ts
// content.ts
const controller = new AbortController();
const { signal } = controller;

document.addEventListener("scroll", handleScroll, { signal });
document.addEventListener("click", handleClick, { signal });
window.addEventListener("resize", handleResize, { signal });

// One call removes all listeners
function cleanup() {
  controller.abort();
}

// Clean up when navigating away or extension is unloaded
window.addEventListener("pagehide", cleanup);
```

---

Pattern 2: MutationObserver Lifecycle {#pattern-2-mutationobserver-lifecycle}

MutationObservers are a frequent leak source in content scripts:

```ts
// content.ts
class ManagedObserver {
  private observer: MutationObserver;
  private connected = false;

  constructor(callback: MutationCallback) {
    this.observer = new MutationObserver(callback);
  }

  observe(target: Node, options: MutationObserverInit) {
    this.observer.observe(target, options);
    this.connected = true;
  }

  disconnect() {
    if (this.connected) {
      this.observer.disconnect();
      this.connected = false;
    }
  }

  // Take records and disconnect. useful for one-time observations
  takeAndDisconnect(): MutationRecord[] {
    const records = this.observer.takeRecords();
    this.disconnect();
    return records;
  }
}

// Usage
const observer = new ManagedObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === "childList") {
      processNewNodes(mutation.addedNodes);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Disconnect when done
window.addEventListener("pagehide", () => observer.disconnect());
```

---

Pattern 3: WeakRef and FinalizationRegistry {#pattern-3-weakref-and-finalizationregistry}

Use weak references for caches that shouldn't prevent garbage collection:

```ts
// Weak cache for DOM element metadata
const elementCache = new Map<string, WeakRef<HTMLElement>>();
const registry = new FinalizationRegistry<string>((id) => {
  elementCache.delete(id);
});

function cacheElement(id: string, element: HTMLElement) {
  const ref = new WeakRef(element);
  elementCache.set(id, ref);
  registry.register(element, id);
}

function getCachedElement(id: string): HTMLElement | undefined {
  const ref = elementCache.get(id);
  if (!ref) return undefined;

  const element = ref.deref();
  if (!element) {
    // Element was garbage collected
    elementCache.delete(id);
    return undefined;
  }

  return element;
}
```

WeakMap for Extension Data on DOM Elements {#weakmap-for-extension-data-on-dom-elements}

```ts
// content.ts. Associate data with DOM elements without leaking

// Bad: Strong reference map leaks when elements are removed from DOM
const dataMap = new Map<HTMLElement, { processed: boolean }>();

// Good: WeakMap allows GC when element is removed
const elementData = new WeakMap<HTMLElement, { processed: boolean }>();

function processElement(el: HTMLElement) {
  if (elementData.get(el)?.processed) return;

  // Process the element
  el.classList.add("ext-processed");
  elementData.set(el, { processed: true });
}
```

---

Pattern 4: Bounded Caches {#pattern-4-bounded-caches}

Prevent unbounded growth in memory caches:

```ts
// LRU cache with size limit
class LRUCache<K, V> {
  private cache = new Map<K, V>();

  constructor(private maxSize: number) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest entry
      const oldest = this.cache.keys().next().value!;
      this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

// Usage in service worker. cache API responses
const responseCache = new LRUCache<string, unknown>(100);

async function fetchWithCache(url: string): Promise<unknown> {
  const cached = responseCache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  const data = await response.json();
  responseCache.set(url, data);
  return data;
}
```

---

Pattern 5: Service Worker Memory Strategy {#pattern-5-service-worker-memory-strategy}

Service workers terminate when idle, releasing all memory. Work with this lifecycle instead of against it:

```ts
// background.ts

// Bad: Large in-memory data structure that rebuilds on every wake
let massiveIndex: Map<string, string[]> | null = null;

async function getIndex() {
  if (!massiveIndex) {
    // This rebuilds every time the SW wakes up. expensive
    massiveIndex = await buildIndex();
  }
  return massiveIndex;
}

// Good: Store processed data in chrome.storage.session
async function getIndexFromStorage(): Promise<Map<string, string[]>> {
  const { searchIndex } = await chrome.storage.session.get("searchIndex");
  if (searchIndex) {
    return new Map(Object.entries(searchIndex));
  }

  const index = await buildIndex();
  // session storage persists across SW restarts but clears on browser restart
  await chrome.storage.session.set({
    searchIndex: Object.fromEntries(index),
  });
  return index;
}
```

Monitoring Service Worker Memory {#monitoring-service-worker-memory}

```ts
// background.ts
async function logMemoryUsage() {
  if ("memory" in performance) {
    const memory = (performance as any).memory;
    console.log({
      usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`,
      totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB`,
      jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB`,
    });
  }
}

// Log memory after heavy operations
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "memory-check") {
    await logMemoryUsage();
  }
});

chrome.alarms.create("memory-check", { periodInMinutes: 5 });
```

---

Pattern 6: Content Script Cleanup on Navigation {#pattern-6-content-script-cleanup-on-navigation}

Content scripts persist during SPA navigations. Clean up when the URL changes:

```ts
// content.ts
class ContentScriptManager {
  private cleanupFns: Array<() => void> = [];
  private currentUrl = location.href;

  onCleanup(fn: () => void) {
    this.cleanupFns.push(fn);
  }

  private cleanup() {
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns = [];
  }

  watchNavigation() {
    // SPA navigation detection
    const observer = new MutationObserver(() => {
      if (location.href !== this.currentUrl) {
        this.cleanup();
        this.currentUrl = location.href;
        this.init();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    this.onCleanup(() => observer.disconnect());
  }

  init() {
    // Set up your content script features
    const handler = (e: Event) => { /* ... */ };
    document.addEventListener("click", handler);
    this.onCleanup(() => document.removeEventListener("click", handler));

    const injectedEl = document.createElement("div");
    injectedEl.id = "my-ext-widget";
    document.body.appendChild(injectedEl);
    this.onCleanup(() => injectedEl.remove());
  }
}

const manager = new ContentScriptManager();
manager.watchNavigation();
manager.init();
```

---

Pattern 7: Blob and Object URL Cleanup {#pattern-7-blob-and-object-url-cleanup}

Blobs and object URLs are a hidden leak source:

```ts
// Managed object URL creation
const activeURLs = new Set<string>();

function createManagedObjectURL(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  activeURLs.add(url);
  return url;
}

function revokeManagedObjectURL(url: string) {
  URL.revokeObjectURL(url);
  activeURLs.delete(url);
}

function revokeAllObjectURLs() {
  for (const url of activeURLs) {
    URL.revokeObjectURL(url);
  }
  activeURLs.clear();
}

// Usage in popup. display a generated image
async function showGeneratedImage() {
  const blob = await generateImage();
  const url = createManagedObjectURL(blob);

  const img = document.createElement("img");
  img.src = url;
  img.onload = () => revokeManagedObjectURL(url); // free after render
  document.body.appendChild(img);
}

// Clean up on popup close
window.addEventListener("unload", revokeAllObjectURLs);
```

---

Pattern 8: Profiling Memory in DevTools {#pattern-8-profiling-memory-in-devtools}

Heap Snapshots {#heap-snapshots}

1. Open your extension's DevTools (service worker or popup)
2. Go to Memory tab
3. Select Heap snapshot and take one
4. Perform actions that might leak
5. Take another snapshot
6. Use Comparison view to see objects allocated between snapshots

Allocation Timeline {#allocation-timeline}

1. Memory tab > Allocation instrumentation on timeline
2. Start recording
3. Perform suspected leaking actions
4. Stop recording
5. Blue bars = objects still in memory. Investigate large clusters.

Finding Detached DOM Nodes {#finding-detached-dom-nodes}

In the heap snapshot, search for `Detached` in the filter. Detached DOM trees are nodes removed from the document but still referenced in JavaScript. a common content script leak.

---

Memory Leak Checklist {#memory-leak-checklist}

- [ ] All `addEventListener` calls have corresponding `removeEventListener`
- [ ] All `MutationObserver` instances are disconnected when no longer needed
- [ ] No unbounded arrays, maps, or sets growing over time
- [ ] DOM references use `WeakMap`/`WeakRef` when appropriate
- [ ] Object URLs are revoked after use
- [ ] `setInterval` timers are cleared on cleanup
- [ ] Content scripts clean up on SPA navigation
- [ ] Service worker avoids large persistent in-memory structures

---

Summary {#summary}

| Pattern | Problem It Prevents |
|---------|-------------------|
| AbortController cleanup | Leaked event listeners |
| Managed MutationObserver | Orphaned DOM observers |
| WeakRef/WeakMap | Strong references to removed DOM nodes |
| LRU cache | Unbounded memory growth |
| session storage for SW | Expensive recomputation on wake |
| ContentScriptManager | Stale UI/listeners on SPA navigation |
| Managed object URLs | Leaked Blob memory |
| Heap snapshots | Undetected leaks in production |

Memory management in extensions is about discipline: every allocation should have a corresponding deallocation, and every observer should have a disconnect path. Profile regularly with DevTools heap snapshots to catch leaks before users do.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
