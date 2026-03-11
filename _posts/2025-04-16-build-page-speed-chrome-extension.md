---
layout: post
title: "Build a Page Speed Analyzer Chrome Extension: Lighthouse Metrics at a Glance"
description: "Learn how to build a page speed analyzer Chrome extension that displays Lighthouse metrics. Step-by-step guide covering Web Vitals, Performance API, and real-time page analysis."
date: 2025-04-16
categories: [Chrome-Extensions, Performance]
tags: [page-speed, lighthouse, chrome-extension]
keywords: "chrome extension page speed, build performance extension, lighthouse chrome extension, page speed analyzer, web vitals chrome extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/16/build-page-speed-chrome-extension/"
---

# Build a Page Speed Analyzer Chrome Extension: Lighthouse Metrics at a Glance

In today's fast-paced digital landscape, website performance has become a critical factor for user experience and search engine rankings. Users expect pages to load instantly, and search engines like Google factor page speed into their ranking algorithms. For developers and website owners, having a convenient way to measure and monitor page speed metrics is invaluable. This comprehensive guide will walk you through building a powerful page speed analyzer Chrome extension that brings Lighthouse metrics directly to your browser.

This extension will not only display Core Web Vitals but also provide actionable insights into how to improve your website's performance. Whether you are a web developer looking to optimize your own sites or a performance enthusiast wanting quick access to page metrics, this project will give you the foundation to build professional-grade performance tools.

---

## Understanding Page Speed Metrics and Core Web Vitals {#understanding-page-speed-metrics}

Before diving into the code, it is essential to understand the metrics we will be measuring and why they matter. Google has established a set of user-centric metrics called Core Web Vitals that measure real-world user experience for loading performance, interactivity, and visual stability.

### The Three Core Web Vitals

**Largest Contentful Paint (LCP)** measures loading performance. Specifically, it marks the time at which the largest text or image element becomes visible within the viewport. To provide a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading. Pages with an LCP of 2.5 seconds or less are considered to have good performance.

**First Input Delay (FID)** measures interactivity. It records the time from when a user first interacts with a page (clicking a link, tapping a button) to the time when the browser is actually able to begin processing event handlers in response to that interaction. Pages should have an FID of 100 milliseconds or less to ensure good interactivity.

**Cumulative Layout Shift (CLS)** measures visual stability. It quantifies how much the page's content shifts unexpectedly during the loading phase. Pages should maintain a CLS of 0.1 or less to provide a good user experience. Unexpected layout shifts frustrate users and can lead to accidental clicks, particularly on mobile devices.

Beyond Core Web Vitals, our extension will also track additional performance metrics such as First Contentful Paint (FCP), Time to First Byte (TTFB), and Total Blocking Time (TBT). These metrics provide a comprehensive view of page performance and help identify specific bottlenecks.

---

## Setting Up the Project Structure {#project-structure}

Every Chrome extension requires a manifest file that describes its configuration, permissions, and components. Let us start by setting up our project structure with the necessary files.

Create a new folder for your extension and add the following files: manifest.json, popup.html, popup.js, popup.css, and a content script for page analysis. This modular structure keeps your code organized and maintainable.

The manifest file serves as the blueprint of your extension. It tells Chrome what the extension does, what permissions it needs, and which files to load. For our page speed analyzer, we will need permissions to access page information and potentially execute scripts on web pages.

