---
layout: post
title: "Chrome Extension Service Worker Lifecycle: Complete MV3 Guide 2025"
description: "Master Chrome extension service workers in MV3. Learn lifecycle management, state persistence, idle timeout solutions, and debugging techniques with TypeScript examples."
date: 2025-02-22
categories: [Chrome Extensions, MV3]
tags: [service-worker, manifest-v3, chrome-extension, background-script]
keywords: "chrome extension service worker, mv3 service worker lifecycle, chrome extension background script mv3, service worker idle timeout chrome extension, manifest v3 service worker"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/02/22/chrome-extension-service-worker-lifecycle-complete-guide/"
---

# Chrome Extension Service Worker Lifecycle: Complete MV3 Guide 2025

Google's transition to Manifest V3 fundamentally changed how Chrome extensions handle background logic. The replacement of persistent background pages with ephemeral service workers represents the most significant architectural shift in Chrome extension development. This comprehensive guide walks you through every aspect of the service worker lifecycle, from registration to debugging, with practical TypeScript code examples you can apply immediately to your extension projects.

---

## Introduction: Why Service Workers Matter in MV3

The shift from Manifest V2's persistent background pages to Manifest V3's service workers wasn't just an API update—it was a complete paradigm shift in how background logic executes. In MV2, your background script ran continuously in a dedicated page, maintaining state in global variables and keeping connections alive indefinitely. MV3 service workers, by contrast, are event-driven, ephemeral workers that Chrome terminates after periods of inactivity.

This change brings substantial benefits: reduced memory footprint, improved security through limited execution windows, and better resource management for users with numerous extensions. However, it also introduces new challenges that have caught many developers off guard during migration.

The most common issues developers face include losing state when the service worker terminates, discovering that setTimeout and setInterval don't work reliably, and struggling with debugging an environment that appears to "go to sleep." Understanding the service worker lifecycle isn't optional—it's essential for building robust MV3 extensions that function correctly in production.

---

## Service Worker Registration: manifest.json Configuration

Chrome registers your service worker based on configuration in your manifest.json file. The `background` key now accepts a `service_worker` property instead of the old `scripts` array used in MV2 background pages.

```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

The `type: module` property enables ES module support, allowing you to use import and export statements in your service worker. This is particularly valuable for organizing code across multiple files and leveraging modern JavaScript patterns.

```typescript
// background.ts - Service worker entry point
import { EventRouter } from './event-router';
import { StateManager } from './state-manager';

// Initialize event listeners at top level
const eventRouter = new EventRouter();
const stateManager = new StateManager();

// Register all extension event listeners
eventRouter.register();
```

When Chrome loads your extension, it registers the service worker specified in the manifest. You can verify this in chrome://extensions by enabling developer mode and inspecting your extension. The service worker appears in the "Service Worker" section, showing its current status (running, terminated, or crashed).

---

## Lifecycle Events: Understanding the Service Worker Flow

Service workers in Chrome extensions follow a specific lifecycle that differs from web service workers. Understanding these events is crucial for proper initialization and cleanup.

### Installation Event

The service worker install event fires when Chrome first registers your worker. This is the ideal place to perform one-time setup tasks:

```typescript
// background.ts
const EXTENSION_VERSION = chrome.runtime.getManifest().version;

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First-time installation setup
    console.log('Extension installed:', EXTENSION_VERSION);
    
    // Initialize default settings
    chrome.storage.local.set({
      settings: {
        enableNotifications: true,
        autoSuspend: true,
        suspensionDelay: 30000
      },
      installTime: Date.now()
    });
  } else if (details.reason === 'update') {
    // Extension was updated
    const previousVersion = details.previousVersion;
    console.log(`Updated from ${previousVersion} to ${EXTENSION_VERSION}`);
    
    // Handle migration if needed
    handleMigration(previousVersion, EXTENSION_VERSION);
  }
});

