---
layout: default
title: "Chrome Extension Social Dashboard. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-social-dashboard/"
last_modified_at: 2026-01-15
---
Build a Social Media Dashboard Extension

What You'll Build {#what-youll-build}

In this tutorial, you'll create a Chrome extension that helps users manage their social media consumption. The extension will track time spent on social media sites, block or limit access during focus hours, display usage statistics, and provide motivational content when sites are blocked.

Key Features:
- Track time spent on social media sites (Twitter, Facebook, Reddit, Instagram, TikTok, etc.)
- Block or limit social media during focus hours
- Usage statistics with weekly reports
- Motivational alternatives when sites are blocked
- Notifications at 80% limit and when blocked

Manifest Configuration {#manifest-configuration}

Create your `manifest.json` with the following permissions and configuration:

```json
{
  "name": "Social Media Dashboard",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "storage",
    "alarms",
    "tabs",
    "notifications",
    "idle",
    "declarativeNetRequest"
  ],
  "host_permissions": [
    "*://*.twitter.com/*",
    "*://*.facebook.com/*",
    "*://*.reddit.com/*",
    "*://*.instagram.com/*",
    "*://*.tiktok.com/*"
  ],
  "content_scripts": [{
    "matches": [
      "*://*.twitter.com/*",
      "*://*.facebook.com/*",
      "*://*.reddit.com/*",
      "*://*.instagram.com/*",
      "*://*.tiktok.com/*"
    ],
    "js": ["content.js"],
    "run_at": "document_start"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

Required Permissions:
- `storage` - Save user preferences and usage data
- `alarms` - Schedule focus mode activation
- `tabs` - Monitor active tab changes
- `notifications` - Alert users at 80% limit and when blocked
- `declarativeNetRequest` - Block network requests when limits reached

Step 1: Site Tracking {#step-1-site-tracking}

The foundation of your extension is tracking which social media sites users visit and for how long. Use the Chrome tabs API to detect when users navigate to social media domains.

```javascript
// background.js - Site Tracking
const SOCIAL_DOMAINS = [
  'twitter.com', 'facebook.com', 'reddit.com',
  'instagram.com', 'tiktok.com', 'linkedin.com'
];

let activeTabId = null;
let trackingStartTime = null;

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleTabChange(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tabId === activeTabId) {
    handleTabChange(tabId);
  }
});

async function handleTabChange(tabId) {
  if (activeTabId && trackingStartTime) {
    await saveTrackingData(activeTabId, trackingStartTime);
  }
  
  const tab = await chrome.tabs.get(tabId);
  const url = new URL(tab.url);
  const domain = url.hostname.replace('www.', '');
  
  if (SOCIAL_DOMAINS.some(d => domain.includes(d))) {
    activeTabId = tabId;
    trackingStartTime = Date.now();
  } else {
    activeTabId = null;
    trackingStartTime = null;
  }
}

// Use chrome.idle to pause tracking when user is away
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle') {
    trackingStartTime = null;
  }
});
```

This implementation monitors tab activations and updates to detect when users navigate to social media sites. The `chrome.idle` API pauses tracking when the user is away, ensuring accurate time measurements.

See [guides/content-script-patterns.md](../guides/content-script-patterns.md) for more on communicating between content scripts and the background service worker.

Step 2: Blocking Rules {#step-2-blocking-rules}

Implement daily limits per site using declarativeNetRequest. Users can set custom limits for each platform, and when reached, the extension blocks access.

```javascript
// background.js - Blocking Rules
async function checkAndApplyBlocking() {
  const { siteLimits } = await chrome.storage.local.get('siteLimits');
  const { dailyUsage } = await chrome.storage.local.get('dailyUsage');
  
  const rules = [];
  let ruleId = 1;
  
  for (const [site, limitMinutes] of Object.entries(siteLimits)) {
    const usedMinutes = dailyUsage[site] || 0;
    
    if (usedMinutes >= limitMinutes) {
      rules.push({
        id: ruleId++,
        priority: 1,
        action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
        condition: { urlFilter: `*://*.${site}/*`, resourceTypes: ['main_frame'] }
      });
    }
  }
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
    removeRuleIds: rules.map(r => r.id)
  });
}
```

The blocking system redirects users to a custom blocked page when they exceed their daily limit. Users can click "Add 5 Minutes" for a one-time extension.

See [permissions/declarativeNetRequest.md](../permissions/declarativeNetRequest.md) and [patterns/dynamic-rules.md](../patterns/dynamic-rules.md) for detailed information on dynamic rules.

Step 3: Focus Mode {#step-3-focus-mode}

Schedule focus hours during which all social media sites are blocked. Use chrome.alarms to activate and deactivate focus mode at scheduled times.

```javascript
// background.js - Focus Mode
chrome.alarms.create('focusModeStart', {
  periodInMinutes: 24 * 60,
  when: getNextFocusTime('start')
});

