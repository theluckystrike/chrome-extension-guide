---

title: Chrome Extension Development Tutorial with TypeScript — Complete 2026 Guide
description: Learn how to build production-ready Chrome extensions with TypeScript in 2026. Step-by-step tutorial covering manifest v3, background workers, content scripts, and best practices.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/chrome-extension-development-tutorial-typescript-2026/"
last_modified_at: 2026-01-15

---

# Chrome Extension Development Tutorial with TypeScript — Complete 2026 Guide

Chrome extension development has evolved significantly with the adoption of Manifest V3 and modern TypeScript tooling. This comprehensive tutorial walks you through building a production-ready Chrome extension from scratch using TypeScript, covering architecture patterns, API usage, and best practices that professional developers use in 2026.

Whether you're building a simple productivity tool or a complex enterprise extension like [Tab Suspender Pro](https://chromewebstore.google.com/detail/tab-suspender-pro/eahnkhaildghmcagjdckcobbkjhniapn), the principles and patterns you'll learn here apply to any Chrome extension project.

## Prerequisites and Environment Setup

Before diving into Chrome extension development, ensure your development environment meets these requirements:

- **Node.js 20 LTS or later** — Chrome's extension APIs and build tools work best with modern Node.js versions
- **npm 10+** — For package management and script execution
- **TypeScript 5.3+** — Latest TypeScript with decorators and improved type inference
- **VS Code** — Recommended editor with excellent TypeScript and Chrome DevTools support

Initialize your project with a modern build system:

```bash
mkdir my-extension && cd my-extension
npm init -y
npm install -D typescript vite @types/chrome esbuild
npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging
```

Configure TypeScript for Chrome extension development:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Understanding Manifest V3 Structure

Manifest V3 is the current standard for Chrome extensions, introducing significant changes from the deprecated Manifest V2. The manifest file defines your extension's capabilities, permissions, and entry points.

Create your `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "TypeScript Extension Tutorial",
  "version": "1.0.0",
  "description": "A production-ready Chrome extension built with TypeScript",
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting",
    "alarms"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/index.js"],
      "css": ["content/styles.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
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

The manifest defines three main extension components: the **background service worker**, **content scripts**, and the **popup page**. Each serves a distinct purpose in your extension architecture.

## Background Service Worker Development

The background service worker replaces the old background pages in Manifest V3. It runs in an isolated context and handles events when no popup is open. Service workers are event-driven and cannot maintain persistent state between events.

Create your background worker with TypeScript:

```typescript
// src/background/index.ts
import { storage } from '@theluckystrike/webext-storage';
import { messaging } from '@theluckystrike/webext-messaging';

// Define extension state interface
interface ExtensionState {
  enabled: boolean;
  activeTabs: Map<number, TabInfo>;
  settings: ExtensionSettings;
}

interface TabInfo {
  id: number;
  url: string;
  title: string;
  lastActive: number;
}

interface ExtensionSettings {
  autoSuspend: boolean;
  suspendDelay: number; // minutes
  excludePatterns: string[];
}

// Initialize default state
const defaultState: ExtensionState = {
  enabled: true,
  activeTabs: new Map(),
  settings: {
    autoSuspend: true,
    suspendDelay: 5,
    excludePatterns: []
  }
};

// Load settings on extension startup
async function initializeExtension(): Promise<void> {
  try {
    const savedSettings = await storage.get<ExtensionSettings>('settings');
    if (savedSettings) {
      defaultState.settings = { ...defaultState.settings, ...savedSettings };
    }
    console.log('[Background] Extension initialized with settings:', defaultState.settings);
  } catch (error) {
    console.error('[Background] Failed to load settings:', error);
  }
}

// Handle messages from content scripts and popup
messaging.handle('get-state', async () => {
  return defaultState;
});

messaging.handle('update-settings', async (newSettings: Partial<ExtensionSettings>) => {
  defaultState.settings = { ...defaultState.settings, ...newSettings };
  await storage.set('settings', defaultState.settings);
  return defaultState.settings;
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const tabInfo: TabInfo = {
      id: tabId,
      url: tab.url,
      title: tab.title || '',
      lastActive: Date.now()
    };
    defaultState.activeTabs.set(tabId, tabInfo);
    
    // Notify popup of tab update
    chrome.runtime.sendMessage({
      type: 'TAB_UPDATED',
      payload: tabInfo
    }).catch(() => {
      // Popup might not be open, ignore error
    });
  }
});

// Handle tab closure
chrome.tabs.onRemoved.addListener((tabId) => {
  defaultState.activeTabs.delete(tabId);
});

// Schedule periodic tasks using Chrome Alarms API
chrome.alarms.create('periodicSync', {
  periodInMinutes: 15
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSync') {
    performPeriodicSync();
  }
});

