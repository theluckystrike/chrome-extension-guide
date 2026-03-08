---
layout: default
title: "Chrome Extension Site Blocker — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-site-blocker/"
---
# Build a Site Blocker Chrome Extension

This tutorial guides you through building a powerful site blocker extension using modern Chrome Extension APIs. We'll use **declarativeNetRequest** for efficient blocking, **@theluckystrike/webext-storage** for persistent blocklist storage, **@theluckystrike/webext-messaging** for popup communication, and implement schedule-based blocking with password-protected overrides.

## Prerequisites {#prerequisites}

- Chrome browser (or Chromium-based browser)
- Node.js 18+ installed
- Basic JavaScript/TypeScript knowledge
- Understanding of Chrome Extension architecture

## Project Structure {#project-structure}

```
site-blocker/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── blocked.html
├── options.html
├── options.js
├── types.ts
└── rules.json
```

## 1. Manifest Configuration (manifest.json) {#1-manifest-configuration-manifestjson}

```json
{
  "manifest_version": 3,
  "name": "Site Blocker Pro",
  "version": "1.0.0",
  "description": "Block distracting websites with schedule-based filtering",
  "permissions": [
    "declarativeNetRequest",
    "storage",
    "alarms",
    "notifications",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icon.png"
  },
  "options_page": "options.html",
  "declarative_net_request": {
    "rule_resources": [{
      "id": "main_ruleset",
      "enabled": true,
      "path": "rules.json"
    }]
  },
  "web_accessible_resources": [{
    "resources": ["blocked.html"],
    "matches": ["<all_urls>"]
  }]
}
```

## 2. TypeScript Message Types (types.ts) {#2-typescript-message-types-typests}

Define types for communication between popup, background, and options pages using @theluckystrike/webext-messaging patterns:

```typescript
// Message types for popup-background communication
export interface BlocklistMessage {
  action: 'getBlocklist' | 'addDomain' | 'removeDomain' | 'updateRules';
  domain?: string;
}

export interface BlocklistResponse {
  blocklist: string[];
  rules: any[];
}

// Schedule types
export interface ScheduleConfig {
  enabled: boolean;
  startTime: string; // "HH:MM" format
  endTime: string;
  daysOfWeek: number[]; // 0-6, Sunday = 0
}

// Storage keys
export interface StorageSchema {
  blocklist: string[];
  schedule: ScheduleConfig;
  password: string | null;
  overrideUntil: number | null; // timestamp
  blockedCount: number;
}

// Messaging actions
export type MessageAction = 
  | 'GET_STATE'
  | 'TOGGLE_BLOCKLIST'
  | 'ADD_DOMAIN'
  | 'REMOVE_DOMAIN'
  | 'SET_SCHEDULE'
  | 'SET_PASSWORD'
  | 'TEMP_OVERRIDE'
  | 'GET_STATS';
```

## 3. Service Worker (background.js) {#3-service-worker-backgroundjs}

The background service worker handles rule management, scheduling, and messaging:

```javascript
import { storage } from '@theluckystrike/webext-storage';
import { messaging } from '@theluckystrike/webext-messaging';

const RULESET_ID = 'main_ruleset';

// Initialize extension
async function init() {
  // Set up default storage
  const defaults = {
    blocklist: [],
    schedule: { enabled: false, startTime: '09:00', endTime: '17:00', daysOfWeek: [1,2,3,4,5] },
    password: null,
    overrideUntil: null,
    blockedCount: 0
  };
  
  await storage.init(defaults);
  
  // Set up alarm for schedule checking
  chrome.alarms.create('scheduleCheck', { periodInMinutes: 1 });
  
  // Listen for alarms
  chrome.alarms.onAlarm.addListener(handleAlarm);
  
  // Set up messaging
  messaging.handle('GET_STATE', handleGetState);
  messaging.handle('ADD_DOMAIN', handleAddDomain);
  messaging.handle('REMOVE_DOMAIN', handleRemoveDomain);
  messaging.handle('TEMP_OVERRIDE', handleTempOverride);
  messaging.handle('SET_PASSWORD', handleSetPassword);
  messaging.handle('SET_SCHEDULE', handleSetSchedule);
  
  // Update rules on startup
  await updateBlockingRules();
}

// Handle scheduled checks
async function handleAlarm(alarm) {
  if (alarm.name === 'scheduleCheck') {
    await checkSchedule();
  }
}

// Check if current time is within blocked schedule
async function checkSchedule() {
  const { schedule, overrideUntil } = await storage.get(['schedule', 'overrideUntil']);
  
  // Check for active override
  if (overrideUntil && Date.now() < overrideUntil) {
    return; // Override active
  }
  
  if (!schedule.enabled) {
    await setRulesEnabled(false);
    return;
  }
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  
  const isDayActive = schedule.daysOfWeek.includes(currentDay);
  const isTimeActive = currentTime >= schedule.startTime && currentTime <= schedule.endTime;
  
  await setRulesEnabled(isDayActive && isTimeActive);
}

// Update declarativeNetRequest rules
async function updateBlockingRules() {
  const { blocklist } = await storage.get('blocklist');
  
  const rules = blocklist.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
    condition: {
      urlFilter: `*://${domain}/*`,
      resourceTypes: ['main_frame']
    }
  }));
  
  // Update rules in declarativeNetRequest
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
    removeRuleIds: rules.map(r => r.id)
  });
  
  // Update badge
  await updateBadge(blocklist.length);
}

