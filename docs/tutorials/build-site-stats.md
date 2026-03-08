---
layout: default
title: "Chrome Extension Site Stats — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-site-stats/"
---
# Build a Website Statistics Extension

## Overview
Build an extension that tracks time spent on websites, visit frequency, and generates daily/weekly reports with idle detection and data export.

## Step 1: Manifest
```json
{
  "manifest_version": 3,
  "name": "SiteStats",
  "version": "1.0.0",
  "permissions": ["tabs", "storage", "alarms", "idle"],
  "action": { "default_popup": "popup.html" },
  "options_page": "options.html",
  "background": { "service_worker": "background.js" }
}
```

## Step 2: Background Service Worker - Tab Tracking
```javascript
// background.js - Track active tab changes
let currentTab = null;
let sessionStart = null;

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await saveTimeForCurrentTab();
  currentTab = activeInfo.tabId;
  sessionStart = Date.now();
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await saveTimeForCurrentTab();
    currentTab = null;
  }
});

async function saveTimeForCurrentTab() {
  if (!currentTab || !sessionStart) return;
  
  const tab = await chrome.tabs.get(currentTab);
  if (!tab?.url?.startsWith('http')) return;
  
  const domain = new URL(tab.url).hostname;
  const duration = Date.now() - sessionStart;
  
  await updateSiteStats(domain, duration);
  sessionStart = Date.now();
}
```

## Step 3: Time Tracking Logic
```javascript
// Storage schema for per-domain time accumulation
const STORAGE_KEYS = {
  siteTimes: 'site_times',      // { domain: milliseconds }
  dailyStats: 'daily_stats',    // { date: { domain: milliseconds } }
  blacklist: 'blacklist',       // string[] of domains
  lastUpdated: 'last_updated'
};

async function updateSiteStats(domain, duration) {
  const blacklist = await getBlacklist();
  if (blacklist.includes(domain)) return;
  
  const today = new Date().toISOString().split('T')[0];
  const data = await chrome.storage.local.get([STORAGE_KEYS.siteTimes, STORAGE_KEYS.dailyStats]);
  
  const siteTimes = data[STORAGE_KEYS.siteTimes] || {};
  const dailyStats = data[STORAGE_KEYS.dailyStats] || {};
  
  siteTimes[domain] = (siteTimes[domain] || 0) + duration;
  
  if (!dailyStats[today]) dailyStats[today] = {};
  dailyStats[today][domain] = (dailyStats[today][domain] || 0) + duration;
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.siteTimes]: siteTimes,
    [STORAGE_KEYS.dailyStats]: dailyStats,
    [STORAGE_KEYS.lastUpdated]: Date.now()
  });
}
```

## Step 4: Popup - Today's Top Sites
```html
<!-- popup.html -->
<style>
  .site-row { display: flex; align-items: center; margin: 8px 0; }
  .site-name { width: 120px; overflow: hidden; text-overflow: ellipsis; }
  .progress-bar { flex: 1; height: 8px; background: #e0e0e0; border-radius: 4px; }
  .progress-fill { height: 100%; background: #4CAF50; border-radius: 4px; }
  .time { margin-left: 8px; font-size: 12px; }
</style>
<div id="stats"></div>
<script src="popup.js"></script>
```
```javascript
// popup.js
async function loadTodayStats() {
  const data = await chrome.storage.local.get('daily_stats');
  const today = new Date().toISOString().split('T')[0];
  const todayStats = data.daily_stats?.[today] || {};
  
  const sorted = Object.entries(todayStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const maxTime = sorted[0]?.[1] || 1;
  
  const html = sorted.map(([domain, time]) => {
    const percent = Math.round((time / maxTime) * 100);
    const mins = Math.round(time / 60000);
    return `<div class="site-row">
      <div class="site-name">${domain}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="time">${mins}m</div>
    </div>`;
  }).join('');
  
  document.getElementById('stats').innerHTML = html;
}
loadTodayStats();
```

## Step 5: Weekly Report with CSS Bar Chart
```javascript
// Weekly report in popup or separate page
async function getWeeklyReport() {
  const data = await chrome.storage.local.get('daily_stats');
  const dailyStats = data.daily_stats || {};
  const result = {};
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    const dayData = dailyStats[key] || {};
    result[key] = Object.values(dayData).reduce((a, b) => a + b, 0);
  }
  return result;
}

// CSS-only bar chart
<style>
  .chart { display: flex; align-items: flex-end; height: 100px; gap: 8px; }
  .bar { flex: 1; background: #2196F3; border-radius: 4px 4px 0 0; position: relative; }
  .bar::after { content: attr(data-day); position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 10px; }
</style>
```

## Step 6: Idle Detection
```javascript
// Pause tracking when user is idle
const IDLE_THRESHOLD = 60; // seconds

chrome.idle.setDetectionInterval(IDLE_THRESHOLD);

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === 'idle') {
    await saveTimeForCurrentTab();
    currentTab = null;
    sessionStart = null;
  } else if (state === 'active') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      currentTab = tab.id;
      sessionStart = Date.now();
    }
  }
});
```

## Step 7: Options Page - Blacklist
```html
<!-- options.html -->
<input type="text" id="blacklist" placeholder="domain.com, example.org">
<button id="save">Save Blacklist</button>
<script>
  document.getElementById('save').addEventListener('click', async () => {
    const domains = document.getElementById('blacklist').value
      .split(',').map(d => d.trim()).filter(Boolean);
    await chrome.storage.local.set({ blacklist: domains });
  });
  
  chrome.storage.local.get('blacklist', data => {
    document.getElementById('blacklist').value = data.blacklist?.join(', ') || '';
  });
</script>
```

## Step 8: Data Retention & Cleanup
```javascript
// Auto-cleanup old data (older than 30 days)
chrome.alarms.create('cleanup', { periodInMinutes: 1440 }); // daily

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'cleanup') return;
  
  const data = await chrome.storage.local.get('daily_stats');
  const dailyStats = data.daily_stats || {};
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  
  const cleaned = {};
  for (const [date, stats] of Object.entries(dailyStats)) {
    if (new Date(date) >= cutoff) cleaned[date] = stats;
  }
  
  await chrome.storage.local.set({ daily_stats: cleaned });
});
```

## Step 9: Export Data as CSV
```javascript
async function exportToCSV() {
  const data = await chrome.storage.local.get(['site_times', 'daily_stats']);
  let csv = 'Domain,Total Time (ms),Total Minutes\n';
  
  for (const [domain, time] of Object.entries(data.site_times || {})) {
    csv += `${domain},${time},${Math.round(time / 60000)}\n`;
  }
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sitestats_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}
```

## Cross-References
- [Tabs API](../api-reference/tabs-api.md)
- [Idle Detection Patterns](../patterns/idle-detection.md)
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md)