async function performPeriodicSync(): Promise<void> {
  if (!defaultState.settings.autoSuspend) return;
  
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    
    // Check if tab should be suspended
    const tabInfo = defaultState.activeTabs.get(tab.id);
    if (tabInfo) {
      const inactiveMinutes = (now - tabInfo.lastActive) / 60000;
      if (inactiveMinutes >= defaultState.settings.suspendDelay) {
        // Tab qualifies for suspension
        await chrome.tabs.discard(tab.id).catch(() => {
          // Discard not supported or failed
        });
      }
    }
  }
}

// Initialize on service worker startup
initializeExtension();

// Export for testing
export { defaultState, initializeExtension, ExtensionState };
```

The background worker demonstrates several critical patterns: **message handling**, **storage abstraction**, **alarm-based scheduling**, and **tab lifecycle management**. This is the backbone of extensions like Tab Suspender Pro that manage browser resources automatically.

## Content Script Development

Content scripts run in the context of web pages, allowing you to interact with page DOM and communicate with the background worker. In Manifest V3, content scripts have limited access to Chrome APIs and must communicate via message passing.

```typescript
// src/content/index.ts
import { messaging } from '@theluckystrike/webext-messaging';

// Define content script state
interface ContentState {
  pageData: PageData;
  userPreferences: UserPreferences;
}

interface PageData {
  url: string;
  title: string;
  elements: number;
  scrollHeight: number;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  highlightEnabled: boolean;
}

// Extract page information
function gatherPageData(): PageData {
  return {
    url: window.location.href,
    title: document.title,
    elements: document.querySelectorAll('*').length,
    scrollHeight: document.documentElement.scrollHeight
  };
}

// Inject custom styles
function injectStyles(): void {
  const styleId = 'ts-extension-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .ts-extension-highlight {
      outline: 2px solid #667eea !important;
      outline-offset: 2px !important;
      background-color: rgba(102, 126, 234, 0.1) !important;
    }
    
    .ts-extension-tooltip {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .ts-extension-tooltip.hidden {
      opacity: 0;
      transform: translateY(10px);
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

// Create floating UI element
function createFloatingUI(): HTMLElement {
  const tooltip = document.createElement('div');
  tooltip.className = 'ts-extension-tooltip';
  tooltip.textContent = 'TypeScript Extension Active';
  document.body.appendChild(tooltip);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    tooltip.classList.add('hidden');
  }, 3000);
  
  return tooltip;
}

// Handle messages from background
messaging.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'HIGHLIGHT_ELEMENTS':
      highlightPageElements(message.selector);
      sendResponse({ success: true, count: document.querySelectorAll(message.selector).length });
      break;
      
    case 'GET_PAGE_DATA':
      sendResponse(gatherPageData());
      break;
      
    case 'UPDATE_THEME':
      applyTheme(message.theme);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true; // Keep message channel open for async response
});

function highlightPageElements(selector: string): void {
  // Remove existing highlights
  document.querySelectorAll('.ts-extension-highlight').forEach(el => {
    el.classList.remove('ts-extension-highlight');
  });
  
  // Apply new highlights
  document.querySelectorAll(selector).forEach(el => {
    el.classList.add('ts-extension-highlight');
  });
}

