---
layout: post
title: "Build a Pomodoro Timer Chrome Extension: Complete Development Guide"
description: "Learn how to build a Pomodoro Timer Chrome Extension from scratch. This comprehensive tutorial covers Manifest V3, timer functionality, notifications, and productivity features for your own timer extension."
date: 2025-01-19
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, tutorial, project]
keywords: "pomodoro chrome extension, timer extension, productivity timer extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/19/build-pomodoro-timer-chrome-extension/"
---

# Build a Pomodoro Timer Chrome Extension: Complete Development Guide

The Pomodoro Technique has revolutionized how millions of people approach productivity and time management. By breaking work into focused intervals typically lasting 25 minutes, separated by short breaks, this method helps combat fatigue and maintain concentration throughout the day. Building a **pomodoro chrome extension** allows you to carry this powerful productivity tool directly in your browser, ensuring you never lose track of your work sessions even during the most demanding coding projects or research tasks.

In this comprehensive guide, we will walk you through the complete process of creating a fully functional **timer extension** using Chrome's modern Manifest V3 format. Whether you are a seasoned Chrome extension developer or just starting your journey into browser extension development, this tutorial provides everything you need to build a professional-grade productivity timer extension that rivals many popular alternatives available in the Chrome Web Store.

## Understanding the Pomodoro Technique and Extension Requirements

Before diving into code, let us establish a clear understanding of what our pomodoro chrome extension needs to accomplish. The fundamental concept behind the Pomodoro Technique involves working in focused 25-minute intervals called "pomodoros," followed by a 5-minute short break. After completing four pomodoros, users take a longer break of 15 to 30 minutes. This cycle repeats throughout the workday, promoting sustained concentration while preventing burnout.

Your chrome extension timer must therefore implement several core features to be genuinely useful. First and foremost, it needs accurate timing functionality that counts down from 25 minutes (or custom durations) to zero. Second, it requires visual feedback displaying the remaining time in a clear, easily readable format. Third, the extension should provide notifications when each interval completes, alerting users without requiring constant attention to the timer. Fourth, users should be able to start, pause, and reset the timer as needed. Finally, a good pomodoro extension tracks completed pomodoros and provides statistics about productivity sessions.

These requirements may seem straightforward, but building them correctly requires understanding Chrome's extension architecture, the alarms API, the notifications API, and proper state management across different extension components.

## Setting Up Your Chrome Extension Project Structure

Every Chrome extension begins with a well-organized project structure. Create a new folder for your pomodoro timer extension project and set up the following files and directories. This structure follows Chrome's recommended practices and ensures your extension remains maintainable as features grow more complex.

Your project should include a manifest.json file, which serves as the configuration blueprint for your extension. The popup directory will contain the HTML, CSS, and JavaScript files for the extension's user interface that appears when users click the extension icon. The background directory houses service worker code that runs independently of any open popup, enabling features like scheduled alarms even when the popup is closed. Finally, the icons directory stores the extension's icon graphics in various sizes required by the Chrome Web Store.

Let us begin by creating the manifest.json file with Manifest V3 configuration. This version represents the current standard for Chrome extensions and includes important security and performance improvements over earlier versions.

