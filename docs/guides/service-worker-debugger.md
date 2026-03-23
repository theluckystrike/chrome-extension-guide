# Building a Service Worker Debugger Chrome Extension

## Overview

This guide covers building a Chrome extension that debugs, monitors, and inspects Service Workers in real-time. Service Workers are a powerful but notoriously difficult-to-debug feature of modern web applications. A dedicated debugger extension can significantly improve the development experience by providing visibility into worker lifecycle, fetch events, caching, and messaging.

## Architecture and Manifest Setup

### Manifest Configuration (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "Service Worker Debugger",
  "version": "1.0.0",
  "description": "Debug and monitor Service Workers in real-time",
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting",
    "debugger"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/worker.ts",
    "type": "module"
  },
  "action": {
    "default_popup": "ui/popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "side_panel": {
    "default_path": "ui/sidebar/index.html"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Project Structure

```
src/
 background/
    worker.ts           # Main service worker
    debugger.ts         # Chrome Debugger API wrapper
    events.ts           # Event collectors
    storage.ts          # State management
 ui/
    popup/
       index.html
       popup.ts
       popup.css
    sidebar/
       index.html
       sidebar.ts
       sidebar.css
    content/
        overlay.ts      # In-page overlay
        overlay.css
 shared/
    types.ts            # TypeScript interfaces
    constants.ts
    utils.ts
 manifest.ts
```

## Core Implementation with TypeScript

### Shared Types (shared/types.ts)

```typescript
// Service Worker lifecycle states
export type ServiceWorkerState = 
  | 'installed'
  | 'activated'
  | 'redundant'
  | 'installing'
  | 'activating';

// Worker information
export interface ServiceWorkerInfo {
  id: number;
  registrationId: number;
  scriptURL: string;
  state: ServiceWorkerState;
  navigationPreload: boolean;
}

// Event log entry
export interface SWEvent {
  id: string;
  timestamp: number;
  type: 'fetch' | 'push' | 'notificationclick' | 'message' | 'sync' | 'periodicsync';
  details: FetchEventDetails | PushEventDetails | MessageEventDetails | SyncEventDetails;
  source: string;
  success?: boolean;
  error?: string;
}

// Fetch event details
export interface FetchEventDetails {
  request: {
    url: string;
    method: string;
    destination: string;
    mode: RequestMode;
    credentials: RequestCredentials;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    bodySize: number;
  };
  handled: boolean;
  responseTime: number;
}

// Push notification details
export interface PushEventDetails {
  data?: string;
  title?: string;
  tag?: string;
  timestamp?: number;
}

// Message event details
export interface MessageEventDetails {
  data: unknown;
  origin: string;
  lastEventId: string;
  ports: number;
}

// Sync event details
export interface SyncEventDetails {
  tag: string;
  lastChance: boolean;
}

// Cache information
export interface CacheInfo {
  name: string;
  size: number;
  requestUrls: string[];
}

// Extension state
export interface ExtensionState {
  isDebugging: boolean;
  targetTabId: number | null;
  workers: ServiceWorkerInfo[];
  events: SWEvent[];
  caches: CacheInfo[];
  selectedWorkerId: number | null;
}
```

### Background Service Worker (background/worker.ts)

```typescript
import { ServiceWorkerInfo, SWEvent, ExtensionState, CacheInfo } from '../shared/types';

const state: ExtensionState = {
  isDebugging: false,
  targetTabId: null,
  workers: [],
  events: [],
  caches: [],
  selectedWorkerId: null,
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SW Debugger] Extension installed');
  setupEventListeners();
});

function setupEventListeners(): void {
  // Listen for service worker events
  chrome.devtools.network.onRequestFinished.addListener(handleNetworkRequest);
  chrome.runtime.onMessage.addListener(handleMessage);
  chrome.tabs.onUpdated.addListener(handleTabUpdate);
  chrome.tabs.onActivated.addListener(handleTabActivation);
}

async function handleNetworkRequest(request: {
  getContent: (callback: (content: string) => void) => void;
  request: { url: string; method: string };
  response: { statusCode: number; headers: Array<{ name: string; value: string }> };
}): Promise<void> {
  if (!state.isDebugging || !state.targetTabId) return;
  
  // Filter for service worker related requests
  if (request.request.url.includes('service-worker.js') || 
      request.request.url.includes('sw.js')) {
    const event: SWEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'fetch',
      details: {
        request: {
          url: request.request.url,
          method: request.request.method,
          destination: 'serviceworker',
          mode: 'same-origin',
          credentials: 'same-origin',
        },
        response: {
          status: request.response.statusCode,
          statusText: request.response.statusCode === 200 ? 'OK' : 'Error',
          headers: request.response.headers.reduce((acc, h) => {
            acc[h.name] = h.value;
            return acc;
          }, {} as Record<string, string>),
          bodySize: 0,
        },
        handled: true,
        responseTime: Date.now(),
      },
      source: 'network',
    };
    
    state.events.unshift(event);
    broadcastState();
  }
}

function handleMessage(
  message: { type: string; payload?: unknown },
  sender: chrome.runtime.MessageSender
): void {
  switch (message.type) {
    case 'GET_STATE':
      chrome.runtime.sendMessage({ type: 'STATE_UPDATE', payload: state });
      break;
    case 'START_DEBUGGING':
      startDebugging(sender.tab?.id);
      break;
    case 'STOP_DEBUGGING':
      stopDebugging();
      break;
    case 'GET_WORKERS':
      refreshWorkers();
      break;
    case 'CLEAR_EVENTS':
      state.events = [];
      broadcastState();
      break;
  }
}

async function startDebugging(tabId: number | undefined): Promise<void> {
  if (!tabId) return;
  
  state.targetTabId = tabId;
  state.isDebugging = true;
  
  try {
    // Attach debugger to the tab
    await chrome.debugger.attach({ tabId }, '1.3');
    await chrome.debugger.sendCommand({ tabId }, 'ServiceWorker.enable');
    
    // Listen for service worker events
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (source.tabId !== tabId) return;
      handleDebuggerEvent(method, params);
    });
    
    await refreshWorkers();
    console.log('[SW Debugger] Started debugging tab:', tabId);
  } catch (error) {
    console.error('[SW Debugger] Failed to start debugging:', error);
    state.isDebugging = false;
  }
}

async function stopDebugging(): Promise<void> {
  if (state.targetTabId) {
    try {
      await chrome.debugger.detach({ tabId: state.targetTabId });
    } catch (error) {
      console.error('[SW Debugger] Failed to detach debugger:', error);
    }
  }
  
  state.isDebugging = false;
  state.targetTabId = null;
  state.workers = [];
  broadcastState();
}

async function refreshWorkers(): Promise<void> {
  if (!state.targetTabId) return;
  
  try {
    const workers = await chrome.debugger.sendCommand(
      { tabId: state.targetTabId },
      'ServiceWorker.getVersions'
    );
    
    state.workers = (workers.versions || []).map((w: any) => ({
      id: w.versionId,
      registrationId: w.registrationId,
      scriptURL: w.scriptURL,
      state: w.status as ServiceWorkerState,
      navigationPreload: w.navigationPreloadEnabled || false,
    }));
    
    broadcastState();
  } catch (error) {
    console.error('[SW Debugger] Failed to get workers:', error);
  }
}

function handleDebuggerEvent(method: string, params: any): void {
  switch (method) {
    case 'serviceWorkerWorkerUpdated':
      refreshWorkers();
      break;
    case 'serviceWorkerVersionUpdated':
      refreshWorkers();
      break;
    case 'serviceWorkerErrorReported':
      handleWorkerError(params);
      break;
  }
}

function handleWorkerError(params: any): void {
  const event: SWEvent = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type: 'fetch',
    details: {
      request: { url: params.errorMessage, method: 'ERROR', destination: 'serviceworker', mode: 'same-origin', credentials: 'same-origin' },
      handled: false,
      responseTime: 0,
    },
    source: 'error',
    success: false,
    error: params.errorMessage,
  };
  
  state.events.unshift(event);
  broadcastState();
}

function broadcastState(): void {
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', payload: state });
}

async function handleTabUpdate(tabId: number, changeInfo: chrome.tabs.TabChangeInfo): Promise<void> {
  if (state.targetTabId === tabId && changeInfo.status === 'complete') {
    await refreshWorkers();
  }
}

async function handleTabActivation(activeInfo: chrome.tabs.TabActiveInfo): Promise<void> {
  if (state.isDebugging) {
    state.targetTabId = activeInfo.tabId;
    await refreshWorkers();
  }
}
```

## UI Design

### Popup Interface (ui/popup/popup.ts)

```typescript
import { ExtensionState, SWEvent } from '../../shared/types';

let currentState: ExtensionState | null = null;

// Listen for state updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STATE_UPDATE') {
    currentState = message.payload;
    render();
  }
});

// Request initial state
chrome.runtime.sendMessage({ type: 'GET_STATE' });

function render(): void {
  if (!currentState) return;
  
  const container = document.getElementById('worker-list');
  if (!container) return;
  
  container.innerHTML = currentState.workers
    .map(worker => `
      <div class="worker-item ${worker.state === 'activated' ? 'active' : ''}">
        <div class="worker-url">${new URL(worker.scriptURL).pathname}</div>
        <div class="worker-state">${worker.state}</div>
      </div>
    `)
    .join('');
  
  // Update event count
  const eventCount = document.getElementById('event-count');
  if (eventCount) {
    eventCount.textContent = String(currentState.events.length);
  }
  
  // Update connection status
  const status = document.getElementById('connection-status');
  if (status) {
    status.textContent = currentState.isDebugging ? 'Connected' : 'Disconnected';
    status.className = currentState.isDebugging ? 'status connected' : 'status disconnected';
  }
}

// Event handlers
document.getElementById('refresh-btn')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'GET_WORKERS' });
});

document.getElementById('open-sidebar-btn')?.addEventListener('click', () => {
  chrome.sidePanel.open({ path: '/ui/sidebar/index.html' });
});

document.getElementById('clear-events-btn')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_EVENTS' });
});
```

### Sidebar Interface (ui/sidebar/sidebar.ts)

```typescript
import { ExtensionState, SWEvent } from '../../shared/types';

let currentState: ExtensionState | null = null;
let selectedEventId: string | null = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ type: 'GET_STATE' });
  
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STATE_UPDATE') {
      currentState = message.payload;
      render();
    }
  });
  
  // Setup filters
  setupFilters();
});

function render(): void {
  if (!currentState) return;
  
  renderWorkerList();
  renderEventList();
  renderEventDetails();
}

function renderWorkerList(): void {
  const container = document.getElementById('workers-container');
  if (!container || !currentState) return;
  
  container.innerHTML = currentState.workers
    .map(worker => `
      <div class="worker-card ${worker.state === 'activated' ? 'active' : ''}"
           data-worker-id="${worker.id}">
        <div class="worker-header">
          <span class="status-dot ${worker.state}"></span>
          <span class="worker-state">${worker.state}</span>
        </div>
        <div class="worker-url">${escapeHtml(worker.scriptURL)}</div>
        <div class="worker-actions">
          <button class="btn-inspect" data-worker-id="${worker.id}">Inspect</button>
          <button class="btn-terminate" data-worker-id="${worker.id}">Terminate</button>
        </div>
      </div>
    `)
    .join('');
}

function renderEventList(): void {
  const container = document.getElementById('events-container');
  if (!container || !currentState) return;
  
  const filterType = (document.getElementById('filter-type') as HTMLSelectElement)?.value;
  const filterSuccess = (document.getElementById('filter-success') as HTMLSelectElement)?.value;
  
  let events = [...currentState.events];
  
  if (filterType && filterType !== 'all') {
    events = events.filter(e => e.type === filterType);
  }
  
  if (filterSuccess === 'success') {
    events = events.filter(e => e.success !== false);
  } else if (filterSuccess === 'error') {
    events = events.filter(e => e.success === false);
  }
  
  container.innerHTML = events
    .slice(0, 100)
    .map(event => `
      <div class="event-item ${selectedEventId === event.id ? 'selected' : ''} ${event.success === false ? 'error' : ''}"
           data-event-id="${event.id}">
        <div class="event-time">${formatTime(event.timestamp)}</div>
        <div class="event-type">${event.type}</div>
        <div class="event-source">${event.source}</div>
      </div>
    `)
    .join('');
  
  // Add click handlers
  container.querySelectorAll('.event-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedEventId = item.getAttribute('data-event-id');
      renderEventDetails();
    });
  });
}

function renderEventDetails(): void {
  const container = document.getElementById('event-details');
  if (!container || !currentState || !selectedEventId) {
    container.innerHTML = '<p class="placeholder">Select an event to view details</p>';
    return;
  }
  
  const event = currentState.events.find(e => e.id === selectedEventId);
  if (!event) return;
  
  container.innerHTML = `
    <div class="details-header">
      <h3>Event Details</h3>
      <span class="event-id">${event.id}</span>
    </div>
    <div class="details-content">
      <pre>${JSON.stringify(event.details, null, 2)}</pre>
    </div>
  `;
}

function setupFilters(): void {
  document.getElementById('filter-type')?.addEventListener('change', renderEventList);
  document.getElementById('filter-success')?.addEventListener('change', renderEventList);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
```

## Chrome APIs Used and Permissions

### Required Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Persist user preferences and cached data |
| `tabs` | Access tab information for worker targeting |
| `activeTab` | Access the active tab for debugging |
| `scripting` | Inject content scripts for overlay |
| `debugger` | Core API for Service Worker debugging |

### Key Chrome APIs

```typescript
// Debugger API - Main debugging interface
chrome.debugger.attach(target: Debuggee, requiredVersion: string): Promise<void>
chrome.debugger.detach(target: Debuggee): Promise<void>
chrome.debugger.sendCommand(target: Debuggee, method: string, params?: object): Promise<any>

// Service Worker specific commands
'ServiceWorker.enable'
'ServiceWorker.disable'
'ServiceWorker.getVersions'
'ServiceWorker.getRegistrations'
'ServiceWorker.deliverPushMessage'
'ServiceWorker.dispatchSyncEvent'
'ServiceWorker.updateRegistration'

// Event listeners
chrome.debugger.onEvent.addListener((source, method, params) => {})
chrome.debugger.onDetach.addListener((source, reason) => {})

// Network monitoring
chrome.devtools.network.onRequestFinished.addListener((request) => {})
```

## State Management and Storage Patterns

### Using chrome.storage for Persistence

```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  isEnabled: true,
  autoRefresh: true,
  refreshInterval: 5000,
  maxEvents: 1000,
  selectedTabIds: [] as number[],
  breakpoints: [] as Array<{ url: string; line: number }>,
  watchedUrls: [] as string[],
});

const storage = createStorage({ schema });

// Usage in background worker
async function loadSettings(): Promise<void> {
  const settings = await storage.getAll();
  state.autoRefresh = settings.autoRefresh;
  state.maxEvents = settings.maxEvents;
}

async function saveBreakpoint(url: string, line: number): Promise<void> {
  const current = await storage.get('breakpoints');
  await storage.set('breakpoints', [...current, { url, line }]);
}
```

### In-Memory State with Periodic Persistence

```typescript
class StateManager<T extends Record<string, unknown>> {
  private state: T;
  private listeners: Set<(state: T) => void> = new Set();
  private persistInterval: number | null = null;
  
  constructor(initialState: T, private storageKey: string) {
    this.state = initialState;
    this.loadFromStorage();
  }
  
  private async loadFromStorage(): Promise<void> {
    const stored = await chrome.storage.local.get(this.storageKey);
    if (stored[this.storageKey]) {
      this.state = { ...this.state, ...stored[this.storageKey] };
    }
  }
  
  setState(updater: Partial<T>): void {
    this.state = { ...this.state, ...updater };
    this.notifyListeners();
    this.debouncedPersist();
  }
  
  getState(): T {
    return this.state;
  }
  
  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
  
  private debouncedPersist(): void {
    if (this.persistInterval) {
      clearTimeout(this.persistInterval);
    }
    this.persistInterval = window.setTimeout(() => {
      chrome.storage.local.set({ [this.storageKey]: this.state });
    }, 1000);
  }
}
```

## Error Handling and Edge Cases

### Comprehensive Error Handling

```typescript
class DebuggerErrorHandler {
  private errors: Array<{ message: string; timestamp: number; context: string }> = [];
  
  async withErrorHandling<T>(
    context: string,
    operation: () => Promise<T>,
    fallback?: T
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.errors.push({ message, timestamp: Date.now(), context });
      console.error(`[SW Debugger] ${context}:`, error);
      
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }
  
  handleDebuggerError(error: Error, tabId: number): void {
    // Check if it's a permission error
    if (error.message.includes('Permission denied')) {
      this.showPermissionError(tabId);
    } else if (error.message.includes('No target')) {
      this.handleNoTarget(tabId);
    } else {
      this.showGenericError(error.message);
    }
  }
  
  private async showPermissionError(tabId: number): Promise<void> {
    await chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_NOTIFICATION',
      payload: {
        title: 'Debugger Permission Required',
        message: 'Please grant debugger permission to debug Service Workers',
        action: { type: 'OPEN_SETTINGS' },
      },
    });
  }
  
  private handleNoTarget(tabId: number): void {
    console.warn('[SW Debugger] No service worker found in tab:', tabId);
  }
  
  getErrors(): Array<{ message: string; timestamp: number; context: string }> {
    return [...this.errors];
  }
}

const errorHandler = new DebuggerErrorHandler();
```

### Edge Case Handling

```typescript
// Handle service worker termination during debugging
chrome.debugger.onDetach.addListener((source, reason) => {
  if (reason === 'target_closed' || reason === 'canceled') {
    state.isDebugging = false;
    broadcastState();
  }
});

// Handle multiple tabs with service workers
async function findServiceWorkerTab(): Promise<number | null> {
  const tabs = await chrome.tabs.query({});
  
  for (const tab of tabs) {
    if (!tab.id) continue;
    
    try {
      const workers = await chrome.debugger.sendCommand(
        { tabId: tab.id },
        'ServiceWorker.getVersions'
      );
      
      if (workers.versions?.length > 0) {
        return tab.id;
      }
    } catch {
      // Tab doesn't have service workers
    }
  }
  
  return null;
}

// Handle version mismatch
async function ensureVersionCompatible(tabId: number): Promise<boolean> {
  try {
    const info = await chrome.debugger.getTargets();
    const target = info.find(t => t.tabId === tabId);
    
    if (!target) return false;
    
    // Check Chrome version compatibility
    const version = parseInt(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '0');
    return version >= 100; // Require Chrome 100+ for full SW debugging
  } catch {
    return false;
  }
}
```

## Testing Approach

### Unit Testing with Vitest

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from './state-manager';

describe('StateManager', () => {
  let storageGet: any;
  let storageSet: any;
  
  beforeEach(() => {
    storageGet = vi.fn().mockResolvedValue({});
    storageSet = vi.fn().mockResolvedValue(undefined);
    
    global.chrome = {
      storage: {
        local: {
          get: storageGet,
          set: storageSet,
        },
      },
    } as any;
  });
  
  it('should initialize with default state', () => {
    const manager = new StateManager({ count: 0 }, 'test-key');
    expect(manager.getState()).toEqual({ count: 0 });
  });
  
  it('should update state and notify listeners', () => {
    const manager = new StateManager({ count: 0 }, 'test-key');
    const listener = vi.fn();
    
    manager.subscribe(listener);
    manager.setState({ count: 5 });
    
    expect(manager.getState().count).toBe(5);
    expect(listener).toHaveBeenCalledWith({ count: 5 });
  });
  
  it('should persist state after debounce', async () => {
    const manager = new StateManager({ count: 0 }, 'test-key');
    
    manager.setState({ count: 10 });
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(storageSet).toHaveBeenCalledWith({
      'test-key': { count: 10 },
    });
  });
});
```

### Integration Testing with Puppeteer

```typescript
import { test, expect } from '@playwright/test';

test.describe('Service Worker Debugger Extension', () => {
  test('should attach to tab with service worker', async ({ page }) => {
    // Navigate to page with service worker
    await page.goto('https://example.com/sw.js');
    
    // Get extension ID from environment
    const extensionId = process.env.EXTENSION_ID;
    
    // Open extension popup
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Click debug button
    await page.click('#start-debugging');
    
    // Verify connected state
    await expect(page.locator('#connection-status')).toHaveText('Connected');
  });
  
  test('should display service worker events', async ({ page }) => {
    // Setup mock service worker
    await page.route('/sw.js', async route => {
      await route.fulfill({
        status: 200,
        body: `
          self.addEventListener('fetch', event => {
            event.respondWith(new Response('OK'));
          });
        `,
      });
    });
    
    // Trigger fetch event
    await page.goto('https://example.com/');
    
    // Wait for event to appear in extension
    const extensionPage = await page.context().newPage();
    await extensionPage.goto(`chrome-extension://${process.env.EXTENSION_ID}/sidebar.html`);
    
    await expect(extensionPage.locator('.event-item')).toBeVisible();
  });
});
```

## Performance Considerations

### Optimizing Event Collection

```typescript
class OptimizedEventCollector {
  private buffer: SWEvent[] = [];
  private flushInterval: number | null = null;
  private readonly MAX_BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL = 1000;
  
  constructor(private onFlush: (events: SWEvent[]) => void) {
    this.startFlushLoop();
  }
  
  addEvent(event: SWEvent): void {
    this.buffer.push(event);
    
    // Flush immediately if buffer is full
    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    }
  }
  
  private flush(): void {
    if (this.buffer.length === 0) return;
    
    const events = [...this.buffer];
    this.buffer = [];
    this.onFlush(events);
  }
  
  private startFlushLoop(): void {
    this.flushInterval = window.setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }
  
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush(); // Final flush
  }
}
```

### Memory Management

```typescript
const MAX_EVENTS = 1000;
const MAX_CACHES = 50;

