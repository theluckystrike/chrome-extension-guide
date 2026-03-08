---
layout: post
title: "Build a Page Speed Analyzer Extension: Complete Chrome Extension Development Guide"
description: "Learn how to build a powerful page speed analyzer extension for Chrome. This comprehensive tutorial covers Web Vitals, performance metrics, Lighthouse integration, and Manifest V3 development patterns."
date: 2025-01-19
categories: [Chrome Extensions, Tutorial]
tags: [chrome-extension, project, tutorial]
keywords: "page speed extension, performance checker chrome, web vitals extension, chrome extension page speed analyzer, website performance tool chrome extension, web vitals checker chrome extension, page performance analyzer extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/19/build-page-speed-analyzer-extension/
---

# Build a Page Speed Analyzer Extension: Complete Chrome Extension Development Guide

Creating a page speed analyzer extension is one of the most valuable projects you can undertake as a Chrome extension developer. In today's fast-paced digital world, website performance directly impacts user experience, search engine rankings, and conversion rates. Users and developers alike are constantly seeking tools that can quickly analyze page performance and provide actionable insights. This comprehensive guide will walk you through the process of building a fully functional page speed extension using modern Chrome extension development techniques, focusing on Web Vitals measurement, performance metrics analysis, and user-friendly visualization.

The demand for page speed analysis tools has skyrocketed since Google announced that Core Web Vitals would become ranking factors. This means there's never been a better time to build a page speed extension that helps users understand how their websites perform across multiple dimensions of user experience. Whether you're building this extension for personal use, to distribute to others, or as a portfolio project, this tutorial will provide you with all the knowledge you need to create a professional-grade tool.

Throughout this guide, we'll cover everything from setting up your development environment to implementing advanced features like real-time performance monitoring and detailed metric breakdowns. We'll use Manifest V3, the latest version of the Chrome extension platform, and leverage powerful APIs like the Performance Observer API to measure real-world user experiences. By the end of this tutorial, you'll have a complete, working extension that you can customize and extend according to your needs.

---

## Understanding Page Speed Analysis Fundamentals {#understanding-page-speed-fundamentals}

Before diving into code, it's essential to understand what we mean by "page speed" and how modern web performance measurement works. Page speed isn't just about how quickly a page loads—it's a multifaceted concept that encompasses multiple metrics, each measuring different aspects of the user experience. Understanding these metrics is crucial because they'll form the foundation of your extension's functionality.

### Core Web Vitals Explained

Core Web Vitals are Google's set of standardized metrics that measure real-world user experience for loading performance, interactivity, and visual stability. These metrics have become the industry standard for measuring page speed and are directly related to search engine rankings. Your page speed extension will primarily focus on measuring these three vital metrics.

**Largest Contentful Paint (LCP)** measures loading performance. Specifically, it measures when the largest content element in the viewport becomes visible. For a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading. Elements that typically constitute the largest contentful paint include hero images, large text blocks, or video posters. Understanding LCP helps developers identify issues with server response times, resource load times, and render-blocking resources.

**First Input Delay (FID)** measures interactivity. It records the time between when a user first interacts with a page (clicking a link, tapping a button, or using a custom control) and when the browser is actually able to begin processing that interaction. A good FID score is less than 100 milliseconds. High FID values typically indicate that the main thread is blocked by JavaScript execution, preventing the browser from responding to user inputs.

**Cumulative Layout Shift (CLS)** measures visual stability. It quantifies how much the page's content shifts unexpectedly during loading. A good CLS score is less than 0.1. Layout shifts occur when visible elements change their position between frames, which can be frustrating for users who are trying to interact with page content. Common causes include images without dimensions, ads injected dynamically, and late-loading fonts.

Beyond Core Web Vitals, there are numerous other performance metrics that provide valuable insights into page performance. First Contentful Paint (FCP) measures when the first piece of content is rendered, Time to First Byte (TTFB) measures server responsiveness, and Total Blocking Time (TBT) measures the total amount of time between First Contentful Paint and when the page is fully interactive. Your extension should consider displaying these additional metrics to provide comprehensive performance analysis.

---

## Setting Up Your Chrome Extension Project {#setting-up-chrome-extension-project}

Now that you understand the fundamentals, let's set up the project structure for your page speed analyzer extension. We'll use Manifest V3, which is the current standard for Chrome extensions and offers improved security and performance compared to older versions.

