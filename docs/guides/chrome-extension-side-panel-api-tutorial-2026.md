---
title: "Chrome Extension Side Panel API Tutorial 2026: Complete Guide with TypeScript"
slug: /guides/chrome-extension-side-panel-api-tutorial-2026/
description: "Master the Chrome Side Panel API with this comprehensive TypeScript tutorial. Learn manifest configuration, per-tab panels, communication patterns, and real-world examples from production extensions like Tab Suspender Pro."
keywords: ["chrome extension side panel api tutorial 2026", "chrome side panel manifest v3", "chrome extension side panel typescript", "side panel vs popup chrome extension"]
categories: ["apis", "ui-components", "manifest-v3"]
og-title: "Chrome Extension Side Panel API Tutorial 2026"
og-description: "Complete guide to building Chrome extensions with Side Panel API using TypeScript. Real-world examples from production extensions."
author: "theluckystrike"
updated: 2026-01-15
---

Chrome Extension Side Panel API Tutorial 2026: Complete Guide with TypeScript

The Chrome Side Panel API represents one of the most significant additions to the extension platform in recent years. Introduced in Chrome 114 and continuously improved through 2026, this API enables developers to create persistent, rich interfaces that remain visible as users navigate across websites. Unlike traditional popup windows that close when users click away, side panels provide a dockable, resizable interface that transforms how extensions can deliver ongoing value to users.

In this comprehensive tutorial, you'll learn how to build production-ready side panel extensions using TypeScript, with real-world examples inspired by extensions like Tab Suspender Pro. We'll cover everything from basic setup to advanced patterns including per-tab customization, service worker communication, and responsive design considerations.

Understanding the Side Panel API

The Side Panel API addresses a fundamental limitation of traditional extension popups: their ephemeral nature. When users click away from a popup, it closes, forcing them to reopen it for each interaction. Side panels solve this by remaining open throughout the browsing session, enabling use cases that were previously impractical:

- Research assistants that analyze page content as users browse
- Note-taking tools that persist across multiple pages
- AI-powered companions that maintain context during research sessions
- Reading aids like dictionaries and translators that users reference continuously
- Tab management interfaces similar to Tab Suspender Pro that provide ongoing tab oversight

The API provides fine-grained control over which panel displays for each tab, enabling context-aware experiences that adapt to the website being viewed.

Manifest Configuration

Basic Setup

Every side panel extension requires specific manifest configuration. Here's the complete TypeScript-friendly setup:

```json
{
  "name": "Tab Suspender Pro",
  "version": "2.0.0",
  "manifest_version": 3,
  "description": "Intelligently manage browser tabs to reduce memory usage",
  "permissions": [
    "sidePanel",
    "storage",
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "Tab Suspender Pro"
  },
  "side_panel": {
    "default_path": "sidepanel/panel.html",
    "default_title": "Tab Manager",
    "default_icon": {
      "16": "icons/panel16.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The `side_panel` key accepts three properties:

| Property | Type | Description |
|----------|------|-------------|
| `default_path` | string | Required path to the HTML file |
| `default_title` | string | Accessible title for screen readers |
| `default_icon` | object | 16x16 icon for the panel header |

TypeScript Type Definitions

Chrome provides type definitions for the Side Panel API. Install the types:

```bash
npm install --save-dev @types/chrome
```

The key TypeScript interfaces you'll work with:

```typescript
// Side Panel configuration
interface SidePanelOptions {
  tabId?: number;
  page: string;
  title?: string;
}

// Panel behavior configuration  
interface PanelBehavior {
  openPanelOnActionClick: boolean;
}

