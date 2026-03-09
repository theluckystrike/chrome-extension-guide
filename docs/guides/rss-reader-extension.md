# Building an RSS Reader Chrome Extension

## Overview
This guide covers building a production-ready RSS reader extension using Chrome's MV3 architecture, TypeScript, and modern state management patterns.

## Architecture & Manifest Setup

### Manifest Configuration (manifest.json)
```json
{
  "manifest_version": 3,
  "name": "RSS Reader Pro",
  "version": "1.0.0",
  "description": "A powerful RSS feed reader with offline support",
  "permissions": [
    "storage",
    "notifications",
    "alarms",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "side_panel": {
    "default_path": "sidebar/index.html"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content.js"],
    "css": ["content/content.css"]
  }]
}
```

### Project Structure
```
src/
├── background/
│   ├── worker.ts          # Service worker entry
│   ├── feed-parser.ts     # RSS/Atom parsing
│   ├── sync-engine.ts     # Background sync logic
│   └── storage.ts         # chrome.storage abstraction
├── popup/
│   ├── index.html
│   ├── App.tsx           # React/Vue component
│   └── styles.css
├── sidebar/
│   ├── index.html
│   └── reader.tsx
├── content/
│   ├── content.ts        # Page injection script
│   └── overlay.ts        # Floating feed discovery
├── shared/
│   ├── types.ts          # Shared TypeScript interfaces
│   ├── constants.ts
│   └── utils.ts
└── options/
    └── settings.ts       # Options page
```

## Core TypeScript Implementation

### Shared Types (shared/types.ts)
```typescript
interface Feed {
  id: string;
  url: string;
  title: string;
  description?: string;
  icon?: string;
  lastFetched?: number;
  etag?: string;
  lastModified?: string;
}

interface Article {
  id: string;
  feedId: string;
  title: string;
  link: string;
  content: string;
  summary?: string;
  author?: string;
  published: number;
  read: boolean;
  starred: boolean;
}

interface FeedState {
  feeds: Feed[];
  articles: Record<string, Article[]>;
  lastSync: number;
  isSyncing: boolean;
}

interface SyncOptions {
  forceRefresh: boolean;
  background: boolean;
}
```

### Feed Parser (background/feed-parser.ts)
```typescript
import { Feed, Article } from '../shared/types';

const RSS_NS = {
  rss: 'http://purl.org/rss/1.0/',
  atom: 'http://www.w3.org/2005/Atom',
  content: 'http://purl.org/rss/1.0/modules/content/'
};

export class FeedParser {
  private doc: Document;

  constructor(xml: string) {
    const parser = new DOMParser();
    this.doc = parser.parseFromString(xml, 'application/xml');
  }

  isValid(): boolean {
    const error = this.doc.querySelector('parsererror');
    return !error;
  }

  getFeedType(): 'rss' | 'atom' | null {
    if (this.doc.querySelector('rss')) return 'rss';
    if (this.doc.querySelector('feed')) return 'atom';
    return null;
  }

  parse(feedUrl: string): Feed {
    const type = this.getFeedType();
    if (type === 'rss') return this.parseRSS(feedUrl);
    if (type === 'atom') return this.parseAtom(feedUrl);
    throw new Error('Unknown feed format');
  }

  parseArticles(feedId: string): Article[] {
    const type = this.getFeedType();
    if (type === 'rss') return this.parseRSSItems(feedId);
    if (type === 'atom') return this.parseAtomItems(feedId);
    return [];
  }

  private parseRSS(feedUrl: string): Feed {
    const channel = this.doc.querySelector('channel');
    return {
      id: this.generateId(feedUrl),
      url: feedUrl,
      title: channel?.querySelector('title')?.textContent || 'Untitled',
      description: channel?.querySelector('description')?.textContent || undefined,
      icon: channel?.querySelector('image > url')?.textContent || undefined
    };
  }

  private parseAtom(feedUrl: string): Feed {
    const feed = this.doc.querySelector('feed');
    return {
      id: this.generateId(feedUrl),
      url: feedUrl,
      title: feed?.querySelector('title')?.textContent || 'Untitled',
      description: feed?.querySelector('subtitle')?.textContent || undefined
    };
  }

  private parseRSSItems(feedId: string): Article[] {
    const items = this.doc.querySelectorAll('item');
    return Array.from(items).map((item, index) => ({
      id: `${feedId}_${index}`,
      feedId,
      title: item.querySelector('title')?.textContent || 'No title',
      link: item.querySelector('link')?.textContent || '',
      content: item.querySelector('content|encoded')?.textContent || 
                item.querySelector('description')?.textContent || '',
      summary: item.querySelector('description')?.textContent || undefined,
      author: item.querySelector('author')?.textContent || undefined,
      published: this.parseDate(item.querySelector('pubDate')?.textContent),
      read: false,
      starred: false
    }));
  }

  private parseAtomItems(feedId: string): Article[] {
    const entries = this.doc.querySelectorAll('entry');
    return Array.from(entries).index, (entry) => ({
      id: `${feedId}_${index}`,
      feedId,
      title: entry.querySelector('title')?.textContent || 'No title',
      link: entry.querySelector('link')?.getAttribute('href') || '',
      content: entry.querySelector('content')?.textContent || 
                entry.querySelector('summary')?.textContent || '',
      summary: entry.querySelector('summary')?.textContent || undefined,
      author: entry.querySelector('author > name')?.textContent || undefined,
      published: this.parseDate(entry.querySelector('published')?.textContent || 
                                entry.querySelector('updated')?.textContent),
      read: false,
      starred: false
    }));
  }

  private generateId(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private parseDate(dateStr?: string): number {
    if (!dateStr) return Date.now();
    return new Date(dateStr).getTime() || Date.now();
  }
}
```

