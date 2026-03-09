---
layout: default
title: "Profile Chrome Extension Performance: CPU, Memory, and Network Analysis with DevTools"
<<<<<<< HEAD
description: "Master Chrome extension performance profiling with DevTools. Learn to analyze CPU usage, memory leaks, network requests, service worker startup, and integrate automated testing into your CI pipeline."
=======
description: "Master Chrome extension performance profiling with DevTools. Learn to analyze CPU usage with flame charts, debug memory leaks with heap snapshots, profile service worker startup, and integrate performance testing into CI/CD pipelines."
>>>>>>> content/performance-profiling
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-performance-profiling-devtools/"
---

# Profile Chrome Extension Performance: CPU, Memory, and Network Analysis with DevTools

<<<<<<< HEAD
Performance profiling is essential for building Chrome extensions that deliver smooth user experiences without draining system resources. Unlike traditional web applications, extensions operate across multiple isolated contexts—service workers, content scripts, popups, options pages, and side panels—each requiring distinct profiling approaches. This comprehensive guide teaches you how to use Chrome DevTools to identify CPU bottlenecks, detect memory leaks, analyze network patterns, and establish automated performance regression testing within your development workflow.

Understanding where your extension spends CPU cycles, allocates memory, and makes network requests enables you to make informed optimization decisions. The techniques covered here apply to both Manifest V2 and Manifest V3 extensions, though service worker profiling focuses specifically on Manifest V3's event-driven architecture.

## Understanding Chrome Extension Performance Contexts

Chrome extensions execute code in several distinct contexts, each with its own DevTools instance and performance characteristics. The service worker runs in a background context, handling events like `chrome.alarms`, `chrome.runtime.onMessage`, and `chrome.storage.onChanged`. Content scripts inject into web pages, operating within the page's DOM environment but with access to extension APIs. Popup pages and side panels render as separate documents when users interact with your extension. Each context maintains its own JavaScript heap, meaning memory profiling must occur separately for each context you wish to analyze.

The multi-process nature of Chrome means your extension competes with other extensions and native browser processes for system resources. Chrome also enforces resource limits—service workers can be terminated after 30 seconds of inactivity, and extensions have memory limits that vary based on available system memory. Profiling helps you understand how your extension behaves within these constraints and identify areas where optimization will have the greatest impact.

## Profiling with the Chrome DevTools Performance Tab

The Performance tab in Chrome DevTools provides detailed insights into CPU usage, frame rates, and timing across all extension contexts. To access the Performance tab for your extension's service worker, navigate to `chrome://extensions`, enable Developer mode, locate your extension, and click the "service worker" link under the Inspect Views section. This opens a DevTools window specifically connected to your service worker. For content scripts, open DevTools on any page where your content script runs and look for your extension's scripts in the bottom panel. Popup and side panel profiling requires right-clicking your extension's icon and selecting "Inspect popup" or using the same inspect links in `chrome://extensions`.

### Recording Performance Traces

Begin recording by clicking the record button in the Performance tab or using the keyboard shortcut Ctrl+E (Cmd+E on macOS). Perform the actions you want to analyze—opening your popup, triggering content script functionality, or waiting for service worker events. Stop recording when you've captured the relevant behavior. For service worker profiling, you may need to trigger events manually since the worker might be dormant when you begin recording. Use `chrome.runtime.reload()` from the extension management page to restart the service worker and capture its full startup sequence.

The resulting trace displays several key sections: the Network section showing IPC (Inter-Process Communication) calls between your extension and Chrome APIs, the Scripting section revealing JavaScript execution time, and the Rendering section displaying DOM updates in popup or options pages. Pay particular attention to tasks exceeding 50 milliseconds, as these represent moments where the browser cannot maintain 60 frames per second responsiveness.

### Analyzing Flame Charts for Content Scripts

Flame charts provide a visual representation of call stacks over time, making it easy to identify which functions consume the most CPU cycles. In the Performance tab, switch to the Flame Chart view by clicking the dropdown above the main panel and selecting "Flame Chart." Each bar represents a function, with width proportional to execution time. The vertical axis shows the call stack hierarchy, with the outermost function at the top.