```json
{
  "manifest_version": 3,
  "name": "Page Speed Analyzer",
  "version": "1.0",
  "description": "Analyze page speed with Lighthouse metrics and Core Web Vitals",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest uses Manifest V3, the latest version of the Chrome extension platform. It requests permissions for the active tab and scripting capabilities, which we need to inject and execute performance measurement code on web pages.

---

## Building the Popup Interface {#popup-interface}

The popup is what users see when they click the extension icon. It should display the performance metrics in a clear, organized, and visually appealing format. Let us create an intuitive user interface that presents complex data in an easy-to-understand way.

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
    
    <div class="metrics-grid">
      <div class="metric-card" id="lcpCard">
        <h2>LCP</h2>
        <p class="metric-value" id="lcp">--</p>
        <p class="metric-label">Largest Contentful Paint</p>
        <div class="metric-bar"><div class="metric-fill" id="lcpBar"></div></div>
      </div>
      
      <div class="metric-card" id="fidCard">
        <h2>FID</h2>
        <p class="metric-value" id="fid">--</p>
        <p class="metric-label">First Input Delay</p>
        <div class="metric-bar"><div class="metric-fill" id="fidBar"></div></div>
      </div>
      
      <div class="metric-card" id="clsCard">
        <h2>CLS</h2>
        <p class="metric-value" id="cls">--</p>
        <p class="metric-label">Cumulative Layout Shift</p>
        <div class="metric-bar"><div class="metric-fill" id="clsBar"></div></div>
      </div>
      
      <div class="metric-card" id="fcpCard">
        <h2>FCP</h2>
        <p class="metric-value" id="fcp">--</p>
        <p class="metric-label">First Contentful Paint</p>
        <div class="metric-bar"><div class="metric-fill" id="fcpBar"></div></div>
      </div>
      
      <div class="metric-card" id="tbtCard">
        <h2>TBT</h2>
        <p class="metric-value" id="tbt">--</p>
        <p class="metric-label">Total Blocking Time</p>
        <div class="metric-bar"><div class="metric-fill" id="tbtBar"></div></div>
      </div>
      
      <div class="metric-card" id="ttfbCard">
        <h2>TTFB</h2>
        <p class="metric-value" id="ttfb">--</p>
        <p class="metric-label">Time to First Byte</p>
        <div class="metric-bar"><div class="metric-fill" id="ttfbBar"></div></div>
      </div>
    </div>
    
    <div class="score-section">
      <h3>Overall Performance Score</h3>
      <div class="score-circle" id="overallScore">
        <span id="scoreValue">--</span>
      </div>
      <p id="scoreLabel">Click analyze to measure</p>
    </div>
    
    <button id="analyzeBtn" class="analyze-button">Analyze Page</button>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The popup interface is designed with a clean card-based layout that displays each metric prominently. Each metric card includes the metric name, its numeric value, a descriptive label, and a visual progress bar that changes color based on performance thresholds. The overall score circle provides a quick summary of page performance.

---

## Styling the Extension {#styling}

The CSS file styles the popup to create a modern, professional appearance. We use a clean design with color-coded performance indicators that change based on whether metrics meet Google's recommended thresholds.

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 360px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.container {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

h1 {
  font-size: 18px;
  color: #333;
  margin-bottom: 5px;
}

.url {
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.metric-card {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-card h2 {
  font-size: 14px;
  color: #555;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 3px;
}

.metric-label {
  font-size: 10px;
  color: #888;
  margin-bottom: 8px;
}

.metric-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease, background-color 0.5s ease;
}

.score-section {
  text-align: center;
  margin-bottom: 20px;
}

.score-section h3 {
  font-size: 14px;
  color: #555;
  margin-bottom: 10px;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.score-circle span {
  font-size: 28px;
  font-weight: bold;
  color: white;
}

#scoreLabel {
  font-size: 12px;
  color: #888;
}

.analyze-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.analyze-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.analyze-button:active {
  transform: translateY(0);
}

.analyze-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Performance rating colors */
.good .metric-fill,
.good {
  background-color: #00c853;
}

.needs-improvement .metric-fill,
.needs-improvement {
  background-color: #ffd600;
}

.poor .metric-fill,
.poor {
  background-color: #d50000;
}
```

The styling uses a purple gradient theme that gives the extension a modern, distinctive look. The metric bars change color based on performance: green for good, yellow for needs improvement, and red for poor performance. This visual feedback allows users to quickly identify which metrics need attention without reading detailed numbers.

---

## Implementing the Performance Analysis Logic {#analysis-logic}

The JavaScript files handle the core functionality. The popup script manages user interactions and displays results, while the content script runs on the target page to collect performance data. This separation of concerns keeps the code modular and maintainable.

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  
  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Execute the content script to collect performance metrics
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: collectPerformanceMetrics
      });
      
      // Display the results
      if (results && results[0] && results[0].result) {
        displayMetrics(results[0].result);
        document.getElementById('currentUrl').textContent = tab.url;
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Error analyzing page. Make sure you are on a valid web page.');
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze Page';
    }
  });
  
  // Load URL on popup open
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      document.getElementById('currentUrl').textContent = tabs[0].url;
    }
  });
});