// Update extension badge with block count
async function updateBadge(count) {
  await chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
  
  // Also update stored count
  await storage.set('blockedCount', count);
}

// Message handlers
async function handleGetState() {
  return await storage.get(['blocklist', 'schedule', 'password', 'overrideUntil']);
}

async function handleAddDomain(message) {
  const { blocklist } = await storage.get('blocklist');
  if (!blocklist.includes(message.domain)) {
    blocklist.push(message.domain);
    await storage.set('blocklist', blocklist);
    await updateBlockingRules();
  }
  return { success: true, blocklist };
}

async function handleRemoveDomain(message) {
  const { blocklist } = await storage.get('blocklist');
  const newList = blocklist.filter(d => d !== message.domain);
  await storage.set('blocklist', newList);
  await updateBlockingRules();
  return { success: true, blocklist: newList };
}

async function handleTempOverride(message) {
  const { password } = await storage.get('password');
  
  // Verify password
  if (password && message.password !== password) {
    return { success: false, error: 'Invalid password' };
  }
  
  // Set override for specified duration (in minutes)
  const duration = message.duration || 30;
  const overrideUntil = Date.now() + (duration * 60 * 1000);
  
  await storage.set('overrideUntil', overrideUntil);
  await setRulesEnabled(false);
  
  // Schedule auto-disable
  setTimeout(async () => {
    await storage.set('overrideUntil', null);
    await checkSchedule();
  }, duration * 60 * 1000);
  
  return { success: true, overrideUntil };
}

async function handleSetPassword(message) {
  await storage.set('password', message.password);
  return { success: true };
}

async function handleSetSchedule(message) {
  await storage.set('schedule', message.schedule);
  await checkSchedule();
  return { success: true };
}

// Helper to enable/disable rules
async function setRulesEnabled(enabled) {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enable: enabled ? [RULESET_ID] : [],
    disable: enabled ? [] : [RULESET_ID]
  });
}

// Initialize on install
chrome.runtime.onInstalled.addListener(init);
```

## 4. Popup HTML (popup/popup.html) {#4-popup-html-popuppopuphtml}

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🚫 Site Blocker</h1>
      <div class="status" id="status">Active</div>
    </header>
    
    <section class="stats">
      <div class="stat-item">
        <span class="stat-value" id="blockCount">0</span>
        <span class="stat-label">Sites Blocked</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" id="scheduleStatus">Off</span>
        <span class="stat-label">Schedule</span>
      </div>
    </section>
    
    <section class="quick-actions">
      <button id="overrideBtn" class="btn btn-warning">Temp Override</button>
    </section>
    
    <section class="add-domain">
      <input type="text" id="domainInput" placeholder="Enter domain (e.g., twitter.com)">
      <button id="addBtn" class="btn btn-primary">Block</button>
    </section>
    
    <section class="blocklist">
      <h3>Blocked Sites</h3>
      <ul id="blocklist"></ul>
    </section>
    
    <footer>
      <a href="options.html" target="_blank">⚙️ Settings</a>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

## 5. Popup JavaScript (popup/popup.js) {#5-popup-javascript-popuppopupjs}

```javascript
import { messaging } from '@theluckystrike/webext-messaging';