// Panel configuration returned from getOptions
interface SidePanelConfig {
  page: string;
  title?: string;
}
```

Core API Methods

Opening the Side Panel

There are two primary ways to open the side panel: user-triggered via the toolbar icon, and programmatically via the API.

User-Triggered Opening:

Configure the panel to open automatically when users click the extension icon:

```typescript
// background/service-worker.ts
export function initializeSidePanel(): void {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});
```

Programmatic Opening:

For more control, open the panel programmatically:

```typescript
// Open for the current active tab
async function openSidePanelForCurrentTab(): Promise<void> {
  try {
    await chrome.sidePanel.open();
    console.log('Side panel opened successfully');
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
}

// Open for a specific tab
async function openSidePanelForTab(tabId: number): Promise<void> {
  try {
    await chrome.sidePanel.open({ tabId });
    console.log(`Side panel opened for tab ${tabId}`);
  } catch (error) {
    console.error(`Failed to open side panel for tab ${tabId}:`, error);
  }
}
```

Note that `chrome.sidePanel.open()` requires a user gesture in most contexts. Attempting to open the panel without user interaction will fail.

Configuring Panel Options

The `setOptions` method controls which panel displays for each tab:

```typescript
// Set the default panel for all tabs
async function setGlobalPanel(panelPath: string): Promise<void> {
  await chrome.sidePanel.setOptions({
    page: panelPath
  });
}

// Set panel for a specific tab
async function setTabPanel(tabId: number, panelPath: string): Promise<void> {
  await chrome.sidePanel.setOptions({
    tabId,
    page: panelPath
  });
}

// Set panel for current active tab
async function setCurrentTabPanel(panelPath: string): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id) {
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      page: panelPath
    });
  }
}
```

Reading Panel Configuration

Retrieve the current panel configuration:

```typescript
// Get configuration for a specific tab
async function getTabPanelConfig(tabId: number): Promise<chrome.sidePanel.SidePanelConfig | null> {
  return new Promise((resolve) => {
    chrome.sidePanel.getOptions(tabId, (config) => {
      resolve(config ?? null);
    });
  });
}

// Get global configuration
async function getGlobalPanelConfig(): Promise<chrome.sidePanel.SidePanelConfig | null> {
  return new Promise((resolve) => {
    chrome.sidePanel.getOptions(undefined, (config) => {
      resolve(config ?? null);
    });
  });
}
```

Panel Behavior Configuration

Control whether clicking the extension icon opens the side panel:

```typescript
// Enable automatic panel opening
async function enableAutoOpen(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

// Disable automatic panel opening
async function disableAutoOpen(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
}

// Check current behavior setting
async function getPanelBehavior(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.sidePanel.getPanelBehavior((behavior) => {
      resolve(behavior.openPanelOnActionClick);
    });
  });
}
```

Per-Tab vs Global Side Panels

One of the Side Panel API's most powerful features is the ability to display different panels based on the active tab's context. This enables sophisticated, context-aware experiences.

Context-Aware Panel Selection

Here's how Tab Suspender Pro uses per-tab panels to provide relevant tab management interfaces:

```typescript
// types/tab-manager.ts
interface TabContext {
  url: string;
  title: string;
  favicon?: string;
  isSuspended: boolean;
  lastActive?: Date;
}

// Determine which panel to show based on the website
async function configurePanelForTab(tabId: number, url: string): Promise<void> {
  let panelPath: string;

  if (url.includes('github.com')) {
    panelPath = 'panels/github-tools.html';
  } else if (url.includes('youtube.com')) {
    panelPath = 'panels/youtube-tools.html';
  } else if (isProductivitySite(url)) {
    panelPath = 'panels/productivity-panel.html';
  } else {
    // Default to the main tab manager panel
    panelPath = 'panels/tab-manager.html';
  }

  await chrome.sidePanel.setOptions({
    tabId,
    page: panelPath
  });
}

// Listen for tab updates to dynamically change panels
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    configurePanelForTab(tabId, tab.url);
  }
});

// Also handle tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    configurePanelForTab(activeInfo.tabId, tab.url);
  }
});
```

Global Panels for Universal Features

Some features should always be accessible regardless of the active tab:

```typescript
// Global search panel that's always available
async function setGlobalSearchPanel(): Promise<void> {
  await chrome.sidePanel.setOptions({
    page: 'panels/global-search.html'
  });
}

