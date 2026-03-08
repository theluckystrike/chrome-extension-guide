---
layout: default
title: "Chrome Extension Architecture Patterns"
description: "Learn the essential architecture patterns for building robust Chrome extensions. Covers popup design, service workers, content scripts, side panels, DevTools integration, and modular code sharing."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/extension-architecture-patterns/"
---

# Chrome Extension Architecture Patterns

Chrome extensions are complex applications that run in multiple isolated contexts. Choosing the right architecture pattern is crucial for building maintainable, performant, and scalable extensions. This tutorial covers the fundamental architectural patterns you'll need to design robust Chrome extensions.

## What You'll Learn
- Design patterns for popup UI (single-page vs multi-page)
- Background service worker architecture patterns
- Content script injection strategies
- Side panel architecture
- DevTools panel integration
- Modular extension design principles
- Sharing code between extension contexts

---

## Extension Contexts Overview

Before diving into patterns, let's understand the contexts available in a Chrome extension:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Chrome Extension                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Service    │    │    Popup     │    │  Options     │     │
│  │   Worker     │◄──►│    (UI)      │    │    Page      │     │
│  │  (Background)│    │              │    │              │     │
│  └──────┬───────┘    └──────────────┘    └──────────────┘     │
│         │                                                      │
│         │ Message Passing                                      │
│         ▼                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Content    │    │  Side Panel  │    │  DevTools    │     │
│  │   Scripts    │    │    (UI)      │    │    Panel     │     │
│  │              │    │              │    │              │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Offscreen Documents                    │  │
│  │              (for long-running tasks)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Each context has its own lifecycle, memory space, and access to Chrome APIs.

---

## 1. Popup Architecture Patterns

The popup is often the primary user interface for an extension. Let's explore the two main patterns.

### Single-Page Popup Pattern

Best for: Simple extensions with few features, quick actions

```
┌─────────────────────┐
│    Single Popup     │
├─────────────────────┤
│                     │
│  ┌───────────────┐  │
│  │   Header      │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │   Main Content│  │
│  │   (Dynamic)   │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │   Actions     │  │
│  └───────────────┘  │
│                     │
└─────────────────────┘
```

**Example Implementation:**

```javascript
// manifest.json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app">
    <header>Extension Name</header>
    <main id="content">
      <!-- Dynamic content loaded here -->
    </main>
    <footer>
      <button id="action-btn">Action</button>
    </footer>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
class SinglePagePopup {
  constructor() {
    this.views = new Map();
    this.currentView = 'home';
    this.init();
  }

  init() {
    this.registerViews();
    this.navigate('home');
    this.setupEventListeners();
  }

  registerViews() {
    this.views.set('home', this.renderHome.bind(this));
    this.views.set('settings', this.renderSettings.bind(this));
    this.views.set('results', this.renderResults.bind(this));
  }

  navigate(viewName) {
    this.currentView = viewName;
    const renderFn = this.views.get(viewName);
    if (renderFn) {
      document.getElementById('content').innerHTML = renderFn();
    }
  }

  renderHome() {
    return `
      <div class="view home">
        <h2>Welcome</h2>
        <p>Click the button to start</p>
        <button id="start-btn">Start</button>
      </div>
    `;
  }

  renderSettings() {
    return `
      <div class="view settings">
        <h2>Settings</h2>
        <label>
          <input type="checkbox" id="enable-feature">
          Enable Feature
        </label>
      </div>
    `;
  }

  renderResults() {
    return `
      <div class="view results">
        <h2>Results</h2>
        <div id="results-list"></div>
      </div>
    `;
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'start-btn') {
        this.navigate('results');
      }
      if (e.target.id === 'settings-btn') {
        this.navigate('settings');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SinglePagePopup();
});
```

### Multi-Page Popup Pattern

Best for: Complex extensions with multiple distinct features

```
┌─────────────────────────────────────┐
│          Multi-Page Popup           │
├─────────────────────────────────────┤
│  ┌─────┬─────┬─────┬─────┐         │
│  │Tab 1│Tab 2│Tab 3│Tab 4│         │
│  └──┬──┴──┬──┴──┬──┴──┬──┘         │
│     │     │     │     │             │
│  ┌──▼─────▼─────▼─────▼──┐         │
│  │      Content Area     │         │
│  │                       │         │
│  │   (Changes per tab)   │         │
│  │                       │         │
│  └───────────────────────┘         │
└─────────────────────────────────────┘
```