// DOM Elements
const domainInput = document.getElementById('domainInput');
const addBtn = document.getElementById('addBtn');
const blocklistEl = document.getElementById('blocklist');
const blockCountEl = document.getElementById('blockCount');
const scheduleStatusEl = document.getElementById('scheduleStatus');
const overrideBtn = document.getElementById('overrideBtn');

// Load initial state
async function loadState() {
  const state = await messaging.send('GET_STATE');
  
  // Update stats
  blockCountEl.textContent = state.blocklist.length;
  scheduleStatusEl.textContent = state.schedule.enabled ? 'On' : 'Off';
  
  // Render blocklist
  renderBlocklist(state.blocklist);
}

// Render blocklist items
function renderBlocklist(blocklist) {
  blocklistEl.innerHTML = '';
  
  blocklist.forEach(domain => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${domain}</span>
      <button class="remove-btn" data-domain="${domain}">×</button>
    `;
    blocklistEl.appendChild(li);
  });
}

// Add domain handler
addBtn.addEventListener('click', async () => {
  const domain = domainInput.value.trim();
  if (!domain) return;
  
  const result = await messaging.send('ADD_DOMAIN', { domain });
  
  if (result.success) {
    renderBlocklist(result.blocklist);
    blockCountEl.textContent = result.blocklist.length;
    domainInput.value = '';
  }
});

// Remove domain handler
blocklistEl.addEventListener('click', async (e) => {
  if (e.target.classList.contains('remove-btn')) {
    const domain = e.target.dataset.domain;
    const result = await messaging.send('REMOVE_DOMAIN', { domain });
    
    if (result.success) {
      renderBlocklist(result.blocklist);
      blockCountEl.textContent = result.blocklist.length;
    }
  }
});

// Temporary override handler
overrideBtn.addEventListener('click', async () => {
  const duration = prompt('Override duration in minutes:', '30');
  if (!duration) return;
  
  const password = prompt('Enter password (if set):');
  const result = await messaging.send('TEMP_OVERRIDE', { 
    duration: parseInt(duration), 
    password: password || '' 
  });
  
  if (result.success) {
    alert(`Override active for ${duration} minutes`);
  } else {
    alert('Invalid password!');
  }
});

// Initialize
loadState();
```

## 6. Blocked Page (blocked.html) {#6-blocked-page-blockedhtml}

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Site Blocked</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; opacity: 0.9; }
    .blocked-time { margin-top: 1rem; font-size: 0.9rem; opacity: 0.7; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚫 Site Blocked</h1>
    <p>This website has been blocked by your Site Blocker extension.</p>
    <p class="blocked-time">Blocked at: <span id="blockedTime"></span></p>
  </div>
  <script>
    document.getElementById('blockedTime').textContent = new Date().toLocaleString();
  </script>
</body>
</html>
```

## 7. Options Page (options.html) {#7-options-page-optionshtml}

```html
<!DOCTYPE html>
<html>
<head>
  <title>Site Blocker Settings</title>
  <style>
    /* Add your preferred styling */
    body { font-family: sans-serif; max-width: 600px; margin: 2rem auto; padding: 1rem; }
    .section { margin-bottom: 2rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; }
    label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
    input, select { padding: 0.5rem; margin-bottom: 1rem; width: 100%; box-sizing: border-box; }
    .btn { padding: 0.75rem 1.5rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .btn:hover { background: #5568d3; }
    .checkbox-group { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
    .checkbox-group label { font-weight: normal; }
  </style>
</head>
<body>
  <h1>⚙️ Site Blocker Settings</h1>
  
  <div class="section">
    <h2>Schedule Blocking</h2>
    <label>
      <input type="checkbox" id="scheduleEnabled"> Enable Schedule
    </label>
    <label>Start Time: <input type="time" id="startTime"></label>
    <label>End Time: <input type="time" id="endTime"></label>
    <label>Active Days:</label>
    <div class="checkbox-group">
      <label><input type="checkbox" class="day-checkbox" value="0"> Sun</label>
      <label><input type="checkbox" class="day-checkbox" value="1"> Mon</label>
      <label><input type="checkbox" class="day-checkbox" value="2"> Tue</label>
      <label><input type="checkbox" class="day-checkbox" value="3"> Wed</label>
      <label><input type="checkbox" class="day-checkbox" value="4"> Thu</label>
      <label><input type="checkbox" class="day-checkbox" value="5"> Fri</label>
      <label><input type="checkbox" class="day-checkbox" value="6"> Sat</label>
    </div>
    <button class="btn" id="saveSchedule">Save Schedule</button>
  </div>
  
  <div class="section">
    <h2>Password Protection</h2>
    <label>Set Override Password: <input type="password" id="password" placeholder="Enter password"></label>
    <button class="btn" id="savePassword">Set Password</button>
  </div>
  
  <script src="options.js"></script>
</body>
</html>
```

## 8. Options JavaScript (options.js) {#8-options-javascript-optionsjs}

```javascript
import { messaging } from '@theluckystrike/webext-messaging';

// Load current settings
async function loadSettings() {
  const state = await messaging.send('GET_STATE');
  
  document.getElementById('scheduleEnabled').checked = state.schedule.enabled;
  document.getElementById('startTime').value = state.schedule.startTime;
  document.getElementById('endTime').value = state.schedule.endTime;
  
  // Check active days
  document.querySelectorAll('.day-checkbox').forEach(checkbox => {
    checkbox.checked = state.schedule.daysOfWeek.includes(parseInt(checkbox.value));
  });
}

// Save schedule
document.getElementById('saveSchedule').addEventListener('click', async () => {
  const enabled = document.getElementById('scheduleEnabled').checked;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  
  const daysOfWeek = Array.from(document.querySelectorAll('.day-checkbox'))
    .filter(cb => cb.checked)
    .map(cb => parseInt(cb.value));
  
  await messaging.send('SET_SCHEDULE', {
    schedule: { enabled, startTime, endTime, daysOfWeek }
  });
  
  alert('Schedule saved!');
});

// Save password
document.getElementById('savePassword').addEventListener('click', async () => {
  const password = document.getElementById('password').value;
  
  await messaging.send('SET_PASSWORD', { password });
  
  alert('Password set!');
});

// Initialize
loadSettings();
```

## Key Features Explained {#key-features-explained}

### declarativeNetRequest API {#declarativenetrequest-api}
The modern approach to network request blocking in Manifest V3. Unlike the deprecated `webRequest` API, `declarativeNetRequest` runs entirely in the browser for better performance and privacy. Rules are defined in JSON and updated dynamically.

### @theluckystrike/webext-storage {#theluckystrikewebext-storage}
Provides a clean Promise-based API for Chrome's storage API. Eliminates callback hell and integrates well with async/await patterns in service workers.

### @theluckystrike/webext-messaging {#theluckystrikewebext-messaging}
Simplifies message passing between extension components. Uses a handler pattern similar to Express.js for cleaner code organization.

### chrome.alarms API {#chromealarms-api}
Used for schedule-based blocking. The alarm fires every minute to check if current time falls within the blocked period.

### Password Protection {#password-protection}
A simple SHA-256 hash comparison could be added for better security. The current implementation stores plain text passwords (not recommended for production).

## Related Tutorials {#related-tutorials}

- [Build Your First Chrome Extension](getting-started.md) - Extension fundamentals
- [Chrome Storage API Deep Dive](storage-guide.md) - Persistent data management
- [Messaging Between Components](messaging-guide.md) - Popup/background communication
- [Manifest V3 Migration](manifest-v3-migration.md) - Upgrading from V2

## Next Steps {#next-steps}

1. Add import/export functionality for blocklist
2. Implement statistics tracking for blocked attempts
3. Add category-based blocking (social media, news, etc.)
4. Create a sync mechanism for multiple devices
5. Add proper password hashing before storage

## Resources {#resources}

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [declarativeNetRequest API](https://developer.chrome.com/docs/extensions/mv3/reference/declarativeNetRequest)
- [@theluckystrike/webext-storage](https://github.com/theluckystrike/webext-storage)
- [@theluckystrike/webext-messaging](https://github.com/theluckystrike/webext-messaging)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
