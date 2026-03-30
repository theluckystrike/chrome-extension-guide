---
layout: default
title: "Working with Browser History in Chrome Extensions"
description: "Learn how to use the chrome.history API to search, add, delete history entries, handle visit details, and build analytics features with privacy best practices."
canonical_url: "https://bestchromeextensions.com/tutorials/history-api-guide/"
last_modified_at: 2026-01-15
---

Working with Browser History in Chrome Extensions

The `chrome.history` API is a powerful tool that enables Chrome extensions to interact with the user's browsing history. This API allows you to search through past visits, add new entries, delete history items, and even monitor when users visit new pages in real-time. Whether you're building a history search tool, an analytics dashboard, or a productivity extension that tracks browsing patterns, understanding the history API is essential.

This guide provides comprehensive coverage of all history API operations, from basic CRUD operations to advanced analytics patterns, along with important privacy considerations you must address when working with sensitive browsing data.

Prerequisites and Permission Setup

Before using any history API methods, you need to declare the `history` permission in your extension's manifest file. This permission triggers a significant privacy warning in the Chrome Web Store, so it's important to understand when and how to use it appropriately.

Adding the History Permission

Add the `history` permission to your `manifest.json` file:

```json
{
  "manifest_version": 3,
  "name": "History Analytics Extension",
  "version": "1.0",
  "permissions": [
    "history"
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

The history permission is categorized as a high-sensitivity permission because it provides access to the user's complete browsing history. When users install your extension, they'll see a warning that states "Read and change your browsing history." This can impact user trust and your extension's review process, so consider whether you truly need this permission or if there's an alternative approach for your use case.

For extensions that don't require persistent history access, consider using optional permissions that users can grant when needed. This approach gives users more control and can improve trust in your extension.

Understanding the Data Model

The history API works with two distinct but related data types: HistoryItem and VisitItem. Understanding the difference between these types is crucial for building effective history-powered features.

HistoryItem: Unique URLs

A HistoryItem represents a unique URL in the user's browsing history. Each URL appears only once in the history table, even if the user visited it multiple times:

```typescript
interface HistoryItem {
  id: string;
  url: string;
  title?: string;
  lastVisitTime?: number;
  visitCount?: number;
  typedCount?: number;
}
```

The `id` field serves as the unique identifier for querying related visit records. The `title` field contains the page title at the time of the last visit, which may differ from the current page title if the site changed. The `visitCount` tracks how many times the user visited this URL, while `typedCount` specifically tracks how many times the user typed the URL directly in the address bar.

VisitItem: Individual Visits

A VisitItem represents a single visit to a URL, including how the user arrived at the page:

```typescript
interface VisitItem {
  id: string;
  visitId: string;
  visitTime: number;
  referringVisitId: string;
  transition: TransitionType;
}
```

The `transition` field reveals the navigation type: `"link"` indicates clicking a link, `"typed"` means typing in the address bar, `"auto_bookmark"` comes from a bookmark, `"reload"` indicates a page refresh, and many other values exist. This information is invaluable for analytics extensions that want to understand user behavior patterns.

Searching History

The `chrome.history.search()` method is the primary way to query the browsing history. It supports full-text search across page titles and URLs, along with powerful time-based filtering.

Basic Text Search

Search for pages by title or URL content:

```javascript
async function searchHistory(query) {
  const results = await chrome.history.search({
    text: query,
    maxResults: 20
  });
  
  results.forEach(item => {
    console.log(`Title: ${item.title}`);
    console.log(`URL: ${item.url}`);
    console.log(`Visits: ${item.visitCount}`);
  });
  
  return results;
}

// Search for all pages containing "chrome"
searchHistory("chrome");
```

The search matches against both the page title and the URL. Searching for an empty string returns all history items, though this is limited by the `maxResults` parameter.

Time-Based Queries

Filter history by date range to analyze browsing patterns over specific periods:

```javascript
// Get all history from the last 24 hours
async function getRecentHistory() {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  const results = await chrome.history.search({
    text: "",
    startTime: oneDayAgo,
    maxResults: 100
  });
  
  return results;
}

// Get history from a specific date range
async function getHistoryInRange(startDate, endDate) {
  const results = await chrome.history.search({
    text: "",
    startTime: startDate.getTime(),
    endTime: endDate.getTime(),
    maxResults: 500
  });
  
  return results;
}

