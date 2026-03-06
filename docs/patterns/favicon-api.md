# Favicon API and Patterns

## Overview

Favicons are small icons that represent websites in browser tabs, bookmarks, and history. Chrome Extensions have rich APIs for accessing, manipulating, and displaying favicons in various contexts. This guide covers practical patterns for working with favicons in Chrome Extensions, from basic retrieval to advanced manipulation and extraction.

Key facts:
- **Favicon sizes**: Standard sizes are 16x16, 32x32, and 64x64 pixels
- **Storage locations**: Favicons are cached in Chrome's internal database (`favicons` table in `Web Data`)
- **API access**: Available through `chrome.tabs.Tab.favIconUrl` property and the `chrome://favicon/` URL scheme
- **Fallback chain**: Tab favicon → Google S2 service → Default extension icon

---

## Pattern 1: Getting Favicons via Chrome API

The most straightforward way to get a favicon is through the `chrome.tabs.Tab.favIconUrl` property. However, this property may be empty for certain page types or during page load. This pattern implements a robust fallback chain.

### Basic Favicon Retrieval

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  defaultFavicon: { type: "string", default: "" },
});

const storage = createStorage(schema);

/**
 * Retrieves the favicon URL for a given tab with fallback chain
 * Priority: Tab favIconUrl → Google S2 service → Default icon
 */
async function getFaviconUrl(tabId: number): Promise<string> {
  try {
    // First attempt: Get from tab directly
    const tab = await chrome.tabs.get(tabId);
    if (tab.favIconUrl && tab.favIconUrl.startsWith("data:")) {
      return tab.favIconUrl;
    }
    if (tab.favIconUrl && isValidFaviconUrl(tab.favIconUrl)) {
      return tab.favIconUrl;
    }
  } catch (error) {
    console.error("Failed to get tab:", error);
  }

  // Fallback: Use Google S2 favicon service
  if (tab?.url) {
    const url = new URL(tab.url);
    return getGoogleS2FaviconUrl(url.hostname);
  }

  // Final fallback: Default extension icon
  return await storage.get("defaultFavicon") || getDefaultIcon();
}

function isValidFaviconUrl(url: string): boolean {
  return url.startsWith("http://") || 
         url.startsWith("https://") || 
         url.startsWith("chrome-extension://") ||
         url.startsWith("chrome://");
}

/**
 * Google S2 favicon service - reliable fallback for external sites
 * Format: https://www.google.com/s2/favicons?domain={hostname}&sz={size}
 */
function getGoogleS2FaviconUrl(hostname: string, size: number = 64): string {
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
}

function getDefaultIcon(): string {
  return "icons/default-favicon.svg";
}

// Usage in popup or content script messaging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_FAVICON") {
    getFaviconUrl(message.tabId).then(sendResponse);
    return true; // Keep channel open for async response
  }
});
```

### Handling Missing or Broken Favicons

```ts
// utils/favicon-utils.ts

export interface FaviconResult {
  url: string;
  isDataUrl: boolean;
  isFallback: boolean;
  size?: number;
}

/**
 * Creates an image with error handling for broken favicons
 */
async function loadFaviconWithFallback(
  faviconUrl: string,
  fallbackUrls: string[]
): Promise<string> {
  for (const url of [faviconUrl, ...fallbackUrls]) {
    try {
      const isValid = await validateFaviconUrl(url);
      if (isValid) {
        return url;
      }
    } catch {
      continue;
    }
  }
  return getDefaultIcon();
}

/**
 * Validates that a favicon URL loads successfully
 */
async function validateFaviconUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Checks if a data URL represents a valid image
 */
function isValidDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/") && dataUrl.length > 100;
}
```

---

## Pattern 2: Favicon Cache Manager

Repeatedly fetching favicons from external services is slow and wastes bandwidth. This pattern implements an IndexedDB-based cache with LRU eviction to store favicons efficiently.

### Cache Database Setup

```ts
// background/favicon-cache.ts
import { openDB, DBSchema, IDBPDatabase } from "idb";

