# Top Sites API Patterns

## Overview

The Chrome Top Sites API (`chrome.topSites`) provides access to the user's most visited websites. This guide covers practical patterns for implementing top sites functionality in Chrome Extensions, from basic retrieval to advanced speed dial implementations.

---

## Pattern 1: Basic Top Sites Retrieval

The simplest pattern involves fetching and displaying the user's top sites:

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

### Manifest Configuration

```json
{
  "permissions": ["topSites"]
}
```

---

## Pattern 2: Speed Dial New Tab Page

Build a custom new tab page with a speed dial grid:

```ts
// newtab.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";
import { sendMessage } from "@theluckystrike/webext-messaging";

const storage = createStorage(defineSchema({
  gridLayout: { 
    type: "object", 
    default: { columns: 4, rows: 3 } 
  },
  tileSize: { type: "number", default: 120 },
  showTitles: { type: "boolean", default: true },
}));

interface SpeedDialSite {
  url: string;
  title: string;
  favicon: string;
  faviconUrl?: string;
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

### CSS Styles

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

.dial-favicon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
}

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

## Pattern 3: Filtering and Deduplicating Results

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
    } catch {
      return false;
    }
  });
}

function filterTopSites(
  sites: chrome.topSites.TopSite[],
  options: FilterOptions
): chrome.topSites.TopSite[] {
  const {
    excludeDomains = [],
    excludePatterns = [],
    deduplicateBy = "domain",
    minDomainLength = 0,
  } = options;
  
  let filtered = sites;
  
  // Apply deduplication
  if (deduplicateBy === "domain") {
    filtered = deduplicateByDomain(filtered);
  }
  
  // Exclude specific domains
  const excludeSet = new Set(excludeDomains.map(d => d.toLowerCase()));
  filtered = filtered.filter(site => {
    try {
      const domain = new URL(site.url).hostname.toLowerCase();
      return !excludeSet.has(domain);
    } catch {
      return false;
    }
  });
  
  // Apply regex patterns
  filtered = filtered.filter(site => {
    return !excludePatterns.some(pattern => pattern.test(site.url));
  });
  
  // Filter by minimum domain length
  if (minDomainLength > 0) {
    filtered = filtered.filter(site => {
      try {
        return new URL(site.url).hostname.length >= minDomainLength;
      } catch {
        return false;
      }
    });
  }
  
  return filtered;
}

// Usage example
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

## Pattern 4: Unified Launcher with Bookmarks

Combine top sites with custom bookmarks for a comprehensive launcher:

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
  source?: string;
}

async function getUnifiedLauncherResults(query: string): Promise<LauncherItem[]> {
  const results: LauncherItem[] = [];
  
  // Get pinned sites first
  const pinned = await storage.get("pinnedSites");
  const pinnedUrls = new Set(pinned.map((s: { url: string }) => s.url));
  
  // Add pinned sites
  for (const site of pinned as Array<{ url: string; title: string }>) {
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
  
  // Get top sites
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
  
  // Get bookmarks
  const folders = await storage.get("bookmarkFolders");
  for (const folderId of folders as string[]) {
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
        source: folderId,
      });
    }
  }
  
  return results.slice(0, 20);
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}
```

---

## Pattern 5: Caching Strategy with Storage

Implement intelligent caching to reduce API calls:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storage = createStorage(defineSchema({
  topSitesCache: { type: "array", default: [] },
  cacheMeta: { 
    type: "object", 
    default: { timestamp: 0, etag: "", count: 0 } 
  },
}));

interface CacheConfig {
  maxAge: number;        // Cache lifetime in milliseconds
  maxEntries: number;     // Maximum number of sites to cache
  staleWhileRevalidate: boolean;
}

const defaultConfig: CacheConfig = {
  maxAge: 5 * 60 * 1000, // 5 minutes
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
    const meta = await storage.get("cacheMeta");
    const now = Date.now();

    // Return cache if valid and not forcing refresh
    if (!forceRefresh && cache.length > 0 && now - meta.timestamp < this.config.maxAge) {
      return cache;
    }

    // If stale-while-revalidate is enabled and we have stale cache, return it
    if (this.config.staleWhileRevalidate && cache.length > 0) {
      this.refreshInBackground();
      return cache;
    }

    // Otherwise, fetch fresh data
    return this.fetchAndCache();
  }

  private async fetchAndCache(): Promise<chrome.topSites.TopSite[]> {
    // Prevent multiple simultaneous fetches
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.fetchSites();
    const sites = await this.refreshPromise;
    this.refreshPromise = null;

    return sites;
  }

  private async fetchSites(): Promise<chrome.topSites.TopSite[]> {
    const sites = await chrome.topSites.get();
    const trimmed = sites.slice(0, this.config.maxEntries);

    await storage.set("topSitesCache", trimmed);
    await storage.set("cacheMeta", {
      timestamp: Date.now(),
      count: trimmed.length,
    });

    return trimmed;
  }

  private refreshInBackground(): void {
    this.fetchSites().catch(console.error);
  }

  async invalidate(): Promise<void> {
    await storage.set("topSitesCache", []);
    await storage.set("cacheMeta", { timestamp: 0, etag: "", count: 0 });
  }
}

