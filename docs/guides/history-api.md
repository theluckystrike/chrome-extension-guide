---
layout: default
title: "Chrome Extension History API — How to Search, Read, and Delete Browser History"
description: "A comprehensive developer guide for building Chrome extensions using the History API with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/history-api/"
---
# History API Guide

## Overview {#overview}
- Requires `"history"` permission (cross-ref `docs/permissions/history.md`)
- Provides access to browser browsing history with full CRUD operations
- All methods return data through callbacks or promises (MV3)
- History items include URL, title, visit count, last visit time, and typed count

## Required Permission {#required-permission}

Add the history permission to your `manifest.json`:

```json
{
  "permissions": ["history"]
}
```

In Manifest V3, history permission is a "host permission" for the purposes of permission warnings. Users will see a warning indicating your extension can "Read and change all your data on all websites."

## Searching History {#searching-history}

The `chrome.history.search()` method is the primary way to query browser history. It accepts a query object and returns matching history items.

```javascript
// Basic search - finds pages matching text in URL or title
chrome.history.search({
  text: 'chrome extension',
  maxResults: 50
}, (results) => {
  results.forEach(item => {
    console.log(item.title, item.url, item.lastVisitTime);
  });
});

// Search with date range
chrome.history.search({
  startTime: new Date('2024-01-01').getTime(),
  endTime: new Date('2024-12-31').getTime(),
  maxResults: 100
}, (results) => {
  // Results from specific time period
});
```

The search method accepts several parameters:
- `text`: Text to match against URL and title
- `startTime`: Earliest visit time (epoch in milliseconds)
- `endTime`: Latest visit time (epoch in milliseconds)
- `maxResults`: Maximum number of results to return (default: 100)

Each result is a `HistoryItem` object containing:
- `id`: Unique identifier for the history entry
- `url`: The page URL
- `title`: The page title (if available)
- `lastVisitTime`: Timestamp of the most recent visit
- `visitCount`: Number of times the page has been visited
- `typedCount`: Number of times the URL was typed directly

## Getting Detailed Visit Information {#getting-visits}

The `chrome.history.getVisits()` method provides detailed information about all visits to a specific URL.

```javascript
chrome.history.getVisits({ url: 'https://developer.chrome.com/' }, (visits) => {
  visits.forEach(visit => {
    console.log('Visit time:', visit.visitTime);
    console.log('Referrer:', visit.referrer);
    console.log('Transition:', visit.transition);
  });
});
```

The visit object includes:
- `visitId`: Unique identifier for this visit
- `visitTime`: When the visit occurred
- `referrer`: The URL that linked to this page
- `transition`: How the user navigated to this page (link, typed, bookmark, etc.)

The transition types include:
- `link`: User clicked a link
- `typed`: User typed the URL directly
- `bookmark`: User navigated from a bookmark
- `form_submit`: User submitted a form
- `reload`: User reloaded the page

## Deleting History {#deleting-history}

The History API provides multiple methods for removing browsing data.

### Deleting a Single URL

```javascript
chrome.history.deleteUrl({ url: 'https://example.com/bad-page' }, () => {
  console.log('URL removed from history');
});
```

This removes all visits to the specified URL from browser history.

### Deleting by Time Range

```javascript
const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

chrome.history.deleteRange({
  startTime: 0,
  endTime: oneWeekAgo
}, () => {
  console.log('All history older than one week deleted');
});
```

### Deleting All History

```javascript
chrome.history.deleteAll(() => {
  console.log('All browsing history cleared');
});
```

Use this with caution—it's irreversible and will affect all browser profiles.

## Listening for History Changes {#listening-changes}

The History API provides event listeners to track browser history changes in real-time.

```javascript
chrome.history.onVisited.addListener((result) => {
  console.log('Page visited:', result.title, result.url);
  // Update extension state or trigger actions
});

chrome.history.onVisitRemoved.addListener((removed) => {
  console.log('Removed items:', removed.allHistory, removed.urls);
  if (removed.allHistory) {
    console.log('All history was cleared');
  }
});
```

## Privacy Considerations {#privacy-considerations}

When working with the History API, developers must handle sensitive user data responsibly.

### Data Sensitivity

Browser history contains deeply personal information about user behavior, including:
- Websites visited and frequency
- Search queries (often embedded in URLs)
- Online activity patterns
- Potential visits to sensitive sites (health, financial, political)

### Best Practices

1. **Minimize permission scope**: Only request history access when absolutely necessary
2. **Local processing**: Process history data locally rather than transmitting to external servers
3. **Clear data promptly**: Delete any cached history data when no longer needed
4. **User transparency**: Clearly explain in your extension's description why you need history access
5. **Provide controls**: Give users options to exclude certain sites or time periods

### User Trust

History permissions trigger significant privacy warnings in Chrome. Users are likely to be skeptical of extensions requesting this permission. Consider whether alternative approaches could achieve your goals without accessing history:

- Use the [Tabs API](../guides/tabs-api.md) to track current tab activity only
- Implement user-initiated bookmarking instead of automatic tracking
- Use the [Storage API](./storage-api.md) for any data your extension generates

### Compliance

Be aware that accessing browser history may subject your extension to additional scrutiny during the Chrome Web Store review process. Ensure your extension's privacy policy accurately describes history data usage.

## Common Mistakes {#common-mistakes}

- Confusing `search()` with `getVisits()` — search finds matching items, getVisits gets all visits to a specific URL
- Not handling the asynchronous nature of all history methods
- Attempting to delete URLs that don't exist in history (no error, but nothing happens)
- Forgetting that `search` with no parameters returns recent history items
- Not checking `visitCount` before assuming a page is frequently visited

## Practical Patterns {#practical-patterns}

- **History cleaner**: Implement scheduled cleanup of old history items
- **Visit tracker**: Monitor new visits and build a personalized dashboard
- **Duplicate finder**: Search for URLs with multiple visits to identify bookmark candidates
- **Time-based analysis**: Analyze browsing patterns by time of day or day of week

## Related Articles {#related-articles}

## Related Articles

- [Bookmarks API](./bookmark-api.md)
- [Tabs API](./tabs-api.md)
- [Storage API](./storage-api.md)

---