**Example Implementation:**

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="popup">
    <nav class="tab-nav">
      <button class="tab-btn active" data-tab="dashboard">
        <span class="icon">📊</span>
        <span class="label">Dashboard</span>
      </button>
      <button class="tab-btn" data-tab="search">
        <span class="icon">🔍</span>
        <span class="label">Search</span>
      </button>
      <button class="tab-btn" data-tab="history">
        <span class="icon">📜</span>
        <span class="label">History</span>
      </button>
    </nav>
    <main class="tab-content">
      <div id="tab-dashboard" class="tab-panel active">
        <!-- Dashboard content -->
      </div>
      <div id="tab-search" class="tab-panel">
        <!-- Search content -->
      </div>
      <div id="tab-history" class="tab-panel">
        <!-- History content -->
      </div>
    </main>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
class MultiPagePopup {
  constructor() {
    this.tabs = document.querySelectorAll('.tab-btn');
    this.panels = document.querySelectorAll('.tab-panel');
    this.init();
  }

  init() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Load initial data
    this.loadDashboard();
  }

  switchTab(tabId) {
    // Update tabs
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update panels
    this.panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    // Load tab data
    this.loadTabData(tabId);
  }

  async loadTabData(tabId) {
    const loaders = {
      dashboard: this.loadDashboard.bind(this),
      search: this.loadSearch.bind(this),
      history: this.loadHistory.bind(this)
    };

    if (loaders[tabId]) {
      await loaders[tabId]();
    }
  }

  async loadDashboard() {
    const data = await chrome.storage.local.get(['stats', 'recent']);
    // Render dashboard content
  }

  async loadSearch() {
    // Initialize search functionality
  }

  async loadHistory() {
    // Load history from storage
  }
}
```

### When to Use Each Pattern

| Feature | Single-Page | Multi-Page |
|---------|-------------|------------|
| Complexity | Low-Medium | Medium-High |
| Memory | Lower | Higher |
| Features | 1-3 | 4+ |
| Navigation | Conditional rendering | Tab-based |
| State Management | Simple | More complex |

---

## 2. Background Service Worker Patterns

The service worker is the backbone of your extension. Here are key patterns:

### Event-Driven Architecture

```javascript
// background.js
class ExtensionServiceWorker {
  constructor() {
    this.handlers = new Map();
    this.registerHandlers();
    this.setupLifecycle();
  }

  registerHandlers() {
    // Message handling
    this.handlers.set('FETCH_DATA', this.handleFetchData.bind(this));
    this.handlers.set('SAVE_SETTINGS', this.handleSaveSettings.bind(this));

    // Chrome event handlers
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));
  }

  handleMessage(message, sender, sendResponse) {
    const handler = this.handlers.get(message.type);
    if (handler) {
      Promise.resolve(handler(message, sender))
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep message channel open for async response
    }
  }

  async handleFetchData(message, sender) {
    const tabId = sender.tab?.id;
    // Process request
    return { data: 'processed data' };
  }

  handleAlarm(alarm) {
    console.log('Alarm triggered:', alarm.name);
  }

  handleStorageChange(changes, area) {
    console.log('Storage changed:', changes);
  }

  setupLifecycle() {
    // Clean up on install/update
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.initializeExtension();
      } else if (details.reason === 'update') {
        this.handleUpdate(details.previousVersion);
      }
    });
  }

  initializeExtension() {
    // Set up default configuration
    chrome.storage.local.set({
      settings: { theme: 'light', notifications: true },
      version: chrome.runtime.getManifest().version
    });
  }
}

// Initialize
new ExtensionServiceWorker();
```

### Keep-Alive Pattern

Service workers terminate after 30 seconds of inactivity. Use alarms to keep them alive:

```javascript
// background.js
class KeepAliveServiceWorker {
  constructor() {
    this.KEEP_ALIVE_INTERVAL = 4; // minutes
    this.setupKeepAlive();
  }

  setupKeepAlive() {
    // Create periodic alarm to keep worker alive
    chrome.alarms.create('keep-alive', {
      periodInMinutes: this.KEEP_ALIVE_INTERVAL
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'keep-alive') {
        this.onKeepAlive();
      }
    });
  }

  onKeepAlive() {
    // Do minimal work to keep worker alive
    // Could check for pending operations
    console.log('[SW] Keep-alive ping');
  }
}
```

### Message Router Pattern

```javascript
// background.js
class MessageRouter {
  constructor() {
    this.routes = new Map();
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.route(message, sender)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Async response
    });
  }

  register(type, handler) {
    this.routes.set(type, handler);
  }

  async route(message, sender) {
    const handler = this.routes.get(message.type);
    if (!handler) {
      throw new Error(`Unknown message type: ${message.type}`);
    }
    return handler(message, sender);
  }
}

