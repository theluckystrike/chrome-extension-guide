---
layout: default
title: "Chrome Extension Email Tracker — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-email-tracker/"
---
# Build an Email Productivity Tracker

Build a Chrome extension that tracks time spent on Gmail, displays daily/weekly statistics with charts, provides a focus mode with configurable time limits, and sends notifications when over time. Uses **@theluckystrike/webext-storage** for persistent data and **chrome.idle** for intelligent pause detection.

## Prerequisites

- Chrome 116+ with Developer Mode enabled
- Node.js 18+ and npm
- Familiarity with Chrome extension basics (manifest, content scripts, service workers)

---

## Step 1: Manifest and Project Setup

```bash
mkdir email-tracker && cd email-tracker
npm init -y
npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging chart.js
```

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Email Productivity Tracker",
  "version": "1.0.0",
  "description": "Track time spent on Gmail, view statistics, and stay focused.",
  "permissions": ["storage", "alarms", "notifications", "tabs", "idle", "downloads"],
  "host_permissions": ["https://mail.google.com/*"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["https://mail.google.com/*"],
    "js": ["content/gmail-detector.js"],
    "run_at": "document_idle"
  }],
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

`storage` persists tracking data across sessions. `tabs` detects Gmail tab switches. `idle` pauses tracking when user is away. `notifications` alerts when over daily limit. See [permissions/tabs.md](../permissions/tabs.md) and [permissions/alarms.md](../permissions/alarms.md).

---

## Step 2: Gmail Detection via Content Script

Create `content/gmail-detector.js` to detect when user is actively reading or composing emails:

```javascript
// content/gmail-detector.js
let isActive = false;

function detectActivity() {
  // Check if on inbox, reading email, or composing
  const url = window.location.href;
  const inboxRegex = /\/inbox/;
  const composeRegex = /\/compose/;
  const readRegex = /\/inbox\/[a-z]+/;
  
  isActive = inboxRegex.test(url) || composeRegex.test(url) || readRegex.test(url);
  
  // Also check for active typing in compose
  const composeBox = document.querySelector('[role="textbox"]');
  if (composeBox && document.hasFocus()) {
    isActive = true;
  }
}

// Listen for URL changes (Gmail uses SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (lastUrl !== location.href) {
    lastUrl = location.href;
    detectActivity();
  }
}).observe(document.body, { childList: true, subtree: true });

// Check periodically for DOM changes
setInterval(detectActivity, 2000);

// Notify background script of activity state
chrome.runtime.sendMessage({ type: 'GMAIL_ACTIVITY', isActive });
```

---

## Step 3: Time Tracking with Tab and Window Events

Create `background.js` to track time using `tabs.onActivated` and `windows.onFocusChanged`:

```javascript
// background.js
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  todayMinutes: 'number',
  weeklyData: 'string',      // JSON: { "2024-01": 120, ... }
  focusLimit: 'number',      // daily limit in minutes
  focusMode: 'string',       // 'on' | 'off'
  lastActiveTime: 'number',
  trackingEnabled: 'boolean'
});
const storage = createStorage(schema, 'local');

let currentGmailTabId = null;
let trackingInterval = null;

async function startTracking() {
  if (trackingInterval) return;
  
  trackingInterval = setInterval(async () => {
    const isIdle = await checkIdleState();
    if (isIdle) return;
    
    const isGmailActive = await checkGmailActive();
    if (isGmailActive) {
      await incrementTodayTime();
    }
  }, 60000); // Track every minute
}

async function checkIdleState() {
  return new Promise((resolve) => {
    chrome.idle.queryState(300, (state) => {
      resolve(state === 'idle');
    });
  });
}

async function checkGmailActive() {
  const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
  for (const tab of tabs) {
    if (tab.active && !tab.mutedInfo?.muted) {
      return true;
    }
  }
  return false;
}

async function incrementTodayTime() {
  const today = new Date().toISOString().split('T')[0];
  const data = await storage.get('todayData') || {};
  
  if (!data[today]) data[today] = 0;
  data[today] += 1;
  
  await storage.set('todayData', data);
  
  // Check focus limit
  const limit = await storage.get('focusLimit') || 60;
  if (data[today] >= limit) {
    await sendLimitNotification(data[today], limit);
  }
}

async function sendLimitNotification(current, limit) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Email Focus Limit Reached',
    message: `You've spent ${current} minutes on email today (limit: ${limit} min). Consider taking a break!`
  });
}

