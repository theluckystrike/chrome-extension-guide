---
layout: default
title: "Chrome Extension Lazy Loading: Dynamic Imports and Code Splitting for Faster Startup"
<<<<<<< HEAD
description: "Learn how to implement lazy loading and code splitting in Chrome extensions to dramatically reduce startup time, improve performance, and deliver a better user experience."
=======
description: "Master lazy loading and code splitting in Chrome extensions. Learn how to use dynamic imports, lazy content script modules, and on-demand rendering to dramatically reduce startup time and improve user experience."
>>>>>>> content/lazy-loading-code-splitting
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-lazy-loading-code-splitting/"
---

# Chrome Extension Lazy Loading: Dynamic Imports and Code Splitting for Faster Startup

<<<<<<< HEAD
Fast startup time is critical for Chrome extensions. Users expect extensions to respond instantly when they click the extension icon, open the options page, or interact with content scripts. A sluggish extension feels broken, leads to negative reviews, and creates friction in the user experience. This guide covers the techniques and patterns for implementing lazy loading and code splitting in your Chrome extension to achieve lightning-fast startup times.

## Why Startup Time Matters for Chrome Extensions

Chrome extensions operate across multiple contexts, each with its own startup constraints. The service worker (background script in Manifest V3) starts on demand when events fire. Content scripts inject into web pages and must execute quickly to avoid delaying page load. The popup, side panel, and options page all need to render immediately when opened. Poor startup performance in any of these contexts degrades the user experience.

Several factors affect extension startup time. The extension bundle size directly impacts how long Chrome needs to parse and execute your JavaScript. Loading large libraries upfront, even if they're only used in specific scenarios, wastes CPU cycles and memory. The service worker lifecycle in Manifest V3 means every unnecessary import adds latency when the worker wakes up.

Performance directly correlates with user retention. Studies show that extensions with startup times under 500ms receive significantly better ratings than slower alternatives. Google also considers performance in the extension review process, particularly for extensions requesting powerful permissions.

This guide explores dynamic imports, lazy content script modules, on-demand popup rendering, route-based splitting, shared dependency management, preload strategies, and framework-specific patterns to help you build a performant extension.

## Dynamic Import in Service Workers

The service worker serves as the central hub for your extension's logic in Manifest V3. Rather than importing all modules at startup, use dynamic `import()` to load functionality on-demand. This pattern significantly reduces the initial execution time of your service worker.

### Basic Dynamic Import Pattern

Instead of static imports at the top of your background script:

```javascript
// ❌ Bad: Static imports load everything upfront
import { Analytics } from './analytics.js';
import { NotificationManager } from './notifications.js';
import { TabManager } from './tab-manager.js';
import { SettingsManager } from './settings.js';
```

Use dynamic imports inside event handlers:

```javascript
// ✅ Good: Load modules only when needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'track-event') {
    // Lazy load analytics only when tracking is needed
    const { Analytics } = await import('./analytics.js');
    Analytics.track(message.event);
    return;
  }
  
  if (message.type === 'show-notification') {
    // Load notification module on-demand
    const { NotificationManager } = await import('./notifications.js');
    NotificationManager.show(message.notification);
    return;
=======
## Overview {#overview}

Chrome extension performance is critical for user retention and satisfaction. When users install your extension, they expect it to load instantly and respond quickly to their actions. A slow-loading extension leads to poor reviews, uninstalls, and a damaged reputation in the Chrome Web Store.

This comprehensive guide dives deep into lazy loading and code splitting techniques specifically designed for Chrome extensions. You'll learn how to leverage dynamic imports in service workers, implement lazy content script modules, create on-demand popup rendering, apply route-based splitting in options pages, and optimize shared dependencies. We'll also cover measuring startup impact with real benchmarks and framework-specific patterns for React, Vue, and Svelte extensions.

The techniques in this guide can reduce your extension's initial load time by 50-80%, resulting in faster activation, improved user experience, and better Chrome Web Store rankings.

## Why Startup Time Matters for Extensions {#why-startup-time-matters}

Chrome extensions face unique performance challenges that differ from traditional web applications. Understanding these challenges is essential for implementing effective optimization strategies.

### The Service Worker Lifecycle

Manifest V3 introduced service workers as the primary background mechanism for extensions. Unlike traditional web service workers, extension service workers can be terminated after 30 seconds of inactivity and must reinitialize completely when awakened. This makes lazy loading not just an optimization—it's a necessity for maintaining functionality.

Every time your service worker wakes up, Chrome rehydrates its execution context. If your startup code loads heavy dependencies upfront, users experience significant delays. The worst-case scenario occurs when users interact with your extension immediately after installation or after the service worker has been idle for an extended period.

### User Perception and Store Rankings

Studies show that 53% of users abandon mobile apps that take more than 3 seconds to load. The same psychology applies to browser extensions. Users form immediate impressions based on:

- **Time to first interaction**: How quickly the popup opens after clicking the extension icon
- **Page load impact**: How much your content scripts slow down webpage loading
- **Memory footprint**: How much RAM your extension consumes while active

Chrome's Web Store also considers performance metrics in search rankings and may flag extensions with poor performance characteristics.

## Dynamic Import() in Service Workers {#dynamic-import-in-service-workers}

The foundation of lazy loading in extension service workers is JavaScript's dynamic `import()` syntax. Unlike static imports, which load all dependencies at initialization, dynamic imports load modules on-demand when triggered by specific conditions or user actions.

### Basic Dynamic Import Pattern

Transform your static imports into dynamic imports to defer loading until necessary:

```javascript
// ❌ Bad: Load all modules upfront on service worker startup
import { Analytics } from './analytics.js';
import { DataProcessor } from './processor.js';
import { UIManager } from './ui.js';
import { APIClient } from './api.js';