// Quick actions panel available everywhere
async function setGlobalQuickActionsPanel(): Promise<void> {
  await chrome.sidePanel.setOptions({
    page: 'panels/quick-actions.html'
  });
}
```

Communication Between Side Panel and Service Worker

The side panel operates in its own execution context, separate from the service worker. Communication between these contexts uses Chrome's message passing system.

Sending Messages from Panel to Service Worker

```typescript
// sidepanel/panel.ts - Sending messages to background
interface PanelMessage {
  type: 'GET_TAB_INFO' | 'SUSPEND_TAB' | 'UPDATE_SETTINGS';
  payload?: unknown;
}

async function sendMessageToBackground(message: PanelMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Example: Get tab information when panel opens
async function requestTabInfo(): Promise<TabContext | null> {
  try {
    const response = await sendMessageToBackground({
      type: 'GET_TAB_INFO'
    });
    return response as TabContext;
  } catch (error) {
    console.error('Failed to get tab info:', error);
    return null;
  }
}

// Example: Suspend a tab from the panel
async function suspendTab(tabId: number): Promise<boolean> {
  try {
    const response = await sendMessageToBackground({
      type: 'SUSPEND_TAB',
      payload: { tabId }
    });
    return (response as { success: boolean }).success;
  } catch (error) {
    console.error('Failed to suspend tab:', error);
    return false;
  }
}
```

Receiving Messages in Service Worker

```typescript
// background/service-worker.ts
interface BackgroundMessage {
  type: string;
  payload?: unknown;
}

chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, sender, sendResponse) => {
    switch (message.type) {
      case 'GET_TAB_INFO':
        handleGetTabInfo(sender.tab?.id, sendResponse);
        return true; // Keep message channel open for async response

      case 'SUSPEND_TAB':
        handleSuspendTab(message.payload as { tabId: number }, sendResponse);
        return true;

      case 'UPDATE_SETTINGS':
        handleUpdateSettings(message.payload, sendResponse);
        return true;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }
);

async function handleGetTabInfo(
  tabId: number | undefined,
  sendResponse: (response: TabContext) => void
): Promise<void> {
  if (!tabId) {
    sendResponse({ url: '', title: '', isSuspended: false });
    return;
  }

  const tab = await chrome.tabs.get(tabId);
  sendResponse({
    url: tab.url || '',
    title: tab.title || '',
    favicon: tab.favIconUrl,
    isSuspended: isTabSuspended(tab),
    lastActive: new Date(tab.lastAccessed || Date.now())
  });
}

async function handleSuspendTab(
  payload: { tabId: number },
  sendResponse: (response: { success: boolean }) => void
): Promise<void> {
  try {
    await chrome.tabs.discard(payload.tabId);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Suspend failed:', error);
    sendResponse({ success: false });
  }
}
```

Using Long-Lived Connections

For continuous communication, establish a long-lived port connection:

```typescript
// sidepanel/panel.ts - Establish persistent connection
let messagePort: chrome.runtime.Port | null = null;

function connectToBackground(): void {
  messagePort = chrome.runtime.connect({ name: 'sidepanel-connection' });

  messagePort.onMessage.addListener((message) => {
    console.log('Received from background:', message);
    handleBackgroundMessage(message);
  });

  messagePort.onDisconnect.addListener(() => {
    console.log('Disconnected from background');
    messagePort = null;
    // Attempt reconnection after a delay
    setTimeout(connectToBackground, 1000);
  });
}

function handleBackgroundMessage(message: unknown): void {
  // Handle updates from background service worker
  console.log('Background update:', message);
}

