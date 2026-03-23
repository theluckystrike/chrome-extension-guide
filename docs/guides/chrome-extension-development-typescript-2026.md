---
layout: default
title: "Chrome Extension Development Tutorial with TypeScript — Complete 2026 Guide"
description: "Learn to build production-ready Chrome extensions using TypeScript and Manifest V3. Covers project setup, service workers, content scripts, popup pages, and best practices."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-development-typescript-2026/"
---

# Chrome Extension Development Tutorial with TypeScript — Complete 2026 Guide

## Introduction

Building Chrome extensions has evolved significantly with the introduction of Manifest V3 and the deprecation of background pages in favor of service workers. This comprehensive tutorial walks you through creating a production-ready Chrome extension using TypeScript, covering everything from project setup to deployment.

Whether you're building a simple productivity tool or a complex enterprise extension like **Tab Suspender Pro**, this guide provides the foundational knowledge you need to succeed in Chrome extension development in 2026.

## Prerequisites

Before we begin, ensure you have:
- Node.js 18+ installed
- npm or pnpm package manager
- Google Chrome browser (latest version)
- Basic familiarity with TypeScript and web development concepts

## Setting Up Your TypeScript Project

The first step in Chrome extension development is setting up a proper TypeScript project structure. Modern Chrome extensions require a build system to transpile TypeScript and bundle your code.

### Initialize the Project

Create a new directory and initialize your project:

```bash
mkdir my-chrome-extension && cd my-chrome-extension
npm init -y
```

### Install Dependencies

Install the necessary development dependencies:

```bash
npm install -D typescript @types/chrome webpack webpack-cli ts-loader html-webpack-plugin copy-webpack-plugin
```

### Configure TypeScript

Create a `tsconfig.json` file optimized for Chrome extension development:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Configure Webpack

Create a `webpack.config.js` to bundle your extension:

```typescript
import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { Configuration } from 'webpack';

const config: Configuration = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    background: './src/background/index.ts',
    popup: './src/popup/index.tsx',
    content: './src/content/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
        { from: 'src/_locales', to: '_locales', noErrorOnMissing: true },
      ],
    }),
  ],
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
};

export default config;
```

## Creating the Manifest V3 Configuration

The manifest.json is the heart of your Chrome extension. It defines permissions, entry points, and metadata.

### Basic Manifest Structure

Create `src/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My TypeScript Extension",
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
    "https://*/*",
    "http://*/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "assets/icon16.png",
      "48": "assets/icon48.png",
      "128": "assets/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://*/*", "http://*/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "assets/icon16.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  }
}
```

## Building the Background Service Worker

The background service worker handles events when no popup or content script is active. In Manifest V3, service workers are ephemeral—they can be terminated when idle and restarted when needed.

### Service Worker Implementation

Create `src/background/index.ts`:

```typescript
// src/background/index.ts

// Type definitions for Chrome runtime messages
interface MessageRequest {
  action: string;
  payload?: unknown;
}

interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Initialize extension state
interface ExtensionState {
  isEnabled: boolean;
  settings: Record<string, unknown>;
}

const state: ExtensionState = {
  isEnabled: true,
  settings: {},
};

// Load saved state from storage on startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Extension installed');
  
  // Initialize default settings
  const defaults = {
    theme: 'light',
    autoSuspend: true,
    suspendDelay: 5, // minutes
  };
  
  await chrome.storage.local.set({ settings: defaults });
  console.log('[Background] Default settings initialized');
});

// Handle service worker lifecycle
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Service worker started');
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('[Background] Service worker suspending - save state if needed');
});

// Message handler for communication with popup and content scripts
chrome.runtime.onMessage.addListener(
  (message: MessageRequest, sender, sendResponse: (response: MessageResponse) => void) => {
    console.log('[Background] Received message:', message.action);
    
    handleMessage(message, sender)
      .then((response) => sendResponse(response))
      .catch((error) => 
        sendResponse({ success: false, error: error.message })
      );
    
    // Return true to indicate async response
    return true;
  }
);

async function handleMessage(
  message: MessageRequest, 
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  switch (message.action) {
    case 'getState':
      return { success: true, data: state };
    
    case 'updateSettings':
      if (message.payload && typeof message.payload === 'object') {
        state.settings = { ...state.settings, ...message.payload as Record<string, unknown> };
        await chrome.storage.local.set({ settings: state.settings });
        return { success: true, data: state.settings };
      }
      return { success: false, error: 'Invalid payload' };
    
    case 'getTabInfo':
      if (sender.tab?.id) {
        const tab = await chrome.tabs.get(sender.tab.id);
        return { success: true, data: tab };
      }
      return { success: false, error: 'No active tab' };
    
    case 'executeScript':
      if (sender.tab?.id && message.payload) {
        const { code } = message.payload as { code: string };
        const results = await chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          func: (scriptCode: string) => eval(scriptCode),
          args: [code],
        });
        return { success: true, data: results[0]?.result };
      }
      return { success: false, error: 'No tab available' };
    
    default:
      return { success: false, error: `Unknown action: ${message.action}` };
  }
}

// Alarm handler for scheduled tasks
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[Background] Alarm triggered:', alarm.name);
  
  if (alarm.name === 'periodicCleanup') {
    performCleanup();
  }
});

// Create periodic alarm
chrome.alarms.create('periodicCleanup', {
  delayInMinutes: 5,
  periodInMinutes: 5,
});

async function performCleanup(): Promise<void> {
  const { settings } = await chrome.storage.local.get('settings');
  console.log('[Background] Running periodic cleanup with settings:', settings);
}

// Context menu setup
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  console.log('[Background] Context menu clicked:', info.menuItemId, 'on tab:', tab?.id);
  
  if (info.menuItemId === 'suspend-tab' && tab?.id) {
    chrome.tabs.discard(tab.id);
  }
});

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus?.create({
    id: 'suspend-tab',
    title: 'Suspend This Tab',
    contexts: ['page'],
  });
});

export {};
```