interface FaviconCacheDB extends DBSchema {
  favicons: {
    key: string;
    value: {
      url: string;           // Original URL (hostname)
      dataUrl: string;       // Cached favicon as data URL
      size: number;          // Image size in bytes
      timestamp: number;    // Cache timestamp
      accessCount: number;   // For LRU tracking
    };
    indexes: { "by-timestamp": number; "by-access": number };
  };
}

const DB_NAME = "favicon-cache";
const DB_VERSION = 1;
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit
const MAX_CACHE_ENTRIES = 500;

let dbPromise: Promise<IDBPDatabase<FaviconCacheDB>> | null = null;

async function getDb(): Promise<IDBPDatabase<FaviconCacheDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FaviconCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("favicons", { keyPath: "url" });
        store.createIndex("by-timestamp", "timestamp");
        store.createIndex("by-access", "accessCount");
      },
    });
  }
  return dbPromise;
}
```

### Cache Operations with LRU Eviction

```ts
// background/favicon-cache.ts (continued)

export class FaviconCache {
  private db: IDBPDatabase<FaviconCacheDB> | null = null;

  async init(): Promise<void> {
    this.db = await getDb();
  }

  /**
   * Gets cached favicon or fetches and caches it
   */
  async getOrFetch(hostname: string): Promise<string | null> {
    if (!this.db) await this.init();

    const cached = await this.db!.get("favicons", hostname);
    if (cached) {
      // Update access pattern for LRU
      await this.db!.put("favicons", {
        ...cached,
        accessCount: cached.accessCount + 1,
        timestamp: Date.now(),
      });
      return cached.dataUrl;
    }

    // Fetch new favicon
    const dataUrl = await this.fetchFaviconAsDataUrl(hostname);
    if (dataUrl) {
      await this.set(hostname, dataUrl);
    }

    return dataUrl;
  }

  /**
   * Fetches favicon and converts to data URL
   */
  private async fetchFaviconAsDataUrl(hostname: string): Promise<string | null> {
    const sizes = [64, 32, 16];
    
    for (const size of sizes) {
      const url = `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Stores favicon in cache with LRU eviction
   */
  private async set(hostname: string, dataUrl: string): Promise<void> {
    if (!this.db) await this.init();

    const size = new Blob([dataUrl]).size;
    
    await this.db!.put("favicons", {
      url: hostname,
      dataUrl,
      size,
      timestamp: Date.now(),
      accessCount: 1,
    });

    // Evict if cache is too large
    await this.evictIfNeeded();
  }

  /**
   * LRU eviction when cache exceeds limits
   */
  private async evictIfNeeded(): Promise<void> {
    if (!this.db) return;

    // Check entry count limit
    const count = await this.db!.count("favicons");
    if (count > MAX_CACHE_ENTRIES) {
      await this.evictLeastRecentlyUsed(count - MAX_CACHE_ENTRIES + 100);
      return;
    }

    // Check size limit
    const entries = await this.db!.getAll("favicons");
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    
    if (totalSize > MAX_CACHE_SIZE) {
      await this.evictLeastRecentlyUsed(Math.ceil(entries.length * 0.2));
    }
  }

  /**
   * Evicts least recently used entries
   */
  private async evictLeastRecentlyUsed(count: number): Promise<void> {
    if (!this.db) return;

    // Get entries sorted by access count (ascending)
    const entries = await this.db!.getAllFromIndex("favicons", "by-access");
    const toDelete = entries.slice(0, count).map((e) => e.url);

    const tx = this.db!.transaction("favicons", "readwrite");
    for (const url of toDelete) {
      await tx.store.delete(url);
    }
    await tx.done;
  }

  /**
   * Clears entire cache
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear("favicons");
  }
}

export const faviconCache = new FaviconCache();
```

---

## Pattern 3: Favicon in Extension UI

Displaying favicons in popup lists (bookmarks, history, tabs) requires consistent sizing, fallback rendering, and proper high-DPI handling.

### Favicon Display Component

```ts
// components/FaviconDisplay.tsx

export interface FaviconDisplayProps {
  hostname: string;
  size?: 16 | 32 | 64;
  alt?: string;
  className?: string;
}

export function FaviconDisplay({
  hostname,
  size = 32,
  alt,
  className = "",
}: FaviconDisplayProps): string {
  // Generate SVG with fallback to first letter
  const letter = hostname.charAt(0).toUpperCase();
  const colors = generateColorFromHostname(hostname);
  
  return `
    <img 
      src="https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}"
      alt="${alt || hostname}"
      class="favicon favicon-${size} ${className}"
      onerror="this.onerror=null; this.src='data:image/svg+xml,${encodeURIComponent(
        generateLetterFavicon(letter, colors, size)
      )}'"
      loading="lazy"
    />
  `;
}

/**
 * Generates a consistent color from hostname
 */
function generateColorFromHostname(hostname: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < hostname.length; i++) {
    hash = hostname.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return {
    bg: `hsl(${hue}, 60%, 85%)`,
    fg: `hsl(${hue}, 70%, 35%)`,
  };
}

/**
 * Generates SVG fallback favicon with letter
 */
function generateLetterFavicon(
  letter: string,
  colors: { bg: string; fg: string },
  size: number
): string {
  const fontSize = size * 0.6;
  const fontOffset = size * 0.35;
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${colors.bg}" rx="${size * 0.15}"/>
      <text 
        x="${fontOffset}" 
        y="${fontOffset}" 
        font-family="system-ui, sans-serif" 
        font-size="${fontSize}" 
        font-weight="600" 
        fill="${colors.fg}"
        text-anchor="middle"
      >${letter}</text>
    </svg>
  `;
}
```

### High-DPI Favicon Handling

```ts
// utils/high-dpi-favicons.ts

