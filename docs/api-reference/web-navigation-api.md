---
layout: default
title: "Chrome Web Navigation API Complete Reference"
description: "The Chrome Web Navigation API tracks navigation events in tabs with detailed lifecycle information, enabling extensions to monitor and respond to page loads and frame updates."
canonical_url: "https://bestchromeextensions.com/api-reference/web-navigation-api/"
---

# chrome.webNavigation API Reference

The `chrome.webNavigation` API provides methods to track navigation events in tabs. It offers detailed insight into the navigation lifecycle, enabling extensions to monitor and respond to page loads, frame updates, and navigation errors.

## Overview {#overview}
- **Purpose**: Track navigation events in tabs with detailed lifecycle information
- **Permission required**: `"webNavigation"` in manifest
- **Availability**: All Chrome extension contexts (background, popup, content scripts via connection)

## Manifest Declaration {#manifest-declaration}
```json
{
  "permissions": [
    "webNavigation"
  ]
}
```

## API Methods {#api-methods}

### chrome.webNavigation.getFrame(details) {#chromewebnavigationgetframedetails}
Retrieves information about a specific frame in a tab. Frames are identified by `tabId` and `frameId`.

```typescript
const frameInfo = await chrome.webNavigation.getFrame({
  tabId: 123,
  frameId: 0
});

console.log(frameInfo);
// {
//   tabId: 123,
//   frameId: 0,
//   url: "https://example.com/",
//   documentId: "abc123",
//   parentFrameId: -1
// }
```

### chrome.webNavigation.getAllFrames(details) {#chromewebnavigationgetallframesdetails}
Retrieves information about all frames in a tab.

```typescript
const allFrames = await chrome.webNavigation.getAllFrames({ tabId: 123 });

allFrames.forEach(frame => {
  console.log(`Frame ${frame.frameId}: ${frame.url}`);
});
```

Returns an array of frame objects, each containing:
- `frameId`: Unique identifier for the frame (0 = main frame)
- `parentFrameId`: ID of parent frame (-1 for main frame)
- `url`: URL of the frame
- `documentId`: Unique document identifier (Chrome 106+)

## Navigation Events (In Order) {#navigation-events-in-order}

The navigation lifecycle fires events in a specific order as a page loads:

### 1. onBeforeNavigate {#1-onbeforenavigate}
Fires when navigation is about to begin. This is the earliest event in the navigation lifecycle.

```typescript
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  console.log("Navigation starting:", details.url);
}, { url: [{ hostSuffix: "example.com" }] });
```

### 2. onCommitted {#2-oncommitted}
Fires when the navigation is committed—the browser has decided to load the new document. The server response has been received.

```typescript
chrome.webNavigation.onCommitted.addListener((details) => {
  console.log("Navigation committed:", details.url);
  console.log("Transition type:", details.transitionType);
});
```

### 3. onDOMContentLoaded {#3-ondomcontentloaded}
Fires when the DOM is fully parsed, but external resources may still be loading.

```typescript
chrome.webNavigation.onDOMContentLoaded.addListener((details) => {
  console.log("DOM parsed:", details.url);
});
```

### 4. onCompleted {#4-oncompleted}
Fires when the page and all its resources (images, scripts, etc.) are fully loaded.

```typescript
chrome.webNavigation.onCompleted.addListener((details) => {
  console.log("Page fully loaded:", details.url);
});
```

## Additional Events {#additional-events}

### onCreatedNavigationTarget {#oncreatednavigationtarget}
Fires when a new tab or window is opened (e.g., via link with target="_blank").

```typescript
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  console.log("New tab/window created:", details.url);
  console.log("Source tab:", details.sourceTabId);
  console.log("New tab ID:", details.tabId);
});
```

### onReferenceFragmentUpdated {#onreferencefragmentupdated}
Fires when the fragment identifier (hash) of a URL changes.

```typescript
chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  console.log("Hash changed:", details.url);
  console.log("Transition type:", details.transitionType);
});
```

