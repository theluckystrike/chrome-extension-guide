---
layout: default
title: "Chrome Extension Declarative Content. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/declarative-content/"
---
# Declarative Content API Guide

Overview {#overview}
- Show/hide extension action icon based on page content
- No need to read page data. rules evaluated by browser
- Requires `"declarativeContent"` permission
- More performant than using `chrome.tabs.onUpdated`

Basic Setup: Show Icon on Matching Pages {#basic-setup-show-icon-on-matching-pages}
```javascript
// Disable icon by default
chrome.action.disable();
Chrome Declarative Content API

The Chrome Declarative Content API enables extensions to react to page state changes without requiring access to page content. Instead of actively polling or injecting scripts to check conditions, you define declarative rules that the browser evaluates efficiently.

Overview

The Declarative Content API is part of Chrome's declarative net Request API family, designed for extensions that need to:
- Show or hide the extension action based on page characteristics
- Modify the extension icon dynamically
- Conditionally inject content scripts

Key advantages over imperative approaches:
- No active content script injection to check page state
- Rules evaluated by the browser, not extension JavaScript
- Reduced permission requirements (no host permissions needed for content access)
- Better performance through browser-level optimization

Reference: [developer.chrome.com/docs/extensions/reference/api/declarativeContent](https://developer.chrome.com/docs/extensions/reference/api/declarativeContent)

Required Permissions

Add `"declarativeContent"` to your `manifest.json`:

```json
{
  "permissions": [
    "declarativeContent"
  ]
}
```

PageStateMatcher Conditions {#pagestatematcher-conditions}

URL Matching {#url-matching}
The onPageChanged API

The `chrome.declarativeContent.onPageChanged` namespace provides the core functionality:

```javascript
// Event for registering rules
chrome.declarativeContent.onPageChanged

// Methods
chrome.declarativeContent.onPageChanged.addRules(rules)
chrome.declarativeContent.onPageChanged.removeRules(ruleIdentifiers?)
chrome.declarativeContent.onPageChanged.getRules(ruleIdentifiers?, callback)
```

Rule Format

Rules consist of conditions and actions:

```javascript
{
  conditions: [
    // One or more PageStateMatcher instances
    new chrome.declarativeContent.PageStateMatcher({ ... })
  ],
  actions: [
    // One or more declarative actions
    new chrome.declarativeContent.ShowAction()
  ]
}
```

When ALL conditions in a rule are met, ALL actions are executed.

PageStateMatcher

`PageStateMatcher` defines when a rule should trigger. It can match by URL or CSS selectors.

URL-Based Matching

```javascript
// Match specific host
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { hostEquals: 'example.com' }
})

// Match host and subdomains
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { hostSuffix: '.example.com' }
})

// Match URL prefix
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { urlPrefix: 'https://docs.google.com/spreadsheets' }
})

// Match by path
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { pathPrefix: '/api/v1/' }
})

// Match by query parameter
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { queryContains: 'utm_source' }
})

// Match by URL pattern (regex)
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { urlMatches: '\\.pdf$' }
})

// Combine multiple conditions (AND logic)
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: {
    hostEquals: 'github.com',
    pathPrefix: '/issues/',
    schemes: ['https']
  }
})
```

URL Filter Properties {#url-filter-properties}
- `hostEquals`, `hostContains`, `hostPrefix`, `hostSuffix`
- `pathEquals`, `pathContains`, `pathPrefix`, `pathSuffix`
- `queryEquals`, `queryContains`, `queryPrefix`, `querySuffix`
- `urlEquals`, `urlContains`, `urlPrefix`, `urlSuffix`, `urlMatches`
- `schemes` (array), `ports` (array of numbers or ranges)

CSS Selector Matching {#css-selector-matching}
CSS Selector Matching

Match pages containing specific DOM elements:

```javascript
// Show icon when page has any video element
new chrome.declarativeContent.PageStateMatcher({
  css: ['video']
})

