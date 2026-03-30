---
layout: post
title: "Build a Website Blocker Chrome Extension. Complete Step-by-Step Tutorial"
description: "Learn how to build a powerful website blocker Chrome extension with focus timers, custom blocklists, and productivity analytics. Perfect for developers looking to create focus extension for Chrome."
date: 2025-01-19
last_modified_at: 2025-01-19
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project, tutorial]
author: theluckystrike
canonical_url: "https://bestchromeextensions.com/2025/01/19/build-website-blocker-chrome-extension/"
---

Build a Website Blocker Chrome Extension. Complete Step-by-Step Tutorial

In today's hyper-connected digital world, maintaining focus has become one of the biggest challenges for professionals, students, and anyone trying to be productive. Distracting websites constantly vie for our attention, from social media platforms to news sites, breaking our concentration every few minutes. Building a website blocker extension is an excellent project that not only solves a real problem but also teaches you valuable skills in Chrome extension development.

This comprehensive tutorial will guide you through building a fully functional focus extension from scratch using Manifest V3. You'll learn how to block websites, implement customizable blocklists, add focus timers, track productivity statistics, and create a polished user interface. By the end of this tutorial, you'll have a complete, publishable Chrome extension that can help users regain control of their browsing habits.

---

Why Build a Website Blocker Extension?

Before diving into the code, let's explore why creating a website blocker extension is worthwhile. The demand for block sites chrome tools is massive, with millions of users actively searching for solutions to combat digital distractions. Building this extension will teach you several important Chrome API concepts:

- Declarative Net Request API: The modern way to block network requests in Manifest V3
- Storage API: For persisting user preferences and blocklists
- Alarms API: For scheduling focus sessions
- Notifications API: For alerting users when trying to access blocked sites
- Message Passing: For communication between popup and background scripts

These skills are transferable to virtually any Chrome extension you might build in the future, making this project an excellent investment in your development skills.

---

Project Setup and Manifest Configuration

Every Chrome extension begins with the manifest file. This JSON configuration tells Chrome about your extension's capabilities, permissions, and file structure. For our website blocker, we'll need specific permissions to manage blocking rules and store user data.

Create a new directory called `focus-blocker` and add the following `manifest.json` file:

```json
{
  "manifest_version": 3,
  "name": "Focus Blocker - Website Blocker Extension",
  "version": "1.0.0",
  "description": "Block distracting websites and boost your productivity with customizable focus timers",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "declarativeNetRequest"
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
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The key permission here is `declarativeNetRequest`, which is the Manifest V3 replacement for the deprecated `webRequest` blocking API. This allows us to block network requests without requiring invasive permissions that would trigger additional review processes in the Chrome Web Store.

---

Creating the HTML Popup Interface

The popup is what users see when they click the extension icon in their browser toolbar. We'll create a clean, intuitive interface that allows users to quickly toggle blocking, view their focus status, and access settings.

Create `popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Focus Blocker</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1> Focus Blocker</h1>
    </header>
    
    <main>
      <div class="status-card">
        <div class="status-indicator" id="statusIndicator"></div>
        <span class="status-text" id="statusText">Protection Inactive</span>
      </div>
      
      <div class="timer-section">
        <div class="timer-display" id="timerDisplay">25:00</div>
        <div class="timer-controls">
          <button id="startBtn" class="btn primary">Start Focus</button>
          <button id="pauseBtn" class="btn secondary" disabled>Pause</button>
          <button id="resetBtn" class="btn outline">Reset</button>
        </div>
      </div>
      
      <div class="quick-stats">
        <div class="stat">
          <span class="stat-value" id="blockedToday">0</span>
          <span class="stat-label">Blocked Today</span>
        </div>
        <div class="stat">
          <span class="stat-value" id="focusTime">0h</span>
          <span class="stat-label">Focus Time</span>
        </div>
      </div>
      
      <button id="openSettings" class="btn full-width">Manage Blocklist</button>
    </main>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now let's create the styling in `popup.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  background: #1a1a2e;
  color: #eee;
}

.container {
  padding: 20px;
}

header h1 {
  font-size: 18px;
  margin-bottom: 20px;
  text-align: center;
  color: #00d9ff;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: #16213e;
  border-radius: 10px;
  margin-bottom: 20px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff4757;
}

