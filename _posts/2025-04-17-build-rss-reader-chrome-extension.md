---
layout: post
title: "Build an RSS Reader Chrome Extension: Subscribe to Any Website's Feed"
description: "Learn how to build a powerful RSS reader Chrome extension from scratch. This step-by-step tutorial covers feed parsing, subscription management, and publishing to the Chrome Web Store."
date: 2025-04-17
categories: [Chrome-Extensions, Tutorials]
tags: [rss, reader, chrome-extension]
keywords: "chrome extension rss reader, build rss extension, rss feed chrome extension, rss reader chrome, chrome extension feed reader"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/17/build-rss-reader-chrome-extension/"
---

# Build an RSS Reader Chrome Extension: Subscribe to Any Website's Feed

RSS (Really Simple Syndication) remains one of the most powerful ways to consume content from across the web without manually visiting dozens of websites. Despite being around for over two decades, RSS has seen a significant resurgence in recent years as users seek alternatives to algorithm-driven social media feeds. Building an RSS reader Chrome extension allows you to create a personalized content aggregation tool that puts the power of content discovery back in users' hands.

In this comprehensive tutorial, we will walk through the complete process of building a fully functional RSS reader Chrome extension using Manifest V3. You'll learn how to discover RSS feeds on websites, parse different feed formats, manage subscriptions, and create a clean user interface that makes reading feeds a pleasure.

---

## Why Build an RSS Reader Chrome Extension? {#why-build-rss-reader}

The demand for RSS reader Chrome extension solutions continues to grow for several compelling reasons. First, unlike social media platforms that curate content based on engagement algorithms, RSS provides a chronological, chronological feed that respects user choice. Users maintain complete control over what sources they subscribe to and when they consume that content.

Second, a well-designed RSS reader Chrome extension offers immediate access to content without requiring users to open new tabs or navigate away from their current workflow. The extension can live directly in Chrome's toolbar, providing instant access to subscribed feeds with a single click.

Third, building an RSS reader demonstrates many fundamental Chrome extension development concepts that apply to countless other extension types. You'll work with background service workers, browser storage, DOM manipulation, and Chrome-specific APIs—all essential skills for any extension developer.

---

## Project Architecture Overview {#project-architecture}

Before writing any code, let's establish the architecture for our RSS feed chrome extension. Our extension will consist of several key components working together to deliver a seamless reading experience.

The **manifest file** will define the extension's permissions, popup interface, and background capabilities. We'll use Manifest V3, which is required for all new extensions published to the Chrome Web Store.

The **popup interface** serves as the main user interface, displaying a list of subscribed feeds and recent articles. This is what users interact with when they click the extension icon in Chrome's toolbar.

The **background service worker** handles fetching and caching feed data, ensuring that the extension remains responsive even when processing multiple feeds simultaneously.

The **content script** will be responsible for detecting RSS feeds on web pages, allowing users to easily subscribe to the current page's feed with one click.

---

## Step 1: Creating the Manifest File {#creating-manifest}

Every Chrome extension begins with a manifest.json file. This crucial file tells Chrome about your extension's capabilities, permissions, and structure. Let's create a manifest specifically designed for our RSS reader Chrome extension:

