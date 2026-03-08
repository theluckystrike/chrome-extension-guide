---
title: "history Permission — Chrome Extension Reference"
description: "- **Permission string**: `"history"` - **What it grants**: Access to `chrome.history` API — browse, search, and delete browsing history - **Risk level**: High — full access to user's browsing history"
permalink: /permissions/history/
category: permissions
order: 21
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/history/"
---

# history Permission — Chrome Extension Reference

## Overview {#overview}
- **Permission string**: `"history"`
- **What it grants**: Access to `chrome.history` API — browse, search, and delete browsing history
- **Risk level**: High — full access to user's browsing history
- **User prompt**: "Read and change your browsing history on all signed-in devices"
- `@theluckystrike/webext-permissions` description: `describePermission('history')`

## manifest.json Setup {#manifestjson-setup}
```json
{
  "permissions": ["history"]
}
```
- Consider `optional_permissions` — this is a sensitive permission
- Request at runtime: `await requestPermission('history')`

## Key APIs {#key-apis}

### chrome.history.search(query) {#chromehistorysearchquery}
```javascript
chrome.history.search({
  text: "github",           // Search query (empty string = all)
  startTime: Date.now() - 86400000,  // Last 24 hours
  maxResults: 100
}, (results) => {
  results.forEach(item => {
    console.log(item.title, item.url, item.visitCount, item.lastVisitTime);
  });
});
```
- `text`: Search term matched against URL and title
- `startTime`/`endTime`: Unix timestamps to filter range
- `maxResults`: Default 100, max 0 = unlimited

### chrome.history.getVisits(details) {#chromehistorygetvisitsdetails}
```javascript
chrome.history.getVisits({ url: "https://github.com" }, (visits) => {
  visits.forEach(v => {
    console.log(v.visitTime, v.transition); // "typed", "link", "auto_bookmark", etc.
  });
});
```
- Returns individual visit records for a specific URL
- `transition`: How the user navigated — `"link"`, `"typed"`, `"auto_bookmark"`, `"auto_subframe"`, `"manual_subframe"`, `"generated"`, `"auto_toplevel"`, `"form_submit"`, `"reload"`, `"keyword"`, `"keyword_generated"`

### chrome.history.addUrl(details) {#chromehistoryaddurldetails}
```javascript
chrome.history.addUrl({ url: "https://example.com" });
```
- Adds a URL to history (as if user visited it)
- Useful for tracking extension-opened pages

### chrome.history.deleteUrl(details) {#chromehistorydeleteurldetails}
```javascript
chrome.history.deleteUrl({ url: "https://example.com" });
```
- Removes ALL visits to a specific URL

### chrome.history.deleteRange(range) {#chromehistorydeleterangerange}
```javascript
chrome.history.deleteRange({
  startTime: Date.now() - 3600000,  // Last hour
  endTime: Date.now()
}, () => console.log("Deleted last hour of history"));
```

### chrome.history.deleteAll() {#chromehistorydeleteall}
- Deletes ALL browsing history — use with extreme caution
- Equivalent to user clearing all history

## Events {#events}

#### chrome.history.onVisited
```javascript
chrome.history.onVisited.addListener((historyItem) => {
  console.log("Visited:", historyItem.url, historyItem.title);
});
```
- Fires when a URL is visited
- Works in background service worker

#### chrome.history.onVisitRemoved
- Fires when history entries are deleted (by user or extension)
- `allHistory: true` if all history was cleared

## HistoryItem Structure {#historyitem-structure}
```typescript
interface HistoryItem {
  id: string;
  url?: string;
  title?: string;
  lastVisitTime?: number;
  visitCount?: number;
  typedCount?: number;    // Times user typed URL directly
}
```

## Common Patterns {#common-patterns}

### Browsing Analytics Dashboard {#browsing-analytics-dashboard}
- `search({ text: "" })` to get all history
- Group by domain, time of day, day of week
- Display stats in options page or popup

### History Search Extension {#history-search-extension}
- Custom search UI with date range filters
- Better search than Chrome's built-in history page

### Privacy Tool {#privacy-tool}
- Auto-delete history for specific domains
- Schedule periodic cleanup with `chrome.alarms`
- Store cleanup rules with `@theluckystrike/webext-storage`:
  ```typescript
  const storage = createStorage(defineSchema({ blockedDomains: 'string' }), 'local');
  ```

### Recently Visited Quick Access {#recently-visited-quick-access}
- `search({ text: "", maxResults: 20 })` for recent pages
- Show in popup for quick navigation

## Runtime Permission Check {#runtime-permission-check}
```typescript
import { checkPermission, requestPermission } from '@theluckystrike/webext-permissions';
const result = await checkPermission('history');
if (!result.granted) {
  const req = await requestPermission('history');
  if (!req.granted) {
    showMessage("History access needed for this feature");
    return;
  }
}
// Safe to use chrome.history
```

## Security & Privacy Considerations {#security-privacy-considerations}
- History is extremely sensitive data — minimize what you access
- Never send history data to external servers without explicit consent
- Always use `optional_permissions` — let users opt in
- Show users what history data you're accessing and why
- Provide a way to disable history features

## Gotchas {#gotchas}
- **`search({ text: "" })` returns ALL history** — without a text filter, this can return thousands of results. Always set `maxResults` or a `startTime`/`endTime` range to avoid performance issues.
- **`getVisits()` requires an exact URL** — you cannot use wildcards or partial matches. Use `search()` first to find matching URLs, then call `getVisits()` on each result.
- **`deleteAll()` is irreversible** — there is no confirmation dialog and no undo. Guard this behind explicit user confirmation in your UI.

## Common Errors {#common-errors}
- `"history" permission not declared` — must be in permissions or optional_permissions
- `search()` returning no results — check startTime/endTime range
- `getVisits()` requires exact URL match — use `search()` first to find URLs

## API Reference {#api-reference}
- [History API Reference](../api-reference/history-api.md)
- [Chrome history API docs](https://developer.chrome.com/docs/extensions/reference/api/history)
- [History API deep dive](../api-reference/history-api.md)