// Match password input fields
new chrome.declarativeContent.PageStateMatcher({
  css: ['input[type="password"]']
})

// Multiple selectors (AND - ALL must match)
new chrome.declarativeContent.PageStateMatcher({
  css: ['.login-form', 'input[type="password"]']
})

// Combine URL and CSS
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { hostSuffix: '.youtube.com' },
  css: ['video']
})
```

Available Actions {#available-actions}

ShowAction {#showaction}
CSS matching is evaluated against the page's DOM. The extension doesn't need host permissions to use CSS selectors.

Available Actions

ShowAction

Show the extension action (icon) when conditions are met:

```javascript
// First, disable the action by default in your background script
chrome.action.disable();

// Then add the rule
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostEquals: 'developer.chrome.com' }
        })
      ],
      actions: [
        new chrome.declarativeContent.ShowAction()
      ]
    }
  ]);
});
```

SetIcon {#seticon}
SetIcon

Dynamically change the icon based on page context:

```javascript
// Using ImageData objects
new chrome.declarativeContent.SetIcon({
  imageData: {
    19: imageData19px,
    38: imageData38px,
    128: imageData128px
  }
})

// Generating icons with OffscreenCanvas
function createIconData(color, size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, 2 * Math.PI);
  ctx.fill();
  
  return ctx.getImageData(0, 0, size, size);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostSuffix: '.github.com' }
        })
      ],
      actions: [
        new chrome.declarativeContent.SetIcon({
          imageData: {
            19: createIconData('#4CAF50', 19),
            38: createIconData('#4CAF50', 38)
          }
        })
      ]
    }
  ]);
});
```

RequestContentScript

>  Experimental: This action is not available on stable Chrome builds. Use `chrome.scripting.executeScript` instead.

```javascript
// NOT AVAILABLE ON STABLE - for reference only
new chrome.declarativeContent.RequestContentScript({
  js: ['content-script.js'],
  css: ['styles.css'],
  runAt: 'document_idle'
})
```

Using with activeTab Permission

The `activeTab` permission provides temporary tab access when the user clicks your extension icon. Combined with declarativeContent, you get the best of both worlds:

```javascript
// manifest.json
{
  "permissions": [
    "declarativeContent",
    "activeTab"
  ]
}
```

```javascript
// Background script
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostSuffix: 'example.com' },
          css: ['.interactive-element']
        })
      ],
      actions: [
        // Show icon only when conditions are met
        new chrome.declarativeContent.ShowAction()
      ]
    }
  ]);
});

// Popup or background script can now use activeTab
// to get temporary access when user clicks the icon
chrome.action.onClicked.addListener(async (tab) => {
  // This works because of activeTab permission
  // but only after user interaction
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => console.log('User activated the extension!')
  });
});
```

Replacing tabs.onUpdated

The traditional approach using `tabs.onUpdated` has performance costs:

```javascript
//  Imperative approach - runs on EVERY tab update
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url?.includes('example.com')) {
    chrome.action.enable(tabId);
    // Now need another permission to check page content
  }
});
```

The declarative approach is more efficient:

```javascript
//  Declarative approach - browser handles evaluation
chrome.action.disable(); // Default: hidden

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostSuffix: 'example.com' }
        })
      ],
      actions: [
        new chrome.declarativeContent.ShowAction()
      ]
    }
  ]);
});
```

Declarative vs Imperative Approaches

| Aspect | Declarative | Imperative |
|--------|-------------|-------------|
| Performance | Browser-optimized, minimal CPU | JS runs on every event |
| Permissions | No host permission needed | Often needs host permissions |
| Service Worker | May not wake SW | Wakes SW on each event |
| Flexibility | Limited to defined matchers | Full JavaScript logic |
| CSS Matching | Built-in | Requires content script |
| Best For | Show/hide actions | Complex logic, dynamic behavior |

Performance Benefits

1. Browser-Level Evaluation: The browser evaluates rules internally, not in extension JavaScript
2. No Content Scripts for Detection: CSS selectors are evaluated without injecting scripts
3. Efficient Updates: Only triggers when conditions actually change
4. No Service Worker Wake-ups: Rules can execute without activating the service worker (for ShowAction and SetIcon)
5. Memory Efficient: No need to keep content scripts active for detection

Building a Context-Aware Extension

Here's a practical example that shows different icons based on page context:

```javascript
// Complete example: GitHub-focused extension
chrome.action.disable();