// Send messages through the port
function sendViaPort(message: unknown): void {
  if (messagePort) {
    messagePort.postMessage(message);
  }
}
```

```typescript
// background/service-worker.ts - Handle connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel-connection') {
    port.onMessage.addListener((message) => {
      // Handle messages from side panel
      console.log('Message from panel:', message);
    });

    // Send periodic updates to connected panel
    const interval = setInterval(() => {
      if (port.sender?.tab?.id) {
        port.postMessage({
          type: 'TAB_UPDATE',
          payload: { tabId: port.sender.tab.id }
        });
      }
    }, 5000);

    port.onDisconnect.addListener(() => {
      clearInterval(interval);
    });
  }
});
```

State Sharing with chrome.storage

For persistent state that survives service worker restarts:

```typescript
// sidepanel/panel.ts - Persist panel state
interface PanelState {
  lastOpenedTab?: number;
  panelWidth?: number;
  filterPreferences?: {
    showSuspended: boolean;
    sortBy: 'activity' | 'title' | 'domain';
  };
}

async function savePanelState(state: Partial<PanelState>): Promise<void> {
  await chrome.storage.local.set(state);
}

async function loadPanelState(): Promise<PanelState> {
  const result = await chrome.storage.local.get([
    'lastOpenedTab',
    'panelWidth',
    'filterPreferences'
  ]);
  return result as PanelState;
}

// background/service-worker.ts - Share extension-wide state
interface ExtensionState {
  suspendedTabs: Map<number, Date>;
  globalSettings: {
    autoSuspend: boolean;
    suspendDelay: number;
  };
}

async function saveExtensionState(state: Partial<ExtensionState>): Promise<void> {
  await chrome.storage.local.set(state);
}
```

Lifecycle and Persistence

Understanding the side panel's lifecycle is crucial for building reliable extensions.

Panel Lifecycle Events

```typescript
// sidepanel/panel.ts - Handle lifecycle
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Side panel loaded');

  // Initialize connection to background
  connectToBackground();

  // Load saved state
  const state = await loadPanelState();
  applyStateToUI(state);

  // Set up visibility change handler
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('Panel hidden - save state');
      savePanelState(getCurrentUIState());
    } else {
      console.log('Panel visible - refresh data');
      refreshPanelData();
    }
  });
});

function refreshPanelData(): void {
  // Fetch latest data when panel becomes visible
  requestTabInfo().then(updateTabDisplay);
}
```

Handling Service Worker Restarts

The service worker can terminate while the panel remains open. Handle reconnection gracefully:

```typescript
// sidepanel/panel.ts - Reconnection logic
class PanelConnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async ensureConnection(): Promise<void> {
    if (!chrome.runtime?.id) {
      console.error('Extension context invalidated');
      return;
    }

    try {
      const port = chrome.runtime.connect({ name: 'sidepanel' });
      this.setupPortListeners(port);
    } catch (error) {
      this.handleReconnectionFailure(error);
    }
  }

  private setupPortListeners(port: chrome.runtime.Port): void {
    port.onMessage.addListener(this.handleMessage.bind(this));
    port.onDisconnect.addListener(() => {
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(
        () => this.ensureConnection(),
        this.reconnectDelay * this.reconnectAttempts
      );
    }
  }

  private handleReconnectionFailure(error: unknown): void {
    console.error('Connection failed:', error);
    this.scheduleReconnect();
  }

  private handleMessage(message: unknown): void {
    console.log('Received:', message);
  }
}
```

Responsive Design for Variable Panel Widths

The side panel can resize from 300px to 600px width, controlled by users. Your panel must adapt:

```typescript
// sidepanel/panel.ts - Responsive design handling
type Breakpoint = 'compact' | 'medium' | 'expanded';

function getBreakpoint(width: number): Breakpoint {
  if (width < 350) return 'compact';
  if (width < 480) return 'medium';
  return 'expanded';
}

function applyResponsiveStyles(breakpoint: Breakpoint): void {
  document.body.classList.remove('compact', 'medium', 'expanded');
  document.body.classList.add(breakpoint);
}

// Use ResizeObserver for efficient monitoring
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const width = entry.contentRect.width;
    const breakpoint = getBreakpoint(width);
    applyResponsiveStyles(breakpoint);
  }
});

