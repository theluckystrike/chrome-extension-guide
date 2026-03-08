---
layout: default
title: "Chrome Extension Reading List Api — Best Practices"
description: "Access Chrome Reading List with the Reading List API."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/reading-list-api/"
---

# Reading List API Patterns

## Overview

The Chrome Reading List API (Chrome 120+) provides built-in reading list management. This guide covers 8 practical patterns for integrating reading list functionality into your extension.

---

## Required Permissions

```jsonc
// manifest.json
{
  "permissions": ["readingList"],
  "optional_permissions": ["storage", "alarms", "notifications", "contextMenus", "sidePanel"]
}
```

```ts
// utils/feature-detection.ts
function isReadingListSupported(): boolean {
  return typeof chrome !== "undefined" && "readingList" in chrome;
}
```

---

## Pattern 1: Reading List API Basics

### Data Model

```ts
interface ReadingListEntry {
  url: string;
  title: string;
  hasBeenRead: boolean;
  creationTime: number;
}
```

### Adding Entries

```ts
// reading-list.ts
async function addToReadingList(url: string, title: string, hasBeenRead = false): Promise<boolean> {
  try {
    await chrome.readingList.addEntry({ url, title, hasBeenRead });
    return true;
  } catch (error) {
    if ((error as Error).message.includes("already exists")) return false;
    throw error;
  }
}
```

### Querying Entries

```ts
// query-reading-list.ts
async function queryReadingList(options: { hasBeenRead?: boolean } = {}): Promise<ReadingListEntry[]> {
  return chrome.readingList.query(options);
}

async function getUnreadItems(): Promise<ReadingListEntry[]> {
  return chrome.readingList.query({ hasBeenRead: false });
}

async function findByUrl(url: string): Promise<ReadingListEntry | null> {
  const results = await chrome.readingList.query({ url });
  return results[0] ?? null;
}
```

### Updating Entries

```ts
// update-reading-list.ts
async function markAsRead(url: string): Promise<boolean> {
  try {
    await chrome.readingList.updateEntry({ url, hasBeenRead: true });
    return true;
  } catch { return false; }
}

async function updateTitle(url: string, title: string): Promise<boolean> {
  try {
    await chrome.readingList.updateEntry({ url, title });
    return true;
  } catch { return false; }
}
```

### Removing Entries

```ts
// remove-reading-list.ts
async function removeFromReadingList(url: string): Promise<boolean> {
  try {
    await chrome.readingList.removeEntry({ url });
    return true;
  } catch { return false; }
}

async function clearReadItems(): Promise<number> {
  const readItems = await chrome.readingList.query({ hasBeenRead: true });
  let count = 0;
  for (const item of readItems) {
    if (await removeFromReadingList(item.url)) count++;
  }
  return count;
}
```

---

## Pattern 2: Add Current Page to Reading List

### Manifest

```jsonc
{
  "action": { "default_title": "Add to Reading List" },
  "permissions": ["readingList", "activeTab"]
}
```

### Action Click Handler

```ts
// background.ts
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || !tab.title) return;
  if (!tab.url.startsWith("http")) return;

  const existing = await chrome.readingList.query({ url: tab.url });

  if (existing.length > 0) {
    const entry = existing[0];
    await chrome.readingList.updateEntry({ url: tab.url, hasBeenRead: !entry.hasBeenRead });
    await showBadge(tab.id, entry.hasBeenRead ? "Unread" : "Read", "#4CAF50");
  } else {
    await chrome.readingList.addEntry({ url: tab.url, title: tab.title, hasBeenRead: false });
    await showBadge(tab.id, "Saved", "#2196F3");
  }

  setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 3000);
});

async function showBadge(tabId: number, text: string, color: string): Promise<void> {
  await chrome.action.setBadgeText({ text, tabId });
  await chrome.action.setBadgeBackgroundColor({ color });
}
```

### Duplicate Detection

```ts
// duplicate-check.ts
async function checkForDuplicate(url: string): Promise<boolean> {
  const entries = await chrome.readingList.query({ url });
  return entries.length > 0;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "ref"].forEach(p => u.searchParams.delete(p));
    return u.toString().toLowerCase();
  } catch { return url.toLowerCase(); }
}
```

---

## Pattern 3: Context Menu Integration

### Manifest

```jsonc
{ "permissions": ["contextMenus", "readingList"] }
```

### Create Context Menus

