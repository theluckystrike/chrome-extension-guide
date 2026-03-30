---
layout: default
title: "Chrome Extension Development Tutorial with TypeScript: Complete Guide for 2026"
description: "Learn how to build Chrome extensions with TypeScript in 2026. This comprehensive tutorial covers manifest configuration, content scripts, background service workers, popup design, and modern development workflows."
permalink: /guides/chrome-extension-development-typescript-tutorial/
last_modified_at: 2026-01-15
---

Chrome Extension Development Tutorial with TypeScript: Complete Guide for 2026

Chrome extension development has evolved significantly with the adoption of Manifest V3 and modern JavaScript tooling. TypeScript has become the standard for building robust, maintainable extensions that can scale with complex features. This comprehensive tutorial walks you through building production-ready Chrome extensions using TypeScript, covering everything from project setup to advanced patterns used in real-world extensions like Tab Suspender Pro.

Table of Contents

- [Why TypeScript for Chrome Extensions](#why-typescript-for-chrome-extensions)
- [Project Setup and Build Configuration](#project-setup-and-build-configuration)
- [Manifest V3 Configuration detailed look](#manifest-v3-configuration-deep detailed look)
- [Type-Safe Content Scripts](#type-safe-content-scripts)
- [Background Service Worker Implementation](#background-service-worker-implementation)
- [Popup Page Design Patterns](#popup-page-design-patterns)
- [Message Passing Between Components](#message-passing-between-components)
- [Type-Safe Storage Operations](#type-safe-storage-operations)
- [Testing and Debugging](#testing-and-debugging)
- [Building for Production](#building-for-production)

Why TypeScript for Chrome Extensions {#why-typescript-for-chrome-extensions}

TypeScript brings several compelling advantages to Chrome extension development that become increasingly important as your extension grows in complexity. The static type checking catches errors at compile time rather than runtime, which is especially valuable when working with Chrome's extension APIs that have complex type signatures. When you're dealing with message passing between content scripts, background workers, and popup pages, having explicit types for your payloads eliminates an entire category of bugs that would otherwise require extensive testing to discover.

Beyond error prevention, TypeScript significantly improves the developer experience through intelligent autocomplete and inline documentation. Chrome's extension APIs are extensive and constantly evolving, with many methods accepting complex configuration objects. Working with these APIs in plain JavaScript requires constant reference to documentation, but TypeScript's type definitions provide real-time guidance as you code. Thisates development velocity and reduces the cognitive load of memorizing API surfaces.

The Chrome ecosystem has matured considerably, with excellent type definitions available through the `@types/chrome` package. These types cover virtually all Chrome extension APIs, from the fundamental `chrome.runtime` and `chrome.storage` to specialized APIs like `chrome.debugger` and `chrome.sidePanel`. Combined with modern build tools like Vite and Webpack, TypeScript has become the recommended approach for serious extension development in 2026.

Project Setup and Build Configuration {#project-setup-and-build-configuration}

Setting up a TypeScript project for Chrome extension development requires careful configuration to ensure your build output works correctly with Chrome's extension system. Let's create a production-ready project structure that you can adapt for any extension project.

Initializing the Project

Create a new directory and initialize your project with the necessary dependencies:

```bash
mkdir my-chrome-extension && cd my-chrome-extension
npm init -y
npm install --save-dev typescript vite @types/chrome
```

This installs TypeScript for compilation, Vite for fast development builds, and the Chrome type definitions. The `@types/chrome` package provides comprehensive type coverage for all Chrome extension APIs, significantly improving your development experience.

TypeScript Configuration

Create a `tsconfig.json` that targets the appropriate JavaScript version and configures module resolution for extension development:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src//*"],
  "exclude": ["node_modules", "dist"]
}
```

The `strict` flag enables all type-checking options, which catches more potential errors during development. While this might require more initial effort to satisfy the type checker, the resulting code is significantly more reliable.

Vite Configuration for Extensions

Create a `vite.config.ts` to handle the unique requirements of building extension files:

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

This configuration builds each entry point separately while maintaining proper chunking for shared code. The alias configuration makes imports cleaner and more maintainable as your codebase grows.

Manifest V3 Configuration detailed look {#manifest-v3-configuration-deep detailed look}

The manifest.json file serves as the blueprint for your extension, and understanding its configuration options is essential for building compliant extensions. Let's examine each critical section with TypeScript-friendly examples.

Complete Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "My TypeScript Extension",
  "version": "1.0.0",
  "description": "A production-ready Chrome extension built with TypeScript",
  "permissions": [
    "storage",
    "tabs",
    "alarms",
    "sidePanel",
    "scripting"
  ],
  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["icons/*", "assets/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

The `permissions` array declares the APIs your extension needs, while `host_permissions` controls which URLs your extension can access. The background service worker configuration specifies `type: "module"`, which enables ES module syntax in your service worker, a critical feature for modern TypeScript builds.

Pay careful attention to the difference between `permissions` and `host_permissions`. The `permissions` array is for Chrome APIs like `storage` and `tabs`, while `host_permissions` controls network access to websites. Requesting excessive host permissions can trigger additional review requirements in the Chrome Web Store, so only request what's absolutely necessary for your extension's functionality.

Type-Safe Content Scripts {#type-safe-content-scripts}

Content scripts run in the context of web pages, injecting functionality directly into the user's browsing experience. TypeScript helps ensure your content script code is solid and correctly typed.

Creating a Content Script with Types

```typescript
// src/content/types.ts
export interface PageData {
  title: string;
  url: string;
  timestamp: number;
}

export interface ContentScriptConfig {
  enabled: boolean;
  autoRun: boolean;
  watchSelectors: string[];
}

export interface MessageToBackground {
  type: 'PAGE_ANALYZED' | 'USER_ACTION' | 'STATE_REQUEST';
  payload: PageData | string | null;
}

// src/content/index.ts
import { PageData, ContentScriptConfig, MessageToBackground } from './types';

class ContentScriptManager {
  private config: ContentScriptConfig;
  private observer: MutationObserver | null = null;

  constructor() {
    this.config = {
      enabled: true,
      autoRun: true,
      watchSelectors: ['.dynamic-content', '[data-analyze]'],
    };
  }

  async initialize(): Promise<void> {
    // Load configuration from storage
    const stored = await chrome.storage.local.get('contentConfig');
    if (stored.contentConfig) {
      this.config = { ...this.config, ...stored.contentConfig };
    }

    if (this.config.autoRun) {
      this.analyzePage();
    }

    this.setupDOMObserver();
  }

  private async analyzePage(): Promise<void> {
    const pageData: PageData = {
      title: document.title,
      url: window.location.href,
      timestamp: Date.now(),
    };

    // Send data to background service worker
    const message: MessageToBackground = {
      type: 'PAGE_ANALYZED',
      payload: pageData,
    };

    try {
      await chrome.runtime.sendMessage(message);
      console.log('Page analysis sent to background');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  private setupDOMObserver(): void {
    const callback = (mutations: MutationRecord[]): void => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          this.handleDOMChanges(mutation.addedNodes);
        }
      }
    };

    this.observer = new MutationObserver(callback);
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private handleDOMChanges(nodes: NodeList): void {
    for (const node of nodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.matches?.('[data-analyze]')) {
          this.processAnalyzableElement(element);
        }
      }
    }
  }

  private processAnalyzableElement(element: Element): void {
    // Process elements marked for analysis
    console.log('Analyzing element:', element.tagName);
  }

  destroy(): void {
    this.observer?.disconnect();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new ContentScriptManager();
    manager.initialize();
  });
} else {
  const manager = new ContentScriptManager();
  manager.initialize();
}
```

The key to maintaining type safety in content scripts is defining clear interfaces for your data structures and message payloads. This approach prevents runtime errors caused by mismatched data structures and makes your code self-documenting.

Background Service Worker Implementation {#background-service-worker-implementation}

The background service worker is the central hub of your extension, managing state, coordinating between components, and handling system-level events. In Manifest V3, service workers are ephemeral, they start when needed and terminate after inactivity. This makes proper state management critical.

Service Worker with State Management

```typescript
// src/background/types.ts
export interface ExtensionState {
  isActive: boolean;
  userId: string | null;
  lastSync: number | null;
  settings: ExtensionSettings;
}

export interface ExtensionSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  syncInterval: number;
}

export type BackgroundMessage = 
  | { type: 'GET_STATE'; requestId: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<ExtensionSettings> }
  | { type: 'PERFORM_SYNC'; requestId: string }
  | { type: 'PAGE_DATA'; data: { title: string; url: string } };

export type BackgroundResponse = 
  | { type: 'STATE_RESPONSE'; state: ExtensionState }
  | { type: 'SYNC_COMPLETE'; timestamp: number }
  | { type: 'ERROR'; message: string };

// src/background/index.ts
import { ExtensionState, ExtensionSettings, BackgroundMessage, BackgroundResponse } from './types';

class BackgroundServiceWorker {
  private state: ExtensionState;
  private stateManager: StateManager;
  private alarmScheduler: AlarmScheduler;

  constructor() {
    this.stateManager = new StateManager();
    this.alarmScheduler = new AlarmScheduler();
    this.state = this.getDefaultState();
  }

  private getDefaultState(): ExtensionState {
    return {
      isActive: false,
      userId: null,
      lastSync: null,
      settings: {
        theme: 'system',
        notifications: true,
        syncInterval: 5,
      },
    };
  }

  async initialize(): Promise<void> {
    // Restore state from storage on every wake-up
    this.state = await this.stateManager.restoreState();
    
    this.setupEventListeners();
    this.alarmScheduler.initialize();
    
    console.log('Background service worker initialized');
  }

  private setupEventListeners(): void {
    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener(
      (message: BackgroundMessage, sender, sendResponse) => {
        this.handleMessage(message, sender).then(sendResponse);
        return true; // Keep message channel open for async response
      }
    );

    // Handle extension installation or update
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        await this.handleInstall();
      } else if (details.reason === 'update') {
        await this.handleUpdate();
      }
    });

    // Handle browser startup
    chrome.runtime.onStartup.addListener(async () => {
      this.state = await this.stateManager.restoreState();
    });
  }

  private async handleMessage(
    message: BackgroundMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<BackgroundResponse> {
    switch (message.type) {
      case 'GET_STATE':
        return { type: 'STATE_RESPONSE', state: this.state };

      case 'UPDATE_SETTINGS':
        this.state.settings = { ...this.state.settings, ...message.settings };
        await this.stateManager.saveState(this.state);
        return { type: 'STATE_RESPONSE', state: this.state };

      case 'PERFORM_SYNC':
        await this.performSync();
        return { type: 'SYNC_COMPLETE', timestamp: Date.now() };

      case 'PAGE_DATA':
        console.log('Received page data:', message.data);
        return { type: 'STATE_RESPONSE', state: this.state };

      default:
        return { type: 'ERROR', message: 'Unknown message type' };
    }
  }

  private async handleInstall(): Promise<void> {
    console.log('Extension installed');
    await this.stateManager.saveState(this.state);
  }

  private async handleUpdate(): Promise<void> {
    console.log('Extension updated');
    await this.stateManager.saveState(this.state);
  }

  private async performSync(): Promise<void> {
    // Implement your sync logic here
    this.state.lastSync = Date.now();
    await this.stateManager.saveState(this.state);
  }
}

class StateManager {
  private readonly STORAGE_KEY = 'extension_state';

  async restoreState(): Promise<ExtensionState> {
    try {
      const stored = await chrome.storage.local.get(this.STORAGE_KEY);
      if (stored[this.STORAGE_KEY]) {
        return stored[this.STORAGE_KEY];
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
    
    // Return default state if storage is empty
    return {
      isActive: false,
      userId: null,
      lastSync: null,
      settings: {
        theme: 'system',
        notifications: true,
        syncInterval: 5,
      },
    };
  }

  async saveState(state: ExtensionState): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: state });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }
}

class AlarmScheduler {
  private readonly SYNC_ALARM = 'periodic-sync';

  initialize(): void {
    chrome.alarms.create(this.SYNC_ALARM, {
      periodInMinutes: 5,
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === this.SYNC_ALARM) {
        this.handleSyncAlarm();
      }
    });
  }

  private async handleSyncAlarm(): Promise<void> {
    console.log('Sync alarm triggered');
    // Perform periodic sync tasks
  }
}

// Initialize the service worker
const worker = new BackgroundServiceWorker();
worker.initialize();
```

This implementation demonstrates critical patterns for production extensions: state persistence across service worker restarts, proper message handling with type-safe payloads, and scheduled task management using the alarms API. Each component is separated for maintainability and testability.

Popup Page Design Patterns {#popup-page-design-patterns}

The popup is often the primary user interface for extensions, appearing when users click the extension icon. Building a solid popup requires careful attention to state management and communication with the background service worker.

Type-Safe Popup Implementation

```typescript
// src/popup/types.ts
export interface PopupState {
  isEnabled: boolean;
  tabCount: number;
  memoryUsage: number;
  settings: {
    autoSuspend: boolean;
    theme: 'light' | 'dark';
  };
}

// src/popup/index.ts
import { PopupState } from './types';

class PopupManager {
  private state: PopupState;

  constructor() {
    this.state = {
      isEnabled: true,
      tabCount: 0,
      memoryUsage: 0,
      settings: {
        autoSuspend: true,
        theme: 'light',
      },
    };
  }

  async initialize(): Promise<void> {
    await this.loadState();
    this.setupEventListeners();
    this.updateUI();
    await this.refreshTabInfo();
  }

  private async loadState(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (response?.state) {
        this.state = { ...this.state, ...response.state };
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  private setupEventListeners(): void {
    // Toggle extension enabled/disabled
    const toggleButton = document.getElementById('toggle-enable');
    toggleButton?.addEventListener('click', () => this.handleToggle());

    // Open settings page
    const settingsButton = document.getElementById('open-settings');
    settingsButton?.addEventListener('click', () => this.openSettings());

    // Manual refresh
    const refreshButton = document.getElementById('refresh');
    refreshButton?.addEventListener('click', () => this.refreshTabInfo());
  }

  private async handleToggle(): Promise<void> {
    this.state.isEnabled = !this.state.isEnabled;
    this.updateUI();
    
    await chrome.storage.local.set({ extensionEnabled: this.state.isEnabled });
  }

  private async refreshTabInfo(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      this.state.tabCount = tabs.length;
      
      // Update memory display
      const memoryInfo = await chrome.runtime.getPlatformInfo();
      this.updateUI();
    } catch (error) {
      console.error('Failed to get tab info:', error);
    }
  }

  private openSettings(): void {
    chrome.runtime.openOptionsPage();
  }

  private updateUI(): void {
    const toggleButton = document.getElementById('toggle-enable');
    if (toggleButton) {
      toggleButton.textContent = this.state.isEnabled ? 'Disable' : 'Enable';
      toggleButton.classList.toggle('active', this.state.isEnabled);
    }

    const tabCountElement = document.getElementById('tab-count');
    if (tabCountElement) {
      tabCountElement.textContent = String(this.state.tabCount);
    }

    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = this.state.isEnabled ? 'Active' : 'Inactive';
      statusElement.classList.toggle('status-active', this.state.isEnabled);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupManager();
  popup.initialize();
});
```

The popup follows a pattern of loading state from the background service worker, setting up event listeners, and updating the UI accordingly. This separation ensures the popup remains responsive and properly synchronized with the extension's central state.

Message Passing Between Components {#message-passing-between-components}

Chrome extensions use message passing for communication between isolated worlds, content scripts, background service workers, and popup pages. TypeScript makes this communication type-safe and reliable.

Type-Safe Message System

```typescript
// src/shared/messages.ts
import { z } from 'zod';

// Define message schemas for runtime validation
export const PageDataSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  timestamp: z.number(),
});

export const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  notifications: z.boolean(),
  syncInterval: z.number().min(1).max(60),
});