```json
{
  "manifest_version": 3,
  "name": "RSS Feed Reader",
  "version": "1.0.0",
  "description": "Subscribe to any website's RSS feed and read content in a clean, organized interface",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The permissions we include are carefully chosen. The `storage` permission allows us to save users' feed subscriptions persistently. The `activeTab` permission lets us access the current page to detect RSS feeds. The `scripting` permission enables us to inject content scripts that can discover feed URLs on web pages.

The `host_permissions` set to `<all_urls>` is necessary because RSS feeds can exist on any domain. However, when you publish to the Chrome Web Store, you'll need to explain why your extension requires this broad permission.

---

## Step 2: Building the Popup Interface {#popup-interface}

The popup is the face of your RSS reader Chrome extension. It needs to be clean, responsive, and intuitive. Let's create the HTML structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSS Reader</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>RSS Reader</h1>
      <button id="addFeedBtn" class="add-btn">+ Add Feed</button>
    </header>
    
    <div id="feedList" class="feed-list"></div>
    
    <div id="articleList" class="article-list"></div>
    
    <div id="addFeedModal" class="modal hidden">
      <div class="modal-content">
        <h2>Add New Feed</h2>
        <input type="url" id="feedUrl" placeholder="Enter RSS feed URL...">
        <div class="modal-buttons">
          <button id="cancelAdd" class="btn-secondary">Cancel</button>
          <button id="confirmAdd" class="btn-primary">Add Feed</button>
        </div>
      </div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now let's style it with CSS to create a polished appearance:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 380px;
  min-height: 500px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
}

.container {
  padding: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 18px;
  color: #333;
}

.add-btn {
  background: #4285f4;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #3367d6;
}

.feed-list {
  margin-bottom: 16px;
}

.feed-item {
  display: flex;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.feed-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.feed-item.active {
  border-left: 3px solid #4285f4;
}

.article-list {
  max-height: 350px;
  overflow-y: auto;
}

.article-item {
  padding: 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
}

.article-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.article-meta {
  font-size: 12px;
  color: #888;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 300px;
}

.modal-content h2 {
  margin-bottom: 16px;
  font-size: 18px;
}

.modal-content input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 16px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-primary, .btn-secondary {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: #4285f4;
  color: white;
  border: none;
}

.btn-secondary {
  background: #f5f5f5;
  border: 1px solid #ddd;
  color: #333;
}
```

---

## Step 3: Implementing the Background Service Worker {#background-worker}

The background service worker is the engine of your RSS reader Chrome extension. It handles fetching feeds, parsing data, and managing storage. Here's a robust implementation:

```javascript
// background.js

// Cache for storing fetched feeds
const feedCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('RSS Reader extension installed');
  initializeStorage();
});

function initializeStorage() {
  chrome.storage.local.get(['feeds'], (result) => {
    if (!result.feeds) {
      chrome.storage.local.set({ feeds: [] });
    }
  });
}

// Fetch and parse RSS feed
async function fetchFeed(feedUrl) {
  // Check cache first
  const cached = feedCache.get(feedUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(feedUrl);
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    
    const items = Array.from(xml.querySelectorAll('item')).map(item => ({
      title: item.querySelector('title')?.textContent || 'No title',
      link: item.querySelector('link')?.textContent || '',
      description: item.querySelector('description')?.textContent || '',
      pubDate: item.querySelector('pubDate')?.textContent || '',
      content: item.querySelector('content\\:encoded')?.textContent || ''
    }));
    
    const feedTitle = xml.querySelector('channel > title')?.textContent || feedUrl;
    
    const data = {
      title: feedTitle,
      url: feedUrl,
      items: items,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the result
    feedCache.set(feedUrl, {
      data: data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching feed:', error);
    return null;
  }
}

// Add a new feed subscription
async function addFeed(feedUrl) {
  const feed = await fetchFeed(feedUrl);
  if (!feed) {
    throw new Error('Could not fetch feed. Please check the URL.');
  }
  
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['feeds'], (result) => {
      const feeds = result.feeds || [];
      
      // Check if feed already exists
      if (feeds.some(f => f.url === feedUrl)) {
        reject(new Error('Feed already subscribed'));
        return;
      }
      
      feeds.push({
        url: feedUrl,
        title: feed.title,
        addedAt: new Date().toISOString()
      });
      
      chrome.storage.local.set({ feeds }, () => {
        resolve(feed);
      });
    });
  });
}

// Remove a feed subscription
function removeFeed(feedUrl) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['feeds'], (result) => {
      const feeds = result.feeds || [];
      const filtered = feeds.filter(f => f.url !== feedUrl);
      chrome.storage.local.set({ feeds: filtered }, () => {
        resolve();
      });
    });
  });
}

// Get all feeds with their latest items
async function getAllFeedsWithItems() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['feeds'], async (result) => {
      const feeds = result.feeds || [];
      const feedsWithItems = [];
      
      for (const feed of feeds) {
        const feedData = await fetchFeed(feed.url);
        if (feedData) {
          feedsWithItems.push(feedData);
        }
      }
      
      resolve(feedsWithItems);
    });
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'ADD_FEED':
      addFeed(message.url)
        .then(feed => sendResponse({ success: true, feed }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'REMOVE_FEED':
      removeFeed(message.url)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'GET_FEEDS':
      getAllFeedsWithItems()
        .then(feeds => sendResponse({ success: true, feeds }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'DETECT_FEED':
      detectFeedOnPage(message.tabId)
        .then(feedUrl => sendResponse({ success: true, feedUrl }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Detect RSS feed on current page
async function detectFeedOnPage(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: () => {
        // Look for RSS/Atom link tags
        const links = document.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]');
        if (links.length > 0) {
          return links[0].href;
        }
        
        // Look for common feed patterns in the page
        const feedPatterns = [
          /\/feed\/?$/i,
          /\/rss\/?$/i,
          /\/atom\.xml$/i,
          /\/feed\.xml$/i,
          /\/rss\.xml$/i
        ];
        
        const anchors = document.querySelectorAll('a[href]');
        for (const anchor of anchors) {
          for (const pattern of feedPatterns) {
            if (pattern.test(anchor.href)) {
              return anchor.href;
            }
          }
        }
        
        return null;
      }
    });
    
    return results[0]?.result || null;
  } catch (error) {
    console.error('Error detecting feed:', error);
    return null;
  }
}
```

