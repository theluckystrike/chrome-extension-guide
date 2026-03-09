---
layout: post
title: "Build a Time Tracker Chrome Extension: Complete 2025 Developer's Guide"
description: "Learn how to build a time tracker Chrome extension from scratch. This comprehensive guide covers manifest V3, timer functionality, data storage, and productivity optimization for creating powerful time tracking extensions."
date: 2025-01-28
categories: [Chrome Extensions, Productivity]
tags: [chrome-extension, productivity]
keywords: "time tracker extension, time tracking chrome, productivity timer, chrome extension time tracker, build chrome extension, manifest v3"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/28/build-time-tracker-chrome-extension/"
---

# Build a Time Tracker Chrome Extension: Complete 2025 Developer's Guide

Time tracking has become an essential practice for professionals, freelancers, and teams looking to optimize their productivity. With remote work becoming the norm and billable hours mattering more than ever, a well-built time tracker extension can be a game-changer for users across industries. This comprehensive guide walks you through the process of building a fully functional time tracker extension using Chrome's latest Manifest V3 standards.

Whether you are a seasoned developer looking to expand your extension portfolio or a beginner eager to dive into Chrome extension development, this tutorial provides everything you need to create a production-ready time tracking solution. We will cover project setup, core functionality implementation, data persistence, user interface design, and deployment best practices.

---

## Why Build a Time Tracker Chrome Extension {#why-build-time-tracker}

The demand for productivity tools has never been higher, and time tracking applications stand among the most sought-after solutions in the Chrome Web Store. A time tracker extension offers unique advantages over standalone applications because it lives directly in the browser where users spend most of their workday.

Building a time tracker extension in 2025 means working with Manifest V3, which replaced the older Manifest V2 standard. This transition brought significant changes to how extensions operate, including new restrictions on background scripts, modifications to the alarms API, and enhanced privacy controls. Understanding these changes is crucial for creating an extension that passes Chrome's review process and provides a smooth user experience.

The productivity timer market continues to grow as more companies adopt time-based billing and remote work policies. Users need simple, accessible tools that integrate seamlessly with their existing workflows. A Chrome extension meets this need by eliminating the friction of switching between applications or manually tracking time in spreadsheets.

---

## Project Planning and Architecture {#project-planning}

Before writing any code, you need to define the core features your time tracker extension will provide. A basic time tracker should allow users to start and stop timers, view elapsed time, and save tracked sessions. More advanced features might include project categorization, daily and weekly reports, export capabilities, and cross-device synchronization.

For this guide, we will build a comprehensive extension with the following features:

- One-click timer start and stop functionality
- Real-time elapsed time display in the popup
- Project and task categorization
- Local storage for session history
- Daily summary view
- Export data to CSV format

This feature set provides enough complexity to demonstrate advanced concepts while remaining achievable within a single tutorial. You can always expand these features later based on user feedback and market demands.

### Technology Stack

Our time tracker extension will use the following technologies:

- **Manifest V3**: The latest Chrome extension manifest format
- **HTML/CSS/JavaScript**: Standard web technologies for the popup interface
- **Chrome Storage API**: For persisting timer data and user preferences
- **Chrome Alarms API**: For maintaining accurate timing even when the popup is closed
- **Chrome Identity API** (optional): For future OAuth integration

Modern Chrome extension development favors vanilla JavaScript over heavy frameworks, though you can adapt these patterns to React, Vue, or other frameworks if preferred. For this guide, we will use vanilla JavaScript to keep the code accessible and easy to understand.

---

## Setting Up the Project Structure {#project-structure}

Every Chrome extension requires a specific file structure to function correctly. Create a new folder for your project and add the following files:

```
time-tracker-extension/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── LICENSE
```

The manifest.json file serves as the blueprint for your extension, defining its permissions, resources, and behavior. The popup files handle the user interface that appears when users click the extension icon. The background script runs in the background and manages long-running tasks like timer tracking.

Let us examine each file in detail, starting with the manifest.

---

## Creating the Manifest V3 Configuration {#manifest-configuration}

The manifest.json file defines how Chrome should load and interact with your extension. Here is a complete manifest configuration for our time tracker:

```json
{
  "manifest_version": 3,
  "name": "Productivity Timer - Time Tracker",
  "version": "1.0.0",
  "description": "Track your time with ease. A simple yet powerful time tracker for Chrome.",
  "permissions": [
    "storage",
    "alarms",
    "notifications"
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

This manifest requests the minimum permissions necessary for our time tracker to function. The storage permission allows us to save timer data and user preferences. The alarms permission enables accurate timing even when the popup is closed. The notifications permission lets us send reminders when users forget to stop their timers.

Understanding permission scope is crucial for both security and user trust. Always request only the permissions your extension actually needs, and explain to users why each permission is necessary when publishing to the Chrome Web Store.

---

## Building the Popup Interface {#popup-interface}

The popup interface is what users see when they click your extension icon. It needs to be clean, intuitive, and responsive. Let us create a professional-looking popup with all the functionality users expect from a time tracker.

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Productivity Timer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Productivity Timer</h1>
    </header>
    
    <main>
      <div class="timer-display">
        <span id="timer">00:00:00</span>
      </div>
      
      <div class="controls">
        <button id="startBtn" class="btn btn-start">Start Timer</button>
        <button id="stopBtn" class="btn btn-stop" disabled>Stop Timer</button>
      </div>
      
      <div class="project-selector">
        <label for="project">Project:</label>
        <select id="project">
          <option value="general">General</option>
          <option value="work">Work</option>
          <option value="personal">Personal</option>
          <option value="custom">Custom...</option>
        </select>
      </div>
      
      <div class="task-input">
        <input type="text" id="task" placeholder="What are you working on?">
      </div>
      
      <div class="stats">
        <h3>Today's Summary</h3>
        <p>Total: <span id="todayTotal">0h 0m</span></p>
        <p>Sessions: <span id="sessionCount">0</span></p>
      </div>
      
      <div class="actions">
        <button id="exportBtn" class="btn btn-secondary">Export Data</button>
        <button id="clearBtn" class="btn btn-danger">Clear All</button>
      </div>
    </main>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides a complete user interface with timer display, control buttons, project selection, task input, daily statistics, and action buttons. The design follows standard accessibility practices with proper labels and semantic markup.

### Styling the Popup

The CSS should be clean, modern, and consistent with Chrome's design language. Users spend their entire workday in browsers, so familiarity and comfort matter.

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
}

.timer-display {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

#timer {
  font-size: 36px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #202124;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-start {
  background: #1a73e8;
  color: white;
}

.btn-start:hover {
  background: #1557b0;
}

.btn-stop {
  background: #ea4335;
  color: white;
}

.btn-stop:hover {
  background: #c5221f;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e8f0fe;
  color: #1a73e8;
}

.btn-danger {
  background: #fce8e6;
  color: #ea4335;
}

.project-selector, .task-input {
  margin-bottom: 16px;
}

label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #5f6368;
}

select, input {
  width: 100%;
  padding: 10px;
  border: 1px solid #dadce0;
  border-radius: 6px;
  font-size: 14px;
}

select:focus, input:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26,115,232,0.2);
}

.stats {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stats h3 {
  font-size: 14px;
  margin-bottom: 8px;
  color: #5f6368;
}

.stats p {
  font-size: 13px;
  margin-bottom: 4px;
  color: #202124;
}

.actions {
  display: flex;
  gap: 10px;
}
```

This CSS provides a polished, professional appearance that feels native to the Chrome environment. The design uses a subtle color palette, clear typography, and appropriate spacing to create an interface users will enjoy using throughout their workday.

---

## Implementing Core Timer Logic {#timer-logic}

The JavaScript files handle the actual functionality of the extension. We need to split our code between the popup script (which handles user interactions) and the background script (which maintains the timer when the popup is closed).

### Background Service Worker

The background script runs continuously in the background, managing timer state even when the popup is closed. This is crucial for accurate time tracking.