function applyTheme(theme: 'light' | 'dark' | 'auto'): void {
  const root = document.documentElement;
  
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

// Expose API for page interaction
(window as any).__tsExtension = {
  getPageData: gatherPageData,
  highlightElements: highlightPageElements,
  applyTheme: applyTheme,
  sendMessage: (type: string, payload: any) => messaging.send(type, payload)
};

// Initialize content script
injectStyles();
createFloatingUI();

console.log('[Content] TypeScript extension loaded on:', window.location.href);
```

Content scripts require careful consideration of **page isolation**, **DOM manipulation**, and **message passing patterns**. The example above shows how to inject styles safely, communicate with the background worker, and expose a controlled API to the page.

## Popup Page Design Patterns

The popup is the user interface users interact with most frequently. In Manifest V3, popups are HTML pages that have access to Chrome APIs but share the service worker's authorization.

```typescript
// src/popup/index.ts
import { messaging } from '@theluckystrike/webext-messaging';
import { storage } from '@theluckystrike/webext-storage';

// Types for popup state
interface PopupState {
  enabled: boolean;
  settings: {
    autoSuspend: boolean;
    suspendDelay: number;
    excludePatterns: string[];
  };
  stats: {
    activeTabs: number;
    suspendedTabs: number;
    memorySaved: number;
  };
}

// UI References
const elements = {
  toggle: document.getElementById('enable-toggle') as HTMLInputElement,
  autoSuspend: document.getElementById('auto-suspend') as HTMLInputElement,
  suspendDelay: document.getElementById('suspend-delay') as HTMLInputElement,
  statsContainer: document.getElementById('stats-container'),
  saveButton: document.getElementById('save-settings'),
  statusMessage: document.getElementById('status-message')
} as any;

// Initialize popup
async function initialize(): Promise<void> {
  try {
    // Get current state from background
    const state = await messaging.send<PopupState>('get-state');
    
    if (state) {
      elements.toggle.checked = state.enabled;
      elements.autoSuspend.checked = state.settings.autoSuspend;
      elements.suspendDelay.value = state.settings.suspendDelay.toString();
      updateStatsDisplay(state.stats);
    }
    
    // Load saved preferences
    const preferences = await storage.get<{theme: string}>('popupTheme');
    if (preferences?.theme) {
      document.body.setAttribute('data-theme', preferences.theme);
    }
    
    console.log('[Popup] Initialized successfully');
  } catch (error) {
    console.error('[Popup] Initialization failed:', error);
    showStatus('Failed to load settings', 'error');
  }
}

// Update statistics display
function updateStatsDisplay(stats: PopupState['stats']): void {
  if (!elements.statsContainer) return;
  
  elements.statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-value">${stats.activeTabs}</span>
      <span class="stat-label">Active Tabs</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${stats.suspendedTabs}</span>
      <span class="stat-label">Suspended</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${formatBytes(stats.memorySaved)}</span>
      <span class="stat-label">Memory Saved</span>
    </div>
  `;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Save settings
async function saveSettings(): Promise<void> {
  const settings = {
    autoSuspend: elements.autoSuspend.checked,
    suspendDelay: parseInt(elements.suspendDelay.value, 10)
  };
  
  try {
    await messaging.send('update-settings', settings);
    showStatus('Settings saved successfully', 'success');
    
    // Save preferences
    await storage.set('popupTheme', { theme: 'dark' });
  } catch (error) {
    console.error('[Popup] Save failed:', error);
    showStatus('Failed to save settings', 'error');
  }
}

function showStatus(message: string, type: 'success' | 'error'): void {
  if (!elements.statusMessage) return;
  
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.style.display = 'block';
  
  setTimeout(() => {
    elements.statusMessage.style.display = 'none';
  }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', initialize);

if (elements.saveButton) {
  elements.saveButton.addEventListener('click', saveSettings);
}

// Handle toggle changes
if (elements.toggle) {
  elements.toggle.addEventListener('change', async (e) => {
    const enabled = (e.target as HTMLInputElement).checked;
    await messaging.send('toggle-extension', { enabled });
  });
}

export { initialize, saveSettings, PopupState };
```

The popup demonstrates **state management**, **async messaging**, and **user interface patterns** essential for creating responsive, user-friendly extensions.

## Building and Testing Your Extension

Configure your build process with Vite for efficient development:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html')
      },
      output: {
        entryFileNames: '[name]/[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
```

Build and load your extension:

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Load extension in Chrome:
# 1. Navigate to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the dist folder
```

## Advanced Patterns and Best Practices

### Memory Management

Extensions like Tab Suspender Pro must manage memory carefully. The background service worker can be terminated by Chrome at any time, so avoid storing critical state in memory:

```typescript
// Always persist state to storage
async function saveState(state: ExtensionState): Promise<void> {
  await storage.set('state', {
    enabled: state.enabled,
    settings: state.settings,
    // Don't store Map objects - convert to array
    activeTabs: Array.from(state.activeTabs.entries())
  });
}

// Restore state on startup
async function restoreState(): Promise<ExtensionState> {
  const saved = await storage.get<any>('state');
  if (saved?.activeTabs) {
    saved.activeTabs = new Map(saved.activeTabs);
  }
  return saved || defaultState;
}
```

### Error Handling

Implement comprehensive error handling:

```typescript
// Global error handler for background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    handleMessage(message);
    sendResponse({ success: true });
  } catch (error) {
    console.error('[Background] Message handler error:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
  return true;
});
```

### Performance Optimization

Follow these performance guidelines:

1. **Minimize content script execution** — Use `run_at` to control when scripts load
2. **Use declarative content scripts** — Define in manifest rather than injecting dynamically
3. **Implement lazy loading** — Only load features when needed
4. **Monitor memory usage** — Use Chrome Task Manager to track extension memory

## Publishing Your Extension

When ready to publish, prepare your extension for the Chrome Web Store:

1. Create screenshots and promotional images
2. Write a compelling description with keywords
3. Set proper categories and tags
4. Configure pricing (free or paid)
5. Submit for review

Use the Chrome Web Store Publish API for automated releases:

```bash
# Install the Chrome Web Store uploader
npm install -D chrome-webstore-upload

# Upload your extension
npx chrome-webstore-upload \
  --source dist \
  --client-id $CLIENT_ID \
  --client-secret $CLIENT_SECRET \
  --refresh-token $REFRESH_TOKEN \
  --app-id $APP_ID
```

## Conclusion

Building Chrome extensions with TypeScript in 2026 offers powerful capabilities through Manifest V3, improved APIs, and modern tooling. This tutorial covered the essential components: background service workers for event handling, content scripts for page interaction, and popup interfaces for user control.

The patterns demonstrated here—messaging, storage abstraction, and error handling—form the foundation for production extensions like Tab Suspender Pro. As Chrome continues to evolve, staying current with Manifest V3 patterns ensures your extensions remain compatible and performant.

Remember to test thoroughly, handle edge cases, and follow Chrome's policies for a successful extension launch. With TypeScript's type safety and modern development practices, you're well-equipped to build robust, maintainable Chrome extensions.