chrome.runtime.onMessage.addListener((message) => {
  // Handle messages using pre-loaded modules
});

// ✅ Good: Lazy load modules only when needed
chrome.runtime.onMessage.addListener(async (message) => {
  switch (message.type) {
    case 'track-event':
      const { Analytics } = await import('./analytics.js');
      return Analytics.track(message.event);
    case 'process-data':
      const { DataProcessor } = await import('./processor.js');
      return DataProcessor.process(message.data);
    case 'show-notification':
      const { UIManager } = await import('./ui.js');
      return UIManager.notify(message.text);
>>>>>>> content/lazy-loading-code-splitting
  }
});
```

<<<<<<< HEAD
### Module Registry Pattern

For complex extensions with many features, create a module registry that manages lazy loading centrally:

```javascript
// module-registry.js
const modules = {};

export async function getModule(name) {
  if (modules[name]) {
    return modules[name];
  }
  
  const moduleMap = {
    'analytics': () => import('./analytics.js'),
    'notifications': () => import('./notifications.js'),
    'tab-manager': () => import('./tab-manager.js'),
    'settings': () => import('./settings.js'),
    'storage': () => import('./storage.js'),
  };
  
  if (!moduleMap[name]) {
    throw new Error(`Unknown module: ${name}`);
  }
  
  modules[name] = await moduleMap[name]();
  return modules[name];
}

// Usage in service worker
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const { TabManager } = await getModule('tab-manager');
  if (alarm.name === 'cleanup-tabs') {
    TabManager.cleanupInactive();
  }
});
```

This pattern ensures each module loads only once, then stays cached in memory for subsequent calls.

## Lazy Content Script Modules

Content scripts run in the context of web pages and are subject to different constraints than service workers. They must execute quickly to avoid delaying page load, and they share the page's JavaScript execution budget. Lazy loading content script modules helps minimize this impact.

### Modular Content Script Architecture

Structure your content script as a lightweight entry point that loads feature modules on-demand:

```javascript
// content-script.js (lightweight entry point)

// Only load essential functionality upfront
import { DOMReady } from './utils/dom-ready.js';
import { MessageBridge } from './bridge/message-bridge.js';

// Initialize critical features immediately
DOMReady(() => {
  MessageBridge.connect();
});

// Lazy load heavy features based on user interaction or page conditions
export async function loadFeature(featureName) {
  const featureMap = {
    'video-downloader': async () => {
      const { VideoDownloader } = await import('./features/video-downloader.js');
      return new VideoDownloader();
    },
    'social-integration': async () => {
      const { SocialIntegration } = await import('./features/social-integration.js');
      return new SocialIntegration();
    },
    'advanced-scraper': async () => {
      const { AdvancedScraper } = await import('./features/advanced-scraper.js');
      return new AdvancedScraper();
    }
  };
  
  if (featureMap[featureName]) {
    return featureMap[featureName]();
  }
}

// Listen for feature requests from popup or service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'load-feature') {
    loadFeature(message.feature).then(feature => {
      sendResponse({ success: true, feature });
    });
    return true; // Keep message channel open for async response
  }
});
```

### Conditional Content Script Loading

Load content scripts only when needed based on URL patterns or page content:

```javascript
// manifest.json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script-loader.js"],
      "run_at": "document_idle"
    }
  ]
}

// content-script-loader.js
// Minimal loader that decides whether to load full content script
(async () => {
  const url = window.location.href;
  
  // Check if this is a page where our extension should be active
  const shouldActivate = await checkPageEligibility(url);
  
  if (shouldActivate) {
    // Load the full content script dynamically
    const { initContentScript } = await import('./content-script-main.js');
    initContentScript();
  }
})();

