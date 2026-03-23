---
layout: default
title: "Chrome Extension Top Sites — Best Practices"
description: "Access and display top sites from Chrome history using the Top Sites API for quick access features."
canonical_url: "https://bestchromeextensions.com/patterns/top-sites/"
---

# Top Sites API Patterns

## Overview {#overview}

The Chrome Top Sites API (`chrome.topSites`) provides access to the user's most visited websites. This guide covers practical patterns for implementing top sites functionality in Chrome Extensions, from basic retrieval to advanced speed dial implementations.

---

## Pattern 1: Fetching Top Sites with chrome.topSites.get {#pattern-1-fetching-top-sites-with-chrometopsitesget}

The fundamental pattern for retrieving top sites:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storage = createStorage(defineSchema({
  topSitesCache: { type: "object", default: null },
  cacheTimestamp: { type: "number", default: 0 },
}));

interface TopSite {
  url: string;
  title: string;
  favicon?: string;
  domain?: string;
}

async function getTopSites(limit = 20): Promise<TopSite[]> {
  const cache = await storage.get("topSitesCache");
  const timestamp = await storage.get("cacheTimestamp");
  
  // Return cached data if less than 5 minutes old
  if (cache && Date.now() - timestamp < 5 * 60 * 1000) {
    return cache;
  }
  
  const sites = await chrome.topSites.get();
  const formatted = sites.slice(0, limit).map(site => ({
    url: site.url,
    title: site.title,
    favicon: `https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=32`,
    domain: new URL(site.url).hostname,
  }));
  
  await storage.set("topSitesCache", formatted);
  await storage.set("cacheTimestamp", Date.now());
  
  return formatted;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_TOP_SITES") {
    getTopSites(message.limit).then(sendResponse);
    return true;
  }
});
```

### Manifest Configuration {#manifest-configuration}

```json
{
  "permissions": ["topSites"]
}
```

---

## Pattern 2: Building a Custom New Tab Speed Dial {#pattern-2-building-a-custom-new-tab-speed-dial}

Create a personalized new tab page with a speed dial grid:

```ts
// newtab.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";
import { sendMessage } from "@theluckystrike/webext-messaging";

const storage = createStorage(defineSchema({
  gridLayout: { type: "object", default: { columns: 4, rows: 3 } },
  tileSize: { type: "number", default: 120 },
  showTitles: { type: "boolean", default: true },
}));

interface SpeedDialSite {
  url: string;
  title: string;
  favicon: string;
}

async function renderSpeedDial(): Promise<void> {
  const sites = await sendMessage<{ type: "GET_TOP_SITES"; limit: number }, SpeedDialSite[]>({
    type: "GET_TOP_SITES",
    limit: 12,
  });
  
  const layout = await storage.get("gridLayout");
  const showTitles = await storage.get("showTitles");
  
  const container = document.getElementById("speed-dial")!;
  container.style.gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
  
  container.innerHTML = sites.map(site => `
    <a href="${site.url}" class="dial-tile" title="${site.title}">
      <img src="${site.favicon}" alt="" class="dial-favicon" 
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22><text y=%2232%22 font-size=%2232%22>🔗</text></svg>'">
      ${showTitles ? `<span class="dial-title">${site.title}</span>` : ""}
    </a>
  `).join("");
}

document.addEventListener("DOMContentLoaded", renderSpeedDial);
```

### CSS Styles {#css-styles}

```css
#speed-dial {
  display: grid;
  gap: 16px;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.dial-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.dial-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.dial-favicon { width: 32px; height: 32px; border-radius: 4px; }