const router = new MessageRouter();

// Register routes
router.register('GET_TABS', async (msg, sender) => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return { tabs };
});

router.register('OPEN_NEW_TAB', async (msg, sender) => {
  const tab = await chrome.tabs.create({ url: msg.url });
  return { tabId: tab.id };
});
```

---

## 3. Content Script Injection Strategies

Content scripts run in the context of web pages. Here are injection strategies:

### Declarative Injection

```json
// manifest.json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ]
}
```

### Programmatic Injection

For more control over when scripts load:

```javascript
// background.js - Programmatic injection
class ContentScriptManager {
  async injectScript(tabId, scriptPath) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [scriptPath]
    });
  }

  async injectCSS(tabId, cssPath) {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: [cssPath]
    });
  }

  async injectInlineScript(tabId, script) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (scriptContent) => {
        eval(scriptContent); // Run inline script
      },
      args: [script]
    });
  }
}

// Usage
const manager = new ContentScriptManager();

// Inject on specific conditions
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0) { // Main frame only
    await manager.injectScript(details.tabId, 'content.js');
  }
});
```

### Dynamic Content Script Pattern

Load scripts based on page conditions:

```javascript
// content.js - Dynamic injection
class DynamicContentLoader {
  constructor() {
    this.loadedModules = new Set();
  }

  async loadModule(moduleName, modulePath) {
    if (this.loadedModules.has(moduleName)) {
      return;
    }

    // Check conditions before loading
    if (!this.shouldLoadModule(moduleName)) {
      return;
    }

    // Dynamically load module
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(modulePath);
    script.onload = () => {
      this.loadedModules.add(moduleName);
      console.log(`Module ${moduleName} loaded`);
    };
    (document.head || document.documentElement).appendChild(script);
  }

  shouldLoadModule(moduleName) {
    // Condition-based loading
    const conditions = {
      'analytics': window.location.hostname.includes('example.com'),
      'social': window.location.pathname.startsWith('/social'),
      'shopping': window.location.pathname.startsWith('/cart')
    };
    return conditions[moduleName] ?? false;
  }
}
```

### Isolated World Communication

Content scripts run in an isolated world. Here's how to communicate with the page:

```javascript
// content.js - Safe page communication
class PageCommunicator {
  constructor() {
    this.listeners = new Map();
  }

  // Listen to page events
  listenToPage(eventName, callback) {
    window.addEventListener(eventName, (event) => {
      callback(event.detail);
    });
  }

  // Send events to page
  notifyPage(eventName, data) {
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);
  }

  // Execute in page context (for accessing page variables)
  executeInPageContext(fn) {
    const script = document.createElement('script');
    script.textContent = `(${fn.toString()})()`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  // Read page state safely
  getPageState(selector) {
    return this.executeInPageContext(() => {
      const element = document.querySelector(selector);
      return element ? element.textContent : null;
    });
  }
}
```

---

## 4. Side Panel Architecture

The side panel provides a persistent UI alongside the web page:

```
┌──────────────────────────────────┐
│  Side Panel (Persistent)         │
├──────────────────────────────────┤
│ ┌────────────────────────────┐  │
│ │        Header              │  │
│ │  [Settings] [Pin] [Close]  │  │
│ └────────────────────────────┘  │
│ ┌────────────────────────────┐  │
│ │                            │  │
│ │       Main Content         │  │
│ │                            │  │
│ │                            │  │
│ └────────────────────────────┘  │
│ ┌────────────────────────────┐  │
│ │        Status Bar          │  │
│ └────────────────────────────┘  │
└──────────────────────────────────┘
       ▲ Web Page Content
```

### Side Panel Implementation

```json
// manifest.json
{
  "side_panel": {
    "default_path": "sidepanel.html",
    "default_title": "My Extension"
  },
  "permissions": ["sidePanel"]
}
```

```javascript
// sidepanel.js
class SidePanelManager {
  constructor() {
    this.isPinned = false;
    this.currentPage = 'home';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadInitialData();
  }