const topSitesCache = new TopSitesCache({
  maxAge: 10 * 60 * 1000,
  maxEntries: 30,
});
```

---

## Pattern 6: Visit Frequency and Recency Tracking

Track and display visit frequency alongside top sites:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storage = createStorage(defineSchema({
  visitHistory: { type: "object", default: {} },
  siteStats: { type: "object", default: {} },
}));

interface VisitEntry {
  url: string;
  timestamp: number;
  transitionType?: string;
}

interface SiteStats {
  url: string;
  visitCount: number;
  lastVisit: number;
  avgInterval: number;
  visitTimestamps: number[];
}

async function trackVisit(url: string, transitionType?: string): Promise<void> {
  const history = await storage.get("visitHistory") as Record<string, VisitEntry[]>;
  const stats = await storage.get("siteStats") as Record<string, SiteStats>;
  
  const domain = new URL(url).hostname;
  const timestamp = Date.now();
  
  // Update visit history
  if (!history[domain]) history[domain] = [];
  history[domain].push({ url, timestamp, transitionType });
  
  // Keep only last 100 visits per domain
  history[domain] = history[domain].slice(-100);
  
  // Update site stats
  if (!stats[domain]) {
    stats[domain] = {
      url: domain,
      visitCount: 0,
      lastVisit: timestamp,
      avgInterval: 0,
      visitTimestamps: [],
    };
  }
  
  const siteStat = stats[domain];
  siteStat.visitCount++;
  siteStat.lastVisit = timestamp;
  siteStat.visitTimestamps.push(timestamp);
  
  // Keep only last 50 timestamps for interval calculation
  siteStat.visitTimestamps = siteStat.visitTimestamps.slice(-50);
  
  // Calculate average visit interval
  if (siteStat.visitTimestamps.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < siteStat.visitTimestamps.length; i++) {
      intervals.push(siteStat.visitTimestamps[i] - siteStat.visitTimestamps[i - 1]);
    }
    siteStat.avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }
  
  await storage.set("visitHistory", history);
  await storage.set("siteStats", stats);
}

// Listen for history updates
chrome.history.onVisited.addListener((result) => {
  if (result.url) {
    trackVisit(result.url, result.transitionType);
  }
});

async function getEnhancedTopSites(): Promise<Array<chrome.topSites.TopSite & {
  visitCount: number;
  avgInterval: number;
  lastVisit: number;
  recencyScore: number;
}>> {
  const sites = await chrome.topSites.get();
  const stats = await storage.get("siteStats") as Record<string, SiteStats>;
  
  return sites.map(site => {
    const domain = new URL(site.url).hostname.replace(/^www\./, "");
    const siteStat = stats[domain] || { visitCount: 0, avgInterval: 0, lastVisit: 0 };
    const now = Date.now();
    
    // Calculate recency score (0-100)
    const hoursSinceLastVisit = (now - siteStat.lastVisit) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 100 - hoursSinceLastVisit * 2);
    
    return {
      ...site,
      visitCount: siteStat.visitCount,
      avgInterval: siteStat.avgInterval,
      lastVisit: siteStat.lastVisit,
      recencyScore,
    };
  });
}
```

---

## Pattern 7: Customizable Speed Dial

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
    default: { 
      showFavicon: true,
      showTitle: true,
      titleLength: 20,
      tileSize: "medium",
    } 
  },
}));

interface PinnedSite {
  url: string;
  title: string;
  position: number;
  addedAt: number;
}

interface DisplaySettings {
  showFavicon: boolean;
  showTitle: boolean;
  titleLength: number;
  tileSize: "small" | "medium" | "large";
}

