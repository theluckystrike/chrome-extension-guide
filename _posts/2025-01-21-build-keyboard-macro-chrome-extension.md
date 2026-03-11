---
layout: post
title: "Build a Keyboard Macro Chrome Extension: Complete 2025 Guide"
description: "Learn how to build a powerful keyboard macro extension for Chrome. This comprehensive guide covers macro recording, playback, automation shortcuts, and advanced features using Manifest V3."
date: 2025-01-21
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "keyboard macro extension, macro recorder chrome, automation shortcuts extension, chrome macro automation, chrome extension automation"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/21/build-keyboard-macro-chrome-extension/"
---

# Build a Keyboard Macro Chrome Extension: Complete 2025 Guide

Keyboard macros are powerful automation tools that can transform your productivity by allowing you to record and replay sequences of keystrokes and mouse actions. Whether you need to automate repetitive form filling, execute complex browser workflows, or create custom shortcuts for daily tasks, building a keyboard macro Chrome extension provides an elegant solution that runs directly in your browser.

This comprehensive guide walks you through creating a fully functional keyboard macro extension using Chrome's modern APIs and Manifest V3 architecture. By the end of this tutorial, you'll have a production-ready extension capable of recording user actions, saving macro sequences, and replaying them with customizable triggers.

---

## Understanding Keyboard Macros in Chrome Extensions {#understanding-keyboard-macros}

A keyboard macro is a sequence of inputs that can be recorded once and played back multiple times. Unlike simple keyboard shortcuts that trigger a single action, macros can encompass complex workflows including typing text, clicking elements, navigating pages, and even waiting for specific conditions.

### Why Build a Macro Recorder Extension?

The demand for **keyboard macro extension** solutions has grown significantly as users seek ways to automate repetitive browser tasks. Building a **macro recorder Chrome** extension offers several compelling advantages:

- **Productivity Enhancement**: Automate repetitive tasks like filling forms, generating reports, or navigating through multi-step workflows
- **Error Reduction**: Eliminate human error from repetitive typing by using precise macro playback
- **Accessibility**: Create custom input sequences for users with accessibility needs
- **Workflow Optimization**: Build personalized automation shortcuts extension features that match specific job requirements

### Technical Challenges and Considerations

Building a robust macro recorder presents unique technical challenges that distinguish it from typical Chrome extensions:

1. **Input Capture Complexity**: Recording keyboard and mouse events requires careful event handling across different contexts
2. **Playback Synchronization**: Replaying macros requires precise timing control and handling of dynamic page content
3. **Storage Management**: Macros can contain substantial data requiring efficient storage solutions
4. **Security Boundaries**: Working within Chrome's security model while providing powerful automation capabilities

---

## Project Architecture and File Structure {#project-architecture}

Let's organize our keyboard macro extension with a clean, maintainable structure:

