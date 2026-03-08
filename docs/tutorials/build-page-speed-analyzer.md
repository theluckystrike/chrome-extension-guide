---
layout: default
title: "Chrome Extension Page Speed Analyzer — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Page Speed Analyzer Extension

## What You'll Build
A Chrome extension that analyzes page performance using the Performance API, displays metrics (FCP, LCP, CLS, FID, TTFB), shows resource breakdown, calculates performance scores, tracks history, and provides recommendations.

## Prerequisites
- Performance API (cross-ref `docs/guides/performance.md`)
- Web Navigation API (cross-ref `docs/api-reference/web-navigation-api.md`)
- Performance profiling patterns (cross-ref `docs/patterns/performance-profiling.md`)

## Project Structure
```
page-speed-analyzer/
  manifest.json
  popup/popup.html
  popup/popup.css
  popup/popup.js
  content.js
  background.js
```

## Step 1: Manifest
```json
{
  "manifest_version": 3,
  "name": "Page Speed Analyzer",
  "version": "1.0.0",
  "permissions": ["activeTab", "webNavigation", "storage"],
  "host_permissions": ["<all_urls>"],
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"] }]
}
```

## Step 2: Content Script with Performance API
```javascript
// content.js - Collect performance metrics using Performance API
(function() {
  const metrics = {};
  const timing = performance.timing;
  metrics.ttfb = timing.responseStart - timing.navigationStart;
  metrics.loadTime = timing.loadEventEnd - timing.navigationStart;

  const resources = performance.getEntriesByType('resource');
  metrics.resources = resources.map(r => ({
    name: r.name, type: r.initiatorType, duration: r.duration, size: r.transferSize || 0
  }));

  // PerformanceObserver for real-time metrics
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'paint') metrics[entry.name] = entry.startTime;
    }
  });
  observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

  window.addEventListener('message', (e) => {
    if (e.data.type === 'GET_METRICS') window.postMessage({ type: 'METRICS', metrics }, '*');
  });
})();
```

## Step 3: Background Script with Badge Grades
```javascript
// background.js - Handle badge updates with grades A-F
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYZE_COMPLETE') {
    const score = request.score;
    let grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    const colors = { A: '#00ff00', B: '#88ff00', C: '#ffff00', D: '#ff8800', F: '#ff0000' };
    chrome.action.setBadgeText({ text: grade, tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: colors[grade] });
  }
});
```

## Step 4: Popup HTML
```html
<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="popup.css"></head>
<body>
  <div class="container">
    <h1>Page Speed Analyzer</h1>
    <div class="score-display"><div class="grade" id="grade">-</div><div class="score" id="score">--</div></div>
    <div class="metrics">
      <div><span>FCP:</span> <span id="fcp">--</span></div>
      <div><span>LCP:</span> <span id="lcp">--</span></div>
      <div><span>CLS:</span> <span id="cls">--</span></div>
      <div><span>TTFB:</span> <span id="ttfb">--</span></div>
    </div>
    <canvas id="resourceChart"></canvas>
    <div class="waterfall" id="waterfall"></div>
    <div class="recommendations" id="recommendations"></div>
    <div class="actions"><button id="analyze">Analyze</button><button id="export">Export JSON</button></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

## Step 5: Popup JavaScript
```javascript
// popup.js - Display metrics, charts, score calculation, history, export
import { Chart } from 'chart.js/auto';

document.getElementById('analyze').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: 'GET_METRICS' }, (response) => {
    const m = response.metrics;
    displayMetrics(m); calculateScore(m); showResourceChart(m.resources);
    showWaterfall(m.resources); generateRecommendations(m); saveToHistory(tab.url, m);
  });
});

function displayMetrics(m) {
  document.getElementById('fcp').textContent = (m['first-contentful-paint']||0).toFixed(0)+'ms';
  document.getElementById('lcp').textContent = (m['largest-contentful-paint']||0).toFixed(0)+'ms';
  document.getElementById('ttfb').textContent = m.ttfb+'ms';
  document.getElementById('cls').textContent = (m.cls||0).toFixed(3);
}

