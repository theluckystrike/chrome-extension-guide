---
layout: default
title: "Chrome Extension History API. How to Search, Read, and Delete Browser History"
description: "A comprehensive developer guide for building Chrome extensions using the History API with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/history-api/"
last_modified_at: 2026-01-15
---
History API Guide

Overview {#overview}
- Requires `"history"` permission (cross-ref `docs/permissions/history.md`)
- Provides access to browser browsing history with full CRUD operations
- All methods return data through callbacks or promises (MV3)
- History items include URL, title, visit count, last visit time, and typed count

Required Permission {#required-permission}

Add the history permission to your `manifest.json`:

```json
{
  "permissions": ["history"]
}
```

In Manifest V3, history permission is a "host permission" for the purposes of permission warnings. Users will see a warning indicating your extension can "Read and change all your data on all websites."

Searching History {#searching-history}

The `chrome.history.search()` method is the primary way to query browser history. It accepts a query object and returns matching history items.

```javascript
// Basic search - finds pages matching text in URL or title
chrome.history.search({
  text: 'chrome extension',
  maxResults: 50
}, (results) => {
Overview
The Chrome History API provides comprehensive access to the user's browsing history. This API allows extensions to search, read, add, and delete history entries, as well as listen for history changes in real-time.

Required Permissions
To use the History API, add `"history"` to the permissions array in your `manifest.json`:

```json
{
  "name": "History Extension",
  "permissions": [
    "history"
  ]
}
```

For more details on permissions, see `docs/permissions/history.md`.

Data Types

HistoryItem
Returned by `search` and `getVisits`, represents a single history entry:

```javascript
{
  id: "123",                    // Unique identifier
  url: "https://example.com/",  // Page URL
  title: "Example Page",        // Page title (may be empty)
  lastVisitTime: 1699900000000, // Timestamp in milliseconds
  visitCount: 5,                // Number of times visited
  typedCount: 2                 // Number of times typed directly
}
```

VisitItem
Returned by `getVisits`, represents a single visit to a URL:

```javascript
{
  id: "visit123",               // Unique visit identifier
  visitId: "1",                 // Visit ID within the URL
  url: "https://example.com/",  // The visited URL
  visitTime: 1699900000000,     // Timestamp in milliseconds
  referringVisitId: "0"         // ID of the visit that led here
}
```

Searching History - chrome.history.search

The primary method for accessing history data. Supports text search and time-based filtering.

Basic Search
```javascript
// Search all history (returns up to 100 results by default)
chrome.history.search({ text: '' }, (results) => {
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

Getting Detailed Visit Information {#getting-visits}

The `chrome.history.getVisits()` method provides detailed information about all visits to a specific URL.

```javascript
chrome.history.getVisits({ url: 'https://developer.chrome.com/' }, (visits) => {
  visits.forEach(visit => {
    console.log('Visit time:', visit.visitTime);
    console.log('Referrer:', visit.referrer);
    console.log('Transition:', visit.transition);
```

Search with Text Query
```javascript
// Search for specific text in title or URL
chrome.history.search({ text: 'chrome extension' }, (results) => {
  console.log(`Found ${results.length} matching visits`);
});
```

Time-Restricted Search
```javascript
// Get visits from the last 24 hours
const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
chrome.history.search({
  text: '',
  startTime: oneDayAgo
}, (results) => {
  console.log(`Last 24 hours: ${results.length} pages visited`);
});

// Get visits from a specific date range
chrome.history.search({
  text: '',
  startTime: new Date('2024-01-01').getTime(),
  endTime: new Date('2024-01-31').getTime()
}, (results) => {
  console.log(`January 2024: ${results.length} visits`);
});
```

Limiting Results
```javascript
// Limit to most recent 10 results
chrome.history.search({
  text: '',
  maxResults: 10
}, (results) => {
  // Only returns top 10 most recent
});
```

Getting Visit Details - chrome.history.getVisits

Retrieves detailed visit information for a specific URL, including navigation context.

```javascript
// Get all visits for a specific URL
const url = 'https://developer.chrome.com/';
chrome.history.getVisits({ url }, (visits) => {
  visits.forEach(visit => {
    console.log('Visit ID:', visit.visitId);
    console.log('Visit Time:', new Date(visit.visitTime));
    console.log('Referring Visit:', visit.referringVisitId);
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

Deleting History {#deleting-history}

The History API provides multiple methods for removing browsing data.

Deleting a Single URL

```javascript
chrome.history.deleteUrl({ url: 'https://example.com/bad-page' }, () => {
  console.log('URL removed from history');
});
```

This removes all visits to the specified URL from browser history.

Deleting by Time Range

```javascript
const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

chrome.history.deleteRange({
  startTime: 0,
  endTime: oneWeekAgo
}, () => {
  console.log('All history older than one week deleted');
});
```

Deleting All History

```javascript
chrome.history.deleteAll(() => {
  console.log('All browsing history cleared');
});
```

Use this with caution, it's irreversible and will affect all browser profiles.

Listening for History Changes {#listening-changes}

The History API provides event listeners to track browser history changes in real-time.

```javascript
chrome.history.onVisited.addListener((result) => {
  console.log('Page visited:', result.title, result.url);
  // Update extension state or trigger actions
The `referringVisitId` can trace how the user navigated to this page (e.g., from a search, direct link, or bookmark).

Adding URLs - chrome.history.addUrl

Manually add a URL to the browsing history. Useful for tracking external links or programmatic history entries.

```javascript
// Add a URL to history
chrome.history.addUrl({
  url: 'https://example.com/'
}, () => {
  console.log('URL added to history');
});
```

This won't duplicate entries if the URL already exists, it will update the last visit time instead.

Deleting History

Deleting a Specific URL - chrome.history.deleteUrl
Removes all visits for a specific URL from history.

```javascript
// Remove a specific URL from history
chrome.history.deleteUrl({ url: 'https://example.com/' }, () => {
  console.log('URL removed from history');
});
```

Deleting by Time Range - chrome.history.deleteRange
Remove history entries within a specific time period.

```javascript
// Delete all history from the past week
const now = Date.now();
const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

chrome.history.deleteRange({
  startTime: oneWeekAgo,
  endTime: now
}, () => {
  console.log('Deleted history from the last 7 days');
});
```

Clearing All History - chrome.history.deleteUrl
Remove all browsing history (use with caution!).

```javascript
// Clear all browsing history
chrome.history.deleteAll(() => {
  console.log('All history cleared');
});
```

Event Listeners

chrome.history.onVisited
Fires whenever a page is visited (user navigates to a URL).

```javascript
chrome.history.onVisited.addListener((result) => {
  console.log('Page visited:', result.url);
  console.log('Title:', result.title);
  console.log('Visit time:', new Date(result.lastVisitTime));
  console.log('Total visits:', result.visitCount);
});
```

This event fires for every page load, so be mindful of performance when processing.

chrome.history.onVisitRemoved
Fires when one or more URLs are removed from history.

```javascript
chrome.history.onVisitRemoved.addListener((removed) => {
  console.log('Removed items:', removed.allHistory, removed.urls);
  if (removed.allHistory) {
    console.log('All history was cleared');
  } else {
    console.log('Removed URLs:', removed.urls);
  }
});
```

Privacy Considerations {#privacy-considerations}

When working with the History API, developers must handle sensitive user data responsibly.

Data Sensitivity

Browser history contains deeply personal information about user behavior, including:
- Websites visited and frequency
- Search queries (often embedded in URLs)
- Online activity patterns
- Potential visits to sensitive sites (health, financial, political)

Best Practices

1. Minimize permission scope: Only request history access when absolutely necessary
2. Local processing: Process history data locally rather than transmitting to external servers
3. Clear data promptly: Delete any cached history data when no longer needed
4. User transparency: Clearly explain in your extension's description why you need history access
5. Provide controls: Give users options to exclude certain sites or time periods

User Trust

History permissions trigger significant privacy warnings in Chrome. Users are likely to be skeptical of extensions requesting this permission. Consider whether alternative approaches could achieve your goals without accessing history:

- Use the [Tabs API](../guides/tabs-api.md) to track current tab activity only
- Implement user-initiated bookmarking instead of automatic tracking
- Use the [Storage API](./storage-api.md) for any data your extension generates

Compliance

Be aware that accessing browser history may subject your extension to additional scrutiny during the Chrome Web Store review process. Ensure your extension's privacy policy accurately describes history data usage.

Common Mistakes {#common-mistakes}

- Confusing `search()` with `getVisits()`. search finds matching items, getVisits gets all visits to a specific URL
- Not handling the asynchronous nature of all history methods
- Attempting to delete URLs that don't exist in history (no error, but nothing happens)
- Forgetting that `search` with no parameters returns recent history items
- Not checking `visitCount` before assuming a page is frequently visited

Practical Patterns {#practical-patterns}

- History cleaner: Implement scheduled cleanup of old history items
- Visit tracker: Monitor new visits and build a personalized dashboard
- Duplicate finder: Search for URLs with multiple visits to identify bookmark candidates
- Time-based analysis: Analyze browsing patterns by time of day or day of week

Related Articles {#related-articles}

Related Articles

- [Bookmarks API](./bookmark-api.md)
- [Tabs API](./tabs-api.md)
- [Storage API](./storage-api.md)

---
The `removed` object contains:
- `allHistory`: Boolean, true if all history was cleared
- `urls`: Array of URLs that were removed

Building a History Analytics Dashboard

Here's a practical example of building a simple history analytics extension:

Popup Implementation
```javascript
// popup.js - Display recent browsing statistics

document.addEventListener('DOMContentLoaded', () => {
  const statsDiv = document.getElementById('stats');
  
  // Get today's visits
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  chrome.history.search({
    text: '',
    startTime: startOfDay.getTime(),
    maxResults: 100
  }, (results) => {
    const uniqueDomains = new Set();
    results.forEach(item => {
      try {
        const url = new URL(item.url);
        uniqueDomains.add(url.hostname);
      } catch (e) {}
    });
    
    statsDiv.innerHTML = `
      <p>Today's visits: ${results.length}</p>
      <p>Unique domains: ${uniqueDomains.size}</p>
    `;
  });
});
```

Most Visited Sites Widget
```javascript
// background.js - Track most visited sites

function getTopSites(callback, limit = 10) {
  chrome.history.search({ text: '' }, (results) => {
    const urlCounts = {};
    
    results.forEach(item => {
      if (item.url) {
        try {
          const domain = new URL(item.url).hostname;
          urlCounts[domain] = (urlCounts[domain] || 0) + 1;
        } catch (e) {}
      }
    });
    
    const sorted = Object.entries(urlCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    callback(sorted);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  getTopSites((topSites) => {
    console.log('Top visited sites:', topSites);
  });
});
```

Daily History Summary
```javascript
// Track daily browsing patterns
function getDailySummary() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  chrome.history.search({
    text: '',
    startTime: startOfDay.getTime(),
    maxResults: 500
  }, (results) => {
    const summary = {
      totalVisits: results.length,
      uniqueURLs: new Set(results.map(r => r.url)).size,
      topDomains: {}
    };
    
    results.forEach(item => {
      try {
        const domain = new URL(item.url).hostname;
        summary.topDomains[domain] = (summary.topDomains[domain] || 0) + 1;
      } catch (e) {}
    });
    
    // Sort and display top 5
    const top5 = Object.entries(summary.topDomains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.table(top5);
  });
}
```

Privacy Considerations

User Trust
- Always inform users: Make it clear in your extension's description how you use history data
- Minimize data collection: Only collect what you need for your feature
- Secure storage: If storing history data locally, use Chrome's secure storage mechanisms
- Data deletion: Provide users with options to delete collected data

Best Practices
```javascript
// Always handle errors gracefully
chrome.history.search({ text: 'test' }, (results) => {
  if (chrome.runtime.lastError) {
    console.error('History API error:', chrome.runtime.lastError);
    return;
  }
  // Process results
});

// Clear sensitive data when done processing
function processHistory() {
  // Process data...
  
  // Clear sensitive information from memory
  sensitiveData = null;
}
```

Legal Compliance
- Be aware of GDPR, CCPA, and other privacy regulations
- Provide clear privacy policies
- Allow users to opt out of data collection

Common Use Cases

1. Reading List / History Manager: Allow users to save and organize interesting pages
2. Productivity Analytics: Show users their browsing patterns (time spent, frequent sites)
3. Bookmark Sync: Use history events to help manage bookmarks
4. Tab Manager: Show recently visited pages to help users find lost tabs
5. Search Enhancement: Provide quick access to frequently visited sites

Reference
For complete API documentation, see: [developer.chrome.com/docs/extensions/reference/api/history](https://developer.chrome.com/docs/extensions/reference/api/history)

Related APIs
- Bookmark API (`chrome.bookmarks`) - for bookmark management
- Top Sites API (`chrome.topSites`) - for frequently visited sites
- Management API (`chrome.management`) - for extension management

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