```
keyboard-macro-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── background.js
├── content/
│   └── content.js
├── utils/
│   ├── recorder.js
│   ├── player.js
│   └── storage.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

This architecture separates concerns effectively: the popup handles user interface, the background script manages global state and storage, content scripts capture page interactions, and utility modules handle recording and playback logic.

---

## Manifest Configuration {#manifest-configuration}

The manifest.json file defines our extension's capabilities and permissions. For a macro recorder, we need careful permission selection:

```json
{
  "manifest_version": 3,
  "name": "Keyboard Macro Recorder",
  "version": "1.0.0",
  "description": "Record and replay keyboard macros and automation sequences",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

The permissions selected here balance functionality with security:
- **storage**: Required for saving recorded macros
- **activeTab**: Ensures we can interact with the current tab
- **scripting**: Allows us to inject and execute scripts for macro playback
- **host_permissions**: Needed because macros may need to work across different websites

---

## Core Recording Module {#recording-module}

The recorder.js module handles capturing keyboard and mouse events. This is the heart of our **macro recorder chrome** functionality:

```javascript
// utils/recorder.js

class MacroRecorder {
  constructor() {
    this.isRecording = false;
    this.events = [];
    this.startTime = null;
    this.keyStates = new Map();
  }

  startRecording() {
    this.isRecording = true;
    this.events = [];
    this.startTime = Date.now();
    this.keyStates.clear();
    console.log('[MacroRecorder] Recording started');
  }

  stopRecording() {
    this.isRecording = false;
    console.log(`[MacroRecorder] Recording stopped. Captured ${this.events.length} events`);
    return this.events;
  }

  recordKeyboardEvent(event) {
    if (!this.isRecording) return;

    const keyEvent = {
      type: 'keyboard',
      eventType: event.type,
      key: event.key,
      code: event.code,
      keyCode: event.keyCode,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      timestamp: Date.now() - this.startTime,
      repeat: event.repeat
    };

    // Don't record modifier-only keys
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
      this.events.push(keyEvent);
    }
  }

  recordMouseEvent(event, targetInfo) {
    if (!this.isRecording) return;

    const mouseEvent = {
      type: 'mouse',
      eventType: event.type,
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      buttons: event.buttons,
      timestamp: Date.now() - this.startTime,
      target: targetInfo
    };

    // Only record click events, not mouse movement
    if (['mousedown', 'mouseup', 'click'].includes(event.type)) {
      this.events.push(mouseEvent);
    }
  }

  recordScrollEvent(scrollData) {
    if (!this.isRecording) return;

    const scrollEvent = {
      type: 'scroll',
      x: scrollData.x,
      y: scrollData.y,
      timestamp: Date.now() - this.startTime
    };

    this.events.push(scrollEvent);
  }

  getRecordedEvents() {
    return this.events;
  }

  clearEvents() {
    this.events = [];
    this.startTime = null;
  }
}

window.MacroRecorder = MacroRecorder;
```

This recorder captures essential event data while filtering out unnecessary noise like mouse movements. The timestamp tracking is crucial for accurate playback timing.

---

## Macro Playback Module {#playback-module}

The player.js module handles replaying recorded macros with precise timing:

```javascript
// utils/player.js

class MacroPlayer {
  constructor() {
    this.isPlaying = false;
    this.currentEventIndex = 0;
    this.events = [];
    this.playbackSpeed = 1.0;
    this.onComplete = null;
    this.onProgress = null;
  }

  async play(events, options = {}) {
    if (this.isPlaying) {
      console.warn('[MacroPlayer] Already playing');
      return;
    }

    this.events = events;
    this.currentEventIndex = 0;
    this.playbackSpeed = options.speed || 1.0;
    this.onComplete = options.onComplete || null;
    this.onProgress = options.onProgress || null;
    this.isPlaying = true;

    console.log(`[MacroPlayer] Starting playback of ${events.length} events`);

    try {
      await this.executeEventLoop();
    } catch (error) {
      console.error('[MacroPlayer] Playback error:', error);
    } finally {
      this.isPlaying = false;
    }
  }

  async executeEventLoop() {
    const startTimestamp = Date.now();

    while (this.currentEventIndex < this.events.length) {
      if (!this.isPlaying) break;

      const event = this.events[this.currentEventIndex];
      const targetTime = (event.timestamp / this.playbackSpeed);
      const elapsed = Date.now() - startTimestamp;
      const waitTime = Math.max(0, targetTime - elapsed);

      if (waitTime > 0) {
        await this.delay(waitTime);
      }

      if (!this.isPlaying) break;

      await this.executeEvent(event);
      this.currentEventIndex++;

      if (this.onProgress) {
        this.onProgress({
          current: this.currentEventIndex,
          total: this.events.length,
          percentage: (this.currentEventIndex / this.events.length) * 100
        });
      }
    }

    if (this.onComplete) {
      this.onComplete();
    }

    console.log('[MacroPlayer] Playback complete');
  }

  async executeEvent(event) {
    switch (event.type) {
      case 'keyboard':
        await this.simulateKeyboard(event);
        break;
      case 'mouse':
        await this.simulateMouse(event);
        break;
      case 'scroll':
        await this.simulateScroll(event);
        break;
    }
  }

  async simulateKeyboard(event) {
    const message = {
      action: 'simulateKeyboard',
      event: event
    };

    // Send to content script for execution
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, message);
    }
  }

  async simulateMouse(event) {
    const message = {
      action: 'simulateMouse',
      event: event
    };

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, message);
    }
  }

  async simulateScroll(event) {
    const message = {
      action: 'simulateScroll',
      event: event
    };

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, message);
    }
  }

  stop() {
    this.isPlaying = false;
    console.log('[MacroPlayer] Playback stopped');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

window.MacroPlayer = MacroPlayer;
```

The player executes events with timing precision, allowing speed adjustments for different use cases. Communication with content scripts enables actual event simulation in the page context.

---

## Content Script for Event Capture {#content-script}

The content script runs in the context of web pages and captures user interactions:

```javascript
// content/content.js

let recorder = null;
let player = null;

// Initialize components when extension sends messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'initRecorder':
      initRecorder();
      break;
    case 'startRecording':
      if (recorder) recorder.startRecording();
      break;
    case 'stopRecording':
      if (recorder) {
        const events = recorder.stopRecording();
        sendResponse({ events: events });
      }
      break;
    case 'playMacro':
      if (player && message.events) {
        player.play(message.events, {
          speed: message.speed || 1.0,
          onComplete: () => sendResponse({ status: 'complete' }),
          onProgress: (progress) => {
            chrome.runtime.sendMessage({
              action: 'playbackProgress',
              progress: progress
            });
          }
        });
      }
      break;
    case 'stopPlayback':
      if (player) player.stop();
      break;
    case 'simulateKeyboard':
      simulateKeyboardEvent(message.event);
      break;
    case 'simulateMouse':
      simulateMouseEvent(message.event);
      break;
    case 'simulateScroll':
      simulateScrollEvent(message.event);
      break;
  }
});

function initRecorder() {
  recorder = new window.MacroRecorder();
  player = new window.MacroPlayer();

  // Set up event listeners
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);
  document.addEventListener('mousedown', handleMouseDown, true);
  document.addEventListener('mouseup', handleMouseUp, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('scroll', handleScroll, true);
}

function handleKeyDown(event) {
  if (recorder && recorder.isRecording) {
    recorder.recordKeyboardEvent(event);
  }
}

function handleKeyUp(event) {
  if (recorder && recorder.isRecording) {
    recorder.recordKeyboardEvent(event);
  }
}

function handleMouseDown(event) {
  if (recorder && recorder.isRecording) {
    const targetInfo = getElementInfo(event.target);
    recorder.recordMouseEvent(event, targetInfo);
  }
}

function handleMouseUp(event) {
  if (recorder && recorder.isRecording) {
    const targetInfo = getElementInfo(event.target);
    recorder.recordMouseEvent(event, targetInfo);
  }
}

function handleClick(event) {
  if (recorder && recorder.isRecording) {
    const targetInfo = getElementInfo(event.target);
    recorder.recordMouseEvent(event, targetInfo);
  }
}

function handleScroll(event) {
  if (recorder && recorder.isRecording) {
    recorder.recordScrollEvent({
      x: window.scrollX,
      y: window.scrollY
    });
  }
}

function getElementInfo(element) {
  if (!element) return null;

  // Build a selector path for the element
  const path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return {
    tag: element.tagName?.toLowerCase(),
    id: element.id,
    className: element.className,
    text: element.textContent?.substring(0, 50),
    selector: path.join(' > ')
  };
}

// Event simulation functions
function simulateKeyboardEvent(event) {
  const keyboardEvent = new KeyboardEvent(event.eventType, {
    key: event.key,
    code: event.code,
    keyCode: event.keyCode,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    bubbles: true,
    cancelable: true
  });

  document.activeElement.dispatchEvent(keyboardEvent);
}

function simulateMouseEvent(event) {
  const mouseEvent = new MouseEvent(event.eventType, {
    clientX: event.x,
    clientY: event.y,
    button: event.button,
    buttons: event.buttons,
    bubbles: true,
    cancelable: true
  });

  // Try to find the target element if we have selector info
  if (event.target && event.target.selector) {
    try {
      const element = document.querySelector(event.target.selector);
      if (element) {
        element.dispatchEvent(mouseEvent);
        return;
      }
    } catch (e) {
      console.log('Selector not found, using coordinates');
    }
  }

  // Fallback to dispatching at coordinates
  document.elementFromPoint(event.x, event.y)?.dispatchEvent(mouseEvent);
}

function simulateScrollEvent(event) {
  window.scrollTo(event.x, event.y);
}
```

This content script bridges the gap between Chrome's extension APIs and the web page environment, enabling both recording and playback functionality.

---

## Popup Interface {#popup-interface}

The popup provides the user interface for controlling the macro recorder:

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Keyboard Macro Recorder</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Macro Recorder</h1>
    </header>

    <main>
      <div class="controls">
        <button id="recordBtn" class="btn btn-record">
          <span class="icon">●</span> Record
        </button>
        <button id="stopBtn" class="btn btn-stop" disabled>
          <span>■</span> Stop
        </button>
        <button id="playBtn" class="btn btn-play" disabled>
          <span>▶</span> Play
        </button>
      </div>

      <div class="status" id="status">
        Ready to record
      </div>

      <div class="progress-bar" id="progressBar" style="display: none;">
        <div class="progress-fill" id="progressFill"></div>
      </div>

      <section class="macros-list">
        <h2>Saved Macros</h2>
        <div id="macrosContainer">
          <p class="empty-state">No macros saved yet</p>
        </div>
      </section>

      <section class="settings">
        <label>
          Playback Speed:
          <select id="speedSelect">
            <option value="0.5">0.5x (Slow)</option>
            <option value="1" selected>1x (Normal)</option>
            <option value="2">2x (Fast)</option>
            <option value="5">5x (Very Fast)</option>
          </select>
        </label>
      </section>
    </main>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

The popup includes essential controls for recording, stopping, and playing back macros, along with a list of saved macros and speed controls.

---

## Popup JavaScript Logic {#popup-javascript}

The popup.js handles user interactions and communicates with the background script:

```javascript
// popup/popup.js

document.addEventListener('DOMContentLoaded', () => {
  const recordBtn = document.getElementById('recordBtn');
  const stopBtn = document.getElementById('stopBtn');
  const playBtn = document.getElementById('playBtn');
  const status = document.getElementById('status');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const macrosContainer = document.getElementById('macrosContainer');
  const speedSelect = document.getElementById('speedSelect');

  let currentEvents = [];
  let isRecording = false;
  let isPlaying = false;

  // Load saved macros
  loadMacros();

  // Button event listeners
  recordBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecording);
  playBtn.addEventListener('click', playMacro);

  async function startRecording() {
    status.textContent = 'Recording...';
    isRecording = true;
    updateButtonStates();

    // Send message to content script to start recording
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'startRecording' });
    }
  }

  async function stopRecording() {
    status.textContent = 'Processing...';
    isRecording = false;
    updateButtonStates();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      // Request events from content script
      chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' }, (response) => {
        if (response && response.events) {
          currentEvents = response.events;
          status.textContent = `Recorded ${currentEvents.length} events`;
          playBtn.disabled = currentEvents.length === 0;
          
          if (currentEvents.length > 0) {
            saveMacroPrompt();
          }
        }
      });
    }
  }

  async function playMacro() {
    if (currentEvents.length === 0) return;

    status.textContent = 'Playing...';
    isPlaying = true;
    updateButtonStates();
    progressBar.style.display = 'block';

    const speed = parseFloat(speedSelect.value);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'playMacro',
        events: currentEvents,
        speed: speed
      }, (response) => {
        status.textContent = 'Playback complete';
        isPlaying = false;
        updateButtonStates();
        progressBar.style.display = 'none';
      });
    }
  }

  function updateButtonStates() {
    recordBtn.disabled = isRecording || isPlaying;
    stopBtn.disabled = !isRecording;
    playBtn.disabled = isRecording || isPlaying || currentEvents.length === 0;
  }

  function saveMacroPrompt() {
    const name = prompt('Enter a name for this macro:');
    if (name) {
      saveMacro(name, currentEvents);
    }
  }

  async function saveMacro(name, events) {
    const macro = {
      id: Date.now().toString(),
      name: name,
      events: events,
      createdAt: new Date().toISOString()
    };

    const result = await chrome.storage.local.get(['macros']);
    const macros = result.macros || [];
    macros.push(macro);
    await chrome.storage.local.set({ macros: macros });
    
    loadMacros();
    status.textContent = `Macro "${name}" saved`;
  }

  async function loadMacros() {
    const result = await chrome.storage.local.get(['macros']);
    const macros = result.macros || [];

    if (macros.length === 0) {
      macrosContainer.innerHTML = '<p class="empty-state">No macros saved yet</p>';
      return;
    }

    macrosContainer.innerHTML = macros.map(macro => `
      <div class="macro-item" data-id="${macro.id}">
        <div class="macro-info">
          <span class="macro-name">${escapeHtml(macro.name)}</span>
          <span class="macro-date">${new Date(macro.createdAt).toLocaleDateString()}</span>
        </div>
        <div class="macro-actions">
          <button class="btn-small load-btn" data-events='${JSON.stringify(macro.events)}'>Load</button>
          <button class="btn-small delete-btn" data-id="${macro.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for loaded macros
    macrosContainer.querySelectorAll('.load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentEvents = JSON.parse(e.target.dataset.events);
        playBtn.disabled = false;
        status.textContent = `Loaded: ${e.target.closest('.macro-item').querySelector('.macro-name').textContent}`;
      });
    });

    macrosContainer.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await deleteMacro(id);
      });
    });
  }

  async function deleteMacro(id) {
    const result = await chrome.storage.local.get(['macros']);
    const macros = result.macros || [];
    const filtered = macros.filter(m => m.id !== id);
    await chrome.storage.local.set({ macros: filtered });
    loadMacros();
    status.textContent = 'Macro deleted';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
```

The popup provides a complete user interface for managing macros, including saving, loading, and deleting recorded sequences.

---

## Background Service Worker {#background-worker}

The background script handles initialization and coordination:

```javascript
// background/background.js

// Initialize content script when extension loads
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'playbackProgress':
      // Forward progress to popup if needed
      break;
    case 'recordingStarted':
      console.log('[Background] Recording started');
      break;
    case 'recordingStopped':
      console.log('[Background] Recording stopped');
      break;
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // Open popup instead (default behavior)
});
```

---

## Styling the Popup {#popup-styling}

Add attractive styling to make the extension user-friendly:

```css
/* popup/popup.css */

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  background: #f5f5f5;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  margin-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 12px;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
}

.controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-record {
  background: #ea4335;
  color: white;
}

.btn-record:hover:not(:disabled) {
  background: #d33426;
}

.btn-stop {
  background: #fbbc04;
  color: #333;
}

.btn-stop:hover:not(:disabled) {
  background: #f9a825;
}

.btn-play {
  background: #34a853;
  color: white;
}

.btn-play:hover:not(:disabled) {
  background: #2d8e47;
}

.status {
  text-align: center;
  padding: 8px;
  background: white;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #666;
  border: 1px solid #e0e0e0;
}

.progress-bar {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin-bottom: 16px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1a73e8;
  width: 0%;
  transition: width 0.1s linear;
}

.macros-list {
  margin-bottom: 16px;
}

.macros-list h2 {
  font-size: 14px;
  margin-bottom: 8px;
  color: #555;
}

.macro-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.macro-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.macro-name {
  font-weight: 500;
  font-size: 14px;
}

.macro-date {
  font-size: 11px;
  color: #888;
}

.macro-actions {
  display: flex;
  gap: 4px;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.btn-small:hover {
  background: #f5f5f5;
}

.btn-small.delete-btn {
  color: #ea4335;
  border-color: #ea4335;
}

.empty-state {
  text-align: center;
  color: #888;
  font-size: 13px;
  padding: 16px;
}

.settings {
  border-top: 1px solid #e0e0e0;
  padding-top: 12px;
}

.settings label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.settings select {
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 13px;
}
```

---

## Advanced Features and Best Practices {#advanced-features}

### Adding Keyboard Shortcut Triggers

To make your **automation shortcuts extension** more powerful, add trigger configuration:

```javascript
// In popup.js - add shortcut trigger configuration
async function configureShortcut(macroId) {
  // Request a keyboard shortcut from the user
  const shortcut = await chrome.commands.getAll();
  // Store the shortcut association with the macro
}
```

### Error Handling and Edge Cases

Implement robust error handling for a reliable extension:

```javascript
// Add to content script
window.addEventListener('error', (event) => {
  console.error('[Macro Extension] Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Macro Extension] Unhandled rejection:', event.reason);
});
```

### Performance Optimization

For large macro recordings, implement pagination and lazy loading:

```javascript
async function exportMacro(macro, format = 'json') {
  if (format === 'json') {
    return JSON.stringify(macro);
  }
  
  if (format === 'compressed') {
    const json = JSON.stringify(macro);
    // Use compression for large macros
    return compress(json);
  }
}
```

---

## Testing Your Extension {#testing}

Before publishing, thoroughly test your extension:

1. **Load Unpacked**: Use Chrome's Developer Mode to load your extension
2. **Test Recording**: Record macros on different websites
3. **Test Playback**: Verify accurate replay across various page states
4. **Test Edge Cases**: Handle page reloads, navigation, and dynamic content

---

## Publishing to Chrome Web Store {#publishing}

When ready to publish, prepare your store listing:

- Create compelling screenshots showcasing macro recording and playback
- Write clear descriptions highlighting key features
- Select appropriate categories and tags
- Configure pricing (free or paid)

---

## Conclusion {#conclusion}

Building a **keyboard macro Chrome extension** is an excellent project that demonstrates advanced Chrome extension capabilities. This guide covered the essential components: event recording, storage management, playback engine, and user interface.

Your macro recorder extension now has the foundation for powerful browser automation. Users can record repetitive tasks, save them with descriptive names, and replay them with customizable speed settings. This functionality directly addresses the growing demand for **automation shortcuts extension** tools that improve productivity.

Remember to handle edge cases carefully, test extensively across different websites, and gather user feedback for continuous improvement. With Chrome's modern APIs and Manifest V3, you have everything needed to create a professional-grade automation tool that can significantly enhance users' browsing productivity.

---

## Additional Resources {#resources}

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Storage API Reference](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Scripting API Documentation](https://developer.chrome.com/docs/extensions/reference/scripting/)