## State Management & Storage

### Storage Abstraction (background/storage.ts)
```typescript
import { Feed, Article, FeedState } from '../shared/types';

const STORAGE_KEYS = {
  FEEDS: 'rss_feeds',
  ARTICLES: 'rss_articles',
  SETTINGS: 'rss_settings',
  STATE: 'rss_state'
} as const;

export class StorageManager {
  async getFeeds(): Promise<Feed[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.FEEDS);
    return result[STORAGE_KEYS.FEEDS] || [];
  }

  async saveFeeds(feeds: Feed[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.FEEDS]: feeds });
  }

  async getArticles(feedId?: string): Promise<Record<string, Article[]> | Article[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ARTICLES);
    const articles = result[STORAGE_KEYS.ARTICLES] || {};
    
    if (feedId) return articles[feedId] || [];
    return articles;
  }

  async saveArticles(feedId: string, newArticles: Article[]): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ARTICLES);
    const articles = result[STORAGE_KEYS.ARTICLES] || {};
    
    const existing = articles[feedId] || [];
    const merged = this.mergeArticles(existing, newArticles);
    articles[feedId] = merged;
    
    await chrome.storage.local.set({ [STORAGE_KEYS.ARTICLES]: articles });
  }

  private mergeArticles(existing: Article[], incoming: Article[]): Article[] {
    const seen = new Set(existing.map(a => a.link));
    const newItems = incoming.filter(a => !seen.has(a.link));
    return [...newItems, ...existing].sort((a, b) => b.published - a.published);
  }

  async getState(): Promise<FeedState> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.STATE);
    return result[STORAGE_KEYS.STATE] || {
      feeds: [],
      articles: {},
      lastSync: 0,
      isSyncing: false
    };
  }

  async updateState(partial: Partial<FeedState>): Promise<void> {
    const current = await this.getState();
    await chrome.storage.local.set({
      [STORAGE_KEYS.STATE]: { ...current, ...partial }
    });
  }
}

export const storage = new StorageManager();
```

## Chrome APIs & Permissions

### Required Permissions
- `storage` - Persist feeds, articles, and settings
- `notifications` - New article alerts
- `alarms` - Scheduled feed refresh
- `tabs` - Open articles in new tabs
- `host_permissions: <all_urls>` - Fetch RSS feeds from any domain