export interface FaviconSource {
  url: string;
  pixelSize: number;
}

/**
 * Selects optimal favicon for current display density
 */
function selectOptimalFavicon(
  sources: FaviconSource[],
  preferredSize: number = 32
): FaviconSource {
  const dpr = window.devicePixelRatio || 1;
  const targetSize = preferredSize * dpr;

  // Find closest size >= target
  const sorted = [...sources].sort((a, b) => a.pixelSize - b.pixelSize);
  
  return (
    sorted.find((s) => s.pixelSize >= targetSize) ||
    sorted[sorted.length - 1] ||
    { url: "", pixelSize: 16 }
  );
}

/**
 * Preloads favicons for performance
 */
async function preloadFavicons(hostnames: string[]): Promise<void> {
  const links: HTMLLinkElement[] = [];
  
  for (const hostname of hostnames) {
    for (const size of [16, 32, 64, 128]) {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
      link.as = "image";
      document.head.appendChild(link);
      links.push(link);
    }
  }

  // Clean up after short delay
  setTimeout(() => {
    links.forEach((link) => link.remove());
  }, 5000);
}
```

---

## Pattern 4: Favicon Change Detection

Monitoring favicon changes enables features like notification when a monitored site updates its branding, or tracking when pages update their icons.

### Detecting Favicon Changes

```ts
// background/favicon-monitor.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  monitoredSites: { type: "object", default: {} },
  faviconHistory: { type: "object", default: {} },
});

const storage = createStorage(schema);

interface MonitoredSite {
  url: string;
  hostname: string;
  lastKnownFavicon: string | null;
  onChange?: (newFavicon: string) => void;
}

/**
 * Monitors tabs for favicon changes
 */
class FaviconMonitor {
  private monitoredTabs = new Map<number, string>();

  /**
   * Starts monitoring a tab for favicon changes
   */
  monitorTab(tabId: number, hostname: string): void {
    chrome.tabs.get(tabId, (tab) => {
      if (tab?.favIconUrl) {
        this.monitoredTabs.set(tabId, tab.favIconUrl);
      }
    });
  }

  /**
   * Stops monitoring a tab
   */
  stopMonitoring(tabId: number): void {
    this.monitoredTabs.delete(tabId);
  }

  /**
   * Handles tab updates and detects favicon changes
   */
  async handleTabUpdate(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo
  ): Promise<void> {
    if (!changeInfo.favIconUrl) return;

    const previousFavicon = this.monitoredTabs.get(tabId);
    if (previousFavicon && previousFavicon !== changeInfo.favIconUrl) {
      await this.onFaviconChange(tabId, changeInfo.favIconUrl);
    }

    this.monitoredTabs.set(tabId, changeInfo.favIconUrl);
  }