function calculateScore(m) {
  const f = Math.max(0, 100 - (m['first-contentful-paint']||0)/50);
  const l = Math.max(0, 100 - (m['largest-contentful-paint']||0)/80);
  const t = Math.max(0, 100 - m.ttfb/20);
  const score = Math.round(f*0.3 + l*0.3 + t*0.4);
  document.getElementById('score').textContent = `Score: ${score}`;
  chrome.runtime.sendMessage({ type: 'ANALYZE_COMPLETE', score });
}

function showResourceChart(resources) {
  const b = { images: 0, scripts: 0, styles: 0, fonts: 0, other: 0 };
  resources.forEach(r => { if(r.type.includes('img')) b.images++; else if(r.type.includes('script')) b.scripts++; else if(r.type.includes('css')) b.styles++; else if(r.type.includes('font')) b.fonts++; else b.other++; });
  new Chart(document.getElementById('resourceChart'), { type: 'pie', data: { labels: Object.keys(b), datasets: [{ data: Object.values(b), backgroundColor: ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff'] }] } });
}

function showWaterfall(resources) {
  const c = document.getElementById('waterfall');
  c.innerHTML = resources.slice(0,10).map(r => `<div style="width:${Math.min(100,r.duration/10)}%;background:#36a2eb;margin:2px 0;padding:2px;font-size:10px">${r.name.substring(0,20)} ${r.duration.toFixed(0)}ms</div>`).join('');
}

function generateRecommendations(m) {
  const recs = [];
  if(m.ttfb>600) recs.push('⚠️ High TTFB - consider CDN');
  if((m['largest-contentful-paint']||0)>2500) recs.push('⚠️ Slow LCP - optimize hero image');
  const slow = m.resources.filter(r=>r.duration>1000);
  if(slow.length) recs.push(`⚠️ ${slow.length} slow resources`);
  const large = m.resources.filter(r=>r.type.includes('img')&&r.size>500000);
  if(large.length) recs.push(`⚠️ ${large.length} large images - lazy load`);
  document.getElementById('recommendations').innerHTML = recs.map(r=>`<p>${r}</p>`).join('');
}

async function saveToHistory(url, m) {
  const h = (await chrome.storage.local.get('history')).history || {};
  h[url] = { date: new Date().toISOString(), score: m.score };
  await chrome.storage.local.set({ history: h });
}

document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(currentMetrics, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'page-speed-report.json'; a.click();
});
```

## Step 6: Popup CSS
```css
body{width:320px;font-family:system-ui;background:#1a1a2e;color:#e0e0e0;padding:12px}
h1{font-size:14px;color:#00ff41;margin-bottom:8px}
.score-display{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.grade{font-size:28px;font-weight:bold;color:#00ff41}
.metrics{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}
.metrics div{background:#0d0d1a;padding:6px;border-radius:4px;display:flex;justify-content:space-between;font-size:12px}
.metrics span:first-child{color:#888}
#resourceChart{height:120px;margin-bottom:12px}
.waterfall{background:#0d0d1a;padding:8px;border-radius:4px;margin-bottom:12px;max-height:100px;overflow-y:auto}
.recommendations{background:#0d0d1a;padding:8px;border-radius:4px;margin-bottom:12px}
.recommendations p{font-size:11px;margin:4px 0}
.actions{display:flex;gap:6px}
button{flex:1;padding:8px;border:1px solid #00ff41;background:transparent;color:#00ff41;border-radius:4px;cursor:pointer}
```

## Summary
This extension uses the Performance API and PerformanceObserver to capture real-time metrics. The popup calculates a weighted performance score and displays a grade (A-F) as a badge. Resource breakdown uses a pie chart, and recommendations identify optimization opportunities. History is stored per URL, and reports can be exported as JSON.