chrome.runtime.onInstalled.addListener(() => {
  // Rule 1: Show icon on any GitHub page
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostSuffix: 'github.com' }
        })
      ],
      actions: [
        new chrome.declarativeContent.SetIcon({
          imageData: createIconData('#24292e', 38)
        }),
        new chrome.declarativeContent.ShowAction()
      ]
    },
    // Rule 2: Special icon on repos with issues
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { 
            hostSuffix: 'github.com',
            pathPrefix: '/issues'
          }
        })
      ],
      actions: [
        new chrome.declarativeContent.SetIcon({
          imageData: createIconData('#4CAF50', 38)
        })
      ]
    },
    // Rule 3: Special icon on PR pages
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { 
            hostSuffix: 'github.com',
            pathPrefix: '/pull'
          }
        })
      ],
      actions: [
        new chrome.declarativeContent.SetIcon({
          imageData: createIconData('#2196F3', 38)
        })
      ]
    }
  ]);
});

function createIconData(color, size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}
```

RequestContentScript (Experimental -- not available on stable builds) {#requestcontentscript-experimental-not-available-on-stable-builds}
```javascript
// Inject content script when conditions match (experimental, not on stable Chrome)
new chrome.declarativeContent.RequestContentScript({
  js: ['inject.js'],
  css: ['styles.css']
})
```

Multiple Rules {#multiple-rules}
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

Comparison: declarativeContent vs tabs.onUpdated {#comparison-declarativecontent-vs-tabsonupdated}
| Feature | declarativeContent | tabs.onUpdated |
|---------|-------------------|----------------|
| Performance | Rules evaluated by browser | Extension code runs per update |
| SW wake-up | No | Yes |
| CSS matching | Built-in | Need content script |
| Complexity | Simple rules | Full JS logic |
| Use case | Show/hide icon | Complex logic |

Common Mistakes {#common-mistakes}
- Forgetting to call `chrome.action.disable()` first. icon shows everywhere by default
- Not removing old rules before adding new ones (causes duplicates)
- Only setting rules in `onInstalled`. rules persist, but good practice to reset
- Using `RequestContentScript` in MV3 (not supported. use `chrome.scripting` instead)
- Missing `"declarativeContent"` in permissions array

Related Articles {#related-articles}

Related Articles

- [Declarative Content Patterns](../patterns/declarative-content-patterns.md)
- [Declarative Content Permission](../permissions/declarativeContent.md)
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
Best Practices

1. Always disable action by default: Call `chrome.action.disable()` before adding rules
2. Remove old rules: Use `removeRules(undefined, callback)` before adding new ones to avoid duplicates
3. Set rules in onInstalled: Ensures rules are registered when the extension loads
4. Combine conditions: Use multiple conditions when you need AND logic
5. Use multiple rules: Create separate rules for different conditions rather than complex single rules
6. Test CSS matching: Verify selectors work on target pages before shipping

Limitations

- Cannot directly execute arbitrary JavaScript (use `chrome.scripting` for that)
- `RequestContentScript` is experimental and unavailable on stable
- Rules don't persist across extension updates (re-register in `onInstalled`)
- Limited to URL and CSS matching (no XPath, no DOM access in conditions)

Migration from MV2 to MV3

In Manifest V2, `declarativeContent` actions work similarly, but note:
- Use `chrome.browserAction` instead of `chrome.action` for MV2
- The API behavior is essentially the same between versions