export type ValidatedPageData = z.infer<typeof PageDataSchema>;
export type ValidatedSettings = z.infer<typeof SettingsSchema>;

// Message type definitions
export interface ExtensionMessage {
  id: string;
  type: string;
  timestamp: number;
  payload: unknown;
}

export function createMessage<T>(
  type: string, 
  payload: T
): ExtensionMessage {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    payload,
  };
}

export function validateMessage<T>(
  message: ExtensionMessage, 
  schema: z.ZodSchema<T>
): T | null {
  try {
    return schema.parse(message.payload);
  } catch (error) {
    console.error('Message validation failed:', error);
    return null;
  }
}
```

This message validation system adds a layer of runtime safety to your extension's communication, catching malformed messages before they cause issues. Combined with TypeScript's compile-time checking, you get defense in depth against message-related bugs.

Type-Safe Storage Operations {#type-safe-storage-operations}

The Chrome storage API uses a simple key-value interface, but you can add type safety through wrapper classes that enforce schemas at runtime.

Typed Storage Wrapper

```typescript
// src/shared/storage.ts
import { z } from 'zod';

// Define storage schemas
export const StorageSchemas = {
  userPreferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.string(),
    notifications: z.boolean(),
  }),
  
  extensionState: z.object({
    isActive: z.boolean(),
    lastSync: z.number().nullable(),
    version: z.string(),
  }),
  
  tabData: z.record(z.string(), z.object({
    url: z.string(),
    title: z.string().optional(),
    suspendedAt: z.number().optional(),
  })),
} as const;