### Creating the Project Structure

Create a new directory for your extension and set up the basic files. Your project structure should include a manifest file, background service worker, popup HTML and JavaScript, and content scripts. Let's organize this structure thoughtfully to ensure maintainability and scalability.

```bash
mkdir page-speed-analyzer
cd page-speed-analyzer
mkdir -p popup images
```

The manifest.json file is the heart of your Chrome extension. It tells Chrome about your extension's permissions, files, and capabilities. For a page speed analyzer, we'll need permissions to access active tabs and potentially inject content scripts. Here's a comprehensive manifest configuration:

```json
{
  "manifest_version": 3,
  "name": "Page Speed Analyzer",
  "version": "1.0.0",
  "description": "Analyze page performance with Core Web Vitals and performance metrics",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
}
```

This manifest grants your extension the necessary permissions to analyze the currently active tab. The "activeTab" permission ensures users must explicitly invoke your extension on a specific tab, maintaining user privacy. The "scripting" permission allows you to inject content scripts that can measure performance metrics directly in the page context.

### Creating Simple Icon Placeholders

For development purposes, you can create simple placeholder icons. Later, you can replace these with professionally designed graphics. Create PNG files in your images directory, or you can use any image editing tool to generate basic icons in the required sizes (16x16, 48x48, and 128x128 pixels).

---

## Implementing the Performance Analysis Engine {#implementing-performance-analysis-engine}

The core of your page speed extension is the performance analysis logic. This is where you'll measure Web Vitals and other performance metrics. We'll implement this logic in a content script that runs in the context of the analyzed webpage.

### Creating the Performance Measurement Script

Create a file called `performance-measure.js` in your project directory. This script will use the Performance Observer API to measure Web Vitals and other important metrics. The Performance Observer API is the modern way to collect performance data in the browser, and it provides accurate, real-world measurements.

```javascript
// performance-measure.js - Content script for measuring page performance

(function() {
  // Store for all collected metrics
  const metrics = {
    webVitals: {},
    timing: {},
    resourceTiming: []
  };

  // Helper function to send metrics to the extension
  function sendMetrics() {
    window.postMessage({
      type: 'PAGE_SPEED_ANALYZER_METRICS',
      payload: metrics
    }, '*');
  }

  // Observe Largest Contentful Paint (LCP)
  function observeLCP() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.webVitals.lcp = {
          value: lastEntry.renderTime || lastEntry.loadTime,
          rating: lastEntry.renderTime <= 2500 ? 'good' : 
                  lastEntry.renderTime <= 4000 ? 'needs-improvement' : 'poor'
        };
        sendMetrics();
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.log('LCP observation not supported');
    }
  }

  // Observe First Input Delay (FID)
  function observeFID() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const firstEntry = list.getEntries()[0];
        if (firstEntry) {
          metrics.webVitals.fid = {
            value: firstEntry.processingStart - firstEntry.startTime,
            rating: firstEntry.processingStart - firstEntry.startTime <= 100 ? 'good' :
                    firstEntry.processingStart - firstEntry.startTime <= 300 ? 'needs-improvement' : 'poor'
          };
          sendMetrics();
        }
      });
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.log('FID observation not supported');
    }
  }

  // Observe Cumulative Layout Shift (CLS)
  function observeCLS() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    let clsValue = 0;
    let clsEntries = [];

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsEntries.push(entry);
            clsValue += entry.value;
          }
        }
        metrics.webVitals.cls = {
          value: clsValue,
          rating: clsValue <= 0.1 ? 'good' :
                  clsValue <= 0.25 ? 'needs-improvement' : 'poor'
        };
        sendMetrics();
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.log('CLS observation not supported');
    }
  }

  // Get Navigation Timing metrics
  function getNavigationTiming() {
    if (!window.performance || !window.performance.timing) {
      return;
    }

    const timing = window.performance.timing;
    const navigation = window.performance.getEntriesByType('navigation')[0];

    metrics.timing = {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      domComplete: timing.domComplete - timing.navigationStart,
      firstPaint: timing.responseStart - timing.navigationStart,
      firstContentfulPaint: timing.domContentLoadedEventEnd - timing.navigationStart,
      timeToFirstByte: timing.responseStart - timing.navigationStart,
      resourceLoadTime: 0
    };

    // Calculate resource timing
    const resources = window.performance.getEntriesByType('resource');
    metrics.resourceTiming = resources.slice(0, 10).map(resource => ({
      name: resource.name,
      type: resource.initiatorType,
      duration: resource.duration,
      size: resource.transferSize
    }));

    sendMetrics();
  }

  // Get paint timing metrics
  function getPaintTiming() {
    const paintEntries = window.performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        metrics.timing.firstContentfulPaint = entry.startTime;
      } else if (entry.name === 'first-paint') {
        metrics.timing.firstPaint = entry.startTime;
      }
    });
    sendMetrics();
  }

  // Initialize all observers and measurements
  function init() {
    observeLCP();
    observeFID();
    observeCLS();
    
    // Wait for page to fully load before getting timing metrics
    if (document.readyState === 'complete') {
      setTimeout(() => {
        getNavigationTiming();
        getPaintTiming();
      }, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => {
          getNavigationTiming();
          getPaintTiming();
        }, 1000);
      });
    }
  }

  // Start measurement
  init();
})();
```