```javascript
// background.js

let timerInterval = null;
let startTime = null;
let elapsedTime = 0;
let currentProject = 'general';
let currentTask = '';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_TIMER':
      startTimer(message.project, message.task);
      break;
    case 'STOP_TIMER':
      stopTimer();
      break;
    case 'GET_TIMER_STATE':
      sendResponse(getTimerState());
      break;
    case 'UPDATE_PROJECT':
      currentProject = message.project;
      break;
    case 'UPDATE_TASK':
      currentTask = message.task;
      break;
  }
  return true;
});

function startTimer(project, task) {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  currentProject = project || currentProject;
  currentTask = task || currentTask;
  startTime = Date.now() - elapsedTime;
  
  // Use chrome.alarms for more accurate timing
  chrome.alarms.create('timerTick', { periodInMinutes: 0.1 });
  
  timerInterval = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    saveTimerState();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  chrome.alarms.clear('timerTick');
  
  if (elapsedTime > 0) {
    saveSession();
  }
  
  elapsedTime = 0;
  startTime = null;
  saveTimerState();
}

function saveSession() {
  const session = {
    id: Date.now(),
    project: currentProject,
    task: currentTask,
    duration: elapsedTime,
    startTime: startTime,
    endTime: Date.now(),
    date: new Date().toISOString().split('T')[0]
  };
  
  chrome.storage.local.get(['sessions'], (result) => {
    const sessions = result.sessions || [];
    sessions.push(session);
    chrome.storage.local.set({ sessions });
  });
}

function getTimerState() {
  return {
    isRunning: timerInterval !== null,
    elapsedTime,
    startTime,
    currentProject,
    currentTask
  };
}

function saveTimerState() {
  chrome.storage.local.set({
    timerState: {
      isRunning: timerInterval !== null,
      elapsedTime,
      startTime,
      currentProject,
      currentTask
    }
  });
}

// Restore timer state on extension load
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState && result.timerState.isRunning) {
      startTime = result.timerState.startTime;
      elapsedTime = result.timerState.elapsedTime;
      currentProject = result.timerState.currentProject;
      currentTask = result.timerState.currentTask;
      
      if (elapsedTime > 0) {
        startTimer(currentProject, currentTask);
      }
    }
  });
});
```

This background script manages the core timer functionality, ensuring accurate tracking even when the popup is closed. It uses Chrome's storage API to persist state and the alarms API for reliable timing.

### Popup Script

