---
layout: default
title: "Chrome Extension Memory Management — Developer Guide"
description: "Learn Chrome extension memory management with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/memory-management/"
---
# Memory Management in Chrome Extensions

Memory management is critical for Chrome extension performance and user experience. Extensions run in multiple contexts, each with different memory characteristics and lifecycle behaviors. Understanding these differences is essential for building efficient, stable extensions that don't consume excessive system resources or cause browser slowdowns.

## Memory by Context

Different extension contexts have fundamentally different memory behaviors:

### Service Worker
The service worker is terminated after approximately 30 seconds of inactivity. This means ALL in-memory state is lost when the worker terminates. To persist data across terminations, use the `@theluckystrike/webext-storage` library which automatically syncs state to Chrome's storage APIs:

```javascript
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage();
await storage.set('userPreferences', { theme: 'dark', language: 'en' });
const prefs = await storage.get('userPreferences');
// Data persists across service worker restarts
```

### Content Scripts
Content scripts live with the page and can leak memory if not properly managed. They share the page's JavaScript heap but have their own DOM access. Always clean up listeners and observers:

```javascript
// Content script cleanup pattern
let observer = null;

function init() {
  observer = new MutationObserver(handleMutations);
  observer.observe(document.body, { childList: true, subtree: true });
}

function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// Cleanup when navigating away
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'CLEANUP') cleanup();
});
```

### Popup/Options Pages
These have fresh state on every open and are freed when closed. Don't rely on in-memory state persisting between opens:

```javascript
// BAD: Relying on global state
let cachedData = null; // Lost on every popup close

// GOOD: Load from storage on open
async function init() {
  const { data } = await chrome.storage.local.get('data');
  render(data);
}
```

### Side Panel
The side panel is persistent while open but can leak like content scripts if not properly managed:

```javascript
// Side panel cleanup
sidePanel.addEventListener('visibilitychange', () => {
  if (!sidePanel.visible) {
    cleanupResources();
  }
});
```

## Common Memory Leaks

Understanding and preventing memory leaks is essential for stable extensions:

### Forgotten Event Listeners
Use the `AbortController` signal pattern for automatic cleanup:

```javascript
const controller = new AbortController();

// Set up listeners with signal
element.addEventListener('click', handler, { signal: controller.signal });

// Single call to remove ALL listeners
controller.abort();
```

### Detached DOM Nodes
Null references after removing elements can cause memory leaks:

```javascript
// BAD: Holding reference to removed element
const element = document.getElementById('modal');
element.remove();
// element still references the removed DOM node

// GOOD: Clear references
const element = document.getElementById('modal');
element.remove();
element = null;
```

### Closures Holding Large Data
Closures can unintentionally hold references to large objects:

```javascript
// BAD: Closure captures large array
const largeData = new Array(1000000).fill('data');
function getValue() {
  return largeData[0]; // Keeps largeData in memory
}

// GOOD: Extract only needed values
const largeData = new Array(1000000).fill('data');
function getValue() {
  const needed = largeData[0]; // Copy the value
  largeData.length = 0; // Release the array
  return needed;
}
```

### MutationObserver Not Disconnected
Always disconnect observers when done:

```javascript
const observer = new MutationObserver(callback);
observer.observe(target, { attributes: true });

// When done - ALWAYS disconnect
observer.disconnect();
```

### setInterval Without clearInterval
Content scripts with intervals continue running unless cleared:

```javascript
// BAD: Interval continues after navigation
setInterval(() => checkStatus(), 5000);

// GOOD: Store interval ID and clear on cleanup
const intervalId = setInterval(() => checkStatus(), 5000);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CLEANUP') {
    clearInterval(intervalId);
  }
});
```

## Memory-Efficient Patterns

### WeakMap/WeakRef for DOM-Associated Caches
These allow garbage collection when the key element is removed:

```javascript
// Cache that auto-cleans when element is removed
const elementCache = new WeakMap();

function getCachedData(element) {
  if (!elementCache.has(element)) {
    elementCache.set(element, computeExpensiveData(element));
  }
  return elementCache.get(element);
}
```

### Streaming Large Data
Use `ReadableStream` instead of loading everything into memory:

```javascript
async function processLargeData(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  
  const stream = new ReadableStream({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processChunk(value); // Process in chunks
        controller.enqueue(value);
      }
      controller.close();
    }
  });
  
  return stream;
}
```

### Lazy Initialization with Dynamic import()
Load code only when needed:

```javascript
// Only load heavy library when user clicks button
document.getElementById('analyze').addEventListener('click', async () => {
  const { HeavyLibrary } = await import('./heavy-library.js');
  const analyzer = new HeavyLibrary();
  analyzer.run();
});
```

### In-Memory Cache with Storage Sync
Use `@theluckystrike/webext-storage` `watch()` method:

```javascript
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage();
const cache = new Map();

// Watch for storage changes and update cache
storage.watch('items', (newVal, oldVal, area) => {
  cache.clear();
  if (newVal) {
    newVal.forEach(item => cache.set(item.id, item));
  }
});
```

## Monitoring Memory

### Extension Memory Page
`chrome://extensions` shows per-extension memory usage - useful for quick checks:

### DevTools Memory Tab
Use heap snapshots, allocation timeline, and comparison features:

```javascript
// Take heap snapshot programmatically
chrome.debugger.sendCommand({ tabId: tabId }, 'HeapProfiler.takeHeapSnapshot', 
  (params) => {
    console.log('Snapshot taken');
  }
);
```