.dial-title {
  margin-top: 8px;
  font-size: 12px;
  color: #333;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

## Pattern 3: Filtering and Deduplicating Results {#pattern-3-filtering-and-deduplicating-results}

Filter out unwanted domains and deduplicate similar URLs:

```ts
// background.ts
interface FilterOptions {
  excludeDomains?: string[];
  excludePatterns?: RegExp[];
  deduplicateBy?: "domain" | "exact";
  minDomainLength?: number;
}

function deduplicateByDomain(sites: chrome.topSites.TopSite[]): chrome.topSites.TopSite[] {
  const seen = new Set<string>();
  return sites.filter(site => {
    try {
      const domain = new URL(site.url).hostname.replace(/^www\./, "");
      if (seen.has(domain)) return false;
      seen.add(domain);
      return true;
    } catch { return false; }
  });
}

function filterTopSites(sites: chrome.topSites.TopSite[], options: FilterOptions): chrome.topSites.TopSite[] {
  const { excludeDomains = [], excludePatterns = [], deduplicateBy = "domain", minDomainLength = 0 } = options;
  
  let filtered = deduplicateBy === "domain" ? deduplicateByDomain(sites) : sites;
  
  const excludeSet = new Set(excludeDomains.map(d => d.toLowerCase()));
  filtered = filtered.filter(site => {
    try {
      const domain = new URL(site.url).hostname.toLowerCase();
      return !excludeSet.has(domain);
    } catch { return false; }
  });
  
  filtered = filtered.filter(site => !excludePatterns.some(p => p.test(site.url)));
  
  if (minDomainLength > 0) {
    filtered = filtered.filter(site => {
      try { return new URL(site.url).hostname.length >= minDomainLength; }
      catch { return false; }
    });
  }
  
  return filtered;
}

async function getFilteredTopSites(): Promise<chrome.topSites.TopSite[]> {
  const sites = await chrome.topSites.get();
  return filterTopSites(sites, {
    excludeDomains: ["google.com", "facebook.com", "twitter.com"],
    excludePatterns: [/^chrome:\/\//, /^chrome-extension:\/\//],
    deduplicateBy: "domain",
    minDomainLength: 4,
  });
}
```

---

## Pattern 4: Combining Top Sites with Bookmarks {#pattern-4-combining-top-sites-with-bookmarks}

Create a unified launcher that combines top sites with custom bookmarks:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storage = createStorage(defineSchema({
  pinnedSites: { type: "array", default: [] },
  bookmarkFolders: { type: "array", default: [] },
}));

interface LauncherItem {
  id: string;
  type: "topsite" | "bookmark" | "pinned";
  url: string;
  title: string;
  favicon: string;
}

async function getUnifiedLauncherResults(query: string): Promise<LauncherItem[]> {
  const results: LauncherItem[] = [];
  const pinned = await storage.get("pinnedSites") as Array<{ url: string; title: string }>;
  const pinnedUrls = new Set(pinned.map(s => s.url));
  
  // Add pinned sites first
  for (const site of pinned) {
    if (!query || site.title.toLowerCase().includes(query.toLowerCase())) {
      results.push({
        id: `pinned-${site.url}`,
        type: "pinned",
        url: site.url,
        title: site.title,
        favicon: getFaviconUrl(site.url),
      });
    }
  }
  
  // Add top sites
  const topSites = await chrome.topSites.get();
  for (const site of topSites.slice(0, 15)) {
    if (pinnedUrls.has(site.url)) continue;
    if (query && !site.title.toLowerCase().includes(query.toLowerCase())) continue;
    results.push({
      id: `topsite-${site.url}`,
      type: "topsite",
      url: site.url,
      title: site.title,
      favicon: getFaviconUrl(site.url),
    });
  }
  
  // Add bookmarks from configured folders
  const folders = await storage.get("bookmarkFolders") as string[];
  for (const folderId of folders) {
    const bookmarks = await chrome.bookmarks.getChildren(folderId);
    for (const bm of bookmarks) {
      if (!bm.url) continue;
      if (query && !bm.title.toLowerCase().includes(query.toLowerCase())) continue;
      results.push({
        id: `bookmark-${bm.id}`,
        type: "bookmark",
        url: bm.url,
        title: bm.title,
        favicon: getFaviconUrl(bm.url),
      });
    }
  }
  
  return results.slice(0, 20);
}

function getFaviconUrl(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
  } catch { return ""; }
}
```

---

## Pattern 5: Caching Top Sites Data {#pattern-5-caching-top-sites-data}

Implement intelligent caching to reduce API calls:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storage = createStorage(defineSchema({
  topSitesCache: { type: "array", default: [] },
  cacheMeta: { type: "object", default: { timestamp: 0, count: 0 } },
}));

interface CacheConfig {
  maxAge: number;
  maxEntries: number;
  staleWhileRevalidate: boolean;
}

const defaultConfig: CacheConfig = {
  maxAge: 5 * 60 * 1000,
  maxEntries: 50,
  staleWhileRevalidate: true,
};

class TopSitesCache {
  private config: CacheConfig;
  private refreshPromise: Promise<chrome.topSites.TopSite[]> | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async get(forceRefresh = false): Promise<chrome.topSites.TopSite[]> {
    const cache = await storage.get("topSitesCache");
    const meta = await storage.get("cacheMeta") as { timestamp: number; count: number };
    const now = Date.now();

    if (!forceRefresh && cache.length > 0 && now - meta.timestamp < this.config.maxAge) {
      return cache;
    }

    if (this.config.staleWhileRevalidate && cache.length > 0) {
      this.refreshInBackground();
      return cache;
    }

    return this.fetchAndCache();
  }

  private async fetchAndCache(): Promise<chrome.topSites.TopSite[]> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.fetchSites();
    const sites = await this.refreshPromise;
    this.refreshPromise = null;
    return sites;
  }

  private async fetchSites(): Promise<chrome.topSites.TopSite[]> {
    const sites = await chrome.topSites.get();
    const trimmed = sites.slice(0, this.config.maxEntries);
    await storage.set("topSitesCache", trimmed);
    await storage.set("cacheMeta", { timestamp: Date.now(), count: trimmed.length });
    return trimmed;
  }

  private refreshInBackground(): void {
    this.fetchSites().catch(console.error);
  }

  async invalidate(): Promise<void> {
    await storage.set("topSitesCache", []);
    await storage.set("cacheMeta", { timestamp: 0, count: 0 });
  }
}

const topSitesCache = new TopSitesCache({ maxAge: 10 * 60 * 1000, maxEntries: 30 });
```