### onTabReplaced {#ontabreplaced}
Fires when a tab is replaced by another (commonly due to prerendering or Chrome's back-forward cache).

```typescript
chrome.webNavigation.onTabReplaced.addListener((details) => {
  console.log("Tab replaced:");
  console.log("Replaced tab:", details.replacedTabId);
  console.log("New tab:", details.tabId);
});
```

### onHistoryStateUpdated {#onhistorystateupdated}
Fires when the history state is changed via `pushState` or `replaceState` (SPA navigation).

```typescript
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log("SPA navigation:", details.url);
  console.log("Transition type:", details.transitionType);
});
```

### onErrorOccurred {#onerroroccurred}
Fires when a navigation error occurs.

```typescript
chrome.webNavigation.onErrorOccurred.addListener((details) => {
  console.error("Navigation error:", details.error);
  console.error("Failed URL:", details.url);
});
```

## Transition Types {#transition-types}

The `transitionType` property describes how the navigation was initiated:

| Type | Description |
|------|-------------|
| `"link"` | User clicked a link |
| `"typed"` | User typed URL in address bar |
| `"auto_bookmark"` | User selected from bookmark bar |
| `"auto_subframe"` | Automatic navigation in subframe |
| `"generated"` | Generated from search engine |
| `"form_submit"` | Form submission |
| `"reload"` | Page reload |
| `"keyword"` | Keyword from address bar |

## Event Filtering {#event-filtering}

All event listeners support filtering to reduce unnecessary callbacks:

```typescript
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    console.log("Page loaded:", details.url);
  },
  {
    url: [
      { hostSuffix: ".example.com" },
      { hostSuffix: ".example.org", schemes: ["https"] }
    ]
  }
);
```

Filter properties include:
- `url`: Array of UrlFilter objects (supports hostSuffix, hostEquals, pathPrefix, schemes, etc.)

## Frame Details {#frame-details}

### Frame IDs {#frame-ids}
- `frameId: 0` = Main (top-level) frame
- `frameId > 0` = Subframes (iframes)

### documentId {#documentid}
Introduced in Chrome 106+, `documentId` provides a unique identifier for each document instance. This is more reliable than URL for tracking specific page loads, especially with SPAs.

```typescript
chrome.webNavigation.onCompleted.addListener((details) => {
  console.log("Document ID:", details.documentId);
  console.log("Parent Document ID:", details.parentDocumentId);
});
```

## Code Examples {#code-examples}

### Track all navigation events for a tab {#track-all-navigation-events-for-a-tab}
```typescript
const tabId = 123;

const events = ['onBeforeNavigate', 'onCommitted', 'onDOMContentLoaded', 'onCompleted'];

events.forEach(eventName => {
  chrome.webNavigation[eventName].addListener(
    (details) => {
      if (details.tabId === tabId) {
        console.log(`${eventName}:`, details.url);
      }
    }
  );
});
```

### Filter to specific domains {#filter-to-specific-domains}
```typescript
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    console.log("Target page loaded:", details.url);
  },
  {
    url: [
      { hostSuffix: "example.com", pathPrefix: "/app" }
    ]
  }
);
```

### Detect SPA navigation via onHistoryStateUpdated {#detect-spa-navigation-via-onhistorystateupdated}
```typescript
// Track client-side routing in SPAs
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.transitionType === "link" || details.transitionType === "typed") {
    console.log("SPA route change to:", details.url);
  }
});
```

### Monitor new tab creation {#monitor-new-tab-creation}
```typescript
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  console.log(`Opened ${details.url} in tab ${details.tabId}`);
  // Track: new tabs opened from your extension
});
```

## Cross-References {#cross-references}
- [Web Navigation Guide](../guides/web-navigation.md)
- [Web Navigation Advanced](../guides/web-navigation-advanced.md)
- [Permissions: webNavigation](../permissions/webNavigation.md)
## Frequently Asked Questions

### How do I track page loads?
Use chrome.webNavigation.onCompleted.addListener to be notified when a page finishes loading.

### Can I get the transition type?
Yes, the navigation event includes a transitionType property (like "link", "typed", "bookmark").

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