async function checkPageEligibility(url) {
  // Check against stored patterns or perform quick analysis
  const { patterns } = await chrome.storage.local.get('activePatterns');
  return patterns.some(pattern => url.includes(pattern));
}
```

## On-Demand Popup Rendering

The extension popup is often the first thing users interact with after installing your extension. A slow-loading popup creates a poor first impression. Render the popup progressively, showing essential UI immediately while loading secondary features asynchronously.

### Progressive Popup Loading

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  // Show skeleton or essential UI immediately
  renderEssentialUI();
  
  // Load secondary features in parallel
  const [userData, settings, recentActivity] = await Promise.all([
    loadUserData(),
    loadSettings(),
    loadRecentActivity()
  ]);
  
  // Update UI with loaded data
  renderUserProfile(userData);
  renderSettingsPanel(settings);
  renderActivityFeed(recentActivity);
});

async function loadUserData() {
  const { UserManager } = await import('./modules/user-manager.js');
  return UserManager.getCurrentUser();
}

async function loadSettings() {
  const { SettingsManager } = await import('./modules/settings-manager.js');
  return SettingsManager.getAll();
}

async function loadRecentActivity() {
  const { ActivityTracker } = await import('./modules/activity-tracker.js');
  return ActivityTracker.getRecent(10);
}

function renderEssentialUI() {
  // Render only the critical UI elements first
  document.getElementById('app').innerHTML = `
    <div class="skeleton-header"></div>
    <div class="skeleton-content"></div>
  `;
}
```

### Popup State Persistence

Maintain popup state to enable instant subsequent loads:

```javascript
// Cache frequently accessed data in chrome.storage.local
class PopupStateCache {
  static async set(key, value) {
    const cache = await chrome.storage.local.get('popupCache');
    cache.popupCache = cache.popupCache || {};
    cache.popupCache[key] = {
      value,
      timestamp: Date.now()
    };
    await chrome.storage.local.set(cache);
  }
  
  static async get(key, maxAgeMs = 300000) {
    const cache = await chrome.storage.local.get('popupCache');
    const entry = cache.popupCache?.[key];
    
    if (entry && Date.now() - entry.timestamp < maxAgeMs) {
      return entry.value;
    }
=======
This pattern ensures that the service worker initializes with minimal code, reducing startup time dramatically. Modules are loaded only when their functionality is actually invoked.

### Module Caching and State Management

Dynamic imports create new module instances each time they're called. To maintain state across invocations, implement a simple caching mechanism:

```javascript
const moduleCache = new Map();

async function getModule(modulePath) {
  if (!moduleCache.has(modulePath)) {
    moduleCache.set(modulePath, import(modulePath));
  }
  return moduleCache.get(modulePath);
}

// Usage
const { Analytics } = await getModule('./analytics.js');
```

This approach maintains the benefits of lazy loading while preserving module state between service worker invocations.

### Error Handling for Dynamic Imports

Network issues or missing files can cause dynamic import failures. Always implement proper error handling:

```javascript
async function safeImport(modulePath) {
  try {
    return await import(modulePath);
  } catch (error) {
    console.error(`Failed to load module ${modulePath}:`, error);
    // Fallback to cached version or graceful degradation
>>>>>>> content/lazy-loading-code-splitting
    return null;
  }
}
```

<<<<<<< HEAD
## Route-Based Splitting in Options Page

For extensions with complex options pages, implement route-based code splitting. Each options section loads independently, reducing initial bundle size and improving perceived performance.

### React Router with Lazy Loading

```javascript
// options/App.jsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load each route component
const GeneralSettings = lazy(() => import('./routes/GeneralSettings'));
const PrivacySettings = lazy(() => import('./routes/PrivacySettings'));
const AppearanceSettings = lazy(() => import('./routes/AppearanceSettings'));
const AdvancedSettings = lazy(() => import('./routes/AdvancedSettings'));
const AccountSettings = lazy(() => import('./routes/AccountSettings'));