function collectPerformanceMetrics() {
  return new Promise((resolve) => {
    // Use Performance API to get timing data
    const timing = performance.timing;
    const navigation = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');
    
    // Calculate basic metrics
    const metrics = {
      // Timing metrics (in milliseconds)
      ttfb: navigation ? navigation.responseStart - navigation.requestStart : timing.responseStart - timing.navigationStart,
      fcp: 0,
      lcp: 0,
      cls: 0,
      fid: 0,
      tbt: 0,
      
      // Additional data
      pageLoadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
    };
    
    // Get FCP from paint entries
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      metrics.fcp = fcpEntry.startTime;
    }
    
    // Get LCP using Performance Observer
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      metrics.lcp = lastEntry.startTime;
    });
    
    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      console.log('LCP not supported');
    }
    
    // Calculate CLS from layout shifts
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          metrics.cls += entry.value;
        }
      }
    });
    
    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.log('CLS not supported');
    }
    
    // Get FID
    const fidObserver = new PerformanceObserver((entryList) => {
      const firstEntry = entryList.getEntries()[0];
      if (firstEntry) {
        metrics.fid = firstEntry.processingStart - firstEntry.startTime;
      }
    });
    
    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      console.log('FID not supported');
    }
    
    // Calculate TBT from long tasks
    const tbtObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration > 50) {
          metrics.tbt += entry.duration - 50;
        }
      }
    });
    
    try {
      tbtObserver.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      console.log('TBT not supported');
    }
    
    // Resolve after giving observers time to collect data
    setTimeout(() => {
      resolve(metrics);
    }, 2000);
  });
}

function displayMetrics(metrics) {
  // Update LCP
  updateMetric('lcp', metrics.lcp, 2500, 'ms', {
    good: 2500,
    needsImprovement: 4000
  });
  
  // Update FID
  updateMetric('fid', metrics.fid, 100, 'ms', {
    good: 100,
    needsImprovement: 300
  });
  
  // Update CLS
  updateMetric('cls', metrics.cls, 0.1, '', {
    good: 0.1,
    needsImprovement: 0.25
  });
  
  // Update FCP
  updateMetric('fcp', metrics.fcp, 1800, 'ms', {
    good: 1800,
    needsImprovement: 3000
  });
  
  // Update TBT
  updateMetric('tbt', metrics.tbt, 200, 'ms', {
    good: 200,
    needsImprovement: 600
  });
  
  // Update TTFB
  updateMetric('ttfb', metrics.ttfb, 800, 'ms', {
    good: 800,
    needsImprovement: 1800
  });
  
  // Calculate overall score
  calculateOverallScore(metrics);
}

function updateMetric(id, value, goodThreshold, unit, thresholds) {
  const element = document.getElementById(id);
  const bar = document.getElementById(`${id}Bar`);
  const card = document.getElementById(`${id}Card`);
  
  if (element && value > 0) {
    element.textContent = value.toFixed(0) + unit;
    
    // Determine rating
    let rating = 'good';
    let percentage = 100;
    
    if (value > thresholds.needsImprovement) {
      rating = 'poor';
      percentage = 0;
    } else if (value > thresholds.good) {
      rating = 'needs-improvement';
      percentage = Math.max(0, 100 - ((value - thresholds.good) / (thresholds.needsImprovement - thresholds.good)) * 100);
    }
    
    // Update bar
    if (bar) {
      bar.style.width = percentage + '%';
      bar.className = 'metric-fill ' + rating;
    }
    
    // Update card border
    if (card) {
      card.className = 'metric-card ' + rating;
    }
  } else if (element) {
    element.textContent = '--';
  }
}

