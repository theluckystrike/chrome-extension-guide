---
layout: post
title: "Build an Event Logger Chrome Extension: Complete Developer Guide"
description: "Learn how to build a powerful event logger Chrome extension that captures DOM events, JavaScript events, and helps debug interactive elements. Complete tutorial with code examples and best practices."
date: 2025-01-27
categories: [Chrome Extensions]
tags: [chrome-extension, developer-tools]
keywords: "event logger extension, dom event chrome, javascript events debugger"
---

# Build an Event Logger Chrome Extension: Complete Developer Guide

Creating an event logger Chrome extension is one of the most useful projects you can undertake as a Chrome extension developer. Whether you are debugging complex web applications, understanding user interactions, or building developer tools, having a robust event logging capability can save countless hours of development time. In this comprehensive guide, we will walk through the complete process of building a production-ready event logger extension that can capture DOM events, JavaScript events, and provide a powerful debugging interface for developers.

The ability to monitor and log events in real-time across any web page opens up tremendous possibilities for debugging and understanding web application behavior. Unlike traditional debugging methods that require setting individual breakpoints, an event logger extension provides a comprehensive view of all interactions happening on a page, making it invaluable for troubleshooting intermittent issues, analyzing user behavior, and understanding how different parts of your application interact.

---

## Understanding the Event Logger Extension Architecture {#architecture}

Before diving into code, it is essential to understand the architecture of a well-designed event logger extension. The extension we will build consists of several key components that work together to provide a seamless debugging experience.

The core architecture comprises a content script that runs within the context of web pages and intercepts DOM events, a background service worker that manages the extension's lifecycle and handles communication between components, a popup interface for quick access to logging controls, and a DevTools panel for comprehensive event analysis. This multi-component approach ensures that the extension can capture events from any web page while providing a powerful interface for analyzing the captured data.

Understanding how these components interact is crucial for building a reliable extension. The content script acts as the primary event capture mechanism, using JavaScript's event delegation and bubbling capabilities to intercept events at various points in the DOM tree. The background service worker maintains the extension's state and can handle long-running logging sessions without interfering with page performance. The popup and DevTools panel provide the user interface for controlling the logger and viewing the captured events.

---

## Setting Up the Project Structure {#project-setup}

Every Chrome extension begins with a manifest file that defines the extension's capabilities and permissions. For our event logger extension, we need to carefully specify the permissions required for accessing web page content and interacting with DevTools.

Create a new directory for your extension and add the following manifest.json file:

```json
{
  "manifest_version": 3,
  "name": "Event Logger - JavaScript Events Debugger",
  "version": "1.0.0",
  "description": "A powerful event logger Chrome extension for capturing and analyzing DOM events, JavaScript events, and user interactions on any web page.",
  "permissions": [
    "activeTab",
    "scripting",
    "devtools_page"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ],
  "devtools_page": "devtools.html",
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest file defines several critical components. The host_permissions with "<all_urls>" allows the extension to run on any website, which is essential for a universal event logger. The content_scripts configuration ensures our event capture script runs at document_start, allowing us to catch early page load events. The devtools_page permission enables our custom DevTools panel.

---

## Building the Content Script for Event Capture {#content-script}

The content script is the heart of our event logger extension. It runs within the context of each web page and is responsible for capturing all DOM events and JavaScript events that occur on the page. This script must be carefully designed to minimize performance impact while providing comprehensive event coverage.

Create content.js with the following implementation:

```javascript
// Event Logger Chrome Extension - Content Script
// Captures DOM events and JavaScript events on web pages

class EventLogger {
  constructor() {
    this.events = [];
    this.isLogging = true;
    this.maxEvents = 1000;
    this.eventTypes = new Set();
    this.filteredTypes = new Set();
    this.customListeners = new Map();
    this.init();
  }

  init() {
    // Capture native DOM events using event delegation
    this.setupEventDelegation();
    
    // Override addEventListener to capture programmatically added listeners
    this.overrideAddEventListener();
    
    // Monitor XMLHttpRequest and fetch for network events
    this.setupNetworkMonitoring();
    
    // Listen for messages from the extension background
    this.setupMessageListeners();
  }

