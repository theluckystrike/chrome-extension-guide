---
layout: post
title: "Build a Site Performance Monitor Chrome Extension: Core Web Vitals Dashboard"
description: "Learn how to build a powerful site performance monitor Chrome extension that tracks Core Web Vitals metrics. This comprehensive guide covers web vitals API, performance monitoring, real-time dashboard creation, and deployment."
date: 2025-04-23
categories: [Chrome-Extensions, Performance]
tags: [web-vitals, performance, chrome-extension]
keywords: "chrome extension performance monitor, core web vitals extension, site speed chrome extension, build performance extension, web vitals dashboard chrome"
canonical_url: "https://bestchromeextensions.com/2025/04/23/build-site-performance-monitor-chrome-extension/"
---

# Build a Site Performance Monitor Chrome Extension: Core Web Vitals Dashboard

Performance monitoring has become an essential part of modern web development. With Google's Core Web Vitals now playing a significant role in search rankings, developers and site owners need reliable tools to measure and track their website's performance metrics. Building a Chrome extension for site performance monitoring gives you a powerful, always-accessible tool that can analyze pages in real-time and provide actionable insights through an intuitive dashboard.

This comprehensive guide walks you through creating a complete Site Performance Monitor Chrome extension that measures all three Core Web Vitals metrics—Largest Contentful Paint (LCP), First Input Delay (FID), and Cumulative Layout Shift (CLS)—along with additional performance metrics. You'll learn how to leverage the web vitals library, create a visually appealing popup dashboard, store historical data, and package everything for distribution.

---

## Understanding Core Web Vitals {#understanding-core-web-vitals}

Before diving into the code, let's establish a solid foundation by understanding what Core Web Vitals are and why they matter for your extension.

### The Three Core Metrics

**Largest Contentful Paint (LCP)** measures loading performance. It marks the point when the largest content element in the viewport becomes visible. For a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading. Elements that typically contribute to LCP include hero images, large text blocks, and featured videos.

**First Input Delay (FID)** measures interactivity. It quantifies the time from when a user first interacts with your page (clicking a button, selecting an input) to when the browser is actually able to respond to that interaction. A good FID score is less than 100 milliseconds. This metric was recently supplemented by Interaction to Next Paint (INP), which provides a more complete picture of page responsiveness over its entire lifetime.

**Cumulative Layout Shift (CLS)** measures visual stability. It quantifies how much the page's content shifts unexpectedly during loading. A good CLS score is less than 0.1. Layout shifts typically occur when resources load asynchronously, dimensions are not reserved for dynamic content, or animations trigger reflows.

### Why Build a Dedicated Extension

While Chrome DevTools provides performance information, a dedicated Chrome extension offers several advantages. You get one-click access without opening DevTools, the ability to store and compare historical measurements, visual dashboards that make trends easy to spot, and custom alerts when metrics exceed thresholds. These benefits make performance monitoring accessible to team members who may not be familiar with DevTools.

---

## Project Setup and Structure {#project-setup}

Let's create the extension project with a clean, organized structure that follows Manifest V3 best practices.

### Directory Structure

Create a new folder for your extension and set up the following structure:

```
site-performance-monitor/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── content.js
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── lib/
    └── web-vitals.js
```

### Manifest Configuration

The manifest.json file defines your extension's capabilities and permissions:

```json
{
  "manifest_version": 3,
  "name": "Site Performance Monitor",
  "version": "1.0.0",
  "description": "Monitor Core Web Vitals and track site performance metrics in real-time",
  "permissions": [
    "activeTab",
    "storage",
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["lib/web-vitals.js", "content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

This configuration grants the extension access to measure performance on any website while keeping permissions minimal and focused. The content script loads the web-vitals library and your measurement code on every page.

---

## Core Web Vitals Measurement {#core-measurement}

The heart of your extension is the code that captures performance metrics. We'll use the web-vitals library, maintained by the Chrome team, which provides reliable, standardized measurements.

### Getting the Web Vitals Library

Download the web-vitals.js library from the official repository or install it via npm:

```bash
npm install web-vitals
```

Place the resulting web-vitals.js file in the lib directory of your extension.

### Content Script for Metrics Collection

Create content.js to capture metrics on each page:

```javascript
// content.js - Runs on every page to collect performance metrics