// Service worker install event (different from chrome.runtime.onInstalled)
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  // Skip waiting to activate immediately in development
  self.skipWaiting();
});
```

The key distinction is that `chrome.runtime.onInstalled` fires when your extension is installed or updated (persisted across restarts), while the `install` event fires each time the service worker is loaded into memory.

### Activation Event

The activate event fires when the service worker becomes the active worker for your extension:

```typescript
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
  
  // Claim all open extension pages
  event.waitUntil(self.clients.claim());
  
  // Clean up old data from previous versions
  cleanupOldData();
});
```

### Fetch Events

Service workers can intercept network requests, though in extensions this is less common than in web contexts:

```typescript
self.addEventListener('fetch', (event) => {
  // Handle extension-specific fetch requests
  if (event.request.url.includes('chrome-extension://')) {
    // Let Chrome handle extension resource requests
    return;
  }
  
  // For network requests you want to intercept
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline', { status: 503 });
    })
  );
});
```

---

## The Idle Timeout Problem: Keeping Your Worker Alive

Perhaps the most significant challenge with MV3 service workers is the idle timeout. Chrome terminates service workers after approximately 30 seconds of inactivity, and there's no way to prevent this termination. This breaks many patterns that worked in MV2 background pages.

### Understanding the Timeout

The idle timeout applies to all service worker events except:
- `chrome.alarms.onAlarm`
- `chrome.idle.onStateChanged` (with idle detection permission)
- Native Chrome events like push notifications

### Using chrome.alarms for Scheduled Tasks

The recommended solution for long-running or periodic tasks is the alarms API:

```typescript
// Schedule a recurring alarm for background tasks
chrome.alarms.create('backgroundSync', {
  periodInMinutes: 1,  // Minimum: 1 minute
  delayInMinutes: 0.5
});

// Handle the alarm event
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'backgroundSync') {
    performBackgroundTask();
  }
});

async function performBackgroundTask(): Promise<void> {
  // This runs even after the worker was terminated
  // because the alarm wakes it up
  const state = await chrome.storage.session.get('currentTask');
  
  if (state.currentTask) {
    console.log('Continuing task:', state.currentTask);
    // Resume work where it left off
  }
}
```

### Preventing State Loss with chrome.storage.session

To maintain state across terminations, use `chrome.storage.session` for ephemeral data that survives worker restarts:

```typescript
class SessionStateManager {
  private storageKey = 'session_state';
  
  async saveState(state: Record<string, unknown>): Promise<void> {
    await chrome.storage.session.set({
      [this.storageKey]: {
        ...state,
        lastUpdated: Date.now()
      }
    });
  }
  
  async loadState(): Promise<Record<string, unknown> | null> {
    const result = await chrome.storage.session.get(this.storageKey);
    return result[this.storageKey] || null;
  }
  
  async clearState(): Promise<void> {
    await chrome.storage.session.remove(this.storageKey);
  }
}
```

The `chrome.storage.session` API stores data in memory while the browser runs, surviving service worker terminations. However, data is lost when Chrome closes entirely—use `chrome.storage.local` for persistence across browser restarts.

---

## State Persistence Patterns: From MV2 to MV3

Migrating state management from MV2's persistent background pages requires a fundamental rethinking of how you store and access data.

### MV2 Background Page Approach (No Longer Works)

```typescript
// ❌ MV2 pattern - BROKEN in MV3
let userSettings = {};
let activeConnections = [];
let currentTabState = {};

// Load once on startup - but service worker restarts frequently
async function initialize() {
  userSettings = await loadSettings();
  activeConnections = await loadConnections();
}

// This doesn't work - state is lost when worker terminates
function handleMessage(message) {
  activeConnections.push(message.connection);
}
```

### MV3 StateManager Class Pattern

```typescript
// ✅ MV3 pattern - Survives worker restarts
interface ExtensionState {
  settings: UserSettings;
  connections: Connection[];
  tabStates: Record<number, TabState>;
  lastSync: number;
}

class StateManager {
  private state: ExtensionState = {
    settings: this.getDefaultSettings(),
    connections: [],
    tabStates: {},
    lastSync: 0
  };
  
  private storageKey = 'extension_state';
  
  constructor() {
    // Load persisted state on initialization
    this.loadState();
  }
  
  private getDefaultSettings(): UserSettings {
    return {
      enableNotifications: true,
      autoSuspend: true,
      suspensionDelay: 30000,
      theme: 'system'
    };
  }
  