### Key Service Worker Patterns

1. **Top-Level Event Registration**: Always register event listeners at the top level, not inside async functions
2. **Async Response Pattern**: Return `true` from `onMessage` listener to indicate async response
3. **State Persistence**: Use `chrome.storage` instead of in-memory variables for persistent state
4. **Ephemeral Handling**: Design for service worker restart—don't rely on in-memory state

## Building the Content Script

Content scripts run in the context of web pages and can manipulate the DOM, inject CSS, and communicate with the background service worker.

### Content Script Implementation

Create `src/content/index.ts`:

```typescript
// src/content/index.ts

// Type definitions for injected content
interface ContentConfig {
  debugMode: boolean;
  theme: 'light' | 'dark';
}

const config: ContentConfig = {
  debugMode: false,
  theme: 'light',
};

// Initialize content script
function init(): void {
  console.log('[Content] Initializing content script');
  
  // Read configuration from storage
  chrome.storage.local.get(['settings']).then((result) => {
    if (result.settings) {
      config.theme = result.settings.theme || 'light';
      config.debugMode = result.settings.debug || false;
    }
    
    injectStyles();
    observePageChanges();
    setupMessageListeners();
  });
}

// Inject custom styles into the page
function injectStyles(): void {
  const styleId = 'chrome-extension-custom-styles';
  
  // Remove existing styles if any
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .extension-highlight {
      background-color: rgba(255, 235, 59, 0.3);
      border-radius: 2px;
      padding: 2px;
    }
    
    .extension-tooltip {
      position: absolute;
      background: #333;
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    
    .extension-floating-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .extension-floating-panel-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .extension-floating-panel-close {
      cursor: pointer;
      background: none;
      border: none;
      font-size: 18px;
      color: #6b7280;
    }
    
    .extension-floating-panel-content {
      padding: 16px;
    }
  `;
  
  document.head.appendChild(style);
}

// Observe DOM changes for dynamic content
function observePageChanges(): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        // Handle newly added nodes
        handleNewContent(mutation.addedNodes);
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function handleNewContent(nodes: NodeList): void {
  nodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      // Example: Add interactive features to specific elements
      if (element.matches('a[href]')) {
        enhanceLinks(element as HTMLAnchorElement);
      }
    }
  });
}

function enhanceLinks(link: HTMLAnchorElement): void {
  // Add visual feedback for external links
  try {
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) {
      link.classList.add('extension-external-link');
    }
  } catch {
    // Invalid URL, ignore
  }
}

// Setup message listener for communication with background
function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Content] Received message:', message);
    
    switch (message.type) {
      case 'GET_PAGE_INFO':
        sendResponse({
          url: window.location.href,
          title: document.title,
          timestamp: Date.now(),
        });
        break;
      
      case 'INJECT_CSS':
        if (message.payload?.css) {
          injectDynamicCSS(message.payload.css);
          sendResponse({ success: true });
        }
        break;
      
      case 'HIGHLIGHT_ELEMENT':
        if (message.payload?.selector) {
          highlightElement(message.payload.selector);
          sendResponse({ success: true });
        }
        break;
    }
  });
}