let metricsData = {
  url: window.location.href,
  timestamp: Date.now(),
  lcp: null,
  fid: null,
  cls: null,
  fcp: null,
  ttfb: null
};

// Listen for metric events from the web-vitals library
function handleMetric(metric) {
  switch (metric.name) {
    case 'LCP':
      metricsData.lcp = metric.value;
      break;
    case 'FID':
      metricsData.fid = metric.value;
      break;
    case 'CLS':
      metricsData.cls = metric.value;
      break;
    case 'FCP':
      metricsData.fcp = metric.value;
      break;
    case 'TTFB':
      metricsData.ttfb = metric.value;
      break;
  }
  
  // Store the latest metric value
  chrome.storage.local.set({ currentMetrics: metricsData });
}

// Report metrics when they become available
if (typeof reportWebVitals === 'function') {
  reportWebVitals(handleMetric);
}

// Also listen for custom events if web-vitals is loaded differently
document.addEventListener('web-vitals-js-ready', () => {
  if (window.webVitals) {
    window.webVitals.onLCP(handleMetric);
    window.webVitals.onFID(handleMetric);
    window.webVitals.onCLS(handleMetric);
  }
});
```

This script captures all major performance metrics as they become available. The metrics are stored in Chrome's local storage, making them accessible to both the popup and the background service worker.

---

## Building the Popup Dashboard {#popup-dashboard}

The popup is what users see when they click your extension icon. We'll create an informative dashboard that displays the current page's metrics with color-coded ratings.

### Popup HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Monitor</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Site Performance Monitor</h1>
      <p class="url-display" id="currentUrl">Loading...</p>
    </header>

    <div class="metrics-grid">
      <div class="metric-card" id="lcpCard">
        <div class="metric-header">
          <span class="metric-name">LCP</span>
          <span class="metric-badge" id="lcpBadge">-</span>
        </div>
        <div class="metric-value" id="lcpValue">-</div>
        <div class="metric-description">Largest Contentful Paint</div>
      </div>

      <div class="metric-card" id="fidCard">
        <div class="metric-header">
          <span class="metric-name">FID</span>
          <span class="metric-badge" id="fidBadge">-</span>
        </div>
        <div class="metric-value" id="fidValue">-</div>
        <div class="metric-description">First Input Delay</div>
      </div>

      <div class="metric-card" id="clsCard">
        <div class="metric-header">
          <span class="metric-name">CLS</span>
          <span class="metric-badge" id="clsBadge">-</span>
        </div>
        <div class="metric-value" id="clsValue">-</div>
        <div class="metric-description">Cumulative Layout Shift</div>
      </div>

      <div class="metric-card" id="fcpCard">
        <div class="metric-header">
          <span class="metric-name">FCP</span>
          <span class="metric-badge" id="fcpBadge">-</span>
        </div>
        <div class="metric-value" id="fcpValue">-</div>
        <div class="metric-description">First Contentful Paint</div>
      </div>
    </div>

    <div class="actions">
      <button id="refreshBtn" class="btn btn-primary">
        <span class="btn-icon">↻</span> Refresh Metrics
      </button>
      <button id="historyBtn" class="btn btn-secondary">
        <span class="btn-icon">📊</span> View History
      </button>
    </div>

    <div class="history-panel" id="historyPanel">
      <h3>Recent Measurements</h3>
      <div id="historyList" class="history-list"></div>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### Styling the Dashboard

Create popup.css to make the dashboard visually appealing and easy to read:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 380px;
  background: #f8f9fa;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #1a73e8;
}

.url-display {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  max-height: 36px;
  overflow: hidden;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-name {
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.metric-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.metric-badge.good { background: #e6f4ea; color: #137333; }
.metric-badge.needs-improvement { background: #fef7e0; color: #b06000; }
.metric-badge.poor { background: #fce8e6; color: #c5221f; }

.metric-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.metric-description {
  font-size: 11px;
  color: #888;
}

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background-color 0.2s ease;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover {
  background: #1557b0;
}

.btn-secondary {
  background: #e8eaed;
  color: #333;
}

.btn-secondary:hover {
  background: #d3d3d3;
}

.history-panel {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.history-panel h3 {
  font-size: 14px;
  margin-bottom: 12px;
  color: #555;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  font-size: 12px;
}

.history-item:last-child {
  border-bottom: none;
}

.history-url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.history-score {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}
```

