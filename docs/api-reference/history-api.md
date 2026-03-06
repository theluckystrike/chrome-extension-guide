# Chrome History API Reference

The `chrome.history` API lets you search, read, add, and delete browser history entries. Each history item represents a unique URL the user has visited, and each URL can have multiple visit records with timestamps.

## Permissions

```json
{
  "permissions": ["history"]
}
```

Triggers the "Read and change your browsing history" warning. This is a high-sensitivity permission — use `optional_permissions` when possible.

See the [history permission reference](../permissions/history.md) for details.

## Data Model

History has two related object types:

### HistoryItem

Represents a unique URL in the user's history.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `url` | `string` | The visited URL |
| `title` | `string \| undefined` | Page title |
| `lastVisitTime` | `number \| undefined` | Timestamp of last visit (ms since epoch) |
| `visitCount` | `number \| undefined` | Total number of visits |
| `typedCount` | `number \| undefined` | Times the URL was typed in the address bar |

### VisitItem

Represents a single visit to a URL.

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ID of the corresponding HistoryItem |
| `visitId` | `string` | Unique visit identifier |
| `visitTime` | `number \| undefined` | Timestamp of this visit |
| `referringVisitId` | `string` | ID of the visit that referred to this one |
| `transition` | `TransitionType` | How the user navigated here |

**TransitionType values:** `"link"`, `"typed"`, `"auto_bookmark"`, `"auto_subframe"`, `"manual_subframe"`, `"generated"`, `"auto_toplevel"`, `"form_submit"`, `"reload"`, `"keyword"`, `"keyword_generated"`.

## Core Methods

### chrome.history.search(query)

Search browsing history. Returns `HistoryItem[]`.

```ts
// Search by text (matches title and URL)
const results = await chrome.history.search({
  text: "chrome extensions",
  maxResults: 20,
});

// Get all history from the last 24 hours
const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
const recent = await chrome.history.search({
  text: "",
  startTime: oneDayAgo,
  maxResults: 100,
});

// Get all history (empty text matches everything)
const allHistory = await chrome.history.search({
  text: "",
  startTime: 0,
  maxResults: 1000,
});

// Time-bounded search
const thisWeek = await chrome.history.search({
  text: "",
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
  endTime: Date.now(),
  maxResults: 500,
});
```

**Query properties:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | `string` | required | Search term (empty string matches all) |
| `startTime` | `number` | 24 hours ago | Start of time range |
| `endTime` | `number` | now | End of time range |
| `maxResults` | `number` | 100 | Max items to return (0 = unlimited, capped at ~2^31) |

### chrome.history.getVisits(details)

Get all visit records for a specific URL.

```ts
const visits = await chrome.history.getVisits({
  url: "https://example.com",
});

visits.forEach((visit) => {
  console.log(
    `Visited at ${new Date(visit.visitTime!).toISOString()}`,
    `via ${visit.transition}`,
  );
});
```

### chrome.history.addUrl(details)

Add a URL to the browser's history as if the user visited it.

```ts
await chrome.history.addUrl({
  url: "https://example.com/page",
});

// Optionally set the title (requires a second call)
await chrome.history.addUrl({ url: "https://example.com/page" });
```

### chrome.history.deleteUrl(details)

Delete all history entries for a specific URL.

```ts
await chrome.history.deleteUrl({
  url: "https://example.com/secret-page",
});
```

### chrome.history.deleteRange(range)

Delete all history entries within a time range.

```ts
// Delete the last hour of history
const oneHourAgo = Date.now() - 60 * 60 * 1000;
await chrome.history.deleteRange({
  startTime: oneHourAgo,
  endTime: Date.now(),
});
```

### chrome.history.deleteAll()

Delete the user's entire browsing history.

```ts
await chrome.history.deleteAll();
// This is irreversible — use with extreme caution
```

## Events

### chrome.history.onVisited

Fires every time the user visits a URL. Provides the `HistoryItem` with updated visit count.

```ts
chrome.history.onVisited.addListener((result) => {
  console.log(`Visited: ${result.url}`);
  console.log(`Title: ${result.title}`);
  console.log(`Total visits: ${result.visitCount}`);
});
```

### chrome.history.onVisitRemoved

Fires when history entries are deleted (by the user or programmatically).

```ts
chrome.history.onVisitRemoved.addListener((removed) => {
  if (removed.allHistory) {
    console.log("All history was cleared");
  } else {
    console.log("Removed URLs:", removed.urls);
  }
});
```

