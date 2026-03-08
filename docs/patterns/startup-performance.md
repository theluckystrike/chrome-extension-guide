---
layout: default
title: "Chrome Extension Startup Performance — Best Practices"
description: "Optimize extension startup performance."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/startup-performance/"
---

# Startup Performance Patterns

Optimize Chrome extension startup and popup performance. Target **<100ms** popup open time for a snappy user experience.

## Minimize Popup Bundle

Keep your popup JavaScript bundle small. Use code splitting to load only what's needed.

## Skeleton UI

Show layout immediately, then populate data:

```javascript
// popup.js - Render skeleton first
document.getElementById('app').innerHTML = `
  <div class="skeleton-header"></div>
  <div class="skeleton-row"></div>
  <div class="skeleton-row"></div>
`;
fetchData().then(render);
```

## Preload Data in Background

Prefetch data in the service worker before popup opens:

```javascript
// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') sendResponse({ data: cachedData });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') prefetchDataForTab(tabId);
});
```

## Inline Critical CSS

Put critical styles directly in HTML to avoid render-blocking:

```html
<head>
  <style>body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }</style>
  <link rel="stylesheet" href="non-critical.css">
</head>
```

## Defer Non-Essential Listeners

Register listeners lazily to speed up initial execution:

```javascript
document.getElementById('btn-advanced').addEventListener('click', async () => {
  const { AdvancedPanel } = await import('./advanced-panel.js');
  new AdvancedPanel().render();
});
```

## Service Worker Startup Optimization

Minimize cold start penalty with lazy imports:

```javascript
// Lazy load heavy modules
let analytics;
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'TRACK') {
    if (!analytics) analytics = await import('./analytics.js');
    analytics.track(message.event);
  }
});
```

## Tree-Shaking & System Fonts

Configure your bundler for tree-shaking and use system fonts:

```javascript
// vite.config.js - Manual chunks
build: { rollupOptions: { output: { manualChunks: { vendor: ['react'] } } } }
```

```css
body { font-family: system-ui, -apple-system, sans-serif; }
```

## Image Optimization

Use WebP and lazy loading:

```html
<picture><source srcset="icon.webp" type="image/webp"><img src="icon.png" loading="lazy"></picture>
```

## Measuring Startup

Use performance.mark/measure to identify bottlenecks:

```javascript
performance.mark('popup:start');
const data = await fetchData();
performance.mark('fetch:end');
performance.measure('fetch', 'popup:start', 'fetch:end');
```

## Lazy Module Loader

```javascript
const moduleCache = new Map();
export async function lazyLoad(path) {
  if (moduleCache.has(path)) return moduleCache.get(path);
  const mod = await import(path);
  moduleCache.set(path, mod);
  return mod;
}
```

## Quick Checklist

- [ ] Target <100ms popup open
- [ ] Implement skeleton UI
- [ ] Preload data in service worker
- [ ] Inline critical CSS
- [ ] Defer non-essential listeners
- [ ] Optimize service worker startup
- [ ] Enable tree-shaking
- [ ] Use system fonts
- [ ] Optimize images (WebP, lazy load)
- [ ] Measure with performance.mark/measure

## Related Guides

- [Performance Guide](../guides/performance.md)
- [Extension Size Optimization](../guides/extension-size-optimization.md)
- [Lazy Loading Patterns](../guides/lazy-loading-patterns.md)