For content scripts, look for patterns indicating inefficient operations. Repeated function calls appearing as narrow vertical strips suggest loops that could benefit from caching or batched processing. Deep call stacks with wide bars indicate functions calling other expensive functions—consider breaking these into smaller, asynchronous operations. Pay special attention to functions interacting with the DOM, as these often introduce layout thrashing when read and write operations alternate rapidly.

When analyzing content script performance, distinguish between your extension's code and the host page's scripts by filtering for your extension's context. The JavaScript section of the flame chart typically shows multiple colored bars representing different execution contexts. Your content script will appear with its own color coding, making it straightforward to isolate your code's contribution to overall execution time.

## Memory Profiling and Leak Detection

Memory issues in extensions manifest as gradual performance degradation, increased memory consumption over time, or crashes when Chrome terminates extensions exceeding memory thresholds. The Memory tab in DevTools provides three profiling methods: Heap Snapshots, Allocation Timeline on Recorders, and Memory Sampler. Each serves different diagnostic purposes.

### Taking and Comparing Heap Snapshots

Heap snapshots capture the complete memory state of a context at a specific moment. To diagnose memory leaks, take a baseline snapshot before performing any extension actions. Perform your typical workflow—opening and closing the popup, interacting with content scripts, triggering background events—then take a second snapshot. Compare the two snapshots to identify objects that persist unexpectedly.

In the snapshot comparison view, sort by "Delta" to see objects with the greatest increase in retained size. Look for common leak patterns: event listeners attached to DOM nodes that are never removed, caches growing unbounded, or closures retaining references to large objects. The "Retainers" panel shows exactly what keeps objects in memory, displaying the chain of references preventing garbage collection.

For content scripts, remember that DOM nodes from the host page cannot be directly referenced from extension contexts due to security boundaries. However, you may create copies or references through mechanisms that can inadvertently retain memory. Use explicit cleanup functions and remove event listeners when content script functionality is no longer needed.

### Using the Memory Timeline

The Allocation Timeline records memory allocation events over time, helping you identify when and where memory grows. Unlike snapshots, which capture static memory states, the timeline shows the progression of memory usage during recording. Start recording, perform your extension's operations, and watch for patterns: steady memory growth indicates potential leaks, while sawtooth patterns suggest healthy allocation and garbage collection cycles.

The timeline view also highlights allocations that persist throughout the recording—these represent objects that survived garbage collection and may indicate memory being retained longer than necessary. Click on allocation bars to see the call stack at the time of allocation, enabling precise identification of code locations creating persistent objects.

## Network Waterfall Analysis for Extension Requests

Extensions make network requests through multiple pathways: the service worker using `fetch()` and `XMLHttpRequest`, content scripts making requests from page contexts, and Chrome's built-in request interception for declarativeNetRequest rules. Understanding these pathways helps you optimize network performance.

### Analyzing Service Worker Network Requests

Open the Network tab in the service worker's DevTools to capture all network activity initiated from that context. Service workers typically handle API calls, background data synchronization, and requests triggered by declarativeNetRequest rules. Look for requests that block critical functionality—these represent opportunities for optimization through caching, request batching, or deferring non-essential requests.

The Waterfall view shows request timing in detail: DNS lookup, TCP connection establishment, SSL negotiation, request sending, waiting for first byte, and content download. For extension API calls to external services, aim for TTFB (Time To First Byte) under 200ms for responsive feel. Identify requests with excessive waiting times that could benefit from CDN usage, request optimization, or connection pooling.

### Content Script Network Patterns

Content scripts run in the context of web pages, meaning their network requests appear in the Network tab of DevTools for that page—not the extension's DevTools. This can make tracking content script requests confusing. The Chrome DevTools Protocol allows you to identify which requests originate from extensions using the `request.username` field or by examining request headers for extension-specific cookies or headers.

For content scripts making API calls, consider moving those requests to the service worker context. This provides several benefits: requests execute regardless of which tab is active, the service worker can implement caching and request deduplication, and authentication tokens remain protected in the background context rather than exposed in content scripts.