  /**
   * Called when a monitored favicon changes
   */
  private async onFaviconChange(tabId: number, newFavicon: string): Promise<void> {
    const tab = await chrome.tabs.get(tabId);
    if (!tab?.url) return;

    const hostname = new URL(tab.url).hostname;

    // Store in history
    const history = await storage.get("faviconHistory");
    const siteHistory = history[hostname] || [];
    siteHistory.push({
      favicon: newFavicon,
      timestamp: Date.now(),
    });
    
    // Keep last 10 entries
    history[hostname] = siteHistory.slice(-10);
    await storage.set("faviconHistory", history);

    // Notify if this is a monitored site
    const monitored = await storage.get("monitoredSites");
    if (monitored[hostname]) {
      await this.notifyFaviconChange(hostname, newFavicon);
    }
  }

  /**
   * Shows notification when monitored site changes favicon
   */
  private async notifyFaviconChange(hostname: string, newFavicon: string): Promise<void> {
    chrome.notifications.create({
      type: "basic",
      iconUrl: newFavicon,
      title: "Favicon Changed",
      message: `The site ${hostname} has updated its favicon.`,
      priority: 1,
    });
  }
}

export const faviconMonitor = new FaviconMonitor();

// Register event listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.favIconUrl) {
    faviconMonitor.handleTabUpdate(tabId, changeInfo);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  faviconMonitor.stopMonitoring(tabId);
});
```

---

## Pattern 5: Custom Favicon Override

Sometimes you need to replace a page's favicon with a custom one for visual differentiation, branding, or accessibility purposes.

### Content Script Favicon Replacement

```ts
// content-scripts/favicon-override.ts

interface FaviconReplacement {
  selector: string;
  newHref: string;
  sizes?: string;
}

/**
 * Replaces page favicon with custom one
 */
function replaceFavicon(replacement: FaviconReplacement): void {
  removeExistingFavicons();
  
  const link = document.createElement("link");
  link.rel = replacement.selector || "icon";
  link.href = replacement.newHref;
  
  if (replacement.sizes) {
    link.setAttribute("sizes", replacement.sizes);
  }
  
  document.head.appendChild(link);
}

/**
 * Removes all existing favicon links
 */
function removeExistingFavicons(): void {
  const selectors = [
    "icon",
    "shortcut icon",
    "apple-touch-icon",
    "apple-touch-icon-precomposed",
  ];
  
  selectors.forEach((rel) => {
    const links = document.querySelectorAll(`link[rel="${rel}"]`);
    links.forEach((link) => link.remove());
  });
}

/**
 * Restores original favicons from stored references
 */
function restoreOriginalFavicons(): void {
  const originalFavicons = (window as any).__originalFavicons;
  if (!originalFavicons) return;

  removeExistingFavicons();
  
  originalFavicons.forEach((favicon: HTMLLinkElement) => {
    document.head.appendChild(favicon);
  });
}

/**
 * Captures original favicons before replacement
 */
function captureOriginalFavicons(): void {
  const faviconLinks = document.querySelectorAll<HTMLLinkElement>(
    'link[rel*="icon"]'
  );
  
  const originals: HTMLLinkElement[] = [];
  faviconLinks.forEach((link) => {
    originals.push(link.cloneNode(true) as HTMLLinkElement);
  });
  
  (window as any).__originalFavicons = originals;
}

// Message handler for extension communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "REPLACE_FAVICON":
      captureOriginalFavicons();
      replaceFavicon(message.replacement);
      sendResponse({ success: true });
      break;
      
    case "RESTORE_FAVICON":
      restoreOriginalFavicons();
      sendResponse({ success: true });
      break;
  }
});
```

### Background Script for Favicon Management

```ts
// background/favicon-manager.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  customFavicons: { type: "object", default: {} },
  enabledRules: { type: "object", default: {} },
});

const storage = createStorage(schema);

interface FaviconRule {
  hostname: string;
  customFaviconUrl: string;
  isEnabled: boolean;
}

/**
 * Applies custom favicon to matching tabs
 */
async function applyCustomFavicon(tabId: number, rule: FaviconRule): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url) return;

  const url = new URL(tab.url);
  if (url.hostname === rule.hostname || url.hostname.endsWith(`.${rule.hostname}`)) {
    await chrome.tabs.sendMessage(tabId, {
      type: "REPLACE_FAVICON",
      replacement: {
        selector: "icon",
        newHref: rule.customFaviconUrl,
        sizes: "32x32",
      },
    });
  }
}

