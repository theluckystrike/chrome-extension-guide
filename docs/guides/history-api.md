---
layout: default
title: "Chrome Extension History API — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# History API Guide

## Overview
- Requires `"history"` permission (cross-ref `docs/permissions/history.md`)
- Access browser's visited URL history
- Add, delete, and query history entries
- Privacy-sensitive — users must trust extensions with this permission

## Searching History
```javascript
// Search by text query
chrome.history.search({
  text: 'chrome extension',      // Search URL and title
  startTime: Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
  endTime: Date.now(),
  maxResults: 100
}, (results) => {
  results.forEach(item => {
    console.log(item.title, item.url, item.visitCount, item.lastVisitTime);
  });
});

// Get all history (empty text matches everything)
chrome.history.search({ text: '', maxResults: 1000 }, (results) => {
  console.log(`Found ${results.length} history entries`);
});
```

## Visit Details
```javascript
// Get individual visits to a URL
chrome.history.getVisits({ url: 'https://developer.chrome.com/' }, (visits) => {
  visits.forEach(visit => {
    console.log(
      'Visit:', visit.visitId,
      'Time:', new Date(visit.visitTime),
      'Transition:', visit.transition,
      'Referring visit:', visit.referringVisitId
    );
  });
});
```

### Transition Types
- `"link"` — clicked a link
- `"typed"` — typed in address bar
- `"auto_bookmark"` — from bookmarks
- `"auto_subframe"` — iframe navigation
- `"manual_subframe"` — user-initiated iframe nav
- `"generated"` — from omnibox suggestion
- `"auto_toplevel"` — page specified in command line or start page
- `"form_submit"` — form submission
- `"reload"` — page reload
- `"keyword"` — search keyword
- `"keyword_generated"` — from search engine

## Adding & Removing History
```javascript
// Add a URL to history (creates entry as if visited)
chrome.history.addUrl({ url: 'https://example.com/' });

// Delete specific URL from history
chrome.history.deleteUrl({ url: 'https://example.com/' });

// Delete history in time range
chrome.history.deleteRange({
  startTime: Date.now() - (24 * 60 * 60 * 1000), // 24 hours ago
  endTime: Date.now()
});

// Delete ALL history
chrome.history.deleteAll();
```

## History Events
```javascript
chrome.history.onVisited.addListener((result) => {
  // Fires when a URL is visited
  console.log('Visited:', result.url, result.title);
});

chrome.history.onVisitRemoved.addListener((removed) => {
  if (removed.allHistory) {
    console.log('All history cleared');
  } else {
    console.log('Removed URLs:', removed.urls);
  }
});
```

## Tracking Browsing Patterns
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  dailyStats: 'string',    // JSON: { [date]: { sites: number, topDomains: {} } }
  trackedDomains: 'string'  // JSON: string[] of domains to monitor
}), 'local');

// Track daily browsing stats
chrome.history.onVisited.addListener(async (result) => {
  const domain = new URL(result.url).hostname;
  const today = new Date().toISOString().split('T')[0];
  const raw = await storage.get('dailyStats');
  const stats = raw ? JSON.parse(raw) : {};
  if (!stats[today]) stats[today] = { sites: 0, topDomains: {} };
  stats[today].sites++;
  stats[today].topDomains[domain] = (stats[today].topDomains[domain] || 0) + 1;
  await storage.set('dailyStats', JSON.stringify(stats));
});
```

## Practical Patterns
- **Browsing dashboard**: aggregate visit data by domain, time of day, transition type
- **Productivity tracker**: monitor time on distracting vs productive sites
- **History search extension**: better search UI with filters, date ranges, domain grouping
- **Privacy cleaner**: scheduled deletion of history for specific domains
- **URL recall**: "I visited a page last week about X" — fuzzy search helper

## Common Mistakes
- Not handling the volume of data — `search` can return thousands of results
- Forgetting `text: ''` is required even when filtering by time only
- Deleting history without confirmation — it's irreversible
- Not accounting for `maxResults` default (100) — always set explicitly
- Calling `getVisits` in a loop — batch queries when possible

## Related Articles

- [History API Reference](../api-reference/history-api.md)
- [Bookmark API](../guides/bookmark-api.md)