```ts
// context-menu.ts
const MENUS = {
  ADD_LINK: "reading-list-add-link",
  ADD_PAGE: "reading-list-add-page",
  MARK_READ: "reading-list-mark-read",
  REMOVE: "reading-list-remove",
} as const;

export function createReadingListMenus(): void {
  chrome.contextMenus.create({ id: MENUS.ADD_LINK, contexts: ["link"], title: "Add to Reading List" });
  chrome.contextMenus.create({ id: MENUS.ADD_PAGE, contexts: ["page"], title: "Add page to Reading List" });
  chrome.contextMenus.create({ id: MENUS.MARK_READ, contexts: ["page", "link"], title: "Mark as Read", visible: false });
  chrome.contextMenus.create({ id: MENUS.REMOVE, contexts: ["page", "link"], title: "Remove from Reading List", visible: false });
}
```

### Handle Clicks

```ts
// context-menu-handler.ts
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl ?? info.pageUrl ?? tab?.url;
  if (!url) return;

  switch (info.menuItemId) {
    case MENUS.ADD_LINK:
    case MENUS.ADD_PAGE:
      await chrome.readingList.addEntry({ url, title: tab?.title ?? "Untitled", hasBeenRead: false }).catch(() => {});
      break;
    case MENUS.MARK_READ:
      await chrome.readingList.updateEntry({ url, hasBeenRead: true });
      break;
    case MENUS.REMOVE:
      await chrome.readingList.removeEntry({ url });
      break;
  }
});

// Show/hide based on reading list state
chrome.contextMenus.onShown.addListener(async (info, tab) => {
  const url = info.linkUrl ?? info.pageUrl ?? tab?.url;
  if (!url) return;
  const inList = (await chrome.readingList.query({ url })).length > 0;
  chrome.contextMenus.update(MENUS.MARK_READ, { visible: inList });
  chrome.contextMenus.update(MENUS.REMOVE, { visible: inList });
});
```

---

## Pattern 4: Reading List Dashboard

### Manifest

```jsonc
{
  "side_panel": { "default_path": "sidepanel/index.html" },
  "permissions": ["readingList", "sidePanel", "storage"]
}
```

### Dashboard Logic

```ts
// sidepanel/dashboard.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface ReadingListItem {
  url: string;
  title: string;
  hasBeenRead: boolean;
  creationTime: number;
}

type SortOption = "dateAdded" | "title" | "domain";
type FilterOption = "all" | "unread" | "read";

const schema = defineSchema({ sortBy: { type: "string", default: "dateAdded" }, filterBy: { type: "string", default: "all" } });
const storage = createStorage(schema);

async function fetchItems(): Promise<ReadingListItem[]> {
  return chrome.readingList.query({});
}

function filterItems(items: ReadingListItem[], filter: FilterOption): ReadingListItem[] {
  if (filter === "unread") return items.filter(i => !i.hasBeenRead);
  if (filter === "read") return items.filter(i => i.hasBeenRead);
  return items;
}

function sortItems(items: ReadingListItem[], sortBy: SortOption): ReadingListItem[] {
  return [...items].sort((a, b) => {
    if (sortBy === "dateAdded") return b.creationTime - a.creationTime;
    if (sortBy === "title") return a.title.localeCompare(b.title);
    return new URL(a.url).hostname.localeCompare(new URL(b.url).hostname);
  });
}

class Dashboard {
  private items: ReadingListItem[] = [];
  private filter: FilterOption = "all";
  private sort: SortOption = "dateAdded";

  async init(): Promise<void> {
    const settings = await storage.get(["filterBy", "sortBy"]);
    this.filter = settings.filterBy as FilterOption;
    this.sort = settings.sortBy as SortOption;
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.items = await fetchItems();
    this.render();
  }

  private render(): void {
    const filtered = filterItems(this.items, this.filter);
    const sorted = sortItems(filtered, this.sort);
    const unreadCount = this.items.filter(i => !i.hasBeenRead).length;

    document.getElementById("app")!.innerHTML = `
      <div class="header"><h2>Reading List</h2><span class="badge">${unreadCount} unread</span></div>
      <div class="controls">
        <button data-filter="all" class="${this.filter === "all" ? "active" : ""}">All</button>
        <button data-filter="unread" class="${this.filter === "unread" ? "active" : ""}">Unread</button>
        <button data-filter="read" class="${this.filter === "read" ? "active" : ""}">Read</button>
        <select id="sort">
          <option value="dateAdded">Date</option>
          <option value="title">Title</option>
          <option value="domain">Domain</option>
        </select>
      </div>
      <div class="items">${sorted.map(item => `
        <div class="item" data-url="${item.url}">
          <div class="content">
            <a href="${item.url}" target="_blank">${item.title}</a>
            <span class="domain">${new URL(item.url).hostname}</span>
          </div>
          <div class="actions">
            <button data-action="toggle" data-url="${item.url}">${item.hasBeenRead ? "↩" : "✓"}</button>
            <button data-action="remove" data-url="${item.url}">✕</button>
          </div>
        </div>
      `).join("")}</div>
    `;
    this.bindEvents();
  }

  private bindEvents(): void {
    document.querySelectorAll("[data-filter]").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        this.filter = (e.target as HTMLElement).dataset.filter as FilterOption;
        await storage.set("filterBy", this.filter);
        this.render();
      });
    });

    document.getElementById("sort")?.addEventListener("change", async (e) => {
      this.sort = (e.target as HTMLSelectElement).value as SortOption;
      await storage.set("sortBy", this.sort);
      this.render();
    });

    document.querySelectorAll("[data-action='toggle']").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const url = (e.target as HTMLElement).dataset.url!;
        const item = this.items.find(i => i.url === url);
        if (item) {
          await chrome.readingList.updateEntry({ url, hasBeenRead: !item.hasBeenRead });
          await this.refresh();
        }
      });
    });

    document.querySelectorAll("[data-action='remove']").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const url = (e.target as HTMLElement).dataset.url!;
        await chrome.readingList.removeEntry({ url });
        await this.refresh();
      });
    });
  }
}
```