---

## Pattern 6: Top Sites Widget with Favicons and Visit Frequency {#pattern-6-top-sites-widget-with-favicons-and-visit-frequency}

Track and display visit frequency alongside top sites:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storage = createStorage(defineSchema({
  siteStats: { type: "object", default: {} },
}));

interface SiteStats {
  visitCount: number;
  lastVisit: number;
  avgInterval: number;
}

async function trackVisit(url: string): Promise<void> {
  const stats = await storage.get("siteStats") as Record<string, SiteStats>;
  const domain = new URL(url).hostname;
  const timestamp = Date.now();
  
  if (!stats[domain]) {
    stats[domain] = { visitCount: 0, lastVisit: timestamp, avgInterval: 0 };
  }
  
  const siteStat = stats[domain];
  const timeSinceLastVisit = timestamp - siteStat.lastVisit;
  
  siteStat.visitCount++;
  siteStat.lastVisit = timestamp;
  siteStat.avgInterval = siteStat.avgInterval 
    ? (siteStat.avgInterval * 0.7 + timeSinceLastVisit * 0.3)
    : timeSinceLastVisit;
  
  await storage.set("siteStats", stats);
}

chrome.history.onVisited.addListener((result) => {
  if (result.url) trackVisit(result.url);
});

async function getEnhancedTopSites(): Promise<Array<chrome.topSites.TopSite & {
  visitCount: number;
  avgInterval: number;
  recencyScore: number;
}>> {
  const sites = await chrome.topSites.get();
  const stats = await storage.get("siteStats") as Record<string, SiteStats>;
  
  return sites.map(site => {
    const domain = new URL(site.url).hostname.replace(/^www\./, "");
    const siteStat = stats[domain] || { visitCount: 0, avgInterval: 0, lastVisit: 0 };
    const hoursSinceLastVisit = (Date.now() - siteStat.lastVisit) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 100 - hoursSinceLastVisit * 2);
    
    return {
      ...site,
      visitCount: siteStat.visitCount,
      avgInterval: siteStat.avgInterval,
      recencyScore,
    };
  });
}
```

---

## Pattern 7: User-Customizable Speed Dial {#pattern-7-user-customizable-speed-dial}

Allow users to pin, reorder, and customize their speed dial:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storage = createStorage(defineSchema({
  pinnedSites: { type: "array", default: [] },
  hiddenSites: { type: "array", default: [] },
  customOrder: { type: "array", default: [] },
  displaySettings: { 
    type: "object", 
    default: { showFavicon: true, showTitle: true, titleLength: 20, tileSize: "medium" }
  },
}));

interface PinnedSite {
  url: string;
  title: string;
  position: number;
  addedAt: number;
}

async function getCustomizedSpeedDial(): Promise<{
  pinned: PinnedSite[];
  autoPopulated: chrome.topSites.TopSite[];
}> {
  const pinned = await storage.get("pinnedSites") as PinnedSite[];
  const hidden = await storage.get("hiddenSites") as string[];
  const hiddenSet = new Set(hidden);
  const topSites = await chrome.topSites.get();
  const autoPopulated = topSites.filter(site => !hiddenSet.has(site.url));
  
  return { pinned, autoPopulated };
}

async function pinSite(url: string, title: string): Promise<void> {
  const pinned = await storage.get("pinnedSites") as PinnedSite[];
  if (!pinned.find(s => s.url === url)) {
    pinned.push({ url, title, position: pinned.length, addedAt: Date.now() });
    await storage.set("pinnedSites", pinned);
  }
}

async function unpinSite(url: string): Promise<void> {
  const pinned = (await storage.get("pinnedSites") as PinnedSite[]).filter(s => s.url !== url);
  await storage.set("pinnedSites", pinned);
}

async function hideSite(url: string): Promise<void> {
  const hidden = await storage.get("hiddenSites") as string[];
  if (!hidden.includes(url)) {
    hidden.push(url);
    await storage.set("hiddenSites", hidden);
  }
}

async function reorderPinned(fromIndex: number, toIndex: number): Promise<void> {
  let pinned = await storage.get("pinnedSites") as PinnedSite[];
  const [moved] = pinned.splice(fromIndex, 1);
  pinned.splice(toIndex, 0, moved);
  pinned = pinned.map((site, idx) => ({ ...site, position: idx }));
  await storage.set("pinnedSites", pinned);
}
```