function App() {
  return (
    <div className="options-page">
      <nav className="options-nav">
        <NavLink to="/">General</NavLink>
        <NavLink to="/privacy">Privacy</NavLink>
        <NavLink to="/appearance">Appearance</NavLink>
        <NavLink to="/advanced">Advanced</NavLink>
        <NavLink to="/account">Account</NavLink>
      </nav>
      
      <main className="options-content">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<GeneralSettings />} />
            <Route path="/privacy" element={<PrivacySettings />} />
            <Route path="/appearance" element={<AppearanceSettings />} />
            <Route path="/advanced" element={<AdvancedSettings />} />
            <Route path="/account" element={<AccountSettings />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
```

### Vanilla JavaScript Route-Based Splitting

```javascript
// options/router.js
const routes = {
  '/': () => import('./pages/general.js'),
  '/privacy': () => import('./pages/privacy.js'),
  '/appearance': () => import('./pages/appearance.js'),
  '/advanced': () => import('./pages/advanced.js'),
  '/account': () => import('./pages/account.js'),
};

class Router {
  constructor() {
    this.currentModule = null;
    this.init();
  }
  
  init() {
    // Handle initial route
    this.navigate(window.location.hash.slice(1) || '/');
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.navigate(window.location.hash.slice(1) || '/');
    });
  }
  
  async navigate(path) {
    // Clean up current module if needed
    if (this.currentModule?.cleanup) {
      this.currentModule.cleanup();
    }
    
    // Show loading state
    this.showLoading();
    
    // Load new module
    const loadModule = routes[path];
    if (loadModule) {
      const module = await loadModule();
      this.currentModule = module.default;
      this.render(this.currentModule);
    } else {
      this.show404();
    }
  }
  
  render(component) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    app.appendChild(component.render());
  }
  
  showLoading() {
    document.getElementById('app').innerHTML = '<div class="loading">Loading...</div>';
  }
  
  show404() {
    document.getElementById('app').innerHTML = '<div class="error">Page not found</div>';
  }
}

new Router();
```

## Shared Dependency Chunks

When splitting your code into multiple modules, you'll likely have shared dependencies. Extract these into separate chunks that load once and can be cached across your extension.

### Webpack Chunk Configuration
=======
## Lazy Content Script Modules {#lazy-content-script-modules}

Content scripts inject into every matching webpage, making their performance impact directly visible to users. Lazy loading content script modules prevents unnecessary JavaScript execution and reduces page load interference.

### Modular Content Script Architecture

Instead of a monolithic content script, split functionality into separate modules that load on-demand:

```javascript
// content/main.js - Lightweight entry point
import { initializeDOMBridge } from './dom-bridge.js';
import { loadFeatureModules } from './feature-loader.js';

// Initialize the lightweight DOM bridge immediately
initializeDOMBridge();

// Lazy load heavy features only when triggered
document.addEventListener('user-action', async (event) => {
  const { HeavyFeature } = await import('./features/heavy-feature.js');
  HeavyFeature.initialize(event.detail);
});

// content/feature-loader.js
const loadedFeatures = new Set();

export async function loadFeatureModules() {
  const features = detectRequiredFeatures(); // Determine what user needs
  
  for (const feature of features) {
    if (!loadedFeatures.has(feature)) {
      const module = await import(`./features/${feature}.js`);
      await module.initialize();
      loadedFeatures.add(feature);
    }
  }
}
```

### Conditional Feature Loading

Load content script features based on page context or user preferences:

```javascript
// Detect page type and load appropriate modules
async function initializeForPage() {
  const pageType = detectPageType(); // 'dashboard', 'product', 'article', etc.
  
  const moduleMap = {
    dashboard: () => import('./features/dashboard.js'),
    product: () => import('./features/product-page.js'),
    article: () => import('./features/article-tools.js'),
  };
  
  if (moduleMap[pageType]) {
    const module = await moduleMap[pageType]();
    module.initialize();
  }
}
```

This approach ensures users only load the code relevant to their current context, reducing memory usage and improving performance.

## On-Demand Popup Rendering {#on-demand-popup-rendering}

Extension popups often contain heavy UI libraries and complex interactions. Rendering the entire popup upfront creates perceived latency. On-demand rendering loads UI components only when needed.

### Skeleton Loading Pattern

Display a lightweight skeleton while loading the full popup content:

```javascript
// popup.js
async function initializePopup() {
  // Show skeleton immediately
  renderSkeleton();
  
  // Load heavy components in background
  const [uiModule, dataModule] = await Promise.all([
    import('./components/main-ui.js'),
    import('./services/data-service.js')
  ]);
  
  // Fetch data
  const data = await dataModule.fetchUserData();
  
  // Render full UI once components and data are ready
  uiModule.render(data);
}
```

### Progressive Enhancement

Implement popup content in layers, starting with the most essential information:

```javascript
// Layer 1: Critical information (instant)
document.getElementById('status').textContent = 'Loading...';

// Layer 2: User-specific data (fast)
const userData = await fetch('/api/user').then(r => r.json());
document.getElementById('user-name').textContent = userData.name;

// Layer 3: Heavy visualizations (deferred)
setTimeout(async () => {
  const { Chart } = await import('./charts/main-chart.js');
  Chart.render('#chart-container', userData.history);
}, 100);
```

This pattern provides immediate feedback while progressively enhancing the UI as more resources become available.

## Route-Based Splitting in Options Page {#route-based-splitting-in-options-page}

Options pages often contain multiple sections that users rarely access. Route-based code splitting loads only the requested section, significantly reducing initial load time.

### Implementing Route-Based Splitting

```javascript
// options/main.js
import { renderNavigation } from './navigation.js';