  setupEventDelegation() {
    // Listen on the document for event bubbling
    document.addEventListener('click', (e) => this.logEvent(e), true);
    document.addEventListener('input', (e) => this.logEvent(e), true);
    document.addEventListener('submit', (e) => this.logEvent(e), true);
    document.addEventListener('change', (e) => this.logEvent(e), true);
    document.addEventListener('focus', (e) => this.logEvent(e), true);
    document.addEventListener('blur', (e) => this.logEvent(e), true);
    document.addEventListener('mouseover', (e) => this.logEvent(e), true);
    document.addEventListener('mouseout', (e) => this.logEvent(e), true);
    document.addEventListener('keydown', (e) => this.logEvent(e), true);
    document.addEventListener('keyup', (e) => this.logEvent(e), true);
    document.addEventListener('scroll', (e) => this.logEvent(e), true);
    document.addEventListener('load', (e) => this.logEvent(e), true);
    document.addEventListener('DOMContentLoaded', (e) => this.logEvent(e), true);
    document.addEventListener('error', (e) => this.logEvent(e), true);
    document.addEventListener('abort', (e) => this.logEvent(e), true);
  }

  overrideAddEventListener() {
    // Store the original addEventListener
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      // Log the event listener registration
      const listenerInfo = {
        type: 'listenerRegistered',
        eventType: type,
        target: this.tagName || 'Window',
        timestamp: Date.now()
      };
      
      // Send to our logging system
      if (window.__eventLogger) {
        window.__eventLogger.trackListener(type, this);
      }
      
      // Call the original addEventListener
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  setupNetworkMonitoring() {
    // Monitor XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
      this._eventLogger = {
        method,
        url,
        startTime: Date.now()
      };
      return originalXHROpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
      this.addEventListener('load', () => {
        this._eventLogger.endTime = Date.now();
        this._eventLogger.status = this.status;
        window.__eventLogger?.logNetworkEvent('xhr', this._eventLogger);
      });
      return originalXHRSend.apply(this, arguments);
    };
    
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = args[1]?.method || 'GET';
      
      try {
        const response = await originalFetch.apply(this, args);
        const endTime = Date.now();
        
        window.__eventLogger?.logNetworkEvent('fetch', {
          method,
          url,
          startTime,
          endTime,
          status: response.status
        });
        
        return response;
      } catch (error) {
        window.__eventLogger?.logNetworkEvent('fetch', {
          method,
          url,
          startTime,
          endTime: Date.now(),
          status: 'error',
          error: error.message
        });
        throw error;
      }
    };
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'getEvents':
          sendResponse({ events: this.events });
          break;
        case 'clearEvents':
          this.events = [];
          this.eventTypes.clear();
          sendResponse({ success: true });
          break;
        case 'toggleLogging':
          this.isLogging = message.enabled;
          sendResponse({ isLogging: this.isLogging });
          break;
        case 'setFilter':
          this.filteredTypes = new Set(message.types);
          sendResponse({ filteredTypes: Array.from(this.filteredTypes) });
          break;
      }
      return true;
    });
  }

  logEvent(event) {
    if (!this.isLogging) return;
    if (this.filteredTypes.size > 0 && !this.filteredTypes.has(event.type)) return;

    const eventData = {
      id: this.events.length + 1,
      type: event.type,
      eventPhase: event.eventPhase,
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      timestamp: event.timeStamp || Date.now(),
      target: {
        tagName: event.target?.tagName || 'UNKNOWN',
        id: event.target?.id || '',
        className: event.target?.className || '',
        textContent: event.target?.textContent?.substring(0, 50) || ''
      },
      currentTarget: {
        tagName: event.currentTarget?.tagName || 'UNKNOWN',
        id: event.currentTarget?.id || ''
      },
      properties: this.extractEventProperties(event)
    };

    this.eventTypes.add(event.type);
    this.events.push(eventData);
    
    // Trim events if we exceed the maximum
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Forward to background script for storage
    chrome.runtime.sendMessage({
      action: 'eventLogged',
      event: eventData
    });
  }

  extractEventProperties(event) {
    const properties = {};
    
    // Extract common event properties based on event type
    if (event instanceof MouseEvent) {
      properties.clientX = event.clientX;
      properties.clientY = event.clientY;
      properties.button = event.button;
      properties.buttons = event.buttons;
    }
    
    if (event instanceof KeyboardEvent) {
      properties.key = event.key;
      properties.code = event.code;
      properties.altKey = event.altKey;
      properties.ctrlKey = event.ctrlKey;
      properties.shiftKey = event.shiftKey;
    }
    
    if (event instanceof InputEvent || event instanceof Event) {
      properties.data = event.data;
      properties.inputType = event.inputType;
    }

    return properties;
  }

  trackListener(type, target) {
    const listenerData = {
      type: 'listenerAttached',
      eventType: type,
      target: target?.tagName || 'Window',
      timestamp: Date.now()
    };
    
    chrome.runtime.sendMessage({
      action: 'listenerTracked',
      listener: listenerData
    });
  }

  logNetworkEvent(networkType, data) {
    const eventData = {
      id: this.events.length + 1,
      type: 'network',
      networkType,
      ...data,
      timestamp: Date.now()
    };
    
    this.events.push(eventData);
    chrome.runtime.sendMessage({
      action: 'eventLogged',
      event: eventData
    });
  }
}

