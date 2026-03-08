---
layout: default
title: "Chrome Extension RSS Reader — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-rss-reader/"
---
# Build an RSS Reader Chrome Extension

This tutorial walks through building a fully functional RSS feed reader extension with feed management, periodic polling, and unread badges.

## Prerequisites {#prerequisites}

- Chrome browser
- Basic JavaScript knowledge
- Understanding of Chrome Extension architecture

## Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create `manifest.json` with required permissions for alarms, storage, and notifications:

```json
{
  "manifest_version": 3,
  "name": "RSS Reader",
  "version": "1.0",
  "permissions": ["alarms", "storage", "notifications", "offscreen"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "options_page": "options.html"
}
```

Key permissions explained:
- **alarms**: Schedule periodic feed polling
- **storage**: Persist feed URLs and read states
- **offscreen**: Create DOMParser context for XML parsing
- **badge**: Display unread count

## Step 2: Options Page for Feed Management {#step-2-options-page-for-feed-management}

Create `options.html` and `options.js` for managing RSS feed URLs:

```javascript
// options.js
const FEEDS_KEY = 'rss_feeds';

async function loadFeeds() {
  const result = await chrome.storage.local.get(FEEDS_KEY);
  return result[FEEDS_KEY] || [];
}

async function saveFeeds(feeds) {
  await chrome.storage.local.set({ [FEEDS_KEY]: feeds });
  updateFeedList();
}

async function addFeed(url) {
  const feeds = await loadFeeds();
  if (!feeds.includes(url)) {
    feeds.push(url);
    await saveFeeds(feeds);
  }
}

async function removeFeed(url) {
  const feeds = await loadFeeds();
  const filtered = feeds.filter(f => f !== url);
  await saveFeeds(filtered);
}

function updateFeedList() {
  loadFeeds().then(feeds => {
    const list = document.getElementById('feedList');
    list.innerHTML = feeds.map(url => 
      `<li>${url} <button data-url="${url}">Remove</button></li>`
    ).join('');
  });
}
```

## Step 3: Background Service Worker with Alarm Polling {#step-3-background-service-worker-with-alarm-polling}

Set up periodic feed fetching using the Alarms API:

```javascript
// background.js
const POLL_INTERVAL = 15; // minutes

chrome.alarms.create('feedPoll', { periodInMinutes: POLL_INTERVAL });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'feedPoll') {
    await pollAllFeeds();
  }
});

async function pollAllFeeds() {
  const result = await chrome.storage.local.get('rss_feeds');
  const feeds = result.rss_feeds || [];
  
  for (const feedUrl of feeds) {
    try {
      const articles = await fetchAndParseFeed(feedUrl);
      await saveArticles(feedUrl, articles);
    } catch (error) {
      console.error(`Failed to fetch ${feedUrl}:`, error);
    }
  }
  
  await updateBadgeCount();
}
```

## Step 4: RSS Parsing with Offscreen Documents {#step-4-rss-parsing-with-offscreen-documents}

Service workers cannot use DOMParser directly. Use offscreen documents:

```javascript
// background.js
async function fetchAndParseFeed(feedUrl) {
  // Create offscreen document for XML parsing
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_PARSER'],
    justification: 'Parse RSS XML feed'
  });
  
  // Send URL to offscreen for parsing
  const response = await chrome.runtime.sendMessage({
    type: 'PARSE_FEED',
    target: 'offscreen',
    feedUrl
  });
  
  return response.articles;
}
```

```javascript
// offscreen.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PARSE_FEED') {
    parseFeed(message.feedUrl);
  }
});

async function parseFeed(feedUrl) {
  const response = await fetch(feedUrl);
  const text = await response.text();
  
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  
  const items = xml.querySelectorAll('item');
  const articles = Array.from(items).map(item => ({
    title: item.querySelector('title')?.textContent,
    link: item.querySelector('link')?.textContent,
    pubDate: item.querySelector('pubDate')?.textContent,
    feedUrl
  }));
  
  chrome.runtime.sendMessage({
    type: 'PARSED_ARTICLES',
    articles
  });
}
```

## Step 5: Storage Schema {#step-5-storage-schema}