### Popup JavaScript Logic

Create popup.js to handle the dashboard interactivity:

```javascript
// popup.js - Handles popup UI and interactions

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab to display URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url || 'Unknown';
  
  document.getElementById('currentUrl').textContent = currentUrl;
  
  // Load current metrics
  loadCurrentMetrics();
  
  // Load history
  loadHistory();
  
  // Set up refresh button
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await refreshMetrics(tab.id);
  });
  
  // Toggle history panel
  document.getElementById('historyBtn').addEventListener('click', () => {
    const panel = document.getElementById('historyPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
});

async function loadCurrentMetrics() {
  try {
    const data = await chrome.storage.local.get('currentMetrics');
    const metrics = data.currentMetrics;
    
    if (!metrics) {
      updateMetricDisplay('lcp', null);
      updateMetricDisplay('fid', null);
      updateMetricDisplay('cls', null);
      updateMetricDisplay('fcp', null);
      return;
    }
    
    updateMetricDisplay('lcp', metrics.lcp);
    updateMetricDisplay('fid', metrics.fid);
    updateMetricDisplay('cls', metrics.cls);
    updateMetricDisplay('fcp', metrics.fcp);
    
    // Save to history
    if (metrics.lcp || metrics.fid || metrics.cls) {
      await saveToHistory(metrics);
    }
  } catch (error) {
    console.error('Error loading metrics:', error);
  }
}

function updateMetricDisplay(metric, value) {
  const valueEl = document.getElementById(`${metric}Value`);
  const badgeEl = document.getElementById(`${metric}Badge`);
  const cardEl = document.getElementById(`${metric}Card`);
  
  if (value === null || value === undefined) {
    valueEl.textContent = '-';
    badgeEl.textContent = '-';
    badgeEl.className = 'metric-badge';
    return;
  }
  
  // Format value based on metric type
  let formattedValue;
  let rating;
  
  if (metric === 'cls') {
    formattedValue = value.toFixed(3);
    rating = value < 0.1 ? 'good' : value < 0.25 ? 'needs-improvement' : 'poor';
  } else if (metric === 'lcp' || metric === 'fid' || metric === 'fcp') {
    formattedValue = (value / 1000).toFixed(2) + 's';
    if (metric === 'lcp') {
      rating = value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor';
    } else if (metric === 'fid') {
      rating = value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor';
    } else if (metric === 'fcp') {
      rating = value < 1800 ? 'good' : value < 3000 ? 'needs-improvement' : 'poor';
    }
  }
  
  valueEl.textContent = formattedValue;
  badgeEl.textContent = rating === 'good' ? 'Good' : rating === 'needs-improvement' ? 'Needs Work' : 'Poor';
  badgeEl.className = `metric-badge ${rating}`;
  cardEl.className = `metric-card ${rating}`;
}

async function refreshMetrics(tabId) {
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Measuring...';
  
  try {
    // Inject and run measurement script
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Trigger re-measurement by dispatching an event
        window.dispatchEvent(new Event('measure-web-vitals'));
      }
    });
    
    // Wait a moment for metrics to be collected
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reload metrics
    await loadCurrentMetrics();
  } catch (error) {
    console.error('Error refreshing metrics:', error);
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<span class="btn-icon">↻</span> Refresh Metrics';
  }
}

async function saveToHistory(metrics) {
  try {
    const { history = [] } = await chrome.storage.local.get('history');
    
    const entry = {
      url: metrics.url,
      timestamp: metrics.timestamp,
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: metrics.cls,
      score: calculateOverallScore(metrics)
    };
    
    // Add to beginning, keep last 50 entries
    history.unshift(entry);
    if (history.length > 50) history.pop();
    
    await chrome.storage.local.set({ history });
    loadHistory();
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}

async function loadHistory() {
  try {
    const { history = [] } = await chrome.storage.local.get('history');
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
      historyList.innerHTML = '<p class="no-data">No measurements yet</p>';
      return;
    }
    
    historyList.innerHTML = history.slice(0, 10).map(item => `
      <div class="history-item">
        <span class="history-url">${new URL(item.url).hostname}</span>
        <span class="history-score ${getScoreClass(item.score)}">${item.score}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