### Service Worker Implementation (background/worker.ts)
```typescript
import { FeedParser } from './feed-parser';
import { storage } from './storage';

const SYNC_ALARM = 'feed-sync-alarm';
const SYNC_INTERVAL_HOURS = 1;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, {
    periodInMinutes: SYNC_INTERVAL_HOURS * 60
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) {
    syncAllFeeds();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_FEEDS') {
    syncAllFeeds().then(() => sendResponse({ success: true }));
    return true;
  }
  
  if (message.type === 'ADD_FEED') {
    addFeed(message.url).then(feed => sendResponse({ feed }));
    return true;
  }
  
  if (message.type === 'GET_STATE') {
    storage.getState().then(state => sendResponse({ state }));
    return true;
  }
});

async function syncAllFeeds(): Promise<void> {
  await storage.updateState({ isSyncing: true });
  
  const feeds = await storage.getFeeds();
  const results = await Promise.allSettled(
    feeds.map(feed => fetchFeed(feed))
  );
  
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  
  await storage.updateState({
    isSyncing: false,
    lastSync: Date.now()
  });
  
  if (successCount > 0) {
    notifyNewArticles();
  }
}

async function fetchFeed(feed: Feed): Promise<void> {
  const headers: Record<string, string> = {};
  
  if (feed.etag) headers['If-None-Match'] = feed.etag;
  if (feed.lastModified) headers['If-Modified-Since'] = feed.lastModified;
  
  const response = await fetch(feed.url, { headers });
  
  if (response.status === 304) return;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  
  const text = await response.text();
  const parser = new FeedParser(text);
  
  if (!parser.isValid()) throw new Error('Invalid feed format');
  
  const articles = parser.parseArticles(feed.id);
  await storage.saveArticles(feed.id, articles);
  
  const etag = response.headers.get('etag');
  const lastModified = response.headers.get('last-modified');
  
  if (etag || lastModified) {
    feed.etag = etag || feed.etag;
    feed.lastModified = lastModified || feed.lastModified;
    feed.lastFetched = Date.now();
    const feeds = await storage.getFeeds();
    const updated = feeds.map(f => f.id === feed.id ? feed : f);
    await storage.saveFeeds(updated);
  }
}

async function addFeed(url: string): Promise<Feed> {
  const response = await fetch(url);
  const text = await response.text();
  const parser = new FeedParser(text);
  
  const feed = parser.parse(url);
  const feeds = await storage.getFeeds();
  
  if (feeds.some(f => f.url === url)) {
    throw new Error('Feed already exists');
  }
  
  await storage.saveFeeds([...feeds, feed]);
  await fetchFeed(feed);
  
  return feed;
}

function notifyNewArticles(): void {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'RSS Reader',
    message: 'New articles available!'
  });
}
```

## Error Handling & Edge Cases

### Robust Error Handling Pattern
```typescript
async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('Operation failed:', error);
    return fallback;
  }
}

class FeedSyncError extends Error {
  constructor(
    message: string,
    public feedId: string,
    public status: 'network' | 'parse' | 'auth' | 'rate_limit'
  ) {
    super(message);
    this.name = 'FeedSyncError';
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Offline Handling
```typescript
class OfflineManager {
  private online = navigator.onLine;
  
  constructor() {
    window.addEventListener('online', () => {
      this.online = true;
      this.syncPendingChanges();
    });
    
    window.addEventListener('offline', () => {
      this.online = false;
    });
  }
  