## Service Worker Startup Profiling

Service worker startup time directly impacts extension responsiveness, particularly for actions that trigger the worker from an idle state. Manifest V3 service workers can be terminated after 30 seconds of inactivity and must reinitialize on each event. Measuring and optimizing startup time significantly improves perceived performance.

### Measuring Startup Performance

Add timing instrumentation at the top of your service worker file to measure initialization time:

```javascript
const startupStart = performance.now();

// Log startup time when the worker becomes active
chrome.runtime.onStartup.addListener(() => {
  const startupTime = performance.now() - startupStart;
  console.log(`Service worker startup: ${startupTime.toFixed(2)}ms`);
  
  // Send to your analytics or log locally
  chrome.storage.local.set({
    lastStartupTime: startupTime,
    lastStartupDate: Date.now()
  });
});
```

For event-driven startups (when the worker handles an event after being idle), use the `performance.mark()` API to create timestamps before and after expensive operations:

```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open('static-v1'),
      // Other initialization tasks
    ]).then(() => {
      console.log('Installation complete');
    })
  );
});

// Measure lazy initialization
self.addEventListener('activate', (event) => {
  performance.mark('activate-start');
  event.waitUntil(
    caches.keys().then(keys => {
      performance.mark('activate-end');
      performance.measure('activation', 'activate-start', 'activate-end');
    })
  );
});
```

### Identifying Blocking Operations

The Performance tab reveals operations blocking service worker startup. Look for synchronous operations in the main thread—database transactions, large JSON parsing, or extensive logging—during the initialization phase. Consider deferring non-essential initialization using dynamic imports or splitting startup logic across multiple event handlers.

Service workers in Manifest V3 have a 30-second timeout for handling events. Operations exceeding this limit cause the worker to terminate abnormally. Use the Performance tab to identify functions approaching this threshold and break them into smaller chunks using techniques like `requestIdleCallback` or chunked processing.

## Lighthouse Audits for Extension Performance

Lighthouse, Chrome's automated auditing tool, can evaluate extension performance though with some limitations compared to regular web pages. Run Lighthouse on your extension's popup, options page, or any HTML pages your extension serves. Navigate to the specific page, open DevTools, select the Lighthouse tab, and run the analysis.

### Interpreting Lighthouse Results for Extensions

Extension pages often score lower in Lighthouse's "Performance" category due to the overhead of Chrome's extension infrastructure. Focus instead on specific recommendations: render-blocking resources, unused JavaScript, and inefficient image loading. The "Best Practices" and "Accessibility" audits provide valuable feedback applicable to extension contexts.

For popup pages, Lighthouse can identify opportunities to reduce JavaScript payload size through code splitting or deferring non-critical functionality. Options pages with complex UIs benefit from Lighthouse's recommendations about layout shifts and text compression. Run Lighthouse on each HTML document your extension provides to establish baseline scores and track improvements over time.

### Extending Lighthouse with Custom Audits

For specialized extension testing, consider creating custom Lighthouse audits using the Lighthouse CI configuration. Custom audits can verify extension-specific best practices: checking service worker file size, validating event handler cleanup, or ensuring background scripts avoid blocking operations. This approach enables automated enforcement of performance standards across your extension's codebase.

## Runtime Performance Metrics Collection

Beyond manual profiling, collect runtime metrics from real user sessions to understand how your extension performs under actual usage conditions. Chrome's `chrome.metrics` API (available to extensions) allows you to record performance metrics programmatically.

### Implementing Custom Metrics

Record key performance indicators in your extension:

```javascript
// Record a custom timing metric
chrome.metricsPrivate.recordTime('Extension.Popup.Open', 
  performance.now() - popupOpenStart);

// Record a custom count metric
chrome.metricsPrivate.recordCount('Extension.API.Requests', 
  requestCount);

// Record a histogram value
chrome.metricsPrivate.recordMediumCount('Extension.Memory.UsageMB', 
  Math.round(performance.memory.usedJSHeapSize / 1024 / 1024));
```

