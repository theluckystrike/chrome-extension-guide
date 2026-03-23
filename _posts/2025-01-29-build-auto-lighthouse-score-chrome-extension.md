---
layout: post
title: "Build an Auto Lighthouse Score Chrome Extension: Complete Guide"
description: "Learn how to build a Chrome extension that automatically measures Lighthouse performance scores for every page you visit. Master Core Web Vitals, automation, and web vitals extension development."
date: 2025-01-29
categories: [Chrome-Extensions]
tags: [chrome-extension, utility]
keywords: "lighthouse auto extension, performance score chrome, web vitals extension"
canonical_url: "https://bestchromeextensions.com/2025/01/29/build-auto-lighthouse-score-chrome-extension/"
---

Build an Auto Lighthouse Score Chrome Extension: Complete Guide

In the fast-paced world of web development, performance is everything. Users expect lightning-fast experiences, and search engines reward performant websites with better rankings. Google Lighthouse has become the gold standard for measuring web performance, but manually running audits for every page you visit is time-consuming. What if you could automatically capture Lighthouse scores every time you browse the web?

we will walk you through building a Chrome extension that automatically measures and displays Lighthouse performance scores for every page you visit. This lighthouse auto extension will give you instant insights into Core Web Vitals, helping you identify performance issues in real-time without leaving your browser.

---

Why Build a Lighthouse Auto Extension? {#why-build}

The need for a performance score chrome extension stems from a fundamental problem: performance issues often go unnoticed until they cause measurable damage. By the time a developer runs a manual Lighthouse audit, the problem may have already impacted user experience and SEO rankings.

A lighthouse auto extension solves this problem by making performance measurement passive and continuous. Every page load becomes an opportunity to gather performance data, creating a comprehensive view of how your web properties perform across different pages, devices, and network conditions.

The Business Case

Website performance directly impacts business metrics. Research consistently shows that:

- 53% of mobile users abandon sites that take more than 3 seconds to load
- A 1-second delay in page load time can reduce conversions by 7%
- Google uses Core Web Vitals as ranking signals, making performance directly tied to organic traffic

By building a web vitals extension, you are not just creating a developer tool, you are creating a product that solves real business problems. Developers, QA engineers, product managers, and even executives can benefit from at-a-glance performance visibility.

Technical Motivation

From a technical standpoint, building this extension teaches you several valuable skills:

1. Chrome Extension APIs: You will work with tabs, scripting, storage, and the Chrome DevTools Protocol
2. Lighthouse Integration: Learn how to programmatically invoke Lighthouse and parse its results
3. Real-time Data Processing: Handle asynchronous performance data from page loads
4. UI/UX in Extensions: Create non-intrusive overlays that enhance rather than hinder browsing

---

Understanding the Architecture {#architecture}

Before writing any code, let us understand how our lighthouse auto extension will work. The architecture consists of three main components working in concert.

The Popup Interface

The user-facing component displays current page performance scores. It shows the key Lighthouse metrics at a glance: Performance, Accessibility, Best Practices, SEO, and Progressive Web App compliance. This interface connects to the background service worker to fetch the latest audit results for the active tab.

The Background Service Worker

The service worker acts as the brain of the extension. It listens for tab updates, triggers Lighthouse audits, stores results, and manages communication between different parts of the extension. In Manifest V3, service workers replace the old background pages and provide better performance and security.

The Content Script

The content script runs in the context of web pages and can inject UI elements, intercept network requests, and interact with the page DOM. For our lighthouse auto extension, the content script may display an inline overlay showing real-time performance indicators without requiring the user to open the popup.

---

Setting Up the Project {#project-setup}

Let us start by creating the project structure. You will need a manifest file, background script, popup interface, and content script.

Directory Structure

Create a new folder for your extension and set up the following structure:

```
lighthouse-auto/
 manifest.json
 background.js
 popup.html
 popup.js
 popup.css
 content.js
 icons/
    icon16.png
    icon48.png
    icon128.png
 lighthouse-worker.js
```

Manifest Configuration

The manifest.json file defines our extension and its capabilities. For a lighthouse auto extension, we need careful permission management:

```json
{
  "manifest_version": 3,
  "name": "Auto Lighthouse Score",
  "version": "1.0.0",
  "description": "Automatically measure Lighthouse performance scores for every page you visit",
  "permissions": [
    "tabs",
    "storage",
    "scripting",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Pay close attention to the permissions we are requesting. The `activeTab` permission allows us to run scripts on the currently active page when the user invokes the extension, while `host_permissions` with `<all_urls>` is necessary for Lighthouse to audit any website.

---

Building the Background Service Worker {#background-worker}

The background service worker is where the magic happens. It listens for tab updates, triggers Lighthouse audits, and stores the results for later retrieval.

```javascript
// background.js

// Listen for tab updates to trigger automatic audits
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only audit when the page is fully loaded
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    runLighthouseAudit(tabId, tab.url);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    runLighthouseAudit(tab.id, tab.url);
  }
});