  async loadState(): Promise<void> {
    try {
      // Load persistent state from chrome.storage.local
      const result = await chrome.storage.local.get(this.storageKey);
      if (result[this.storageKey]) {
        this.state = { ...this.state, ...result[this.storageKey] };
      }
      
      // Load ephemeral session state
      const sessionResult = await chrome.storage.session.get(this.storageKey);
      if (sessionResult[this.storageKey]) {
        this.state.connections = sessionResult[this.storageKey].connections || [];
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }
  
  async saveState(): Promise<void> {
    try {
      // Save to local for persistence across browser restarts
      await chrome.storage.local.set({
        [this.storageKey]: this.state
      });
      
      // Save to session for quick access after worker restart
      await chrome.storage.session.set({
        [this.storageKey]: {
          connections: this.state.connections,
          lastUpdated: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }
  
  getState(): ExtensionState {
    return this.state;
  }
  
  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    this.state.settings = { ...this.state.settings, ...settings };
    await this.saveState();
  }
  
  async addConnection(connection: Connection): Promise<void> {
    this.state.connections.push(connection);
    await this.saveState();
  }
  
  async removeConnection(id: string): Promise<void> {
    this.state.connections = this.state.connections.filter(c => c.id !== id);
    await this.saveState();
  }
}
```

### Hybrid Storage Strategy

Use `chrome.storage.local` for settings and data that must persist across browser restarts. Use `chrome.storage.session` for frequently accessed data that changes often:

```typescript
// Configuration that persists across browser restarts
const persistentData = {
  settings: { theme: 'dark', notifications: true },
  userPreferences: { language: 'en' },
  cachedData: { lastFetched: Date.now() }
};

await chrome.storage.local.set(persistentData);

// Session data that's recreated after worker restart
const sessionData = {
  activeTabId: 12345,
  pendingRequests: ['req1', 'req2'],
  workerStartTime: Date.now()
};

await chrome.storage.session.set(sessionData);
```

---

## Event-Driven Architecture: Top-Level Listener Registration

In MV3 service workers, all event listeners must be registered synchronously at the top level of your script. Listeners inside async callbacks or functions won't be registered when the service worker wakes up after termination.

### The Problem

```typescript
// ❌ BROKEN - Listener never fires after worker restart
async function initialize() {
  chrome.runtime.onMessage.addListener((message) => {
    handleMessage(message);
  });
  
  await someAsyncOperation();
  // By the time this runs, initialization may have completed
  // but listener registration happened too late
}

initialize();
```

### The Solution: EventRouter Pattern

```typescript
// event-router.ts
type MessageHandler = (message: unknown, sender: chrome.runtime.MessageSender) => Promise<unknown>;

class EventRouter {
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private commandHandlers: Map<string, (details: chrome.commands.Command) => void> = new Map();
  
  register(): void {
    this.registerMessageListeners();
    this.registerCommandListeners();
    this.registerTabListeners();
    this.registerStorageListeners();
  }
  
  private registerMessageListeners(): void {
    // ✅ Register at TOP LEVEL - this works after worker restart
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender).then(sendResponse);
      return true; // Keep message channel open for async response
    });
    
    chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      this.handleExternalMessage(message, sender).then(sendResponse);
      return true;
    });
  }
  
  private registerCommandListeners(): void {
    chrome.commands.onCommand.addListener((command) => {
      const handler = this.commandHandlers.get(command);
      if (handler) {
        handler({ command });
      }
    });
  }
  
  private registerTabListeners(): void {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabReady(tabId, tab.url);
      }
    });
    
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabSwitch(activeInfo.tabId);
    });
  }
  
  private registerStorageListeners(): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      this.handleStorageChange(changes, areaName);
    });
  }
  
  async handleMessage(message: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
    const msg = message as { type: string; payload?: unknown };
    const handler = this.messageHandlers.get(msg.type);
    
    if (handler) {
      return handler(msg.payload, sender);
    }
    
    console.warn('No handler for message type:', msg.type);
    return { error: 'Unknown message type' };
  }
  
  registerMessageHandler(type: string, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
  }
  
  registerCommandHandler(command: string, handler: (details: chrome.commands.Command) => void): void {
    this.commandHandlers.set(command, handler);
  }
  
  private handleTabReady(tabId: number, url: string): void {
    console.log('Tab ready:', tabId, url);
  }
  
  private handleTabSwitch(tabId: number): void {
    console.log('Tab switched to:', tabId);
  }
  
  private handleStorageChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string): void {
    console.log('Storage changed in', areaName, changes);
  }
  
  private async handleExternalMessage(message: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
    // Handle messages from external extensions
    return { status: 'received' };
  }
}
```

```typescript
// background.ts - Main entry point
import { EventRouter } from './event-router';
import { StateManager } from './state-manager';