These metrics aggregate automatically and appear in Chrome's crash reports and extension management page statistics. Analyze patterns across user sessions to identify performance issues that don't appear in controlled testing environments.

### Monitoring Memory in Production

The `performance.memory` API provides limited memory information but suffices for basic monitoring:

```javascript
function logMemoryUsage() {
  if (performance.memory) {
    console.log({
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    });
  }
}

// Monitor periodically in long-running contexts
setInterval(logMemoryUsage, 60000); // Every minute
```

Compare memory usage across sessions and user populations to detect regressions before they impact large numbers of users.

## Automated Performance Regression Testing

Integrating performance testing into your development workflow catches regressions before they reach production. Several approaches enable automated performance validation within continuous integration pipelines.

### Using Puppeteer for Extension Testing

Puppeteer can launch Chrome with your extension loaded and collect performance metrics:
=======
Chrome extensions operate across multiple execution contexts—service workers, content scripts, popups, and options pages—each with unique performance characteristics. Profiling these components requires specialized techniques that differ from standard web application debugging. This guide covers comprehensive performance analysis using Chrome DevTools, from recording performance traces to automating regression testing in continuous integration.

## Understanding Extension Performance Contexts

Chrome extensions consist of several interconnected components that run in different processes and contexts. The service worker handles background tasks and lives in a dedicated worker thread. Content scripts inject into web pages and share the page's renderer process. Popups and options pages run as isolated HTML documents with their own JavaScript contexts. Each context presents distinct profiling challenges and opportunities.

Before profiling, ensure you're targeting the correct context. Service workers require access through `chrome://extensions`, while content scripts must be profiled within the context of injected pages. Popups can be inspected directly by right-clicking the extension icon. Understanding which context to profile is the first step toward meaningful performance analysis.

## Profiling with the Performance Tab

The Performance tab in Chrome DevTools provides comprehensive recording capabilities for analyzing CPU usage, frame rates, and execution timelines. For extensions, recording performance traces requires accessing the appropriate DevTools instance for each context.

### Recording Performance Traces

To record performance for your extension's service worker, navigate to `chrome://extensions`, enable Developer mode, and click the "service worker" link for your extension. This opens a DevTools window specifically connected to the service worker context. Click the record button in the Performance tab, perform the actions you want to analyze, and click stop to view the trace.

For content script profiling, open DevTools on any page where your content script runs. Select your content script from the JavaScript context dropdown in the DevTools toolbar—this ensures the profiler captures your script's execution alongside the page's own JavaScript. Recording while your content script performs its operations provides visibility into actual runtime behavior.

### Analyzing Flame Charts

The flame chart visualization displays the call stack over time, with each bar representing a function's execution duration. For extension profiling, focus on several key areas.

The Network section of the flame chart reveals Inter-Process Communication (IPC) calls to Chrome APIs. These appear as gray bars labeled with API names like `chrome.storage.get` or `chrome.tabs.query`. Large blocks in this section indicate blocking Chrome API calls that delay your extension's operations. Optimize by switching to asynchronous alternatives where possible or by caching API results.

The Scripting section shows your extension's JavaScript execution. Look for functions with wide bars—these represent long-running operations that block the main thread. Functions exceeding 50ms create long tasks that degrade responsiveness. Break these into smaller asynchronous chunks using techniques like chunking, web workers, or requestIdleCallback.

The Rendering section appears when profiling popup or options page contexts. Watch for forced reflows (layout thrashing) where JavaScript reads layout properties after modifying the DOM. These appear as alternating read-write patterns in the flame chart.

```javascript
// Example: Identifying performance bottlenecks in content script
function processPageElements() {
  // ❌ Bad: Causes forced reflow on each iteration
  const elements = document.querySelectorAll('.item');
  elements.forEach(el => {
    const height = el.offsetHeight; // Forces layout calculation
    el.style.height = `${height * 1.2}px`;
  });

  // ✅ Good: Batch reads, then writes
  const elements = document.querySelectorAll('.item');
  const heights = Array.from(elements).map(el => el.offsetHeight);
  elements.forEach((el, i) => {
    el.style.height = `${heights[i] * 1.2}px`;
  });
}
```