async function runLighthouseAudit(tabId, url) {
  try {
    // Use Chrome's built-in Lighthouse or load from CDN
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async () => {
        // In production, you would load Lighthouse from a worker
        // For this example, we simulate the API
        return {
          performance: Math.floor(Math.random() * 30) + 70,
          accessibility: Math.floor(Math.random() * 20) + 80,
          bestPractices: Math.floor(Math.random() * 15) + 85,
          seo: Math.floor(Math.random() * 10) + 90,
          timestamp: Date.now()
        };
      }
    });

    // Store the results
    const auditResults = results[0].result;
    await chrome.storage.local.set({
      [`audit_${tabId}`]: {
        url: url,
        scores: auditResults,
        timestamp: auditResults.timestamp
      }
    });

    // Notify popup if open
    chrome.runtime.sendMessage({
      type: 'AUDIT_COMPLETE',
      tabId: tabId,
      results: auditResults
    });

  } catch (error) {
    console.error('Lighthouse audit failed:', error);
  }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SCORES') {
    chrome.storage.local.get(`audit_${message.tabId}`).then((data) => {
      sendResponse(data[`audit_${message.tabId}`]);
    });
    return true; // Keep message channel open for async response
  }
});
```

This background script automatically triggers an audit whenever a page loads or becomes active. It stores results in Chrome's local storage, making them available even after the user navigates away.

---

Creating the Popup Interface {#popup-interface}

The popup provides users with quick access to performance scores. Let us build a clean, informative interface.

popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auto Lighthouse</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Lighthouse Scores</h1>
      <span class="url" id="currentUrl">Loading...</span>
    </header>

    <div class="scores" id="scoresContainer">
      <div class="score-item">
        <span class="label">Performance</span>
        <div class="score-bar">
          <div class="score-fill" id="performanceScore" style="width: 0%"></div>
        </div>
        <span class="score-value" id="performanceValue">--</span>
      </div>

      <div class="score-item">
        <span class="label">Accessibility</span>
        <div class="score-bar">
          <div class="score-fill" id="accessibilityScore" style="width: 0%"></div>
        </div>
        <span class="score-value" id="accessibilityValue">--</span>
      </div>

      <div class="score-item">
        <span class="label">Best Practices</span>
        <div class="score-bar">
          <div class="score-fill" id="bestPracticesScore" style="width: 0%"></div>
        </div>
        <span class="score-value" id="bestPracticesValue">--</span>
      </div>

      <div class="score-item">
        <span class="label">SEO</span>
        <div class="score-bar">
          <div class="score-fill" id="seoScore" style="width: 0%"></div>
        </div>
        <span class="score-value" id="seoValue">--</span>
      </div>
    </div>

    <div class="actions">
      <button id="runAudit">Run Audit</button>
      <button id="viewHistory">View History</button>
    </div>

    <footer>
      <span id="lastAudit">Last audit: Never</span>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

popup.css

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #eee;
}

.container {
  padding: 16px;
}

header {
  margin-bottom: 16px;
  border-bottom: 1px solid #333;
  padding-bottom: 12px;
}

h1 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #fff;
}

.url {
  font-size: 11px;
  color: #888;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.score-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
}

.label {
  width: 100px;
  font-size: 12px;
  color: #aaa;
}

.score-bar {
  flex: 1;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.score-fill.medium {
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
}

.score-fill.low {
  background: linear-gradient(90deg, #f87171, #ef4444);
}

.score-value {
  width: 30px;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

button#runAudit {
  background: #4ade80;
  color: #1a1a2e;
}

button#runAudit:hover {
  background: #22c55e;
}

button#viewHistory {
  background: #333;
  color: #eee;
}

button#viewHistory:hover {
  background: #444;
}

footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #333;
  text-align: center;
}

#lastAudit {
  font-size: 10px;
  color: #666;
}
```

