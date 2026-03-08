---
layout: default
title: "Chrome Extension Declarative Content — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/declarative-content/"
---
# Declarative Content API Guide

## Overview {#overview}
- Show/hide extension action icon based on page content
- No need to read page data — rules evaluated by browser
- Requires `"declarativeContent"` permission
- More performant than using `chrome.tabs.onUpdated`

## Basic Setup: Show Icon on Matching Pages {#basic-setup-show-icon-on-matching-pages}
```javascript
// Disable icon by default
chrome.action.disable();

// Enable icon only on matching pages
chrome.runtime.onInstalled.addListener(() => {
  // Remove old rules, then add new ones
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'developer.chrome.com' }
          })
        ],
        actions: [new chrome.declarativeContent.ShowAction()]
      }
    ]);
  });
});
```

## PageStateMatcher Conditions {#pagestatematcher-conditions}

### URL Matching {#url-matching}
```javascript
// Match by host
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { hostEquals: 'example.com' }
})

// Match by host suffix (subdomains)
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { hostSuffix: '.github.com' }
})

// Match by URL prefix
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { urlPrefix: 'https://docs.google.com/spreadsheets' }
})

// Match by scheme
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { schemes: ['https'] }
})

// Combine conditions (AND)
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: {
    hostEquals: 'example.com',
    pathPrefix: '/api/',
    schemes: ['https']
  }
})
```

### URL Filter Properties {#url-filter-properties}
- `hostEquals`, `hostContains`, `hostPrefix`, `hostSuffix`
- `pathEquals`, `pathContains`, `pathPrefix`, `pathSuffix`
- `queryEquals`, `queryContains`, `queryPrefix`, `querySuffix`
- `urlEquals`, `urlContains`, `urlPrefix`, `urlSuffix`, `urlMatches`
- `schemes` (array), `ports` (array of numbers or ranges)

### CSS Selector Matching {#css-selector-matching}
```javascript
// Match pages that contain specific CSS selectors
new chrome.declarativeContent.PageStateMatcher({
  css: ['video', 'input[type="password"]']
  // Icon shows when page has <video> AND password inputs
})

// Combine URL and CSS
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { hostSuffix: '.youtube.com' },
  css: ['video']
})
```

## Available Actions {#available-actions}

### ShowAction {#showaction}
```javascript
// Show the extension icon (default: hidden with chrome.action.disable())
new chrome.declarativeContent.ShowAction()
```

### SetIcon {#seticon}
```javascript
// Change icon based on page
new chrome.declarativeContent.SetIcon({
  imageData: {
    19: getImageData(19),
    38: getImageData(38)
  }
})

// Using canvas to generate imageData
function getImageData(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}
```

### RequestContentScript (Experimental -- not available on stable builds) {#requestcontentscript-experimental-not-available-on-stable-builds}
```javascript
// Inject content script when conditions match (experimental, not on stable Chrome)
new chrome.declarativeContent.RequestContentScript({
  js: ['inject.js'],
  css: ['styles.css']
})
```

## Multiple Rules {#multiple-rules}
```javascript
chrome.declarativeContent.onPageChanged.addRules([
  {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostEquals: 'github.com' }
      }),
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostEquals: 'gitlab.com' }
      })
    ],
    actions: [new chrome.declarativeContent.ShowAction()]
  },
  {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        css: ['video']
      })
    ],
    actions: [new chrome.declarativeContent.ShowAction()]
  }
]);
```

## Comparison: declarativeContent vs tabs.onUpdated {#comparison-declarativecontent-vs-tabsonupdated}
| Feature | declarativeContent | tabs.onUpdated |
|---------|-------------------|----------------|
| Performance | Rules evaluated by browser | Extension code runs per update |
| SW wake-up | No | Yes |
| CSS matching | Built-in | Need content script |
| Complexity | Simple rules | Full JS logic |
| Use case | Show/hide icon | Complex logic |

## Common Mistakes {#common-mistakes}
- Forgetting to call `chrome.action.disable()` first — icon shows everywhere by default
- Not removing old rules before adding new ones (causes duplicates)
- Only setting rules in `onInstalled` — rules persist, but good practice to reset
- Using `RequestContentScript` in MV3 (not supported — use `chrome.scripting` instead)
- Missing `"declarativeContent"` in permissions array

## Related Articles {#related-articles}

## Related Articles

- [Declarative Content Patterns](../patterns/declarative-content-patterns.md)
- [Declarative Content Permission](../permissions/declarativeContent.md)