// Initialize the event logger
window.__eventLogger = new EventLogger();
```

This content script provides comprehensive event capture capabilities. It uses event delegation to capture events at the document level, overrides addEventListener to track programmatically registered listeners, and monitors network requests through XHR and fetch interception. The script maintains an in-memory buffer of events and forwards them to the background script for persistent storage.

---

## Creating the Background Service Worker {#background-worker}

The background service worker manages the extension's lifecycle and provides persistent storage for captured events. It acts as a central hub for communication between the content script, popup, and DevTools panel.

Create background.js:

```javascript
// Event Logger Chrome Extension - Background Service Worker

// Store events across page navigations
let eventHistory = [];
let isLogging = true;
let maxStoredEvents = 5000;

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'eventLogged':
      if (isLogging) {
        eventHistory.push(message.event);
        if (eventHistory.length > maxStoredEvents) {
          eventHistory = eventHistory.slice(-maxStoredEvents);
        }
      }
      break;
      
    case 'getAllEvents':
      sendResponse({ events: eventHistory, isLogging });
      break;
      
    case 'clearAllEvents':
      eventHistory = [];
      sendResponse({ success: true });
      break;
      
    case 'toggleLogging':
      isLogging = message.enabled;
      sendResponse({ isLogging });
      break;
      
    case 'getStats':
      const stats = {
        totalEvents: eventHistory.length,
        eventTypes: [...new Set(eventHistory.map(e => e.type))],
        isLogging
      };
      sendResponse(stats);
      break;
  }
  return true;
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Event Logger Extension installed:', details.reason);
});