const eventRouter = new EventRouter();
const stateManager = new StateManager();

// Register handlers AFTER creating instances
eventRouter.registerMessageHandler('getState', async () => {
  return stateManager.getState();
});

eventRouter.registerMessageHandler('updateSettings', async (payload) => {
  await stateManager.updateSettings(payload as Record<string, unknown>);
  return { success: true };
});

eventRouter.registerCommandHandler('toggle-suspend', () => {
  console.log('Toggle suspend command triggered');
});

// This must be called at the TOP LEVEL
eventRouter.register();
```

---

## Offscreen Documents: When You Need DOM Access

Service workers don't have access to the DOM—they run in a worker context without window or document objects. However, Chrome provides the Offscreen API for scenarios requiring DOM manipulation.

### Creating an Offscreen Document

```typescript
// offscreen-manager.ts
class OffscreenManager {
  private readonly offscreenUrl = 'offscreen.html';
  private readonly requiredContexts: chrome offscreen.OffscreenContextType[] = ['DOM', 'WORKER'];
  
  async createOffscreenDocument(): Promise<void> {
    // Check if already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType]
    });
    
    if (existingContexts.length > 0) {
      return; // Already created
    }
    
    await chrome.offscreen.createDocument({
      url: this.offscreenUrl,
      reasons: ['DOM_PARSING' as chrome.offscreen.Reason, 'AUDIO_PLAYBACK' as chrome.offscreen.Reason],
      justification: 'Parse HTML content and play audio notifications'
    });
  }
  
  async closeOffscreenDocument(): Promise<void> {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType]
    });
    
    for (const context of existingContexts) {
      if ((context as chrome.offscreen.OffscreenDocument).documentUrl === this.offscreenUrl) {
        await chrome.offscreen.closeDocument();
      }
    }
  }
  
  async sendMessage(message: unknown): Promise<unknown> {
    // Get all offscreen documents
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType]
    });
    
    const offscreen = contexts.find(
      (c) => (c as chrome.offscreen.OffscreenDocument).documentUrl?.includes(this.offscreenUrl)
    );
    
    if (!offscreen) {
      await this.createOffscreenDocument();
    }
    
    // Send message to offscreen document
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}
```

### Offscreen Document Example (offscreen.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Offscreen Document</title>
</head>
<body>
  <script>
    // This runs in a page context with full DOM access
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'parseHTML') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(message.html, 'text/html');
        
        // Perform DOM operations
        const title = doc.querySelector('title')?.textContent;
        const links = Array.from(doc.querySelectorAll('a')).map(a => a.href);
        
        sendResponse({ title, links });
      }
      
      if (message.type === 'playAudio') {
        const audio = new Audio(message.audioUrl);
        audio.play().then(() => sendResponse({ success: true }))
               .catch(err => sendResponse({ error: err.message }));
      }
      
      return true; // Keep channel open for async response
    });
  </script>
</body>
</html>
```

---

## Debugging Service Workers: Tools and Techniques

Debugging service workers requires different tools and approaches than traditional extension debugging.

### Accessing Service Worker Internals

Navigate to `chrome://serviceworker-internals` to see all registered service workers, including extension service workers. This page shows:
- Registration status
- Active/inactive state
- Script cache contents
- Push subscription status

### Using Chrome DevTools

1. Open `chrome://extensions`
2. Find your extension
3. Click "Service Worker" link in the background section
4. Use the DevTools console for debugging

### Common Errors and Solutions