resizeObserver.observe(document.body);
```

```css
/* sidepanel/styles.css */
:root {
  --panel-compact-width: 300px;
  --panel-medium-width: 400px;
  --panel-expanded-width: 600px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  transition: all 0.2s ease;
}

/* Compact layout - essential info only */
body.compact .secondary-content { display: none; }
body.compact .tab-preview { display: none; }
body.compact .action-buttons { flex-direction: column; }

/* Medium layout - some additional details */
body.medium .detailed-stats { display: none; }
body.medium .full-description { display: none; }

/* Expanded layout - everything visible */
body.expanded .tab-preview { max-height: 200px; }
```

Building a Production Extension: Tab Manager Example

Here's a complete example combining all concepts:

```typescript
// background/tab-manager.ts
interface TabInfo {
  id: number;
  url: string;
  title: string;
  favicon: string;
  lastActive: number;
  pinned: boolean;
  audible: boolean;
  suspended: boolean;
}

class TabManager {
  private tabs: Map<number, TabInfo> = new Map();

  async initialize(): Promise<void> {
    // Configure side panel behavior
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    // Listen for tab changes
    chrome.tabs.onCreated.addListener((tab) => this.handleTabCreated(tab));
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => 
      this.handleTabUpdated(tabId, changeInfo, tab)
    );
    chrome.tabs.onRemoved.addListener((tabId) => this.handleTabRemoved(tabId));

    // Load existing tabs
    const existingTabs = await chrome.tabs.query({});
    for (const tab of existingTabs) {
      if (tab.id) {
        this.tabs.set(tab.id, this.createTabInfo(tab));
      }
    }
  }

  private createTabInfo(tab: chrome.tabs.Tab): TabInfo {
    return {
      id: tab.id!,
      url: tab.url || '',
      title: tab.title || 'Untitled',
      favicon: tab.favIconUrl || '',
      lastActive: tab.lastAccessed || Date.now(),
      pinned: tab.pinned,
      audible: tab.audible || false,
      suspended: false
    };
  }

  private handleTabCreated(tab: chrome.tabs.Tab): void {
    if (tab.id) {
      this.tabs.set(tab.id, this.createTabInfo(tab));
      this.broadcastUpdate();
    }
  }

  private handleTabUpdated(
    tabId: number, 
    changeInfo: chrome.tabs.TabChangeInfo, 
    tab: chrome.tabs.Tab
  ): void {
    const existing = this.tabs.get(tabId);
    if (existing) {
      this.tabs.set(tabId, { ...existing, ...this.createTabInfo(tab) });
      this.broadcastUpdate();
    }
  }

  private handleTabRemoved(tabId: number): void {
    this.tabs.delete(tabId);
    this.broadcastUpdate();
  }

  private broadcastUpdate(): void {
    // Notify all connected panels
    chrome.runtime.sendMessage({
      type: 'TABS_UPDATED',
      payload: Array.from(this.tabs.values())
    });
  }

  async suspendTab(tabId: number): Promise<boolean> {
    try {
      await chrome.tabs.discard(tabId);
      const tab = this.tabs.get(tabId);
      if (tab) {
        tab.suspended = true;
      }
      return true;
    } catch (error) {
      console.error('Failed to suspend tab:', error);
      return false;
    }
  }
}

// Initialize on service worker startup
const tabManager = new TabManager();
tabManager.initialize();
```

```typescript
// sidepanel/tab-manager-panel.ts
class TabManagerPanel {
  private tabs: TabInfo[] = [];