function calculateOverallScore(metrics) {
  let score = 0;
  let total = 0;
  
  // LCP (25% weight)
  if (metrics.lcp > 0) {
    total++;
    if (metrics.lcp < 2500) score += 25;
    else if (metrics.lcp < 4000) score += 15;
  }
  
  // FID (25% weight)
  if (metrics.fid > 0) {
    total++;
    if (metrics.fid < 100) score += 25;
    else if (metrics.fid < 300) score += 15;
  }
  
  // CLS (25% weight)
  if (metrics.cls > 0) {
    total++;
    if (metrics.cls < 0.1) score += 25;
    else if (metrics.cls < 0.25) score += 15;
  }
  
  // Normalize if not all metrics available
  if (total > 0 && total < 3) {
    score = (score / total) * 3;
  }
  
  const scoreValue = document.getElementById('scoreValue');
  const scoreLabel = document.getElementById('scoreLabel');
  const scoreCircle = document.getElementById('overallScore');
  
  if (scoreValue && total > 0) {
    scoreValue.textContent = Math.round(score);
    
    if (score >= 90) {
      scoreLabel.textContent = 'Excellent performance!';
      scoreCircle.style.background = 'linear-gradient(135deg, #00c853 0%, #00e676 100%)';
    } else if (score >= 50) {
      scoreLabel.textContent = 'Needs improvement';
      scoreCircle.style.background = 'linear-gradient(135deg, #ffd600 0%, #ffab00 100%)';
    } else {
      scoreLabel.textContent = 'Poor performance';
      scoreCircle.style.background = 'linear-gradient(135deg, #d50000 0%, #ff1744 100%)';
    }
  } else {
    scoreValue.textContent = '--';
    scoreLabel.textContent = 'Unable to measure';
  }
}
```

This JavaScript implementation demonstrates several key concepts in Chrome extension development. The popup script uses the Chrome Scripting API to inject and execute code in the context of the active tab. The collectPerformanceMetrics function runs directly on the page, giving it access to the browser's Performance API and allowing it to observe various performance metrics in real-time.

The Performance Observer APIs are particularly powerful because they allow us to measure metrics asynchronously as the page loads and as users interact with it. This approach captures real user experiences rather than synthetic benchmark results, providing more accurate and actionable data.

---

## Testing and Debugging Your Extension {#testing-debugging}

Before deploying your extension, thorough testing is essential to ensure it works correctly across different pages and scenarios. Chrome provides developer tools that make testing and debugging extensions straightforward.

To load your extension in Chrome, navigate to chrome://extensions/ and enable Developer Mode. Then click "Load unpacked" and select your extension folder. The extension will appear in your toolbar, ready for testing.

When testing, try different types of websites: simple static pages, complex web applications, single-page apps, and pages with heavy JavaScript. Each type may expose different behaviors in how performance metrics are reported. Also test on different domains to ensure the extension works across various web platforms.

Pay attention to edge cases such as pages that fail to load, pages with very long load times, and pages that use frames or iframes. Your extension should handle these gracefully without crashing or showing incorrect data.

---

## Advanced Features and Enhancements {#advanced-features}

Once you have the basic extension working, consider adding advanced features to make it more powerful and useful. One valuable addition would be historical tracking, storing previous analysis results to compare performance over time.

You could implement a feature that saves metrics to Chrome storage each time you analyze a page, then displays a comparison chart showing how performance has changed. This is particularly useful for developers working on performance optimization projects, as it provides concrete evidence of improvements or regressions.

Another valuable enhancement would be adding recommendations. Instead of just showing metrics, you could provide specific suggestions for improvement based on the collected data. For example, if LCP is poor, suggest optimizing images, using a CDN, or implementing lazy loading.

You might also consider adding support for auditing specific resources. The Performance API provides detailed information about individual resource loads, which could help identify specific assets that are slowing down page load times.

---

## Conclusion {#conclusion}

Building a page speed analyzer Chrome extension is an excellent project that combines practical utility with valuable learning opportunities. Throughout this guide, you have learned how to set up a Chrome extension project, create an intuitive user interface, implement performance measurement using the browser's Performance API, and present the results in a clear, actionable format.

The extension we built measures all three Core Web Vitals plus additional performance metrics, providing a comprehensive view of page performance. The visual indicators make it easy to quickly assess whether a page meets Google's performance standards, while the detailed metrics provide deeper insights for optimization efforts.

This foundation opens up numerous possibilities for expansion. You could add historical tracking, automated testing, integration with CI/CD pipelines, or export functionality. The skills you have developed in this project transfer directly to building other types of Chrome extensions and working with web performance in general.

Remember that web performance is an ongoing concern, not a one-time fix. Encourage users of your extension to test regularly and track performance over time. With this tool, you are well-equipped to help create faster, more performant web experiences for everyone.