async function getCustomizedSpeedDial(): Promise<{
  pinned: PinnedSite[];
  autoPopulated: Array<chrome.topSites.TopSite & { isHidden: boolean }>;
}> {
  const pinned = await storage.get("pinnedSites") as PinnedSite[];
  const hidden = await storage.get("hiddenSites") as string[];
  const order = await storage.get("customOrder") as string[];
  
  const hiddenSet = new Set(hidden);
  const topSites = await chrome.topSites.get();
  
  // Filter out hidden sites
  const autoPopulated = topSites
    .filter(site => !hiddenSet.has(site.url))
    .map(site => ({ ...site, isHidden: false }));
  
  // Apply custom order if exists
  if (order.length > 0) {
    autoPopulated.sort((a, b) => {
      const aIdx = order.indexOf(a.url);
      const bIdx = order.indexOf(b.url);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }
  
  return { pinned, autoPopulated };
}

async function pinSite(url: string, title: string): Promise<void> {
  const pinned = await storage.get("pinnedSites") as PinnedSite[];
  const exists = pinned.find(s => s.url === url);
  
  if (!exists) {
    pinned.push({
      url,
      title,
      position: pinned.length,
      addedAt: Date.now(),
    });
    await storage.set("pinnedSites", pinned);
  }
}

async function unpinSite(url: string): Promise<void> {
  let pinned = await storage.get("pinnedSites") as PinnedSite[];
  pinned = pinned.filter(s => s.url !== url);
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
  
  // Update positions
  pinned = pinned.map((site, idx) => ({ ...site, position: idx }));
  await storage.set("pinnedSites", pinned);
}
```

---

## Pattern 8: Privacy-Aware Display

Handle incognito mode and privacy settings:

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

async function getPrivacyFilteredTopSites(
  includeIncognito = false
): Promise<chrome.topSites.TopSite[]> {
  const settings = await storage.get("privacySettings") as PrivacySettings;
  const whitelist = await storage.get("userWhitelist") as string[];
  
  let sites = await chrome.topSites.get();
  
  // Check incognito mode
  if (settings.excludeIncognito && !includeIncognito) {
    // Check if we're in an incognito context
    const state = await chrome.extension.isAllowedIncognitoAccess();
    if (!state) {
      // Can't access topSites in incognito, but can still filter regular results
    }
  }
  
  // Filter by privacy settings
  sites = sites.filter(site => {
    const url = site.url;
    
    // Check whitelist first
    if (whitelist.some(w => url.includes(w))) return true;
    
    // Exclude app launcher
    if (settings.excludeAppLauncher && url.startsWith("chrome://apps/")) {
      return false;
    }
    
    // Exclude search results (detected by common search engine patterns)
    if (settings.excludeSearchResults) {
      const searchPatterns = [
        /[?&]q=/,           // Google, Bing, etc.
        /[?&]search=/,     // Yahoo
        /\/search\?/,      // DuckDuckGo
        /\/search\?q=/,    // Additional patterns
      ];
      if (searchPatterns.some(p => p.test(url))) {
        return false;
      }
    }
    
    // Require HTTPS
    if (settings.requireHttps && !url.startsWith("https://")) {
      return false;
    }
    
    return true;
  });
  
  return sites;
}

// Privacy indicator for UI
async function getPrivacyStatus(): Promise<{
  incognitoAllowed: boolean;
  canAccessHistory: boolean;
  privacyLevel: "high" | "medium" | "low";
}> {
  const incognitoAllowed = await chrome.extension.isAllowedIncognitoAccess();
  
  // Check if we can access topSites (requires normal permissions)
  let canAccessHistory = true;
  try {
    await chrome.topSites.get();
  } catch {
    canAccessHistory = false;
  }
  
  let privacyLevel: "high" | "medium" | "low" = "medium";
  const settings = await storage.get("privacySettings") as PrivacySettings;
  
  const score = [
    settings.excludeIncognito ? 1 : 0,
    settings.excludeSearchResults ? 1 : 0,
    settings.requireHttps ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  
  if (score >= 2) privacyLevel = "high";
  else if (score === 0) privacyLevel = "low";
  
  return { incognitoAllowed, canAccessHistory, privacyLevel };
}
```

---

## Summary Table

| Pattern | Use Case | Key APIs | Complexity |
|---------|----------|----------|------------|
| Basic Retrieval | Simple top sites list | chrome.topSites.get() | Basic |
| Speed Dial | Custom new tab page | chrome.topSites.get() + UI | Basic |
| Filtering | Remove unwanted sites | URL parsing, regex | Intermediate |
| Unified Launcher | Combine with bookmarks | chrome.bookmarks + topSites | Intermediate |
| Caching | Reduce API calls | chrome.storage | Intermediate |
| Visit Tracking | Show visit frequency | chrome.history.onVisited | Advanced |
| Customization | User pinning/reordering | chrome.storage + UI | Advanced |
| Privacy | Incognito handling | chrome.extension.isAllowedIncognitoAccess | Advanced |

---

## Key Takeaways

1. Always cache top sites data to avoid excessive API calls
2. Use domain-level deduplication to avoid showing duplicate sites
3. Combine with bookmarks for a more comprehensive launcher
4. Implement privacy-aware filtering for sensitive browsing
5. Track visit frequency to enhance the user experience
6. Allow users to customize and pin their preferred sites
7. Handle incognito mode gracefully - top sites may not be available
8. Use Google Favicon service as a fallback for favicon display