  setupEventListeners() {
    // Toggle pin state
    document.getElementById('pin-btn')?.addEventListener('click', () => {
      this.togglePin();
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.navigate(item.dataset.page);
      });
    });
  }

  async togglePin() {
    this.isPinned = !this.isPinned;
    await chrome.sidePanel.setOptions({
      path: 'sidepanel.html',
      pinned: this.isPinned
    });
    this.updatePinButton();
  }

  updatePinButton() {
    const pinBtn = document.getElementById('pin-btn');
    if (pinBtn) {
      pinBtn.textContent = this.isPinned ? '📌 Pinned' : '📍 Pin';
    }
  }

  navigate(page) {
    this.currentPage = page;
    this.renderPage(page);
  }

  renderPage(page) {
    const content = document.getElementById('panel-content');
    const pages = {
      home: () => '<h2>Home</h2><p>Welcome!</p>',
      settings: () => '<h2>Settings</h2><p>Configure options</p>',
      history: () => '<h2>History</h2><p>View history</p>'
    };
    content.innerHTML = pages[page]?.() || '';
  }

  async loadInitialData() {
    const data = await chrome.storage.local.get(['settings', 'user']);
    this.renderUserInfo(data.user);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SidePanelManager();
});
```

---

## 5. DevTools Panel Integration

Extensions can add custom panels to Chrome DevTools:

```
┌────────────────────────────────────────────────────────┐
│  Chrome DevTools                                        │
├────────────────────────────────────────────────────────┤
│ [Elements] [Console] [Sources] [Network] [My Panel]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│              My Custom DevTools Panel                  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │         Panel Content                            │ │
│  │                                                   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### DevTools Panel Implementation

```json
// manifest.json
{
  "devtools_page": "devtools.html",
  "background": {
    "service_worker": "background.js"
  }
}
```

```html
<!-- devtools.html -->
<!DOCTYPE html>
<html>
<body>
  <script src="devtools.js"></script>
</body>
</html>
```

```javascript
// devtools.js
// Create the panel
chrome.devtools.panels.create(
  'My Extension',           // title
  'icons/panel-icon.png',  // icon
  'panel.html',            // page
  (panel) => {
    panel.onShown.addListener((panelWindow) => {
      // Panel is shown - initialize
      console.log('DevTools panel shown');
    });
    
    panel.onHidden.addListener(() => {
      // Panel is hidden - cleanup
      console.log('DevTools panel hidden');
    });
  }
);
```

```javascript
// panel.js - The actual panel
class DevToolsPanel {
  constructor() {
    this.isRecording = false;
    this.events = [];
    this.init();
  }

  init() {
    this.setupUI();
    this.setupEventListeners();
    this.connectToBackground();
  }

  setupUI() {
    const container = document.getElementById('panel-container');
    container.innerHTML = `
      <div class="panel-header">
        <h2>Extension Debugger</h2>
        <button id="record-btn">Start Recording</button>
      </div>
      <div class="panel-content">
        <div id="events-list"></div>
      </div>
      <div class="panel-footer">
        <button id="clear-btn">Clear</button>
        <button id="export-btn">Export</button>
      </div>
    `;
  }

  setupEventListeners() {
    document.getElementById('record-btn').addEventListener('click', () => {
      this.toggleRecording();
    });
  }

  toggleRecording() {
    this.isRecording = !this.isRecording;
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'TOGGLE_RECORDING',
      enabled: this.isRecording
    });
  }

  connectToBackground() {
    // Listen for messages from background
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'EVENT_LOG') {
        this.addEvent(message.data);
      }
    });
  }

  addEvent(event) {
    this.events.push(event);
    this.renderEvents();
  }

  renderEvents() {
    const list = document.getElementById('events-list');
    list.innerHTML = this.events
      .map(e => `<div class="event-item">${JSON.stringify(e)}</div>`)
      .join('');
  }
}
```

---

## 6. Modular Extension Design

Organize your extension into reusable modules:

```
┌─────────────────────────────────────────────────┐
│                   Extension                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │              Shared Code                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │    │
│  │  │  utils   │ │  config  │ │  types   │ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  ┌─────────────┐  ┌─────────────┐              │
│  │  Background │  │   Popup     │              │
│  │  (Module A) │  │ (Module B)  │              │
│  └─────────────┘  └─────────────┘              │
│                                                  │
│  ┌─────────────┐  ┌─────────────┐              │
│  │   Content   │  │   Side      │              │
│  │  (Module C) │  │   Panel     │              │
│  └─────────────┘  └─────────────┘              │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Module Structure

```javascript
// src/modules/base.js - Base module class
export class BaseModule {
  constructor(name) {
    this.name = name;
    this.initialized = false;
  }