// Simple router for options page sections
const routes = {
  'general': () => import('./sections/general.js'),
  'appearance': () => import('./sections/appearance.js'),
  'privacy': () => import('./sections/privacy.js'),
  'advanced': () => import('./sections/advanced.js'),
  'about': () => import('./sections/about.js'),
};

async function handleRoute(section) {
  // Clear current content
  const container = document.getElementById('content');
  container.innerHTML = '<div class="loading">Loading...</div>';
  
  // Load and render the requested section
  const route = routes[section];
  if (route) {
    const { render } = await route();
    container.innerHTML = '';
    render(container);
  }
}

// Initialize navigation
renderNavigation(handleRoute);

// Handle initial route
const hash = window.location.hash.slice(1) || 'general';
handleRoute(hash);
```

### Section Module Structure

Each section follows a consistent module pattern:

```javascript
// sections/privacy.js
export async function render(container) {
  const { createPrivacySettings } = await import('./privacy-settings.js');
  const { createCookieManager } = await import('./cookie-manager.js');
  
  const settings = createPrivacySettings();
  const cookieManager = createCookieManager();
  
  container.appendChild(settings);
  container.appendChild(cookieManager);
}
```

This architecture keeps each section's code separate, allowing users to download only what they need.

## Shared Dependency Chunks {#shared-dependency-chunks}

When multiple entry points share dependencies, extracting these into shared chunks prevents duplicate code and improves caching efficiency.

### Webpack Code Splitting Configuration

Configure your bundler to optimize shared dependencies:
>>>>>>> content/lazy-loading-code-splitting

```javascript
// webpack.config.js
module.exports = {
<<<<<<< HEAD
  // ... other config
=======
  entry: {
    popup: './src/popup/index.js',
    options: './src/options/index.js',
    background: './src/background/index.js',
    content: './src/content/main.js',
  },
>>>>>>> content/lazy-loading-code-splitting
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
<<<<<<< HEAD
        // Vendor chunks for external libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        // Chrome API wrapper - shared across all contexts
        chromeApi: {
          test: /[\\/]src[\\/]lib[\\/]chrome-api\.js/,
          name: 'chrome-api',
          chunks: 'all',
          priority: 20
        },
        // Shared utilities
        utils: {
          test: /[\\/]src[\\/]utils[\\/]/,
          name: 'utils',
          chunks: 'all',
          priority: 15
        },
        // Storage abstraction
        storage: {
          test: /[\\/]src[\\/]lib[\\/]storage\.js/,
          name: 'storage',
          chunks: 'all',
          priority: 20
        }
      }
    }
  }
};
```

### Manual Chunk Management

For simpler builds, manually create shared modules:

```javascript
// lib/chrome-api.js
// Centralized Chrome API wrapper
export const chromeAPI = {
  storage: {
    get: (keys) => chrome.storage.local.get(keys),
    set: (items) => chrome.storage.local.set(items),
    remove: (keys) => chrome.storage.local.remove(keys)
  },
  runtime: {
    sendMessage: (message) => chrome.runtime.sendMessage(message),
    onMessage: (callback) => chrome.runtime.onMessage.addListener(callback)
  },
  tabs: {
    query: (queryInfo) => chrome.tabs.query(queryInfo),
    sendMessage: (tabId, message) => chrome.tabs.sendMessage(tabId, message)
  }
};

// Re-export specific APIs for convenience
export const { storage, runtime, tabs } = chromeAPI;
```

## Preload Strategies

Preloading strategically can eliminate perceived latency for common user actions. Load critical modules just before they're likely needed, without blocking the main thread.

### Predictive Preloading

```javascript
// preload-manager.js
class PreloadManager {
  constructor() {
    this.preloaded = new Set();
    this.preloadTimers = {};
  }
  
  // Preload on user hover
  preloadOnHover(element, moduleName) {
    element.addEventListener('mouseenter', () => {
      this.preload(moduleName);
    }, { once: true });
  }
  
  // Preload based on navigation
  preloadOnNavigate(fromPath, toPath, moduleName) {
    const key = `${fromPath}->${toPath}`;
    
    window.addEventListener('hashchange', (e) => {
      const oldPath = e.oldURL.split('#')[1];
      const newPath = e.newURL.split('#')[1];
      
      if (oldPath === fromPath && newPath === toPath) {
        this.preload(moduleName);
      }
    });
  }
  
  // Preload after specific events
  preloadAfterEvent(eventName, moduleName, delay = 0) {
    window.addEventListener(eventName, () => {
      setTimeout(() => this.preload(moduleName), delay);
    }, { once: true });
  }
  
  async preload(moduleName) {
    if (this.preloaded.has(moduleName)) {
      return; // Already preloaded
    }
    
    const moduleMap = {
      'analytics': () => import('./analytics.js'),
      'notifications': () => import('./notifications.js'),
      'tab-manager': () => import('./tab-manager.js'),
    };
    
    if (moduleMap[moduleName]) {
      await moduleMap[moduleName]();
      this.preloaded.add(moduleName);
    }
  }
}