function injectDynamicCSS(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

function highlightElement(selector: string): void {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => {
    el.classList.add('extension-highlight');
  });
}

// Create floating panel (example of DOM manipulation)
function createFloatingPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'extension-floating-panel';
  panel.innerHTML = `
    <div class="extension-floating-panel-header">
      <span>Extension Panel</span>
      <button class="extension-floating-panel-close">×</button>
    </div>
    <div class="extension-floating-panel-content">
      <p>Page analysis complete.</p>
      <button id="analyze-btn">Analyze Page</button>
    </div>
  `;
  
  panel.querySelector('.extension-floating-panel-close')?.addEventListener('click', () => {
    panel.remove();
  });
  
  return panel;
}

// Export functions for programmatic use
export { init, createFloatingPanel, injectStyles };
export type { ContentConfig };

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

## Building the Popup Page

The popup is the UI users interact with when clicking the extension icon. Modern popup pages use HTML, CSS, and JavaScript (or TypeScript).

### Popup HTML

Create `src/popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Extension</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      width: 320px;
      min-height: 200px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: 600;
    }
    
    .content {
      padding: 16px;
    }
    
    .status-card {
      background: white;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .status-row:last-child {
      border-bottom: none;
    }
    
    .status-label {
      font-size: 13px;
      color: #6b7280;
    }
    
    .status-value {
      font-size: 13px;
      font-weight: 500;
      color: #111827;
    }
    
    .toggle-switch {
      position: relative;
      width: 44px;
      height: 24px;
    }
    
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.3s;
      border-radius: 24px;
    }
    
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
    
    input:checked + .toggle-slider {
      background-color: #667eea;
    }
    
    input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }
    
    .action-btn {
      width: 100%;
      padding: 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .action-btn:hover {
      background: #5a6fd6;
    }
    
    .action-btn.secondary {
      background: #f3f4f6;
      color: #374151;
    }
    
    .action-btn.secondary:hover {
      background: #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>My Extension</h1>
  </div>
  
  <div class="content">
    <div class="status-card">
      <div class="status-row">
        <span class="status-label">Status</span>
        <span class="status-value" id="status-text">Active</span>
      </div>
      <div class="status-row">
        <span class="status-label">Enabled</span>
        <label class="toggle-switch">
          <input type="checkbox" id="enable-toggle" checked>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="status-row">
        <span class="status-label">Tabs Managed</span>
        <span class="status-value" id="tabs-count">0</span>
      </div>
    </div>
    
    <button class="action-btn" id="refresh-btn">Refresh Status</button>
    <button class="action-btn secondary" id="settings-btn" style="margin-top: 8px;">
      Open Settings
    </button>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Popup TypeScript

Create `src/popup/index.tsx`:

```typescript
// src/popup/index.tsx

interface PopupState {
  isEnabled: boolean;
  tabsCount: number;
  lastUpdate: number;
}

// Main popup controller
class PopupController {
  private state: PopupState = {
    isEnabled: true,
    tabsCount: 0,
    lastUpdate: Date.now(),
  };
  
  constructor() {
    this.init();
  }
  
  private async init(): Promise<void> {
    console.log('[Popup] Initializing popup');
    
    // Load initial state
    await this.loadState();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
  }
  
  private async loadState(): Promise<void> {
    try {
      // Get settings from storage
      const result = await chrome.storage.local.get(['settings', 'stats']);
      
      if (result.settings) {
        this.state.isEnabled = result.settings.enabled !== false;
      }
      
      if (result.stats) {
        this.state.tabsCount = result.stats.managedTabs || 0;
      }
      
      // Get current tab count
      const tabs = await chrome.tabs.query({ currentWindow: true });
      this.state.tabsCount = tabs.length;
      
    } catch (error) {
      console.error('[Popup] Failed to load state:', error);
    }
  }
  
  private setupEventListeners(): void {
    // Enable toggle
    const enableToggle = document.getElementById('enable-toggle') as HTMLInputElement;
    enableToggle?.addEventListener('change', async (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      await this.toggleEnabled(checked);
    });
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn?.addEventListener('click', async () => {
      await this.refreshStatus();
    });
    
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn?.addEventListener('click', () => {
      this.openSettings();
    });
  }
  