// Usage: Last week of history
const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);
getHistoryInRange(weekAgo, new Date());
```

The `startTime` and `endTime` parameters accept Unix timestamps in milliseconds. Omitting `startTime` defaults to 24 hours ago, while omitting `endTime` defaults to the current time.

Building a Search UI

Create a practical search interface in your extension popup:

```html
<!-- popup.html -->
<div class="search-container">
  <input type="text" id="history-search" 
         placeholder="Search your history...">
  <select id="time-filter">
    <option value="0">All time</option>
    <option value="1">Today</option>
    <option value="7">Past week</option>
    <option value="30">Past month</option>
    <option value="365">Past year</option>
  </select>
  <button id="search-btn">Search</button>
</div>

<div id="results-container"></div>

<script src="popup.js"></script>
```

```javascript
// popup.js
document.getElementById("search-btn").addEventListener("click", async () => {
  const query = document.getElementById("history-search").value;
  const daysBack = parseInt(document.getElementById("time-filter").value);
  
  const searchOptions = {
    text: query,
    maxResults: 50
  };
  
  if (daysBack > 0) {
    searchOptions.startTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  }
  
  const results = await chrome.history.search(searchOptions);
  displayResults(results);
});

function displayResults(results) {
  const container = document.getElementById("results-container");
  
  if (results.length === 0) {
    container.innerHTML = "<p>No results found</p>";
    return;
  }
  
  const html = results.map(item => `
    <div class="history-item">
      <div class="item-title">${escapeHtml(item.title || "No title")}</div>
      <div class="item-url">${escapeHtml(item.url)}</div>
      <div class="item-meta">
        <span>Visits: ${item.visitCount || 0}</span>
        <span>Last: ${formatDate(item.lastVisitTime)}</span>
      </div>
      <button class="delete-btn" data-url="${escapeHtml(item.url)}">Delete</button>
    </div>
  `).join("");
  
  container.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleDateString();
}
```

Retrieving Visit Details

While `chrome.history.search()` returns summary information, you sometimes need detailed visit records for a specific URL. The `chrome.history.getVisits()` method provides this granular data.

Getting All Visits for a URL

```javascript
async function getVisitDetails(url) {
  const visits = await chrome.history.getVisits({ url });
  
  visits.forEach(visit => {
    console.log(`Visit ID: ${visit.visitId}`);
    console.log(`Time: ${new Date(visit.visitTime).toISOString()}`);
    console.log(`Transition: ${visit.transition}`);
    console.log(`Referring Visit: ${visit.referringVisitId}`);
  });
  
  return visits;
}

// Get all visits to example.com
getVisitDetails("https://www.example.com");
```

The visit details reveal how users arrived at each page, which is powerful for understanding user behavior. For instance, you can analyze what percentage of visits come from search engines versus direct navigation.

Analyzing Navigation Patterns

Use transition types to categorize and analyze user navigation:

```javascript
async function analyzeNavigationPatterns() {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  const history = await chrome.history.search({
    text: "",
    startTime: oneWeekAgo,
    maxResults: 0 // Get all results
  });
  
  const transitionCounts = {};
  
  for (const item of history) {
    const visits = await chrome.history.getVisits({ url: item.url });
    
    visits.forEach(visit => {
      if (visit.visitTime >= oneWeekAgo) {
        transitionCounts[visit.transition] = 
          (transitionCounts[visit.transition] || 0) + 1;
      }
    });
  }
  
  // Display sorted by frequency
  const sorted = Object.entries(transitionCounts)
    .sort((a, b) => b[1] - a[1]);
  
  sorted.forEach(([type, count]) => {
    console.log(`${type}: ${count} visits`);
  });
  
  return sorted;
}
```

This analysis can reveal valuable insights about how users navigate the web, helping you understand whether they primarily arrive through search, bookmarks, direct typing, or social links.

Adding and Deleting History Entries

The history API allows programmatic modification of browsing history, though these capabilities come with significant responsibility and privacy implications.

Adding URLs to History

Add a URL to history as if the user visited it:

```javascript
async function addToHistory(url, title) {
  try {
    await chrome.history.addUrl({
      url: url
    });
    console.log(`Added to history: ${url}`);
  } catch (error) {
    console.error("Failed to add URL:", error);
  }
}