/**
 * Removes custom favicon from tab
 */
async function removeCustomFavicon(tabId: number): Promise<void> {
  await chrome.tabs.sendMessage(tabId, {
    type: "RESTORE_FAVICON",
  });
}

/**
 * Gets all custom favicon rules
 */
async function getFaviconRules(): Promise<FaviconRule[]> {
  const customFavicons = await storage.get("customFavicons");
  return Object.entries(customFavicons).map(([hostname, url]) => ({
    hostname,
    customFaviconUrl: url as string,
    isEnabled: true,
  }));
}
```

---

## Pattern 6: Favicon Generation

Generate dynamic favicons using Canvas API in an offscreen document, useful for badges, notifications, or creating favicons from user-generated content.

### Canvas-Based Favicon Generation

```ts
// offscreen/favicon-generator.ts

interface FaviconOptions {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  size?: number;
  borderRadius?: number;
}

/**
 * Generates a favicon with text overlay using Canvas
 */
function generateFaviconWithText(options: FaviconOptions): string {
  const {
    text = "?",
    backgroundColor = "#4CAF50",
    textColor = "#FFFFFF",
    size = 32,
    borderRadius = size * 0.15,
  } = options;

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  
  if (!ctx) throw new Error("Failed to get canvas context");

  // Draw background
  ctx.fillStyle = backgroundColor;
  roundRect(ctx, 0, 0, size, size, borderRadius);
  ctx.fill();

  // Draw text
  ctx.fillStyle = textColor;
  ctx.font = `bold ${size * 0.6}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.charAt(0).toUpperCase(), size / 2, size / 2);

  return canvas.convertToBlob().then((blob) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }) as unknown as string;
}

/**
 * Helper to draw rounded rectangles
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Creates badge overlay on existing favicon
 */
async function createBadgeFavicon(
  baseFaviconUrl: string,
  badgeText: string,
  badgeColor: string = "#F44336"
): Promise<string> {
  const size = 32;
  const canvas = new OffscreenCanvas(size * 2, size * 2);
  const ctx = canvas.getContext("2d");
  
  if (!ctx) throw new Error("Failed to get canvas context");

  // Load base favicon
  const response = await fetch(baseFaviconUrl);
  const blob = await response.blob();
  const baseImg = await createImageBitmap(blob);
  
  // Draw base favicon
  ctx.drawImage(baseImg, 0, 0, size * 2, size * 2);

  // Draw badge circle
  const badgeSize = size;
  const badgeX = size * 2 - badgeSize * 0.7;
  const badgeY = size * 2 - badgeSize * 0.7;
  
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Draw badge text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${badgeSize * 0.35}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX, badgeY);

  const resultBlob = await canvas.convertToBlob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(resultBlob);
  });
}
```

### Generating Favicons from Domain First Letter

```ts
// utils/domain-favicon.ts

/**
 * Generates a favicon URL from domain first letter
 */
function generateDomainFavicon(hostname: string): string {
  const letter = hostname.charAt(0).toUpperCase();
  const colors = getConsistentColors(hostname);
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
      <rect width="32" height="32" fill="${colors.bg}" rx="6"/>
      <text 
        x="16" 
        y="21" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="18" 
        font-weight="600" 
        fill="${colors.fg}"
        text-anchor="middle"
      >${letter}</text>
    </svg>
  `;
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Generates consistent colors from hostname hash
 */
function getConsistentColors(hostname: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < hostname.length; i++) {
    hash = hostname.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const h = Math.abs(hash % 360);
  return {
    bg: `hsl(${h}, 65%, 80%)`,
    fg: `hsl(${h}, 75%, 25%)`,
  };
}
```

---

## Pattern 7: Favicon in Notifications and Badges

Use site favicons in system notifications and create visual badges that combine site identity with status information.

### Favicon in Chrome Notifications

```ts
// background/notification-favicons.ts
import { faviconCache } from "./favicon-cache";

interface NotificationWithFavicon {
  tabId: number;
  title: string;
  message: string;
  priority?: number;
}

/**
 * Creates a notification with the site's favicon
 */
async function createNotificationWithFavicon(
  options: NotificationWithFavicon
): Promise<string> {
  const { tabId, title, message, priority = 1 } = options;
  
  // Get favicon from cache or fetch it
  let iconUrl = "icons/default-notification.svg";
  
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.url) {
      const hostname = new URL(tab.url).hostname;
      const cachedFavicon = await faviconCache.getOrFetch(hostname);
      if (cachedFavicon) {
        iconUrl = cachedFavicon;
      }
    }
  } catch (error) {
    console.error("Failed to get favicon for notification:", error);
  }

  return new Promise((resolve) => {
    chrome.notifications.create(
      {
        type: "basic",
        iconUrl,
        title,
        message,
        priority,
      },
      (notificationId) => {
        resolve(notificationId || "");
      }
    );
  });
}

