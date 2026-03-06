# webNavigation Permission

## What It Grants
Access to the `chrome.webNavigation` API for monitoring page navigation lifecycle across all tabs and frames.

## Manifest
```json
{
  "permissions": ["webNavigation"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access
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

## URL Filtering
```javascript
chrome.webNavigation.onCompleted.addListener(
  (details) => { /* only matching URLs */ },
  { url: [{ hostSuffix: '.github.com' }, { urlPrefix: 'https://docs.google.com/' }] }
);
```

## Key Properties
Each event provides:
- `tabId` — which tab
- `url` — navigation URL
- `frameId` — 0 for main frame, >0 for subframes
- `parentFrameId` — parent frame ID
- `timeStamp` — when event fired
- `transitionType` — how navigation was triggered (link, typed, reload, etc.)

## When to Use
- Track page loads for analytics or logging
- Detect SPA navigations (`onHistoryStateUpdated`)
- Frame-aware content script injection
- Page load timing measurement
- URL-filtered event processing (more efficient than `tabs.onUpdated`)

## When NOT to Use
- If you only need to know when tabs change — use `chrome.tabs.onUpdated` with `tabs` permission
- If you need to block/modify requests — use `declarativeNetRequest`

## Runtime Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('webNavigation');
```

## Cross-References
- Guide: `docs/guides/web-navigation.md`
- Related: `docs/permissions/tabs.md`, `docs/permissions/webRequest.md`