---

## Pattern 5: Reading List Sync with External Services

### Sync Manager

```ts
// sync/manager.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface SyncConfig { service: string; lastSync: number; enabled: boolean; }

const schema = defineSchema({ sync: { type: "object", default: { service: "", lastSync: 0, enabled: false } } });
const storage = createStorage(schema);

interface SyncResult { added: number; failed: number; }

async function syncToPocket(consumerKey: string, accessToken: string): Promise<SyncResult> {
  const items = await chrome.readingList.query({});
  const settings = await storage.get("sync");
  let added = 0, failed = 0;

  for (const item of items) {
    if (item.creationTime <= settings.sync.lastSync) continue;
    try {
      await fetch("https://getpocket.com/v3/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumer_key: consumerKey, access_token: accessToken, url: item.url, title: item.title }),
      });
      added++;
    } catch { failed++; }
  }

  await storage.set("sync", { ...settings.sync, lastSync: Date.now() });
  return { added, failed };
}

// Alarm-based periodic sync
chrome.alarms.create("reading-list-sync", { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "reading-list-sync") {
    const settings = await storage.get("sync");
    if (settings.sync.enabled && settings.sync.service === "pocket") {
      await syncToPocket("key", "token");
    }
  }
});
```

---

## Pattern 6: Smart Reading Suggestions

### Reading Progress Tracking

```ts
// suggestions/tracker.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface Progress { url: string; scrollPercent: number; timeSpent: number; lastReadAt: number; }

const schema = defineSchema({ progress: { type: "object", default: {} } });
const storage = createStorage(schema);

async function updateProgress(url: string, scrollPercent: number, timeSpent: number): Promise<void> {
  const p = await storage.get("progress");
  p.progress[url] = { url, scrollPercent, timeSpent, lastReadAt: Date.now() };
  await storage.set("progress", p);
}

async function getContinueReading(): Promise<Array<{ url: string; title: string; progress: number }>> {
  const p = await storage.get("progress");
  const items = await chrome.readingList.query({ hasBeenRead: false });
  return items
    .filter(item => p.progress[item.url]?.scrollPercent > 5)
    .map(item => ({ url: item.url, title: item.title, progress: p.progress[item.url].scrollPercent }))
    .sort((a, b) => b.progress - a.progress);
}

// Content script sends scroll updates
// content.ts
let maxScroll = 0;
window.addEventListener("scroll", () => {
  const percent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  maxScroll = Math.max(maxScroll, percent);
  chrome.runtime.sendMessage({ type: "scroll-update", percent: maxScroll });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "get-progress") return { percent: maxScroll };
});
```

### Estimated Reading Time

```ts
// reading-time.ts
function estimateReadingTime(text: string): number {
  return Math.ceil(text.split(/\s+/).length / 200);
}

async function getEstimatedTime(url: string): Promise<number> {
  const [tab] = await chrome.tabs.query({ url });
  if (!tab?.id) return 0;
  const result = await chrome.tabs.sendMessage(tab.id, { type: "get-content" });
  return result ? estimateReadingTime(result) : 0;
}
```

---

## Pattern 7: Reading List Notifications

### Badge Updates

```ts
// notifications/badge.ts
async function updateBadge(): Promise<void> {
  const items = await chrome.readingList.query({ hasBeenRead: false });
  const count = items.length;
  if (count > 0) {
    await chrome.action.setBadgeText({ text: count > 99 ? "99+" : String(count) });
    await chrome.action.setBadgeBackgroundColor({ color: "#1976D2" });
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

chrome.runtime.onStartup.addListener(updateBadge);
chrome.storage.onChanged.addListener(() => updateBadge());
```