The popup script handles user interactions and updates the interface based on timer state.

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const timerDisplay = document.getElementById('timer');
  const projectSelect = document.getElementById('project');
  const taskInput = document.getElementById('task');
  const todayTotal = document.getElementById('todayTotal');
  const sessionCount = document.getElementById('sessionCount');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  
  let isRunning = false;
  let elapsedTime = 0;
  
  // Initialize
  loadTimerState();
  updateTodayStats();
  
  // Event Listeners
  startBtn.addEventListener('click', () => {
    const project = projectSelect.value;
    const task = taskInput.value;
    
    chrome.runtime.sendMessage({
      type: 'START_TIMER',
      project,
      task
    });
    
    isRunning = true;
    updateButtonStates();
  });
  
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
    
    isRunning = false;
    elapsedTime = 0;
    updateButtonStates();
    updateTodayStats();
  });
  
  projectSelect.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_PROJECT',
      project: e.target.value
    });
  });
  
  taskInput.addEventListener('input', (e) => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_TASK',
      task: e.target.value
    });
  });
  
  exportBtn.addEventListener('click', exportData);
  clearBtn.addEventListener('click', clearAllData);
  
  // Update timer display every second
  setInterval(() => {
    if (isRunning) {
      loadTimerState();
    }
  }, 1000);
  
  function loadTimerState() {
    chrome.runtime.sendMessage({ type: 'GET_TIMER_STATE' }, (state) => {
      if (state) {
        elapsedTime = state.elapsedTime;
        isRunning = state.isRunning;
        
        if (state.currentProject) {
          projectSelect.value = state.currentProject;
        }
        if (state.currentTask) {
          taskInput.value = state.currentTask;
        }
        
        timerDisplay.textContent = formatTime(elapsedTime);
        updateButtonStates();
      }
    });
  }
  
  function updateButtonStates() {
    startBtn.disabled = isRunning;
    stopBtn.disabled = !isRunning;
  }
  
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return [hours, minutes, seconds]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
  }
  
  function updateTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions || [];
      const todaySessions = sessions.filter(s => s.date === today);
      
      const totalMs = todaySessions.reduce((sum, s) => sum + s.duration, 0);
      const hours = Math.floor(totalMs / 3600000);
      const minutes = Math.floor((totalMs % 3600000) / 60000);
      
      todayTotal.textContent = `${hours}h ${minutes}m`;
      sessionCount.textContent = todaySessions.length;
    });
  }
  
  function exportData() {
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions || [];
      
      if (sessions.length === 0) {
        alert('No data to export');
        return;
      }
      
      let csv = 'Date,Project,Task,Duration (hours),Start Time,End Time\n';
      
      sessions.forEach(session => {
        const hours = (session.duration / 3600000).toFixed(2);
        const date = session.date;
        const project = session.project || 'General';
        const task = session.task || '';
        const startTime = new Date(session.startTime).toLocaleTimeString();
        const endTime = new Date(session.endTime).toLocaleTimeString();
        
        csv += `${date},"${project}","${task}",${hours},${startTime},${endTime}\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-tracker-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  
  function clearAllData() {
    if (confirm('Are you sure you want to clear all tracked data? This cannot be undone.')) {
      chrome.storage.local.set({ sessions: [] }, () => {
        updateTodayStats();
        alert('All data has been cleared.');
      });
    }
  }
});
```

This popup script provides a complete user experience with real-time timer updates, project selection, task input, daily statistics, and data export functionality.

---

## Creating Extension Icons {#extension-icons}

Every Chrome extension needs icon images in various sizes. These icons appear in the Chrome toolbar, the Extensions管理 page, and the Chrome Web Store. Create simple icons using any image editing tool, or generate them programmatically using a canvas-based approach.

For a time tracker extension, consider icons that convey the concept of time: clocks, timers, stopwatches, or hourglasses. Use a consistent color scheme that matches your extension's branding.

The required icon sizes are:
- 16x16 pixels (toolbar)
- 48x48 pixels (extensions management page)
- 128x128 pixels (Chrome Web Store)

---

## Testing Your Extension {#testing}

Before publishing, thoroughly test your extension to ensure it functions correctly. Chrome provides developer tools specifically for extension development.

### Loading Your Extension

To test your extension in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension folder
4. The extension icon should appear in your Chrome toolbar

### Common Testing Scenarios

Test the following scenarios to ensure robust functionality:

- Starting and stopping the timer multiple times
- Closing and reopening the popup while the timer runs
- Refreshing the extension page
- Checking that elapsed time is accurate
- Verifying that sessions are saved correctly
- Testing the export functionality
- Checking that data persists after browser restart

Use Chrome's developer tools to debug any issues. You can access extension logs through the service worker view in the extensions management page.

---

## Publishing Your Extension {#publishing}

Once your extension is tested and working, you can publish it to the Chrome Web Store. The publishing process involves creating a developer account, preparing your store listing, and submitting for review.

### Developer Account Setup

Create a developer account through the Google Chrome Web Store developer dashboard. There is a one-time registration fee that helps maintain the ecosystem quality.

### Store Listing Preparation

Your store listing should include:
- A compelling title and description
- Screenshots demonstrating the extension in action
- A promotional tile image
- Clear privacy policy disclosure
- Appropriate category and region selections

### Review Process

Chrome reviews extensions for policy compliance, functionality, and user experience. The review typically takes a few days, though it may take longer for new or complex extensions.

---

## Advanced Features to Consider {#advanced-features}

Once your basic time tracker is working, consider adding these advanced features to make your extension stand out:

- **Pomodoro Technique Support**: Add built-in breaks and focus sessions
- **Idle Detection**: Pause timer when user is inactive
- **Integrations**: Connect with tools like Trello, Asana, or Jira
- **Cloud Sync**: Synchronize data across devices
- **Reports and Analytics**: Provide visual insights into time usage
- **Team Features**: Allow sharing and collaboration

---

## Conclusion {#conclusion}

Building a time tracker Chrome extension is an excellent project that teaches you valuable skills in extension development while creating a genuinely useful tool. The Manifest V3 architecture provides a modern, secure foundation for building productivity applications that integrate seamlessly with users' daily workflows.

This guide covered the essential components of a production-ready time tracker: project structure, manifest configuration, user interface design, timer logic, data persistence, and testing procedures. With these fundamentals in place, you have everything needed to create a successful Chrome extension.

Remember to focus on user experience, performance, and privacy throughout development. Users trust extensions with their data, and earning that trust through transparent, reliable functionality is key to long-term success.

Start building your time tracker extension today, and join the ecosystem of developers creating tools that help people work smarter and achieve more.
