---
layout: default
title: "Chrome Extension Popup Data Loading — Best Practices"
description: "Optimize data loading patterns for extension popups."
---

# Popup Data Loading Patterns

Chrome extension popups present a unique challenge: each time the user opens the popup, it starts fresh with no persistent DOM or JavaScript state from the previous session. This means every open requires loading data quickly to provide a smooth user experience.

## The Core Challenge

When a popup opens:
- A new instance of the popup HTML/JS is created
- No memory of previous state exists
- Network requests add latency
- Users expect near-instant rendering

## Storage-First Pattern

Read from `chrome.storage.local` first, display immediately, then fetch fresh data in the background:

```typescript
async function loadData() {
  // 1. Load cached data immediately
  const cached = await chrome.storage.local.get('userData');
  if (cached.userData) render(cached.userData);

  // 2. Fetch fresh data in background
  const fresh = await fetch('/api/user').then(r => r.json());
  await chrome.storage.local.set({ userData: fresh });
  render(fresh);
}
```

## Stale-While-Revalidate

Show stale cached data while fetching fresh data in the background:

```typescript
async function swrLoad(key, fetcher) {
  const cached = await chrome.storage.local.get(key);
  if (cached[key]) render(cached[key]);

  fetcher().then(fresh => {
    chrome.storage.local.set({ [key]: fresh });
    render(fresh);
  });
}
```

## Skeleton Screens

Show a layout placeholder while loading to perceived performance:

```typescript
function renderSkeleton() {
  document.body.innerHTML = `
    <div class="skeleton-card">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text short"></div>
    </div>
  `;
}
```

## Abort on Close

Cancel pending requests when the popup closes using `AbortController`:

```typescript
const controller = new AbortController();

window.addEventListener('unload', () => controller.abort());

async function loadData() {
  const resp = await fetch('/api/data', { signal: controller.signal });
  const data = await resp.json();
  render(data);
}
```

## Loading Priority

Load critical data first, defer secondary data:

```typescript
async function loadAll() {
  // Priority 1: Critical (user info, settings)
  const user = await loadUser(); // Show UI once ready
  
  // Priority 2: Secondary (notifications, recent activity)
  loadNotifications(); // Load in background
  
  // Priority 3: Tertiary (analytics, preferences)
  loadAnalytics(); // Load last, don't block
}
```

## Debounced Search

For search functionality, debounce requests:

```typescript
let debounceTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => search(e.target.value), 300);
});
```

## Timeout Handling

Show an error if data doesn't load within a timeout:

```typescript
async function loadWithTimeout(ms = 5000) {
  const data = await Promise.race([
    fetchData(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
  
  if (!data) showError('Failed to load data');
  return data;
}
```

## Empty States

Provide friendly messages when no data is available:

```typescript
function renderEmpty() {
  container.innerHTML = `
    <div class="empty-state">
      <p>No items yet</p>
      <button>Add your first item</button>
    </div>
  `;
}
```

## Error States

Show meaningful errors when data unavailable:

```typescript
function showError(message) {
  container.innerHTML = `
    <div class="error-state">
      <p>⚠️ ${message}</p>
      <button onclick="retry()">Try Again</button>
    </div>
  `;
}
```

## Pagination

Load data in pages for large lists:

```typescript
async function loadPage(page = 1) {
  const PAGE_SIZE = 20;
  const data = await fetch(`/api/items?page=${page}&size=${PAGE_SIZE}`);
  render(data.items);
  
  if (data.hasMore) {
    loadMoreButton.onclick = () => loadPage(page + 1);
  }
}
```

## Background Prefetching

Use the service worker to prepare data before the popup opens:

```typescript
// In service worker
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onMessage.addListener(async (msg) => {
      if (msg.prefetch) {
        const data = await fetchFreshData();
        port.postMessage({ prefetchedData: data });
      }
    });
  }
});
```

## Best Practices Summary

1. **Always show cached data first** - Perceived performance matters
2. **Background refresh** - Don't block UI on network requests
3. **Skeleton screens** - Prevent layout shift
4. **Handle errors gracefully** - Users should always see something useful
5. **Abort stale requests** - Prevent memory leaks and wasted bandwidth
6. **Debounce search** - Reduce unnecessary API calls

## Related Patterns

- [Popup Communication Patterns](./popup-communication.md) - Message passing between popup and background
- [Caching Strategies](./caching-strategies.md) - Advanced caching patterns
- [Popup Patterns Guide](../guides/popup-patterns.md) - Comprehensive popup development guide