export type UserPreferences = z.infer<typeof StorageSchemas.userPreferences>;
export type ExtensionState = z.infer<typeof StorageSchemas.extensionState>;
export type TabData = z.infer<typeof StorageSchemas.tabData>;

class TypedStorage {
  async get<K extends keyof typeof StorageSchemas>(
    key: K
  ): Promise<z.infer<typeof StorageSchemas[K]> | null> {
    const result = await chrome.storage.local.get(key);
    const data = result[key];
    
    if (!data) return null;
    
    try {
      return StorageSchemas[key].parse(data);
    } catch (error) {
      console.error(`Storage validation failed for key ${key}:`, error);
      return null;
    }
  }

  async set<K extends keyof typeof StorageSchemas>(
    key: K,
    value: z.infer<typeof StorageSchemas[K]>
  ): Promise<void> {
    const validated = StorageSchemas[key].parse(value);
    await chrome.storage.local.set({ [key]: validated });
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }

  async clear(): Promise<void> {
    await chrome.storage.local.clear();
  }
}

export const storage = new TypedStorage();
```

This typed storage wrapper validates data when storing and retrieving, ensuring type safety at runtime while maintaining the simple interface of chrome.storage.local.

Testing and Debugging {#testing-and-debugging}

Testing Chrome extensions requires special consideration because many APIs are Chrome-specific. Here's a practical approach to testing your TypeScript extension code.

Unit Testing with Mocked Chrome APIs

```typescript
// tests/__mocks__/chrome.ts
const createChromeMock = () => ({
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    getPlatformInfo: jest.fn().mockResolvedValue({ os: 'mac' }),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
  },
  alarms: {
    create: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
});