```json
{
  "manifest_version": 3,
  "name": "Pomodoro Timer Pro",
  "version": "1.0.0",
  "description": "A productivity timer extension using the Pomodoro Technique to help you stay focused and organized.",
  "permissions": [
    "alarms",
    "notifications",
    "storage"
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

This manifest declares the essential permissions our pomodoro chrome extension requires. The alarms permission enables precise timing functionality that continues running even when the popup closes. The notifications permission allows the extension to alert users when intervals complete. The storage permission enables persisting timer state and user preferences across browser sessions.

## Creating the Popup Interface

The popup serves as the primary user interface for your timer extension. When users click the extension icon in their browser toolbar, they should immediately see the current timer status, remaining time, and controls to manage their pomodoro sessions. Let us build a clean, intuitive interface using HTML and CSS.

Create the popup.html file in your popup directory. This file defines the structure of your extension's interface, including the timer display, current session type indicator, and control buttons.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pomodoro Timer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Pomodoro Timer</h1>
      <span id="session-type" class="session-badge work">Work Session</span>
    </header>
    
    <main>
      <div class="timer-display">
        <span id="minutes">25</span>
        <span class="separator">:</span>
        <span id="seconds">00</span>
      </div>
      
      <div class="progress-bar">
        <div id="progress-fill" class="progress-fill"></div>
      </div>
      
      <div class="controls">
        <button id="start-btn" class="btn primary">Start</button>
        <button id="pause-btn" class="btn secondary" disabled>Pause</button>
        <button id="reset-btn" class="btn tertiary">Reset</button>
      </div>
      
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">Completed Today</span>
          <span id="completed-count" class="stat-value">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Current Streak</span>
          <span id="streak-count" class="stat-value">0</span>
        </div>
      </div>
    </main>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Now create the corresponding CSS file to style your popup. Good design matters for productivity tools since users interact with them frequently throughout their workday. Use a clean, modern aesthetic with high contrast for the timer display and intuitive button styling.

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
  color: #ffffff;
}

.container {
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

h1 {
  font-size: 18px;
  font-weight: 600;
  color: #e8e8e8;
}

.session-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.session-badge.work {
  background: #e74c3c;
  color: white;
}

.session-badge.break {
  background: #27ae60;
  color: white;
}

.timer-display {
  font-size: 56px;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
  letter-spacing: -2px;
  margin-bottom: 16px;
}

.separator {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.progress-bar {
  height: 6px;
  background: #2d2d44;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 24px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #f39c12);
  width: 0%;
  transition: width 1s linear;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.primary {
  background: #e74c3c;
  color: white;
}

.btn.primary:hover {
  background: #c0392b;
}

.btn.secondary {
  background: #34495e;
  color: #bdc3c7;
}

.btn.secondary:hover:not(:disabled) {
  background: #2c3e50;
}

.btn.tertiary {
  background: transparent;
  color: #95a5a6;
  border: 1px solid #34495e;
}

.btn.tertiary:hover {
  background: #2d2d44;
  color: #e8e8e8;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats {
  display: flex;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #2d2d44;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #7f8c8d;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #3498db;
}
```

## Implementing Timer Logic in the Popup

The popup JavaScript handles user interactions and manages the timer display. However, the actual timing logic should reside in the background service worker to ensure accuracy even when the popup closes. Let us first implement the popup script, which communicates with the background worker through Chrome's message passing API.

```javascript
// popup/popup.js

let timerState = {
  isRunning: false,
  timeRemaining: 25 * 60, // 25 minutes in seconds
  sessionType: 'work', // 'work' or 'break'
  completedPomodoros: 0,
  currentStreak: 0
};

const elements = {
  minutes: document.getElementById('minutes'),
  seconds: document.getElementById('seconds'),
  sessionType: document.getElementById('session-type'),
  startBtn: document.getElementById('start-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  resetBtn: document.getElementById('reset-btn'),
  progressFill: document.getElementById('progress-fill'),
  completedCount: document.getElementById('completed-count'),
  streakCount: document.getElementById('streak-count')
};

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupEventListeners();
  updateDisplay();
});

function setupEventListeners() {
  elements.startBtn.addEventListener('click', startTimer);
  elements.pauseBtn.addEventListener('click', pauseTimer);
  elements.resetBtn.addEventListener('click', resetTimer);
}

function loadState() {
  chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState) {
      timerState = { ...timerState, ...result.timerState };
      updateDisplay();
    }
  });
}

function saveState() {
  chrome.storage.local.set({ timerState });
}

function startTimer() {
  timerState.isRunning = true;
  updateButtonStates();
  saveState();
  
  chrome.runtime.sendMessage({ 
    action: 'startTimer', 
    timeRemaining: timerState.timeRemaining,
    sessionType: timerState.sessionType 
  });
}

function pauseTimer() {
  timerState.isRunning = false;
  updateButtonStates();
  saveState();
  
  chrome.runtime.sendMessage({ action: 'pauseTimer' });
}

function resetTimer() {
  timerState.isRunning = false;
  timerState.timeRemaining = timerState.sessionType === 'work' ? 25 * 60 : 5 * 60;
  updateButtonStates();
  updateDisplay();
  saveState();
  
  chrome.runtime.sendMessage({ action: 'resetTimer' });
}

function updateButtonStates() {
  elements.startBtn.disabled = timerState.isRunning;
  elements.pauseBtn.disabled = !timerState.isRunning;
}

function updateDisplay() {
  const minutes = Math.floor(timerState.timeRemaining / 60);
  const seconds = timerState.timeRemaining % 60;
  
  elements.minutes.textContent = minutes.toString().padStart(2, '0');
  elements.seconds.textContent = seconds.toString().padStart(2, '0');
  
  // Update session type display
  if (timerState.sessionType === 'work') {
    elements.sessionType.textContent = 'Work Session';
    elements.sessionType.className = 'session-badge work';
  } else {
    elements.sessionType.textContent = 'Break Time';
    elements.sessionType.className = 'session-badge break';
  }
  
  // Update progress bar
  const totalTime = timerState.sessionType === 'work' ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timerState.timeRemaining) / totalTime) * 100;
  elements.progressFill.style.width = `${progress}%`;
  
  // Update stats
  elements.completedCount.textContent = timerState.completedPomodoros;
  elements.streakCount.textContent = timerState.currentStreak;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'tick') {
    timerState.timeRemaining = message.timeRemaining;
    updateDisplay();
  } else if (message.action === 'sessionComplete') {
    handleSessionComplete(message.nextSessionType);
  }
});

function handleSessionComplete(nextSessionType) {
  if (timerState.sessionType === 'work') {
    timerState.completedPomodoros++;
    timerState.currentStreak++;
  }
  
  timerState.sessionType = nextSessionType;
  timerState.timeRemaining = nextSessionType === 'work' ? 25 * 60 : 5 * 60;
  timerState.isRunning = false;
  
  updateButtonStates();
  updateDisplay();
  saveState();
}
```

