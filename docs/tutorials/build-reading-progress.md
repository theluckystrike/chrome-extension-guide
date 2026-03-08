---
layout: default
title: "Chrome Extension Reading Progress — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-reading-progress/"
---
# Build a Reading Progress Tracker Extension

This tutorial walks through building a Chrome extension that tracks reading progress, saves position, and displays reading statistics.

## Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create `manifest.json` with the required permissions:

```json
{
  "manifest_version": 3,
  "name": "Reading Progress Tracker",
  "version": "1.0",
  "permissions": ["activeTab", "storage"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html"
  }
}
```

The `activeTab` permission allows access to the current tab, while `storage` enables persisting reading positions and stats.

## Step 2: Content Script Setup {#step-2-content-script-setup}

Create `content.js` to inject the progress bar:

```javascript
// content.js
const progressBar = document.createElement('div');
progressBar.id = 'reading-progress-bar';
progressBar.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  height: 4px;
  background: #4CAF50;
  width: 0%;
  z-index: 999999;
  transition: width 0.1s ease;
`;
document.body.appendChild(progressBar);
```

## Step 3: Scroll Position Tracking {#step-3-scroll-position-tracking}

Calculate reading progress using scroll mathematics:

```javascript
function getScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight;
  const winHeight = window.innerHeight;
  const scrollPercent = scrollTop / (docHeight - winHeight);
  return Math.min(Math.max(scrollPercent, 0), 1);
}
```

For article pages, target the specific content area instead of the entire document:

```javascript
function getArticleContent() {
  const selectors = ['article', '[role="main"]', '.post-content', '.article-body'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return document.documentElement;
}
```

## Step 4: Progress Bar Rendering {#step-4-progress-bar-rendering}

Update the progress bar width based on scroll position:

```javascript
function updateProgressBar() {
  const progress = getScrollProgress();
  progressBar.style.width = `${progress * 100}%`;
  
  // Update badge with percentage
  chrome.runtime.sendMessage({
    type: 'UPDATE_BADGE',
    progress: Math.round(progress * 100)
  });
}
```

## Step 5: Save Position to Storage {#step-5-save-position-to-storage}

Persist reading position keyed by URL:

```javascript
function saveProgress() {
  const progress = getScrollProgress();
  const url = window.location.href;
  
  chrome.storage.local.set({
    [`progress_${url}`]: {
      position: window.scrollY,
      percentage: progress,
      timestamp: Date.now(),
      title: document.title
    }
  });
}
```

## Step 6: Resume Reading Position {#step-6-resume-reading-position}

Restore saved position when revisiting a page:

```javascript
function restoreProgress() {
  const url = window.location.href;
  
  chrome.storage.local.get(`progress_${url}`, (result) => {
    if (result[`progress_${url}`]) {
      const saved = result[`progress_${url}`];
      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        window.scrollTo(0, saved.position);
        updateProgressBar();
      }, 100);
    }
  });
}

// Call on page load
restoreProgress();
```

## Step 7: Reading Statistics {#step-7-reading-statistics}

Track reading time and statistics:

```javascript
let startTime = Date.now();
let isReading = false;

function updateStats() {
  const url = window.location.href;
  const timeSpent = Math.floor((Date.now() - startTime) / 1000);
  
  chrome.storage.local.get('readingStats', (result) => {
    const stats = result.readingStats || {
      totalTime: 0,
      pagesRead: 0,
      streak: 0,
      lastReadDate: null
    };
    
    const today = new Date().toDateString();
    if (stats.lastReadDate !== today) {
      stats.streak = stats.lastReadDate === 
        new Date(Date.now() - 86400000).toDateString() 
        ? stats.streak + 1 : 1;
      stats.lastReadDate = today;
    }
    
    stats.totalTime += timeSpent;
    stats.pagesRead += 1;
    
    chrome.storage.local.set({ readingStats: stats });
  });
}
```

## Step 8: Popup for Reading History {#step-8-popup-for-reading-history}

Create `popup.html` to display reading statistics:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 16px; font-family: system-ui; }
    .stat { margin: 8px 0; }
    .stat-label { color: #666; }
    .stat-value { font-weight: bold; font-size: 18px; }
    h2 { margin-top: 0; }
  </style>
</head>
<body>
  <h2>📚 Reading Stats</h2>
  <div class="stat">
    <div class="stat-label">Total Reading Time</div>
    <div class="stat-value" id="totalTime">0 min</div>
  </div>
  <div class="stat">
    <div class="stat-label">Pages Read</div>
    <div class="stat-value" id="pagesRead">0</div>
  </div>
  <div class="stat">
    <div class="stat-label">Reading Streak</div>
    <div class="stat-value" id="streak">0 days</div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
chrome.storage.local.get('readingStats', (result) => {
  const stats = result.readingStats || { totalTime: 0, pagesRead: 0, streak: 0 };
  document.getElementById('totalTime').textContent = `${Math.floor(stats.totalTime / 60)} min`;
  document.getElementById('pagesRead').textContent = stats.pagesRead;
  document.getElementById('streak').textContent = `${stats.streak} days`;
});
```

## Performance Optimization {#performance-optimization}

Use passive listeners and throttling for smooth performance:

```javascript
// Use passive listener for better scroll performance
window.addEventListener('scroll', () => {
  updateProgressBar();
  saveProgress();
}, { passive: true });

// Or use throttling (see patterns/throttle-debounce-extensions.md)
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

## Badge Updates {#badge-updates}

Update the extension badge to show progress:

```javascript
// background.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_BADGE') {
    chrome.action.setBadgeText({ text: `${message.progress}%` });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  }
});
```

## Auto-Detection {#auto-detection}

Automatically detect article pages vs non-article pages:

```javascript
function isArticlePage() {
  const articleIndicators = [
    'article', 'blog', 'post', 'story', 'news', 'documentation'
  ];
  const url = window.location.href.toLowerCase();
  const bodyClass = document.body.className.toLowerCase();
  
  return articleIndicators.some(ind => 
    url.includes(ind) || bodyClass.includes(ind)
  ) || document.querySelector('article, .article, .post-content');
}
```

## Related Guides {#related-guides}

- [Content Script Patterns](../guides/content-script-patterns.md)
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)
- [Throttle & Debounce Patterns](../patterns/throttle-debounce-extensions.md)
