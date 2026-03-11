---
layout: post
title: "Build a Performance Monitor Chrome Extension: Complete 2025 Guide"
description: "Learn how to build a performance monitor extension with fps counter chrome, memory monitor extension features, and real-time metrics. This comprehensive tutorial covers Chrome extension development with Manifest V3 for creating powerful performance monitoring tools."
date: 2025-01-22
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "performance monitor extension, fps counter chrome, memory monitor extension, chrome extension performance, build chrome extension tutorial"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/22/build-performance-monitor-chrome-extension/"
---

# Build a Performance Monitor Chrome Extension: Complete 2025 Guide

Creating a performance monitor extension is one of the most useful projects you can undertake as a Chrome extension developer. Whether you're a web developer wanting to track your application's performance, a power user curious about browser metrics, or a developer building tools for other developers, a performance monitor extension provides real-time insights that were previously only available through browser developer tools.

In this comprehensive guide, we'll walk through building a complete performance monitor Chrome extension with fps counter chrome functionality, memory monitoring, and additional metrics like CPU usage and network request tracking. We'll use Manifest V3 (the current standard) and modern JavaScript practices to create a professional-grade extension.

---

## Why Build a Performance Monitor Extension? {#why-build}

The demand for performance monitoring tools in browsers has never been higher. Web applications are becoming increasingly complex, and users expect smooth, lag-free experiences. A performance monitor extension serves multiple purposes:

**For Developers**: Debug performance issues in real-time without switching between developer tools and your application. Monitor frame rates during animations, track memory leaks, and identify bottlenecks before they impact users.

**For Power Users**: Understand what tab or extension is consuming the most resources. Detect memory hogs, monitor CPU usage, and optimize their browsing experience accordingly.

**For QA Engineers**: Reproduce and document performance issues with concrete data. Capture performance metrics during testing cycles.

The Chrome browser provides rich APIs through the chrome.debugger and chrome.performance APIs that make building such an extension possible. Let's dive in and build it step by step.

---

## Prerequisites and Project Setup {#prerequisites}

Before we begin, make sure you have:

- Google Chrome browser (version 89 or later for full API support)
- A code editor (VS Code recommended)
- Basic knowledge of HTML, CSS, and JavaScript
- Node.js installed for package management (optional but recommended)

Let's set up our project structure:

```
performance-monitor/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── background.js
├── content/
│   └── content.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

Create a new folder for your extension and set up the manifest file first.

---

## Creating the Manifest V3 Configuration {#manifest}

The manifest.json file is the heart of every Chrome extension. For our performance monitor extension, we'll request the necessary permissions to access performance metrics:

```json
{
  "manifest_version": 3,
  "name": "Performance Monitor Pro",
  "version": "1.0.0",
  "description": "Real-time performance monitoring with fps counter, memory monitor, and network tracking",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest requests minimal permissions while still allowing us to monitor performance metrics across tabs. The `activeTab` permission ensures we can access the current tab's performance data when the user clicks on our extension icon.

---

## Implementing the FPS Counter Chrome Feature {#fps-counter}

The fps (frames per second) counter is essential for measuring UI smoothness. A smooth user interface typically requires 60 fps, which means each frame has approximately 16.67 milliseconds to render. When fps drops below 30, users typically perceive lag.

Create the content script that will run in the context of web pages:

```javascript
// content/content.js

class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.memoryUsage = 0;
    this.frameTimestamps = [];
    this.isMonitoring = false;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.monitorFrame();
    this.monitorMemory();
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  monitorFrame() {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    this.frameCount++;
    this.frameTimestamps.push(currentTime);

    // Calculate FPS every second
    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;

      // Keep only recent timestamps (last 2 seconds)
      const twoSecondsAgo = currentTime - 2000;
      this.frameTimestamps = this.frameTimestamps.filter(
        ts => ts > twoSecondsAgo
      );

      // Notify background script of updated FPS
      chrome.runtime.sendMessage({
        type: 'FPS_UPDATE',
        fps: this.fps,
        timestamp: currentTime
      });
    }

    requestAnimationFrame(() => this.monitorFrame());
  }

  monitorMemory() {
    if (!this.isMonitoring) return;

    // Use performance.memory API (Chrome specific)
    if (performance.memory) {
      const memory = performance.memory;
      this.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };

      chrome.runtime.sendMessage({
        type: 'MEMORY_UPDATE',
        memory: this.memoryUsage,
        timestamp: performance.now()
      });
    }

    // Update memory every 2 seconds
    setTimeout(() => this.monitorMemory(), 2000);
  }

  getMetrics() {
    return {
      fps: this.fps,
      memory: this.memoryUsage,
      timestamp: performance.now()
    };
  }
}

// Initialize the performance monitor
const perfMonitor = new PerformanceMonitor();

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startMonitoring') {
    perfMonitor.startMonitoring();
    sendResponse({ status: 'started' });
  } else if (message.action === 'stopMonitoring') {
    perfMonitor.stopMonitoring();
    sendResponse({ status: 'stopped' });
  } else if (message.action === 'getMetrics') {
    sendResponse(perfMonitor.getMetrics());
  }
  return true;
});
```

This content script uses the `requestAnimationFrame` API for accurate fps measurement, which is the same method Chrome uses internally for rendering. It also leverages the `performance.memory` API to track JavaScript heap usage.

---

## Building the Memory Monitor Extension Features {#memory-monitor}

Memory monitoring is crucial for detecting memory leaks and understanding how web applications consume resources. Our memory monitor extension feature provides detailed insights:

**Used JS Heap Size**: The total amount of memory being used by JavaScript objects, including strings, arrays, and typed arrays.

**Total JS Heap Size**: The total allocated memory, which may be larger than used size due to memory fragmentation.

**Heap Size Limit**: The maximum amount of memory the browser will allocate before throwing an out-of-memory error.

The memory API returns these values in bytes. For display purposes, we'll want to convert them to more readable formats:

```javascript
// Utility function to format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Enhanced memory monitoring with historical tracking
class MemoryMonitor {
  constructor() {
    this.history = [];
    this.maxHistoryLength = 60; // Keep 60 data points
  }

  recordMemorySample(memoryData) {
    const sample = {
      timestamp: Date.now(),
      used: memoryData.usedJSHeapSize,
      total: memoryData.totalJSHeapSize,
      percentage: memoryData.percentage
    };

    this.history.push(sample);

    // Trim history to max length
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }

    return sample;
  }

  getMemoryTrend() {
    if (this.history.length < 2) return 'stable';

    const recent = this.history.slice(-10);
    const old = recent.slice(0, 5);
    const newSamples = recent.slice(-5);

    const oldAvg = old.reduce((a, b) => a + b.percentage, 0) / old.length;
    const newAvg = newSamples.reduce((a, b) => a + b.percentage, 0) / newSamples.length;

    if (newAvg - oldAvg > 5) return 'increasing';
    if (oldAvg - newAvg > 5) return 'decreasing';
    return 'stable';
  }

  detectPotentialLeak() {
    if (this.history.length < 30) return false;

    // Check if memory consistently increases over 50 samples
    const recentHistory = this.history.slice(-50);
    const firstHalf = recentHistory.slice(0, 25);
    const secondHalf = recentHistory.slice(25);

    const firstAvg = firstHalf.reduce((a, b) => a + b.percentage, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.percentage, 0) / secondHalf.length;

    // If memory increased by more than 20%, might be a leak
    return secondAvg - firstAvg > 20;
  }
}
```

This enhanced memory monitoring class provides trend analysis and potential leak detection, making our extension much more useful for developers debugging memory issues.

---

## Creating the Popup Interface {#popup-interface}

The popup is what users see when they click on the extension icon. It should display all the performance metrics in a clear, readable format:

```html
<!-- popup/popup.html -->
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
      <h1>Performance Monitor</h1>
      <div class="status" id="status">
        <span class="status-dot"></span>
        <span class="status-text">Monitoring</span>
      </div>
    </header>

    <div class="metrics-grid">
      <div class="metric-card fps-card">
        <div class="metric-label">FPS</div>
        <div class="metric-value" id="fps-value">--</div>
        <div class="metric-indicator" id="fps-indicator"></div>
      </div>

      <div class="metric-card memory-card">
        <div class="metric-label">Memory</div>
        <div class="metric-value" id="memory-value">--</div>
        <div class="metric-detail" id="memory-detail">--</div>
      </div>

      <div class="metric-card cpu-card">
        <div class="metric-label">CPU</div>
        <div class="metric-value" id="cpu-value">--</div>
      </div>

      <div class="metric-card network-card">
        <div class="metric-label">Requests</div>
        <div class="metric-value" id="network-value">--</div>
      </div>
    </div>

    <div class="chart-container">
      <canvas id="fpsChart"></canvas>
    </div>

    <div class="actions">
      <button id="toggleBtn" class="btn btn-primary">Pause</button>
      <button id="resetBtn" class="btn btn-secondary">Reset</button>
    </div>

    <footer>
      <a href="#" id="openDashboard">Open Full Dashboard</a>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

Now let's create the CSS styling:

```css
/* popup/popup.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #fff;
  padding: 16px;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
}

.status-dot.inactive {
  background: #ef4444;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric-card {
  background: #16213e;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.metric-label {
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #e0e0e0;
}

.metric-detail {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}

.fps-card .metric-value.good {
  color: #4ade80;
}

.fps-card .metric-value.warning {
  color: #fbbf24;
}

.fps-card .metric-value.bad {
  color: #ef4444;
}

.memory-card .metric-value {
  color: #60a5fa;
}

.cpu-card .metric-value {
  color: #f472b6;
}

.network-card .metric-value {
  color: #a78bfa;
}

.chart-container {
  background: #16213e;
  border-radius: 12px;
  padding: 12px;
  height: 100px;
}

.chart-container canvas {
  width: 100%;
  height: 100%;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #334155;
  color: #94a3b8;
}

.btn-secondary:hover {
  background: #475569;
}

footer {
  text-align: center;
}

footer a {
  color: #64748b;
  font-size: 12px;
  text-decoration: none;
}

footer a:hover {
  color: #94a3b8;
}
```

Now let's implement the popup JavaScript:

```javascript
// popup/popup.js

class PerformancePopup {
  constructor() {
    this.isMonitoring = true;
    this.fpsHistory = [];
    this.maxHistoryLength = 30;
    this.currentTabId = null;
    
    this.init();
  }

  async init() {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTabId = tab.id;

    // Start monitoring
    this.startMonitoring();

    // Set up event listeners
    this.setupEventListeners();

    // Start receiving updates
    this.startReceivingUpdates();
  }

  async startMonitoring() {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTabId },
        func: () => {
          window.perfMonitor = window.perfMonitor || new PerformanceMonitor();
          window.perfMonitor.startMonitoring();
        }
      });
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  }

  setupEventListeners() {
    document.getElementById('toggleBtn').addEventListener('click', () => {
      this.toggleMonitoring();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetMetrics();
    });

    document.getElementById('openDashboard').addEventListener('click', (e) => {
      e.preventDefault();
      this.openDashboard();
    });
  }

  startReceivingUpdates() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FPS_UPDATE') {
        this.updateFPS(message.fps);
      } else if (message.type === 'MEMORY_UPDATE') {
        this.updateMemory(message.memory);
      }
    });
  }

  updateFPS(fps) {
    const fpsValue = document.getElementById('fps-value');
    const fpsIndicator = document.getElementById('fps-indicator');
    
    fpsValue.textContent = fps;
    
    // Update color based on FPS
    fpsValue.className = 'metric-value';
    if (fps >= 55) {
      fpsValue.classList.add('good');
    } else if (fps >= 30) {
      fpsValue.classList.add('warning');
    } else {
      fpsValue.classList.add('bad');
    }

    // Update history for chart
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxHistoryLength) {
      this.fpsHistory.shift();
    }

    this.updateChart();
  }

  updateMemory(memory) {
    const memoryValue = document.getElementById('memory-value');
    const memoryDetail = document.getElementById('memory-detail');

    memoryValue.textContent = `${memory.percentage.toFixed(1)}%`;
    memoryDetail.textContent = `${this.formatBytes(memory.usedJSHeapSize)} / ${this.formatBytes(memory.jsHeapSizeLimit)}`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  updateChart() {
    const canvas = document.getElementById('fpsChart');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, width, height);

    if (this.fpsHistory.length < 2) return;

    const maxFPS = 60;
    const barWidth = width / this.maxHistoryLength;

    ctx.fillStyle = '#3b82f6';
    
    this.fpsHistory.forEach((fps, index) => {
      const barHeight = (fps / maxFPS) * height;
      const x = index * barWidth;
      const y = height - barHeight;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw reference line at 30 FPS
    const warningY = height - (30 / maxFPS) * height;
    ctx.strokeStyle = '#fbbf24';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, warningY);
    ctx.lineTo(width, warningY);
    ctx.stroke();
  }

  async toggleMonitoring() {
    this.isMonitoring = !this.isMonitoring;
    const btn = document.getElementById('toggleBtn');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    if (this.isMonitoring) {
      btn.textContent = 'Pause';
      statusDot.classList.remove('inactive');
      statusText.textContent = 'Monitoring';
      await this.startMonitoring();
    } else {
      btn.textContent = 'Resume';
      statusDot.classList.add('inactive');
      statusText.textContent = 'Paused';
    }
  }

  async resetMetrics() {
    this.fpsHistory = [];
    document.getElementById('fps-value').textContent = '--';
    document.getElementById('memory-value').textContent = '--';
    document.getElementById('memory-detail').textContent = '--';
    this.updateChart();
  }

  openDashboard() {
    chrome.tabs.create({ url: 'dashboard.html' });
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PerformancePopup();
});
```

---

## Background Service Worker {#background-worker}

The background service worker coordinates communication between the content script and the popup:

```javascript
// background/background.js

// Store metrics in memory (could also use chrome.storage)
const metricsCache = {
  fps: 0,
  memory: null,
  lastUpdate: null
};

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FPS_UPDATE') {
    metricsCache.fps = message.fps;
    metricsCache.lastUpdate = message.timestamp;
  } else if (message.type === 'MEMORY_UPDATE') {
    metricsCache.memory = message.memory;
  }
  
  return true;
});

// Handle extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  // The popup will handle the click
});

// Optional: Periodic health check
setInterval(() => {
  if (metricsCache.lastUpdate) {
    const timeSinceUpdate = Date.now() - metricsCache.lastUpdate;
    // If no update for more than 5 seconds, content script might have crashed
    if (timeSinceUpdate > 5000) {
      console.warn('No performance updates received for', timeSinceUpdate, 'ms');
    }
  }
}, 5000);
```

---

## Testing Your Extension {#testing}

Now that we've built all the components, let's test our performance monitor extension:

1. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select your extension folder

2. **Test the FPS counter**:
   - Open any website with animations (try a site like YouTube or a canvas animation demo)
   - Click the extension icon to open the popup
   - You should see real-time FPS updates

3. **Test the memory monitor**:
   - Open multiple tabs and observe memory changes
   - The memory percentage should update every 2 seconds

4. **Test the popup controls**:
   - Click "Pause" to stop monitoring
   - Click "Reset" to clear all metrics
   - Verify the chart updates correctly

---

## Advanced Features to Consider {#advanced-features}

Once you have the basic performance monitor working, consider adding these advanced features:

### Network Request Monitoring

Track network requests using the `chrome.webRequest` API to monitor:
- Number of active requests
- Total data transferred
- Request latency

### Long Task Detection

Use the `PerformanceObserver` API to detect "long tasks" that block the main thread for more than 50ms.

### Custom Metrics Dashboard

Create a full-page dashboard (rather than just a popup) to display:
- Historical charts with date range selection
- Export data to CSV/JSON
- Alert thresholds and notifications

### Battery Impact Monitoring

Use the `navigator.getBattery()` API to track how your extension and the monitored page affect battery life.

---

## Conclusion {#conclusion}

Building a performance monitor extension is an excellent project that teaches you many important concepts in Chrome extension development:

- **Content scripts** for injecting code into web pages
- **Message passing** between different extension components
- **Chrome APIs** for accessing browser performance data
- **Real-time data visualization** in the popup interface
- **Service workers** for background processing

The performance monitor extension you build today can be the foundation for a powerful suite of developer tools. Whether you keep it for personal use or publish it on the Chrome Web Store, understanding how to measure and optimize performance is an invaluable skill for any web developer.

Remember to follow Chrome's best practices:
- Always request minimum permissions
- Respect user privacy
- Test across different websites and use cases
- Keep your extension lightweight and performant

Start with the basic implementation in this guide, then progressively add features as you become more comfortable with the Chrome extension APIs. Happy coding!

---

## Additional Resources {#resources}

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Performance API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- [Chrome Performance Panel Guide](https://developer.chrome.com/docs/devtools/performance/)
- [Manifest V3 Migration Guide](/chrome-extension-guide/docs/manifest-v3-migration/)