  async fetchWithOffline<T>(
    url: string,
    cacheKey: string
  ): Promise<T | null> {
    if (!this.online) {
      const cached = await chrome.storage.local.get(cacheKey);
      return cached[cacheKey] || null;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    await chrome.storage.local.set({ [cacheKey]: data });
    return data;
  }
}
```

## UI Design Patterns

### Popup Interface (popup/App.tsx)
```typescript
import React, { useState, useEffect } from 'react';
import { Feed, Article } from '../shared/types';

export function Popup() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    setFeeds(response.state.feeds);
    setLoading(false);
  }

  async function handleRefresh() {
    setLoading(true);
    await chrome.runtime.sendMessage({ type: 'SYNC_FEEDS' });
    await loadData();
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>RSS Reader</h1>
        <button onClick={handleRefresh} disabled={loading}>
          {loading ? 'Syncing...' : 'Refresh'}
        </button>
      </header>
      
      <div className="feed-list">
        {feeds.map(feed => (
          <div 
            key={feed.id}
            className={`feed-item ${selectedFeed === feed.id ? 'active' : ''}`}
            onClick={() => setSelectedFeed(feed.id)}
          >
            {feed.title}
          </div>
        ))}
      </div>
      
      <div className="article-list">
        {articles.slice(0, 20).map(article => (
          <ArticleItem key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}

function ArticleItem({ article }: { article: Article }) {
  function openArticle() {
    chrome.tabs.create({ url: article.link });
  }

  return (
    <div className={`article-item ${article.read ? 'read' : 'unread'}`}>
      <h3 onClick={openArticle}>{article.title}</h3>
      <p>{article.summary?.substring(0, 100)}...</p>
    </div>
  );
}
```

### Side Panel Reader (sidebar/reader.tsx)
{% raw %}
```typescript
export function SidePanelReader() {
  const [article, setArticle] = useState<Article | null>(null);
  
  useEffect(() => {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SHOW_ARTICLE') {
        setArticle(message.article);
      }
    });
  }, []);

  if (!article) {
    return <div className="empty-state">Select an article to read</div>;
  }

  return (
    <article className="reader-content">
      <h1>{article.title}</h1>
      <div className="meta">
        <span>{article.author}</span>
        <span>{new Date(article.published).toLocaleDateString()}</span>
      </div>
      <div 
        className="content"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </article>
  );
}
```
{% endraw %}

## Testing Approach

### Unit Tests with Vitest
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedParser } from '../background/feed-parser';

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>A test RSS feed</description>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article</link>
      <description>Article summary</description>
      <pubDate>Wed, 01 Jan 2025 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe('FeedParser', () => {
  it('should parse RSS feed correctly', () => {
    const parser = new FeedParser(SAMPLE_RSS);
    const feed = parser.parse('https://example.com/feed.xml');
    
    expect(feed.title).toBe('Test Feed');
    expect(feed.description).toBe('A test RSS feed');
  });

  it('should parse articles from RSS', () => {
    const parser = new FeedParser(SAMPLE_RSS);
    const articles = parser.parseArticles('feed1');
    
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Test Article');
    expect(articles[0].link).toBe('https://example.com/article');
  });

  it('should detect invalid XML', () => {
    const parser = new FeedParser('<invalid>xml');
    expect(parser.isValid()).toBe(false);
  });
});
```

### Integration Testing with Playwright
```typescript
import { test, expect } from '@playwright/test';

test('popup loads and displays feeds', async ({ page }) => {
  await page.goto('popup/index.html');
  
  await expect(page.locator('h1')).toHaveText('RSS Reader');
  await expect(page.locator('.feed-list')).toBeVisible();
});

test('feed sync works end-to-end', async ({ page }) => {
  await page.goto('popup/index.html');
  
  await page.click('text=Refresh');
  await page.waitForSelector('text=Syncing...', { state: 'hidden' });
  
  const articles = await page.locator('.article-item').count();
  expect(articles).toBeGreaterThan(0);
});
```

## Performance Considerations

### Memory Management
- Limit stored articles per feed (e.g., 500 max)
- Use `chrome.storage.session` for temporary data
- Implement virtual scrolling for large article lists
- Lazy load images in content script

### Network Optimization
```typescript
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

async function fetchCached(url: string): Promise<Response> {
  const cached = await caches.open('rss-cache');
  const cachedResponse = await cached.match(url);
  
  if (cachedResponse) {
    const cachedTime = parseInt(cachedResponse.headers.get('x-cached-time') || '0');
    if (Date.now() - cachedTime < CACHE_DURATION) {
      return cachedResponse;
    }
  }
  
  const response = await fetch(url);
  const responseToCache = response.clone();
  
  responseToCache.headers.set('x-cached-time', Date.now().toString());
  await cached.put(url, responseToCache);
  
  return response;
}
```

### Service Worker Optimization
- Keep service worker lean - offload to dedicated modules
- Use `chrome.storage.session` for ephemeral data
- Implement proper cleanup on `chrome.runtime.onSuspend`

## Publishing Checklist

### Pre-submission
- [ ] Increment version in manifest.json
- [ ] Run production build (minify, tree-shake)
- [ ] Verify all icons are present (16, 48, 128px)
- [ ] Test in Chrome, Edge, and Brave
- [ ] Check for console errors
- [ ] Verify all permissions are necessary
- [ ] Add screenshots and description to manifest

### Chrome Web Store
- [ ] Create developer account
- [ ] Upload as ZIP (exclude source maps)
- [ ] Fill store listing (title, description, screenshots)
- [ ] Set pricing and distribution
- [ ] Submit for review

### Post-publish
- [ ] Monitor error reports in Chrome Web Store console
- [ ] Set up update URL for auto-updates
- [ ] Create support page/email
- [ ] Document changelog

## Summary
This guide covered building a complete RSS reader extension with proper architecture, TypeScript implementation, state management, error handling, and UI patterns. The extension uses MV3 features including side panels, service workers, and modern Chrome APIs for a production-ready experience.