This content script is the core of your performance measurement system. It uses Performance Observer to watch for Core Web Vitals events in real-time, measures navigation timing metrics, and collects resource timing data. The script sends all collected metrics back to the extension via window.postMessage, which the popup can then listen for and display.

### Implementing the Background Service Worker

The background service worker acts as the coordinator between your content script and the popup. It handles the communication between different parts of your extension and manages the extension's state. Create `background.js` in your project root:

```javascript
// background.js - Service worker for Page Speed Analyzer

// Store the latest metrics for each tab
const tabMetrics = {};

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_TAB') {
    // Inject content script to analyze the tab
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      files: ['performance-measure.js']
    }, (results) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'METRICS_UPDATE') {
    // Store metrics for this tab
    tabMetrics[sender.tab.id] = message.metrics;
    // Forward to popup if needed
    sendResponse({ success: true });
  }

  if (message.type === 'GET_TAB_METRICS') {
    sendResponse(tabMetrics[message.tabId] || null);
  }
});

// Clean up metrics when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabMetrics[tabId];
});
```

This background service worker listens for messages from both the content script (which sends metrics) and the popup (which requests analysis). It stores metrics per tab and handles cleanup when tabs are closed, preventing memory leaks.

---

## Building the User Interface {#building-the-user-interface}

The popup is what users interact with when they click your extension icon. It should be clean, informative, and easy to understand at a glance. Let's create a well-designed popup interface.

### Creating the Popup HTML

Create `popup/popup.html` with a professional layout:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Speed Analyzer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Page Speed Analyzer</h1>
      <p class="url" id="currentUrl">Loading...</p>
    </header>

    <div class="analyze-section">
      <button id="analyzeBtn" class="primary-btn">
        <span class="btn-text">Analyze Page Speed</span>
        <span class="btn-loading" style="display: none;">Analyzing...</span>
      </button>
    </div>

    <div id="results" class="results-section" style="display: none;">
      <div class="overall-score" id="overallScore">
        <div class="score-circle">
          <span id="scoreValue">--</span>
        </div>
        <p class="score-label">Overall Score</p>
      </div>

      <div class="metrics-grid">
        <div class="metric-card" id="lcpCard">
          <h3>LCP</h3>
          <p class="metric-label">Largest Contentful Paint</p>
          <p class="metric-value" id="lcpValue">--</p>
          <p class="metric-rating" id="lcpRating">--</p>
        </div>

        <div class="metric-card" id="fidCard">
          <h3>FID</h3>
          <p class="metric-label">First Input Delay</p>
          <p class="metric-value" id="fidValue">--</p>
          <p class="metric-rating" id="fidRating">--</p>
        </div>

        <div class="metric-card" id="clsCard">
          <h3>CLS</h3>
          <p class="metric-label">Cumulative Layout Shift</p>
          <p class="metric-value" id="clsValue">--</p>
          <p class="metric-rating" id="clsRating">--</p>
        </div>
      </div>

      <div class="timing-section">
        <h2>Timing Details</h2>
        <div class="timing-grid">
          <div class="timing-item">
            <span class="timing-label">First Contentful Paint</span>
            <span class="timing-value" id="fcpValue">--</span>
          </div>
          <div class="timing-item">
            <span class="timing-label">Time to First Byte</span>
            <span class="timing-value" id="ttfbValue">--</span>
          </div>
          <div class="timing-item">
            <span class="timing-label">DOM Complete</span>
            <span class="timing-value" id="domCompleteValue">--</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <button id="analyzeAgainBtn" class="secondary-btn">Analyze Again</button>
      </div>
    </div>

    <div id="error" class="error-section" style="display: none;">
      <p id="errorMessage"></p>
      <button id="retryBtn" class="secondary-btn">Try Again</button>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### Creating the Popup Styles

