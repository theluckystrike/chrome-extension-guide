---
layout: default
title: "Chrome Extension Architecture Patterns — MVC, MVVM & Event-Driven — Developer Guide"
description: "Master Chrome extension architecture patterns including MVC, MVVM, and event-driven designs with practical code examples and best practices."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/extension-architecture-patterns/"
---
# Extension Architecture Patterns

Building a Chrome extension that scales requires more than just connecting components—it demands a clear architectural pattern that organizes code, manages state, and handles communication between isolated contexts. While the Chrome extension platform provides multiple execution environments (service workers, content scripts, popups, options pages), choosing the right architecture pattern determines how maintainable your extension becomes as features accumulate.

This guide explores three proven architectural patterns for Chrome extensions: **Model-View-Controller (MVC)**, **Model-View-ViewModel (MVVM)**, and **Event-Driven Architecture**. Each pattern addresses specific challenges in extension development, from managing state across contexts to handling the asynchronous nature of Chrome's APIs.

## Table of Contents {#table-of-contents}

- [Why Architecture Patterns Matter](#why-architecture-patterns-matter)
- [Model-View-Controller (MVC) for Extensions](#model-view-controller-mvc-for-extensions)
- [Model-View-ViewModel (MVVM) for Extensions](#model-view-viewmodel-mvvm-for-extensions)
- [Event-Driven Architecture](#event-driven-architecture)
- [Choosing the Right Pattern](#choosing-the-right-pattern)
- [Hybrid Approaches](#hybrid-approaches)

---

## Why Architecture Patterns Matter {#why-architecture-patterns-matter}

Chrome extensions present unique architectural challenges that web applications don't face:

1. **Multiple Isolated Contexts**: Your extension runs across service workers, content scripts, popups, options pages, and potentially offscreen documents—each with different capabilities and limitations.

2. **Asynchronous Chrome APIs**: Most `chrome.*` APIs are asynchronous, requiring careful handling of promises and callbacks.

3. **Cross-Context Communication**: Data and events must be passed between isolated worlds using message passing.

4. **State Persistence**: Unlike single-page applications, extensions must persist state across service worker restarts, browser sessions, and device changes.

5. **Lifecycle Management**: Service workers terminate after inactivity, content scripts reload with page navigation, and popups exist only while open.

A well-chosen architecture pattern addresses these challenges by providing clear separation of concerns, predictable data flow, and established patterns for cross-context communication.

---

## Model-View-Controller (MVC) for Extensions {#model-view-controller-mvc-for-extensions}

MVC separates an application into three interconnected components, each handling a specific aspect of your extension:

- **Model**: Data and business logic
- **View**: UI rendering and user interface
- **Controller**: Input handling and coordination

### Applying MVC to Chrome Extensions

In an extension context, MVC maps naturally to Chrome's component model:

```
┌─────────────────────────────────────────────────────────────┐
│                     Service Worker                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Model     │    │ Controller  │    │    Event Bus    │  │
│  │ (Storage,   │◄───│ (Handlers,  │───►│  (Message      │  │
│  │  APIs)      │    │  Orchestration)   │   Passing)      │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │ ▲
                           │ │ Messages
                           ▼ │
┌─────────────────────────────────────────────────────────────┐
│                   Content Script / Popup                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Model     │    │ Controller  │    │      View       │  │
│  │ (Local      │◄───│ (User       │───►│   (DOM/React/   │  │
│  │  State)     │    │  Actions)   │    │    UI)          │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Example

Here's how to implement MVC in a Manifest V3 extension:

```javascript
// models/bookmark-model.js
// The Model layer handles data and business logic

export class BookmarkModel {
  constructor(storage) {
    this.storage = storage;
    this.bookmarks = new Map();
  }

  async load() {
    const data = await this.storage.get('bookmarks');
    this.bookmarks = new Map(Object.entries(data.bookmarks || {}));
    return this.bookmarks;
  }

  async addBookmark(url, title, tags = []) {
    const id = crypto.randomUUID();
    const bookmark = { id, url, title, tags, createdAt: Date.now() };
    this.bookmarks.set(id, bookmark);
    await this.storage.set({ 
      bookmarks: Object.fromEntries(this.bookmarks) 
    });
    return bookmark;
  }

  async removeBookmark(id) {
    this.bookmarks.delete(id);
    await this.storage.set({ 
      bookmarks: Object.fromEntries(this.bookmarks) 
    });
  }

  findByTag(tag) {
    return Array.from(this.bookmarks.values())
      .filter(b => b.tags.includes(tag));
  }
}

// controllers/bookmark-controller.js
// The Controller handles user input and coordinates Model and View

export class BookmarkController {
  constructor(model, view, messenger) {
    this.model = model;
    this.view = view;
    this.messenger = messenger;
  }

  async initialize() {
    await this.model.load();
    this.view.render(this.model.bookmarks);
    
    // Listen for user actions from the View
    this.view.onAddBookmark(async (url, title, tags) => {
      const bookmark = await this.model.addBookmark(url, title, tags);
      this.view.addBookmark(bookmark);
      this.notifyContexts('bookmark-added', bookmark);
    });

    this.view.onRemoveBookmark(async (id) => {
      await this.model.removeBookmark(id);
      this.view.removeBookmark(id);
      this.notifyContexts('bookmark-removed', { id });
    });
  }

  notifyContexts(event, data) {
    // Broadcast to other extension contexts
    this.messenger.broadcast({ type: event, payload: data });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'get-bookmarks':
        sendResponse({ bookmarks: Array.from(this.model.bookmarks.values()) });
        break;
      case 'filter-by-tag':
        sendResponse({ 
          bookmarks: this.model.findByTag(message.tag) 
        });
        break;
    }
    return true;
  }
}
```

### When to Use MVC

MVC works well when:

- You have clear separation between data (bookmarks, settings, cached content) and UI
- Multiple views need to display the same data (popup, options page, side panel)
- You need testable business logic separate from UI code
- Your extension is medium-sized with moderate complexity

---

## Model-View-ViewModel (MVVM) for Extensions {#model-view-viewmodel-mvvm-for-extensions}

MVVM extends MVC by adding a **ViewModel** layer that handles view logic and state synchronization. This pattern is particularly powerful for extensions using modern UI frameworks like React, Vue, or Svelte.

### Key Concepts

- **Model**: Same as MVC—data and business logic
- **View**: UI components (React components, for example)
- **ViewModel**: Bridges the Model and View, handling:
  - State management
  - Data transformation for display
  - User action handling
  - Two-way data binding

### Implementation Example with React

```javascript
// models/extension-model.js

export class ExtensionModel {
  constructor(storage) {
    this.storage = storage;
    this.settings = {};
    this.cache = new Map();
  }

  async initialize() {
    this.settings = await this.storage.get('settings') || {};
    return this.settings;
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await this.storage.set({ settings: this.settings });
  }

  async fetchRemoteData(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    const response = await fetch(url);
    const data = await response.json();
    this.cache.set(url, data);
    return data;
  }
}

// viewmodels/useExtensionViewModel.js (React Hook)

import { useState, useEffect, useCallback } from 'react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { useMessageReceiver } from '../hooks/useMessageReceiver';

export function useExtensionViewModel(model) {
  const [settings, setSettings] = useChromeStorage('local', 'settings', {});
  const [remoteData, setRemoteData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Listen for messages from service worker
  const messages = useMessageReceiver();

  const updateSetting = useCallback(async (key, value) => {
    try {
      await model.updateSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      setError(err.message);
    }
  }, [model, setSettings]);

  const loadRemoteData = useCallback(async (url) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await model.fetchRemoteData(url);
      setRemoteData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [model]);

  // Handle incoming messages
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.type === 'settings-updated') {
        setSettings(msg.payload);
      } else if (msg.type === 'data-refresh') {
        loadRemoteData(msg.payload.url);
      }
    });
  }, [messages, setSettings, loadRemoteData]);

  return {
    settings,
    remoteData,
    isLoading,
    error,
    updateSetting,
    loadRemoteData
  };
}

// views/SettingsPanel.jsx (React Component - the View)

import React from 'react';
import { useExtensionViewModel } from '../viewmodels/useExtensionViewModel';

export function SettingsPanel({ model }) {
  const { 
    settings, 
    updateSetting, 
    isLoading, 
    error 
  } = useExtensionViewModel(model);

  if (isLoading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="settings-panel">
      <h2>Extension Settings</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="setting-item">
        <label>
          <input
            type="checkbox"
            checked={settings.enableNotifications ?? true}
            onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
          />
          Enable Notifications
        </label>
      </div>
      
      <div className="setting-item">
        <label>
          Theme:
          <select
            value={settings.theme ?? 'light'}
            onChange={(e) => updateSetting('theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
      </div>
      
      <div className="setting-item">
        <label>
          Sync Frequency:
          <input
            type="number"
            value={settings.syncInterval ?? 30}
            onChange={(e) => updateSetting('syncInterval', parseInt(e.target.value))}
            min="5"
            max="1440"
          />
          minutes
        </label>
      </div>
    </div>
  );
}
```

### MVVM Benefits for Extensions

1. **Reactive Data Flow**: State changes automatically update the UI
2. **Testability**: ViewModels can be tested without DOM manipulation
3. **Framework Compatibility**: Natural fit for React, Vue, Svelte
4. **Separation of Concerns**: UI logic in ViewModel, business logic in Model

---

## Event-Driven Architecture {#event-driven-architecture}

Event-driven architecture (EDA) is fundamental to Chrome extensions. Every interaction—from user clicks to tab updates—flows through events. This pattern treats events as first-class citizens, enabling loose coupling between components.

### Core Components

1. **Event Emitters**: Components that produce events (user actions, Chrome API events)
2. **Event Bus / Message Bus**: Central hub for routing events
3. **Event Handlers**: Components that react to events

### Implementation Example

```javascript
// event-bus/EventBus.js

class ExtensionEventBus {
  constructor() {
    this.listeners = new Map();
    this.pendingEvents = [];
  }

  // Subscribe to an event type
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType).delete(callback);
    };
  }

  // Emit an event
  emit(eventType, payload, source = 'unknown') {
    const event = {
      type: eventType,
      payload,
      source,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };

    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }

    return event;
  }

  // One-time event subscription
  once(eventType, callback) {
    const unsubscribe = this.on(eventType, (event) => {
      unsubscribe();
      callback(event);
    });
    return unsubscribe;
  }

  // Clear all listeners
  clear() {
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new ExtensionEventBus();

// event-bus/EventTypes.js

export const ExtensionEvents = {
  // Tab events
  TAB_UPDATED: 'tab:updated',
  TAB_ACTIVATED: 'tab:activated',
  TAB_CREATED: 'tab:created',
  TAB_CLOSED: 'tab:closed',
  
  // Storage events
  STORAGE_CHANGED: 'storage:changed',
  SYNC_COMPLETED: 'sync:completed',
  
  // User events
  BOOKMARK_ADDED: 'bookmark:added',
  BOOKMARK_REMOVED: 'bookmark:removed',
  SETTINGS_UPDATED: 'settings:updated',
  
  // Network events
  REQUEST_STARTED: 'request:started',
  REQUEST_COMPLETED: 'request:completed',
  REQUEST_FAILED: 'request:failed',
  
  // Extension lifecycle
  EXTENSION_INSTALLED: 'extension:installed',
  EXTENSION_UPDATED: 'extension:updated',
  EXTENSION_UNINSTALLED: 'extension:uninstalled'
};

// services/EventDrivenService.js

import { eventBus, ExtensionEvents } from '../event-bus';

export class EventDrivenService {
  constructor(storage) {
    this.storage = storage;
    this.cleanupFns = [];
  }

  initialize() {
    // Register event handlers
    this.cleanupFns.push(
      eventBus.on(ExtensionEvents.TAB_UPDATED, this.handleTabUpdated.bind(this))
    );
    
    this.cleanupFns.push(
      eventBus.on(ExtensionEvents.SETTINGS_UPDATED, this.handleSettingsChanged.bind(this))
    );
    
    this.cleanupFns.push(
      eventBus.on(ExtensionEvents.REQUEST_COMPLETED, this.handleRequestCompleted.bind(this))
    );

    // Listen to Chrome API events and forward to event bus
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      eventBus.emit(ExtensionEvents.TAB_UPDATED, { tabId, changeInfo, tab });
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      eventBus.emit(ExtensionEvents.TAB_ACTIVATED, activeInfo);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      eventBus.emit(ExtensionEvents.STORAGE_CHANGED, { changes, areaName });
    });
  }

  handleTabUpdated({ payload }) {
    const { tabId, changeInfo } = payload;
    
    if (changeInfo.status === 'complete') {
      // Page finished loading - perform some action
      this.analyzePageContent(tabId);
    }
  }

  handleSettingsChanged({ payload }) {
    const { key, value } = payload;
    
    if (key === 'enableAutoSync') {
      if (value) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }
  }

  handleRequestCompleted({ payload }) {
    // Track completed requests for analytics
    this.logRequest(payload);
  }

  async analyzePageContent(tabId) {
    // Implementation
  }

  startAutoSync() {
    // Implementation
  }

  stopAutoSync() {
    // Implementation
  }

  async logRequest(requestData) {
    // Implementation
  }

  destroy() {
    // Clean up all event listeners
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
  }
}
```

### Cross-Context Event Communication

For events that need to span multiple contexts (service worker to content script), use Chrome's message passing:

```javascript
// utils/CrossContextEvents.js

