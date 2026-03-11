---
layout: post
title: "Build a Pomodoro Timer Chrome Extension: Focus Intervals in Your Browser"
description: "Learn how to build a Pomodoro timer Chrome extension with Manifest V3. This step-by-step guide covers the Pomodoro technique, timer logic, browser notifications, and how to publish your productivity extension."
date: 2025-04-14
categories: [Chrome-Extensions, Productivity]
tags: [pomodoro, timer, chrome-extension]
keywords: "chrome extension pomodoro, pomodoro timer chrome, build timer extension, focus timer chrome extension, pomodoro technique chrome"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/14/build-pomodoro-timer-chrome-extension/"
---

# Build a Pomodoro Timer Chrome Extension: Focus Intervals in Your Browser

The Pomodoro Technique is one of the most popular productivity methods used by developers, writers, students, and professionals worldwide. Developed by Francesco Cirillo in the late 1980s, this time management technique uses a timer to break work into focused intervals, traditionally 25 minutes, separated by short breaks. Building a Pomodoro timer Chrome extension brings this powerful productivity tool directly into your browser, where you spend most of your workday.

In this comprehensive guide, we will walk you through building a fully functional Pomodoro timer Chrome extension using Manifest V3, the latest extension platform from Google. You will learn how to implement timer logic, handle browser notifications, persist user preferences, and create a polished user interface that fits seamlessly into Chrome.

---

## What You Will Build {#what-you-will-build}

By the end of this tutorial, you will have created a Chrome extension that features:

- A 25-minute work timer and 5-minute short break timer
- A 15-minute long break timer after every four Pomodoro cycles
- Visual countdown display in the extension popup
- Browser notifications when intervals complete
- Audio alerts to signal timer completion
- Persistent settings using Chrome's storage API
- A clean, modern user interface

This extension will follow Chrome's Manifest V3 specifications, ensuring compatibility with the latest browser security and performance standards.

---

## Prerequisites {#prerequisites}

Before we begin, make sure you have the following:

- Google Chrome browser installed on your computer
- A code editor (VS Code, Sublime Text, or any editor you prefer)
- Basic understanding of HTML, CSS, and JavaScript
- No paid developer account required (you can publish extensions for free)

Let's start building your Pomodoro timer Chrome extension.

---

## Project Structure {#project-structure}

Create a new folder for your project and set up the following file structure:

```
pomodoro-timer/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── background.js
├── icon.png
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

This structure follows Chrome extension best practices, separating the popup interface from background logic.

---

## Creating the Manifest File {#creating-the-manifest}

The manifest.json file is the heart of every Chrome extension. It tells Chrome about your extension's name, permissions, and components.

```json
{
  "manifest_version": 3,
  "name": "Pomodoro Focus Timer",
  "version": "1.0.0",
  "description": "A beautiful Pomodoro timer extension to boost your productivity with focus intervals and break reminders.",
  "permissions": [
    "storage",
    "notifications",
    "alarms",
    "tabs"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest requests the necessary permissions for storage (saving user preferences), notifications (alerting users when timers complete), alarms (precise timing), and tabs (for potential future features).

---

## Building the Popup Interface {#building-the-popup}

The popup is what users see when they click the extension icon in Chrome's toolbar. Let's create a clean, intuitive interface.

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
      <div class="mode-indicator" id="modeIndicator">Focus Time</div>
    </header>

    <main>
      <div class="timer-display" id="timerDisplay">
        <span id="minutes">25</span>
        <span class="separator">:</span>
        <span id="seconds">00</span>
      </div>

      <div class="progress-ring">
        <svg>
          <circle class="progress-bg" cx="70" cy="70" r="60"></circle>
          <circle class="progress-bar" cx="70" cy="70" r="60" id="progressBar"></circle>
        </svg>
      </div>

      <div class="controls">
        <button id="startBtn" class="btn primary">Start</button>
        <button id="pauseBtn" class="btn secondary" disabled>Pause</button>
        <button id="resetBtn" class="btn outline">Reset</button>
      </div>

      <div class="session-info">
        <p>Session: <span id="sessionCount">0</span> / 4</p>
        <p class="total-focus">Total Focus: <span id="totalFocus">0</span> min</p>
      </div>
    </main>

    <footer>
      <div class="settings-toggle" id="settingsToggle">
        ⚙️ Settings
      </div>
      <div class="settings-panel" id="settingsPanel">
        <div class="setting">
          <label for="focusTime">Focus Duration (min)</label>
          <input type="number" id="focusTime" value="25" min="1" max="60">
        </div>
        <div class="setting">
          <label for="shortBreak">Short Break (min)</label>
          <input type="number" id="shortBreak" value="5" min="1" max="30">
        </div>
        <div class="setting">
          <label for="longBreak">Long Break (min)</label>
          <input type="number" id="longBreak" value="15" min="1" max="60">
        </div>
        <button id="saveSettings" class="btn small">Save Settings</button>
      </div>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides a complete user interface with a timer display, control buttons, session tracking, and customizable settings.

---

## Styling the Extension {#styling-the-extension}

Now let's create attractive CSS that makes your extension look professional and inviting.

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.container {
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.mode-indicator {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  display: inline-block;
}

.timer-display {
  text-align: center;
  font-size: 56px;
  font-weight: 700;
  margin: 20px 0;
  font-variant-numeric: tabular-nums;
}

.separator {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

.progress-ring {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.progress-ring svg {
  width: 140px;
  height: 140px;
  transform: rotate(-90deg);
}

.progress-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 8;
}

.progress-bar {
  fill: none;
  stroke: white;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 377;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 1s linear;
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 20px 0;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.primary {
  background: white;
  color: #667eea;
}

.btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn.outline {
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.5);
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.session-info {
  text-align: center;
  font-size: 14px;
  opacity: 0.9;
  margin-top: 15px;
}

.total-focus {
  margin-top: 5px;
  font-size: 12px;
  opacity: 0.8;
}

footer {
  margin-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 15px;
}

.settings-toggle {
  text-align: center;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.8;
}

.settings-toggle:hover {
  opacity: 1;
}

.settings-panel {
  display: none;
  margin-top: 15px;
}

.settings-panel.show {
  display: block;
}

.setting {
  margin-bottom: 12px;
}

.setting label {
  display: block;
  font-size: 12px;
  margin-bottom: 4px;
}

.setting input {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
}

.btn.small {
  width: 100%;
  padding: 8px;
  font-size: 12px;
}
```

This CSS creates a beautiful gradient background, smooth animations, and a modern card-based layout that feels native to Chrome.

---

## Implementing the Timer Logic {#implementing-timer-logic}

Now comes the core functionality — the JavaScript that makes the timer work.

```javascript
// State management
let timerState = {
  timeLeft: 25 * 60,
  isRunning: false,
  mode: 'focus', // 'focus', 'shortBreak', 'longBreak'
  sessionCount: 0,
  totalFocusMinutes: 0,
  settings: {
    focusTime: 25,
    shortBreak: 5,
    longBreak: 15
  }
};

let timerInterval = null;

// DOM Elements
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const modeIndicator = document.getElementById('modeIndicator');
const sessionCount = document.getElementById('sessionCount');
const totalFocus = document.getElementById('totalFocus');
const progressBar = document.getElementById('progressBar');
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const saveSettings = document.getElementById('saveSettings');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  updateDisplay();
  setupEventListeners();
});

function setupEventListeners() {
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);
  settingsToggle.addEventListener('click', toggleSettings);
  saveSettings.addEventListener('click', saveSettingsHandler);
}

function loadSettings() {
  chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState) {
      timerState = { ...timerState, ...result.timerState };
      updateDisplay();
    }
  });
}

function saveSettingsToStorage() {
  chrome.storage.local.set({ timerState });
}

function updateDisplay() {
  const minutes = Math.floor(timerState.timeLeft / 60);
  const seconds = timerState.timeLeft % 60;
  
  minutesDisplay.textContent = minutes.toString().padStart(2, '0');
  secondsDisplay.textContent = seconds.toString().padStart(2, '0');
  
  sessionCount.textContent = timerState.sessionCount % 4;
  totalFocus.textContent = timerState.totalFocusMinutes;
  
  updateModeIndicator();
  updateProgressBar();
  updateButtonStates();
}