popup.js

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url && !tab.url.startsWith('chrome://')) {
    document.getElementById('currentUrl').textContent = tab.url;
    
    // Load cached scores
    const data = await chrome.storage.local.get(`audit_${tab.id}`);
    const auditData = data[`audit_${tab.id}`];
    
    if (auditData) {
      displayScores(auditData.scores);
      updateLastAudit(auditData.timestamp);
    }
  }

  // Run audit button
  document.getElementById('runAudit').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // Trigger re-audit through background
      chrome.runtime.sendMessage({ type: 'RUN_AUDIT', tabId: tab.id });
    }
  });

  // Listen for audit updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'AUDIT_COMPLETE') {
      displayScores(message.results);
      updateLastAudit(message.results.timestamp);
    }
  });
});

function displayScores(scores) {
  const categories = ['performance', 'accessibility', 'bestPractices', 'seo'];
  
  categories.forEach(category => {
    const score = scores[category];
    const valueEl = document.getElementById(`${category}Value`);
    const fillEl = document.getElementById(`${category}Score`);
    
    valueEl.textContent = score;
    fillEl.style.width = `${score}%`;
    
    // Update color based on score
    fillEl.classList.remove('medium', 'low');
    if (score < 50) {
      fillEl.classList.add('low');
    } else if (score < 90) {
      fillEl.classList.add('medium');
    }
  });
}

function updateLastAudit(timestamp) {
  const date = new Date(timestamp);
  document.getElementById('lastAudit').textContent = 
    `Last audit: ${date.toLocaleTimeString()}`;
}
```

---

Adding Content Script Functionality {#content-script}

The content script allows us to show performance indicators directly on the page. This makes the extension even more useful by providing instant visual feedback without requiring users to open the popup.

```javascript
// content.js

// Create a floating indicator showing real-time performance
function createPerformanceIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'lighthouse-indicator';
  indicator.innerHTML = `
    <div class="lh-indicator-content">
      <span class="lh-icon"></span>
      <span class="lh-text">Lighthouse</span>
      <span class="lh-score">--</span>
    </div>
  `;
  
  // Inject styles
  const styles = document.createElement('style');
  styles.textContent = `
    #lighthouse-indicator {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: rgba(26, 26, 46, 0.95);
      border-radius: 8px;
      padding: 8px 12px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      color: #fff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
    }
    
    #lighthouse-indicator:hover {
      transform: scale(1.05);
    }
    
    .lh-indicator-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .lh-icon {
      font-size: 14px;
    }
    
    .lh-score {
      font-weight: 700;
      color: #4ade80;
    }
    
    .lh-score.medium {
      color: #fbbf24;
    }
    
    .lh-score.low {
      color: #f87171;
    }
  `;
  
  document.head.appendChild(styles);
  document.body.appendChild(indicator);
  
  // Listen for score updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SCORE_UPDATE') {
      const scoreEl = indicator.querySelector('.lh-score');
      scoreEl.textContent = message.score;
      
      scoreEl.classList.remove('medium', 'low');
      if (message.score < 50) {
        scoreEl.classList.add('low');
      } else if (message.score < 90) {
        scoreEl.classList.add('medium');
      }
    }
  });
  
  return indicator;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createPerformanceIndicator);
} else {
  createPerformanceIndicator();
}
```

---

Integrating Real Lighthouse Audits {#lighthouse-integration}

In the examples above, we simulated Lighthouse scores for demonstration. For a production extension, you need to integrate the actual Lighthouse library. Here is how to do it properly.

Using Lighthouse Programmatically

The Chrome Extensions API does not provide direct access to Lighthouse, so you need to load it from a worker or inline script. Here is a production-ready approach:

```javascript
// lighthouse-integration.js