export const chrome = createChromeMock();
```

By creating mocks for Chrome APIs, you can write unit tests that verify your logic without depending on the actual Chrome environment. This makes your code more testable and your tests more reliable.

Building for Production {#building-for-production}

When your extension is ready for release, follow these steps to create a production build that passes Chrome Web Store review.

Production Build Process

```bash
Run TypeScript compilation with strict checking
npx tsc --noEmit

Run your test suite
npm test

Build for production
npm run build

Verify the output structure
ls -la dist/
```

The production build should output clean, minified JavaScript files that work with Chrome's extension system. Verify your manifest.json is correctly generated and all paths reference the correct build artifacts.

Chrome Web Store Submission Checklist

Before submitting to the Chrome Web Store, ensure your extension meets all requirements. Test the unpacked extension in Developer Mode to catch any issues that might not appear during development. Verify that all permissions are necessary and properly justified in your store listing. Ensure your extension handles edge cases gracefully and doesn't crash on unusual websites.

---

Conclusion

Building Chrome extensions with TypeScript in 2026 represents the convergence of modern web development practices with the unique requirements of browser extension development. The patterns and examples in this tutorial provide a foundation for creating robust, maintainable extensions that can scale to complex feature sets.

The techniques covered, from type-safe content scripts and service worker state management to popup design patterns and message passing, reflect best practices learned from building production extensions. Tab Suspender Pro, for example, uses these same patterns to manage thousands of suspended tabs while maintaining minimal memory footprint and responsive user experience.

As Chrome continues to evolve its extension platform, TypeScript will remain essential for keeping your extension code reliable and maintainable. The initial setup investment pays dividends through faster development cycles, fewer runtime errors, and easier collaboration as your team grows.

Part of the [Chrome Extension Guide](https://bestchromeextensions.com/) by theluckystrike. Tab Suspender Pro available on the [Chrome Web Store](https://chromewebstore.google.com). Professional extension development at [zovo.one](https://zovo.one).
