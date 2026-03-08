---
layout: default
title: "Chrome Extension Service Worker Event Handling — Best Practices"
description: "Handle service worker events properly."
---

# Service Worker Event Handling Best Practices

This document outlines essential patterns for handling events in Chrome Extension Manifest V3 service workers.

## Top-Level Listener Registration

**Critical Rule**: Always register all event listeners at the top level of your service worker file, not inside any function or event handler.

```javascript
// ✅ CORRECT: Top-level registration
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// ❌ WRONG: Registration inside onInstalled
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addListener(() => {
    // This listener may not be registered properly!
  });
});
```

### Why This Matters

Chrome records all event listeners during the service worker's first run. If you register listeners inside `onInstalled` or other handlers, they may not be properly registered, causing events to be missed.

## Async Event Handlers

Service workers must return promises for asynchronous operations. Chrome waits for all returned promises to resolve before considering the event handled.

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_DATA') {
    // Return the promise to keep the service worker alive
    return fetch(message.url)
      .then(response => response.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
  }
  return false; // Synchronous handler
});
```

For extended async work, use `self.registration.waitUntil()`:

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  self.registration.waitUntil(
    initializeExtension(details.reason)
  );
});

async function initializeExtension(reason) {
  // Async initialization logic here
}
```

## Multiple Listeners Per Event

You can register multiple listeners for the same event type:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  console.log('Listener 1: Extension installed');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Listener 2: Setting up defaults');
});
```

## Using Filters to Reduce Wake-ups

Filters allow you to specify which events your service worker should handle, reducing unnecessary wake-ups:

```javascript
// Only wake for navigation events in specific tabs
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    console.log('Page loaded:', details.url);
  },
  {
    url: [
      { hostSuffix: 'example.com' },
      { hostPrefix: 'www' }
    ]
  }
);
```

## Event Batching with chrome.declarativeNetRequest

For network events, use declarative rules to batch and process events efficiently:

```javascript
// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "allow" },
    "condition": { "urlFilter": "*.example.com", "resourceType": ["script"] }
  }
]
```

## Related Resources

- [MV3 Service Workers](../mv3/service-workers.md)
- [Event-Driven Architecture](../mv3/event-driven-architecture.md)
- [Service Worker Lifecycle](../guides/service-worker-lifecycle.md)
