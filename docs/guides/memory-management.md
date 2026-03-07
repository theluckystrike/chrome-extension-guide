# Memory Management in Chrome Extensions

Memory management in Chrome extensions is critical because extensions run across multiple contexts with different lifecycles. Unlike regular web apps, extensions must handle service worker termination, content script isolation, and cross-context state sharing. Poor memory management leads to degraded performance, extension crashes, and negative user reviews.

## Memory by Context

Each extension component runs in a different context with unique memory characteristics. Understanding these differences is the foundation of building a memory-efficient extension.

### Service Worker

The background service worker is the control center of your extension but has the most volatile memory model. Chrome terminates service workers after approximately 30 seconds of inactivity to conserve resources. When this happens, ALL in-memory state is lost with no warning. This is perhaps the most common source of bugs in extension development.

State that must persist across terminations should use `@theluckystrike/webext-storage` or chrome.storage APIs. Never rely on global variables or closures to hold user data, cache, or application state. The service worker can terminate at any moment, and when it wakes up, it starts with a fresh execution context.

```javascript
// Bad: state lost on service worker termination
let userData = null;
let cache = new Map();

// Good: persist critical state
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage(
  defineSchema({
    userData: 'object',
    cache: 'object'
  }),
  'local'
);

// Load on startup
const { userData, cache } = await storage.get(['userData', 'cache']);
```

### Content Scripts

Content scripts live as long as the web page they are injected into. They can persist across page navigations if configured with `match_about_blank: true` or `run_at: document_idle`. The danger here is memory leaks: if your content script holds references to DOM nodes that get removed during navigation, those references prevent garbage collection.

Content scripts share the DOM with the page but run in an isolated JavaScript world. They cannot access page JavaScript variables, but they CAN cause memory leaks that affect page performance, which reflects poorly on your extension.

Always clean up event listeners, disconnect MutationObservers, and clear intervals when your content script no longer needs them. Chrome does not automatically clean up your script when users navigate away.

```javascript
// Good: cleanup pattern for content scripts
class MemorySafeScanner {
  constructor() {
    this.observer = null;
    this.listeners = [];
    this.cachedNodes = new WeakMap();
  }

  start() {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.observer.observe(document.body, { childList: true, subtree: true });
    
    document.addEventListener('click', this.handleClick);
    window.addEventListener('scroll', this.handleScroll);
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    document.removeEventListener('click', this.handleClick);
    window.removeEventListener('scroll', this.handleScroll);
    this.listeners = [];
  }
}
```

### Popup and Options Pages

Popup and options pages have the simplest memory model. They are created fresh each time they open and destroyed when closed. While you don't need to worry about long-term leaks in these contexts, you should still avoid loading unnecessary data on every open.

Use chrome.storage to cache data that persists between opens. Implement lazy loading for heavy resources. The popup should open quickly; users notice delays here more than in other contexts.

### Side Panel

The side panel behaves like a hybrid between popup and content script. It persists while open, shares the tab's lifecycle, but runs in an extension context with full Chrome API access. Like content scripts, it can leak memory if you don't clean up listeners and observers when the panel closes or the user navigates away.

## Common Memory Leaks

Memory leaks in extensions typically stem from a handful of recurring patterns. Understanding these causes helps you recognize and prevent them in your code.

### Forgotten Event Listeners

Event listeners create strong references to their handler functions. If you add a listener to a long-lived object like document or window and never remove it, the handler and any variables it references cannot be garbage collected. This is especially problematic in content scripts that persist across navigations.

The modern solution is the AbortController signal pattern. When you pass an AbortSignal to an event listener, removing the listener becomes automatic when you abort the controller.

```javascript
// Using AbortController for automatic cleanup
const controller = new AbortController();

document.addEventListener('click', handleClick, { signal: controller.signal });
window.addEventListener('keydown', handleKeydown, { signal: controller.signal });

// Later: clean up all listeners at once
controller.abort();
```

### Detached DOM Nodes

Content scripts often store references to DOM elements in maps or arrays. When the user navigates to a new page, those elements get removed from the DOM, but your references keep them alive in memory. Over time, as users browse, this accumulates to significant memory usage.

Store only what you need. If you must cache DOM references, use a WeakMap so references automatically clear when the DOM node is garbage collected.

### Closures Holding Large Data

JavaScript closures capture variables from their enclosing scope. A closure that references a large object, even indirectly, prevents that entire object from being garbage collected. Be cautious about closures in event handlers, callbacks, and promise chains.

```javascript
// Problem: closure captures large data
function createHandler(largeData) {
  return function(event) {
    console.log(event.type); // largeData still referenced
  };
}

// Better: extract only what you need
function createHandler(neededValue) {
  return function(event) {
    console.log(event.type, neededValue);
  };
}
```

### MutationObserver Not Disconnected

MutationObservers keep their callback references alive as long as they are connected. Forgetting to call disconnect() means the observer, its callback, and any variables captured by the callback remain in memory indefinitely, even after the user leaves the page.

### setInterval Without clearInterval

In content scripts, setInterval callbacks continue running even after page navigation if not cleared. This is a silent killer because each navigation adds another interval callback, and Chrome keeps all content script state alive until the extension explicitly cleans up.

## Memory-Efficient Patterns

Beyond fixing leaks, you can actively reduce memory usage through specific patterns designed for resource-constrained environments.

### WeakMap and WeakRef for DOM-Associated Caches