## Memory Profiling and Leak Detection

Memory leaks in Chrome extensions often go unnoticed until users experience degraded browser performance. Regular memory profiling helps identify and fix leaks before they impact users. DevTools provides several tools for memory analysis, each suited to different scenarios.

### Heap Snapshots

Heap snapshots capture the complete object graph at a specific moment. To use them effectively, record a baseline snapshot before performing any extension operations, then perform the operation you're testing (such as opening and closing a popup multiple times), and take a second snapshot. Comparing the two reveals objects retained in memory that shouldn't be there.

In DevTools Memory tab, select "Heap Snapshot" and click "Take snapshot". After recording both snapshots, use the comparison view to see objects that were allocated in the second snapshot but not freed. Look for objects with increasing retainment counts—these represent memory that your extension is holding onto inadvertently.

Common extension memory leak patterns include event listeners not being removed, closures capturing large objects, and caches growing without bounds. The dominators view helps identify root causes by showing which objects keep other objects alive.

```javascript
// Example: Proper cleanup to prevent memory leaks
class ExtensionManager {
  constructor() {
    this.listeners = [];
    this.cachedData = new Map();
  }

  setupListeners() {
    const listener = (event) => this.handleEvent(event);
    chrome.runtime.onMessage.addListener(listener);
    this.listeners.push({ type: 'message', listener });
  }

  // ✅ Good: Cleanup method to prevent leaks
  destroy() {
    this.listeners.forEach(({ type, listener }) => {
      if (type === 'message') {
        chrome.runtime.onMessage.removeListener(listener);
      }
    });
    this.listeners = [];
    this.cachedData.clear();
  }
}
```

### Memory Timeline and Allocation Profiling

The Allocation timeline records memory allocation events over time, helping identify objects that remain in memory rather than being garbage collected. This is particularly useful for detecting gradual memory growth that heap snapshots might miss.

Start a recording session and perform your extension's typical operations. Objects that persist throughout the recording session appear in blue—these are candidates for memory leaks. The allocation stack traces show where these persistent objects were created, helping pinpoint the source of retention.

For content scripts that run on many pages, the allocation timeline helps identify objects that accumulate across page navigations. Look for patterns where object counts grow linearly with page visits—this indicates a leak that needs fixing.

## Network Waterfall Analysis

Extensions frequently communicate with external APIs, and network performance directly impacts user experience. The Network tab in DevTools provides detailed waterfall analysis for extension network requests.

When profiling extension network activity, access the appropriate context—service worker, popup, or content script—and record network requests during typical operations. Look for requests that block critical operations or chain unnecessarily.

Optimize network performance by implementing request caching, batching multiple requests together, and using appropriate timeout values. For service workers, leverage the Cache API for storing API responses, but implement cache invalidation strategies to ensure data freshness.

```javascript
// Example: Efficient API request with caching
class ApiClient {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  async fetchWithCache(url, options = {}) {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    const response = await fetch(url, options);
    const data = await response.json();
    this.cache.set(url, { data, timestamp: Date.now() });
    return data;
  }
}
```

## Service Worker Startup Profiling

Service worker startup time significantly impacts extension responsiveness. Since service workers can be terminated after 30 seconds of inactivity, every wake-up presents a cold start scenario. Measuring and optimizing startup time is crucial for maintaining snappy performance.

### Measuring Startup Performance

Add timing instrumentation at the top of your service worker to measure wake-up latency:

```javascript
const SW_START_TIME = performance.now();

// Log startup timing
console.log(`Service worker started: ${SW_START_TIME.toFixed(2)}ms`);

self.addEventListener('install', () => {
  const installTime = performance.now() - SW_START_TIME;
  console.log(`Install event: ${installTime.toFixed(2)}ms`);
});

self.addEventListener('activate', () => {
  const activateTime = performance.now() - SW_START_TIME;
  console.log(`Activate event: ${activateTime.toFixed(2)}ms`);
});

self.addEventListener('message', (event) => {
  const messageTime = performance.now() - SW_START_TIME;
  console.log(`Message handler: ${messageTime.toFixed(2)}ms`);
  
  // Process message...
});
```

