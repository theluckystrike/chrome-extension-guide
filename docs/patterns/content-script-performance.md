---
layout: default
title: "Chrome Extension Content Script Performance — Best Practices"
description: "Optimize content script performance."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/content-script-performance/"
---

# Content Script Performance Optimization

## Overview {#overview}

Content scripts directly impact page load performance and user experience. Optimizing their initialization and runtime behavior is critical for maintaining fast page loads and responsive extension functionality.

## Minimizing Initial Load Impact {#minimizing-initial-load-impact}

Content scripts block page rendering if loaded at `document_start`. Use `document_idle` for non-critical functionality:

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

For critical features needing early injection, defer non-essential initialization using `requestIdleCallback`.

## Deferred Initialization Pattern {#deferred-initialization-pattern}

Defer expensive operations until the page has settled:

```js
// Lazy content script initializer
function initContentScript() {
  // Schedule non-critical work for idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => initializeFeatures(), { timeout: 2000 });
  } else {
    setTimeout(() => initializeFeatures(), 100);
  }
}

function initializeFeatures() {
  // Heavy initialization: DOM scanning, event binding, etc.
  scanDOM();
  attachListeners();
}

initContentScript();
```

## Efficient DOM Querying {#efficient-dom-querying}

Cache DOM queries and avoid repeated searches:

```js
// BAD: Query multiple times
document.querySelectorAll('.item').forEach(el => el.classList.add('processed'));

// GOOD: Single query, cached result
const items = document.querySelectorAll('.item');
items.forEach(el => el.classList.add('processed'));
```

Use `querySelector` for single elements and scope queries to specific containers:

```js
const container = document.getElementById('extension-root');
const button = container.querySelector('.action-btn');
```

## Intersection Observer for Lazy DOM Operations {#intersection-observer-for-lazy-dom-operations}

Defer DOM manipulation until elements are visible:

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      hydrateComponent(entry.target);
      observer.unobserve(entry.target);
    }
  });
}, { rootMargin: '100px' });

document.querySelectorAll('.lazy-load').forEach(el => observer.observe(el));
```

## MutationObserver Performance {#mutationobserver-performance}

Use targeted observation instead of monitoring entire subtrees:

```js
// BAD: Watches entire document
const observer = new MutationObserver(callback);
observer.observe(document, { subtree: true, childList: true });

// GOOD: Target specific container
const observer = new MutationObserver(callback);
observer.observe(document.querySelector('#comments'), { 
  childList: true, 
  subtree: false 
});
```

Disconnect observers when no longer needed to prevent memory leaks:

```js
// When extension feature is disabled or page navigates
observer.disconnect();
```

## Avoiding Layout Thrashing {#avoiding-layout-thrashing}

Read layout properties together, then write together:

```js
// BAD: Interleaved reads and writes cause reflows
for (const el of elements) {
  const height = el.offsetHeight; // READ - causes reflow
  el.style.height = height + 'px'; // WRITE - causes reflow
}

// GOOD: Batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // All READS
elements.forEach((el, i) => el.style.height = heights[i] + 'px'); // All WRITES
```

## CSS Containment for Injected UI {#css-containment-for-injected-ui}

Use CSS containment to isolate extension UI from page reflows:

```css
.extension-container {
  contain: content;
  isolation: isolate;
}
```

## Message Batching {#message-batching}

Reduce IPC overhead by batching messages:

```js
// Batched message sender
const messageQueue = [];
let batchTimeout = null;

function sendBatchedMessage(type, payload) {
  messageQueue.push({ type, payload, timestamp: Date.now() });
  
  if (!batchTimeout) {
    batchTimeout = setTimeout(flushMessages, 100);
  }
}

function flushMessages() {
  if (messageQueue.length === 0) return;
  
  chrome.runtime.sendMessage({
    type: 'BATCH',
    payload: messageQueue.splice(0)
  });
  
  batchTimeout = null;
}
```

## Memory Leak Prevention {#memory-leak-prevention}

Always clean up observers, listeners, and timers:

```js
class ContentFeature {
  constructor() {
    this.observer = null;
    this.listeners = [];
    this.init();
  }
  
  init() {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.observer.observe(document.body, { childList: true });
    
    window.addEventListener('resize', this.handleResize);
    this.listeners.push({ target: window, type: 'resize', handler: this.handleResize });
  }
  
  destroy() {
    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Remove all event listeners
    this.listeners.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler);
    });
    this.listeners = [];
  }
}
```

## Script Injection Timing Tradeoffs {#script-injection-timing-tradeoffs}

| Timing | Use Case | Tradeoff |
|--------|----------|----------|
| `document_start` | Page modification, style injection | May block rendering |
| `document_end` | DOM ready, no layout yet | Fast but limited access |
| `document_idle` | Most features | Best balance, but delayed |

## Related Patterns {#related-patterns}

- [DOM Observer Patterns](./dom-observer-patterns.md) - Advanced observer configurations
- [Content Script Lifecycle](./content-script-lifecycle.md) - Initialization and cleanup
- [Performance Profiling](./performance-profiling.md) - Measuring and debugging performance
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