function pruneOldEvents(): void {
  if (state.events.length > MAX_EVENTS) {
    state.events = state.events.slice(0, MAX_EVENTS);
  }
}

function pruneCaches(): void {
  if (state.caches.length > MAX_CACHES) {
    state.caches = state.caches.slice(0, MAX_CACHES);
  }
}

// Periodic cleanup
setInterval(() => {
  pruneOldEvents();
  pruneCaches();
  broadcastState();
}, 30000);
```

## Publishing Checklist

### Pre-Publication Requirements

- [ ] Update `manifest.json` version number
- [ ] Test in Chrome, Edge, and Firefox (if cross-browser)
- [ ] Verify all permissions are necessary and minimal
- [ ] Add privacy policy if storing user data
- [ ] Create screenshots for store listing
- [ ] Write concise store description (max 132 characters)
- [ ] Prepare store assets (128x128, 440x280 icons)

### Store Listing Details

```json
{
  "name": "Service Worker Debugger",
  "short_name": "SW Debugger",
  "description": "Debug and monitor Service Workers with real-time event tracking, fetch inspection, and cache management",
  "category": "Developer Tools",
  "keywords": ["service worker", "debugger", "pwa", "offline", "cache"]
}
```

### Post-Publication

- [ ] Monitor crash reports in Chrome Web Store dashboard
- [ ] Set up automated tests in CI/CD
- [ ] Create GitHub releases with changelog
- [ ] Document known limitations
- [ ] Set up issue templates

### Version Bumping

```bash
# Use semantic versioning
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## Conclusion

Building a Service Worker debugger extension requires careful handling of Chrome's debugger APIs, proper state management for ephemeral service workers, and thoughtful UI design. This guide provides the foundation for creating a solid debugging tool that can significantly improve the development experience for PWA and Service Worker-based applications.

Key takeaways:
1. Use the Chrome Debugger API for low-level Service Worker inspection
2. Implement proper error handling for permission and connectivity issues
3. Design a clean UI with popup for quick access and sidebar for detailed analysis
4. Consider performance implications of event collection and storage
5. Follow Chrome Web Store guidelines for a smooth publishing process