Use the Performance tab to record service worker wake-up events. The Timeline shows initialization time, event dispatch overhead, and handler execution duration. Target total startup times under 100 milliseconds for responsive extensions.

### Profiling Event Handlers

Service worker event handlers must complete within reasonable timeframes to avoid warnings or termination. Profile each handler type—onMessage, onAlarm, onFetch—to identify bottlenecks.

```javascript
// Example: Performance-measured message handler
self.addEventListener('message', async (event) => {
  const handlerStart = performance.now();
  
  try {
    const result = await processMessage(event.data);
    const handlerDuration = performance.now() - handlerStart;
    
    // Log slow handlers (>50ms)
    if (handlerDuration > 50) {
      console.warn(`Slow message handler: ${handlerDuration.toFixed(2)}ms`, {
        type: event.data.type,
        duration: handlerDuration
      });
    }
    
    event.ports[0].postMessage({ success: true, result });
  } catch (error) {
    event.ports[0].postMessage({ success: false, error: error.message });
  }
});
```

## Lighthouse Audits for Extensions

Lighthouse provides automated performance auditing that applies to extension contexts. While designed primarily for web pages, Lighthouse's audits offer valuable insights for extension popups, options pages, and content-script-rendered interfaces.

Run Lighthouse on your popup or options page by opening DevTools, navigating to the Lighthouse tab, and clicking "Analyze page load". Lighthouse reports metrics including First Contentful Paint, Time to Interactive, and Cumulative Layout Shift. For extension pages, pay particular attention to JavaScript execution time and render-blocking resources.

Content script performance can be audited by running Lighthouse on pages where your content scripts operate. This reveals how your scripts impact page performance metrics. Aim for minimal impact on Core Web Vitals when your content scripts are active.

## Runtime Performance Metrics

Beyond DevTools profiling, Chrome provides APIs for collecting runtime performance data from actual users. The `chrome.metrics` API (available in some contexts) and the Performance Observer API enable continuous performance monitoring.

```javascript
// Example: Runtime performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.setupObservers();
  }

  setupObservers() {
    // Observe long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics.push({
            type: 'longtask',
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });

      // Observe layout shifts
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            this.metrics.push({
              type: 'cls',
              value: entry.value
            });
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  getMetrics() {
    return this.metrics;
  }

  clearMetrics() {
    this.metrics = [];
  }
}
```

Collecting runtime metrics helps identify performance issues that only appear under real-world conditions with varied hardware, network conditions, and user interactions.

## Automated Performance Regression Testing

Integrating performance testing into your development workflow catches regressions before they reach users. Several approaches enable automated performance testing for extensions.

### Performance Testing with Puppeteer

Puppeteer can automate performance measurements for extension components. Load your extension's popup or options page programmatically and measure rendering metrics:
>>>>>>> content/performance-profiling

```javascript
const puppeteer = require('puppeteer');

<<<<<<< HEAD
async function measureExtensionStartup() {
  const browser = await puppeteer.launch({
    args: [
      '--load-extension=/path/to/extension',
      '--disable-extensions-except=/path/to/extension'
    ]
  });
  
  const targets = await browser.targets();
  const extensionTarget = targets.find(t => 
    t.type() === 'service_worker' && 
    t.url().includes('your-extension-id'));
  
  const worker = await extensionTarget.worker();
  
  // Enable performance metrics
  await worker.evaluate(() => {
    const metrics = [];
    performance.onresourcetimingbufferfull = () => {
      console.log('Buffer full');
    };
  });
  
  // Trigger extension action and measure
  const startupMetrics = await worker.evaluate(() => {
    return new Promise(resolve => {
      const start = performance.now();
      
      // Trigger your extension's action
      chrome.runtime.reload();
      
      chrome.runtime.onStartup.addListener(() => {
        resolve(performance.now() - start);
      });
    });
  });
  
  console.log(`Startup time: ${startupMetrics}ms`);
  await browser.close();
  
  return startupMetrics;
}
```

