---
layout: default
title: "Chrome Extension Timer Extension — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Countdown Timer Extension

## What You'll Build
- Custom countdown timers with hours, minutes, seconds input
- Multiple simultaneous timers with list management
- Badge countdown showing time remaining
- Desktop notifications with sound on completion
- Quick preset buttons (5min, 15min, 30min)
- Service worker restart recovery

## Manifest
- permissions: alarms, notifications, storage
- host_permissions: all_urls (for audio playback)
- action with popup
- background service worker

---

## Step 1: Manifest Configuration

Define required permissions in manifest.json:

```json
{
  "name": "Countdown Timer",
  "version": "1.0",
  "permissions": [
    "alarms",
    "notifications", 
    "storage"
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

See [permissions/alarms.md](../permissions/alarms.md) and [permissions/notifications.md](../permissions/notifications.md).

---

## Step 2: Popup UI with Timer Input

Create the timer interface with input fields and controls:

```html
<!-- popup.html -->
<div class="timer-app">
  <div class="timer-input">
    <input type="number" id="hours" min="0" max="23" placeholder="00">
    <span>:</span>
    <input type="number" id="minutes" min="0" max="59" placeholder="00">
    <span>:</span>
    <input type="number" id="seconds" min="0" max="59" placeholder="00">
  </div>
  <div class="presets">
    <button data-time="300">5 min</button>
    <button data-time="900">15 min</button>
    <button data-time="1800">30 min</button>
  </div>
  <div class="controls">
    <button id="start">Start</button>
    <button id="pause">Pause</button>
    <button id="reset">Reset</button>
  </div>
  <div id="timer-list" class="timer-list"></div>
</div>
```

---

## Step 3: Timer State with chrome.storage.session

Use session storage for fast, ephemeral timer state:

```javascript
// background/timer-state.js
const DEFAULT_TIMER = {
  id: null,
  endTime: null,
  isRunning: false,
  totalSeconds: 0,
  remainingSeconds: 0
};

async function saveTimerState(timer) {
  await chrome.storage.session.set({ activeTimer: timer });
}

async function loadTimerState() {
  const data = await chrome.storage.session.get(['activeTimer']);
  return data.activeTimer || DEFAULT_TIMER;
}
```

See [storage-quickstart.md](../tutorials/storage-quickstart.md).

---

## Step 4: Background Alarms

Create one alarm per timer with chrome.alarms API:

```javascript
// background/alarm-manager.js
const ALARM_NAME = 'countdown-timer';

function createTimerAlarm(delayInMinutes) {
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: Math.max(1, delayInMinutes), // 1-minute minimum
    periodInMinutes: 1 // Repeat every minute for updates
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    handleTimerTick();
  }
});
```

Note: Alarms have a 1-minute minimum. For precise countdown display, use storage timestamps and calculate remaining time in the popup.

See [api-reference/alarms-api.md](../api-reference/alarms-api.md).

---

## Step 5: Badge Countdown

Display remaining time on the extension badge:

```javascript
// background/badge-manager.js
async function updateBadge() {
  const timer = await loadTimerState();
  
  if (timer.isRunning && timer.remainingSeconds > 0) {
    const minutes = Math.ceil(timer.remainingSeconds / 60);
    await chrome.action.setBadgeText({ text: String(minutes) });
    await chrome.action.setBadgeBackgroundColor({ 
      color: '#4CAF50' 
    });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}
```

See [patterns/badge-action-ui.md](../patterns/badge-action-ui.md).

---

## Step 6: Notification on Completion

Notify users when timers complete with sound:

```javascript
// background/notifications.js
async function notifyTimerComplete(timerName) {
  await chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'Timer Complete!',
    message: `${timerName || 'Your timer'} has finished.`,
    priority: 2
  });
  
  // Play sound via audio element in popup context
  chrome.runtime.sendMessage({ action: 'playSound' });
}
```

See [api-reference/notifications-api.md](../api-reference/notifications-api.md).

---

## Step 7: Multiple Timer Management

Support multiple simultaneous timers with list view:

```javascript
// background/multi-timer.js
async function addTimer(duration, name) {
  const timers = await getAllTimers();
  const id = Date.now().toString();
  
  const newTimer = {
    id,
    name,
    endTime: Date.now() + duration * 1000,
    duration,
    isRunning: true
  };
  
  timers.push(newTimer);
  await chrome.storage.local.set({ timers });
  createTimerAlarm(duration / 60, id);
  
  return newTimer;
}

async function getAllTimers() {
  const data = await chrome.storage.local.get(['timers']);
  return data.timers || [];
}
```

---

## Step 8: Service Worker Restart Recovery

Reconstruct timer state from storage and alarms on restart:

```javascript
// background/startup.js
chrome.runtime.onStartup.addListener(async () => {
  const timers = await getAllTimers();
  
  for (const timer of timers) {
    if (timer.isRunning && timer.endTime > Date.now()) {
      // Recalculate remaining time
      timer.remainingSeconds = Math.floor(
        (timer.endTime - Date.now()) / 1000
      );
      await chrome.storage.session.set({ activeTimer: timer });
      
      // Recreate alarm with remaining time
      const remainingMinutes = timer.remainingSeconds / 60;
      if (remainingMinutes >= 1) {
        createTimerAlarm(remainingMinutes, timer.id);
      }
    }
  }
});
```

---

## Summary

Your countdown timer extension now includes:
- Custom duration input with preset buttons
- Multiple simultaneous timer support
- Badge countdown for active timers
- Desktop notifications on completion
- Service worker restart recovery
- Precise timing using storage timestamps

This demonstrates chrome.alarms for background timing, chrome.storage for state persistence, and badge management for visual feedback.
