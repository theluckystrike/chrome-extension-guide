# history Permission — Chrome Extension Reference

## Overview
- **Permission string**: `"history"`
- **What it grants**: Access to `chrome.history` API — browse, search, and delete browsing history
- **Risk level**: High — full access to user's browsing history
- **User prompt**: "Read and change your browsing history"
- `@theluckystrike/webext-permissions` description: `describePermission('history')`

## manifest.json Setup
```json
{
  "permissions": ["history"]
}
```
- Consider `optional_permissions` — this is a sensitive permission
- Request at runtime: `await requestPermission('history')`

## Key APIs

### chrome.history.search(query)
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

### chrome.history.getVisits(details)
```javascript
chrome.history.getVisits({ url: "https://github.com" }, (visits) => {
  visits.forEach(v => {
    console.log(v.visitTime, v.transition); // "typed", "link", "auto_bookmark", etc.
  });
});
```
- Returns individual visit records for a specific URL
- `transition`: How the user navigated — `"typed"`, `"link"`, `"auto_bookmark"`, `"auto_subframe"`, `"reload"`, etc.

### chrome.history.addUrl(details)
```javascript
chrome.history.addUrl({ url: "https://example.com" });
```
- Adds a URL to history (as if user visited it)
- Useful for tracking extension-opened pages

### chrome.history.deleteUrl(details)
```javascript
chrome.history.deleteUrl({ url: "https://example.com" });
```
- Removes ALL visits to a specific URL

### chrome.history.deleteRange(range)
```javascript
chrome.history.deleteRange({
  startTime: Date.now() - 3600000,  // Last hour
  endTime: Date.now()
}, () => console.log("Deleted last hour of history"));
```

### chrome.history.deleteAll()
- Deletes ALL browsing history — use with extreme caution
- Equivalent to user clearing all history

## Events

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

## HistoryItem Structure
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

## Common Patterns

### Browsing Analytics Dashboard
- `search({ text: "" })` to get all history
- Group by domain, time of day, day of week
- Display stats in options page or popup

### History Search Extension
- Custom search UI with date range filters
- Better search than Chrome's built-in history page

### Privacy Tool
- Auto-delete history for specific domains
- Schedule periodic cleanup with `chrome.alarms`
- Store cleanup rules with `@theluckystrike/webext-storage`:
  ```typescript
  const storage = createStorage(defineSchema({ blockedDomains: 'string' }), 'local');
  ```

### Recently Visited Quick Access
- `search({ text: "", maxResults: 20 })` for recent pages
- Show in popup for quick navigation

## Runtime Permission Check
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

## Security & Privacy Considerations
- History is extremely sensitive data — minimize what you access
- Never send history data to external servers without explicit consent
- Always use `optional_permissions` — let users opt in
- Show users what history data you're accessing and why
- Provide a way to disable history features

## Common Errors
- `"history" permission not declared` — must be in permissions or optional_permissions
- `search()` returning no results — check startTime/endTime range
- `getVisits()` requires exact URL match — use `search()` first to find URLs

## API Reference
- [History API Reference](../api-reference/history-api.md)