Create `popup/popup.css` with a modern, clean design:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 360px;
  min-height: 400px;
  background: #ffffff;
  color: #333;
}

.container {
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
  margin-bottom: 5px;
}

.url {
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

.analyze-section {
  text-align: center;
  margin-bottom: 20px;
}

.primary-btn {
  background: #1a73e8;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}

.primary-btn:hover {
  background: #1557b0;
}

.primary-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.results-section {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.overall-score {
  text-align: center;
  margin-bottom: 20px;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
  border: 4px solid #ddd;
}

.score-circle.good {
  background: #e6f4ea;
  border-color: #34a853;
}

.score-circle.needs-improvement {
  background: #fef7e0;
  border-color: #fbbc04;
}

.score-circle.poor {
  background: #fce8e6;
  border-color: #ea4335;
}

#scoreValue {
  font-size: 28px;
  font-weight: 700;
}

.score-label {
  font-size: 12px;
  color: #666;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.metric-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.metric-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 10px;
  color: #666;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.metric-rating {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
}

.metric-rating.good {
  background: #e6f4ea;
  color: #34a853;
}

.metric-rating.needs-improvement {
  background: #fef7e0;
  color: #b06000;
}

.metric-rating.poor {
  background: #fce8e6;
  color: #ea4335;
}

.timing-section {
  margin-bottom: 20px;
}

.timing-section h2 {
  font-size: 14px;
  margin-bottom: 10px;
}

.timing-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timing-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.timing-label {
  font-size: 12px;
  color: #666;
}

.timing-value {
  font-size: 12px;
  font-weight: 500;
}

.actions {
  text-align: center;
}

.secondary-btn {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #dadce0;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-btn:hover {
  background: #f1f3f4;
}

.error-section {
  text-align: center;
  padding: 20px;
}

.error-section p {
  color: #ea4335;
  margin-bottom: 15px;
  font-size: 14px;
}
```

### Implementing Popup Logic

Create `popup/popup.js` to handle the popup functionality:

```javascript
// popup.js - Popup script for Page Speed Analyzer

document.addEventListener('DOMContentLoaded', async () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const analyzeAgainBtn = document.getElementById('analyzeAgainBtn');
  const retryBtn = document.getElementById('retryBtn');
  const resultsSection = document.getElementById('results');
  const errorSection = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');

  let currentTab = null;

  // Get current tab
  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  // Update URL display
  async function updateUrlDisplay() {
    currentTab = await getCurrentTab();
    if (currentTab && currentTab.url) {
      try {
        const url = new URL(currentTab.url);
        document.getElementById('currentUrl').textContent = url.hostname;
      } catch (e) {
        document.getElementById('currentUrl').textContent = currentTab.url;
      }
    }
  }

  // Analyze the current page
  async function analyzePage() {
    try {
      setLoading(true);
      hideError();

      // Get current tab
      currentTab = await getCurrentTab();
      if (!currentTab || !currentTab.id) {
        throw new Error('No active tab found');
      }

      // Send message to background to analyze
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_TAB',
        tabId: currentTab.id
      });

      if (response && response.error) {
        throw new Error(response.error);
      }

      // Listen for metrics from content script
      window.addEventListener('message', function handleMetrics(event) {
        if (event.data.type === 'PAGE_SPEED_ANALYZER_METRICS') {
          displayResults(event.data.payload);
          window.removeEventListener('message', handleMetrics);
        }
      });

      // Also try to get cached metrics
      setTimeout(async () => {
        try {
          const cachedMetrics = await chrome.runtime.sendMessage({
            type: 'GET_TAB_METRICS',
            tabId: currentTab.id
          });
          if (cachedMetrics) {
            displayResults(cachedMetrics);
          }
        } catch (e) {
          console.log('No cached metrics');
        }
      }, 2000);

    } catch (error) {
      showError(error.message || 'Failed to analyze page');
    } finally {
      setLoading(false);
    }
  }

  // Display the analysis results
  function displayResults(metrics) {
    if (!metrics || !metrics.webVitals) {
      showError('No metrics received. Try refreshing the page.');
      return;
    }

    const webVitals = metrics.webVitals;
    const timing = metrics.timing || {};

    // Update overall score
    const scores = [];
    if (webVitals.lcp) scores.push(getScoreFromRating(webVitals.lcp.rating));
    if (webVitals.fid) scores.push(getScoreFromRating(webVitals.fid.rating));
    if (webVitals.cls) scores.push(getScoreFromRating(webVitals.cls.rating));
    
    const avgScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    
    updateOverallScore(avgScore, webVitals);

    // Update LCP
    if (webVitals.lcp) {
      document.getElementById('lcpValue').textContent = formatTime(webVitals.lcp.value);
      updateRating('lcpRating', webVitals.lcp.rating);
    }

    // Update FID
    if (webVitals.fid) {
      document.getElementById('fidValue').textContent = formatTime(webVitals.fid.value);
      updateRating('fidRating', webVitals.fid.rating);
    }

    // Update CLS
    if (webVitals.cls) {
      document.getElementById('clsValue').textContent = webVitals.cls.value.toFixed(3);
      updateRating('clsRating', webVitals.cls.rating);
    }

    // Update timing values
    document.getElementById('fcpValue').textContent = timing.firstContentfulPaint 
      ? formatTime(timing.firstContentfulPaint) 
      : '--';
    document.getElementById('ttfbValue').textContent = timing.timeToFirstByte 
      ? formatTime(timing.timeToFirstByte) 
      : '--';
    document.getElementById('domCompleteValue').textContent = timing.domComplete 
      ? formatTime(timing.domComplete) 
      : '--';

    resultsSection.style.display = 'block';
    errorSection.style.display = 'none';
  }

  // Helper functions
  function getScoreFromRating(rating) {
    switch (rating) {
      case 'good': return 90;
      case 'needs-improvement': return 50;
      case 'poor': return 25;
      default: return 50;
    }
  }

  function updateOverallScore(score, webVitals) {
    const scoreValue = document.getElementById('scoreValue');
    const scoreCircle = document.querySelector('.score-circle');
    
    scoreValue.textContent = score;
    
    // Determine worst rating
    const ratings = [
      webVitals.lcp?.rating,
      webVitals.fid?.rating,
      webVitals.cls?.rating
    ].filter(Boolean);
    
    const worstRating = ratings.includes('poor') ? 'poor' : 
                        ratings.includes('needs-improvement') ? 'needs-improvement' : 'good';
    
    scoreCircle.className = 'score-circle ' + worstRating;
  }

  function updateRating(elementId, rating) {
    const element = document.getElementById(elementId);
    element.textContent = rating.replace('-', ' ');
    element.className = 'metric-rating ' + rating;
  }

  function formatTime(ms) {
    if (ms >= 1000) {
      return (ms / 1000).toFixed(2) + 's';
    }
    return Math.round(ms) + 'ms';
  }

  function setLoading(loading) {
    analyzeBtn.disabled = loading;
    analyzeBtn.querySelector('.btn-text').style.display = loading ? 'none' : 'inline';
    analyzeBtn.querySelector('.btn-loading').style.display = loading ? 'inline' : 'none';
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    resultsSection.style.display = 'none';
  }

  function hideError() {
    errorSection.style.display = 'none';
  }

  // Event listeners
  analyzeBtn.addEventListener('click', analyzePage);
  analyzeAgainBtn.addEventListener('click', analyzePage);
  retryBtn.addEventListener('click', analyzePage);

  // Initialize
  await updateUrlDisplay();
});
```

---

## Testing Your Extension {#testing-your-extension}

Now that you've built all the components, it's time to test your extension. Chrome provides easy ways to load unpacked extensions for testing.

### Loading the Extension in Chrome

Open Chrome and navigate to `chrome://extensions/`. Enable "Developer mode" using the toggle in the top-right corner. Click "Load unpacked" and select your extension's directory. Your extension should now appear in the extension toolbar.