// Add a frequently visited page
addToHistory("https://developers.chrome.com/docs/extensions");
```

Note that you cannot directly set the title when adding a URL. The title will be fetched from the URL's actual content on the next visit or can be updated if the URL is visited again later.

Deleting Specific URLs

Remove individual history entries:

```javascript
async function deleteFromHistory(url) {
  try {
    await chrome.history.deleteUrl({
      url: url
    });
    console.log(`Deleted from history: ${url}`);
  } catch (error) {
    console.error("Failed to delete URL:", error);
  }
}

// Delete a specific page
deleteFromHistory("https://example.com/private-page");
```

Deleting History by Date Range

Remove all history within a specific time period:

```javascript
async function clearHistoryRange(startDate, endDate) {
  try {
    await chrome.history.deleteRange({
      startTime: startDate.getTime(),
      endTime: endDate.getTime()
    });
    console.log("History cleared for specified range");
  } catch (error) {
    console.error("Failed to clear range:", error);
  }
}

// Clear last hour of history
const oneHourAgo = Date.now() - (60 * 60 * 1000);
clearHistoryRange(oneHourAgo, Date.now());
```

Deleting All History

Clear the entire browsing history:

```javascript
async function clearAllHistory() {
  // This is irreversible - always warn users first
  const confirmed = confirm(
    "This will delete your entire browsing history. This action cannot be undone. Continue?"
  );
  
  if (confirmed) {
    await chrome.history.deleteAll();
    console.log("All history has been deleted");
  }
}
```

Important Warning: The `deleteAll()` method is extremely powerful and should only be used when explicitly requested by the user. Always implement confirmation dialogs and consider providing more granular deletion options.

Listening to History Events

The history API provides real-time event listeners that fire when users browse, enabling powerful reactive features like tracking, analytics, and automation.

Tracking New Visits

Monitor when users visit any page:

```javascript
// background.js
chrome.history.onVisited.addListener((historyItem) => {
  console.log("User visited:", historyItem.url);
  console.log("Page title:", historyItem.title);
  console.log("Total visits:", historyItem.visitCount);
  console.log("Last visit:", new Date(historyItem.lastVisitTime));
  
  // You could send this to your analytics service
  // or trigger extension actions based on visited URLs
});
```

The `onVisited` event fires immediately after a page loads, making it ideal for real-time tracking and automation rules.

Monitoring History Deletion

Detect when history entries are removed:

```javascript
chrome.history.onVisitRemoved.addListener((removed) => {
  if (removed.allHistory) {
    console.log("All browsing history was cleared");
    
    // Update your stored analytics
    // Clear any cached data
  } else {
    console.log("Specific URLs removed:", removed.urls);
    
    // Log which URLs were removed
    // Useful for privacy-conscious features
  }
});
```

This event is crucial for keeping your extension's data in sync with the user's actual browsing history, especially for analytics extensions that maintain their own records.

Building Analytics Features

Combine the history API with other Chrome APIs to create powerful analytics dashboards that provide insights into browsing behavior.

Top Sites Analysis

Build a top sites feature that identifies most-visited domains:

```javascript
async function getTopSites(daysBack = 7, limit = 10) {
  const startTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  
  const history = await chrome.history.search({
    text: "",
    startTime: startTime,
    maxResults: 0 // Get all available
  });
  
  // Aggregate by domain
  const domainCounts = {};
  
  history.forEach(item => {
    try {
      const url = new URL(item.url);
      const domain = url.hostname;
      
      domainCounts[domain] = {
        visits: (domainCounts[domain]?.visits || 0) + (item.visitCount || 1),
        title: item.title || domain,
        url: item.url
      };
    } catch (e) {
      // Invalid URL, skip
    }
  });
  
  // Sort and return top domains
  const sorted = Object.entries(domainCounts)
    .map(([domain, data]) => ({ domain, ...data }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit);
  
  return sorted;
}

// Usage
getTopSites(30, 10).then(topSites => {
  console.log("Your top sites this month:");
  topSites.forEach((site, index) => {
    console.log(`${index + 1}. ${site.domain} (${site.visits} visits)`);
  });
});
```

Daily Browsing Report

Create a daily summary feature showing browsing patterns:

```javascript
async function generateDailyReport() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  
  const history = await chrome.history.search({
    text: "",
    startTime: todayStart,
    maxResults: 0
  });
  
  const report = {
    totalVisits: history.length,
    uniqueDomains: new Set(
      history.map(item => {
        try {
          return new URL(item.url).hostname;
        } catch {
          return null;
        }
      }).filter(Boolean)
    ).size,
    mostVisited: null,
    productivity: { work: 0, social: 0, entertainment: 0 }
  };
  
  // Find most visited
  const sorted = [...history].sort((a, b) => 
    (b.visitCount || 0) - (a.visitCount || 0)
  );
  report.mostVisited = sorted[0] || null;
  
  // Categorize domains (simplified example)
  const workDomains = ['github.com', 'stackoverflow.com', 'docs.google.com'];
  const socialDomains = ['facebook.com', 'twitter.com', 'reddit.com'];
  
  history.forEach(item => {
    try {
      const domain = new URL(item.url).hostname;
      if (workDomains.some(d => domain.includes(d))) {
        report.productivity.work++;
      } else if (socialDomains.some(d => domain.includes(d))) {
        report.productivity.social++;
      } else {
        report.productivity.entertainment++;
      }
    } catch {}
  });
  
  return report;
}
```

Combining with Storage API

Persist analytics data across sessions:

```javascript
async function trackBrowsingStats() {
  const STORAGE_KEY = "browsing_stats";
  
  // Get existing stats
  const result = await chrome.storage.local.get(STORAGE_KEY);
  let stats = result[STORAGE_KEY] || {
    totalVisits: 0,
    dailyVisits: {},
    topDomains: {}
  };
  
  // Get today's visits
  const today = new Date().toISOString().split("T")[0];
  const todayStart = new Date(today).getTime();
  
  const recentHistory = await chrome.history.search({
    text: "",
    startTime: todayStart,
    maxResults: 0
  });
  
  // Update daily count
  stats.dailyVisits[today] = recentHistory.length;
  stats.totalVisits += recentHistory.length;
  
  // Update domain counts
  recentHistory.forEach(item => {
    try {
      const domain = new URL(item.url).hostname;
      stats.topDomains[domain] = (stats.topDomains[domain] || 0) + 1;
    } catch {}
  });
  
  // Save updated stats
  await chrome.storage.local.set({ [STORAGE_KEY]: stats });
  
  return stats;
}
```

Privacy Considerations

Working with browsing history requires careful attention to privacy best practices. Users trust you with extremely sensitive data, and mishandling it can cause serious harm to both users and your extension's reputation.

Minimizing Permission Requests

Request the minimum permissions necessary for your extension to function. If you only need to read history for analytics, avoid requesting write permissions unless deletion features are core to your functionality. Consider using optional permissions that users can enable when needed, which improves user trust and may expedite Chrome Web Store review.

Data Handling Best Practices

Never transmit history data to external servers without explicit user consent. If your extension requires server-side processing, be transparent about what data is sent and why. Store only aggregate statistics rather than individual browsing records when possible, and implement data retention policies that automatically delete old data.

```javascript
// Example: Only store aggregate statistics, not individual URLs
async function createPrivacySafeAnalytics() {
  const history = await chrome.history.search({
    text: "",
    startTime: Date.now() - (7 * 24 * 60 * 60 * 1000),
    maxResults: 0
  });
  
  // Only aggregate: count by hour, don't store URLs
  const hourlyCounts = new Array(24).fill(0);
  const domainCounts = {};
  
  history.forEach(item => {
    const hour = new Date(item.lastVisitTime).getHours();
    hourlyCounts[hour]++;
    
    try {
      const domain = new URL(item.url).hostname;
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    } catch {}
  });
  
  // Return only aggregate data
  return { hourlyCounts, domainCounts };
}
```

User Control and Transparency

Always provide users with clear controls over what data your extension accesses and how it's used. Include a clear privacy policy explaining your data practices, offer easy ways to delete stored data, and implement user-accessible settings to control functionality.

Security Considerations

History data is sensitive and should be handled securely. Avoid logging URLs to console in production code, validate all data before processing, and be cautious about storing history data in extension storage since it persists on the device.

Related Articles

- [Build a Browsing History Search Extension](/tutorials/build-browsing-history-search.html) - A complete tutorial on building a history search extension with filtering and export features
- [Chrome Bookmarks API](/api-reference/bookmarks-api.html) - Learn how to work with the bookmarks API for similar data management features
- [Extension Analytics and Telemetry](/patterns/analytics-telemetry.html) - Best practices for implementing analytics in your extension while respecting user privacy

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
---

Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.