### Reminder Notifications

```ts
// notifications/reminder.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({ reminderEnabled: { type: "boolean", default: true }, reminderTime: { type: "string", default: "09:00" } });
const storage = createStorage(schema);

async function showReminder(): Promise<void> {
  const items = await chrome.readingList.query({ hasBeenRead: false });
  if (items.length === 0) return;

  await chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title: "Reading List Reminder",
    message: items.length === 1 ? "1 unread article" : `${items.length} unread articles`,
  });
}

chrome.notifications.onClicked.addListener(() => chrome.sidePanel.open());

// Schedule daily reminder
function scheduleReminder(): void {
  const [hours, minutes] = "09:00".split(":").map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  chrome.alarms.create("reading-reminder", { delayInMinutes: (next.getTime() - now.getTime()) / 60000, periodInMinutes: 1440 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "reading-reminder") {
    const settings = await storage.get("reminderEnabled");
    if (settings.reminderEnabled) await showReminder();
  }
});
```

---

## Pattern 8: Offline Reading Support

### Cache Manager

```ts
// offline/cache.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface CachedArticle { url: string; title: string; content: string; cachedAt: number; }

const MAX_SIZE_MB = 50;
const schema = defineSchema({ cache: { type: "object", default: {} }, cacheSize: { type: "number", default: 0 } });
const storage = createStorage(schema);

async function cacheArticle(url: string, title: string, content: string): Promise<void> {
  const s = await storage.get(["cache", "cacheSize"]);
  const size = new Blob([content]).size;

  if (s.cacheSize + size > MAX_SIZE_MB * 1024 * 1024) await cleanup();

  s.cache[url] = { url, title, content, cachedAt: Date.now() };
  await storage.set({ cache: s.cache, cacheSize: s.cacheSize + size });
}

async function getCachedArticle(url: string): Promise<CachedArticle | null> {
  const s = await storage.get("cache");
  return s.cache[url] ?? null;
}

async function cleanup(): Promise<void> {
  const s = await storage.get(["cache", "cacheSize"]);
  const entries = Object.values(s.cache);

  for (const entry of entries) {
    const inList = await chrome.readingList.query({ url: entry.url });
    if (inList.length > 0 && inList[0].hasBeenRead) {
      delete s.cache[entry.url];
      s.cacheSize -= new Blob([entry.content]).size;
    }
  }
  await storage.set(s);
}

// Auto-cache when marking as read
chrome.readingList.onEntryUpdated.addListener(async (entry) => {
  const url = entry.url;
  const [tab] = await chrome.tabs.query({ url });
  if (tab?.id) {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "extract-content" });
    if (result) await cacheArticle(url, result.title, result.content);
  }
});
```

### Offline Detection

```ts
// offline/manager.ts
class OfflineManager {
  private online = navigator.onLine;

  constructor() {
    window.addEventListener("online", () => { this.online = true; console.log("Online"); });
    window.addEventListener("offline", () => { this.online = false; console.log("Offline"); });
  }

  async getContent(url: string): Promise<{ content: string; isOffline: boolean }> {
    const cached = await getCachedArticle(url);
    if (cached) return { content: cached.content, isOffline: !this.online };
    if (!this.online) throw new Error("Offline and not cached");
    return { content: "Fetch from network", isOffline: false };
  }
}
```

---

## Summary

| Pattern | Description | Key APIs |
|---------|-------------|----------|
| **API Basics** | CRUD: addEntry, query, updateEntry, removeEntry | `chrome.readingList` |
| **Add Current Page** | Action button with duplicate detection, badge | `chrome.action`, `chrome.tabs` |
| **Context Menus** | Right-click on links/pages | `chrome.contextMenus` |
| **Dashboard** | Side panel with filter/sort | `chrome.sidePanel`, `chrome.storage` |
| **External Sync** | Export to Pocket/Instapaper via alarms | `chrome.alarms`, `fetch` |
| **Smart Suggestions** | Track progress, continue reading | `chrome.tabs.sendMessage` |
| **Notifications** | Reminders, badge updates | `chrome.notifications`, `chrome.alarms` |
| **Offline Support** | Cache articles in storage | `chrome.storage.local` |

### Key Takeaways

1. **URL as key**: Reading List uses URLs as unique identifiers—normalize for duplicates.
2. **Query only**: Use `query()` to retrieve entries; no direct get-by-ID.
3. **Permissions**: Add `"readingList"` to manifest.
4. **Browser support**: Chrome 120+, Edge 120+.
5. **Combine patterns**: Production extensions often mix multiple patterns.
6. **Storage**: Use `@theluckystrike/webext-storage` for settings and progress.
7. **Messaging**: Use `@theluckystrike/webext-messaging` for background-content communication.
