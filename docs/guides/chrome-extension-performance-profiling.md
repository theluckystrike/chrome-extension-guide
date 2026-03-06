# Performance Profiling for Chrome Extensions

## Overview
Performance profiling for extensions requires understanding Chrome's multi-process architecture. Each extension component (service worker, popup, content scripts, options page) runs in isolated contexts with unique profiling approaches.

## DevTools Performance Tab

### Recording Performance
1. Open DevTools (F12) in your extension's context
2. For **service worker**: Navigate to `chrome://extensions`, enable "Developer mode", find your extension, click "service worker" link
3. For **popup/options**: Right-click popup → Inspect
4. For **content scripts**: Inspect any page where your content script runs

### Analyzing Flame Charts
- **Network section**: Shows IPC calls to Chrome APIs (storage, tabs, runtime)
- **Scripting section**: Your extension's JavaScript execution
- **Rendering section**: DOM manipulation in popup/options
- Look for: long tasks (>50ms), blocking calls, excessive GC pauses

## Memory Profiling

### Heap Snapshots
```javascript
// In DevTools Memory tab
// 1. Take baseline snapshot
// 2. Perform extension action (e.g., open popup)
// 3. Take second snapshot
// 4. Compare to find retained objects
```

### Allocation Timeline
- Track memory allocation over time
- Identify objects not being garbage collected
- Useful for detecting memory leaks in long-running extensions

## Service Worker Performance

### Startup Time Measurement
```javascript
// At top of service worker
const startTime = performance.now();

// In fetch handler
chrome.runtime.onFetch.addListener((details) => {
  const handlerDuration = performance.now() - startTime;
  console.log(`SW wake-up: ${handlerDuration.toFixed(2)}ms`);
});
```

### Event Handler Duration
- Use `performance.now()` around async handlers
- Monitor with `chrome.devtools.performance` API
- Target: handlers complete within 100ms to avoid timeout

## Content Script Impact

### Measuring CPU/Memory Added to Page
1. Open Chrome Task Manager (Shift+Esc)
2. Note baseline CPU/memory for tab
3. Load page with your content script
4. Compare difference
5. Use Performance API in content script:
```javascript
performance.mark('content-script-start');
// ... your code ...
performance.mark('content-script-end');
performance.measure('content-script', 'content-script-start', 'content-script-end');
```

## Popup Rendering Performance

### First Paint & Interaction Readiness
- Measure from popup open to interactive:
```javascript
// In popup script
const openTime = performance.now();
requestAnimationFrame(() => {
  const ready = performance.now() - openTime;
  console.log(`Popup ready: ${ready}ms`);
});
```
- Target: < 200ms for perceived responsiveness

## Storage Performance

### Benchmarking Read/Write
```javascript
// Benchmark storage operations
async function benchmarkStorage() {
  const iterations = 100;
  const data = { key: 'value'.repeat(100) };
  
  // Test write
  const writeStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await chrome.storage.local.set({ [`key${i}`]: data });
  }
  const writeTime = (performance.now() - writeStart) / iterations;
  
  // Test batch write
  const batchStart = performance.now();
  const batchData = {};
  for (let i = 0; i < iterations; i++) {
    batchData[`key${i}`] = data;
  }
  await chrome.storage.local.set(batchData);
  const batchTime = (performance.now() - batchStart) / iterations;
  
  console.log(`Single write: ${writeTime.toFixed(2)}ms, Batch: ${batchTime.toFixed(2)}ms`);
}
```

## Message Passing Overhead

### Measuring Latency
```javascript
// In content script
const start = performance.now();
chrome.runtime.sendMessage({ action: 'ping' }, () => {
  const latency = performance.now() - start;
  console.log(`Message round-trip: ${latency}ms`);
});
```
- Target: < 50ms for responsive UX
- Profile: larger payloads = longer serialization time

## Common Performance Bottlenecks

- **Synchronous storage**: `chrome.storage.local.get()` blocks — always await
- **DOM-heavy content scripts**: Use `requestAnimationFrame` for batch updates
- **Large data serialization**: Clone only what you need in message passing

## Chrome Task Manager

1. Press Shift+Esc or Menu → More tools → Task Manager
2. Find your extension by name
3. Monitor: Memory, CPU, Network
4. Look for: high memory growth, sustained CPU usage

## Performance API for Extensions

```javascript
// Custom performance marks
performance.mark('extension-init');

// Measure code blocks
performance.measure('init-phase', 'extension-init', 'extension-ready');

// Read in service worker
const entries = performance.getEntriesByType('measure');
entries.forEach(e => console.log(`${e.name}: ${e.duration}ms`));
```

## Lighthouse for Extension Pages

```bash
# Run Lighthouse on popup
lighthouse chrome-extension://EXTENSION_ID/popup.html

# For options page
lighthouse chrome-extension://EXTENSION_ID/options.html
```

Focus audits on: First Contentful Paint, Largest Contentful Paint, Total Blocking Time.

## Automated Performance Testing

```javascript
// benchmark.js - run with Puppeteer
const { chromium } = require('puppeteer');

async function measureExtension() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Measure popup open time
  await page.goto('chrome-extension://EXT_ID/popup.html');
  const metrics = await page.metrics();
  
  console.log('JSHeapUsed:', metrics.JSHeapUsedSize);
  await browser.close();
}
```

## Bundle Size Impact

- Larger bundles = longer service worker startup
- Target: background < 100KB, content scripts < 50KB (gzipped)
- Use code splitting: lazy-load non-critical features

## Cross-References

- See [guides/performance.md](./performance.md) for optimization patterns
- See [patterns/performance-profiling.md](../patterns/performance-profiling.md) for advanced techniques
- See [guides/memory-management.md](./memory-management.md) for memory optimization