### CI Integration with Performance Thresholds

Configure your CI pipeline to fail builds when performance metrics exceed thresholds:

```yaml
# Example GitHub Actions workflow
- name: Performance Tests
  run: |
    npm run test:performance
  env:
    PERFORMANCE_THRESHOLD_MS: 500

# Example test assertion
expect(startupTime).toBeLessThan(
  parseInt(process.env.PERFORMANCE_THRESHOLD_MS)
);
```

Establish baseline measurements during initial implementation, then set thresholds that allow some variance while catching significant regressions. Review and adjust thresholds periodically as your extension evolves.

### Memory Leak Detection in CI

Automated memory leak detection requires repeated operations within a controlled environment:

```javascript
async function detectMemoryLeaks() {
  const browser = await puppeteer.launch({ 
    args: ['--load-extension=./extension'] 
  });
  
  const memoryReadings = [];
  
  for (let i = 0; i < 10; i++) {
    // Perform typical extension operation
    await performExtensionAction(browser);
    
    // Measure memory after each iteration
    const metrics = await getMemoryMetrics(browser);
    memoryReadings.push(metrics.usedJSHeapSize);
  }
  
  // Check for consistent memory growth
  const growth = memoryReadings[9] - memoryReadings[0];
  const growthRate = growth / memoryReadings[0];
  
  if (growthRate > 0.2) { // 20% growth threshold
    throw new Error(`Memory leak detected: ${growthRate * 100}% growth`);
  }
  
  await browser.close();
}
```

This approach simulates real usage patterns and identifies leaks that only manifest after repeated operations.

## Optimization Strategy

Combine profiling techniques with systematic optimization. Begin by identifying the most impactful bottlenecks through runtime metrics and user feedback. Use DevTools to analyze specific issues, implement fixes, then re-profile to verify improvements. Establish automated tests to prevent regression, and continue monitoring in production to catch issues that slip past development testing.

For comprehensive optimization guidance, see our guide on [Chrome Extension Performance Optimization](/chrome-extension-guide/guides/chrome-extension-performance-optimization/). For debugging specific issues discovered through profiling, refer to our [Advanced Debugging](/chrome-extension-guide/guides/advanced-debugging/) guide.
=======
async function measurePopupPerformance(extensionPath) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const targets = await browser.targets();
  const extensionTarget = targets.find(
    target => target.type() === 'service_worker' && 
    target.url().includes('manifest.json')
  );
  
  const worker = await extensionTarget.worker();
  
  // Navigate to a page with content script
  const page = await browser.newPage();
  await page.goto('https://example.com');
  
  // Wait for content script to execute
  await page.waitForSelector('[data-extension-injected]');
  
  // Measure performance metrics
  const metrics = await page.metrics();
  console.log('JS Heap Size:', metrics.JSHeapUsedSize);
  
  await browser.close();
}
```

### CI Integration for Performance Regression

Integrate performance tests into CI pipelines to block deployments when performance degrades. Compare current metrics against baseline thresholds and fail builds that exceed limits:

```yaml
# Example GitHub Actions workflow
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run performance tests
        run: npm run test:performance
        
      - name: Check performance thresholds
        run: |
          node scripts/check-performance.js
        env:
          THRESHOLD_MS: 100
```

Create baseline metrics during stable releases and update them intentionally when legitimate performance improvements occur. Automating these checks ensures performance remains a continuous priority rather than an afterthought.

## Related Guides

For comprehensive extension performance optimization, explore these related resources:

- [Performance Optimization Guide](/chrome-extension-guide/guides/performance-optimization/) — Techniques for reducing startup time, optimizing content scripts, and minimizing resource usage
- [Debugging Guide](/chrome-extension-guide/guides/debugging-guide/) — Using DevTools to diagnose and fix extension issues
- [Service Worker Debugging](/chrome-extension-guide/guides/service-worker-debugging/) — Specialized techniques for service worker troubleshooting
- [Memory Management Patterns](/chrome-extension-guide/guides/extension-performance-optimization/) — Best practices for memory-efficient extension design
>>>>>>> content/performance-profiling

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
