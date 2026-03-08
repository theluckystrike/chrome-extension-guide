---
layout: default
title: "Chrome Extension Performance Optimization — Developer Guide"
description: "Optimize your Chrome extension performance with this guide covering profiling, lazy loading, and memory management."
---
# Performance Optimization for Chrome Extensions

## Introduction
- Extensions share browser resources — slow extensions degrade the whole browser
- MV3 service workers add startup latency — optimize for cold starts
- Key metrics: startup time, memory usage, message latency, content script injection time

## Service Worker Performance
- **Cold start**: SW loads from disk on every wake-up — keep bundle small
- Tree-shake unused code, use dynamic `import()` for optional features
- Register all event listeners synchronously at top level (Chrome requirement)
- Avoid heavy initialization — defer work until needed
```javascript
// BAD: heavy work at startup
const data = await fetch("https://api.example.com/config"); // blocks SW init

// GOOD: defer until needed
let cachedConfig;
async function getConfig() {
  if (!cachedConfig) cachedConfig = await fetch("https://api.example.com/config");
  return cachedConfig;
}
```

## Bundle Size Optimization
- Use Webpack/Vite/Rollup with tree-shaking enabled
- Analyze bundle: `webpack-bundle-analyzer` or `rollup-plugin-visualizer`
- Code split: dynamic `import()` for features not needed at startup
- Minify production builds (but don't obfuscate — CWS rejects obfuscated code)
- Target: background bundle < 100KB, content scripts < 50KB

## Storage Performance
- `chrome.storage` is async and involves IPC — minimize calls
- Use `@theluckystrike/webext-storage` batch operations:
  ```typescript
  // BAD: 5 separate storage calls
  const a = await storage.get('a');
  const b = await storage.get('b');

  // GOOD: single call
  const { a, b } = await storage.getMany(['a', 'b']);

  // GOOD: get everything at once for settings pages
  const all = await storage.getAll();
  ```
- `setMany` for batch writes — single IPC call instead of multiple
- Cache frequently read values in memory, use `watch()` to stay in sync

## Content Script Performance
- `run_at: "document_idle"` (default) — least impact on page load
- `run_at: "document_start"` — blocks page rendering, use only when essential
- Minimize DOM queries — cache element references
- Use `MutationObserver` instead of polling for DOM changes
- Avoid injecting large CSS files — use minimal, scoped styles

## Message Passing Performance
- Each message involves serialization + IPC — don't send huge payloads
- Batch small messages into single larger message
- Use `@theluckystrike/webext-messaging` typed messages — compile-time checks prevent unnecessary round-trips
- For streaming data, consider `chrome.runtime.connect()` (long-lived port) instead of one-shot messages

## Memory Management
- Service worker memory is reclaimed on termination — design for this
- Content scripts live with the page — avoid memory leaks:
  - Remove event listeners when done
  - Clear intervals/timeouts
  - Don't hold references to detached DOM nodes
- Use `WeakRef`/`WeakMap` for caches that should be GC'd
- Monitor: `chrome://extensions` shows per-extension memory usage

## Popup/Options Performance
- Popups load fresh every time — optimize initial render
- Pre-compute data in background, send to popup via messaging
- Use `@theluckystrike/webext-storage` `getAll()` for initial state load
- Lazy-load heavy UI components

## Network Performance
- Cache API responses in `chrome.storage.local`
- Use `If-Modified-Since`/`ETag` for conditional requests
- Batch API calls where possible
- Use `chrome.alarms` for periodic sync instead of continuous polling

## Profiling Tools
- Chrome DevTools Performance tab — works for extension pages
- `chrome://extensions` — memory and CPU usage per extension
- `performance.now()` for measuring code execution time
- `console.time()`/`console.timeEnd()` for quick timing
- `chrome.runtime.getBackgroundClient()` for SW inspection

## Performance Checklist
- [ ] Background bundle < 100KB
- [ ] Content script bundle < 50KB
- [ ] Batch storage reads (`getMany`/`getAll`)
- [ ] Batch storage writes (`setMany`)
- [ ] Event listeners registered synchronously
- [ ] Heavy work deferred (not at SW startup)
- [ ] Content script uses `document_idle`
- [ ] No memory leaks in content scripts
- [ ] API responses cached
- [ ] No unnecessary message passing