---

## Step 4: Implementing the Popup Logic {#popup-logic}

Now let's connect the popup interface to our background service worker:

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const feedListEl = document.getElementById('feedList');
  const articleListEl = document.getElementById('articleList');
  const addFeedBtn = document.getElementById('addFeedBtn');
  const addFeedModal = document.getElementById('addFeedModal');
  const feedUrlInput = document.getElementById('feedUrl');
  const cancelAddBtn = document.getElementById('cancelAdd');
  const confirmAddBtn = document.getElementById('confirmAdd');
  
  let currentFeeds = [];
  let selectedFeed = null;
  
  // Load feeds on startup
  loadFeeds();
  
  // Modal controls
  addFeedBtn.addEventListener('click', () => {
    addFeedModal.classList.remove('hidden');
    feedUrlInput.focus();
  });
  
  cancelAddBtn.addEventListener('click', () => {
    addFeedModal.classList.add('hidden');
    feedUrlInput.value = '';
  });
  
  confirmAddBtn.addEventListener('click', async () => {
    const url = feedUrlInput.value.trim();
    if (!url) return;
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_FEED',
        url: url
      });
      
      if (response.success) {
        addFeedModal.classList.add('hidden');
        feedUrlInput.value = '';
        await loadFeeds();
      } else {
        alert('Error: ' + response.error);
      }
    } catch (error) {
      alert('Failed to add feed: ' + error.message);
    }
  });
  
  // Load and display feeds
  async function loadFeeds() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_FEEDS' });
      
      if (response.success) {
        currentFeeds = response.feeds;
        renderFeedList();
        
        // If we have feeds, show the first one
        if (currentFeeds.length > 0 && !selectedFeed) {
          selectFeed(currentFeeds[0]);
        }
      }
    } catch (error) {
      console.error('Error loading feeds:', error);
    }
  }
  
  function renderFeedList() {
    feedListEl.innerHTML = currentFeeds.map(feed => `
      <div class="feed-item ${selectedFeed?.url === feed.url ? 'active' : ''}" data-url="${feed.url}">
        <span class="feed-title">${feed.title}</span>
        <span class="feed-count">${feed.items.length}</span>
      </div>
    `).join('');
    
    // Add click handlers
    feedListEl.querySelectorAll('.feed-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        const feed = currentFeeds.find(f => f.url === url);
        selectFeed(feed);
      });
      
      // Add right-click to remove
      item.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        const url = item.dataset.url;
        if (confirm('Remove this feed?')) {
          await chrome.runtime.sendMessage({ type: 'REMOVE_FEED', url });
          await loadFeeds();
        }
      });
    });
  }
  
  function selectFeed(feed) {
    selectedFeed = feed;
    renderFeedList();
    renderArticles(feed);
  }
  
  function renderArticles(feed) {
    articleListEl.innerHTML = feed.items.slice(0, 20).map(item => `
      <div class="article-item">
        <div class="article-title">${escapeHtml(item.title)}</div>
        <div class="article-meta">${formatDate(item.pubDate)}</div>
      </div>
    `).join('');
    
    // Add click handlers to open articles
    articleListEl.querySelectorAll('.article-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        const article = feed.items[index];
        if (article.link) {
          chrome.tabs.create({ url: article.link });
        }
      });
    });
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }
  
  // Detect feed on current page
  detectCurrentPageFeed();
  
  async function detectCurrentPageFeed() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        const response = await chrome.runtime.sendMessage({
          type: 'DETECT_FEED',
          tabId: tabs[0].id
        });
        
        if (response.success && response.feedUrl) {
          // Pre-fill the feed URL input
          feedUrlInput.value = response.feedUrl;
        }
      }
    } catch (error) {
      console.error('Error detecting feed on page:', error);
    }
  }
});
```

---

## Step 5: Testing Your RSS Reader Chrome Extension {#testing-extension}

Before publishing, thoroughly test your RSS reader chrome extension in development mode. Here's how to load your extension in Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your extension's directory
4. The extension icon should appear in your Chrome toolbar

Test various RSS feeds to ensure parsing works correctly. Popular test feeds include:
- BBC News: `http://feeds.bbci.co.uk/news/rss.xml`
- TechCrunch: `https://techcrunch.com/feed/`
- The Verge: `https://www.theverge.com/rss/index.xml`