---

## Pattern 8: Privacy-Aware Top Sites Display {#pattern-8-privacy-aware-top-sites-display}

Handle incognito mode and privacy settings gracefully:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storage = createStorage(defineSchema({
  privacySettings: { 
    type: "object", 
    default: {
      excludeIncognito: true,
      excludeAppLauncher: true,
      excludeSearchResults: true,
      minVisitThreshold: 3,
      requireHttps: true,
    }
  },
  userWhitelist: { type: "array", default: [] },
}));

interface PrivacySettings {
  excludeIncognito: boolean;
  excludeAppLauncher: boolean;
  excludeSearchResults: boolean;
  minVisitThreshold: number;
  requireHttps: boolean;
}

async function getPrivacyFilteredTopSites(includeIncognito = false): Promise<chrome.topSites.TopSite[]> {
  const settings = await storage.get("privacySettings") as PrivacySettings;
  const whitelist = await storage.get("userWhitelist") as string[];
  let sites = await chrome.topSites.get();
  
  // Check incognito access
  if (settings.excludeIncognito && !includeIncognito) {
    const state = await chrome.extension.isAllowedIncognitoAccess();
    if (!state) console.log("Running in incognito - limited access");
  }
  
  sites = sites.filter(site => {
    const url = site.url;
    
    // Check whitelist first
    if (whitelist.some(w => url.includes(w))) return true;
    
    // Exclude app launcher
    if (settings.excludeAppLauncher && url.startsWith("chrome://apps/")) return false;
    
    // Exclude search results
    if (settings.excludeSearchResults) {
      const searchPatterns = [/[?&]q=/, /[?&]search=/, /\/search\?/];
      if (searchPatterns.some(p => p.test(url))) return false;
    }
    
    // Require HTTPS
    if (settings.requireHttps && !url.startsWith("https://")) return false;
    
    return true;
  });
  
  return sites;
}

async function getPrivacyStatus(): Promise<{
  incognitoAllowed: boolean;
  privacyLevel: "high" | "medium" | "low";
}> {
  const incognitoAllowed = await chrome.extension.isAllowedIncognitoAccess();
  const settings = await storage.get("privacySettings") as PrivacySettings;
  
  const score = [
    settings.excludeIncognito ? 1 : 0,
    settings.excludeSearchResults ? 1 : 0,
    settings.requireHttps ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  
  const privacyLevel = score >= 2 ? "high" : score === 0 ? "low" : "medium";
  return { incognitoAllowed, privacyLevel };
}
```

---

## Summary Table {#summary-table}

| Pattern | Use Case | Key APIs | Complexity |
|---------|----------|----------|------------|
| 1. Basic Retrieval | Simple top sites list | chrome.topSites.get() | Basic |
| 2. Speed Dial | Custom new tab page | chrome.topSites.get() + UI | Basic |
| 3. Filtering | Remove unwanted sites | URL parsing, regex | Intermediate |
| 4. Unified Launcher | Combine with bookmarks | chrome.bookmarks + topSites | Intermediate |
| 5. Caching | Reduce API calls | chrome.storage | Intermediate |
| 6. Visit Tracking | Show visit frequency | chrome.history.onVisited | Advanced |
| 7. Customization | User pinning/reordering | chrome.storage + UI | Advanced |
| 8. Privacy | Incognito handling | chrome.extension.isAllowedIncognitoAccess | Advanced |

---

## Key Takeaways {#key-takeaways}

1. **Always cache top sites** - The API fetches fresh data each call; cache to reduce overhead
2. **Use domain deduplication** - Avoid showing duplicate sites from the same domain
3. **Combine with bookmarks** - Create a unified launcher for comprehensive search
4. **Implement privacy filtering** - Handle incognito gracefully and exclude sensitive URLs
5. **Track visit frequency** - Enhance UI with visit counts and recency scores
6. **Allow user customization** - Enable pinning, hiding, and reordering
7. **Handle favicons** - Use Google Favicon service as a reliable fallback
8. **Check permissions** - The topSites permission is required; manifest configuration matters
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
