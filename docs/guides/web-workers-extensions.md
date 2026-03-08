---
layout: default
title: "Chrome Extension Web Workers — Developer Guide"
description: "Master Chrome extension service workers with this guide covering lifecycle, messaging, and background task implementation."
---
# Web Workers in Chrome Extensions

## Overview
Web Workers enable running JavaScript in background threads, keeping your extension's UI responsive by offloading CPU-intensive operations. They run in parallel to the main thread and communicate via message passing.

In Chrome Extensions, Web Workers are available in extension pages (popup, options, tab pages) and offscreen documents, but NOT in the background service worker context. This distinction is important when architecting your extension.

## Worker Types Available

- **Dedicated Workers**: Private to the creating page or script. Each popup or options page gets its own worker instance.
- **Shared Workers**: Can be shared between multiple extension pages using the same origin. Less commonly used in extensions.
- **Service Workers**: NOT the same as Web Workers. The extension service worker is a special background context with limited API access.

```js
// Dedicated worker (most common)
const worker = new Worker(chrome.runtime.getURL('worker.js'));
```

## Creating Workers in Extensions

Workers are created from extension pages using the standard Web Worker API:

```js
// In popup.ts, options.ts, or a content script page
const worker = new Worker(chrome.runtime.getURL('worker.js'));

// Send data to worker
worker.postMessage({ type: 'process', data: largeData });

// Receive results
worker.onmessage = (event) => {
  console.log('Result:', event.data);
};

// Handle errors
worker.onerror = (error) => {
  console.error('Worker error:', error.message);
};
```

The worker file must be listed in `web_accessible_resources` in manifest.json if accessed from content scripts, or available as a regular extension resource.

## Chrome API Access in Workers

Web Workers do NOT have direct access to Chrome extension APIs. The worker cannot call `chrome.storage`, `chrome.tabs`, or any other chrome.* APIs directly.

```js
// worker.js - NO direct Chrome API access
self.onmessage = async (event) => {
  // This won't work!
  // const data = await chrome.storage.local.get('key');
  
  // Instead, request data from the extension page that created the worker
  self.postMessage({ type: 'requestData', key: 'settings' });
};
```

Solution: Use the extension page as a bridge. The worker requests data via postMessage, and the extension page calls Chrome APIs and responds:

```js
// In extension page (popup.ts)
worker.onmessage = async (event) => {
  if (event.data.type === 'requestData') {
    const result = await chrome.storage.local.get(event.data.key);
    worker.postMessage({ type: 'dataResponse', data: result });
  }
};
```

## Offscreen Document + Worker Pattern

The offscreen document API lets you create background pages for specific tasks. Combined with Web Workers, this gives you powerful background processing:

```json
{
  "name": "My Extension",
  "permissions": ["offscreen"]
}
```

```js
// In service worker - create offscreen document
async function createWorkerDocument() {
  // Check if an offscreen document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS'],
      justification: 'Process large data in background'
    });
  }
}
```

```js
// offscreen.js - runs in offscreen document context
const worker = new Worker(chrome.runtime.getURL('worker.js'));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'process') {
    worker.postMessage(message.data);
    worker.onmessage = (e) => sendResponse(e.data);
    return true; // Keep channel open for async response
  }
});
```

## Use Cases

Web Workers excel at CPU-intensive tasks that would otherwise freeze the UI:

- **Heavy data processing**: Parsing large JSON/CSV files, sorting, filtering
- **Image manipulation**: Canvas operations, resizing, filters
- **Cryptographic operations**: Hashing, encryption, decryption
- **Text analysis**: Search indexing, diff algorithms, parsing
- **Complex calculations**: Data aggregation, statistics computation

## Module Workers

Use module workers to import other extension modules:

```js
const worker = new Worker(
  chrome.runtime.getURL('worker.js'),
  { type: 'module' }
);
```

Module workers can import other ES modules, enabling better code organization:

```js
// worker.js (module)
import { processItem } from './utils/processor.js';
import { formatResult } from './utils/formatter.js';

self.onmessage = (event) => {
  const processed = processItem(event.data);
  const formatted = formatResult(processed);
  self.postMessage(formatted);
};
```

## Performance Considerations

- **Structured clone**: postMessage uses structured clone algorithm (no functions, limited object types)
- **Transferable objects**: For ArrayBuffers and typed arrays, use transferable objects to avoid copying:

```js
// Zero-copy transfer
const buffer = new Uint8Array(largeData).buffer;
worker.postMessage({ buffer }, [buffer]); // Second arg transfers ownership
```

- **Avoid trivial tasks**: Workers have overhead (~5-15ms startup). Don't use for simple operations
- **Reuse workers**: Create once, reuse for multiple tasks. Don't spawn per-task
- **Terminate when done**: Call `worker.terminate()` when no longer needed to free memory

## Code Examples

### Basic Worker for Data Processing

```js
// data-worker.js
self.onmessage = (event) => {
  const { data, options } = event.data;
  
  // CPU-intensive operation
  const result = data
    .filter(item => item.active)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit);
  
  self.postMessage({ success: true, result });
};
```

### Worker Pool Pattern

```js
// worker-pool.ts
class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<() => void> = [];
  
  constructor(private size: number) {
    for (let i = 0; i < size; i++) {
      this.workers.push(new Worker(chrome.runtime.getURL('worker.js')));
    }
  }
  
  async process<T, R>(data: T): Promise<R> {
    const worker = this.workers.find(w => !w.busy);
    
    return new Promise((resolve) => {
      const handleMessage = (e: MessageEvent) => {
        worker.busy = false;
        worker.removeEventListener('message', handleMessage);
        resolve(e.data);
      };
      
      worker.busy = true;
      worker.addEventListener('message', handleMessage);
      worker.postMessage(data);
    });
  }
}
```

## Gotchas

- Workers cannot access DOM or window objects
- No direct chrome.* API access — use message passing bridge
- Service workers cannot create Web Workers directly
- Module workers require { type: 'module' } option
- Workers run in isolated origin — may need web_accessible_resources

## Related Guides
- [Offscreen Documents](../mv3/offscreen-documents.md)
- [Offscreen Permissions](../permissions/offscreen.md)
- [Performance Optimization](../guides/performance.md)
- [Background Service Worker Patterns](background-patterns.md)