Your RSS feed chrome extension should handle different feed formats, including RSS 2.0, Atom, and RSS 1.0. The DOMParser API we used in the background worker automatically handles XML parsing across these formats.

---

## Step 6: Publishing to the Chrome Web Store {#publishing}

Once your RSS reader chrome extension is working correctly, you can publish it to reach millions of users. Here's what you need to do:

First, create a developer account at the Chrome Web Store if you don't have one. The registration fee is $5 one-time.

Next, package your extension using the "Pack extension" button in the developer mode, or use the Chrome Web Store Upload API. You'll need to provide:
- A detailed description that naturally incorporates your keywords
- Screenshots of your extension in action
- A promotional tile image
- Privacy policy URL (required for extensions that access data)

When writing your description, naturally include phrases like "chrome extension rss reader" and "rss feed chrome extension" to improve search visibility. The Chrome Web Store uses keywords from your description for search ranking.

---

## Conclusion {#conclusion}

Building an RSS reader Chrome extension is an excellent project that teaches valuable extension development skills while creating a genuinely useful tool. You've learned how to work with Manifest V3, create responsive popup interfaces, implement background service workers for data fetching, and handle RSS feed parsing.

This RSS reader chrome extension provides a foundation that you can extend with additional features like:
- Article read/unread tracking
- Feed categorization and folders
- Keyboard shortcuts for navigation
- OPML import/export for feed subscriptions
- Article search functionality
- Offline reading capabilities

The skills you've developed in this tutorial—working with Chrome APIs, managing persistent storage, creating clean user interfaces, and handling asynchronous data—apply directly to countless other extension types. You're now well-equipped to build more complex Chrome extensions and publish them to the Chrome Web Store.

Remember that the RSS ecosystem continues to evolve, and there's always room for innovation in how users consume web content. Your chrome extension rss reader can stand out through excellent design, performance, and features that truly serve your users' needs.
