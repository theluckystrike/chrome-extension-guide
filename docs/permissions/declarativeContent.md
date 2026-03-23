---
layout: default
title: "declarativeContent Permission"
description: "Access to the API for showing/hiding your extension's action icon based on page content — without needing to read page data."
permalink: /permissions/declarativeContent/
category: permissions
order: 12
canonical_url: "https://bestchromeextensions.com/permissions/declarativeContent/"
---

# declarativeContent Permission

## What It Grants {#what-it-grants}
Access to the `chrome.declarativeContent` API for showing/hiding your extension's action icon based on page content — without needing to read page data.

## Manifest {#manifest}
```json
{
  "permissions": ["declarativeContent"]
}
```

## User Warning {#user-warning}
None — this permission does not trigger a warning. This is a key advantage: it doesn't require host permissions.

## API Access {#api-access}
- `chrome.declarativeContent.onPageChanged` — rule-based event
- Rules consist of **conditions** (`PageStateMatcher`) and **actions** (`ShowAction`, `SetIcon`, `RequestContentScript`)

## Core Concept {#core-concept}
Instead of reading every page and deciding whether to show your icon, you declare rules that Chrome evaluates internally — no extension wake-up needed.

## Basic Usage: Show Action on Matching Pages {#basic-usage-show-action-on-matching-pages}

## How to Use declarativeContent API: Show Action on Matching Pages
```typescript
chrome.runtime.onInstalled.addListener(() => {
  // First, disable the action by default
  chrome.action.disable();

  // Then define rules for when to enable it
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostSuffix: '.github.com' }
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
```typescript
// Match by host
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { hostEquals: 'developer.chrome.com' }
});

// Match by host suffix (subdomains)
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { hostSuffix: '.google.com' }
});

// Match by URL prefix
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { urlPrefix: 'https://docs.google.com/' }
});

// Match by scheme
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { schemes: ['https'] }
});

// Match by path
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { pathEquals: '/settings' }
});
```

### CSS Matching {#css-matching}
```typescript
// Show action only when page has a video element
new chrome.declarativeContent.PageStateMatcher({
  css: ['video']
});

// Show when page has a specific class
new chrome.declarativeContent.PageStateMatcher({
  css: ['div.article-content']
});

// Combine URL and CSS
new chrome.declarativeContent.PageStateMatcher({
  pageUrl: { hostSuffix: '.youtube.com' },
  css: ['video.html5-main-video']
});
```

## Multiple Rules {#multiple-rules}
```typescript
chrome.declarativeContent.onPageChanged.addRules([
  {
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostSuffix: '.github.com' }
      }),
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostSuffix: '.gitlab.com' }
      }),
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostSuffix: '.bitbucket.org' }
      })
    ],
    actions: [new chrome.declarativeContent.ShowAction()]
  }
]);
```

## Actions Available {#actions-available}

### ShowAction {#showaction}
Shows the extension's action icon (enables it).
```typescript
new chrome.declarativeContent.ShowAction()
```

### SetIcon {#seticon}
Changes the icon dynamically.
```typescript
new chrome.declarativeContent.SetIcon({
  imageData: { '16': imageData16, '32': imageData32 }
})
```

### RequestContentScript {#requestcontentscript}
Injects a content script on matching pages.
```typescript
new chrome.declarativeContent.RequestContentScript({
  js: ['content-script.js'],
  css: ['styles.css']
})
```

## Storage Integration {#storage-integration}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({ enabledSites: 'string' }); // JSON array
const storage = createStorage(schema, 'sync');

async function updateRules() {
  const sites = JSON.parse(await storage.get('enabledSites') || '["github.com"]');

  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    const conditions = sites.map((site: string) =>
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostSuffix: site }
      })
    );
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions,
      actions: [new chrome.declarativeContent.ShowAction()]
    }]);
  });
}
```

## Comparison with tabs.onUpdated {#comparison-with-tabsonupdated}
| Feature | declarativeContent | tabs.onUpdated |
|---|---|---|
| Permission warning | None | "Read your browsing history" (with tabs) |
| Wakes service worker | No | Yes |
| CPU usage | Minimal | Per-navigation |
| Flexibility | URL/CSS patterns only | Full programmatic control |

## When to Use {#when-to-use}
- Show/hide action icon based on current page
- Enable extension only on specific sites
- No-permission alternative to checking URLs via `tabs`
- Performance-sensitive extensions

## When NOT to Use {#when-not-to-use}
- If you need to read page content — use content scripts
- If you need complex logic — use `tabs.onUpdated` with `activeTab`
- For dynamic UI beyond show/hide — limited actions available

## Permission Check {#permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('declarativeContent');
```

## Cross-References {#cross-references}
- Guide: `docs/guides/declarative-content.md`
- Related: `docs/permissions/activeTab.md`, `docs/permissions/tabs.md`

## Frequently Asked Questions

### How does declarativeContent work in Manifest V3?
DeclarativeContent allows your extension to take actions based on page content without needing to run content scripts constantly. Use chrome.declarativeContent.onPageChanged to define rules.

### Is declarativeContent still available in MV3?
Yes, but with limitations. It works for page actions and can show the action based on page conditions, but cannot automatically inject content scripts.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