/**
 * Composites favicon with status indicator
 */
async function createStatusNotificationFavicon(
  hostname: string,
  status: "success" | "warning" | "error"
): Promise<string> {
  const statusConfig = {
    success: { color: "#4CAF50", symbol: "✓" },
    warning: { color: "#FF9800", symbol: "!" },
    error: { color: "#F44336", symbol: "✕" },
  };

  const config = statusConfig[status];
  const size = 64;
  
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  
  if (!ctx) return "";

  // Load site favicon
  const faviconUrl = await faviconCache.getOrFetch(hostname);
  
  if (faviconUrl) {
    const response = await fetch(faviconUrl);
    const blob = await response.blob();
    const img = await createImageBitmap(blob);
    ctx.drawImage(img, 0, 0, size, size);
  }

  // Draw status badge
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.arc(size * 0.75, size * 0.75, size * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Draw status symbol
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${size * 0.25}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(config.symbol, size * 0.75, size * 0.75);

  const resultBlob = await canvas.convertToBlob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(resultBlob);
  });
}
```

---

## Pattern 8: Favicon Extraction from Pages

Content scripts can extract all icon references from a page, helping extensions find the best available icon for a site.

### Extracting All Icon References

```ts
// content-scripts/icon-extractor.ts

interface IconMetadata {
  url: string;
  rel: string;
  sizes?: string;
  type?: string;
  isSvg: boolean;
  estimatedWidth?: number;
}

/**
 * Extracts all icon references from the current page
 */
function extractAllIcons(): IconMetadata[] {
  const icons: IconMetadata[] = [];
  
  // Standard favicon links
  const linkSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel="mask-icon"]',
  ];

  linkSelectors.forEach((selector) => {
    const elements = document.querySelectorAll<HTMLLinkElement>(selector);
    elements.forEach((link) => {
      if (link.href) {
        icons.push(parseIconElement(link));
      }
    });
  });

  // Open Graph image as fallback
  const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
  if (ogImage?.content) {
    icons.push({
      url: ogImage.content,
      rel: "og:image",
      isSvg: ogImage.content.endsWith(".svg"),
    });
  }

  // Twitter image as fallback
  const twitterImage = document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]');
  if (twitterImage?.content) {
    icons.push({
      url: twitterImage.content,
      rel: "twitter:image",
      isSvg: twitterImage.content.endsWith(".svg"),
    });
  }

  // Fallback to /favicon.ico
  const baseUrl = window.location.origin;
  icons.push({
    url: `${baseUrl}/favicon.ico`,
    rel: "favicon.ico",
    isSvg: false,
    estimatedWidth: 16,
  });

  return icons;
}

/**
 * Parses a link element into IconMetadata
 */
function parseIconElement(link: HTMLLinkElement): IconMetadata {
  const sizes = link.getAttribute("sizes");
  const type = link.getAttribute("type");
  
  return {
    url: link.href,
    rel: link.rel,
    sizes: sizes || undefined,
    type: type || undefined,
    isSvg: link.href.endsWith(".svg") || type === "image/svg+xml",
    estimatedWidth: parseSizesAttribute(sizes),
  };
}

/**
 * Parses sizes attribute to get estimated width
 */
function parseSizesAttribute(sizes: string | null): number | undefined {
  if (!sizes) return undefined;
  
  // Handle "any" or invalid values
  if (sizes === "any") return 256;
  
  // Parse "WxH" format - take width
  const match = sizes.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}