## Using with @theluckystrike/webext-messaging

Build a history search and analytics feature:

```ts
// shared/messages.ts
type Messages = {
  searchHistory: {
    request: { query: string; days: number; limit: number };
    response: Array<{ url: string; title: string; visitCount: number; lastVisit: number }>;
  };
  getTopSites: {
    request: { days: number; limit: number };
    response: Array<{ url: string; title: string; visitCount: number }>;
  };
  deleteHistoryUrl: {
    request: { url: string };
    response: { success: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage({
  searchHistory: async ({ query, days, limit }) => {
    const results = await chrome.history.search({
      text: query,
      startTime: Date.now() - days * 24 * 60 * 60 * 1000,
      maxResults: limit,
    });
    return results.map((r) => ({
      url: r.url || "",
      title: r.title || "",
      visitCount: r.visitCount || 0,
      lastVisit: r.lastVisitTime || 0,
    }));
  },
  getTopSites: async ({ days, limit }) => {
    const results = await chrome.history.search({
      text: "",
      startTime: Date.now() - days * 24 * 60 * 60 * 1000,
      maxResults: 0, // no limit
    });
    return results
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
      .slice(0, limit)
      .map((r) => ({
        url: r.url || "",
        title: r.title || "",
        visitCount: r.visitCount || 0,
      }));
  },
  deleteHistoryUrl: async ({ url }) => {
    await chrome.history.deleteUrl({ url });
    return { success: true };
  },
});
```

## Using with @theluckystrike/webext-storage

Track browsing patterns over time:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  dailyStats: {} as Record<string, { pageViews: number; uniqueSites: number }>,
  domainCounts: {} as Record<string, number>,
});

const storage = createStorage({ schema, area: "local" });

chrome.history.onVisited.addListener(async (result) => {
  if (!result.url) return;

  const today = new Date().toISOString().slice(0, 10); // "2026-03-06"
  const domain = new URL(result.url).hostname;

  // Update daily stats
  const stats = await storage.get("dailyStats");
  const todayStats = stats[today] || { pageViews: 0, uniqueSites: 0 };
  todayStats.pageViews++;
  stats[today] = todayStats;
  await storage.set("dailyStats", stats);

  // Update domain counts
  const domains = await storage.get("domainCounts");
  domains[domain] = (domains[domain] || 0) + 1;
  await storage.set("domainCounts", domains);
});
```

## Common Patterns

### Get browsing activity for today

```ts
async function getTodayHistory() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return chrome.history.search({
    text: "",
    startTime: startOfDay.getTime(),
    maxResults: 0,
  });
}
```

### Check if a URL was visited recently

```ts
async function wasVisitedRecently(url: string, withinMs: number): Promise<boolean> {
  const visits = await chrome.history.getVisits({ url });
  const cutoff = Date.now() - withinMs;
  return visits.some((v) => (v.visitTime || 0) > cutoff);
}
```

### Get most visited domains

```ts
async function topDomains(days: number, limit: number) {
  const results = await chrome.history.search({
    text: "",
    startTime: Date.now() - days * 24 * 60 * 60 * 1000,
    maxResults: 0,
  });

  const domainMap = new Map<string, number>();
  for (const item of results) {
    if (!item.url) continue;
    try {
      const domain = new URL(item.url).hostname;
      domainMap.set(domain, (domainMap.get(domain) || 0) + (item.visitCount || 1));
    } catch { /* skip invalid URLs */ }
  }

  return [...domainMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }));
}
```

## Gotchas

1. **`search()` defaults to last 24 hours.** Set `startTime: 0` to search all history. Without this, you'll miss older entries.

2. **`maxResults` defaults to 100.** Set it to `0` for unlimited results when you need comprehensive data.

3. **`text: ""` matches everything.** This is how you do a time-range-only query. It's not a bug — it's the API design.

4. **`deleteAll()` is irreversible.** No confirmation dialog. Your extension is responsible for confirming with the user.

5. **Visit counts include subframes.** A single page load with iframes may generate multiple `onVisited` events. Filter by `transition` type if needed.

6. **History items don't store visit timestamps directly.** `lastVisitTime` is only the most recent visit. Use `getVisits()` to get all individual visit timestamps.

7. **Incognito history is never stored.** The History API has no access to incognito browsing data.

## Related

- [history permission](../permissions/history.md)
- [Bookmarks API](bookmarks-api.md)
- [Tabs API](tabs-api.md)
- [Chrome history API docs](https://developer.chrome.com/docs/extensions/reference/api/history)
