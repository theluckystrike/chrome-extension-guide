---
layout: default
title: "Chrome Extension Throttle Debounce Extensions — Best Practices"
description: "Throttle and debounce events in extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/throttle-debounce-extensions/"
---

# Throttle and Debounce Patterns for Chrome Extensions

Chrome extensions face unique performance challenges that require throttle and debounce patterns. Storage writes, API calls, DOM mutations, and message passing can overwhelm the extension if left uncontrolled. This guide covers implementations optimized for extension contexts, especially service workers.

## Why Throttle and Debounce Matter in Extensions {#why-throttle-and-debounce-matter-in-extensions}

Unlike regular web apps, extensions run in multiple contexts (popup, background, content scripts) with independent lifecycles. Uncontrolled operations can cause:
- Excessive storage writes hitting quota limits
- API rate limiting or account bans
- UI jank in content scripts
- Service worker wake-ups draining battery
- Message channel congestion between contexts

## Debounce Patterns {#debounce-patterns}

Debounce delays execution until after a quiet period. Use when: user stops typing, series of rapid events should be batched.

### Debounced Storage Writer {#debounced-storage-writer}

```javascript
// utils/debounce.js - Simple debounce implementation
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// In options page - wait for user to stop typing before saving
const saveSettings = debounce((settings) => {
  chrome.storage.local.set({ settings });
}, 500);

// User typing in form inputs
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('input', () => {
    saveSettings({ value: input.value });
  });
});
```

### Search-as-You-Type in Popup {#search-as-you-type-in-popup}

```javascript
// popup/search.js
const search = debounce(async (query) => {
  const results = await fetch(`/api/search?q=${query}`).then(r => r.json());
  renderResults(results);
}, 300);

document.getElementById('search').addEventListener('input', (e) => {
  search(e.target.value);
});
```

## Throttle Patterns {#throttle-patterns}

Throttle limits execution frequency. Use when: need regular updates but not on every event.

### Throttled DOM Observations {#throttled-dom-observations}

```javascript
// content script - throttled DOM mutation observer
function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

const observer = new MutationObserver(throttle((mutations) => {
  // Process batch of mutations
  handleMutations(mutations);
}, 100));

observer.observe(document.body, { childList: true, subtree: true });
```

### Throttled Badge Updates {#throttled-badge-updates}

```javascript
// background script - rate-limited badge updates
const updateBadge = throttle((count) => {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
}, 1000);

// Called frequently from content scripts
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'UPDATE_COUNT') {
    updateBadge(msg.count);
  }
});
```

### Throttled API Polling {#throttled-api-polling}

```javascript
// background script - limited API check frequency
const pollAPI = throttle(async () => {
  const data = await fetchLatestData();
  chrome.storage.local.set({ cachedData: data });
}, 60000); // Max once per minute

chrome.alarms.create('poll', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'poll') pollAPI();
});
```

## Service Worker Timer Considerations {#service-worker-timer-considerations}

Service workers have unique constraints - `setTimeout` may not fire if the worker is suspended.

### Use Chrome Alarms for > 30 Second Delays {#use-chrome-alarms-for-30-second-delays}

```javascript
// ❌ setTimeout may not fire when service worker is idle
setTimeout(doWork, 60000); // Unreliable

// ✅ Use chrome.alarms for reliable timing
chrome.alarms.create('work', { delayInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'work') doWork();
});
```

### Debouncing chrome.storage.onChanged {#debouncing-chromestorageonchanged}

```javascript
// Batch rapid storage changes
const handleStorageChange = debounce((changes, area) => {
  // Process all changes at once
  Object.entries(changes).forEach(([key, { newValue }]) => {
    handleKeyChange(key, newValue);
  });
}, 100);

chrome.storage.onChanged.addListener((changes, area) => {
  handleStorageChange(changes, area);
});
```

## Cross-Context Message Throttling {#cross-context-message-throttling}

Message passing between extension contexts needs throttling to prevent congestion.

```javascript
// Batched message sender
class BatchedMessenger {
  constructor(destination, batchSize = 10) {
    this.queue = [];
    this.destination = destination;
    this.batchSize = batchSize;
  }

  send(message) {
    this.queue.push(message);
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 50);
    }
  }

  flush() {
    clearTimeout(this.flushTimer);
    this.flushTimer = null;
    if (this.queue.length > 0) {
      chrome.runtime.sendMessage(this.destination, this.queue);
      this.queue = [];
    }
  }
}
```

## RequestAnimationFrame for Visual Updates {#requestanimationframe-for-visual-updates}

In content scripts, use `requestAnimationFrame` for smooth visual updates:

```javascript
let pendingUpdate = null;

function scheduleUpdate(state) {
  if (!pendingUpdate) {
    pendingUpdate = requestAnimationFrame(() => {
      updateUI(state);
      pendingUpdate = null;
    });
  }
}
```

## Quick Reference {#quick-reference}

| Pattern | Use Case | Typical Delay |
|---------|----------|---------------|
| Debounce | Storage writes, search | 200-500ms |
| Throttle | API polls, badge updates | 1000ms+ |
| RAF | Visual updates | Per frame |
| Alarms | Long delays in SW | > 30s |

## Related Guides {#related-guides}

- [Performance Guide](../guides/performance.md)
- [Rate Limiting Patterns](./rate-limiting.md)
- [Service Worker Lifecycle](../guides/service-worker-lifecycle.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