  private async toggleEnabled(enabled: boolean): Promise<void> {
    this.state.isEnabled = enabled;
    
    await chrome.storage.local.set({
      settings: { enabled },
    });
    
    // Notify background script
    await chrome.runtime.sendMessage({
      action: 'updateSettings',
      payload: { enabled },
    });
    
    this.updateUI();
  }
  
  private async refreshStatus(): Promise<void> {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.textContent = 'Refreshing...';
      refreshBtn.setAttribute('disabled', 'true');
    }
    
    try {
      await this.loadState();
      this.updateUI();
      
      // Send message to background to refresh
      await chrome.runtime.sendMessage({
        action: 'refreshStatus',
      });
    } finally {
      if (refreshBtn) {
        refreshBtn.textContent = 'Refresh Status';
        refreshBtn.removeAttribute('disabled');
      }
    }
  }
  
  private openSettings(): void {
    // Open settings page in new tab
    chrome.runtime.sendMessage({
      action: 'openSettingsPage',
    });
  }
  
  private updateUI(): void {
    // Update status text
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = this.state.isEnabled ? 'Active' : 'Disabled';
      statusText.style.color = this.state.isEnabled ? '#10b981' : '#ef4444';
    }
    
    // Update toggle
    const enableToggle = document.getElementById('enable-toggle') as HTMLInputElement;
    if (enableToggle) {
      enableToggle.checked = this.state.isEnabled;
    }
    
    // Update tabs count
    const tabsCount = document.getElementById('tabs-count');
    if (tabsCount) {
      tabsCount.textContent = this.state.tabsCount.toString();
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

export {};
```

## Communication Patterns

Chrome extensions use several communication patterns between different contexts.

### Message Passing Between Background and Content Scripts

```typescript
// From content script to background
chrome.runtime.sendMessage(
  { action: 'getData', payload: { key: 'value' } },
  (response) => {
    console.log('Response:', response);
  }
);

// From background to content script
chrome.tabs.sendMessage(tabId, { action: 'updateUI' }, (response) => {
  console.log('Response:', response);
});
```

### Using Native Messaging

For communication with native applications:

```typescript
// In background script
async function sendToNativeApp(): Promise<void> {
  const port = chrome.runtime.connectNative('com.example.myapp');
  
  port.onMessage.addListener((message) => {
    console.log('Received from native:', message);
  });
  
  port.postMessage({ action: 'getData' });
  
  port.disconnect();
}
```

## Best Practices for Production Extensions

1. **Use TypeScript Strict Mode**: Enable all TypeScript strict checks to catch errors at compile time
2. **Implement Proper Error Handling**: Wrap async operations in try-catch blocks
3. **Use Manifest V3**: Migrate from Manifest V2 as Google is phasing out V2 extensions
4. **Minimize Permissions**: Request only the permissions your extension needs
5. **Handle Service Worker Lifecycle**: Design for the ephemeral nature of service workers
6. **Use Content Security Policy**: Follow Chrome's CSP guidelines
7. **Test Thoroughly**: Test across different Chrome versions and OS configurations

## Building and Loading Your Extension

### Build the Extension

Add build scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development",
    "watch": "webpack --mode development --watch"
  }
}
```

Run the build:

```bash
npm run build
```

### Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select your `dist` directory

### Debugging

- **Service Worker**: Right-click extension icon → "Inspect service worker"
- **Popup**: Right-click extension icon → "Inspect popup"
- **Content Script**: Open DevTools on any page → Look for extension context

## Publishing Your Extension

When ready to publish:

1. Create a developer account at the Chrome Web Store
2. Zip your `dist` directory
3. Upload through the Developer Dashboard
4. Complete the verification process
5. Publish your extension

## Conclusion

This tutorial covered the essential components of building Chrome extensions with TypeScript in 2026. You've learned how to:

- Set up a TypeScript project with Webpack
- Create a Manifest V3 configuration
- Build background service workers with proper lifecycle handling
- Implement content scripts for page manipulation
- Create interactive popup interfaces
- Implement message passing between extension contexts

For more advanced topics, explore the documentation on advanced messaging patterns, storage optimization, and Chrome Web Store optimization. Extensions like **Tab Suspender Pro** demonstrate how these patterns combine to create powerful productivity tools.

Continue learning by exploring related guides on content script CSS injection, background service worker patterns, and popup design patterns in our comprehensive extension development documentation.