## Building the Background Service Worker

The background service worker is the heart of your pomodoro chrome extension. It manages the actual timing, handles notifications, and ensures the timer continues running accurately regardless of whether the popup is open. Service workers in Manifest V3 cannot keep the popup alive, so we use the alarms API for reliable timing.

```javascript
// background/background.js

let alarmInterval = null;
let currentTimeRemaining = 25 * 60;
let currentSessionType = 'work';
let isRunning = false;

// Duration configurations (in seconds)
const DURATIONS = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
};

// Initialize on extension load
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timerState: {
      isRunning: false,
      timeRemaining: DURATIONS.work,
      sessionType: 'work',
      completedPomodoros: 0,
      currentStreak: 0
    }
  });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startTimer':
      startTimer(message.timeRemaining, message.sessionType);
      break;
    case 'pauseTimer':
      pauseTimer();
      break;
    case 'resetTimer':
      resetTimer();
      break;
  }
});

function startTimer(timeRemaining, sessionType) {
  if (isRunning) return;
  
  isRunning = true;
  currentTimeRemaining = timeRemaining;
  currentSessionType = sessionType;
  
  // Use chrome.alarms for reliable timing
  chrome.alarms.create('pomodoroTimer', {
    delayInMinutes: 0.0167, // Trigger every second (approximately)
    periodInMinutes: 0.0167
  });
  
  // Store timer state
  chrome.storage.local.set({
    timerState: {
      isRunning: true,
      timeRemaining: currentTimeRemaining,
      sessionType: currentSessionType
    }
  });
  
  // Start local interval for smoother UI updates
  startLocalInterval();
}

function startLocalInterval() {
  if (alarmInterval) clearInterval(alarmInterval);
  
  alarmInterval = setInterval(() => {
    if (!isRunning) {
      clearInterval(alarmInterval);
      return;
    }
    
    currentTimeRemaining--;
    
    // Update storage
    chrome.storage.local.set({
      timerState: { timeRemaining: currentTimeRemaining }
    });
    
    // Notify popup of tick
    chrome.runtime.sendMessage({
      action: 'tick',
      timeRemaining: currentTimeRemaining
    });
    
    // Check if timer completed
    if (currentTimeRemaining <= 0) {
      handleTimerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  chrome.alarms.clear('pomodoroTimer');
  
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  
  chrome.storage.local.set({
    timerState: { isRunning: false, timeRemaining: currentTimeRemaining }
  });
}

function resetTimer() {
  pauseTimer();
  currentTimeRemaining = DURATIONS[currentSessionType];
  
  chrome.storage.local.set({
    timerState: {
      timeRemaining: currentTimeRemaining,
      isRunning: false
    }
  });
  
  // Notify popup to update display
  chrome.runtime.sendMessage({
    action: 'tick',
    timeRemaining: currentTimeRemaining
  });
}

function handleTimerComplete() {
  pauseTimer();
  
  // Determine next session type
  const nextSessionType = determineNextSession();
  
  // Show notification
  showNotification(currentSessionType);
  
  // Notify popup to update
  chrome.runtime.sendMessage({
    action: 'sessionComplete',
    nextSessionType: nextSessionType
  });
  
  // Update stored state
  chrome.storage.local.get(['timerState'], (result) => {
    const state = result.timerState || {};
    
    if (currentSessionType === 'work') {
      state.completedPomodoros = (state.completedPomodoros || 0) + 1;
      state.currentStreak = (state.currentStreak || 0) + 1;
    }
    
    state.sessionType = nextSessionType;
    state.timeRemaining = DURATIONS[nextSessionType];
    state.isRunning = false;
    
    chrome.storage.local.set({ timerState: state });
  });
}

function determineNextSession() {
  // After 4 work sessions, take a long break
  chrome.storage.local.get(['timerState'], (result) => {
    const completedPomodoros = result.timerState?.completedPomodoros || 0;
    
    if (currentSessionType === 'work') {
      if (completedPomodoros > 0 && completedPomodoros % 4 === 0) {
        return 'longBreak';
      }
      return 'shortBreak';
    }
    return 'work';
  });
  
  return currentSessionType === 'work' ? 'shortBreak' : 'work';
}

function showNotification(sessionType) {
  const title = sessionType === 'work' ? 'Work Session Complete!' : 'Break Time Over!';
  const message = sessionType === 'work' 
    ? 'Great job! Time for a well-deserved break.'
    : 'Ready to get back to work? Start your next pomodoro!';
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 1
  });
}

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoroTimer' && isRunning) {
    currentTimeRemaining--;
    
    if (currentTimeRemaining <= 0) {
      handleTimerComplete();
    }
  }
});
```