```typescript
// Error 1: Listener not registered at top level
// ❌ This fails because listener is inside async function
async function setup() {
  chrome.runtime.onMessage.addListener(handler);
}
setup();

// ✅ Correct: Top-level registration
chrome.runtime.onMessage.addListener(handler);

// Error 2: Trying to access DOM in service worker
// ❌ This fails - no DOM in service worker
document.querySelector('#element');

// ✅ Use offscreen document instead
// or use message passing to content script

// Error 3: State lost after worker termination
// ❌ Using global variables
let myState = {};

// ✅ Use chrome.storage
await chrome.storage.session.set({ myState });
const { myState } = await chrome.storage.session.get('myState');
```

### Logging Strategy for Debugging

```typescript
// Add comprehensive logging
const debug = {
  log: (message: string, data?: unknown) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '');
    // Also log to storage for persistence across restarts
    chrome.storage.local.get('debugLog').then(result => {
      const logs = result.debugLog || [];
      logs.push({ timestamp: Date.now(), message, data });
      // Keep only last 100 entries
      if (logs.length > 100) logs.shift();
      chrome.storage.local.set({ debugLog: logs });
    });
  },
  
  error: (message: string, error: Error) => {
    console.error(message, error);
    // Log to storage for later inspection
    chrome.storage.local.get('errorLog').then(result => {
      const errors = result.errorLog || [];
      errors.push({ 
        timestamp: Date.now(), 
        message, 
        stack: error.stack,
        workerState: 'terminated'
      });
      chrome.storage.local.set({ errorLog: errors });
    });
  }
};
```

---

## Migration Checklist: MV2 to MV3 Service Worker

Follow this step-by-step checklist for migrating from MV2 background pages to MV3 service workers:

### Phase 1: Manifest Updates

- [ ] Update `manifest_version` to 3
- [ ] Replace `background.scripts` with `background.service_worker`
- [ ] Add `"type": "module"` if using ES modules
- [ ] Review and update permissions
- [ ] Remove any remote code execution capabilities

### Phase 2: State Management Migration

- [ ] Identify all global variables storing state
- [ ] Implement StateManager class using chrome.storage
- [ ] Move persistent data to chrome.storage.local
- [ ] Move ephemeral session data to chrome.storage.session
- [ ] Add state loading in service worker initialization

### Phase 3: Event Listener Registration

- [ ] Move all chrome.runtime.onMessage listeners to top level
- [ ] Move all chrome.tabs.* listeners to top level
- [ ] Remove listeners from inside async functions
- [ ] Implement EventRouter pattern for organized handlers

### Phase 4: Timer and Interval Replacement

- [ ] Replace setTimeout with chrome.alarms
- [ ] Replace setInterval with chrome.alarms
- [ ] Implement state preservation across worker restarts
- [ ] Add alarm cleanup on extension uninstall

### Phase 5: Connection Handling

- [ ] Migrate WebSocket connections to handle disconnections
- [ ] Implement reconnection logic after worker restart
- [ ] Replace XMLHttpRequest with fetch API
- [ ] Add connection state to chrome.storage.session

### Phase 6: Testing

- [ ] Test extension after browser restart
- [ ] Test after service worker auto-termination
- [ ] Verify state persistence across worker restarts
- [ ] Test alarm-based functionality

### Common Migration Gotchas

```typescript
// Gotcha 1: setTimeout doesn't work reliably
// ❌ Will likely not fire after worker terminates
setTimeout(() => {
  doSomething();
}, 60000); // 1 minute

// ✅ Use chrome.alarms
chrome.alarms.create('delayedTask', { delayInMinutes: 1 });

// Gotcha 2: setInterval stops working
// ❌ Will stop after worker terminates
setInterval(() => {
  checkStatus();
}, 5000);

// ✅ Use alarms with period
chrome.alarms.create('periodicCheck', { periodInMinutes: 1/12 }); // Every 5 seconds

// Gotcha 3: WebSocket connections drop
// ✅ Implement reconnection with state persistence
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(url: string): void {
    this.ws = new WebSocket(url);
    
    this.ws.onclose = () => {
      this.handleDisconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnect();
    };
  }
  
  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Exponential backoff
      setTimeout(() => this.reconnect(), Math.pow(2, this.reconnectAttempts) * 1000);
    }
  }
}
```

