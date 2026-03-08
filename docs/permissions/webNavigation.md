---
title: "webNavigation Permission"
description: "Access to the `chrome.webNavigation` API for monitoring page navigation lifecycle across all tabs and frames. { "permissions": ["webNavigation"] } None — this permission does not trigger a warning ..."
permalink: /permissions/webNavigation/
category: permissions
order: 48
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/webNavigation/"
---

# webNavigation Permission

## What It Grants {#what-it-grants}
Access to the `chrome.webNavigation` API for monitoring page navigation lifecycle across all tabs and frames.

## Manifest {#manifest}
```json
{
  "permissions": ["webNavigation"]
}
```

## User Warning {#user-warning}
None — this permission does not trigger a warning at install time.

## API Access {#api-access}
When granted, you can use all `chrome.webNavigation` events:
- `onBeforeNavigate` — before navigation starts
- `onCommitted` — navigation committed (headers received)
- `onDOMContentLoaded` — DOM ready
- `onCompleted` — page fully loaded
- `onErrorOccurred` — navigation failed
- `onCreatedNavigationTarget` — new tab opened by navigation
- `onReferenceFragmentUpdated` — hash/fragment changed
- `onHistoryStateUpdated` — `pushState`/`replaceState` (SPA navigation)
- `onTabReplaced` — tab replaced (prerender)
- `getAllFrames(tabId)` — list all frames in a tab
- `getFrame(tabId, frameId)` — get specific frame info

## URL Filtering {#url-filtering}
```javascript
chrome.webNavigation.onCompleted.addListener(
  (details) => { /* only matching URLs */ },
  { url: [{ hostSuffix: '.github.com' }, { urlPrefix: 'https://docs.google.com/' }] }
);
```

## Key Properties {#key-properties}
Each event provides:
- `tabId` — which tab
- `url` — navigation URL
- `frameId` — 0 for main frame, >0 for subframes
- `parentFrameId` — parent frame ID
- `timeStamp` — when event fired
- `transitionType` — how navigation was triggered (link, typed, reload, etc.)

## When to Use {#when-to-use}
- Track page loads for analytics or logging
- Detect SPA navigations (`onHistoryStateUpdated`)
- Frame-aware content script injection
- Page load timing measurement
- URL-filtered event processing (more efficient than `tabs.onUpdated`)

## When NOT to Use {#when-not-to-use}
- If you only need to know when tabs change — use `chrome.tabs.onUpdated` with `tabs` permission
- If you need to block/modify requests — use `declarativeNetRequest`

## Runtime Check {#runtime-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('webNavigation');
```

## Cross-References {#cross-references}
- Guide: `docs/guides/web-navigation.md`
- Related: `docs/permissions/tabs.md`, `docs/permissions/webRequest.md`

## Frequently Asked Questions

### How do I track page navigations?
Use chrome.webNavigation API to receive events when frames navigate, complete loading, or encounter errors.

### Can I block navigations with webNavigation?
No, webNavigation is for tracking only. To block or modify navigations, use declarativeNetRequest or webRequest.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