chrome.alarms.create('focusModeEnd', {
  periodInMinutes: 24 * 60,
  when: getNextFocusTime('end')
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusModeStart') {
    enableFocusMode();
  } else if (alarm.name === 'focusModeEnd') {
    disableFocusMode();
  }
});

async function enableFocusMode() {
  const { focusSchedule } = await chrome.storage.local.get('focusSchedule');
  
  const rules = SOCIAL_DOMAINS.map((domain, index) => ({
    id: index + 1000,
    priority: 2,
    action: { type: 'redirect', redirect: { extensionPath: '/focus-mode.html' } },
    condition: { urlFilter: `*://*.${domain}/*`, resourceTypes: ['main_frame'] }
  }));
  
  await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
}

function getNextFocusTime(type) {
  const { focusSchedule } = getFromStorage('focusSchedule');
  const now = new Date();
  const [hours, minutes] = focusSchedule[type].split(':').map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime();
}
```

The focus mode system uses Chrome alarms to automatically enable and disable blocking at scheduled times. The options page should include a calendar-style interface for users to set their focus hours.

See [permissions/alarms.md](../permissions/alarms.md) for more information on scheduling with alarms.

Step 4: Usage Dashboard (Popup) {#step-4-usage-dashboard-popup}

Create a popup that displays today's usage per site with progress bars, weekly usage charts, and comparison with yesterday's usage.

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 320px; padding: 16px; font-family: system-ui; }
    .site-row { margin-bottom: 12px; }
    .site-name { font-weight: 600; margin-bottom: 4px; }
    .progress-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: #4CAF50; transition: width 0.3s; }
    .stats { display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: #666; }
    .weekly-chart { display: flex; gap: 4px; height: 60px; align-items: flex-end; margin-top: 16px; }
    .chart-bar { flex: 1; background: #2196F3; border-radius: 2px; min-height: 4px; }
  </style>
</head>
<body>
  <h2>Today's Usage</h2>
  <div id="siteList"></div>
  <div class="weekly-chart" id="weeklyChart"></div>
  <div id="summary"></div>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
async function loadDashboard() {
  const { dailyUsage } = await chrome.storage.local.get('dailyUsage');
  const { siteLimits } = await chrome.storage.local.get('siteLimits');
  
  const siteList = document.getElementById('siteList');
  
  for (const [site, minutes] of Object.entries(dailyUsage)) {
    const limit = siteLimits[site] || 30;
    const percentage = Math.min((minutes / limit) * 100, 100);
    const color = percentage >= 100 ? '#f44336' : percentage >= 80 ? '#ff9800' : '#4CAF50';
    
    siteList.innerHTML += `
      <div class="site-row">
        <div class="site-name">${site} - ${minutes}/${limit} min</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%; background: ${color}"></div>
        </div>
      </div>
    `;
  }
  
  // Load weekly data and render chart
  const weeklyData = await getWeeklyUsage();
  renderWeeklyChart(weeklyData);
}

loadDashboard();
```