import { eventBus, ExtensionEvents } from '../event-bus';

export function setupCrossContextBridge() {
  // In service worker or popup
  if (chrome.runtime?.sendMessage) {
    eventBus.on(ExtensionEvents.BOOKMARK_ADDED, (event) => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'EXTENSION_EVENT',
            event: event.type,
            payload: event.payload
          }).catch(() => {
            // Tab might not have a listener
          });
        });
      });
    });
  }
}

// In content script - message-receiver.js

import { eventBus, ExtensionEvents } from '../event-bus';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTENSION_EVENT') {
    eventBus.emit(message.event, message.payload, 'cross-context');
    sendResponse({ received: true });
  }
  return true;
});

// Content script can now listen to events from other contexts
eventBus.on(ExtensionEvents.SETTINGS_UPDATED, (event) => {
  applyNewSettings(event.payload);
});
```

### When to Use Event-Driven Architecture

Event-driven architecture is ideal when:

- Multiple components need to react to the same action
- You need loose coupling between extension parts
- Events originate from unpredictable sources (Chrome APIs, user actions)
- You want to add new handlers without modifying existing code
- Your extension has many async operations and callbacks

---

## Choosing the Right Pattern {#choosing-the-right-pattern}

| Factor | MVC | MVVM | Event-Driven |
|--------|-----|------|---------------|
| **Complexity** | Medium | Medium-High | Low-High |
| **UI Framework** | Any | React/Vue/Svelte | Any |
| **State Management** | Manual | Reactive | Event-based |
| **Testability** | Good | Excellent | Good |
| **Learning Curve** | Low | Medium | Medium |
| **Best For** | Simple-medium extensions | Complex UI with React | Highly interactive apps |

### Decision Guide

**Choose MVC if:**
- Your extension is relatively simple
- You prefer explicit data flow
- You're building a traditional extension without modern frameworks

**Choose MVVM if:**
- Using React, Vue, or Svelte
- You need reactive state management
- Complex UI with many interdependent components

**Choose Event-Driven if:**
- Many async operations and Chrome API events
- Loose coupling is a priority
- You need to coordinate across multiple contexts

---

## Hybrid Approaches {#hybrid-approaches}

Most real-world extensions combine patterns. A common hybrid approach:

1. **Service Worker**: Event-driven core that listens to Chrome APIs
2. **Models**: Shared data layer accessible to all contexts
3. **ViewModels**: Used in popup/options for reactive UI
4. **Controllers**: Handle specific feature logic in content scripts

```javascript
// A practical hybrid approach