.status-indicator.active {
  background: #2ed573;
}

.timer-section {
  text-align: center;
  margin-bottom: 20px;
}

.timer-display {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #00d9ff;
}

.timer-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.primary {
  background: #00d9ff;
  color: #1a1a2e;
}

.btn.primary:hover {
  background: #00b8d4;
}

.btn.secondary {
  background: #5352ed;
  color: white;
}

.btn.outline {
  background: transparent;
  border: 1px solid #5352ed;
  color: #5352ed;
}

.btn.full-width {
  width: 100%;
  background: #16213e;
  color: #00d9ff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.stat {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: #16213e;
  border-radius: 8px;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #00d9ff;
}

.stat-label {
  font-size: 11px;
  color: #888;
}
```

---

Implementing the Popup Logic

The popup JavaScript handles user interactions and communicates with the background service worker. Create `popup.js`:

```javascript
// State management
let isActive = false;
let timeRemaining = 25 * 60; // 25 minutes in seconds
let timerInterval = null;
let isPaused = false;

// DOM Elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const timerDisplay = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const blockedToday = document.getElementById('blockedToday');
const focusTime = document.getElementById('focusTime');
const openSettings = document.getElementById('openSettings');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  updateUI();
});

async function loadState() {
  const state = await chrome.storage.local.get(['isActive', 'timeRemaining', 'blockedCount', 'focusMinutes']);
  isActive = state.isActive || false;
  timeRemaining = state.timeRemaining || 25 * 60;
  blockedToday.textContent = state.blockedCount || 0;
  const hours = Math.floor((state.focusMinutes || 0) / 60);
  focusTime.textContent = `${hours}h`;
}

function updateUI() {
  statusIndicator.classList.toggle('active', isActive);
  statusText.textContent = isActive ? 'Protection Active' : 'Protection Inactive';
  updateTimerDisplay();
  
  startBtn.disabled = isActive && !isPaused;
  pauseBtn.disabled = !isActive || isPaused;
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

startBtn.addEventListener('click', async () => {
  if (isPaused) {
    isPaused = false;
    startTimer();
  } else {
    isActive = true;
    startTimer();
    await updateBlockingRules(true);
  }
  updateUI();
});

pauseBtn.addEventListener('click', () => {
  isPaused = true;
  clearInterval(timerInterval);
  updateUI();
});

resetBtn.addEventListener('click', async () => {
  clearInterval(timerInterval);
  isActive = false;
  isPaused = false;
  timeRemaining = 25 * 60;
  await chrome.storage.local.set({ timeRemaining, isActive: false });
  await updateBlockingRules(false);
  updateUI();
});

function startTimer() {
  timerInterval = setInterval(async () => {
    if (timeRemaining > 0) {
      timeRemaining--;
      updateTimerDisplay();
      
      // Save state periodically
      if (timeRemaining % 10 === 0) {
        await chrome.storage.local.set({ timeRemaining });
      }
    } else {
      clearInterval(timerInterval);
      await completeFocusSession();
    }
  }, 1000);
}

async function completeFocusSession() {
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Focus Session Complete!',
    message: 'Great job! Take a short break before your next session.'
  });
  
  // Update stats
  const state = await chrome.storage.local.get(['focusMinutes']);
  const newFocusTime = (state.focusMinutes || 0) + 25;
  await chrome.storage.local.set({ 
    focusMinutes: newFocusTime,
    isActive: false,
    timeRemaining: 25 * 60
  });
  
  await updateBlockingRules(false);
  isActive = false;
  isPaused = false;
  timeRemaining = 25 * 60;
  updateUI();
}

async function updateBlockingRules(active) {
  // Get blocklist from storage
  const { blocklist = [] } = await chrome.storage.local.get('blocklist');
  
  if (!active || blocklist.length === 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    });
    return;
  }
  
  // Create blocking rules
  const rules = blocklist.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { url: chrome.runtime.getURL('blocked.html') }
    },
    condition: {
      urlFilter: `*://${domain}/*`,
      resourceTypes: ['main_frame']
    }
  }));
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
    removeRuleIds: Array.from({ length: 10 }, (_, i) => i + 1)
  });
}

