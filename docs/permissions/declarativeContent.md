---
title: "declarativeContent Permission"
description: "Access to the `chrome.declarativeContent` API for showing/hiding your extension's action icon based on page content — without needing to read page data."
permalink: /permissions/declarativeContent/
category: permissions
order: 12
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/declarativeContent/"
---

# declarativeContent Permission

## What It Grants
Access to the `chrome.declarativeContent` API for showing/hiding your extension's action icon based on page content — without needing to read page data.

## Manifest
```json
{
  "permissions": ["declarativeContent"]
}
```

## User Warning
None — this permission does not trigger a warning. This is a key advantage: it doesn't require host permissions.

## API Access
- `chrome.declarativeContent.onPageChanged` — rule-based event
- Rules consist of **conditions** (`PageStateMatcher`) and **actions** (`ShowAction`, `SetIcon`, `RequestContentScript`)

## Core Concept
Instead of reading every page and deciding whether to show your icon, you declare rules that Chrome evaluates internally — no extension wake-up needed.

## Basic Usage: Show Action on Matching Pages
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

## PageStateMatcher Conditions

### URL Matching
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

### CSS Matching
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

## Multiple Rules
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

## Actions Available

### ShowAction
Shows the extension's action icon (enables it).
```typescript
new chrome.declarativeContent.ShowAction()
```

### SetIcon
Changes the icon dynamically.
```typescript
new chrome.declarativeContent.SetIcon({
  imageData: { '16': imageData16, '32': imageData32 }
})
```

### RequestContentScript
Injects a content script on matching pages.
```typescript
new chrome.declarativeContent.RequestContentScript({
  js: ['content-script.js'],
  css: ['styles.css']
})
```

## Storage Integration
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

## Comparison with tabs.onUpdated
| Feature | declarativeContent | tabs.onUpdated |
|---|---|---|
| Permission warning | None | "Read your browsing history" (with tabs) |
| Wakes service worker | No | Yes |
| CPU usage | Minimal | Per-navigation |
| Flexibility | URL/CSS patterns only | Full programmatic control |

## When to Use
- Show/hide action icon based on current page
- Enable extension only on specific sites
- No-permission alternative to checking URLs via `tabs`
- Performance-sensitive extensions

## When NOT to Use
- If you need to read page content — use content scripts
- If you need complex logic — use `tabs.onUpdated` with `activeTab`
- For dynamic UI beyond show/hide — limited actions available

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('declarativeContent');
```

## Cross-References
- Guide: `docs/guides/declarative-content.md`
- Related: `docs/permissions/activeTab.md`, `docs/permissions/tabs.md`