// Service Worker - Event-Driven Core
import { eventBus, ExtensionEvents } from './event-bus';

chrome.tabs.onUpdated.addListener((tabId, info) => {
  eventBus.emit(ExtensionEvents.TAB_UPDATED, { tabId, info });
});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  eventBus.emit(msg.type, msg.payload, sender.id);
});

// Content Script - MVC with Events
class ContentController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.setupEventListeners();
  }

  setupEventListeners() {
    eventBus.on(ExtensionEvents.TAB_UPDATED, ({ payload }) => {
      if (payload.tabId === this.getCurrentTabId()) {
        this.model.refresh();
        this.view.update();
      }
    });
  }
}
```

---

## Summary {#summary}

- **MVC** provides clear separation of concerns and works well for medium-sized extensions
- **MVVM** excels when using modern UI frameworks and requires reactive data flow
- **Event-Driven** architecture is fundamental to Chrome extensions and enables loose coupling
- **Hybrid approaches** often provide the best balance for complex extensions

Choose a pattern based on your extension's complexity, team familiarity, and UI framework choice. Start simple and evolve your architecture as requirements grow.

---

## Related Articles {#related-articles}

- [Extension Architecture](../guides/extension-architecture.md)
- [Project Structure](../guides/chrome-extension-project-structure.md)
- [Message Passing Best Practices](../guides/message-passing-best-practices.md)
- [React Extension Setup](../guides/chrome-extension-react-setup.md)
- [Service Worker Lifecycle](../guides/service-worker-lifecycle.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
