---
layout: default
title: "Chrome Extension Memory Management — Developer Guide"
description: "Learn Chrome extension memory management with this developer guide covering implementation, best practices, and code examples."
---
# Memory Management in Chrome Extensions

## Memory by Context
- **Service Worker**: terminated after ~30s idle, ALL in-memory state lost. Persist with `@theluckystrike/webext-storage`
- **Content Scripts**: live with the page, can leak. Must clean up listeners/observers
- **Popup/Options**: fresh state on every open, freed on close
- **Side Panel**: persistent while open, can leak like content scripts

## Common Memory Leaks
- Forgotten event listeners — use `AbortController` signal pattern for cleanup
- Detached DOM nodes — null references after removing elements
- Closures holding large data — extract needed values, release large arrays
- MutationObserver not disconnected — always call `observer.disconnect()`
- `setInterval` without `clearInterval` in content scripts

## Memory-Efficient Patterns
- `WeakMap`/`WeakRef` for DOM-associated caches (auto-GC when element removed)
- Streaming large data with `ReadableStream` instead of loading all into memory
- Lazy initialization with dynamic `import()`
- In-memory cache synced via `@theluckystrike/webext-storage` `watch()`

## Monitoring Memory
- `chrome://extensions` — per-extension memory usage
- DevTools Memory tab — heap snapshots, allocation timeline, compare snapshots
- `performance.memory.usedJSHeapSize` in extension pages

## Storage vs Memory Trade-offs Table
- Speed: instant vs ~1-5ms async
- Persistence: lost on SW terminate vs persists forever
- Sharing: single context vs all contexts

## Best Practices
- Persist critical state — SW will terminate
- Remove listeners with AbortController
- Disconnect MutationObservers
- WeakMap/WeakRef for caches
- Profile with DevTools Memory tab

## Common Mistakes
- Large globals in content scripts, never disconnecting observers, ignoring SW termination, holding detached DOM refs

## Related Articles

- [Memory Management Patterns](../patterns/memory-management.md)
- [Performance Guide](../guides/performance.md)