Step 5: Notifications {#step-5-notifications}

Implement notifications to keep users informed about their social media usage throughout the day.

```javascript
// background.js - Notifications
async function checkLimitsAndNotify() {
  const { dailyUsage } = await chrome.storage.local.get('dailyUsage');
  const { siteLimits } = await chrome.storage.local.get('siteLimits');
  
  for (const [site, minutes] of Object.entries(dailyUsage)) {
    const limit = siteLimits[site];
    const percentage = (minutes / limit) * 100;
    
    if (percentage >= 80 && percentage < 100) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Usage Warning',
        message: `You've used ${Math.round(percentage)}% of your ${site} daily limit`
      });
    } else if (percentage >= 100) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Site Blocked',
        message: `You've reached your daily limit for ${site}`
      });
    }
  }
}

// Daily summary at end of day
chrome.alarms.create('dailySummary', { periodInMinutes: 24 * 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailySummary') {
    sendDailySummary();
  }
});
```

Step 6: Motivational Blocking Page {#step-6-motivational-blocking-page}

When a site is blocked, display a motivational page with productive alternatives and a countdown to when access resumes.

```html
<!-- blocked.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Time's Up!</title>
  <style>
    body { 
      font-family: system-ui; 
      text-align: center; 
      padding: 60px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
    }
    h1 { font-size: 48px; margin-bottom: 16px; }
    .alternatives { 
      background: rgba(255,255,255,0.1); 
      border-radius: 12px; 
      padding: 24px;
      margin: 24px 0;
    }
    .alternatives a { color: #fff; margin: 8px; display: block; }
    .countdown { font-size: 24px; margin-top: 24px; }
    .saved-time { font-size: 32px; margin: 24px 0; }
  </style>
</head>
<body>
  <h1> Time's Up!</h1>
  <p>You've reached your daily limit for this site.</p>
  
  <div class="saved-time">
    You've saved 2h 34m this week! 
  </div>
  
  <div class="alternatives">
    <h3>Try Something Productive</h3>
    <a href="https://news.ycombinator.com">Hacker News</a>
    <a href="https://wikipedia.org">Wikipedia</a>
    <a href="https://stackoverflow.com">Stack Overflow</a>
  </div>
  
  <button onclick="addFiveMinutes()">Add 5 More Minutes</button>
  
  <div class="countdown" id="countdown"></div>
  
  <script>
    function addFiveMinutes() {
      chrome.storage.local.get(['temporaryExtension'], (result) => {
        const extensions = result.temporaryExtension || [];
        extensions.push({ time: Date.now() });
        chrome.storage.local.set({ temporaryExtension: extensions });
        history.back();
      });
    }
  </script>
</body>
</html>
```

Summary {#summary}

You've built a comprehensive social media dashboard extension with the following capabilities:

1. Site Tracking - Monitors active time on social media platforms using tabs and idle APIs
2. Blocking Rules - Uses declarativeNetRequest to block sites when daily limits are reached
3. Focus Mode - Scheduled blocking during productive hours using chrome.alarms
4. Usage Dashboard - Visual popup with progress bars and weekly usage charts
5. Notifications - Alerts at 80% usage, when blocked, and daily summaries
6. Motivational Page - Productive alternatives and time saved statistics

This extension demonstrates the power of Chrome's extension APIs for building productivity tools. The combination of background workers, storage, and the declarativeNetRequest API enables sophisticated usage monitoring and control.

Next Steps {#next-steps}

- Add local storage sync across devices using chrome.storage.sync
- Implement machine learning to suggest personalized focus schedules
- Add export functionality for usage data analysis
- Consider adding Pomodoro timer integration

For more details on specific APIs used in this tutorial, check out:
- [permissions/declarativeNetRequest.md](../permissions/declarativeNetRequest.md)
- [patterns/dynamic-rules.md](../patterns/dynamic-rules.md)
- [guides/content-script-patterns.md](../guides/content-script-patterns.md)
- [permissions/alarms.md](../permissions/alarms.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