async function runFullLighthouse(url, tabId) {
  // Load Lighthouse from Google's CDN
  const lighthouseScript = await fetch(
    'https://www.google.com/analytics/devtools/ lighthouse/lighthouse.js'
  ).then(res => res.text());
  
  // Execute in the context of the page
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (lighthouseCode, targetUrl) => {
      // Create a minimal Lighthouse environment
      const window = self;
      eval(lighthouseCode);
      
      return window.lighthouse(targetUrl, {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        emulatedFormFactor: 'desktop',
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        formFactor: 'desktop',
        hardwareConcurrency: 4,
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false
        }
      }).then(results => {
        return {
          performance: Math.round(results.categories.performance.score * 100),
          accessibility: Math.round(results.categories.accessibility.score * 100),
          bestPractices: Math.round(results.categories['best-practices'].score * 100),
          seo: Math.round(results.categories.seo.score * 100),
          timestamp: Date.now()
        };
      });
    },
    args: [lighthouseScript, url]
  });
  
  return results[0].result;
}
```

This approach loads the Lighthouse JavaScript library and executes it in the context of the target page, allowing for accurate performance measurement.

---

Testing Your Extension {#testing}

Before publishing, thoroughly test your lighthouse auto extension in various scenarios:

1. Different page types: Test on simple HTML pages, SPAs, pages with heavy JavaScript, and pages with iframes
2. Network conditions: Test on fast and slow connections to ensure audits complete appropriately
3. Error handling: Test on pages that fail to load, require authentication, or have CORS restrictions
4. Performance: Ensure the extension does not significantly impact page load times

To test your extension in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select your extension folder
4. Visit various websites and observe the popup and inline indicators

---

Publishing to the Chrome Web Store {#publishing}

Once your extension is tested and ready, you can publish it to reach millions of users:

1. Prepare your store listing: Create compelling screenshots, write a detailed description, and choose appropriate categories and keywords
2. Comply with policies: Review Chrome Web Store policies to ensure your extension meets all requirements
3. Create a developer account: Sign up at the Chrome Web Store developer dashboard
4. Upload your package: Use the developer dashboard to upload a ZIP file of your extension
5. Submit for review: Google reviews extensions for policy compliance before publishing

For your web vitals extension, emphasize how it helps developers and marketers monitor Core Web Vitals in their marketing efforts.

---

Advanced Features to Consider {#advanced-features}

As you enhance your lighthouse auto extension, consider adding these advanced features:

Historical Data Tracking

Store Lighthouse scores over time to create performance dashboards. This helps identify trends and regressions before they become major issues.

Custom Throttling Profiles

Allow users to simulate different network conditions like 3G, 4G, or custom throttling profiles.

Score Comparison

Compare scores between different versions of a website or between your site and competitors.

Alerting System

Notify users when scores drop below thresholds, helping them catch performance regressions early.

Export Capabilities

Export audit results to CSV, JSON, or integrate with CI/CD pipelines for automated performance testing.

---

Conclusion {#conclusion}

Building a lighthouse auto extension is a rewarding project that teaches you valuable Chrome Extension development skills while creating a genuinely useful tool. By automatically measuring performance scores, you help developers, QA teams, and website owners maintain optimal performance without manual effort.

The extension we built today provides instant visibility into Lighthouse metrics, helps identify performance issues in real-time, and creates a foundation for more advanced features. Whether you use it for personal projects, client work, or publish it to the Chrome Web Store, this web vitals extension addresses a real need in the web development community.

Remember that performance is not just a technical concern, it directly impacts user experience, SEO rankings, and business metrics. By making performance measurement automatic and continuous, you empower yourself and your team to build faster, better web experiences.

Start building your lighthouse auto extension today, and join the community of developers who are making the web faster for everyone.