Define structured storage for feeds and articles:

```javascript
// Storage structure
{
  "rss_feeds": ["https://example.com/feed.xml"],
  "articles": {
    "https://example.com/feed.xml": [
      {
        "title": "Article Title",
        "link": "https://example.com/article",
        "pubDate": "2024-01-01",
        "read": false
      }
    ]
  }
}

async function saveArticles(feedUrl, newArticles) {
  const result = await chrome.storage.local.get('articles');
  const articles = result.articles || {};
  
  const existing = articles[feedUrl] || [];
  const merged = [...newArticles, ...existing].slice(0, 50); // Keep latest 50
  
  articles[feedUrl] = merged;
  await chrome.storage.local.set({ articles });
}
```

## Step 6: Popup UI for Viewing Articles {#step-6-popup-ui-for-viewing-articles}

Create `popup.html` and `popup.js` to display articles grouped by feed:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 350px; padding: 10px; }
    .feed-section { margin-bottom: 15px; }
    .feed-title { font-weight: bold; margin-bottom: 5px; }
    .article { padding: 8px; border-bottom: 1px solid #eee; }
    .article.unread { background: #f0f8ff; }
    .article a { text-decoration: none; color: #333; }
  </style>
</head>
<body>
  <div id="articles"></div>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
async function loadArticles() {
  const result = await chrome.storage.local.get('articles');
  const articles = result.articles || {};
  const container = document.getElementById('articles');
  
  for (const [feedUrl, items] of Object.entries(articles)) {
    const section = document.createElement('div');
    section.className = 'feed-section';
    section.innerHTML = `<div class="feed-title">${feedUrl}</div>`;
    
    items.slice(0, 10).forEach(article => {
      const div = document.createElement('div');
      div.className = `article ${article.read ? '' : 'unread'}`;
      div.innerHTML = `<a href="${article.link}" target="_blank">${article.title}</a>`;
      div.addEventListener('click', () => markAsRead(feedUrl, article.link));
      section.appendChild(div);
    });
    
    container.appendChild(section);
  }
}

loadArticles();
```

## Step 7: Mark as Read & Open in New Tab {#step-7-mark-as-read-open-in-new-tab}

Add functionality to track read state:

```javascript
async function markAsRead(feedUrl, articleLink) {
  const result = await chrome.storage.local.get('articles');
  const articles = result.articles || {};
  
  if (articles[feedUrl]) {
    articles[feedUrl] = articles[feedUrl].map(a => 
      a.link === articleLink ? { ...a, read: true } : a
    );
    await chrome.storage.local.set({ articles });
    await updateBadgeCount();
  }
}
```

## Step 8: Badge Count for Unread Articles {#step-8-badge-count-for-unread-articles}

Display unread count in the extension badge:

```javascript
async function updateBadgeCount() {
  const result = await chrome.storage.local.get('articles');
  const articles = result.articles || {};
  
  let unreadCount = 0;
  for (const items of Object.values(articles)) {
    unreadCount += items.filter(a => !a.read).length;
  }
  
  chrome.action.setBadgeText({ text: unreadCount > 0 ? String(unreadCount) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#007bff' });
}
```

## Error Handling {#error-handling}

Implement robust error handling for common issues:

```javascript
async function fetchAndParseFeed(feedUrl) {
  try {
    const response = await fetch(feedUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    
    const parseError = xml.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML feed');
    }
    
    return parseArticles(xml, feedUrl);
  } catch (error) {
    console.error(`Feed error [${feedUrl}]:`, error.message);
    // Notify user via notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'RSS Reader Error',
      message: `Failed to fetch: ${feedUrl}`
    });
    return [];
  }
}
```

## Summary {#summary}

This RSS reader extension demonstrates:
- **Alarms API** for periodic polling (see `api-reference/alarms-api.md`)
- **Storage API** for persisting feeds and articles (see `api-reference/storage-api-deep-dive.md`)
- **Offscreen Documents** for XML parsing in service worker context (see `patterns/offscreen-documents.md`)

The extension can be installed locally by loading the unpacked extension in Chrome's extension management page.
-e 

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