function calculateOverallScore(metrics) {
  let score = 0;
  let count = 0;
  
  if (metrics.lcp) {
    score += metrics.lcp < 2500 ? 100 : metrics.lcp < 4000 ? 50 : 0;
    count++;
  }
  
  if (metrics.fid) {
    score += metrics.fid < 100 ? 100 : metrics.fid < 300 ? 50 : 0;
    count++;
  }
  
  if (metrics.cls) {
    score += metrics.cls < 0.1 ? 100 : metrics.cls < 0.25 ? 50 : 0;
    count++;
  }
  
  return count > 0 ? Math.round(score / count) : 0;
}

function getScoreClass(score) {
  if (score >= 90) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}
```

---

## Background Service Worker {#background-worker}

The background service worker handles extension lifecycle events and can perform periodic measurements:

```javascript
// background.js - Service worker for periodic monitoring

chrome.runtime.onInstalled.addListener(() => {
  console.log('Site Performance Monitor extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    currentMetrics: null,
    history: []
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getMetrics') {
    chrome.storage.local.get('currentMetrics').then(data => {
      sendResponse(data.currentMetrics);
    });
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'clearHistory') {
    chrome.storage.local.set({ history: [] }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Optional: Periodic measurement for active tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // The content script will automatically capture metrics
    // This is just for logging purposes
    console.log(`Page loaded: ${tab.url}`);
  }
});
```

---

## Testing Your Extension {#testing}

Before publishing, thoroughly test your extension to ensure it works correctly across different scenarios.

### Loading Unpacked Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked" and select your extension's folder
4. Visit various websites and click the extension icon to see metrics

### Testing Different Page Types

Test your extension on different types of websites:
- Simple static HTML pages
- Single-page applications (SPAs)
- Content-heavy news sites
- E-commerce platforms
- Video streaming sites

Each will produce different metric values and help you verify your extension handles various scenarios correctly.

---

## Extension Icons {#icons}

Create simple icons for your extension. Even basic icons improve professionalism:

- **icon16.png**: 16x16 pixels
- **icon48.png**: 48x48 pixels  
- **icon128.png**: 128x128 pixels

You can create these using any image editor or generate them programmatically. Place them in the icons folder and reference them in your manifest.

---

## Publishing to Chrome Web Store {#publishing}

Once testing is complete, prepare for distribution:

1. Create a developer account at the Chrome Web Store
2. Zip your extension files (excluding development-only files)
3. Upload the zip file through the developer dashboard
4. Add screenshots, descriptions, and category information
5. Submit for review

Your extension will be reviewed for policy compliance before publication.

---

## Advanced Features {#advanced-features}

Consider these enhancements to make your extension more powerful:

**Historical Data Analysis**: Implement charts showing performance trends over time, comparing metrics across multiple measurements.

**Threshold Alerts**: Notify users when metrics exceed defined thresholds, helping catch performance regressions early.

**Export Functionality**: Allow users to export data as CSV or JSON for deeper analysis in external tools.

**Multi-page Testing**: Automatically visit and measure multiple pages of a site to provide comprehensive performance reports.

---

## Conclusion {#conclusion}

Building a Site Performance Monitor Chrome extension is a rewarding project that combines practical utility with technical depth. By leveraging the web-vitals library and Chrome's extension APIs, you create a tool that helps developers and site owners understand and improve their websites' performance.

The Core Web Vitals metrics you now measure—LCP, FID, and CLS—are directly tied to user experience and search engine rankings. Your extension makes these metrics accessible without requiring technical expertise in browser DevTools.

This foundation opens doors to more advanced features like automated testing workflows, team collaboration through cloud sync, and integration with CI/CD pipelines. The Chrome extension platform provides robust capabilities for building professional-grade developer tools.

Start with this core implementation, test thoroughly, and iterate based on user feedback. A well-built performance monitoring extension serves as a valuable resource for the web development community while demonstrating your expertise in Chrome extension development.

---

## Additional Resources {#resources}

- [Web Vitals Library Documentation](https://web.dev/articles/vitals)
- [Chrome Extension Development Overview](/guides/overview/)
- [Chrome Web Store Publishing Guide](https://developer.chrome.com/docs/webstore/publish)
- [Core Web Vitals Explained](https://web.dev/explore/core-web-vitals)
