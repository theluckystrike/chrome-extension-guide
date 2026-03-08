---
layout: default
title: "Chrome Extension Web Navigation — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/web-navigation/"
---
# Web Navigation API Guide

## Overview
- Requires `"webNavigation"` permission
- Track page navigation lifecycle across all tabs and frames
- Powerful URL filtering to listen only to specific sites

## Navigation Events (in order)
```javascript
// 1. Before navigation starts
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // details: { tabId, url, frameId, parentFrameId, timeStamp, frameType }
  console.log(`Tab ${details.tabId} navigating to ${details.url}`);
});

// 2. Navigation committed (response received, document loading)
chrome.webNavigation.onCommitted.addListener((details) => {
  // details includes transitionType and transitionQualifiers
  console.log(`Committed: ${details.url}, transition: ${details.transitionType}`);
});

// 3. DOM content loaded
chrome.webNavigation.onDOMContentLoaded.addListener((details) => {
  console.log(`DOM ready: ${details.url}`);
});

// 4. Page fully loaded
chrome.webNavigation.onCompleted.addListener((details) => {
  console.log(`Completed: ${details.url}`);
});

// Error occurred during navigation
chrome.webNavigation.onErrorOccurred.addListener((details) => {
  console.log(`Error: ${details.url}, error: ${details.error}`);
});
```

## URL Filtering
```javascript
// Only listen to specific URLs (evaluated in browser — efficient)
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    console.log('Google page loaded:', details.url);
  },
  {
    url: [
      { hostSuffix: '.google.com' },
      { hostEquals: 'google.com' },
      { urlPrefix: 'https://developer.chrome.com/' },
      { urlMatches: '.*\\.github\\.io/.*' },  // regex
      { schemes: ['https'] }
    ]
  }
);
```

### Filter Properties
- `hostContains`, `hostEquals`, `hostPrefix`, `hostSuffix`
- `pathContains`, `pathEquals`, `pathPrefix`, `pathSuffix`
- `queryContains`, `queryEquals`, `queryPrefix`, `querySuffix`
- `urlContains`, `urlEquals`, `urlPrefix`, `urlSuffix`, `urlMatches`
- `schemes` (array of scheme strings)
- `ports` (array of port numbers or ranges)

## Frame Navigation
```javascript
// Track frame hierarchy
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    console.log('Main frame navigation:', details.url);
  } else {
    console.log(`Subframe ${details.frameId} in tab ${details.tabId}:`, details.url);
    console.log('Parent frame:', details.parentFrameId);
  }
});

// Get all frames in a tab
chrome.webNavigation.getAllFrames({ tabId: tabId }, (frames) => {
  frames.forEach(frame => {
    console.log(`Frame ${frame.frameId}: ${frame.url} (parent: ${frame.parentFrameId})`);
  });
});
```

## Transition Types
- `"link"` — clicked a link
- `"typed"` — typed in address bar
- `"auto_bookmark"` — from bookmark
- `"auto_subframe"` — automatic iframe load
- `"manual_subframe"` — user-initiated iframe navigation
- `"generated"` — from omnibox suggestion
- `"start_page"` — start/home page
- `"form_submit"` — form submission
- `"reload"` — page reload
- `"keyword"` — omnibox keyword
- `"keyword_generated"` — search keyword result

## SPA Navigation Detection
```javascript
// Detect History API navigation (pushState/replaceState)
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log('SPA navigation:', details.url);
  // Fires when page uses history.pushState or history.replaceState
});

// Detect hash/fragment changes
chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  console.log('Hash changed:', details.url);
});

// New tab created by a navigation (window.open, target="_blank")
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  console.log(`Tab ${details.sourceTabId} opened new tab ${details.tabId}: ${details.url}`);
});

// Tab replaced (prerender or instant)
chrome.webNavigation.onTabReplaced.addListener((details) => {
  console.log(`Tab ${details.replacedTabId} replaced by ${details.tabId}`);
});
```

## Tracking Page Visits
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  visitLog: 'string'  // JSON: Array<{ url, title, timestamp, transition }>
}), 'local');

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return; // Main frame only
  const raw = await storage.get('visitLog');
  const log = raw ? JSON.parse(raw) : [];
  log.unshift({ url: details.url, timestamp: details.timeStamp });
  await storage.set('visitLog', JSON.stringify(log.slice(0, 500)));
});
```

## webNavigation vs tabs.onUpdated
| Feature | webNavigation | tabs.onUpdated |
|---------|--------------|----------------|
| Frame info | Yes (frameId, parentFrameId) | No |
| URL filtering | Built-in, efficient | Manual in callback |
| Transition type | Yes | No |
| SPA detection | onHistoryStateUpdated | status: "loading" |
| Permission | `webNavigation` | `tabs` |
| Event granularity | 7+ events per navigation | 1-2 per navigation |

## Common Mistakes
- Forgetting `frameId === 0` check — events fire for ALL frames
- Not handling SPA navigations (onHistoryStateUpdated)
- Ignoring `onErrorOccurred` — failed navigations still matter
- Heavy processing in event handlers slowing navigation
- Not using URL filters (processing every navigation is wasteful)

## Related Articles

- [Web Navigation API](../api-reference/web-navigation-api.md)
- [URL Handling](../patterns/navigation-url-handling.md)