### Performance API
Check memory usage in extension pages:

```javascript
function logMemory() {
  if (performance.memory) {
    console.log(`Heap used: ${performance.memory.usedJSHeapSize / 1024 / 1024} MB`);
    console.log(`Heap total: ${performance.memory.totalJSHeapSize / 1024 / 1024} MB`);
    console.log(`Heap limit: ${performance.memory.jsHeapSizeLimit / 1024 / 1024} MB`);
  }
}
```

## Storage vs Memory Trade-offs

| Factor | In-Memory | Chrome Storage |
|--------|-----------|----------------|
| Speed | Instant | ~1-5ms async |
| Persistence | Lost on SW terminate | Persists forever |
| Sharing | Single context | All contexts |
| Capacity | Unlimited* | Limited (~5MB) |
| Type | Synchronous | Asynchronous |

*Limited by available system memory

## Best Practices

1. **Persist Critical State**: Service workers will terminate - always persist important data:
   ```javascript
   // Always save state before termination
   chrome.runtime.onSuspend.addListener(async () => {
     await chrome.storage.local.set({ state: currentState });
   });
   ```

2. **Remove Listeners with AbortController**: Use the signal pattern for easy cleanup:
   ```javascript
   const controller = new AbortController();
   element.addEventListener('input', handler, { signal: controller.signal });
   // Clean up with single call
   controller.abort();
   ```

3. **Disconnect MutationObservers**: Always clean up observers:
   ```javascript
   observer.disconnect(); // Call when done
   observer = null;
   ```

4. **Use WeakMap/WeakRef for Caches**: Let GC handle cleanup automatically

5. **Profile with DevTools Memory Tab**: Regular profiling catches leaks early

## Memory by Context {#memory-by-context}
- **Service Worker**: terminated after ~30s idle, ALL in-memory state lost. Persist with `@theluckystrike/webext-storage`
- **Content Scripts**: live with the page, can leak. Must clean up listeners/observers
- **Popup/Options**: fresh state on every open, freed on close
- **Side Panel**: persistent while open, can leak like content scripts

## Common Memory Leaks {#common-memory-leaks}
- Forgotten event listeners — use `AbortController` signal pattern for cleanup
- Detached DOM nodes — null references after removing elements
- Closures holding large data — extract needed values, release large arrays
- MutationObserver not disconnected — always call `observer.disconnect()`
- `setInterval` without `clearInterval` in content scripts

## Memory-Efficient Patterns {#memory-efficient-patterns}
- `WeakMap`/`WeakRef` for DOM-associated caches (auto-GC when element removed)
- Streaming large data with `ReadableStream` instead of loading all into memory
- Lazy initialization with dynamic `import()`
- In-memory cache synced via `@theluckystrike/webext-storage` `watch()`

## Monitoring Memory {#monitoring-memory}
- `chrome://extensions` — per-extension memory usage
- DevTools Memory tab — heap snapshots, allocation timeline, compare snapshots
- `performance.memory.usedJSHeapSize` in extension pages

## Storage vs Memory Trade-offs Table {#storage-vs-memory-trade-offs-table}
- Speed: instant vs ~1-5ms async
- Persistence: lost on SW terminate vs persists forever
- Sharing: single context vs all contexts

## Best Practices {#best-practices}
- Persist critical state — SW will terminate
- Remove listeners with AbortController
- Disconnect MutationObservers
- WeakMap/WeakRef for caches
- Profile with DevTools Memory tab

## Common Mistakes {#common-mistakes}
- Large globals in content scripts, never disconnecting observers, ignoring SW termination, holding detached DOM refs

## Related Articles {#related-articles}

- [Memory Management Patterns](../patterns/memory-management.md)
- [Performance Guide](../guides/performance.md)


- **Large globals in content scripts**: Avoid global state in content scripts
- **Never disconnecting observers**: Always clean up on page unload
- **Ignoring SW termination**: Don't rely on in-memory state persisting
- **Holding detached DOM refs**: Always null out references to removed elements

## Practical Example: Complete Memory-Safe Content Script

```javascript
class MemorySafeContentScript {
  constructor() {
    this.controller = new AbortController();
    this.observers = [];
    this.cache = new WeakMap();
  }

  init() {
    this.setupMutationObserver();
    this.setupMessageListeners();
    this.setupEventListeners();
  }

  setupMutationObserver() {
    const observer = new MutationObserver(this.handleMutations.bind(this));
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true 
    });
    this.observers.push(observer);
  }

  setupEventListeners() {
    const element = document.getElementById('tracked');
    element?.addEventListener('click', this.handleClick.bind(this), {
      signal: this.controller.signal
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((msg, _, respond) => {
      if (msg.type === 'CLEANUP') {
        this.cleanup();
        respond({ success: true });
      }
      return true;
    });
  }

  cleanup() {
    // Disconnect all observers
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];
    
    // Abort all event listeners
    this.controller.abort();
    
    // Clear caches
    this.cache = new WeakMap();
  }
}

// Initialize and clean up on navigation
const script = new MemorySafeContentScript();
script.init();

let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    script.cleanup();
    script.init();
  }
}).observe(document.body, { subtree: true, childList: true });
```

This comprehensive approach ensures your extension manages memory efficiently across all contexts while maintaining reliable functionality for users.

## Related Articles

- [Memory Management Patterns](../patterns/memory-management.md)
- [Performance Guide](../guides/performance.md)