// Keep service worker alive for event processing
chrome.runtime.onStartup.addListener(() => {
  console.log('Event Logger Extension started');
});
```

---

## Building the Popup Interface {#popup-interface}

The popup provides quick access to the most commonly used logging controls without requiring the full DevTools panel. This is perfect for quick debugging sessions.

Create popup.html:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Event Logger</title>
  <style>
    body {
      width: 320px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
    }
    h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #333;
    }
    .controls {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    button {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    .btn-primary {
      background: #4285f4;
      color: white;
    }
    .btn-danger {
      background: #ea4335;
      color: white;
    }
    .btn-secondary {
      background: #e8eaed;
      color: #333;
    }
    .stats {
      background: white;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 13px;
    }
    .stat-label {
      color: #666;
    }
    .stat-value {
      font-weight: 600;
      color: #333;
    }
    .event-types {
      background: white;
      padding: 12px;
      border-radius: 8px;
    }
    .event-types h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #333;
    }
    .event-tag {
      display: inline-block;
      padding: 2px 8px;
      margin: 2px;
      background: #e8eaed;
      border-radius: 12px;
      font-size: 11px;
      color: #333;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding: 8px;
      background: white;
      border-radius: 4px;
    }
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-active {
      background: #34a853;
    }
    .status-paused {
      background: #fbbc04;
    }
  </style>
</head>
<body>
  <h2>Event Logger</h2>
  
  <div class="status">
    <div class="status-indicator" id="statusIndicator"></div>
    <span id="statusText">Logging Active</span>
  </div>
  
  <div class="controls">
    <button class="btn-secondary" id="toggleBtn">Pause</button>
    <button class="btn-secondary" id="openDevtools">DevTools</button>
  </div>
  
  <div class="stats">
    <div class="stat-item">
      <span class="stat-label">Total Events:</span>
      <span class="stat-value" id="totalEvents">0</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Event Types:</span>
      <span class="stat-value" id="eventTypes">0</span>
    </div>
  </div>
  
  <div class="controls">
    <button class="btn-danger" id="clearBtn">Clear Events</button>
  </div>
  
  <div class="event-types">
    <h3>Captured Event Types</h3>
    <div id="eventTypeList"></div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Create popup.js to handle the popup logic:

```javascript
// Popup script for Event Logger Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const totalEventsEl = document.getElementById('totalEvents');
  const eventTypesEl = document.getElementById('eventTypes');
  const eventTypeList = document.getElementById('eventTypeList');
  const toggleBtn = document.getElementById('toggleBtn');
  const clearBtn = document.getElementById('clearBtn');
  const openDevtoolsBtn = document.getElementById('openDevtools');

  let isLogging = true;

  // Update the popup with current stats
  function updateStats() {
    chrome.runtime.sendMessage({ action: 'getAllEvents' }, (response) => {
      if (response) {
        const events = response.events || [];
        isLogging = response.isLogging;
        
        totalEventsEl.textContent = events.length;
        
        const types = [...new Set(events.map(e => e.type))];
        eventTypesEl.textContent = types.length;
        
        // Update event type tags
        eventTypeList.innerHTML = types
          .slice(0, 20)
          .map(type => `<span class="event-tag">${type}</span>`)
          .join('');
        
        if (types.length > 20) {
          eventTypeList.innerHTML += `<span class="event-tag">+${types.length - 20} more</span>`;
        }
        
        // Update status
        updateStatus();
      }
    });
  }

  function updateStatus() {
    if (isLogging) {
      statusIndicator.className = 'status-indicator status-active';
      statusText.textContent = 'Logging Active';
      toggleBtn.textContent = 'Pause';
    } else {
      statusIndicator.className = 'status-indicator status-paused';
      statusText.textContent = 'Logging Paused';
      toggleBtn.textContent = 'Resume';
    }
  }

  // Toggle logging on/off
  toggleBtn.addEventListener('click', () => {
    isLogging = !isLogging;
    chrome.runtime.sendMessage({ 
      action: 'toggleLogging', 
      enabled: isLogging 
    }, () => {
      updateStatus();
    });
  });

  // Clear all events
  clearBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearAllEvents' }, () => {
      updateStats();
    });
  });

  // Open DevTools panel
  openDevtoolsBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.devtools.inspectedWindow.eval('Inspect(function(){})');
        chrome.runtime.sendMessage({ action: 'openDevTools' });
      }
    });
  });

  // Initial load
  updateStats();

  // Refresh stats every 2 seconds
  setInterval(updateStats, 2000);
});
```

---

## Creating the DevTools Panel {#devtools-panel}

For comprehensive event analysis, we need a custom DevTools panel. This provides a full-featured interface for filtering, searching, and analyzing captured events.

Create devtools.html:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Event Logger DevTools</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
    }
    .toolbar {
      display: flex;
      gap: 8px;
      padding: 8px;
      background: #f8f9fa;
      border-bottom: 1px solid #ddd;
    }
    .toolbar input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 13px;
    }
    .toolbar button {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: #4285f4;
      color: white;
    }
    .toolbar button:hover {
      background: #3367d6;
    }
    .toolbar button.danger {
      background: #ea4335;
    }
    .main-container {
      display: flex;
      height: calc(100vh - 50px);
    }
    .event-list {
      width: 60%;
      overflow-y: auto;
      border-right: 1px solid #ddd;
    }
    .event-item {
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }
    .event-item:hover {
      background: #f5f5f5;
    }
    .event-item.selected {
      background: #e8f0fe;
    }
    .event-type {
      font-weight: 600;
      color: #202124;
    }
    .event-target {
      color: #5f6368;
      font-size: 12px;
    }
    .event-time {
      color: #9aa0a6;
      font-size: 11px;
      float: right;
    }
    .event-detail {
      width: 40%;
      padding: 12px;
      overflow-y: auto;
      background: #fff;
    }
    .detail-section {
      margin-bottom: 16px;
    }
    .detail-section h4 {
      margin: 0 0 8px 0;
      color: #202124;
      font-size: 14px;
    }
    .detail-row {
      display: flex;
      padding: 4px 0;
    }
    .detail-label {
      width: 120px;
      color: #5f6368;
    }
    .detail-value {
      flex: 1;
      color: #202124;
      word-break: break-all;
    }
    .filter-group {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      padding: 8px;
      background: #f8f9fa;
      border-bottom: 1px solid #ddd;
    }
    .filter-chip {
      padding: 2px 8px;
      background: #e8eaed;
      border-radius: 12px;
      font-size: 11px;
      cursor: pointer;
    }
    .filter-chip.active {
      background: #4285f4;
      color: white;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <input type="text" id="searchInput" placeholder="Search events...">
    <button id="filterBtn">Filter</button>
    <button id="clearBtn" class="danger">Clear</button>
    <button id="exportBtn">Export</button>
  </div>
  
  <div class="filter-group" id="filterGroup"></div>
  
  <div class="main-container">
    <div class="event-list" id="eventList"></div>
    <div class="event-detail" id="eventDetail">
      <p>Select an event to view details</p>
    </div>
  </div>
  
  <script src="devtools.js"></script>
</body>
</html>
```

