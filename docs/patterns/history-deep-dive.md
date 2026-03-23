---
layout: default
title: "Chrome Extension History detailed look. Best Practices"
description: "Detailed look into the History API for browsing data access."
canonical_url: "https://bestchromeextensions.com/patterns/history-deep detailed look/"
---

Chrome Extension History detailed look

Overview {#overview}

The Chrome History API (`chrome.history`) provides powerful capabilities for building extension features that analyze, visualize, and manage user browsing history. This guide covers production-ready patterns for working with the History API, from basic searching to advanced analytics and real-time monitoring.

> Important: The History API requires the `"history"` permission in your manifest. For Manifest V3, this is added to the `permissions` array. Some sensitive operations may trigger additional permission warnings for users.

---

Pattern 1: Searching History with Time-Range Filters {#pattern-1-searching-history-with-time-range-filters}

The foundation of history analysis begins with `chrome.history.search()`. This method accepts a query object and returns matching `HistoryItem` objects with pagination support for large result sets.

Basic Time-Range Search {#basic-time-range-search}

```ts
// history/search.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface HistoryItem {
  id: string;
  url?: string;
  title?: string;
  lastVisitTime: number;
  visitCount: number;
  typedCount: number;
}

interface SearchQuery {
  text: string;
  startTime?: number;
  endTime?: number;
  maxResults?: number;
}

/
 * Searches browser history within a time range.
 * @param query - Search parameters
 * @returns Array of matching history items
 */
export async function searchHistory(query: SearchQuery): Promise<HistoryItem[]> {
  return new Promise((resolve, reject) => {
    chrome.history.search(query, (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(results);
      }
    });
  });
}

/
 * Gets history from the last N days.
 * @param days - Number of days to look back
 * @param maxResults - Maximum items to return
 */
export async function getRecentHistory(
  days: number,
  maxResults: number = 100
): Promise<HistoryItem[]> {
  const endTime = Date.now();
  const startTime = endTime - days * 24 * 60 * 60 * 1000;

  return searchHistory({
    text: "",
    startTime,
    endTime,
    maxResults,
  });
}

/
 * Searches history for a specific domain.
 * @param domain - Domain to search for (e.g., "github.com")
 * @param maxResults - Maximum items to return
 */
export async function searchByDomain(
  domain: string,
  maxResults: number = 100
): Promise<HistoryItem[]> {
  return searchHistory({
    text: domain,
    maxResults,
  });
}
```

Advanced Filtering with Compound Queries {#advanced-filtering-with-compound-queries}

```ts
// history/advanced-search.ts

interface HistoryFilter {
  query: string;
  startDate?: Date;
  endDate?: Date;
  domains?: string[];
  excludeDomains?: string[];
  minVisitCount?: number;
}

interface FilteredHistoryItem extends HistoryItem {
  domain: string;
}

/
 * Advanced history search with multiple filter criteria.
 */
export async function advancedHistorySearch(
  filter: HistoryFilter,
  maxResults: number = 500
): Promise<FilteredHistoryItem[]> {
  // First, get a broad set of results
  const items = await searchHistory({
    text: filter.query,
    startTime: filter.startDate?.getTime(),
    endTime: filter.endDate?.getTime(),
    maxResults: maxResults * 2, // Over-fetch for filtering
  });

  // Apply additional filters in memory
  return items
    .filter((item) => {
      if (!item.url) return false;

      const url = new URL(item.url);
      const domain = url.hostname;

      // Domain inclusion filter
      if (filter.domains?.length) {
        const matchesDomain = filter.domains.some((d) =>
          domain.includes(d)
        );
        if (!matchesDomain) return false;
      }

      // Domain exclusion filter
      if (filter.excludeDomains?.length) {
        const matchesExcluded = filter.excludeDomains.some((d) =>
          domain.includes(d)
        );
        if (matchesExcluded) return false;
      }

      // Visit count filter
      if (filter.minVisitCount && item.visitCount < filter.minVisitCount) {
        return false;
      }

      return true;
    })
    .map((item) => ({
      ...item,
      domain: item.url ? new URL(item.url).hostname : "",
    }))
    .slice(0, maxResults);
}

/
 * Creates a time-range filter for the current week.
 */
export function getThisWeekRange(): { startDate: Date; endDate: Date } {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return {
    startDate: startOfWeek,
    endDate: now,
  };
}
```

---

Pattern 2: Getting Detailed Visit Data with chrome.history.getVisits {#pattern-2-getting-detailed-visit-data-with-chromehistorygetvisits}

While `chrome.history.search()` returns summary information, `chrome.history.getVisits()` provides detailed information about each individual visit to a URL, including transition types and referrer URLs.

Retrieving Visit Details {#retrieving-visit-details}

```ts
// history/visits.ts

interface VisitItem {
  id: string;
  visitId: string;
  visitTime: number;
  referringVisitId: string;
  transition: string;
}

interface VisitDetails extends VisitItem {
  url: string;
  title?: string;
}

/
 * Gets all visits for a specific URL.
 * @param url - The URL to get visits for
 * @returns Array of visit details
 */
export async function getUrlVisits(url: string): Promise<VisitDetails[]> {
  return new Promise((resolve, reject) => {
    chrome.history.getVisits({ url }, (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(results);
      }
    });
  });
}

/
 * Gets the most recent visit for each unique URL in history.
 */
export async function getRecentUniqueVisits(
  maxResults: number = 100
): Promise<{ url: string; lastVisit: number; visitCount: number }[]> {
  const history = await searchHistory({
    text: "",
    maxResults: maxResults * 3, // Fetch more to find unique URLs
  });

  // Group by URL and keep the most recent visit
  const urlMap = new Map<string, { lastVisit: number; visitCount: number }>();

  for (const item of history) {
    if (!item.url) continue;

    const existing = urlMap.get(item.url);
    if (!existing || item.lastVisitTime > existing.lastVisit) {
      urlMap.set(item.url, {
        lastVisit: item.lastVisitTime,
        visitCount: item.visitCount,
      });
    }
  }

  return Array.from(urlMap.entries())
    .map(([url, data]) => ({ url, ...data }))
    .sort((a, b) => b.lastVisit - a.lastVisit)
    .slice(0, maxResults);
}

/
 * Analyzes transition types for a URL to understand how users arrived.
 */
export async function analyzeTransitionTypes(
  url: string
): Promise<Record<string, number>> {
  const visits = await getUrlVisits(url);

  const transitions: Record<string, number> = {};
  for (const visit of visits) {
    const transition = visit.transition || "unknown";
    transitions[transition] = (transitions[transition] || 0) + 1;
  }

  return transitions;
}
```

Transition Types Reference {#transition-types-reference}

```ts
// history/transition-types.ts

/
 * Chrome history transition types:
 * - link: User clicked a link on another page
 * - typed: User typed the URL in the address bar (also used for other explicit navigation)
 * - auto_bookmark: User arrived via a suggestion in the UI (e.g., a menu item)
 * - auto_subframe: Subframe navigation the user didn't request (e.g., an ad)
 * - manual_subframe: User navigated within a subframe
 * - generated: User typed in the address bar and selected a non-URL entry (e.g., a search suggestion)
 * - auto_toplevel: Automatically generated top-level navigation
 * - form_submit: User submitted a form
 * - reload: User reloaded the page
 * - keyword: URL generated from a replaceable keyword (not default search provider)
 * - keyword_generated: Visit generated for a keyword
 */

export const TransitionType = {
  LINK: "link",
  TYPED: "typed",
  AUTO_BOOKMARK: "auto_bookmark",
  AUTO_SUBFRAME: "auto_subframe",
  MANUAL_SUBFRAME: "manual_subframe",
  GENERATED: "generated",
  AUTO_TOPLEVEL: "auto_toplevel",
  FORM_SUBMIT: "form_submit",
  RELOAD: "reload",
  KEYWORD: "keyword",
  KEYWORD_GENERATED: "keyword_generated",
} as const;

export function isValidTransition(type: string): boolean {
  return Object.values(TransitionType).includes(type as any);
}
```

---

Pattern 3: Building a Visual Browsing Timeline {#pattern-3-building-a-visual-browsing-timeline}

A visual timeline groups history items by time periods (hours, days, weeks) and organizes them by domain, providing users with an intuitive view of their browsing activity.

Timeline Data Structure {#timeline-data-structure}

```ts
// history/timeline.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface TimelineEntry {
  domain: string;
  url: string;
  title: string;
  timestamp: number;
  visitCount: number;
}

interface TimelineGroup {
  label: string;
  startTime: number;
  endTime: number;
  entries: TimelineEntry[];
  domains: Set<string>;
}

interface BrowsingTimeline {
  groups: TimelineGroup[];
  totalItems: number;
  uniqueDomains: number;
  generatedAt: number;
}

const timelineStorage = createStorage({
  schema: defineSchema({
    cachedTimeline: null as BrowsingTimeline | null,
    timelineCacheTime: 0,
  }),
  area: "local",
});

/
 * Groups history items into timeline periods.
 */
export function buildTimeline(
  items: HistoryItem[],
  groupBy: "hour" | "day" | "week" = "day"
): BrowsingTimeline {
  const groups: TimelineGroup[] = [];
  const MS_PER_HOUR = 60 * 60 * 1000;
  const MS_PER_DAY = 24 * MS_PER_HOUR;
  const MS_PER_WEEK = 7 * MS_PER_DAY;

  const periodMs =
    groupBy === "hour"
      ? MS_PER_HOUR
      : groupBy === "day"
        ? MS_PER_DAY
        : MS_PER_WEEK;

  // Sort items by time (newest first)
  const sortedItems = [...items].sort((a, b) => b.lastVisitTime - a.lastVisitTime);

  for (const item of sortedItems) {
    if (!item.url) continue;

    const domain = new URL(item.url).hostname;
    const periodStart = Math.floor(item.lastVisitTime / periodMs) * periodMs;
    const periodEnd = periodStart + periodMs;

    // Find existing group or create new one
    let group = groups.find(
      (g) => g.startTime === periodStart
    );

    if (!group) {
      const label =
        groupBy === "hour"
          ? new Date(periodStart).toLocaleString("en-US", {
              hour: "numeric",
              day: "numeric",
              month: "short",
            })
          : groupBy === "day"
            ? new Date(periodStart).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })
            : new Date(periodStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

      group = {
        label,
        startTime: periodStart,
        endTime: periodEnd,
        entries: [],
        domains: new Set(),
      };
      groups.push(group);
    }

    group.entries.push({
      domain,
      url: item.url,
      title: item.title || item.url,
      timestamp: item.lastVisitTime,
      visitCount: item.visitCount,
    });
    group.domains.add(domain);
  }

  const allDomains = new Set<string>();
  let totalItems = 0;

  for (const group of groups) {
    totalItems += group.entries.length;
    group.domains.forEach((d) => allDomains.add(d));
  }

  return {
    groups,
    totalItems,
    uniqueDomains: allDomains.size,
    generatedAt: Date.now(),
  };
}

/
 * Generates a cached timeline with automatic refresh.
 */
export async function generateTimeline(
  days: number = 7,
  forceRefresh: boolean = false
): Promise<BrowsingTimeline> {
  const cache = await timelineStorage.get("cachedTimeline");
  const cacheTime = await timelineStorage.get("timelineCacheTime");
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  if (
    !forceRefresh &&
    cache &&
    cacheTime &&
    Date.now() - cacheTime < CACHE_TTL
  ) {
    return cache;
  }

  const items = await getRecentHistory(days, 1000);
  const timeline = buildTimeline(items, "day");

  await timelineStorage.set("cachedTimeline", timeline);
  await timelineStorage.set("timelineCacheTime", Date.now());

  return timeline;
}
```

---

Pattern 4: History Analytics {#pattern-4-history-analytics}

Analyzing browsing patterns provides insights into user behavior, including most visited sites, time-of-day patterns, and browsing trends.

Analytics Implementation {#analytics-implementation}

```ts
// history/analytics.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface DomainStats {
  domain: string;
  visitCount: number;
  uniqueUrls: number;
  lastVisit: number;
  totalTime?: number;
}

interface TimeOfDayStats {
  hour: number;
  visits: number;
  uniqueDomains: number;
}

interface HistoryAnalytics {
  topDomains: DomainStats[];
  timeOfDay: TimeOfDayStats[];
  dailyTrend: { date: string; visits: number }[];
  totalVisits: number;
  uniqueDomains: number;
}

const analyticsStorage = createStorage({
  schema: defineSchema({
    analyticsCache: null as HistoryAnalytics | null,
    analyticsCacheTime: 0,
  }),
  area: "local",
});

/
 * Calculates domain-level statistics from history.
 */
export async function calculateDomainStats(
  days: number = 30,
  limit: number = 50
): Promise<DomainStats[]> {
  const items = await getRecentHistory(days, 5000);

  const domainMap = new Map<string, DomainStats>();

  for (const item of items) {
    if (!item.url) continue;

    const domain = new URL(item.url).hostname;
    const existing = domainMap.get(domain);

    if (!existing) {
      domainMap.set(domain, {
        domain,
        visitCount: 1,
        uniqueUrls: 1,
        lastVisit: item.lastVisitTime,
      });
    } else {
      existing.visitCount += 1;
      existing.lastVisit = Math.max(existing.lastVisit, item.lastVisitTime);
    }
  }

  return Array.from(domainMap.values())
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, limit);
}

/
 * Analyzes visits by hour of day.
 */
export async function analyzeTimeOfDay(
  days: number = 30
): Promise<TimeOfDayStats[]> {
  const items = await getRecentHistory(days, 5000);

  const hourMap = new Map<number, { visits: number; domains: Set<string> }>();

  for (const item of items) {
    if (!item.url) continue;

    const hour = new Date(item.lastVisitTime).getHours();
    const domain = new URL(item.url).hostname;

    const existing = hourMap.get(hour);
    if (!existing) {
      hourMap.set(hour, { visits: 1, domains: new Set([domain]) });
    } else {
      existing.visits += 1;
      existing.domains.add(domain);
    }
  }

  return Array.from({ length: 24 }, (_, hour) => {
    const data = hourMap.get(hour) || { visits: 0, domains: new Set() };
    return {
      hour,
      visits: data.visits,
      uniqueDomains: data.domains.size,
    };
  });
}

/
 * Generates comprehensive history analytics.
 */
export async function generateAnalytics(
  days: number = 30
): Promise<HistoryAnalytics> {
  const cache = await analyticsStorage.get("analyticsCache");
  const cacheTime = await analyticsStorage.get("analyticsCacheTime");
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  if (cache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    return cache;
  }

  const items = await getRecentHistory(days, 5000);
  const topDomains = await calculateDomainStats(days, 20);
  const timeOfDay = await analyzeTimeOfDay(days);

  // Daily trend calculation
  const dailyMap = new Map<string, number>();
  for (const item of items) {
    if (!item.url) continue;
    const date = new Date(item.lastVisitTime).toISOString().split("T")[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  }

  const dailyTrend = Array.from(dailyMap.entries())
    .map(([date, visits]) => ({ date, visits }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Unique domains count
  const allDomains = new Set<string>();
  for (const item of items) {
    if (item.url) {
      allDomains.add(new URL(item.url).hostname);
    }
  }

  const analytics: HistoryAnalytics = {
    topDomains,
    timeOfDay,
    dailyTrend,
    totalVisits: items.length,
    uniqueDomains: allDomains.size,
  };

  await analyticsStorage.set("analyticsCache", analytics);
  await analyticsStorage.set("analyticsCacheTime", Date.now());

  return analytics;
}
```

---

Pattern 5: Selective History Deletion {#pattern-5-selective-history-deletion}

The History API provides methods for removing specific URLs or ranges of history, enabling features like "forget this page" or bulk cleanup.

Deletion Operations {#deletion-operations}

```ts
// history/delete.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface DeleteResult {
  success: boolean;
  deletedItems: number;
  errors: string[];
}

interface DeleteRange {
  startTime: number;
  endTime: number;
}

const deleteHistoryStorage = createStorage({
  schema: defineSchema({
    deletionHistory: [] as { url: string; deletedAt: number }[],
  }),
  area: "local",
});

/
 * Deletes a specific URL from history.
 */
export async function deleteUrl(url: string): Promise<DeleteResult> {
  return new Promise((resolve) => {
    chrome.history.deleteUrl({ url }, () => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          deletedItems: 0,
          errors: [chrome.runtime.lastError.message],
        });
      } else {
        resolve({
          success: true,
          deletedItems: 1,
          errors: [],
        });
      }
    });
  });
}

/
 * Deletes history within a time range.
 */
export async function deleteRange(range: DeleteRange): Promise<DeleteResult> {
  return new Promise((resolve) => {
    chrome.history.deleteRange(range, () => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          deletedItems: 0,
          errors: [chrome.runtime.lastError.message],
        });
      } else {
        resolve({
          success: true,
          deletedItems: -1, // Unknown count
          errors: [],
        });
      }
    });
  });
}

/
 * Deletes all history.
 */
export async function deleteAllHistory(): Promise<DeleteResult> {
  return deleteRange({
    startTime: 0,
    endTime: Date.now(),
  });
}

/
 * Deletes history for specific domains.
 */
export async function deleteByDomains(
  domains: string[],
  beforeTime: number = Date.now()
): Promise<DeleteResult> {
  const errors: string[] = [];
  let deletedItems = 0;

  // Search for history matching these domains
  for (const domain of domains) {
    const items = await searchHistory({
      text: domain,
      endTime: beforeTime,
      maxResults: 1000,
    });

    for (const item of items) {
      if (item.url && item.url.includes(domain)) {
        const result = await deleteUrl(item.url);
        if (result.success) {
          deletedItems++;
        } else {
          errors.push(...result.errors);
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    deletedItems,
    errors,
  };
}

/
 * Deletes history older than a specified number of days.
 */
export async function deleteOldHistory(daysToKeep: number): Promise<DeleteResult> {
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

  return deleteRange({
    startTime: 0,
    endTime: cutoffTime,
  });
}
```

---

Pattern 6: History Export with Pagination {#pattern-6-history-export-with-pagination}

Exporting large history datasets requires pagination to handle memory constraints and provide progress feedback.

Export Implementation {#export-implementation}

```ts
// history/export.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";
import { sendMessage } from "@theluckystrike/webext-messaging";

interface ExportProgress {
  status: "idle" | "exporting" | "complete" | "error";
  totalItems: number;
  exportedItems: number;
  currentPage: number;
  totalPages: number;
  error?: string;
}

interface ExportOptions {
  format: "json" | "csv";
  startDate?: Date;
  endDate?: Date;
  domains?: string[];
  includeVisits?: boolean;
  pageSize?: number;
}

interface ExportedRecord {
  url: string;
  title: string;
  domain: string;
  lastVisitTime: number;
  visitCount: number;
  firstVisitTime?: number;
}

const exportStorage = createStorage({
  schema: defineSchema({
    exportProgress: null as ExportProgress | null,
    lastExport: null as { format: string; records: number; timestamp: number } | null,
  }),
  area: "local",
});

/
 * Exports history with pagination support.
 */
export async function exportHistory(
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void
): Promise<ExportedRecord[]> {
  const {
    format,
    startDate,
    endDate,
    domains,
    includeVisits = false,
    pageSize = 500,
  } = options;

  const progress: ExportProgress = {
    status: "exporting",
    totalItems: 0,
    exportedItems: 0,
    currentPage: 0,
    totalPages: 0,
  };

  await exportStorage.set("exportProgress", progress);
  onProgress?.(progress);

  try {
    // First, get total count for progress tracking
    const allItems = await searchHistory({
      text: "",
      startTime: startDate?.getTime(),
      endTime: endDate?.getTime(),
      maxResults: 10000,
    });

    // Filter by domains if specified
    let filteredItems = allItems;
    if (domains?.length) {
      filteredItems = allItems.filter((item) => {
        if (!item.url) return false;
        const domain = new URL(item.url).hostname;
        return domains.some((d) => domain.includes(d));
      });
    }

    progress.totalItems = filteredItems.length;
    progress.totalPages = Math.ceil(filteredItems.length / pageSize);
    await exportStorage.set("exportProgress", progress);

    const records: ExportedRecord[] = [];
    const pages = Math.ceil(filteredItems.length / pageSize);

    for (let page = 0; page < pages; page++) {
      const start = page * pageSize;
      const end = Math.min(start + pageSize, filteredItems.length);
      const pageItems = filteredItems.slice(start, end);

      for (const item of pageItems) {
        if (!item.url) continue;

        const record: ExportedRecord = {
          url: item.url,
          title: item.title || "",
          domain: new URL(item.url).hostname,
          lastVisitTime: item.lastVisitTime,
          visitCount: item.visitCount,
        };

        // Optionally include first visit time
        if (includeVisits) {
          const visits = await getUrlVisits(item.url);
          if (visits.length > 0) {
            record.firstVisitTime = Math.min(...visits.map((v) => v.visitTime));
          }
        }

        records.push(record);
      }

      progress.currentPage = page + 1;
      progress.exportedItems = records.length;
      await exportStorage.set("exportProgress", progress);
      onProgress?.(progress);
    }

    progress.status = "complete";
    await exportStorage.set("exportProgress", progress);

    // Store export metadata
    await exportStorage.set("lastExport", {
      format,
      records: records.length,
      timestamp: Date.now(),
    });

    return records;
  } catch (error) {
    progress.status = "error";
    progress.error = error instanceof Error ? error.message : "Unknown error";
    await exportStorage.set("exportProgress", progress);
    onProgress?.(progress);
    throw error;
  }
}

/
 * Converts records to CSV format.
 */
export function toCSV(records: ExportedRecord[]): string {
  const headers = [
    "URL",
    "Title",
    "Domain",
    "Last Visit",
    "Visit Count",
    "First Visit",
  ];

  const rows = records.map((r) => [
    `"${r.url.replace(/"/g, '""')}"`,
    `"${(r.title || "").replace(/"/g, '""')}"`,
    `"${r.domain}"`,
    new Date(r.lastVisitTime).toISOString(),
    r.visitCount.toString(),
    r.firstVisitTime ? new Date(r.firstVisitTime).toISOString() : "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/
 * Exports and downloads history file.
 */
export async function downloadHistory(
  options: ExportOptions
): Promise<void> {
  const records = await exportHistory(options);

  let content: string;
  let mimeType: string;
  let extension: string;

  if (options.format === "csv") {
    content = toCSV(records);
    mimeType = "text/csv";
    extension = "csv";
  } else {
    content = JSON.stringify(records, null, 2);
    mimeType = "application/json";
    extension = "json";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `history-export-${timestamp}.${extension}`;

  chrome.downloads.download({
    url,
    filename,
    saveAs: true,
  });
}
```

---

Pattern 7: Real-Time History Monitoring {#pattern-7-real-time-history-monitoring}

Using the History API's event listeners, you can monitor browsing activity in real-time and respond to new visits or deletions.

Event Listeners {#event-listeners}

```ts
// history/monitoring.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";
import { sendMessage } from "@theluckystrike/webext-messaging";

interface VisitEvent {
  url: string;
  title: string;
  timestamp: number;
  domain: string;
}

interface HistoryEventConfig {
  enabled: boolean;
  watchedDomains?: string[];
  notifyOnNewVisit: boolean;
  notifyOnDeletion: boolean;
}

const monitorStorage = createStorage({
  schema: defineSchema({
    monitorConfig: {
      enabled: true,
      watchedDomains: [],
      notifyOnNewVisit: true,
      notifyOnDeletion: false,
    } as HistoryEventConfig,
    recentEvents: [] as VisitEvent[],
  }),
  area: "local",
});

let isListening = false;

/
 * Starts listening to history changes.
 */
export function startHistoryMonitor(): void {
  if (isListening) return;

  // Listen for new visits
  chrome.history.onVisited.addListener(handleNewVisit);
  chrome.history.onVisitRemoved.addListener(handleVisitRemoved);

  isListening = true;
  console.log("[HistoryMonitor] Started monitoring history events");
}

/
 * Stops listening to history changes.
 */
export function stopHistoryMonitor(): void {
  if (!isListening) return;

  chrome.history.onVisited.removeListener(handleNewVisit);
  chrome.history.onVisitRemoved.removeListener(handleVisitRemoved);

  isListening = false;
  console.log("[HistoryMonitor] Stopped monitoring history events");
}

/
 * Handles new visit events.
 */
async function handleNewVisit(item: HistoryItem): Promise<void> {
  const config = await monitorStorage.get("monitorConfig");

  if (!config.enabled || !config.notifyOnNewVisit) return;
  if (!item.url) return;

  const domain = new URL(item.url).hostname;

  // Filter by watched domains if configured
  if (config.watchedDomains?.length) {
    const matchesWatched = config.watchedDomains.some((d) =>
      domain.includes(d)
    );
    if (!matchesWatched) return;
  }

  const event: VisitEvent = {
    url: item.url,
    title: item.title || "",
    timestamp: item.lastVisitTime,
    domain,
  };

  // Store recent event
  const recentEvents = (await monitorStorage.get("recentEvents")) || [];
  recentEvents.unshift(event);
  // Keep only last 100 events
  recentEvents.splice(100);
  await monitorStorage.set("recentEvents", recentEvents);

  // Notify extension pages
  try {
    await sendMessage({
      type: "HISTORY_VISIT",
      payload: event,
    });
  } catch (error) {
    console.error("[HistoryMonitor] Failed to send message:", error);
  }
}

/
 * Handles visit deletion events.
 */
async function handleVisitRemoved(
  removed: chrome.history.RemovedResult
): Promise<void> {
  const config = await monitorStorage.get("monitorConfig");

  if (!config.enabled || !config.notifyOnDeletion) return;

  // Notify about removed visits
  try {
    await sendMessage({
      type: "HISTORY_REMOVED",
      payload: {
        removedUrls: removed.urls,
        allHistory: removed.allHistory,
      },
    });
  } catch (error) {
    console.error("[HistoryMonitor] Failed to send removal message:", error);
  }
}

/
 * Gets recent history events.
 */
export async function getRecentEvents(limit: number = 20): Promise<VisitEvent[]> {
  const events = (await monitorStorage.get("recentEvents")) || [];
  return events.slice(0, limit);
}

/
 * Updates monitoring configuration.
 */
export async function updateMonitorConfig(
  config: Partial<HistoryEventConfig>
): Promise<void> {
  const currentConfig = await monitorStorage.get("monitorConfig");
  const newConfig = { ...currentConfig, ...config };
  await monitorStorage.set("monitorConfig", newConfig);
}
```

---

Pattern 8: Cross-Referencing History with Bookmarks {#pattern-8-cross-referencing-history-with-bookmarks}

Discover URLs that have been visited but not saved as bookmarks, helping users find content worth preserving.

History-Bookmark Cross-Reference {#history-bookmark-cross-reference}

```ts
// history/bookmark-crossref.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface BookmarkItem {
  id: string;
  url?: string;
  title: string;
  dateAdded: number;
  parentId: string;
}

interface UnbookmarkedVisit {
  url: string;
  title: string;
  domain: string;
  lastVisit: number;
  visitCount: number;
  firstVisit?: number;
}

const crossrefStorage = createStorage({
  schema: defineSchema({
    bookmarkCache: [] as string[],
    bookmarkCacheTime: 0,
    unbookmarkedCache: null as UnbookmarkedVisit[] | null,
  }),
  area: "local",
});

/
 * Gets all bookmarked URLs.
 */
export async function getAllBookmarks(): Promise<Set<string>> {
  const cacheTime = await crossrefStorage.get("bookmarkCacheTime");
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Check cache
  if (cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    const cached = await crossrefStorage.get("bookmarkCache");
    if (cached) return new Set(cached);
  }

  const bookmarkUrls = new Set<string>();

  // Recursively collect bookmarks
  async function collectBookmarks(
    folderId: string
  ): Promise<BookmarkItem[]> {
    return new Promise((resolve) => {
      chrome.bookmarks.getChildren(folderId, (children) => {
        if (chrome.runtime.lastError) {
          console.error("Bookmark error:", chrome.runtime.lastError);
          resolve([]);
          return;
        }

        resolve(children);
      });
    });
  }

  // Start from root folders
  const rootFolders = await new Promise<BookmarkItem[]>((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      const roots = tree[0]?.children || [];
      resolve(roots);
    });
  });

  // Collect all bookmarked URLs
  async function processFolder(folderId: string): Promise<void> {
    const children = await collectBookmarks(folderId);
    for (const child of children) {
      if (child.url) {
        bookmarkUrls.add(child.url);
      }
      // Recurse into subfolders
      if (child.children) {
        for (const subChild of child.children) {
          if (subChild.url) {
            bookmarkUrls.add(subChild.url);
          }
        }
      }
    }
  }

  for (const folder of rootFolders) {
    await processFolder(folder.id);
  }

  // Update cache
  await crossrefStorage.set("bookmarkCache", Array.from(bookmarkUrls));
  await crossrefStorage.set("bookmarkCacheTime", Date.now());

  return bookmarkUrls;
}

/
 * Finds visited URLs that are not bookmarked.
 */
export async function findUnbookmarkedVisits(
  days: number = 30,
  minVisits: number = 2,
  limit: number = 100
): Promise<UnbookmarkedVisit[]> {
  // Get bookmarks
  const bookmarks = await getAllBookmarks();

  // Get recent history
  const history = await getRecentHistory(days, 2000);

  const unbookmarked: UnbookmarkedVisit[] = [];

  for (const item of history) {
    if (!item.url) continue;

    // Skip if bookmarked
    if (bookmarks.has(item.url)) continue;

    // Skip if not visited enough
    if (item.visitCount < minVisits) continue;

    const domain = new URL(item.url).hostname;

    // Get first visit
    const visits = await getUrlVisits(item.url);
    const firstVisit = visits.length > 0
      ? Math.min(...visits.map((v) => v.visitTime))
      : undefined;

    unbookmarked.push({
      url: item.url,
      title: item.title || "",
      domain,
      lastVisit: item.lastVisitTime,
      visitCount: item.visitCount,
      firstVisit,
    });

    if (unbookmarked.length >= limit) break;
  }

  // Sort by visit count (most visited first)
  unbookmarked.sort((a, b) => b.visitCount - a.visitCount);

  // Cache results
  await crossrefStorage.set("unbookmarkedCache", unbookmarked);

  return unbookmarked;
}

/
 * Creates a bookmark for a URL.
 */
export async function quickBookmark(
  url: string,
  title: string,
  folderId: string = "1" // Default bookmarks folder
): Promise<chrome.bookmarks.BookmarkTreeNode> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create(
      {
        parentId: folderId,
        title: title || url,
        url,
      },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      }
    );
  });
}

/
 * Bulk bookmark multiple URLs.
 */
export async function bulkBookmark(
  visits: UnbookmarkedVisit[],
  folderName: string = "Discovered"
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;

  // Create or find folder
  const folder = await new Promise<chrome.bookmarks.BookmarkTreeNode>(
    (resolve, reject) => {
      chrome.bookmarks.search({ title: folderName }, (results) => {
        if (results.length > 0) {
          resolve(results[0]);
        } else {
          chrome.bookmarks.create({ title: folderName }, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        }
      });
    }
  );

  // Bookmark each URL
  for (const visit of visits) {
    try {
      await quickBookmark(visit.url, visit.title, folder.id);
      created++;
    } catch (error) {
      errors.push(
        `${visit.url}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Invalidate bookmark cache
  await crossrefStorage.set("bookmarkCacheTime", 0);

  return { created, errors };
}
```

---

Summary Table {#summary-table}

| Pattern | API Methods | Use Case | Complexity |
|---------|-------------|----------|------------|
| 1. Time-Range Search | `chrome.history.search()` | Find history within date ranges, domain filtering | Basic |
| 2. Visit Details | `chrome.history.getVisits()` | Get individual visit info, transition analysis | Intermediate |
| 3. Visual Timeline | `search()` + grouping | Display browsing activity chronologically | Intermediate |
| 4. Analytics | `search()` + aggregation | Top sites, time-of-day patterns, trends | Advanced |
| 5. Selective Deletion | `deleteUrl()`, `deleteRange()` | Remove specific URLs or time ranges | Intermediate |
| 6. Export with Pagination | `search()` + pagination | Export large datasets to JSON/CSV | Advanced |
| 7. Real-Time Monitoring | `onVisited`, `onVisitRemoved` | Track new visits and deletions live | Advanced |
| 8. Bookmark Cross-Reference | `search()` + `bookmarks.*` | Find visited but unbookmarked content | Advanced |

Key Takeaways {#key-takeaways}

1. Always use pagination: History can contain thousands of items; process in batches
2. Cache aggressively: History queries can be expensive; implement TTL-based caching
3. Handle permissions gracefully: History permission triggers warnings; explain why you need it
4. Respect user privacy: Never exfiltrate history data; process locally
5. Use storage libraries: `@theluckystrike/webext-storage` simplifies state management
6. Use messaging: `@theluckystrike/webext-messaging` for real-time updates to UI

Required Permissions {#required-permissions}

```json
{
  "permissions": [
    "history"
  ],
  "optional_permissions": [
    "bookmarks"
  ]
}
```

> Note: The `"bookmarks"` permission is optional and only needed for Pattern 8. Always prefer optional permissions to reduce permission warnings.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