openSettings.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
```

---

Building the Background Service Worker

The background service worker handles the extension's lifecycle and manages blocking rules. Create `background.js`:

```javascript
// Background service worker for Focus Blocker

// Initialize default blocklist if none exists
chrome.runtime.onInstalled.addListener(async () => {
  const { blocklist } = await chrome.storage.local.get('blocklist');
  
  if (!blocklist || blocklist.length === 0) {
    await chrome.storage.local.set({
      blocklist: [
        'facebook.com',
        'twitter.com',
        'instagram.com',
        'reddit.com',
        'youtube.com',
        'tiktok.com'
      ],
      isActive: false,
      timeRemaining: 25 * 60,
      blockedCount: 0,
      focusMinutes: 0
    });
  }
  
  console.log('Focus Blocker extension installed');
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getState') {
    chrome.storage.local.get([
      'isActive',
      'timeRemaining',
      'blocklist',
      'blockedCount',
      'focusMinutes'
    ]).then(sendResponse);
    return true;
  }
  
  if (message.action === 'updateBlocklist') {
    chrome.storage.local.set({ blocklist: message.blocklist });
  }
});

// Track blocked attempts
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(async (info) => {
  const { blockedCount = 0 } = await chrome.storage.local.get('blockedCount');
  await chrome.storage.local.set({ blockedCount: blockedCount + 1 });
});
```

---

Creating the Options Page

The options page allows users to manage their blocklist and customize settings. Create `options.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Focus Blocker Settings</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
      padding: 30px;
    }
    h1 { color: #00d9ff; margin-bottom: 20px; }
    .section { margin-bottom: 30px; }
    h2 { font-size: 16px; margin-bottom: 15px; color: #aaa; }
    textarea {
      width: 100%;
      height: 200px;
      background: #16213e;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 15px;
      color: #eee;
      font-family: monospace;
      font-size: 14px;
      resize: vertical;
    }
    .help-text {
      font-size: 12px;
      color: #888;
      margin-top: 8px;
    }
    button {
      background: #00d9ff;
      color: #1a1a2e;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      margin-top: 15px;
    }
    button:hover { background: #00b8d4; }
    .presets { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; }
    .preset-btn {
      background: #16213e;
      color: #00d9ff;
      border: 1px solid #00d9ff;
      padding: 8px 16px;
    }
    .preset-btn:hover { background: #1f2f52; }
  </style>
</head>
<body>
  <h1> Focus Blocker Settings</h1>
  
  <div class="section">
    <h2>Quick Presets</h2>
    <div class="presets">
      <button class="preset-btn" onclick="applyPreset('social')">Social Media</button>
      <button class="preset-btn" onclick="applyPreset('news')">News Sites</button>
      <button class="preset-btn" onclick="applyPreset('entertainment')">Entertainment</button>
      <button class="preset-btn" onclick="applyPreset('all')">All Distractions</button>
    </div>
  </div>
  
  <div class="section">
    <h2>Blocklist (one domain per line)</h2>
    <textarea id="blocklist" placeholder="facebook.com&#10;twitter.com&#10;instagram.com"></textarea>
    <p class="help-text">Enter the domains you want to block during focus sessions. Do not include "https://" or "www."</p>
  </div>
  
  <button onclick="saveSettings()">Save Settings</button>
  
  <script src="options.js"></script>
</body>
</html>
```

Create `options.js`:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const { blocklist } = await chrome.storage.local.get('blocklist');
  document.getElementById('blocklist').value = blocklist.join('\n');
});

async function saveSettings() {
  const blocklistText = document.getElementById('blocklist').value;
  const blocklist = blocklistText
    .split('\n')
    .map(line => line.trim().toLowerCase())
    .filter(line => line.length > 0 && !line.startsWith('#'));
  
  await chrome.storage.local.set({ blocklist });
  
  // Update blocking rules if active
  const { isActive } = await chrome.storage.local.get('isActive');
  if (isActive) {
    const rules = blocklist.map((domain, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: chrome.runtime.getURL('blocked.html') }
      },
      condition: {
        urlFilter: `*://${domain}/*`,
        resourceTypes: ['main_frame']
      }
    }));
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1)
    });
  }
  
  alert('Settings saved!');
}

