---
layout: default
title: "Chrome Extension Webnavigation Patterns. Best Practices"
description: "Use webNavigation API for advanced navigation tracking."
canonical_url: "https://bestchromeextensions.com/patterns/webnavigation-patterns/"
---

Web Navigation API Patterns

The `chrome.webNavigation` API provides powerful capabilities for monitoring and analyzing navigation events in Chrome extensions. This document covers advanced patterns for working with this API effectively.

Event Sequence {#event-sequence}

Navigation events fire in a predictable sequence:

1. `onBeforeNavigate` - Fired when navigation is about to occur
2. `onCommitted` - When the document begins loading (response received)
3. `onDOMContentLoaded` - DOM is parsed, stylesheets/images may still be loading
4. `onCompleted` - Page fully loaded (all resources fetched)

```javascript
chrome.webNavigation.onCompleted.addListener((details) => {
  console.log(`Page loaded: ${details.url} in ${details.timeStamp}`);
});
```

Frame Tracking {#frame-tracking}

- `frameId: 0` - Main/top-level frame
- `frameId > 0` - Subframes (iframes, frames)

```javascript
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    console.log(`Main frame navigation: ${details.url}`);
  } else {
    console.log(`Subframe navigation in frame ${details.frameId}: ${details.url}`);
  }
});
```

URL Filtering {#url-filtering}

Use the `filters` parameter to receive only events matching specific URLs:

```javascript
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    console.log(`Navigation to: ${details.url}`);
  },
  { url: [{ urlContains: 'example.com' }, { urlMatches: '.*\\.google\\.com.*' }] }
);
```

SPA Detection {#spa-detection}

Single Page Applications (SPAs) don't trigger full page loads. Use these events:

- `onHistoryStateUpdated` - `pushState` / `replaceState` called
- `onReferenceFragmentUpdated` - Hash fragment changed

```javascript
// SPA Router Detector
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log(`SPA route change: ${details.url} (transitionType: ${details.transitionType})`);
}, { url: [{ schemes: ['https'] }] });

chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  console.log(`Hash change: ${details.url}`);
});
```

Error Detection {#error-detection}

Track failed navigations:

```javascript
chrome.webNavigation.onErrorOccurred.addListener((details) => {
  console.error(`Navigation error in ${details.frameId === 0 ? 'main' : 'subframe'}: ${details.url}`);
  console.error(`Error: ${details.error}`);
});
```

Tab Navigation Tracking {#tab-navigation-tracking}

Combine with the `chrome.tabs` API for complete navigation tracking:

```javascript
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) {
    const tab = await chrome.tabs.get(details.tabId);
    console.log(`Final URL: ${tab.url}, Title: ${tab.title}`);
  }
});
```

Transition Types {#transition-types}

The `transitionType` property indicates how navigation was initiated:

| Type | Description |
|------|-------------|
| `link` | Clicked a link |
| `typed` | URL typed in address bar |
| `auto_bookmark` | Bookmark or menu selection |
| `auto_subframe` | Automatic iframe navigation |
| `manual_subframe` | User-initiated iframe navigation |
| `generated` | Omnibox suggestion |
| `startup` | Startup page |
| `form_submit` | Form submission |
| `reload` | Page reload |
| `keyword` | Keyword navigation |

Transition Qualifiers {#transition-qualifiers}

Additional qualifiers modify the transition:

- `client_redirect`: JavaScript redirect
- `server_redirect`: HTTP redirect (301/302)
- `forward_back`: Forward/back button navigation
- `from_address_bar`: Address bar URL

```javascript
chrome.webNavigation.onCommitted.addListener((details) => {
  const { transitionType, transitionQualifiers } = details;
  console.log(`Navigation type: ${transitionType}, qualifiers: ${transitionQualifiers.join(', ')}`);
});
```

Frame Lifecycle {#frame-lifecycle}

Detect when new tabs or windows are created via navigation:

```javascript
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  console.log(`New tab/window created: ${details.url}`);
  console.log(`Source tab: ${details.sourceTabId}, Source frame: ${details.sourceFrameId}`);
});
```

Performance Monitoring {#performance-monitoring}

Measure time between navigation events:

```javascript
const navigationTimes = {};

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    navigationTimes[details.tabId] = { start: Date.now() };
  }
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0 && navigationTimes[details.tabId]) {
    const duration = Date.now() - navigationTimes[details.tabId].start;
    console.log(`Page load time: ${duration}ms`);
    delete navigationTimes[details.tabId];
  }
});
```

Conditional Content Script Injection {#conditional-content-script-injection}

Inject content scripts based on navigation patterns:

```javascript
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0 && details.url.includes('example.com')) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ['content-script.js']
    });
  }
});
```

Code Examples {#code-examples}

SPA Router Detector {#spa-router-detector}

```javascript
function detectSPANavigation() {
  const spRoutes = new Map();

  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    const tabId = details.tabId;
    if (!spRoutes.has(tabId)) {
      spRoutes.set(tabId, []);
    }
    spRoutes.get(tabId).push({ url: details.url, time: details.timeStamp });
    console.log(`SPA Route: ${details.url}`);
  });
}
```

Navigation Logger {#navigation-logger}

```javascript
chrome.webNavigation.onBeforeNavigate.addListener(d => log('beforeNavigate', d));
chrome.webNavigation.onCommitted.addListener(d => log('committed', d));
chrome.webNavigation.onDOMContentLoaded.addListener(d => log('domContentLoaded', d));
chrome.webNavigation.onCompleted.addListener(d => log('completed', d));

function log(event, details) {
  console.log(`[${event}] ${details.url} (tab: ${details.tabId}, frame: ${details.frameId})`);
}
```

Frame-Aware Content Injector {#frame-aware-content-injector}

```javascript
chrome.webNavigation.onCompleted.addListener((details) => {
  const Injector = {
    injectToMainFrame: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] },
        func: () => console.log('Injected to main frame')
      });
    },
    injectToAllFrames: (tabId) => {
      chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => console.log(`Injected to frame ${window.frameId}`)
      });
    }
  };

  details.frameId === 0 ? Injector.injectToMainFrame(details.tabId) : null;
});
```

See Also {#see-also}

- [Web Navigation API Reference](../api_reference/web-navigation-api.md)
- [Web Navigation Guide](../guides/web-navigation.md)
- [Web Navigation Advanced](../guides/web-navigation-advanced.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