Click the extension icon to open the popup. You should see the "Analyze Page Speed" button. Click it to analyze the current page. The extension will inject the content script and measure the page's performance metrics.

### Testing Tips

When testing your page speed extension, consider testing on various types of websites to ensure your extension handles different scenarios correctly. Test on simple static pages, complex web applications, single-page applications, and pages with heavy JavaScript. This will help you identify any edge cases or issues in your implementation.

Pay attention to how quickly metrics appear after clicking the analyze button. If metrics take too long to load, you might need to adjust the timing in your content script or add loading indicators. Also test your extension across different network conditions to see how it handles slow connections.

---

## Advanced Features and Enhancements {#advanced-features-and-enhancements}

Once you have the basic extension working, consider adding these advanced features to make your extension more powerful and useful.

### Lighthouse Integration

Integrate with Google's Lighthouse API to provide more comprehensive performance audits. Lighthouse provides detailed recommendations for improving page performance, accessibility, best practices, and SEO. You can use the Lighthouse CI (Continuous Integration) tool or create a custom integration that runs Lighthouse in the background and presents the results in your popup.

### Historical Tracking

Add the ability to track page performance over time. Store metrics in chrome.storage and allow users to view historical data, compare performance across multiple sessions, and identify trends. This feature is particularly useful for developers who want to monitor the impact of changes on their website's performance.