```

### Selecting the Best Available Icon

```ts
// utils/icon-selector.ts
import { IconMetadata } from "../content-scripts/icon-extractor";

/**
 * Selects the best icon from available options
 */
function selectBestIcon(
  icons: IconMetadata[],
  preferredSizes: number[] = [64, 32, 16]
): IconMetadata | null {
  if (icons.length === 0) return null;

  // Filter out SVG if better options exist (SVGs can be slow to render)
  const hasBitmapOptions = icons.some((i) => !i.isSvg && i.estimatedWidth);
  
  const candidates = hasBitmapOptions
    ? icons.filter((i) => !i.isSvg)
    : icons;

  // Sort by preference
  const sorted = [...candidates].sort((a, b) => {
    const aSize = a.estimatedWidth || 0;
    const bSize = b.estimatedWidth || 0;
    
    // Prefer sizes close to our preferred sizes
    const aDiff = Math.min(...preferredSizes.map((s) => Math.abs(s - aSize)));
    const bDiff = Math.min(...preferredSizes.map((s) => Math.abs(s - bSize)));
    
    if (aDiff !== bDiff) return aDiff - bDiff;
    
    // Prefer certain rel types
    const relPriority = ["icon", "shortcut icon", "apple-touch-icon", "og:image"];
    const aRelIndex = relPriority.indexOf(a.rel);
    const bRelIndex = relPriority.indexOf(b.rel);
    
    return aRelIndex - bRelIndex;
  });

  return sorted[0] || null;
}

/**
 * Resolves relative URLs to absolute
 */
function resolveIconUrl(icon: IconMetadata, baseUrl: string): string {
  try {
    return new URL(icon.url, baseUrl).href;
  } catch {
    return icon.url;
  }
}

/**
 * Gets the best icon for a page and returns metadata
 */
async function getBestIconForPage(): Promise<IconMetadata | null> {
  const icons = extractAllIcons();
  const best = selectBestIcon(icons);
  
  if (best) {
    return {
      ...best,
      url: resolveIconUrl(best, window.location.origin),
    };
  }
  
  return null;
}

// Export for content script messaging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PAGE_ICONS") {
    const icons = extractAllIcons();
    const best = selectBestIcon(icons, message.preferredSizes);
    sendResponse({ allIcons: icons, bestIcon: best });
  }
});
```

---

## Summary Table

| Pattern | Use Case | Key APIs | Complexity |
|---------|----------|----------|------------|
| **1. Getting Favicons** | Basic favicon retrieval with fallback | `chrome.tabs.Tab.favIconUrl` | Low |
| **2. Favicon Cache** | Performance optimization via IndexedDB | IndexedDB, Fetch API | High |
| **3. Favicon in UI** | Display in popups, lists, toolbars | HTML/CSS, Canvas | Medium |
| **4. Change Detection** | Monitor sites for favicon updates | `chrome.tabs.onUpdated` | Medium |
| **5. Custom Override** | Replace page favicon with custom | Content script DOM | Medium |
| **6. Favicon Generation** | Dynamic favicons from Canvas | OffscreenCanvas, Blob | High |
| **7. Notifications** | Use favicons in system notifications | `chrome.notifications` | Low |
| **8. Icon Extraction** | Find best icon from page markup | Content script DOM | Medium |

### Key Takeaways

1. **Always use fallback chain**: Tab favicon → Google S2 → Default icon
2. **Cache aggressively**: Favicons change rarely; cache for performance
3. **Handle high-DPI**: Use 32px at 2x DPR for crisp display
4. **Extract comprehensively**: Pages may have multiple icon sources
5. **Generate dynamically**: Canvas enables custom badges and overlays
6. **Monitor changes**: Track favicon updates for monitoring features

### Related APIs

- `chrome.tabs.Tab.favIconUrl` - Tab favicon property
- `chrome://favicon/` URL scheme - for accessing cached favicons (requires `"favicon"` permission in MV3)
- `chrome.notifications` - System notifications
- `chrome.tabs.onUpdated` - Tab change events
- IndexedDB - Favicon caching
- OffscreenCanvas - Dynamic favicon generation
