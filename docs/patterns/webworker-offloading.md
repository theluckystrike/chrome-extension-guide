---
layout: default
title: "Chrome Extension Webworker Offloading. Best Practices"
description: "Offload heavy computation to Web Workers."
canonical_url: "https://bestchromeextensions.com/patterns/webworker-offloading/"
last_modified_at: 2026-01-15
---

Web Worker Offloading Patterns

Web Workers enable running computationally intensive tasks off the main thread, keeping extension UIs responsive.

Where Workers Are Available {#where-workers-are-available}

Web Workers work in these extension contexts:
- Popup pages - Keep UI animations smooth during heavy processing
- Options pages - Process large datasets without freezing settings
- Side panel - Handle data transformations without blocking user interaction
- Offscreen documents - Run background CPU-intensive operations

Not available in:
- Service workers (use offscreen documents instead)
- Content scripts (use offscreen documents for heavy computation)

Creating a Worker {#creating-a-worker}

```javascript
// In an extension page (popup, options, side panel)
const worker = new Worker(chrome.runtime.getURL('worker.js'));

// Module worker (ES modules support)
const worker = new Worker(chrome.runtime.getURL('worker.js'), { 
  type: 'module' 
});
```

Offscreen Document + Worker Pipeline {#offscreen-document-worker-pipeline}

For background CPU-intensive tasks, combine offscreen documents with Workers:

```javascript
// background.js - create offscreen with worker
chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['WORKERS'],
  justification: 'Heavy data processing'
});

// offscreen.js - create worker inside offscreen
const worker = new Worker(chrome.runtime.getURL('processor.js'));
worker.postMessage({ data: 'input' });
worker.onmessage = (e) => {
  // Handle results
  chrome.runtime.sendMessage({ result: e.data });
};
```

Use Cases {#use-cases}

- Data processing: Filter, sort, aggregate large datasets
- Encryption/decryption: Crypto operations without blocking UI
- Image manipulation: Resize, compress, apply filters
- CSV/JSON parsing: Parse large files without freezing popup
- Complex calculations: Statistics, projections, algorithms

Message Passing {#message-passing}

```javascript
// Main thread
worker.postMessage({ type: 'process', payload: data });
worker.onmessage = (e) => { console.log('Result:', e.data); };
worker.onerror = (e) => { console.error('Worker error:', e.message); };

// Worker thread (worker.js)
self.onmessage = (e) => {
  const result = processData(e.data.payload);
  self.postMessage({ result });
};
```

Transferable Objects {#transferable-objects}

Use transferable objects for zero-copy transfer of large data:

```javascript
// Send ArrayBuffer
const buffer = new ArrayBuffer(1024 * 1024);
worker.postMessage({ buffer }, [buffer]);

// Receive ImageBitmap
worker.onmessage = (e) => {
  const bitmap = e.data.bitmap;
  ctx.drawImage(bitmap, 0, 0);
};
worker.postMessage({ imageData }, [imageData.data.buffer]);
```

SharedWorker for Shared State {#sharedworker-for-shared-state}

SharedWorkers allow multiple extension pages to share state:

```javascript
const shared = new SharedWorker(chrome.runtime.getURL('shared.js'));
shared.port.postMessage({ action: 'increment' });
shared.port.onmessage = (e) => { console.log('Count:', e.data); };
```

Worker Termination {#worker-termination}

Always terminate workers when no longer needed:

```javascript
// In popup - close when popup closes
window.addEventListener('unload', () => worker.terminate());

// In offscreen - terminate after completion
worker.onmessage = () => worker.terminate();
```

Error Handling {#error-handling}

```javascript
worker.onerror = (e) => {
  console.error('Worker failed:', e.message, e.filename, e.lineno);
};

try {
  // Wrap worker operations
} catch (err) {
  console.error('Operation failed:', err);
}
```

Bundling Workers {#bundling-workers}

Vite:
```javascript
// vite.config.js
export default {
  worker: {
    format: 'es'
  }
};
// Import: import Worker from './worker.js?worker'
```

Webpack:
```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      { test: /\.worker\.js$/, use: { loader: 'worker-loader' } }
    ]
  }
};
```

Related Patterns {#related-patterns}

- [Offscreen Documents](./offscreen-documents.md)
- [Performance Guide](../guides/performance.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