  async init() {
    console.log(`[${this.name}] Initializing...`);
    await this.setup();
    this.initialized = true;
    console.log(`[${this.name}] Ready`);
  }

  async setup() {
    // Override in subclass
  }

  log(message, ...args) {
    console.log(`[${this.name}] ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[${this.name}] ${message}`, ...args);
  }
}
```

```javascript
// src/modules/storage.js - Storage module
import { BaseModule } from './base.js';

export class StorageModule extends BaseModule {
  constructor() {
    super('Storage');
  }

  async setup() {
    this.storageArea = chrome.storage.local;
  }

  async get(key) {
    return new Promise((resolve) => {
      this.storageArea.get(key, (result) => {
        resolve(result[key]);
      });
    });
  }

  async set(key, value) {
    return new Promise((resolve) => {
      this.storageArea.set({ [key]: value }, resolve);
    });
  }

  async remove(key) {
    return new Promise((resolve) => {
      this.storageArea.remove(key, resolve);
    });
  }

  onChange(callback) {
    this.storageArea.onChanged.addListener((changes, area) => {
      callback(changes, area);
    });
  }
}
```

```javascript
// src/modules/messaging.js - Messaging module
import { BaseModule } from './base.js';

export class MessagingModule extends BaseModule {
  constructor() {
    super('Messaging');
    this.handlers = new Map();
  }

  setup() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Async
    });
  }

  registerHandler(type, handler) {
    this.handlers.set(type, handler);
  }

  async handleMessage(message, sender) {
    const handler = this.handlers.get(message.type);
    if (!handler) {
      throw new Error(`No handler for ${message.type}`);
    }
    return handler(message, sender);
  }

  send(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
}
```

---

## 7. Sharing Code Between Contexts

### Using ES Modules with Web Accessible Resources

```json
// manifest.json
{
  "web_accessible_resources": [
    {
      "resources": ["src/shared/*.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

```javascript
// Shared code - src/shared/utils.js
export class ExtensionUtils {
  static async getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }
}

export const EVENTS = {
  DATA_FETCHED: 'DATA_FETCHED',
  ERROR: 'ERROR',
  READY: 'READY'
};
```

```javascript
// Using shared code in popup
(async () => {
  const utils = await import(chrome.runtime.getURL('src/shared/utils.js'));
  
  const tab = await utils.ExtensionUtils.getActiveTab();
  console.log('Active tab:', tab);
  
  const debouncedSave = utils.ExtensionUtils.debounce(saveData, 300);
})();
```

### Copy-Based Sharing

For simpler sharing, copy shared modules to each context:

```
src/
├── shared/
│   ├── utils.js
│   ├── constants.js
│   └── types.js
├── background/
│   └── background.js (imports from ../../shared/)
├── popup/
│   └── popup.js (imports from ../../shared/)
└── content/
    └── content.js (imports from ../../shared/)
```

```javascript
// In build process, copy shared files to each context
// Or use a bundler like webpack/rollup
```

---

## Architecture Decision Matrix

Use this matrix to choose the right architecture:

| Need | Recommended Pattern |
|------|---------------------|
| Quick actions, simple UI | Single-page popup |
| Multiple features, tabs | Multi-page popup |
| Persistent alongside page | Side panel |
| Developer tools integration | DevTools panel |
| Event-driven backend | Service worker patterns |
| Conditional script loading | Programmatic injection |
| Code reuse | Shared modules |

---

## Related Articles

- [Extension Architecture Guide](/chrome-extension-guide/docs/guides/extension-architecture/) — Comprehensive guide to extension architecture fundamentals
- [Background Service Workers](/chrome-extension-guide/docs/guides/service-workers/) — Deep dive into service worker implementation
- [Content Scripts Deep Dive](/chrome-extension-guide/docs/guides/content-scripts-deep-dive/) — Advanced content script patterns and techniques

---

## Summary

Choosing the right architecture pattern is essential for building maintainable Chrome extensions:

1. **Popup Architecture**: Use single-page for simple extensions, multi-page for complex ones
2. **Service Workers**: Implement event-driven patterns with proper keep-alive strategies
3. **Content Scripts**: Choose declarative or programmatic injection based on your needs
4. **Side Panel**: Provides persistent UI alongside web pages
5. **DevTools Integration**: Extend Chrome's developer tools with custom panels
6. **Modular Design**: Organize code into reusable modules for maintainability
7. **Code Sharing**: Use web accessible resources or build-time bundling

Understanding these patterns will help you build robust, scalable Chrome extensions.

---

Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).
