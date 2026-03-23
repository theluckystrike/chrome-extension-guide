---
layout: default
title: "Chrome Extension Declarative Content Patterns — Best Practices"
description: "Use Declarative Content API to trigger actions based on page content without host permissions."
canonical_url: "https://bestchromeextensions.com/patterns/declarative-content-patterns/"
---

# Declarative Content Patterns

This document covers advanced patterns for using `chrome.declarativeContent` to show the extension action icon only on pages that match specific conditions—without requiring content scripts to run.

## Overview {#overview}

The `chrome.declarativeContent` API allows extensions to trigger actions based on page characteristics detected by the browser, rather than by injecting content scripts. This is more efficient than using content scripts to detect elements and then messaging back to show the action.

## Core Concepts {#core-concepts}

### PageStateMatcher {#pagestatematcher}

The `PageStateMatcher` defines conditions for when a rule should activate:

```javascript
{
  // Match by URL patterns
  pageUrl: {
    hostEquals: 'example.com',
    pathContains: '/dashboard',
    schemes: ['https']
  },
  // Match by CSS selectors (page must contain these elements)
  css: ['input[type="password"]', '.login-form']
}
```

### Available Page URL Conditions {#available-page-url-conditions}

| Condition | Description | Example |
|-----------|-------------|---------|
| `hostEquals` | Exact host match | `'developer.chrome.com'` |
| `hostContains` | Host contains substring | `'.google.com'` |
| `pathContains` | Path contains substring | `'/docs/'` |
| `pathEquals` | Exact path match | `'/settings'` |
| `urlContains` | Full URL contains | `'api_key'` |
| `schemes` | Match specific schemes | `['https']` |
| `ports` | Match specific ports | `[443, 8080]` |

### CSS Matching Rules {#css-matching-rules}

- The page must contain **at least one element** matching any of the provided selectors
- Works with any valid CSS selector
- Common use cases: forms, buttons, specific UI elements

## Showing Action on Matching Pages {#showing-action-on-matching-pages}

### Basic Pattern: Show Icon on Specific Sites {#basic-pattern-show-icon-on-specific-sites}

```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'github.com', pathContains: '/pull/' }
          })
        ],
        actions: [new chrome.declarativeContent.ShowAction()]
      }
    ]);
  });
});
```

### Multiple Conditions (AND Logic) {#multiple-conditions-and-logic}

```javascript
{
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostEquals: 'example.com' }
    }),
    new chrome.declarativeContent.PageStateMatcher({
      css: ['#checkout-button']
    })
  ],
  actions: [new chrome.declarativeContent.ShowAction()]
}
```

## Use Cases {#use-cases}

### Use Case 1: Show Icon Only on Specific Sites {#use-case-1-show-icon-only-on-specific-sites}

Show the action icon when visiting documentation pages:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: {
            hostContains: 'developer.mozilla.org',
            pathContains: '/docs/'
          }
        })
      ],
      actions: [new chrome.declarativeContent.ShowAction()]
    }
  ]);
});
```

### Use Case 2: Enable Action When Page Has Specific Elements {#use-case-2-enable-action-when-page-has-specific-elements}

Show action only when a login form is detected:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          css: ['input[type="password"]', 'form[action*="login"]']
        })
      ],
      actions: [new chrome.declarativeContent.ShowAction()]
    }
  ]);
});
```

### Use Case 3: Context-Sensitive Actions {#use-case-3-context-sensitive-actions}

Show different icons based on page content:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  // Rule for password fields
  chrome.declarativeContent.onPageChanged.addRules([
    {
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          css: ['input[type="password"]']
        })
      ],
      actions: [new chrome.declarativeContent.ShowAction()]
    }
  ]);
});
```

## Comparison: declarativeContent vs Content Script Detection {#comparison-declarativecontent-vs-content-script-detection}

| Aspect | declarativeContent | Content Script Detection |
|--------|-------------------|-------------------------|
| **Performance** | No script injection | Requires content script |
| **Timing** | Browser-level detection | Runs after page load |
| **Permissions** | Needs `declarativeContent` permission | Needs host permissions + script injection |
| **Reliability** | Immediate matching | May miss dynamic content |
| **Use Case** | Simple element presence | Complex logic required |

## MV3 Migration: pageAction → action {#mv3-migration-pageaction-action}

In Manifest V3, `chrome.pageAction` is replaced by `chrome.action`. The declarativeContent API works with `chrome.action`:

```javascript
// MV2 (deprecated)
chrome.pageAction.show(tabId);
chrome.pageAction.hide(tabId);

// MV3
// Use ShowAction() from declarativeContent
new chrome.declarativeContent.ShowAction()
```

## Required Permissions {#required-permissions}

Add to `manifest.json`:

```json
{
  "permissions": [
    "declarativeContent"
  ]
}
```

## Cross-References {#cross-references}

- [Permissions: declarativeContent](../permissions/declarativeContent.md)
- [Basic declarativeContent Pattern](../patterns/declarative-content.md)
- [Action API Reference](../api-reference/action-api.md)

## Best Practices {#best-practices}

1. **Register rules in `onInstalled`**: Ensure rules are registered when the extension installs or updates
2. **Use specific selectors**: More specific CSS selectors reduce false positives
3. **Combine URL and CSS conditions**: Use both for precise targeting
4. **Test thoroughly**: Test across different pages to ensure rules match as expected

## Limitations {#limitations}

- Cannot detect element state (e.g., visible, hidden, checked)
- Cannot read element content or attributes
- For complex detection, combine with content scripts triggered by the action click
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