// Listen for tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url?.includes('mail.google.com')) {
    currentGmailTabId = activeInfo.tabId;
    await startTracking();
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus - pause tracking
    clearInterval(trackingInterval);
    trackingInterval = null;
  } else {
    // Window gained focus - resume if Gmail is open
    await startTracking();
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'GMAIL_ACTIVITY') {
    if (message.isActive) {
      startTracking();
    }
  }
});
```

See [patterns/idle-detection.md](../patterns/idle-detection.md) for more idle detection patterns.

---

## Step 4: Statistics Popup with Daily Totals and Weekly Chart

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><link rel="stylesheet" href="popup.css"></head>
<body>
  <div class="container">
    <h1>📧 Email Tracker</h1>
    <div class="today-stats">
      <div class="stat-card">
        <span class="stat-value" id="today-time">0</span>
        <span class="stat-label">minutes today</span>
      </div>
      <div class="stat-card">
        <span class="stat-value" id="session-count">0</span>
        <span class="stat-label">sessions</span>
      </div>
    </div>
    <canvas id="weekly-chart"></canvas>
    <hr>
    <div class="focus-settings">
      <h2>Focus Mode</h2>
      <label>Daily limit: <input type="number" id="limit-input" value="60" min="15" max="480"> min</label>
      <button id="toggle-focus">Enable Focus Mode</button>
    </div>
    <hr>
    <button id="export-btn">Export CSV</button>
    <button id="reset-btn">Reset Today</button>
  </div>
  <script src="popup.js" type="module"></script>
</body>
</html>
```

Create `popup/popup.js`:

```javascript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import Chart from 'chart.js/auto';

const storage = createStorage(defineSchema({
  todayData: 'string',
  focusLimit: 'number',
  focusMode: 'string'
}), 'local');

async function loadStats() {
  const today = new Date().toISOString().split('T')[0];
  const data = JSON.parse(await storage.get('todayData') || '{}');
  
  document.getElementById('today-time').textContent = data[today] || 0;
  await loadWeeklyChart();
}

async function loadWeeklyChart() {
  const data = JSON.parse(await storage.get('todayData') || '{}');
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  
  const values = last7Days.map(date => data[date] || 0);
  
  new Chart(document.getElementById('weekly-chart'), {
    type: 'bar',
    data: {
      labels: last7Days.map(d => d.slice(5)),
      datasets: [{
        label: 'Minutes',
        data: values,
        backgroundColor: '#4285f4'
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

document.getElementById('export-btn').addEventListener('click', async () => {
  const data = JSON.parse(await storage.get('todayData') || '{}');
  const csv = 'Date,Minutes\n' + 
    Object.entries(data).map(([date, mins]) => `${date},${mins}`).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: 'email-tracking.csv' });
});

document.getElementById('reset-btn').addEventListener('click', async () => {
  const today = new Date().toISOString().split('T')[0];
  const data = JSON.parse(await storage.get('todayData') || '{}');
  data[today] = 0;
  await storage.set('todayData', JSON.stringify(data));
  await loadStats();
});

// Initialize
loadStats();
```

---

## Step 5: Focus Mode with Notifications and Daily Limit

Extend `background.js` with focus mode logic:

```javascript
// Focus mode functions
async function enableFocusMode(limitMinutes) {
  await storage.set('focusMode', 'on');
  await storage.set('focusLimit', limitMinutes);
  
  // Schedule daily reset at midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  
  chrome.alarms.create('midnight-reset', {
    when: midnight.getTime(),
    periodInMinutes: 1440
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'midnight-reset') {
    resetDailyStats();
  }
});

async function resetDailyStats() {
  const data = JSON.parse(await storage.get('todayData') || '{}');
  const today = new Date().toISOString().split('T')[0];
  data[today] = 0;
  await storage.set('todayData', JSON.stringify(data));
}

// Listen for focus mode toggle from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_FOCUS') {
    enableFocusMode(message.limit);
    sendResponse({ ok: true });
  }
});
```

---

## Step 6: CSV Export and Data Persistence

The popup already includes CSV export. For additional data management:

```javascript
// In popup.js - export all data
async function exportAllData() {
  const todayData = JSON.parse(await storage.get('todayData') || '{}');
  const weeklyData = JSON.parse(await storage.get('weeklyData') || '{}');
  
  const rows = ['Date,Minutes'];
  Object.entries({...todayData, ...weeklyData})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, mins]) => rows.push(`${date},${mins}`));
  
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url,
    filename: `email-stats-${new Date().toISOString().split('T')[0]}.csv`,
    saveAs: true
  });
}

// Clear old data (older than 90 days)
async function cleanupOldData() {
  const data = JSON.parse(await storage.get('todayData') || '{}');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  
  const cleaned = {};
  for (const [date, mins] of Object.entries(data)) {
    if (new Date(date) >= cutoff) {
      cleaned[date] = mins;
    }
  }
  
  await storage.set('todayData', JSON.stringify(cleaned));
}
```

---

## Summary

This extension tracks email time through:
1. **Content script** detects Gmail activity via URL and DOM
2. **Background service** tracks time using `tabs.onActivated` and `windows.onFocusChanged`
3. **Idle detection** pauses tracking when user is away
4. **Focus mode** enforces daily limits with notifications
5. **Chart.js** visualizes weekly statistics
6. **CSV export** enables data analysis in spreadsheets

For production, add error handling, sync data across devices with [patterns/data-sync.md](../patterns/data-sync.md), and implement proper TypeScript types.