Create devtools.js:

```javascript
// DevTools panel script for Event Logger Chrome Extension

let events = [];
let selectedEvent = null;
let activeFilters = new Set();

const eventList = document.getElementById('eventList');
const eventDetail = document.getElementById('eventDetail');
const searchInput = document.getElementById('searchInput');
const filterGroup = document.getElementById('filterGroup');

// Fetch events from background
function fetchEvents() {
  chrome.runtime.sendMessage({ action: 'getAllEvents' }, (response) => {
    if (response && response.events) {
      events = response.events;
      renderEventList();
      updateFilters();
    }
  });
}

// Render the event list
function renderEventList() {
  const searchTerm = searchInput.value.toLowerCase();
  
  const filteredEvents = events.filter(event => {
    // Apply search filter
    if (searchTerm) {
      const searchString = JSON.stringify(event).toLowerCase();
      if (!searchString.includes(searchTerm)) {
        return false;
      }
    }
    
    // Apply type filter
    if (activeFilters.size > 0 && !activeFilters.has(event.type)) {
      return false;
    }
    
    return true;
  });

  eventList.innerHTML = filteredEvents.map(event => `
    <div class="event-item ${selectedEvent?.id === event.id ? 'selected' : ''}" 
         data-id="${event.id}">
      <span class="event-time">${formatTime(event.timestamp)}</span>
      <span class="event-type">${event.type}</span>
      <br>
      <span class="event-target">${event.target?.tagName || 'N/A'} ${event.target?.id ? '#' + event.target.id : ''}</span>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.event-item').forEach(item => {
    item.addEventListener('click', () => {
      const eventId = parseInt(item.dataset.id);
      selectedEvent = events.find(e => e.id === eventId);
      renderEventDetail();
      renderEventList();
    });
  });
}

// Render event details
function renderEventDetail() {
  if (!selectedEvent) {
    eventDetail.innerHTML = '<p>Select an event to view details</p>';
    return;
  }

  const event = selectedEvent;
  let html = `
    <div class="detail-section">
      <h4>Basic Information</h4>
      <div class="detail-row">
        <span class="detail-label">Event Type:</span>
        <span class="detail-value">${event.type}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timestamp:</span>
        <span class="detail-value">${new Date(event.timestamp).toISOString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Bubbles:</span>
        <span class="detail-value">${event.bubbles}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Cancelable:</span>
        <span class="detail-value">${event.cancelable}</span>
      </div>
    </div>
  `;

  if (event.target) {
    html += `
      <div class="detail-section">
        <h4>Target Element</h4>
        <div class="detail-row">
          <span class="detail-label">Tag:</span>
          <span class="detail-value">${event.target.tagName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">ID:</span>
          <span class="detail-value">${event.target.id || '(none)'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Class:</span>
          <span class="detail-value">${event.target.className || '(none)'}</span>
        </div>
      </div>
    `;
  }

  if (event.properties && Object.keys(event.properties).length > 0) {
    html += '<div class="detail-section"><h4>Event Properties</h4>';
    for (const [key, value] of Object.entries(event.properties)) {
      html += `
        <div class="detail-row">
          <span class="detail-label">${key}:</span>
          <span class="detail-value">${value}</span>
        </div>
      `;
    }
    html += '</div>';
  }

  eventDetail.innerHTML = html;
}

