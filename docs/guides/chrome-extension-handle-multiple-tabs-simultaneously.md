---
layout: default
title: "Chrome Extension Handle Multiple Tabs Simultaneously: Complete TypeScript Guide"
description: "Master multi-tab management in Chrome extensions with TypeScript. Learn to track, coordinate, and control multiple tabs efficiently with real-world examples from Tab Suspender Pro."
permalink: /guides/chrome-extension-handle-multiple-tabs-simultaneously/
---

# Chrome Extension Handle Multiple Tabs Simultaneously: Complete TypeScript Guide

Building Chrome extensions that effectively manage multiple tabs simultaneously is one of the most valuable yet challenging aspects of extension development. Whether you're building a tab manager, a productivity suite, or an extension like Tab Suspender Pro that automatically manages tab lifecycle, understanding how to handle multiple tabs efficiently is essential for creating performant, reliable extensions.

This comprehensive guide walks you through building TypeScript-powered Chrome extensions that can track, coordinate, and control multiple tabs in various scenarios. You'll learn patterns used in production extensions serving thousands of users, with complete code examples you can adapt for your own projects.

## Table of Contents

- [Understanding the Chrome Tabs API](#understanding-the-chrome-tabs-api)
- [Core Concepts for Multi-Tab Management](#core-concepts-for-multi-tab-management)
- [Setting Up Your TypeScript Project](#setting-up-your-typescript-project)
- [Tracking Tab State Across Your Extension](#tracking-tab-state-across-your-extension)
- [Working with Tab Groups](#working-with-tab-groups)
- [Implementing Bulk Tab Operations](#implementing-bulk-tab-operations)
- [Handling Tab Events Effectively](#handling-tab-events-effectively)
- [Real-World Example: Building a Tab Manager](#real-world-example-building-a-tab-manager)
- [Performance Considerations](#performance-considerations)
- [Error Handling and Edge Cases](#error-handling-and-edge-cases)
- [Testing Your Multi-Tab Extension](#testing-your-multi-tab-extension)
- [Frequently Asked Questions](#frequently-asked-questions)

## Understanding the Chrome Tabs API

The `chrome.tabs` API is the foundation for any extension that works with browser tabs. In Manifest V3, this API provides methods to query, create, update, and remove tabs, along with powerful event listeners that notify your extension when tab states change.

### Key Tab Properties

When working with tabs, you'll primarily interact with these properties:

```typescript
interface ChromeTab {
  id: number;              // Unique tab identifier
  windowId: number;        // Window containing the tab
  index: number;           // Position in the window
  title: string;          // Page title
  url: string | undefined; // URL (undefined if restricted)
  faviconUrl?: string;    // Page favicon
  active: boolean;        // Whether tab is active in its window
  pinned: boolean;        // Whether tab is pinned
  incognito: boolean;     // Whether tab is in incognito mode
  status: 'loading' | 'complete';
  suspended?: boolean;    // Chrome's built-in tab suspension state
}
```

Understanding these properties is crucial for building robust multi-tab functionality. Tab Suspender Pro, for instance, uses these properties extensively to determine which tabs are eligible for suspension and how to restore them.

### Required Permissions

To work with tabs, you need to declare the appropriate permissions in your manifest:

```json
{
  "manifest_version": 3,
  "name": "Multi-Tab Manager",
  "version": "1.0",
  "permissions": [
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

For read-only access to tab information in the active tab, you can use the more restricted `activeTab` permission instead, which only grants access when the user clicks your extension.

## Core Concepts for Multi-Tab Management

Before diving into code, let's establish the core concepts that power successful multi-tab extensions.

### Tab Identity and Lifecycle

Each tab in Chrome has a unique identifier that remains constant throughout its lifetime within a session. However, tab IDs can be reused after a tab is closed, so always handle the case where a tab ID might reference a non-existent tab.

```typescript
class TabTracker {
  private activeTabs: Map<number, chrome.tabs.Tab> = new Map();

  async trackTab(tabId: number): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);
      this.activeTabs.set(tabId, tab);
    } catch (error) {
      // Tab no longer exists
      this.activeTabs.delete(tabId);
    }
  }

  getTab(tabId: number): chrome.tabs.Tab | undefined {
    return this.activeTabs.get(tabId);
  }

  removeTab(tabId: number): void {
    this.activeTabs.delete(tabId);
  }
}
```

### Tab Windows vs Tab Groups

Chrome distinguishes between windows (containers for tabs) and tab groups (optional organization within a window). Your extension needs to handle both:

```typescript
interface WindowInfo {
  id: number;
  type: 'normal' | 'popup' | 'app' | 'devtools';
  state: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
  tabs: chrome.tabs.Tab[];
}

async function getAllWindows(): Promise<WindowInfo[]> {
  const windows = await chrome.windows.getAll({ populate: true });
  return windows.map(win => ({
    id: win.id,
    type: win.type,
    state: win.state,
    tabs: win.tabs || []
  }));
}
```

## Setting Up Your TypeScript Project

Let's create a well-structured TypeScript project for multi-tab management. We'll use a modern setup with proper typing and build configuration.

### Project Structure

```
my-extension/
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── content-scripts/
│   │   └── tracker.ts
│   ├── popup/
│   │   └── popup.ts
│   ├── shared/
│   │   ├── types.ts
│   │   └── utils.ts
│   └── index.ts
├── manifest.json
├── tsconfig.json
└── package.json
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Installing Type Definitions

```bash
npm install --save-dev @types/chrome
```

## Tracking Tab State Across Your Extension

One of the most important aspects of multi-tab management is maintaining accurate state information about all open tabs. This is particularly crucial for extensions like Tab Suspender Pro that need to make decisions based on the current state of multiple tabs.

### Building a Tab State Manager

```typescript
import { ChromeTab, TabState, SuspendReason } from '../shared/types';

class TabStateManager {
  private tabStates: Map<number, TabState> = new Map();
  private listeners: Set<(tabId: number, state: TabState) => void> = new Set();

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Track when tabs are created
    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.id) {
        this.updateTabState(tab.id, {
          status: 'active',
          lastActive: Date.now(),
          suspendReason: null
        });
      }
    });

    // Track when tabs are removed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabStates.delete(tabId);
      this.notifyListeners(tabId, null);
    });

    // Track tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.id) {
        this.updateTabState(tabId, {
          status: 'loaded',
          url: tab.url,
          title: tab.title
        });
      }
    });

    // Track active tab changes
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      // Mark the previously active tab as inactive
      const allTabs = await chrome.tabs.query({ windowId: activeInfo.windowId });
      for (const tab of allTabs) {
        if (tab.id && tab.id !== activeInfo.tabId) {
          this.updateTabState(tab.id, { status: 'inactive' });
        }
      }
      // Mark the new active tab
      if (activeInfo.tabId) {
        this.updateTabState(activeInfo.tabId, {
          status: 'active',
          lastActive: Date.now()
        });
      }
    });
  }

  private updateTabState(tabId: number, updates: Partial<TabState>): void {
    const current = this.tabStates.get(tabId) || {
      tabId,
      status: 'unknown',
      lastActive: Date.now(),
      suspendReason: null
    };

    const updated = { ...current, ...updates };
    this.tabStates.set(tabId, updated);
    this.notifyListeners(tabId, updated);
  }

  private notifyListeners(tabId: number, state: TabState | null): void {
    for (const listener of this.listeners) {
      listener(tabId, state as TabState);
    }
  }

  subscribe(listener: (tabId: number, state: TabState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(tabId: number): TabState | undefined {
    return this.tabStates.get(tabId);
  }

  getAllStates(): Map<number, TabState> {
    return new Map(this.tabStates);
  }
}

export const tabStateManager = new TabStateManager();
```

### Defining Shared Types

```typescript
// src/shared/types.ts

export type TabStatus = 'loading' | 'loaded' | 'active' | 'inactive' | 'suspended';
export type SuspendReason = 'manual' | 'automatic' | 'memory' | 'idle';

export interface TabState {
  tabId: number;
  status: TabStatus;
  url?: string;
  title?: string;
  lastActive: number;
  suspendReason?: SuspendReason;
}

export interface TabGroup {
  id: number;
  title: string;
  color: string;
  tabIds: number[];
}

export interface MultiTabOperation {
  operation: 'suspend' | 'activate' | 'close' | 'move' | 'group';
  tabIds: number[];
  options?: Record<string, unknown>;
}
```

## Working with Tab Groups

Chrome's tab groups API allows users to organize tabs visually. Your extension can create, modify, and delete tab groups, as well as move tabs between groups.

### Creating and Managing Tab Groups

```typescript
class TabGroupManager {
  async createGroup(tabIds: number[], title: string, color: string = 'grey'): Promise<number> {
    const group = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(group, { title, color });
    return group;
  }

  async addTabsToGroup(groupId: number, tabIds: number[]): Promise<void> {
    await chrome.tabs.group({ groupId, tabIds });
  }

  async removeTabsFromGroup(tabIds: number[]): Promise<void> {
    for (const tabId of tabIds) {
      await chrome.tabs.ungroup(tabId);
    }
  }

  async getAllGroups(): Promise<chrome.tabGroups.TabGroup[]> {
    return await chrome.tabGroups.getAll();
  }

  async deleteGroup(groupId: number): Promise<void> {
    await chrome.tabGroups.remove(groupId);
  }

  async updateGroupTitle(groupId: number, title: string): Promise<void> {
    await chrome.tabGroups.update(groupId, { title });
  }
}

export const tabGroupManager = new TabGroupManager();
```

## Implementing Bulk Tab Operations

Extensions like Tab Suspender Pro often need to perform operations on multiple tabs simultaneously. This section covers patterns for efficiently managing bulk operations.

### Batch Suspending Tabs

```typescript
interface SuspendOptions {
  excludePinned: boolean;
  excludeAudio: boolean;
  excludeActive: boolean;
  whitelist: string[];
  maxTabs: number;
}

class BulkTabOperations {
  async suspendTabs(tabIds: number[], options: SuspendOptions): Promise<{
    success: number;
    failed: number;
    skipped: number;
  }> {
    const results = { success: 0, failed: 0, skipped: 0 };
    const tabs = await chrome.tabs.getMany(tabIds);

    for (const tab of tabs) {
      if (!tab.id) continue;

      // Check exclusion criteria
      if (options.excludePinned && tab.pinned) {
        results.skipped++;
        continue;
      }

      if (options.excludeAudio && tab.audible) {
        results.skipped++;
        continue;
      }

      if (options.excludeActive && tab.active) {
        results.skipped++;
        continue;
      }

      if (tab.url && options.whitelist.some(domain => tab.url?.includes(domain))) {
        results.skipped++;
        continue;
      }

      try {
        await this.suspendTab(tab.id);
        results.success++;
      } catch (error) {
        console.error(`Failed to suspend tab ${tab.id}:`, error);
        results.failed++;
      }

      // Check max tabs limit
      if (options.maxTabs && results.success >= options.maxTabs) {
        break;
      }
    }

    return results;
  }

  private async suspendTab(tabId: number): Promise<void> {
    // Navigate to placeholder page
    const placeholderUrl = chrome.runtime.getURL('suspended.html');
    await chrome.tabs.update(tabId, { url: placeholderUrl });
  }

  async closeMultipleTabs(tabIds: number[]): Promise<void> {
    await chrome.tabs.remove(tabIds);
  }

  async activateTabGroup(tabIds: number[]): Promise<void> {
    if (tabIds.length === 0) return;

    // Activate the first tab in the group
    await chrome.tabs.update(tabIds[0], { active: true });

    // Highlight all tabs in the group
    await chrome.tabs.highlight({ tabs: tabIds });
  }
}

export const bulkOperations = new BulkTabOperations();
```

### Moving Multiple Tabs

```typescript
class TabMover {
  async moveTabsToWindow(tabIds: number[], targetWindowId: number): Promise<void> {
    // Get the target window
    const targetWindow = await chrome.windows.get(targetWindowId);

    if (!targetWindow) {
      throw new Error(`Window ${targetWindowId} not found`);
    }

    // Move tabs to the target window
    await chrome.tabs.move(tabIds, {
      windowId: targetWindowId,
      index: -1 // Move to end
    });
  }

  async reorderTabsInWindow(windowId: number, tabIds: number[]): Promise<void> {
    const positions = tabIds.map((tabId, index) => ({
      tabId,
      index
    }));

    for (const { tabId, index } of positions) {
      await chrome.tabs.move(tabId, { windowId, index });
    }
  }

  async duplicateTabs(tabIds: number[]): Promise<number[]> {
    const newTabIds: number[] = [];

    for (const tabId of tabIds) {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url) {
        const newTab = await chrome.tabs.create({
          url: tab.url,
          active: false,
          pinned: tab.pinned
        });
        if (newTab.id) {
          newTabIds.push(newTab.id);
        }
      }
    }

    return newTabIds;
  }
}

export const tabMover = new TabMover();
```

## Handling Tab Events Effectively

Efficient event handling is crucial for extensions that manage multiple tabs. Poorly implemented event listeners can lead to performance issues and unexpected behavior.

### Debouncing Tab Events

```typescript
class DebouncedTabEventHandler {
  private pendingUpdates: Map<number, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_MS = 300;

  constructor(private handler: (tabId: number) => void) {
    this.setupListeners();
  }

  private setupListeners(): void {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.debounce(tabId);
      }
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.debounce(activeInfo.tabId);
    });
  }

  private debounce(tabId: number): void {
    // Clear existing timeout
    const existing = this.pendingUpdates.get(tabId);
    if (existing) {
      clearTimeout(existing);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.pendingUpdates.delete(tabId);
      this.handler(tabId);
    }, this.DEBOUNCE_MS);

    this.pendingUpdates.set(tabId, timeout);
  }
}

// Usage example
const eventHandler = new DebouncedTabEventHandler((tabId) => {
  console.log(`Tab ${tabId} state stabilized`);
});
```

### Using Filtered Listeners

Chrome provides filtered events that can significantly improve performance by only firing for matching tabs:

```typescript
// Only listen to tabs in the current window
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Handle activation
}, {
  windowId: chrome.windows.WINDOW_ID_CURRENT
});

// Only listen for specific URL patterns
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url?.startsWith('https://')) {
    // Handle secure pages
  }
}, {
  url: [{ urlMatches: 'https://*/*' }]
});
```

## Real-World Example: Building a Tab Manager

Let's put everything together to build a comprehensive tab manager similar to features found in Tab Suspender Pro. This example demonstrates how all the pieces fit together.

### Complete Tab Manager Implementation

```typescript
// src/background/tab-manager.ts

import { TabStateManager } from '../shared/tab-state';
import { BulkTabOperations } from '../shared/bulk-operations';
import { TabGroupManager } from '../shared/tab-groups';

interface TabManagerConfig {
  autoSuspendEnabled: boolean;
  suspendDelayMinutes: number;
  excludePinned: boolean;
  excludeAudio: boolean;
  whitelist: string[];
}

class TabManager {
  private config: TabManagerConfig;
  private stateManager: TabStateManager;
  private bulkOps: BulkTabOperations;
  private groupManager: TabGroupManager;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.stateManager = new TabStateManager();
    this.bulkOps = new BulkTabOperations();
    this.groupManager = new TabGroupManager();
  }

  private loadConfig(): TabManagerConfig {
    // Load from storage or use defaults
    return {
      autoSuspendEnabled: true,
      suspendDelayMinutes: 5,
      excludePinned: true,
      excludeAudio: true,
      whitelist: []
    };
  }

  async initialize(): Promise<void> {
    // Set up periodic cleanup if auto-suspend is enabled
    if (this.config.autoSuspendEnabled) {
      this.startAutoCleanup();
    }

    // Process any tabs that were open when extension loaded
    await this.processExistingTabs();
  }

  private async processExistingTabs(): Promise<void> {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        this.stateManager.trackTab(tab.id);
      }
    }
  }

  private startAutoCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.performAutoSuspend();
    }, this.config.suspendDelayMinutes * 60 * 1000);
  }

  private async performAutoSuspend(): Promise<void> {
    const allStates = this.stateManager.getAllStates();
    const now = Date.now();
    const eligibleTabIds: number[] = [];

    for (const [tabId, state] of allStates) {
      if (state.status === 'inactive') {
        const inactiveTime = now - state.lastActive;
        const delayMs = this.config.suspendDelayMinutes * 60 * 1000;

        if (inactiveTime >= delayMs) {
          eligibleTabIds.push(tabId);
        }
      }
    }

    if (eligibleTabIds.length > 0) {
      await this.bulkOps.suspendTabs(eligibleTabIds, {
        excludePinned: this.config.excludePinned,
        excludeAudio: this.config.excludeAudio,
        excludeActive: true,
        whitelist: this.config.whitelist,
        maxTabs: 10 // Limit concurrent suspensions
      });
    }
  }

  async suspendTab(tabId: number): Promise<boolean> {
    try {
      await this.bulkOps.suspendTab(tabId);
      return true;
    } catch (error) {
      console.error('Failed to suspend tab:', error);
      return false;
    }
  }

  async suspendAllInactive(): Promise<void> {
    const tabs = await chrome.tabs.query({ active: false });
    const tabIds = tabs.filter(t => t.id).map(t => t.id as number);

    await this.bulkOps.suspendTabs(tabIds, {
      excludePinned: this.config.excludePinned,
      excludeAudio: this.config.excludeAudio,
      excludeActive: false,
      whitelist: this.config.whitelist,
      maxTabs: 0 // No limit
    });
  }

  async createTabGroup(title: string, tabIds: number[]): Promise<number> {
    return await this.groupManager.createGroup(tabIds, title);
  }

  async getTabStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  }> {
    const tabs = await chrome.tabs.query({});
    const stats = { total: 0, active: 0, inactive: 0, suspended: 0 };

    for (const tab of tabs) {
      stats.total++;
      if (tab.active) stats.active++;
      else if (tab.discarded) stats.suspended++;
      else stats.inactive++;
    }

    return stats;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const tabManager = new TabManager();
```

## Performance Considerations

When building extensions that handle multiple tabs, performance should be a primary concern. Here are key strategies for maintaining optimal performance.

### Minimizing API Calls

```typescript
class OptimizedTabAccessor {
  private cache: Map<number, chrome.tabs.Tab> = new Map();
  private cacheTimeout = 5000; // 5 seconds

  async getTab(tabId: number): Promise<chrome.tabs.Tab | null> {
    const cached = this.cache.get(tabId);
    if (cached) {
      return cached;
    }

    const tab = await chrome.tabs.get(tabId);
    if (tab) {
      this.cache.set(tabId, tab);
      // Set up cache invalidation
      setTimeout(() => this.cache.delete(tabId), this.cacheTimeout);
    }
    return tab;
  }

  async getAllTabs(): Promise<chrome.tabs.Tab[]> {
    return await chrome.tabs.query({});
  }
}
```

### Using tabIds Efficiently

Always prefer operations that accept multiple tab IDs over iterating:

```typescript
// Bad: Multiple API calls
for (const tabId of tabIds) {
  await chrome.tabs.update(tabId, { muted: true });
}

// Good: Single API call
await chrome.tabs.update(tabIds, { muted: true });
```

## Error Handling and Edge Cases

Robust error handling is essential for production extensions dealing with multiple tabs.

```typescript
class SafeTabOperations {
  async safeUpdateTab(
    tabId: number,
    updateProperties: chrome.tabs.UpdateProperties
  ): Promise<chrome.tabs.Tab | null> {
    try {
      return await chrome.tabs.update(tabId, updateProperties);
    } catch (error) {
      if (chrome.runtime.lastError) {
        console.error('Tab update failed:', chrome.runtime.lastError.message);
      }
      return null;
    }
  }

  async safeGetTab(tabId: number): Promise<chrome.tabs.Tab | null> {
    try {
      return await chrome.tabs.get(tabId);
    } catch (error) {
      // Tab doesn't exist or was closed
      return null;
    }
  }

  async safeRemoveTabs(tabIds: number[]): Promise<number[]> {
    const validIds: number[] = [];

    // Verify each tab exists before attempting removal
    for (const tabId of tabIds) {
      const tab = await this.safeGetTab(tabId);
      if (tab) {
        validIds.push(tabId);
      }
    }

    if (validIds.length > 0) {
      await chrome.tabs.remove(validIds);
    }

    return validIds;
  }
}
```

## Testing Your Multi-Tab Extension

Testing extensions that manage multiple tabs requires careful planning. Here are effective strategies:

```typescript
// src/shared/test-utils.ts

import { jest } from '@jest/globals';

describe('TabStateManager', () => {
  beforeEach(() => {
    // Reset chrome.tabs mock
    global.chrome = {
      tabs: {
        onCreated: { addListener: jest.fn() },
        onRemoved: { addListener: jest.fn() },
        onUpdated: { addListener: jest.fn() },
        onActivated: { addListener: jest.fn() },
        get: jest.fn(),
        query: jest.fn()
      }
    } as any;
  });

  test('should track newly created tabs', async () => {
    const manager = new TabStateManager();
    const mockTab = {
      id: 1,
      status: 'complete',
      url: 'https://example.com'
    } as chrome.tabs.Tab;

    // Simulate tab creation
    (global.chrome.tabs.onCreated.addListener as jest.Mock).mock.calls[0][0](mockTab);

    expect(manager.getState(1)).toBeDefined();
  });
});
```

## Frequently Asked Questions

### How do I handle tabs in incognito mode?

Incognito tabs require special handling. Use the `incognito` property to identify them, and be aware that some APIs behave differently for incognito windows. You can query incognito tabs specifically:

```typescript
const incognitoTabs = await chrome.tabs.query({ incognito: true });
```

### Can I access tabs across all windows?

Yes, but you need to request the appropriate permissions. The `tabs` permission allows access to all tabs in all windows, while `activeTab` limits access to the current active tab.

### What's the maximum number of tabs I can manage?

Chrome doesn't impose a hard limit, but performance degrades with hundreds of tabs. Tab Suspender Pro recommends limiting bulk operations to 10-20 tabs at a time to prevent browser slowdown.

### How do I handle tab IDs being reused?

Always verify a tab exists before performing operations. Use try-catch blocks and check for `chrome.runtime.lastError`. Implement a cleanup mechanism to remove stale tab IDs from your internal state.

### Can I detect when a user is using multiple monitors?

Yes, use the Windows API to get information about window positions:

```typescript
const windows = await chrome.windows.getAll({});
for (const win of windows) {
  console.log(`Window ${win.id}: left=${win.left}, top=${win.top}`);
}
```

---

Part of the [Chrome Extension Guide](https://bestchromeextensions.com/) by theluckystrike. Tab Suspender Pro available on the [Chrome Web Store](https://chromewebstore.google.com). Professional extension development at [zovo.one](https://zovo.one).