function applyPreset(type) {
  const presets = {
    social: ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'linkedin.com', 'snapchat.com'],
    news: ['cnn.com', 'bbc.com', 'nytimes.com', 'foxnews.com', 'reddit.com', 'huffpost.com'],
    entertainment: ['youtube.com', 'netflix.com', 'hulu.com', 'twitch.tv', 'disney.com'],
    all: ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com', 'reddit.com', 'netflix.com', 'cnn.com', 'bbc.com']
  };
  
  const preset = presets[type] || [];
  document.getElementById('blocklist').value = preset.join('\n');
}
```

---

Creating the Blocked Page

When users try to visit a blocked website, they'll see this page instead. Create `blocked.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Blocked - Focus Blocker</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #eee;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
    }
    .container {
      max-width: 500px;
    }
    h1 {
      font-size: 72px;
      margin-bottom: 20px;
    }
    .blocked-message {
      font-size: 24px;
      margin-bottom: 10px;
      color: #ff4757;
    }
    .domain {
      font-size: 18px;
      color: #00d9ff;
      margin-bottom: 30px;
    }
    .tip {
      background: #16213e;
      padding: 20px;
      border-radius: 10px;
      margin-top: 30px;
    }
    .tip h3 {
      color: #00d9ff;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1></h1>
    <p class="blocked-message">This Site is Blocked</p>
    <p class="domain" id="blockedDomain">Stay focused!</p>
    
    <div class="tip">
      <h3> Stay Productive</h3>
      <p>You're doing great! Keep working on your task. Your focus session ends in <span id="timeRemaining">--:--</span></p>
    </div>
  </div>
  
  <script>
    // Get the blocked domain from URL parameters
    const params = new URLSearchParams(window.location.search);
    document.getElementById('blockedDomain').textContent = params.get('url') || 'This website';
    
    // Load time remaining
    chrome.storage.local.get(['timeRemaining']).then(result => {
      const minutes = Math.floor((result.timeRemaining || 0) / 60);
      const seconds = (result.timeRemaining || 0) % 60;
      document.getElementById('timeRemaining').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    });
  </script>
</body>
</html>
```

---

Testing Your Extension

Now that we've created all the files, let's test the extension in Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your `focus-blocker` directory
4. The extension should now appear in your toolbar

Click the extension icon to test:
- Start a focus session and verify the timer counts down
- Try visiting a blocked site (like facebook.com). you should see the blocked page
- Check that the statistics update correctly
- Test the presets in the options page

---

Publishing to the Chrome Web Store

When you're ready to share your extension, follow these steps:

1. Prepare your extension: Ensure all icons are properly sized (16x16, 48x48, 128x128 pixels)
2. Create a ZIP file: Package your extension directory (excluding source files if desired)
3. Create a developer account: Visit the Chrome Web Store developer dashboard
4. Upload your extension: Submit your ZIP file and complete the required information
5. Submit for review: Google will review your extension (usually takes a few hours to a few days)

Make sure your extension follows Chrome's policies, particularly around user privacy and data handling.

---

Advanced Features to Consider

Once you have the basic extension working, here are some advanced features you could implement:

- Focus modes: Create different blocking profiles for work, study, or personal time
- Scheduling: Allow users to automatically enable blocking during certain hours
- Whitelist: Add exceptions for specific sites that should always be accessible
- Productivity analytics: Track and visualize focus patterns over time
- Cloud sync: Allow users to sync their settings across devices
- Pomodoro timer integration: Combine website blocking with proven productivity techniques
- Custom redirect pages: Create branded blocked pages with motivational messages

---

Conclusion

Congratulations! You've built a complete website blocker Chrome extension with focus timers, customizable blocklists, and productivity tracking. This project demonstrates the core concepts of Chrome extension development including the Declarative Net Request API, Storage API, and message passing between components.

The skills you've learned here are highly transferable. you can now build a wide variety of Chrome extensions to solve different problems. Whether you want to create a focus extension for personal use or publish to the Chrome Web Store, you have all the foundation you need.

Remember that the key to a successful extension is solving a real problem for users. Website blocking is in high demand because digital distractions are a genuine challenge for millions of people. With some additional polish and marketing, your Focus Blocker extension could help thousands of users improve their productivity.

Start experimenting with the code, add your own features, and most importantly. stay focused on building something valuable!