// Update filter chips
function updateFilters() {
  const types = [...new Set(events.map(e => e.type))];
  filterGroup.innerHTML = types.map(type => `
    <span class="filter-chip ${activeFilters.has(type) ? 'active' : ''}" data-type="${type}">
      ${type}
    </span>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.type;
      if (activeFilters.has(type)) {
        activeFilters.delete(type);
      } else {
        activeFilters.add(type);
      }
      renderEventList();
      updateFilters();
    });
  });
}

// Format timestamp
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', renderEventList);
document.getElementById('clearBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'clearAllEvents' }, fetchEvents);
});
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `events-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Initial load
fetchEvents();

// Refresh every second
setInterval(fetchEvents, 1000);
```

---

## Adding CSS Styles {#styles}

Create styles.css for basic extension styling:

```css
/* Event Logger Chrome Extension Styles */

:root {
  --primary-color: #4285f4;
  --danger-color: #ea4335;
  --success-color: #34a853;
  --warning-color: #fbbc04;
  --text-primary: #202124;
  --text-secondary: #5f6368;
  --background: #ffffff;
  --background-alt: #f8f9fa;
  --border-color: #dadce0;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--background);
  color: var(--text-primary);
}

.container {
  max-width: 100%;
  padding: 16px;
}

h1, h2, h3 {
  color: var(--text-primary);
  margin-top: 0;
}

.button {
  display: inline-block;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.button-primary {
  background: var(--primary-color);
  color: white;
}

.button-primary:hover {
  background: #3367d6;
}

.button-danger {
  background: var(--danger-color);
  color: white;
}

.button-danger:hover {
  background: #d33426;
}

.card {
  background: var(--background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
}
```

---

## Testing Your Event Logger Extension {#testing}

Now that we have built all the components, it is time to test our extension. Follow these steps to load and test the extension in Chrome:

First, open Chrome and navigate to `chrome://extensions/`. Enable Developer Mode by toggling the switch in the top right corner. Click the "Load unpacked" button and select the directory containing your extension files. The extension should now appear in your list of installed extensions.

To test the event logging functionality, navigate to any website and interact with the page. Click on elements, type in input fields, submit forms, and scroll through the page. Open the extension popup to see real-time event counts and the types of events being captured.

For more detailed analysis, click "DevTools" in the popup to open the custom DevTools panel. Here you can search through events, filter by event type, and examine detailed event properties. Try exporting events to JSON to analyze them in external tools.

---

## Advanced Features and Enhancements {#advanced-features}

Once you have the basic event logger working, consider adding these advanced features to make it even more powerful:

**Custom Event Filtering** allows users to define which events they want to capture based on CSS selectors, event types, or custom rules. This helps reduce noise and focus on specific interactions.

**Event Replay** functionality enables developers to replay captured events, reproducing user interactions exactly as they occurred. This is invaluable for debugging intermittent issues.

**Performance Monitoring** can track the time between events and identify potential performance bottlenecks in web applications.

**Integration with External Tools** can export events to logging services, analytics platforms, or debugging tools like Chrome DevTools Protocol.

---

## Best Practices and Optimization {#best-practices}

When building and using event logger extensions, follow these best practices to ensure optimal performance and reliability:

Always limit the number of events stored in memory to prevent memory leaks. Our implementation uses a maximum of 1000 events in the content script and 5000 in the background service worker, which provides a good balance between functionality and performance.

Use event delegation whenever possible rather than attaching listeners to individual elements. This reduces memory usage and ensures you capture events from dynamically created elements.

Be selective about which events you capture. While it might be tempting to log every single event, this can significantly impact page performance. Focus on the events that are most relevant to your debugging needs.

Consider implementing lazy loading for the DevTools panel to improve extension load times. Only load the full event data when the panel is opened.

---

## Conclusion {#conclusion}

Building an event logger Chrome extension is a rewarding project that provides practical value for web developers and debugging workflows. The extension we built in this guide provides comprehensive event capture capabilities, including DOM events, JavaScript events, network requests, and programmatically added event listeners.

The modular architecture separates concerns between the content script for event capture, background service worker for storage, popup for quick controls, and DevTools panel for detailed analysis. This makes the extension both powerful and maintainable.

By following the patterns and practices outlined in this guide, you can customize and extend the event logger to meet your specific debugging needs. Whether you are troubleshooting complex web applications, analyzing user behavior, or building developer tools, the event logger extension provides a solid foundation for your projects.

Start by installing the extension, testing it on various websites, and then customizing it to fit your unique requirements. The skills you develop building this extension will transfer directly to other Chrome extension projects and general web development work.