### Export and Reporting

Implement features that allow users to export performance reports in various formats such as JSON, CSV, or PDF. You could also add email report functionality or integration with third-party monitoring services. This makes your extension more useful for professional workflows and reporting requirements.

### Performance Budgets

Allow users to set performance budgets and receive notifications when pages exceed those thresholds. For example, a user might want to be notified whenever LCP exceeds 2.5 seconds. This feature would require additional permissions and background monitoring but would provide significant value for ongoing performance maintenance.

---

## Best Practices and Optimization {#best-practices-and-optimization}

When building and deploying your page speed extension, follow these best practices to ensure a high-quality product.

### Manifest V3 Compliance

Ensure your extension fully complies with Manifest V3 requirements. This includes using service workers instead of background pages, declaring all permissions explicitly, and following Chrome Web Store policies. Manifest V3 has stricter requirements around remote code execution, so keep all your extension code within the extension package itself.

### Performance Optimization

Your extension should be lightweight and performant itself. Avoid loading unnecessary libraries, minimize the size of your JavaScript files, and use lazy loading where appropriate. Remember that users will judge your page speed extension partly based on how quickly it loads and responds.

### Error Handling

Implement robust error handling throughout your extension. Pages can have various security restrictions, network issues, or other problems that prevent successful analysis. Your extension should gracefully handle these situations and provide helpful error messages to users rather than failing silently or confusingly.

### User Privacy

Be transparent about what data your extension collects and how it uses it. If you're storing metrics or tracking performance over time, make this clear in your extension's description and privacy policy. Use chrome.storage.local for any local data storage rather than sending data to external servers unless explicitly necessary and disclosed.

---

## Conclusion {#conclusion}

Building a page speed analyzer extension is an excellent project that combines practical utility with valuable learning opportunities. You've learned how to measure Core Web Vitals, interact with Chrome's extension APIs, build a clean user interface, and create a complete extension that's ready for testing and deployment.

The extension you built today measures LCP, FID, and CLS—the three Core Web Vitals that Google uses for search ranking. It also captures additional performance metrics that provide deeper insights into page performance. With these measurements, users can quickly assess how well their websites perform and identify areas for improvement.

As you continue development, consider adding more advanced features like Lighthouse integration, historical tracking, and automated reporting. These enhancements can transform your basic extension into a powerful tool that professionals use daily for website performance monitoring and optimization.

Remember that the Chrome extension ecosystem is constantly evolving. Keep your extension up to date with the latest Chrome APIs and best practices. Subscribe to the Chrome for Developers blog to stay informed about changes that might affect your extension. With dedication and continued learning, you can build a truly valuable tool that helps developers create faster, better web experiences.

The skills you've developed through this project—understanding web performance metrics, working with Chrome extension APIs, building responsive user interfaces, and implementing robust error handling—will serve you well in future Chrome extension development endeavors. Good luck with your page speed analyzer extension!
