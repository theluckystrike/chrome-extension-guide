# WebNavigation API Guide

The Chrome `webNavigation` API provides comprehensive navigation event tracking for browser extensions. This guide covers all events, methods, filtering, and practical implementation.

## Required Permission

```json
{ "permissions": ["webNavigation"] }
```

## Navigation Events

### onBeforeNavigate
Fires when navigation is about to start—earliest lifecycle event.

```javascript
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  console.log('Starting:', details.tabId, details.url, details.frameId);
}, { url: [{ hostSuffix: 'example.com' }] });
```

### onCommitted
Navigation committed—browser decided to load the new document.

```javascript
chrome.webNavigation.onCommitted.addListener((details) => {
  console.log('Committed:', details.url, details.transitionType);
});
```

### onDOMContentLoaded
DOM fully constructed, external resources may still load.

```javascript
chrome.webNavigation.onDOMContentLoaded.addListener((details) => {
  console.log('DOM ready:', details.url);
});
```

### onCompleted
Page and all resources fully loaded.

```javascript
chrome.webNavigation.onCompleted.addListener((details) => {
  console.log('Completed:', details.url);
});
```

### onErrorOccurred
Error during navigation.

```javascript
chrome.webNavigation.onErrorOccurred.addListener((details) => {
  console.error('Error:', details.url, details.error);
});
```

## SPA Navigation Events

### onHistoryStateUpdated
Fires for `history.pushState()` or `history.replaceState()` in SPAs.

```javascript
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log('SPA navigation:', details.url);
});
```

### onReferenceFragmentUpdated
URL fragment (hash) changes.

```javascript
chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  console.log('Hash changed:', details.url);
});
```

## Tab and Window Events

### onCreatedNavigationTarget
New tab/window via `window.open()` or `target="_blank"`.

```javascript
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  console.log('New tab:', details.sourceTabId, '->', details.tabId, details.url);
});
```

### onTabReplaced
Tab replaced by prerendering or back-forward cache.

```javascript
chrome.webNavigation.onTabReplaced.addListener((details) => {
  console.log('Tab replaced:', details.replacedTabId, '->', details.tabId);
});
```

## Frame Information Methods

### getFrame
Get details about a specific frame.

```javascript
chrome.webNavigation.getFrame({ tabId: tabId, frameId: frameId }, (frame) => {
  console.log(frame.url, frame.parentFrameId, frame.frameType);
});
```

### getAllFrames
Get all frames in a tab.

```javascript
chrome.webNavigation.getAllFrames({ tabId: tabId }, (frames) => {
  frames.forEach(f => console.log(`Frame ${f.frameId}:`, f.url));
});
```

## Transition Types

| Type | Description |
|------|-------------|
| `link` | Clicked a link |
| `typed` | Typed in address bar |
| `auto_bookmark` | From bookmark |
| `auto_subframe` | Automatic iframe |
| `manual_subframe` | User iframe navigation |
| `form_submit` | Form submission |
| `reload` | Page reload |
| `forward_back` | Forward/back button |

## Transition Qualifiers

```javascript
chrome.webNavigation.onCommitted.addListener((d) => {
  if (d.transitionQualifiers.includes('from_address_bar')) console.log('Address bar');
  if (d.transitionQualifiers.includes('client_side_redirect')) console.log('JS redirect');
});
```

## URL Filters

Efficient filtering reduces processing by matching in the browser:

```javascript
// Domain and subdomains
chrome.webNavigation.onCompleted.addListener(cb, { url: [{ hostSuffix: 'google.com' }] });
// Exact host
chrome.webNavigation.onCompleted.addListener(cb, { url: [{ hostEquals: 'docs.example.com' }] });
// URL prefix
chrome.webNavigation.onCompleted.addListener(cb, { url: [{ urlPrefix: 'https://docs/' }] });
// Regex
chrome.webNavigation.onCompleted.addListener(cb, { url: [{ urlMatches: '.*\\.github\\.io/.*' }] });
// Scheme
chrome.webNavigation.onCompleted.addListener(cb, { url: [{ schemes: ['https'] }] });
```

**Filter Properties:** `hostContains`, `hostEquals`, `hostPrefix`, `hostSuffix`, `pathContains`, `pathEquals`, `pathPrefix`, `pathSuffix`, `queryContains`, `urlContains`, `urlEquals`, `urlPrefix`, `urlSuffix`, `urlMatches`, `schemes`, `ports`

## Building a Navigation Tracker Extension

```javascript
// background.js
const navHistory = new Map();

chrome.webNavigation.onBeforeNavigate.addListener(d => {
  if (d.frameId !== 0) return;
  navHistory.set(d.tabId, { url: d.url, start: Date.now() });
  console.log('[before]', d.url);
});

chrome.webNavigation.onCommitted.addListener(d => {
  if (d.frameId !== 0) return;
  console.log('[committed]', d.url, d.transitionType);
});

chrome.webNavigation.onDOMContentLoaded.addListener(d => {
  if (d.frameId !== 0) return;
  console.log('[DOM]', d.url);
});

chrome.webNavigation.onCompleted.addListener(d => {
  if (d.frameId !== 0) return;
  const nav = navHistory.get(d.tabId);
  const ms = nav ? Date.now() - nav.start : 0;
  console.log('[complete]', d.url, `(${ms}ms)`);
});

chrome.webNavigation.onErrorOccurred.addListener(d => {
  console.error('[error]', d.url, d.error);
});

chrome.webNavigation.onHistoryStateUpdated.addListener(d => {
  console.log('[SPA]', d.url);
});

chrome.webNavigation.onReferenceFragmentUpdated.addListener(d => {
  console.log('[hash]', d.url);
});

chrome.webNavigation.onCreatedNavigationTarget.addListener(d => {
  console.log('[newTab]', d.tabId, d.url);
});

chrome.webNavigation.onTabReplaced.addListener(d => {
  console.log('[replaced]', d.replacedTabId, '->', d.tabId);
});
```

**Manifest:**
```json
{
  "manifest_version": 3,
  "name": "Nav Tracker",
  "permissions": ["webNavigation"],
  "background": { "service_worker": "background.js" }
}
```

## webNavigation vs tabs.onUpdated

| Feature | webNavigation | tabs.onUpdated |
|---------|--------------|----------------|
| Frame info | Yes | No |
| URL filtering | Built-in | Manual |
| Transition type | Yes | No |
| SPA events | Yes | No |
| Permission | `webNavigation` | `tabs` |

## Common Mistakes

- Not filtering by `frameId === 0` for main frame only
- Missing SPA navigation handling (onHistoryStateUpdated)
- Ignoring onErrorOccurred
- Heavy processing in event handlers
- Not using URL filters

## Reference

[developer.chrome.com/docs/extensions/reference/api/webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)

See also: [WebNavigation Advanced](./web-navigation-advanced.md)