---

## Tab Suspender Pro Case Study: Real-World Service Worker Implementation

Tab Suspender Pro demonstrates excellent service worker lifecycle management for reliable tab suspension. Understanding how they handle the challenges of MV3 service workers provides valuable insights for your own extensions.

### Alarm-Based Suspension Scheduling

Tab Suspender Pro uses chrome.alarms as the backbone of their suspension scheduling:

```typescript
// Simplified Tab Suspender Pro approach
class SuspensionScheduler {
  private readonly SUSPEND_ALARM = 'tab-suspend-check';
  private readonly CHECK_INTERVAL = 30; // seconds
  
  constructor() {
    this.startScheduler();
  }
  
  startScheduler(): void {
    chrome.alarms.create(this.SUSPEND_ALARM, {
      periodInMinutes: this.CHECK_INTERVAL / 60
    });
    
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === this.SUSPEND_ALARM) {
        this.evaluateAndSuspendTabs();
      }
    });
  }
  
  private async evaluateAndSuspendTabs(): Promise<void> {
    const tabs = await chrome.tabs.query({ active: true });
    
    for (const tab of tabs) {
      if (tab.id && this.shouldSuspend(tab)) {
        await this.suspendTab(tab.id);
      }
    }
  }
  
  private shouldSuspend(tab: chrome.tabs.Tab): boolean {
    // Check last active time, pinned status, audio playing, etc.
    // Load settings from storage
    return false; // Implementation depends on requirements
  }
  
  private async suspendTab(tabId: number): Promise<void> {
    // Create placeholder page or suspend tab
    await chrome.tabs.update(tabId, { url: 'suspended.html' });
  }
}
```

### State Recovery After Worker Restart

Tab Suspender Pro implements robust state recovery:

```typescript
class StateRecoveryManager {
  async recoverState(): Promise<void> {
    // Load suspension queue from storage
    const { suspensionQueue } = await chrome.storage.local.get('suspensionQueue');
    
    // Restore pending suspensions
    if (suspensionQueue && suspensionQueue.length > 0) {
      console.log(`Recovering ${suspensionQueue.length} pending suspensions`);
      
      for (const item of suspensionQueue) {
        await this.processSuspensionItem(item);
      }
    }
    
    // Clean up expired items
    await this.cleanupExpiredItems();
  }
  
  async saveSuspensionItem(item: SuspensionItem): Promise<void> {
    const { suspensionQueue } = await chrome.storage.local.get('suspensionQueue');
    const queue = suspensionQueue || [];
    
    queue.push({
      ...item,
      queuedAt: Date.now()
    });
    
    await chrome.storage.local.set({ suspensionQueue: queue });
  }
  
  private async cleanupExpiredItems(): Promise<void> {
    const { suspensionQueue } = await chrome.storage.local.get('suspensionQueue');
    if (!suspensionQueue) return;
    
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    const validItems = suspensionQueue.filter(
      item => now - item.queuedAt < maxAge
    );
    
    await chrome.storage.local.set({ suspensionQueue: validItems });
  }
}
```

### Lessons from Tab Suspender Pro

1. **Always use alarms for scheduling**: Never rely on timers that won't survive worker termination
2. **Persist everything to storage**: Any state that matters must be in chrome.storage
3. **Design for restarts**: Assume your service worker will terminate at any moment
4. **Queue operations**: If an operation can't complete, queue it for recovery
5. **Test thoroughly**: Verify behavior after browser restart, not just extension reload

---

## Conclusion

The transition from MV2 background pages to MV3 service workers requires a fundamental shift in how you think about extension architecture. The key principles are straightforward: assume your service worker will terminate at any moment, persist all important state to chrome.storage, register all event listeners at the top level, and use chrome.alarms for any scheduled or periodic tasks.

By implementing the patterns and code examples in this guide, you'll be well-equipped to build robust, production-ready Chrome extensions that work reliably in the event-driven MV3 environment. The initial learning curve is worth the improved performance, security, and user experience that Manifest V3 provides.

---

Built by [Zovo](https://zovo.one) - Open-source tools and guides for extension developers.