## Testing and Loading Your Extension

Now that you have built all the core components of your pomodoro chrome extension, it is time to test it in your browser. Chrome provides a straightforward way to load unpacked extensions for development and testing purposes.

Open Chrome and navigate to `chrome://extensions/` in your address bar. Enable the "Developer mode" toggle switch located in the top-right corner of the page. This reveals additional options for managing extensions. Click the "Load unpacked" button that appears and select the directory containing your extension files.

Once loaded, you should see your Pomodoro Timer extension appear in the list. Pin it to your browser toolbar for easy access by clicking the puzzle piece icon and selecting your new extension. Click the extension icon to open the popup and test the timer functionality.

Try starting a work session and verify that the timer counts down correctly. Confirm that the progress bar updates smoothly as time passes. Test the pause functionality and ensure the timer stops accurately. After a work session completes, verify that you receive a notification and the timer switches to break mode automatically.

## Enhancing Your Extension with Additional Features

The basic pomodoro chrome extension you have built provides core functionality, but there are many ways to enhance it further. Consider adding customizable timer durations that allow users to configure their preferred work and break lengths. Implement sound notifications in addition to visual alerts. Add statistics tracking that stores historical data about productivity sessions. Integrate with task management tools to link pomodoros with specific projects. Support multiple timers for different contexts like deep work, light tasks, or quick reviews.

You might also want to add keyboard shortcuts so users can control the timer without opening the popup. Implement badges showing the current timer status directly on the extension icon. Add a sidebar view for users who prefer a more persistent timer display. Consider adding themes or customization options to let users personalize their extension.

## Publishing Your Extension to the Chrome Web Store

Once you have thoroughly tested your pomodoro timer extension and added any desired enhancements, you can publish it to the Chrome Web Store to share with millions of users. First, prepare your extension for publication by creating icons in all required sizes, writing compelling descriptions that incorporate relevant keywords like "pomodoro chrome extension" and "productivity timer extension," and ensuring all assets meet Google's quality guidelines.

Package your extension using the "Pack extension" button in developer mode or create a ZIP file of your extension directory. Create a developer account on the Chrome Web Store if you do not already have one. Upload your packaged extension, fill in the store listing information, and submit it for review. Google typically reviews new extensions within a few days, though review times may vary.

Building a chrome extension timer represents an excellent project for developers looking to expand their browser extension development skills while creating something genuinely useful. The pomodoro technique has proven its value for productivity enthusiasts worldwide, and having a well-designed timer extension readily available in your browser can significantly improve your focus and work efficiency. Start with this foundation, iterate on the design, and create a pomodoro chrome extension that stands out in the marketplace.