WeakMap and WeakRef allow garbage collection of their keys and values when those keys are no longer referenced elsewhere. This makes them perfect for caching data associated with DOM elements that may be removed.

```javascript
// Cache DOM calculations without preventing GC
const computationCache = new WeakMap();

function getComputation(element) {
  if (!computationCache.has(element)) {
    computationCache.set(element, expensiveCalculation(element));
  }
  return computationCache.get(element);
}

// When element is removed from DOM and no other references exist,
// the cached value becomes eligible for garbage collection
```

### Streaming Large Data

Instead of loading entire files or API responses into memory, use ReadableStream to process data in chunks. This is essential for extensions that handle large datasets, file processing, or network downloads.

```javascript
// Stream processing instead of loading all data
async function processLargeFile(file) {
  const stream = file.stream();
  const reader = stream.getReader();
  
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line for next chunk
    
    for (const line of lines) {
      await processLine(line);
    }
  }
}
```

### Lazy Initialization with Dynamic import()

Don't load code and data until you need it. Dynamic imports split your bundle and load modules on-demand, reducing initial memory footprint.

```javascript
// Load heavy module only when needed
async function handleUserAction() {
  const { HeavyModule } = await import('./heavy-module.js');
  const module = new HeavyModule();
  module.process();
}
```

### In-Memory Cache with Storage Sync

Use @theluckystrike/webext-storage to keep critical data in memory while automatically syncing to persistent storage. The watch() method lets you react to storage changes across contexts.

```javascript
const storage = createStorage(schema, 'local');

// In-memory cache backed by chrome.storage
let memoryCache = {};

storage.watch('apiCache', (newVal) => {
  memoryCache = newVal || {};
});

function getCached(key) {
  return memoryCache[key];
}

function setCached(key, value) {
  memoryCache[key] = value;
  storage.set('apiCache', memoryCache);
}
```

## Monitoring Memory

Identifying memory issues requires the right tools. Chrome provides several ways to inspect and profile your extension's memory usage.

### chrome://extensions

The extensions management page shows per-extension memory usage. This gives you a quick overview of which extension is consuming the most resources. Sort by memory to identify problematic extensions quickly.

### DevTools Memory Tab

The Memory panel in DevTools offers three profiling techniques. Heap snapshots show memory distribution across objects. The allocation timeline identifies memory that persists over time. Snapshot comparison lets you find leaks by comparing two snapshots taken at different times.

For content script profiling, you need to attach DevTools to the tab running your content script. Open DevTools on the page, then select your content script's JavaScript context from the context dropdown.

```javascript
// Mark memory in performance timeline
performance.mark('processing-start');

// Later
performance.mark('processing-end');
performance.measure('processing', 'processing-start', 'processing-end');
```

### performance.memory API

In extension pages (popup, options, background), you can programmatically check memory usage:

```javascript
function logMemory() {
  if (performance.memory) {
    console.log('Used JS Heap:', 
      Math.round(performance.memory.usedJSHeapSize / 1048576), 'MB');
    console.log('Total JS Heap:', 
      Math.round(performance.memory.totalJSHeapSize / 1048576), 'MB');
    console.log('Heap Limit:', 
      Math.round(performance.memory.jsHeapSizeLimit / 1048576), 'MB');
  }
}
```

Note that this API requires the performance: ["performance"] permission in your manifest.

## Storage vs Memory Trade-offs

Choosing between in-memory and persistent storage affects both performance and user experience. Each approach has clear trade-offs.

| Factor | In-Memory | chrome.storage |
|--------|-----------|----------------|
| Speed | Instant access | ~1-5ms async |
| Persistence | Lost on SW terminate | Persists forever |
| Capacity | Limited by available RAM | Limited by quota (typically 5MB) |
| Sharing | Single context | All extension contexts |
| Cost | RAM consumption | Minimal I/O |

Use in-memory for data that is transient, computationally expensive to recreate, or only relevant in the current session. Use chrome.storage for user preferences, cached API responses, and any data that must survive service worker restarts.

## Best Practices

Following these practices prevents the most common memory issues in extension development.

Always persist critical state before your service worker terminates. Chrome does not give you advance warning when it terminates an idle service worker. Write state to chrome.storage frequently, or use the @theluckystrike/webext-storage library which handles this automatically.

Remove event listeners when they are no longer needed. Use AbortController to manage multiple listeners efficiently. Document your cleanup code with comments explaining what is being cleaned up and why.

Disconnect MutationObservers immediately when they are no longer needed. Add this as a reflex every time you create an observer.

Use WeakMap and WeakRef for caches associated with DOM elements. This prevents your cache from preventing garbage collection of removed elements.

Profile your extension regularly with the DevTools Memory tab. Run heap snapshots before and after user interactions to catch leaks early.

## Common Mistakes

Avoid these frequent errors that lead to memory problems in production extensions.

Holding large objects in global variables in content scripts. Globals in content scripts persist for the lifetime of the page and any content script re-injections.

Never disconnecting MutationObservers. This is the single most common leak in content scripts. Every observer must be disconnected, ideally in a cleanup method that runs on page unload.

Ignoring service worker termination. Treating the service worker like a persistent server leads to data loss when Chrome terminates it. Always assume your service worker will be terminated at any time.

Holding references to detached DOM nodes. Even after a DOM node is removed from the document, your references keep it alive. Use WeakMap for DOM caches or clear references explicitly when nodes are removed.

