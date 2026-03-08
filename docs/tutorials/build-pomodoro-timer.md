---
layout: default
title: "Chrome Extension Pomodoro Timer — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-pomodoro-timer/"
---
# Build a Pomodoro Timer Extension

## What You'll Build {#what-youll-build}
- 25-minute work sessions with 5-minute breaks
- Badge countdown showing minutes remaining
- Desktop notifications when timer ends
- Sound alert via offscreen document
- Session tracking and statistics
- Customizable durations and auto-start options

## Manifest {#manifest}
- permissions: alarms, notifications, offscreen, storage
- action with popup
- background service worker for timing

---

## Step 1: Timer State Management {#step-1-timer-state-management}

Create a state object to track the timer:

```javascript
// background/timer-state.js
const DEFAULT_SETTINGS = {
  workDuration: 25,
  breakDuration: 5,
  autoStartBreak: false,
  autoStartWork: false,
  soundEnabled: true
};

let timerState = {
  isRunning: false,
  isWorkSession: true,
  timeRemaining: 25 * 60,
  completedPomodoros: 0,
  settings: { ...DEFAULT_SETTINGS }
};
```

---

## Step 2: Alarm-Based Timing {#step-2-alarm-based-timing}

Use chrome.alarms for reliable timing in the service worker:

```javascript
// background/alarm-timer.js
chrome.alarms.create('pomodoro-timer', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoro-timer' && timerState.isRunning) {
    timerState.timeRemaining -= 60;
    updateBadge();
    
    if (timerState.timeRemaining <= 0) {
      handleSessionComplete();
    }
  }
});

function updateBadge() {
  const minutes = Math.ceil(timerState.timeRemaining / 60);
  chrome.action.setBadgeText({ text: String(minutes) });
  chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
}
```

See [permissions/alarms.md](../permissions/alarms.md) for more details.

---

## Step 3: Notification Alerts {#step-3-notification-alerts}

Notify users when sessions complete:

```javascript
// background/notifications.js
function notifySessionComplete() {
  const title = timerState.isWorkSession 
    ? 'Work Session Complete!' 
    : 'Break Time Over!';
  
  const message = timerState.isWorkSession
    ? 'Great job! Take a break.'
    : 'Ready for another focus session?';
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title,
    message,
    priority: 2
  });
}
```

See [permissions/notifications.md](../permissions/notifications.md).

---

## Step 4: Sound Alerts via Offscreen Document {#step-4-sound-alerts-via-offscreen-document}

Play audio using an offscreen document for AUDIO_PLAYBACK:

```javascript
// background/audio-manager.js
async function playAlertSound() {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play timer completion sound'
  });
  
  // Audio plays automatically via offscreen document
  setTimeout(() => {
    chrome.offscreen.closeDocument();
  }, 3000);
}
```

```html
<!-- offscreen.html -->
<audio id="alert" src="alert.mp3" autoplay></audio>
```

See [permissions/offscreen.md](../permissions/offscreen.md).

---

## Step 5: Popup UI {#step-5-popup-ui}

Create the popup interface:

```html
<!-- popup.html -->
<div class="pomodoro-app">
  <div class="timer-display">
    <span id="time">25:00</span>
    <span id="session-type">Work</span>
  </div>
  <div class="controls">
    <button id="start">Start</button>
    <button id="pause">Pause</button>
    <button id="reset">Reset</button>
  </div>
  <div class="stats">
    <span>Pomodoros: <span id="count">0</span></span>
  </div>
  <a href="options.html" class="settings">Settings</a>
</div>
```

---

## Step 6: Statistics Storage {#step-6-statistics-storage}

Track completed pomodoros using webext-storage patterns:

```javascript
// background/statistics.js
async function recordPomodoro() {
  const today = new Date().toISOString().split('T')[0];
  
  const data = await chrome.storage.local.get(['stats']);
  const stats = data.stats || { daily: {}, weekly: {} };
  
  stats.daily[today] = (stats.daily[today] || 0) + 1;
  stats.completed = (stats.completed || 0) + 1;
  
  await chrome.storage.local.set({ stats });
}

function getWeeklyStats() {
  // Return completed pomodoros for the past 7 days
}
```

---

## Step 7: Options Page {#step-7-options-page}

Allow customizable durations:

```html
<!-- options.html -->
<form id="settings-form">
  <label>
    Work Duration (minutes)
    <input type="number" id="work-duration" value="25" min="1" max="60">
  </label>
  <label>
    Break Duration (minutes)
    <input type="number" id="break-duration" value="5" min="1" max="30">
  </label>
  <label>
    <input type="checkbox" id="auto-start-break">
    Auto-start break after work
  </label>
  <label>
    <input type="checkbox" id="auto-start-work">
    Auto-start work after break
  </label>
  <label>
    <input type="checkbox" id="sound-enabled">
    Enable sound alerts
  </label>
  <button type="submit">Save Settings</button>
</form>
```

---

## Step 8: Badge Management {#step-8-badge-management}

See [patterns/badge-management.md](../patterns/badge-management.md) for advanced badge patterns including color changes for different session types.

---

## Summary {#summary}

You now have a complete Pomodoro timer extension with:
- Reliable timing via chrome.alarms
- Visual countdown in the badge
- Audio alerts through offscreen documents
- Session statistics tracking
- Customizable settings
- Auto-start options

This extension demonstrates key Chrome extension patterns including service worker timing, cross-context communication, and persistent state management.