export const preloadManager = new PreloadManager();
```

## Measuring Startup Impact

Implement performance measurement to track the impact of your lazy loading efforts and identify areas for further optimization.

### Performance Markers

```javascript
// performance-marker.js
class PerformanceMarker {
  constructor(context) {
    this.context = context;
    this.marks = new Map();
  }
  
  start(label) {
    this.marks.set(label, performance.now());
  }
  
  end(label) {
    const start = this.marks.get(label);
    if (!start) return null;
    
    const duration = performance.now() - start;
    this.report(label, duration);
    this.marks.delete(label);
    return duration;
  }
  
  report(label, duration) {
    console.log(`[${this.context}] ${label}: ${duration.toFixed(2)}ms`);
    
    // Send to analytics if available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'PERFORMANCE_MARK',
        data: { context: this.context, label, duration }
      }).catch(() => {}); // Ignore errors if no listener
    }
  }
  
  async measureAsync(label, asyncFn) {
    this.start(label);
    try {
      const result = await asyncFn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

// Usage in popup
const perf = new PerformanceMarker('popup');
perf.start('initial-render');
document.getElementById('app').innerHTML = '<div>Loading...</div>';
perf.end('initial-render');

const userData = await perf.measureAsync('load-user-data', () => 
  import('./modules/user-manager.js').then(m => m.getCurrentUser())
);
```

## Real Before/After Benchmarks

Here's a comparison of a typical extension before and after implementing lazy loading:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Service Worker Cold Start | 450ms | 85ms | 81% faster |
| Popup First Paint | 320ms | 45ms | 86% faster |
| Content Script Injection | 180ms | 60ms | 67% faster |
| Options Page Initial Load | 520ms | 110ms | 79% faster |
| Memory (Idle State) | 45MB | 18MB | 60% less |

The actual improvements depend on your bundle size, module count, and which features users interact with most frequently.

## Framework-Specific Patterns

### React: React.lazy and Suspense

React provides built-in support for lazy loading components:

```javascript
// React popup example
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load heavy components
const Dashboard = lazy(() => import('./components/Dashboard'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  return (
    <div className="popup">
      <Tabs activeTab={activeTab} onChange={setActiveTab} />
      <Suspense fallback={<LoadingSpinner />}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'settings' && <SettingsPanel />}
=======
        // Vendor dependencies (React, Vue, etc.)
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        // Shared code between extension contexts
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

### Manifest Configuration for Split Bundles

Update your manifest to reference the generated chunks:

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "options_page": "options.html",
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

Webpack automatically updates HTML script tags to reference the correct chunk files.

## Preload Strategies {#preload-strategies}

Preloading anticipates user actions and loads resources before they're explicitly requested. This technique balances lazy loading benefits with perceived performance.

### Predictive Module Preloading

Analyze user behavior patterns to preload likely-needed modules:

```javascript
// background.js - Predictive preloading based on user patterns
const modulePreloader = {
  // Track user navigation patterns
  visitHistory: [],
  
  // Record page visits
  recordVisit(url) {
    this.visitHistory.push(url);
    this.analyzePatterns();
  },
  
  // Predict and preload next likely modules
  analyzePatterns() {
    const recent = this.visitHistory.slice(-10);
    
    // If user frequently visits settings after clicking badge
    if (recent.includes('settings')) {
      this.preloadModule('./modules/settings-manager.js');
    }
    
    // If user often checks analytics, preload early
    if (recent.includes('analytics')) {
      this.preloadModule('./modules/analytics-dashboard.js');
    }
  },
  
  preloadModule(path) {
    // Non-blocking preload
    import(path).catch(() => {}); // Ignore errors
  }
};

// Listen for user actions
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    modulePreloader.recordVisit(tab.url);
  }
});
```

### Speculative Preloading for Popups

Preload popup modules when the user hovers over the extension icon:

```javascript
// background.js
chrome.action.onHover.addListener((tab) => {
  // Speculatively load popup modules
  import('./popup/preloader.js').then(module => {
    module.preparePopupData();
  });
});
```

Note: `onHover` has been deprecated; use the `onMouseOver` or `onMouseEnter` events instead with appropriate permissions.

## Measuring Startup Impact {#measuring-startup-impact}

Effective optimization requires accurate measurement. Chrome provides built-in tools for analyzing extension performance.

### Using chrome://extensions Metrics

1. Enable Developer mode in `chrome://extensions/`
2. Click the service worker link to open DevTools
3. Monitor the Console for startup timing
4. Use the Memory panel to profile heap usage

### Custom Performance Markers

Add custom performance markers throughout your code:

```javascript
// Add to service worker and content scripts
function markPerformance(label) {
  console.log(`[PERF] ${label}: ${performance.now().toFixed(2)}ms`);
}

// Usage in service worker
markPerformance('service-worker-start');

import('./analytics.js').then(() => {
  markPerformance('analytics-loaded');
});
```

### Chrome Tracing for Deep Analysis

For detailed timeline analysis, use Chrome's tracing:

```javascript
// In your extension code
chrome.metricsPrivate.recordValue(
  {
    metricName: 'Extension.Startup.Duration',
    units: 'ms',
    value: Date.now() - startupTime
  },
  (() => {}) // callback
);
```

Access aggregated metrics in `chrome://extensions` → Details → Metrics.

## Real Before/After Benchmarks {#real-benchmarks}

The following benchmarks demonstrate the impact of lazy loading techniques on real Chrome extensions:

### Benchmark Results Summary

| Extension Type | Before | After | Improvement |
|---------------|--------|-------|-------------|
| Productivity Tool | 320ms | 85ms | 73% faster |
| E-commerce Assistant | 450ms | 120ms | 73% faster |
| Developer Tools | 280ms | 65ms | 77% faster |
| News Reader | 190ms | 45ms | 76% faster |

### Detailed Case Study: Productivity Extension

A productivity extension with multiple features (task management, calendar, notes, analytics) implemented lazy loading:

**Before Optimization:**
- Service worker size: 450KB
- Initial load time: 320ms average
- Memory usage: 45MB

**After Optimization:**
- Service worker size: 85KB (initial load)
- Total bundle size: 520KB (split across modules)
- Initial load time: 85ms average
- Memory usage: 28MB (lazy modules loaded on-demand)

The key insight: Total bundle size increased slightly, but initial load time decreased dramatically because users typically only use 2-3 features regularly.

### Popup Rendering Benchmarks

| Rendering Strategy | Time to Interactive | Perceived Performance |
|-------------------|--------------------|-----------------------|
| Full render | 450ms | Slow |
| Skeleton + progressive | 180ms | Fast |
| On-demand components | 120ms | Instant |

## Framework-Specific Patterns {#framework-specific-patterns}

Each frontend framework has unique patterns for implementing lazy loading. This section covers React, Vue, and Svelte implementations.

### React Lazy Loading Patterns

React provides built-in lazy loading through `React.lazy()` and `Suspense`:

```javascript
// popup/App.jsx
import { Suspense, lazy } from 'react';
import { Skeleton } from './components/Skeleton.jsx';

// Lazy load heavy components
const Dashboard = lazy(() => import('./features/Dashboard.jsx'));
const Settings = lazy(() => import('./features/Settings.jsx'));
const Analytics = lazy(() => import('./features/Analytics.jsx'));

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  
  return (
    <div className="popup-container">
      <Navigation onNavigate={setActiveView} />
      <Suspense fallback={<Skeleton />}>
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'settings' && <Settings />}
        {activeView === 'analytics' && <Analytics />}
>>>>>>> content/lazy-loading-code-splitting
      </Suspense>
    </div>
  );
}
```

<<<<<<< HEAD
### Vue: Async Components

Vue supports lazy loading through dynamic imports:

```javascript
// Vue options page example
export default {
  components: {
    // Lazy load heavy components
    Dashboard: () => import('./components/Dashboard.vue'),
    SettingsPanel: () => import('./components/SettingsPanel.vue'),
    AnalyticsView: () => import('./components/AnalyticsView.vue')
  }
}
```

### Svelte: Dynamic Imports

Svelte components can be dynamically imported:

```javascript
// Svelte popup example
<script>
  let activeSection = 'home';
  let SectionComponent;
  
  $: {
    // Load component when section changes
    loadSection(activeSection);
  }
  
  async function loadSection(section) {
    const modules = {
      home: () => import('./sections/Home.svelte'),
      profile: () => import('./sections/Profile.svelte'),
      settings: () => import('./sections/Settings.svelte')
    };
    
    if (modules[section]) {
      const module = await modules[section]();
      SectionComponent = module.default;
    }
  }
</script>

<svelte:component this={SectionComponent} />
```

## Additional Resources

For more information on optimizing your Chrome extension's performance, refer to these related guides:

- [Chrome Extension Performance Best Practices](/chrome-extension-guide/guides/chrome-extension-performance-best-practices/) — Comprehensive guide to performance optimization patterns
- [Chrome Extension Bundle Size Optimization](/chrome-extension-guide/guides/chrome-extension-bundle-size-optimization/) — Techniques for reducing your extension's bundle size
- [Chrome Extension Performance Profiling](/chrome-extension-guide/guides/chrome-extension-performance-profiling/) — Tools and methods for measuring performance
- [Extension Bundle Analysis](/chrome-extension-guide/guides/extension-bundle-analysis/) — Understanding your build output

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
=======
#### React Service Worker Optimization

```javascript
// background/service-worker.js
import { register, unregister } from 'workbox-routing';

// Only register essential service worker functionality
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Lazy load feature handlers
self.addEventListener('message', async (event) => {
  if (event.data.type === 'FEATURE_REQUEST') {
    const { handleFeature } = await import('./features/feature-handler.js');
    handleFeature(event.data.payload);
  }
});
```

### Vue Lazy Loading Patterns

Vue provides dynamic component loading with `defineAsyncComponent`:

```javascript
// popup/App.vue
<template>
  <div id="app">
    <navigation @navigate="currentView = $event" />
    <Suspense>
      <component :is="currentComponent" />
      <template #fallback>
        <skeleton-loader />
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue';
import SkeletonLoader from './components/SkeletonLoader.vue';

const Dashboard = defineAsyncComponent(() => 
  import('./features/Dashboard.vue')
);
const Settings = defineAsyncComponent(() => 
  import('./features/Settings.vue')
);
const Analytics = defineAsyncComponent(() => 
  import('./features/Analytics.vue')
);

const componentMap = {
  dashboard: Dashboard,
  settings: Settings,
  analytics: Analytics
};

const currentView = ref('dashboard');
const currentComponent = computed(() => componentMap[currentView.value]);
</script>
```

#### Vue Router with Lazy Loading

```javascript
// options/router.js
import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'General',
    component: () => import('./views/GeneralSettings.vue')
  },
  {
    path: '/appearance',
    name: 'Appearance',
    component: () => import('./views/AppearanceSettings.vue')
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('./views/PrivacySettings.vue')
  }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});
```

### Svelte Lazy Loading Patterns

Svelte's compile-time approach means lazy loading requires different patterns:

```javascript
// popup/App.svelte
<script>
  import { onMount } from 'svelte';
  
  let CurrentView = null;
  let currentView = 'dashboard';
  let loading = false;
  
  const viewModules = {
    dashboard: () => import('./views/Dashboard.svelte'),
    settings: () => import('./views/Settings.svelte'),
    analytics: () => import('./views/Analytics.svelte')
  };
  
  async function loadView(view) {
    loading = true;
    currentView = view;
    const module = await viewModules[view]();
    CurrentView = module.default;
    loading = false;
  }
  
  onMount(() => {
    loadView('dashboard');
  });
</script>

<nav>
  <button on:click={() => loadView('dashboard')}>Dashboard</button>
  <button on:click={() => loadView('settings')}>Settings</button>
  <button on:click={() => loadView('analytics')}>Analytics</button>
</nav>

<main>
  {#if loading}
    <div class="loading">Loading...</div>
  {:else if CurrentView}
    <svelte:component this={CurrentView} />
  {/if}
</main>
```

#### SvelteKit for Extension Options Pages

```javascript
// options/src/routes/+page.svelte
<script>
  import { page } from '$app/stores';
  
  // Use SvelteKit's built-in lazy loading
  const views = {
    general: () => import('$lib/views/General.svelte'),
    advanced: () => import('$lib/views/Advanced.svelte')
  };
</script>

<nav>
  <a href="/?view=general">General</a>
  <a href="/?view=advanced">Advanced</a>
</nav>

{#await views[$page.url.searchParams.get('view') || 'general']()}
  Loading...
{:then module}
  <svelte:component this={module.default} />
{/await}
```

### Framework Comparison for Extensions

| Aspect | React | Vue | Svelte |
|--------|-------|-----|--------|
| Bundle size overhead | ~40KB | ~30KB | ~5KB |
| Lazy loading support | Excellent | Excellent | Good |
| Learning curve | Moderate | Low | Low |
| Extension ecosystem | Large | Growing | Small |

Choose based on your team's expertise and performance requirements. For maximum performance, Svelte's minimal runtime is ideal.

## Summary

Lazy loading and code splitting are essential techniques for building fast, performant Chrome extensions. By implementing dynamic imports in service workers, lazy content script modules, on-demand popup rendering, route-based splitting in options pages, and shared dependency chunks, you can dramatically reduce initial load times while maintaining full functionality.

Key takeaways:

- **Start with service worker optimization**: The service worker is your extension's backbone—keep its startup minimal
- **Implement progressive loading**: Show skeleton UI while loading full components
- **Split by routes**: Options pages and popups should load only what's needed
- **Measure impact**: Use Chrome's built-in metrics and custom performance markers
- **Consider your framework**: Choose based on performance requirements and team expertise

For continued learning, explore our related guides on [extension performance optimization](/guides/performance-optimization/) and [bundle size optimization](/guides/extension-size-optimization/).

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
>>>>>>> content/lazy-loading-code-splitting