function updateModeIndicator() {
  const modes = {
    focus: 'Focus Time',
    shortBreak: 'Short Break',
    longBreak: 'Long Break'
  };
  modeIndicator.textContent = modes[timerState.mode];
}

function updateProgressBar() {
  const totalTime = timerState.settings[timerState.mode === 'focus' ? 'focusTime' : 
                   timerState.mode === 'shortBreak' ? 'shortBreak' : 'longBreak'] * 60;
  const progress = (totalTime - timerState.timeLeft) / totalTime;
  const circumference = 2 * Math.PI * 60;
  const offset = circumference * (1 - progress);
  progressBar.style.strokeDashoffset = offset;
}

function updateButtonStates() {
  startBtn.disabled = timerState.isRunning;
  pauseBtn.disabled = !timerState.isRunning;
}

function startTimer() {
  if (timerState.isRunning) return;
  
  timerState.isRunning = true;
  updateButtonStates();
  
  timerInterval = setInterval(() => {
    if (timerState.timeLeft > 0) {
      timerState.timeLeft--;
      
      if (timerState.mode === 'focus') {
        timerState.totalFocusMinutes++;
      }
      
      updateDisplay();
      saveSettingsToStorage();
    } else {
      timerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  if (!timerState.isRunning) return;
  
  timerState.isRunning = false;
  clearInterval(timerInterval);
  updateButtonStates();
  saveSettingsToStorage();
}

function resetTimer() {
  pauseTimer();
  timerState.timeLeft = timerState.settings[
    timerState.mode === 'focus' ? 'focusTime' : 
    timerState.mode === 'shortBreak' ? 'shortBreak' : 'longBreak'
  ] * 60;
  updateDisplay();
  saveSettingsToStorage();
}

function timerComplete() {
  pauseTimer();
  
  // Send notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Pomodoro Timer',
    message: getCompletionMessage()
  });
  
  // Play sound
  playNotificationSound();
  
  // Move to next mode
  switchMode();
}

function getCompletionMessage() {
  if (timerState.mode === 'focus') {
    timerState.sessionCount++;
    if (timerState.sessionCount % 4 === 0) {
      return 'Great work! Time for a long break.';
    }
    return 'Focus session complete! Time for a break.';
  }
  return 'Break is over! Ready to focus?';
}

function playNotificationSound() {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAAAAD//w==');
  audio.play().catch(() => {});
}

function switchMode() {
  if (timerState.mode === 'focus') {
    if (timerState.sessionCount % 4 === 0) {
      timerState.mode = 'longBreak';
      timerState.timeLeft = timerState.settings.longBreak * 60;
    } else {
      timerState.mode = 'shortBreak';
      timerState.timeLeft = timerState.settings.shortBreak * 60;
    }
  } else {
    timerState.mode = 'focus';
    timerState.timeLeft = timerState.settings.focusTime * 60;
  }
  
  updateDisplay();
  saveSettingsToStorage();
}

function toggleSettings() {
  settingsPanel.classList.toggle('show');
}

function saveSettingsHandler() {
  timerState.settings.focusTime = parseInt(document.getElementById('focusTime').value);
  timerState.settings.shortBreak = parseInt(document.getElementById('shortBreak').value);
  timerState.settings.longBreak = parseInt(document.getElementById('longBreak').value);
  
  if (!timerState.isRunning) {
    timerState.timeLeft = timerState.settings[
      timerState.mode === 'focus' ? 'focusTime' : 
      timerState.mode === 'shortBreak' ? 'shortBreak' : 'longBreak'
    ] * 60;
    updateDisplay();
  }
  
  saveSettingsToStorage();
  settingsPanel.classList.remove('show');
}
```

This JavaScript handles all the timer logic, state management, user interactions, and Chrome storage synchronization.

---

## Adding Background Service Worker {#adding-background-service-worker}

The background service worker handles events when the popup is closed and manages alarms for precise timing.

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Pomodoro Timer extension installed');
  
  // Initialize default storage
  chrome.storage.local.set({
    timerState: {
      timeLeft: 25 * 60,
      isRunning: false,
      mode: 'focus',
      sessionCount: 0,
      totalFocusMinutes: 0,
      settings: {
        focusTime: 25,
        shortBreak: 5,
        longBreak: 15
      }
    }
  });
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getState') {
    chrome.storage.local.get(['timerState'], (result) => {
      sendResponse(result.timerState);
    });
    return true;
  }
  
  if (message.action === 'updateState') {
    chrome.storage.local.set({ timerState: message.state });
  }
});

// Badge update for timer display
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    const time = message.time;
    const minutes = Math.floor(time / 60);
    const badgeText = minutes > 0 ? minutes.toString() : '0';
    
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
  }
});
```

The background service worker enables the timer to continue running even when the popup is closed, though for simplicity, our current implementation relies on the popup remaining open.

---

## Testing Your Extension {#testing-your-extension}

Now that you have created all the files, let's test your Pomodoro timer Chrome extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your `pomodoro-timer` folder
4. The extension icon should appear in your Chrome toolbar
5. Click the icon to open the popup and test the timer functionality

You can now start, pause, and reset the timer. The progress ring animates as time passes, and you can customize the focus and break durations in the settings panel.

---

## Understanding the Pomodoro Technique {#understanding-pomodoro-technique}

The Pomodoro Technique is more than just a timer — it's a productivity methodology. Here's how it works:

### The Basic Structure

1. **Focus Session (25 minutes)**: Work on a single task with full concentration
2. **Short Break (5 minutes)**: Take a brief rest to recharge
3. **Long Break (15 minutes)**: After completing four Pomodoro cycles, take a longer break

### Why It Works

The Pomodoro technique leverages several cognitive principles:

- **Time Boxing**: Creating fixed time blocks creates urgency and reduces procrastination
- **Single-Tasking**: Focusing on one task improves quality and reduces context switching
- **Regular Breaks**: Short breaks prevent mental fatigue and maintain high concentration
- **Visible Progress**: Tracking completed Pomodoros provides motivation

### Integrating with Your Extension

Your Chrome extension makes it effortless to practice the Pomodoro technique:

- The timer runs directly in your browser, always accessible
- Notifications alert you when sessions end, even if you're in another tab
- Session tracking helps you monitor your daily productivity
- Customizable durations let you adapt the technique to your preferences

---

## Publishing Your Extension {#publishing-your-extension}

Once you've tested your extension and made any final adjustments, you can publish it to the Chrome Web Store:

1. Create a developer account at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Zip your extension files (excluding the .git folder if present)
3. Upload your extension package
4. Add screenshots, a detailed description, and relevant keywords
5. Submit for review (usually takes a few hours to a few days)

When publishing, use keywords like "chrome extension pomodoro", "pomodoro timer chrome", and "focus timer chrome extension" in your description to improve discoverability.

---

## Future Enhancements {#future-enhancements}

Your Pomodoro timer extension is now complete, but there are many features you could add to make it even more powerful:

- **Statistics Tracking**: Store historical data and show productivity charts
- **Task Integration**: Link Pomodoros to specific tasks or projects
- **Sound Customization**: Allow users to choose different notification sounds
- **Dark Mode**: Add a dark theme option for night-time use
- **Sync Across Devices**: Use Chrome sync storage to maintain state across devices
- **Keyboard Shortcuts**: Add global keyboard shortcuts to control the timer
- **Integration with Trello, Asana, or Notion**: Automatically log completed Pomodoros to task management tools

---

## Conclusion {#conclusion}

You have successfully built a complete Pomodoro timer Chrome extension using Manifest V3. This extension demonstrates key Chrome extension development concepts including:

- Popup interface design with HTML and CSS
- Timer logic and state management in JavaScript
- Chrome storage API for persisting user data
- Browser notifications for timer alerts
- Service workers for background processing

The Pomodoro Technique combined with a custom Chrome extension creates a powerful productivity tool that fits seamlessly into your browser workflow. Whether you're a developer, writer, student, or anyone looking to improve focus, having a timer right in your browser eliminates the friction of switching between apps or using separate timer tools.

Start using your extension today, and experience the power of focused work intervals. Remember: stay focused, take breaks, and watch your productivity soar!

---

If you found this guide helpful, explore more Chrome extension tutorials on our site to continue building your extension development skills. Happy coding!