  async initialize(): Promise<void> {
    // Set up message handlers
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TABS_UPDATED') {
        this.tabs = message.payload;
        this.render();
      }
    });

    // Request initial data
    const response = await chrome.runtime.sendMessage({ type: 'GET_TABS' });
    if (response) {
      this.tabs = response;
      this.render();
    }

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.getElementById('suspend-btn')?.addEventListener('click', async () => {
      const activeTab = await this.getActiveTabId();
      if (activeTab) {
        await chrome.runtime.sendMessage({
          type: 'SUSPEND_TAB',
          payload: { tabId: activeTab }
        });
      }
    });
  }

  private render(): void {
    const container = document.getElementById('tabs-container');
    if (!container) return;

    container.innerHTML = this.tabs.map(tab => `
      <div class="tab-item ${tab.suspended ? 'suspended' : ''}">
        <img src="${tab.favicon}" class="tab-favicon" />
        <span class="tab-title">${this.escapeHtml(tab.title)}</span>
        ${tab.pinned ? '<span class="pin-icon"></span>' : ''}
      </div>
    `).join('');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private async getActiveTabId(): Promise<number | null> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab.id ?? null;
  }
}

// Initialize panel
document.addEventListener('DOMContentLoaded', () => {
  const panel = new TabManagerPanel();
  panel.initialize();
});
```

Side Panel vs Popup: Making the Right Choice

| Feature | Side Panel | Popup |
|---------|-----------|-------|
| Persistence | Stays open during navigation | Closes on blur |
| Width | Resizable 300-600px | Fixed ~300px |
| Height | Full viewport height | Limited ~400px |
| Lifetime | Independent of user action | Triggered by click |
| Multiple panels | Per-tab customization | Single panel |
| Resource usage | Higher (always rendered) | Lower (on-demand) |

Choose Side Panel When Building:
- Research tools that analyze multiple pages
- Note-taking with persistent access
- AI assistants requiring ongoing context
- Tab management interfaces like Tab Suspender Pro
- Reading aids (dictionaries, translators)
- Site-specific tools

Choose Popup When Building:
- Quick actions (bookmark, copy, toggle)
- Settings and configuration forms
- One-time notifications
- Simple interactions under 3 seconds
- Resource-constrained environments

Performance Best Practices

Side panels consume resources while open. Optimize for performance:

```typescript
// Lazy load panel content
async function lazyLoadContent(): Promise<void> {
  // Only load heavy content when panel is visible
  if (!document.hidden) {
    const content = await import('./heavy-component.js');
    content.initialize();
  }
}

// Use requestAnimationFrame for smooth updates
function animateTabList(tabs: TabInfo[]): void {
  requestAnimationFrame(() => {
    renderTabs(tabs);
  });
}

// Debounce resize handlers
function debounce<T extends (...args: unknown[]) => void>(
  fn: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const handleResize = debounce(() => {
  // Handle resize
}, 150);

window.addEventListener('resize', handleResize);
```

Security Considerations

Follow security best practices:

```typescript
// Always validate messages from the panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender is from your extension
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ error: 'Unauthorized' });
    return false;
  }

  // Validate message structure
  if (!message.type || typeof message.type !== 'string') {
    sendResponse({ error: 'Invalid message' });
    return false;
  }

  // Process valid messages
  return true;
});

// Use Content Security Policy
// In manifest.json:
{
  "content_security_policy": {
    "extension_page": "script-src 'self'; style-src 'self' 'unsafe-inline'"
  }
}
```

Conclusion

The Chrome Side Panel API opens exciting possibilities for extension developers. Unlike traditional popups, side panels provide persistent, context-aware interfaces that transform the user experience. Throughout this tutorial, you've learned how to:

- Configure the manifest for side panel support
- Use TypeScript for type-safe development
- Implement per-tab and global panel configurations
- Establish solid communication between panel and service worker
- Handle lifecycle events and service worker restarts
- Build responsive interfaces that adapt to panel width
- Apply performance optimizations for production extensions

Extensions like Tab Suspender Pro demonstrate the power of side panels for ongoing tab management. By following the patterns and best practices in this guide, you can build sophisticated, production-ready extensions that provide lasting value to users.

For more information, consult the [official Chrome Side Panel documentation](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) and explore additional resources at [zovo.one](https://zovo.one).

---

*This guide is part of the Chrome Extension Development series. For more tutorials on building production-ready extensions, visit our [guides section](/guides/).*
